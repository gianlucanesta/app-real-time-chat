import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { AccountSettings } from '../../../components/settings/AccountSettings';

// Mock Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock API
vi.mock('../../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));

// Mock Settings Context
vi.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { securityNotifications: false },
    updateSetting: vi.fn(),
  }),
}));

// Mock Auth Context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

describe('AccountSettings', () => {
  it('renders main list items', () => {
    render(<AccountSettings />);
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Request Account Info')).toBeInTheDocument();
    expect(screen.getByText('Delete My Account')).toBeInTheDocument();
  });

  it('navigates to Security sub-view', () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Security'));
    expect(screen.getByText('End-to-End Encryption')).toBeInTheDocument();
  });

  it('navigates back from sub-view', () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Security'));
    // Trova il pulsante indietro
    const backButton = screen.getByRole('button', { name: /security/i });
    fireEvent.click(backButton);
    expect(screen.queryByText('End-to-End Encryption')).not.toBeInTheDocument();
    expect(screen.getByText('Request Account Info')).toBeInTheDocument();
  });

  it('shows Delete Account modal safely', () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Delete My Account'));
    
    // Verifica che mostri l'avviso e l'input text
    expect(screen.getByText('This action is permanent')).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/Type the confirmation text/i);
    expect(input).toBeInTheDocument();
    
    const deleteBtn = screen.getByRole('button', { name: /Delete My Account/i });
    expect(deleteBtn).toBeDisabled();
    
    // Typing the correct confirmation text enables the button
    fireEvent.change(input, { target: { value: "yes I'm sure, I want to delete my account" } });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('requests account report successfully', async () => {
    render(<AccountSettings />);
    fireEvent.click(screen.getByText('Request Account Info'));
    
    const requestButtons = screen.getAllByRole('button', { name: /Request Report/i }); // One for data, one for channels
    fireEvent.click(requestButtons[0]);
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Request Submitted/i }).length).toBeGreaterThan(0);
    });
  });
});
