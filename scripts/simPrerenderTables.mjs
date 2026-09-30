/**
 * Round 652 harness: every table a saved page draws reaches a crawler as a
 * table, with the rows its data has.
 *
 * WHAT WENT WRONG. The prerenderer rebuilds each saved page's body from its
 * readable blocks, and it used to capture every td and th on its own and write
 * it as a <p>. The twelve Record Books pages, /records, the four grid answer
 * archives and the five format histories all reached a crawler as runs of one
 * word lines: "2024", "Kansas City Chiefs", "San Francisco 49ers", "25-22", with
 * nothing saying they were one row. A search audit on 2026-09-19 found it. Bing
 * reads the raw HTML and sends this site twice Google's search traffic, so the
 * raw HTML is the page as far as it is concerned.
 *
 * WHAT THIS HOLDS. It reads the committed files in public/ (the ones that ship)
 * and the DATA behind each table, never the page's own helpers, so the page
 * cannot mark its own homework:
 *   1. Every table the data says a page draws reaches its saved page as a
 *      <table>, as many of them as the data gives, and no header or row of any
 *      of them is sitting in the page as a run of paragraphs, which is exactly
 *      the shape the old emitter wrote.
 *   2. Every saved table carries the rows its data has: the same number of rows,
 *      the header first, and each row's cells (or, for the format histories, its
 *      seasons) in the data's order. The Record Books tables come from
 *      src/data/recordBooks.json, the archives from src/data/gridArchive.json,
 *      and the format histories from each page's own *_PERIODS list, with the
 *      header labels its <thead> writes out.
 *   3. No page in the sitemap carries a cell outside a table, every table block
 *      holds nothing but rows, and the pages whose source draws a table from
 *      anything else are listed by name, so a new one cannot arrive unseen.
 *
 * NEGATIVE CONTROLS. PRERENDER_TABLES_CONTROL=<name> breaks one input in memory
 * and the run is green only if THAT check went red, on every route it touched,
 * and no other check did. Each refuses to run if its edit changed nothing.
 *   flatcells  (check 1) rewrites one page of each kind back into the old
 *              emitter's output: every non empty cell its own <p>, no table.
 *   droprow    (check 2) deletes the last row of the first table on one page of
 *              each kind.
 *   straycell  (check 3) puts one <td> outside any table.
 *   all        runs the three in turn.
 *
 * Run: node scripts/simPrerenderTables.mjs        (after npm run build:seo)
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const PUBLIC = path.join(ROOT, 'public');

const CONTROLS = { flatcells: 1, droprow: 2, straycell: 3 };
const CONTROL = process.env.PRERENDER_TABLES_CONTROL || '';
if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, PRERENDER_TABLES_CONTROL: name }, encoding: 'utf8' });
    const last = (r.stdout || '').trim().split('\n').pop() || (r.stderr || '').trim().split('\n').pop() || '';
    if (r.status !== 0) bad += 1;
    console.log(`  ${r.status === 0 ? 'ok  ' : 'BAD '} ${name.padEnd(10)} ${last}`);
  }
  console.log('');
  if (bad) { console.error(`simPrerenderTables controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simPrerenderTables controls: green. All ${Object.keys(CONTROLS).length} controls turned their own check red and only that one.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`PRERENDER_TABLES_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: check ${CONTROLS[CONTROL]} is SUPPOSED to go red, and only that one.\n`);

/* ---- per check bookkeeping, with the routes each finding was about ---- */
const failedChecks = new Map();
const failedRoutes = new Map();
let current = 0;
const fail = (m, route = '') => {
  failedChecks.set(current, (failedChecks.get(current) || 0) + 1);
  if (!failedRoutes.has(current)) failedRoutes.set(current, new Set());
  if (route) failedRoutes.get(current).add(route);
  if (failedChecks.get(current) <= 8) console.error('  FAIL: ' + m);
};
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };

/* line endings normalised on every read: a Windows checkout can hand these over CRLF */
const readFile = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const read = rel => readFile(path.join(ROOT, rel));
const stripComments = src => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = t => String(t)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
/** a cell's words exactly as the prerenderer's inline() leaves them */
const norm = t => String(t ?? '').replace(/\s+/g, ' ').trim();
const cellText = inner => norm(unesc(inner.replace(/<[^>]+>/g, '')));

/* ---- the routes and the saved pages ---- */
const sitemapFile = path.join(PUBLIC, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) { console.log('NO public/sitemap.xml. RUN npm run build:seo FIRST. NOT CHECKED.'); process.exit(1); }
const routes = [...new Set([...readFile(sitemapFile).matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)]
  .map(m => m[1] || '/').map(r => (r.endsWith('/') && r !== '/' ? r.slice(0, -1) : r)))];
const pageFile = route => path.join(PUBLIC, route.replace(/^\//, ''), 'index.html');
const docs = new Map();
for (const r of routes) {
  if (r === '/') continue; /* the home page is vite's template, not a snapshot */
  if (fs.existsSync(pageFile(r))) docs.set(r, readFile(pageFile(r)));
}

/** The saved body: everything from the snapshot block on, site chrome removed. */
function bodyOf(html) {
  const i = html.indexOf('<div id="dukb-snapshot">');
  if (i < 0) return '';
  return html.slice(i).replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, '');
}
const TABLE_BLOCK = /<table>\n([\s\S]*?)\n<\/table>/g;
/** Every table block in a saved body, as rows of { tag, text } cells. */
function tablesOf(html) {
  return [...bodyOf(html).matchAll(TABLE_BLOCK)].map(m => m[1].split('\n')
    .filter(l => l.startsWith('<tr>'))
    .map(l => [...l.matchAll(/<(td|th)>([\s\S]*?)<\/\1>/g)].map(c => ({ tag: c[1], text: cellText(c[2]) }))));
}

/* ---- the source: which component each route draws ---- */
const app = stripComments(read('src/App.tsx'));
const lazyFile = new Map([...app.matchAll(/const (\w+) = lazy\(\(\) => import\(["']\.\/pages\/([\w/]+)["']\)\)/g)].map(m => [m[1], `src/pages/${m[2]}.tsx`]));
const routeEl = new Map([...app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{\s*<(\w+)([^>]*?)\/>\s*\}/g)].map(m => [m[1], { comp: m[2], props: m[3] }]));
const propOf = (props, name) => (props.match(new RegExp(`\\b${name}="([^"]+)"`)) || [])[1];

/* ---- the format pages: any page whose table draws one row per *_PERIODS entry ---- */
const formatPages = [];
for (const [route, { comp }] of routeEl) {
  const file = lazyFile.get(comp);
  if (!file || !fs.existsSync(path.join(ROOT, file))) continue;
  const src = stripComments(read(file));
  if (!/<table\b/.test(src)) continue;
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'@\/lib\/(\w+)'/g)) {
    const names = m[1].split(',').map(s => s.trim());
    const periods = names.find(n => /^[A-Z_]+_PERIODS$/.test(n));
    if (!periods || !names.includes('seasonRange')) continue;
    const tbody = (src.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
    if (!new RegExp(`\\{${periods}\\.map\\(`).test(tbody)) continue;
    /* the header labels are written out in the page's own <thead>; when any of
       them is an expression there is nothing literal to hold the header to */
    const thead = (src.match(/<thead>([\s\S]*?)<\/thead>/) || [])[1] || '';
    const ths = [...thead.matchAll(/<th\b[^>]*>([^<]*)<\/th>/g)].map(t => t[1]);
    const header = ths.length && ths.every(t => norm(t) && !/[{}]/.test(t)) ? ths.map(norm) : null;
    formatPages.push({ route, comp, lib: m[2], periods, header });
  }
}

/* ---- the data, bundled from the modules the pages use ---- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simPrerenderTables-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
const src_ = rel => `${ROOT.replaceAll('\\', '/')}/${rel}`;
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const rec = await import('${src_('src/lib/records.ts')}');`,
  'export const RECORD_SECTIONS = rec.RECORD_SECTIONS;',
  ...formatPages.map((f, i) => `const f${i} = await import('${src_(`src/lib/${f.lib}.ts`)}');`),
  `export const FORMATS = [${formatPages.map((f, i) => `{ periods: f${i}.${f.periods}, seasonRange: f${i}.seasonRange }`).join(', ')}];`,
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { RECORD_SECTIONS, FORMATS } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });
const book = JSON.parse(read('src/data/recordBooks.json'));
const archive = JSON.parse(read('src/data/gridArchive.json'));

/* ---- what each data backed page must carry, table by table, in page order ----
   A table is { what, header, rows } where rows is a list of full cell lists, or
   { what, header, keys } where only the first cell of each row is known here, or
   { what, header, names } where the rows are a set named by their first cell. */
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const recHeader = def => [def.yearLabel, def.championLabel ?? 'Champion', ...def.columns.map(([, l]) => l)];
const recCells = (def, r) => [String(r.year), r.champion, ...def.columns.map(([k]) => r.extra?.[k] ?? '')].map(norm);
function recordPageTables(def) {
  const rows = book.sections[def.key] || [];
  const starts = [...new Set(rows.map(r => Math.floor(r.year / 10) * 10))].sort((a, b) => b - a);
  const tables = starts.map(d => ({
    what: `the ${d}s`, header: recHeader(def),
    rows: rows.filter(r => Math.floor(r.year / 10) * 10 === d).map(r => recCells(def, r)),
  }));
  const counts = new Map();
  for (const r of rows) counts.set(r.champion, (counts.get(r.champion) || 0) + 1);
  const multi = [...counts].filter(([, n]) => n >= 2).map(([n]) => n);
  tables.push({
    what: 'the most titles table', header: [cap(def.words.who[0]), `${cap(def.words.unit[1])} under this name`, 'Years'],
    names: new Set(multi.length ? multi : [...counts.keys()]),
  });
  return tables;
}
function indexTables() {
  return RECORD_SECTIONS.filter(def => (book.sections[def.key] || []).length).map(def => {
    const rows = book.sections[def.key];
    const newest = new Set([...new Set(rows.map(r => r.year))].sort((a, b) => b - a).slice(0, 10));
    return { what: `${def.key}, newest ten`, header: recHeader(def), rows: rows.filter(r => newest.has(r.year)).map(r => recCells(def, r)) };
  });
}
const archiveTables = sport => archive.sports[sport].boards.map(b => ({
  what: `the ${b.date} board`, header: ['Crossing', 'Valid players', 'Rarest answers'],
  rows: b.cells.map(c => [`${c.row} and ${c.col}`, String(c.total), c.answers.join(', ')].map(norm)),
}));

/** route -> { kind, tables } for every page whose tables come from committed data */
const backed = new Map();
for (const def of RECORD_SECTIONS) if (def.slug) backed.set(`/records/${def.slug}`, { kind: 'record page', tables: recordPageTables(def) });
backed.set('/records', { kind: 'records index', tables: indexTables() });
for (const [key, s] of Object.entries(archive.sports)) backed.set(`${s.game}/archive`, { kind: 'grid archive', tables: archiveTables(key) });
formatPages.forEach((f, i) => backed.set(f.route, {
  kind: 'format history',
  tables: [{ what: 'the format timeline', header: f.header, keys: FORMATS[i].periods.map(p => norm(FORMATS[i].seasonRange(p))) }],
}));

/* ---- the controls, on copies in memory: one route of each kind ---- */
const victims = [...new Set([...backed].map(([r, b]) => b.kind))].map(kind => [...backed].find(([, b]) => b.kind === kind)[0]);
/** the old emitter: every cell with words its own <p>, the table gone */
const flatten = html => html.replace(TABLE_BLOCK, (m0, inner) => inner.split('\n')
  .filter(l => l.startsWith('<tr>'))
  .flatMap(l => [...l.matchAll(/<(td|th)>([\s\S]*?)<\/\1>/g)].filter(c => cellText(c[2])).map(c => `<p>${c[2]}</p>`))
  .join('\n'));
if (CONTROL === 'flatcells' || CONTROL === 'droprow') {
  for (const r of victims) {
    const before = docs.get(r);
    if (!before) refuse(`${r} has no saved page to edit`);
    let after;
    if (CONTROL === 'flatcells') after = flatten(before);
    else {
      const m = before.match(/<table>\n[\s\S]*?\n<\/table>/);
      if (!m) refuse(`${r} carries no table to drop a row from`);
      const rowLines = m[0].split('\n').filter(l => l.startsWith('<tr>'));
      if (rowLines.length < 2) refuse(`the first table on ${r} has no data row to drop`);
      const cut = m[0].replace(`\n${rowLines[rowLines.length - 1]}`, '');
      after = before.replace(m[0], cut);
    }
    if (after === before) refuse(`${r} came out unchanged, so this control would prove nothing`);
    if (CONTROL === 'flatcells' && /<table>/.test(bodyOf(after))) refuse(`${r} still carries a table after flattening`);
    docs.set(r, after);
  }
  console.log(`   ${CONTROL} applied in memory to ${victims.join(', ')}\n`);
}
if (CONTROL === 'straycell') {
  const r = victims[0];
  const before = docs.get(r);
  const after = before.replace('<div id="dukb-snapshot">\n', '<div id="dukb-snapshot">\n<td>A cell with no table</td>\n');
  if (after === before) refuse(`${r} has no snapshot block to put a cell into`);
  docs.set(r, after);
  console.log(`   straycell applied in memory to ${r}\n`);
}

/* ======================================================================= */
current = 1;
console.log('1) every table the data draws reaches its saved page as a table, never as a run of paragraphs');
/** route -> the saved tables, kept for check 2 only when the count matched */
const paired = new Map();
{
  let pages = 0, tables = 0, flatRuns = 0;
  for (const [route, { tables: want }] of backed) {
    const html = docs.get(route);
    if (!html) { fail(`${route} has no saved page in public/, so a crawler gets the fallback`, route); continue; }
    pages += 1;
    const got = tablesOf(html);
    if (got.length !== want.length) {
      fail(`${route}: the saved page carries ${got.length} table(s) and the data draws ${want.length}`, route);
    } else {
      paired.set(route, got);
      tables += got.length;
    }
    /* the old emitter's shape, read directly: a header, or a row, whose cells sit
       in the page as consecutive paragraphs. Empty cells were never written as
       paragraphs, so they are left out of the run, and a run needs two cells. */
    const body = '\n' + bodyOf(html).replace(TABLE_BLOCK, '') + '\n';
    let here = 0;
    for (const t of want) {
      for (const cells of [t.header, ...(t.rows || [])]) {
        const words = (cells || []).filter(Boolean);
        if (words.length < 2) continue;
        if (body.includes('\n' + words.map(w => `<p>${esc(w)}</p>`).join('\n') + '\n')) here += 1;
      }
    }
    if (here) { flatRuns += here; fail(`${route}: ${here} header(s) or row(s) of its tables sit in the page as runs of paragraphs, one cell each`, route); }
  }
  console.log(`   ${pages} data backed pages, ${tables} tables paired with their data, ${flatRuns} rows written as paragraphs`);
  console.log(`   ${formatPages.length} format pages found in source, ${formatPages.filter(f => f.header).length} with a literal header to hold them to`);
}

/* ======================================================================= */
current = 2;
console.log('2) every saved table carries the rows its data has, in order');
{
  /* A page whose table count did not match is check 1's finding; pairing the
     wrong tables here would only repeat it in a noisier form. */
  let rowsChecked = 0, tablesOk = 0;
  for (const [route, got] of paired) {
    const { tables: want } = backed.get(route);
    want.forEach((w, i) => {
      const saved = got[i];
      const before = failedChecks.get(2) || 0;
      const head = saved[0] || [];
      if (!head.length || head.some(c => c.tag !== 'th')) fail(`${route}, ${w.what}: the first row is not a header of <th> cells`, route);
      else if (w.header && JSON.stringify(head.map(c => c.text)) !== JSON.stringify(w.header.map(norm))) fail(`${route}, ${w.what}: the header reads ${JSON.stringify(head.map(c => c.text))}, the page draws ${JSON.stringify(w.header)}`, route);
      const data = saved.slice(1);
      const wantN = w.rows ? w.rows.length : w.keys ? w.keys.length : w.names.size;
      if (data.length !== wantN) fail(`${route}, ${w.what}: ${data.length} rows saved, the data has ${wantN}`, route);
      else if (w.rows) {
        const bad = w.rows.findIndex((cells, j) => JSON.stringify(data[j].map(c => c.text)) !== JSON.stringify(cells));
        if (bad >= 0) fail(`${route}, ${w.what}: row ${bad + 1} is ${JSON.stringify(data[bad].map(c => c.text))}, the data says ${JSON.stringify(w.rows[bad])}`, route);
      } else if (w.keys) {
        const bad = w.keys.findIndex((k, j) => data[j][0]?.text !== k);
        if (bad >= 0) fail(`${route}, ${w.what}: row ${bad + 1} starts ${JSON.stringify(data[bad][0]?.text)}, the data says ${JSON.stringify(w.keys[bad])}`, route);
      } else {
        const names = new Set(data.map(r => r[0]?.text));
        const missing = [...w.names].filter(n => !names.has(norm(n)));
        if (missing.length) fail(`${route}, ${w.what}: ${missing.length} name(s) the rows give are not in it, first ${missing[0]}`, route);
      }
      rowsChecked += data.length;
      if ((failedChecks.get(2) || 0) === before) tablesOk += 1;
    });
  }
  /* a check that compared nothing has proved nothing */
  if (rowsChecked === 0) fail('no saved table was compared with its data at all');
  console.log(`   ${tablesOk} tables match their data, ${rowsChecked} saved rows compared`);
}

/* ======================================================================= */
current = 3;
console.log('3) no cell outside a table anywhere, tables hold only rows, and every page drawing a table is accounted for');
{
  let stray = 0, badBlocks = 0;
  for (const [route, html] of docs) {
    const body = bodyOf(html);
    const outside = body.replace(TABLE_BLOCK, '');
    const loose = outside.match(/<(td|th|tr|table)\b[^>]*>/g) || [];
    if (loose.length) { stray += loose.length; fail(`${route}: ${loose.length} table tag(s) sit outside a complete table block, first ${loose[0]}`, route); }
    for (const m of body.matchAll(TABLE_BLOCK)) {
      const odd = m[1].split('\n').filter(l => !/^<tr>(?:<(td|th)>[\s\S]*?<\/\1>)+<\/tr>$/.test(l) && !/^<caption>[\s\S]*<\/caption>$/.test(l));
      if (odd.length) { badBlocks += 1; fail(`${route}: a table block holds something other than rows: ${JSON.stringify(odd[0].slice(0, 80))}`, route); }
    }
  }
  /* which routes draw a table, from the source: the page itself or a component
     it imports. The data backed ones must be among them, or this derivation is
     broken; the rest are listed, because their tables come from play or from
     the database and there is no committed data here to hold them to. */
  const drawsTable = new Map();
  const rendersTable = rel => fs.existsSync(path.join(ROOT, rel)) && /<table\b/.test(stripComments(read(rel)));
  for (const [route, { comp }] of routeEl) {
    const file = lazyFile.get(comp);
    if (!file || !fs.existsSync(path.join(ROOT, file)) || !routes.includes(route)) continue;
    const src = stripComments(read(file));
    const via = [...src.matchAll(/from\s*'@\/(components\/[\w/-]+)'/g)].map(m => `src/${m[1]}.tsx`).filter(rendersTable);
    if (/<table\b/.test(src) || via.length) drawsTable.set(route, docs.has(route) ? tablesOf(docs.get(route)).length : 0);
  }
  for (const route of backed.keys()) if (!drawsTable.has(route)) fail(`${route} is data backed but no table was found in its source, so the source scan is broken`, route);
  const others = [...drawsTable].filter(([r]) => !backed.has(r));
  console.log(`   ${docs.size} saved pages, ${stray} loose table tags, ${badBlocks} malformed table blocks`);
  console.log(`   ${drawsTable.size} sitemap routes draw a table in source, ${backed.size} of them from committed data`);
  for (const [r, n] of others) console.log(`   not data backed: ${r} (${n} table${n === 1 ? '' : 's'} saved; drawn from play or the database, reported not asserted)`);
}

/* ======================================================================= */
console.log('');
const red = [...failedChecks.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const touched = CONTROL === 'straycell' ? [victims[0]] : victims;
  const hit = failedRoutes.get(want) || new Set();
  const missed = touched.filter(r => !hit.has(r));
  if (red.length === 1 && red[0] === want && !missed.length) {
    console.log(`simPrerenderTables control ${CONTROL}: green. Check ${want} went red on all ${touched.length} route(s) it touched (${failedChecks.get(want)} finding${failedChecks.get(want) === 1 ? '' : 's'}) and no other check did.`);
    process.exit(0);
  }
  console.error(`simPrerenderTables control ${CONTROL}: RED. Expected only check ${want} to fail, on ${touched.join(', ')}; got check(s) ${red.join(', ') || 'none'}${missed.length ? `, and nothing on ${missed.join(', ')}` : ''}.`);
  process.exit(1);
}
if (red.length) {
  const n = [...failedChecks.values()].reduce((a, b) => a + b, 0);
  console.error(`simPrerenderTables: ${n} failure${n === 1 ? '' : 's'} in check${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  process.exit(1);
}
console.log(`simPrerenderTables: green. ${backed.size} data backed pages carry every table as a table, row for row.`);
