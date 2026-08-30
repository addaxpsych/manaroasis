-- ═══════════════════════════════════════════════════════════
-- واحة د. منار مبارز — full schema, generated from
-- supabase/migrations/*.sql. Paste into the Supabase SQL editor
-- and run once.
-- ═══════════════════════════════════════════════════════════


-- ▼▼▼ 0001_profiles.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────
-- 0001 — profiles
-- One row per authenticated person, created automatically on signup.
-- `role` is the only authorisation input the app trusts.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  city        text,
  role        text not null default 'customer'
              check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.profiles.role is
  'Authorisation source of truth. Only ever elevated manually via supabase/seed/promote_admin.sql.';

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Mirror every new auth user into profiles. SECURITY DEFINER because the
-- trigger runs as the signing-up user, who has no insert rights here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ▼▼▼ 0002_courses.sql ▼▼▼

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


-- ▼▼▼ 0003_enrollments.sql ▼▼▼

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


-- ▼▼▼ 0004_rls.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────
-- 0004 — row level security
--
-- Two SECURITY DEFINER helpers do the heavy lifting. They are essential,
-- not stylistic: a policy on `profiles` that itself SELECTs `profiles`
-- recurses infinitely, and a policy on `lessons` that checks enrollment
-- would re-enter RLS on every referenced table. SECURITY DEFINER runs the
-- lookup as the function owner, bypassing RLS and breaking the cycle.
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$fn$;

-- True when the caller may read this lesson: it is a free preview, or they
-- hold a non-expired active enrollment on the course that owns it.
create or replace function public.can_read_lesson(p_lesson_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    left join public.enrollments e
           on e.course_id = m.course_id
          and e.user_id   = auth.uid()
          and e.status    = 'active'
          and (e.expires_at is null or e.expires_at > now())
    where l.id = p_lesson_id
      and (l.is_preview or e.id is not null)
  );
$fn$;

revoke all on function public.is_admin() from public;
revoke all on function public.can_read_lesson(uuid) from public;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.can_read_lesson(uuid) to authenticated, anon;

alter table public.profiles            enable row level security;
alter table public.courses             enable row level security;
alter table public.modules             enable row level security;
alter table public.lessons             enable row level security;
alter table public.enrollments         enable row level security;
alter table public.lesson_progress     enable row level security;
alter table public.enrollment_requests enable row level security;
alter table public.contact_messages    enable row level security;

-- ── profiles ──
create policy "own profile readable" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- A customer may edit their own name/phone but must never be able to
-- promote themselves, so the WITH CHECK pins role back to 'customer'.
create policy "own profile updatable" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'customer');

create policy "admin manages profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ── catalogue: published rows are public, writes are admin-only ──
create policy "published courses public" on public.courses
  for select using (is_published or public.is_admin());
create policy "admin writes courses" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

create policy "modules of published courses public" on public.modules
  for select using (
    exists (
      select 1 from public.courses c
      where c.id = modules.course_id and (c.is_published or public.is_admin())
    )
  );
create policy "admin writes modules" on public.modules
  for all using (public.is_admin()) with check (public.is_admin());

-- The policy that actually protects paid content.
create policy "lessons need preview or enrollment" on public.lessons
  for select using (public.can_read_lesson(id) or public.is_admin());
create policy "admin writes lessons" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- ── enrollments and progress: own rows, plus admin ──
create policy "own enrollments readable" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admin writes enrollments" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "own progress readable" on public.lesson_progress
  for select using (user_id = auth.uid() or public.is_admin());
create policy "own progress writable" on public.lesson_progress
  for insert with check (user_id = auth.uid());
create policy "own progress updatable" on public.lesson_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admin manages progress" on public.lesson_progress
  for all using (public.is_admin()) with check (public.is_admin());

-- ── inbound forms: admin-only reads. There is deliberately NO public
--    INSERT policy; submissions arrive through server endpoints using the
--    service-role key, so forged or spam rows cannot be written straight
--    from the browser with the anon key. ──
create policy "admin manages requests" on public.enrollment_requests
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin manages messages" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());


-- ▼▼▼ 0005_seed.sql ▼▼▼

-- ─────────────────────────────────────────────────────────────
-- 0005 — seed the real courses
--
-- The two paid courses from designs/ are left UNPUBLISHED with price 0: the
-- client has not given prices yet, and publishing a course at 0 EGP would be
-- worse than not showing it. Set price and flip is_published in /admin/courses.
--
-- بودكاست الواحة is different: it is free and public, so it ships published.
--
-- Lesson bodies and video ids are intentionally empty — they are the
-- client's content to enter, not ours to invent. Titles are derived from
-- the promises the posters actually make.
-- ─────────────────────────────────────────────────────────────

-- ── Course 1 — breastfeeding prep (oasis theme, from course1.jpg) ──
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, instructor_slug, is_published, sort_order
) values (
  'breastfeeding-prep',
  'كورس الاستعداد للرضاعة قبل الولادة',
  'الرضاعة الناجحة تبدأ قبل الولادة… وليس بعدها.',
  'كورس عملي مسجّل يجهّزك للرضاعة قبل ما طفلك يوصل. بنمشي معاكِ خطوة بخطوة: إيه اللي بيحصل في جسمك، إزاي تبدأي الرضعة الأولى صح، وإزاي تتجنبي المشاكل الشائعة قبل ما تحصل — كل ده بشرح هادي ومن غير أي لوم.',
  '/images/courses/breastfeeding-prep.jpg',
  '["استعدي بثقة","زيادة إدرار الحليب","وضعيات الرضاعة الصحيحة","تجنبي المشاكل الشائعة","رحلة رضاعة ناجحة بإذن الله"]'::jsonb,
  'أونلاين | مسجل',
  0,
  'oasis',
  'manar-mobarez',
  false,
  1
) on conflict (slug) do nothing;

-- ── Course 2 — beauty starts within (botanical theme) ──
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, instructor_slug, is_published, sort_order
) values (
  'beauty-starts-within',
  'الجمال يبدأ من الداخل',
  'ابدئي رحلتك نحو جمالك من الداخل.',
  'كورس للسيدات عن العلاقة الحقيقية بين التغذية والبشرة والشعر. مش وصفات ولا منتجات — فهم عملي لإزاي جسمك بيبني بشرة صحية وشعر قوي، وإيه اللي بيأثر عليهم فعلاً من الداخل.',
  '/images/courses/beauty-starts-within.jpg',
  '["بشرة صحية من الداخل","شعر أقوى","تغذية متوازنة","عادات يومية واقعية"]'::jsonb,
  'أونلاين | مسجل',
  0,
  'botanical',
  'manar-mobarez',
  false,
  2
) on conflict (slug) do nothing;

-- ── Modules and lessons for course 1 ──
with c as (select id from public.courses where slug = 'breastfeeding-prep'),
m1 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'قبل الولادة: التجهيز', 'إيه اللي تعرفيه وتجهزيه قبل ما طفلك يوصل.', 1 from c
  returning id
),
m2 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الرضعة الأولى', 'أول ساعة وأول أيام — الأهم في الرحلة كلها.', 2 from c
  returning id
),
m3 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الوضعيات وإدرار اللبن', 'الوضعية الصح بتحل أغلب المشاكل قبل ما تبدأ.', 3 from c
  returning id
),
m4 as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'المشاكل الشائعة', 'نتعرف عليها بدري ونتعامل معاها بهدوء.', 4 from c
  returning id
)
insert into public.lessons (module_id, slug, title_ar, sort_order, is_preview)
select id, 'why-before-birth', 'ليه نبدأ قبل الولادة؟', 1, true  from m1
union all
select id, 'body-changes',     'التغيرات الطبيعية في الجسم',   2, false from m1
union all
select id, 'what-to-prepare',  'إيه اللي تجهزيه فعلاً',        3, false from m1
union all
select id, 'first-hour',       'الساعة الذهبية الأولى',        1, false from m2
union all
select id, 'first-days',       'أول أيام: اللبأ والرضعات',     2, false from m2
union all
select id, 'positions',        'وضعيات الرضاعة الصحيحة',       1, false from m3
union all
select id, 'latch',            'الالتصاق الصحيح',              2, false from m3
union all
select id, 'milk-supply',      'زيادة إدرار الحليب',           3, false from m3
union all
select id, 'pain-cracks',      'الألم والتشققات',              1, false from m4
union all
select id, 'is-it-enough',     'هل اللبن كافي؟',               2, false from m4
union all
select id, 'back-to-work',     'العودة للعمل والحفاظ على الرضاعة', 3, false from m4;

-- ── Module scaffold for course 2. The client has not supplied a
--    curriculum for this one yet, so it stays a single placeholder
--    module rather than invented lesson titles. ──
with c as (select id from public.courses where slug = 'beauty-starts-within')
insert into public.modules (course_id, title_ar, summary_ar, sort_order)
select c.id, 'مقدمة الكورس', 'المحتوى قيد الإعداد.', 1 from c;

-- ── Podcast — بودكاست الواحة ────────────────────────────────
-- A FREE, public course: published, price 0, access 'free', and every
-- lesson flagged is_preview so the RLS policy on `lessons` lets anonymous
-- visitors read them. No account and no enrollment required.
insert into public.courses (
  slug, title_ar, hook_ar, description_ar, cover_image, highlights,
  delivery_label, price_egp, theme, access, instructor_slug, is_published, sort_order
) values (
  'podcast',
  'بودكاست الواحة',
  'حلقات مفتوحة للجميع، من غير حساب ومن غير اشتراك.',
  'حلقات بودكاست الواحة مع د. منار مبارز وضيوفها، عن صحة المرأة والطفل: الحمل والرضاعة والتغذية والهرمونات والصحة النفسية. اتفرجي على أي حلقة مباشرة من غير تسجيل.',
  '/images/courses/podcast.jpg',
  '["مجاني بالكامل","من غير تسجيل","حلقات مع ضيوف متخصصين","صحة المرأة والطفل"]'::jsonb,
  'أونلاين | مجاني',
  0,
  'oasis',
  'free',
  'manar-mobarez',
  true,
  0
) on conflict (slug) do nothing;

with c as (select id from public.courses where slug = 'podcast'),
m as (
  insert into public.modules (course_id, title_ar, summary_ar, sort_order)
  select c.id, 'الحلقات', 'كل حلقات بودكاست الواحة.', 1 from c
  returning id
)
insert into public.lessons (module_id, slug, title_ar, content_ar, video_provider, video_id, is_preview, sort_order)
select id, v.slug, v.title, v.note, 'youtube', v.vid, true, v.ord
from m, (values
  ('ep-1', 'الصيام مع الحمل والرضاعة', 'مع د. محمد ثابت', 'tFrM6EIG_Vs', 1),
  ('ep-2', 'العلاج الطبيعي لصحة المرأة', 'مع د. إيمان إبراهيم', 'ZZ4mvJXb4cc', 2),
  ('ep-3', 'هل ينهي العلاج الطبيعي آلام النساء؟', null, '2RBDGep7a7Q', 3),
  ('ep-4', 'تغذية الأم أثناء الحمل', null, 'DPr-K7PyBlE', 4),
  ('ep-5', 'تغذية الأم أثناء الرضاعة', null, 'Vpiuc5aBenI', 5),
  ('ep-6', 'سرطان الثدي', null, '7t70r3H49Rs', 6),
  ('ep-7', 'هرمونات النساء وعلاجها بالتغذية', null, 'D8jFphE8PhM', 7),
  ('ep-8', 'الصحة النفسية للمرأة بين الحمل والرضاعة', null, 'GvqKNh5wk6w', 8)
) as v(slug, title, note, vid, ord);

