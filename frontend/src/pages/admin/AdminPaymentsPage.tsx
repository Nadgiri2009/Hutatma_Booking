import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Tooltip, CircularProgress,
  Alert, Divider, Pagination,
} from '@mui/material';
import { VerifiedUser, Visibility, Print, Refresh } from '@mui/icons-material';
import { bookingAPI, paymentAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const paymentStatusColor: any = { Pending: 'warning', Paid: 'success', Failed: 'error', Refunded: 'info' };

const AdminPaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings]   = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // There is no separate "approval" step — every booking that isn't yet
      // paid sits as PendingPayment and shows up here for verification.
      const r = await bookingAPI.getAll({ page, pageSize: 15, status: 'PendingPayment' });
      setBookings(r.data.items);
      setTotal(r.data.totalPages);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openVerify = (booking: any) => {
    setSelectedBooking(booking);
    reset({ bookingId: booking.id, transactionRef: '', paymentDate: '', remarks: '' });
    setVerifyOpen(true);
  };

  const printReceipt = (b: any) => navigate(`/admin/receipts?bookingNumber=${encodeURIComponent(b.bookingNumber)}`);

  const onVerifySubmit = async (data: any) => {
    try {
      await paymentAPI.verify({ ...data, bookingId: selectedBooking.id });
      toast.success('Payment verified — booking confirmed automatically.');
      setVerifyOpen(false);
      load();
    } catch { toast.error('Failed to verify payment'); }
  };

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Payment Management</Typography>
          <Typography variant="body2" color="text.secondary">Verify payments — bookings confirm automatically once verified</Typography>
        </Box>
        <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={load}>Refresh</Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Only bookings <strong>awaiting payment</strong> are shown here. After the applicant transfers payment via bank, verify the
        transaction below — the booking is confirmed automatically the moment you verify it. No separate approval step is required.
      </Alert>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Amount Due</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Booking Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              )}
              {!loading && bookings.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: '#94a3b8' }}>No bookings awaiting payment verification</TableCell></TableRow>
              )}
              {bookings.map((b, i) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{(page - 1) * 15 + i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">{b.bookingNumber}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{b.applicantName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.applicantMobile}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{b.venueName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.priceItemName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="success.main">{fmt(b.grandTotal)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="Pending Payment"
                      color="warning"
                      size="small"
                      sx={{ fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(b.createdAt).toLocaleDateString('en-IN')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Verify Payment">
                      <IconButton size="small" color="success" onClick={() => openVerify(b)}>
                        <VerifiedUser fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print Receipt">
                      <IconButton size="small" onClick={() => printReceipt(b)}>
                        <Print fontSize="small" />
                      </IconButton>
                    </Tooltip>
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

      {/* Verify Payment Dialog */}
      <Dialog open={verifyOpen} onClose={() => setVerifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>
          Verify Payment — {selectedBooking?.bookingNumber}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedBooking && (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Grid container spacing={2}>
                  {[
                    ['Applicant',  selectedBooking.applicantName],
                    ['Mobile',     selectedBooking.applicantMobile],
                    ['Venue',      selectedBooking.venueName],
                    ['Amount Due', fmt(selectedBooking.grandTotal)],
                  ].map(([k, v]) => (
                    <Grid item xs={6} key={k}>
                      <Typography variant="caption" color="text.secondary">{k}</Typography>
                      <Typography variant="body2" fontWeight={600}>{v}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
              <Divider sx={{ mb: 2 }} />
              <Alert severity="warning" sx={{ mb: 2 }}>
                Only verify after confirming the bank transaction in your account statement.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Transaction Reference Number *" fullWidth size="small"
                    error={!!errors.transactionRef}
                    helperText={(errors.transactionRef as any)?.message}
                    {...register('transactionRef', { required: 'Transaction reference is required' })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Payment Date *" type="date" fullWidth size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.paymentDate}
                    helperText={(errors.paymentDate as any)?.message}
                    {...register('paymentDate', { required: 'Payment date is required' })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Remarks (optional)" fullWidth size="small"
                    {...register('remarks')}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setVerifyOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<VerifiedUser />}
            onClick={handleSubmit(onVerifySubmit)}>
            Confirm Verified
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPaymentsPage;
