import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The product stays at /Refract/; this dashboard is served under /Refract/dashboard/.
// It imports ../script.js and ../README.md at build time, so every size on the page is parsed, never typed.
export default defineConfig({
  base: '/Refract/dashboard/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
