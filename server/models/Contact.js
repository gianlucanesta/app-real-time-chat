"use strict";
const { pool } = require("../config/db");

/**
 * Data-access object for the `contacts` table.
 */

/**
 * Insert a new contact for a user, or update display_name/gradient if the
 * (owner_id, phone) pair already exists.
 */
async function upsert({
  ownerId,
  displayName,
  phone,
  initials,
  gradient,
  linkedUserId = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (owner_id, display_name, phone, initials, gradient, linked_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (owner_id, phone)
     DO UPDATE SET
       display_name   = EXCLUDED.display_name,
       initials       = EXCLUDED.initials,
       gradient       = EXCLUDED.gradient,
       linked_user_id = EXCLUDED.linked_user_id
     RETURNING *`,
    [
      ownerId,
      displayName,
      phone || "",
      initials || "",
      gradient || "linear-gradient(135deg,#2563EB,#7C3AED)",
      linkedUserId,
    ],
  );
  return rows[0];
}

/**
 * List all contacts owned by a user.
 */
async function listByOwner(ownerId) {
  const { rows } = await pool.query(
    `SELECT * FROM contacts WHERE owner_id = $1 ORDER BY display_name`,
    [ownerId],
  );
  return rows;
}

module.exports = { upsert, listByOwner };
