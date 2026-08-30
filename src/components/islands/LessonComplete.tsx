import { useState } from 'react';

interface Props {
  lessonId: string;
  initiallyComplete: boolean;
  nextHref?: string;
}

/**
 * Marks a lesson complete and moves the student on.
 *
 * Optimistic: the tick flips immediately and rolls back if the request fails,
 * because the network round-trip is the slowest part of an otherwise trivial
 * interaction.
 */
export default function LessonComplete({ lessonId, initiallyComplete, nextHref }: Props) {
  const [complete, setComplete] = useState(initiallyComplete);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const target = !complete;
    setBusy(true);
    setFailed(false);
    setComplete(target);

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: target }),
      });
      if (!response.ok) throw new Error('failed');

      if (target && nextHref) {
        window.location.href = nextHref;
        return;
      }
    } catch {
      setComplete(!target);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          complete
            ? 'inline-flex items-center justify-center gap-2 rounded-xl border border-oasis-700 px-6 py-3.5 text-sm font-bold text-oasis-700 transition hover:bg-oasis-700/8 disabled:opacity-60'
            : 'inline-flex items-center justify-center gap-2 rounded-xl bg-oasis-900 px-6 py-3.5 text-sm font-bold text-sand-50 transition hover:bg-oasis-700 disabled:opacity-60'
        }
      >
        {complete ? (
          <>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="m5 12 5 5L20 7" />
            </svg>
            تم الانتهاء من الدرس
          </>
        ) : (
          'تم الانتهاء من الدرس'
        )}
      </button>

      {failed && (
        <p role="alert" className="text-sm text-red-700">
          مانفعش نحفظ التقدم. جربي تاني.
        </p>
      )}

      {nextHref && (
        <a href={nextHref} className="text-sm font-semibold text-oasis-700 hover:text-gold-600">
          الدرس التالي ←
        </a>
      )}
    </div>
  );
}
