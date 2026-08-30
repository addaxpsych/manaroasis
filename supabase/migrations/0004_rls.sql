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
