/** Channel entity as stored in PostgreSQL. */
export interface IChannel {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  privacy: "public" | "private";
  follower_count: number;
  created_at: string;
  /** Joined fields */
  owner_display_name?: string;
  owner_initials?: string;
  owner_avatar_gradient?: string;
  is_following?: boolean;
  last_message?: string | null;
  last_message_at?: string | null;
}

/** Parameters for creating a channel. */
export interface IChannelCreate {
  ownerId: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  privacy?: "public" | "private";
}

/** Channel message entity as stored in PostgreSQL. */
export interface IChannelMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  /** Joined fields */
  author_display_name?: string;
  author_initials?: string;
  author_avatar_gradient?: string;
}
