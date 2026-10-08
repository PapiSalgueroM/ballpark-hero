/**
 * Phase 0 item 6: where another company's name sits on each saved page.
 * Read only. Reads public/<route>/index.html (what a crawler gets), the
 * registry labels and the router, and the pattern list in marks-patterns.json
 * (kept under docs/ so no product name is written into a scanned folder).
 *
 *   node docs/audits/ad-readiness-2026-10-08/marks-scan.mjs
 * Writes marks-scan.json beside itself and prints a short summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'marks-patterns.json'), 'utf8'));

const decode = s => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const strip = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/* registry labels and descriptions, read as text so nothing is imported */
const reg = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
const labels = new Map();
for (const line of reg.split('\n')) {
  if (/^\s*\/\//.test(line)) continue;
  const m = line.match(/path: '([^']+)', label: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)").*?description: (?:'((?:[^'\\]|\\.)*)'|"([^"]*)")/);
  if (m) labels.set(m[1], { label: (m[2] ?? m[3]).replace(/\\'/g, "'"), description: (m[4] ?? m[5]).replace(/\\'/g, "'") });
}

/* router: live routes and redirects */
const app = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
const redirects = new Map();
const live = new Set();
for (const m of app.matchAll(/<Route path="([^"]+)" element=\{<([A-Za-z0-9]+)([^>]*)>/g)) {
  if (m[2] === 'Navigate') redirects.set(m[1], (m[3].match(/to="([^"]+)"/) || [])[1]);
  else live.add(m[1]);
}

const sitemap = fs.readFileSync(path.join(PUBLIC, 'sitemap.xml'), 'utf8');
const inSitemap = new Set([...sitemap.matchAll(/<loc>https?:\/\/[^/]+([^<]*)<\/loc>/g)].map(m => m[1] || '/'));

function pageOf(route, file) {
  const html = fs.readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const body = html.slice(html.indexOf('</head>'));
  const one = re => { const m = head.match(re); return m ? decode(m[1]) : ''; };
  const bodyNoScript = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const jsonld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  return {
    route,
    title: one(/<title[^>]*>([^<]*)<\/title>/i),
    description: one(/<meta name="description" content="([^"]*)"/i),
    canonical: one(/<link rel="canonical" href="([^"]*)"/i),
    robots: one(/<meta name="robots" content="([^"]*)"/i),
    refresh: one(/http-equiv="refresh"\s+content="([^"]*)"/i),
    h1: [...bodyNoScript.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(m => strip(m[1])),
    headings: [...bodyNoScript.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map(m => strip(m[1])),
    text: strip(bodyNoScript),
    jsonld,
  };
}

const pages = [];
pages.push(pageOf('/', path.join(ROOT, 'index.html')));
function walk(dir, route) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const r = `${route}/${e.name}`;
    const f = path.join(dir, e.name, 'index.html');
    if (fs.existsSync(f)) pages.push(pageOf(r, f));
    walk(path.join(dir, e.name), r);
  }
}
walk(PUBLIC, '');

const count = (re, s) => (s.match(re) || []).length;
const out = [];
for (const p of pages) {
  const row = {
    route: p.route,
    status: redirects.has(p.route) ? `redirect to ${redirects.get(p.route)}` : (live.has(p.route) || p.route === '/' ? 'live' : 'saved page, no exact route in App.tsx'),
    inSitemap: inSitemap.has(p.route),
    label: labels.get(p.route)?.label ?? '',
    title: p.title, h1: p.h1.join(' | '), refresh: p.refresh, robots: p.robots,
    products: {}, leagues: {},
  };
  for (const kind of ['products', 'leagues']) {
    for (const { id, re } of cfg[kind]) {
      const g = () => new RegExp(re, 'gi');
      const hit = {
        url: count(g(), p.route.replace(/-/g, ' ')) + count(g(), p.route),
        label: count(g(), row.label),
        regDescription: count(g(), labels.get(p.route)?.description ?? ''),
        title: count(g(), p.title),
        description: count(g(), p.description),
        h1: count(g(), row.h1),
        headings: p.headings.filter(h => g().test(h)).length,
        body: count(g(), p.text),
        jsonld: count(g(), p.jsonld),
      };
      hit.url = hit.url ? 1 : 0;
      if (Object.values(hit).some(Boolean)) row[kind][id] = hit;
    }
  }
  out.push(row);
}
fs.writeFileSync(path.join(HERE, 'marks-scan.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pages: out.length, rows: out }, null, 1));
console.log(`pages read: ${out.length} (live ${out.filter(r => r.status === 'live').length}, redirects ${out.filter(r => r.status.startsWith('redirect')).length}, other ${out.filter(r => r.status.startsWith('saved')).length})`);
console.log(`registry labels read: ${labels.size}; redirects in App.tsx: ${redirects.size}`);
