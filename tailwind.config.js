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
            // Design tokens (mirrored in CHANGES_UI.md for the Android app)
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
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
                // Type scale (px): 2xs 11 / xs 12 / sm 14 / base 16 / lg 18 / xl 20 / 2xl 24 / 3xl 30
            },
            borderRadius: {
                control: '0.75rem', // inputs, buttons, chips
                card: '1rem',       // cards, panels
                modal: '1.5rem',    // modals, sheets
            },
            boxShadow: {
                soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
                card: '0 4px 12px -2px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
                float: '0 20px 40px -12px rgb(15 23 42 / 0.25)',
            },
            colors: {
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
            }
        },
    },
    darkMode: 'class',
    plugins: [],
}
