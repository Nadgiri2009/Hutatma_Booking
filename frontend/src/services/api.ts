import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/slices/authSlice';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/admin/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  requestOtp: (mobile: string) => api.post('/auth/request-otp', { mobile }),
  verifyOtp: (mobile: string, otp: string) => api.post('/auth/verify-otp', { mobile, otp }),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingAPI = {
  checkAvailability: (data: any) => api.post('/bookings/availability', data),
  getSummary:        (data: any) => api.post('/bookings/summary', data),
  create:            (data: any) => api.post('/bookings', data),
  createForAdmin:    (data: any) => api.post('/bookings/admin', data),
  changeDate:        (id: number, newFromDate: string) => api.put(`/bookings/${id}/date`, { newFromDate }),
  forceCancel:       (id: number) => api.post(`/bookings/${id}/force-cancel`),
  getByNumber:       (num: string)   => api.get(`/bookings/number/${num}`),
  getByMobile:       (mob: string)   => api.get(`/bookings/mobile/${mob}`),
  getAll:            (params: any)   => api.get('/bookings', { params }),
};

// ── Refund requests ──────────────────────────────────────────────────────────
export const refundAPI = {
  lookup: (params: { bookingNumber?: string; mobile?: string }) => api.get('/refunds/lookup', { params }),
  track: (params: { refundRequestNumber?: string; bookingNumber?: string; mobile?: string }) => api.get('/refunds/track', { params }),
  adminApply: (bookingId: number, reason?: string) => api.post(`/refunds/${bookingId}/admin-apply`, { reason }),
  requestOtp: (bookingId: number, mobile: string) => api.post(`/refunds/${bookingId}/request-otp`, { mobile }),
  applyVerified: (bookingId: number, mobile: string, otp: string) => api.post(`/refunds/${bookingId}/apply-verified`, { mobile, otp }),
  getAll: () => api.get('/refunds'),
  history: (id: number) => api.get(`/refunds/${id}/history`),
  verify: (id: number) => api.put(`/refunds/${id}/verify`),
  review: (id: number, refundAmount: number, recommendation?: string) =>
    api.put(`/refunds/${id}/review`, { refundAmount, recommendation }),
  approve: (id: number, refundAmount: number) => api.put(`/refunds/${id}/approve`, { refundAmount }),
  reject: (id: number, reason: string) => api.put(`/refunds/${id}/reject`, { reason }),
  startProcessing: (id: number) => api.put(`/refunds/${id}/start-processing`),
  process: (id: number, refundTransactionReference?: string) =>
    api.put(`/refunds/${id}/process`, { refundTransactionReference }),
};

export const cancellationAPI = {
  requestOtp: (bookingId: number, mobile: string) => api.post(`/cancellations/${bookingId}/request-otp`, { mobile }),
  applyVerified: (bookingId: number, mobile: string, otp: string, reason: string) =>
    api.post(`/cancellations/${bookingId}/apply-verified`, { mobile, otp, reason }),
};

// ── Venues ────────────────────────────────────────────────────────────────────
export const venueAPI = {
  getAll:       ()              => api.get('/venues'),
  getById:      (id: number)    => api.get(`/venues/${id}`),
  getDetails:   (id: number)    => api.get(`/venues/${id}/details`),
  getEquipment: ()              => api.get('/venues/equipment'),
  // Admin: pricing & status management (replaces premiseAPI/rateAPI)
  getAllForAdmin: ()                          => api.get('/venues/admin/all'),
  updatePricing:  (id: number, data: any)     => api.put(`/venues/pricing/${id}`, data),
  createVenue:    (data: any)                 => api.post('/venues/admin', data),
  updateBookingCapacity: (id: number, session: 'Morning' | 'Afternoon' | 'Evening', capacity: number) =>
    api.put(`/venues/${id}/booking-capacity`, { session, capacity }),
  createPricing:  (venueId: number, data: any) => api.post(`/venues/${venueId}/pricing`, data),
  removeVenue:    (id: number)                => api.delete(`/venues/${id}`),
  removePricing:  (id: number)                => api.delete(`/venues/pricing/${id}`),
  updateStatus:   (id: number, data: any)     => api.put(`/venues/${id}/status`, data),
};

// ── Audit report ──────────────────────────────────────────────────────────────
export const auditAPI = {
  get: (params: any) => api.get('/audit-logs', { params }),
};

// ── Holidays ──────────────────────────────────────────────────────────────────
export const holidayAPI = {
  getAll:  ()              => api.get('/holidays'),
  create:  (data: any)     => api.post('/holidays', data),
  update:  (id: number, data: any) => api.put(`/holidays/${id}`, data),
  delete:  (id: number)    => api.delete(`/holidays/${id}`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentAPI = {
  getByBooking: (bookingId: number) => api.get(`/payments/booking/${bookingId}`),
  verify:       (data: any)         => api.post('/payments/verify', data),
  initiate:     (data: any)         => api.post('/payments/initiate', data),
  complete:     (data: any)         => api.post('/payments/complete', data),
};

// ── Gallery ───────────────────────────────────────────────────────────────────
export const galleryAPI = {
  getAll:  (type?: string) => api.get('/gallery', { params: { type } }),
  create:  (data: any)     => api.post('/gallery', data),
  delete:  (id: number)    => api.delete(`/gallery/${id}`),
};

// ── Notices ───────────────────────────────────────────────────────────────────
export const noticeAPI = {
  getActive: ()              => api.get('/notices/active'),
  getAll:    ()              => api.get('/notices'),
  create:    (data: any)     => api.post('/notices', data),
  update:    (id: number, data: any) => api.put(`/notices/${id}`, data),
  delete:    (id: number)    => api.delete(`/notices/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// ── File Upload ───────────────────────────────────────────────────────────────
export const uploadFile = (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  return api
    .post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((res) => res.data.filePath);
};
