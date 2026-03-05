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
  _initMessageActions();
  _initStaticMessageMenus();
  _initNewChatPanel();
  _initFilterChips();
  _initSidebarMenu();
  _initHeaderActions();
  _initContactPanel();
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

  // Populate mobile bottom tab bar avatar
  const mobileTabAv = document.getElementById("mobile-tab-avatar");
  if (mobileTabAv) {
    if (user.avatar) {
      mobileTabAv.style.backgroundImage = `url(${user.avatar})`;
      mobileTabAv.style.backgroundSize = "cover";
      mobileTabAv.textContent = "";
    } else {
      mobileTabAv.style.background =
        user.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
      mobileTabAv.textContent = user.initials || "Me";
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
  _updateContactPanel(contactId);
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
  const group = document.createElement("div");
  const menuId = "msg-menu-" + msg.id;

  if (msg.from === "me") {
    group.className = "message-group-sent";

    const row = document.createElement("div");
    row.className = "message-row";

    // React emoji button: left of bubble for sent messages
    // With flex-direction: row-reverse, DOM-first = visual-right, DOM-second = visual-left
    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-sent";
    bubble.textContent = msg.text; // textContent — XSS safe
    // Chevron: inside bubble
    bubble.appendChild(_createMsgChevronInside(menuId));
    row.appendChild(bubble); // first → visual RIGHT
    row.appendChild(_createMsgReactBtn(menuId)); // second → visual LEFT

    const time = document.createElement("div");
    time.className = "message-time";
    time.style.textAlign = "right";
    time.textContent = msg.time;

    group.appendChild(row);
    group.appendChild(_createMsgEmojiPopup(menuId));
    group.appendChild(_createMsgEmojiExpandedPicker(menuId));
    group.appendChild(_createMsgContextMenu(msg, menuId));
    group.appendChild(time);
  } else {
    group.className = "message-group-received";

    const row = document.createElement("div");
    row.className = "message-row";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble message-received";
    bubble.textContent = msg.text;
    // Chevron: inside bubble
    bubble.appendChild(_createMsgChevronInside(menuId));
    row.appendChild(bubble);

    // React emoji button: right of bubble for received messages
    row.appendChild(_createMsgReactBtn(menuId));

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = msg.time;

    group.appendChild(row);
    group.appendChild(_createMsgEmojiPopup(menuId));
    group.appendChild(_createMsgEmojiExpandedPicker(menuId));
    group.appendChild(_createMsgContextMenu(msg, menuId));
    group.appendChild(time);
  }

  return group;
}

function _createMsgReactBtn(menuId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "msg-react-btn";
  btn.setAttribute("aria-label", "React");
  btn.dataset.role = "react";
  btn.dataset.menu = menuId + "-emoji";
  btn.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<circle cx="12" cy="12" r="10"/>` +
    `<path d="M8 14s1.5 2 4 2 4-2 4-2"/>` +
    `<line x1="9" y1="9" x2="9.01" y2="9"/>` +
    `<line x1="15" y1="9" x2="15.01" y2="9"/>` +
    `</svg>`;
  return btn;
}

function _createMsgChevronInside(menuId) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "msg-chevron-inside";
  btn.setAttribute("aria-label", "Message options");
  btn.dataset.role = "menu";
  btn.dataset.menu = menuId;
  btn.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
    `<polyline points="6 9 12 15 18 9"/>` +
    `</svg>`;
  return btn;
}

function _createMsgEmojiPopup(menuId) {
  const popup = document.createElement("div");
  popup.className = "msg-emoji-popup";
  popup.id = menuId + "-emoji";
  popup.setAttribute("aria-hidden", "true");

  const row = document.createElement("div");
  row.className = "msg-emoji-row";
  ["👍", "❤️", "😂", "😮", "😢", "🙏"].forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "msg-emoji-pick";
    btn.textContent = emoji;
    btn.dataset.emoji = emoji;
    row.appendChild(btn);
  });
  const morePick = document.createElement("button");
  morePick.type = "button";
  morePick.className = "msg-emoji-pick msg-emoji-more";
  morePick.setAttribute("aria-label", "More reactions");
  morePick.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">` +
    `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>` +
    `</svg>`;
  row.appendChild(morePick);
  popup.appendChild(row);
  return popup;
}

function _createMsgEmojiExpandedPicker(menuId) {
  const EMOJIS = [
    "😀","😂","😍","🤗","😎",
    "🤩","😜","🙄","😭","😤",
    "🎉","🔥","💯","✅","🚀",
    "💪","👏","🙌","🤝","🥰",
    "⭐","💫","😊","🥳","🤑",
  ];
  const picker = document.createElement("div");
  picker.className = "msg-emoji-expanded";
  picker.id = menuId + "-expanded";
  picker.setAttribute("aria-hidden", "true");
  const grid = document.createElement("div");
  grid.className = "msg-emoji-expanded-grid";
  EMOJIS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "msg-emoji-pick";
    btn.textContent = emoji;
    btn.dataset.emoji = emoji;
    grid.appendChild(btn);
  });
  picker.appendChild(grid);
  return picker;
}

function _createMsgContextMenu(msg, menuId) {
  const menu = document.createElement("div");
  menu.className = "msg-context-menu";
  menu.id = menuId;
  menu.setAttribute("aria-hidden", "true");

  const isSent = msg.from === "me";

  // Action items list
  const actions = [
    ...(isSent ? [{ action: "info", label: "Message info", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` }] : []),
    { action: "reply",   label: "Reply",         icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>` },
    { action: "copy",    label: "Copy",           icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>` },
    { action: "forward", label: "Forward",        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>` },
    { action: "pin",     label: "Pin",            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>` },
    { action: "star",    label: "Star",           icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
    { action: "select",  label: "Select",         icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>` },
    ...(!isSent ? [{ action: "report", label: "Report", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` }] : []),
  ];
  actions.forEach(({ action, label, icon }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "msg-context-item";
    btn.dataset.action = action;
    btn.dataset.msgId = msg.id;
    btn.dataset.msgText = msg.text;
    btn.innerHTML = icon + `<span>${_esc(label)}</span>`;
    menu.appendChild(btn);
  });

  const sep = document.createElement("div");
  sep.className = "msg-context-separator";
  menu.appendChild(sep);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "msg-context-item msg-context-danger";
  delBtn.dataset.action = "delete";
  delBtn.dataset.msgId = msg.id;
  delBtn.innerHTML =
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>` +
    `<span>Delete</span>`;
  menu.appendChild(delBtn);

  return menu;
}

// ── Input area ─────────────────────────────────────────────────
function _initInputArea() {
  const input = document.getElementById("message-input");
  const sendBtn = document.querySelector(".send-btn");
  const emojiBtn = document.querySelector('[aria-label="Emoji"]');
  const attachBtn = document.querySelector('[aria-label="Add attachment"]');
  const voiceBtn = document.querySelector('[aria-label="Voice note"]');
  const cameraBtn = document.querySelector('[aria-label="Camera"]');
  if (!input || !sendBtn) return;

  // Toggle mic/send button based on content
  input.addEventListener("input", () => {
    const hasText = input.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    sendBtn.style.display = hasText ? "flex" : "none";
    if (voiceBtn) voiceBtn.style.display = hasText ? "none" : "flex";
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
  cameraBtn?.addEventListener("click", () =>
    showToast("Camera is not available in demo mode.", "info"),
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
  const voiceBtn2 = document.querySelector('[aria-label="Voice note"]');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.display = "none";
  }
  if (voiceBtn2) voiceBtn2.style.display = "flex";

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
    row.className = "message-row";

    const indicator = document.createElement("div");
    indicator.className = "typing-indicator";
    indicator.innerHTML = "<span></span><span></span><span></span>";

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
  const callBtn = document.querySelector('[aria-label="Call"]');
  const callDropdown = document.getElementById("call-dropdown");

  if (callBtn && callDropdown) {
    callBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = callDropdown.classList.contains("open");
      callDropdown.classList.toggle("open", !isOpen);
      callDropdown.setAttribute("aria-hidden", String(isOpen));
      callBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    callDropdown.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-call]");
      if (!btn) return;
      e.stopPropagation();
      const action = btn.dataset.call;
      const msgs = {
        voice: "Voice call: not available in demo mode.",
        video: "Video call: not available in demo mode.",
        group: "New group call: coming soon.",
        link: "Call link: coming soon.",
        schedule: "Schedule a call: coming soon.",
      };
      showToast(msgs[action] || "Coming soon.", "info");
      callDropdown.classList.remove("open");
      callDropdown.setAttribute("aria-hidden", "true");
      callBtn.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".call-btn-wrapper")) {
        callDropdown.classList.remove("open");
        callDropdown.setAttribute("aria-hidden", "true");
        callBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

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

  // Mobile bottom tab bar
  const mobileLabels = { calls: "Calls", community: "Community", updates: "Updates" };
  document.querySelectorAll(".mobile-tab-item[data-tab]").forEach((item) => {
    const tab = item.dataset.tab;
    if (tab !== "chats" && tab !== "you") {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        showToast(`${mobileLabels[tab] ?? tab}: coming soon.`, "info");
      });
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

// ── Contact Info Panel ──────────────────────────────────────────
function _updateContactPanel(contactId) {
  const conv = conversations[contactId];
  if (!conv) return;
  const el = (id) => document.getElementById(id);
  const av = el("cip-avatar");
  const nameEl = el("cip-name");
  const subEl = el("cip-sub");
  if (av) {
    av.style.background = conv.contact.gradient;
    av.textContent = conv.contact.initials;
  }
  if (nameEl) nameEl.textContent = conv.contact.displayName;
  if (subEl) subEl.textContent = conv.contact.role || "";
  const mediaCountEl = el("cip-media-count");
  if (mediaCountEl) mediaCountEl.textContent = conv.messages.length;
}

function _initContactPanel() {
  const panel = document.getElementById("contact-info-panel");
  if (!panel) return;

  const openPanel = () => {
    _updateContactPanel(activeContactId);
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  };
  const closePanel = () => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  };

  document.getElementById("contact-info-trigger")?.addEventListener("click", openPanel);
  document.getElementById("cip-back-btn")?.addEventListener("click", closePanel);
  document.getElementById("cip-edit-btn")?.addEventListener("click", () =>
    showToast("Edit contact: coming soon.", "info"),
  );
  document.getElementById("cip-call-btn")?.addEventListener("click", () =>
    showToast("Voice call is not available in demo mode.", "info"),
  );
  document.getElementById("cip-video-btn")?.addEventListener("click", () =>
    showToast("Video call is not available in demo mode.", "info"),
  );
  document.getElementById("cip-search-btn")?.addEventListener("click", () =>
    showToast("In-chat search: coming soon.", "info"),
  );
  document.getElementById("cip-block-btn")?.addEventListener("click", () =>
    showToast("Block contact: coming soon.", "info"),
  );
  document.getElementById("cip-media-row")?.addEventListener("click", () =>
    showToast("Media: coming soon.", "info"),
  );
  document.getElementById("cip-important-row")?.addEventListener("click", () =>
    showToast("Important messages: coming soon.", "info"),
  );
  panel.querySelectorAll(".cip-row:not(#cip-media-row):not(#cip-important-row)").forEach((row) => {
    row.addEventListener("click", () => showToast("Coming soon.", "info"));
  });
}

// ── Message hover actions & context menu ───────────────────────
function _openMenu(menu, triggerEl) {
  const group = menu.parentElement;
  if (!group) return;

  const groupRect = group.getBoundingClientRect();
  const triggerRect = triggerEl.getBoundingClientRect();
  const isEmojiPopup = menu.classList.contains("msg-emoji-popup");
  const isExpanded = menu.classList.contains("msg-emoji-expanded");
  const estimatedH = isEmojiPopup ? 64 : isExpanded ? 220 : 370;

  menu.style.top = "";
  menu.style.bottom = "";

  if (triggerRect.top > estimatedH) {
    // Enough space above: anchor bottom of menu to top of trigger
    menu.style.bottom = (groupRect.bottom - triggerRect.top + 6) + "px";
  } else {
    // Not enough: anchor top of menu to bottom of trigger
    menu.style.top = (triggerRect.bottom - groupRect.top + 6) + "px";
  }

  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
}

function _initStaticMessageMenus() {
  // Inject emoji popups + context menus for pre-rendered static messages
  document.querySelectorAll(".message-group-received, .message-group-sent").forEach((group) => {
    const chevron = group.querySelector(".msg-chevron-inside");
    const reactBtn = group.querySelector(".msg-react-btn");
    if (!chevron || !reactBtn) return;

    const menuId = chevron.dataset.menu;
    if (!menuId || document.getElementById(menuId)) return; // already injected

    const isSent = group.classList.contains("message-group-sent");
    const fakeMsg = { id: menuId, from: isSent ? "me" : "other", text: "" };
    group.insertBefore(_createMsgEmojiPopup(menuId), group.querySelector(".message-time"));
    group.insertBefore(_createMsgEmojiExpandedPicker(menuId), group.querySelector(".message-time"));
    group.insertBefore(_createMsgContextMenu(fakeMsg, menuId), group.querySelector(".message-time"));

    // Redirect react btn to the emoji popup
    reactBtn.dataset.menu = menuId + "-emoji";
  });
}

function _initMessageActions() {
  const area = document.getElementById("chat-messages");
  if (!area) return;

  area.addEventListener("click", (e) => {
    const actionBtn = e.target.closest(".msg-react-btn, .msg-chevron-inside");
    const menuEl = e.target.closest(".msg-context-menu");
    const emojiPick = e.target.closest(".msg-emoji-pick");
    const contextItem = e.target.closest(".msg-context-item");

    // Tapped a hover action button (react emoji OR chevron) — toggle menu
    if (actionBtn) {
      e.stopPropagation();
      const menuId = actionBtn.dataset.menu;
      const menu = menuId ? document.getElementById(menuId) : null;
      if (!menu) return;
      const isOpen = menu.classList.contains("open");
      _closeAllMsgMenus();
      if (!isOpen) {
        _openMenu(menu, actionBtn);
      }
      return;
    }

    // Tapped an emoji reaction
    if (emojiPick) {
      e.stopPropagation();
      const emoji = emojiPick.dataset.emoji;
      if (!emoji) {
        // "+" button — open expanded emoji picker
        const miniPopup = emojiPick.closest(".msg-emoji-popup");
        if (miniPopup) {
          const baseId = miniPopup.id.replace("-emoji", "");
          const expanded = document.getElementById(baseId + "-expanded");
          if (expanded) {
            _closeAllMsgMenus();
            _openMenu(expanded, emojiPick);
          }
        }
        return;
      }
      const popup = emojiPick.closest(".msg-emoji-popup, .msg-emoji-expanded");
      const group = popup ? popup.closest(".message-group-received, .message-group-sent") : null;
      if (group) {
        let strip = group.querySelector(".msg-reaction-strip");
        const existing = strip ? strip.querySelector("[data-emoji]") : null;
        if (existing && existing.dataset.emoji === emoji) {
          strip.remove();
        } else {
          if (!strip) {
            strip = document.createElement("div");
            strip.className = "msg-reaction-strip";
            const row = group.querySelector(".message-row");
            row ? row.after(strip) : group.appendChild(strip);
          } else {
            strip.innerHTML = "";
          }
          const badge = document.createElement("div");
          badge.className = "msg-reaction-badge";
          badge.dataset.emoji = emoji;
          badge.textContent = emoji;
          strip.appendChild(badge);
        }
      }
      _closeAllMsgMenus();
      return;
    }

    // Tapped a context-menu action item
    if (contextItem) {
      e.stopPropagation();
      _handleMsgAction(contextItem.dataset.action, contextItem.dataset.msgText || "");
      _closeAllMsgMenus();
      return;
    }

    // Tapped inside open menu but not on a button — keep open
    if (menuEl || e.target.closest(".msg-emoji-popup") || e.target.closest(".msg-emoji-expanded")) {
      e.stopPropagation();
      return;
    }
  });

  // Close all open menus when clicking anywhere outside
  document.addEventListener("click", () => _closeAllMsgMenus());
}

function _closeAllMsgMenus() {
  document.querySelectorAll(".msg-context-menu.open, .msg-emoji-popup.open, .msg-emoji-expanded.open").forEach((m) => {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    m.style.top = "";
    m.style.bottom = "";
  });
}

function _handleMsgAction(action, text) {
  switch (action) {
    case "copy":
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Messaggio copiato.", "success"))
        .catch(() => showToast("Impossibile copiare il messaggio.", "error"));
      break;
    case "reply":    showToast("Rispondi: presto disponibile.", "info");           break;
    case "forward":  showToast("Inoltra: presto disponibile.", "info");             break;
    case "pin":      showToast("Messaggio fissato.", "success");                    break;
    case "star":     showToast("Aggiunto ai messaggi importanti.", "success");      break;
    case "select":   showToast("Seleziona: presto disponibile.", "info");           break;
    case "info":     showToast("Info messaggio: presto disponibile.", "info");      break;
    case "report":   showToast("Messaggio segnalato.", "info");                     break;
    case "delete":   showToast("Messaggio eliminato.", "info");                     break;
    default:         showToast("Presto disponibile.", "info");
  }
}
