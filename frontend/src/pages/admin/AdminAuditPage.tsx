import React, { FormEvent, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField,
  Typography,
} from '@mui/material';
import { Download, PictureAsPdf, Search, RestartAlt } from '@mui/icons-material';
import { auditAPI } from '../../services/api';
import { toast } from 'react-toastify';

interface AuditRow {
  id: number;
  userName: string;
  action: string;
  tableName: string;
  recordId: number | null;
  oldValues: string | null;
  newValues: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditFilters {
  fromDate: string;
  toDate: string;
  tableName: string;
  action: string;
  search: string;
}

const emptyFilters: AuditFilters = { fromDate: '', toDate: '', tableName: '', action: '', search: '' };
const pageSize = 25;
const columns = ['ID', 'Timestamp', 'Admin', 'Action', 'Table', 'Record', 'Old Values', 'New Values', 'IP Address'];

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] as string));

const csvCell = (value: unknown) => {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const showLoadError = (error: any) => {
  if (error.response?.status === 404) {
    toast.error('Audit API is unavailable. Restart the backend to load the audit report.');
  } else if (error.response?.status === 403) {
    toast.error('Audit report access is restricted to administrators.');
  } else {
    toast.error('Audit report could not be loaded.');
  }
};

const AdminAuditPage: React.FC = () => {
  const [filters, setFilters] = useState<AuditFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(emptyFilters);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const query = (values: AuditFilters, pageNumber: number, limit = pageSize) => ({
    ...Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())),
    page: pageNumber,
    pageSize: limit,
  });

  const load = async (values: AuditFilters, pageNumber: number) => {
    setLoading(true);
    try {
      const response = await auditAPI.get(query(values, pageNumber));
      setRows(response.data.items);
      setTotalCount(response.data.totalCount);
      setPage(pageNumber - 1);
    } catch (error) {
      showLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    auditAPI.get({ page: 1, pageSize }).then((response) => {
      setRows(response.data.items);
      setTotalCount(response.data.totalCount);
    }).catch(showLoadError);
  }, []);

  const submitFilters = (event: FormEvent) => {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    load(filters, 1);
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    load(emptyFilters, 1);
  };

  const fetchAll = async () => {
    const response = await auditAPI.get(query(appliedFilters, 1, 10000));
    return response.data.items as AuditRow[];
  };

  const exportExcel = async () => {
    try {
      const allRows = await fetchAll();
      const data = [columns, ...allRows.map((row) => [
        row.id,
        new Date(row.createdAt).toLocaleString(),
        row.userName,
        row.action,
        row.tableName,
        row.recordId,
        row.oldValues,
        row.newValues,
        row.ipAddress,
      ])].map((line) => line.map(csvCell).join(',')).join('\r\n');
      const blob = new Blob([`\uFEFF${data}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'audit-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Excel export failed.');
    }
  };

  const exportPdf = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Allow pop-ups to export the report as PDF.');
      return;
    }
    try {
      const allRows = await fetchAll();
      const tableRows = allRows.map((row) => `<tr>${[
        row.id,
        new Date(row.createdAt).toLocaleString(),
        row.userName,
        row.action,
        row.tableName,
        row.recordId ?? '',
        row.oldValues ?? '',
        row.newValues ?? '',
        row.ipAddress ?? '',
      ].map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('');
      printWindow.document.write(`<!doctype html><html><head><title>Audit Report</title><style>
        body{font:11px Arial,sans-serif;color:#172b4d;margin:24px}h1{font-size:20px;margin:0 0 6px}p{color:#52647a;margin:0 0 18px}
        table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccd4df;padding:6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf0f7}
        @page{size:landscape;margin:12mm}
      </style></head><body><h1>Audit Report</h1><p>Exported ${escapeHtml(new Date().toLocaleString())} | ${allRows.length} records</p>
      <table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } catch {
      printWindow.close();
      toast.error('PDF export failed.');
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main">Audit Report</Typography>
          <Typography variant="body2" color="text.secondary">{totalCount.toLocaleString()} recorded actions</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<Download />} onClick={exportExcel}>Excel</Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPdf}>PDF</Button>
        </Stack>
      </Stack>

      <Paper component="form" onSubmit={submitFilters} sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField label="From date" type="date" size="small" value={filters.fromDate} onChange={(event) => setFilters({ ...filters, fromDate: event.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="To date" type="date" size="small" value={filters.toDate} onChange={(event) => setFilters({ ...filters, toDate: event.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField label="Table" size="small" value={filters.tableName} onChange={(event) => setFilters({ ...filters, tableName: event.target.value })} />
          <TextField label="Action" size="small" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} />
          <TextField label="Search values" size="small" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <Button type="submit" variant="contained" startIcon={<Search />}>Filter</Button>
          <Button type="button" variant="text" startIcon={<RestartAlt />} onClick={resetFilters}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ overflow: 'hidden' }}>
        {loading && <Alert severity="info" icon={<CircularProgress size={18} />}>Loading audit records</Alert>}
        <TableContainer sx={{ maxHeight: 'calc(100vh - 330px)' }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>{columns.map((column) => <TableCell key={column} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{column}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {rows.map((row) => <TableRow key={row.id} hover>
                <TableCell>{row.id}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(row.createdAt).toLocaleString()}</TableCell>
                <TableCell>{row.userName}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.tableName}</TableCell>
                <TableCell>{row.recordId ?? '—'}</TableCell>
                <TableCell sx={{ maxWidth: 240, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.oldValues || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 240, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{row.newValues || '—'}</TableCell>
                <TableCell>{row.ipAddress || '—'}</TableCell>
              </TableRow>)}
              {!loading && rows.length === 0 && <TableRow><TableCell colSpan={columns.length} align="center" sx={{ py: 5, color: 'text.secondary' }}>No audit records match these filters.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={totalCount} page={page} rowsPerPage={pageSize} rowsPerPageOptions={[pageSize]} onPageChange={(_, nextPage) => load(appliedFilters, nextPage + 1)} />
      </Paper>
    </Box>
  );
};

export default AdminAuditPage;
