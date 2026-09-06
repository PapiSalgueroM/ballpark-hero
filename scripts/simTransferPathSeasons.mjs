/**
 * Round 475 harness: Transfer Path links teammates across the two season
 * styles the career table writes, and refuses to invent the ones it must not.
 *
 * THE DEFECT. The graph linked two players only on an identical
 * `club::season` string. The career table writes the same club in two styles,
 * split seasons ("2020-2021") at most clubs and calendar years ("2020") in
 * South and North America, sometimes both for one man: Julián Álvarez's River
 * Plate rows run 2018-2019, 2019-2020, 2020, 2021, 2022. Where the styles met
 * real teammates never linked, and the board told the player they were never
 * there together. A report on /transfer-path on 2026-09-06 was exactly that,
 * a chain sitting on Álvarez that would not take Enzo Fernández, his River
 * Plate teammate.
 *
 * THE RULE, and it is asymmetric on purpose. Two spells at the same club link
 * when their season strings are EQUAL, or when one is a calendar year Y and
 * the other is a split season running through Y. Two split seasons that merely
 * share a year never link: at a European club that would put a man who left in
 * the summer of 2020 in the same dressing room as one who arrived in it, which
 * invents teammates and is worse than the refusal being fixed. Section 3 counts
 * the pairs of split spells that would have been made teammates that way (594
 * on the 2026-08-26 pull), so the naive fix would have been a large lie.
 *
 * WHAT IS CHECKED, and every section is measured against the rule the game
 * shipped before this round rather than against a description of it:
 *
 *   1. THE RULE ITSELF, every combination of the two styles, in BOTH
 *      implementations and in both orders. The enumeration is counted and the
 *      section goes red if it shrinks, so a case cannot quietly leave.
 *   2. THE EIGHT PAIRS AND NOTHING ELSE. The pre-475 rule is rebuilt here from
 *      the same pull, and the two graphs are differenced: exactly eight club
 *      pairings appear, exactly six of them are pairs that had no link at all,
 *      nothing is lost, and each of the eight is named.
 *   3. THE TRAP, over every European club in the pull rather than an example:
 *      no two split spells that share a year but no season string may link.
 *      Then the same question asked of the data instead of the rule: every club
 *      that writes both styles is listed, and none of them may be European, so
 *      a career row added later cannot open the door from the other side.
 *   4. PARITY. The page's graph (src/lib/transferPathGraph.ts, which the board
 *      and the give up path search read) and the generator's
 *      (scripts/lib/transferPathHints.mjs, which the hints and the fences read)
 *      agree player for player over the whole pool and under both special
 *      rules, through both of the page's paths.
 *   5. THE REPORTED CHAIN. Julián Álvarez to Enzo Fernández to Moisés Caicedo,
 *      link by link, refused by the old rule and accepted by this one.
 *
 * NEGATIVE CONTROLS, each patching a real line of a real module and refusing
 * to run if the rewrite changes nothing:
 *   TPS_CONTROL=exactonly  the generator keeps only equal season strings (the
 *                          shipped shape before this round). Sections 2 and 5 go red.
 *   TPS_CONTROL=overlap    the generator lets two split seasons that share a
 *                          year link (the naive fix). Sections 2 and 3 go red.
 *   TPS_CONTROL=page       the page's give up search lets split meet split.
 *                          Section 4 goes red.
 *   TPS_CONTROL=pageshare  the page's link test drops the crossed match.
 *                          Section 4 goes red.
 *
 * Run: node scripts/simTransferPathSeasons.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = ['exactonly', 'overlap', 'page', 'pageshare'];
const CONTROL = process.env.TPS_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`TPS_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; if (failures <= 25) console.error('  FAIL: ' + m); };

const read = f => fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n');
/** rewrite one line of a real module for a control, or refuse to run */
function patched(source, file, needle, replacement) {
  if (!source.includes(needle)) { console.error(`control ${CONTROL} cannot run: ${file} no longer contains ${JSON.stringify(needle)}`); process.exit(1); }
  const out = source.replace(needle, replacement);
  if (out === source) { console.error(`control ${CONTROL} cannot run: rewriting ${file} changed nothing`); process.exit(1); }
  return out;
}

/* ── the generator's module, patched for its two controls ────────────────── */
const LIB = path.join(ROOT, 'scripts/lib/transferPathHints.mjs');
let libHref = pathToFileURL(LIB).href;
if (CONTROL === 'exactonly' || CONTROL === 'overlap') {
  const src = read(LIB);
  const out = CONTROL === 'exactonly'
    ? patched(src, 'transferPathHints.mjs', '    const spanned = at.span.get(key);', '    const spanned = null;')
    : patched(src, 'transferPathHints.mjs', '  for (const [key, names] of at.calendar) {', '  for (const [key, names] of at.span) {');
  const tmp = path.join(os.tmpdir(), `tps-control-${CONTROL}.mjs`);
  fs.writeFileSync(tmp, out);
  libHref = pathToFileURL(tmp).href;
  console.log(CONTROL === 'exactonly'
    ? '   NEGATIVE CONTROL ON: the generator links only equal season strings again, the shape that refused the report'
    : '   NEGATIVE CONTROL ON: the generator lets two split seasons that share a year link, the fix that invents teammates');
}
const lib = await import(libHref);
const { buildGraph, distances, expandCompactCareers, neighbours, sharedClub } = lib;

/* ── the page's module, patched for its two controls ─────────────────────── */
const GRAPH_TS = path.join(ROOT, 'src/lib/transferPathGraph.ts');
let graphTsPath = GRAPH_TS;
if (CONTROL === 'page' || CONTROL === 'pageshare') {
  const src = read(GRAPH_TS);
  const out = CONTROL === 'page'
    ? patched(src, 'transferPathGraph.ts', '    [keys.span, index.calendar],', '    [keys.span, index.span],')
    : patched(src, 'transferPathGraph.ts', '  for (const key of ka.span) if (kb.calendar.has(key)) return clubOfKey(key);', '');
  graphTsPath = path.join(os.tmpdir(), 'tps-control-transferPathGraph.ts');
  fs.writeFileSync(graphTsPath, out);
  console.log(CONTROL === 'page'
    ? "   NEGATIVE CONTROL ON: the page's give up search lets split meet split"
    : "   NEGATIVE CONTROL ON: the page's link test drops the crossed match");
}

const ENTRY = path.join(os.tmpdir(), 'tps-entry.mjs'), BUNDLE = path.join(os.tmpdir(), 'tps-bundle.mjs');
const p = f => f.replaceAll('\\', '/');
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
fs.writeFileSync(ENTRY, `export { buildSeasonIndex, clubSeasonsOf, linkedFrom, shareClub } from '${p(graphTsPath)}';\nexport { isEuropeanClub, playersUnderRule } from '${p(ROOT)}/src/lib/transferPathModes.ts';\n`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const page = await import(pathToFileURL(BUNDLE).href);

const players = expandCompactCareers(fs.readFileSync(path.join(ROOT, 'scripts/data/transferPathPull/careers.txt'), 'utf8'));
const PLAYER_FLOOR = 253; // the pull on 2026-08-26; a shrink is lost coverage
if (players.length < PLAYER_FLOOR) fail(`${players.length} players in the pull, the floor is ${PLAYER_FLOOR}`);

/** the pre-475 rule, one string per spell, rebuilt here as the baseline every section is measured against */
function everySeasonStringGraph(list) {
  const keys = new Map();
  for (const pl of list) {
    const set = keys.get(pl.name) ?? new Set();
    for (const s of pl.career) if (s && s.club && s.season) set.add(`${s.club}::${s.season}`);
    keys.set(pl.name, set);
  }
  const at = new Map();
  for (const [name, set] of keys) for (const k of set) (at.get(k) ?? at.set(k, []).get(k)).push(name);
  const adj = new Map();
  for (const [k, names] of at) {
    if (names.length < 2) continue;
    const club = k.slice(0, k.indexOf('::'));
    for (const a of names) for (const b of names) {
      if (a === b) continue;
      const row = adj.get(a) ?? adj.set(a, new Map()).get(a);
      (row.get(b) ?? row.set(b, new Set()).get(b)).add(club);
    }
  }
  return { keys, adj };
}

console.log('1) the rule itself, every combination of the two styles, in both implementations');
{
  /* Season strings at one club, and whether the rule links them. Equal strings
     link. A calendar year links to a split season running through it. Two
     split seasons never link on a shared year, which is the whole trap. */
  const CASES = [
    ['2020', '2020', true, 'the same calendar year'],
    ['2020', '2021', false, 'two calendar years'],
    ['2020', '2020-2021', true, 'a calendar year and the split season it opens'],
    ['2020', '2019-2020', true, 'a calendar year and the split season it closes'],
    ['2020', '2021-2022', false, 'a calendar year before the split season'],
    ['2020', '2018-2019', false, 'a calendar year after the split season'],
    ['2020-2021', '2020-2021', true, 'the same split season'],
    ['2020-2021', '2021-2022', false, 'two split seasons sharing the later year'],
    ['2020-2021', '2019-2020', false, 'two split seasons sharing the earlier year'],
    ['2020-2021', '2022-2023', false, 'two split seasons a year apart'],
    ['2019-2020', '2021-2022', false, 'two split seasons two years apart'],
    ['2019', '2019-2020', true, 'a calendar year and the split season it opens, a year earlier'],
  ];
  const CASE_FLOOR = 12;
  if (CASES.length < CASE_FLOOR) fail(`${CASES.length} rule cases, the enumeration must carry at least ${CASE_FLOOR}`);
  let checked = 0, wrong = 0;
  for (const [sa, sb, want, why] of CASES) {
    for (const [x, y] of [[sa, sb], [sb, sa]]) {
      const pool = [{ name: 'A', career: [{ club: 'Test FC', season: x }] }, { name: 'B', career: [{ club: 'Test FC', season: y }] }];
      const gen = buildGraph(pool);
      const genLinked = sharedClub(gen, 'A', 'B') !== null;
      const pageLinked = page.shareClub(page.clubSeasonsOf(pool), 'A', 'B') !== null;
      if (genLinked !== want) { wrong += 1; fail(`the generator ${genLinked ? 'links' : 'refuses'} ${x} and ${y} at one club (${why}), it should ${want ? 'link' : 'refuse'}`); }
      if (pageLinked !== want) { wrong += 1; fail(`the page ${pageLinked ? 'links' : 'refuses'} ${x} and ${y} at one club (${why}), it should ${want ? 'link' : 'refuse'}`); }
      checked += 2;
    }
  }
  console.log(`   ${CASES.length} season pairs, both orders, both implementations: ${checked} answers, ${wrong} of them not what the rule says`);
}

const graph = buildGraph(players);
const before = everySeasonStringGraph(players);
const pageKeys = page.clubSeasonsOf(players);

console.log('2) the eight pairs the old rule refused, and nothing else');
{
  /* Measured on the live career tables and on this pull on 2026-09-06. Each
     is a club where one man's rows are calendar years and the other's are
     split seasons, so the two never wrote the same string. Re-measure with
     this section, never by hand: it differences the two graphs. */
  const EXPECTED = [
    ['Adriano', 'Roberto Carlos', 'Corinthians'],
    ['Adriano', 'Ronaldo Nazário', 'Corinthians'],
    ['Andrea Pirlo', 'David Villa', 'New York City FC'],
    ['Cafu', 'Rivaldo', 'Palmeiras'],
    ['Cafu', 'Roberto Carlos', 'Palmeiras'],
    ['Enzo Fernández', 'Julián Álvarez', 'River Plate'],
    ['Hugo Lloris', 'Olivier Giroud', 'LAFC'],
    ['Neymar', 'Robinho', 'Santos'],
  ];
  const clubsOf = (g, a, b) => {
    const row = g.adj.get(a)?.get(b);
    if (!row) return new Set();
    return row instanceof Set ? new Set(row) : new Set([...row].map(s => s.club));
  };
  const pairKey = (a, b) => (a < b ? `${a}||${b}` : `${b}||${a}`);
  const pairsOf = g => {
    const out = new Map();
    for (const [a, row] of g.adj) for (const b of row.keys()) if (a < b) out.set(pairKey(a, b), clubsOf(g, a, b));
    return out;
  };
  const nowPairs = pairsOf(graph), thenPairs = pairsOf(before);
  const gained = [], lost = [], newPairings = [];
  for (const [key, clubs] of nowPairs) {
    if (!thenPairs.has(key)) gained.push(key);
    const had = thenPairs.get(key) ?? new Set();
    for (const club of clubs) if (!had.has(club)) newPairings.push([...key.split('||'), club]);
  }
  for (const key of thenPairs.keys()) if (!nowPairs.has(key)) lost.push(key);
  const seen = newPairings.map(x => x.join(' + ')).sort();
  const want = EXPECTED.map(x => x.join(' + ')).sort();
  for (const s of seen) if (!want.includes(s)) fail(`a pairing the old rule refused links now and was not measured: ${s}`);
  for (const w of want) if (!seen.includes(w)) fail(`a pairing this round exists to restore does not link: ${w}`);
  for (const key of lost) fail(`${key.replace('||', ' and ')} linked under the old rule and does not link now`);
  if (gained.length !== 6) fail(`${gained.length} pairs gained a link where the measurement says 6`);
  /* each of the eight is a real link on the graph, one step apart, at the club named */
  for (const [a, b, club] of EXPECTED) {
    if (!graph.keys.has(a) || !graph.keys.has(b)) { fail(`${a} or ${b} is not in the pull any more`); continue; }
    if (distances(graph, a).get(b) !== 1) fail(`${a} and ${b} are not one step apart`);
    if (!clubsOf(graph, a, b).has(club)) fail(`${a} and ${b} do not link at ${club}`);
    if (page.shareClub(pageKeys, a, b) === null) fail(`the page refuses ${a} and ${b}`);
  }
  console.log(`   ${thenPairs.size} linked pairs under the old rule, ${nowPairs.size} under this one: ${gained.length} pairs gained a link, ${lost.length} lost one`);
  console.log(`   ${seen.length} club pairings appear, all eight measured: ${seen.join('; ')}`);
}

console.log('3) the trap: two split seasons at a European club that share a year never link');
{
  const spells = [];
  for (const pl of players) for (const s of pl.career) spells.push({ name: pl.name, club: s.club, season: s.season });
  const byClub = new Map();
  for (const s of spells) (byClub.get(s.club) ?? byClub.set(s.club, []).get(s.club)).push(s);
  const split = /^(\d{4})-(\d{4})$/;
  let candidates = 0, europeanClubs = 0, example = null;
  const offenders = new Set();
  for (const [club, list] of byClub) {
    if (!page.isEuropeanClub(club)) continue;
    europeanClubs += 1;
    const strings = new Map(); // name -> season strings at this club
    for (const s of list) (strings.get(s.name) ?? strings.set(s.name, new Set()).get(s.name)).add(s.season);
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a.name === b.name) continue;
      const ma = split.exec(a.season), mb = split.exec(b.season);
      if (!ma || !mb || a.season === b.season) continue;
      if (Math.max(+ma[1], +mb[1]) > Math.min(+ma[2], +mb[2])) continue; // no year in common
      // only a pair that shares no season string at this club at all is a trap pair
      let shares = false;
      for (const s of strings.get(a.name)) if (strings.get(b.name).has(s)) shares = true;
      if (shares) continue;
      candidates += 1;
      if (!example) example = `${a.name} (${a.season}) and ${b.name} (${b.season}) at ${club}`;
      const genClubs = graph.adj.get(a.name)?.get(b.name);
      if (genClubs && [...genClubs].some(s => s.club === club)) offenders.add(`${a.name} and ${b.name} at ${club} (generator)`);
      if (page.shareClub(pageKeys, a.name, b.name) === club) offenders.add(`${a.name} and ${b.name} at ${club} (page)`);
    }
  }
  const TRAP_FLOOR = 300; // 594 pairs on this pull; a collapse here means the check stopped asking
  if (candidates < TRAP_FLOOR) fail(`only ${candidates} split season pairs at a European club to test, the floor is ${TRAP_FLOOR}`);
  for (const o of [...offenders].slice(0, 10)) fail(`invented teammates: ${o}`);
  if (offenders.size) fail(`${offenders.size} pairs were made teammates by a shared year alone`);
  console.log(`   ${europeanClubs} European clubs, ${candidates} pairs of split seasons that share a year and no season string, ${offenders.size} of them linked`);
  console.log(`   for instance ${example}`);

  /* The same question asked of the pull rather than of the rule, so a career
     row added later cannot open the door this section exists to keep shut. A
     crossed link can only happen at a club that writes both styles, and every
     club that does today is a calendar year league (South America, MLS, Japan)
     where the split rows are the odd ones out. One stray calendar row at a
     European club would put its holder in two adjacent European seasons at
     once, which is the invented teammate in a shape this section's pair walk
     would not name. */
  const mixed = [];
  for (const [club, list] of byClub) {
    const cal = list.some(s => /^\d{4}$/.test(s.season));
    const spl = list.some(s => split.test(s.season));
    if (cal && spl) mixed.push(club);
  }
  const MIXED_FLOOR = 8; // 17 clubs write both styles on this pull; below this the check has stopped asking
  if (mixed.length < MIXED_FLOOR) fail(`only ${mixed.length} clubs write both season styles, the floor is ${MIXED_FLOOR}`);
  for (const club of mixed) if (page.isEuropeanClub(club)) fail(`${club} is European and writes both season styles, so a calendar row there crosses two European seasons`);
  console.log(`   ${mixed.length} clubs write both styles, none of them European: ${mixed.join(', ')}`);
}

console.log('4) the page\'s graph and the generator\'s graph, player for player');
{
  const RULES = [['everyday', pl => pl], ['active', pl => page.playersUnderRule(pl, 'active')], ['Europe only', pl => page.playersUnderRule(pl, 'europe')]];
  for (const [label, filter] of RULES) {
    const pool = filter(players);
    const gen = buildGraph(pool);
    const keys = page.clubSeasonsOf(pool);
    const index = page.buildSeasonIndex(keys);
    let compared = 0, wrongClub = 0, differentClub = 0;
    for (const name of gen.names) {
      const want = new Set(neighbours(gen, name));
      const got = new Set();
      for (const { name: nb, club } of page.linkedFrom(index, keys.get(name))) {
        if (nb === name) continue;
        got.add(nb);
        // the club the give up path would print has to be one the pair really shared
        const shared = gen.adj.get(name)?.get(nb);
        if (!shared || !shared.some(s => s.club === club)) wrongClub += 1;
      }
      for (const nb of want) if (!got.has(nb)) fail(`under ${label} the generator links ${name} to ${nb} and the page's search does not`);
      for (const nb of got) if (!want.has(nb)) fail(`under ${label} the page's search links ${name} to ${nb} and the generator does not`);
      for (const other of gen.names) {
        if (other === name) continue;
        const club = page.shareClub(keys, name, other);
        const genClub = sharedClub(gen, name, other);
        if ((club === null) !== (genClub === null)) fail(`under ${label} the page ${club ? 'links' : 'refuses'} ${name} and ${other} and the generator ${genClub ? 'links' : 'refuses'} them`);
        if (club !== null) {
          compared += 1;
          const shared = gen.adj.get(name)?.get(other);
          if (!shared || !shared.some(s => s.club === club)) wrongClub += 1;
          else if (club !== genClub) differentClub += 1;
        }
      }
    }
    if (wrongClub) fail(`under ${label} the page named a club ${wrongClub} times that the pair never shared a season at`);
    console.log(`   ${label}: ${gen.names.length} players, ${compared / 2} linked pairs, the same links on both sides; ${differentClub / 2} pairs share two clubs and the two sides name a different one of them`);
  }
}

console.log('5) the chain from the report: Julián Álvarez, Enzo Fernández, Moisés Caicedo');
{
  const CHAIN = ['Julián Álvarez', 'Enzo Fernández', 'Moisés Caicedo'];
  const keys = pageKeys;
  for (let i = 1; i < CHAIN.length; i++) {
    const a = CHAIN[i - 1], b = CHAIN[i];
    const club = page.shareClub(keys, a, b);
    if (club === null) fail(`the board would still refuse ${b} after ${a}`);
    else console.log(`   ${a} to ${b}: the board takes it, at ${club}`);
  }
  const oldRow = before.adj.get('Julián Álvarez')?.get('Enzo Fernández');
  if (oldRow) fail('the old rule already linked Julián Álvarez and Enzo Fernández, so this harness is not measuring the reported defect');
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simTransferPathSeasons control (${CONTROL}): green. The planted rule was reported (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simTransferPathSeasons control (${CONTROL}): RED. The planted rule went unreported.`); process.exit(1);
}
if (failures > 0) { console.error(`simTransferPathSeasons: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simTransferPathSeasons: green. The two styles link where they are the same season and nowhere else, and the page and the generator agree on every player.');
