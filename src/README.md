# Ephemeral – Real-Time Chat

A front-end prototype of a real-time chat application built with **Vanilla JS ES Modules** — no npm, no bundler, no framework.

**Live demo:** https://app-real-time-chat.onrender.com/

---

## Quick Start

1. Open the `src/` folder in [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (if not already installed)
3. Right-click `src/index.html` → **Open with Live Server**

> The app runs entirely in the browser using ES Modules. No build step is required.

---

## Demo Credentials

| Field    | Value                |
| -------- | -------------------- |
| Email    | `demo@ephemeral.app` |
| Password | `Demo1234`           |

The demo account and all mock contacts are seeded automatically on first load.  
You can also register a new account from the Sign Up page.

---

## Features

- **Authentication** — Sign up, log in, and log out with client-side session management
- **Chat** — Real-time-style messaging with simulated auto-replies, message context menus, and emoji reactions
- **Conversations** — Filter by All / Unread / Groups; search contacts with debounce; start new chats
- **Call screen** — In-UI voice/video call overlay (simulated)
- **Contact panel** — Slide-in panel with contact details and shared media
- **Settings** — Edit display name, email, phone, avatar (file upload or gradient), and app preferences
- **Theming** — Dark (default) and light mode, persisted in `localStorage`
- **Responsive** — Works on desktop and mobile with a bottom tab bar on small screens
- **Toast notifications** — Contextual feedback for all user actions
- **Accessible modals** — ARIA-compliant, keyboard-dismissible overlays

---

## Folder Structure

```
app-real-time-chat/
├── render.yaml           # Render.com static site deployment config
├── static-site/          # Static export (mirrors src/ without JS modules)
└── src/
    ├── index.html        # Login page
    ├── signup.html       # Sign Up page
    ├── chat.html         # Chat page (requires authentication)
    ├── settings.html     # Settings page (requires authentication)
    ├── css/
    │   ├── reset.css
    │   ├── variables.css     # Design tokens (colours, spacing, fonts)
    │   ├── components.css    # Reusable UI components
    │   ├── layout.css        # Page layouts
    │   └── responsive.css    # Breakpoints
    └── js/
        ├── main.js            # Entry point — bootstraps the active page
        ├── auth.js            # signup / login / logout / updateUser
        ├── router.js          # guardRoute() — redirects unauthenticated users
        ├── theme.js           # Dark / light theme toggle
        ├── utils.js           # validateEmail, validatePhone, validatePasswordStrength, debounce, markError
        ├── data/
        │   └── mock-data.js   # Demo contacts, conversations, auto-replies
        ├── pages/
        │   ├── login.js       # Login page logic
        │   ├── signup.js      # Sign Up page logic
        │   ├── chat.js        # Chat page logic (messaging, calls, search, filters)
        │   └── settings.js    # Settings page logic (profile, avatar, preferences)
        └── ui/
            ├── modal.js           # ARIA-compliant modal (openModal / closeModal)
            ├── toast.js           # Toast notification system (showToast)
            └── toggle-password.js # Show / hide password toggle
```

---

## Deployment

The project is configured for **Render.com** as a zero-build static site:

```yaml
# render.yaml
services:
  - type: web
    env: static
    staticPublishPath: src
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

No build step is required — push to the connected branch and Render serves `src/` directly.

---

## Key Concepts

| Concept            | Implementation                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| Auth               | `localStorage` stores users; `sessionStorage` stores the active session     |
| Password obscuring | `btoa(password + ':ephemeral-demo')` — demo only, not production-safe       |
| Page routing       | `document.body.dataset.page` (`login`, `signup`, `chat`, `settings`)        |
| Protected pages    | `guardRoute()` redirects unauthenticated users to `index.html`              |
| Modals             | `.open` CSS class toggled by `openModal()` / `closeModal()`                 |
| Theming            | `localStorage['ephemeral_theme']` — `'dark'` (default) or `'light'`         |
| Message simulation | Incoming replies use a 400 ms typing indicator + 1200–2000 ms random delay  |
| Avatar             | Supports file upload (base64 stored in `localStorage`) or gradient initials |
| Form validation    | Inline errors via `markError()` / `clearError()`; debounced search inputs   |
