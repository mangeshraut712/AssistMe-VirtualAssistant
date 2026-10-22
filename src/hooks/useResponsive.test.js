import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    useIsIOS,
    useIsSafari,
    useIsTouchDevice,
    useMediaQuery,
    usePrefersDarkMode,
    usePrefersReducedMotion,
} from './useResponsive';

const listeners = new Set();
let mediaMatches = false;

const installMatchMedia = () => {
    listeners.clear();
    window.matchMedia = vi.fn((query) => ({
        get matches() {
            return mediaMatches;
        },
        media: query,
        addEventListener(_event, listener) {
            listeners.add(listener);
        },
        removeEventListener(_event, listener) {
            listeners.delete(listener);
        },
        addListener(listener) {
            listeners.add(listener);
        },
        removeListener(listener) {
            listeners.delete(listener);
        },
    }));
};

const setUserAgent = (userAgent) => {
    Object.defineProperty(window.navigator, 'userAgent', {
        value: userAgent,
        configurable: true,
    });
};

afterEach(() => {
    mediaMatches = false;
    listeners.clear();
    delete window.ontouchstart;
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
    });
    delete window.MSStream;
});

describe('useMediaQuery', () => {
    it('reads the current match and updates when the query changes', () => {
        mediaMatches = true;
        installMatchMedia();
        const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));

        expect(result.current).toBe(true);

        act(() => {
            mediaMatches = false;
            listeners.forEach((listener) => listener());
        });

        expect(result.current).toBe(false);
    });
});

describe('preference hooks', () => {
    it('follows reduced-motion and color-scheme media queries', () => {
        mediaMatches = true;
        installMatchMedia();

        const reduced = renderHook(() => usePrefersReducedMotion());
        const dark = renderHook(() => usePrefersDarkMode());

        expect(reduced.result.current).toBe(true);
        expect(dark.result.current).toBe(true);
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
});

describe('static device hooks', () => {
    it('detects a touch device from the initial browser state', () => {
        window.ontouchstart = () => undefined;
        const { result } = renderHook(() => useIsTouchDevice());
        expect(result.current).toBe(true);
    });

    it('detects Safari and iOS from the user agent once', () => {
        setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1');
        const safari = renderHook(() => useIsSafari());
        const ios = renderHook(() => useIsIOS());

        expect(safari.result.current).toBe(true);
        expect(ios.result.current).toBe(true);
    });

    it('does not treat Chrome as Safari', () => {
        setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
        const { result } = renderHook(() => useIsSafari());
        expect(result.current).toBe(false);
    });
});
