import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, AuthResponse } from "../types";
import {
  apiFetch,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  normalizeUser,
  ApiError,
} from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Store access token in a cookie and set user state after successful login/signup.
   * The refresh token is managed server-side via HttpOnly cookie.
   */
  const login = (data: AuthResponse) => {
    setAccessToken(data.accessToken);
    setUser(normalizeUser(data.user as any));
  };

  /** Update only the user object without touching auth tokens (e.g. after profile PATCH). */
  const updateUser = (u: User) => {
    setUser(u);
  };

  /**
   * Clear access token cookie, wipe user state, and notify server (best-effort).
   * The server will also clear the HttpOnly refresh token cookie.
   */
  const logout = () => {
    const token = getAccessToken();
    clearAccessToken();
    setUser(null);

    // Best-effort server-side invalidation (clears HttpOnly refresh cookie too)
    if (token) {
      fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      }).catch(console.error);
    }
  };

  /**
   * On mount: verify the stored access token by calling GET /users/me.
   * Server returns { user: {...} }, so we unwrap accordingly.
   */
  const checkAuth = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      // Server returns { user: {...} }
      const data = await apiFetch<{ user: User }>("/users/me");
      setUser(normalizeUser(data.user as any));
    } catch (error) {
      // Only wipe tokens on a definitive 401 (invalid / expired + refresh failed).
      // Network errors or 5xx (e.g. backend cold-starting on Render) must NOT
      // log the user out — failing silently is safer than losing the session.
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
      } else {
        console.warn(
          "[auth] checkAuth transient error (tokens preserved):",
          (error as Error).message,
        );
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
