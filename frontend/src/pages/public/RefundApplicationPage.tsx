import React, { useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Divider, Grid,
  Paper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { refundAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

type SearchType = 'number' | 'mobile';

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
  const [searchType, setSearchType] = useState<SearchType>('number');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<RefundBooking[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const selected = results.find((booking) => booking.bookingId === selectedId) || null;

  const handleSearch = async () => {
    if (!search.trim()) {
      setError(searchType === 'number' ? 'Enter an application number.' : 'Enter the registered mobile number.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setError('');
    setResults([]);
    setSelectedId(null);
    try {
      const response = await refundAPI.lookup(searchType === 'number'
        ? { bookingNumber: search.trim() }
        : { mobile: search.trim() });
      const bookings = response.data as RefundBooking[];
      setResults(bookings);
      if (bookings.length === 1) setSelectedId(bookings[0].bookingId);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Unable to find a booking. Check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (booking: RefundBooking) => {
    setApplyingId(booking.bookingId);
    setError('');
    try {
      const response = await refundAPI.apply({ bookingId: booking.bookingId, mobile: booking.contactNumber });
      const created = response.data;
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
      setError(requestError.response?.data?.error || 'The refund request could not be submitted. Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: 'calc(100vh - 72px)', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary.main">Apply Refund</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Find your booking to submit a refund request or check its latest status.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5, mb: 3 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={searchType}
            onChange={(_, value: SearchType | null) => value && setSearchType(value)}
            sx={{ mb: 2 }}
            aria-label="Search using application number or mobile number"
          >
            <ToggleButton value="number">Application Number</ToggleButton>
            <ToggleButton value="mobile">Mobile Number</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              label={searchType === 'number' ? 'Application Number' : 'Registered Mobile Number'}
              placeholder={searchType === 'number' ? 'e.g. HSM-2026-00001' : 'Enter registered mobile number'}
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
              {loading ? 'Searching' : 'Fetch Booking'}
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {searched && !loading && !results.length && !error && (
          <Alert severity="info" sx={{ mb: 2 }}>No booking was found. Check the application number or registered mobile number.</Alert>
        )}

        {results.length > 1 && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Select a booking</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {results.map((booking) => (
                <Button
                  key={booking.bookingId}
                  size="small"
                  variant={selectedId === booking.bookingId ? 'contained' : 'outlined'}
                  onClick={() => setSelectedId(booking.bookingId)}
                >
                  {booking.applicationNumber} · {booking.venue}
                </Button>
              ))}
            </Box>
          </Paper>
        )}

        {selected && (
          <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#eef3f8', display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="overline" color="text.secondary">Application Number</Typography>
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
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default RefundApplicationPage;
