import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, MenuItem, Select,
  FormControl, InputLabel, Tooltip, CircularProgress, Avatar, InputAdornment,
} from '@mui/material';
import { Add, Edit, Block, CheckCircle, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/users');
      setUsers(r.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openForm = (user?: any) => {
    setEditing(user || null);
    reset(user
      ? { fullName: user.fullName, email: user.email, mobile: user.mobile, roleId: user.roleId }
      : { fullName: '', email: '', mobile: '', roleId: 2, password: '' }
    );
    setOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, data);
        toast.success('User updated!');
      } else {
        await api.post('/users', data);
        toast.success('User created!');
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Transaction failed');
    }
  };

  const toggleStatus = async (user: any) => {
    try {
      await api.put(`/users/${user.id}`, { ...user, isActive: !user.isActive });
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}!`);
      load();
    } catch { toast.error('Failed to update user status'); }
  };

  const roleColors: any = { Admin: 'error', Staff: 'warning', User: 'info' };

  const getInitials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">User Management</Typography>
          <Typography variant="body2" color="text.secondary">Manage admin and staff accounts</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => openForm()}>Add User</Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>}
              {users.map((u, i) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#50175d', width: 34, height: 34, fontSize: '0.8rem' }}>
                        {getInitials(u.fullName)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>{u.fullName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{u.email}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{u.mobile}</Typography></TableCell>
                  <TableCell>
                    <Chip label={u.role?.name || u.roleName} color={roleColors[u.role?.name] || 'default'} size="small" sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Active' : 'Inactive'}
                      color={u.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{new Date(u.createdAt).toLocaleDateString('en-IN')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small" color="primary" onClick={() => openForm(u)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title={u.isActive ? 'Deactivate' : 'Activate'}>
                      <IconButton size="small" color={u.isActive ? 'error' : 'success'} onClick={() => toggleStatus(u)}>
                        {u.isActive ? <Block fontSize="small" /> : <CheckCircle fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#50175d', color: '#fff' }}>
          {editing ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                label="Full Name *" fullWidth size="small"
                error={!!errors.fullName}
                helperText={(errors.fullName as any)?.message}
                {...register('fullName', { required: 'Full name required' })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email Address *" type="email" fullWidth size="small"
                error={!!errors.email}
                helperText={(errors.email as any)?.message}
                {...register('email', { required: 'Email required' })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Mobile Number *" fullWidth size="small"
                error={!!errors.mobile}
                helperText={(errors.mobile as any)?.message}
                {...register('mobile', { required: 'Mobile required' })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Role *</InputLabel>
                <Select defaultValue={editing?.roleId || 2} label="Role *" {...register('roleId')}>
                  <MenuItem value={1}>Admin</MenuItem>
                  <MenuItem value={2}>Staff</MenuItem>
                  <MenuItem value={3}>User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {!editing && (
              <Grid item xs={12} md={6}>
                <TextField
                  label="Password *"
                  type={showPass ? 'text' : 'password'}
                  fullWidth size="small"
                  error={!!errors.password}
                  helperText={(errors.password as any)?.message}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPass((v) => !v)}>
                          {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  {...register('password', !editing ? { required: 'Password required', minLength: { value: 8, message: 'Min 8 chars' } } : {})}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            {editing ? 'Update' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
