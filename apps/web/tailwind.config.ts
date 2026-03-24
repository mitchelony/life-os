import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        line: "var(--line)",
        accent: "var(--accent)",
        accentSoft: "var(--accent-soft)",
        danger: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
      },
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
      },
      backgroundImage: {
        "life-grid":
          "radial-gradient(circle at top left, rgba(124, 92, 73, 0.12), transparent 30%), radial-gradient(circle at top right, rgba(53, 84, 74, 0.16), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.68), rgba(248,244,238,0.94))",
      },
    },
  },
  plugins: [],
};

export default config;
