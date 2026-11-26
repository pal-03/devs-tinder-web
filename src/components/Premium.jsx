import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { addUser } from "../utils/userSlice";
import { loadRazorpay } from "../utils/razorpayCheckout";

const money = (amount, currency = "INR") => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
const title = value => value.charAt(0).toUpperCase() + value.slice(1);

const Premium = () => {
  const [account, setAccount] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const locked = useRef(false);
  const mounted = useRef(true);
  const checkout = useRef(null);
  const dispatch = useDispatch();

  const refresh = useCallback(async () => {
    const { data } = await axios.get(BASE_URL + "/payment/membership", { withCredentials: true });
    if (mounted.current) setAccount(data);
    return data;
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh().catch(() => { if (mounted.current) setError("Unable to load membership details. Please retry."); });
    return () => { mounted.current = false; checkout.current?.close(); };
  }, [refresh]);

  const syncUser = async () => {
    const { data } = await axios.get(BASE_URL + "/profile/view", { withCredentials: true });
    if (mounted.current) dispatch(addUser(data));
  };
  const complete = async (result) => {
    await Promise.all([refresh(), syncUser()]);
    if (!mounted.current) return;
    if (result.membership.active && ["captured", "partially_refunded"].includes(result.payment.status)) {
      setMessage(`${title(result.membership.type)} membership activated.`);
    } else if (result.payment.status === "refunded") {
      setMessage("This payment has been refunded.");
    } else if (result.payment.status === "failed") {
      setError("Payment failed. You can retry checkout.");
    } else {
      setMessage("Payment confirmation is pending. Check its status before starting another checkout.");
    }
  };
  const unlock = () => { locked.current = false; if (mounted.current) setBusy(""); };

  const checkStatus = async (orderId) => {
    if (locked.current) return;
    locked.current = true;
    setBusy("Checking payment..."); setError(""); setMessage("");
    try {
      const { data } = await axios.get(BASE_URL + "/payment/status/" + orderId, { withCredentials: true });
      await complete(data);
    } catch (failure) {
      if (mounted.current) setError(failure.response?.data?.message || "Unable to check payment status. Please try again.");
    } finally { unlock(); }
  };

  const handleBuyClick = async (type) => {
    if (locked.current) return;
    locked.current = true;
    setBusy("Creating checkout..."); setMessage(""); setError("");
    const pendingKey = "devtinder-checkout-" + type;
    try {
      // 1. Send a request to the backend to create an order for the selected membership type.
      // 2. The backend will interact with the Razorpay API to create an order and return the order details.
      // 3. Use the order details to open the Razorpay checkout form for the user to complete the payment.
      // 4. After the payment is completed, send Razorpay's response to the backend to verify the payment.
      // 5. The backend will verify the payment and update the user's membership status accordingly.
      const Razorpay = await loadRazorpay();
      // Reuse this tab's request ID after dismissal or reload so the backend can return the same order.
      let requestId = sessionStorage.getItem(pendingKey);
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(pendingKey, requestId); }
      const order = await axios.post(BASE_URL + "/payment/create", { membershipType: type }, {
        withCredentials: true, // This option allows the request to include credentials (like cookies) for authentication
        headers: { "Idempotency-Key": requestId },
      });
      const { amount, keyId, currency, notes, orderId, status } = order.data;
      if (["captured", "refunded", "partially_refunded"].includes(status)) {
        sessionStorage.removeItem(pendingKey);
        const { data } = await axios.get(BASE_URL + "/payment/status/" + orderId, { withCredentials: true });
        await complete(data); unlock(); return;
      }
      // Closing the modal can also trigger ondismiss after success or failure. Keep that callback from overwriting the result.
      let settled = false;
      const options = {
        key: keyId, amount, currency, name: "DevTinder", description: title(type) + " membership", order_id: orderId,
        prefill: { name: [notes.firstName, notes.lastName].filter(Boolean).join(" "), email: notes.emailId },
        hidden: { contact: true },
        theme: { color: "#605dff" }, retry: { enabled: false },
        handler: async (response) => {
          settled = true;
          if (mounted.current) setBusy("Verifying payment...");
          try {
            // Checkout returns a signed receipt, not permission to unlock Premium. Display the backend's verified result.
            const { data } = await axios.post(BASE_URL + "/payment/verify", response, { withCredentials: true });
            sessionStorage.removeItem(pendingKey);
            await complete(data);
          } catch (failure) {
            if (mounted.current) setError(failure.response?.data?.message || "Payment confirmation is unavailable. Check its status before paying again.");
          } finally { unlock(); }
        },
        modal: { ondismiss: () => {
          if (settled || !mounted.current) return;
          setMessage("Checkout closed. Check payment status if your payment was already submitted.");
          refresh().catch(() => {});
          unlock();
        } },
      };
      // Open the Razorpay checkout form with the specified options.
      // The script is loaded into window by loadRazorpay only when checkout starts.
      const rzp = new Razorpay(options);
      checkout.current = rzp;
      rzp.on("payment.failed", () => {
        settled = true;
        rzp.close();
        if (mounted.current) setError("Payment failed. Check payment status or retry checkout.");
        refresh().catch(() => {});
        unlock();
      });
      setBusy("Checkout open...");
      rzp.open();
      await refresh();
    } catch (failure) {
      if (failure.response && [400, 409, 502, 503].includes(failure.response.status)) sessionStorage.removeItem(pendingKey);
      if (mounted.current) setError(failure.response?.data?.message || failure.message || "Unable to start checkout. Please try again.");
      refresh().catch(() => {});
      unlock();
    }
  };

  return (
    <section className="mx-auto max-w-4xl py-2">
      <h1 className="text-2xl font-semibold">Premium Membership</h1>
      {account?.mode === "test" && <p className="mt-3 text-sm text-warning">Test mode. No real money is charged.</p>}
      {account?.membership.active && <div className="my-6 border-y border-base-content/20 py-4" role="status">
        <h2 className="text-lg font-semibold">{title(account.membership.type)} membership active</h2>
        <p className="mt-1 text-sm">Valid until {new Date(account.membership.expiresAt).toLocaleDateString("en-IN")}</p>
      </div>}
      {account && !account.enabled && <p className="my-6" role="alert">Payments are currently unavailable.</p>}
      {!account && !error && <p role="status" className="my-6">Loading membership...</p>}
      <div className="grid grid-cols-1 gap-6 my-6 sm:grid-cols-2">
        {(account?.plans || []).map(plan => <article key={plan.type} className="card rounded-lg border border-base-content/15 bg-base-300 p-6 min-w-0">
          <h2 className="text-xl font-semibold">{title(plan.type)} Membership</h2>
          <p className="text-2xl font-semibold mt-5">{money(plan.amount, plan.currency)}</p>
          <p className="mt-2 text-sm">{plan.months} months - One-time payment</p>
          <button type="button" className={`btn mt-6 ${plan.type === "gold" ? "btn-primary" : "btn-secondary"}`}
            disabled={Boolean(busy) || !account.enabled || account.membership.active} onClick={() => handleBuyClick(plan.type)}>
            Buy {title(plan.type)}
          </button>
        </article>)}
      </div>
      <p role="status" className="my-3 text-sm break-words">{busy || message}</p>
      {error && <p role="alert" className="text-error my-3 break-words">{error}</p>}
      {!account && error && <button type="button" className="btn btn-sm" onClick={() => { setError(""); refresh().catch(() => setError("Unable to load membership details. Please retry.")); }}>Retry</button>}
      {account?.payments.length > 0 && <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        <div className="overflow-x-auto">
          <table className="table table-sm"><thead><tr><th>Plan</th><th>Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{account.payments.map((payment, index) => <tr key={payment.orderId || index}>
              <td>{title(payment.membershipType)}</td><td className="whitespace-nowrap">{money(payment.amount, payment.currency)}</td>
              <td className="break-words">{payment.status.replaceAll("_", " ")}</td>
              <td>{payment.orderId && <button type="button" className="btn btn-xs btn-ghost" disabled={Boolean(busy)} onClick={() => checkStatus(payment.orderId)}>Check status</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>
  );
};

export default Premium;
