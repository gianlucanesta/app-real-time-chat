# Migration Analysis: Static Prototype → React + Express

## Overview

This document provides an ultra-detailed analysis of every file in the `src/` (static HTML/CSS/JS prototype) folder compared against the current React TypeScript client (`client/`) and Express server (`server/`). The goal is to translate all content, logic, UI, and UX from the static prototype into the production React + Express stack.

---

## Architecture Comparison

| Aspect | Static Prototype (src/) | React App (client/) | Server (server/) |
|--------|------------------------|--------------------|--------------------|
| Rendering | Vanilla HTML + DOM manipulation | React 18 + JSX | Express + Socket.io |
| Routing | `data-page` attribute + `router.js` | TanStack Router | Express Router |
| Styling | CSS custom properties (5 files) | Tailwind CSS + CSS file | — |
| State | Global variables + localStorage | React Context + useState | PostgreSQL + MongoDB + Redis |
| Auth | Dual-mode (API auto-detect + localStorage) | Cookie-based JWT | HttpOnly refresh + access token |
| Socket | Socket.io client (inline in chat.js) | useSocket hook | Socket.io server |
| Font | Inter (Google Fonts) | Inter (system) | — |

---

## FILE-BY-FILE ANALYSIS

---

### 1. LOGIN PAGE — Completion: ~95%

**Source files:** `src/index.html` + `src/js/pages/login.js` (~100 lines)
**React target:** `client/src/routes/login.tsx` (~340 lines)

#### What's Already Implemented ✅
- Email/password form with submit
- Email blur validation (regex)
- Password toggle (eye/eyeOff icons)
- Keep me logged in checkbox
- Social login buttons (Google, Meta)
- More options expand/collapse (Microsoft, TikTok, GitHub)
- Forgot password link
- Footer links (Privacy, Terms, Support)
- Auth page bottom blue glow CSS
- Error display on failed login
- Loading state ("Signing In...")

#### What's Missing ❌
| Feature | Description | Priority |
|---------|-------------|----------|
| Demo social login | Static prototype has `loginAsDemoUser()` that logs in as `demo@ephemeral.app / Demo1234` via social buttons | LOW |
| `keepLoggedIn` passthrough | React has the checkbox but doesn't pass value to `login()` in AuthContext | LOW |

#### CSS Differences
- src/ uses darker colors: `bg: #0b1120` vs React `#0f172a`
- src/ card: `#131c2e` vs React `#1e293b`

---

### 2. SIGNUP PAGE — Completion: ~80%

**Source files:** `src/signup.html` + `src/js/pages/signup.js` (~130 lines)
**React target:** `client/src/routes/signup.tsx` (~300 lines)

#### What's Already Implemented ✅
- Display name field
- Email with blur validation
- Password with toggle
- Terms checkbox (required, disables submit)
- Social login buttons (5 providers)
- Footer toggle ("Already have an account?")

#### What's Missing ❌
| Feature | Description | Priority |
|---------|-------------|----------|
| Phone country code selector | src/ has `<select>` with 17 countries, default `+1` US. React just has a plain tel input | MEDIUM |
| Password strength validation | src/ validates: min 8 chars, at least 1 uppercase, at least 1 number. Shows error message with specific requirements | MEDIUM |
| Phone required validation | src/ requires phone field, shows "Phone number is required" | LOW |
| Shake animation on error | src/ adds `.shake` CSS class to invalid fields for visual feedback | LOW |
| `markError` / `clearError` helpers | src/ has reusable validation helpers that add/remove error classes + messages | LOW |

---

### 3. CHAT PAGE — Completion: ~50% — **LARGEST GAP**

**Source files:** `src/chat.html` (~2000 lines) + `src/js/pages/chat.js` (~2700 lines)
**React targets:** `client/src/routes/_authenticated.index.tsx` + 10 components in `client/src/components/chat/`

This is the core of the application and has the most missing features.

---

#### 3.1 Sidebar (Sidebar.tsx) — ~65%

**React file:** `client/src/components/chat/Sidebar.tsx` (~210 lines)

##### ✅ Implemented
- Search bar
- Filter chips UI (All/Unread/Favorites + dropdown)
- Conversation list with avatars, names, last message preview
- Timestamp on last message
- Unread count badge
- 3-dot menu (Disconnect, New group, etc.)
- NewChatPanel + NewContactPanel integration
- E2E encryption notice footer

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Online status dot on avatar | Green dot (8px) on conversation avatar, positioned bottom-right, with subtle pulse animation | SMALL |
| 3px blue left border on active conversation | Active conversation has `border-left: 3px solid var(--color-accent)` | SMALL |
| Typing indicator in conversation list | When contact is typing, replace last message preview with "typing..." + 3 bouncing dots animation | MEDIUM |
| Filter chips logic | Chips exist in UI but clicking them doesn't filter. Need: Unread (unreadCount > 0), Favorites (starred), Groups (type === 'group') | MEDIUM |
| Conversation sorting | Sort by `lastMessageTime` descending (most recent first) | SMALL |
| Mark as read on select | When opening a conversation, emit `message:read` for unread messages and reset unreadCount to 0 | MEDIUM |
| Search with debounce | Search bar should debounce 300ms before filtering | SMALL |
| NewChatPanel API search | Currently has hardcoded 2 contacts (Elena Rodriguez, Samuel Brooks). Should use `GET /users/search?q=` | MEDIUM |

---

#### 3.2 ChatArea (ChatArea.tsx) — ~50%

**React file:** `client/src/components/chat/ChatArea.tsx` (~600 lines)

##### ✅ Implemented
- Empty state with 3 action cards (Start Chatting, Add Contact, Explore)
- Chat header with contact name
- Call dropdown (Voice Call, Video Call)
- More options menu (12 items listed)
- Messages rendering via ChatMessage component
- Date separator (hardcoded "TODAY")
- Selection mode bar UI (copy/star/delete/forward/download buttons)
- Chat input with paperclip/emoji/mic/send icons
- Enter to send, Shift+Enter for newline
- CallScreen integration
- ConfirmModal integration (3 modals: delete-messages, clear-chat, delete-chat)

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Header online/offline status | Show "Online" or "Last seen..." under contact name in header | SMALL |
| Header typing indicator | Show "typing..." under contact name when the contact is typing | SMALL |
| Real date separator grouping | Group messages by day. Show "TODAY" / "YESTERDAY" / formatted date. Currently hardcoded | MEDIUM |
| Message status ticks (4 states) | `sending` = spinner, `sent` = ✓ gray, `delivered` = ✓✓ gray, `read` = ✓✓ blue. Currently only: `sent` = ✓ gray, `read` = ✓ blue (single check only!) | MEDIUM |
| ContactProfilePanel wiring | Click contact name in header → open ContactProfilePanel (component exists but not wired) | MEDIUM |
| Context menu REAL actions | Currently all actions show toast. Need: Copy → clipboard API, Delete → DELETE /api/messages, Select → enter select mode | MEDIUM |
| Selection mode API integration | Delete selected → DELETE /api/messages with messageIds array. Copy selected → clipboard concat | MEDIUM |
| Clear chat API | DELETE /api/messages/:conversationId → empty messages, keep conversation | MEDIUM |
| Delete chat API | Clear messages + DELETE /api/contacts/:id → remove conversation entirely | MEDIUM |
| Emoji reaction strip/badges | Click emoji on message → toggle reaction. Show reaction badges under message | LARGE |
| Expanded emoji picker | 6-emoji popup has no "expand" button. src/ has 25-emoji grid (5 columns) | MEDIUM |
| Mic/Send toggle | When input is empty show mic icon, when text present show send icon | SMALL |
| Mobile back button | Visible on mobile, click returns to sidebar | MEDIUM |
| Mobile sidebar toggle | Sidebar should be fullscreen absolute z-50 on mobile, hidden when chat is open | MEDIUM |

---

#### 3.3 ChatMessage (ChatMessage.tsx) — ~55%

**React file:** `client/src/components/chat/ChatMessage.tsx` (~190 lines)

##### ✅ Implemented
- Sent bubble (blue gradient `bg-gradient-to-br from-accent to-blue-700`, rounded-br-sm)
- Received bubble (card bg, rounded-bl-sm)
- Timestamp display
- Hover: react button (6 emoji popup)
- Hover: chevron button (context menu with 7 items)
- Select mode checkbox
- Status ticks (partial — sent/read only, single check)

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Status ticks complete (4 states) | Need: `sending` = animated gray spinner, `sent` = single ✓ gray, `delivered` = double ✓✓ gray, `read` = double ✓✓ blue | MEDIUM |
| Reaction strip on message | After selecting an emoji reaction, show colored badge strip below message with emoji + count | MEDIUM |
| Expanded emoji picker | Button to expand 6-emoji popup → 25-emoji grid (5 columns) | MEDIUM |
| Context menu copy action | Currently toast. Need: `navigator.clipboard.writeText(text)` | SMALL |
| Context menu delete action | Currently toast. Need: API call `DELETE /api/messages` | SMALL |

---

#### 3.4 CallScreen (CallScreen.tsx) — ~70%

**React file:** `client/src/components/chat/CallScreen.tsx` (~115 lines)

##### ✅ Implemented
- Full-screen overlay with dark background
- Contact avatar (130px) with gradient
- Contact name display
- Waveform animation (13 bars, CSS keyframes)
- Timer display (static "00:00")
- Camera/mic toggle buttons with state
- End call button (desktop bar layout)
- Mobile end call floating button
- Uses CSS classes from chat-components.css

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Timer real interval | Start `setInterval(1000)` on mount, increment seconds, format MM:SS. Clear on unmount/end call | SMALL |
| Camera/mic icon swap | When toggled off, swap `Video` → `VideoOff`, `Mic` → `MicOff` icon. Use `data-active` visual state (off = red bg) | SMALL |

---

#### 3.5 ContactProfilePanel (ContactProfilePanel.tsx) — ~80%

**React file:** `client/src/components/chat/ContactProfilePanel.tsx` (~170 lines)

##### ✅ Implemented
- Slide-in from right with CSS transform
- Hero avatar (96px)
- Contact name + phone
- Quick action buttons (Audio, Video, Search)
- Grouped rows (Media, Important Messages, Notifications, Chat Theme)
- Block contact row
- Edit button → opens EditContactPanel

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Not wired to ChatArea | Component exists but ChatArea doesn't open it. Need: click contact name in header → set state → show panel | MEDIUM |
| Contact data passthrough | Panel needs to receive active contact's real data (name, phone, gradient, initials) from ChatContext | SMALL |

---

#### 3.6 EditContactPanel (EditContactPanel.tsx) — ~75%

**React file:** `client/src/components/chat/EditContactPanel.tsx` (~175 lines)

##### ✅ Implemented
- CSS-class-based slide-in panel
- Avatar display
- First name / Last name fields
- Phone with country code select (6 options)
- "This phone number is on Ephemeral" hint
- Sync toggle
- Save FAB button
- Delete button (danger)

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Not wired | Opened from ContactProfilePanel but not connected to real contact data or save API | MEDIUM |
| Save API | Need PATCH /contacts/:id or PUT logic | MEDIUM |
| Delete API | Need DELETE /contacts/:id with confirmation modal | MEDIUM |

---

#### 3.7 NewChatPanel (NewChatPanel.tsx) — ~40%

**React file:** `client/src/components/chat/NewChatPanel.tsx` (~115 lines)

##### ✅ Implemented
- Slide-in panel with back arrow
- Search input
- 3 action buttons (New group, New contact, New community)

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Real user search | Hardcoded 2 contacts. Need: `GET /users/search?q=` with debounce 300ms | MEDIUM |
| Click contact → create conversation | Click result → generate pairId (`[userId1, userId2].sort().join("___")`) → create/select conversation | MEDIUM |
| Empty state | When no results, show "No contacts found" with search icon | SMALL |

---

#### 3.8 NewContactPanel (NewContactPanel.tsx) — ~90%

**React file:** `client/src/components/chat/NewContactPanel.tsx` (~370 lines)

##### ✅ Implemented
- Avatar with live initials
- First name / Last name / Phone fields
- Country code select (6 options)
- Phone lookup via `GET /users/lookup-phone`
- Status indicators (checking spinner, found checkmark, not-found)
- Sync toggle
- FAB save button
- POST /contacts API call
- Conversation creation with pairId
- onContactSaved callback

##### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Country selector completeness | src/ has 17 countries with +39 IT default. React has 6 options | LOW |

---

#### 3.9 NewChatModal (NewChatModal.tsx) — Legacy/Unused

**React file:** `client/src/components/chat/NewChatModal.tsx` (~130 lines)

This appears to be an older modal-based approach (as opposed to the slide-in panel). It has hardcoded contacts and Private/Group tabs. **Likely should be deprecated in favor of NewChatPanel.**

---

#### 3.10 ConfirmModal (ConfirmModal.tsx) — ~100% ✅

**React file:** `client/src/components/chat/ConfirmModal.tsx` (~55 lines)

Fully implemented generic confirmation modal with title, description, confirm (danger) button, and cancel button. No gaps.

---

### 4. SETTINGS PAGE — Completion: ~70%

**Source files:** `src/settings.html` + `src/js/pages/settings.js` (~400 lines)
**React target:** `client/src/routes/_authenticated.settings.tsx` (~260 lines)

#### ✅ Implemented
- Settings sidebar nav (5 sections: General, Account, Notifications, Privacy, Security)
- Profile card with gradient avatar, initials, name, role
- Change Photo / Remove buttons (UI only)
- Form fields: Display Name, Email (readonly), Phone, Role
- Online Status toggle (default ON)
- Read Receipts toggle
- Save Changes button with PATCH /users/:id API
- Cancel button (link to home)
- Success/error feedback (inline badge)
- Logout button (sidebar footer on desktop, dedicated button on mobile)
- Logo header in sidebar

#### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Missing form fields: Bio, Location | src/ has 6 fields. React has 4. Need to add Bio (textarea) and Location (text input) | SMALL |
| Email/phone validation on blur | src/ validates format on blur with visual error indicators | SMALL |
| Volume slider | src/ has range input 0-100 (default 75%) with dynamic accent gradient showing fill level | MEDIUM |
| Read Receipts default OFF | React defaults to ON, src/ defaults to OFF | TRIVIAL |
| Avatar upload handler | "Change Photo" button exists but has no file input or upload logic | MEDIUM |
| Avatar remove handler | "Remove" button exists but no handler | SMALL |
| Missing nav sections | src/ has 7 sections (adds "Help & Support" and "Theme"). React has 5 | SMALL |
| Search bar in sidebar | src/ has search input at top of settings nav | SMALL |
| Notification badge | src/ has red dot on Notifications nav item | TRIVIAL |
| Profile tagline | src/ shows "(Product Owner)" under name in profile card. React shows only role text | TRIVIAL |
| Mobile back button | src/ has back arrow for mobile navigation in settings | SMALL |
| Settings form grid | src/ uses CSS grid with 2 columns for form. React already has this with `grid-cols-2` | — |

---

### 5. VERTICAL NAVIGATION (VerticalNav.tsx) — ~75%

**Source file context:** Navigation defined in `src/chat.html` + `src/settings.html`
**React file:** `client/src/components/layout/VerticalNav.tsx` (~165 lines)

#### ✅ Implemented
- Desktop: 60px fixed left nav (src/ uses 64px) with 6 items + Settings + profile avatar
- Active indicator: blue left border bar
- Mobile: 64px bottom nav with 5 items (Chats, Calls, Community, Updates, You)
- Responsive switching between desktop/mobile layouts
- Profile avatar with gradient + initials at bottom of desktop nav

#### ❌ Missing
| Feature | Description | Complexity |
|---------|-------------|------------|
| Nav item badges | Unread count badges on nav items (e.g., Chats badge showing total unread) | SMALL |
| Functional links | Only Chats and Settings navigate. Other items (Calls, Status, Contacts, Favorites, Archive) need routes or placeholders | LOW |
| Width consistency | src/ uses 64px, React uses 60px (minor difference) | TRIVIAL |

---

### 6. GLOBAL SYSTEMS — Missing Entirely

These systems exist in the static prototype but have **no equivalent** in the React app:

#### 6.1 Theme Toggle System
**Source:** `src/js/theme.js` (~25 lines)
- localStorage persistence of `theme` key
- Toggle between `light` and `dark` class on `<html>`
- Fixed-position toggle button (top-right)
- **React has:** Dark theme only, no toggle

#### 6.2 Toast Notification System
**Source:** `src/js/ui/toast.js` (~70 lines)
- Fixed container bottom-right of viewport
- 4 type styles: info (accent blue), success (green), error (red), warning (yellow)
- Dark background with colored left border
- SVG icon per type
- Entrance animation (slide up + fade in) + exit animation (slide right + fade out)
- Auto-dismiss after 3 seconds
- **React has:** No toast system. Uses inline messages or console.warn

#### 6.3 Typing Indicator System
**Source:** `src/js/pages/chat.js` (within `_initSocket`)
- Emits `typing:start` when user starts typing
- Emits `typing:stop` when user stops (debounced)
- Receives `typing` event with `{ userId, displayName, typing: boolean }`
- Shows "typing..." under contact name in chat header
- Shows typing indicator in sidebar conversation preview
- CSS bouncing dots animation
- **React has:** Socket event types defined in `useSocket.ts` but never emitted or handled in UI

#### 6.4 Message Delivery/Read Acknowledgment
**Source:** `src/js/pages/chat.js`
- On receiving `message:new` (not own): emits `message:delivered`
- On opening conversation: emits `message:read` for all unread messages
- Updates local message status based on `message:status` events
- **React has:** Handles `message:status` events to update UI, but never emits `message:delivered` or `message:read`

#### 6.5 Message Expiry (TTL 24h)
**Source:** `src/js/pages/chat.js`
- Handles `message:expired` socket event
- Removes expired message DOM element from the chat
- **React has:** No handler for `message:expired`

#### 6.6 Socket Reconnection with Token Refresh
**Source:** `src/js/pages/chat.js`
- On `connect_error`: calls `refreshTokenIfNeeded()` → updates socket auth → reconnects
- Automatically rejoins previous conversation room after reconnection
- **React has:** Basic connect/disconnect handling only. No reconnection or token refresh logic

---

## DESIGN TOKEN COMPARISON

| Token | src/ (variables.css) | React (index.css @theme) | Status |
|-------|---------------------|--------------------------|--------|
| `--color-bg` | `#0b1120` | `#0f172a` | ⚠️ Different |
| `--color-card` | `#131c2e` | `#1e293b` | ⚠️ Different |
| `--color-input` | `#1a2332` | `#334155` | ⚠️ Different |
| `--color-border` | `#1e293b` | `#475569` | ⚠️ Different |
| `--color-accent` | `#2563eb` | `#2563eb` | ✅ Match |
| `--color-text` | `#f1f5f9` | `#f8fafc` | ⚠️ Slightly different |
| `--color-text-secondary` | `#94a3b8` | `#94a3b8` | ✅ Match |
| `--color-success` | `#22c55e` | `#10b981` | ⚠️ Different green |
| `--color-danger` | `#ef4444` | `#ef4444` | ✅ Match |
| Sidebar width | `360px` | `400px` | ⚠️ React is wider |
| Settings sidebar | `380px` | `220px` | ⚠️ React much narrower |
| Nav width | `64px` | `60px` | ⚠️ Minor difference |
| Font sizes | xs(10)-3xl(28) | xs(10)-3xl(28) | ✅ Match |
| Transition fast | `150ms` | not defined | ❌ Missing |
| Transition base | `200ms` | not defined | ❌ Missing |

---

## MIGRATION PLAN — 10 PHASES

### Phase 0: Foundation (Design System + Utilities + Toast)
**Priority: HIGH — Foundation for everything else**

#### 0.1 Align Design Tokens
- Update `client/src/index.css` with exact colors from src/:
  - `bg: #0b1120`, `card: #131c2e`, `input: #1a2332`, `border: #1e293b`, `success: #22c55e`
  - Add transition tokens: `--transition-fast: 150ms`, `--transition-base: 200ms`
  - Fix sidebar width: `400px → 360px`
  - Fix settings sidebar: `220px → 380px`
- **Commit:** `style: align design tokens with static prototype`

#### 0.2 Utility Functions
- Create `client/src/lib/debounce.ts` — debounce function
- Create `client/src/lib/validation.ts` — validateEmail, validatePhone, validatePasswordStrength
- **Commit:** `feat: add utility functions (debounce, validation)`

#### 0.3 Toast System
- Create `client/src/components/ui/Toast.tsx` — Toast component
- Create `client/src/contexts/ToastContext.tsx` — ToastProvider + useToast hook
- 4 types: info (accent), success (green), error (red), warning (yellow)
- Auto-dismiss 3s, entrance/exit animations
- Wire into app entry point
- **Commit:** `feat: add toast notification system`

---

### Phase 1: Auth Pages Polish
**Priority: MEDIUM**

#### 1.1 Signup — Country Code + Validation
- Add country code `<select>` to phone field (17 countries, +39 IT default)
- Add `validatePasswordStrength` (min 8, uppercase, number)
- Add phone required validation
- Add shake animation on error (CSS class)
- **Commit:** `feat: signup page phone selector and validation`

#### 1.2 Login — Demo Login
- Add demo login via social button (demo@ephemeral.app / Demo1234)
- Pass `keepLoggedIn` to `login()` in AuthContext
- **Commit:** `feat: login demo mode and keepLoggedIn`

---

### Phase 2: Chat Core (Part 1: Status + Indicators)
**Priority: CRITICAL**

#### 2.1 Message Status Ticks (4 States)
- Update `ChatMessage.tsx`: render 4 states with proper SVG icons
  - `sending` → animated gray spinner
  - `sent` → single check ✓ gray
  - `delivered` → double check ✓✓ gray
  - `read` → double check ✓✓ blue (accent)
- Update `ChatContext.tsx`: add "delivered" to Message status type
- **Commit:** `feat: complete message status ticks (4 states)`

#### 2.2 Typing Indicators
- Emit `typing:start` / `typing:stop` from ChatArea input (debounced)
- Receive `typing` event in ChatContext → store typing state per conversation
- Show "typing..." under contact name in chat header
- Show "typing..." replacing last message in sidebar conversation item
- CSS bouncing dots animation
- **Commit:** `feat: typing indicators (emit + display)`

#### 2.3 Message Delivered/Read Acknowledgment
- Emit `message:delivered` when receiving a message (not own)
- Emit `message:read` when opening a conversation (for all unread)
- Update ChatContext socket handlers
- **Commit:** `feat: message delivery and read receipts`

#### 2.4 Online/Offline Presence in Chat
- Show green dot on avatar in Sidebar conversation list
- Show "Online" / "Offline" status text in chat header
- Update header status based on presence events
- **Commit:** `feat: online presence indicators`

---

### Phase 3: Chat Core (Part 2: Panels + Navigation)
**Priority: CRITICAL**

#### 3.1 ContactProfilePanel Wiring
- Click contact name in chat header → open ContactProfilePanel
- Pass active contact data (name, phone, gradient, initials)
- ContactProfilePanel → Edit button → open EditContactPanel
- **Commit:** `feat: wire contact profile and edit panels`

#### 3.2 Mobile Chat Navigation
- Add back button in chat header (visible on mobile only)
- Click back → show sidebar, hide chat area
- Sidebar fullscreen absolute on mobile (z-50)
- Handle mobile ↔ desktop transitions
- **Commit:** `feat: mobile chat navigation with back button`

#### 3.3 Date Separator Grouping
- Group messages by day (compare dates)
- Show "TODAY" / "YESTERDAY" / formatted date string
- Replace hardcoded "TODAY" separator
- **Commit:** `feat: real date separators in message list`

#### 3.4 Conversation Sorting + Active Indicator
- Sort conversations by `lastMessageTime` descending
- 3px blue left border on active conversation item
- Reset unreadCount on conversation selection
- **Commit:** `feat: conversation sorting and active indicator`

---

### Phase 4: Chat Features (Part 3: Actions)
**Priority: HIGH**

#### 4.1 Context Menu Real Actions
- Copy → `navigator.clipboard.writeText(text)`
- Delete → API call `DELETE /api/messages` with messageId
- Select → enter select mode for that message
- Star/Pin/Report → toast placeholder ("Coming soon")
- **Commit:** `feat: context menu real actions (copy, delete, select)`

#### 4.2 Selection Mode API Integration
- Delete selected messages → `DELETE /api/messages` with `{ messageIds: [...] }`
- Copy selected → concatenate texts → clipboard
- Update UI after successful delete (remove from list)
- **Commit:** `feat: selection mode delete and copy`

#### 4.3 Clear Chat + Delete Chat
- Clear chat → `DELETE /api/messages/:conversationId` → empty messages list
- Delete chat → clear messages + `DELETE /api/contacts/:id` → remove conversation from sidebar
- Both triggered via ConfirmModal (already exists)
- **Commit:** `feat: clear chat and delete chat with API`

#### 4.4 Emoji Reactions
- Add "expand" button in 6-emoji popup → opens 25-emoji grid (5 columns)
- Click emoji → toggle reaction on message
- Show reaction badge strip below message (emoji + count)
- Local state management (not persisted to server yet)
- **Commit:** `feat: emoji reactions with expanded picker`

---

### Phase 5: NewChat Search + Filters
**Priority: HIGH**

#### 5.1 NewChatPanel Real Search
- Replace hardcoded contacts with API: `GET /users/search?q=`
- Debounce 300ms on search input
- Click contact → generate pairId → create/select conversation
- Show empty state when no results
- **Commit:** `feat: new chat panel with real user search`

#### 5.2 Filter Chips Logic
- Unread → filter conversations where `unreadCount > 0`
- Favorites → filter starred (need `isFavorite` field in Conversation)
- Groups → filter where `type === 'group'`
- All → show all (clear filter)
- **Commit:** `feat: sidebar filter chips functionality`

---

### Phase 6: Settings Page Completion
**Priority: MEDIUM**

#### 6.1 Missing Form Fields + Validation
- Add Bio (textarea) and Location (text input) fields
- Email/phone validation on blur with visual indicators
- Volume slider with dynamic accent gradient
- Fix Read Receipts default to OFF
- **Commit:** `feat: settings form fields, validation, volume slider`

#### 6.2 Avatar Upload
- Hidden file input triggered by "Change Photo" button
- Preview with FileReader API
- "Remove" button handler (reset to gradient + initials)
- Upload endpoint (or base64 storage for MVP)
- **Commit:** `feat: avatar upload in settings`

#### 6.3 Missing Nav Sections
- Add "Help & Support" and "Theme" sections to settings sidebar
- Add search bar at top of settings navigation
- Add red notification badge dot on Notifications item
- **Commit:** `feat: settings nav complete with search and badges`

---

### Phase 7: CallScreen + Socket Resilience
**Priority: MEDIUM**

#### 7.1 CallScreen Timer Real
- `setInterval(1000)` on mount → increment timer state → format as MM:SS
- Camera toggle: swap `Video` ↔ `VideoOff` icon, red background when off
- Mic toggle: swap `Mic` ↔ `MicOff` icon, red background when off
- End call: `clearInterval`, close overlay, reset state
- **Commit:** `feat: call screen timer and toggle improvements`

#### 7.2 Socket Reconnection + Message Expiry
- `connect_error` → attempt `refreshAccessToken()` → update socket auth → reconnect
- Handle `message:expired` event → remove message from activeMessages
- Rejoin conversation room after successful reconnection
- **Commit:** `feat: socket resilience and message expiry`

---

### Phase 8: Theme System
**Priority: LOW**

#### 8.1 Light/Dark Theme Toggle
- Create `client/src/contexts/ThemeContext.tsx` with localStorage persistence
- Define light theme CSS variables (lighter backgrounds, darker text)
- Toggle component (fixed position or in VerticalNav/Settings)
- Apply `.light` / `.dark` class on `<html>` element
- **Commit:** `feat: light/dark theme toggle`

---

### Phase 9: Responsive Polish
**Priority: MEDIUM**

#### 9.1 All Breakpoints
- Tablet (768-1023px): sidebar 300px, nav 56px, adjusted panels
- Mobile (<768px): auth full-width, sidebar fullscreen absolute, nav hidden (bottom nav used), chat main fullscreen, back button visible, input area with accent attachment pill, hide emoji show camera, call screen button sizing
- Settings mobile: sidebar fullscreen, grouped card-style nav items
- **Commit:** `style: responsive breakpoints from static prototype`

---

## EXECUTION ORDER

| Step | Phase | Description | Commits |
|------|-------|-------------|---------|
| 1 | **Phase 0** | Design tokens + utils + toast | 3 |
| 2 | **Phase 2** | Message status + typing + presence | 4 |
| 3 | **Phase 3** | Panels + mobile nav + dates | 4 |
| 4 | **Phase 4** | Context menu + selection + emoji | 4 |
| 5 | **Phase 5** | Search + filters | 2 |
| 6 | **Phase 1** | Auth polish | 2 |
| 7 | **Phase 6** | Settings completion | 3 |
| 8 | **Phase 7** | Call screen + socket | 2 |
| 9 | **Phase 9** | Responsive CSS | 1 |
| 10 | **Phase 8** | Theme system | 1 |
| **Total** | | | **26 commits** |

---

## SOURCE FILE INVENTORY

### src/ — Static Prototype Files (ALL analyzed)
| File | Lines | Description |
|------|-------|-------------|
| `index.html` | ~120 | Login page |
| `signup.html` | ~130 | Registration page |
| `chat.html` | ~2000 | Main chat page (sidebar, chat area, all panels, call screen) |
| `settings.html` | ~400 | Settings page |
| `css/variables.css` | ~75 | Design tokens (colors, typography, spacing, sizes) |
| `css/reset.css` | ~100 | CSS reset + webkit autofill overrides |
| `css/layout.css` | ~2200 | All layout rules (auth, chat, sidebar, panels, messages, settings) |
| `css/components.css` | ~1500 | Component styles (buttons, modals, forms, avatars, messages, call) |
| `css/responsive.css` | ~900 | Responsive breakpoints (tablet, mobile) |
| `js/main.js` | ~30 | Entry point, page routing |
| `js/router.js` | ~12 | Auth guard |
| `js/auth.js` | ~460 | Dual-mode auth (API + localStorage), token management |
| `js/theme.js` | ~25 | Light/dark theme toggle |
| `js/utils.js` | ~75 | Debounce, validation utilities |
| `js/pages/login.js` | ~100 | Login form logic + social demo login |
| `js/pages/signup.js` | ~130 | Signup validation + API call |
| `js/pages/chat.js` | ~2700 | **Entire chat logic** (18 init functions, socket, messages, panels) |
| `js/pages/settings.js` | ~400 | Settings form, preferences, avatar upload |
| `js/data/mock-data.js` | ~180 | Mock users, conversations, auto-replies |
| `js/ui/modal.js` | ~40 | openModal/closeModal with focus management |
| `js/ui/toast.js` | ~70 | Toast notification system |
| `js/ui/toggle-password.js` | ~40 | Password visibility toggle |

### client/ — React TypeScript Files (ALL analyzed)
| File | Lines | Description |
|------|-------|-------------|
| `src/main.tsx` | ~40 | React entry point, AuthProvider, Router |
| `src/index.css` | ~160 | Tailwind + design tokens + global CSS |
| `src/chat-components.css` | ~400 | CSS for panels, call screen, selection bar, modals |
| `src/routes/__root.tsx` | ~30 | Root route with QueryClient |
| `src/routes/_authenticated.tsx` | ~45 | Auth guard layout (VerticalNav + ChatProvider) |
| `src/routes/_authenticated.index.tsx` | ~25 | Chat page (Sidebar + ChatArea + NewChatModal) |
| `src/routes/_authenticated.settings.tsx` | ~260 | Settings page |
| `src/routes/login.tsx` | ~340 | Login page |
| `src/routes/signup.tsx` | ~300 | Signup page |
| `src/contexts/AuthContext.tsx` | ~105 | Auth state, login/logout, checkAuth |
| `src/contexts/ChatContext.tsx` | ~356 | Conversations, messages, socket events, sendMessage |
| `src/hooks/useSocket.ts` | ~100 | Socket.io connection with typed events |
| `src/hooks/useClickOutside.ts` | ~25 | Click outside handler |
| `src/lib/api.ts` | ~125 | apiFetch with JWT refresh queue |
| `src/lib/utils.ts` | ~6 | cn() (clsx + tailwind-merge) |
| `src/types/index.ts` | ~40 | User, Contact, Message, AuthResponse types |
| `src/components/chat/Sidebar.tsx` | ~210 | Conversation list, search, filters, panels |
| `src/components/chat/ChatArea.tsx` | ~600 | Chat header, messages, input, empty state |
| `src/components/chat/ChatMessage.tsx` | ~190 | Message bubble, hover actions, select mode |
| `src/components/chat/CallScreen.tsx` | ~115 | Call overlay with waveform |
| `src/components/chat/ContactProfilePanel.tsx` | ~170 | Contact info slide-in |
| `src/components/chat/EditContactPanel.tsx` | ~175 | Edit contact slide-in |
| `src/components/chat/NewChatPanel.tsx` | ~115 | New chat slide-in (hardcoded contacts) |
| `src/components/chat/NewContactPanel.tsx` | ~370 | New contact with phone lookup |
| `src/components/chat/ConfirmModal.tsx` | ~55 | Generic confirmation modal |
| `src/components/chat/NewChatModal.tsx` | ~130 | Legacy modal (unused?) |
| `src/components/layout/VerticalNav.tsx` | ~165 | Desktop + mobile navigation |
| `src/components/ui/button.tsx` | ~45 | Button component (4 variants) |
| `src/components/ui/input.tsx` | ~45 | Input component (icon, rightIcon, error) |
| `src/components/ui/label.tsx` | ~20 | Label component |

---

*Document generated: March 2026*
*Last updated: Phase 0-9 implementation pending*
