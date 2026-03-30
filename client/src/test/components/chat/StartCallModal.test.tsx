import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '../../test-utils';
import { StartCallModal } from '../../../components/chat/StartCallModal';
import { useChat } from '../../../contexts/ChatContext';
import { useAuth } from '../../../contexts/AuthContext';

// Mock contexts
vi.mock('../../../contexts/ChatContext', () => ({
  useChat: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockConversations = [
  {
    id: 'c1',
    type: 'direct',
    name: 'Alice',
    participants: ['me', 'alice-id'],
    gradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
    initials: 'AL',
    isOnline: true,
  },
  {
    id: 'c2',
    type: 'direct',
    name: 'Bob',
    participants: ['me', 'bob-id'],
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    initials: 'BO',
    isOnline: false,
  },
  {
    id: 'c3',
    type: 'group',
    name: 'Dev Team',
    participants: ['me', 'alice-id', 'bob-id'],
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    initials: 'DT',
    isOnline: false,
  },
];

describe('StartCallModal', () => {
  const onClose = vi.fn();
  const onStartCall = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useChat as any).mockReturnValue({ conversations: mockConversations });
    (useAuth as any).mockReturnValue({ user: { id: 'me' } });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <StartCallModal open={false} onClose={onClose} onStartCall={onStartCall} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal header and title', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );
    expect(screen.getByText('Start a call')).toBeInTheDocument();
  });

  it('shows only direct conversations (filters out groups)', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Dev Team')).not.toBeInTheDocument();
  });

  it('filters contacts by search input', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    const searchInput = screen.getByPlaceholderText('Search contacts...');
    fireEvent.change(searchInput, { target: { value: 'ali' } });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('shows "No contacts found" when search matches nobody', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    const searchInput = screen.getByPlaceholderText('Search contacts...');
    fireEvent.change(searchInput, { target: { value: 'xyzxyz' } });

    expect(screen.getByText('No contacts found')).toBeInTheDocument();
  });

  it('calls onStartCall with correct args when a contact is clicked', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    // Default call type is "video"
    fireEvent.click(screen.getByText('Alice'));

    expect(onStartCall).toHaveBeenCalledWith('alice-id', true);
    expect(onClose).toHaveBeenCalled();
  });

  it('switches call type and passes voice flag correctly', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    // Switch to voice
    fireEvent.click(screen.getByText('Voice'));
    fireEvent.click(screen.getByText('Bob'));

    expect(onStartCall).toHaveBeenCalledWith('bob-id', false);
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows Online status indicator for online contacts', () => {
    render(
      <StartCallModal open={true} onClose={onClose} onStartCall={onStartCall} />,
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
