import { useState, useEffect } from "react";
import { ArrowLeft, User, Phone as PhoneIcon, Camera } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import { PhoneSelect } from "../ui/PhoneSelect";

const COUNTRY_CODES = [
  { code: "+1", label: "+1 US" },
  { code: "+44", label: "+44 UK" },
  { code: "+39", label: "+39 IT" },
  { code: "+49", label: "+49 DE" },
  { code: "+33", label: "+33 FR" },
  { code: "+34", label: "+34 ES" },
  { code: "+351", label: "+351 PT" },
  { code: "+31", label: "+31 NL" },
  { code: "+32", label: "+32 BE" },
  { code: "+41", label: "+41 CH" },
  { code: "+43", label: "+43 AT" },
  { code: "+61", label: "+61 AU" },
  { code: "+81", label: "+81 JP" },
  { code: "+86", label: "+86 CN" },
  { code: "+91", label: "+91 IN" },
  { code: "+55", label: "+55 BR" },
  { code: "+52", label: "+52 MX" },
];
import type { Conversation } from "../../contexts/ChatContext";

interface LinkedUser {
  id: string;
  display_name: string;
  initials: string;
  avatar_gradient: string;
}

interface NewContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onContactSaved?: (conv: Conversation) => void;
}

export function NewContactPanel({
  isOpen,
  onClose,
  onContactSaved,
}: NewContactPanelProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("+39");
  const [isSaving, setIsSaving] = useState(false);

  const [phoneStatus, setPhoneStatus] = useState<
    "checking" | "found" | "not-found" | null
  >(null);
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(null);

  useEffect(() => {
    const numericPhone = phone.replace(/\D/g, "");
    if (numericPhone.length < 5) {
      setPhoneStatus(null);
      setLinkedUser(null);
      return;
    }

    setPhoneStatus("checking");
    setLinkedUser(null);

    const fullPhone = `${country}${numericPhone}`;
    const handler = setTimeout(async () => {
      try {
        const result = await apiFetch<{ found: boolean; user?: LinkedUser }>(
          `/users/lookup-phone?phone=${encodeURIComponent(fullPhone)}`,
        );
        if (result.found && result.user) {
          setPhoneStatus("found");
          setLinkedUser(result.user);
        } else {
          setPhoneStatus("not-found");
        }
      } catch {
        setPhoneStatus("not-found");
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [phone, country]);

  const avatarInitials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const showInitials = avatarInitials.length > 0;

  return (
    <div
      className={`absolute inset-0 z-[21] bg-card flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-border shrink-0">
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-[19px] font-semibold text-text-main">
          New contact
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-8 pb-8">
          <div className="relative mb-3">
            <div className="w-[100px] h-[100px] rounded-full bg-input border border-border flex items-center justify-center overflow-hidden">
              {showInitials ? (
                <div className="w-full h-full text-white flex items-center justify-center text-4xl font-semibold bg-gradient-to-br from-blue-600 to-purple-600">
                  {avatarInitials}
                </div>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[48px] h-[48px] text-text-secondary/60"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            {!showInitials && (
              <button
                className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white border-2 border-bg hover:brightness-110 transition-all shadow-sm"
                aria-label="Add photo"
              >
                <Camera className="w-[14px] h-[14px]" />
              </button>
            )}
          </div>
          {!showInitials && (
            <div className="text-[13px] font-medium text-accent">Add photo</div>
          )}
        </div>

        {/* Fields Section */}
        <div className="px-5 max-w-md mx-auto">
          {/* Name fields */}
          <div className="flex items-start gap-5 mb-8">
            <div className="w-6 flex justify-center pt-[30px] text-text-secondary">
              <User className="w-[22px] h-[22px]" />
            </div>
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col relative group">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ncp-first-name"
                >
                  First name
                </label>
                <input
                  type="text"
                  id="ncp-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-transparent text-text-main px-0 py-1.5 border-b border-border focus:border-accent outline-none text-[15px] transition-colors placeholder:text-text-secondary/50"
                  placeholder="First name"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col relative group">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ncp-last-name"
                >
                  Last name (optional)
                </label>
                <input
                  type="text"
                  id="ncp-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-transparent text-text-main px-0 py-1.5 border-b border-border focus:border-accent outline-none text-[15px] transition-colors placeholder:text-text-secondary/50"
                  placeholder="Last name"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Phone row */}
          <div className="flex items-start gap-5 mb-2">
            <div className="w-6 flex justify-center pt-[30px] text-text-secondary">
              <PhoneIcon className="w-[22px] h-[22px]" />
            </div>
            <div className="flex-1 flex gap-4">
              <div className="flex flex-col w-[110px] shrink-0">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ncp-country"
                >
                  Country code
                </label>
                <PhoneSelect
                  variant="flat"
                  value={country}
                  onChange={setCountry}
                  options={COUNTRY_CODES}
                />
              </div>
              <div className="flex flex-col flex-1 relative">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ncp-phone"
                >
                  Phone number
                </label>
                <div className="relative border-b border-border focus-within:border-accent transition-colors">
                  <input
                    type="tel"
                    id="ncp-phone"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    className="w-full bg-transparent text-text-main px-0 py-1.5 outline-none text-[15px] placeholder:text-text-secondary/50 pr-8"
                    placeholder="Phone number"
                    autoComplete="off"
                  />
                  {phoneStatus === "found" && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-success">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-[18px] h-[18px]"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Phone status hint */}
          <div className="ml-[44px] min-h-[20px] mb-8">
            {phoneStatus === "checking" && (
              <div className="flex items-center gap-1.5 text-text-secondary text-[13px]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[14px] h-[14px] animate-spin"
                >
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <span>Checking...</span>
              </div>
            )}
            {phoneStatus === "found" && (
              <div className="text-success text-[13px] font-medium">
                On Ephemeral — can start chatting
              </div>
            )}
            {phoneStatus === "not-found" && (
              <div className="text-text-secondary text-[13px]">
                Not on Ephemeral — contact saved locally
              </div>
            )}
          </div>

          {/* Sync toggle */}
          <div className="flex items-center justify-between gap-4 ml-[44px]">
            <div className="flex flex-col">
              <span className="text-[15px] font-medium text-text-main mb-0.5">
                Sync contact with phone
              </span>
              <span className="text-[13px] text-text-secondary mt-1">
                This contact will be added to your phone contacts
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                id="ncp-sync"
                className="sr-only peer"
                defaultChecked
              />
              <div className="w-[36px] h-[20px] bg-toggle-off peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-accent shadow-inner opacity-80 peer-checked:opacity-100"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) matching screenshot 3 bottom right */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          type="button"
          disabled={isSaving || !firstName.trim()}
          className="w-[56px] h-[56px] rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          id="new-contact-save-btn"
          onClick={async () => {
            if (isSaving || !firstName.trim()) return;
            setIsSaving(true);
            try {
              const numericPhone = phone.replace(/\D/g, "");
              const fullPhone =
                numericPhone.length > 0 ? `${country}${numericPhone}` : "";
              const displayName =
                `${firstName.trim()} ${lastName.trim()}`.trim();
              const resp = await apiFetch<{
                contact: {
                  id: string;
                  linked_user_id: string | null;
                  linked_display_name?: string;
                  linked_initials?: string;
                };
              }>("/contacts", {
                method: "POST",
                body: JSON.stringify({
                  displayName,
                  phone: fullPhone,
                  initials:
                    avatarInitials || displayName.substring(0, 2).toUpperCase(),
                  gradient:
                    linkedUser?.avatar_gradient ??
                    "linear-gradient(135deg,#2563EB,#7C3AED)",
                }),
              });
              const { contact } = resp;
              if (contact.linked_user_id && user && onContactSaved) {
                const convId = [user.id, contact.linked_user_id]
                  .sort()
                  .join("___");
                onContactSaved({
                  id: convId,
                  type: "direct",
                  name:
                    linkedUser?.display_name ??
                    contact.linked_display_name ??
                    displayName,
                  gradient:
                    linkedUser?.avatar_gradient ??
                    "linear-gradient(135deg,#2563EB,#7C3AED)",
                  initials:
                    linkedUser?.initials ??
                    contact.linked_initials ??
                    (avatarInitials ||
                      displayName.substring(0, 2).toUpperCase()),
                  lastMessage: "",
                  lastMessageTime: undefined,
                  unreadCount: 0,
                  isOnline: false,
                  participants: [user.id, contact.linked_user_id],
                });
              }
              onClose();
            } catch (err) {
              console.error("[NewContactPanel] save failed:", err);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {isSaving ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 animate-spin"
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
