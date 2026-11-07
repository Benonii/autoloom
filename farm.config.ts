import { convex } from '@farm.js/convex';
import { defineConfig } from '@farm.js/core';

export default defineConfig({
  deploy: { target: 'vercel' },
  integrations: {
    convex: convex()
  }
});
