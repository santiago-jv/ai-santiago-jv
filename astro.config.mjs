import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://ai.santiago-jv.tech',
  output: 'server',
  adapter: vercel(),
  security: {
    checkOrigin: true,
  },
});
