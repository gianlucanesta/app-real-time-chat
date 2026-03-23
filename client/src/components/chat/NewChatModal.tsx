import { useState } from "react";
import { X, Search } from "lucide-react";
import { Button } from "../ui/button";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [activeTab, setActiveTab] = useState<"private" | "group">("private");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay backdrop-blur-[4px] z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-[480px] bg-card rounded-2xl p-6 sm:p-8 relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-text-main">Start New Conversation</h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-main transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-5">
          <button 
            onClick={() => setActiveTab("private")}
            className={`px-4 py-3 text-base font-medium border-b-2 transition-colors ${
              activeTab === "private" 
                ? "text-accent border-accent" 
                : "text-text-secondary border-transparent cursor-pointer"
            }`}
          >
            New Private Chat
          </button>
          <button 
            onClick={() => setActiveTab("group")}
            className={`px-4 py-3 text-base font-medium border-b-2 transition-colors ${
              activeTab === "group" 
                ? "text-accent border-accent" 
                : "text-text-secondary border-transparent cursor-pointer"
            }`}
          >
            New Group
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5">
          {/* Search Input */}
          <div className="relative flex items-center bg-input border border-border rounded-lg h-[44px] px-3 transition-colors focus-within:border-accent">
            <Search className="min-w-[20px] w-5 h-5 text-text-secondary mr-3" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              className="flex-1 bg-transparent border-none outline-none text-text-main text-[14px] placeholder:text-text-secondary h-full"
            />
          </div>

          {/* Contact List */}
          <div className="max-h-[200px] overflow-y-auto scrollbar-thin flex flex-col gap-1">
            
            <label className="flex items-center gap-3 p-3 cursor-pointer transition-colors active:scale-[0.98] rounded-lg hover:bg-input">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #14B8A6, #22D3EE)" }}
              >
                SB
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="font-semibold text-text-main text-[14px]">Samuel Brooks</div>
                <div className="text-[12px] text-text-secondary">Full Stack Developer</div>
              </div>
              <input type="checkbox" className="appearance-none w-[22px] h-[22px] rounded-full border-2 border-border flex-shrink-0 cursor-pointer transition-all relative checked:bg-accent checked:border-accent contact-check-tick" defaultChecked />
            </label>

            <label className="flex items-center gap-3 p-3 cursor-pointer transition-colors active:scale-[0.98] rounded-lg hover:bg-input">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
              >
                JV
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="font-semibold text-text-main text-[14px]">Julian Voss</div>
                <div className="text-[12px] text-text-secondary">UX Researcher</div>
              </div>
              <input type="checkbox" className="appearance-none w-[22px] h-[22px] rounded-full border-2 border-border flex-shrink-0 cursor-pointer transition-all relative checked:bg-accent checked:border-accent contact-check-tick" />
            </label>

            <label className="flex items-center gap-3 p-3 cursor-pointer transition-colors active:scale-[0.98] rounded-lg hover:bg-input">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                style={{ background: "linear-gradient(135deg, #F59E0B, #EF4444)" }}
              >
                SJ
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="font-semibold text-text-main text-[14px]">Sarah Jenkins</div>
                <div className="text-[12px] text-text-secondary">Project Manager</div>
              </div>
              <input type="checkbox" className="appearance-none w-[22px] h-[22px] rounded-full border-2 border-border flex-shrink-0 cursor-pointer transition-all relative checked:bg-accent checked:border-accent contact-check-tick" />
            </label>
            
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="default">Start Chat</Button>
        </div>

      </div>
    </div>
  );
}
