import React, { createContext, useContext, useState, useCallback } from 'react';
import { CONFIG } from '../urls';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(CONFIG.TOKEN_KEY));

  const login = useCallback((access, refresh) => {
    localStorage.setItem(CONFIG.TOKEN_KEY, access);
    localStorage.setItem(CONFIG.REFRESH_KEY, refresh);
    setToken(access);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.REFRESH_KEY);
    setToken(null);
  }, []);

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
