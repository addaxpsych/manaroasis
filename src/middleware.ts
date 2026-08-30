import { defineMiddleware } from 'astro:middleware';

/**
 * Attaches a Supabase client and the current user to `locals` for routes that
 * actually need them.
 *
 * The path guard is not an optimisation — middleware also runs while
 * prerendering the marketing pages at build time, and touching Supabase there
 * would both fail (no secrets during a plain `astro build`) and pointlessly
 * couple static pages to the database. Public paths return untouched.
 */
const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/api', '/auth'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return next();
  }

  // Imported lazily so `cloudflare:workers` never enters the static build graph.
  const { createSupabaseServerClient } = await import('./lib/supabase/server');

  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });

  context.locals.supabase = supabase;

  // getUser() revalidates against Supabase rather than trusting the cookie,
  // and refreshes the session as a side effect.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  context.locals.user = user ?? null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    context.locals.profile = profile ?? null;
  } else {
    context.locals.profile = null;
  }

  return next();
});
