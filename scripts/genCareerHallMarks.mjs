/* genCareerHallMarks.mjs, Round 1051: the standout marks and the base terms of
   the Hall of Fame legacy tables (calibration 2), derived from measured careers.

   The legacy score lets a career total near the top of this game's books stand
   in for hardware the award draw never gave (src/lib/careerHallOfFame.ts,
   legacyRead). "Near the top" is measured, never typed: this script reads the
   careers scripts/simCareerHall.mjs plays and freezes the marks into
   scripts/data/careerHallMarks.json, which section 17 of that harness holds
   the tables in the four *MyCareer.ts files to.

   WHICH TABLE THE MARKS GO INTO. Before the release that first ships
   calibration 2 they go into the version 2 tables (and the recording is
   made again: SIM_RECORD_V2=1 node scripts/simCareerHall.mjs <sport>).
   AFTER THAT RELEASE CALIBRATION 2 IS NEVER EDITED: every career retired on
   it keeps the ballot it was told, and section 15 (d) of the harness holds
   the four tables to scripts/data/careerHallV2.json. A later round that
   moves an engine's stats turns section 17 red on purpose, and its way back
   to green is a NEW calibration: a version 3 table beside version 2 in the
   four *MyCareer.ts files, HALL_CALIBRATION 3 in careerHallOfFame.ts, the
   marks below derived for it, and its own recording.

   THE ONE OTHER WAY BACK, AND ONLY ON THE LEAD'S RULING (Round 1226): THE
   BANDS MEASURED AGAIN, THE MARKS KEPT. Where the real league changed what a
   season holds (the NHL plays 84 games from 2026-27) and the ruling is that
   the marks stay where calibration 2 put them, the three bands of section
   17 (a) are measured again on the engine as it now plays and nothing else
   in the ledger moves: no mark, no list, no base, no outcome, no table, no
   recording. The share at or over a from mark is then no longer one in ten
   by construction, and the ledger says so: the sport's bands carry
   measuredAgain (the round, the reason, the bands they replace). Each such
   sport is named in KEPT below with its reason; a sport that is not there
   cannot be measured this way.
     1. The six measuring runs of that sport, as in HOW TO DERIVE.
     2. MARKS_KEEP=<sport> node scripts/genCareerHallMarks.mjs <dir>
        (only that sport's row files are read; every other sport's block is
        written back exactly as the ledger holds it).

   HOW TO DERIVE:
     1. Six measuring runs a sport, the board skipped, one row file each:
          SIM_SKIP_BOARD=1 SIM_DUMP_ROWS=<dir>/rows-<sport>-base.json node scripts/simCareerHall.mjs <sport> <careers>
          SIM_SKIP_BOARD=1 SIM_SEED=1 SIM_DUMP_ROWS=<dir>/rows-<sport>-1.json ...   (SIM_SEED 1 to 5)
        2000 careers a run (2750 in baseball, eleven positions), so every
        position holds at least 1,500 careers in the pool. Each of those runs
        ends on BOARD SECTIONS SKIPPED and exit 3: that is expected.
     2. node scripts/genCareerHallMarks.mjs <dir>
        writes the ledger and prints, per sport, the standout entries to paste
        into the table of the calibration being built (see above: never a
        calibration that has shipped).
     3. With the tables pasted, do step 1 and step 2 once more. The careers are
        the same (the legacy draws nothing), so the marks come out the same,
        and the rows now carry the score on calibration 2: the second pass
        adds the measured outcome (the Hall share on 1 and on 2, the gain
        among each family's top 5 percent, the base credit) and the bands
        sections 17 and 19 of the harness read.

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
                 two significant digits. The reliever's base is fixed, not
                 measured (saves come in two humps, closers and setup men, so
                 a median means nothing).
     bands       every band is from the six runs at the harness's default
                 size (the first 2000 careers of each run, which are exactly
                 the careers a default run plays). The share of a position's
                 careers at or over a from mark: the envelope of every cell
                 in every run, widened by a quarter of its width each side.
                 The pooled share at or over from, and at or over to: the six
                 run range widened by half its width each side. The pooled
                 gain among each family's top 5 percent (families calibration
                 1 left under 90 percent in): at least half the smallest of
                 the six. The Hall share on 2: under the largest measured
                 plus the six run spread. The median base credit: the six run
                 range widened by half its width each side. */
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* What the real anchors decided (scripts/data/careerHallAnchors.json, section
   18 of the harness): a standout dropped at a position leaves the cells the
   bands are measured over, and a dropped base has no credit to band. The
   marks and the half rule's own list are never touched by them. */
const ANCHOR_FILE = path.join(ROOT, 'scripts/data/careerHallAnchors.json');
const DECISIONS = existsSync(ANCHOR_FILE) ? (JSON.parse(readFileSync(ANCHOR_FILE, 'utf8')).decisions ?? []) : [];
const decided = (sport, pos, kind, stat, action) => DECISIONS.some(d => d.sport === sport && d.pos === pos && d.kind === kind && (kind === 'base' || d.stat === stat) && d.action === action);
const DIR = process.argv[2];
if (!DIR) { console.error('usage: node scripts/genCareerHallMarks.mjs <dir with rows-<sport>-<seed>.json>'); process.exit(2); }
const OUT = process.env.MARKS_OUT || path.join(ROOT, 'scripts/data/careerHallMarks.json');
const SEEDS = ['base', '1', '2', '3', '4', '5'];
const RAMP_FLOOR = 1.10, HALF = 0.5, BASE_TARGET = 110, MIN_POOL = 1500, DEFAULT_N = 2000, TOP_SHARE = 0.05, COVERED = 0.9;
/* Round 1226: the sports whose bands may be measured again with the marks kept
   (the header says when), each with the reason the ledger then records. */
const KEPT = {
  nhl: { round: 1226, why: 'The NHL plays 84 games from 2026-27 (src/data/usSeasonLedgerNhl.ts, two sources), so a present day skater totals about 2.4 percent more than on the 82 game engine the marks were measured on. Calibration 2 has shipped and its marks stay, so more careers reach a from mark than one in ten.' },
};
const KEEP = (process.env.MARKS_KEEP || '').split(',').filter(Boolean);
const LEDGER_FILE = path.join(ROOT, 'scripts/data/careerHallMarks.json');
for (const s of KEEP) if (!KEPT[s]) { console.error(`MARKS_KEEP=${s}: not a sport of KEPT, so its bands cannot be measured again with the marks kept`); process.exit(2); }
if (KEEP.length && !existsSync(LEDGER_FILE)) { console.error('MARKS_KEEP needs the ledger it keeps the marks of'); process.exit(2); }
const WAS = KEEP.length ? JSON.parse(readFileSync(LEDGER_FILE, 'utf8')) : null;
/* Rule B bases that are fixed, not measured. */
/* Round 1103 added the basketball rows, and they are not a base in rule B's sense (calibration 1 read points
   at every NBA position). That round moved the NBA stat line about a fifth lower and held the Hall rate with
   one constant on the points of seasons played on the new line (NBA_LEGACY_NEW_LINE_SCALE in
   src/lib/nbaMyCareer.ts). The constant enters the calibration 2 table as one fixed added term at every
   position, the new line's points at 430 over (the constant less one): 1,075 at 1.4. It is recorded here so
   the ledger carries it and section 19 (a) of the harness holds the table to it like any other added term.
   A round that moves that constant moves these five numbers with it and measures again. */
const NBA_NEW_LINE = [{ stat: 'newLinePts', per: 1075 }];
const FIXED_BASE = {
  mlb: { RP: [{ stat: 'saves', per: 8 }, { stat: 'holds', per: 12 }, { stat: 'so', per: 40 }] },
  nba: { PG: NBA_NEW_LINE, SG: NBA_NEW_LINE, SF: NBA_NEW_LINE, PF: NBA_NEW_LINE, C: NBA_NEW_LINE },
};

/* The plural noun the ballot card prints for each family. */
const LABELS = {
  nba: { pts: 'points', reb: 'rebounds', ast: 'assists' },
  nfl: { passYds: 'passing yards', passTd: 'touchdown passes', rushYds: 'rushing yards', rushTd: 'rushing touchdowns', rec: 'catches', recYds: 'receiving yards', recTd: 'touchdown catches', tackles: 'tackles', sacks: 'sacks', picks: 'interceptions', passDef: 'passes defended', fgMade: 'field goals' },
  mlb: { hr: 'home runs', rbi: 'RBI', sb: 'steals', wins: 'wins', so: 'strikeouts', saves: 'saves' },
  nhl: { goals: 'goals', assists: 'assists', points: 'points', wins: 'wins' },
};
/* Families the engines total that are never a standout, by hand, each with its reason. */
const EXCLUDED = {
  nba: {
    games: 'games played is longevity, which the season weight already pays',
    newLinePts: 'the points of seasons on the Round 1103 stat line: part of the points total, read by a fixed term of the table, never a stat of its own',
  },
  nfl: {
    ints: 'interceptions thrown are a quarterback losing the ball, not production',
    forcedFum: 'forced fumbles: left out by hand in the design, with holds; a game rule, not a measured one and not a claim about any real Hall',
    fgAtt: 'field goal attempts count the misses too',
  },
  mlb: {
    holds: 'holds: setup men went from 5 percent in to 95 on holds alone in the design sample, so they are left out by hand; a game rule, not a claim about any real Hall',
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
const sigUp = (x, d) => { if (x === 0) return 0; const unit = 10 ** (Math.floor(Math.log10(Math.abs(x))) - d + 1); return Number((Math.ceil(x / unit - 1e-9) * unit).toPrecision(d)); };
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
const widen = (xs, k) => { const lo = Math.min(...xs), hi = Math.max(...xs); return { lo: Math.max(0, Math.round((lo - k * (hi - lo)) * 1e4) / 1e4), hi: Math.round((hi + k * (hi - lo)) * 1e4) / 1e4, measured: xs.map(x => Math.round(x * 1e4) / 1e4) }; };
/* The bands, at the default size, against the marks and the lists `out` holds
   (the ones just derived, or with MARKS_KEEP the ones the ledger already held). */
const measureBands = (sport, out, runs) => {
  const cells = POSITIONS[sport].flatMap(pos => (out.standouts[pos] ?? []).filter(f => !decided(sport, pos, 'standout', f, 'dropped')).map(f => ({ pos, f, m: out.positions[pos].families[f] })));
  const cellShares = [], fromPooled = [], toPooled = [];
  for (const run of runs) {
    let a = 0, b = 0, n = 0;
    for (const { pos, f, m } of cells) {
      const mine = run.filter(r => r.pos === pos);
      const over = mine.filter(r => (r.t[f] ?? 0) >= m.from).length;
      cellShares.push(over / mine.length);
      a += over; b += mine.filter(r => (r.t[f] ?? 0) >= m.to).length; n += mine.length;
    }
    fromPooled.push(a / n); toPooled.push(b / n);
  }
  const env = widen(cellShares, 0.25);
  return { cells, bands: { defaultCareers: DEFAULT_N, fromCell: { lo: env.lo, hi: env.hi, measuredLo: Math.min(...env.measured), measuredHi: Math.max(...env.measured), cells: cellShares.length }, fromPooled: widen(fromPooled, 0.5), toPooled: widen(toPooled, 0.5) } };
};
const bandsLine = b => `a cell's share at or over from ${(100 * b.fromCell.measuredLo).toFixed(1)} to ${(100 * b.fromCell.measuredHi).toFixed(1)} percent over ${b.fromCell.cells} cell runs (band ${(100 * b.fromCell.lo).toFixed(1)} to ${(100 * b.fromCell.hi).toFixed(1)}); pooled from ${b.fromPooled.measured.map(x => (100 * x).toFixed(2)).join(' ')} (band ${(100 * b.fromPooled.lo).toFixed(2)} to ${(100 * b.fromPooled.hi).toFixed(2)}); pooled to ${b.toPooled.measured.map(x => (100 * x).toFixed(2)).join(' ')} (band ${(100 * b.toPooled.lo).toFixed(2)} to ${(100 * b.toPooled.hi).toFixed(2)})`;

let short = 0;
for (const sport of Object.keys(POSITIONS)) {
  // MARKS_KEEP: a sport that is not named keeps its whole block, and no row file of it is read.
  if (KEEP.length && !KEEP.includes(sport)) { ledger.sports[sport] = WAS.sports[sport]; continue; }
  const rows = [];
  const perSeed = [];
  const runs = [];
  for (const seed of SEEDS) {
    const f = path.join(DIR, `rows-${sport}-${seed}.json`);
    if (!existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
    const r = JSON.parse(readFileSync(f, 'utf8'));
    perSeed.push(r.length);
    rows.push(...r);
    runs.push(r.slice(0, DEFAULT_N));
  }
  if (KEEP.includes(sport)) {
    /* The marks kept: the block as the ledger holds it, the three bands alone
       measured again on these runs, and the reason written beside them. */
    const kept = { ...WAS.sports[sport] };
    const old = kept.bands;
    const first = old.measuredAgain?.replaced ?? { fromCell: [old.fromCell.lo, old.fromCell.hi], fromPooled: [old.fromPooled.lo, old.fromPooled.hi], toPooled: [old.toPooled.lo, old.toPooled.hi] };
    kept.bands = { ...measureBands(sport, kept, runs).bands, measuredAgain: { round: KEPT[sport].round, why: KEPT[sport].why, replaced: first } };
    ledger.sports[sport] = kept;
    console.log(`\n== ${sport}: THE MARKS KEPT, the bands measured again on ${rows.length} careers (${perSeed.join(', ')})`);
    console.log(`  bands at ${DEFAULT_N} careers: ${bandsLine(kept.bands)}`);
    console.log(`  they replace: a cell ${(100 * first.fromCell[0]).toFixed(1)} to ${(100 * first.fromCell[1]).toFixed(1)}; pooled from ${(100 * first.fromPooled[0]).toFixed(2)} to ${(100 * first.fromPooled[1]).toFixed(2)}; pooled to ${(100 * first.toPooled[0]).toFixed(2)} to ${(100 * first.toPooled[1]).toFixed(2)}`);
    continue;
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
      // Rounded up where plain rounding would land under the floor, so to is never less than from times the floor.
      const to = sig(p99, 3) >= floor ? sig(p99, 3) : sigUp(floor, 3);
      fam[f] = { median: p50, p90, p99, from, to, floored: sig(p99, 3) < floor };
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
  for (const [pos, terms] of Object.entries(FIXED_BASE[sport] ?? {})) out.base[pos] = terms.map(t => ({ ...t, fixed: true, median: out.positions[pos].families[t.stat].median }));

  /* The bands, at the default size. */
  const { cells, bands } = measureBands(sport, out, runs);
  out.bands = bands;

  /* The second pass: the outcome on calibration 2, when the rows carry it. */
  if (runs.every(run => run.every(r => typeof r.hof2 === 'boolean' && typeof r.hof2b === 'boolean'))) {
    const gains = [], own = [], hall1 = [], hall2 = [], med1 = [], med2 = [], mean1 = [], mean2 = [], newlyIn = [];
    const baseMed = Object.fromEntries(Object.keys(out.base).filter(p => !decided(sport, p, 'base', null, 'dropped')).map(p => [p, []]));
    for (const run of runs) {
      let in1 = 0, in2 = 0, n = 0, sIn = 0, sOut = 0, sN = 0;
      for (const { pos, f } of cells) {
        const mine = run.filter(r => r.pos === pos).sort((x, y) => (y.t[f] ?? 0) - (x.t[f] ?? 0));
        const top = mine.slice(0, Math.ceil(TOP_SHARE * mine.length));
        const s1 = top.filter(r => r.hof1).length;
        sIn += top.filter(r => r.hof2).length; sOut += top.filter(r => r.hof2b).length; sN += top.length;
        if (s1 / top.length >= COVERED) continue;
        in1 += s1; in2 += top.filter(r => r.hof2).length; n += top.length;
      }
      gains.push(n ? (in2 - in1) / n : 0);
      own.push(sN ? (sIn - sOut) / sN : 0);
      hall1.push(run.filter(r => r.hof1).length / run.length);
      hall2.push(run.filter(r => r.hof2).length / run.length);
      newlyIn.push(run.filter(r => r.hof2 && !r.hof1).length);
      med1.push(median(run.map(r => r.s1))); med2.push(median(run.map(r => r.s2)));
      mean1.push(Math.round(10 * run.reduce((s, r) => s + r.s1, 0) / run.length) / 10); mean2.push(Math.round(10 * run.reduce((s, r) => s + r.s2, 0) / run.length) / 10);
      for (const [pos, terms] of Object.entries(out.base)) if (baseMed[pos]) baseMed[pos].push(median(run.filter(r => r.pos === pos).map(r => terms.reduce((s, t) => s + (r.t[t.stat] ?? 0) / t.per, 0))));
    }
    const r4 = xs => xs.map(x => Math.round(x * 1e4) / 1e4);
    out.outcome = {
      topShare: TOP_SHARE, covered: COVERED,
      pooledGain: { measured: r4(gains), floor: Math.round((Math.min(...gains) / 2) * 1e4) / 1e4 },
      // The same top 5 percent, every cell: in the Hall on 2 against the same score with the standout taken out.
      standoutGain: { measured: r4(own), floor: Math.round((Math.min(...own) / 2) * 1e4) / 1e4 },
      hallShare1: r4(hall1), hallShare2: r4(hall2),
      hallCeiling: Math.round((Math.max(...hall2) + (Math.max(...hall2) - Math.min(...hall2))) * 1e4) / 1e4,
      newlyIn, medianScore1: med1, medianScore2: med2, meanScore1: mean1, meanScore2: mean2,
      baseCredit: Object.fromEntries(Object.entries(baseMed).map(([p, xs]) => [p, { ...widen(xs, 0.5), measured: xs.map(x => Math.round(x * 10) / 10) }])),
    };
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
  console.log(`  bands at ${DEFAULT_N} careers: a cell's share at or over from ${(100 * out.bands.fromCell.measuredLo).toFixed(1)} to ${(100 * out.bands.fromCell.measuredHi).toFixed(1)} percent over ${out.bands.fromCell.cells} cell runs (band ${(100 * out.bands.fromCell.lo).toFixed(1)} to ${(100 * out.bands.fromCell.hi).toFixed(1)}); pooled from ${out.bands.fromPooled.measured.map(x => (100 * x).toFixed(2)).join(' ')} (band ${(100 * out.bands.fromPooled.lo).toFixed(2)} to ${(100 * out.bands.fromPooled.hi).toFixed(2)}); pooled to ${out.bands.toPooled.measured.map(x => (100 * x).toFixed(2)).join(' ')} (band ${(100 * out.bands.toPooled.lo).toFixed(2)} to ${(100 * out.bands.toPooled.hi).toFixed(2)})`);
  if (out.outcome) {
    const o = out.outcome;
    console.log(`  outcome: Hall share on 1 ${o.hallShare1.map(x => (100 * x).toFixed(1)).join(' ')}; on 2 ${o.hallShare2.map(x => (100 * x).toFixed(1)).join(' ')} (ceiling ${(100 * o.hallCeiling).toFixed(1)}); newly in ${o.newlyIn.join(' ')}; pooled top 5 percent gain ${o.pooledGain.measured.map(x => (100 * x).toFixed(1)).join(' ')} points (floor ${(100 * o.pooledGain.floor).toFixed(1)}); owed to the standout alone ${o.standoutGain.measured.map(x => (100 * x).toFixed(1)).join(' ')} (floor ${(100 * o.standoutGain.floor).toFixed(1)})`);
    console.log(`  points paid: median ${o.medianScore1.join(' ')} -> ${o.medianScore2.join(' ')}; mean ${o.meanScore1.join(' ')} -> ${o.meanScore2.join(' ')}`);
    for (const [p, b] of Object.entries(o.baseCredit)) console.log(`  base credit, median ${p}: ${b.measured.join(' ')} (band ${b.lo} to ${b.hi})`);
  }
  if (out.nearHalf.length) console.log(`  within five percent of the half mark: ${out.nearHalf.map(c => `${c.pos} ${c.family} ${c.from} vs ${c.half} (${c.on ? 'on' : 'off'})`).join('; ')}`);
}
if (short) { console.error(`${short} positions under ${MIN_POOL} pooled careers: raise the careers argument and measure again`); process.exit(1); }
writeFileSync(OUT, `${JSON.stringify(ledger, null, 1)}\n`);
console.log(`\ngenCareerHallMarks: wrote ${path.relative(ROOT, OUT)}`);
