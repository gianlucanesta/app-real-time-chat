# Ephemeral – Real-Time Chat

A front-end prototype of a real-time chat application built with **Vanilla JS ES Modules** — no npm, no bundler, no framework.

---

## Quick Start

1. Open the `src/` folder in [VS Code](https://code.visualstudio.com/)
2. Install the **Live Server** extension (if not already installed)
3. Right-click `src/index.html` → **Open with Live Server**

> The app runs entirely in the browser using ES Modules. No build step is required.

---

## Demo Credentials

| Field    | Value                  |
| -------- | ---------------------- |
| Email    | `demo@ephemeral.app`   |
| Password | `Demo1234`             |

The demo account and all mock contacts are seeded automatically on first load.  
You can also register a new account from the Sign Up page.

---

## Folder Structure

```
src/
├── index.html            # Login page
├── signup.html           # Sign Up page
├── chat.html             # Chat page (requires authentication)
├── settings.html         # Settings page (requires authentication)
├── css/
│   ├── reset.css
│   ├── variables.css     # Design tokens (colours, spacing, fonts)
│   ├── components.css    # Reusable UI components
│   ├── layout.css        # Page layouts
│   └── responsive.css    # Breakpoints
└── js/
    ├── main.js            # Entry point — page router
    ├── auth.js            # Authentication (localStorage + sessionStorage)
    ├── router.js          # Route guard for protected pages
    ├── theme.js           # Dark / light theme toggle
    ├── utils.js           # Validators, debounce, error helpers
    ├── data/
    │   └── mock-data.js   # Demo contacts, conversations, auto-replies
    ├── pages/
    │   ├── login.js       # Login page logic
    │   ├── signup.js      # Sign Up page logic
    │   ├── chat.js        # Chat page logic
    │   └── settings.js    # Settings page logic
    └── ui/
        ├── modal.js           # JS-controlled modal (aria-compliant)
        ├── toast.js           # Toast notification system
        └── toggle-password.js # Show / hide password toggle
```

---

## Key Concepts

| Concept | Implementation |
|---|---|
| Auth | `localStorage` stores users; `sessionStorage` stores the active session |
| Password hashing | `btoa(password + ':ephemeral-demo')` — demo only, not production-safe |
| Page routing | `document.body.dataset.page` (`login`, `signup`, `chat`, `settings`) |
| Protected pages | `guardRoute()` redirects unauthenticated users to `index.html` |
| Modals | `.open` CSS class toggled by `openModal()` / `closeModal()` |
| Theming | `localStorage['ephemeral_theme']` — `'dark'` (default) or `'light'` |
| Message simulation | Incoming "replies" use a 400 ms + 1200–2000 ms random delay |

---

## Developer Resources

- Migration plan: [.github/docs/Practice Assignment 6_JS_Migration_Plan.md](.github/docs/Practice%20Assignment%206_JS_Migration_Plan.md)
- Commit workflow skill: [.github/skills/js-commit-workflow/SKILL.md](.github/skills/js-commit-workflow/SKILL.md)
- JS migration skill: [.github/skills/vanilla-js-migration/SKILL.md](.github/skills/vanilla-js-migration/SKILL.md)
