import { pool } from "../config/db.js";
import type {
  ICommunity,
  ICommunityCreate,
  ICommunityMember,
  ICommunityGroup,
  IAnnouncement,
} from "../interfaces/community.interface.js";

// ── Community CRUD ──────────────────────────────────────────────────────

/** Create a new community. Auto-adds the creator as admin. */
export async function create({
  name,
  description,
  iconUrl = null,
  createdBy,
}: ICommunityCreate): Promise<ICommunity> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<ICommunity>(
      `INSERT INTO communities (name, description, icon_url, created_by, member_count)
       VALUES ($1, $2, $3, $4, 1)
       RETURNING *`,
      [name, description, iconUrl, createdBy],
    );
    const community = rows[0];

    // Auto-add creator as admin
    await client.query(
      `INSERT INTO community_members (community_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [community.id, createdBy],
    );

    // Auto-create the Announcement group
    await client.query(
      `INSERT INTO community_groups (community_id, name, description, created_by)
       VALUES ($1, 'Announcements', 'Community announcements — only admins can post', $2)`,
      [community.id, createdBy],
    );

    await client.query("COMMIT");
    return { ...community, role: "admin" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Find a community by id, including the current user's role. */
export async function findById(
  communityId: string,
  currentUserId: string,
): Promise<ICommunity | null> {
  const { rows } = await pool.query<ICommunity>(
    `SELECT c.*,
            u.display_name AS creator_display_name,
            u.initials     AS creator_initials,
            u.avatar_gradient AS creator_avatar_gradient,
            cm.role
     FROM communities c
     JOIN users u ON u.id = c.created_by
     LEFT JOIN community_members cm
       ON cm.community_id = c.id AND cm.user_id = $2
     WHERE c.id = $1`,
    [communityId, currentUserId],
  );
  return rows[0] ?? null;
}

/** List all communities the current user belongs to. */
export async function listByUser(userId: string): Promise<ICommunity[]> {
  const { rows } = await pool.query<ICommunity>(
    `SELECT c.*,
            u.display_name AS creator_display_name,
            cm.role,
            (SELECT a.content FROM announcements a
             WHERE a.community_id = c.id
             ORDER BY a.created_at DESC LIMIT 1) AS last_announcement,
            (SELECT a.created_at FROM announcements a
             WHERE a.community_id = c.id
             ORDER BY a.created_at DESC LIMIT 1) AS last_announcement_at
     FROM communities c
     JOIN community_members cm ON cm.community_id = c.id AND cm.user_id = $1
     JOIN users u ON u.id = c.created_by
     ORDER BY COALESCE(
       (SELECT a.created_at FROM announcements a WHERE a.community_id = c.id ORDER BY a.created_at DESC LIMIT 1),
       c.created_at
     ) DESC`,
    [userId],
  );
  return rows;
}

/** Update community info (admin only). */
export async function update(
  communityId: string,
  fields: { name?: string; description?: string; icon_url?: string | null },
): Promise<ICommunity | null> {
  const keys = Object.keys(fields).filter((k) =>
    ["name", "description", "icon_url"].includes(k),
  );
  if (!keys.length) return findById(communityId, "");

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);

  const { rows } = await pool.query<ICommunity>(
    `UPDATE communities SET ${setClauses} WHERE id = $1 RETURNING *`,
    [communityId, ...values],
  );
  return rows[0] ?? null;
}

/** Delete a community (creator only). */
export async function deleteById(
  communityId: string,
  userId: string,
): Promise<ICommunity | null> {
  const { rows } = await pool.query<ICommunity>(
    `DELETE FROM communities WHERE id = $1 AND created_by = $2 RETURNING *`,
    [communityId, userId],
  );
  return rows[0] ?? null;
}

// ── Members ─────────────────────────────────────────────────────────────

/** List members of a community with profile info. */
export async function listMembers(
  communityId: string,
): Promise<ICommunityMember[]> {
  const { rows } = await pool.query<ICommunityMember>(
    `SELECT cm.*,
            u.display_name,
            u.initials,
            u.avatar_gradient,
            u.avatar_url
     FROM community_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.community_id = $1
     ORDER BY
       CASE cm.role WHEN 'admin' THEN 0 ELSE 1 END,
       u.display_name`,
    [communityId],
  );
  return rows;
}

/** Add a member to a community. */
export async function addMember(
  communityId: string,
  userId: string,
  role: "admin" | "member" = "member",
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO community_members (community_id, user_id, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [communityId, userId, role],
  );
  if (rowCount && rowCount > 0) {
    await pool.query(
      `UPDATE communities SET member_count = member_count + 1 WHERE id = $1`,
      [communityId],
    );
    return true;
  }
  return false;
}

/** Remove a member from a community. */
export async function removeMember(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM community_members
     WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId],
  );
  if (rowCount && rowCount > 0) {
    await pool.query(
      `UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`,
      [communityId],
    );
    return true;
  }
  return false;
}

/** Update a member's role. */
export async function updateMemberRole(
  communityId: string,
  userId: string,
  role: "admin" | "member",
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE community_members SET role = $3
     WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId, role],
  );
  return (rowCount ?? 0) > 0;
}

/** Check if a user is an admin of a community. */
export async function isAdmin(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ role: string }>(
    `SELECT role FROM community_members
     WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId],
  );
  return rows[0]?.role === "admin";
}

/** Check if a user is a member of a community. */
export async function isMember(
  communityId: string,
  userId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM community_members
     WHERE community_id = $1 AND user_id = $2`,
    [communityId, userId],
  );
  return parseInt(rows[0]?.cnt ?? "0", 10) > 0;
}

// ── Groups ──────────────────────────────────────────────────────────────

/** List groups in a community. */
export async function listGroups(
  communityId: string,
): Promise<ICommunityGroup[]> {
  const { rows } = await pool.query<ICommunityGroup>(
    `SELECT * FROM community_groups
     WHERE community_id = $1
     ORDER BY created_at ASC`,
    [communityId],
  );
  return rows;
}

/** Create a new group within a community. */
export async function createGroup(
  communityId: string,
  name: string,
  description: string,
  createdBy: string,
  iconUrl: string | null = null,
): Promise<ICommunityGroup> {
  const { rows } = await pool.query<ICommunityGroup>(
    `INSERT INTO community_groups (community_id, name, description, icon_url, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [communityId, name, description, iconUrl, createdBy],
  );
  return rows[0];
}

/** Delete a group from a community. */
export async function deleteGroup(
  groupId: string,
  communityId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM community_groups WHERE id = $1 AND community_id = $2`,
    [groupId, communityId],
  );
  return (rowCount ?? 0) > 0;
}

// ── Announcements ───────────────────────────────────────────────────────

/** List announcements for a community (paginated). */
export async function listAnnouncements(
  communityId: string,
  limit = 50,
  offset = 0,
): Promise<IAnnouncement[]> {
  const { rows } = await pool.query<IAnnouncement>(
    `SELECT a.*,
            u.display_name AS author_display_name,
            u.initials     AS author_initials,
            u.avatar_gradient AS author_avatar_gradient,
            u.avatar_url   AS author_avatar_url
     FROM announcements a
     JOIN users u ON u.id = a.author_id
     WHERE a.community_id = $1
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [communityId, limit, offset],
  );
  return rows;
}

/** Create a new announcement (admin only). */
export async function createAnnouncement(
  communityId: string,
  authorId: string,
  content: string,
): Promise<IAnnouncement> {
  const { rows } = await pool.query<IAnnouncement>(
    `INSERT INTO announcements (community_id, author_id, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [communityId, authorId, content],
  );
  return rows[0];
}

/** Delete an announcement. */
export async function deleteAnnouncement(
  announcementId: string,
  communityId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM announcements WHERE id = $1 AND community_id = $2`,
    [announcementId, communityId],
  );
  return (rowCount ?? 0) > 0;
}
