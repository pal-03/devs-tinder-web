import { configureStore } from "@reduxjs/toolkit"; // import the user reducer
//  from the userSlice file
// configureStore is a function from the @reduxjs/toolkit library that 
// is used to create a Redux store.
//  It takes an object as an argument
//  where we can specify the reducers for our store. 
// In this case, we are specifying that the user reducer will be responsible
//  for managing the state of the user in our application. 
// The user reducer is imported from the userSlice file, which
//  contains the logic for handling actions related to the user state
//  (e.g., adding or removing a user). By configuring the store with the user
//  reducer, we can manage the user's state across our application and access
//  it from any component that is connected to the Redux store.
// give me smaller answers
import userReducer from "./userSlice";
import feedReducer from "./feedSlice";
import connectionReducer from "./connectionSlice";
import requestReducer from "./requestSlice";

const appStore = configureStore({
  reducer: {
    user: userReducer,
    feed: feedReducer,
    connections: connectionReducer,
    requests: requestReducer,
  },
});

export default appStore;
