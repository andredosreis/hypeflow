/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050D14",
        surface: "#0C1824",
        primary: "#21A0C4",
        highlight: "#4FC8EA",
        accent: "#4FC8EA",
        success: "#1EC87A",
        warning: "#F5A623",
        danger: "#E84545",
        purple-detail: "#8B5CF6",
        text1: "#EBF4FF",
        text2: "#7FA8C4",
        text3: "#3D6080",
        border: "rgba(79, 200, 234, 0.12)",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        dmsans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
        '64': '64px',
        '80': '80px',
        '96': '96px',
        '128': '128px',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, rgba(79, 200, 234, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(79, 200, 234, 0.03) 1px, transparent 1px)",
      },
      animation: {
        'float': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'blur-in': 'blur-in 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', filter: 'blur(40px)' },
          '50%': { opacity: '0.8', filter: 'blur(60px)' },
        },
        'blur-in': {
          '0%': { filter: 'blur(12px)', opacity: '0' },
          '100%': { filter: 'blur(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
