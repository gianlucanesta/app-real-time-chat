import { ChevronLeft, Search, Video, Phone, Link, Bell, Palette, CircleSlash, Edit3 } from "lucide-react";

interface ContactProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEditClick: () => void;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
}

export function ContactProfilePanel({
  isOpen,
  onClose,
  onEditClick,
  contactName,
  contactInitials,
  contactGradient
}: ContactProfilePanelProps) {
  return (
    <div 
      className={`absolute inset-0 z-[30] bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!isOpen}
    >
      {/* Panel Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0 h-[64px]">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors shrink-0"
          onClick={onClose}
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="flex-1 text-[17px] font-semibold text-text-main">Contact info</h2>
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors shrink-0"
          onClick={onEditClick}
          aria-label="Edit contact"
        >
          <Edit3 className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Hero: large avatar + name + role */}
        <div className="flex flex-col items-center justify-center pt-8 pb-6 px-4">
          <div 
            className="w-24 h-24 rounded-full text-3xl font-bold flex items-center justify-center mb-4 shadow-sm" 
            style={{ background: contactGradient, color: '#fff' }}
          >
            {contactInitials}
          </div>
          <div className="text-xl font-bold text-text-main mb-1">{contactName}</div>
        </div>

        {/* Quick action buttons: Audio | Video | Search */}
        <div className="flex items-center justify-center gap-2 px-4 mb-6">
          <button type="button" className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent">
            <Phone className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-medium">Audio</span>
          </button>
          <button type="button" className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent">
            <Video className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-medium">Video</span>
          </button>
          <button type="button" className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent">
            <Search className="w-5 h-5 mb-1.5" />
            <span className="text-xs font-medium">Search</span>
          </button>
        </div>

        {/* Group 1: Media + Important */}
        <div className="bg-card mb-2 mx-4 rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm">
            <div className="flex items-center gap-4">
              <Link className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Media, links &amp; docs</span>
            </div>
            <div className="flex items-center gap-1 text-text-secondary">
              <span className="text-xs font-semibold mr-1">1</span>
              <ChevronLeft className="w-4 h-4 rotate-180 opacity-70" />
            </div>
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button type="button" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm">
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-text-secondary">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="font-medium">Important</span>
            </div>
            <div className="flex items-center gap-1 text-text-secondary">
              <span className="text-xs font-semibold mr-1">0</span>
              <ChevronLeft className="w-4 h-4 rotate-180 opacity-70" />
            </div>
          </button>
        </div>

        {/* Group 2: Notifications + Chat theme */}
        <div className="bg-card mb-4 mx-4 rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button type="button" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm">
            <div className="flex items-center gap-4">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Notifications</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button type="button" className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm">
            <div className="flex items-center gap-4">
              <Palette className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Chat theme</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
        </div>

        {/* Group 3: Danger actions */}
        <div className="bg-card mx-4 rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button type="button" className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium">
            <CircleSlash className="w-5 h-5" />
            <span>Block contact</span>
          </button>
        </div>
      </div>
    </div>
  );
}
