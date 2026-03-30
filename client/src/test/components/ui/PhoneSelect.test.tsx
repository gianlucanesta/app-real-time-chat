import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test-utils';
import { PhoneSelect } from '../../../components/ui/PhoneSelect';

const mockOptions = [
  { code: '+39', label: 'Italy' },
  { code: '+1', label: 'United States' },
  { code: '+44', label: 'United Kingdom' }
];

describe('PhoneSelect', () => {
  it('renders default box variant correctly', () => {
    render(<PhoneSelect options={mockOptions} value="+39" onChange={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('+39');
    expect(button).toHaveClass('bg-input'); // box variant
  });

  it('renders flat variant correctly', () => {
    render(<PhoneSelect variant="flat" options={mockOptions} value="+1" onChange={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('+1');
    expect(button).toHaveClass('bg-transparent', 'border-b'); // flat variant
  });

  it('opens and closes dropdown correctly', () => {
    render(<PhoneSelect options={mockOptions} value="+39" onChange={() => {}} />);
    const button = screen.getByRole('button');
    
    // Verify initially closed or visually hidden via opacity (the component renders it in DOM but scales it)
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveClass('opacity-0');
    
    fireEvent.click(button);
    expect(listbox).toHaveClass('opacity-100'); // Check if classes change
    
    // Check if options are present
    const optionsList = screen.getAllByRole('option');
    expect(optionsList).toHaveLength(3);
    
    expect(optionsList[0]).toHaveTextContent('Italy');
    expect(optionsList[1]).toHaveTextContent('United States');
  });

  it('calls onChange with selected code', () => {
    const handleChange = vi.fn();
    render(<PhoneSelect options={mockOptions} value="+39" onChange={handleChange} />);
    
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('option', { selected: false, name: /united states/i }));
    
    expect(handleChange).toHaveBeenCalledWith('+1');
  });
});
