import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 8080,
  },
  build: {
    rollupOptions: {
      // Extra HTML entries so /tickets and /rsvp ship prerendered social-preview
      // meta (flier thumbnail + copy) that link crawlers can read. They boot the
      // same SPA, so the router still renders the right page for humans.
      input: {
        main: path.resolve(__dirname, "index.html"),
        tickets: path.resolve(__dirname, "tickets.html"),
        rsvp: path.resolve(__dirname, "rsvp.html"),
      },
    },
  },
});
