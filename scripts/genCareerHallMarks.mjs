/* genCareerHallMarks.mjs, Round 1051: the standout marks and the base terms of
   the Hall of Fame legacy tables (calibration 2), derived from measured careers.

   The legacy score lets a career total near the top of this game's books stand
   in for hardware the award draw never gave (src/lib/careerHallOfFame.ts,
   legacyRead). "Near the top" is measured, never typed: this script reads the
   careers scripts/simCareerHall.mjs plays and freezes the marks into
   scripts/data/careerHallMarks.json, which section 17 of that harness holds
   the tables in the four *MyCareer.ts files to.

   HOW TO RE-DERIVE (a round that moves an engine's stats turns section 17 red
   on purpose; this is the way back to green):
     1. Six measuring runs a sport, the board skipped, one row file each:
          SIM_SKIP_BOARD=1 SIM_DUMP_ROWS=<dir>/rows-<sport>-base.json node scripts/simCareerHall.mjs <sport> <careers>
          SIM_SKIP_BOARD=1 SIM_SEED=1 SIM_DUMP_ROWS=<dir>/rows-<sport>-1.json ...   (SIM_SEED 1 to 5)
        2000 careers a run (2750 in baseball, eleven positions), so every
        position holds at least 1,500 careers in the pool. Each of those runs
        ends on BOARD SECTIONS SKIPPED and exit 3: that is expected.
     2. node scripts/genCareerHallMarks.mjs <dir>
        writes the ledger and prints, per sport, the standout entries to paste
        into the version 2 table.

   THE RULES IT APPLIES (the ledger records them too):
     population  the harness's own sections 1 to 8 loop with its four answer
                 policies, pooled over the six runs. Never a loop that plays
                 every career to the hard stop, and never the mean of six
                 small percentiles.
     from        the position's pooled 90th percentile career total.
     to          the larger of the pooled 99th percentile and from times 1.10
                 (the ramp floor: in a flat family the whole credit would
                 otherwise be won inside one ordinary season).
     digits      three significant digits.
     half rule   a position carries a family as a standout if and only if its
                 from mark is above zero and at least half the largest from
                 mark any position of the sport has for that family, and the
                 family is not excluded by hand (EXCLUDED below, each with
                 its reason).
     base        (NFL TE, LB, CB, EDGE) terms sized so the position's median
                 career earns about 110 points, split by the shares below; a
                 term's per is the median total over (110 times the share),
                 two significant digits. */
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = process.argv[2];
if (!DIR) { console.error('usage: node scripts/genCareerHallMarks.mjs <dir with rows-<sport>-<seed>.json>'); process.exit(2); }
const OUT = process.env.MARKS_OUT || path.join(ROOT, 'scripts/data/careerHallMarks.json');
const SEEDS = ['base', '1', '2', '3', '4', '5'];
const RAMP_FLOOR = 1.10, HALF = 0.5, BASE_TARGET = 110, MIN_POOL = 1500;

/* The plural noun the ballot card prints for each family. */
const LABELS = {
  nba: { pts: 'points', reb: 'rebounds', ast: 'assists' },
  nfl: { passYds: 'passing yards', passTd: 'touchdown passes', rushYds: 'rushing yards', rushTd: 'rushing touchdowns', rec: 'catches', recYds: 'receiving yards', recTd: 'touchdown catches', tackles: 'tackles', sacks: 'sacks', picks: 'interceptions', passDef: 'passes defensed', fgMade: 'field goals' },
  mlb: { hr: 'home runs', rbi: 'RBI', sb: 'steals', wins: 'wins', so: 'strikeouts', saves: 'saves' },
  nhl: { goals: 'goals', assists: 'assists', points: 'points', wins: 'wins' },
};
/* Families the engines total that are never a standout, by hand, each with its reason. */
const EXCLUDED = {
  nba: { games: 'games played is longevity, which the season weight already pays' },
  nfl: {
    ints: 'interceptions thrown are a quarterback losing the ball, not production',
    forcedFum: 'forced fumbles: no real Hall case has ever rested on them',
    fgAtt: 'field goal attempts count the misses too',
  },
  mlb: {
    holds: 'holds: setup men went from 5 percent in to 95 on holds alone in the design sample, and no real Hall has worked that way',
    games: 'games played is longevity, which the season weight already pays',
  },
  nhl: { games: 'games played is longevity, which the season weight already pays' },
};
/* Rule B: the positions calibration 1 read nothing for, and how their base splits. */
const BASE_SHARES = {
  nfl: {
    TE: { recYds: 0.5, rec: 0.25, recTd: 0.25 },
    LB: { tackles: 0.5, sacks: 0.2, picks: 0.15, forcedFum: 0.15 },
    CB: { picks: 0.45, passDef: 0.3, tackles: 0.25 },
    EDGE: { sacks: 0.6, tackles: 0.2, forcedFum: 0.2 },
  },
};
const POSITIONS = {
  nfl: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], nba: ['PG', 'SG', 'SF', 'PF', 'C'],
  mlb: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], nhl: ['C', 'LW', 'RW', 'D', 'G'],
};

const sig = (x, d) => (x === 0 ? 0 : Number(x.toPrecision(d)));
/* The q quantile by nearest rank on the sorted pool. */
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

const ledger = {
  note: 'Round 1051: the measured marks behind the calibration 2 legacy tables. Written by scripts/genCareerHallMarks.mjs from the pooled careers of six measuring runs of scripts/simCareerHall.mjs; never edited by hand.',
  rules: {
    population: 'sections 1 to 8 loop of scripts/simCareerHall.mjs (four answer policies), default seed and SIM_SEED 1 to 5 pooled',
    from: 'pooled 90th percentile of the position',
    to: `the larger of the pooled 99th percentile and from times ${RAMP_FLOOR}`,
    digits: 3, rampFloor: RAMP_FLOOR, half: HALF, baseTarget: BASE_TARGET,
  },
  excluded: EXCLUDED,
  labels: LABELS,
  sports: {},
};
let short = 0;
for (const sport of Object.keys(POSITIONS)) {
  const rows = [];
  const perSeed = [];
  for (const seed of SEEDS) {
    const f = path.join(DIR, `rows-${sport}-${seed}.json`);
    if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
    const r = JSON.parse(readFileSync(f, 'utf8'));
    perSeed.push(r.length);
    rows.push(...r);
  }
  const families = Object.keys(rows[0].t).filter(f => !(f in EXCLUDED[sport]));
  const out = { careers: rows.length, runs: perSeed, positions: {}, standouts: {}, base: {}, nearHalf: [] };
  // The marks, every position and every family the engine totals.
  for (const pos of POSITIONS[sport]) {
    const mine = rows.filter(r => r.pos === pos);
    if (mine.length < MIN_POOL) { short += 1; console.error(`${sport} ${pos}: only ${mine.length} careers in the pool, needs ${MIN_POOL}`); }
    const fam = {};
    for (const f of Object.keys(rows[0].t)) {
      const sorted = mine.map(r => r.t[f] ?? 0).sort((a, b) => a - b);
      const p50 = quantile(sorted, 0.5), p90 = quantile(sorted, 0.9), p99 = quantile(sorted, 0.99);
      const from = sig(p90, 3);
      const floor = from * RAMP_FLOOR;
      const to = sig(Math.max(p99, floor), 3);
      fam[f] = { median: p50, p90, p99, from, to, floored: p99 < floor };
    }
    out.positions[pos] = {
      n: mine.length, medianSeasons: median(mine.map(r => r.seasons)),
      hallShare1: Math.round((1000 * mine.filter(r => r.hof1).length) / mine.length) / 10,
      medianScore1: median(mine.map(r => r.s1)), families: fam,
    };
  }
  // The half rule, both directions, mechanically.
  for (const f of families) {
    const top = Math.max(...POSITIONS[sport].map(p => out.positions[p].families[f].from));
    if (!(top > 0)) continue;
    for (const pos of POSITIONS[sport]) {
      const from = out.positions[pos].families[f].from;
      const on = from > 0 && from >= HALF * top;
      if (on) (out.standouts[pos] ??= []).push(f);
      const ratio = from / (HALF * top);
      if (from > 0 && Math.abs(ratio - 1) <= 0.05) out.nearHalf.push({ pos, family: f, from, half: HALF * top, on });
    }
  }
  // Rule B: the base terms, from the pooled medians.
  for (const [pos, shares] of Object.entries(BASE_SHARES[sport] ?? {})) {
    out.base[pos] = Object.entries(shares).map(([stat, share]) => {
      const med = out.positions[pos].families[stat].median;
      return { stat, share, median: med, per: sig(med / (BASE_TARGET * share), 2) };
    });
  }
  ledger.sports[sport] = out;

  console.log(`\n== ${sport}: ${rows.length} careers pooled (${perSeed.join(', ')})`);
  for (const pos of POSITIONS[sport]) {
    const P = out.positions[pos];
    const list = out.standouts[pos] ?? [];
    console.log(`  ${pos}: n ${P.n}, median seasons ${P.medianSeasons}, Hall on 1 ${P.hallShare1}%, median score ${P.medianScore1}`);
    const entries = list.map(f => {
      const m = P.families[f];
      const perSeason = m.from / Math.max(1, P.medianSeasons);
      console.log(`     ${f}: median ${m.median}, from ${m.from}, to ${m.to}${m.floored ? ' (ramp floor)' : ''}; ramp ${((m.to - m.from) / perSeason).toFixed(2)} seasons, to over median ${(m.to / Math.max(1, m.median)).toFixed(2)}`);
      return `{ stat: '${f}', from: ${m.from}, to: ${m.to}, label: '${LABELS[sport][f]}' }`;
    });
    console.log(`     standout: [${entries.join(', ')}]`);
    if (out.base[pos]) console.log(`     base terms: [${out.base[pos].map(t => `{ stat: '${t.stat}', per: ${t.per} }`).join(', ')}]  (medians ${out.base[pos].map(t => `${t.stat} ${t.median}`).join(', ')})`);
  }
  if (out.nearHalf.length) console.log(`  within five percent of the half mark: ${out.nearHalf.map(c => `${c.pos} ${c.family} ${c.from} vs ${c.half} (${c.on ? 'on' : 'off'})`).join('; ')}`);
}
if (short) { console.error(`${short} positions under ${MIN_POOL} pooled careers: raise the careers argument and measure again`); process.exit(1); }
writeFileSync(OUT, `${JSON.stringify(ledger, null, 1)}\n`);
console.log(`\ngenCareerHallMarks: wrote ${path.relative(ROOT, OUT)}`);
