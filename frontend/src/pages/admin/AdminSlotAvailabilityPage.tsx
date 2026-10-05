import React, { useEffect, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { Edit, Refresh } from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { bookingAPI, venueAPI } from '../../services/api';
import { RootState } from '../../store/store';
import { toast } from 'react-toastify';

type CapacitySession = 'Morning' | 'Evening' | 'FullDay';

const localDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const AdminSlotAvailabilityPage: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<number | ''>('');
  const [availabilityDate, setAvailabilityDate] = useState(() => localDateValue(new Date()));
  const [availability, setAvailability] = useState<any>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
  const [capacityDialogStep, setCapacityDialogStep] = useState<'select-session' | 'edit-capacity'>('select-session');
  const [capacitySession, setCapacitySession] = useState<CapacitySession | ''>('');
  const [capacityValue, setCapacityValue] = useState(30);
  const [capacitySaving, setCapacitySaving] = useState(false);
  const role = useSelector((state: RootState) => state.auth.role);
  const selectedVenue = venues.find((venue) => venue.venueId === selectedVenueId);

  useEffect(() => {
    venueAPI.getAllForAdmin()
      .then((response) => {
        const allVenues = response.data || [];
        setVenues(allVenues);
        setSelectedVenueId((current) => current || allVenues[0]?.venueId || '');
      })
      .catch(() => toast.error('Failed to load venues'));
  }, []);

  useEffect(() => {
    if (!selectedVenueId || !availabilityDate) {
      setAvailability(null);
      return;
    }

    let current = true;
    setAvailabilityLoading(true);
    bookingAPI.checkAvailability({
      venueId: selectedVenueId,
      fromDate: availabilityDate,
      toDate: availabilityDate,
    })
      .then((response) => { if (current) setAvailability(response.data.slots?.[0] || null); })
      .catch(() => { if (current) toast.error('Failed to load slot availability'); })
      .finally(() => { if (current) setAvailabilityLoading(false); });

    return () => { current = false; };
  }, [selectedVenueId, availabilityDate, refreshKey]);

  useEffect(() => {
    if (!selectedVenueId || !availabilityDate) return;
    const refresh = () => setRefreshKey((current) => current + 1);
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [selectedVenueId, availabilityDate]);

  const sessionAvailability = availability?.sessions?.length
    ? availability.sessions
    : availability ? [
        { session: 'Morning', totalSlots: null, bookedSlots: null, availableSlots: null, status: availability.morningStatus },
        { session: 'Evening', totalSlots: null, bookedSlots: null, availableSlots: null, status: availability.eveningStatus },
        { session: 'FullDay', totalSlots: 1, bookedSlots: availability.fullDayStatus === 'Booked' ? 1 : 0, availableSlots: availability.fullDayStatus === 'Available' ? 1 : 0, status: availability.fullDayStatus === 'Booked' ? 'Full' : 'Available' },
      ] : [];

  const statusLabel = (status: string) => status === 'Full' ? 'FULL'
    : status === 'Partially Booked' ? 'PARTIAL' : status === 'Unavailable' ? 'UNAVAILABLE' : 'AVAILABLE';
  const statusColor = (status: string): 'error' | 'warning' | 'success' | 'default' => status === 'Full'
    ? 'error' : status === 'Partially Booked' ? 'warning' : status === 'Unavailable' ? 'default' : 'success';

  const openCapacityEditor = () => {
    setCapacitySession('');
    setCapacityDialogStep('select-session');
    setCapacityDialogOpen(true);
  };

  const continueCapacityEdit = () => {
    if (!capacitySession) {
      toast.error('Select a session first.');
      return;
    }
    const capacity = capacitySession === 'Morning'
      ? selectedVenue?.morningBookingCapacity
      : capacitySession === 'Evening'
        ? selectedVenue?.eveningBookingCapacity
        : 1;
    setCapacityValue(capacity || 1);
    setCapacityDialogStep('edit-capacity');
  };

  const capacitySessionStats = sessionAvailability.find((slot: any) => slot.session === capacitySession);
  const isFullDayCapacity = capacitySession === 'FullDay';
  const capacityBelowBookings = !isFullDayCapacity
    && capacityValue < (capacitySessionStats?.bookedSlots || 0);

  const saveCapacity = async () => {
    if (!selectedVenue || (capacitySession !== 'Morning' && capacitySession !== 'Evening')
        || !Number.isInteger(capacityValue) || capacityValue < 1) {
      toast.error('Capacity must be a whole number greater than zero.');
      return;
    }
    if (capacityBelowBookings) {
      toast.error(`Capacity cannot be less than the number of existing bookings (${capacitySessionStats?.bookedSlots || 0}).`);
      return;
    }
    setCapacitySaving(true);
    try {
      const response = await venueAPI.updateBookingCapacity(selectedVenue.venueId, capacitySession, capacityValue);
      const savedCapacity = response.data.capacity;
      setVenues((current) => current.map((venue) => venue.venueId === selectedVenue.venueId
        ? { ...venue, [capacitySession === 'Morning' ? 'morningBookingCapacity' : 'eveningBookingCapacity']: savedCapacity }
        : venue));
      setCapacityDialogOpen(false);
      setRefreshKey((current) => current + 1);
      toast.success('Session capacity updated.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update session capacity.');
    } finally {
      setCapacitySaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Slot Availability</Typography>
          <Typography variant="body2" color="text.secondary">
            Live booking capacity and session status by hall and date.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {role === 'Admin' && selectedVenue && (
            <Button startIcon={<Edit />} onClick={openCapacityEditor} variant="outlined" size="small">
              Edit Capacity
            </Button>
          )}
          <Button
            startIcon={<Refresh />}
            onClick={() => setRefreshKey((current) => current + 1)}
            variant="outlined"
            size="small"
            disabled={availabilityLoading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={700} color="primary.main">Slot Availability</Typography>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" disabled={!venues.length}>
                <InputLabel>Hall</InputLabel>
                <Select
                  value={selectedVenueId}
                  label="Hall"
                  onChange={(event) => setSelectedVenueId(Number(event.target.value))}
                >
                  {venues.map((venue) => (
                    <MenuItem key={venue.venueId} value={venue.venueId}>
                      {venue.venueName}{venue.status !== 'Active' ? ` (${venue.status})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                type="date"
                label="Date"
                size="small"
                fullWidth
                value={availabilityDate}
                onChange={(event) => setAvailabilityDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {availabilityLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
          ) : availability ? (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {[
                  ['Total Slots', availability.totalSlots ?? '—'],
                  ['Booked Slots', availability.bookedSlots ?? '—'],
                  ['Available Slots', availability.availableSlots ?? '—'],
                  ['Cancelled Bookings', availability.cancelledBookingCount ?? '—'],
                ].map(([label, value]) => (
                  <Grid item xs={6} md={3} key={label}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="h6" fontWeight={700}>{value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Session</TableCell>
                      <TableCell align="right">Capacity</TableCell>
                      <TableCell align="right">Booked</TableCell>
                      <TableCell align="right">Available</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessionAvailability.map((slot: any) => (
                      <TableRow key={slot.session}>
                        <TableCell>{slot.session}</TableCell>
                        <TableCell align="right">{slot.totalSlots ?? '—'}</TableCell>
                        <TableCell align="right">{slot.bookedSlots ?? '—'}</TableCell>
                        <TableCell align="right">{slot.availableSlots ?? '—'}</TableCell>
                        <TableCell>
                          <Chip label={statusLabel(slot.status)} color={statusColor(slot.status)} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                <Typography variant="body2" fontWeight={600}>Full Day:</Typography>
                <Chip
                  label={availability.fullDayStatus || '—'}
                  color={availability.fullDayStatus === 'Booked' ? 'error' : 'success'}
                  size="small"
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Full Day bookings occupy both sessions. Data refreshes every 15 seconds and when this page regains focus.
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {venues.length ? 'No availability data for this hall and date.' : 'No venues are configured.'}
            </Typography>
          )}
        </Box>
      </Paper>

      <Dialog open={capacityDialogOpen} onClose={() => !capacitySaving && setCapacityDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{capacityDialogStep === 'select-session' ? 'Edit Capacity' : `Edit ${capacitySession === 'FullDay' ? 'Full Day' : capacitySession} Capacity`}</DialogTitle>
        {capacityDialogStep === 'select-session' ? (
          <>
            <DialogContent>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Select Session</InputLabel>
                <Select value={capacitySession} label="Select Session" onChange={(event) => setCapacitySession(event.target.value as CapacitySession)}>
                  <MenuItem value="Morning">Morning</MenuItem>
                  <MenuItem value="Evening">Evening</MenuItem>
                  <MenuItem value="FullDay">Full Day</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCapacityDialogOpen(false)}>Cancel</Button>
              <Button onClick={continueCapacityEdit} variant="contained" disabled={!capacitySession}>Continue</Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedVenue?.venueName} · {capacitySession === 'FullDay' ? 'Full Day remains exclusive and blocks both sessions.' : `${capacitySession} session capacity.`}
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[
                  ['Current Capacity', capacitySessionStats?.totalSlots ?? capacityValue],
                  ['Booked', capacitySessionStats?.bookedSlots ?? 0],
                  ['Available', capacitySessionStats?.availableSlots ?? 0],
                ].map(([label, value]) => (
                  <Grid item xs={4} key={label}>
                    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography variant="subtitle1" fontWeight={700}>{value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <TextField
                autoFocus={!isFullDayCapacity}
                label="New Capacity"
                type="number"
                fullWidth
                value={capacityValue}
                disabled={isFullDayCapacity}
                onChange={(event) => setCapacityValue(Number(event.target.value))}
                inputProps={{ min: capacitySessionStats?.bookedSlots || 1, step: 1 }}
                error={capacityBelowBookings}
                helperText={isFullDayCapacity
                  ? 'Full Day has a fixed exclusive capacity of one under the existing booking rule.'
                  : capacityBelowBookings
                    ? `Capacity cannot be less than the number of existing bookings (${capacitySessionStats?.bookedSlots || 0}).`
                    : 'Capacity is saved for this session on the selected venue.'}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCapacityDialogStep('select-session')} disabled={capacitySaving}>Back</Button>
              <Button onClick={() => setCapacityDialogOpen(false)} disabled={capacitySaving}>Cancel</Button>
              <Button onClick={saveCapacity} variant="contained" disabled={capacitySaving || isFullDayCapacity || capacityBelowBookings}>
                {capacitySaving ? 'Saving...' : 'Save Capacity'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default AdminSlotAvailabilityPage;