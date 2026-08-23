/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        line: '#E2E8F0',
        ink: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          faint: '#94A3B8',
        },
        shell: {
          DEFAULT: '#0B1329',
          soft: '#111C38',
          line: '#1E2D4A',
          highlight: '#38BDF8',
        },
        brand: {
          DEFAULT: '#0284C7',
          bright: '#0EA5E9',
          wash: '#F0F9FF',
          dark: '#0369A1',
          accent: '#38BDF8',
        },
        state: {
          normal: '#10B981',
          normalWash: '#ECFDF5',
          normalBorder: '#A7F3D0',
          warning: '#F59E0B',
          warningWash: '#FFFBEB',
          warningBorder: '#FDE68A',
          critical: '#EF4444',
          criticalWash: '#FEF2F2',
          criticalBorder: '#FECACA',
          idle: '#64748B',
          idleWash: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      boxShadow: {
        panel: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        raised: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        glow: '0 0 20px rgba(14, 165, 233, 0.25)',
        glowEmerald: '0 0 20px rgba(16, 185, 129, 0.25)',
      },
      borderRadius: {
        panel: '12px',
        card: '16px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
