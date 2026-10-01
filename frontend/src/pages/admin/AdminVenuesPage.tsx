import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Tooltip, CircularProgress,
  Chip, Alert, Stack,
} from '@mui/material';
import { Edit, CheckCircle, Block, Add, DeleteOutline } from '@mui/icons-material';
import { venueAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

const AdminVenuesPage: React.FC = () => {
  const [venues, setVenues]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [selVenueId, setSelVenueId] = useState<number | ''>('');
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<'venue' | 'pricing'>('pricing');

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
    setDialogMode('pricing');
    reset({
      priceItemName: item.priceItemName,
      chargeUnit: item.chargeUnit,
      amount: item.amount,
      refundableDeposit: item.refundableDeposit,
      holidaySurchargeAmount: item.holidaySurchargeAmount,
      cgstPercent: item.cgstPercent,
      sgstPercent: item.sgstPercent,
    });
    setOpen(true);
  };

  const openVenueForm = () => {
    setEditing(null);
    setDialogMode('venue');
    reset({ venueName: '', description: '', capacity: '', location: '', priceItemName: '', chargeUnit: 'Per 3-hour slot', amount: '', refundableDeposit: 0, holidaySurchargeAmount: 0, cgstPercent: 9, sgstPercent: 9 });
    setOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (dialogMode === 'venue') {
        const response = await venueAPI.createVenue({
          venueName: data.venueName,
          description: data.description,
          capacity: data.capacity ? Number(data.capacity) : null,
          location: data.location,
          initialPricing: {
            priceItemName: data.priceItemName,
            chargeUnit: data.chargeUnit,
            amount: Number(data.amount || 0),
            refundableDeposit: Number(data.refundableDeposit || 0),
            holidaySurchargeAmount: Number(data.holidaySurchargeAmount || 0),
            cgstPercent: Number(data.cgstPercent || 0),
            sgstPercent: Number(data.sgstPercent || 0),
          },
        });
        setSelVenueId(response.data.venueId);
        toast.success('Venue and pricing created.');
      } else {
        const payload = {
          priceItemName: data.priceItemName,
          chargeUnit: data.chargeUnit,
          amount: Number(data.amount || 0),
          refundableDeposit: Number(data.refundableDeposit || 0),
          holidaySurchargeAmount: Number(data.holidaySurchargeAmount || 0),
          cgstPercent: Number(data.cgstPercent || 0),
          sgstPercent: Number(data.sgstPercent || 0),
          isActive: editing ? editing.isActive : true,
        };
        if (editing) await venueAPI.updatePricing(editing.id, payload);
        else await venueAPI.createPricing(Number(selVenueId), payload);
        toast.success(editing ? 'Pricing updated.' : 'Pricing created.');
      }
      setOpen(false);
      load();
    } catch { toast.error('Save failed. Please check the values and try again.'); }
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

  const removeVenue = async (venue: any) => {
    if (!window.confirm(`Remove "${venue.venueName}" from public booking? Existing bookings will be preserved.`)) return;
    try {
      await venueAPI.removeVenue(venue.venueId);
      toast.success('Venue removed from booking.');
      load();
    } catch { toast.error('Venue removal failed.'); }
  };

  const togglePricing = async (pricing: any) => {
    try {
      if (pricing.isActive && !window.confirm(`Remove "${pricing.priceItemName}" from new bookings?`)) return;
      if (pricing.isActive) await venueAPI.removePricing(pricing.id);
      else await venueAPI.updatePricing(pricing.id, { ...pricing, isActive: true });
      toast.success(pricing.isActive ? 'Pricing removed from booking.' : 'Pricing restored.');
      load();
    } catch { toast.error('Pricing status update failed.'); }
  };

  const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h4" fontWeight={700} color="primary.main">Venues & Pricing</Typography>
            <Typography variant="body2" color="text.secondary">Manage venue availability and per-use-case rates</Typography>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openVenueForm}>Add Venue & Pricing</Button>
        </Stack>
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
            <Typography variant="caption" color="text.secondary">Venue ID: {selectedVenue.venueId}</Typography>
            <Typography variant="body2" color="text.secondary">{selectedVenue.description}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {selectedVenue.status !== 'Removed' && <Button
              variant="outlined"
              color={selectedVenue.status === 'Active' ? 'error' : 'success'}
              startIcon={selectedVenue.status === 'Active' ? <Block /> : <CheckCircle />}
              onClick={() => toggleVenueStatus(selectedVenue)}
            >
              {selectedVenue.status === 'Active' ? 'Mark Closed' : 'Mark Active'}
            </Button>}
            {selectedVenue.status === 'Removed' && <Button variant="outlined" color="success" startIcon={<CheckCircle />} onClick={() => venueAPI.updateStatus(selectedVenue.venueId, { status: 'Active' }).then(load).catch(() => toast.error('Venue restore failed.'))}>Restore Venue</Button>}
            {selectedVenue.status !== 'Removed' && <Button variant="outlined" color="error" startIcon={<DeleteOutline />} onClick={() => removeVenue(selectedVenue)}>Remove Venue</Button>}
          </Stack>
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
                  <TableCell><Typography variant="body2" fontWeight={600}>{p.priceItemName}</Typography>{!p.isActive && <Chip label="Inactive" size="small" color="default" sx={{ ml: 1 }} />}</TableCell>
                  <TableCell>{p.chargeUnit}</TableCell>
                  <TableCell>{fmt(p.amount)}</TableCell>
                  <TableCell>{fmt(p.refundableDeposit)}</TableCell>
                  <TableCell>{p.holidaySurchargeAmount ? fmt(p.holidaySurchargeAmount) : '—'}</TableCell>
                  <TableCell>{p.cgstPercent}%</TableCell>
                  <TableCell>{p.sgstPercent}%</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openForm(p)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={p.isActive ? 'Remove pricing' : 'Restore pricing'}><IconButton size="small" color={p.isActive ? 'error' : 'success'} onClick={() => togglePricing(p)}>{p.isActive ? <DeleteOutline fontSize="small" /> : <CheckCircle fontSize="small" />}</IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>
          {dialogMode === 'venue' ? 'Add Venue & Pricing' : `Edit Pricing — ${editing.priceItemName}`}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            GST is applied on Amount + Holiday Surcharge + Equipment add-ons. Holiday surcharge
            only applies on Saturdays, Sundays and public holidays.
          </Alert>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            {dialogMode === 'venue' && <Grid item xs={12}><Typography variant="subtitle2" fontWeight={700}>Venue details</Typography></Grid>}
            {(dialogMode === 'venue' ? [
              { name: 'venueName', label: 'Venue Name *', required: true, numeric: false },
              { name: 'description', label: 'Description', required: false, numeric: false },
              { name: 'capacity', label: 'Capacity', required: false, numeric: true },
              { name: 'location', label: 'Location', required: false, numeric: false },
              { name: 'priceItemName', label: 'Price Item *', required: true, numeric: false },
              { name: 'chargeUnit', label: 'Charge Unit *', required: true, numeric: false },
              { name: 'amount', label: 'Amount (₹) *', required: true, numeric: true },
              { name: 'refundableDeposit', label: 'Refundable Deposit (₹)', required: false, numeric: true },
              { name: 'holidaySurchargeAmount', label: 'Holiday Surcharge (₹)', required: false, numeric: true },
              { name: 'cgstPercent', label: 'CGST % *', required: true, numeric: true },
              { name: 'sgstPercent', label: 'SGST % *', required: true, numeric: true },
            ] : [
              { name: 'amount', label: 'Amount (₹) *', required: true, numeric: true },
              { name: 'refundableDeposit', label: 'Refundable Deposit (₹)', required: false, numeric: true },
              { name: 'holidaySurchargeAmount', label: 'Holiday Surcharge (₹)', required: false, numeric: true },
              { name: 'cgstPercent', label: 'CGST % *', required: true, numeric: true },
              { name: 'sgstPercent', label: 'SGST % *', required: true, numeric: true },
            ]).map(({ name, label, required, numeric }, fieldIndex) => (
              <React.Fragment key={name}>
                {dialogMode === 'venue' && fieldIndex === 4 && <Grid item xs={12}><Typography variant="subtitle2" fontWeight={700}>Initial pricing and GST</Typography></Grid>}
                <Grid item xs={12} md={6}>
                  <TextField
                    label={label} fullWidth size="small" type={numeric ? 'number' : 'text'}
                    multiline={name === 'description'}
                    inputProps={numeric ? { step: name === 'capacity' ? '1' : '0.01', min: 0 } : undefined}
                    error={!!(errors as any)[name]}
                    {...register(name, required ? { required: `${label} is required`, min: 0 } : { min: 0 })}
                  />
                </Grid>
              </React.Fragment>
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
