import type { APIRoute } from 'astro';
import { SITE_URL } from '../config/site';

export const prerender = true;

/**
 * Generated rather than static so the Sitemap line always matches whatever
 * PUBLIC_SITE_URL the build used — a pages.dev/workers.dev subdomain today, a
 * custom domain later, with no file to remember to edit.
 */
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /

# Private areas — no value in the index and shouldn't be crawled.
Disallow: /dashboard
Disallow: /admin
Disallow: /auth
Disallow: /api

Sitemap: ${SITE_URL}/sitemap-index.xml
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
