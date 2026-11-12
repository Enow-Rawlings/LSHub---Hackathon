import React, { createContext, useContext, useState, useCallback } from 'react';
import { setToken, clearToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vp_user')); }
    catch { return null; }
  });

  const login = useCallback((userData, token) => {
    setToken(token);
    localStorage.setItem('vp_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuth: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Wrapper that redirects to /login if not authenticated
export function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  if (!isAuth) {
    window.location.href = '/login';
    return null;
  }
  return children;
}

// Wrapper that redirects to home if already authenticated
export function GuestRoute({ children }) {
  const { isAuth } = useAuth();
  if (isAuth) {
    window.location.href = '/';
    return null;
  }
  return children;
}
