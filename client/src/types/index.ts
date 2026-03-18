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

export interface Message {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  status: "sending" | "sent" | "delivered" | "read";
  expires_at?: Date | string;
  createdAt: Date | string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string; // no longer returned by server (sent as HttpOnly cookie)
}

export interface ApiError {
  error: string;
}
