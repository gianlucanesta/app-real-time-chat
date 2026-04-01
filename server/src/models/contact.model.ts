import { pool } from "../config/db.js";
import type {
  IContact,
  IContactUpsert,
} from "../interfaces/contact.interface.js";

/**
 * Insert or update a contact for a user.
 * If the (owner_id, phone) pair already exists, updates display_name/gradient.
 */
export async function upsert({
  ownerId,
  displayName,
  phone,
  initials,
  gradient,
  linkedUserId = null,
}: IContactUpsert): Promise<IContact> {
  const { rows } = await pool.query<IContact>(
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
 * When a contact is linked to a registered user, their profile fields
 * override the manually-typed alias.
 */
export async function listByOwner(ownerId: string): Promise<IContact[]> {
  const { rows } = await pool.query<IContact>(
    `SELECT
       c.*,
       u.display_name AS linked_display_name,
       u.initials     AS linked_initials,
       u.avatar_url   AS linked_avatar_url
     FROM contacts c
     LEFT JOIN users u ON u.id = c.linked_user_id
     WHERE c.owner_id = $1
     ORDER BY display_name`,
    [ownerId],
  );
  return rows;
}

/** Update a contact's fields by its id, scoped to the owner. */
export async function updateById(
  contactId: string,
  ownerId: string,
  updates: {
    displayName?: string;
    phone?: string;
    initials?: string;
    gradient?: string;
  },
): Promise<IContact | null> {
  const { rows } = await pool.query<IContact>(
    `UPDATE contacts
     SET display_name = COALESCE($3, display_name),
         phone        = COALESCE($4, phone),
         initials     = COALESCE($5, initials),
         gradient     = COALESCE($6, gradient)
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [
      contactId,
      ownerId,
      updates.displayName ?? null,
      updates.phone ?? null,
      updates.initials ?? null,
      updates.gradient ?? null,
    ],
  );
  return rows[0] ?? null;
}

/** Delete a contact by its id, scoped to the owner. */
export async function deleteById(
  contactId: string,
  ownerId: string,
): Promise<IContact | null> {
  const { rows } = await pool.query<IContact>(
    `DELETE FROM contacts WHERE id = $1 AND owner_id = $2 RETURNING *`,
    [contactId, ownerId],
  );
  return rows[0] ?? null;
}

/** Delete a contact by its linked_user_id, scoped to the owner. */
export async function deleteByLinkedUserId(
  ownerId: string,
  linkedUserId: string,
): Promise<IContact | null> {
  const { rows } = await pool.query<IContact>(
    `DELETE FROM contacts WHERE owner_id = $1 AND linked_user_id = $2 RETURNING *`,
    [ownerId, linkedUserId],
  );
  return rows[0] ?? null;
}
