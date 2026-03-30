import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { Select } from '../../../components/ui/select';

const mockOptions = [
  { value: 'it', label: 'Italian' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French', disabled: true },
];

describe('Select', () => {
  it('renders correctly with initial value', () => {
    render(<Select options={mockOptions} value="en" onChange={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('English');
  });

  it('opens dropdown on click', () => {
    render(<Select options={mockOptions} value="en" onChange={() => {}} />);
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    // Check if dropdown options are visible
    expect(screen.getByText('Italian')).toBeInTheDocument();
    expect(screen.getAllByText('English').length).toBeGreaterThan(0);
    expect(screen.getByText('French')).toBeInTheDocument();
  });

  it('selects an option and calls onChange', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} value="en" onChange={handleChange} />);
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    const optionItalian = screen.getByText('Italian');
    fireEvent.click(optionItalian);
    
    expect(handleChange).toHaveBeenCalledWith('it');
  });

  it('does not allow selecting disabled options', () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} value="en" onChange={handleChange} />);
    
    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    
    const optionFrench = screen.getByText('French');
    fireEvent.click(optionFrench);
    
    // Assicurarsi che onClick non chiami l'onChange se disabilitato
    expect(handleChange).not.toHaveBeenCalled();
    expect(optionFrench).toBeDisabled();
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside Click Area</div>
        <Select options={mockOptions} value="en" onChange={() => {}} />
      </div>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Italian')).toBeInTheDocument(); // Opened
    
    fireEvent.mouseDown(screen.getByTestId('outside'));
    
    await waitFor(() => {
      expect(screen.queryByText('Italian')).not.toBeInTheDocument();
    });
  });
});
