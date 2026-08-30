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

/*
 * Astro validates `site` as a URL and aborts the whole build with a bare
 * "Invalid URL" that names neither the setting nor the offending value. A
 * paste of "PUBLIC_SITE_URL = https://..." into a dashboard value box hits
 * exactly that, so validate here and say what is wrong instead.
 */
function resolveSite(raw) {
  const fallback = 'http://localhost:4321';
  if (!raw) return fallback;

  const trimmed = String(raw).trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    console.warn(
      `
[31m  PUBLIC_SITE_URL is not a valid URL: ${JSON.stringify(trimmed)}
` +
        `  It must be the bare origin only, e.g. https://example.workers.dev
` +
        `  — no variable name, no "=", no trailing path.
` +
        `  Falling back to ${fallback} for this build.[0m
`,
    );
    return fallback;
  }
}

const site = resolveSite(PUBLIC_SITE_URL);

/*
 * Canonical URLs, OG tags, JSON-LD and the sitemap are baked into the HTML at
 * build time. Shipping a build that still points at localhost would tell search
 * engines the clinic lives on localhost, and the damage is invisible until it
 * has already been indexed — so say so loudly rather than failing quietly.
 */
const isLocal =
  site.includes('localhost') ||
  site.includes('127.0.0.1') ||
  // A placeholder that still looks like a real URL is the dangerous
  // case: it deploys silently and poisons every canonical tag.
  site.includes('REPLACE-ME') ||
  site.includes('example.com');
if (isLocal && process.argv.includes('build')) {
  const bar = '─'.repeat(68);
  console.warn(
    `
[33m${bar}
` +
      `  WARNING  PUBLIC_SITE_URL is "${site}".
` +
      `  This build's canonical tags, JSON-LD, OG images and sitemap will
` +
      `  all point at localhost. Fine for a local build; WRONG to deploy.

` +
      `  Before deploying, set PUBLIC_SITE_URL to the real origin as a
` +
      `  BUILD variable (Cloudflare: Settings -> Build -> Variables), not
` +
      `  only as a runtime var.
${bar}[0m
`,
  );
}

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
