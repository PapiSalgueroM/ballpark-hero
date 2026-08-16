# Project state

**As of 2026-08-16.** This is the volatile file. Update it in the same round as any change, so
the next session (or the next account) picks up cleanly.

**Precedence.** On any question of *current state* (the head, round numbers, what is pending,
what is broken, what is next) **this file wins over every other document in the repo, including
`CLAUDE.md` and `docs/SHIP-PIPELINE.md`.** Those two describe stable procedure; this one
describes a moving target, and procedure written last month cannot know today's round number.
The reverse is also true: on *procedure* (how to package, how to verify, what is forbidden),
those two win and this file should not contradict them.

**Staleness.** Check the date above. Anything here older than about two weeks should be verified
against `git log --oneline` and a listing of `C:\Users\antho\ballpark-hero` before you act on
it, then corrected. The counts marked "about" or "roughly" below are approximations that were
true on the date above; re-measure rather than quoting them.

---

## Where the build stands

| | |
|---|---|
| `origin/main` head | `e7fe005` = **Round 130** |
| Packaged and delivered but **not pushed** | Rounds **131 through 136** |
| One-click to ship all of them | **`SHIP6.bat`** (logs to `ship_log6.txt`). Supersedes `SHIP4.bat` and `SHIP5.bat`. Safe to re-run; every `RUNnn.bat` self-skips. |
| Live site is serving | **Round 128.** As of this file's date Lovable was still stuck at `9494d8e`; assume it still is until you verify otherwise. |
| Next free round number | **137** |
| Round missing from history | 115. Never existed, do not go looking for it. |

### What each pending round is

| Round | Contents |
|---|---|
| 131 | Player creation: look options, height and weight with real attributes, no build cap below 99, rerolls against the potential cap. |
| 132 | Club Manager eras: era selector, club detail and squad and transfer screens. |
| 133 | Rival-name purge, 284 findings to zero across 843 files, plus the permanent guard `scripts/simNoRivalNames.mjs`. Renames Jeopardy to QuizBoard, which is why `RUN133.bat` deletes four old paths before committing. |
| 134 | Money becomes a real system: five assets that move between seasons, a savings vault, fees each way so churning costs you. Calibrated so the best money player finishes about 1.6x richer than one who ignores it, with a guard that fails above 3.2 so money can never become the whole game. My Life moved onto the phone. DoUKnowBall inside DoUKnowBall, generated from your own save. Gambling is deliberately small and unfun to grind: once a season, capped at the lower of 50k or 4 percent of net worth, blocked under 250k, 42 percent win rate and 1.15x payout both printed on screen, closes permanently at 500k down. Career average is minus 92k. The upside is dressing room morale, not money. |
| 135 | Press conferences and team talks. Morale was worth nearly 18 league points floor to ceiling but nothing reached the whole squad. Four tones, before the match and at half time, press questions built from your save. Reading the room is worth about 3 points a season, misreading costs 3.8, and spamming one tone is worth 1.6 against 4.3 for reading the situation. Skipping a presser costs exactly zero versus never opening it, which is what makes the skip button honest. |
| 136 | **This documentation round.** `CLAUDE.md`, `docs/SHIP-PIPELINE.md`, `docs/PROJECT-STATE.md`. |

The three documentation files were also written directly onto Anthony's disk when they were
packaged, so they are readable from the local folder whether or not Round 136 has been
committed. Check `git log` to see whether it has landed.

### ⚠ Two sessions can collide on round numbers

Rounds 134 and 135 were packaged by the **scheduled build task** while an interactive session
was separately packaging documentation as 134. The scheduled task won the filename race and the
documentation round had to be renumbered to 136. Nothing was lost, but an hour of work nearly
was, and a `SHIP` wrapper got silently replaced with one that did not include the other
session's round.

**Before you package anything, check the folder for a `ROUNDnn_FILES.zip` newer than your own
session start.** If one is there, another session is live. Take a number above it, and do not
overwrite a `SHIP` wrapper without reading what it currently ships. The scheduled build task
fires on cron `57 */3 * * *`, so it is running more often than you would guess.

**Two things need doing the moment someone picks this up:**

1. Anthony runs **`SHIP6.bat`**, which lands 131 through 136 in order.
2. Then `deploy_project` and verify live properly per `docs/SHIP-PIPELINE.md`, because the live
   site is several rounds behind the repo. The next push doubles as the nudge that unsticks
   Lovable.

Tell him once that the bats are waiting, then **get on with building the next round without
waiting for him.** He works shifts and may not get to it for a day. Do not block, and do not nag
more than once.

### What the pending rounds contain

- **131** player creation: look options, height and weight with real attributes, no build cap
  below 99, jump-by-5 or type the overall directly, rerolls against the potential cap.
- **132** money and life: bank depth, timed investing (crypto, index, APY), a transaction limit,
  My Life moved onto the phone, DoUKnowBall inside DoUKnowBall, gambling.
- **133** rival-name purge. 284 findings across 843 files taken to zero, plus the permanent
  guard `scripts/simNoRivalNames.mjs`. Also renames the Jeopardy files to QuizBoard, which is
  why `RUN133.bat` explicitly deletes four old paths before committing.

**Note:** the awards round was originally planned as 133, but the 133 slot got spent on the name
purge. Awards is still unbuilt. See the roadmap below.

---

## Recently shipped

| Round | What |
|---|---|
| 130 | Phone stops being a one-shot novelty. Threads, 17 contacts, contacts/continuation/neglect/apology, world-only sports feed. |
| 129 | Mobile chrome: navbar overlap, the invisible-streak `xs` breakpoint bug, action-bar footer lift, product-name strip. All measured in a real browser. |
| 128 | The no-scroll rule was itself jumping the page. |
| 127 | Every player is told what he is at this club, and the dressing room remembers whether you kept your word. |
| 126 | The Round 113 coaching career was never plugged in, so all four American games still dead-ended at retirement. Fixed. |
| 125 | Seven permanent guards had been failing since Round 119 with nothing checking the checkers. |
| 124 | International football became a real competition that crowns a winner every four years. |
| 123 | You have to beat somebody to win an award, across all four American career modes. |

Also already done, do not rebuild: recently-played and leaderboard rank (55), NFL/NBA/MLB/NHL
career rebuilds (56 to 59), appearance creator (54), Club Manager picker leagues and flag (106),
Club Manager tile-dashboard reformat (74), halftime management (119), a harness that actually
reaches a match in Club Manager (120).

---

## Open bugs

| Bug | Notes |
|---|---|
| **Edge function `football-connect4-validate` needs redeploy at publish time** | A key was renamed from "FIFA Ratings & Stats" to "Player Ratings & Stats". Needs a **second** redeploy: v7 still names the game in the glossary definition. The key `Has/Had a 90+ Rated Player Card` must stay verbatim. |
| 📱 button covers the AGE tile at 390px | AGE is invisible on phones. Introduced by Round 129. |
| Award flicker | Anthony: "says I didn't win an award, next sec it shows I did". |
| `scripts/testBallonDorFairness.mjs` dies on import | No localStorage stub. Also named `test*` so `runAllSims` silently skips it. Rename to `sim*` when fixing. |
| `playGames` stalls on `/nfl-my-career` and `/nba-my-career` | Pre-existing, not a regression. |
| `RebuildBoard.tsx:41` unattached `revealRef` | Small, but it means the no-scroll rule is not actually applied there. |

### Decisions owed by Anthony

This is the registry `CLAUDE.md` points at. **These are the only things you may ask him about
besides money. Everything else, decide yourself.** When one is resolved, delete it from here.

1. **Invented quotes attributed to real players.** Inbox and narrative copy from earlier rounds
   puts words in real footballers' mouths, lines like *"You told me I was a star here"*. Names
   plus factual stats are defensible; invented quotes attributed to real people are not, and the
   site and repo are both public. Found during Round 135, not fixed. **This is the highest
   priority open item and deserves its own round**: sweep every generated narrative surface,
   rewrite to role attribution or narration, and add a harness that fails on a quoted string
   next to a real player name. The Round 135 press copy already avoids it, so it is the model
   to follow.
2. **Competitor names in the public repo.** `docs/research/R1_soccer_sites.md` and
   `docs/research/R3_creator_formats.md` name competitors by name in a public repo. Delete or
   gitignore. Do not silently delete his research, ask him.
3. **ESPN-style score ticker data source.** Needs a paid feed decision. Money.
4. **Apple sign-in.** Parked on the $99/yr Apple developer account. Money.

---

## Roadmap

Not numbered by round on purpose. Take the next free round number from the top of this file and
work down this list in order.

**Next up, in order:**

1. **Awards** (was planned as 133, still unbuilt). Puskas and FIFA Best, candidate goals and
   assists, a trophy cabinet, animated and personalised trophies, Champions League and World Cup
   tables plus brackets plus per-competition stats, no-spoiler gating, more international
   trophies.
2. **Realism.** Players must age out. Salah should not still be playing in the 2030s. Generated
   young players need to work far into the future.
3. **Manager side.** Full manager tools after retirement, with era rosters. An era selector for
   Club Manager.
4. **Mini games.** More of them, harder criteria.

**Standing large items, still open:**

- **The Club Manager epic.** Transfers, negotiations, loans, release clauses, calendar, player
  stats, youth academy, scouts, facilities, spies, sponsors, tactics drag plus match animation,
  cup naming, garbled opponent names, roster freshness. Tactics drag has been asked for twice
  and is still not done.
- **More leagues.** Explicitly not done. Currently 10 leagues and 186 clubs. He wants "all the
  leagues FIFA has". Also more flags throughout the site.
- **International competitions inside Club Manager.**
- **ESPN-style score ticker.** Blocked on a data-source decision, which is a money question, so
  ask him.
- **CFB Dynasty still uses fake names.** `ROUND87_FILES.zip` contained real 2026 rosters, 528
  players. See the never-run zips warning below.
- **Profile page.** The favourite-game list does not include every game, "fav sport general"
  makes no sense, and he wants every stat verified end to end.
- **Cross-device and browser QA matrix.** Harnesses are Chromium-only at 430x900. WebKit is
  untested.
- **Google indexing and discovery.** Search Console, sitemap, noindex and canonical, Bing
  Webmaster Tools, IndexNow.
- **Trade finders and cap systems.**
- **Sacked-manager unemployed state** with an earned offer feed.
- **Sitewide FIFA-style tile-dashboard reformat.** Only Club Manager is done.
- **Per-game competitor depth audit.**
- Copy nit: kill the "🛝 7 times this season..." line.

### ⚠ Two zips that were built and never run

`ROUND77_FILES.zip` (Club Manager youth academy, scouts, upgradeable facilities, sponsors, spy
system) and `ROUND87_FILES.zip` (real 2026 CFB Dynasty rosters, 528 players) were packaged weeks
ago and Anthony has **never run them**. Between them they clear a large chunk of the outstanding
list.

**Check for them every session.** If they are missing from his folder, rebuild that
functionality as a fresh round rather than waiting. Do not assume something shipped just because
it was once packaged.

**Do NOT extract them.** They are far below the current head. Unpacking a Round 77 tree over a
Round 130-plus tree would silently revert dozens of rounds in every file they touch, and it
would look exactly like the clone-revert bug. Rebuild the *functionality* as a new round;
never re-run the old zip. The same rule holds for any zip whose number is at or below the head.

**They are also the reason the roadmap below still lists youth academy, scouts, facilities,
sponsors, spies and real CFB rosters as open.** That work exists, it just never reached the
repo.

---

## Analytics truth

`/soccer-career` is about **1 in 5 of all pageviews across the site** and **11x the next most
played game**. This is the single most important fact for prioritising work. When in doubt,
build for Soccer Career.

Source and caveat: this came from Lovable's project analytics
(`mcp__Lovable__get_project_analytics` on `c29d224f-a662-4a15-b809-d86fa3b3f0ad`), read in
August 2026. GA4 is **not** wired up yet, so Lovable is currently the only analytics source.
Re-pull it before making a big prioritisation call on it, and update this line.

Approximate at the date above, re-measure rather than quoting: roughly 118 to 122 games, entry
bundle about 663KB with route-level code splitting, `src/data/gameContent/` about 47k words of
per-game SEO copy, about 52 harnesses in `scripts/`, 53 files in `docs/`.

---

## Services and accounts

| Service | Detail |
|---|---|
| GitHub | `PapiSalgueroM/ballpark-hero`, public, branch `main` |
| Supabase | `flawuiqbvjobmkfkauhw`, **Pro $25/mo**, spend cap ON |
| Lovable | `c29d224f-a662-4a15-b809-d86fa3b3f0ad`, **free plan, 0 credits**, never use its AI agent |
| AdSense | `pub-2929318086316376`. Rejected once for "Low value content". Fix went live 2026-08-12. Review reminder set for 2026-08-20. |
| ads.txt line | `google.com, pub-2929318086316376, DIRECT, f08c47fec0942fa0` |
| Google sign-in | live |
| Apple sign-in | parked, needs the $99/yr developer account, this is a money question |
| GA4 | measurement ID still outstanding |

---

## Scheduled tasks

These live in the assistant account, **not in this repo**, and they do not survive an account
change. If they are not running, they need recreating. Full prompts are in
`_claude-migration/SCHEDULED-TASKS-TO-RECREATE.md` in Anthony's local folder (gitignored,
because it contains account emails).

| Task | Schedule |
|---|---|
| DoUKnowBall: continue the career epic (the main build loop) | cron `57 */3 * * *` |
| DoUKnowBall daily polls | cron `0 11 * * *`, needs the Supabase connector |
| AdSense review day | one-shot 2026-08-20 14:00 UTC |

The daily polls task writes to `public.daily_polls`. Columns: `poll_key` (unique, format
`dp-YYYY-MM-DD-N`), `poll_date`, `sort_order`, `question`, `option_a` through `option_d`, the
matching `option_*_emoji` fields, and `option_*_flag` (a country name only when the option **is**
a country, otherwise empty string). Three rows per day. Replace any pre-stocked generic rows for
today rather than adding alongside them.

---

## Change log for this file

- **2026-08-16** created, as part of Round 134. Pulled the live project state out of assistant
  memory and into the repo so any session or account can pick the project up cold.
