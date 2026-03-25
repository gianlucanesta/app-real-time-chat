import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  Camera,
  Info,
  Activity,
  CheckCheck,
  Timer,
  Users,
  Ban,
  ShieldAlert,
  Globe,
  Link2Off,
  Search,
  Check,
  X,
  UserPlus,
  Loader2,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { apiFetch, normalizeUser } from "../../lib/api";

// ── Toggle (matching existing style from NotificationSettings) ──────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-[#2563eb]" : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Radio option component ──────────────────────────────────────────────
function RadioOption({
  value,
  label,
  description,
  selected,
  onChange,
}: {
  value: string;
  label: string;
  description?: string;
  selected: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className="flex items-start gap-3 px-2 py-3.5 rounded-lg cursor-pointer hover:bg-input/50 transition-colors"
      onClick={() => onChange(value)}
    >
      <div className="mt-0.5 shrink-0">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? "border-accent" : "border-text-secondary/50"
          }`}
        >
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-text-main">{label}</p>
        {description && (
          <p className="text-[12.5px] text-text-secondary mt-0.5 leading-snug">
            {description}
          </p>
        )}
      </div>
      <input
        type="radio"
        checked={selected}
        onChange={() => onChange(value)}
        className="sr-only"
      />
    </label>
  );
}

// ── Contact for picker ──────────────────────────────────────────────────
interface PickerContact {
  id: string;
  name: string;
  avatar?: string | null;
  gradient: string;
  initials: string;
}

// ── Contact picker sub-view ─────────────────────────────────────────────
function ContactPicker({
  title,
  contacts,
  selectedIds,
  onToggle,
  onBack,
  onConfirm,
}: {
  title: string;
  contacts: PickerContact[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
        {title}
      </button>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2.5 bg-input rounded-lg text-[14px] text-text-main placeholder:text-text-secondary outline-none border border-border focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Selected count */}
      <div className="px-4 pb-2">
        <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
          {selectedIds.length} contact{selectedIds.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-text-secondary">
            No contacts found
          </p>
        )}
        {filtered.map((c) => {
          const isSelected = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-input/50 transition-colors text-left"
              onClick={() => onToggle(c.id)}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-accent border-accent"
                    : "border-text-secondary/50"
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
              {c.avatar ? (
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: c.gradient }}
                >
                  {c.initials}
                </div>
              )}
              <p className="text-[14px] font-medium text-text-main truncate">
                {c.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="flex items-center justify-end px-4 py-3 border-t border-border shrink-0">
        <button
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors"
          onClick={onConfirm}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ── Blocked contact row ─────────────────────────────────────────────────
interface BlockedUser {
  id: string;
  blocked_id: string;
  display_name: string;
  initials: string;
  avatar_url: string | null;
  avatar_gradient: string;
}

// ── Label helpers ───────────────────────────────────────────────────────
const VISIBILITY_LABELS: Record<string, string> = {
  everyone: "Everyone",
  contacts: "My contacts",
  contacts_except: "My contacts except...",
  nobody: "Nobody",
  same_as_last_seen: "Same as last seen",
  only_share_with: "Share only with...",
};

function visibilityLabel(value: string): string {
  return VISIBILITY_LABELS[value] || value;
}

const DISAPPEARING_LABELS: Record<string, string> = {
  "24h": "24 hours",
  "12h": "12 hours",
  "1h": "1 hour",
  after_read: "After message was read",
  off: "Off",
};

function disappearingLabel(value: string): string {
  return DISAPPEARING_LABELS[value] || value;
}

// ── Sub-views type ──────────────────────────────────────────────────────
type SubView =
  | null
  | "last-seen"
  | "profile-photo"
  | "info"
  | "status"
  | "disappearing"
  | "groups"
  | "blocked";

// ── Main component ──────────────────────────────────────────────────────
export function PrivacySettings() {
  const { settings, updateSetting } = useSettings();
  const [subView, setSubView] = useState<SubView>(null);

  // ── Contact list for pickers ──────────────────────────────────────────
  const [contacts, setContacts] = useState<PickerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // ── Except / only-share IDs (loaded from API settings) ────────────────
  const [lastSeenExceptIds, setLastSeenExceptIds] = useState<string[]>([]);
  const [profilePhotoExceptIds, setProfilePhotoExceptIds] = useState<string[]>(
    [],
  );
  const [infoExceptIds, setInfoExceptIds] = useState<string[]>([]);
  const [statusExceptIds, setStatusExceptIds] = useState<string[]>([]);
  const [statusOnlyShareIds, setStatusOnlyShareIds] = useState<string[]>([]);
  const [groupsExceptIds, setGroupsExceptIds] = useState<string[]>([]);

  // ── Contact picker state ──────────────────────────────────────────────
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerIds, setPickerIds] = useState<string[]>([]);

  // ── Blocked contacts ──────────────────────────────────────────────────
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockSearchQuery, setBlockSearchQuery] = useState("");
  const [blockSearchResults, setBlockSearchResults] = useState<PickerContact[]>(
    [],
  );
  const [blockSearching, setBlockSearching] = useState(false);

  // ── Load contacts ─────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    if (contacts.length > 0) return;
    setContactsLoading(true);
    try {
      const data = await apiFetch<{ contacts: any[] }>("/contacts");
      setContacts(
        data.contacts.map((c: any) => ({
          id: c.linked_user_id || c.id,
          name: c.linked_display_name || c.display_name,
          avatar: c.avatar_url || null,
          gradient: c.gradient || "linear-gradient(135deg,#2563EB,#7C3AED)",
          initials:
            c.linked_initials || c.initials || c.display_name?.charAt(0) || "?",
        })),
      );
    } catch {
      /* silent */
    } finally {
      setContactsLoading(false);
    }
  }, [contacts.length]);

  // ── Load except IDs from API settings ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ settings: Record<string, any> }>(
          "/users/me/settings",
        );
        const s = data.settings || {};
        if (Array.isArray(s.privacyLastSeenExceptIds))
          setLastSeenExceptIds(s.privacyLastSeenExceptIds);
        if (Array.isArray(s.privacyProfilePhotoExceptIds))
          setProfilePhotoExceptIds(s.privacyProfilePhotoExceptIds);
        if (Array.isArray(s.privacyInfoExceptIds))
          setInfoExceptIds(s.privacyInfoExceptIds);
        if (Array.isArray(s.privacyStatusExceptIds))
          setStatusExceptIds(s.privacyStatusExceptIds);
        if (Array.isArray(s.privacyStatusOnlyShareIds))
          setStatusOnlyShareIds(s.privacyStatusOnlyShareIds);
        if (Array.isArray(s.privacyGroupsExceptIds))
          setGroupsExceptIds(s.privacyGroupsExceptIds);
      } catch {
        /* silent */
      }
    })();
  }, []);

  // ── Save except IDs to API ────────────────────────────────────────────
  const saveExceptIds = useCallback(async (key: string, ids: string[]) => {
    try {
      await apiFetch("/users/me/settings", {
        method: "PATCH",
        body: JSON.stringify({ [key]: ids }),
      });
    } catch {
      /* silent */
    }
  }, []);

  // ── Load blocked users ────────────────────────────────────────────────
  const loadBlocked = useCallback(async () => {
    setBlockedLoading(true);
    try {
      const data = await apiFetch<{ blocked: BlockedUser[] }>("/users/blocked");
      setBlockedUsers(data.blocked);
    } catch {
      /* silent */
    } finally {
      setBlockedLoading(false);
    }
  }, []);

  // ── Block a user ──────────────────────────────────────────────────────
  const handleBlock = useCallback(
    async (userId: string) => {
      try {
        await apiFetch("/users/block", {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
        await loadBlocked();
        setBlockSearchQuery("");
        setBlockSearchResults([]);
      } catch {
        /* silent */
      }
    },
    [loadBlocked],
  );

  // ── Unblock a user ────────────────────────────────────────────────────
  const handleUnblock = useCallback(async (userId: string) => {
    try {
      await apiFetch(`/users/block/${userId}`, { method: "DELETE" });
      setBlockedUsers((prev) => prev.filter((u) => u.blocked_id !== userId));
    } catch {
      /* silent */
    }
  }, []);

  // ── Search users for blocking ─────────────────────────────────────────
  const handleBlockSearch = useCallback(async (q: string) => {
    setBlockSearchQuery(q);
    if (q.trim().length < 2) {
      setBlockSearchResults([]);
      return;
    }
    setBlockSearching(true);
    try {
      const data = await apiFetch<{ users: any[] }>(
        `/users/search?q=${encodeURIComponent(q.trim())}`,
      );
      setBlockSearchResults(
        data.users.map((u: any) => ({
          id: u.id,
          name: u.display_name || u.displayName,
          avatar: u.avatar_url || u.avatarUrl || null,
          gradient:
            u.avatar_gradient ||
            u.avatarGradient ||
            "linear-gradient(135deg,#2563EB,#7C3AED)",
          initials: u.initials || u.display_name?.charAt(0) || "?",
        })),
      );
    } catch {
      setBlockSearchResults([]);
    } finally {
      setBlockSearching(false);
    }
  }, []);

  // ── Picker helpers ────────────────────────────────────────────────────
  const openPicker = useCallback(
    (forKey: string, currentIds: string[]) => {
      loadContacts();
      setPickerFor(forKey);
      setPickerIds([...currentIds]);
    },
    [loadContacts],
  );

  const togglePickerId = useCallback((id: string) => {
    setPickerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const confirmPicker = useCallback(() => {
    if (!pickerFor) return;
    const ids = [...pickerIds];

    switch (pickerFor) {
      case "lastSeenExcept":
        setLastSeenExceptIds(ids);
        saveExceptIds("privacyLastSeenExceptIds", ids);
        break;
      case "profilePhotoExcept":
        setProfilePhotoExceptIds(ids);
        saveExceptIds("privacyProfilePhotoExceptIds", ids);
        break;
      case "infoExcept":
        setInfoExceptIds(ids);
        saveExceptIds("privacyInfoExceptIds", ids);
        break;
      case "statusExcept":
        setStatusExceptIds(ids);
        saveExceptIds("privacyStatusExceptIds", ids);
        break;
      case "statusOnlyShare":
        setStatusOnlyShareIds(ids);
        saveExceptIds("privacyStatusOnlyShareIds", ids);
        break;
      case "groupsExcept":
        setGroupsExceptIds(ids);
        saveExceptIds("privacyGroupsExceptIds", ids);
        break;
    }
    setPickerFor(null);
  }, [pickerFor, pickerIds, saveExceptIds]);

  // ── Derive subtitle for except options ────────────────────────────────
  const exceptCount = (ids: string[]) =>
    ids.length > 0 ? `${ids.length} excluded` : "";

  // ── Contact picker overlay ────────────────────────────────────────────
  if (pickerFor) {
    const PICKER_TITLES: Record<string, string> = {
      lastSeenExcept: "My contacts except...",
      profilePhotoExcept: "My contacts except...",
      infoExcept: "My contacts except...",
      statusExcept: "My contacts except...",
      statusOnlyShare: "Share only with...",
      groupsExcept: "My contacts except...",
    };

    if (contactsLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3">
          <Loader2 className="w-8 h-8 animate-spin opacity-40" />
          <p className="text-[13px]">Loading contacts...</p>
        </div>
      );
    }

    return (
      <ContactPicker
        title={PICKER_TITLES[pickerFor] || "Select contacts"}
        contacts={contacts}
        selectedIds={pickerIds}
        onToggle={togglePickerId}
        onBack={() => setPickerFor(null)}
        onConfirm={confirmPicker}
      />
    );
  }

  // ── Sub-view: Last Seen & Online ──────────────────────────────────────
  if (subView === "last-seen") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Last Seen &amp; Online
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can see my last seen
          </p>
          <RadioOption
            value="everyone"
            label="Everyone"
            selected={settings.privacyLastSeen === "everyone"}
            onChange={(v) => updateSetting("privacyLastSeen", v)}
          />
          <RadioOption
            value="contacts"
            label="My contacts"
            selected={settings.privacyLastSeen === "contacts"}
            onChange={(v) => updateSetting("privacyLastSeen", v)}
          />
          <RadioOption
            value="contacts_except"
            label={`My contacts except...${lastSeenExceptIds.length > 0 ? ` (${lastSeenExceptIds.length})` : ""}`}
            selected={settings.privacyLastSeen === "contacts_except"}
            onChange={(v) => {
              updateSetting("privacyLastSeen", v);
              openPicker("lastSeenExcept", lastSeenExceptIds);
            }}
          />
          <RadioOption
            value="nobody"
            label="Nobody"
            selected={settings.privacyLastSeen === "nobody"}
            onChange={(v) => updateSetting("privacyLastSeen", v)}
          />

          {settings.privacyLastSeen === "contacts_except" &&
            lastSeenExceptIds.length > 0 && (
              <button
                type="button"
                onClick={() => openPicker("lastSeenExcept", lastSeenExceptIds)}
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit excluded contacts ({lastSeenExceptIds.length})
              </button>
            )}
        </div>

        <div className="border-t border-border" />

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can see when I'm online
          </p>
          <RadioOption
            value="everyone"
            label="Everyone"
            selected={settings.privacyOnline === "everyone"}
            onChange={(v) => updateSetting("privacyOnline", v)}
          />
          <RadioOption
            value="same_as_last_seen"
            label="Same as last seen"
            selected={settings.privacyOnline === "same_as_last_seen"}
            onChange={(v) => updateSetting("privacyOnline", v)}
          />
        </div>

        <div className="px-4 pb-4">
          <p className="text-[12px] text-text-secondary leading-relaxed">
            If you don't share your <strong>last seen</strong> and your{" "}
            <strong>online status</strong>, you won't be able to see the last
            seen and online status of others.
          </p>
        </div>
      </div>
    );
  }

  // ── Sub-view: Profile Photo ───────────────────────────────────────────
  if (subView === "profile-photo") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Profile Photo
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can see my profile photo
          </p>
          <RadioOption
            value="everyone"
            label="Everyone"
            selected={settings.privacyProfilePhoto === "everyone"}
            onChange={(v) => updateSetting("privacyProfilePhoto", v)}
          />
          <RadioOption
            value="contacts"
            label="My contacts"
            selected={settings.privacyProfilePhoto === "contacts"}
            onChange={(v) => updateSetting("privacyProfilePhoto", v)}
          />
          <RadioOption
            value="contacts_except"
            label={`My contacts except...${profilePhotoExceptIds.length > 0 ? ` (${profilePhotoExceptIds.length})` : ""}`}
            selected={settings.privacyProfilePhoto === "contacts_except"}
            onChange={(v) => {
              updateSetting("privacyProfilePhoto", v);
              openPicker("profilePhotoExcept", profilePhotoExceptIds);
            }}
          />
          <RadioOption
            value="nobody"
            label="Nobody"
            selected={settings.privacyProfilePhoto === "nobody"}
            onChange={(v) => updateSetting("privacyProfilePhoto", v)}
          />

          {settings.privacyProfilePhoto === "contacts_except" &&
            profilePhotoExceptIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPicker("profilePhotoExcept", profilePhotoExceptIds)
                }
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit excluded contacts ({profilePhotoExceptIds.length})
              </button>
            )}
        </div>
      </div>
    );
  }

  // ── Sub-view: Info ────────────────────────────────────────────────────
  if (subView === "info") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Info
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can see my Info section
          </p>
          <RadioOption
            value="everyone"
            label="Everyone"
            selected={settings.privacyInfo === "everyone"}
            onChange={(v) => updateSetting("privacyInfo", v)}
          />
          <RadioOption
            value="contacts"
            label="My contacts"
            selected={settings.privacyInfo === "contacts"}
            onChange={(v) => updateSetting("privacyInfo", v)}
          />
          <RadioOption
            value="contacts_except"
            label={`My contacts except...${infoExceptIds.length > 0 ? ` (${infoExceptIds.length})` : ""}`}
            selected={settings.privacyInfo === "contacts_except"}
            onChange={(v) => {
              updateSetting("privacyInfo", v);
              openPicker("infoExcept", infoExceptIds);
            }}
          />
          <RadioOption
            value="nobody"
            label="Nobody"
            selected={settings.privacyInfo === "nobody"}
            onChange={(v) => updateSetting("privacyInfo", v)}
          />

          {settings.privacyInfo === "contacts_except" &&
            infoExceptIds.length > 0 && (
              <button
                type="button"
                onClick={() => openPicker("infoExcept", infoExceptIds)}
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit excluded contacts ({infoExceptIds.length})
              </button>
            )}
        </div>
      </div>
    );
  }

  // ── Sub-view: Status ──────────────────────────────────────────────────
  if (subView === "status") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Status Privacy
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can see my status updates
          </p>
          <RadioOption
            value="contacts"
            label="My contacts"
            description="Share with all your contacts"
            selected={settings.privacyStatus === "contacts"}
            onChange={(v) => updateSetting("privacyStatus", v)}
          />
          <RadioOption
            value="contacts_except"
            label={`My contacts except...${statusExceptIds.length > 0 ? ` (${statusExceptIds.length})` : ""}`}
            description="Share with your contacts except selected ones"
            selected={settings.privacyStatus === "contacts_except"}
            onChange={(v) => {
              updateSetting("privacyStatus", v);
              openPicker("statusExcept", statusExceptIds);
            }}
          />
          <RadioOption
            value="only_share_with"
            label={`Share only with...${statusOnlyShareIds.length > 0 ? ` (${statusOnlyShareIds.length})` : ""}`}
            description="Share only with selected contacts"
            selected={settings.privacyStatus === "only_share_with"}
            onChange={(v) => {
              updateSetting("privacyStatus", v);
              openPicker("statusOnlyShare", statusOnlyShareIds);
            }}
          />

          {settings.privacyStatus === "contacts_except" &&
            statusExceptIds.length > 0 && (
              <button
                type="button"
                onClick={() => openPicker("statusExcept", statusExceptIds)}
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit excluded contacts ({statusExceptIds.length})
              </button>
            )}
          {settings.privacyStatus === "only_share_with" &&
            statusOnlyShareIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  openPicker("statusOnlyShare", statusOnlyShareIds)
                }
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit selected contacts ({statusOnlyShareIds.length})
              </button>
            )}
        </div>
      </div>
    );
  }

  // ── Sub-view: Disappearing Messages ───────────────────────────────────
  if (subView === "disappearing") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Default Message Timer
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Enable disappearing messages in all new chats
          </p>
          <RadioOption
            value="24h"
            label="24 hours"
            selected={settings.privacyDisappearing === "24h"}
            onChange={(v) => updateSetting("privacyDisappearing", v)}
          />
          <RadioOption
            value="12h"
            label="12 hours"
            selected={settings.privacyDisappearing === "12h"}
            onChange={(v) => updateSetting("privacyDisappearing", v)}
          />
          <RadioOption
            value="1h"
            label="1 hour"
            selected={settings.privacyDisappearing === "1h"}
            onChange={(v) => updateSetting("privacyDisappearing", v)}
          />
          <RadioOption
            value="after_read"
            label="After message was read"
            selected={settings.privacyDisappearing === "after_read"}
            onChange={(v) => updateSetting("privacyDisappearing", v)}
          />
          <RadioOption
            value="off"
            label="Off"
            selected={settings.privacyDisappearing === "off"}
            onChange={(v) => updateSetting("privacyDisappearing", v)}
          />
        </div>

        <div className="px-4 pb-4">
          <p className="text-[12px] text-text-secondary leading-relaxed">
            When this setting is active, all new individual chats will start
            with disappearing messages that are visible for the selected time
            period. This setting does not affect existing chats.
          </p>
        </div>
      </div>
    );
  }

  // ── Sub-view: Groups ──────────────────────────────────────────────────
  if (subView === "groups") {
    return (
      <div className="flex flex-col gap-0">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Groups
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          <p className="text-[13.5px] text-accent font-medium mb-3 leading-snug">
            Who can add me to groups
          </p>
          <RadioOption
            value="everyone"
            label="Everyone"
            selected={settings.privacyGroups === "everyone"}
            onChange={(v) => updateSetting("privacyGroups", v)}
          />
          <RadioOption
            value="contacts"
            label="My contacts"
            selected={settings.privacyGroups === "contacts"}
            onChange={(v) => updateSetting("privacyGroups", v)}
          />
          <RadioOption
            value="contacts_except"
            label={`My contacts except...${groupsExceptIds.length > 0 ? ` (${groupsExceptIds.length})` : ""}`}
            selected={settings.privacyGroups === "contacts_except"}
            onChange={(v) => {
              updateSetting("privacyGroups", v);
              openPicker("groupsExcept", groupsExceptIds);
            }}
          />

          {settings.privacyGroups === "contacts_except" &&
            groupsExceptIds.length > 0 && (
              <button
                type="button"
                onClick={() => openPicker("groupsExcept", groupsExceptIds)}
                className="ml-8 mt-1 text-[12.5px] text-accent hover:underline text-left"
              >
                Edit excluded contacts ({groupsExceptIds.length})
              </button>
            )}
        </div>

        <div className="px-4 pb-4">
          <p className="text-[12px] text-text-secondary leading-relaxed">
            Admins who can't add you to a group will have the option to invite
            you privately instead.
          </p>
        </div>
      </div>
    );
  }

  // ── Sub-view: Blocked Contacts ────────────────────────────────────────
  if (subView === "blocked") {
    // Load blocked users on first visit
    if (!blockedLoading && blockedUsers.length === 0) {
      loadBlocked();
    }

    return (
      <div className="flex flex-col gap-0 h-full">
        <button
          type="button"
          onClick={() => {
            setSubView(null);
            setBlockSearchQuery("");
            setBlockSearchResults([]);
          }}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          Blocked Contacts
        </button>

        {/* Add contact to block */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={blockSearchQuery}
              onChange={(e) => handleBlockSearch(e.target.value)}
              placeholder="Search user to block..."
              className="w-full pl-10 pr-4 py-2.5 bg-input rounded-lg text-[14px] text-text-main placeholder:text-text-secondary outline-none border border-border focus:border-accent transition-colors"
            />
          </div>

          {/* Search results */}
          {blockSearchQuery.trim().length >= 2 && (
            <div className="mt-2 max-h-[200px] overflow-y-auto">
              {blockSearching ? (
                <div className="flex items-center gap-2 py-3 px-2 text-text-secondary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[13px]">Searching...</span>
                </div>
              ) : blockSearchResults.length === 0 ? (
                <p className="py-3 px-2 text-[13px] text-text-secondary">
                  No users found
                </p>
              ) : (
                blockSearchResults.map((u) => {
                  const alreadyBlocked = blockedUsers.some(
                    (b) => b.blocked_id === u.id,
                  );
                  return (
                    <button
                      key={u.id}
                      disabled={alreadyBlocked}
                      onClick={() => handleBlock(u.id)}
                      className={`flex items-center gap-3 px-2 py-2.5 w-full rounded-lg transition-colors text-left ${
                        alreadyBlocked
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-input/50"
                      }`}
                    >
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                          style={{ background: u.gradient }}
                        >
                          {u.initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-text-main truncate">
                          {u.name}
                        </p>
                        {alreadyBlocked && (
                          <p className="text-[11px] text-text-secondary">
                            Already blocked
                          </p>
                        )}
                      </div>
                      {!alreadyBlocked && (
                        <Ban className="w-4 h-4 text-danger shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Blocked users list */}
        <div className="flex-1 overflow-y-auto">
          {blockedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary gap-2 px-8 text-center">
              <Ban className="w-8 h-8 opacity-30" />
              <p className="text-[13px]">No blocked contacts</p>
            </div>
          ) : (
            <>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                  Blocked ({blockedUsers.length})
                </p>
              </div>
              {blockedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border"
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.display_name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                      style={{
                        background:
                          u.avatar_gradient ||
                          "linear-gradient(135deg,#2563EB,#7C3AED)",
                      }}
                    >
                      {u.initials || u.display_name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-main truncate">
                      {u.display_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblock(u.blocked_id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
                    aria-label={`Unblock ${u.display_name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      {/* ─── Who can see my personal info ──────────────── */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Who Can See My Personal Info
        </span>
      </div>

      {/* Last Seen & Online */}
      <button
        type="button"
        onClick={() => setSubView("last-seen")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Eye className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Last Seen &amp; Online
            </span>
            <span className="text-[12px] text-text-secondary">
              {visibilityLabel(settings.privacyLastSeen)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Profile Photo */}
      <button
        type="button"
        onClick={() => setSubView("profile-photo")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Camera className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Profile Photo
            </span>
            <span className="text-[12px] text-text-secondary">
              {visibilityLabel(settings.privacyProfilePhoto)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Info */}
      <button
        type="button"
        onClick={() => setSubView("info")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Info className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">Info</span>
            <span className="text-[12px] text-text-secondary">
              {visibilityLabel(settings.privacyInfo)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Status */}
      <button
        type="button"
        onClick={() => setSubView("status")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Activity className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Status
            </span>
            <span className="text-[12px] text-text-secondary">
              {visibilityLabel(settings.privacyStatus)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* ─── Read Receipts ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <CheckCheck className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Read Receipts
            </span>
            <span className="text-[12px] text-text-secondary leading-snug">
              If turned off, you won't send or receive read receipts. Read
              receipts are always sent for group chats.
            </span>
          </div>
        </div>
        <Toggle
          checked={settings.privacyReadReceipts}
          onChange={(v) => updateSetting("privacyReadReceipts", v)}
          label="Read receipts"
        />
      </div>

      {/* ─── Disappearing Messages ─────────────────────── */}
      <div className="px-4 pt-5 pb-1">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Disappearing Messages
        </span>
      </div>

      <button
        type="button"
        onClick={() => setSubView("disappearing")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Timer className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Default Message Timer
            </span>
            <span className="text-[12px] text-text-secondary">
              {disappearingLabel(settings.privacyDisappearing)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* ─── Groups ────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setSubView("groups")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Users className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Groups
            </span>
            <span className="text-[12px] text-text-secondary">
              {visibilityLabel(settings.privacyGroups)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* ─── Blocked Contacts ──────────────────────────── */}
      <button
        type="button"
        onClick={() => {
          setSubView("blocked");
          loadBlocked();
        }}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Ban className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Blocked Contacts
            </span>
            <span className="text-[12px] text-text-secondary">
              {blockedUsers.length > 0 ? `${blockedUsers.length}` : "None"}
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* ─── Advanced ──────────────────────────────────── */}
      <div className="px-4 pt-5 pb-1">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Advanced
        </span>
      </div>

      {/* Block messages from unknown accounts */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <ShieldAlert className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Block Messages from Unknown Accounts
            </span>
            <span className="text-[12px] text-text-secondary leading-snug">
              To protect your account and improve device performance, messages
              from unknown accounts will be blocked if they exceed a certain
              volume.
            </span>
          </div>
        </div>
        <Toggle
          checked={settings.privacyBlockUnknown}
          onChange={(v) => updateSetting("privacyBlockUnknown", v)}
          label="Block messages from unknown accounts"
        />
      </div>

      {/* Protect IP address in calls */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Globe className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Protect IP Address in Calls
            </span>
            <span className="text-[12px] text-text-secondary leading-snug">
              To make it harder to determine your location, calls on this device
              will be securely relayed through the server. This will reduce call
              quality.
            </span>
          </div>
        </div>
        <Toggle
          checked={settings.privacyProtectIp}
          onChange={(v) => updateSetting("privacyProtectIp", v)}
          label="Protect IP address in calls"
        />
      </div>

      {/* Disable link previews */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Link2Off className="w-[18px] h-[18px] text-text-secondary shrink-0" />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[14px] font-medium text-text-main">
              Disable Link Previews
            </span>
            <span className="text-[12px] text-text-secondary leading-snug">
              To help protect your IP address and prevent detection by
              third-party websites, link previews in shared chats will no longer
              be generated.
            </span>
          </div>
        </div>
        <Toggle
          checked={settings.privacyDisableLinkPreviews}
          onChange={(v) => updateSetting("privacyDisableLinkPreviews", v)}
          label="Disable link previews"
        />
      </div>
    </div>
  );
}
