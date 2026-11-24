import { useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { addUser } from "../utils/userSlice";

const EmailPreferences = ({ user }) => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const enabled = user.emailConsent?.enabled === true;
  const pending = enabled && !user.emailConsent?.confirmedAt;

  const save = async (value) => {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await axios.patch(BASE_URL + "/profile/email-preferences", { enabled: value }, { withCredentials: true });
      dispatch(addUser(data.data));
      setMessage(!value ? "Email notifications are off." : data.confirmation?.skipped
        ? data.confirmation.reason || "Email notifications are already confirmed."
        : "Check your email to confirm notifications.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save email preferences.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="border-t border-base-content/20 mt-4 pt-4 min-w-0">
      <legend className="text-base font-semibold pt-4">Email notifications</legend>
      <label className="flex items-start gap-3 cursor-pointer text-sm leading-6">
        <input type="checkbox" className="checkbox checkbox-sm mt-1 shrink-0" checked={enabled} disabled={busy} onChange={(event) => save(event.target.checked)} />
        <span>Email me connection requests and daily pending-request reminders. I can unsubscribe at any time.</span>
      </label>
      {pending && <p className="text-sm mt-3">Confirmation pending. Notifications stay off until you confirm your email.</p>}
      {pending && <button type="button" className="btn btn-sm btn-ghost mt-2" disabled={busy} onClick={() => save(true)}>Resend confirmation</button>}
      {enabled && !pending && <p className="text-sm mt-3">Email notifications confirmed.</p>}
      <p role="status" className="text-sm mt-2 break-words">{busy ? "Saving email preferences..." : message}</p>
    </fieldset>
  );
};

export default EmailPreferences;
