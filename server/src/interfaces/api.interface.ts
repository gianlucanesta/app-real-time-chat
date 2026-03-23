/** Standard API error response. */
export interface IApiError {
  error: string;
}

/** Request body types for auth endpoints. */
export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface LogoutBody {
  refreshToken?: string;
}

/** Request body for creating a message. */
export interface CreateMessageBody {
  conversationId: string;
  text: string;
}

/** Request body for deleting messages. */
export interface DeleteMessagesBody {
  messageIds: string[];
}

/** Request body for creating a contact. */
export interface CreateContactBody {
  displayName: string;
  phone?: string;
  initials?: string;
  gradient?: string;
}

/** Request body for updating a user profile. */
export interface UpdateUserBody {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  initials?: string;
  avatarGradient?: string;
}
