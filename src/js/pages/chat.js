import { getCurrentUser, logout } from "../auth.js";
import { showToast } from "../ui/toast.js";
import {
  MOCK_CONVERSATIONS,
  MOCK_USERS,
  getRandomReply,
} from "../data/mock-data.js";
import { debounce } from "../utils.js";

// ── Module state ───────────────────────────────────────────────
let activeContactId = "usr_mock_002";
let activeFilterType = "all";
// Deep-copy conversations so we can mutate them at runtime without touching
// the imported source object.
const conversations = JSON.parse(JSON.stringify(MOCK_CONVERSATIONS));

// ── Entry point ────────────────────────────────────────────────
export function initChatPage() {
  _loadUserProfile();
  _renderConversationList();
  _selectConversation(activeContactId);
  _initSearch();
  _initInputArea();
  _initNewChatPanel();
  _initFilterChips();
  _initSidebarMenu();
  _initHeaderActions();
  _initMobileSidebar();
  _initNavBar();
}

// ── User profile ───────────────────────────────────────────────
function _loadUserProfile() {
  const user = getCurrentUser();
  if (!user) return;

  // Populate left nav avatar
  const navAv = document.getElementById("nav-profile-avatar");
  if (navAv) {
    if (user.avatar) {
      navAv.style.backgroundImage = `url(${user.avatar})`;
      navAv.style.backgroundSize = "cover";
      navAv.textContent = "";
    } else {
      navAv.style.background =
        user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
      navAv.textContent = user.initials || "Me";
    }
  }
}

// ── Conversation list ──────────────────────────────────────────
function _renderConversationList(filter = "", filterType = activeFilterType) {
  const list = document.querySelector(".conversation-list");
  if (!list) return;
  list.innerHTML = "";

  const ids = Object.keys(conversations);
  const lFilter = filter.toLowerCase();
  let filtered = lFilter
    ? ids.filter((id) =>
        conversations[id].contact.displayName.toLowerCase().includes(lFilter),
      )
    : ids;

  if (filterType === "unread") {
    filtered = filtered.filter((id) => conversations[id].unread > 0);
  }

  filtered.forEach((id) => {
    const conv = conversations[id];
    const div = document.createElement("div");
    div.className =
      "conversation-item" + (id === activeContactId ? " active" : "");
    div.dataset.contactId = id;

    div.innerHTML =
      `<div class="avatar-wrapper">` +
      `<div class="avatar avatar-md" style="background:${conv.contact.gradient};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${_esc(conv.contact.initials)}</div>` +
      (conv.contact.online ? `<span class="status-dot"></span>` : "") +
      `</div>` +
      `<div class="conversation-content">` +
      `<div class="conversation-header">` +
      `<span class="conversation-name">${_esc(conv.contact.displayName)}</span>` +
      `<span class="conversation-time">${_esc(conv.lastTime)}</span>` +
      `</div>` +
      `<div class="conversation-preview">` +
      `<span class="conversation-message">${_esc(conv.lastMessage)}</span>` +
      (conv.unread > 0 ? `<span class="badge">${conv.unread}</span>` : "") +
      `</div>` +
      `</div>`;

    div.addEventListener("click", () => {
      conv.unread = 0;
      _selectConversation(id);
      // On mobile, collapse sidebar after selecting a conversation
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("hidden");
    });

    list.appendChild(div);
  });
}

// ── Select conversation ────────────────────────────────────────
function _selectConversation(contactId) {
  activeContactId = contactId;
  const conv = conversations[contactId];
  if (!conv) return;

  // Update chat header
  const nameEl = document.querySelector(".chat-contact-name");
  const statusEl = document.querySelector(".chat-header .chat-status");
  const headerAv = document.querySelector(".chat-header .avatar");

  if (nameEl) nameEl.textContent = conv.contact.displayName;
  if (headerAv) {
    headerAv.style.background = conv.contact.gradient;
    headerAv.textContent = conv.contact.initials;
    headerAv.style.color = "#fff";
    headerAv.style.display = "flex";
    headerAv.style.alignItems = "center";
    headerAv.style.justifyContent = "center";
    headerAv.style.fontWeight = "700";
    headerAv.style.fontSize = "14px";
  }
  if (statusEl) {
    if (conv.contact.online) {
      statusEl.textContent = "Online";
      statusEl.style.color = "var(--color-success)";
    } else {
      statusEl.textContent = "Offline";
      statusEl.style.color = "var(--color-text-secondary)";
    }
  }

  // Re-render list to reflect new active item and cleared unread
  _renderConversationList(
    document.getElementById("sidebar-search")?.value || "",
  );
  _renderMessages(contactId);
}

// ── Messages ───────────────────────────────────────────────────
function _renderMessages(contactId) {
  const area = document.getElementById("chat-messages");
  const conv = conversations[contactId];
  if (!area || !conv) return;

  area.innerHTML = "";

  const sep = document.createElement("div");
  sep.className = "date-separator";
  sep.innerHTML = "<span>TODAY</span>";
  area.appendChild(sep);

  conv.messages.forEach((msg) => area.appendChild(_createMessageEl(msg)));
  area.scrollTop = area.scrollHeight;
}

function _createMessageEl(msg) {
  const conv = conversations[activeContactId];
  const group = document.createElement("div");

  if (msg.from === "me") {
    group.className = "message-group-sent";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-sent";
    bubble.textContent = msg.text; // textContent — XSS safe

    const time = document.createElement("div");
    time.className = "message-time";
    time.style.textAlign = "right";
    time.textContent = msg.time;

    group.appendChild(bubble);
    group.appendChild(time);
  } else {
    group.className = "message-group-received";

    const row = document.createElement("div");
    row.className = "message-avatar-row";

    const av = document.createElement("div");
    av.className = "avatar avatar-sm";
    av.style.cssText =
      `background:${conv.contact.gradient};color:#fff;display:flex;` +
      `align-items:center;justify-content:center;font-weight:700;font-size:11px;`;
    av.textContent = conv.contact.initials;

    const inner = document.createElement("div");

    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-received";
    bubble.textContent = msg.text;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = msg.time;

    inner.appendChild(bubble);
    inner.appendChild(time);
    row.appendChild(av);
    row.appendChild(inner);
    group.appendChild(row);
  }

  return group;
}

// ── Input area ─────────────────────────────────────────────────
function _initInputArea() {
  const input = document.getElementById("message-input");
  const sendBtn = document.querySelector(".send-btn");
  const emojiBtn = document.querySelector('[aria-label="Emoji"]');
  const attachBtn = document.querySelector('[aria-label="Add attachment"]');
  const voiceBtn = document.querySelector('[aria-label="Voice note"]');
  if (!input || !sendBtn) return;

  // Enable/disable send button based on content
  input.addEventListener("input", () => {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    sendBtn.style.opacity = hasText ? "1" : "0.5";
  });

  // Enter = send; Shift+Enter = newline
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.value.trim()) _sendMessage();
    }
  });

  sendBtn.addEventListener("click", _sendMessage);
  emojiBtn?.addEventListener("click", () => _toggleEmojiPicker(input));
  attachBtn?.addEventListener("click", () =>
    showToast("Attachments are not available in demo mode.", "info"),
  );
  voiceBtn?.addEventListener("click", () =>
    showToast("Voice notes are not available in demo mode.", "info"),
  );
}

function _sendMessage() {
  const input = document.getElementById("message-input");
  const text = input?.value.trim();
  if (!text || !activeContactId) return;

  const now = new Date();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const msg = { id: "m" + Date.now(), from: "me", text, time };

  const conv = conversations[activeContactId];
  conv.messages.push(msg);
  conv.lastMessage = text.slice(0, 30) + (text.length > 30 ? "…" : "");
  conv.lastTime = time;

  const area = document.getElementById("chat-messages");
  if (area) {
    area.appendChild(_createMessageEl(msg));
    area.scrollTop = area.scrollHeight;
  }

  input.value = "";
  const sendBtn = document.querySelector(".send-btn");
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.opacity = "0.5";
  }

  _simulateReply();
}

function _simulateReply() {
  const area = document.getElementById("chat-messages");
  const conv = conversations[activeContactId];
  if (!area || !conv) return;

  setTimeout(() => {
    // Typing indicator
    const typingGroup = document.createElement("div");
    typingGroup.id = "typing-indicator";
    typingGroup.className = "message-group-received";

    const row = document.createElement("div");
    row.className = "message-avatar-row";

    const av = document.createElement("div");
    av.className = "avatar avatar-sm";
    av.style.cssText =
      `background:${conv.contact.gradient};color:#fff;display:flex;` +
      `align-items:center;justify-content:center;font-weight:700;font-size:11px;`;
    av.textContent = conv.contact.initials;

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = "<span></span><span></span><span></span>";

    row.appendChild(av);
    row.appendChild(indicator);
    typingGroup.appendChild(row);
    area.appendChild(typingGroup);
    area.scrollTop = area.scrollHeight;

    const replyDelay = 1200 + Math.random() * 800;
    setTimeout(() => {
      typingGroup.remove();

      const replyText = getRandomReply();
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const replyMsg = {
        id: "m" + Date.now(),
        from: "them",
        text: replyText,
        time,
      };

      conv.messages.push(replyMsg);
      conv.lastMessage =
        replyText.slice(0, 30) + (replyText.length > 30 ? "…" : "");
      conv.lastTime = time;

      area.appendChild(_createMessageEl(replyMsg));
      area.scrollTop = area.scrollHeight;
    }, replyDelay);
  }, 400);
}

// ── Emoji picker ───────────────────────────────────────────────
const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🤔",
  "👍",
  "🎉",
  "🔥",
  "💯",
  "✅",
  "🚀",
  "💬",
  "❤️",
  "😊",
  "🙌",
  "⭐",
];
let emojiPickerEl = null;

function _toggleEmojiPicker(input) {
  if (emojiPickerEl && document.body.contains(emojiPickerEl)) {
    emojiPickerEl.remove();
    emojiPickerEl = null;
    return;
  }

  emojiPickerEl = document.createElement("div");
  emojiPickerEl.style.cssText = [
    "position:absolute",
    "bottom:80px",
    "left:60px",
    "background:var(--color-card)",
    "border:1px solid var(--color-border)",
    "border-radius:12px",
    "padding:8px",
    "display:grid",
    "grid-template-columns:repeat(5,32px)",
    "gap:4px",
    "z-index:200",
    "box-shadow:0 8px 24px rgba(0,0,0,0.3)",
  ].join(";");

  EMOJIS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.style.cssText =
      "width:32px;height:32px;font-size:18px;background:none;border:none;cursor:pointer;border-radius:6px;";
    btn.addEventListener("mouseover", () => {
      btn.style.background = "var(--color-input)";
    });
    btn.addEventListener("mouseout", () => {
      btn.style.background = "none";
    });
    btn.addEventListener("click", () => {
      input.value += emoji;
      input.focus();
      const sendBtn = document.querySelector(".send-btn");
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.style.opacity = "1";
      }
    });
    emojiPickerEl.appendChild(btn);
  });

  const inputArea = document.querySelector(".chat-input-area");
  if (inputArea) {
    inputArea.style.position = "relative";
    inputArea.appendChild(emojiPickerEl);
  }

  // Close picker when clicking outside
  setTimeout(() => {
    document.addEventListener("click", function handler(e) {
      if (!emojiPickerEl?.contains(e.target)) {
        emojiPickerEl?.remove();
        emojiPickerEl = null;
        document.removeEventListener("click", handler);
      }
    });
  }, 0);
}

// ── Sidebar search ─────────────────────────────────────────────
function _initSearch() {
  const searchInput = document.getElementById("sidebar-search");
  if (!searchInput) return;
  searchInput.addEventListener(
    "input",
    debounce((e) => {
      _renderConversationList(e.target.value);
    }),
  );
}

// ── Header actions ─────────────────────────────────────────────
function _initHeaderActions() {
  document
    .querySelector('[aria-label="Video call"]')
    ?.addEventListener("click", () =>
      showToast("Video call is not available in demo mode.", "info"),
    );
  document
    .querySelector('[aria-label="Voice call"]')
    ?.addEventListener("click", () =>
      showToast("Voice call is not available in demo mode.", "info"),
    );
  document
    .querySelector('[aria-label="More options"]')
    ?.addEventListener("click", () =>
      showToast("More options: coming soon.", "info"),
    );
  document
    .querySelector('.chat-header-actions [aria-label="Search"]')
    ?.addEventListener("click", () =>
      showToast("In-chat search: coming soon.", "info"),
    );
}

// ── New-chat slide-in panel ─────────────────────────────────────
function _initNewChatPanel() {
  const panel = document.getElementById("new-chat-panel");
  if (!panel) return;

  const openPanel = () => {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    _renderNewChatContactList("");
    const searchEl = document.getElementById("new-chat-search");
    if (searchEl) searchEl.value = "";
  };
  const closePanel = () => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  };

  document.getElementById("new-chat-btn")?.addEventListener("click", openPanel);
  document.getElementById("new-chat-back-btn")?.addEventListener("click", closePanel);

  document.getElementById("new-chat-search")?.addEventListener(
    "input",
    debounce((e) => _renderNewChatContactList(e.target.value)),
  );

  document.getElementById("new-chat-options-btn")?.addEventListener("click", () =>
    showToast("Options: coming soon.", "info"),
  );

  panel.querySelectorAll(".new-chat-action-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.ncAction;
      const labels = { group: "New group", contact: "New contact", community: "New community" };
      showToast(`${labels[action] ?? "Action"}: coming soon.`, "info");
    });
  });

  _renderNewChatContactList("");
}

function _renderNewChatContactList(filter = "") {
  const list = document.getElementById("new-chat-contact-list");
  if (!list) return;
  list.innerHTML = "";

  const lFilter = filter.toLowerCase();
  const filtered = MOCK_USERS.filter(
    (u) =>
      u.displayName.toLowerCase().includes(lFilter) ||
      u.role.toLowerCase().includes(lFilter),
  );

  filtered.forEach((user) => {
    const row = document.createElement("div");
    row.className = "new-chat-contact-row";
    row.innerHTML =
      `<div class="avatar avatar-md" style="background:${user.gradient};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${_esc(user.initials)}</div>` +
      `<div>` +
      `<div class="contact-name">${_esc(user.displayName)}</div>` +
      `<div class="contact-role">${_esc(user.role)}</div>` +
      `</div>`;

    row.addEventListener("click", () => {
      const panel = document.getElementById("new-chat-panel");
      panel?.classList.remove("open");
      panel?.setAttribute("aria-hidden", "true");

      if (!conversations[user.id]) {
        conversations[user.id] = {
          contact: user,
          unread: 0,
          lastTime: "Now",
          lastMessage: "",
          messages: [],
        };
      }
      _selectConversation(user.id);
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("hidden");
    });

    list.appendChild(row);
  });
}

// ── Filter chips ───────────────────────────────────────────────
function _initFilterChips() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const filter = chip.dataset.filter;
      if (filter === "favorites") {
        showToast("Favorites: coming soon.", "info");
        return;
      }
      if (filter === "more") {
        showToast("More filters: coming soon.", "info");
        return;
      }
      // Update active state
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeFilterType = filter;
      _renderConversationList(
        document.getElementById("sidebar-search")?.value || "",
        filter,
      );
    });
  });
}

// ── Sidebar menu (three-dot) ────────────────────────────────────
function _initSidebarMenu() {
  const btn = document.getElementById("sidebar-menu-btn");
  const dropdown = document.getElementById("sidebar-menu-dropdown");
  if (!btn || !dropdown) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && e.target !== btn) {
      dropdown.classList.remove("open");
    }
  });

  dropdown.querySelectorAll(".sidebar-menu-item").forEach((item) => {
    item.addEventListener("click", () => {
      dropdown.classList.remove("open");
      const action = item.dataset.action;
      if (action === "logout") {
        logout();
        window.location.replace("index.html");
        return;
      }
      const labels = {
        "new-group": "New group",
        "important": "Important messages",
        "select": "Select chat",
        "mark-read": "Mark all as read",
      };
      showToast(`${labels[action] ?? "Action"}: coming soon.`, "info");
    });
  });
}

// ── Left nav bar ──────────────────────────────────────────────
function _initNavBar() {
  const labels = { calls: "Calls", communities: "Communities", status: "Status", starred: "Starred", archived: "Archived" };
  document.querySelectorAll(".chat-nav-item[data-nav]").forEach((btn) => {
    const key = btn.dataset.nav;
    if (key && key !== "chats") {
      btn.addEventListener("click", () =>
        showToast(`${labels[key] ?? key}: coming soon.`, "info"),
      );
    }
  });
}

// ── Mobile sidebar ─────────────────────────────────────────────
function _initMobileSidebar() {
  document.querySelector(".back-btn")?.addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("hidden");
  });
}

// ── HTML escape helper ─────────────────────────────────────────
function _esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
