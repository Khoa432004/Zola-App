import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface OnlineStatusState {
  onlineUsers: Record<string, boolean>; // Record of user IDs -> online status
}

const initialState: OnlineStatusState = {
  onlineUsers: {},
};

const onlineStatusSlice = createSlice({
  name: 'onlineStatus',
  initialState,
  reducers: {
    setUserOnline: (state, action: PayloadAction<string>) => {
      state.onlineUsers[action.payload] = true;
    },
    setUserOffline: (state, action: PayloadAction<string>) => {
      delete state.onlineUsers[action.payload];
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      const onlineMap: Record<string, boolean> = {};
      action.payload.forEach(userId => {
        onlineMap[userId] = true;
      });
      state.onlineUsers = onlineMap;
    },
    clearOnlineStatus: (state) => {
      state.onlineUsers = {};
    },
  },
});

export const { setUserOnline, setUserOffline, setOnlineUsers, clearOnlineStatus } = onlineStatusSlice.actions;

// Selector
export const selectIsUserOnline = (userId: string) => (state: { onlineStatus: OnlineStatusState }) => {
  return !!state.onlineStatus.onlineUsers[userId];
};

export default onlineStatusSlice.reducer;

