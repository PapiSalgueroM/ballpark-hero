/**
 * simTriviaFacts: Round 661. The three hand typed trivia banks are pinned to a
 * verification record, and nothing ships that the record does not hold.
 *
 * WHY THIS EXISTS. Hall of Fame or Bust showed Michael Jordan with Kobe
 * Bryant's 33,643 points, David Ortiz with Derek Jeter's 3,465 hits and Sammy
 * Sosa's 609 home runs, Gordie Howe with no Stanley Cups and Nail Yakupov with
 * half his goals. Guess the Year put Brady's Tampa Bay Super Bowl (February
 * 2021) in 2020, credited the Chiefs with a three-peat the Eagles denied them,
 * put Seattle's February 2026 Super Bowl in 2025 and gave three Heisman
 * Trophies a year early. Score Predictor dated the 1994 Milan final six days
 * late and listed nine road sides as the home team. None of those files carried
 * a source. Round 661 checked every line against two sources on two hosts (the
 * sport's governing body, league or hall where that page would answer, and one
 * that is not, Wikipedia never) and wrote them to
 * scripts/data/triviaFactsVerified2026-09.json. This harness holds the shipped
 * files to that record.
 *
 * WHAT IT CHECKS. Each section loads the shipped module itself (bundled with
 * esbuild, so it reads the values the game reads, not a regex over the text)
 * and compares it with the record, both ways.
 *
 *    1. The record itself: every fact carries at least two sources on two
 *       different sites, at least one official for its sport or a stated
 *       reason why not, at least one that is not official, none on a wiki, and
 *       a check date that has happened. Editorial lines say why.
 *    2. Hall of Fame or Bust (src/data/hofPlayers.ts): every stat, hint and fun
 *       fact equals its record line word for word, the answer and verdict
 *       match, every card keeps three hints, and a player still playing never
 *       shows an exact career total (it must be a floor, '43,000+').
 *    3. Guess the Year (src/data/guessTheYearPuzzles.ts): every clue equals its
 *       record entry, in order, and every year has exactly six.
 *    4. Score Predictor (src/data/scorePredictorPuzzles.ts): both sides, the
 *       competition, the date, the year it falls in and the score equal the
 *       record, and so do the hint and the fun fact.
 *    5. No record entry the files no longer ship: a player, a year or a match
 *       the record holds must still be in its file, so the record cannot rot
 *       into a list of things that used to be true.
 *
 * NEGATIVE CONTROLS (TRIVIA_FACTS_CONTROL). Each edits only an in memory copy
 * (line endings normalised to LF first, so a CRLF checkout behaves the same),
 * refuses to run unless its anchor occurs exactly once and the edit changed
 * something, and must turn exactly its own section red. Under a control the
 * harness exits 1 when exactly the predicted section is red (the break was
 * caught) and 2 when it is not (the control proves nothing).
 *   onesource   one Guess the Year clue loses its second source           section 1
 *   hofline     Jordan's card goes back to Kobe's 33,643 points           section 2
 *   floor       LeBron's floor becomes an exact total that will expire    section 2
 *   gtyclue     the Chiefs' imaginary 2025 three-peat is put back         section 3
 *   gtyfive     1998 drops to five clues                                  section 3
 *   spscore     the Ajax v Spurs semi goes back to Spurs at home 3-2      section 4
 *   spdate      the 1994 Milan final goes back to 24 May                  section 4
 *   stale       the record holds a Hall of Fame card the file dropped     section 5
 *
 * Nothing here touches the network.
 *
 * Run: node scripts/simTriviaFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts/data/triviaFactsVerified2026-09.json');
const CONTROL = process.env.TRIVIA_FACTS_CONTROL || '';
const EXPECT = { onesource: 1, hofline: 2, floor: 2, gtyclue: 3, gtyfive: 3, spscore: 4, spdate: 4, stale: 5 };
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`TRIVIA_FACTS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = (msg) => { red.add(section); failures += 1; console.error('  FAIL: ' + msg); };
const head = (n, title) => { section = n; console.log(`\n--- ${n}. ${title} ---`); };

/* A control that edits nothing proves nothing, and one whose anchor appears
   twice could edit the wrong line, so every edit asserts it landed once. */
const rewrite = (text, from, to, what) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} occurs ${hits} times, not once. The control is stale and a run would prove nothing.`);
    process.exit(2);
  }
  const out = text.replace(from, to);
  if (out === text) {
    console.error(`CONTROL ${CONTROL} cannot run: rewriting ${what} changed nothing.`);
    process.exit(2);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Loading the shipped modules. Each is bundled on its own, with an optional in
// memory rewrite of one source file, into a private temp directory.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simTriviaFacts-'));
const norm = (p) => path.resolve(p).toLowerCase();
let bundleNo = 0;
async function loadModule(rel, overrides = {}) {
  const entry = path.join(ROOT, rel);
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  const overrideMap = new Map(Object.entries(overrides).map(([k, v]) => [norm(path.join(ROOT, k)), v]));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'trivia-facts-memory',
      setup(b) {
        b.onLoad({ filter: /\.(ts|tsx)$/ }, (a) => {
          const hit = overrideMap.get(norm(a.path));
          if (hit === undefined) return undefined;
          return { contents: hit, loader: a.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(outfile).href);
}
/* LF always: a Windows checkout has CRLF files and an anchor spanning a line
   break would otherwise never match there. */
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
let record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));

const HOF = 'src/data/hofPlayers.ts';
const GTY = 'src/data/guessTheYearPuzzles.ts';
const SP = 'src/data/scorePredictorPuzzles.ts';
const over = {};

if (CONTROL === 'onesource') {
  const clue = record.guessTheYear?.['2025']?.clues?.[1];
  if (!Array.isArray(clue?.src) || clue.src.length !== 2) { console.error('CONTROL onesource cannot run: the 2025 Panthers clue no longer has exactly two sources to cut to one'); process.exit(2); }
  record = structuredClone(record);
  record.guessTheYear['2025'].clues[1].src = clue.src.slice(0, 1);
}
if (CONTROL === 'hofline') {
  over[HOF] = rewrite(src(HOF), "anonymizedStats: ['32,292 career points',", "anonymizedStats: ['33,643 career points',", "Jordan's points line");
}
if (CONTROL === 'floor') {
  const rec = record.hofOrBust['nba-4'];
  if (rec?.stats?.[0]?.text !== '43,000+ career points') { console.error('CONTROL floor cannot run: the record no longer holds LeBron\'s 43,000+ floor'); process.exit(2); }
  /* The record moves with the file, so only the floor rule can catch it. The
     anchor is the code line, not the header comment that quotes the floor. */
  record = structuredClone(record);
  record.hofOrBust['nba-4'].stats[0].text = '43,440 career points';
  over[HOF] = rewrite(src(HOF), "anonymizedStats: ['43,000+ career points',", "anonymizedStats: ['43,440 career points',", "LeBron's floor");
}
if (CONTROL === 'gtyclue') {
  over[GTY] = rewrite(src(GTY), '"The Florida Panthers won a second straight Stanley Cup",', '"The Kansas City Chiefs won an unprecedented third consecutive Super Bowl (LIX)",', "the 2025 Panthers clue");
}
if (CONTROL === 'gtyfive') {
  over[GTY] = rewrite(src(GTY), '      "A slugger shattered a 37-year-old single season home run record",\n', '', "the 1998 home run clue");
}
if (CONTROL === 'spscore') {
  over[SP] = rewrite(src(SP), "homeTeam: 'Ajax', awayTeam: 'Tottenham', competition: 'Champions League Semi-Final 2nd Leg', date: 'May 8, 2019', hint: 'Lucas Moura\\'s hat trick miracle', homeScore: 2, awayScore: 3",
    "homeTeam: 'Tottenham', awayTeam: 'Ajax', competition: 'Champions League Semi-Final 2nd Leg', date: 'May 8, 2019', hint: 'Lucas Moura\\'s hat trick miracle', homeScore: 3, awayScore: 2", "the Ajax v Spurs semi");
}
if (CONTROL === 'spdate') {
  over[SP] = rewrite(src(SP), "date: 'May 18, 1994'", "date: 'May 24, 1994'", "the 1994 Milan final date");
}
if (CONTROL === 'stale') {
  if (!record.hofOrBust?.['nfl-1'] || record.hofOrBust['nfl-6']) { console.error('CONTROL stale cannot run: nfl-1 is missing or nfl-6 already exists'); process.exit(2); }
  /* A copy of a sound entry, so the record rules stay green and only the
     "the file no longer ships it" check can see it. */
  record = structuredClone(record);
  record.hofOrBust['nfl-6'] = structuredClone(record.hofOrBust['nfl-1']);
}

// ---------------------------------------------------------------------------
/* The site a URL belongs to, so africa.espn.com and www.espn.com are one
   source, not two. Two-part public suffixes are listed where a source uses one. */
const TWO_PART = new Set(['co.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'go.jp', 'com.br']);
const siteOf = (u) => {
  let h;
  try { h = new URL(u).hostname.toLowerCase(); } catch { return null; }
  const parts = h.split('.');
  const last2 = parts.slice(-2).join('.');
  return TWO_PART.has(last2) ? parts.slice(-3).join('.') : last2;
};
const WIKIS = ['wikipedia.org', 'wikimedia.org', 'wiktionary.org', 'fandom.com', 'grokipedia.com', 'dbpedia.org'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

head(1, 'the record: two sources on two sites, one official or a reason, one independent, no wiki, a real check date');
{
  const today = new Date().toISOString().slice(0, 10);
  let facts = 0;
  let editorial = 0;
  const noOfficial = [];
  const check = (where, node, sport) => {
    if (node?.editorial) {
      editorial += 1;
      if (!(typeof node.why === 'string' && node.why.length > 20)) fail(`${where}: marked editorial without a reason over 20 characters`);
      if ('src' in node) fail(`${where}: an editorial line carries sources, so it is claiming to be a fact; drop one or the other`);
      return;
    }
    facts += 1;
    const official = record.officialHosts?.[sport];
    if (!Array.isArray(official) || !official.length) return fail(`${where}: sport "${sport}" has no official host list`);
    const list = node?.src || [];
    const sites = list.map(siteOf);
    if (list.length < 2) return fail(`${where}: ${list.length} source(s), two are required`);
    if (sites.some(h => !h)) return fail(`${where}: a source is not a URL`);
    if (new Set(sites).size < 2) return fail(`${where}: every source is on ${sites[0]}, which is one source`);
    if (sites.some(h => WIKIS.includes(h))) return fail(`${where}: a wiki is a spot check, never a source`);
    if (!sites.some(h => official.includes(h))) {
      if (typeof node.noOfficial === 'string' && node.noOfficial.length > 20) noOfficial.push(where);
      else fail(`${where}: no official source (${official.join(', ')}) and no noOfficial reason over 20 characters`);
    }
    if (!sites.some(h => !official.includes(h))) fail(`${where}: no independent source, every source is official`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(node.on || '') || node.on > today) fail(`${where}: check date "${node.on}" is missing or in the future`);
    if (typeof node.text === 'string' && /[–—]/.test(node.text)) fail(`${where}: the text carries a dash the site never uses`);
  };
  for (const [id, e] of Object.entries(record.hofOrBust || {})) {
    if (!e.verdict?.editorial) fail(`hofOrBust.${id}: the verdict is the game's label and must be marked editorial with its reason`);
    else check(`hofOrBust.${id}.verdict`, e.verdict, e.sport);
    (e.stats || []).forEach((x, i) => check(`hofOrBust.${id}.stats[${i}]`, x, e.sport));
    (e.hints || []).forEach((x, i) => check(`hofOrBust.${id}.hints[${i}]`, x, e.sport));
    if (e.funFact) check(`hofOrBust.${id}.funFact`, e.funFact, e.sport);
    for (const part of ['stats', 'hints']) for (const x of e[part] || []) if (x.editorial) fail(`hofOrBust.${id}: a ${part} line is marked editorial; a card line is a claim and needs sources`);
    if (e.funFact?.editorial) fail(`hofOrBust.${id}: the fun fact is marked editorial; it is a claim and needs sources`);
  }
  for (const [y, e] of Object.entries(record.guessTheYear || {})) {
    (e.clues || []).forEach((x, i) => {
      if (x.editorial) fail(`guessTheYear.${y}.clues[${i}]: a clue is marked editorial; every clue is a claim about its year`);
      check(`guessTheYear.${y}.clues[${i}]`, x, x.sport);
    });
  }
  let spEditorial = 0;
  for (const [id, e] of Object.entries(record.scorePredictor || {})) {
    if (!e.match || e.match.editorial) { fail(`scorePredictor.${id}: the match itself must be a sourced fact`); continue; }
    check(`scorePredictor.${id}.match`, e.match, e.sport);
    if (e.hint) { if (e.hint.editorial) spEditorial += 1; check(`scorePredictor.${id}.hint`, e.hint, e.sport); }
    if (e.funFact?.editorial) fail(`scorePredictor.${id}: the fun fact is marked editorial; it is a claim and needs sources`);
    else if (e.funFact) check(`scorePredictor.${id}.funFact`, e.funFact, e.sport);
  }
  /* A ratchet: eight teaser hints are flavour with no claim in them. More than
     that and "editorial" is becoming the way a fact dodges its sources. */
  if (spEditorial > 8) fail(`${spEditorial} Score Predictor hints are marked editorial, at most 8 may be`);
  /* A floor that proves the walk ran: 25 cards of 8 lines, 300 clues and 35
     matches with a fact each and most hints and fun facts sourced. */
  if (facts < 560) fail(`only ${facts} sourced facts found in the record, so the walk is broken`);
  else console.log(`  ${facts} facts, each on two sites with an independent one; ${facts - noOfficial.length} carry an official source, ${editorial} lines are editorial with a reason`);
  if (noOfficial.length) console.log(`  ${noOfficial.length} stand on independent sources with a stated reason, for example ${noOfficial.slice(0, 3).join('; ')}`);
}

// ---------------------------------------------------------------------------
const hofMod = await loadModule(HOF, over);
const gtyMod = await loadModule(GTY, over);
const spMod = await loadModule(SP, over);
const hofPlayers = hofMod.default;
const years = gtyMod.guessTheYearPuzzles;
const matches = spMod.default;

head(2, 'Hall of Fame or Bust: every card line equals the record');
{
  const SPORT = { soccer: 'soccer', nfl: 'nfl', nba: 'nba', baseball: 'mlb', hockey: 'nhl' };
  const rec = record.hofOrBust;
  let n = 0;
  let lines = 0;
  for (const p of hofPlayers) {
    const r = rec[p.id];
    if (!r) { fail(`${p.id} (${p.answer}) ships with no verified record`); continue; }
    n += 1;
    if (p.answer !== r.answer) fail(`${p.id}: the answer ships as "${p.answer}", the record holds "${r.answer}"`);
    if (SPORT[p.sport] !== r.sport) fail(`${p.id}: sport ${p.sport} does not match the record's ${r.sport}`);
    if (p.verdict !== r.verdict?.v) fail(`${p.id}: verdict ships as ${p.verdict}, the record holds ${r.verdict?.v}`);
    for (const [label, shipped, want] of [['stat', p.anonymizedStats, r.stats], ['hint', p.hints, r.hints]]) {
      if (shipped.length !== want.length) fail(`${p.id}: ${shipped.length} ${label}s ship, the record holds ${want.length}`);
      shipped.forEach((t, i) => {
        lines += 1;
        if (!want[i]) return;
        if (t !== want[i].text) fail(`${p.id} ${label} ${i + 1} ships "${t}", verified "${want[i].text}"`);
      });
    }
    lines += 1;
    if (p.funFact !== r.funFact?.text) fail(`${p.id}: fun fact ships "${p.funFact}", verified "${r.funFact?.text}"`);
    /* The board says "up to 3 hints", so a card with fewer breaks the promise. */
    if (p.hints.length !== 3) fail(`${p.id}: ${p.hints.length} hints, the game promises three`);
    /* An exact career total for a man still playing is a fact with an expiry
       date and this file has no step that refreshes it, so it must be a floor. */
    if (r.active) {
      for (const t of p.anonymizedStats) if (/\bcareer\b/i.test(t) && !/\d\+/.test(t)) fail(`${p.id}: "${t}" is an exact career total for a player still playing; ship a floor ('43,000+')`);
    }
  }
  /* A floor that proves the module loaded and the loop ran; there are 25 cards. */
  if (n < 25) fail(`only ${n} cards compared`);
  else console.log(`  ${n} cards, ${lines} lines, each equal to its record line`);
}

// ---------------------------------------------------------------------------
head(3, 'Guess the Year: every clue equals the record, six clues a year');
{
  const rec = record.guessTheYear;
  const seen = new Set();
  let clues = 0;
  for (const p of years) {
    const key = String(p.year);
    if (seen.has(key)) fail(`${key} ships twice`);
    seen.add(key);
    const r = rec[key];
    if (!r) { fail(`${key} ships with no verified record`); continue; }
    if (p.clues.length !== 6) fail(`${key}: ${p.clues.length} clues ship, every year needs six`);
    if (p.clues.length !== r.clues.length) fail(`${key}: ${p.clues.length} clues ship, the record holds ${r.clues.length}`);
    p.clues.forEach((t, i) => {
      clues += 1;
      if (r.clues[i] && t !== r.clues[i].text) fail(`${key} clue ${i + 1} ships "${t}", verified "${r.clues[i].text}"`);
    });
  }
  if (seen.size < 50) fail(`only ${seen.size} years compared`);
  else console.log(`  ${seen.size} years, ${clues} clues, each equal to its record entry`);
}

// ---------------------------------------------------------------------------
head(4, 'Score Predictor: sides, competition, date, year, score, hint and fun fact');
{
  const rec = record.scorePredictor;
  const SPORT = { soccer: 'soccer', nfl: 'nfl', nba: 'nba' };
  const seen = new Set();
  for (const m of matches) {
    if (seen.has(m.id)) fail(`${m.id} ships twice`);
    seen.add(m.id);
    const r = rec[m.id];
    if (!r) { fail(`${m.id} ships with no verified record`); continue; }
    if (SPORT[m.sport] !== r.sport) fail(`${m.id}: sport ${m.sport} does not match the record's ${r.sport}`);
    const v = r.match.v;
    for (const k of ['homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'competition', 'date']) {
      if (!same(m[k], v[k])) fail(`${m.id}: ${k} ships ${JSON.stringify(m[k])}, verified ${JSON.stringify(v[k])}`);
    }
    /* The year is what a player reads off the card first, so it is compared
       on its own even though the whole date already is. */
    const yearOf = (d) => (String(d).match(/\b(\d{4})\b/) || [])[1];
    if (yearOf(m.date) !== yearOf(v.date)) fail(`${m.id}: the card's year ${yearOf(m.date)} is not the verified ${yearOf(v.date)}`);
    if (m.hint !== r.hint?.text) fail(`${m.id}: hint ships "${m.hint}", verified "${r.hint?.text}"`);
    if (m.funFact !== r.funFact?.text) fail(`${m.id}: fun fact ships "${m.funFact}", verified "${r.funFact?.text}"`);
  }
  if (seen.size < 35) fail(`only ${seen.size} matches compared`);
  else console.log(`  ${seen.size} matches compared on sides, competition, date, year, score, hint and fun fact`);
}

// ---------------------------------------------------------------------------
head(5, 'no record entry the files no longer ship');
{
  const shippedHof = new Set(hofPlayers.map(p => p.id));
  const shippedYears = new Set(years.map(p => String(p.year)));
  const shippedMatches = new Set(matches.map(m => m.id));
  let n = 0;
  for (const id of Object.keys(record.hofOrBust)) { n += 1; if (!shippedHof.has(id)) fail(`the record holds Hall of Fame card ${id} but hofPlayers.ts no longer ships it`); }
  for (const y of Object.keys(record.guessTheYear)) { n += 1; if (!shippedYears.has(y)) fail(`the record holds Guess the Year ${y} but the file no longer ships it`); }
  for (const id of Object.keys(record.scorePredictor)) { n += 1; if (!shippedMatches.has(id)) fail(`the record holds Score Predictor ${id} but the file no longer ships it`); }
  console.log(`  ${n} record entries, each still shipped`);
}

// ---------------------------------------------------------------------------
fs.rmSync(TMP, { recursive: true, force: true });
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const reds = [...red].sort((a, b) => a - b);
  if (reds.length === 1 && reds[0] === want) {
    console.log(`\nCONTROL ${CONTROL}: section ${want} is red and no other section is. The check caught the break.`);
    process.exit(1);
  }
  console.error(`\nCONTROL ${CONTROL}: expected only section ${want} red, got [${reds.join(', ')}]. The control proves nothing.`);
  process.exit(2);
}
if (failures) { console.error(`\nsimTriviaFacts: ${failures} failure(s) in section(s) ${[...red].sort((a, b) => a - b).join(', ')}`); process.exit(1); }
console.log('\nsimTriviaFacts: every Hall of Fame or Bust line, every Guess the Year clue and every Score Predictor match matches its two source record, and the record holds nothing the files dropped.');
