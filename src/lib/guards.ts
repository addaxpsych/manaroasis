import type { APIContext, AstroGlobal } from 'astro';
import type { Profile } from './supabase/types';

type Ctx = AstroGlobal | APIContext;

/**
 * Server-side authentication gate. Every protected page and endpoint calls
 * this itself — hiding a nav link is presentation, never authorisation.
 *
 * Returns either a Response to return immediately, or the signed-in profile.
 */
export function requireUser(
  context: Ctx,
): { redirect: Response } | { profile: Profile; userId: string } {
  const { user, profile } = context.locals;

  if (!user || !profile) {
    const next = encodeURIComponent(context.url.pathname + context.url.search);
    return { redirect: context.redirect(`/auth/login?next=${next}`) };
  }

  return { profile, userId: user.id };
}

/**
 * Admin gate. Re-checked on every admin route independently of the UI, so a
 * customer who guesses /admin gets bounced rather than served.
 */
export function requireAdmin(
  context: Ctx,
): { redirect: Response } | { profile: Profile; userId: string } {
  const result = requireUser(context);
  if ('redirect' in result) return result;

  if (result.profile.role !== 'admin') {
    return { redirect: context.redirect('/dashboard') };
  }

  return result;
}

/** JSON gate for API endpoints — 401/403 rather than a redirect. */
export function requireAdminApi(
  context: APIContext,
): { error: Response } | { profile: Profile; userId: string } {
  const { user, profile } = context.locals;

  if (!user || !profile) {
    return {
      error: new Response(JSON.stringify({ error: 'unauthenticated' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    };
  }

  if (profile.role !== 'admin') {
    return {
      error: new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    };
  }

  return { profile, userId: user.id };
}
