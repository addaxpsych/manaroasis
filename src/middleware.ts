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

  try {
    const supabase = createSupabaseServerClient({
      request: context.request,
      cookies: context.cookies,
    });
    context.locals.supabase = supabase;

    // getUser() revalidates against Supabase rather than trusting the cookie,
    // and refreshes the session as a side effect. With no auth cookie present
    // it returns without a network call, so anonymous visitors to the public
    // course pages pay nothing for this.
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
  } catch (error) {
    /*
     * Almost always a missing environment variable in the deployed Worker:
     * requireVar() throws before any page runs, so EVERY on-demand route
     * returns an opaque 500 while the prerendered pages keep working. That
     * combination is confusing to diagnose from the outside, so name the
     * cause in the log (Workers observability is enabled in wrangler.jsonc)
     * and show visitors something other than a stack trace.
     */
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `[middleware] Supabase client unavailable for ${context.url.pathname} — ${detail}`,
    );

    return new Response(SERVICE_UNAVAILABLE_HTML, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        // Machine-readable hint for curl/monitoring without leaking config
        // details into the visible page.
        'x-config-error': 'supabase-unavailable',
      },
    });
  }

  return next();
});

const SERVICE_UNAVAILABLE_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>الخدمة غير متاحة مؤقتاً</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f7efe1;
       color:#2b241c;font-family:Tahoma,Arial,sans-serif;line-height:1.9;padding:24px}
  .card{max-width:30rem;text-align:center;background:#fff;border:1px solid #e5d1ac;
        border-radius:7rem 7rem 1.25rem 1.25rem;padding:48px 32px}
  h1{margin:0 0 12px;font-size:1.35rem;color:#1b3d30}
  p{margin:0 0 20px;color:#6b5b4a;font-size:.95rem}
  a{display:inline-block;background:#1f7a4d;color:#fff;text-decoration:none;
    padding:12px 24px;border-radius:12px;font-weight:700;font-size:.9rem}
</style>
</head>
<body>
  <div class="card">
    <h1>الخدمة غير متاحة مؤقتاً</h1>
    <p>بنعمل على إصلاح المشكلة دلوقتي. لو محتاجة تحجزي أو تسألي، كلمينا على واتساب وهنرد عليكِ فوراً.</p>
    <a href="https://wa.me/201010429267">تواصلي على واتساب</a>
  </div>
</body>
</html>`;
