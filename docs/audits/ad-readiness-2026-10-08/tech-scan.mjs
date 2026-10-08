/**
 * Ad readiness audit, tech area (Phase 0, 2026-10-08). READS ONLY.
 * Walks the saved pages in the worktree (public/<route>/index.html, plus the
 * root index.html for the home page) and writes tech-scan.json beside itself:
 * head tags, H1s, robots, structured data, FAQ mirroring, chrome links and the
 * inbound link graph. Nothing here runs a browser or touches the network.
 *
 * Run from the worktree root: node docs/audits/ad-readiness-2026-10-08/tech-scan.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://douknowball.com';

const sitemapXml = fs.readFileSync(path.join(PUBLIC, 'sitemap.xml'), 'utf8');
const sitemap = [...sitemapXml.matchAll(/<loc>https:\/\/douknowball\.com([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod>/g)]
  .map(m => ({ route: m[1] === '/' || m[1] === '' ? '/' : m[1], lastmod: m[2] }));
const inSitemap = new Map(sitemap.map(r => [r.route, r.lastmod]));

/* every saved document under public/, nested ones included */
const docs = [];
const walk = (dir, route) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const sub = path.join(dir, e.name);
    const r = `${route}/${e.name}`;
    const f = path.join(sub, 'index.html');
    if (fs.existsSync(f)) docs.push({ route: r, file: f });
    walk(sub, r);
  }
};
walk(PUBLIC, '');
docs.push({ route: '/', file: path.join(ROOT, 'index.html') });

const decode = s => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const strip = s => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const norm = s => strip(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const noComments = s => s.replace(/<!--[\s\S]*?-->/g, ' ');

const collectTypes = (node, out) => {
  if (Array.isArray(node)) { node.forEach(n => collectTypes(n, out)); return; }
  if (!node || typeof node !== 'object') return;
  if (node['@type']) [].concat(node['@type']).forEach(t => out.push(t));
  for (const v of Object.values(node)) collectTypes(v, out);
};
const findAll = (node, type, out) => {
  if (Array.isArray(node)) { node.forEach(n => findAll(n, type, out)); return; }
  if (!node || typeof node !== 'object') return;
  if ([].concat(node['@type'] || []).includes(type)) out.push(node);
  for (const v of Object.values(node)) findAll(v, type, out);
};

const pages = [];
for (const d of docs) {
  const raw = fs.readFileSync(d.file, 'utf8');
  const html = noComments(raw);
  const headEnd = html.indexOf('</head>');
  const head = headEnd < 0 ? html : html.slice(0, headEnd);
  const body = headEnd < 0 ? '' : html.slice(headEnd);
  const bodyNoScript = body.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, ' ');
  const titles = [...head.matchAll(/<title[^>]*>([^<]*)<\/title>/g)].map(m => decode(m[1]).trim());
  const descs = [...head.matchAll(/<meta[^>]+name="description"[^>]*>/g)]
    .map(m => decode((m[0].match(/content="([^"]*)"/) || [, ''])[1]));
  const canons = [...head.matchAll(/<link[^>]+rel="canonical"[^>]*>/g)]
    .map(m => (m[0].match(/href="([^"]*)"/) || [, ''])[1]);
  const robots = [...html.matchAll(/<meta[^>]+name="robots"[^>]*>/g)]
    .map(m => (m[0].match(/content="([^"]*)"/) || [, ''])[1]);
  const refresh = /<meta[^>]+http-equiv="refresh"/i.test(head);
  const h1s = [...bodyNoScript.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => strip(m[1]));
  const kind = d.route === '/' ? 'home'
    : raw.includes('id="dukb-snapshot"') ? 'snapshot'
    : refresh ? 'retired-signpost' : 'stub';

  /* chrome wrappers and anchors */
  const wrappers = [...bodyNoScript.matchAll(/<div data-site-chrome>([\s\S]*?)<\/div>/g)].map(m => m[1]);
  const hrefsOf = s => [...s.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map(m => m[1]);
  const chromeLinks = wrappers.map(hrefsOf);
  const allHrefs = hrefsOf(bodyNoScript);
  const internal = [...new Set(allHrefs
    .map(h => h.startsWith(SITE) ? h.slice(SITE.length) || '/' : h)
    .filter(h => h.startsWith('/') && !h.startsWith('//'))
    .map(h => h.split('#')[0].split('?')[0])
    .map(h => (h.length > 1 && h.endsWith('/')) ? h.slice(0, -1) : h))];
  const navTags = [...bodyNoScript.matchAll(/<nav\b/g)].length;

  /* structured data */
  const ldRaw = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const ldInHead = [...head.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>/g)].length;
  const types = []; let ldErrors = 0; const parsed = [];
  for (const t of ldRaw) { try { const j = JSON.parse(t); parsed.push(j); collectTypes(j, types); } catch { ldErrors += 1; } }
  const crumbs = []; findAll(parsed, 'BreadcrumbList', crumbs);
  const faqs = []; findAll(parsed, 'FAQPage', faqs);
  const bodyText = norm(bodyNoScript);
  const qa = [];
  for (const f of faqs) for (const q of [].concat(f.mainEntity || [])) {
    const name = String(q.name || '');
    const ans = String((q.acceptedAnswer && q.acceptedAnswer.text) || '');
    qa.push({ q: name, qVisible: bodyText.includes(norm(name)), aVisible: bodyText.includes(norm(ans)) });
  }

  pages.push({
    route: d.route, kind, inSitemap: inSitemap.has(d.route), lastmod: inSitemap.get(d.route) ?? null,
    titles, descs, canons, robots, h1s,
    canonicalSelf: canons.length === 1 && canons[0] === (d.route === '/' ? `${SITE}/` : `${SITE}${d.route}`),
    wrappers: wrappers.length, chromeLinks, navTags, internal,
    ld: { blocks: ldRaw.length, inHead: ldInHead, errors: ldErrors, types: [...new Set(types)].sort(),
      breadcrumbItems: crumbs.map(c => [].concat(c.itemListElement || []).length),
      breadcrumbNames: crumbs.map(c => [].concat(c.itemListElement || []).map(i => i.name)),
      faqQuestions: qa.length, faqQMissing: qa.filter(x => !x.qVisible).map(x => x.q),
      faqAMissing: qa.filter(x => !x.aVisible).map(x => x.q) },
  });
}

fs.writeFileSync(path.join(HERE, 'tech-scan.json'), JSON.stringify({ generated: new Date().toISOString(), sitemapCount: sitemap.length, pages }, null, 1));
console.log(`tech-scan: ${pages.length} documents, ${sitemap.length} sitemap rows`);
