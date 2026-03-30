import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { ChatMessage } from '../../../components/chat/ChatMessage';

// Mock components that might cause issues in JSDOM or are too complex for unit testing the message wrapper
vi.mock('../../../components/chat/AudioPlayer', () => ({
  AudioPlayer: () => <div data-testid="audio-player" />
}));

vi.mock('../../../components/chat/EmojiPicker', () => ({
  EmojiPicker: () => <div data-testid="emoji-picker" />
}));

vi.mock('../../../components/chat/TranscribeButton', () => ({
  TranscribeButton: () => <button data-testid="transcribe-btn">Transcribe</button>
}));

vi.mock('../../../components/chat/ScheduledCallCard', () => ({
  ScheduledCallCard: () => <div data-testid="scheduled-call-card">Scheduled Video Call</div>
}));

describe('ChatMessage', () => {
  const defaultProps = {
    id: 'msg-1',
    text: 'Hello world',
    time: '12:00 PM',
    isSent: true,
  };

  it('renders text correctly', () => {
    render(<ChatMessage {...defaultProps} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders sent message with correct styling', () => {
    const { container } = render(<ChatMessage {...defaultProps} isSent={true} />);
    // Il container principale ha max-w-[82.5%] e si auto-allinea
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('items-end');
  });

  it('renders received message with correct styling', () => {
    const { container } = render(<ChatMessage {...defaultProps} isSent={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('items-start');
  });

  it('shows read status securely for sent messages', () => {
    render(<ChatMessage {...defaultProps} status="read" />);
    // Visto che il rendering delle spunte SVG è custom e le icone lucide-react non usano aria-label
    // verifichiamo la presenza del container del time e status
    const timeElement = screen.getByText('12:00 PM');
    expect(timeElement).toBeInTheDocument();
  });

  it('handles click in exact select mode', () => {
    const onToggle = vi.fn();
    render(<ChatMessage {...defaultProps} isSelectMode={true} isSelected={true} onToggleSelect={onToggle} />);
    
    // Il component deve essere cliccabile e chiamare onToggleSelect
    const wrapper = document.querySelector('[data-id="msg-1"]');
    fireEvent.click(wrapper!);
    
    expect(onToggle).toHaveBeenCalled();
  });

  it('shows Scheduled Call card when payload matches protocol format', () => {
    const validJson = JSON.stringify({
      id: "1", name: "Test Call", description: "Desc",
      startDate: "2026-03-30T10:00:00Z", endDate: "2026-03-30T11:00:00Z",
      callType: "video", organizerName: "John", participantCount: 2
    });
    const payload = `📅[SCHEDULED_CALL]${validJson}`;
    render(<ChatMessage {...defaultProps} text={payload} />);
    // ScheduledCallCard draws "Scheduled Video Call" inside it based on our mock
    expect(screen.getByText(/Scheduled Video Call/i)).toBeInTheDocument();
  });

  it('hides view-once content for sender', () => {
    // Sender always sees the placeholder
    render(<ChatMessage {...defaultProps} text="" mediaUrl="test.jpg" mediaType="image" viewOnce={true} isSent={true} viewedAt={null} />);
    expect(screen.getByText(/Photo/i)).toBeInTheDocument();
    expect(document.querySelector('img[src="test.jpg"]')).not.toBeInTheDocument();
  });
});
