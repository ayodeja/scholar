import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FFFFFF",
        shell: "#FAFAF9",
        ink: "#14171F",
        blue: { DEFAULT: "#1B3A6B", hover: "#152D54" },
        "soft-blue": { DEFAULT: "#EAF1FB", line: "#CBDCF2" },
        "accent-blue": "#3B6BA5",
        green: { DEFAULT: "#1E7A5F", bg: "#E7F5EF" },
        amber: { DEFAULT: "#96650F", bg: "#FBF0DE" },
        risk: { DEFAULT: "#B23A3A", bg: "#FBEAEA" },
        border: "#E4E7EC",
        "border-strong": "#D6DAE1",
        gray: { DEFAULT: "#6B7280", light: "#9CA3AF" },
      },
      fontFamily: {
        ui: ["var(--font-geist)", "system-ui", "sans-serif"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        s: "6px",
        m: "10px",
        l: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
