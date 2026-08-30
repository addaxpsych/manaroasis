import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdminApi } from '../../../lib/guards';

const schema = z.object({
  requestId: z.uuid(),
  status: z.enum(['new', 'contacted', 'paid', 'enrolled', 'rejected']),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async (context) => {
  const auth = requireAdminApi(context);
  if ('error' in auth) return auth.error;

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return json({ error: 'bad_request' }, 400);

  // The admin's own client is used here on purpose: RLS already restricts
  // these tables to admins, so there is no need to reach for service-role.
  const { error } = await context.locals.supabase
    .from('enrollment_requests')
    .update({
      status: parsed.data.status,
      handled_by: auth.userId,
      handled_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.requestId);

  if (error) {
    console.error('request status update failed', error);
    return json({ error: 'server_error' }, 500);
  }

  return json({ ok: true });
};
