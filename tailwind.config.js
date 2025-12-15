/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
        './modules/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        extend: {
            // Pure solid backgrounds (Apple + Japanese minimalism)
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
            },

            // Apple-inspired border radius
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },

            // SF Pro inspired typography
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    'SF Pro Text',
                    'SF Pro Display',
                    'system-ui',
                    'Segoe UI',
                    'Roboto',
                    'Helvetica Neue',
                    'Arial',
                    'sans-serif',
                    'Apple Color Emoji',
                    'Segoe UI Emoji',
                ],
                mono: [
                    'SF Mono',
                    'Monaco',
                    'Inconsolata',
                    'Fira Code',
                    'Consolas',
                    'Courier New',
                    'monospace'
                ],
            },

            // Generous spacing (Ma - negative space)
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '100': '25rem',
                '112': '28rem',
                '128': '32rem',
            },

            // Smooth animations (Apple-style)
            transitionDuration: {
                '0': '0ms',
                '150': '150ms',
                '250': '250ms',
                '350': '350ms',
                '400': '400ms',
                '500': '500ms',
                '600': '600ms',
                '700': '700ms',
            },

            transitionTimingFunction: {
                'apple-ease': 'cubic-bezier(0.4, 0.0, 0.2, 1)',
                'apple-in': 'cubic-bezier(0.4, 0.0, 1, 1)',
                'apple-out': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
                'apple-in-out': 'cubic-bezier(0.4, 0.0, 0.6, 1)',
            },

            // Subtle shadows (Japanese Shibui)
            boxShadow: {
                'subtle': '0 1px 2px rgba(0, 0, 0, 0.04)',
                'minimal': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'soft': '0 8px 24px rgba(0, 0, 0, 0.12)',
                'elevated': '0 16px 48px rgba(0, 0, 0, 0.16)',
            },

            // Mobile-first breakpoints
            screens: {
                'xs': '475px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
            },

            // Animation keyframes
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                'slide-in-bottom': {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                'shimmer': {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },

            animation: {
                'fade-in': 'fade-in 0.25s ease-out',
                'fade-up': 'fade-up 0.35s ease-out',
                'scale-in': 'scale-in 0.25s ease-out',
                'slide-in-bottom': 'slide-in-bottom 0.35s ease-out',
                'shimmer': 'shimmer 2s linear infinite',
            },

            // Z-index layers
            zIndex: {
                'modal': '50',
                'dropdown': '40',
                'overlay': '30',
                'header': '20',
                'default': '1',
            },

            // Typography scale (responsive)
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],
                'sm': ['0.875rem', { lineHeight: '1.25rem' }],
                'base': ['1rem', { lineHeight: '1.5rem' }],
                'lg': ['1.125rem', { lineHeight: '1.75rem' }],
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],
                '2xl': ['1.5rem', { lineHeight: '2rem' }],
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
                '5xl': ['3rem', { lineHeight: '1' }],
                '6xl': ['3.75rem', { lineHeight: '1' }],
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}
