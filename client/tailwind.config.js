/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — Family Atlas (Framer) palette
        'ft-bg':           '#f6f8fb',
        'ft-surface':      '#ffffff',
        'ft-surface-2':    '#f8fafc',
        'ft-header':       '#0f172a',
        'ft-header-text':  '#f1f5f9',
        'ft-accent':       '#2f6bff',
        'ft-accent-hover': '#1a52d8',
        'ft-accent-light': '#eff4ff',

        // Status / semantic
        'ft-living':   '#22c55e',
        'ft-deceased': '#94a3b8',
        'ft-male':     '#2f6bff',
        'ft-female':   '#ec4899',
        'ft-other':    '#f59e0b',

        // Text
        'ft-text-1': '#111827',
        'ft-text-2': '#64748b',
        'ft-text-3': '#94a3b8',

        // Lines / borders — hair for card edges, line for connectors
        'ft-line':              '#d6dce8',
        'ft-border-hair':       '#e5eaf2',

        // Rail / selection accents
        'ft-rail-active':        '#eff6ff',
        'ft-rail-active-border': '#cfe0ff',
        'ft-avatar-selected':    '#eaf1ff',
        'ft-selected-ring':      '#9dbdff',

        // Avatar pastel tints
        'ft-avatar-tint-male':      '#eaf1ff',
        'ft-avatar-tint-female':    '#f0ecfa',
        'ft-avatar-tint-other':     '#faf0e6',
        'ft-avatar-tint-deceased': '#e9eef8',
        'ft-avatar-tint-base':      '#f1f5f9',

        // Relationship edge status
        'ft-status-married':  '#059669',
        'ft-status-divorced': '#e11d48',
        'ft-status-other':    '#64748b',

        // Glass — frosted white (modal only)
        'ft-glass':        'rgba(255, 255, 255, 0.7)',
        'ft-glass-border': 'rgba(255, 255, 255, 0.4)',
      },
      borderRadius: {
        'card':    '18px',
        'tile':    '16px',
        'tile-sm': '14px',
        'btn':     '8px',
      },
      boxShadow: {
        'ft-sm': '0 2px 8px rgba(0,0,0,0.07)',
        'ft-md': '0 4px 20px rgba(0,0,0,0.09)',
        'ft-lg': '0 8px 32px rgba(0,0,0,0.14)',
      },
      fontFamily: {
        'ft': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Inter', 'Roboto', 'Oxygen', 'sans-serif'],
      },
      transitionDuration: {
        // ponytail: matches --t-fast / --t-base / --t-slow in styles.css
        'ft-fast': '150ms',
        'ft-base': '250ms',
        'ft-slow': '400ms',
      },
      transitionTimingFunction: {
        // ponytail: matches --ease-out. Tailwind ships ease-out too;
        // this is just the precise cubic-bezier the design system uses.
        'ft-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Avoid conflicts with your custom reset; Tailwind's preflight is fine alongside it
  },
};
