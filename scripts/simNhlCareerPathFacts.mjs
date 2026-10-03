/**
 * simNhlCareerPathFacts: Round 923. NHL Career Path (/hockey-career) is pinned
 * to a verification record, and nothing ships that the record does not hold.
 *
 * WHY THIS EXISTS. The pool had 38 rows and 32 players: Orr, Messier, Lidstrom,
 * Brodeur, Roy and Jagr were in it twice, so the daily dealt the same answer
 * twice a cycle (measured: 54 to 59 times a year a player came back inside 14
 * days, twice on consecutive days), and the two Jagr rows gave different team
 * orders. Award lines were false: Jagr in the Hall of Fame (he is not),
 * McDavid with four Harts, three Ted Lindsays and a 2025 Conn Smythe (three,
 * five, 2024), Draisaitl with a Conn Smythe he never won, Orr drafted (he never
 * was), Coffey with the most goals by a defenseman (Bourque has more), plus
 * All-Star counts neither source carries. Nothing checked any of it. Round 923
 * read every line on two hosts, the official NHL source (api-web.nhle.com, the
 * feed behind nhl.com/player) and hockey-reference.com, with hhof.com for the
 * Hall of Fame year, wrote them to scripts/data/nhlCareerPathVerified2026-10.json,
 * removed the repeats, held out two thin rows and grew the pool to 60 players.
 *
 * WHAT IT CHECKS. The data file is bundled with esbuild, so this reads the
 * values the game reads, not a regex over the text.
 *    1. The record: every player names two sources on two different hosts
 *       (one of them the NHL's own), none a wiki; every fact carries both
 *       values; a Hall of Fame line carries hhof.com as a third; every shown
 *       line has a fact and every fact is a shown line.
 *    2. Every line follows from its two source values by the record's rules:
 *       exact totals equal both values, a floor ('650+ G') sits at or below the
 *       lower value and within one step of it, GAA and save percentage match,
 *       the draft line's round, pick and year are in both values, a trophy
 *       count equals the seasons on the NHL value and the count on the
 *       hockey-reference value, a single year equals both, the Hall of Fame
 *       year equals the hockey-reference and hhof.com years, and the team path
 *       equals the NHL team list and the hockey-reference team codes. The
 *       flag the Country clue shows is the flag of that country, built from
 *       its ISO code, so a wrong flag cannot pass by being wrong in both files.
 *    3. The shipped file (src/data/hockeyCareerPlayers.ts) equals the record
 *       word for word, row by row in the record's order, both ways.
 *    4. No repeats: player names and puzzle ids are unique, names compared
 *       without case or accents (hockey-reference writes Lidström where the
 *       pool writes Lidstrom, so a raw compare would let one man in twice).
 *       The game's own guess rule (src/lib/hockeyCareerGuess.ts, bundled)
 *       takes every player's full name and his surname as written (St. Louis
 *       too), and no guess it takes belongs to two players.
 *    5. No line the record calls false or unsourced ships on that player's own
 *       row (a line false for one man can be true for another; section 3 pins
 *       every other row to the record), and no held out player is in the
 *       file, names again compared without case or accents.
 *    6. The daily walk (dailyIndex in src/lib/dateUtils.ts, read live): over
 *       three years every 60 day cycle deals every player exactly once, where
 *       the old pool repeated a player inside every 38 day cycle (cycles
 *       reshuffle independently, so a player can still come back quickly
 *       across a cycle boundary; that is measured below, not denied); the
 *       switch from 38 rows to 60 on any day from 2026-10-04 to 2026-10-20
 *       deals only new players for the first 14 days; and a release on any day
 *       from 2026-10-03 to the record's releaseBy leaves at least 14 days
 *       between a player's last old deal and his first new one, while a
 *       release the day after releaseBy does not, so the date in the record is
 *       the real deadline.
 *
 * MEASURED (2026-10-03, deterministic, so one run is every run). Repeats inside
 * 14 days per calendar year, 2026, 2027, 2028: old pool 54, 59, 56 (shortest
 * gap 1 day), new pool 6, 11, 7 (all at a cycle boundary, shortest gap 2, 2, 6
 * days); whole cycles from 2026 to 2028 that repeat a player: old 28 of 28,
 * new 0 of 18. Release window 2026-10-04 to 2026-10-20: 14 of the first 14 deals are
 * new players on every day of it, and the shortest old to new gap is 26 days
 * (Hasek; 40 days before 2026-10-13). After it the gap falls to 15 days (Guy
 * Lafleur, a release on 2026-10-21), and it stays 15 through 2026-11-02, the
 * last day of the cycle; a release on 2026-11-03 deals Malkin 9 days after the
 * old pool did. So the record's releaseBy
 * is 2026-11-02 and the band of 14 days has 1 day of headroom at its worst,
 * which is enough because the walk is deterministic (no seed moves it).
 *
 * NEGATIVE CONTROLS (NHL_CP_CONTROL). Each edits only an in memory copy (line
 * endings normalised first), refuses to run unless its anchor occurs exactly
 * once and the edit changed something, and must turn exactly its predicted
 * sections red. Under a control the harness exits 1 when exactly those are red
 * (the break was caught) and 2 when not (the control proves nothing).
 *   onesource  Gretzky's goals fact loses its hockey-reference value     1, 2
 *   floor      Crosby's goal floor is raised above both sources            2, 3
 *   falseline  McDavid's Conn Smythe goes back to the false 2025           3, 5
 *   dup        Kaprizov's row becomes a second Bobby Orr                   3, 4, 6
 *   order      Messier swaps places with a new player dealt 2026-10-05     6
 *   accentdup  Kaprizov becomes 'Nicklas Lidström' in file AND record      4, 6
 *   heldoutaccent  Kaprizov becomes 'Félix Potvin' in file AND record      5
 *   flag       Selanne's flag becomes Sweden's in file AND record          2
 *   stlouis    the guess rule loses the after-the-first-name form          4
 *   releaseby  the record's release-by date moves a day late, 2026-11-03    6
 *
 * Nothing here touches the network.
 *
 * Run: node scripts/simNhlCareerPathFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts/data/nhlCareerPathVerified2026-10.json');
const DATA = 'src/data/hockeyCareerPlayers.ts';
const DATES = 'src/lib/dateUtils.ts';
const GUESS = 'src/lib/hockeyCareerGuess.ts';
const CONTROL = process.env.NHL_CP_CONTROL || '';
const EXPECT = {
  onesource: [1, 2], floor: [2, 3], falseline: [3, 5], dup: [3, 4, 6], order: [6],
  accentdup: [4, 6], heldoutaccent: [5], flag: [2], stlouis: [4], releaseby: [6],
};
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`NHL_CP_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(2);
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = (msg) => { red.add(section); failures += 1; if (failures <= 40) console.error('  FAIL: ' + msg); };
const head = (n, title) => { section = n; console.log(`\n--- ${n}. ${title} ---`); };
const cannot = (msg) => { console.error(`CONTROL ${CONTROL} cannot run: ${msg}`); process.exit(2); };
const rewrite = (text, from, to, what) => {
  const hits = text.split(from).length - 1;
  if (hits !== 1) cannot(`${what} occurs ${hits} times, not once. The control is stale and a run would prove nothing.`);
  const out = text.replace(from, to);
  if (out === text) cannot(`rewriting ${what} changed nothing.`);
  return out;
};

// ---------------------------------------------------------------------------
// Loading. The data file and the date helpers are bundled on their own, with an
// optional in memory copy of the data file, into a private temp directory.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simNhlCareerPathFacts-'));
const norm = (p) => path.resolve(p).toLowerCase();
let bundleNo = 0;
async function loadModule(rel, override) {
  const entry = path.join(ROOT, rel);
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'nhl-cp-memory',
      setup(b) {
        b.onLoad({ filter: /\.ts$/ }, (a) => (override !== undefined && norm(a.path) === norm(entry)
          ? { contents: override, loader: 'ts', resolveDir: path.dirname(a.path) } : undefined));
      },
    }],
  });
  return import(pathToFileURL(outfile).href);
}
const src = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
// A flag emoji is its ISO code in regional indicator letters, so it is built, never typed.
const flagOf = (iso) => String.fromCodePoint(...iso.toUpperCase().split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));

const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
let dataText = src(DATA);
const recPlayer = (name) => {
  const hits = record.players.filter((p) => p.name === name);
  if (hits.length !== 1) cannot(`record player ${name} occurs ${hits.length} times, not once.`);
  return hits[0];
};
const recFact = (p, line) => {
  const hits = p.facts.filter((f) => f.line === line);
  if (hits.length !== 1) cannot(`fact '${line}' of ${p.name} occurs ${hits.length} times, not once.`);
  return hits[0];
};

if (CONTROL === 'onesource') {
  const f = recFact(recPlayer('Wayne Gretzky'), '894 G');
  if (!f.second) cannot('the fact has no second value to remove.');
  f.second = '';
}
if (CONTROL === 'floor') {
  const p = recPlayer('Sidney Crosby');
  const f = recFact(p, '650+ G');
  const i = p.stats.indexOf('650+ G');
  if (i < 0) cannot('the floor is not in the stats.');
  p.stats[i] = '660+ G';
  f.line = '660+ G';
}
if (CONTROL === 'falseline') dataText = rewrite(dataText, "'Conn Smythe Trophy (2024)'", "'Conn Smythe Trophy (2025)'", "McDavid's Conn Smythe line");
if (CONTROL === 'dup') dataText = rewrite(dataText, "name: 'Kirill Kaprizov'", "name: 'Bobby Orr'", "Kaprizov's name");
if (CONTROL === 'order') {
  const blocks = dataText.split('\n  {\n');
  const at = (name) => {
    const hits = blocks.map((b, i) => (b.includes(`name: '${name}'`) ? i : -1)).filter((i) => i >= 0);
    if (hits.length !== 1) cannot(`the block for ${name} occurs ${hits.length} times, not once.`);
    return hits[0];
  };
  const a = at('Mark Messier'), b = at('Ray Bourque');
  const tail = (s) => (s.endsWith('\n];\n') ? '\n];\n' : '');
  const ta = tail(blocks[a]), tb = tail(blocks[b]);
  const body = (s) => s.slice(0, s.length - tail(s).length);
  [blocks[a], blocks[b]] = [body(blocks[b]) + ta, body(blocks[a]) + tb];
  const out = blocks.join('\n  {\n');
  if (out === dataText) cannot('the swap changed nothing.');
  dataText = out;
  const ra = record.players.indexOf(recPlayer('Mark Messier')), rb = record.players.indexOf(recPlayer('Ray Bourque'));
  [record.players[ra], record.players[rb]] = [record.players[rb], record.players[ra]];
}
// The next three rename or reflag a row in BOTH the file and the record, so
// section 3 (file equals record) stays green and only the check aimed at the
// break can catch it.
const renameBoth = (from, to) => {
  dataText = rewrite(dataText, `name: '${from}'`, `name: '${to}'`, `${from}'s name`);
  recPlayer(from).name = to;
};
if (CONTROL === 'accentdup') renameBoth('Kirill Kaprizov', 'Nicklas Lidström');
if (CONTROL === 'heldoutaccent') renameBoth('Kirill Kaprizov', 'Félix Potvin');
if (CONTROL === 'flag') {
  const p = recPlayer('Teemu Selanne');
  if (p.countryFlag !== flagOf('fi')) cannot('Selanne does not carry the Finnish flag in the record.');
  dataText = rewrite(dataText, `countryFlag: '${flagOf('fi')}'`, `countryFlag: '${flagOf('se')}'`, "Selanne's flag");
  p.countryFlag = flagOf('se');
}
if (CONTROL === 'releaseby') {
  if (record.releaseBy !== '2026-11-02') cannot(`the record's releaseBy is ${record.releaseBy}, not 2026-11-02.`);
  record.releaseBy = '2026-11-03';
}
let guessText = src(GUESS);
if (CONTROL === 'stlouis') guessText = rewrite(guessText, ", words.slice(1).join(' ')]", ']', 'the after-the-first-name guess');

const { hockeyCareerPuzzles: pool } = await loadModule(DATA, dataText);
const { dailyIndex } = await loadModule(DATES);
const { acceptedHockeyGuesses, isHockeyGuessRight } = await loadModule(GUESS, guessText);

const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// Two spellings of one man are one player: hockey-reference and the NHL feed's
// local-language fields write Lidström, Selänne and Hašek, the pool writes them
// plain. Every name comparison below goes through this.
const key = (n) => fold(String(n)).trim().toLowerCase().replace(/\s+/g, ' ');
const shownLines = (p) => [p.position, p.country, p.draftInfo, p.teams.join(' > '), ...p.stats, ...p.awards];
const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------------------------
head(1, 'the record: two hosts per player, both values per fact, a fact per line');
const TODAY = new Date().toISOString().slice(0, 10);
if (!(record.read <= TODAY)) fail(`read date ${record.read} has not happened yet`);
const hostOf = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
let factCount = 0;
for (const p of record.players) {
  const o = p.sources?.official || {}, s = p.sources?.second || {};
  if (o.host !== 'api-web.nhle.com' || hostOf(o.url) !== o.host || hostOf(o.page) !== 'www.nhl.com') fail(`${p.name}: official source is not the NHL's (${o.url})`);
  if (s.host !== 'hockey-reference.com' || !hostOf(s.url).endsWith(s.host)) fail(`${p.name}: second source is not hockey-reference (${s.url})`);
  if (o.host === s.host) fail(`${p.name}: both sources on one host`);
  if ([o.url, o.page, s.url].some((u) => /wiki/i.test(u || ''))) fail(`${p.name}: a wiki is cited`);
  for (const f of p.facts) {
    factCount += 1;
    if (!f.official || !f.second) fail(`${p.name}: '${f.line}' lacks a value on ${!f.official ? 'the NHL source' : 'hockey-reference'}`);
    if (f.line.startsWith('Hall of Fame') && !(f.third && hostOf(f.third.url) === 'www.hhof.com' && f.third.value)) fail(`${p.name}: '${f.line}' lacks its hhof.com value`);
  }
  if (!sameList(p.facts.map((f) => f.line), shownLines(p))) fail(`${p.name}: the facts and the shown lines differ`);
}
console.log(`  ${record.players.length} players, ${factCount} facts, read ${record.read}`);

// ---------------------------------------------------------------------------
head(2, 'every line follows from its two source values');
const COUNTRY = { CAN: ['Canada', ['ca']], USA: ['United States', ['us']], SWE: ['Sweden', ['se']], FIN: ['Finland', ['fi']],
  RUS: ['Russia', ['ru', 'su']], CZE: ['Czech Republic', ['cz', 'cs']], SVK: ['Slovakia', ['sk', 'cs']], DEU: ['Germany', ['de']] };
const HR_TEAM = {
  EDM: 'Edmonton Oilers', LAK: 'Los Angeles Kings', STL: 'St. Louis Blues', NYR: 'New York Rangers', PIT: 'Pittsburgh Penguins',
  WSH: 'Washington Capitals', DET: 'Detroit Red Wings', MTL: 'Montreal Canadiens', COL: 'Colorado Avalanche', PHI: 'Philadelphia Flyers',
  DAL: 'Dallas Stars', BOS: 'Boston Bruins', NJD: 'New Jersey Devils', FLA: 'Florida Panthers', CGY: 'Calgary Flames',
  CBH: 'Chicago Blackhawks', CHI: 'Chicago Blackhawks', TOR: 'Toronto Maple Leafs', VAN: 'Vancouver Canucks', TBL: 'Tampa Bay Lightning',
  HAR: 'Hartford Whalers', QUE: 'Quebec Nordiques', WIN: 'Winnipeg Jets', MDA: 'Anaheim Ducks', ANA: 'Anaheim Ducks',
  SJS: 'San Jose Sharks', BUF: 'Buffalo Sabres', OTT: 'Ottawa Senators', ATL: 'Atlanta Thrashers', CAR: 'Carolina Hurricanes',
  NYI: 'New York Islanders', NSH: 'Nashville Predators', PHX: 'Phoenix Coyotes', WPG: 'Winnipeg Jets', MNS: 'Minnesota North Stars',
  MIN: 'Minnesota Wild', VEG: 'Vegas Golden Knights',
};
// shown trophy name -> [NHL trophy name, hockey-reference recognition label]
const TROPHY = {
  'Stanley Cup Champion': ['Stanley Cup', 'Cup Winner'], 'Hart Trophy': ['Hart Memorial Trophy', 'Hart Memorial Trophy winner'],
  'Conn Smythe Trophy': ['Conn Smythe Trophy', 'Conn Smythe Trophy winner'], 'Vezina Trophy': ['Vezina Trophy', 'Vezina Trophy winner'],
  'Norris Trophy': ['James Norris Memorial Trophy', 'James Norris Memorial Trophy winner'], 'Art Ross Trophy': ['Art Ross Trophy', 'Art Ross Trophy winner'],
  'Rocket Richard Trophy': ['Maurice “Rocket” Richard Trophy', 'Maurice Richard Trophy winner'], 'Ted Lindsay Award': ['Ted Lindsay Award', 'Ted Lindsay Award winner'],
  'Calder Trophy': ['Calder Memorial Trophy', 'Calder Memorial Trophy winner'], 'Selke Trophy': ['Frank J. Selke Trophy', 'Frank J. Selke Trophy winner'],
  'Jennings Trophy': ['William M. Jennings Trophy', 'William M. Jennings Trophy winner'], 'Lady Byng Trophy': ['Lady Byng Memorial Trophy', 'Lady Byng Memorial Trophy winner'],
  'King Clancy Trophy': ['King Clancy Memorial Trophy', 'King Clancy Memorial Trophy winner'],
  'Mark Messier Leadership Award': ['Mark Messier NHL Leadership Award', 'Mark Messier Leadership Award winner'],
  'Masterton Trophy': ['Bill Masterton Memorial Trophy', 'Bill Masterton Memorial Trophy winner'],
};
const num = (v) => Number(String(v).split(' ').pop());
function checkFact(p, f) {
  const L = f.line, O = String(f.official), S = String(f.second);
  const no = (why) => fail(`${p.name}: '${L}' ${why} (NHL '${O}', HR '${S}')`);
  if (f.field === 'position') {
    const a = { C: 'Forward', L: 'Forward', R: 'Forward', D: 'Defense', G: 'Goalie' }[O];
    const b = S === 'G' ? 'Goalie' : S === 'D' ? 'Defense' : /^(C|LW|RW)(\/(C|LW|RW))?$/.test(S) ? 'Forward' : '?';
    if (L !== a || L !== b) no('is not the position on both');
  } else if (f.field === 'country') {
    const c = COUNTRY[O.slice(0, 3)];
    const code = (S.match(/\[([a-z]{2})\]$/) || [])[1];
    const city = fold(O.split('born ')[1] || '').toLowerCase();
    if (!c || c[0] !== L || !c[1].includes(code)) no('is not the birth country on both');
    if (!city || !fold(S).toLowerCase().replace(/^born (l')?/, '').startsWith(city.replace(/^l'/, ''))) no('rests on two different birthplaces');
  } else if (f.field === 'draftInfo') {
    const u = L.match(/^Undrafted \(NHL debut (\d{4})-(\d{2})\)$/);
    if (u) {
      const sid = `${u[1]}${Number(u[1]) + 1}`;
      if (!O.includes('no draftDetails') || !O.includes(sid) || !S.includes('no draft line') || !S.includes(`${u[1]}-${u[2]}`)) no('is not undrafted with that debut on both');
    } else {
      const m = L.match(/^(\d+)(?:st|nd|rd|th) Round, (\d+)(?:st|nd|rd|th) Overall \((\d{4})\)$/);
      const o = O.match(/^(\d{4}) [A-Z]{3} round (\d+) overall (\d+)$/);
      const s = S.match(/(\d+)(?:st|nd|rd|th) round \((\d+)(?:st|nd|rd|th) overall\), (\d{4}) NHL/);
      if (!m || !o || !s || m[1] !== o[2] || m[2] !== o[3] || m[3] !== o[1] || m[1] !== s[1] || m[2] !== s[2] || m[3] !== s[3]) no('is not the draft on both');
    }
  } else if (f.field === 'teams') {
    const a = fold(O).replace(/ \(\d{4}\)/g, '');
    const b = [];
    for (const code of S.split(' > ')) { const t = HR_TEAM[code]; if (!t) no(`has an unknown hockey-reference code ${code}`); else if (!b.includes(t)) b.push(t); }
    if (L !== a || L !== b.join(' > ')) no('is not the team path on both');
  } else if (f.field === 'stats') checkStat(p, f, no);
  else if (f.field === 'awards') checkAward(p, f, no);
  else no(`has an unknown field ${f.field}`);
}
function checkStat(p, f, no) {
  const L = f.line, O = String(f.official), S = String(f.second);
  const unitO = O.split(' ')[0], unitS = S.split(' ')[0];
  const a = num(O), b = num(S);
  let m;
  if ((m = L.match(/^(\d\.\d\d) GAA$/))) {
    if (unitO !== 'GAA' || unitS !== 'GAA' || a.toFixed(2) !== m[1] || S.split(' ')[1] !== m[1]) no('is not the GAA on both');
  } else if ((m = L.match(/^(\.\d{3}) SV%$/))) {
    if (unitO !== 'SV%' || unitS !== 'SV%' || a.toFixed(3).slice(1) !== m[1] || S.split(' ')[1] !== m[1]) no('is not the save percentage on both');
  } else if ((m = L.match(/^([\d,]+)(\+?) (G|A|Pts|W|SO|GP)$/))) {
    const v = Number(m[1].replace(/,/g, ''));
    if (unitO !== m[3] || unitS !== m[3]) no('names a different stat than its sources');
    if (Number(v).toLocaleString('en-US') !== m[1]) no('is not written with thousands commas');
    if (m[2]) {
      const step = m[3] === 'SO' ? 5 : 10;
      const lo = Math.min(a, b);
      if (!p.active) no('is a floor on a player who is not active');
      if (!(v <= lo && lo - v < step && v % step === 0)) no(`is not the ${step}s floor of the lower source`);
    } else {
      if (p.active) no('is an exact total on an active player, it will expire');
      if (v !== a || v !== b) no('is not the total on both');
    }
  } else no('is not a stat line this game writes');
}
function checkAward(p, f, no) {
  const L = f.line, O = String(f.official), S = String(f.second);
  const hof = L.match(/^Hall of Fame \((\d{4})\)$/);
  if (hof) {
    if (O !== 'inHHOF: 1' || S !== `Inducted as Player ${hof[1]}` || !String(f.third?.value).startsWith(`${hof[1]}: `)) no('is not the induction year on the NHL flag, hockey-reference and hhof.com');
    return;
  }
  const m = L.match(/^(?:(\d+)× )?(.+?)(?: \((\d{4})\))?$/);
  const n = m && m[1] ? Number(m[1]) : 1, shown = m && m[2], year = m && m[3];
  const t = TROPHY[shown];
  if (!t) return no('names no trophy this game knows');
  if (!O.startsWith(t[0] + ': ')) return no('rests on another trophy on the NHL source');
  const seasons = O.slice(t[0].length + 2).split(', ');
  if (seasons.length !== n) no(`counts ${n} where the NHL source has ${seasons.length}`);
  if (n === 1 && shown !== 'Stanley Cup Champion' && !year) no('is a single win without its year');
  if (year && !(n === 1 && seasons[0] === year)) no('names a year the NHL source does not');
  const c = S.match(/^(\d+)x (.+)$/), y = S.match(/^(\d{4})-\d{2} (.+)$/);
  const label = c ? c[2] : y ? y[2] : '';
  if (label !== t[1]) no('rests on another trophy on hockey-reference');
  if (c && Number(c[1]) !== n) no(`counts ${n} where hockey-reference has ${c[1]}`);
  if (y && (n !== 1 || (year && String(Number(y[1]) + 1) !== year))) no('is not the season hockey-reference gives');
}
let lineCount = 0;
for (const p of record.players) for (const f of p.facts) { lineCount += 1; checkFact(p, f); }
console.log(`  ${lineCount} lines checked against their two values`);
// The Country clue shows countryFlag beside the country, so the flag must be the
// one for that country (built from its ISO code above, never typed), or a wrong
// flag would pass as long as the file and the record agreed.
const FLAG =Object.fromEntries(Object.values(COUNTRY).map(([name, codes]) => [name, flagOf(codes[0])]));
let flagCount = 0;
for (const p of record.players) {
  if (!FLAG[p.country] || p.countryFlag !== FLAG[p.country]) fail(`${p.name}: flag ${p.countryFlag} is not the flag of ${p.country}`);
  else flagCount += 1;
}
console.log(`  ${flagCount} flags match their country`);

// ---------------------------------------------------------------------------
head(3, `the shipped file equals the record, row by row (${DATA})`);
const FIELDS = ['position', 'country', 'countryFlag', 'draftInfo', 'teams', 'stats', 'awards'];
if (pool.length !== record.players.length) fail(`the file has ${pool.length} rows, the record ${record.players.length}`);
for (let i = 0; i < Math.max(pool.length, record.players.length); i++) {
  const row = pool[i], r = record.players[i];
  if (!row || !r) { fail(`row ${i} is missing on one side`); continue; }
  if (row.id !== r.id || row.player.name !== r.name) { fail(`row ${i}: file ${row.id} ${row.player.name}, record ${r.id} ${r.name}`); continue; }
  for (const k of FIELDS) if (JSON.stringify(row.player[k]) !== JSON.stringify(r[k])) fail(`${r.name}: ${k} is ${JSON.stringify(row.player[k])} in the file, ${JSON.stringify(r[k])} in the record`);
}
console.log(`  ${pool.length} rows in the file, ${record.players.length} in the record`);

// ---------------------------------------------------------------------------
head(4, 'no repeats: names, ids and surnames');
const dupes = (list) => [...new Set(list.filter((x, i) => list.indexOf(x) !== i))];
const names = pool.map((r) => r.player.name);
const keys = names.map(key);
for (const d of dupes(keys)) fail(`player ${d} is in the pool more than once (compared without case or accents)`);
for (const d of dupes(pool.map((r) => r.id))) fail(`puzzle id ${d} is used more than once`);
// The guess rule is the game's own (src/lib/hockeyCareerGuess.ts, bundled
// above). Each player must be guessable by his full name and by his surname as
// written, and every guess the game accepts must belong to one player only.
const owner = new Map();
for (const n of names) {
  const surname = n.split(' ').slice(1).join(' ');
  for (const g of [n, n.toUpperCase(), surname, surname.replace(/\./g, '')]) if (!isHockeyGuessRight(g, n)) fail(`${n}: the game refuses the guess '${g}'`);
  for (const form of acceptedHockeyGuesses(n)) {
    const prev = owner.get(key(form));
    if (prev && prev !== n) fail(`the guess '${form}' is accepted for both ${prev} and ${n}`);
    owner.set(key(form), n);
  }
}
console.log(`  ${new Set(keys).size} different players in ${pool.length} rows, ${owner.size} accepted guesses, each for one player only`);

// ---------------------------------------------------------------------------
head(5, 'no line the record calls false or unsourced ships, no held out player');
const banned = record.corrections.filter((c) => c.kind === 'false' || c.kind === 'unsourced');
if (banned.length < 18) fail(`the record lists only ${banned.length} false or unsourced lines; Round 923 recorded 18 (11 false, 7 unsourced)`);
for (const c of banned) {
  for (const row of pool.filter((r) => key(r.player.name) === key(c.name))) {
    if (shownLines(row.player).includes(c.old)) fail(`${c.name} shows '${c.old}' again (${c.kind}: ${c.why})`);
  }
}
for (const h of record.heldOut) if (keys.includes(key(h.name))) fail(`${h.name} is back in the pool: ${h.why}`);
console.log(`  ${banned.length} false or unsourced lines, ${record.heldOut.length} held out players: ${red.has(5) ? 'SOME SHIPPED' : 'none shipped'}`);

// ---------------------------------------------------------------------------
head(6, 'the daily walk: every cycle deals every player once, and the switch to 60 rows');
const dateOf = (day) => new Date(day * 864e5).toISOString().slice(0, 10);
const dayOf = (d) => Math.floor(Date.parse(d + 'T00:00:00Z') / 864e5);
const oldNames = record.oldPool.map((p) => key(p.name));
const dealt = (list, day) => list[dailyIndex(dateOf(day), list.length)];
function cyclesWithRepeat(list, fromDay, toDay) {
  const n = list.length;
  let cycles = 0, bad = 0;
  for (let c = Math.ceil(fromDay / n); (c + 1) * n <= toDay; c++) {
    cycles += 1;
    const seen = new Set();
    for (let d = c * n; d < (c + 1) * n; d++) seen.add(dealt(list, d));
    if (seen.size !== n) bad += 1;
  }
  return { cycles, bad };
}
const from = dayOf('2026-01-01'), to = dayOf('2029-01-01');
const nowC = cyclesWithRepeat(keys, from, to), oldC = cyclesWithRepeat(oldNames, from, to);
console.log(`  2026 to 2028: new pool repeats a player in ${nowC.bad} of ${nowC.cycles} cycles, the old pool in ${oldC.bad} of ${oldC.cycles}`);
if (nowC.cycles < 15 || nowC.bad !== 0) fail(`the new pool repeats a player inside ${nowC.bad} of ${nowC.cycles} cycles`);
if (oldC.bad !== oldC.cycles) fail(`baseline moved: the old pool repeated in only ${oldC.bad} of ${oldC.cycles} cycles, so this check is not measuring what it says`);
const repeats14 = (list, y) => {
  const seq = []; for (let d = dayOf(`${y}-01-01`); d < dayOf(`${y + 1}-01-01`); d++) seq.push(dealt(list, d));
  let r = 0; seq.forEach((x, i) => { const j = seq.indexOf(x, i + 1); if (j > 0 && j - i < 14) r += 1; });
  return r;
};
const years = [2026, 2027, 2028];
const newR = years.map((y) => repeats14(keys, y)), oldR = years.map((y) => repeats14(oldNames, y));
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
console.log(`  repeats inside 14 days per year ${years.join(', ')}: new ${newR.join(', ')}, old ${oldR.join(', ')}`);
if (!(mean(newR) <= 15)) fail(`new pool mean ${mean(newR).toFixed(1)} repeats inside 14 days a year, band 15 (measured 8.0)`);
if (!(mean(oldR) - mean(newR) >= 30)) fail(`the new pool is not clearly better than the old (old ${mean(oldR).toFixed(1)}, new ${mean(newR).toFixed(1)}, measured gap 48.3, band 30)`);
const status = new Map(record.players.map((p) => [key(p.name), p.status]));
for (let R = dayOf('2026-10-04'); R <= dayOf('2026-10-20'); R++) {
  const first14 = Array.from({ length: 14 }, (_, k) => dealt(keys, R + k));
  const kept = first14.filter((x) => status.get(x) !== 'new');
  if (kept.length) fail(`released ${dateOf(R)}: the first 14 days deal ${kept.join(', ')}, who the old pool already dealt`);
}
// Shortest gap, for a release on day R, between a player's last deal under the
// old pool and his first under the new one.
const gapFor = (R) => {
  let g = Infinity, w = '';
  for (let a = 1; a <= 60; a++) {
    const who = dealt(oldNames, R - a);
    for (let b = 0; b < 60; b++) if (dealt(keys, R + b) === who) { if (a + b < g) { g = a + b; w = who; } break; }
  }
  return { g, w };
};
// The guarantee only holds up to the cycle boundary, so the record carries the
// last release day it holds for, and this proves the date both ways: every day
// up to it keeps 14 days, and the day after does not.
const releaseBy = String(record.releaseBy || '');
if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseBy)) fail('the record carries no releaseBy date');
let minGap = Infinity, minWho = '', minDay = '';
for (let R = dayOf('2026-10-03'); R <= dayOf(releaseBy); R++) {
  const { g, w } = gapFor(R);
  if (g < minGap) { minGap = g; minWho = w; minDay = dateOf(R); }
}
const late = gapFor(dayOf(releaseBy) + 1);
console.log(`  release 2026-10-03 to ${releaseBy}: shortest old to new gap ${minGap} days (${minWho}, released ${minDay}); measured 15, band 14`);
console.log(`  RELEASE BY ${releaseBy}: a release on ${dateOf(dayOf(releaseBy) + 1)} deals ${late.w} again ${late.g} days after the old pool did`);
if (!(minGap >= 14)) fail(`a player comes back ${minGap} days after his last old deal (${minWho}, released ${minDay}); band 14`);
if (!(late.g < 14)) fail(`releaseBy ${releaseBy} is not the last safe day: ${dateOf(dayOf(releaseBy) + 1)} still keeps ${late.g} days`);

// ---------------------------------------------------------------------------
fs.rmSync(TMP, { recursive: true, force: true });
const redList = [...red].sort((a, b) => a - b);
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const caught = JSON.stringify(redList) === JSON.stringify(want);
  console.log(`\nsimNhlCareerPathFacts: CONTROL ${CONTROL} turned sections [${redList.join(', ')}] red, predicted [${want.join(', ')}]: ${caught ? 'caught' : 'NOT CAUGHT, the control proves nothing'}`);
  process.exit(caught ? 1 : 2);
}
console.log(`\nsimNhlCareerPathFacts: ${failures === 0 ? 'all six sections green' : `${failures} failures in sections [${redList.join(', ')}]`}`);
process.exit(failures === 0 ? 0 : 1);
