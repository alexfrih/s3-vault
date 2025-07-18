import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, "src/renderer"),
  base: "./", // Use relative paths for assets
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true,
  },
});
