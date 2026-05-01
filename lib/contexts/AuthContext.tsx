'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../api-client';

interface AuthState {
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUsername(res.admin.username))
      .catch(() => {
        setToken(null);
        setUsername(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (u: string, p: string) => {
    const res = await api.login(u, p);
    setToken(res.token);
    setUsername(res.admin.username);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUsername(null);
  }, []);

  const value = useMemo(() => ({ username, loading, login, logout }), [username, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
