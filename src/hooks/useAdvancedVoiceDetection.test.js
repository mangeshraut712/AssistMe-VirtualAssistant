import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAdvancedVoiceDetection } from './useAdvancedVoiceDetection';

vi.mock('@/config/voice-detection.config', async () => {
    const actual = await vi.importActual('@/config/voice-detection.config');
    return {
        ...actual,
        VOICE_CONFIG: {
            ...actual.VOICE_CONFIG,
            pushToTalk: {
                ...actual.VOICE_CONFIG.pushToTalk,
                muteWhileSpeaking: true,
            },
        },
    };
});

describe('useAdvancedVoiceDetection auto-mute', () => {
    it('follows assistant speech only while auto-mute is on', () => {
        const { result, rerender } = renderHook(
            ({ isSpeaking, muteMode }) => useAdvancedVoiceDetection({ isSpeaking, muteMode }),
            { initialProps: { isSpeaking: true, muteMode: 'auto' } }
        );

        expect(result.current.isMuted).toBe(true);

        act(() => {
            result.current.toggleMute();
        });
        expect(result.current.isMuted).toBe(false);

        rerender({ isSpeaking: false, muteMode: 'auto' });
        expect(result.current.isMuted).toBe(false);

        rerender({ isSpeaking: true, muteMode: 'auto' });
        expect(result.current.isMuted).toBe(true);
    });

    it('keeps a manual mute choice when the assistant starts speaking', () => {
        const { result, rerender } = renderHook(
            ({ isSpeaking }) => useAdvancedVoiceDetection({ isSpeaking, muteMode: 'manual' }),
            { initialProps: { isSpeaking: false } }
        );

        expect(result.current.isMuted).toBe(false);

        act(() => {
            result.current.forceMute(true);
        });
        rerender({ isSpeaking: true });

        expect(result.current.isMuted).toBe(true);
    });
});
