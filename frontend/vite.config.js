import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          mediapipe: [
            "@mediapipe/pose",
            "@mediapipe/camera_utils",
            "@mediapipe/drawing_utils",
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "@mediapipe/pose",
      "@mediapipe/camera_utils",
      "@mediapipe/drawing_utils",
    ],
  },
});
