export const meta = {
  name: 'owner-list-465-469',
  description: 'Five rounds off the owner ledger: Club Manager meters and table, calendar, facilities and finances; Soccer Career training drills on the arcade engine; the NFL career brought up to the soccer career loop',
  phases: [
    { title: 'Build', detail: 'five builders in parallel worktrees, harness first, additive modules' },
    { title: 'Merge and gates', detail: 'merge in round order, every gate, browser plays' },
  ],
}

const REPO = 'C:\\Users\\antho\\ballpark-hero'
const SCRATCH = 'C:\\Users\\antho\\AppData\\Local\\Temp\\claude\\C--Users-antho-ballpark-hero\\051ba96f-ef0b-4330-8579-a72a4ebadc52\\scratchpad'

const RULES = `HOUSE RULES, all enforced by harnesses or by the owner, none optional. Read CLAUDE.md in full first.
- Never write an em dash or an en dash anywhere: not in copy, comments, commit messages, test names or docs. Use commas, colons, periods or parentheses.
- Never name a rival product in any file under src, scripts, supabase or public (scripts/simNoRivalNames.mjs fails on it). FIFA the governing body is allowed under an allowlist; FIFA the video game is not; never write "FIFA-style" or "FotMob" or "2K" in src, scripts or comments even though the owner's notes use them as shorthand; describe the behaviour instead.
- Site copy sounds casual and human, never AI flavoured.
- NEVER INVENT A PLAYER, A STAT, A TRANSFER, A LINEUP OR A RESULT. Two source verify anything real. Where data is thin, mark it (grep CM_PARTIAL) rather than fill it.
- NEVER PUT INVENTED WORDS OR CONDUCT ON A REAL PERSON. Generated people (staff, rivals, journalists) may have generated names, faces drawn as simple shapes, and generated lines. Real players get factual stats and simulated results only. No real person's likeness anywhere.
- No league or club logos, crests, kits or player photos, ever. The only permitted external image host is flagcdn.com.
- Never draw from Math.random inside a useState initializer (use src/lib/firstDraw.ts). The day is pinned at mount for any daily writing file. Every storage loader fails closed on shape, and a save whose shape changes gets a versioned migration (find the convention in the engine you touch).
- Supabase access imports SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from '@/integrations/supabase/client'; never read VITE_SUPABASE_* env vars. Never touch a validator or its catch path.
- Every game shows instructions before play, reopenable from the floating question mark; guide copy lives in src/data/gameContent/ and is routed in its loader.
- Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md (the lead owns those). Do not edit RAW_RANDOM_BASELINE in scripts/simPrerender.mjs.
- ONE ENGINE, MANY SPORTS (CLAUDE.md): share engines, never copy them. Lift the shared thing into a module and inject the sport.
- ADDITIVE, because three builders touch Club Manager at once: put your rules in a NEW module (src/lib/clubManager<Feature>.ts) and touch src/lib/clubManager.ts and the page only at the integration points, in as few hunks as you can. The merge agent reads conflicts, but fewer is better.
- Match each file's style. Touch only what the round needs.

HARNESS RULES:
- Measure OUTCOMES against a baseline; set every margin from measured headroom; never assert non significance; never assert on a max.
- Negative control that reproduces the real defect or the shipped shape, refusing to run if its rewrite changed nothing. Normalise CRLF before matching.
- Name it scripts/sim*.mjs and print at least four lines when green. Bundle the REAL module with node_modules/.bin/esbuild (--alias:@=<root>/src) the way scripts/simClubManagerBudget.mjs and scripts/simFreeKick.mjs do; stub localStorage with a Map before importing a bundle that pulls in the Supabase client.

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

const CM_READ = `READ FIRST, in targeted slices (src/lib/clubManager.ts is enormous, grep before you read): the save shape and its version and migration convention (grep for the save version constant and how Round 431 and Round 462 migrated saves), the season state, the week or day loop and how the calendar advances (grep advanceDay, simulateWeek, fastForward), the board and fan state that already exists (grep boardPatience, boardMood, fanMood, confidence), the finance state (grep budget, wages, revenue, ticket), the page src/pages/ClubManager.tsx and the tab components under src/components/club-manager, and the existing harnesses scripts/simClubManagerBudget.mjs, simManagers.mjs, simClubManagerEraMidSeason.mjs, simClubManagerEraUcl.mjs (Round 462) and every other scripts/simClubManager*.mjs and simCm*.mjs. Every one of them must stay green and you run them all before each commit.`

const BUILDERS = [
  {
    key: 'round-465-cm-meters-table',
    prompt: `ROUND 465, CLUB MANAGER: the two meters, always visible, and the table that shows goals for and against.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Club Manager arc): "Two meters, always visible: board patience (how close to fired) and fan mood." And: "Table: show goals for and against as 25-23 alongside GD."

${CM_READ}

YOUR JOB:
1. THE TWO METERS. Find what the engine already computes about the board (how close to being sacked; there is a sacking rule somewhere, grep fired, sacked, dismissal) and about the fans (mood, attendance, confidence). Derive two 0 to 100 meters from what the engine already knows in a NEW module src/lib/clubManagerMeters.ts (pure functions over the save state), never a new random draw. Show them in the game's persistent header on every tab (phone first, 390 wide, the no scroll rule), with the plain words for the bands ("Safe", "Under pressure", "One bad week from the sack"; "Singing", "Grumbling", "Turning") and with the number on tap. If the sacking rule is a threshold on something, the board meter must be that something, so the meter is the truth and never a decoration; scripts/simClubManagerMeters.mjs holds that a manager is sacked exactly when the board meter says so, over many seeded seasons, and that the fan meter moves with results in the direction a fan would expect (measure the correlation with points per game over many seasons and set the floor from it).
2. THE TABLE. Every league table the game renders shows goals for and against as "25-23" in the row beside GD. Find the shared table component (there should be one; if the era tables and the modern table render through different code, say so and fix the shared one). Harness section: render the table through react-dom/server for several seeded seasons and hold that every row carries the for and against pair and that the pair minus equals the GD shown.
3. No save shape change if the meters are derived; if you must store anything, version the save.
4. Guide and "?" copy for the meters. Build, serve dist on port 4203, playGames from PowerShell with ONLY=/club-manager, and a 390 by 844 screenshot showing both meters; say what you saw.`,
  },
  {
    key: 'round-466-cm-calendar',
    prompt: `ROUND 466, CLUB MANAGER: the calendar you can click.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Club Manager arc): "Calendar: click any day and sim to it (keep the four fast forwards), bigger emojis, match days name the opponent, transfer window open and close clearly marked."

${CM_READ}

YOUR JOB, in a NEW module src/lib/clubManagerCalendar.ts for the pure parts (what a day holds, the window dates per era, the sim to date rule) and the calendar component under src/components/club-manager:
1. CLICK ANY DAY AND SIM TO IT. Tapping a future day advances the save to that day through the engine's own day or week loop (never a second copy of it), stopping early on anything that needs the manager (a match to set up, a board decision, an offer), exactly as the four fast forwards do; keep those four. Harness: over many seeded saves, sim to a chosen day and hold that the save's date equals the target unless an interrupt fired, that every match between the start and the target was played (results exist), and that the fast forwards produce the same save as the equivalent click (byte compare the relevant state), so the two paths cannot drift.
2. MATCH DAYS NAME THE OPPONENT, home or away, with the competition; bigger emojis for the day kinds; the transfer windows (summer and winter, per era, from the engine's own window dates; verify the real window dates for the eras against two sources and cite them) marked open and closed clearly on the grid.
3. Phone first: the month grid must read at 390 wide with no horizontal scroll; measure it in a real browser.
4. No save shape change unless needed; if needed, version it. Guide and "?" updated. Build, serve dist on port 4205, playGames from PowerShell with ONLY=/club-manager, and a 390 by 844 screenshot of the calendar with a window boundary and a match day visible; say what you saw.`,
  },
  {
    key: 'round-467-cm-facilities-finances',
    prompt: `ROUND 467, CLUB MANAGER: facilities and the projected finances screen.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Club Manager arc): "Facilities: dressing room, stadium, training ground, medical, each level 1 to 10, big clubs start high, small clubs start near zero, upgrades cost real money and help the squad." And: "Finances: ticket and concession pricing with fan and board reactions, sponsor offers (good and bad brands, local or global, negotiable), a full projected finances screen: player wages, staff wages, travel, transfer income, everything a club spends and earns." Round 436 fixed the summer budget wipe and is the finance baseline (read scripts/simClubManagerBudget.mjs and its header first).

${CM_READ}

YOUR JOB, in NEW modules src/lib/clubManagerFacilities.ts and src/lib/clubManagerFinances.ts for the pure parts:
1. FACILITIES: four facilities, level 1 to 10, starting level derived from the club's tier and market value (big clubs high, small near zero, from data the engine already has, never typed per club), an upgrade cost per level that scales with the era's money, and an effect that is real and small: training ground helps growth (through the existing growth rule, respecting potential headroom, the Round 96 and 116 regression must not return), medical shortens injuries, dressing room lifts morale recovery, stadium lifts matchday income. Harness: over many seeded seasons hold that upgrades cost what the screen says, that the effect direction is right and bounded (measure growth and injury weeks with and without), that a small club cannot afford level 10 in a season, and that a strength multiplier never exceeds 1 (the Round 95 regression).
2. TICKET AND CONCESSION PRICING with fan and board reactions (through the fan mood and board state that exist; if Round 465 is building meters in parallel, do not build meters, read the underlying state), and SPONSOR OFFERS from generated brands (generated names only, never a real brand), local or global, negotiable within a band, good and bad (a bad one pays more and costs fan mood).
3. THE PROJECTED FINANCES SCREEN: player wages, staff wages, travel, matchday income, sponsorship, transfer income and spend, projected to season end from what the engine knows, on one phone first screen (no scroll rule, 390 wide). Harness: the projection's line items sum to the projection's total, and the projection made at week N is within a measured band of the actual at season end over many seeds (report the error distribution; set the band from it).
4. Save shape: these add state, so version the save with a migration and prove an old save loads (sweepSaves shape rule). simClubManagerBudget stays green. Guide and "?" updated. Build, serve dist on port 4207, playGames from PowerShell with ONLY=/club-manager, screenshots of the facilities and finances screens at 390 by 844; say what you saw.`,
  },
  {
    key: 'round-468-career-drills',
    prompt: `ROUND 468, SOCCER CAREER: the training drills you actually play, on the arcade engine.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Soccer Career): "More position specific training minigames, harder: two axis wall shot timing, defender tackle timing on a moving ball (click the ball not the feet), keeper hold-and-drag glove save dives. Every position gets its own drills." And his most repeated ask across every review: games where you actually move and time things, not read and type.

WHAT EXISTS: Round 433 built Free Kick and Round 445 lifted its physics into a shared arcade module and built Buzzer Beater on it (read src/lib/freeKick.ts, the shared arcade module it now imports from, src/components/free-kick/FreeKickBoard.tsx, src/lib/buzzerBeater.ts if that is its name, and scripts/simFreeKick.mjs and simBuzzerBeater.mjs, including their headers: the law is SKILL BEATS SPAM by a measured margin, no fixed input near optimal, a real difficulty curve, every round winnable and none free, the flight drawn by requestAnimationFrame and settled by a timer). Read how Soccer Career runs training today: grep src/pages/SoccerCareer.tsx and src/lib/soccerCareer*.ts for training, drill, minigame, and how a drill's result feeds the player's attributes (through the growth rule with potential headroom). SoccerCareer.tsx is the biggest file in the repo: read it in targeted slices and touch it only at the integration points.

YOUR JOB: three drills on the shared arcade engine, in src/lib/careerDrills.ts (pure, seeded, deterministic, exported so a harness can drive it) and src/components/soccer-career/DrillBoard.tsx (the page owns the frames and nothing else):
1. WALL SHOT (attackers, midfielders): a two axis aim (horizontal and height) and a timing press as a moving wall gap opens and closes; power costs accuracy the way Free Kick's does.
2. TACKLE (defenders): a ball moving across the screen with the attacker's feet; you click the ball, not the feet; timing and position both count; a mistimed press is a foul.
3. GLOVE SAVE (keepers): hold and drag to set the dive direction and reach, release to dive as the shot comes; reach costs reaction time.
Each drill: daily seed by position (the same drill for everyone at that position on the same day, the Round 428 daily record shape if you record it) plus unlimited practice; reduced motion respected; keyboard and touch; a result that feeds the existing growth rule (a drill can nudge one attribute by a bounded amount, never past potential); the player's position picks the drill. Harness: scripts/simCareerDrills.mjs holding the arcade law for each drill (skilled beats the best fixed input by a measured margin, every round winnable, none free, the curve real) and that the growth effect is bounded and respects headroom. Negative control reproducing the flaw your own measurement finds (as simFreeKick's nospray does). Keep simFreeKick and simBuzzerBeater green with their controls after every change to the shared engine, and say you did.
Guide and "?" updated. Build, serve dist on port 4209, playGames from PowerShell with ONLY=/soccer-career, and drive one drill of each kind in playwright at 390 by 844; say what you saw.`,
  },
  {
    key: 'round-469-nfl-career-depth',
    prompt: `ROUND 469, THE NFL CAREER BROUGHT UP TO THE SOCCER CAREER LOOP, through the shared engine.

HIS WORDS (docs/TWEAKS-2026-08-28.md): "Bring the whole Soccer Career and Club Manager depth to NFL, NBA, MLB, NHL and the GM games, each with its own sport's texture. The gap between the soccer career and the NFL career is visible to a casual eye; close it." And CLAUDE.md, his 2026-09-04 instruction: a new sport is DATA plus that sport's events, not a new engine; Soccer Career is the shape the others should reach.

READ FIRST: how Soccer Career's loop is built (src/pages/SoccerCareer.tsx in targeted slices, src/lib/soccerCareerEngine.ts, soccerCareerLife.ts, soccerMoney.ts, the inbox, the social feed in src/components/soccer-career/PhonePanel.tsx, the rival, the badges) and how /nfl-my-career is built (grep src/pages and src/lib and src/hooks for nflMyCareer, NflMyCareer). Then MEASURE the gap as a list: every loop element Soccer Career has (weekly loop, money app, social feed, rival, injuries with choices, contracts and wage cut or leave decisions, badges, headlines, retirement) against what the NFL career has, with file and line for each. That list is the round's plan, and it goes in your report.

YOUR JOB: close the biggest gaps THIS ROUND by lifting the shared piece out of Soccer Career into a sport neutral module and injecting NFL data and events, never by copying. Pick, in this order, as many as you can ship properly: (1) the money app (Round 438 fixed Soccer Career's; make it one module both careers use, NFL contracts in dollars with the real rookie scale shape and cap era, sourced), (2) the social feed and headlines with NFL texture (position aware, the Round 319 rule: never tell a lineman to score more touchdowns), (3) a named generated rival, (4) badges for career peaks with NFL names (MVP, Super Bowl, first 10,000 yards, from real record thresholds, sourced). Every real NFL player named stays factual; every rival, journalist or teammate line comes from a generated person or a role.
Harness: scripts/simCareerParity.mjs that drives both careers through the shared module over many seeded careers and holds that the money app balances in both, that no social line addresses a position with a wrong stat in either sport, that a rival exists and moves in both, and a source check that the shared module is imported by both careers and that no second copy of its rules exists (a control that restores a private copy must go red). Keep scripts/simCareerMoneyAfterRetirement.mjs, simCareerBanking.mjs, simNoInventedQuotes section 1 (runtime lines) and every existing career harness green. Build, serve dist on port 4211, playGames from PowerShell with ONLY=/nfl-my-career and ONLY=/soccer-career.
Say plainly in not_done which gaps remain and which sports (NBA, MLB, NHL) the shared module is ready for.`,
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
1. Create the integration worktree from main (git -C "${REPO}" worktree add -b owner-list-465-469 ".worktrees/owner-list-465-469" main), add the node_modules junction, then merge every builder branch that has commits, one at a time, in round order. THREE OF THEM TOUCH src/lib/clubManager.ts AND src/pages/ClubManager.tsx: expect conflicts there, read each hunk and keep both sides' integration points; if a save version constant was bumped by more than one round, reconcile it to one sequence of migrations that runs in order and prove an old save still loads. Report every merge and every conflict resolution.
2. Gates from the integration worktree, in this order: tsc (zero, READ THE EXIT CODE); every new or changed harness (git diff --name-only main..HEAD -- scripts), each with every negative control, and each control must actually fire; then every scripts/simClubManager*.mjs and simCm*.mjs, simManagers.mjs, simFreeKick.mjs and simBuzzerBeater.mjs with their controls, simCareerMoneyAfterRetirement.mjs, simCareerBanking.mjs, simNoInventedConduct.mjs, simDailyReload.mjs, simCompletionOnce.mjs, simLeaderboardCaps.mjs, simScoringCoverage.mjs, simNoRivalNames.mjs, sweepSaves.mjs if it runs headless, and node node_modules/vitest/vitest.mjs run.
3. No new route this batch, so build:seo is not required; run npm run build in the integration worktree and then simSnapshotAssets.mjs, simPrerender.mjs, simHomeCopy.mjs, simLoginReturn.mjs.
4. Then the whole suite once: node scripts/runAllSims.mjs, launched as a fully detached process writing to a log file (PowerShell Start-Process; the Bash tool's background mode has killed it before). Known flakes (a Supabase 500, a statement timeout on nflfastr_player_stats, player_market_values or mlb_grid_players, "SUPABASE UNREACHABLE"): re-run that harness alone and report BOTH results.
5. Then playGames from PowerShell (ENGINES chromium, SWEEP_BASE on a hostLikeServer you start over the integration dist) for /club-manager /soccer-career /nfl-my-career /free-kick /buzzer-beater, one at a time.
6. Anything red that is not a known flake: fix it with the smallest change, commit as "Round 46N, gate fix: ...", re-run. Never weaken a harness to pass; if a harness is wrong say so with evidence and leave it red.
7. Do NOT delete any worktree. Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md.
Report every gate with its verbatim summary line, the merged head, and what remains red.`, { label: 'merge-and-gates', phase: 'Merge and gates', schema: GATES })

return { builds: done, gates }
