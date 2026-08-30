// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.PUBLIC_SITE_URL ?? 'https://manaroasis.com';

// Global `server` output; marketing pages opt back into static via
// `export const prerender = true` so Arabic content ships as real HTML for SEO.
export default defineConfig({
  site,
  output: 'server',
  adapter: cloudflare(),
  integrations: [react(), sitemap()],
  i18n: {
    locales: ['ar'],
    defaultLocale: 'ar',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
