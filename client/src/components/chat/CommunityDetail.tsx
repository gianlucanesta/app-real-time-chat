import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  Megaphone,
  Settings,
  Send,
  Trash2,
  Plus,
  LayoutGrid,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type {
  Community,
  CommunityMember,
  CommunityGroup,
  Announcement,
} from "../../types";

interface CommunityDetailProps {
  community: Community;
  onBack: () => void;
  onUpdated: () => void;
}

type Tab = "announcements" | "groups" | "members";

export function CommunityDetail({
  community,
  onBack,
  onUpdated,
}: CommunityDetailProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  const isAdmin = community.role === "admin";

  // Fetch data based on tab
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === "announcements") {
          const data = await apiFetch<{ announcements: Announcement[] }>(
            `/communities/${community.id}/announcements`,
          );
          setAnnouncements(data.announcements);
        } else if (tab === "groups") {
          const data = await apiFetch<{ groups: CommunityGroup[] }>(
            `/communities/${community.id}/groups`,
          );
          setGroups(data.groups);
        } else {
          const data = await apiFetch<{ members: CommunityMember[] }>(
            `/communities/${community.id}/members`,
          );
          setMembers(data.members);
        }
      } catch (err) {
        console.error(`Failed to fetch ${tab}:`, err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab, community.id]);

  const handleSendAnnouncement = async () => {
    if (!newAnnouncement.trim() || isSending) return;
    setIsSending(true);
    try {
      await apiFetch(`/communities/${community.id}/announcements`, {
        method: "POST",
        body: JSON.stringify({ content: newAnnouncement.trim() }),
      });
      setNewAnnouncement("");
      // Refresh announcements
      const data = await apiFetch<{ announcements: Announcement[] }>(
        `/communities/${community.id}/announcements`,
      );
      setAnnouncements(data.announcements);
      onUpdated();
    } catch (err) {
      console.error("Failed to send announcement:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      await apiFetch(
        `/communities/${community.id}/announcements/${announcementId}`,
        { method: "DELETE" },
      );
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
      onUpdated();
    } catch (err) {
      console.error("Failed to delete announcement:", err);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;
    try {
      await apiFetch(`/communities/${community.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: newMemberEmail.trim() }),
      });
      setNewMemberEmail("");
      setShowAddMember(false);
      // Refresh members
      const data = await apiFetch<{ members: CommunityMember[] }>(
        `/communities/${community.id}/members`,
      );
      setMembers(data.members);
      onUpdated();
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await apiFetch(`/communities/${community.id}/members/${userId}`, {
        method: "DELETE",
      });
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      onUpdated();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleToggleRole = async (
    userId: string,
    currentRole: "admin" | "member",
  ) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      await apiFetch(`/communities/${community.id}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
      );
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await apiFetch(`/communities/${community.id}/groups`, {
        method: "POST",
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
        }),
      });
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateGroup(false);
      const data = await apiFetch<{ groups: CommunityGroup[] }>(
        `/communities/${community.id}/groups`,
      );
      setGroups(data.groups);
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await apiFetch(`/communities/${community.id}/groups/${groupId}`, {
        method: "DELETE",
      });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86_400_000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 7 * 86_400_000) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "announcements",
      label: "Announcements",
      icon: <Megaphone className="w-4 h-4" />,
    },
    {
      key: "groups",
      label: "Groups",
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      key: "members",
      label: "Members",
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-bg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[64px] border-b border-border bg-card shrink-0">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-input md:hidden transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          {community.icon_url ? (
            <img
              src={community.icon_url}
              alt={community.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <Users className="w-5 h-5 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-text-main text-[15px] truncate">
            {community.name}
          </h2>
          <p className="text-[12px] text-text-secondary">
            {community.member_count} member
            {community.member_count !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input hover:text-text-main transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Community description */}
      {community.description && (
        <div className="px-4 py-3 bg-card/50 border-b border-border">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            {community.description}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border bg-card shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-colors relative ${
              tab === t.key
                ? "text-accent"
                : "text-text-secondary hover:text-text-main"
            }`}
          >
            {t.icon}
            {t.label}
            {tab === t.key && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-accent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : tab === "announcements" ? (
          /* ── Announcements ── */
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {announcements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                    <Megaphone className="w-7 h-7 text-accent" />
                  </div>
                  <p className="text-text-secondary text-[14px]">
                    No announcements yet
                  </p>
                  {isAdmin && (
                    <p className="text-text-secondary text-[12px] mt-1">
                      Send the first announcement to your community
                    </p>
                  )}
                </div>
              ) : (
                announcements.map((a) => (
                  <div
                    key={a.id}
                    className="bg-card rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                        style={{
                          background:
                            a.author_avatar_gradient ||
                            "linear-gradient(135deg, #2563EB, #7C3AED)",
                        }}
                      >
                        {a.author_avatar_url ? (
                          <img
                            src={a.author_avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          a.author_initials || "?"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-text-main text-[13px]">
                          {a.author_display_name || "Admin"}
                        </span>
                        <span className="text-text-secondary text-[11px] ml-2">
                          {formatDate(a.created_at)}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteAnnouncement(a.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          aria-label="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-text-main text-[14px] leading-relaxed whitespace-pre-wrap">
                      {a.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Announcement input (admin only) */}
            {isAdmin && (
              <div className="px-4 py-3 border-t border-border bg-card shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    placeholder="Write an announcement..."
                    value={newAnnouncement}
                    onChange={(e) => setNewAnnouncement(e.target.value)}
                    rows={2}
                    className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAnnouncement();
                      }
                    }}
                  />
                  <button
                    onClick={handleSendAnnouncement}
                    disabled={!newAnnouncement.trim() || isSending}
                    className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    aria-label="Send announcement"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : tab === "groups" ? (
          /* ── Groups ── */
          <div className="px-4 py-4 space-y-2">
            {/* Announcements group (always first) */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-main text-[14px]">
                  Announcements
                </p>
                <p className="text-[12px] text-text-secondary">
                  Admin-only broadcast group
                </p>
              </div>
            </div>

            {groups
              .filter((g) => g.name !== "Announcements")
              .map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-input transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-main text-[14px] truncate">
                      {g.name}
                    </p>
                    <p className="text-[12px] text-text-secondary truncate">
                      {g.description || `${g.member_count} members`}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(g.id);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

            {/* Add group button (admin only) */}
            {isAdmin && !showCreateGroup && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-accent hover:bg-accent/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-accent" />
                </div>
                <span className="font-medium text-[14px]">Create Group</span>
              </button>
            )}

            {/* Create group inline form */}
            {isAdmin && showCreateGroup && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setNewGroupName("");
                      setNewGroupDesc("");
                    }}
                    className="flex-1 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-input transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="flex-1 py-2 rounded-lg text-[13px] bg-accent text-white hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {groups.filter((g) => g.name !== "Announcements").length === 0 &&
              !showCreateGroup && (
                <div className="text-center py-8">
                  <p className="text-text-secondary text-[13px]">
                    No groups yet
                  </p>
                </div>
              )}
          </div>
        ) : (
          /* ── Members ── */
          <div className="px-4 py-4 space-y-1">
            {/* Add member button */}
            {isAdmin && !showAddMember && (
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-accent hover:bg-accent/10 transition-colors mb-2"
              >
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-accent" />
                </div>
                <span className="font-medium text-[14px]">Add Member</span>
              </button>
            )}

            {/* Add member inline form */}
            {isAdmin && showAddMember && (
              <div className="bg-card rounded-xl border border-border p-4 space-y-3 mb-2">
                <input
                  type="email"
                  placeholder="Member email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  autoFocus
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setNewMemberEmail("");
                    }}
                    className="flex-1 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-input transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={!newMemberEmail.trim()}
                    className="flex-1 py-2 rounded-lg text-[13px] bg-accent text-white hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Member count header */}
            <p className="text-[12px] text-text-secondary uppercase font-semibold tracking-wider px-3 py-2">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>

            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-input transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                  style={{
                    background:
                      m.avatar_gradient ||
                      "linear-gradient(135deg, #2563EB, #7C3AED)",
                  }}
                >
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    m.initials || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-text-main text-[14px] truncate">
                      {m.display_name || "Unknown"}
                    </p>
                    {m.role === "admin" && (
                      <span className="text-[10px] font-semibold uppercase bg-accent/15 text-accent px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary">
                    Joined{" "}
                    {new Date(m.joined_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Admin actions */}
                {isAdmin && m.user_id !== user?.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleRole(m.user_id, m.role)}
                      className="text-[11px] px-2 py-1 rounded-lg text-text-secondary hover:bg-input transition-colors"
                      title={
                        m.role === "admin"
                          ? "Demote to member"
                          : "Promote to admin"
                      }
                    >
                      {m.role === "admin" ? "Demote" : "Promote"}
                    </button>
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings panel (slide-in) */}
      {showSettings && isAdmin && (
        <CommunitySettingsPanel
          community={community}
          onClose={() => setShowSettings(false)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}

/* ── Inline Settings Panel ── */
interface CommunitySettingsPanelProps {
  community: Community;
  onClose: () => void;
  onUpdated: () => void;
}

function CommunitySettingsPanel({
  community,
  onClose,
  onUpdated,
}: CommunitySettingsPanelProps) {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await apiFetch(`/communities/${community.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to update community:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiFetch(`/communities/${community.id}`, { method: "DELETE" });
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to delete community:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-[4px] z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-card rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-input transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-text-main flex-1">
            Community Settings
          </h2>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text-main text-[14px] outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2048}
              rows={3}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text-main text-[14px] outline-none focus:border-accent transition-colors resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium text-text-secondary hover:bg-input transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium bg-accent text-white hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl text-[14px] font-medium text-red-400 hover:bg-red-400/10 transition-colors"
            >
              Delete Community
            </button>
          ) : (
            <div className="bg-red-500/10 rounded-xl p-4 space-y-3">
              <p className="text-red-400 text-[13px] text-center">
                This will permanently delete the community and all its data. Are
                you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-[13px] text-text-secondary hover:bg-input transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg text-[13px] bg-red-500 text-white hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
