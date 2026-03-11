"use strict";
const Contact = require("../models/Contact");
const User = require("../models/User");
const { sendJSON, readBody } = require("../utils/http");

/**
 * POST /api/contacts
 * Save a contact for the authenticated user.
 * Body: { displayName, phone, initials?, gradient? }
 * Automatically resolves linked_user_id if the phone matches a registered user.
 */
async function create(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  const { displayName, phone, initials, gradient } = body;
  if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
    return sendJSON(res, 422, { error: "displayName is required" });
  }

  // Try to find a matching registered user by phone
  let linkedUserId = null;
  if (phone) {
    try {
      const found = await User.findByPhone(phone.trim());
      if (found) linkedUserId = found.id;
    } catch {
      // non-critical — proceed without linking
    }
  }

  try {
    const contact = await Contact.upsert({
      ownerId: req.user.sub,
      displayName: displayName.trim(),
      phone: phone?.trim() ?? "",
      initials: initials?.trim() ?? "",
      gradient: gradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)",
      linkedUserId,
    });

    // Enrich the response with the linked user's registered name/initials so
    // the client can display the real profile instead of the manually-typed alias.
    if (linkedUserId) {
      try {
        const linkedUser = await User.findById(linkedUserId);
        if (linkedUser) {
          contact.linked_display_name = linkedUser.display_name;
          contact.linked_initials = linkedUser.initials;
        }
      } catch {
        /* non-critical */
      }
    }

    return sendJSON(res, 201, { contact });
  } catch (err) {
    console.error("[contacts] create error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * GET /api/contacts
 * List all contacts for the authenticated user.
 */
async function list(req, res) {
  try {
    const contacts = await Contact.listByOwner(req.user.sub);
    return sendJSON(res, 200, { contacts });
  } catch (err) {
    console.error("[contacts] list error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * DELETE /api/contacts/:id
 * Remove a contact owned by the authenticated user.
 */
async function remove(req, res, [contactId]) {
  if (!contactId)
    return sendJSON(res, 400, { error: "contact id is required" });
  try {
    const deleted = await Contact.deleteById(contactId, req.user.sub);
    if (!deleted) return sendJSON(res, 404, { error: "Contact not found" });
    return sendJSON(res, 200, { deleted: true });
  } catch (err) {
    console.error("[contacts] remove error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

module.exports = { create, list, remove };
