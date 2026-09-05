export const meta = {
  name: 'owner-list-459-463',
  description: 'Five rounds off the owner ledger: the soccer conquest, Transfer Path rule modes, Rebuild multiplayer, the era Champions League gaps, and more verified puzzles',
  phases: [
    { title: 'Build', detail: 'five builders in parallel worktrees, harness first' },
    { title: 'Merge and gates', detail: 'merge in round order, build:seo for the new route, every gate, browser plays' },
  ],
}

const REPO = 'C:\\Users\\antho\\ballpark-hero'
const SCRATCH = 'C:\\Users\\antho\\AppData\\Local\\Temp\\claude\\C--Users-antho-ballpark-hero\\051ba96f-ef0b-4330-8579-a72a4ebadc52\\scratchpad'

const RULES = `HOUSE RULES, all enforced by harnesses or by the owner, none optional. Read CLAUDE.md in full first.
- Never write an em dash or an en dash anywhere: not in copy, comments, commit messages, test names or docs. Use commas, colons, periods or parentheses.
- Never name a rival product in any file under src, scripts, supabase or public (scripts/simNoRivalNames.mjs fails on it). FIFA the governing body is allowed under an allowlist; FIFA the video game is not; never write "FIFA-style" in src.
- Site copy sounds casual and human, never AI flavoured.
- NEVER INVENT A PLAYER, A STAT, A TRANSFER, A LINEUP OR A RESULT. Two source verify anything real with named outlets or official sites, and record the sources where the data lives. Where data is thin, mark it (grep CM_PARTIAL for the convention) rather than fill it.
- NEVER PUT INVENTED WORDS OR CONDUCT ON A REAL PERSON. A real name plus documented facts is reporting; an invented quote, an invented bust up, an invented transfer request is the exposure that matters most. Attribute to a role, narrate a simulated result, or use a generated person.
- No league or club logos, crests, kits or player photos, ever. The only permitted external image host is flagcdn.com. Team identity on a map is colour plus name text.
- Never draw from Math.random inside a useState initializer (scripts/simPrerender.mjs section 16 is a ratchet; use src/lib/firstDraw.ts).
- THE DAY IS PINNED AT MOUNT for any file that writes a daily record (one clock read into a useRef); scripts/simDailyReload.mjs section 5 enforces it. A finished state restored after mount calls markRestoredFinish(slug) first. Every storage loader fails closed on shape.
- Supabase access imports SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from '@/integrations/supabase/client'; never read VITE_SUPABASE_* env vars. Never touch a validator or its catch path.
- Every game shows instructions before play, reopenable from the floating question mark; guide copy lives in src/data/gameContent/ and is routed in its loader.
- Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md (the lead owns those; a builder editing them caused merge conflicts last batch). Do not edit RAW_RANDOM_BASELINE in scripts/simPrerender.mjs.
- ONE ENGINE, MANY SPORTS (CLAUDE.md): share engines, never copy them. If the defect you fix exists in a sibling, say so.
- Match each file's style. Touch only what the round needs.

HARNESS RULES:
- Measure OUTCOMES against a baseline; set every margin from measured headroom; never assert non significance; never assert on a max.
- Negative control that reproduces the real defect or the shipped shape, refusing to run if its rewrite changed nothing. Normalise CRLF before matching (a fresh checkout is CRLF; see scripts/simClubManagerBudget.mjs).
- Name it scripts/sim*.mjs (a name starting with test is skipped) and print at least four lines when green. Bundle the REAL module with node_modules/.bin/esbuild (--alias:@=<root>/src) the way scripts/simFreeKick.mjs does; stub localStorage with a Map before importing a bundle that pulls in the Supabase client.

COMMANDS. Type gate is exactly node_modules/.bin/tsc --noEmit -p tsconfig.app.json from the worktree root; READ ITS EXIT CODE. Zero errors before any commit. Do NOT run scripts/runAllSims.mjs. Build only where the brief says.
GIT. Never run git checkout, reset, stash or clean anywhere. Work only in your worktree with git -C. Commit with explicit paths, never git add -A, in parts if the round is large. Messages begin "Round NNN, ..." as one long plain sentence saying what was wrong FOR THE PLAYER and what changed, then a blank line and the measured before and after. No attribution trailers.
WINDOWS. The Bash tool is Git Bash. Write files with the Write or Edit tool, never a bash heredoc (it strips backslashes). Never hand node a /tmp path: bash's /tmp is not node's; put scratch files under ${SCRATCH} by absolute path. Run playGames from PowerShell with $env:ENGINES='chromium', $env:ONLY='/route' and $env:SWEEP_BASE pointing at a node scripts/lib/hostLikeServer.mjs dist <port> you started on your own port after npm run build in your worktree; stop it after.
Your final output is data for a script: commit hashes, verbatim gate lines, and anything you could not do.`

const worktree = name => `YOUR WORKTREE: ${REPO}\\.worktrees\\${name} on branch ${name}.
A PREVIOUS ATTEMPT AT THIS ROUND RAN OUT OF BUDGET PART WAY. The worktree and branch may already exist with uncommitted partial work in them (new files, edits, maybe a harness). FIRST run git -C "${REPO}\\.worktrees\\${name}" status --short and git -C "${REPO}\\.worktrees\\${name}" diff --stat, read what is there, keep what is good, and continue from it; do not throw it away and do not start over. If the worktree does NOT exist, create it: git -C "${REPO}" worktree add -b ${name} ".worktrees/${name}" main, then powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${REPO}\\.worktrees\\${name}\\node_modules' -Target '${REPO}\\node_modules' | Out-Null". If it exists but node_modules is missing, add the junction the same way. Work only there with git -C. COMMIT EARLY AND IN PARTS this time (each part gated by tsc), so the next interruption cannot cost the work.
DO NOT delete your worktree and never run a recursive delete inside it: node_modules is a junction to the real one and a recursive delete empties it for every lane at once. The lead cleans up.`

const BUILD = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    commits: { type: 'array', items: { type: 'string' } },
    what_shipped: { type: 'string' },
    the_defect_or_gap: { type: 'string' },
    red_before: { type: 'string' },
    green_after: { type: 'string' },
    harnesses_run: { type: 'string' },
    tsc: { type: 'string' },
    data_sources: { type: 'string' },
    siblings: { type: 'string' },
    owner_decision: { type: 'string' },
    not_done: { type: 'string' },
  },
  required: ['branch', 'commits', 'what_shipped', 'the_defect_or_gap', 'red_before', 'green_after', 'harnesses_run', 'tsc', 'data_sources', 'siblings', 'owner_decision', 'not_done'],
}

const GATES = {
  type: 'object',
  properties: {
    merged_head: { type: 'string' },
    merge_notes: { type: 'string' },
    gates: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, result: { type: 'string', enum: ['green', 'red', 'skipped'] }, output: { type: 'string' } }, required: ['name', 'result', 'output'] } },
    browser_plays: { type: 'array', items: { type: 'object', properties: { route: { type: 'string' }, result: { type: 'string' }, output: { type: 'string' } }, required: ['route', 'result', 'output'] } },
    fixes_made_during_gates: { type: 'array', items: { type: 'string' } },
    remaining_red: { type: 'string' },
  },
  required: ['merged_head', 'merge_notes', 'gates', 'browser_plays', 'fixes_made_during_gates', 'remaining_red'],
}

const BUILDERS = [
  {
    key: 'round-459-soccer-conquest',
    prompt: `ROUND 459, THE SOCCER CONQUEST, on the renderer Round 457 built.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Conquest): "Then add a soccer conquest covering the top five leagues, fully working." And on presentation: "Original colors and names only, never logos."

WHAT EXISTS: Round 457 collapsed four private map renderers into src/components/conquest/ConquestRegionMap.tsx with the pure parts in src/lib/conquestMapLook.ts (assignTeamLooks, colorDistance, looksDistinct, labelFor, diffOwners, takeoverWaves, lookCss, CLASH_DISTANCE = 12). Each sport injects a ConquestMapSport: regions (id, name, path, labelX, labelY), a SYMMETRIC adjacency table (scripts/simConquestMap.mjs fails one way edges), a team list (id, name, city, color, secondaryColor where documented), a viewBox, and the region noun. Read the four existing sport specs (NFL_CONQUEST_MAP in src/lib/conquestData.ts and the NBA, MLB, NHL ones), the hooks (src/hooks/useConquest.ts, useConquestNba.ts), the boards under src/components/conquest, the pages (src/pages/Conquest*.tsx), src/lib/conquestBattle.ts and conquestDaily.ts, and scripts/simConquestMap.mjs and simConquest.mjs before you write anything. The Round 457 report said: "simConquestMap should get the fifth sport added to its SPORTS list and nothing else", and warned that 96 clubs across five leagues will likely need more than six looks at dE 12, so the first thing to measure is the greedy look count over the full club list; if it exceeds six the fix is more pattern kinds or per league colour scoping, not more colours.

YOUR JOB, a fully working /soccer-conquest:
1. THE MAP: a Europe region geometry covering the five countries (England, Spain, Italy, Germany, France) drawn as regions that clubs can own, in the same shape the renderer reads. Draw it yourself as SVG paths in the shared viewBox, at the granularity the four US maps use (a region per club home area, so about 96 regions plus connective regions), and give it a symmetric adjacency table. Measure that it reads at 390 wide with no horizontal scroll.
2. THE CLUBS: the 2026-27 top five league clubs (20 + 20 + 20 + 18 + 18 = 96). Take the club list from data the repo already carries where it exists (grep src/lib/clubManager.ts and src/data for the league club lists and the era files; Club Manager models these leagues) and verify membership for 2026-27 against two named sources (the league's official site plus one outlet). Colours: documented primary and secondary colours per club from two sources (the club's official site or documented brand guides plus one reference); where you cannot source a colour, use a neutral generated colour and say so in a comment, never a guess presented as the club's.
3. THE RULES: share the battle and daily logic the other sports use (read how useConquestNba differs from useConquest and whether a third copy is honest; prefer injecting a sport into one hook). Club strength for a battle comes from the same market value basis the site uses everywhere (player_market_values 2026 rows summed or averaged per club, read through the existing fetch helpers or a baked file under scripts/data with a --refresh path), never a typed rating.
4. THE ROUTE: src/pages/SoccerConquest.tsx, a lazy route in src/App.tsx, a registry entry under Soccer in src/data/gameRegistry.ts with addedOn set to today's date (YYYY-MM-DD, the day the page first lands in git; scripts/simNewBadge.mjs checks it against git, so if git disagrees after your commit, fix the date to what git says), guide copy in src/data/gameContent/ routed in the loader, a leaderboard cap row applied through the Supabase MCP (scripts/simLeaderboardCaps.mjs fails without it; MEASURE the cap as a perfect run), a daily and an unlimited mode with the Round 428 daily record shape, and the "?" affordance.
5. HARNESS: add the fifth sport to scripts/simConquestMap.mjs's SPORTS list and make sure it passes with the look count measured; extend scripts/simConquest.mjs or add scripts/simSoccerConquest.mjs to drive many seeded games through the real engine and hold that every game ends with one owner, that every club can win from its home region over enough seeds (no dead club), that the daily replays byte identical, and that strength tracks the market basis (a control that shuffles strengths must change who wins). Negative control refusing to run if its rewrite changed nothing, CRLF normalised.
6. BROWSER: build, serve dist on port 4191, playGames from PowerShell with ONLY=/soccer-conquest, and a 390 by 844 screenshot of the map mid game with playwright; look at it and say what you saw.
Report the measured look count, the club list sources, and the colours you could not source.`,
  },
  {
    key: 'round-460-transfer-path-modes',
    prompt: `ROUND 460, TRANSFER PATH'S SPECIAL RULE MODES.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Transfer Path): "fine; add special rule modes (active players only, Europe only)."

WHAT EXISTS: /transfer-path is src/pages/TransferPath.tsx with src/hooks/useTransferPath.ts and src/lib/transferPath.ts; today it has two modes, 'daily' and 'unlimited', and nothing else. THE RULE THAT MATTERS, from CLAUDE.md: "Anything a table says about a puzzle that the game's own rule can compute is derived, never typed." Transfer Path's min_steps and hint come from scripts/genTransferPathHints.mjs over a pull of the career tables, and scripts/simTransferPathHints.mjs fails if a row disagrees with the search. Read all of that first, plus Round 294 and Round 408 in docs/PROJECT-STATE.md (grep "Transfer Path"), and the puzzle table's shape through the Supabase MCP (ToolSearch for execute_sql, SELECT only; list_tables to find it).

YOUR JOB:
1. Two new rule modes on top of the existing rule ("same club, same season"): ACTIVE PLAYERS ONLY (every link in the chain must be a player with a 2026 row, i.e. currently playing) and EUROPE ONLY (every club in the chain must be a European club; define "European" from data the repo already carries, for example the league to country map or the confederation module src/lib/confederationGroups.ts from Round 453, and say exactly what you used). Each mode is a filter on the search graph, so the minimum steps and the hint for a puzzle differ per mode.
2. BEFORE ANY DDL: the previous attempt left two migration files in your worktree (supabase/migrations/20260905_round_460_transfer_path_mode_columns.sql and ..._mode_hints.sql). Query information_schema.columns for the puzzle table through the Supabase MCP FIRST to learn whether they were already applied live; apply only what is missing, and never apply a migration twice.
DERIVE, NEVER TYPE: extend scripts/genTransferPathHints.mjs to compute min_steps and hint per mode, store them per mode in the table (new columns or a mode keyed sibling table, your call, applied by migration through the Supabase MCP with the SQL saved under supabase/migrations/20260905_round_460_...), and extend scripts/simTransferPathHints.mjs so a row disagreeing with the search in ANY mode goes red. Run get_advisors after the DDL and read the function warnings, not only the table ones. Where a puzzle has no path under a mode, the mode must say so and offer a puzzle that does, never a hint into a refusal (Round 294's exact failure).
3. THE PAGE: a mode picker before play (daily stays as it is; the modes apply to unlimited, and to the daily only if the daily puzzle has a path under the mode), the rules copy in the guide and the "?" updated, the daily record shape untouched for the daily.
4. HARNESS: scripts/simTransferPathModes.mjs bundling the real search: for every puzzle in the table and every mode, the stored min_steps equals the search's, every hint step is a legal link under that mode, no chain under active only contains a retired player, no chain under Europe only leaves Europe, and the share of puzzles that have a path under each mode is measured and reported. Negative controls: a typed min_steps that disagrees, and a Europe chain through a non European club, both refusing to run if the rewrite changed nothing, CRLF normalised.
5. Keep scripts/simTransferPathHints.mjs, simTransferPathRepeat.mjs and any other transfer path harness green, and run them. Build, serve dist on 4193, playGames from PowerShell with ONLY=/transfer-path.`,
  },
  {
    key: 'round-461-rebuild-multiplayer',
    prompt: `ROUND 461, REBUILD MULTIPLAYER, on the seat ready engine Round 456 built.

HIS WORDS (docs/TWEAKS-2026-08-28.md, Rebuild): "Multiplayer: same screen pass and play, online, or vs CPU, up to 3 or 4 players, and the finished squads sim a season together with records and trophies shown."

WHAT EXISTS: Round 456 moved Rebuild's whole loop into src/lib/rebuildLoop.ts as pure functions over a plain RunState, with the hook (src/hooks/useRebuild.ts) as a thin wrapper holding the two timers and the network, and wrote in its report: "a later multiplayer round gets one RunState per seat". Read rebuildLoop.ts, useRebuild.ts, src/pages/Rebuild.tsx, src/lib/rebuildDeck.ts, scripts/simRebuildLoop.mjs and simRebuildEconomy.mjs, and the guide, before you write anything. Read also how the site already does a shared season sim of finished squads: Search and Discard (grep src/lib for searchAndDiscard) and Sign the Player's showdown (simulateShowdown in src/lib/auctionHouse.ts), because a season of finished squads is a shape the site already has and CLAUDE.md says share it, do not write a third.

YOUR JOB THIS ROUND: pass and play and vs CPU, two to four seats, on one screen. Online is NOT this round: name it under not_done with what it would need.
1. SEATS: a seat count and a mix of humans and CPU picked before the club draw; each seat gets its own RunState, its own club (distinct clubs), its own envelopes and demands; the window runs seat by seat for the same number of turns; a CPU seat plays the thinking policy simRebuildLoop already drives (reuse that policy code from the lib, do not copy it).
2. PASS AND PLAY: a hand over screen between human seats that hides the previous seat's board (no peeking at another seat's XI mid window), phone first, no scroll rule.
3. THE SHARED SEASON: when every seat has closed its window, the finished XIs play one simulated season together with a table, records (biggest win, longest unbeaten run, top scorer per squad from the sim), and trophies shown, using the site's existing shared season shape. Results are simulated and say so; no invented conduct about real players (scripts/simNoInventedConduct.mjs must stay green).
4. SINGLE PLAYER UNCHANGED: a one seat game must play exactly as Round 456 shipped it; simRebuildLoop and simRebuildEconomy stay green with their controls.
5. HARNESS: scripts/simRebuildSeats.mjs bundling the real engine: two, three and four seat games over many seeds all finish; no two seats share a club or a player; the CPU seats beat the dumb policies by the same measured margin as simRebuildLoop's thinking policy; the shared season ranks squads in an order that tracks their ratings over many seeds (a control that shuffles ratings must break the order); the hand over hides the previous board (a source check on the page, comments stripped). Negative controls refusing to run if the rewrite changed nothing, CRLF normalised.
6. Guide and "?" updated. Build, serve dist on 4195, playGames from PowerShell with ONLY=/rebuild, and drive one two seat pass and play game yourself in playwright at 390 by 844; say what you saw.`,
  },
  {
    key: 'round-462-cm-era-ucl',
    prompt: `ROUND 462, CLUB MANAGER'S ERA CHAMPIONS LEAGUE, his item 4 completed, plus the tiebreaks Round 451 named.

HIS WORDS (docs/TWEAKS-2026-08-28.md, P1 item 4): the era Champions League "shows 4 groups; 2005/06 really had 8 groups" and the rest of that item. Round 342 gave every era its real 32 club field and eight groups. Round 451 then measured three gaps and named them rather than building them (read its entry in docs/PROJECT-STATE.md, grep "Round 451", and its harness scripts/simClubManagerEraMidSeason.mjs): (a) the era competition goes from the eight groups straight to the quarter finals with no round of 16; (b) the group tables vanish from the Cups tab once the knockouts start (UclGroupsCard returns null when uclKoRound is not null); (c) sortedTable at clubManager.ts:3458 splits level points on goal difference everywhere, where La Liga and Serie A use head to head, and the engine keeps no per pair results.

READ FIRST, in targeted slices (the file is enormous): the Round 342 block (uclSeededField, ERA_UCL_FIELDS), the knockout draw and rounds (grep uclKoRound, uclDraw, quarter), UclGroupsCard and CupBracketCard under src/components/club-manager, applyResult and sortedTable, the save shape (grep for the save version and its migration pattern: Round 431 kept a finished season through a reload, and there is a save migration convention; find it), scripts/simClubManagerEraMidSeason.mjs, simClubManagerBudget.mjs and simManagers.mjs.

YOUR JOB:
1. THE ROUND OF 16. In eras whose real format had one (2003-04 onward until the 2024 change, verify the format years against two sources such as uefa.com and a documented reference), the eight group winners and runners up go into a drawn round of 16 (group winners v runners up, not from the same group, not from the same country in the first knockout round, which is the documented rule of that era), then quarter finals, semis, final. The modern world's format stays whatever it is today. Every draw is seeded from the save so a reload replays it.
2. THE GROUP TABLES STAY. Once the knockouts start the Cups tab shows the final group tables beside the bracket, not instead of it.
3. HEAD TO HEAD TIEBREAKS. Add a per pair results ledger to the season state (home and away results between each pair), with a save migration so an existing save opens with the ledger empty and honest (tiebreak falls back to goal difference until pairs have met; say so in the table's footnote), and a league aware sort: Spain and Italy on head to head points then head to head goal difference then overall goal difference; England and Germany on overall goal difference then goals scored; France on overall goal difference (verify each league's documented tiebreak order against two sources and cite them in the code comment). Every existing save must still load (scripts/sweepSaves.mjs shape rule: loaders fail closed on shape; a migrated save is a new shape version, not a tampered one).
4. HARNESS: extend scripts/simClubManagerEraMidSeason.mjs or add scripts/simClubManagerEraUcl.mjs: drive era saves through the whole competition and hold that a round of 16 exists exactly in the eras whose real format had one, that its draw obeys the documented constraints on every seed, that the group tables are still rendered (react-dom/server on the Cups tab data) after the knockouts begin, that level points in Spain and Italy split on head to head in every seeded season where two clubs met twice (measure how often), and that a pre migration save loads and plays. Negative controls reproducing each gap (groups to quarters, the vanishing tables, the goal difference only sort), refusing to run if the rewrite changed nothing, CRLF normalised.
5. Keep simClubManagerEraMidSeason, simClubManagerBudget, simManagers and every other scripts/simClubManager*.mjs and simCm*.mjs green and run them all. Build, serve dist on 4197, playGames from PowerShell with ONLY=/club-manager.
Check the siblings: the college dynasty sims (src/lib/cfbDynasty.ts, cbbDynasty.ts) and the GM sims for the same tiebreak shape, and say what you found.`,
  },
  {
    key: 'round-463-more-puzzles',
    prompt: `ROUND 463, MORE PUZZLES for the three games he asked for more of, every one verified.

HIS WORDS (docs/TWEAKS-2026-08-28.md): Who Am I: "more puzzles; accuracy meter as accurate as possible". Missing XI (he loves it): "many more puzzles". Rarity Round: "More puzzles." Career Ladder: "keep the puzzles coming."

THE RULE THAT DECIDES THIS ROUND: never invent a lineup, a player, a stat or a result. Every Missing XI lineup needs two independent sources (the competition's official site, UEFA or FIFA match reports, BBC Sport, ESPN, a club's official site) recorded with the puzzle, and the harness that already guards those puzzles must stay green.

READ FIRST: how each game's puzzles are stored and served. Missing XI: src/lib/missingXi.ts and its data (grep for the lineup table or data file; the daily record and the reach harness scripts/simMissingXi.mjs and simMissingXiReach.mjs which sweep every surname against the market table around its match year, and the Round 444 layout harness scripts/simMissingXiLayout.mjs which must pass for every new formation). Rarity Round: src/lib/rarityRound.ts and scripts/simRarityPools.mjs and simRarityAgreement.mjs (categories serve their whole pool; every category answer is a real row). Who Am I: src/lib/whoAmI.ts (the scorer, its 2026-07-03 weight audit in the header, POOL_SIZE) and scripts/simWhoAmI*.mjs. Career Ladder: how its puzzles come from career rows.

YOUR JOB:
1. MISSING XI: at least 30 new lineups across eras and competitions (finals, famous league games, derbies), each with the date, competition, both teams, the full starting XI and formation, and two named sources per lineup stored beside it. Every surname must resolve through the game's own reach path (simMissingXiReach), every formation must lay out without overlap at 320, 390 and 430 (simMissingXiLayout), and the team identification Round 444 added (flag or colours) must work for the new teams. Measure the pool size before and after.
2. RARITY ROUND: new categories only where the table's rows support a whole pool honestly (simRarityPools: every category serves its whole pool). Add as many as the data supports, measured, and report the categories you rejected and why.
3. WHO AM I: more puzzles means a larger or better curated guessable pool without breaking the wide pool guessing rule in the header (Messi and Ronaldo must stay guessable). Measure the pool before and after. THE ACCURACY METER: add scripts/simWhoAmIAccuracy.mjs that, against the real pool, holds that the similarity score is monotone in the attributes it claims (a guess sharing more of nationality, position, club, age band and value band with the target scores higher than one sharing fewer, over many random pairs), that the target scores exactly 100 and no other player does, and that the top five by score for a random target share more attributes with it than five random players do, by a measured margin. If the measurement shows a weight that ranks a clearly closer player below a clearly farther one, fix the weight in the scorer with the measurement in the comment, and re-run.
4. CAREER LADDER: measure the puzzle pool; add puzzles only from career rows the table already carries (nothing typed), and say how many.
5. Every touched game's existing harnesses green and run; simNoZeroFacts green (Round 443); simLeaderboardCaps green. Build, serve dist on 4199, playGames from PowerShell with ONLY set to each of /missing-xi, /rarity-round, /who-am-i, /career-ladder in turn.
Report the counts before and after for each game, the sources per new lineup, and everything you rejected.`,
  },
]

phase('Build')
const builds = await parallel(BUILDERS.map(b => () => agent(`${RULES}\n\n${worktree(b.key)}\n\n${b.prompt}`, { label: `build:${b.key}`, phase: 'Build', schema: BUILD })))
const done = builds.filter(Boolean)
log(`Build: ${done.length}/${BUILDERS.length} reported`)

phase('Merge and gates')
const gates = await agent(`${RULES}

THE BRANCHES. Five builders worked on branches created from main: ${BUILDERS.map(b => b.key).join(', ')}. Their reports (JSON): ${JSON.stringify(done, null, 2)}
A builder that reported nothing may still have committed; check every branch with git -C "${REPO}" log --oneline main..<branch>.

YOUR TASK.
1. Create the integration worktree from main (git -C "${REPO}" worktree add -b owner-list-459-463 ".worktrees/owner-list-459-463" main), add the node_modules junction, then merge every builder branch that has commits, one at a time, in round order. Read any conflict rather than taking a side blindly; Rounds 459 and 461 may both touch the shared season shape, and 459 adds a registry line. Report every merge.
2. Gates from the integration worktree, in this order: tsc (zero, READ THE EXIT CODE); every new or changed harness (git diff --name-only main..HEAD -- scripts), each with every negative control, and each control must actually fire; then node scripts/simConquestMap.mjs, simConquest.mjs, simTransferPathHints.mjs, simTransferPathRepeat.mjs, simRebuildLoop.mjs, simRebuildEconomy.mjs, simNoInventedConduct.mjs, simClubManagerEraMidSeason.mjs, simClubManagerBudget.mjs, simManagers.mjs, simMissingXi.mjs, simMissingXiReach.mjs, simMissingXiLayout.mjs, simRarityPools.mjs, simRarityAgreement.mjs, simNoZeroFacts.mjs, simDailyReload.mjs, simDailyPuzzleContract.mjs, simCompletionOnce.mjs, simLeaderboardCaps.mjs, simNewBadge.mjs, simNoRivalNames.mjs, simScoringCoverage.mjs, and node node_modules/vitest/vitest.mjs run.
3. Round 459 adds a route, so the site pipeline must run: npm run build:seo in your worktree (it writes the new snapshot into public/, regenerates the sitemap and its ledger; it takes a while). Then node scripts/simSitemap.mjs, simIndexing, simIndexNow, simHubs, simInternalLinks, simPrerender, simPrerenderBoot, simSnapshotAssets, simSchema, simHeadTags, simAdsense, simBrand, simHiddenPages, simRetiredRoutes, simHomeCopy, simLoginReturn, simReportRelay. NOTE: simIndexNow fails deliberately when the sitemap grows without its floor being raised; raising SITEMAP_FLOOR in scripts/simIndexNow.mjs for the new page, with its provenance comment extended in the house style, is part of this round.
4. Then the whole suite once: node scripts/runAllSims.mjs, launched as a fully detached process writing to a log file (last batch the Bash tool's background mode killed it part way; the merge agent then used PowerShell Start-Process and it completed). A Supabase HTTP 500 or a Postgres statement timeout on nflfastr_player_stats, player_market_values or mlb_grid_players, or "SUPABASE UNREACHABLE", is a KNOWN FLAKE: re-run that harness alone and report BOTH results.
5. Then playGames from PowerShell (ENGINES chromium, SWEEP_BASE on a hostLikeServer you start over the integration dist) for /soccer-conquest /conquest /transfer-path /rebuild /club-manager /missing-xi /rarity-round /who-am-i /career-ladder, one at a time.
6. Anything red that is not a known flake: fix it with the smallest change, commit as "Round 46N, gate fix: ...", re-run. Never weaken a harness to pass; if a harness is wrong say so with evidence and leave it red.
7. Do NOT delete any worktree. Do NOT edit docs/WORKBOARD.md or docs/PROJECT-STATE.md.
Report every gate with its verbatim summary line, the merged head, and what remains red.`, { label: 'merge-and-gates', phase: 'Merge and gates', schema: GATES })

return { builds: done, gates }