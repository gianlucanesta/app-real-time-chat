import { pool } from "../config/db.js";

export interface IGroupChat {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  gradient: string;
  initials: string;
  created_by: string;
  created_at: string;
}

export interface IGroupMember {
  user_id: string;
  display_name: string;
  phone: string;
  avatar_url: string | null;
  initials: string | null;
  avatar_gradient: string;
  role: "admin" | "member";
  joined_at: string;
}

export interface IGroupChatWithMembers extends IGroupChat {
  member_ids: string[];
  member_names: Record<string, string>;
}

/** Create a new group chat and add all members (including creator). */
export async function create(
  name: string,
  createdBy: string,
  memberIds: string[],
): Promise<IGroupChatWithMembers> {
  // Derive initials from name (up to 2 chars)
  const words = name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query<IGroupChat>(
      `INSERT INTO group_chats (name, initials, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), initials, createdBy],
    );
    const group = rows[0];

    // Ensure creator is always in member list
    const allMembers = Array.from(new Set([createdBy, ...memberIds]));

    await Promise.all(
      allMembers.map((uid) =>
        client.query(
          `INSERT INTO group_chat_members (group_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [group.id, uid, uid === createdBy ? "admin" : "member"],
        ),
      ),
    );

    await client.query("COMMIT");
    // Fetch display names for all members
    const { rows: nameRows } = await client.query<{
      id: string;
      display_name: string;
    }>(`SELECT id, display_name FROM users WHERE id = ANY($1)`, [allMembers]);
    const member_names: Record<string, string> = {};
    for (const r of nameRows) member_names[r.id] = r.display_name;
    return { ...group, member_ids: allMembers, member_names };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** List all group chats a user belongs to, with their member IDs. */
export async function listForUser(
  userId: string,
): Promise<IGroupChatWithMembers[]> {
  // Fetch all groups the user is a member of
  const { rows: groups } = await pool.query<IGroupChat>(
    `SELECT gc.*
     FROM group_chats gc
     JOIN group_chat_members gcm ON gcm.group_id = gc.id
     WHERE gcm.user_id = $1
     ORDER BY gc.created_at DESC`,
    [userId],
  );

  if (!groups.length) return [];

  // Fetch all member IDs and display names for these groups in one query
  const groupIds = groups.map((g) => g.id);
  const { rows: memberRows } = await pool.query<{
    group_id: string;
    user_id: string;
    display_name: string;
  }>(
    `SELECT gcm.group_id, gcm.user_id, u.display_name
     FROM group_chat_members gcm
     JOIN users u ON u.id = gcm.user_id
     WHERE gcm.group_id = ANY($1)`,
    [groupIds],
  );

  const memberMap = new Map<string, string[]>();
  const nameMap = new Map<string, Record<string, string>>();
  for (const row of memberRows) {
    if (!memberMap.has(row.group_id)) memberMap.set(row.group_id, []);
    memberMap.get(row.group_id)!.push(row.user_id);
    if (!nameMap.has(row.group_id)) nameMap.set(row.group_id, {});
    nameMap.get(row.group_id)![row.user_id] = row.display_name;
  }

  return groups.map((g) => ({
    ...g,
    member_ids: memberMap.get(g.id) ?? [],
    member_names: nameMap.get(g.id) ?? {},
  }));
}

/** Get a single group chat by ID. */
export async function getById(groupId: string): Promise<IGroupChat | null> {
  const { rows } = await pool.query<IGroupChat>(
    `SELECT * FROM group_chats WHERE id = $1`,
    [groupId],
  );
  return rows[0] ?? null;
}

/** Get group members with their user info and roles. */
export async function getMembers(groupId: string): Promise<IGroupMember[]> {
  const { rows } = await pool.query<IGroupMember>(
    `SELECT gcm.user_id, u.display_name, u.phone, u.avatar_url, u.initials, u.avatar_gradient, gcm.role, gcm.joined_at
     FROM group_chat_members gcm
     JOIN users u ON u.id = gcm.user_id
     WHERE gcm.group_id = $1
     ORDER BY
       CASE WHEN gcm.role = 'admin' THEN 0 ELSE 1 END,
       u.display_name`,
    [groupId],
  );
  return rows;
}

/** Get a member's role in a group. Returns null if not a member. */
export async function getMemberRole(
  groupId: string,
  userId: string,
): Promise<"admin" | "member" | null> {
  const { rows } = await pool.query<{ role: string }>(
    `SELECT role FROM group_chat_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId],
  );
  return (rows[0]?.role as "admin" | "member") ?? null;
}

/** Update group info (name, description, icon_url). Only provided fields are updated. */
export async function updateGroup(
  groupId: string,
  updates: { name?: string; description?: string; icon_url?: string | null },
): Promise<IGroupChat | null> {
  const setClauses: string[] = [];
  const values: (string | null)[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx}`);
    values.push(updates.name.trim());
    idx++;
    // Also update initials
    const words = updates.name.trim().split(/\s+/);
    const initials =
      words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : updates.name.trim().slice(0, 2).toUpperCase();
    setClauses.push(`initials = $${idx}`);
    values.push(initials);
    idx++;
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${idx}`);
    values.push(updates.description);
    idx++;
  }
  if (updates.icon_url !== undefined) {
    setClauses.push(`icon_url = $${idx}`);
    values.push(updates.icon_url);
    idx++;
  }

  if (setClauses.length === 0) return getById(groupId);

  values.push(groupId);
  const { rows } = await pool.query<IGroupChat>(
    `UPDATE group_chats SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}

/** Add a member to a group. */
export async function addMember(
  groupId: string,
  userId: string,
  role: "admin" | "member" = "member",
): Promise<void> {
  await pool.query(
    `INSERT INTO group_chat_members (group_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [groupId, userId, role],
  );
}

/** Remove a member from a group. */
export async function removeMember(
  groupId: string,
  userId: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM group_chat_members WHERE group_id = $1 AND user_id = $2`,
    [groupId, userId],
  );
}

/** Update a member's role. */
export async function updateMemberRole(
  groupId: string,
  userId: string,
  role: "admin" | "member",
): Promise<void> {
  await pool.query(
    `UPDATE group_chat_members SET role = $1 WHERE group_id = $2 AND user_id = $3`,
    [role, groupId, userId],
  );
}
