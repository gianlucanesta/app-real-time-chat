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
// Set to false to fall back to the localStorage demo (e.g. static Render site).
const USE_API = true;

// In production both frontend and backend are served from the same Render
// service, so relative paths work. For local dev, point to localhost:3001.
const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "/api";

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
export function login({ email, password }) {
  const users = getUsers();
  const normalizedEmail = email.toLowerCase().trim();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user || user.passwordHash !== obscure(password)) {
    return { ok: false, error: "Invalid email or password." };
  }

  sessionStorage.setItem(
    SESSION_TOKEN,
    JSON.stringify({ userId: user.id, ts: Date.now() }),
  );
  return { ok: true, user };
}

export function logout() {
  sessionStorage.removeItem(SESSION_TOKEN);
}

export function isAuthenticated() {
  return !!sessionStorage.getItem(SESSION_TOKEN);
}

export function getCurrentUser() {
  const raw = sessionStorage.getItem(SESSION_TOKEN);
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
  if (!USE_API) return signup({ email, password, displayName, phone });
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
    return { ok: false, error: "Network error – could not reach the server" };
  }
}

/**
 * Log in with email + password via the backend.
 * @param {{ email: string, password: string }} params
 * @returns {Promise<{ ok: boolean, user?: object, accessToken?: string, error?: string }>}
 */
export async function apiLogin({ email, password }) {
  if (!USE_API) return login({ email, password });
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Login failed" };
    sessionStorage.setItem("ephemeral_token", data.accessToken);
    sessionStorage.setItem("ephemeral_refresh", data.refreshToken);
    sessionStorage.setItem("ephemeral_user_api", JSON.stringify(data.user));
    return { ok: true, user: data.user, accessToken: data.accessToken };
  } catch {
    return { ok: false, error: "Network error – could not reach the server" };
  }
}

/**
 * Log out via the backend (invalidates the refresh token server-side).
 */
export async function apiLogout() {
  const refreshToken = sessionStorage.getItem("ephemeral_refresh");
  const token = sessionStorage.getItem("ephemeral_token");
  sessionStorage.removeItem("ephemeral_token");
  sessionStorage.removeItem("ephemeral_refresh");
  sessionStorage.removeItem("ephemeral_user_api");
  if (!USE_API || !token) {
    logout();
    return;
  }
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
  return sessionStorage.getItem("ephemeral_token");
}

/**
 * Returns the current user from the API session or falls back to localStorage.
 * @returns {object|null}
 */
export function getCurrentUserAny() {
  if (USE_API) {
    const raw = sessionStorage.getItem("ephemeral_user_api");
    return raw ? JSON.parse(raw) : null;
  }
  return getCurrentUser();
}

/**
 * Returns true if the user is authenticated (either API token or local session).
 * @returns {boolean}
 */
export function isAuthenticatedAny() {
  if (USE_API) return !!sessionStorage.getItem("ephemeral_token");
  return isAuthenticated();
}
