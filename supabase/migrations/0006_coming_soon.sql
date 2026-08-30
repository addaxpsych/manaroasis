-- ─────────────────────────────────────────────────────────────
-- 0006 — "قريباً" (coming soon) courses
--
-- A course that should be VISIBLE but not yet purchasable needs a third
-- state. `is_published` alone cannot express it: false hides the course
-- entirely, true offers it for sale. `coming_soon` sits alongside — the
-- course appears in the catalogue and shows its curriculum, but the
-- enrollment form is replaced by a "tell me when it opens" prompt.
--
-- This also lifts the publish guard in /admin/courses, which normally
-- refuses to publish a course with no price: a coming-soon course
-- legitimately has no price yet.
-- ─────────────────────────────────────────────────────────────

alter table public.courses
  add column if not exists coming_soon boolean not null default false;

comment on column public.courses.coming_soon is
  'Visible in the catalogue but not yet open for enrollment. Shown as قريباً.';

-- كورس الاستعداد للرضاعة قبل الولادة — announce it now, sell it later.
update public.courses
set is_published = true,
    coming_soon  = true
where slug = 'breastfeeding-prep';
