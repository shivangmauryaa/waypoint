import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "mobile",
  publicDir: "../public",
  plugins: [react()],
  build: { outDir: "../dist-mobile", emptyOutDir: true },
  server: {
    host: "0.0.0.0",
    port: 8011,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        configure: (proxy) => proxy.on("proxyReq", (proxyReq) => proxyReq.removeHeader("origin")),
      },
    },
  },
});
