/* Release AV: the plan card of MLB and NHL My Career in a season of any length.

   WHY. Round 1226 made the two engines play the season as long as it really was (48 games in 2012-13, 56 in
   2020-21, 60 in baseball's 2020, 84 from 2026-27). The planning panel (src/lib/usCareerProgramme.ts, live
   since Release AU) typed its games targets on 162 and 82, so a plan for a short year printed "Play 69 games"
   over a 48 game season and then charged the miss: morale down, the partnership wiped, the bonus out of reach.
   An adversarial review of Release AV measured it (60 careers a case, the same seeds on both trees): NHL
   centres of 2012-13 met the steady target 58 of 60 times on Release AU and 0 of 60 on the merged line, and 59
   of 60 lost a partnership they held. The panel now reads the season through a reader each engine binds
   (bindUsProgrammeSeason), works a target out on the engine's own season and carries it to the true length.

   WHAT IT HOLDS
   1 card   every year of both ledgers and two years past them, every club whose season had its own length,
            every position, with no season behind the player and with one: each number the card prints is
            (a) never above what that job can play in that season and (b) this file's own copy of the rule,
            carried with this file's own arithmetic. Exact, no band.
   2 judge  a seeded fleet played the way the board plays it (prepare, simSeason, restore, progress, settle):
            every target the season is judged on is the number the card printed before it. Exact, no band.
   3 rates  the outcome, against a baseline: how often the steady games target is met and the partnership is
            kept in a short year, beside the same careers' rate in a year of the engine's own length.

   MEASURED (section 3, 60 careers a case, the mended tree, the share kept in a short year minus the share in a
   full one, in points, the lowest and the highest of the seed sets): skaters, seed sets 0 to 9, 360 seasons a
   side: steady -3.4 to +3.1, partnership -1.1 to +3.1, bonus -6.1 to +4.2, a held partnership lost -2.9 to
   +1.4. Hitters and relievers, seed sets 0 to 9, 120 and 240 seasons: steady -2.9 to +7.9, bonus -10.4 to
   +10.0. Goalies, seed sets 0 to 8, 240 a side (a goalie's year is the camp's coin toss, about 55 in 100
   either way): steady -7.5 to +9.2, bonus -2.9 to +13.3, lost -4.8 to +4.7. Starters, seed sets 0 to 8, 240
   a side: steady -7.1 to +7.0, bonus -6.2 to +12.5, lost -3.4 to +6.9. The defect this file exists for is
   far outside every one of those: typed on 162 and 82 again, skaters keep the steady target 0 times in 100 in
   a short year against 95, hitters and relievers 0 against 68 (control typed). RATE_GAP is about twice the
   widest gap measured in each group: 12, 22, 25 and 25 points.

   NEGATIVE CONTROLS, US_PLAN_CONTROL=<name>. Each swaps one line of source in memory (an esbuild plugin, never
   a file on disk) and refuses to run unless its anchor is in the file exactly once and the swap changed it.
     typed      the reader is never bound in the two sport modules: the card is typed on 162 and 82 again.
                Must turn sections card and rates red.
     yeardrift  the judge reads the games a partnership asks for in the year AFTER the season (the career has
                moved on by then). Must turn sections judge and rates red.
     statfull   the bonus benchmark is not carried to the season's length. Must turn sections card and rates
                red (the bonus is then met 6 times in 100 by skaters in a short year against 39, and never
                in baseball's 2020 against 40).

   Runs in about 20 seconds. Reads no network and no database. */

import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = s => s.replace(/\r\n/g, '\n');
const CONTROL = process.env.US_PLAN_CONTROL || '';
const SEEDSET = Number(process.env.SEEDSET || 0);
const CAREERS = Number(process.env.US_PLAN_CAREERS || 60);
const PRINT = process.env.US_PLAN_PRINT === '1';

const CONTROLS = {
  typed: {
    needs: ['card', 'rates'],
    edits: ['mlb', 'nhl'].map(sp => ({ file: `src/lib/${sp}CareerSport.ts`, find: `bindUsProgrammeSeason('${sp}', {`, put: `((..._: unknown[]) => undefined)('${sp}', {` })),
  },
  yeardrift: {
    needs: ['judge', 'rates'],
    edits: [{ file: 'src/lib/usCareerProgramme.ts', find: `decision.target = gamesBase(then, sport); decision.actual = line.games;`, put: `decision.target = gamesBase(c, sport); decision.actual = line.games;` }],
  },
  statfull: {
    needs: ['card', 'rates'],
    edits: [{ file: 'src/lib/usCareerProgramme.ts', find: `target: carried(c, sport, Math.max(stat.initial, held) + (stretch ? stat.step : 0)) };`, put: `target: Math.max(stat.initial, held) + (stretch ? stat.step : 0) };` }],
  },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_PLAN_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
const edits = CONTROL ? CONTROLS[CONTROL].edits.map(e => ({ label: `control ${CONTROL}`, ...e })) : [];

function editedSource(file, src, onApplied) {
  let out = src;
  for (const e of edits.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const hits = out.split(e.find).length - 1;
    if (hits !== 1) { console.error(`${e.label}: anchor ${e.find.slice(0, 80)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
    const was = out;
    out = out.replace(e.find, () => e.put);
    if (out === was) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied();
  }
  return out;
}

async function bundle() {
  let applied = 0;
  const plugin = {
    name: 'plan-control',
    setup(b) {
      if (!edits.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!edits.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(args.path, norm(readFileSync(args.path, 'utf8')), () => { applied += 1; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-plan-${process.pid}-${Date.now()}.mjs`);
  await build({
    stdin: {
      contents: [
        "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
        "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
        "export * as plan from './src/lib/usCareerProgramme.ts';",
        "export * as shape from './src/lib/usSeasonShape.ts';",
        "export { MLB_SEASONS, MLB_OUTSIDE_CLUBS } from './src/data/usSeasonLedgerMlb.ts';",
        "export { NHL_SEASONS, NHL_2019_CLUB_GAMES } from './src/data/usSeasonLedgerNhl.ts';",
      ].join('\n'),
      resolveDir: ROOT, loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'node', logLevel: 'error', outfile: out, plugins: [plugin],
    alias: { '@': path.join(ROOT, 'src') }, jsx: 'automatic',
    define: { 'import.meta.env': '{"PROD":true,"DEV":false}' },
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  if (applied !== edits.length) { console.error(`control ${CONTROL}: ${applied} of ${edits.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}

globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const B = await bundle();
const U = B.plan;
const SPORTS = { mlb: B.MLB_CAREER_SPORT, nhl: B.NHL_CAREER_SPORT };

/* ---------- this file's own copy of the rule (never read from the code it judges) ---------- */
const ENGINE = { mlb: 162, nhl: 82 };
const POSITIONS = { mlb: ['CF', 'SP', 'RP'], nhl: ['C', 'LW', 'D', 'G'] };
const ERAS = { mlb: ['y2004', 'now'], nhl: ['y2006', 'now'] };
const typedBase = (sp, pos) => sp === 'nhl' ? (pos === 'G' ? 35 : 55) : pos === 'SP' ? 24 : pos === 'RP' ? 45 : 100;
const typedCeiling = (sp, pos) => sp === 'nhl' ? 82 : pos === 'SP' ? 32 : pos === 'RP' ? 71 : 162;
const typedStep = (sp, pos) => sp === 'mlb' && pos === 'SP' ? 4 : 10;
const benchmark = (sp, pos) => sp === 'nhl'
  ? pos === 'G' ? { key: 'wins', initial: 20, step: 3 } : pos === 'D' ? { key: 'assists', initial: 25, step: 4 } : { key: 'goals', initial: 20, step: 4 }
  : pos === 'SP' ? { key: 'so', initial: 120, step: 20 } : pos === 'RP' ? { key: 'so', initial: 50, step: 10 } : { key: 'hr', initial: 15, step: 4 };
/** The games a job works through out of a club season: a pitcher's and a goalie's work only gives way to a season too short to hold it. */
const workOf = (sp, pos, slate) => (sp === 'mlb' ? pos === 'SP' || pos === 'RP' : pos === 'G') ? Math.min(slate, ENGINE[sp]) : slate;
const carry = (sp, n, work) => work === ENGINE[sp] ? n : Math.round(n * work / ENGINE[sp]);
const fullOf = (sp, n, work) => work === ENGINE[sp] ? n : Math.round(n * ENGINE[sp] / work);

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const realRandom = Math.random;

/** The numbers one card prints. Null where a line is not in the shape this file reads, which is itself a failure. */
function cardOf(c, slug) {
  const menus = U.usProgrammeMenus(c, slug);
  const eff = (sec, id) => menus.find(m => m.id === sec)?.options.find(o => o.id === id)?.effect ?? '';
  const num = (text, re) => { const m = re.exec(text); return m ? m.slice(1).map(Number) : null; };
  const steady = num(eff('expectation', 'steady'), /^Play ([0-9]+) games:/);
  const stretch = num(eff('expectation', 'stretch'), /^Play ([0-9]+) games:/);
  const partner = num(eff('partnership', 'build'), /At least ([0-9]+) games adds/);
  const bonus = num(eff('bonus', 'steady'), /^([0-9]+) [a-z ]+ and ([0-9]+) games:/);
  const bonusStretch = num(eff('bonus', 'stretch'), /^([0-9]+) [a-z ]+ and ([0-9]+) games:/);
  if (!steady || !stretch || !partner || !bonus || !bonusStretch) return null;
  return { steady: steady[0], stretch: stretch[0], partner: partner[0], bonusStat: bonus[0], bonusGames: bonus[1], bonusStretchStat: bonusStretch[0], bonusStretchGames: bonusStretch[1] };
}

const sections = {};
const sectionOf = name => (sections[name] ??= { checks: 0, failed: 0, first: [] });
const check = (name, ok, msg) => { const s = sectionOf(name); s.checks += 1; if (!ok) { s.failed += 1; if (s.first.length < 4) s.first.push(msg()); } };

/* ---------- 1 card: every year, every length, every position ---------- */
/** A club for every length that year held, by the ledger's own ids, and `undefined` for the league's own length. */
function clubsOf(sp, year) {
  const out = [undefined];
  if (sp === 'mlb') {
    const row = B.MLB_SEASONS.find(r => r.year === year);
    for (const g of row?.clubs ?? []) out.push(g.ids[0]);
    out.push(B.MLB_OUTSIDE_CLUBS[0].team);
  } else if (year === 2019) {
    const seen = new Set();
    for (const [club, games] of Object.entries(B.NHL_2019_CLUB_GAMES)) if (!seen.has(games)) { seen.add(games); out.push(club); }
  }
  return out;
}
const lengthsSeen = new Set();
let cards = 0;
for (const sp of ['mlb', 'nhl']) {
  const S = SPORTS[sp];
  const rows = sp === 'mlb' ? B.MLB_SEASONS : B.NHL_SEASONS;
  const years = [...rows.map(r => r.year), rows[rows.length - 1].year + 1, rows[rows.length - 1].year + 2];
  for (const pos of POSITIONS[sp]) {
    const rng = mulberry32(7 + pos.charCodeAt(0));
    Math.random = rng;
    let start;
    try { start = S.startCareer('Plan Card', pos, S.create.archetypes[pos][0], rng, null, ERAS[sp][0]); } finally { Math.random = realRandom; }
    const stat = benchmark(sp, pos);
    for (const year of years) for (const club of clubsOf(sp, year)) {
      const team = club ?? 'a club the ledger does not name';
      const slate = B.shape.seasonLength(sp, year, club);
      const work = workOf(sp, pos, slate);
      lengthsSeen.add(`${sp} ${slate}`);
      /* No season behind him, then one at this club on the year before's own length: a full one, and a thin one. */
      const prevSlate = B.shape.seasonLength(sp, year - 1, club);
      const prevWork = workOf(sp, pos, prevSlate);
      const behind = [null, { full: typedCeiling(sp, pos), stat: stat.initial * 2 }, { full: Math.round(typedCeiling(sp, pos) * 0.5), stat: Math.round(stat.initial * 0.6) }];
      for (const prev of behind) {
        const line = prev && { year: year - 1, team, age: 25, ovr: 80, games: carry(sp, prev.full, prevWork), awards: [], teamResult: '', salary: 1, [stat.key]: carry(sp, prev.stat, prevWork), ...(prevSlate === ENGINE[sp] ? {} : { slate: prevSlate }) };
        const c = { ...start, year, team, seasons: line ? [line] : [] };
        const got = cardOf(c, sp);
        cards += 1;
        const at = `${sp} ${year} ${club ?? 'league'} ${pos} (season ${slate}, work ${work}${line ? `, behind him ${line.games} games of ${prevSlate}` : ', no season behind him'})`;
        if (!got) { check('card', false, () => `${at}: the card's lines are not in the shape this file reads`); continue; }
        const base = Math.min(typedCeiling(sp, pos), typedBase(sp, pos));
        const heldGames = line ? Math.max(base, Math.round(fullOf(sp, line.games, prevWork) * 0.85)) : base;
        const heldStat = line ? Math.max(stat.initial, fullOf(sp, line[stat.key], prevWork)) : stat.initial;
        const want = {
          steady: carry(sp, Math.min(typedCeiling(sp, pos), heldGames), work),
          stretch: carry(sp, Math.min(typedCeiling(sp, pos), heldGames + typedStep(sp, pos)), work),
          partner: carry(sp, base, work), bonusGames: carry(sp, base, work), bonusStretchGames: carry(sp, base, work),
          bonusStat: carry(sp, heldStat, work), bonusStretchStat: carry(sp, heldStat + stat.step, work),
        };
        for (const k of Object.keys(want)) check('card', got[k] === want[k], () => `${at}: the card prints ${k} ${got[k]}, the rule carried to this season gives ${want[k]}`);
        const most = carry(sp, typedCeiling(sp, pos), work);
        for (const k of ['steady', 'stretch', 'partner', 'bonusGames']) check('card', got[k] <= most && got[k] <= slate, () => `${at}: the card asks for ${got[k]} games (${k}) of a job that plays at most ${most} in a season of ${slate}`);
      }
    }
  }
}
/* The walk above is only worth its name if it met the short years, the long one and a club off its schedule. */
for (const need of ['nhl 48', 'nhl 56', 'nhl 84', 'nhl 82', 'mlb 60', 'mlb 162', 'mlb 161']) check('card', lengthsSeen.has(need), () => `the ledger years walked never met a season of ${need} games, so this section proved less than it says`);

/* ---------- 2 judge and 3 rates: a seeded fleet, played the way the board plays a season ---------- */
/* group: the careers whose rates are read together. `short` years are judged beside the `full` years of the same group. */
const CASES = [
  { sp: 'nhl', era: 'y2006', year: 2012, positions: ['C', 'LW', 'D'], group: 'nhl skaters', kind: 'short' },
  { sp: 'nhl', era: 'y2006', year: 2020, positions: ['C', 'LW', 'D'], group: 'nhl skaters', kind: 'short' },
  { sp: 'nhl', era: 'y2006', year: 2014, positions: ['C', 'LW', 'D'], group: 'nhl skaters', kind: 'full' },
  { sp: 'nhl', era: 'y2006', year: 2016, positions: ['C', 'LW', 'D'], group: 'nhl skaters', kind: 'full' },
  { sp: 'nhl', era: 'y2006', year: 2012, positions: ['G'], group: 'nhl goalies', kind: 'short', times: 2 },
  { sp: 'nhl', era: 'y2006', year: 2020, positions: ['G'], group: 'nhl goalies', kind: 'short', times: 2 },
  { sp: 'nhl', era: 'y2006', year: 2014, positions: ['G'], group: 'nhl goalies', kind: 'full', times: 2 },
  { sp: 'nhl', era: 'y2006', year: 2016, positions: ['G'], group: 'nhl goalies', kind: 'full', times: 2 },
  { sp: 'mlb', era: 'y2004', year: 2020, positions: ['CF', 'RP'], group: 'mlb hitters and relievers', kind: 'short' },
  { sp: 'mlb', era: 'y2004', year: 2017, positions: ['CF', 'RP'], group: 'mlb hitters and relievers', kind: 'full' },
  { sp: 'mlb', era: 'y2004', year: 2015, positions: ['CF', 'RP'], group: 'mlb hitters and relievers', kind: 'full' },
  { sp: 'mlb', era: 'y2004', year: 2020, positions: ['SP'], group: 'mlb starters', kind: 'short', times: 4 },
  { sp: 'mlb', era: 'y2004', year: 2017, positions: ['SP'], group: 'mlb starters', kind: 'full', times: 2 },
  { sp: 'mlb', era: 'y2004', year: 2015, positions: ['SP'], group: 'mlb starters', kind: 'full', times: 2 },
  /* The long season: nothing to compare it with, so it is in the judge's section only. */
  { sp: 'nhl', era: 'now', year: 2027, positions: ['C', 'G'], group: null, kind: 'long' },
  { sp: 'nhl', era: 'y2006', year: 2019, positions: ['C', 'G'], group: null, kind: 'short' },
];
const tallies = {};
let played = 0;
for (const cs of CASES) for (const pos of cs.positions) {
  const S = SPORTS[cs.sp];
  for (let i = 0; i < CAREERS * (cs.times ?? 1); i += 1) {
    const rng = mulberry32(31 + SEEDSET * 100003 + i * 977 + cs.year + pos.charCodeAt(0) * 13);
    Math.random = rng;
    try {
      let c = S.startCareer(`Plan ${i}`, pos, S.create.archetypes[pos][i % S.create.archetypes[pos].length], rng, null, cs.era);
      c.year = cs.year - 2;
      const tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      c.contractYears = 6;
      /* Two seasons at this club first, the second with a partnership plan, so the year judged has a season and a partnership behind it. */
      for (let k = 0; k < 2; k += 1) {
        if (k === 1) c = U.saveUsCareerProgramme(c, cs.sp, { ...U.usProgrammeDefaults(), partnership: 'build' });
        S.campBattle(c, tq, rng);
        const prep0 = U.prepareUsCareerProgramme(c, cs.sp);
        const { line: l0 } = S.simSeason(c, tq, rng);
        U.restoreUsCareerProgramme(c, prep0);
        S.progress(c, rng);
        U.settleUsCareerProgramme(c, l0, cs.sp, prep0);
        c.pendingRivalryEvent = null; c.pendingRivalryChoice = null;
      }
      if (c.retired || c.year !== cs.year || (c.suspendedSeasons ?? 0) > 0) continue;
      const card = cardOf(c, cs.sp);
      const heldBefore = c.programmePartnership ? c.programmePartnership.progress : 0;
      c = U.saveUsCareerProgramme(c, cs.sp, { ...U.usProgrammeDefaults(), expectation: 'steady', partnership: 'build', bonus: 'steady' });
      if (!c.programme || !card) { check('judge', false, () => `${cs.sp} ${cs.year} ${pos} career ${i}: the plan could not be set or its card could not be read`); continue; }
      S.campBattle(c, tq, rng);
      const prep = U.prepareUsCareerProgramme(c, cs.sp);
      const { line } = S.simSeason(c, tq, rng);
      U.restoreUsCareerProgramme(c, prep);
      S.progress(c, rng);
      const res = U.settleUsCareerProgramme(c, line, cs.sp, prep);
      if (!res) { check('judge', false, () => `${cs.sp} ${cs.year} ${pos} career ${i}: the season was not settled`); continue; }
      played += 1;
      const at = `${cs.sp} ${cs.year} ${pos} career ${i} (${line.games} games of ${line.slate ?? ENGINE[cs.sp]})`;
      const of = name => res.decisions.find(d => d.section === name);
      const exp = of('expectation'), par = of('partnership'), bon = of('bonus');
      if (line.games > 0) {
        check('judge', exp?.target === card.steady, () => `${at}: the card said Play ${card.steady} games, the season was judged on ${exp?.target}`);
        check('judge', bon?.target === card.bonusStat, () => `${at}: the card's benchmark was ${card.bonusStat}, the season was judged on ${bon?.target}`);
        const bonusKept = typeof bon?.actual === 'number' && bon.actual >= card.bonusStat && line.games >= card.bonusGames;
        check('judge', (bon?.outcome === 'completed') === bonusKept, () => `${at}: the bonus came out ${bon?.outcome} on ${bon?.actual} against the card's ${card.bonusStat} and ${card.bonusGames} games`);
      }
      check('judge', par?.target === card.partner, () => `${at}: the card said At least ${card.partner} games, the partnership was judged on ${par?.target}`);
      if (cs.group && line.games > 0) {
        const t = (tallies[`${cs.group}|${cs.kind}`] ??= { n: 0, steady: 0, partner: 0, bonus: 0, held: 0, lost: 0 });
        t.n += 1;
        if (exp?.outcome === 'completed') t.steady += 1;
        if (par?.outcome === 'completed') t.partner += 1;
        if (bon?.outcome === 'completed') t.bonus += 1;
        if (heldBefore > 0) { t.held += 1; if (!c.programmePartnership) t.lost += 1; }
      }
    } finally { Math.random = realRandom; }
  }
}
check('judge', played >= CASES.reduce((n, cs) => n + cs.positions.length * (cs.times ?? 1), 0) * CAREERS * 0.8, () => `only ${played} seasons were played and settled, so the fleet proved less than it says`);

/* ---------- 3 rates: a short year beside a year of the engine's own length ---------- */
/* RATE_GAP: how far the share of plans kept in a short year may sit from the same group's share in a full year,
   in points of a hundred. Set from the measured spread (see the header), never from a number that felt right. */
const RATE_GAP = { 'nhl skaters': 12, 'nhl goalies': 25, 'mlb hitters and relievers': 22, 'mlb starters': 25 };
const pct = (a, n) => n ? 100 * a / n : 0;
for (const group of Object.keys(RATE_GAP)) {
  const s = tallies[`${group}|short`], f = tallies[`${group}|full`];
  if (!s || !f || s.n < CAREERS || f.n < CAREERS) { check('rates', false, () => `${group}: too few settled seasons to read a rate (short ${s?.n ?? 0}, full ${f?.n ?? 0})`); continue; }
  const row = { steady: [pct(s.steady, s.n), pct(f.steady, f.n)], partner: [pct(s.partner, s.n), pct(f.partner, f.n)], bonus: [pct(s.bonus, s.n), pct(f.bonus, f.n)], lost: [pct(s.lost, s.held), pct(f.lost, f.held)] };
  console.log(`rates ${group}: steady target met ${row.steady[0].toFixed(1)} short, ${row.steady[1].toFixed(1)} full; partnership kept ${row.partner[0].toFixed(1)}, ${row.partner[1].toFixed(1)}; bonus ${row.bonus[0].toFixed(1)}, ${row.bonus[1].toFixed(1)}; a held partnership lost ${row.lost[0].toFixed(1)}, ${row.lost[1].toFixed(1)} (seasons ${s.n} short, ${f.n} full)`);
  for (const k of ['steady', 'partner', 'bonus', 'lost']) check('rates', Math.abs(row[k][0] - row[k][1]) <= RATE_GAP[group], () => `${group}: ${k} is ${row[k][0].toFixed(1)} in a short year and ${row[k][1].toFixed(1)} in a full one, further apart than ${RATE_GAP[group]} points`);
}

/* ---------- the verdict ---------- */
const names = ['card', 'judge', 'rates'];
const red = names.filter(n => sectionOf(n).failed > 0);
for (const n of names) {
  const s = sectionOf(n);
  console.log(`${s.failed ? 'RED  ' : 'green'} ${n}: ${s.checks} checks, ${s.failed} failed`);
  for (const line of s.first) console.log(`   FAIL: ${line}`);
}
const total = names.reduce((n, k) => n + sectionOf(k).checks, 0), failed = names.reduce((n, k) => n + sectionOf(k).failed, 0);
if (CONTROL) {
  const needs = CONTROLS[CONTROL].needs;
  const hit = needs.every(n => red.includes(n)) && red.every(n => needs.includes(n));
  console.log(`simUsPlanSeason control ${CONTROL}: ${hit ? 'FIRED' : 'DID NOT FIRE'} (must turn exactly ${needs.join(' and ')} red; red: ${red.join(', ') || 'nothing'})`);
  process.exit(1);
}
console.log(`simUsPlanSeason: ${failed ? 'RED' : 'green'}. ${total} checks, ${failed} failed, ${cards} cards read over both ledgers, ${played} seasons played and settled (${CAREERS} careers a case, seed set ${SEEDSET}).`);
process.exit(failed ? 1 : 0);
