import React, { useState, useEffect } from 'react';
import {
  Box, Container, Paper, Stepper, Step, StepLabel, Typography,
  Button, Grid, TextField, MenuItem, Select, FormControl, InputLabel,
  FormHelperText, Chip, Alert, CircularProgress, Divider, Card, CardContent,
} from '@mui/material';
import {
  CheckCircle, ArrowBack, ArrowForward, EventAvailable,
  Assignment, AccountBalance, Payment, ConfirmationNumber,
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

const steps = [
  { label: 'Availability',      icon: <EventAvailable /> },
  { label: 'Booking Summary',   icon: <Assignment />     },
  { label: 'Applicant Details', icon: <Assignment />     },
  { label: 'Bank Details',      icon: <AccountBalance /> },
  { label: 'Confirm & Submit',  icon: <Payment />        },
];

// ── Schemas ───────────────────────────────────────────────────────────────────
const step1Schema = yup.object({
  venueId:        yup.number().required('Please select a venue').positive(),
  venuePricingId: yup.number().required('Please select a price item').positive(),
  priceItemName:  yup.string().required(),
  fromDate:   yup.string().required('From date is required'),
  toDate:     yup.string().required('To date is required'),
  session:    yup.string().oneOf(['Morning', 'Evening', 'FullDay']).required('Please select a session'),
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
  const [slots, setSlots]           = useState<any[]>([]);
  const [checking, setChecking]     = useState(false);

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
    venueAPI.getAll().then((r) => setVenues(r.data)).catch(() => {});
  }, []);

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

  useEffect(() => {
    if (venueId && fromDate && toDate && fromDate <= toDate) {
      setChecking(true);
      bookingAPI.checkAvailability({ venueId, fromDate, toDate })
        .then((r) => setSlots(r.data.slots || []))
        .catch(() => {})
        .finally(() => setChecking(false));
    }
  }, [venueId, fromDate, toDate]);

  // Keep priceItemName in sync for validation (required in schema)
  useEffect(() => {
    const p = pricingOptions.find((p) => p.id === venuePricingId);
    if (p) setValue('priceItemName', p.priceItemName);
  }, [venuePricingId, pricingOptions]);

  const getStatusColor = (status: string) => {
    if (status === 'Available')   return 'success';
    if (status === 'Booked')      return 'error';
    return 'default';
  };

  // Status field on a slot that corresponds to the currently selected session
  const statusForSession = (slot: any, sess: string) => {
    if (sess === 'Morning') return slot.morningStatus;
    if (sess === 'Evening') return slot.eveningStatus;
    return slot.fullDayStatus;
  };

  const hasSelectedSessionConflict = slots.some((slot: any) => statusForSession(slot, session) === 'Booked');

  const onSubmit = (data: any) => {
    // Re-validate the selected Venue + Date + Session combination before
    // moving on — the same check runs again on the server at final
    // submission to close any race-condition window.
    if (hasSelectedSessionConflict) {
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
      <Typography variant="h5" sx={{ mb: 3, color: '#1a3a6b', fontWeight: 700 }}>
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
            name="session"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.session}>
                <InputLabel>Session *</InputLabel>
                <Select {...field} label="Session *">
                  <MenuItem value="Morning">Morning</MenuItem>
                  <MenuItem value="Evening">Evening</MenuItem>
                  <MenuItem value="FullDay">Full Day</MenuItem>
                </Select>
                <FormHelperText>
                  {errors.session?.message || 'A Morning and an Evening booking can co-exist on the same date; Full Day blocks the whole date.'}
                </FormHelperText>
              </FormControl>
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

      {/* Availability Calendar */}
      {checking && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ mt: 1, color: '#5a6a7e' }}>Checking availability...</Typography>
        </Box>
      )}

      {slots.length > 0 && !checking && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#1a3a6b' }}>Availability Calendar</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip label="Available" color="success" size="small" />
            <Chip label="Booked" color="error" size="small" />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 2 }}>
              {slots.map((slot: any, i: number) => (
                <Card key={i} variant="outlined" sx={{ p: 0, border: statusForSession(slot, session) === 'Booked' ? '1px solid #d32f2f' : undefined }}>
                  <Box sx={{ bgcolor: '#1a3a6b', p: 1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
                      {new Date(slot.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Chip label={`Morning: ${slot.morningStatus}`} color={getStatusColor(slot.morningStatus) as any} size="small" sx={{ fontSize: '0.65rem' }} />
                    <Chip label={`Evening: ${slot.eveningStatus}`} color={getStatusColor(slot.eveningStatus) as any} size="small" sx={{ fontSize: '0.65rem' }} />
                    <Chip label={`Full Day: ${slot.fullDayStatus}`} color={getStatusColor(slot.fullDayStatus) as any} size="small" sx={{ fontSize: '0.65rem' }} />
                  </Box>
                </Card>
              ))}
            </Box>
          </Box>
          {hasSelectedSessionConflict && (
            <Alert severity="error" sx={{ mt: 2 }}>
              The selected <strong>{session}</strong> session is already booked on one or more of these dates for this venue.
              Please pick a different date, venue, or session.
            </Alert>
          )}
        </Box>
      )}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" color="primary" size="large" endIcon={<ArrowForward />} disabled={hasSelectedSessionConflict}>
          Proceed to Summary
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
  const [equipmentOptions, setEquipmentOptions] = useState<VenueEquipment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    venueAPI.getEquipment()
      .then((r) => setEquipmentOptions(r.data || []))
      .catch(() => setEquipmentOptions([]));
  }, []);

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
  }, [wizard.venueId, wizard.venuePricingId, wizard.fromDate, wizard.toDate, wizard.equipment]);

  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

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
      <Typography variant="h5" sx={{ mb: 3, color: '#1a3a6b', fontWeight: 700 }}>Booking Summary</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#1a3a6b', p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Booking Details</Typography>
            </Box>
            {rows.map((r) => (
              <Box key={r.label} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">{r.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{r.value}</Typography>
              </Box>
            ))}
          </Paper>

          <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#1a3a6b', p: 2 }}>
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
                      <Grid item xs={12} md={6} key={item.id}>
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
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: '#1a3a6b', p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 600 }}>Cost Breakdown</Typography>
            </Box>
            {charges.map((c) => (
              <Box key={c.label} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                <Typography variant="body2" fontWeight={600}>{c.value}</Typography>
              </Box>
            ))}
            <Box sx={{ bgcolor: '#1a3a6b', p: 2, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>Grand Total</Typography>
              <Typography variant="subtitle1" sx={{ color: '#c9a227', fontWeight: 800 }}>{fmt(summary?.grandTotal)}</Typography>
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
      <Typography variant="h5" sx={{ mb: 3, color: '#1a3a6b', fontWeight: 700 }}>Applicant Details</Typography>
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
      <Typography variant="h5" sx={{ mb: 3, color: '#1a3a6b', fontWeight: 700 }}>Bank Details</Typography>
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
const Step5Confirm: React.FC<{ onPrev: () => void; onComplete: () => void }> = ({ onPrev, onComplete }) => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'UPI'>('Card');

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
              onComplete();
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
        onComplete();
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
      <Typography variant="h5" sx={{ mb: 3, color: '#1a3a6b', fontWeight: 700 }}>Review & Confirm</Typography>
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
      <Paper variant="outlined" sx={{ mt: 3, p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Select payment method</Typography>
        <FormControl fullWidth>
          <InputLabel>Payment Method</InputLabel>
          <Select
            value={paymentMethod}
            label="Payment Method"
            onChange={(e) => setPaymentMethod(e.target.value as 'Card' | 'UPI')}
          >
            <MenuItem value="Card">Debit/Credit Card</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
          </Select>
          <FormHelperText>Choose how you would like to complete the payment.</FormHelperText>
        </FormControl>
      </Paper>
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

// ── Success Screen ─────────────────────────────────────────────────────────────
const BookingSuccess: React.FC = () => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const navigate = useNavigate();

  return (
    <Box textAlign="center" py={4}>
      <CheckCircle sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
      <Typography variant="h4" sx={{ color: '#1a3a6b', fontWeight: 700, mb: 1 }}>
        Booking Submitted Successfully!
      </Typography>
      <Typography variant="h5" sx={{ color: '#c9a227', fontWeight: 800, mb: 2 }}>
        Booking ID: {wizard.bookingNumber}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto', mb: 4 }}>
        Your date and session are now reserved — there is no admin approval step. Your booking will be
        automatically confirmed as soon as the payment gateway records a successful payment. Please save your Booking ID for future reference.
      </Typography>
      <Alert severity="info" sx={{ textAlign: 'left', maxWidth: 500, mx: 'auto', mb: 3 }}>
        <strong>Next Steps:</strong>
        <ol>
          <li>Complete the secure payment using your selected debit/credit card or UPI option</li>
          <li>Your booking is confirmed automatically once the payment succeeds</li>
          <li>Receive SMS and email notifications with your receipt details</li>
          <li>Download or print your official receipt</li>
        </ol>
      </Alert>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/print-booking')}>
          View Booking Details
        </Button>
        <Button variant="outlined" onClick={() => { dispatch(resetBooking()); navigate('/'); }}>
          Back to Home
        </Button>
      </Box>
    </Box>
  );
};

// ── Main Booking Page ─────────────────────────────────────────────────────────
const BookingPage: React.FC = () => {
  const dispatch = useDispatch();
  const wizard   = useSelector((s: RootState) => s.booking);
  const [completed, setCompleted] = useState(false);

  const step    = wizard.step;
  const onNext  = () => dispatch(nextStep());
  const onPrev  = () => dispatch(prevStep());

  return (
    <Box sx={{ bgcolor: '#f5f7fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" sx={{ color: '#1a3a6b', fontWeight: 700 }}>
            Book Your Venue
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            Complete all steps to submit your booking request
          </Typography>
        </Box>

        {!completed && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Stepper activeStep={step} alternativeLabel>
              {steps.map((s, i) => (
                <Step key={s.label} completed={i < step}>
                  <StepLabel>{s.label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
          {completed ? (
            <BookingSuccess />
          ) : (
            <>
              {step === 0 && <Step1Availability onNext={onNext} />}
              {step === 1 && <Step2Summary onNext={onNext} onPrev={onPrev} />}
              {step === 2 && <Step3Applicant onNext={onNext} onPrev={onPrev} />}
              {step === 3 && <Step4BankDetails onNext={onNext} onPrev={onPrev} />}
              {step === 4 && <Step5Confirm onPrev={onPrev} onComplete={() => setCompleted(true)} />}
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default BookingPage;
