// ── Mock contact data ──────────────────────────────────────────

export const MOCK_USERS = [
  {
    id: 'usr_mock_002',
    displayName: 'Elena Rodriguez',
    initials: 'ER',
    role: 'UI Designer',
    gradient: 'linear-gradient(135deg,#EC4899,#F97316)',
    online: true,
    email: 'elena@ephemeral.app',
  },
  {
    id: 'usr_mock_003',
    displayName: 'Samuel Brooks',
    initials: 'SB',
    role: 'Full Stack Developer',
    gradient: 'linear-gradient(135deg,#14B8A6,#22D3EE)',
    online: false,
    email: 'samuel@ephemeral.app',
  },
  {
    id: 'usr_mock_004',
    displayName: 'Julian Voss',
    initials: 'JV',
    role: 'UX Researcher',
    gradient: 'linear-gradient(135deg,#8B5CF6,#6366F1)',
    online: false,
    email: 'julian@ephemeral.app',
  },
  {
    id: 'usr_mock_005',
    displayName: 'Sarah Jenkins',
    initials: 'SJ',
    role: 'Project Manager',
    gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
    online: false,
    email: 'sarah@ephemeral.app',
  },
];

// ── Mock conversations ─────────────────────────────────────────

export const MOCK_CONVERSATIONS = {
  'usr_mock_002': {
    contact: MOCK_USERS[0],
    unread: 3,
    lastTime: '12:45 PM',
    lastMessage: 'That sounds perfect. See…',
    messages: [
      {
        id: 'm1',
        from: 'them',
        text: "Hey! Hope your morning is going well. I've just finished the final iterations for the client dashboard.",
        time: '12:42 PM',
      },
      {
        id: 'm2',
        from: 'me',
        text: 'Awesome work! The lighting effects in the new hero section look incredibly cinematic.',
        time: '12:44 PM',
      },
      {
        id: 'm3',
        from: 'them',
        text: 'That sounds perfect. See you then! 🚀',
        time: '12:45 PM',
      },
    ],
  },
  'usr_mock_003': {
    contact: MOCK_USERS[1],
    unread: 0,
    lastTime: 'Yesterday',
    lastMessage: "Let's reschedule for tomorrow…",
    messages: [
      { id: 'm1', from: 'them', text: 'Hey, are you free to jump on a call later?', time: 'Yesterday 4:10 PM' },
      { id: 'm2', from: 'me',   text: 'Not today, swamped with the sprint review.', time: 'Yesterday 4:15 PM' },
      { id: 'm3', from: 'them', text: "Let's reschedule for tomorrow then!", time: 'Yesterday 4:16 PM' },
    ],
  },
  'usr_mock_004': {
    contact: MOCK_USERS[2],
    unread: 0,
    lastTime: 'Yesterday',
    lastMessage: 'Wait, did you see the update to…',
    messages: [
      { id: 'm1', from: 'them', text: 'Wait, did you see the update to the design system?', time: 'Yesterday 2:30 PM' },
      { id: 'm2', from: 'me',   text: 'Not yet! What changed?', time: 'Yesterday 2:35 PM' },
    ],
  },
  'usr_mock_005': {
    contact: MOCK_USERS[3],
    unread: 0,
    lastTime: 'Mon',
    lastMessage: 'The presentation looks solid, G…',
    messages: [
      { id: 'm1', from: 'them', text: 'The presentation looks solid, Gianluca! Great job on the slides.', time: 'Mon 10:00 AM' },
      { id: 'm2', from: 'me',   text: 'Thanks Sarah! Really appreciate it.', time: 'Mon 10:05 AM' },
    ],
  },
};

// ── Auto-reply pool ────────────────────────────────────────────

const AUTO_REPLIES = [
  "Got it! I'll look into that.",
  'Sounds good! 👍',
  'Sure, let me check and get back to you.',
  'On it! Give me a moment.',
  'Interesting! Tell me more.',
  'Agreed, that makes sense.',
  'Perfect timing — I was just thinking the same thing!',
  'Let me follow up on that later today.',
];

export function getRandomReply() {
  return AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
}

export function getConversation(contactId) {
  return MOCK_CONVERSATIONS[contactId] || null;
}

// ── Demo user seed ─────────────────────────────────────────────

const DEMO_EMAIL    = 'demo@ephemeral.app';
const DEMO_PWD_HASH = btoa('Demo1234:ephemeral-demo');
const STORAGE_KEY   = 'ephemeral_users';
const SCHEMA_V      = 1;

/**
 * Insert demo user into localStorage on first launch (or after schema change).
 * Subsequent calls are no-ops.
 */
export function seedDemoData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed._v === SCHEMA_V) return; // already seeded at current schema
    } catch { /* fallthrough to re-seed */ }
  }

  const demoUser = {
    id: 'usr_demo_001',
    displayName: 'Gianluca Nesta',
    email: DEMO_EMAIL,
    phone: '+1 (555) 123-4567',
    role: 'Product Owner',
    passwordHash: DEMO_PWD_HASH,
    initials: 'GN',
    avatarGradient: 'linear-gradient(135deg,#2563EB,#7C3AED)',
    avatar: null,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: SCHEMA_V, users: [demoUser] }));
}
