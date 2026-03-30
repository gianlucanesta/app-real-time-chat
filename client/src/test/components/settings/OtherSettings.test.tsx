import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { ChatSettings } from '../../../components/settings/ChatSettings';
import { NotificationSettings } from '../../../components/settings/NotificationSettings';
import { VideoVoiceSettings } from '../../../components/settings/VideoVoiceSettings';

const mockUpdateSetting = vi.fn();

// Mock Theme Context
vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'system',
    toggleTheme: vi.fn(),
  }),
}));

// Mock Transcription Context
vi.mock('../../../contexts/TranscriptionContext', () => ({
  useTranscription: () => ({
    modelStatus: 'idle',
    downloadProgress: null,
    webGPUSupported: true,
    transcriptionAvailable: true,
    loadModel: vi.fn().mockResolvedValue(true),
    clearModelCache: vi.fn(),
    cacheSize: 0,
    isModelCached: false,
    refreshCacheInfo: vi.fn(),
  }),
}));

// Mock Settings Context
vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { 
      theme: 'system',
      chatWallpaper: 'default',
      enterToSend: false,
      mediaAutoDownload: 'wifi',
      fontSize: 'medium',
      
      messageNotifications: true,
      groupNotifications: true,
      callNotifications: true,
      notifSendSound: true,
      
      videoLowDataUsage: false,
      videoDefaultCamera: 'front',
    },
    updateSetting: mockUpdateSetting,
    updateSettings: vi.fn(),
  }),
}));

// Mock mediaDevices global
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  configurable: true,
});

describe('ChatSettings', () => {
  it('renders chat settings elements', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Chat Settings')).toBeInTheDocument();
  });

  it('triggers updateSetting when a setting is clicked', () => {
    render(<ChatSettings />);
    // Clicca sul toggle "Enter key to send"
    const enterIsSendToggle = screen.getByRole('switch', { name: /Enter key to send/i });
    fireEvent.click(enterIsSendToggle);
    expect(mockUpdateSetting).toHaveBeenCalledWith('enterToSend', true);
  });
});

describe('NotificationSettings', () => {
  it('renders notification sections', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Messages')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Calls')).toBeInTheDocument();
  });

  it('toggles sent message sounds', () => {
    render(<NotificationSettings />);
    const soundToggle = screen.getByRole('switch', { name: /Play sound on sent messages/i });
    expect(soundToggle).toBeChecked(); // because default we mocked to true
    
    fireEvent.click(soundToggle);
    expect(mockUpdateSetting).toHaveBeenCalledWith('notifSendSound', false);
  });
});

describe('VideoVoiceSettings', () => {
  it('renders media devices settings', () => {
    render(<VideoVoiceSettings />);
    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Microphone')).toBeInTheDocument();
  });

  it('provides test speaker functionality', () => {
    render(<VideoVoiceSettings />);
    const testBtn = screen.getByRole('button', { name: /Test Speakers/i });
    expect(testBtn).toBeInTheDocument();
  });
});
