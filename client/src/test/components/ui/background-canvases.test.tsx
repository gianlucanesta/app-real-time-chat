import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../test-utils';
import { DottedGlowBackground } from '../../../components/ui/dotted-glow-background';
import { EvervaultBackground } from '../../../components/ui/evervault-background';

describe('Background Canvases', () => {
  beforeEach(() => {
    // Mock getContext of Canvas
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      }),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
    } as any);
  });

  describe('DottedGlowBackground', () => {
    it('renders the canvas within a container without crashing', () => {
      const { container } = render(<DottedGlowBackground className="test-bg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('test-bg');
      
      const canvas = wrapper.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('EvervaultBackground', () => {
    it('renders the canvas without crashing', () => {
      const { container } = render(<EvervaultBackground className="ev-bg" />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('ev-bg');
      
      const canvas = wrapper.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});
