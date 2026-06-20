import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  InputAdornment, IconButton,
} from '@mui/material';
import { Router, Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';
import { usePost } from '../hooks/usePost';
import { ENDPOINTS } from '../urls';
import { useAuthContext } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { post, loading, error } = usePost(ENDPOINTS.TOKEN);
  const { login } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await post({ username, password });
      login(data.access, data.refresh);
      navigate('/');
    } catch {}
  };

  return (
    <Box className="min-h-screen flex items-center justify-center" sx={{ bgcolor: 'background.default' }}>
      <Card elevation={4} className="w-full max-w-[400px] mx-4">
        <CardContent className="p-10">
          <Box className="flex flex-col items-center mb-6">
            <Box className="bg-blue-600 rounded-full p-3 mb-3">
              <Router className="text-white" sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" className="font-bold" color="text.primary">
              NetPulse
            </Typography>
            <Typography variant="body2" color="text.secondary" className="mt-1">
              Monitoreo de Red en Tiempo Real
            </Typography>
          </Box>

          {error && <Alert severity="error" className="mb-4">Credenciales invalidas</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LoginIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Contrasena"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LoginIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              className="mt-6 py-3"
              startIcon={<LoginIcon />}
            >
              {loading ? 'Entrando...' : 'Iniciar Sesion'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Login;
