import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarOpen: boolean;
  loading:     boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, loading: false } as UiState,
  reducers: {
    toggleSidebar(state)                        { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen(state, action: PayloadAction<boolean>) { state.sidebarOpen = action.payload; },
    setLoading(state, action: PayloadAction<boolean>)     { state.loading = action.payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, setLoading } = uiSlice.actions;
export default uiSlice.reducer;
