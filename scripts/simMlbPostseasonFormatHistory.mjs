/*
 * Round 533 harness: the MLB postseason format history reference page.
 *
 * Same shape as scripts/simNflPlayoffFormatHistory.mjs, with one difference in
 * section 1: the NFL field has never shrunk, so that harness asserts it never
 * does. Baseball's has, twice (16 clubs in 2020 back to 10 in 2021, and the
 * page says so), so this one asserts the two things that are true of baseball
 * instead: every field size is one the type allows, and the two seasons with
 * no World Series (1904 and 1994, the same two the Record Books leave empty)
 * are each named in the notes of the period they fall in.
 *
 * Sections:
 *  1. The timeline is contiguous from 1903, no gaps, no overlaps, exactly one
 *     open period, unique ids, every season on exactly one row, both unplayed
 *     years recorded where they fall.
 *  2. Every period cites at least two distinct publishers, every id resolves,
 *     every URL is https, nothing is cited by nothing, the verification date
 *     is real and not in the future.
 *  3. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   MLB_POSTSEASON_CONTROL=gap    moves a period's first season by a year, so
 *                                 section 1 must report the hole.
 *   MLB_POSTSEASON_CONTROL=onesrc strips a period down to one source, so
 *                                 section 2 must report it.
 *
 * Run: node scripts/simMlbPostseasonFormatHistory.mjs
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
const ENTRY = `${TMP}/mlbPostseason.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/mlbPostseason.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/mlbPostseasonFormatHistory.ts`;

const CONTROL = process.env.MLB_POSTSEASON_CONTROL || '';
const KNOWN = ['gap', 'onesrc'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`MLB_POSTSEASON_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
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
  libPath = patched("    id: 'lcs-seven',\n    from: 1985,", "    id: 'lcs-seven',\n    from: 1986,", `mlbPostseasonFormatHistory.${PID}.control.ts`);
} else if (CONTROL === 'onesrc') {
  libPath = patched("sources: ['wplcs', 'wpost', 'almanacpost'],", "sources: ['wplcs'],", `mlbPostseasonFormatHistory.${PID}.control.ts`);
}

fs.writeFileSync(ENTRY, `export const lib = await import('${libPath.replaceAll('\\', '/')}');`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { MLB_POSTSEASON_PERIODS, MLB_POSTSEASON_SOURCES, MLB_SERIES_LENGTHS, MLB_UNPLAYED_SEASONS, MLB_POSTSEASON_VERIFIED_ON, seasonRange, sourceById } = lib;

for (const [name, v] of Object.entries({ MLB_POSTSEASON_PERIODS, MLB_POSTSEASON_SOURCES, MLB_SERIES_LENGTHS, MLB_UNPLAYED_SEASONS, MLB_POSTSEASON_VERIFIED_ON, seasonRange, sourceById })) {
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
console.log('1) the timeline is contiguous from 1903 with exactly one open period, and both unplayed years are recorded');
{
  const ps = MLB_POSTSEASON_PERIODS;
  const ALLOWED = new Set([2, 4, 8, 10, 12, 16]);
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1903) fail(`the first period starts in ${ps[0]?.from}, not 1903`);
  for (let i = 0; i < ps.length; i += 1) {
    const cur = ps[i];
    if (!ALLOWED.has(cur.fieldSize)) fail(`${cur.id}'s field (${cur.fieldSize}) is not a size the MLB postseason has ever had`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
    if (i === 0) continue;
    const prev = ps[i - 1];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  let covered = 0;
  for (let y = 1903; y <= 2026; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  if (JSON.stringify(MLB_UNPLAYED_SEASONS) !== JSON.stringify([1904, 1994])) fail(`the unplayed seasons are ${JSON.stringify(MLB_UNPLAYED_SEASONS)}, but the Record Books leave 1904 and 1994 empty`);
  for (const y of MLB_UNPLAYED_SEASONS) {
    const home = ps.find(p => y >= p.from && (p.to === null || y <= p.to));
    if (!home) { fail(`unplayed season ${y} falls in no period`); continue; }
    if (!home.notes.some(n => n.includes(String(y)))) fail(`unplayed season ${y} falls in ${home.id} but none of that period's notes names it`);
  }
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}, ${MLB_UNPLAYED_SEASONS.length} unplayed years recorded`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  for (const p of MLB_POSTSEASON_PERIODS) {
    const srcs = p.sources.map(id => sourceById(id));
    const missing = p.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${p.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${p.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  const lenPubs = new Set(MLB_SERIES_LENGTHS.sources.map(id => sourceById(id)?.publisher).filter(Boolean));
  if (lenPubs.size < 2) fail(`the series lengths block rests on ${lenPubs.size} publisher(s)`);
  for (const s of MLB_POSTSEASON_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(MLB_POSTSEASON_SOURCES.map(s => s.id));
  if (ids.size !== MLB_POSTSEASON_SOURCES.length) fail('source ids are not unique');
  const unused = MLB_POSTSEASON_SOURCES.filter(s => !MLB_POSTSEASON_PERIODS.some(p => p.sources.includes(s.id)) && !MLB_SERIES_LENGTHS.sources.includes(s.id));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(MLB_POSTSEASON_VERIFIED_ON) || Number.isNaN(Date.parse(MLB_POSTSEASON_VERIFIED_ON))) {
    fail(`MLB_POSTSEASON_VERIFIED_ON is not a date: ${MLB_POSTSEASON_VERIFIED_ON}`);
  } else if (Date.parse(MLB_POSTSEASON_VERIFIED_ON) > Date.now()) {
    fail(`MLB_POSTSEASON_VERIFIED_ON is in the future: ${MLB_POSTSEASON_VERIFIED_ON}`);
  }
  console.log(`   ${MLB_POSTSEASON_SOURCES.length} sources across ${new Set(MLB_POSTSEASON_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${MLB_POSTSEASON_VERIFIED_ON}`);
}

/* ---------- 3. The shipped snapshot ---------- */
section = '3';
if (CONTROL) {
  console.log('3) snapshot check skipped under a control');
} else {
  console.log('3) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'mlb-postseason-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('snapshot not built yet: run npm run build:seo');
  } else {
    const html = fs.readFileSync(snap, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of MLB_POSTSEASON_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const must of [MLB_POSTSEASON_VERIFIED_ON, '1904', '1994']) {
      if (!text.includes(must)) fail(`the snapshot does not contain ${JSON.stringify(must)}`);
    }
    const cited = MLB_POSTSEASON_SOURCES.filter(s => html.includes(s.url)).length;
    if (cited < MLB_POSTSEASON_SOURCES.length) fail(`only ${cited} of ${MLB_POSTSEASON_SOURCES.length} source URLs reached the snapshot`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) fail('the snapshot carries a noindex');
    const words = text.split(' ').filter(Boolean).length;
    if (words < 700) fail(`the snapshot carries only ${words} words, which is a shell rather than the page`);
    console.log(`   ${rows} of ${MLB_POSTSEASON_PERIODS.length} rows, ${cited} of ${MLB_POSTSEASON_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  const want = CONTROL === 'gap'
    ? { section: '1', signal: 'a hole or an overlap' }
    : { section: '2', signal: 'rests on' };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simMlbPostseasonFormatHistory control: green. MLB_POSTSEASON_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simMlbPostseasonFormatHistory control: RED. MLB_POSTSEASON_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simMlbPostseasonFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simMlbPostseasonFormatHistory: green. The timeline is whole and twice sourced.');
