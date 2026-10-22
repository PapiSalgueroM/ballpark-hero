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
const SECTIONS = new Set((process.env.INTL_SECTIONS || '1,2,3').split(',').map(s => s.trim()));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'careerIntl-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

const CONTROLS = {
  onesource: { section: '1', note: 'one calendar fact of oly-2008 keeps one read' },
  shiftyear: { section: '2', note: "oly-2008's src year moved by one" },
  dupnation: { section: '3', note: "oly-2012's field holds Spain twice" },
  fieldsize: { section: '3', note: "wc-2014's field loses a nation" },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control "${CONTROL}": use ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL && !SECTIONS.has(CONTROLS[CONTROL].section)) SECTIONS.add(CONTROLS[CONTROL].section);

/* ─── bundle ─────────────────────────────────────────────────────────────── */
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `export * as data from '${ROOT_URL}/src/data/basketballIntl.ts';\n`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') } });
const { data } = await import(`file://${OUT.replaceAll('\\', '/')}`);
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

/* ─── summary ────────────────────────────────────────────────────────────── */
const reds = [...failed.entries()].map(([s, n]) => `section ${s}: ${n}`);
if (CONTROL) {
  const fired = failed.has(CONTROLS[CONTROL].section);
  console.log(`simCareerIntl: control ${CONTROL} ${fired ? 'FIRED' : 'DID NOT FIRE'} (section ${CONTROLS[CONTROL].section}${fired ? `, ${failed.get(CONTROLS[CONTROL].section)} failures` : ' stayed green'})`);
  process.exit(fired ? 1 : 3);
}
console.log(reds.length ? `simCareerIntl: RED, ${checks} checks, ${reds.join(', ')}` : `simCareerIntl: GREEN, ${checks} checks over sections ${[...SECTIONS].join(',')}`);
process.exit(reds.length ? 1 : 0);
