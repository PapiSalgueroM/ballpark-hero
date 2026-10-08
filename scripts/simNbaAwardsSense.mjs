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
   It ends with one line, "simNbaAwardsSense: N checks, F failed (full size)", and exits by F.

   THE SECTIONS (every count is printed; what is measured, and the measured numbers a band was set from)

   A   The line against the real league (src/data/nbaLeagueNorms.ts). Healthy starters of modern careers.
       A1  the median of minutes, points, rebounds, assists, steals and blocks at each position sits inside
           the real starters' p25 to p75 (a PARTIAL key gets 15 percent of its median more on each side).
           Measured 2026-10-07, five seeds at full size: all thirty cells inside, the nearest 12 percent of
           its band from an edge (PG blocks). The 2003 arm (the same seasons replayed with the year at 2003)
           is PRINTED, not judged: one cell of thirty outside (PF rebounds). What is judged for 2003 is the
           unit check: one input drawn 2,000 times at each year gives the two league rows' ratio within 2
           percent.
       A2  the p99 starter season (never the max), as the mean over the run's seeds, is at or under the league
           leaders' mean plus one sd: points 33.2 to 33.5 against 34.5, rebounds 13.5 to 13.7 against 15.4,
           assists 9.6 to 9.8 against 11.4.
       A3  rookies rated 75 to 79 average 7.9 to 8.1 points (band 7.5 to 11.5). SG and SF starter seasons at 8
           assists: 1.0 to 1.3 percent (band under 2; main 18.5 to 19.2; the brief asked for under 1, which
           would leave the triple double badge to one elite career in thirty). Bench seasons score 46 percent
           of starters' on every seed (band 36 to 56; the brief's 50 to 72 was the old line's, whose flat
           bonus of up to three points paid a bench man the same as a starter). Both the scoring and the
           assists title in one season: 42 in 30,000 careers, and 8 in one fleet of 3,000 (band under 1 in
           250 careers, twice the measured rate and more; main 1 in 13). Triple double seasons in thirty
           elite careers a seed: 5, 4, 6, 6, 2 (band an average of 2 a seed).
       A4  mean points rise with every rating band at every position (bands of 200 seasons or more).
       A5  nbaStatLineFor draws exactly NBA_LINE_DRAWS times and is pure.
   E   The two tables the awards are judged against are what the fleet lives: the season score's field in
       careerAwards.ts (Finals MVP and the rival bridge read it) and NBA_FIELD in nbaCareerAwards.ts (the one
       pass reads it). Each seed's measured mean within 0.08 of the committed row's sd and its sd within 6
       percent (measured across five seeds: at most 0.042 and 2.3 on the first, at most 0.033 and 1.6 on the second).
   R   My share of the head to head years is main's (62.3 to 63.0 percent).
   H   The Hall of Fame inducted rate and the first ballot rate are main's (31.6 to 31.9 and 27.0 to 27.9).
   B   The season's awards make sense together (the one pass, nbaCareerAwards.ts). Counts, so most are exact.
       B0  every award string agrees with the key that names its team, every Defensive Player is on an
           All-Defensive team, every season holds a club record that adds up to its length.
       B1  no MVP on a club that missed the playoffs (main: one in four), none off the All-NBA First Team,
           none who is also Most Improved, no Most Improved after an earlier All-NBA.
       B2  every Rookie of the Year is on the All-Rookie First Team (main: none was on a team at all), and
           All-Rookie is won in a first season only.
       B3  from 2023-24 nobody under the games bar holds an award the real rule names; before it such seasons
           exist (about 2,170 under 65 games in a full size run, band at least 1,750: the old 62 game gate
           leaves 1,341, so the bar62 control turns both halves red); every Sixth Man is a bench season;
           nothing but a Finals MVP is won on less than half a season.
       B4  no All-NBA season without an All-Star selection; All-Star selections a career are 1.59 to 1.63 times
           All-NBA (band 1.25 to 2.4; 24 picks against 15 is 1.6).
       B5  All-Defensive goes to defenders: each of pest, twoway, threed and anchor above each of the six
           scoring archetypes, and their mean at least 3 times the scorers' (measured: pest 4.3, twoway 5.5, threed 3.0 and anchor 3.3 a career against 0.00 to 0.05 for the scorers).
       B6  held at main's rate: MVPs, All-NBA, All-Defensive and Finals MVPs a career. Rookie of the Year
           between main's and three times it (0.044 to 0.049 against 0.022). Printed and judged as above zero,
           because they move by design: the three stat titles, Sixth Man, Most Improved, Defensive Player,
           All-Rookie. How the awards are SPREAD (careers with an MVP, with an All-NBA) is held where Round
           1103 shipped it, and main's is printed beside.
       B7  decideNbaAwards draws exactly NBA_AWARD_DRAWS times and is pure.
   D   One function scores an award for both games: NBA Front Office and NBA My Career import the same file,
       Front Office adds no sum of its own, the two win weights are one number, and cutting the winning term
       out of the shared score (a second bundle) changes BOTH Front Office's ranking and the career's MVPs.
   F   The words: the worked example in the "?" recomputed through the shared score, its clubs checked against
       the engine's record bands, the games rule and the All-Star picks against the rule numbers, the badge
       count on the page against NBA_BADGES.
   C   The NFL, MLB and NHL careers hash equal to the baseline (under SENSE_PROVE_OTHERS=1 only).
   R, H and B6 compare the mean over the run's seeds with the mean over main's, within three standard errors
   (heldAt below says why a seed by seed band was thrown away). An award count's error is worked out from how
   unevenly the award falls over careers, measured in the run: the sd of MVPs a career is 0.82 to 0.86 where
   Poisson would say 0.56 (All-NBA 2.3 to 2.4 against 1.41, All-Defensive 1.9 to 2.5 against 1.16).

   NEGATIVE CONTROLS, SIM_NBA_SENSE_CONTROL=<name>. Each swaps one line of SOURCE in memory (a plugin, never a
   file), refuses when its anchor is not there exactly once or the swap changed nothing, and must turn its own
   section red. A control that moves the line itself drags what reads the line with it, so each lists what
   may follow. A control run exits 1 when it fired as designed and 3 when it did not.
     oldassists       the old assists expression                       A1, A3 red (may: A2, E, R, H, B4, B6)
     stalefield       the PG row of the season score's field one sd stale   E red (may: R, H, B6)
     staleawardfield  the PG row of NBA_FIELD's MVP score one sd stale   E red (may: H, B4, B6)
     nobridge         the raw score handed to the rival                R red
     noscale          the legacy constant back to 1                    H red (refuses when it is 1)
     nomvpworth       an MVP worth nothing to the legacy score         H red
     independent      MVP with no First Team gate and no playoff gate  B1 red (may: B3, B6, H)
     rookieage        the rookie test back to 22 or older, two seasons   B2 red (may: B6)
     bar62            62 games in every era                            B3 red, both halves (may: B6, H)
     scorersdefend    the defensive awards read the MVP score          B5 red (may: B6)
     oldgrades        the All-NBA and MVP grades back to 0.15 and none   B6 red (may: H, B4)
     privatecopy      Front Office adding its own sum again            D red
     weightdrift      the career's win weight at 19                    D red (may: E, B6)
     example          the worked example's winning club read as its losing one   F red
     othersport       one NFL All-Pro grade moved by a hundredth       C red (needs SENSE_PROVE_OTHERS=1)
   A control is run at full size where a full run is cheap (about two minutes on a CI runner), or shrunk and
   judged, SENSE_JUDGE=1 SENSE_CAREERS=1500 SENSE_SEEDS=1,2, after the plain run at that size is green.
   Measured 2026-10-08 on 94286364: 124 checks, 0 failed at full size, the shrunk plain run green on seeds 1,2
   and on 3,4, and all fifteen controls fired as designed, each red in its own section and nowhere it may not be
   (the eleven that move a band at full size, privatecopy, weightdrift and example on a quick run of exact checks).

   KNOBS for a builder, none of which may record: SENSE_TRY_SCALE=1.2 (the legacy constant at another value),
   SENSE_FIELD_POP=starters (the field measured on starter seasons only). */
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
const ELITE_TD_FLOOR = 2;
/* Careers that win an MVP and an All-NBA at least once, percent, as Round 1103 shipped: its five full size
   seeds (6,000 careers each), read on the tree of the round's last gate. Main has 16.6 and 58.8; with the old
   block on the new line it was 18.4 and 64.0; the one pass, which ties MVP to the First Team and a playoff
   club, brought it most of the way back. */
const SPREAD_1103 = { everMvp: [17.18, 17.07, 17.73, 17.7, 17.53], everAllNba: [61.7, 60.98, 62.35, 62.47, 62.2] };
const E_MEAN_TOL = 0.08;
const E_SD_TOL = 0.06;
/* B3: seasons under 65 games before 2023-24 holding an award the games rule names, in a full size run. */
const UNDER65_FLOOR = 1750;
/* B5: how many times the scorers' All-Defensive rate the defenders' must be. */
const B5_FACTOR = 3;

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
const awardMvpRow = srcOf('src/lib/nbaCareerAwards.ts').match(/^ {2}mvp: \{ PG: \[([-0-9.]+), ([0-9.]+)\], (.*)$/m);
const AWARD_FIELD_ROW = awardMvpRow ? awardMvpRow[0] : 'the mvp row of NBA_FIELD is not in nbaCareerAwards.ts';
const AWARD_FIELD_STALE = awardMvpRow ? `  mvp: { PG: [${(Number(awardMvpRow[1]) + Number(awardMvpRow[2])).toFixed(2)}, ${awardMvpRow[2]}], ${awardMvpRow[3]}` : '';
const CONTROLS = {
  /* C: one NFL All-Pro grade moved by a hundredth. Judged under SENSE_PROVE_OTHERS=1. */
  othersport: { file: 'src/lib/careerAwards.ts', find: "  QB: { pool: 32, slots: 1, grade: 0.25 },\n  RB:", put: "  QB: { pool: 32, slots: 1, grade: 0.26 },\n  RB:", needs: 'C' },
  /* A: the old assists expression back (a flat rate by rating, plus up to two for everybody). It moves the
     line itself, so the field, the rival, the awards and the Hall may follow it red: `may` lists them. */
  oldassists: { file: 'src/lib/nbaMyCareer.ts',
    find: '  const apg = clampTo((0.045 + d * 0.0052) * a.playmaking * NBA_POS_AST[input.pos] * minutes * era.ast * (0.92 + u5 * 0.16), 0.3, po ? 14 : 13);',
    put: '  const apg = clampTo((1.5 + d * 0.22) * a.playmaking * (bench ? 0.6 : 1) + u5 * 2, 0.3, po ? 14 : 13);', needs: 'A1,A3', may: 'A2,E,R,H,B4,B6' },
  /* E: the PG row of the season score's field one standard deviation stale. Finals MVP and the bridge read it. */
  stalefield: { file: 'src/lib/careerAwards.ts', find: FIELD_PG_ROW, put: FIELD_PG_STALE, needs: 'E', may: 'R,H,B6' },
  /* E: the PG row of the MVP score's field (NBA_FIELD) one standard deviation stale. The league's awards read it. */
  staleawardfield: { file: 'src/lib/nbaCareerAwards.ts', find: AWARD_FIELD_ROW, put: AWARD_FIELD_STALE, needs: 'E', may: 'H,B4,B6' },
  /* R: the raw season score handed to the rival, no bridge. */
  nobridge: { file: 'src/lib/nbaMyCareer.ts', find: "    for (const n of judgeRivalSeason(c.rival, bridged, c.name, 'nba', rng)) notes.push(n);", put: "    for (const n of judgeRivalSeason(c.rival, statScore, c.name, 'nba', rng)) notes.push(n);", needs: 'R' },
  /* H: the legacy constant back to 1. Refuses when it already is 1 (then nomvpworth is the control H has). */
  noscale: { file: 'src/lib/nbaMyCareer.ts', find: LEGACY_SCALE_LINE, put: 'export const NBA_LEGACY_NEW_LINE_SCALE: number = 1;', needs: 'H' },
  /* H: an MVP worth nothing to the legacy score of a career retiring today. */
  nomvpworth: { file: 'src/lib/nbaMyCareer.ts', find: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 155, finalsMvps: 90, allNbas: 48 },', put: 'const NBA_LEGACY_V2: LegacyWeights = {\n  awards: { rings: 95, mvps: 0, finalsMvps: 90, allNbas: 48 },', needs: 'H' },
  /* B1: MVP decided on its own again, with no First Team gate and no playoff gate. It then also ignores the
     games tests the First Team carried, and there are more of them, so B3, B6 and the Hall may follow. */
  independent: { file: 'src/lib/nbaCareerAwards.ts', find: '  const mvp = out.allNbaTeam === 1 && x.madePlayoffs && zMvp > bar(150, 1, G_MVP, g1);', put: '  const mvp = zMvp > bar(150, 1, G_MVP, g1);', needs: 'B1', may: 'B3,B6,H' },
  /* B2: the rookie test back to what the old block asked (22 or older, a first or second season). */
  rookieage: { file: 'src/lib/nbaMyCareer.ts', find: "    bench: c.role === 'backup', rookie: c.seasons.length === 0,", put: "    bench: c.role === 'backup', rookie: c.age >= 22 && c.seasons.length <= 1,", needs: 'B2', may: 'B6' },
  /* B3: the old block's 62 games in every era, in place of the real rule. Both halves must go red. */
  bar62: { file: 'src/lib/nbaCareerAwards.ts', find: '    overBar: x.games >= nbaAwardGamesBar(x.year, x.seasonLength, NBA_AWARD_RULES),', put: '    overBar: x.games >= 62,', needs: 'B3', may: 'B6,H' },
  /* B5: the defensive awards read the MVP score again, the way one season score used to decide everything. */
  scorersdefend: { file: 'src/lib/nbaCareerAwards.ts', find: '  const zDef = zOf(v.defense, fieldRow(NBA_FIELD.defense)) - x.defenceRep;', put: '  const zDef = zMvp;', needs: 'B5', may: 'B6' },
  /* D: NBA Front Office adding its own sum again instead of calling the shared score. */
  privatecopy: { file: 'src/lib/nbaSeasonStats.ts', find: "  return nbaMvpValue(nbaProduction(foPerGame(p, 'pts'), foPerGame(p, 'reb'), foPerGame(p, 'ast')), winShare(league, p.team), NBA_MVP_WIN_WEIGHT);", put: "  return foPerGame(p, 'pts') + foPerGame(p, 'reb') + foPerGame(p, 'ast') + NBA_MVP_WIN_WEIGHT * winShare(league, p.team);", needs: 'D' },
  /* D: the career's win weight drifting off NBA Front Office's. */
  /* F: the worked example's winning club read as its losing one. The sum still adds up; the claim is false. */
  example: { file: 'src/lib/nbaCareerAwards.ts', find: 'export const NBA_MVP_EXAMPLE = { ppg: 27.4, rpg: 6.1, apg: 5.3, wins: 54, losses: 28, losingWins: 34, losingLosses: 48 } as const;', put: 'export const NBA_MVP_EXAMPLE = { ppg: 27.4, rpg: 6.1, apg: 5.3, wins: 34, losses: 48, losingWins: 34, losingLosses: 48 } as const;', needs: 'F' },
  weightdrift: { file: 'src/lib/nbaCareerAwards.ts', find: 'export const NBA_CAREER_MVP_WIN_WEIGHT = 20;', put: 'export const NBA_CAREER_MVP_WIN_WEIGHT = 19;', needs: 'D', may: 'E,B6' },
};
/* Controls that swap more than one line of one file (each anchor exactly once, the edit must change the text). */
const MULTI = {
  /* B6: the All-NBA and MVP grades back to what careerAwards.ts carried before Round 1103 (0.15 and none). Fewer
     of both follow, so the Hall and the All-Star ratio may too. */
  oldgrades: { file: 'src/lib/nbaCareerAwards.ts', needs: 'B6', may: 'H,B4', swaps: [
    [/^const G_ALL_NBA = [-0-9.]+;$/m, 'const G_ALL_NBA = 0.15;'],
    [/^const G_MVP = [-0-9.]+;$/m, 'const G_MVP = 0;'],
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
/** One file's source with a list of edits applied: each anchor exactly once, each edit must change the text. */
function editedSource(list, file, src, onApplied = () => {}) {
  let out = src;
  for (const e of list.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const was = out;
    for (const [find, put] of e.swaps) {
      const hits = typeof find === 'string' ? out.split(find).length - 1 : (out.match(new RegExp(find.source, 'gm')) ?? []).length;
      if (hits !== 1) { console.error(`${e.label}: anchor ${String(find).slice(0, 70)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
      out = out.replace(find, put);
    }
    if (out === was && !e.sameOk) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied(e);
  }
  return out;
}
/** A source file as this run's control sees it (what a source check must read, never the bare file). */
const underControl = rel => editedSource(edits, rel, srcOf(rel));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
/** The engine bundled with a list of source edits swapped in memory (a plugin, never a file). */
async function bundleWith(list, tag) {
  let applied = 0;
  const plugin = {
    name: 'sense-control',
    setup(b) {
      if (!list.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!list.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(list, args.path, norm(readFileSync(args.path, 'utf8')), () => { applied++; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `nba-sense-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  if (applied !== list.length) { console.error(`${list.map(e => e.label).join(', ')}: ${applied} of ${list.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}
const BUNDLE = {
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
      "export * as nbaAwards from './src/lib/nbaCareerAwards.ts';",
      "export * as decision from './src/lib/awardDecision.ts';",
      "export { NBA_BADGES } from './src/lib/careerBadges.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
};
const E = await bundleWith(edits, 'run');
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
function playFleet(seed, careers, M = E) {
  const nba = M.nba;
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
    const hall = M.hallRecordFor(M.NBA_CAREER_HALL, c);
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
  /* How unevenly an award falls: the sd of its count over careers (most win none, a few win several). */
  m.sdCareer = Object.fromEntries(AWARDS.map(a => { const cnt = new Array(n).fill(0); for (const s of S) if (has(s.line, a)) cnt[s.i] += 1; return [a, r3(sdOf(cnt))]; }));
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
  /* Section B's counts: do the awards agree with each other, the club and the rules. Plain counts, so a check
     on them can be exact. They read the optional keys the one pass writes; on main every one of them is absent. */
  const any = (s, list) => list.some(a => has(s.line, a));
  const count = fn => S.filter(fn).length;
  const len = s => nba.nbaSeasonGames ? nba.nbaSeasonGames(s.line.year) : 82;
  const barOf = s => (E.decision && E.norms ? E.decision.nbaAwardGamesBar(s.line.year, len(s), E.norms.NBA_AWARD_RULES) : 0);
  m.b = {
    mvp: mvp.length,
    mvpMissed: mvp.filter(s => s.line.teamResult === nba.NBA_MISSED_PLAYOFFS).length,
    mvpOffFirst: mvp.filter(s => s.line.allNbaTeam !== 1).length,
    mvpAndMip: mvp.filter(s => has(s.line, 'Most Improved Player')).length,
    mip: count(s => has(s.line, 'Most Improved Player')),
    mipAfterAllNba: count(s => has(s.line, 'Most Improved Player') && s.everAllNba),
    roy: roy.length,
    royOffFirst: roy.filter(s => s.line.allRookieTeam !== 1).length,
    allRookieFirstSeason: count(s => s.n === 0 && has(s.line, 'All-Rookie Team')),
    allRookieLater: count(s => s.n !== 0 && has(s.line, 'All-Rookie Team')),
    barAwardsFrom2023: count(s => s.line.year >= 2023 && any(s, BAR_AWARDS)),
    underBarFrom2023: count(s => s.line.year >= 2023 && any(s, BAR_AWARDS) && s.line.games < barOf(s)),
    under65Before2023: count(s => s.line.year < 2023 && any(s, BAR_AWARDS) && s.line.games < 65),
    sixth: count(s => has(s.line, 'Sixth Man of the Year')),
    sixthStarter: count(s => has(s.line, 'Sixth Man of the Year') && s.role !== 'backup'),
    underHalf: count(s => any(s, HALF_AWARDS) && s.line.games * 2 < len(s)),
    allNbaNoAllStar: count(s => has(s.line, 'All-NBA') && !has(s.line, 'All-Star')),
    /* The saved string and the optional key that names the team must tell the same story. */
    keyMismatch: count(s => has(s.line, 'All-NBA') !== (s.line.allNbaTeam != null) || has(s.line, 'All-Star') !== (s.line.allStar != null)
      || has(s.line, 'All-Defensive Team') !== (s.line.allDefensiveTeam != null) || has(s.line, 'All-Rookie Team') !== (s.line.allRookieTeam != null)),
    dpoyOffTeam: count(s => has(s.line, 'Defensive Player of the Year') && s.line.allDefensiveTeam == null),
    starters: count(s => s.line.allStar === 'starter'),
    noRecord: count(s => s.line.games > 0 && !(s.line.clubWins >= 0 && s.line.clubWins + s.line.clubLosses === len(s))),
  };
  return m;
}
/* The five awards the real games rule names, and everything the game's own half season floor covers (a Finals
   MVP is left out on purpose: a man hurt in March can own the Finals). */
const BAR_AWARDS = ['All-NBA', 'MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Most Improved Player'];
const HALF_AWARDS = ['All-Star', 'Rookie of the Year', 'All-NBA', 'MVP', 'Defensive Player of the Year', 'All-Defensive Team', 'Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Most Improved Player', 'Sixth Man of the Year', 'All-Rookie Team'];

/** The input the engine hands decideNbaAwards for a recorded season, rebuilt from what the fleet kept. Used to
 *  MEASURE (the field, the fit), never to decide. */
function inputOf(s) {
  const L = nba.nbaSeasonGames(s.line.year);
  const prev = s.prev && s.prev.teamResult !== 'SUSPENDED' ? { year: s.prev.year, games: s.prev.games, ppg: s.prev.ppg, rpg: s.prev.rpg, apg: s.prev.apg } : null;
  return { pos: s.pos, defenceRep: (nba.NBA_ARCH_DEFENSE[s.arch] ?? { rep: 0 }).rep, bench: s.role === 'backup', rookie: s.n === 0,
    year: s.line.year, seasonLength: L, games: s.line.games, ppg: s.line.ppg, rpg: s.line.rpg, apg: s.line.apg, spg: s.line.spg ?? 0, bpg: s.line.bpg ?? 0,
    winShare: (s.line.clubWins ?? 0) / L, madePlayoffs: s.line.teamResult !== nba.NBA_MISSED_PLAYOFFS, fanbase: s.fan, prev, everAllNba: s.everAllNba };
}
const HAS_PASS = () => typeof E.nbaAwards?.decideNbaAwards === 'function';
/** NBA_FIELD as the fleet lives it: mean and sd of each score the one pass reads, half a season or more. */
function awardFieldOf(f) {
  const rows = f.seasons.filter(s => s.line.games > 0).map(s => { const x = inputOf(s); return { pos: s.pos, x, v: E.nbaAwards.nbaAwardValues(x) }; }).filter(r => r.v.half);
  const ms = v => ({ mean: mean(v), sd: sdOf(v), n: v.length });
  const byPos = key => Object.fromEntries(POS.map(p => [p, ms(rows.filter(r => r.pos === p).map(r => r.v[key]))]));
  return { rows, mvp: byPos('mvp'), defense: byPos('defense'), production: byPos('production'),
    bench: ms(rows.filter(r => r.x.bench).map(r => r.v.benchPts)), jump: ms(rows.filter(r => r.v.jump !== null).map(r => r.v.jump)), fans: ms(rows.map(r => r.x.fanbase)) };
}
/** Each award's expected rate a career as a function of its grade, worked out exactly from every season's z
 *  against THIS fleet's own field (the chance a z beats a bar is exp(-exp(-t)) with t the bar's own scale; two
 *  bars on the same draw are the smaller t when both must hold and the larger when either may). */
function awardFit(f) {
  const R = E.norms.NBA_AWARD_RULES;
  const fld = awardFieldOf(f);
  const t = (z, n, g) => { const L = Math.log(Math.max(2, n)); const root = Math.sqrt(2 * L); const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root); return (z - g - loc) * root; };
  const P = x => Math.exp(-Math.exp(-x));
  const z = (val, row) => (val - row.mean) / row.sd;
  const rows = fld.rows.map(r => ({ x: r.x, v: r.v, zMvp: z(r.v.mvp, fld.mvp[r.pos]), zDef: z(r.v.defense, fld.defense[r.pos]) - r.x.defenceRep, zProd: z(r.v.production, fld.production[r.pos]), zFans: z(r.x.fanbase, fld.fans), zBench: z(r.v.benchPts, fld.bench), zJump: r.v.jump === null ? null : z(r.v.jump, fld.jump),
    posExtra: { C: 0, PF: 0, SF: 0.3 }[r.pos] ?? 0.6 }));
  const n = f.careers.length;
  const sum = fn => g => rows.reduce((a, r) => a + fn(r, g), 0) / n;
  const allNbaT = (r, gA) => (r.v.overBar ? Math.max(t(r.zMvp, 30, gA), t(r.zMvp, 15, gA), t(r.zMvp, 10, gA)) : -Infinity);
  return {
    field: fld,
    allNba: sum((r, g) => P(allNbaT(r, g))),
    mvp: gA => sum((r, g) => (r.v.overBar && r.x.madePlayoffs ? P(Math.min(t(r.zMvp, 30, gA), t(r.zMvp, 150, g))) : 0)),
    allDef: sum((r, g) => (r.v.overBar ? P(Math.max(t(r.zDef, 30, g), t(r.zDef, 15, g))) : 0)),
    roy: sum((r, g) => (r.x.rookie ? P(Math.min(t(r.zProd, 9, g), t(r.zProd, 45, g))) : 0)),
    allRookie: sum((r, g) => (r.x.rookie ? P(Math.max(t(r.zProd, 9, g), t(r.zProd, 4.5, g))) : 0)),
    dpoy: gD => sum((r, g) => (r.v.overBar ? P(Math.min(Math.max(t(r.zDef, 30, gD), t(r.zDef, 15, gD)), t(r.zDef, 150, g + r.posExtra))) : 0)),
    sixth: sum((r, g) => (r.x.bench ? P(t(r.zBench, 60, g)) : 0)),
    mip: sum((r, g) => (r.zJump !== null && r.v.overBar && !r.x.everAllNba ? P(t(r.zJump, 150, g)) : 0)),
    allStar: gA => sum((r, g) => { const share = r.x.year >= R.allStarFanShareFrom ? R.allStarFanShare : 1; let a = 0; for (const w of [-0.4, -0.2, 0, 0.2, 0.4]) a += P(Math.max(t(share * (r.zFans + w) + (1 - share) * r.zMvp, 15, g), t(r.zMvp, 6.25, g), allNbaT(r, gA))); return a / 5; }),
  };
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
 *  minutes instead of half an hour: a rate held at main's is judged within three standard errors AT THE RUN'S
 *  OWN SIZE, so a shrunk run is a fair but blunter test, and the plain run at that same size has to be green
 *  first). Any other shrunk run prints it. */
const JUDGE = FULL || process.env.SENSE_JUDGE === '1';
function banded(section, cond, msg) {
  if (!JUDGE) { console.log(`  note [${section}] ${msg} (quick run, bands not judged)`); return; }
  exact(section, cond, msg);
}
const get = (o, key) => key.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
/** Held at main's rate: the mean over this run's seeds against the mean over main's, within three standard
 *  errors of the difference of the two means.
 *
 *  Why not "every seed inside main's lowest to highest, give or take its spread", which is what this check
 *  first was: main's five seeds happened to land within 0.33 of each other on the Hall rate, where the plain
 *  sampling error of a share near 32 percent over 6,000 careers is 0.6 a seed, so that band was narrower than
 *  the noise of the thing it measured and a healthy tree failed it on one seed in three (measured: seeds 1 and
 *  2 of one unchanged tree came out at 31.2 and 29.2). A mean of five is the stronger signal, and its error is
 *  known. The seed to seed sd used is the larger of what the ten seeds show and the floor a count of that size
 *  has by arithmetic: a share is binomial, an award count a career is at least Poisson. */
function heldAtMain(section, base, per, key, label, kind, careerSd) {
  heldAt(section, base.seeds.map(s => get(s.m, key)), base.careers, per.map(m => get(m, key)), label, kind, "main's", careerSd);
}
/** The same test against any five recorded seeds (main's, or the ones a round shipped). */
function heldAt(section, main, mainCareers, now, label, kind, whose, careerSd = 0) {
  const base = { careers: mainCareers };
  const n = Math.min(CAREERS, base.careers);
  const m0 = mean(main); const m1 = mean(now);
  /* 'share' is a percent of careers; 'share-years' a percent of head to head years (several a career, and a
     career's years lean the same way, so four independent years a career is the floor used); else a count a
     career, whose floor is the larger of Poisson's and the sd over careers this run measured (`careerSd`: an
     MVP winner tends to win several, so the count is wider than Poisson: 0.82 against 0.56 measured over 30,000
     careers; the check prints the sd it used). */
  const floorSd = c => (kind === 'share' ? Math.sqrt(Math.max(1e-9, m0 * (100 - m0)) / c) : kind === 'share-years' ? Math.sqrt(Math.max(1e-9, m0 * (100 - m0)) / (c * 4)) : Math.max(Math.sqrt(Math.max(1e-9, m0)), careerSd) / Math.sqrt(c));
  const sample = Math.sqrt((sdOf(main) ** 2 * main.length + sdOf(now) ** 2 * now.length) / Math.max(1, main.length + now.length - 2));
  const se = Math.sqrt(Math.max(sample, floorSd(base.careers)) ** 2 / main.length + Math.max(sample, floorSd(CAREERS)) ** 2 / now.length);
  const tol = 3 * se;
  banded(section, Math.abs(m1 - m0) <= tol, `${label}: mean ${r3(m1)} (${now.join(', ')}) against ${whose} ${r3(m0)} (${main.join(', ')}), ${r3(Math.abs(m1 - m0))} apart, allowed ${r3(tol)} (three standard errors at ${n} careers a seed)`);
}

/* ------------------------------------------------------------------ */
/* Play                                                                */
/* ------------------------------------------------------------------ */
const t0 = Date.now();
console.log(`simNbaAwardsSense: ${CAREERS} careers a seed, seeds ${SEEDS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${TRY_SCALE ? `, TRIAL legacy scale ${TRY_SCALE}` : ''}${FULL ? '' : JUDGE ? ` (shrunk run, judged at its own size)` : ' (quick run, bands not judged)'}`);
const per = [];
const aStats = [];
const fields = [];
const anchors = [];
const fits = [];
const passFits = [];
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
  if (HAS_PASS()) passFits.push(awardFit(f));
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
  /* Since the one pass (nbaCareerAwards.ts) only Finals MVP is still decided on the season score alone. */
  for (const a of (HAS_PASS() ? ['Finals MVP'] : ['MVP', 'All-NBA', 'All-Defensive Team', 'Finals MVP', 'Rookie of the Year', 'Defensive Player of the Year'])) {
    const target = meanOfSeeds(`perCareer.${a}`);
    const g = solveGrade(fits.map(x => x[a]), target);
    const ever = a === 'MVP' ? `; careers with one at that grade ${mean(fits.map(x => x.everMvp(g))).toFixed(2)} percent (main ${meanOfSeeds('everMvp').toFixed(2)})` : a === 'All-NBA' ? `; careers with one at that grade ${mean(fits.map(x => x.everAllNba(g))).toFixed(2)} percent (main ${meanOfSeeds('everAllNba').toFixed(2)})` : '';
    console.log(`    ${a.padEnd(20)} main ${target.toFixed(3)} a career, grade ${g.toFixed(2)}${ever}`);
  }
}
/* What a builder pastes into nbaCareerAwards.ts: NBA_FIELD as this fleet lives it, and the grades that put each
   award on its target on those rows. */
const awardFieldMean = passFits.length ? (() => {
  const rowOf = pick => ({ mean: mean(passFits.map(x => pick(x.field).mean)), sd: mean(passFits.map(x => pick(x.field).sd)) });
  const byPos = key => Object.fromEntries(POS.map(p => [p, rowOf(fl => fl[key][p])]));
  return { mvp: byPos('mvp'), defense: byPos('defense'), production: byPos('production'), bench: rowOf(fl => fl.bench), jump: rowOf(fl => fl.jump), fans: rowOf(fl => fl.fans) };
})() : null;
if (awardFieldMean) {
  const pr = r => `[${r.mean.toFixed(2)}, ${r.sd.toFixed(2)}]`;
  console.log(`\nNBA_FIELD, measured on the simNbaAwardsSense fleet (${SEEDS.length} seed mean, era neutral, half a season or more):`);
  for (const key of ['mvp', 'defense', 'production']) console.log(`  ${key}: { ${POS.map(p => `${p}: ${pr(awardFieldMean[key][p])}`).join(', ')} },`);
  for (const key of ['bench', 'jump', 'fans']) console.log(`  ${key}: ${pr(awardFieldMean[key])},`);
  if (preBase.nba) {
    const G = E.nbaAwards.NBA_AWARD_GRADES;
    const tAllNba = meanOfSeeds('perCareer.All-NBA'); const tMvp = meanOfSeeds('perCareer.MVP'); const tDef = meanOfSeeds('perCareer.All-Defensive Team'); const tRoy = meanOfSeeds('perCareer.Rookie of the Year');
    const gA = solveGrade(passFits.map(x => x.allNba), tAllNba);
    const gM = solveGrade(passFits.map(x => x.mvp(gA)), tMvp);
    const gD = solveGrade(passFits.map(x => x.allDef), tDef);
    const gS = solveGrade(passFits.map(x => x.allStar(gA)), 1.6 * tAllNba);
    const gR = solveGrade(passFits.map(x => x.roy), 2 * tRoy);
    console.log('The grade that puts each award on its target, on this fleet\'s own field (worked out, not drawn; committed grade in brackets):');
    console.log(`    All-NBA        main ${tAllNba.toFixed(3)} a career: ${gA.toFixed(2)} [${G.allNba}]`);
    console.log(`    MVP            main ${tMvp.toFixed(3)} a career, at that All-NBA grade: ${gM.toFixed(2)} [${G.mvp}]`);
    console.log(`    All-Defensive  main ${tDef.toFixed(3)} a career: ${gD.toFixed(2)} [${G.allDef}]`);
    console.log(`    All-Star       1.6 times main's All-NBA (24 picks against 15), ${(1.6 * tAllNba).toFixed(3)} a career: ${gS.toFixed(2)} [${G.allStar}]`);
    console.log(`    Rookies        twice main's Rookie of the Year, ${(2 * tRoy).toFixed(3)} a career: ${gR.toFixed(2)} [${G.rookie}]; All-Rookie at that grade ${mean(passFits.map(x => x.allRookie(gR))).toFixed(3)} a career`);
    const tDpoy = meanOfSeeds('perCareer.Defensive Player of the Year'); const tSixth = meanOfSeeds('perCareer.Sixth Man of the Year'); const tMip = meanOfSeeds('perCareer.Most Improved Player');
    console.log(`    Defensive Player  main ${tDpoy.toFixed(3)} a career, at that All-Defensive grade: ${solveGrade(passFits.map(x => x.dpoy(gD)), tDpoy).toFixed(2)} [${G.dpoy}]`);
    console.log(`    Sixth Man      main ${tSixth.toFixed(3)} a career: ${solveGrade(passFits.map(x => x.sixth), tSixth).toFixed(2)} [${G.sixth}]`);
    console.log(`    Most Improved  main ${tMip.toFixed(3)} a career: ${solveGrade(passFits.map(x => x.mip), tMip).toFixed(2)} [${G.mip}]`);
    console.log(`    at the committed grades the fit expects: All-NBA ${mean(passFits.map(x => x.allNba(G.allNba))).toFixed(3)}, MVP ${mean(passFits.map(x => x.mvp(G.allNba)(G.mvp))).toFixed(3)}, All-Defensive ${mean(passFits.map(x => x.allDef(G.allDef))).toFixed(3)}, All-Star ${mean(passFits.map(x => x.allStar(G.allNba)(G.allStar))).toFixed(3)}, Rookie of the Year ${mean(passFits.map(x => x.roy(G.rookie))).toFixed(3)}`);
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
    /* Judged on the mean over the run's seeds: a p99 is carried by a few dozen elite careers, so one seed of a
       shrunk fleet moves it by a point (32.6 to 34.5 on four fleets of 1,500) where five full seeds agree to 0.3. */
    banded('A2', mean(v) <= bar.mean + bar.sd, `the p99 starter season in ${k}: ${v.map(f1).join(', ')}, mean ${mean(v).toFixed(2)}, at or under the league leaders' mean plus one sd (${f1(bar.mean)} + ${f1(bar.sd)})`);
  }
  /* A3: the promises. */
  banded('A3', aStats.every(a => a.rookies.ppg >= 7.5 && a.rookies.ppg <= 11.5), `rookies rated 75 to 79 average ${aStats.map(a => f1(a.rookies.ppg)).join(', ')} points (7.5 to 11.5); starters ${aStats.map(a => f1(a.rookies.starters)).join(', ')}, bench ${aStats.map(a => f1(a.rookies.bench)).join(', ')}; ${aStats.map(a => a.rookies.n).join(', ')} seasons`);
  banded('A3', aStats.every(a => a.wing8.share < 2), `SG and SF starter seasons at 8 assists or more: ${aStats.map(a => a.wing8.share.toFixed(2)).join(', ')} percent of theirs (under 2; main about 19)`);
  banded('A3', aStats.every(a => a.bench.ratio >= 0.36 && a.bench.ratio <= 0.56), `bench seasons score ${aStats.map(a => (a.bench.ratio * 100).toFixed(0)).join(', ')} percent of starters' (36 to 56): ${aStats.map(a => f1(a.bench.ppg)).join(', ')} points in ${aStats.map(a => f1(a.bench.mpg)).join(', ')} minutes`);
  exact('A3', aStats.every(a => a.decimals.oneDecimal && a.decimals.nonZero >= 10), `every new season's points have one decimal, and ${aStats.map(a => a.decimals.nonZero.toFixed(0)).join(', ')} percent of them a non zero one (at least 10)`);
  /* A count this small is judged on the run's total, never seed by seed. */
  if (live) { const both = per.reduce((t, m) => t + m.bothTitles, 0); const all = per.reduce((t, m) => t + m.careers, 0); banded('A3', both * 250 < all, `seasons holding both the scoring and the assists title: ${per.map(m => m.bothTitles).join(', ')}, ${both} in ${all} careers (under 1 in 250 careers; main ${base.nba ? base.nba.seeds.map(s => s.m.bothTitles).join(', ') : '?'}, 1 in 13)`); }
  console.log(`  note [A3] 30 points a game: ${aStats.map(a => a.thirty.toFixed(2)).join(', ')} percent of starter seasons; 10 assists: ${aStats.map(a => a.tenAst.toFixed(2)).join(', ')}; triple double seasons in the fleet: ${aStats.map(a => a.tripleDouble).join(', ')}`);
  /* The triple double badge has one man who can reach it on this line, a Point Forward at the very top. Seen
     here, in the elite sweep scripts/simCareerParity.mjs runs for its badge check (rating 93, ceiling 99, a 90
     club, thirty careers), so a long detached harness is not where it is found out. */
  if (live) {
    const elite = SEEDS.map(seed => eliteTripleDoubles(seed, 30));
    const found = elite.reduce((t, n) => t + n, 0);
    banded('A3', found >= ELITE_TD_FLOOR * SEEDS.length, `triple double seasons in thirty elite careers a seed: ${elite.join(', ')}, ${found} in all (at least ${ELITE_TD_FLOOR} a seed on average, so the badge stays reachable)`);
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

/* The award rates held at main's: section B6a while the old block decided them, B6 since the one pass. */
const B6 = HAS_PASS() ? 'B6' : 'B6a';
if (!base.nba) exact('baseline', false, 'scripts/data/nbaAwardsSenseBaseline.json has no nba key: record it once with --record-nba-baseline');
else {
  /* R, the rival: my share of the head to head years stays where main had it. */
  heldAtMain('R', base.nba, per, 'myShare', 'my share of the head to head years, percent', 'share-years');
  /* H, the Hall: inducted and first ballot stay where main had them. */
  heldAtMain('H', base.nba, per, 'inducted', 'Hall of Fame inducted, percent', 'share');
  heldAtMain('H', base.nba, per, 'firstBallot', 'first ballot, percent', 'share');
  /* B6a, the award rates the old grades were set for, held where main had them. */
  for (const [award, label] of [['MVP', 'MVPs a career'], ['All-NBA', 'All-NBA a career'], ['All-Defensive Team', 'All-Defensive a career'], ['Finals MVP', 'Finals MVPs a career']]) {
    const careerSd = mean(per.map(m => m.sdCareer[award]));
    heldAtMain(B6, base.nba, per, `perCareer.${award}`, `${label} (sd over careers ${r3(careerSd)})`, 'count', careerSd);
  }
  /* How the awards are SPREAD over careers is not main's on this line, and one grade an award cannot make it so
     (see the header). The two shares are held where Round 1103 shipped them, and main's are printed beside. */
  for (const [key, label] of [['everMvp', 'careers with an MVP, percent'], ['everAllNba', 'careers with an All-NBA, percent']]) {
    heldAt(B6, SPREAD_1103[key], 6000, per.map(m => m[key]), `${label} (main ${base.nba.seeds.map(s => s.m[key]).join(', ')}: the same awards a career, spread over more careers)`, 'share', 'what Round 1103 shipped,');
  }
}

/* B, the awards make sense together (the one pass, nbaCareerAwards.ts). */
if (HAS_PASS()) {
  const tot = key => per.reduce((t, m) => t + m.b[key], 0);
  const list = key => per.map(m => m.b[key]).join(', ');
  const perCareerOf = a => mean(per.map(m => m.perCareer[a]));
  const mainOf = a => (base.nba ? mean(base.nba.seeds.map(s => s.m.perCareer[a])) : 0);
  /* A check whose population is under its floor is empty, and an empty check fails (the floor is stated for a
     full size run and shrinks with the run). */
  const sizeShare = Math.min(1, (CAREERS * SEEDS.length) / 30000);
  const floor = (section, key, min, what) => { const need = Math.ceil(min * sizeShare); banded(section, tot(key) >= need, `${what}: ${tot(key)} in the run (at least ${need}, or the checks on them are empty)`); };
  exact('B0', tot('keyMismatch') === 0 && tot('dpoyOffTeam') === 0 && tot('noRecord') === 0, `every award string agrees with the key that names its team (${tot('keyMismatch')} seasons off), every Defensive Player is on an All-Defensive team (${tot('dpoyOffTeam')} off), every season has a club record that adds up to its length (${tot('noRecord')} without)`);
  floor('B1', 'mvp', 300, 'MVP seasons'); floor('B1', 'mip', 100, 'Most Improved seasons');
  exact('B1', tot('mvpMissed') === 0, `MVP seasons on a club that missed the playoffs: ${list('mvpMissed')} of ${list('mvp')} (main: one in four)`);
  exact('B1', tot('mvpOffFirst') === 0, `MVP seasons off the All-NBA First Team: ${list('mvpOffFirst')} (main: one in eleven not All-NBA at all)`);
  exact('B1', tot('mvpAndMip') === 0, `MVP and Most Improved in one season: ${list('mvpAndMip')} (main: one MVP season in four)`);
  exact('B1', tot('mipAfterAllNba') === 0, `Most Improved after an earlier All-NBA: ${list('mipAfterAllNba')} of ${list('mip')}`);
  floor('B2', 'roy', 60, 'Rookie of the Year seasons');
  exact('B2', tot('royOffFirst') === 0, `Rookie of the Year seasons off the All-Rookie First Team: ${list('royOffFirst')} of ${list('roy')} (main: every one)`);
  exact('B2', tot('allRookieLater') === 0, `All-Rookie outside a first season: ${list('allRookieLater')}`);
  banded('B2', tot('allRookieFirstSeason') > 0, `All-Rookie selections in first seasons: ${list('allRookieFirstSeason')} (main: none)`);
  floor('B3', 'barAwardsFrom2023', 2000, 'seasons from 2023-24 with an award the games rule names');
  exact('B3', tot('underBarFrom2023') === 0, `from 2023-24, seasons under the games bar holding an award the rule names: ${list('underBarFrom2023')} of ${list('barAwardsFrom2023')}`);
  banded('B3', tot('under65Before2023') >= Math.ceil(UNDER65_FLOOR * sizeShare), `before 2023-24 the rule did not exist: ${list('under65Before2023')} seasons under 65 games hold one of those awards (at least ${Math.ceil(UNDER65_FLOOR * sizeShare)} in the run, so "none before" is seen to fire)`);
  floor('B3', 'sixth', 100, 'Sixth Man seasons');
  exact('B3', tot('sixthStarter') === 0, `Sixth Man seasons by a starter: ${list('sixthStarter')} of ${list('sixth')}`);
  exact('B3', tot('underHalf') === 0, `seasons under half a schedule holding any award but a Finals MVP: ${list('underHalf')}`);
  exact('B4', tot('allNbaNoAllStar') === 0, `All-NBA seasons without an All-Star selection: ${list('allNbaNoAllStar')}`);
  { const ratio = per.map(m => m.perCareer['All-Star'] / Math.max(1e-9, m.perCareer['All-NBA']));
    banded('B4', mean(ratio) >= 1.25 && mean(ratio) <= 2.4, `All-Star selections a career over All-NBA: ${ratio.map(r => r.toFixed(2)).join(', ')}, mean ${mean(ratio).toFixed(2)} (1.25 to 2.4; 24 picks against 15 is 1.6); ${per.map(m => m.perCareer['All-Star']).join(', ')} All-Star a career, ${list('starters')} of them starters`); }
  { const DEFENDERS = ['pest', 'twoway', 'threed', 'anchor']; const SCORERS = ['scoringpg', 'bucket', 'sniper', 'alpha', 'stretch4', 'stretch'];
    const byArch = a => mean(per.map(m => m.allDefByArch[a]));
    const low = DEFENDERS.reduce((x, a) => (byArch(a) < byArch(x) ? a : x)); const high = SCORERS.reduce((x, a) => (byArch(a) > byArch(x) ? a : x));
    const factor = mean(DEFENDERS.map(byArch)) / Math.max(1e-9, mean(SCORERS.map(byArch)));
    banded('B5', byArch(low) > byArch(high), `All-Defensive a career: every defender above every scorer (the lowest defender, ${low}, ${byArch(low).toFixed(2)}; the highest scorer, ${high}, ${byArch(high).toFixed(2)})`);
    banded('B5', factor >= B5_FACTOR, `the defenders' mean is ${factor.toFixed(1)} times the scorers' (at least ${B5_FACTOR}; main: a tenth of it, the wrong way round): ${[...DEFENDERS, ...SCORERS].map(a => `${a} ${byArch(a).toFixed(2)}`).join(', ')}`); }
  if (base.nba) {
    const roy = perCareerOf('Rookie of the Year'); const royMain = mainOf('Rookie of the Year');
    banded(B6, roy >= royMain && roy <= 3 * royMain, `Rookie of the Year a career: ${per.map(m => m.perCareer['Rookie of the Year']).join(', ')}, mean ${roy.toFixed(3)} (between main's ${royMain.toFixed(3)} and three times it)`);
    for (const a of ['Scoring Champion', 'Assists Leader', 'Rebounding Champion', 'Sixth Man of the Year', 'Most Improved Player', 'Defensive Player of the Year', 'All-Rookie Team']) {
      banded(B6, perCareerOf(a) > 0, `${a} a career: ${per.map(m => m.perCareer[a]).join(', ')} (main ${mainOf(a).toFixed(3)}; it moves by design, judged as above zero)`);
    }
  }
  { const A = E.nbaAwards;
    const counted = x => { let n = 0; const r = mulberry32(3); A.decideNbaAwards(() => { n++; return r(); }, x); return n; };
    const one = { pos: 'SF', defenceRep: 0, bench: false, rookie: false, year: 2026, seasonLength: 82, games: 78, ppg: 24, rpg: 6, apg: 5, spg: 1.1, bpg: 0.6, winShare: 0.6, madePlayoffs: true, fanbase: 60, prev: { year: 2025, games: 75, ppg: 20, rpg: 5, apg: 4 }, everAllNba: false };
    const cases = [{ ...one, rookie: true, prev: null }, { ...one, bench: true }, { ...one, games: 30 }, { ...one, year: 2010 }];
    exact('B7', cases.every(c => counted(c) === A.NBA_AWARD_DRAWS), `decideNbaAwards draws exactly ${A.NBA_AWARD_DRAWS} times for a rookie, a bench player, a short season and a season before 2023 (${cases.map(counted).join(', ')})`);
    const frozen = JSON.stringify(one);
    exact('B7', JSON.stringify(A.decideNbaAwards(mulberry32(11), one)) === JSON.stringify(A.decideNbaAwards(mulberry32(11), one)) && JSON.stringify(one) === frozen, 'the same input and seed give the same awards, and the input is left untouched'); }
  /* E again, for the table the one pass reads. */
  { const C = E.nbaAwards.NBA_FIELD;
    const cmp = (label, row, pick) => { const meanOff = passFits.map(x => Math.abs(pick(x.field).mean - row[0]) / row[1]); const sdOff = passFits.map(x => Math.abs(pick(x.field).sd / row[1] - 1));
      banded('E', meanOff.every(v => v <= E_MEAN_TOL) && sdOff.every(v => v <= E_SD_TOL), `NBA_FIELD ${label}: committed ${row[0]}/${row[1]} against the fleet ${passFits.map(x => `${pick(x.field).mean.toFixed(2)}/${pick(x.field).sd.toFixed(2)}`).join(' ')} (mean off by at most ${Math.max(...meanOff).toFixed(3)} sd, limit ${E_MEAN_TOL}; sd off by at most ${(Math.max(...sdOff) * 100).toFixed(1)} percent, limit ${E_SD_TOL * 100})`); };
    for (const key of ['mvp', 'defense', 'production']) for (const p of POS) cmp(`${key} ${p}`, C[key][p], fl => fl[key][p]);
    for (const key of ['bench', 'jump', 'fans']) cmp(key, C[key], fl => fl[key]); }
}

/* D, one function: NBA Front Office and NBA My Career score an award through the same code. */
if (HAS_PASS()) {
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const foSrc = strip(underControl('src/lib/nbaSeasonStats.ts')); const careerSrc = strip(underControl('src/lib/nbaCareerAwards.ts'));
  const imports = s => /import \{[^}]*\} from '\.\/awardDecision';/.test(s);
  exact('D', imports(foSrc) && imports(careerSrc), 'nbaSeasonStats.ts and nbaCareerAwards.ts both import from ./awardDecision (comments stripped)');
  exact('D', !foSrc.includes("foPerGame(p, 'pts') + foPerGame(p, 'reb')"), 'nbaSeasonStats.ts no longer adds points and rebounds a game itself');
  exact('D', E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT === E.fo.NBA_MVP_WIN_WEIGHT, `the career's MVP win weight (${E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT}) is NBA Front Office's (${E.fo.NBA_MVP_WIN_WEIGHT})`);
  /* Behaviour: with the shared MVP score cut down to the production alone (one line of awardDecision.ts swapped
     in a second bundle), BOTH games must change: Front Office's ranking of a hand built pair where the best
     producer plays for the worst club, and the career's MVP count over one small fleet. */
  const P = await bundleWith([...edits, { label: 'D probe', file: 'src/lib/awardDecision.ts', swaps: [['  return production + winWeight * winShare;', '  return production;']] }], 'probe');
  const lg = { teams: { BAD: { wins: 10, losses: 72 }, TOP: { wins: 70, losses: 12 } } };
  const man = (id, team, pts, reb, ast) => ({ id, name: id, team, pos: 'SF', g: 80, gs: 80, tot: { pts: pts * 80, reb: reb * 80, ast: ast * 80, stl: 80, blk: 40 } });
  const producer = man('producer', 'BAD', 30, 8, 7); const winner = man('winner', 'TOP', 26, 6, 6);
  const foNow = E.fo.nbaMvpScore(lg, winner) > E.fo.nbaMvpScore(lg, producer); const foProbe = P.fo.nbaMvpScore(lg, winner) > P.fo.nbaMvpScore(lg, producer);
  exact('D', foNow && !foProbe, `NBA Front Office ranks the winner over the better producer on the worst club (${foNow}), and stops when the shared score loses its winning term (${!foProbe})`);
  const mvpsOf = M => playFleet(1, 400, M).careers.reduce((t, c) => t + c.mvps, 0);
  const mine = mvpsOf(E); const probed = mvpsOf(P);
  exact('D', mine !== probed, `the career's MVPs over 400 careers change with the same swap (${mine} against ${probed})`);
}

/* F, the words: what the "?" and the page say is what the code does. */
if (HAS_PASS() && typeof E.nbaAwards.nbaAwardHelpRules === 'function') {
  const rules = E.nbaAwards.nbaAwardHelpRules();
  const R = E.norms.NBA_AWARD_RULES;
  const text = rules.join('\n');
  const ex = text.match(/you average ([0-9.]+) points, ([0-9.]+) rebounds and ([0-9.]+) assists and your club goes ([0-9]+)-([0-9]+)[.] That is ([0-9.]+) for the production plus ([0-9]+) times ([.][0-9]+) for the winning: ([0-9.]+)[.]/);
  const losing = text.match(/the same line on a ([0-9]+)-([0-9]+) club/);
  if (!ex || !losing) exact('F', false, 'the worked example is not in the help rules in the shape this check reads');
  else {
    const [p, r, a, w, l] = ex.slice(1, 6).map(Number);
    const production = E.decision.nbaProduction(p, r, a);
    const share = w / (w + l);
    const total = E.decision.nbaMvpValue(production, share, Number(ex[7]));
    exact('F', production.toFixed(1) === ex[6] && share.toFixed(3).replace(/^0/, '') === ex[8] && total.toFixed(1) === ex[9] && Number(ex[7]) === E.nbaAwards.NBA_CAREER_MVP_WIN_WEIGHT,
      `the worked example recomputed through the shared score: production ${production.toFixed(1)} (printed ${ex[6]}), winning share ${share.toFixed(3)} (printed ${ex[8]}), weight ${ex[7]}, total ${total.toFixed(1)} (printed ${ex[9]})`);
    const bands = nba.NBA_RECORD_BANDS;
    const playoffFloor = Math.min(...nba.NBA_PLAYOFF_RESULTS.map(k => bands[k][0])); const playoffTop = Math.max(...nba.NBA_PLAYOFF_RESULTS.map(k => bands[k][1]));
    exact('F', w >= playoffFloor && w <= playoffTop && Number(losing[1]) <= bands[nba.NBA_MISSED_PLAYOFFS][1] && Number(losing[1]) < playoffFloor && w + l === 82 && Number(losing[1]) + Number(losing[2]) === 82,
      `the example's ${w}-${l} club is a playoff club by the engine's record bands (${playoffFloor} to ${playoffTop} wins) and its ${losing[1]}-${losing[2]} club is not (${bands[nba.NBA_MISSED_PLAYOFFS].join(' to ')})`);
  }
  const games = text.match(/need ([0-9]+) games/); const picks = text.match(/All-Star is ([0-9]+) picks/);
  exact('F', !!games && Number(games[1]) === R.gamesBar && !!picks && Number(picks[1]) === R.allStarPicks, `the help says ${games?.[1]} games and ${picks?.[1]} All-Star picks; the rules say ${R.gamesBar} and ${R.allStarPicks}`);
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const page = strip(underControl('src/pages/NbaMyCareer.tsx'));
  const typed = page.match(/The Trophy Case holds ([0-9]+) badges/);
  exact('F', !!typed && Number(typed[1]) === E.NBA_BADGES.length, `the page says the Trophy Case holds ${typed?.[1]} badges; NBA_BADGES has ${E.NBA_BADGES.length}`);
  exact('F', /extraRules=\{\[\.\.\.nbaAwardHelpRules\(\), /.test(page), 'the page hands the award rules to its "?"');
  exact('F', !/—|–/.test(text), 'no em or en dash in the help rules');
  /* The guide file is not this round's (its owner holds it). What it still says is printed for the lead. */
  const guide = srcOf('src/data/gameContent/basketball.ts');
  console.log(`  note [F] the guide for /nba-my-career still says, and its owner owes the change: ${[/62 games/.test(guide) ? '"62 games"' : null, /21 of them/.test(guide) ? '"21 of them"' : null, /Each of the 21 badges/.test(guide) ? '"Each of the 21 badges"' : null].filter(Boolean).join(', ') || 'nothing stale'}`);
}

/* C, the other sports did not move. A proof for one round, judged only when asked. */
if (!base.others) exact('C', false, 'the baseline has no others key: record it with --record-others');
else if (!PROVE_OTHERS) console.log('  note [C] other sports: not judged in a plain run (SENSE_PROVE_OTHERS=1 judges the hashes)');
else if (base.others.per !== OTHERS_PER || base.others.seeds.join() !== SEEDS.join()) exact('C', false, `the others baseline was recorded at ${base.others.per} careers on seeds ${base.others.seeds.join()}, this run is ${OTHERS_PER} on ${SEEDS.join()}`);
else for (const sport of Object.keys(OTHER)) {
  const same = others[sport].every((o, k) => o.hash === base.others.hashes[sport][k]);
  exact('C', same, `${sport.toUpperCase()} careers hash equal to the baseline on every seed (${others[sport].map(o => o.hash.slice(0, 8)).join(', ')})`);
}

/* C's prints, never judged: in the other three careers, how often the sport's major award goes to a club that
   missed the playoffs, and to a man without that season's all league pick. The legacy recalibration round is
   sized from these. The words are each engine's own, and a word that is no longer in its source is said so. */
{
  const WORDS = {
    nfl: { file: 'src/lib/nflMyCareer.ts', major: ['MVP'], pick: 'All-Pro', missed: 'Missed the playoffs', anchor: "export const NFL_MISSED_PLAYOFFS = 'Missed the playoffs';" },
    mlb: { file: 'src/lib/mlbMyCareer.ts', major: ['MVP', 'Cy Young'], pick: 'All-Star', missed: 'Missed October', anchor: "let result = 'Missed October';" },
    nhl: { file: 'src/lib/nhlMyCareer.ts', major: ['Hart', 'Norris', 'Vezina'], pick: 'All-Star', missed: 'Missed the playoffs', anchor: "let result = 'Missed the playoffs';" },
  };
  for (const sport of Object.keys(OTHER)) {
    const w = WORDS[sport];
    const src = srcOf(w.file);
    if (!src.includes(w.anchor) || !w.major.every(a => src.includes(`'${a}'`)) || !src.includes(`awards.push('${w.pick}')`)) { console.log(`  note [C, printed] ${sport.toUpperCase()}: the engine's award or result words are not where this print reads them; nothing printed`); continue; }
    const all = others[sport].flatMap(o => o.lines);
    const won = all.filter(s => (s.awards ?? []).some(a => w.major.includes(a)));
    const missed = won.filter(s => s.teamResult === w.missed).length;
    const noPick = won.filter(s => !(s.awards ?? []).includes(w.pick)).length;
    const pc = n => (won.length ? `${((100 * n) / won.length).toFixed(1)} percent` : 'none');
    console.log(`  note [C, printed for the legacy recalibration round] ${sport.toUpperCase()}: ${won.length} seasons won ${w.major.join(' or ')} over ${OTHERS_PER * SEEDS.length} careers; ${missed} of them (${pc(missed)}) on a club that missed the playoffs, ${noPick} (${pc(noPick)}) without that season's ${w.pick}`);
  }
}

const size = FULL ? 'full size' : JUDGE ? 'shrunk run, judged at its own size' : 'quick run, bands not judged';
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
