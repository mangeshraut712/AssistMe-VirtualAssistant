import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InputArea from './InputArea';

describe('InputArea', () => {
    it('names the icon controls and does not drop an attachment on send', () => {
        const sendMessage = vi.fn();
        const onFileUpload = vi.fn();
        render(
            <InputArea
                input=""
                setInput={vi.fn()}
                isLoading={false}
                sendMessage={sendMessage}
                onFileUpload={onFileUpload}
                models={[{ id: 'demo', name: 'Demo', free: true }]}
                selectedModel="demo"
                onModelChange={vi.fn()}
            />
        );

        expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Advanced Voice Mode' })).toBeTruthy();
        expect(screen.getByRole('textbox', { name: 'Message' })).toBeTruthy();
        expect(screen.getByRole('combobox', { name: 'Model' })).toBeTruthy();

        const file = new File(['notes'], 'notes.txt', { type: 'text/plain' });
        fireEvent.change(document.querySelector('#file-upload'), { target: { files: [file] } });
        expect(onFileUpload).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

        expect(sendMessage).not.toHaveBeenCalled();
        expect(onFileUpload).toHaveBeenCalledTimes(2);
        expect(onFileUpload).toHaveBeenLastCalledWith([file]);
    });
});
