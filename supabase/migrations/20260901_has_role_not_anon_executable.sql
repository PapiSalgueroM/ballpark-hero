-- Round 378: has_role was callable by anon over the REST API.
--
-- get_advisors flagged public.has_role(uuid, app_role) as a SECURITY DEFINER
-- function executable by the anon role via /rest/v1/rpc/has_role. It grants
-- nothing and it only answers a yes/no, but the question is "is this account an
-- admin", and public.profiles is publicly readable and carries user_id. So
-- every account on the site could be enumerated and the admin picked out of
-- them, which is a targeting aid. CLAUDE.md's standing instruction after the
-- July exec_sql incident is to read the advisor's FUNCTION warnings and not
-- only its table ones, and this is that warning.
--
-- THE NAIVE REVOKE IS WRONG, AND BOTH WRONG VERSIONS WERE TESTED INSIDE A
-- ROLLED BACK TRANSACTION RATHER THAN REASONED ABOUT:
--   * Revoking from `anon` alone does nothing at all. The grant is to PUBLIC,
--     so anon still inherits it and the function stays callable.
--   * Revoking from PUBLIC alone breaks the site. RLS policies that call
--     has_role are evaluated as the CALLING role, so anonymous reads on
--     tennis_scores began failing with "permission denied for function
--     has_role", and the owner lost his access to user_roles and
--     question_reports, which is the exact access the other half of this round
--     had just restored.
--
-- The working shape, verified the same way before being applied and again on
-- the live database afterwards: take the grant off PUBLIC, hand it back to
-- `authenticated` (every admin is signed in, so the policies still evaluate),
-- and scope down the one policy that was written TO public. A query over
-- pg_policies confirmed tennis_scores held the only such policy on the whole
-- database, so nothing else could be caught by this.
--
-- Live state after applying: anon reads still work (tennis_scores,
-- daily_completions 2,259 rows, player_market_values), anon calling has_role is
-- blocked, and the owner still sees his admin row and all 29 reports.
revoke execute on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "Admins can read tennis scores" on public.tennis_scores;
create policy "Admins can read tennis scores" on public.tennis_scores
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
