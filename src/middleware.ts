import { defineMiddleware } from 'astro:middleware';

/**
 * Attaches a request-scoped Supabase client and the current session to
 * `locals` for every on-demand route.
 *
 * The `isPrerendered` guard is essential, not an optimisation: middleware also
 * runs while the marketing pages are prerendered at build time, where there is
 * no request session and touching `cloudflare:workers` env would fail the
 * build. Prerendered routes return untouched.
 *
 * Everything else gets the client — including `/courses`, which reads the
 * catalogue. An earlier version allow-listed only `/dashboard`, `/admin`,
 * `/api` and `/auth`; the course pages then received `undefined`, and their
 * defensive try/catch turned that into a permanently empty catalogue.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.isPrerendered) return next();

  // Imported lazily so `cloudflare:workers` never enters the static build graph.
  const { createSupabaseServerClient } = await import('./lib/supabase/server');

  const supabase = createSupabaseServerClient({
    request: context.request,
    cookies: context.cookies,
  });
  context.locals.supabase = supabase;

  // getUser() revalidates against Supabase rather than trusting the cookie, and
  // refreshes the session as a side effect. With no auth cookie present it
  // returns immediately without a network call, so anonymous visitors to the
  // public course pages pay nothing for this.
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
