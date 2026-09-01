-- Round 378: a way for the fence to see that the site still has an admin.
--
-- user_roles is deliberately unreadable to anon (its only SELECT policy is
-- has_role(auth.uid(),'admin')), and that is correct, but it means "the admin
-- table is empty" is invisible from outside until somebody tries to open the
-- report queue and gets thrown out. That is exactly how this round's bug
-- survived, and there is no self repair: the only policy that could let anyone
-- read the table is the one the empty table makes false. simAdminAccess needs
-- one observable fact to watch, and this is it.
--
-- DELIBERATELY AGGREGATE ONLY. It returns a COUNT of the holders of a role and
-- can never name one or confirm a specific account. That is the distinction
-- that made the has_role exposure worth closing in the same round: has_role
-- takes a user_id and answers a question about that person, which combined with
-- a publicly readable profiles table lets an attacker enumerate the site and
-- pick the admin out. This takes no user_id at all, and what anon learns from
-- it is "this site has an admin", which is true of every site with an admin
-- screen.
--
-- STABLE and SECURITY DEFINER so it can read past the RLS policy, with an empty
-- search_path so the body cannot be captured by a shadowing schema.
create or replace function public.admin_exists(p_role text default 'admin')
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.user_roles r
  where r.role::text = p_role;
$$;

revoke execute on function public.admin_exists(text) from public;
grant execute on function public.admin_exists(text) to anon, authenticated;
