import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { PrivacySettings } from '../../../components/settings/PrivacySettings';

const mockUpdateSetting = vi.fn();

// Mock API
vi.mock('../../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ settings: {} }),
}));

// Mock Settings Context
vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { 
      privacyLastSeen: 'everyone',
      privacyProfilePhoto: 'everyone',
      privacyInfo: 'everyone',
      privacyStatus: 'contacts',
      privacyReadReceipts: true
    },
    updateSetting: mockUpdateSetting,
  }),
}));

describe('PrivacySettings', () => {
  it('renders main privacy links', () => {
    render(<PrivacySettings />);
    expect(screen.getByText(/Last Seen & Online/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile Photo/i)).toBeInTheDocument();
    expect(screen.getByText(/Disappearing Messages/i)).toBeInTheDocument();
  });

  it('navigates to Last Seen sub-view and updates state', () => {
    render(<PrivacySettings />);
    fireEvent.click(screen.getByText(/Last Seen & Online/i));
    
    // Controlla il titolo della sottonavigazione
    expect(screen.getByText('Who can see my last seen')).toBeInTheDocument();
    
    // Tutti gli option radio text
    expect(screen.getAllByText('Everyone').length).toBeGreaterThan(0);
    expect(screen.getByText('Nobody')).toBeInTheDocument();
    
    // Cliccare radio -> scatena updateSetting mock
    fireEvent.click(screen.getByText('Nobody'));
    expect(mockUpdateSetting).toHaveBeenCalledWith('privacyLastSeen', 'nobody');
  });

  it('navigates back to main privacy menu', () => {
    render(<PrivacySettings />);
    fireEvent.click(screen.getByText(/Last Seen & Online/i));
    
    const backBtn = screen.getByRole('button', { name: /Last Seen & Online/i });
    fireEvent.click(backBtn);
    
    // Assicurati che l'opzione "Disappearing Messages" della vista principale sia visibile di nuovo
    expect(screen.getByText(/Disappearing Messages/i)).toBeInTheDocument();
  });

  it('renders Read Receipts toggle state', () => {
    render(<PrivacySettings />);
    // Read Receipts non apre viste secondarie e ha un toggle direttamente
    expect(screen.getByText('Read Receipts')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: /Read receipts/i });
    expect(toggle).toBeChecked();
  });
});
