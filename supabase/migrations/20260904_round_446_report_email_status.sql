-- Round 446: record whether a report actually reached the owner's inbox.
--
-- His words, 2026-08-28: "i feel tronly there should be way more to the report
-- an issue button. Cause where do those issues go and how can i read them ...
-- all this goes to my douknowbaII email and i can actually read there problems
-- and improve upon it. Not simply tehre for just being there. This button
-- could help me a fuck ton."
--
-- The relay already does two things with a report: it writes a durable row
-- here, and it best-effort emails douknowball1@gmail.com. The email leg is the
-- half he is asking about, and until now NOTHING RECORDED WHETHER IT WORKED.
-- The relay computed `emailed` and returned it to the browser, where it was
-- thrown away, so "have any of my reports ever reached me" was an unanswerable
-- question about every one of the 32 rows already in this table.
--
-- Round 316 already learned that the delivery answer is not obvious: the mail
-- provider answers HTTP 200 even when the destination inbox has never clicked
-- its one time activation, so resp.ok alone claimed a delivery that never
-- happened, and only the body's success flag tells the truth. That flag is
-- what gets stored here.
--
-- emailed is NULL for every row written before this column existed, which is
-- honest: we do not know, rather than claiming false. From here on it is true
-- or false per report, and the admin screen shows it.

alter table public.question_reports
  add column if not exists emailed boolean;

comment on column public.question_reports.emailed is
  'Did the report-relay edge function get a confirmed email delivery for this report? NULL means the row predates Round 446 and the answer is genuinely unknown.';
