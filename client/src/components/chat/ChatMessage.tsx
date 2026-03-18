import { Smile, MoreVertical, Reply, Copy, Forward, Pin, Star, CheckSquare, AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface ChatMessageProps {
  id: string;
  text: string;
  time: string;
  isSent: boolean;
  contactInitials?: string;
  contactGradient?: string;
  status?: "sending" | "sent" | "delivered" | "read";
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEnterSelectMode?: () => void;
  reactions?: Record<string, number>;
  onReaction?: (emoji: string) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatMessage({
  id,
  text,
  time,
  isSent,
  contactInitials,
  contactGradient,
  status,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onCopy,
  onDelete,
  onEnterSelectMode,
  reactions,
  onReaction,
}: ChatMessageProps) {
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const reactionMenuRef = useClickOutside<HTMLDivElement>(() => setIsReactionMenuOpen(false));
  const contextMenuRef = useClickOutside<HTMLDivElement>(() => setIsContextMenuOpen(false));

  return (
    <div 
      className={`flex flex-col mb-4 group relative ${isSelectMode ? "w-full max-w-full cursor-pointer rounded-md p-1 " + (isSelected ? "bg-accent/10" : "") : (isSent ? "items-end self-end max-w-[85%] md:max-w-[70%] xl:max-w-[50%]" : "items-start max-w-[85%] md:max-w-[70%] xl:max-w-[50%]")}`}
      onClick={isSelectMode ? onToggleSelect : undefined}
      data-id={id}
    >
      <div className={`relative w-full flex ${isSelectMode ? (isSent ? "flex-row justify-start" : "flex-row") : (isSent ? "flex-col items-end" : "items-end gap-3 mt-1")} ${isSelectMode && !isSent ? "gap-3" : ""}`}>
        
        {/* Checkbox for Select Mode */}
        {isSelectMode && (
          <button 
            type="button" 
            className={`w-6 h-6 min-w-[24px] rounded-full border-2 flex items-center justify-center shrink-0 self-end mb-1.5 p-0 transition-colors ${isSelected ? "bg-accent border-accent" : "border-text-secondary bg-transparent"} ${isSent ? "mr-3" : ""}`}
            aria-label={isSelected ? "Deselect message" : "Select message"}
          >
            {isSelected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 block"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </button>
        )}

        {/* Avatar for received messages */}
        {!isSent && !isSelectMode && (
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 bottom-[18px] relative hidden md:flex"
            style={{ background: contactGradient }}
          >
            {contactInitials}
          </div>
        )}
        
        <div className={`relative flex flex-col ${isSelectMode && isSent ? "items-end ml-auto" : ""}`}>
          {/* Message Bubble */}
          <div 
            className={`px-4 py-3 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl ${
              isSent 
                ? "text-white rounded-br-sm"
                : "bg-card border border-border/50 text-text-main rounded-bl-sm"
            }`}
            style={isSent ? { background: "linear-gradient(135deg, #2563EB, #3B82F6)" } : undefined}
          >
            {text}
          </div>

          {/* Reaction strip */}
          {reactions && Object.keys(reactions).length > 0 && (
            <div className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end mr-1" : "ml-1"}`}>
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border/50 text-[12px] hover:bg-input/80 transition-colors"
                  onClick={() => onReaction?.(emoji)}
                >
                  {emoji}{count > 1 && <span className="text-text-secondary text-[10px]">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Time and Status */}
          <div className={`text-[11px] text-text-secondary mt-1 flex items-center gap-1 ${isSent ? "justify-end mr-1" : "ml-1"}`}>
            {time}
            {isSent && status === "sending" && (
              <span className="text-text-secondary flex items-center animate-pulse" aria-label="Sending">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
              </span>
            )}
            {isSent && status === "sent" && (
              <span className="text-text-secondary flex items-center" aria-label="Sent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
            )}
            {isSent && status === "delivered" && (
              <span className="text-text-secondary flex items-center" aria-label="Delivered">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="18 7 9.5 17 5 12" /><polyline points="23 7 14.5 17 12 14" /></svg>
              </span>
            )}
            {isSent && status === "read" && (
              <span className="text-accent flex items-center" aria-label="Read">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="18 7 9.5 17 5 12" /><polyline points="23 7 14.5 17 12 14" /></svg>
              </span>
            )}
          </div>

          {/* Message Hover Actions */}
          {!isSelectMode && (
            <div className={`absolute top-0 ${isSent ? "-left-20" : "-right-20"} hidden group-hover:flex items-center gap-1 p-1 bg-card border border-border/50 shadow-md rounded-lg animate-in fade-in z-10 w-max`}>
               <div className="relative" ref={reactionMenuRef}>
               <button 
                 className="w-7 h-7 rounded hover:bg-input flex items-center justify-center text-text-secondary transition-colors"
                 onClick={() => {
                   setIsReactionMenuOpen(!isReactionMenuOpen);
                   setIsContextMenuOpen(false);
                 }}
               >
                 <Smile className="w-4 h-4" />
               </button>
               {/* Reaction Popup */}
               {isReactionMenuOpen && (
                 <div className="absolute top-full lg:bottom-full lg:top-auto mt-2 lg:mt-0 lg:mb-2 -left-1/2 p-2 bg-card border border-border/80 shadow-xl rounded-full flex items-center gap-1 animate-in zoom-in-95 z-50">
                   {EMOJIS.map(emoji => (
                     <button
                       key={emoji}
                       className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-xl transition-transform hover:scale-125"
                       onClick={() => { onReaction?.(emoji); setIsReactionMenuOpen(false); }}
                     >
                       {emoji}
                     </button>
                   ))}
                 </div>
               )}
             </div>
             
             <div className="relative" ref={contextMenuRef}>
               <button 
                 className="w-7 h-7 rounded hover:bg-input flex items-center justify-center text-text-secondary transition-colors"
                 onClick={() => {
                   setIsContextMenuOpen(!isContextMenuOpen);
                   setIsReactionMenuOpen(false);
                 }}
               >
                 <MoreVertical className="w-4 h-4" />
               </button>
               {/* Context Menu */}
               {isContextMenuOpen && (
                 <div className={`absolute top-full mt-2 w-48 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 ${isSent ? "right-0" : "left-0"}`}>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                      <Reply className="w-4 h-4 text-text-secondary" /> Reply
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                      onClick={() => { onCopy?.(); setIsContextMenuOpen(false); }}
                    >
                      <Copy className="w-4 h-4 text-text-secondary" /> Copy
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                      <Forward className="w-4 h-4 text-text-secondary" /> Forward
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                      <Pin className="w-4 h-4 text-text-secondary" /> Pin
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                      <Star className="w-4 h-4 text-text-secondary" /> Star
                    </button>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                      onClick={() => { onEnterSelectMode?.(); setIsContextMenuOpen(false); }}
                    >
                      <CheckSquare className="w-4 h-4 text-text-secondary" /> Select
                    </button>
                    {!isSent && (
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                        <AlertTriangle className="w-4 h-4 text-text-secondary" /> Report
                      </button>
                    )}
                    <div className="w-full h-px bg-border/50 my-1"></div>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-danger hover:bg-danger/10 transition-colors font-medium"
                      onClick={() => { onDelete?.(); setIsContextMenuOpen(false); }}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                 </div>
               )}
             </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
