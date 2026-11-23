import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin/",

  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000/api",
        changeOrigin: true,
      },
      "/uploads": {
        target: process.env.VITE_API_URL || "http://localhost:5000/api",
        changeOrigin: true,
      },
    },
    host: "0.0.0.0",
  },
});
