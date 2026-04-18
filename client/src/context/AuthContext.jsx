import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tsr_token'));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = localStorage.getItem('tsr_token');
    if (!t) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('tsr_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('tsr_token', res.data.token);
    setToken(res.data.token);
    setUser({
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      hasGeminiKey: res.data.hasGeminiKey,
    });
    return res.data;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('tsr_token', res.data.token);
    setToken(res.data.token);
    setUser({
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      role: res.data.role,
      hasGeminiKey: res.data.hasGeminiKey,
    });
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tsr_token');
    setToken(null);
    setUser(null);
  }, []);

  const setHasGeminiKey = useCallback((v) => {
    setUser((u) => (u ? { ...u, hasGeminiKey: v } : u));
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      refresh,
      setHasGeminiKey,
    }),
    [user, token, loading, login, register, logout, refresh, setHasGeminiKey]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
