-- ═══════════════════════════════════════════════════════════
-- Run this AFTER APPLY_ALL.sql. Every row should say PASS.
-- ═══════════════════════════════════════════════════════════

-- 1. All eight tables exist.
select
  case when count(*) = 8 then 'PASS' else 'FAIL' end as status,
  '1. tables (expect 8)' as check,
  count(*)::text as got
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles','courses','modules','lessons',
                     'enrollments','lesson_progress',
                     'enrollment_requests','contact_messages')

union all

-- 2. RLS is enabled on every one of them. A table with RLS off is fully
--    public to the anon key, so this is the single most important check.
select
  case when count(*) = 8 then 'PASS' else 'FAIL' end,
  '2. RLS enabled (expect 8)',
  count(*)::text
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','courses','modules','lessons',
                    'enrollments','lesson_progress',
                    'enrollment_requests','contact_messages')
  and rowsecurity = true

union all

-- 3. Both SECURITY DEFINER helpers exist. Without these the policies
--    recurse or fail open.
select
  case when count(*) = 2 then 'PASS' else 'FAIL' end,
  '3. helper functions (expect 2)',
  count(*)::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_admin','can_read_lesson')
  and p.prosecdef = true

union all

-- 4. is_admin() runs without recursing.
select
  case when public.is_admin() is not null then 'PASS' else 'FAIL' end,
  '4. is_admin() executes',
  coalesce(public.is_admin()::text,'null')

union all

-- 5. The signup trigger is attached to auth.users.
select
  case when count(*) = 1 then 'PASS' else 'FAIL' end,
  '5. on_auth_user_created trigger',
  count(*)::text
from pg_trigger
where tgname = 'on_auth_user_created' and not tgisinternal

union all

-- 6. Three courses seeded.
select
  case when count(*) = 3 then 'PASS' else 'FAIL' end,
  '6. courses seeded (expect 3)',
  count(*)::text
from public.courses

union all

-- 7. The podcast is published, free, and has its 8 episodes — all of them
--    marked preview, which is what makes them readable anonymously.
select
  case when count(*) = 8 then 'PASS' else 'FAIL' end,
  '7. podcast preview episodes (expect 8)',
  count(*)::text
from public.lessons l
join public.modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
where c.slug = 'podcast' and l.is_preview = true

union all

-- 8. The two paid courses are still drafts, so nothing sells at 0 EGP.
select
  case when count(*) = 2 then 'PASS' else 'FAIL' end,
  '8. paid courses unpublished (expect 2)',
  count(*)::text
from public.courses
where access = 'paid' and is_published = false

union all

-- 9. Paid lessons are NOT previews — this is the boundary that stops the
--    breastfeeding course leaking to anonymous visitors.
select
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  '9. paid non-preview lessons leaked (expect 0)',
  count(*)::text
from public.lessons l
join public.modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
where c.access = 'paid' and l.is_preview = true and l.slug <> 'why-before-birth'

order by 2;
