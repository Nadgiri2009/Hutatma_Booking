import React from 'react';
import { Box, Paper, Typography, Grid, Divider, Chip } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

// ── Professional single-page Receipt ──────────────────────────────────────────
// Used by:
//  - Public "Print Booking Details" page (applicant prints their own receipt)
//  - Admin "Print Receipt" page (office staff prints an official copy)
//
// `booking` matches the shape returned by bookingAPI.getByNumber/getByMobile
// (camelCase BookingResponseDto). `payment` is optional extra detail only the
// admin view has access to (paymentAPI.getByBooking); when omitted, the
// receipt falls back to the payment summary already present on the booking.

export interface ReceiptPayment {
  transactionRef?: string | null;
  paymentDate?:    string | null;
  paymentMethod?:  string | null;
  status?:         string | null;
  amount?:         number | null;
}

export interface ReceiptProps {
  booking: any;
  payment?: ReceiptPayment | null;
}

const fmtCurrency = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const sessionLabel = (s?: string) => (s === 'FullDay' ? 'Full Day' : (s || '—'));

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px dashed #e2e8f0' }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>{value}</Typography>
  </Box>
);

const Receipt: React.FC<ReceiptProps> = ({ booking: b, payment }) => {
  const txnRef     = payment?.transactionRef ?? b.paymentTransactionRef;
  const payDate    = payment?.paymentDate    ?? b.paymentDate;
  const payMethod  = payment?.paymentMethod  ?? 'Bank Transfer';
  const payStatus  = payment?.status         ?? b.paymentStatus ?? (b.status === 'Confirmed' ? 'Paid' : 'Pending');
  const amountPaid = payment?.amount ?? b.grandTotal;

  return (
    <Paper
      id="receipt-printable"
      variant="outlined"
      sx={{
        maxWidth: 800,
        mx: 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        '@media print': { boxShadow: 'none', border: 'none', maxWidth: '100%' },
      }}
    >
      {/* Letterhead */}
      <Box sx={{
        bgcolor: '#1a3a6b', color: '#fff', px: 4, py: 3,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon sx={{ fontSize: 40, color: '#c9a227' }} />
          <Box>
            <Typography variant="h6" fontWeight={800}>Hutatma Smruti Mandir</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Venue Booking System
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#c9a227', letterSpacing: 1 }}>
            PAYMENT RECEIPT
          </Typography>
          <Typography variant="body2">Receipt No: {b.receiptNumber || '—'}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Issued: {fmtDate(payDate) !== '—' ? fmtDate(payDate) : new Date().toLocaleDateString('en-IN')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 4, py: 3 }}>
        {/* Booking number + status strip */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body1" fontWeight={700} color="primary.main">
            Receipt No: {b.bookingNumber}
          </Typography>
          <Chip
            label={b.status === 'Confirmed' ? 'Confirmed & Paid' : b.status}
            color={b.status === 'Confirmed' ? 'success' : 'warning'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={4}>
          {/* Customer Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
              Customer Details
            </Typography>
            <Row label="Name"    value={b.applicantName} />
            <Row label="Mobile"  value={b.applicantMobile} />
            <Row label="Email"   value={b.applicantEmail || '—'} />
            <Row label="Address" value={b.applicantAddress || '—'} />
          </Grid>

          {/* Venue / Booking Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
              Venue &amp; Booking Details
            </Typography>
            <Row label="Venue"       value={b.venueName} />
            <Row label="Purpose"     value={b.priceItemName} />
            {b.functionName && <Row label="Function" value={b.functionName} />}
            <Row label="From Date"   value={fmtDate(b.fromDate)} />
            <Row label="To Date"     value={fmtDate(b.toDate)} />
            <Row label="Session"     value={sessionLabel(b.session)} />
            <Row label="Total Days"  value={`${b.totalDays} day(s)`} />
          </Grid>

          {/* Payment Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom sx={{ mt: 1 }}>
              Payment Details
            </Typography>
            <Row label="Payment Method"      value={payMethod} />
            <Row label="Transaction Ref."     value={txnRef || '—'} />
            <Row label="Payment Date"         value={fmtDate(payDate)} />
            <Row label="Payment Status"       value={payStatus} />
          </Grid>

          {/* Charges Breakdown */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom sx={{ mt: 1 }}>
              Charges
            </Typography>
            <Row label="Base Rent"          value={fmtCurrency(b.baseRent)} />
            <Row label="Holiday Charges"     value={fmtCurrency(b.holidayCharge)} />
            <Row label="Equipment Charges"   value={fmtCurrency(b.equipmentCharge)} />
            <Row label="Security Deposit"    value={fmtCurrency(b.securityDeposit)} />
            <Row label="CGST"                value={fmtCurrency(b.cgstAmount)} />
            <Row label="SGST"                value={fmtCurrency(b.sgstAmount)} />
          </Grid>
        </Grid>

        {/* Grand total */}
        <Box sx={{
          mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          bgcolor: '#1a3a6b', borderRadius: 1, px: 3, py: 1.5,
        }}>
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700 }}>
            Amount Paid
          </Typography>
          <Typography variant="h6" sx={{ color: '#c9a227', fontWeight: 800 }}>
            {fmtCurrency(amountPaid)}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Footer / signature */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={7}>
            <Typography variant="caption" color="text.secondary">
              This is a system-generated receipt and is valid proof of payment for the booking referenced above.
              Please retain this receipt for your records and present it if requested at the venue.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Box sx={{ display: 'inline-block', borderTop: '1px solid #cbd5e1', pt: 1, minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Authorized Signatory</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default Receipt;
