import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#071A14',
        surface: '#0D221C',
        elevated: '#123228',
        primary: '#FFFFFF',
        secondary: '#D1D5DB',
        accent: '#10B981',
        'accent-hover': '#6EE7B7',
        border: '#1F3A33',
        danger: '#F87171',
        success: '#34D399'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(110,231,183,0.18), 0 20px 45px rgba(0, 0, 0, 0.35), 0 0 30px rgba(16,185,129,0.18)'
      },
      fontFamily: {
        heading: ['var(--font-playfair)', 'serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
