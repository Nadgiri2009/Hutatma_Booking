import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardMedia, CardContent, CardActions,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
  CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Chip, Switch, FormControlLabel, Alert,
} from '@mui/material';
import { Add, Delete, Image, VideoLibrary, Edit, Notifications } from '@mui/icons-material';
import { galleryAPI, noticeAPI } from '../../services/api';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

type GalleryFormValues = {
  title: string;
  description: string;
  displayOrder: number;
  mediaType: 'Photo' | 'Video';
  filePath: string;
  videoURL: string;
};

// ── GALLERY MANAGER ──────────────────────────────────────────────────────────
export const AdminGalleryPage: React.FC = () => {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState<'Photo' | 'Video'>('Photo');

  const { register, handleSubmit, reset, watch } = useForm<GalleryFormValues>({
    defaultValues: {
      title: '',
      description: '',
      mediaType: 'Photo',
      filePath: '',
      videoURL: '',
      displayOrder: 0,
    },
  });
  const mediaType = watch('mediaType');

  const load = () => {
    setLoading(true);
    galleryAPI.getAll().then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: any) => {
    try {
      await galleryAPI.create(data);
      toast.success('Gallery item added!');
      setOpen(false);
      reset();
      load();
    } catch { toast.error('Failed to add item'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remove this gallery item?')) return;
    await galleryAPI.delete(id);
    toast.success('Item removed.');
    load();
  };

  const filtered = items.filter((i) => i.mediaType === tab);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Gallery Manager</Typography>
          <Typography variant="body2" color="text.secondary">Manage photos and videos shown on the public website</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => { reset(); setOpen(true); }}>
          Add Media
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {(['Photo', 'Video'] as const).map((t) => (
          <Button
            key={t}
            variant={tab === t ? 'contained' : 'outlined'}
            startIcon={t === 'Photo' ? <Image /> : <VideoLibrary />}
            onClick={() => setTab(t)}
          >
            {t}s ({items.filter((i) => i.mediaType === t).length})
          </Button>
        ))}
      </Box>

      {loading && <Box textAlign="center" py={6}><CircularProgress /></Box>}

      <Grid container spacing={2}>
        {filtered.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Card sx={{ height: '100%' }}>
              {item.thumbnailPath || (item.mediaType === 'Photo' && item.filePath) ? (
                <CardMedia
                  component="img"
                  height={180}
                  image={item.thumbnailPath || item.filePath}
                  alt={item.title}
                  sx={{ objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{ height: 180, display: 'grid', placeItems: 'center', bgcolor: 'action.hover' }}>
                  {item.mediaType === 'Photo' ? <Image sx={{ fontSize: 48, color: 'text.disabled' }} /> : <VideoLibrary sx={{ fontSize: 48, color: 'text.disabled' }} />}
                </Box>
              )}
              <CardContent sx={{ pb: 0 }}>
                <Typography variant="subtitle2" fontWeight={600} noWrap>{item.title}</Typography>
                {item.description && (
                  <Typography variant="caption" color="text.secondary">{item.description?.substring(0, 60)}...</Typography>
                )}
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={item.mediaType}
                    size="small"
                    color={item.mediaType === 'Photo' ? 'info' : 'secondary'}
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`Order: ${item.displayOrder}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Tooltip title="Delete">
                  <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
        {!loading && filtered.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={6} sx={{ color: '#94a3b8' }}>
              <Image sx={{ fontSize: 64, mb: 1 }} />
              <Typography>No {tab.toLowerCase()}s added yet. Click "Add Media" to get started.</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#50175d', color: '#fff' }}>Add Gallery Item</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Media Type</InputLabel>
                <Select defaultValue="Photo" label="Media Type" {...register('mediaType')}>
                  <MenuItem value="Photo">Photo</MenuItem>
                  <MenuItem value="Video">Video</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Display Order" type="number" fullWidth size="small"
                {...register('displayOrder')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Title *" fullWidth size="small"
                {...register('title', { required: true })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth size="small" multiline rows={2}
                {...register('description')} />
            </Grid>
            {mediaType === 'Photo' ? (
              <Grid item xs={12}>
                <Alert severity="info">Upload functionality requires backend file upload endpoint at /api/upload</Alert>
                <TextField label="Image File Path / URL" fullWidth size="small" sx={{ mt: 1 }}
                  {...register('filePath')} />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <TextField label="YouTube / Video URL" fullWidth size="small"
                  placeholder="https://www.youtube.com/embed/..."
                  {...register('videoURL')} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit(onSubmit)}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ── NOTICES MANAGER ───────────────────────────────────────────────────────────
export const AdminNoticesPage: React.FC = () => {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    setLoading(true);
    noticeAPI.getAll().then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openForm = (item?: any) => {
    setEditing(item || null);
    reset(item || {
      title: '', content: '', isImportant: false,
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: '', isActive: true,
    });
    setOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) { await noticeAPI.update(editing.id, data); toast.success('Notice updated!'); }
      else         { await noticeAPI.create(data);             toast.success('Notice published!'); }
      setOpen(false);
      load();
    } catch { toast.error('Transaction failed'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this notice?')) return;
    await noticeAPI.delete(id);
    toast.success('Notice deleted.');
    load();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Notices</Typography>
          <Typography variant="body2" color="text.secondary">Publish important announcements on the public website</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => openForm()}>Add Notice</Button>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Important</TableCell>
                <TableCell>Publish Date</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={28} /></TableCell></TableRow>}
              {!loading && items.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: '#94a3b8' }}>No notices published</TableCell></TableRow>
              )}
              {items.map((n, i) => (
                <TableRow key={n.id} hover>
                  <TableCell sx={{ color: '#94a3b8' }}>{i + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{n.content?.substring(0, 60)}...</Typography>
                  </TableCell>
                  <TableCell>
                    {n.isImportant
                      ? <Chip label="⚠ Important" color="error" size="small" />
                      : <Chip label="Normal" size="small" variant="outlined" />}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(n.publishDate).toLocaleDateString('en-IN')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {n.expiryDate ? new Date(n.expiryDate).toLocaleDateString('en-IN') : 'No expiry'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: n.isActive ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                      {n.isActive ? 'Active' : 'Inactive'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => openForm(n)}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(n.id)}><Delete fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#50175d', color: '#fff' }}>
          {editing ? 'Edit Notice' : 'Publish Notice'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField label="Notice Title *" fullWidth size="small"
                {...register('title', { required: 'Title required' })} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Content *" fullWidth multiline rows={4} size="small"
                {...register('content', { required: 'Content required' })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Publish Date *" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                {...register('publishDate', { required: 'Date required' })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Expiry Date" type="date" fullWidth size="small"
                InputLabelProps={{ shrink: true }}
                {...register('expiryDate')} />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch {...register('isImportant')} defaultChecked={editing?.isImportant} />}
                label="Mark as Important (shown with warning on homepage)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Notifications />} onClick={handleSubmit(onSubmit)}>
            {editing ? 'Update' : 'Publish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
