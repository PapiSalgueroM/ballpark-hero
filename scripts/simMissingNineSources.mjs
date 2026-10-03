/**
 * Round 948 harness: every Missing Nine sheet stands on two hosts, and the game
 * file says exactly what the source record says.
 *
 * Missing Nine dealt from ten World Series lineups, and six of them rested on
 * one host alone (the baseball-almanac box) while two more leaned on Wikipedia,
 * which this project does not count as a source. Round 948 read all ten again
 * from a second host (the baseball-reference box, whose Starting Lineups table
 * sits in the raw page) and added twenty more World Series nines read the same
 * way, so the pool is 30. Every check is written down, sheet by sheet and fact
 * by fact, in scripts/data/missingNineSources.json. This harness is the fence
 * that keeps the two files honest with each other:
 *
 *   1) every sheet's source string names at least two known hosts and no wiki
 *   2) every sheet has a record row and every record row a sheet; each row's
 *      sources are on two or more different hosts, none a wiki, each a real
 *      https address on the host it claims, each with a read date
 *   3) the record's nine starters are the sheet's nine, slot for slot
 *   4) every blank matches the record: name, slot, nationality and fact text
 *   5) every blank's surname hint is a real surname (not Jr., Sr., II, III)
 *   6) the pool does not shrink below 30 sheets (it was 10 before this round)
 *   7) the real daily pick deals every sheet: 90 days from a fixed start
 *   8) no long dash in any sheet text (house style)
 *
 * Nothing here is random, so there are no seeds and no bands: one run is the
 * measurement. Measured on the Round 948 tree: 30 sheets, 66 hosts named in
 * sheet sources (2 per sheet, 6 sheets also cite the SABR recap), 90 blanks
 * all matching, and the 90 day walk from 2026-10-03 deals 30 of 30 sheets,
 * the rarest twice (the old ten-sheet pool could only ever deal 10). A full
 * cycle is as long as the pool, so 90 days always holds two whole cycles. The floor is the count,
 * not a band: a pool may grow, it may not shrink.
 *
 * Negative controls, each mutates a COPY (never the tree) and asserts the
 * string it mutates exists first, then demands its own check goes red:
 *   SIM_M9_SOURCES_CONTROL=onehost  strips the second host from one sheet   (1)
 *   SIM_M9_SOURCES_CONTROL=wiki     swaps a sheet's second host for a wiki  (1)
 *   SIM_M9_SOURCES_CONTROL=record   gives a record row two sources on one host (2)
 *   SIM_M9_SOURCES_CONTROL=slot     moves a starter to another position    (3)
 *   SIM_M9_SOURCES_CONTROL=fact     edits one blank's fact in the game file  (4)
 *   SIM_M9_SOURCES_CONTROL=suffix   gives a blank a Jr. surname             (5)
 *   SIM_M9_SOURCES_CONTROL=floor    deletes the last sheet from the game file (6)
 *   SIM_M9_SOURCES_CONTROL=walk     makes the daily pick walk only ten sheets (7)
 *   SIM_M9_SOURCES_CONTROL=dash     puts a long dash into one fact           (8)
 *   SIM_M9_SOURCES_CONTROL=alias    drops the alias line from the guess check (4)
 *   SIM_M9_SOURCES_CONTROL=born     makes Chili Davis USA in both files, born Kingston (9)
 *   SIM_M9_SOURCES_CONTROL=url      points the 2019 WSH almanac row at a 2017 box (10)
 *   SIM_M9_SOURCES_CONTROL=team     makes the 2019 Astros sheet's team the Nationals (11)
 *   SIM_M9_SOURCES_CONTROL=hub      puts the old 1986 to 2016 span back in the hub FAQ (12)
 *
 * Run: node scripts/simMissingNineSources.mjs
 * Reads committed files only; no network.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/lib/missingNine.ts');
const RECORD = path.join(ROOT, 'scripts/data/missingNineSources.json');
const CONTROL = process.env.SIM_M9_SOURCES_CONTROL || '';
const FLOOR = 30;
const WALK_START = '2026-10-03';
/* Three pool lengths, set once the pool is known (check 7). dailyIndex cuts
   the days into cycles as long as the pool, aligned to the day number, so a
   start in mid cycle still leaves two whole cycles inside 3 x pool days and
   every sheet must come up at least twice whatever the pool size. A fixed 90
   only held that up to 30 sheets: at 35 the rarest sheet came up once. */
const WALK_CYCLES = 3;
const HUB = path.join(ROOT, 'src/lib/sportHub.ts');
const HOSTS = [
  ['baseball-almanac', /baseball-almanac/i],
  ['baseball-reference', /baseball-reference/i],
  ['sabr', /\bSABR\b/i],
  ['retrosheet', /retrosheet/i],
];
const WIKI = /wiki/i;
const LONG_DASH = new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']');

/* Line endings folded to LF, so a control's two line anchor holds on a CRLF checkout too. */
let code = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
let recordText = fs.readFileSync(RECORD, 'utf8');
let hubText = fs.readFileSync(HUB, 'utf8').replace(/\r\n/g, '\n');

/* Controls: assert the anchor exists exactly where we expect, then mutate the copy. */
function mutate(kind, text, anchor, replacement) {
  const n = text.split(anchor).length - 1;
  if (n < 1) { console.error(`control ${CONTROL}: anchor not found in the ${kind}: ${anchor}`); process.exit(2); }
  const out = text.replace(anchor, replacement);
  if (out === text) { console.error(`control ${CONTROL}: the mutation changed nothing`); process.exit(2); }
  return out;
}
const CONTROLS = {
  onehost: [1, () => { code = mutate('game file', code, ' + baseball-reference box MIN199110270', ''); }],
  wiki: [1, () => { code = mutate('game file', code, 'baseball-reference box KCA201410290', 'Wikipedia "2014 World Series"'); }],
  record: [2, () => { recordText = mutate('record', recordText, '"host": "baseball-reference.com", "url": "https://www.baseball-reference.com/boxes/MIN/', '"host": "baseball-almanac.com", "url": "https://www.baseball-reference.com/boxes/MIN/'); }],
  slot: [3, () => { recordText = mutate('record', recordText, '"DH Chili Davis"', '"1B Chili Davis"'); }],
  fact: [4, () => { code = mutate('game file', code, "scored the game\\'s only run", 'scored twice'); }],
  suffix: [5, () => { code = mutate('game file', code, "{ name: 'Chris Taylor', slotIndex: 0", "{ name: 'Chris Taylor Jr.', slotIndex: 0"); }],
  floor: [6, () => {
    const at = code.indexOf('  // 30. 1956 World Series Game 5, Brooklyn Dodgers');
    const end = code.indexOf('];', at);
    if (at < 0 || end < 0) { console.error('control floor: last sheet marker not found'); process.exit(2); }
    code = code.slice(0, at) + code.slice(end);
  }],
  walk: [7, () => { code = mutate('game file', code, 'dailyIndex(getTodayET(), NINE_LINEUPS.length)', 'dailyIndex(getTodayET(), 10)'); }],
  dash: [8, () => { code = mutate('game file', code, 'Had three hits, two of them doubles,', 'Had three hits ' + String.fromCharCode(0x2014) + ' two of them doubles,'); }],
  alias: [4, () => { code = mutate('game file', code, "  if ((candidate.aliases ?? []).some((a) => normalizeNineName(a) === g)) return true;\n", ''); }],
  born: [9, () => {
    recordText = mutate('record', recordText, '"name": "Chili Davis", "nationality": "Jamaica"', '"name": "Chili Davis", "nationality": "USA"');
    code = mutate('game file', code, "{ name: 'Chili Davis', slotIndex: 4, nationality: 'Jamaica'", "{ name: 'Chili Davis', slotIndex: 4, nationality: 'USA'");
  }],
  url: [10, () => { recordText = mutate('record', recordText, 'boxscore.php?boxid=201910300HOA', 'boxscore.php?boxid=201711010LAN'); }],
  team: [11, () => { code = mutate('game file', code, "    team: 'Houston Astros',\n    opponent: 'Washington Nationals',", "    team: 'Washington Nationals',\n    opponent: 'Washington Nationals',"); }],
  hub: [12, () => { hubText = mutate('hub', hubText, 'World Series games between 1956 and 2019', 'World Series games between 1986 and 2016'); }],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
if (CONTROL) CONTROLS[CONTROL][1]();

/* Bundle the (possibly mutated) copy from a private temp folder, so two runs
   at once never read each other's files and the tree is never touched. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simM9Sources-'));
const COPY = path.join(TMP, 'missingNine.ts');
const OUT = path.join(TMP, 'missingNine.bundle.mjs');
fs.writeFileSync(COPY, code);
await build({
  entryPoints: [COPY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
});
const m9 = await import(pathToFileURL(OUT).href);
const record = JSON.parse(recordText);

const failed = new Map();
const fail = (check, msg) => {
  failed.set(check, (failed.get(check) ?? 0) + 1);
  if ((failed.get(check) ?? 0) <= 6) console.error(`  FAIL (${check}) ${msg}`);
};
const sheets = m9.NINE_LINEUPS;
const rows = new Map((record.sheets ?? []).map((r) => [r.id, r]));

console.log('1) every sheet names two hosts in its source, and no wiki');
let hostMentions = 0;
for (const s of sheets) {
  const named = HOSTS.filter(([, re]) => re.test(s.source ?? '')).map(([h]) => h);
  hostMentions += named.length;
  if (named.length < 2) fail(1, `${s.id}: its source names ${named.length} host (${named.join(', ') || 'none'}), two are needed`);
  if (WIKI.test(s.source ?? '')) fail(1, `${s.id}: its source cites a wiki, which never counts`);
}
console.log(`   ${sheets.length} sheets, ${hostMentions} host mentions`);

console.log('2) the record and the game file hold the same sheets, each on two real hosts');
for (const s of sheets) if (!rows.has(s.id)) fail(2, `${s.id} is in the game but has no record row`);
for (const id of rows.keys()) if (!sheets.some((s) => s.id === id)) fail(2, `record row ${id} has no sheet in the game`);
for (const r of rows.values()) {
  const hosts = new Set();
  for (const src of r.sources ?? []) {
    let url;
    try { url = new URL(src.url); } catch { fail(2, `${r.id}: a source url that does not parse`); continue; }
    if (url.protocol !== 'https:') fail(2, `${r.id}: ${src.url} is not https`);
    if (url.hostname.replace(/^www\./, '') !== src.host) fail(2, `${r.id}: ${src.url} is not on ${src.host}`);
    if (WIKI.test(src.host) || WIKI.test(src.url)) fail(2, `${r.id}: a wiki is listed as a source`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(src.read ?? '')) fail(2, `${r.id}: ${src.host} has no read date`);
    hosts.add(src.host);
  }
  if (hosts.size < 2) fail(2, `${r.id}: its sources sit on ${hosts.size} host, two different hosts are needed`);
}

console.log('3) the record\'s nine starters are the sheet\'s nine, slot for slot');
for (const s of sheets) {
  const r = rows.get(s.id);
  if (!r) continue;
  const mine = s.slots.map((x) => `${x.position} ${x.name}`);
  if (mine.length !== 9) fail(3, `${s.id}: ${mine.length} slots, a sheet holds 9`);
  if ((r.starters ?? []).length !== 9) fail(3, `${s.id}: the record lists ${(r.starters ?? []).length} starters`);
  mine.forEach((m, i) => { if (m !== r.starters?.[i]) fail(3, `${s.id} slot ${i + 1}: game "${m}", record "${r.starters?.[i]}"`); });
}

console.log('4) every blank matches the record: name, slot, nationality, fact');
let blanks = 0;
let aliasCount = 0;
for (const s of sheets) {
  const r = rows.get(s.id);
  if (!r) continue;
  if ((r.blanks ?? []).length !== s.blankCandidates.length) fail(4, `${s.id}: ${s.blankCandidates.length} blanks in the game, ${(r.blanks ?? []).length} in the record`);
  for (const c of s.blankCandidates) {
    blanks += 1;
    if (s.slots[c.slotIndex]?.name !== c.name) fail(4, `${s.id}: ${c.name} points at slot ${c.slotIndex}, which holds ${s.slots[c.slotIndex]?.name}`);
    const b = (r.blanks ?? []).find((x) => x.name === c.name);
    if (!b) { fail(4, `${s.id}: ${c.name} can be blanked but the record never checked him`); continue; }
    if (b.nationality !== c.nationality) fail(4, `${s.id}: ${c.name} nationality game "${c.nationality}", record "${b.nationality}"`);
    if (b.fact !== c.fact) fail(4, `${s.id}: ${c.name} fact differs from the checked one`);
    if (!b.checked || !b.born) fail(4, `${s.id}: ${c.name} has no checked note or birthplace in the record`);
    /* Aliases: the same man under another full name (Bobby Ojeda, Norichika Aoki). */
    const ga = JSON.stringify(c.aliases ?? []);
    const ra = JSON.stringify(b.aliases ?? []);
    if (ga !== ra) fail(4, `${s.id}: ${c.name} aliases game ${ga}, record ${ra}`);
    if ((b.aliases ?? []).length > 0 && !b.aliasWhy) fail(4, `${s.id}: ${c.name} carries an alias with no reason in the record`);
    if (!m9.isCorrectNineGuess(c.name, c)) fail(4, `${s.id}: ${c.name} is not accepted as his own guess`);
    for (const a of c.aliases ?? []) {
      aliasCount += 1;
      if (!m9.isCorrectNineGuess(a, c)) fail(4, `${s.id}: the alias "${a}" is not accepted as a guess for ${c.name}`);
      if (a.trim().split(/\s+/).pop() !== c.name.trim().split(/\s+/).pop()) fail(4, `${s.id}: the alias "${a}" does not share ${c.name}'s surname, so the hints would mislead`);
      if (m9.ALL_NINE_NAMES.includes(a)) fail(4, `${s.id}: the alias "${a}" is another name on the sheets`);
    }
  }
}
console.log(`   ${blanks} blanks checked against the record, ${aliasCount} aliases accepted by the real guess check`);

console.log('5) every surname hint is a real surname');
const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
for (const s of sheets) {
  for (const c of s.blankCandidates) {
    const last = c.name.trim().split(/\s+/).pop() ?? '';
    if (SUFFIX.test(last)) fail(5, `${s.id}: ${c.name} would hint "${last}" as the surname`);
    const hint = m9.nineHintForLevel(2, c);
    if (!hint || !hint.includes(`"${last[0]}"`)) fail(5, `${s.id}: ${c.name} hint does not start from the surname`);
  }
}

console.log(`6) the pool holds at least ${FLOOR} sheets`);
if (sheets.length < FLOOR) fail(6, `${sheets.length} sheets, the floor is ${FLOOR} (it was 10 before Round 948)`);
console.log(`   ${sheets.length} sheets`);

const WALK_DAYS = WALK_CYCLES * sheets.length;
console.log(`7) the real daily pick deals every sheet over ${WALK_DAYS} days (three pool lengths)`);
{
  const RealDate = globalThis.Date;
  const counts = new Map();
  const start = RealDate.parse(`${WALK_START}T17:00:00Z`);
  try {
    for (let d = 0; d < WALK_DAYS; d += 1) {
      const fixed = start + d * 86400000;
      globalThis.Date = class extends RealDate {
        constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
        static now() { return fixed; }
      };
      const p = m9.getDailyNinePuzzle();
      counts.set(p.lineup.id, (counts.get(p.lineup.id) ?? 0) + 1);
      if (!p.lineup.blankCandidates.includes(p.candidate)) fail(7, `day ${d}: the dealt blank is not on the dealt sheet`);
    }
  } finally {
    globalThis.Date = RealDate;
  }
  const dealt = counts.size;
  const least = Math.min(...[...counts.values()]);
  if (dealt < sheets.length) fail(7, `the daily pick dealt ${dealt} of ${sheets.length} sheets in ${WALK_DAYS} days`);
  if (least < 2) fail(7, `a sheet came up only ${least} time in ${WALK_DAYS} days, a full cycle is ${sheets.length} days`);
  console.log(`   ${dealt} of ${sheets.length} sheets dealt, the rarest ${least} times`);
}

console.log('8) no long dashes in any sheet text');
for (const s of sheets) {
  const text = JSON.stringify(s);
  if (LONG_DASH.test(text)) fail(8, `${s.id}: a long dash in the sheet`);
}

console.log('9) every blank\'s nationality agrees with the birthplace the record holds');
const US_STATES = new Set([
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'D.C.',
]);
let bornChecked = 0;
for (const r of rows.values()) {
  for (const b of r.blanks ?? []) {
    /* "Kingston, Jamaica", "Osaka, Japan (town differs, see playerPages)", "Oranjestad, Aruba, born 1992-10-01" */
    const place = String(b.born ?? '').replace(/\s*\([^)]*\)/g, '').replace(/,\s*born\b.*$/, '').trim();
    const last = place.split(',').map((x) => x.trim()).filter(Boolean).pop() ?? '';
    const implied = US_STATES.has(last) ? 'USA' : last;
    bornChecked += 1;
    if (!last) fail(9, `${r.id}: ${b.name} has no birthplace to check his nationality against`);
    else if (implied !== b.nationality) fail(9, `${r.id}: ${b.name} is "${b.nationality}" but the record has him born in ${place}`);
  }
}
console.log(`   ${bornChecked} nationalities agree with their birthplaces`);

/* The record's game line: "2019 World Series Game 7, 2019-10-30, Minute Maid Park: Nationals 6, Astros 2 (10 inn)" */
const GAME_LINE = /^(\d{4}) World Series Game (\d), (\d{4})-(\d{2})-(\d{2}), ([^:]+): (.+?) (\d+), (.+?) (\d+)(?: \((\d+) inn\))?$/;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function parseGame(r) {
  const m = GAME_LINE.exec(r.game ?? '');
  if (!m) return null;
  const [, year, gameNo, y, mo, d, venue, winner, ws, loser, ls, inn] = m;
  return { year, gameNo, date: `${y}-${mo}-${d}`, digits: `${y}${mo}${d}`,
    words: `${MONTHS[Number(mo) - 1]}-${Number(d)}-${y}`, venue, winner, ws, loser, ls, inn };
}

console.log('10) every source is the box or recap of that very game: its address carries the game\'s date');
let urlChecked = 0;
for (const r of rows.values()) {
  const g = parseGame(r);
  if (!g) { fail(10, `${r.id}: the record's game line does not parse: ${r.game}`); continue; }
  if (!r.id.startsWith(`ws-${g.year}-g${g.gameNo}-`)) fail(10, `${r.id}: the id does not match its game line (${g.year} Game ${g.gameNo})`);
  for (const src of r.sources ?? []) {
    urlChecked += 1;
    const u = String(src.url ?? '').toLowerCase();
    /* almanac boxid=YYYYMMDD0XXX, baseball-reference /XXXYYYYMMDD0.shtml, SABR /month-d-yyyy-... */
    const ok = src.host === 'sabr.org' ? u.includes(`/${g.words}-`) : u.includes(g.digits);
    if (!ok) fail(10, `${r.id}: the ${src.host} address does not carry ${g.date}, so it is another game's page: ${src.url}`);
  }
  const s = sheets.find((x) => x.id === r.id);
  if (s && !String(s.source ?? '').includes(g.digits)) fail(10, `${r.id}: the sheet's source string names no box of ${g.date}`);
}
console.log(`   ${urlChecked} source addresses carry their game's date`);

console.log('11) the card\'s header (date, venue, score, both teams) is the record\'s game, and both sides mirror');
for (const s of sheets) {
  const r = rows.get(s.id);
  const g = r && parseGame(r);
  if (!g) continue;
  const score = `${g.winner} ${g.ws}-${g.ls} ${g.loser}${g.inn ? ` (${g.inn} inn)` : ''}`;
  if (s.dateLabel !== `${g.year} World Series, Game ${g.gameNo}`) fail(11, `${s.id}: dateLabel "${s.dateLabel}" is not ${g.year} Game ${g.gameNo}`);
  if (s.competition !== 'World Series') fail(11, `${s.id}: competition "${s.competition}"`);
  if (s.matchDate !== g.date) fail(11, `${s.id}: matchDate ${s.matchDate}, the record says ${g.date}`);
  if (!String(s.venue ?? '').startsWith(`${g.venue},`)) fail(11, `${s.id}: venue "${s.venue}", the record says ${g.venue}`);
  if (s.scoreLine !== score) fail(11, `${s.id}: scoreLine "${s.scoreLine}", the record gives ${score}`);
  const sides = [g.winner, g.loser];
  const teamSide = sides.find((n) => String(s.team).endsWith(` ${n}`));
  const oppSide = sides.find((n) => String(s.opponent).endsWith(` ${n}`));
  if (!teamSide || !oppSide || teamSide === oppSide) fail(11, `${s.id}: "${s.team}" v "${s.opponent}" is not ${g.winner} v ${g.loser}`);
  const twin = sheets.filter((x) => x.id !== s.id && rows.get(x.id)?.game === r.game);
  if (twin.length !== 1) fail(11, `${s.id}: ${twin.length} other sheets of this game, the other side should be exactly one`);
  else if (twin[0].team !== s.opponent || twin[0].opponent !== s.team || twin[0].scoreLine !== s.scoreLine || twin[0].venue !== s.venue || twin[0].matchDate !== s.matchDate) {
    fail(11, `${s.id}: the other side (${twin[0].id}) does not mirror it`);
  }
}

console.log('12) the baseball hub\'s line about Missing Nine gives the pool\'s real span');
{
  const years = sheets.map((s) => Number(String(s.matchDate).slice(0, 4)));
  const lo = Math.min(...years);
  const hi = Math.max(...years);
  /* Read the FAQ answers (string literals in code), never a comment. */
  const answers = [...hubText.matchAll(/\ba: '((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).filter((a) => a.includes('Missing Nine'));
  let spans = 0;
  for (const a of answers) {
    for (const sentence of a.split(/(?<=\.)\s+/).filter((x) => x.includes('Missing Nine'))) {
      const ys = [...sentence.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)].map((m) => Number(m[1]));
      if (ys.length === 0) continue;
      spans += 1;
      if (Math.min(...ys) !== lo || Math.max(...ys) !== hi) fail(12, `the hub says Missing Nine spans ${Math.min(...ys)} to ${Math.max(...ys)}, the pool runs ${lo} to ${hi}: "${sentence.slice(0, 120)}"`);
    }
  }
  console.log(`   ${answers.length} hub answer(s) name Missing Nine, ${spans} give years; the pool runs ${lo} to ${hi}`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('');
if (CONTROL) {
  const want = CONTROLS[CONTROL][0];
  if (!failed.has(want)) {
    console.error(`simMissingNineSources: control ${CONTROL} did NOT turn check ${want} red, so the check is blind`);
    process.exit(1);
  }
  console.log(`simMissingNineSources: control ${CONTROL} turned check ${want} red as it must (${failed.get(want)} failure(s)). Control passed.`);
  process.exit(0);
}
const total = [...failed.values()].reduce((a, b) => a + b, 0);
if (total > 0) {
  console.error(`simMissingNineSources: ${total} failure${total === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log(`simMissingNineSources: green. ${sheets.length} sheets, every one on two hosts and matching its record.`);

