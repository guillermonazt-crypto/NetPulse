import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Card, CardContent, Button, Typography, Grid, Stack,
  FormControl, InputLabel, Select, MenuItem, Skeleton, Avatar, Chip, IconButton,
} from '@mui/material';
import {
  Warning, Speed, CheckCircle, TrendingDown, Router, TrendingUp, PictureAsPdf,
} from '@mui/icons-material';
import { useThemeMode } from '../context/ThemeContext';
import { useGet } from '../hooks/useGet';
import { ENDPOINTS, CONFIG } from '../urls';
import Layout from '../components/Layout';
import EventBus from '../context/EventBus';
import DataTable from '../components/DataTable';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const TIME_RANGES = [
  { label: '5 min', hours: 0.083 },
  { label: '15 min', hours: 0.25 },
  { label: '1 h', hours: 1 },
  { label: '6 h', hours: 6 },
  { label: '24 h', hours: 24 },
  { label: 'Todo', hours: null },
];

function Dashboard() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
  const [selectedRouter, setSelectedRouter] = useState('');
  const [hours, setHours] = useState(1);
  const [eventFilter, setEventFilter] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(null);

  const params = useMemo(() => {
    const p = { limit: CONFIG.METRICS_LIMIT };
    if (selectedRouter) p.router_id = selectedRouter;
    if (hours) p.hours = hours;
    return p;
  }, [selectedRouter, hours]);

  const { data: metrics = [], loading } = useGet(ENDPOINTS.METRICS, { params, pollInterval: CONFIG.POLL_INTERVAL });

  useEffect(() => {
    if (metrics.length > 0) setLastUpdate(new Date());
  }, [metrics]);
  const { data: routers = [], refetch: refetchRouters } = useGet(ENDPOINTS.ROUTERS);
  const { data: stats, loading: statsLoading } = useGet(ENDPOINTS.STATS, { params: { hours }, pollInterval: 15000 });
  const eventsParams = useMemo(() => {
    const p = { hours };
    if (selectedRouter) p.router_id = selectedRouter;
    return p;
  }, [hours, selectedRouter]);

  const { data: events = [] } = useGet(ENDPOINTS.EVENTS, { params: eventsParams, pollInterval: 10000 });

  useEffect(() => {
    return EventBus.on('routers:changed', () => refetchRouters());
  }, [refetchRouters]);

  const reversed = useMemo(() => [...metrics].reverse(), [metrics]);

  const routerColors = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#8b5cf6'];

  const chartData = useMemo(() => {
    const labels = reversed.map((m) => new Date(m.created_at).toLocaleTimeString());
    const activeRouters = routers.filter((r) => r.is_active);

    if (selectedRouter) {
      const router = routers.find((r) => r.id === Number(selectedRouter));
      return { labels, datasets: [{ label: router?.hostname || 'Latencia', data: reversed.map((m) => m.latency), borderColor: routerColors[Number(selectedRouter) % routerColors.length], backgroundColor: 'rgba(37,99,235,0.15)', fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2, spanGaps: true }] };
    }

    return {
      labels,
      datasets: activeRouters.map((router, idx) => {
        const ids = new Set(reversed.filter((m) => m.router === router.id).map((m) => m.id));
        return { label: router.hostname, data: reversed.map((m) => ids.has(m.id) ? m.latency : null), borderColor: routerColors[idx % routerColors.length], backgroundColor: 'transparent', fill: false, tension: 0.3, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2, spanGaps: true };
      }),
    };
  }, [reversed, selectedRouter, routers]);

  const multiRouter = !selectedRouter && routers.filter((r) => r.is_active).length > 1;

  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: multiRouter, position: 'top', labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 12 }, color: isDark ? '#cbd5e1' : '#333' } }, tooltip: { backgroundColor: '#0f172a', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8 } },
    scales: { x: { grid: { display: false, color: isDark ? '#334155' : '#f1f5f9' }, ticks: { maxTicksLimit: 8, font: { size: 11 }, color: isDark ? '#94a3b8' : undefined } }, y: { grid: { color: isDark ? '#334155' : '#f1f5f9' }, title: { display: true, text: 'Latencia (ms)', font: { size: 12 }, color: isDark ? '#94a3b8' : undefined }, ticks: { color: isDark ? '#94a3b8' : undefined } } },
  }), [multiRouter, isDark]);

  const filteredEvents = useMemo(() => {
    if (eventFilter === 'all') return events;
    if (eventFilter === 'recovery') return events.filter((e) => e.type === 'recovery' || e.type === 'sla_ok');
    return events.filter((e) => e.type === eventFilter);
  }, [events, eventFilter]);

  const timeAgo = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : null;

  const eventColumns = useMemo(() => [
    { field: 'router_name', headerName: 'Router', flex: 1, minWidth: 120 },
    {
      field: 'type', headerName: 'Evento', width: 140,
      renderCell: (params) => {
        const map = { down: ['CAIDA', 'error'], recovery: ['RECUPERADO', 'success'], sla: ['SLA', 'warning'], sla_ok: ['SLA OK', 'success'] };
        const [label, color] = map[params.value] || [params.value, 'default'];
        return <Chip label={label} size="small" color={color} />;
      },
    },
    {
      field: 'started_at', headerName: 'Inicio', width: 170,
      valueFormatter: (value) => new Date(value).toLocaleString(),
    },
    {
      field: 'ended_at', headerName: 'Fin', width: 170,
      valueFormatter: (value) => value ? new Date(value).toLocaleString() : 'En curso',
    },
    { field: 'duration', headerName: 'Duracion', width: 100 },
    { field: 'detail', headerName: 'Detalle', flex: 1, minWidth: 150 },
  ], []);

  const generatePDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('NetPulse - Reporte de Incidentes', 14, 20);
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Rango: ${hours ? hours + 'h' : 'todo'} | Router: ${selectedRouter ? routers.find(r => r.id === Number(selectedRouter))?.hostname || selectedRouter : 'Todos'}`, 14, 34);

      let y = 44;
      doc.setFontSize(8);
      doc.text('Router | Evento | Inicio | Fin | Duracion | Detalle', 14, y);
      y += 6;
      filteredEvents.slice(0, 50).forEach((ev) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`${ev.router_name} | ${ev.type} | ${new Date(ev.started_at).toLocaleString()} | ${ev.ended_at ? new Date(ev.ended_at).toLocaleString() : '-'} | ${ev.duration || '-'} | ${(ev.detail || '').slice(0, 30)}`, 14, y);
        y += 5;
      });
      doc.save(`netpulse-reporte-${new Date().toISOString().slice(0, 10)}.pdf`);
    });
  };

  return (
    <Layout>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<Router />} iconBg={isDark ? '#1e3a5f' : '#eff6ff'} iconColor="#2563eb" label="Routers Activos" loading={statsLoading} value={stats ? `${stats.active_routers} / ${stats.total_routers}` : '—'} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<Speed />} iconBg={isDark ? '#14532d' : '#f0fdf4'} iconColor="#16a34a" label="Latencia Prom." loading={statsLoading} value={stats ? `${stats.avg_latency} ms` : '—'} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<Warning />} iconBg={stats?.anomaly_count > 0 ? (isDark ? '#450a0a' : '#fef2f2') : (isDark ? '#14532d' : '#f0fdf4')} iconColor={stats?.anomaly_count > 0 ? '#dc2626' : '#16a34a'} label="Anomalias" loading={statsLoading} value={stats ? stats.anomaly_count : '—'} alert={stats?.anomaly_count > 0} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatCard icon={<TrendingDown />} iconBg={isDark ? '#1e3a5f' : '#eff6ff'} iconColor="#2563eb" label="Uptime" loading={statsLoading} value={stats ? `${stats.uptime}%` : '—'} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'space-between' }} useFlexGap>
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Router</InputLabel>
              <Select value={selectedRouter} onChange={(e) => setSelectedRouter(e.target.value)} label="Router">
                <MenuItem value="">Todos los routers</MenuItem>
                {routers.map((r) => <MenuItem key={r.id} value={r.id}>{r.hostname}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={0.5}>
              {TIME_RANGES.map((tr) => (
                <Button key={tr.label} onClick={() => setHours(tr.hours)} variant={hours === tr.hours ? 'contained' : 'outlined'} size="small">{tr.label}</Button>
              ))}
            </Stack>
          </Stack>
          {timeAgo !== null && (
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Actualizado hace {timeAgo < 60 ? `${timeAgo}s` : `${Math.floor(timeAgo / 60)}m`}
            </Typography>
          )}
        </Stack>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Latencia en Tiempo Real</Typography>
            {loading && !metrics.length ? (
              <Skeleton variant="rounded" height={380} />
            ) : reversed.length > 0 ? (
              <Box sx={{ height: 380 }}><Line data={chartData} options={chartOptions} /></Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
                <Speed sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography color="text.secondary">Esperando datos del monitor...</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" sx={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2 }} useFlexGap>
              <Typography variant="h6">Registro de Caidas y Recuperaciones</Typography>
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Tipo</InputLabel>
                  <Select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} label="Tipo">
                    <MenuItem value="all">Todos</MenuItem>
                    <MenuItem value="down">Caidas</MenuItem>
                    <MenuItem value="sla">Alertas SLA</MenuItem>
                    <MenuItem value="recovery">Recuperaciones / SLA OK</MenuItem>
                  </Select>
                </FormControl>
                <IconButton size="small" onClick={generatePDF} disabled={!filteredEvents.length} title="Generar PDF">
                  <PictureAsPdf fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <DataTable
              rows={filteredEvents}
              columns={eventColumns}
              emptyText="Sin eventos en este periodo"
              exportFilename={`incidentes-${new Date().toISOString().slice(0, 10)}.csv`}
              pageSize={10}
            />
          </CardContent>
        </Card>
      </Stack>
    </Layout>
  );
}

function StatCard({ icon, iconBg, iconColor, label, value, loading, alert }) {
  return (
    <Card sx={{ overflow: 'visible' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box className="flex items-start justify-between">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</Typography>
            {loading ? <Skeleton width={60} height={32} sx={{ mt: 0.5 }} /> : <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5, color: alert ? '#dc2626' : 'text.primary' }}>{value}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: iconBg, width: 42, height: 42 }}>{React.cloneElement(icon, { sx: { color: iconColor, fontSize: 22 } })}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
