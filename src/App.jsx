import { BrowserRouter, Routes, Route } from "react-router-dom";
import Body from "./components/Body";
import Feed from "./components/Feed";
import Login from "./components/Login";
import { Provider } from "react-redux";
import appStore from "./utils/appStore";
import Profile from "./components/Profile";
import Connections from "./components/Connections";
import Requests from "./components/Requests";

function App() {
  // How do we use the BrowserRouter, Routes, and Route components to set up routing in our app?
  // We use the BrowserRouter component to wrap our entire app, which enables routing functionality. Inside the BrowserRouter, we define our Routes using the Routes component. Each Route component specifies a path and the corresponding element to render when that path is accessed. In this case, we have a main route "/" that renders the Body component, and nested routes "/login" and "/profile" that render the Login and Profile components respectively.
  // How is different from createBrowserRouter and RouterProvider?
  // The createBrowserRouter and RouterProvider are part of the newer React Router v6 API, which provides a more declarative way to define routes and manage routing state. The BrowserRouter, Routes, and Route components are part of the older React Router v5 API. The newer API allows for better code splitting and more flexible route definitions, while the older API is simpler and may be easier to understand for beginners. In this code snippet, we are using the older API with BrowserRouter, Routes, and Route components.
  // eg: of createBrowserRouter and RouterProvider
  // import { createBrowserRouter, RouterProvider } from "react-router-dom";
  // const router = createBrowserRouter([
  //   {  
  //      path: "/",
  //      element: <Body />,
  //      children: [
  //        { path: "login", element: <Login /> },
  //        { path: "profile", element: <Profile /> }
  //     ]
  //   }
  // ]);
  // function App() {
  //   return (
  //     <RouterProvider router={router} />
  //   );
  // }    


  // routes will work relative to the basename
  // For example, if the basename is set to "/app", then the route "/login" will be accessed at "/app/login". This allows us to easily deploy our app to a subdirectory on a server without having to change our route definitions.
  return (
    <>
      <Provider store={appStore}>
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/" element={<Body />}>
              <Route index element={<Feed />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
              <Route path="connections" element={<Connections />} />
              <Route path="requests" element={<Requests />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </Provider>
    </>
  );
}

export default App;
