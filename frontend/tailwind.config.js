/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Lobster Red (Primary Brand)
        primary: {
          DEFAULT: '#E74C3C',
          hover: '#C0392B',
          active: '#A93226',
          light: '#FDE8E5',
          lighter: '#FBD4CF',
        },
        // Agent Blue (Secondary)
        secondary: {
          DEFAULT: '#3498DB',
          hover: '#2980B9',
          active: '#21618C',
          light: '#EBF5FB',
          lighter: '#D6EAF8',
        },
        // Semantic Colors
        success: {
          DEFAULT: '#27AE60',
          hover: '#229954',
          active: '#1E8449',
          light: '#EAFAF1',
          lighter: '#D5F4E6',
        },
        warning: {
          DEFAULT: '#F39C12',
          hover: '#D68910',
          active: '#B9770E',
          light: '#FEF5E7',
          lighter: '#FCF3CF',
        },
        error: {
          DEFAULT: '#E74C3C',
          hover: '#CB4335',
          active: '#B03A2E',
          light: '#FADBD8',
          lighter: '#F5B7B1',
        },
        info: {
          DEFAULT: '#5DADE2',
          hover: '#3498DB',
          active: '#2E86C1',
          light: '#EBF5FB',
          lighter: '#D6EAF8',
        },
        // Agent Status Colors
        agent: {
          unclaimed: '#9B59B6',
          claimed: '#27AE60',
          premium: '#F39C12',
          inactive: '#95A5A6',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Noto Sans"',
          'Helvetica',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          '"SF Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
