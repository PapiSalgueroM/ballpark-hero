/* Round 1310 (league book Round F, a data job). The real yardstick for Club Manager's league leaders, held as DATA.
 *
 *   scripts/data/cmLeagueBookFacts.json          the league top scorer's goals, 2015-16 to 2024-25, in five leagues,
 *                                                the format rows that say how many matches a club played, and the
 *                                                leading keepers' clean sheets
 *   scripts/data/cmLeagueBookFacts.receipt.json  who read the pages, how, the limits, and the data file's sha256
 *
 * It loads no engine and builds no bundle. What it holds:
 *   1. every row is an opened page: a declared publisher whose host is the url's, an https url that is not a wiki
 *      and not a banned host (Transfermarkt, Futbin), literals, and every figure printed in one of its literals
 *      (a season written 2015/16 or 2019-20 is taken out of the literals first, so a 16 or a 20 in a season is
 *      never read as a figure);
 *   2. USED, THIN and DISPUTED are worked out HERE from the rows alone: a figure is USED when two publishers on two
 *      hosts each print it and every reading on file agrees exactly, DISPUTED when two readings differ, THIN when
 *      one publisher prints it. No field of the data file types a state;
 *   3. every core cell (topScorerGoals with its length, league by season) is USED or named under owed, and so is
 *      every keeper cell, so a hole is said, never silent; an owed entry that names a USED cell is stale and fails;
 *   4. every core row carries the length its format rows give (a span row gives twice one less than its clubs, or
 *      the matches it prints; 2019-20 stands on season rows only, since every league paused that season), and a
 *      curtailed season belongs to no length;
 *   5. the receipt's sha256 is the data file's with CRLF turned to LF, and checkedBy names this file;
 *   6. no file under src names cmLeagueBookFacts (the numbers reach no page and no bundle);
 *   7. no en dash or em dash in either data file;
 *   8. it PRINTS, by league and season length, how many seasons are USED and their mean. It binds nothing on a mean.
 *
 * Controls, CM_FACTS_CONTROL=wiki | bannedhost | figure | onesource | disagree | receipt | srcname | dash | length
 * | samehost (a USED figure's second publisher moved onto the first one's host: two publishers on one host are THIN)
 * | pausedrow (the Premier League's second 2019-20 table taken out: its length must read THIN, no span row speaks for it)
 * | staleowed (an owed entry planted for a USED cell) | keeperowed (the Bundesliga's keeper owed entry taken out)
 * | seasontoken (both rows of a cell given the 16 of 2015/16) | boundary (both rows given one digit of the 25 printed)
 * | wikimirror (a row moved onto a Wikipedia mirror) | badurl (a row's url made unparsable: the run must still reach
 * its summary and report it).
 * Each changes the parsed copy in memory, proves it changed something, and must go red for its own reason: it ends
 * "FIRED" and exits 1. One that changes nothing or is not caught exits 3; an unknown control exits 2.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = 'scripts/data/cmLeagueBookFacts.json';
const RECEIPT = 'scripts/data/cmLeagueBookFacts.receipt.json';
const SELF = 'scripts/simCmLeagueBookFacts.mjs';
const NAME = 'cmLeagueBookFacts';
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const CONTROL = process.env.CM_FACTS_CONTROL || '';
const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1'];
const SEASONS = Array.from({ length: 10 }, (_, i) => `${2015 + i}-${String((16 + i) % 100).padStart(2, '0')}`);
const PAUSED = '2019-20';
const CORE = 'topScorerGoals', KEEPER = 'keeperCleanSheets';
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const EXPECT = {
  wiki: /is a wiki host/, bannedhost: /is a banned host/, figure: /is not printed in its literals/,
  onesource: /Premier League 2015-16 topScorerGoals is THIN .*not named under owed/,
  disagree: /Premier League 2015-16 topScorerGoals is DISPUTED .*not named under owed/,
  receipt: /does not carry the sha256 of/, srcname: /names cmLeagueBookFacts/, dash: /holds a banned dash/,
  length: /says (34|38) matches a club and its format rows give/,
  samehost: /Premier League 2015-16 topScorerGoals is THIN \([a-z0-9]+, [a-z0-9]+\)/,
  pausedrow: /Premier League 2019-20 topScorerGoals is USED but its length is THIN/,
  staleowed: /Premier League 2015-16 topScorerGoals is USED and owed still names it \(stale\)/,
  keeperowed: /Bundesliga 2015-16 keeperCleanSheets is \S+ .*not named under owed/,
  seasontoken: /-pl-2015-16: topScorerGoals 16 is not printed in its literals/,
  boundary: /-pl-2015-16: topScorerGoals \d is not printed in its literals/,
  wikimirror: /wikiwand\.com\S* is a wiki host/, badurl: /url not a url is not an https url/,
};
if (CONTROL && !Object.hasOwn(EXPECT, CONTROL)) { console.log(`simCmLeagueBookFacts: unknown control ${CONTROL}`); process.exit(2); }

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails.push(msg); };
/* null for a url that does not parse: check 1 reports that row, and the states below must still reach the summary. */
const hostOf = url => { try { return new URL(url).host.toLowerCase().replace(/^www\./, ''); } catch { return null; } };
/* Any host with wiki in it (wikipedia, wikimedia, a mirror such as wikiwand or wikidata, a host starting wiki.), or fandom. */
const isWiki = url => /wiki|fandom/.test(hostOf(url) ?? '');
const isBanned = url => /(^|\.)(transfermarkt|futbin)\./.test(hostOf(url) ?? '');
const SEASON_TOKEN = /\b\d{4}[/-]\d{2}(?:\d{2})?\b/g;
const STOP_WORDS = /stopp|abandon|curtail|arr[eê]t|interromp|halted|ended early|cancel/i;
/* A season is written 2015-16; a span 1995-96 to 2025-26. Anything else is null. */
const seasonsOf = s => {
  const one = /^(\d{4})-(\d{2})$/, span = /^(\d{4})-(\d{2}) to (\d{4})-(\d{2})$/;
  const valid = (y, yy) => (Number(y) + 1) % 100 === Number(yy);
  let m = one.exec(s ?? '');
  if (m) return valid(m[1], m[2]) ? [s] : null;
  m = span.exec(s ?? '');
  if (!m || !valid(m[1], m[2]) || !valid(m[3], m[4]) || Number(m[3]) < Number(m[1])) return null;
  return Array.from({ length: Number(m[3]) - Number(m[1]) + 1 }, (_, i) => `${Number(m[1]) + i}-${String((Number(m[1]) + i + 1) % 100).padStart(2, '0')}`);
};

const facts = JSON.parse(text(DATA));
const receiptText = text(RECEIPT);
let receipt = JSON.parse(receiptText);
let srcPlant = null;
let changed = false;
const coreRow = (comp, season, q = CORE) => facts.rows.filter(r => r.competition === comp && r.season === season && typeof r.figures?.[q] === 'number');
if (CONTROL === 'wiki') { const was = facts.rows[0].url; facts.rows[0].url = 'https://en.wikipedia.org/wiki/Premier_League'; changed = was !== facts.rows[0].url; }
if (CONTROL === 'bannedhost') { const was = facts.rows[0].url; facts.rows[0].url = 'https://www.transfermarkt.com/premier-league/torschuetzenliste/wettbewerb/GB1'; changed = was !== facts.rows[0].url; }
if (CONTROL === 'figure') { const row = coreRow('Premier League', '2015-16')[0]; if (row) { row.figures[CORE] += 1; changed = true; } }
/* onesource: a USED figure's second row taken out. It must read THIN, and check 3 must fire. */
if (CONTROL === 'onesource') { const rows = coreRow('Premier League', '2015-16'); if (rows.length >= 2) { facts.rows = facts.rows.filter(r => r !== rows[1]); changed = true; } }
/* disagree: a second row's goals plus one, in its figure AND its literal, so only the disagreement is left. */
if (CONTROL === 'disagree') {
  const row = coreRow('Premier League', '2015-16')[1];
  if (row) { const v = row.figures[CORE]; const lit = row.literal.map(l => l.replace(new RegExp(`(^|[^0-9])${v}([^0-9]|$)`), `$1${v + 1}$2`)); changed = lit.join('|') !== row.literal.join('|'); row.literal = lit; row.figures[CORE] = v + 1; }
}
if (CONTROL === 'receipt') { const was = receipt.sha256; receipt = { ...receipt, sha256: (was[0] === '0' ? '1' : '0') + was.slice(1) }; changed = was !== receipt.sha256; }
if (CONTROL === 'srcname') { srcPlant = { file: 'src/lib/plantedByControl.ts', body: "import facts from '../../scripts/data/cmLeagueBookFacts.json';\n" }; changed = true; }
if (CONTROL === 'dash') { const row = facts.rows.find(r => r.literal?.length); if (row) { row.literal[0] = row.literal[0].replace(' ', ` ${DASHES[0]} `); changed = row.literal[0].includes(DASHES[0]); } }
/* length: a Ligue 1 34 match season given 38. Until Ligue 1 is on file, the first core row's length swapped 38 for 34. */
if (CONTROL === 'length') {
  const row = facts.rows.find(r => r.competition === 'Ligue 1' && r.length === 34 && typeof r.figures?.[CORE] === 'number')
    ?? facts.rows.find(r => typeof r.figures?.[CORE] === 'number' && (r.length === 38 || r.length === 34));
  if (row) { console.log(`simCmLeagueBookFacts control length: ${row.id} given ${row.length === 34 ? 38 : 34}`); row.length = row.length === 34 ? 38 : 34; changed = true; }
}
/* samehost: a USED figure's second row handed to a second declared publisher on the first row's host. Two publishers
   on one host are one host's word: the figure must read THIN with both named, and check 3 must fire. */
if (CONTROL === 'samehost') {
  const rows = coreRow('Premier League', '2015-16');
  const first = rows[0] ? facts.publishers?.[rows[0].publisher] : null;
  if (rows.length >= 2 && first && first.host !== hostOf(rows[1].url)) {
    facts.publishers.samehostcontrol = { name: "a second publisher planted on the first one's host", host: first.host, kind: "the samehost control's plant" };
    rows[1].publisher = 'samehostcontrol'; rows[1].url = `https://${first.host}/samehost-control`; changed = true;
  }
}
/* pausedrow: every Premier League 2019-20 season table but the first taken out. The paused season stands on its own
   rows only, so its length must read THIN although the league's span row covers the decade. */
if (CONTROL === 'pausedrow') {
  const tables = facts.rows.filter(r => r.competition === 'Premier League' && r.season === PAUSED && (Number.isInteger(r.figures?.clubs) || Number.isInteger(r.figures?.matchesPerClub)));
  if (tables.length >= 2) { facts.rows = facts.rows.filter(r => !tables.slice(1).includes(r)); changed = true; }
}
/* staleowed: an owed entry naming a cell that is USED. Owed says what is still missing and nothing else. */
if (CONTROL === 'staleowed') {
  facts.owed = [...(facts.owed ?? []), { id: 'staleowed-control', competition: 'Premier League', seasons: '2015-16', quantities: [CORE], lookedFor: 'planted by the staleowed control: an owed entry for a cell that is USED' }];
  changed = true;
}
/* keeperowed: the Bundesliga's keeper owed entry taken out, so its keeper cells are a hole nobody named. */
if (CONTROL === 'keeperowed') {
  const before = (facts.owed ?? []).length;
  facts.owed = (facts.owed ?? []).filter(o => !(o.competition === 'Bundesliga' && (o.quantities ?? []).includes(KEEPER)));
  changed = facts.owed.length < before;
}
/* seasontoken and boundary: both rows of a USED cell given the same number that sits on their lines only inside a
   season (the 16 of 2015/16) or inside the figure (one digit of 25). Both rows agree, so only check 1 can catch it. */
if (CONTROL === 'seasontoken' || CONTROL === 'boundary') {
  const rows = coreRow('Premier League', '2015-16'), v = rows[0]?.figures[CORE];
  const plant = CONTROL === 'seasontoken' ? 16 : Number(String(v)[0]);
  const fits = CONTROL === 'seasontoken' ? rows.every(r => r.literal.some(l => l.includes('2015/16') || l.includes('2015-16'))) : v >= 10 && rows.every(r => r.figures[CORE] === v);
  if (rows.length >= 2 && fits && plant !== v) { for (const r of rows) r.figures[CORE] = plant; changed = true; }
}
if (CONTROL === 'wikimirror') { const was = facts.rows[0].url; facts.rows[0].url = 'https://www.wikiwand.com/en/articles/Premier_League'; changed = was !== facts.rows[0].url; }
/* badurl: a core row's url that does not parse. Check 1 reports it; the states it still feeds must not throw. */
if (CONTROL === 'badurl') { const row = coreRow('Premier League', '2015-16')[0]; if (row) { row.url = 'not a url'; changed = true; } }
if (CONTROL && !changed) { console.log(`simCmLeagueBookFacts control ${CONTROL}: ABORTED, the control changed nothing.`); process.exit(3); }

/* 1. Every row is an opened page somebody can open again, and every figure is printed in its literals. */
const quantities = facts.quantities ?? {};
for (const [id, p] of Object.entries(facts.publishers ?? {})) {
  ok(typeof p.name === 'string' && p.name.length > 3 && typeof p.kind === 'string' && p.kind.length > 3, `publisher ${id} has no name or kind`);
  ok(typeof p.host === 'string' && /^[a-z0-9.-]+\.[a-z]+$/.test(p.host) && !p.host.startsWith('www.'), `publisher ${id} has no host written bare (example.com)`);
}
const ids = new Set();
for (const row of facts.rows) {
  ok(typeof row.id === 'string' && !ids.has(row.id), `${row.id}: no id, or an id used twice`); ids.add(row.id);
  const pub = facts.publishers?.[row.publisher];
  ok(!!pub, `${row.id}: publisher ${row.publisher} is not declared`);
  let url = null; try { url = new URL(row.url); } catch { /* reported below */ }
  ok(!!url && url.protocol === 'https:', `${row.id}: url ${row.url} is not an https url`);
  if (!url) continue;
  ok(!isWiki(row.url), `${row.id}: ${row.url} is a wiki host`);
  ok(!isBanned(row.url), `${row.id}: ${row.url} is a banned host`);
  ok(!pub || hostOf(row.url) === pub.host, `${row.id}: ${hostOf(row.url)} is not the host of publisher ${row.publisher} (${pub?.host})`);
  ok(LEAGUES.includes(row.competition), `${row.id}: ${row.competition} is not one of the five leagues`);
  const seasons = seasonsOf(row.season);
  ok(!!seasons, `${row.id}: season ${row.season} is not written 2015-16 or 1995-96 to 2025-26`);
  ok(typeof row.counts === 'string' && row.counts.length > 10, `${row.id}: counts does not say whose count it is`);
  ok(Array.isArray(row.literal) && row.literal.length > 0 && row.literal.every(l => typeof l === 'string' && l.length > 0), `${row.id}: no literal`);
  ok(row.figures && Object.keys(row.figures).length > 0, `${row.id}: no figures`);
  if (seasons && seasons.length > 1 && row.published) ok(Number(seasons.at(-1).slice(0, 4)) <= Number(String(row.published).slice(0, 4)), `${row.id}: a span that runs past the year its page was published (${row.published})`);
  if (seasons && seasons.length > 1) ok(/^\d{4}(-\d{2}-\d{2})?$/.test(row.published ?? ''), `${row.id}: a span row needs the date (or, when the page prints no day, the year) its page was published`);
  const printed = (row.literal ?? []).join(' | ').replace(SEASON_TOKEN, ' ');
  for (const [name, value] of Object.entries(row.figures ?? {})) {
    ok(Object.hasOwn(quantities, name), `${row.id}: figure ${name} is not a declared quantity`);
    if (name === 'curtailed') { ok(value === true && STOP_WORDS.test(printed), `${row.id}: curtailed ${value} is not printed in its literals (a line saying the season was stopped)`); continue; }
    ok(Number.isInteger(value) && value > 0, `${row.id}: ${name} ${value} is not a whole number above nought`);
    ok(new RegExp(`(^|[^0-9])${value}([^0-9]|$)`).test(printed), `${row.id}: ${name} ${value} is not printed in its literals`);
  }
  const f = row.figures ?? {};
  if (f.curtailed !== true && Number.isInteger(f.clubs) && Number.isInteger(f.matchesPerClub)) ok(f.matchesPerClub === 2 * (f.clubs - 1), `${row.id}: ${f.matchesPerClub} matches a club is not twice one less than ${f.clubs} clubs, and the season is not curtailed`);
  const isCore = typeof f[CORE] === 'number' || typeof f[KEEPER] === 'number';
  if (isCore) {
    ok(seasons?.length === 1 && SEASONS.includes(row.season), `${row.id}: a core row reads one season of 2015-16 to 2024-25, not ${row.season}`);
    ok(!('clubs' in f) && !('matchesPerClub' in f) && !('curtailed' in f), `${row.id}: a top scorer or keeper row carries a format figure; the matches come from format rows only`);
    ok(row.length === 'curtailed' || (Number.isInteger(row.length) && row.length > 0), `${row.id}: a core row carries no length (the matches a club played, or curtailed)`);
  }
}

/* 2. USED, THIN and DISPUTED, worked out from the rows alone. */
const key = (comp, season) => `${comp}|${season}`;
const settle = readings => {
  if (!readings || readings.length === 0) return { state: 'NONE', value: null, publishers: [] };
  const values = [...new Set(readings.map(r => r.value))];
  const publishers = [...new Set(readings.map(r => r.row.publisher))];
  const hosts = new Set(readings.map(r => hostOf(r.row.url)).filter(Boolean));
  const state = values.length > 1 ? 'DISPUTED' : publishers.length >= 2 && hosts.size >= 2 ? 'USED' : 'THIN';
  return { state, value: values.length === 1 ? values[0] : null, values, publishers };
};
const readingsOf = q => {
  const out = new Map();
  for (const row of facts.rows) {
    if (typeof row.figures?.[q] !== 'number' || seasonsOf(row.season)?.length !== 1) continue;
    const k = key(row.competition, row.season);
    out.set(k, [...(out.get(k) ?? []), { row, value: row.figures[q] }]);
  }
  return out;
};
/* The length a format row gives a season: curtailed, the matches it prints, or twice one less than its clubs. A span row
   says nothing about 2019-20, which every league paused: that season stands on its own rows. */
const lengths = new Map();
for (const row of facts.rows) {
  const f = row.figures ?? {};
  if (!(f.curtailed === true || Number.isInteger(f.matchesPerClub) || Number.isInteger(f.clubs))) continue;
  const seasons = seasonsOf(row.season) ?? [];
  const value = f.curtailed === true ? 'curtailed' : Number.isInteger(f.matchesPerClub) ? f.matchesPerClub : 2 * (f.clubs - 1);
  for (const season of seasons) {
    if (seasons.length > 1 && season === PAUSED) continue;
    const k = key(row.competition, season);
    lengths.set(k, [...(lengths.get(k) ?? []), { row, value }]);
  }
}
const goals = readingsOf(CORE), keepers = readingsOf(KEEPER);
const cell = (comp, season) => {
  const g = settle(goals.get(key(comp, season))), l = settle(lengths.get(key(comp, season)));
  return { g, l, state: g.state === 'USED' && l.state === 'USED' ? 'USED' : g.state === 'USED' ? `USED but its length is ${l.state}` : g.state };
};

/* 3. Every core cell and every keeper cell is USED or named under owed with what was looked for. An owed entry is
   { id, competition, seasons, quantities, lookedFor }; seasons is one season or a span. One that names a USED cell
   is stale and fails, so owed always says what is still missing and nothing else. */
const owed = facts.owed ?? [];
for (const o of owed) {
  ok(typeof o.id === 'string' && LEAGUES.includes(o.competition) && !!seasonsOf(o.seasons) && Array.isArray(o.quantities) && o.quantities.every(q => q === CORE || q === KEEPER),
    `owed ${o.id}: needs an id, one of the five leagues, seasons, and quantities of ${CORE} or ${KEEPER}`);
  ok(typeof o.lookedFor === 'string' && o.lookedFor.length > 20, `owed ${o.id}: does not say what was looked for and where`);
}
const named = (comp, season, q) => owed.some(o => o.competition === comp && (seasonsOf(o.seasons) ?? []).includes(season) && (o.quantities ?? []).includes(q));
const pubs = s => s.publishers.length ? ` (${s.publishers.join(', ')})` : '';
for (const comp of LEAGUES) for (const season of SEASONS) {
  const c = cell(comp, season), k = settle(keepers.get(key(comp, season)));
  if (c.state === 'USED') ok(!named(comp, season, CORE), `${comp} ${season} ${CORE} is USED and owed still names it (stale)`);
  else ok(named(comp, season, CORE), `${comp} ${season} ${CORE} is ${c.state}${pubs(c.g)}, length ${c.l.state}${pubs(c.l)}, and the cell is not named under owed`);
  if (k.state === 'USED') ok(!named(comp, season, KEEPER), `${comp} ${season} ${KEEPER} is USED and owed still names it (stale)`);
  else ok(named(comp, season, KEEPER), `${comp} ${season} ${KEEPER} is ${k.state}${pubs(k)} and not named under owed`);
}

/* 4. Every core row carries the matches its format rows give. When the length is USED the row must carry it; when it
   is not, the row must carry one of the readings on file; a row with no format row at all fails. */
for (const row of facts.rows) {
  if (!(typeof row.figures?.[CORE] === 'number' || typeof row.figures?.[KEEPER] === 'number') || seasonsOf(row.season)?.length !== 1) continue;
  const l = settle(lengths.get(key(row.competition, row.season)));
  const say = l.state === 'NONE' ? 'nothing (no format row)' : l.state === 'USED' ? String(l.value) : `${l.values.join(' or ')} (${l.state})`;
  const fits = l.state === 'USED' ? row.length === l.value : l.state !== 'NONE' && l.values.includes(row.length);
  ok(fits, `${row.id} says ${row.length} matches a club and its format rows give ${say}`);
}

/* 5. The receipt vouches for this data file. */
const want = createHash('sha256').update(text(DATA)).digest('hex');
ok(receipt.sha256 === want, `${RECEIPT} does not carry the sha256 of ${DATA} with CRLF turned to LF (${want})`);
ok(receipt.checkedBy === SELF && receipt.dataFile === DATA, `${RECEIPT}: checkedBy is not ${SELF}, or dataFile is not ${DATA}`);
ok(typeof receipt.readBy === 'string' && typeof receipt.method === 'string' && Array.isArray(receipt.limits) && receipt.limits.length > 0, `${RECEIPT}: no readBy, method or limits`);
ok(receipt.readOn === facts.readOn, `${RECEIPT}: readOn ${receipt.readOn} is not the data file's ${facts.readOn}`);

/* 6. No file under src names the facts file: the numbers reach no page and no bundle (the simLiveScores way). */
const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
const srcFiles = walk('src');
if (srcPlant) srcFiles.push(srcPlant.file);
ok(srcFiles.length > 1000 && srcFiles.includes('src/lib/clubManager.ts'), `the walk over src found ${srcFiles.length} files, too few to say anything`);
for (const file of srcFiles) {
  const body = srcPlant && file === srcPlant.file ? srcPlant.body : fs.readFileSync(path.join(ROOT, file), 'utf8');
  ok(!body.includes(NAME), `${file} names ${NAME}: the facts are for a harness, never for a page`);
}

/* 7. No en dash or em dash in either data file: the files on disk and the copy this run read. */
for (const [file, body] of [[DATA, text(DATA)], [RECEIPT, receiptText], [`${DATA} as read`, JSON.stringify(facts)], [`${RECEIPT} as read`, JSON.stringify(receipt)]]) {
  ok(!DASHES.some(d => body.includes(d)), `${file} holds a banned dash`);
}

/* 8. PRINTED for the lead, binding nothing: by league and season length, the USED seasons and their mean. */
const mean = xs => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '-';
for (const comp of LEAGUES) {
  const used = SEASONS.map(s => ({ s, c: cell(comp, s) })).filter(x => x.c.state === 'USED');
  const byLength = new Map();
  for (const { c } of used) if (c.l.value !== 'curtailed') byLength.set(c.l.value, [...(byLength.get(c.l.value) ?? []), c.g.value]);
  const curtailed = used.filter(x => x.c.l.value === 'curtailed').map(x => x.s);
  const parts = [...byLength.entries()].sort((a, b) => b[0] - a[0]).map(([len, xs]) => `${len} matches: ${xs.length} USED, mean ${mean(xs)}`);
  const kUsed = SEASONS.map(s => settle(keepers.get(key(comp, s)))).filter(k => k.state === 'USED').map(k => k.value);
  console.log(`simCmLeagueBookFacts: ${comp}: top scorer ${parts.join('; ') || 'no season USED'}${curtailed.length ? `; curtailed (in no mean): ${curtailed.join(', ')}` : ''}. Keeper clean sheets: ${kUsed.length} USED, mean ${mean(kUsed)}.`);
  console.log(`  ${SEASONS.map(s => { const c = cell(comp, s); return `${s} ${c.state === 'USED' ? `${c.g.value}/${c.l.value}` : c.state}`; }).join(', ')}`);
}

for (const f of fails.slice(0, 40)) console.log(`FAIL ${f}`);
console.log(`simCmLeagueBookFacts: ${facts.rows.length} rows from ${Object.keys(facts.publishers ?? {}).length} publishers, ${owed.length} owed entries, ${srcFiles.length} src files scanned.`);
if (CONTROL) {
  const hit = fails.find(f => EXPECT[CONTROL].test(f));
  if (hit) { console.log(`simCmLeagueBookFacts control ${CONTROL}: FIRED (${hit})`); process.exit(1); }
  console.log(`simCmLeagueBookFacts control ${CONTROL}: DID NOT FIRE, ${fails.length} other failure(s).`); process.exit(3);
}
if (fails.length) { console.log(`simCmLeagueBookFacts: ${fails.length} of ${checks} checks FAILED.`); process.exit(1); }
console.log(`simCmLeagueBookFacts: all ${checks} checks passed.`);
