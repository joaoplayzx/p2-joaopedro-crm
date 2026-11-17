import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, jsonBody } from './api';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  isLoading: boolean;
  sessionError: string | null;
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
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const logout = useCallback(() => {
    localStorage.removeItem('crm_access_token');
    setUser(null);
    setSessionError(null);
    navigate('/login', { replace: true, state: { from: location } });
  }, [location, navigate]);

  useEffect(() => {
    const onUnauthorized = () => {
      localStorage.removeItem('crm_access_token');
      setUser(null);
      setSessionError(null);
      setIsLoading(false);
      navigate('/login', { replace: true, state: { from: location, expired: true } });
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
    async function validateSession() {
      try {
        const result = await api<unknown>('/auth/me');
        if (active) setUser(normalizeUser(result));
      } catch (error: unknown) {
        if (active) {
          setUser(null);
          if (error instanceof ApiError && error.status === 401) {
            localStorage.removeItem('crm_access_token');
          } else {
            setSessionError(error instanceof Error ? error.message : 'Não foi possível verificar sua sessão.');
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void validateSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setSessionError(null);
    const result = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: jsonBody({ username, password }) });
    if (!result?.accessToken) throw new Error('O servidor não retornou o token de acesso.');
    localStorage.setItem('crm_access_token', result.accessToken);
    try {
      const profile = await api<unknown>('/auth/me');
      setUser(normalizeUser(profile));
    } catch (error) {
      localStorage.removeItem('crm_access_token');
      setUser(null);
      throw error;
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, sessionError, login, logout }), [user, isLoading, sessionError, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
