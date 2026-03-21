import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Forward all /api/* requests to the FastAPI backend.
      // Do NOT rewrite the path — FastAPI routes are defined with the /api prefix.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        // SSE requires these headers to disable buffering
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));