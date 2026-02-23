/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#10141c',
          900: '#171c27',
          800: '#222a3a',
          700: '#303b51',
        },
        mist: '#f6f7f9',
        line: '#e4e7ec',
        accent: {
          DEFAULT: '#0e7c66',
          dark: '#0a5f4e',
          soft: '#e3f2ee',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
