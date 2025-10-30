/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
    "./store/**/*.{js,jsx,ts,tsx}",
    "./types/**/*.{js,jsx,ts,tsx}",
    "./*.{js,jsx,ts,tsx}",
    "./index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Earth Song theme - minimalistic dark grays with Medina green
        'dark-bg': '#1B1B1B',
        'dark-surface': '#2A2A2A',
        'dark-surface-hover': '#333333',
        'dark-border': '#3A3A3A',
        'dark-text': '#E5E5E5',
        'dark-text-secondary': '#A0A0A0',
        'dark-text-muted': '#6B6B6B',
        
        // Medina green accents
        'medina-green': '#2D5A47',
        'medina-light': '#4A7C59',
        'medina-dark': '#1B3B2F',
        
        // Vibrant difficulty colors - rich but not too neon
        'easy': '#34C759',    // Vibrant, balanced green (Apple system green)
        'medium': '#FFD266',  // Warm golden yellow, pops but not neon
        'hard': '#FF5E57',    // Rich, strong red (Apple system red)
        
        // Minimal accent colors
        'accent': '#4A7C59',
        'accent-hover': '#5A8C69',
        
        // Progress colors
        'progress-bg': '#3A3A3A',
        'progress-fill': '#4A7C59',
      },
      fontFamily: {
        'arabic': ['Noto Sans Arabic', 'SF Pro Text', 'system-ui', 'sans-serif'],
        'heading': ['SF Pro Display', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'body': ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
