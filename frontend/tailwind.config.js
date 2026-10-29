/**
 * Tailwind CSS Configuration
 * Configures the design system tokens, color palettes, dark mode handling,
 * typography scales, spacing tokens, and content purge paths for the NutriMunch application.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
      extend: {
          "colors": {
              "on-tertiary-fixed-variant": "#3d4947",
              "surface-glass": "rgba(230, 244, 241, 0.8)",
              "secondary-container": "#dce2f8",
              "on-primary-fixed-variant": "#28501d",
              "background": "#f8f9ff",
              "outline": "#73796d",
              "secondary": "#575e70",
              "on-primary-fixed": "#032100",
              "on-tertiary-container": "#505d5b",
              "tertiary": "#54615f",
              "tertiary-fixed": "#d7e5e2",
              "on-tertiary-fixed": "#121e1c",
              "mint-bg-start": "#EBF8F5",
              "mint-bg-end": "#D8EEE8",
              "primary": "#406832",
              "primary-container": "#b1e09d",
              "surface-container-low": "#eff4ff",
              "primary-fixed": "#c0f0ab",
              "error": "#ba1a1a",
              "surface-variant": "#d3e4fe",
              "on-background": "#0b1c30",
              "on-surface": "#0b1c30",
              "secondary-fixed": "#dce2f8",
              "on-secondary-container": "#5d6476",
              "slate-heavy": "#0F172A",
              "on-surface-variant": "#42493e",
              "on-tertiary": "#ffffff",
              "surface-tint": "#406832",
              "surface-container-highest": "#d3e4fe",
              "inverse-surface": "#213145",
              "inverse-on-surface": "#eaf1ff",
              "surface-container": "#e5eeff",
              "on-error-container": "#93000a",
              "surface-container-lowest": "#ffffff",
              "on-secondary": "#ffffff",
              "surface-container-high": "#dce9ff",
              "on-primary": "#ffffff",
              "error-container": "#ffdad6",
              "outline-variant": "#c2c9bb",
              "tertiary-fixed-dim": "#bcc9c7",
              "on-error": "#ffffff",
              "secondary-fixed-dim": "#c0c6db",
              "surface-dim": "#cbdbf5",
              "tertiary-container": "#c8d6d3",
              "primary-fixed-dim": "#a5d391",
              "inverse-primary": "#a5d391",
              "on-primary-container": "#3c642f",
              "surface": "#f8f9ff",
              "surface-bright": "#f8f9ff",
              "on-secondary-fixed-variant": "#404758",
              "on-secondary-fixed": "#151b2b"
          },
          "borderRadius": {
              "DEFAULT": "1rem",
              "lg": "2rem",
              "xl": "3rem",
              "full": "9999px"
          },
          "spacing": {
              "edge-margin": "2rem",
              "container-max": "1440px",
              "section-gap": "8rem",
              "stack-overlap": "-12px",
              "gutter": "2rem"
          },
          "fontFamily": {
              "body-md": ["Plus Jakarta Sans", "sans-serif"],
              "nav-link": ["Plus Jakarta Sans", "sans-serif"],
              "label-caps": ["Plus Jakarta Sans", "sans-serif"],
              "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
              "hero-display": ["Plus Jakarta Sans", "sans-serif"]
          },
          "fontSize": {
              "body-md": ["0.875rem", {"lineHeight": "1.625", "fontWeight": "400"}],
              "nav-link": ["0.875rem", {"lineHeight": "1", "fontWeight": "500"}],
              "label-caps": ["10px", {"lineHeight": "1", "letterSpacing": "0.2em", "fontWeight": "700"}],
              "headline-lg": ["1.875rem", {"lineHeight": "1.2", "letterSpacing": "-0.025em", "fontWeight": "600"}],
              "hero-display": ["clamp(4rem, 15vw, 12rem)", {"lineHeight": "0.85", "letterSpacing": "-0.06em", "fontWeight": "800"}]
          }
      }
  },
  plugins: [],
}
