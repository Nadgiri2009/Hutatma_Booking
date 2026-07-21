import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { Search, Print } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { bookingAPI, paymentAPI } from '../../services/api';
import { toast } from 'react-toastify';
import Receipt from '../../components/Receipt';

const AdminReceiptsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch]     = useState(searchParams.get('bookingNumber') || '');
  const [booking, setBooking]   = useState<any>(null);
  const [payment, setPayment]   = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async (bookingNumber: string) => {
    if (!bookingNumber.trim()) { toast.warning('Enter a booking ID'); return; }
    setLoading(true);
    setSearched(true);
    setBooking(null);
    setPayment(null);
    try {
      const r = await bookingAPI.getByNumber(bookingNumber.trim());
      setBooking(r.data);
      if (r.data?.id) {
        try {
          const p = await paymentAPI.getByBooking(r.data.id);
          const paid = (p.data || []).find((x: any) => x.status === 'Paid') || (p.data || [])[0];
          setPayment(paid || null);
        } catch { /* payment lookup is best-effort */ }
      }
    } catch {
      toast.error('No booking found for that Booking ID');
    } finally {
      setLoading(false);
    }
  };

  // Auto-search if a booking number was passed in via the URL (e.g. from the
  // Bookings / Payments pages' "Print Receipt" action).
  useEffect(() => {
    const initial = searchParams.get('bookingNumber');
    if (initial) runSearch(initial);
  }, [searchParams]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} color="primary.main" sx={{ displayPrint: 'none' }}>
        Print Receipt
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, displayPrint: 'none' }}>
        Search for a booking to view and print its official receipt.
      </Typography>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, displayPrint: 'none' }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth size="small"
            placeholder="Enter Booking ID (e.g. HSM-2024-00001)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && runSearch(search)}
          />
          <Button
            variant="contained" startIcon={<Search />}
            onClick={() => runSearch(search)} disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={18} /> : 'Search'}
          </Button>
        </Box>
      </Paper>

      {searched && !loading && !booking && (
        <Alert severity="info" sx={{ displayPrint: 'none' }}>No booking found for that Booking ID.</Alert>
      )}

      {booking && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1, displayPrint: 'none' }}>
            <Button variant="contained" startIcon={<Print />} onClick={() => window.print()}>
              Print Receipt
            </Button>
          </Box>
          <Receipt booking={booking} payment={payment} />
        </Box>
      )}
    </Box>
  );
};

export default AdminReceiptsPage;
