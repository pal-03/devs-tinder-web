import { Outlet, useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import Footer from "./Footer";
import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { useDispatch, useSelector } from "react-redux";
import { addUser } from "../utils/userSlice";
import { useCallback, useEffect } from "react";

// what does the Outlet component do in this code?
// The Outlet component is a placeholder that renders the matched child route components. In this code, it allows the Body component to render the NavBar and Footer components while also rendering the specific content for the current route (e.g., Login or Profile) in between them. When a user navigates to a route like "/login", the Outlet will render the Login component, and when they navigate to "/profile", it will render the Profile component, all while keeping the NavBar and Footer visible on the page.

// any children routes of body will be rendered in the Outlet component. For example, if we have a route for "/login" that is a child of the "/" route, then when the user navigates to "/login", the Login component will be rendered inside the Outlet component, while the NavBar and Footer components will still be visible on the page. This allows us to create a consistent layout for our app while still rendering different content based on the current route.
const Body = () => {

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userData = useSelector((store) => store.user);

  // why do we need to fetch the user data when the Body component mounts?
  // We need to fetch the user data when the Body component mounts to 
  // check if the user is already authenticated. 
  // If the user is authenticated, we can update the Redux store with 
  // their information and allow them to access protected routes.
  //  If they are not authenticated, we can redirect them to the login page.
  //  This ensures that only authenticated users can access certain parts
  //  of the app and provides a better user experience by keeping them 
  // logged in across sessions.
  const fetchUser = useCallback(async () => {
    if (userData) return; // If user data is already present in the Redux store,
    //  we can skip fetching it again
    try {
      const res = await axios.get(BASE_URL + "/profile/view", {
        withCredentials: true,
      });
      // If the request is successful, we will get the user 
      // data in the response
      dispatch(addUser(res.data));
    } catch (err) {
      // If the error is an Axios error and the response status is 401 (Unauthorized),
      //  it means the user is not authenticated,
      //  so we will navigate them to the login page
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        navigate("/login");
        return;
      }
      console.error(err);
    }
  }, [dispatch, navigate, userData]);

  useEffect(() => {
    fetchUser(); // Fetch user data when the Body component mounts
  }, [fetchUser]);
  return (
    <div
      data-theme="dark"
      className="flex min-h-screen flex-col bg-base-100 text-base-content"
    >
      <NavBar />
      <main className="flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
export default Body;
