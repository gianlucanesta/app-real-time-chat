import { getAccessToken, getCurrentUserAny, apiLogout, apiFetch, refreshTokenIfNeeded } from "../auth.js";
import { showToast } from "../ui/toast.js";
import { debounce } from "../utils.js";

// ── API / Socket.io configuration ─────────────────────────────────────────────
// Mirrors USE_API in auth.js — set both to false for the offline static demo.
const USE_API = true;
const SERVER_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://app-real-time-chat-backend.onrender.com";

/** @type {import('socket.io-client').Socket|null} */
let _socket = null;

// ── Module state ───────────────────────────────────────────────
let activeContactId = null;
let activeFilterType = "all";
const conversations = {};

// Call screen opener — assigned by _initCallScreen
let _openCall = () => {};

// ── Entry point ────────────────────────────────────────────────
export function initChatPage() {
  _loadUserProfile();
  _renderConversationList();
  _initSearch();
  _initInputArea();
  _initMessageActions();
  _initStaticMessageMenus();
  _initNewChatPanel();
  _initNewContactPanel();
  _initFilterChips();
  _initSidebarMenu();
  _initHeaderActions();
  _initContactPanel();
  _initMobileSidebar();
  _initNavBar();
  _initCallScreen();
  _initEmptyStateActions();
  if (USE_API) _initSocket();
  if (USE_API) _loadContactsFromAPI();
}

// ── User profile ───────────────────────────────────────────────
function _loadUserProfile() {
  const user = getCurrentUserAny();
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
  // Leave previous room, join new one so we receive messages for this convo
  if (_socket?.connected) {
    if (activeContactId && activeContactId !== contactId) {
      _socket.emit("leave:conversation", activeContactId);
    }
    _socket.emit("join:conversation", contactId);
  }

  activeContactId = contactId;
  const conv = conversations[contactId];
  if (!conv) return;

  // Show chat UI, hide empty state
  document.querySelector(".chat-page")?.classList.add("has-chat");

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

  // Load message history from API if not yet loaded
  if (USE_API) _loadMessagesFromAPI(contactId);

  // Mark all unread incoming messages as "read" — the user just opened this chat
  if (_socket?.connected && conv.messages.length) {
    const unreadIds = conv.messages
      .filter((m) => m.from === "them" && !m._readSent)
      .map((m) => { m._readSent = true; return m.id; })
      .filter(Boolean);
    if (unreadIds.length) {
      _socket.emit("message:read", { messageIds: unreadIds, conversationId: contactId });
    }
  }
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
    group.dataset.msgId = msg.id;

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
    time.innerHTML = _esc(msg.time) + _statusTickHTML(msg.status || "sending");

    group.appendChild(row);
    group.appendChild(_createMsgEmojiPopup(menuId));
    group.appendChild(_createMsgEmojiExpandedPicker(menuId));
    group.appendChild(_createMsgContextMenu(msg, menuId));
    group.appendChild(time);
  } else {
    group.className = "message-group-received";
    group.dataset.msgId = msg.id;

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
    "😀",
    "😂",
    "😍",
    "🤗",
    "😎",
    "🤩",
    "😜",
    "🙄",
    "😭",
    "😤",
    "🎉",
    "🔥",
    "💯",
    "✅",
    "🚀",
    "💪",
    "👏",
    "🙌",
    "🤝",
    "🥰",
    "⭐",
    "💫",
    "😊",
    "🥳",
    "🤑",
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
    ...(isSent
      ? [
          {
            action: "info",
            label: "Message info",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
          },
        ]
      : []),
    {
      action: "reply",
      label: "Reply",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>`,
    },
    {
      action: "copy",
      label: "Copy",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    },
    {
      action: "forward",
      label: "Forward",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>`,
    },
    {
      action: "pin",
      label: "Pin",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>`,
    },
    {
      action: "star",
      label: "Star",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    },
    {
      action: "select",
      label: "Select",
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    },
    ...(!isSent
      ? [
          {
            action: "report",
            label: "Report",
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
          },
        ]
      : []),
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

  // Reset input UI immediately
  input.value = "";
  const sendBtn = document.querySelector(".send-btn");
  const voiceBtn2 = document.querySelector('[aria-label="Voice note"]');
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.style.display = "none";
  }
  if (voiceBtn2) voiceBtn2.style.display = "flex";

  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const tempId = "tmp_" + Date.now();

  // Optimistic message entry — appears immediately as "sending"
  const msg = { id: tempId, from: "me", text, time, status: "sending" };

  const conv = conversations[activeContactId];
  if (conv) {
    conv.messages.push(msg);
    conv.lastMessage = text.slice(0, 30) + (text.length > 30 ? "…" : "");
    conv.lastTime = time;
  }

  // Render immediately
  const area = document.getElementById("chat-messages");
  if (area) {
    area.appendChild(_createMessageEl(msg));
    area.scrollTop = area.scrollHeight;
  }
  _renderConversationList(document.getElementById("sidebar-search")?.value || "");

  if (USE_API && _socket?.connected) {
    // Emit with acknowledgement — server replies { ok, messageId }
    const convId = activeContactId;
    _socket.emit("message:send", { conversationId: convId, text }, (ackData) => {
      if (ackData?.ok && ackData.messageId) {
        // Update the temp message to "sent" with the real MongoDB _id
        msg.id = ackData.messageId;
        msg.status = "sent";
        _updateMsgStatusDOM(tempId, "sent", ackData.messageId);
      }
    });
  }
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
      callDropdown.classList.remove("open");
      callDropdown.setAttribute("aria-hidden", "true");
      callBtn.setAttribute("aria-expanded", "false");
      if (action === "voice" || action === "video") {
        _openCall();
        return;
      }
      const msgs = {
        group: "New group call: coming soon.",
        link: "Call link: coming soon.",
        schedule: "Schedule a call: coming soon.",
      };
      showToast(msgs[action] || "Coming soon.", "info");
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".call-btn-wrapper")) {
        callDropdown.classList.remove("open");
        callDropdown.setAttribute("aria-hidden", "true");
        callBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ── More options dropdown (chat header) ──
  const moreBtn = document.querySelector('.chat-header-actions [aria-controls="more-dropdown"]');
  const moreDropdown = document.getElementById("more-dropdown");
  if (moreBtn && moreDropdown) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = moreDropdown.classList.contains("open");
      moreDropdown.classList.toggle("open", !isOpen);
      moreDropdown.setAttribute("aria-hidden", String(isOpen));
      moreBtn.setAttribute("aria-expanded", String(!isOpen));
    });
    moreDropdown.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-more]");
      if (!btn) return;
      e.stopPropagation();
      moreDropdown.classList.remove("open");
      moreDropdown.setAttribute("aria-hidden", "true");
      moreBtn.setAttribute("aria-expanded", "false");
      const action = btn.dataset.more;
      if (action === "contact-info") {
        document.getElementById("contact-info-trigger")?.click();
        return;
      }
      const labels = {
        "select-messages": "Select messages: coming soon.",
        mute: "Mute notifications: coming soon.",
        disappearing: "Disappearing messages: coming soon.",
        favorites: "Added to favorites.",
        "add-to-list": "Add to list: coming soon.",
        "close-chat": "Chat closed.",
        report: "Report: coming soon.",
        block: "Block: coming soon.",
        "clear-chat": "Clear chat: coming soon.",
        "delete-chat": "Delete chat: coming soon.",
      };
      showToast(labels[action] || "Coming soon.", "info");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".more-btn-wrapper")) {
        moreDropdown.classList.remove("open");
        moreDropdown.setAttribute("aria-hidden", "true");
        moreBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
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
  document
    .getElementById("new-chat-back-btn")
    ?.addEventListener("click", closePanel);

  document.getElementById("new-chat-search")?.addEventListener(
    "input",
    debounce((e) => _renderNewChatContactList(e.target.value)),
  );

  document
    .getElementById("new-chat-options-btn")
    ?.addEventListener("click", () =>
      showToast("Options: coming soon.", "info"),
    );

  panel.querySelectorAll(".new-chat-action-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.ncAction;
      if (action === "contact") {
        const ncp = document.getElementById("new-contact-panel");
        if (ncp) {
          ncp.classList.add("open");
          ncp.setAttribute("aria-hidden", "false");
          document.getElementById("ncp-firstname")?.focus();
        }
        return;
      }
      const labels = {
        group: "New group",
        community: "New community",
      };
      showToast(`${labels[action] ?? "Action"}: coming soon.`, "info");
    });
  });

  _renderNewChatContactList("");
}

// ── New-contact panel ────────────────────────────────────────────
function _initNewContactPanel() {
  const panel = document.getElementById("new-contact-panel");
  if (!panel) return;

  // ── Avatar live-initials ──────────────────────────────────────
  const _updateAvatar = () => {
    const first =
      document.getElementById("ncp-firstname")?.value.trim() ?? "";
    const last = document.getElementById("ncp-lastname")?.value.trim() ?? "";
    const icon = document.getElementById("ncp-avatar-icon");
    const initialsEl = document.getElementById("ncp-avatar-initials");
    if (!icon || !initialsEl) return;
    const text = [first.charAt(0), last.charAt(0)]
      .filter(Boolean)
      .join("")
      .toUpperCase();
    if (text) {
      icon.style.display = "none";
      initialsEl.style.display = "";
      initialsEl.textContent = text;
    } else {
      icon.style.display = "";
      initialsEl.style.display = "none";
    }
  };

  // ── Inline validation helpers ─────────────────────────────────
  const _setFieldError = (fieldId, errorId, message) => {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(errorId);
    if (!field || !err) return;
    field.classList.add("ncp-invalid");
    err.textContent = message;
    err.classList.add("visible");
    // shake the parent row
    const row = field.closest(".ecp-field-row");
    if (row) {
      row.classList.remove("ncp-shake");
      // force reflow to restart animation
      void row.offsetWidth;
      row.classList.add("ncp-shake");
      row.addEventListener("animationend", () => row.classList.remove("ncp-shake"), { once: true });
    }
  };

  const _clearFieldError = (fieldId, errorId) => {
    const field = document.getElementById(fieldId);
    const err = document.getElementById(errorId);
    if (field) field.classList.remove("ncp-invalid");
    if (err) { err.textContent = ""; err.classList.remove("visible"); }
  };

  // ── Phone lookup ──────────────────────────────────────────────
  const _setPhoneStatus = (state, text) => {
    const el = document.getElementById("ncp-phone-status");
    if (!el) return;
    el.className = "ncp-phone-status";
    if (!state) return; // hide
    const icons = {
      checking: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
      found:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
      "not-found": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    el.innerHTML = (icons[state] ?? "") + `<span>${text}</span>`;
    el.classList.add(`status-${state}`, "visible");
  };

  const _lookupPhone = debounce(async (phone) => {
    if (!phone || phone.replace(/\D/g, "").length < 5) {
      _setPhoneStatus(null);
      return;
    }
    const country = document.getElementById("ncp-country")?.value ?? "";
    const full = country + phone.replace(/\s/g, "");
    _setPhoneStatus("checking", "Checking…");
    const token = getAccessToken();
    if (!USE_API || !token) {
      _setPhoneStatus(null);
      return;
    }
    try {
      const res = await fetch(
        `${SERVER_URL}/api/users/lookup-phone?phone=${encodeURIComponent(full)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) { _setPhoneStatus(null); return; }
      const data = await res.json();
      if (data.found) {
        _setPhoneStatus("found", `On Ephemeral — can start chatting`);
      } else {
        _setPhoneStatus("not-found", "Not on Ephemeral — contact saved locally");
      }
    } catch {
      _setPhoneStatus(null);
    }
  }, 600);

  // ── Reset ─────────────────────────────────────────────────────
  const _resetPanel = () => {
    ["ncp-firstname", "ncp-lastname", "ncp-phone"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const syncEl = document.getElementById("ncp-sync");
    if (syncEl) syncEl.checked = false;
    _clearFieldError("ncp-field-firstname", "ncp-error-firstname");
    _clearFieldError("ncp-field-phone", "ncp-error-phone");
    _setPhoneStatus(null);
    _updateAvatar();
  };

  const closePanel = () => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  };

  // ── Event listeners ───────────────────────────────────────────
  document.getElementById("ncp-firstname")?.addEventListener("input", () => {
    _updateAvatar();
    const val = document.getElementById("ncp-firstname")?.value.trim();
    if (val) _clearFieldError("ncp-field-firstname", "ncp-error-firstname");
  });
  document
    .getElementById("ncp-lastname")
    ?.addEventListener("input", _updateAvatar);

  document.getElementById("ncp-phone")?.addEventListener("input", (e) => {
    const val = e.target.value.trim();
    if (val) _clearFieldError("ncp-field-phone", "ncp-error-phone");
    _lookupPhone(val);
  });
  document.getElementById("ncp-country")?.addEventListener("change", () => {
    const phone = document.getElementById("ncp-phone")?.value.trim();
    if (phone) _lookupPhone(phone);
  });

  document
    .getElementById("ncp-photo-btn")
    ?.addEventListener("click", () =>
      showToast("Photo upload: coming soon.", "info"),
    );

  document
    .getElementById("new-contact-back-btn")
    ?.addEventListener("click", closePanel);

  // ── Save ──────────────────────────────────────────────────────
  document
    .getElementById("new-contact-save-btn")
    ?.addEventListener("click", async () => {
      const first = document.getElementById("ncp-firstname")?.value.trim();
      const phone = document.getElementById("ncp-phone")?.value.trim();

      let hasError = false;
      if (!first) {
        _setFieldError("ncp-field-firstname", "ncp-error-firstname", "First name is required.");
        hasError = true;
      }
      if (!phone) {
        _setFieldError("ncp-field-phone", "ncp-error-phone", "Phone number is required.");
        hasError = true;
      }
      if (hasError) return;

      const last = document.getElementById("ncp-lastname")?.value.trim();
      const country = document.getElementById("ncp-country")?.value ?? "";
      const phoneRaw = document.getElementById("ncp-phone")?.value.trim();
      const fullName = [first, last].filter(Boolean).join(" ");
      const initials = [first.charAt(0), last ? last.charAt(0) : ""]
        .filter(Boolean)
        .join("")
        .toUpperCase();

      // Pick a deterministic gradient from the first character
      const gradients = [
        "linear-gradient(135deg,#2563EB,#7C3AED)",
        "linear-gradient(135deg,#ec4899,#f97316)",
        "linear-gradient(135deg,#10b981,#3b82f6)",
        "linear-gradient(135deg,#f59e0b,#ef4444)",
        "linear-gradient(135deg,#8b5cf6,#06b6d4)",
      ];
      const gradient = gradients[first.charCodeAt(0) % gradients.length];

      // Persist contact to backend and derive a deterministic conversation ID
      const saveBtn = document.getElementById("new-contact-save-btn");
      if (saveBtn) saveBtn.disabled = true;

      let linkedUserId = null;
      let dbId = null;
      if (USE_API) {
        try {
          const res = await apiFetch(`${SERVER_URL}/api/contacts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              displayName: fullName,
              phone: country + phoneRaw,
              initials,
              gradient,
            }),
          });
          if (res && res.ok) {
            const data = await res.json();
            linkedUserId = data.contact?.linked_user_id ?? null;
            dbId = data.contact?.id ?? null;
            // If the phone resolved to a registered user, use their real profile
            // name/initials instead of the manually typed alias.
            if (data.contact?.linked_display_name) {
              fullName = data.contact.linked_display_name;
              initials = data.contact.linked_initials || initials;
            }
          }
        } catch { /* network error — fall back to local ID */ }
      }

      if (saveBtn) saveBtn.disabled = false;

      // Use a deterministic pair-ID so both parties share the same room.
      // Falls back to db row ID, then a local timestamp.
      const myId = _getCurrentUserId();
      const convId =
        myId && linkedUserId
          ? _pairId(myId, linkedUserId)
          : linkedUserId || dbId || "local_" + Date.now();

      conversations[convId] = {
        contact: {
          id: linkedUserId || dbId || convId,
          displayName: fullName,
          initials,
          gradient,
          online: false,
          role: "",
          phone: country + phoneRaw,
        },
        unread: 0,
        lastTime: "",
        lastMessage: "",
        messages: [],
      };

      _resetPanel();

      // Close new-contact-panel
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");

      // Also close new-chat-panel
      const newChatPanel = document.getElementById("new-chat-panel");
      newChatPanel?.classList.remove("open");
      newChatPanel?.setAttribute("aria-hidden", "true");

      // Refresh sidebar and open the new conversation
      _renderConversationList();
      _selectConversation(convId);

      // On mobile, collapse sidebar
      const sidebar = document.getElementById("sidebar");
      if (sidebar) sidebar.classList.add("hidden");

      showToast(`Contact "${fullName}" saved!`, "success");
    });
}

async function _renderNewChatContactList(filter = "") {
  const list = document.getElementById("new-chat-contact-list");
  if (!list) return;

  const lFilter = filter.trim();

  if (lFilter.length < 2) {
    list.innerHTML = `
      <div class="new-chat-empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <p>Type at least 2 characters<br>to search for people</p>
      </div>`;
    return;
  }

  list.innerHTML = `<p class="new-chat-empty-hint">Searching…</p>`;

  let users = [];
  if (USE_API) {
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${SERVER_URL}/api/users/search?q=${encodeURIComponent(lFilter)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        users = data.users || [];
      }
    } catch {
      list.innerHTML = `<p class="new-chat-empty-hint">Could not load users.</p>`;
      return;
    }
  }

  if (!users.length) {
    list.innerHTML = `<p class="new-chat-empty-hint">No users found.</p>`;
    return;
  }

  list.innerHTML = "";
  // Normalise API field names (snake_case) to the internal camelCase shape
  const normalised = users.map((u) => ({
    id: u.id,
    displayName: u.display_name ?? u.displayName ?? "",
    initials: u.initials ?? "",
    role: u.role ?? "",
    gradient:
      u.avatar_gradient ??
      u.gradient ??
      "linear-gradient(135deg,#2563EB,#7C3AED)",
    online: false,
    email: u.email ?? "",
  }));

  normalised.forEach((user) => {
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

      // Use a deterministic pair-ID shared by both users
      const myId = _getCurrentUserId();
      const convId = myId ? _pairId(myId, user.id) : user.id;

      if (!conversations[convId]) {
        conversations[convId] = {
          contact: { ...user },
          unread: 0,
          lastTime: "",
          lastMessage: "",
          messages: [],
        };
      }
      _selectConversation(convId);
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
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
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
        apiLogout();
        window.location.replace("index.html");
        return;
      }
      const labels = {
        "new-group": "New group",
        important: "Important messages",
        select: "Select chat",
        "mark-read": "Mark all as read",
      };
      showToast(`${labels[action] ?? "Action"}: coming soon.`, "info");
    });
  });
}

// ── Left nav bar ──────────────────────────────────────────────
function _initNavBar() {
  const labels = {
    calls: "Calls",
    communities: "Communities",
    status: "Status",
    starred: "Starred",
    archived: "Archived",
  };
  document.querySelectorAll(".chat-nav-item[data-nav]").forEach((btn) => {
    const key = btn.dataset.nav;
    if (key && key !== "chats") {
      btn.addEventListener("click", () =>
        showToast(`${labels[key] ?? key}: coming soon.`, "info"),
      );
    }
  });

  // Mobile bottom tab bar
  const mobileLabels = {
    calls: "Calls",
    community: "Community",
    updates: "Updates",
  };
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

// ── Empty state quick-action buttons ──────────────────────────
function _initEmptyStateActions() {
  document.getElementById("empty-new-contact-btn")?.addEventListener("click", () => {
    document.getElementById("new-chat-btn")?.click();
  });
  document.getElementById("empty-new-group-btn")?.addEventListener("click", () => {
    showToast("New group: coming soon.", "info");
  });
  document.getElementById("empty-settings-btn")?.addEventListener("click", () => {
    window.location.href = "settings.html";
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

  document
    .getElementById("contact-info-trigger")
    ?.addEventListener("click", openPanel);
  document
    .getElementById("cip-back-btn")
    ?.addEventListener("click", closePanel);
  const editPanel = document.getElementById("edit-contact-panel");
  const openEditPanel = () => {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    editPanel?.classList.add("open");
    editPanel?.setAttribute("aria-hidden", "false");
  };
  const closeEditPanel = () => {
    editPanel?.classList.remove("open");
    editPanel?.setAttribute("aria-hidden", "true");
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  };
  document
    .getElementById("cip-edit-btn")
    ?.addEventListener("click", openEditPanel);
  document
    .getElementById("ecp-back-btn")
    ?.addEventListener("click", closeEditPanel);
  document.getElementById("ecp-save-btn")?.addEventListener("click", () => {
    showToast("Contact saved.", "success");
    closeEditPanel();
  });
  document
    .getElementById("ecp-delete-btn")
    ?.addEventListener("click", () =>
      showToast("Delete contact: coming soon.", "info"),
    );
  document
    .getElementById("cip-call-btn")
    ?.addEventListener("click", () => _openCall());
  document
    .getElementById("cip-video-btn")
    ?.addEventListener("click", () => _openCall());
  document
    .getElementById("cip-search-btn")
    ?.addEventListener("click", () =>
      showToast("In-chat search: coming soon.", "info"),
    );
  document
    .getElementById("cip-block-btn")
    ?.addEventListener("click", () =>
      showToast("Block contact: coming soon.", "info"),
    );
  document
    .getElementById("cip-media-row")
    ?.addEventListener("click", () => showToast("Media: coming soon.", "info"));
  document
    .getElementById("cip-important-row")
    ?.addEventListener("click", () =>
      showToast("Important messages: coming soon.", "info"),
    );
  panel
    .querySelectorAll(".cip-row:not(#cip-media-row):not(#cip-important-row)")
    .forEach((row) => {
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
    menu.style.bottom = groupRect.bottom - triggerRect.top + 6 + "px";
  } else {
    // Not enough: anchor top of menu to bottom of trigger
    menu.style.top = triggerRect.bottom - groupRect.top + 6 + "px";
  }

  menu.classList.add("open");
  menu.setAttribute("aria-hidden", "false");
}

function _initStaticMessageMenus() {
  // Inject emoji popups + context menus for pre-rendered static messages
  document
    .querySelectorAll(".message-group-received, .message-group-sent")
    .forEach((group) => {
      const chevron = group.querySelector(".msg-chevron-inside");
      const reactBtn = group.querySelector(".msg-react-btn");
      if (!chevron || !reactBtn) return;

      const menuId = chevron.dataset.menu;
      if (!menuId || document.getElementById(menuId)) return; // already injected

      const isSent = group.classList.contains("message-group-sent");
      const fakeMsg = { id: menuId, from: isSent ? "me" : "other", text: "" };
      group.insertBefore(
        _createMsgEmojiPopup(menuId),
        group.querySelector(".message-time"),
      );
      group.insertBefore(
        _createMsgEmojiExpandedPicker(menuId),
        group.querySelector(".message-time"),
      );
      group.insertBefore(
        _createMsgContextMenu(fakeMsg, menuId),
        group.querySelector(".message-time"),
      );

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
            // Anchor to the message row (bubble), not the tiny + inside the popup
            const grp = miniPopup.parentElement;
            const anchor = grp
              ? grp.querySelector(".message-row") || grp
              : emojiPick;
            _openMenu(expanded, anchor);
          }
        }
        return;
      }
      const popup = emojiPick.closest(".msg-emoji-popup, .msg-emoji-expanded");
      const group = popup
        ? popup.closest(".message-group-received, .message-group-sent")
        : null;
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
      _handleMsgAction(
        contextItem.dataset.action,
        contextItem.dataset.msgText || "",
      );
      _closeAllMsgMenus();
      return;
    }

    // Tapped inside open menu but not on a button — keep open
    if (
      menuEl ||
      e.target.closest(".msg-emoji-popup") ||
      e.target.closest(".msg-emoji-expanded")
    ) {
      e.stopPropagation();
      return;
    }
  });

  // Close all open menus when clicking anywhere outside
  document.addEventListener("click", () => _closeAllMsgMenus());
}

function _closeAllMsgMenus() {
  document
    .querySelectorAll(
      ".msg-context-menu.open, .msg-emoji-popup.open, .msg-emoji-expanded.open",
    )
    .forEach((m) => {
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
        .then(() => showToast("Message copied.", "success"))
        .catch(() => showToast("Could not copy message.", "error"));
      break;
    case "reply":
      showToast("Reply: coming soon.", "info");
      break;
    case "forward":
      showToast("Forward: coming soon.", "info");
      break;
    case "pin":
      showToast("Message pinned.", "success");
      break;
    case "star":
      showToast("Added to starred messages.", "success");
      break;
    case "select":
      showToast("Select: coming soon.", "info");
      break;
    case "info":
      showToast("Message info: coming soon.", "info");
      break;
    case "report":
      showToast("Message reported.", "info");
      break;
    case "delete":
      showToast("Message deleted.", "info");
      break;
    default:
      showToast("Coming soon.", "info");
  }
}

// ── Call Screen ────────────────────────────────────────────────
function _initCallScreen() {
  const screen = document.getElementById("call-screen");
  if (!screen) return;

  let timerInterval = null;
  let elapsed = 0;

  const fmt = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const openCall = () => {
    // pull name + initials from the active contact panel (already populated)
    const name =
      document.querySelector(".chat-contact-name")?.textContent || "Unknown";
    const initials = document.getElementById("cip-avatar")?.textContent || "?";
    const avatarEl = document.getElementById("call-screen-avatar");
    const nameEl = document.getElementById("call-screen-name");
    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = name;
    // reset timer
    elapsed = 0;
    const timerEl = document.getElementById("call-timer");
    if (timerEl) timerEl.textContent = "00:00";
    // show screen
    screen.classList.add("open");
    screen.setAttribute("aria-hidden", "false");
    timerInterval = setInterval(() => {
      elapsed++;
      if (timerEl) timerEl.textContent = fmt(elapsed);
    }, 1000);
  };

  const closeCall = () => {
    screen.classList.remove("open");
    screen.setAttribute("aria-hidden", "true");
    clearInterval(timerInterval);
    timerInterval = null;
    elapsed = 0;
  };

  // expose to module
  _openCall = openCall;

  // End call (desktop bar + mobile floating button)
  document.getElementById("call-end-btn")?.addEventListener("click", closeCall);
  document
    .getElementById("call-end-btn-mobile")
    ?.addEventListener("click", closeCall);

  // Helper: update icon visibility directly on the button element
  const _syncIcons = (btn, isOn) => {
    const svgOn = btn.querySelector(".icon-on");
    const svgOff = btn.querySelector(".icon-off");
    if (svgOn) svgOn.style.display = isOn ? "block" : "none";
    if (svgOff) svgOff.style.display = isOn ? "none" : "block";
  };

  // Camera toggle
  const cameraBtn = document.getElementById("call-camera-btn");
  if (cameraBtn) {
    _syncIcons(cameraBtn, cameraBtn.dataset.active === "true"); // init
    cameraBtn.addEventListener("click", () => {
      const nowOn = cameraBtn.dataset.active !== "true";
      cameraBtn.dataset.active = String(nowOn);
      _syncIcons(cameraBtn, nowOn);
      showToast(nowOn ? "Camera on" : "Camera off", "info");
    });
  }

  // Mic toggle
  const micBtn = document.getElementById("call-mic-btn");
  if (micBtn) {
    _syncIcons(micBtn, micBtn.dataset.active === "true"); // init
    micBtn.addEventListener("click", () => {
      const nowOn = micBtn.dataset.active !== "true";
      micBtn.dataset.active = String(nowOn);
      _syncIcons(micBtn, nowOn);
      showToast(nowOn ? "Microphone on" : "Microphone muted", "info");
    });
  }

  // Other call bar buttons
  screen
    .querySelectorAll(
      ".call-bar-btn:not(#call-camera-btn):not(#call-mic-btn), .call-bar-chevron",
    )
    .forEach((btn) => {
      btn.addEventListener("click", () => showToast("Coming soon.", "info"));
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Socket.io real-time integration (PA7+)
// Only active when USE_API = true. Uses CDN socket.io-client loaded in chat.html.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Connect to the backend Socket.io server and register event listeners.
 * Called once by initChatPage() when USE_API is true.
 */
function _initSocket() {
  const token = getAccessToken();
  if (!token || typeof window.io === "undefined") return;

  _socket = window.io(SERVER_URL, {
    // Use a callback so socket.io fetches the (possibly refreshed) token
    // on each reconnection attempt instead of freezing the initial value.
    auth: (cb) => cb({ token: getAccessToken() }),
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  _socket.on("connect", () => {
    console.log("[socket] connected:", _socket.id);
    // Re-join the current conversation room after reconnection
    if (activeContactId) {
      _socket.emit("join:conversation", activeContactId);
    }
  });

  _socket.on("connect_error", async (err) => {
    console.warn("[socket] connection error:", err.message);
    // If the handshake was rejected for auth reasons (expired token), try to
    // refresh. The socket.io client will retry automatically; if the refresh
    // succeeded, getAccessToken() now returns the fresh token (picked up via
    // the auth callback above).
    if (/auth|expired|token/i.test(err.message)) {
      await refreshTokenIfNeeded();
    }
  });

  // ── Incoming message from server ─────────────────────────────────────────
  _socket.on("message:new", (msg) => {
    const myId = _getCurrentUserId();
    const isMine = msg.sender === myId;

    // The sender already rendered the bubble optimistically — skip the echo.
    if (isMine) return;

    const time = _formatTime(new Date(msg.createdAt));
    const entry = {
      id: msg._id,
      from: "them",
      text: msg.text,
      time,
    };

    // Update local conversations model so the sidebar stays in sync
    if (!conversations[msg.conversationId]) {
      // Build a contact entry from the message payload so the recipient
      // can see who sent the message without a separate API call.
      const senderName = msg.senderDisplayName || "Unknown";
      const senderInitials = senderName
        .split(/\s+/)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "?";
      conversations[msg.conversationId] = {
        contact: {
          id: msg.sender,
          displayName: senderName,
          initials: senderInitials,
          gradient: "linear-gradient(135deg,#2563EB,#7C3AED)",
          online: true,
          role: "",
          phone: "",
        },
        unread: 0,
        lastTime: time,
        lastMessage: "",
        messages: [],
      };
      // Join the room so the recipient can reply
      _socketJoinConversation(msg.conversationId);
    }
    const conv = conversations[msg.conversationId];
    conv.messages.push(entry);
    conv.lastMessage =
      msg.text.slice(0, 30) + (msg.text.length > 30 ? "…" : "");
    conv.lastTime = time;

    if (msg.conversationId !== activeContactId) {
      // Background conversation — increment unread badge and refresh sidebar
      conv.unread = (conv.unread || 0) + 1;
      _renderConversationList(
        document.getElementById("sidebar-search")?.value || "",
      );
      // Tell sender the message was delivered (reached us, but not read yet)
      _socket.emit("message:delivered", {
        messageIds: [msg._id],
        conversationId: msg.conversationId,
      });
      return;
    }

    // Active conversation — render bubble
    _renderConversationList(
      document.getElementById("sidebar-search")?.value || "",
    );
    const area = document.getElementById("chat-messages");
    if (!area) return;
    area.appendChild(_createMessageEl(entry));
    area.scrollTop = area.scrollHeight;

    // Message was both delivered AND read (conversation is open)
    _socket.emit("message:read", {
      messageIds: [msg._id],
      conversationId: msg.conversationId,
    });
  });

  // ── Message status updates (sent → delivered → read) ─────────────────────
  _socket.on("message:status", ({ messageIds, status }) => {
    if (!messageIds || !status) return;
    for (const mid of messageIds) {
      // Update in-memory model
      for (const convId of Object.keys(conversations)) {
        const m = conversations[convId].messages.find((x) => x.id === mid);
        if (m && m.from === "me") {
          m.status = status;
          _updateMsgStatusDOM(mid, status);
          break;
        }
      }
    }
  });

  // ── TTL expiry: remove the bubble from the DOM ───────────────────────────
  _socket.on("message:expired", ({ id }) => {
    // Messages are wrapped in a .message-group-* div; find it by data attribute
    const allGroups = document.querySelectorAll(
      ".message-group-sent, .message-group-received",
    );
    allGroups.forEach((group) => {
      const bubble = group.querySelector(
        `[data-msg-id="${id}"], .message-bubble[data-id="${id}"]`,
      );
      if (bubble || group.dataset.msgId === id) {
        group.remove();
        console.log("[ttl] removed expired message from DOM:", id);
      }
    });
  });

  // ── Typing indicators ────────────────────────────────────────────────────
  _socket.on("typing", ({ displayName, typing }) => {
    const indicator = document.querySelector(".typing-indicator");
    if (!indicator) return;
    if (typing) {
      indicator.textContent = `${displayName} is typing…`;
      indicator.style.display = "block";
    } else {
      indicator.textContent = "";
      indicator.style.display = "none";
    }
  });

  // ── Presence: online/offline tracking ────────────────────────────────────
  _socket.on("presence:list", (userIds) => {
    // Initial list of online users received right after we connect
    for (const convId of Object.keys(conversations)) {
      const c = conversations[convId].contact;
      c.online = !!(c.id && userIds.includes(c.id));
    }
    _renderConversationList(document.getElementById("sidebar-search")?.value || "");
    if (activeContactId) _updateHeaderStatus(activeContactId);
  });

  _socket.on("presence:online", ({ userId }) => {
    _setContactOnline(userId, true);
  });

  _socket.on("presence:offline", ({ userId }) => {
    _setContactOnline(userId, false);
  });
}

/**
 * Join the Socket.io room for a given conversation.
 * Called by _selectConversation whenever the active chat changes.
 */
function _socketJoinConversation(conversationId) {
  if (!_socket?.connected) return;
  _socket.emit("join:conversation", conversationId);
}

/**
 * Send a message via Socket.io instead of the mock reply system.
 * Returns true if the message was sent via socket, false if API is disabled.
 */
function _socketSendMessage(conversationId, text) {
  if (!USE_API || !_socket?.connected) return false;
  _socket.emit("message:send", { conversationId, text });
  return true;
}

/** Emit typing:start / typing:stop events for the active conversation. */
function _socketTypingStart() {
  if (_socket?.connected && activeContactId) {
    _socket.emit("typing:start", activeContactId);
  }
}
function _socketTypingStop() {
  if (_socket?.connected && activeContactId) {
    _socket.emit("typing:stop", activeContactId);
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Update a contact's online status across all conversations that reference
 * that userId, re-render the sidebar, and update the chat header if active.
 */
function _setContactOnline(userId, online) {
  let changed = false;
  for (const convId of Object.keys(conversations)) {
    const c = conversations[convId].contact;
    if (c.id === userId && c.online !== online) {
      c.online = online;
      changed = true;
    }
  }
  if (changed) {
    _renderConversationList(document.getElementById("sidebar-search")?.value || "");
    if (activeContactId) _updateHeaderStatus(activeContactId);
  }
}

/**
 * Refresh the chat header Online/Offline label for the given conversation.
 */
function _updateHeaderStatus(contactId) {
  const conv = conversations[contactId];
  if (!conv) return;
  const statusEl = document.querySelector(".chat-header .chat-status");
  if (!statusEl) return;
  if (conv.contact.online) {
    statusEl.textContent = "Online";
    statusEl.style.color = "var(--color-success)";
  } else {
    statusEl.textContent = "Offline";
    statusEl.style.color = "var(--color-text-secondary)";
  }
}

// Single-check SVG (sent), double-check SVG (delivered), double-check blue (read)
const _TICK_SINGLE = `<svg viewBox="0 0 16 16"><path d="M2 8.5l3.5 3.5L14 4"/></svg>`;
const _TICK_DOUBLE = `<svg viewBox="0 0 20 16"><path d="M2 8.5l3.5 3.5L14 4"/><path d="M6 8.5l3.5 3.5L18 4"/></svg>`;

/**
 * Return the HTML for a message status tick icon.
 * @param {"sending"|"sent"|"delivered"|"read"} status
 */
function _statusTickHTML(status) {
  switch (status) {
    case "sent":
      return ` <span class="msg-status status-sent">${_TICK_SINGLE}</span>`;
    case "delivered":
      return ` <span class="msg-status status-delivered">${_TICK_DOUBLE}</span>`;
    case "read":
      return ` <span class="msg-status status-read">${_TICK_DOUBLE}</span>`;
    default: // "sending" — show a clock/spinner
      return ` <span class="msg-status status-sending"><svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke-dasharray="18 18"/></svg></span>`;
  }
}

/**
 * Update the tick icon in the DOM for a specific message.
 * @param {string} msgId   The message ID (or temp ID)
 * @param {string} status  "sent" | "delivered" | "read"
 * @param {string} [newId] If provided, also update the data-msg-id attribute
 */
function _updateMsgStatusDOM(msgId, status, newId) {
  const group = document.querySelector(`.message-group-sent[data-msg-id="${msgId}"]`);
  if (!group) return;
  if (newId) group.dataset.msgId = newId;
  const timeEl = group.querySelector(".message-time");
  if (!timeEl) return;
  const existing = timeEl.querySelector(".msg-status");
  if (existing) existing.remove();
  timeEl.insertAdjacentHTML("beforeend", _statusTickHTML(status));
}

/**
 * Produce a stable, order-independent conversation ID from two user UUIDs.
 * Sorting guarantees both parties compute the same string.
 */
function _pairId(userIdA, userIdB) {
  return [userIdA, userIdB].sort().join("___");
}

/**
 * Fetch the current user's contacts from the API and populate the in-memory
 * conversations map. Runs once at startup (when USE_API is true).
 */
async function _loadContactsFromAPI() {
  const token = getAccessToken();
  if (!token) return;
  const myId = _getCurrentUserId();
  try {
    const res = await apiFetch(`${SERVER_URL}/api/contacts`);
    if (!res || !res.ok) return;
    const { contacts } = await res.json();
    let changed = false;
    for (const c of contacts) {
      const otherId = c.linked_user_id;
      const convId =
        myId && otherId ? _pairId(myId, otherId) : otherId || String(c.id);
      // Prefer the registered profile name/initials over the manually-typed alias
      // so each party sees the other person's actual identity.
      const displayName = c.linked_display_name || c.display_name;
      const initials    = c.linked_initials    || c.initials;
      if (!conversations[convId]) {
        conversations[convId] = {
          contact: {
            id: otherId || String(c.id),
            displayName,
            initials,
            gradient:
              c.gradient || "linear-gradient(135deg,#2563EB,#7C3AED)",
            online: false,
            role: "",
            phone: c.phone || "",
          },
          unread: 0,
          lastTime: "",
          lastMessage: "",
          messages: [],
        };
        changed = true;
      }
    }
    if (changed) _renderConversationList();
  } catch { /* silently ignore network errors */ }
}

function _getCurrentUserId() {
  const user = getCurrentUserAny?.() || getCurrentUser?.();
  return user?.id ?? null;
}

function _formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Fetch message history from the API for a conversation and merge into the
 * in-memory model. Called once per conversation selection to populate history.
 */
async function _loadMessagesFromAPI(conversationId) {
  if (!USE_API) return;
  const conv = conversations[conversationId];
  if (!conv || conv._historyLoaded) return;
  try {
    const res = await apiFetch(`${SERVER_URL}/api/messages/${encodeURIComponent(conversationId)}`);
    if (!res || !res.ok) return;
    const { messages } = await res.json();
    if (!messages || !messages.length) { conv._historyLoaded = true; return; }

    const myId = _getCurrentUserId();
    const existingIds = new Set(conv.messages.map((m) => m.id));

    for (const msg of messages) {
      if (existingIds.has(msg._id)) continue;
      const isMine = msg.sender === myId;
      conv.messages.push({
        id: msg._id,
        from: isMine ? "me" : "them",
        text: msg.text,
        time: _formatTime(new Date(msg.createdAt)),
        status: isMine ? (msg.status || "sent") : undefined,
      });
    }

    // Sort by createdAt to maintain order
    conv.messages.sort((a, b) => {
      // temp IDs (tmp_*) are newer by definition
      if (a.id.startsWith?.("tmp_")) return 1;
      if (b.id.startsWith?.("tmp_")) return -1;
      return a.id.localeCompare(b.id);
    });

    conv._historyLoaded = true;
    if (conv.messages.length) {
      const last = conv.messages[conv.messages.length - 1];
      conv.lastMessage = last.text.slice(0, 30) + (last.text.length > 30 ? "…" : "");
      conv.lastTime = last.time;
    }

    // Re-render if this is still the active conversation
    if (activeContactId === conversationId) {
      _renderMessages(conversationId);
      _renderConversationList(document.getElementById("sidebar-search")?.value || "");
    }
  } catch { /* silently ignore network errors */ }
}
