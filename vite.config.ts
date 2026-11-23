import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/. CI sets BASE_PATH for that build;
  // everywhere else the app lives at the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
