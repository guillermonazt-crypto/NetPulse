import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Box, Drawer, List,
  ListItem, ListItemIcon, ListItemText, ListItemButton, Divider, Badge, Popover, Chip, Stack,
} from '@mui/material';
import {
  Menu, Dashboard, Router, Logout, ChevronLeft, Notifications, DarkMode, LightMode, TrendingDown, CheckCircle, Timeline,
} from '@mui/icons-material';
import Swal from 'sweetalert2';
import EventBus from '../context/EventBus';
import { useAuthContext } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { useGet } from '../hooks/useGet';
import { ENDPOINTS } from '../urls';

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <Dashboard />, path: '/' },
  { label: 'Routers', icon: <Router />, path: '/routers' },
  { label: 'Historico', icon: <Timeline />, path: '/historico' },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthContext();
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [alertEvents, setAlertEvents] = useState([]);
  const [alertAnchor, setAlertAnchor] = useState(null);
  const prevDownRef = useRef(0);
  const prevRecoveryRef = useRef(new Set());
  const audioCtxRef = useRef(null);

  const { data: events = [] } = useGet(ENDPOINTS.EVENTS, { params: { hours: 2 }, pollInterval: 10000 });

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  };

  const beep = (freq, duration) => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  useEffect(() => {
    const down = events.filter((e) => e.type === 'down' && !e.ended_at);
    if (down.length > prevDownRef.current && prevDownRef.current > 0) beep(800, 0.3);
    prevDownRef.current = down.length;
    setAlertCount(down.length);
    setAlertEvents(down);

    const newRecoveries = events.filter((e) => (e.type === 'recovery' || e.type === 'sla_ok') && !prevRecoveryRef.current.has(e.id));
    if (newRecoveries.length > 0 && prevRecoveryRef.current.size > 0) beep(1200, 0.15);
    prevRecoveryRef.current = new Set(events.filter((e) => e.type === 'recovery' || e.type === 'sla_ok').map((e) => e.id));
  }, [events]);

  useEffect(() => {
    return EventBus.on('alerts:updated', ({ count, events }) => {
      setAlertCount(count);
      setAlertEvents(events || []);
    });
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Cerrar Sesion',
      text: 'Seguro que deseas salir?',
      icon: 'question',
      showCancelButton: true,
      background: isDark ? '#1e293b' : '#fff',
      color: isDark ? '#e2e8f0' : '#333',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Si, salir',
      cancelButtonText: 'Cancelar',
      customClass: { popup: '!rounded-2xl', confirmButton: '!rounded-lg', cancelButton: '!rounded-lg' },
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/login');
      }
    });
  };

  const isActive = (path) => location.pathname === path;

  const drawerContent = (
    <Box className="flex flex-col h-full">
      <Box className="flex items-center gap-2 px-5 py-5 border-b border-gray-800">
        <Box className="bg-blue-600 rounded-lg p-1.5">
          <Router sx={{ color: 'white', fontSize: 24 }} />
        </Box>
        <Box>
          <Typography variant="h6" className="font-bold text-white leading-tight">
            NetPulse
          </Typography>
          <Typography variant="caption" className="text-gray-400">
            Network Monitor
          </Typography>
        </Box>
      </Box>

      <List className="px-3 pt-4 flex-1">
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                backgroundColor: isActive(item.path) ? 'rgba(37,99,235,0.15)' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {React.cloneElement(item.icon, {
                  sx: { color: isActive(item.path) ? '#60a5fa' : '#94a3b8', fontSize: 22 },
                })}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    fontSize: 14,
                    fontWeight: 500,
                    color: isActive(item.path) ? '#ffffff' : '#cbd5e1',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      <Box className="p-3">
        <ListItemButton
          onClick={toggle}
          sx={{ borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {mode === 'dark' ? <LightMode sx={{ color: '#fbbf24', fontSize: 22 }} /> : <DarkMode sx={{ color: '#94a3b8', fontSize: 22 }} />}
          </ListItemIcon>
          <ListItemText
            primary={mode === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
            slotProps={{ primary: { fontSize: 14, fontWeight: 500, color: '#cbd5e1' } }}
          />
        </ListItemButton>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            '&:hover': { backgroundColor: 'rgba(220,38,38,0.12)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout sx={{ color: '#ef4444', fontSize: 22 }} />
          </ListItemIcon>
          <ListItemText
            primary="Cerrar Sesion"
            slotProps={{ primary: { fontSize: 14, fontWeight: 500, color: '#ef4444' } }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box className="flex min-h-screen" sx={{ bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            bgcolor: '#0f172a',
            color: '#ffffff',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile sidebar */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: '#0f172a', color: 'white' },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main */}
      <Box className="flex-1 flex flex-col min-w-0">
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' }, mr: 1 }}
            >
              <Menu />
            </IconButton>
            <Typography variant="subtitle1" className="font-semibold flex-1">
              {NAV_ITEMS.find((i) => isActive(i.path))?.label || 'NetPulse'}
            </Typography>

            <IconButton onClick={(e) => setAlertAnchor(e.currentTarget)}>
              <Badge badgeContent={alertCount} color="error" invisible={alertCount === 0}>
                <Notifications />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>

        <Popover
          open={Boolean(alertAnchor)}
          anchorEl={alertAnchor}
          onClose={() => setAlertAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              p: 0,
              minWidth: 320,
              maxWidth: 400,
              borderRadius: 3,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            },
          }}
        >
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Notifications color={alertCount > 0 ? 'error' : 'disabled'} fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                {alertCount > 0 ? `${alertCount} alerta${alertCount > 1 ? 's' : ''} activa${alertCount > 1 ? 's' : ''}` : 'Sin alertas'}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: 3, py: alertEvents.length > 0 ? 1.5 : 3 }}>
            {alertEvents.length > 0 ? (
              alertEvents.map((ev) => (
                <Box
                  key={ev.id}
                  sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5,
                    borderBottom: '1px solid', borderColor: 'divider',
                    '&:last-child': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2, bgcolor: '#fef2f2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <TrendingDown fontSize="small" color="error" />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {ev.router_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Caido desde {new Date(ev.started_at).toLocaleTimeString()}
                    </Typography>
                    {ev.detail && (
                      <Chip label={ev.detail} size="small" sx={{ mt: 0.5, fontSize: '0.65rem', height: 20 }} />
                    )}
                  </Box>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary" textAlign="center">
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                <CheckCircle color="success" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Todos los routers estan operativos
                </Typography>
              </Stack>
              </Typography>
            )}
          </Box>
        </Popover>

        {/* Alert popover */}
        <Box className="flex-1" sx={{ bgcolor: 'background.default' }}>
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Layout;
