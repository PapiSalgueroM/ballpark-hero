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
-- WHAT IT DOES NOT CHANGE. No policy, no grant, no trigger, no function. Read
-- live on 2026-09-30 before writing this, with SELECTs only:
--   "Anyone can insert reports"   INSERT to anon, authenticated, with the
--                                 description and game_type length checks
--   "Admins can read reports"     SELECT to authenticated, has_role admin
--   "Admins can update reports"   UPDATE to authenticated, has_role admin
-- anon and authenticated hold the stock table level grants, so the new columns
-- are covered by the same grants and the same policies as the old ones. The
-- public insert path (the report-relay edge function, the direct insert
-- fallback in ReportQuestion and ReportSiteIssue, the scores-poll watchdog)
-- sends none of these columns and gets the defaults. Only an admin can read or
-- change them, through the existing admin policies.
--
-- KNOWN AND LEFT ALONE: the insert policy checks only the two lengths, so an
-- anonymous insert could set its own status or priority, exactly as it can set
-- resolved = true today. Closing that means changing the insert policy, which
-- this round was told to leave as it is. It is recorded for a follow up.
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
