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
 * every year and every "N seasons" in the text must be one a claim declares.
 * A funFact cannot carry a number nobody checked.
 *
 * LEGACY. 15 soccer rows predate this record and are not verified by it.
 * They get the structural checks only, the count is a ratchet that can only
 * fall, and the live soccer_player_club_stints check that used to cover ten
 * of them is kept below as section 9, opt in (TEAMMATES_LIVE=1), because it
 * reads the production database and only the lead runs that, once a release.
 *
 * BANDS (section 8), measured 2026-10-02 over seeds 1 to 12, ten deals per
 * seed: see the numbers beside each constant. Never a max.
 *
 * CONTROLS (TEAMMATES_CONTROL=...), each must make its section fire:
 *   fileflip     one answer flipped in the shipped file only        -> 3
 *   recordflip   the same answer flipped in file AND record         -> 5
 *   hostgap      one season deleted from one host of one player     -> 5
 *   onesource    one player's second source deleted                 -> 4
 *   wrongclaim   a claim's span end moved a season                  -> 6
 *   wrongyear    a funFact year changed in file and record          -> 7
 *   dupe         the same pairing twice                             -> 2
 *   thindeal     every easy row moved to medium                     -> 8
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.TEAMMATES_CONTROL || '';
const FILE = 'src/data/teammatesPairs.ts';
const RECORD = 'scripts/data/teammatesVerified2026-10.json';
const HOOK = 'src/hooks/useTeammates.ts';

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
const TOGETHER = /(both (played|were)|played together|were teammates|became .{0,20}teammates|teammates (on|from|since|in|for))/i;
const NEGATED = /\b(never|not|no longer|n't)\b/i;
for (const r of rows) {
  if (r.p1 === r.p2) fail(1, `${r.p1} is paired with himself`);
  if (!SPORTS.has(r.sport)) fail(1, `${r.p1} and ${r.p2} are filed under "${r.sport}"`);
  if (r.difficulty < 1 || r.difficulty > 3) fail(1, `${r.p1} and ${r.p2} have difficulty ${r.difficulty}`);
  if (!r.funFact.trim()) fail(1, `${r.p1} and ${r.p2} have no funFact`);
  if (/[–—]/.test(r.funFact)) fail(1, `${r.p1} and ${r.p2}: the funFact carries a long dash, which the site never uses`);
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
      const host = (subject || players[`${r.sport}|${r.p1}`])?.sources?.[i]?.host;
      const tag = `${pairKey(r)} on ${host}`;
      const keys = c.team ? labelKeys(r.sport, i, c.team) : new Set();
      if (c.team && !keys.size) { fail(6, `${tag}: no key prints as "${c.team}"`); continue; }
      let err = '';
      if (c.t === 'together') {
        const a = players[`${r.sport}|${r.p1}`], b = players[`${r.sport}|${r.p2}`];
        const sa = new Set(onKeys(a, i, keys));
        err = spanCheck(`${c.team} together`, onKeys(b, i, keys).filter(s => sa.has(s)), c);
      } else if (c.t === 'stint') {
        const ss = onKeys(subject, i, keys);
        err = spanCheck(`${c.player} at ${c.team}`, ss, c);
        if (!err && c.only && seasonsOf(subject, i).some(s => !keys.has(s.team))) err = `${c.player} also played for another team`;
      } else if (c.t === 'debut') {
        if (careerFirst(subject, i) !== c.first) err = `${c.player}'s first season is ${careerFirst(subject, i)}, not ${c.first}`;
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
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const yearsOfLabel = s => {
  const m = String(s).match(/^(\d{4})(?:-(\d{2}))?$/);
  if (!m) return [];
  return m[2] ? [s, m[1], String(Number(m[1]) + 1)] : [s];
};
let linted = 0;
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
  for (const m of r.funFact.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d{1,2}) (seasons?|years?)\b/gi)) {
    const n = WORDS[m[1].toLowerCase()] ?? Number(m[1]);
    if (!counts.has(n)) fail(7, `${pairKey(r)}: the funFact says "${m[0]}", and no claim counts ${n}`);
  }
  /* each team a claim rests on is named, by nickname or by city */
  for (const t of names) {
    const words = t.split(' ');
    const nick = words[words.length - 1].replace(/s$/, ''), city = words.slice(0, -1).join(' ');
    if (!r.funFact.includes(nick) && !(city && r.funFact.includes(city))) fail(7, `${pairKey(r)}: a claim rests on the ${t}, and the funFact never names them`);
  }
}
console.log(`  ${linted} funFacts linted`);

// ---------------------------------------------------------------------------
console.log('\n--- 8. the deal: how much of one run the next run repeats ---');
/* The deal is LIFTED from src/hooks/useTeammates.ts, not retyped: the per
   difficulty slice sizes are read out of the hook, and the shuffle is the
   hook's own comparator, sort(() => random - 0.5), driven by a seeded
   generator. The outcome measured is the share of a run's pairs that the
   very next run deals again, which is what a player notices. Measured
   2026-10-02, 12 seeds x 400 run pairs: the 50 row bank before Round 921
   repeated 20.8 to 21.3 percent; the 120 row bank 8.4 to 8.8 percent. The
   ceiling sits between the two, far from both, so it fails on a bank that
   shrinks back toward the old one and on nothing else. */
const REPEAT_CEILING = 0.14;
const hookSrc = fs.readFileSync(path.join(ROOT, HOOK), 'utf8');
const sliceM = hookSrc.match(/easy\.slice\(0, (\d+)\), \.\.\.med\.slice\(0, (\d+)\), \.\.\.hard\.slice\(0, (\d+)\)/);
if (!sliceM || !/sort\(\(\) => Math\.random\(\) - 0\.5\)/.test(hookSrc)) {
  fail(8, `the deal could not be lifted out of ${HOOK}; refusing to retype it`);
} else {
  const take = { 1: Number(sliceM[1]), 2: Number(sliceM[2]), 3: Number(sliceM[3]) };
  for (const d of [1, 2, 3]) {
    const n = rows.filter(r => r.difficulty === d).length;
    if (n < 2 * take[d]) fail(8, `difficulty ${d} holds ${n} rows, fewer than two runs of ${take[d]}`);
  }
  const mulberry = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const deal = rand => [1, 2, 3].flatMap(d => rows.filter(r => r.difficulty === d).sort(() => rand() - 0.5).slice(0, take[d]));
  const shares = [];
  for (let seed = 1; seed <= 12; seed += 1) {
    const rand = mulberry(seed);
    let rep = 0, dealt = 0;
    for (let k = 0; k < 400; k += 1) {
      const a = new Set(deal(rand).map(pairKey)), b = deal(rand);
      rep += b.filter(r => a.has(pairKey(r))).length; dealt += b.length;
    }
    shares.push(rep / dealt);
  }
  const mean = shares.reduce((s, v) => s + v, 0) / shares.length;
  console.log(`  per seed: ${shares.map(s => (100 * s).toFixed(1)).join(' ')} percent; mean ${(100 * mean).toFixed(1)} (ceiling ${(100 * REPEAT_CEILING).toFixed(1)})`);
  if (mean > REPEAT_CEILING) fail(8, `the next run repeats ${(100 * mean).toFixed(1)} percent of the last one on average, above the ${(100 * REPEAT_CEILING).toFixed(1)} percent ceiling`);
}
const bySport = {};
for (const r of rows) bySport[r.sport] = (bySport[r.sport] || 0) + 1;
console.log(`  bank by sport: ${Object.entries(bySport).map(([s, n]) => `${s} ${n}`).join(', ')}`);

// ---------------------------------------------------------------------------
const EXPECT = { fileflip: 3, recordflip: 5, hostgap: 5, onesource: 4, wrongclaim: 6, wrongyear: 7, dupe: 2, thindeal: 8 };
let code = 0;
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (want === undefined) { console.error(`Unknown TEAMMATES_CONTROL "${CONTROL}"`); code = 2; }
  else if (fired.has(want)) console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`);
  else { console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`); code = 1; }
} else if (failures) {
  console.error(`\nsimTeammatesRecord: ${failures} failure(s)`);
  code = 1;
} else {
  console.log(`\nsimTeammatesRecord: all ${rows.length} rows match the record, ${derived + byAdjudication} answers stand on two hosts or a two host adjudication, every funFact claim holds, ${legacy.length} legacy soccer rows await verification.`);
}
process.exitCode = code;
