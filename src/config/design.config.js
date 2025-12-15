/**
 * Design System Configuration
 * Apple + Japanese Minimalism (Kanso, Ma, Chōwa)
 * Mobile-first, tablet and desktop responsive
 */

const designSystem = {
    // Color Palette - Solid backgrounds with subtle accents
    colors: {
        light: {
            background: '#FFFFFF',      // Pure white (Kanso - simplicity)
            surface: '#F8F8F8',         // Subtle gray for cards
            border: 'rgba(0,0,0,0.08)', // Minimal borders
            text: {
                primary: '#000000',
                secondary: '#666666',
                tertiary: '#999999',
            },
            accent: '#007AFF',          // Apple blue
        },
        dark: {
            background: '#000000',      // Pure black (Ma - negative space)
            surface: '#0A0A0A',         // Subtle elevation
            border: 'rgba(255,255,255,0.08)',
            text: {
                primary: '#FFFFFF',
                secondary: '#A0A0A0',
                tertiary: '#666666',
            },
            accent: '#0A84FF',
        }
    },

    // Spacing System (8px grid - Apple standard)
    spacing: {
        xs: '4px',    // 0.5 unit
        sm: '8px',    // 1 unit
        md: '16px',   // 2 units
        lg: '24px',   // 3 units
        xl: '32px',   // 4 units
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
    },

    // Typography (SF Pro inspired)
    typography: {
        fontFamily: {
            sans: [
                '-apple-system',
                'BlinkMacSystemFont',
                'SF Pro Text',
                'SF Pro Display',
                'Segoe UI',
                'Roboto',
                'Helvetica Neue',
                'Arial',
                'sans-serif'
            ].join(', '),
            mono: [
                'SF Mono',
                'Monaco',
                'Inconsolata',
                'Fira Code',
                'Droid Sans Mono',
                'Courier New',
                'monospace'
            ].join(', '),
        },
        scale: {
            // Mobile-first (base)
            xs: '0.75rem',    // 12px
            sm: '0.875rem',   // 14px
            base: '1rem',     // 16px
            lg: '1.125rem',   // 18px
            xl: '1.25rem',    // 20px
            '2xl': '1.5rem',  // 24px
            '3xl': '1.875rem',// 30px
            '4xl': '2.25rem', // 36px
            '5xl': '3rem',    // 48px
            // Tablet and desktop scale up via responsive classes
        },
        weight: {
            light: 300,
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
        },
        lineHeight: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        }
    },

    // Breakpoints (Mobile-first approach)
    breakpoints: {
        sm: '640px',   // Mobile landscape, small tablets
        md: '768px',   // Tablets
        lg: '1024px',  // Desktop
        xl: '1280px',  // Large desktop
        '2xl': '1536px' // Extra large
    },

    // Border Radius (Apple-style rounded corners)
    borderRadius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
    },

    // Shadows (Subtle, Japanese Ma principle)
    shadows: {
        sm: '0 1px 2px rgba(0,0,0,0.04)',
        md: '0 2px 8px rgba(0,0,0,0.08)',
        lg: '0 8px 24px rgba(0,0,0,0.12)',
        xl: '0 16px 48px rgba(0,0,0,0.16)',
    },

    // Animation (Smooth, Apple-style)
    animation: {
        duration: {
            fast: '150ms',
            normal: '250ms',
            slow: '350ms',
            slower: '500ms',
        },
        easing: {
            // Apple's custom bezier curves
            standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
            accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
            sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
        }
    },

    // Japanese Design Principles
    principles: {
        kanso: 'Simplicity - Eliminate clutter, pure white/black backgrounds',
        ma: 'Negative space - Embrace emptiness, generous spacing',
        chowa: 'Balance - Harmony between elements',
        shizen: 'Natural - Organic, effortless feel',
        shibui: 'Subtle - Understated elegance',
    }
};

export default designSystem;
