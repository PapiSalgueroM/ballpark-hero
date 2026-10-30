/**
 * Round 1558 harness: Baseball, NFL and NHL Connections held to the record.
 *
 * A guess is right only when the five tiles equal one stored group (the
 * sport hooks' submitGuess), so a false tile costs a life from whoever knows
 * the game, and a tile that honestly belongs to a second group on its board
 * makes a board with two answers where the game accepts one. Round 1553
 * lifted the criterion cross check into scripts/lib/connectionsCrossCheck.mjs;
 * this binds it for the three US pools with their checkers
 * (scripts/lib/usConnectionsCheck.mjs), which judge every label from the
 * leagues' own records (scripts/data/<sport>ConnectionsRecord-2026-10.json).
 *
 * Sections, each over every board of the three files:
 *   1) no group claims the present, and a label naming a year from 2020 on
 *      is one the checker judges (a moving claim nothing holds fails)
 *   2) no refuted claim is on a board: the false members this round took out
 *      (Alex Rodriguez in "Won MVP in both leagues" and the rest), each shown
 *      false on two hosts in the ledger, matched by the claim, not the spelling; and
 *      (Round 1567) no gray pair is back: a man the record could not judge
 *      against a group beside him, read on both hosts (grayPairs), left that
 *      board and stays off it
 *   3) the ledger stands on two hosts: every fact two different hosts, none a
 *      wiki; every member of a group the round flagged has a fact holding him
 *      to it; every finding the round fixed has its fact
 *   4) one right answer: the shared cross check finds no member who fails his
 *      group and no man from another group who fits it
 *   5) no man is a season from joining a group beside him: an award for 2026
 *      still to be named (the World Series MVP from its two clubs, Gold Gloves,
 *      Silver Sluggers, the MVP and the rest in November) or a running total
 *      one season from a milestone (Erik Karlsson at 947 points beside
 *      "1,000+ career points")
 *   6) no man is dealt twice on one board under two names (bconn-049 held
 *      "Goose Gossage" and "Rich Gossage", and the game's own check compares
 *      spellings)
 *   7) the groups, members and other tiles the record cannot judge may only get
 *      fewer (each count has its ceiling in the sport's ledger). Section 4's
 *      "one right answer" holds as far as the record judges: an other tile it
 *      cannot judge (a gray position share, one to four seasons with a legends
 *      club) is counted, held at its ceiling and said aloud, never called fine
 *
 *   8) (Round 1567) no active man is one move from a second answer: every
 *      "Played for the X" group on a board with a man still playing who does
 *      not fit it is dated ("Played for the Steelers (as of 2025)"), which the
 *      checkers hold to the seasons up to that one
 *
 * Live rows: players are dealt from the tables baseball_connections_puzzles,
 * nfl_connections_puzzles and nhl_connections_puzzles. This harness never reads
 * them. The lead exports each once with a read only SELECT and runs
 *   US_CONN_LIVE=baseball=<file>,nfl=<file>,nhl=<file> node scripts/simUsConnectionsFacts.mjs
 * which checks those rows by sections 1, 2, 4, 5 and 6 (rows past the file's
 * boards hold men the record has never read: they count as unknown, said aloud).
 *
 * Controls (each must exit 1; the harness first asserts the control changed
 * its input, else it prints ABORTED and exits 2; each prints how often it fired):
 *   US_CONN_CONTROL=arod      Alex Rodriguez back in "Won MVP in both leagues" on bconn-001
 *                             (must raise: refuted and not-a-member, for him)
 *   US_CONN_CONTROL=bell      Le'Veon Bell back in nflconn-004's Steelers group, beside its Ravens
 *                             (must raise: second-fit, for him)
 *   US_CONN_CONTROL=karlsson  Erik Karlsson back in nhlconn-004's Sharks group, beside 1,000 points
 *                             (must raise: watch, for him)
 *   US_CONN_CONTROL=twice     "Rich Gossage" back beside "Goose Gossage" on bconn-049
 *                             (must raise: twice, for him)
 *   US_CONN_CONTROL=onehost   one ledger fact loses its second host (must raise: one-host, for that fact)
 *   US_CONN_CONTROL=unjudged  "Played in Japan before MLB" back on bconn-002 (must raise: unjudged, for it)
 *   US_CONN_CONTROL=fingers   Rollie Fingers back among bconn-029's A's legends, beside the Brewers who
 *                             retired his 34 (must raise: other-unknown, for baseball's ceiling)
 *   US_CONN_CONTROL=ohtani    Round 1567: Shohei Ohtani (14 starts in 2026) back on bconn-002 beside
 *                             "Won Cy Young Award" (must raise: watch, for him; the watch skipped two
 *                             way men before this round)
 *   US_CONN_CONTROL=frobinson Round 1567: Frank Robinson back among bconn-057's right fielders, beside its
 *                             left fielders (29.4 percent of his games there: must raise gray-back, for him)
 *   US_CONN_CONTROL=undate    Round 1567: nflconn-004's "Played for the Steelers (as of 2025)" loses its
 *                             date beside Lamar Jackson, still a Raven (must raise: trade, for him)
 *   The date boundary (fix-1567, review-run-1567 finding 3: five mutations of the date filters stayed green):
 *   US_CONN_CONTROL=yearnfl   Jaire Alexander (one Ravens season, 2025) beside nflconn-004's Ravens
 *                             (as of 2025) (must raise: second-fit, for him; "<" for "<=" hides him)
 *   US_CONN_CONTROL=yearnhl   Mitch Marner (one Golden Knights season, 2025-26) beside nhlconn-003's Golden
 *                             Knights (as of 2025-26) (must raise: second-fit, for him)
 *   US_CONN_CONTROL=afternfl  Von Miller (one Cowboys season, 2026) inside nflconn-002's Cowboys (as of 2025)
 *                             (must raise: not-a-member, for him; ignoring the date lets him in)
 *   US_CONN_CONTROL=afternhl  nhlconn-003's Golden Knights moved back to (as of 2024-25) with Mitch Marner
 *                             inside it (must raise: not-a-member, for him)
 *   US_CONN_CONTROL=aftermlb  bconn-011's Cleveland group moved back to (as of 2025): Francisco Lindor's 2026
 *                             season makes him unknown (must raise: member-unknown, for baseball)
 *   US_CONN_CONTROL=futuredate nflconn-004's Steelers dated (as of 2030) (must raise: date-open, for it)
 *   US_CONN_CONTROL=grayonehost the first baseball gray pair keeps one host (must raise: gray-one-host, for it)
 * A control is red only when the rule it names fires for the man or group it
 * moved. Any other failure in a control run (a moved man has no two host fact
 * in section 3, say) is printed but never turns the run red on its own, so
 * deleting or loosening the rule a control names turns that control green
 * (Round 1558's review found bell, karlsson and twice red through section 3
 * alone with their rules removed).
 *
 * Run: node scripts/simUsConnectionsFacts.mjs   (light: about two seconds, no network)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { crossCheckBoards, findingKey } from './lib/connectionsCrossCheck.mjs';
import { makeUsChecker, fold } from './lib/usConnectionsCheck.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = ROOT.replaceAll('\\', '/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'usconnfacts-'));
const CONTROL = process.env.US_CONN_CONTROL ?? '';
const LIVE = process.env.US_CONN_LIVE ?? '';
const SPORTS = ['baseball', 'nfl', 'nhl'];
/* Round 1567: a club group dated against trades ("Played for the Steelers (as of 2025)") is the same claim as the
   undated one for every man whose seasons there all came before the date, which section 4 checks against the
   record; the ledgers name such groups and facts by the undated label, and a refuted claim stays refuted dated */
const undated = l => String(l).replace(/ \(as of [^)]+\)$/, '');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
/* every finding by its kind and the man (or group) it is about, so a control can ask whether ITS rule fired */
const fires = [];
const fire = (kind, subject) => fires.push({ kind, subject: fold(subject) });
/* the rule each control must raise, and for whom; set by the control below */
let own = null;

fs.writeFileSync(path.join(TMP, 'entry.mjs'), `
export const baseball = (await import('${R}/src/data/baseballConnectionsPuzzles.ts')).baseballConnectionsPuzzles;
export const nfl = (await import('${R}/src/data/nflConnectionsPuzzles.ts')).nflConnectionsPuzzles;
export const nhl = (await import('${R}/src/data/nhlConnectionsPuzzles.ts')).nhlConnectionsPuzzles;
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const data = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);

/* the boards under test: the shipped files, or the lead's export of a live table */
const boards = {};
for (const s of SPORTS) boards[s] = data[s].map(b => ({ id: b.id, groups: b.groups.map(g => ({ ...g, players: [...g.players] })) }));
const live = new Set();
if (LIVE) {
  for (const part of LIVE.split(',')) {
    const [s, file] = part.split('=');
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
    boards[s] = rows.map(r => ({ id: r.puzzle_id, groups: groupsOf(r.groups_json) }));
    live.add(s);
    console.log(`US_CONN_LIVE: ${s} checks ${boards[s].length} rows of the live table export, not the shipped file`);
  }
}
const sports = {};
for (const s of SPORTS) sports[s] = makeUsChecker(ROOT, s);

/* ---- the controls: each changes its input, proves it did, and must end red ---- */
const boardOf = (s, id) => boards[s].find(b => b.id === id);
const ledgerOf = s => sports[s].ledger;
if (CONTROL) {
  let changed = false;
  if (CONTROL === 'arod') {
    /* the scout's first false claim: Alex Rodriguez in "Won MVP in both leagues" (his three are American League) */
    const b = boardOf('baseball', 'bconn-001');
    const g = b?.groups[0];
    const hr = b?.groups.find(x => x.theme === 'Hit 500+ career home runs');
    if (g && hr && hr.players.includes('Alex Rodriguez') && !g.players.includes('Alex Rodriguez')) {
      g.theme = 'Won MVP in both leagues';
      hr.players[hr.players.indexOf('Alex Rodriguez')] = g.players[0];
      g.players[0] = 'Alex Rodriguez';
      changed = true;
      own = { kinds: ['refuted', 'not-a-member'], subject: 'Alex Rodriguez' };
    }
  } else if (CONTROL === 'bell') {
    const b = boardOf('nfl', 'nflconn-004');
    const g = b?.groups.find(x => undated(x.theme) === 'Played for the Steelers');
    if (g && b.groups.some(x => undated(x.theme) === 'Played for the Ravens') && g.players.includes('Ben Roethlisberger')) {
      g.players[g.players.indexOf('Ben Roethlisberger')] = "Le'Veon Bell";
      changed = true;
      own = { kinds: ['second-fit'], subject: "Le'Veon Bell" };
    }
  } else if (CONTROL === 'karlsson') {
    const b = boardOf('nhl', 'nhlconn-004');
    const g = b?.groups.find(x => undated(x.theme) === 'Played for the Sharks');
    if (g && b.groups.some(x => x.theme === '1,000+ career points') && g.players.includes('Marc-Edouard Vlasic')) {
      g.players[g.players.indexOf('Marc-Edouard Vlasic')] = 'Erik Karlsson';
      changed = true;
      own = { kinds: ['watch'], subject: 'Erik Karlsson' };
    }
  } else if (CONTROL === 'twice') {
    const b = boardOf('baseball', 'bconn-049');
    const g = b?.groups.find(x => x.players.includes('Goose Gossage'));
    if (g && g.players.includes('Bruce Sutter')) {
      g.players[g.players.indexOf('Bruce Sutter')] = 'Rich Gossage';
      changed = true;
      own = { kinds: ['twice'], subject: 'Rich Gossage' };
    }
  } else if (CONTROL === 'onehost') {
    const f = (ledgerOf('baseball').facts ?? []).find(x => x.sources?.length === 2);
    if (f) {
      console.log(`US_CONN_CONTROL=onehost: ${f.name} in "${f.label}" keeps only ${f.sources[0].host}`);
      f.sources = [f.sources[0]];
      changed = true;
      own = { kinds: ['one-host'], subject: `${f.name} | ${f.label}` };
    }
  } else if (CONTROL === 'fingers') {
    /* the review's second answer: Rollie Fingers (his 34 retired by the Brewers) back among bconn-029's A's legends */
    const b = boardOf('baseball', 'bconn-029');
    const g = b?.groups.find(x => x.theme === 'Oakland Athletics legends');
    if (g && b.groups.some(x => x.theme === 'Milwaukee Brewers legends') && g.players.includes('Jose Canseco')) {
      g.players[g.players.indexOf('Jose Canseco')] = 'Rollie Fingers';
      changed = true;
      own = { kinds: ['other-unknown'], subject: 'baseball' };
    }
  } else if (CONTROL === 'ohtani') {
    /* Round 1567: Shohei Ohtani (14 starts in 2026, a two way man) back beside "Won Cy Young Award" on bconn-002 */
    const b = boardOf('baseball', 'bconn-002');
    const g = b?.groups.find(x => x.theme === 'Born in Japan');
    if (g && b.groups.some(x => x.theme === 'Won Cy Young Award') && g.players.includes('Hisashi Iwakuma')) {
      g.players[g.players.indexOf('Hisashi Iwakuma')] = 'Shohei Ohtani';
      changed = true;
      own = { kinds: ['watch'], subject: 'Shohei Ohtani' };
    }
  } else if (CONTROL === 'frobinson') {
    /* Round 1567: Frank Robinson (29.4 percent of his games in left field) back among bconn-057's right fielders */
    const b = boardOf('baseball', 'bconn-057');
    const g = b?.groups.find(x => x.theme === 'Hall of Fame right fielders');
    if (g && b.groups.some(x => x.theme === 'Hall of Fame left fielders') && g.players.includes('Larry Walker')) {
      g.players[g.players.indexOf('Larry Walker')] = 'Frank Robinson';
      changed = true;
      own = { kinds: ['gray-back'], subject: 'Frank Robinson' };
    }
  } else if (CONTROL === 'undate') {
    /* Round 1567: nflconn-004's Steelers group loses its date, beside Lamar Jackson, still playing for the Ravens */
    const b = boardOf('nfl', 'nflconn-004');
    const g = b?.groups.find(x => x.theme === 'Played for the Steelers (as of 2025)');
    if (g && b.groups.some(x => x.players.includes('Lamar Jackson'))) {
      g.theme = 'Played for the Steelers';
      changed = true;
      own = { kinds: ['trade'], subject: 'Lamar Jackson' };
    }
  } else if (CONTROL === 'yearnfl') {
    /* fix-1567: the date year counts. Jaire Alexander's one Ravens season on the record is 2025, so beside
       nflconn-004's "Played for the Ravens (as of 2025)" he is a second answer; a "<" for "<=" hides him */
    const b = boardOf('nfl', 'nflconn-004');
    const g = b?.groups.find(x => x.theme === 'Played college ball at Clemson');
    if (g && b.groups.some(x => x.theme === 'Played for the Ravens (as of 2025)') && g.players.includes('Hunter Renfrow')) {
      g.players[g.players.indexOf('Hunter Renfrow')] = 'Jaire Alexander';
      changed = true;
      own = { kinds: ['second-fit'], subject: 'Jaire Alexander' };
    }
  } else if (CONTROL === 'yearnhl') {
    /* fix-1567: Mitch Marner's one Golden Knights season on the record is 2025-26, so beside nhlconn-003's
       "Played for the Golden Knights (as of 2025-26)" he is a second answer; a "<" for "<=" hides him */
    const b = boardOf('nhl', 'nhlconn-003');
    const g = b?.groups.find(x => x.theme === 'Played for the Bruins (as of 2025-26)');
    if (g && b.groups.some(x => x.theme === 'Played for the Golden Knights (as of 2025-26)') && g.players.includes('Ray Bourque')) {
      g.players[g.players.indexOf('Ray Bourque')] = 'Mitch Marner';
      changed = true;
      own = { kinds: ['second-fit'], subject: 'Mitch Marner' };
    }
  } else if (CONTROL === 'afternfl') {
    /* fix-1567: a season past the date does not count. Von Miller's one Cowboys season on the record is 2026, so
       inside nflconn-002's "Played for the Cowboys (as of 2025)" he is no member; ignoring the date lets him in */
    const b = boardOf('nfl', 'nflconn-002');
    const g = b?.groups.find(x => x.theme === 'Played for the Cowboys (as of 2025)');
    if (g && g.players.includes('Zack Martin')) {
      g.players[g.players.indexOf('Zack Martin')] = 'Von Miller';
      changed = true;
      own = { kinds: ['not-a-member'], subject: 'Von Miller' };
    }
  } else if (CONTROL === 'afternhl') {
    /* fix-1567: no NHL man on the record joined a board's club after 2025-26, so the date moves back a season:
       Mitch Marner's Golden Knights seasons (2025-26 on) all come after "(as of 2024-25)", so he is no member */
    const b = boardOf('nhl', 'nhlconn-003');
    const g = b?.groups.find(x => x.theme === 'Played for the Golden Knights (as of 2025-26)');
    if (g && g.players.includes('Jonathan Marchessault')) {
      g.theme = 'Played for the Golden Knights (as of 2024-25)';
      g.players[g.players.indexOf('Jonathan Marchessault')] = 'Mitch Marner';
      changed = true;
      own = { kinds: ['not-a-member'], subject: 'Mitch Marner' };
    }
  } else if (CONTROL === 'aftermlb') {
    /* fix-1567: the baseball record counts seasons per club, not which ones, so a member with any season past the
       date cannot be judged. bconn-011's Cleveland group moves back to "(as of 2025)" and Francisco Lindor (a 2026
       season, with the Mets) must turn unknown; dropping that line would call him in by his count */
    const b = boardOf('baseball', 'bconn-011');
    const g = b?.groups.find(x => x.theme === 'Played for the Cleveland Guardians/Indians (as of 2026)');
    if (g && g.players.includes('Francisco Lindor')) {
      g.theme = 'Played for the Cleveland Guardians/Indians (as of 2025)';
      changed = true;
      own = { kinds: ['member-unknown'], subject: 'baseball' };
    }
  } else if (CONTROL === 'futuredate') {
    /* fix-1567: a date past the last finished season protects nothing: nflconn-004's Steelers to "(as of 2030)" */
    const b = boardOf('nfl', 'nflconn-004');
    const g = b?.groups.find(x => x.theme === 'Played for the Steelers (as of 2025)');
    if (g) {
      g.theme = 'Played for the Steelers (as of 2030)';
      changed = true;
      own = { kinds: ['date-open'], subject: g.theme };
    }
  } else if (CONTROL === 'grayonehost') {
    /* fix-1567: a gray pair read on one host only (the first pair keeps its first source) */
    const gp = (ledgerOf('baseball').grayPairs ?? []).find(x => x.sources?.length >= 2);
    if (gp) {
      console.log(`US_CONN_CONTROL=grayonehost: the gray pair ${gp.name} beside "${gp.label}" keeps only ${gp.sources[0].host}`);
      gp.sources = [gp.sources[0]];
      changed = true;
      own = { kinds: ['gray-one-host'], subject: `${gp.name} | ${gp.label}` };
    }
  } else if (CONTROL === 'unjudged') {
    const b = boardOf('baseball', 'bconn-002');
    const g = b?.groups.find(x => x.theme === 'Born in Japan');
    if (g) {
      g.theme = 'Played in Japan before MLB';
      changed = true;
      own = { kinds: ['unjudged'], subject: 'Played in Japan before MLB' };
    }
  } else {
    console.error(`unknown US_CONN_CONTROL=${CONTROL}`);
    process.exit(2);
  }
  if (!changed) {
    console.error(`US_CONN_CONTROL=${CONTROL} ABORTED: the input it mutates is not there, so a red run would prove nothing`);
    process.exit(2);
  }
  console.log(`US_CONN_CONTROL=${CONTROL}: the input was changed; this run must end red`);
}

const WIKI = /wiki/i;
const hostsOk = sources => new Set((sources ?? []).filter(s => !WIKI.test(String(s.host ?? '')) && !WIKI.test(String(s.url ?? ''))).map(s => String(s.host ?? '').toLowerCase()).filter(Boolean)).size >= 2;
const labelOf = g => g.theme;

console.log('1) no group claims the present, and every recent year label is one the record judges');
for (const s of SPORTS) {
  const PRESENT = /\bcurrent\b|\bnow\b|this season|present day|\bactive\b/i;
  const RECENT = /(^|[^0-9])20[2-9][0-9]/;
  let n = 0;
  for (const b of boards[s]) for (const g of b.groups) {
    if (PRESENT.test(g.theme)) { n += 1; fail(`${s} ${b.id}: "${g.theme}" claims the present, and a saved board outlives it`); continue; }
    if (RECENT.test(g.theme) && !sports[s].checker.criterion(g.theme)) { n += 1; fail(`${s} ${b.id}: "${g.theme}" names a year from 2020 on and nothing holds the group to it`); }
  }
  console.log(`   ${s}: ${n} present tense or unheld recent year labels`);
}

console.log('2) no refuted claim is on a board');
for (const s of SPORTS) {
  const refuted = (ledgerOf(s).facts ?? []).filter(f => f.holds === false && f.why === 'not-a-member');
  let n = 0;
  for (const r of refuted) {
    if (!hostsOk(r.sources)) fail(`${s}: refuted "${r.name}" in "${r.label}" does not stand on two hosts`);
    for (const b of boards[s]) for (const g of b.groups) {
      if (fold(undated(g.theme)) === fold(undated(r.label)) && g.players.some(p => fold(p) === fold(r.name))) {
        n += 1;
        fire('refuted', r.name);
        fail(`${s} ${b.id}: ${r.name} in "${g.theme}" is refuted on two hosts (${r.sources.map(x => x.says).join(' / ')})`);
      }
    }
  }
  console.log(`   ${s}: ${refuted.length} refuted claims held off every board, ${n} found`);
  /* Round 1567: a pair the record could not judge (a man between the share lines beside a position group, one to
     four seasons beside a legends group) is read on both hosts in the ledger's grayPairs and, a coin toss, its man
     left that board; he must not come back beside that group there */
  let back = 0;
  for (const gp of ledgerOf(s).grayPairs ?? []) {
    if (!hostsOk(gp.sources)) { fire('gray-one-host', `${gp.name} | ${gp.label}`); fail(`${s}: the gray pair ${gp.name} beside "${gp.label}" on ${gp.id} is not read on two hosts`); }
    const b = boardOf(s, gp.id);
    if (!b || !b.groups.some(g => fold(g.theme) === fold(gp.label))) continue;
    if (b.groups.some(g => g.players.some(p => fold(p) === fold(gp.name)))) {
      back += 1;
      fire('gray-back', gp.name);
      fail(`${s} ${gp.id}: ${gp.name} is back beside "${gp.label}", a pair neither host decides (${gp.sources.map(x => x.says).join(' / ')})`);
    }
  }
  if ((ledgerOf(s).grayPairs ?? []).length) console.log(`   ${s}: ${(ledgerOf(s).grayPairs ?? []).length} gray pairs the round took off their boards, ${back} back`);
}

console.log('3) the ledger stands on two hosts');
for (const s of SPORTS) {
  const L = ledgerOf(s);
  const facts = L.facts ?? [];
  let bad = 0;
  for (const f of facts) if (!hostsOk(f.sources)) { bad += 1; fire('one-host', `${f.name} | ${f.label}`); fail(`${s}: ${f.name} in "${f.label}" (${f.holds ? 'fits' : 'does not fit'}) does not stand on two hosts`); }
  for (const [k, w] of Object.entries(L.watchLines ?? {})) if (!hostsOk(w.sources)) fail(`${s}: the line ${k} does not stand on two hosts`);
  if (live.has(s)) { console.log(`   ${s}: ${facts.length} facts (the flagged groups are the file's, not checked against a live export)`); continue; }
  /* every member of a group the round flagged is held to it by a fact */
  /* a fact is about a man and a label, whichever board deals them together */
  const holding = new Set(facts.filter(f => f.holds).map(f => `${fold(undated(f.label))}|${fold(f.name)}`));
  let members = 0;
  for (const [id, label] of L.flaggedGroups ?? []) {
    const b = boardOf(s, id);
    const g = b?.groups.find(x => undated(x.theme) === undated(label));
    if (!g) { fail(`${s} ${id}: the ledger flags "${label}" and the board has no such group`); continue; }
    for (const p of g.players) {
      members += 1;
      if (!holding.has(`${fold(undated(label))}|${fold(p)}`)) { fire('no-fact', p); fail(`${s} ${id}: ${p} in "${label}" has no two host fact`); }
    }
  }
  /* every finding the round fixed has the fact behind it: the man, the label and the verdict the finding
     rests on (a member who does not fit, a man from another group who does, a watched man not in it yet),
     or a disputed entry that records both hosts' lines and why nothing rests on them */
  const behind = new Set(facts.map(f => `${fold(f.name)}|${fold(f.label)}|${f.holds}`));
  for (const d of L.disputed ?? []) if (hostsOk(d.sources) && d.resolution) behind.add(d.finding);
  for (const k of L.fixed ?? []) {
    const p = k.split(' | ');
    const watch = p.length === 4 && !['not-a-member', 'second-fit'].includes(p[1]);
    const want = watch
      ? `${fold(p[1].replace(/ \(.+\)$/, ''))}|${fold(p[2])}|false`
      : `${fold(p[2])}|${fold(p[3])}|${p[1] === 'second-fit'}`;
    if (!behind.has(want) && !behind.has(k)) { fire('fixed-no-fact', k); fail(`${s}: the fixed finding "${k}" has no fact`); }
  }
  console.log(`   ${s}: ${facts.length} facts, ${bad} on one host; ${(L.flaggedGroups ?? []).length} flagged groups, ${members} members held; ${(L.fixed ?? []).length} fixed findings`);
}

console.log('4) one right answer: the shared cross check over every board');
const unchecked = {};
const memberUnknown = {};
const otherUnknown = {};
for (const s of SPORTS) {
  const cross = crossCheckBoards(boards[s], { ...sports[s].checker, labelOf });
  for (const f of cross.findings) {
    fire(f.kind, f.name);
    fail(`${s} ${findingKey(f)}${f.kind === 'second-fit' ? ', so the board has two right answers' : ''}`);
  }
  unchecked[s] = cross.unchecked;
  memberUnknown[s] = cross.memberUnknown;
  otherUnknown[s] = cross.otherUnknown;
  if (live.has(s)) {
    const off = [...new Set(boards[s].flatMap(b => b.groups.flatMap(g => g.players)).filter(p => !sports[s].checker.has(p)))];
    if (off.length) console.log(`   ${s}: ${off.length} MEN ON THE LIVE ROWS ARE NOT IN THE RECORD, SO THEIR GROUPS ARE NOT FULLY CHECKED. Extend the record with NAMES_FROM=<export> (scripts/usConnections/fetch*Record.mjs) and run again. First of them: ${off.slice(0, 8).join(', ')}`);
  }
  console.log(`   ${s}: ${cross.boards} boards, ${cross.checked} of ${cross.groups} groups judged; members ${cross.memberChecks} judged (${cross.memberUnknown} unknown), other tiles ${cross.otherChecks} judged (${cross.otherUnknown} unknown); ${cross.findings.length} findings`);
}

console.log('5) no man is a season from joining a group beside him');
for (const s of SPORTS) {
  let n = 0;
  for (const b of boards[s]) for (const g of b.groups) {
    const c = sports[s].checker.criterion(g.theme);
    if (!c) continue;
    for (const o of b.groups) if (o !== g) for (const p of o.players) {
      const why = sports[s].checker.watch(p, c);
      if (why) { n += 1; fire('watch', p); fail(`${s} ${b.id}: ${p} ("${o.theme}") may join "${g.theme}": ${why}`); }
    }
  }
  console.log(`   ${s}: ${n} watched men beside a group they may join`);
}

console.log('6) no man is dealt twice on one board');
for (const s of SPORTS) {
  const men = sports[s].record?.men ?? {};
  let n = 0;
  for (const b of boards[s]) {
    const seen = new Map();
    for (const p of b.groups.flatMap(g => g.players)) {
      const id = sports[s].checker.identity?.(p) ?? fold(p);
      if (seen.has(id)) { n += 1; fire('twice', p); fail(`${s} ${b.id}: "${seen.get(id)}" and "${p}" are the same man`); }
      seen.set(id, p);
    }
  }
  void men;
  console.log(`   ${s}: ${n} men dealt twice`);
}

console.log('7) what the record cannot judge may only get fewer');
for (const s of SPORTS) {
  const L = ledgerOf(s);
  const n = unchecked[s].length;
  const u = memberUnknown[s];
  /* the third count: a tile from another group the record cannot judge against a group beside it (a man with
     15 percent of his games at a position, or three seasons with a legends club). That is exactly where a second
     right answer hides (Rollie Fingers, four Brewers seasons and his 34 retired there, sat beside "Milwaukee
     Brewers legends" on bconn-029 until the review found him), so it is fenced like the other two */
  const o = otherUnknown[s];
  if (!live.has(s) && !CONTROL) {
    if (n !== (L.uncheckedCeiling ?? -1)) fail(`${s}: ${n} groups nothing judges, the ledger's uncheckedCeiling says ${L.uncheckedCeiling}: ${n > L.uncheckedCeiling ? 'one came back' : 'lower the ceiling'}`);
    if (u !== (L.memberUnknownCeiling ?? -1)) fail(`${s}: ${u} members the record cannot place, the ledger's memberUnknownCeiling says ${L.memberUnknownCeiling}: ${u > L.memberUnknownCeiling ? 'one came back' : 'lower the ceiling'}`);
    if (o !== (L.otherUnknownCeiling ?? -1)) fail(`${s}: ${o} other tiles the record cannot judge against a group beside them, the ledger's otherUnknownCeiling says ${L.otherUnknownCeiling}: ${o > L.otherUnknownCeiling ? 'one came back, and it may be a second right answer' : 'lower the ceiling'}`);
  } else if (CONTROL) {
    if (n > (L.uncheckedCeiling ?? 0)) { for (const x of unchecked[s]) fire('unjudged', x.label); fail(`${s}: ${n} groups nothing judges, over the ceiling of ${L.uncheckedCeiling}`); }
    if (u > (L.memberUnknownCeiling ?? 0)) { fire('member-unknown', s); fail(`${s}: ${u} members the record cannot place, over the ceiling of ${L.memberUnknownCeiling}`); }
    if (o > (L.otherUnknownCeiling ?? 0)) { fire('other-unknown', s); fail(`${s}: ${o} other tiles the record cannot judge, over the ceiling of ${L.otherUnknownCeiling}`); }
  }
  console.log(`   ${s}: ${n} groups nothing judges (ceiling ${L.uncheckedCeiling}), ${u} members the record cannot place (ceiling ${L.memberUnknownCeiling}), ${o} other tiles it cannot judge (ceiling ${L.otherUnknownCeiling})${n ? `: ${unchecked[s].map(x => `${x.id} "${x.label}"`).join(', ')}` : ''}`);
}

console.log('8) no active man is one move from a second answer');
/* Round 1567: "Played for the Steelers" holds whoever ever plays for them, so a man still playing who sits on the
   board in another group becomes a second right answer the day he signs there (Round 1558 counted NFL 10 such men
   on 2 boards, NHL 46 on 4, before it counted every active man on a board). A club group on a board with an
   active man who does not fit it is dated ("Played for the Steelers (as of 2025)"), which the checker holds to
   the seasons up to that one; a legends group needs five seasons, so one move cannot do it.
   fix-1567 (review-read-1567 minor 7): a date only protects when no season after it is still being played, so it
   may not pass the sport's last finished season on the 2026-10 records: MLB 2026 (the regular season is over), the
   NFL 2025 (2026 is under way) and the NHL 2025-26 (start year 2025; 2026-27 is under way). A group dated past it
   ("(as of 2030)") is as open as an undated one and is checked as one. Move these when the records are read again */
const LAST_FINISHED = { baseball: 2026, nfl: 2025, nhl: 2025 };
for (const s of SPORTS) {
  let n = 0, dated = 0, open = 0;
  for (const b of boards[s]) for (const g of b.groups) {
    const c = sports[s].checker.criterion(g.theme);
    if (!c || c.kind !== 'club' || c.legend) continue;
    if (c.asOf !== undefined && c.asOf <= LAST_FINISHED[s]) { dated += 1; continue; }
    if (c.asOf !== undefined) { fire('date-open', g.theme); fail(`${s} ${b.id}: "${g.theme}" is dated past the last finished season (${LAST_FINISHED[s]}), so a move in a season still being played can add a man`); }
    open += 1;
    for (const o of b.groups) if (o !== g) for (const p of o.players) {
      if (sports[s].checker.active?.(p) !== true || sports[s].checker.fits(p, c) === true) continue;
      n += 1;
      fire('trade', p);
      fail(`${s} ${b.id}: ${p} ("${o.theme}") is still playing and one move from "${g.theme}": date the group or rebuild the board`);
    }
  }
  console.log(`   ${s}: ${dated} dated club groups, ${open} undated, ${n} active men one move from a club group beside them`);
}

console.log('');
if (CONTROL) {
  /* red only when the rule this control names fired for the man or group it moved: every other failure is noise
     here, so a control whose own rule is deleted goes green and says so */
  const tally = {};
  for (const f of fires) tally[f.kind] = (tally[f.kind] ?? 0) + 1;
  const hits = own.kinds.map(k => fires.filter(f => f.kind === k && f.subject === fold(own.subject)).length);
  const by = Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing';
  if (hits.every(n => n > 0)) {
    console.error(`US_CONN_CONTROL=${CONTROL} fired its own rule ${hits.reduce((a, b) => a + b, 0)} time(s): ${own.kinds.map((k, i) => `${k} x${hits[i]}`).join(', ')} for ${own.subject} (all findings: ${by}; ${failures} failures in all)`);
    process.exit(1);
  }
  console.log(`US_CONN_CONTROL=${CONTROL} did NOT fire its own rule (${own.kinds.map((k, i) => `${k} x${hits[i]}`).join(', ')} for ${own.subject}); the ${failures} other failures do not count for it (findings: ${by}). This control proves nothing as the code stands.`);
  process.exit(0);
}
if (failures > 0) {
  console.error(`simUsConnectionsFacts: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
const gray = SPORTS.map(s => `${otherUnknown[s]} ${s}`).join(', ');
console.log(`simUsConnectionsFacts: green. Every Baseball, NFL and NHL Connections group is held to the record, and no board has a second right answer the record can see (other tiles it cannot judge, each at its ceiling: ${gray}).`);
