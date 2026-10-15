/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Design tokens mirror the native app (XyonEmpleadosApp ui/theme/Theme.kt):
            // flat saturated fields, Xyon blue as anchor, heavy tight type, thick outlines.
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
                display: ['"Inter Tight"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
            // Layering scale: header 40 < floating nav 50 < modal 60 < popover 70 < toast 80
            zIndex: {
                header: '40',
                nav: '50',
                modal: '60',
                popover: '70',
                toast: '80',
            },
            fontSize: {
                // Smallest allowed size (badges, captions): 11px
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
                // Display sizes (app displayLarge / headlineLarge)
                'display': ['3.5rem', { lineHeight: '0.95', letterSpacing: '-0.045em' }],
                'headline': ['2.125rem', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
            },
            borderRadius: {
                control: '1rem',     // inputs, buttons, chips
                card: '1.75rem',     // cards, panels (app XyonCard 28dp)
                modal: '2rem',       // modals, sheets
            },
            borderWidth: {
                thick: '1.5px',
            },
            boxShadow: {
                soft: 'none',
                card: 'none',
                float: '0 24px 48px -16px rgb(12 12 18 / 0.35)',
                pop: '4px 4px 0 0 rgb(12 12 18)',
            },
            colors: {
                // Warm neutrals: replaces Tailwind's cool slate across the whole app
                // (paper canvas in light mode, near-black ink in dark mode).
                slate: {
                    50: '#F4F2EA',
                    100: '#EAE7DC',
                    200: '#DCD8CA',
                    300: '#C4BFAE',
                    400: '#8B8778',
                    500: '#5B5E6B',
                    600: '#474955',
                    700: '#34353F',
                    800: '#1A1A24',
                    900: '#111118',
                    950: '#0A0A10',
                },
                paper: '#F4F2EA',
                ink: '#0C0C12',
                lime: { DEFAULT: '#C8F53C', soft: '#EEFBC4', ink: '#3D4D0A' },
                lilac: { DEFAULT: '#C9B6FF', soft: '#EEE8FF', ink: '#3B2A80' },
                coral: { DEFAULT: '#FF6B4A', soft: '#FFE3DB', ink: '#8A2A14' },
                sun: { DEFAULT: '#FFD84A', soft: '#FFF5CC', ink: '#6B5300' },
                // Semantic status colors (use instead of ad-hoc green/amber/red)
                success: { DEFAULT: '#16a34a', soft: '#dcfce7', ink: '#166534' },
                warning: { DEFAULT: '#d97706', soft: '#fef3c7', ink: '#92400e' },
                danger: { DEFAULT: '#dc2626', soft: '#fee2e2', ink: '#991b1b' },
                brand: {
                    DEFAULT: 'rgb(var(--primary-600) / <alpha-value>)',
                    soft: 'rgb(var(--primary-100) / <alpha-value>)',
                    ink: 'rgb(var(--primary-800) / <alpha-value>)',
                },
                blue: {
                    50: 'rgb(var(--primary-50) / <alpha-value>)',
                    100: 'rgb(var(--primary-100) / <alpha-value>)',
                    200: 'rgb(var(--primary-200) / <alpha-value>)',
                    300: 'rgb(var(--primary-300) / <alpha-value>)',
                    400: 'rgb(var(--primary-400) / <alpha-value>)',
                    500: 'rgb(var(--primary-500) / <alpha-value>)',
                    600: 'rgb(var(--primary-600) / <alpha-value>)',
                    700: 'rgb(var(--primary-700) / <alpha-value>)',
                    800: 'rgb(var(--primary-800) / <alpha-value>)',
                    900: 'rgb(var(--primary-900) / <alpha-value>)',
                    950: 'rgb(var(--primary-950) / <alpha-value>)',
                }
            },
            transitionTimingFunction: {
                spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                'spin-slow': { to: { transform: 'rotate(360deg)' } },
                bob: {
                    '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
                    '50%': { transform: 'translateY(-8px) rotate(8deg)' },
                },
                pop: {
                    '0%': { transform: 'scale(0.6)', opacity: '0' },
                    '60%': { transform: 'scale(1.08)', opacity: '1' },
                    '100%': { transform: 'scale(1)' },
                },
                burst: {
                    '0%': { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: '1' },
                    '100%': { transform: 'translate(var(--bx), var(--by)) scale(0) rotate(180deg)', opacity: '0' },
                },
            },
            animation: {
                'spin-slow': 'spin-slow 22s linear infinite',
                bob: 'bob 6s ease-in-out infinite',
                pop: 'pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                burst: 'burst 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
        },
    },
    darkMode: 'class',
    plugins: [],
}
