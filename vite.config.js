import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// base = nome do repositório, porque o GitHub Pages publica em /<repo>/
export default defineConfig({
  base: '/QA-Playground/',
  plugins: [react(), svgr()]
});
