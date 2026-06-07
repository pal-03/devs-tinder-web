import { createSlice } from "@reduxjs/toolkit";

const connectionSlice = createSlice({
  name: "connection",
  initialState: null,
  // The reducers object defines the actions that can be dispatched to
  //  update the state of connections in the Redux store.
  reducers: {
    addConnections: (_, action) => action.payload,
    removeConnections: () => null,
  },
});

export const { addConnections, removeConnections } = connectionSlice.actions;

export default connectionSlice.reducer;
