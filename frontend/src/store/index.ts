import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import onlineStatusReducer from './slices/onlineStatusSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onlineStatus: onlineStatusReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

