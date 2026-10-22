import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdvancedVoiceMode from './AdvancedVoiceMode';

describe('AdvancedVoiceMode', () => {
    it('stays unmounted while closed and opens on an empty session', () => {
        const onClose = vi.fn();
        const { rerender } = render(<AdvancedVoiceMode isOpen={false} onClose={onClose} />);

        expect(screen.queryByText('Gemini Live Voice')).toBeNull();

        rerender(<AdvancedVoiceMode isOpen onClose={onClose} />);

        expect(screen.getByText('Gemini Live Voice')).toBeTruthy();
        expect(screen.getByText(/Tap the orb below to begin/)).toBeTruthy();
    });

    it('clears the session again when the panel is reopened', () => {
        const onClose = vi.fn();
        const { rerender } = render(<AdvancedVoiceMode isOpen onClose={onClose} />);

        rerender(<AdvancedVoiceMode isOpen={false} onClose={onClose} />);
        expect(screen.queryByText('Gemini Live Voice')).toBeNull();

        rerender(<AdvancedVoiceMode isOpen onClose={onClose} />);
        expect(screen.getByText(/Tap the orb below to begin/)).toBeTruthy();
        expect(screen.queryByText('user message')).toBeNull();
    });
});
