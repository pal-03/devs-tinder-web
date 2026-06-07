import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import { addFeed, removeUserFromFeed } from "../utils/feedSlice";
import { useCallback, useEffect, useState } from "react";
import UserCard from "./UserCard";

const Feed = () => {
  // subscribe to the feed state from the Redux store using the useSelector hook.
  // This allows us to access the current feed data and display it in the component.
  const feed = useSelector((store) => store.feed);
  const dispatch = useDispatch();
  // dispatch is a function that allows us to send actions to the Redux store.
  //  In this code, we will use it to dispatch the addFeed action to update
  //  the feed state in the store with the data we fetch from the backend.
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const getFeed = useCallback(async () => {
    if (feed) return;
    try {
      const res = await axios.get(BASE_URL + "/feed", {
        withCredentials: true,
      });
      // If the request is successful, we will get the feed data in the 
      // response
      dispatch(addFeed(res?.data?.data));
    } catch (error) {
      setError(error?.response?.data?.message || "Unable to load feed.");
    }
  }, [dispatch, feed]);

  const handleFeedAction = async (status, userId) => {
    try {
      setActionLoading(`${status}:${userId}`);
      setError("");
      await axios.post(
        `${BASE_URL}/request/send/${status}/${userId}`,
        {},
        { withCredentials: true }
      );
      dispatch(removeUserFromFeed(userId));
    } catch (error) {
      setError(error?.response?.data?.message || "Unable to send request.");
    } finally {
      setActionLoading("");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void getFeed(); // Fetch the feed data when the Feed component mounts.
    }, 0);
    //  The empty dependency array ensures this effect runs only once when
    //  the component is first rendered.
    return () => clearTimeout(timer);
  }, [getFeed]);

  if (feed === null) {
    return <p className="text-center">Loading feed...</p>;
  }

  if (feed.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">No more profiles</h1>
        <p className="text-base-content/70">
          You have reached the end of the current feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-center text-red-500">{error}</p> : null}
      <div className="flex justify-center my-10">
        <UserCard
          user={feed[0]}
          onAction={handleFeedAction}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  );
};
export default Feed;
