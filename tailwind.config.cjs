/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                sans: ['Sora', 'SF Pro Display', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Extended color palette
                success: {
                    DEFAULT: "#22c55e",
                    foreground: "#ffffff",
                },
                warning: {
                    DEFAULT: "#f59e0b",
                    foreground: "#ffffff",
                },
                info: {
                    DEFAULT: "#3b82f6",
                    foreground: "#ffffff",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "calc(var(--radius) + 4px)",
                "2xl": "calc(var(--radius) + 8px)",
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            fontSize: {
                'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
            },
            backdropBlur: {
                xs: '2px',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
                "fade-in": {
                    from: { opacity: 0 },
                    to: { opacity: 1 },
                },
                "fade-out": {
                    from: { opacity: 1 },
                    to: { opacity: 0 },
                },
                "slide-in-from-top": {
                    from: { transform: "translateY(-100%)" },
                    to: { transform: "translateY(0)" },
                },
                "slide-in-from-bottom": {
                    from: { transform: "translateY(100%)" },
                    to: { transform: "translateY(0)" },
                },
                "slide-in-from-left": {
                    from: { transform: "translateX(-100%)" },
                    to: { transform: "translateX(0)" },
                },
                "slide-in-from-right": {
                    from: { transform: "translateX(100%)" },
                    to: { transform: "translateX(0)" },
                },
                "zoom-in": {
                    from: { opacity: 0, transform: "scale(0.95)" },
                    to: { opacity: 1, transform: "scale(1)" },
                },
                "zoom-out": {
                    from: { opacity: 1, transform: "scale(1)" },
                    to: { opacity: 0, transform: "scale(0.95)" },
                },
                "ping-slow": {
                    "75%, 100%": { transform: "scale(2)", opacity: 0 },
                },
                "spin-slow": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                },
                "pulse-subtle": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.8 },
                },
                "bounce-subtle": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-5%)" },
                },
                "wiggle": {
                    "0%, 100%": { transform: "rotate(-3deg)" },
                    "50%": { transform: "rotate(3deg)" },
                },
                "gradient-shift": {
                    "0%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                    "100%": { backgroundPosition: "0% 50%" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.2s ease-out",
                "fade-out": "fade-out 0.2s ease-out",
                "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
                "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
                "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
                "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
                "zoom-in": "zoom-in 0.2s ease-out",
                "zoom-out": "zoom-out 0.2s ease-out",
                "ping-slow": "ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
                "spin-slow": "spin-slow 3s linear infinite",
                "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
                "bounce-subtle": "bounce-subtle 1s ease-in-out infinite",
                "wiggle": "wiggle 0.5s ease-in-out",
                "gradient-shift": "gradient-shift 3s ease infinite",
            },
            transitionDuration: {
                '400': '400ms',
            },
            transitionTimingFunction: {
                'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}

