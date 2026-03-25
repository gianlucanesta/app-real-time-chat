# Ephemeral Chat

> A real-time messaging app with ephemeral (24-hour auto-deleting) messages, voice/video calls, status stories, and end-to-end delivery tracking.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Express](https://img.shields.io/badge/Express-4.21-000000)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06B6D4)

## Live Demo

Deployed on [Render](https://render.com) — see [render.yaml](render.yaml) for service configuration.

## Features

### Messaging

- **Ephemeral messages** — all messages auto-delete after 24 hours (MongoDB TTL)
- **Real-time delivery** via Socket.IO with sent/delivered/read receipts
- **Emoji reactions** on messages
- **Link previews** with OG metadata extraction
- **View-once media** that disappears after being opened
- **Voice messages** with waveform visualisation (wavesurfer.js)
- **Delete for everyone** — retract messages for all participants

### Media

- **Image, video, audio, and document** uploads (Cloudinary, 25 MB limit)
- **Full-screen media viewer** with gallery navigation
- **PDF preview** (pdfjs-dist)
- **Automatic media cleanup** on message expiry

### Calls

- **Voice & video calls** via WebRTC peer-to-peer
- **Screen sharing** with zoom & pan controls
- **Picture-in-Picture** local video preview
- **ICE restart** for connection recovery

### Status Stories

- **Text, image, and video** status updates (24-hour TTL)
- **Privacy controls** — contacts / contacts except / only share with
- **View tracking** — see who viewed each story

### Authentication

- **Email + password** with bcrypt hashing
- **Email verification** flow (Mailjet)
- **Password reset** via email token
- **Google OAuth 2.0** login
- **Facebook OAuth 2.0** login (logic completely implemented, actually works only for the owner until authorization from Meta)
- **JWT dual-token** strategy (short-lived access + HttpOnly refresh cookie)

### User Experience

- **Dark / Light theme** with system preference detection
- **Mobile-first responsive** design (768px breakpoint)
- **Contact management** with phone-based linking
- **Typing indicators** and online/offline presence
- **Toast notifications** for non-intrusive feedback
- **Customisable settings** — wallpapers, text size, notification sounds, privacy

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| **Frontend**   | React 19, TanStack Router, Tailwind CSS 4, Vite 8 |
| **Backend**    | Express.js 4, TypeScript, Node.js                 |
| **Real-Time**  | Socket.IO 4.8                                     |
| **Calls**      | WebRTC (native browser API)                       |
| **Database**   | PostgreSQL (users, contacts, tokens)              |
| **Database**   | MongoDB (messages, statuses — TTL)                |
| **Cache**      | Redis (presence, keyspace events)                 |
| **Storage**    | Cloudinary (media uploads)                        |
| **Email**      | Mailjet (verification, password reset)            |
| **Docs**       | Fumadocs (Next.js 16 + MDX)                       |
| **Deployment** | Render (static + web services + Redis)            |

## Project Structure

```
├── client/          # React 19 SPA (Vite + TanStack Router)
│   └── src/
│       ├── components/   # UI components (chat, settings, layout, ui)
│       ├── contexts/     # AuthContext, ChatContext, SettingsContext, ThemeContext, ToastContext
│       ├── hooks/        # useSocket, useWebRTC, useChatSettings, useClickOutside
│       ├── lib/          # API client, validation, utilities
│       ├── routes/       # File-based routing (_authenticated.*, login, signup, etc.)
│       ├── styles/       # CSS partials (themes, animations, auth, chat-layout)
│       └── types/        # TypeScript type definitions
├── server/          # Express.js REST API + Socket.IO
│   └── src/
│       ├── config/       # Environment, database connections (pg, mongo, redis, cloudinary)
│       ├── controllers/  # Route handlers (auth, messages, contacts, status, upload)
│       ├── middleware/    # Auth, rate-limiting, error handling
│       ├── models/       # Data models (user, contact, message, status, refresh-token)
│       ├── routes/       # Express route definitions
│       ├── services/     # Business logic (token, password, email, cloudinary, media-cleanup)
│       └── socket/       # Socket.IO event handlers & auth
├── docs/            # Fumadocs documentation site (Next.js + MDX)
│   └── content/docs/    # Architecture, API reference, features, getting started
├── render.yaml      # Render deployment manifest
└── README.md        # This file
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+ (optional, for presence & keyspace events)

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/app-real-time-chat.git
cd app-real-time-chat

# Install all packages
cd server && npm install && cd ..
cd client && npm install && cd ..
cd docs && npm install && cd ..
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your database URLs, API keys, etc.
```

Required environment variables — see [docs/content/docs/getting-started/environment.mdx](docs/content/docs/getting-started/environment.mdx) for full reference.

### 3. Run development servers

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev

# Terminal 3 — Docs (optional)
cd docs && npm run dev
```

The client runs on `http://localhost:5173`, the server on `http://localhost:3000`.

## API Documentation

- **Swagger UI** — available at `/api/docs` when server is running
- **Fumadocs** — comprehensive docs covering architecture, API, features, and client internals

## Testing

```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test
```

## Deployment

The project deploys to Render via `render.yaml`. See the [deployment documentation](docs/content/docs/getting-started/installation.mdx) for details.

## Browser Support

- Chrome 115+
- Firefox 120+
- Safari 17+
- Edge 115+

WebRTC features require a modern browser with getUserMedia support.

## License

This project is licensed under the [MIT License](LICENSE).
