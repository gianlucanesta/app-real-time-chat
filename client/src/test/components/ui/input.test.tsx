import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { Input } from '../../../components/ui/input';

describe('Input', () => {
  it('renders default input correctly', () => {
    render(<Input placeholder="Type here" />);
    const inputElement = screen.getByPlaceholderText(/type here/i);
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveClass('bg-transparent', 'text-[14px]', 'w-full');
  });

  it('handles user typing', () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type here" onChange={handleChange} />);
    const inputElement = screen.getByPlaceholderText(/type here/i) as HTMLInputElement;
    
    fireEvent.change(inputElement, { target: { value: 'Hello' } });
    expect(inputElement.value).toBe('Hello');
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders icons if provided', () => {
    const dummyIcon = <span data-testid="left-icon">🔍</span>;
    const dummyRightIcon = <span data-testid="right-icon">✕</span>;
    
    render(<Input placeholder="Search" icon={dummyIcon} rightIcon={dummyRightIcon} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies error styles correctly', () => {
    render(<Input placeholder="Email" error />);
    // The wrapper div should have the error classes
    const inputWrapper = screen.getByPlaceholderText('Email').parentElement;
    expect(inputWrapper).toHaveClass('border-danger', 'focus-within:border-danger');
    expect(inputWrapper).not.toHaveClass('border-border', 'focus-within:border-accent');
  });

  it('respects disabled attribute state', () => {
    render(<Input placeholder="Disabled" disabled />);
    const inputElement = screen.getByPlaceholderText(/disabled/i);
    expect(inputElement).toBeDisabled();
    expect(inputElement).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('can be associated with label using id', () => {
    render(
      <div>
        <label htmlFor="test-input">Test Label</label>
        <Input id="test-input" />
      </div>
    );
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });
});
