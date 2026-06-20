import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

export function useThemeMode() {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  const toggle = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    return createTheme({
      palette: {
        mode,
        primary: { main: '#2563eb' },
        secondary: { main: '#0d9488' },
        error: { main: '#dc2626' },
        warning: { main: '#ea580c' },
        success: { main: '#16a34a' },
        background: isDark ? { default: '#0f172a', paper: '#1e293b' } : { default: '#f1f5f9', paper: '#ffffff' },
      },
      typography: {
        fontFamily: '"Inter", "Roboto", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
      },
      shape: { borderRadius: 12 },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 14,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: { borderRadius: 10, padding: '8px 18px' },
            sizeSmall: { padding: '4px 12px', fontSize: '0.8rem' },
            contained: { boxShadow: 'none' },
          },
        },
        MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
        MuiTableCell: {
          styleOverrides: {
            head: { fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' },
            root: { borderBottom: isDark ? '1px solid #334155' : '1px solid #f1f5f9', padding: '10px 14px' },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
