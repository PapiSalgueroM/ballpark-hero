/**
 * Round 535 harness: the soccer Higher or Lower pool is the pool the evidence
 * file says it is, every row says how well its cap figure is backed, and both
 * games still say it out loud.
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
 *   4. THE MARKING IS WIRED. A stat listed in HL_UNVERIFIED_STATS and a cap
 *      figure only one publisher stands behind both have to reach a player
 *      through both consumers, so a note cannot be quietly dropped while the
 *      number keeps deciding games. Read from the code with comments stripped,
 *      because prose about a check is the one place the string a check looks
 *      for is guaranteed to appear.
 *   5. THE POOL IS BIG ENOUGH FOR BOTH CONSUMERS, and is the size the evidence
 *      file accounts for. Measured against what each consumer actually needs,
 *      not a number that felt right.
 *   6. EVERY ROW IS IN EXACTLY ONE OF VERIFIED OR MARKED, every marked row
 *      names the publisher its number came from, and the file agrees with the
 *      record: a row the evidence calls VERIFIED cannot ship as marked, and a
 *      row it calls MARKED cannot ship as verified. This is the section that
 *      stops the site claiming a check nobody made.
 *
 * NEGATIVE CONTROLS, both of which rewrite a temp copy of the data file, both
 * of which refuse to run if the rewrite changed nothing, and both of which
 * fold CRLF before matching, because this repo is checked out with CRLF on
 * Windows and a control that cannot find its own string is a control that
 * never fires.
 *
 *   HL_CONTROL=anchor  moves one pinned cap by one. Section 1 must go red.
 *   HL_CONTROL=status  takes one name out of HL_CAPS_VERIFIED and puts it
 *                      nowhere, so the row's status flips while every number
 *                      in the file stays identical. Section 6 must go red.
 *                      That pair matters: the anchor control proves the
 *                      numbers are pinned, and this one proves the claim about
 *                      the numbers is pinned too, which is the thing a reader
 *                      of the card is actually trusting.
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

const CONTROLS = ['anchor', 'status'];
const CONTROL = process.env.HL_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`HL_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
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
   Caps only, on purpose. These eighteen are rows two publishers printed the
   same number for, so they are the column worth pinning. Pele's club pair is
   pinned for a different reason and it is worth being exact about which: it is
   NOT a two source agreement, no publisher reached prints his career on this
   file's convention. It is the one club total this round rewrote, so it is
   pinned to the published pair the evidence file argues for, and a silent
   drift back to an all matches figure goes red here rather than reaching the
   game. */
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

/* A handful of rows restored on a publisher read for the first time on
   2026-09-12, pinned so a later round cannot quietly put the old unsourced
   number back. Four of them are the reason the rows were read rather than
   restored on what the file already held: the file had Palmer on 24, Maddison
   on 12, Muniain on 10 and Tel on 6. */
const RESTORED_ANCHORS = {
  'Cole Palmer': 14,
  'James Maddison': 7,
  'Iker Muniain': 2,
  'Mathys Tel': 0,
  'Achraf Hakimi': 92,
  'Lev Yashin': 74,
  'Alfredo Di Stéfano': 31,
};

/* ── build the module under test ───────────────────────────────────────────
   Both the normal run and every control bundle the SAME stripped copy, so the
   only difference between them is the one thing the control changed. The strip
   removes the type import and the two type annotations, nothing else, and
   every step asserts the string it is about to remove is really there. */
function buildSource() {
  let src = read(DATA);
  const steps = [
    [/^import \{[^}]*\} from '@\/types\/higherLower';\n/m, ''],
    [': HigherLowerPlayer[]', ': any[]'],
    [': readonly HigherLowerStatKey[]', ': readonly string[]'],
  ];
  for (const [from, to] of steps) {
    const before = src;
    src = src.replace(from, to);
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

if (CONTROL === 'status') {
  /* the status flips, not a number: this name leaves HL_CAPS_VERIFIED and is
     added to nothing, so the row ships with no claim about how well its cap
     figure is backed, and every digit in the file is byte for byte the same */
  const who = 'Paolo Maldini';
  const line = `\n  '${who}',`;
  if (!source.includes(line)) {
    console.error(`control cannot find ${who} in HL_CAPS_VERIFIED, so it would change nothing. Refusing to run.`);
    process.exit(1);
  }
  const before = source;
  source = source.replace(line, '');
  if (source === before) {
    console.error('control rewrote nothing, so green would mean the control did not fire. Refusing to run.');
    process.exit(1);
  }
  const digits = s => s.replace(/\D+/g, '');
  if (digits(before) !== digits(source)) {
    console.error('control changed a number as well as a status, so a red would not prove what it claims. Refusing to run.');
    process.exit(1);
  }
  console.log(`   NEGATIVE CONTROL ON: ${who} dropped out of HL_CAPS_VERIFIED with every number untouched; section 6 must go red`);
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

/* the record, read once: every row's verdict, and the rows it accounts for */
const evidenceStatus = new Map(
  [...read(EVIDENCE).matchAll(/^\|\s*([^|]+?)\s*\|.*\|\s*(VERIFIED|CORRECTED|MARKED|REMOVED)\s*\|\s*$/gm)]
    .map(m => [m[1], m[2]]),
);

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
  for (const [name, caps] of Object.entries(RESTORED_ANCHORS)) {
    const row = pool.find(p => p.name === name);
    if (!row) { fail(`restored anchor ${name} is not in the pool any more`); continue; }
    if (row.stats.internationalCaps !== caps) {
      fail(`${name} caps are ${row.stats.internationalCaps}, the publisher read on 2026-09-12 printed ${caps}`);
    }
  }
  console.log(`   ${Object.keys(CAP_ANCHORS).length} cap anchors, ${Object.keys(CLUB_ANCHORS).length} club anchor and ${Object.keys(RESTORED_ANCHORS).length} restored anchors checked against ${pool.length} rows`);
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
  if (evidenceStatus.size < pool.length) {
    fail(`the evidence file lists ${evidenceStatus.size} rows with a status, the pool ships ${pool.length}`);
  }
  for (const p of pool) {
    const s = evidenceStatus.get(p.name);
    if (!s) fail(`${p.name} ships with no status in the evidence file`);
    else if (s === 'REMOVED') fail(`${p.name} is marked REMOVED in the evidence but is still in the pool`);
  }
  for (const [name, s] of evidenceStatus) {
    if (s === 'REMOVED' && seen.has(name)) fail(`${name} is REMOVED in the evidence but still shipping`);
  }
  console.log(`   ${pool.length} rows, ${evidenceStatus.size} statuses on record, no duplicate name, no impossible stat`);
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
    console.log(`   checked on ${on}, evidence file present`);
  }
}

console.log('4) the marking is wired');
{
  const unverified = P.HL_UNVERIFIED_STATS || [];
  if (!Array.isArray(unverified) || unverified.length === 0) fail('HL_UNVERIFIED_STATS is missing or empty');
  if (!P.HL_UNVERIFIED_NOTE) fail('HL_UNVERIFIED_STATS exists with no note to print');
  if (!P.HL_CAPS_NOTE) fail('there is no note to print on a cap figure only one publisher stands behind');
  for (const name of P.HL_PRE1985_CLUB || []) {
    if (!pool.some(p => p.name === name)) fail(`HL_PRE1985_CLUB names ${name}, who is not in the pool`);
  }
  if ((P.HL_PRE1985_CLUB || []).length && !P.HL_PRE1985_CLUB_NOTE) fail('HL_PRE1985_CLUB exists with no note to print');

  /* The rule itself, asked of the module rather than read off a list. An era
     row on a club stat gets the narrower note, any other row gets the pool
     wide one, a marked cap figure says so and a verified one says nothing. */
  if (typeof P.hlNoteFor !== 'function') fail('hlNoteFor is not exported, so the two consumers cannot share one rule');
  else {
    const era = (P.HL_PRE1985_CLUB || [])[0];
    const plain = pool.find(p => !(P.HL_PRE1985_CLUB || []).includes(p.name));
    if (era && P.hlNoteFor(era, unverified[0]) !== P.HL_PRE1985_CLUB_NOTE) fail(`hlNoteFor gives ${era} the wrong note on ${unverified[0]}`);
    if (plain && P.hlNoteFor(plain.name, unverified[0]) !== P.HL_UNVERIFIED_NOTE) fail(`hlNoteFor gives ${plain.name} the wrong note on ${unverified[0]}`);
    const aVerified = (P.HL_CAPS_VERIFIED || [])[0];
    const aMarked = Object.keys(P.HL_CAPS_MARKED || {})[0];
    if (aVerified && P.hlNoteFor(aVerified, 'internationalCaps') !== null) {
      fail(`hlNoteFor prints a caveat on ${aVerified}'s caps, which two publishers printed the same`);
    }
    if (aMarked && P.hlNoteFor(aMarked, 'internationalCaps') !== P.HL_CAPS_NOTE) {
      fail(`hlNoteFor says nothing about ${aMarked}'s caps, which only one publisher stands behind`);
    }
  }

  /* Both consumers must ask the shared rule, not carry a copy of it. A copy
     is how one game keeps printing a caveat the other one dropped. */
  const consumers = [
    ['src/hooks/useHigherLower.ts', 'hlNoteFor'],
    ['src/lib/faceOff.ts', 'hlNoteFor'],
  ];
  for (const [rel, token] of consumers) {
    const code = codeOnly(read(path.join(ROOT, rel)));
    if (!code.includes(token)) fail(`${rel} never asks ${token}, so the marked numbers ship with nothing said`);
  }
  /* and it has to reach the screen, not just the module. On /higher-lower the
     card asks about every stat it shows, not one of them, which is the bug
     this section grew to catch: the page asked only about appearances, so a
     cap figure could be marked in the data and silent on screen. */
  const hl = codeOnly(read(path.join(ROOT, 'src/pages/HigherLower.tsx')));
  if (!hl.includes('provenanceNotes')) fail('src/pages/HigherLower.tsx never renders the notes (provenanceNotes missing)');
  if (!/statKeys\.map\(\s*\(?stat\)?\s*=>\s*noteFor\(/.test(hl)) {
    fail('src/pages/HigherLower.tsx asks noteFor about one stat instead of every stat on the card, so a marked cap figure would print nothing');
  }
  const fo = codeOnly(read(path.join(ROOT, 'src/pages/FaceOff.tsx')));
  for (const token of ['current.note', 'ath.note']) {
    if (!fo.includes(token)) fail(`src/pages/FaceOff.tsx never renders the note (${token} missing)`);
  }
  console.log(`   ${unverified.length} stats unchecked pool wide, ${Object.keys(P.HL_CAPS_MARKED || {}).length} cap figures marked, ${(P.HL_PRE1985_CLUB || []).length} rows marked further, both consumers ask one rule and both pages print it`);
}

console.log('5) the pool is big enough for both consumers');
{
  /* /face-off pickPair needs two athletes with a positive value inside the
     ratio band, in every soccer category, and deals ten rounds without using
     an athlete twice. /higher-lower excludes only the previous name, so it
     needs far less; the binding constraint is Face Off. */
  const MIN_RATIO = 1.04, MAX_RATIO = 4;
  /* The pool the evidence accounts for, not a number typed here: the record
     lists every row it removed, so anything else it lists has to ship. */
  const accounted = [...evidenceStatus.values()].filter(s => s !== 'REMOVED').length;
  if (pool.length !== accounted) {
    fail(`the pool ships ${pool.length} rows, the evidence file accounts for ${accounted} that are not REMOVED`);
  }
  /* A ratchet, not a target. The pool was cut to 70 rows for failing a test
     the rest of the file was not held to, and came back to 199. A drop below
     150 is that mistake happening again and should need a conversation. */
  if (pool.length < 150) fail(`the pool is down to ${pool.length} rows, which is the Round 535 regression, not a trim`);

  for (const stat of ['appearances', 'goals', 'internationalCaps']) {
    const vals = pool.map(p => p.stats[stat]).filter(v => v > 0);
    if (vals.length < 12) fail(`${stat} has only ${vals.length} rows with a positive number`);
    let legal = 0;
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      const hi = Math.max(vals[i], vals[j]), lo = Math.min(vals[i], vals[j]);
      if (hi / lo >= MIN_RATIO && hi / lo <= MAX_RATIO) legal += 1;
    }
    /* measured on this pool: goals is the thinnest of the three at 9582 legal
       pairs, appearances the widest at 17654. Pairs go with the square of the
       pool, so a halved pool still makes about 2400 of them; 2000 is under
       that and far above the dozen either game needs in a session. */
    if (legal < 2000) fail(`${stat} can make ${legal} legal pairs, wanted 2000 or more`);
    console.log(`   ${stat}: ${vals.length} usable rows, ${legal} legal pairs`);
  }
}

console.log('6) every row is in exactly one of verified or marked');
{
  const verified = new Set(P.HL_CAPS_VERIFIED || []);
  const marked = P.HL_CAPS_MARKED || {};
  const has = n => Object.prototype.hasOwnProperty.call(marked, n);
  if (!verified.size) fail('HL_CAPS_VERIFIED is missing or empty');
  if (!Object.keys(marked).length) fail('HL_CAPS_MARKED is missing or empty');

  for (const p of pool) {
    const inV = verified.has(p.name), inM = has(p.name);
    if (inV && inM) fail(`${p.name} is in HL_CAPS_VERIFIED and HL_CAPS_MARKED at once, so the card's claim depends on which list is read first`);
    if (!inV && !inM) fail(`${p.name} is in neither list, so nothing says whether one publisher or two stand behind that cap figure`);
    if (inM && !/^https:\/\/\S+$/.test(marked[p.name] || '')) {
      fail(`${p.name} is marked with no source URL, which is a caveat without a publisher behind it`);
    }
    /* the file and the record have to say the same thing */
    const s = evidenceStatus.get(p.name);
    if ((s === 'VERIFIED' || s === 'CORRECTED') && !inV) {
      fail(`the evidence calls ${p.name} ${s} but the file does not have him in HL_CAPS_VERIFIED`);
    }
    if (s === 'MARKED' && !inM) {
      fail(`the evidence calls ${p.name} MARKED but the file does not have him in HL_CAPS_MARKED`);
    }
  }
  for (const n of verified) if (!pool.some(p => p.name === n)) fail(`HL_CAPS_VERIFIED names ${n}, who is not in the pool`);
  for (const n of Object.keys(marked)) if (!pool.some(p => p.name === n)) fail(`HL_CAPS_MARKED names ${n}, who is not in the pool`);

  const hosts = {};
  for (const n of Object.keys(marked)) {
    const h = new URL(marked[n]).hostname;
    hosts[h] = (hosts[h] || 0) + 1;
  }
  console.log(`   ${verified.size} verified, ${Object.keys(marked).length} marked, ${pool.length} rows, publishers behind the marked ones: ${Object.entries(hosts).map(([h, n]) => `${h} ${n}`).join(', ')}`);
}

if (failures) {
  console.error(`\nsimHigherLower: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimHigherLower: all sections green');
