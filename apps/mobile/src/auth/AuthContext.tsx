import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import {
  disableNotifications,
  isRemindersEnabled,
  registerNotificationResponseHandler,
  syncNotifications,
} from '../services/notifications';

type AuthContextValue = {
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'med-tracker-token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadToken = async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      setToken(stored ?? null);
      setLoading(false);
    };

    loadToken();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ token: string }>('/auth/login', { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    setToken(response.token);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.post<{ token: string }>('/auth/register', { name, email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, response.token);
    setToken(response.token);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cleanup: (() => void) | undefined;
    const setup = async () => {
      cleanup = registerNotificationResponseHandler(token);
      if (await isRemindersEnabled()) {
        try {
          await syncNotifications(token);
        } catch {
          // Ignore notification sync errors on app boot.
        }
      }
    };

    setup();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [token]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await api.post('/auth/logout', undefined, token);
      }
    } catch {
      // Ignore server/network errors on logout; always clear local session.
    }
    await disableNotifications();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      loading,
      login,
      register,
      logout,
    }),
    [token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
