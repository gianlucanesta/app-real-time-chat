import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test-utils';
import { Label } from '../../../components/ui/label';

describe('Label', () => {
  it('renders label text correctly', () => {
    render(<Label>My Label</Label>);
    expect(screen.getByText('My Label')).toBeInTheDocument();
    expect(screen.getByText('My Label').tagName).toBe('LABEL');
  });

  it('applies basic correct text styling', () => {
    render(<Label>Styled Label</Label>);
    const labelElement = screen.getByText('Styled Label');
    expect(labelElement).toHaveClass('text-[11px]', 'font-medium', 'uppercase', 'tracking-[1px]');
  });

  it('accepts additional classes via className', () => {
    render(<Label className="custom-class-123 text-blue-500">Custom</Label>);
    expect(screen.getByText('Custom')).toHaveClass('custom-class-123', 'text-blue-500');
  });

  it('links correctly with an input using htmlFor', () => {
    render(
      <div>
        <Label htmlFor="my-input">Linked Label</Label>
        <input id="my-input" type="text" />
      </div>
    );
    // Assicuriamoci che getByLabelText funzioni grazie all'attributo htmlFor
    expect(screen.getByLabelText('Linked Label')).toBeInTheDocument();
  });
});
