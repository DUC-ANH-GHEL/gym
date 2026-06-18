import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#0B0F14",
          card: "#111827",
          card2: "#1F2937",
          primary: "#22C55E",
          primaryHover: "#16A34A",
          accent: "#38BDF8",
          text: "#F9FAFB",
          muted: "#9CA3AF",
          border: "#374151",
          danger: "#EF4444",
          warning: "#F59E0B",
          success: "#22C55E",
        },
      },
      borderRadius: {
        xl2: "20px",
        button: "14px",
        input: "12px",
      },
      maxWidth: {
        mobile: "480px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
