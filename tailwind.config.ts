import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: "#0A0B0D",
          card: "#14161A",
          card2: "#1B1E23",
          primary: "#C8F31D",
          primaryHover: "#B2D918",
          accent: "#C8F31D",
          text: "#F4F5F7",
          muted: "#8B919B",
          border: "#2A2F36",
          danger: "#EF4444",
          warning: "#F59E0B",
          success: "#C8F31D",
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
