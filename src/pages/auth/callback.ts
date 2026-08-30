import type { APIRoute } from 'astro';

/**
 * Exchanges the one-time code from a Supabase email link (signup confirmation,
 * magic link, password recovery) for a session cookie.
 */
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next');
  const safeNext = next?.startsWith('/') ? next : '/dashboard';

  if (!code) {
    return redirect('/auth/login?error=missing_code');
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect('/auth/login?error=invalid_code');
  }

  return redirect(safeNext);
};
