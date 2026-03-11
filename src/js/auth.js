/**
 * auth.js – Authentication module.
 *
 * When USE_API = true  → calls the real Node.js backend (PA7+).
 * When USE_API = false → uses localStorage simulation (PA6 fallback / offline demo).
 *
 * PA6 note: btoa() was used as a lightweight obfuscator for demo purposes only.
 * It is NOT a cryptographic hash – the real backend uses bcrypt (12 rounds).
 */

// ── API configuration ──────────────────────────────────────────────────────
// In production the frontend and backend are on separate Render services.
// For local dev, point to localhost:3001.
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "https://app-real-time-chat-backend.onrender.com/api";

// Auto-detection: null = not yet probed, true = reachable, false = offline/demo
let _apiAvailable = null;

/**
 * Probe the backend once (GET /api/health, 1.5 s timeout).
 * Caches the result for the entire page session.
 * @returns {Promise<boolean>}
 */
async function _detectApi() {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    _apiAvailable = res.ok;
  } catch {
    _apiAvailable = false;
  }
  return _apiAvailable;
}

const STORAGE_USERS = "ephemeral_users";
const SESSION_TOKEN = "ephemeral_session";
const SCHEMA_VERSION = 1;

// DEMO ONLY: not cryptographically secure
function obscure(pwd) {
  return btoa(pwd + ":ephemeral-demo");
}

function getUsers() {
  const raw = localStorage.getItem(STORAGE_USERS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (parsed._v !== SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_USERS);
      return [];
    }
    return parsed.users;
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(
    STORAGE_USERS,
    JSON.stringify({ _v: SCHEMA_VERSION, users }),
  );
}

/**
 * @param {{ email: string, phone: string, password: string, displayName: string }} params
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
export function signup({ email, phone, password, displayName }) {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();

  if (users.find((u) => u.email === normalizedEmail)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const user = {
    id: "usr_" + Date.now(),
    displayName: displayName.trim(),
    email: normalizedEmail,
    phone: phone || "",
    role: "",
    passwordHash: obscure(password),
    initials,
    avatarGradient: "linear-gradient(135deg,#2563EB,#7C3AED)",
    avatar: null,
  };

  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

/**
 * @param {{ email: string, password: string }} params
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
export function login({ email, password, keepLoggedIn = false }) {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user || user.passwordHash !== obscure(password)) {
    return { ok: false, error: "Invalid email or password." };
  }

  const store = keepLoggedIn ? localStorage : sessionStorage;
  if (keepLoggedIn) {
    localStorage.setItem("ephemeral_remember", "1");
  } else {
    localStorage.removeItem("ephemeral_remember");
  }
  store.setItem(
    SESSION_TOKEN,
    JSON.stringify({ userId: user.id, ts: Date.now() }),
  );
  return { ok: true, user };
}

export function logout() {
  sessionStorage.removeItem(SESSION_TOKEN);
  localStorage.removeItem(SESSION_TOKEN);
  localStorage.removeItem("ephemeral_remember");
}

export function isAuthenticated() {
  return (
    !!sessionStorage.getItem(SESSION_TOKEN) ||
    !!localStorage.getItem(SESSION_TOKEN)
  );
}

export function getCurrentUser() {
  const raw =
    sessionStorage.getItem(SESSION_TOKEN) ||
    localStorage.getItem(SESSION_TOKEN);
  if (!raw) return null;
  try {
    const { userId } = JSON.parse(raw);
    return getUsers().find((u) => u.id === userId) || null;
  } catch {
    return null;
  }
}

/**
 * @param {Partial<object>} updatedFields
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
export function updateUser(updatedFields) {
  const raw = sessionStorage.getItem(SESSION_TOKEN);
  if (!raw) return { ok: false, error: "Not authenticated." };

  const { userId } = JSON.parse(raw);
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { ok: false, error: "User not found." };

  users[idx] = { ...users[idx], ...updatedFields };
  saveUsers(users);
  return { ok: true, user: users[idx] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API-backed functions (PA7+)
// These shadow the localStorage versions above when USE_API = true.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Register a new account via the backend.
 * @param {{ email: string, password: string, displayName: string, phone?: string }} params
 * @returns {Promise<{ ok: boolean, user?: object, accessToken?: string, error?: string }>}
 */
export async function apiSignup({ email, password, displayName, phone = "" }) {
  const useApi = await _detectApi();
  if (!useApi) return signup({ email, password, displayName, phone });
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, phone }),
    });
    const data = await res.json();
    if (!res.ok)
      return { ok: false, error: data.error || "Registration failed" };
    sessionStorage.setItem("ephemeral_token", data.accessToken);
    sessionStorage.setItem("ephemeral_refresh", data.refreshToken);
    sessionStorage.setItem("ephemeral_user_api", JSON.stringify(data.user));
    return { ok: true, user: data.user, accessToken: data.accessToken };
  } catch {
    _apiAvailable = null; // reset so next call re-probes
    return signup({ email, password, displayName, phone });
  }
}

/**
 * Log in with email + password via the backend.
 * @param {{ email: string, password: string }} params
 * @returns {Promise<{ ok: boolean, user?: object, accessToken?: string, error?: string }>}
 */
export async function apiLogin({ email, password, keepLoggedIn = false }) {
  const useApi = await _detectApi();
  if (!useApi) return login({ email, password, keepLoggedIn });
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Login failed" };
    const store = keepLoggedIn ? localStorage : sessionStorage;
    if (keepLoggedIn) {
      localStorage.setItem("ephemeral_remember", "1");
    } else {
      localStorage.removeItem("ephemeral_remember");
    }
    store.setItem("ephemeral_token", data.accessToken);
    store.setItem("ephemeral_refresh", data.refreshToken);
    store.setItem("ephemeral_user_api", JSON.stringify(data.user));
    return { ok: true, user: data.user, accessToken: data.accessToken };
  } catch {
    _apiAvailable = null; // reset so next call re-probes
    return login({ email, password, keepLoggedIn });
  }
}

/**
 * Log out via the backend (invalidates the refresh token server-side).
 */
export async function apiLogout() {
  const refreshToken =
    sessionStorage.getItem("ephemeral_refresh") ||
    localStorage.getItem("ephemeral_refresh");
  const token =
    sessionStorage.getItem("ephemeral_token") ||
    localStorage.getItem("ephemeral_token");
  // Clear tokens from both storages regardless of where they were stored
  ["ephemeral_token", "ephemeral_refresh", "ephemeral_user_api"].forEach(
    (k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    },
  );
  logout(); // also clears SESSION_TOKEN + ephemeral_remember
  if (!_apiAvailable || !token) return;
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    /* best-effort */
  }
}

/**
 * Returns the access token for use in Authorization headers.
 * @returns {string|null}
 */
export function getAccessToken() {
  return (
    sessionStorage.getItem("ephemeral_token") ||
    localStorage.getItem("ephemeral_token")
  );
}

// ── Token refresh / force-logout helpers ───────────────────────────────────────

/**
 * Use the stored refresh token to obtain a new access + refresh token pair.
 * Rotates the stored tokens in the same storage (localStorage / sessionStorage)
 * that they were originally written to.
 * @returns {Promise<boolean>} true if refresh succeeded
 */
async function _tryRefresh() {
  const refreshToken =
    sessionStorage.getItem("ephemeral_refresh") ||
    localStorage.getItem("ephemeral_refresh");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    // Write to whichever storage originally held the tokens
    const store = localStorage.getItem("ephemeral_refresh")
      ? localStorage
      : sessionStorage;
    store.setItem("ephemeral_token", data.accessToken);
    store.setItem("ephemeral_refresh", data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear ALL auth state and redirect the user to the login page.
 * Called when both the access token and the refresh token are invalid/expired.
 */
function _forceLogout() {
  ["ephemeral_token", "ephemeral_refresh", "ephemeral_user_api"].forEach(
    (k) => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    },
  );
  logout(); // clears SESSION_TOKEN + ephemeral_remember

  // Works whether the app is served from /src/ or from root
  const loginPath = window.location.pathname.includes("/src/")
    ? "/src/index.html"
    : "/index.html";
  window.location.href = loginPath;
}

/**
 * Authenticated fetch wrapper.
 * - Injects `Authorization: Bearer <token>` automatically.
 * - On 401: attempts to refresh the access token once and retries the request.
 * - On second 401 (refresh also failed/expired): force-logouts and redirects.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response|undefined>}  undefined means the page is being redirected
 */
export async function apiFetch(url, options = {}) {
  const withToken = (tok) => ({
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${tok}` },
  });

  let token = getAccessToken();
  if (!token) {
    _forceLogout();
    return;
  }

  let res = await fetch(url, withToken(token));
  if (res.status !== 401) return res;

  // First 401 — try to refresh
  const refreshed = await _tryRefresh();
  if (!refreshed) {
    _forceLogout();
    return;
  }

  // Retry once with the new token
  token = getAccessToken();
  res = await fetch(url, withToken(token));
  if (res.status === 401) {
    _forceLogout();
    return;
  }
  return res;
}

/**
 * Proactively refresh the access token (called by the Socket.io connect_error
 * handler so that the next reconnect attempt uses a fresh token).
 * Force-logouts if the refresh token is also expired/invalid.
 * @returns {Promise<boolean>}
 */
export async function refreshTokenIfNeeded() {
  const ok = await _tryRefresh();
  if (!ok) _forceLogout();
  return ok;
}

/**
 * Update the authenticated user's profile via the backend API.
 * Falls back to the localStorage updateUser() when the API is unavailable.
 * @param {string} userId  UUID of the user to update
 * @param {object} fields  camelCase fields to update (displayName, firstName, lastName, phone, role, …)
 * @returns {Promise<{ ok: boolean, user?: object, error?: string }>}
 */
export async function apiUpdateUser(userId, fields) {
  const token = getAccessToken();
  if (!token) return updateUser(fields);
  try {
    const res = await apiFetch(`${API_BASE}/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res) return { ok: false, error: "Session expired" };
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Update failed" };
    // Persist updated user in the same storage that holds the active session
    const storedKey = "ephemeral_user_api";
    if (localStorage.getItem("ephemeral_token")) {
      localStorage.setItem(storedKey, JSON.stringify(data.user));
    } else {
      sessionStorage.setItem(storedKey, JSON.stringify(data.user));
    }
    return { ok: true, user: data.user };
  } catch {
    return updateUser(fields);
  }
}

/**
 * Returns the current user from the API session or falls back to localStorage.
 * @returns {object|null}
 */
export function getCurrentUserAny() {
  const raw =
    sessionStorage.getItem("ephemeral_user_api") ||
    localStorage.getItem("ephemeral_user_api");
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* ignore */
    }
  }
  return getCurrentUser();
}

/**
 * Returns true if the user is authenticated (either API token or local session).
 * @returns {boolean}
 */
export function isAuthenticatedAny() {
  return (
    !!sessionStorage.getItem("ephemeral_token") ||
    !!localStorage.getItem("ephemeral_token") ||
    isAuthenticated()
  );
}
