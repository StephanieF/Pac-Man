import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // KAPLAY is a large single dependency; the default 500 kB warning is just noise.
    chunkSizeWarningLimit: 1500,
  },
});
