import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Button } from '../../../components/ui/button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles clicks', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders disabled state correctly', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const buttonElement = screen.getByRole('button', { name: /disabled/i });
    
    expect(buttonElement).toBeDisabled();
    
    // Non dovrebbe scatenare l'evento di click
    fireEvent.click(buttonElement);
    expect(handleClick).not.toHaveBeenCalled();
    
    // Verifica le classi css disabilitate
    expect(buttonElement).toHaveClass('disabled:pointer-events-none');
    expect(buttonElement).toHaveClass('disabled:opacity-50');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="outline">Outline</Button>);
    let btn = screen.getByRole('button');
    expect(btn).toHaveClass('border-border', 'bg-transparent');

    rerender(<Button variant="ghost">Ghost</Button>);
    btn = screen.getByRole('button');
    expect(btn).toHaveClass('hover:bg-input', 'text-text-secondary');
    
    rerender(<Button variant="social">Social</Button>);
    btn = screen.getByRole('button');
    expect(btn).toHaveClass('bg-input', 'border-border', 'hover:bg-border');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    let btn = screen.getByRole('button');
    expect(btn).toHaveClass('px-5', 'py-2', 'h-auto', 'text-[13px]');

    rerender(<Button size="icon">Icon</Button>);
    btn = screen.getByRole('button');
    expect(btn).toHaveClass('h-8', 'w-8', 'rounded-md');
  });

  it('renders asChild using Slot correctly', () => {
    render(
      <Button asChild>
        <a href="https://example.com" data-testid="as-child-link">
          Link Button
        </a>
      </Button>
    );
    
    const linkElement = screen.getByTestId('as-child-link');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe('A');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    
    // Non dovrebbe esserci un tag button attorno
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    
    // Verifica che abbia esportato le classi del Button
    expect(linkElement).toHaveClass('h-[44px]', 'px-6', 'w-full');
  });
});
