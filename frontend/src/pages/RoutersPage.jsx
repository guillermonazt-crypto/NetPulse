import React, { useState } from 'react';
import {
  Card, CardContent, TextField, Button, Typography, Box,
  Grid, FormControl, InputLabel, Select, MenuItem, Alert, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, IconButton, Stack,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Router, Close } from '@mui/icons-material';
import Swal from 'sweetalert2';
import { useGet } from '../hooks/useGet';
import { usePost } from '../hooks/usePost';
import { usePatch } from '../hooks/usePut';
import { useDelete } from '../hooks/useDelete';
import { ENDPOINTS } from '../urls';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import EventBus from '../context/EventBus';
import { useThemeMode } from '../context/ThemeContext';

const INITIAL_FORM = { hostname: '', ip_address: '', is_active: true, ping_interval: 5, anomaly_threshold: 100, sla_pings: 3, group: '' };

const Toast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { popup: '!rounded-xl !shadow-lg' },
});

function RoutersPage() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: isDark ? '#1e293b' : '#fff',
    color: isDark ? '#e2e8f0' : '#333',
    customClass: { popup: '!rounded-xl !shadow-lg' },
  });
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [openForm, setOpenForm] = useState(false);

  const { data: routers = [], loading, error: fetchError, refetch } = useGet(ENDPOINTS.ROUTERS);
  const { post, loading: creating } = usePost(ENDPOINTS.ROUTERS);
  const { patch, loading: updating } = usePatch(ENDPOINTS.ROUTERS);
  const { remove: delRouter } = useDelete(ENDPOINTS.ROUTERS);

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setFormError('');
    setOpenForm(true);
  };

  const openEdit = (router) => {
    setForm({
      hostname: router.hostname, ip_address: router.ip_address,
      is_active: router.is_active,
      ping_interval: router.ping_interval ?? 5,
      anomaly_threshold: router.anomaly_threshold ?? 100,
      sla_pings: router.sla_pings ?? 3,
      group: router.group ?? '',
    });
    setEditingId(router.id);
    setFormError('');
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingId(null);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      editingId ? await patch(editingId, form) : await post(form);
      Toast.fire({ icon: 'success', title: editingId ? 'Router actualizado' : 'Router agregado' });
      handleCloseForm();
      refetch();
      EventBus.emit('routers:changed');
    } catch {
      setFormError('Error al guardar');
    }
  };

  const handleDelete = (router) => {
    Swal.fire({
      title: 'Eliminar Router',
      html: `Seguro que deseas eliminar <strong>${router.hostname}</strong>?<br><small>Esta accion no se puede deshacer</small>`,
      icon: 'warning',
      showCancelButton: true,
      background: isDark ? '#1e293b' : '#fff',
      color: isDark ? '#e2e8f0' : '#333',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { popup: '!rounded-2xl', confirmButton: '!rounded-lg', cancelButton: '!rounded-lg' },
    }).then(async (result) => {
      if (!result.isConfirmed) return;
      try {
        await delRouter(router.id);
        refetch();
        EventBus.emit('routers:changed');
        Toast.fire({ icon: 'success', title: `"${router.hostname}" eliminado` });
      } catch {
        Toast.fire({ icon: 'error', title: 'Error al eliminar' });
      }
    });
  };

  const handleToggle = async (router) => {
    try {
      await patch(router.id, { is_active: !router.is_active });
      refetch();
      EventBus.emit('routers:changed');
      Toast.fire({
        icon: 'success',
        title: router.is_active ? `${router.hostname} desactivado` : `${router.hostname} activado`,
      });
    } catch {
      Toast.fire({ icon: 'error', title: 'Error al cambiar estado' });
    }
  };

  const saving = creating || updating;

  const routerColumns = [
    { field: 'hostname', headerName: 'Hostname', flex: 1, minWidth: 130 },
    { field: 'ip_address', headerName: 'IP', width: 150 },
    { field: 'group', headerName: 'Grupo', width: 100 },
    { field: 'ping_interval', headerName: 'Ping', width: 65, valueFormatter: (v) => `${v ?? 5}s` },
    { field: 'anomaly_threshold', headerName: 'Umbral', width: 75, valueFormatter: (v) => `${v ?? 100}ms` },
    { field: 'sla_pings', headerName: 'SLA', width: 60, valueFormatter: (v) => `${v ?? 3}p` },
    {
      field: 'is_active', headerName: 'Estado', width: 110,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <CheckCircle /> : undefined}
          label={params.value ? 'Activo' : 'Inactivo'}
          color={params.value ? 'success' : 'default'}
          size="small"
          onClick={() => handleToggle(params.row)}
          sx={{ cursor: 'pointer' }}
        />
      ),
    },
    {
      field: 'actions', headerName: 'Acciones', width: 100, sortable: false, filterable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => openEdit(params.row)} size="small" color="primary">
            <Edit fontSize="small" />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row)} size="small" color="error">
            <Delete fontSize="small" />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Layout>
      <Stack spacing={3}>
        <Box className="flex items-center justify-between">
          <Box className="flex items-center gap-3">
            <Avatar sx={{ bgcolor: '#eff6ff', width: 44, height: 44 }}>
              <Router sx={{ color: '#2563eb' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" className="font-bold">Gestion de Routers</Typography>
              <Typography variant="body2" color="text.secondary">
                {routers.length} router{routers.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={openAdd}>
            Agregar Router
          </Button>
        </Box>

        <Card>
          <CardContent>
            {fetchError && <Alert severity="error" className="mb-3">Error al cargar routers</Alert>}
            <DataTable
              rows={routers}
              columns={routerColumns}
              loading={loading}
              emptyText='No hay routers. Crea el primero con el boton "Agregar Router".'
              exportFilename={`routers-${new Date().toISOString().slice(0, 10)}.csv`}
              pageSize={25}
              height={500}
            />
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={openForm} onClose={handleCloseForm} maxWidth="md" fullWidth>
          <DialogTitle className="flex items-center justify-between">
            {editingId ? 'Editar Router' : 'Agregar Nuevo Router'}
            <IconButton onClick={handleCloseForm} size="small"><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {formError && <Alert severity="error" className="mb-3">{formError}</Alert>}
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2} className="mt-1 mb-4">
                <Grid item xs={12} sm={6}>
                  <TextField label="Hostname" value={form.hostname}
                    onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                    size="small" fullWidth required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Direccion IP" value={form.ip_address}
                    onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
                    size="small" fullWidth required />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Estado</InputLabel>
                    <Select value={form.is_active ? 'true' : 'false'} label="Estado"
                      onChange={(e) => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <MenuItem value="true">Activo</MenuItem>
                      <MenuItem value="false">Inactivo</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField label="Ping cada (s)" type="number"
                    value={form.ping_interval}
                    onChange={(e) => setForm({ ...form, ping_interval: Math.max(2, parseInt(e.target.value) || 5) })}
                    size="small" fullWidth inputProps={{ min: 2 }} helperText="Minimo 2 segundos" />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField label="Umbral anomalia (ms)" type="number"
                    value={form.anomaly_threshold}
                    onChange={(e) => setForm({ ...form, anomaly_threshold: parseInt(e.target.value) || 100 })}
                    size="small" fullWidth inputProps={{ min: 10 }} helperText="Anomalia si > N ms" />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="SLA (pings)" type="number"
                    value={form.sla_pings}
                    onChange={(e) => setForm({ ...form, sla_pings: Math.max(2, parseInt(e.target.value) || 3) })}
                    size="small" fullWidth inputProps={{ min: 2 }} helperText="Alertar tras N pings altos" />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Grupo"
                    value={form.group}
                    onChange={(e) => setForm({ ...form, group: e.target.value })}
                    size="small" fullWidth placeholder="Core, Sucursal, etc." />
                </Grid>
              </Grid>
            </form>
          </DialogContent>
          <DialogActions className="px-6 pb-4">
            <Button onClick={handleCloseForm} variant="outlined">Cancelar</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={saving}
              startIcon={editingId ? <Edit /> : <Add />}>
              {editingId ? 'Guardar Cambios' : 'Agregar Router'}
            </Button>
            {saving && <CircularProgress size={20} />}
          </DialogActions>
        </Dialog>
      </Stack>
    </Layout>
  );
}

export default RoutersPage;
