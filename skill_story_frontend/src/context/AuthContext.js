import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

/**
 * AuthContext provides JWT-based authentication state and helpers.
 * Stores access and refresh tokens in localStorage and exposes login/logout/register/refresh/me.
 * It also attempts token refresh on mount if a refresh token is available.
 */

const TOKEN_KEY = "skillstory.token";
const REFRESH_KEY = "skillstory.refresh_token";

const AuthContext = createContext(null);

// PUBLIC_INTERFACE
export function useAuth() {
  /** Use authentication context hook. */
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// PUBLIC_INTERFACE
export function AuthProvider({ children }) {
  /** Provides authentication state and helpers to descendants. */
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return localStorage.getItem(REFRESH_KEY) || "";
    } catch {
      return "";
    }
  });
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Keep api client in sync with token
  useEffect(() => {
    api.setToken(accessToken || "");
  }, [accessToken]);

  const persistTokens = useCallback((tokens) => {
    try {
      if (tokens?.access_token) {
        localStorage.setItem(TOKEN_KEY, tokens.access_token);
        setAccessToken(tokens.access_token);
      }
      if (tokens?.refresh_token) {
        localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
        setRefreshToken(tokens.refresh_token);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearTokens = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore storage errors
    }
    setAccessToken("");
    setRefreshToken("");
  }, []);

  // PUBLIC_INTERFACE
  const login = useCallback(async (email, password) => {
    /** Login with credentials and store token pair, then load current user. */
    const res = await api.login(email, password);
    persistTokens(res.data);
    // Load current user
    try {
      const meRes = await api.me();
      setUser(meRes.data);
    } catch {
      setUser(null);
    }
    return res.data;
  }, [persistTokens]);

  // PUBLIC_INTERFACE
  const register = useCallback(async (email, password, displayName = null) => {
    /** Register a new account and store token pair, then load current user. */
    const res = await api.register(email, password, displayName);
    persistTokens(res.data);
    try {
      const meRes = await api.me();
      setUser(meRes.data);
    } catch {
      setUser(null);
    }
    return res.data;
  }, [persistTokens]);

  // PUBLIC_INTERFACE
  const logout = useCallback(() => {
    /** Clear tokens and user state. */
    clearTokens();
    setUser(null);
  }, [clearTokens]);

  // PUBLIC_INTERFACE
  const refresh = useCallback(async () => {
    /** Attempt to refresh access token using refresh token, update storage, and return new token. */
    if (!refreshToken) throw new Error("No refresh token");
    const res = await api.refresh(refreshToken);
    const data = res?.data || {};
    persistTokens({ access_token: data.access_token, refresh_token: refreshToken });
    return data;
  }, [refreshToken, persistTokens]);

  // PUBLIC_INTERFACE
  const me = useCallback(async () => {
    /** Fetch current user profile if authenticated. */
    const res = await api.me();
    setUser(res.data);
    return res.data;
  }, []);

  // On mount: if we have refresh token but no user, try to refresh and load me
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        if (refreshToken && !accessToken) {
          await refresh();
        }
        if (accessToken || (refreshToken && localStorage.getItem(TOKEN_KEY))) {
          try {
            const meData = await me();
            if (active) setUser(meData);
          } catch {
            if (active) setUser(null);
          }
        }
      } finally {
        if (active) setInitializing(false);
      }
    }
    init();
    return () => { active = false; };
  }, [accessToken, refreshToken, refresh, me]);

  const value = useMemo(() => ({
    user,
    accessToken,
    refreshToken,
    initializing,
    login,
    register,
    logout,
    refresh,
    me,
  }), [user, accessToken, refreshToken, initializing, login, register, logout, refresh, me]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
