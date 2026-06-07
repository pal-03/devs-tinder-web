import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BASE_URL } from "../utils/constants";
import { addRequests, removeRequest } from "../utils/requestSlice";

const Requests = () => {
  // Read the pending requests list from Redux so the UI stays in sync
  // after fetching or reviewing requests.
  const requests = useSelector((store) => store.requests);
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  // Load all incoming connection requests for the logged-in user.
  const fetchRequests = useCallback(async () => {
    try {
      const res = await axios.get(BASE_URL + "/user/requests/received", {
        withCredentials: true,
      });
      // Store the server response in Redux so the component can render it.
      dispatch(addRequests(res.data.data));
    } catch (error) {
      setError(
        error?.response?.data?.message || "Unable to load connection requests."
      );
      // Keep the UI in a known state instead of leaving stale requests behind.
      dispatch(addRequests([]));
    }
  }, [dispatch]);

  // Accept or reject a specific request, then remove it from the local list.
  const reviewRequest = async (status, requestId) => {
    try {
      // Track which button is busy so only that request shows a loading label.
      setReviewingId(`${status}:${requestId}`);
      setError("");
      await axios.post(
        `${BASE_URL}/request/review/${status}/${requestId}`,
        {},
        { withCredentials: true }
      );
      // Once the backend confirms the update, remove the reviewed card from Redux.
      dispatch(removeRequest(requestId));
    } catch (error) {
      setError(error?.response?.data?.message || "Unable to review request.");
    } finally {
      setReviewingId("");
    }
  };

  useEffect(() => {
    // Defer the initial fetch slightly to satisfy the current lint rule
    // around setState calls inside effects.
    const timer = setTimeout(() => {
      void fetchRequests();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRequests]);

  if (requests === null) {
    return <p className="text-center">Loading requests...</p>;
  }

  if (requests.length === 0) {
    return <h1 className="my-10 flex justify-center">No Requests Found</h1>;
  }

  return (
    <div className="my-10 text-center">
      <h1 className="text-3xl font-bold text-white">Connection Requests</h1>
      {error ? <p className="mt-4 text-red-500">{error}</p> : null}

      {requests.map((request) => {
        // Each request contains the sender inside fromUserId because the backend
        // populates the user who sent the connection request.
        const { firstName, lastName, photoUrl, age, gender, about } =
          request.fromUserId;

        return (
          <div
            key={request._id}
            className="mx-auto my-4 flex items-center justify-between rounded-lg bg-base-300 p-4"
          >
            <div>
              <img
                alt={`${firstName} ${lastName}`}
                className="h-20 w-20 rounded-full object-cover"
                src={photoUrl}
              />
            </div>
            <div className="mx-4 text-left">
              <h2 className="text-xl font-bold">{firstName + " " + lastName}</h2>
              {age && gender ? <p>{age + ", " + gender}</p> : null}
              <p>{about}</p>
            </div>
            <div>
              <button
                className="btn btn-primary mx-2"
                disabled={reviewingId === `rejected:${request._id}`}
                onClick={() => reviewRequest("rejected", request._id)}
                type="button"
              >
                {reviewingId === `rejected:${request._id}` ? "Rejecting..." : "Reject"}
              </button>
              <button
                className="btn btn-secondary mx-2"
                disabled={reviewingId === `accepted:${request._id}`}
                onClick={() => reviewRequest("accepted", request._id)}
                type="button"
              >
                {reviewingId === `accepted:${request._id}` ? "Accepting..." : "Accept"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Requests;
