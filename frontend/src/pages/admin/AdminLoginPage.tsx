import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, InputAdornment,
  Alert, CircularProgress, Avatar, Divider,
} from '@mui/material';
import { AccountBalance, Phone, Login, VpnKey } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';

const AdminLoginPage: React.FC = () => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mobile, setMobile]     = useState('');
  const [otp, setOtp]           = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const requestOtp = async () => {
    if (!/^\d{10}$/.test(mobile.trim())) {
      setError('Enter the 10-digit admin mobile number.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.requestOtp(mobile.trim());
      setOtpRequested(true);
      toast.info(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to request a one-time code.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit code shown in the backend terminal.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOtp(mobile.trim(), otp);
      dispatch(setCredentials({
        token:    res.data.token,
        fullName: res.data.fullName,
        role:     res.data.role,
      }));
      toast.success(`Welcome back, ${res.data.fullName}!`);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'The code is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f2340 0%, #1a3a6b 50%, #2d5ea8 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 4,
            background: 'linear-gradient(135deg, #0f2340 0%, #1a3a6b 100%)',
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 70, height: 70,
              bgcolor: '#c9a227',
              mx: 'auto', mb: 2,
              fontSize: '1.8rem',
            }}
          >
            <AccountBalance sx={{ fontSize: 36 }} />
          </Avatar>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>
            Hutatma Smruti Mandir
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
            Admin Control Panel
          </Typography>
        </Box>

        {/* Form */}
        <Box
          component="form"
          onSubmit={(event) => { event.preventDefault(); otpRequested ? verifyOtp() : requestOtp(); }}
          sx={{ p: 4 }}
        >
          <Typography variant="h6" fontWeight={700} color="primary.main" mb={3} textAlign="center">
            {otpRequested ? 'Enter Verification Code' : 'Sign In to Continue'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Admin Mobile Number"
            fullWidth
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
            inputProps={{ inputMode: 'numeric', maxLength: 10, autoComplete: 'tel' }}
            disabled={otpRequested || loading}
            sx={{ mb: 2.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Phone sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
          />

          {otpRequested && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                If this is an active admin account, the one-time code is printed in the backend terminal.
              </Alert>
              <TextField
                label="Six-digit OTP"
                fullWidth
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><VpnKey sx={{ color: '#94a3b8' }} /></InputAdornment> }}
                sx={{ mb: 3 }}
                autoFocus
              />
            </>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Login />}
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {loading ? 'Please wait...' : otpRequested ? 'Verify OTP' : 'Send OTP'}
          </Button>

          {otpRequested && (
            <Button fullWidth variant="text" onClick={() => { setOtpRequested(false); setOtp(''); setError(''); }} disabled={loading} sx={{ mt: 1 }}>
              Change mobile number
            </Button>
          )}

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Button variant="text" onClick={() => navigate('/')} size="small" sx={{ color: '#5a6a7e' }}>
              ← Back to Public Website
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminLoginPage;
