/**
 * Responsive Hooks
 * Mobile, tablet, desktop detection and utilities
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

const canUseDOM = () => typeof window !== 'undefined';

const readMediaQuery = (query) => {
    if (!canUseDOM() || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
};

const subscribeToMediaQuery = (query, onStoreChange) => {
    if (!canUseDOM() || typeof window.matchMedia !== 'function') return () => {};
    const media = window.matchMedia(query);
    media.addEventListener('change', onStoreChange);
    return () => media.removeEventListener('change', onStoreChange);
};

/**
 * useMediaQuery - Custom hook for responsive breakpoints
 */
export const useMediaQuery = (query) => {
    const subscribe = useCallback(
        (onStoreChange) => subscribeToMediaQuery(query, onStoreChange),
        [query]
    );
    const getSnapshot = useCallback(() => readMediaQuery(query), [query]);
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
};

/**
 * Breakpoint hooks (mobile-first)
 */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
export const useIsLargeDesktop = () => useMediaQuery('(min-width: 1280px)');

/**
 * Device type detection
 */
export const useDeviceType = () => {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();

    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isDesktop) return 'desktop';
    return 'unknown';
};

/**
 * Orientation detection
 */
export const useOrientation = () => {
    const [orientation, setOrientation] = useState('portrait');

    useEffect(() => {
        const handleOrientation = () => {
            setOrientation(
                window.matchMedia('(orientation: portrait)').matches
                    ? 'portrait'
                    : 'landscape'
            );
        };

        handleOrientation();
        window.addEventListener('orientationchange', handleOrientation);
        window.addEventListener('resize', handleOrientation);

        return () => {
            window.removeEventListener('orientationchange', handleOrientation);
            window.removeEventListener('resize', handleOrientation);
        };
    }, []);

    return orientation;
};

/**
 * Touch device detection
 */
const detectTouchDevice = () => {
    if (!canUseDOM()) return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
};

export const useIsTouchDevice = () => {
    const [isTouch] = useState(detectTouchDevice);
    return isTouch;
};

/**
 * Safari detection
 */
const detectSafari = () => {
    if (typeof navigator === 'undefined') return false;
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const useIsSafari = () => {
    const [isSafari] = useState(detectSafari);
    return isSafari;
};

/**
 * iOS detection
 */
const detectIOS = () => {
    if (!canUseDOM() || typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

export const useIsIOS = () => {
    const [isIOS] = useState(detectIOS);
    return isIOS;
};

/**
 * Viewport dimensions
 */
export const useViewport = () => {
    const [viewport, setViewport] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const handleResize = () => {
            setViewport({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return viewport;
};

/**
 * Safe area insets (for notch devices)
 */
export const useSafeArea = () => {
    const [safeArea, setSafeArea] = useState({
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    });

    useEffect(() => {
        const updateSafeArea = () => {
            const style = getComputedStyle(document.documentElement);
            setSafeArea({
                top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
                right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
                bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
                left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
            });
        };

        updateSafeArea();
        window.addEventListener('resize', updateSafeArea);
        return () => window.removeEventListener('resize', updateSafeArea);
    }, []);

    return safeArea;
};

/**
 * Network status
 */
export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};

/**
 * Reduced motion preference
 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/**
 * Dark mode preference
 */
export const usePrefersDarkMode = () => useMediaQuery('(prefers-color-scheme: dark)');

/**
 * Responsive columns (for grids)
 */
export const useResponsiveColumns = () => {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();

    if (isMobile) return 1;
    if (isTablet) return 2;
    if (isDesktop) return 3;
    return 4;
};

export default {
    useMediaQuery,
    useIsMobile,
    useIsTablet,
    useIsDesktop,
    useIsLargeDesktop,
    useDeviceType,
    useOrientation,
    useIsTouchDevice,
    useIsSafari,
    useIsIOS,
    useViewport,
    useSafeArea,
    useOnlineStatus,
    usePrefersReducedMotion,
    usePrefersDarkMode,
    useResponsiveColumns,
};
