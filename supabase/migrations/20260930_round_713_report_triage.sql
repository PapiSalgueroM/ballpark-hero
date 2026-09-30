-- Round 713: a real workflow for the bug report queue. UNAPPLIED.
--
-- WHAT IT CHANGES. Four new columns on public.question_reports, nothing else:
--   status      text, not null, default 'new', one of the seven statuses the
--               master spec lists in section 123 (New, Investigating,
--               Confirmed, Fixed, Not a bug, Duplicate, Won't fix).
--   priority    text, null until somebody ranks it, one of the four the spec
--               lists (Critical, High, Medium, Low).
--   admin_note  text, null or up to 2000 characters, the owner's own note.
--   fix_ref     text, null or up to 200 characters, what fixed it (a round
--               number, a commit, a PR).
-- The keys are the exact strings src/lib/reportTriage.ts uses, and
-- simReportRelay section 5 fails if the two lists ever disagree.
--
-- THE ONE POLICY IT REWRITES. Read live on 2026-09-30 before writing this,
-- with SELECTs only:
--   "Anyone can insert reports"   INSERT to anon, authenticated, with the
--                                 description and game_type length checks
--   "Admins can read reports"     SELECT to authenticated, has_role admin
--   "Admins can update reports"   UPDATE to authenticated, has_role admin
-- anon and authenticated hold the stock table level grants, so the new columns
-- are covered by the same grants and the same policies as the old ones. Only
-- an admin can read or change them, through the existing admin policies, which
-- this file does not touch. No grant, no trigger, no function.
--
-- The insert policy is the exception, and the Round 713 fix is why. As
-- committed in 20260830_restore_committed_policy_intent.sql it checks only the
-- two lengths, so once the triage columns exist an anonymous insert could file
-- a report already marked Fixed, ranked Critical, carrying a made up admin
-- note and fix reference, and it could always set resolved = true. The policy
-- is replaced by name below, keeping both length checks word for word and
-- adding: status must be 'new' (the default, so an insert that never mentions
-- it still passes), priority, admin_note and fix_ref must be null, resolved
-- must be false and resolved_at null. The admin's columns can then only be
-- written through the admin update policy.
--
-- Safe for every public insert path, checked in the repo before writing this:
-- the report-relay edge function and the scores-poll watchdog write through
-- the service role (no policy applies), and the direct insert fallbacks in
-- ReportQuestion and ReportSiteIssue send exactly game_type, game_context and
-- description, so all of them take the defaults and pass. simReportRelay
-- section 6 reads this policy out of the file and fails if any clause is
-- missing, if it is not the only policy statement here, or if it targets
-- anything but this table for insert.
--
-- BACKFILL. The old screen had one switch. Every row it closed becomes Fixed,
-- which is the closest of the seven, and carries a note saying so, because the
-- switch never recorded why a report was closed. Every open row stays New.
-- Measured before writing: 65 rows, 55 resolved, 10 open.
--
-- resolved and resolved_at stay. The admin screen keeps resolved in step with
-- the status (a closed status writes true), so anything still reading the old
-- column reads the truth.

alter table public.question_reports
  add column if not exists status text not null default 'new',
  add column if not exists priority text,
  add column if not exists admin_note text,
  add column if not exists fix_ref text;

alter table public.question_reports
  add constraint question_reports_status_check
    check (status in ('new', 'investigating', 'confirmed', 'fixed', 'not_a_bug', 'duplicate', 'wont_fix')),
  add constraint question_reports_priority_check
    check (priority is null or priority in ('critical', 'high', 'medium', 'low')),
  add constraint question_reports_admin_note_length
    check (admin_note is null or char_length(admin_note) <= 2000),
  add constraint question_reports_fix_ref_length
    check (fix_ref is null or char_length(fix_ref) <= 200);

-- The insert policy, replaced by name. Both length checks are the ones
-- 20260830_restore_committed_policy_intent.sql committed, unchanged; the rest
-- pins every column the admin owns to its default on the way in.
drop policy if exists "Anyone can insert reports" on public.question_reports;
create policy "Anyone can insert reports"
  on public.question_reports for insert
  to anon, authenticated
  with check (
    length(description) > 0 and length(description) <= 2000 and
    length(game_type) > 0 and length(game_type) <= 50 and
    status = 'new' and
    priority is null and
    admin_note is null and
    fix_ref is null and
    resolved = false and
    resolved_at is null
  );

update public.question_reports
   set status = 'fixed',
       admin_note = coalesce(admin_note, 'Closed as resolved before statuses existed, so Fixed is a best guess.')
 where resolved = true
   and status = 'new';

comment on column public.question_reports.status is
  'Round 713 triage status: new, investigating, confirmed, fixed, not_a_bug, duplicate or wont_fix. The last four are closed and write resolved = true.';
comment on column public.question_reports.priority is
  'Round 713 priority: critical, high, medium or low. NULL means nobody has ranked it yet.';
comment on column public.question_reports.admin_note is
  'Round 713: the admin''s own note on this report. Admin only, through the existing read policy.';
comment on column public.question_reports.fix_ref is
  'Round 713: what fixed it, such as a round number, a commit or a PR.';
