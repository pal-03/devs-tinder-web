const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { randomUUID, createHmac } = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const backend = process.env.DEVTINDER_BACKEND_DIR || path.resolve(root, '../../devs-tind');
const beRequire = createRequire(path.join(backend, 'package.json'));
const origin = 'http://127.0.0.1:5180';
const output = path.join(root, 'artifacts/payment-e2e');
const secret = 'isolated-browser-payment-secret';
let browser, vite, mongo, app, User, Payment, orders, remotePayments, creates, createFails;
const results = [];
const browserErrors = [];
fs.mkdirSync(output, { recursive: true });

const sdk = () => {
  window.Razorpay = class {
    constructor(options) { this.options = options; this.handlers = {}; window.paymentCheckout = this; }
    on(event, callback) { this.handlers[event] = callback; }
    open() {
      this.modal = document.createElement('div');
      this.modal.setAttribute('role', 'dialog');
      this.modal.setAttribute('aria-label', 'Isolated test checkout');
      this.modal.innerHTML = '<button type="button">Cancel test checkout</button>';
      this.modal.style.cssText = 'position:fixed;inset:0;z-index:100;background:#111d;display:grid;place-content:center';
      this.modal.querySelector('button').onclick = () => this.close();
      document.body.appendChild(this.modal);
    }
    close() { this.modal?.remove(); this.options.modal.ondismiss(); }
  };
};
const waitResponse = (page, suffix) => page.waitForResponse(r => r.url().endsWith(suffix) && r.request().method() !== 'OPTIONS');
const signup = async ({ stub = true, viewport = { width: 1440, height: 1000 } } = {}) => {
  const context = await browser.newContext({ viewport });
  if (stub) await context.addInitScript(sdk);
  const page = await context.newPage();
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.goto(origin + '/login');
  await page.getByText('New User? Signup Here', { exact: true }).click();
  await page.getByLabel('First Name', { exact: true }).fill('PaymentTest');
  await page.getByLabel('Last Name', { exact: true }).fill('Browser');
  await page.getByLabel('Email ID:').fill(randomUUID() + '@example.com');
  await page.getByLabel('Password', { exact: true }).fill('StrongP@ss1');
  const pending = waitResponse(page, '/signup');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  const response = await pending;
  assert.equal(response.status(), 201);
  const user = (await response.json()).data;
  await page.goto(origin + '/premium');
  await page.getByRole('button', { name: 'Buy Silver', exact: true }).waitFor();
  return { page, context, user };
};
const buy = async (page, plan = 'Silver') => {
  const pending = waitResponse(page, '/payment/create');
  await page.getByRole('button', { name: 'Buy ' + plan, exact: true }).click();
  const response = await pending;
  assert.equal(response.status(), 200, await response.text());
  const order = await response.json();
  await page.getByRole('dialog', { name: 'Isolated test checkout' }).waitFor();
  return order;
};
const capture = order => {
  const payment = { id: 'pay_' + randomUUID().replaceAll('-', ''), order_id: order.orderId, amount: order.amount, currency: order.currency, status: 'captured', captured: true, amount_refunded: 0 };
  remotePayments.set(payment.id, payment);
  return payment;
};
const finish = async (page, order, payment) => {
  const response = waitResponse(page, '/payment/verify');
  const razorpay_signature = createHmac('sha256', secret).update(order.orderId + '|' + payment.id).digest('hex');
  await page.evaluate(data => { window.paymentCheckout.modal.remove(); window.paymentCheckout.options.handler(data); }, { razorpay_order_id: order.orderId, razorpay_payment_id: payment.id, razorpay_signature });
  assert.equal((await response).status(), 200);
  await page.getByRole('heading', { name: /membership active/ }).waitFor();
};
const check = async (name, fn) => {
  try { await fn(); results.push({ name, status: 'PASS' }); console.log('PASS ' + name); }
  catch (error) { results.push({ name, status: 'FAIL', error: error.message }); throw error; }
};

(async () => {
  const { MongoMemoryReplSet } = beRequire('mongodb-memory-server');
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  Object.assign(process.env, { MONGODB_URI: mongo.getUri(), CLIENT_ORIGIN: origin, JWT_SECRET: 'isolated-browser-payment-tests', DISABLE_EMAILS: 'true', DISABLE_CRON: 'true', SES_FEEDBACK_QUEUE_URL: '', SES_FEEDBACK_TOPIC_ARN: '', RAZORPAY_KEY_ID: 'rzp_test_browser', RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: 'isolated-browser-webhook-secret', RAZORPAY_MODE: 'test', RAZORPAY_LIVE_ENABLED: 'false' });
  orders = new Map(); remotePayments = new Map(); creates = 0;
  beRequire(path.join(backend, 'src/utils/razorpay')).getClient = () => ({
    orders: {
      create: async input => { creates++; if (createFails) throw new Error('Isolated gateway outage'); const order = { ...input, id: 'order_' + randomUUID().replaceAll('-', ''), status: 'created' }; orders.set(order.id, order); return order; },
      fetchPayments: async orderId => ({ items: [...remotePayments.values()].filter(p => p.order_id === orderId) }),
    }, payments: { fetch: async id => remotePayments.get(id) },
  });
  app = beRequire(path.join(backend, 'src/app'));
  User = beRequire(path.join(backend, 'src/models/user'));
  Payment = beRequire(path.join(backend, 'src/models/payment'));
  await app.startServer({ port: 7780 });
  const { createServer } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);
  vite = await createServer({ root, server: { host: '127.0.0.1', port: 5180, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:7780', changeOrigin: true, rewrite: value => value.replace(/^\/api/, '') } } } });
  await vite.listen(); browser = await chromium.launch();

  await check('Silver checkout succeeds, verifies on server and remains active after reload', async () => {
    const { page, user } = await signup(); const order = await buy(page); const payment = capture(order);
    assert.equal(await page.getByRole('button', { name: 'Buy Gold', exact: true }).isDisabled(), true);
    await finish(page, order, payment);
    assert.equal((await User.findById(user._id)).isPremium, true);
    assert.equal((await Payment.findOne({ orderId: order.orderId })).status, 'captured');
    await page.reload(); await page.getByRole('heading', { name: 'Silver membership active', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'silver-success.png'), fullPage: true });
  });
  await check('Gold checkout activates the correct six-month plan', async () => {
    const { page, user } = await signup(); const order = await buy(page, 'Gold');
    assert.equal(order.amount, 70000);
    await finish(page, order, capture(order));
    assert.equal((await User.findById(user._id)).membershipType, 'gold');
  });
  await check('Cancelling checkout unlocks controls and retry reuses the same order', async () => {
    const { page, user } = await signup(); const before = creates; const order = await buy(page);
    await page.getByRole('button', { name: 'Cancel test checkout' }).click();
    await page.getByText('Checkout closed.', { exact: false }).waitFor();
    assert.equal((await User.findById(user._id)).isPremium, false);
    assert.equal((await buy(page)).orderId, order.orderId); assert.equal(creates, before + 1);
    await page.getByRole('button', { name: 'Cancel test checkout' }).click();
  });
  await check('Payment failure is visible and does not grant membership', async () => {
    const { page, user } = await signup(); await buy(page);
    await page.evaluate(() => window.paymentCheckout.handlers['payment.failed']({ error: {} }));
    await page.getByRole('alert').filter({ hasText: 'Payment failed.' }).waitFor();
    assert.equal((await User.findById(user._id)).isPremium, false);
    assert.equal(await page.getByRole('button', { name: 'Buy Silver', exact: true }).isDisabled(), false);
  });
  await check('A lost success callback is recovered with Check status', async () => {
    const { page } = await signup(); const order = await buy(page); capture(order);
    await page.getByRole('button', { name: 'Cancel test checkout' }).click();
    await page.getByRole('button', { name: 'Check status', exact: true }).click();
    await page.getByRole('heading', { name: 'Silver membership active', exact: true }).waitFor();
  });
  await check('Gateway creation failure is recoverable with a new checkout request', async () => {
    const { page } = await signup(); createFails = true;
    const pending = waitResponse(page, '/payment/create');
    await page.getByRole('button', { name: 'Buy Silver', exact: true }).click();
    assert.equal((await pending).status(), 502);
    await page.getByRole('alert').waitFor();
    createFails = false;
    await buy(page); await page.getByRole('button', { name: 'Cancel test checkout' }).click();
  });
  await check('Checkout script failure is visible and retry can load checkout', async () => {
    const { page } = await signup({ stub: false });
    await page.route('https://checkout.razorpay.com/v1/checkout.js', route => route.abort());
    await page.getByRole('button', { name: 'Buy Silver', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Unable to load secure checkout.' }).waitFor();
    await page.evaluate(sdk);
    await buy(page); await page.getByRole('button', { name: 'Cancel test checkout' }).click();
  });
  await check('Plans and payment history fit desktop and mobile viewports', async () => {
    const { page } = await signup();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const metrics = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, buttons: [...document.querySelectorAll('main button')].every(b => b.scrollWidth <= b.clientWidth) }));
      assert.equal(metrics.width <= metrics.viewport, true, JSON.stringify(metrics)); assert.equal(metrics.buttons, true);
      await page.screenshot({ path: path.join(output, 'premium-' + width + '.png'), fullPage: true });
    }
  });
  assert.deepEqual(browserErrors, []);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (vite) await vite.close(); if (app) await app.stopServer();
  await beRequire('mongoose').disconnect(); if (mongo) await mongo.stop();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ results, browserErrors }, null, 2));
  console.log('RESULT ' + results.filter(r => r.status === 'PASS').length + '/' + results.length + ' payment browser checks passed');
});
