/**
 * ROUND 526 harness: the sitewide search actually finds things.
 *
 * WHAT IT MEASURES, and why each one is here rather than a "does not crash"
 * check, which for a search engine would be worth almost nothing:
 *
 *   1. RECALL FLOOR, NO EXCEPTIONS. Every game in the registry is findable by
 *      typing its own name, and comes back first. 100 percent or red. A search
 *      box that cannot find a game by its name is not a feature, it is a
 *      liability, so this one has no measured threshold: it has a floor of
 *      everything.
 *   2. RANKING SANITY, WITH TEETH. An exact label match outranks every game
 *      that merely mentions the same word in its description. The check first
 *      proves that such games EXIST for the labels it tests, because a ranking
 *      test with nothing to outrank passes for the wrong reason.
 *   3. REAL QUERIES, MEASURED. Five shapes a person actually types (a first
 *      word, a last word, a five letter prefix, a dropped letter, two swapped
 *      letters) across every game. The floors below are set under what was
 *      measured on healthy code, and the run prints the live numbers so the
 *      next person can see the headroom rather than trust a constant.
 *   4. DETERMINISM. The same query twice is byte identical.
 *   5. NOTHING THROWS. Punctuation, an empty string, one space, four kilobytes
 *      of text, regex metacharacters, emoji, a lone backslash.
 *   6. THE EMPTY QUERY IS A BROWSE STATE, not an empty page.
 *   7. THE GENERATED KEYWORD INDEX covers every game, stays small, and the
 *      search path never imports the long form guides (the Round 210 trap).
 *   8. THE WIRING: the route, the noindex, the skip target, the way in.
 *   9. WHAT THE TYPO TOLERANCE COSTS, in milliseconds, with a ceiling.
 *
 * NEGATIVE CONTROLS, each rewriting a bundled copy of the source and each
 * refusing to run if the string it rewrites is not there (a control that
 * changes nothing is a control that passes for nothing):
 *
 *   SIM_SEARCH_CONTROL=flat     every result scores the same constant
 *   SIM_SEARCH_CONTROL=nofuzzy  the typo fallback never fires
 *   SIM_SEARCH_CONTROL=jitter   the score picks up a random fraction
 *
 * Run: node scripts/simSiteSearch.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/lib/siteSearch.ts');
const CONTROL = process.env.SIM_SEARCH_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
/* Guards that read source read the CODE. Prose about a check is the one place
   the string a check looks for is guaranteed to appear. */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/* ── the engine, bundled out of TypeScript, with the control applied ────── */
const CONTROLS = {
  flat: {
    from: 'score: Math.round(total), matchedOn: best.field',
    to: 'score: 1, matchedOn: best.field',
    breaks: 'ranking: every result scores the same',
  },
  nofuzzy: {
    from: 'if (hit.score === 0) hit = scoreFuzzy(term, e);',
    to: 'if (hit.score === 0) hit = { score: 0, field: \'browse\' };',
    breaks: 'typo tolerance: a misspelled query finds nothing',
  },
  jitter: {
    from: 'score: Math.round(total), matchedOn: best.field',
    to: 'score: Math.round(total) + Math.random(), matchedOn: best.field',
    breaks: 'determinism: the same query twice comes back in a different order',
  },
  /* Round 538. Puts back the exact bug Round 526 shipped: isBrowse answering
     "did this tokenise" instead of "is the box empty", so a query in a script
     the tokeniser cannot read falls into the browse branch and the whole
     catalog comes back as matches. Section 5's new assertions must go red. */
  catalogdump: {
    from: 'export function isBrowse(raw: string): boolean {\n  return normalizeQuery(raw).length === 0;\n}',
    to: 'export function isBrowse(raw: string): boolean {\n  return queryTerms(raw).length === 0;\n}',
    breaks: 'the empty box and an unreadable query collapse back together: every non-Latin query returns all 123 games',
  },
};

let source = fs.readFileSync(SRC, 'utf8');
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (!c) { console.error(`unknown SIM_SEARCH_CONTROL=${CONTROL}, expected one of ${Object.keys(CONTROLS).join(', ')}`); process.exit(1); }
  if (!source.includes(c.from)) {
    console.error(`control run: the string this control rewrites is not in src/lib/siteSearch.ts any more.`);
    console.error(`  looking for: ${c.from}`);
    console.error('  refusing to run a dead control, because it would come back green having changed nothing.');
    process.exit(1);
  }
  source = source.replace(c.from, c.to);
  console.log(`NEGATIVE CONTROL ON (${CONTROL}): ${c.breaks}. This run is SUPPOSED to go red.\n`);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-sitesearch-'));
const ENTRY = path.join(TMP, 'siteSearch.ts');
const BUNDLE = path.join(TMP, 'siteSearch.bundle.mjs');
fs.writeFileSync(ENTRY, source);
execSync(
  `"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node ` +
  `--alias:@="${path.join(ROOT, 'src').replaceAll('\\', '/')}" --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const engine = await import(pathToFileURL(BUNDLE).href);
const { searchSite, normalizeQuery, isBrowse, isUnreadableQuery } = engine;

/* the registry, straight from source, so the harness counts what ships */
const REG_ENTRY = path.join(TMP, 'reg.ts');
const REG_BUNDLE = path.join(TMP, 'reg.bundle.mjs');
fs.writeFileSync(REG_ENTRY, `export { CATEGORIES } from '@/data/gameRegistry';\n`);
execSync(
  `"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${REG_ENTRY}" --bundle --format=esm --platform=node ` +
  `--alias:@="${path.join(ROOT, 'src').replaceAll('\\', '/')}" --outfile="${REG_BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const { CATEGORIES } = await import(pathToFileURL(REG_BUNDLE).href);
const GAMES = CATEGORIES.flatMap(c => c.games.map(g => ({ ...g, sport: c.title })));

console.log(`0) ${GAMES.length} games in the registry, across ${CATEGORIES.length} sports`);
if (GAMES.length < 100) fail(`only ${GAMES.length} games read out of the registry, which means the reader broke rather than the site shrinking that much`);

const rank = (q, p) => searchSite(q).findIndex(r => r.game.path === p);
const wordsOf = s => normalizeQuery(s).split(/[^a-z0-9]+/).filter(Boolean);

/* ── 1: every game is findable by its own name, and comes back first ────── */
console.log('1) every game is findable by typing its own name');
{
  /* Three games share a label with another game ("Connections", "Career Path",
     "82-0 Perfect Season"), so first place is shared: a game with a twin has
     to be inside the first N, where N is how many games wear that name. */
  const shareCount = new Map();
  for (const g of GAMES) {
    const k = normalizeQuery(g.label);
    shareCount.set(k, (shareCount.get(k) || 0) + 1);
  }
  let found = 0, first = 0;
  const misses = [];
  for (const g of GAMES) {
    const at = rank(g.label, g.path);
    if (at >= 0) found += 1;
    const room = shareCount.get(normalizeQuery(g.label));
    if (at >= 0 && at < room) first += 1;
    else misses.push(`${g.label} (${g.path}) came back at position ${at < 0 ? 'nowhere' : at + 1}`);
  }
  console.log(`   found ${found}/${GAMES.length}, ranked first ${first}/${GAMES.length}`);
  for (const m of misses.slice(0, 8)) console.log(`   miss: ${m}`);
  if (found !== GAMES.length) fail(`${GAMES.length - found} games cannot be found by their own name. The floor here is all of them.`);
  if (first !== GAMES.length) fail(`${GAMES.length - first} games are findable but not ranked first for their own name`);
}

/* ── 2: an exact label beats a description mention, and the test has teeth ─ */
console.log('2) an exact label match outranks every game that only mentions the word');
{
  let tested = 0, rivalsTotal = 0, beaten = 0;
  for (const g of GAMES) {
    const labelWords = wordsOf(g.label).filter(w => w.length > 3);
    if (labelWords.length === 0) continue;
    /* other games whose DESCRIPTION carries a word from this label: these are
       exactly the games an exact label search must not lose to */
    const rivals = GAMES.filter(o => o.path !== g.path
      && labelWords.some(w => wordsOf(o.description).includes(w)));
    if (rivals.length === 0) continue;
    tested += 1;
    rivalsTotal += rivals.length;
    const mine = rank(g.label, g.path);
    const worst = rivals
      .map(o => ({ o, at: rank(g.label, o.path) }))
      .filter(r => r.at >= 0)
      .sort((a, b) => a.at - b.at)[0];
    if (mine < 0) { fail(`${g.label} does not rank for its own label at all`); continue; }
    if (worst && worst.at < mine) {
      fail(`searching "${g.label}" puts ${worst.o.label} (a description mention) above it`);
    } else beaten += 1;
  }
  console.log(`   ${tested} labels had a real rival to beat (${rivalsTotal} rival games in total), ${beaten} won`);
  /* A ranking check with nothing to outrank is green for the wrong reason. */
  if (tested < 20) fail(`only ${tested} labels had any rival at all, so this section is not measuring ranking`);
}

/* ── 3: the shapes people really type, measured ─────────────────────────── */
console.log('3) realistic queries: partial words and typos');
{
  const drop = w => (w.length < 5 ? w : w.slice(0, Math.floor(w.length / 2)) + w.slice(Math.floor(w.length / 2) + 1));
  const swap = w => (w.length < 4 ? w : w[0] + w[2] + w[1] + w.slice(3));
  const shapes = [
    ['first word', g => wordsOf(g.label)[0]],
    ['last word', g => wordsOf(g.label).slice(-1)[0]],
    /* Punctuation becomes a space rather than disappearing, because that is
       what typing the first five characters of "17-0 Perfect Season" actually
       produces. Deleting the hyphen instead invents the query "170 p", which
       nobody types and which the first draft of this harness then reported as
       an engine failure. */
    ['five letter prefix', g => normalizeQuery(g.label).replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5)
      .trim()],
    ['a dropped letter', g => drop(wordsOf(g.label).slice().sort((a, b) => b.length - a.length)[0] || '')],
    ['two letters swapped', g => swap(wordsOf(g.label).slice().sort((a, b) => b.length - a.length)[0] || '')],
  ];
  const TOP = 5;
  const scores = [];
  for (const [name, make] of shapes) {
    let any = 0, top = 0, n = 0;
    for (const g of GAMES) {
      const q = make(g);
      if (!q || q.length < 2) continue;
      n += 1;
      const at = rank(q, g.path);
      if (at >= 0) any += 1;
      if (at >= 0 && at < TOP) top += 1;
    }
    const anyPct = Math.round((any / n) * 1000) / 10;
    const topPct = Math.round((top / n) * 1000) / 10;
    scores.push({ name, n, anyPct, topPct });
    console.log(`   ${name.padEnd(20)} ${n} queries: found ${anyPct}%, in the top ${TOP} ${topPct}%`);
  }
  /* FLOORS, SET FROM MEASUREMENT, 2026-09-11, on healthy code at 121 games:
       first word          found 100%, top5 87.6%
       last word           found 100%, top5 87.7%
       five letter prefix  found 100%, top5 96.7%
       a dropped letter    found 100%, top5 90.1%
       two letters swapped found 100%, top5 90.1%
     Every shape finds the game every time, so the "found" floor is the same
     100 the exact name check uses: a search that cannot survive one dropped
     letter is not typo tolerant in any useful sense.
     The top-5 floor is 80. The worst shape is 87.6 and what holds it there is
     not a weakness in the ranking, it is that nine games begin with the word
     "Guess" and only five of them fit in a top five. So the gap between the
     floor and the measurement is roughly nine more same-named games, which is
     a lot of headroom, while the numbers a real break produces are far below
     it: measured under the controls, collapsing every score to a constant
     takes the worst shape to 54.5% and turning the typo fallback off takes the
     two shapes that need it to 7.4% and 5%. */
  const FOUND_FLOOR = 100;
  const TOP5_FLOOR = 80;
  for (const s of scores) {
    if (s.anyPct < FOUND_FLOOR) fail(`"${s.name}" queries find the game only ${s.anyPct}% of the time (floor ${FOUND_FLOOR}%)`);
    if (s.topPct < TOP5_FLOOR) fail(`"${s.name}" queries put the game in the top ${TOP} only ${s.topPct}% of the time (floor ${TOP5_FLOOR}%)`);
  }
  const worst = scores.slice().sort((a, b) => a.topPct - b.topPct)[0];
  console.log(`   worst shape: ${worst.name} at ${worst.topPct}% in the top ${TOP}, floor ${TOP5_FLOOR}%`);
}

/* ── 4: the same query twice is the same answer twice ───────────────────── */
console.log('4) determinism');
{
  const battery = ['', ' ', 'grid', 'hockey grid', 'NBA', 'nba', 'Footle', 'fotle', 'club manager',
    'daily', 'soccer career', 'zzzz', 'connect 4', 'guess', 'the', 'career'];
  let same = 0;
  for (const q of battery) {
    const a = JSON.stringify(searchSite(q).map(r => [r.game.path, r.score, r.matchedOn]));
    const b = JSON.stringify(searchSite(q).map(r => [r.game.path, r.score, r.matchedOn]));
    if (a === b) same += 1; else fail(`"${q}" came back different the second time`);
  }
  console.log(`   ${same}/${battery.length} queries byte identical on a second call`);
}

/* ── 5: nothing a person can type makes it throw ────────────────────────── */
console.log('5) hostile input');
{
  const hostile = ['', ' ', '   ', '*', '(', '[a-z]+', '\\', '.*', '?', '$^', '()|', '/', '//', ' ',
    'a'.repeat(4096), '🏒🏒🏒', 'ø ł æ', 'Ödegaard', '你好', '-', '--', '+', 'NaN', 'undefined', 'null',
    '<script>', '"', "'", '{}', '%%%'];
  let ok = 0;
  for (const q of hostile) {
    try {
      const r = searchSite(q);
      if (!Array.isArray(r)) { fail(`"${q.slice(0, 20)}" returned something that is not an array`); continue; }
      ok += 1;
    } catch (e) {
      fail(`"${q.slice(0, 20)}" threw: ${e && e.message}`);
    }
  }
  console.log(`   ${ok}/${hostile.length} survived, including 4096 characters and every regex metacharacter`);

  /* THE CHECK THIS SECTION WAS MISSING, and worth writing down rather than
     just adding. Until Round 538 this section asserted only `Array.isArray`,
     on exactly the inputs where the engine was most wrong. A 123 element array
     passes that, so the section was green while every non-Latin and
     punctuation-only query below returned THE WHOLE CATALOG, which the home
     page then drew as search results. That is CLAUDE.md's "a harness that only
     proves no crash is close to worthless", and this is what it costs: the
     check ran, on the right inputs, and proved nothing.

     A non-empty query is a question. The answer may legitimately be nothing.
     It may never be everything. */
  const typedSomething = ['*', '(', '\\', '.*', '?', '$^', '()|', '/', '//', '-', '--', '%%%', '{}',
    '🏒🏒🏒', '你好', 'サッカー', 'хоккей', '"', "'", '<script>'];
  let bounded = 0;
  for (const q of typedSomething) {
    const r = searchSite(q);
    if (r.length === GAMES.length) fail(`"${q}" returned the entire ${GAMES.length} game catalog, which the home page draws as matches`);
    else bounded += 1;
    if (isBrowse(q)) fail(`isBrowse("${q}") is true, but the person typed something: browse is for an EMPTY box`);
  }
  console.log(`   ${bounded}/${typedSomething.length} non-empty queries answered with something other than the whole catalog`);

  /* And the two states stay distinguishable, which is the invariant under it. */
  for (const q of ['', '   ']) {
    if (!isBrowse(q)) fail(`isBrowse(${JSON.stringify(q)}) should be true for an empty box`);
    if (isUnreadableQuery(q)) fail(`isUnreadableQuery(${JSON.stringify(q)}) should be false for an empty box`);
  }
  const unreadables = ['你好', 'サッカー', 'хоккей', '%%%', '🏒'];
  let unreadable = 0;
  for (const q of unreadables) {
    if (!isUnreadableQuery(q)) fail(`isUnreadableQuery("${q}") should be true: real text, no terms`);
    else unreadable += 1;
    if (searchSite(q).length !== 0) fail(`"${q}" should return no matches, not a list`);
  }
  console.log(`   ${unreadable}/${unreadables.length} unreadable queries reported as unreadable rather than as a browse`);
}

/* ── 6: an empty query is a browse state ────────────────────────────────── */
console.log('6) the empty query browses instead of failing');
{
  for (const q of ['', '   ', '\t']) {
    const r = searchSite(q);
    if (r.length !== GAMES.length) fail(`"${JSON.stringify(q)}" returned ${r.length} games, expected all ${GAMES.length}`);
    const paths = r.map(x => x.game.path);
    if (new Set(paths).size !== paths.length) fail('the browse list repeats a game');
    if (r.some(x => x.matchedOn !== 'browse')) fail('the browse list claims to have matched something');
  }
  const order = searchSite('').map(r => r.game.path).join(',');
  const registryOrder = GAMES.map(g => g.path).join(',');
  if (order !== registryOrder) fail('the browse list is not in registry order, so the sports come out shuffled');
  console.log(`   all ${GAMES.length} games, registry order, no repeats`);
}

/* ── 7: the generated index, and the trap it exists to avoid ────────────── */
console.log('7) the generated keyword index');
{
  const kwPath = path.join(ROOT, 'src/data/searchKeywords.json');
  if (!fs.existsSync(kwPath)) fail('src/data/searchKeywords.json is missing, run node scripts/genSearchKeywords.mjs');
  else {
    const bytes = fs.statSync(kwPath).size;
    const kw = JSON.parse(fs.readFileSync(kwPath, 'utf8'));
    const covered = GAMES.filter(g => kw.k && kw.k[g.path]).length;
    const guideBytes = fs.readdirSync(path.join(ROOT, 'src/data/gameContent'))
      .reduce((n, f) => n + fs.statSync(path.join(ROOT, 'src/data/gameContent', f)).size, 0);
    console.log(`   ${bytes} bytes covering ${covered}/${GAMES.length} games, against ${guideBytes} bytes of guides`);
    if (covered < GAMES.length) {
      fail(`${GAMES.length - covered} games have no keywords. A new game needs: node scripts/genSearchKeywords.mjs`);
    }
    /* Round 538: COVERAGE IS NOT FRESHNESS, and coverage was all this asserted.
       A game with an entry passes the check above forever, so editing a guide in
       src/data/gameContent left the keywords describing the old text with every
       check still green. The generator already computes the answer and writes it
       into the file as `source`; its own comment called that "a note, not a
       gate". Nothing read it. Recomputing it here is what turns it into one, and
       it catches the edit case that coverage structurally cannot. */
    const liveHash = createHash('sha256')
      .update(fs.readdirSync(path.join(ROOT, 'src/data/gameContent')).sort()
        .map(f => fs.readFileSync(path.join(ROOT, 'src/data/gameContent', f), 'utf8')).join('\n'))
      .digest('hex').slice(0, 16);
    if (kw.source !== liveHash) {
      fail(`the guides have changed since the keyword index was built (index ${kw.source}, guides now ${liveHash}). Rerun: node scripts/genSearchKeywords.mjs`);
    } else {
      console.log(`   guide hash ${liveHash} matches the index, so the keywords describe the guides that ship`);
    }
    /* An entry for a game that no longer exists is the other direction, and the
       file could only ever grow without this. */
    const stale = Object.keys(kw.k || {}).filter(p => !GAMES.some(g => g.path === p));
    if (stale.length) fail(`the keyword index still carries ${stale.length} removed game(s): ${stale.join(', ')}`);
    /* Measured 9505 bytes at 121 games, about 79 bytes a game. The ceiling is
       double that per game, which leaves room for the site to grow and still
       goes red if somebody decides to paste whole paragraphs in here. */
    const perGame = bytes / Math.max(1, GAMES.length);
    if (perGame > 160) fail(`the keyword index is ${Math.round(perGame)} bytes a game, which is no longer a keyword index`);
    for (const [p, v] of Object.entries(kw.k || {})) {
      if (typeof v !== 'string') fail(`${p} has a keyword value that is not a string`);
      /* the governing body's name on its own reads as the video game, and
         scripts/simNoRivalNames.mjs allows it only in context */
      else if (/fifa/i.test(v)) fail(`${p} carries that token bare, which the rival name guard only allows in context`); // rival-names-allow: this line is the guard, not a mention
    }
  }
  /* THE ROUND 210 TRAP. src/data/gameContent is 344KB of source split into
     lazy per sport bundles on purpose. An import of it from the search path
     would hand every visitor the lot. */
  for (const f of ['src/lib/siteSearch.ts', 'src/pages/Search.tsx']) {
    const s = strip(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (/from\s+['"][^'"]*gameContent/.test(s)) {
      fail(`${f} imports src/data/gameContent, which undoes Round 210's lazy split for every visitor`);
    }
  }
  console.log('   neither the engine nor the page imports the long form guides');
}

/* ── 8: the wiring ──────────────────────────────────────────────────────── */
console.log('8) the route, the noindex, the skip target, the way in');
{
  const app = strip(fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8'));
  const m = app.match(/<Route\s+path="\/search"\s+element=\{\s*<(\w+)/);
  if (!m) fail('there is no /search route in App.tsx');
  else if (!fs.existsSync(path.join(ROOT, `src/pages/${m[1]}.tsx`))) {
    /* genHiddenStubs.mjs and prerender.mjs find a hidden page by taking the
       component name out of the Route and looking for a file called that. A
       mismatch costs /search its snapshot silently, and the address then
       serves a copy of the home page. */
    fail(`the /search route renders <${m[1]}> but there is no src/pages/${m[1]}.tsx, so the prerenderer will not photograph it`);
  }
  const page = strip(fs.readFileSync(path.join(ROOT, 'src/pages/Search.tsx'), 'utf8'));
  if (!/\bnoindex\b/.test(page)) fail('the search page does not pass noindex, so an unsubmitted route is asking to be indexed');
  if (!page.includes('id="dukb-main"')) fail('the search page has no dukb-main, so the skip link lands nowhere');
  if (!page.includes("path=\"/search\"")) fail('the search page does not tell PageSeo its own path');
  const footer = strip(fs.readFileSync(path.join(ROOT, 'src/components/game/Footer.tsx'), 'utf8'));
  if (!footer.includes('to="/search"')) fail('nothing in the footer points at /search, so the page exists and nobody can reach it');
  const sitemapGen = strip(fs.readFileSync(path.join(ROOT, 'scripts/genSitemap.mjs'), 'utf8'));
  if (sitemapGen.includes("'/search'")) {
    fail("/search is in the sitemap's static pages while the page itself says noindex, which are two opposite instructions");
  }
  console.log('   route named after its file, noindex, skip target, footer link, and not submitted');
}

/* ── 9: what the typo tolerance costs ───────────────────────────────────── */
console.log('9) the cost of a keystroke');
{
  const hits = ['grid', 'hockey', 'career', 'nba', 'club manager', 'daily'];
  const typos = ['fotle', 'hockkey', 'carrer', 'managr', 'connectoins', 'soccre'];
  const time = qs => {
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 200; i += 1) searchSite(qs[i % qs.length]);
    return Number(process.hrtime.bigint() - t0) / 1e6 / 200;
  };
  searchSite('warm up');
  const hitMs = time(hits);
  const typoMs = time(typos);
  console.log(`   a query that matches: ${hitMs.toFixed(3)}ms. A query that has to fall back to spelling: ${typoMs.toFixed(3)}ms`);
  console.log(`   the typo fallback costs ${(typoMs / hitMs).toFixed(1)}x a plain query`);
  /* Measured 2026-09-11 on this machine: 0.04ms matched, 0.5ms with the
     fallback, about 12x. The ceiling is 8ms, which is more than a hundred
     times the measured cost and still inside one 60fps frame, so this fails
     on an algorithm that got slow rather than on a busy machine. */
  if (typoMs > 8) fail(`a misspelled query takes ${typoMs.toFixed(2)}ms, which is a visible stall on every keystroke`);
}

fs.rmSync(TMP, { recursive: true, force: true });

console.log('');
if (CONTROL) {
  if (failures > 0) {
    console.log(`simSiteSearch control (${CONTROL}): green. The break was reported, ${failures} finding${failures === 1 ? '' : 's'}.`);
    process.exit(0);
  }
  console.error(`simSiteSearch control (${CONTROL}): RED. The source was broken and every check still passed, so they prove nothing.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simSiteSearch: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simSiteSearch: green. Every game is findable by name, typos included, and the ranking can explain itself.');
