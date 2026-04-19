/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                background: 'rgb(var(--color-background) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                'surface-light': 'rgb(var(--color-surface-light) / <alpha-value>)',
                'neon-blue': 'rgb(var(--color-neon-blue) / <alpha-value>)',
                'neon-blue-light': 'rgb(var(--color-neon-blue-light) / <alpha-value>)',
                'neon-purple': 'rgb(var(--color-neon-purple) / <alpha-value>)',
                'neon-purple-light': 'rgb(var(--color-neon-purple-light) / <alpha-value>)',
                white: 'rgb(var(--color-white) / <alpha-value>)',
                black: 'rgb(var(--color-black) / <alpha-value>)',
            },
            animation: {
                'gradient-slow': 'gradient 8s ease infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                gradient: {
                    '0%, 100%': { 'background-size': '200% 200%', 'background-position': 'left center' },
                    '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            }
        }
    },
    plugins: []
};