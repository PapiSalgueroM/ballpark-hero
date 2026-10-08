/**
 * Ad readiness audit, 2026-10-08. Phase 0 items 1 and 5: the route inventory
 * and the dead ends.
 *
 * READS ONLY. It changes nothing a visitor or a crawler receives. It writes one
 * file, docs/audits/ad-readiness-2026-10-08/routes.json, and prints a summary.
 *
 *   node scripts/auditRoutes.mjs            write routes.json and the summary
 *   node scripts/auditRoutes.mjs --modules  also print which engine modules
 *                                           are shared by which pages (how the
 *                                           families were worked out)
 *
 * Sources, and nothing typed by hand that the code already knows:
 *   src/App.tsx                  every Route, redirect and the catch all
 *   src/data/gameRegistry.ts     the game catalog (label, sport, daily, date)
 *   src/lib/sportHub.ts          the hub routes
 *   src/lib/records.ts           the record slugs and the explainer pages
 *   public/sitemap.xml           what is submitted
 *   public/<route>/index.html    what a crawler that runs no script receives
 *   index.html                   the home page, which is also the template
 *
 * A family is worked out from the code a page shares, not from its name: the
 * page file is followed through its imports (site chrome left out) and the
 * hooks, engines and boards it reaches are matched against FAMILY_RULES in
 * section 7 of this file. Every route records the modules that put it there.
 *
 *   node scripts/auditRoutes.mjs --dry      print the summary, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const OUT = path.join(ROOT, 'docs/audits/ad-readiness-2026-10-08/routes.json');
const read = f => fs.readFileSync(f, 'utf8');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/* ---- 1. the router ------------------------------------------------------- */
const appRaw = read(path.join(SRC, 'App.tsx'));
const app = stripComments(appRaw).replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');
const pageFileOf = new Map();
for (const m of app.matchAll(/const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\("\.\/pages\/(\w+)"\)\)/g)) pageFileOf.set(m[1], m[2]);
for (const m of app.matchAll(/^import\s+(\w+)\s+from\s+"\.\/pages\/(\w+)";/gm)) pageFileOf.set(m[1], m[2]);

const routes = [];
for (const m of app.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)([^>]*?)\/?>\}\s*\/>/g)) {
  const [, p, comp, rest] = m;
  if (comp === 'Navigate') {
    const to = (rest.match(/to="([^"]+)"/) || [])[1] || null;
    routes.push({ path: p, component: 'Navigate', redirectTo: to });
  } else {
    const props = Object.fromEntries([...rest.matchAll(/(\w+)="([^"]*)"/g)].map(x => [x[1], x[2]]));
    routes.push({ path: p, component: comp, pageFile: pageFileOf.get(comp) || null, props });
  }
}
const declared = (app.match(/<Route\s+path="/g) || []).length;
if (!routes.length || routes.length !== declared) {
  console.error(`route parse read ${routes.length} of ${declared} Route elements, the file shape changed`);
  process.exit(1);
}

/* ---- 2. the registry ----------------------------------------------------- */
const regRaw = read(path.join(SRC, 'data/gameRegistry.ts'));
const games = [];
{
  let category = null;
  const str = `('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`;
  const gameRe = new RegExp(`^\\s*\\{\\s*path:\\s*'([^']+)',\\s*label:\\s*${str}`);
  const unq = s => s.slice(1, -1).replace(/\\(['"])/g, '$1');
  for (const line of regRaw.split(/\r?\n/)) {
    if (/^\s*\/\//.test(line)) continue;
    const t = line.match(/^\s*title:\s*'([^']+)'/);
    if (t) { category = t[1]; continue; }
    const g = line.match(gameRe);
    if (!g) continue;
    games.push({
      path: g[1], label: unq(g[2]), sport: category,
      daily: /\bdaily:\s*true/.test(line),
      featured: /\bfeatured:\s*true/.test(line),
      addedOn: (line.match(/addedOn:\s*'([^']+)'/) || [])[1] || null,
    });
  }
}
const gameByPath = new Map(games.map(g => [g.path, g]));
if (games.length < 50 || gameByPath.size !== games.length) {
  console.error(`registry parse read ${games.length} games (${gameByPath.size} distinct), which cannot be right`);
  process.exit(1);
}
/* games the registry file keeps as commented out entries, with the note above them */
const commentedOut = [];
{
  const lines = regRaw.split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/^\s*\/\/\s*\{\s*path:\s*'([^']+)',\s*label:\s*'([^']*)'/);
    if (!m) return;
    const note = [];
    for (let j = i - 1; j >= 0 && /^\s*\/\//.test(lines[j]) && !/\{\s*path:/.test(lines[j]); j -= 1) note.unshift(lines[j].replace(/^\s*\/\/\s?/, ''));
    commentedOut.push({ path: m[1], label: m[2], note: note.join(' ').trim() });
  });
}

/* ---- 3. hubs, records, explainers --------------------------------------- */
const hubSrc = stripComments(read(path.join(SRC, 'lib/sportHub.ts')));
const hubRoutes = [...hubSrc.matchAll(/^\s*route:\s*'([^']+)'/gm)].map(m => m[1]);
const recSrc = stripComments(read(path.join(SRC, 'lib/records.ts')));
const recordSlugs = [...recSrc.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map(m => m[1]);
const formatPages = [...recSrc.matchAll(/\{\s*path:\s*'(\/[a-z0-9-]+-format-history)'/g)].map(m => m[1]);

if (hubRoutes.length < 6 || recordSlugs.length < 5 || formatPages.length < 3) {
  console.error(`read ${hubRoutes.length} hubs, ${recordSlugs.length} record slugs, ${formatPages.length} explainers, which cannot be right`);
  process.exit(1);
}

/* ---- 4. the sitemap and the saved pages ---------------------------------- */
const norm = r => (r.length > 1 && r.endsWith('/') ? r.slice(0, -1) : r) || '/';
const sitemapXml = read(path.join(PUBLIC, 'sitemap.xml'));
const sitemap = new Map(
  [...sitemapXml.matchAll(/<url><loc>https?:\/\/[^/<]+([^<]*)<\/loc><lastmod>([^<]*)<\/lastmod>/g)]
    .map(m => [norm(m[1] || '/'), m[2]]),
);

/** every public/<route>/index.html, as route -> html. The home page is index.html at the root. */
const saved = new Map();
(function walk(dir, route) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), `${route}/${e.name}`);
    else if (e.name === 'index.html' && route) saved.set(route, read(path.join(dir, e.name)));
  }
})(PUBLIC, '');
const homeHtml = read(path.join(ROOT, 'index.html'));

/** What the document itself declares, read from real elements with comments and scripts removed. */
function pageFacts(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const robots = [...clean.matchAll(/<meta\b[^>]*\bname="robots"[^>]*\bcontent="([^"]*)"[^>]*>/g)].map(m => m[1]);
  const refresh = (clean.match(/<meta\b[^>]*http-equiv="refresh"[^>]*content="[^"]*url=([^"]*)"/) || [])[1] || null;
  const canon = [...clean.matchAll(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"[^>]*>/g)].map(m => m[1]);
  const body = clean.slice(Math.max(0, clean.indexOf('<body')));
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  const text = body.replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    title: ((clean.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '').trim(),
    robots: robots.join(' | ') || null,
    noindex: robots.some(r => /noindex/i.test(r)),
    canonical: canon.length ? canon[canon.length - 1] : null,
    metaRefreshTo: refresh,
    hiddenStub: /<meta\b[^>]*name="dukb-hidden-page"/.test(clean),
    retiredStub: /<meta\b[^>]*name="dukb-retired-from"/.test(clean),
    hasSnapshotBlock: /id="dukb-snapshot"/.test(clean),
    h1,
    wordsOutsideChrome: text ? text.split(' ').length : 0,
  };
}

/* ---- 5. who links to whom ------------------------------------------------ */
/** Anchors only (a link element is not a link a reader follows), fragments and queries dropped. */
function anchors(html) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
  const all = h => new Set([...h.matchAll(/<a\b[^>]*\bhref="(\/[^"#?]*)[^"]*"/g)].map(m => norm(m[1])).filter(h2 => !/\.[a-z0-9]{2,5}$/i.test(h2)));
  return { all: all(clean), content: all(clean.replace(/<div data-site-chrome>[\s\S]*?<\/div>/g, ' ')) };
}
const docs = new Map([['/', homeHtml], ...saved]);
const inboundAll = new Map();
const inboundContent = new Map();
const outbound = new Map();
const add = (map, to, from) => { if (!map.has(to)) map.set(to, new Set()); map.get(to).add(from); };
for (const [from, html] of docs) {
  const a = anchors(html);
  outbound.set(from, [...a.all].filter(h => h !== from));
  for (const to of a.all) if (to !== from) add(inboundAll, to, from);
  for (const to of a.content) if (to !== from) add(inboundContent, to, from);
}

/* ---- 6. the code a page shares ------------------------------------------- */
/* Site chrome and shared plumbing are not followed: every page reaches them,
   so they say nothing about which game a page is. */
const NOT_FOLLOWED = [
  /^components\/(ui|game|seo|layout|ads|auth|home|hub)\//, /^contexts\//, /^integrations\//, /^types\//,
  /^data\/(gameRegistry|gameContent|searchKeywords)/, /^pages\//,
  /^hooks\/(use-toast|use-mobile|useRevealScroll|useGameCompletion|useDailyPuzzle|useStreaks|useAuth)/,
  /^lib\/(utils|seo|share|analytics|completions|dateUtils|firstDraw|playerSearch|nameFold|restoredFinish|newBadge|sound|haptics|storage|consent|dailySeed|rng|seededRandom)\b/,
];
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}
const importCache = new Map();
function importsOf(file) {
  if (importCache.has(file)) return importCache.get(file);
  const src = stripComments(read(file));
  const specs = [
    ...[...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m => m[1]),
    ...[...src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]),
  ];
  const out = [];
  for (const s of specs) {
    const f = resolveImport(file, s);
    if (!f || !/\.tsx?$/.test(f)) continue;
    const rel = path.relative(SRC, f).replaceAll('\\', '/');
    if (NOT_FOLLOWED.some(re => re.test(rel))) continue;
    out.push(f);
  }
  importCache.set(file, out);
  return out;
}
/** Modules a page reaches within `depth` hops, as paths relative to src with no extension. */
function closure(pageFile, depth = 3) {
  const start = path.join(SRC, 'pages', `${pageFile}.tsx`);
  if (!fs.existsSync(start)) return null;
  const seen = new Map([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const f = queue.shift();
    const d = seen.get(f);
    if (d >= depth) continue;
    for (const n of importsOf(f)) if (!seen.has(n)) { seen.set(n, d + 1); queue.push(n); }
  }
  seen.delete(start);
  return [...seen.keys()].map(f => path.relative(SRC, f).replaceAll('\\', '/').replace(/\.tsx?$/, '')).sort();
}
const closureOf = new Map();
for (const r of routes) if (r.pageFile && !closureOf.has(r.pageFile)) closureOf.set(r.pageFile, closure(r.pageFile));

if (process.argv.includes('--modules')) {
  const users = new Map();
  for (const [page, mods] of closureOf) for (const m of mods || []) { if (!users.has(m)) users.set(m, []); users.get(m).push(page); }
  const shared = [...users].filter(([, p]) => p.length >= 2).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [m, p] of shared) console.log(`${String(p.length).padStart(3)}  ${m}  <- ${p.join(' ')}`);
  console.log(`${shared.length} modules are reached by two or more routed pages`);
}

/* ---- 7. families ---------------------------------------------------------- */
/* First match wins, tested against the modules a page reaches within two hops
   (three where a rule says so). kind says what the pages really share:
     reskin        one mechanic, one page per sport or dataset
     shared engine deep games built on one engine or one board
     shared pool   different games drawing on one player pool or helper
   A page no rule matches is a standalone game with code of its own. */
const FAMILY_RULES = [
  { family: 'Connect 4', kind: 'reskin', test: /^hooks\/use\w*Connect4$/ },
  { family: 'Higher or Lower', kind: 'reskin', test: /^hooks\/use\w*(HL|HigherLower)$/ },
  { family: 'Connections', kind: 'reskin', test: /^hooks\/use\w*Connections$/ },
  { family: 'Conquest', kind: 'reskin', test: /^components\/conquest\/ImperialismBoardShared$/ },
  { family: 'Perfect Season', kind: 'reskin', test: /^hooks\/usePerfectSeasonBest$/ },
  { family: 'Perfect Lineup', kind: 'reskin', test: /^hooks\/usePerfectLineupGeneric$/ },
  { family: 'Gauntlet Draft', kind: 'reskin', test: /^lib\/gauntletEngine$/ },
  { family: 'Grid', kind: 'reskin', test: /^lib\/(gridEngine|gridRarity)$/ },
  { family: 'Career Path guessers', kind: 'reskin', test: /^hooks\/use(CareerGame|\w+Career)$/, also: /^lib\/ensureAnswerInOptions$/ },
  { family: 'Chain', kind: 'reskin', test: /^hooks\/use\w+Chain$/ },
  { family: 'Missing starter', kind: 'reskin', test: /^lib\/missing[A-Z]\w+$/ },
  { family: 'My Career (US sports)', kind: 'shared engine', test: /^components\/us-career\/UsCareerBoard$/ },
  { family: 'Soccer Career', kind: 'shared engine', test: /^lib\/soccerCareerEngine$/ },
  { family: 'Fight sims', kind: 'shared engine', test: /^components\/fight-(career|gym|promoter)\// },
  { family: 'Club Manager engine', kind: 'shared engine', test: /^(hooks\/useClubManager|lib\/managerHotSeat|lib\/deadlineDay)$/ },
  { family: 'Front Office', kind: 'shared engine', test: /^components\/front-office-shared\/GmDeskMount$/ },
  { family: 'College Dynasty', kind: 'shared engine', test: /^components\/college-dynasty\/CollegeDynastyBoard$/ },
  { family: 'Tycoon and idle', kind: 'shared engine', test: /^(components\/tycoon\/\w+|hooks\/useOwnedTimeouts)$/, depth: 3 },
  { family: 'Arcade shots', kind: 'shared engine', test: /^hooks\/useArcadeFlight$/ },
  { family: 'Daily clue guessers', kind: 'reskin', test: /^(hooks\/useScrollToGame|lib\/ensureAnswerInOptions)$/ },
  { family: 'Secret player games', kind: 'shared pool', test: /^lib\/whoAmI$/, not: /^lib\/squadDeal$/ },
  { family: 'Soccer squad builders', kind: 'shared pool', test: /^lib\/squadDeal$/ },
  { family: 'Champions quizzes', kind: 'shared pool', test: /^lib\/champOrNot$/ },
];
const depth2Of = new Map();
function familyOf(pageFile) {
  if (!pageFile) return null;
  if (!depth2Of.has(pageFile)) depth2Of.set(pageFile, closure(pageFile, 2) || []);
  const d2 = depth2Of.get(pageFile);
  const d3 = closureOf.get(pageFile) || [];
  for (const rule of FAMILY_RULES) {
    const mods = rule.depth === 3 ? d3 : d2;
    const hit = mods.filter(m => rule.test.test(m));
    if (!hit.length) continue;
    if (rule.also && !mods.some(m => rule.also.test(m))) continue;
    if (rule.not && mods.some(m => rule.not.test(m))) continue;
    return { family: rule.family, kind: rule.kind, evidence: hit.slice(0, 4) };
  }
  return { family: 'Standalone', kind: 'standalone', evidence: d2.filter(m => /^(hooks|lib)\//.test(m)).slice(0, 4) };
}

/* ---- 8. what kind of page a route is -------------------------------------- */
const LEGAL = new Set(['PrivacyPolicy', 'TermsOfService', 'Accessibility']);
const TRUST = new Set(['About', 'Contact', 'WhatsNew']);
const UTILITY = new Set(['Search', 'Leaderboard', 'Profile', 'ResetPassword', 'AdminLogin', 'AdminReports', 'NotFound']);
const pagesWithNoindex = new Set(
  fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.tsx'))
    .filter(f => /noindex/.test(stripComments(read(path.join(SRC, 'pages', f))))).map(f => f.replace(/\.tsx$/, '')),
);
function typeOf(r) {
  if (r.component === 'Navigate') return ['retired redirect', null];
  if (r.path === '/') return ['hub', 'home page'];
  if (gameByPath.has(r.path)) return ['game', null];
  if (hubRoutes.includes(r.path)) return ['hub', 'sport hub'];
  if (r.path === '/records') return ['reference', 'record books index'];
  if (r.path.startsWith('/records/')) return ['reference', 'record book'];
  if (formatPages.includes(r.path)) return ['reference', 'format history explainer'];
  if (r.pageFile === 'GridArchive') return ['reference', 'grid archive'];
  if (r.pageFile === 'WorldCup2026Results') return ['reference', 'results page'];
  if (LEGAL.has(r.pageFile)) return ['legal', 'policy'];
  if (TRUST.has(r.pageFile)) return ['legal', 'trust page (about, contact, changelog)'];
  if (UTILITY.has(r.pageFile)) return ['utility', r.path === '*' ? 'catch all (404 page)' : null];
  return ['game', 'not in the registry'];
}

/* ---- 9. one record per public URL ---------------------------------------- */
const SITE = 'https://douknowball.com';
const liveTargets = new Set(routes.filter(r => r.component !== 'Navigate').map(r => r.path));
const records = routes.map(r => {
  const [type, subtype] = typeOf(r);
  const g = gameByPath.get(r.path) || null;
  const html = r.path === '/' ? homeHtml : saved.get(r.path);
  const facts = html ? pageFacts(html) : null;
  const fam = type === 'game' ? familyOf(r.pageFile) : null;
  const inA = [...(inboundAll.get(r.path) || [])].sort();
  const inC = [...(inboundContent.get(r.path) || [])].sort();
  const declaresNoindex = !!r.pageFile && pagesWithNoindex.has(r.pageFile);
  let status = 'live';
  if (type === 'retired redirect') status = 'retired, redirects';
  else if (r.path === '*') status = 'catch all';
  else if (r.path.includes(':')) status = 'parameterised, no fixed address';
  else if (facts && facts.hiddenStub) status = 'needs an account, noindex stub';
  else if (declaresNoindex && !sitemap.has(r.path)) status = 'hidden: page asks for noindex and is not submitted';
  let savedKind = null;
  if (r.path === '/') savedKind = 'the template itself (index.html), not prerendered';
  else if (facts) savedKind = facts.retiredStub ? 'retired signpost (meta refresh)' : facts.hiddenStub ? 'noindex stub' : facts.hasSnapshotBlock ? 'prerendered snapshot' : 'other document';
  return {
    url: r.path,
    type, subtype,
    status,
    family: fam ? fam.family : (type === 'reference' && subtype === 'grid archive' ? 'Grid' : null),
    familyKind: fam ? fam.kind : null,
    familyEvidence: fam ? fam.evidence : null,
    component: r.component,
    props: r.props && Object.keys(r.props).length ? r.props : null,
    redirectTo: r.redirectTo ?? null,
    redirectTargetIsLive: r.redirectTo != null ? liveTargets.has(r.redirectTo) : null,
    registry: g ? { label: g.label, sport: g.sport, daily: g.daily, featured: g.featured, addedOn: g.addedOn } : null,
    inSitemap: sitemap.has(r.path),
    sitemapLastmod: sitemap.get(r.path) || null,
    savedPage: facts ? {
      exists: true, kind: savedKind, noindex: facts.noindex, robots: facts.robots, title: facts.title,
      h1: facts.h1, canonical: facts.canonical,
      canonicalIsSelf: facts.canonical === `${SITE}${r.path === '/' ? '/' : r.path}`,
      metaRefreshTo: facts.metaRefreshTo, wordsOutsideChrome: facts.wordsOutsideChrome,
    } : { exists: false },
    pageSourceDeclaresNoindex: declaresNoindex,
    inboundPages: inA.length,
    inboundPagesOutsideChrome: inC.length,
    linkedFromHomeRawHtml: r.path === '/' ? null : inC.includes('/'),
    linkedFromHubs: inC.filter(p => hubRoutes.includes(p)),
    inboundFrom: inA.length <= 8 ? inA : null,
    inboundFromOutsideChrome: inC.length <= 8 ? inC : null,
    outboundPages: (outbound.get(r.path) || []).length || null,
  };
});

/* ---- 10. the lists the brief asks for ------------------------------------- */
const fixed = records.filter(x => !x.url.includes(':') && x.url !== '*');
const routePaths = new Set(routes.map(r => r.path));
const routedPages = new Set(routes.map(r => r.pageFile).filter(Boolean));
const lists = {
  retired: records.filter(x => x.type === 'retired redirect').map(x => ({ from: x.url, to: x.redirectTo, signpostDocument: x.savedPage.exists, signpostNoindex: x.savedPage.noindex ?? null, inboundPages: x.inboundPages })),
  hiddenFromSearch: fixed.filter(x => x.type !== 'retired redirect' && !x.inSitemap).map(x => ({ url: x.url, type: x.type, status: x.status, savedPage: x.savedPage.exists ? x.savedPage.kind : 'none', noindexInSavedPage: x.savedPage.noindex ?? null, inboundPages: x.inboundPages })),
  inSitemapNoSavedPage: fixed.filter(x => x.inSitemap && !x.savedPage.exists).map(x => x.url),
  inSitemapButNoindex: fixed.filter(x => x.inSitemap && x.savedPage.noindex).map(x => x.url),
  savedPageNotInSitemap: [...saved.keys()].filter(p => !sitemap.has(p)).sort().map(p => {
    const rec = records.find(x => x.url === p);
    return { url: p, reason: !rec ? 'NO ROUTE in App.tsx' : rec.type === 'retired redirect' ? `retired, signpost to ${rec.redirectTo}` : rec.status };
  }),
  savedPageWithNoRoute: [...saved.keys()].filter(p => !routePaths.has(p)).sort(),
  sitemapUrlWithNoRoute: [...sitemap.keys()].filter(p => !routePaths.has(p)).sort(),
  liveAndLinkedFromNowhere: fixed.filter(x => x.type !== 'retired redirect' && x.url !== '/' && x.inboundPages === 0).map(x => ({ url: x.url, status: x.status, inSitemap: x.inSitemap })),
  linkedOnlyFromSiteChrome: fixed.filter(x => x.inboundPages > 0 && x.inboundPagesOutsideChrome === 0).map(x => x.url),
  thinlyLinkedSitemapPages: fixed.filter(x => x.inSitemap && x.url !== '/' && x.inboundPages <= 3).map(x => ({ url: x.url, inboundPages: x.inboundPages, from: x.inboundFrom })),
  registeredGamesNotLinkedFromHomeRawHtml: fixed.filter(x => x.registry && !x.linkedFromHomeRawHtml).map(x => x.url),
  registeredGamesNotLinkedFromHomeOrAnyHub: fixed.filter(x => x.registry && !x.linkedFromHomeRawHtml && !x.linkedFromHubs.length).map(x => ({ url: x.url, sport: x.registry.sport, inboundPages: x.inboundPages })),
  linksToRetiredRoutes: records.filter(x => x.type === 'retired redirect' && x.inboundPages > 0).map(x => ({ url: x.url, from: x.inboundFrom || `${x.inboundPages} pages` })),
  indexableUnder150Words: fixed.filter(x => x.inSitemap && x.savedPage.exists && x.savedPage.wordsOutsideChrome < 150).map(x => ({ url: x.url, words: x.savedPage.wordsOutsideChrome })),
  registryGameWithNoRoute: games.filter(g => !routePaths.has(g.path)).map(g => g.path),
  registryGameNotInSitemap: games.filter(g => !sitemap.has(g.path)).map(g => g.path),
  commentedOutInRegistry: commentedOut.map(c => {
    const rec = records.find(x => x.url === c.path);
    return { ...c, today: !rec ? 'no route at all' : rec.type === 'retired redirect' ? `redirects to ${rec.redirectTo}` : rec.status };
  }),
  pageFilesWithNoRoute: fs.readdirSync(path.join(SRC, 'pages')).filter(f => f.endsWith('.tsx')).map(f => f.replace(/\.tsx$/, '')).filter(n => !n.includes('.') && !routedPages.has(n)).sort(),
};

/* ---- 11. counts, the file, the summary ------------------------------------ */
const tally = (rows, key) => {
  const out = {};
  for (const x of rows) { const k = key(x) ?? 'none'; out[k] = (out[k] || 0) + 1; }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
};
const registered = records.filter(x => x.registry);
const families = {};
for (const x of records.filter(r => r.type === 'game')) {
  const f = (families[x.family] ||= { kind: x.familyKind, registered: [], hiddenOutOfRegistry: [] });
  (x.registry ? f.registered : f.hiddenOutOfRegistry).push(x.url);
}
const counts = {
  routeElementsInAppTsx: routes.length,
  byType: tally(records, x => x.type),
  bySubtype: tally(records.filter(x => x.subtype), x => `${x.type}: ${x.subtype}`),
  byStatus: tally(records, x => x.status),
  registryGames: games.length,
  registryGamesBySport: tally(games, g => g.sport),
  registryDaily: games.filter(g => g.daily).length,
  registryFeatured: games.filter(g => g.featured).length,
  gameCountLabelTheSiteDerives: `${Math.floor(games.length / 10) * 10}+`,
  gamesByFamily: Object.fromEntries(Object.entries(families).sort((a, b) => b[1].registered.length - a[1].registered.length || a[0].localeCompare(b[0])).map(([k, v]) => [k, v.registered.length])),
  gamesByFamilyKind: tally(registered, x => x.familyKind),
  sitemapUrls: sitemap.size,
  sitemapByType: tally(records.filter(x => x.inSitemap), x => x.type),
  savedPages: saved.size,
  savedPagesByKind: tally(records.filter(x => x.savedPage.exists && x.url !== '/'), x => x.savedPage.kind),
  documentsACrawlerCanRead: docs.size,
  savedPagesCarryingNoindex: records.filter(x => x.savedPage.noindex).length,
};
const outDoc = {
  generatedBy: 'scripts/auditRoutes.mjs',
  generatedOn: new Date().toISOString().slice(0, 10),
  readFrom: 'the ad-readiness worktree (Release AL): src/App.tsx, src/data/gameRegistry.ts, public/sitemap.xml, public/**/index.html, index.html',
  howToReadIt: {
    inboundPages: 'how many OTHER saved documents carry an anchor to this URL, footer and header links included',
    inboundPagesOutsideChrome: 'the same count with the site chrome (logo link, footer, consent line) left out; the home page has no chrome wrapper so all of its links count',
    family: 'worked out from the modules the page file reaches through its imports; familyEvidence names them',
    familyKind: 'reskin = one mechanic with a page per sport; shared engine = deep games on one engine; shared pool = different games on one pool or helper; standalone = code of its own',
  },
  counts,
  families,
  lists,
  routes: records,
};
if (!process.argv.includes('--dry')) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(outDoc, null, 1) + '\n');
}

const say = (k, v) => console.log(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
say('Route elements in App.tsx', counts.routeElementsInAppTsx);
say('by type', counts.byType);
say('by status', counts.byStatus);
say('registry games', `${counts.registryGames} (label the site derives: ${counts.gameCountLabelTheSiteDerives}), daily ${counts.registryDaily}, featured ${counts.registryFeatured}`);
say('registry games by sport', counts.registryGamesBySport);
say('registered games by family', counts.gamesByFamily);
say('registered games by family kind', counts.gamesByFamilyKind);
say('sitemap URLs', `${counts.sitemapUrls} ${JSON.stringify(counts.sitemapByType)}`);
say('saved pages', `${counts.savedPages} ${JSON.stringify(counts.savedPagesByKind)}, carrying noindex: ${counts.savedPagesCarryingNoindex}`);
for (const [k, v] of Object.entries(lists)) say(`list ${k}`, v.length);
console.log(process.argv.includes('--dry') ? 'dry run, nothing written' : `wrote ${path.relative(ROOT, OUT).replaceAll('\\', '/')} (${records.length} routes)`);
