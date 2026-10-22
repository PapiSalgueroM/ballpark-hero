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
 *      false on two hosts in the ledger, matched by the claim, not the spelling
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
 *   7) the groups and members the record cannot judge may only get fewer
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
 *   US_CONN_CONTROL=bell      Le'Veon Bell back in nflconn-004's Steelers group, beside its Ravens
 *   US_CONN_CONTROL=karlsson  Erik Karlsson back in nhlconn-004's Sharks group, beside 1,000 points
 *   US_CONN_CONTROL=twice     "Rich Gossage" back beside "Goose Gossage" on bconn-049
 *   US_CONN_CONTROL=onehost   one ledger fact loses its second host
 *   US_CONN_CONTROL=unjudged  "Played in Japan before MLB" back on bconn-002
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

let failures = 0;
const fired = { count: 0 };
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

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
    }
  } else if (CONTROL === 'bell') {
    const b = boardOf('nfl', 'nflconn-004');
    const g = b?.groups.find(x => x.theme === 'Played for the Steelers');
    if (g && b.groups.some(x => x.theme === 'Played for the Ravens') && g.players.includes('Ben Roethlisberger')) {
      g.players[g.players.indexOf('Ben Roethlisberger')] = "Le'Veon Bell";
      changed = true;
    }
  } else if (CONTROL === 'karlsson') {
    const b = boardOf('nhl', 'nhlconn-004');
    const g = b?.groups.find(x => x.theme === 'Played for the Sharks');
    if (g && b.groups.some(x => x.theme === '1,000+ career points') && g.players.includes('Marc-Edouard Vlasic')) {
      g.players[g.players.indexOf('Marc-Edouard Vlasic')] = 'Erik Karlsson';
      changed = true;
    }
  } else if (CONTROL === 'twice') {
    const b = boardOf('baseball', 'bconn-049');
    const g = b?.groups.find(x => x.players.includes('Goose Gossage'));
    if (g && g.players.includes('Bruce Sutter')) { g.players[g.players.indexOf('Bruce Sutter')] = 'Rich Gossage'; changed = true; }
  } else if (CONTROL === 'onehost') {
    const f = (ledgerOf('baseball').facts ?? []).find(x => x.sources?.length === 2);
    if (f) { console.log(`US_CONN_CONTROL=onehost: ${f.name} in "${f.label}" keeps only ${f.sources[0].host}`); f.sources = [f.sources[0]]; changed = true; }
  } else if (CONTROL === 'unjudged') {
    const b = boardOf('baseball', 'bconn-002');
    const g = b?.groups.find(x => x.theme === 'Born in Japan');
    if (g) { g.theme = 'Played in Japan before MLB'; changed = true; }
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
      if (fold(g.theme) === fold(r.label) && g.players.some(p => fold(p) === fold(r.name))) {
        n += 1;
        fired.count += 1;
        fail(`${s} ${b.id}: ${r.name} in "${g.theme}" is refuted on two hosts (${r.sources.map(x => x.says).join(' / ')})`);
      }
    }
  }
  console.log(`   ${s}: ${refuted.length} refuted claims held off every board, ${n} found`);
}

console.log('3) the ledger stands on two hosts');
for (const s of SPORTS) {
  const L = ledgerOf(s);
  const facts = L.facts ?? [];
  let bad = 0;
  for (const f of facts) if (!hostsOk(f.sources)) { bad += 1; fired.count += 1; fail(`${s}: ${f.name} in "${f.label}" (${f.holds ? 'fits' : 'does not fit'}) does not stand on two hosts`); }
  for (const [k, w] of Object.entries(L.watchLines ?? {})) if (!hostsOk(w.sources)) fail(`${s}: the line ${k} does not stand on two hosts`);
  if (live.has(s)) { console.log(`   ${s}: ${facts.length} facts (the flagged groups are the file's, not checked against a live export)`); continue; }
  /* every member of a group the round flagged is held to it by a fact */
  /* a fact is about a man and a label, whichever board deals them together */
  const holding = new Set(facts.filter(f => f.holds).map(f => `${fold(f.label)}|${fold(f.name)}`));
  let members = 0;
  for (const [id, label] of L.flaggedGroups ?? []) {
    const b = boardOf(s, id);
    const g = b?.groups.find(x => x.theme === label);
    if (!g) { fail(`${s} ${id}: the ledger flags "${label}" and the board has no such group`); continue; }
    for (const p of g.players) {
      members += 1;
      if (!holding.has(`${fold(label)}|${fold(p)}`)) { fired.count += 1; fail(`${s} ${id}: ${p} in "${label}" has no two host fact`); }
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
    if (!behind.has(want) && !behind.has(k)) { fired.count += 1; fail(`${s}: the fixed finding "${k}" has no fact`); }
  }
  console.log(`   ${s}: ${facts.length} facts, ${bad} on one host; ${(L.flaggedGroups ?? []).length} flagged groups, ${members} members held; ${(L.fixed ?? []).length} fixed findings`);
}

console.log('4) one right answer: the shared cross check over every board');
const unchecked = {};
const memberUnknown = {};
for (const s of SPORTS) {
  const cross = crossCheckBoards(boards[s], { ...sports[s].checker, labelOf });
  for (const f of cross.findings) {
    fired.count += 1;
    fail(`${s} ${findingKey(f)}${f.kind === 'second-fit' ? ', so the board has two right answers' : ''}`);
  }
  unchecked[s] = cross.unchecked;
  memberUnknown[s] = cross.memberUnknown;
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
      if (why) { n += 1; fired.count += 1; fail(`${s} ${b.id}: ${p} ("${o.theme}") may join "${g.theme}": ${why}`); }
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
      if (seen.has(id)) { n += 1; fired.count += 1; fail(`${s} ${b.id}: "${seen.get(id)}" and "${p}" are the same man`); }
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
  if (!live.has(s) && !CONTROL) {
    if (n !== (L.uncheckedCeiling ?? -1)) fail(`${s}: ${n} groups nothing judges, the ledger's uncheckedCeiling says ${L.uncheckedCeiling}: ${n > L.uncheckedCeiling ? 'one came back' : 'lower the ceiling'}`);
    if (u !== (L.memberUnknownCeiling ?? -1)) fail(`${s}: ${u} members the record cannot place, the ledger's memberUnknownCeiling says ${L.memberUnknownCeiling}: ${u > L.memberUnknownCeiling ? 'one came back' : 'lower the ceiling'}`);
  } else if (CONTROL && n > (L.uncheckedCeiling ?? 0)) { fired.count += 1; fail(`${s}: ${n} groups nothing judges, over the ceiling of ${L.uncheckedCeiling}`); }
  console.log(`   ${s}: ${n} groups nothing judges (ceiling ${L.uncheckedCeiling}), ${u} members the record cannot place (ceiling ${L.memberUnknownCeiling})${n ? `: ${unchecked[s].map(x => `${x.id} "${x.label}"`).join(', ')}` : ''}`);
}

console.log('');
if (CONTROL) console.log(`US_CONN_CONTROL=${CONTROL} fired ${fired.count} time${fired.count === 1 ? '' : 's'}`);
if (failures > 0) {
  console.error(`simUsConnectionsFacts: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simUsConnectionsFacts: green. Every Baseball, NFL and NHL Connections group is held to the record, and every board has one right answer.');
