import React, { useState, useMemo } from 'react';
import { Box, Card, CardContent, Button, Typography, Stack, FormControl, InputLabel, Select, MenuItem, Grid, Skeleton, Chip } from '@mui/material';
import { useGet } from '../hooks/useGet';
import { ENDPOINTS } from '../urls';
import Layout from '../components/Layout';
import DataTable from '../components/DataTable';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler, BarElement, ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const RANGES = [
  { label: '24h', hours: 24 },
  { label: '3d', hours: 72 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
];

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#8b5cf6'];

const getAvailColor = (avail) => avail >= 99.9 ? '#16a34a' : avail >= 99 ? '#ea580c' : '#dc2626';

function Historico() {
  const [hours, setHours] = useState(168);
  const [selectedRouter, setSelectedRouter] = useState('');

  const { data: routers = [] } = useGet(ENDPOINTS.ROUTERS);
  const params = useMemo(() => {
    const p = { hours };
    if (selectedRouter) p.router_id = selectedRouter;
    return p;
  }, [hours, selectedRouter]);
  const { data: historical = [], loading } = useGet(ENDPOINTS.HISTORICAL, { params });

  const stats = useMemo(() => {
    if (!historical.length) return { avail: 100, downtime: 0, avg: '0', max: '0', incidents: 0 };
    const latencies = historical.map((h) => h.avg_latency).filter((l) => l > 0);
    const totalDowntime = historical.reduce((s, h) => s + (h.downtime_seconds || 0), 0);
    const totalSecs = hours * 3600 * (selectedRouter ? 1 : Math.max(1, routers.filter(r => r.is_active).length));
    const avail = Math.min(100, Math.max(0, Math.round((1 - totalDowntime / totalSecs) * 1000) / 10));
    return {
      avail,
      downtime: totalDowntime,
      avg: latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : '0',
      max: latencies.length ? Math.max(...latencies).toFixed(1) : '0',
      incidents: historical.reduce((s, h) => s + (h.anomalies || 0), 0),
    };
  }, [historical, hours, selectedRouter, routers]);

  const donutData = useMemo(() => {
    const activeIds = [...new Set(historical.map((h) => h.router_id))];
    if (activeIds.length <= 1) {
      return {
        labels: ['Disponible', 'Caido'],
        datasets: [{
          data: [stats.avail, Math.round((100 - stats.avail) * 10) / 10],
          backgroundColor: [getAvailColor(stats.avail), '#e2e8f0'],
          borderWidth: 0,
        }],
      };
    }
    // Per-router breakdown
    const routerAvails = activeIds.map((rid) => {
      const routerData = historical.filter((h) => h.router_id === rid);
      const downtime = routerData.reduce((s, h) => s + (h.downtime_seconds || 0), 0);
      const totalSecs = hours * 3600;
      return Math.min(100, Math.max(0, Math.round((1 - downtime / totalSecs) * 1000) / 10));
    });
    return {
      labels: activeIds.map((rid) => historical.find((h) => h.router_id === rid)?.router_name || `R${rid}`),
      datasets: [{
        data: routerAvails,
        backgroundColor: activeIds.map((_, idx) => COLORS[idx % COLORS.length]),
        borderWidth: 0,
      }],
    };
  }, [historical, stats.avail, hours]);

  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: '70%',
    plugins: { legend: { display: true, position: 'bottom', labels: { padding: 16, usePointStyle: true, boxWidth: 10 } } },
  };

  const downtimeData = useMemo(() => {
    const labels = historical.map((h) => new Date(h.hour).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit' }));
    const activeIds = [...new Set(historical.map((h) => h.router_id))];
    if (activeIds.length <= 1) {
      return {
        labels,
        datasets: [{
          label: 'Tiempo caido (s)',
          data: historical.map((h) => h.downtime_seconds || 0),
          backgroundColor: '#dc2626', borderRadius: 4,
        }],
      };
    }
    return {
      labels,
      datasets: activeIds.map((rid, idx) => ({
        label: historical.find((h) => h.router_id === rid)?.router_name || `R${rid}`,
        data: historical.map((h) => (h.router_id === rid ? (h.downtime_seconds || 0) : 0)),
        backgroundColor: COLORS[idx % COLORS.length],
        borderRadius: 2,
      })),
    };
  }, [historical]);

  const barOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } },
      y: { stacked: true, title: { display: true, text: 'Segundos caido' } },
    },
  }), []);

  const latencyData = useMemo(() => {
    const labels = historical.map((h) => new Date(h.hour).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit' }));
    const activeIds = [...new Set(historical.map((h) => h.router_id))];
    return {
      labels,
      datasets: activeIds.map((rid, idx) => ({
        label: historical.find((h) => h.router_id === rid)?.router_name || '',
        data: historical.map((h) => (h.router_id === rid ? h.avg_latency : null)),
        borderColor: COLORS[idx % COLORS.length],
        backgroundColor: 'transparent',
        tension: 0.3, pointRadius: 2, borderWidth: 2, spanGaps: true,
      })),
    };
  }, [historical]);

  const formatDowntime = (secs) => {
    if (!secs || secs < 0) return '0s';
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.round(secs / 60)}m`;
    return `${(secs / 3600).toFixed(1)}h`;
  };

  const tableColumns = [
    { field: 'router_name', headerName: 'Router', width: 140 },
    { field: 'hour', headerName: 'Hora', width: 155, valueFormatter: (v) => new Date(v).toLocaleString() },
    { field: 'avg_latency', headerName: 'Lat. Avg', width: 90, valueFormatter: (v) => `${v}ms` },
    { field: 'max_latency', headerName: 'Lat. Max', width: 90, valueFormatter: (v) => `${v}ms` },
    {
      field: 'downtime_seconds', headerName: 'Caido', width: 90,
      renderCell: (params) => params.value > 0
        ? <Chip label={formatDowntime(params.value)} size="small" color="error" />
        : <Chip label="—" size="small" variant="outlined" />,
    },
    { field: 'anomalies', headerName: 'Anom.', width: 75 },
    { field: 'packet_loss_pct', headerName: 'Perdida%', width: 85, valueFormatter: (v) => `${v}%` },
    { field: 'pings_total', headerName: 'Pings', width: 65 },
  ];

  return (
    <Layout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Historico de Red</Typography>
          <Typography variant="body2" color="text.secondary">Latencia, disponibilidad y tiempo caido por hora</Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase">Disponibilidad</Typography>
              <Typography variant="h5" fontWeight={700} color={getAvailColor(stats.avail)}>{stats.avail}%</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase">Tiempo Caido</Typography>
              <Typography variant="h5" fontWeight={700}>{formatDowntime(stats.downtime)}</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase">Latencia Prom.</Typography>
              <Typography variant="h5" fontWeight={700}>{stats.avg} ms</Typography>
            </CardContent></Card>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card><CardContent>
              <Typography variant="caption" color="text.secondary" textTransform="uppercase">Anomalias</Typography>
              <Typography variant="h5" fontWeight={700} color="warning.main">{stats.incidents}</Typography>
            </CardContent></Card>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Router</InputLabel>
            <Select value={selectedRouter} onChange={(e) => setSelectedRouter(e.target.value)} label="Router">
              <MenuItem value="">Todos los routers</MenuItem>
              {routers.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.hostname}</MenuItem>)}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={0.5}>
            {RANGES.map((r) => (
              <Button key={r.label} variant={hours === r.hours ? 'contained' : 'outlined'} size="small" onClick={() => setHours(r.hours)}>
                {r.label}
              </Button>
            ))}
          </Stack>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Disponibilidad del Periodo</Typography>
                {loading ? <Skeleton variant="rounded" height={280} /> : (
                  <Box sx={{ height: 280, position: 'relative' }}>
                    <Doughnut data={donutData} options={donutOptions} />
                    {donutData.labels.length <= 2 && (
                      <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -70%)', textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={700} color={getAvailColor(stats.avail)}>{stats.avail}%</Typography>
                        <Typography variant="caption" color="text.secondary">uptime</Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Tiempo Caido por Hora</Typography>
                {loading ? <Skeleton variant="rounded" height={280} /> : historical.length > 0 ? (
                  <Box sx={{ height: 280 }}><Bar data={downtimeData} options={barOptions} /></Box>
                ) : (
                  <Box className="flex items-center justify-center py-16"><Typography color="text.secondary">Sin datos aun</Typography></Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Latencia Promedio por Hora</Typography>
            {loading ? <Skeleton variant="rounded" height={350} /> : historical.length > 0 ? (
              <Box sx={{ height: 350 }}><Line data={latencyData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } } } }} /></Box>
            ) : (
              <Box className="flex items-center justify-center py-16"><Typography color="text.secondary">Sin datos aun</Typography></Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Datos por Hora</Typography>
            <DataTable
              rows={historical.map((h, i) => ({ ...h, id: i }))}
              columns={tableColumns}
              loading={loading}
              emptyText="Sin datos historicos aun. Los datos se agregan cada hora."
              exportFilename={`historico-${new Date().toISOString().slice(0, 10)}.csv`}
              pageSize={25}
              height={500}
            />
          </CardContent>
        </Card>
      </Stack>
    </Layout>
  );
}

export default Historico;
