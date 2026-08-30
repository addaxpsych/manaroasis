import type { APIRoute } from 'astro';

/**
 * POST-only: a GET sign-out can be triggered by any image or link on a third
 * party page, logging the user out without their intent.
 */
export const POST: APIRoute = async ({ locals, redirect }) => {
  await locals.supabase.auth.signOut();
  return redirect('/');
};
