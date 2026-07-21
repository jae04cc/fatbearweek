import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#0d1410",
          card: "#17241a",
          elevated: "#203023",
        },
        accent: {
          DEFAULT: "#8b5e34",
          hover: "#74492a",
          light: "#c08a52",
        },
        success: "#4caf6b",
        warning: "#d97706",
        danger: "#dc2626",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
