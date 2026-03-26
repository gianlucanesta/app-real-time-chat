/** Community entities as stored in PostgreSQL. */

export interface ICommunity {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
  /** Joined fields */
  creator_display_name?: string;
  creator_initials?: string;
  creator_avatar_gradient?: string;
  role?: "admin" | "member";
  last_announcement?: string | null;
  last_announcement_at?: string | null;
}

export interface ICommunityCreate {
  name: string;
  description: string;
  iconUrl?: string | null;
  createdBy: string;
}

export interface ICommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: "admin" | "member";
  muted_until: string | null;
  joined_at: string;
  /** Joined fields */
  display_name?: string;
  initials?: string;
  avatar_gradient?: string;
  avatar_url?: string | null;
}

export interface ICommunityGroup {
  id: string;
  community_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
}

export interface IAnnouncement {
  id: string;
  community_id: string;
  author_id: string;
  content: string;
  created_at: string;
  /** Joined fields */
  author_display_name?: string;
  author_initials?: string;
  author_avatar_gradient?: string;
  author_avatar_url?: string | null;
  reaction_count?: number;
}
