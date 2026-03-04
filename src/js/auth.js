/**
 * auth.js – Frontend-only authentication module.
 *
 * IMPORTANT: This module uses btoa() as a lightweight obfuscator for demo
 * purposes only. It is NOT a secure hashing function and must NEVER be used
 * to protect real user credentials in production.
 */

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
