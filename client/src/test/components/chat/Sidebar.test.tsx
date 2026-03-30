import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Sidebar } from '../../../components/chat/Sidebar';

// Mock the child panels which are complex to isolate unit tests
vi.mock('../../../components/chat/NewChatPanel', () => ({
  NewChatPanel: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="new-chat-panel">
      <button onClick={onClose}>Close New Chat</button>
    </div>
  ) : null
}));

vi.mock('../../../components/chat/NewContactPanel', () => ({
  NewContactPanel: () => null
}));

vi.mock('../../../components/chat/NewGroupPanel', () => ({
  NewGroupPanel: () => null
}));

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

// Mock Contexts and Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', displayName: 'John' } }),
}));

vi.mock('../../../contexts/ChatContext', () => ({
  useChat: () => ({
    conversations: [
      { 
        id: 'c1', 
        type: 'direct', 
        name: 'Jane', 
        avatar: undefined,
        gradient: 'linear-gradient(135deg, #123, #456)',
        initials: 'JA',
        participants: ['u2'], 
        lastMessage: 'Hello',
        unreadCount: 0 
      }
    ],
    activeChat: null,
    setActiveChat: vi.fn(),
    isUserOnline: vi.fn().mockReturnValue(true),
    getUserLastSeen: vi.fn().mockReturnValue(null),
    typingUsers: {},
    pinnedConversations: [],
    pinConversation: vi.fn(),
    unpinConversation: vi.fn(),
    feedStatusUserIds: new Set(),
  }),
}));

vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { theme: 'system' }
  }),
}));

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light'
  }),
}));

vi.mock('../../../contexts/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
    onlineUsers: new Set(),
  })
}));

describe('Sidebar', () => {
  it('renders chat list correctly', () => {
    // Il mock in test-utils.tsx mocka "useChat" con un paio di conversazioni.
    render(<Sidebar />);
    
    // Controlla che il titolo Chat ci sia
    expect(screen.getByText('Chat')).toBeInTheDocument();
    
    // Controlla che le icone top right esistano (New Chat ecc)
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    
    // Controlla che una conversazione sia renderizzata (da mock)
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('filters conversations by search query', async () => {
    render(<Sidebar />);
    
    // Troviamo l'input di ricerca e scriviamo
    const searchInput = screen.getByPlaceholderText(/Search conversations/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Verifica che mostri il messaggio "no conversations found"
    expect(screen.getByText(/No conversations found/i)).toBeInTheDocument();
  });

  it('opens and closes NewChatPanel', () => {
    render(<Sidebar />);
    
    // Inizialmente non mostrato
    expect(screen.queryByTestId('new-chat-panel')).not.toBeInTheDocument();
    
    // Clicca icona New Chat
    fireEvent.click(screen.getByRole('button', { name: /new chat/i }));
    
    // Ora deve esserci
    expect(screen.getByTestId('new-chat-panel')).toBeInTheDocument();
    
    // Chiudi il panel
    fireEvent.click(screen.getByText('Close New Chat'));
    expect(screen.queryByTestId('new-chat-panel')).not.toBeInTheDocument();
  });
});
