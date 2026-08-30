import type { APIRoute } from 'astro';

/**
 * Configuration diagnostic.
 *
 * Reports which environment variable NAMES the deployed Worker can actually
 * see. Values are never read or returned — only presence, plus the list of
 * key names, which are already public in wrangler.jsonc and the repo.
 *
 * This exists because a missing variable is indistinguishable from a
 * misspelled one, a variable added to the Build section instead of Runtime,
 * or a plaintext var wiped by `wrangler deploy` overwriting it from
 * wrangler.jsonc. All four fail identically from the outside; this tells them
 * apart in a single request.
 *
 * Deliberately exempted from the Supabase setup in middleware, since the whole
 * point is to work when Supabase configuration is broken.
 */

/** Everything `AppEnv` in src/lib/env.ts expects at runtime. */
const REQUIRED = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_NOTIFY_EMAIL',
  'PUBLIC_SITE_URL',
] as const;

export const GET: APIRoute = async () => {
  let visibleKeys: string[] = [];
  let readError: string | null = null;

  try {
    const { env } = await import('cloudflare:workers');
    // `Env` is a generated interface with no index signature, so widen
    // through `unknown` rather than asserting an overlap that TS rejects.
    visibleKeys = Object.keys(env as unknown as Record<string, unknown>).sort();
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error);
  }

  const present: string[] = [];
  const missing: string[] = [];
  for (const key of REQUIRED) {
    (visibleKeys.includes(key) ? present : missing).push(key);
  }

  // Names the Worker has that we do not expect — where a typo shows up.
  const unexpected = visibleKeys.filter(
    (k) => !(REQUIRED as readonly string[]).includes(k),
  );

  const body = {
    ok: missing.length === 0,
    missing,
    present,
    unexpectedKeys: unexpected,
    // Confirms whether PUBLIC_SITE_URL reached the BUILD (not just runtime):
    // this value is inlined at build time, so localhost here means the build
    // variable is still unset even if the runtime one is correct.
    siteUrlBakedInAtBuild: import.meta.env.PUBLIC_SITE_URL ?? '(unset)',
    readError,
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: body.ok ? 200 : 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
