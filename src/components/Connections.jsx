import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addConnections } from "../utils/connectionSlice";

const Connections = () => {
  const connections = useSelector((store) => store.connections);
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // The fetchConnections function is an asynchronous function that is
  //  called when the Connections component mounts.
  //  It sends a GET request to the server to retrieve the user's
  //  connections, and if the request is successful, it dispatches
  //  the addConnections action to update the connections state in the 
  // Redux store with the retrieved data. If there is an error during the 
  // request, it can be handled in the catch block (e.g., by setting an error
  //  state or showing a notification to the user).
  const fetchConnections = useCallback(async () => {
    try {
      const res = await axios.get(BASE_URL + "/user/connections", {
        withCredentials: true,
      });
      dispatch(addConnections(res.data.data || []));
    } catch (error) {
      setError(error?.response?.data?.message || "Unable to load connections.");
      dispatch(addConnections([]));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchConnections();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchConnections]);

  if (isLoading && connections === null) {
    return <p className="text-center">Loading connections...</p>;
  }

  if (!connections || connections.length === 0) {
    return (
      <div className="space-y-4 text-center">
        {error ? <p className="text-red-500">{error}</p> : null}
        <h1 className="text-2xl font-semibold">No Connections Found</h1>
      </div>
    );
  }

  return (
    <div className="text-center my-10">
      <h1 className="text-bold text-white text-3xl">Connections</h1>
      {error ? <p className="mt-4 text-red-500">{error}</p> : null}

      {connections.map((connection) => {
        const { _id, firstName, lastName, photoUrl, age, gender, about } =
          connection;

        return (
           <div
            key={_id}
            className=" flex m-4 p-4 rounded-lg bg-base-300 w-1/2 mx-auto"
          >
            <div>
              <img
                alt="photo"
                className="w-20 h-20 rounded-full object-cover"
                src={photoUrl}
              />
            </div>
            <div className="text-left mx-4 ">
              <h2 className="font-bold text-xl">
                {firstName + " " + lastName}
              </h2>
              {age && gender && <p>{age + ", " + gender}</p>}
              <p>{about}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default Connections;
