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
 * The Round 661 fix (after its review) added sections 6 to 8: the reveal no
 * longer calls the game's verdict "official" and says whether the player is
 * really in a Hall of Fame; a Score Predictor guess saved against the old
 * order of the nine turned round matches follows the new order; and the List
 * Quiz's Champions League season top scorers take in every joint top scorer
 * and 2025-26.
 *
 * WHAT IT CHECKS. Each section loads the shipped module itself (bundled with
 * esbuild, so it reads the values the game reads, not a regex over the text)
 * and compares it with the record, both ways.
 *
 *    1. The record itself: every fact carries at least two sources on two
 *       different sites, at least one official for its sport or a stated
 *       reason why not, at least one that is not official, none on a wiki,
 *       none on a www.fifa.com article page (those are script shells with no
 *       text, so they are no source at all), and a check date that has
 *       happened, as has any asOf. Editorial lines say why.
 *    2. Hall of Fame or Bust (src/data/hofPlayers.ts): every stat, hint and fun
 *       fact equals its record line word for word, the answer and verdict
 *       match, every card keeps three hints, and for a player still playing a
 *       career total is always a floor ('43,000+') and any other count on his
 *       card (titles, awards, a World Cup) is a floor or its record line
 *       carries asOf, the date it was last checked.
 *    3. Guess the Year (src/data/guessTheYearPuzzles.ts): every clue equals its
 *       record entry, in order, and every year has exactly six.
 *    4. Score Predictor (src/data/scorePredictorPuzzles.ts): both sides, the
 *       competition, the date, the year it falls in and the score equal the
 *       record, and so do the hint and the fun fact.
 *    5. No record entry the files no longer ship: a player, a year or a match
 *       the record holds must still be in its file, so the record cannot rot
 *       into a list of things that used to be true.
 *    6. The real Hall of Fame (the hall field and src/lib/hofHall.ts): every
 *       card's hall equals its sourced record entry, a 'not in' carries asOf,
 *       a player who is really in a hall is never called a bust or
 *       borderline, the line the reveal prints says what the record says, and
 *       the board labels the verdict as the game's call, never "Official".
 *    7. Score Predictor saved guesses (src/lib/scorePredictorSave.ts): the
 *       turned round list equals the matches whose order the record says
 *       changed, a save from before follows the new order on exactly those,
 *       a save with sides follows its sides or is dropped, wreckage is
 *       dropped, and the hook reads and writes through it.
 *    8. List Quiz, Champions League season top scorers (src/lib/listQuiz.ts):
 *       every supplement row is in the record on uefa.com's season page plus
 *       one independent source, the code list, the record and the migration
 *       hold the same rows, the season shape keeps the good rows and drops
 *       every bad shape the table has, and every must accept name resolves
 *       through the quiz's own alias map with no table at all.
 *
 * NEGATIVE CONTROLS (TRIVIA_FACTS_CONTROL). Each edits only an in memory copy
 * (line endings normalised to LF first, so a CRLF checkout behaves the same),
 * refuses to run unless its anchor occurs exactly once and the edit changed
 * something, and must turn exactly its own section red. Under a control the
 * harness exits 1 when exactly the predicted section is red (the break was
 * caught) and 2 when it is not (the control proves nothing).
 *   onesource   one Guess the Year clue loses its second source           section 1
 *   shellsource a www.fifa.com script shell goes back into a clue sources  section 1
 *   hofline     Jordan's card goes back to Kobe's 33,643 points           section 2
 *   floor       LeBron's floor becomes an exact total that will expire    section 2
 *   asof        LeBron's '4 NBA championships' loses its asOf             section 2
 *   gtyclue     the Chiefs' imaginary 2025 three-peat is put back         section 3
 *   gtyfive     1998 drops to five clues                                  section 3
 *   spscore     the Ajax v Spurs semi goes back to Spurs at home 3-2      section 4
 *   spdate      the 1994 Milan final goes back to 24 May                  section 4
 *   stale       the record holds a Hall of Fame card the file dropped     section 5
 *   owenbust    Owen, a Hall of Famer since 2014, is called a bust again  section 6
 *   official    the reveal says "Official verdict" again                  section 6
 *   spswap      nba-5 falls off the turned round list                     section 7
 *   spload      the hook reads a save without restoreDailyGuess           section 7
 *   uclsupp     Raphinha falls off the code supplement                    section 8
 *   uclshape    the season shape test accepts anything                    section 8
 *   uclsql      the migration's Yorke row drifts from the record          section 8
 *
 * Nothing here touches the network: the List Quiz module is bundled with an
 * offline stand in for the Supabase client.
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
const EXPECT = {
  onesource: 1, shellsource: 1, hofline: 2, floor: 2, asof: 2, gtyclue: 3, gtyfive: 3, spscore: 4, spdate: 4, stale: 5,
  owenbust: 6, official: 6, spswap: 7, spload: 7, uclsupp: 8, uclshape: 8, uclsql: 8,
};
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
const cannot = (msg) => { console.error(`CONTROL ${CONTROL} cannot run: ${msg}`); process.exit(2); };

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
/* Code without its comments, so a guard that reads source is satisfied by the
   code and never by the prose explaining it. Strings are kept whole. */
const codeOnly = (text) => {
  let out = '';
  for (let i = 0; i < text.length;) {
    const c = text[i];
    const n2 = text.slice(i, i + 2);
    if (n2 === '//') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (n2 === '/*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? text.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== c) { if (text[j] === '\\') j++; j++; }
      out += text.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
};
/* JSX comments are written {/* ... *\/}, which codeOnly already removes. */
const sqlCode = (text) => text.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
/* www.fifa.com article pages are a 4.5 KB script shell with no text in them,
   so a claim resting on one rests on nothing. inside.fifa.com renders. Hosts
   are compared whole, so a subdomain that does render is not caught. */
const SHELL_HOSTS = new Set(['www.fifa.com', 'fifa.com']);
const isShell = (u) => { try { return SHELL_HOSTS.has(new URL(u).hostname.toLowerCase()); } catch { return false; } };

// ---------------------------------------------------------------------------
let record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));

const HOF = 'src/data/hofPlayers.ts';
const GTY = 'src/data/guessTheYearPuzzles.ts';
const SP = 'src/data/scorePredictorPuzzles.ts';
const HALL_LIB = 'src/lib/hofHall.ts';
const BOARD = 'src/components/hof-or-bust/HofOrBustBoard.tsx';
const SP_SAVE = 'src/lib/scorePredictorSave.ts';
const SP_HOOK = 'src/hooks/useScorePredictor.ts';
const LQ = 'src/lib/listQuiz.ts';
const SUPA = 'src/integrations/supabase/client.ts';
const UCL_SQL = 'supabase/migrations/20260928210000_ucl_joint_top_scorers.sql';
const over = {};
let boardSrc = src(BOARD);
let hookSrc = src(SP_HOOK);
let sqlSrc = src(UCL_SQL);

if (CONTROL === 'onesource') {
  const clue = record.guessTheYear?.['2025']?.clues?.[1];
  if (!Array.isArray(clue?.src) || clue.src.length !== 2) cannot('the 2025 Panthers clue no longer has exactly two sources to cut to one');
  record = structuredClone(record);
  record.guessTheYear['2025'].clues[1].src = clue.src.slice(0, 1);
}
if (CONTROL === 'shellsource') {
  const clue = record.guessTheYear?.['2022']?.clues?.[5];
  if (!Array.isArray(clue?.src) || clue.src.some(isShell)) cannot('the 2022 Messi clue is missing or already cites a www.fifa.com shell');
  record = structuredClone(record);
  record.guessTheYear['2022'].clues[5].src.push('https://www.fifa.com/en/tournaments/mens/worldcup/articles/kylian-mbappe-world-cup-finals-goals');
}
if (CONTROL === 'hofline') {
  over[HOF] = rewrite(src(HOF), "anonymizedStats: ['32,292 career points',", "anonymizedStats: ['33,643 career points',", "Jordan's points line");
}
if (CONTROL === 'floor') {
  const rec = record.hofOrBust['nba-4'];
  if (rec?.stats?.[0]?.text !== '43,000+ career points') cannot('the record no longer holds LeBron\'s 43,000+ floor');
  /* The record moves with the file, so only the floor rule can catch it. The
     anchor is the code line, not the header comment that quotes the floor. */
  record = structuredClone(record);
  record.hofOrBust['nba-4'].stats[0].text = '43,440 career points';
  over[HOF] = rewrite(src(HOF), "anonymizedStats: ['43,000+ career points',", "anonymizedStats: ['43,440 career points',", "LeBron's floor");
}
if (CONTROL === 'asof') {
  const line = record.hofOrBust?.['nba-4']?.stats?.[1];
  if (line?.text !== '4 NBA championships' || !line.asOf) cannot('LeBron\'s "4 NBA championships" line is missing or carries no asOf to remove');
  record = structuredClone(record);
  delete record.hofOrBust['nba-4'].stats[1].asOf;
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
  if (!record.hofOrBust?.['nfl-1'] || record.hofOrBust['nfl-6']) cannot('nfl-1 is missing or nfl-6 already exists');
  /* A copy of a sound entry, so the record rules stay green and only the
     "the file no longer ships it" check can see it. */
  record = structuredClone(record);
  record.hofOrBust['nfl-6'] = structuredClone(record.hofOrBust['nfl-1']);
}
if (CONTROL === 'owenbust') {
  if (record.hofOrBust?.['soc-4']?.verdict?.v !== 'hof') cannot('the record does not hold Owen as hof');
  /* File and record move together, so the word for word check stays green and
     only the "a Hall of Famer is never a bust" rule can see it. */
  record = structuredClone(record);
  record.hofOrBust['soc-4'].verdict.v = 'bust';
  over[HOF] = rewrite(src(HOF), "    answer: 'Michael Owen',\n    verdict: 'hof',", "    answer: 'Michael Owen',\n    verdict: 'bust',", "Owen's verdict");
}
if (CONTROL === 'official') {
  boardSrc = rewrite(boardSrc, 'Our call: <span', 'Official verdict: <span', 'the reveal label');
}
if (CONTROL === 'spswap') {
  over[SP_SAVE] = rewrite(src(SP_SAVE), "'nba-2', 'nba-5', 'nba-7'", "'nba-2', 'nba-7'", 'nba-5 in the turned round list');
}
if (CONTROL === 'spload') {
  hookSrc = rewrite(hookSrc, 'restoreDailyGuess(JSON.parse(raw), puzzle)', 'JSON.parse(raw)', 'the hook\'s restore call');
}
if (CONTROL === 'uclsupp') {
  over[LQ] = rewrite(src(LQ), "  ['2024-25', 'Raphinha'],\n", '', 'the Raphinha supplement row');
}
if (CONTROL === 'uclshape') {
  over[LQ] = rewrite(src(LQ), 'const UCL_SEASON_SHAPE = /^\\d{4}[-\\u2010-\\u2015]\\d{2,4}$/;', 'const UCL_SEASON_SHAPE = /./;', 'the season shape test');
}
if (CONTROL === 'uclsql') {
  sqlSrc = rewrite(sqlSrc, "'Dwight Yorke'", "'Dwight York'", "the migration's Yorke row");
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
const today = new Date().toISOString().slice(0, 10);
const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d <= today;

/* The source rules for one fact, reported against whichever section calls it.
   Returns 'official' or 'noOfficial' so the caller can count. */
function sourceRules(where, node, official) {
  const list = node?.src || [];
  const sites = list.map(siteOf);
  if (list.length < 2) { fail(`${where}: ${list.length} source(s), two are required`); return null; }
  if (sites.some(h => !h)) { fail(`${where}: a source is not a URL`); return null; }
  if (new Set(sites).size < 2) { fail(`${where}: every source is on ${sites[0]}, which is one source`); return null; }
  if (sites.some(h => WIKIS.includes(h))) { fail(`${where}: a wiki is a spot check, never a source`); return null; }
  const shells = list.filter(isShell);
  if (shells.length) fail(`${where}: ${shells[0]} is a script shell with no text, so it is no source`);
  const readable = list.filter(u => !isShell(u)).map(siteOf);
  let kind = 'official';
  if (!readable.some(h => official.includes(h))) {
    if (typeof node.noOfficial === 'string' && node.noOfficial.length > 20) kind = 'noOfficial';
    else fail(`${where}: no official source (${official.join(', ')}) and no noOfficial reason over 20 characters`);
  }
  if (!sites.some(h => !official.includes(h))) fail(`${where}: no independent source, every source is official`);
  if (!isDate(node.on)) fail(`${where}: check date "${node.on}" is missing or in the future`);
  if ('asOf' in node && !isDate(node.asOf)) fail(`${where}: asOf "${node.asOf}" is not a date that has happened`);
  return kind;
}

head(1, 'the record: two sources on two sites, one official or a reason, one independent, no wiki, no script shell, real dates');
{
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
    if (sourceRules(where, node, official) === 'noOfficial') noOfficial.push(where);
    if (typeof node.text === 'string' && /[\u2013\u2014]/.test(node.text)) fail(`${where}: the text carries a dash the site never uses`);
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
  else console.log(`  ${facts} facts, each on two sites with an independent one; ${facts - noOfficial.length} carry a readable official source, ${editorial} lines are editorial with a reason`);
  if (noOfficial.length) console.log(`  ${noOfficial.length} stand on independent sources with a stated reason, for example ${noOfficial.slice(0, 3).join('; ')}`);
}

// ---------------------------------------------------------------------------
const hofMod = await loadModule(HOF, over);
const gtyMod = await loadModule(GTY, over);
const spMod = await loadModule(SP, over);
const hofPlayers = hofMod.default;
const years = gtyMod.guessTheYearPuzzles;
const matches = spMod.default;

head(2, 'Hall of Fame or Bust: every card line equals the record, and an active player\'s counts are floors or dated');
{
  const SPORT = { soccer: 'soccer', nfl: 'nfl', nba: 'nba', baseball: 'mlb', hockey: 'nhl' };
  /* A count is a digit or a number word. Spelled out counts ('three
     franchises', 'six World Cups') expire exactly as digits do. */
  const COUNT = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|once|twice|single|double|triple|back-to-back)\b/i;
  const FLOOR = /\d[\d,]*\+/;
  const rec = record.hofOrBust;
  let n = 0;
  let lines = 0;
  let dated = 0;
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
    if (r.active) {
      /* An exact career total for a man still playing is a fact with an
         expiry date and this file has no step that refreshes it, so it must
         be a floor, whatever date it carries. */
      for (const t of p.anonymizedStats) if (/\bcareer\b/i.test(t) && !FLOOR.test(t)) fail(`${p.id}: "${t}" is an exact career total for a player still playing; ship a floor ('43,000+')`);
      /* Any other count on his card is a floor or says when it was true. */
      const shippedLines = [
        ...p.anonymizedStats.map((t, i) => [t, r.stats[i]]),
        ...p.hints.map((t, i) => [t, r.hints[i]]),
        [p.funFact, r.funFact],
      ];
      for (const [t, line] of shippedLines) {
        if (!COUNT.test(t) || FLOOR.test(t)) continue;
        if (!line?.asOf) fail(`${p.id}: "${t}" is a count for a player still playing, with no floor and no asOf in its record line`);
        else dated += 1;
      }
    }
  }
  /* A floor that proves the module loaded and the loop ran; there are 25 cards. */
  if (n < 25) fail(`only ${n} cards compared`);
  else console.log(`  ${n} cards, ${lines} lines, each equal to its record line; ${dated} counts for players still playing carry their asOf`);
  if (!CONTROL && dated < 10) fail(`only ${dated} dated counts found for active players, so the count rule is not reaching the cards`);
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
head(6, 'the real Hall of Fame: sourced, never contradicted by the verdict, and the reveal says it');
{
  const hallMod = await loadModule(HALL_LIB, over);
  const hallStatusLine = hallMod.hallStatusLine;
  const SPORT = { soccer: 'soccer', nfl: 'nfl', nba: 'nba', baseball: 'mlb', hockey: 'nhl' };
  let inducted = 0;
  let notIn = 0;
  let none = 0;
  for (const p of hofPlayers) {
    const r = record.hofOrBust[p.id];
    if (!r) continue;
    const h = r.hall;
    if (h === undefined) { fail(`${p.id}: the record has no hall entry`); continue; }
    if (!same(p.hall, h.v ?? null)) fail(`${p.id}: hall ships ${JSON.stringify(p.hall)}, the record holds ${JSON.stringify(h.v ?? null)}`);
    if (h.v === null) {
      none += 1;
      if (!h.editorial || !(typeof h.why === 'string' && h.why.length > 20)) fail(`${p.id}: a card with no hall must be marked editorial with its reason`);
      if (SPORT[p.sport] !== 'soccer') fail(`${p.id}: only soccer goes without a hall; ${p.sport} has one`);
    } else {
      const official = record.officialHosts?.[r.sport] || [];
      sourceRules(`hofOrBust.${p.id}.hall`, h, official);
      if (!(typeof h.v.name === 'string' && /Hall of Fame$/.test(h.v.name))) fail(`${p.id}: hall name "${h.v?.name}" does not name a Hall of Fame`);
      if (h.v.year === null) {
        notIn += 1;
        /* Not in is true today and can stop being true at the next election. */
        if (!isDate(h.asOf)) fail(`${p.id}: 'not in the ${h.v.name}' carries no asOf, the date it was checked`);
      } else {
        inducted += 1;
        if (!Number.isInteger(h.v.year) || h.v.year < 1945 || String(h.v.year) > today.slice(0, 4)) fail(`${p.id}: induction year ${h.v.year} is not a plausible year`);
        /* A player who is really in a hall is a Hall of Famer, whatever the
           card thinks of his career. */
        if (p.verdict !== 'hof') fail(`${p.id} (${p.answer}) is in the ${h.v.name} (${h.v.year}) but the card calls him ${p.verdict}`);
      }
    }
    const line = hallStatusLine(p);
    if (/official/i.test(line)) fail(`${p.id}: the hall line "${line}" calls something official`);
    if (p.hall && p.hall.year !== null && !(line.includes(p.hall.name) && line.includes(String(p.hall.year)))) fail(`${p.id}: the hall line "${line}" drops the hall or the year he went in`);
    if (p.hall && p.hall.year === null && !line.startsWith(`Not in the ${p.hall.name}`)) fail(`${p.id}: the hall line "${line}" does not say he is not in`);
    if (!p.hall && !/no single Hall of Fame/.test(line)) fail(`${p.id}: the hall line "${line}" does not say the call is ours`);
  }
  /* The reveal itself: the verdict is labelled as the game's call and the
     hall line is rendered. Read from the code, never from its comments. */
  const board = codeOnly(boardSrc);
  if (/official verdict/i.test(board)) fail('HofOrBustBoard still labels the verdict "Official verdict"');
  /* The page's fallback how to play list and the guide say what the reveal
     shows, so they cannot promise an "official verdict" either. */
  for (const rel of ['src/pages/HofOrBust.tsx', 'src/data/gameContent/world.ts']) {
    if (/official verdict/i.test(codeOnly(src(rel)))) fail(`${rel} still tells players the reveal shows an "official verdict"`);
  }
  if (!/Our call:/.test(board)) fail('HofOrBustBoard no longer labels the verdict "Our call"');
  if (!/hallStatusLine\(player\)/.test(board)) fail('HofOrBustBoard no longer renders hallStatusLine(player)');
  if (inducted + notIn + none < 25) fail(`only ${inducted + notIn + none} hall entries checked`);
  else console.log(`  ${inducted} cards in a real hall with the year, ${notIn} not in (each dated), ${none} soccer cards with no single hall; the reveal says "Our call" and prints the hall line`);
}

// ---------------------------------------------------------------------------
head(7, 'Score Predictor: a saved guess follows the sides it was typed against');
{
  const save = await loadModule(SP_SAVE, over);
  const { restoreDailyGuess, dailyGuessRecord, SIDES_SWAPPED_IN_ROUND_661 } = save;
  const listed = new Set(SIDES_SWAPPED_IN_ROUND_661);
  /* What the record says changed: every match with the order it had before.
     Compared with the record's own sides, so a card that drifts from the
     record is section 4's to catch, not this one's. */
  const turned = new Set();
  for (const [id, e] of Object.entries(record.scorePredictor)) {
    const b = e?.match?.before661;
    if (!b) continue;
    turned.add(id);
    const v = e.match.v;
    if (!(b.homeTeam === v.awayTeam && b.awayTeam === v.homeTeam)) fail(`${id}: before661 (${b.homeTeam} v ${b.awayTeam}) is not the verified card turned round`);
  }
  for (const id of turned) if (!listed.has(id)) fail(`${id} was turned round in Round 661 but is not in SIDES_SWAPPED_IN_ROUND_661, so an old save shows the guess against the wrong sides`);
  for (const id of listed) if (!turned.has(id)) fail(`${id} is in SIDES_SWAPPED_IN_ROUND_661 but the record says its order never changed, so an old save gets turned round for nothing`);
  let cases = 0;
  const expect = (what, got, want) => { cases += 1; if (!same(got, want)) fail(`${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
  for (const m of matches) {
    const oldSave = { guessHome: 3, guessAway: 1, score: 200 };
    expect(`${m.id}, a save from before Round 661`, restoreDailyGuess(oldSave, m), turned.has(m.id) ? { guessHome: 1, guessAway: 3, score: 200 } : { guessHome: 3, guessAway: 1, score: 200 });
    expect(`${m.id}, a save with today's sides`, restoreDailyGuess({ ...oldSave, homeTeam: m.homeTeam, awayTeam: m.awayTeam }, m), oldSave);
    expect(`${m.id}, a save with the sides the other way`, restoreDailyGuess({ ...oldSave, homeTeam: m.awayTeam, awayTeam: m.homeTeam }, m), { guessHome: 1, guessAway: 3, score: 200 });
    expect(`${m.id}, a save about another match`, restoreDailyGuess({ ...oldSave, homeTeam: 'Somebody Else', awayTeam: m.awayTeam }, m), null);
    const g = { guessHome: 2, guessAway: 0, score: 700 };
    expect(`${m.id}, a save written now and read back`, restoreDailyGuess(JSON.parse(JSON.stringify(dailyGuessRecord(g, m))), m), g);
  }
  const m0 = matches[0];
  for (const [what, raw] of [['null', null], ['a string', 'x'], ['an array', []], ['an empty object', {}], ['a text guess', { guessHome: '2', guessAway: 1, score: 50 }],
    ['a negative guess', { guessHome: -1, guessAway: 1, score: 50 }], ['a fractional guess', { guessHome: 1.5, guessAway: 1, score: 50 }], ['no score', { guessHome: 1, guessAway: 1 }]]) {
    expect(`wreckage: ${what}`, restoreDailyGuess(raw, m0), null);
  }
  /* The hook must actually go through it, both ways. Code only. */
  const hook = codeOnly(hookSrc);
  if (!/restoreDailyGuess\(JSON\.parse\(raw\), puzzle\)/.test(hook)) fail('useScorePredictor reads a saved guess without restoreDailyGuess');
  if (!/dailyGuessRecord\(/.test(hook)) fail('useScorePredictor saves a guess without the sides it was typed against (dailyGuessRecord)');
  if (turned.size !== 9) fail(`the record marks ${turned.size} matches as turned round in Round 661, not the nine the round changed`);
  else console.log(`  ${turned.size} turned round matches, the list agrees with the record; ${cases} save cases hold, and the hook reads and writes through them`);
}

// ---------------------------------------------------------------------------
head(8, 'List Quiz: Champions League season top scorers, joint ones and 2025-26 included');
{
  const U = record.listQuizUclTopScorers;
  if (!U || !Array.isArray(U.rows)) { fail('the record has no listQuizUclTopScorers rows'); }
  else {
    /* The record: each row on uefa.com's season page and one other site. */
    const uefaYear = (season) => { const start = Number(season.slice(0, 4)); return start <= 2006 ? start : start + 1; };
    for (const r of U.rows) {
      const where = `listQuizUclTopScorers ${r.season} ${r.player}`;
      if (!/^\d{4}-(\d{2}|\d{4})$/.test(r.season)) fail(`${where}: season "${r.season}" is not written 1999-2000 or 2014-15`);
      if (sourceRules(where, r, ['uefa.com']) !== 'official') fail(`${where}: not on uefa.com`);
      const page = `https://www.uefa.com/uefachampionsleague/history/seasons/${uefaYear(r.season)}/`;
      if (!r.src.includes(page)) fail(`${where}: the uefa.com source is not that season's page (${page})`);
      if (!(r.goals === null || (Number.isInteger(r.goals) && r.goals > 0))) fail(`${where}: goals ${r.goals} is neither a count nor null`);
      if (r.goals === null && !(typeof r.note === 'string' && r.note.length > 20)) fail(`${where}: goals left empty without a note saying why`);
    }
    if (!Array.isArray(U.notAdded) || !U.notAdded.every(x => typeof x.why === 'string' && x.why.length > 20)) fail('listQuizUclTopScorers.notAdded must say why each name one source gives stays out');
    /* The shipped list, offline: the Supabase client is replaced by a stand in
       that refuses every query, so nothing here can reach the network. */
    const lqMod = await loadModule(LQ, { ...over, [SUPA]: "export const SUPABASE_URL = ''; export const SUPABASE_PUBLISHABLE_KEY = ''; export const supabase = { from() { throw new Error('simTriviaFacts is offline'); } };" });
    const code = lqMod.UCL_TOP_SCORER_SUPPLEMENT.map(([season, player]) => `${season} ${player}`);
    const want = U.rows.map(r => `${r.season} ${r.player}`);
    if (!same(code, want)) fail(`UCL_TOP_SCORER_SUPPLEMENT (${code.length} rows) is not the record's ${want.length} rows in order; first difference: code "${code.find((c, i) => c !== want[i]) ?? '(none)'}", record "${want.find((w, i) => w !== code[i]) ?? '(none)'}"`);
    /* The migration holds the same rows, with club and goals, and its closing
       checks count them. SQL comments are dropped before reading. */
    const sql = sqlCode(sqlSrc);
    const tuples = [...sql.matchAll(/\(\s*(\d+),\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(\d+|null)\s*\)/g)]
      .map(t => `${t[2]} ${t[3]} ${t[4]} ${t[5]}`);
    const wantSql = U.rows.map(r => `${r.season} ${r.player} ${r.club} ${r.goals === null ? 'null' : r.goals}`);
    if (!same(tuples, wantSql)) fail(`the migration's ${tuples.length} rows are not the record's ${wantSql.length}; first difference: migration "${tuples.find((c, i) => c !== wantSql[i]) ?? '(none)'}", record "${wantSql.find((w, i) => w !== tuples[i]) ?? '(none)'}"`);
    for (const n of [144 + U.rows.length, 70 + U.rows.length]) if (!sql.includes(`n <> ${n}`)) fail(`the migration does not check for ${n} rows after the insert`);
    if ((sql.match(/raise exception/g) || []).length < 8) fail('the migration has fewer than eight fail closed checks');
    /* The shape test against every row shape the table holds. */
    const FIXTURE = [
      { season: '2019\u201320', player: 'Robert Lewandowski' },
      { season: '2022-23', player: 'Erling Haaland' },
      { season: '29', player: "Samuel Eto'o" },
      { season: '16', player: 'Eusébio \u2021' },
      { season: 'Álvaro Morata', player: '30' },
      { season: 'Jean-Pierre Papin', player: '3' },
      { season: 'Hungary', player: '4' },
    ];
    const names = lqMod.uclSeasonTopScorerNames(FIXTURE);
    for (const keep of ['Robert Lewandowski', 'Erling Haaland']) if (!names.includes(keep)) fail(`the season shape drops ${keep}, a real season row`);
    for (const drop of ["Samuel Eto'o", 'Eusébio \u2021', '30', '3', '4', 'Hungary', 'Álvaro Morata']) if (names.includes(drop)) fail(`the season shape lets "${drop}" through, which is not a season row`);
    /* With no table at all, the supplement alone makes the game right, each
       man once, and every must accept name resolves through the alias map. */
    const offline = lqMod.cleanAnswers(lqMod.uclSeasonTopScorerNames([]));
    const alias = lqMod.buildAliasMap(offline);
    const folded = offline.map(lqMod.normalize);
    for (const r of U.rows) {
      const k = lqMod.normalize(r.player);
      const count = folded.filter(f => f === k).length;
      if (count !== 1) fail(`${r.player} appears ${count} times in the answers with no table, not once`);
    }
    for (const typed of U.mustAccept || []) if (!alias.has(lqMod.normalize(typed))) fail(`typing "${typed}" is marked not on the list`);
    if ((U.mustAccept || []).length < 5) fail('listQuizUclTopScorers.mustAccept names fewer than five players, so the check proves little');
    /* The table's rows and the supplement together fold to one answer each. */
    const both = lqMod.cleanAnswers(lqMod.uclSeasonTopScorerNames([{ season: '2023\u201324', player: 'Harry Kane' }, { season: '2025\u201326', player: 'Kylian Mbappé' }]));
    if (both.filter(a => lqMod.normalize(a) === lqMod.normalize('Kylian Mbappé')).length !== 1) fail('once the migration lands, Mbappe is not folded into one answer');
    console.log(`  ${U.rows.length} supplement rows, each on uefa.com and one independent source; code, record and migration agree; the shape keeps 2 real rows and drops 5 bad shapes; ${offline.length} answers with no table, ${(U.mustAccept || []).length} must accept names resolve`);
  }
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
console.log('\nsimTriviaFacts: every Hall of Fame or Bust line, Guess the Year clue and Score Predictor match matches its two source record, the reveal says who is really in a Hall of Fame, old Score Predictor saves follow the new sides, the Champions League top scorer list takes every joint top scorer, and the record holds nothing the files dropped.');
process.exit(0);
