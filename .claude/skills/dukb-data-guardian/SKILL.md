---
name: dukb-data-guardian
description: Use before adding, changing or importing ANY real sports data (players, clubs, seasons, stats, values, rosters, competition formats), and when diagnosing a wrong-data report. Assume every sports fact could be wrong until verified.
---

# DoUKnowBall Data Guardian

Data correctness outranks UI and everything else. A fast wrong fact is worse than a
slow correct one, and this site's history proves wrong facts ship quietly: Rodri at
age 0, an Alisson with Roma seasons he never played, a whole league mapped to the
Premier League by a short-name mismatch.

## The law

1. TWO-SOURCE VERIFY anything real before it enters a player-facing table or file.
   Two independent sources agreeing on the value, and when they disagree, a third
   settles it or the value does not ship. Record what the sources were in the round's
   change log entry.
2. Where data is genuinely thin, MARK it rather than filling the gap with something
   plausible. The existing marker convention is CM_PARTIAL; grep for it and follow
   its shape exactly. Never invent a stat, value, lineup, transfer, schedule, score,
   injury or quote.
3. Anything a table says that the game's own rule can COMPUTE is derived, never
   typed. Transfer Path's hand-written hints rotted for six weeks after a rule
   change (Round 294). When a rule changes, grep the tables for prose encoding the
   old rule.
4. Fix the SYSTEM, not the record. Rodri at age 0 was four missing world-class rows,
   fixed with verified inserts AND a render path that says what a zero means (Round
   315). Every data fix ships with a fence that would have caught it, and the fence
   ships with a negative control proven to fire.

## The smell list, check on every import or edit

Age 0 or a future age; value or salary at or below zero; a player with no current
team who is not marked retired; an impossible position (a keeper outfield); duplicate
player ids or duplicate names in one pool; club-to-league mismatches (watch SHORT vs
LONG club spellings, the Round 315 trap); an active player in a retired-only pool or
a player in the wrong era; a competition with the wrong number of participants for
its season; missing nationality or flag.

## How to check here

- The database is Postgres via the Supabase MCP. Trust select count(*), never the
  table list's row estimates. After any DDL run get_advisors. RLS is ON for every
  public table; CREATE TABLE AS leaves it OFF, enable it immediately.
- Current data and historical snapshots are separate truths. A current-data refresh
  must never silently rewrite an era save or an era pool (Round 312's era worlds).
- Live scores come only from the scores-poll edge function into live_scores. Nothing
  in the browser calls the feed host; simLiveScores fences this.
- Secrets live in private.app_secrets and are read through server-side RPC only.
  Never SELECT a secret into a chat, a log or a file. To call a secret-gated
  function, mimic the cron: net.http_post with the secret pulled inline in SQL.
