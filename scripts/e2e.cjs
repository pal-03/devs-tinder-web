const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const frontend = path.resolve(__dirname, '..');
const root = path.dirname(frontend);
const backend = process.env.DEVTINDER_BACKEND_DIR || path.resolve(root, '..', 'devs-tind');
const beRequire = createRequire(path.join(backend, 'package.json'));
const live = process.argv.includes('--live');
const runId = randomBytes(16).toString('hex');
const output = path.join(frontend, 'artifacts', live ? 'e2e-live' : 'e2e');
const useRunning = process.argv.includes('--running');
const origin = live ? 'https://devs-tinder.in' : useRunning ? 'http://localhost:5173' : 'http://127.0.0.1:5174';
const password = 'E2eStrong@123';
const results = [];
const browserErrors = [];
const failedRequests = [];
const networkErrors = [];
const screenshots = [];
fs.mkdirSync(output, { recursive: true });

const fixtures = (action) => {
  if (!live) return;
  const key = process.env.E2E_SSH_KEY;
  if (!key) throw new Error('E2E_SSH_KEY is required for isolated live test data');
  const remoteBackend = process.env.E2E_REMOTE_BACKEND_DIR || '/home/ubuntu/devs-tinder';
  if (!/^\/home\/ubuntu\/[a-zA-Z0-9_/-]+$/.test(remoteBackend)) throw new Error('Invalid remote backend directory');
  const result = spawnSync('ssh', [
    '-i', key, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
    'ubuntu@ec2-3-104-38-33.ap-southeast-2.compute.amazonaws.com',
    `env -C ${remoteBackend} /home/ubuntu/.nvm/versions/node/v24.14.1/bin/node src/scripts/liveTestFixtures.js ${action} ${runId}`,
  ], { encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) throw new Error('Live fixture ' + action + ' failed: ' + (result.stderr || result.error?.message));
  console.log('FIXTURES ' + action + ' ' + result.stdout.trim());
};

const check = async (name, action) => {
  try {
    const detail = await action();
    results.push({ name, status: 'PASS', detail });
    console.log('PASS ' + name + (detail ? ' ' + JSON.stringify(detail) : ''));
  } catch (error) {
    results.push({ name, status: 'FAIL', error: error.message });
    console.log('FAIL ' + name + ' ' + error.message.slice(0, 1200));
  }
};

let browser, vite, mongo, stopServer;
const contexts = [];
const newPage = async (viewport = { width: 1440, height: 1000 }) => {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 768 });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(live ? 20000 : 7000);
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => {
    if (response.status() >= 500) networkErrors.push({ url: response.url(), status: response.status() });
  });
  return page;
};

const api = async (page, endpoint) => {
  const response = await page.request.get(origin + '/api' + endpoint);
  assert.equal(response.status(), 200, endpoint + ' ' + await response.text());
  return response.json();
};
const clickRequest = async (page, button, endpoint, expectedStatus = 200) => {
  const pending = page.waitForResponse(response => response.url().endsWith(endpoint) && response.request().method() !== 'OPTIONS');
  await button.click();
  const response = await pending;
  assert.equal(response.status(), expectedStatus, await response.text());
  return response;
};
const screenshot = async (page, name) => {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  screenshots.push(name + '.png');
};
const layout = page => page.evaluate(() => {
  const footer = document.querySelector('footer').getBoundingClientRect();
  const main = document.querySelector('main').getBoundingClientRect();
  return {
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    footerOverlaps: footer.top < main.bottom - 1,
    nestedLabels: document.querySelectorAll('label label').length,
    brokenImages: [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => image.src),
  };
});

const delayedAction = async (page, endpoint, button, relatedButtons) => {
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  const pattern = '**' + endpoint;
  await page.route(pattern, async route => {
    entered();
    await gate;
    await route.continue();
  });
  const response = page.waitForResponse(value => value.url().endsWith(endpoint));
  let disabled;
  try {
    await button.click();
    await started;
    disabled = await Promise.all(relatedButtons.map(value => value.isDisabled()));
  } finally {
    release();
    assert.equal((await response).status(), 200);
    await page.unroute(pattern);
  }
  assert.ok(disabled.every(Boolean), 'Conflicting action buttons were enabled during the request');
};

(async () => {
  if (live && !process.env.E2E_SSH_KEY) throw new Error('Set E2E_SSH_KEY before running live tests');
  if (!useRunning && !live) {
  process.env.MONGODB_URI = '';
  process.env.JWT_SECRET = 'isolated-playwright-test-secret';
  process.env.CLIENT_ORIGIN = origin;
  process.env.PORT = '7778';
  process.env.DISABLE_EMAILS = 'true';
  process.env.DISABLE_CRON = 'true';
  process.env.SES_FEEDBACK_QUEUE_URL = '';
  process.env.SES_FEEDBACK_TOPIC_ARN = '';
  process.env.NODE_ENV = 'test';
  const { MongoMemoryServer } = beRequire('mongodb-memory-server');
  mongo = await MongoMemoryServer.create({ instance: { dbName: 'devtinder-playwright' } });
  process.env.MONGODB_URI = mongo.getUri();
  const app = beRequire(path.join(backend, 'src/app.js'));
  stopServer = app.stopServer;
  await app.startServer({ port: 7778 });
  const { createServer } = await import(pathToFileURL(path.join(frontend, 'node_modules/vite/dist/node/index.js')).href);
  vite = await createServer({
    root: frontend,
    server: {
      host: '127.0.0.1', port: 5174, strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:7778', changeOrigin: true, rewrite: value => value.replace(/^\/api/, '') } },
    },
  });
  await vite.listen();
  }
  browser = await chromium.launch({ headless: process.env.E2E_HEADED !== 'true' });
  const anon = await newPage();
  await check('Protected pages redirect to login; protected APIs reject unauthenticated requests', async () => {
    for (const route of ['/', '/profile', '/requests', '/connections', '/premium']) {
      await anon.goto(origin + route);
      await anon.waitForURL(origin + '/login');
      await anon.getByRole('button', { name: 'Login', exact: true }).waitFor();
    }
    for (const route of ['/profile/view', '/feed', '/user/requests/received', '/user/connections', '/payment/membership']) {
      assert.equal((await anon.request.get(origin + '/api' + route)).status(), 401, route);
    }
    await screenshot(anon, 'desktop-login');
  });
  await check('Invalid login displays API validation error', async () => {
    await anon.getByLabel('Email ID:').fill('nobody@example.com');
    await anon.getByLabel('Password', { exact: true }).fill(password);
    await clickRequest(anon, anon.getByRole('button', { name: 'Login', exact: true }), '/login', 400);
    await anon.getByText('ERROR : Invalid credentials', { exact: true }).waitFor();
  });
  await check('Empty signup is rejected visibly', async () => {
    await anon.getByText('New User? Signup Here', { exact: true }).click();
    await clickRequest(anon, anon.getByRole('button', { name: 'Sign Up', exact: true }), '/signup', 400);
    await anon.getByText('ERROR : Name is not valid!', { exact: true }).waitFor();
  });

  const users = [];
  for (const lastName of ['Alpha', 'Bravo', 'Charlie', 'Delta']) {
    const page = await newPage();
    const emailId = 'e2e.' + (live ? runId + '.' : '') + lastName.toLowerCase() + '@example.com';
    await page.goto(origin + '/login');
    await page.getByText('New User? Signup Here', { exact: true }).click();
    await page.getByLabel('First Name', { exact: true }).fill('Test');
    await page.getByLabel('Last Name', { exact: true }).fill(lastName);
    await page.getByLabel('Email ID:').fill(emailId);
    await page.getByLabel('Password', { exact: true }).fill(password);
    assert.equal(await page.getByRole('checkbox', { name: /Email me connection requests/ }).isChecked(), false);
    const response = await clickRequest(page, page.getByRole('button', { name: 'Sign Up', exact: true }), '/signup', 201);
    const user = (await response.json()).data;
    await page.waitForURL(origin + '/profile');
    users.push({ page, ...user });
  }
  const [alice, bob, carol, dave] = users;
  fixtures('isolate');
  await check('Four users sign up through browser and receive authenticated sessions', async () => {
    for (const user of users) {
      const profile = await api(user.page, '/profile/view');
      assert.equal(profile._id, user._id);
      assert.equal(profile.emailConsent.enabled, false);
    }
  });
  await check('Mobile avatar menu closes after navigation and the avatar remains tappable', async () => {
    const page = await newPage({ width: 390, height: 844 });
    await page.context().addCookies(await alice.page.context().cookies());
    await page.goto(origin + '/');
    const avatar = page.getByRole('button', { name: 'Account menu' });
    // Selecting Profile twice covers both navigating to it and tapping its link while already there.
    for (const [label, path] of [['Profile', '/profile'], ['Profile', '/profile'], ['Connections', '/connections']]) {
      await avatar.tap();
      const link = page.getByRole('link', { name: label, exact: true });
      await link.tap();
      await page.waitForURL(origin + path);
      await link.waitFor({ state: 'hidden' });
      assert.equal(await avatar.getAttribute('aria-expanded'), 'false');
    }
  });
  await check('Email consent defaults off and cannot be forged through profile edits', async () => {
    const checkbox = alice.page.getByRole('checkbox', { name: /Email me connection requests/ });
    assert.equal(await checkbox.isChecked(), false);
    assert.equal((await alice.page.request.patch(origin + '/api/profile/edit', { data: { emailConsent: { enabled: true, confirmedAt: new Date().toISOString() } } })).status(), 400);
    if (!live) {
      await clickRequest(alice.page, checkbox, '/profile/email-preferences');
      await alice.page.getByText('Confirmation pending.', { exact: false }).waitFor();
      assert.equal((await api(alice.page, '/profile/view')).emailConsent.enabled, true);
      await alice.page.reload();
      await alice.page.getByRole('heading', { name: 'Edit Profile', exact: true }).waitFor();
      assert.equal(await checkbox.isChecked(), true);
      await clickRequest(alice.page, checkbox, '/profile/email-preferences');
    }
    await alice.page.reload();
    await alice.page.getByRole('heading', { name: 'Edit Profile', exact: true }).waitFor();
    assert.equal(await checkbox.isChecked(), false);
    return live ? 'Live inbox opt-in/confirmation is covered by test:email:live; no emails sent to synthetic example.com accounts.' : 'Opt-in, pending confirmation, withdrawal, and reload persistence verified.';
  });
  await check('Profile controls have independent labels', async () => {
    assert.equal(await alice.page.locator('label label').count(), 0, 'Nested labels associate Photo URL with Last Name');
    assert.equal(await alice.page.getByLabel('Photo URL :', { exact: true }).count(), 1);
  });
  await check('Profile save persists across reload, including photo URL', async () => {
    const inputs = alice.page.locator('main .card').first().locator('input');
    const values = ['Test', 'Alpha', 'https://i.pravatar.cc/300?img=12', '28', 'male', 'Isolated Playwright profile'];
    for (let index = 0; index < values.length; index++) await inputs.nth(index).fill(values[index]);
    await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Save Profile' }), '/profile/edit');
    await alice.page.getByText('Profile saved successfully.', { exact: true }).waitFor();
    await alice.page.reload();
    await alice.page.getByRole('heading', { name: 'Edit Profile', exact: true }).waitFor();
    assert.equal(await inputs.nth(1).inputValue(), 'Alpha');
    const saved = await api(alice.page, '/profile/view');
    assert.equal(saved.age, 28);
    assert.equal(saved.photoUrl, values[2]);
    assert.equal(saved.about, values[5]);
    await screenshot(alice.page, 'desktop-profile');
  });
  await check('Invalid profile age is rejected and persisted data is unchanged', async () => {
    const age = alice.page.locator('main .card').first().locator('input').nth(3);
    await age.fill('12');
    await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Save Profile' }), '/profile/edit', 400);
    await alice.page.locator('main .text-red-500').filter({ hasText: 'minimum allowed value' }).waitFor();
    assert.equal((await api(alice.page, '/profile/view')).age, 28);
    await age.fill('28');
  });
  await check('Feed Ignore removes the user persistently', async () => {
    await alice.page.goto(origin + '/');
    await alice.page.getByRole('heading', { name: 'Test Bravo', exact: true }).waitFor();
    await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Ignore', exact: true }), '/request/send/ignored/' + bob._id);
    await alice.page.getByRole('heading', { name: 'Test Charlie', exact: true }).waitFor();
    assert.ok(!(await api(alice.page, '/feed')).data.some(user => user._id === bob._id));
  });
  await check('Interested buttons deliver requests to both recipients', async () => {
    for (const user of [carol, dave]) {
      await alice.page.getByRole('heading', { name: 'Test ' + user.lastName, exact: true }).waitFor();
      await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Interested', exact: true }), '/request/send/interested/' + user._id);
      const pending = (await api(user.page, '/user/requests/received')).data;
      assert.equal(pending.length, 1);
      assert.equal(pending[0].fromUserId._id, alice._id);
      user.requestId = pending[0]._id;
    }
    await alice.page.getByRole('heading', { name: 'No more profiles', exact: true }).waitFor();
  });
  await check('Accept request through UI and verify both connection lists', async () => {
    await carol.page.goto(origin + '/requests');
    await carol.page.getByRole('heading', { name: 'Test Alpha', exact: true }).waitFor();
    await screenshot(carol.page, 'desktop-requests');
    await clickRequest(carol.page, carol.page.getByRole('button', { name: 'Accept', exact: true }), '/request/review/accepted/' + carol.requestId);
    await carol.page.getByText('No Requests Found', { exact: true }).waitFor();
    for (const [owner, other] of [[alice, carol], [carol, alice]]) {
      await owner.page.goto(origin + '/connections');
      await owner.page.getByRole('heading', { name: 'Test ' + other.lastName, exact: true }).waitFor();
      assert.equal((await api(owner.page, '/user/connections')).data[0]._id, other._id);
    }
    await screenshot(carol.page, 'desktop-connections');
  });
  await check('Reject request through UI without creating a connection', async () => {
    await dave.page.goto(origin + '/requests');
    await dave.page.getByRole('heading', { name: 'Test Alpha', exact: true }).waitFor();
    await clickRequest(dave.page, dave.page.getByRole('button', { name: 'Reject', exact: true }), '/request/review/rejected/' + dave.requestId);
    await dave.page.getByText('No Requests Found', { exact: true }).waitFor();
    assert.equal((await api(dave.page, '/user/connections')).data.length, 0);
  });
  await check('Duplicate and unauthorized request reviews are rejected', async () => {
    assert.equal((await alice.page.request.post(origin + '/api/request/send/interested/' + carol._id)).status(), 400);
    assert.equal((await bob.page.request.post(origin + '/api/request/review/accepted/' + dave.requestId)).status(), 404);
  });
  await check('Logout clears cookie, protects pages, and login restores profile', async () => {
    await alice.page.getByRole('button', { name: 'Account menu' }).click();
    await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Logout', exact: true }), '/logout');
    await alice.page.waitForURL(origin + '/login');
    assert.equal((await alice.page.request.get(origin + '/api/profile/view')).status(), 401);
    await alice.page.goto(origin + '/profile');
    await alice.page.waitForURL(origin + '/login');
    await alice.page.getByLabel('Email ID:').fill(alice.emailId);
    await alice.page.getByLabel('Password', { exact: true }).fill(password);
    await clickRequest(alice.page, alice.page.getByRole('button', { name: 'Login', exact: true }), '/login');
    await alice.page.waitForURL(origin + '/');
    assert.equal((await api(alice.page, '/profile/view')).about, 'Isolated Playwright profile');
  });
  await check('Feed disables both actions while sending a request', async () => {
    await bob.page.goto(origin + '/');
    await bob.page.getByRole('heading', { name: 'Test Charlie', exact: true }).waitFor();
    await delayedAction(bob.page, '/request/send/interested/' + carol._id,
      bob.page.getByRole('button', { name: 'Interested', exact: true }),
      [bob.page.getByRole('button', { name: 'Ignore', exact: true }), bob.page.getByRole('button', { name: 'Sending...', exact: true })]);
  });
  await check('Mobile request review fits and disables conflicting actions', async () => {
    await carol.page.setViewportSize({ width: 390, height: 844 });
    await carol.page.goto(origin + '/requests');
    await carol.page.getByRole('heading', { name: 'Test Bravo', exact: true }).waitFor();
    await screenshot(carol.page, 'mobile-pending-request');
    const info = await layout(carol.page);
    assert.ok(info.documentWidth <= info.width + 1, JSON.stringify(info));
    const requestId = (await api(carol.page, '/user/requests/received')).data[0]._id;
    await delayedAction(carol.page, '/request/review/rejected/' + requestId,
      carol.page.getByRole('button', { name: 'Reject', exact: true }),
      [carol.page.getByRole('button', { name: 'Rejecting...', exact: true }), carol.page.getByRole('button', { name: 'Accept', exact: true })]);
  });
  await check('Mobile screens fit viewport and footer stays below content', async () => {
    const issues = [];
    for (const width of [320, 390, 768, 1440]) {
      await carol.page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      for (const route of ['/profile', '/', '/connections', '/requests']) {
        await carol.page.goto(origin + route, { waitUntil: 'networkidle' });
        if (route === '/profile') await carol.page.getByRole('heading', { name: 'Edit Profile', exact: true }).waitFor();
        const info = await layout(carol.page);
        await screenshot(carol.page, 'viewport-' + width + '-' + (route.slice(1) || 'feed'));
        if (info.documentWidth > info.width + 1 || info.footerOverlaps || info.brokenImages.length) issues.push({ route, ...info });
      }
    }
    assert.deepEqual(issues, []);
  });
  await check('Legacy user mutation endpoints require authentication', async () => {
    const update = await anon.request.patch(origin + '/api/user/' + bob._id, { data: { about: 'unauthenticated-update-probe' } });
    assert.equal(update.status(), 401, 'Unauthenticated PATCH /user/:id returned ' + update.status());
    const deletion = await anon.request.delete(origin + '/api/user', { data: { userId: bob._id } });
    assert.equal(deletion.status(), 401, 'Unauthenticated DELETE /user returned ' + deletion.status());
    assert.equal((await alice.page.request.patch(origin + '/api/user/' + bob._id, { data: { about: 'blocked' } })).status(), 403);
    assert.equal((await alice.page.request.delete(origin + '/api/user', { data: { userId: bob._id } })).status(), 403);
  });
  await check('Feed continues beyond the first ten profiles without a page reload', async () => {
    const fixturePage = await newPage();
    for (let index = 0; index < 12; index++) {
      const response = await fixturePage.request.post(origin + '/api/signup', { data: {
        firstName: 'Extra', lastName: 'Profile' + index, emailId: (live ? 'e2e.' + runId + '.' : '') + 'extra' + index + '@example.com', password,
      } });
      assert.equal(response.status(), 201);
    }
    fixtures('isolate');
    await alice.page.goto(origin + '/');
    const seen = new Set();
    for (let index = 0; index < 12; index++) {
      await alice.page.getByRole('button', { name: 'Ignore', exact: true }).waitFor();
      const title = await alice.page.locator('main .card-title').innerText();
      assert.ok(!seen.has(title), 'Repeated profile ' + title);
      seen.add(title);
      const response = alice.page.waitForResponse(value => value.url().includes('/request/send/ignored/') && value.request().method() === 'POST');
      await alice.page.getByRole('button', { name: 'Ignore', exact: true }).click();
      assert.equal((await response).status(), 200);
    }
    await alice.page.getByRole('heading', { name: 'No more profiles', exact: true }).waitFor();
    assert.equal((await api(alice.page, '/feed')).data.length, 0);
    return { profilesHandled: seen.size };
  });
  await check('No uncaught browser exceptions or server errors', async () => {
    assert.deepEqual(browserErrors, []);
    assert.deepEqual(networkErrors, []);
    const unexpected = failedRequests.filter(value => value.error !== 'net::ERR_ABORTED');
    assert.deepEqual(unexpected, []);
    return { failedRequests };
  });
})().catch(error => {
  console.error(error);
  results.push({ name: 'Test setup or browser signup', status: 'FAIL', error: error.stack });
}).finally(async () => {
  try {
    fixtures('cleanup');
  } catch (error) {
    results.push({ name: 'Live test data cleanup', status: 'FAIL', error: error.message });
    console.error(error.message);
  }
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (stopServer) await stopServer();
  await beRequire('mongoose').disconnect();
  if (mongo) await mongo.stop();
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ origin, runId, completedAt: new Date().toISOString(), results, browserErrors, networkErrors, failedRequests, screenshots }, null, 2));
  const passed = results.filter(result => result.status === 'PASS').length;
  console.log('RESULT ' + passed + '/' + results.length + ' checks passed. Artifacts: ' + output);
  process.exitCode = passed === results.length ? 0 : 1;
});
