/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
        background: "rgb(var(--color-background) / <alpha-value>)",
        "on-surface": "rgb(var(--color-on-surface) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--color-on-surface-variant) / <alpha-value>)",
        "outline-variant": "rgb(var(--color-outline-variant) / <alpha-value>)",
        "surface-container-low": "rgb(var(--color-surface-container-low) / <alpha-value>)",
      },
      fontFamily: {
        headline: ["Newsreader_700Bold", "serif"],
        "headline-md": ["Newsreader_500Medium", "serif"],
        "headline-reg": ["Newsreader_400Regular", "serif"],
        "headline-italic": ["Newsreader_700Bold_Italic", "serif"],
        body: ["System"],
        "body-md": ["System"],
        "body-bold": ["System"],
      },
    },
  },
  plugins: [],
}
