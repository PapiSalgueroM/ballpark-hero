/*
 * Round 532 harness: the NBA playoff format history reference page.
 *
 * Same shape as scripts/simNflPlayoffFormatHistory.mjs. One difference the
 * data forces: the NBA field shrank twice in the early years (twelve teams
 * in 1949-50 to eight, then to six for the round robin) because the league
 * itself was shrinking, so the "never shrinks" rule is applied from
 * NBA_FIELD_NEVER_SHRINKS_FROM (1966-67) onward, where it has held.
 *
 * Sections:
 *  1. The timeline is contiguous from 1946, no gaps, no overlaps, exactly one
 *     open period, unique ids, field sizes never shrink from 1966 on, and the
 *     lottery eras are in year order.
 *  2. Every period and every lottery era cites at least two distinct
 *     publishers, every id resolves, every URL is https, nothing is cited by
 *     nothing, the verification date is real and not in the future.
 *  3. The shipped snapshot carries every row, the source list and enough of
 *     the page that a crawler receives the page rather than a shell.
 *
 * Controls:
 *   NBA_PLAYOFF_CONTROL=gap    moves a period's first season by a year, so
 *                              section 1 must report the hole.
 *   NBA_PLAYOFF_CONTROL=onesrc strips a period down to one source, so
 *                              section 2 must report it.
 *
 * Run: node scripts/simNbaPlayoffFormatHistory.mjs
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
const ENTRY = `${TMP}/nbaPlayoff.${PID}.entry.mjs`;
const BUNDLE = `${TMP}/nbaPlayoff.${PID}.bundle.mjs`;
const LIB = `${ROOT}/src/lib/nbaPlayoffFormatHistory.ts`;

const CONTROL = process.env.NBA_PLAYOFF_CONTROL || '';
const KNOWN = ['gap', 'onesrc'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`NBA_PLAYOFF_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
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
  libPath = patched("    id: 'sixteen',\n    from: 1983,", "    id: 'sixteen',\n    from: 1984,", `nbaPlayoffFormatHistory.${PID}.control.ts`);
} else if (CONTROL === 'onesrc') {
  libPath = patched("sources: ['wpoverview', 'wp2002', 'fansidedreform', 'fansidedseries'],", "sources: ['wpoverview', 'wp2002'],", `nbaPlayoffFormatHistory.${PID}.control.ts`);
}

fs.writeFileSync(ENTRY, `export const lib = await import('${libPath.replaceAll('\\', '/')}');`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { lib } = await import(pathToFileURL(BUNDLE).href);
const { NBA_PLAYOFF_PERIODS, NBA_PLAYOFF_SOURCES, NBA_LOTTERY, NBA_PLAYOFF_VERIFIED_ON, NBA_FIELD_NEVER_SHRINKS_FROM, seasonRange, sourceById } = lib;

for (const [name, v] of Object.entries({ NBA_PLAYOFF_PERIODS, NBA_PLAYOFF_SOURCES, NBA_LOTTERY, NBA_PLAYOFF_VERIFIED_ON, NBA_FIELD_NEVER_SHRINKS_FROM, seasonRange, sourceById })) {
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
console.log(`1) the timeline is contiguous from 1946 with exactly one open period, field sizes never shrink from ${NBA_FIELD_NEVER_SHRINKS_FROM}`);
{
  const ps = NBA_PLAYOFF_PERIODS;
  const ids = new Set(ps.map(p => p.id));
  if (ids.size !== ps.length) fail('period ids are not unique');
  if (ps.length === 0 || ps[0].from !== 1946) fail(`the first period starts in ${ps[0]?.from}, not 1946`);
  for (let i = 1; i < ps.length; i += 1) {
    const prev = ps[i - 1];
    const cur = ps[i];
    if (prev.to === null) { fail(`${prev.id} is open but ${cur.id} follows it`); continue; }
    if (cur.from !== prev.to + 1) fail(`${prev.id} ends ${prev.to} and ${cur.id} starts ${cur.from}: a hole or an overlap`);
    if (cur.to !== null && cur.to < cur.from) fail(`${cur.id} ends before it starts`);
    if (cur.from >= NBA_FIELD_NEVER_SHRINKS_FROM && prev.from >= NBA_FIELD_NEVER_SHRINKS_FROM && cur.fieldSize < prev.fieldSize) {
      fail(`${cur.id}'s field (${cur.fieldSize}) is smaller than ${prev.id}'s (${prev.fieldSize}); the NBA field has not shrunk since ${NBA_FIELD_NEVER_SHRINKS_FROM}`);
    }
  }
  for (const p of ps) {
    if (!Number.isInteger(p.fieldSize) || p.fieldSize < 2) fail(`${p.id} has a field size of ${p.fieldSize}`);
  }
  const open = ps.filter(p => p.to === null).length;
  if (open !== 1) fail(`${open} open periods, expected exactly one (the current format)`);
  let covered = 0;
  for (let y = 1946; y <= 2025; y += 1) {
    const hits = ps.filter(p => y >= p.from && (p.to === null || y <= p.to)).length;
    if (hits !== 1) fail(`season ${y} is claimed by ${hits} periods`);
    else covered += 1;
  }
  const eras = NBA_LOTTERY.eras;
  const eraIds = new Set(eras.map(e => e.id));
  if (eraIds.size !== eras.length) fail('lottery era ids are not unique');
  for (let i = 1; i < eras.length; i += 1) {
    if (eras[i].year <= eras[i - 1].year) fail(`lottery era ${eras[i].id} (${eras[i].year}) is not after ${eras[i - 1].id} (${eras[i - 1].year})`);
  }
  if (eras.length === 0 || eras[0].year !== 1966) fail(`the lottery history starts in ${eras[0]?.year}, not 1966 (the coin flip)`);
  console.log(`   ${ps.length} periods, ${covered} seasons each on exactly one row, ${seasonRange(ps[0])} through ${seasonRange(ps[ps.length - 1])}; ${eras.length} lottery eras in order`);
}

/* ---------- 2. Two publishers ---------- */
section = '2';
console.log('2) every period and every lottery era rests on at least two publishers, and the provenance is well formed');
{
  let cited = 0;
  const blocks = [
    ...NBA_PLAYOFF_PERIODS.map(p => ({ id: p.id, sources: p.sources })),
    ...NBA_LOTTERY.eras.map(e => ({ id: `lottery ${e.id}`, sources: e.sources })),
  ];
  for (const b of blocks) {
    const srcs = b.sources.map(id => sourceById(id));
    const missing = b.sources.filter((id, i) => !srcs[i]);
    if (missing.length) fail(`${b.id} cites unknown source ids: ${missing.join(', ')}`);
    const publishers = new Set(srcs.filter(Boolean).map(s => s.publisher));
    if (publishers.size < 2) fail(`${b.id} rests on ${publishers.size} publisher(s): ${[...publishers].join(', ') || 'none'}`);
    cited += srcs.filter(Boolean).length;
  }
  for (const s of NBA_PLAYOFF_SOURCES) {
    if (!/^https:\/\//.test(s.url)) fail(`${s.id} is not an https URL`);
    try { new URL(s.url); } catch { fail(`${s.id} has an unparseable URL`); }
  }
  const ids = new Set(NBA_PLAYOFF_SOURCES.map(s => s.id));
  if (ids.size !== NBA_PLAYOFF_SOURCES.length) fail('source ids are not unique');
  const everyCited = new Set(blocks.flatMap(b => b.sources));
  const unused = NBA_PLAYOFF_SOURCES.filter(s => !everyCited.has(s.id));
  if (unused.length) fail(`${unused.length} source(s) nothing cites: ${unused.map(s => s.id).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(NBA_PLAYOFF_VERIFIED_ON) || Number.isNaN(Date.parse(NBA_PLAYOFF_VERIFIED_ON))) {
    fail(`NBA_PLAYOFF_VERIFIED_ON is not a date: ${NBA_PLAYOFF_VERIFIED_ON}`);
  } else if (Date.parse(NBA_PLAYOFF_VERIFIED_ON) > Date.now()) {
    fail(`NBA_PLAYOFF_VERIFIED_ON is in the future: ${NBA_PLAYOFF_VERIFIED_ON}`);
  }
  console.log(`   ${NBA_PLAYOFF_SOURCES.length} sources across ${new Set(NBA_PLAYOFF_SOURCES.map(s => s.publisher)).size} publishers, ${cited} citations, verified ${NBA_PLAYOFF_VERIFIED_ON}`);
}

/* ---------- 3. The shipped snapshot ---------- */
section = '3';
if (CONTROL) {
  console.log('3) snapshot check skipped under a control');
} else {
  console.log('3) the shipped snapshot carries every row, the source list and the page');
  const snap = path.join(ROOT, 'public', 'nba-playoff-format-history', 'index.html');
  if (!fs.existsSync(snap)) {
    fail('snapshot not built yet: run npm run build:seo');
  } else {
    const html = fs.readFileSync(snap, 'utf8');
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    let rows = 0;
    for (const p of NBA_PLAYOFF_PERIODS) {
      if (!text.includes(p.title)) fail(`the snapshot does not carry the row "${p.title}"`);
      else rows += 1;
    }
    for (const e of NBA_LOTTERY.eras) {
      if (!text.includes(e.title)) fail(`the snapshot does not carry the lottery era "${e.title}"`);
    }
    for (const must of [NBA_PLAYOFF_VERIFIED_ON, 'Patrick Ewing']) {
      if (!text.includes(must)) fail(`the snapshot does not contain ${JSON.stringify(must)}`);
    }
    const cited = NBA_PLAYOFF_SOURCES.filter(s => html.includes(s.url)).length;
    if (cited < NBA_PLAYOFF_SOURCES.length) fail(`only ${cited} of ${NBA_PLAYOFF_SOURCES.length} source URLs reached the snapshot`);
    if (/<meta name="robots"[^>]*noindex/i.test(html)) fail('the snapshot carries a noindex');
    const words = text.split(' ').filter(Boolean).length;
    if (words < 900) fail(`the snapshot carries only ${words} words, which is a shell rather than the page`);
    console.log(`   ${rows} of ${NBA_PLAYOFF_PERIODS.length} rows, ${cited} of ${NBA_PLAYOFF_SOURCES.length} source URLs, ${words} readable words`);
  }
}

console.log('');
if (CONTROL) {
  const want = CONTROL === 'gap'
    ? { section: '1', signal: 'a hole or an overlap' }
    : { section: '2', signal: 'rests on' };
  const hits = (sectionMessages[want.section] ?? []).filter(m => m.includes(want.signal)).length;
  if (hits > 0) {
    console.log(`simNbaPlayoffFormatHistory control: green. NBA_PLAYOFF_CONTROL=${CONTROL} was reported by section ${want.section} with "${want.signal}" (${hits} finding${hits === 1 ? '' : 's'}).`);
    process.exit(0);
  }
  console.error(`simNbaPlayoffFormatHistory control: RED. NBA_PLAYOFF_CONTROL=${CONTROL} changed the code and section ${want.section} never said "${want.signal}".`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simNbaPlayoffFormatHistory: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNbaPlayoffFormatHistory: green. The timeline is whole and twice sourced.');
