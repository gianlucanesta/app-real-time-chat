import type { AuthResponse } from "../types";

const BASE_URL = "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// ── Cookie helpers (access token only — refresh token is HttpOnly/server) ────
const ACCESS_COOKIE = "accessToken";

export function getAccessToken(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ACCESS_COOKIE}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAccessToken(token: string): void {
  // Session cookie (no Max-Age) — expires when browser closes.
  // For "keep me logged in" pass a maxAge; the default here keeps
  // parity with a normal session while the HttpOnly refresh cookie
  // handles long-lived persistence.
  const maxAge = 60 * 60 * 24 * 7; // 7 days — same as refresh token lifetime
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function clearAccessToken(): void {
  document.cookie = `${ACCESS_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

// ── Refresh-token queue ───────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

// ── Main fetch wrapper ────────────────────────────────────────
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let token = getAccessToken();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // send HttpOnly refresh cookie automatically
  });

  // ── 401 → attempt JWT refresh via HttpOnly cookie ─────────────
  if (
    response.status === 401 &&
    endpoint !== "/auth/login" &&
    endpoint !== "/auth/register"
  ) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        // The server reads the refresh token from the HttpOnly cookie.
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!refreshRes.ok) throw new Error("Refresh failed");

        const data: Pick<AuthResponse, "accessToken"> = await refreshRes.json();
        setAccessToken(data.accessToken);
        token = data.accessToken;
        onRefreshed(data.accessToken);
      } catch (err) {
        onRefreshed("");
        clearAccessToken();
        throw new ApiError(401, "Session expired");
      } finally {
        isRefreshing = false;
      }
    } else {
      token = await new Promise<string>((resolve) => {
        refreshSubscribers.push(resolve);
      });
      if (!token) throw new ApiError(401, "Session expired");
    }

    headers.set("Authorization", `Bearer ${token}`);
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });
  }

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { message: text };
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error || data.message || "An error occurred",
    );
  }

  return data as T;
}
