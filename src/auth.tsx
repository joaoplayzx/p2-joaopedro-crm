import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, jsonBody } from './api';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function normalizeUser(value: unknown): User {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const nested = record.user ?? record.usuario;
  return nested && typeof nested === 'object' ? nested as User : record as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    localStorage.removeItem('crm_access_token');
    setUser(null);
    navigate('/login', { replace: true, state: { from: location.pathname } });
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('crm_access_token');
      setUser(null);
      setIsLoading(false);
      navigate('/login', { replace: true, state: { from: location.pathname, expired: true } });
    };
    window.addEventListener('crm:unauthorized', onUnauthorized);
    return () => window.removeEventListener('crm:unauthorized', onUnauthorized);
  }, [location.pathname, navigate]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('crm_access_token');
    if (!token) {
      setIsLoading(false);
      return () => { active = false; };
    }
    api<unknown>('/auth/me')
      .then((result) => { if (active) setUser(normalizeUser(result)); })
      .catch(() => {
        if (active) {
          localStorage.removeItem('crm_access_token');
          setUser(null);
        }
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: jsonBody({ username, password }) });
    if (!result?.accessToken) throw new Error('O servidor não retornou o token de acesso.');
    localStorage.setItem('crm_access_token', result.accessToken);
    const profile = await api<unknown>('/auth/me');
    setUser(normalizeUser(profile));
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
