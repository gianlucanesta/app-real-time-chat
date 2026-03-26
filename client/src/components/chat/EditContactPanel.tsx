import { useState } from "react";
import {
  ArrowLeft,
  User,
  Phone as PhoneIcon,
  Trash2,
  Save,
} from "lucide-react";

interface EditContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
  contactAvatarUrl?: string | null;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
}

function parseCountryCode(phone: string): { code: string; local: string } {
  const known = ["+1", "+39", "+44", "+49", "+33", "+34"];
  for (const code of known) {
    if (phone.startsWith(code)) {
      return { code, local: phone.slice(code.length).trim() };
    }
  }
  return { code: "+1", local: phone };
}

export function EditContactPanel({
  isOpen,
  onClose,
  contactName,
  contactInitials,
  contactGradient,
  contactAvatarUrl,
  contactFirstName,
  contactLastName,
  contactPhone,
}: EditContactPanelProps) {
  const parsed = parseCountryCode(contactPhone ?? "");
  const [firstName, setFirstName] = useState(
    contactFirstName ?? contactName.split(" ")[0] ?? "",
  );
  const [lastName, setLastName] = useState(
    contactLastName ?? contactName.split(" ").slice(1).join(" "),
  );
  const [phone, setPhone] = useState(parsed.local);
  const [country, setCountry] = useState(parsed.code);

  const avatarInitials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
    contactInitials;

  return (
    <div
      className={`absolute inset-0 z-[80] bg-card flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[60px] border-b border-border shrink-0">
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-bg transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="flex-1 text-[19px] font-semibold text-text-main">
          Edit contact
        </h2>
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
          aria-label="Delete contact"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-8 pb-8">
          <div className="w-[100px] h-[100px] rounded-full overflow-hidden border border-border">
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={contactName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-semibold text-white"
                style={{ background: contactGradient }}
              >
                {avatarInitials}
              </div>
            )}
          </div>
        </div>

        {/* Fields Section — constrained width, centered */}
        <div className="px-5 max-w-md md:max-w-2xl mx-auto">
          {/* Name fields */}
          <div className="flex items-start gap-5 mb-8">
            <div className="w-6 flex justify-center pt-[30px] text-text-secondary">
              <User className="w-[22px] h-[22px]" />
            </div>
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex flex-col">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ecp-first-name"
                >
                  First name
                </label>
                <input
                  type="text"
                  id="ecp-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-transparent text-text-main px-0 py-1.5 border-b border-border focus:border-accent outline-none text-[15px] transition-colors placeholder:text-text-secondary/50"
                  placeholder="First name"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-col">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ecp-last-name"
                >
                  Last name
                </label>
                <input
                  type="text"
                  id="ecp-last-name"
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
                  htmlFor="ecp-country"
                >
                  Country code
                </label>
                <select
                  id="ecp-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-transparent text-text-main px-0 py-1.5 border-b border-border focus:border-accent outline-none text-[15px] transition-colors appearance-none cursor-pointer"
                >
                  <option value="+1">US +1</option>
                  <option value="+39">IT +39</option>
                  <option value="+44">UK +44</option>
                  <option value="+49">DE +49</option>
                  <option value="+33">FR +33</option>
                  <option value="+34">ES +34</option>
                </select>
              </div>
              <div className="flex flex-col flex-1">
                <label
                  className="text-[13px] text-text-secondary mb-1"
                  htmlFor="ecp-phone"
                >
                  Phone number
                </label>
                <input
                  type="tel"
                  id="ecp-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent text-text-main px-0 py-1.5 border-b border-border focus:border-accent outline-none text-[15px] transition-colors placeholder:text-text-secondary/50"
                  placeholder="Phone number"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          {/* Phone hint */}
          <div className="ml-[44px] min-h-[20px] mb-8">
            {phone.trim().length > 0 && (
              <div className="text-success text-[13px] font-medium">
                This phone number is on Ephemeral.
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
                id="ecp-sync-toggle"
                className="sr-only peer"
                defaultChecked
              />
              <div className="w-[36px] h-[20px] bg-toggle-off peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[16px] after:w-[16px] after:transition-all peer-checked:bg-accent shadow-inner opacity-80 peer-checked:opacity-100"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save FAB */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          type="button"
          className="w-[56px] h-[56px] rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all"
          aria-label="Save contact"
          onClick={onClose}
        >
          <Save className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
