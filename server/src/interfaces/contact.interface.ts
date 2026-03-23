/** Contact entity as stored in PostgreSQL. */
export interface IContact {
  id: string;
  owner_id: string;
  display_name: string;
  phone: string;
  initials: string;
  gradient: string;
  linked_user_id: string | null;
  created_at: string;
  /** Joined from users table when linked. */
  linked_display_name?: string;
  linked_initials?: string;
}

/** Parameters for upserting a contact. */
export interface IContactUpsert {
  ownerId: string;
  displayName: string;
  phone: string;
  initials: string;
  gradient: string;
  linkedUserId?: string | null;
}
