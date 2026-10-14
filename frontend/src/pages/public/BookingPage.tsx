import React, { useState, useEffect } from 'react';
import {
  Box, Container, Paper, Stepper, Step, StepLabel, Typography,
  Button, Grid, TextField, MenuItem, Select, FormControl, InputLabel, LinearProgress,
  FormHelperText, Chip, Alert, CircularProgress, Divider, Card, CardContent,
  useMediaQuery, useTheme, IconButton, Checkbox, FormControlLabel, ButtonBase,
} from '@mui/material';
import {
  CheckCircle, ArrowBack, ArrowForward, EventAvailable,
  Assignment, AccountBalance, Payment, ConfirmationNumber,
  ChevronLeft, ChevronRight, Download,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import {
  nextStep, prevStep, setAvailability, setSummary,
  setApplicant, setBankDetail, setBookingResult, resetBooking,
} from '../../store/slices/bookingSlice';
import { bookingAPI, paymentAPI, venueAPI } from '../../services/api';
import { VenueEquipment } from '../../types/types';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import Receipt from '../../components/Receipt';

const steps = [
  { label: 'Availability',      icon: <EventAvailable /> },
  { label: 'Booking Summary',   icon: <Assignment />     },
  { label: 'Applicant Details', icon: <Assignment />     },
  { label: 'Bank Details',      icon: <AccountBalance /> },
  { label: 'Confirm & Submit',  icon: <Payment />        },
];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── Schemas ───────────────────────────────────────────────────────────────────
const step1Schema = yup.object({
  venueId:        yup.number().required('Please select a venue').positive(),
  venuePricingId: yup.number().required('Please select a price item').positive(),
  priceItemName:  yup.string().required(),
  fromDate:   yup.string().required('From date is required'),
  toDate:     yup.string().required('To date is required'),
  session:    yup.string().required('Please select at least one time slot'),
});

const step3Schema = yup.object({
  fullName:       yup.string().required('Full name is required').min(3),
  email:          yup.string().email('Enter a valid email').required('Email is required'),
  mobile:         yup.string().matches(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile').required('Mobile is required'),
  alternateMobile: yup.string().matches(/^[6-9]\d{9}$/, 'Enter valid 10-digit mobile').optional(),
  address:        yup.string().required('Address is required').min(10),
  functionName:   yup.string().required('Function name is required'),
  functionType:   yup.string().required('Function type is required'),
  expectedGuests: yup.number().required('Expected guests required').min(1).max(10000),
  idProofType:    yup.string().required('ID proof type is required'),
});

const step4Schema = yup.object({
  bankName:          yup.string().required('Bank name is required'),
  accountHolderName: yup.string().required('Account holder name is required'),
  accountNumber:     yup.string().required('Account number is required').min(9).max(18),
  ifscCode:          yup.string().required('IFSC code is required').matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'),
  branchName:        yup.string().required('Branch name is required'),
  micrCode:          yup.string().optional(),
});

// ── Step 1: Availability ──────────────────────────────────────────────────────
const Step1Availability: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const dispatch    = useDispatch();
  const wizard      = useSelector((s: RootState) => s.booking);
  const [venues, setVenues]         = useState<any[]>([]);
  const [pricingOptions, setPricingOptions] = useState<any[]>([]);
  const [equipmentOptions, setEquipmentOptions] = useState<VenueEquipment[]>([]);
  const [slots, setSlots]           = useState<any[]>([]);
  const [checking, setChecking]     = useState(false);
  const [validatingAvailability, setValidatingAvailability] = useState(false);
  const [activeDate, setActiveDate] = useState(wizard.fromDate || '');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialDate = wizard.fromDate ? new Date(`${wizard.fromDate}T00:00:00`) : new Date();
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: yupResolver(step1Schema),
    defaultValues: {
      venueId:        wizard.venueId || 0,
      venuePricingId: wizard.venuePricingId || 0,
      priceItemName:  wizard.priceItemName || '',
      fromDate:       wizard.fromDate || '',
      toDate:         wizard.toDate   || '',
      session:        wizard.session || 'FullDay',
    },
  });

  const fromDate   = watch('fromDate');
  const toDate     = watch('toDate');
  const venueId    = watch('venueId');
  const venuePricingId = watch('venuePricingId');
  const session    = watch('session');

  useEffect(() => {
    venueAPI.getAll().then((r) => {
      setVenues(r.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (venueId) return;
    const firstActiveVenue = venues.find((venue: any) => venue.status === 'Active');
    if (firstActiveVenue) setValue('venueId', firstActiveVenue.venueId);
  }, [venueId, venues, setValue]);

  useEffect(() => {
    venueAPI.getEquipment().then((r) => setEquipmentOptions(r.data || [])).catch(() => setEquipmentOptions([]));
  }, []);

  const handleEquipmentChange = (equipmentId: number, quantity: number) => {
    const sanitized = Math.max(0, Math.round(quantity));
    const existing = wizard.equipment.find((item) => item.equipmentId === equipmentId);
    const option = equipmentOptions.find((item) => item.id === equipmentId);

    const updated = sanitized === 0
      ? wizard.equipment.filter((item) => item.equipmentId !== equipmentId)
      : wizard.equipment.map((item) => item.equipmentId === equipmentId
          ? { ...item, quantity: sanitized, totalPrice: item.unitPrice * sanitized }
          : item);

    if (!existing && sanitized > 0 && option) {
      updated.push({
        equipmentId,
        equipmentName: option.equipmentName,
        chargeUnit: option.chargeUnit,
        unitPrice: option.amount,
        quantity: sanitized,
        totalPrice: option.amount * sanitized,
      });
    }

    dispatch(setSummary({ equipment: updated }));
  };

  // Load this venue's pricing tiers (the use-case options from the rate chart)
  // whenever the selected venue changes.
  useEffect(() => {
    if (!venueId) { setPricingOptions([]); return; }
    venueAPI.getDetails(venueId)
      .then((r) => setPricingOptions(r.data?.pricing || []))
      .catch(() => setPricingOptions([]));
    setValue('venuePricingId', 0);
    setValue('priceItemName', '');
  }, [venueId]);

  const mergeAvailability = (incomingSlots: any[]) => {
    setSlots((currentSlots) => {
      const byDate = new Map(currentSlots.map((slot) => [String(slot.date).slice(0, 10), slot]));
      incomingSlots.forEach((slot) => byDate.set(String(slot.date).slice(0, 10), slot));
      const mergedSlots: any[] = [];
      byDate.forEach((slot) => mergedSlots.push(slot));
      return mergedSlots.sort((left, right) => String(left.date).localeCompare(String(right.date)));
    });
  };

  useEffect(() => {
    if (!venueId) { setSlots([]); return; }
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const from = formatDateKey(new Date(year, month, 1));
    const to = formatDateKey(new Date(year, month + 1, 0));
    let current = true;
    setSlots([]);
    setChecking(true);
    bookingAPI.checkAvailability({ venueId, fromDate: from, toDate: to })
      .then((r) => { if (current) setSlots(r.data.slots || []); })
      .catch(() => { if (current) setSlots([]); })
      .finally(() => { if (current) setChecking(false); });
    return () => { current = false; };
  }, [venueId, calendarMonth]);

  useEffect(() => {
    if (!venueId || !activeDate) return;
    let current = true;
    bookingAPI.checkAvailability({ venueId, fromDate: activeDate, toDate: activeDate })
      .then((r) => { if (current) mergeAvailability(r.data.slots || []); })
      .catch(() => {});
    return () => { current = false; };
  }, [venueId, activeDate]);

  useEffect(() => {
    if (!fromDate) return;
    setActiveDate(fromDate);
    const selected = new Date(`${fromDate}T00:00:00`);
    setCalendarMonth((current) => current.getFullYear() === selected.getFullYear() && current.getMonth() === selected.getMonth()
      ? current
      : new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [fromDate]);

  // Keep priceItemName in sync for validation (required in schema)
  useEffect(() => {
    const p = pricingOptions.find((p) => p.id === venuePricingId);
    if (p) setValue('priceItemName', p.priceItemName);
  }, [venuePricingId, pricingOptions]);

  const getStatusColor = (status: string) => {
    if (status === 'Available')   return 'success';
    if (status === 'booked') return 'warning';
    if (status === 'Booked' || status === 'Full') return 'error';
    return 'default';
  };

  // Status field on a slot that corresponds to the currently selected session
  const statusForSession = (slot: any, sess: string) => {
    const selected = sess === 'FullDay' ? ['Morning', 'Afternoon', 'Evening'] : sess.split(',');
    if (selected.length === 3) return slot.fullDayStatus;
    return selected.some((name) => {
      const session = slot.sessions?.find((item: any) => item.session === name);
      const status = session?.status || slot[`${name.charAt(0).toLowerCase()}${name.slice(1)}Status`];
      return status === 'Full' || status === 'Booked' || status === 'Unavailable';
    }) ? 'Booked' : 'Available';
  };

  const activeSlot = slots.find((slot: any) => String(slot.date).slice(0, 10) === activeDate);
  const isSessionUnavailable = (sess: string) => !activeSlot || statusForSession(activeSlot, sess) !== 'Available';
  const hasSelectedSessionConflict = !!activeSlot && statusForSession(activeSlot, session) === 'Booked';
  const todayKey = formatDateKey(new Date());
  const monthYear = calendarMonth.getFullYear();
  const monthIndex = calendarMonth.getMonth();
  const calendarCells: Array<Date | null> = [];
  for (let blank = 0; blank < new Date(monthYear, monthIndex, 1).getDay(); blank++) calendarCells.push(null);
  for (let day = 1; day <= new Date(monthYear, monthIndex + 1, 0).getDate(); day++) {
    calendarCells.push(new Date(monthYear, monthIndex, day));
  }
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);
  const calendarStatus = (dateKey: string) => {
    if (dateKey < todayKey) return 'past';
    const daySlot = slots.find((slot: any) => String(slot.date).slice(0, 10) === dateKey);
    if (!daySlot) return 'unavailable';
    if (typeof daySlot.bookedSlots === 'number' && typeof daySlot.availableSlots === 'number') {
      if (daySlot.bookedSlots === 0 && daySlot.availableSlots > 0) return 'available';
      if (daySlot.availableSlots > 0) return 'partial';
      return 'full';
    }
    const statuses = [daySlot.morningStatus, daySlot.afternoonStatus, daySlot.eveningStatus];
    const availableCount = statuses.filter((status) => status === 'Available').length;
    if (availableCount === statuses.length) return 'available';
    if (availableCount > 0) return 'partial';
    return 'full';
  };
  const monthLabel = calendarMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const previousMonthDisabled = calendarMonth.getTime() <= currentMonthStart.getTime();

  const selectCalendarDate = (date: Date) => {
    const dateKey = formatDateKey(date);
    if (dateKey < todayKey) return;
    setActiveDate(dateKey);
    setValue('fromDate', dateKey, { shouldDirty: true, shouldValidate: true });
    setValue('toDate', dateKey, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data: any) => {
    setValidatingAvailability(true);
    let latestSlots: any[];
    try {
      const response = await bookingAPI.checkAvailability({
        venueId: data.venueId,
        fromDate: data.fromDate,
        toDate: data.toDate,
      });
      latestSlots = response.data.slots || [];
      mergeAvailability(latestSlots);
    } catch {
      toast.error('Could not verify availability. Please try again.');
      setValidatingAvailability(false);
      return;
    }
    setValidatingAvailability(false);

    if (latestSlots.some((slot) => statusForSession(slot, data.session) === 'Booked')) {
      toast.error(`The ${data.session} session is already booked for one or more of the selected dates. Please choose a different date or session.`);
      return;
    }
    const venue   = venues.find((v) => v.venueId === data.venueId);
    const pricing = pricingOptions.find((p) => p.id === data.venuePricingId);
    dispatch(setAvailability({
      venueId:        data.venueId,
      venueName:      venue?.venueName || '',
      venuePricingId: data.venuePricingId,
      priceItemName:  pricing?.priceItemName || '',
      chargeUnit:     pricing?.chargeUnit || '',
      fromDate:       data.fromDate,
      toDate:         data.toDate,
      session:        data.session,
    }));
    onNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h5" sx={{ mb: 3, color: '#50175d', fontWeight: 700 }}>
        Check Availability
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Controller
            name="venueId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.venueId}>
                <InputLabel>Select Venue *</InputLabel>
                <Select {...field} label="Select Venue *">
                  {venues.map((v) => (
                    <MenuItem key={v.venueId} value={v.venueId} disabled={v.status !== 'Active'}>
                      {v.venueName}{v.status !== 'Active' ? ` (${v.status})` : ''}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.venueId?.message}</FormHelperText>
              </FormControl>
            )}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field} type="date" label="From Date *" fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                error={!!errors.fromDate}
                helperText={errors.fromDate?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <Controller
            name="toDate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field} type="date" label="To Date *" fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: fromDate || new Date().toISOString().split('T')[0] }}
                error={!!errors.toDate}
                helperText={errors.toDate?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="venuePricingId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.venuePricingId} disabled={!venueId}>
                <InputLabel>Select Purpose / Price Item *</InputLabel>
                <Select {...field} label="Select Purpose / Price Item *">
                  {pricingOptions.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.priceItemName} — ₹{p.amount.toLocaleString('en-IN')} ({p.chargeUnit})
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.venuePricingId?.message || (!venueId ? 'Select a venue first' : '')}</FormHelperText>
              </FormControl>
            )}
          />
        </Grid>
      </Grid>

      {venueId ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#50175d' }}>
            Availability Calendar: {venues.find((venue) => venue.venueId === venueId)?.venueName || 'Selected Hall'}
          </Typography>
          <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <IconButton
                aria-label="Previous month"
                onClick={() => setCalendarMonth(new Date(monthYear, monthIndex - 1, 1))}
                disabled={previousMonthDisabled}
                size="small"
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="h6" fontWeight={700} color="primary.main">{monthLabel}</Typography>
              <IconButton
                aria-label="Next month"
                onClick={() => setCalendarMonth(new Date(monthYear, monthIndex + 1, 1))}
                size="small"
              >
                <ChevronRight />
              </IconButton>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: { xs: 0.4, sm: 0.75 } }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                <Typography key={weekday} variant="caption" align="center" fontWeight={700} color="text.secondary" sx={{ py: 0.5 }}>
                  {weekday}
                </Typography>
              ))}
              {calendarCells.map((date, index) => {
                if (!date) return <Box key={`blank-${index}`} sx={{ minWidth: 0 }} />;
                const dateKey = formatDateKey(date);
                const status = calendarStatus(dateKey);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === activeDate;
                const colors: Record<string, string> = {
                  available: '#2e7d32',
                  partial: '#ed6c02',
                  full: '#c62828',
                  past: '#94a3b8',
                  unavailable: '#94a3b8',
                };
                const labels: Record<string, string> = {
                  available: 'Available',
                  partial: 'Partial',
                  full: 'Full',
                  past: 'Past',
                  unavailable: checking ? 'Loading' : 'Unavailable',
                };
                const daySlot = slots.find((slot: any) => String(slot.date).slice(0, 10) === dateKey);

                return (
                  <ButtonBase
                    key={dateKey}
                    onClick={() => selectCalendarDate(date)}
                    disabled={dateKey < todayKey || !daySlot}
                    aria-label={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}: ${labels[status]}`}
                    aria-pressed={isSelected}
                    sx={{
                      minWidth: 0,
                      minHeight: { xs: 52, sm: 72 },
                      p: { xs: 0.5, sm: 1 },
                      border: '1px solid',
                      borderColor: isSelected ? '#50175d' : isToday ? '#b45490' : '#e2e8f0',
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: 1.5,
                      bgcolor: isSelected ? '#50175d' : '#fff',
                      color: isSelected ? '#fff' : 'text.primary',
                      opacity: status === 'past' || status === 'unavailable' ? 0.55 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      transition: 'background-color 120ms ease, border-color 120ms ease',
                      '&:hover': { bgcolor: isSelected ? '#50175d' : '#fbf6fa' },
                      '&.Mui-disabled': { color: 'text.disabled' },
                    }}
                  >
                    <Typography variant="body2" fontWeight={isToday || isSelected ? 700 : 500}>
                      {date.getDate()}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', minWidth: 0 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, bgcolor: colors[status] }} />
                      <Typography variant="caption" noWrap sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.65rem' }}>
                        {isToday ? 'Today' : labels[status]}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 1, sm: 2 }, mt: 2 }}>
              {[
                ['#2e7d32', 'Available'],
                ['#ed6c02', 'booked'],
                ['#c62828', 'Fully booked'],
                ['#94a3b8', 'Past / unavailable'],
              ].map(([color, label]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Box>
              ))}
            </Box>
            {checking && <LinearProgress sx={{ mt: 2 }} />}
          </Paper>

          {activeDate && (
            <Paper variant="outlined" sx={{ mt: 2, p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                {new Date(`${activeDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {venues.find((venue) => venue.venueId === venueId)?.venueName || 'Selected Hall'}
              </Typography>
              {!activeSlot ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">Loading session availability...</Typography>
                </Box>
              ) : (
                <>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {[
                      ['Total slots', activeSlot.totalSlots ?? '—'],
                      ['Booked', activeSlot.bookedSlots ?? '—'],
                      ['Available', activeSlot.availableSlots ?? '—'],
                      ['Cancelled', activeSlot.cancelledBookingCount ?? '—'],
                    ].map(([label, value]) => (
                      <Grid item xs={6} sm={3} key={label}>
                        <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                          <Typography variant="subtitle1" fontWeight={700}>{value}</Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  <Controller
                  name="session"
                  control={control}
                  render={({ field }) => (
                    <Grid container spacing={1.5}>
                      {[
                        { value: 'Morning', time: '9:00 AM – 1:00 PM', status: activeSlot.morningStatus },
                        { value: 'Afternoon', time: '2:00 PM – 5:00 PM', status: activeSlot.afternoonStatus },
                        { value: 'Evening', time: '6:00 PM – 10:00 PM', status: activeSlot.eveningStatus },
                        { value: 'FullDay', label: 'Full Day', time: '9:00 AM – 10:00 PM', status: activeSlot.fullDayStatus },
                                      ].map((option: any) => {
                                        const optionName = option.label || option.value;
                                        const counts = activeSlot.sessions?.find((item: any) => item.session === option.value);
                                        const displayStatus = counts?.status === 'Full'
                                          ? 'Booked'
                                          : counts?.status || (option.status === 'Booked' ? 'Booked' : 'Available');
                                        const selectedSessions = field.value === 'FullDay'
                                          ? ['Morning', 'Afternoon', 'Evening']
                                          : String(field.value || '').split(',').filter(Boolean);
                                        const checked = option.value === 'FullDay'
                                          ? field.value === 'FullDay'
                                          : selectedSessions.includes(option.value);
                                        const unavailable = (option.value === 'FullDay'
                                          ? option.status !== 'Available'
                                          : statusForSession(activeSlot, option.value) === 'Booked')
                                          || activeDate < todayKey
                                          || (option.value !== 'FullDay' && field.value === 'FullDay');
                                        const toggleSession = () => {
                                          if (option.value === 'FullDay') {
                                            field.onChange(checked ? '' : 'FullDay');
                                            return;
                                          }
                                          const next = checked
                                            ? selectedSessions.filter((name) => name !== option.value)
                                            : [...selectedSessions, option.value];
                                          const ordered = ['Morning', 'Afternoon', 'Evening'].filter((name) => next.includes(name));
                                          field.onChange(ordered.length === 3 ? 'FullDay' : ordered.join(','));
                                        };
                                        return (
                                          <Grid item xs={12} sm={6} md={3} key={option.value}>
                                            <Paper variant="outlined" sx={{ height: '100%', p: 1.5, borderColor: checked ? '#50175d' : '#e2e8f0' }}>
                                              <FormControlLabel
                                                sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                                                control={(
                                                  <Checkbox
                                                    checked={checked}
                                                    onChange={toggleSession}
                                                    disabled={unavailable}
                                                    sx={{ pt: 0.25 }}
                                                  />
                                )}
                                label={(
                                  <Box sx={{ pt: 0.5 }}>
                                    <Typography variant="body2" fontWeight={700}>{optionName}</Typography>
                                    <Typography variant="caption" color="text.secondary">{option.time}</Typography>
                                    <Chip
                                      label={displayStatus}
                                      color={getStatusColor(displayStatus) as any}
                                      size="small"
                                      sx={{ mt: 0.75 }}
                                    />
                                    {counts && (
                                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                        Booked {counts.bookedSlots} · Available {counts.availableSlots}
                                      </Typography>
                                    )}
                                  </Box>
                                )}
                              />
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                  />
                </>
              )}
              {errors.session && <FormHelperText error>{errors.session.message}</FormHelperText>}
              {hasSelectedSessionConflict && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  The selected session is unavailable on this date. Choose an available session to continue.
                </Alert>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                Full Day occupies all three slots. Selecting multiple individual slots books each selected slot.
              </Typography>
            </Paper>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 3 }}>Select a hall to view its availability calendar.</Alert>
      )}

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: '#50175d', p: 2 }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Optional Equipment</Typography>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add required equipment to your booking. Charges are calculated based on quantity selected.
          </Typography>
          {equipmentOptions.length === 0 ? (
            <Typography variant="body2">No equipment options are available at the moment.</Typography>
          ) : (
            <Grid container spacing={2}>
              {equipmentOptions.map((item) => {
                const selected = wizard.equipment.find((e) => e.equipmentId === item.id);
                return (
                  <Grid item xs={12} sm={6} md={4} key={item.id}>
                    <Paper variant="outlined" sx={{ p: 2, minHeight: 140 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>{item.equipmentName}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {item.chargeUnit} @ ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Typography>
                      <TextField
                        label="Quantity"
                        type="number"
                        fullWidth
                        value={selected?.quantity ?? 0}
                        onChange={(e) => handleEquipmentChange(item.id, Number(e.target.value))}
                        inputProps={{ min: 0 }}
                        sx={{ mt: 2 }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Paper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" color="primary" size="large" endIcon={validatingAvailability ? <CircularProgress size={18} /> : <ArrowForward />} disabled={hasSelectedSessionConflict || validatingAvailability}>
          {validatingAvailability ? 'Checking availability...' : 'Proceed to Summary'}
        </Button>
      </Box>
    </Box>
  );
};

// ── Step 2: Booking Summary ────────────────────────────────────────────────────
const Step2Summary: React.FC<{ onNext: () => void; onPrev: () => void }> = ({ onNext, onPrev }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const [summary, setSummaryData] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!wizard.venueId || !wizard.venuePricingId) return;
    setLoading(true);
    setError('');
    const payload = {
      venueId: wizard.venueId,
      venuePricingId: wizard.venuePricingId,
      fromDate:  wizard.fromDate,
      toDate:    wizard.toDate,
      session:   wizard.session,
      equipment: wizard.equipment.map((item) => ({ equipmentId: item.equipmentId, quantity: item.quantity })),
    };
    // Helpful debug log for developers (will appear in browser console)
    // eslint-disable-next-line no-console
    console.log('Requesting booking summary with', payload);

    bookingAPI.getSummary(payload)
      .then((r) => {
        setSummaryData(r.data);
        dispatch(setSummary({
          totalDays:       r.data.totalDays,
          baseRent:        r.data.baseRent,
          holidayCharge:   r.data.holidayCharge,
          equipmentCharge: r.data.equipmentCharge,
          securityDeposit: r.data.securityDeposit,
          cgstAmount:      r.data.cgstAmount,
          sgstAmount:      r.data.sgstAmount,
          grandTotal:      r.data.grandTotal,
        }));
      })
      .catch((err: any) => {
        const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
        console.error('Failed to fetch booking summary', err?.response || err);
        setError(serverMsg || 'Failed to calculate booking summary. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [wizard.venueId, wizard.venuePricingId, wizard.fromDate, wizard.toDate, wizard.session, wizard.equipment]);

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return (
    <Box textAlign="center" py={6}><CircularProgress /><Typography sx={{ mt: 2 }}>Calculating summary...</Typography></Box>
  );
  if (error) return <Alert severity="error">{error}</Alert>;

  const sessionLabel = wizard.session === 'FullDay' ? 'Full Day' : wizard.session;
  const rows = [
    { label: 'Venue',                 value: wizard.venueName },
    { label: 'Price Item',            value: wizard.priceItemName },
    { label: 'From Date',            value: new Date(wizard.fromDate).toLocaleDateString('en-IN') },
    { label: 'To Date',              value: new Date(wizard.toDate).toLocaleDateString('en-IN')   },
    { label: 'Session',              value: sessionLabel },
    { label: 'Total Days',           value: `${summary?.totalDays} day(s)`        },
  ];

  const charges = [
    { label: 'Base Rent',            value: fmt(summary?.baseRent)         },
    { label: 'Holiday Charges',      value: fmt(summary?.holidayCharge)    },
    { label: 'Equipment Charges',    value: fmt(summary?.equipmentCharge)  },
    { label: 'Security Deposit',     value: fmt(summary?.securityDeposit)  },
    { label: `CGST (${summary?.cgstPercent}%)`, value: fmt(summary?.cgstAmount) },
    { label: `SGST (${summary?.sgstPercent}%)`, value: fmt(summary?.sgstAmount) },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, color: '#50175d', fontWeight: 700 }}>Booking Summary</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#50175d', p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Booking Details</Typography>
            </Box>
            {rows.map((r) => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{r.value}</Typography>
              </Box>
            ))}
          </Paper>

        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#50175d', p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Cost Breakdown</Typography>
            </Box>
            {charges.map((c) => (
              <Box key={c.label} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{c.value}</Typography>
              </Box>
            ))}
            <Box sx={{ bgcolor: '#50175d', p: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>Grand Total</Typography>
              <Typography variant="subtitle1" sx={{ color: '#d68db8', fontWeight: 800 }}>{fmt(summary?.grandTotal)}</Typography>
            </Box>
          </Paper>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              You will receive your booking ID immediately. Payment is due to confirm your booking.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onPrev} startIcon={<ArrowBack />} variant="outlined">Back</Button>
        <Button onClick={onNext} variant="contained" color="primary" endIcon={<ArrowForward />}>
          Proceed to Applicant Details
        </Button>
      </Box>
    </Box>
  );
};

// ── Step 3: Applicant Details ──────────────────────────────────────────────────
const Step3Applicant: React.FC<{ onNext: () => void; onPrev: () => void }> = ({ onNext, onPrev }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: yupResolver(step3Schema),
    defaultValues: wizard.applicant,
  });

  const idProofType = watch('idProofType');

  const onSubmit = (data: any) => {
    dispatch(setApplicant(data as any));
    onNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h5" sx={{ mb: 3, color: '#50175d', fontWeight: 700 }}>Applicant Details</Typography>
      <Grid container spacing={2.5}>
        {[
          { name: 'fullName',      label: 'Full Name *',              md: 6 },
          { name: 'email',         label: 'Email ID *',               md: 6 },
          { name: 'mobile',        label: 'Mobile Number *',          md: 6 },
          { name: 'alternateMobile', label: 'Alternate Mobile',       md: 6 },
          { name: 'functionName',  label: 'Function Name *',          md: 6 },
          { name: 'expectedGuests', label: 'Expected Guests *', type: 'number', md: 6 },
        ].map(({ name, label, md, type }: any) => (
          <Grid item xs={12} md={md} key={name}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field} label={label} fullWidth type={type || 'text'}
                  error={!!(errors as any)[name]}
                  helperText={(errors as any)[name]?.message}
                />
              )}
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <TextField
                {...field} label="Address *" fullWidth multiline rows={3}
                error={!!errors.address}
                helperText={errors.address?.message}
              />
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="functionType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.functionType}>
                <InputLabel>Function Type *</InputLabel>
                <Select {...field} label="Function Type *">
                  {['Wedding', 'Reception', 'Birthday', 'Corporate Meeting', 'Conference', 'Exhibition', 'Cultural Event', 'Other'].map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>{errors.functionType?.message}</FormHelperText>
              </FormControl>
            )}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Controller
            name="idProofType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.idProofType}>
                <InputLabel>ID Proof Type *</InputLabel>
                <Select {...field} label="ID Proof Type *">
                  <MenuItem value="Aadhaar Card">Aadhaar Card</MenuItem>
                  <MenuItem value="PAN Card">PAN Card</MenuItem>
                  <MenuItem value="Driving License">Driving License</MenuItem>
                </Select>
                <FormHelperText>{errors.idProofType?.message}</FormHelperText>
              </FormControl>
            )}
          />
        </Grid>
        {idProofType && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 1 }}>
              Please upload your {idProofType} (PDF/JPG, max 5MB)
            </Alert>
            <TextField
              type="file"
              label={`Upload ${idProofType} *`}
              fullWidth
              InputLabelProps={{ shrink: true }}
              inputProps={{ accept: '.pdf,.jpg,.jpeg' }}
            />
          </Grid>
        )}
      </Grid>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onPrev} startIcon={<ArrowBack />} variant="outlined">Back</Button>
        <Button type="submit" variant="contained" color="primary" endIcon={<ArrowForward />}>
          Proceed to Bank Details
        </Button>
      </Box>
    </Box>
  );
};

// ── Step 4: Bank Details ───────────────────────────────────────────────────────
const Step4BankDetails: React.FC<{ onNext: () => void; onPrev: () => void }> = ({ onNext, onPrev }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(step4Schema),
    defaultValues: wizard.bankDetail,
  });

  const onSubmit = (data: any) => {
    dispatch(setBankDetail(data as any));
    onNext();
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="h5" sx={{ mb: 3, color: '#50175d', fontWeight: 700 }}>Bank Details</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Your bank details are required for refund processing in case of cancellation.
      </Alert>
      <Grid container spacing={2.5}>
        {[
          { name: 'bankName',          label: 'Bank Name *',            md: 6 },
          { name: 'accountHolderName', label: 'Account Holder Name *',  md: 6 },
          { name: 'accountNumber',     label: 'Account Number *',       md: 6 },
          { name: 'ifscCode',          label: 'IFSC Code *',            md: 6 },
          { name: 'branchName',        label: 'Branch Name *',          md: 6 },
          { name: 'micrCode',          label: 'MICR Code',              md: 6 },
        ].map(({ name, label, md }: any) => (
          <Grid item xs={12} md={md} key={name}>
            <Controller
              name={name}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field} label={label} fullWidth
                  error={!!(errors as any)[name]}
                  helperText={(errors as any)[name]?.message}
                />
              )}
            />
          </Grid>
        ))}
      </Grid>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onPrev} startIcon={<ArrowBack />} variant="outlined">Back</Button>
        <Button type="submit" variant="contained" color="primary" endIcon={<ArrowForward />}>
          Review & Submit
        </Button>
      </Box>
    </Box>
  );
};

// ── Step 5: Confirm & Submit ───────────────────────────────────────────────────
const Step5Confirm: React.FC<{ onPrev: () => void; onComplete: (receipt: { booking: any; payment: any }) => void }> = ({ onPrev, onComplete }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const [loading, setLoading] = useState(false);
  const paymentMethod: 'Card' = 'Card';

  const handleSubmit = async () => {
    setLoading(true);
    try {
      console.log('[handleSubmit] Starting booking submission...');
      const bookingPayload = {
        venueId:        wizard.venueId,
        venuePricingId: wizard.venuePricingId,
        fromDate:    wizard.fromDate,
        toDate:      wizard.toDate,
        session:     wizard.session,
        equipment:   wizard.equipment.map((item) => ({ equipmentId: item.equipmentId, quantity: item.quantity })),
        applicant: {
          fullName:        wizard.applicant.fullName,
          email:           wizard.applicant.email,
          mobile:          wizard.applicant.mobile,
          alternateMobile: wizard.applicant.alternateMobile,
          address:         wizard.applicant.address,
          functionName:    wizard.applicant.functionName,
          functionType:    wizard.applicant.functionType,
          expectedGuests:  wizard.applicant.expectedGuests,
          idProofType:     wizard.applicant.idProofType,
          idProofFile:     wizard.applicant.idProofFile,
        },
        bankDetail: {
          bankName:          wizard.bankDetail.bankName,
          accountHolderName: wizard.bankDetail.accountHolderName,
          accountNumber:     wizard.bankDetail.accountNumber,
          ifscCode:          wizard.bankDetail.ifscCode,
          branchName:        wizard.bankDetail.branchName,
          micrCode:          wizard.bankDetail.micrCode,
        },
      };
      
      // Initiate payment on the server which will create a gateway order when configured
      console.log('[handleSubmit] Initiating payment...');
      const init = await paymentAPI.initiate({ 
        amount: wizard.grandTotal,
        paymentMethod, 
        customerName: wizard.applicant.fullName, 
        customerEmail: wizard.applicant.email, 
        customerMobile: wizard.applicant.mobile 
      });
      const initData = init.data || {};
      console.log('[handleSubmit] Payment initiation response:', initData);

      // If backend returned a gateway order (Razorpay), open checkout
      if (initData.gatewayOrderId && initData.gatewayKey) {
        console.log('[handleSubmit] Opening Razorpay checkout...');
        // dynamically load Razorpay script
        const loadScript = (src: string) => new Promise<boolean>((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => {
            console.log('[loadScript] Razorpay script loaded');
            resolve(true);
          };
          script.onerror = () => {
            console.error('[loadScript] Failed to load Razorpay script');
            resolve(false);
          };
          document.body.appendChild(script);
        });

        const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!ok) throw new Error('Failed to load payment gateway script.');

        const options: any = {
          key: initData.gatewayKey,
          amount: initData.amount, // amount in paise
          currency: initData.currency || 'INR',
          name: 'Hutatma Mandir',
          description: `Venue booking for ${wizard.applicant.fullName}`,
          order_id: initData.gatewayOrderId,
          prefill: {
            name: initData.customerName || wizard.applicant.fullName,
            email: initData.customerEmail || wizard.applicant.email,
            contact: initData.customerMobile || wizard.applicant.mobile,
          },
          handler: async (response: any) => {
            try {
              console.log('[handler] Payment successful, response:', response);
              const completeResponse = await paymentAPI.complete({
                transactionRef: initData.transactionRef || '',
                paymentMethod,
                paymentDate: null,
                gatewayPaymentId: response.razorpay_payment_id,
                gatewayOrderId: response.razorpay_order_id,
                gatewaySignature: response.razorpay_signature,
                booking: bookingPayload,
              });
              console.log('[handler] Payment verification complete:', completeResponse.data);
              dispatch(setBookingResult({ bookingNumber: completeResponse.data.bookingNumber, bookingId: completeResponse.data.bookingId }));
              onComplete(buildPaymentReceipt(wizard, completeResponse.data));
            } catch (e: any) {
              console.error('[handler] Payment verification error:', e);
              toast.error(e?.response?.data?.error || 'Payment verification failed. Please contact support.');
            }
          },
          modal: {
            ondismiss: () => {
              console.log('[modal] Payment cancelled by user');
              toast.info('Payment was cancelled. Your booking remains pending until payment is completed.');
            }
          }
        };

        console.log('[handleSubmit] Creating Razorpay instance with options:', options);
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        console.log('[handleSubmit] No gateway order, using fallback for mock provider');
        // Fallback for mock provider: complete immediately
        const completeResponse = await paymentAPI.complete({
          transactionRef: initData.transactionRef || '',
          paymentMethod,
          paymentDate: null,
          booking: bookingPayload,
        });
        dispatch(setBookingResult({ bookingNumber: completeResponse.data.bookingNumber, bookingId: completeResponse.data.bookingId }));
        onComplete(buildPaymentReceipt(wizard, completeResponse.data));
      }
    } catch (err: any) {
      console.error('[handleSubmit] Error:', err);
      const errorMsg = err?.response?.data?.error || err?.message || 'An unexpected error occurred';
      console.error('[handleSubmit] Showing error toast:', errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, color: '#50175d', fontWeight: 700 }}>Review & Confirm</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Booking Details</Typography>
            <Divider sx={{ mb: 1.5 }} />
            {[
              ['Venue',      wizard.venueName],
              ['Price Item', wizard.priceItemName],
              ['From Date',  new Date(wizard.fromDate).toLocaleDateString('en-IN')],
              ['To Date',    new Date(wizard.toDate).toLocaleDateString('en-IN')],
              ['Session',    wizard.session === 'FullDay' ? 'Full Day' : wizard.session],
              ['Grand Total', fmt(wizard.grandTotal)],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">{k}</Typography>
                <Typography variant="body2" fontWeight={600}>{v}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Applicant Details</Typography>
            <Divider sx={{ mb: 1.5 }} />
            {[
              ['Name',     wizard.applicant.fullName],
              ['Email',    wizard.applicant.email],
              ['Mobile',   wizard.applicant.mobile],
              ['Function', wizard.applicant.functionName],
              ['Guests',   String(wizard.applicant.expectedGuests)],
            ].map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">{k}</Typography>
                <Typography variant="body2" fontWeight={600}>{v}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight={600}>Important Notice</Typography>
        <Typography variant="body2">
          Submitting this form reserves your selected date and session immediately — there is no admin approval step.
          Your booking is automatically confirmed once the payment gateway completes successfully.
          Do NOT make payment to any unauthorized account.
        </Typography>
      </Alert>
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onPrev} startIcon={<ArrowBack />} variant="outlined" disabled={loading}>Back</Button>
        <Button
          onClick={handleSubmit}
          variant="contained" color="success" size="large"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : <Payment />}
        >
          {loading ? 'Processing...' : 'Make Payment'}
        </Button>
      </Box>
    </Box>
  );
};

const buildPaymentReceipt = (wizard: RootState['booking'], payment: any) => ({
  booking: {
    id: payment.bookingId,
    bookingNumber: payment.bookingNumber,
    receiptNumber: payment.receiptNumber,
    venueName: wizard.venueName,
    priceItemName: wizard.priceItemName,
    fromDate: wizard.fromDate,
    toDate: wizard.toDate,
    session: wizard.session,
    totalDays: wizard.totalDays,
    baseRent: wizard.baseRent,
    holidayCharge: wizard.holidayCharge,
    equipmentCharge: wizard.equipmentCharge,
    securityDeposit: wizard.securityDeposit,
    cgstAmount: wizard.cgstAmount,
    sgstAmount: wizard.sgstAmount,
    grandTotal: wizard.grandTotal,
    status: 'Confirmed',
    applicantName: wizard.applicant.fullName,
    applicantMobile: wizard.applicant.mobile,
    applicantAlternateMobile: wizard.applicant.alternateMobile,
    applicantEmail: wizard.applicant.email,
    applicantAddress: wizard.applicant.address,
    functionName: wizard.applicant.functionName,
    functionType: wizard.applicant.functionType,
    expectedGuests: wizard.applicant.expectedGuests,
    idProofType: wizard.applicant.idProofType,
    equipmentItems: wizard.equipment,
    bankDetail: {
      bankName: wizard.bankDetail.bankName,
      accountHolderName: wizard.bankDetail.accountHolderName,
      accountNumber: wizard.bankDetail.accountNumber,
      ifscCode: wizard.bankDetail.ifscCode,
      branchName: wizard.bankDetail.branchName,
      micrCode: wizard.bankDetail.micrCode,
    },
  },
  payment: {
    transactionRef: payment.transactionRef,
    paymentDate: payment.paymentDate,
    paymentMethod: payment.paymentMethod,
    status: payment.status,
    amount: payment.amount,
  },
});

// ── Success Screen ─────────────────────────────────────────────────────────────
const BookingSuccess: React.FC<{ receipt: { booking: any; payment: any } }> = ({ receipt }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const navigate = useNavigate();

  return (
    <Box textAlign="center" py={4}>
      <CheckCircle sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
      <Typography variant="h4" sx={{ color: '#50175d', fontWeight: 700, mb: 1 }}>
        Payment Successful — Booking Confirmed
      </Typography>
      <Typography variant="h5" sx={{ color: '#d68db8', fontWeight: 800, mb: 2 }}>
        Booking ID: {wizard.bookingNumber}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
        Your payment has been verified and your booking is confirmed. Your receipt is ready below.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 3, displayPrint: 'none' }}>
        <Button variant="contained" startIcon={<Download />} onClick={() => window.print()}>
          Download Receipt
        </Button>
        <Button variant="outlined" onClick={() => { dispatch(resetBooking()); navigate('/'); }}>
          Back to Home
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, displayPrint: 'none' }}>
        In the print dialog, choose “Save as PDF” to download a copy.
      </Typography>
      <Receipt booking={receipt.booking} payment={receipt.payment} />
    </Box>
  );
};

// ── Main Booking Page ─────────────────────────────────────────────────────────
const BookingPage: React.FC = () => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const [completed, setCompleted] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{ booking: any; payment: any } | null>(null);
  const theme = useTheme();
  const compactSteps = useMediaQuery(theme.breakpoints.down('sm'));

  const step    = wizard.step;
  const onNext  = () => dispatch(nextStep());
  const onPrev  = () => dispatch(prevStep());

  return (
    <Box sx={{ bgcolor: '#fbf6fa', minHeight: '100vh', py: { xs: 2, sm: 3, md: 4 } }}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={{ xs: 2.5, sm: 4 }}>
          <Typography variant="h4" sx={{ color: '#50175d', fontWeight: 700 }}>
            Book Your Venue
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            Complete all steps to submit your booking request
          </Typography>
        </Box>

        {!completed && (
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
            {compactSteps ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {steps[step]?.icon}
                  <Typography variant="subtitle2" fontWeight={700}>{`Step ${step + 1} of ${steps.length}: ${steps[step]?.label}`}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={((step + 1) / steps.length) * 100} />
              </Box>
            ) : (
              <Stepper activeStep={step} alternativeLabel>
                {steps.map((s, i) => (
                  <Step key={s.label} completed={i < step}>
                    <StepLabel>{s.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
          {completed ? (
            paymentReceipt && <BookingSuccess receipt={paymentReceipt} />
          ) : (
            <>
              {step === 0 && <Step1Availability onNext={onNext} />}
              {step === 1 && <Step2Summary onNext={onNext} onPrev={onPrev} />}
              {step === 2 && <Step3Applicant onNext={onNext} onPrev={onPrev} />}
              {step === 3 && <Step4BankDetails onNext={onNext} onPrev={onPrev} />}
              {step === 4 && (
                <Step5Confirm
                  onPrev={onPrev}
                  onComplete={(receipt) => {
                    setPaymentReceipt(receipt);
                    setCompleted(true);
                  }}
                />
              )}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default BookingPage;
