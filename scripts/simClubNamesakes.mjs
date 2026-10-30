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
 *
 * Run: node scripts/simClubNamesakes.mjs            (green: the closing line and exit 0) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as detectLib from './lib/clubNamesakeDetect.mjs';
import { buildGridRule, stripComments, braceEnd, onceAt } from './lib/gridRuleFromSource.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'scripts', 'data', 'clubNamesakes1584');
const CONTROLS = ['blind', 'unmerge', 'noexclude', 'wide', 'mirrordrift', 'onehost', 'forget'];
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
    /* the Argentine candidates the lead's live Q1 named in Arsenal FC's S2 blocs (export-1584/README.md), by surname,
       never Emiliano Martinez (London's keeper, in the 2016 and 2017 blocs) */
    const SURNAMES = ['leguizamon', 'carrera', 'campestrini', 'pellerano', 'sena', 'yacuzzi', 'diaz', 'poggi', 'jara',
      'obolo', 'alvarez', 'galvan', 'marcone', 'lopez', 'caffa', 'burdisso', 'nervo', 'ortiz', 'aguirre', 'zuculini',
      'perez', 'sperduti', 'andrada', 'munoz', 'corvalan', 'ruiz', 'bazan', 'barbieri', 'brunetta', 'marin'];
    const out = new Set(rows.filter(r => r.club === 'Arsenal FC' && /argentina/i.test(r.nationality || '')
      && !/martinez$/.test(fold(r.player_name)) && SURNAMES.includes(fold(r.player_name).split(' ').pop())).map(r => r.id));
    if (!out.size) abort('no Arsenal FC row of a named candidate is in the fixture');
    rows = rows.filter(r => !out.has(r.id));
    const left = detect(rows).filter(d => d.club === 'Arsenal FC');
    if (left.length) abort(`${out.size} rows removed and Arsenal FC is still flagged (${left.map(d => d.signal + ' ' + d.year).join(', ')})`);
    fired.push(`unmerge: ${out.size} Arsenal FC rows of named candidates removed by id, Arsenal FC left the list`);
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
