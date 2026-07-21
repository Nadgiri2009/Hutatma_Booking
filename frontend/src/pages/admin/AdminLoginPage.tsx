import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, InputAdornment,
  IconButton, Alert, CircularProgress, Avatar, Divider,
} from '@mui/material';
import {
  AccountBalance, Visibility, VisibilityOff, Lock, Email, Login,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { setCredentials } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';

interface LoginForm { email: string; password: string; }

const AdminLoginPage: React.FC = () => {
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const dispatch  = useDispatch();
  const navigate  = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(data.email, data.password);
      dispatch(setCredentials({
        token:    res.data.token,
        fullName: res.data.fullName,
        role:     res.data.role,
      }));
      toast.success(`Welcome back, ${res.data.fullName}!`);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
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
          onSubmit={handleSubmit(onSubmit)}
          sx={{ p: 4 }}
        >
          <Typography variant="h6" fontWeight={700} color="primary.main" mb={3} textAlign="center">
            Sign In to Continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Email Address"
            fullWidth
            type="email"
            sx={{ mb: 2.5 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter valid email' },
            })}
          />

          <TextField
            label="Password"
            fullWidth
            type={showPass ? 'text' : 'password'}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock sx={{ color: '#94a3b8' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPass((v) => !v)} edge="end" size="small">
                    {showPass ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
          />

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
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

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
