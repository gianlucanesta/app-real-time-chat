import {
  ArrowLeft,
  Search,
  Check,
  ArrowRight,
  Camera,
  Users,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { apiFetch } from "../../lib/api";

interface Contact {
  id: string;
  display_name: string;
  linked_display_name?: string;
  initials: string;
  linked_initials?: string;
  gradient: string;
  linked_user_id: string | null;
}

interface NewGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewGroupPanel({ isOpen, onClose }: NewGroupPanelProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const groupNameRef = useRef<HTMLInputElement>(null);

  // Fetch contacts when panel opens
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    apiFetch<{ contacts: Contact[] }>("/contacts")
      .then(({ contacts: list }) => setContacts(list))
      .catch(() => setContacts([]))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  // Focus group name input on step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => groupNameRef.current?.focus(), 120);
    }
  }, [step]);

  // Reset everything when closed
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setQuery("");
      setSelected([]);
      setGroupName("");
    }
  }, [isOpen]);

  const displayName = (c: Contact) => c.linked_display_name || c.display_name;
  const displayInitials = (c: Contact) =>
    c.linked_initials || c.initials || "?";

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? contacts.filter((c) => displayName(c).toLowerCase().includes(q))
      : contacts;
    return [...list].sort((a, b) =>
      displayName(a).localeCompare(displayName(b)),
    );
  }, [contacts, query]);

  // Group by first letter for alphabetical sections
  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>();
    for (const c of filtered) {
      const letter = displayName(c).charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(c);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const isSelected = (c: Contact) => selected.some((s) => s.id === c.id);

  const toggle = (c: Contact) => {
    setSelected((prev) =>
      isSelected(c) ? prev.filter((s) => s.id !== c.id) : [...prev, c],
    );
  };

  const handleCreate = () => {
    // Group creation is not yet fully implemented on the server — close panel
    onClose();
  };

  return (
    <div
      className={`absolute inset-0 z-[21] bg-card flex flex-col transition-transform duration-300 ease-in-out border-l border-r border-border ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      {/* ── STEP 1: Select participants ── */}
      {step === 1 && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-[64px] border-b border-border shrink-0 bg-card">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg transition-colors"
              onClick={onClose}
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-text-main leading-tight">
                Add group members
              </h2>
              {selected.length > 0 && (
                <p className="text-[12px] text-text-secondary leading-tight">
                  {selected.length} of {contacts.length} selected
                </p>
              )}
            </div>
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-none border-b border-border/50 shrink-0">
              {selected.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c)}
                  className="flex flex-col items-center gap-1 shrink-0 group"
                  aria-label={`Remove ${displayName(c)}`}
                >
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-semibold"
                      style={{ background: c.gradient }}
                    >
                      {displayInitials(c)}
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center border-2 border-card">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-2.5 h-2.5 text-white fill-none stroke-white stroke-[3]"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-[11px] text-text-secondary max-w-[52px] truncate">
                    {displayName(c).split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-2.5 bg-bg shrink-0">
            <div className="flex items-center gap-2 bg-input rounded-full px-3 h-9 border border-transparent focus-within:border-accent transition-colors">
              <Search className="w-[15px] h-[15px] text-text-secondary shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a name or number"
                className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
              />
            </div>
          </div>

          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-text-secondary text-[13px]">
                Loading contacts…
              </div>
            )}
            {!isLoading && contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-secondary">
                <Users className="w-10 h-10 opacity-40" />
                <p className="text-[13px]">No contacts yet</p>
              </div>
            )}
            {!isLoading &&
              grouped.map(([letter, list]) => (
                <div key={letter}>
                  <div className="px-4 py-1.5 text-[12px] font-semibold text-text-secondary uppercase tracking-wider sticky top-0 bg-bg/80 backdrop-blur-sm">
                    {letter}
                  </div>
                  {list.map((contact) => {
                    const sel = isSelected(contact);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => toggle(contact)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-input/60 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[14px] font-semibold"
                            style={{ background: contact.gradient }}
                          >
                            {displayInitials(contact)}
                          </div>
                          {sel && (
                            <div className="absolute inset-0 rounded-full bg-accent flex items-center justify-center">
                              <Check className="w-5 h-5 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-text-main truncate">
                            {displayName(contact)}
                          </p>
                        </div>
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${sel ? "bg-accent border-accent" : "border-border"}`}
                        >
                          {sel && (
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* Next FAB */}
          {selected.length > 0 && (
            <div className="absolute bottom-6 right-6">
              <button
                onClick={() => setStep(2)}
                className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all active:scale-95"
                aria-label="Next step"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: Name the group ── */}
      {step === 2 && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 h-[64px] border-b border-border shrink-0 bg-card">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg transition-colors"
              onClick={() => setStep(1)}
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-[17px] font-semibold text-text-main">
              New group
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg">
            {/* Group icon + name */}
            <div className="flex items-center gap-4 px-5 py-6 border-b border-border/50">
              <button
                className="w-16 h-16 rounded-full bg-input border border-border flex items-center justify-center shrink-0 hover:bg-input/80 transition-colors relative"
                aria-label="Set group photo"
              >
                <Camera className="w-7 h-7 text-text-secondary" />
              </button>
              <div className="flex-1 flex flex-col border-b border-border pb-1">
                <input
                  ref={groupNameRef}
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  maxLength={100}
                  className="flex-1 bg-transparent border-none outline-none text-[16px] text-text-main placeholder:text-text-secondary/60 focus:border-accent"
                />
              </div>
            </div>

            {/* Participants */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-text-secondary mb-3">
                Members · {selected.length}
              </p>
              <div className="flex flex-col gap-1">
                {selected.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
                      style={{ background: c.gradient }}
                    >
                      {displayInitials(c)}
                    </div>
                    <span className="text-[14px] text-text-main font-medium">
                      {displayName(c)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Create FAB */}
          <div className="absolute bottom-6 right-6">
            <button
              disabled={!groupName.trim()}
              onClick={handleCreate}
              className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Create group"
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
