import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        monster: {
          bg: "#0a0a0f",
          panel: "#12121a",
          border: "#1e1e2e",
          accent: "#3b3b5c",
          text: "#c8c8d4",
          muted: "#5a5a7a",
          hp: "#e05555",
          atk: "#e07a30",
          def: "#4a90d9",
          agi: "#50c878",
          spd: "#c878c8",
          hunger: "#e0a030",
          happy: "#e05580",
          clean: "#50a8e0",
          energy: "#a0d050",
        },
      },
    },
  },
  plugins: [],
};
export default config;
