export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  avatarGradient?: string;
  role?: string;
  phone?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  nickname?: string;
  contactUser?: User; // Populated contact user data
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  mediaFileName?: string | null;
  viewOnce?: boolean;
  viewedAt?: Date | string | null;
  status: "sending" | "sent" | "delivered" | "read";
  expires_at?: Date | string;
  createdAt: Date | string;
  linkPreview?: LinkPreview | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string; // no longer returned by server (sent as HttpOnly cookie)
}

export interface ApiError {
  error: string;
}

// ── Call History Types ──

export type CallDirection = "incoming" | "outgoing";
export type CallType = "voice" | "video";
export type CallResult =
  | "accepted"
  | "missed"
  | "declined"
  | "no_answer"
  | "accepted_elsewhere";

export interface CallRecord {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string | null;
  contactGradient?: string;
  contactInitials: string;
  direction: CallDirection;
  callType: CallType;
  result: CallResult;
  timestamp: string; // ISO string
  duration?: number; // seconds
}

export interface CallGroup {
  contactId: string;
  contactName: string;
  contactAvatar?: string | null;
  contactGradient?: string;
  contactInitials: string;
  calls: CallRecord[];
  lastCall: CallRecord;
  count: number;
}

// ── Status / Stories Types ──

export type StatusPrivacy = "contacts" | "contacts_except" | "only_share_with";

export type StatusMediaType = "image" | "video" | "text";

export interface StatusItem {
  id: string;
  mediaType: StatusMediaType;
  mediaUrl?: string;
  text?: string;
  textBgGradient?: string;
  caption?: string;
  timestamp: string; // ISO
  viewed: boolean;
}

export interface ContactStatus {
  contactId: string;
  contactName: string;
  contactAvatar?: string | null;
  contactGradient?: string;
  contactInitials: string;
  items: StatusItem[];
  lastUpdated: string; // ISO — timestamp of the most recent item
  allViewed: boolean;
}

export interface MyStatus {
  items: StatusItem[];
  lastUpdated?: string;
}

export interface StatusReply {
  mediaType: "text" | "image" | "video";
  text?: string | null;
  textBgGradient?: string | null;
  mediaUrl?: string | null;
  caption?: string | null;
  senderName: string;
}

// ── Channel Types ──

export interface Channel {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  privacy: "public" | "private";
  follower_count: number;
  created_at: string;
  owner_display_name?: string;
  owner_initials?: string;
  owner_avatar_gradient?: string;
  is_following?: boolean;
  last_message?: string | null;
  last_message_at?: string | null;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  created_at: string;
  author_display_name?: string;
  author_initials?: string;
  author_avatar_gradient?: string;
}

// ── Community Types ──

export interface Community {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
  creator_display_name?: string;
  creator_initials?: string;
  creator_avatar_gradient?: string;
  role?: "admin" | "member";
  last_announcement?: string | null;
  last_announcement_at?: string | null;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: "admin" | "member";
  muted_until: string | null;
  joined_at: string;
  display_name?: string;
  initials?: string;
  avatar_gradient?: string;
  avatar_url?: string | null;
}

export interface CommunityGroup {
  id: string;
  community_id: string;
  name: string;
  description: string;
  icon_url: string | null;
  created_by: string;
  member_count: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  community_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_display_name?: string;
  author_initials?: string;
  author_avatar_gradient?: string;
  author_avatar_url?: string | null;
}
