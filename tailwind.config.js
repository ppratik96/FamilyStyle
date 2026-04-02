/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#85341f",
        background: "#fcf9f4",
        "on-surface": "#1c1c19",
        "on-surface-variant": "#55423e",
        "outline-variant": "#dbc1ba",
        "surface-container-low": "#f6f3ee",
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
