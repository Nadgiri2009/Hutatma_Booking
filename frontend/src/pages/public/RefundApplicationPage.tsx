import React, { useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Container, Divider, Grid,
  Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { refundAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

type RefundBooking = {
  bookingId: number;
  applicationNumber: string;
  applicantName: string;
  contactNumber: string;
  venue: string;
  fromDate: string;
  toDate: string;
  session: string;
  bookingAmount: number;
  depositAmount: number;
  bookingStatus: string;
  paymentStatus: string;
  payments: Array<{
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    gatewayPaymentId?: string;
    paymentDate?: string;
    status: string;
  }>;
  eligibleForRefund: boolean;
  eligibilityMessage?: string;
  refundRequest?: {
    refundRequestNumber: string;
    status: string;
    refundAmount?: number;
    requestedAt: string;
    rejectionReason?: string;
  } | null;
  existingCancellation?: {
    refundStatus: string;
    refundAmount: number;
  } | null;
};

type RefundBankDetails = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  micrCode?: string | null;
};

const currency = (amount?: number | null) => amount == null
  ? 'To be determined'
  : `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ py: 1, borderBottom: '1px solid #e7ebf0' }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
  </Box>
);

const RefundApplicationPage: React.FC = () => {
  const pageSize = 10;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<RefundBooking[]>([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [otpBookingId, setOtpBookingId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');
  const [verifiedBankDetails, setVerifiedBankDetails] = useState<{ bookingId: number; details: RefundBankDetails } | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const selected = selectedIds.includes(selectedId ?? -1)
    ? results.find((booking) => booking.bookingId === selectedId) || null
    : null;
  const pageCount = Math.ceil(results.length / pageSize);
  const pageResults = results.slice((page - 1) * pageSize, page * pageSize);
  const refundIneligible = results.filter((booking) =>
    !booking.eligibleForRefund && !booking.refundRequest && !booking.existingCancellation);
  const refundEligibilityMessages = Array.from(new Set(refundIneligible.map((booking) =>
    booking.eligibilityMessage || 'This application is not eligible for a refund.')));

  const handleSearch = async () => {
    if (!search.trim()) {
      setError('Enter an Booking ID or registered mobile number.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setError('');
    setResults([]);
    setPage(1);
    setSelectedId(null);
    setSelectedIds([]);
    setOtpBookingId(null);
    setOtp('');
    setVerifiedBankDetails(null);
    try {
      const value = search.trim();
      const isMobileNumber = /^\+?\d{10,15}$/.test(value);
      const response = await refundAPI.lookup(isMobileNumber
        ? { mobile: value }
        : { bookingNumber: value });
      const bookings = response.data as RefundBooking[];
      setResults(bookings);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Unable to find a booking. Check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBookingSelection = (bookingId: number) => {
    const isSelected = selectedIds.includes(bookingId);
    const nextSelectedIds = isSelected
      ? selectedIds.filter((id) => id !== bookingId)
      : [...selectedIds, bookingId];
    setSelectedIds(nextSelectedIds);
    setSelectedId(isSelected
      ? (selectedId === bookingId ? nextSelectedIds[nextSelectedIds.length - 1] ?? null : selectedId)
      : bookingId);
    setOtpBookingId(null);
    setOtp('');
    setVerifiedBankDetails(null);
    setError('');
  };

  const handleApply = async (booking: RefundBooking) => {
    setApplyingId(booking.bookingId);
    setError('');
    try {
      const response = await refundAPI.requestOtp(booking.bookingId, booking.contactNumber);
      setOtpBookingId(booking.bookingId);
      setOtp('');
      toast.info(response.data.message || 'Verification code requested. For local testing, check the backend terminal.');
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'The verification code could not be sent. Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  const handleVerifyAndApply = async (booking: RefundBooking) => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit verification code.');
      return;
    }
    setApplyingId(booking.bookingId);
    setError('');
    try {
      const response = await refundAPI.applyVerified(booking.bookingId, booking.contactNumber, otp);
      const created = response.data;
      setVerifiedBankDetails(created.bankDetails ? { bookingId: booking.bookingId, details: created.bankDetails } : null);
      setOtpBookingId(null);
      setOtp('');
      setResults((current) => current.map((item) => item.bookingId === booking.bookingId
        ? {
            ...item,
            eligibleForRefund: false,
            eligibilityMessage: 'Your refund request has been submitted.',
            refundRequest: {
              refundRequestNumber: created.refundRequestNumber,
              status: created.status,
              requestedAt: created.requestedAt,
            },
          }
        : item));
      toast.success(`Refund request ${created.refundRequestNumber} submitted for ${created.bookingNumber}.`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'The verification code is invalid or expired. Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Box sx={{ bgcolor: '#fbf6fa', minHeight: 'calc(100vh - 72px)', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary.main">Apply Refund</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Find your booking to submit a refund request or check its latest status.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              label="Booking ID or Registered Mobile Number"
              placeholder="e.g. HSM-2026-00001 or 9876543210"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              size="small"
              sx={{ flex: '1 1 280px' }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ minWidth: 150 }}
            >
              {loading ? 'Searching' : 'Fetch Applications'}
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {searched && !loading && !results.length && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>No application was found. Check the Booking ID or registered mobile number.</Alert>
        )}
        {refundIneligible.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {refundIneligible.length} {refundIneligible.length === 1 ? 'application is' : 'applications are'} not eligible for refund. {refundEligibilityMessages.join(' ')}
          </Alert>
        )}

        {results.length > 0 && (
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
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Applications</Typography>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <TableContainer sx={{ overflowX: 'hidden' }}>
              <Table
                size="small"
                aria-label="Refund applications"
                sx={{
                  width: '100%',
                  tableLayout: 'fixed',
                  '& th, & td': {
                    px: 0.5,
                    py: 0.75,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                  },
                  '& th:nth-of-type(1), & td:nth-of-type(1)': { width: 44 },
                  '& th:nth-of-type(2), & td:nth-of-type(2)': { width: 40, px: 0, textAlign: 'center' },
                  '& th:nth-of-type(3), & td:nth-of-type(3)': { width: 58 },
                  '& th:nth-of-type(4), & td:nth-of-type(4)': { width: 105 },
                  '& th:nth-of-type(5), & td:nth-of-type(5)': { width: 120 },
                  '& th:nth-of-type(6), & td:nth-of-type(6)': { width: 95 },
                  '& th:nth-of-type(7), & td:nth-of-type(7)': { width: 90 },
                  '& th:nth-of-type(8), & td:nth-of-type(8)': { width: 105 },
                  '& th:nth-of-type(9), & td:nth-of-type(9)': { width: 80 },
                  '& th:nth-of-type(10), & td:nth-of-type(10)': { width: 65 },
                  '& th:nth-of-type(11), & td:nth-of-type(11)': { width: 100 },
                  '& th:nth-of-type(12), & td:nth-of-type(12)': { width: 82 },
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
                    <TableCell>Mobile Number</TableCell>
                    <TableCell>Booking Date</TableCell>
                    <TableCell>Booking Status</TableCell>
                    <TableCell>Payment Status</TableCell>
                    <TableCell>Refund Status</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageResults.map((booking, index) => {
                    const isSelected = selectedIds.includes(booking.bookingId);
                    const refundStatus = booking.refundRequest
                      ? 'Refund Applied'
                      : booking.existingCancellation
                        ? 'Cancellation Refund'
                        : booking.eligibleForRefund
                          ? 'Eligible'
                          : 'Not eligible';
                    return (
                      <TableRow
                        key={booking.bookingId}
                        selected={selectedId === booking.bookingId && isSelected}
                      >
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleBookingSelection(booking.bookingId)}
                            inputProps={{ 'aria-label': `Select ${booking.applicationNumber} for refund` }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{booking.bookingId}</TableCell>
                        <TableCell>{booking.applicationNumber}</TableCell>
                        <TableCell>{booking.venue}</TableCell>
                        <TableCell>{booking.applicantName}</TableCell>
                        <TableCell>{booking.contactNumber}</TableCell>
                        <TableCell>
                          {booking.fromDate === booking.toDate ? booking.fromDate : `${booking.fromDate} - ${booking.toDate}`}
                        </TableCell>
                        <TableCell>{booking.bookingStatus.replace(/([a-z])([A-Z])/g, '$1 $2')}</TableCell>
                        <TableCell>{booking.paymentStatus}</TableCell>
                        <TableCell title={booking.refundRequest ? `Refund status: ${booking.refundRequest.status}` : booking.existingCancellation ? `Refund status: ${booking.existingCancellation.refundStatus}` : booking.eligibilityMessage || undefined}>{refundStatus}</TableCell>
                        <TableCell>
                          {booking.eligibleForRefund ? (
                            <Button
                              size="small"
                              onClick={() => handleApply(booking)}
                              disabled={!isSelected || applyingId === booking.bookingId}
                            >
                              {applyingId === booking.bookingId ? <CircularProgress size={16} /> : 'Apply'}
                            </Button>
                          ) : booking.refundRequest ? 'Already applied' : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </TableContainer>
            </Box>
            <Box component="ol" sx={{ display: { xs: 'block', lg: 'none' }, m: 0, p: 0, listStyle: 'none' }}>
              {pageResults.map((booking, index) => {
                const isSelected = selectedIds.includes(booking.bookingId);
                const refundStatus = booking.refundRequest
                  ? 'Refund Applied'
                  : booking.existingCancellation
                    ? 'Cancellation Refund'
                    : booking.eligibleForRefund
                      ? 'Eligible'
                      : 'Not eligible';
                return (
                  <Box
                    component="li"
                    key={booking.bookingId}
                    sx={{ py: 1.25, borderBottom: index < pageResults.length - 1 ? '1px solid #e7ebf0' : 'none' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">{(page - 1) * pageSize + index + 1}.</Typography>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleBookingSelection(booking.bookingId)}
                        inputProps={{ 'aria-label': `Select ${booking.applicationNumber} for refund` }}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={700}>
                        {booking.applicationNumber} · {booking.venue}
                      </Typography>
                    </Box>
                    <Box sx={{ pl: 5, display: 'grid', gap: 0.75 }}>
                      <Typography variant="caption">Booking ID: {booking.bookingId} · Citizen: {booking.applicantName}</Typography>
                      <Typography variant="caption">Mobile: {booking.contactNumber} · Booking date: {booking.fromDate === booking.toDate ? booking.fromDate : `${booking.fromDate} - ${booking.toDate}`}</Typography>
                      <Typography variant="caption">Booking: {booking.bookingStatus.replace(/([a-z])([A-Z])/g, '$1 $2')} · Payment: {booking.paymentStatus}</Typography>
                      <Typography variant="caption" title={booking.refundRequest ? `Refund status: ${booking.refundRequest.status}` : booking.existingCancellation ? `Refund status: ${booking.existingCancellation.refundStatus}` : booking.eligibilityMessage || undefined}>Refund: {refundStatus}</Typography>
                      {booking.eligibleForRefund && (
                        <Button
                          size="small"
                          onClick={() => handleApply(booking)}
                          disabled={!isSelected || applyingId === booking.bookingId}
                          sx={{ alignSelf: 'flex-start', ml: -1 }}
                        >
                          {applyingId === booking.bookingId ? <CircularProgress size={16} /> : 'Apply for Refund'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {pageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                <Pagination count={pageCount} page={page} onChange={(_, value) => setPage(value)} size="small" />
              </Box>
            )}
          </Paper>
        )}

        {selected && (
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#eef3f8', display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Booking ID</Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">{selected.applicationNumber}</Typography>
              </Box>
              <Chip label={selected.refundRequest?.status || selected.bookingStatus} color={selected.refundRequest ? 'info' : selected.bookingStatus === 'Confirmed' ? 'success' : 'default'} />
            </Box>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}><Detail label="Applicant Name" value={selected.applicantName} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Contact Number" value={selected.contactNumber} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Venue / Hall" value={selected.venue} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Booking Date" value={selected.fromDate === selected.toDate ? selected.fromDate : `${selected.fromDate} to ${selected.toDate}`} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Booking Slot" value={selected.session === 'FullDay' ? 'Full Day' : selected.session} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Booking Status" value={selected.bookingStatus} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Booking Amount" value={currency(selected.bookingAmount)} /></Grid>
                <Grid item xs={12} sm={6}><Detail label="Security Deposit" value={currency(selected.depositAmount)} /></Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">Payment Details</Typography>
              {selected.payments.length ? selected.payments.map((payment, index) => (
                <Box key={`${payment.transactionRef || payment.gatewayPaymentId || 'payment'}-${index}`} sx={{ mt: 1, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1 }}>
                  <Typography variant="body2">{payment.paymentMethod} · {currency(payment.amount)} · {payment.status}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reference: {payment.transactionRef || payment.gatewayPaymentId || 'Not available'}
                    {payment.paymentDate ? ` · ${payment.paymentDate}` : ''}
                  </Typography>
                </Box>
              )) : <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No payment is recorded.</Typography>}

              {selected.refundRequest ? (
                <Alert severity={selected.refundRequest.status === 'Rejected' ? 'error' : 'info'} sx={{ mt: 2 }}>
                  Refund request <strong>{selected.refundRequest.refundRequestNumber}</strong> is <strong>{selected.refundRequest.status}</strong>.
                  {selected.refundRequest.refundAmount != null && ` Refund amount: ${currency(selected.refundRequest.refundAmount)}.`}
                  {selected.refundRequest.rejectionReason && ` Reason: ${selected.refundRequest.rejectionReason}`}
                </Alert>
              ) : selected.existingCancellation ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This booking is managed by the existing cancellation refund process. Current status: {selected.existingCancellation.refundStatus}.
                </Alert>
              ) : selected.eligibleForRefund ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  This paid, confirmed booking can be submitted for staff review. The refund amount will be determined during administrative verification.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mt: 2 }}>{selected.eligibilityMessage}</Alert>
              )}

              {verifiedBankDetails?.bookingId === selected.bookingId && (
                <Paper variant="outlined" sx={{ mt: 2, p: 2, borderRadius: 1.5, bgcolor: '#f8fafc' }}>
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                    Bank Details for Refund
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}><Detail label="Account Holder" value={verifiedBankDetails.details.accountHolderName} /></Grid>
                    <Grid item xs={12} sm={6}><Detail label="Bank Name" value={verifiedBankDetails.details.bankName} /></Grid>
                    <Grid item xs={12} sm={6}><Detail label="Account Number" value={verifiedBankDetails.details.accountNumber} /></Grid>
                    <Grid item xs={12} sm={6}><Detail label="IFSC Code" value={verifiedBankDetails.details.ifscCode} /></Grid>
                    <Grid item xs={12} sm={6}><Detail label="Branch" value={verifiedBankDetails.details.branchName} /></Grid>
                    {verifiedBankDetails.details.micrCode && <Grid item xs={12} sm={6}><Detail label="MICR Code" value={verifiedBankDetails.details.micrCode} /></Grid>}
                  </Grid>
                </Paper>
              )}

              {otpBookingId === selected.bookingId ? (
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-start', mt: 2 }}>
                  <TextField
                    size="small"
                    label="Six-digit verification code"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
                    helperText={`Local testing: find the code in the backend terminal. Otherwise, check the registered mobile ending ${selected.contactNumber.slice(-4)}.`}
                    sx={{ flex: '1 1 230px' }}
                  />
                  <Button variant="contained" onClick={() => handleVerifyAndApply(selected)} disabled={applyingId === selected.bookingId || !/^[0-9]{6}$/.test(otp)}>
                    {applyingId === selected.bookingId ? <CircularProgress size={18} color="inherit" /> : 'Verify & Apply'}
                  </Button>
                  <Button variant="text" onClick={() => { setOtpBookingId(null); setOtp(''); setError(''); }} disabled={applyingId === selected.bookingId}>
                    Cancel
                  </Button>
                </Box>
              ) : (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mt: 2 }}>
                {selected.refundRequest && (
                  <Button
                    component={Link}
                    to={`/track-refund?type=refund&value=${encodeURIComponent(selected.refundRequest.refundRequestNumber)}`}
                    variant="outlined"
                  >
                    Track Refund
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<AssignmentReturnIcon />}
                  disabled={!selected.eligibleForRefund || applyingId === selected.bookingId}
                  onClick={() => handleApply(selected)}
                >
                  {applyingId === selected.bookingId ? <CircularProgress size={18} color="inherit" /> : 'Apply for Refund'}
                </Button>
              </Box>
              )}
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default RefundApplicationPage;
