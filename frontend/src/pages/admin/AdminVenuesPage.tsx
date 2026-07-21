import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Tooltip, CircularProgress,
  Chip, Alert,
} from '@mui/material';
import { Edit, CheckCircle, Block } from '@mui/icons-material';
import { venueAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

const AdminVenuesPage: React.FC = () => {
  const [venues, setVenues]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selVenueId, setSelVenueId] = useState<number | ''>('');
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = () => {
    setLoading(true);
    venueAPI.getAllForAdmin()
      .then((r) => {
        setVenues(r.data);
        if (r.data[0] && !selVenueId) setSelVenueId(r.data[0].venueId);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectedVenue = venues.find((v) => v.venueId === selVenueId);

  const openForm = (item: any) => {
    setEditing(item);
    reset({
      amount: item.amount,
      refundableDeposit: item.refundableDeposit,
      holidaySurchargeAmount: item.holidaySurchargeAmount,
      cgstPercent: item.cgstPercent,
      sgstPercent: item.sgstPercent,
    });
    setOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        amount: Number(data.amount || 0),
        refundableDeposit: Number(data.refundableDeposit || 0),
        holidaySurchargeAmount: Number(data.holidaySurchargeAmount || 0),
        cgstPercent: Number(data.cgstPercent || 0),
        sgstPercent: Number(data.sgstPercent || 0),
        isActive: true,
      };
      await venueAPI.updatePricing(editing.id, payload);
      toast.success('Pricing updated!');
      setOpen(false);
      load();
    } catch { toast.error('Update failed'); }
  };

  const toggleVenueStatus = async (venue: any) => {
    const newStatus = venue.status === 'Active' ? 'Closed' : 'Active';
    if (!window.confirm(`Mark "${venue.venueName}" as ${newStatus}?`)) return;
    try {
      await venueAPI.updateStatus(venue.venueId, { status: newStatus });
      toast.success(`Venue marked ${newStatus}.`);
      load();
    } catch { toast.error('Status update failed'); }
  };

  const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main">Venues & Pricing</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage venue availability and per-use-case rates (sourced from the official rate chart)
        </Typography>
      </Box>

      {/* Venue selector */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>Venue:</Typography>
          {venues.map((v) => (
            <Chip
              key={v.venueId}
              label={`${v.venueName}${v.status !== 'Active' ? ` (${v.status})` : ''}`}
              color={selVenueId === v.venueId ? 'primary' : v.status === 'Active' ? 'default' : 'warning'}
              onClick={() => setSelVenueId(v.venueId)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      {selectedVenue && (
        <Paper sx={{ p: 2, mb: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{selectedVenue.venueName}</Typography>
            <Typography variant="body2" color="text.secondary">{selectedVenue.description}</Typography>
          </Box>
          <Button
            variant="outlined"
            color={selectedVenue.status === 'Active' ? 'error' : 'success'}
            startIcon={selectedVenue.status === 'Active' ? <Block /> : <CheckCircle />}
            onClick={() => toggleVenueStatus(selectedVenue)}
          >
            {selectedVenue.status === 'Active' ? 'Mark Closed' : 'Mark Active'}
          </Button>
        </Paper>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Price Item</TableCell>
                <TableCell>Charge Unit</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Deposit</TableCell>
                <TableCell>Holiday Surcharge</TableCell>
                <TableCell>CGST %</TableCell>
                <TableCell>SGST %</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>
              )}
              {!loading && (!selectedVenue || selectedVenue.pricing.length === 0) && (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#94a3b8' }}>No pricing configured for this venue</TableCell></TableRow>
              )}
              {selectedVenue?.pricing.map((p: any, i: number) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell><Typography variant="body2" fontWeight={600}>{p.priceItemName}</Typography></TableCell>
                  <TableCell>{p.chargeUnit}</TableCell>
                  <TableCell>{fmt(p.amount)}</TableCell>
                  <TableCell>{fmt(p.refundableDeposit)}</TableCell>
                  <TableCell>{p.holidaySurchargeAmount ? fmt(p.holidaySurchargeAmount) : '—'}</TableCell>
                  <TableCell>{p.cgstPercent}%</TableCell>
                  <TableCell>{p.sgstPercent}%</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openForm(p)}><Edit fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>
          Edit Pricing — {editing?.priceItemName}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            GST is applied on Amount + Holiday Surcharge + Equipment add-ons. Holiday surcharge
            only applies on Saturdays, Sundays and public holidays.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {[
              { name: 'amount',                 label: `Amount per ${editing?.chargeUnit || 'unit'} (₹) *`, required: true },
              { name: 'refundableDeposit',      label: 'Refundable Deposit (₹)',  required: false },
              { name: 'holidaySurchargeAmount', label: 'Holiday Surcharge (₹)',   required: false },
              { name: 'cgstPercent',            label: 'CGST % *',                required: true },
              { name: 'sgstPercent',            label: 'SGST % *',                required: true },
            ].map(({ name, label, required }) => (
              <Grid item xs={12} md={6} key={name}>
                <TextField
                  label={label} fullWidth size="small" type="number"
                  inputProps={{ step: '0.01', min: 0 }}
                  error={!!(errors as any)[name]}
                  {...register(name, required ? { required: `${label} is required`, min: 0 } : { min: 0 })}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminVenuesPage;
