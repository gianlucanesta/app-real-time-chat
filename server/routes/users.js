"use strict";
const User = require("../models/User");
const { sendJSON, readBody, getQueryParams } = require("../utils/http");

/**
 * GET /api/users/me
 * Returns the authenticated user's profile (no password_hash).
 */
async function me(req, res) {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return sendJSON(res, 404, { error: "User not found" });
    return sendJSON(res, 200, { user });
  } catch (err) {
    console.error("[users] me error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * GET /api/users/search?q=<query>
 * Simple ILIKE search on display_name.
 */
async function search(req, res) {
  const { q } = getQueryParams(req);
  if (!q || q.trim().length < 2) {
    return sendJSON(res, 422, {
      error: 'Query parameter "q" must be at least 2 characters',
    });
  }

  try {
    const users = await User.search(q.trim());
    return sendJSON(res, 200, { users });
  } catch (err) {
    console.error("[users] search error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * PATCH /api/users/:id
 * Partial profile update. A user can only update their own profile.
 * Allowed fields: displayName, phone, role, avatarUrl
 *
 * @param {string[]} params  [0] = userId from URL capture group
 */
async function update(req, res, [userId]) {
  if (req.user.sub !== userId) {
    return sendJSON(res, 403, {
      error: "Cannot update another user's profile",
    });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  // Map camelCase client fields → snake_case DB columns
  const allowed = {
    displayName: "display_name",
    firstName: "first_name",
    lastName: "last_name",
    phone: "phone",
    role: "role",
    avatarUrl: "avatar_url",
    initials: "initials",
    avatarGradient: "avatar_gradient",
  };

  const fields = {};
  for (const [clientKey, dbCol] of Object.entries(allowed)) {
    if (body[clientKey] !== undefined) fields[dbCol] = body[clientKey];
  }

  if (!Object.keys(fields).length) {
    return sendJSON(res, 422, { error: "No updatable fields provided" });
  }

  try {
    const user = await User.update(userId, fields);
    if (!user) return sendJSON(res, 404, { error: "User not found" });
    return sendJSON(res, 200, { user });
  } catch (err) {
    console.error("[users] update error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * GET /api/users/lookup-phone?phone=<full_number>
 * Returns { found: true, user: {...} } or { found: false }.
 * Phone must include the country code prefix (e.g. "+39355999999").
 */
async function lookupPhone(req, res) {
  const { phone } = getQueryParams(req);
  if (!phone || phone.trim().length < 4) {
    return sendJSON(res, 422, { error: '"phone" query param is required' });
  }
  try {
    const user = await User.findByPhone(phone.trim());
    if (!user) return sendJSON(res, 200, { found: false });
    return sendJSON(res, 200, { found: true, user });
  } catch (err) {
    console.error("[users] lookupPhone error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

module.exports = { me, search, update, lookupPhone };
