export const meta = {
  name: 'owner-list-470-474',
  description: 'Five rounds off the owner ledger: the NBA, MLB and NHL careers on the shared career modules; Club Manager staff; the quick sim screen he specced; Soccer Career audited against his life sim list; Club Manager board asks that name a real target',
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
    key: 'round-470-us-careers-shared',
    prompt: `ROUND 470, THE NBA, MLB AND NHL CAREERS ON THE SHARED CAREER MODULES.

HIS WORDS (docs/TWEAKS-2026-08-28.md): "Bring the whole Soccer Career and Club Manager depth to NFL, NBA, MLB, NHL and the GM games, each with its own sport's texture. The gap between the soccer career and the NFL career is visible to a casual eye; close it." Round 469 closed the NFL half by lifting Soccer Career's money app, social feed, generated rival and badge case into shared modules and injecting the NFL. This round does the other three sports, and the previous round left you the map.

READ FIRST: src/lib/careerMoney.ts (the shared money app behind a MoneySport descriptor), src/lib/nflCareerMoney.ts (the NFL binding, 89 lines, the shape to copy for each sport), src/lib/careerSocial.ts, src/lib/careerBadges.ts, src/components/us-career/MoneyApp.tsx and SocialPanel.tsx, src/lib/nflCareerLoop.ts, the Round 469 hunks in src/lib/nflMyCareer.ts and src/pages/NflMyCareer.tsx, and scripts/simCareerParity.mjs (which already drives two careers and has a seam test showing exactly what proof looks like). Then read the three careers you are binding: grep src/lib, src/hooks and src/pages for nbaMyCareer, mlbMyCareer, nhlMyCareer (routes /nba-my-career, /mlb-my-career, /nhl-my-career).

YOUR JOB: bind all three to the shared modules, each with its own sport's texture, and NEVER by copying a rule.
1. THE MONEY APP for each: a binding the size of nflCareerMoney.ts (currency, seed, year, the bills a player of that sport really pays, the shames, the words), money?: MoneyState on the save with ensureMoney repairing an old save with no migration, one line in each progress() where the pay is banked, and MoneyApp on the Bank box.
2. THE SOCIAL FEED with each sport's texture and the Round 319 rule: never tell a position a stat it cannot have (no centre telling to shoot threes, no goalie to score, no catcher to steal bases). Read the NFL position tables and write each sport's.
3. A NAMED GENERATED RIVAL in each, from the registered banks (scripts/simInventedNames.mjs GENERATORS), moving with the player's career.
4. BADGES for career peaks with each sport's names, from REAL record thresholds, each two source verified and cited in the code (an NBA scoring title, a 50 goal NHL season, a 60 home run MLB season: check the actual numbers, do not write one from memory).
Every real player named stays factual; every rival, reporter or teammate line comes from a generated person or a role.
Harness: extend scripts/simCareerParity.mjs to drive all five careers (soccer, NFL, NBA, MLB, NHL) over many seeded careers and hold that the money app balances in every one, that no social line addresses a position with a stat that sport does not have, that a rival exists and moves, and the source check that no private copy of a shared rule exists in any of the five (the privatecopy control must go red for each). Keep simCareerMoneyAfterRetirement, simCareerBanking, simNoInventedConduct and simNoInventedQuotes green.
Build, serve dist on port 4213, playGames from PowerShell with ONLY=/nba-my-career, then /mlb-my-career, then /nhl-my-career, and screenshot each Bank box at 390 by 844.`,
  },
  {
    key: 'round-471-cm-staff',
    prompt: `ROUND 471, CLUB MANAGER: THE STAFF.

HIS WORDS (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Staff: hire and fire attack, defense, goalkeeping coaches, lead scout, and promote from the academy staff. Generated people with generated portrait art, each with levels and potential. Rivals can poach them; you can match offers a limited number of times."

${CM_READ} Read also src/lib/clubManagerFacilities.ts (Round 467's four facilities, whose training ground already speeds growth) so the coaches do not double count what a facility already does, and the academy state (grep academy, coaching, recruitment, scouts) which already holds coaching, recruitment and building levels and a scouts list, because a staff screen that ignores what is already there would be a second hidden number.

YOUR JOB, in a NEW module src/lib/clubManagerStaff.ts for the rules:
1. FOUR POSTS: attack coach, defence coach, goalkeeping coach, lead scout. Each held by a generated person (name from a bank you register in simInventedNames, portrait drawn as simple shapes, never a photo or a real person), with a level 1 to 10 and a potential he can still reach, and a wage that scales with the era's money and comes out of the staff wage line the Round 467 ledger already charges.
2. WHAT EACH ONE DOES, small, real and bounded, on top of what already exists: the attack and defence coaches lift the growth of the players in their half of the pitch through the existing growth rule (respecting potential headroom: the Round 96 and 116 regressions must not return), the goalkeeping coach the keepers, and the lead scout the quality of what the scouting screen surfaces. A club that never opens this screen must play the game the previous rounds balanced (Round 95's rule: a multiplier that cannot reach 1 is a hidden tax).
3. HIRE AND FIRE with a shortlist, a fee or a severance, and PROMOTION FROM THE ACADEMY: a promoted man starts lower and grows.
4. POACHING: a rival club offers for one of your staff on its own schedule; you may match a limited number of times a season, and the screen says how many are left. A poached coach leaves and the post opens.
5. Save shape: this adds state, so repair it lazily the way ensureFacilities and ensureBooks do (fail closed on shape, no version bump, an old save opens on a sane staff) and prove an old save loads.
Harness scripts/simClubManagerStaff.mjs: over many seeded seasons hold that a staff wage really reaches the ledger, that each coach's effect is in the right direction and bounded and never pushes a player past his ceiling, that a club ignoring the screen is not taxed, that poaching fires and the match limit binds, and that no generated staff name is a real footballer. Two negative controls minimum, each refusing to run if its rewrite finds nothing.
Guide and "?" updated. Build, serve dist on port 4215, playGames ONLY=/club-manager, screenshot the staff screen at 390 by 844.`,
  },
  {
    key: 'round-472-cm-quicksim',
    prompt: `ROUND 472, CLUB MANAGER: THE MATCH SCREEN HE ASKED FOR.

HIS WORDS (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Quick sim screen: stoppage time shown the way the big score apps do it, possession as percentages, real team names never 'them', center every text block, momentum graph reads as up and down swings." And, on the other half: "Watch Live: proper animation. Ball at players' feet, both teams with names and numbers on their dots, players cover the whole pitch, throw ins, corners and fouls exist. Live stats visible during play, subs and tactics at any moment, the AI opponent also subs. MERGE Play Match and Watch Live into one flow: manage the match live, or quick sim it."

THIS ROUND IS THE FIRST HALF AND THE MERGE, NOT THE FULL ANIMATION. Ship the quick sim screen exactly as he described it and the one flow that leads into it; a full eleven a side animation is a round of its own and you must say so in not_done rather than half building it.

${CM_READ} Read the match code specifically: grep src/lib/clubManager.ts for playMyMatch, the half time, the report shape (MatchWeekReport), possession, momentum and the event feed, and read every component under src/components/club-manager that draws a match (grep for MatchReportCard, Watch, Live, minute).

YOUR JOB:
1. THE SCREEN: stoppage time shown as the added minutes at the end of each half rather than a bare 90, possession as two percentages that sum to 100, both clubs named every time (never "them" or "the opposition"), every text block centred, and a momentum graph that reads as swings up and down rather than a flat line. Whatever the engine already computes is what you draw: if possession or momentum is not in the report today, derive it in the engine from what the match already knows (shots, territory, the event feed) rather than inventing a number, and say in your report which you did.
2. THE ONE FLOW: Play Match and Watch Live become one entry with two ways through it, manage it live or quick sim it, with the same result either way for the same seed. That last property is the harness's job: the same match, same seed, played both ways, ends identically.
3. Phone first, 390 wide, no horizontal scroll, and the no scroll rule on every step.
Harness scripts/simMatchScreen.mjs: render the screen through react-dom/server over many seeded matches and hold that the possession pair sums to 100, that stoppage time is present and sane on both halves, that both club names appear and no "them" reaches the screen, that the momentum series has real swings (measure the sign changes over many matches and set the floor from the measurement), and that quick sim and live give the same final score for the same seed. Controls that reproduce the old shape.
Guide and "?" updated. Build, serve dist on port 4217, playGames ONLY=/club-manager, screenshot a finished match screen at 390 by 844.`,
  },
  {
    key: 'round-473-career-life-audit',
    prompt: `ROUND 473, SOCCER CAREER: HIS LIFE SIM LIST, AUDITED AND FILLED.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Soccer Career): "The full life sim feel, start to finish: begin as an academy kid with (usually) modest potential, grind drills, invest earnings in yourself or family or your town, social media and branding with a shoe deal as a long earned peak, injuries with tempting risky recovery shortcuts that can backfire into addiction or worse, a named generated rival and headlines at every step, badges for career peaks (Ballon d'Or, first billion), critics, fan and board pressure, wage cut or leave decisions, a life lived in public. Much of this exists; audit against this list and fill every gap."

THE AUDIT IS THE ROUND'S FIRST DELIVERABLE AND IT GOES IN YOUR REPORT: take his list item by item, and for each one say EXISTS (with the file and line that implements it), PART (what is there and what is missing) or MISSING. /soccer-career is the flagship, about one in five pageviews across the whole site, and src/pages/SoccerCareer.tsx is the biggest file in the repo, so read it in targeted slices and read src/lib/soccerCareer*.ts, src/lib/careerRival.ts, src/lib/careerMoney.ts and src/lib/careerBadges.ts (Round 469 made the last two shared and bound the NFL to them; Soccer Career has no badge case on the shared evaluator yet, which is one of his items).

THEN FILL THE BIGGEST GAPS the audit finds, in his order, as many as you can ship properly. Likely candidates, but the audit decides: the badge case on the shared evaluator with soccer's own peaks (a Ballon d'Or, a first billion, from real record thresholds, sourced); investing earnings in yourself, family or your town as a real choice with real consequences; the shoe deal as a long earned peak of the branding line; risky injury recovery shortcuts with a real downside (handle addiction with care: this is a game about football, so the downside can be a career cost without being a lecture or a caricature); critics with a voice of their own.
Every real player stays factual; every critic, agent, rival or family member is generated, and no real person is quoted.
Harness scripts/simCareerLife.mjs over many seeded careers: whatever you ship, measure its outcome against a baseline (an investment that never pays or always pays is not a choice; a shortcut with no downside is not a risk), hold that nothing grows a player past his potential, and hold the daily and save shapes. Keep every existing career harness green.
Build, serve dist on port 4219, playGames ONLY=/soccer-career, screenshots at 390 by 844 of whatever you shipped.`,
  },
  {
    key: 'round-474-cm-board-asks',
    prompt: `ROUND 474, CLUB MANAGER: BOARD ASKS THAT NAME A REAL TARGET, AND THE INBOX THAT CARRIES THEM.

HIS WORDS (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Board asks get specific: nationality quotas (usually the club's own country), experience counts, position targets, a 90+ potential signing, a 100m+ marquee buy scaled to era." And: "The messages inbox needs a major update: more kinds of messages, choices that actually move relationships and futures."

${CM_READ} Read the board objectives code specifically: grep src/lib/clubManager.ts for buildBoardObjectives, objectiveStatuses, TITLE_STATURE and the demand ladder, and read scripts/simBoardObjectives.mjs in full including its header, because it already holds the ladder's shape and its list of clubs that must and must not be told to win the league. Read the inbox: grep for inbox, message, press for what exists today.

YOUR JOB:
1. SPECIFIC ASKS, on top of the league and cup demands that already exist, every one derived from the club and its era rather than typed: a nationality quota (usually the club's own country, and it must be satisfiable from the market the save really has, so measure that), an experience count (N players over an age), a position target, a signing with 90 plus potential, and a marquee buy over a threshold scaled to the era's money. Each has to be checkable at season end by the same objectiveStatuses path the existing ones use.
2. THE ASKS MUST BE POSSIBLE. A board asking a modest club for a 100m signing in 2005 is a demand nobody can meet: scale every threshold to the club's pot and the era, and prove over every playable club and era that each ask a board can make is reachable in that save. That proof is the round's main measurement.
3. THE INBOX: more kinds of message (the board, the fans, an agent, a coach, a journalist, all generated people or roles), and choices that move something real rather than flavour, with what moved visible later. Do not invent words for a real person.
4. Save shape: repair lazily, fail closed, prove an old save loads.
Harness scripts/simBoardAsks.mjs: over every playable club and era, hold that every ask a board can make is satisfiable in that save (with the measurement printed), that the ask grades correctly at season end, that a save from before this round opens, and that no inbox message puts words on a real person. Two controls minimum. simBoardObjectives must stay green with its ladder intact.
Guide and "?" updated. Build, serve dist on port 4221, playGames ONLY=/club-manager, screenshot the board screen and the inbox at 390 by 844.`,
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
1. Create the integration worktree from main (git -C "${REPO}" worktree add -b owner-list-470-474 ".worktrees/owner-list-470-474" main), add the node_modules junction, then merge every builder branch that has commits, one at a time, in round order. THREE OF THEM TOUCH CLUB MANAGER (471 staff, 472 the match screen, 474 the board asks and inbox): expect conflicts in src/lib/clubManager.ts, src/pages/ClubManager.tsx, src/hooks/useClubManager.ts and src/data/gameContent/soccer1.ts, read each hunk and keep both sides' integration points. If two rounds each added lazy save repair, make sure both run and neither undoes the other. Report every merge and every conflict resolution.
2. Gates from the integration worktree, in this order: tsc (zero, READ THE EXIT CODE); every new or changed harness (git diff --name-only main..HEAD -- scripts), each with every negative control, and each control must actually fire (judged by its output, not its exit code); then every scripts/simClubManager*.mjs and simCm*.mjs, simManagers.mjs, simBoardObjectives.mjs, simFinance.mjs, simSponsors.mjs, simCalendar.mjs, simCareerParity.mjs, simCareerDrills.mjs, simCareerMoneyAfterRetirement.mjs, simCareerBanking.mjs, simNoInventedConduct.mjs, simNoInventedQuotes.mjs, simInventedNames.mjs, simDailyReload.mjs, simCompletionOnce.mjs, simDailyLegend.mjs, simCompletionSlugs.mjs, simLeaderboardCaps.mjs, simScoringCoverage.mjs, simNoRivalNames.mjs, sweepSaves.mjs if it runs headless, and node node_modules/vitest/vitest.mjs run.
3. No new route this batch unless a builder says otherwise, so build:seo is not required; run npm run build in the integration worktree and then simSnapshotAssets.mjs, simPrerender.mjs, simHomeCopy.mjs, simLoginReturn.mjs.
4. Then the whole suite once: node scripts/runAllSims.mjs, launched as a fully detached process writing to a log file (PowerShell Start-Process; the Bash tool's background mode has killed it before). It takes about 90 minutes with other work running, so poll its log every few minutes with a bounded loop and do the browser plays while it runs. Known flakes (a Supabase 500, a statement timeout on nflfastr_player_stats, player_market_values or mlb_grid_players, "SUPABASE UNREACHABLE", a "fetch failed" from simMlbGridPool): re-run that harness alone and report BOTH results.
5. Then playGames from PowerShell (ENGINES chromium, SWEEP_BASE on a hostLikeServer you start over the integration dist) for /club-manager /soccer-career /nba-my-career /mlb-my-career /nhl-my-career /nfl-my-career, one at a time.
6. Anything red that is not a known flake: fix it with the smallest change, commit as "Round 47N, gate fix: ...", re-run. Never weaken a harness to pass; if a harness is wrong say so with evidence and leave it red.
7. Do NOT delete any worktree. Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md.
Report every gate with its verbatim summary line, the merged head, and what remains red.`, { label: 'merge-and-gates', phase: 'Merge and gates', schema: GATES })

return { builds: done, gates }
