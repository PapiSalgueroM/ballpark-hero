/* Round 1541: the international summers of NBA My Career, Part A (dark).

   What this holds, section by section (Part A builds 1 to 8; Part B adds 9 to 11):
     1. the ledger. Every fact in scripts/data/basketballIntlSources.json has two
        reads on two hosts that are not each other (fiba.basketball and
        about.fiba.basketball are one body), none a wiki, each with its words;
        the rows of src/data/basketballIntl.ts equal the ledger's values; the
        partial list equals the editions with a fact short of two.
     2. the calendar. Every edition id is its competition and the summer it was
        played; one edition a summer at most; the game's own cycles start one
        cycle after the last ledgered edition of their competition; every summer
        2004 to 2050 resolves to a ledger edition, a projected one or none, and
        a played summer of the ledger is never answered by the projection.
     3. the fields. A played field is as big as its shape, holds no nation
        twice, holds the USA and every nation its finishing places name; the
        eight placed nations are distinct; every nation draws a flag or is on
        the named no flag list; Serbia and Montenegro is kept as it played. An
        edition still to come has no field and no places.

   Controls (INTL_CONTROL=<name>), each asserted to change something before it
   runs, and a run whose control did not turn its section red exits 3:
     onesource   one calendar fact of oly-2008 keeps one read          (1 red)
     shiftyear   oly-2008's src year moved to 2009                      (2 red)
     dupnation   oly-2012's field holds Spain twice                     (3 red)
     fieldsize   wc-2014's field loses a nation                         (3 red)

   Exit codes: 0 green, 1 red (or a control that fired), 2 could not run,
   3 a control that did not fire. Green means the closing summary line AND
   the exit code; a control's last line says FIRED or DID NOT FIRE.

   Nothing here reaches the network: the bundle is the data module alone and
   the ledger is a committed file. */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { buildRealSaves } from './lib/realSaves.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.INTL_CONTROL || '';
const SECTIONS = new Set((process.env.INTL_SECTIONS || '1,2,3,4,6').split(',').map(s => s.trim()));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'careerIntl-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

const INTL = 'src/lib/careerIntl.ts';
const NBA = 'src/lib/nbaCareerIntl.ts';
const CONTROLS = {
  onesource: { section: '1', note: 'one calendar fact of oly-2008 keeps one read' },
  shiftyear: { section: '2', note: "oly-2008's src year moved by one" },
  dupnation: { section: '3', note: "oly-2012's field holds Spain twice" },
  fieldsize: { section: '3', note: "wc-2014's field loses a nation" },
  genfield: { section: '3', note: 'a generated field is drawn on a stream keyed to the career, not the edition', edits: [{ file: INTL, from: 'bind.rng(`intl-field:${e.id}`)', to: 'bind.rng(`intl-field:${e.id}:${Math.random()}`)' }] },
  copy: { section: '6', note: 'a private copy of the bracket runner planted in a sport file' },
  seasonyear: { section: '2', note: 'the call reads the season label itself, not the summer after it', edits: [{ file: NBA, from: 'NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(line.year))', to: 'NBA_INTL_CALENDAR.editionFor(line.year)' }] },
  anyyear: { section: '4', note: 'every summer answers an edition', edits: [{ file: NBA, from: 'const e = NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(line.year));', to: 'const e = NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(line.year)) ?? NBA_INTL_CALENDAR.byId(`oly-${nbaIntlSummerOf(line.year)}`);' }] },
  lowbar: { section: '4', note: 'the bar is five points lower in the bind', edits: [{ file: NBA, from: 'line.ovr < INTL_CALL_UP_OVR', to: 'line.ovr < INTL_CALL_UP_OVR - 5' }] },
  legacyreads: { section: '7', note: 'legacy counts his medals' },
  restwrites: { section: '7', note: 'resting takes a point of health', edits: [{ file: NBA, from: 'answer: (c, choice) => answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice),', to: "answer: (c, choice) => { if (choice === 'rest') c.health -= 1; return answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice); }," }] },
  norepair: { section: '8', note: 'the repair on load does nothing', edits: [{ file: INTL, from: 'export function repairIntlOnLoad(c: IntlCareer): boolean {', to: 'export function repairIntlOnLoad(c: IntlCareer): boolean {\n  if (c) return false;' }] },
  nolift: { section: '5', note: 'he lifts the USA by nothing', edits: [{ file: NBA, from: 'liftOf: c => nbaIntlLift(lastLine(c)?.ovr ?? 0),', to: 'liftOf: () => 0,' }] },
  nobronze: { section: '5', note: 'no bronze game is played', edits: [{ file: INTL, from: 'if (shape.bronze && semiLosers.length === 2) {', to: 'if (false && shape.bronze && semiLosers.length === 2) {' }] },
  mathrandom: { section: '6', note: 'the pot draw uses Math.random', edits: [{ file: INTL, from: 'const j = Math.floor(rng() * (i + 1));', to: 'const j = Math.floor(Math.random() * (i + 1));' }] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control "${CONTROL}": use ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL && !SECTIONS.has(CONTROLS[CONTROL].section)) SECTIONS.add(CONTROLS[CONTROL].section);

/* Source rewrites at bundle time, never on disk; each anchor must be there once. */
const rewrites = new Map();
for (const ed of (CONTROL && CONTROLS[CONTROL].edits) || []) {
  const abs = path.join(ROOT, ed.file);
  const src = rewrites.get(abs) ?? fs.readFileSync(abs, 'utf8').split('\r\n').join('\n');
  const hits = src.split(ed.from).length - 1;
  if (hits !== 1) { console.error(`control ${CONTROL} cannot run: ${ed.file} holds "${ed.from}" ${hits} times, not once, so it would prove nothing`); process.exit(2); }
  rewrites.set(abs, src.replace(ed.from, ed.to));
}
const controlPlugin = {
  name: 'career-intl-control',
  setup(b) {
    if (!rewrites.size) return;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const abs = path.resolve(args.path);
      if (!rewrites.has(abs)) return undefined;
      return { contents: rewrites.get(abs), loader: abs.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(abs) };
    });
  },
};

/* ─── bundle ─────────────────────────────────────────────────────────────── */
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  `export * as data from '${ROOT_URL}/src/data/basketballIntl.ts';`,
  `export * as intl from '${ROOT_URL}/src/lib/careerIntl.ts';`,
  `export * as keyed from '${ROOT_URL}/src/lib/keyedRng.ts';`,
  `export * as nbaIntl from '${ROOT_URL}/src/lib/nbaCareerIntl.ts';`,
  `export { NBA_CAREER_SPORT } from '${ROOT_URL}/src/lib/nbaCareerSport.ts';`,
  `export * as drive from '${ROOT_URL}/src/test/helpers/usCareerDrive.ts';`,
].join('\n'));
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin] });
const { data, intl, keyed, nbaIntl, NBA_CAREER_SPORT, drive } = await import(`file://${OUT.replaceAll('\\', '/')}`);
const LEDGER = () => ({ shapes: data.BASKETBALL_INTL_SHAPES, editions: data.BASKETBALL_INTL_EDITIONS, cycles: data.BASKETBALL_INTL_CYCLES, partial: data.BASKETBALL_INTL_PARTIAL, lastPlayed: data.BASKETBALL_LAST_PLAYED_SUMMER });
let MATH_RANDOM_CALLS = 0;
const realRandom = Math.random;
Math.random = () => { MATH_RANDOM_CALLS += 1; return realRandom(); };
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/basketballIntlSources.json'), 'utf8'));

/* ─── controls, applied in memory and proven to change something ─────────── */
const rowOf = id => data.BASKETBALL_INTL_EDITIONS.find(r => r[0] === id);
function mustChange(what, before, after) {
  if (JSON.stringify(before) === JSON.stringify(after)) { console.error(`control ${CONTROL} cannot run: ${what} did not change, so it would prove nothing`); process.exit(2); }
}
if (CONTROL) {
  console.log(`NEGATIVE CONTROL ${CONTROL}: ${CONTROLS[CONTROL].note} (section ${CONTROLS[CONTROL].section} must fail)`);
  if (CONTROL === 'onesource') {
    const f = ledger.editions['oly-2008']?.calendar;
    if (!f || f.reads.length < 2) { console.error('control onesource cannot run: oly-2008 calendar has no second read'); process.exit(2); }
    const before = f.reads.length; f.reads = f.reads.slice(0, 1); mustChange('the read count', before, f.reads.length);
  }
  if (CONTROL === 'shiftyear') {
    const r = rowOf('oly-2008');
    if (!r || r[2] !== 2008) { console.error('control shiftyear cannot run: oly-2008 is not a 2008 row'); process.exit(2); }
    r[2] = 2009; mustChange('the year', 2008, r[2]);
  }
  if (CONTROL === 'dupnation') {
    const r = rowOf('oly-2012');
    const i = r ? r[6].indexOf('Great Britain') : -1;
    if (i < 0 || !r[6].includes('Spain')) { console.error('control dupnation cannot run: oly-2012 field lacks Great Britain or Spain'); process.exit(2); }
    const before = [...r[6]]; r[6][i] = 'Spain'; mustChange('the field', before, r[6]);
  }
  if (CONTROL === 'fieldsize') {
    const r = rowOf('wc-2014');
    if (!r || !r[6] || r[6].length !== 24) { console.error('control fieldsize cannot run: wc-2014 field is not 24'); process.exit(2); }
    r[6].splice(r[6].indexOf('Finland'), 1); mustChange('the field size', 24, r[6].length);
  }
}

/* ─── reporting ──────────────────────────────────────────────────────────── */
const failed = new Map();
let checks = 0;
function check(section, ok, msg) {
  checks += 1;
  if (!ok) { failed.set(section, (failed.get(section) ?? 0) + 1); if ((failed.get(section) ?? 0) <= 12) console.log(`  FAIL [${section}] ${msg}`); }
}
const shapeOf = id => data.BASKETBALL_INTL_SHAPES.find(s => s[0] === id);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ─── 1. the ledger ──────────────────────────────────────────────────────── */
const hostOf = url => { const h = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); return h.endsWith('fiba.basketball') ? 'fiba.basketball' : h; };
const WIKI = h => /wiki|fandom\.com|kiwix/.test(h);
function shortOf(f) {
  if (f.short) return f.short;
  const hosts = new Set(f.reads.map(r => hostOf(r.url)));
  return f.reads.length < 2 || hosts.size < 2 ? `${f.reads.length} reads on ${hosts.size} hosts` : '';
}
if (SECTIONS.has('1')) {
  console.log('section 1: the ledger');
  check('1', ledger.read === data.BASKETBALL_INTL_VERIFIED_ON, `ledger read ${ledger.read} vs src ${data.BASKETBALL_INTL_VERIFIED_ON}`);
  let facts = 0;
  const shortEds = new Set();
  const allFacts = [...Object.entries(ledger.rules).map(([k, f]) => [`rules.${k}`, f]),
    ...Object.entries(ledger.editions).flatMap(([id, e]) => Object.entries(e).map(([k, f]) => [`${id}.${k}`, f]))];
  for (const [key, f] of allFacts) {
    facts += 1;
    check('1', typeof f.says === 'string' && f.says.length > 10 && 'value' in f && Array.isArray(f.reads), `${key} lacks says, value or reads`);
    for (const r of f.reads) {
      check('1', !!r.url && !!r.who && typeof r.words === 'string' && r.words.length > 8, `${key} has a read without url, who or words`);
      check('1', !WIKI(hostOf(r.url)), `${key} cites a wiki host ${hostOf(r.url)}`);
    }
    const s = shortOf(f);
    if (key.startsWith('rules.')) check('1', !s, `${key} is short: ${s}`);
    else if (s) shortEds.add(key.split('.')[0]);
  }
  const partial = [...data.BASKETBALL_INTL_PARTIAL].sort();
  check('1', same(partial, [...shortEds].sort()), `partial list ${partial.join(' ')} vs editions with a short fact ${[...shortEds].sort().join(' ')}`);
  check('1', ledger.rules['fiba-minutes'].value === data.FIBA_GAME_MINUTES && ledger.rules['nba-minutes'].value === data.NBA_GAME_MINUTES, 'game lengths differ from the ledger');
  const ids = data.BASKETBALL_INTL_EDITIONS.map(r => r[0]);
  check('1', same([...ids].sort(), Object.keys(ledger.editions).sort()), `src ids ${ids.length} vs ledger ${Object.keys(ledger.editions).length}`);
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const e = ledger.editions[r[0]];
    if (!e) continue;
    const cal = e.calendar?.value ?? {};
    check('1', cal.comp === r[1] && cal.year === r[2] && cal.host === r[4] && (cal.games ?? null) === (r[8] ?? null), `${r[0]} calendar differs: ledger ${JSON.stringify(cal)}`);
    check('1', e.name?.value === r[3], `${r[0]} name ${r[3]} vs ledger ${e.name?.value}`);
    check('1', e.shape?.value === r[5], `${r[0]} shape ${r[5]} vs ledger ${e.shape?.value}`);
    check('1', same(e.field?.value ?? null, r[6]), `${r[0]} field differs from the ledger`);
    check('1', same(e.rungs?.value ?? null, r[7]), `${r[0]} places differ from the ledger`);
  }
  const played = data.BASKETBALL_INTL_EDITIONS.filter(r => r[6]).map(r => r[2]);
  check('1', Math.max(...played) === data.BASKETBALL_LAST_PLAYED_SUMMER, `last played summer ${data.BASKETBALL_LAST_PLAYED_SUMMER} vs ledger ${Math.max(...played)}`);
  console.log(`  ${facts} facts, ${allFacts.reduce((n, [, f]) => n + f.reads.length, 0)} reads, partial: ${partial.join(' ') || 'none'}`);
}

/* ─── 2. the calendar ────────────────────────────────────────────────────── */
/* The harness's own resolver, read off the ledger JSON (not the src rows), so
   a src row moved by a year disagrees with it, and so the tournament module's
   editionFor (step 2) and the NBA mapping (step 3) can be held to it. */
function resolve(year) {
  const hit = Object.entries(ledger.editions).find(([, e]) => e.calendar.value.year === year);
  if (hit) return { id: hit[0], kind: ledger.editions[hit[0]].field ? 'played' : 'future' };
  for (const [comp, first, every] of data.BASKETBALL_INTL_CYCLES) if (year >= first && (year - first) % every === 0) return { id: `${comp}-${year}`, kind: 'projected' };
  return null;
}
if (SECTIONS.has('2')) {
  console.log('section 2: the calendar');
  const years = new Map();
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const m = /^(oly|wc)-(\d{4})$/.exec(r[0]);
    check('2', !!m && m[1] === r[1] && Number(m[2]) === r[2], `${r[0]} is not its competition and summer (comp ${r[1]}, year ${r[2]})`);
    check('2', !years.has(r[2]), `two editions in ${r[2]}: ${years.get(r[2])} and ${r[0]}`);
    years.set(r[2], r[0]);
  }
  for (const [comp, first, every] of data.BASKETBALL_INTL_CYCLES) {
    const last = Math.max(...data.BASKETBALL_INTL_EDITIONS.filter(r => r[1] === comp).map(r => r[2]));
    check('2', first - last === every, `${comp} projection starts ${first}, ${first - last} after the last ledgered ${last}, not one cycle of ${every}`);
  }
  const table = [];
  let none = 0;
  for (let y = 2004; y <= 2050; y += 1) {
    const e = resolve(y);
    const row = data.BASKETBALL_INTL_EDITIONS.find(r => r[2] === y);
    if (e && e.kind !== 'projected') check('2', !!row && row[0] === e.id, `${y} is the ledger's ${e.id} but the src rows say ${row?.[0] ?? 'nothing'}`);
    else check('2', !row, `${y} has src row ${row?.[0]} the ledger does not hold`);
    if (!e) none += 1;
    table.push(e ? e.id : '-');
  }
  console.log(`  2004 to 2050: ${table.filter(t => t !== '-').length} summers with an edition, ${none} without`);
  console.log(`  ${table.join(' ')}`);
}

/* ─── 3. the fields ──────────────────────────────────────────────────────── */
/* A nation with no flag renders as its name (FlagImg.tsx); these are named so
   a new one cannot slip in unseen. */
const NO_FLAG = new Set(['Puerto Rico', 'Serbia and Montenegro']);
function flagKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'src/components/FlagImg.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const at = src.indexOf('export const FLAG_CODES');
  const block = src.slice(at, src.indexOf('};', at));
  return new Set([...block.matchAll(/"([^"]+)":\s*"[a-z-]+"/g)].map(m => m[1]));
}
if (SECTIONS.has('3')) {
  console.log('section 3: the fields');
  const flags = flagKeys();
  check('3', flags.size > 150 && flags.has('USA') && flags.has('Lithuania'), `FLAG_CODES read ${flags.size} keys`);
  const nations = new Set();
  for (const r of data.BASKETBALL_INTL_EDITIONS) {
    const [id, , year, , , shapeId, field, rungs] = r;
    const shape = shapeOf(shapeId);
    check('3', !!shape, `${id} shape ${shapeId} is not a shape row`);
    const playedAs = shape && !shape[8] ? shapeOf(shape[9]) : shape;
    check('3', !!playedAs && playedAs[8] && (!shape || playedAs[1] === shape[1]), `${id} plays as a shape that is missing, unplayable or another size`);
    if (year > data.BASKETBALL_LAST_PLAYED_SUMMER) { check('3', field === null && rungs === null, `${id} is still to come but has a field or places`); continue; }
    check('3', Array.isArray(field) && field.length === shape?.[1], `${id} field holds ${field?.length} nations, the shape ${shape?.[1]}`);
    if (!Array.isArray(field)) continue;
    check('3', new Set(field).size === field.length, `${id} field holds a nation twice`);
    check('3', field.includes('USA'), `${id} field lacks the USA`);
    const placed = rungs ? [rungs[0], rungs[1], rungs[2], rungs[3], ...rungs[4]] : [];
    check('3', placed.length === 8 && new Set(placed).size === 8, `${id} places name ${new Set(placed).size} distinct nations, not 8`);
    for (const n of placed) check('3', field.includes(n), `${id} places ${n}, who is not in its field`);
    for (const n of field) {
      nations.add(n);
      check('3', flags.has(n) || NO_FLAG.has(n), `${id} nation ${n} has no flag and is not on the no flag list`);
      if (n === 'Serbia and Montenegro') check('3', year <= 2006, `${id} names Serbia and Montenegro after 2006`);
      if (n === 'Serbia' || n === 'Montenegro') check('3', year >= 2007, `${id} names ${n} alone before 2007`);
    }
  }
  console.log(`  ${data.BASKETBALL_INTL_EDITIONS.filter(r => r[6]).length} played fields, ${nations.size} nations, no flag: ${[...nations].filter(n => !flags.has(n)).join(', ') || 'none'}`);
}

/* A sport free bind the harness owns, on the real calendar, for the sections
   that need the module before (or beside) the NBA bind. */
const RUNG = { gold: 92, silver: 89, bronze: 87, fourth: 85, quarter: 82, field: 76 };
function harnessBind(cal) {
  const norm = r => { let u = 0; let v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return {
    slug: 'sim', calendar: cal, nationOf: () => 'USA',
    callOf: c => cal.editionFor(c.year + 1),
    strengthOf: (e, n) => RUNG[intl.intlRungOf(e, n) ?? 'field'],
    liftOf: () => 1,
    play(a, b, rng) {
      let sa = Math.round(80 + 1.2 * (a - b) + 9 * norm(rng));
      let sb = Math.round(80 + 1.2 * (b - a) + 9 * norm(rng));
      let ot = 0;
      while (sa === sb) { ot += 1; sa += Math.round(10 + 3 * norm(rng)); sb += Math.round(10 + 3 * norm(rng)); }
      return { a: sa, b: sb, ot };
    },
    groupDraws: false, groupPoints: [2, 1, 1],
    tableOrder: (x, y) => y.won - x.won || (y.pf - y.pa) - (x.pf - x.pa),
    lineOf: (_c, rng) => ({ pts: Math.round(20 + 5 * rng()) }),
    knockChance: () => 0.1, knock: c => { c.health -= 8; }, ageOf: c => c.age, careerKey: c => c.name, rng: keyed.keyedRng,
  };
}

/* ─── 3, second half: the fields the game draws ──────────────────────────── */
if (SECTIONS.has('3')) {
  const cal = intl.intlCalendar(LEDGER());
  const bind = harnessBind(cal);
  let drawn = 0;
  for (let y = 2025; y <= 2050; y += 1) {
    const e = cal.editionFor(y);
    if (!e || e.field) continue;
    drawn += 1;
    const f1 = intl.intlFieldOf(bind, e, 'USA');
    const f2 = intl.intlFieldOf({ ...bind, careerKey: () => 'another career' }, e, 'USA');
    check('3', !!f1 && f1.generated, `${e.id} draws no field`);
    if (!f1) continue;
    const past = cal.played().filter(x => x.comp === e.comp);
    const near = new Set(past.slice(-2).flatMap(x => x.field));
    const wide = new Set(past.flatMap(x => x.field));
    check('3', near.size >= e.play.teams, `${e.id} pool of the last two fields holds ${near.size}, short of ${e.play.teams}`);
    check('3', f1.field.length === e.play.teams && new Set(f1.field).size === f1.field.length && f1.field.includes('USA'), `${e.id} drawn field is ${f1.field.length} nations, the shape ${e.play.teams}, or lacks the USA`);
    check('3', f1.field.every(n => wide.has(n)), `${e.id} drawn field names a nation from no played field`);
    check('3', same(f1.field, f2?.field), `${e.id} drawn field differs between two careers`);
  }
  console.log(`  ${drawn} summers 2025 to 2050 draw their field (the same for every career)`);
}

/* ─── 6. one engine and the stream ───────────────────────────────────────── */
/* The runner's fingerprints: code shapes only a copy of the bracket runner
   would hold. They must live in careerIntl.ts and nowhere else in src. */
const FINGERPRINTS = ['semiLosers', 'm + 1 - s', 'seeded.slice(p * shape.groups', 'slice(0, (n * (n - 1)) / 2)'];
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function srcFiles(dir, out = []) {
  for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) { if (rel !== 'src/test') srcFiles(rel, out); }
    else if (/\.tsx?$/.test(d.name) && !/\.test\.tsx?$/.test(d.name)) out.push(rel);
  }
  return out;
}
if (SECTIONS.has('6')) {
  console.log('section 6: one engine and the stream');
  const home = stripComments(fs.readFileSync(path.join(ROOT, INTL), 'utf8'));
  for (const f of FINGERPRINTS) check('6', home.includes(f), `careerIntl.ts no longer holds the fingerprint "${f}", so the fence would prove nothing`);
  const files = srcFiles('src').filter(f => f !== INTL).map(f => [f, stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'))]);
  if (CONTROL === 'copy') {
    const raw = fs.readFileSync(path.join(ROOT, INTL), 'utf8');
    const at = raw.indexOf('export function runIntlTournament');
    const body = raw.slice(at, raw.indexOf('/* ─── the save', at));
    if (at < 0 || body.length < 500) { console.error('control copy cannot run: runIntlTournament was not found to copy'); process.exit(2); }
    files.push(['src/lib/nbaCareerIntl.ts (planted copy)', stripComments(body.replace('export function runIntlTournament', 'function privateRunner'))]);
  }
  for (const [f, text] of files) for (const fp of FINGERPRINTS) check('6', !text.includes(fp), `${f} holds the runner's fingerprint "${fp}": bind careerIntl.ts, never copy it`);
  const cal = intl.intlCalendar(LEDGER());
  const bind = harnessBind(cal);
  const before = MATH_RANDOM_CALLS;
  let went = 0;
  for (let i = 0; i < 120; i += 1) {
    const year = 2003 + (i % 44);
    const a = { name: `career ${i}`, year, age: 27, health: 90 };
    const b = JSON.parse(JSON.stringify(a));
    if (!intl.pendingCallUp(a, bind)) continue;
    intl.answerCallUp(a, bind, 'go');
    intl.answerCallUp(b, bind, 'go');
    went += 1;
    check('6', same(a, b), `career ${i} played ${a.intl?.summers[0]?.edition} two ways`);
  }
  check('6', MATH_RANDOM_CALLS === before, `Math.random was called ${MATH_RANDOM_CALLS - before} times in pending, answer and the run`);
  check('6', went >= 50, `only ${went} careers were called, too few to prove anything`);
  console.log(`  ${files.length} src files fenced, ${went} tournaments played twice, Math.random calls ${MATH_RANDOM_CALLS - before}`);
}

/* ─── 2b and 4: the call, through the real NBA engine ────────────────────── */
/* The fleet drives the NBA binding through src/test/helpers/usCareerDrive.ts,
   the drive that mirrors the board (camp, season, progress, the summer dealt,
   then the call, then the cards, then the team roll), FLEET careers an era,
   seeds 0 to FLEET - 1. The oracle states the bar itself (86, 36, 50) rather
   than reading the bind's constants, so a control that moves the bind's
   comparison cannot move the oracle with it. */
const FLEET = Number(process.env.INTL_FLEET || 400);
const ERAS = [['now', undefined, 2027], ['y2004', 'y2004', 2004]];
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ORACLE = { ovr: 86, age: 36, health: 50 };
if (SECTIONS.has('2') || SECTIONS.has('4')) {
  console.log(`sections 2b and 4: the call, ${FLEET} careers an era through the real NBA engine`);
  for (const [era, eraId, firstSummer] of ERAS) {
    let careers = 0; let called = 0; let calls = 0; let summers = 0; let rated = 0; let hurtBlocked = 0; let oldBlocked = 0;
    const firsts = new Map();
    const bests = [];
    for (let i = 0; i < FLEET; i += 1) {
      let mine = 0;
      let first = null;
      let best = 0;
      const onSummer = c => {
        const line = c.seasons[c.seasons.length - 1];
        const summer = line.year + 1;
        if (first === null) first = summer;
        summers += 1;
        const ed = resolve(summer);
        const suspended = line.teamResult === 'SUSPENDED' || (c.suspendedSeasons ?? 0) > 0;
        if (ed && !suspended && line.ovr >= ORACLE.ovr) {
          rated += 1;
          if (c.health < ORACLE.health) hurtBlocked += 1;
          if (c.age > ORACLE.age) oldBlocked += 1;
        }
        if (ed && !suspended && c.age <= ORACLE.age && c.health >= ORACLE.health) best = Math.max(best, line.ovr);
        const meets = !!ed && !c.retired && !suspended && line.ovr >= ORACLE.ovr && c.age <= ORACLE.age && c.health >= ORACLE.health;
        const call = nbaIntl.NBA_CAREER_INTL.pending(c);
        check('4', !!call === meets, `${era} ${i} summer ${summer}: ovr ${line.ovr} age ${c.age} health ${c.health} edition ${ed?.id ?? 'none'}, called ${!!call}, the oracle says ${meets}`);
        if (call) {
          mine += 1;
          check('2', call.year === summer && call.edition.id === ed?.id, `${era} ${i}: the season labelled ${line.year} is called to ${call.edition.id}, the summer after it is ${summer} (${ed?.id ?? 'none'})`);
        }
      };
      drive.driveCareer(NBA_CAREER_SPORT, { key: `intl:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30, onSummer });
      careers += 1;
      bests.push(best);
      if (mine) called += 1;
      calls += mine;
      if (first !== null) firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    check('2', firsts.size === 1 && firsts.has(firstSummer), `${era}: first summers ${JSON.stringify([...firsts])}, expected ${firstSummer}`);
    check('4', called > 0, `${era}: nobody was ever called, so the section proves nothing`);
    console.log(`  ${era}: ${careers} careers, ${summers} summers, first summer ${[...firsts.keys()].join(' ')}; called at least once ${called} (${(100 * called / careers).toFixed(1)} percent), ${calls} calls (${(calls / careers).toFixed(2)} a career, ${(calls / Math.max(1, called)).toFixed(2)} a called career)`);
    console.log(`  ${era}: share of careers ever called if the bar were 84 to 92: ${[84, 85, 86, 87, 88, 89, 90, 91, 92].map(b => `${b} ${(100 * bests.filter(x => x >= b).length / careers).toFixed(1)}`).join(", ")}`);
    console.log(`  ${era}: ${rated} edition summers rated ${ORACLE.ovr} or more; held back by health under ${ORACLE.health}: ${hurtBlocked} (${(100 * hurtBlocked / Math.max(1, rated)).toFixed(1)} percent), by age over ${ORACLE.age}: ${oldBlocked}`);
  }
}

/* ─── 5. the tournament, by rating tier ──────────────────────────────────── */
/* TOURNEYS tournaments an edition kind a seed set (played, still to come,
   projected), ten seed sets: sets 1 to 5 set the bands (BANDS below, read off
   their printed rates on the runner with headroom), sets 6 to 10 are held out
   and must sit inside them. A career at the call is a season line at a tier's
   rating and nothing else, so the tier is the only thing that moves. */
const TOURNEYS = Number(process.env.INTL_TOURNEYS || 2000);
const TIERS = [[86, 88], [89, 91], [92, 94], [95, 99]];
const KINDS = ['played', 'future', 'projected'];
/* Gold and medal bands a tier, a kind (percent): [gold low, gold high, medal low, medal high].
   Measured on a runner (r1541-s3b, head a8ebb59d, 2000 tournaments an edition kind a set, so 500 a tier):
   sets 1 to 5 ranged, gold then medal, by tier 86-88, 89-91, 92-94, 95-99:
     played     gold 45.2-48.0, 54.8-57.4, 62.6-65.4, 65.0-67.8   medal 77.4-80.2, 81.8-85.8, 88.4-90.2, 88.6-90.6
     future     gold 61.2-66.6, 72.8-80.4, 86.4-88.6, 92.4-95.0   medal 86.8-90.6, 95.6-96.8, 96.2-97.4, 98.6-99.6
     projected  gold 64.4-66.2, 79.4-85.0, 88.2-90.6, 91.4-95.0   medal 87.0-90.2, 96.0-98.6, 96.2-97.4, 99.2-99.6
   A rate over 500 tournaments has a standard error of about 2.2 points, so each band is the sets 1 to 5
   range widened by 6 points (close to three errors) on both sides, capped at 100. The held out sets 6 to 10
   then measured: played gold 45.0-48.6, 53.2-55.0, 63.2-65.4, 65.2-68.4; future gold 66.0-71.0, 75.6-78.4,
   84.2-88.4, 91.6-95.8; projected gold 62.0-66.8, 79.8-83.4, 86.6-90.0, 90.4-95.8 (all inside). */
const BANDS = {
  played: [[39.2, 54.0, 71.4, 86.2], [48.8, 63.4, 75.8, 91.8], [56.6, 71.4, 82.4, 96.2], [59.0, 73.8, 82.6, 96.6]],
  future: [[55.2, 72.6, 80.8, 96.6], [66.8, 86.4, 89.6, 100], [80.4, 94.6, 90.2, 100], [86.4, 100, 92.6, 100]],
  projected: [[58.4, 72.2, 81.0, 96.2], [73.4, 91.0, 90.0, 100], [82.2, 96.6, 90.2, 100], [85.4, 100, 93.2, 100]],
};
/* Gold must rise from tier to tier (the first three) by at least this many points, pooled over the held out
   sets (2500 a tier, a standard error on a difference of about 1.4 points). Sets 1 to 5 pooled rose at least
   7.4 (projected, 89-91 to 92-94); the held out sets at least 7.6. The 95-99 tier is not held to a rise: the
   lift is capped at 4, reached at 94, so it measured 2.4 to 7.1 over 92-94 and could tie. */
const RISE = 3;
const tierCareer = (ovr, k) => ({
  name: `band ${k}`, pos: 'SF', draftPick: 1, age: 28, health: 80, retired: false,
  seasons: [{ year: 2000, ovr, ppg: 24, rpg: 6, apg: 5, teamResult: 'band', games: 70 }],
});
if (SECTIONS.has('5')) {
  console.log(`section 5: the tournament, ${TOURNEYS} tournaments an edition kind, ten seed sets`);
  const cal = nbaIntl.NBA_INTL_CALENDAR;
  const editions = { played: cal.played(), future: [], projected: [] };
  for (let y = 2025; y <= 2050; y += 1) { const e = cal.editionFor(y); if (e && e.kind !== 'played') editions[e.kind].push(e); }
  const rates = {};
  let invariants = 0;
  for (let set = 1; set <= 10; set += 1) {
    for (const kind of KINDS) {
      const eds = editions[kind];
      const tally = TIERS.map(() => ({ n: 0, gold: 0, medal: 0 }));
      for (let k = 0; k < TOURNEYS; k += 1) {
        const ti = k % TIERS.length;
        const [lo, hi] = TIERS[ti];
        const ovr = lo + (Math.floor(k / TIERS.length) % (hi - lo + 1));
        const e = eds[k % eds.length];
        const t = intl.runIntlTournament(e, 'USA', nbaIntl.NBA_INTL_BIND, tierCareer(ovr, k), keyed.keyedRng(`band:${set}:${kind}:${k}`));
        if (!t) { check('5', false, `${e.id} played no tournament`); continue; }
        const place = t.places.USA;
        tally[ti].n += 1;
        if (place === 'gold') tally[ti].gold += 1;
        if (place === 'gold' || place === 'silver' || place === 'bronze') tally[ti].medal += 1;
        /* the unit file's invariants, on every tournament */
        invariants += 1;
        const by = p => Object.entries(t.places).filter(([, x]) => x === p).map(([n]) => n);
        const medals = [...by('gold'), ...by('silver'), ...by('bronze')];
        if (e.play.bronze) check('5', medals.length === 3 && new Set(medals).size === 3 && by('fourth').length === 1, `${e.id} set ${set} #${k}: podium ${medals.join(',')}`);
        check('5', t.champion === t.games.find(g => g.round === 'final')?.winner, `${e.id} #${k}: the champion is not the final's winner`);
        let w = 0; let l = 0;
        for (const gr of t.groups) for (const r of gr.table) { w += r.won; l += r.lost; }
        check('5', w === l, `${e.id} #${k}: group wins ${w}, losses ${l}`);
        for (const g of t.games) if (g.sa === g.sb || g.a === g.b || !(g.winner === g.a || g.winner === g.b)) check('5', false, `${e.id} #${k}: a level, self or unwon game`);
      }
      rates[`${set}:${kind}`] = tally.map(x => ({ gold: (100 * x.gold) / x.n, medal: (100 * x.medal) / x.n }));
    }
  }
  const fmt = r => r.map(x => `${x.gold.toFixed(1)}/${x.medal.toFixed(1)}`).join('  ');
  for (const kind of KINDS) {
    console.log(`  ${kind} (gold/medal percent by tier ${TIERS.map(([a, b]) => `${a}-${b}`).join(', ')}):`);
    for (let set = 1; set <= 10; set += 1) console.log(`    set ${set}${set > 5 ? ' (held out)' : ''}: ${fmt(rates[`${set}:${kind}`])}`);
    const lo = TIERS.map((_, ti) => Math.min(...[1, 2, 3, 4, 5].map(s => rates[`${s}:${kind}`][ti].gold)));
    const hi = TIERS.map((_, ti) => Math.max(...[1, 2, 3, 4, 5].map(s => rates[`${s}:${kind}`][ti].gold)));
    console.log(`    sets 1 to 5 gold range by tier: ${lo.map((x, i) => `${x.toFixed(1)} to ${hi[i].toFixed(1)}`).join(', ')}`);
    const held = TIERS.map((_, ti) => [6, 7, 8, 9, 10].reduce((s, x) => s + rates[`${x}:${kind}`][ti].gold, 0) / 5);
    console.log(`    held out pooled gold by tier: ${held.map(x => x.toFixed(1)).join(', ')}; rises ${held.slice(1).map((x, i) => (x - held[i]).toFixed(1)).join(', ')}`);
    if (BANDS) {
      for (let s = 6; s <= 10; s += 1) TIERS.forEach((_, ti) => {
        const [g0, g1, m0, m1] = BANDS[kind][ti];
        const r = rates[`${s}:${kind}`][ti];
        check('5', r.gold >= g0 && r.gold <= g1 && r.medal >= m0 && r.medal <= m1, `${kind} set ${s} tier ${TIERS[ti].join('-')}: gold ${r.gold.toFixed(1)} medal ${r.medal.toFixed(1)} outside ${g0}-${g1} / ${m0}-${m1}`);
      });
    }
    if (RISE !== null) for (let ti = 1; ti < 3; ti += 1) check('5', held[ti] - held[ti - 1] >= RISE, `${kind}: gold rises ${(held[ti] - held[ti - 1]).toFixed(1)} from tier ${TIERS[ti - 1].join('-')} to ${TIERS[ti].join('-')}, under ${RISE}`);
  }
  console.log(`  ${invariants} tournaments held to the invariants`);
}

/* ─── 7. what must not move ──────────────────────────────────────────────── */
/* The same FLEET careers an era, four ways: INTL_BASE's NBA binding and drive
   (INTL_BASE_DIR, a worktree of the commit the branch started from, or of
   origin/main's merge base after a merge), and this head with no policy,
   always go and always rest. A career never called is byte identical to the
   base; one that only rested differs by its intl key alone; one that went
   differs only through its block and, after the first summer it came home
   hurt, its health and what follows from it. The deal comes before the
   answer: the first call's dealt cards are the same in the go and rest arms. */
const BASE_DIR = process.env.INTL_BASE_DIR || '';
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
if (SECTIONS.has('7')) {
  console.log(`section 7: what must not move, ${FLEET} careers an era against ${BASE_DIR || '(no base)'}`);
  if (!BASE_DIR || !fs.existsSync(path.join(BASE_DIR, 'src/lib/nbaCareerSport.ts'))) { console.error('section 7 needs INTL_BASE_DIR, a worktree of the base commit'); process.exit(2); }
  const BENTRY = path.join(TMP, 'base-entry.mjs');
  const BOUT = path.join(TMP, 'base-bundle.mjs');
  const B = path.resolve(BASE_DIR).replaceAll('\\', '/');
  fs.writeFileSync(BENTRY, `export { NBA_CAREER_SPORT } from '${B}/src/lib/nbaCareerSport.ts';\nexport * as drive from '${B}/src/test/helpers/usCareerDrive.ts';\n`);
  await build({ entryPoints: [BENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BOUT, logLevel: 'error', absWorkingDir: path.resolve(BASE_DIR), alias: { '@': path.join(path.resolve(BASE_DIR), 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  const base = await import(pathToFileURL(BOUT).href);
  const legacyOf = CONTROL === 'legacyreads'
    ? c => { const l = NBA_CAREER_SPORT.legacyOf(c); return { ...l, score: l.score + intl.intlStatsOf(c.intl).medals }; }
    : c => NBA_CAREER_SPORT.legacyOf(c);
  const strip = json => { const c = JSON.parse(json); delete c.intl; return c; };
  for (const [era, eraId] of ERAS) {
    const n = { never: 0, rested: 0, went: 0, hurt: 0, unhurt: 0 };
    const leg = { go: [], rest: [], goHof: 0, restHof: 0 };
    const sizes = [];
    for (let i = 0; i < FLEET; i += 1) {
      const o = { key: `intl7:${era}:${i}`, pos: POS[i % POS.length], arch: i, eraId, seasons: 30 };
      const baseJson = base.drive.driveCareer(base.NBA_CAREER_SPORT, o).json;
      const none = drive.driveCareer(NBA_CAREER_SPORT, o);
      const go = drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'go' });
      const rest = drive.driveCareer(NBA_CAREER_SPORT, { ...o, intl: 'rest' });
      check('7', none.json === baseJson, `${era} ${i}: with no answer the career differs from the base`);
      if (!rest.intlLog.length) {
        n.never += 1;
        check('7', rest.json === baseJson && go.json === baseJson && !go.intlLog.length, `${era} ${i}: never called, yet the career moved`);
        continue;
      }
      n.rested += 1;
      check('7', same(strip(rest.json), JSON.parse(baseJson)), `${era} ${i}: resting moved something beside the intl block`);
      check('7', go.intlLog.length > 0 && go.intlLog[0].dealt === rest.intlLog[0].dealt && go.intlLog[0].year === rest.intlLog[0].year, `${era} ${i}: the first call's deal differs between go and rest`);
      const gc = JSON.parse(go.json);
      const rows = gc.intl?.summers ?? [];
      const firstHurt = rows.find(r => r.went && r.hurt);
      n.went += 1;
      if (gc.seasons.length >= 21) sizes.push([baseJson.length, go.json.length, gc.intl?.summers?.length ?? 0]);
      if (!firstHurt) {
        n.unhurt += 1;
        check('7', same(strip(go.json), JSON.parse(baseJson)), `${era} ${i}: went and never came home hurt, yet more than the block moved`);
      } else {
        n.hurt += 1;
        const bc = JSON.parse(baseJson);
        const before = s => s.year < firstHurt.year;
        check('7', same(gc.seasons.filter(before), bc.seasons.filter(before)), `${era} ${i}: the seasons before the first knock (${firstHurt.year}) moved`);
      }
      const rc = JSON.parse(rest.json);
      const lg = legacyOf(gc); const lr = legacyOf(rc);
      check('7', same(legacyOf(gc), legacyOf(strip(go.json))), `${era} ${i}: legacy reads the intl block`);
      leg.go.push(lg.score); leg.rest.push(lr.score);
      if (lg.hof) leg.goHof += 1;
      if (lr.hof) leg.restHof += 1;
    }
    check('7', n.rested > 0 && n.never > 0 && n.unhurt > 0, `${era}: the fleet has no called, never called or unhurt career, so the section proves nothing`);
    console.log(`  ${era}: never called ${n.never}, called ${n.rested} (went and never hurt ${n.unhurt}, hurt at least once ${n.hurt})`);
    if (sizes.length) console.log(`  ${era}: save bytes of a career of 21 seasons or more that went every time it was called: first ${sizes[0][0]} on the base, ${sizes[0][1]} on this head (${sizes[0][2]} summers); the save grows by ${median(sizes.map(x => x[1] - x[0]))} bytes at the median, ${Math.max(...sizes.map(x => x[1] - x[0]))} at most, over ${sizes.length} careers`);
    console.log(`  ${era}: called careers, legacy median always go ${median(leg.go)} vs always rest ${median(leg.rest)}; Hall share ${(100 * leg.goHof / Math.max(1, leg.go.length)).toFixed(1)} vs ${(100 * leg.restHof / Math.max(1, leg.rest.length)).toFixed(1)} percent (measured, never asserted)`);
  }
}

/* ─── 8. saves ───────────────────────────────────────────────────────────── */
/* Part A's board never calls the repair, so the repair is run directly: over
   every NBA save scripts/lib/realSaves.mjs builds (each must come back byte
   identical) and over a planted broken block, row and last (each dropped
   alone, the rest of the career untouched). */
if (SECTIONS.has('8')) {
  console.log('section 8: saves');
  const { fleet } = await buildRealSaves({ root: ROOT, tmpDir: path.join(TMP, 'real') });
  const saves = (fleet['/nba-my-career'] ?? []).map(raw => JSON.parse(raw)).filter(s => s && s.c);
  check('8', saves.length >= 2, `only ${saves.length} played NBA saves were built`);
  for (const [k, s] of saves.entries()) {
    const c = JSON.parse(JSON.stringify(s.c));
    const was = JSON.stringify(c);
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(c) === false && JSON.stringify(c) === was, `real save ${k} moved on repair`);
  }
  const good = () => [
    { year: 2004, edition: 'oly-2004', went: false },
    { year: 2008, edition: 'oly-2008', went: true, age: 25, place: 'gold', games: 8, wins: 8, avg: { pts: 20, reb: 5, ast: 4 }, hurt: false },
  ];
  const plant = (s, intlBlock) => { const c = JSON.parse(JSON.stringify(s.c)); c.intl = intlBlock; return c; };
  const sample = saves[0];
  if (sample) {
    const plain = JSON.stringify(sample.c);
    const a = plant(sample, { v: 9, summers: 'broken' });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(a) && !('intl' in a) && JSON.stringify(a) === plain, 'a broken block was not dropped alone');
    const b = plant(sample, { v: 1, summers: [...good(), { year: 2006, edition: 'oly-2008', went: false }] });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(b) && same(b.intl?.summers, good()), 'a broken row was not dropped alone');
    const cOk = plant(sample, { v: 1, summers: good(), last: { v: 1, edition: 'oly-2008' } });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(cOk) && same(cOk.intl, { v: 1, summers: good() }), 'a broken last was not dropped alone');
    const d = plant(sample, { v: 1, summers: [{ year: 2035, edition: 'wc-2035', went: true, age: 30, place: 'gold', games: 8, wins: 8, avg: { pts: 20 }, hurt: false }] });
    check('8', nbaIntl.NBA_CAREER_INTL.repairOnLoad(d) === false && d.intl.summers.length === 1, 'a projected summer was dropped');
  }
  console.log(`  ${saves.length} played NBA saves repaired byte identical; four planted blocks checked`);
}

/* ─── summary ────────────────────────────────────────────────────────────── */
const reds = [...failed.entries()].map(([s, n]) => `section ${s}: ${n}`);
if (CONTROL) {
  const fired = failed.has(CONTROLS[CONTROL].section);
  console.log(`simCareerIntl: control ${CONTROL} ${fired ? 'FIRED' : 'DID NOT FIRE'} (section ${CONTROLS[CONTROL].section}${fired ? `, ${failed.get(CONTROLS[CONTROL].section)} failures` : ' stayed green'})`);
  process.exit(fired ? 1 : 3);
}
console.log(reds.length ? `simCareerIntl: RED, ${checks} checks, ${reds.join(', ')}` : `simCareerIntl: GREEN, ${checks} checks over sections ${[...SECTIONS].join(',')}`);
process.exit(reds.length ? 1 : 0);
