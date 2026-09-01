-- Round 378: public.user_roles was EMPTY, so nobody was an admin.
--
-- AdminReports.checkAuth queries this table for role='admin', finds nothing and
-- calls signOut(), so the owner signed in and was immediately signed back out.
-- He could not open the bug report queue at all, and from the outside it looked
-- like a failed login rather than a missing row. 29 reports had accumulated
-- behind it, 15 unresolved, the newest the same day this was found.
--
-- Every has_role() based RLS policy was dead for the same reason: the admin
-- read policies on cbb_scores, nascar_scores, guess_nation_scores,
-- tennis_scores and medal_games_scores denied everybody, because has_role
-- returned false for every user alive.
--
-- There is a chicken and egg in the grant, which is why it had to be done
-- server side: the only SELECT policy on user_roles is itself
-- has_role(auth.uid(), 'admin'), so with the table empty nobody could read it
-- and nobody could ever become the first admin through the app.
--
-- The account is the owner's site account named in CLAUDE.md,
-- amsalguero10@icloud.com. It is resolved to its auth.users id here rather than
-- typed, so this cannot silently target the wrong row.
--
-- Verified after applying, through RLS as that user's own role: 1 admin row
-- visible (so checkAuth passes) and all 29 question_reports readable.
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where u.email = 'amsalguero10@icloud.com'
  and not exists (
    select 1 from public.user_roles r
    where r.user_id = u.id and r.role = 'admin'::public.app_role
  );
