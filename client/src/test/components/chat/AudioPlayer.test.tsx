import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { AudioPlayer } from '../../../components/chat/AudioPlayer';
import WaveSurfer from 'wavesurfer.js';

// Mock WaveSurfer
vi.mock('wavesurfer.js', () => {
  const wsMock = {
    load: vi.fn(),
    on: vi.fn(),
    getDuration: vi.fn().mockReturnValue(120),
    getCurrentTime: vi.fn().mockReturnValue(0),
    playPause: vi.fn(),
    setPlaybackRate: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    default: {
      create: vi.fn().mockReturnValue(wsMock),
    },
  };
});

describe('AudioPlayer', () => {
  let wsMockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    wsMockInstance = WaveSurfer.create({ container: document.body });
    // resetting the create mock so we can capture the actual instance returned to the component
    (WaveSurfer.create as any).mockReturnValue(wsMockInstance);
  });

  const triggerEvent = (eventName: string, ...args: any[]) => {
    const call = wsMockInstance.on.mock.calls.find((c: any) => c[0] === eventName);
    if (call && call[1]) {
      call[1](...args);
    }
  };

  it('renders correctly and initializes WaveSurfer', () => {
    render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} />);
    
    expect(WaveSurfer.create).toHaveBeenCalled();
    expect(wsMockInstance.load).toHaveBeenCalledWith('test-audio.mp3');
    
    // Check time label (formatTime(120) = 2:00)
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('toggles play/pause state when clicking the button', () => {
    render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} />);
    
    const playButton = screen.getByRole('button');
    fireEvent.click(playButton);

    expect(wsMockInstance.playPause).toHaveBeenCalled();

    // Trigger play event
    triggerEvent('play');
    
    // the avatar should be replaced with speed badge once interaction started
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('updates current time based on timeupdate event', () => {
    render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} />);
    
    // simulate play
    triggerEvent('play');
    
    wsMockInstance.getCurrentTime.mockReturnValue(65); // 1:05
    triggerEvent('timeupdate');

    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('cycles playback speed on badge click', () => {
    render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} />);
    
    triggerEvent('play');
    
    const speedBadge = screen.getByText('1x');
    fireEvent.click(speedBadge);
    
    expect(wsMockInstance.setPlaybackRate).toHaveBeenCalledWith(1.5);
    expect(screen.getByText('1.5x')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('1.5x'));
    expect(wsMockInstance.setPlaybackRate).toHaveBeenCalledWith(2);
    expect(screen.getByText('2x')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('2x'));
    expect(wsMockInstance.setPlaybackRate).toHaveBeenCalledWith(1);
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('handles finish event correctly', () => {
    const onFinishMock = vi.fn();
    render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} onFinish={onFinishMock} />);
    
    triggerEvent('play');
    wsMockInstance.getCurrentTime.mockReturnValue(120);
    triggerEvent('timeupdate');
    
    expect(screen.getByText('2:00')).toBeInTheDocument();
    
    triggerEvent('finish');
    
    expect(onFinishMock).toHaveBeenCalled();
    // After finish, time is reset to total duration since hasInteracted becomes false due to isPlaying=false and currentTime=0
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('destroys wavesurfer instance on unmount', () => {
    const { unmount } = render(<AudioPlayer src="test-audio.mp3" isSent={true} duration={120} />);
    unmount();
    expect(wsMockInstance.destroy).toHaveBeenCalled();
  });
});
