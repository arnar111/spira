/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          50: '#f3f7f3',
          100: '#e3ede2',
          200: '#c7dac6',
          300: '#9fbf9d',
          400: '#739f73',
          500: '#548255',
          600: '#406843',
          700: '#345337',
          800: '#2b432e',
          900: '#243827',
          950: '#121f14',
        },
        terracotta: {
          50: '#fbf5f2',
          100: '#f6e8e1',
          200: '#ecd0c1',
          300: '#dfae96',
          400: '#cf846a',
          500: '#c26a4d',
          600: '#b25340',
          700: '#943f36',
          800: '#783630',
          900: '#62302b',
          950: '#341614',
        },
        cream: {
          50: '#fdfbf6',
          100: '#faf5e8',
          200: '#f3e9cd',
          300: '#ebd9a8',
          400: '#e0c279',
          500: '#d4a957',
          600: '#c2924a',
          700: '#a1763f',
          800: '#825e3a',
          900: '#6b4e32',
        },
        capsicum: {
          400: '#ef5a3c',
          500: '#e23e1d',
          600: '#c92f17',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        sway: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        grow: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
      },
      animation: {
        sway: 'sway 4s ease-in-out infinite',
        grow: 'grow 1.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
