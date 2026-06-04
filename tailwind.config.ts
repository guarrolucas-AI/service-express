import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E8C547',   // Amarillo Express Service
          dark:    '#C9A830',
          dim:     '#E8C54720',
        },
        steel: {
          900: '#0C0C0E',
          800: '#121214',
          700: '#1A1A1D',
          600: '#242428',
          500: '#2E2E33',
          400: '#3E3E45',
          300: '#606068',
        },
      },
      fontFamily: {
        display: ['var(--font-barlow)', 'sans-serif'],
        body:    ['var(--font-inter)',   'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
