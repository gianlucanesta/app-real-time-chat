import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../test-utils';
import EphemeralBrand from '../../../components/ui/EphemeralBrand';

describe('EphemeralBrand', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<EphemeralBrand />);
    // Verifica che l'intero componente esista
    expect(screen.getByLabelText('Ephemeral')).toBeInTheDocument();
  });

  it('renders all letters independently', () => {
    render(<EphemeralBrand />);
    
    // Controlla il numero di lettere nel DOM
    const letters = document.querySelectorAll('.ephemeral-letter');
    expect(letters).toHaveLength(9); // "Ephemeral" length
    
    expect(letters[0]).toHaveTextContent('E');
    expect(letters[8]).toHaveTextContent('l');
  });

  it('initializes letters as invisible and scaled/translated', () => {
    render(<EphemeralBrand />);
    
    const letters = document.querySelectorAll('.ephemeral-letter') as NodeListOf<HTMLElement>;
    expect(letters[0].style.opacity).toBe('0');
  });

  it('progresses animations through time', () => {
    render(<EphemeralBrand />);
    
    const letters = document.querySelectorAll('.ephemeral-letter') as NodeListOf<HTMLElement>;
    
    // Avanza il timer per permettere la visibilità della prima lettera
    vi.advanceTimersByTime(200); 
    
    // La prima lettera dovrebbe aver ricevuto la modifica all'opacità
    expect(letters[0].style.opacity).toBe('1');
  });
});
