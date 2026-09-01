/**
 * Round 372: the Record Books actually ships its records.
 *
 * WHAT WAS WRONG. /records served a crawler 13 section headings, 25 lines of
 * intro prose and ZERO champion names. No Yankees, no Patriots, no Celtics, no
 * Lakers, on a reference page whose entire value is its champion tables.
 *
 * IT WAS NOT A PRERENDER BUG, and this harness exists partly to keep that
 * straight for whoever reads it next. prerender.mjs leaves every Supabase
 * request hanging on purpose, because a fulfilled request bakes today's data
 * into a file that outlives today. That rule is right. The mistake was treating
 * champion tables as live data: they are historical facts that move about once
 * a year, so they belong in a committed file a build regenerates. An earlier
 * pass nearly "fixed" the prerenderer instead, which would have broken a
 * deliberate policy to paper over a page's design.
 *
 * WHAT THIS HOLDS:
 *   1. The committed file carries every section the page defines, with enough
 *      rows in each that a broken read cannot pass as a short sport.
 *   2. The file agrees with the live database. It is generated, so it can go
 *      stale silently; this compares a sample against the tables themselves.
 *   3. THE SNAPSHOT CONTAINS REAL CHAMPION NAMES. This is the check that would
 *      have caught the original bug, and the only one that reads the OUTPUT.
 *      Every other check here would have passed happily while the page served
 *      spinners, because the DATA was always fine. It was the delivery that was
 *      broken.
 *
 * NEGATIVE CONTROL: RECORDS_CONTROL=spinner strips every champion name out of
 * an in memory copy of the snapshot, reproducing exactly what the page used to
 * serve, and section 3 must go red.
 *
 * Run: node scripts/simRecordBooks.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RECORDS_CONTROL || '';
if (CONTROL && CONTROL !== 'spinner') {
  console.error(`RECORDS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'recordBooks.json'), 'utf8'));

const ENTRY = path.join(os.tmpdir(), 'recBooksEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'recBooks.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const m = await import('${rel('src/lib/records.ts')}');`,
  'export const RECORD_SECTIONS = m.RECORD_SECTIONS;',
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { RECORD_SECTIONS } = await import(pathToFileURL(BUNDLE).href);

console.log('1) the committed file carries every section the page defines');
{
  const MIN_ROWS = 10;
  let total = 0;
  for (const def of RECORD_SECTIONS) {
    const rows = book.sections[def.key];
    if (!rows) { fail(`the page defines a "${def.key}" section and the file has no rows for it, so that table renders as an error`); continue; }
    total += rows.length;
    if (rows.length < MIN_ROWS) fail(`${def.key} carries only ${rows.length} rows, below the floor of ${MIN_ROWS}`);
    const bad = rows.filter(r => !r.champion || !String(r.champion).trim() || !Number.isFinite(Number(r.year)));
    if (bad.length) fail(`${def.key} has ${bad.length} rows with no champion or no year`);
  }
  console.log(`   ${RECORD_SECTIONS.length} sections, ${total} rows`);
  if (Object.keys(book.sections).length !== RECORD_SECTIONS.length) {
    fail(`the file holds ${Object.keys(book.sections).length} sections and the page defines ${RECORD_SECTIONS.length}`);
  }
}

console.log('2) the committed file still agrees with the live database');
{
  /* Generated files go stale silently, which is the cost of committing them.
     Re-fetch a sample through the page's OWN fetchers and compare. */
  const sample = RECORD_SECTIONS.slice(0, 4);
  let checked = 0;
  for (const def of sample) {
    let live = null;
    for (let attempt = 0; attempt <= 2 && !live; attempt++) {
      if (attempt) await new Promise(r => setTimeout(r, 600 * attempt));
      try { live = await def.fetch(); } catch { live = null; }
      if (live && live.length === 0) live = null;
    }
    if (!live) { console.log(`   ${def.key}: the database did not answer, skipped`); continue; }
    checked += 1;
    const committed = book.sections[def.key] || [];
    if (live.length !== committed.length) {
      fail(`${def.key}: the database has ${live.length} rows and the committed file has ${committed.length}, so the file is stale. Re-run scripts/genRecordBooks.mjs.`);
      continue;
    }
    const liveNewest = [...live].sort((a, b) => b.year - a.year)[0];
    const fileNewest = committed[0];
    if (String(liveNewest.champion) !== String(fileNewest.champion) || Number(liveNewest.year) !== Number(fileNewest.year)) {
      fail(`${def.key}: newest row is ${liveNewest.year} ${liveNewest.champion} live and ${fileNewest.year} ${fileNewest.champion} in the file`);
    }
  }
  console.log(`   ${checked} sections compared against the live tables`);
  if (checked === 0) fail('no section could be compared, so this section is not really testing anything');
}

console.log('3) the snapshot a crawler receives contains real champion names');
{
  const file = path.join(ROOT, 'public', 'records', 'index.html');
  if (!fs.existsSync(file)) {
    fail('there is no prerendered snapshot for /records at all');
  } else {
    let doc = fs.readFileSync(file, 'utf8');
    const wanted = [];
    for (const def of RECORD_SECTIONS) {
      const rows = book.sections[def.key] || [];
      /* The page renders the newest 12 of each section before the show all
         toggle, and the prerenderer captures only what is visible, so check
         inside that window rather than against every row. */
      for (const r of rows.slice(0, 6)) wanted.push({ section: def.key, champion: String(r.champion) });
    }

    if (CONTROL === 'spinner') {
      const before = doc.length;
      for (const w of wanted) doc = doc.split(w.champion).join('a spinner');
      if (doc.length === before) { console.error('control cannot run: no champion name was in the snapshot to remove'); process.exit(1); }
      console.log('   NEGATIVE CONTROL ON: every champion name stripped from the snapshot, which is what the page used to serve, section 3 must go red');
    }

    const missing = wanted.filter(w => !doc.includes(w.champion));
    const bySection = new Map();
    for (const m of missing) bySection.set(m.section, (bySection.get(m.section) || 0) + 1);
    console.log(`   ${wanted.length - missing.length} of ${wanted.length} sampled champions reach the snapshot`);
    for (const [sec, n] of [...bySection].slice(0, 4)) {
      fail(`${sec}: ${n} of its newest champions are absent from the snapshot, so a crawler receives a heading with no table under it`);
    }
  }
}

console.log('');
if (CONTROL === 'spinner') {
  if (failures > 0) { console.log(`simRecordBooks control: green. A page serving no champion names was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simRecordBooks control: RED. Every champion name was removed and nothing noticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simRecordBooks: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simRecordBooks: green. The tables are committed, current, and reaching a crawler.');
