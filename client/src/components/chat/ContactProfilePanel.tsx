import {
  X,
  ChevronLeft,
  Search,
  Video,
  Phone,
  Link,
  Bell,
  Palette,
  CircleSlash,
  Edit3,
  Star,
  Shield,
  Timer,
  Heart,
  Trash2,
  AlertTriangle,
  Users2,
} from "lucide-react";
import { useState } from "react";

interface ContactProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onEditClick: () => void;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
  contactAvatarUrl?: string | null;
  contactEmail?: string;
  contactPhone?: string;
  contactBio?: string;
  mediaCount?: number;
  starredCount?: number;
  groupsInCommon?: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials: string;
    gradient: string;
    members: string;
  }>;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onSearch?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onBlockContact?: () => void;
  onReportContact?: () => void;
  onAddToFavorites?: () => void;
  isFavorite?: boolean;
  onImportantClick?: () => void;
}

export function ContactProfilePanel({
  isOpen,
  onClose,
  onEditClick,
  contactName,
  contactInitials,
  contactGradient,
  contactAvatarUrl,
  contactEmail: _contactEmail,
  contactPhone,
  contactBio,
  mediaCount = 0,
  starredCount = 0,
  groupsInCommon = [],
  onAudioCall,
  onVideoCall,
  onSearch,
  onClearChat,
  onDeleteChat,
  onBlockContact,
  onReportContact,
  onAddToFavorites,
  isFavorite = false,
  onImportantClick,
}: ContactProfilePanelProps) {
  const [disappearingMessages] = useState<"off" | "24h" | "7d" | "90d">("off");

  const disappearingLabel =
    disappearingMessages === "off"
      ? "Off"
      : disappearingMessages === "24h"
        ? "24 hours"
        : disappearingMessages === "7d"
          ? "7 days"
          : "90 days";

  return (
    <div
      className={`absolute inset-0 z-[80] bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Hero: close/edit buttons in corners, avatar + name centred */}
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
          {/* Edit button — absolute top-right */}
          <button
            type="button"
            className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            onClick={onEditClick}
            aria-label="Edit contact"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          {/* Avatar */}
          <div className="mb-4">
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={contactName}
                className="w-24 h-24 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full text-3xl font-bold flex items-center justify-center shadow-sm"
                style={{ background: contactGradient, color: "#fff" }}
              >
                {contactInitials}
              </div>
            )}
          </div>
          <div className="text-xl font-bold text-text-main mb-0.5">
            {contactName}
          </div>
          {/* Phone / Email under name */}
          {contactPhone && (
            <div className="text-sm text-text-secondary">{contactPhone}</div>
          )}
        </div>

        {/* Quick action buttons: Audio | Video | Search */}
        <div className="flex items-center justify-center mb-6 px-4">
          <div className="flex items-center gap-2 w-full max-w-xs md:max-w-xl">
            <button
              type="button"
              className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent"
              onClick={onAudioCall}
            >
              <Phone className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">Audio</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center flex-1 py-3 bg-card rounded-xl hover:bg-input transition-colors border border-border/50 text-accent"
              onClick={onVideoCall}
            >
              <Video className="w-5 h-5 mb-1.5" />
              <span className="text-xs font-medium">Video</span>
            </button>
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

        {/* Bio / Info section */}
        {contactBio && (
          <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm px-4 py-3.5">
            <div className="text-xs font-semibold text-text-secondary mb-1">
              Info
            </div>
            <div className="text-sm text-text-main">{contactBio}</div>
          </div>
        )}

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
            onClick={onImportantClick}
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

        {/* Group 2: Notifications + Chat theme */}
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
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Palette className="w-5 h-5 text-text-secondary" />
              <span className="font-medium">Chat theme</span>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
        </div>

        {/* Group 3: Disappearing messages + Encryption */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-input transition-colors text-text-main text-sm"
          >
            <div className="flex items-center gap-4">
              <Timer className="w-5 h-5 text-text-secondary" />
              <div className="flex flex-col items-start">
                <span className="font-medium">Disappearing messages</span>
                <span className="text-xs text-text-secondary">
                  {disappearingLabel}
                </span>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-text-secondary rotate-180 opacity-70" />
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
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

        {/* Groups in common */}
        {groupsInCommon.length > 0 && (
          <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
            <div className="px-4 pt-3.5 pb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                <Users2 className="w-4 h-4" />
                {groupsInCommon.length} group
                {groupsInCommon.length !== 1 ? "s" : ""} in common
              </div>
            </div>
            {groupsInCommon.map((g) => (
              <button
                key={g.id}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-input transition-colors text-sm"
              >
                {g.avatar ? (
                  <img
                    src={g.avatar}
                    alt={g.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center shrink-0"
                    style={{ background: g.gradient, color: "#fff" }}
                  >
                    {g.initials}
                  </div>
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium text-text-main truncate w-full">
                    {g.name}
                  </span>
                  <span className="text-xs text-text-secondary truncate w-full">
                    {g.members}
                  </span>
                </div>
              </button>
            ))}
            <div className="h-2" />
          </div>
        )}

        {/* Add to favorites */}
        <div className="bg-card mb-2 mx-auto w-full max-w-xs md:max-w-xl rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-input transition-colors text-sm font-medium text-text-main"
            onClick={onAddToFavorites}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? "text-accent fill-accent" : "text-text-secondary"}`}
            />
            <span>
              {isFavorite ? "Remove from favorites" : "Add to favorites"}
            </span>
          </button>
        </div>

        {/* Danger actions: Clear chat + Block + Report + Delete */}
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
            onClick={onBlockContact}
          >
            <CircleSlash className="w-5 h-5" />
            <span>Block {contactName}</span>
          </button>
          <div className="h-[1px] bg-border/50 mx-12"></div>
          <button
            type="button"
            className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-danger/10 text-danger transition-colors text-sm font-medium"
            onClick={onReportContact}
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Report {contactName}</span>
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
    </div>
  );
}
