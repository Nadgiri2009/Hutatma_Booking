import { configureStore } from '@reduxjs/toolkit';
import authReducer     from './slices/authSlice';
import bookingReducer  from './slices/bookingSlice';
import uiReducer       from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth:    authReducer,
    booking: bookingReducer,
    ui:      uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
