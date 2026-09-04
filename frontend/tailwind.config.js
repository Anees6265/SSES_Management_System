/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brandYellow: '#FDA92D',
        brandYellowOpacity: 'rgba(253, 169, 45, 0.0784)',
        customGreenText: '#118D57',
        customGreenBg: 'rgba(34, 197, 94, 0.2)',
      },
      animation: {
        'spin-slow': 'spin 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
