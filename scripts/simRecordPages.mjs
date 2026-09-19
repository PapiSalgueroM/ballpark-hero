/**
 * Round 649 harness: the per competition Record Books pages say what the data
 * says, and reach a crawler saying it.
 *
 * WHAT CHANGED. /records used to be one address holding twelve full champion
 * tables. Round 649 gave each competition its own page at /records/<slug>
 * (src/pages/RecordPage.tsx, one component for all twelve) with keyword
 * headings, a year by year list split into decades, and a most titles table
 * COUNTED from the rows at render. /records became the index.
 *
 * WHAT THIS HOLDS, and it reads the DATA and the SAVED FILES, never the page's
 * own helpers, so the page cannot mark its own homework:
 *   1. Registration. Every section in RECORD_SECTIONS has a slug, and that slug
 *      has a route in App.tsx, a row in genSitemap.mjs, an entry in
 *      public/sitemap.xml, a line in pageSchema.ts's type table, and a saved
 *      page in public/records/<slug>/index.html. Nothing under /records/ is
 *      registered that is not a section.
 *   2. Every row. Each decade block of each saved page holds exactly the rows
 *      recordBooks.json has for that decade, cell for cell, in order, and
 *      nothing else. So a missing row, an invented row and a row filed under
 *      the wrong decade all fail.
 *   3. The most titles table. Recounted here from the JSON: one per row for the
 *      name on it, every name with two or more listed, ties never split, counts
 *      and years exact, and the "won it once" line agreeing with the rest.
 *   4. The derived facts. Seasons listed, first and latest, how many different
 *      winners, who is out in front, and the split and empty years named in the
 *      counting note, all recomputed from the JSON.
 *   5. Structure. Exactly one h1 and it is the search phrase, the h2s the page
 *      promises, and one h3 per decade the data actually has, no more, no fewer.
 *   6. The head. A title under 60 characters ending in the brand, a description
 *      of 120 to 160 characters naming the span the rows cover, the page's own
 *      canonical, and a three step BreadcrumbList that ends at that canonical.
 *   7. Links. /records links all twelve pages, and each page links the other
 *      eleven and /records.
 *   8. The index is an index. /records shows each section's newest ten seasons
 *      (a split season kept whole) and not the eleventh, so the full tables
 *      live in one place only.
 *   9. Source links. No link in src still points at an old /records#key anchor,
 *      and every /records/<slug> written in src names a real section.
 *
 * NEGATIVE CONTROLS. RECORD_PAGES_CONTROL=<name> breaks one input, in memory,
 * for the one check it targets, and the run is green only if THAT check went
 * red and every other check stayed green. Each control refuses to run if the
 * thing it removes is not there, because a control that changes nothing proves
 * nothing. RECORD_PAGES_CONTROL=all runs every control in turn and fails if
 * any of them did not behave.
 *
 * Run: node scripts/simRecordPages.mjs        (after npm run build:seo)
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const SITE = 'https://douknowball.com';

/* control name -> the check it must turn red, and nothing else */
const CONTROLS = {
  noslug: 1, noroute: 1, nositemap: 1, nopage: 1,
  droprow: 2,
  miscount: 3,
  wrongfact: 4,
  twoh1: 5, nodecade: 5,
  longtitle: 6, shortdesc: 6,
  nolink: 7,
  fulltable: 8,
  hashlink: 9,
};
const CONTROL = process.env.RECORD_PAGES_CONTROL || '';

if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, RECORD_PAGES_CONTROL: name }, encoding: 'utf8' });
    const last = (r.stdout || '').trim().split('\n').pop() || (r.stderr || '').trim().split('\n').pop() || '';
    const ok = r.status === 0;
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(10)} ${last}`);
  }
  console.log('');
  if (bad) { console.error(`simRecordPages controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simRecordPages controls: green. All ${Object.keys(CONTROLS).length} controls turned their own check red and only that one.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`RECORD_PAGES_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: check ${CONTROLS[CONTROL]} is SUPPOSED to go red, and only that one.\n`);

/* ---- per check bookkeeping ---- */
const failedChecks = new Map();
let current = 0;
const fail = m => {
  failedChecks.set(current, (failedChecks.get(current) || 0) + 1);
  if (failedChecks.get(current) <= 6) console.error('  FAIL: ' + m);
};
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };

/* ---- the sections, bundled from the source the page uses ---- */
const TMP = path.join(os.tmpdir(), `simRecordPages-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const m = await import('${ROOT.replaceAll('\\', '/')}/src/lib/records.ts');`,
  'export const RECORD_SECTIONS = m.RECORD_SECTIONS;',
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
const { RECORD_SECTIONS } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(TMP, { recursive: true, force: true });

const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/recordBooks.json'), 'utf8'));
/* line endings normalised on every read: a Windows checkout can hand these files over with CRLF */
const readFile = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const read = rel => readFile(path.join(ROOT, rel));

/* ---- helpers written here, not imported from the page ---- */
const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = t => String(t)
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const join = xs => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const pageFile = route => path.join(ROOT, 'public', route.replace(/^\//, ''), 'index.html');

/** The readable body of a saved page, one block per line, site chrome removed. */
function bodyLines(html) {
  const i = html.indexOf('<div id="dukb-snapshot">');
  if (i < 0) return [];
  return html.slice(i)
    .replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^<(h[1-4]|p|li|a)\b/.test(l));
}
const textOf = line => unesc(line.replace(/<[^>]+>/g, '')).trim();
const tagOf = line => (line.match(/^<([a-z0-9]+)/) || [])[1];

/** Everything between the h2 whose text is `heading` and the next h2. */
function sectionAfter(lines, heading) {
  const at = lines.findIndex(l => tagOf(l) === 'h2' && textOf(l) === heading);
  if (at < 0) return null;
  let end = lines.length;
  for (let j = at + 1; j < lines.length; j++) if (tagOf(lines[j]) === 'h2') { end = j; break; }
  return lines.slice(at + 1, end);
}

const rowsOf = def => book.sections[def.key] || [];
const cellsOf = (def, r) => [String(r.year), r.champion, ...def.columns.map(([k]) => r.extra[k]).filter(v => v != null && String(v).trim() !== '')]
  .map(c => `<p>${esc(c)}</p>`);
const headerOf = def => [def.yearLabel, def.championLabel ?? 'Champion', ...def.columns.map(([, l]) => l)].map(c => `<p>${esc(c)}</p>`);

/** The recount: one per row for the name on it. */
function recount(rows) {
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.champion)) by.set(r.champion, []);
    by.get(r.champion).push(r.year);
  }
  return by;
}
function spanFacts(rows) {
  const years = [...new Set(rows.map(r => r.year))].sort((a, b) => a - b);
  const first = years[0], latest = years[years.length - 1];
  const perYear = new Map();
  for (const r of rows) perYear.set(r.year, (perYear.get(r.year) || 0) + 1);
  const gaps = [];
  for (let y = first; y <= latest; y++) if (!perYear.has(y)) gaps.push(y);
  return {
    years, first, latest,
    firstNames: rows.filter(r => r.year === first).map(r => r.champion),
    latestNames: rows.filter(r => r.year === latest).map(r => r.champion),
    splits: years.filter(y => perYear.get(y) > 1),
    gaps,
  };
}
/** every 4 digit year in a phrase, with "A to B" expanded */
function yearsIn(phrase) {
  const out = [];
  const re = /(\d{4})(?: to (\d{4}))?/g;
  let m;
  while ((m = re.exec(phrase)) !== null) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    for (let y = a; y <= b; y++) out.push(y);
  }
  return out;
}

/* ---- the saved pages, read once; controls edit these copies only ---- */
const saved = new Map();
for (const def of RECORD_SECTIONS) {
  if (!def.slug) continue;
  const f = pageFile(`/records/${def.slug}`);
  if (fs.existsSync(f)) saved.set(def.slug, readFile(f));
}
const indexFile = pageFile('/records');
const indexHtml = fs.existsSync(indexFile) ? readFile(indexFile) : '';

const first = RECORD_SECTIONS[0];
const firstSlug = first?.slug;
const mutateSaved = (slug, from, to, why) => {
  const html = saved.get(slug);
  if (!html || !html.includes(from)) refuse(`${why}: ${JSON.stringify(from.slice(0, 60))} is not in the saved page for ${slug}`);
  return html.replace(from, to);
};

/* ======================================================================= */
current = 1;
console.log(`1) every section has a slug, a route, a sitemap row, a type and a saved page`);
{
  let sections = RECORD_SECTIONS.map(s => ({ key: s.key, slug: s.slug }));
  let app = read('src/App.tsx');
  let sitemap = read('public/sitemap.xml');
  const gen = read('scripts/genSitemap.mjs');
  const schema = read('src/lib/pageSchema.ts');
  const pageExists = slug => fs.existsSync(pageFile(`/records/${slug}`)) && /id="dukb-snapshot"/.test(readFile(pageFile(`/records/${slug}`)));
  let exists = pageExists;

  if (CONTROL === 'noslug') {
    if (!sections[0].slug) refuse('the first section has no slug to blank');
    sections = sections.map((s, i) => (i === 0 ? { ...s, slug: '' } : s));
  }
  if (CONTROL === 'noroute') {
    const line = new RegExp(`<Route\\s+path="/records/${firstSlug}"[^\\n]*\\n`);
    if (!line.test(app)) refuse(`App.tsx has no route line for /records/${firstSlug}`);
    app = app.replace(line, '');
  }
  if (CONTROL === 'nositemap') {
    const loc = `<loc>${SITE}/records/${firstSlug}</loc>`;
    if (!sitemap.includes(loc)) refuse(`public/sitemap.xml has no ${loc}`);
    sitemap = sitemap.replace(loc, '<loc>https://douknowball.com/removed-by-control</loc>');
  }
  if (CONTROL === 'nopage') {
    if (!pageExists(firstSlug)) refuse(`there is no saved page for ${firstSlug} to hide`);
    exists = slug => slug !== firstSlug && pageExists(slug);
  }

  const slugs = sections.map(s => s.slug);
  for (const s of sections) {
    if (!s.slug) { fail(`section ${s.key} has no slug, so it has no page of its own`); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) fail(`section ${s.key} has slug ${JSON.stringify(s.slug)}, which is not lowercase words joined by hyphens`);
  }
  const dupes = slugs.filter((x, i) => x && slugs.indexOf(x) !== i);
  if (dupes.length) fail(`two sections share the slug ${dupes[0]}`);
  const want = new Set(slugs.filter(Boolean));

  const routes = new Map();
  for (const m of app.matchAll(/<Route\s+path="\/records\/([^"]+)"\s+element=\{\s*<RecordPage\s+slug="([^"]+)"\s*\/>\s*\}/g)) routes.set(m[1], m[2]);
  const anyRecordRoute = [...app.matchAll(/<Route\s+path="\/records\/([^"]+)"/g)].map(m => m[1]);
  for (const r of anyRecordRoute) if (!routes.has(r)) fail(`App.tsx routes /records/${r} to something other than RecordPage`);
  const locs = new Set([...sitemap.matchAll(/<loc>https:\/\/douknowball\.com\/records\/([^<]+)<\/loc>/g)].map(m => m[1]));
  const genRows = new Set([...gen.matchAll(/p:\s*'\/records\/([^']+)'/g)].map(m => m[1]));
  const typed = new Set([...schema.matchAll(/'\/records\/([a-z0-9-]+)':\s*'([A-Za-z]+)'/g)].map(m => m[1]));

  for (const slug of want) {
    if (!routes.has(slug)) fail(`/records/${slug} has no route in App.tsx`);
    else if (routes.get(slug) !== slug) fail(`/records/${slug} is routed to RecordPage slug="${routes.get(slug)}", so it draws the wrong competition`);
    if (!genRows.has(slug)) fail(`/records/${slug} is not in genSitemap.mjs, so the next build drops it from the sitemap and the prerenderer`);
    if (!locs.has(slug)) fail(`/records/${slug} is not in public/sitemap.xml`);
    if (!typed.has(slug)) fail(`/records/${slug} is not in the type table in src/lib/pageSchema.ts`);
    if (!exists(slug)) fail(`/records/${slug} has no saved page with a snapshot block, so a crawler gets the fallback`);
  }
  for (const [name, set] of [['App.tsx', new Set(routes.keys())], ['genSitemap.mjs', genRows], ['public/sitemap.xml', locs], ['pageSchema.ts', typed]]) {
    for (const slug of set) if (!want.has(slug)) fail(`${name} registers /records/${slug}, which is no section's slug`);
  }
  console.log(`   ${want.size} slugs; ${routes.size} routes, ${genRows.size} generator rows, ${locs.size} sitemap entries, ${typed.size} typed, ${[...want].filter(s => exists(s)).length} saved pages`);
}

/* ======================================================================= */
current = 2;
console.log('2) every row in recordBooks.json is in its saved page, under its own decade, and nothing else is');
{
  let rowsChecked = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const rows = rowsOf(def);
    if (!rows.length) { fail(`${def.key}: recordBooks.json has no rows`); continue; }
    if (CONTROL === 'droprow' && def === first) {
      const cell = `<p>${esc(rows[rows.length - 1].champion)}</p>\n`;
      const lastYear = `<p>${rows[rows.length - 1].year}</p>\n${cell}`;
      html = mutateSaved(def.slug, lastYear, `<p>${rows[rows.length - 1].year}</p>\n`, 'droprow');
    }
    const lines = bodyLines(html);
    const every = sectionAfter(lines, `Every ${def.words.one}, year by year`);
    if (!every) { fail(`${def.key}: no "Every ${def.words.one}, year by year" section in the saved page`); continue; }
    /* the blocks, keyed by their h3 */
    const blocks = new Map();
    let key = null;
    for (const l of every) {
      if (tagOf(l) === 'h3') { key = textOf(l); blocks.set(key, []); continue; }
      if (key && tagOf(l) === 'p') blocks.get(key).push(l);
    }
    const byDecade = new Map();
    for (const r of rows) {
      const d = Math.floor(r.year / 10) * 10;
      if (!byDecade.has(d)) byDecade.set(d, []);
      byDecade.get(d).push(r);
    }
    for (const [d, list] of byDecade) {
      const h3 = `${cap(def.words.many)} in the ${d}s`;
      const got = blocks.get(h3);
      if (!got) { fail(`${def.key}: no block for the ${d}s, so ${list.length} rows are missing`); continue; }
      const expected = [...headerOf(def), ...list.flatMap(r => cellsOf(def, r))];
      const n = Math.max(expected.length, got.length);
      for (let i = 0; i < n; i++) {
        if (expected[i] !== got[i]) {
          fail(`${def.key} ${d}s: cell ${i} is ${JSON.stringify(got[i] ?? '(nothing)')} and the data says ${JSON.stringify(expected[i] ?? '(nothing)')}`);
          break;
        }
      }
      rowsChecked += list.length;
    }
  }
  const total = RECORD_SECTIONS.reduce((n, d) => n + rowsOf(d).length, 0);
  console.log(`   ${rowsChecked} of ${total} rows checked cell for cell`);
}

/* ======================================================================= */
current = 3;
console.log('3) the most titles table matches a recount of the JSON');
{
  let tables = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const counts = recount(rowsOf(def));
    const all = [...counts.entries()].map(([name, years]) => ({ name, count: years.length, years: [...years].sort((a, b) => a - b) }));
    const multi = all.filter(x => x.count >= 2);
    const listed = multi.length ? multi : all;
    const once = multi.length ? all.length - multi.length : 0;
    if (CONTROL === 'miscount' && def === first) {
      const top = listed.sort((a, b) => b.count - a.count)[0];
      html = mutateSaved(def.slug, `<p>${esc(top.name)}</p>\n<p>${top.count}</p>`, `<p>${esc(top.name)}</p>\n<p>${top.count + 1}</p>`, 'miscount');
    }
    const sec = sectionAfter(bodyLines(html), def.words.most);
    if (!sec) { fail(`${def.key}: no "${def.words.most}" section`); continue; }
    const ps = sec.filter(l => tagOf(l) === 'p');
    const head = [cap(def.words.who[0]), cap(def.words.unit[1]), 'Years'].map(c => `<p>${esc(c)}</p>`);
    const h = ps.findIndex((l, i) => l === head[0] && ps[i + 1] === head[1] && ps[i + 2] === head[2]);
    if (h < 0) { fail(`${def.key}: the most titles table has no ${head.map(textOf).join(' / ')} header`); continue; }
    const got = new Map();
    let prev = Infinity, i = h + 3, ordered = true;
    while (i + 2 < ps.length && /^\d+$/.test(textOf(ps[i + 1])) && /^\d{4}(, \d{4})*$/.test(textOf(ps[i + 2]))) {
      const name = textOf(ps[i]), n = Number(textOf(ps[i + 1])), yrs = textOf(ps[i + 2]);
      if (n > prev) ordered = false;
      prev = n;
      got.set(name, { n, yrs });
      i += 3;
    }
    if (!ordered) fail(`${def.key}: the most titles table is not in order, most first`);
    for (const x of listed) {
      const g = got.get(x.name);
      if (!g) { fail(`${def.key}: ${x.name} has ${x.count} and is missing from the table`); continue; }
      if (g.n !== x.count) fail(`${def.key}: ${x.name} shows ${g.n}, the rows give ${x.count}`);
      if (g.yrs !== x.years.join(', ')) fail(`${def.key}: ${x.name} shows years ${g.yrs}, the rows give ${x.years.join(', ')}`);
    }
    for (const name of got.keys()) if (!listed.some(x => x.name === name)) fail(`${def.key}: ${name} is in the table and should not be`);
    const onceLine = ps.map(textOf).find(t => /won it once\.$/.test(t));
    const onceGot = onceLine ? Number((onceLine.match(/^(\d+) more /) || [])[1]) : 0;
    if (onceGot !== once) fail(`${def.key}: the page says ${onceGot} won it once, the rows give ${once}`);
    tables += 1;
  }
  console.log(`   ${tables} of ${RECORD_SECTIONS.length} tables match the recount`);
}

/* ======================================================================= */
current = 4;
console.log('4) the derived facts are the ones the rows give');
{
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const rows = rowsOf(def);
    const f = spanFacts(rows);
    if (CONTROL === 'wrongfact' && def === first) {
      html = mutateSaved(def.slug, `<li>${f.years.length} seasons listed`, `<li>${f.years.length + 1} seasons listed`, 'wrongfact');
    }
    const texts = bodyLines(html).map(textOf);
    const before = failedChecks.get(4) || 0;
    const label = (def.championLabel ?? 'Champion').toLowerCase();
    const want = [
      `${f.years.length} seasons listed, ${f.first} to ${f.latest}.` + (rows.length !== f.years.length ? ` That is ${rows.length} ${def.words.unit[1]} in all, because some seasons have more than one.` : ''),
      `First ${label}: ${join(f.firstNames)} (${f.first}).`,
      `Latest ${label}: ${join(f.latestNames)} (${f.latest}).`,
      `${new Set(rows.map(r => r.champion)).size} different ${def.words.who[1]} have won it.`,
    ];
    for (const w of want) if (!texts.includes(w)) fail(`${def.key}: the page does not say ${JSON.stringify(w)}`);
    const counts = [...recount(rows).entries()].map(([name, ys]) => [name, ys.length]);
    const top = Math.max(...counts.map(([, n]) => n));
    const topNames = counts.filter(([, n]) => n === top).map(([n]) => n);
    const front = texts.find(t => t.startsWith('Out in front: '));
    if (!front) fail(`${def.key}: no "Out in front" line`);
    else {
      const unit = top === 1 ? def.words.unit[0] : def.words.unit[1];
      if (!front.endsWith(`, ${top} ${unit}${topNames.length > 1 ? ' each' : ''}.`)) fail(`${def.key}: "${front}" does not give the top count ${top}`);
      for (const n of topNames) if (!front.includes(n)) fail(`${def.key}: "${front}" leaves out ${n}, who is level on ${top}`);
    }
    const note = texts.find(t => t.startsWith('How we counted:')) || '';
    if (!note) fail(`${def.key}: no counting note`);
    const splitPart = (note.match(/\. ([^.]*?) (?:has|have) more than one line/) || [])[1] || '';
    const gapPart = (note.match(/Nothing is listed for ([^.]*?), so nobody/) || [])[1] || '';
    if (JSON.stringify(yearsIn(splitPart)) !== JSON.stringify(f.splits)) fail(`${def.key}: the note names split years ${JSON.stringify(yearsIn(splitPart))}, the rows have ${JSON.stringify(f.splits)}`);
    if (JSON.stringify(yearsIn(gapPart)) !== JSON.stringify(f.gaps)) fail(`${def.key}: the note names empty years ${JSON.stringify(yearsIn(gapPart))}, the rows leave ${JSON.stringify(f.gaps)}`);
    if ((failedChecks.get(4) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} pages state their facts as the rows give them`);
}

/* ======================================================================= */
current = 5;
console.log('5) one h1, the promised h2s, one h3 per decade in the data');
{
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const h1 = `${cap(def.words.many)} by year`;
    const rows = rowsOf(def);
    const decades = [...new Set(rows.map(r => Math.floor(r.year / 10) * 10))].sort((a, b) => b - a);
    if (CONTROL === 'twoh1' && def === first) html = mutateSaved(def.slug, `<h1>${esc(h1)}</h1>`, `<h1>${esc(h1)}</h1>\n<h1>A second headline</h1>`, 'twoh1');
    if (CONTROL === 'nodecade' && def === first) html = mutateSaved(def.slug, `<h3>${esc(cap(def.words.many))} in the ${decades[0]}s</h3>`, '', 'nodecade');
    const lines = bodyLines(html);
    const before = failedChecks.get(5) || 0;
    const h1s = lines.filter(l => tagOf(l) === 'h1').map(textOf);
    if (h1s.length !== 1) fail(`${def.key}: ${h1s.length} h1s on the page`);
    else if (h1s[0] !== h1) fail(`${def.key}: the h1 is ${JSON.stringify(h1s[0])}, the search phrase is ${JSON.stringify(h1)}`);
    const h2s = lines.filter(l => tagOf(l) === 'h2').map(textOf);
    const wantH2 = [`Every ${def.words.one}, year by year`, def.words.most, 'Play with this history', ...(def.format ? [def.format.heading] : []), 'Where this comes from', 'More record books'];
    for (const w of wantH2) if (!h2s.includes(w)) fail(`${def.key}: no h2 ${JSON.stringify(w)}`);
    const h3s = lines.filter(l => tagOf(l) === 'h3').map(textOf);
    const wantH3 = decades.map(d => `${cap(def.words.many)} in the ${d}s`);
    if (JSON.stringify(h3s) !== JSON.stringify(wantH3)) {
      const missing = wantH3.filter(x => !h3s.includes(x));
      const extra = h3s.filter(x => !wantH3.includes(x));
      fail(`${def.key}: decade h3s differ from the data (${missing.length} missing${missing.length ? `: ${missing[0]}` : ''}, ${extra.length} extra${extra.length ? `: ${extra[0]}` : ''})`);
    }
    if ((failedChecks.get(5) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} pages have the heading structure`);
}

/* ======================================================================= */
current = 6;
console.log('6) the head: title, description, canonical and breadcrumb');
{
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const route = `/records/${def.slug}`;
    const before = failedChecks.get(6) || 0;
    const titleRaw = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1];
    const descRaw = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
    if (CONTROL === 'longtitle' && def === first) html = mutateSaved(def.slug, `<title>${titleRaw}</title>`, `<title>${titleRaw.replace(' | DoUKnowBall', '')} and a Great Deal More | DoUKnowBall</title>`, 'longtitle');
    if (CONTROL === 'shortdesc' && def === first) html = mutateSaved(def.slug, `<meta name="description" content="${descRaw}"`, `<meta name="description" content="${descRaw.slice(0, 90)}"`, 'shortdesc');
    const title = unesc((html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '');
    const desc = unesc((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
    if (!title) fail(`${def.key}: no title`);
    else {
      if (title.length >= 60) fail(`${def.key}: the title is ${title.length} characters, over the 60 a result shows: ${title}`);
      if (!title.endsWith(' | DoUKnowBall')) fail(`${def.key}: the title does not end in the brand: ${title}`);
      if (title !== def.words.seoTitle) fail(`${def.key}: the saved title ${JSON.stringify(title)} is not the section's own ${JSON.stringify(def.words.seoTitle)}`);
    }
    const f = spanFacts(rowsOf(def));
    if (desc.length < 120 || desc.length > 160) fail(`${def.key}: the description is ${desc.length} characters, outside 120 to 160`);
    if (!desc.includes(String(f.first)) || !desc.includes(String(f.latest))) fail(`${def.key}: the description does not name the span the rows cover, ${f.first} to ${f.latest}`);
    const canon = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m => m[1]);
    if (canon.length !== 1 || canon[0] !== `${SITE}${route}`) fail(`${def.key}: canonical ${JSON.stringify(canon)}, expected exactly ${SITE}${route}`);
    let crumbs = null;
    for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
      try { const j = JSON.parse(m[1]); for (const o of Array.isArray(j) ? j : [j]) if (o['@type'] === 'BreadcrumbList') crumbs = o; } catch { /* simSchema owns parse failures */ }
    }
    if (!crumbs) fail(`${def.key}: no BreadcrumbList in the head`);
    else {
      const items = crumbs.itemListElement || [];
      if (items.length !== 3) fail(`${def.key}: the breadcrumb has ${items.length} steps, expected Home, The Record Books, this page`);
      else {
        if (items[1].item !== `${SITE}/records`) fail(`${def.key}: the breadcrumb's middle step is ${items[1].item}`);
        if (items[2].item !== `${SITE}${route}`) fail(`${def.key}: the breadcrumb ends at ${items[2].item}, not this page`);
        if (items[2].name !== `${cap(def.words.many)} by year`) fail(`${def.key}: the breadcrumb names this page ${JSON.stringify(items[2].name)}`);
      }
    }
    if ((failedChecks.get(6) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} heads are right`);
}

/* ======================================================================= */
current = 7;
console.log('7) /records links all twelve pages, and each page links the others');
{
  let idx = indexHtml;
  if (!idx) fail('no saved /records page to read');
  if (CONTROL === 'nolink') {
    const a = `href="/records/${firstSlug}"`;
    if (!idx.includes(a)) refuse(`the saved /records page has no ${a}`);
    idx = idx.split(a).join('href="/records"');
  }
  const idxHrefs = new Set([...idx.matchAll(/href="([^"]+)"/g)].map(m => m[1]));
  let linked = 0;
  for (const def of RECORD_SECTIONS) {
    if (idxHrefs.has(`/records/${def.slug}`)) linked += 1;
    else fail(`/records does not link /records/${def.slug}`);
  }
  let pagesOk = 0;
  for (const def of RECORD_SECTIONS) {
    const html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const hrefs = new Set([...html.slice(html.indexOf('<div id="dukb-snapshot">')).matchAll(/href="([^"]+)"/g)].map(m => m[1]));
    const missing = RECORD_SECTIONS.filter(o => o !== def && !hrefs.has(`/records/${o.slug}`)).map(o => o.slug);
    if (missing.length) fail(`${def.key}: does not link ${missing.length} of the other pages (${missing[0]})`);
    if (!hrefs.has('/records')) fail(`${def.key}: does not link back to /records`);
    if (!missing.length && hrefs.has('/records')) pagesOk += 1;
  }
  console.log(`   /records links ${linked} of ${RECORD_SECTIONS.length}; ${pagesOk} pages link all the others and /records`);
}

/* ======================================================================= */
current = 8;
console.log('8) /records shows the newest ten seasons of each section, and not the eleventh');
{
  let idx = indexHtml;
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    const rows = rowsOf(def);
    const years = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
    const shown = new Set(years.slice(0, 10));
    const eleventh = rows.filter(r => r.year === years[10]);
    if (CONTROL === 'fulltable' && def === first) {
      const anchor = cellsOf(def, rows.filter(r => shown.has(r.year)).slice(-1)[0]).join('\n');
      if (!idx.includes(anchor)) refuse('the last shown row of the first section is not in the saved /records page');
      idx = idx.replace(anchor, `${anchor}\n${eleventh.flatMap(r => cellsOf(def, r)).join('\n')}`);
    }
    const before = failedChecks.get(8) || 0;
    for (const r of rows.filter(x => shown.has(x.year))) {
      if (!idx.includes(cellsOf(def, r).join('\n'))) fail(`/records ${def.key}: ${r.year} ${r.champion} is not shown`);
    }
    for (const r of eleventh) {
      if (idx.includes(cellsOf(def, r).join('\n'))) fail(`/records ${def.key}: ${r.year} ${r.champion} is shown, the eleventh season, so the index is carrying the full table again`);
    }
    if ((failedChecks.get(8) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} sections show exactly their newest ten seasons`);
}

/* ======================================================================= */
current = 9;
console.log('9) no link in src points at an old /records#key anchor or an unknown record page');
{
  const files = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  /* code, not the prose about it: block comments, JSX comments and whole line
     comments go before matching, so a note explaining the old anchors cannot
     trip the check and a comment cannot satisfy it */
  const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const slugs = new Set(RECORD_SECTIONS.map(s => s.slug));
  const target = path.join(ROOT, 'src/lib/sportHub.ts');
  let hashes = 0, unknown = 0, links = 0;
  for (const f of files) {
    let src = readFile(f);
    if (CONTROL === 'hashlink' && f === target) {
      const from = "'/records/nba-champions'";
      if (!src.includes(from)) refuse(`src/lib/sportHub.ts has no ${from} to turn back into an anchor`);
      src = src.replace(from, "'/records#nba'");
    }
    const c = code(src);
    for (const m of c.matchAll(/\/records#([a-z]+)/g)) {
      hashes += 1;
      fail(`${path.relative(ROOT, f)} still links /records#${m[1]}, which now lands on the index instead of the ${m[1]} page`);
    }
    for (const m of c.matchAll(/['"`]\/records\/([a-z0-9-]+)['"`]/g)) {
      links += 1;
      if (!slugs.has(m[1])) { unknown += 1; fail(`${path.relative(ROOT, f)} links /records/${m[1]}, which is no section's page`); }
    }
  }
  console.log(`   ${files.length} source files, ${links} literal record page links, ${hashes} old anchors, ${unknown} unknown pages`);
}

/* ======================================================================= */
console.log('');
const red = [...failedChecks.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.length === 1 && red[0] === want) {
    console.log(`simRecordPages control ${CONTROL}: green. Check ${want} went red (${failedChecks.get(want)} finding${failedChecks.get(want) === 1 ? '' : 's'}) and no other check did.`);
    process.exit(0);
  }
  console.error(`simRecordPages control ${CONTROL}: RED. Expected only check ${want} to fail, got ${red.length ? red.join(', ') : 'none'}.`);
  process.exit(1);
}
if (red.length) {
  const n = [...failedChecks.values()].reduce((a, b) => a + b, 0);
  console.error(`simRecordPages: ${n} failure${n === 1 ? '' : 's'} in check${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  process.exit(1);
}
console.log(`simRecordPages: green. ${RECORD_SECTIONS.length} record pages, registered everywhere, carrying every row and a recount that agrees.`);
