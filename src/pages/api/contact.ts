import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseAdminClient } from '../../lib/supabase/admin';
import { sendEmail } from '../../lib/email/resend';
import { contactReceived, contactAlert } from '../../lib/email/templates';
import { getEnv } from '../../lib/env';

const schema = z.object({
  name: z.string().min(2, 'الاسم قصير جداً').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?20)?0?1[0125][0-9]{8}$/, 'رقم الموبايل غير صحيح'),
  email: z.email('البريد الإلكتروني غير صحيح').max(200).optional().or(z.literal('')),
  subject: z.string().max(160).optional().default(''),
  message: z.string().min(5, 'اكتبي رسالتك من فضلك').max(2000),
  kind: z.enum(['contact', 'booking', 'online_consult']).default('contact'),
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
    return json({ message: parsed.error.issues[0]?.message ?? 'راجعي البيانات.' }, 400);
  }

  const input = parsed.data;
  // `contact_messages` has no public INSERT policy, so this goes through the
  // service-role client rather than exposing the table to the anon key.
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from('contact_messages').insert({
    name: input.name,
    phone: input.phone,
    email: input.email || null,
    subject: input.subject || null,
    message: input.message,
    kind: input.kind,
    status: 'new',
  });

  if (error) {
    console.error('contact_messages insert failed', error);
    return json({ message: 'حصلت مشكلة أثناء إرسال الرسالة. جربي تاني.' }, 500);
  }

  const env = getEnv();
  const alert = contactAlert(input);

  const sends: Promise<unknown>[] = [
    sendEmail({
      to: env.ADMIN_NOTIFY_EMAIL,
      ...alert,
      ...(input.email ? { replyTo: input.email } : {}),
    }),
  ];

  if (input.email) {
    sends.push(sendEmail({ to: input.email, ...contactReceived({ name: input.name }) }));
  }

  await Promise.all(sends);

  return json({ ok: true });
};
