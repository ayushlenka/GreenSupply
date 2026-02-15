/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1a1a18',
        parchment: '#f5f0e8',
        cream: '#faf7f2',
        moss: '#3a6b4a',
        sage: '#6b9e7a',
        fern: '#9dc4a0'
      }
    }
  },
  plugins: []
};
