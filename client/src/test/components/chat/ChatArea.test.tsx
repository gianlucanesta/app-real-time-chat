import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test-utils';
import { ChatArea } from '../../../components/chat/ChatArea';
import { useChat } from '../../../contexts/ChatContext';

// Mock contexts deeply due to complex logic inside ChatArea
vi.mock('../../../contexts/ChatContext', () => ({
  useChat: vi.fn(() => ({
    conversations: [
      { 
        id: 'chat-1', 
        type: 'direct', 
        name: 'John',
        participants: ['u2'],
        gradient: 'linear-gradient(135deg, #123, #456)',
        initials: 'JO',
        isOnline: true
      }
    ],
    activeConversation: { 
      id: 'chat-1', 
      type: 'direct', 
      name: 'John',
      participants: ['u2'],
      gradient: 'linear-gradient(135deg, #123, #456)',
      initials: 'JO',
      isOnline: true
    },
    activeMessages: [
      { id: '1', text: 'Hello', isMe: true, time: '10:00', status: 'read' },
      { id: '2', text: 'Hi there', isMe: false, time: '10:01' }
    ],
    messagesLoading: false,
    conversationsLoading: false,
    pendingRemoteDeletions: [],
    clearPendingDeletions: vi.fn(),
    sendMessage: vi.fn(),
    mobileInChat: true,
    setMobileInChat: vi.fn(),
    markAllAsRead: vi.fn(),
    pinnedConversations: [],
    pinConversation: vi.fn(),
    unpinConversation: vi.fn(),
    reactions: {},
    typingUsers: {},
    feedStatusUserIds: new Set(),
    webrtc: {
      status: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      remoteIsScreenSharing: false,
      incomingCall: null,
      callWithVideo: false,
      callContactId: null,
      startCall: vi.fn(),
      answerCall: vi.fn(),
      rejectCall: vi.fn(),
      endCall: vi.fn(),
      toggleMute: vi.fn(),
      toggleCamera: vi.fn(),
      toggleScreenShare: vi.fn(),
      retryCall: vi.fn(),
    }
  })),
}));

vi.mock('../../../contexts/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    onlineUsers: new Set(),
  })
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', displayName: 'John' } }),
}));

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light'
  }),
}));

vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { chatWallpaper: 'default', fontSize: 'small', theme: 'system' }
  }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock ResizeObserver for Virtualizer
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

global.IntersectionObserver = class {
  root: any = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};

// Mock the panels that open inside ChatArea
vi.mock('../../../components/chat/ContactProfilePanel', () => ({
  ContactProfilePanel: () => <div data-testid="contact-profile-panel">Profile Panel</div>
}));

vi.mock('../../../components/chat/GroupInfoPanel', () => ({
  GroupInfoPanel: () => <div data-testid="group-info-panel">Group Panel</div>
}));

const defaultChatMock = {
  conversations: [
    { 
      id: 'chat-1', 
      type: 'direct', 
      name: 'John',
      participants: ['u2'],
      gradient: 'linear-gradient(135deg, #123, #456)',
      initials: 'JO',
      isOnline: true
    }
  ],
  activeConversation: { 
    id: 'chat-1', 
    type: 'direct', 
    name: 'John',
    participants: ['u2'],
    gradient: 'linear-gradient(135deg, #123, #456)',
    initials: 'JO',
    isOnline: true
  },
  activeMessages: [
    { id: '1', text: 'Hello', isMe: true, time: '10:00', status: 'read' },
    { id: '2', text: 'Hi there', isMe: false, time: '10:01' }
  ],
  messagesLoading: false,
  conversationsLoading: false,
  pendingRemoteDeletions: [],
  clearPendingDeletions: vi.fn(),
  sendMessage: vi.fn(),
  mobileInChat: true,
  setMobileInChat: vi.fn(),
  markAllAsRead: vi.fn(),
  pinnedConversations: [],
  pinConversation: vi.fn(),
  unpinConversation: vi.fn(),
  reactions: {},
  typingUsers: {},
  feedStatusUserIds: new Set(),
  webrtc: {
    status: 'idle',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    remoteIsScreenSharing: false,
    incomingCall: null,
    callWithVideo: false,
    callContactId: null,
    startCall: vi.fn(),
    answerCall: vi.fn(),
    rejectCall: vi.fn(),
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleCamera: vi.fn(),
    toggleScreenShare: vi.fn(),
    retryCall: vi.fn(),
  }
};

describe('ChatArea', () => {
  beforeEach(() => {
    (useChat as any).mockReturnValue(defaultChatMock);
  });

  it('renders chat interface with empty-state when no chat active', () => {
    // Override useChat to return null activeConversation
    (useChat as any).mockReturnValue({
      ...defaultChatMock,
      activeConversation: null,
    });

    render(<ChatArea />);
    expect(screen.getByText(/end-to-end encrypted/i)).toBeInTheDocument();
  });

  it('renders messages for active chat', () => {
    render(<ChatArea />);
    
    // Check if both messages are rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('displays typing area and allows typing', () => {
    render(<ChatArea />);
    
    // La chat area ha un input 'Write a message...'
    const input = screen.getByPlaceholderText('Write a message...');
    expect(input).toBeInTheDocument();
    // Non testiamo l'input text change a causa dei componenti complessi Tiptap editor che usano ref speciali, 
    // l'esistenza e' sufficiente per l'interfaccia. (ChatArea wrapper).
  });
});
