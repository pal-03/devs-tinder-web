import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import Footer from "./Footer";

// what does the Outlet component do in this code?
// The Outlet component is a placeholder that renders the matched child route components. In this code, it allows the Body component to render the NavBar and Footer components while also rendering the specific content for the current route (e.g., Login or Profile) in between them. When a user navigates to a route like "/login", the Outlet will render the Login component, and when they navigate to "/profile", it will render the Profile component, all while keeping the NavBar and Footer visible on the page.

// any children routes of body will be rendered in the Outlet component. For example, if we have a route for "/login" that is a child of the "/" route, then when the user navigates to "/login", the Login component will be rendered inside the Outlet component, while the NavBar and Footer components will still be visible on the page. This allows us to create a consistent layout for our app while still rendering different content based on the current route.
const Body = () => {
  return (
    <div>
      <NavBar />
      <Outlet />
      <Footer />
    </div>
  );
};
export default Body;