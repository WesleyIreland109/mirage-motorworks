import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mirage: {
          bg: "#09090B",
          secondary: "#111216",
          surface: "#14151A",
          panel: "#14151A",
          elevated: "#1A1C22",
          border: "#272A33",
          muted: "#666C78",
          secondaryText: "#A5A7B2",
          cyan: "#39E4FF",
          purple: "#7C63FF",
          pink: "#FF46B9",
          orange: "#FF9748",
          gold: "#FFD25F",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "ui-sans-serif", "system-ui"],
        body: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glass: "0 18px 56px rgba(0, 0, 0, 0.28)",
        lift: "0 18px 48px rgba(0, 0, 0, 0.2)",
      },
      backgroundImage: {
        "mirage-gradient":
          "linear-gradient(90deg, #39E4FF 0%, #29CFFF 18%, #7C63FF 40%, #FF46B9 62%, #FF6A88 78%, #FF9748 92%, #FFD25F 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
