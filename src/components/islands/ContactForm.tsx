import { useState, type FormEvent } from 'react';

interface Props {
  whatsappHref: string;
}

type State = 'idle' | 'sending' | 'sent' | 'error';

export default function ContactForm({ whatsappHref }: Props) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    setError('');

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      subject: String(form.get('subject') ?? '').trim(),
      message: String(form.get('message') ?? '').trim(),
      kind: String(form.get('kind') ?? 'contact'),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? 'حصلت مشكلة. جربي تاني أو كلمينا على واتساب.');
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
      <div className="rounded-2xl border border-oasis-700/40 bg-oasis-700/8 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-oasis-900">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f7efe1" strokeWidth="2.5" strokeLinecap="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
        </div>
        <h3 className="mt-5 text-xl font-extrabold text-oasis-900">وصلتنا رسالتك</h3>
        <p className="mt-3 text-sm leading-loose text-ink-soft">
          هنرد عليكِ في أقرب وقت خلال ساعات العمل.
        </p>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex rounded-xl bg-[#1f7a4d] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#186b42]"
        >
          أو كلمينا على واتساب
        </a>
      </div>
    );
  }

  const field =
    'w-full rounded-xl border border-sand-400/60 bg-sand-50 px-4 py-3 text-sm text-ink ' +
    'placeholder:text-ink-faint focus:border-oasis-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-oasis-700/15';
  const label = 'mb-1.5 block text-sm font-semibold text-oasis-900';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className={label} htmlFor="kind">نوع الرسالة</label>
        <select id="kind" name="kind" className={field} defaultValue="contact">
          <option value="contact">استفسار عام</option>
          <option value="booking">حجز موعد</option>
          <option value="online_consult">استشارة أونلاين</option>
        </select>
      </div>

      <div>
        <label className={label} htmlFor="name">الاسم</label>
        <input id="name" name="name" type="text" required autoComplete="name" className={field} placeholder="اسمك" />
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
          <label className={label} htmlFor="email">
            البريد <span className="font-normal text-ink-faint">(اختياري)</span>
          </label>
          <input
            id="email" name="email" type="email" autoComplete="email"
            dir="ltr" className={`${field} text-start`} placeholder="name@example.com"
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="subject">
          الموضوع <span className="font-normal text-ink-faint">(اختياري)</span>
        </label>
        <input id="subject" name="subject" type="text" className={field} placeholder="موضوع الرسالة" />
      </div>

      <div>
        <label className={label} htmlFor="message">رسالتك</label>
        <textarea id="message" name="message" rows={5} required className={field} placeholder="اكتبي استفسارك" />
      </div>

      {state === 'error' && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-xl bg-oasis-900 px-6 py-4 text-sm font-bold text-sand-50 transition hover:bg-oasis-700 disabled:opacity-60"
      >
        {state === 'sending' ? 'جاري الإرسال…' : 'أرسلي الرسالة'}
      </button>

      <p className="text-center text-xs leading-relaxed text-ink-faint">
        من فضلك متكتبيش تفاصيل طبية حساسة هنا — الرسائل دي مش قناة طبية آمنة.
      </p>
    </form>
  );
}
