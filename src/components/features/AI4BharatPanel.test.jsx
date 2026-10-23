import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AI4BharatPanel from './AI4BharatPanel';

describe('AI4BharatPanel', () => {
    it('names the icon-only close control', () => {
        render(<AI4BharatPanel isOpen onClose={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Close AI4Bharat' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'AI4Bharat' })).toBeTruthy();
    });
});
