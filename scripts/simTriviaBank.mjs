import './lib/seedRandom.mjs';
/* Round 1552: Sports Millionaire asks questions with one right answer.

   The ladder is fifteen questions and one wrong answer ends the climb, so a question with two right
   answers takes a run away from somebody who knew it. Three ways that happened, all in
   src/lib/triviaQuestionBank.ts, and what this harness holds about each over the real generator:

     TIES      "worth the most" drew four players and marked the first of a sort right. The top band
               of 2026 is 109 players on 17 values, so two of four sharing the top value was routine.
               Held: every worth the most question's top value beats the second by MIN_RATIO.
     TENSE     "Which club does X play for?", "right now" and "Which of these players plays X?" over a
               dated snapshot. Held: no question says "play for", "right now" or "plays" (the position
               question was added after the Round 1552 review).
     NAMESAKES the pool keeps one row per name, so a name two players share is one of them. Held: no
               question built from the market pool has a name of src/data/marketNamesakes.json as its
               subject or as an option.
   Plus the plain one right answer checks every market question can carry (exactly one option is
   true of the row asked about, no "Without Club" or "Retired" offered as a club, no reserve side
   offered beside its first team or one club under two spellings, section 8), no ladder short of
   fifteen (a short ladder is the page's error screen), the hard band not starved, the daily that was
   already dealt not re-dealt (dates before ONE_ANSWER_FROM reproduce the base generator exactly),
   the namesake list current with its generator and holding every name the saved rows show as two
   men in one season (worked out by this harness on its own), and Face Off and this bank on one MIN_RATIO.

   THE FIXTURE is shaped like the live slice because it is a saved copy of it:
     market     every 2026 row of player_market_values_dedup with a value, name, nationality, club
                and value (scripts/data/alphabetSprintPool.json, 5,496 rows pulled 2026-09-05), in the
                order fetchMarketPool reads them (value down, then name). The pull has no position:
                it is real where scripts/data/auctionMarketRows.json (top 600) or the newest season of
                scripts/data/stockMarketPools.json carries the name, and DRAWN for the rest from the
                spread of the real ones by a hash of the name. A drawn position is a measuring aid
                and is never shipped.
     ballonDor  the 76 verified rows of scripts/data/ballonDorVerified2026-09.json.
     shirts     40 synthetic rows (the shirt question is not what this round changes).
   The planted cases are the real ones: the top band's tie blocks (Haaland, Mbappe and Yamal share
   one value) and the listed namesakes in every band (the harness refuses to run without both).
   Nothing here reaches the network: the database client is swapped for one that throws.

   MEASURED (runner r1552-a, 2026-10-22, 5,000 daily dates from 2026-10-25): the OLD rules on those
   dates dealt 557 tied worth the most questions out of 4,731, 1,414 questions about a listed
   namesake, 19,472 in the present tense and 169 with a non club offered as a club; the new rules 0 of
   each, with worth the most dealt 4,737 times (easy 3,098, medium 1,184, hard 455 against 3,100,
   1,176, 455), so dropping the ties starved no band. Every builder succeeds 100% in every band under
   both rules, which is why the floors of section 5 sit at 100% (99% for worth the most, whose twelve
   draws could in principle all tie). The checks of sections 2 and 3 are zero tolerance because each
   one is a question with two right answers or none, and the baseline proves each is visible.

   Run: node scripts/simTriviaBank.mjs
   Negative controls (each edits a copy of the bank, refuses to run if its target string is not
   there, and must turn its own section red):
     TRIVIA_CONTROL=ties      the clear winner check is removed from worth the most   (section 2)
     TRIVIA_CONTROL=namesake  the namesake filter is removed                          (section 2)
     TRIVIA_CONTROL=tense     the club question says "play for" again                 (section 2)
     TRIVIA_CONTROL=postense  the position question says "plays" again                (section 2)
     TRIVIA_CONTROL=family    a reserve side and its first team are offered together  (section 8)
     TRIVIA_CONTROL=legacy    dates before ONE_ANSWER_FROM get the new rules          (section 4)
     TRIVIA_CONTROL=rulec     a copy of scripts/genMarketNamesakes.mjs loses rule C   (sections 6 and 6b)
   Re-measure the legacy hashes from any copy of the bank (the base of this round was c75d04dad):
     TRIVIA_BANK_FILE=<path> node scripts/simTriviaBank.mjs --print-legacy
*/
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROLS = ['ties', 'namesake', 'tense', 'postense', 'family', 'legacy', 'rulec'];
const CONTROL = process.env.TRIVIA_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`TRIVIA_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
const PRINT_LEGACY = process.argv.includes('--print-legacy');
const LADDERS = Number(process.env.TRIVIA_LADDERS || 5000);
const UNLIMITED = Number(process.env.TRIVIA_UNLIMITED || 1000);
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const T0 = Date.now();
const section = text => console.log(`${text} [${((Date.now() - T0) / 1000).toFixed(1)}s]`);
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const fwd = p => p.split(path.sep).join('/');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

/* ---------------- the fixture ---------------- */
const alpha = JSON.parse(read('scripts/data/alphabetSprintPool.json')).rows;
const auction = new Map(JSON.parse(read('scripts/data/auctionMarketRows.json')).map(r => [r.player_name, r.position]));
const stock = JSON.parse(read('scripts/data/stockMarketPools.json'));
const stockPos = new Map();
for (const season of Object.keys(stock.pools).sort()) for (const r of stock.pools[season]) if (r[1]) stockPos.set(r[0], r[1]);
const realPositions = [...auction.values(), ...stockPos.values()].filter(Boolean);
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
let realShape = 0;
const market = alpha
  .filter(r => r.player_name && r.market_value_usd)
  .map(r => {
    const known = auction.get(r.player_name) ?? stockPos.get(r.player_name) ?? null;
    if (known) realShape += 1;
    return { player_name: r.player_name, position: known ?? realPositions[hash(r.player_name) % realPositions.length], nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd) };
  })
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballonDor = JSON.parse(read('scripts/data/ballonDorVerified2026-09.json')).rows
  .map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }))
  .sort((a, b) => b.year - a.year || a.rank - b.rank || (a.player_name < b.player_name ? -1 : 1));
const clubs = [...new Set(market.map(r => r.club).filter(Boolean))].slice(0, 20);
const shirtNumbers = Array.from({ length: 40 }, (_, i) => ({ player_name: `Shirt Fixture ${i + 1}`, club: clubs[i % clubs.length], league: 'Fixture League', nationality: 'Fixtureland', kit_number: i + 1 }));
const POOL = { market, ballonDor, shirtNumbers };
const byName = new Map(market.map(r => [r.player_name, r]));

/* ---------------- the real bank, or a copy with one control in it, over a client that throws ---------------- */
const BANK_FILE = process.env.TRIVIA_BANK_FILE ? path.resolve(process.env.TRIVIA_BANK_FILE) : path.join(ROOT, 'src/lib/triviaQuestionBank.ts');
const SWAPS = {
  ties: ['    if (rules.oneAnswer && !clearlyAhead(sorted[0].market_value_usd, sorted[1].market_value_usd)) continue;\n', '', 'worth the most stops checking for a clear top value'],
  namesake: ['return rules.oneAnswer ? band.filter((p) => !MARKET_NAMESAKES.has(p.player_name)) : band;', 'return band;', 'the namesake filter is gone'],
  tense: ['`Which club was ${correct.player_name} at in the ${CURRENT_YEAR} market values?`','`Which club does ${correct.player_name} play for?`', 'the club question says "play for" again'],
  family: ['  const family = rules.oneAnswer ? clubFamily(correct.club as string) : null;\n', '  const family = null;\n', 'a reserve side and its first team can be offered together again'],
  postense: ['? `Who was listed at ${correct.position} in the ${CURRENT_YEAR} market values?`', '? `Which of these players plays ${correct.position}?`', 'the position question says "plays" again'],
  legacy: ['return dateStr < ONE_ANSWER_FROM ? LEGACY : ONE_ANSWER;', 'return ONE_ANSWER;', 'dates before ONE_ANSWER_FROM get the new rules'],
};
/* a control on the namesake generator edits a copy of it, which section 6 then derives the list from */
const GEN_SWAPS = {
  rulec: ['if (seen.size >= 2) {', 'if (false) {', "the generator's rule C (two different rows in one season are two men) is gone"],
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-trivia-'));
let bankSource = fs.readFileSync(BANK_FILE, 'utf8').replace(/\r\n/g, '\n');
if (SWAPS[CONTROL]) {
  const [from, to, what] = SWAPS[CONTROL];
  if (!bankSource.includes(from)) { console.error(`control cannot run: the bank does not contain ${JSON.stringify(from.trim())}`); process.exit(1); }
  bankSource = bankSource.replace(from, to);
  console.log(`NEGATIVE CONTROL ON: ${what}`);
}
let GEN_FILE = path.join(ROOT, 'scripts/genMarketNamesakes.mjs');
if (GEN_SWAPS[CONTROL]) {
  const [from, to, what] = GEN_SWAPS[CONTROL];
  const genSource = fs.readFileSync(GEN_FILE, 'utf8').replace(/\r\n/g, '\n');
  if (!genSource.includes(from)) { console.error(`control cannot run: the generator does not contain ${JSON.stringify(from)}`); process.exit(1); }
  GEN_FILE = path.join(tmp, 'genMarketNamesakes.mjs');
  fs.writeFileSync(GEN_FILE, genSource.replace(from, to));
  console.log(`NEGATIVE CONTROL ON: ${what}`);
}
if (/from '\.\.?\//.test(bankSource)) { console.error('cannot run: the bank imports by relative path, so a copy of it cannot be bundled'); process.exit(1); }
const bankCopy = path.join(tmp, 'triviaQuestionBank.ts');
fs.writeFileSync(bankCopy, bankSource);
const STUB = path.join(tmp, 'client.ts');
fs.writeFileSync(STUB, `export const SUPABASE_URL = 'fixture'; export const SUPABASE_PUBLISHABLE_KEY = 'fixture';
export const supabase: any = { from() { throw new Error('simTriviaBank never reaches the database'); } };\n`);
const entry = path.join(tmp, 'entry.ts');
fs.writeFileSync(entry, `export * from '${fwd(bankCopy)}';\n`);
const out = path.join(tmp, 'bundle.mjs');
const { build } = await import('esbuild');
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: ROOT,
  alias: { '@/integrations/supabase/client': STUB, '@': path.join(ROOT, 'src') } });
const T = await import(pathToFileURL(out).href);

const LEGACY_DATES = ['2026-10-22', '2026-10-23', '2026-10-24'];
const ladderHash = ladder => crypto.createHash('sha256').update(JSON.stringify(ladder)).digest('hex').slice(0, 16);
if (PRINT_LEGACY) {
  for (const d of LEGACY_DATES) console.log(`${d} ${ladderHash(T.generateDailyLadder(POOL, d, 15))}`);
  process.exit(0);
}
await build({ entryPoints: [path.join(ROOT, 'src/lib/clearWinner.ts')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'gap.mjs'), logLevel: 'error' });
const { MIN_RATIO } = await import(pathToFileURL(path.join(tmp, 'gap.mjs')).href);

/* ---------------- 1. the fixture carries the cases this round is about ---------------- */
section('1. the fixture');
const NAMESAKES = new Set(JSON.parse(read('src/data/marketNamesakes.json')).names);
const NOT_A_CLUB = new Set(['Without Club', 'Retired', 'Career break', 'Unknown']);
const N = market.length;
const EASY_END = Math.max(30, Math.floor(N * 0.02)), MID_END = Math.floor(N * 0.2);
const BANDS = { easy: market.slice(0, EASY_END), medium: market.slice(EASY_END, MID_END), hard: market.slice(MID_END) };
const bandOfDifficulty = d => (d <= 5 ? 'easy' : d <= 10 ? 'medium' : 'hard');
const easyValues = new Map();
for (const r of BANDS.easy) easyValues.set(r.market_value_usd, (easyValues.get(r.market_value_usd) || 0) + 1);
const biggestTie = Math.max(...easyValues.values());
console.log(`   ${N} rows of 2026, position real for ${realShape}; easy band ${BANDS.easy.length} players on ${easyValues.size} values (biggest tie ${biggestTie}), medium ${BANDS.medium.length}, hard ${BANDS.hard.length}`);
for (const [band, rows] of Object.entries(BANDS)) {
  const named = rows.filter(r => NAMESAKES.has(r.player_name)).map(r => r.player_name);
  console.log(`   ${band}: ${named.length} listed namesakes (${named.slice(0, 6).join(', ')}${named.length > 6 ? ', ...' : ''})`);
  if (named.length === 0) fail(`the ${band} band carries no listed namesake, so this harness could not see one asked`);
}
if (biggestTie < 2) fail('the easy band has no tied values, so this harness could not see a tie asked');
if (NAMESAKES.size < 40) fail(`the namesake list has ${NAMESAKES.size} names, well short of the 62 the saved rows show`);

/* ---------------- the one right answer checker every ladder goes through ---------------- */
/* the year is the bank's own CURRENT_YEAR, so a year bump does not need this harness edited */
const YEAR = Number(T.CURRENT_YEAR);
if (!(YEAR >= 2026)) fail(`the bank's CURRENT_YEAR reads ${T.CURRENT_YEAR}, so the dated templates cannot be checked`);
const TEMPLATES = [
  ['club', new RegExp(`^Which club was (.+) at in the ${YEAR} market values\\?$`)],
  ['club', /^Which club does (.+) play for\?$/],
  ['nationality', /^What nationality is (.+)\?$/],
  ['position', new RegExp(`^Who was listed at (.+) in the ${YEAR} market values\\?$`)],
  ['position', /^Which of these players plays (.+)\?$/],
  ['worth', new RegExp(`^Who was worth the most in the ${YEAR} market values\\?$`)],
  ['worth', /^Who is worth more right now \(highest market value\)\?$/],
  ['ballon', /^Who won the Ballon d'Or in (\d{4})\?$/],
  ['shirt', /^What shirt number has (.+) worn at (.+)\?$/],
];
const menWinner = new Map(ballonDor.filter(r => r.rank === 1 && r.award_type === 'Men').map(r => [r.year, r.player_name]));
function newTally() {
  return { ladders: 0, short: 0, questions: 0, ties: 0, namesake: 0, tense: 0, notAClub: 0, clubFamily: 0, wrong: 0, unknown: 0, dupOptions: 0, byType: {}, worthByBand: { easy: 0, medium: 0, hard: 0 }, examples: {} };
}
/* a reserve or youth side and its first team are one club to a player (Round 1552 review). This is the
   harness's own reading, written apart from the bank's clubFamily: drop a reserve mark, then a first or
   last word that only says "club" */
const RESERVE_WORD = /\s+(U\d{2}|B|II|Reserves|Youth|Juniors|Primavera|Castilla)$/i;
const LEAD_WORD = new Set(['fc', 'cf', 'sc', 'ac', 'bc', 'cd', 'club']);
const TRAIL_WORD = new Set(['fc', 'cf', 'sc', 'ac', 'bc', 'cd']);
function bareClub(c) {
  const words = c.trim().replace(RESERVE_WORD, '').toLowerCase().split(/\s+/);
  if (words.length > 1 && LEAD_WORD.has(words[0])) words.shift();
  if (words.length > 1 && TRAIL_WORD.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}
const sameClub = (a, b) => a !== b && bareClub(a) === bareClub(b);
function note(t, key, text) { t[key] += 1; if (!t.examples[key]) t.examples[key] = text; }
function checkQuestion(q, t) {
  t.questions += 1;
  const { question, options, correctIndex } = q;
  if (/play for|right now|\bplays\b/i.test(question)) note(t, 'tense', question);
  if (new Set(options).size !== options.length || options.length !== 4 || !(correctIndex >= 0 && correctIndex < options.length)) note(t, 'dupOptions', question);
  const hit = TEMPLATES.map(([type, re]) => [type, re.exec(question)]).find(([, m]) => m);
  if (!hit) { note(t, 'unknown', question); return; }
  const [type, m] = hit;
  t.byType[type] = (t.byType[type] || 0) + 1;
  const right = options[correctIndex];
  if (type === 'club' || type === 'nationality') {
    const row = byName.get(m[1]);
    const field = type === 'club' ? 'club' : 'nationality';
    if (NAMESAKES.has(m[1])) note(t, 'namesake', question);
    if (type === 'club' && options.some(o => NOT_A_CLUB.has(o))) note(t, 'notAClub', `${question} [${options.join(' / ')}]`);
    if (type === 'club' && options.some(o => sameClub(o, right))) note(t, 'clubFamily', `${question} [${options.join(' / ')}]`);
    if (!row || right !== row[field] || options.filter(o => o === row[field]).length !== 1) note(t, 'wrong', question);
  } else if (type === 'position') {
    if (options.some(o => NAMESAKES.has(o))) note(t, 'namesake', `${question} [${options.join(' / ')}]`);
    const fits = options.filter(o => byName.get(o)?.position === m[1]);
    if (fits.length !== 1 || fits[0] !== right) note(t, 'wrong', `${question} [${options.join(' / ')}]`);
  } else if (type === 'worth') {
    t.worthByBand[bandOfDifficulty(q.difficulty)] += 1;
    if (options.some(o => NAMESAKES.has(o))) note(t, 'namesake', `${question} [${options.join(' / ')}]`);
    const rows = options.map(o => byName.get(o));
    if (rows.some(r => !r)) { note(t, 'wrong', `${question} [${options.join(' / ')}]`); return; }
    const sorted = [...rows].sort((a, b) => b.market_value_usd - a.market_value_usd);
    if (sorted[0].market_value_usd / sorted[1].market_value_usd < MIN_RATIO) note(t, 'ties', `${options.map(o => `${o} ${byName.get(o).market_value_usd / 1e6}M`).join(' / ')}`);
    else if (right !== sorted[0].player_name) note(t, 'wrong', `${question} [${options.join(' / ')}]`);
  } else if (type === 'ballon') {
    const winner = menWinner.get(Number(m[1]));
    if (right !== winner || options.filter(o => o === winner).length !== 1) note(t, 'wrong', question);
  }
}
function checkLadder(ladder, t) {
  t.ladders += 1;
  if (ladder.length !== 15) t.short += 1;
  for (const q of ladder) checkQuestion(q, t);
}
function report(label, t) {
  console.log(`   ${label}: ${t.ladders} ladders, ${t.questions} questions (${Object.entries(t.byType).map(([k, v]) => `${k} ${v}`).join(', ')}); worth the most by band easy ${t.worthByBand.easy}, medium ${t.worthByBand.medium}, hard ${t.worthByBand.hard}`);
  console.log(`   ${label}: short ladders ${t.short}, ties ${t.ties}, namesakes ${t.namesake}, present tense ${t.tense}, not a club offered ${t.notAClub}, a club's own reserve side or first team offered ${t.clubFamily}, wrong answer marked ${t.wrong}, unknown template ${t.unknown}, broken options ${t.dupOptions}`);
  for (const [k, v] of Object.entries(t.examples)) console.log(`      e.g. ${k}: ${v}`);
}
function mustBeClean(label, t) {
  for (const k of ['short', 'ties', 'namesake', 'tense', 'notAClub', 'clubFamily', 'wrong', 'unknown', 'dupOptions']) if (t[k] > 0) fail(`${label}: ${t[k]} ${k}`);
}
/* the bank's own daily stream (mulberry32 over dateSeed), so the old rules can be dealt on the same dates */
function mulberry32(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dateSeed = d => parseInt(d.replace(/-/g, ''), 10);
const addDays = (d, k) => new Date(Date.parse(`${d}T12:00:00Z`) + k * 86400000).toISOString().slice(0, 10);

/* ---------------- 2. the daily, from the first date dealt under the new rules ---------------- */
section(`2. ${LADDERS} daily ladders from ${T.ONE_ANSWER_FROM}, and the same dates under the old rules as the baseline`);
const daily = newTally(), before = newTally();
for (let k = 0; k < LADDERS; k++) {
  const d = addDays(T.ONE_ANSWER_FROM, k);
  checkLadder(T.generateDailyLadder(POOL, d, 15), daily);
  checkLadder(T.generateQuestionLadder(POOL, 15, mulberry32(dateSeed(d)), { oneAnswer: false }), before);
}
report('old rules', before);
report('new rules', daily);
mustBeClean('daily', daily);
/* the baseline proves the checker can see each fault: under the old rules every one of them happens */
for (const k of ['ties', 'namesake', 'tense', 'notAClub']) if (before[k] === 0) fail(`the old rules dealt no ${k} over ${LADDERS} dates, so this checker may be blind to it`);

/* ---------------- 3. unlimited and the swap lifeline's generator ---------------- */
section(`3. ${UNLIMITED} unlimited ladders, and ${UNLIMITED} single questions at every difficulty (what Swap Question deals)`);
const unlimited = newTally();
for (let k = 0; k < UNLIMITED; k++) checkLadder(T.generateRandomLadder(POOL, 15), unlimited);
const swaps = newTally();
for (let k = 0; k < UNLIMITED; k++) for (let d = 1; d <= 15; d++) { const q = T.generateQuestion(POOL, d, Math.random); if (q) checkQuestion(q, swaps); else swaps.short += 1; }
report('unlimited', unlimited);
report('swap', swaps);
mustBeClean('unlimited', unlimited);
mustBeClean('swap', swaps);

/* ---------------- 4. a daily already dealt is not re-dealt ---------------- */
section(`4. dates before ${T.ONE_ANSWER_FROM} deal exactly what the base generator dealt`);
/* measured 2026-10-22 from c75d04dad's src/lib/triviaQuestionBank.ts over this fixture (--print-legacy) */
const GOLDEN = { '2026-10-22': '36c088422c3d34a6', '2026-10-23': '94f0aa2002e3e1d9', '2026-10-24': '1f6ffa5fd6af80b6' };
for (const d of LEGACY_DATES) {
  const got = ladderHash(T.generateDailyLadder(POOL, d, 15));
  console.log(`   ${d}: ${got} (base ${GOLDEN[d]})`);
  if (got !== GOLDEN[d]) fail(`the daily for ${d} is not the ladder the base dealt: a release that day would re-deal it`);
}
if (T.rulesForDate(addDays(T.ONE_ANSWER_FROM, -1)).oneAnswer !== false) fail('the day before ONE_ANSWER_FROM is dealt under the new rules');
if (T.rulesForDate(T.ONE_ANSWER_FROM).oneAnswer !== true) fail('ONE_ANSWER_FROM itself is dealt under the old rules');
if (!LEGACY_DATES.every(d => d < T.ONE_ANSWER_FROM)) fail('a golden date is not before ONE_ANSWER_FROM any more: retire this section and the LEGACY rules together');

/* ---------------- 5. the bands are not starved ---------------- */
const CALLS = 500;
section(`5. every band still deals every market question: ${CALLS} builds per band and type, new rules against old`);
const BUILDERS = { club: T.buildClubQuestion, nationality: T.buildNationalityQuestion, position: T.buildPositionQuestion, worth: T.buildWorthMoreQuestion };
/* floors from measured headroom (2026-10-22, this fixture): see the header of this section's numbers in the log */
const FLOOR = { club: 1, nationality: 1, position: 1, worth: 0.99 };
for (const [band, d] of [['easy', 3], ['medium', 8], ['hard', 13]]) {
  const cells = [];
  for (const [type, builder] of Object.entries(BUILDERS)) {
    const rate = rules => { const rng = mulberry32(hash(`${band}:${type}`)); let ok = 0; for (let i = 0; i < CALLS; i++) if (builder(market, d, rng, rules)) ok += 1; return ok / CALLS; };
    const now = rate({ oneAnswer: true }), was = rate({ oneAnswer: false });
    cells.push(`${type} ${(now * 100).toFixed(1)}% (was ${(was * 100).toFixed(1)}%)`);
    if (now < FLOOR[type]) fail(`${band} band: ${type} builds ${(now * 100).toFixed(1)}% of the time, under the floor of ${FLOOR[type] * 100}%`);
  }
  const rows = BANDS[band];
  const askable = rows.filter(r => !NAMESAKES.has(r.player_name)).length;
  console.log(`   ${band}: ${cells.join(', ')}; askable names ${askable} of ${rows.length}`);
}

/* ---------------- 6. the namesake list is what the saved rows say ---------------- */
section('6. src/data/marketNamesakes.json is current with scripts/genMarketNamesakes.mjs');
const { deriveNamesakes } = await import(pathToFileURL(GEN_FILE).href);
const derived = deriveNamesakes(stock, alpha);
const livePath = path.join(ROOT, 'scripts/data/marketNamesakesLive.json');
const liveNames = fs.existsSync(livePath) ? JSON.parse(fs.readFileSync(livePath, 'utf8')).names : [];
const expected = new Set([...derived.keys(), ...liveNames]);
const missing = [...expected].filter(x => !NAMESAKES.has(x)), extra = [...NAMESAKES].filter(x => !expected.has(x));
console.log(`   derived ${derived.size} from the saved rows, ${liveNames.length} from a live read; shipped ${NAMESAKES.size}`);
if (missing.length) fail(`namesakes the saved rows show but the list leaves out: ${missing.slice(0, 8).join(', ')}`);
if (extra.length) fail(`names on the list nothing derives (typed by hand?): ${extra.slice(0, 8).join(', ')}`);
for (const name of ['Danilo', 'João Pedro', 'Luis Suárez', 'Nico González', 'Vitinha', 'Alisson', 'Otávio', 'Pablo']) if (!NAMESAKES.has(name)) fail(`${name}, a namesake the saved rows show plainly, is not on the list`);

/* 6b. The check above only proves the list equals what the generator derives, so a gap in the
   generator's rules is invisible to it: the generator of Round 1552's first build missed Vitinha,
   Alisson, Otavio, Pablo and four more because their two men are the same age or one year apart.
   This works the same evidence out here, by its own code: the saved pull holds one row per player
   per season (exact repeats aside), so a name with two rows in one season that disagree on position
   or age is two men, and every such name of the 2026 slice must be listed, both by the generator's
   output and in the shipped file. TRIVIA_CONTROL=rulec takes the generator's rule C away. */
const sliceNames = new Set(alpha.map(r => r.player_name));
const twoMen = new Map();
for (const [season, rows] of Object.entries(stock.pools)) {
  const shapes = new Map();
  for (const r of rows) {
    if (!sliceNames.has(r[0])) continue;
    if (!shapes.has(r[0])) shapes.set(r[0], new Set());
    shapes.get(r[0]).add(`${r[1]} ${r[2]}`);
  }
  for (const [name, s] of shapes) if (s.size > 1 && !twoMen.has(name)) twoMen.set(name, `${season}: ${[...s].join(' and ')}`);
}
const twoMenLeftOut = [...twoMen.keys()].filter(n => !expected.has(n) || !NAMESAKES.has(n));
console.log(`   6b. ${twoMen.size} names of the 2026 slice show two men in one season of the saved rows; left off the list ${twoMenLeftOut.length}`);
if (twoMen.size === 0) fail('the saved rows show no name with two men in one season, so section 6b could not see one left out');
for (const n of twoMenLeftOut) fail(`${n} shows two men in one season (${twoMen.get(n)}) but the namesake list leaves it out`);

/* ---------------- 7. one no tie rule ---------------- */
section('7. Face Off and the bank read one MIN_RATIO');
const faceOff = stripComments(read('src/lib/faceOff.ts'));
const bank = stripComments(read('src/lib/triviaQuestionBank.ts'));
if (!/import \{ MIN_RATIO, clearlyAhead \} from '@\/lib\/clearWinner';/.test(faceOff)) fail('src/lib/faceOff.ts does not import MIN_RATIO and clearlyAhead from src/lib/clearWinner.ts');
if (/const MIN_RATIO\s*=/.test(faceOff)) fail('src/lib/faceOff.ts declares a MIN_RATIO of its own');
/* one rule, not one constant and two predicates (Round 1552 review): Face Off asks clearlyAhead and
   compares nothing against MIN_RATIO itself */
if (!/!clearlyAhead\(hi, lo\)/.test(faceOff)) fail('src/lib/faceOff.ts does not ask clearlyAhead whether a pair has one right answer');
if (/[<>]=?\s*MIN_RATIO/.test(faceOff)) fail('src/lib/faceOff.ts compares against MIN_RATIO itself instead of asking clearlyAhead');
if (!/import \{ clearlyAhead \} from '@\/lib\/clearWinner';/.test(bank)) fail('the bank does not take its tie rule from src/lib/clearWinner.ts');
if (/1\.04/.test(bank)) fail('the bank carries a ratio literal of its own');
console.log(`   MIN_RATIO ${MIN_RATIO}`);
if (MIN_RATIO !== 1.04) fail(`MIN_RATIO moved to ${MIN_RATIO}: Face Off's bands (scripts/simFaceOff.mjs) were measured at 1.04`);

/* ---------------- 8. a reserve side and its first team are never offered together ---------------- */
/* In the saved slice 34 reserve or youth sides have their first team beside them (50 rows of 5,496),
   so sections 2 and 3 rarely meet one. A planted pool of ten such pairs (real club names, invented
   players, never shipped) makes every club question about one: a wrong club is its partner about one
   time in six under the old rules, and never under the new ones. */
section('8. a reserve side and its first team are never offered together (a planted pool)');
const PAIRS = [['Chelsea FC U21', 'Chelsea FC'], ['Real Madrid Castilla', 'Real Madrid'], ['Borussia Dortmund II', 'Borussia Dortmund'], ['Atalanta U23', 'Atalanta BC'], ['FC Bayern Munich II', 'Bayern Munich'], ['Sporting CP B', 'Sporting CP'], ['Club Necaxa U21', 'Club Necaxa'], ['Real Sociedad B', 'Real Sociedad'], ['Aston Villa U21', 'Aston Villa'], ['VfB Stuttgart II', 'VfB Stuttgart']];
const planted = [];
for (const pair of PAIRS) for (const club of pair) for (let k = 0; k < 2; k++) planted.push({ player_name: `Planted Player ${planted.length + 1}`, position: 'Central Midfield', nationality: 'Fixtureland', club, market_value_usd: 200e6 - planted.length * 1e6 });
for (const [a, b] of PAIRS) if (!sameClub(a, b)) fail(`the checker does not read ${a} and ${b} as one club, so section 8 is blind`);
const plantedTally = { old: 0, now: 0, built: 0 };
for (const [rules, key] of [[{ oneAnswer: false }, 'old'], [{ oneAnswer: true }, 'now']]) {
  const rng = mulberry32(hash(`family:${key}`));
  for (let i = 0; i < CALLS; i++) {
    const q = T.buildClubQuestion(planted, 3, rng, rules);
    if (!q) continue;
    if (key === 'now') plantedTally.built += 1;
    if (q.options.some(o => sameClub(o, q.options[q.correctIndex]))) plantedTally[key] += 1;
  }
}
console.log(`   ${CALLS} club questions each: old rules offered the partner club ${plantedTally.old} times, new rules ${plantedTally.now} (built ${plantedTally.built} of ${CALLS})`);
if (plantedTally.old === 0) fail('the old rules never offered a partner club in the planted pool, so section 8 cannot see one');
if (plantedTally.now > 0) fail(`the new rules offered a reserve side beside its first team ${plantedTally.now} times`);
if (plantedTally.built < CALLS) fail(`the new rules built ${plantedTally.built} of ${CALLS} club questions in the planted pool`);

console.log(`\nsimTriviaBank: ${failures === 0 ? 'all checks passed' : `${failures} failure(s)`}${CONTROL ? ` (NEGATIVE CONTROL ${CONTROL} ON)` : ''}`);
process.exit(failures === 0 ? 0 : 1);
