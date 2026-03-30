import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import { VerticalNav } from '../../../components/layout/VerticalNav';

// Mock Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className, to }: any) => <a href={to} className={className} data-testid="nav-link">{children}</a>,
  useLocation: () => ({ pathname: '/' }),
}));

// Mock Contexts
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'John Doe', avatarUrl: null, avatarGradient: null },
  }),
}));

vi.mock('../../../contexts/ChatContext', () => ({
  useChat: () => ({
    mobileInChat: false,
    conversations: [
      { unreadCount: 2 },
      { unreadCount: 3 }
    ],
  }),
}));

describe('VerticalNav', () => {
  it('renders both desktop and mobile navigations', () => {
    const { container } = render(<VerticalNav />);
    // Verifica che due nav esistano (una per desktop e una per mobile, definite con classi tailwind hidden md:flex e md:hidden)
    const navs = container.querySelectorAll('nav');
    expect(navs.length).toBe(2);
  });

  it('renders links with correct active states', () => {
    render(<VerticalNav />);
    const links = screen.getAllByTestId('nav-link');
    // Il primo dovrebbe essere la Chat ("/") che `useLocation` definisce come attivo
    const activeChatsLink = links[0]; // first one is desktop chats link
    expect(activeChatsLink).toHaveClass('text-accent');
  });

  it('calculates and displays sum of unread messages badge', () => {
    render(<VerticalNav />);
    // La somma di unreadCount è 2 + 3 = 5. Sarà visibile sia in mobile che desktop badge
    const badges = screen.getAllByText('5');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0]).toHaveClass('bg-accent', 'text-white');
  });

  it('generates profile initials when avatar is missing', () => {
    render(<VerticalNav />);
    const initialsElement = screen.getAllByText('JD');
    expect(initialsElement.length).toBeGreaterThanOrEqual(1);
  });
});
