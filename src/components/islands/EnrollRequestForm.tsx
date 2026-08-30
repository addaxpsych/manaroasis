import { useState, type FormEvent } from 'react';

interface Props {
  courseId: string;
  courseTitle: string;
  whatsappHref: string;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Enrollment request form.
 *
 * Posts to a server endpoint rather than writing to Supabase from the browser:
 * `enrollment_requests` has no public INSERT policy by design, and the server
 * is where the confirmation and admin-alert emails are sent from.
 */
export default function EnrollRequestForm({ courseId, courseTitle, whatsappHref }: Props) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string>('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');

    const form = new FormData(event.currentTarget);
    const payload = {
      courseId,
      fullName: String(form.get('fullName') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      city: String(form.get('city') ?? '').trim(),
      notes: String(form.get('notes') ?? '').trim(),
    };

    try {
      const response = await fetch('/api/enrollment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'حصلت مشكلة أثناء إرسال الطلب. جربي تاني أو كلمينا على واتساب.');
        setState('error');
        return;
      }

      setState('sent');
    } catch {
      setError('مفيش اتصال بالإنترنت. جربي تاني أو كلمينا على واتساب.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl border border-[var(--ornament)]/45 bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-extrabold text-[var(--accent-strong)]">وصلنا طلبك</h3>
        <p className="mt-3 text-sm leading-loose text-ink-soft">
          بعتنا لك رسالة على البريد فيها الخطوات التالية، وهنتواصل معاكِ خلال يوم عمل
          واحد لتأكيد الحجز وطريقة الدفع.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#1f7a4d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#186b42]"
        >
          أو كلمينا على واتساب دلوقتي
        </a>
      </div>
    );
  }

  const field =
    'w-full rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm text-ink ' +
    'placeholder:text-ink-faint focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20';
  const label = 'mb-1.5 block text-sm font-semibold text-[var(--accent-strong)]';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm leading-loose text-ink-soft">
        سيبي بياناتك وهنتواصل معاكِ لتأكيد الحجز في <strong>{courseTitle}</strong>.
      </p>

      <div>
        <label className={label} htmlFor="fullName">الاسم بالكامل</label>
        <input id="fullName" name="fullName" type="text" required autoComplete="name" className={field} placeholder="اسمك" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="phone">رقم الموبايل</label>
          <input
            id="phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel"
            dir="ltr" className={`${field} text-start`} placeholder="01xxxxxxxxx"
          />
        </div>
        <div>
          <label className={label} htmlFor="city">المدينة</label>
          <input id="city" name="city" type="text" autoComplete="address-level2" className={field} placeholder="القاهرة" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="email">البريد الإلكتروني</label>
        <input
          id="email" name="email" type="email" required autoComplete="email"
          dir="ltr" className={`${field} text-start`} placeholder="name@example.com"
        />
      </div>

      <div>
        <label className={label} htmlFor="notes">
          حابة تضيفي حاجة؟ <span className="font-normal text-ink-faint">(اختياري)</span>
        </label>
        <textarea id="notes" name="notes" rows={3} className={field} placeholder="أي سؤال أو ملاحظة" />
      </div>

      {state === 'error' && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-xl bg-[var(--accent-strong)] px-6 py-4 text-sm font-bold text-white transition hover:bg-[var(--accent)] disabled:opacity-60"
      >
        {state === 'sending' ? 'جاري الإرسال…' : 'اطلبي الالتحاق'}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        بإرسال الطلب أنتِ موافقة على تواصلنا معاكِ على الرقم والبريد اللي كتبتيهم.
      </p>
    </form>
  );
}
