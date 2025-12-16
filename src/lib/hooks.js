/**
 * Custom React Hooks for AssistMe Virtual Assistant
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { storage, debounce } from './utils';

/**
 * useLocalStorage - Persist state in localStorage
 */
export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(() => {
        return storage.get(key, initialValue);
    });

    const setValue = useCallback(
        value => {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            storage.set(key, valueToStore);
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
}

/**
 * useMediaQuery - Responsive design helper
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        const handler = event => setMatches(event.matches);

        // Modern API
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
        // Legacy API fallback
        mediaQuery.addListener(handler);
        return () => mediaQuery.removeListener(handler);
    }, [query]);

    return matches;
}

/**
 * useDebounce - Debounce a value
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback function
 */
export function useDebouncedCallback(callback, delay = 300) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    return useMemo(
        () => debounce((...args) => callbackRef.current(...args), delay),
        [delay]
    );
}

/**
 * useOnClickOutside - Handle clicks outside a ref element
 */
export function useOnClickOutside(ref, handler) {
    useEffect(() => {
        const listener = event => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

/**
 * useKeyPress - Detect key presses
 */
export function useKeyPress(targetKey, callback) {
    useEffect(() => {
        const handler = event => {
            if (event.key === targetKey) {
                callback(event);
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [targetKey, callback]);
}

/**
 * usePrevious - Get the previous value of a state
 */
export function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}

/**
 * useToggle - Boolean state toggle
 */
export function useToggle(initialValue = false) {
    const [value, setValue] = useState(initialValue);
    const toggle = useCallback(() => setValue(v => !v), []);
    const setTrue = useCallback(() => setValue(true), []);
    const setFalse = useCallback(() => setValue(false), []);
    return [value, toggle, setTrue, setFalse];
}

/**
 * useAsync - Handle async operations with loading and error states
 */
export function useAsync(asyncFunction, immediate = true) {
    const [status, setStatus] = useState('idle');
    const [value, setValue] = useState(null);
    const [error, setError] = useState(null);

    const execute = useCallback(
        async (...args) => {
            setStatus('pending');
            setValue(null);
            setError(null);

            try {
                const response = await asyncFunction(...args);
                setValue(response);
                setStatus('success');
                return response;
            } catch (err) {
                setError(err);
                setStatus('error');
                throw err;
            }
        },
        [asyncFunction]
    );

    useEffect(() => {
        if (immediate) {
            execute();
        }
    }, [execute, immediate]);

    return { execute, status, value, error, isLoading: status === 'pending' };
}

/**
 * useWindowSize - Track window dimensions
 */
export function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
}

/**
 * useIntersectionObserver - Detect when element is in viewport
 */
export function useIntersectionObserver(
    ref,
    { threshold = 0, root = null, rootMargin = '0px' } = {}
) {
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const element = ref?.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => setIsIntersecting(entry.isIntersecting),
            { threshold, root, rootMargin }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, [ref, threshold, root, rootMargin]);

    return isIntersecting;
}

/**
 * useCountdown - Countdown timer
 */
export function useCountdown(initialSeconds, onComplete) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);

    const start = useCallback(() => setIsRunning(true), []);
    const pause = useCallback(() => setIsRunning(false), []);
    const reset = useCallback(() => {
        setIsRunning(false);
        setSeconds(initialSeconds);
    }, [initialSeconds]);

    useEffect(() => {
        if (!isRunning) return;

        if (seconds <= 0) {
            setIsRunning(false);
            onComplete?.();
            return;
        }

        const timer = setInterval(() => {
            setSeconds(s => s - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, seconds, onComplete]);

    return { seconds, isRunning, start, pause, reset };
}

/**
 * useDocumentTitle - Update document title
 */
export function useDocumentTitle(title) {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = title;
        return () => {
            document.title = previousTitle;
        };
    }, [title]);
}

/**
 * Custom breakpoints for responsive design
 */
export const breakpoints = {
    sm: '(min-width: 640px)',
    md: '(min-width: 768px)',
    lg: '(min-width: 1024px)',
    xl: '(min-width: 1280px)',
    '2xl': '(min-width: 1536px)',
};

export function useIsMobile() {
    return !useMediaQuery(breakpoints.md);
}

export function useIsTablet() {
    const isMd = useMediaQuery(breakpoints.md);
    const isLg = useMediaQuery(breakpoints.lg);
    return isMd && !isLg;
}

export function useIsDesktop() {
    return useMediaQuery(breakpoints.lg);
}
