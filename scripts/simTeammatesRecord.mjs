/**
 * simTeammatesRecord: every Teammates or Not row, held against its record.
 *
 * WHY THIS EXISTS. Round 921. The 50 pair bank in src/data/teammatesPairs.ts
 * told a player who answered correctly that he was wrong (Doncic and Davis
 * were traded FOR each other, the row said they were Lakers teammates), and
 * at least six other funFacts stated things that were not so: a Super Bowl
 * Kansas City lost, a Spurs season that was not Wembanyama's rookie year, a
 * Pelicans pairing that ended a year before the row said. The harness it
 * replaces, simTeammatesPairs, could not adjudicate a single NBA or NFL row
 * and said so in its own header.
 *
 * THE RECORD. scripts/data/teammatesVerified2026-10.json holds, for every
 * player named in a verified row, his team by season as read from TWO hosts
 * (NBA basketball-reference and ESPN, NFL nfl.com and ESPN, MLB statsapi.mlb
 * and baseball-reference, NHL api-web.nhle and hockey-reference), each with
 * its URL and read date. Nothing in this file reaches the network: it reads
 * the record and the shipped file and nothing else.
 *
 * THE RULE, which is the whole design. The answer is DERIVED, never typed.
 * On each host separately the two careers either share a team in a season
 * where neither man split his year between clubs (a clean season: they were
 * teammates), share nothing at all (never teammates), or share only a split
 * season (the tables cannot tell; the Doncic and Davis trade is exactly
 * that). The two hosts must agree, the shipped answer must equal what they
 * agree on, and an undecided pair needs an adjudication in the record with
 * every fact on two hosts. Then every claim a funFact makes (a span, a count,
 * a split season, a team never played for) is recomputed on both hosts, and
 * every year and every "N seasons" in the text must be one a claim declares,
 * every club nickname in the text must be one a claim or adjudication of the
 * row names (and every claimed team must be named), and every title, numbered
 * Super Bowl or score must be stated word for word by an adjudication of the
 * row. A funFact cannot carry a number or a team nobody checked.
 *
 * THE REVEAL (section 10). The record settles club and league teams only, so
 * the NO reveal on the page must name the league ("NEVER NBA teammates",
 * "club" for soccer) and no line on the page may deny teammates unscoped.
 *
 * LEGACY. 15 soccer rows predate this record and are not verified by it.
 * They get the structural checks, a pinned answer each (section 4), the count
 * is a ratchet that can only fall, and the live soccer_player_club_stints
 * check that used to cover ten
 * of them is kept below as section 9, opt in (TEAMMATES_LIVE=1), because it
 * reads the production database and only the lead runs that, once a release.
 *
 * BANDS (section 8), measured 2026-10-02 over seeds 1 to 12, 400 pairs of
 * runs per seed: the numbers sit beside the constant. Never a max.
 *
 * CONTROLS (TEAMMATES_CONTROL=...). Each must make EXACTLY the sections
 * listed fire, no fewer and no more (the EXPECT table at the bottom says why
 * each extra one fires); a control that fires exits 0, one that does not
 * exits 1, and a stale control that finds nothing to mutate exits 2:
 *   fileflip       one answer flipped in the shipped file only        -> 1 3 5
 *   recordflip     the same answer flipped in file AND record         -> 1 5
 *   hostgap        one season deleted from one host of one player     -> 5 6
 *   onesource      one player's second source deleted                 -> 4 5 6
 *   wrongclaim     a claim's span end moved a season                  -> 6 7
 *   wrongyear      a funFact year changed in file and record          -> 7
 *   dupe           the same pairing twice                             -> 2 3 8
 *   thindeal       every easy row moved to medium                     -> 8
 *   smallbank      the deal drawn from the old bank's 12/12/26 shape  -> 8r (repeat ceiling)
 *   spellgap       a spell claim cut a season short                   -> 6 7
 *   longdash       a long dash typed into one shipped funFact         -> 1 3
 *   shortdeal      the hook deals 3 hard cards, 9 in a 10 card game   -> 8
 *   widepool       the hook's hard pile also takes medium rows        -> 8
 *   unscopedbanner the NO reveal back to a bare "NEVER teammates"     -> 10
 *   legacypin      Ronaldo and Messi flipped to YES, funFact too      -> 4
 *   legacyflip     the same flip with the denial left in              -> 1 4
 *   extrateam      "the Vikings" added to Rodgers' teams              -> 7
 *   superbowl      "Super Bowl LVI" moved to LVII in file and record  -> 7
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TEAMMATES_CONTROL || '';
const FILE = 'src/data/teammatesPairs.ts';
const RECORD = 'scripts/data/teammatesVerified2026-10.json';
const HOOK = 'src/hooks/useTeammates.ts';
const GUIDE = 'src/data/gameContent/world.ts';
const PAGE = 'src/pages/Teammates.tsx';

let failures = 0;
const fired = new Set();
const fail = (n, msg) => { fired.add(n); if (failures < 60) console.error('  FAIL: ' + msg); failures += 1; };

const rewrite = (text, from, to, what, all = false) => {
  if (!text.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} not found.`);
    console.error('The control is stale, so this run would have been green for the wrong reason.');
    process.exit(2);
  }
  return all ? text.split(from).join(to) : text.replace(from, to);
};

// line endings flattened so a Windows checkout and a Linux one read alike
let src = fs.readFileSync(path.join(ROOT, FILE), 'utf8').replace(/\r\n/g, '\n');
let rec = fs.readFileSync(path.join(ROOT, RECORD), 'utf8').replace(/\r\n/g, '\n');
const GARNETT = `player1: "Kevin Garnett", player2: "Ray Allen", sport: "NBA", answer: true`;
const GARNETT_REC = `"player1":"Kevin Garnett","player2":"Ray Allen","sport":"NBA","answer":true`;
if (CONTROL === 'fileflip') src = rewrite(src, GARNETT, GARNETT.replace('true', 'false'), 'the Garnett and Allen row');
if (CONTROL === 'longdash') src = rewrite(src, 'funFact: "Celtics teammates for five seasons, ', `funFact: "Celtics teammates for five seasons ${String.fromCharCode(0x2014)} `, "the Garnett and Allen funFact's comma");
if (CONTROL === 'recordflip') {
  src = rewrite(src, GARNETT, GARNETT.replace('true', 'false'), 'the Garnett and Allen row');
  rec = rewrite(rec, GARNETT_REC, GARNETT_REC.replace('true', 'false'), 'the Garnett and Allen record row');
}
// the whole line of the record holding a player's second host
const secondHostLine = name => {
  const at = rec.indexOf(`"${name}": { "sources"`);
  if (at < 0) return '\u0000missing';
  const i = rec.indexOf('"host":"www.espn.com"', at);
  return rec.slice(rec.lastIndexOf('\n', i) + 1, rec.indexOf('\n', i));
};
if (CONTROL === 'hostgap') {
  // Shaquille O'Neal's one Cavaliers season, gone from the second host only
  const line = secondHostLine("NBA|Shaquille O'Neal");
  rec = rewrite(rec, line, line.replace(/,?"2009-10"/, ''), "Shaquille O'Neal's second host line");
}
if (CONTROL === 'onesource') rec = rewrite(rec, ',\n' + secondHostLine('NBA|Ray Allen'), '', "Ray Allen's second source");
if (CONTROL === 'wrongclaim') rec = rewrite(rec, `"team":"Boston Celtics","first":"2007-08","last":"2011-12"`, `"team":"Boston Celtics","first":"2007-08","last":"2012-13"`, 'the Celtics claim');
if (CONTROL === 'wrongyear') {
  src = rewrite(src, 'Celtics teammates for five seasons, 2007-08 through 2011-12.', 'Celtics teammates for five seasons, 2007-08 through 2010-11.', 'the Celtics funFact');
  rec = rewrite(rec, 'Celtics teammates for five seasons, 2007-08 through 2011-12.', 'Celtics teammates for five seasons, 2007-08 through 2010-11.', 'the Celtics record funFact');
}
if (CONTROL === 'dupe') {
  src = rewrite(src, '  // MEDIUM (difficulty 2), less obvious',
    `  { player1: "Ray Allen", player2: "Kevin Garnett", sport: "NBA", answer: true, funFact: "Celtics teammates.", difficulty: 2 },\n  // MEDIUM (difficulty 2), less obvious`, 'the medium difficulty comment');
}
if (CONTROL === 'spellgap') rec = rewrite(rec, '{"t":"spell","team":"Seattle Seahawks","first":"2012","last":"2015"}', '{"t":"spell","team":"Seattle Seahawks","first":"2012","last":"2014"}', 'the Seahawks spell claim');
/* the reviewer's mutation M4, in file AND record, with the denial in the
   funFact rewritten too so that section 1 cannot be what catches it */
const RONALDO_MESSI = 'Despite being the greatest rivals, they never played on the same club team.';
const RONALDO_MESSI_YES = 'Despite being the greatest rivals, they were Juventus teammates.';
if (CONTROL === 'legacypin') {
  src = rewrite(src, `answer: false, funFact: "${RONALDO_MESSI}"`, `answer: true, funFact: "${RONALDO_MESSI_YES}"`, 'the Ronaldo and Messi row');
  rec = rewrite(rec, `"answer":false,"funFact":"${RONALDO_MESSI}"`, `"answer":true,"funFact":"${RONALDO_MESSI_YES}"`, 'the Ronaldo and Messi record row');
}
/* the same flip with the funFact left alone: section 1's scoped shapes catch it */
if (CONTROL === 'legacyflip') {
  src = rewrite(src, `answer: false, funFact: "${RONALDO_MESSI}"`, `answer: true, funFact: "${RONALDO_MESSI}"`, 'the Ronaldo and Messi row');
  rec = rewrite(rec, `"answer":false,"funFact":"${RONALDO_MESSI}"`, `"answer":true,"funFact":"${RONALDO_MESSI}"`, 'the Ronaldo and Messi record row');
}
/* the reviewers' mutations M1 and M2, each in file AND record: a team Rodgers
   never played for, and the Super Bowl numeral moved one game on */
const both = (from, to, what) => { src = rewrite(src, from, to, what); rec = rewrite(rec, from, to, `${what} in the record`); };
if (CONTROL === 'extrateam') both('Rodgers for the Packers, the Jets and the Steelers', 'Rodgers for the Packers, the Vikings, the Jets and the Steelers', "the Manning and Rodgers funFact");
if (CONTROL === 'superbowl') both('the Super Bowl LVI win', 'the Super Bowl LVII win', "the Miller and Beckham funFact");
if (CONTROL === 'thindeal') {
  src = rewrite(src, 'difficulty: 1 }', 'difficulty: 2 }', 'an easy row', true);
  rec = rewrite(rec, '"difficulty":1,', '"difficulty":2,', 'an easy record row', true);
}

const record = JSON.parse(rec);
const body = src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
const rows = [];
for (const m of body.matchAll(/\{\s*player1:\s*"((?:[^"\\]|\\.)*)",\s*player2:\s*"((?:[^"\\]|\\.)*)",\s*sport:\s*"([^"]*)",\s*answer:\s*(true|false),\s*funFact:\s*"((?:[^"\\]|\\.)*)",\s*difficulty:\s*(\d+)\s*\}/g)) {
  const un = s => s.replace(/\\(.)/g, '$1');
  rows.push({ p1: un(m[1]), p2: un(m[2]), sport: m[3], answer: m[4] === 'true', funFact: un(m[5]), difficulty: Number(m[6]) });
}
const objects = (body.match(/\{\s*player1:/g) || []).length;
console.log(`Parsed ${rows.length} pairs from ${FILE} (${objects} row objects in the file)`);
if (rows.length !== objects) fail(1, `the file has ${objects} row objects but only ${rows.length} parse, so ${objects - rows.length} rows would escape every check below`);

const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pairKey = r => `${r.sport}|${[r.p1, r.p2].sort().join(' + ')}`;

// ---------------------------------------------------------------------------
console.log('\n--- 1. a pair is two different people, with a real sport and difficulty ---');
const SPORTS = new Set(['NBA', 'NFL', 'Soccer', 'MLB', 'NHL']);
/* lifted from simTeammatesPairs section 1, which this file replaces: find the
   clauses that assert they played together and check the sign against the
   answer, rather than demanding a keyword a good row may not use */
/* the last two shapes are the scoped ones Round 921 writes ("Never NBA
   teammates", "never played on the same club team"): without them a legacy
   NO row flipped to YES kept its denial and passed */
const TOGETHER = /(both (played|were)|played together|were teammates|became .{0,20}teammates|teammates (on|from|since|in|for)|\b(club|NBA|NFL|MLB|NHL) teammates\b|on the same (club |NBA |NFL |MLB |NHL |major league )?team\b)/i;
const NEGATED = /\b(never|not|no longer|n't)\b/i;
for (const r of rows) {
  if (r.p1 === r.p2) fail(1, `${r.p1} is paired with himself`);
  if (!SPORTS.has(r.sport)) fail(1, `${r.p1} and ${r.p2} are filed under "${r.sport}"`);
  if (r.difficulty < 1 || r.difficulty > 3) fail(1, `${r.p1} and ${r.p2} have difficulty ${r.difficulty}`);
  if (!r.funFact.trim()) fail(1, `${r.p1} and ${r.p2} have no funFact`);
  if (new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`).test(r.funFact)) fail(1, `${r.p1} and ${r.p2}: the funFact carries a long dash, which the site never uses`);
  for (const clause of r.funFact.split(/[.;:!?]/)) {
    if (!TOGETHER.test(clause)) continue;
    const negated = NEGATED.test(clause);
    if (!r.answer && !negated) fail(1, `${r.p1} and ${r.p2} answer false, but the funFact states they played together: "${clause.trim()}"`);
    if (r.answer && negated) fail(1, `${r.p1} and ${r.p2} answer true, but the funFact denies they played together: "${clause.trim()}"`);
  }
}
console.log(`  ${rows.length} pairs checked`);

// ---------------------------------------------------------------------------
console.log('\n--- 2. no pairing appears twice, in either order ---');
const seen = new Set();
for (const r of rows) {
  if (seen.has(pairKey(r))) fail(2, `${pairKey(r)} appears twice, so one puzzle can be drawn as two`);
  seen.add(pairKey(r));
}
console.log(`  ${seen.size} distinct pairings`);

// ---------------------------------------------------------------------------
console.log(`\n--- 3. the shipped file says exactly what ${RECORD} says ---`);
const recRows = new Map();
for (const r of record.rows) {
  const k = pairKey({ p1: r.player1, p2: r.player2, sport: r.sport });
  if (recRows.has(k)) fail(3, `${k} is in the record twice`);
  recRows.set(k, r);
}
let matched = 0;
for (const r of rows) {
  const x = recRows.get(pairKey(r));
  if (!x) { fail(3, `${pairKey(r)} ships with no row in the record, so nothing behind it was checked`); continue; }
  const diffs = [];
  if (x.player1 !== r.p1 || x.player2 !== r.p2) diffs.push('player order');
  if (x.answer !== r.answer) diffs.push(`answer (file ${r.answer}, record ${x.answer})`);
  if (x.funFact !== r.funFact) diffs.push('funFact text');
  if (x.difficulty !== r.difficulty) diffs.push('difficulty');
  if (diffs.length) fail(3, `${pairKey(r)} differs from its record in ${diffs.join(', ')}`);
  else matched += 1;
}
const shipped = new Set(rows.map(pairKey));
for (const k of recRows.keys()) if (!shipped.has(k)) fail(3, `${k} is in the record but not shipped`);
console.log(`  ${matched} of ${rows.length} rows match their record word for word`);

// ---------------------------------------------------------------------------
console.log('\n--- 4. every verified player and every adjudicated fact stands on two hosts ---');
const LEGACY_CEILING = 15; /* the soccer rows kept from before Round 921; this may only fall */
const BANNED_HOST = /wiki/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const checkSources = (what, sources) => {
  const list = sources || [];
  const hosts = new Set(list.map(s => s.host));
  if (list.length < 2 || hosts.size < 2) fail(4, `${what} stands on ${hosts.size} host(s), not two`);
  for (const s of list) {
    if (!s.host || BANNED_HOST.test(s.host) || BANNED_HOST.test(s.url || '')) fail(4, `${what}: "${s.host}" is not a source this record accepts`);
    if (!/^https:\/\//.test(s.url || '')) fail(4, `${what}: a source on ${s.host} has no URL`);
    if (!DATE.test(s.read || '')) fail(4, `${what}: a source on ${s.host} has no read date`);
  }
};
const players = record.players || {};
for (const [k, p] of Object.entries(players)) {
  checkSources(k, p.sources);
  const name = k.split('|')[1];
  for (const s of p.sources || []) {
    /* the page read must be this man's: a suffix the host adds is fine */
    const on = fold(s.nameOnPage || '').replace(/ (jr|sr|ii|iii)$/, '').replace(/ /g, '');
    if (on !== fold(name).replace(/ (jr|sr|ii|iii)$/, '').replace(/ /g, '')) fail(4, `${k}: the page read on ${s.host} is "${s.nameOnPage}"`);
    if (!s.teams || !Object.keys(s.teams).length) fail(4, `${k}: ${s.host} carries no seasons`);
  }
}
const adjudications = record.adjudications || {};
for (const [k, a] of Object.entries(adjudications)) {
  if (typeof a.verdict !== 'boolean' || !(a.facts || []).length) fail(4, `adjudication ${k} has no verdict or no facts`);
  for (const f of a.facts || []) checkSources(`adjudication ${k}, "${f.says}"`, f.sources);
}
const legacy = rows.filter(r => recRows.get(pairKey(r))?.legacy);
for (const r of legacy) if (r.sport !== 'Soccer') fail(4, `${pairKey(r)} is marked legacy, and only the old soccer rows may be`);
/* A legacy row has no hosts behind it, so sections 5 to 7 cannot derive its
   answer and a flip made in the file AND the record used to ship green. Each
   answer is pinned here as it shipped before Round 921 (two of them spot
   checked by review on 2026-10-02 and all fifteen standing since the old
   harness's live table check). A pin is a fence, not a verification: a row
   leaves this list only when it is verified into the record, and a legacy row
   with no pin, or one that disagrees with its pin, fails. */
const LEGACY_ANSWERS = {
  'Soccer|Lionel Messi + Neymar': true,
  'Soccer|Cristiano Ronaldo + Lionel Messi': false,
  'Soccer|David Beckham + Zlatan Ibrahimovic': true,
  'Soccer|Lionel Messi + Thierry Henry': true,
  'Soccer|Robin van Persie + Wayne Rooney': true,
  'Soccer|Lionel Messi + Sergio Ramos': true,
  'Soccer|Andrea Pirlo + David Villa': true,
  'Soccer|Andrea Pirlo + Frank Lampard': true,
  'Soccer|Cristiano Ronaldo + Ronaldinho': false,
  'Soccer|Pierre-Emerick Aubameyang + Robert Lewandowski': true,
  'Soccer|Kylian Mbappé + Neymar': true,
  'Soccer|Eden Hazard + Kevin De Bruyne': true,
  'Soccer|Cristiano Ronaldo + Karim Benzema': true,
  'Soccer|Kylian Mbappé + Vinícius Jr.': true,
  'Soccer|Erling Haaland + Jude Bellingham': true,
};
for (const r of legacy) {
  const pin = LEGACY_ANSWERS[pairKey(r)];
  if (pin === undefined) fail(4, `${pairKey(r)} is a legacy row with no pinned answer, so a flip in file and record would ship unseen`);
  else if (pin !== r.answer) fail(4, `${pairKey(r)} ships answer ${r.answer} against its pinned ${pin}: a legacy answer changed with nothing verified behind it`);
}
if (legacy.length > LEGACY_CEILING) fail(4, `${legacy.length} legacy rows against a ceiling of ${LEGACY_CEILING}: a new row went in unverified`);
console.log(`  ${Object.keys(players).length} players and ${Object.keys(adjudications).length} adjudications checked; ${legacy.length} legacy soccer rows (ceiling ${LEGACY_CEILING})`);

// ---------------------------------------------------------------------------
console.log('\n--- 5. the answer is derived from the two hosts, never typed ---');
const seasonsOf = (p, i) => {
  const out = [];
  for (const [team, ss] of Object.entries(p.sources[i].teams)) for (const season of ss) out.push({ team, season });
  return out;
};
const teamsIn = (stints, season) => new Set(stints.filter(s => s.season === season).map(s => s.team));
/* on host i: 'yes' when they share a team in a season neither split, 'no'
   when they share nothing, 'split' when all they share is a split season */
const verdictOn = (a, b, i) => {
  const A = seasonsOf(a, i), B = seasonsOf(b, i);
  let shared = 0, clean = 0;
  for (const x of A) for (const y of B) {
    if (x.season !== y.season || x.team !== y.team) continue;
    shared += 1;
    if (teamsIn(A, x.season).size === 1 && teamsIn(B, x.season).size === 1) clean += 1;
  }
  return clean ? 'yes' : shared ? 'split' : 'no';
};
let derived = 0, byAdjudication = 0;
for (const r of rows) {
  const x = recRows.get(pairKey(r));
  if (!x || x.legacy) continue;
  const a = players[`${r.sport}|${r.p1}`], b = players[`${r.sport}|${r.p2}`];
  const adj = adjudications[pairKey(r)];
  let verdict;
  if (a && b && a.sources?.length >= 2 && b.sources?.length >= 2) {
    const v = [0, 1].map(i => verdictOn(a, b, i));
    if (v[0] !== v[1]) { fail(5, `${pairKey(r)}: the hosts disagree (${a.sources[0].host} says ${v[0]}, ${b.sources[1].host} says ${v[1]}), so the row has to be held out or settled`); continue; }
    if (v[0] === 'split') {
      if (!adj) { fail(5, `${pairKey(r)}: they only share a season both men split, which the tables cannot settle, and there is no adjudication`); continue; }
      verdict = adj.verdict; byAdjudication += 1;
    } else {
      verdict = v[0] === 'yes';
      if (adj && adj.verdict !== verdict) fail(5, `${pairKey(r)}: an adjudication says ${adj.verdict} against two hosts that say ${verdict}`);
      derived += 1;
    }
  } else if (adj) { verdict = adj.verdict; byAdjudication += 1; }
  else { fail(5, `${pairKey(r)}: neither player records nor an adjudication stand behind this row`); continue; }
  if (verdict !== r.answer) fail(5, `${pairKey(r)} ships answer ${r.answer}, but the record says ${verdict}: a player answering correctly is told he is wrong`);
}
console.log(`  ${derived} answers derived from both hosts, ${byAdjudication} settled by adjudication`);

// ---------------------------------------------------------------------------
console.log('\n--- 6. every claim a funFact rests on holds on both hosts ---');
/* A claim names a team the way a reader would ("Miami Heat"). Each host keys
   teams its own way: a full name, a three letter code (resolved through the
   record's teamCodes), or a franchise id whose printed names are kept beside
   it. A label resolves to every key on that host that prints as it, across
   every player in the record, so "never played for the Spurs" can be asked of
   a man the Spurs never had. A label that resolves to nothing fails, because
   a check that cannot find its team checks nothing. */
const labelKeys = (sport, i, label) => {
  const keys = new Set();
  const codes = (record.teamCodes || {})[sport] || {};
  for (const [k, p] of Object.entries(players)) {
    if (!k.startsWith(sport + '|') || !p.sources?.[i]) continue;
    const s = p.sources[i];
    for (const t of Object.keys(s.teams)) {
      if (t === label || codes[t] === label || (s.names || {})[t] === label) keys.add(t);
    }
  }
  return keys;
};
/* season arithmetic on the record's two label shapes, "2015" and "2015-16" */
const shiftSeason = (s, d) => {
  const m = String(s).match(/^(\d{4})(-\d{2})?$/);
  if (!m) return '';
  const y = Number(m[1]) + d;
  return m[2] ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : String(y);
};
const nextSeason = s => shiftSeason(s, 1), prevSeason = s => shiftSeason(s, -1);
const onKeys = (p, i, keys) => [...new Set(seasonsOf(p, i).filter(s => keys.has(s.team)).map(s => s.season))].sort();
const careerFirst = (p, i) => seasonsOf(p, i).map(s => s.season).sort()[0];
let claimsChecked = 0;
const spanCheck = (what, ss, c) => {
  if (!ss.length) return `${what}: no season at all`;
  if (c.first && ss[0] !== c.first) return `${what}: first season is ${ss[0]}, not ${c.first}`;
  if (c.last && ss[ss.length - 1] !== c.last) return `${what}: last season is ${ss[ss.length - 1]}, not ${c.last}`;
  if (c.seasons && ss.length !== c.seasons) return `${what}: ${ss.length} seasons, not ${c.seasons}`;
  return '';
};
for (const r of rows) {
  const x = recRows.get(pairKey(r));
  if (!x || x.legacy) continue;
  for (const c of x.claims || []) {
    claimsChecked += 1;
    if (c.t === 'adjudicated') {
      if (!adjudications[pairKey(r)]) fail(6, `${pairKey(r)} claims an adjudication the record does not hold`);
      continue;
    }
    const subject = c.player ? players[`${r.sport}|${c.player}`] : null;
    if (c.player && (!subject || ![r.p1, r.p2].includes(c.player))) { fail(6, `${pairKey(r)}: a claim about "${c.player}", who is not in this row's record`); continue; }
    for (const i of [0, 1]) {
      /* a missing host is section 4's failure; here it only means this host
         cannot be asked, which must not crash the sections after it */
      if ([r.p1, r.p2].some(n => !players[`${r.sport}|${n}`]?.sources?.[i])) { fail(6, `${pairKey(r)}: host ${i + 1} is missing for a player, so its claims cannot be checked there`); continue; }
      const host = (subject || players[`${r.sport}|${r.p1}`])?.sources?.[i]?.host;
      const tag = `${pairKey(r)} on ${host}`;
      const keys = c.team ? labelKeys(r.sport, i, c.team) : new Set();
      if (c.team && !keys.size) { fail(6, `${tag}: no key prints as "${c.team}"`); continue; }
      let err = '';
      if (c.t === 'together') {
        const a = players[`${r.sport}|${r.p1}`], b = players[`${r.sport}|${r.p2}`];
        const sa = new Set(onKeys(a, i, keys));
        err = spanCheck(`${c.team} together`, onKeys(b, i, keys).filter(s => sa.has(s)), c);
      } else if (c.t === 'spell') {
        /* one unbroken run of shared seasons: first to last with no gap, and
           not shared the season either side, so "from 2012 through 2015" is
           exactly that and not the first half of something longer */
        const a = players[`${r.sport}|${r.p1}`], b = players[`${r.sport}|${r.p2}`];
        const sa = new Set(onKeys(a, i, keys)), shared = new Set(onKeys(b, i, keys).filter(s => sa.has(s)));
        const run = [];
        for (let s = c.first; s && run.length < 40; s = nextSeason(s)) { run.push(s); if (s === c.last) break; }
        if (run[run.length - 1] !== c.last) err = `${c.team} spell ${c.first} to ${c.last} is not a run of seasons`;
        else if (run.some(s => !shared.has(s))) err = `${c.team}: not together in every season from ${c.first} to ${c.last}`;
        else if (shared.has(prevSeason(c.first)) || shared.has(nextSeason(c.last))) err = `${c.team}: the run from ${c.first} to ${c.last} is longer than the claim says`;
        else if (c.seasons && run.length !== c.seasons) err = `${c.team}: ${run.length} seasons, not ${c.seasons}`;
      } else if (c.t === 'stint') {
        const ss = onKeys(subject, i, keys);
        err = spanCheck(`${c.player} at ${c.team}`, ss, c);
        if (!err && c.only && seasonsOf(subject, i).some(s => !keys.has(s.team))) err = `${c.player} also played for another team`;
      } else if (c.t === 'debut') {
        if (careerFirst(subject, i) !== c.first) err = `${c.player}'s first season is ${careerFirst(subject, i)}, not ${c.first}`;
      } else if (c.t === 'final') {
        const last = seasonsOf(subject, i).map(s => s.season).sort().pop();
        if (last !== c.last) err = `${c.player}'s last season is ${last}, not ${c.last}`;
      } else if (c.t === 'never') {
        if (onKeys(subject, i, keys).length) err = `${c.player} did play for ${c.team}`;
      } else if (c.t === 'split') {
        if (teamsIn(seasonsOf(subject, i), c.season).size < 2) err = `${c.player} did not split ${c.season} between teams`;
      } else if (c.t === 'absent') {
        if (seasonsOf(subject, i).some(s => s.season === c.season)) err = `${c.player} has games in ${c.season}`;
      } else err = `unknown claim type "${c.t}"`;
      if (err) fail(6, `${tag}: ${err}`);
    }
  }
}
console.log(`  ${claimsChecked} claims checked on both hosts`);

// ---------------------------------------------------------------------------
console.log('\n--- 7. every year, count and team in a funFact is one a claim declares ---');
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const COUNT = new RegExp(`\\b(${Object.keys(WORDS).join('|')}|\\d{1,2})( straight)? (seasons?|years?)\\b`, 'gi');
const yearsOfLabel = s => {
  const m = String(s).match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!m) return [];
  return m[2] ? [s, m[1], String(Number(m[1]) + 1)] : [s];
};
/* club nicknames per league, current and former, plus the short forms a
   funFact might use. Soccer has none: its one verified row names clubs by
   their full names, which the claimed team check above already covers. */
const NICKNAMES = {
  NBA: ['Hawks', 'Celtics', 'Nets', 'Hornets', 'Bulls', 'Cavaliers', 'Cavs', 'Mavericks', 'Mavs', 'Nuggets', 'Pistons', 'Warriors', 'Rockets', 'Pacers', 'Clippers', 'Lakers', 'Grizzlies', 'Heat', 'Bucks', 'Timberwolves', 'Wolves', 'Pelicans', 'Knicks', 'Thunder', 'Magic', '76ers', 'Sixers', 'Suns', 'Trail Blazers', 'Blazers', 'Kings', 'Spurs', 'Raptors', 'Jazz', 'Wizards', 'SuperSonics', 'Sonics', 'Bullets', 'Bobcats', 'Braves', 'Royals'],
  NFL: ['Cardinals', 'Falcons', 'Ravens', 'Bills', 'Panthers', 'Bears', 'Bengals', 'Browns', 'Cowboys', 'Broncos', 'Lions', 'Packers', 'Texans', 'Colts', 'Jaguars', 'Chiefs', 'Raiders', 'Chargers', 'Rams', 'Dolphins', 'Vikings', 'Patriots', 'Saints', 'Giants', 'Jets', 'Eagles', 'Steelers', '49ers', 'Niners', 'Seahawks', 'Buccaneers', 'Bucs', 'Titans', 'Commanders', 'Oilers', 'Football Team'],
  MLB: ['Diamondbacks', 'D-backs', 'Braves', 'Orioles', 'Red Sox', 'Cubs', 'White Sox', 'Reds', 'Guardians', 'Indians', 'Rockies', 'Tigers', 'Astros', 'Royals', 'Angels', 'Dodgers', 'Marlins', 'Brewers', 'Twins', 'Mets', 'Yankees', 'Athletics', 'Phillies', 'Pirates', 'Padres', 'Giants', 'Mariners', 'Cardinals', 'Rays', 'Devil Rays', 'Rangers', 'Blue Jays', 'Nationals', 'Expos'],
  NHL: ['Ducks', 'Mighty Ducks', 'Coyotes', 'Bruins', 'Sabres', 'Flames', 'Hurricanes', 'Blackhawks', 'Avalanche', 'Blue Jackets', 'Stars', 'North Stars', 'Red Wings', 'Oilers', 'Panthers', 'Kings', 'Wild', 'Canadiens', 'Habs', 'Predators', 'Devils', 'Islanders', 'Rangers', 'Senators', 'Flyers', 'Penguins', 'Sharks', 'Kraken', 'Blues', 'Lightning', 'Maple Leafs', 'Leafs', 'Canucks', 'Golden Knights', 'Capitals', 'Jets', 'Mammoth', 'Hockey Club', 'Nordiques', 'Whalers', 'Thrashers'],
};
const TITLE = /\b(Super Bowls? [IVXLC]+|Super Bowls?|Stanley Cups?|World Series|Finals|titles?|championships?|champions|rings?|pennants?|MVPs?|trophy|trophies|\d{1,3}-\d{1,3})\b/gi;
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
let linted = 0, nicknamesSeen = 0, titlesSeen = 0;
for (const r of rows) {
  const x = recRows.get(pairKey(r));
  if (!x || x.legacy) continue;
  linted += 1;
  const allowed = new Set(), counts = new Set(), names = [];
  for (const c of x.claims || []) {
    for (const v of [c.first, c.last, c.season]) for (const y of yearsOfLabel(v || '')) allowed.add(y);
    for (const y of c.years || []) allowed.add(y);
    if (c.seasons) counts.add(c.seasons);
    if (c.team) names.push(c.team);
  }
  for (const y of r.funFact.match(/\b(?:19|20)\d\d(?:-\d\d)?\b/g) || []) {
    if (!allowed.has(y)) fail(7, `${pairKey(r)}: the funFact says ${y}, which no claim declares`);
  }
  for (const m of r.funFact.matchAll(COUNT)) {
    const n = WORDS[m[1].toLowerCase()] ?? Number(m[1]);
    if (!counts.has(n)) fail(7, `${pairKey(r)}: the funFact says "${m[0]}", and no claim counts ${n}`);
  }
  /* each team a claim rests on is named, by nickname or by city */
  for (const t of names) {
    const words = t.split(' ');
    const nick = words[words.length - 1].replace(/s$/, ''), city = words.slice(0, -1).join(' ');
    if (!r.funFact.includes(nick) && !(city && r.funFact.includes(city))) fail(7, `${pairKey(r)}: a claim rests on the ${t}, and the funFact never names them`);
  }
  /* and the other way: every club nickname in the text is one a claim or an
     adjudication of this row names, so "the Packers, the Vikings, the Jets"
     cannot slip a team past the record. The row's own player names are taken
     out first ("Magic's last season" is a man, not Orlando). A city alone
     ("a Denver jersey") is not read this way, only nicknames. */
  const says = (adjudications[pairKey(r)]?.facts || []).map(f => f.says).join(' ');
  let text = r.funFact;
  for (const w of `${r.p1} ${r.p2}`.split(/\s+/)) if (w.length > 2) text = text.replace(new RegExp(`(?<![A-Za-z])${escRe(w)}(?![A-Za-z])`, 'g'), ' ');
  for (const nick of NICKNAMES[r.sport] || []) {
    const stem = nick.replace(/s$/, '');
    if (!new RegExp(`(?<![A-Za-z-])${stem}s?(?![A-Za-z])`).test(text)) continue;
    nicknamesSeen += 1;
    if (!names.some(t => t.includes(stem)) && !says.includes(stem)) fail(7, `${pairKey(r)}: the funFact names the ${nick}, and no claim or adjudication of this row does`);
  }
  /* a title, a numbered Super Bowl or a score is checked by no table, so it
     must be one an adjudication of this row states word for word (the false
     "Super Bowl LIX" this round removed was exactly this kind of line) */
  for (const m of r.funFact.matchAll(TITLE)) {
    titlesSeen += 1;
    if (!new RegExp(`(?<![\\w-])${escRe(m[0])}(?![\\w-])`).test(says)) fail(7, `${pairKey(r)}: the funFact says "${m[0]}", which no adjudication of this row states`);
  }
}
/* every team a claim rests on must be in the nickname list, or the list
   above would be quietly blind to it */
for (const x of record.rows) {
  if (x.legacy || !NICKNAMES[x.sport]) continue;
  for (const c of x.claims || []) if (c.team && !NICKNAMES[x.sport].some(n => c.team.endsWith(n))) fail(7, `${x.sport} claim team "${c.team}" ends in no nickname the section 7 list knows`);
}
console.log(`  ${linted} funFacts linted: ${nicknamesSeen} club nicknames and ${titlesSeen} titles or scores each traced to a claim or an adjudication`);

// ---------------------------------------------------------------------------
console.log('\n--- 8. the deal: how much of one run the next run repeats ---');
/* The deal is LIFTED from src/hooks/useTeammates.ts, not retyped: the hook's
   own buildRound() runs here with Math.random swapped for a seeded generator.
   Every deal must hold ROUNDS distinct pairs in the 3, 3, 4 mix the rules
   card promises, because a short deal leaves question 10 with no card and
   no button (the shortdeal control). The outcome measured is the share of a run's pairs that the
   very next run deals again, which is what a player notices. Measured
   2026-10-02, seeds 1 to 12, 400 run pairs each, and the gate is the MEAN
   over seeds, never the worst seed: the 50 row bank before Round 921
   repeated 20.8 to 22.8 percent per seed, mean 21.9; the 121 row bank 8.3
   to 10.0, mean 9.3; the 141 row bank (2026-10-03, twenty NO rows added)
   7.1 to 8.5, mean 7.8. The ceiling of 14 sits 6.2 points above the new mean
   and 7.9 below the old one, so it fails on a bank that shrinks back toward
   the old one and on nothing else (the smallbank control deals the old
   12/12/26 shape and reads 21.9). The same runs report what tapping YES on
   every card scores: 7.95 of 10 on the 121 row bank, 6.87 on 141. That line
   is reported, not gated: the hook's sort shuffle leans toward file order,
   so it moves with row order as well as with the answers. */
const REPEAT_CEILING = 0.14;
let hookSrc = fs.readFileSync(path.join(ROOT, HOOK), 'utf8').replace(/\r\n/g, '\n');
if (CONTROL === 'shortdeal') hookSrc = rewrite(hookSrc, 'hard.slice(0, 4)', 'hard.slice(0, 3)', "the hook's hard slice");
if (CONTROL === 'widepool') hookSrc = rewrite(hookSrc, 'p => p.difficulty === 3', 'p => p.difficulty >= 2', "the hook's hard filter");
/* the round size is the hook's own constant, and the mix is the one the rules
   card promises the player, read out of the Teammates block of the guide */
const roundsM = hookSrc.match(/const ROUNDS = (\d+);/);
const guideSrc = fs.readFileSync(path.join(ROOT, GUIDE), 'utf8');
const mixM = guideSrc.slice(guideSrc.indexOf("'/teammates': {")).match(/Each round is (\d+) questions: (\d+) easy, (\d+) medium and (\d+) hard/);
const fnAt = hookSrc.indexOf('function buildRound(');
const fnEnd = fnAt < 0 ? -1 : hookSrc.indexOf('\n}\n', fnAt);
let buildRoundOf = null;
if (roundsM && mixM && fnAt >= 0 && fnEnd > fnAt) {
  /* only the return type is TypeScript; anything else the hook grows makes
     this throw, which fails below rather than measuring a retyped deal */
  const fnSrc = hookSrc.slice(fnAt, fnEnd + 2).replace(/^function buildRound\(\)\s*:\s*[\w[\]<>]+\s*\{/, 'function buildRound() {');
  try { buildRoundOf = new Function('teammatesPairs', 'Math', `${fnSrc}\nreturn buildRound;`); } catch (e) { fail(8, `the lifted buildRound() does not run as JavaScript: ${e.message}`); }
}
if (!buildRoundOf) {
  fail(8, `the deal could not be lifted out of ${HOOK} (or the rules card's mix out of ${GUIDE}); refusing to retype it`);
} else {
  const ROUNDS = Number(roundsM[1]);
  const take = { 1: Number(mixM[2]), 2: Number(mixM[3]), 3: Number(mixM[4]) };
  if (Number(mixM[1]) !== ROUNDS || take[1] + take[2] + take[3] !== ROUNDS) fail(8, `the rules card promises ${mixM[1]} questions as ${take[1]}+${take[2]}+${take[3]}, and the hook plays ${ROUNDS}`);
  for (const d of [1, 2, 3]) {
    const n = rows.filter(r => r.difficulty === d).length;
    if (n < 2 * take[d]) fail(8, `difficulty ${d} holds ${n} rows, fewer than two runs of ${take[d]}`);
  }
  const mulberry = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  /* the smallbank control deals from the old bank's shape (12 easy, 12
     medium, 26 hard, the first of each in file order), which must trip the
     repeat ceiling and nothing else in this section */
  const OLD_SHAPE = { 1: 12, 2: 12, 3: 26 };
  const bank = CONTROL === 'smallbank' ? [1, 2, 3].flatMap(d => rows.filter(r => r.difficulty === d).slice(0, OLD_SHAPE[d])) : rows;
  const deal = rand => buildRoundOf(bank, Object.assign(Object.create(Math), { random: rand }))();
  /* every deal keeps the promise before anything about it is measured */
  const broken = new Set();
  const checkDeal = d => {
    if (d.length !== ROUNDS) broken.add(`a run deals ${d.length} pairs into a ${ROUNDS} question game`);
    if (new Set(d.map(pairKey)).size !== d.length) broken.add('a run deals the same pairing twice');
    for (const k of [1, 2, 3]) {
      const n = d.filter(r => r.difficulty === k).length;
      if (n !== take[k]) broken.add(`a run deals ${n} difficulty ${k} pairs where the rules card promises ${take[k]}`);
    }
    return d;
  };
  const shares = [];
  let yes = 0, asked = 0;
  for (let seed = 1; seed <= 12; seed += 1) {
    const rand = mulberry(seed);
    let rep = 0, dealt = 0;
    for (let k = 0; k < 400; k += 1) {
      const first = checkDeal(deal(rand)), b = checkDeal(deal(rand));
      const a = new Set(first.map(pairKey));
      rep += b.filter(r => a.has(pairKey(r))).length; dealt += b.length;
      yes += b.filter(r => r.answer).length; asked += b.length;
    }
    shares.push(rep / dealt);
  }
  for (const msg of broken) fail(8, msg);
  const mean = shares.reduce((s, v) => s + v, 0) / shares.length;
  console.log(`  per seed: ${shares.map(s => (100 * s).toFixed(1)).join(' ')} percent; mean ${(100 * mean).toFixed(1)} (ceiling ${(100 * REPEAT_CEILING).toFixed(1)})`);
  console.log(`  every one of ${12 * 800} runs dealt ${ROUNDS} distinct pairs as ${take[1]}+${take[2]}+${take[3]}: ${broken.size ? 'NO' : 'yes'}; tapping YES every time scores ${(ROUNDS * yes / asked).toFixed(2)} of ${ROUNDS} on average`);
  if (mean > REPEAT_CEILING) fail('8r', `the next run repeats ${(100 * mean).toFixed(1)} percent of the last one on average, above the ${(100 * REPEAT_CEILING).toFixed(1)} percent ceiling`);
}
const bySport = {};
for (const r of rows) bySport[r.sport] = (bySport[r.sport] || 0) + 1;
console.log(`  bank by sport: ${Object.entries(bySport).map(([s, n]) => `${s} ${n}`).join(', ')}`);

// ---------------------------------------------------------------------------
console.log('\n--- 10. the reveal a player sees says what the record checked ---');
/* The record settles club and league teams only (the rules card says so), so
   a bare "NEVER teammates" is false for Kobe and LeBron (2008 Olympics),
   Gretzky and Lemieux (1987 Canada Cup) and every other pair who shared a
   national team. The NO reveal has to name the league, or "club" for soccer,
   and no line on the page may deny teammates without a scope. Read from the
   code with comments stripped, so prose about the rule cannot satisfy it. */
let pageSrc = fs.readFileSync(path.join(ROOT, PAGE), 'utf8').replace(/\r\n/g, '\n');
const SCOPED_NO = "`They were NEVER ${currentPair.sport === 'Soccer' ? 'club' : currentPair.sport} teammates.`";
if (CONTROL === 'unscopedbanner') pageSrc = rewrite(pageSrc, SCOPED_NO, "'They were NEVER teammates.'", 'the scoped NO reveal');
const pageCode = pageSrc.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<![:'"])\/\/[^\n]*/g, ' ');
const bare = pageCode.match(/\bnever\s+teammates\b/gi) || [];
if (bare.length) fail(10, `${PAGE} denies teammates ${bare.length} time(s) with no league or club named: "${bare[0]}"`);
if (!/NEVER \$\{[^}]*currentPair\.sport[^}]*\} teammates/.test(pageCode)) fail(10, `the NO reveal in ${PAGE} does not name the league the pair was checked in`);
console.log(`  ${bare.length} unscoped denial(s) on the page; the NO reveal names the league: ${/NEVER \$\{[^}]*currentPair\.sport/.test(pageCode) ? 'yes' : 'NO'}`);

// ---------------------------------------------------------------------------
/* 9. LIVE, opt in. Sections 3 and 4 of simTeammatesPairs, which this file
   replaces, moved here unchanged in logic: the soccer rows against
   public.soccer_player_club_stints. That reads the production database, so it
   never runs by default (standing rule since 2026-10-02: the lead runs live
   checks once a release). A shared club with overlapping years is evidence
   they were teammates; no overlap is NOT evidence they were not, so it is
   reported and fails nothing. */
const soccer = rows.filter(r => r.sport === 'Soccer');
if (process.env.TEAMMATES_LIVE !== '1') {
  console.log(`\n--- 9. live soccer table check: skipped (reads production; TEAMMATES_LIVE=1, lead only, once a release). ${soccer.length} soccer rows would be asked. ---`);
} else {
  console.log(`\n--- 9. the ${soccer.length} soccer rows against soccer_player_club_stints (LIVE) ---`);
  const lines = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts'), 'utf8').split(/\r?\n/);
  const start = lines.findIndex(l => l.startsWith('const TRANSLIT'));
  const end = lines.findIndex((l, i) => i > start && l.includes('.trim();'));
  if (start < 0 || end < 0) fail(9, 'could not lift the name fold out of the shipped edge function; refusing to retype it');
  else {
    const js = lines.slice(start, end + 1).join('\n').replace(': Record<string, string>', '').replace('(s: string)', '(s)');
    const shippedFold = eval(`(() => { ${js}; return norm; })()`);
    const NAME_FORMS = { jr: 'junior' };
    const sfold = n => shippedFold(n).split(/\s+/).map(t => NAME_FORMS[t] || t).join(' ');
    const { supabaseFromClientTs } = await import('./bakeCareerPlayers.mjs');
    const supabase = supabaseFromClientTs(ROOT);
    const wanted = [...new Set(soccer.flatMap(r => [r.p1, r.p2]))];
    const { data: stints, error } = await supabase.from('soccer_player_club_stints')
      .select('player_name, name_folded, club, first_year, last_year').in('name_folded', wanted.map(sfold));
    if (error) fail(9, `could not read soccer_player_club_stints: ${error.message}; an unreadable table is not a green run`);
    else {
      const byPlayer = new Map();
      for (const s of stints) { const k = s.name_folded || sfold(s.player_name); if (!byPlayer.has(k)) byPlayer.set(k, []); byPlayer.get(k).push(s); }
      const unresolved = wanted.filter(n => !byPlayer.has(sfold(n)));
      if (unresolved.length) fail(9, `these names match no row even folded: ${unresolved.join(', ')}`);
      const DROP = new Set(['fc', 'cf', 'sc', 'afc', 'ac', 'as', 'club', 'the']);
      const cnorm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !DROP.has(t)).join(' ');
      const SHORT_FORMS = { 'paris saint germain': ['psg'], 'manchester united': ['man utd', 'man united'], 'new york city': ['nycfc'], 'barcelona': ['barca'] };
      let adjudicated = 0;
      for (const r of soccer) {
        const ov = [];
        for (const x of byPlayer.get(sfold(r.p1)) || []) for (const y of byPlayer.get(sfold(r.p2)) || []) {
          if (x.club === y.club && x.first_year <= y.last_year && y.first_year <= x.last_year) ov.push({ club: x.club, from: Math.max(x.first_year, y.first_year), to: Math.min(x.last_year, y.last_year) });
        }
        if (!ov.length) { console.log(`    unadjudicated (a coverage gap, not a wrong row): ${r.p1} + ${r.p2}`); continue; }
        adjudicated += 1;
        if (!r.answer) fail(9, `${r.p1} and ${r.p2} are told they were never teammates, but the table has them both at ${ov.map(o => `${o.club} ${o.from}-${o.to}`).join(' and ')}`);
        else {
          const fact = cnorm(r.funFact);
          if (!ov.some(o => { const c = cnorm(o.club); return fact.includes(c) || (SHORT_FORMS[c] || []).some(sf => fact.includes(sf)); })) fail(9, `${r.p1} and ${r.p2} shared ${ov.map(o => o.club).join(' and ')}, but the funFact names none of them`);
        }
      }
      console.log(`  adjudicated by the table: ${adjudicated} of ${soccer.length}`);
      if (adjudicated < 10) fail(9, `only ${adjudicated} soccer pairs could be adjudicated, against the floor of 10 the old harness held`);
    }
  }
}

// ---------------------------------------------------------------------------
/* each control names EVERY section it must fire, and a control proves its
   check only when exactly those fire: one that also trips something else, or
   lands on a section that was already red, proves nothing about its own */
const EXPECT = {
  fileflip: [1, 3, 5],   /* the funFact now contradicts the answer, the file the record, the hosts the answer */
  recordflip: [1, 5],    /* file and record agree, so 3 stays quiet; the hosts and the funFact do not */
  hostgap: [5, 6],       /* the hosts disagree on the verdict and on the claim behind the funFact */
  onesource: [4, 5, 6],  /* one host left: 4 counts it, 5 and 6 cannot ask the missing host */
  wrongclaim: [6, 7],    /* the claim no longer holds, and the funFact's 2011-12 is no longer one it declares */
  wrongyear: [7],
  dupe: [2, 3, 8],       /* the twin has no record row and lets one run deal the same pairing twice */
  thindeal: [8],
  smallbank: ['8r'],
  spellgap: [6, 7],      /* the spell no longer matches the hosts, and 2015 is no longer declared */
  longdash: [1, 3],      /* the dash, and a file that no longer says what the record says */
  shortdeal: [8],
  widepool: [8],
  unscopedbanner: [10],
  legacypin: [4],
  extrateam: [7],
  superbowl: [7],
  legacyflip: [1, 4],    /* the denial now contradicts the answer, and the pin */
};
let code = 0;
if (CONTROL) {
  const want = EXPECT[CONTROL];
  const got = [...fired].map(String).sort(), wanted = (want || []).map(String).sort();
  if (want === undefined) { console.error(`Unknown TEAMMATES_CONTROL "${CONTROL}"`); code = 2; }
  else if (got.join() === wanted.join()) console.log(`\nCONTROL ${CONTROL}: section(s) ${wanted.join(', ')} fired and nothing else did, as it must.`);
  else { console.error(`\nCONTROL ${CONTROL}: expected section(s) ${wanted.join(', ')} and only those, got ${got.join(', ') || 'none'}. The check is not measuring what it claims to.`); code = 1; }
} else if (failures) {
  console.error(`\nsimTeammatesRecord: ${failures} failure(s)`);
  code = 1;
} else {
  console.log(`\nsimTeammatesRecord: all ${rows.length} rows match the record, ${derived + byAdjudication} answers stand on two hosts or a two host adjudication, every funFact claim holds, ${legacy.length} legacy soccer rows await verification.`);
}
process.exitCode = code;
