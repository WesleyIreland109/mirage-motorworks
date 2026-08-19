import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || (process.env.GITHUB_PAGES === "true" ? "/mirage-motorworks/" : "/"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
