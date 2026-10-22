import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GrammarlyQuillbotPanel from './GrammarlyQuillbotPanel';

const renderPanel = () => render(<GrammarlyQuillbotPanel isOpen onClose={vi.fn()} />);

const button = (name) => screen.getByRole('button', { name });

describe('GrammarlyQuillbotPanel', () => {
    it('renders nothing while closed', () => {
        const { container } = render(<GrammarlyQuillbotPanel isOpen={false} onClose={vi.fn()} />);
        expect(container.innerHTML).toBe('');
    });

    it('resets the writing mode when the tool changes', () => {
        renderPanel();

        fireEvent.click(button('Creative'));
        expect(button('Creative').className).toContain('bg-indigo-600');

        fireEvent.click(button('Grammar Checker'));
        expect(screen.queryByRole('button', { name: 'Creative' })).toBeNull();

        fireEvent.click(button('Paraphraser'));
        expect(button('Standard').className).toContain('bg-indigo-600');
        expect(button('Creative').className).not.toContain('bg-indigo-600');

        fireEvent.click(button('Creative'));
        fireEvent.click(button('Summarizer'));
        expect(button('Paragraph').className).toContain('bg-indigo-600');
        expect(screen.queryByRole('button', { name: 'Creative' })).toBeNull();
    });
});
