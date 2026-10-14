import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Auth Slice ──────────────────────────────────────────────────────────────
interface AuthState {
  token:    string | null;
  fullName: string | null;
  role:     string | null;
  isAuthenticated: boolean;
}
const storedToken    = localStorage.getItem('hsm_token');
const storedFullName = localStorage.getItem('hsm_fullName');
const storedRole     = localStorage.getItem('hsm_role');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token:           storedToken,
    fullName:        storedFullName,
    role:            storedRole,
    isAuthenticated: !!storedToken,
  } as AuthState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; fullName: string; role: string }>) {
      state.token           = action.payload.token;
      state.fullName        = action.payload.fullName;
      state.role            = action.payload.role;
      state.isAuthenticated = true;
      localStorage.setItem('hsm_token',    action.payload.token);
      localStorage.setItem('hsm_fullName', action.payload.fullName);
      localStorage.setItem('hsm_role',     action.payload.role);
    },
    logout(state) {
      state.token           = null;
      state.fullName        = null;
      state.role            = null;
      state.isAuthenticated = false;
      localStorage.removeItem('hsm_token');
      localStorage.removeItem('hsm_fullName');
      localStorage.removeItem('hsm_role');
    },
  },
});
export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
