/* scripts/simCollegeGridShipped.mjs  (Round 1105)

   College Grid's answer key, as it SHIPS. From Round 1105 the page no longer
   pages public.college_grid_players: two compact files generated from
   scripts/data/collegeGridPlayers.json ride in the build and the browser judges
   and searches from them. This harness reads committed files only. It makes no
   request, so runAllSims can never file it as a skip the way it files the
   database harness (scripts/simCollegeGridKey.mjs) when the database is out of
   reach.

   RECORD MODE (SIM_CGSHIPPED_RECORD=1) was run ONCE, in the round's first
   commit, over the untouched lib and the untouched key, and wrote
   scripts/data/collegeGridRecorded1105.json. It refuses to run while that file
   exists. What it wrote is the "before" every later section is graded against.

   Run: node scripts/simCollegeGridShipped.mjs
*/
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { readKeyFile } from './genCollegeGridData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = path.join(ROOT, 'scripts', 'data', 'collegeGridPlayers.json');
const RECORDED = path.join(ROOT, 'scripts', 'data', 'collegeGridRecorded1105.json');

const sha = (text) => createHash('sha256').update(text).digest('hex');
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* The thirteen rows a vandal typed into the 1977 draft list
   (docs/audits/college-tables-2026-09-30.md section 1). Record mode names them
   itself because the generator did not carry the list yet when it ran. */
const RECORD_AUDITED = [
  [280, 'Sammy Strock'], [281, 'John Bafia'], [320, 'Adam Dzierdzik'], [322, 'Kyle Ecke'], [323, 'Stephen Aragon'],
  [324, 'Ethan Ranney'], [325, 'Anthony Dzierdzik'], [326, 'Ethan Venderveen'], [327, 'Justin Venderveen'],
  [328, 'Elliot Ecke'], [329, 'Charlie Kirk'], [330, 'Benedict Fernzi'], [331, 'Jakob Cepon'],
];

/** The page's own judge and the 75 boards, bundled into a fresh folder (never a fixed temp name). */
async function loadPage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cgshipped-'));
  const entry = path.join(dir, 'entry.mjs');
  const outfile = path.join(dir, 'bundle.mjs');
  const at = (rel) => path.join(ROOT, rel).replaceAll('\\', '/');
  /* The supabase client reads localStorage when the module loads, and a static
     import is hoisted above the stub, so both are imported dynamically. */
  fs.writeFileSync(entry, [
    'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
    `export const lib = await import('${at('src/lib/collegeGrid.ts')}');`,
    `export const puzzles = (await import('${at('src/data/collegeGridPuzzles.ts')}')).collegeGridPuzzles;`,
    '',
  ].join('\n'));
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(outfile).href);
}

const CODE = { yes: 'y', no: 'n', unknown: 'u' };

/** One character per label per entry, entries in id order (code units). */
function verdictMatrix(lib, entries, skipIds = new Set()) {
  const sorted = entries.filter((e) => !skipIds.has(e.id)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const counts = { yes: 0, no: 0, unknown: 0 };
  let text = '';
  for (const e of sorted) {
    for (const l of lib.LABELS) {
      const v = lib.judgeLabel(e, l.label);
      counts[v] += 1;
      text += CODE[v];
    }
  }
  return { hash: sha(text), rows: sorted.length, counts };
}

/** The sorted distinct display names that are a yes for one cell. */
function cellYesNames(lib, entries, row, col) {
  const names = new Set();
  for (const e of entries) if (lib.judgeCollegeCell(e, row, col) === 'yes') names.add(e.name);
  return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

async function record() {
  if (fs.existsSync(RECORDED)) {
    console.error(`REFUSED: ${path.relative(ROOT, RECORDED)} already exists. The before was recorded once, on the untouched code, and is never rewritten.`);
    process.exit(2);
  }
  const { lib, puzzles } = await loadPage();
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
  const entries = lib.indexCollegeEntries(readKeyFile(file));
  const auditedIds = new Set(RECORD_AUDITED.map(([pick]) => `draft:1977-${pick}`));
  const auditedNames = new Set(RECORD_AUDITED.map(([, name]) => name));
  for (const [pick, name] of RECORD_AUDITED) {
    const e = entries.find((x) => x.id === `draft:1977-${pick}`);
    if (!e || fold(e.name) !== fold(name)) throw new Error(`the untouched key does not hold ${name} at draft:1977-${pick}; nothing was recorded`);
  }
  const full = verdictMatrix(lib, entries);
  const kept = verdictMatrix(lib, entries, auditedIds);
  const cells = {};
  const auditedAnswers = [];
  for (const p of puzzles) {
    p.rows.forEach((row, r) => p.cols.forEach((col, c) => {
      const yes = cellYesNames(lib, entries, row.label, col.label);
      for (const n of yes) if (auditedNames.has(n)) auditedAnswers.push({ board: p.id, row: row.label, col: col.label, name: n });
      const keptNames = yes.filter((n) => !auditedNames.has(n));
      cells[`${p.id}|${r}|${c}`] = { hash: sha(JSON.stringify(keptNames)), count: keptNames.length };
    }));
  }
  const keptRows = file.rows.filter((r) => !auditedIds.has(r[0]));
  const out = {
    round: 1105,
    what: 'The before of Round 1105, recorded by scripts/simCollegeGridShipped.mjs (SIM_CGSHIPPED_RECORD=1) from the untouched src/lib/collegeGrid.ts over the untouched scripts/data/collegeGridPlayers.json. Never edited by hand and never recorded twice.',
    recordedAt: execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(),
    keyRows: file.rows.length,
    keptRows: keptRows.length,
    keptRowsSha256: sha(JSON.stringify(keptRows)),
    labels: lib.LABELS.length,
    matrixFull: full,
    matrixKept: kept,
    boards: puzzles.length,
    cells,
    auditedAnswers,
  };
  fs.writeFileSync(RECORDED, JSON.stringify(out, null, 1) + '\n');
  console.log(`recorded at ${out.recordedAt}: ${full.rows} rows x ${out.labels} labels (${JSON.stringify(full.counts)}), kept ${kept.rows} rows (${JSON.stringify(kept.counts)}), ${Object.keys(cells).length} cells, ${auditedAnswers.length} audited answers: ${auditedAnswers.map((a) => `${a.name} on ${a.board}`).join(', ')}`);
  console.log(`wrote ${path.relative(ROOT, RECORDED)}`);
}

if (process.env.SIM_CGSHIPPED_RECORD === '1') {
  await record();
} else {
  console.error('simCollegeGridShipped: the graded sections land with the code they grade (Round 1105, a later commit). Only record mode exists in this first cut.');
  process.exit(1);
}
