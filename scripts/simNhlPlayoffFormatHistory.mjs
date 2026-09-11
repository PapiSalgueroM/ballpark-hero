/*
 * Round 534 harness: the NHL playoff format history reference page.
 *
 * Same shape as scripts/simNflPlayoffFormatHistory.mjs. The NFL harness's
 * "field sizes never shrink" rule does not hold for hockey (the Original Six
 * cut the field from six to four), so section 1 asserts the invariants that
 * are actually true of this timeline instead: the field never exceeds the
 * league, and it has been sixteen in every period from 1979-80 onward,
 * which is what the page says in words.
 *
 * Sections:
 *  1. The timeline is contiguous from 1917-18, no gaps, no overlaps, exactly
 *     one open period, unique ids, the field fits the league, sixteen since
 *     1979, and every exception season lands inside exactly one period.
 *  2. Every period and every exception cites at least two distinct
 *     publishers, every id resolves, every URL is https, nothing is cited by
 *     nothing, the verification date is real and not in the future.
 *  3. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   NHL_PLAYOFF_CONTROL=gap    moves a period's first season by a year, so
 *                              section 1 must report the hole.
 *   NHL_PLAYOFF_CONTROL=onesrc strips a period down to one source, so
 *                              section 2 must report it.
 *
 * Run: node scripts/simNhlPlayoffFormatHistory.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const PID = process.pid;
const ENTRY = `${TMP}/nhlPlayoff.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/nhlPlayoff.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/nhlPlayoffFormatHistory.ts`;

const CONTROL = process.env.NHL_PLAYOFF_CONTROL || '';
const KNOWN = ['gap', 'onesrc'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`NHL_PLAYOFF_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

function patched(from, to, outName) {
  let src = fs.readFileSync(LIB, 'utf8').replaceAll('\r\n', '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) {
    console.error(`control cannot run: the library contains the target ${n} times, not once`);
    console.error(`  looked for: ${from}`);
    process.exit(1);
  }
  src = src.replace(from, to);
  const out = `${TMP}/${outName}`;
  fs.writeFileSync(out, src);
  return out;
}

let libPath = LIB;
if (CONTROL === 'gap') {
  libPath = patched("    id: 'original-six',\n    from: 1942,", "    id: 'original-six',\n    from: 1943,", `nhlPlayoffFormatHistory.${PID}.control.ts`);
} else if (CONTROL === 'onesrc') {
  libPath = patched("sources: ['wp1979', 'nhlguide', 'si'],", "sources: ['wp1979'],", `nhlPlayoffFormatHistory.${PID}.control.ts`);
}

fs.writeFileSync(ENTRY, `export const lib = await import('${libPath.replaceAll('\\', '/')}');`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { NHL_PLAYOFF_PERIODS, NHL_PLAYOFF_SOURCES, NHL_PLAYOFF_EXCEPTIONS, NHL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById } = lib;

for (const [name, v] of Object.entries({ NHL_PLAYOFF_PERIODS, NHL_PLAYOFF_SOURCES, NHL_PLAYOFF_EXCEPTIONS, NHL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById })) {
  if (v === undefined) {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const sectionMessages = {};
let section = '';
const fail = m => { failures += 1; (sectionMessages[section] ??= []).push(m); console.error('  FAIL: ' + m); };

/* ---------- 1. Contiguity ---------- */
section = '1';
console.log('1) the timeline is contiguous from 1917-18 with exactly one open period, the field fits the league and has been sixteen since 1979-80');
{
  const ps = NHL_PLAYOFF_PERIODS;
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1917) fail(`the first period starts in ${ps[0]?.from}, not 1917`);
  for (let i = 1; i < ps.length; i += 1) {
    const prev = ps[i - 1];
    const cur = ps[i];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
  }
  for (const p of ps) {
    if (!(p.fieldSize > 0)) fail(`${p.id} has a field of ${p.fieldSize}`);
    if (p.fieldSize > p.leagueSize) fail(`${p.id} qualifies ${p.fieldSize} clubs from a league of ${p.leagueSize}`);
    if (p.from >= 1979 && p.fieldSize !== 16) fail(`${p.id} starts ${p.from} with a field of ${p.fieldSize}; the page says sixteen since 1979-80`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  let covered = 0;
  for (let y = 1917; y <= 2026; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  const exIds = new Set(NHL_PLAYOFF_EXCEPTIONS.map(e => e.id));
  if (exIds.size !== NHL_PLAYOFF_EXCEPTIONS.length) fail('exception ids are not unique');
  const exSeasons = new Set(NHL_PLAYOFF_EXCEPTIONS.map(e => e.season));
  if (exSeasons.size !== NHL_PLAYOFF_EXCEPTIONS.length) fail('two exceptions claim the same season');
  for (const e of NHL_PLAYOFF_EXCEPTIONS) {
    const hits = ps.filter(p => e.season >= p.from && (p.to === null || e.season <= p.to)).length;
    if (hits !== 1) fail(`exception ${e.id} (season ${e.season}) sits inside ${hits} periods`);
  }
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}, ${NHL_PLAYOFF_EXCEPTIONS.length} exception seasons placed`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period and every exception rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  const rows = [
    ...NHL_PLAYOFF_PERIODS.map(p => ({ id: p.id, sources: p.sources })),
    ...NHL_PLAYOFF_EXCEPTIONS.map(e => ({ id: `exception ${e.id}`, sources: e.sources })),
  ];
  for (const r of rows) {
    const srcs = r.sources.map(id => sourceById(id));
    const missing = r.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${r.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${r.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  for (const s of NHL_PLAYOFF_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(NHL_PLAYOFF_SOURCES.map(s => s.id));
  if (ids.size !== NHL_PLAYOFF_SOURCES.length) fail('source ids are not unique');
  const unused = NHL_PLAYOFF_SOURCES.filter(s => !rows.some(r => r.sources.includes(s.id)));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(NHL_PLAYOFF_VERIFIED_ON) || Number.isNaN(Date.parse(NHL_PLAYOFF_VERIFIED_ON))) {
    fail(`NHL_PLAYOFF_VERIFIED_ON is not a date: ${NHL_PLAYOFF_VERIFIED_ON}`);
  } else if (Date.parse(NHL_PLAYOFF_VERIFIED_ON) > Date.now()) {
    fail(`NHL_PLAYOFF_VERIFIED_ON is in the future: ${NHL_PLAYOFF_VERIFIED_ON}`);
  }
  console.log(`   ${NHL_PLAYOFF_SOURCES.length} sources across ${new Set(NHL_PLAYOFF_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${NHL_PLAYOFF_VERIFIED_ON}`);
}

/* ---------- 3. The shipped snapshot ---------- */
section = '3';
if (CONTROL) {
  console.log('3) snapshot check skipped under a control');
} else {
  console.log('3) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'nhl-playoff-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('snapshot not built yet: run npm run build:seo');
  } else {
    const html = fs.readFileSync(snap, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of NHL_PLAYOFF_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const e of NHL_PLAYOFF_EXCEPTIONS) {
      if (!text.includes(e.title)) fail(`the snapshot does not carry the exception "${e.title}"`);
    }
    for (const must of [NHL_PLAYOFF_VERIFIED_ON, '1917-18', '2004-05']) {
      if (!text.includes(must)) fail(`the snapshot does not contain ${JSON.stringify(must)}`);
    }
    const cited = NHL_PLAYOFF_SOURCES.filter(s => html.includes(s.url)).length;
    if (cited < NHL_PLAYOFF_SOURCES.length - 1) fail(`only ${cited} of ${NHL_PLAYOFF_SOURCES.length} source URLs reached the snapshot`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) fail('the snapshot carries a noindex');
    const words = text.split(' ').filter(Boolean).length;
    if (words < 700) fail(`the snapshot carries only ${words} words, which is a shell rather than the page`);
    console.log(`   ${rows} of ${NHL_PLAYOFF_PERIODS.length} rows, ${cited} of ${NHL_PLAYOFF_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  const want = CONTROL === 'gap'
    ? { section: '1', signal: 'a hole or an overlap' }
    : { section: '2', signal: 'rests on' };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simNhlPlayoffFormatHistory control: green. NHL_PLAYOFF_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simNhlPlayoffFormatHistory control: RED. NHL_PLAYOFF_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simNhlPlayoffFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNhlPlayoffFormatHistory: green. The timeline is whole and twice sourced.');
