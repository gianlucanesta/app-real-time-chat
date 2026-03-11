# Ephemeral – Real-Time Chat

A full-stack real-time chat application built with **Vanilla JS ES Modules** on the front end and a **Node.js HTTP + Socket.io** backend — no front-end framework, no bundler.

**Live demo (frontend):** https://app-real-time-chat.onrender.com/  
**Backend API:** https://app-real-time-chat-backend.onrender.com/api/health

---

## Quick Start

### Backend

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, DATABASE_URL, JWT_SECRET, etc.
node server.js
```

The API server starts on **port 3001** by default.

### Frontend

1. Open the `src/` folder in [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (if not already installed)
3. Right-click `src/index.html` → **Open with Live Server**

The frontend auto-detects whether the backend is reachable. If not, it falls back to a local `localStorage` demo mode.

---

## Environment Variables (`server/.env`)

| Variable             | Description                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `PORT`               | HTTP server port (default `3001`)                                      |
| `MONGO_URI`          | MongoDB connection string (for messages)                               |
| `DATABASE_URL`       | PostgreSQL connection string (for users, contacts)                     |
| `JWT_SECRET`         | Secret used to sign access tokens                                      |
| `JWT_REFRESH_SECRET` | Secret used to sign refresh tokens                                     |
| `REDIS_URL`          | Redis connection string (optional — gracefully skipped if unavailable) |
| `ALLOWED_ORIGIN`     | Comma-separated list of allowed CORS origins                           |

---

You can register a new account from the Sign Up page.

---

## Features

- **Authentication** — JWT-based sign up / login / logout with short-lived access tokens (15 min) and rotating refresh tokens (7 days)
- **Real-time messaging** — Socket.io rooms per conversation; messages persist in MongoDB with a configurable TTL
- **Message status** — Sending (spinner) → Sent (single tick) → Delivered (double tick) → Read (blue double tick)
- **Online presence** — Live online/offline indicator powered by Socket.io connection tracking
- **Message selection** — Select one or more messages with round checkboxes; copy, delete, forward (coming soon)
- **Delete messages** — Delete selected messages (own only) with confirmation modal
- **Clear chat** — Remove all messages from a conversation with confirmation modal
- **Delete chat** — Remove all messages and the contact entry with confirmation modal
- **Conversations** — Sidebar previews with last message, timestamp, and unread badge; filter by All / Unread / Groups; debounced search
- **Contact panel** — Slide-in panel with contact details
- **Call screen** — In-UI voice/video call overlay (UI only)
- **Settings** — Edit display name, email, phone, avatar (file upload or gradient), and app preferences
- **Theming** — Dark (default) and light mode, persisted in `localStorage`
- **Responsive** — Works on desktop and mobile; bottom tab bar on small screens
- **Toast notifications** — Contextual feedback for all user actions
- **Accessible modals** — ARIA-compliant, keyboard- and backdrop-dismissible overlays
- **Rate limiting** — Per-IP rate limiting on all endpoints; stricter limits on auth routes

---

## Folder Structure

```
app-real-time-chat/
├── render.yaml              # Render.com deployment config
├── static-site/             # Static export (mirrors src/ — no JS modules)
├── server/
│   ├── server.js            # HTTP server entry point (port 3001)
│   ├── package.json
│   ├── config/
│   │   ├── db.js            # PostgreSQL pool + schema init
│   │   ├── mongo.js         # Mongoose connection
│   │   └── redis.js         # Redis publisher / subscriber (optional)
│   ├── middleware/
│   │   ├── auth.js          # JWT verification middleware
│   │   └── rateLimiter.js   # Per-IP rate limiting
│   ├── models/
│   │   ├── Contact.js       # PostgreSQL DAO — contacts table
│   │   ├── Message.js       # Mongoose model — messages collection (TTL)
│   │   └── User.js          # PostgreSQL DAO — users table
│   ├── router/
│   │   └── index.js         # Route dispatch table
│   ├── routes/
│   │   ├── auth.js          # POST /api/auth/register|login|refresh|logout
│   │   ├── contacts.js      # GET|POST|DELETE /api/contacts
│   │   ├── messages.js      # GET|POST|DELETE /api/messages
│   │   └── users.js         # GET|PATCH /api/users
│   ├── socket/
│   │   └── index.js         # Socket.io event handlers (messaging, presence, typing)
│   └── utils/
│       └── http.js          # readBody(), sendJSON(), getQueryParams()
└── src/
    ├── index.html           # Login page
    ├── signup.html          # Sign Up page
    ├── chat.html            # Chat page (requires authentication)
    ├── settings.html        # Settings page (requires authentication)
    ├── css/
    │   ├── reset.css
    │   ├── variables.css    # Design tokens (colours, spacing, fonts)
    │   ├── components.css   # Reusable UI components
    │   ├── layout.css       # Page layouts (includes select-mode, selection bar)
    │   └── responsive.css   # Breakpoints
    └── js/
        ├── main.js           # Entry point — bootstraps the active page
        ├── auth.js           # JWT auth + apiFetch() with token refresh
        ├── router.js         # guardRoute() — redirects unauthenticated users
        ├── theme.js          # Dark / light theme toggle
        ├── utils.js          # validateEmail, validatePhone, debounce, markError
        ├── data/
        │   └── mock-data.js  # Offline demo contacts and auto-replies
        ├── pages/
        │   ├── login.js      # Login page logic
        │   ├── signup.js     # Sign Up page logic
        │   ├── chat.js       # Chat page (messaging, presence, selection, deletion)
        │   └── settings.js   # Settings page (profile, avatar, preferences)
        └── ui/
            ├── modal.js           # ARIA-compliant modal (openModal / closeModal)
            ├── toast.js           # Toast notification system (showToast)
            └── toggle-password.js # Show / hide password toggle
```

---

## API Reference

| Method   | Endpoint                        | Auth | Description                                 |
| -------- | ------------------------------- | ---- | ------------------------------------------- |
| `GET`    | `/api/health`                   | —    | Health check                                |
| `POST`   | `/api/auth/register`            | —    | Create account                              |
| `POST`   | `/api/auth/login`               | —    | Login, receive access + refresh tokens      |
| `POST`   | `/api/auth/refresh`             | —    | Exchange refresh token for new access token |
| `POST`   | `/api/auth/logout`              | ✓    | Revoke refresh token                        |
| `GET`    | `/api/users/me`                 | ✓    | Get own profile                             |
| `PATCH`  | `/api/users/:id`                | ✓    | Update profile                              |
| `GET`    | `/api/users/search?q=`          | ✓    | Search registered users                     |
| `GET`    | `/api/contacts`                 | ✓    | List contacts                               |
| `POST`   | `/api/contacts`                 | ✓    | Add contact                                 |
| `DELETE` | `/api/contacts/:id`             | ✓    | Delete a contact                            |
| `GET`    | `/api/messages/:conversationId` | ✓    | Fetch messages for a conversation           |
| `POST`   | `/api/messages`                 | ✓    | Send a message                              |
| `DELETE` | `/api/messages`                 | ✓    | Delete selected messages (own only)         |
| `DELETE` | `/api/messages/:conversationId` | ✓    | Clear all messages in a conversation        |

---

## Key Concepts

| Concept             | Implementation                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Authentication      | JWT access token (15 min) stored in `localStorage`; refresh token (7 days) in `httpOnly` cookie |
| Conversation ID     | Deterministic: two sorted UUIDs joined by `___` — same result regardless of who opens the chat  |
| Message persistence | MongoDB `messages` collection with TTL index (`expires_at`)                                     |
| User & contact data | PostgreSQL — `users` and `contacts` tables with UUID primary keys                               |
| Real-time layer     | Socket.io v4 — per-conversation rooms, presence tracking, typing indicators                     |
| Online presence     | Server tracks connected socket IDs → user UUIDs; broadcasts `presence:list` on join             |
| Message status      | `sent` → `delivered` → `read`; blue double ticks when read                                      |
| Select mode         | Round checkboxes on all messages; selection bar replaces input bar                              |
| Page routing        | `document.body.dataset.page` + `guardRoute()` redirects unauthenticated users                   |
| Theming             | `localStorage['ephemeral_theme']` — `'dark'` (default) or `'light'`                             |
| Form validation     | Inline errors via `markError()` / `clearError()`; debounced search inputs                       |
