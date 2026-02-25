/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        'surface-3': '#242424',
        border: '#2a2a2a',
        'border-light': '#333333',
        muted: '#888888',
        'muted-foreground': '#666666',
        foreground: '#f0f0f0',
        'foreground-2': '#cccccc',
        primary: '#6366f1',
        'primary-hover': '#818cf8',
        'primary-muted': 'rgba(99,102,241,0.15)',
        success: '#22c55e',
        'success-muted': 'rgba(34,197,94,0.15)',
        warning: '#f59e0b',
        'warning-muted': 'rgba(245,158,11,0.15)',
        danger: '#ef4444',
        'danger-muted': 'rgba(239,68,68,0.15)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"SF Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
