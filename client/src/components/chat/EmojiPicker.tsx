import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  Clock,
  Smile,
  Cat,
  Coffee,
  Dumbbell,
  Car,
  Lightbulb,
  Hash,
  Flag,
  Search,
  X,
} from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** Where to position relative to anchor */
  position?: "top" | "bottom";
  /** Alignment */
  align?: "left" | "right";
  className?: string;
}

interface EmojiCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  emojis: string[];
}

const CATEGORIES: EmojiCategory[] = [
  {
    id: "recent",
    label: "Reazioni recenti",
    icon: Clock,
    emojis: [], // populated dynamically
  },
  {
    id: "smileys",
    label: "Faccine e Persone",
    icon: Smile,
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "🥲",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🫢",
      "🫣",
      "🤫",
      "🤔",
      "🫡",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "🫥",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
      "😷",
      "🤒",
      "🤕",
      "🤢",
      "🤮",
      "🥵",
      "🥶",
      "🥴",
      "😵",
      "🤯",
      "🤠",
      "🥳",
      "🥸",
      "😎",
      "🤓",
      "🧐",
      "😕",
      "🫤",
      "😟",
      "🙁",
      "😮",
      "😯",
      "😲",
      "😳",
      "🥺",
      "🥹",
      "😦",
      "😧",
      "😨",
      "😰",
      "😥",
      "😢",
      "😭",
      "😱",
      "😖",
      "😣",
      "😞",
      "😓",
      "😩",
      "😫",
      "🥱",
      "😤",
      "😡",
      "😠",
      "🤬",
      "😈",
      "👿",
      "💀",
      "☠️",
      "💩",
      "🤡",
      "👹",
      "👺",
      "👻",
      "👽",
      "👾",
      "🤖",
      "😺",
      "😸",
      "😹",
      "😻",
      "😼",
      "😽",
      "🙀",
      "😿",
      "😾",
      "🙈",
      "🙉",
      "🙊",
      "👋",
      "🤚",
      "🖐️",
      "✋",
      "🖖",
      "🫱",
      "🫲",
      "🫳",
      "🫴",
      "🫷",
      "🫸",
      "👌",
      "🤌",
      "🤏",
      "✌️",
      "🤞",
      "🫰",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "🖕",
      "👇",
      "☝️",
      "🫵",
      "👍",
      "👎",
      "✊",
      "👊",
      "🤛",
      "🤜",
      "👏",
      "🙌",
      "🫶",
      "👐",
      "🤲",
      "🤝",
      "🙏",
      "💪",
      "🦾",
    ],
  },
  {
    id: "animals",
    label: "Animali e Natura",
    icon: Cat,
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐻‍❄️",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🙈",
      "🙉",
      "🙊",
      "🐒",
      "🐔",
      "🐧",
      "🐦",
      "🐤",
      "🐣",
      "🐥",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
      "🐺",
      "🐗",
      "🐴",
      "🦄",
      "🐝",
      "🪱",
      "🐛",
      "🦋",
      "🐌",
      "🐞",
      "🌸",
      "🌹",
      "🌺",
      "🌻",
      "🌼",
      "🌷",
      "🌱",
      "🌿",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🪻",
      "🪷",
      "🌵",
      "🌴",
      "🌲",
      "🎋",
      "🎍",
    ],
  },
  {
    id: "food",
    label: "Cibo e Bevande",
    icon: Coffee,
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🫐",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🥑",
      "🍆",
      "🥦",
      "🥬",
      "🥒",
      "🌶️",
      "🫑",
      "🌽",
      "🥕",
      "🧄",
      "🧅",
      "🥔",
      "🍠",
      "🫘",
      "🍞",
      "🥐",
      "🥖",
      "🫓",
      "🥨",
      "🥯",
      "🧇",
      "🥞",
      "🧈",
      "🍳",
      "🥚",
      "🍕",
      "🌭",
      "🍔",
      "🍟",
      "🌮",
      "🌯",
      "🫔",
      "🥙",
      "🧆",
      "🍝",
      "🍜",
      "🍲",
      "🍛",
      "🍣",
      "🍱",
      "🥟",
      "🍤",
      "🍙",
      "🍚",
      "🎂",
      "🍰",
      "🧁",
      "🥧",
      "🍫",
      "🍬",
      "🍭",
      "🍮",
      "🍯",
      "☕",
      "🍵",
      "🧃",
      "🥤",
      "🍶",
      "🍺",
      "🍻",
      "🥂",
      "🍷",
      "🍸",
    ],
  },
  {
    id: "activities",
    label: "Attività",
    icon: Dumbbell,
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🏓",
      "🏸",
      "🏒",
      "🥊",
      "🥋",
      "🎯",
      "⛳",
      "🏹",
      "🎣",
      "🤿",
      "🥅",
      "⛸️",
      "🎿",
      "🛷",
      "🎮",
      "🕹️",
      "🎲",
      "🧩",
      "♟️",
      "🎭",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎹",
      "🥁",
      "🎷",
      "🎺",
      "🎸",
      "🪕",
      "🎻",
      "🎪",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🏅",
      "🎖️",
      "🎗️",
    ],
  },
  {
    id: "travel",
    label: "Viaggi e Luoghi",
    icon: Car,
    emojis: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🛻",
      "🚚",
      "🚛",
      "🚜",
      "🏍️",
      "🛵",
      "🚲",
      "🛴",
      "🚔",
      "🚍",
      "✈️",
      "🛩️",
      "🛫",
      "🛬",
      "🚀",
      "🛸",
      "🚁",
      "🛶",
      "⛵",
      "🚤",
      "🏠",
      "🏡",
      "🏢",
      "🏣",
      "🏤",
      "🏥",
      "🏦",
      "🏨",
      "🏩",
      "🏪",
      "🏫",
      "🏬",
      "🏭",
      "🗼",
      "🗽",
      "⛪",
      "🕌",
      "🕍",
      "⛩️",
      "🕋",
      "🌍",
      "🌎",
      "🌏",
      "🗺️",
      "🧭",
      "🏔️",
      "⛰️",
      "🌋",
      "🗻",
    ],
  },
  {
    id: "objects",
    label: "Oggetti",
    icon: Lightbulb,
    emojis: [
      "⌚",
      "📱",
      "💻",
      "⌨️",
      "🖥️",
      "🖨️",
      "🖱️",
      "🖲️",
      "💾",
      "💿",
      "📷",
      "📸",
      "📹",
      "🎥",
      "📽️",
      "🎞️",
      "📞",
      "☎️",
      "📟",
      "📠",
      "📺",
      "📻",
      "🎙️",
      "🎚️",
      "🎛️",
      "🧭",
      "⏱️",
      "⏲️",
      "⏰",
      "🕰️",
      "💡",
      "🔦",
      "🕯️",
      "🪔",
      "🧯",
      "💰",
      "💴",
      "💵",
      "💶",
      "💷",
      "💎",
      "⚖️",
      "🪜",
      "🧰",
      "🪛",
      "🔧",
      "🔨",
      "⚒️",
      "🛠️",
      "⛏️",
      "🔩",
      "⚙️",
      "🧱",
      "📎",
      "🖇️",
      "✂️",
      "📐",
      "📏",
      "🔑",
      "🗝️",
      "🔒",
      "🔓",
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❤️‍🔥",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
      "💝",
      "💘",
      "💟",
      "☮️",
      "✝️",
      "☪️",
      "🕉️",
      "☸️",
      "✡️",
      "🔯",
      "🕎",
    ],
  },
  {
    id: "symbols",
    label: "Simboli",
    icon: Hash,
    emojis: [
      "🏧",
      "🚮",
      "🚰",
      "♿",
      "🚹",
      "🚺",
      "🚻",
      "🚼",
      "🚾",
      "🛂",
      "🛃",
      "🛄",
      "🛅",
      "⚠️",
      "🚸",
      "⛔",
      "🚫",
      "🚳",
      "🚭",
      "🚯",
      "🚱",
      "🚷",
      "📵",
      "🔞",
      "☢️",
      "☣️",
      "⬆️",
      "↗️",
      "➡️",
      "↘️",
      "⬇️",
      "↙️",
      "⬅️",
      "↖️",
      "↕️",
      "↔️",
      "↩️",
      "↪️",
      "⤴️",
      "⤵️",
      "🔃",
      "🔄",
      "🔙",
      "🔚",
      "🔛",
      "🔜",
      "🔝",
      "✅",
      "❌",
      "❎",
      "➕",
      "➖",
      "➗",
      "✖️",
      "♾️",
      "❓",
      "❔",
      "❕",
      "❗",
      "〰️",
      "💲",
      "⚕️",
      "♻️",
      "⚜️",
      "🔱",
      "📛",
      "🔰",
      "⭕",
      "✳️",
      "❇️",
      "©️",
      "®️",
      "™️",
      "#️⃣",
      "*️⃣",
      "0️⃣",
      "1️⃣",
      "2️⃣",
      "3️⃣",
      "4️⃣",
      "5️⃣",
      "6️⃣",
      "7️⃣",
      "8️⃣",
      "9️⃣",
      "🔟",
      "🔠",
      "🔡",
      "🔢",
      "🔣",
      "🔤",
      "🅰️",
      "🆎",
      "🅱️",
      "🆑",
      "🆒",
      "🆓",
      "ℹ️",
      "🆔",
      "Ⓜ️",
    ],
  },
  {
    id: "flags",
    label: "Bandiere",
    icon: Flag,
    emojis: [
      "🏁",
      "🚩",
      "🎌",
      "🏴",
      "🏳️",
      "🏳️‍🌈",
      "🏳️‍⚧️",
      "🏴‍☠️",
      "🇮🇹",
      "🇺🇸",
      "🇬🇧",
      "🇫🇷",
      "🇩🇪",
      "🇪🇸",
      "🇵🇹",
      "🇧🇷",
      "🇯🇵",
      "🇰🇷",
      "🇨🇳",
      "🇮🇳",
      "🇷🇺",
      "🇦🇺",
      "🇨🇦",
      "🇲🇽",
      "🇦🇷",
      "🇨🇱",
      "🇨🇴",
      "🇵🇪",
      "🇻🇪",
      "🇪🇨",
      "🇧🇴",
      "🇺🇾",
      "🇵🇾",
      "🇹🇷",
      "🇸🇦",
      "🇦🇪",
      "🇪🇬",
      "🇿🇦",
      "🇳🇬",
      "🇰🇪",
      "🇬🇭",
      "🇪🇹",
      "🇲🇦",
      "🇹🇳",
      "🇩🇿",
      "🇮🇱",
      "🇵🇸",
      "🇱🇧",
      "🇯🇴",
      "🇮🇶",
      "🇮🇷",
      "🇵🇰",
      "🇧🇩",
      "🇱🇰",
      "🇳🇵",
      "🇹🇭",
      "🇻🇳",
      "🇮🇩",
      "🇲🇾",
      "🇵🇭",
      "🇸🇬",
      "🇭🇰",
      "🇹🇼",
      "🇳🇿",
      "🇫🇮",
      "🇸🇪",
      "🇳🇴",
      "🇩🇰",
      "🇮🇸",
      "🇳🇱",
      "🇧🇪",
      "🇨🇭",
      "🇦🇹",
      "🇵🇱",
      "🇨🇿",
      "🇭🇺",
      "🇷🇴",
      "🇧🇬",
      "🇭🇷",
      "🇷🇸",
      "🇺🇦",
      "🇬🇷",
      "🇮🇪",
      "🇪🇺",
    ],
  },
];

const RECENT_STORAGE_KEY = "emoji-recent";
const MAX_RECENT = 24;

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(emoji: string) {
  const prev = getRecent().filter((e) => e !== emoji);
  const next = [emoji, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
}

export function EmojiPicker({
  onSelect,
  onClose,
  position = "top",
  align = "left",
  className = "",
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("recent");
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useClickOutside(containerRef, onClose);

  const recentEmojis = useMemo(() => getRecent(), []);

  const categories = useMemo(() => {
    const cats = [...CATEGORIES];
    cats[0] = { ...cats[0], emojis: recentEmojis };
    return cats;
  }, [recentEmojis]);

  const handleSelect = useCallback(
    (emoji: string) => {
      saveRecent(emoji);
      onSelect(emoji);
    },
    [onSelect],
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    // Simple filter: flatten all emojis (no text search, just show all when searching)
    const q = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(q)),
      }))
      .filter((cat) => cat.emojis.length > 0);
  }, [searchQuery, categories]);

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el && scrollRef.current) {
      const top = el.offsetTop - scrollRef.current.offsetTop;
      scrollRef.current.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  // Track active category on scroll
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      const scrollTop = scrollEl.scrollTop + 10;
      let current = categories[0].id;
      for (const cat of categories) {
        const el = categoryRefs.current[cat.id];
        if (el && el.offsetTop - scrollEl.offsetTop <= scrollTop) {
          current = cat.id;
        }
      }
      setActiveCategory(current);
    };
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [categories]);

  const posClass = position === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const alignClass = align === "right" ? "right-0" : "left-0";

  return (
    <div
      ref={containerRef}
      className={`absolute ${posClass} ${alignClass} w-[320px] h-[380px] bg-card border border-border/80 shadow-2xl rounded-xl z-[60] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-1 border-b border-border/40 shrink-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-text-secondary hover:text-text-main hover:bg-input/50"
              }`}
              onClick={() => scrollToCategory(cat.id)}
              title={cat.label}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-input/60 border border-border/50 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-text-secondary shrink-0" />
          <input
            type="text"
            placeholder="Cerca reazione"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-text-secondary hover:text-text-main"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Emoji grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 pb-2">
        {filteredCategories.map((cat) =>
          cat.emojis.length > 0 ? (
            <div
              key={cat.id}
              ref={(el) => {
                categoryRefs.current[cat.id] = el;
              }}
            >
              <div className="text-[11px] text-text-secondary font-medium px-1 pt-2 pb-1 sticky top-0 bg-card/95 backdrop-blur-sm">
                {cat.label}
              </div>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={`${cat.id}-${i}`}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[22px] hover:bg-input/60 transition-colors"
                    onClick={() => handleSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null,
        )}
        {filteredCategories.length === 0 && (
          <div className="flex items-center justify-center h-full text-[13px] text-text-secondary">
            Nessun risultato
          </div>
        )}
      </div>
    </div>
  );
}
