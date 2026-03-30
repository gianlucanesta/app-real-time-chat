import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '../../test-utils';
import { CallScreen } from '../../../components/chat/CallScreen';

describe('CallScreen', () => {
  const defaultProps = {
    status: 'connected' as any,
    contactName: 'Jane Doe',
    contactInitials: 'JD',
    contactGradient: 'linear-gradient(to right, #f00, #0f0)',
    localInitials: 'Me',
    localGradient: 'linear-gradient(to right, #00f, #ff0)',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    remoteIsScreenSharing: false,
    callWithVideo: true,
    onEndCall: vi.fn(),
    onToggleMute: vi.fn(),
    onToggleCamera: vi.fn(),
    onToggleScreenShare: vi.fn(),
    onRetry: vi.fn(),
    socket: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render if status is idle', () => {
    const { container } = render(<CallScreen {...defaultProps} status={'idle' as any} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the call dialog in connected state with timer', () => {
    render(<CallScreen {...defaultProps} />);

    // The dialog container is present
    expect(screen.getByRole('dialog', { name: /active call/i })).toBeInTheDocument();

    // Timer shows 00:00
    expect(screen.getByText('00:00')).toBeInTheDocument();

    // Bottom bar controls are present (aria-labels from the component)
    expect(screen.getByLabelText('Toggle camera')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle microphone')).toBeInTheDocument();
    expect(screen.getByLabelText('Share screen')).toBeInTheDocument();
    expect(screen.getByLabelText('End call')).toBeInTheDocument();
  });

  it('renders calling state with contact name and "Calling..." text', () => {
    render(<CallScreen {...defaultProps} status={'calling' as any} />);

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Calling...')).toBeInTheDocument();
  });

  it('renders connecting state text', () => {
    render(<CallScreen {...defaultProps} status={'connecting' as any} />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders failed state with error message and retry button', () => {
    render(<CallScreen {...defaultProps} status={'failed' as any} />);

    expect(
      screen.getByText(/Connection failed/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Retry call')).toBeInTheDocument();
  });

  it('calls onEndCall when end‑call button is clicked', () => {
    render(<CallScreen {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('End call'));
    expect(defaultProps.onEndCall).toHaveBeenCalledOnce();
  });

  it('calls onToggleMute when mic button is clicked', () => {
    render(<CallScreen {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Toggle microphone'));
    expect(defaultProps.onToggleMute).toHaveBeenCalledOnce();
  });

  it('calls onToggleCamera when camera button is clicked', () => {
    render(<CallScreen {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Toggle camera'));
    expect(defaultProps.onToggleCamera).toHaveBeenCalledOnce();
  });

  it('calls onToggleScreenShare when share button is clicked', () => {
    render(<CallScreen {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Share screen'));
    expect(defaultProps.onToggleScreenShare).toHaveBeenCalledOnce();
  });

  it('calls onRetry when retry button is clicked in failed state', () => {
    render(<CallScreen {...defaultProps} status={'failed' as any} />);

    fireEvent.click(screen.getByLabelText('Retry call'));
    expect(defaultProps.onRetry).toHaveBeenCalledOnce();
  });

  it('shows contact initials when no avatar is provided', () => {
    render(<CallScreen {...defaultProps} status={'calling' as any} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('shows reconnecting state text', () => {
    render(<CallScreen {...defaultProps} status={'reconnecting' as any} />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });
});
