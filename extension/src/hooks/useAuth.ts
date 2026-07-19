// extension/src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import {
  getUser, saveUser, saveTokens, clearAuth,
  type StoredUser,
} from "../storage/authStorage.js";
import { apiRequest } from "../lib/apiClient.js";

interface AuthResponse {
  message: string;
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UseAuthReturn {
  user: StoredUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);
    setUser(data.user);
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    name?: string
  ) => {
    const data = await apiRequest<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    await saveTokens(data.accessToken, data.refreshToken);
    await saveUser(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await clearAuth();
    setUser(null);
  }, []);

  return { user, isAuthenticated: !!user, loading, login, register, logout };
}
