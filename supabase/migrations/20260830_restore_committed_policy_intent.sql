-- Round 361, second half: the live database had drifted looser than the
-- committed migrations, always in the same direction, and nothing said so.
-- APPLIED 2026-08-30.
--
-- Found by diffing pg_policies against supabase/migrations. This is the
-- systemic finding of the round: an individual missing bound is a bug, four of
-- them all in the permissive direction is a process with no feedback. The
-- harness added in this round probes behaviour and cannot see this class,
-- because the anonymous key cannot read the catalogs, so the comparison is
-- written down in docs/security/WRITE-SURFACE-EVIDENCE.md as a manual step.

-- 1. question_reports. The committed policy in
-- 20260308235523_64a19fab-1b89-483d-9b8a-b0e51322e1a4.sql lines 50 to 54 bounds
-- the free text; live carried WITH CHECK (true), so the bug report form was an
-- unbounded anonymous write. Restored exactly as committed. Safe by a wide
-- margin: both report forms cap the box at 500 characters in the browser
-- (ReportQuestion.tsx:125, ReportSiteIssue.tsx:135), the longest row in the
-- table is 505, and the bound is 2000. Pre flight: 0 existing rows violate it.
-- Verified after applying: a normal length report is still accepted (201) and
-- an empty one is refused, so bug reporting still works. That check mattered
-- because the report forms swallow their errors, so a policy that rejected a
-- real report would look to the reporter exactly like a successful send.
drop policy if exists "Anyone can insert reports" on public.question_reports;
create policy "Anyone can insert reports"
  on public.question_reports for insert
  to anon, authenticated
  with check (
    length(description) > 0 and length(description) <= 2000 and
    length(game_type) > 0 and length(game_type) <= 50
  );

-- 2. Admin only reads on the three write only score tables. cbb_scores and
-- medal_games_scores are committed as admin read
-- (20260309020228_*.sql line 59 and 20260308235506_*.sql), and live had public
-- read on both. Restored. nascar_scores gets the same treatment BY ANALOGY AND
-- NOT by committed intent, because it has no committed migration at all, which
-- is itself recorded as drift.
--
-- Verified safe before changing: nothing in src, scripts or supabase/functions
-- reads any of the three. They are pure write only telemetry, which is also
-- why this round does not bound their inserts.
drop policy if exists "cbb_scores_read" on public.cbb_scores;
create policy "Admins can read cbb scores"
  on public.cbb_scores for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));

drop policy if exists "medal_games_scores_read" on public.medal_games_scores;
create policy "Admins can read medal game scores"
  on public.medal_games_scores for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));

drop policy if exists "nascar_scores_read" on public.nascar_scores;
create policy "Admins can read nascar scores"
  on public.nascar_scores for select
  to authenticated
  using (has_role(auth.uid(), 'admin'));

-- DELIBERATELY NOT DONE, and the reasons belong on the record.
--
-- The INSERT policies on cbb_scores, nascar_scores and medal_games_scores stay
-- open. Nothing reads those tables, so a forged row reaches no screen, and the
-- only harm left is storage growth, which is the rate limiting item already
-- filed and which neither RLS nor a CHECK can express. Keeping one genuinely
-- unbounded anon writable table is also what lets simPublicWrites have an
-- honest negative control: PUBWRITES_CONTROL=unbounded points at cbb_scores and
-- must go red there. If that insert is ever bounded, the control needs a new
-- target and the harness will say so by failing.
