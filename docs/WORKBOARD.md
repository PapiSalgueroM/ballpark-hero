# Work board

One page, two lanes. Read this before picking work, write here before building. This file
holds who is doing what right now; `docs/PROJECT-STATE.md` holds what happened. The split
protocol itself lives near the top of that file ("Two subscriptions, one repo").

How it works:

- Anthony drops feedback in either chat, tablet or desktop. Whichever Claude receives it
  writes each item into the Inbox below, splits anything big into workable pieces, and
  pushes this file immediately so the other lane sees it.
- A lane claims an item by moving it under its own heading with the date. Claim and push
  BEFORE building, so the other lane sees the claim before any code exists.
- Finished items move to Done with the round number, and the round writes its change log
  entry in `docs/PROJECT-STATE.md` as always.
- The 3 hourly scheduled cloud sessions count as the cloud lane and respect claims here
  exactly like a live session.
- An item claimed more than 4 days ago with no round landed goes back to the Inbox, so a
  dead session cannot squat on work.

## PUBLISH HANDOFF for the desktop lane (cloud lane, 2026-08-28)

Anthony asked for the live site to be brought fully current RIGHT NOW. The cloud lane's
direct publish paths are approval gated in its live session and its scheduled publisher
fires only every 3 hours, so this is the desktop's to run today. Everything below is
already ON MAIN and pushed; nothing needs building, only deploying.

What main carries that the cloud lane cannot verify is live yet (its last verified
publish was the Round 300 era; the scheduled publisher has likely deployed some of these
since, deploy_project publishes latest main so the list is informational, run it once
and everything lands):

- Round 301, the profile truth pass (tablet)
- Round 302, Soccer Career eras and leagues (tablet)
- Round 303, the created manager (tablet)
- Round 304, the compliance pass: NON PERSONALIZED ADS wiring, new privacy and terms
  text, the age checkbox at signup (tablet)
- Round 305, /jeopardy renamed to /quiz-board with a redirect (tablet)
- Round 306, the accessibility pass plus the new /accessibility page (tablet)
- Round 307, the dialog slice (tablet)
- Round 308, AI managers in every dugout (tablet)
- Round 309, vacancy driven job offers (tablet)
- The protocol and board docs (desktop and tablet)

Publish steps, per the runbook: pull main, spot verify Lovable synced a recent file
(read_file of docs/WORKBOARD.md or src/pages/Accessibility.tsx; latest_commit_sha lags,
trust file content), deploy_project, then indexnowSubmit. Post publish notes: the
sitemap now carries 130 URLs, /accessibility and /quiz-board are new, /jeopardy is a
retired redirect stub, ads are explicitly non personalized. When done, move this whole
section into Done below with the date so the cloud lane knows the site is current.

## Inbox (unclaimed)

- Encyclopedia mining (tweaks item 12, the permanent backlog, pages 4 to 51 of his
  document): either lane pulls a system from it when its own list runs dry. Mine it for
  mechanics, never its vocabulary (simNoRivalNames enforces this).

## Desktop lane (Claude Code on Anthony's PC)

Claimed 2026-08-28. This lane takes the work that needs what only this machine has: the
Supabase MCP, the Lovable MCP, and cheap long local browser runs.

- FIRST: the publish handoff section above, Anthony is waiting on it.
- The Round 304 Supabase tap that was recorded as owner side and does not need to be:
  backend audit, the report-relay redeploy, the RLS advisor run, and the
  game_completions SELECT policy question.
- The Club Manager half of tweaks item 10 (more leagues, more eras), which Round 302
  queued behind Supabase access: the data pulls happen from this lane.
- Tweaks item 9: the full playGames browser run over every game, every feature, then fix
  every finding.
- Publishing duty: after a burst lands on main, verify Lovable synced, call
  deploy_project, run indexnowSubmit.
  NOTE FROM THE CLOUD LANE, 2026-08-28: a scheduled publisher already runs on the cloud
  side every 3 hours (it deploys whenever main has moved and stays silent when it has
  not), so nothing waits on a manual publish; the desktop publishing after its own
  bursts is still welcome for immediacy, a double publish is harmless.

## Cloud lane (tablet sessions and the 3 hourly scheduled sessions)

Claimed 2026-08-28:

- Manager arc four: promotion style world editing, the last piece of tweaks item 11.
  IN PROGRESS 2026-08-28, the live tablet session is building it now.
- The react-router v7 breaking major that Round 304 queued as its own round.
- New game rounds and record shelf tables, the self contained work.

## Done

(move items here with the round number that shipped them)
