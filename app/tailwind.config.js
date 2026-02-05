/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Clawbook-inspired dark theme colors
                'base-dark': '#0a0a0a',
                'base-darker': '#050505',
                'base-card': '#111111',
                'base-border': '#222222',
                'base-accent': '#ef4444', // Red accent like claw
                'base-accent-hover': '#dc2626',
                'base-blue': '#3b82f6',
                'base-green': '#22c55e',
                'base-yellow': '#eab308',
                'base-purple': '#a855f7',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'glow': 'glow 2s ease-in-out infinite alternate',
                'float': 'float 3s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px #ef4444, 0 0 10px #ef4444' },
                    '100%': { boxShadow: '0 0 20px #ef4444, 0 0 30px #ef4444' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
            },
        },
    },
    plugins: [],
};
