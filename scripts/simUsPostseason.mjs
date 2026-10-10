/**
 * Round 1300: a US career's playoff run, laid out game by game, is the run the save holds.
 *
 * src/lib/season/usPlayoffs.ts derives every playoff game of a saved season from the playoff line the career
 * already wrote (the games count, his playoff numbers, the team result) and stores nothing. This harness plays
 * the fleet of scripts/simUsSeasonCentre.mjs (the same loop, scripts/lib/usSeasonFleet.mjs: CAREERS seeded
 * careers a seed set, both eras, every position, plus the TARGETED careers that start late, counted apart) and
 * holds what the deriver lays out against the save. A player sees none of it yet: the stage is a later round's.
 * THE NBA ONLY in this round. An NFL season saves its postseason as a sentence, so the deriver refuses every
 * one of them (src/test/usPlayoffs.test.ts holds that); the NFL joins here when its engine saves numbers.
 *
 * Sections:
 *  D  the format data (src/data/usPostseasonFormat.ts), read from the bundled module
 *  S  the sum rule, by an INDEPENDENT checker: it never calls usPostProblems, the core's `disagreements` or a
 *     bind's `check`, it reads the saved row and the derived games, and its tables (OWN) are typed here
 *  C  it fails closed: a row with no games count, a count that does not fit, no playoff number, a season the
 *     format file does not hold, and a missed postseason all give null, and the list is what it was
 *  F  measured: the tries, the repairs, one point games beside the same careers' regular season, his lowest
 *     game. One hard bar (the repaired share); the rest is the table the lead sets bars from
 *  K  coverage, a FAIL when short
 *  X  determinism: twice, from a JSON round trip, and not one call to Math.random
 *
 * ACCEPTANCE, WRITTEN BEFORE ANYTHING WAS MEASURED (the critic's correction 7 of this round's brief). A repair
 * of the core turns a result by making it a one point game, so a layout rule that repairs a lot fills the
 * playoffs with one point games. The rule here takes the least repaired of PO_TRIES tries. The acceptance: the
 * share of one point playoff games sits inside the spread, over the five seed sets, of the same careers'
 * regular season share. It is printed with every number behind it as a line that starts "ACCEPTANCE". Outside
 * the spread it is a FINDING for the lead, counted in the closing line, and never a reason to widen anything
 * here. It is not a pass or fail gate, for a reason that is arithmetic and not a wish: a pooled share of about
 * 27,000 playoff games moves by more from one fleet to the next than the five regular season shares (each on
 * about 74,000 games) differ from each other, so "inside their spread" is close to a coin toss on healthy
 * code at any fleet size. The gate is the DIRECT measure of the defect instead: the share of playoff games the
 * core had to repair (see MEASURED).
 *
 * Controls (US_POST_CONTROL=), each patches exact strings as the code is bundled (refusing to run when a string
 * is not there exactly once) and must turn its NAMED section red; a control run always exits 1 when it fired at
 * the named check and 2 when it did not:
 *   onesrc   one fact of a format row cut to a single publisher             -> section D
 *   sum      one playoff game is handed one point too many, the module's
 *            own agreement lists off                                         -> section S
 *   drop     one game left out of the run, the module's own lists off        -> section S
 *   clinch   the clincher is played first, so a series goes on after it is
 *            decided or its winner loses its last game; the lists off        -> section S
 *   allhome  every playoff game dealt with his side first                    -> section S
 *   open     the null for a line with no playoff number removed              -> section C
 *   tries    PO_TRIES set to 1 (the first try stands, as before the fewest
 *            repairs rule)                                                   -> section F
 *   thin     only the first two careers of a seed set are observed
 *            (patches nothing)                                               -> section K
 *   stream   one Math.random inside the deriver                              -> section X
 * NOT HERE, on purpose: `level` (no NBA game can be level, so removing the deriver's own "no level game" item
 * changes nothing on an NBA fleet; it is an NFL control and waits for the NFL's numbers) and `lay` (the lay's
 * own control lives with the digest mode of scripts/simUsSeasonCentre.mjs: US_SEASON_DIGEST_RECEIPT=lay).
 *
 * Measurement variants (never a control: the checks run and are reported as they fall):
 *   US_POST_VARIANT=noclamp   his side's strength is his real share of the run's games, not pulled toward even
 *   US_POST_VARIANT=form25, form50, form100   how much of the core's game to game form a held total follows
 *                             (0 as shipped): for the line about his lowest game
 *   US_POST_TRIES=<n>         PO_TRIES set to n, for the table of repairs by tries
 *
 * MEASURED: see the block above the bars in section F.
 *
 * Green is the closing "simUsPostseason: ... 0 failed" line AND exit 0. Nothing here reaches the network.
 */
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { usSeasonFleet } from './lib/usSeasonFleet.mjs';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const CAREERS = Number(process.env.CAREERS ?? 40);
const SEEDSETS = (process.env.SEEDSET ?? '0,1,2,3,4').split(',').map(Number);
const CONTROL = process.env.US_POST_CONTROL ?? '';
const VARIANT = process.env.US_POST_VARIANT ?? '';
const TRIES = process.env.US_POST_TRIES ? Number(process.env.US_POST_TRIES) : null;

/* ─── Controls and variants: exact strings, patched in the bundle only ─── */
const PO = 'src/lib/season/usPlayoffs.ts';
const DATA = 'src/data/usPostseasonFormat.ts';
const LISTS_OFF = { file: PO, from: '    const bad = [...disagreements(sport, poRow, poCtx, placed.season), ...usPostProblems(p, lay, row, held)];', to: '    const bad: string[] = [];' };
const PLACED = '  return { season: { ...s, teams: labels.length, labels, games, rounds, clinch: null }, series, at };';
const CONTROLS = {
  onesrc: { section: 'D', patches: [{ file: DATA, from: "      before: ['nbaPlayIn', 'cbsPlayIn', 'siNbaTeams'],", to: "      before: ['nbaPlayIn']," }] },
  sum: { section: 'S', patches: [LISTS_OFF, { file: PO, from: PLACED, to: `  games[0] = { ...games[0], line: { ...games[0].line, pts: (games[0].line.pts ?? 0) + 1 } };\n${PLACED}` }] },
  drop: { section: 'S', patches: [LISTS_OFF, { file: PO, from: PLACED, to: `  games.pop();\n${PLACED}` }] },
  clinch: { section: 'S', patches: [LISTS_OFF, { file: PO, from: '  return [...shuffled(early, rng), won];', to: '  return [won, ...shuffled(early, rng)];' }] },
  allhome: { section: 'S', patches: [{ file: PO, from: '[i % 2 === 0 ? [0, 1] : [1, 0]]', to: '[[0, 1]]' }] },
  open: { section: 'C', patches: [{ file: PO, from: '  return any ? out : null;', to: '  return out;' }] },
  tries: { section: 'F', patches: [{ file: PO, from: 'export const PO_TRIES = 12;', to: 'export const PO_TRIES = 1;' }] },
  thin: { section: 'K', patches: [] },
  stream: { section: 'X', patches: [{ file: PO, from: "  if (!lay) return 'lay';", to: "  Math.random();\n  if (!lay) return 'lay';" }] },
};
const FORM = 'const PO_MEAN_FORM = 0;';
const VARIANTS = {
  noclamp: [{ file: PO, from: '  const share = Math.min(PO_SHARE_MAX, Math.max(PO_SHARE_MIN, W / G));', to: '  const share = W / G;' }],
  form25: [{ file: PO, from: FORM, to: 'const PO_MEAN_FORM = 0.25;' }],
  form50: [{ file: PO, from: FORM, to: 'const PO_MEAN_FORM = 0.5;' }],
  form100: [{ file: PO, from: FORM, to: 'const PO_MEAN_FORM = 1;' }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_POST_CONTROL ${CONTROL}`); process.exit(2); }
if (VARIANT && !VARIANTS[VARIANT]) { console.error(`unknown US_POST_VARIANT ${VARIANT}`); process.exit(2); }
if (TRIES !== null && !(Number.isInteger(TRIES) && TRIES >= 1 && TRIES <= 60)) { console.error('US_POST_TRIES wants a whole number from 1 to 60'); process.exit(2); }
if (CONTROL && (VARIANT || TRIES !== null)) { console.error('a control runs alone: no variant and no US_POST_TRIES with it, refusing to run'); process.exit(2); }
const PATCHES = [
  ...(CONTROL ? CONTROLS[CONTROL].patches : []),
  ...(VARIANT ? VARIANTS[VARIANT] : []),
  ...(TRIES !== null ? [{ file: PO, from: 'export const PO_TRIES = 12;', to: `export const PO_TRIES = ${TRIES};` }] : []),
];

const norm = s => s.replace(/\r\n/g, '\n');
const fired = new Set();
const patchPlugin = {
  name: 'us-postseason-patches',
  setup(b) {
    if (PATCHES.length === 0) return;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      const mine = PATCHES.filter(p => p.file === rel);
      if (mine.length === 0) return undefined;
      let src = norm(readFileSync(args.path, 'utf8'));
      for (const p of mine) {
        if (src.split(p.from).length !== 2) throw new Error(`patch: its string is not exactly once in ${p.file}, refusing to run: ${p.from.slice(0, 70)}`);
        src = src.replace(p.from, () => p.to);
        fired.add(p);
      }
      return { contents: src, loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
    });
  },
};

/* ─── The bundle: the NBA's real binding, the season modules, the deriver, the format data ─── */
const SPORT_DEFS = {
  nba: { binding: 'NBA_CAREER_SPORT', bindName: 'NBA_SEASON', positions: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now', 'y2004'], targetedFrom: { era: 'y2004', year: 2016 } },
};
const SPORTS = ['nba'];
const tag = CONTROL || VARIANT || (TRIES !== null ? `tries${TRIES}` : 'base');
const OUT = path.join(os.tmpdir(), `us-postseason-${tag}-${process.pid}.mjs`);
const entry = [
  "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
  "export { NBA_SEASON } from './src/lib/season/nba.ts';",
  "export { buildUsSeason, usPlayoffPath, usPlayoffLay } from './src/lib/season/us.ts';",
  "export { deriveSeasonOrWhy } from './src/lib/season/core.ts';",
  "export { usPostseasonOrWhy, PO_TRIES } from './src/lib/season/usPlayoffs.ts';",
  "export { US_POSTSEASON, US_POSTSEASON_SOURCES, US_POSTSEASON_THIN, usPostseasonFormat, usPostseasonRounds } from './src/data/usPostseasonFormat.ts';",
  "export { US_PLAYOFF_FORMAT } from './src/data/usLeagueShape.ts';",
  "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
].join('\n');
const t0 = Date.now();
await build({
  stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: ROOT,
  logLevel: 'error', alias: { '@': './src' }, plugins: [patchPlugin], jsx: 'automatic',
  banner: { js: "import { createRequire as __usRequire } from 'node:module'; const require = __usRequire(import.meta.url);" },
});
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };
const M = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* the temp file is only a copy */ }
if (fired.size !== PATCHES.length) { console.error(`${fired.size} of ${PATCHES.length} patches reached their file, refusing to report`); process.exit(2); }
console.log(`bundled in ${Date.now() - t0} ms; sports ${SPORTS.join(', ')}; ${CAREERS} careers a seed set; seed sets ${SEEDSETS.join(', ')}; PO_TRIES ${M.PO_TRIES}${CONTROL ? `; CONTROL ${CONTROL}` : ''}${VARIANT ? `; VARIANT ${VARIANT}` : ''}${TRIES !== null ? `; VARIANT tries ${TRIES}` : ''}`);

/* ─── Failure bookkeeping, by section ─── */
let checks = 0;
let findings = 0;
const failsBy = new Map();
const fail = (section, msg) => { if (!failsBy.has(section)) failsBy.set(section, []); failsBy.get(section).push(msg); };
const check = (section, ok, label) => { checks += 1; if (ok) console.log(`ok   ${section} ${label}`); else { console.log(`FAIL ${section} ${label}`); fail(section, label); } };
/** Many items under one label: counts them, prints the first three. */
const tally = (section, label, bad, total) => {
  checks += 1;
  if (bad.length === 0 && total > 0) console.log(`ok   ${section} ${label} (${total} checked)`);
  else if (total === 0) { console.log(`FAIL ${section} ${label}: nothing was checked`); fail(section, label); }
  else { console.log(`FAIL ${section} ${label}: ${bad.length} of ${total}; ${bad.slice(0, 3).join(' || ')}`); fail(section, label); }
};
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(2)}%` : 'n/a');

/* ─── The harness's OWN tables (never the module's) ─── */
const OWN = {
  nba: {
    missed: 'Missed the playoffs',
    results: ['Lost in the first round', 'Lost in the conference semis', 'Lost the Conference Finals', 'Lost the NBA Finals', 'WON THE NBA FINALS'],
    rounds: ['First round', 'Conference semifinals', 'Conference finals', 'NBA Finals'],
    need: 4, most: 7,
    /* his line's key in a game, and the field the save holds its playoff mean under */
    means: [['pts', 'poPpg'], ['reb', 'poRpg'], ['ast', 'poApg']],
    quarters: 8,
  },
};
/** The whole total a saved mean to one decimal is held to over `games` games, worked in tenths. Typed here on
 *  its own: the module has its own copy of the same line and the two must never share one. */
const wholeOf = (mean, games) => Math.round((Math.round(mean * 10) * games) / 10);

/** Section S: every item recomputed from the saved row and the laid out games. `path` is the list the
 *  review prints today (usPlayoffPath), which the games must tell again round by round. */
function sumRule(slug, row, p, path) {
  const own = OWN[slug];
  const out = [];
  const games = p.season.games;
  const G = games.length;
  /* 1: the games shown are the saved count, and he plays every one */
  if (!isNum(row.poGames) || G !== row.poGames) out.push(`games ${G} != ${row.poGames}`);
  if (games.some(g => !g.played)) out.push('a playoff game he does not play');
  if (p.season.bucket && p.season.bucket.apps !== 0) out.push('playoff games kept out of sight in the bucket');
  /* 2: a saved mean to one decimal is held as the whole total nearest to mean times games */
  for (const [key, field] of own.means) {
    if (!isNum(row[field])) { if (games.some(g => g.line[key] !== undefined)) out.push(`${key} on his line and not on the save`); continue; }
    const want = wholeOf(row[field], G);
    const got = games.reduce((a, g) => a + (g.line[key] ?? 0), 0);
    if (got !== want) out.push(`${key} ${got} != ${want} (${row[field]} a game over ${G})`);
    if (games.some(g => !Number.isInteger(g.line[key]) || g.line[key] < 0)) out.push(`${key} is not a whole number in a game`);
  }
  games.forEach((g, i) => {
    if (g.md !== i + 1) out.push(`game ${i + 1} is numbered ${g.md}`);
    /* 4: no game is level */
    if (g.us === g.them) out.push(`game ${i + 1}: level`);
    /* 3: his line never puts more on the board than his team scored */
    if ((g.line.pts ?? 0) >= g.us) out.push(`game ${i + 1}: his ${g.line.pts} against his team's ${g.us}`);
    /* the board by quarter makes each side's score */
    const q = g.events.filter(e => e.kind === 'quarter');
    const side = w => q.filter(e => e.side === w).reduce((a, e) => a + (e.pts ?? 0), 0);
    if (q.length !== own.quarters || side('us') !== g.us || side('them') !== g.them) out.push(`game ${i + 1}: the quarters do not make ${g.us}-${g.them}`);
  });
  /* 4 and 5: the series, from this file's own reading of the result */
  const depth = own.results.indexOf(row.teamResult);
  const n = Math.min(own.rounds.length, depth + 1);
  const champion = depth === own.results.length - 1;
  if (p.champion !== champion) out.push('the champion flag is not the result on the save');
  if (p.series.length !== n) out.push(`${p.series.length} series for a run of ${n} rounds`);
  if (!path || path.steps.length !== n) out.push('the list has another number of rounds');
  if (p.at.length !== G) out.push('the counts are not one a game');
  let at = 0;
  for (let r = 0; r < n && r < p.series.length; r += 1) {
    const sr = p.series[r];
    const winner = r < n - 1 || champion;
    if (sr.from !== at + 1) out.push(`series ${r + 1} starts at game ${sr.from}, not ${at + 1}`);
    const mineOf = games.slice(sr.from - 1, sr.to);
    if (mineOf.length < own.need || mineOf.length > own.most) out.push(`series ${r + 1}: ${mineOf.length} games`);
    if (mineOf.some(g => g.opp !== r + 1)) out.push(`series ${r + 1}: a game against another opponent`);
    let mine = 0; let theirs = 0; let early = false;
    mineOf.forEach((g, k) => {
      if (mine >= own.need || theirs >= own.need) early = true;
      if (g.us > g.them) mine += 1; else if (g.us < g.them) theirs += 1;
      const a = p.at[sr.from - 1 + k];
      const over = mine === own.need ? 'won' : theirs === own.need ? 'lost' : null;
      if (!a || a.series !== r || a.no !== k + 1 || a.mine !== mine || a.theirs !== theirs || a.over !== over) out.push(`game ${sr.from + k}: the count after it is not ${mine}-${theirs}`);
    });
    if (early) out.push(`series ${r + 1} goes on after one side has ${own.need} wins`);
    if ((winner ? mine : theirs) !== own.need) out.push(`series ${r + 1}: the side that takes it has ${winner ? mine : theirs} wins`);
    const last = mineOf[mineOf.length - 1];
    if (last && (last.us > last.them) !== winner) out.push(`series ${r + 1}: the side that takes it loses its last game`);
    if (sr.won !== winner || sr.need !== own.need || sr.most !== own.most || sr.round !== own.rounds[r]) out.push(`series ${r + 1}: its own row is wrong`);
    /* the list's row for that round, told again by the games: the same opponent, the same result, the same score */
    const step = path?.steps[r];
    if (step) {
      const score = `${mine}-${theirs}`;
      if (step.round !== own.rounds[r] || step.won !== winner || step.score !== score) out.push(`series ${r + 1}: the games say ${winner ? 'won' : 'lost'} ${score}, the list says ${step.won ? 'won' : 'lost'} ${step.score}`);
      if (step.opp !== sr.opp || p.season.labels[r + 1]?.name !== step.opp) out.push(`series ${r + 1}: the opponent is not the list's`);
    }
    at = sr.to;
  }
  if (at !== G) out.push('the series do not cover every game');
  /* 5: the result the games tell is the saved one */
  const lastGame = games[G - 1];
  if (lastGame && (lastGame.us > lastGame.them) !== champion) out.push(`the run ends on a ${lastGame.us > lastGame.them ? 'win' : 'loss'} and the save says "${row.teamResult}"`);
  return out;
}

/** Section D: the format rows as the bundle holds them. */
function dataProblems() {
  const out = [];
  const SRC = M.US_POSTSEASON_SOURCES;
  const states = (w, fact) => (fact === 'before' ? w.before !== null : fact === 'modified' ? w.modified.length > 0 : fact === 'lastRoundOnlyCross' ? w.lastRoundOnlyCross !== null : fact === 'byes' ? w.byes > 0 : true);
  const used = new Set();
  for (const w of M.US_POSTSEASON) {
    const name = `${w.sport} ${w.from}`;
    for (const fact of ['clubs', 'byes', 'before', 'lastRoundOnlyCross', 'years', 'modified']) {
      const ids = w.src[fact] ?? [];
      for (const id of ids) { used.add(id); if (!SRC[id]) out.push(`${name} ${fact}: unknown source ${id}`); }
      const publishers = new Set(ids.map(id => SRC[id]?.publisher).filter(Boolean));
      if (states(w, fact) && publishers.size < 2) out.push(`${name} ${fact}: ${publishers.size} publisher`);
    }
    const rounds = M.usPostseasonRounds(w.sport);
    if (2 ** rounds.length - w.clubs !== 2 * w.byes) out.push(`${name}: ${w.clubs} clubs and ${w.byes} byes a conference do not seat ${rounds.length} rounds`);
    const typed = M.US_PLAYOFF_FORMAT[w.sport];
    if (JSON.stringify(rounds.map(r => r.name)) !== JSON.stringify(typed.rounds)) out.push(`${name}: round names are not the typed copy`);
    if (JSON.stringify(rounds.map(r => r.series)) !== JSON.stringify(typed.rounds.map((_, i) => (typed.series ? typed.series[i] : [1, 1])))) out.push(`${name}: round lengths are not the typed copy`);
    for (const other of M.US_POSTSEASON) if (other !== w && other.sport === w.sport && other.from <= (w.to ?? Infinity) && w.from <= (other.to ?? Infinity)) out.push(`${name} overlaps ${other.sport} ${other.from}`);
    for (const y of w.modified) if (M.usPostseasonFormat(w.sport, y) !== null) out.push(`${name}: the modified season ${y} still has a format`);
    if (M.usPostseasonFormat(w.sport, w.from)?.clubs !== w.clubs && !w.modified.includes(w.from)) out.push(`${name}: its first season does not read its own row`);
    if (M.usPostseasonFormat(w.sport, w.from - 1)?.from === w.from) out.push(`${name}: the season before it reads its row`);
  }
  for (const [id, s] of Object.entries(SRC)) {
    if (/wiki|fandom/i.test(`${s.publisher} ${s.title}`)) out.push(`source ${id} is a wiki`);
    if (!used.has(id)) out.push(`source ${id} stands behind nothing`);
  }
  if (M.usPostseasonFormat('mlb', 2023) !== null || M.usPostseasonFormat('nhl', 2023) !== null) out.push('a sport with no row has a format');
  if (M.US_POSTSEASON_THIN.length === 0) out.push('nothing is marked thin');
  return out;
}

/* ─── The population: the fleet of scripts/simUsSeasonCentre.mjs, one loop for both ─── */
const { playCareer } = usSeasonFleet(M, SPORT_DEFS);
const TARGETED = Math.max(4, Math.round(CAREERS / 5));

const seen = [];
const onePoint = games => games.filter(g => Math.abs(g.us - g.them) === 1).length;
/** The margins of a set of games: how many were decided by 20 or more, and the sum of the margins won and lost. */
const margins = games => {
  const m = { big: 0, w: 0, wm: 0, l: 0, lm: 0 };
  for (const g of games) {
    const d = g.us - g.them;
    if (Math.abs(d) >= 20) m.big += 1;
    if (d > 0) { m.w += 1; m.wm += d; } else if (d < 0) { m.l += 1; m.lm -= d; }
  }
  return m;
};
/** His lowest game as a share of his average game, over the games given (null: nothing to divide by). */
const lowShare = games => {
  const pts = games.map(g => g.line.pts ?? 0);
  const sum = pts.reduce((a, v) => a + v, 0);
  return pts.length && sum > 0 ? Math.min(...pts) / (sum / pts.length) : null;
};

/** One season, right after it is played: what the hub would hand the viewer (the SAVED career and its last line). */
function observe(c, line, who) {
  if (CONTROL === 'thin' && who.i >= 2) return;
  const d = SPORT_DEFS[who.slug];
  const SB = M[d.binding];
  const bind = M[d.bindName];
  const own = OWN[who.slug];
  const career = JSON.parse(JSON.stringify(c));
  const row = career.seasons[career.seasons.length - 1];
  const depth = own.results.indexOf(row.teamResult);
  const rec = { ...who, year: row.year, depth, missed: row.teamResult === own.missed, pS: [], pC: [], pX: [] };
  seen.push(rec);
  const b = M.buildUsSeason(bind, career, row, SB.teamLabelOf);
  rec.build = b.ok ? 'ok' : b.why;
  if (!b.ok) return;
  /* the regular season of the same line, for section F (every season of the fleet the Season Center opens) */
  const s = M.deriveSeasonOrWhy(b.sport, row, b.ctx);
  if (typeof s !== 'string') rec.reg = { games: s.games.length, one: onePoint(s.games), repairs: s.repairs, m: margins(s.games) };
  const path = M.usPlayoffPath(bind, row, b.ctx, b.key);
  const pathJson = JSON.stringify(path);
  const p = M.usPostseasonOrWhy(bind, row, b.ctx, b.key);
  if (depth < 0) {
    /* section C: no postseason on the save, so nothing is laid out and there is no list either */
    rec.none = true;
    if (typeof p !== 'string') rec.pC.push(`a postseason for "${row.teamResult}"`);
    if (path !== null) rec.pC.push(`a list for "${row.teamResult}"`);
    return;
  }
  rec.playoff = true;
  rec.named = !!b.ctx.shape;
  if (typeof p === 'string') { rec.closed = p; return; }
  rec.laid = true;
  const games = p.season.games;
  const G = games.length;
  rec.G = G;
  rec.repairs = p.season.repairs;
  rec.try = p.try;
  rec.one = onePoint(games);
  rec.m = margins(games);
  /* the series he lost in the fewest games a series can have */
  rec.swept = p.series.filter(sr => !sr.won && sr.to - sr.from + 1 === own.need).map(sr => margins(games.slice(sr.from - 1, sr.to)));
  rec.low = G >= 4 ? lowShare(games) : null;
  /* section S */
  rec.pS.push(...sumRule(who.slug, row, p, path));
  rec.sides = games.filter(g => g.home).length === Math.ceil(G / 2);
  /* the same line's regular season again, at the playoff run's size: its first G games */
  if (typeof s !== 'string') {
    rec.reg.firstOne = onePoint(s.games.slice(0, G));
    const on = s.games.filter(g => g.played).slice(0, G);
    rec.regLow = G >= 4 && on.length === G ? lowShare(on) : null;
  }
  /* section C: the same line doctored by hand (no engine wrote these rows; said here because that is not how
     a save gets there). Each must give no postseason, and the list must be what it was. */
  const lo = own.need * p.series.length;
  const hi = own.most * p.series.length;
  const sameRun = other => !!other && other.steps.length === path.steps.length && other.steps.every((st, r) => st.round === path.steps[r].round && st.opp === path.steps[r].opp && st.won === path.steps[r].won);
  const doctored = [
    ['no games count', { ...row, poGames: undefined }, 'bare'],
    ['a count under the rounds', { ...row, poGames: lo - 1 }, 'bare'],
    ['a count over the rounds', { ...row, poGames: hi + 1 }, 'bare'],
    ['no playoff number', Object.fromEntries(Object.entries(row).filter(([k]) => !own.means.some(m => m[1] === k))), 'same'],
    ['a season the format file does not hold', { ...row, year: 2002 }, 'same'],
    ['a season played to another format', { ...row, year: 2019 }, 'same'],
  ];
  rec.doctored = doctored.length;
  for (const [what, twin, list] of doctored) {
    const q = M.usPostseasonOrWhy(bind, twin, b.ctx, b.key);
    if (typeof q !== 'string') rec.pC.push(`${what}: a postseason was laid out`);
    const twinPath = M.usPlayoffPath(bind, twin, b.ctx, b.key);
    if (list === 'same' ? JSON.stringify(twinPath) !== pathJson : !(sameRun(twinPath) && twinPath.steps.every(st => st.score === null))) rec.pC.push(`${what}: the list is not what it was`);
  }
  if (JSON.stringify(M.usPlayoffPath(bind, row, b.ctx, b.key)) !== pathJson) rec.pC.push('the list of the saved line moved');
  /* section X: twice, and from a JSON round trip of the career and the row */
  const json = JSON.stringify(p);
  if (JSON.stringify(M.usPostseasonOrWhy(bind, row, b.ctx, b.key)) !== json) rec.pX.push('a second derive differs');
  const again = JSON.parse(JSON.stringify({ career, row }));
  const b2 = M.buildUsSeason(bind, again.career, again.row, SB.teamLabelOf);
  if (!b2.ok || JSON.stringify(M.usPostseasonOrWhy(bind, again.row, b2.ctx, b2.key)) !== json) rec.pX.push('a derive from a JSON round trip differs');
}

const trap = { count: 0 };
const tA = Date.now();
const fleetHash = {};
for (const slug of SPORTS) for (const seedset of SEEDSETS) {
  const out = [];
  for (let i = 0; i < CAREERS; i += 1) out.push(playCareer(slug, i, seedset, false, observe, trap));
  for (let i = 0; i < TARGETED; i += 1) out.push(playCareer(slug, i, seedset, true, observe, trap));
  fleetHash[`${slug}|${seedset}`] = createHash('sha1').update(JSON.stringify(out)).digest('hex');
}
console.log(`played ${SPORTS.length * SEEDSETS.length * (CAREERS + TARGETED)} careers in ${Date.now() - tA} ms; ${seen.length} seasons observed`);

/* The fleet is the one scripts/simUsSeasonCentre.mjs plays: its careers digest by seed set is in the lay receipt.
   INFO only: a later round that changes an NBA career on purpose moves that receipt, and that is no red of this file. */
{
  const file = path.join(ROOT, 'scripts/data/usSeasonLayDigest.json');
  const rec = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
  for (const slug of SPORTS) for (const seedset of SEEDSETS) {
    const want = rec && rec.careers === CAREERS ? rec.digests?.[slug]?.[seedset]?.careers : null;
    const got = fleetHash[`${slug}|${seedset}`];
    console.log(`info P ${slug} seed set ${seedset}: the careers are ${!want ? 'not comparable with the lay receipt (another fleet size, or no record)' : want === got ? "the lay receipt's, career for career" : 'NOT the lay receipt\'s (an engine moved since it was recorded, or this run observes fewer careers)'}`);
  }
}

const idOf = r => `${r.slug} ${r.targeted ? 'late' : 'week'} ${r.seedset}.${r.i} ${r.year}`;
const laid = seen.filter(r => r.laid);
const playoff = seen.filter(r => r.playoff);
const sum = (xs, f) => xs.reduce((a, r) => a + f(r), 0);
const quant = (xs, q) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : NaN; };

/* ─── D: the format data ─── */
{
  const bad = dataProblems();
  tally('D', 'every fact of every format row stands on two publishers, the rounds are the one typed copy, the accessor refuses what no row holds', bad, M.US_POSTSEASON.length);
}

/* ─── S: the sum rule ─── */
tally('S', 'nba: the games laid out are the playoff line the save holds, game for game and series for series (independent checker)', laid.filter(r => r.pS.length).map(r => `${idOf(r)}: ${r.pS[0]}`), laid.length);
tally('S', 'nba: his side is first in every other playoff game, so no run is scored as all home games', laid.filter(r => !r.sides).map(idOf), laid.length);

/* ─── C: it fails closed ─── */
{
  const none = seen.filter(r => r.none);
  tally('C', 'nba: a season with no postseason on the save lays nothing out and prints no list', none.filter(r => r.pC.length).map(r => `${idOf(r)}: ${r.pC[0]}`), none.length);
  for (const what of ['no games count', 'a count under the rounds', 'a count over the rounds', 'no playoff number', 'a season the format file does not hold', 'a season played to another format']) {
    tally('C', `nba: a line with ${what} gives no postseason, and the list is what it was`, laid.filter(r => r.pC.some(x => x.startsWith(`${what}:`))).map(r => `${idOf(r)}: ${r.pC.find(x => x.startsWith(`${what}:`))}`), laid.length);
  }
  tally('C', 'nba: laying a postseason out never moves the list of the saved line', laid.filter(r => r.pC.includes('the list of the saved line moved')).map(idOf), laid.length);
}

/* ─── F: measured ───
   MEASURED on 2026-10-10, 40 careers a seed set, seed sets 0 to 4 (2,001 NBA playoff seasons the Season Center
   opens, 22,033 playoff games; every one laid out, none failed closed):

     tries   playoff games the core repaired   one point playoff games
       1            10.78%                          15.76%     (the first try stands: control `tries`)
       3             3.87%                           8.96%
       6             1.59%                           6.71%
      12             0.34%                           5.61%     (as shipped; by seed set 0.39, 0.30, 0.26, 0.31, 0.45)
      24             0.01%                           5.31%

   The regular season of the same careers, for scale: 0.30 repairs a season of 82 games (0.37% of its games) and
   5.65% one point games (5.61 to 5.73 by seed set). So at 12 tries a playoff game is repaired as often as a
   regular season game is, and the two one point shares meet; with no repair at all (24 tries) the score law by
   itself gives about 5.3%, which is UNDER the regular season's spread. That is why the acceptance line can read
   OUTSIDE on healthy code and why it is a line for the lead and no gate (see the header).
   Without the pull of his side's strength toward even (variant noclamp): 0.33% repaired, 5.52% one point; 18.19%
   of playoff games decided by 20 or more against 17.66% with it (the regular season: 19.10%).

   THE BAR. At most 1.0% of playoff games repaired: three times what 12 tries measure (0.34%, and 0.45% in the
   worst seed set) and under what six tries give (1.59%), with the control at 10.78%. Judged on the pooled run
   when it holds 2,000 playoff games or more (one seed set holds about 4,400). */
const REPAIRED_BAR = 0.01;
const REPAIRED_MIN_GAMES = 2000;
{
  const closed = playoff.filter(r => !r.laid);
  tally('F', 'nba: not one playoff season the Season Center opens fails closed', closed.map(r => `${idOf(r)}: ${r.closed}`), playoff.length);
  const withReg = seen.filter(r => r.reg);
  console.log('     seed set | playoff seasons laid | playoff games | repaired games (share) | one point: playoffs | regular, every season of the same careers | regular, the playoff seasons | their first G games');
  const rows = [];
  for (const k of [...SEEDSETS, 'all']) {
    const L = laid.filter(r => k === 'all' || r.seedset === k);
    const R = withReg.filter(r => k === 'all' || r.seedset === k);
    const g = sum(L, r => r.G); const rep = sum(L, r => r.repairs); const one = sum(L, r => r.one);
    const rg = sum(R, r => r.reg.games); const ro = sum(R, r => r.reg.one);
    const Lr = L.filter(r => r.reg);
    const row = { k, n: L.length, g, rep, one, share: g ? one / g : NaN, reg: rg ? ro / rg : NaN };
    rows.push(row);
    console.log(`     ${String(k).padStart(8)} | ${String(L.length).padStart(20)} | ${String(g).padStart(13)} | ${`${rep} (${pct(rep, g)})`.padStart(22)} | ${`${one} (${pct(one, g)})`.padStart(19)} | ${`${ro} of ${rg} (${pct(ro, rg)})`.padStart(41)} | ${pct(sum(Lr, r => r.reg.one), sum(Lr, r => r.reg.games)).padStart(28)} | ${pct(sum(Lr, r => r.reg.firstOne), sum(Lr, r => r.G)).padStart(19)}`);
  }
  const all = rows[rows.length - 1];
  console.log(`     the try taken (0 is the first): ${Array.from({ length: M.PO_TRIES }, (_, t) => `${t}:${laid.filter(r => r.try === t).length}`).join(' ')}`);
  console.log(`     repairs a laid out run needed: ${[0, 1, 2, 3].map(n => `${n}${n === 3 ? '+' : ''}:${laid.filter(r => (n === 3 ? r.repairs >= 3 : r.repairs === n)).length}`).join(' ')}; the regular season's repairs a season, for scale: ${withReg.length ? (sum(withReg, r => r.reg.repairs) / withReg.length).toFixed(2) : 'n/a'}`);
  console.log('     by depth | seasons | failed closed | games | repaired (share) | one point (share)');
  for (let dep = 0; dep < OWN.nba.results.length; dep += 1) {
    const P = playoff.filter(r => r.depth === dep); const L = P.filter(r => r.laid);
    const g = sum(L, r => r.G);
    console.log(`     ${OWN.nba.results[dep].padEnd(28)} | ${String(P.length).padStart(5)} | ${String(P.length - L.length).padStart(4)} | ${String(g).padStart(6)} | ${`${sum(L, r => r.repairs)} (${pct(sum(L, r => r.repairs), g)})`.padStart(14)} | ${`${sum(L, r => r.one)} (${pct(sum(L, r => r.one), g)})`.padStart(14)}`);
  }
  {
    const add = (xs, f) => xs.reduce((a, r) => { const m = f(r); for (const k of Object.keys(a)) a[k] += m[k]; return a; }, { big: 0, w: 0, wm: 0, l: 0, lm: 0 });
    const po = add(laid, r => r.m); const reg = add(withReg, r => r.reg.m);
    const line = (m, n) => `${pct(m.big, n)} decided by 20 or more, won by ${(m.wm / Math.max(1, m.w)).toFixed(1)} and lost by ${(m.lm / Math.max(1, m.l)).toFixed(1)} on average`;
    console.log(`     margins: playoff games ${line(po, all.g)}; the regular season of the same careers ${line(reg, sum(withReg, r => r.reg.games))}`);
    const swept = laid.flatMap(r => r.swept);
    const sw = add(swept, m => m);
    console.log(`     series lost in four straight: ${swept.length}; those games were lost by ${(sw.lm / Math.max(1, sw.l)).toFixed(1)} on average, ${pct(sw.big, sw.l)} of them by 20 or more`);
  }
  const lows = laid.filter(r => r.low !== null).map(r => r.low);
  const regLows = laid.filter(r => r.regLow !== null && r.regLow !== undefined).map(r => r.regLow);
  console.log(`     his lowest game as a share of his average game: playoffs p10 ${quant(lows, 0.1).toFixed(2)}, median ${quant(lows, 0.5).toFixed(2)}, p90 ${quant(lows, 0.9).toFixed(2)} over ${lows.length} runs of four games or more; the first G games he played of the same regular seasons p10 ${quant(regLows, 0.1).toFixed(2)}, median ${quant(regLows, 0.5).toFixed(2)}, p90 ${quant(regLows, 0.9).toFixed(2)} over ${regLows.length}`);
  /* the one hard bar: the direct measure of a result turned by a repair */
  if (all.g >= REPAIRED_MIN_GAMES) check('F', all.rep / all.g <= REPAIRED_BAR, `nba: the core had to repair ${all.rep} of ${all.g} playoff games (${pct(all.rep, all.g)}), at most ${(100 * REPAIRED_BAR).toFixed(1)}%`);
  else console.log(`     the repaired share is not judged on ${all.g} playoff games (it wants ${REPAIRED_MIN_GAMES}); section K is what says a run is too thin`);
  /* the acceptance written before anything was measured (see the header): a line for the lead, never a gate */
  const per = rows.filter(r => r.k !== 'all' && Number.isFinite(r.reg));
  if (per.length >= 5 && Number.isFinite(all.share)) {
    const lo = Math.min(...per.map(r => r.reg)); const hi = Math.max(...per.map(r => r.reg));
    const inside = all.share >= lo && all.share <= hi;
    if (!inside) findings += 1;
    console.log(`ACCEPTANCE one point playoff games ${(100 * all.share).toFixed(2)}% against the regular season's spread over the seed sets ${(100 * lo).toFixed(2)}% to ${(100 * hi).toFixed(2)}%: ${inside ? 'INSIDE' : `OUTSIDE, ${all.share > hi ? 'above' : 'below'} it. A FINDING for the lead (the repaired share above is how much of it a repair made)`}`);
  } else console.log('ACCEPTANCE not judged: it is written over the five seed sets');
}

/* ─── K: coverage, a FAIL when short ─── */
/* Each floor is about half the smallest count a seed set gave on 2026-10-10 at 40 careers (by depth 188, 74, 43,
   18 and 27; under ten games 194, ten or more 164; the present day era 153, the throwback era 205; named 153,
   unnamed 205). The fleet is seeded, so these counts only move when an engine does. */
const K_FLOORS = { depth: [90, 35, 20, 9, 13], short: 95, long: 80, now: 75, y2004: 100, named: 75, unnamed: 100 };
{
  const cells = [
    ...OWN.nba.results.map((res, dep) => [`"${res}"`, r => r.depth === dep, K_FLOORS.depth[dep]]),
    ['runs under ten games', r => r.G < 10, K_FLOORS.short],
    ['runs of ten games or more', r => r.G >= 10, K_FLOORS.long],
    ['the present day era', r => r.eraId === 'now', K_FLOORS.now],
    ['the throwback era', r => r.eraId === 'y2004', K_FLOORS.y2004],
    ['named opponents', r => r.named, K_FLOORS.named],
    ['unnamed opponents', r => !r.named, K_FLOORS.unnamed],
  ];
  /* a floor is a count a SEED SET, at the default fleet size; a smaller fleet is short and says so */
  for (const [what, test, floor] of cells) {
    const by = SEEDSETS.map(k => laid.filter(r => r.seedset === k && test(r)).length);
    check('K', by.every(v => v >= floor), `nba: ${what}: ${by.join(', ')} runs laid out by seed set (at least ${floor} in each)`);
  }
}

/* ─── X: determinism ─── */
tally('X', 'nba: a postseason derived twice, and from a JSON round trip of the career and the row, is the same', laid.filter(r => r.pX.length).map(r => `${idOf(r)}: ${r.pX[0]}`), laid.length);
check('X', trap.count === 0, `no call reaches Math.random while a season is observed (${trap.count} calls)`);

/* ─── Closing ─── */
const failed = [...failsBy.values()].reduce((a, l) => a + l.length, 0);
const red = [...failsBy.keys()].sort();
console.log('');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const labels = failsBy.get(c.section) ?? [];
  let ok = labels.length > 0;
  let note = '';
  const withProblem = test => laid.filter(r => r.pS.some(test)).length;
  if (CONTROL === 'sum') {
    const wrong = withProblem(x => x.startsWith('pts '));
    ok = ok && labels.some(l => l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} runs show points that are not the saved total`;
  }
  if (CONTROL === 'drop') {
    const wrong = withProblem(x => x.startsWith('games '));
    ok = ok && labels.some(l => l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} runs show another number of games than the save holds`;
  }
  if (CONTROL === 'clinch') {
    const wrong = withProblem(x => x.includes('goes on after') || x.includes('loses its last game'));
    ok = ok && labels.some(l => l.includes('independent checker')) && wrong > 0;
    note = `; ${wrong} runs hold a series that goes on after it is decided or whose winner loses its last game`;
  }
  if (CONTROL === 'allhome') {
    ok = ok && labels.some(l => l.includes('his side is first in every other playoff game'));
    note = `; ${laid.filter(r => !r.sides).length} runs are dealt as all home games`;
  }
  if (CONTROL === 'open') {
    const wrong = laid.filter(r => r.pC.some(x => x.startsWith('no playoff number:'))).length;
    ok = ok && labels.some(l => l.includes('no playoff number')) && wrong > 0;
    note = `; ${wrong} lines with no playoff number were laid out`;
  }
  if (CONTROL === 'tries') ok = ok && labels.some(l => l.includes('had to repair'));
  if (CONTROL === 'stream') ok = ok && labels.some(l => l.includes('Math.random'));
  console.log(ok
    ? `control ${CONTROL}: RED AT THE NAMED CHECK (section ${c.section}); sections red: ${red.join(', ')}${note}`
    : `control ${CONTROL}: DID NOT FIRE AT ITS NAMED CHECK (section ${c.section}); sections red: ${red.join(', ') || 'none'}${note}`);
  console.log(`simUsPostseason: ${checks} checks, ${failed} failed, ${findings} findings for the lead (control ${CONTROL})`);
  process.exit(ok ? 1 : 2);
}
const variant = VARIANT || TRIES !== null ? ` (variant ${[VARIANT, TRIES !== null ? `tries ${TRIES}` : ''].filter(Boolean).join(', ')}: a measurement, in no gate)` : '';
console.log(`simUsPostseason: ${checks} checks, ${failed} failed, ${findings} findings for the lead${variant}`);
process.exit(failed ? 1 : 0);
