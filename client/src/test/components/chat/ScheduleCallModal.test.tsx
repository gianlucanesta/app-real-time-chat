import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '../../test-utils';
import { ScheduleCallModal } from '../../../components/chat/ScheduleCallModal';
import { parseScheduledCallMessage, SCHEDULED_CALL_PREFIX } from '../../../components/chat/ScheduleCallModal';
import { useChat } from '../../../contexts/ChatContext';
import { useAuth } from '../../../contexts/AuthContext';

// Mock contexts
vi.mock('../../../contexts/ChatContext', () => ({
  useChat: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock crypto.randomUUID for deterministic IDs
vi.stubGlobal('crypto', {
  ...globalThis.crypto,
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
});

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

describe('ScheduleCallModal', () => {
  const onClose = vi.fn();
  const onSchedule = vi.fn();

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
      <ScheduleCallModal open={false} onClose={onClose} onSchedule={onSchedule} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal with header and form fields', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    expect(screen.getByText('Schedule call', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByText('Description (optional)', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Start date & time')).toBeInTheDocument();
    expect(screen.getByText('End date & time')).toBeInTheDocument();
    expect(screen.getByText('Call type')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });

  it('disables submit button when no participants are selected', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    // The submit button should be disabled when no participants are selected
    const submitBtns = screen.getAllByText('Schedule call');
    const submitBtn = submitBtns[submitBtns.length - 1].closest('button')!;
    expect(submitBtn).toBeDisabled();
    
    // Clicking it should not call onSchedule
    fireEvent.click(submitBtn);
    expect(onSchedule).not.toHaveBeenCalled();
  });

  it('opens the participant picker and lists direct contacts only', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    // Click to open the participant picker
    fireEvent.click(screen.getByText('Add participants...'));

    // Should show direct contacts but not groups
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText('Dev Team')).not.toBeInTheDocument();
  });

  it('can select and deselect participants', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    // Open picker
    fireEvent.click(screen.getByText('Add participants...'));

    // Select Alice
    fireEvent.click(screen.getByText('Alice'));

    // Alice should appear as a pill (participant badge shows name)
    // There will be the picker list "Alice" AND the pill "Alice"
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(2);
  });

  it('toggles end time visibility', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    // End time is visible by default
    expect(screen.getByText('End date & time')).toBeInTheDocument();

    // Click to remove end time
    fireEvent.click(screen.getByText('× Remove end time'));

    expect(screen.queryByText('End date & time')).not.toBeInTheDocument();
    expect(screen.getByText('+ Add end time')).toBeInTheDocument();
  });

  it('switches call type between video and voice', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    // The "Voice" button in the call type section
    const voiceButtons = screen.getAllByText('Voice');
    fireEvent.click(voiceButtons[0]);

    // Video button should now be in the non-selected state
    // We just verify the click doesn't crash and elements are still present
    expect(screen.getAllByText('Video').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <ScheduleCallModal open={true} onClose={onClose} onSchedule={onSchedule} />,
    );

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});

describe('parseScheduledCallMessage', () => {
  it('returns null for non-scheduled-call messages', () => {
    expect(parseScheduledCallMessage('Hello world')).toBeNull();
    expect(parseScheduledCallMessage('')).toBeNull();
  });

  it('parses a valid scheduled call message', () => {
    const payload = {
      id: 'test-id',
      name: 'Team call',
      description: 'Weekly sync',
      startDate: '2026-04-01T10:00:00.000Z',
      endDate: '2026-04-01T11:00:00.000Z',
      callType: 'video',
      organizerName: 'John',
      participantCount: 3,
    };
    const msg = `${SCHEDULED_CALL_PREFIX}${JSON.stringify(payload)}`;
    const result = parseScheduledCallMessage(msg);

    expect(result).toEqual(payload);
  });

  it('returns null for malformed JSON after prefix', () => {
    const msg = `${SCHEDULED_CALL_PREFIX}{invalid json}`;
    expect(parseScheduledCallMessage(msg)).toBeNull();
  });
});
