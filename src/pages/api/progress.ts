import type { APIRoute } from 'astro';
import { z } from 'zod';

const schema = z.object({
  lessonId: z.uuid(),
  completed: z.boolean(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: 'unauthenticated' }, 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return json({ error: 'bad_request' }, 400);

  const { lessonId, completed } = parsed.data;

  /* Confirm the caller may actually read this lesson before recording progress
     against it. Without this a user could mark lessons of a course they never
     bought, inflating an admin's progress view with fabricated data. */
  const { data: readable, error: checkError } = await locals.supabase.rpc('can_read_lesson', {
    p_lesson_id: lessonId,
  });

  if (checkError) {
    console.error('can_read_lesson failed', checkError);
    return json({ error: 'server_error' }, 500);
  }
  if (!readable) return json({ error: 'forbidden' }, 403);

  const { error } = await locals.supabase.from('lesson_progress').upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  );

  if (error) {
    console.error('lesson_progress upsert failed', error);
    return json({ error: 'server_error' }, 500);
  }

  return json({ ok: true, completed });
};
