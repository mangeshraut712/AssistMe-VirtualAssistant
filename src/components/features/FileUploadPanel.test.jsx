import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FileUploadPanel from './FileUploadPanel';

describe('FileUploadPanel', () => {
    it('keeps files chosen in chat and reports the HTTP error instead of an empty result', async () => {
        const onFileProcess = vi.fn();
        vi.stubGlobal('fetch', vi.fn(async () => ({
            ok: false,
            status: 400,
            json: async () => ({ detail: 'Unsupported file type' }),
        })));

        const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
        render(<FileUploadPanel isOpen onClose={vi.fn()} initialFiles={[file]} onFileProcess={onFileProcess} />);

        expect(screen.getByText('notes.txt')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Process 1 File' }));

        expect(await screen.findByText('Unsupported file type')).toBeTruthy();
        expect(onFileProcess).toHaveBeenCalledWith([
            expect.objectContaining({ fileName: 'notes.txt', success: false, error: 'Unsupported file type' }),
        ]);
    });

    it('rejects a file over the upload limit before calling the server', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const huge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.txt', { type: 'text/plain' });
        render(<FileUploadPanel isOpen onClose={vi.fn()} initialFiles={[huge]} />);

        fireEvent.click(screen.getByRole('button', { name: 'Process 1 File' }));
        expect(await screen.findByText('File exceeds the 10 MB limit')).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
