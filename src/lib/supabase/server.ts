/**
 * Request-scoped Supabase client that reads and writes the auth cookies on the
 * Astro request/response pair, so sessions survive navigation and SSR renders
 * see a signed-in user.
 */
import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { requireVar } from '../env';
import type { Database } from './types';

export function createSupabaseServerClient(context: {
  request: Request;
  cookies: AstroCookies;
}) {
  return createServerClient<Database>(
    requireVar('PUBLIC_SUPABASE_URL'),
    requireVar('PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('Cookie') ?? '').map(
            ({ name, value }) => ({ name, value: value ?? '' }),
          );
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
              sameSite: 'lax',
              httpOnly: true,
              secure: import.meta.env.PROD,
            });
          });
        },
      },
    },
  );
}
