import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        elevated: 'rgb(var(--color-elevated) / <alpha-value>)',
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--color-accent-hover) / <alpha-value>)',
        mint: 'rgb(var(--color-mint) / <alpha-value>)',
        leaf: 'rgb(var(--color-leaf) / <alpha-value>)',
        sage: 'rgb(var(--color-sage) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(110,231,183,0.18), 0 20px 45px rgba(0, 0, 0, 0.35), 0 0 30px rgba(16,185,129,0.18)'
      },
      fontFamily: {
        heading: ['var(--font-inter)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace']
      }
    }
  },
  plugins: []
};

export default config;
