import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GrokipediaPanel from './GrokipediaPanel';

describe('GrokipediaPanel', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('shows saved searches loaded during the initial render', () => {
        localStorage.setItem('grokipedia-history-v3', JSON.stringify(['quantum computing', 'drexel']));
        render(<GrokipediaPanel isOpen onClose={vi.fn()} />);

        fireEvent.focus(screen.getByPlaceholderText('Search anything...'));

        expect(screen.getByText('quantum computing')).toBeTruthy();
        expect(screen.getByText('drexel')).toBeTruthy();
    });

    it('ignores unreadable history instead of crashing', () => {
        localStorage.setItem('grokipedia-history-v3', '{not-json');
        render(<GrokipediaPanel isOpen onClose={vi.fn()} />);

        expect(screen.getByPlaceholderText('Search anything...')).toBeTruthy();
        fireEvent.focus(screen.getByPlaceholderText('Search anything...'));
        expect(screen.queryByText('Recent Searches')).toBeNull();
    });
});
