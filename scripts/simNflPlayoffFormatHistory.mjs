/*
 * Round 522 harness: the NFL playoff format history reference page.
 *
 * Same shape as scripts/simUclFormatHistory.mjs, minus the engine agreement
 * section: this page has no "what the game plays" block generated from an
 * engine, only a short honest sentence, because NFL Front Office has no era
 * system the way Club Manager does.
 *
 * Sections:
 *  1. The timeline is contiguous from 1933, no gaps, no overlaps, exactly one
 *     open period, unique ids, field sizes never shrink.
 *  2. Every period cites at least two distinct publishers, every id resolves,
 *     every URL is https, nothing is cited by nothing, the verification date
 *     is real and not in the future.
 *  3. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   NFL_PLAYOFF_CONTROL=gap   moves a period's first season by a year, so
 *                             section 1 must report the hole.
 *   NFL_PLAYOFF_CONTROL=onesrc strips a period down to one source, so
 *                             section 2 must report it.
 *
 * Run: node scripts/simNflPlayoffFormatHistory.mjs
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
const ENTRY = `${TMP}/nflPlayoff.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/nflPlayoff.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/nflPlayoffFormatHistory.ts`;

const CONTROL = process.env.NFL_PLAYOFF_CONTROL || '';
const KNOWN = ['gap', 'onesrc'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`NFL_PLAYOFF_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
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
  libPath = patched("    id: 'ten-teams',\n    from: 1978,", "    id: 'ten-teams',\n    from: 1979,", `nflPlayoffFormatHistory.${PID}.control.ts`);
} else if (CONTROL === 'onesrc') {
  libPath = patched("sources: ['wp1990', 'bears', 'sportscasting'],", "sources: ['wp1990'],", `nflPlayoffFormatHistory.${PID}.control.ts`);
}

fs.writeFileSync(ENTRY, `export const lib = await import('${libPath.replaceAll('\\', '/')}');`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { NFL_PLAYOFF_PERIODS, NFL_PLAYOFF_SOURCES, NFL_OVERTIME, NFL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById } = lib;

for (const [name, v] of Object.entries({ NFL_PLAYOFF_PERIODS, NFL_PLAYOFF_SOURCES, NFL_OVERTIME, NFL_PLAYOFF_VERIFIED_ON, seasonRange, sourceById })) {
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
console.log('1) the timeline is contiguous from 1933 with exactly one open period, field sizes never shrink');
{
  const ps = NFL_PLAYOFF_PERIODS;
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1933) fail(`the first period starts in ${ps[0]?.from}, not 1933`);
  for (let i = 1; i < ps.length; i += 1) {
    const prev = ps[i - 1];
    const cur = ps[i];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
    if (cur.fieldSize < prev.fieldSize) fail(`${cur.id}'s field (${cur.fieldSize}) is smaller than ${prev.id}'s (${prev.fieldSize}); the NFL playoffs have never shrunk`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  let covered = 0;
  for (let y = 1933; y <= 2026; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  for (const p of NFL_PLAYOFF_PERIODS) {
    const srcs = p.sources.map(id => sourceById(id));
    const missing = p.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${p.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${p.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  const otPubs = new Set(NFL_OVERTIME.sources.map(id => sourceById(id)?.publisher).filter(Boolean));
  if (otPubs.size < 2) fail(`the overtime block rests on ${otPubs.size} publisher(s)`);
  for (const s of NFL_PLAYOFF_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(NFL_PLAYOFF_SOURCES.map(s => s.id));
  if (ids.size !== NFL_PLAYOFF_SOURCES.length) fail('source ids are not unique');
  const unused = NFL_PLAYOFF_SOURCES.filter(s => !NFL_PLAYOFF_PERIODS.some(p => p.sources.includes(s.id)) && !NFL_OVERTIME.sources.includes(s.id));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(NFL_PLAYOFF_VERIFIED_ON) || Number.isNaN(Date.parse(NFL_PLAYOFF_VERIFIED_ON))) {
    fail(`NFL_PLAYOFF_VERIFIED_ON is not a date: ${NFL_PLAYOFF_VERIFIED_ON}`);
  } else if (Date.parse(NFL_PLAYOFF_VERIFIED_ON) > Date.now()) {
    fail(`NFL_PLAYOFF_VERIFIED_ON is in the future: ${NFL_PLAYOFF_VERIFIED_ON}`);
  }
  console.log(`   ${NFL_PLAYOFF_SOURCES.length} sources across ${new Set(NFL_PLAYOFF_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${NFL_PLAYOFF_VERIFIED_ON}`);
}

/* ---------- 3. The shipped snapshot ---------- */
section = '3';
if (CONTROL) {
  console.log('3) snapshot check skipped under a control');
} else {
  console.log('3) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'nfl-playoff-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('public/nfl-playoff-format-history/index.html is missing: run npm run build:seo so the page ships as a snapshot');
  } else {
    const html = fs.readFileSync(snap, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of NFL_PLAYOFF_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const must of [NFL_PLAYOFF_VERIFIED_ON, '1958']) {
      if (!text.includes(must)) fail(`the snapshot does not contain ${JSON.stringify(must)}`);
    }
    const cited = NFL_PLAYOFF_SOURCES.filter(s => html.includes(s.url)).length;
    if (cited < NFL_PLAYOFF_SOURCES.length - 1) fail(`only ${cited} of ${NFL_PLAYOFF_SOURCES.length} source URLs reached the snapshot`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) fail('the snapshot carries a noindex');
    const words = text.split(' ').filter(Boolean).length;
    if (words < 700) fail(`the snapshot carries only ${words} words, which is a shell rather than the page`);
    console.log(`   ${rows} of ${NFL_PLAYOFF_PERIODS.length} rows, ${cited} of ${NFL_PLAYOFF_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  const want = CONTROL === 'gap'
    ? { section: '1', signal: 'a hole or an overlap' }
    : { section: '2', signal: 'rests on' };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simNflPlayoffFormatHistory control: green. NFL_PLAYOFF_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simNflPlayoffFormatHistory control: RED. NFL_PLAYOFF_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simNflPlayoffFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNflPlayoffFormatHistory: green. The timeline is whole and twice sourced.');
