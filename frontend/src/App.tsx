import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store, RootState } from './store/store';
import theme from './theme/theme';
import PublicNavbar from './components/layout/PublicNavbar';
import AdminLayout  from './components/layout/AdminLayout';
import HomePage    from './pages/public/HomePage';
import BookingPage from './pages/public/BookingPage';
import RefundApplicationPage from './pages/public/RefundApplicationPage';
import CancellationApplicationPage from './pages/public/CancellationApplicationPage';
import TrackRefundPage from './pages/public/TrackRefundPage';
import { AboutVenuePage, ContactPage, GalleryPage, PrintBookingPage } from './pages/public/PublicPages';
import AdminLoginPage    from './pages/admin/AdminLoginPage';
import AdminDashboard    from './pages/admin/AdminDashboard';
import AdminSlotAvailabilityPage from './pages/admin/AdminSlotAvailabilityPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminVenuesPage   from './pages/admin/AdminVenuesPage';
import AdminUsersPage    from './pages/admin/AdminUsersPage';
import AdminHolidaysPage from './pages/admin/AdminHolidaysPage';
import { AdminGalleryPage, AdminNoticesPage }           from './pages/admin/AdminGalleryNoticesPage';
import { AdminComplaintsPage, AdminCancellationsPage }  from './pages/admin/AdminComplaintsCancellationsPage';
import AdminReceiptsPage from './pages/admin/AdminReceiptsPage';
import AdminRefundRequestsPage from './pages/admin/AdminRefundRequestsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';

const PublicLayout: React.FC = () => (<><PublicNavbar /><Outlet /></>);

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, role } = useSelector((s: RootState) => s.auth);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (role === 'Clerk' && location.pathname !== '/admin/refunds') {
    return <Navigate to="/admin/refunds" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/"              element={<HomePage />} />
      <Route path="/about"         element={<AboutVenuePage />} />
      <Route path="/gallery"       element={<GalleryPage />} />
      <Route path="/contact"       element={<ContactPage />} />
      <Route path="/print-booking" element={<PrintBookingPage />} />
      <Route path="/refunds"       element={<RefundApplicationPage />} />
      <Route path="/cancel-booking" element={<CancellationApplicationPage />} />
      <Route path="/track-refund" element={<TrackRefundPage />} />
      <Route path="/book"          element={<BookingPage />} />
    </Route>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/clerk/login" element={<AdminLoginPage clerkMode />} />
    <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
      <Route index               element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard"    element={<AdminDashboard />} />
      <Route path="slot-availability" element={<AdminSlotAvailabilityPage />} />
      <Route path="bookings"     element={<AdminBookingsPage />} />
      <Route path="payments"     element={<AdminPaymentsPage />} />
      <Route path="venues"       element={<AdminVenuesPage />} />
      <Route path="holidays"     element={<AdminHolidaysPage />} />
      <Route path="gallery"      element={<AdminGalleryPage />} />
      <Route path="notices"      element={<AdminNoticesPage />} />
      <Route path="complaints"   element={<AdminComplaintsPage />} />
      <Route path="cancellations" element={<AdminCancellationsPage />} />
      <Route path="refunds"      element={<AdminRefundRequestsPage />} />
      <Route path="users"        element={<AdminUsersPage />} />
      <Route path="receipts"     element={<AdminReceiptsPage />} />
      <Route path="audit"        element={<AdminAuditPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App: React.FC = () => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppRoutes />
      </Router>
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </ThemeProvider>
  </Provider>
);

export default App;
