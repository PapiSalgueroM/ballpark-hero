/* simNbaAwardsSense.mjs (Round 1103). Do NBA My Career's numbers and awards make sense to a fan?

   It plays the real engine: one bundle of the four career engines, the awards file, NBA Front Office's season
   stats and the Hall of Fame ballot, on a seeded mulberry32 that is both Math.random and the rng handed to
   the engine. The fleet is the board's own order (a role on draft night, a camp every season, one summer card
   with a random option, one career in four in the 2003-04 era), the loop scripts/simNbaCareer.mjs walks.

   Size. Full size is 6,000 careers a seed, seeds 1 to 5. SENSE_SEEDS=1,2 and SENSE_CAREERS=800 shrink it
   while iterating: a shrunk run prints every number, judges only the exact checks and says so.

   The baseline is main. scripts/data/nbaAwardsSenseBaseline.json has two top level keys with two lifetimes:
     nba     the NBA rates of the engine before Round 1103 touched it, per seed. Written ONCE by
             --record-nba-baseline, which refuses when the key exists. A later round that moves these on purpose
             uses --rebase-nba "<reason>", which writes the reason and the commit beside the new numbers.
     others  a sha256 of every NFL, MLB and NHL career this harness plays (500 a sport a seed). A proof for one
             round (did my edit to a shared file move another sport), not a standing rule: it is judged only
             under SENSE_PROVE_OTHERS=1 and rewritten by --record-others.
   Both record commands refuse a dirty tree (git status of src and scripts, this file and the baseline aside).

   Run:  node scripts/simNbaAwardsSense.mjs            (detached at full size: it takes minutes)
   It ends with one line, "simNbaAwardsSense: N checks, F failed (full size)", and exits by F. */
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { build } from 'esbuild';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const ARGS = process.argv.slice(2);
const CONTROL = process.env.SIM_NBA_SENSE_CONTROL || '';
const SEEDS = (process.env.SENSE_SEEDS || '1,2,3,4,5').split(',').map(Number);
const CAREERS = Number(process.env.SENSE_CAREERS || 6000);
const OTHERS_PER = Number(process.env.SENSE_OTHERS || 500);
const FULL = CAREERS >= 6000 && SEEDS.length >= 5;
const PROVE_OTHERS = process.env.SENSE_PROVE_OTHERS === '1';
const BASELINE_FILE = path.join(ROOT, 'scripts', 'data', 'nbaAwardsSenseBaseline.json');
const norm = s => s.replace(/\r\n/g, '\n');
/* Section E's tolerances: how far a seed's measured field may sit from the committed row. */
/* Triple double seasons the elite sweep must still find on every seed (set from five seeds, see the header). */
const ELITE_TD_FLOOR = 1;
const E_MEAN_TOL = 0.2;
const E_SD_TOL = 0.12;

/* ------------------------------------------------------------------ */
/* Controls: one line of SOURCE swapped in memory, never a file        */
/* ------------------------------------------------------------------ */
/* name -> { file, find, put }. Each anchor must sit in its file exactly once and the swap must change the
   text, or the run refuses (exit 2): a control that changed nothing proves nothing. */
const srcOf = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
/* Two anchors carry a number a builder tunes, so they are read off the source instead of typed here. */
const pgRow = srcOf('src/lib/careerAwards.ts').match(/^ {4}PG: \{ mean: ([0-9.]+), sd: ([0-9.]+) \},$/m);
const FIELD_PG_ROW = pgRow ? pgRow[0] : 'the PG row of LEAGUE.nba is not in careerAwards.ts';
const FIELD_PG_STALE = pgRow ? `    PG: { mean: ${(Number(pgRow[1]) + Number(pgRow[2])).toFixed(1)}, sd: ${pgRow[2]} },` : '';
const scaleLine = srcOf('src/lib/nbaMyCareer.ts').match(/^export const NBA_LEGACY_NEW_LINE_SCALE: number = [0-9.]+;$/m);
const LEGACY_SCALE_LINE = scaleLine ? scaleLine[0] : 'the legacy scale constant is not in nbaMyCareer.ts';
const CONTROLS = {
  /* C: one NFL All-Pro grade moved by a hundredth. Judged under SENSE_PROVE_OTHERS=1. */
  othersport: { file: 'src/lib/careerAwards.ts', find: "  QB: { pool: 32, slots: 1, grade: 0.25 },\n  RB:", put: "  QB: { pool: 32, slots: 1, grade: 0.26 },\n  RB:", needs: 'C' },
  /* A: the old assists expression back (a flat rate by rating, plus up to two for everybody). It moves the
     line itself, so the field, the rival, the awards and the Hall may follow it red: `may` lists them. */
  oldassists: { file: 'src/lib/nbaMyCareer.ts',
    find: '  const apg = clampTo((0.045 + d * 0.0052) * a.playmaking * NBA_POS_AST[input.pos] * minutes * era.ast * (0.92 + u5 * 0.16), 0.3, po ? 14 : 13);',
    put: '  const apg = clampTo((1.5 + d * 0.22) * a.playmaking * (bench ? 0.6 : 1) + u5 * 2, 0.3, po ? 14 : 13);', needs: 'A1,A3', may: 'A2,E,R,H,B6a' },
  /* E: the PG row of the field one standard deviation stale. The awards and the bridge read it, so they may follow. */
  stalefield: { file: 'src/lib/careerAwards.ts', find: FIELD_PG_ROW, put: FIELD_PG_STALE, needs: 'E', may: 'R,H,B6a' },
  /* R: the raw season score handed to the rival, no bridge. */
  nobridge: { file: 'src/lib/nbaMyCareer.ts', find: "    for (const n of judgeRivalSeason(c.rival, bridged, c.name, 'nba', rng)) notes.push(n);", put: "    for (const n of judgeRivalSeason(c.rival, statScore, c.name, 'nba', rng)) notes.push(n);", needs: 'R' },
  /* H: the legacy constant back to 1. Refuses when it already is 1 (then nomvpworth is the control H has). */
  noscale: { file: 'src/lib/nbaMyCareer.ts', find: LEGACY_SCALE_LINE, put: 'export const NBA_LEGACY_NEW_LINE_SCALE: number = 1;', needs: 'H' },
  /* H: an MVP worth nothing to the legacy score of a career retiring today. */
  nomvpworth: { file: 'src/lib/nbaMyCareer.ts', find: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },', put: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 0, finalsMvps: 90, allNbas: 48 },', needs: 'H' },
};
/* Controls that swap more than one line of one file (each anchor exactly once, each swap must change the text). */
const MULTI = {
  /* B6a: the four grades back to what they were before Round 1103. The Hall counts awards, so it may follow. */
  oldgrades: { file: 'src/lib/careerAwards.ts', needs: 'B6a', may: 'H', swaps: [
    [/^const NBA_ALL_NBA: FieldConfig = \{ pool: 150, slots: 15, grade: [-0-9.]+ \};$/m, 'const NBA_ALL_NBA: FieldConfig = { pool: 150, slots: 15, grade: 0.15 };'],
    [/^const NBA_MVP: FieldConfig = \{ pool: 150, slots: 1, grade: [-0-9.]+ \};$/m, 'const NBA_MVP: FieldConfig = { pool: 150, slots: 1 };'],
    [/^const NBA_FINALS_MVP: FieldConfig = \{ pool: 7, slots: 1, grade: [-0-9.]+ \};$/m, 'const NBA_FINALS_MVP: FieldConfig = { pool: 7, slots: 1, grade: 0.3 };'],
    [/^const NBA_ALL_DEF: FieldConfig = \{ pool: 150, slots: 10, grade: [-0-9.]+ \};$/m, 'const NBA_ALL_DEF: FieldConfig = { pool: 150, slots: 10, grade: 0.2 };'],
  ] },
};
for (const [k, v] of Object.entries(MULTI)) CONTROLS[k] = v;
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown SIM_NBA_SENSE_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`);
  process.exit(2);
}
/* SENSE_TRY_SCALE=1.2 plays the fleet with the legacy constant at another value, for the Hall procedure (measure,
   step, measure again). It is a measuring knob, never a record: a run with it set refuses to write a baseline. */
const TRY_SCALE = process.env.SENSE_TRY_SCALE || '';
const edits = [];
if (CONTROL) edits.push({ label: `control ${CONTROL}`, file: CONTROLS[CONTROL].file, swaps: CONTROLS[CONTROL].swaps ?? [[CONTROLS[CONTROL].find, CONTROLS[CONTROL].put]] });
if (TRY_SCALE) {
  if (!(Number(TRY_SCALE) > 0)) { console.error('SENSE_TRY_SCALE needs a number'); process.exit(2); }
  edits.push({ label: `try scale ${TRY_SCALE}`, file: 'src/lib/nbaMyCareer.ts', swaps: [[LEGACY_SCALE_LINE, `export const NBA_LEGACY_NEW_LINE_SCALE: number = ${Number(TRY_SCALE)};`]], sameOk: true });
}
let swapped = 0;
const swapPlugin = {
  name: 'sense-control',
  setup(b) {
    if (!edits.length) return;
    b.onLoad({ filter: /[.]ts$/ }, args => {
      const mine = edits.filter(e => args.path.replace(/\\/g, '/').endsWith(e.file));
      if (!mine.length) return undefined;
      const src = norm(readFileSync(args.path, 'utf8'));
      let out = src;
      for (const e of mine) {
        const was = out;
        for (const [find, put] of e.swaps) {
          const hits = typeof find === 'string' ? out.split(find).length - 1 : (out.match(new RegExp(find.source, 'gm')) ?? []).length;
          if (hits !== 1) { console.error(`${e.label}: anchor ${String(find).slice(0, 70)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
          out = out.replace(find, put);
        }
        if (out === was && !e.sameOk) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
        swapped++;
      }
      return { contents: out, loader: 'ts' };
    });
  },
};

const OUT = path.join(os.tmpdir(), `nba-sense-${process.pid}.mjs`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({
  stdin: {
    contents: [
      "export * as nba from './src/lib/nbaMyCareer.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as mlb from './src/lib/mlbMyCareer.ts';",
      "export * as nhl from './src/lib/nhlMyCareer.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as fo from './src/lib/nbaSeasonStats.ts';",
      "export { NBA_CAREER_HALL } from './src/lib/nbaCareerHall.ts';",
      "export { hallRecordFor } from './src/lib/careerHallOfFame.ts';",
      "export * as loop from './src/lib/nbaCareerLoop.ts';",
      "export * as norms from './src/data/nbaLeagueNorms.ts';",
      "export { seasonSwing } from './src/lib/careerVariance.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [swapPlugin],
});
if (swapped !== edits.length) { console.error(`${edits.map(e => e.label).join(', ')}: ${swapped} of ${edits.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
const E = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* another run may have cleaned it */ }
const { nba, nfl, mlb, nhl } = E;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sdOf = a => { const m = mean(a); return a.length ? Math.sqrt(mean(a.map(x => (x - m) ** 2))) : 0; };
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };
const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;
const r3 = x => Math.round(x * 1000) / 1000;
const share = (n, d) => (d ? (100 * n) / d : 0);
const has = (s, a) => s.awards.includes(a);
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ARCH_IDS = POS.flatMap(p => nba.NBA_ARCHETYPES[p].map(a => a.id));

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
/** Plays `careers` NBA careers on one seed, the board's own order. Every season is kept with what the engine
 *  knew going in (rating, morale, club, role, seasons played), so a section can replay it through a function. */
function playFleet(seed, careers) {
  const rnd = mulberry32(seed);
  Math.random = rnd;
  const seasons = [];
  const out = [];
  for (let i = 0; i < careers; i++) {
    const pos = POS[i % 5];
    const arch = nba.NBA_ARCHETYPES[pos][i % 3];
    const era = i % 4 === 3 ? 'y2004' : 'now';
    const c = nba.startNbaCareer(`Sim ${i}`, pos, arch, rnd, null, era === 'y2004' ? 'y2004' : undefined);
    let tq = nba.nbaRollTeamQuality(null, rnd);
    nba.nbaAssignRole(c, tq, rnd);
    let guard = 0;
    let done = false;
    while (!done && guard++ < 30) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
      } else {
        nba.nbaCampBattle(c, tq, rnd);
        const prev = c.seasons[c.seasons.length - 1];
        const pre = { ovr: c.ovr, morale: c.morale, age: c.age, role: c.role ?? 'starter', n: c.seasons.length, fan: c.fanbase, everAllNba: c.allNbas > 0, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0 };
        const { line } = nba.simNbaSeason(c, tq, rnd);
        seasons.push({ i, pos, arch: arch.id, era, tq, ...pre, prev, line, won: (c.rival?.myYears ?? 0) - pre.my, lost: (c.rival?.hisYears ?? 0) - pre.his, rivalScore: c.rival?.lastScore ?? null });
      }
      nba.nbaProgress(c, rnd);
      const ev = nba.drawNbaEvent(c, rnd);
      if (ev) { const pick = ev.options[Math.floor(rnd() * ev.options.length)]; pick.apply(c, rnd); }
      tq = nba.nbaRollTeamQuality(tq, rnd);
      if (nba.nbaShouldRetire(c)) done = true;
    }
    /* Read while the career is still open: a career retiring today is told on today's calibration (Round 1051). */
    const leg = nba.nbaLegacyOf(c);
    const hall = E.hallRecordFor(E.NBA_CAREER_HALL, c);
    const tot = nba.nbaCareerTotals(c);
    out.push({ i, pos, arch: arch.id, era, seasons: c.seasons.length, mvps: c.mvps, allNbas: c.allNbas, allStars: c.allStars ?? 0, rings: c.rings, finalsMvps: c.finalsMvps,
      score: leg.score, inducted: hall.outcome === 'inducted', firstBallot: !!hall.firstBallot, my: c.rival?.myYears ?? 0, his: c.rival?.hisYears ?? 0, pts: tot.pts });
  }
  return { seasons, careers: out };
}

const band = o => (o < 72 ? '<72' : o < 76 ? '72-75' : o < 80 ? '76-79' : o < 84 ? '80-83' : o < 88 ? '84-87' : o < 92 ? '88-91' : o < 96 ? '92-95' : '96+');
const AWARDS = ['All-Star', 'Rookie of the Year', 'All-NBA', 'MVP', 'Finals MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Most Improved Player', 'Sixth Man of the Year', 'All-Rookie Team'];
const healthy = s => s.line.games >= 58;

/** Every rate the bands hang off, for one seed's fleet. Plain numbers only: this is what the baseline stores. */
function measure(f) {
  const n = f.careers.length;
  const S = f.seasons;
  const per = a => r3(S.filter(s => has(s.line, a)).length / n);
  const m = {};
  m.careers = n; m.seasons = S.length;
  m.inducted = r2(share(f.careers.filter(c => c.inducted).length, n));
  m.firstBallot = r2(share(f.careers.filter(c => c.firstBallot).length, n));
  for (const era of ['now', 'y2004']) {
    const cs = f.careers.filter(c => c.era === era);
    m[`inducted_${era}`] = r2(share(cs.filter(c => c.inducted).length, cs.length));
  }
  m.scoreP50 = r1(pctl(f.careers.map(c => c.score), 0.5)); m.scoreP90 = r1(pctl(f.careers.map(c => c.score), 0.9));
  m.perCareer = Object.fromEntries(AWARDS.map(a => [a, per(a)]));
  m.everMvp = r2(share(f.careers.filter(c => c.mvps > 0).length, n));
  m.everAllNba = r2(share(f.careers.filter(c => c.allNbas > 0).length, n));
  const mvp = S.filter(s => has(s.line, 'MVP'));
  m.mvpSeasons = mvp.length;
  m.mvpMissedPlayoffs = r2(share(mvp.filter(s => s.line.teamResult === nba.NBA_MISSED_PLAYOFFS).length, mvp.length));
  m.mvpNotAllNba = r2(share(mvp.filter(s => !has(s.line, 'All-NBA')).length, mvp.length));
  m.mvpAlsoMip = r2(share(mvp.filter(s => has(s.line, 'Most Improved Player')).length, mvp.length));
  const roy = S.filter(s => has(s.line, 'Rookie of the Year'));
  m.roySeasons = roy.length; m.royOnAllRookie = roy.filter(s => has(s.line, 'All-Rookie Team')).length;
  m.allRookieInFirstSeason = S.filter(s => s.n === 0 && has(s.line, 'All-Rookie Team')).length;
  m.allDefByArch = Object.fromEntries(ARCH_IDS.map(a => [a, r3(S.filter(s => s.arch === a && has(s.line, 'All-Defensive Team')).length / Math.max(1, f.careers.filter(c => c.arch === a).length))]));
  const my = f.careers.reduce((x, c) => x + c.my, 0); const his = f.careers.reduce((x, c) => x + c.his, 0);
  m.myShare = r2(share(my, my + his));
  m.myShareByArch = Object.fromEntries(ARCH_IDS.map(a => { const cs = f.careers.filter(c => c.arch === a); const x = cs.reduce((t, c) => t + c.my, 0); const y = cs.reduce((t, c) => t + c.his, 0); return [a, r1(share(x, x + y))]; }));
  /* How often the verdict disagrees with the two printed lines scored the same way (printed, never judged). */
  const judged = S.filter(s => s.won + s.lost === 1 && s.rivalScore != null);
  m.rivalDisagree = r2(share(judged.filter(s => (E.awards.nbaSeasonScore(s.line) > s.rivalScore) !== (s.won === 1)).length, judged.length));
  m.starters = {};
  for (const b of ['80-83', '88-91']) {
    m.starters[b] = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.role !== 'backup' && healthy(s) && s.pos === p && band(s.ovr) === b).map(s => s.line); return [p, [r1(mean(v.map(l => l.ppg))), r1(mean(v.map(l => l.rpg))), r1(mean(v.map(l => l.apg))), v.length]]; }));
  }
  const rook = S.filter(s => s.n === 0 && healthy(s));
  m.rookieStarterPpg = r1(mean(rook.filter(s => s.role !== 'backup').map(s => s.line.ppg)));
  m.benchPpg = r1(mean(S.filter(s => s.role === 'backup' && healthy(s)).map(s => s.line.ppg)));
  m.starterPpg = r1(mean(S.filter(s => s.role !== 'backup' && healthy(s)).map(s => s.line.ppg)));
  /* The typed gates of the old awards block: what share of qualified seasons (62 games) pass each. */
  const q = S.filter(s => s.line.games >= 62);
  const bigs = q.filter(s => s.pos === 'PF' || s.pos === 'C');
  const withPrev = q.filter(s => s.prev && s.prev.games >= 40);
  m.gates = {
    ppg28: r3(share(q.filter(s => s.line.ppg >= 28).length, q.length)),
    apg10: r3(share(q.filter(s => s.line.apg >= 10).length, q.length)),
    rpg11: r3(share(q.filter(s => s.line.rpg >= 11).length, q.length)),
    rpg125big: r3(share(bigs.filter(s => s.line.rpg >= 12.5).length, bigs.length)),
    jump6: r3(share(withPrev.filter(s => s.line.ppg - s.prev.ppg >= 6).length, withPrev.length)),
    ppg14: r3(share(q.filter(s => s.line.ppg >= 14).length, q.length)),
  };
  /* Readers this round does not own (the lead's list): how often each passes. */
  m.tripleDouble = S.filter(s => s.line.ppg >= 10 && s.line.rpg >= 10 && s.line.apg >= 10).length;
  m.ppg16share = r2(share(S.filter(s => s.line.games > 0 && s.line.ppg >= 16).length, S.length));
  m.career12k = r2(share(f.careers.filter(c => c.pts >= 12000).length, n));
  m.career25k = r2(share(f.careers.filter(c => c.pts >= 25000).length, n));
  m.bothTitles = S.filter(s => has(s.line, 'Scoring Champion') && has(s.line, 'Assists Leader')).length;
  const wings = S.filter(s => (s.pos === 'SG' || s.pos === 'SF') && s.role !== 'backup');
  m.wing8ast = r3(share(wings.filter(s => s.line.apg >= 8).length, wings.length));
  /* The field as the fleet lives it: mean and sd of the season score by position, half a schedule or more. */
  m.field = Object.fromEntries(POS.map(p => { const v = S.filter(s => s.pos === p && s.line.games >= 41).map(s => E.awards.nbaSeasonScore(s.line)); return [p, [r2(mean(v)), r2(sdOf(v))]]; }));
  return m;
}

const neutralScore = s => E.awards.nbaSeasonScore(E.norms ? E.norms.nbaEraNeutral(s.line, s.line.year) : s.line);
/** What the awards are judged against, measured the way the player lives it: every season of half a schedule
 *  or more in the fleet, bench years included, scored on the era neutral line. One population for every table. */
/* SENSE_FIELD_POP=starters measures the field on starter seasons only, to see what that population would give
   (tried in Round 1103: it does not concentrate the awards, careers with an MVP 18.3 against 18.5 percent). */
const FIELD_POP = process.env.SENSE_FIELD_POP || 'all';
function fieldOf(f) {
  return Object.fromEntries(POS.map(p => { const v = f.seasons.filter(s => s.pos === p && s.line.games >= 41 && (FIELD_POP === 'all' || s.role !== 'backup')).map(neutralScore); return [p, { mean: mean(v), sd: sdOf(v), n: v.length }]; }));
}
/** The three typed gates that are not league facts: the value on this line at the percentile each sat at on main. */
function reanchor(f, mainGates) {
  const q = f.seasons.filter(s => s.line.games >= 62);
  const withPrev = q.filter(s => s.prev && s.prev.games >= 40);
  const at = (arr, passing) => pctl(arr, 1 - passing / 100);
  return { rpg11: at(q.map(s => s.line.rpg), mainGates.rpg11), jump6: at(withPrev.map(s => s.line.ppg - s.prev.ppg), mainGates.jump6), ppg14: at(q.map(s => s.line.ppg), mainGates.ppg14) };
}
/** For the four awards the old block decides on the season score alone: the award's expected rate a career as
 *  a function of its grade, worked out exactly from every season's z (the chance a z beats the best of n is
 *  exp(-exp(-(z - grade - loc) * root)), careerAwards.ts bestOfN). The z is read against THIS fleet's own field,
 *  so one run gives the field rows and the grades that hold main's rates on those rows. */
function gradeFit(f) {
  const fld = fieldOf(f);
  const beats = (z, n, g) => { const L = Math.log(Math.max(2, n)); const root = Math.sqrt(2 * L); const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root); return Math.exp(-Math.exp(-(z - g - loc) * root)); };
  const S = f.seasons.map(s => ({ i: s.i, z: (neutralScore(s) - fld[s.pos].mean) / fld[s.pos].sd, games: s.line.games, won: s.line.teamResult === 'WON THE NBA FINALS', rookie: s.n === 0, anchor: ARCH[s.arch].rebounding >= 1.3 && s.line.rpg >= DPOY_GATE }));
  const q = S.filter(s => s.games >= 62);
  const champs = S.filter(s => s.won);
  const rate = (rows, n) => g => rows.reduce((t, s) => t + beats(s.z, n, g), 0) / f.careers.length;
  /* The share of careers that win it at least once, at a grade: one minus the product of the season misses. */
  const ever = (rows, n) => g => { const miss = new Map(); for (const s of rows) miss.set(s.i, (miss.get(s.i) ?? 1) * (1 - beats(s.z, n, g))); let t = 0; for (const m of miss.values()) t += 1 - m; return (100 * t) / f.careers.length; };
  return { 'MVP': rate(q, 150), 'All-NBA': rate(q, 10), 'All-Defensive Team': rate(q, 15), 'Finals MVP': rate(champs, 7), everMvp: ever(q, 150), everAllNba: ever(q, 10),
    'Rookie of the Year': rate(S.filter(s => s.rookie), 45), 'Defensive Player of the Year': rate(q.filter(s => s.anchor), 150) };
}
/* The Defensive Player gate as the engine applies it, read off the source so the fit follows the constant. */
const dpoyGate = srcOf('src/lib/nbaMyCareer.ts').match(/^const NBA_DPOY_RPG_GATE = ([0-9.]+);$/m);
const DPOY_GATE = dpoyGate ? Number(dpoyGate[1]) : 11;
/** The grade at which the five seed mean of `rates` equals `target` (the rate falls as the grade rises). */
function solveGrade(rates, target) {
  let lo = -4; let hi = 4;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mean(rates.map(r => r(mid))) > target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** The committed field row for a position, read back through the engine's own z. */
function committedField(pos) {
  const z0 = E.awards.nbaFieldZ(pos, 0); const z1 = E.awards.nbaFieldZ(pos, 1);
  const sd = 1 / (z1 - z0);
  return { mean: -z0 * sd, sd };
}

/* ------------------------------------------------------------------ */
/* Section A's numbers: the line against the real league               */
/* ------------------------------------------------------------------ */
const ARCH = Object.fromEntries(POS.flatMap(p => nba.NBA_ARCHETYPES[p].map(a => [a.id, a])));
const STATS = [['mpg', 'mpg'], ['pts', 'ppg'], ['reb', 'rpg'], ['ast', 'apg'], ['stl', 'spg'], ['blk', 'bpg']];
const median = a => pctl(a, 0.5);
/** The form simNbaSeason gave a recorded season, its swing drawn again from the same law on the harness's own
 *  stream (the engine keeps the swing to itself; the distribution is what a fit needs, not the pairing). */
const formOf = (s, rnd) => s.ovr + (s.morale - 60) / 12 + (s.tq - 78) / 8 + E.seasonSwing(rnd, s.age);

/** One seed's section A numbers. Modern careers only. When the engine does not write the new line yet (step 3b)
 *  every season is REPLAYED through nbaStatLineFor from what the engine knew going in; once it does, the saved
 *  line is read. The 2003 arm is always a replay of the same modern seasons with the year set to 2003. */
function lineStats(f, seed) {
  const rnd = mulberry32(seed * 9973 + 5);
  const live = f.seasons.some(s => nba.isNbaNewLine(s.line));
  const rows = f.seasons.filter(s => s.era === 'now').map(s => {
    const input = { form: formOf(s, rnd), pos: s.pos, archetype: ARCH[s.arch], role: s.role, seasonsPlayed: s.n };
    const replay = nba.nbaStatLineFor({ ...input, year: 2026 }, rnd);
    return { pos: s.pos, arch: s.arch, ovr: s.ovr, role: s.role, n: s.n, games: s.line.games, now: live ? s.line : replay, old: nba.nbaStatLineFor({ ...input, year: 2003 }, rnd) };
  });
  const starters = rows.filter(r => r.role !== 'backup' && r.games >= 58);
  const out = { live, rows: rows.length, starters: starters.length, med: { now: {}, y2004: {} }, n: {}, p99: {}, bands: {} };
  for (const p of POS) {
    const mine = starters.filter(r => r.pos === p);
    out.n[p] = mine.length;
    out.med.now[p] = Object.fromEntries(STATS.map(([k, key]) => [k, median(mine.map(r => r.now[key]))]));
    out.med.y2004[p] = Object.fromEntries(STATS.map(([k, key]) => [k, median(mine.map(r => r.old[key]))]));
    out.bands[p] = ['72-75', '76-79', '80-83', '84-87', '88-91', '92-95'].map(b => { const v = mine.filter(r => band(r.ovr) === b); return { b, n: v.length, pts: mean(v.map(r => r.now.ppg)), reb: mean(v.map(r => r.now.rpg)), ast: mean(v.map(r => r.now.apg)), mpg: mean(v.map(r => r.now.mpg ?? 0)) }; });
  }
  for (const [k, key] of [['pts', 'ppg'], ['reb', 'rpg'], ['ast', 'apg']]) out.p99[k] = pctl(starters.map(r => r.now[key]), 0.99);
  const rook = rows.filter(r => r.n === 0 && r.games >= 58 && r.ovr >= 75 && r.ovr <= 79);
  out.rookies = { n: rook.length, ppg: mean(rook.map(r => r.now.ppg)), starters: mean(rook.filter(r => r.role !== 'backup').map(r => r.now.ppg)), bench: mean(rook.filter(r => r.role === 'backup').map(r => r.now.ppg)) };
  const wings = starters.filter(r => r.pos === 'SG' || r.pos === 'SF');
  out.wing8 = { n: wings.length, share: share(wings.filter(r => r.now.apg >= 8).length, wings.length) };
  const bench = rows.filter(r => r.role === 'backup' && r.games >= 58);
  out.bench = { n: bench.length, ppg: mean(bench.map(r => r.now.ppg)), mpg: mean(bench.map(r => r.now.mpg ?? 0)), ratio: mean(bench.map(r => r.now.ppg)) / mean(starters.map(r => r.now.ppg)) };
  out.thirty = share(starters.filter(r => r.now.ppg >= 30).length, starters.length);
  out.tenAst = share(starters.filter(r => r.now.apg >= 10).length, starters.length);
  out.tripleDouble = rows.filter(r => r.now.ppg >= 10 && r.now.rpg >= 10 && r.now.apg >= 10).length;
  out.decimals = { n: rows.length, oneDecimal: rows.every(r => Math.abs(r.now.ppg * 10 - Math.round(r.now.ppg * 10)) < 1e-9), nonZero: share(rows.filter(r => Math.round(r.now.ppg * 10) % 10 !== 0).length, rows.length) };
  out.allMed = Object.fromEntries(POS.map(p => { const v = rows.filter(r => r.pos === p && r.games >= 41); return [p, [r1(median(v.map(r => r.now.ppg))), r1(median(v.map(r => r.now.rpg))), r1(median(v.map(r => r.now.apg)))]]; }));
  return out;
}

/** The elite sweep scripts/simCareerParity.mjs runs for its badge check (rating 93, ceiling 99, a 90 club), here
 *  for one thing: can anyone still reach 10, 10 and 10. Returns triple double seasons over `n` careers. */
function eliteTripleDoubles(seed, n) {
  const rnd = mulberry32(seed * 31337 + 7);
  Math.random = rnd;
  let hits = 0;
  for (let i = 0; i < n; i++) {
    const pos = POS[i % 5];
    const c = nba.startNbaCareer(`Elite ${i}`, pos, nba.NBA_ARCHETYPES[pos][i % 3], rnd, null);
    c.ovr = 93; c.pot = 99;
    let guard = 0;
    while (guard++ < 30) {
      const { line } = nba.simNbaSeason(c, 90, rnd);
      if (line.ppg >= 10 && line.rpg >= 10 && line.apg >= 10) hits++;
      nba.nbaProgress(c, rnd);
      if (nba.nbaShouldRetire(c)) break;
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* The other three sports: a hash of every career, and two printed rates */
/* ------------------------------------------------------------------ */
const OTHER = {
  nfl: { pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], arch: () => nfl.ARCHETYPES, start: (...a) => nfl.startCareer(...a), tq: (...a) => nfl.rollTeamQuality(...a), sim: (...a) => nfl.simSeason(...a), prog: (...a) => nfl.progress(...a), stop: c => nfl.shouldRetire(c) },
  mlb: { pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], arch: () => mlb.MLB_ARCHETYPES, start: (...a) => mlb.startMlbCareer(...a), tq: (...a) => mlb.mlbRollTeamQuality(...a), sim: (...a) => mlb.simMlbSeason(...a), prog: (...a) => mlb.mlbProgress(...a), stop: c => mlb.mlbShouldRetire(c) },
  nhl: { pos: ['C', 'LW', 'RW', 'D', 'G'], arch: () => nhl.NHL_ARCHETYPES, start: (...a) => nhl.startNhlCareer(...a), tq: (...a) => nhl.nhlRollTeamQuality(...a), sim: (...a) => nhl.simNhlSeason(...a), prog: (...a) => nhl.nhlProgress(...a), stop: c => nhl.nhlShouldRetire(c) },
};
/** Each engine's own loop (the one scripts/simAwards.mjs walks), `per` careers on one seed. Returns the sha256
 *  of every season line and every numeric counter on the final save, and the season lines for the prints. */
function playOther(sport, seed, per) {
  const d = OTHER[sport];
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729);
  Math.random = rnd;
  const h = crypto.createHash('sha256');
  const lines = [];
  for (let i = 0; i < per; i++) {
    const pos = d.pos[i % d.pos.length];
    const archs = d.arch()[pos];
    const c = d.start('Sim', pos, archs[i % archs.length], rnd, null);
    let tq = null; let guard = 0; let done = false;
    while (!done && guard++ < 30) {
      tq = d.tq(tq, rnd); d.sim(c, tq, rnd); d.prog(c, rnd);
      if (d.stop(c)) done = true;
    }
    const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
    h.update(JSON.stringify({ seasons: c.seasons, counters }));
    for (const s of c.seasons) lines.push(s);
  }
  return { hash: h.digest('hex'), lines };
}

/* ------------------------------------------------------------------ */
/* The baseline file                                                   */
/* ------------------------------------------------------------------ */
const readBaseline = () => (existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : {});
const gitHead = () => execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim();
function refuseDirty(what) {
  const dirty = execSync('git status --porcelain -- src scripts', { cwd: ROOT }).toString().split('\n').map(l => l.trim()).filter(Boolean)
    .filter(l => !/scripts\/simNbaAwardsSense[.]mjs$/.test(l) && !/scripts\/data\/nbaAwardsSenseBaseline[.]json$/.test(l));
  if (dirty.length) { console.error(`${what}: refusing on a dirty tree:\n  ${dirty.join('\n  ')}`); process.exit(2); }
}
function writeBaseline(b) { writeFileSync(BASELINE_FILE, JSON.stringify(b, null, 1) + '\n'); }

const RECORD_NBA = ARGS.includes('--record-nba-baseline');
const REBASE_AT = ARGS.indexOf('--rebase-nba');
const RECORD_OTHERS = ARGS.includes('--record-others');
if ((RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) && (CONTROL || TRY_SCALE)) { console.error('a control run or a trial scale never records'); process.exit(2); }
if ((RECORD_NBA || REBASE_AT >= 0) && !FULL) { console.error('the NBA baseline is recorded at full size only (6,000 careers a seed, five seeds)'); process.exit(2); }
if (RECORD_NBA && readBaseline().nba) { console.error('--record-nba-baseline: the nba key exists. It is written once. A round that moves it on purpose uses --rebase-nba "<reason>".'); process.exit(2); }
if (REBASE_AT >= 0 && !(ARGS[REBASE_AT + 1] || '').trim()) { console.error('--rebase-nba needs a reason in quotes'); process.exit(2); }
if (RECORD_NBA || REBASE_AT >= 0 || RECORD_OTHERS) refuseDirty('record');

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */
let checks = 0;
let failed = 0;
const failedSections = new Set();
/** An exact check: judged at every size. */
function exact(section, cond, msg) {
  checks++;
  if (cond) console.log(`  ok   [${section}] ${msg}`);
  else { failed++; failedSections.add(section); console.log(`  FAIL [${section}] ${msg}`); }
}
/** A band: judged at full size, or on a shrunk run that asks for it with SENSE_JUDGE=1 (how a control is run in
 *  a minute instead of ten: the bands held at main's rate widen by the square root of the size ratio, and the
 *  plain run at that same size has to be green first). Any other shrunk run prints it. */
const JUDGE = FULL || process.env.SENSE_JUDGE === '1';
const WIDEN = FULL ? 1 : Math.sqrt(6000 / CAREERS);
function banded(section, cond, msg) {
  if (!JUDGE) { console.log(`  note [${section}] ${msg} (quick run, bands not judged)`); return; }
  exact(section, cond, msg);
}
const get = (o, key) => key.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
/** Main's band for one number: its lowest seed minus its own seed spread, to its highest plus it. */
function mainBand(base, key) {
  const v = base.seeds.map(s => get(s.m, key));
  const lo = Math.min(...v); const hi = Math.max(...v); const spread = hi - lo;
  const mid = (lo + hi) / 2; const half = (hi - lo) / 2 + spread;
  return { lo: mid - half * WIDEN, hi: mid + half * WIDEN, v };
}
function heldAtMain(section, base, per, key, label) {
  const b = mainBand(base, key);
  const now = per.map(m => get(m, key));
  const out = now.filter(x => x < b.lo || x > b.hi).length;
  banded(section, out === 0, `${label}: ${now.join(', ')} against main ${b.v.join(', ')} (band ${r3(b.lo)} to ${r3(b.hi)})`);
}

/* ------------------------------------------------------------------ */
/* Play                                                                */
/* ------------------------------------------------------------------ */
const t0 = Date.now();
console.log(`simNbaAwardsSense: ${CAREERS} careers a seed, seeds ${SEEDS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${TRY_SCALE ? `, TRIAL legacy scale ${TRY_SCALE}` : ''}${FULL ? '' : JUDGE ? ` (shrunk run, bands judged ${WIDEN.toFixed(2)} times wider)` : ' (quick run, bands not judged)'}`);
const per = [];
const aStats = [];
const fields = [];
const anchors = [];
const fits = [];
const preBase = readBaseline();
const meanOfSeeds = key => (preBase.nba ? mean(preBase.nba.seeds.map(s => get(s.m, key))) : null);
const mainGates = preBase.nba ? { rpg11: meanOfSeeds('gates.rpg11'), jump6: meanOfSeeds('gates.jump6'), ppg14: meanOfSeeds('gates.ppg14') } : null;
const HAS_LINE = typeof nba.nbaStatLineFor === 'function';
for (const seed of SEEDS) {
  const f = playFleet(seed, CAREERS);
  const m = measure(f);
  per.push(m);
  if (HAS_LINE) aStats.push(lineStats(f, seed));
  fields.push(fieldOf(f));
  if (mainGates) anchors.push(reanchor(f, mainGates));
  fits.push(gradeFit(f));
  console.log(`  seed ${seed}: ${m.seasons} seasons, Hall ${m.inducted}% (first ballot ${m.firstBallot}%), MVPs ${m.perCareer.MVP} a career, All-NBA ${m.perCareer['All-NBA']}, my share ${m.myShare}%, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
const others = {};
for (const sport of Object.keys(OTHER)) others[sport] = SEEDS.map(seed => playOther(sport, seed, OTHERS_PER));

/* ------------------------------------------------------------------ */
/* Record                                                              */
/* ------------------------------------------------------------------ */
if (RECORD_NBA || REBASE_AT >= 0) {
  const b = readBaseline();
  b.nba = { recordedOn: gitHead(), careers: CAREERS, seeds: SEEDS.map((seed, k) => ({ seed, m: per[k] })) };
  if (REBASE_AT >= 0) b.nba.rebased = { reason: ARGS[REBASE_AT + 1], commit: gitHead() };
  writeBaseline(b);
  console.log(`recorded the nba baseline on ${b.nba.recordedOn}`);
}
if (RECORD_OTHERS || (RECORD_NBA && !readBaseline().others)) {
  const b = readBaseline();
  b.others = { recordedOn: gitHead(), per: OTHERS_PER, seeds: SEEDS, hashes: Object.fromEntries(Object.keys(OTHER).map(s => [s, others[s].map(o => o.hash)])) };
  writeBaseline(b);
  console.log(`recorded the other sports' hashes on ${b.others.recordedOn}`);
}
const base = readBaseline();

/* ------------------------------------------------------------------ */
/* The table every run prints                                          */
/* ------------------------------------------------------------------ */
const row = (label, key) => console.log(`  ${label.padEnd(44)} ${per.map(m => String(get(m, key))).join(', ')}${base.nba ? `   | main ${base.nba.seeds.map(s => String(get(s.m, key))).join(', ')}` : ''}`);
console.log('\nThe numbers (this tree, seed by seed, then main):');
row('Hall of Fame inducted, percent', 'inducted'); row('first ballot, percent', 'firstBallot');
row('inducted, modern careers', 'inducted_now'); row('inducted, 2003-04 careers', 'inducted_y2004');
row('legacy score p50', 'scoreP50'); row('legacy score p90', 'scoreP90');
for (const a of AWARDS) row(`${a} a career`, `perCareer.${a}`);
row('careers with an MVP, percent', 'everMvp'); row('careers with an All-NBA, percent', 'everAllNba');
row('MVP seasons that missed the playoffs, percent', 'mvpMissedPlayoffs'); row('MVP seasons not All-NBA, percent', 'mvpNotAllNba'); row('MVP and Most Improved together, percent', 'mvpAlsoMip');
row('Rookie of the Year seasons', 'roySeasons'); row('of them on All-Rookie', 'royOnAllRookie'); row('All-Rookie in a first season', 'allRookieInFirstSeason');
row('my share of the head to head years', 'myShare'); row('verdict disagrees with the printed lines', 'rivalDisagree');
row('starter points / bench points / rookie starters', 'starterPpg'); row('  bench', 'benchPpg'); row('  rookie starters', 'rookieStarterPpg');
row('triple double seasons', 'tripleDouble'); row('seasons at 16 points or more, percent', 'ppg16share');
row('careers past 12,000 points, percent', 'career12k'); row('careers past 25,000 points, percent', 'career25k');
row('scoring and assists title together', 'bothTitles'); row('SG and SF starter seasons at 8 assists, percent', 'wing8ast');
for (const g of ['ppg28', 'apg10', 'rpg11', 'rpg125big', 'jump6', 'ppg14']) row(`gate ${g}, percent of qualified seasons`, `gates.${g}`);
for (const b of ['80-83', '88-91']) console.log(`  healthy starters rated ${b}: ${POS.map(p => `${p} ${per.map(m => m.starters[b][p].slice(0, 3).join('/')).join(' | ')}`).join('   ')}`);
console.log(`  All-Defensive a career by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].allDefByArch[a]}`).join(', ')}`);
console.log(`  my share by archetype (seed ${SEEDS[0]}): ${ARCH_IDS.map(a => `${a} ${per[0].myShareByArch[a]}`).join(', ')}`);
console.log(`  the field as the fleet lives it (mean, sd): ${POS.map(p => `${p} ${per.map(m => m.field[p].join('/')).join(' | ')}`).join('   ')}`);

/* What a builder pastes: the field rows, the three re-anchored gates and the grades that hold main's rates. */
const fieldMean = Object.fromEntries(POS.map(p => [p, { mean: mean(fields.map(x => x[p].mean)), sd: mean(fields.map(x => x[p].sd)) }]));
console.log(`\nThe field, measured on the simNbaAwardsSense fleet (${SEEDS.length} seed mean, era neutral, half a schedule or more):`);
for (const p of POS) console.log(`    ${p}: { mean: ${fieldMean[p].mean.toFixed(1)}, sd: ${fieldMean[p].sd.toFixed(1)} },   // seeds: ${fields.map(x => `${x[p].mean.toFixed(1)}/${x[p].sd.toFixed(1)}`).join(' ')}`);
if (anchors.length) console.log(`The gates at main's percentile: rebounds for Defensive Player ${anchors.map(a => a.rpg11.toFixed(1)).join(', ')} (was 11, ${mainGates.rpg11.toFixed(2)}% pass); the jump for Most Improved ${anchors.map(a => a.jump6.toFixed(1)).join(', ')} (was 6, ${mainGates.jump6.toFixed(2)}%); points for Sixth Man ${anchors.map(a => a.ppg14.toFixed(1)).join(', ')} (was 14, ${mainGates.ppg14.toFixed(2)}%)`);
if (preBase.nba) {
  console.log('The grade that holds main\'s rate on this fleet\'s own field (worked out from every season\'s z, not drawn):');
  for (const a of ['MVP', 'All-NBA', 'All-Defensive Team', 'Finals MVP', 'Rookie of the Year', 'Defensive Player of the Year']) {
    const target = meanOfSeeds(`perCareer.${a}`);
    const g = solveGrade(fits.map(x => x[a]), target);
    const ever = a === 'MVP' ? `; careers with one at that grade ${mean(fits.map(x => x.everMvp(g))).toFixed(2)} percent (main ${meanOfSeeds('everMvp').toFixed(2)})` : a === 'All-NBA' ? `; careers with one at that grade ${mean(fits.map(x => x.everAllNba(g))).toFixed(2)} percent (main ${meanOfSeeds('everAllNba').toFixed(2)})` : '';
    console.log(`    ${a.padEnd(20)} main ${target.toFixed(3)} a career, grade ${g.toFixed(2)}${ever}`);
  }
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */
console.log('\nSections:');

/* E, the field is the engine's: the committed rows are what the fleet lives. */
if (typeof E.awards.nbaFieldZ === 'function') {
  for (const p of POS) {
    const c = committedField(p);
    const meanOff = fields.map(x => Math.abs(x[p].mean - c.mean) / c.sd);
    const sdOff = fields.map(x => Math.abs(x[p].sd / c.sd - 1));
    banded('E', meanOff.every(x => x <= E_MEAN_TOL) && sdOff.every(x => x <= E_SD_TOL), `${p}: the committed field ${c.mean.toFixed(1)}/${c.sd.toFixed(1)} against the fleet ${fields.map(x => `${x[p].mean.toFixed(1)}/${x[p].sd.toFixed(1)}`).join(' ')} (mean off by at most ${Math.max(...meanOff).toFixed(3)} sd, limit ${E_MEAN_TOL}; sd off by at most ${(Math.max(...sdOff) * 100).toFixed(1)} percent, limit ${E_SD_TOL * 100})`);
  }
}

/* A, the line against the norms. */
if (HAS_LINE) {
  const N = E.norms;
  const live = aStats[0].live;
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  console.log(`  A reads ${live ? 'the lines the engine saved' : 'a REPLAY of the recorded seasons through nbaStatLineFor (the engine does not call it yet)'}; healthy starters of modern careers: ${aStats.map(a => a.starters).join(', ')}`);
  const normBand = (era, pos, k) => { const q = N.NBA_STARTER_NORMS[era][pos][k]; const pad = N.NBA_NORMS_PARTIAL.includes(`${era}.${pos}.${k}`) ? 0.15 * q.p50 : 0; return { lo: q.p25 - pad, hi: q.p75 + pad, q }; };
  /* A1: the median healthy starter sits inside the real starters' quartiles, stat by stat, position by position. */
  for (const era of ['now', 'y2004']) {
    let outside = 0; let cells = 0; const thin = [];
    for (const p of POS) {
      const parts = [];
      for (const [k] of STATS) {
        const b = normBand(era, p, k);
        const meds = aStats.map(a => a.med[era][p][k]);
        const m = mean(meds);
        const inside = meds.every(x => x >= b.lo - 1e-9 && x <= b.hi + 1e-9);
        const edge = Math.min(m - b.lo, b.hi - m) / (b.hi - b.lo);
        cells++; if (!inside) outside++;
        if (inside && edge < 0.1) thin.push(`${p} ${k} ${(edge * 100).toFixed(0)}%`);
        parts.push(`${k} ${f1(m)} in ${f1(b.lo)}..${f1(b.hi)} (${inside ? `${(edge * 100).toFixed(0)}% in` : 'OUT'})`);
        if (era === 'now') {
          if (aStats.some(a => a.n[p] < 1000) && FULL) exact('A1', false, `${p}: fewer than 1,000 healthy starter seasons a seed (${aStats.map(a => a.n[p]).join(', ')}): the check is empty`);
          banded('A1', inside, `${p} ${k}: median ${meds.map(f1).join(', ')} inside the real starters' ${f1(b.lo)} to ${f1(b.hi)} (p25 ${b.q.p25}, p75 ${b.q.p75}${b.lo < b.q.p25 ? ', partial key, 15 percent of the median wider' : ''}); ${(edge * 100).toFixed(0)} percent of the band from the nearer edge`);
        }
      }
      if (era === 'y2004') console.log(`  note [A1 2003, printed] ${p}: ${parts.join('; ')}`);
    }
    if (era === 'y2004') console.log(`  note [A1 2003, printed] ${outside} of ${cells} cells outside the 2003-04 quartiles (not judged: the lead sets how many may miss)`);
    else if (thin.length) console.log(`  note [A1] under a tenth of the band from an edge (refit, do not accept): ${thin.join(', ')}`);
  }
  /* The unit check that IS judged for 2003: the same input drawn 2,000 times at each year gives the league rows' ratio. */
  {
    const rnd = mulberry32(77);
    const input = { form: 84, pos: 'SF', archetype: ARCH.pointforward, role: 'starter', seasonsPlayed: 5 };
    const draw = year => { const acc = { ppg: 0, rpg: 0, apg: 0, spg: 0, bpg: 0 }; for (let i = 0; i < 2000; i++) { const l = nba.nbaStatLineFor({ ...input, year }, rnd); for (const k of Object.keys(acc)) acc[k] += l[k]; } return acc; };
    const then = draw(2003); const today = draw(2026);
    const rows = [['ppg', 'pts'], ['rpg', 'reb'], ['apg', 'ast'], ['spg', 'stl'], ['bpg', 'blk']].map(([k, n]) => ({ k, got: then[k] / today[k], want: N.NBA_LEAGUE_PER_GAME.y2004[n] / N.NBA_LEAGUE_PER_GAME.now[n] }));
    exact('A1', rows.every(r => Math.abs(r.got / r.want - 1) <= 0.02), `the 2003 line over the 2026 line is the league rows' ratio within 2 percent: ${rows.map(r => `${r.k} ${r.got.toFixed(3)} against ${r.want.toFixed(3)}`).join(', ')}`);
  }
  /* A2: the p99 starter season (never the max) is at or under the leaders' mean plus one sd. */
  for (const k of ['pts', 'reb', 'ast']) {
    const bar = N.nbaLeaderBar(k, 2026);
    const v = aStats.map(a => a.p99[k]);
    banded('A2', v.every(x => x <= bar.mean + bar.sd), `the p99 starter season in ${k}: ${v.map(f1).join(', ')} at or under the league leaders' mean plus one sd (${f1(bar.mean)} + ${f1(bar.sd)})`);
  }
  /* A3: the promises. */
  banded('A3', aStats.every(a => a.rookies.ppg >= 7.5 && a.rookies.ppg <= 11.5), `rookies rated 75 to 79 average ${aStats.map(a => f1(a.rookies.ppg)).join(', ')} points (7.5 to 11.5); starters ${aStats.map(a => f1(a.rookies.starters)).join(', ')}, bench ${aStats.map(a => f1(a.rookies.bench)).join(', ')}; ${aStats.map(a => a.rookies.n).join(', ')} seasons`);
  banded('A3', aStats.every(a => a.wing8.share < 1), `SG and SF starter seasons at 8 assists or more: ${aStats.map(a => a.wing8.share.toFixed(2)).join(', ')} percent of theirs (under 1; main about 19)`);
  banded('A3', aStats.every(a => a.bench.ratio >= 0.36 && a.bench.ratio <= 0.56), `bench seasons score ${aStats.map(a => (a.bench.ratio * 100).toFixed(0)).join(', ')} percent of starters' (36 to 56): ${aStats.map(a => f1(a.bench.ppg)).join(', ')} points in ${aStats.map(a => f1(a.bench.mpg)).join(', ')} minutes`);
  exact('A3', aStats.every(a => a.decimals.oneDecimal && a.decimals.nonZero >= 10), `every new season's points have one decimal, and ${aStats.map(a => a.decimals.nonZero.toFixed(0)).join(', ')} percent of them a non zero one (at least 10)`);
  if (live) banded('A3', per.every(m => m.bothTitles * 2000 < m.careers), `seasons holding both the scoring and the assists title: ${per.map(m => m.bothTitles).join(', ')} (under 1 in 2,000 careers; main ${base.nba ? base.nba.seeds.map(s => s.m.bothTitles).join(', ') : '?'})`);
  console.log(`  note [A3] 30 points a game: ${aStats.map(a => a.thirty.toFixed(2)).join(', ')} percent of starter seasons; 10 assists: ${aStats.map(a => a.tenAst.toFixed(2)).join(', ')}; triple double seasons in the fleet: ${aStats.map(a => a.tripleDouble).join(', ')}`);
  /* The triple double badge has one man who can reach it on this line, a Point Forward at the very top. Seen
     here, in the elite sweep scripts/simCareerParity.mjs runs for its badge check (rating 93, ceiling 99, a 90
     club, thirty careers), so a long detached harness is not where it is found out. */
  if (live) {
    const elite = SEEDS.map(seed => eliteTripleDoubles(seed, 30));
    banded('A3', elite.every(n => n >= ELITE_TD_FLOOR), `triple double seasons in thirty elite careers: ${elite.join(', ')} (at least ${ELITE_TD_FLOOR} on every seed, so the badge stays reachable)`);
  }
  console.log(`  note [A] medians, every role, half a season or more (points/rebounds/assists): ${POS.map(p => `${p} ${aStats[0].allMed[p].join('/')}`).join('  ')}`);
  /* A4: points rise with the rating at every position (bands of 200 seasons or more). */
  for (const p of POS) {
    const rising = aStats.every(a => { const b = a.bands[p].filter(x => x.n >= 200); return b.every((x, i) => i === 0 || x.pts > b[i - 1].pts); });
    exact('A4', rising, `${p}: mean points rise with every rating band (seed ${SEEDS[0]}: ${aStats[0].bands[p].filter(x => x.n >= 200).map(x => `${x.b} ${f1(x.pts)}/${f1(x.reb)}/${f1(x.ast)} in ${f1(x.mpg)}`).join(', ')})`);
  }
  /* A5: the function is pure and always draws the same number of times. */
  {
    const counted = input => { let n = 0; const r = mulberry32(5); nba.nbaStatLineFor(input, () => { n++; return r(); }); return n; };
    const base5 = { form: 82, pos: 'C', archetype: ARCH.anchor, role: 'starter', seasonsPlayed: 4, year: 2026 };
    const cases = [base5, { ...base5, role: 'backup' }, { ...base5, seasonsPlayed: 0 }, { ...base5, playoffs: true }];
    exact('A5', cases.every(c => counted(c) === nba.NBA_LINE_DRAWS), `nbaStatLineFor draws exactly ${nba.NBA_LINE_DRAWS} times for a starter, a backup, a rookie and a playoff line (${cases.map(counted).join(', ')})`);
    const frozen = JSON.stringify(base5);
    const one = nba.nbaStatLineFor(base5, mulberry32(9)); const two = nba.nbaStatLineFor(base5, mulberry32(9));
    exact('A5', JSON.stringify(one) === JSON.stringify(two) && JSON.stringify(base5) === frozen, 'the same input and seed give the same line, and the input is left untouched');
  }
}

if (!base.nba) exact('baseline', false, 'scripts/data/nbaAwardsSenseBaseline.json has no nba key: record it once with --record-nba-baseline');
else {
  /* R, the rival: my share of the head to head years stays where main had it. */
  heldAtMain('R', base.nba, per, 'myShare', 'my share of the head to head years, percent');
  /* H, the Hall: inducted and first ballot stay inside main's bands. */
  heldAtMain('H', base.nba, per, 'inducted', 'Hall of Fame inducted, percent');
  heldAtMain('H', base.nba, per, 'firstBallot', 'first ballot, percent');
  /* B6a, the award rates the old grades were set for, held where main had them. */
  for (const [key, label] of [['perCareer.MVP', 'MVPs a career'], ['perCareer.All-NBA', 'All-NBA a career'], ['perCareer.All-Defensive Team', 'All-Defensive a career'], ['perCareer.Finals MVP', 'Finals MVPs a career'], ['everMvp', 'careers with an MVP, percent'], ['everAllNba', 'careers with an All-NBA, percent']]) {
    heldAtMain('B6a', base.nba, per, key, label);
  }
}

/* C, the other sports did not move. A proof for one round, judged only when asked. */
if (!base.others) exact('C', false, 'the baseline has no others key: record it with --record-others');
else if (!PROVE_OTHERS) console.log('  note [C] other sports: not judged in a plain run (SENSE_PROVE_OTHERS=1 judges the hashes)');
else if (base.others.per !== OTHERS_PER || base.others.seeds.join() !== SEEDS.join()) exact('C', false, `the others baseline was recorded at ${base.others.per} careers on seeds ${base.others.seeds.join()}, this run is ${OTHERS_PER} on ${SEEDS.join()}`);
else for (const sport of Object.keys(OTHER)) {
  const same = others[sport].every((o, k) => o.hash === base.others.hashes[sport][k]);
  exact('C', same, `${sport.toUpperCase()} careers hash equal to the baseline on every seed (${others[sport].map(o => o.hash.slice(0, 8)).join(', ')})`);
}

const size = FULL ? 'full size' : JUDGE ? 'shrunk run, bands judged wider' : 'quick run, bands not judged';
if (CONTROL) {
  /* A control must turn its own section red and no other. Exit 1 when it did (red by design), 3 when it did not. */
  const want = CONTROLS[CONTROL].needs.split(',');
  const may = (CONTROLS[CONTROL].may ?? '').split(',').filter(Boolean);
  const red = [...failedSections];
  const fired = want.every(s => red.includes(s)) && red.every(s => want.includes(s) || may.includes(s));
  console.log(`\ncontrol ${CONTROL}: ${fired ? `FIRED, red in ${red.join(', ')} (must: ${want.join(', ')}${may.length ? `; may follow: ${may.join(', ')}` : ''}) and nowhere else` : `DID NOT FIRE AS DESIGNED, wanted red in ${want.join(', ')}${may.length ? ` (and at most ${may.join(', ')})` : ' only'}, got ${red.join(', ') || 'nothing'}`}`);
  console.log(`simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}, control ${CONTROL}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(fired ? 1 : 3);
}
console.log(`\n${failed ? `red sections: ${[...failedSections].join(', ')}\n` : ''}simNbaAwardsSense: ${checks} checks, ${failed} failed (${size}), ${((Date.now() - t0) / 1000).toFixed(0)}s`);
process.exit(failed ? 1 : 0);
