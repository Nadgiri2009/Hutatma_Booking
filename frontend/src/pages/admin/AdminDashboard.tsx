import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  Avatar, Button, CircularProgress, Tooltip,
} from '@mui/material';
import {
  ConfirmationNumber, HourglassEmpty, CheckCircle,
  AttachMoney, Report, TrendingUp, Visibility, AssignmentReturn,
  Print, Refresh,
} from '@mui/icons-material';
import { dashboardAPI, refundAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  PendingPayment: 'warning',
  Confirmed:      'success',
  Cancelled:      'default',
};

const paymentColor: Record<string, 'warning' | 'success' | 'error'> = {
  Pending: 'warning',
  Paid:    'success',
  Failed:  'error',
};

interface StatCard { label: string; value: string | number; icon: React.ReactNode; color: string; bg: string; onClick?: () => void; }

const StatCard: React.FC<StatCard> = ({ label, value, icon, color, bg, onClick }) => (
  <Card
    onClick={onClick}
    onKeyDown={onClick ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } } : undefined}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    sx={{ height: '100%', position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', '&:focus-visible': { outline: '2px solid #50175d', outlineOffset: 2 } }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
            {label}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color }}>
            {value}
          </Typography>
        </Box>
        <Avatar sx={{ bgcolor: bg, width: 52, height: 52 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: color, opacity: 0.6 }} />
  </Card>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refundCount, setRefundCount] = useState(0);

  const load = () => {
    setLoading(true);
    dashboardAPI.get()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
    refundAPI.getAll()
      .then((r) => setRefundCount((r.data || []).length))
      .catch(() => toast.error('Failed to load refund request count'));
  };

  useEffect(() => { load(); }, []);

  const printReceipt = (b: any) => navigate(`/admin/receipts?bookingNumber=${encodeURIComponent(b.bookingNumber)}`);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress size={48} />
    </Box>
  );

  const stats: Array<StatCard & { path?: string }> = [
    { label: 'Total Bookings',    value: data?.totalBookings          || 0, icon: <ConfirmationNumber />, color: '#50175d', bg: 'rgba(80,23,93,0.12)'  },
    { label: 'Payment Pending',  value: data?.pendingPaymentBookings || 0, icon: <HourglassEmpty />,    color: '#ed6c02', bg: 'rgba(237,108,2,0.12)'   },
    { label: 'Confirmed',         value: data?.confirmedBookings      || 0, icon: <CheckCircle />,       color: '#2e7d32', bg: 'rgba(46,125,50,0.12)'   },
    { label: 'Cancelled',         value: data?.cancelledBookings      || 0, icon: <Report />,            color: '#5a6a7e', bg: 'rgba(90,106,126,0.12)'  },
    { label: 'Refund',            value: refundCount,                    icon: <AssignmentReturn />,  color: '#0288d1', bg: 'rgba(2,136,209,0.12)', path: '/admin/refunds' },
    { label: 'Total Revenue',     value: `₹${(data?.totalRevenue || 0).toLocaleString('en-IN')}`,
                                                                       icon: <AttachMoney />,       color: '#b45490', bg: 'rgba(180,84,144,0.12)'  },
  ];
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening at Hutatma Smruti Mandir.
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={load} variant="outlined" size="small">
          Refresh
        </Button>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2.5} mb={4}>
        {stats.map(({ path, ...s }) => (
          <Grid item xs={12} sm={6} lg={4} key={s.label}>
            <StatCard {...s} onClick={path ? () => navigate(path) : undefined} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Bookings Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={700} color="primary.main">
            Recent Bookings
          </Typography>
          <Button size="small" variant="text" href="/admin/bookings">View All →</Button>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Booking ID</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Dates</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.recentBookings || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#5a6a7e' }}>
                    No bookings yet
                  </TableCell>
                </TableRow>
              )}
              {(data?.recentBookings || []).map((b: any, i: number) => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontSize: '0.8rem', color: '#5a6a7e' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {b.bookingNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{b.applicantName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.applicantMobile}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{b.venueName}</Typography>
                    <Typography variant="caption" color="text.secondary">{b.priceItemName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(b.fromDate).toLocaleDateString('en-IN')} –{' '}
                      {new Date(b.toDate).toLocaleDateString('en-IN')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      ₹{b.grandTotal?.toLocaleString('en-IN')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={b.status}
                      color={statusColor[b.status] || 'default'}
                      size="small"
                      sx={{ fontSize: '0.72rem' }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info">
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print Receipt">
                        <IconButton size="small" color="default" onClick={() => printReceipt(b)}>
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
      </Paper>
    </Box>
  );
};

export default AdminDashboard;
