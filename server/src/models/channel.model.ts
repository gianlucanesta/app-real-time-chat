import { pool } from "../config/db.js";
import type { IChannel, IChannelCreate, IChannelMessage } from "../interfaces/channel.interface.js";

/** Create a new channel. */
export async function create({
  ownerId,
  name,
  description,
  avatarUrl = null,
  privacy = "public",
}: IChannelCreate): Promise<IChannel> {
  const { rows } = await pool.query<IChannel>(
    `INSERT INTO channels (owner_id, name, description, avatar_url, privacy, follower_count)
     VALUES ($1, $2, $3, $4, $5, 1)
     RETURNING *`,
    [ownerId, name, description, avatarUrl, privacy],
  );
  // Auto-follow the creator
  await pool.query(
    `INSERT INTO channel_followers (channel_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [rows[0].id, ownerId],
  );
  return rows[0];
}

/** Find a channel by id. */
export async function findById(
  channelId: string,
  currentUserId?: string,
): Promise<IChannel | null> {
  const { rows } = await pool.query<IChannel>(
    `SELECT c.*,
            u.display_name AS owner_display_name,
            u.initials     AS owner_initials,
            u.avatar_gradient AS owner_avatar_gradient,
            EXISTS(
              SELECT 1 FROM channel_followers cf
              WHERE cf.channel_id = c.id AND cf.user_id = $2
            ) AS is_following
     FROM channels c
     JOIN users u ON u.id = c.owner_id
     WHERE c.id = $1`,
    [channelId, currentUserId ?? "00000000-0000-0000-0000-000000000000"],
  );
  return rows[0] ?? null;
}

/**
 * List channels visible to the current user.
 * Returns all public channels + private channels owned by the user.
 * Includes latest message preview for followed channels.
 */
export async function listAll(
  currentUserId: string,
  search?: string,
): Promise<IChannel[]> {
  const params: (string | number)[] = [currentUserId];
  let searchClause = "";
  if (search && search.trim()) {
    searchClause = `AND c.name ILIKE $2`;
    params.push(`%${search.trim()}%`);
  }
  const { rows } = await pool.query<IChannel>(
    `SELECT c.*,
            u.display_name AS owner_display_name,
            u.initials     AS owner_initials,
            u.avatar_gradient AS owner_avatar_gradient,
            EXISTS(
              SELECT 1 FROM channel_followers cf
              WHERE cf.channel_id = c.id AND cf.user_id = $1
            ) AS is_following,
            lm.content AS last_message,
            lm.created_at AS last_message_at
     FROM channels c
     JOIN users u ON u.id = c.owner_id
     LEFT JOIN LATERAL (
       SELECT cm.content, cm.created_at
       FROM channel_messages cm
       WHERE cm.channel_id = c.id
       ORDER BY cm.created_at DESC
       LIMIT 1
     ) lm ON true
     WHERE (c.privacy = 'public' OR c.owner_id = $1)
     ${searchClause}
     ORDER BY c.follower_count DESC, c.created_at DESC`,
    params,
  );
  return rows;
}

/** Follow a channel. */
export async function follow(
  channelId: string,
  userId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO channel_followers (channel_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [channelId, userId],
  );
  if (rowCount && rowCount > 0) {
    await pool.query(
      `UPDATE channels SET follower_count = follower_count + 1 WHERE id = $1`,
      [channelId],
    );
    return true;
  }
  return false;
}

/** Unfollow a channel. */
export async function unfollow(
  channelId: string,
  userId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2`,
    [channelId, userId],
  );
  if (rowCount && rowCount > 0) {
    await pool.query(
      `UPDATE channels SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = $1`,
      [channelId],
    );
    return true;
  }
  return false;
}

/** Delete a channel (only owner). */
export async function deleteById(
  channelId: string,
  ownerId: string,
): Promise<IChannel | null> {
  const { rows } = await pool.query<IChannel>(
    `DELETE FROM channels WHERE id = $1 AND owner_id = $2 RETURNING *`,
    [channelId, ownerId],
  );
  return rows[0] ?? null;
}

// ── Channel Messages ─────────────────────────────────────────────

/** Create a message in a channel (only owner). */
export async function createMessage(
  channelId: string,
  authorId: string,
  content: string,
  mediaUrl?: string | null,
): Promise<IChannelMessage> {
  const { rows } = await pool.query<IChannelMessage>(
    `INSERT INTO channel_messages (channel_id, author_id, content, media_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [channelId, authorId, content.trim(), mediaUrl ?? null],
  );
  return rows[0];
}

/** List messages for a channel (newest first, paginated). */
export async function listMessages(
  channelId: string,
  limit = 50,
  before?: string,
): Promise<IChannelMessage[]> {
  const params: (string | number)[] = [channelId, limit];
  let beforeClause = "";
  if (before) {
    beforeClause = "AND cm.created_at < (SELECT created_at FROM channel_messages WHERE id = $3)";
    params.push(before);
  }
  const { rows } = await pool.query<IChannelMessage>(
    `SELECT cm.*,
            u.display_name AS author_display_name,
            u.initials     AS author_initials,
            u.avatar_gradient AS author_avatar_gradient
     FROM channel_messages cm
     JOIN users u ON u.id = cm.author_id
     WHERE cm.channel_id = $1
     ${beforeClause}
     ORDER BY cm.created_at ASC
     LIMIT $2`,
    params,
  );
  return rows;
}
