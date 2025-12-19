/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THEME CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Provides theme state (light/dark mode) to the entire application.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'light' | 'dark' | 'system'} Theme
 */

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ThemeContext = createContext({
    theme: 'system',
    setTheme: () => { },
    resolvedTheme: 'light',
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function ThemeProvider({ children, defaultTheme = 'system' }) {
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return defaultTheme;
        return localStorage.getItem(STORAGE_KEYS.THEME) || defaultTheme;
    });

    const [resolvedTheme, setResolvedTheme] = useState('light');

    useEffect(() => {
        const root = window.document.documentElement;

        const applyTheme = () => {
            let resolved;
            if (theme === 'system') {
                resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            } else {
                resolved = theme;
            }

            root.classList.remove('light', 'dark');
            root.classList.add(resolved);
            setResolvedTheme(resolved);
        };

        applyTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') applyTheme();
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);

    const updateTheme = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme: updateTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;
