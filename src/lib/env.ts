/**
 * Server-side environment access.
 *
 * NOTE: `Astro.locals.runtime.env` was REMOVED in Astro v6 / adapter v14 — it
 * now throws. The supported API is `import { env } from 'cloudflare:workers'`,
 * which works identically in `astro dev` (the adapter runs dev in workerd) and
 * in production, so there is a single code path and no dev/prod fallback.
 *
 * Import this ONLY from on-demand routes, API endpoints and middleware.
 * Importing it into a prerendered page pulls `cloudflare:workers` into the
 * build graph and will fail the build.
 */
import { env } from 'cloudflare:workers';

export interface AppEnv {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  ADMIN_NOTIFY_EMAIL: string;
  PUBLIC_SITE_URL: string;
}

export function getEnv(): AppEnv {
  return env as unknown as AppEnv;
}

/**
 * Reads a required variable, failing loudly at the point of use rather than
 * letting an empty string reach Supabase or Resend and produce a confusing
 * downstream error.
 */
export function requireVar(key: keyof AppEnv): string {
  const value = getEnv()[key];
  if (!value) {
    throw new Error(
      `Missing environment variable "${key}". Add it to .dev.vars for local dev, ` +
        `and to wrangler vars (public) or \`wrangler secret put\` (secret) for production.`,
    );
  }
  return value;
}
