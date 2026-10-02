import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider, Pagination, InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Visibility, Print, Search, FilterAlt,
  Close, Refresh,
} from '@mui/icons-material';
import { bookingAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const statusColors: any = {
  PendingPayment: 'warning',
  Confirmed:      'success',
  Cancelled:      'default',
};

const sessionLabel = (s: string) => (s === 'FullDay' ? 'Full Day' : s);

const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await bookingAPI.getAll({
        page,
        pageSize: 15,
        bookingNumber: search || undefined,
        status:        statusFilter || undefined,
      });
      setBookings(r.data.items);
      setTotal(r.data.totalPages);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (b: any) => { setSelected(b); setDialogOpen(true); };
  const printReceipt = (b: any) => navigate(`/admin/receipts?bookingNumber=${encodeURIComponent(b.bookingNumber)}`);

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Bookings</Typography>
          <Typography variant="body2" color="text.secondary">Manage all venue booking requests</Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">Refresh</Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              size="small" fullWidth placeholder="Search by Booking ID, Mobile, Name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="PendingPayment">Payment Pending</MenuItem>
                <MenuItem value="Confirmed">Confirmed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="outlined" startIcon={<FilterAlt />} onClick={load}>
              Filter
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Sr.</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Venue / Price Item</TableCell>
                <TableCell>Session</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                    No bookings found
                  </TableCell>
                </TableRow>
              )}
              {bookings.map((b, i) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {(page - 1) * 15 + i + 1}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{b.bookingNumber}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{b.applicantName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.applicantMobile}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{b.venueName}</Typography>
                    <Chip label={b.priceItemName} size="small" sx={{ fontSize: '0.68rem', height: 18 }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={sessionLabel(b.session)} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(b.fromDate).toLocaleDateString('en-IN')}
                      {' – '}
                      {new Date(b.toDate).toLocaleDateString('en-IN')}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.secondary">{b.totalDays} day(s)</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{fmt(b.grandTotal)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={b.status} color={statusColors[b.status]} size="small" sx={{ fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(b.createdAt).toLocaleDateString('en-IN')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info" onClick={() => openDetail(b)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print Receipt">
                        <IconButton size="small" onClick={() => printReceipt(b)}>
                          <Print fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {total > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination count={total} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}
      </Paper>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Booking Details — {selected?.bookingNumber}</span>
          <IconButton onClick={() => setDialogOpen(false)} size="small" sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          {selected && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>Booking Info</Typography>
                {[
                  ['Booking ID',  selected.bookingNumber],
                  ['Venue',       selected.venueName],
                  ['Price Item',  selected.priceItemName],
                  ['From Date',   new Date(selected.fromDate).toLocaleDateString('en-IN')],
                  ['To Date',     new Date(selected.toDate).toLocaleDateString('en-IN')],
                  ['Session',     sessionLabel(selected.session)],
                  ['Total Days',  `${selected.totalDays} day(s)`],
                  ['Status',      selected.status],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f0f0f0' }}>
                    <Typography variant="body2" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{v}</Typography>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>Cost Breakdown</Typography>
                {[
                  ['Base Rent',        fmt(selected.baseRent)],
                  ['Holiday Charges',  fmt(selected.holidayCharge)],
                  ['Equipment Charges', fmt(selected.equipmentCharge)],
                  ['Security Deposit', fmt(selected.securityDeposit)],
                  ['CGST',             fmt(selected.cgstAmount)],
                  ['SGST',             fmt(selected.sgstAmount)],
                  ['Grand Total',      fmt(selected.grandTotal)],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid #f0f0f0' }}>
                    <Typography variant="body2" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{v}</Typography>
                  </Box>
                ))}
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>Applicant Details</Typography>
                <Grid container spacing={2}>
                  {[
                    ['Name',   selected.applicantName],
                    ['Email',  selected.applicantEmail],
                    ['Mobile', selected.applicantMobile],
                  ].map(([k, v]) => (
                    <Grid item xs={12} md={4} key={k}>
                      <Typography variant="caption" color="text.secondary">{k}</Typography>
                      <Typography variant="body2" fontWeight={600}>{v}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', gap: 1 }}>
          <Button startIcon={<Print />} variant="outlined" onClick={() => selected && printReceipt(selected)}>Print Receipt</Button>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBookingsPage;
