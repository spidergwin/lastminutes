/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#F97316',
          'orange-light': '#FB923C',
          'orange-dark': '#EA580C',
          'orange-muted': 'rgba(249, 115, 22, 0.15)',
          'orange-dark-primary': '#FA812F',
        },
      },
      borderRadius: {
        'theme-sm': '6px',
        'theme-md': '8px',
        'theme-lg': '10px',
        'theme-xl': '14px',
        'theme-2xl': '20px',
      },
    },
  },
  plugins: [],
};
