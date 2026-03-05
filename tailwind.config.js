/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem',
            },
            colors: {
                apico: {
                    dark: '#0B0E14',
                },
            },
            boxShadow: {
                'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 4px 24px 0 rgb(0 0 0 / 0.04)',
                'card-hover': '0 2px 8px 0 rgb(0 0 0 / 0.08), 0 8px 32px 0 rgb(0 0 0 / 0.06)',
            },
            animation: {
                'spin-fast': 'spin 0.65s linear infinite',
                'fade-up': 'fadeUp 0.3s ease both',
                'shimmer': 'shimmer 1.8s ease-in-out infinite',
            },
            keyframes: {
                fadeUp: {
                    from: { opacity: '0', transform: 'translateY(10px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                shimmer: {
                    '0%, 100%': { opacity: '0.5' },
                    '50%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
