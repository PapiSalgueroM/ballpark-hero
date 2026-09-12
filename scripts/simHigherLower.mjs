/**
 * Round 535 harness: the soccer Higher or Lower pool is the pool the evidence
 * file says it is, and it still says out loud which of its numbers are not
 * finished.
 *
 *   1. THE ANCHORS. Eighteen numbers pinned from
 *      docs/audits/higher-lower-verification-2026-09-12.md, each one a value
 *      two independent publishers printed the same. If one moves, this goes red.
 *   2. THE SMELL LIST. No negative or fractional stat, no international caps
 *      above club appearances, no goals above appearances, no name twice, and
 *      every shipped row carries a status in the evidence file while every row
 *      the evidence removed stays removed.
 *   3. THE HEADER DATE IS REAL. HL_VERIFIED_ON parses as a date, is not in the
 *      future, and the evidence file it names exists.
 *   4. THE MARKING IS WIRED. A stat listed in HL_UNVERIFIED_STATS has to reach
 *      a player through both consumers, so the note cannot be quietly dropped
 *      while the unverified number keeps deciding games. Read from the code
 *      with comments stripped, because prose about a check is the one place the
 *      string a check looks for is guaranteed to appear.
 *   5. THE POOL IS BIG ENOUGH FOR BOTH CONSUMERS. Measured against what each
 *      one actually needs, not a number that felt right.
 *
 * NEGATIVE CONTROL: HL_CONTROL=anchor moves one pinned cap by one in a temp
 * copy of the data file and section 1 must go red. It refuses to run if the
 * rewrite changed nothing, and it folds CRLF before matching, because this
 * repo is checked out with CRLF on Windows and a control that cannot find its
 * own string is a control that never fires.
 *
 * Run: node scripts/simHigherLower.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data', 'higherLowerPlayers.ts');
const EVIDENCE = path.join(ROOT, 'docs', 'audits', 'higher-lower-verification-2026-09-12.md');

const CONTROL = process.env.HL_CONTROL || '';
if (CONTROL && CONTROL !== 'anchor') {
  console.error(`HL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** every read folds CRLF, so a match never depends on the checkout's line endings */
const read = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

/** the code with comments gone, so a guard reads the code and not the prose about it */
function codeOnly(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

/* ── the anchors, lifted from the evidence file ─────────────────────────────
   Caps only, on purpose. Caps are the column two publishers agreed on, so they
   are the column worth pinning. Pele's club pair is pinned as well because it
   is the one club total this round rewrote, from the all matches figure that
   counts friendlies to the competitive one. */
const CAP_ANCHORS = {
  'Sergio Ramos': 180,
  'Gianluigi Buffon': 176,
  'Alexis Sánchez': 168,
  'Iker Casillas': 167,
  'Lothar Matthäus': 150,
  'Arturo Vidal': 147,
  'Cafu': 142,
  'Fabio Cannavaro': 136,
  'Xavi': 133,
  'Andrés Iniesta': 131,
  'Paolo Maldini': 126,
  'Roberto Carlos': 125,
  'Thierry Henry': 123,
  'David Beckham': 115,
  'Zinedine Zidane': 108,
  'Pelé': 92,
  'Alan Shearer': 63,
  'Johan Cruyff': 48,
};
const CLUB_ANCHORS = {
  'Pelé': { appearances: 647, goals: 606 },
};

/* ── build the module under test ───────────────────────────────────────────
   Both the normal run and the control bundle the SAME stripped copy, so the
   only difference between them is one digit. The strip removes the type import
   and the two type annotations, nothing else, and every step asserts the string
   it is about to remove is really there. */
function buildSource() {
  let src = read(DATA);
  const steps = [
    [/^import \{[^}]*\} from '@\/types\/higherLower';\n/m, ''],
    [': HigherLowerPlayer[]', ': any[]'],
    [': readonly HigherLowerStatKey[]', ': readonly string[]'],
  ];
  for (const [from, to] of steps) {
    const before = src;
    src = typeof from === 'string' ? src.replace(from, to) : src.replace(from, to);
    if (src === before) {
      console.error(`cannot strip ${from} from the data file, so the harness would be testing something else. Refusing to run.`);
      process.exit(1);
    }
  }
  return src;
}

let source = buildSource();

if (CONTROL === 'anchor') {
  const who = 'Paolo Maldini';
  const old = `{ name: "${who}"`;
  if (!source.includes(old)) {
    console.error(`control cannot find the ${who} row, so it would change nothing. Refusing to run.`);
    process.exit(1);
  }
  const before = source;
  source = source.replace(
    new RegExp(`(\\{ name: "${who}"[^}]*internationalCaps: )${CAP_ANCHORS[who]}`),
    `$1${CAP_ANCHORS[who] + 1}`,
  );
  if (source === before) {
    console.error('control rewrote nothing, so green would mean the control did not fire. Refusing to run.');
    process.exit(1);
  }
  console.log(`   NEGATIVE CONTROL ON: ${who} caps moved from ${CAP_ANCHORS[who]} to ${CAP_ANCHORS[who] + 1}; section 1 must go red`);
}

const SRC_TS = path.join(os.tmpdir(), 'hlPool.source.ts');
const BUNDLE = path.join(os.tmpdir(), 'hlPool.bundle.mjs');
fs.writeFileSync(SRC_TS, source);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${SRC_TS}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const P = await import(pathToFileURL(BUNDLE).href + `?t=${Date.now()}`);
const pool = P.higherLowerPlayers;

console.log('1) the anchors');
{
  for (const [name, caps] of Object.entries(CAP_ANCHORS)) {
    const row = pool.find(p => p.name === name);
    if (!row) { fail(`anchor ${name} is not in the pool any more`); continue; }
    if (row.stats.internationalCaps !== caps) {
      fail(`${name} caps are ${row.stats.internationalCaps}, the evidence pinned ${caps}`);
    }
  }
  for (const [name, want] of Object.entries(CLUB_ANCHORS)) {
    const row = pool.find(p => p.name === name);
    if (!row) { fail(`anchor ${name} is not in the pool any more`); continue; }
    for (const k of Object.keys(want)) {
      if (row.stats[k] !== want[k]) fail(`${name} ${k} is ${row.stats[k]}, the evidence pinned ${want[k]}`);
    }
  }
  console.log(`   ${Object.keys(CAP_ANCHORS).length} cap anchors and ${Object.keys(CLUB_ANCHORS).length} club anchor checked against ${pool.length} rows`);
}

console.log('2) the smell list');
{
  const seen = new Set();
  for (const p of pool) {
    if (!p.name || typeof p.name !== 'string') { fail('a row has no name'); continue; }
    if (seen.has(p.name)) fail(`${p.name} appears twice`);
    seen.add(p.name);
    if (!p.nationality) fail(`${p.name} has no nationality`);
    for (const [k, v] of Object.entries(p.stats)) {
      if (typeof v !== 'number' || !Number.isFinite(v)) { fail(`${p.name} ${k} is not a number`); continue; }
      if (v < 0) fail(`${p.name} ${k} is negative (${v})`);
      if (!Number.isInteger(v)) fail(`${p.name} ${k} is not a whole number (${v})`);
    }
    if (p.stats.internationalCaps > p.stats.appearances) {
      fail(`${p.name} has more international caps (${p.stats.internationalCaps}) than club appearances (${p.stats.appearances})`);
    }
    if (p.stats.goals > p.stats.appearances) {
      fail(`${p.name} has more goals (${p.stats.goals}) than appearances (${p.stats.appearances}), which is the all matches goal total against a competitive appearance total`);
    }
  }

  /* every shipped row has a verdict on the record, and every verdict that says
     REMOVED really is gone */
  const evidence = read(EVIDENCE);
  const rows = [...evidence.matchAll(/^\|\s*([^|]+?)\s*\|.*\|\s*(VERIFIED|CORRECTED|REMOVED|MARKED)\s*\|\s*$/gm)];
  if (rows.length < pool.length) {
    fail(`the evidence file lists ${rows.length} rows with a status, the pool ships ${pool.length}`);
  }
  const status = new Map(rows.map(m => [m[1], m[2]]));
  for (const p of pool) {
    const s = status.get(p.name);
    if (!s) fail(`${p.name} ships with no status in the evidence file`);
    else if (s === 'REMOVED') fail(`${p.name} is marked REMOVED in the evidence but is still in the pool`);
  }
  for (const [name, s] of status) {
    if (s === 'REMOVED' && seen.has(name)) fail(`${name} is REMOVED in the evidence but still shipping`);
  }
  console.log(`   ${pool.length} rows, ${status.size} statuses on record, no duplicate name, no impossible stat`);
}

console.log('3) the header date is real');
{
  const on = P.HL_VERIFIED_ON;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on || '')) fail(`HL_VERIFIED_ON is not an ISO date: ${on}`);
  else {
    const d = new Date(on + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) fail(`HL_VERIFIED_ON is not a real date: ${on}`);
    if (d.getTime() > Date.now()) fail(`HL_VERIFIED_ON is in the future: ${on}`);
    const named = path.join(ROOT, 'docs', 'audits', `higher-lower-verification-${on}.md`);
    if (!fs.existsSync(named)) fail(`HL_VERIFIED_ON says ${on} but there is no evidence file at ${path.relative(ROOT, named)}`);
    console.log(`   verified on ${on}, evidence file present`);
  }
}

console.log('4) the marking is wired');
{
  const unverified = P.HL_UNVERIFIED_STATS || [];
  if (!Array.isArray(unverified)) fail('HL_UNVERIFIED_STATS is not a list');
  if (!P.HL_UNVERIFIED_NOTE) fail('HL_UNVERIFIED_STATS exists with no note to print');
  for (const name of P.HL_MARKED || []) {
    if (!pool.some(p => p.name === name)) fail(`HL_MARKED names ${name}, who is not in the pool`);
  }
  if ((P.HL_MARKED || []).length && !P.HL_MARKED_NOTE) fail('HL_MARKED exists with no note to print');

  /* The rule itself, asked of the module rather than read off a list. A marked
     player on an unverified stat gets the narrower note, an unmarked one gets
     the pool wide note, and a verified stat gets nothing. */
  if (typeof P.hlNoteFor !== 'function') fail('hlNoteFor is not exported, so the two consumers cannot share one rule');
  else if (unverified.length && (P.HL_MARKED || []).length) {
    const marked = P.HL_MARKED[0];
    const plain = pool.find(p => !(P.HL_MARKED || []).includes(p.name));
    const verified = ['appearances', 'goals', 'internationalCaps'].find(s => !unverified.includes(s));
    if (P.hlNoteFor(marked, unverified[0]) !== P.HL_MARKED_NOTE) fail(`hlNoteFor gives ${marked} the wrong note on ${unverified[0]}`);
    if (plain && P.hlNoteFor(plain.name, unverified[0]) !== P.HL_UNVERIFIED_NOTE) fail(`hlNoteFor gives ${plain.name} the wrong note on ${unverified[0]}`);
    if (verified && P.hlNoteFor(marked, verified) !== null) fail(`hlNoteFor prints a caveat on ${verified}, which is two source verified`);
  }

  if (unverified.length) {
    /* Both consumers must ask the shared rule, not carry a copy of it. A copy
       is how one game keeps printing a caveat the other one dropped. */
    const consumers = [
      ['src/hooks/useHigherLower.ts', 'hlNoteFor'],
      ['src/lib/faceOff.ts', 'hlNoteFor'],
    ];
    for (const [rel, token] of consumers) {
      const code = codeOnly(read(path.join(ROOT, rel)));
      if (!code.includes(token)) fail(`${rel} never asks ${token}, so the unverified stats ship with nothing said`);
    }
    /* and it has to reach the screen, not just the module. Two tokens per page:
       the pool wide line and, on Face Off, the per card one that carries
       HL_MARKED. */
    const pages = [
      ['src/pages/HigherLower.tsx', ['provenanceNote']],
      ['src/pages/FaceOff.tsx', ['current.note', 'ath.note']],
    ];
    for (const [rel, tokens] of pages) {
      const code = codeOnly(read(path.join(ROOT, rel)));
      for (const token of tokens) {
        if (!code.includes(token)) fail(`${rel} never renders the note (${token} missing)`);
      }
    }
    console.log(`   ${unverified.length} stats marked unverified, ${(P.HL_MARKED || []).length} rows marked further, both consumers ask one rule and both pages print it`);
  }
}

console.log('5) the pool is big enough for both consumers');
{
  /* /face-off pickPair needs two athletes with a positive value inside the
     ratio band, in every soccer category, and deals ten rounds without using
     an athlete twice. /higher-lower excludes only the previous name, so it
     needs far less; the binding constraint is Face Off. */
  const MIN_RATIO = 1.04, MAX_RATIO = 4;
  for (const stat of ['appearances', 'goals', 'internationalCaps']) {
    const vals = pool.map(p => p.stats[stat]).filter(v => v > 0);
    if (vals.length < 12) fail(`${stat} has only ${vals.length} rows with a positive number`);
    let legal = 0;
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      const hi = Math.max(vals[i], vals[j]), lo = Math.min(vals[i], vals[j]);
      if (hi / lo >= MIN_RATIO && hi / lo <= MAX_RATIO) legal += 1;
    }
    /* measured on this pool: the thinnest of the three makes several hundred
       legal pairs, so 60 is a floor a halved pool would still clear */
    if (legal < 60) fail(`${stat} can make ${legal} legal pairs, wanted 60 or more`);
    console.log(`   ${stat}: ${vals.length} usable rows, ${legal} legal pairs`);
  }
}

if (failures) {
  console.error(`\nsimHigherLower: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimHigherLower: all sections green');
