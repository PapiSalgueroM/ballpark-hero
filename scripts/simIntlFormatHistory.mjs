/**
 * Round 1027 harness: does every World Cup and continental cup play the
 * format its year really had?
 *
 * Before Round 1027 tournamentForYear returned one shape per competition
 * whatever the year, so a 1994 World Cup had 48 teams and a round of 32. The
 * shapes now come from src/lib/intlFormatHistory.ts (two non-Wikipedia
 * publishers per row). This harness holds the table and the engine to each
 * other, and the table to an independent ledger:
 *
 *  1. the table is well formed: rows in order and never overlapping, one
 *     current row per competition, every source id real, two publishers per
 *     row and no Wikipedia anywhere, every unplayable row pointing at a
 *     playable row of its own competition, thin rows (INTL_FORMAT_PARTIAL)
 *     always unplayable with a fallback
 *  2. every playable row is a bracket that adds up: teams = groups x size,
 *     size 3 or 4, and two per group plus the best thirds is exactly the
 *     first knockout round
 *  3. the LEDGER below, written from the same sources but typed separately,
 *     agrees with the table for every competition and every game year from
 *     1990 to 2040: a period swapped in the table cannot pass silently
 *  4. the engine walks every year from 1990 to 2040, for a nation of every
 *     confederation, and tournamentForYear gives off years null and every
 *     tournament year exactly the shape the table has in force
 *  5. the World Cup field mix in force adds up to that year's team count, and
 *     the 2026 mix is the engine's WC_SLOTS plus its two play off places
 *  6. simulated tournaments, one per competition per game year, play the
 *     shape: the first round has teams through / 2 ties, every later round
 *     half the one before, one final, my group the row's group size, and a
 *     qualified nation is always in the finals (the play off place)
 *  7. from 2026 to 2040 the format is the one main shipped (the literal
 *     constants below), and a seeded summer played by this engine is byte
 *     identical to the same summer played by MAIN'S ENGINE: a second bundle
 *     of soccerInternational.ts with every region Round 1027 changed put back
 *     to main's literal code (MAIN_EDITS below, each anchor asserted present)
 *  8. Club Manager's national job (runManagerSummer, which is handed a season
 *     counter, not a year) plays byte identical summers to main's engine for
 *     seasons 1 to 40, and a real calendar year still plays its era
 *  9. the World Cup field mix in force matches a separately typed ledger of
 *     who played each finals, and the number of a qualifying group that goes
 *     through ("Top N go through") is the era's, for every confederation and
 *     every World Cup and continental game year
 * 10. the Copa America's invited guests come from the era's confederation, in
 *     the era's number (two from Concacaf, six in 2016 and 2024, two from the
 *     AFC in the 2019 shape)
 * 11. a qualified nation from a confederation with no World Cup place takes
 *     the place of the WEAKEST finalist: the world's top ranked nation keeps
 *     its place in every one of the seeded fields
 *
 * There are no statistical bands here: every check is exact, so there is no
 * headroom to measure. Seeds: the harness stream (scripts/lib/seedRandom.mjs)
 * plus a fixed mulberry32 seed per summer in section 7.
 *
 * Negative controls (each must turn the run red, and each asserts the string
 * it mutates exists before mutating):
 *   SIM_INTL_FORMAT_CONTROL=swap      swaps euro-16 and euro-24 shapes in the
 *                                     table (section 3 goes red)
 *   SIM_INTL_FORMAT_CONTROL=fixed     tournamentForYear ignores the table and
 *                                     returns the 2026 constants (section 4)
 *   SIM_INTL_FORMAT_CONTROL=thirds    the 24 team World Cup sends 2 thirds
 *                                     through instead of 4 (sections 2 and 6)
 *   SIM_INTL_FORMAT_CONTROL=playoff   drops the play off place for a
 *                                     qualified nation with no direct place
 *                                     (section 6)
 *   SIM_INTL_FORMAT_CONTROL=identity  moves one 2026 World Cup place from
 *                                     UEFA to CAF in the table (section 7)
 *   SIM_INTL_FORMAT_CONTROL=engine    reorders the play off pool in this
 *                                     engine only, a change to 2026 play that
 *                                     the format objects cannot see (section 7)
 *   SIM_INTL_FORMAT_CONTROL=manager   runManagerSummer reads the season
 *                                     counter as a year again (section 8)
 *   SIM_INTL_FORMAT_CONTROL=share     qualifying uses 2026's World Cup places
 *                                     in every era (section 9)
 *   SIM_INTL_FORMAT_CONTROL=mix       moves one 1994 place from CAF to UEFA,
 *                                     keeping the total (section 9)
 *   SIM_INTL_FORMAT_CONTROL=guests    every Copa guest comes from Concacaf
 *                                     (section 10)
 *   SIM_INTL_FORMAT_CONTROL=weakest   the play off winner takes the place of
 *                                     the STRONGEST finalist (section 11)
 *
 * Run: node scripts/simIntlFormatHistory.mjs
 */
/* Seeded stream first, the house rule. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_INTL_FORMAT_CONTROL ?? '';

let failures = 0, passes = 0;
const fail = (m) => { failures++; failedSections.add(section); console.log(`  FAIL ${m}`); };
const ok = (m) => { passes++; if (process.env.VERBOSE) console.log(`  ok   ${m}`); };
const check = (cond, m) => (cond ? ok(m) : fail(m));

/* Each control: which file, the exact text it replaces, and the new text. */
const CONTROLS = {
  swap: {
    file: 'src/lib/intlFormatHistory.ts',
    edits: [
      ["teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,\n    sources: ['fhEuro', 'rsEuro', 'rs96e'],",
       "teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,\n    sources: ['fhEuro', 'rsEuro', 'rs96e'],"],
      ["teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,\n    sources: ['fhEuro', 'rsEuro', 'rs16e'],",
       "teams: 16, groups: 4, groupSize: 4, thirdsThrough: 0, firstKnockout: 'QF', playable: true,\n    sources: ['fhEuro', 'rsEuro', 'rs16e'],"],
    ],
  },
  fixed: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["if (isWorldCupYear(year)) return formatInForce(WORLD_CUP, 'WC', year);",
       "if (isWorldCupYear(year)) return WORLD_CUP;"],
      ["return formatInForce(CONTINENTAL[conf], conf, year);",
       "return CONTINENTAL[conf];"],
    ],
  },
  thirds: {
    file: 'src/lib/intlFormatHistory.ts',
    edits: [
      ["teams: 24, groups: 6, groupSize: 4, thirdsThrough: 4, firstKnockout: 'R16', playable: true,\n    sources: ['tesFormats', 'rs90'",
       "teams: 24, groups: 6, groupSize: 4, thirdsThrough: 2, firstKnockout: 'R16', playable: true,\n    sources: ['tesFormats', 'rs90'"],
    ],
  },
  playoff: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["if (forced && !field.includes(forced) && NATION_CONFED[forced]) {",
       "if (false && forced && !field.includes(forced) && NATION_CONFED[forced]) {"],
      ["field.push(...pickField(leftovers, mix.open, stillOut));",
       "field.push(...pickField(leftovers, mix.open, null && stillOut));"],
    ],
  },
  identity: {
    file: 'src/lib/intlFormatHistory.ts',
    edits: [
      ["places: { UEFA: 16, CAF: 9, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1 },",
       "places: { UEFA: 15, CAF: 10, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1 },"],
    ],
  },
  engine: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["field.push(...pickField(leftovers, mix.open, stillOut));",
       "field.push(...pickField(leftovers.reverse(), mix.open, stillOut));"],
    ],
  },
  manager: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["const fmt = tournamentForYear(nation, managerFormatYear(year));",
       "const fmt = tournamentForYear(nation, year);"],
    ],
  },
  share: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["return mix.places[conf] + mix.open / 6;",
       "return WC_SLOTS[conf] + WC_PLAYOFF_SLOTS / 6;"],
    ],
  },
  mix: {
    file: 'src/lib/intlFormatHistory.ts',
    edits: [
      ["places: { UEFA: 13, CAF: 3, AFC: 2, CONMEBOL: 4, CONCACAF: 2, OFC: 0 },",
       "places: { UEFA: 14, CAF: 2, AFC: 2, CONMEBOL: 4, CONCACAF: 2, OFC: 0 },"],
    ],
  },
  guests: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["nationsIn(fmt.guestsFrom ?? 'CONCACAF')", "nationsIn('CONCACAF')"],
    ],
  },
  weakest: {
    file: 'src/lib/soccerInternational.ts',
    edits: [
      ["if (fifaRankOf(field[i]) > fifaRankOf(field[weakest])) weakest = i;",
       "if (fifaRankOf(field[i]) < fifaRankOf(field[weakest])) weakest = i;"],
    ],
  },
};
/* The section each control exists to prove; under a control the run must
   fail THAT section, not just any. */
const CONTROL_SECTION = {
  swap: 3, fixed: 4, thirds: 6, playoff: 6, identity: 7,
  engine: 7, manager: 8, share: 9, mix: 9, guests: 10, weakest: 11,
};

/* MAIN'S ENGINE. Every region of soccerInternational.ts that Round 1027
   changed, put back to the literal code main shipped before it (commit
   8f27082f). Applied to a second bundle only, never with a control. Every
   anchor must be found, or the comparison would quietly be this engine
   against itself. A later round that rewrites one of these regions has to
   restate main's code here on purpose. */
const MAIN_EDITS = [
  ["if (isWorldCupYear(year)) return formatInForce(WORLD_CUP, 'WC', year);\n  if (isContinentalYear(year)) {\n    const conf = confederationOf(nation);\n    return formatInForce(CONTINENTAL[conf], conf, year);\n  }",
   "if (isWorldCupYear(year)) return WORLD_CUP;\n  if (isContinentalYear(year)) return CONTINENTAL[confederationOf(nation)];"],
  ["const mix = fmt.fieldMix ?? { places: WC_SLOTS, open: WC_PLAYOFF_SLOTS };\n    return mix.places[conf] + mix.open / 6;",
   "return WC_SLOTS[conf] + WC_PLAYOFF_SLOTS / 6;"],
  ["const mix = fmt.fieldMix ?? { places: WC_SLOTS, open: WC_PLAYOFF_SLOTS };\n    for (const conf of Object.keys(WC_SLOTS) as Confederation[]) {\n      const slots = mix.places[conf];",
   "for (const conf of Object.keys(WC_SLOTS) as Confederation[]) {\n      const slots = WC_SLOTS[conf];"],
  ["const stillOut = forced && !field.includes(forced) ? forced : null;\n    field.push(...pickField(leftovers, mix.open, stillOut));",
   "field.push(...pickField(leftovers, WC_PLAYOFF_SLOTS, null));"],
  ["if (forced && !field.includes(forced) && NATION_CONFED[forced]) {",
   "if (false) {"],
  ["nationsIn(fmt.guestsFrom ?? 'CONCACAF')", "nationsIn('CONCACAF')"],
  ["const first = fmt.firstRound ?? firstRoundFor(koField.length);",
   "const first = firstRoundFor(koField.length);"],
  ["const fmt = tournamentForYear(nation, managerFormatYear(year));",
   "const fmt = tournamentForYear(nation, year);"],
];
let section = 0;
const failedSections = new Set();

const control = CONTROL ? CONTROLS[CONTROL] : null;
if (CONTROL && !control) { console.log(`unknown control ${CONTROL}`); process.exit(2); }
if (control) {
  /* The control must change something, or green would mean nothing. */
  const src = fs.readFileSync(path.join(ROOT, control.file), 'utf8').replace(/\r\n/g, '\n');
  for (const [from] of control.edits) {
    if (!src.includes(from)) { console.log(`control ${CONTROL}: text to mutate not found in ${control.file}`); process.exit(2); }
  }
  console.log(`CONTROL ${CONTROL}: mutating ${control.file} (${control.edits.length} edit(s)), this run must go red`);
}
{
  /* Main's engine must be rebuilt in full, or section 7 compares nothing. */
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/soccerInternational.ts'), 'utf8').replace(/\r\n/g, '\n');
  for (const [from] of MAIN_EDITS) {
    const n = src.split(from).length - 1;
    if (n !== 1) { console.log(`MAIN_EDITS: anchor found ${n} times, wants 1: ${from.slice(0, 70)}`); process.exit(2); }
  }
}
/* mode 'branch': this tree, plus the control if any, plus a harness only
   export of buildField (section 10 and 11 read the field it draws). mode
   'main': main's engine, never a control. */
const plugin = (mode) => ({
  name: `intl-format-${mode}`,
  setup(b) {
    b.onLoad({ filter: /(intlFormatHistory|soccerInternational)\.ts$/ }, (args) => {
      let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      const isEngine = args.path.split(path.sep).join('/').endsWith('src/lib/soccerInternational.ts');
      if (mode === 'branch' && control && args.path.split(path.sep).join('/').endsWith(control.file)) {
        for (const [from, to] of control.edits) text = text.split(from).join(to);
      }
      if (mode === 'main' && isEngine) {
        for (const [from, to] of MAIN_EDITS) text = text.split(from).join(to);
      }
      if (mode === 'branch' && isEngine) text += '\nexport { buildField as __harnessBuildField };\n';
      return { contents: text, loader: 'ts' };
    });
  },
});
const posix = ROOT.split(path.sep).join('/');
async function bundle(mode, entryText) {
  const entry = path.join(os.tmpdir(), `sim-intl-format-entry-${mode}-${process.pid}.mjs`);
  const out = path.join(os.tmpdir(), `sim-intl-format-${mode}-${process.pid}.mjs`);
  fs.writeFileSync(entry, entryText);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin(mode)],
  });
  const mod = await import(pathToFileURL(out).href);
  fs.rmSync(out, { force: true });
  fs.rmSync(entry, { force: true });
  return mod;
}
const { intl, hist } = await bundle('branch',
  `export * as intl from '${posix}/src/lib/soccerInternational.ts';\nexport * as hist from '${posix}/src/lib/intlFormatHistory.ts';\n`);
const { intl: mainIntl } = await bundle('main',
  `export * as intl from '${posix}/src/lib/soccerInternational.ts';\n`);

/* The ledger. Typed from the sources named in intlFormatHistory.ts, on
   purpose separately from it: teams/groups x size/thirds/first round, by the
   game years each shape is played (World Cup years % 4 === 2, continental
   years % 4 === 0, unplayable shapes already replaced by what the game plays).
   Change a shape in the table and this must change too, deliberately. */
const LEDGER = {
  WC: [[1990, 1994, '24/6x4/4/R16'], [1998, 2022, '32/8x4/0/R16'], [2026, 2038, '48/12x4/8/R32']],
  UEFA: [[1992, 1992, '8/2x4/0/SF'], [1996, 2012, '16/4x4/0/QF'], [2016, 2040, '24/6x4/4/R16']],
  CONMEBOL: [[1992, 2012, '12/3x4/2/QF'], [2016, 2016, '16/4x4/0/QF'], [2020, 2020, '12/3x4/2/QF'], [2024, 2040, '16/4x4/0/QF']],
  CAF: [[1992, 1992, '12/4x3/0/QF'], [1996, 2016, '16/4x4/0/QF'], [2020, 2040, '24/6x4/4/R16']],
  AFC: [[1992, 1992, '8/2x4/0/SF'], [1996, 2000, '12/3x4/2/QF'], [2004, 2016, '16/4x4/0/QF'], [2020, 2040, '24/6x4/4/R16']],
  CONCACAF: [[1992, 1996, '8/2x4/0/SF'], [2000, 2004, '12/4x3/0/QF'], [2008, 2016, '12/3x4/2/QF'], [2020, 2040, '16/4x4/0/QF']],
  OFC: [[1992, 2000, '6/2x3/0/SF'], [2004, 2040, '8/2x4/0/SF']],
};
/* What main shipped before Round 1027, for every year: the 2026 shapes. */
const MAIN_FORMATS = {
  WC: { name: 'World Cup', short: 'World Cup', kind: 'World Cup', confederation: null, teams: 48, groups: 12, thirdsThrough: 8, finalists: 48 },
  UEFA: { name: 'European Championship', short: 'Euros', kind: 'Continental', confederation: 'UEFA', teams: 24, groups: 6, thirdsThrough: 4, finalists: 24 },
  CONMEBOL: { name: 'Copa América', short: 'Copa América', kind: 'Continental', confederation: 'CONMEBOL', teams: 16, groups: 4, thirdsThrough: 0, finalists: 10 },
  CAF: { name: 'Africa Cup of Nations', short: 'AFCON', kind: 'Continental', confederation: 'CAF', teams: 24, groups: 6, thirdsThrough: 4, finalists: 24 },
  AFC: { name: 'Asian Cup', short: 'Asian Cup', kind: 'Continental', confederation: 'AFC', teams: 24, groups: 6, thirdsThrough: 4, finalists: 24 },
  CONCACAF: { name: 'Gold Cup', short: 'Gold Cup', kind: 'Continental', confederation: 'CONCACAF', teams: 16, groups: 4, thirdsThrough: 0, finalists: 16 },
  OFC: { name: 'OFC Nations Cup', short: 'Nations Cup', kind: 'Continental', confederation: 'OFC', teams: 8, groups: 2, thirdsThrough: 0, finalists: 8 },
};
const COMPS = Object.keys(LEDGER);
const CONFS = COMPS.filter(c => c !== 'WC');
const KO_SIZE = { R32: 32, R16: 16, QF: 8, SF: 4 };
const KO_NEXT = { R32: 'R16', R16: 'QF', QF: 'SF', SF: 'F' };
const shapeOf = (r) => `${r.teams}/${r.groups}x${r.groupSize}/${r.thirdsThrough}/${r.firstKnockout}`;
const ledgerShape = (comp, year) => (LEDGER[comp].find(([a, b]) => year >= a && year <= b) ?? [])[2];
const isWc = (y) => y % 4 === 2;
const isCont = (y) => y % 4 === 0;
const NATION = Object.fromEntries(CONFS.map(c => [c, intl.nationsIn(c)[0]]));

/* ── 1. The table is well formed ── */
section = 1; console.log('1. the table is well formed');
{
  const srcById = new Map(hist.INTL_FORMAT_SOURCES.map(s => [s.id, s]));
  check(srcById.size === hist.INTL_FORMAT_SOURCES.length, 'source ids are unique');
  check(hist.INTL_FORMAT_SOURCES.every(s => !/wikipedia\.org/i.test(s.url) && !/wikipedia/i.test(s.publisher)),
    'no source is Wikipedia');
  const ids = new Set();
  for (const p of hist.INTL_FORMAT_PERIODS) {
    check(!ids.has(p.id), `${p.id}: id is unique`); ids.add(p.id);
    const missing = p.sources.filter(s => !srcById.has(s));
    check(missing.length === 0, `${p.id}: every source id exists (${missing.join(', ') || 'all'})`);
    const pubs = new Set(p.sources.map(s => srcById.get(s)?.publisher).filter(Boolean));
    const thin = hist.INTL_FORMAT_PARTIAL.includes(p.id);
    check(thin ? pubs.size >= 1 : pubs.size >= 2, `${p.id}: ${pubs.size} publisher(s)${thin ? ' (thin row)' : ''}`);
    if (thin) check(!p.playable && !!p.playedAs, `${p.id}: a thin row falls back to a verified one`);
    if (!p.playable) {
      const target = hist.INTL_FORMAT_PERIODS.find(q => q.id === p.playedAs);
      check(!!target && target.playable && target.competition === p.competition,
        `${p.id}: plays as ${p.playedAs}, a playable row of the same competition`);
      check(!!p.note, `${p.id}: says in words what the real shape was`);
    }
  }
  for (const id of hist.INTL_FORMAT_PARTIAL) check(ids.has(id), `partial id ${id} is a real row`);
  for (const comp of COMPS) {
    const rows = hist.periodsOf(comp);
    check(rows.length >= 2, `${comp}: ${rows.length} rows`);
    check(rows.filter(r => r.to === null).length === 1 && rows[rows.length - 1].to === null,
      `${comp}: exactly one current row, and it is the newest`);
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = rows[i], b = rows[i + 1];
      check(a.to !== null && a.from <= a.to && a.to < b.from, `${comp}: ${a.id} ends before ${b.id} starts`);
    }
  }
}

/* ── 2. Every playable row is a bracket that adds up ── */
section = 2; console.log('2. every playable row adds up');
for (const p of hist.INTL_FORMAT_PERIODS.filter(r => r.playable)) {
  check(p.groupSize === 3 || p.groupSize === 4, `${p.id}: groups of ${p.groupSize}, a size the engine plays`);
  check(p.groups * p.groupSize === p.teams, `${p.id}: ${p.groups} x ${p.groupSize} = ${p.teams} teams`);
  check(p.thirdsThrough <= p.groups, `${p.id}: ${p.thirdsThrough} thirds from ${p.groups} groups`);
  const through = p.groups * 2 + p.thirdsThrough;
  check(KO_SIZE[p.firstKnockout] === through,
    `${p.id}: ${p.groups} x 2 + ${p.thirdsThrough} thirds = ${through}, the size of a ${p.firstKnockout}`);
}

/* ── 3. The table agrees with the ledger, every game year ── */
section = 3; console.log('3. the table agrees with the ledger, 1990 to 2040');
for (const comp of COMPS) {
  let years = 0, wrong = [];
  for (let y = 1990; y <= 2040; y++) {
    if (comp === 'WC' ? !isWc(y) : !isCont(y)) continue;
    years++;
    const played = hist.playedPeriod(hist.periodInForce(comp, y));
    const want = ledgerShape(comp, y);
    if (shapeOf(played) !== want) wrong.push(`${y} ${shapeOf(played)} vs ${want}`);
  }
  check(years > 0 && wrong.length === 0, `${comp}: ${years} game years match the ledger${wrong.length ? `; ${wrong.slice(0, 3).join('; ')}` : ''}`);
}

/* ── 4. The engine plays the table's shape, every year ── */
section = 4; console.log('4. tournamentForYear follows the table, 1990 to 2040');
for (const conf of CONFS) {
  const nation = NATION[conf];
  let tournaments = 0, offYears = 0;
  const wrong = [];
  for (let y = 1990; y <= 2040; y++) {
    const fmt = intl.tournamentForYear(nation, y);
    const comp = isWc(y) ? 'WC' : isCont(y) ? conf : null;
    if (!comp) { if (fmt === null) offYears++; else wrong.push(`${y} should be off`); continue; }
    if (!fmt) { wrong.push(`${y} has no tournament`); continue; }
    tournaments++;
    const row = hist.playedPeriod(hist.periodInForce(comp, y));
    const got = `${fmt.teams}/${fmt.groups}/${fmt.thirdsThrough}/${fmt.firstRound}/${fmt.periodId}/${fmt.guestsFrom ?? '-'}`;
    const want = `${row.teams}/${row.groups}/${row.thirdsThrough}/${row.firstKnockout}/${row.id}/${row.guestsFrom ?? '-'}`;
    if (got !== want) wrong.push(`${y} ${got} vs ${want}`);
    const base = MAIN_FORMATS[comp];
    if (fmt.name !== base.name || fmt.kind !== base.kind || fmt.confederation !== base.confederation) wrong.push(`${y} wrong competition ${fmt.name}`);
  }
  check(tournaments === 26 && offYears === 25 && wrong.length === 0,
    `${conf} (${nation}): ${tournaments} tournaments, ${offYears} off years, all on the table${wrong.length ? `; ${wrong.slice(0, 3).join('; ')}` : ''}`);
}

/* ── 5. The World Cup field mix adds up ── */
section = 5; console.log('5. the World Cup field mix adds up');
for (let y = 1990; y <= 2040; y += 4) {
  const fmt = intl.tournamentForYear(NATION.UEFA, y);
  const mix = hist.wcFieldMixFor(y);
  const sum = Object.values(mix.places).reduce((a, b) => a + b, 0) + mix.open;
  check(sum === fmt.teams, `${y}: ${sum} places for ${fmt.teams} teams (${mix.kind} from ${mix.from})`);
  check(JSON.stringify(fmt.fieldMix) === JSON.stringify({ places: mix.places, open: mix.open }),
    `${y}: the format carries the mix in force`);
}
{
  const srcById = new Map(hist.INTL_FORMAT_SOURCES.map(s => [s.id, s]));
  for (const m of hist.WC_FIELD_MIXES) {
    const pubs = new Set(m.sources.map(s => srcById.get(s)?.publisher).filter(Boolean));
    check(m.sources.every(s => srcById.has(s)) && pubs.size >= 2, `mix from ${m.from}: ${pubs.size} publishers, every source id real`);
  }
  const m26 = hist.wcFieldMixFor(2026);
  check(JSON.stringify(m26.places) === JSON.stringify(intl.WC_SLOTS) && m26.open === 2,
    '2026 mix is the engine\'s WC_SLOTS plus its two play off places');
}

/* ── 6. Simulated tournaments play the shape ── */
section = 6; console.log('6. simulated tournaments play the shape');
const FORM = { overall: 86, position: 'ST', lastRating: 7.5, lastGoals: 20, age: 26, isCaptain: false };
const REPS = 12;
const topOf = (conf) => [...intl.nationsIn(conf)].sort((a, b) => intl.fifaRankOf(a) - intl.fifaRankOf(b))[0];
let played = 0, qualifiedNoPlace = 0, zeroPlaceQualified = 0;
for (let y = 1990; y <= 2040; y += 2) {
  const nations = CONFS.map(topOf);
  for (const nation of nations) {
    const comp = isWc(y) ? 'WC' : intl.confederationOf(nation);
    const row = hist.playedPeriod(hist.periodInForce(comp, y));
    const wrong = [];
    for (let r = 0; r < REPS; r++) {
      const t = intl.runInternationalSummer(nation, y, FORM);
      played++;
      if (t.teams !== row.teams) wrong.push(`teams ${t.teams}`);
      // Round by round: the first round is the row's, each round half the last,
      // and the next round is exactly the winners of this one.
      let round = row.firstKnockout, size = KO_SIZE[round], prevWinners = null;
      while (round) {
        const ties = t.bracket.filter(x => x.round === round);
        const sides = ties.flatMap(x => [x.home, x.away]);
        if (ties.length !== size / 2) wrong.push(`${round} has ${ties.length} ties, wants ${size / 2}`);
        if (new Set(sides).size !== sides.length) wrong.push(`${round} has a nation twice`);
        if (prevWinners && [...prevWinners].sort().join() !== [...sides].sort().join()) wrong.push(`${round} is not the winners of the round before`);
        prevWinners = ties.map(x => x.winner);
        round = round === 'F' ? null : KO_NEXT[round];
        size = size / 2;
      }
      const firstTies = t.bracket.filter(x => x.round === row.firstKnockout).length;
      const extra = t.bracket.filter(x => KO_SIZE[x.round] > KO_SIZE[row.firstKnockout]).length;
      if (extra) wrong.push(`${extra} ties before the first round`);
      if (firstTies * 2 !== row.groups * 2 + row.thirdsThrough) wrong.push('first round is not the sides through');
      if (t.qualified) {
        if (!t.groupTable.some(x => x.nation === nation)) { qualifiedNoPlace++; wrong.push('qualified but not at the finals'); }
        else if (t.groupTable.length !== row.groupSize) wrong.push(`group of ${t.groupTable.length}, wants ${row.groupSize}`);
        if (comp === 'WC' && hist.wcFieldMixFor(y).places[intl.confederationOf(nation)] === 0) zeroPlaceQualified++;
      }
    }
    check(wrong.length === 0, `${y} ${comp} for ${nation}: ${REPS} tournaments in the ${row.id} shape${wrong.length ? `; ${[...new Set(wrong)].slice(0, 3).join('; ')}` : ''}`);
  }
}
console.log(`   ${played} tournaments played; ${zeroPlaceQualified} qualified from a confederation with no direct place`);
check(zeroPlaceQualified > 0, 'the play off path was exercised (a qualified nation with no direct World Cup place)');
check(qualifiedNoPlace === 0, `every qualified nation was at its finals (${qualifiedNoPlace} were not)`);

/* ── 7. From 2026 on, exactly what main shipped ── */
section = 7; console.log('7. 2026 to 2040 is what main shipped');
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const realRandom = Math.random;
const ALL_NATIONS = Object.keys(intl.NATION_CONFED);
{
  let compared = 0, differ = 0, fieldsWrong = 0, firstDiff = '';
  for (let y = 2026; y <= 2040; y += 2) {
    for (let i = 0; i < ALL_NATIONS.length; i++) {
      const nation = ALL_NATIONS[i];
      const fmt = intl.tournamentForYear(nation, y);
      const comp = isWc(y) ? 'WC' : intl.confederationOf(nation);
      const main = MAIN_FORMATS[comp];
      if (Object.keys(main).some(k => fmt[k] !== main[k])) fieldsWrong++;
      for (const form of [null, FORM]) {
        const seed = y * 1000 + i * 2 + (form ? 1 : 0);
        Math.random = mulberry32(seed);
        const a = JSON.stringify(intl.runInternationalSummer(nation, y, form));
        Math.random = mulberry32(seed);
        const b = JSON.stringify(mainIntl.runInternationalSummer(nation, y, form));
        compared++;
        if (a !== b) { differ++; firstDiff ||= `${nation} ${y}`; }
      }
    }
  }
  Math.random = realRandom;
  check(fieldsWrong === 0, `every 2026 to 2040 format has main's numbers (${fieldsWrong} did not)`);
  check(compared > 1000 && differ === 0,
    `${compared} seeded summers, ${differ} differ from main's engine${firstDiff ? ` (first: ${firstDiff})` : ''}`);
}

/* ── 8. Club Manager's national job: a season counter, not a year ── */
section = 8; console.log('8. Club Manager national summers match main, seasons 1 to 40');
{
  /* clubManager.ts calls runManagerSummer(job.nation, state.season, lift)
     and state.season starts at 1. Main played the modern shapes for every
     counter; read as a year, a counter would be the oldest shapes. */
  const nations = [...new Set(['England', 'Brazil', 'Japan', 'Nigeria', 'Mexico', 'New Zealand',
    ...CONFS.map(topOf), ...Object.values(NATION)])].filter(n => intl.NATION_CONFED[n]);
  let compared = 0, differ = 0, nulls = 0, firstDiff = '';
  for (let season = 1; season <= 40; season++) {
    for (let i = 0; i < nations.length; i++) {
      for (const lift of [0, 3]) {
        const seed = 500000 + season * 1000 + i * 10 + lift;
        Math.random = mulberry32(seed);
        const a = JSON.stringify(intl.runManagerSummer(nations[i], season, lift));
        Math.random = mulberry32(seed);
        const b = JSON.stringify(mainIntl.runManagerSummer(nations[i], season, lift));
        compared++;
        if (a === 'null') nulls++;
        if (a !== b) { differ++; firstDiff ||= `${nations[i]} season ${season}`; }
      }
    }
  }
  Math.random = realRandom;
  check(nations.length >= 8, `${nations.length} nations across the confederations`);
  check(nulls * 2 === compared, `half the seasons have no summer, as on main (${nulls} of ${compared})`);
  check(compared > 500 && differ === 0,
    `${compared} seeded manager summers, ${differ} differ from main's engine${firstDiff ? ` (first: ${firstDiff})` : ''}`);
  // The counter maps to the modern cycle; a real year is read as itself.
  const fy = intl.managerFormatYear;
  check([1, 2, 3, 4, 5, 38].map(fy).join() === '2025,2026,2027,2028,2025,2026', `counters 1, 2, 3, 4, 5, 38 read as ${[1, 2, 3, 4, 5, 38].map(fy).join(', ')}`);
  check(fy(1994) === 1994 && fy(2030) === 2030, 'a calendar year is read as itself');
  const euro96 = intl.runManagerSummer('England', 1996, 0);
  check(euro96 && euro96.teams === 16, `a manager handed the year 1996 plays the 16 team Euros (${euro96?.teams})`);
}

/* ── 9. The World Cup mix and the qualifying share, by era ── */
section = 9; console.log('9. field mix and qualifying share follow the era');
{
  /* Who played each finals, by confederation, typed separately from
     WC_FIELD_MIXES (RSSSF NNfull and footballhistory.org group tables, the
     2006 to 2022 allocation from arXiv 2310.19100 Table 2 and Around the
     Rings: AFC 4.5, CAF 5, CONCACAF 3.5, CONMEBOL 4.5, OFC 0.5, UEFA 13, plus
     the host, so three open places). A typo that keeps the total cannot pass. */
  const MIX_LEDGER = [
    [1990, 1990, 'UEFA14 CAF2 AFC2 CONMEBOL4 CONCACAF2 OFC0 open0'],
    [1994, 1994, 'UEFA13 CAF3 AFC2 CONMEBOL4 CONCACAF2 OFC0 open0'],
    [1998, 2002, 'UEFA15 CAF5 AFC4 CONMEBOL5 CONCACAF3 OFC0 open0'],
    [2006, 2022, 'UEFA13 CAF5 AFC4 CONMEBOL4 CONCACAF3 OFC0 open3'],
    [2026, 2038, 'UEFA16 CAF9 AFC8 CONMEBOL6 CONCACAF6 OFC1 open2'],
  ];
  const parse = (s) => Object.fromEntries(s.split(' ').map(t => [t.replace(/\d+$/, ''), Number(t.match(/\d+$/)[0])]));
  const mixAt = (y) => (MIX_LEDGER.find(([a, b]) => y >= a && y <= b) ?? [])[2];
  /* The engine's rule for a six nation group, from the ledger's numbers:
     round(6 x places / members), at least 1, at most 5. */
  const share = (finalists, conf) => Math.max(1, Math.min(5, Math.round(6 * Math.min(1, finalists / intl.CONFED_MEMBERS[conf]))));
  /* The panel's "Top N go through" for a few eras, worked by hand from the
     ledger, so the rule above cannot drift with the engine. */
  const SPOTS = {
    1990: { UEFA: 2, CONMEBOL: 2, CAF: 1 }, 1994: { UEFA: 1, CONMEBOL: 2 }, 1998: { UEFA: 2, CONMEBOL: 3 },
    2006: { UEFA: 1, CONMEBOL: 3 }, 2026: { UEFA: 2, CONMEBOL: 4 },
  };
  const wrongMix = [], wrongShare = [];
  for (let y = 1990; y <= 2040; y += 2) {
    if (isWc(y)) {
      const m = hist.wcFieldMixFor(y);
      const got = `${CONFS.map(c => `${c}${m.places[c]}`).join(' ')} open${m.open}`;
      const want = mixAt(y);
      const norm = (s) => s && CONFS.map(c => `${c}${parse(s)[c]}`).join(' ') + ` open${parse(s).open}`;
      if (norm(want) !== got) wrongMix.push(`${y} ${got} vs ${want}`);
    }
    for (const conf of CONFS) {
      const nation = NATION[conf];
      const fmt = intl.tournamentForYear(nation, y);
      if (!fmt) continue;
      const through = intl.runQualifying(nation, fmt, null).through;
      let want;
      if (isWc(y)) {
        const l = parse(mixAt(y));
        want = share(l[conf] + l.open / 6, conf);
      } else {
        const teams = Number(ledgerShape(conf, y).split('/')[0]);
        const finalists = conf === 'CONMEBOL' ? Math.min(10, teams) : teams;
        want = finalists >= intl.CONFED_MEMBERS[conf] ? 6 : share(finalists, conf);
      }
      const spot = isWc(y) ? SPOTS[y]?.[conf] : undefined;
      if (through !== want || (spot !== undefined && through !== spot)) wrongShare.push(`${y} ${conf} top ${through}, wants ${want}`);
    }
  }
  check(wrongMix.length === 0, `13 World Cup mixes match the ledger${wrongMix.length ? `; ${wrongMix.slice(0, 2).join('; ')}` : ''}`);
  check(wrongShare.length === 0, `qualifying "top N go through" is the era's for 6 confederations x 26 game years${wrongShare.length ? `; ${wrongShare.slice(0, 3).join('; ')}` : ''}`);
}

/* ── 10. The Copa America's guests, by era ── */
section = 10; console.log('10. Copa America guests follow the era');
{
  const GUESTS = (y) => (y <= 2012 ? 'CONCACAF2' : y === 2016 ? 'CONCACAF6' : y === 2020 ? 'AFC2' : 'CONCACAF6');
  const wrong = [];
  let fields = 0;
  for (let y = 1992; y <= 2040; y += 4) {
    const fmt = intl.tournamentForYear('Brazil', y);
    for (let r = 0; r < 6; r++) {
      Math.random = mulberry32(900000 + y * 10 + r);
      const field = intl.__harnessBuildField(fmt, 'Brazil', true);
      fields++;
      const count = {};
      for (const n of field) { const c = intl.NATION_CONFED[n] ?? 'none'; count[c] = (count[c] ?? 0) + 1; }
      const guests = Object.entries(count).filter(([c]) => c !== 'CONMEBOL').map(([c, n]) => `${c}${n}`).join(' ');
      if (count.CONMEBOL !== 10 || guests !== GUESTS(y)) wrong.push(`${y}: CONMEBOL ${count.CONMEBOL}, guests ${guests || 'none'}, wants ${GUESTS(y)}`);
    }
  }
  Math.random = realRandom;
  check(fields === 78 && wrong.length === 0, `${fields} Copa fields have the era's guests${wrong.length ? `; ${[...new Set(wrong)].slice(0, 3).join('; ')}` : ''}`);
}

/* ── 11. The play off winner takes the weakest finalist's place ── */
section = 11; console.log('11. a qualified nation with no direct place replaces the weakest finalist');
{
  const best = [...ALL_NATIONS].sort((a, b) => intl.fifaRankOf(a) - intl.fifaRankOf(b))[0];
  const minnows = intl.nationsIn('OFC').filter(n => intl.NATION_CONFED[n] === 'OFC');
  let fields = 0, bestKept = 0, minnowIn = 0, dupes = 0;
  for (const y of [1990, 1994, 1998, 2002]) {
    const fmt = intl.tournamentForYear(NATION.UEFA, y);
    for (const nation of minnows) {
      for (let r = 0; r < 10; r++) {
        Math.random = mulberry32(700000 + y * 100 + r);
        const field = intl.__harnessBuildField(fmt, nation, true);
        fields++;
        if (field.includes(best)) bestKept++;
        if (field.includes(nation)) minnowIn++;
        if (new Set(field).size !== field.length || field.length !== fmt.teams) dupes++;
      }
    }
  }
  Math.random = realRandom;
  check(minnows.length > 0 && fields > 0, `${minnows.length} OFC nations, ${fields} fields from the finalists eras`);
  check(minnowIn === fields, `the qualified OFC nation is in all ${fields} fields (${minnowIn})`);
  check(dupes === 0, `every field is the era's size with no nation twice (${dupes} were not)`);
  check(bestKept === fields, `${best}, the top ranked nation, kept its place in ${bestKept} of ${fields} fields`);
}

/* ── Summary ── */
console.log('');
if (control) {
  const target = CONTROL_SECTION[CONTROL];
  const fired = failedSections.has(target);
  console.log(`CONTROL ${CONTROL}: section ${target} ${fired ? 'went red as it must' : 'DID NOT go red'}; red sections: ${[...failedSections].join(', ') || 'none'}`);
  if (!fired) { console.log('simIntlFormatHistory: CONTROL DID NOT FIRE'); process.exit(3); }
}
console.log(`simIntlFormatHistory: ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
