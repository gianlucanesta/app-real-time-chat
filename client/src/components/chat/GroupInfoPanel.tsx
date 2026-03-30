import {
  X,
  ChevronLeft,
  Search,
  UserPlus,
  Link,
  Bell,
  Star,
  Shield,
  Trash2,
  AlertTriangle,
  Check,
  Pencil,
  LogOut,
  Crown,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

interface GroupMember {
  user_id: string;
  display_name: string;
  phone: string;
  avatar_url: string | null;
  initials: string | null;
  avatar_gradient: string;
  role: "admin" | "member";
  joined_at: string;
}

interface GroupInfo {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  gradient: string;
  initials: string;
  created_by: string;
  created_at: string;
}

interface GroupInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupConversationId: string; // e.g. "grp_<uuid>"
  groupName: string;
  groupInitials: string;
  groupGradient: string;
  groupAvatar?: string | null;
  mediaCount?: number;
  starredCount?: number;
  onSearch?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
}

export function GroupInfoPanel({
  isOpen,
  onClose,
  groupConversationId,
  groupName: initialName,
  groupInitials: initialInitials,
  groupGradient: initialGradient,
  groupAvatar: initialAvatar,
  mediaCount = 0,
  starredCount = 0,
  onSearch,
  onClearChat,
  onDeleteChat,
}: GroupInfoPanelProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [myRole, setMyRole] = useState<"admin" | "member">("member");

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [nameValue, setNameValue] = useState(initialName);
  const [descValue, setDescValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  // Admin-only popup
  const [showAdminOnlyPopup, setShowAdminOnlyPopup] = useState(false);

  // Extract the raw group UUID from "grp_<uuid>"
  const groupId = groupConversationId.startsWith("grp_")
    ? groupConversationId.slice(4)
    : groupConversationId;

  const fetchGroupInfo = useCallback(async () => {
    if (!groupId) return;
    try {
      const data = await apiFetch<{
        group: GroupInfo;
        members: GroupMember[];
        myRole: "admin" | "member";
      }>(`/groups/${groupId}`);
      setGroup(data.group);
      setMembers(data.members);
      setMyRole(data.myRole);
      setNameValue(data.group.name);
      setDescValue(data.group.description);
    } catch {
      // Fallback: use props
      setNameValue(initialName);
    }
  }, [groupId, initialName]);

  useEffect(() => {
    if (isOpen) fetchGroupInfo();
  }, [isOpen, fetchGroupInfo]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);
  useEffect(() => {
    if (editingDescription) descInputRef.current?.focus();
  }, [editingDescription]);

  const isAdmin = myRole === "admin";

  const handleEditNameClick = () => {
    if (!isAdmin) {
      setShowAdminOnlyPopup(true);
      return;
    }
    setEditingName(true);
  };

  const handleEditDescriptionClick = () => {
    if (!isAdmin) {
      setShowAdminOnlyPopup(true);
      return;
    }
    setEditingDescription(true);
  };

  const handleSaveName = async () => {
    if (!nameValue.trim()) return;
    try {
      const data = await apiFetch<{ group: GroupInfo }>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      setGroup(data.group);
      setEditingName(false);
      toast.showToast("Group name updated", "success");
    } catch {
      toast.showToast("Failed to update group name", "error");
    }
  };

  const handleSaveDescription = async () => {
    try {
      const data = await apiFetch<{ group: GroupInfo }>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ description: descValue }),
      });
      setGroup(data.group);
      setEditingDescription(false);
      toast.showToast("Description updated", "success");
    } catch {
      toast.showToast("Failed to update description", "error");
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    try {
      await apiFetch(`/groups/${groupId}/members/${user.id}`, {
        method: "DELETE",
      });
      toast.showToast("Left group", "info");
      onClose();
    } catch {
      toast.showToast("Failed to leave group", "error");
    }
  };

  const displayName = group?.name ?? initialName;
  const displayInitials = group?.initials ?? initialInitials;
  const displayGradient = group?.gradient ?? initialGradient;
  const displayAvatar = group?.icon_url ?? initialAvatar;
  const displayDescription = group?.description ?? "";

  return (
    <div
      className={`absolute inset-0 z-[80] bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Hero: close button, avatar + name centred */}
        <div className="relative flex flex-col items-center justify-center pt-12 pb-6 px-4">
          {/* X button — absolute top-left */}
          <button
            type="button"
            className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Edit button — absolute top-right (admin only activates edit) */}
          <button
            type="button"
            className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            onClick={handleEditNameClick}
            aria-label="Edit group info"
          >
            <Pencil className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div className="mb-4">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full text-3xl font-bold flex items-center justify-center shadow-sm"
                style={{ background: displayGradient, color: "#fff" }}
              >
                {displayInitials}
              </div>
            )}
          </div>

          {/* Group name (editable) */}
          {editingName ? (
            <div className="flex items-center gap-2 w-full max-w-xs">
              <input
                ref={nameInputRef}
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="flex-1 text-xl font-bold text-text-main bg-input border border-border rounded-lg px-3 py-1.5 outline-none focus:border-accent"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameValue(displayName);
                  }
                }}
                maxLength={100}
              />
              <button
                type="button"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent/90 transition-colors"
                onClick={() => void handleSaveName()}
                aria-label="Save name"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xl font-bold text-text-main mb-0.5">
              {displayName}
            </div>
          )}

          {/* Subtitle: "Group · N members" */}
          <div className="text-sm text-accent font-medium">
            Group · {members.length} member{members.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Quick action buttons: Add member | Search */}
        <div className="flex items-center justify-center mb-6 px-4">
          <div className="flex items-center gap-2 w-full max-w-xs md:max-w-xl">
            {isAdmin && (
              <button
                type="button"
                className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent"
                onClick={() =>
                  toast.showToast("Add member coming soon", "info")
                }
              >
                <UserPlus className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Add</span>
              </button>
            )}
            <button
              type="button"
              className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent"
              onClick={onSearch}
            >
              <Search className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">Search</span>
            </button>
          </div>
        </div>

        {/* Description section (editable by admin) */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm px-4 py-3.5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-text-secondary">
              Description
            </div>
            {isAdmin && !editingDescription && (
              <button
                type="button"
                className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-input transition-colors"
                onClick={handleEditDescriptionClick}
                aria-label="Edit description"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {editingDescription ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={descInputRef}
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                className="w-full text-sm text-text-main bg-input border border-border rounded-lg px-3 py-2 outline-none focus:border-accent resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditingDescription(false);
                    setDescValue(displayDescription);
                  }
                }}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent/90 transition-colors"
                  onClick={() => void handleSaveDescription()}
                  aria-label="Save description"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-main">
              {displayDescription || (
                <span className="text-text-secondary italic">
                  {isAdmin ? "Add a group description" : "No description"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Group 1: Media + Important */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Link className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Media, links &amp; docs</span>
            </div>
            <div className="flex items-center gap-1 text-text-secondary">
              <span className="text-xs font-semibold mr-1">{mediaCount}</span>
              <ChevronLeft className="w-4 h-4 rotate-180 opacity-70" />
            </div>
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Star className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Important</span>
            </div>
            <div className="flex items-center gap-1 text-text-secondary">
              <span className="text-xs font-semibold mr-1">{starredCount}</span>
              <ChevronLeft className="w-4 h-4 rotate-180 opacity-70" />
            </div>
          </button>
        </div>

        {/* Group 2: Notifications */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Notifications</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
        </div>

        {/* Encryption */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-text-secondary" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Encryption</span>
                <span className="text-xs text-text-secondary">
                  Messages are end-to-end encrypted
                </span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
        </div>

        {/* Members list */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <div className="px-4 pt-3.5 pb-2">
            <div className="text-xs font-semibold text-text-secondary">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Add member button (admin only) */}
          {isAdmin && (
            <>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-input transition-colors text-sm"
                onClick={() =>
                  toast.showToast("Add member coming soon", "info")
                }
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium text-accent">Add member</span>
              </button>
              <div className="h-[1px] bg-border/50 mx-12"></div>
            </>
          )}

          {/* Member rows */}
          {members.map((m) => {
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.user_id}>
                <div className="w-full flex items-center gap-3 px-4 py-2.5 text-sm">
                  {/* Avatar */}
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.display_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center shrink-0"
                      style={{
                        background: m.avatar_gradient,
                        color: "#fff",
                      }}
                    >
                      {m.initials}
                    </div>
                  )}

                  {/* Name + role badge */}
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-main truncate">
                        {isMe ? "You" : m.display_name}
                      </span>
                      {m.role === "admin" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase tracking-wide">
                          <Crown className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    {m.phone && (
                      <span className="text-xs text-text-secondary truncate w-full">
                        {m.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div className="h-2" />
        </div>

        {/* Leave group */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
            onClick={() => void handleLeaveGroup()}
          >
            <LogOut className="w-5 h-5" />
            <span>Leave group</span>
          </button>
        </div>

        {/* Danger actions */}
        <div className="bg-card mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
            onClick={onClearChat}
          >
            <Trash2 className="w-5 h-5" />
            <span>Clear chat</span>
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
            onClick={() => toast.showToast("Group reported", "info")}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Report group</span>
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
            onClick={onDeleteChat}
          >
            <Trash2 className="w-5 h-5" />
            <span>Delete chat</span>
          </button>
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </div>

      {/* Admin-only popup overlay */}
      {showAdminOnlyPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setShowAdminOnlyPopup(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-text-main text-sm mb-4">
              Only admins can edit group info
            </p>
            <button
              type="button"
              className="px-6 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
              onClick={() => setShowAdminOnlyPopup(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
