import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tsConfigPaths(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": "/home/madhowl/qwen-and-more/gk2/src",
    },
  },
  base: "./",
  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: true,
  },
  css: {
    devSourcemap: true,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-router"],
  },
});