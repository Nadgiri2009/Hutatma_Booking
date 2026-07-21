import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, CircularProgress,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { holidayAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

// ── Holidays ──────────────────────────────────────────────────────────────────
const AdminHolidaysPage: React.FC = () => {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    setLoading(true);
    holidayAPI.getAll().then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (item?: any) => {
    setEditing(item || null);
    reset(item || { holidayDate: '', name: '', description: '', isActive: true });
    setOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        await holidayAPI.update(editing.id, data);
        toast.success('Holiday updated!');
      } else {
        await holidayAPI.create(data);
        toast.success('Holiday added!');
      }
      setOpen(false);
      load();
    } catch { toast.error('Operation failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this holiday?')) return;
    await holidayAPI.delete(id);
    toast.success('Holiday removed.');
    load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Holiday Management</Typography>
          <Typography variant="body2" color="text.secondary">Manage public holidays for surcharge calculation</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => openForm()}>Add Holiday</Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Holiday Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>}
              {items.map((h, i) => (
                <TableRow key={h.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {new Date(h.holidayDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </Typography>
                  </TableCell>
                  <TableCell><Typography variant="body2" fontWeight={500}>{h.name}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{h.description || '—'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: h.isActive ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                      {h.isActive ? 'Active' : 'Inactive'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openForm(h)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(h.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a3a6b', color: '#fff' }}>
          {editing ? 'Edit Holiday' : 'Add Holiday'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField label="Holiday Date *" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }} {...register('holidayDate', { required: 'Date required' })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Holiday Name *" fullWidth size="small"
                {...register('name', { required: 'Name required' })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={2} size="small"
                {...register('description')} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>
            {editing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};


export default AdminHolidaysPage;
