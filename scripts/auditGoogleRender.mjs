/**
 * Owner directive 2026-08-30, section 6: audit what Google ACTUALLY receives.
 *
 * Three views of the same page, because the gap between them is the finding:
 *   RAW      the HTTP response, no JavaScript. This is what a crawler that
 *            does not render sees, and what the prerendered snapshot exists
 *            to make good.
 *   RENDERED the page after the app boots, which is what Googlebot's second
 *            pass sees and what the owner sees in his browser.
 *   NO DATA  the page rendered with the database blocked. His directive asks
 *            specifically whether an API failure leaves a nearly empty page,
 *            and a page that is excellent for him and empty for a crawler
 *            whose fetch happened to fail is exactly the shape of "low value"
 *            that nobody would ever notice by looking.
 *
 * Writes docs/seo/google-render-audit.md. Read only against the live site, so
 * it changes nothing and can be re-run after any fix to show movement.
 *
 * Run: node scripts/auditGoogleRender.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.AUDIT_SITE || 'https://douknowball.com';

/* The pages that matter, by his section 13 ordering: what earns traffic, the
   cornerstone hubs, then the flagships. */
const PAGES = [
  '/', '/football-grid', '/college-grid', '/soccer-grid', '/nba-grid', '/mlb-grid', '/hockey-grid',
  '/soccer', '/pro-football', '/pro-basketball', '/baseball', '/hockey', '/college',
  '/soccer-career', '/club-manager', '/cfb-dynasty', '/footle', '/career-ladder',
  '/alphabet-sprint', '/higher-lower', '/connections', '/world-xi', '/transfer-path',
  '/nba-stat-line', '/records', '/whats-new', '/about', '/leaderboard', '/nba-grid/archive',
];

const clientTs = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const DB_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;

const words = t => t.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
const textOf = html => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<head[\s\S]*?<\/head>/i, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/gi, ' ');

const rows = [];
const browser = await chromium.launch();

for (const route of PAGES) {
  const url = SITE + route;
  const row = { route };

  /* RAW: no browser at all. */
  const res = await fetch(url, { redirect: 'manual' }).catch(() => null);
  if (!res) { row.status = 'FETCH FAILED'; rows.push(row); continue; }
  row.status = res.status;
  const raw = await res.text();
  row.rawWords = words(textOf(raw));
  row.title = (raw.match(/<title>([^<]*)<\/title>/) || [, ''])[1].trim();
  row.h1 = (raw.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
  row.canonical = (raw.match(/<link rel="canonical"[^>]*href="([^"]*)"/) || [, ''])[1];
  row.robots = (raw.match(/<meta name="robots"[^>]*content="([^"]*)"/) || [, 'none'])[1];
  row.schema = [...raw.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map(m => m[1]);
  row.rawLinks = new Set([...raw.matchAll(/href="(\/[a-z0-9/-]*)"/g)].map(m => m[1])).size;

  /* RENDERED, and then the same page with the database refused. */
  for (const mode of ['rendered', 'nodata']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ } });
    const page = await ctx.newPage();
    if (mode === 'nodata') await page.route(`**${DB_HOST}**`, r => r.abort());
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(mode === 'nodata' ? 9000 : 6000);
    const seen = await page.evaluate(() => ({
      text: document.body.innerText || '',
      links: new Set([...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href'))).size,
      h1: (document.querySelector('h1') || {}).innerText || '',
    })).catch(() => ({ text: '', links: 0, h1: '' }));
    row[mode + 'Words'] = words(seen.text);
    row[mode + 'Links'] = seen.links;
    if (mode === 'rendered') row.renderedH1 = seen.h1.trim();
    await ctx.close();
  }
  rows.push(row);
  console.log(`${route.padEnd(20)} status ${row.status}  raw ${String(row.rawWords).padStart(4)}  rendered ${String(row.renderedWords).padStart(4)}  no-data ${String(row.nodataWords).padStart(4)}`);
}
await browser.close();

/* ---- the document ---- */
const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 100));
const collapsed = rows.filter(r => r.nodataWords < r.renderedWords * 0.5);
const rawThin = rows.filter(r => r.rawWords < 300);
const noH1 = rows.filter(r => !r.h1);
const stamp = new Date().toISOString().slice(0, 10);

let md = `# What Google actually receives, page by page

Generated by \`scripts/auditGoogleRender.mjs\` against ${SITE} on ${stamp}.
Owner directive of 2026-08-30, section 6. Re-run it after any fix; the numbers
are the evidence, not the prose around them.

## The three views, and why the third one exists

- **RAW** is the HTTP response with no JavaScript: what a crawler that does not
  render sees, and what the prerendered snapshots exist to make good.
- **RENDERED** is the page after the app boots: Googlebot's second pass, and
  what the owner sees.
- **NO DATA** is the page rendered with the database refused. The directive asks
  specifically whether an API failure leaves a nearly empty page. A page that is
  excellent in a browser and hollow when a fetch fails is a failure mode nobody
  finds by looking at the site.

## Headline numbers

- Pages audited: **${rows.length}**
- Raw responses under 300 words: **${rawThin.length}** ${rawThin.length ? '(' + rawThin.map(r => r.route).join(', ') + ')' : ''}
- Pages with no H1 in the raw HTML: **${noH1.length}** ${noH1.length ? '(' + noH1.map(r => r.route).join(', ') + ')' : ''}
- **Pages that lose more than half their words when the database is refused: ${collapsed.length}** ${collapsed.length ? '(' + collapsed.map(r => r.route).join(', ') + ')' : ''}

## Per page

| Route | HTTP | Raw words | Rendered | No data | Raw links | Robots | Schema types |
|---|---|---|---|---|---|---|---|
`;
for (const r of rows) {
  md += `| \`${r.route}\` | ${r.status} | ${r.rawWords} | ${r.renderedWords} | ${r.nodataWords} (${pct(r.nodataWords, r.renderedWords)}%) | ${r.rawLinks} | ${r.robots} | ${[...new Set(r.schema)].join(', ') || 'none'} |\n`;
}

md += `\n## Titles, H1s and canonicals as served in raw HTML\n\n| Route | Title | H1 | Canonical |\n|---|---|---|---|\n`;
for (const r of rows) {
  md += `| \`${r.route}\` | ${r.title || '**MISSING**'} | ${r.h1 || '**MISSING**'} | ${r.canonical || '**MISSING**'} |\n`;
}

fs.mkdirSync(path.join(ROOT, 'docs', 'seo'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs', 'seo', 'google-render-audit.md'), md);
console.log(`\nwrote docs/seo/google-render-audit.md (${rows.length} pages, ${collapsed.length} collapse without the database)`);
