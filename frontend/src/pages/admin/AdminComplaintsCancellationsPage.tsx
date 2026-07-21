import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Tooltip, CircularProgress,
  Alert, MenuItem, Select, FormControl, InputLabel, Pagination,
} from '@mui/material';
import { Visibility, Check, Refresh, ReportProblem, Cancel } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../../services/api';

// ── COMPLAINTS ────────────────────────────────────────────────────────────────
export const AdminComplaintsPage: React.FC = () => {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selected, setSelected]       = useState<any>(null);
  const [resolution, setResolution]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/complaints', { params: { status: statusFilter || undefined } });
      setItems(r.data?.items || r.data || []);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleResolve = async () => {
    if (!resolution.trim()) { toast.warning('Enter resolution text'); return; }
    try {
      await api.put(`/complaints/${selected.id}/resolve`, { resolution });
      toast.success('Complaint resolved!');
      setResolveOpen(false);
      setResolution('');
      load();
    } catch { toast.error('Failed to resolve complaint'); }
  };

  const statusColors: any = {
    Open:       'error',
    InProgress: 'warning',
    Resolved:   'success',
    Closed:     'default',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Complaints</Typography>
          <Typography variant="body2" color="text.secondary">Track and resolve applicant complaints</Typography>
        </Box>
        <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={load}>Refresh</Button>
      </Box>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select value={statusFilter} label="Filter by Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Open">Open</MenuItem>
            <MenuItem value="InProgress">In Progress</MenuItem>
            <MenuItem value="Resolved">Resolved</MenuItem>
            <MenuItem value="Closed">Closed</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                    <ReportProblem sx={{ fontSize: 48, mb: 1, display: 'block', mx: 'auto' }} />
                    No complaints found
                  </TableCell>
                </TableRow>
              )}
              {items.map((c, i) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{c.applicantName}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.mobile}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.bookingId
                      ? <Typography variant="body2" color="primary.main" fontWeight={600}>#{c.bookingId}</Typography>
                      : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{c.subject}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.description?.substring(0, 50)}...</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.status} color={statusColors[c.status]} size="small" sx={{ fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(c.createdAt).toLocaleDateString('en-IN')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View & Resolve">
                      <IconButton size="small" color="primary" onClick={() => { setSelected(c); setResolveOpen(true); }}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={resolveOpen} onClose={() => setResolveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>
          Complaint Details
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selected && (
            <>
              <Grid container spacing={2}>
                {[
                  ['Applicant', selected.applicantName],
                  ['Mobile',    selected.mobile],
                  ['Subject',   selected.subject],
                  ['Status',    selected.status],
                ].map(([k, v]) => (
                  <Grid item xs={6} key={k}>
                    <Typography variant="caption" color="text.secondary">{k}</Typography>
                    <Typography variant="body2" fontWeight={600}>{v}</Typography>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 0.5, borderRadius: 1.5, bgcolor: '#f8fafc' }}>
                    <Typography variant="body2">{selected.description}</Typography>
                  </Paper>
                </Grid>
              </Grid>
              {selected.status !== 'Resolved' && selected.status !== 'Closed' && (
                <TextField
                  label="Resolution *" fullWidth multiline rows={3}
                  sx={{ mt: 2 }}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe the steps taken to resolve this complaint..."
                />
              )}
              {(selected.resolution) && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <strong>Resolution:</strong> {selected.resolution}
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setResolveOpen(false)}>Close</Button>
          {selected?.status !== 'Resolved' && selected?.status !== 'Closed' && (
            <Button variant="contained" color="success" startIcon={<Check />} onClick={handleResolve}>
              Mark Resolved
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── CANCELLATIONS ─────────────────────────────────────────────────────────────
export const AdminCancellationsPage: React.FC = () => {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processOpen, setProcessOpen]   = useState(false);
  const [selected, setSelected]         = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/cancellations');
      setItems(r.data?.items || r.data || []);
    } catch { toast.error('Failed to load cancellations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleProcess = async () => {
    try {
      await api.put(`/cancellations/${selected.id}/process`, { refundAmount: Number(refundAmount) });
      toast.success('Cancellation processed!');
      setProcessOpen(false);
      load();
    } catch { toast.error('Failed to process cancellation'); }
  };

  const refundColors: any = { Pending: 'warning', Processed: 'success', Rejected: 'error' };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Cancellations</Typography>
          <Typography variant="body2" color="text.secondary">Manage booking cancellation requests and refunds</Typography>
        </Box>
        <Button startIcon={<Refresh />} variant="outlined" size="small" onClick={load}>Refresh</Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Requested By</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Refund Amount</TableCell>
                <TableCell>Refund Status</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: '#94a3b8' }}>
                    <Cancel sx={{ fontSize: 48, mb: 1, display: 'block', mx: 'auto' }} />
                    No cancellation requests
                  </TableCell>
                </TableRow>
              )}
              {items.map((c, i) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {c.booking?.bookingNumber || `#${c.bookingId}`}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2">{c.requestedBy}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>{c.reason}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {c.refundAmount > 0 ? `₹${c.refundAmount.toLocaleString('en-IN')}` : 'Pending'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.refundStatus} color={refundColors[c.refundStatus] || 'default'} size="small" sx={{ fontSize: '0.72rem' }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(c.createdAt).toLocaleDateString('en-IN')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {c.refundStatus === 'Pending' && (
                      <Tooltip title="Process Refund">
                        <IconButton size="small" color="warning" onClick={() => { setSelected(c); setRefundAmount(''); setProcessOpen(true); }}>
                          <Check fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="View Details">
                      <IconButton size="small" color="info">
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={processOpen} onClose={() => setProcessOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>Process Refund</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selected && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ensure refund has been transferred to applicant's bank account before marking as processed.
              </Alert>
              <Typography variant="body2" color="text.secondary" gutterBottom>Reason: {selected.reason}</Typography>
              <TextField
                label="Refund Amount (₹) *" type="number" fullWidth sx={{ mt: 2 }}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                inputProps={{ min: 0 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setProcessOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" startIcon={<Check />} onClick={handleProcess}>
            Confirm Processed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
