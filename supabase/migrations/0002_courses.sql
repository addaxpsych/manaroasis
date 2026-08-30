-- ─────────────────────────────────────────────────────────────
-- 0002 — course catalogue
-- courses → modules → lessons.
--
-- Doctors, clinics and branches deliberately live in `src/config/*.ts`
-- rather than here: they are static marketing content, so keeping them
-- out of the database lets every marketing page prerender with no query.
-- Courses reference their instructor by that config slug.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title_ar            text not null,
  hook_ar             text,
  description_ar      text,
  cover_image         text,
  -- The five benefit pills from the poster, as ["…", "…"].
  highlights          jsonb not null default '[]'::jsonb,
  delivery_label      text default 'أونلاين | مسجل',
  price_egp           integer not null default 0,
  discount_price_egp  integer,
  -- Which visual system the sales page renders in. Both are real brand
  -- treatments taken from the client's posters.
  theme               text not null default 'oasis'
                      check (theme in ('oasis', 'botanical')),
  -- 'free' courses are open to everyone with no account and no enrollment
  -- (their lessons are all previews). 'paid' courses go through the
  -- request -> payment -> admin activation flow.
  access              text not null default 'paid'
                      check (access in ('free', 'paid')),
  instructor_slug     text,
  is_published        boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title_ar    text not null,
  summary_ar  text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references public.modules (id) on delete cascade,
  slug              text not null,
  title_ar          text not null,
  content_ar        text,
  video_provider    text check (video_provider in ('youtube', 'vimeo', 'bunny', 'cloudflare_stream')),
  video_id          text,
  duration_minutes  integer,
  attachments       jsonb not null default '[]'::jsonb,
  -- Preview lessons are readable by anyone; everything else needs an
  -- active enrollment. This flag is enforced in RLS, not just in the UI.
  is_preview        boolean not null default false,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (module_id, slug)
);

create index if not exists modules_course_idx on public.modules (course_id, sort_order);
create index if not exists lessons_module_idx on public.lessons (module_id, sort_order);

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute function public.touch_updated_at();
