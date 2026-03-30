import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import { Skeleton, ConversationSkeleton, SidebarSkeleton } from '../../../components/ui/Skeleton';

describe('Skeletons', () => {
  describe('Skeleton', () => {
    it('renders with appropriate accessible attributes', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('merges custom classnames properly', () => {
      render(<Skeleton className="w-10 h-10 custom-skel" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('w-10', 'h-10', 'custom-skel', 'animate-pulse');
    });
  });

  describe('ConversationSkeleton', () => {
    it('renders as hidden placeholder', () => {
      render(<ConversationSkeleton />);
      // Può essere testato cercando classi o struttura generica, essendo elementi decorativi.
      const container = document.querySelector('.flex.items-center.gap-3');
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('SidebarSkeleton', () => {
    it('renders correct number of children based on count prop', () => {
      render(<SidebarSkeleton count={3} />);
      const container = screen.getByRole('status', { name: /loading conversations/i });
      expect(container).toBeInTheDocument();
      
      const elements = document.querySelectorAll('.flex.items-center.gap-3');
      expect(elements).toHaveLength(3);
    });

    it('defaults to count 6', () => {
      render(<SidebarSkeleton />);
      const elements = document.querySelectorAll('.flex.items-center.gap-3');
      expect(elements).toHaveLength(6);
    });
  });
});
