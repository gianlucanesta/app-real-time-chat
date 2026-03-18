import { ArrowLeft, Search, Users, UserPlus } from "lucide-react";

interface NewChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewContact: () => void;
}

export function NewChatPanel({ isOpen, onClose, onOpenNewContact }: NewChatPanelProps) {
  return (
    <div className={`absolute inset-0 z-20 bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!isOpen}>
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0 h-[64px]">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2>New chat</h2>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center bg-input rounded-full h-9 px-3 border border-transparent focus-within:border-accent">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input 
            type="text" 
            placeholder="Search name or number" 
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      <div className="flex flex-col shrink-0">
        <button className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          New group
        </button>
        <button className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors" onClick={onOpenNewContact}>
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          New contact
        </button>
        <button className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          New community
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        <div className="px-4 pt-3 pb-2 text-xs text-text-secondary uppercase tracking-wider font-semibold shrink-0">Contacts on Ephemeral</div>
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-input/50 transition-colors">
          <div className="relative inline-block shrink-0">
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] text-white"
              style={{ background: "linear-gradient(135deg, #EC4899, #F97316)" }}
            >
              ER
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] text-text-main truncate">Elena Rodriguez</div>
            <div className="text-[13px] text-text-secondary truncate">Product Designer</div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-input/50 transition-colors">
          <div className="relative inline-block shrink-0">
            <div
              className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] text-white"
              style={{ background: "linear-gradient(135deg, #14B8A6, #22D3EE)" }}
            >
              SB
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] text-text-main truncate">Samuel Brooks</div>
            <div className="text-[13px] text-text-secondary truncate">Available</div>
          </div>
        </div>
      </div>
    </div>
  );
}
