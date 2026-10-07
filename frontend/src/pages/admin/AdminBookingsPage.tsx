import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Button, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider, Pagination, InputAdornment,
  CircularProgress, ToggleButton, ToggleButtonGroup, Alert,
} from '@mui/material';
import {
  Visibility, Print, Search, FilterAlt,
  Close, Refresh,
} from '@mui/icons-material';
import { bookingAPI, refundAPI, uploadFile, venueAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

const statusColors: any = {
  PendingPayment: 'warning',
  Confirmed:      'success',
  Cancelled:      'default',
  ForceCancelled: 'error',
};

const sessionLabel = (s: string) => (s === 'FullDay' ? 'Full Day' : s);

interface AdminApplicantForm {
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  functionName: string;
  functionType: string;
  expectedGuests: number;
  idProofType: string;
}

const AdminBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.auth.role);
  const [bookings, setBookings]   = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [slotAvailability, setSlotAvailability] = useState<Record<string, boolean>>({});
  const [checkingSlots, setCheckingSlots] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [newFromDate, setNewFromDate] = useState('');
  const [newToDate, setNewToDate] = useState('');
  const [newBookingDate, setNewBookingDate] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    venueId: 0,
    venuePricingId: 0,
    applicant: { fullName: '', email: '', mobile: '', address: '', functionName: '', functionType: '', expectedGuests: 0, idProofType: '' } as AdminApplicantForm,
    bankDetail: { bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', branchName: '', micrCode: '' },
  });

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

  useEffect(() => {
    if (!createOpen || !createForm.venueId || !newFromDate || !newToDate || newFromDate > newToDate) {
      setSlotAvailability({});
      return;
    }
    let current = true;
    setCheckingSlots(true);
    bookingAPI.checkAvailability({
      venueId: createForm.venueId,
      fromDate: newFromDate,
      toDate: newToDate,
    }).then((response) => {
      if (!current) return;
      const days = response.data?.slots || [];
      const individualAvailability = Object.fromEntries(['Morning', 'Afternoon', 'Evening'].map((session) => [
        session,
        days.length > 0 && days.every((day: any) => {
          const slot = day.sessions?.find((item: any) => item.session === session);
          return (slot?.availableSlots ?? 0) > 0;
        }),
      ])) as Record<string, boolean>;
      const availability = {
        ...individualAvailability,
        FullDay: days.length > 0 && days.every((day: any) => day.fullDayStatus === 'Available'),
      };
      setSlotAvailability(availability);
      setSelectedSessions((sessions) => {
        const availableSessions = sessions.filter((session) => availability[session]);
        return availableSessions.length === 3 && !availability.FullDay ? [] : availableSessions;
      });
    }).catch((error: any) => {
      if (!current) return;
      setSlotAvailability({});
      toast.error(error.response?.data?.error || 'Slot availability could not be checked.');
    }).finally(() => {
      if (current) setCheckingSlots(false);
    });
    return () => { current = false; };
  }, [createOpen, createForm.venueId, newFromDate, newToDate]);

  const openDetail = (b: any) => {
    setSelected(b);
    setNewBookingDate(String(b.fromDate).slice(0, 10));
    setDialogOpen(true);
  };
  const printReceipt = (b: any) => navigate(`/admin/receipts?bookingNumber=${encodeURIComponent(b.bookingNumber)}`);

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const updateApplicant = <K extends keyof AdminApplicantForm,>(field: K, value: AdminApplicantForm[K]) => {
    setCreateForm((current) => ({ ...current, applicant: { ...current.applicant, [field]: value } }));
  };
  const openCreate = async () => {
    setCreateOpen(true);
    setSummary(null);
    setSelectedSessions([]);
    setProofFile(null);
    setNewFromDate('');
    setNewToDate('');
    try {
      const response = await venueAPI.getAll();
      const activeVenues = response.data || [];
      setVenues(activeVenues);
      const venueId = activeVenues[0]?.venueId || 0;
      setCreateForm((current) => ({ ...current, venueId, venuePricingId: 0 }));
      if (venueId) {
        const detail = await venueAPI.getDetails(venueId);
        setPricing(detail.data?.pricing || []);
      }
    } catch {
      toast.error('Active venues could not be loaded.');
    }
  };

  const selectVenue = async (venueId: number) => {
    setCreateForm((current) => ({ ...current, venueId, venuePricingId: 0 }));
    setSummary(null);
    try {
      const detail = await venueAPI.getDetails(venueId);
      setPricing(detail.data?.pricing || []);
    } catch {
      setPricing([]);
      toast.error('Venue pricing could not be loaded.');
    }
  };

  const calculateAdminSummary = async () => {
    if (!createForm.venueId || !createForm.venuePricingId || !newFromDate || !newToDate || newFromDate > newToDate || !selectedSessions.length) {
      toast.error('Select a venue, price item, dates, and at least one time slot.');
      return;
    }
    if (selectedSessions.some((session) => !slotAvailability[session])) {
      toast.error('One or more selected time slots are no longer available for the selected dates.');
      return;
    }
    if (selectedSessions.length === 3 && !slotAvailability.FullDay) {
      toast.error('Full Day cannot be booked when an individual slot is already booked.');
      return;
    }
    try {
      const response = await bookingAPI.getSummary({
        venueId: createForm.venueId,
        venuePricingId: createForm.venuePricingId,
        fromDate: newFromDate,
        toDate: newToDate,
        session: selectedSessions.join(','),
      });
      setSummary(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking amount could not be calculated.');
    }
  };

  const createBooking = async () => {
    const applicant = createForm.applicant;
    const bank = createForm.bankDetail;
    if (applicant.fullName.trim().length < 3
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email)
        || !/^[6-9]\d{9}$/.test(applicant.mobile)
        || applicant.address.trim().length < 10
        || !applicant.functionName.trim()
        || !applicant.functionType.trim()
        || applicant.expectedGuests < 1
        || applicant.expectedGuests > 10000
        || !applicant.idProofType.trim()
        || !proofFile) {
      toast.error('Complete the required applicant details and attach the citizen ID proof.');
      return;
    }
    if (!bank.bankName.trim()
        || !bank.accountHolderName.trim()
        || !/^\d{9,18}$/.test(bank.accountNumber)
        || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank.ifscCode.toUpperCase())
        || !bank.branchName.trim()) {
      toast.error('Complete valid bank details for any refund processing.');
      return;
    }
    if (!summary || newFromDate < new Date().toISOString().slice(0, 10)) {
      toast.error('Select a future booking date and calculate the amount before creating the booking.');
      return;
    }
    setCreating(true);
    try {
      const idProofFile = await uploadFile(proofFile);
      const result = await bookingAPI.createForAdmin({
        venueId: createForm.venueId,
        venuePricingId: createForm.venuePricingId,
        fromDate: newFromDate,
        toDate: newToDate,
        session: selectedSessions.join(','),
        applicant: {
          ...applicant,
          alternateMobile: null,
          idProofFile,
        },
        bankDetail: { ...bank, ifscCode: bank.ifscCode.toUpperCase(), micrCode: bank.micrCode || null },
      });
      toast.success(`Booking ${result.data.bookingNumber} created. It is awaiting payment through the existing payment workflow.`);
      setCreateOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const changeSelectedDate = async () => {
    if (!selected || !newBookingDate) return;
    try {
      await bookingAPI.changeDate(selected.id, newBookingDate);
      toast.success('Booking date changed.');
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking date could not be changed.');
    }
  };

  const forceCancel = async (booking: any) => {
    if (!window.confirm(`Force-cancel booking ${booking.bookingNumber}? The system will create a refund for 100% of the amount paid.`)) return;
    try {
      await bookingAPI.forceCancel(booking.id);
      toast.success('Booking force-cancelled. A full refund request has been routed for Clerk review and Admin approval.');
      setDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Booking could not be force-cancelled.');
    }
  };

  const submitRefundApplication = async (booking: any) => {
    if (!window.confirm(`Submit a refund application for booking ${booking.bookingNumber} to the Clerk for review?`)) return;
    try {
      await refundAPI.adminApply(booking.id, 'Admin-submitted refund application');
      toast.success('Refund application submitted to the Clerk for review.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Refund application could not be submitted.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Bookings</Typography>
          <Typography variant="body2" color="text.secondary">Manage all venue booking requests</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {role === 'Admin' && <Button variant="contained" size="small" onClick={openCreate}>Create Booking</Button>}
          <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">Refresh</Button>
        </Box>
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
        <DialogTitle sx={{ bgcolor: '#50175d', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              {role === 'Admin' && <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" fontWeight={700} color="primary.main" mb={1}>Admin Actions</Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Change Booking Start Date"
                      value={newBookingDate || String(selected.fromDate).slice(0, 10)}
                      onChange={(event) => setNewBookingDate(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button fullWidth variant="outlined" onClick={changeSelectedDate} disabled={!newBookingDate || newBookingDate === String(selected.fromDate).slice(0, 10)}>
                      Change Date
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      color="error"
                      variant="outlined"
                      onClick={() => forceCancel(selected)}
                      disabled={selected.status === 'Cancelled' || selected.status === 'ForceCancelled' || selected.status === 'Force Cancelled'}
                    >
                      Force Cancellation
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      onClick={() => submitRefundApplication(selected)}
                      disabled={selected.status !== 'Confirmed'}
                    >
                      Submit Refund Application
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      A date change preserves the booking duration and selected slots. Refund applications go to the Clerk; force cancellation creates a full-paid-amount refund request.
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', gap: 1 }}>
          <Button startIcon={<Print />} variant="outlined" onClick={() => selected && printReceipt(selected)}>Print Receipt</Button>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createOpen} onClose={() => !creating && setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#50175d', color: '#fff' }}>Create Booking for Citizen</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Venue / Hall</InputLabel>
                <Select value={createForm.venueId || ''} label="Venue / Hall" onChange={(event) => selectVenue(Number(event.target.value))}>
                  {venues.map((venue) => <MenuItem key={venue.venueId} value={venue.venueId}>{venue.venueName}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Price Item</InputLabel>
                <Select value={createForm.venuePricingId || ''} label="Price Item" onChange={(event) => { setCreateForm((current) => ({ ...current, venuePricingId: Number(event.target.value) })); setSummary(null); }}>
                  {pricing.filter((item) => item.isActive).map((item) => <MenuItem key={item.id} value={item.id}>{item.priceItemName} — ₹{item.amount} ({item.chargeUnit})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="date" label="From Date" value={newFromDate} onChange={(event) => { setNewFromDate(event.target.value); setSummary(null); }} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="date" label="To Date" value={newToDate} onChange={(event) => { setNewToDate(event.target.value); setSummary(null); }} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Select available slots</Typography>
              <ToggleButtonGroup
                value={selectedSessions}
                onChange={(_, value: string[]) => {
                  if (value.length === 3 && !slotAvailability.FullDay) {
                    toast.error('Full Day cannot be booked when an individual slot is already booked.');
                    return;
                  }
                  setSelectedSessions(value);
                  setSummary(null);
                }}
                aria-label="Booking time slots"
                size="small"
              >
                <ToggleButton value="Morning" disabled={checkingSlots || slotAvailability.Morning !== true}>Morning · 9 AM–1 PM</ToggleButton>
                <ToggleButton value="Afternoon" disabled={checkingSlots || slotAvailability.Afternoon !== true}>Afternoon · 2 PM–5 PM</ToggleButton>
                <ToggleButton value="Evening" disabled={checkingSlots || slotAvailability.Evening !== true}>Evening · 6 PM–10 PM</ToggleButton>
              </ToggleButtonGroup>
              <Button size="small" sx={{ ml: 1 }} disabled={checkingSlots || !slotAvailability.FullDay} onClick={() => { setSelectedSessions(['Morning', 'Afternoon', 'Evening']); setSummary(null); }}>Full Day</Button>
              {checkingSlots && <Typography variant="caption" sx={{ ml: 1 }}>Checking availability…</Typography>}
            </Grid>
            <Grid item xs={12}><Divider /><Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>Citizen / Customer Details</Typography></Grid>
            {([
              ['fullName', 'Full Name', 'text'],
              ['mobile', 'Mobile Number', 'tel'],
              ['email', 'Email', 'email'],
              ['address', 'Address', 'text'],
              ['functionName', 'Function Name', 'text'],
              ['functionType', 'Function Type', 'text'],
              ['expectedGuests', 'Expected Guests', 'number'],
              ['idProofType', 'ID Proof Type', 'text'],
            ] as const).map(([field, label, type]) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  fullWidth size="small" type={type} required label={label}
                  value={createForm.applicant[field]}
                  onChange={(event) => field === 'expectedGuests'
                    ? updateApplicant(field, Math.max(0, Number(event.target.value)))
                    : updateApplicant(field, event.target.value)}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button component="label" variant="outlined">
                {proofFile?.name || 'Upload Citizen ID Proof *'}
                <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setProofFile(event.target.files?.[0] || null)} />
              </Button>
            </Grid>
            <Grid item xs={12}><Divider /><Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>Refund Bank Details</Typography></Grid>
            {([
              ['bankName', 'Bank Name'],
              ['accountHolderName', 'Account Holder Name'],
              ['accountNumber', 'Account Number'],
              ['ifscCode', 'IFSC Code'],
              ['branchName', 'Branch Name'],
              ['micrCode', 'MICR Code'],
            ] as const).map(([field, label]) => (
              <Grid item xs={12} sm={6} key={field}>
                <TextField
                  fullWidth size="small" required label={label}
                  value={createForm.bankDetail[field]}
                  onChange={(event) => setCreateForm((current) => ({
                    ...current,
                    bankDetail: { ...current.bankDetail, [field]: event.target.value },
                  }))}
                />
              </Grid>
            ))}
            <Grid item xs={12}><Button variant="outlined" onClick={calculateAdminSummary}>Calculate Amount</Button></Grid>
            {summary && <Grid item xs={12}><Alert severity="info">Base rent ₹{summary.baseRent} · GST ₹{summary.cgstAmount + summary.sgstAmount} · Deposit ₹{summary.securityDeposit} · Total ₹{summary.grandTotal}</Alert></Grid>}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={creating}>Close</Button>
          <Button variant="contained" onClick={createBooking} disabled={creating || !summary}>
            {creating ? 'Creating…' : 'Create Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBookingsPage;
