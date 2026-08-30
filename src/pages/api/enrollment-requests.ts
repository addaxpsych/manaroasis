import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseAdminClient } from '../../lib/supabase/admin';
import { sendEmail } from '../../lib/email/resend';
import { requestReceived, requestAlert } from '../../lib/email/templates';
import { getEnv } from '../../lib/env';
import { SITE_URL } from '../../config/site';

const schema = z.object({
  courseId: z.uuid(),
  fullName: z.string().min(2, 'الاسم قصير جداً').max(120),
  email: z.email('البريد الإلكتروني غير صحيح').max(200),
  // Egyptian mobile: 11 digits starting 010/011/012/015, with or without +20.
  phone: z
    .string()
    .trim()
    .regex(/^(\+?20)?0?1[0125][0-9]{8}$/, 'رقم الموبايل غير صحيح'),
  city: z.string().max(80).optional().default(''),
  notes: z.string().max(1000).optional().default(''),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ message: 'طلب غير صالح.' }, 400);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return json(
      { message: parsed.error.issues[0]?.message ?? 'من فضلك راجعي البيانات.' },
      400,
    );
  }

  const input = parsed.data;
  // Service-role: `enrollment_requests` has no public INSERT policy, so this
  // write cannot be forged straight from a browser with the anon key.
  const admin = createSupabaseAdminClient();

  const { data: course } = await admin
    .from('courses')
    .select('id, title_ar, slug')
    .eq('id', input.courseId)
    .maybeSingle();

  if (!course) {
    return json({ message: 'الكورس غير متاح.' }, 404);
  }

  const { error: insertError } = await admin.from('enrollment_requests').insert({
    course_id: course.id,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone,
    city: input.city || null,
    notes: input.notes || null,
    status: 'new',
  });

  if (insertError) {
    console.error('enrollment_requests insert failed', insertError);
    return json({ message: 'حصلت مشكلة أثناء حفظ الطلب. جربي تاني.' }, 500);
  }

  // The request is already saved, so email failures are logged but never
  // surfaced as an error — the customer should not be told their request
  // failed when it did not.
  const env = getEnv();
  const siteUrl = env.PUBLIC_SITE_URL ?? SITE_URL;

  const customerMail = requestReceived({
    name: input.fullName,
    courseTitle: course.title_ar,
  });
  const adminMail = requestAlert({
    name: input.fullName,
    phone: input.phone,
    email: input.email,
    city: input.city,
    notes: input.notes,
    courseTitle: course.title_ar,
    adminUrl: `${siteUrl}/admin/requests`,
  });

  const [customerResult, adminResult] = await Promise.all([
    sendEmail({ to: input.email, ...customerMail }),
    sendEmail({
      to: env.ADMIN_NOTIFY_EMAIL,
      ...adminMail,
      replyTo: input.email,
    }),
  ]);

  if (!customerResult.ok) console.error('customer email failed', customerResult.error);
  if (!adminResult.ok) console.error('admin email failed', adminResult.error);

  return json({ ok: true });
};
