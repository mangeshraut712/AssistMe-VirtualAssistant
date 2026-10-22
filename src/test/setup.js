import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});

const noop = () => undefined;

if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({
        matches: false,
        media: '',
        addEventListener: noop,
        removeEventListener: noop,
        addListener: noop,
        removeListener: noop,
        dispatchEvent() {
            return false;
        },
    });
}

if (typeof window.ResizeObserver !== 'function') {
    window.ResizeObserver = class ResizeObserver {
        observe = noop;
        unobserve = noop;
        disconnect = noop;
    };
}

if (typeof window.IntersectionObserver !== 'function') {
    window.IntersectionObserver = class IntersectionObserver {
        observe = noop;
        unobserve = noop;
        disconnect = noop;
    };
}

if (!window.speechSynthesis) {
    window.speechSynthesis = {
        cancel: noop,
        speak: noop,
        getVoices() {
            return [];
        },
    };
}
