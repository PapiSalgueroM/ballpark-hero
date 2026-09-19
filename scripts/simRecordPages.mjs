/**
 * Round 649 harness: the per competition Record Books pages say what the data
 * says, claim nothing the rows do not cover, and reach a crawler saying it.
 *
 * WHAT CHANGED. /records used to be one address holding twelve full champion
 * tables. Round 649 gave each competition its own page at /records/<slug>
 * (src/pages/RecordPage.tsx, one component for all twelve) with keyword
 * headings, a year by year list split into decades, and a most titles table
 * COUNTED from the rows at render. /records became the index.
 *
 * THE REVIEW THAT SHAPED IT. The first version stated facts as all time on
 * tables that start late ("First champion: Clemson", "Most college football
 * titles" on rows that begin in 1981), hid the counting rule under the table,
 * and let typed leader counts sit in the blurbs unchecked. Every one of those is
 * a check below now, and the span rule is enforced by construction: a heading,
 * fact, title or link that could read as all time must name the first year the
 * rows hold. Nothing here knows which tables are short.
 *
 * WHAT THIS HOLDS, and it reads the DATA and the SAVED FILES, never the page's
 * own helpers, so the page cannot mark its own homework:
 *   1. Registration. Every section has a slug, and that slug has a route in
 *      App.tsx, an entry in public/sitemap.xml (genSitemap.mjs derives them from
 *      RECORD_SECTIONS), a line in pageSchema.ts's type table and a saved page.
 *      Nothing under /records/ is registered that is not a section. Source is
 *      read with its comments stripped, so a commented out line does not count.
 *   2. Every row. Each decade block of each saved page holds exactly the rows
 *      recordBooks.json has for that decade, cell for cell, in order, and
 *      nothing else, under an h2 that names the first year.
 *   3. The most titles table. Recounted here from the JSON, per name exactly as
 *      written: every name with two or more listed, ties never split, counts and
 *      years exact, the "names appear once" line agreeing with the rest.
 *   4. The derived facts, span bound: years listed, earliest and latest year
 *      listed (each worded with the table's own column, so "season" only where
 *      the column is Season: the Super Bowl rows are years of play), how many
 *      different names appear, the exact set of leaders and their count, and the
 *      counting note, which must sit ABOVE the leaders, say names count exactly
 *      as the table writes them, claim no split of renamed clubs, and name the
 *      split and empty years the rows actually have.
 *   5. Structure. One h1 that is the search phrase, the h2s the page promises
 *      (the year by year and most titles ones naming the first year), and one h3
 *      per decade the data has, no more, no fewer, a first decade the rows only
 *      partly cover headed by the years it holds ("from 1915 to 1919").
 *   6. The head. A title under 60 characters ending in the brand and naming the
 *      first year, a description of 120 to 160 characters naming the span, the
 *      page's own canonical, and a three step BreadcrumbList ending there.
 *   7. Links. /records links all twelve pages, and each page links the other
 *      eleven and /records from its own body (the sitewide footer does not
 *      count).
 *   8. The index is an index. /records shows each section's newest ten seasons
 *      and not the eleventh, links each page with the span bound wording, and
 *      its leader line names exactly the leaders the rows give.
 *   9. Source links. No link in src still points at an old /records#key anchor,
 *      every /records/<slug> written in src names a real section, and every
 *      literal link to a record page, in an object or inline in JSX, carries the
 *      span bound wording.
 *  10. The blurbs and notes. No sentence puts a count next to a name, or any
 *      word of a name, from that section's rows (who won how many is computed,
 *      never typed), and every "since YYYY" in them is the first year the rows
 *      hold.
 *
 * NEGATIVE CONTROLS. RECORD_PAGES_CONTROL=<name> breaks one input, in memory,
 * for the one check it targets, and the run is green only if THAT check went
 * red and every other check stayed green. Each control refuses to run if the
 * thing it changes is not there, because a control that changes nothing proves
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
  noslug: 1, noroute: 1, commented: 1, notype: 1, nositemap: 1, nopage: 1,
  droprow: 2,
  miscount: 3,
  wrongfact: 4, wrongleader: 4, seasonword: 4,
  twoh1: 5, nodecade: 5,
  longtitle: 6, shortdesc: 6,
  nolink: 7, nobacklink: 7,
  fulltable: 8, indexleader: 8,
  hashlink: 9, genericlabel: 9, jsxlabel: 9,
  blurbcount: 10, blurbsince: 10, shortcount: 10,
};
const CONTROL = process.env.RECORD_PAGES_CONTROL || '';

if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, RECORD_PAGES_CONTROL: name }, encoding: 'utf8' });
    const last = (r.stdout || '').trim().split('\n').pop() || (r.stderr || '').trim().split('\n').pop() || '';
    const ok = r.status === 0;
    if (!ok) bad += 1;
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(12)} ${last}`);
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
/** the span bound link wording, written out here from the rule, not imported */
const sinceText = (def, firstYear) => `${cap(def.words.many)} since ${firstYear}, year by year`;
/** what a row's year is called: the table's own first column, lowercased */
const nounOf = def => def.yearLabel.toLowerCase();
/** a decade's heading, from the rule: a first decade the rows only partly
    cover names the years it holds instead of the whole decade */
function decadeText(def, start, firstYear, latestYear) {
  const many = cap(def.words.many);
  if (firstYear <= start) return `${many} in the ${start}s`;
  const end = Math.min(start + 9, latestYear);
  return firstYear === end ? `${many} in ${firstYear}` : `${many} from ${firstYear} to ${end}`;
}
/** source code with its comments removed: block, JSX and line comments (a "//"
    right after a colon or a quote is a URL or a string, not a comment) */
const stripComments = src => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

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
const hrefsIn = lines => new Set(lines.flatMap(l => [...l.matchAll(/href="([^"]+)"/g)].map(m => m[1])));

/** Everything between the h2 whose text is `heading` and the next h2. */
function sectionAfter(lines, heading) {
  const at = lines.findIndex(l => tagOf(l) === 'h2' && textOf(l) === heading);
  if (at < 0) return null;
  let end = lines.length;
  for (let j = at + 1; j < lines.length; j++) if (tagOf(lines[j]) === 'h2') { end = j; break; }
  return lines.slice(at + 1, end);
}

const rowsOf = def => book.sections[def.key] || [];
const firstOf = def => Math.min(...rowsOf(def).map(r => r.year));
const cellsOf = (def, r) => [String(r.year), r.champion, ...def.columns.map(([k]) => r.extra[k]).filter(v => v != null && String(v).trim() !== '')]
  .map(c => `<p>${esc(c)}</p>`);
const headerOf = def => [def.yearLabel, def.championLabel ?? 'Champion', ...def.columns.map(([, l]) => l)].map(c => `<p>${esc(c)}</p>`);

/** The recount: one per row for the name exactly as the row writes it. */
function recount(rows) {
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.champion)) by.set(r.champion, []);
    by.get(r.champion).push(r.year);
  }
  return by;
}
function topOf(rows) {
  const counts = [...recount(rows).entries()].map(([name, ys]) => [name, ys.length]);
  const top = Math.max(...counts.map(([, n]) => n));
  return { top, names: counts.filter(([, n]) => n === top).map(([n]) => n) };
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
/* No champion name contains ", " or " and ", so a joined list splits back into
   names cleanly. Checked, not assumed: if a name ever does, the leader checks
   compare the whole joined string instead. */
const SPLITTABLE = RECORD_SECTIONS.every(d => rowsOf(d).every(r => !/, | and /.test(r.champion)));
const splitNames = s => s.split(/, | and /);
/** does "names, N unit( each)" name exactly these leaders with this count */
function leaderLineOk(namesPart, n, wantNames, wantTop) {
  if (n !== wantTop) return `gives ${n}, the rows give ${wantTop}`;
  if (SPLITTABLE) {
    const got = splitNames(namesPart).sort();
    const want = [...wantNames].sort();
    if (JSON.stringify(got) !== JSON.stringify(want)) return `names ${JSON.stringify(got)}, the rows give exactly ${JSON.stringify(want)}`;
  } else if (namesPart !== join([...wantNames].sort((a, b) => a.localeCompare(b)))) {
    return `names ${JSON.stringify(namesPart)}, the rows give ${JSON.stringify(wantNames)}`;
  }
  return '';
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
console.log('1) every section has a slug, a route, a sitemap entry, a type and a saved page');
{
  let sections = RECORD_SECTIONS.map(s => ({ key: s.key, slug: s.slug }));
  let app = read('src/App.tsx');
  let sitemap = read('public/sitemap.xml');
  let schema = read('src/lib/pageSchema.ts');
  const pageExists = slug => fs.existsSync(pageFile(`/records/${slug}`)) && /id="dukb-snapshot"/.test(readFile(pageFile(`/records/${slug}`)));
  let exists = pageExists;

  if (CONTROL === 'noslug') {
    if (!sections[0].slug) refuse('the first section has no slug to blank');
    sections = sections.map((s, i) => (i === 0 ? { ...s, slug: '' } : s));
  }
  const routeLine = new RegExp(`[^\\n]*<Route\\s+path="/records/${firstSlug}"[^\\n]*`);
  if (CONTROL === 'noroute') {
    if (!routeLine.test(app)) refuse(`App.tsx has no route line for /records/${firstSlug}`);
    app = app.replace(routeLine, '');
  }
  if (CONTROL === 'commented') {
    /* the line stays in the file, commented out: a reader of the raw text would
       still find it, so this proves the comments really are stripped */
    if (!routeLine.test(app)) refuse(`App.tsx has no route line for /records/${firstSlug}`);
    app = app.replace(routeLine, l => `{/* ${l.trim()} */}`);
  }
  if (CONTROL === 'notype') {
    const typeLine = new RegExp(`[^\\n]*'/records/${firstSlug}':\\s*'[A-Za-z]+',[^\\n]*`);
    if (!typeLine.test(schema)) refuse(`pageSchema.ts has no type line for /records/${firstSlug}`);
    schema = schema.replace(typeLine, '');
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
  app = stripComments(app);
  schema = stripComments(schema);

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
  const typed = new Set([...schema.matchAll(/'\/records\/([a-z0-9-]+)':\s*'([A-Za-z]+)'/g)].map(m => m[1]));

  for (const slug of want) {
    if (!routes.has(slug)) fail(`/records/${slug} has no route in App.tsx`);
    else if (routes.get(slug) !== slug) fail(`/records/${slug} is routed to RecordPage slug="${routes.get(slug)}", so it draws the wrong competition`);
    if (!locs.has(slug)) fail(`/records/${slug} is not in public/sitemap.xml`);
    if (!typed.has(slug)) fail(`/records/${slug} is not in the type table in src/lib/pageSchema.ts`);
    if (!exists(slug)) fail(`/records/${slug} has no saved page with a snapshot block, so a crawler gets the fallback`);
  }
  for (const [name, set] of [['App.tsx', new Set(routes.keys())], ['public/sitemap.xml', locs], ['pageSchema.ts', typed]]) {
    for (const slug of set) if (!want.has(slug)) fail(`${name} registers /records/${slug}, which is no section's slug`);
  }
  console.log(`   ${want.size} slugs; ${routes.size} routes, ${locs.size} sitemap entries, ${typed.size} typed, ${[...want].filter(s => exists(s)).length} saved pages (comments stripped before reading)`);
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
      const last = rows[rows.length - 1];
      html = mutateSaved(def.slug, `<p>${last.year}</p>\n<p>${esc(last.champion)}</p>\n`, `<p>${last.year}</p>\n`, 'droprow');
    }
    const lines = bodyLines(html);
    const heading = `Every ${def.words.one} since ${firstOf(def)}, year by year`;
    const every = sectionAfter(lines, heading);
    if (!every) { fail(`${def.key}: no "${heading}" section in the saved page`); continue; }
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
    const fy = firstOf(def), ly = Math.max(...rows.map(r => r.year));
    for (const [d, list] of byDecade) {
      const h3 = decadeText(def, d, fy, ly);
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
console.log('3) the most titles table matches a recount of the JSON, per name as written');
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
      const topRow = [...listed].sort((a, b) => b.count - a.count)[0];
      html = mutateSaved(def.slug, `<p>${esc(topRow.name)}</p>\n<p>${topRow.count}</p>`, `<p>${esc(topRow.name)}</p>\n<p>${topRow.count + 1}</p>`, 'miscount');
    }
    const heading = `${def.words.most} since ${firstOf(def)}`;
    const sec = sectionAfter(bodyLines(html), heading);
    if (!sec) { fail(`${def.key}: no "${heading}" section`); continue; }
    const ps = sec.filter(l => tagOf(l) === 'p');
    const head = [cap(def.words.who[0]), `${cap(def.words.unit[1])} under this name`, 'Years'].map(c => `<p>${esc(c)}</p>`);
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
    const onceLine = ps.map(textOf).find(t => /(?:name appears|names appear) once\.$/.test(t));
    const onceGot = onceLine ? Number((onceLine.match(/^(\d+) more /) || [])[1]) : 0;
    if (onceGot !== once) fail(`${def.key}: the page says ${onceGot} names appear once, the rows give ${once}`);
    tables += 1;
  }
  console.log(`   ${tables} of ${RECORD_SECTIONS.length} tables match the recount`);
}

/* ======================================================================= */
current = 4;
console.log('4) the derived facts are span bound and the ones the rows give');
{
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    const rows = rowsOf(def);
    const f = spanFacts(rows);
    const { top, names: topNames } = topOf(rows);
    const noun = nounOf(def);
    if (CONTROL === 'wrongfact' && def === first) {
      html = mutateSaved(def.slug, `<li>${f.years.length} ${noun}s listed`, `<li>${f.years.length + 1} ${noun}s listed`, 'wrongfact');
    }
    if (CONTROL === 'seasonword' && def === first) {
      /* the first review's wording, back on the Super Bowl page, whose rows are
         keyed by the year the game was played */
      if (noun !== 'year') refuse(`the first section's column is ${def.yearLabel}, so "season" would be right there`);
      html = mutateSaved(def.slug, '<li>Earliest year listed: ', '<li>Earliest season listed: ', 'seasonword');
    }
    if (CONTROL === 'wrongleader' && def === first) {
      /* one wrong name added to the leaders while the real ones stay: the loose
         "every real leader is named" test this replaced would have passed it */
      const intruder = [...recount(rows).keys()].find(n => !topNames.includes(n));
      html = mutateSaved(def.slug, '<p>Out in front: ', `<p>Out in front: ${esc(intruder)}, `, 'wrongleader');
    }
    const lines = bodyLines(html);
    const texts = lines.map(textOf);
    const before = failedChecks.get(4) || 0;
    const want = [
      `${f.years.length} ${noun}s listed, ${f.first} to ${f.latest}.` + (rows.length !== f.years.length ? ` That is ${rows.length} ${def.words.unit[1]} in all, because some ${noun}s have more than one.` : ''),
      `Earliest ${noun} listed: ${join(f.firstNames)} (${f.first}).`,
      `Latest ${noun} listed: ${join(f.latestNames)} (${f.latest}).`,
      `${new Set(rows.map(r => r.champion)).size} different ${def.words.who[0]} names appear on the list, ${f.first} to ${f.latest}.`,
    ];
    for (const w of want) if (!texts.includes(w)) fail(`${def.key}: the page does not say ${JSON.stringify(w)}`);
    const most = sectionAfter(lines, `${def.words.most} since ${f.first}`) || [];
    const mostTexts = most.map(textOf);
    const frontAt = mostTexts.findIndex(t => t.startsWith('Out in front: '));
    const noteAt = mostTexts.findIndex(t => t.startsWith('How we counted: '));
    if (frontAt < 0) fail(`${def.key}: no "Out in front" line under the most titles heading`);
    else {
      const front = mostTexts[frontAt];
      const m = front.match(/^Out in front: (.+), (\d+) (\S+)( each)?\.$/);
      const unit = top === 1 ? def.words.unit[0] : def.words.unit[1];
      if (!m) fail(`${def.key}: cannot read "${front}"`);
      else {
        const why = leaderLineOk(m[1], Number(m[2]), topNames, top);
        if (why) fail(`${def.key}: "${front}" ${why}`);
        if (m[3] !== unit || Boolean(m[4]) !== (topNames.length > 1)) fail(`${def.key}: "${front}" words the count wrongly`);
      }
    }
    if (noteAt < 0) fail(`${def.key}: no counting note under the most titles heading`);
    else if (frontAt >= 0 && noteAt > frontAt) fail(`${def.key}: the counting note comes after the leaders, so a reader meets the counts before the rule`);
    const note = noteAt >= 0 ? mostTexts[noteAt] : '';
    if (note && !/counts for the \S+ name exactly as the table writes it/.test(note)) fail(`${def.key}: the counting note does not say names count exactly as the table writes them`);
    /* the note may not claim the table splits renamed clubs: the rows do not
       always use the name of the day, so that claim was false */
    if (/moved or was renamed, counts separately|name it (?:wore|had) (?:at the time|that season)/.test(note)) fail(`${def.key}: the counting note claims renamed clubs are split, which the rows do not always do`);
    if (/\b(?:seasons?|years?)\b/.test(note)) {
      const wrongNoun = noun === 'year' ? /\bseasons?\b/ : /\byears?\b(?! by year)/;
      if (wrongNoun.test(note.replace(/year by year/g, ''))) fail(`${def.key}: the counting note calls a ${noun} by the other word`);
    }
    const splitPart = (note.match(/\. ([^.]*?) (?:has|have) more than one line/) || [])[1] || '';
    const gapPart = (note.match(/Nothing is listed for ([^.]*?), so no /) || [])[1] || '';
    if (splitPart && !new RegExp(`gets one ${def.words.unit[0]}\\.`).test(note)) fail(`${def.key}: the split sentence does not say what each name gets`);
    if (JSON.stringify(yearsIn(splitPart)) !== JSON.stringify(f.splits)) fail(`${def.key}: the note names split years ${JSON.stringify(yearsIn(splitPart))}, the rows have ${JSON.stringify(f.splits)}`);
    if (JSON.stringify(yearsIn(gapPart)) !== JSON.stringify(f.gaps)) fail(`${def.key}: the note names empty years ${JSON.stringify(yearsIn(gapPart))}, the rows leave ${JSON.stringify(f.gaps)}`);
    if ((failedChecks.get(4) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} pages state their facts as the rows give them, rule above the leaders`);
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
    const f1 = firstOf(def);
    const decades = [...new Set(rows.map(r => Math.floor(r.year / 10) * 10))].sort((a, b) => b - a);
    if (CONTROL === 'twoh1' && def === first) html = mutateSaved(def.slug, `<h1>${esc(h1)}</h1>`, `<h1>${esc(h1)}</h1>\n<h1>A second headline</h1>`, 'twoh1');
    const ly = Math.max(...rows.map(r => r.year));
    if (CONTROL === 'nodecade' && def === first) html = mutateSaved(def.slug, `<h3>${esc(decadeText(def, decades[0], f1, ly))}</h3>`, '', 'nodecade');
    const lines = bodyLines(html);
    const before = failedChecks.get(5) || 0;
    const h1s = lines.filter(l => tagOf(l) === 'h1').map(textOf);
    if (h1s.length !== 1) fail(`${def.key}: ${h1s.length} h1s on the page`);
    else if (h1s[0] !== h1) fail(`${def.key}: the h1 is ${JSON.stringify(h1s[0])}, the search phrase is ${JSON.stringify(h1)}`);
    const h2s = lines.filter(l => tagOf(l) === 'h2').map(textOf);
    const wantH2 = [`Every ${def.words.one} since ${f1}, year by year`, `${def.words.most} since ${f1}`, 'Play with this history', ...(def.format ? [def.format.heading] : []), 'Where this comes from', 'More record books'];
    for (const w of wantH2) if (!h2s.includes(w)) fail(`${def.key}: no h2 ${JSON.stringify(w)}`);
    const h3s = lines.filter(l => tagOf(l) === 'h3').map(textOf);
    const wantH3 = decades.map(d => decadeText(def, d, f1, ly));
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
    const f = spanFacts(rowsOf(def));
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
      if (!title.includes(String(f.first))) fail(`${def.key}: the title does not name ${f.first}, where the rows start, so it reads as all time: ${title}`);
      if (title !== def.words.seoTitle(f.first)) fail(`${def.key}: the saved title ${JSON.stringify(title)} is not the section's own ${JSON.stringify(def.words.seoTitle(f.first))}`);
    }
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
console.log('7) /records links all twelve pages, and each page links the others and /records from its own body');
{
  let idx = indexHtml;
  if (!idx) fail('no saved /records page to read');
  if (CONTROL === 'nolink') {
    const a = `href="/records/${firstSlug}"`;
    if (!idx.includes(a)) refuse(`the saved /records page has no ${a}`);
    idx = idx.split(a).join('href="/records"');
  }
  const idxHrefs = hrefsIn(bodyLines(idx));
  let linked = 0;
  for (const def of RECORD_SECTIONS) {
    if (idxHrefs.has(`/records/${def.slug}`)) linked += 1;
    else fail(`/records does not link /records/${def.slug}`);
  }
  let pagesOk = 0;
  for (const def of RECORD_SECTIONS) {
    let html = saved.get(def.slug);
    if (!html) { fail(`${def.key}: no saved page to read`); continue; }
    if (CONTROL === 'nobacklink' && def === first) {
      /* every link back to /records in the page's own body goes; the footer's
         stays, which is exactly the link that used to satisfy this check */
      const cut = html.indexOf('<div data-site-chrome>');
      const body = cut < 0 ? html : html.slice(0, cut);
      if (!body.includes('href="/records"')) refuse(`the body of ${def.slug} has no link back to /records`);
      if (cut < 0 || !html.slice(cut).includes('href="/records"')) refuse(`the footer of ${def.slug} has no /records link, so this control cannot show it is ignored`);
      html = body.split('href="/records"').join('href="/records-removed"') + html.slice(cut);
    }
    const hrefs = hrefsIn(bodyLines(html));
    const missing = RECORD_SECTIONS.filter(o => o !== def && !hrefs.has(`/records/${o.slug}`)).map(o => o.slug);
    if (missing.length) fail(`${def.key}: does not link ${missing.length} of the other pages (${missing[0]})`);
    if (!hrefs.has('/records')) fail(`${def.key}: the page body does not link back to /records (the footer does not count)`);
    if (!missing.length && hrefs.has('/records')) pagesOk += 1;
  }
  console.log(`   /records links ${linked} of ${RECORD_SECTIONS.length}; ${pagesOk} pages link all the others and /records from their own body`);
}

/* ======================================================================= */
current = 8;
console.log('8) /records shows the newest ten seasons of each section, links each page by its span, and names the right leaders');
{
  let idx = indexHtml;
  let ok = 0;
  for (const def of RECORD_SECTIONS) {
    const rows = rowsOf(def);
    const f1 = firstOf(def);
    const years = [...new Set(rows.map(r => r.year))].sort((a, b) => b - a);
    const shown = new Set(years.slice(0, 10));
    const eleventh = rows.filter(r => r.year === years[10]);
    const { top, names: topNames } = topOf(rows);
    const leadPrefix = `Most ${def.words.unit[1]} under one name since ${f1}: `;
    if (CONTROL === 'fulltable' && def === first) {
      const anchor = cellsOf(def, rows.filter(r => shown.has(r.year)).slice(-1)[0]).join('\n');
      if (!idx.includes(anchor)) refuse('the last shown row of the first section is not in the saved /records page');
      idx = idx.replace(anchor, `${anchor}\n${eleventh.flatMap(r => cellsOf(def, r)).join('\n')}`);
    }
    if (CONTROL === 'indexleader' && def === first) {
      const from = `<p>${esc(leadPrefix)}`;
      if (!idx.includes(from)) refuse('the first section has no leader line on the saved /records page');
      const at = idx.indexOf(from);
      const end = idx.indexOf('</p>', at);
      const line = idx.slice(at, end);
      const bumped = line.replace(/, (\d+)( each)?\.$/, (m0, n, e) => `, ${Number(n) + 1}${e || ''}.`);
      if (bumped === line) refuse('the first leader line has no count to change');
      idx = idx.slice(0, at) + bumped + idx.slice(end);
    }
    const before = failedChecks.get(8) || 0;
    for (const r of rows.filter(x => shown.has(x.year))) {
      if (!idx.includes(cellsOf(def, r).join('\n'))) fail(`/records ${def.key}: ${r.year} ${r.champion} is not shown`);
    }
    for (const r of eleventh) {
      if (idx.includes(cellsOf(def, r).join('\n'))) fail(`/records ${def.key}: ${r.year} ${r.champion} is shown, the eleventh season, so the index is carrying the full table again`);
    }
    const block = sectionAfter(bodyLines(idx), `${def.emoji} ${def.title}`) || [];
    const linkLine = block.find(l => l.includes(`href="/records/${def.slug}"`));
    if (!linkLine) fail(`/records ${def.key}: no link to its page inside its own section`);
    else if (textOf(linkLine) !== sinceText(def, f1)) fail(`/records ${def.key}: the link reads ${JSON.stringify(textOf(linkLine))}, the span bound wording is ${JSON.stringify(sinceText(def, f1))}`);
    const lead = block.map(textOf).find(t => t.startsWith(leadPrefix));
    if (!lead) fail(`/records ${def.key}: no "${leadPrefix}" line`);
    else {
      const m = lead.slice(leadPrefix.length).match(/^(.+), (\d+)( each)?\.$/);
      if (!m) fail(`/records ${def.key}: cannot read "${lead}"`);
      else {
        const why = leaderLineOk(m[1], Number(m[2]), topNames, top);
        if (why) fail(`/records ${def.key}: "${lead}" ${why}`);
      }
    }
    if ((failedChecks.get(8) || 0) === before) ok += 1;
  }
  console.log(`   ${ok} of ${RECORD_SECTIONS.length} sections show exactly their newest ten seasons, a span bound link and the right leaders`);
}

/* ======================================================================= */
current = 9;
console.log('9) links in src: no old /records#key anchor, no unknown page, and every labelled record link worded by its span');
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
  const bySlug = new Map(RECORD_SECTIONS.map(s => [s.slug, s]));
  const hashTarget = path.join(ROOT, 'src/lib/sportHub.ts');
  const labelTarget = path.join(ROOT, 'src/pages/NflPlayoffFormatHistory.tsx');
  const jsxTarget = path.join(ROOT, 'src/pages/ChampOrNot.tsx');
  let hashes = 0, unknown = 0, links = 0, labelled = 0, wrongLabels = 0, jsxLinks = 0;
  for (const f of files) {
    let src = readFile(f);
    if (CONTROL === 'hashlink' && f === hashTarget) {
      const from = "'/records/nba-champions'";
      if (!src.includes(from)) refuse(`src/lib/sportHub.ts has no ${from} to turn back into an anchor`);
      src = src.replace(from, "'/records#nba'");
    }
    if (CONTROL === 'genericlabel' && f === labelTarget) {
      const re = /(path:\s*'\/records\/super-bowl-winners'\s*,\s*label:\s*)'[^']*'/;
      if (!re.test(src)) refuse('NflPlayoffFormatHistory.tsx has no labelled Super Bowl record link');
      src = src.replace(re, "$1'The Record Books'");
    }
    if (CONTROL === 'jsxlabel' && f === jsxTarget) {
      /* a JSX link with its words written inline, which the object literal rule
         alone could never see */
      const from = '<Link to="/records" className="text-primary hover:underline">Browse the Record Books</Link>';
      if (!src.includes(from)) refuse(`ChampOrNot.tsx has no ${from} to point at a record page`);
      src = src.replace(from, '<Link to="/records/super-bowl-winners" className="text-primary hover:underline">the full Super Bowl list</Link>');
    }
    /* code, not the prose about it */
    const c = stripComments(src);
    for (const m of c.matchAll(/\/records#([a-z]+)/g)) {
      hashes += 1;
      fail(`${path.relative(ROOT, f)} still links /records#${m[1]}, which now lands on the index instead of the ${m[1]} page`);
    }
    for (const m of c.matchAll(/['"`]\/records\/([a-z0-9-]+)['"`]/g)) {
      links += 1;
      if (!bySlug.has(m[1])) { unknown += 1; fail(`${path.relative(ROOT, f)} links /records/${m[1]}, which is no section's page`); }
    }
    for (const m of c.matchAll(/path:\s*'\/records\/([a-z0-9-]+)'\s*,\s*label:\s*(['"])((?:(?!\2).)*)\2/g)) {
      labelled += 1;
      const def = bySlug.get(m[1]);
      if (!def) continue;
      const want = sinceText(def, firstOf(def));
      if (m[3] !== want) { wrongLabels += 1; fail(`${path.relative(ROOT, f)} labels /records/${m[1]} ${JSON.stringify(m[3])}, the span bound wording is ${JSON.stringify(want)}`); }
    }
    /* JSX links whose words are written inline: <Link to="/records/x">words</Link>
       and plain anchors. Words built from an expression are skipped here; the
       saved page checks above read what they render. */
    for (const m of c.matchAll(/<(Link|a)\b[^>]*?\b(?:to|href)="\/records\/([a-z0-9-]+)"[^>]*>([^<{}]*)<\/\1>/g)) {
      jsxLinks += 1;
      const def = bySlug.get(m[2]);
      if (!def) continue;
      const words = m[3].replace(/\s+/g, ' ').trim();
      const want = sinceText(def, firstOf(def));
      if (words !== want) { wrongLabels += 1; fail(`${path.relative(ROOT, f)} links /records/${m[2]} as ${JSON.stringify(words)}, the span bound wording is ${JSON.stringify(want)}`); }
    }
  }
  console.log(`   ${files.length} source files, ${links} literal record page links (${labelled} labelled in objects, ${jsxLinks} with inline JSX words, ${wrongLabels} worded wrong), ${hashes} old anchors, ${unknown} unknown pages`);
}

/* ======================================================================= */
current = 10;
console.log('10) blurbs and notes carry no counts next to a name, and every "since" year is where the rows start');
{
  const COUNT_WORD = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|once|twice|thrice|dozen)\b|\b\d{1,3}\b/i;
  let sentencesRead = 0, sinceChecked = 0;
  for (const src of RECORD_SECTIONS) {
    const def = { ...src };
    const rows = rowsOf(def);
    if (CONTROL === 'blurbcount' && def.key === 'brownlow') {
      if (!rows.some(r => r.champion === 'Haydn Bunton')) refuse('Haydn Bunton is not in the Brownlow rows, so the injected claim would name nobody');
      def.blurb = `${def.blurb} Haydn Bunton won three.`;
    }
    if (CONTROL === 'blurbsince' && def.key === 'brownlow') {
      if (!/since 1924\b/.test(def.blurb)) refuse('the Brownlow blurb has no "since 1924" to move');
      def.blurb = def.blurb.replace('since 1924', 'since 1925');
    }
    if (CONTROL === 'shortcount' && def.key === 'nrl') {
      /* a short name the table only uses inside a longer one: matching full
         names alone would let this through */
      if (rows.some(r => r.champion === 'Rabbitohs')) refuse('Rabbitohs is a full champion name, so this would not test the short form');
      if (!rows.some(r => r.champion.split(' ').includes('Rabbitohs'))) refuse('no NRL champion name uses the word Rabbitohs');
      def.blurb = `${def.blurb} The Rabbitohs lead on 21.`;
    }
    const f1 = firstOf(def);
    /* every word the table uses in a name, not only whole names, so "Carlton 16"
       or "the Rabbitohs lead on 21" is caught as surely as a full name. Capitalised
       words of three letters or more, matched case sensitively, which keeps
       ordinary words like "the" and "St" out. */
    const names = new Set(rows.map(r => r.champion));
    for (const r of rows) {
      for (const tok of r.champion.split(/\s+/)) {
        const t = tok.replace(/[^A-Za-z'.-]/g, '').replace(/\.$/, '');
        if (t.length >= 3 && /^[A-Z]/.test(t)) names.add(t);
      }
    }
    const text = [def.blurb, def.note || ''].join(' ');
    for (const sentence of text.split(/(?<=[.;!?])\s+/).filter(Boolean)) {
      sentencesRead += 1;
      const count = sentence.match(COUNT_WORD);
      if (!count) continue;
      const named = [...names].find(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(sentence));
      if (named) fail(`${def.key}: "${sentence}" puts the count "${count[0]}" next to ${named}; who won how many is computed on the page, never typed`);
    }
    for (const m of text.matchAll(/\bsince (\d{4})\b/g)) {
      sinceChecked += 1;
      if (Number(m[1]) !== f1) fail(`${def.key}: the blurb says since ${m[1]}, and the rows start in ${f1}`);
    }
  }
  console.log(`   ${sentencesRead} sentences read, ${sinceChecked} "since" years checked against the rows`);
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
console.log(`simRecordPages: green. ${RECORD_SECTIONS.length} record pages, registered everywhere, span bound, carrying every row and a recount that agrees.`);
