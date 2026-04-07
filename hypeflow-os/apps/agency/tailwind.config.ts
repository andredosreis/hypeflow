import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /* shadcn compat */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        /* Surface hierarchy — Kinetic Observatory */
        s: {
          0: '#0F1318',
          1: '#161C26',
          2: '#1E2532',
          3: '#262E3D',
          4: '#2E3847',
        },

        /* HYPE Flow brand — cyan preserved */
        cyan: {
          DEFAULT: '#21A0C4',
          light: '#4FC8EA',
          dark: '#1580A0',
          glow: 'rgba(33,160,196,0.15)',
        },

        /* Kinetic Limon — AIOX official brand action color */
        lime: {
          DEFAULT: '#D1FF00',
          muted: 'rgba(209,255,0,0.12)',
          border: 'rgba(209,255,0,0.2)',
        },

        /* Status */
        success: { DEFAULT: '#00E5A0', muted: 'rgba(0,229,160,0.12)' },
        warning: { DEFAULT: '#F5A623', muted: 'rgba(245,166,35,0.12)' },
        danger:  { DEFAULT: '#E84545', muted: 'rgba(232,69,69,0.12)' },

        /* Text */
        t: { 1: '#F0F6FC', 2: '#7FA8C4', 3: '#3D5570' },

        /* Channel colors */
        channel: {
          meta:      '#1877F2',
          instagram: '#E1306C',
          google:    '#4285F4',
          linkedin:  '#0A66C2',
          whatsapp:  '#25D366',
          organic:   '#00E5A0',
        },

        /* Temperature */
        temp: {
          cold: '#3D5570',
          warm: '#F5A623',
          hot:  '#E84545',
        },
      },

      fontFamily: {
        /* Geist — AIOX brand primary (Geist body, Geist Mono for data) */
        sans:    ['var(--font-geist)',     'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)','ui-monospace', 'monospace'],
        /* Syne — approximates TASA Orbiter 800 for display */
        display: ['var(--font-syne)',      'system-ui', 'sans-serif'],
        /* Manrope — metric values and data labels */
        manrope: ['var(--font-manrope)',   'system-ui', 'sans-serif'],
      },

      fontSize: {
        /* System labels */
        'sys':      ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.12em', fontWeight: '600' }],
        /* Body/data */
        'body':     ['0.875rem',  { lineHeight: '1.6',  fontWeight: '400' }],
        'data':     ['0.8125rem', { lineHeight: '1.4',  fontWeight: '500' }],
        /* Nav */
        'nav':      ['0.8125rem', { lineHeight: '1',    fontWeight: '600' }],
        /* Metrics */
        'metric-md':['1.125rem',  { lineHeight: '1.2',  fontWeight: '700', letterSpacing: '-0.01em' }],
        'metric-lg':['1.375rem',  { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.015em' }],
        'metric-xl':['2.25rem',   { lineHeight: '1',    fontWeight: '800', letterSpacing: '-0.02em' }],
        'metric-2xl':['3rem',     { lineHeight: '1',    fontWeight: '800', letterSpacing: '-0.025em' }],
        /* Display — ClickMax title level */
        'display-sm':['1.75rem',  { lineHeight: '1.1',  fontWeight: '800', letterSpacing: '-0.015em' }],
        'display':   ['2.5rem',   { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.02em' }],
        'display-lg':['3.5rem',   { lineHeight: '1',    fontWeight: '800', letterSpacing: '-0.025em' }],
      },

      borderRadius: {
        DEFAULT: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        sm: '0.5rem',
      },

      boxShadow: {
        float: '0px 24px 48px rgba(0,0,0,0.4)',
        card:  '0px 8px 24px rgba(0,0,0,0.25)',
        cyan:  '0 0 20px rgba(33,160,196,0.2)',
        lime:  '0 0 20px rgba(202,243,0,0.25)',
      },

      backdropBlur: { glass: '12px' },

      animation: {
        'bioluminescent': 'bioluminescent 2s ease-in-out infinite',
        'lime-pulse':     'lime-pulse 2.5s ease-in-out infinite',
        'sla-breach':     'sla-breach 2s ease-in-out infinite',
        'slide-in':       'slideIn 0.2s ease-out',
        'fade-in':        'fadeIn 0.3s ease-out',
      },

      keyframes: {
        slideIn:   { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        fadeIn:    { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
