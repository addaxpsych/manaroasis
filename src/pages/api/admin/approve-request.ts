import type { APIRoute } from 'astro';
import { z } from 'zod';
import { requireAdminApi } from '../../../lib/guards';
import { createSupabaseAdminClient } from '../../../lib/supabase/admin';
import { sendEmail } from '../../../lib/email/resend';
import { enrollmentActivated } from '../../../lib/email/templates';
import { getEnv } from '../../../lib/env';

const schema = z.object({
  requestId: z.uuid(),
  amountPaid: z.number().int().min(0).optional(),
  paymentMethod: z.string().max(60).optional(),
  paymentReference: z.string().max(120).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/**
 * Confirms payment for an enrollment request and activates the course.
 *
 * Handles the common case where the customer paid before ever creating an
 * account: the auth user is provisioned here and sent a link to set their own
 * password, so they never need to register separately.
 */
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

  const { requestId, amountPaid, paymentMethod, paymentReference } = parsed.data;
  const admin = createSupabaseAdminClient();
  const env = getEnv();
  const siteUrl = env.PUBLIC_SITE_URL ?? 'https://manaroasis.com';

  const { data: request } = await admin
    .from('enrollment_requests')
    .select('*, course:courses(id, slug, title_ar)')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) return json({ error: 'not_found' }, 404);

  const course = (request as any).course as { id: string; slug: string; title_ar: string } | null;
  if (!course) return json({ error: 'course_missing' }, 409);

  const email = request.email.toLowerCase();

  // Find an existing auth user for this address, or provision one.
  let userId: string | null = null;
  let isNewUser = false;

  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = userList?.users.find((u) => u.email?.toLowerCase() === email);

  if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: request.full_name, phone: request.phone },
    });
    if (createError || !created.user) {
      console.error('createUser failed', createError);
      return json({ error: 'user_create_failed' }, 500);
    }
    userId = created.user.id;
    isNewUser = true;
  }

  const { error: enrollError } = await admin.from('enrollments').upsert(
    {
      user_id: userId,
      course_id: course.id,
      status: 'active',
      enrolled_by: auth.userId,
      amount_paid_egp: amountPaid ?? null,
      payment_method: paymentMethod ?? null,
      payment_reference: paymentReference ?? null,
      starts_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,course_id' },
  );

  if (enrollError) {
    console.error('enrollment upsert failed', enrollError);
    return json({ error: 'enroll_failed' }, 500);
  }

  await admin
    .from('enrollment_requests')
    .update({
      status: 'enrolled',
      handled_by: auth.userId,
      handled_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  /* A brand-new account has no password. Send a recovery link so she sets one
     herself rather than us inventing and emailing a temporary password. */
  let loginUrl = `${siteUrl}/dashboard/courses/${course.slug}`;
  if (isNewUser) {
    const { data: link } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/auth/reset-password` },
    });
    if (link?.properties?.action_link) loginUrl = link.properties.action_link;
  }

  const mail = enrollmentActivated({
    name: request.full_name,
    courseTitle: course.title_ar,
    loginUrl,
  });
  const result = await sendEmail({ to: request.email, ...mail });
  if (!result.ok) console.error('activation email failed', result.error);

  return json({ ok: true, emailSent: result.ok, isNewUser });
};
