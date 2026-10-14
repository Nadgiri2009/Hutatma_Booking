import React from 'react';
import { Box, Paper, Typography, Grid, Divider, Chip, GlobalStyles } from '@mui/material';
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
  <Box className="receipt-row" sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px dashed #e2e8f0' }}>
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
    <>
    <GlobalStyles styles={{
      '@media print': {
        '@page': { size: 'A4 portrait', margin: '8mm' },
        'html, body': {
          margin: '0 !important',
          padding: '0 !important',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        },
        'body *': { visibility: 'hidden' },
        '#receipt-printable, #receipt-printable *': { visibility: 'visible' },
        '#receipt-printable': {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '194mm',
          maxWidth: '194mm',
          margin: 0,
          boxShadow: 'none',
          border: 0,
          borderRadius: 0,
          overflow: 'visible',
          fontSize: '9pt',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        },
        '#receipt-printable .receipt-letterhead': {
          padding: '5mm 7mm',
          gap: '2mm',
        },
        '#receipt-printable .receipt-content': {
          padding: '5mm 7mm',
        },
        '#receipt-printable .receipt-booking-strip': {
          marginBottom: '3mm',
          gap: '2mm',
        },
        '#receipt-printable .receipt-section': {
          marginBottom: '3mm',
          padding: '2.5mm 3mm',
          border: '0.25mm solid #dce3ed',
          borderRadius: '1mm',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        },
        '#receipt-printable .receipt-section-grid': {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '6mm',
          rowGap: '1mm',
          margin: 0,
        },
        '#receipt-printable .receipt-row': {
          paddingTop: '1mm',
          paddingBottom: '1mm',
          minHeight: '5mm',
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        },
        '#receipt-printable .receipt-section-grid .MuiTypography-root': {
          fontSize: '9pt',
          lineHeight: 1.3,
        },
        '#receipt-printable .receipt-section-title': {
          fontSize: '10pt',
          marginTop: 0,
          marginBottom: '2mm',
        },
        '#receipt-printable .receipt-charges-title': {
          marginTop: '3mm',
        },
        '#receipt-printable .receipt-amount-paid': {
          marginTop: '3mm',
          padding: '2.5mm 3mm',
        },
        '#receipt-printable .receipt-amount-paid .MuiTypography-root': {
          fontSize: '10pt',
        },
        '#receipt-printable .receipt-divider': {
          marginTop: '2mm',
          marginBottom: '2mm',
        },
        '#receipt-printable .receipt-footer': {
          marginTop: '1mm',
          rowGap: '2mm',
        },
        '#receipt-printable .receipt-footer .MuiTypography-root': {
          fontSize: '8pt',
          lineHeight: 1.35,
        },
        '#receipt-printable .receipt-signatory': {
          paddingTop: '1mm',
          minWidth: '35mm',
        },
      },
    }} />
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
      <Box className="receipt-letterhead" sx={{
        background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)', color: '#fff', px: 4, py: 3,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AccountBalanceIcon sx={{ fontSize: 40, color: '#f0c7df' }} />
          <Box>
            <Typography variant="h6" fontWeight={800}>Hutatma Smruti Mandir</Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Venue Booking System
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#f0c7df', letterSpacing: 1 }}>
            PAYMENT RECEIPT
          </Typography>
          <Typography variant="body2">Receipt No: {b.receiptNumber || '—'}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Issued: {fmtDate(payDate) !== '—' ? fmtDate(payDate) : new Date().toLocaleDateString('en-IN')}
          </Typography>
        </Box>
      </Box>

      <Box className="receipt-content" sx={{ px: 4, py: 3 }}>
        {/* Booking number + status strip */}
        <Box className="receipt-booking-strip" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body1" fontWeight={700} color="primary.main">
            Booking ID: {b.bookingNumber}
          </Typography>
          <Chip
            label={b.status === 'Confirmed' ? 'Confirmed & Paid' : b.status}
            color={b.status === 'Confirmed' ? 'success' : 'warning'}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Box className="receipt-section">
          <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
            1. Applicant / Customer Details
          </Typography>
          <Box className="receipt-section-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
            <Row label="Name" value={b.applicantName} />
            <Row label="Mobile" value={b.applicantMobile} />
            {b.applicantAlternateMobile && <Row label="Alternate Mobile" value={b.applicantAlternateMobile} />}
            <Row label="Email" value={b.applicantEmail || '—'} />
            <Row label="Address" value={b.applicantAddress || '—'} />
            {b.expectedGuests > 0 && <Row label="Expected Guests" value={b.expectedGuests} />}
            {b.idProofType && <Row label="ID Proof Type" value={b.idProofType} />}
          </Box>
        </Box>

        <Box className="receipt-section">
          <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
            2. Venue &amp; Booking Details
          </Typography>
          <Box className="receipt-section-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
            <Box>
              <Row label="Venue" value={b.venueName} />
              <Row label="Purpose" value={b.priceItemName} />
              {b.functionName && <Row label="Function" value={b.functionName} />}
              {b.functionType && <Row label="Function Type" value={b.functionType} />}
              <Row label="From Date" value={fmtDate(b.fromDate)} />
              <Row label="To Date" value={fmtDate(b.toDate)} />
              <Row label="Session" value={sessionLabel(b.session)} />
              <Row label="Total Days" value={`${b.totalDays} day(s)`} />
            </Box>
            <Box>
              <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
                Charges
              </Typography>
              <Row label="Base Rent" value={fmtCurrency(b.baseRent)} />
              <Row label="Holiday Charges" value={fmtCurrency(b.holidayCharge)} />
              <Row label="Equipment Charges" value={fmtCurrency(b.equipmentCharge)} />
              {b.equipmentItems?.map((item: any) => (
                <Row
                  key={item.equipmentId || item.equipmentName}
                  label={`${item.equipmentName} (${item.quantity} ${item.chargeUnit || 'unit(s)'})`}
                  value={fmtCurrency(item.totalPrice)}
                />
              ))}
              <Row label="Security Deposit" value={fmtCurrency(b.securityDeposit)} />
              <Row label="CGST" value={fmtCurrency(b.cgstAmount)} />
              <Row label="SGST" value={fmtCurrency(b.sgstAmount)} />
              <Box className="receipt-amount-paid" sx={{
                mt: 2,
                px: 1.5,
                py: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: 1,
                background: 'linear-gradient(110deg, #b45490 0%, #48145e 100%)',
              }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700 }}>Amount Paid</Typography>
                <Typography variant="subtitle1" sx={{ color: '#f0c7df', fontWeight: 800 }}>{fmtCurrency(amountPaid)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="receipt-section">
          <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
            3. Payment &amp; Bank Details
          </Typography>
          <Box className="receipt-section-grid" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
            <Box>
              <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
                Payment Details
              </Typography>
              <Row label="Payment Method" value={payMethod} />
              <Row label="Transaction Ref." value={txnRef || '—'} />
              <Row label="Payment Date" value={fmtDate(payDate)} />
              <Row label="Payment Status" value={payStatus} />
            </Box>
            <Box>
              <Typography className="receipt-section-title" variant="subtitle2" fontWeight={700} color="primary.main">
                Bank Account Details for Refund
              </Typography>
              {b.bankDetail ? (
                <>
                  <Row label="Account Holder" value={b.bankDetail.accountHolderName} />
                  <Row label="Bank Name" value={b.bankDetail.bankName} />
                  <Row label="Account Number" value={b.bankDetail.accountNumber} />
                  <Row label="IFSC Code" value={b.bankDetail.ifscCode} />
                  <Row label="Branch" value={b.bankDetail.branchName} />
                  {b.bankDetail.micrCode && <Row label="MICR Code" value={b.bankDetail.micrCode} />}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Bank account details not provided.</Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider className="receipt-divider" sx={{ my: 3 }} />

        {/* Footer / signature */}
        <Grid container spacing={2} className="receipt-footer" sx={{ mt: 1 }}>
          <Grid item xs={12} md={7}>
            <Typography variant="caption" color="text.secondary">
              This is a system-generated receipt and is valid proof of payment for the booking referenced above.
              Please retain this receipt for your records and present it if requested at the venue.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Box className="receipt-signatory" sx={{ display: 'inline-block', borderTop: '1px solid #cbd5e1', pt: 1, minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Authorized Signatory</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
    </>
  );
};

export default Receipt;
