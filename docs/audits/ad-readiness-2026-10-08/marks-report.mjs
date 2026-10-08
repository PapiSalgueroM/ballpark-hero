/**
 * Prints slices of marks-scan.json. Read only.
 *   node docs/audits/ad-readiness-2026-10-08/marks-report.mjs products   (name in URL, label, title or H1)
 *   node docs/audits/ad-readiness-2026-10-08/marks-report.mjs body       (product names only in body text)
 *   node docs/audits/ad-readiness-2026-10-08/marks-report.mjs leagues    (league names in URL and label, counts)
 *   node docs/audits/ad-readiness-2026-10-08/marks-report.mjs one /route (everything for one route)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { rows } = JSON.parse(fs.readFileSync(path.join(HERE, 'marks-scan.json'), 'utf8'));
const mode = process.argv[2] || 'products';
const front = h => h.url || h.label || h.title || h.h1;

if (mode === 'products') {
  const by = {};
  for (const r of rows) for (const [id, h] of Object.entries(r.products)) if (front(h)) (by[id] ||= []).push([r, h]);
  for (const [id, list] of Object.entries(by)) {
    console.log(`\n== ${id}: ${list.length} routes`);
    for (const [r, h] of list) {
      console.log(`${r.route} [${r.status}${r.inSitemap ? ', sitemap' : ''}] url${h.url} label${h.label} title${h.title} h1${h.h1} desc${h.description} hd${h.headings} body${h.body} ld${h.jsonld} :: ${r.label} :: ${r.title.slice(0, 70)}`);
    }
  }
} else if (mode === 'body') {
  const by = {};
  for (const r of rows) for (const [id, h] of Object.entries(r.products)) if (!front(h)) (by[id] ||= []).push(`${r.route}(${h.body}${h.headings ? ',hd' + h.headings : ''}${h.description ? ',desc' : ''}${h.jsonld ? ',ld' + h.jsonld : ''})`);
  for (const [id, list] of Object.entries(by)) console.log(`\n== ${id}: ${list.length} routes\n${list.slice(0, 40).join(' ')}`);
} else if (mode === 'leagues') {
  const tally = {};
  for (const r of rows) for (const [id, h] of Object.entries(r.leagues)) {
    const t = (tally[id] ||= { url: [], label: [], title: 0, h1: 0, pagesWithBody: 0 });
    if (h.url) t.url.push(r.route);
    if (h.label) t.label.push(r.route);
    if (h.title) t.title += 1;
    if (h.h1) t.h1 += 1;
    if (h.body) t.pagesWithBody += 1;
  }
  for (const [id, t] of Object.entries(tally)) console.log(`${id}: url ${t.url.length}, label ${t.label.length}, title ${t.title}, h1 ${t.h1}, pages naming it in text ${t.pagesWithBody}\n   urls: ${t.url.join(' ')}`);
} else if (mode === 'one') {
  const r = rows.find(x => x.route === process.argv[3]);
  console.log(JSON.stringify(r, null, 1));
}
