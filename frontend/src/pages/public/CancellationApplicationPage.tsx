import React, { useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Grid, Pagination, Paper, Radio,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import { cancellationAPI, refundAPI } from '../../services/api';
import { toast } from 'react-toastify';

type CancellationBooking = {
  bookingId: number;
  applicationNumber: string;
  applicantName: string;
  contactNumber: string;
  venue: string;
  fromDate: string;
  toDate: string;
  session: string;
  bookingStatus: string;
  paymentStatus: string;
  existingCancellation?: { refundStatus: string; refundAmount: number } | null;
};

const cancellationEligibilityMessage = (booking: CancellationBooking) => {
  if (booking.existingCancellation || booking.bookingStatus === 'Cancelled')
    return 'A cancellation application already exists for this booking.';
  if (booking.bookingStatus !== 'Confirmed')
    return 'Cancellation is available only for confirmed bookings.';
  if (booking.paymentStatus !== 'Paid')
    return 'Cancellation is available only for bookings with a recorded payment.';
  return '';
};

const canApplyCancellation = (booking: CancellationBooking) => !cancellationEligibilityMessage(booking);

const CancellationApplicationPage: React.FC = () => {
  const pageSize = 10;
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState('');
  const [bookings, setBookings] = useState<CancellationBooking[]>([]);
  const [page, setPage] = useState(1);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [otpBookingId, setOtpBookingId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const selectedBooking = bookings.find((booking) => booking.bookingId === selectedBookingId) || null;
  const pageCount = Math.ceil(bookings.length / pageSize);
  const pageBookings = bookings.slice((page - 1) * pageSize, page * pageSize);
  const cancellationIneligible = bookings.filter((booking) =>
    !canApplyCancellation(booking) && !booking.existingCancellation && booking.bookingStatus !== 'Cancelled');
  const cancellationEligibilityMessages = Array.from(new Set(cancellationIneligible.map(cancellationEligibilityMessage)));

  const searchBooking = async () => {
    if (!search.trim()) {
      setError('Enter an Booking ID, booking ID, or registered mobile number.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setError('');
    setBookings([]);
    setPage(1);
    setSelectedBookingId(null);
    setOtpBookingId(null);
    setOtp('');
    setReason('');
    try {
      const value = search.trim();
      const isMobileNumber = /^\+?\d{10,15}$/.test(value);
      const response = await refundAPI.lookup(isMobileNumber
        ? { mobile: value }
        : { bookingNumber: value });
      const found = response.data as CancellationBooking[];
      setBookings(found);
      if (found.length === 1) setSelectedBookingId(found[0].bookingId);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Unable to find a booking. Check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectBooking = (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setOtpBookingId(null);
    setOtp('');
    setError('');
  };

  const requestCancellationOtp = async () => {
    if (!selectedBooking || !canApplyCancellation(selectedBooking) || !reason.trim()) {
      setError('Only confirmed bookings with a recorded payment can be cancelled. Provide a cancellation reason.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await cancellationAPI.requestOtp(selectedBooking.bookingId, selectedBooking.contactNumber);
      setOtpBookingId(selectedBooking.bookingId);
      setOtp('');
      toast.info(response.data.message || 'Verification code requested. For local testing, check the backend terminal.');
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'The verification code could not be sent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCancellation = async () => {
    if (!selectedBooking || !canApplyCancellation(selectedBooking)) {
      setError('Only confirmed bookings with a recorded payment can be cancelled.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit verification code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await cancellationAPI.applyVerified(
        selectedBooking.bookingId,
        selectedBooking.contactNumber,
        otp,
        reason.trim(),
      );
      setBookings((current) => current.map((booking) => booking.bookingId === selectedBooking.bookingId
        ? {
            ...booking,
            bookingStatus: 'Cancelled',
            existingCancellation: {
              refundStatus: response.data.refundStatus || 'Pending',
              refundAmount: response.data.refundAmount || 0,
            },
          }
        : booking));
      setOtpBookingId(null);
      setOtp('');
      setReason('');
      const refundAmount = Number(response.data.refundAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      toast.success(`Cancellation submitted. Policy refund amount: ₹${refundAmount}. Processing remains subject to staff review.`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'The cancellation application could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#fbf6fa', minHeight: 'calc(100vh - 72px)', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary.main">Apply for Cancellation</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Find your booking and submit a cancellation reason.
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 2 }}>
          Submitting marks the booking as cancelled immediately. Any refund is processed separately by staff.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              size="small"
              label="Booking ID, Booking ID, or Registered Mobile Number"
              placeholder="e.g. HSM-2026-00001 or 9876543210"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && searchBooking()}
              sx={{ flex: '1 1 280px' }}
            />
            <Button
              variant="contained"
              onClick={searchBooking}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Searching' : 'Fetch Booking'}
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {searched && !loading && !bookings.length && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>No booking was found. Check the Booking ID, booking ID, or registered mobile number.</Alert>
        )}
        {cancellationIneligible.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {cancellationIneligible.length} {cancellationIneligible.length === 1 ? 'booking is' : 'bookings are'} not eligible for cancellation. {cancellationEligibilityMessages.join(' ')}
          </Alert>
        )}

        {bookings.length > 0 && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1.5,
              width: 'min(1280px, calc(100vw - 32px))',
              position: 'relative',
              left: '50%',
              transform: 'translateX(-50%)',
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Select a booking</Typography>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
            <TableContainer sx={{ overflowX: 'hidden' }}>
              <Table
                size="small"
                aria-label="Cancellation bookings"
                sx={{
                  width: '100%',
                  tableLayout: 'fixed',
                  '& th, & td': { px: 0.5, py: 1, fontSize: '0.75rem', lineHeight: 1.3, whiteSpace: 'normal', overflowWrap: 'anywhere' },
                  '& th:nth-of-type(1), & td:nth-of-type(1)': { width: '5%' },
                  '& th:nth-of-type(2), & td:nth-of-type(2)': { width: '4%', px: 0, textAlign: 'center' },
                  '& th:nth-of-type(3), & td:nth-of-type(3)': { width: '6%' },
                  '& th:nth-of-type(4), & td:nth-of-type(4)': { width: '13%' },
                  '& th:nth-of-type(5), & td:nth-of-type(5)': { width: '13%' },
                  '& th:nth-of-type(6), & td:nth-of-type(6)': { width: '14%' },
                  '& th:nth-of-type(7), & td:nth-of-type(7)': { width: '10%' },
                  '& th:nth-of-type(8), & td:nth-of-type(8)': { width: '13%' },
                  '& th:nth-of-type(9), & td:nth-of-type(9)': { width: '7%' },
                  '& th:nth-of-type(10), & td:nth-of-type(10)': { width: '7%' },
                  '& th:nth-of-type(11), & td:nth-of-type(11)': { width: '8%' },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>S.No.</TableCell>
                    <TableCell padding="checkbox" />
                    <TableCell>Booking ID</TableCell>
                    <TableCell>Application No.</TableCell>
                    <TableCell>Hall / Venue</TableCell>
                    <TableCell>Citizen Name</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Booking Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Eligibility</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageBookings.map((booking, index) => {
                    const eligible = canApplyCancellation(booking);
                    return (
                      <TableRow key={booking.bookingId} selected={selectedBookingId === booking.bookingId}>
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell padding="checkbox">
                          <Radio
                            checked={selectedBookingId === booking.bookingId}
                            onChange={() => selectBooking(booking.bookingId)}
                            inputProps={{ 'aria-label': `Select ${booking.applicationNumber}` }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{booking.bookingId}</TableCell>
                        <TableCell>{booking.applicationNumber}</TableCell>
                        <TableCell>{booking.venue}</TableCell>
                        <TableCell>{booking.applicantName}</TableCell>
                        <TableCell>{booking.contactNumber}</TableCell>
                        <TableCell>{booking.fromDate === booking.toDate ? booking.fromDate : `${booking.fromDate} - ${booking.toDate}`}</TableCell>
                        <TableCell>{booking.bookingStatus.replace(/([a-z])([A-Z])/g, '$1 $2')}</TableCell>
                        <TableCell>{booking.paymentStatus}</TableCell>
                        <TableCell>{eligible ? 'Eligible' : booking.existingCancellation ? 'Already applied' : 'Not eligible'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            </Box>
            <Box component="ol" sx={{ display: { xs: 'block', lg: 'none' }, m: 0, p: 0, listStyle: 'none' }}>
              {pageBookings.map((booking, index) => (
                <Box
                  component="li"
                  key={booking.bookingId}
                  sx={{ py: 1.25, borderBottom: index < pageBookings.length - 1 ? '1px solid #e7ebf0' : 'none' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">{(page - 1) * pageSize + index + 1}.</Typography>
                    <Radio
                      checked={selectedBookingId === booking.bookingId}
                      onChange={() => setSelectedBookingId(booking.bookingId)}
                      inputProps={{ 'aria-label': `Select ${booking.applicationNumber}` }}
                      size="small"
                    />
                    <Typography variant="body2" fontWeight={700}>
                      {booking.applicationNumber} · {booking.venue}
                    </Typography>
                  </Box>
                  <Box sx={{ pl: 5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    <Typography variant="caption">Booking ID: {booking.bookingId} · Citizen: {booking.applicantName}</Typography>
                    <Typography variant="caption">Mobile: {booking.contactNumber} · Date: {booking.fromDate === booking.toDate ? booking.fromDate : `${booking.fromDate} - ${booking.toDate}`}</Typography>
                    <Typography variant="caption">Status: {booking.bookingStatus.replace(/([a-z])([A-Z])/g, '$1 $2')} · Payment: {booking.paymentStatus}</Typography>
                    <Typography variant="caption">Cancellation: {canApplyCancellation(booking) ? 'Eligible' : booking.existingCancellation ? 'Already applied' : 'Not eligible'}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            {pageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} size="small" />
              </Box>
            )}
          </Paper>
        )}

        {selectedBooking && (
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Booking ID</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">{selectedBooking.applicationNumber}</Typography>
              </Box>
              <Chip label={selectedBooking.bookingStatus} color={selectedBooking.bookingStatus === 'Cancelled' ? 'default' : 'success'} />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Applicant</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedBooking.applicantName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Venue</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedBooking.venue}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Booking Dates</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedBooking.fromDate === selectedBooking.toDate ? selectedBooking.fromDate : `${selectedBooking.fromDate} to ${selectedBooking.toDate}`}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Session</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedBooking.session === 'FullDay' ? 'Full Day' : selectedBooking.session}</Typography>
              </Grid>
            </Grid>

            {selectedBooking.existingCancellation || selectedBooking.bookingStatus === 'Cancelled' ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                This booking already has a cancellation. Refund status: {selectedBooking.existingCancellation?.refundStatus || 'Pending'}.
              </Alert>
            ) : !canApplyCancellation(selectedBooking) ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {cancellationEligibilityMessage(selectedBooking)} Current booking status: {selectedBooking.bookingStatus}; payment status: {selectedBooking.paymentStatus}.
              </Alert>
            ) : otpBookingId === selectedBooking.bookingId ? (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start', mt: 2 }}>
                <TextField
                  size="small"
                  label="Six-digit verification code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
                  helperText={`Local testing: find the code in the backend terminal. Otherwise, check the registered mobile ending ${selectedBooking.contactNumber.slice(-4)}.`}
                  sx={{ flex: '1 1 230px' }}
                />
                <Button variant="contained" color="error" onClick={submitCancellation} disabled={submitting || !/^\d{6}$/.test(otp)}>
                  {submitting ? <CircularProgress size={18} color="inherit" /> : 'Verify & Submit'}
                </Button>
                <Button variant="text" onClick={() => { setOtpBookingId(null); setOtp(''); setError(''); }} disabled={submitting}>
                  Cancel
                </Button>
              </Box>
            ) : (
              <>
                <TextField
                  label="Cancellation Reason *"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  inputProps={{ maxLength: 500 }}
                  fullWidth
                  multiline
                  minRows={3}
                  sx={{ mt: 2 }}
                />
                <Button
                  variant="contained"
                  color="error"
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CancelOutlined />}
                  onClick={requestCancellationOtp}
                  disabled={submitting || !reason.trim()}
                  sx={{ mt: 2 }}
                >
                  {submitting ? 'Sending Code...' : 'Request Verification Code'}
                </Button>
              </>
            )}
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default CancellationApplicationPage;