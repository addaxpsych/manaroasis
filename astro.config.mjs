// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// Astro does not put .env values on process.env, so read them explicitly.
// PUBLIC_SITE_URL drives canonical URLs, OG tags, JSON-LD and the sitemap, so
// it must be set at BUILD time — on Cloudflare, as a build environment
// variable, not only as a runtime var.
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const site = PUBLIC_SITE_URL || 'http://localhost:4321';

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
