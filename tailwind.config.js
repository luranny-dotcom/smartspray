/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#00313C',
        secondary: '#006E85',
        accent:    '#7EC8D8',
        light:     '#E0F4F7',
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
