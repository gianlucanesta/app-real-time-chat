# Changelog

All notable changes to Ephemeral Chat are documented in this file.

## [1.0.0] — 2026-03-25

### Added

- Real-time 1-on-1 messaging with Socket.IO
- Ephemeral messages with 24-hour TTL (MongoDB TTL index)
- Delivery receipts: sent → delivered → read
- Emoji reactions on messages
- Link previews with OG metadata
- View-once media (image/video)
- Voice messages with waveform visualisation
- Delete messages for everyone
- Image, video, audio, and document uploads via Cloudinary
- Full-screen media viewer with gallery navigation
- PDF preview support
- Voice & video calls via WebRTC peer-to-peer
- Screen sharing with zoom/pan controls
- Picture-in-Picture local video preview
- Status stories (text, image, video) with 24-hour TTL
- Status privacy controls (contacts / except / only share with)
- Email + password authentication with bcrypt
- Email verification flow via Mailjet
- Password reset via email token
- Google OAuth 2.0 and Facebook OAuth 2.0
- JWT dual-token strategy (access + HttpOnly refresh cookie)
- Dark / Light theme with system preference detection
- Mobile-first responsive design
- Contact management with phone-based user linking
- Typing indicators and online/offline presence
- Toast notification system
- Customisable settings: wallpapers, text size, notifications, privacy
- Rate limiting (global + auth-specific)
- Helmet security headers + CSP
- CORS configuration with origin whitelist
- Swagger API documentation
- Fumadocs documentation site (architecture, API, features, guides)
- Render deployment configuration (render.yaml)
- Accessibility: skip navigation, aria-labels, semantic HTML, focus management
- Client and server test suites (Vitest + Testing Library)
- GitHub Actions CI pipeline
