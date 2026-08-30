-- ─────────────────────────────────────────────────────────────
-- 0003 — enrollment pipeline
--
-- Flow: visitor submits an enrollment_request -> pays offline (InstaPay /
-- Vodafone Cash / bank transfer) -> admin confirms payment and creates the
-- enrollment -> the course unlocks for that customer.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.enrollment_requests (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid references public.courses (id) on delete set null,
  full_name    text not null,
  email        text not null,
  phone        text not null,
  city         text,
  notes        text,
  status       text not null default 'new'
               check (status in ('new', 'contacted', 'paid', 'enrolled', 'rejected')),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.enrollments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  course_id          uuid not null references public.courses (id) on delete cascade,
  status             text not null default 'active'
                     check (status in ('pending', 'active', 'expired', 'cancelled')),
  enrolled_by        uuid references public.profiles (id) on delete set null,
  amount_paid_egp    integer,
  payment_method     text,
  payment_reference  text,
  notes              text,
  starts_at          timestamptz not null default now(),
  expires_at         timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  completed_at    timestamptz,
  seconds_watched integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text,
  phone       text not null,
  subject     text,
  message     text not null,
  kind        text not null default 'contact'
              check (kind in ('contact', 'booking', 'online_consult')),
  status      text not null default 'new'
              check (status in ('new', 'read', 'handled')),
  created_at  timestamptz not null default now()
);

create index if not exists enrollments_user_idx   on public.enrollments (user_id);
create index if not exists enrollments_course_idx on public.enrollments (course_id);
create index if not exists progress_user_idx      on public.lesson_progress (user_id);
create index if not exists requests_status_idx    on public.enrollment_requests (status, created_at desc);

drop trigger if exists enrollments_touch_updated_at on public.enrollments;
create trigger enrollments_touch_updated_at
  before update on public.enrollments
  for each row execute function public.touch_updated_at();
