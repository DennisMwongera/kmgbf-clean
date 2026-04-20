import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 50:'#f0faf4', 100:'#d8f3dc', 200:'#95d5b2', 300:'#52b788', 400:'#40916c', 500:'#2d6a4f', 600:'#1b4332', 700:'#0f2d1c' },
        sand:   { 100:'#faf9f6', 200:'#f6f3ee', 300:'#e8e3da', 400:'#d4cec4' },
      },
    },
  },
  plugins: [],
}
export default config
