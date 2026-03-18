import { ChevronLeft, Trash2, Phone, Save } from "lucide-react";

interface EditContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
}

export function EditContactPanel({
  isOpen,
  onClose,
  contactName,
  contactInitials,
  contactGradient
}: EditContactPanelProps) {
  return (
    <div 
      className={`edit-contact-panel ${isOpen ? 'open' : ''}`}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="edit-contact-header">
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2>Edit contact</h2>
        <button
          type="button"
          className="icon-btn ecp-delete-btn-icon"
          aria-label="Delete contact"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="edit-contact-body">
        {/* Avatar */}
        <div className="ecp-avatar-section">
          <div 
            className="ecp-avatar"
            style={{ background: contactGradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {contactInitials}
          </div>
        </div>

        {/* Fields */}
        <div className="ecp-fields-section">
          {/* Name fields */}
          <div className="ecp-field-row">
            <div className="ecp-field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="ecp-field-inputs">
              <div className="ecp-field">
                <label className="ecp-field-label" htmlFor="ecp-first-name">Name</label>
                <input
                  type="text"
                  id="ecp-first-name"
                  className="ecp-input"
                  placeholder="First name"
                  defaultValue={contactName.split(" ")[0]}
                />
              </div>
              <div className="ecp-field">
                <label className="ecp-field-label" htmlFor="ecp-last-name">Last name</label>
                <input
                  type="text"
                  id="ecp-last-name"
                  className="ecp-input"
                  placeholder="Last name"
                  defaultValue={contactName.split(" ").slice(1).join(" ")}
                />
              </div>
            </div>
          </div>

          {/* Phone row */}
          <div className="ecp-field-row">
            <div className="ecp-field-icon ecp-phone-icon">
              <Phone className="w-[18px] h-[18px]" />
            </div>
            <div className="ecp-phone-fields">
              <div className="ecp-field">
                <label className="ecp-field-label" htmlFor="ecp-country">Country code</label>
                <select id="ecp-country" className="ecp-select" defaultValue="+39">
                  <option value="+1">US +1</option>
                  <option value="+39">IT +39</option>
                  <option value="+44">UK +44</option>
                  <option value="+49">DE +49</option>
                  <option value="+33">FR +33</option>
                  <option value="+34">ES +34</option>
                </select>
              </div>
              <div className="ecp-field">
                <label className="ecp-field-label" htmlFor="ecp-phone">Phone number</label>
                <div className="ecp-phone-input-row">
                  <input
                    type="tel"
                    id="ecp-phone"
                    className="ecp-input"
                    placeholder="Phone number"
                    defaultValue="340 822 4072"
                  />
                </div>
              </div>
            </div>
          </div>

          <p className="ecp-phone-hint">This phone number is on Ephemeral.</p>

          {/* Sync toggle */}
          <div className="ecp-sync-row">
            <div className="ecp-field-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </div>
            <div className="ecp-sync-text">
              <span className="ecp-sync-label">Sync contact with phone</span>
              <span className="ecp-sync-sub">This contact will be added to your phone contacts</span>
            </div>
            <label className="ecp-toggle" aria-label="Sync contact">
              <input type="checkbox" id="ecp-sync-toggle" defaultChecked />
              <span className="ecp-toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Save FAB */}
      <button
        type="button"
        className="ecp-save-fab"
        aria-label="Save contact"
        onClick={onClose}
      >
        <Save className="w-[20px] h-[20px]" />
      </button>
    </div>
  );
}
