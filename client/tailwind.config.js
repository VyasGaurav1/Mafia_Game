/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary dark theme colors
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252532',
          500: '#32323f',
          400: '#44445a',
        },
        // Accent colors
        blood: {
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          400: '#ef4444',
          300: '#f87171',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
        },
        // Role colors
        mafia: '#dc2626',
        town: '#3b82f6',
        neutral: '#a855f7',
        detective: '#22c55e',
        doctor: '#ec4899',
        vigilante: '#f97316',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'night-gradient': 'linear-gradient(to bottom, #0a0a0f 0%, #1a1a25 50%, #12121a 100%)',
        'day-gradient': 'linear-gradient(to bottom, #1e3a5f 0%, #2d4a6f 50%, #1e3a5f 100%)',
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(220, 38, 38, 0.4)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'inner-dark': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}
