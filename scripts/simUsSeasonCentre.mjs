/**
 * Round 1048: the US Season Center shows the season the career saved.
 *
 * NBA My Career and NFL My Career draw a whole season in one press and save
 * totals. The Season Center derives that season game by game AFTER the fact
 * (src/lib/season/core.ts through the US binding src/lib/season/us.ts and a
 * number file per sport, nba.ts and nfl.ts) and stores nothing. This harness
 * plays real careers through each binding's own engine calls and checks what
 * the viewer would show against what the save holds.
 *
 * Population: CAREERS seeded careers a sport and a seed set (default 40),
 * both eras, every position, played to retirement with the binding's own
 * loop (startCareer, rollTeamQuality, assignRole, campBattle, simSeason,
 * progress, the first option of the drawn card, the first offer of every
 * market), plus TARGETED careers that start late enough to reach the
 * seasons organic careers rarely do (a throwback career whose `year` is
 * advanced before its first season: said here because that is not how a
 * player gets there). Targeted and organic seasons are counted apart.
 *
 * Sections:
 *  1 the engines' own words and ranges        5 the schedule and the names
 *  2 held is held                              6 nothing moves (A and B runs)
 *  3 the season shown is the season saved      7 realism, measured
 *  4 the playoff path                          8 lazy by source
 *
 * Section 3 is an INDEPENDENT checker: it never calls the core's
 * `disagreements` or a bind's `check`, and it looks the record band up from
 * its own table by exact equality with the saved team result.
 *
 * Controls (US_SEASON_CONTROL=), each patches exact strings as the code is
 * bundled (refusing to run when a string is not there exactly once) and must
 * turn its NAMED section red; a control run always exits 1 and says whether
 * the red was at the named check:
 *   stream   one Math.random inside buildUsSeason              -> section 6
 *   record   the record target ignored                         -> section 3
 *   length   the held gate removed                             -> section 2
 *   stage    the engine writes a result its own list lacks     -> sections 1 and 4
 *   short82  the NBA engine back on 82 games in every year
 *            (Round 1103 plays the ledger's 66 and 72)         -> section 1
 *   names    the shape window opened for the throwback era,
 *            the binding's id guard off                        -> section 5
 *   window   the same window with the guard ON: the ledger
 *            check goes red and the binding still names nobody -> section 5
 *   formula  a division rival hosted three times, the bind's
 *            own schedule check off                            -> section 5
 *   conf     a first round loser meets the other conference   -> section 4
 *   hot      the feed's takeover line on any night at or above
 *            his average (the rule before the fix pass)        -> section 3
 *   static   a static import of the viewer planted in a route
 *            file (in memory; the same text in a comment stays
 *            green)                                            -> section 8
 * Round 1147 (the NFL bound), each on the NFL's own number file:
 *   sum        `finish` hands him one receiving yard too many    -> section 3
 *   kick       a kicker's side is free to score field goals
 *              that are not his, the bind's own check off        -> section 3
 *   nflstage   the NFL engine writes a result its list lacks     -> sections 1 and 4
 *   nflformula the 17th game dropped for a third game against a
 *              division rival, the bind's schedule check off     -> section 5
 *   days       his lines stay where the core dealt them (no
 *              touchdown day goes with a big day for his team)   -> section 7
 * The fix pass of Round 1147 (2026-10-09). Each of these names ONE check
 * (a piece of its label) and is red only when that check is:
 *   poscore    a one game playoff round prints a keyed score     -> section 4
 *   nflheld    the NFL binding hands the hub another sport's
 *              held line                                         -> section 2
 *   lumpy      his yards, catches and tackles a game follow the
 *              rule before the fix pass (no bounded swing)       -> section 7
 *   flat       every game of his is his average game             -> section 7
 *   tdform     his touchdowns follow the whole of the core's
 *              form. ALL FIVE SEED SETS: the check needs 2,000
 *              quarterback games and one set holds about 600     -> section 7
 *   minutes    drives and moments fall on any free minute        -> section 7
 *   order      the 17 games in one plain shuffle                 -> section 7
 *   points     3.4 touchdowns a side at even strength            -> section 7
 *   forty      a side's strength counts eight times over         -> section 7
 *   level      the score law hands back level games              -> section 7
 *   oddtd      a six or an eight costs a drive list nothing      -> section 7
 *   bigkick    every game of a kicker's wants six makes          -> section 7
 * Release AP (Round 1104 on Round 1147), the same rule: one named check.
 *   oddsack    the number file drops the odd tenths of a sack,
 *              which only a save from before Round 1104 holds    -> section 3
 *
 * Round 1221 (the NFL score law moved to src/lib/gameLaws): a DIGEST mode,
 * the proof that the move changed nothing the Season Center plays.
 *   US_SEASON_DIGEST=print    one sha1 a sport and a seed set over every
 *     season of the fleet as the viewer is handed it (the build's answer,
 *     the whole derived season: every game's score, line and events, the
 *     record target, the repairs, and the playoff path), and one over the
 *     careers themselves after every season (the engine's own stream past
 *     each derive). With US_SEASON_DIGEST_OUT=<file> the record is written
 *     there as JSON, with the blob of every source file the bundle read.
 *   US_SEASON_DIGEST=compare  the same digests against the committed
 *     scripts/data/usSeasonLawDigest.json. Exit 0 equal, 1 a digest moved,
 *     3 "inputs moved under the digest": a bundled file other than the
 *     ones the move touches is not the file the record was made on, so a
 *     difference would not be the move's and nothing is compared.
 *   Control lawdrift (with compare): one constant of the score law changed
 *     where the law now lives. The NFL's digest must move on every seed set
 *     of the run and the NBA's must hold.
 * The record was made on the commit BEFORE the move and compared on the
 * move commit, its child. It is a RECEIPT of that round, in no gate: any
 * later round that changes a career or a season on purpose moves it.
 * Since the move the controls minutes, points, forty, level and oddtd (and
 * lawdrift) patch the law where it lives, src/lib/gameLaws/nflScore.ts and
 * src/lib/gameLaws/nfl.ts; every other NFL control still patches the
 * number file.
 *
 * MEASURED (filled in from the five seed sets, 2026-10-07 for the NBA and
 * 2026-10-09 for the NFL): see the block above the bands in section 7.
 *
 * Green is the closing "simUsSeasonCentre: ... 0 failed" line AND exit 0.
 * Nothing here reaches the network.
 */
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { usSeasonFleet } from './lib/usSeasonFleet.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const CAREERS = Number(process.env.CAREERS ?? 40);
const SEEDSETS = (process.env.SEEDSET ?? '0,1,2,3,4').split(',').map(Number);
const CONTROL = process.env.US_SEASON_CONTROL ?? '';
const ASKED = (process.env.SPORTS ?? 'nba,nfl').split(',').map(s => s.trim()).filter(Boolean);
/* Round 1221: the digest mode (see the header). The files the law move touches are the only bundled
   files whose bytes may differ between the record and a compare. */
const DIGEST = process.env.US_SEASON_DIGEST ?? '';
const DIGEST_FILE = 'scripts/data/usSeasonLawDigest.json';
const DIGEST_MOVED = ['src/lib/season/nfl.ts', 'src/lib/season/core.ts', 'src/lib/keyedShuffle.ts', 'src/lib/gameLaws/types.ts', 'src/lib/gameLaws/nflScore.ts', 'src/lib/gameLaws/nfl.ts'];
if (DIGEST && DIGEST !== 'print' && DIGEST !== 'compare') { console.error(`unknown US_SEASON_DIGEST ${DIGEST} (print or compare)`); process.exit(2); }

/* ─── Controls: exact strings, patched in the bundle only ─── */
const US = 'src/lib/season/us.ts';
const NBA = 'src/lib/season/nba.ts';
const NFL = 'src/lib/season/nfl.ts';
/* Round 1221: the NFL's score law lives in two files of its own; the controls that change the law patch it there */
const NFL_SCORE = 'src/lib/gameLaws/nflScore.ts';
const NFL_STORY = 'src/lib/gameLaws/nfl.ts';
const WINDOW = { file: 'src/data/usLeagueShape.ts', from: "  { sport: 'nba', era: 'now', from: 2025, to: null, shape: NBA_2025 },", to: "  { sport: 'nba', era: 'now', from: 2025, to: null, shape: NBA_2025 },\n  { sport: 'nba', era: 'y2004', from: 2003, to: null, shape: NBA_2025 }," };
const CONTROLS = {
  stream: { section: 6, patches: [{ file: US, from: 'const key = usSeasonKey(bind, career, row);', to: 'const key = usSeasonKey(bind, career, row); Math.random();' }] },
  record: { section: 3, patches: [{ file: US, from: "const target: TeamTarget = band ? { kind: 'record', winsMin: band[0], winsMax: band[1] } : { kind: 'none' };", to: "const target: TeamTarget = { kind: 'none' };" }] },
  length: { section: 2, patches: [{ file: US, from: 'if (length === null || length !== bind.fullSeason) {', to: 'if (length === null) {' }] },
  stage: { section: 1, also: 4, patches: [{ file: 'src/lib/nbaMyCareer.ts', from: '    result = stages[stage];', to: "    result = stages[stage] + ' ';" }] },
  short82: { section: 1, patches: [{ file: 'src/lib/nbaMyCareer.ts', from: "  return usSeasonLength('nba', year) ?? 82;", to: '  return 82;' }] },
  names: { section: 5, patches: [WINDOW, { file: US, from: '  if (ledger.length !== own.length || new Set(ledger).size !== ledger.length) return null;\n  const ownSet = new Set(own);\n  if (ownSet.size !== own.length || !ledger.every(id => ownSet.has(id))) return null;\n', to: '  const ownSet = new Set(own);\n' }] },
  window: { section: 5, patches: [WINDOW] },
  formula: { section: 5, patches: [{ file: NBA, from: 'for (let s = 1; s <= d; s += 1) add(s, 2, 2);', to: 'for (let s = 1; s <= d; s += 1) add(s, 3, 1);' }, { file: NBA, from: '  if (ctx.shape) out.push(...nbaDealProblems(ctx, s.games));\n', to: '' }] },
  conf: { section: 4, patches: [{ file: US, from: '      const slot = r === bind.rounds.length - 1 ? other[0] : conf[r];', to: '      const slot = r === n - 1 ? other[0] : conf[r];' }] },
  hot: { section: 3, patches: [{ file: NBA, from: '  return won && pts >= 20 && pts >= 1.3 * ppg;', to: '  return pts >= ppg;' }] },
  static: { section: 8, patches: [] },
  sum: { section: 3, patches: [
    { file: NFL, from: "    on.forEach((g, i) => { g.line[key] = x[i]; });", to: "    on.forEach((g, i) => { g.line[key] = x[i] + (key === 'recYds' && i === 0 && x[0] > 0 ? 1 : 0); });" },
    { file: NFL, from: '    if (tenths !== Math.round(want * 10)) out.push(`${key} ${tenths / 10} != ${want}`);\n', to: '' },
  ] },
  kick: { section: 3, patches: [
    { file: NFL, from: "    const us = nflDrives(g.us, kinds.length, kicks ? of(g, 'fgMade') : null, rng);", to: '    const us = nflDrives(g.us, kinds.length, null, rng);' },
    { file: NFL, from: "      if (kicker && (count('fg', true) !== of(g, 'fgMade') || g.events.some(e => e.kind === 'fg' && e.side === 'us' && !e.mine))) out.push(`game ${g.md}: his team's field goals are not his makes`);\n", to: '' },
  ] },
  nflstage: { section: 1, also: 4, patches: [{ file: 'src/lib/nflMyCareer.ts', from: '    result = runs[stage];', to: "    result = runs[stage] + ' ';" }] },
  days: { section: 7, patches: [{ file: NFL, from: '  if (on.some(g => tdsOf(g) > 0)) {', to: '  if (on.length < 0) {' }] },
  nflformula: { section: 5, patches: [
    { file: NFL, from: '  if (extra) list.push([extra[Math.floor(rng() * extra.length)], hosts]);', to: '  if (extra) list.push([1, hosts]);' },
    { file: NFL, from: '  if (ctx.shape) out.push(...nflDealProblems(ctx, s.games));\n', to: '' },
  ] },
  /* the fix pass: `label` is a piece of the one check the control must turn red */
  poscore: { section: 4, label: 'playoff path follows', patches: [{ file: US, from: 'won: wonAt(r), score: scores[r] })) };', to: "won: wonAt(r), score: scores[r] ?? (bind.series ? null : (wonAt(r) ? '24-9' : '9-24')) })) };" }] },
  nflheld: { section: 2, label: "is the ledger's own line for this sport", patches: [{ file: 'src/lib/nflCareerSport.ts', from: "  seasonCentreHeld: year => usSeasonHeldLine('nfl', year),", to: "  seasonCentreHeld: year => usSeasonHeldLine('nba', year)," }] },
  lumpy: { section: 7, label: 'sit on a per game cap', patches: [{ file: NFL, from: '      return 1 + swing * (0.62 * mine + 0.18 * team + 0.2 * scored);', to: '      return (1 + mine / 2) * (0.7 + g.us / 60) * (1 + (tdKey ? of(g, tdKey) : 0));' }] },
  flat: { section: 7, label: 'game to game spread sits inside', patches: [{ file: NFL, from: '      return 1 + swing * (0.62 * mine + 0.18 * team + 0.2 * scored);', to: '      return 1;' }] },
  tdform: { section: 7, label: 'touchdown passes scatter', patches: [{ file: NFL, from: 'teamFor: true, teamPoints: 7, formPower: TD_FORM_POWER }', to: 'teamFor: true, teamPoints: 7 }' }] },
  minutes: { section: 7, label: 'under three minutes apart', patches: [{ file: NFL_STORY, from: '      const crowded = used.has(m - 1) || used.has(m) || used.has(m + 1) || (side !== undefined && drives[side].some(x => Math.abs(x - m) < DRIVE_GAP));', to: '      const crowded = false;' }] },
  order: { section: 7, label: 'order of the games reads oddly', patches: [{ file: NFL, from: '  for (let t = 0; t < ORDER_TRIES && least > 0; t += 1) {', to: '  for (let t = 0; t < 1; t += 1) {' }] },
  points: { section: 7, label: 'points a team game', patches: [{ file: NFL_SCORE, from: 'const TD_A_GAME = 2.6;', to: 'const TD_A_GAME = 3.4;' }] },
  forty: { section: 7, label: 'scores 40 or more', patches: [{ file: NFL_SCORE, from: '(TD_A_GAME + 0.05 * e) / DRIVES', to: '(TD_A_GAME + 0.4 * e) / DRIVES' }] },
  level: { section: 7, label: 'level games stay under', patches: [{ file: NFL_SCORE, from: '    if (home) us += more; else them += more;', to: '    if (home) us += 0 * more; else them += 0 * more;' }] },
  oddtd: { section: 7, label: 'touchdowns not worth seven', patches: [{ file: NFL_STORY, from: '        out.push({ t, f, s, cost: Math.abs(rest - 7 * t) + 4 * s });', to: '        out.push({ t, f, s, cost: 4 * s });' }] },
  bigkick: { section: 7, label: 'makes five or six', patches: [{ file: NFL, from: '    const need = left / (n - k);', to: '    const need = MAX_FG;' }] },
  /* Release AP: the line an engine that only makes halves no longer needs, and every older save does */
  oddsack: { section: 3, label: 'sacks in tenths still opens', patches: [{ file: NFL, from: '    if (left % 5 > 0) t[t.indexOf(Math.max(...t))] += left % 5;\n', to: '' }] },
  /* Round 1221: the digest's own control (run with US_SEASON_DIGEST=compare): a field goal ends one drive in a hundred more */
  lawdrift: { section: 'digest', patches: [{ file: NFL_SCORE, from: 'const FG_A_DRIVE = 0.1445;', to: 'const FG_A_DRIVE = 0.1545;' }] },
};
/* which sport a control needs in the run (its patched file is only bundled with that sport) */
const CONTROL_SPORT = {
  stage: 'nba', names: 'nba', window: 'nba', formula: 'nba', hot: 'nba', sum: 'nfl', kick: 'nfl', nflstage: 'nfl', nflformula: 'nfl', days: 'nfl',
  poscore: 'nfl', nflheld: 'nfl', lumpy: 'nfl', flat: 'nfl', tdform: 'nfl', minutes: 'nfl', order: 'nfl', points: 'nfl', forty: 'nfl', level: 'nfl', oddtd: 'nfl', bigkick: 'nfl',
  oddsack: 'nfl', short82: 'nba', lawdrift: 'nfl',
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_SEASON_CONTROL ${CONTROL}`); process.exit(2); }
if (CONTROL === 'lawdrift' ? DIGEST !== 'compare' : !!(CONTROL && DIGEST)) { console.error("the digest mode has one control and that control has one mode: US_SEASON_CONTROL=lawdrift US_SEASON_DIGEST=compare, refusing to run"); process.exit(2); }
if (DIGEST && (ASKED.length !== 2 || !ASKED.includes('nba') || !ASKED.includes('nfl'))) { console.error('the digest mode reads both sports (the NBA is the side that must not move): leave SPORTS alone, refusing to run'); process.exit(2); }

const norm = s => s.replace(/\r\n/g, '\n');
const fired = new Set();
const controlPlugin = {
  name: 'us-season-control',
  setup(b) {
    if (!CONTROL) return;
    const patches = CONTROLS[CONTROL].patches;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      const mine = patches.filter(p => p.file === rel);
      if (mine.length === 0) return undefined;
      let src = norm(readFileSync(args.path, 'utf8'));
      for (const p of mine) {
        if (src.split(p.from).length !== 2) throw new Error(`control ${CONTROL}: its string is not exactly once in ${p.file}, refusing to run: ${p.from.slice(0, 70)}`);
        src = src.replace(p.from, () => p.to);
        fired.add(p);
      }
      return { contents: src, loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

/* Round 1103: the NBA engine plays the ledger's length (66 games in 2011-12, 72 in 2020-21, 82 in a held year),
   so its two windows of games played are restated by season, off the LEDGER and never off the engine's own
   read of it (control short82 puts the engine back on 82 and this must go red): a healthy man misses up to
   four, a hurt one misses 8 to 42 of 82, scaled to the length and rounded the way gamesFor rounds them. At 82
   these are the 40 to 74 and 78 to 82 this row typed before. M is the bundle below, read when a check runs. */
const nbaWindows = year => { const L = M.usSeasonLength('nba', year) ?? 82; return { L, hurtMin: L - Math.round((42 * L) / 82), hurtMax: L - Math.round((8 * L) / 82) }; };
const nbaShortYear = year => nbaWindows(year).L !== 82;

/* ─── The bundle: the two real bindings, the season modules, the ledgers ─── */
const SPORT_DEFS = {
  nba: { binding: 'NBA_CAREER_SPORT', bindingFile: 'src/lib/nbaCareerSport.ts', bindName: 'NBA_SEASON', numberFile: 'src/lib/season/nba.ts', positions: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now', 'y2004'], gamesOk: (g, year) => { const w = nbaWindows(year); return (g >= w.hurtMin && g <= w.hurtMax) || (g >= w.L - 4 && g <= w.L); }, injury: l => l.games <= nbaWindows(l.year).hurtMax, targetedFrom: { era: 'y2004', year: 2016 } },
  nfl: { binding: 'NFL_CAREER_SPORT', bindingFile: 'src/lib/nflCareerSport.ts', bindName: 'NFL_SEASON', numberFile: 'src/lib/season/nfl.ts', positions: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'], gamesOk: g => g >= 1 && g <= 17, injury: l => !l.backup && l.games < nflYearLength(l.year), targetedFrom: { era: 'y2005', year: 2018 } },
};
/* Release AP: since Round 1104 an NFL career plays the year's real length, so "under 17 games" stopped
   meaning "hurt": every full 16 game throwback season from 2005 to 2020 counted (2,219 of 3,943 seasons
   on the merged engine, against 1,416 of 3,924 before it). An injury season is one a starter did not
   finish: fewer games than the two source ledger holds for that year (17 where it holds none, as the
   engine plays it), and never a backup's spot duty. */
function nflYearLength(year) { return M.usSeasonLength('nfl', year) ?? 17; }
/* A sport is run when its number file exists. A sport whose BINDING already
   has a loader may never be skipped: that would be a shipped button nobody checked. */
const SPORTS = [];
for (const slug of Object.keys(SPORT_DEFS)) {
  const d = SPORT_DEFS[slug];
  const has = existsSync(path.join(ROOT, d.numberFile));
  const bound = /loadSeasonCentre\s*:/.test(norm(readFileSync(path.join(ROOT, d.bindingFile), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, ''));
  if (has && ASKED.includes(slug)) SPORTS.push(slug);
  else console.log(`SKIPPED ${slug}: ${has ? 'not asked for (SPORTS)' : 'no number file yet'}`);
  if (!SPORTS.includes(slug) && bound) { console.error(`FAIL: the ${slug} binding has a Season Center loader and was skipped`); process.exit(1); }
}
if (SPORTS.length === 0) { console.error('simUsSeasonCentre: no sport to run'); process.exit(1); }
if (CONTROL && CONTROL_SPORT[CONTROL] && !SPORTS.includes(CONTROL_SPORT[CONTROL])) { console.error(`control ${CONTROL} patches the ${CONTROL_SPORT[CONTROL]} files, and that sport is not in this run: refusing to run`); process.exit(2); }

const OUT = path.join(os.tmpdir(), `us-season-centre-${CONTROL || 'base'}-${process.pid}.mjs`);
const entry = [
  ...SPORTS.map(s => `export { ${SPORT_DEFS[s].binding} } from './${SPORT_DEFS[s].bindingFile}';`),
  ...SPORTS.map(s => `export { ${SPORT_DEFS[s].bindName} } from './${SPORT_DEFS[s].numberFile}';`),
  "export { buildUsSeason, usPlayoffPath, usPlayoffDepth, usBandOf, usSeasonKey } from './src/lib/season/us.ts';",
  "export { deriveSeasonOrWhy, soFar } from './src/lib/season/core.ts';",
  "export { usSeasonLength, usSeasonHeldLine, US_FULL_SEASON } from './src/data/usSeasonLengths.ts';",
  "export { usLeagueShape, US_LEAGUE_SHAPES, NBA_SCORING, nflHosts17 } from './src/data/usLeagueShape.ts';",
  "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
  "export { nbaEraTeamIds } from './src/lib/nbaMyCareer.ts';",
  "export { NFL_ERAS } from './src/lib/nflMyCareer.ts';",
  "export { FO_TEAMS } from './src/data/frontOfficePlayers.ts';",
].join('\n');
const t0 = Date.now();
const built = await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [controlPlugin], jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
  /* the digest mode reads the list of files the bundle was made from; the bundle itself is the same without it */
  metafile: DIGEST !== '',
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (CONTROL && fired.size !== CONTROLS[CONTROL].patches.length) { console.error(`control ${CONTROL}: ${fired.size} of ${CONTROLS[CONTROL].patches.length} patches reached their file, refusing to report`); process.exit(2); }
console.log(`bundled in ${Date.now() - t0} ms; sports ${SPORTS.join(', ')}; ${CAREERS} careers a sport and a seed set; seed sets ${SEEDSETS.join(', ')}${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);

/* ─── Failure bookkeeping, by section ─── */
let checks = 0;
const failsBy = new Map();
const fail = (section, msg) => { if (!failsBy.has(section)) failsBy.set(section, []); failsBy.get(section).push(msg); };
const check = (section, ok, label) => { checks += 1; if (ok) console.log(`ok   ${section} ${label}`); else { console.log(`FAIL ${section} ${label}`); fail(section, label); } };
/** Many items under one label: counts them, prints the first three. */
const tally = (section, label, bad, total) => {
  checks += 1;
  if (bad.length === 0) console.log(`ok   ${section} ${label} (${total} checked)`);
  else { console.log(`FAIL ${section} ${label}: ${bad.length} of ${total}; ${bad.slice(0, 3).join(' || ')}`); fail(section, label); }
};

/* ─── The population ─── */
/* Round 1300: the fleet's one loop is scripts/lib/usSeasonFleet.mjs (a pure move, held by the digest mode
   below), so scripts/simUsPostseason.mjs plays the same careers. */
const { playCareer } = usSeasonFleet(M, SPORT_DEFS);

const TARGETED = Math.max(4, Math.round(CAREERS / 5));
function playAll(onSeason, trap) {
  const out = [];
  for (const slug of SPORTS) for (const seedset of SEEDSETS) {
    for (let i = 0; i < CAREERS; i += 1) out.push(playCareer(slug, i, seedset, false, onSeason, trap));
    for (let i = 0; i < TARGETED; i += 1) out.push(playCareer(slug, i, seedset, true, onSeason, trap));
  }
  return out;
}

/* ─── The harness's OWN restatement of what a season must show (never the module's) ─── */
const OWN = {
  nba: {
    games: 82, clock: 48, missed: 'Missed the playoffs',
    results: ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'],
    bands: [[17, 40], [41, 52], [45, 57], [48, 61], [50, 64], [52, 67]],
    series: [4, 7],
  },
  nfl: {
    games: 17, clock: 60, missed: 'Missed the playoffs',
    results: ['Lost in the Wild Card round', 'Lost in the Divisional round', 'Lost the Conference Championship', 'Lost the Super Bowl', 'WON THE SUPER BOWL'],
    bands: [[2, 9], [9, 12], [10, 13], [11, 14], [11, 15], [11, 15]],
    series: null,
  },
};
const ownBand = (slug, teamResult) => {
  const o = OWN[slug];
  if (teamResult === o.missed) return o.bands[0];
  const i = o.results.indexOf(teamResult);
  return i < 0 ? null : o.bands[i + 1];
};
const gameIds = (slug, eraId) => (slug === 'nba' ? M.nbaEraTeamIds(eraId) : (M.NFL_ERAS.find(e => e.id === (eraId ?? 'now')) ?? M.NFL_ERAS[0]).teams.map(t => t.abbr));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Section 3, NBA: every item recomputed from the row and the derived games. */
function shownIsSavedNba(row, s) {
  const out = [];
  const on = s.games.filter(g => g.played);
  if (s.games.length !== OWN.nba.games) out.push(`games ${s.games.length}`);
  if (on.length !== row.games) out.push(`played ${on.length} != ${row.games}`);
  const mean = k => on.reduce((a, g) => a + (g.line[k] ?? 0), 0) / Math.max(1, on.length);
  if (isNum(row.ppg) && Math.round(mean('pts')) !== Math.round(row.ppg)) out.push(`ppg ${mean('pts').toFixed(2)} != ${row.ppg}`);
  if (isNum(row.rpg) && Math.round(mean('reb') * 10) !== Math.round(row.rpg * 10)) out.push(`rpg ${mean('reb').toFixed(3)} != ${row.rpg}`);
  if (isNum(row.apg) && Math.round(mean('ast') * 10) !== Math.round(row.apg * 10)) out.push(`apg ${mean('ast').toFixed(3)} != ${row.apg}`);
  for (const g of on) {
    for (const k of ['pts', 'reb', 'ast']) if (!Number.isInteger(g.line[k]) || g.line[k] < 0) out.push(`md ${g.md}: ${k} ${g.line[k]}`);
    if (g.line.pts >= g.us) out.push(`md ${g.md}: his ${g.line.pts} against his team's ${g.us}`);
  }
  for (const g of s.games) {
    if (g.us === g.them) out.push(`md ${g.md}: level`);
    if (!g.played && Object.keys(g.line).length) out.push(`md ${g.md}: a line in a game he missed`);
    /* the feed's "You take over" line, restated here: once, and only in a win, on 20 or more, at 1.3 times his average */
    const said = g.events.filter(e => e.kind === 'hot').length;
    const earned = g.played && g.us > g.them && isNum(row.ppg) && g.line.pts >= 20 && g.line.pts >= 1.3 * row.ppg;
    if (said !== (earned ? 1 : 0)) out.push(`md ${g.md}: ${said} takeover lines for ${g.played ? g.line.pts : 'no'} points against ${row.ppg} a game in a ${g.us > g.them ? 'win' : 'loss'}`);
  }
  return out;
}

/** Section 3, NFL: every item recomputed from the row and the derived games.
 *  The harness's own list of the line's stat fields and its own reading of a
 *  drive (never the number file's). */
const NFL_FIELDS = ['passYds', 'passTd', 'ints', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'tackles', 'sacks', 'picks', 'passDef', 'forcedFum', 'fgMade', 'fgAtt'];
const NFL_TD_EVENTS = { 'td-pass': 'passTd', 'td-rush': 'rushTd', 'td-rec': 'recTd' };
function shownIsSavedNfl(row, pos, s) {
  const out = [];
  const on = s.games.filter(g => g.played);
  const of = (g, k) => g.line[k] ?? 0;
  if (s.games.length !== OWN.nfl.games) out.push(`games ${s.games.length}`);
  if (on.length !== row.games) out.push(`played ${on.length} != ${row.games}`);
  for (const k of NFL_FIELDS) {
    if (!isNum(row[k])) { if (on.some(g => g.line[k] !== undefined)) out.push(`${k} on his line and not on the save`); continue; }
    const tenths = on.reduce((a, g) => a + Math.round(of(g, k) * 10), 0);
    if (tenths !== Math.round(row[k] * 10)) out.push(`${k} ${tenths / 10} != ${row[k]}`);
    if (k !== 'sacks' && on.some(g => !Number.isInteger(of(g, k)) || of(g, k) < 0)) out.push(`${k} is not a whole number in a game`);
  }
  if (isNum(row.longFg)) {
    const longs = on.filter(g => of(g, 'fgMade') > 0).map(g => g.line.longFg);
    if (longs.length === 0 || longs.some(v => !Number.isInteger(v) || v > row.longFg || v < 18) || !longs.includes(row.longFg)) out.push(`long ${row.longFg} against ${JSON.stringify(longs).slice(0, 60)}`);
    if (on.some(g => of(g, 'fgMade') === 0 && g.line.longFg !== undefined)) out.push('a long in a game with no make');
  }
  /* sacks: steps of a half, except at most one game that takes the season's odd tenths */
  if (isNum(row.sacks) && on.filter(g => Math.round(of(g, 'sacks') * 10) % 5 !== 0).length > 1) out.push('more than one game with sacks off the half step');
  for (const g of s.games) {
    if (!g.played && Object.keys(g.line).length) out.push(`md ${g.md}: a line in a game he missed`);
    if (!g.played && g.events.some(e => e.mine)) out.push(`md ${g.md}: his event in a game he missed`);
    if (g.us === 1 || g.us === 4 || g.them === 1 || g.them === 4) out.push(`md ${g.md}: a score of ${g.us}-${g.them} no drive list makes`);
    if (new Set(g.events.map(e => e.min)).size !== g.events.length) out.push(`md ${g.md}: two lines of the feed share a minute`);
    for (const e of g.events) {
      const isTd = e.kind === 'td' || e.kind in NFL_TD_EVENTS;
      const pts = e.pts ?? 0;
      if (isTd ? ![6, 7, 8].includes(pts) : e.kind === 'fg' ? pts !== 3 : e.kind === 'safety' ? pts !== 2 : pts !== 0) out.push(`md ${g.md}: a ${e.kind} worth ${pts}`);
      if (!Number.isInteger(e.min) || e.min < 1 || e.min > 60) out.push(`md ${g.md}: a drive at minute ${e.min}`);
      if (e.mine && e.side !== 'us') out.push(`md ${g.md}: his event on the other side`);
    }
    if (!g.played) continue;
    for (const [kind, key] of Object.entries(NFL_TD_EVENTS)) {
      const n = g.events.filter(e => e.kind === kind && e.mine).length;
      if (n !== of(g, key)) out.push(`md ${g.md}: ${n} ${kind} drives for ${of(g, key)} on his line`);
    }
    if (g.events.filter(e => e.side === 'us' && (e.kind === 'td' || e.kind in NFL_TD_EVENTS)).length * 6 > g.us) out.push(`md ${g.md}: more touchdowns than the score holds`);
    if (of(g, 'fgMade') > of(g, 'fgAtt')) out.push(`md ${g.md}: ${of(g, 'fgMade')} makes on ${of(g, 'fgAtt')} tries`);
    if (of(g, 'rec') < of(g, 'recTd') || (of(g, 'rec') === 0 && of(g, 'recYds') !== 0)) out.push(`md ${g.md}: ${of(g, 'rec')} catches, ${of(g, 'recTd')} touchdown catches, ${of(g, 'recYds')} yards`);
    if (pos === 'K') {
      /* every field goal his team makes in a game he plays is his */
      const fgs = g.events.filter(e => e.kind === 'fg' && e.side === 'us');
      if (fgs.length !== of(g, 'fgMade') || fgs.some(e => !e.mine)) out.push(`md ${g.md}: his team kicks ${fgs.length} field goals, his line says ${of(g, 'fgMade')}`);
      if (g.events.filter(e => e.kind === 'miss').length !== of(g, 'fgAtt') - of(g, 'fgMade')) out.push(`md ${g.md}: his misses in the feed are not his misses on the line`);
    }
  }
  return out;
}

/** Section 3, NFL, Release AP: the same season as a save made BEFORE Round 1104 holds it.
 *  That engine rounded a season's sacks to tenths (11.3); this one rounds to halves, so no
 *  career played here reaches the branch of the number file that lays the odd tenths out,
 *  and every older save with a pass rusher on it needs that branch. The saved sacks are
 *  moved one to four tenths past the half step at or below them (by hand, said here because
 *  no engine call made this line) and the season is derived again and held against the same
 *  independent checker. Both arms are walked: an odd tenth alone (11.3) and a half with an
 *  odd tenth on top (11.8). `n` only picks the tenth, so nothing is drawn. */
function oldSaveTwin(bind, SB, career, n) {
  const twin = JSON.parse(JSON.stringify(career));
  const row = twin.seasons[twin.seasons.length - 1];
  const steps = Math.floor(Math.round(row.sacks * 10) / 5);
  row.sacks = (5 * steps + 1 + (n % 4)) / 10;
  const out = { sacks: row.sacks, half: steps % 2 === 1, year: row.year, pos: twin.pos, why: null, problems: [] };
  const b = M.buildUsSeason(bind, twin, row, SB.teamLabelOf);
  if (!b.ok) { out.why = `build: ${b.why}`; return out; }
  const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
  if (typeof s === 'string') { out.why = s; return out; }
  out.problems = shownIsSavedNfl(row, twin.pos, s);
  return out;
}

/** Section 3, any sport: the events' points make each side's score at full
 *  time and never pass it or fall at any minute the bug can show. */
function boardIsTrue(slug, s) {
  const out = [];
  const L = OWN[slug].clock;
  for (const g of s.games) {
    let us = 0; let them = 0; let last = 0;
    const sorted = g.events.every((e, i) => i === 0 || g.events[i - 1].min <= e.min);
    if (!sorted) out.push(`md ${g.md}: events out of order`);
    for (const e of g.events) {
      if (!(e.min >= 0 && e.min <= L)) out.push(`md ${g.md}: an event at minute ${e.min}`);
      if (e.min < last) continue;
      last = e.min;
      if ((e.pts ?? 0) < 0) out.push(`md ${g.md}: negative points`);
      if (e.side === 'us') us += e.pts ?? 0; else them += e.pts ?? 0;
      if (us > g.us || them > g.them) out.push(`md ${g.md}: the board passes the final at minute ${e.min}`);
    }
    if (us !== g.us || them !== g.them) out.push(`md ${g.md}: the board ends ${us}-${them}, the game ${g.us}-${g.them}`);
  }
  return out;
}

/** Section 4: the path against the harness's own reading of the saved result. */
function pathProblems(slug, row, path, target, who) {
  const out = [];
  const o = OWN[slug];
  const i = o.results.indexOf(row.teamResult);
  if (i < 0) {
    if (path) out.push('a path for a season with no playoff result');
    if (row.teamResult !== o.missed && target.kind !== 'none') out.push('a band for a result the list does not hold');
    return out;
  }
  const n = Math.min(4, i + 1);
  if (!path) { if (!(slug === 'nfl' && isNum(row.poGames) && row.poGames !== n)) out.push('no path for a playoff season'); return out; }
  if (path.steps.length !== n) out.push(`rounds ${path.steps.length} != ${n}`);
  path.steps.forEach((st, r) => { if (st.won !== (r < n - 1 || i === 4)) out.push(`round ${r + 1} won ${st.won}`); });
  /* who he meets, by the harness's own reading of a bracket of four rounds: in a named season every
     opponent is a team of the game's list for the era, never his own, none twice; rounds one to three
     are his own conference and only the fourth (the Finals, the Super Bowl) is the other. Unnamed:
     "another team" in every round. */
  if (who.named) {
    const shape = M.usLeagueShape(slug, who.eraId, row.year);
    const ids = gameIds(slug, who.eraId);
    const confOf = id => shape?.divisions.find(dv => dv.teams.includes(id))?.conf;
    const mine = confOf(row.team);
    const met = new Set();
    path.steps.forEach((st, r) => {
      const id = ids.find(x => who.SB.teamLabelOf(x, who.eraId) === st.opp);
      if (!id || !mine || !confOf(id)) { out.push(`round ${r + 1}: "${st.opp}" is not a team of the game's list in a conference`); return; }
      if (id === row.team) out.push(`round ${r + 1}: he meets his own team`);
      if (met.has(id)) out.push(`round ${r + 1}: ${id} met twice`);
      met.add(id);
      const finals = r === 3;
      who.count[finals ? 'finals' : 'early'] += 1;
      if ((confOf(id) === mine) === finals) out.push(`round ${r + 1}: ${id} is ${finals ? 'his own' : 'the other'} conference (he is ${row.team})`);
    });
  } else if (path.steps.some(st => st.opp !== 'another team')) out.push('an unnamed season names a playoff opponent');
  if (o.series) {
    const fits = Number.isInteger(row.poGames) && row.poGames >= o.series[0] * n && row.poGames <= o.series[1] * n;
    if (!fits) { if (path.steps.some(st => st.score !== null)) out.push('a series score with playoff games that do not fit'); return out; }
    let sum = 0;
    for (const st of path.steps) {
      const m = /^(\d+)-(\d+)$/.exec(st.score ?? '');
      if (!m) { out.push('a series with no score'); continue; }
      const a = Number(m[1]); const b = Number(m[2]);
      if ((st.won ? a : b) !== o.series[0] || (st.won ? b : a) >= o.series[0] || a + b > o.series[1]) out.push(`series ${st.score}`);
      sum += a + b;
    }
    if (sum !== row.poGames) out.push(`series games ${sum} != ${row.poGames}`);
  } else {
    if (isNum(row.poGames) && path.steps.length !== row.poGames) out.push(`playoff games ${path.steps.length} != ${row.poGames}`);
    /* One game a round: the save holds his playoff numbers as a sentence ("2 of 3 on field goals",
       "238 yds, 2 TD, 1 INT") and no score. A score drawn beside it cannot be held to that sentence
       (before the fix pass 15% of kickers' paths showed a score no count of his field goals could
       make), so the only score a round may print is none. */
    for (const st of path.steps) if (st.score !== null) out.push(`a one game round prints a score the save does not hold (${st.score})`);
  }
  return out;
}

/** Section 5: opponents and names, from the ledger read here and the game's own list. */
function scheduleProblems(slug, SB, row, eraId, s, named) {
  const out = [];
  const ids = gameIds(slug, eraId);
  if (s.labels[0].key !== row.team || s.labels[0].name !== SB.teamLabelOf(row.team, eraId)) out.push('slot 0 is not his team');
  if (!named) {
    if (s.labels.slice(1).some(l => l.named || l.name !== 'another team')) out.push('an unnamed season prints a name');
    const homes = s.games.filter(g => g.home).length;
    if (Math.abs(2 * homes - s.games.length) > 1) out.push(`home games ${homes} of ${s.games.length}`);
    if (new Set(s.games.map(g => g.opp)).size !== s.games.length) out.push('an unnamed opponent met twice');
    return out;
  }
  const shape = M.usLeagueShape(slug, eraId, row.year);
  if (!shape) { out.push('named with no ledger shape'); return out; }
  for (const l of s.labels) if (!ids.includes(l.key) || l.name !== SB.teamLabelOf(l.key, eraId)) out.push(`a name the era's list does not vouch for: ${l.name} (${l.key})`);
  if (new Set(s.labels.map(l => l.name)).size !== s.labels.length) out.push('a name twice');
  const divOf = id => shape.divisions.find(d => d.teams.includes(id));
  const mine = divOf(row.team);
  if (!mine) { out.push('his team is in no division'); return out; }
  const count = new Map(); const home = new Map();
  for (const g of s.games) { const id = s.labels[g.opp].key; count.set(id, (count.get(id) ?? 0) + 1); if (g.home) home.set(id, (home.get(id) ?? 0) + 1); }
  const kinds = { div: [], conf: [], other: [] };
  for (const l of s.labels.slice(1)) {
    const dv = divOf(l.key);
    kinds[dv === mine ? 'div' : dv && dv.conf === mine.conf ? 'conf' : 'other'].push({ id: l.key, n: count.get(l.key) ?? 0, h: home.get(l.key) ?? 0 });
  }
  const homes = s.games.filter(g => g.home).length;
  if (slug === 'nba') {
    for (const t of kinds.div) if (t.n !== 4 || t.h !== 2) out.push(`division rival ${t.id}: ${t.n} games, ${t.h} at home`);
    const four = kinds.conf.filter(t => t.n === 4 && t.h === 2).length;
    const three = kinds.conf.filter(t => t.n === 3 && (t.h === 1 || t.h === 2));
    if (kinds.div.length !== 4 || kinds.conf.length !== 10 || four !== 6 || three.length !== 4 || three.filter(t => t.h === 2).length !== 2) out.push(`conference split: ${four} at four, ${three.length} at three`);
    for (const t of kinds.other) if (t.n !== 2 || t.h !== 1) out.push(`other conference ${t.id}: ${t.n} games, ${t.h} at home`);
    if (kinds.other.length !== 15 || homes !== 41) out.push(`home games ${homes}`);
  }
  if (slug === 'nfl') {
    /* the 17 game formula, read here from the ledger's divisions: 6 in the division (home and away),
       one whole division of his conference and one of the other (two of each at home), one club from
       each of the two other divisions of his conference (one at home), and one more from the other
       conference out of a division not already met; 8 or 9 at home, 9 exactly when the ledger says
       his conference hosts the 17th game that year */
    if (s.games.length !== 17) out.push(`${s.games.length} games`);
    if (kinds.div.length !== 3) out.push(`${kinds.div.length} division rivals`);
    for (const t of kinds.div) if (t.n !== 2 || t.h !== 1) out.push(`division rival ${t.id}: ${t.n} games, ${t.h} at home`);
    const byDiv = list => shape.divisions.filter(dv => dv !== mine).map(dv => {
      const at = list.filter(t => dv.teams.includes(t.id));
      return { name: dv.name, size: at.length, met: at.filter(t => t.n > 0).length, n: at.reduce((a, t) => a + t.n, 0), h: at.reduce((a, t) => a + t.h, 0), most: Math.max(0, ...at.map(t => t.n)) };
    }).filter(x => x.size > 0);
    const whole = x => x.met === 4 && x.n === 4 && x.h === 2 && x.most === 1;
    const one = x => x.met === 1 && x.n === 1;
    const cf = byDiv(kinds.conf); const ot = byDiv(kinds.other);
    if (cf.length !== 3 || cf.filter(whole).length !== 1 || cf.filter(one).length !== 2 || cf.filter(one).reduce((a, x) => a + x.h, 0) !== 1) out.push(`his conference: ${cf.map(x => `${x.name} ${x.n} games against ${x.met}, ${x.h} at home`).join('; ')}`);
    if (ot.length !== 4 || ot.filter(whole).length !== 1 || ot.filter(one).length !== 1 || ot.filter(x => x.n === 0).length !== 2) out.push(`the other conference: ${ot.map(x => `${x.name} ${x.n} games against ${x.met}, ${x.h} at home`).join('; ')}`);
    if (homes !== 8 && homes !== 9) out.push(`home games ${homes}`);
    const hosts = M.nflHosts17(row.year, mine.conf);
    const extra = ot.filter(one)[0];
    if (hosts !== null && extra && (extra.h === 1) !== hosts) out.push(`the 17th game is ${extra.h === 1 ? 'at home' : 'away'} in ${row.year}, the ledger says his conference ${hosts ? 'hosts' : 'travels'}`);
    if (hosts !== null && homes !== (hosts ? 9 : 8)) out.push(`home games ${homes} in a year his conference ${hosts ? 'hosts' : 'travels for'} the 17th game`);
  }
  return out;
}

/* ─── Section 7's bands, each set from the spread measured over the five seed sets ───
   MEASURED 2026-10-07, SEEDSET 0 to 4 one at a time, CAREERS 40 (plus 8 targeted) a sport.
   NBA (801 to 820 derived seasons a set, 4057 pooled):
     seasons refused            0, 0, 0, 0, 0 of about 810      band: at most 1%
     no repair needed           88.5, 87.7, 88.7, 89.7, 89.4 %  band: at least 80% (headroom 7.7 points; the
                                                                sets spread over 2.0)
     points a team game, now    115.72, 115.72, 115.78, 115.77, 115.72 against 115.6   band: within 1.0
     points a team game, y2004  93.64, 93.50, 93.61, 93.64, 93.60 against 93.4         (worst gap 0.24; the
                                                                72 point floor lifts the old era a touch)
     his share of his team's
     points, 99th percentile    0.442, 0.437, 0.414, 0.416, 0.442   band: under 0.50
     median wins by result, pooled (asserted only on the five sets pooled, with 20 or more seasons; one set
     alone prints them, see section 7): missed 29 (band 17 to 40),
     first round 46 (41 to 52), semis 49 (45 to 57), conference finals 54 (48 to 61), lost the Finals 56
     (50 to 64), champions 58 (52 to 67): every one inside the middle half of its band, so strengthFor's
     7.9 was kept as designed.
   MEASURED 2026-10-08 (the fix pass, the five seed sets pooled, the same 4057 seasons):
     the feed's takeover line   on 6.3% of the games he played, in 2943 of the 4057 seasons. Section 3
                                restates the rule game by game (a win, 20 or more, 1.3 times his average)
                                and only asks that the line is in the population at all.
     named playoff rounds       1786 before the bracket's last round and 145 in it, each checked for its
                                conference in section 4, which fails when either count is 0.
   A refused season is not a wrong season (the player gets the plain tile), but more than 1 in 100 would
   be a hole a player meets, so that is where the band sits. */
/* MEASURED 2026-10-09 (Round 1147, the NFL bound; measured AGAIN the same day after the fix pass
   changed how his line, the order of the games and the feed's minutes are laid: every number below
   is from that second run, head 69a20015), SEEDSET 0 to 4 one at a time on a GitHub runner,
   CAREERS 40 (plus 8 targeted) a sport. NFL, 490 to 510 open seasons a set, 2508 pooled, on the ten
   drive score law with his touchdown days matched to his team's scores:
     seasons refused            0, 0, 0, 0, 0 of about 500      band: at most 1%
     no repair needed           79.6, 80.1, 81.6, 85.0, 81.2 %  band: at least 70% (headroom 9.6 points
                                                                under the lowest set; the sets spread
                                                                over 5.4). A football record band is
                                                                four or five wins wide and 17 games
                                                                scatter by about two, so more seasons
                                                                need a nudge than in the NBA.
     points a team game, now    22.78, 22.92, 22.82, 22.88, 22.83
     points a team game, y2005  22.95, 22.81, 22.90, 22.80, 22.92   band: 21.0 to 24.5 (the law's own
                                                                mean is 22.5: 2.6 touchdowns at seven
                                                                and 1.445 field goals; his floor lifts
                                                                it a little; headroom 1.5 each side)
     a side on 40 or more       5.1, 5.5, 5.5, 5.5, 5.4 % of    band: under 7% (49 or more: 0.7 to 0.9%;
                                team games                      shut out: 0.6 to 0.7%; control `points`
                                                                14.7%). The first draft
                                                                drew touchdowns from a Poisson count;
                                                                by arithmetic, not by measurement, that
                                                                gives a side seven touchdowns 1.7% of
                                                                the time at even strength against
                                                                0.45% for ten drives.
     level games                0.13, 0.13, 0.22, 0.07, 0.27 %  band: under 0.6% (6 to 23 games a set of
                                (6 to 23 of about 8,500)        about 8,500, so the band is 51 games:
                                                                more than twice the highest set;
                                                                control `level` 4.5%)
     touchdowns not worth seven 1.6, 1.7, 1.7, 1.6, 1.6 %       band: under 3% (sevens and threes first;
                                                                control `oddtd` 52.1%)
     a kicker makes 5 or 6      1.7, 1.0, 2.7, 1.8, 1.9 % of    band: under 6% (more than twice the
     in a game                  his games (about 1,170 a set)   highest set; control `bigkick` 18.2%.
                                                                His makes a game peak at 1 and 2:
                                                                0: 18 to 20%, 1: 27 to 31%, 2: 29 to
                                                                31%, 3: 14 to 17%, 4: about 4%)
     his team's points a game on his two touchdown days, less his blank days (quarterbacks, backs and
     receivers): 9.0, 8.6, 6.9, 7.9, 8.2 with the match; 2.3 (set 0) and 1.2 (set 3) with control `days`
     (his lines left where the core dealt them)                 band: at least 4.5 (2.4 under the lowest
                                                                set, 2.2 over the control's highest)
     his touchdowns are the whole of his team's score in 1.1 to 1.7% of the games he played, printed
     median wins by result, a set at a time: missed 5, 6, 6, 5, 5 (band 2 to 9); Wild Card 10, 10, 10, 10,
     11 (9 to 12); Divisional 11, 12, 12, 11, 11 (10 to 13); Conference Championship 13, 12, 13, 13, 12
     (11 to 14); lost the Super Bowl 14, 13, 13, 14, 13 (11 to 15); champions 12, 12, 13, 13, 14 (11 to
     15): every one inside the middle half of its band, so strengthFor's 11.3 was kept as worked out (a
     game's margin has a standard deviation of about 13.4 points under this law and a unit of edge is
     worth 0.7 of a point). The last two results have 12 to 23 seasons a set and are asserted only at 20
     or more.
     named playoff rounds, a set: 294 to 398 before the Super Bowl and 23 to 36 in it.

   THE FIX PASS'S OWN CHECKS, the same five sets (a full season: he played 14 or more of the 17; 214 to
   309 such seasons a set, 3,629 to 5,231 games):
     a laid number (passing yards, rushing yards, catches, tackles) exactly on this sim's per game cap
                                0.00% in every set               band: under 0.5% (control `lumpy`, the
                                                                rule before the fix pass: 1.74% on set
                                                                0 and 1.95% on set 4; the reviewer's
                                                                probe found 2.9 to 4.6% by position)
     his headline number more than twice his season's average
                                0.47, 0.60, 0.41, 0.60, 0.34 %   band: under 2% (over three times the
                                                                highest set; `lumpy` 6.97 and 5.64%)
     the middle full season's spread game to game (standard deviation over his average)
                                0.390, 0.374, 0.359, 0.379,      band: 0.25 to 0.46. The top is 0.07 over
                                0.381                            the highest set and 0.075 under
                                                                `lumpy` (0.579 and 0.535). The bottom
                                                                is there for control `flat` (every
                                                                game his average, 0.103 on set 0,
                                                                what whole numbers alone scatter):
                                                                by number a set
                                                                reads passing yards 0.25 to 0.27,
                                                                rushing 0.33 to 0.34, catches 0.45 to
                                                                0.47, tackles 0.37 to 0.39, and the
                                                                middle season moves with the mix of
                                                                positions, so 0.25 leaves 0.11.
     a quarterback's touchdown passes, their scatter over a plain count's (variance over the mean, a
     season at a time, pooled): 1.043, 1.038, 1.015, 1.072, 1.019 a set of 646 to 843 games (printed, not
     asserted: one set is too few) and 1.036 over the five sets' 3,846 games
                                                                band: under 1.13, asserted at 2,000
                                                                games or more. Control `tdform` (the
                                                                whole of the core's form) reads 1.224
                                                                on the same games, so 1.13 is midway.
                                                                The first band was 1.2 and the control
                                                                only cleared it by 0.024.
     a side's scoring drives under three minutes apart
                                0.00% in every set               band: under 1% (control `minutes` 19.2%)
     a calendar that reads oddly (a rival twice running, four straight at home or away)
                                0.00% in every set               band: under 2% (control `order`, one
                                                                plain shuffle: 66.9%)

   RELEASE AP'S OWN CHECKS (Round 1104 on Round 1147), the same five sets on the merged engine, 2026-10-09:
     an injury season (a starter short of the year's own length), and those in a year the viewer opens
       NFL: 49 and 31, 61 and 38, 48 and 39, 55 and 27, 40 and 27 a set (253 and 162 over the five). The
       old reading, "under 17 games", counted 2,219 of 3,943 seasons, every full 16 game year among them.
       NBA: 73 and 62, 56 and 47, 83 and 71, 67 and 60, 85 and 73 (364 and 313). Asserted: one that is open.
     seasons saved with sacks in tenths, as a save from before Round 1104 holds them (oldSaveTwin)
       127, 130, 133, 135, 134 a set (659 over the five); an odd tenth alone 68, 63, 63, 64, 66; a half
       and an odd tenth 59, 67, 70, 71, 68. Refused: 0 in every set, and every one shown holds its saved
       sacks. Control `oddsack`: 127 of 127 refused on set 0 and 659 of 659 over the five (100%).
                                                                band: the population's own, under 1%
                                                                refused; each arm at least 25 seasons
                                                                (under half the lowest arm of a set) */
const REFUSED_MAX = { nba: 0.01, nfl: 0.01 };
const NO_REPAIR_MIN = { nba: 0.8, nfl: 0.7 };
const OLD_SAVE_MIN = 25;
const NBA_POINTS_TOL = 1.0;
const NBA_SHARE_P99_MAX = 0.5;
const NFL_POINTS = [21.0, 24.5];
const NFL_LEVEL_MAX = 0.006;
const NFL_ODD_TD_MAX = 0.03;
const NFL_BIG_KICK_MAX = 0.06;
const NFL_FORTY_MAX = 0.07;
const NFL_TD_DAY_MIN = 4.5;
/* The fix pass's own checks (measured over the five seed sets; see the block above) */
const NFL_LINE_CAP_MAX = 0.005;
const NFL_LINE_DOUBLE_MAX = 0.02;
const NFL_LINE_SPREAD = [0.25, 0.46];
const NFL_TD_SCATTER_MAX = 1.13;
const NFL_TD_SCATTER_MIN_GAMES = 2000;
const NFL_CLOSE_DRIVES_MAX = 0.01;
const NFL_ODD_ORDER_MAX = 0.02;

/* ─── Run B: every season observed right after it is played ─── */
const seen = [];
const points = {};   // slug|era -> { sum, n } his team's and the other side's points
const shares = { nba: [] };
/* the NFL's own section 7 numbers: level games, how plain the drives are, a kicker's makes a game */
const nflSeen = {
  games: 0, level: 0, tds: 0, oddTds: 0, safeties: 0, makes: [], kickerGames: 0, floorSet: 0, played: 0, forty: 0, fortyNine: 0, shutOut: 0, byTd: [0, 1, 2, 3].map(() => ({ sum: 0, n: 0 })),
  /* the fix pass: his own line in a full season, the feed's minutes, the order of the games */
  seasons: 0, oddOrder: 0, drivePairs: 0, closeDrives: 0, linePairs: 0, nextMinute: 0,
  lineGames: 0, lineCap: 0, lineDouble: 0, spreads: [], spreadBy: {}, tdGames: 0, tdSq: 0, tdDf: 0, tdCap: 0,
};
/* The harness's OWN table (never the module's): each position's headline number among those the number
   file lays out game by game, and the most this sim gives one game of each. A kicker has none here: his
   makes have their own band. */
const NFL_HEAD = { QB: 'passYds', RB: 'rushYds', WR: 'rec', TE: 'rec', LB: 'tackles', CB: 'tackles', EDGE: 'tackles' };
const NFL_GAME_CAPS = { passYds: 520, rushYds: 290, rec: 15, recYds: 330, tackles: 20 };
/** A full season: he played 14 or more of the 17, so a game's share of his total means something. */
const NFL_FULL = 14;
const poRounds = {};  // slug -> named playoff rounds checked for their conference: { early, finals }
/* Round 1221, the digest mode: one running sha1 a sport and a seed set, fed every season in the order the
   fleet plays it with what the viewer is handed (see the header). Nothing is kept when the mode is off. */
const digests = new Map();
function digestSeason(who, row, built, s, pathNow) {
  if (!DIGEST) return;
  const k = `${who.slug}|${who.seedset}`;
  if (!digests.has(k)) digests.set(k, { hash: createHash('sha1'), seasons: 0, derived: 0 });
  const d = digests.get(k);
  d.seasons += 1;
  if (s && typeof s !== 'string') d.derived += 1;
  d.hash.update(`${JSON.stringify([who.i, who.targeted, row.year, built, s, pathNow])}\n`);
}
function observe(c, line, who) {
  const d = SPORT_DEFS[who.slug];
  const SB = M[d.binding];
  const bind = M[d.bindName];
  /* what the hub hands the viewer: the SAVED career and its last line */
  const career = JSON.parse(JSON.stringify(c));
  const row = career.seasons[career.seasons.length - 1];
  const rec = {
    ...who, year: row.year, games: row.games, teamResult: row.teamResult, backup: c.role === 'backup',
    /* what the hub reads: the BINDING's own held line (the entry tile calls sport.seasonCentreHeld),
       and beside it the ledger's line for this sport, which the binding must be handing on */
    heldLine: SB.seasonCentreHeld?.(row.year, career.eraId) ?? null, ledgerLine: M.usSeasonHeldLine(who.slug, row.year), p3: [], p4: [], p5: [], p6: [],
  };
  seen.push(rec);
  const b = M.buildUsSeason(bind, career, row, SB.teamLabelOf);
  rec.build = b.ok ? 'ok' : b.why;
  if (!b.ok) { digestSeason(who, row, rec.build, null, null); return; }
  const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
  if (typeof s === 'string') { digestSeason(who, row, 'ok', s, null); rec.why = s.startsWith('self:') ? 'self' : s; rec.whyFull = s; return; }
  rec.derived = true;
  rec.named = !!b.ctx.shape;
  rec.repairs = s.repairs;
  rec.attempt = s.attempt;
  rec.wins = s.games.filter(g => g.us > g.them).length;
  rec.level = s.games.filter(g => g.us === g.them).length;
  /* section 3 */
  if (who.slug === 'nba') rec.p3.push(...shownIsSavedNba(row, s));
  else if (typeof shownIsSavedNfl === 'function') rec.p3.push(...shownIsSavedNfl(row, career.pos, s));
  rec.p3.push(...boardIsTrue(who.slug, s));
  /* the same line as an older save holds it (see oldSaveTwin) */
  if (who.slug === 'nfl' && isNum(row.sacks)) rec.old = oldSaveTwin(bind, SB, career, seen.length);
  const band = ownBand(who.slug, row.teamResult);
  if (band && (rec.wins < band[0] || rec.wins > band[1])) rec.p3.push(`wins ${rec.wins} outside ${band[0]} to ${band[1]} for "${row.teamResult}"`);
  if (!band && s.target.kind !== 'none') rec.p3.push(`a band for the unknown result "${row.teamResult}"`);
  /* section 4 */
  const pathNow = M.usPlayoffPath(bind, row, b.ctx, b.key);
  digestSeason(who, row, 'ok', s, pathNow);
  rec.path = !!pathNow;
  rec.p4.push(...pathProblems(who.slug, row, pathNow, s.target, { named: rec.named, eraId: career.eraId, SB, count: poRounds[who.slug] ??= { early: 0, finals: 0 } }));
  rec.hot = s.games.filter(g => g.events.some(e => e.kind === 'hot')).length;
  rec.on = s.games.filter(g => g.played).length;
  /* section 5 */
  rec.p5.push(...scheduleProblems(who.slug, SB, row, career.eraId, s, rec.named));
  /* section 6: twice, from a JSON round trip, and soFar at every game */
  const again = JSON.parse(JSON.stringify({ career, row }));
  const b2 = M.buildUsSeason(bind, again.career, again.row, SB.teamLabelOf);
  const s2 = b2.ok ? M.deriveSeasonOrWhy(b2.sport, again.row, b2.ctx) : 'build';
  if (JSON.stringify(s2) !== JSON.stringify(s)) rec.p6.push('a second derive from a JSON round trip differs');
  if (JSON.stringify(b2.ok ? M.usPlayoffPath(bind, again.row, b2.ctx, b2.key) : null) !== JSON.stringify(pathNow)) rec.p6.push('the path differs on a second read');
  let apps = 0;
  for (let md = 1; md <= s.games.length; md += 1) apps = M.soFar(s, md).apps;
  if (apps !== row.games) rec.p6.push(`soFar ends on ${apps} games`);
  /* section 7 numbers */
  const k = `${who.slug}|${career.eraId ?? 'now'}`;
  points[k] ??= { sum: 0, n: 0 };
  for (const g of s.games) { points[k].sum += g.us + g.them; points[k].n += 2; }
  if (who.slug === 'nba') for (const g of s.games) if (g.played) shares.nba.push(g.line.pts / g.us);
  if (who.slug === 'nfl') {
    for (const g of s.games) {
      nflSeen.games += 1;
      if (g.us === g.them) nflSeen.level += 1;
      for (const v of [g.us, g.them]) { if (v >= 40) nflSeen.forty += 1; if (v >= 49) nflSeen.fortyNine += 1; if (v === 0) nflSeen.shutOut += 1; }
      for (const e of g.events) {
        if (e.kind === 'td' || e.kind in NFL_TD_EVENTS) { nflSeen.tds += 1; if (e.pts !== 7) nflSeen.oddTds += 1; }
        if (e.kind === 'safety') nflSeen.safeties += 1;
      }
      if (!g.played) continue;
      nflSeen.played += 1;
      /* his touchdowns alone are the whole of his team's score: the floor set that game */
      const mineTd = g.events.filter(e => e.mine && e.kind in NFL_TD_EVENTS).length;
      if (mineTd > 0 && g.us === 7 * mineTd) nflSeen.floorSet += 1;
      /* his team's score by how many touchdowns were his that day (the positions that score them) */
      if (['QB', 'RB', 'WR', 'TE'].includes(career.pos)) { const k = Math.min(3, mineTd); nflSeen.byTd[k].sum += g.us; nflSeen.byTd[k].n += 1; }
      if (career.pos === 'K') { nflSeen.kickerGames += 1; const f = g.line.fgMade ?? 0; nflSeen.makes[f] = (nflSeen.makes[f] ?? 0) + 1; }
    }
    /* the order of the games, read here: the same opponent twice running, or a fourth straight game at home or away */
    let run = 1; let oddOrder = false;
    s.games.forEach((g, i) => {
      if (i === 0) return;
      if (g.opp === s.games[i - 1].opp) oddOrder = true;
      run = g.home === s.games[i - 1].home ? run + 1 : 1;
      if (run > 3) oddOrder = true;
    });
    nflSeen.seasons += 1;
    if (oddOrder) nflSeen.oddOrder += 1;
    /* the feed's minutes: one side's scoring drives one after another, and any two lines one after another */
    for (const g of s.games) {
      g.events.forEach((e, i) => { if (i > 0) { nflSeen.linePairs += 1; if (e.min - g.events[i - 1].min < 2) nflSeen.nextMinute += 1; } });
      for (const side of ['us', 'them']) {
        const at = g.events.filter(e => e.side === side && (e.pts ?? 0) > 0).map(e => e.min);
        at.forEach((m, i) => { if (i > 0) { nflSeen.drivePairs += 1; if (m - at[i - 1] < 3) nflSeen.closeDrives += 1; } });
      }
    }
    /* his own line in a full season */
    const on = s.games.filter(g => g.played);
    const head = NFL_HEAD[career.pos];
    if (on.length >= NFL_FULL && head && isNum(row[head]) && row[head] > 0) {
      const xs = on.map(g => g.line[head] ?? 0);
      const mean = xs.reduce((a, v) => a + v, 0) / xs.length;
      const spread = Math.sqrt(xs.reduce((a, v) => a + (v - mean) ** 2, 0) / xs.length) / mean;
      nflSeen.lineGames += xs.length;
      nflSeen.lineCap += on.reduce((a, g) => a + Object.keys(NFL_GAME_CAPS).filter(k => g.line[k] === NFL_GAME_CAPS[k]).length, 0);
      nflSeen.lineDouble += xs.filter(v => v > 2 * mean).length;
      nflSeen.spreads.push(spread);
      (nflSeen.spreadBy[head] ??= []).push(spread);
    }
    /* a quarterback's touchdown passes: the squared distance of each game from his season's average,
       over what a plain count with that average would give (about 1 when nothing but chance moves them) */
    if (career.pos === 'QB' && on.length >= NFL_FULL && isNum(row.passTd) && row.passTd >= 10) {
      const t = on.map(g => g.line.passTd ?? 0);
      const m = t.reduce((a, v) => a + v, 0) / t.length;
      nflSeen.tdGames += t.length;
      nflSeen.tdSq += t.reduce((a, v) => a + (v - m) ** 2, 0);
      nflSeen.tdDf += (t.length - 1) * m;
      nflSeen.tdCap += t.filter(v => v === 6).length;
    }
  }
}

const trapA = { count: 0 };
const trapB = { count: 0 };
const tA = Date.now();
const runA = playAll(null, trapA);
const runB = playAll(observe, trapB);
console.log(`played ${runA.length} careers twice in ${Date.now() - tA} ms; ${seen.length} seasons observed`);

/* ─── Round 1221: a digest run ends here (see the header); the sections below are the default run's ─── */
if (DIGEST) {
  const per = CAREERS + TARGETED;
  /* git's own blob id of the file with LF line ends, so a record made on Linux reads the same on Windows */
  const blobOf = rel => {
    const body = Buffer.from(norm(readFileSync(path.join(ROOT, rel), 'utf8')), 'utf8');
    return createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${body.length}`), Buffer.from([0]), body])).digest('hex').slice(0, 12);
  };
  const inputs = Object.keys(built.metafile.inputs).map(p => p.split(path.sep).join('/')).filter(p => p !== '<stdin>' && !p.includes('node_modules/')).sort();
  const nowDigests = {};
  SPORTS.forEach((slug, si) => {
    nowDigests[slug] = {};
    SEEDSETS.forEach((seedset, ki) => {
      const d = digests.get(`${slug}|${seedset}`);
      const from = (si * SEEDSETS.length + ki) * per;
      const got = {
        seasons: d ? d.seasons : 0, derived: d ? d.derived : 0, season: d ? d.hash.digest('hex') : null,
        careers: createHash('sha1').update(JSON.stringify(runB.slice(from, from + per))).digest('hex'),
      };
      nowDigests[slug][seedset] = got;
      console.log(`digest ${slug} seed set ${seedset}: ${got.seasons} seasons, ${got.derived} derived, season ${got.season}, careers ${got.careers}`);
    });
  });
  console.log(`digest stray draws (Math.random calls while a season was derived): ${trapB.count}`);
  if (DIGEST === 'print') {
    const record = {
      round: 1221,
      what: 'What the NBA and NFL Season Centers are handed for every season of the fleet of scripts/simUsSeasonCentre.mjs, before the NFL score law moved to src/lib/gameLaws. A receipt of that move, in no gate.',
      commit: process.env.US_SEASON_DIGEST_COMMIT ?? null,
      careers: CAREERS,
      strayDraws: trapB.count,
      digests: nowDigests,
      moved: DIGEST_MOVED,
      movedAtRecord: Object.fromEntries(inputs.filter(p => DIGEST_MOVED.includes(p)).map(p => [p, blobOf(p)])),
      inputs: Object.fromEntries(inputs.filter(p => !DIGEST_MOVED.includes(p)).map(p => [p, blobOf(p)])),
    };
    const out = process.env.US_SEASON_DIGEST_OUT;
    if (out) writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`simUsSeasonCentre digest print: ${SPORTS.length * SEEDSETS.length} digests over ${inputs.length} bundled files, ${out ? `written to ${out}` : 'printed only (US_SEASON_DIGEST_OUT=<file> writes the record)'}`);
    process.exit(0);
  }
  if (!existsSync(path.join(ROOT, DIGEST_FILE))) { console.error(`no record at ${DIGEST_FILE}: nothing to compare with`); process.exit(2); }
  const rec = JSON.parse(readFileSync(path.join(ROOT, DIGEST_FILE), 'utf8'));
  if (rec.careers !== CAREERS) { console.error(`the record was made with ${rec.careers} careers a sport and a seed set and this run has ${CAREERS}: refusing to compare`); process.exit(2); }
  for (const slug of SPORTS) for (const seedset of SEEDSETS) if (!rec.digests?.[slug]?.[seedset]) { console.error(`the record holds no ${slug} digest for seed set ${seedset}: refusing to compare`); process.exit(2); }
  /* a bundled file the move does not touch must be the file the record was made on, or a difference is not the move's */
  const moved = new Set(rec.moved);
  const under = [];
  for (const p of inputs) {
    if (moved.has(p)) continue;
    if (!(p in rec.inputs)) under.push(`${p} (not in the record's bundle)`);
    else if (rec.inputs[p] !== blobOf(p)) under.push(`${p} (${rec.inputs[p]} at the record, ${blobOf(p)} now)`);
  }
  for (const p of Object.keys(rec.inputs)) if (!inputs.includes(p)) under.push(`${p} (gone from the bundle)`);
  if (under.length) {
    console.log(`inputs moved under the digest: ${under.slice(0, 12).join('; ')}${under.length > 12 ? `; and ${under.length - 12} more` : ''}`);
    console.log(`simUsSeasonCentre digest compare: NOT COMPARED, ${under.length} bundled files are not the ones the record was made on (exit 3: this is no red of the score law)`);
    process.exit(3);
  }
  const FIELDS = ['seasons', 'derived', 'season', 'careers'];
  const differs = {};
  let n = 0;
  let badN = 0;
  for (const slug of SPORTS) for (const seedset of SEEDSETS) {
    const want = rec.digests[slug][seedset];
    const got = nowDigests[slug][seedset];
    const diff = FIELDS.filter(f => want[f] !== got[f]);
    differs[`${slug}|${seedset}`] = diff;
    n += 1;
    if (diff.length === 0) console.log(`ok   digest ${slug} seed set ${seedset} is the record's (${got.seasons} seasons, ${got.derived} derived)`);
    else { badN += 1; console.log(`FAIL digest ${slug} seed set ${seedset}: ${diff.map(f => `${f} ${got[f]} now, ${want[f]} at the record`).join('; ')}`); }
  }
  n += 1;
  const strayOk = trapB.count === rec.strayDraws;
  if (strayOk) console.log(`ok   digest stray draws are the record's (${trapB.count})`);
  else { badN += 1; console.log(`FAIL digest stray draws: ${trapB.count} now, ${rec.strayDraws} at the record`); }
  if (CONTROL === 'lawdrift') {
    /* the law is the NFL Season Center's alone: its season digest moves on every seed set; the careers (the
       engine never reads the law), the NBA and the stray draws hold */
    const nflMoved = SEEDSETS.every(k => differs[`nfl|${k}`].includes('season'));
    const restHeld = strayOk && SEEDSETS.every(k => differs[`nba|${k}`].length === 0 && !differs[`nfl|${k}`].includes('careers') && !differs[`nfl|${k}`].includes('seasons'));
    const ok = nflMoved && restHeld;
    console.log(ok
      ? `control lawdrift: RED AT THE NAMED CHECK (the NFL season digest moved on every seed set of this run; the NBA's digests, both sports' careers and the stray draws held)`
      : `control lawdrift: DID NOT FIRE AT ITS NAMED CHECK (the NFL season digest ${nflMoved ? 'moved on every seed set' : 'did NOT move on every seed set'}; the rest ${restHeld ? 'held' : 'did NOT hold'})`);
    console.log(`simUsSeasonCentre digest compare: ${n} digests, ${badN} moved (control lawdrift)`);
    process.exit(ok ? 1 : 2);
  }
  console.log(`simUsSeasonCentre digest compare: ${n} digests, ${badN} moved (a receipt of Round 1221's law move, in no gate)`);
  process.exit(badN ? 1 : 0);
}

const median = xs => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : NaN; };
const pct = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : NaN; };
const share = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');

for (const slug of SPORTS) {
  const d = SPORT_DEFS[slug];
  const o = OWN[slug];
  const all = seen.filter(r => r.slug === slug);
  const live = all.filter(r => r.teamResult !== 'SUSPENDED');
  console.log(`\n===== ${slug.toUpperCase()}: ${all.length} seasons (${all.filter(r => r.targeted).length} targeted), ${live.length} played =====`);

  /* 1 */
  const unknown = live.filter(r => r.teamResult !== o.missed && !o.results.includes(r.teamResult));
  tally('1', `${slug} every team result is the engine's missed word or one of its five`, unknown.slice(0, 5).map(r => JSON.stringify(r.teamResult)), live.length);
  tally('1', `${slug} games played sit in the engine's ranges`, live.filter(r => !d.gamesOk(r.games, r.year)).map(r => `${r.games} in ${r.year}`), live.length);
  if (slug === 'nba') {
    /* The floor is a seed set's: 41 to 45 short seasons a seed set at 40 careers (seed sets 0 to 14 one at a
       time, 2026-10-09; 220 over the first five on 2026-10-08), so 20 each. Typed as 100 for the run, it failed
       every run of one seed set, which is how this harness is measured. */
    const short = live.filter(r => nbaShortYear(r.year)).length;
    const shortFloor = Math.ceil(20 * SEEDSETS.length * Math.min(1, CAREERS / 40));
    check('1', short >= shortFloor, `nba short seasons (66 or 72 games) are in the population (${short}, floor ${shortFloor}: 20 a seed set, 41 to 45 measured)`);
  }
  const depthN = o.results.map(t => live.filter(r => r.teamResult === t).length);
  console.log(`     by result: missed ${live.filter(r => r.teamResult === o.missed).length}, ${o.results.map((t, i) => `${depthN[i]}`).join(' / ')} (depth 0 to title)`);
  check('1', depthN.every(n => n > 0), `${slug} every playoff depth and a title are in the population`);
  /* counted where it matters: a short season is only laid out game by game in a year the viewer opens */
  const hurt = live.filter(r => d.injury(r));
  const hurtOpen = hurt.filter(r => r.build === 'ok').length;
  check('1', hurtOpen > 0, `${slug} an injury season is in the population, among the seasons the viewer opens (${hurt.length}, ${hurtOpen} of them open)`);
  check('1', live.some(r => r.backup), `${slug} a backup season is in the population (${live.filter(r => r.backup).length})`);
  check('1', d.positions.every(p => live.some(r => r.pos === p)), `${slug} every position is in the population`);
  check('1', d.eras.every(e => live.some(r => r.eraId === e)), `${slug} both eras are in the population`);

  /* 2 */
  tally('2', `${slug} the hub's held line is there exactly when the binding holds the season`,
    live.filter(r => (r.heldLine !== null) !== (r.build === 'held')).map(r => `${r.year}: line ${r.heldLine ? 'yes' : 'no'}, build ${r.build}`), live.length);
  tally('2', `${slug} the line the binding hands the hub is the ledger's own line for this sport`,
    live.filter(r => r.heldLine !== r.ledgerLine).map(r => `${r.year}: binding ${JSON.stringify(r.heldLine)}, ledger ${JSON.stringify(r.ledgerLine)}`), live.length);
  tally('2', `${slug} no held season yields a derived season`, live.filter(r => r.heldLine !== null && r.derived).map(r => `${r.year}`), live.filter(r => r.heldLine !== null).length);
  const heldYears = slug === 'nba' ? [2011, 2012, 2019, 2020] : [2005, 2012, 2020, 2022];
  for (const y of heldYears) {
    const at = live.filter(r => r.year === y);
    const org = at.filter(r => !r.targeted).length;
    console.log(`     ${y}: ${at.length} seasons (${org} organic, ${at.length - org} targeted), ${at.filter(r => r.build === 'held').length} held`);
    check('2', at.length > 0 && at.every(r => r.build === 'held'), `${slug} ${y} is in the population and every one is held`);
  }
  const tgtHeld = live.filter(r => r.targeted && r.build === 'held').length;
  check('2', tgtHeld > 0, `${slug} the targeted careers reach held seasons (${tgtHeld})`);

  /* 3 */
  const open = live.filter(r => r.build === 'ok');
  const derived = open.filter(r => r.derived);
  const refused = open.filter(r => !r.derived);
  const byWhy = {};
  for (const r of refused) byWhy[r.why] = (byWhy[r.why] ?? 0) + 1;
  console.log(`     open ${open.length}, derived ${derived.length}, refused ${refused.length} (${share(refused.length, open.length)}) ${JSON.stringify(byWhy)}`);
  if (refused.length) console.log(`     first refusals: ${refused.slice(0, 3).map(r => `${r.year} ${r.pos} ${r.games}g "${r.teamResult}": ${r.whyFull}`).join(' || ')}`);
  check('3', open.length > 100, `${slug} enough open seasons to mean anything (${open.length})`);
  check('7', REFUSED_MAX[slug] !== null && NO_REPAIR_MIN[slug] !== null, `${slug} has measured bands (five seed sets, written above REFUSED_MAX)`);
  check('3', refused.length <= open.length * (REFUSED_MAX[slug] ?? 0), `${slug} seasons that cannot be laid out stay under ${(100 * (REFUSED_MAX[slug] ?? 0)).toFixed(1)}% (${share(refused.length, open.length)})`);
  tally('3', `${slug} the season shown is the season saved (independent checker)`, derived.filter(r => r.p3.length).map(r => `${r.year} ${r.pos}: ${r.p3[0]}`), derived.length);
  if (slug === 'nfl') {
    /* saves from before Round 1104: sacks in tenths (see oldSaveTwin) */
    const old = derived.filter(r => r.old).map(r => r.old);
    const oldRefused = old.filter(t => t.why !== null);
    const oldShown = old.filter(t => t.why === null);
    const arms = [old.filter(t => !t.half).length, old.filter(t => t.half).length];
    console.log(`     saves from before Round 1104: ${old.length} seasons with sacks in tenths (${arms[0]} an odd tenth alone, ${arms[1]} a half and an odd tenth), refused ${oldRefused.length}, shown ${oldShown.length}`);
    if (oldRefused.length) console.log(`     first refusals: ${oldRefused.slice(0, 3).map(t => `${t.year} ${t.pos} ${t.sacks} sacks: ${t.why}`).join(' || ')}`);
    check('3', arms[0] >= OLD_SAVE_MIN && arms[1] >= OLD_SAVE_MIN, `${slug} seasons saved with sacks in tenths are in the population, both arms (${arms[0]} and ${arms[1]}, at least ${OLD_SAVE_MIN} each)`);
    check('3', oldRefused.length <= old.length * (REFUSED_MAX[slug] ?? 0), `${slug} a season saved with sacks in tenths still opens: refused stay under ${(100 * (REFUSED_MAX[slug] ?? 0)).toFixed(1)}% (${share(oldRefused.length, old.length)})`);
    tally('3', `${slug} a season saved with sacks in tenths shows the sacks the save holds`, oldShown.filter(t => t.problems.length).map(t => `${t.year} ${t.pos} ${t.sacks}: ${t.problems[0]}`), oldShown.length);
  }
  if (slug === 'nba') {
    const hot = derived.reduce((a, r) => a + r.hot, 0); const on = derived.reduce((a, r) => a + r.on, 0);
    console.log(`     takeover lines: ${hot} in ${on} games he played (${share(hot, on)}), in ${derived.filter(r => r.hot > 0).length} of ${derived.length} seasons`);
    check('3', hot > 0, `${slug} the feed's takeover line is in the population (${hot})`);
  }

  /* 4 */
  tally('4', `${slug} the playoff path follows the saved result, the playoff games and the bracket's conferences`, derived.filter(r => r.p4.length).map(r => `${r.year} "${r.teamResult}": ${r.p4[0]}`), derived.length);
  const po = poRounds[slug] ?? { early: 0, finals: 0 };
  check('4', po.early > 0 && po.finals > 0, `${slug} named playoff rounds were checked for their conference (${po.early} before the last round, ${po.finals} in it)`);
  console.log(`     paths shown: ${derived.filter(r => r.path).length}; playoff seasons ${derived.filter(r => o.results.includes(r.teamResult)).length}`);

  /* 5 */
  tally('5', `${slug} the schedule follows the formula and every name is the game's own`, derived.filter(r => r.p5.length).map(r => `${r.year} ${r.eraId}: ${r.p5[0]}`), derived.length);
  const namedN = derived.filter(r => r.named).length;
  console.log(`     named ${namedN}, unnamed ${derived.length - namedN} (organic unnamed ${derived.filter(r => !r.named && !r.targeted).length}, targeted unnamed ${derived.filter(r => !r.named && r.targeted).length})`);
  check('5', namedN > 0 && derived.length - namedN > 0, `${slug} named and unnamed seasons are both in the population`);
  for (const w of M.US_LEAGUE_SHAPES.filter(x => x.sport === slug)) {
    const ledger = w.shape.divisions.flatMap(dv => dv.teams).slice().sort();
    const own = [...gameIds(slug, w.era)].sort();
    check('5', JSON.stringify(ledger) === JSON.stringify(own), `${slug} the ledger's ids for era ${w.era} are exactly the game's list (${ledger.length} against ${own.length})`);
  }
  if (slug === 'nfl') {
    /* two files of this repo hold the NFL's divisions and they must agree (a consistency check, not a source) */
    const now = M.US_LEAGUE_SHAPES.find(x => x.sport === 'nfl' && x.era === 'now');
    const differ = (now?.shape.divisions ?? []).filter(dv => JSON.stringify([...dv.teams].sort()) !== JSON.stringify(M.FO_TEAMS.filter(t => t.division === dv.name).map(t => t.abbr).sort())).map(dv => dv.name);
    check('5', !!now && now.shape.divisions.length === 8 && differ.length === 0, `nfl the ledger's eight divisions equal the Front Office table division by division${differ.length ? ` (differ: ${differ.join(', ')})` : ''}`);
  }
  tally('5', `${slug} a throwback season never names an opponent`, derived.filter(r => r.named && r.eraId !== 'now').map(r => `${r.year} ${r.eraId}`), derived.filter(r => r.eraId !== 'now').length);

  /* 6 (per sport part) */
  tally('6', `${slug} deriving twice, from a JSON round trip, gives the same season, path and totals`, derived.filter(r => r.p6.length).map(r => `${r.year}: ${r.p6[0]}`), derived.length);

  /* 7 */
  const noRepair = derived.filter(r => r.repairs === 0).length;
  console.log(`     repairs: none in ${share(noRepair, derived.length)}, median ${median(derived.map(r => r.repairs))}, p90 ${pct(derived.map(r => r.repairs), 0.9)}; attempts after the first in ${share(derived.filter(r => r.attempt > 0).length, derived.length)}`);
  for (const ss of SEEDSETS) {
    const dd = derived.filter(r => r.seedset === ss);
    console.log(`       seed set ${ss}: ${dd.length} derived, no repair ${share(dd.filter(r => r.repairs === 0).length, dd.length)}, refused ${share(open.filter(r => r.seedset === ss && !r.derived).length, open.filter(r => r.seedset === ss).length)}`);
  }
  check('7', noRepair >= derived.length * (NO_REPAIR_MIN[slug] ?? 1), `${slug} at least ${(100 * (NO_REPAIR_MIN[slug] ?? 1)).toFixed(0)}% of seasons need no repair (${share(noRepair, derived.length)})`);
  [o.missed, ...o.results].forEach((t, i) => {
    const w = derived.filter(r => r.teamResult === t).map(r => r.wins);
    const [lo, hi] = o.bands[i];
    const q1 = lo + (hi - lo) * 0.25; const q3 = lo + (hi - lo) * 0.75;
    const med = median(w);
    console.log(`     wins for "${t}": n ${w.length}, median ${med}, p10 ${pct(w, 0.1)}, p90 ${pct(w, 0.9)} (band ${lo} to ${hi}, middle half ${q1} to ${q3})`);
    /* Round 1103, the lead's ruling pass: the NBA's medians are judged on the five seed sets pooled, which is
       how the header measured them. One seed set alone holds 19 to 34 "Lost the NBA Finals" seasons, and over
       twenty runs of one set (seed sets 0 to 14 on this round's tree, 0 to 4 on Release AP's) that median ran
       53 to 57 against a middle half that starts at 53.5: under it once (seed set 0 here, 53), half a win over
       it twice (54 and 54 on Release AP's), on trees whose pooled median was 56 every time. At that size the
       check was a coin toss and said nothing about strengthFor. The NFL keeps its own rule (its header measured
       a set at a time). */
    const pooledEnough = slug !== 'nba' || SEEDSETS.length >= 5;
    if (w.length >= 20 && pooledEnough) check('7', med >= q1 && med <= q3, `${slug} the median record for "${t}" sits in the middle half of its band`);
    else console.log(`     (not asserted: ${w.length >= 20 ? `${SEEDSETS.length} seed set${SEEDSETS.length === 1 ? '' : 's'} of the five this median is judged on` : `${w.length} seasons is too few for a median`})`);
  });
  for (const era of d.eras) {
    const p = points[`${slug}|${era}`];
    if (!p) continue;
    const m = p.sum / p.n;
    console.log(`     points a team game, era ${era}: ${m.toFixed(2)} over ${p.n / 2} games${slug === 'nba' ? ` (league mean ${M.NBA_SCORING[era]})` : ''}`);
    if (slug === 'nba') check('7', Math.abs(m - M.NBA_SCORING[era]) <= NBA_POINTS_TOL, `nba points a team game in era ${era} within ${NBA_POINTS_TOL} of the league mean (${m.toFixed(2)} against ${M.NBA_SCORING[era]})`);
    if (slug === 'nfl') check('7', m >= NFL_POINTS[0] && m <= NFL_POINTS[1], `nfl points a team game in era ${era} inside ${NFL_POINTS[0]} to ${NFL_POINTS[1]} (${m.toFixed(2)})`);
  }
  if (slug === 'nfl') {
    const lv = nflSeen.level / Math.max(1, nflSeen.games);
    const odd = nflSeen.oddTds / Math.max(1, nflSeen.tds);
    const big = ((nflSeen.makes[5] ?? 0) + (nflSeen.makes[6] ?? 0)) / Math.max(1, nflSeen.kickerGames);
    console.log(`     level games: ${nflSeen.level} of ${nflSeen.games} (${share(nflSeen.level, nflSeen.games)}); touchdowns not worth seven: ${share(nflSeen.oddTds, nflSeen.tds)} of ${nflSeen.tds}; safeties ${nflSeen.safeties}`);
    console.log(`     his touchdowns are his team's whole score in ${share(nflSeen.floorSet, nflSeen.played)} of the ${nflSeen.played} games he played`);
    console.log(`     a kicker's makes a game (0 to 6): ${Array.from({ length: 7 }, (_, f) => `${f}: ${share(nflSeen.makes[f] ?? 0, nflSeen.kickerGames)}`).join(', ')} over ${nflSeen.kickerGames} games`);
    console.log(`     a side on 40 or more: ${share(nflSeen.forty, 2 * nflSeen.games)} of team games; on 49 or more: ${share(nflSeen.fortyNine, 2 * nflSeen.games)}; shut out: ${share(nflSeen.shutOut, 2 * nflSeen.games)}`);
    const tdMean = nflSeen.byTd.map(x => (x.n ? x.sum / x.n : NaN));
    console.log(`     his team's points a game by his touchdowns that day: none ${tdMean[0].toFixed(1)} (${nflSeen.byTd[0].n} games), one ${tdMean[1].toFixed(1)} (${nflSeen.byTd[1].n}), two ${tdMean[2].toFixed(1)} (${nflSeen.byTd[2].n}), three or more ${tdMean[3].toFixed(1)} (${nflSeen.byTd[3].n})`);
    check('7', nflSeen.byTd[0].n > 300 && nflSeen.byTd[2].n > 100 && tdMean[2] - tdMean[0] >= NFL_TD_DAY_MIN, `nfl his two touchdown days are at least ${NFL_TD_DAY_MIN} points a game better for his team than his blank days (${(tdMean[2] - tdMean[0]).toFixed(1)})`);
    check('7', nflSeen.games > 1000 && nflSeen.forty <= 2 * nflSeen.games * NFL_FORTY_MAX, `nfl a side scores 40 or more in under ${(100 * NFL_FORTY_MAX).toFixed(0)}% of team games (${share(nflSeen.forty, 2 * nflSeen.games)})`);
    check('7', nflSeen.games > 1000 && lv <= NFL_LEVEL_MAX, `nfl level games stay under ${(100 * NFL_LEVEL_MAX).toFixed(1)}% (${(100 * lv).toFixed(2)}%)`);
    check('7', nflSeen.tds > 1000 && odd <= NFL_ODD_TD_MAX, `nfl touchdowns not worth seven stay under ${(100 * NFL_ODD_TD_MAX).toFixed(0)}% (${share(nflSeen.oddTds, nflSeen.tds)})`);
    check('7', nflSeen.kickerGames > 100 && big <= NFL_BIG_KICK_MAX, `nfl a kicker makes five or six in under ${(100 * NFL_BIG_KICK_MAX).toFixed(0)}% of his games (${(100 * big).toFixed(1)}% of ${nflSeen.kickerGames})`);
    /* the fix pass: his own line, the feed's minutes and the order of the games */
    const pc = (n, dd, dp = 2) => (dd ? `${((100 * n) / dd).toFixed(dp)}%` : 'n/a');
    const spreadMid = median(nflSeen.spreads);
    console.log(`     his headline number in a full season (${NFL_FULL} or more games; ${nflSeen.spreads.length} seasons, ${nflSeen.lineGames} games): a laid number on its per game cap in ${pc(nflSeen.lineCap, nflSeen.lineGames)}; more than twice his season's average in ${pc(nflSeen.lineDouble, nflSeen.lineGames)}`);
    console.log(`     its spread game to game (standard deviation over his average): the middle season ${spreadMid.toFixed(3)}, p10 ${pct(nflSeen.spreads, 0.1).toFixed(3)}, p90 ${pct(nflSeen.spreads, 0.9).toFixed(3)}; by number: ${Object.entries(nflSeen.spreadBy).map(([k, xs]) => `${k} ${median(xs).toFixed(3)} (${xs.length})`).join(', ')}`);
    check('7', nflSeen.lineGames > 1000 && nflSeen.lineCap <= nflSeen.lineGames * NFL_LINE_CAP_MAX, `nfl his yards, catches and tackles sit on a per game cap in under ${(100 * NFL_LINE_CAP_MAX).toFixed(1)}% of a full season's games (${pc(nflSeen.lineCap, nflSeen.lineGames)})`);
    check('7', nflSeen.lineGames > 1000 && nflSeen.lineDouble <= nflSeen.lineGames * NFL_LINE_DOUBLE_MAX, `nfl his headline number is more than twice his season's average in under ${(100 * NFL_LINE_DOUBLE_MAX).toFixed(1)}% of those games (${pc(nflSeen.lineDouble, nflSeen.lineGames)})`);
    check('7', nflSeen.spreads.length >= 100 && spreadMid >= NFL_LINE_SPREAD[0] && spreadMid <= NFL_LINE_SPREAD[1], `nfl the middle full season's game to game spread sits inside ${NFL_LINE_SPREAD[0]} to ${NFL_LINE_SPREAD[1]} (${spreadMid.toFixed(3)}): his games differ and none runs away`);
    const scatter = nflSeen.tdSq / Math.max(1e-9, nflSeen.tdDf);
    console.log(`     a quarterback's touchdown passes in a full season (${nflSeen.tdGames} games): scatter over a plain count ${scatter.toFixed(3)}; on the cap of six in ${pc(nflSeen.tdCap, nflSeen.tdGames)} of them`);
    if (nflSeen.tdGames >= NFL_TD_SCATTER_MIN_GAMES) check('7', scatter <= NFL_TD_SCATTER_MAX, `nfl a quarterback's touchdown passes scatter no more than ${NFL_TD_SCATTER_MAX} times a plain count (${scatter.toFixed(3)} over ${nflSeen.tdGames} games)`);
    else console.log(`     (not asserted: ${nflSeen.tdGames} games is too few for the scatter, it needs ${NFL_TD_SCATTER_MIN_GAMES}; run the five seed sets)`);
    console.log(`     the feed: one side's scoring drives one after another under three minutes apart in ${pc(nflSeen.closeDrives, nflSeen.drivePairs)} of ${nflSeen.drivePairs} pairs; two lines in back to back minutes in ${pc(nflSeen.nextMinute, nflSeen.linePairs)} of ${nflSeen.linePairs}`);
    check('7', nflSeen.drivePairs > 1000 && nflSeen.closeDrives <= nflSeen.drivePairs * NFL_CLOSE_DRIVES_MAX, `nfl a side's scoring drives one after another are under three minutes apart in under ${(100 * NFL_CLOSE_DRIVES_MAX).toFixed(1)}% of pairs (${pc(nflSeen.closeDrives, nflSeen.drivePairs)})`);
    check('7', nflSeen.seasons > 100 && nflSeen.oddOrder <= nflSeen.seasons * NFL_ODD_ORDER_MAX, `nfl the order of the games reads oddly (a rival twice running, four straight at home or away) in under ${(100 * NFL_ODD_ORDER_MAX).toFixed(0)}% of seasons (${pc(nflSeen.oddOrder, nflSeen.seasons)} of ${nflSeen.seasons})`);
  }
  if (slug === 'nba') {
    const p99 = pct(shares.nba, 0.99);
    console.log(`     his share of his team's points: median ${median(shares.nba).toFixed(3)}, p99 ${p99.toFixed(3)} over ${shares.nba.length} games`);
    check('7', p99 <= NBA_SHARE_P99_MAX, `nba his share of his team's points at the 99th percentile stays under ${NBA_SHARE_P99_MAX} (${p99.toFixed(3)})`);
  }
}

/* 6: nothing moves */
console.log('\n===== 6: nothing moves =====');
check('6', trapA.count === 0 && trapB.count === 0, `Math.random is never drawn while a season is derived (trap ${trapB.count})`);
let moved = 0; let seasons = 0;
runA.forEach((a, i) => { const b = runB[i]; seasons += a.length; if (a.length !== b.length) moved += 1; else a.forEach((h, k) => { if (h !== b[k]) moved += 1; }); });
check('6', moved === 0 && seasons > 0, `every career saved the same bytes with and without the viewer (${seasons} season hashes, ${moved} differ)`);

/* ─── 8: lazy by source ─── */
console.log('\n===== 8: lazy by source =====');
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');
/** Static imports and re exports only: `import type` is erased and import() loads on demand. */
function staticImports(code) {
  const out = [];
  const re = /(?:^|[\n;])\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
  for (const m of code.matchAll(re)) if (!m[1]) out.push(m[2]);
  return out;
}
const EXTS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
function resolveSpec(spec, from) {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const e of EXTS) {
    const p = base + e;
    if (/\.(tsx?|mjs|js)$/.test(p) && existsSync(path.join(ROOT, p))) return p;
  }
  return base;
}
function staticClosure(roots, overrides = {}) {
  const seenFiles = new Set();
  const queue = [...roots];
  while (queue.length) {
    const f = queue.pop();
    if (seenFiles.has(f)) continue;
    seenFiles.add(f);
    const full = path.join(ROOT, f);
    if (!(f in overrides) && !existsSync(full)) continue;
    if (!/\.(tsx?|mjs|js)$/.test(f)) continue;
    const code = stripComments(f in overrides ? overrides[f] : readFileSync(full, 'utf8').replace(/\r\n/g, '\n'));
    for (const spec of staticImports(code)) { const r = resolveSpec(spec, f); if (r) queue.push(r); }
  }
  return seenFiles;
}
const LAZY_ONLY = f => f.startsWith('src/lib/season/') || f.startsWith('src/components/season-centre/')
  || f.startsWith('src/components/us-career/season/UsSeasonCentre') && !/UsSeasonCentre(Entry|Host)/.test(f)
  || f.startsWith('src/data/usLeagueShape');
const ROUTE_ROOTS = [
  'src/components/us-career/UsCareerBoard.tsx',
  'src/components/nba-my-career/NbaMyCareerBoard.tsx', 'src/components/nfl-my-career/NflMyCareerBoard.tsx',
  'src/lib/nbaCareerSport.ts', 'src/lib/nflCareerSport.ts',
];
const HOST = 'src/components/us-career/season/UsSeasonCentreHost.tsx';
const PLANT_IN = existsSync(path.join(ROOT, HOST)) ? HOST : ROUTE_ROOTS[1];
const PLANT = "import UsSeasonCentre from '@/components/us-career/season/UsSeasonCentre';\n";
const plantSrc = norm(readFileSync(path.join(ROOT, PLANT_IN), 'utf8'));
const closureNow = staticClosure(ROUTE_ROOTS, CONTROL === 'static' ? { [PLANT_IN]: PLANT + plantSrc } : {});
const leaked = [...closureNow].filter(LAZY_ONLY);
check('8', closureNow.size > 100, `the static closure of the two routes was walked (${closureNow.size} files)`);
check('8', closureNow.has(PLANT_IN), `the walk reaches ${PLANT_IN}`);
tally('8', 'no eager file of the two routes statically imports the season modules, the viewer or the league shape', leaked, closureNow.size);
/* the fence can fail, and reads the code, not the comments (always on) */
const planted = [...staticClosure(ROUTE_ROOTS, { [PLANT_IN]: PLANT + plantSrc })].filter(LAZY_ONLY);
const inComment = [...staticClosure(ROUTE_ROOTS, { [PLANT_IN]: `/* ${PLANT.trim()} */\n// ${PLANT.trim()}\n${plantSrc}` })].filter(LAZY_ONLY);
check('8', planted.length > leaked.length || CONTROL === 'static', `a planted static import of the viewer in ${path.basename(PLANT_IN)} is named (${planted.length} files)`);
check('8', inComment.length === (CONTROL === 'static' ? 0 : leaked.length), 'the same text in a comment is spared');
for (const f of ['src/lib/season/us.ts', ...SPORTS.map(s => SPORT_DEFS[s].numberFile)]) {
  const code = stripComments(norm(readFileSync(path.join(ROOT, f), 'utf8')));
  check('8', !/Math\.random/.test(code) && !/new Rng\(/.test(code), `${f} holds no Math.random and no new Rng(`);
}

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
console.log('');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const red = [...failsBy.keys()].sort();
  const labels = failsBy.get(String(c.section)) ?? [];
  let ok = labels.length > 0;
  let note = '';
  /* Round 1103: the engine back on 82 must fail the games windows and nothing else. */
  if (CONTROL === 'short82') ok = ok && labels.some(l => l.includes("nba games played sit in the engine's ranges")) && red.length === 1;
  if (CONTROL === 'stage' || CONTROL === 'nflstage') {
    /* the season with the unknown string derives with no band and no path, and section 4 has nothing to say about it */
    const sl = CONTROL_SPORT[CONTROL];
    const unk = seen.filter(r => r.slug === sl && r.derived && r.teamResult !== OWN[sl].missed && !OWN[sl].results.includes(r.teamResult));
    const clean = unk.filter(r => !r.path && r.p4.length === 0 && !r.p3.some(p => p.includes('band')));
    ok = ok && unk.length > 0 && clean.length === unk.length;
    note = `; ${unk.length} seasons carry the unknown result, ${clean.length} of them shown with no band and no path`;
  }
  if (CONTROL === 'names') ok = ok && labels.some(l => l.includes('never names an opponent')) && labels.some(l => l.includes("every name is the game's own"));
  if (CONTROL === 'window') { ok = ok && labels.some(l => l.includes("are exactly the game's list")) && !labels.some(l => l.includes('never names an opponent')); note = '; the binding still named no throwback opponent'; }
  if (CONTROL === 'formula' || CONTROL === 'nflformula') {
    const sl = CONTROL_SPORT[CONTROL];
    const wrong = seen.filter(r => r.slug === sl && r.p5.some(p => p.includes('division rival'))).length;
    ok = ok && labels.some(l => l.startsWith(sl) && l.includes('follows the formula')) && wrong > 0;
    note = `; ${wrong} ${sl} seasons meet a division rival off the formula`;
  }
  if (CONTROL === 'days') ok = ok && labels.some(l => l.includes('two touchdown days'));
  /* the fix pass's controls each name one check by a piece of its label, on the NFL */
  if (c.label) {
    ok = ok && labels.some(l => l.startsWith('nfl') && l.includes(c.label));
    note = `; its named check "${c.label}" ${ok ? 'is' : 'is NOT'} among the reds`;
    if (CONTROL === 'poscore') {
      const wrong = seen.filter(r => r.p4.some(p => p.includes('prints a score'))).length;
      ok = ok && wrong > 0;
      note += `; ${wrong} seasons print a playoff score the save does not hold`;
    }
  }
  if (CONTROL === 'sum') {
    const wrong = seen.filter(r => r.p3.some(p => p.startsWith('recYds '))).length;
    ok = ok && labels.some(l => l.startsWith('nfl') && l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} seasons show receiving yards that are not the saved total`;
  }
  if (CONTROL === 'kick') {
    const wrong = seen.filter(r => r.p3.some(p => p.includes('his team kicks'))).length;
    ok = ok && labels.some(l => l.startsWith('nfl') && l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} kicker seasons show a team field goal count that is not his makes`;
  }
  if (CONTROL === 'record') ok = ok && labels.some(l => l.includes('independent checker'));
  if (CONTROL === 'conf') {
    const wrong = seen.filter(r => r.p4.some(p => p.includes('conference'))).length;
    ok = ok && labels.some(l => l.includes("bracket's conferences")) && wrong > 0;
    note = `; ${wrong} seasons send a round to the wrong conference`;
  }
  if (CONTROL === 'hot') {
    const wrong = seen.filter(r => r.p3.some(p => p.includes('takeover'))).length;
    ok = ok && labels.some(l => l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} seasons print a takeover line the rule does not earn`;
  }
  console.log(ok
    ? `control ${CONTROL}: RED AT THE NAMED CHECK (section ${c.section}); sections red: ${red.join(', ')}${note}`
    : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (section ${c.section}); sections red: ${red.join(', ') || 'none'}${note}`);
  console.log(`simUsSeasonCentre: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(ok ? 1 : 2);
}
console.log(`simUsSeasonCentre: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
