export const meta = {
  name: 'owner-list-475-479',
  description: 'Five measured defects: Transfer Path refusing real teammates, the Conquest daily replayable with the answers known, Rebuild losing a table on a refresh, the era group tables seeding the round of 16 wrong, and the snapshots still losing blocks to a discarded render',
  phases: [
    { title: 'Build', detail: 'five builders in parallel worktrees, harness first, additive modules' },
    { title: 'Merge and gates', detail: 'merge in round order, every gate, browser plays' },
  ],
}

const REPO = 'C:\\Users\\antho\\ballpark-hero'
const SCRATCH = 'C:\\Users\\antho\\AppData\\Local\\Temp\\claude\\C--Users-antho-ballpark-hero\\c40d957d-ec33-451a-9633-e3e8f2c32f17\\scratchpad'

const RULES = `HOUSE RULES, all enforced by harnesses or by the owner, none optional. Read CLAUDE.md in full first.
- Never write an em dash or an en dash anywhere: not in copy, comments, commit messages, test names or docs. Use commas, colons, periods or parentheses.
- Never name a rival product in any file under src, scripts, supabase or public (scripts/simNoRivalNames.mjs fails on it). FIFA the governing body is allowed under an allowlist; FIFA the video game is not; never write "FIFA-style" or "FotMob" or "2K" in src, scripts or comments even though the owner's notes use them as shorthand; describe the behaviour instead.
- Site copy sounds casual and human, never AI flavoured.
- NEVER INVENT A PLAYER, A STAT, A TRANSFER, A LINEUP OR A RESULT. Two source verify anything real. Where data is thin, mark it (grep CM_PARTIAL) rather than fill it.
- NEVER PUT INVENTED WORDS OR CONDUCT ON A REAL PERSON. Generated people (staff, rivals, journalists) may have generated names, faces drawn as simple shapes, and generated lines. Real players get factual stats and simulated results only. No real person's likeness anywhere.
- ANY BRAND OR COMPANY NAME YOU INVENT MUST BE SEARCHED ON THE WEB BEFORE IT SHIPS. The review of Round 467 found six real companies in one bank of eight invented sponsor names (Goldrush, FastCash, Quickfire, NightOwl, RedLine Coin, Skyhigh): they collided because they were written the way a real firm names itself, two everyday selling words pushed together. Coin a word instead, the way src/lib/clubManager.ts SPONSOR_BRANDS does (Northgate, Verdanta, Halcyon), and search it.
- No league or club logos, crests, kits or player photos, ever. The only permitted external image host is flagcdn.com.
- Never draw from Math.random inside a useState initializer (use src/lib/firstDraw.ts). The day is pinned at mount for any daily writing file. Every storage loader fails closed on shape, and a save whose shape changes gets a versioned migration (find the convention in the engine you touch).
- A DAILY IS RECORDED AS IT GOES, NOT ONLY WHEN IT ENDS. Round 468's drills wrote the record only on the last round, so pressing back part way and starting again re-dealt the same seeded run with the answers known. If your round has a daily, write after every settled step and restore where the player left off.
- Supabase access imports SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from '@/integrations/supabase/client'; never read VITE_SUPABASE_* env vars. Never touch a validator or its catch path.
- Every game shows instructions before play, reopenable from the floating question mark; guide copy lives in src/data/gameContent/ and is routed in its loader.
- WORDS MATCH CODE. Every number and claim in a guide, a commit message, a harness header, a code comment or a FAQ must be what the code does. Two reviews running found a guide promising a top 300 pool over code drawing 400, a comment claiming a script derived a block a hand wrote, a header carrying a club count that had drifted, and a rules module claiming five men where the code knows none. If you cannot check a number, do not write it; cite the harness that prints it instead.
- ONE NUMBER PER FEELING. Round 467 shipped a second stored fan mood beside Round 465's meter with its own five words, and the hub said "Turning" an inch above "Onside". If the thing you need already exists, read it; do not store a second.
- Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md (the lead owns those). Do not edit RAW_RANDOM_BASELINE in scripts/simPrerender.mjs.
- ONE ENGINE, MANY SPORTS (CLAUDE.md): share engines, never copy them. Lift the shared thing into a module and inject the sport.
- ADDITIVE, because two builders touch Club Manager at once: put your rules in a NEW module (src/lib/clubManager<Feature>.ts) and touch src/lib/clubManager.ts and the page only at the integration points, in as few hunks as you can.
- Every new screen or step in a flow gets the reveal ref from src/hooks/useRevealScroll.ts so a 390 wide phone sees it without scrolling.
- A new game or recorder needs its entry in COMPLETION_SLUG_TO_PATH (src/data/completionSlugs.ts) or its daily chip never ticks; scripts/simDailyLegend.mjs is the fence.
- Every first name and surname bank you add must be registered in scripts/simInventedNames.mjs GENERATORS, and no pairing may name a real player.
- Match each file's style. Touch only what the round needs.

HARNESS RULES:
- Measure OUTCOMES against a baseline; set every margin from measured headroom; never assert non significance; never assert on a max.
- Negative control that reproduces the real defect or the shipped shape, refusing to run if its rewrite changed nothing. Normalise CRLF before matching. A control is judged by its output saying the planted defect fired, never by its exit code.
- Ask the question of every path, not the paths your round happened to touch. The check that missed the Round 467 board bug probed the two functions Round 465 changed and nothing else, so the next round's new function walked straight through it. Where you can, count the paths in the source and fail when the count moves.
- Name it scripts/sim*.mjs and print at least four lines when green. Bundle the REAL module with node_modules/.bin/esbuild (--alias:@=<root>/src) the way scripts/simClubManagerMeters.mjs and scripts/simCareerParity.mjs do; stub localStorage with a Map before importing a bundle that pulls in the Supabase client.

COMMANDS. Type gate is exactly node_modules/.bin/tsc --noEmit -p tsconfig.app.json from the worktree root; READ ITS EXIT CODE. Zero errors before any commit. Do NOT run scripts/runAllSims.mjs. Build only where the brief says.
GIT. Never run git checkout, reset, stash or clean anywhere. Work only in your worktree with git -C. Commit with explicit paths, never git add -A. COMMIT EARLY AND IN PARTS, each part gated by tsc, so an interruption cannot cost the work. Messages begin "Round NNN, ..." as one long plain sentence saying what was wrong FOR THE PLAYER and what changed, then a blank line and the measured before and after. No attribution trailers.
WINDOWS. The Bash tool is Git Bash. Write files with the Write or Edit tool, never a bash heredoc (it strips backslashes). Never hand node a /tmp path: put scratch files under ${SCRATCH} by absolute path. Run playGames from PowerShell with $env:ENGINES='chromium', $env:ONLY='/route' and $env:SWEEP_BASE pointing at a node scripts/lib/hostLikeServer.mjs dist <port> you started on your own port after npm run build in your worktree; stop it after.
Your final output is data for a script: commit hashes, verbatim gate lines, and anything you could not do.`

const worktree = name => `YOUR WORKTREE: ${REPO}\\.worktrees\\${name} on branch ${name}. If it does not exist, create it: git -C "${REPO}" worktree add -b ${name} ".worktrees/${name}" main, then powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${REPO}\\.worktrees\\${name}\\node_modules' -Target '${REPO}\\node_modules' | Out-Null". If it exists (a previous attempt ran out of budget), run git status and git diff --stat there first, keep what is good, and continue. Work only there with git -C. DO NOT delete your worktree and never run a recursive delete inside it: node_modules is a junction to the real one.`

const BUILD = {
  type: 'object',
  properties: {
    branch: { type: 'string' }, commits: { type: 'array', items: { type: 'string' } }, what_shipped: { type: 'string' }, red_before: { type: 'string' }, green_after: { type: 'string' }, harnesses_run: { type: 'string' }, tsc: { type: 'string' }, data_sources: { type: 'string' }, siblings: { type: 'string' }, owner_decision: { type: 'string' }, not_done: { type: 'string' },
  },
  required: ['branch', 'commits', 'what_shipped', 'red_before', 'green_after', 'harnesses_run', 'tsc', 'data_sources', 'siblings', 'owner_decision', 'not_done'],
}
const GATES = {
  type: 'object',
  properties: {
    merged_head: { type: 'string' }, merge_notes: { type: 'string' },
    gates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, result: { type: 'string', enum: ['green', 'red', 'skipped'] }, output: { type: 'string' } }, required: ['name', 'result', 'output'] } },
    browser_plays: { type: 'array', items: { type: 'object', properties: { route: { type: 'string' }, result: { type: 'string' }, output: { type: 'string' } }, required: ['route', 'result', 'output'] } },
    fixes_made_during_gates: { type: 'array', items: { type: 'string' } }, remaining_red: { type: 'string' },
  },
  required: ['merged_head', 'merge_notes', 'gates', 'browser_plays', 'fixes_made_during_gates', 'remaining_red'],
}

const CM_READ = `READ FIRST, in targeted slices (src/lib/clubManager.ts is enormous, grep before you read): the save shape and its version and migration convention, the season state, the week loop (playNextEntry) and how the calendar advances, the board and fan state (boardConfidence is the sack race itself and src/lib/clubManagerMeters.ts reads it; books and the gate number live in src/lib/clubManagerFinances.ts; the facilities in src/lib/clubManagerFacilities.ts; the calendar in src/lib/clubManagerCalendar.ts, all four new in Rounds 465 to 467), the page src/pages/ClubManager.tsx and the tab components under src/components/club-manager, and every scripts/simClubManager*.mjs and simCm*.mjs. All of them must stay green and you run them all before each commit.`

const BUILDERS = [
  {
    key: 'round-475-transfer-path-seasons',
    prompt: `ROUND 475, TRANSFER PATH REFUSES REAL TEAMMATES, AND A PLAYER REPORTED IT. TAKE THIS FIRST AND DO NOT WIDEN IT.

THE DEFECT, already measured for you on 2026-09-06 so you do not have to rediscover it. The graph links two players only on an identical \`club::season\` string. The career table writes the same club in two styles: seventeen clubs carry both calendar year rows ("2020") and split season rows ("2020-2021"), sometimes for one player (Julián Álvarez's River Plate spell is 2018-2019, 2019-2020, 2020, 2021, 2022). Where the styles meet, real teammates never link and the board says they were never at the same club in the same season.

THE EIGHT PAIRS IT REFUSES TODAY, measured by SQL over the live table, all real: Enzo Fernández and Julián Álvarez (River Plate 2020 to 2022), Neymar and Robinho (Santos 2010), Andrea Pirlo and David Villa (New York City FC 2015-16), Hugo Lloris and Olivier Giroud (LAFC 2024), Cafu with Roberto Carlos and with Rivaldo (Palmeiras 1995-96), Adriano with Roberto Carlos and with Ronaldo (Corinthians 2011). A report on /transfer-path at 15:18 UTC on 2026-09-06 said only "Bug" and its chain ends on Julián Álvarez with the target Moisés Caicedo; Álvarez to Enzo to Caicedo finishes that puzzle and the first link is this defect.

THE RULE, AND THE TRAP THAT MAKES THIS HARDER THAN IT LOOKS. Do NOT expand every spell into one key per calendar year. At a European club that links a man who left in the summer of 2020 to one who arrived in it, which INVENTS teammates and is worse than the bug you are fixing. The rule is asymmetric and fires only where the styles differ: two spells at the same club link when their season strings are EQUAL (today's rule, untouched), OR when one is a calendar year Y and the other is a split season whose range contains Y. Measured against the live table that adds exactly the eight pairs above and nothing else, and your harness must prove that number rather than trust it.
A PLAIN SET OF STRINGS CANNOT EXPRESS THIS and an afternoon was already lost proving it: whatever keys you emit, two split rows that share a year end up matching each other. Both graph builders need a shape that keeps the calendar years and the split ranges apart.

THE TWO PLACES, and they are deliberately identical today, so they must stay identical: \`buildGraph\` in scripts/lib/transferPathHints.mjs (used by the generator AND the fence) and \`clubSeasonsOf\`, \`shareClub\` and \`seasonIndex\` in src/hooks/useTransferPath.ts (used by the page, including the give up path search). Read both in full before you change either. The hint text names a club and a season, so decide what a crossed pair's hint says and make it true for both men (the calendar year is true for both, which is the obvious answer).

THEN RE-DERIVE. Minimums and hints are DERIVED, never typed (CLAUDE.md): run scripts/genTransferPathHints.mjs to rewrite every hint under every rule, save the migration under supabase/migrations/ beside the round, and apply it through the Supabase MCP. scripts/simTransferPathHints.mjs and scripts/simTransferPathModes.mjs exist to catch a stored minimum that disagrees with the search, so they WILL go red between your rule change and your regeneration; that is correct, and both must be green with every control firing before you commit the last part.
Your harness (extend simTransferPathHints or add one) must hold: the eight pairs link and are reachable in a chain, no pair that did not link before links now except those eight, two split spells at a European club that do not share a season string still do NOT link (the trap, as an explicit check), and the page's graph and the generator's graph agree player for player over the whole pool.
Report how many puzzles' min_steps moved and by how much. Build, serve dist on port 4223, playGames from PowerShell with ONLY=/transfer-path, and drive one of the eight links in a browser to see the board accept it.`,
  },
  {
    key: 'round-476-conquest-daily-lock',
    prompt: `ROUND 476, THE CONQUEST DAILY CAN BE REPLAYED WITH THE ANSWERS KNOWN, ON ALL FIVE MAPS.

THE DEFECT. The daily is written only when the run reaches the final screen (the effect at phase 'done' in src/components/conquest/ImperialismBoardShared.tsx and the same effect in the four private boards ImperialismBoard.tsx, ImperialismBoardMlb.tsx, ImperialismBoardNba.tsx, ImperialismBoardNhl.tsx). Nothing is persisted between the first pick and that screen, and start() re-seeds the run from the date, so a player who reloads on the last matchday is dealt the identical season back with every result already known and can call all thirteen games right, for about ninety percent of the cap. /soccer-conquest, /conquest, /conquest-mlb, /conquest-nba and /conquest-nhl all share it. It is a points exploit, not a polish item.

THE SHAPE OF THE FIX, which Round 428 wrote down and Round 468's drills needed too: record the daily AS IT GOES, not when it ends. The cheap and correct version is an ACTION LOG rather than a state dump, because the season is seeded from the date: the club the player rode plus each matchday's call replays the run exactly. On mount, replay the log and drop the player back where they left off. src/lib/conquestDaily.ts is the one place the record shape lives, so the log goes there.
ONE ENGINE, MANY SPORTS. Four of the five boards are private copies of one idea and Round 459 already proved ImperialismBoardShared carries a sport (the soccer map runs on it). MOVE THE FOUR ONTO THE SHARED BOARD FIRST, then the fix lands once instead of five times. If you find a real reason one of them cannot move, say which and why in your report rather than copying the fix into it quietly.

WHILE YOU ARE IN THERE, two more from the same review, both measured: the first move can sit below the fold on a phone once a club is picked (the call card renders after the map, the legend and the standings toggle, with no reveal ref on any of the five boards; use src/hooks/useRevealScroll.ts), and conquestDaily.ts keeps its own pre Round 428 key and payload while the Round 459 commit claims it uses "the Round 428 record shape", so either move it onto the shared shape or correct the words.

HARNESS: play a daily to matchday N through the real engine, reload, and hold that the restored run is the same run, that no sequence of reloads records a second completion or a score above the honest run's, and that all five sports behave identically. A control that removes the log must go red. Keep simConquest, simSoccerConquest, simConquestMap, simCompletionOnce, simLeaderboardCaps and simDailyReload green.
Build, serve dist on port 4225, playGames from PowerShell for /conquest and /soccer-conquest, and screenshot a phone at 390 by 844 showing the call card in view without scrolling.`,
  },
  {
    key: 'round-477-rebuild-save',
    prompt: `ROUND 477, REBUILD LOSES EVERYTHING ON A REFRESH, AND A TABLE OF FOUR LOSES IT FOR EVERYONE.

THE DEFECT, from the review of Round 461: nothing about a Rebuild run is ever saved. src/hooks/useRebuild.ts holds the whole run in React state and no Rebuild file reads or writes storage, so a refresh, a back swipe or a discarded phone tab throws away a solo window and, worse, a four seat pass and play session that three other people are sitting around. Round 461 shipped the table; this makes it survive.

YOUR JOB: the first save shape Rebuild has ever had, and it gets the full treatment from day one because the site's rules were written by saves that did not. A version constant, a loader that FAILS CLOSED on shape (anything unexpected opens a fresh run rather than a half restored one), a versioned migration path for the day the shape changes, and the run written as it goes rather than at the end so an interruption costs a spin and not a session. At a table, the seats, whose turn it is, and every finished seat's run all belong in it. Read the conventions before inventing one: src/lib/dailyRecord.ts for the daily shape, ensureFacilities and ensureBooks in src/lib/clubManagerFacilities.ts and clubManagerFinances.ts for lazy repair, and scripts/sweepSaves.mjs for what a save has to survive.
The daily, if Rebuild has one, must be recorded as it goes and must not be replayable with the answers known: that exact defect has now been found in the drills (Round 468) and the Conquest maps, so do not ship a third.

HARNESS: over many seeded runs and tables of two to four, hold that a save written at any point restores the same run, that a tampered or truncated save opens fresh rather than broken, that a pre round save (there is none, so: an absent save) opens fresh, that no restore hands a seat another seat's board, and that no reload records a second completion or pays points twice. Two controls minimum. Keep simRebuildLoop, simRebuildSeats, simRebuildEconomy, simCompletionOnce, simLeaderboardCaps and sweepSaves green.
Build, serve dist on port 4227, playGames ONLY=/rebuild, and in a browser start a two seat table, reload part way, and screenshot what comes back at 390 by 844.`,
  },
  {
    key: 'round-478-cm-ucl-groups',
    prompt: `ROUND 478, CLUB MANAGER: THE GROUP TABLES RANK LEVEL CLUBS THE WRONG WAY, SO THE ROUND OF 16 CAN BE SEEDED WRONG.

THE DEFECT, from the review of Round 462 and pre existing: the real Champions League group stage from 2003-04 to 2023-24 separated clubs level on points by head to head points, then head to head goal difference, then head to head goals, BEFORE overall goal difference. The engine orders every group by overall goal difference then goals scored (sortedTable with no context, src/lib/clubManager.ts around uclRoundOf16Field and src/components/club-manager/UclGroupsCard.tsx), and Round 462 seeds the round of 16 from that order, so a group can name the wrong winner and the whole knockout bracket hangs off it.

Round 462 already built the machinery you need: a per pair results ledger for the leagues whose documented order reads head to head (LEAGUE_TIEBREAKS in src/lib/clubManager.ts, the Spain and Italy rule), plus a save migration that opens a pre 462 save with an empty ledger. Read all of it, and simClubManagerEraUcl.mjs in full including its three controls, before touching anything.

YOUR JOB: the group tables sort by the competition's own rule, the ledger covers the group games, the bracket is seeded from the corrected order, and the table says which rule sorted it the way the league tables already do. VERIFY THE REAL RULE against two sources and cite them in the comment the way LEAGUE_TIEBREAKS does (UEFA's own regulations for the era; the order changed for the league phase from 2024-25, and this engine's historic eras are the group stage era, so be precise about which competition and which years you are encoding). A save from before this round must open and play out.
Measure the effect rather than asserting it: over many seeded era careers, how many groups have level pairs at all, how many of those the head to head rule reorders, and how often that changes who tops the group. That number is the round's headline and it goes in your commit message.

HARNESS: extend simClubManagerEraUcl with a section that drives era careers through the group stage and holds that every level pair is ordered by the documented rule, that the round of 16 field matches the corrected order, and that a pre round save loads and plays. A control that restores the goal difference only sort must go red. Keep every simClubManager* and simCm* harness green.
Build, serve dist on port 4229, playGames ONLY=/club-manager, and screenshot a group table with a level pair and its footnote at 390 by 844.`,
  },
  {
    key: 'round-479-raw-random-sweep',
    prompt: `ROUND 479, THE TWENTY THREE FILES STILL DRAWING RANDOMLY INTO REACT STATE, MEASURED FIRST AND FIXED WHERE IT MATTERS.

THE BACKGROUND, and read scripts/simPrerender.mjs section 16 and its RAW_RANDOM_BASELINE comment in full before anything else. React does not promise a useState initialiser runs once: it may begin a render, throw the work away and start again, and the retry draws again, which moves every draw after it. src/lib/firstDraw.ts (Round 421) exists for exactly this. Twenty three files are frozen on a baseline that is a RATCHET, not an amnesty: anything new fails, and a file that gets fixed must leave the list.

WHAT IS ALREADY KNOWN, so you do not repeat it. On 2026-09-06 /higher-lower was fixed and left the baseline, and the measurement that found it is the one to use: read the last dozen or so builds of a route's snapshot in git and count its readable blocks (h2, h3, p, li). A page whose counts SWING is losing real content to this race, because the prerenderer's three clock samples disagree and it drops the block and re-dates the page for a change nobody made. /higher-lower swung on exactly its two player headings in exactly one build. The four routes that fence's own comment suspected, /missing-eleven, /missing-five, /missing-nine and /rank-em, were measured the same way and are CLEAR, so do not spend the round on them.

YOUR JOB, in this order.
1. MEASURE ALL of them. For every file on RAW_RANDOM_BASELINE, work out which route or routes render it, and read the last dozen builds of each of those snapshots the same way. Produce a table: file, route, whether its blocks swing, and the evidence. That table IS the round's first deliverable and it goes in your report whatever else you ship.
2. FIX the ones that swing, through src/lib/firstDraw.ts, and take each fixed file off the baseline. Where a hook seeds one state from another (the shape /higher-lower had), the dependent picks are drawn together in one memo and held together, because two independent memos can hold two picks that were never chosen for each other.
3. LEAVE the ones that do not swing on the baseline and say so with the evidence, because a change with no measured effect is a change that can only introduce risk.
Do not edit the baseline list for any file you have not measured, and do not weaken section 16.

HARNESS: simPrerender must be green with the baseline shrunk and its rawrandom control still firing on a planted draw; scripts/playRenderStability.mjs must be green on every route you touched (run it from PowerShell with $env:ONLY, because Git Bash rewrites a leading slash into a Windows path). For each fixed route also prerender it twice with PRERENDER_ONLY and show the two files are byte identical.
Do NOT run build:seo; the lead runs it. Report which snapshots your fixes will move on the next one and why.`,
  },
]

phase('Build')
const builds = await parallel(BUILDERS.map(b => () => agent(`${RULES}\n\n${worktree(b.key)}\n\n${b.prompt}`, { label: `build:${b.key}`, phase: 'Build', schema: BUILD })))
const done = builds.filter(Boolean)
log(`Build: ${done.length}/${BUILDERS.length} reported`)

phase('Merge and gates')
const gates = await agent(`${RULES}

THE BRANCHES. Five builders worked on branches created from main: ${BUILDERS.map(b => b.key).join(', ')}. Their reports (JSON): ${JSON.stringify(done, null, 2)}
A builder that reported nothing may still have committed; check every branch with git -C "${REPO}" log --oneline main..<branch>, and check its worktree for uncommitted work with git -C "${REPO}\\.worktrees\\<branch>" status --short; if a builder left good uncommitted work, commit it on its branch with a "Round NNN, part N: ..." message before merging.

YOUR TASK.
1. Create the integration worktree from main (git -C "${REPO}" worktree add -b owner-list-475-479 ".worktrees/owner-list-475-479" main), add the node_modules junction, then merge every builder branch that has commits, one at a time, in round order. 478 is the only Club Manager round here, so conflicts should be light; 476 and 479 both touch snapshots and prerender behaviour, and 475 and 476 both change data a stored hint or record depends on, so merge in round order and re-run each round's own fence after the merge rather than trusting the builder's run. Report every merge and every conflict resolution.
2. Gates from the integration worktree, in this order: tsc (zero, READ THE EXIT CODE); every new or changed harness (git diff --name-only main..HEAD -- scripts), each with every negative control, and each control must actually fire (judged by its output, not its exit code); then every scripts/simClubManager*.mjs and simCm*.mjs, simManagers.mjs, simBoardObjectives.mjs, simFinance.mjs, simSponsors.mjs, simCalendar.mjs, simCareerParity.mjs, simCareerDrills.mjs, simCareerMoneyAfterRetirement.mjs, simCareerBanking.mjs, simNoInventedConduct.mjs, simNoInventedQuotes.mjs, simInventedNames.mjs, simDailyReload.mjs, simCompletionOnce.mjs, simDailyLegend.mjs, simCompletionSlugs.mjs, simLeaderboardCaps.mjs, simScoringCoverage.mjs, simNoRivalNames.mjs, sweepSaves.mjs if it runs headless, and node node_modules/vitest/vitest.mjs run.
3. No new route this batch unless a builder says otherwise, so build:seo is not required; run npm run build in the integration worktree and then simSnapshotAssets.mjs, simPrerender.mjs, simHomeCopy.mjs, simLoginReturn.mjs.
4. Then the whole suite once: node scripts/runAllSims.mjs, launched as a fully detached process writing to a log file (PowerShell Start-Process; the Bash tool's background mode has killed it before). It takes about 90 minutes with other work running, so poll its log every few minutes with a bounded loop and do the browser plays while it runs. Known flakes (a Supabase 500, a statement timeout on nflfastr_player_stats, player_market_values or mlb_grid_players, "SUPABASE UNREACHABLE", a "fetch failed" from simMlbGridPool): re-run that harness alone and report BOTH results.
5. Then playGames from PowerShell (ENGINES chromium, SWEEP_BASE on a hostLikeServer you start over the integration dist) for /transfer-path /conquest /soccer-conquest /rebuild /club-manager /higher-lower, one at a time.
6. Anything red that is not a known flake: fix it with the smallest change, commit as "Round 47N, gate fix: ...", re-run. Never weaken a harness to pass; if a harness is wrong say so with evidence and leave it red.
7. Do NOT delete any worktree. Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md.
Report every gate with its verbatim summary line, the merged head, and what remains red.`, { label: 'merge-and-gates', phase: 'Merge and gates', schema: GATES })

return { builds: done, gates }
