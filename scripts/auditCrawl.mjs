/**
 * AD READINESS AUDIT, PHASE 0 ITEM 2: THE CRAWL.
 *
 * Fetches every route with a plain HTTP GET and NO JavaScript, which is what a
 * crawler that does not render (and an ad reviewer's first fetch) receives,
 * and records what that raw document says about itself.
 *
 * Run:  node scripts/auditCrawl.mjs [baseUrl] [--routes file.json] [--out file.json] [--files]
 *   baseUrl   default http://localhost:4190 (hostLikeServer over a built dist)
 *   --routes  a JSON array of routes (strings, or objects with path or route)
 *   --out     default docs/audits/ad-readiness-2026-10-08/crawl.json
 *   --files   read public/<route>/index.html from this tree instead of HTTP
 *             (the home page is index.html at the root, the vite template)
 *
 * DEFAULT ROUTE LIST: every folder under public/ that holds an index.html (at
 * any depth), plus "/", plus every <loc> in public/sitemap.xml, plus
 * docs/audits/ad-readiness-2026-10-08/routes.json when that file exists.
 *
 * WHAT "MAIN CONTENT" MEANS HERE, PRECISELY.
 * scripts/prerender.mjs writes each saved page as <div id="dukb-snapshot">
 * holding one readable block per line (h1 to h4, p, li, blockquote, table, and
 * bare <a> link cards), and wraps every block that came from the header, the
 * ticker, the game navbar, the footer or the cookie banner in
 * <div data-site-chrome>. So:
 *   main area   = inside #dukb-snapshot, outside every data-site-chrome wrapper.
 *                 On the home page (never prerendered) it is #dukb-home-copy in
 *                 the template. On a hand written stub (retired or account only
 *                 routes) it is <main>.
 *   words.body  = words in p, li, blockquote and table cells of the main area.
 *   words.main  = words.body plus the words in the main area's headings. THIS
 *                 is the "word count of main content".
 *   words.linkCards = words in bare <a> blocks of the main area (the "More
 *                 games to play" tiles and hub tiles). Counted apart: a tile is
 *                 a link to another page, not this page's copy.
 *   words.chrome = words in the data-site-chrome wrappers: the navigation, the
 *                 footer links, the legal disclaimer and the cookie banner
 *                 text. Never part of main.
 * The main area is everything the page itself drew: on a game page that is the
 * game's own first screen as text (its title, tagline and any instructions on
 * show) followed by the guide block and the "More games to play" tiles.
 * A word is a whitespace separated token holding at least one letter or digit.
 * Comments, <script>, <style>, <noscript> and <template> are stripped BEFORE
 * anything is matched, because the template's own comments and its 404 script
 * contain the strings a naive match would count (an <h1>, the snapshot id).
 *
 * A route whose answer is the home template (no snapshot block, path not "/")
 * is the host's fallback: there is no saved page at that address in the build
 * being crawled. It is recorded as kind "fallback" and left out of the stats.
 *
 * CAVEAT ON THE FOOTER, DISCLAIMER AND CONSENT COUNTS. The prerenderer drops a
 * block whose tag and text it has already written, so two IDENTICAL footers in
 * the rendered app reach the saved page as one. These counts therefore show
 * what a non rendering crawler sees, and two DIFFERENT disclaimers would show
 * as two, but they cannot prove the rendered page draws its footer once.
 *
 * Deterministic: routes are sorted, nothing in the output depends on the clock.
 * No install: node built ins only.
 */
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const AUDIT_DIR = path.join(ROOT, 'docs/audits/ad-readiness-2026-10-08');
export const SITE = 'https://douknowball.com';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', copy: '©',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', mdash: '-', ndash: '-' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return Object.prototype.hasOwnProperty.call(NAMED, e.toLowerCase()) ? NAMED[e.toLowerCase()] : m;
  });
}

/** readable text of an HTML fragment: tags out, entities decoded, whitespace collapsed */
export function textOf(html) {
  return decodeEntities(String(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function countWords(text) {
  let n = 0;
  for (const tok of String(text).split(/\s+/)) if (/[\p{L}\p{N}]/u.test(tok)) n += 1;
  return n;
}

/** attributes of one opening tag as a lower cased map */
export function parseAttrs(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  const inner = tag.replace(/^<\s*[a-zA-Z0-9]+/, '').replace(/\/?>$/, '');
  let m;
  while ((m = re.exec(inner))) out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  return out;
}

export const stripComments = html => String(html).replace(/<!--[\s\S]*?-->/g, '');

/** comments, scripts, styles, noscript and template out: none of it is page copy */
export function stripNonContent(html) {
  return stripComments(html)
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, '');
}

/**
 * The readable blocks of a fragment, in document order. A block is a heading,
 * a paragraph, a list item, a blockquote, a whole table, or a bare link card.
 * An <a> inside another block belongs to that block and is not listed again.
 */
export function blocksOf(html) {
  const out = [];
  const re = /<(h[1-6]|p|li|blockquote|table|a)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const text = textOf(m[3]);
    if (!text) continue;
    const block = { tag, text, words: countWords(text) };
    if (tag === 'a') block.href = parseAttrs('<a' + m[2] + '>').href || '';
    if (tag === 'table') block.rows = (m[3].match(/<tr\b/gi) || []).length;
    out.push(block);
  }
  return out;
}

/* PART TWO: SPLITTING A DOCUMENT AND MEASURING IT */

/**
 * Cuts one raw document into its head, its main area and its site chrome.
 * kind: "snapshot" (a prerendered page), "home" (the template at "/"),
 * "fallback" (the template answering some other address), "stub" (a hand
 * written <main> document), "none" (no readable container at all).
 */
export function splitPage(route, html) {
  const noComments = stripComments(html);
  const headRaw = (noComments.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i) || [, ''])[1];
  const bodyRaw = (noComments.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i) || [, noComments])[1];
  const body = stripNonContent(bodyRaw);
  let kind = 'none';
  let main = '';
  const chrome = [];
  const snap = body.search(/<div\b[^>]*\bid=["']dukb-snapshot["'][^>]*>/i);
  const home = body.search(/<div\b[^>]*\bid=["']dukb-home-copy["'][^>]*>/i);
  if (snap >= 0) {
    kind = 'snapshot';
    const inner = body.slice(snap).replace(/^<div\b[^>]*>/i, '');
    main = inner.replace(/<div\b[^>]*\bdata-site-chrome\b[^>]*>([\s\S]*?)<\/div\s*>/gi, (m, c) => { chrome.push(c); return '\n'; });
  } else if (home >= 0) {
    kind = route === '/' ? 'home' : 'fallback';
    const inner = body.slice(home).replace(/^<div\b[^>]*>/i, '');
    main = inner.slice(0, Math.max(0, inner.search(/<\/div\s*>/i)));
  } else if (/<main\b/i.test(body)) {
    kind = 'stub';
    main = (body.match(/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i) || [, ''])[1];
  }
  return { kind, headRaw, body, main, chrome };
}

const DISCLAIMER_RE = /independent fan project|property of their respective owners|not affiliated with/i;
const CONSENT_RE = /ads and analytics only run|essential only|\bcookies?\b[^.]*\b(accept|consent|banner)\b|\b(accept|consent)\b[^.]*\bcookies?\b/i;

function jsonLdTypes(noCommentsHtml) {
  const types = new Set();
  let blocks = 0;
  let errors = 0;
  const walk = v => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const t = v['@type'];
    if (typeof t === 'string') types.add(t);
    else if (Array.isArray(t)) t.forEach(x => typeof x === 'string' && types.add(x));
    for (const k of Object.keys(v)) walk(v[k]);
  };
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(noCommentsHtml))) {
    if (!/application\/ld\+json/i.test(m[1])) continue;
    blocks += 1;
    try { walk(JSON.parse(m[2])); } catch { errors += 1; }
  }
  return { types: [...types].sort(), blocks, errors };
}

const levelCounts = blocks => {
  const c = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0, total: 0 };
  for (const b of blocks) if (/^h[1-6]$/.test(b.tag)) { c[b.tag] += 1; c.total += 1; }
  return c;
};
const sumWords = (blocks, test) => blocks.reduce((n, b) => n + (test(b) ? b.words : 0), 0);
const isHeading = b => /^h[1-6]$/.test(b.tag);
const isBody = b => b.tag === 'p' || b.tag === 'li' || b.tag === 'blockquote' || b.tag === 'table';

/** everything the audit records about one raw document */
export function analyse(route, html) {
  const page = splitPage(route, html);
  const head = page.headRaw;
  const headNoScript = stripNonContent(head);
  const titles = [...headNoScript.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)].map(m => textOf(m[1]));
  const metas = [...headNoScript.matchAll(/<meta\b[^>]*>/gi)].map(m => parseAttrs(m[0]));
  const links = [...headNoScript.matchAll(/<link\b[^>]*>/gi)].map(m => parseAttrs(m[0]));
  const descriptions = metas.filter(a => (a.name || '').toLowerCase() === 'description').map(a => (a.content || '').trim());
  const robots = metas.filter(a => (a.name || '').toLowerCase() === 'robots').map(a => (a.content || '').trim());
  const canonicals = links.filter(a => (a.rel || '').toLowerCase() === 'canonical').map(a => (a.href || '').trim());
  const refresh = metas.filter(a => (a['http-equiv'] || '').toLowerCase() === 'refresh').map(a => a.content || '');
  const mainBlocks = blocksOf(page.main);
  const chromeBlocks = page.chrome.flatMap(c => blocksOf(c));
  const allBlocks = blocksOf(page.body);
  const ld = jsonLdTypes(stripComments(html));
  const words = {
    main: sumWords(mainBlocks, b => isBody(b) || isHeading(b)),
    body: sumWords(mainBlocks, isBody),
    headings: sumWords(mainBlocks, isHeading),
    table: sumWords(mainBlocks, b => b.tag === 'table'),
    linkCards: sumWords(mainBlocks, b => b.tag === 'a'),
    chrome: sumWords(chromeBlocks, () => true),
  };
  const textBlocks = allBlocks.filter(b => b.tag === 'p' || b.tag === 'li');
  const disclaimers = textBlocks.filter(b => DISCLAIMER_RE.test(b.text));
  const consentIn = blocks => blocks.filter(b => (b.tag === 'p' || b.tag === 'li') && CONSENT_RE.test(b.text)).length;
  const self = route === '/' ? SITE + '/' : SITE + route;
  return {
    route,
    kind: page.kind,
    title: titles[0] ?? null,
    titleCount: titles.length,
    description: descriptions[0] ?? null,
    descriptionCount: descriptions.length,
    canonical: canonicals[0] ?? null,
    canonicalCount: canonicals.length,
    canonicalIsSelf: canonicals.length === 1 && canonicals[0].replace(/\/$/, '') === self.replace(/\/$/, ''),
    robots,
    noindex: robots.some(r => /noindex/i.test(r)),
    metaRefresh: refresh[0] ?? null,
    h1: allBlocks.filter(b => b.tag === 'h1').map(b => b.text),
    headings: levelCounts(allBlocks),
    mainHeadings: levelCounts(mainBlocks),
    words,
    mainTextPresent: words.body > 0,
    jsonLdTypes: ld.types,
    jsonLdBlocks: ld.blocks,
    jsonLdErrors: ld.errors,
    chrome: {
      footerTags: (page.body.match(/<footer\b/gi) || []).length,
      chromeWrappers: page.chrome.length,
      disclaimerParagraphs: disclaimers.length,
      disclaimerDistinct: new Set(disclaimers.map(b => b.text)).size,
      disclaimerInMain: mainBlocks.filter(b => (b.tag === 'p' || b.tag === 'li') && DISCLAIMER_RE.test(b.text)).length,
      consentBannersInChrome: consentIn(chromeBlocks),
      consentTextInMain: consentIn(mainBlocks),
      privacyLinksInChrome: page.chrome.reduce((n, c) => n + (c.match(/<a\b[^>]*href=["']\/privacy["']/gi) || []).length, 0),
    },
  };
}

/* PART THREE: THE ROUTE LIST, THE FETCH AND THE REPORT */

const norm = r => { const s = '/' + String(r).replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+|\/+$/g, ''); return s === '/' ? '/' : s; };

export function publicRoutes() {
  const out = [];
  const walk = (dir, rel) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const next = path.join(dir, ent.name);
      const r = rel + '/' + ent.name;
      if (fs.existsSync(path.join(next, 'index.html'))) out.push(r);
      walk(next, r);
    }
  };
  walk(path.join(ROOT, 'public'), '');
  return out.sort();
}

export function sitemapRoutes() {
  const file = path.join(ROOT, 'public/sitemap.xml');
  if (!fs.existsSync(file)) return [];
  return [...fs.readFileSync(file, 'utf8').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m => norm(m[1])).sort();
}

/* a routes file is an array, or an object with a routes or pages array; each
   entry is a string or an object naming its address as path, route or url.
   type, family and familyKind are carried through when the entry has them. */
function listFromJson(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const arr = Array.isArray(data) ? data : (data.routes || data.pages || []);
  return arr.map(x => (typeof x === 'string' ? { route: x } : { route: x.path || x.route || x.url, type: x.type ?? null, family: x.family ?? null, familyKind: x.familyKind ?? null }))
    .filter(x => x.route).map(x => ({ ...x, route: norm(x.route) }));
}

/* a router pattern ("/*", "/profile/:username") is not an address anyone can fetch */
const isPattern = r => /[*:]/.test(r);

/** the routes to crawl, each with where it was found */
export function routeList(routesFile) {
  const seen = new Map();
  const info = new Map();
  const add = (r, src) => { if (isPattern(r)) return; if (!seen.has(r)) seen.set(r, new Set()); seen.get(r).add(src); };
  const addJson = (file, src) => { for (const x of listFromJson(file)) { add(x.route, src); if (x.type || x.family) info.set(x.route, x); } };
  if (routesFile) {
    addJson(routesFile, 'routesFile');
  } else {
    add('/', 'home');
    for (const r of publicRoutes()) add(r, 'public');
    for (const r of sitemapRoutes()) add(r, 'sitemap');
    const extra = path.join(AUDIT_DIR, 'routes.json');
    if (fs.existsSync(extra)) addJson(extra, 'routesJson');
  }
  const inSitemap = new Set(sitemapRoutes());
  const inPublic = new Set(publicRoutes());
  return [...seen.keys()].sort().map(route => ({
    route, foundIn: [...seen.get(route)].sort(), inSitemap: inSitemap.has(route), inPublic: route === '/' || inPublic.has(route),
    type: info.get(route)?.type ?? null, family: info.get(route)?.family ?? null, familyKind: info.get(route)?.familyKind ?? null,
  }));
}

/** one raw document, by HTTP GET or straight off the disk; never runs a script */
export async function loadPage(route, { base, files }) {
  if (files) {
    const file = route === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, 'public', route, 'index.html');
    if (!fs.existsSync(file)) return { status: 0, html: '', bytes: 0, location: null };
    const html = fs.readFileSync(file, 'utf8');
    return { status: 200, html, bytes: Buffer.byteLength(html), location: null };
  }
  /* node:http and not fetch(): the fetch standard refuses a list of "bad
     ports" outright and 4190, where the local copy of the live build is
     served, is on it. Redirects are recorded, never followed. */
  const url = new URL(base.replace(/\/+$/, '') + route);
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { headers: { 'user-agent': 'dukb-audit-crawl (no javascript)', accept: 'text/html' } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, html: buf.toString('utf8'), bytes: buf.length, location: res.headers.location ?? null });
      });
    });
    req.setTimeout(20000, () => req.destroy(new Error('timed out: ' + url.href)));
    req.on('error', reject);
  });
}

export async function crawl({ base, files, routesFile }) {
  const routes = routeList(routesFile);
  const pages = [];
  for (const r of routes) {
    const got = await loadPage(r.route, { base, files });
    pages.push({ ...r, status: got.status, bytes: got.bytes, location: got.location, ...analyse(r.route, got.html), html: got.html });
  }
  return pages;
}

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round((sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)) * 10) / 10;
};

const groupsOf = (pages, key) => {
  const map = new Map();
  for (const p of pages) { const v = key(p); if (!v) continue; if (!map.has(v)) map.set(v, []); map.get(v).push(p.route); }
  return [...map.entries()].filter(([, r]) => r.length > 1).map(([value, routes]) => ({ value, count: routes.length, routes }))
    .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : 1));
};

/** the numbers the audit reports, over the real pages only */
export function summarise(pages) {
  const real = pages.filter(p => p.status === 200 && (p.kind === 'snapshot' || p.kind === 'home'));
  const indexable = real.filter(p => !p.noindex);
  const dist = list => {
    const s = list.map(p => p.words.main).sort((a, b) => a - b);
    return { pages: s.length, min: s[0] ?? null, q1: quantile(s, 0.25), median: quantile(s, 0.5), q3: quantile(s, 0.75), max: s[s.length - 1] ?? null,
      mean: s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null };
  };
  const routesOf = list => list.map(p => p.route);
  const count = (list, key) => { const o = {}; for (const p of list) { const k = String(key(p)); o[k] = (o[k] || 0) + 1; } return o; };
  return {
    pagesCrawled: pages.length,
    byStatus: count(pages, p => p.status),
    byKind: count(pages, p => p.kind),
    realPages: real.length,
    indexablePages: indexable.length,
    noindexRoutes: routesOf(pages.filter(p => p.noindex)),
    fallbackRoutes: routesOf(pages.filter(p => p.kind === 'fallback')),
    stubRoutes: routesOf(pages.filter(p => p.kind === 'stub')),
    missingRoutes: routesOf(pages.filter(p => p.status !== 200)),
    noMainText: routesOf(real.filter(p => !p.mainTextPresent)),
    indexableNotInSitemap: routesOf(indexable.filter(p => !p.inSitemap)),
    sitemapNotIndexable: routesOf(pages.filter(p => p.inSitemap && !indexable.includes(p))),
    missing: {
      title: routesOf(indexable.filter(p => !p.title)),
      description: routesOf(indexable.filter(p => !p.description)),
      canonical: routesOf(indexable.filter(p => !p.canonical)),
      h1: routesOf(indexable.filter(p => p.h1.length === 0)),
    },
    multiple: {
      title: routesOf(indexable.filter(p => p.titleCount > 1)),
      description: routesOf(indexable.filter(p => p.descriptionCount > 1)),
      canonical: routesOf(indexable.filter(p => p.canonicalCount > 1)),
      h1: indexable.filter(p => p.h1.length > 1).map(p => ({ route: p.route, h1: p.h1 })),
    },
    canonicalNotSelf: indexable.filter(p => p.canonical && !p.canonicalIsSelf).map(p => ({ route: p.route, canonical: p.canonical })),
    duplicate: {
      title: groupsOf(indexable, p => p.title),
      description: groupsOf(indexable, p => p.description),
      canonical: groupsOf(indexable, p => p.canonical),
      h1: groupsOf(indexable, p => p.h1[0]),
    },
    mainWords: { indexable: dist(indexable), allReal: dist(real) },
    bodyWordsUnder: {
      50: routesOf(indexable.filter(p => p.words.body < 50)),
      150: indexable.filter(p => p.words.body < 150).length,
      300: indexable.filter(p => p.words.body < 300).length,
    },
    thinnest20: [...indexable].sort((a, b) => a.words.main - b.words.main || (a.route < b.route ? -1 : 1)).slice(0, 20)
      .map(p => ({ route: p.route, mainWords: p.words.main, bodyWords: p.words.body, headings: p.mainHeadings.total, linkCardWords: p.words.linkCards })),
    headingsPerPage: { mean: indexable.length ? Math.round(indexable.reduce((n, p) => n + p.mainHeadings.total, 0) / indexable.length * 10) / 10 : null },
    jsonLdTypeCounts: count(indexable.flatMap(p => p.jsonLdTypes.map(t => ({ t }))), x => x.t),
    jsonLdErrors: routesOf(pages.filter(p => p.jsonLdErrors > 0)),
    chrome: {
      footerTagPages: real.filter(p => p.chrome.footerTags > 0).length,
      disclaimerParagraphs: count(real, p => p.chrome.disclaimerParagraphs),
      disclaimerMoreThanOne: real.filter(p => p.chrome.disclaimerParagraphs > 1).map(p => ({ route: p.route, total: p.chrome.disclaimerParagraphs, inMain: p.chrome.disclaimerInMain })),
      consentBannersInChrome: count(real, p => p.chrome.consentBannersInChrome),
      privacyLinksInChrome: count(real, p => p.chrome.privacyLinksInChrome),
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const files = args.includes('--files');
  const valued = new Set(['--routes', '--out'].flatMap(n => { const i = args.indexOf(n); return i >= 0 ? [i, i + 1] : []; }));
  const base = args.find((a, i) => !a.startsWith('--') && !valued.has(i)) || 'http://localhost:4190';
  const out = path.resolve(flag('--out') || path.join(AUDIT_DIR, 'crawl.json'));
  const pages = (await crawl({ base, files, routesFile: flag('--routes') })).map(({ html, ...rest }) => rest);
  const summary = summarise(pages);
  const source = files ? 'files: public/<route>/index.html of this tree, index.html for the home page' : base;
  fs.writeFileSync(out, JSON.stringify({ source, mainContent: 'see the header of scripts/auditCrawl.mjs', summary, pages }, null, 1) + '\n');
  const w = summary.mainWords.indexable;
  console.log(`source: ${source}`);
  console.log(`kinds: ${JSON.stringify(summary.byKind)}  statuses: ${JSON.stringify(summary.byStatus)}`);
  console.log(`indexable real pages: ${summary.indexablePages}  noindex: ${summary.noindexRoutes.length}  fallback: ${summary.fallbackRoutes.length}  stubs: ${summary.stubRoutes.length}`);
  console.log(`missing  title ${summary.missing.title.length}  description ${summary.missing.description.length}  canonical ${summary.missing.canonical.length}  h1 ${summary.missing.h1.length}`);
  console.log(`duplicate groups  title ${summary.duplicate.title.length}  description ${summary.duplicate.description.length}  canonical ${summary.duplicate.canonical.length}  h1 ${summary.duplicate.h1.length}  pages with more than one h1 ${summary.multiple.h1.length}`);
  console.log(`main words (indexable): min ${w.min}  q1 ${w.q1}  median ${w.median}  q3 ${w.q3}  max ${w.max}  mean ${w.mean}`);
  console.log(`wrote ${path.relative(ROOT, out).replaceAll('\\', '/')}`);
  console.log(`auditCrawl summary: ${summary.pagesCrawled} pages crawled, ${summary.realPages} real, ${summary.noMainText.length} real pages with no main text in the raw HTML`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(err => { console.error(err); process.exit(1); });
}
