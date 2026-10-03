/**
 * simNbaCareerPathFacts: Round 925. NBA Career Path (/nba-career) is pinned to
 * a verification record, and nothing ships that the record does not hold.
 *
 * WHY THIS EXISTS. The pool had 20 players, so the daily came round again
 * inside three weeks, and its header called team order and awards "standard
 * record-book facts": nobody had sourced them. Read on 2026-10-03, Chris Paul's
 * teams stopped at San Antonio (he played 2025-26 for the Clippers), Vince
 * Carter's "record 22 seasons" was no longer a record (LeBron James played a
 * 23rd), Tim Duncan's country was USA where both hosts give the US Virgin
 * Islands, and about two dozen award and stat lines (scoring titles, Olympic
 * medals, "all-time record" tags, a nickname, championship and Hall of Fame
 * years) sat on one host or none. Round 925 read every line on two hosts
 * (nba.com, basketball-reference.com, and ESPN's stats and awards feeds, with
 * nba.com Legends profiles where ESPN holds no whole career), wrote them to
 * scripts/data/nbaCareerPathVerified2026-10.json, held one candidate out and
 * grew the pool to 50.
 *
 * WHAT IT CHECKS. The data file and the date helpers are bundled with esbuild,
 * so this reads the values the game reads, not a regex over the text.
 *    1. The record: every player names an nba.com page, a basketball-reference
 *       page and a third host, none a wiki; every fact carries its two values;
 *       every shown line has exactly one fact and every fact is a shown line.
 *    2. Every line follows from its source values by the record's rules: a
 *       position is nba.com's word for word unless basketball-reference lacks
 *       one of its families, and then only the shared words; the country is
 *       nba.com's and the basketball-reference birthplace is in it; the draft
 *       line's round, pick and year are in both values; the team path equals
 *       the basketball-reference codes and the ESPN slugs (or the Legends
 *       list) mapped through the record's team table, plus a current team
 *       both name; an exact total equals both values and belongs to a player
 *       whose last season is before 2025-26; a floor ('43,400+ Pts') is the
 *       lower value rounded down to a hundred; a per game line equals both; an
 *       award count equals both; a year shown equals the basketball-reference
 *       season and the ESPN season.
 *    3. The shipped file (src/data/nbaCareerPlayers.ts) equals the record word
 *       for word, row by row in the record's order, both ways, and the flag is
 *       built from the record's ISO code, so a wrong flag cannot pass by being
 *       wrong in both files.
 *    4. No repeats: ids and names unique (names compared without case or
 *       accents), and no guess the game accepts (the full name, or the last
 *       word of it; the rule is read from src/hooks/useNbaCareer.ts and the
 *       check refuses to pass if that rule changes) belongs to two players.
 *    5. No line the record removed ships on that player's row (a line false
 *       for one man can be true for another), and no held out player is in
 *       the file.
 *    6. The daily walk (dailyIndex in src/lib/dateUtils.ts, read live, over
 *       the shipped order). Every 50 day cycle from 2026 to 2028 deals every
 *       player once. Against the old 20 player pool as the baseline, repeats
 *       inside 14 days fall to at most half. For a release on any day from
 *       2026-10-04 to the record's releaseBy, the first 7 deals are all new
 *       players and at least 14 days separate an old player's last old deal
 *       from his first new one; a release the day after releaseBy breaks the
 *       14, so the date in the record is the real deadline.
 *
 * MEASURED (2026-10-03; the walk is deterministic, so one run is every run).
 * Release window 2026-10-04 to 2026-10-31: the shortest old to new gap is 17
 * days (Larry Bird, releases 2026-10-28 to 2026-10-31; 45 days for a release
 * on 2026-10-04) and the shortest run of new players is 10 days (a release on
 * 2026-10-31; 37 on 2026-10-04). A release on 2026-11-01 gives Allen Iverson a
 * 12 day gap. Bands: gap at least 14 (3 days of headroom), new run at least 7
 * (3 days of headroom). A player back inside 14 days, per calendar year 2026,
 * 2027, 2028: old 20 row pool 81, 87, 78 times, new pool 12, 18, 11 (worst
 * ratio 0.21 against a band of 0.5). All 21 whole 50 day cycles from 2026 to
 * 2028 deal every player once. 501 facts on 50 players.
 *
 * NEGATIVE CONTROLS (NBA_CP_CONTROL). Each edits only an in memory copy (line
 * endings normalised first), refuses to run unless its anchor occurs exactly
 * once and the edit changed something, and must turn exactly its predicted
 * sections red. Under a control the harness exits 1 when exactly those are red
 * (the break was caught) and 2 when not (the control proves nothing).
 *   onesource  LeBron James's points fact loses its basketball-reference   1, 2
 *              value
 *   floor      Stephen Curry's points floor raised above both hosts         2, 3
 *              (record only)
 *   year       Kobe Bryant's MVP season on ESPN moved to 2009               2
 *   falseline  Vince Carter's stats get the false record line back         3, 5
 *   staleteams Chris Paul's teams stop at San Antonio again                 3, 5
 *   dup        Chris Bosh's row becomes a second Kobe Bryant             3, 4, 6
 *   flag       Tim Duncan's flag becomes the US flag in the file           3
 *   order      the 2026-10-04 deal swaps places with LeBron James's row     3, 6
 *   releaseby  the record's releaseBy moves to 2026-11-01                   6
 *   guessrule  the hook's guess rule stops taking the last name             4
 *
 * Run: node scripts/simNbaCareerPathFacts.mjs
 *      NBA_CP_CONTROL=<name> node scripts/simNbaCareerPathFacts.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD_PATH = path.join(ROOT, 'scripts/data/nbaCareerPathVerified2026-10.json');
const DATA = 'src/data/nbaCareerPlayers.ts';
const DATES = 'src/lib/dateUtils.ts';
const HOOK = 'src/hooks/useNbaCareer.ts';
const CONTROL = process.env.NBA_CP_CONTROL || '';
const EXPECT = {
  onesource: [1, 2], floor: [2, 3], year: [2], falseline: [3, 5], staleteams: [3, 5],
  dup: [3, 4, 6], flag: [3], order: [3, 6], releaseby: [6], guessrule: [4],
};
if (CONTROL && !(CONTROL in EXPECT)) {
  console.error(`NBA_CP_CONTROL=${CONTROL} is not a control this harness knows`);
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simNbaCareerPathFacts-'));
const norm = (p) => path.resolve(p).toLowerCase();
let bundleNo = 0;
async function loadModule(rel, override) {
  const entry = path.join(ROOT, rel);
  const outfile = path.join(TMP, `m${bundleNo++}.mjs`);
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'nba-cp-memory',
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
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const record = JSON.parse(fs.readFileSync(RECORD_PATH, 'utf8'));
let dataText = src(DATA);
let hookText = src(HOOK);
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

// ---------------------------------------------------------------------------
// Controls. Each breaks one thing in memory and names the sections that must see it.
if (CONTROL === 'onesource') {
  const f = recFact(recPlayer('LeBron James'), '43,400+ Pts');
  if (f.second === undefined || f.second === null) cannot('the fact has no basketball-reference value to remove.');
  delete f.second;
}
if (CONTROL === 'floor') {
  const p = recPlayer('Stephen Curry');
  const f = recFact(p, '26,500+ Pts');
  const i = p.stats.indexOf('26,500+ Pts');
  if (i < 0) cannot('the floor is not in the record stats.');
  p.stats[i] = '26,600+ Pts';
  f.line = '26,600+ Pts';
}
if (CONTROL === 'year') {
  const f = recFact(recPlayer('Kobe Bryant'), 'MVP (2008)');
  if (JSON.stringify(f.third) !== '[2008]') cannot('the ESPN season is not [2008].');
  f.third = [2009];
}
if (CONTROL === 'falseline') {
  dataText = rewrite(dataText, "stats: ['25,728 Pts', '2,290 made threes'],", "stats: ['25,728 Pts', 'Played a record 22 seasons'],", "Vince Carter's stats");
}
if (CONTROL === 'staleteams') {
  dataText = rewrite(dataText, "'Golden State Warriors', 'San Antonio Spurs', 'Los Angeles Clippers'],", "'Golden State Warriors', 'San Antonio Spurs'],", "Chris Paul's teams");
}
if (CONTROL === 'dup') {
  dataText = rewrite(dataText, "name: 'Chris Bosh',", "name: 'Kobe Bryant',", "Chris Bosh's name");
}
if (CONTROL === 'flag') {
  dataText = rewrite(dataText, "country: 'US Virgin Islands',\n      countryFlag: '\u{1F1FB}\u{1F1EE}',", "country: 'US Virgin Islands',\n      countryFlag: '\u{1F1FA}\u{1F1F8}',", "Tim Duncan's flag");
}
if (CONTROL === 'order') {
  // swap the whole rows of nbac-021 (dealt 2026-10-04) and nbac-001
  const rowOf = (id) => {
    const m = dataText.match(new RegExp(`  \\{\\n    id: '${id}',[\\s\\S]*?\\n  \\},\\n`));
    if (!m) cannot(`row ${id} not found.`);
    return m[0];
  };
  const a = rowOf('nbac-021'); const b = rowOf('nbac-001');
  dataText = rewrite(dataText, a, '@@A@@', 'row nbac-021');
  dataText = rewrite(dataText, b, a, 'row nbac-001');
  dataText = rewrite(dataText, '@@A@@', b, 'the placeholder');
}
if (CONTROL === 'releaseby') {
  if (record.releaseBy !== '2026-10-31') cannot(`releaseBy is ${record.releaseBy}, not 2026-10-31.`);
  record.releaseBy = '2026-11-01';
}
if (CONTROL === 'guessrule') {
  hookText = rewrite(hookText, "normalized === target || normalized === target.split(' ').pop()", 'normalized === target', 'the guess rule');
}

const players = record.players;
const isWiki = (u) => /wiki/i.test(String(u));
const hostOf = (u) => { try { return new URL(u).host; } catch { return ''; } };
const has = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
const shownLines = (p) => [
  ['position', p.position], ['country', p.country], ['draft', p.draftInfo], ['teams', p.teams.join(' > ')],
  ...p.stats.map((s) => ['stat', s]), ...p.awards.map((a) => ['award', a]),
];

// ---------------------------------------------------------------------------
head(1, 'the record: two hosts per player, two values per fact, one fact per shown line');
{
  for (const p of players) {
    const s = p.sources || {};
    if (hostOf(s.official) !== 'www.nba.com') fail(`${p.name}: the official source is not an nba.com page (${s.official})`);
    if (hostOf(s.second) !== 'www.basketball-reference.com') fail(`${p.name}: the second source is not basketball-reference (${s.second})`);
    if (!['www.espn.com', 'www.nba.com'].includes(hostOf(s.third))) fail(`${p.name}: the third source is not ESPN or an nba.com Legends profile (${s.third})`);
    if (hostOf(s.third) === 'www.nba.com' && !/\/news\/history-nba-legend-/.test(s.third)) fail(`${p.name}: an nba.com third source must be a Legends profile`);
    for (const u of [s.official, s.second, s.third]) if (isWiki(u)) fail(`${p.name}: a wiki source ${u}`);
    // which two values each kind of fact needs: nba.com and basketball-reference, or basketball-reference and the third host
    const need = { position: ['official', 'second'], country: ['official', 'second'], draft: ['official', 'second'], teams: ['second', 'third'], award: ['official', 'second'] };
    for (const f of p.facts) {
      const keys = f.field === 'stat' ? (f.rule === 'career per game' ? ['official', 'second'] : ['second', 'third']) : need[f.field];
      if (!keys) { fail(`${p.name}: a fact of unknown kind ${f.field}`); continue; }
      for (const k of keys) if (!has(f[k])) fail(`${p.name}: '${f.line}' has no ${k} value`);
      if (f.current && !(has(f.current.official) && has(f.current.second))) fail(`${p.name}: the current team needs nba.com and basketball-reference`);
      if (/\(\d{4}\)$/.test(f.line) && f.field === 'award' && !(has(f.secondSeason) && has(f.third))) fail(`${p.name}: '${f.line}' shows a year without the two seasons behind it`);
    }
    const shown = shownLines(p);
    for (const [field, line] of shown) {
      const n = p.facts.filter((f) => f.field === field && f.line === line).length;
      if (n !== 1) fail(`${p.name}: shown ${field} '${line}' has ${n} facts, not one`);
    }
    for (const f of p.facts) if (!shown.some(([field, line]) => field === f.field && line === f.line)) fail(`${p.name}: fact '${f.line}' is not a shown line`);
    if (p.awards.length > 4) fail(`${p.name}: ${p.awards.length} award lines, the rule allows four`);
  }
  console.log(`  ${players.length} players, ${players.reduce((n, p) => n + p.facts.length, 0)} facts`);
}

// ---------------------------------------------------------------------------
head(2, 'every line follows from its source values by the record\'s rules');
{
  const fam = (s) => new Set([/guard/i.test(s) && 'G', /forward/i.test(s) && 'F', /center/i.test(s) && 'C'].filter(Boolean));
  const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
  const collapse = (xs) => xs.filter((x, i) => i === 0 || xs[i - 1] !== x);
  const slugName = {};
  for (const { name, espn } of Object.values(record.teamCodes)) for (const s of espn) slugName[s] = name;
  const STAT_LABEL = { pts: 'Pts', reb: 'Reb', ast: 'Ast', stl: 'Stl', blk: 'Blk', fg3: 'made threes' };
  const AWARD_LABEL = { mvp: 'MVP', champ: 'NBA Champion', fmvp: 'Finals MVP', dpoy: 'Defensive Player of the Year', allstar: 'All-Star', roy: 'Rookie of the Year', allnba: 'All-NBA', alldef: 'All-Defensive', hof: 'Hall of Famer' };
  const YEAR_OK = new Set(['mvp', 'fmvp', 'roy', 'dpoy']);
  const num = (s) => Number(String(s).replace(/,/g, ''));
  let checked = 0;
  for (const p of players) {
    const still = p.lastSeason >= '2025-26';
    for (const f of p.facts) {
      checked += 1;
      const bad = (why) => fail(`${p.name}: '${f.line}' ${why}`);
      if (f.field === 'position') {
        const o = fam(f.official), s = fam(f.second), l = fam(f.line);
        if (![...l].every((x) => o.has(x) && s.has(x)) || l.size === 0) bad(`is not supported by both (nba.com ${f.official}, basketball-reference ${f.second})`);
        const want = [...o].every((x) => s.has(x)) ? f.official : f.official.split('-').filter((w) => s.has(w[0])).join('-');
        if (f.line !== want) bad(`should be '${want}' by the position rule`);
      } else if (f.field === 'country') {
        const c = record.countries[f.line];
        if (!c) bad('is not in the record\'s country table');
        else {
          if (c.official !== f.official) bad(`nba.com says ${f.official}`);
          if (!String(f.second).endsWith(c.birthCountry)) bad(`basketball-reference birthplace is ${f.second}`);
        }
        if (!/^[a-z]{2}$/.test(p.countryIso || '')) bad('has no two letter ISO code for its flag');
      } else if (f.field === 'draft') {
        const m = f.line.match(/^(\d+)(st|nd|rd|th) Round, (\d+)(st|nd|rd|th) Pick \((\d{4})\)$/);
        if (!m) { bad('is not in the draft line format'); continue; }
        const [r, n, y] = [Number(m[1]), Number(m[3]), m[5]];
        if (`${m[1]}${m[2]}` !== ord(r) || `${m[3]}${m[4]}` !== ord(n)) bad('has a wrong ordinal');
        if (f.official !== `DRAFT_YEAR ${y}, DRAFT_ROUND ${r}, DRAFT_NUMBER ${n}`) bad(`nba.com says ${f.official}`);
        if (!String(f.second).includes(`${ord(r)} round (`) || !String(f.second).includes(`, ${ord(n)} overall), ${y} NBA Draft`)) bad(`basketball-reference says ${f.second}`);
      } else if (f.field === 'teams') {
        const shown = f.line.split(' > ');
        let played = shown;
        if (f.current) {
          played = shown.slice(0, -1);
          const cur = shown[shown.length - 1];
          if (cur !== f.current.official || cur !== f.current.second) bad(`ends on ${cur} but the current team is ${f.current.official} / ${f.current.second}`);
          if (cur === played[played.length - 1]) bad('appends a current team he already ends on');
        }
        const codes = String(f.second).split(' ');
        const unknown = codes.filter((c) => !record.teamCodes[c]);
        if (unknown.length) bad(`has team codes the record cannot name: ${unknown.join(', ')}`);
        const fromSecond = collapse(codes.map((c) => record.teamCodes[c]?.name));
        const legends = /nba\.com/.test(p.sources.third);
        const fromThird = legends ? String(f.third).split(' > ') : collapse(String(f.third).split(' ').map((s) => slugName[s] || `?${s}`));
        if (JSON.stringify(fromSecond) !== JSON.stringify(played)) bad(`basketball-reference gives ${fromSecond.join(' > ')}`);
        if (JSON.stringify(fromThird) !== JSON.stringify(played)) bad(`${legends ? 'the Legends profile' : 'ESPN'} gives ${fromThird.join(' > ')}`);
      } else if (f.field === 'stat') {
        if (f.rule === 'career per game') {
          const m = f.line.match(/^(\d+\.\d) (PPG|RPG|APG)$/);
          if (!m) { bad('is not a per game line'); continue; }
          if (Number(m[1]) !== Number(f.official) || Number(m[1]) !== Number(f.second)) bad(`nba.com ${f.official}, basketball-reference ${f.second}`);
          continue;
        }
        const m = f.line.match(/^([\d,]+)(\+?) (.+)$/);
        if (!m || STAT_LABEL[f.stat] !== m[3]) { bad(`is not a ${f.stat} line`); continue; }
        const v = num(m[1]), s = Number(f.second), t = Number(f.third);
        if (!Number.isFinite(s) || !Number.isFinite(t)) { bad('lacks a number on a host'); continue; }
        if (m[2] === '') {
          if (v !== s || v !== t) bad(`is exact but the hosts say ${s} and ${t}`);
          if (still) bad(`is exact but his last season is ${p.lastSeason}, so he may still play`);
        } else {
          const want = Math.floor(Math.min(s, t) / 100) * 100;
          if (v !== want) bad(`should be the floor ${want} of the lower value (${s}, ${t})`);
          if (!still && s === t) bad('is a floor though he is retired and the hosts agree, so it should be exact');
        }
      } else if (f.field === 'award') {
        const m = f.line.match(/^(?:(\d+)× )?(.+?)(?: \((\d{4})\))?$/);
        if (!m || AWARD_LABEL[f.award] !== m[2]) { bad(`is not a ${f.award} line`); continue; }
        const count = m[1] ? Number(m[1]) : 1;
        if (m[1] && count < 2) bad('writes a count of one');
        if (count !== Number(f.official) || count !== Number(f.second)) bad(`counts ${count}, nba.com ${f.official}, basketball-reference ${f.second}`);
        if (m[3]) {
          const y = Number(m[3]);
          if (count !== 1 || !YEAR_OK.has(f.award)) bad('shows a year the rule does not allow');
          const sm = String(f.secondSeason).match(/^(\d{4})-(\d{2}) /);
          const end = sm ? (sm[2] === '00' ? Number(sm[1]) + 1 : Number(sm[1].slice(0, 2) + sm[2])) : NaN;
          if (end !== y) bad(`basketball-reference season is ${f.secondSeason}`);
          if (JSON.stringify(f.third) !== JSON.stringify([y])) bad(`ESPN season is ${JSON.stringify(f.third)}`);
        }
      }
    }
  }
  console.log(`  ${checked} facts derived from their source values`);
}

// ---------------------------------------------------------------------------
const { nbaCareerPuzzles } = await loadModule(DATA, dataText);
const { dailyIndex, dayNumber } = await loadModule(DATES);
head(3, 'the shipped file equals the record, row by row, both ways');
{
  if (nbaCareerPuzzles.length !== players.length) fail(`the file has ${nbaCareerPuzzles.length} rows, the record ${players.length}`);
  const n = Math.max(nbaCareerPuzzles.length, players.length);
  let same = 0;
  for (let i = 0; i < n; i++) {
    const row = nbaCareerPuzzles[i]; const rec = players[i];
    if (!row || !rec) { fail(`row ${i} exists on one side only`); continue; }
    const got = row.player;
    const want = {
      name: rec.name, position: rec.position, country: rec.country, countryFlag: flagOf(rec.countryIso),
      draftInfo: rec.draftInfo, teams: rec.teams, stats: rec.stats, awards: rec.awards,
    };
    const diffs = [];
    if (row.id !== rec.id) diffs.push(`id ${row.id} vs ${rec.id}`);
    for (const k of Object.keys(want)) if (JSON.stringify(got[k]) !== JSON.stringify(want[k])) diffs.push(`${k} ${JSON.stringify(got[k])} vs ${JSON.stringify(want[k])}`);
    const extra = Object.keys(got).filter((k) => !(k in want));
    if (extra.length) diffs.push(`fields the record does not hold: ${extra.join(', ')}`);
    if (diffs.length) fail(`row ${i} (${rec.name}): ${diffs.join('; ')}`); else same += 1;
  }
  console.log(`  ${same} of ${players.length} rows equal the record`);
}

// ---------------------------------------------------------------------------
head(4, 'no repeats: ids, names, and the guesses the game accepts');
{
  const ruleText = "normalized === target || normalized === target.split(' ').pop()";
  if (!hookText.includes(ruleText)) fail(`the guess rule in ${HOOK} is not "${ruleText}" any more; recheck which guesses can collide and update this section`);
  const ids = nbaCareerPuzzles.map((r) => r.id);
  for (const id of ids) if (!/^nbac-\d{3}$/.test(id)) fail(`id ${id} is not nbac-NNN`);
  const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dupIds.length) fail(`repeated ids: ${dupIds.join(', ')}`);
  const names = nbaCareerPuzzles.map((r) => fold(r.player.name));
  const dupNames = names.filter((x, i) => names.indexOf(x) !== i);
  if (dupNames.length) fail(`repeated players: ${dupNames.join(', ')}`);
  // the hook takes the full name or its last word, lowercased
  const owner = new Map();
  for (const r of nbaCareerPuzzles) {
    const full = r.player.name.toLowerCase();
    for (const g of new Set([full, full.split(' ').pop()])) {
      const prev = owner.get(fold(g));
      if (prev && prev !== r.player.name) fail(`the guess '${g}' is taken by both ${prev} and ${r.player.name}`);
      owner.set(fold(g), r.player.name);
    }
  }
  console.log(`  ${ids.length} ids, ${new Set(names).size} distinct players, ${owner.size} distinct guesses`);
}

// ---------------------------------------------------------------------------
head(5, 'no removed line ships on its player, no held out player ships');
{
  let n = 0;
  for (const r of record.removedLines) {
    const row = nbaCareerPuzzles.find((x) => fold(x.player.name) === fold(r.name));
    if (!row) { fail(`removed line for ${r.name}, who is not in the file`); continue; }
    const p = row.player;
    const shown = { position: [p.position], country: [p.country], draftInfo: [p.draftInfo], teams: [p.teams.join(' > ')], stats: p.stats, awards: p.awards }[r.field];
    if (!shown) { fail(`removed line for ${r.name} names an unknown field ${r.field}`); continue; }
    if (shown.includes(r.line)) fail(`${r.name} ships the removed ${r.field} line '${r.line}' (${r.kind})`);
    n += 1;
  }
  for (const h of record.heldOut) {
    if (nbaCareerPuzzles.some((x) => fold(x.player.name) === fold(h.name))) fail(`${h.name} is held out but in the file`);
  }
  console.log(`  ${n} removed lines absent, ${record.heldOut.length} held out player absent`);
}

// ---------------------------------------------------------------------------
head(6, 'the daily walk: full cycles, fewer quick repeats, and a safe release window');
{
  const iso = (d) => new Date(d * 86400000).toISOString().slice(0, 10);
  const pool = nbaCareerPuzzles;
  const SIZE = pool.length;
  // the baseline: the old 20 row pool, which was the ids nbac-001 to nbac-020 in id order
  const oldNames = players.filter((p) => Number(p.id.slice(5)) <= 20).sort((a, b) => a.id.localeCompare(b.id)).map((p) => p.name);
  if (oldNames.length !== 20) fail(`the record holds ${oldNames.length} old rows, not 20`);
  const oldSet = new Set(oldNames);
  const oldAt = (d) => oldNames[dailyIndex(iso(d), 20)];
  const newAt = (d) => pool[dailyIndex(iso(d), SIZE)].player.name;
  // (a) every whole cycle from 2026 to 2028 deals every player once
  const first = dayNumber('2026-01-01'), last = dayNumber('2028-12-31');
  let cycles = 0;
  for (let c = Math.ceil(first / SIZE); (c + 1) * SIZE - 1 <= last; c++) {
    const seen = new Set();
    for (let d = c * SIZE; d < (c + 1) * SIZE; d++) seen.add(newAt(d));
    if (seen.size !== SIZE) fail(`cycle ${c} (${iso(c * SIZE)}) deals ${seen.size} players, not ${SIZE}`);
    cycles += 1;
  }
  console.log(`  ${cycles} whole cycles of ${SIZE} days from 2026 to 2028`);
  // (b) quick repeats per calendar year, the old pool as the baseline
  const repeats = (at, y) => {
    let n = 0;
    for (let d = dayNumber(`${y}-01-01`); d <= dayNumber(`${y}-12-31`); d++) {
      for (let k = 1; k < 14; k++) if (at(d - k) === at(d)) { n += 1; break; }
    }
    return n;
  };
  for (const y of [2026, 2027, 2028]) {
    const o = repeats(oldAt, y), w = repeats(newAt, y);
    console.log(`  ${y}: a player back inside 14 days, old pool ${o} times, new pool ${w}`);
    if (!(w * 2 <= o)) fail(`${y}: the new pool repeats inside 14 days ${w} times, not at most half the old pool's ${o}`);
  }
  // (c) a release on any day of the window: new players first, and a gap for the old ones
  const gapAt = (R) => {
    let min = Infinity, who = '';
    for (const name of oldNames) {
      let lastOld = null; for (let d = R - 1; d >= R - 60; d--) if (oldAt(d) === name) { lastOld = d; break; }
      let firstNew = null; for (let d = R; d <= R + 400; d++) if (newAt(d) === name) { firstNew = d; break; }
      if (lastOld !== null && firstNew !== null && firstNew - lastOld < min) { min = firstNew - lastOld; who = name; }
    }
    let run = 0; while (run < 400 && !oldSet.has(newAt(R + run))) run += 1;
    return { min, who, run };
  };
  const from = dayNumber('2026-10-04'), to = dayNumber(record.releaseBy);
  if (!(to >= from)) fail(`releaseBy ${record.releaseBy} is before the window opens`);
  let worstGap = { min: Infinity }, worstRun = { run: Infinity };
  for (let R = from; R <= to; R++) {
    const g = gapAt(R);
    if (g.min < 14) fail(`a release on ${iso(R)} deals ${g.who} ${g.min} days after the old pool did`);
    if (g.run < 7) fail(`a release on ${iso(R)} deals an old player within ${g.run} days`);
    if (g.min < worstGap.min) worstGap = { ...g, R };
    if (g.run < worstRun.run) worstRun = { ...g, R };
  }
  if (Number.isFinite(worstGap.min)) console.log(`  window 2026-10-04 to ${record.releaseBy}: shortest old to new gap ${worstGap.min} days (${worstGap.who}, release ${iso(worstGap.R)}), shortest run of new players ${worstRun.run} days (release ${iso(worstRun.R)})`);
  // (d) the day after releaseBy breaks the 14 days, so releaseBy is the real deadline
  const after = gapAt(to + 1);
  console.log(`  a release on ${iso(to + 1)}: ${after.who} comes back after ${after.min} days`);
  if (!(after.min < 14)) fail(`a release on ${iso(to + 1)} still keeps 14 days (${after.min}), so releaseBy ${record.releaseBy} is not the deadline; move it later`);
}

// ---------------------------------------------------------------------------
fs.rmSync(TMP, { recursive: true, force: true });
const redList = [...red].sort((a, b) => a - b);
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const exact = JSON.stringify(redList) === JSON.stringify(want);
  console.log(`\nCONTROL ${CONTROL}: red sections [${redList.join(', ')}], expected [${want.join(', ')}]: ${exact ? 'CAUGHT' : 'NOT AS PREDICTED'}`);
  process.exit(exact ? 1 : 2);
}
console.log(`\nsimNbaCareerPathFacts: ${failures === 0 ? 'PASS' : `FAIL (${failures} failures in sections ${redList.join(', ')})`}`);
process.exit(failures === 0 ? 0 : 1);
