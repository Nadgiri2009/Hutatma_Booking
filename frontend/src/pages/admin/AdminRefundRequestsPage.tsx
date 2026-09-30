import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, Paper,
  TextField, Typography,
} from '@mui/material';
import { CheckCircleOutline, Close, FactCheck, Print, Refresh, Visibility } from '@mui/icons-material';
import { refundAPI } from '../../services/api';
import { toast } from 'react-toastify';

type RefundRequest = {
  id: number;
  refundRequestNumber: string;
  status: string;
  refundAmount?: number | null;
  requestedAt: string;
  updatedAt?: string;
  verifiedBy?: number | null;
  verifiedAt?: string | null;
  approvedBy?: number | null;
  approvedAt?: string | null;
  processedBy?: number | null;
  processedAt?: string | null;
  rejectionReason?: string | null;
  applicationNumber: string;
  applicantName: string;
  contactNumber: string;
  venue: string;
  fromDate: string;
  toDate: string;
  session: string;
  bookingAmount: number;
  depositAmount: number;
  paymentReferences: Array<{
    amount: number;
    paymentMethod: string;
    transactionRef?: string;
    gatewayPaymentId?: string;
    paymentDate?: string;
  }>;
};

const money = (value?: number | null) => value == null ? 'Not set' : `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-IN') : '—';
const bookingDate = (item: RefundRequest) => item.fromDate === item.toDate ? item.fromDate : `${item.fromDate} to ${item.toDate}`;
const statusColor = (status: string): 'default' | 'info' | 'success' | 'error' | 'warning' =>
  ({ Requested: 'warning', 'Under Verification': 'info', Approved: 'success', Processing: 'info', Processed: 'success', Rejected: 'error' }[status] as any) || 'default';

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box sx={{ py: 0.75 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
  </Box>
);

const AdminRefundRequestsPage: React.FC = () => {
  const [items, setItems] = useState<RefundRequest[]>([]);
  const [selected, setSelected] = useState<RefundRequest | null>(null);
  const [printItem, setPrintItem] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await refundAPI.getAll();
      setItems(response.data || []);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Refund requests could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runAction = async (item: RefundRequest, action: 'verify' | 'approve' | 'reject' | 'start-processing' | 'process') => {
    setBusyId(item.id);
    setError('');
    try {
      if (action === 'verify') await refundAPI.verify(item.id);
      if (action === 'approve') await refundAPI.approve(item.id, Number(approveAmount));
      if (action === 'reject') await refundAPI.reject(item.id, rejectReason.trim());
      if (action === 'start-processing') await refundAPI.startProcessing(item.id);
      if (action === 'process') await refundAPI.process(item.id);
      toast.success(`Refund request ${item.refundRequestNumber} updated.`);
      setApproveOpen(false);
      setRejectOpen(false);
      await load();
      if (selected?.id === item.id) {
        const response = await refundAPI.getAll();
        setSelected((response.data || []).find((entry: RefundRequest) => entry.id === item.id) || null);
      }
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'The refund request could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  const printRequest = (item: RefundRequest) => {
    setPrintItem(item);
    window.setTimeout(() => window.print(), 100);
  };

  const actionButtons = (item: RefundRequest) => (
    <>
      {item.status === 'Requested' && <Button size="small" startIcon={<FactCheck />} onClick={() => runAction(item, 'verify')} disabled={busyId === item.id}>Verify</Button>}
      {item.status === 'Requested' && (
        <Button size="small" color="error" startIcon={<Close />} onClick={() => { setSelected(item); setRejectReason(''); setRejectOpen(true); }}>Reject</Button>
      )}
      {item.status === 'Under Verification' && (
        <Button size="small" color="success" startIcon={<CheckCircleOutline />} onClick={() => { setSelected(item); setApproveAmount(''); setApproveOpen(true); }}>Approve</Button>
      )}
      {item.status === 'Approved' && <Button size="small" color="success" startIcon={<CheckCircleOutline />} onClick={() => runAction(item, 'start-processing')} disabled={busyId === item.id}>Start Processing</Button>}
      {item.status === 'Processing' && <Button size="small" color="success" startIcon={<CheckCircleOutline />} onClick={() => runAction(item, 'process')} disabled={busyId === item.id}>Mark Processed</Button>}
    </>
  );

  return (
    <>
    <style>{`@page { size: A4; margin: 16mm; } @media print { body * { visibility: hidden !important; } body .refund-printable, body .refund-printable * { visibility: visible !important; } body .refund-printable { display: block !important; position: fixed !important; inset: 0 auto auto 0 !important; width: 100% !important; border: 0 !important; box-shadow: none !important; } }`}</style>
    <Box sx={{
      '@media print': {
        '@page': { size: 'A4', margin: '16mm' },
        '& *': { visibility: 'hidden' },
        '& .refund-printable, & .refund-printable *': { visibility: 'visible' },
        '& .refund-printable': { display: 'block !important', position: 'absolute', left: 0, top: 0, width: '100%', border: 'none', boxShadow: 'none' },
      },
    }}>
      <Box className="refund-screen-only" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Refund Requests</Typography>
          <Typography variant="body2" color="text.secondary">Review and process citizen refund applications.</Typography>
        </Box>
        <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={load} disabled={loading}>Refresh</Button>
      </Box>
      {error && <Alert className="refund-screen-only" severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !items.length && <Box className="refund-screen-only" sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}
      {!loading && !items.length && !error && <Paper className="refund-screen-only" variant="outlined" sx={{ textAlign: 'center', py: 6, borderRadius: 1.5 }}><Typography fontWeight={700}>No refund requests</Typography></Paper>}

      <Grid container spacing={2} className="refund-screen-only">
        {items.map((item) => (
          <Grid item xs={12} md={6} key={item.id}>
            <Card variant="outlined" sx={{ height: '100%', borderRadius: 1.5, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                  <Box><Typography variant="overline" color="text.secondary">Refund Request</Typography><Typography variant="subtitle1" fontWeight={800} color="primary.main">{item.refundRequestNumber}</Typography></Box>
                  <Chip size="small" label={item.status} color={statusColor(item.status)} />
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}><Info label="Application Number" value={item.applicationNumber} /></Grid>
                  <Grid item xs={6}><Info label="Applicant" value={item.applicantName} /></Grid>
                  <Grid item xs={6}><Info label="Contact Number" value={item.contactNumber} /></Grid>
                  <Grid item xs={6}><Info label="Venue / Hall" value={item.venue} /></Grid>
                  <Grid item xs={6}><Info label="Booking Date / Slot" value={`${bookingDate(item)} · ${item.session}`} /></Grid>
                  <Grid item xs={6}><Info label="Booking Amount" value={money(item.bookingAmount)} /></Grid>
                  <Grid item xs={6}><Info label="Deposit Amount" value={money(item.depositAmount)} /></Grid>
                  <Grid item xs={6}><Info label="Refund Amount" value={money(item.refundAmount)} /></Grid>
                  <Grid item xs={6}><Info label="Request Date" value={dateTime(item.requestedAt)} /></Grid>
                  <Grid item xs={6}><Info label="Last Updated" value={dateTime(item.updatedAt || item.requestedAt)} /></Grid>
                  <Grid item xs={6}><Info label="Payment Reference" value={item.paymentReferences.map((p) => p.transactionRef || p.gatewayPaymentId).filter(Boolean).join(', ') || 'Not available'} /></Grid>
                </Grid>
              </CardContent>
              <Divider />
              <CardActions sx={{ px: 2, py: 1, flexWrap: 'wrap' }}>
                <Button size="small" startIcon={<Visibility />} onClick={() => setSelected(item)}>View Details</Button>
                <Button size="small" startIcon={<Print />} onClick={() => printRequest(item)}>Print</Button>
                {actionButtons(item)}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {printItem && (
        <Paper className="refund-printable" variant="outlined" sx={{ display: 'none', p: 3, color: '#111', borderRadius: 0 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={800}>Hutatma Smruti Mandir</Typography>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>REFUND REQUEST</Typography>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={6}><Info label="Application Number" value={printItem.applicationNumber} /></Grid>
            <Grid item xs={6}><Info label="Refund Request Number" value={printItem.refundRequestNumber} /></Grid>
            <Grid item xs={6}><Info label="Applicant Name" value={printItem.applicantName} /></Grid>
            <Grid item xs={6}><Info label="Contact Number" value={printItem.contactNumber} /></Grid>
            <Grid item xs={6}><Info label="Venue / Hall" value={printItem.venue} /></Grid>
            <Grid item xs={6}><Info label="Booking Date / Slot" value={`${bookingDate(printItem)} · ${printItem.session}`} /></Grid>
            <Grid item xs={6}><Info label="Booking Amount" value={money(printItem.bookingAmount)} /></Grid>
            <Grid item xs={6}><Info label="Deposit Amount" value={money(printItem.depositAmount)} /></Grid>
            <Grid item xs={6}><Info label="Refund Amount" value={money(printItem.refundAmount)} /></Grid>
            <Grid item xs={6}><Info label="Refund Status" value={printItem.status} /></Grid>
            <Grid item xs={6}><Info label="Request Date" value={dateTime(printItem.requestedAt)} /></Grid>
            <Grid item xs={6}><Info label="Verified" value={`${dateTime(printItem.verifiedAt)}${printItem.verifiedBy ? ` · Staff #${printItem.verifiedBy}` : ''}`} /></Grid>
            <Grid item xs={6}><Info label="Approved" value={`${dateTime(printItem.approvedAt)}${printItem.approvedBy ? ` · Staff #${printItem.approvedBy}` : ''}`} /></Grid>
            <Grid item xs={6}><Info label="Processed" value={`${dateTime(printItem.processedAt)}${printItem.processedBy ? ` · Staff #${printItem.processedBy}` : ''}`} /></Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={700}>Payment Details</Typography>
          {printItem.paymentReferences.map((payment, index) => <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>{payment.paymentMethod} · {money(payment.amount)} · Ref: {payment.transactionRef || payment.gatewayPaymentId || 'Not available'} · Date: {payment.paymentDate || '—'}</Typography>)}
          {printItem.rejectionReason && <Typography variant="body2" sx={{ mt: 2 }}>Rejection reason: {printItem.rejectionReason}</Typography>}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 8, gap: 4 }}>
            <Box sx={{ borderTop: '1px solid #333', width: 190, pt: 1 }}><Typography variant="caption">Processing Officer Signature</Typography></Box>
            <Box sx={{ borderTop: '1px solid #333', width: 150, pt: 1 }}><Typography variant="caption">Official Stamp</Typography></Box>
          </Box>
        </Paper>
      )}

      <Dialog open={Boolean(selected) && !approveOpen && !rejectOpen} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        {selected && <>
          <DialogTitle>Refund Request Details</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><Info label="Refund Request Number / Status" value={`${selected.refundRequestNumber} · ${selected.status}`} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Application Number" value={selected.applicationNumber} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Applicant / Contact" value={`${selected.applicantName} · ${selected.contactNumber}`} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Venue / Date / Slot" value={`${selected.venue} · ${bookingDate(selected)} · ${selected.session}`} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Booking Amount / Deposit" value={`${money(selected.bookingAmount)} / ${money(selected.depositAmount)}`} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Refund Amount" value={money(selected.refundAmount)} /></Grid>
              <Grid item xs={12} sm={6}><Info label="Request Date" value={dateTime(selected.requestedAt)} /></Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700}>Payment Details</Typography>
            {selected.paymentReferences.map((p, i) => <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>{p.paymentMethod} · {money(p.amount)} · Ref: {p.transactionRef || p.gatewayPaymentId || 'Not available'} · {p.paymentDate || '—'}</Typography>)}
            {selected.rejectionReason && <Alert severity="error" sx={{ mt: 2 }}>{selected.rejectionReason}</Alert>}
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', p: 2 }}>
            <Button startIcon={<Print />} onClick={() => printRequest(selected)}>Print</Button>{actionButtons(selected)}<Button onClick={() => setSelected(null)}>Close</Button>
          </DialogActions>
        </>}
      </Dialog>

      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Refund Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Enter the refund amount approved under the applicable official process. Recorded paid amount: {selected ? money(selected.paymentReferences.reduce((total, payment) => total + payment.amount, 0)) : ''}.</Typography>
          <TextField autoFocus fullWidth type="number" label="Approved Refund Amount" value={approveAmount} onChange={(event) => setApproveAmount(event.target.value)} inputProps={{ min: 0.01, step: 0.01 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => selected && runAction(selected, 'approve')} disabled={!approveAmount || Number(approveAmount) <= 0 || busyId === selected?.id}>Approve</Button></DialogActions>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Refund Request</DialogTitle>
        <DialogContent><TextField fullWidth multiline minRows={3} label="Reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></DialogContent>
        <DialogActions><Button onClick={() => setRejectOpen(false)}>Cancel</Button><Button color="error" variant="contained" onClick={() => selected && runAction(selected, 'reject')} disabled={!rejectReason.trim() || busyId === selected?.id}>Reject</Button></DialogActions>
      </Dialog>
    </Box>
    </>
  );
};

export default AdminRefundRequestsPage;
