// frontend/tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface": "#0a0e14",
        "primary": "#a7a5ff",
        "primary-dim": "#645efb",
        "secondary": "#33f684",
        "secondary-fixed": "#33f684",
        "error": "#ff6e84",
        "on-surface": "#eef0f9",
        "on-surface-variant": "#a8abb3",
        "surface-container-low": "#0f141a",
        "surface-container-high": "#1b2028",
        "surface-container-highest": "#20262f",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};