import { createSlice } from "@reduxjs/toolkit";

const feedSlice = createSlice({
  name: "feed",
  initialState: null,
  reducers: {
    // addFeed is a reducer function that takes the current state and an action as arguments
    //  and returns the new state.
    // state is null initially, and when the addFeed action is dispatched, it will update the state to the payload of the action, 
    // which is the feed data returned from the backend after a successful request to fetch the feed.
    // The removeFeed reducer function will reset the feed state back to null when we want to clear the feed data from the store.
    addFeed: (_, action) => {
      return action.payload;
    },
    removeUserFromFeed: (state, action) => {
       const newFeed = state.filter((user) => user._id !== action.payload);
      return newFeed;
    },
  },
});

export const { addFeed, removeFeed, removeUserFromFeed } = feedSlice.actions;
export default feedSlice.reducer;
