-- ─────────────────────────────────────────────────────────────
-- Admin bootstrap — run ONCE, by hand, after Dr. Manar has registered
-- through /auth/register with the address below.
--
-- There is deliberately no way to become an admin from inside the app:
-- the "own profile updatable" RLS policy pins role back to 'customer' on
-- every self-update, so elevation only ever happens here.
-- ─────────────────────────────────────────────────────────────

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('Dr.manar.mobarez.clinic@gmail.com')
);

-- Verify — should return one row with role = 'admin'.
select p.id, u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';
