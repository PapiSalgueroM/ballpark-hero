// Phase 0 audit, trust area, item 4a: where a count of games is said.
// Reads only. Writes trust-game-counts.json beside itself.
// Run from the worktree root: node docs/audits/ad-readiness-2026-10-08/trust-scan-counts.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/audits/ad-readiness-2026-10-08/trust-game-counts.json');

// A number (or number word) used as a count of the site's games.
const NUM = '(?:\\d{2,3}\\+?|a hundred|one hundred|hundreds of|dozens of)';
const FILL = '(?:free|sports|sport|trivia|browser|other|playable|different|daily|quiz|more|plus|total|of the|of our|fun|unique|mini|web|online|original)';
const CLAIMS = [
  new RegExp('\\b' + NUM + '\\s+(?:' + FILL + '\\s+){0,4}(?:games|titles)\\b', 'gi'),
  new RegExp('\\b(?:over|more than|nearly|almost|around|about|all)\\s+' + NUM + '\\s+(?:' + FILL + '\\s+){0,4}(?:games|titles|of them)\\b', 'gi'),
  /\ball \d{2,3} of them\b/gi,
  /\b\d{2,3}\+?\s+games? (?:across|on the site|to play|and counting|in the browser)\b/gi,
];
// season lengths and similar that are not a count of the site's games
const NOT_SITE = /\b(?:82|162|154|17|16|38|34|46|60|72|144|140|50|56|48)\s+games\b/i;

function walk(dir, out, filter) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out, filter);
    else if (filter(p)) out.push(p);
  }
  return out;
}

function claimsIn(text) {
  const hits = [];
  for (const re of CLAIMS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const phrase = m[0];
      if (NOT_SITE.test(phrase)) continue;
      const n = Number((phrase.match(/\d{2,3}/) || [0])[0]);
      if (n && (n < 60 || n > 250)) continue;
      const start = Math.max(0, m.index - 90);
      const end = Math.min(text.length, m.index + phrase.length + 90);
      hits.push({ phrase, context: text.slice(start, end).replace(/\s+/g, ' ').trim() });
    }
  }
  // de-dupe overlapping matches by context
  const seen = new Set();
  return hits.filter(h => (seen.has(h.context) ? false : (seen.add(h.context), true)));
}

// 1) source
const srcFiles = walk(path.join(ROOT, 'src'), [], p => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p));
const source = [];
for (const f of srcFiles) {
  const text = readFileSync(f, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const h of claimsIn(line)) {
      source.push({ file: path.relative(ROOT, f).replace(/\\/g, '/'), line: i + 1, phrase: h.phrase, text: line.trim().slice(0, 260) });
    }
  });
}

// 2) saved pages (raw HTML a crawler reads)
function parts(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const metas = {};
  for (const m of html.matchAll(/<meta\s+[^>]*>/gi)) {
    const tag = m[0];
    const key = (tag.match(/(?:name|property)="([^"]+)"/i) || [])[1];
    const content = (tag.match(/content="([^"]*)"/i) || [])[1];
    if (key && content != null) metas[key] = content;
  }
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1]
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
  return { title, metas, ld, body };
}

const pages = [];
const pub = path.join(ROOT, 'public');
const routes = [{ route: '/', file: path.join(ROOT, 'index.html') }];
for (const f of walk(pub, [], p => /index\.html$/.test(p))) {
  const rel = path.relative(pub, f).replace(/\\/g, '/').replace(/\/?index\.html$/, '');
  if (rel) routes.push({ route: '/' + rel, file: f });
}
for (const { route, file } of routes) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const p = parts(html);
  const rec = { route, where: [] };
  const add = (where, text) => { for (const h of claimsIn(text)) rec.where.push({ where, phrase: h.phrase, context: h.context }); };
  add('title', p.title);
  for (const k of ['description', 'og:description', 'twitter:description', 'og:title', 'twitter:title']) if (p.metas[k]) add('meta ' + k, p.metas[k]);
  add('json-ld', p.ld);
  add('body', p.body);
  if (rec.where.length) pages.push(rec);
}

const byPhrase = {};
for (const pg of pages) for (const w of pg.where) {
  const k = w.where.split(' ')[0] + ' | ' + w.phrase.toLowerCase();
  (byPhrase[k] ||= []).push(pg.route);
}
const summary = Object.fromEntries(Object.entries(byPhrase).map(([k, v]) => [k, { pages: new Set(v).size, sample: [...new Set(v)].slice(0, 6) }]));

writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), savedPagesScanned: routes.length, source, savedPageSummary: summary, savedPages: pages }, null, 1));
console.log('saved pages scanned', routes.length, 'with a count claim', pages.length);
console.log('source hits', source.length);
for (const [k, v] of Object.entries(summary)) console.log(String(v.pages).padStart(4), k, '  e.g.', v.sample.slice(0, 3).join(' '));
