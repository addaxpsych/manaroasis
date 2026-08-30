import { useState } from 'react';

export interface RequestRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  courseTitle: string;
  courseId: string | null;
}

interface Props {
  requests: RequestRow[];
  whatsappBase: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  paid: 'تم الدفع',
  enrolled: 'تم التفعيل',
  rejected: 'مرفوض',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-gold-200 text-gold-600',
  contacted: 'bg-sky-300/40 text-sky-700',
  paid: 'bg-oasis-700/12 text-oasis-700',
  enrolled: 'bg-oasis-700 text-white',
  rejected: 'bg-sand-200 text-ink-faint',
};

/**
 * Enrollment requests queue. Approving creates the account if needed, activates
 * the enrollment and sends the Arabic activation email — all in one action, so
 * the clinic never has to touch the Supabase dashboard.
 */
export default function RequestsTable({ requests, whatsappBase }: Props) {
  const [rows, setRows] = useState(requests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('InstaPay');
  const [reference, setReference] = useState('');

  async function approve(row: RequestRow) {
    setBusyId(row.id);
    setError('');
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: row.id,
          amountPaid: amount ? Number(amount) : undefined,
          paymentMethod: method || undefined,
          paymentReference: reference || undefined,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        emailSent?: boolean;
      };

      if (!response.ok) {
        setError(
          body.error === 'course_missing'
            ? 'الطلب ده مش مرتبط بكورس. صححي الطلب الأول.'
            : 'مانفعش نفعّل الاشتراك. جربي تاني.',
        );
        return;
      }

      setRows((current) =>
        current.map((r) => (r.id === row.id ? { ...r, status: 'enrolled' } : r)),
      );
      setExpanded(null);
      setAmount('');
      setReference('');

      if (body.emailSent === false) {
        setError('تم التفعيل، لكن إيميل التأكيد مااتبعتش. راجعي إعدادات Resend.');
      }
    } catch {
      setError('مفيش اتصال. جربي تاني.');
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(row: RequestRow, status: string) {
    setBusyId(row.id);
    try {
      const response = await fetch('/api/admin/request-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: row.id, status }),
      });
      if (response.ok) {
        setRows((current) => current.map((r) => (r.id === row.id ? { ...r, status } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-sand-400/50 bg-white p-10 text-center text-sm text-ink-soft">
        مفيش طلبات التحاق حالياً.
      </p>
    );
  }

  const input =
    'w-full rounded-lg border border-sand-400/60 bg-white px-3 py-2 text-sm ' +
    'focus:border-oasis-700 focus:outline-none focus:ring-2 focus:ring-oasis-700/15';

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {rows.map((row) => {
        const isOpen = expanded === row.id;
        const done = row.status === 'enrolled';

        return (
          <article key={row.id} className="overflow-hidden rounded-2xl border border-sand-400/50 bg-white">
            <div className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-oasis-900">{row.full_name}</h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_STYLES[row.status] ?? 'bg-sand-200 text-ink-soft'
                    }`}
                  >
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{row.courseTitle}</p>
                <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-faint">
                  <span dir="ltr">{row.phone}</span>
                  <span dir="ltr">{row.email}</span>
                  {row.city && <span>{row.city}</span>}
                </p>
                {row.notes && (
                  <p className="mt-2 rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink-soft">{row.notes}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`${whatsappBase}?text=${encodeURIComponent(
                    `السلام عليكم ${row.full_name}، بخصوص طلب التحاقك بـ${row.courseTitle}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#1f7a4d] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#186b42]"
                >
                  واتساب
                </a>

                {!done && row.status !== 'contacted' && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'contacted')}
                    disabled={busyId === row.id}
                    className="rounded-lg border border-sand-400/60 px-3.5 py-2 text-xs font-semibold text-ink-soft transition hover:bg-sand-100 disabled:opacity-50"
                  >
                    تم التواصل
                  </button>
                )}

                {!done && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="rounded-lg bg-oasis-900 px-3.5 py-2 text-xs font-bold text-sand-50 transition hover:bg-oasis-700"
                  >
                    {isOpen ? 'إلغاء' : 'تأكيد الدفع وتفعيل'}
                  </button>
                )}
              </div>
            </div>

            {isOpen && !done && (
              <div className="border-t border-sand-400/50 bg-sand-50 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-oasis-900">
                      المبلغ المدفوع (ج.م)
                    </label>
                    <input
                      type="number" min="0" value={amount} dir="ltr"
                      onChange={(e) => setAmount(e.target.value)}
                      className={`${input} text-start`} placeholder="1500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-oasis-900">طريقة الدفع</label>
                    <select value={method} onChange={(e) => setMethod(e.target.value)} className={input}>
                      <option>InstaPay</option>
                      <option>Vodafone Cash</option>
                      <option>تحويل بنكي</option>
                      <option>كاش في العيادة</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-oasis-900">
                      رقم العملية <span className="font-normal text-ink-faint">(اختياري)</span>
                    </label>
                    <input
                      type="text" value={reference} dir="ltr"
                      onChange={(e) => setReference(e.target.value)}
                      className={`${input} text-start`} placeholder="REF-123"
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => approve(row)}
                    disabled={busyId === row.id}
                    className="rounded-xl bg-oasis-900 px-6 py-3 text-sm font-bold text-sand-50 transition hover:bg-oasis-700 disabled:opacity-60"
                  >
                    {busyId === row.id ? 'جاري التفعيل…' : 'فعّلي الاشتراك وابعتي الإيميل'}
                  </button>
                  <p className="text-xs text-ink-faint">
                    هيتم إنشاء الحساب لو مش موجود، وهيوصلها إيميل بتفعيل الكورس.
                  </p>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
