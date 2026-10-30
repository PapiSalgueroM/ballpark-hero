/* Round 1584: a club merged with its namesake, found without a list of suspects (section D), and Soccer Grid's
 * "Played for Arsenal" no longer satisfied by a stint at another club that carries the word (section G).
 *
 * Pure node over committed files, no network, no database. Every source read is CRLF normalised first and read with
 * its comments stripped, so a comment can never satisfy an anchor.
 *
 * D, THE DETECTION. scripts/lib/clubNamesakeDetect.mjs (the JS twin of scripts/qa/clubNamesakes1584Detect.sql, which
 *    scripts/qa/rehearseClubNamesakes1584.mjs runs in PGlite against it) over scripts/data/clubNamesakes1584/
 *    detectFixture.json must return exactly the fixture's committed expected list. Measured on the lead's offline
 *    pulls (8 years, 49,803 rows, 1,422 club years of 12 or more with a nationality) and reproduced on the fixture:
 *    20 S2 rows and 2 S1 rows, Arsenal FC's Argentine bloc in 2010, 2011, 2015 and 2016 and Arsenal FC as the one S1
 *    club year in 2010 and 2011 (the critic's own count on the same pulls). It is a candidate list, never a verdict:
 *    the size of a bloc is not the number of Sarandi men (Emiliano Martinez sits in 2016's), so no k is asserted.
 *    percentile_cont interpolates, and so must the mirror: a known quartile is checked directly.
 * G, THE GRID RULE. norm, TRANSLIT, CLUB_ALIASES, CLUB_NAMESAKES, clubMatches and parseCriterion are taken out of
 *    supabase/functions/soccer-grid-validate/index.ts by name (each anchor once, or red), compiled and run over the
 *    match matrix: every stored stint club string we hold (the lead's Q3b of every string carrying "arsenal", every
 *    club of the Q3c stints of the 216 Arsenal FC men, every club of the detection fixture, and the excluded strings
 *    themselves) by every grid club label (the lead's Q5 export plus src/data/soccerGridPuzzles.ts), each label read
 *    through the function's own parseCriterion. Against the same matrix with CLUB_NAMESAKES emptied (the rule before
 *    this round), the ONLY cells that differ are ("Arsenal", a string with an excluded part), each excluded string
 *    flips, nothing flips from no to yes, London's "Arsenal FC", "U21", "U18" and split rows still match, and no label
 *    that had a match loses its last one. The ledger keeps exactly London's four strings, and every string of Q3b
 *    the old rule reads as Arsenal is kept or excluded (completeness: a string forgotten in both the function and the
 *    ledger passes every other check). Then the hand mirror in scripts/simSoccerGridLabels.mjs (its norm, its two
 *    map reads and its clubMatches, run on the same source text) must agree with the function on every cell
 *    (critic advice 20: that file pages production and is never run by a builder, so this is its proof).
 *
 * Controls, SIM_NAMESAKE_CONTROL=<name>; each asserts the thing it changes exists before changing it (exit 2,
 * ABORTED, when it does not). Its last line says FIRED only when it was applied and a check went red (exit 1); applied
 * with every check green prints DID NOT FIRE and exits 3:
 *   blind       the detector returns nothing: D is red.
 *   unmerge     the Arsenal FC rows of the Argentine candidates the lead's live Q1 named are taken out of the fixture
 *               by id: Arsenal FC must leave the list, so D is red, and the run aborts if Arsenal stays (the check
 *               would then be seeing a constant, not the bloc).
 *   noexclude   CLUB_NAMESAKES emptied in the function's text: the excluded cells accept again, G is red.
 *   wide        "Arsenal FC" added to the exclusion: the only-these-cells check and the London check go red.
 *   mirrordrift the namesake line taken out of the mirror's clubMatches: the mirror check goes red.
 *   onehost     Arsenal Tula's second source dropped: N is red.
 *   forget      "Arsenal Kyiv (-2019)" dropped from the function AND gridNamesakes.json: only completeness is red.
 * N, THE HOSTS. Every excluded string in scripts/data/clubNamesakes1584/gridNamesakes.json stands on two registrable
 *    hosts (soccerway's regional mirrors are one host), none a wiki, at most one Transfermarkt, each with its url, the
 *    date read and a one line summary.
 * L, THE LEDGER (Round 1587). arsenalLedger.json must equal what scripts/qa/genArsenalLedger1587.mjs writes from the
 *    lead's Q2 export and the committed page list (so a verdict is never typed), every man is sarandi or london
 *    (measured: 74 men, 56 sarandi on 110 rows, 18 london), each on two hosts by N's rule, and the stored name
 *    'Arsenal de Sarandí' on two hosts.
 * T, THE TRIPWIRE (Round 1587). Every Q2 row with a CONMEBOL nationality token, an empty nationality or Arsenal FC as
 *    the middle of a three part split (160 rows) belongs to a judged man, and no row id sits in two men. While the
 *    migration does not exist it may print pending; once it exists pending must be 0. The ROSTER NET is computed here
 *    too, from the committed pages with a name match written a second time (review 1587 minor 3): every Q2 row whose
 *    man is listed on a fetched Sarandí page, whatever his stored nationality, belongs to a judged man.
 * M, THE PAYLOAD (Round 1587). The applied form's market payload is exactly the ledger's sarandi rows (110), the
 *    generator rerun on the committed exports gives the committed payload (56 stints, 0 held), every Arsenal FC stint
 *    of Q3 moves exactly when critic 2's rule says so (written a second time here, so the generator is not its own
 *    judge), the record and the applied form carry one payload line with its md5 and N and M, and the committed
 *    migration is byte for byte the generator's. Every part the payload writes in place of Arsenal FC is in
 *    soccer-grid-validate's own CLUB_NAMESAKES.arsenal after its norm, and its clubMatches reads no payload club as
 *    Arsenal (review 1587 minor 2: the stored name and the grid's exclusion are tied by the code, not by two copies).
 * F, THE APPLY'S FRESH EXPORT STEPS (review 1587 major 1). APPLY-1587 steps 2 and 3, run as the lead runs them (the
 *    two generators as child processes with --check) on the committed exports copied byte for byte under DATED names:
 *    both exit 0 with "same:" twice; the same pair with one payload row's value moved (h recomputed) stops step 3
 *    (exit 1, DIFFERS); and the payload generator refuses to write from a fresh export (exit 2).
 * C, THE OTHER TWO CACHES (review 1587 major 2). scripts/qa/genArsenalCachePurge1587.mjs over a made up Q6
 *    (scripts/lib/arsenalCacheFixture1587.mjs, keys built the way validate-player and football-connect4-validate
 *    write them): exactly the sarandi man's Build Your XI yes, Connect 4 pair yes and Connect 4 fact are deleted, a
 *    last name only key is held, refusals, the london man, another club and a Soccer Grid row are kept; the form
 *    carries its md5 and K; the generator run as the lead runs it exits 0 with that K.
 * P, THE STATE AFTER (Round 1587). Q2 with the payload applied: no sarandi row reads Arsenal FC, each reads its old
 *    club with Arsenal FC replaced by 'Arsenal de Sarandí', every other row byte equal; once the lead commits
 *    arsenalMarketPost-<date>.json it must equal that state row for row.
 * R, RARITY ROUND (Round 1587). rarityRound.ts's club-arsenal pool built from the state after holds no sarandi man
 *    (measured: 217 names before, 161 after). The pool filter is the SHIPPED one: fetchClubPool's .or() string and the
 *    club the category passes, read out of the source and evaluated (review 1587 minor 10).
 * Round 1587 controls: manhost (the first two source sarandi man loses one), wiki (his statscrew source becomes
 *    en.wikipedia.org), twotm (both his sources Transfermarkt): L is red. unjudged (a made up Argentine row added to Q2
 *    in memory): T is red once the migration exists. payload (one market row dropped from the parsed payload): M red.
 *    londonspan (a london row of a moved stint's name and nationality added inside its span, critic 2): the stint
 *    must be held, so M is red. leak (one sarandi row put back to Arsenal FC in the state after): P and R red.
 *    unmerge now removes the ledger's sarandi rows by id. freshmoved (the "unchanged" fresh Q2 carries a moved value)
 *    and freshstill (the "moved" fresh Q2 is left unchanged): F is red. namesakedrift (every payload club spelled
 *    'Arsenal Sarandí' in memory): M's tie to the grid's exclusion is red. nonet (the first man who came in by the
 *    roster net only, Joel Soñora or Nicolás Giménez, taken out of the ledger in memory): T's roster net check is red.
 *    widepool (fetchClubPool's bare string condition widened to club.like."Arsenal*" in the source text): R is red.
 *    purgeblind (the fixture's sarandi man taken out of the ledger the cache purge reads): C is red.
 *
 * Run: node scripts/simClubNamesakes.mjs            (green: the closing line and exit 0) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as detectLib from './lib/clubNamesakeDetect.mjs';
import { buildGridRule, stripComments, braceEnd, onceAt } from './lib/gridRuleFromSource.mjs';
import * as ARSENAL from './qa/genArsenalLedger1587.mjs';
import * as SQL1587 from './qa/genClubNamesakes1587.mjs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { marketHash } from './lib/arsenalGuard1587.mjs';
import * as PURGE from './qa/genArsenalCachePurge1587.mjs';
import { cacheFixture } from './lib/arsenalCacheFixture1587.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584');
const MIGRATION_PATH = 'supabase/migrations/20261101120000_round_1587_arsenal_de_sarandi.sql';
const CONTROLS = ['blind', 'unmerge', 'noexclude', 'wide', 'mirrordrift', 'onehost', 'forget',
  'manhost', 'wiki', 'twotm', 'unjudged', 'payload', 'londonspan', 'leak', 'freshmoved', 'freshstill', 'namesakedrift', 'nonet', 'widepool', 'purgeblind'];
const WIKI_HOST = /(^|\.)(wikipedia|wikidata|wikimedia|fandom|wikiwand)\./i;
const regDomain = h => h.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
/* two registrable hosts (soccerway's and ESPN's regional mirrors are one host each), no wiki, at most one Transfermarkt,
   and every source with its https url on its own host, the date read and a one line summary */
const twoHosts = sources => {
  const hosts = sources.map(s => s.host);
  return new Set(hosts.map(regDomain)).size >= 2 && hosts.filter(h => /transfermarkt/i.test(h)).length <= 1
    && !hosts.some(h => WIKI_HOST.test(h))
    && sources.every(s => s.host && /^https:\/\//.test(s.url) && s.read && s.says && regDomain(new URL(s.url).hostname) === regDomain(s.host));
};
const CONTROL = process.env.SIM_NAMESAKE_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_NAMESAKE_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')}), ABORTED`);
  process.exit(2);
}
const abort = m => { console.error(`control ${CONTROL}: ${m}, ABORTED`); process.exit(2); };
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const fired = [];

const readText = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const readJson = f => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* ---------------------------------------------------------------- D */
console.log('D) the detection finds the merged club on the fixture');
{
  const fx = readJson('detectFixture.json');
  let rows = fx.rows;
  let detect = detectLib.detectNamesakes;
  if (CONTROL === 'blind') {
    if (typeof detect !== 'function') abort('the detector is not exported');
    detect = () => [];
    fired.push('blind: the detector returned nothing');
  }
  if (CONTROL === 'unmerge') {
    /* Round 1587: the ledger's sarandi rows (arsenalLedger.json, real table ids, the same ids the fixture carries) are
       taken out by id; Round 1584 used the surnames the lead's live Q1 named, before a ledger existed */
    const sarRows = new Set(readJson(ARSENAL.LEDGER_FILE).men.filter(m => m.verdict === 'sarandi').flatMap(m => m.rows));
    const out = new Set(rows.filter(r => sarRows.has(r.id)).map(r => r.id));
    if (!out.size) abort('no row of a ledger sarandi man is in the fixture');
    rows = rows.filter(r => !out.has(r.id));
    const left = detect(rows).filter(d => d.club === 'Arsenal FC');
    if (left.length) abort(`${out.size} rows removed and Arsenal FC is still flagged (${left.map(d => d.signal + ' ' + d.year).join(', ')})`);
    fired.push(`unmerge: the ${out.size} fixture rows of the ledger's sarandi men removed by id, Arsenal FC left the list`);
  }
  const got = detect(rows);
  if (JSON.stringify(got) === JSON.stringify(fx.expected)) ok(`the mirror returns the committed list exactly (${fx.expected.length} rows)`);
  else fail(`the mirror returns ${got.length} rows, the committed list holds ${fx.expected.length}`);
  const flagged = new Set(got.map(d => `${d.signal} ${d.club} ${d.year} ${d.nat ?? ''}`.trim()));
  const WANT = ['S2 Arsenal FC 2010 Argentina', 'S2 Arsenal FC 2011 Argentina', 'S2 Arsenal FC 2015 Argentina',
    'S2 Arsenal FC 2016 Argentina', 'S1 Arsenal FC 2010', 'S1 Arsenal FC 2011'];
  const missing = WANT.filter(w => !flagged.has(w));
  if (!missing.length) ok('Arsenal FC is flagged where the critic measured it: S2 2010, 2011, 2015, 2016 and S1 2010, 2011');
  else fail(`Arsenal FC is not flagged at ${missing.join(', ')}`);
  const s1 = got.filter(d => d.signal === 'S1');
  if (s1.length && s1.every(d => d.club === 'Arsenal FC')) ok(`S1 flags only Arsenal FC (${s1.length} club years)`);
  else fail(`S1 flags ${s1.map(d => d.club + ' ' + d.year).join(', ') || 'nothing'}`);
  const q = detectLib.percentileCont([1, 2, 3, 4], 0.25);
  if (q === 1.75) ok('the quartile interpolates as percentile_cont does (1, 2, 3, 4 gives 1.75)');
  else fail(`the quartile of 1, 2, 3, 4 is ${q}, percentile_cont gives 1.75`);
}

/* ---------------------------------------------------------------- G */
console.log('G) the grid rule changes only the (Arsenal, namesake) cells');
const FN_PATH = 'supabase/functions/soccer-grid-validate/index.ts';
const FN_RAW = readText(FN_PATH);
const LEDGER = readJson('gridNamesakes.json');
const FORGOTTEN = 'Arsenal Kyiv (-2019)';
if (CONTROL === 'forget') {
  if (LEDGER.excluded.filter(e => e.stored === FORGOTTEN).length !== 1) abort(`"${FORGOTTEN}" is not in gridNamesakes.json once`);
  LEDGER.excluded = LEDGER.excluded.filter(e => e.stored !== FORGOTTEN);
}
const EXCLUDED = LEDGER.excluded.map(e => e.stored);
const KEPT = (LEDGER.kept ?? []).map(e => e.stored);
const once = (text, anchor, what) => {
  const at = onceAt(text, anchor);
  if (at < 0) fail(`${what}: the anchor "${anchor}" is not in the text exactly once`);
  return at;
};
/* every piece of the rule by name, out of the comment stripped source, compiled as TypeScript (the shared builder) */
const buildRule = (raw, what) => buildGridRule(raw, { onFail: m => fail(`${what}: ${m}`) });
const NAMESAKE_BLOCK = /const CLUB_NAMESAKES: Record<string, string\[\]> = \{[\s\S]*?\n\};/;
let headRaw = FN_RAW;
if (CONTROL === 'noexclude') {
  if (!NAMESAKE_BLOCK.test(headRaw)) abort('CLUB_NAMESAKES is not in the function');
  headRaw = headRaw.replace(NAMESAKE_BLOCK, 'const CLUB_NAMESAKES: Record<string, string[]> = {};');
  fired.push('noexclude: CLUB_NAMESAKES emptied in the function text');
}
if (CONTROL === 'wide') {
  const anchor = '  "arsenal": [\n';
  if (headRaw.split(anchor).length !== 2) abort('the "arsenal" entry of CLUB_NAMESAKES is not in the function once');
  headRaw = headRaw.replace(anchor, anchor + '    "Arsenal FC",\n');
  fired.push('wide: "Arsenal FC" added to the exclusion');
}
if (CONTROL === 'forget') {
  const anchor = `"${FORGOTTEN}", `;
  if (headRaw.split(anchor).length !== 2) abort(`"${FORGOTTEN}" is not in the function once`);
  headRaw = headRaw.replace(anchor, '');
  fired.push(`forget: "${FORGOTTEN}" dropped from the function and from gridNamesakes.json together`);
}
const head = buildRule(headRaw, 'the function');
let ARSENAL_VALUE = null;
const baseRaw = NAMESAKE_BLOCK.test(FN_RAW) ? FN_RAW.replace(NAMESAKE_BLOCK, 'const CLUB_NAMESAKES: Record<string, string[]> = {};') : FN_RAW;
const base = buildRule(baseRaw, 'the function with the map emptied');

if (head && base) {
  const codeList = (head.CLUB_NAMESAKES.arsenal ?? []).slice().sort();
  const ledgerList = EXCLUDED.slice().sort();
  if (CONTROL !== 'noexclude') {
    if (JSON.stringify(codeList.filter(s => s !== 'Arsenal FC')) === JSON.stringify(ledgerList)) ok(`the function excludes exactly the ${ledgerList.length} strings gridNamesakes.json sources`);
    else fail(`the function excludes ${codeList.join(', ')}; gridNamesakes.json sources ${ledgerList.join(', ')}`);
  }
  /* the universe of stored stint club strings we hold, and the grid's club labels */
  const clubs = new Set([...EXCLUDED]);
  for (const r of readJson('stintClubsArsenal-2026-10-29.json')) clubs.add(r.club);
  for (const r of readJson('stintsArsenalMen-2026-10-29.json')) clubs.add(r.club);
  for (const r of readJson('detectFixture.json').rows) clubs.add(r.club);
  const labelTexts = new Set(readJson('gridClubLabels-2026-10-29.json').map(r => r.label));
  const puzzles = stripComments(readText('src/data/soccerGridPuzzles.ts'));
  for (const m of puzzles.matchAll(/label:\s*'([^']+)',\s*type:\s*'club'/g)) labelTexts.add(m[1]);
  const labels = [...labelTexts].map(t => ({ t, c: head.parseCriterion(t) })).filter(x => x.c.kind === 'club');
  const arsenal = labels.filter(x => head.norm(x.c.value) === 'arsenal');
  if (arsenal.length) ARSENAL_VALUE = arsenal[0].c.value;
  if (arsenal.length) ok(`${labels.length} club labels by ${clubs.size} stint club strings; the Arsenal label reads "${arsenal[0].t}"`);
  else fail('no grid label reads Played for Arsenal');
  const flipped = [];
  const added = [];
  const lostLabels = [];
  for (const { t, c } of labels) {
    let baseAny = false, headAny = false;
    for (const club of clubs) {
      const b = base.clubMatches(club, c.value), h = head.clubMatches(club, c.value);
      baseAny ||= b; headAny ||= h;
      if (b && !h) flipped.push({ t, v: c.value, club });
      if (!b && h) added.push({ t, club });
    }
    if (baseAny && !headAny) lostLabels.push(t);
  }
  const stray = flipped.filter(f => head.norm(f.v) !== 'arsenal' || !f.club.split(' / ').some(p => EXCLUDED.includes(p)));
  if (!stray.length) ok(`${flipped.length} cells changed, every one ("Arsenal", a club with an excluded part)`);
  else fail(`${stray.length} changed cells are not (Arsenal, an excluded string): ${stray.slice(0, 4).map(f => f.t + ' x ' + f.club).join('; ')}`);
  const unflipped = EXCLUDED.filter(s => !flipped.some(f => f.club === s));
  if (!unflipped.length) ok(`each of the ${EXCLUDED.length} excluded strings no longer satisfies the Arsenal label`);
  else fail(`still satisfies the Arsenal label: ${unflipped.join(', ')}`);
  if (!added.length) ok('no cell went from no to yes (the map only removes)');
  else fail(`${added.length} cells went from no to yes: ${added.slice(0, 3).map(a => a.t + ' x ' + a.club).join('; ')}`);
  const LONDON = ['Arsenal FC', 'Arsenal FC U21', 'Arsenal FC U18', 'Arsenal FC / Nottingham Forest'];
  const lostLondon = arsenal.length ? LONDON.filter(s => !head.clubMatches(s, arsenal[0].c.value)) : LONDON;
  if (!lostLondon.length) ok('London stays matched: Arsenal FC, U21, U18 and a split season');
  else fail(`the Arsenal label no longer matches ${lostLondon.join(', ')}`);
  if (JSON.stringify(KEPT.slice().sort()) === JSON.stringify(LONDON.slice().sort())) ok(`gridNamesakes.json keeps exactly London's ${KEPT.length} strings`);
  else fail(`gridNamesakes.json keeps ${KEPT.join(', ') || 'nothing'}; London's strings are ${LONDON.join(', ')}`);
  /* COMPLETENESS (review M1): every stored string the lead's Q3b holds that the rule before this round reads as
     Arsenal, part by part for a split season, is either kept as London's or excluded. A string forgotten in both the
     function and the ledger passes every check above and fails here. */
  if (arsenal.length) {
    const q3b = readJson('stintClubsArsenal-2026-10-29.json').map(r => r.club);
    const read = q3b.filter(c => base.clubMatches(c, arsenal[0].c.value));
    const unlisted = read.filter(c => !KEPT.includes(c) && !EXCLUDED.includes(c)
      && c.split(' / ').some(p => base.clubMatches(p, arsenal[0].c.value) && !KEPT.includes(p) && !EXCLUDED.includes(p)));
    if (read.length && !unlisted.length) ok(`all ${read.length} of Q3b's ${q3b.length} strings the old rule reads as Arsenal are kept or excluded (${read.filter(c => KEPT.includes(c)).length} kept, ${read.filter(c => EXCLUDED.includes(c)).length} excluded)`);
    else fail(`Q3b strings the old rule reads as Arsenal that are neither kept nor excluded: ${unlisted.join(', ') || 'none read at all'}`);
  }
  if (!lostLabels.length) ok('no label lost its last matching club');
  else fail(`labels left with no match: ${lostLabels.join(', ')}`);

  /* the hand mirror in simSoccerGridLabels.mjs, run on the same source text */
  let mirrorText = stripComments(readText('scripts/simSoccerGridLabels.mjs'));
  const LINE = '    if ((NAMESAKES[b] ?? []).map(norm).includes(a)) return false;\n';
  if (CONTROL === 'mirrordrift') {
    if (mirrorText.split(LINE).length !== 2) abort("the mirror's namesake line is not in it once");
    mirrorText = mirrorText.replace(LINE, '');
    fired.push("mirrordrift: the namesake line taken out of the mirror's clubMatches");
  }
  const from = once(mirrorText, 'const norm = s =>', 'the mirror');
  const cm = once(mirrorText, 'const clubMatches = (stintClub, wanted) => {', 'the mirror');
  if (from >= 0 && cm >= 0) {
    const region = mirrorText.slice(from, mirrorText.indexOf(';', braceEnd(mirrorText, cm) - 1) + 1);
    const shim = { readFileSync: p => { if (!String(p).endsWith('index.ts')) throw new Error('the mirror read ' + p); return headRaw; } };
    const mirror = new Function('fs', 'path', 'ROOT', 'fail', 'CONTROL', `${region}\nreturn { clubMatches };`)(
      shim, path, ROOT, m => fail('the mirror: ' + m), '');
    let cells = 0;
    const differ = [];
    for (const { t, c } of labels) for (const club of clubs) {
      cells += 1;
      if (mirror.clubMatches(club, c.value) !== head.clubMatches(club, c.value)) differ.push(`${t} x ${club}`);
    }
    if (!differ.length) ok(`the mirror agrees with the function on all ${cells} cells`);
    else fail(`the mirror and the function disagree on ${differ.length} of ${cells} cells: ${differ.slice(0, 4).join('; ')}`);
  }
}

/* ---------------------------------------------------------------- N */
console.log('N) every excluded string stands on two hosts');
{
  const WIKI = /(^|\.)(wikipedia|wikidata|wikimedia|fandom|wikiwand)\./i;
  const domain = h => h.toLowerCase().replace(/^www\./, '').split('.').slice(-2).join('.');
  const entries = LEDGER.excluded.map(e => ({ ...e, sources: e.sources.slice() }));
  if (CONTROL === 'onehost') {
    const tula = entries.find(e => e.stored === 'Arsenal Tula');
    if (!tula || tula.sources.length < 2) abort('Arsenal Tula is not in gridNamesakes.json with two sources');
    tula.sources.pop();
    fired.push('onehost: Arsenal Tula left with one source');
  }
  const bad = [];
  for (const e of entries) {
    const hosts = e.sources.map(s => s.host);
    const doms = new Set(hosts.map(domain));
    const tm = hosts.filter(h => /transfermarkt/i.test(h)).length;
    const complete = e.sources.every(s => s.host && /^https:\/\//.test(s.url) && s.read && s.says && s.url.includes(s.host.replace(/^www\./, '')));
    if (doms.size < 2 || tm > 1 || hosts.some(h => WIKI.test(h)) || !complete) bad.push(e.stored);
  }
  if (!bad.length) ok(`${entries.length} strings, each on two registrable hosts, no wiki, at most one Transfermarkt, url, date and summary`);
  else fail(`short of two good hosts: ${bad.join(', ')}`);
}

/* ---------------------------------------------------------------- L (Round 1587) */
console.log('L) every judged man stands on two hosts, and the ledger is what its generator writes');
const MARKET = readJson(ARSENAL.MARKET_FILE);
const AL = readJson(ARSENAL.LEDGER_FILE);
{
  const pages = ARSENAL.parsePages(fs.readFileSync(path.join(DATA, ARSENAL.PAGES_FILE), 'utf8'));
  const again = ARSENAL.buildLedger(MARKET, pages);
  if (JSON.stringify(again) === JSON.stringify(AL)) ok(`arsenalLedger.json equals genArsenalLedger1587's output from the ${pages.length} committed pages and the Q2 export`);
  else fail('arsenalLedger.json differs from what genArsenalLedger1587.mjs writes: regenerate it, never edit it by hand');
  const men = AL.men.map(m => ({ ...m, sources: m.sources.map(s => ({ ...s })) }));
  const firstSar = men.find(m => m.verdict === 'sarandi' && m.sources.length === 2);
  if (CONTROL === 'manhost') {
    if (!firstSar) abort('no sarandi man stands on exactly two sources');
    firstSar.sources.pop();
    fired.push(`manhost: ${firstSar.name} left with one source`);
  }
  if (CONTROL === 'wiki') {
    if (!firstSar || !/statscrew/.test(firstSar.sources[0].host)) abort('the first two source sarandi man does not open on statscrew');
    firstSar.sources[0] = { ...firstSar.sources[0], host: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/Arsenal_de_Sarand%C3%AD' };
    fired.push(`wiki: ${firstSar.name}'s statscrew source swapped for en.wikipedia.org`);
  }
  if (CONTROL === 'twotm') {
    if (!firstSar) abort('no sarandi man stands on exactly two sources');
    firstSar.sources = firstSar.sources.map((s, i) => ({ ...s, host: i ? 'transfermarkt.co.uk' : 'transfermarkt.com', url: `https://www.transfermarkt.${i ? 'co.uk' : 'com'}/x/profil/spieler/${i}` }));
    fired.push(`twotm: both of ${firstSar.name}'s sources made Transfermarkt`);
  }
  const verdicts = new Set(men.map(m => m.verdict));
  if ([...verdicts].every(v => v === 'sarandi' || v === 'london')) ok(`${men.length} men, every verdict sarandi or london (${men.filter(m => m.verdict === 'sarandi').length} and ${men.filter(m => m.verdict === 'london').length}), none held or pending`);
  else fail(`verdicts other than sarandi and london: ${[...verdicts].join(', ')}`);
  const bad = men.filter(m => !twoHosts(m.sources)).map(m => m.name);
  if (!bad.length) ok('every man has two registrable hosts, no wiki, at most one Transfermarkt, url, date and summary');
  else fail(`short of two good hosts: ${bad.join(', ')}`);
  if (twoHosts(AL.nameSources) && AL.namesake === ARSENAL.NAMESAKE) ok(`the stored name '${AL.namesake}' stands on two hosts`);
  else fail(`the stored name '${AL.namesake}' is not on two good hosts`);
}

/* ---------------------------------------------------------------- T (Round 1587) */
console.log('T) every tripwire row and every roster net row belongs to exactly one judged man');
{
  let market = MARKET;
  if (CONTROL === 'unjudged') {
    if (!market.some(r => r.id === 6876)) abort('Esteban Andrada 2015 (id 6876) is not in the Q2 export');
    market = market.concat([{ ...market.find(r => r.id === 6876), id: 99999991, player_name: 'Ficticio Unjudged', name_folded: 'ficticio unjudged' }]);
    fired.push('unjudged: a made up Argentine Arsenal FC row added to Q2 in memory');
  }
  let men = AL.men;
  if (CONTROL === 'nonet') {
    const netOnly = men.find(m => m.nets.length === 1 && m.nets[0] === 'roster');
    if (!netOnly) abort('no man of the ledger came in by the roster net only');
    men = men.filter(m => m !== netOnly);
    fired.push(`nonet: ${netOnly.name}, who came in by the roster net only, taken out of the ledger`);
  }
  const owner = new Map();
  let twice = 0;
  for (const m of men) for (const id of m.rows) { if (owner.has(id)) twice += 1; owner.set(id, m.name); }
  /* review 1587 minor 3: the roster net computed HERE, from the committed pages and with a name match written a second
     time (the generator's own is not its judge): every Q2 row whose man is listed on a fetched Arsenal de Sarandí page,
     whatever his stored nationality, must belong to a judged man */
  const fold2 = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const sameName = (a, b) => {
    if (a === b || (ARSENAL.ALIASES[a] || []).includes(b)) return true;
    const A = a.split(' '), B = b.split(' ');
    return A.length > 1 && B.length > 1 && (A.every(t => B.includes(t)) || B.every(t => A.includes(t)));
  };
  const pages = ARSENAL.parsePages(fs.readFileSync(path.join(DATA, ARSENAL.PAGES_FILE), 'utf8'));
  const listed = [...new Set(pages.filter(p => /^sarandi/.test(p.kind)).flatMap(p => p.names.map(n => fold2(n.name))))];
  const net = market.filter(r => listed.some(n => sameName(fold2(r.player_name), n)));
  const netOut = net.filter(r => !owner.has(r.id));
  if (net.length && !netOut.length) ok(`${net.length} roster net rows (names on ${pages.filter(p => /^sarandi/.test(p.kind)).length} Sarandí pages), every one judged`);
  else fail(`${netOut.length} of ${net.length} roster net rows belong to no judged man: ${netOut.slice(0, 3).map(r => r.player_name + ' ' + r.year + ' ' + r.nationality).join(', ')}`);
  const trip = market.filter(r => ARSENAL.tripwireKind(r));
  const pending = trip.filter(r => !owner.has(r.id));
  const migrationThere = fs.existsSync(path.join(ROOT, MIGRATION_PATH));
  if (twice) fail(`${twice} row ids sit in two men`);
  else ok(`no row id sits in two men (${owner.size} judged rows)`);
  if (!pending.length) ok(`${trip.length} tripwire rows, every one judged; ${men.filter(m => m.nets.length === 1 && m.nets[0] === 'roster').length} men came in by the roster net only`);
  else if (!migrationThere) ok(`pending ${pending.length} (allowed while the migration does not exist)`);
  else fail(`pending ${pending.length} tripwire rows with the migration written: ${pending.slice(0, 3).map(r => r.player_name + ' ' + r.year).join(', ')}`);
}

/* ---------------------------------------------------------------- M (Round 1587) */
console.log('M) the payload is the ledger\'s sarandi rows plus the stints critic 2\'s rule moves, and both SQL files carry it');
const STINTS = readJson('arsenalStints-2026-10-29.json');
const APPLIED_SQL = readText(SQL1587.APPLIED), RECORD_SQL = readText(SQL1587.MIGRATION);
const payloadLine = sql => (/payload text := '(.*)';/.exec(sql) || [])[1];
let PAY = JSON.parse(payloadLine(APPLIED_SQL).replace(/''/g, "'"));
{
  let ledger = AL, market = MARKET;
  if (CONTROL === 'payload') {
    if (PAY.market.length < 2) abort('the payload holds fewer than two market rows');
    fired.push(`payload: market row ${PAY.market[0].id} dropped from the parsed payload`);
    PAY = { ...PAY, market: PAY.market.slice(1) };
  }
  if (CONTROL === 'londonspan') {
    const s = STINTS.find(x => PAY.stints[0] && x.id === PAY.stints[0].id);
    if (!s) abort('the payload moves no stint');
    const extra = { ...market.find(r => r.player_name === s.player_name && r.nationality === s.nationality), id: 99999992, year: s.first_year };
    market = market.concat([extra]);
    ledger = { ...AL, men: AL.men.concat([{ name: 'Made up London twin', verdict: 'london', rows: [99999992] }]) };
    fired.push(`londonspan: a london row of ${s.player_name}'s name and nationality added inside his moved stint's span (${s.first_year})`);
  }
  const again = SQL1587.computePayload(ledger, market, STINTS);
  const sarRows = AL.men.filter(m => m.verdict === 'sarandi').flatMap(m => m.rows).sort((a, b) => a - b);
  const payIds = PAY.market.map(p => p.id).sort((a, b) => a - b);
  if (JSON.stringify(payIds) === JSON.stringify(sarRows)) ok(`the market payload is exactly the ledger's ${sarRows.length} sarandi rows`);
  else fail(`the market payload holds ${payIds.length} ids, the ledger's sarandi rows are ${sarRows.length}`);
  if (JSON.stringify({ market: again.market, stints: again.stints }) === JSON.stringify(PAY) && !again.held.length) ok(`the generator, rerun on the committed exports, gives the committed payload (${again.stints.length} stints, 0 held)`);
  else fail(`the generator now gives ${again.market.length} market rows, ${again.stints.length} stints and ${again.held.length} held, not the committed payload`);
  /* the stints rule, written a second time here so the generator is not its own judge */
  const owner = new Map(); for (const m of ledger.men) for (const id of m.rows) owner.set(id, m);
  const ruleBreaks = [];
  for (const s of STINTS) {
    if (!s.club.split(' / ').includes('Arsenal FC')) continue;
    const cov = market.filter(r => r.player_name === s.player_name && r.nationality === s.nationality && r.year >= s.first_year && r.year <= s.last_year);
    const men = new Set(cov.map(r => owner.get(r.id)));
    const moves = cov.length > 0 && men.size === 1 && [...men][0]?.verdict === 'sarandi';
    if (moves !== PAY.stints.some(p => p.id === s.id)) ruleBreaks.push(`${s.player_name} ${s.first_year}-${s.last_year}`);
  }
  if (!ruleBreaks.length) ok(`every Arsenal FC stint moves exactly when its span covers rows of one sarandi man and nobody else (${PAY.stints.length} of ${STINTS.length})`);
  else fail(`the stints payload breaks the rule at ${ruleBreaks.slice(0, 3).join(', ')}`);
  const sum = createHash('md5').update(payloadLine(APPLIED_SQL), 'utf8').digest('hex');
  const want = (sql, k) => Number((new RegExp(`${k}_want int := (\\d+)`).exec(sql) || [])[1]);
  const consistent = [APPLIED_SQL, RECORD_SQL].every(sql => payloadLine(sql) === payloadLine(APPLIED_SQL) && sql.includes(`if md5(payload) <> '${sum}'`)
    && want(sql, 'm') === PAY.market.length && want(sql, 's') === PAY.stints.length);
  if (consistent) ok(`the record and the applied form carry one payload line, its md5 ${sum} and N ${PAY.market.length}, M ${PAY.stints.length}`);
  else fail(`the two SQL files disagree with the payload (${PAY.market.length} market rows, ${PAY.stints.length} stints), its md5 or N and M`);
  const rec = SQL1587.writeSql({ market: PAY.market, stints: PAY.stints }, { strict: false, source: 'arsenalMarket-2026-10-29.json and arsenalStints-2026-10-29.json' });
  if (rec.sql === RECORD_SQL) ok('the committed migration is byte for byte what the generator writes from this payload');
  else fail('the committed migration is not what genClubNamesakes1587.mjs writes: regenerate it');
  /* review 1587 minor 2: the club the payload writes is one the GRID excludes. Every part written in place of
     "Arsenal FC" must be in soccer-grid-validate's CLUB_NAMESAKES.arsenal after the function's own norm (that list is
     an exact match, so another spelling would let the grid confirm the men again), and the function's clubMatches
     must read no payload club as Arsenal. Both read the function's code, never this file's idea of the name. */
  let news = PAY.market.concat(PAY.stints).map(p => ({ id: p.id, old: p.old, new: p.new }));
  if (CONTROL === 'namesakedrift') {
    if (!news.length || !news.every(p => p.new.includes(SQL1587.NAMESAKE))) abort(`not every payload club carries '${SQL1587.NAMESAKE}'`);
    news = news.map(p => ({ ...p, new: p.new.split(SQL1587.NAMESAKE).join('Arsenal Sarandí') }));
    fired.push(`namesakedrift: every payload club spelled 'Arsenal Sarandí' in memory`);
  }
  if (head && ARSENAL_VALUE) {
    const excl = (head.CLUB_NAMESAKES.arsenal ?? []).map(head.norm);
    const written = news.flatMap(p => p.new.split(' / ').filter((part, i) => p.old.split(' / ')[i] === 'Arsenal FC'));
    const unlisted = [...new Set(written.filter(w => !excl.includes(head.norm(w))))];
    if (written.length && !unlisted.length) ok(`every one of the ${written.length} parts the payload writes is in the function's CLUB_NAMESAKES.arsenal (${[...new Set(written)].join(', ')})`);
    else fail(`the payload writes ${unlisted.join(', ') || 'nothing'}, which soccer-grid-validate's CLUB_NAMESAKES.arsenal does not exclude`);
    const still = news.filter(p => head.clubMatches(p.new, ARSENAL_VALUE));
    if (!still.length) ok(`the function's clubMatches reads none of the ${news.length} payload clubs as "${ARSENAL_VALUE}"`);
    else fail(`the function still reads ${still.length} payload clubs as "${ARSENAL_VALUE}" (${still.slice(0, 2).map(p => p.id + ' ' + p.new).join('; ')})`);
  } else fail('the function or its Arsenal label could not be read, so the payload club is not tied to the grid');
}

/* ---------------------------------------------------------------- F (Round 1587, review major 1) */
console.log('F) the apply\'s steps 2 and 3 on fresh exports under dated names decide by content, never by file name');
{
  const T = fs.mkdtempSync(path.join(os.tmpdir(), 'r1587-fresh-'));
  const Q2N = 'arsenalMarket-2026-11-03.json', Q3N = 'arsenalStints-2026-11-03.json';
  const sarRow = AL.men.find(m => m.verdict === 'sarandi')?.rows[0];
  const movedQ2 = () => {
    const rows = MARKET.map(r => ({ ...r }));
    const r = rows.find(x => x.id === sarRow);
    if (!r) abort(`the first sarandi row ${sarRow} is not in the Q2 export`);
    r.market_value_usd = Number(r.market_value_usd) + 1000000;
    r.h = marketHash(r);
    return JSON.stringify(rows);
  };
  /* a pair of fresh files in its own folder: the committed bytes copied, or Q2 with one payload row's value moved */
  const pair = (name, moved) => {
    const d = path.join(T, name);
    fs.mkdirSync(d);
    if (moved) fs.writeFileSync(path.join(d, Q2N), movedQ2());
    else fs.copyFileSync(path.join(DATA, ARSENAL.MARKET_FILE), path.join(d, Q2N));
    fs.copyFileSync(path.join(DATA, 'arsenalStints-2026-10-29.json'), path.join(d, Q3N));
    return [path.join(d, Q2N), path.join(d, Q3N)];
  };
  const run = (script, args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'qa', script), ...args], { encoding: 'utf8' });
  let sameMoved = false, movedMoved = true;
  if (CONTROL === 'freshmoved') { sameMoved = true; fired.push('freshmoved: the "unchanged" fresh Q2 carries one moved value'); }
  if (CONTROL === 'freshstill') { movedMoved = false; fired.push('freshstill: the "moved" fresh Q2 is left unchanged'); }
  const [sm, ss] = pair('same', sameMoved);
  const led = run('genArsenalLedger1587.mjs', ['--market', sm, '--check']);
  const pay = run('genClubNamesakes1587.mjs', ['--market', sm, '--stints', ss, '--check']);
  const sames = (pay.stdout || '').split('\n').filter(l => l.startsWith('same: ')).length;
  if (led.status === 0 && pay.status === 0 && sames === 2) ok(`unchanged exports saved as ${Q2N} and ${Q3N}: step 2 exit 0, step 3 exit 0 with "same:" for both SQL files`);
  else fail(`unchanged exports under dated names: step 2 exit ${led.status}, step 3 exit ${pay.status} with ${sames} "same:" lines (the apply would stop on a table that has not moved)`);
  const [mm, ms] = pair('moved', movedMoved);
  const payM = run('genClubNamesakes1587.mjs', ['--market', mm, '--stints', ms, '--check']);
  if (payM.status === 1 && /DIFFERS: /.test(payM.stdout || '')) ok(`one payload row's value moved (row ${sarRow}, h recomputed): step 3 exit 1 with DIFFERS`);
  else fail(`one payload row's value moved: step 3 exit ${payM.status}, no DIFFERS (the apply would go ahead on a moved table)`);
  const wr = run('genClubNamesakes1587.mjs', ['--market', sm, '--stints', ss]);
  if (wr.status === 2 && /^REFUSED/.test((wr.stdout || '').trim())) ok('the payload generator refuses to write from a fresh export (--market without --check exits 2)');
  else fail(`the payload generator given --market without --check exited ${wr.status}, not 2 with REFUSED`);
}

/* ---------------------------------------------------------------- C (Round 1587, review major 2) */
console.log('C) the Build Your XI and Soccer Connect 4 cache purge removes exactly the sarandi men\'s Arsenal yeses');
{
  const fx = cacheFixture(AL, MARKET);
  if (!fx) fail('C: the ledger has no two word sarandi and london man to build the made up cache from');
  else {
    const md5 = s => createHash('md5').update(s, 'utf8').digest('hex');
    const q6 = fx.rows.map(r => { const verdict = JSON.stringify(r.verdict); return { game: r.game, cache_key: r.cache_key, verdict, h: md5(`${r.game}|${r.cache_key}|${verdict}`), want: r.want }; });
    let ledger = AL;
    if (CONTROL === 'purgeblind') {
      const sMan = AL.men.find(m => m.verdict === 'sarandi' && MARKET.find(r => r.id === m.rows[0])?.player_name === fx.S);
      if (!sMan) abort(`the fixture's sarandi man ${fx.S} is not in the ledger`);
      ledger = { ...AL, men: AL.men.filter(m => m !== sMan) };
      fired.push(`purgeblind: ${fx.S} taken out of the ledger the purge generator reads`);
    }
    const res = PURGE.computeCachePurge(ledger, MARKET, q6);
    const got = r => (res.del.includes(r) ? 'delete' : res.held.includes(r) ? 'held' : 'keep');
    const wrong = q6.filter(r => got(r) !== r.want);
    const n = w => q6.filter(r => r.want === w).length;
    if (!wrong.length) ok(`on a made up cache of ${q6.length} rows (${fx.S} sarandi, ${fx.L} london): ${n('delete')} deleted (a Build Your XI yes, a Connect 4 pair yes and fact), ${n('held')} held (a last name only key), ${n('keep')} kept (refusals, the london man, another club, a Soccer Grid row)`);
    else fail(`the purge decides ${wrong.length} rows wrongly: ${wrong.slice(0, 4).map(r => `${r.game} ${r.cache_key} wants ${r.want}, got ${got(r)}`).join('; ')}`);
    const out = PURGE.writeCachePurgeSql(res.del, { cacheName: 'fixture', read: q6.length, men: res.men, spellings: res.spellings });
    const line = (/payload text := '(.*)';/.exec(out.sql) || [])[1] || '';
    const ids = JSON.parse(line.replace(/''/g, "'") || '[]').map(p => p.game + ' ' + p.cache_key);
    if (out.sql.includes(`if md5(payload) <> '${md5(line)}'`) && out.sql.includes(`want int := ${res.del.length};`) && ids.length === res.del.length)
      ok(`the purge form carries the ${res.del.length} rows, its payload md5 and K`);
    else fail('the purge form does not carry its own payload md5, K or the rows it deletes');
    const T = fs.mkdtempSync(path.join(os.tmpdir(), 'r1587-purge-'));
    fs.writeFileSync(path.join(T, 'q6.json'), JSON.stringify(q6.map(({ want, ...r }) => r)));
    const cli = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'qa', 'genArsenalCachePurge1587.mjs'), '--cache', path.join(T, 'q6.json'), '--out', path.join(T, 'purge.sql')], { encoding: 'utf8' });
    if (cli.status === 0 && new RegExp(`^K ${res.del.length}; payload md5 `, 'm').test(cli.stdout || '')) ok(`the generator run as the lead runs it exits 0 with K ${res.del.length}`);
    else fail(`the generator run as the lead runs it exited ${cli.status}: ${(cli.stderr || cli.stdout || '').trim().split('\n').pop()}`);
  }
}

/* ---------------------------------------------------------------- P and R (Round 1587) */
console.log('P) the state after the apply, and R) Rarity Round\'s Arsenal pool in it');
{
  const newClub = new Map(PAY.market.map(p => [p.id, p.new]));
  let after = MARKET.map(r => (newClub.has(r.id) ? { ...r, club: newClub.get(r.id) } : r));
  const sar = AL.men.filter(m => m.verdict === 'sarandi');
  const sarIds = new Set(sar.flatMap(m => m.rows));
  if (CONTROL === 'leak') {
    const id = sar[0].rows[0];
    after = after.map(r => (r.id === id ? { ...r, club: 'Arsenal FC' } : r));
    fired.push(`leak: ${sar[0].name}'s row ${id} put back to Arsenal FC in the state after`);
  }
  const leaked = after.filter(r => sarIds.has(r.id) && r.club.split(' / ').includes('Arsenal FC'));
  const wrong = after.filter(r => sarIds.has(r.id) && r.club !== SQL1587.rewriteClub(MARKET.find(x => x.id === r.id).club));
  const others = after.filter(r => !sarIds.has(r.id)).filter(r => JSON.stringify(r) !== JSON.stringify(MARKET.find(x => x.id === r.id)));
  if (!leaked.length && !wrong.length && !others.length) ok(`after the apply no sarandi row reads Arsenal FC, all ${sarIds.size} read '${SQL1587.NAMESAKE}' in its place, the other ${MARKET.length - sarIds.size} are byte equal`);
  else fail(`after the apply: ${leaked.length} sarandi rows still read Arsenal FC, ${wrong.length} read another club, ${others.length} other rows changed`);
  const post = fs.readdirSync(DATA).filter(f => /^arsenalMarketPost-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop();
  if (!post) ok('no post apply export committed yet (the lead adds arsenalMarketPost-<date>.json after the apply; it is then compared row for row)');
  else {
    const live = readJson(post), byId = new Map(live.map(r => [r.id, r]));
    const diff = after.filter(r => { const l = byId.get(r.id); return !l || l.club !== r.club || l.player_name !== r.player_name || l.year !== r.year; });
    if (!diff.length && live.length === after.length) ok(`${post} equals the state after, row for row (${live.length} rows)`);
    else fail(`${post} differs from the state after on ${diff.length} rows (${live.length} live rows, ${after.length} expected)`);
  }
  /* R: Rarity Round's SHIPPED pool filter (review 1587 minor 10), never a copy: the .or() string of fetchClubPool in
     src/lib/rarityRound.ts, read out of the comment stripped source with the club the club-arsenal category passes,
     and evaluated as the API does (eq exact; like with * as the wildcard, and SQL's % and _). A condition this cannot
     read fails the section rather than being skipped. */
  let rr = stripComments(readText('src/lib/rarityRound.ts'));
  const catM = /cachedPool\('club-arsenal', fetchClubPool\('([^']+)'\)\)/.exec(rr);
  const fnAt = once(rr, 'function fetchClubPool(club: string) {', 'rarityRound.ts');
  if (CONTROL === 'widepool') {
    const from = 'club.eq."${club}",';
    if (fnAt < 0 || rr.slice(fnAt, braceEnd(rr, fnAt)).split(from).length !== 2) abort('the bare string condition is not in fetchClubPool once');
    rr = rr.replace(from, 'club.like."Arsenal*",');
    fired.push('widepool: fetchClubPool\'s bare string condition widened to club.like."Arsenal*" in the source text');
  }
  const orM = fnAt >= 0 ? /\.or\(`([^`]*)`\)/.exec(rr.slice(fnAt, braceEnd(rr, fnAt))) : null;
  let inPool = () => false;
  if (!catM || !orM) fail(`R: ${catM ? '' : "the club-arsenal category's fetchClubPool argument "}${orM ? '' : "fetchClubPool's .or() filter "}could not be read out of rarityRound.ts`);
  else {
    const filter = orM[1].split('${club}').join(catM[1]);
    const conds = [...filter.matchAll(/(\w+)\.(eq|like)\."([^"]*)"/g)];
    const rest = filter.replace(/(\w+)\.(eq|like)\."([^"]*)"/g, '').replace(/,/g, '').trim();
    if (!conds.length || rest || conds.some(c => c[1] !== 'club')) fail(`R: fetchClubPool's filter has a part this section cannot read: ${filter}`);
    else {
      const likeRe = p => new RegExp('^' + p.split('').map(ch => (ch === '*' || ch === '%' ? '.*' : ch === '_' ? '.' : ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))).join('') + '$');
      const tests = conds.map(c => (c[2] === 'eq' ? (s => s === c[3]) : (re => s => re.test(s))(likeRe(c[3]))));
      inPool = s => tests.some(t => t(s));
      ok(`R reads the shipped filter for "${catM[1]}": ${conds.map(c => c[2] + ' "' + c[3] + '"').join(', ')}`);
    }
  }
  const before = new Set(MARKET.filter(r => inPool(r.club)).map(r => r.player_name));
  const pool = new Set(after.filter(r => inPool(r.club)).map(r => r.player_name));
  const sarNames = new Set(sar.map(m => MARKET.find(r => r.id === m.rows[0]).player_name));
  const left = [...pool].filter(n => sarNames.has(n));
  if (!left.length) ok(`R: the club-arsenal pool holds no sarandi man after the apply (${before.size} names before, ${pool.size} after)`);
  else fail(`R: the club-arsenal pool still holds ${left.join(', ')}`);
}

console.log('');
/* a control FIRED only when it was applied AND a check went red; applied with every check green is a control that
   moved nothing, which exits 3 and never prints the green line */
if (CONTROL) {
  if (!fired.length) { console.log(`control ${CONTROL} DID NOT FIRE: nothing changed`); process.exit(3); }
  if (!failures) { console.log(`control ${CONTROL} DID NOT FIRE: applied (${fired.join('; ')}) but every check stayed green`); process.exit(3); }
  console.log(`control ${CONTROL} FIRED: applied (${fired.join('; ')}) and ${failures} check(s) went red`);
}
if (failures) {
  console.log(`simClubNamesakes: ${failures} finding(s).`);
  process.exit(1);
}
console.log('simClubNamesakes: green. The detection flags Arsenal FC where it is two clubs, and the grid stops reading Arsenal inside another club\'s name, nowhere else.');
