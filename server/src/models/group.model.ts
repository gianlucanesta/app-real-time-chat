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

export interface IGroupChatWithMembers extends IGroupChat {
  member_ids: string[];
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
          `INSERT INTO group_chat_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [group.id, uid],
        ),
      ),
    );

    await client.query("COMMIT");
    return { ...group, member_ids: allMembers };
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

  // Fetch all member IDs for these groups in one query
  const groupIds = groups.map((g) => g.id);
  const { rows: memberRows } = await pool.query<{
    group_id: string;
    user_id: string;
  }>(
    `SELECT group_id, user_id FROM group_chat_members WHERE group_id = ANY($1)`,
    [groupIds],
  );

  const memberMap = new Map<string, string[]>();
  for (const row of memberRows) {
    if (!memberMap.has(row.group_id)) memberMap.set(row.group_id, []);
    memberMap.get(row.group_id)!.push(row.user_id);
  }

  return groups.map((g) => ({ ...g, member_ids: memberMap.get(g.id) ?? [] }));
}
