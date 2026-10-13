import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { storiesApi } from './server/storiesApi.js';

export default defineConfig({
  plugins: [react(), storiesApi()],
});
