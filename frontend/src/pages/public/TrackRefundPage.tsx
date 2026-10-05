import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Grid, Paper,
  Step, StepLabel, Stepper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { refundAPI } from '../../services/api';

type SearchType = 'refund' | 'booking';
type TrackedRefund = {
  refundRequestNumber: string;
  applicationNumber: string;
  applicantName: string;
  mobile: string;
  venue: string;
  fromDate: string;
  toDate: string;
  session: string;
  bookingAmount: number;
  refundAmount?: number | null;
  requestedAt: string;
  lastUpdatedAt: string;
  status: string;
  rejectionReason?: string | null;
};

const stages = ['Requested', 'Under Verification', 'Approved', 'Processing', 'Processed'];
const stageLabels = ['Refund Requested', 'Under Verification', 'Approved', 'Processing', 'Refund Processed'];
const money = (amount?: number | null) => amount == null ? 'Pending review' : `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : '—';
const bookingDate = (refund: TrackedRefund) => refund.fromDate === refund.toDate ? refund.fromDate : `${refund.fromDate} to ${refund.toDate}`;

const TrackRefundPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<SearchType>('refund');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<TrackedRefund[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const type = searchParams.get('type') as SearchType | null;
    const value = searchParams.get('value');
    if (value && type && ['refund', 'application', 'mobile'].includes(type)) {
      setSearchType(type === 'refund' ? 'refund' : 'booking');
      setSearch(value);
    }
  }, [searchParams]);

  const track = async () => {
    if (!search.trim()) {
      setError('Enter a refund request number, application number, or registered mobile number.');
      return;
    }
    setLoading(true);
    setSearched(true);
    setError('');
    setResults([]);
    const value = search.trim();
    const isMobileNumber = /^\+?\d{10,15}$/.test(value);
    const params = searchType === 'refund'
      ? { refundRequestNumber: value }
      : isMobileNumber
        ? { mobile: value }
        : { bookingNumber: value };
    try {
      const response = await refundAPI.track(params);
      setResults(response.data || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Refund status could not be found. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#fbf6fa', minHeight: 'calc(100vh - 72px)', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="md">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary.main">Track Refund</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Check the latest status of a submitted refund request.</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 1.5, mb: 3 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={searchType}
            onChange={(_, value: SearchType | null) => value && setSearchType(value)}
            sx={{ mb: 2, display: 'flex', flexWrap: 'wrap' }}
            aria-label="Track by refund request number, application number, or mobile number"
          >
            <ToggleButton value="refund">Refund Request Number</ToggleButton>
            <ToggleButton value="booking">Application Number or Mobile Number</ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              fullWidth
              size="small"
              label={searchType === 'refund' ? 'Refund Request Number' : 'Application Number or Registered Mobile Number'}
              placeholder={searchType === 'refund' ? 'Enter refund request number' : 'e.g. HSM-2026-00001 or 9876543210'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && track()}
              sx={{ flex: '1 1 280px' }}
            />
            <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />} onClick={track} disabled={loading} sx={{ minWidth: 145 }}>
              {loading ? 'Searching' : 'Track Status'}
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {searched && !loading && !error && results.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>No matching refund request was found. Confirm the value you entered or try the registered mobile number.</Alert>
        )}

        {results.map((refund) => {
          const activeStep = stages.indexOf(refund.status);
          const isRejected = refund.status === 'Rejected';
          return (
            <Paper key={refund.refundRequestNumber} variant="outlined" sx={{ mb: 2, borderRadius: 1.5, overflow: 'hidden' }}>
              <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#eef3f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Refund Request Number</Typography>
                  <Typography variant="h6" fontWeight={800} color="primary.main">{refund.refundRequestNumber}</Typography>
                </Box>
                <Chip label={isRejected ? 'Refund Rejected' : refund.status === 'Processed' ? 'Refund Processed' : refund.status} color={isRejected ? 'error' : refund.status === 'Processed' ? 'success' : 'info'} />
              </Box>
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Application Number</Typography><Typography variant="body2" fontWeight={600}>{refund.applicationNumber}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Applicant</Typography><Typography variant="body2" fontWeight={600}>{refund.applicantName}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Mobile Number</Typography><Typography variant="body2" fontWeight={600}>{refund.mobile || '—'}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Venue / Booking Date</Typography><Typography variant="body2" fontWeight={600}>{refund.venue} · {bookingDate(refund)}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Booking Slot</Typography><Typography variant="body2" fontWeight={600}>{refund.session}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Refund Amount</Typography><Typography variant="body2" fontWeight={600}>{money(refund.refundAmount)}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Refund Request Date</Typography><Typography variant="body2" fontWeight={600}>{dateTime(refund.requestedAt)}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Last Updated</Typography><Typography variant="body2" fontWeight={600}>{dateTime(refund.lastUpdatedAt)}</Typography></Grid>
                </Grid>

                {isRejected ? (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    <strong>Refund Rejected</strong>{refund.rejectionReason ? `: ${refund.rejectionReason}` : '.'}
                  </Alert>
                ) : (
                  <Stepper activeStep={Math.max(0, activeStep)} orientation="vertical" sx={{ mt: 3 }}>
                    {stageLabels.map((label, index) => (
                      <Step key={label} completed={activeStep > index}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                )}
              </Box>
            </Paper>
          );
        })}
      </Container>
    </Box>
  );
};

export default TrackRefundPage;
