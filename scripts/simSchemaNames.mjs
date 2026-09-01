/* Schema names harness: every table and column the app reads exists.

   Round 391. Twice this week a page read columns that were not there and
   nothing threw: Round 374 found /guess-nascar-driver showing six blank clue
   cards because it selected six columns the table does not have (PostgREST
   answers 400, the page rendered the empty result), and Round 381 refuted a
   Rarity Round fix by running it and getting the same 400. Reading a missing
   column is silent in the browser and invisible to tsc, because the query
   builder is typed loosely wherever a table name is dynamic. This harness
   asks the database.

   How: every `.from('<table>')` chain in src is read as code (comments and
   template noise stripped), the columns it names are collected from
   `.select('...')` and from every filter and order call that takes a column
   name, and each table's set is probed against PostgREST with
   `select=<columns>&limit=0` using the site's own anon key. A 400 is a
   missing column (the message names it) or a missing table; a 200 or a 404
   for a table the anon role cannot see are both reported. Dynamic table
   names (`source.table`) and embedded relation selects are skipped and
   counted, so the run says what it did not look at.

   Negative control (house rule: prove the check can fail):
     SIM_SCHEMA_CONTROL=ghost adds a column that does not exist to one
     table's set before probing; the run must go red on that table.

   Run: node scripts/simSchemaNames.mjs   (needs the database)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_SCHEMA_CONTROL || '';
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* column references: the first string argument of these builder calls */
const COLUMN_CALLS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'order', 'not', 'textSearch'];
const tables = new Map(); // table -> { cols: Set, files: Set, chains: number }
let dynamicChains = 0, skippedSelectParts = 0, chainsRead = 0;

for (const file of walk(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const re = /\.from\(\s*(?:'([a-zA-Z0-9_]+)'|"([a-zA-Z0-9_]+)"|([^)]*))\s*(?:as\s+[a-zA-Z]+\s*)?\)/g;
  let m;
  while ((m = re.exec(code))) {
    const table = m[1] || m[2];
    if (!table) { dynamicChains += 1; continue; }
    /* the chain runs until the statement ends or the next .from( */
    const rest = code.slice(m.index + m[0].length);
    const endAt = (() => { const semi = rest.search(/;\s*\n|\n\s*\n|\bawait\b|\.from\(/); return semi === -1 ? Math.min(rest.length, 1500) : Math.min(semi, 1500); })();
    const chain = rest.slice(0, endAt);
    chainsRead += 1;
    if (!tables.has(table)) tables.set(table, { cols: new Set(), files: new Set(), chains: 0 });
    const t = tables.get(table);
    t.files.add(rel); t.chains += 1;
    const sel = chain.match(/\.select\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/);
    if (sel) {
      const text = sel[1] ?? sel[2] ?? sel[3] ?? '';
      for (let part of text.split(',')) {
        part = part.trim();
        if (!part || part === '*') continue;
        if (/[()]/.test(part) || /\$\{/.test(part)) { skippedSelectParts += 1; continue; }
        part = part.replace(/^[a-zA-Z0-9_]+\s*:\s*/, '').replace(/::.*$/, '').replace(/->.*$/, '').trim();
        if (/^[a-zA-Z0-9_]+$/.test(part)) t.cols.add(part);
      }
    }
    for (const call of COLUMN_CALLS) {
      const cre = new RegExp('\\.' + call + '\\(\\s*\'([a-zA-Z0-9_]+)\'', 'g');
      let cm;
      while ((cm = cre.exec(chain))) t.cols.add(cm[1]);
    }
    const orRe = /\.or\(\s*`([^`]*)`|\.or\(\s*'([^']*)'/g;
    let om;
    while ((om = orRe.exec(chain))) {
      for (const seg of (om[1] ?? om[2] ?? '').split(',')) { const col = seg.trim().split('.')[0]; if (/^[a-zA-Z0-9_]+$/.test(col)) t.cols.add(col); }
    }
  }
}

if (CONTROL === 'ghost') {
  const victim = tables.get('player_market_values');
  if (!victim) abort('control cannot run: player_market_values is not among the tables read');
  victim.cols.add('column_that_does_not_exist_391');
  console.log('   NEGATIVE CONTROL ON: a ghost column added to player_market_values');
}

console.log(`1) ${tables.size} tables read across ${chainsRead} chains (${dynamicChains} dynamic table names and ${skippedSelectParts} embedded select parts not probed)`);
let probed = 0, unreadable = 0;
const list = [...tables.entries()].sort((a, b) => a[0].localeCompare(b[0]));
for (const [table, t] of list) {
  const cols = [...t.cols].sort();
  const q = cols.length ? `select=${encodeURIComponent(cols.join(','))}&limit=0` : 'select=*&limit=0';
  let res;
  try {
    res = await fetch(`${URL_}/rest/v1/${table}?${q}`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } });
  } catch (err) { abort(`\nSUPABASE UNREACHABLE (${String(err).slice(0, 80)}). NOTHING WAS CHECKED.`); }
  probed += 1;
  if (res.ok) continue;
  const body = await res.text().catch(() => '');
  if (res.status === 404 || /relation .* does not exist|Could not find the table/i.test(body)) { fail(`${table}: the table does not exist or the anon key cannot see it (HTTP ${res.status}) [${[...t.files].join(', ')}]`); continue; }
  if (res.status === 400) {
    /* name the columns: probe one at a time */
    const missing = [];
    for (const col of cols) {
      const r = await fetch(`${URL_}/rest/v1/${table}?select=${encodeURIComponent(col)}&limit=0`, { headers: { apikey: KEY, authorization: `Bearer ${KEY}` } });
      if (r.status === 400) missing.push(col);
    }
    fail(`${table}: ${missing.length ? `column(s) ${missing.join(', ')} do not exist` : `HTTP 400 on select=${cols.join(',')}`} [${[...t.files].join(', ')}]`);
    continue;
  }
  unreadable += 1;
  console.log(`   ${table}: HTTP ${res.status}, not a schema answer, not counted`);
}
console.log(`   ${probed} tables probed, ${unreadable} answered outside 200/400/404`);
const wide = list.filter(([, t]) => t.cols.size >= 8).map(([n, t]) => `${n} (${t.cols.size})`).slice(0, 6);
console.log(`   widest reads: ${wide.join(', ')}`);

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol "${CONTROL}": ${failures} failure(s) fired as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING, the check is dead`);
}
if (failures > 0) { console.error(`\nsimSchemaNames: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimSchemaNames: all green');
