/**
 * Ad readiness audit, tech area. Reads tech-scan.json (written by tech-scan.mjs)
 * and prints the counts the report quotes. READS ONLY. Pass a section name:
 *   node docs/audits/ad-readiness-2026-10-08/tech-report.mjs head|robots|nav|links|ld
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { pages } = JSON.parse(fs.readFileSync(path.join(HERE, 'tech-scan.json'), 'utf8'));
const what = process.argv[2] || 'head';
const idx = pages.filter(p => p.inSitemap);
const rest = pages.filter(p => !p.inSitemap);
const dup = (list, key) => {
  const m = new Map();
  for (const p of list) { const v = key(p); if (v == null) continue; m.set(v, [...(m.get(v) || []), p.route]); }
  return [...m].filter(([, r]) => r.length > 1);
};
const say = (...a) => console.log(...a);

if (what === 'head') {
  say(`documents ${pages.length}: in sitemap ${idx.length}, not in sitemap ${rest.length}`);
  say('kinds', JSON.stringify(pages.reduce((a, p) => (a[p.kind] = (a[p.kind] || 0) + 1, a), {})));
  for (const [name, get] of [['title', p => p.titles], ['description', p => p.descs], ['canonical', p => p.canons], ['h1', p => p.h1s]]) {
    const none = idx.filter(p => get(p).length === 0).map(p => p.route);
    const many = idx.filter(p => get(p).length > 1).map(p => p.route);
    const d = dup(idx, p => get(p)[0] ?? null);
    say(`${name}: exactly one on ${idx.filter(p => get(p).length === 1).length} of ${idx.length}; none ${none.length} ${none.slice(0, 6)}; more than one ${many.length} ${many.slice(0, 6)}; shared values ${d.length}`);
    for (const [v, r] of d.slice(0, 6)) say(`   shared: ${JSON.stringify(v.slice(0, 70))} on ${r.join(', ')}`);
  }
  say(`canonical is the page's own address on ${idx.filter(p => p.canonicalSelf).length} of ${idx.length}`);
  const notSelf = idx.filter(p => !p.canonicalSelf).map(p => `${p.route} -> ${p.canons[0]}`);
  if (notSelf.length) say('   not self:', notSelf.slice(0, 8));
  const emptyH1 = idx.filter(p => p.h1s.some(h => !h)).map(p => p.route);
  say(`empty h1 text: ${emptyH1.length} ${emptyH1}`);
  const tl = idx.map(p => [p.titles[0]?.length ?? 0, p.route]).sort((a, b) => b[0] - a[0]);
  say(`title length: longest ${tl[0][0]} (${tl[0][1]}), over 60: ${tl.filter(([n]) => n > 60).length}, shortest ${tl.at(-1)[0]} (${tl.at(-1)[1]})`);
  const dl = idx.map(p => [p.descs[0]?.length ?? 0, p.route]).sort((a, b) => b[0] - a[0]);
  say(`description length: longest ${dl[0][0]} (${dl[0][1]}), over 160: ${dl.filter(([n]) => n > 160).length}, under 70: ${dl.filter(([n]) => n < 70).length}, shortest ${dl.at(-1)[0]} (${dl.at(-1)[1]})`);
  const nested = idx.filter(p => p.route.split('/').length > 2).map(p => p.route);
  say(`nested routes in the sitemap (public/<a>/<b>/index.html): ${nested.length}`);
  say('   ' + nested.join(' '));
  const h1eqTitle = idx.filter(p => p.h1s[0] && p.titles[0] && p.titles[0].toLowerCase().startsWith(p.h1s[0].toLowerCase())).length;
  say(`title starts with the h1 text on ${h1eqTitle} pages (informational)`);
}

if (what === 'robots') {
  const withRobots = idx.filter(p => p.robots.length);
  say(`sitemap pages carrying any robots meta: ${withRobots.length}`);
  for (const p of withRobots.slice(0, 10)) say(`   ${p.route}: ${p.robots.join(' | ')}`);
  say(`documents NOT in the sitemap: ${rest.length}`);
  for (const p of rest) say(`   ${p.route.padEnd(28)} ${p.kind.padEnd(17)} robots=${JSON.stringify(p.robots)} canonical=${p.canons[0] ?? 'none'} h1=${p.h1s.length}`);
}

if (what === 'nav') {
  const sig = new Map();
  for (const p of pages) {
    const k = JSON.stringify(p.chromeLinks);
    sig.set(k, [...(sig.get(k) || []), p.route]);
  }
  say(`distinct chrome link signatures across ${pages.length} documents: ${sig.size}`);
  for (const [k, r] of [...sig].sort((a, b) => b[1].length - a[1].length)) {
    say(`-- ${r.length} documents (${r.slice(0, 5).join(', ')}${r.length > 5 ? ', ...' : ''})`);
    say(`   wrappers ${JSON.parse(k).length}: ${JSON.parse(k).map(w => `[${w.join(' ')}]`).join(' + ').slice(0, 420)}`);
  }
  const navTagPages = pages.filter(p => p.navTags > 0).map(p => p.route);
  say(`documents with a <nav> element in the raw HTML: ${navTagPages.length} ${navTagPages.slice(0, 8)}`);
  const noWrap = idx.filter(p => p.wrappers === 0).map(p => p.route);
  say(`sitemap pages with no chrome wrapper at all: ${noWrap.length} ${noWrap}`);
  const fewLinks = idx.map(p => [p.internal.length, p.route]).sort((a, b) => a[0] - b[0]).slice(0, 8);
  say('fewest internal link targets:', JSON.stringify(fewLinks));
}

if (what === 'links') {
  const inbound = new Map(idx.map(p => [p.route, { all: new Set(), body: new Set() }]));
  for (const p of idx) {
    const chrome = new Set(p.chromeLinks.flat().map(h => h.split('#')[0]));
    for (const t of p.internal) {
      if (t === p.route || !inbound.has(t)) continue;
      inbound.get(t).all.add(p.route);
      if (!chrome.has(t)) inbound.get(t).body.add(p.route);
    }
  }
  const rows = [...inbound].map(([r, v]) => ({ r, all: v.all.size, body: v.body.size }));
  say(`sitemap pages with zero inbound links from other sitemap pages: ${rows.filter(x => x.all === 0).length}`);
  say(`sitemap pages whose only inbound links are the sitewide footer: ${rows.filter(x => x.all > 0 && x.body === 0).map(x => x.r).join(' ') || 'none'}`);
  say('fewest inbound (any link):', JSON.stringify(rows.sort((a, b) => a.all - b.all).slice(0, 14).map(x => `${x.r}=${x.all}`)));
  say('fewest inbound (outside the footer):', JSON.stringify(rows.sort((a, b) => a.body - b.body).slice(0, 14).map(x => `${x.r}=${x.body}`)));
  const targets = new Set(idx.flatMap(p => p.internal));
  const known = new Set(pages.map(p => p.route));
  const dead = [...targets].filter(t => !known.has(t) && !/\.(xml|txt|png|svg|ico|webmanifest|json|js|css)$/.test(t));
  say(`link targets with no saved document: ${dead.length} ${dead.slice(0, 12)}`);
  const toRest = [...targets].filter(t => rest.some(p => p.route === t));
  say(`link targets that are saved but not in the sitemap: ${toRest.join(' ')}`);
}

if (what === 'ld') {
  const count = (list, f) => list.filter(f).length;
  say(`sitemap pages with any JSON-LD: ${count(idx, p => p.ld.blocks > 0)} of ${idx.length}; blocks per page: ${JSON.stringify(idx.reduce((a, p) => (a[p.ld.blocks] = (a[p.ld.blocks] || 0) + 1, a), {})).replace(/"/g, '')}`);
  say(`blocks outside the head: ${count(idx, p => p.ld.blocks !== p.ld.inHead)}; parse errors: ${idx.reduce((a, p) => a + p.ld.errors, 0)}`);
  const types = {};
  for (const p of idx) for (const t of p.ld.types) types[t] = (types[t] || 0) + 1;
  say('types by page count: ' + Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', '));
  const withCrumb = idx.filter(p => p.ld.breadcrumbItems.length > 0);
  const noCrumb = idx.filter(p => p.ld.breadcrumbItems.length === 0).map(p => p.route);
  say(`BreadcrumbList on ${withCrumb.length} of ${idx.length}; trail length: ${JSON.stringify(withCrumb.reduce((a, p) => (a[p.ld.breadcrumbItems[0]] = (a[p.ld.breadcrumbItems[0]] || 0) + 1, a), {})).replace(/"/g, '')}`);
  say(`   more than one BreadcrumbList on a page: ${count(idx, p => p.ld.breadcrumbItems.length > 1)}`);
  say(`   without a BreadcrumbList (${noCrumb.length}): ${noCrumb.join(' ')}`);
  for (const r of ['/golf-higher-lower', '/soccer-career', '/olympics', '/records/nba-champions', '/soccer']) {
    const p = idx.find(x => x.route === r);
    if (p) say(`   ${r}: ${JSON.stringify(p.ld.breadcrumbNames[0] || null)}`);
  }
  const faq = idx.filter(p => p.ld.faqQuestions > 0);
  const q = faq.reduce((a, p) => a + p.ld.faqQuestions, 0);
  say(`FAQPage on ${faq.length} of ${idx.length}, ${q} questions in total; per page min ${Math.min(...faq.map(p => p.ld.faqQuestions))}, max ${Math.max(...faq.map(p => p.ld.faqQuestions))}`);
  say(`   questions per page: ${JSON.stringify(faq.reduce((a, p) => (a[p.ld.faqQuestions] = (a[p.ld.faqQuestions] || 0) + 1, a), {})).replace(/"/g, '')}`);
  const qMiss = faq.filter(p => p.ld.faqQMissing.length);
  const aMiss = faq.filter(p => p.ld.faqAMissing.length);
  say(`   pages where a marked up QUESTION is not in the visible raw text: ${qMiss.length} (${qMiss.reduce((a, p) => a + p.ld.faqQMissing.length, 0)} questions)`);
  for (const p of qMiss.slice(0, 6)) say(`      ${p.route}: ${JSON.stringify(p.ld.faqQMissing.slice(0, 2))}`);
  say(`   pages where a marked up ANSWER is not in the visible raw text: ${aMiss.length} (${aMiss.reduce((a, p) => a + p.ld.faqAMissing.length, 0)} answers)`);
  for (const p of aMiss.slice(0, 8)) say(`      ${p.route}: ${JSON.stringify(p.ld.faqAMissing.slice(0, 2))}`);
  const faqNotGame = faq.filter(p => !p.ld.types.includes('Game')).map(p => p.route);
  say(`   FAQPage on a page that is not typed Game: ${faqNotGame.length} ${faqNotGame}`);
  const nonIdx = rest.filter(p => p.ld.blocks > 0).map(p => `${p.route}(${p.ld.types.join('+')})`);
  say(`unsubmitted documents carrying JSON-LD: ${nonIdx.length} ${nonIdx.join(' ').slice(0, 400)}`);
}
