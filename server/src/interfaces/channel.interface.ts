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
}

/** Parameters for creating a channel. */
export interface IChannelCreate {
  ownerId: string;
  name: string;
  description: string;
  avatarUrl?: string | null;
  privacy?: "public" | "private";
}
