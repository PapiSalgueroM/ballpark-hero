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
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

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
    for (let i = 0; i < FLEET; i += 1) {
      let mine = 0;
      let first = null;
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
      if (mine) called += 1;
      calls += mine;
      if (first !== null) firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    check('2', firsts.size === 1 && firsts.has(firstSummer), `${era}: first summers ${JSON.stringify([...firsts])}, expected ${firstSummer}`);
    check('4', called > 0, `${era}: nobody was ever called, so the section proves nothing`);
    console.log(`  ${era}: ${careers} careers, ${summers} summers, first summer ${[...firsts.keys()].join(' ')}; called at least once ${called} (${(100 * called / careers).toFixed(1)} percent), ${calls} calls (${(calls / careers).toFixed(2)} a career, ${(calls / Math.max(1, called)).toFixed(2)} a called career)`);
    console.log(`  ${era}: ${rated} edition summers rated ${ORACLE.ovr} or more; held back by health under ${ORACLE.health}: ${hurtBlocked} (${(100 * hurtBlocked / Math.max(1, rated)).toFixed(1)} percent), by age over ${ORACLE.age}: ${oldBlocked}`);
  }
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
