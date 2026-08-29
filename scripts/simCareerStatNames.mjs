/**
 * ROUND 349: the flagship must not name a stat it does not have.
 *
 * Soccer Career tells the player what a choice will cost before they take it
 * ("Morale -5, Popularity +5") and what it did afterwards. Those lines are the
 * only contract the game offers, and two of them were not being kept.
 *
 * WHAT THIS ROUND FOUND, and the difference between the two matters:
 *
 *   1. A VOCABULARY SPLIT. Seventeen player-facing lines said "Reputation" for
 *      a stat the UI draws as "Popularity". The effect was always applied, so
 *      nothing was lost, but the player reads "Reputation +20", looks at the
 *      two bars on screen, finds Popularity and Morale, and cannot tell whether
 *      the game did what it said. One stat, one name.
 *
 *   2. A PROMISE NEVER KEPT. The World Cup Snub event offered "Morale -5,
 *      Respect +5" and its apply() only did the morale hit. There is no respect
 *      stat, so the +5 went nowhere, which left the graceful choice worse than
 *      advertised and worse than the loud choice beside it, whose Popularity +5
 *      is real. That one was a bug, not a wording slip.
 *
 * WHY A LEDGER RATHER THAN A RULE. The obvious fence, "every stat named in a
 * delta must be a real state field", is wrong here and measuring said so: the
 * engine legitimately writes "lawyers +1M", "hypercar -1.5M" and "Injury
 * recovery -50%", which are prose about money and flavour, not stats. A fence
 * that flagged those would be argued away within a round and then ignored.
 *
 * So the vocabulary is CLOSED instead, the same shape as the sitemap's lastmod
 * ledger: every distinct name used in a delta is recorded in
 * scripts/data/careerStatNames.json with what backs it, and ANY name not in the
 * ledger fails. That is what makes this fence catch the next one: it does not
 * need to know that "Charisma" or "Fitness" or "Swagger" is the invented word,
 * because any word nobody has signed off on is a failure by default. A name
 * that really is a new stat gets added to the ledger in the same round that
 * adds the stat, deliberately, by a person.
 *
 * The ledger also records, per name, the state field behind it. Entries marked
 * with a field are checked against the source: if that field is renamed or
 * removed the fence goes red, so the ledger cannot quietly rot into fiction.
 *
 * NEGATIVE CONTROL: STATNAME_CONTROL=phantom plants "Charisma +10" into the
 * scanned source in memory, exactly the shape of the bug this round removed,
 * and the check must go red. It refuses to run if the plant changed nothing.
 *
 * Run: node scripts/simCareerStatNames.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const LEDGER = path.join(ROOT, 'scripts/data/careerStatNames.json');
const CONTROL = process.env.STATNAME_CONTROL || '';
if (CONTROL && CONTROL !== 'phantom') {
  console.error(`STATNAME_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* Comments are stripped before anything is read. Four times in one day this
   repo had a guard satisfied by the prose explaining why the guard existed,
   and the doc comment above this very file names both offending words. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** Every string literal the player can read, single, double and template. */
function playerFacingStrings(src) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`|'((?:[^'\\]|\\.)*)'/g;
  for (const m of src.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

/** The word immediately before a signed number, which is how this engine
 *  writes every consequence: "Popularity +20", "Morale -5", "lawyers +1M". */
function deltaNames(strings) {
  const counts = new Map();
  for (const s of strings) {
    for (const m of s.matchAll(/([A-Za-z][A-Za-z]*)\s([+-]\d)/g)) {
      const name = m[1].toLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

const rawSrc = fs.readFileSync(ENGINE, 'utf8');
let src = stripComments(rawSrc);

if (CONTROL === 'phantom') {
  /* Plant the exact shape of the bug: a stat word nobody signed off on,
     inside a consequence line. Refuse if the anchor is not there to plant on. */
  const anchor = 'consequence: "Morale -5, Popularity +5"';
  if (!src.includes(anchor)) {
    console.error(`STATNAME_CONTROL=phantom: the anchor is gone, so the plant would change nothing. Refusing to run.\n  looked for: ${anchor}`);
    process.exit(1);
  }
  const before = deltaNames(playerFacingStrings(src)).get('charisma') ?? 0;
  src = src.replace(anchor, 'consequence: "Morale -5, Popularity +5, Charisma +10"');
  const after = deltaNames(playerFacingStrings(src)).get('charisma') ?? 0;
  if (after <= before) {
    console.error('STATNAME_CONTROL=phantom: the plant did not land, so this run proves nothing. Refusing.');
    process.exit(1);
  }
  console.log('STATNAME_CONTROL=phantom: planted "Charisma +10" into a real consequence line.');
}

const found = deltaNames(playerFacingStrings(src));
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const known = new Map(Object.entries(ledger.names));

let failures = 0;

/* 1. No name the ledger has not signed off on. This is the check that catches
      the next invented stat, because it does not need to know its name. */
const unknown = [...found.keys()].filter(n => !known.has(n)).sort();
if (unknown.length > 0) {
  failures++;
  console.error(`FAIL: ${unknown.length} delta name(s) appear in player-facing copy that the ledger does not know:`);
  for (const n of unknown) console.error(`    "${n}" (${found.get(n)} use(s))`);
  console.error('  If one is a real new stat, add it to scripts/data/careerStatNames.json in the round that adds the stat.');
  console.error('  If it is a synonym for a stat that already exists, use the existing name instead.');
}

/* 2. No ledger entry marked "unbacked", the class this round removed: a stat
      word with nothing behind it, so the game promises what it cannot pay. */
const unbacked = [...known.entries()].filter(([n, e]) => e.backing === 'unbacked' && found.has(n));
if (unbacked.length > 0) {
  failures++;
  console.error(`FAIL: ${unbacked.length} name(s) are recorded as backed by nothing and are still in the copy:`);
  for (const [n] of unbacked) console.error(`    "${n}"`);
}

/* 3. Every ledger entry that claims a state field must still find it, so the
      ledger cannot rot into fiction while the engine moves underneath it. */
const missingField = [];
for (const [n, e] of known) {
  if (!e.field) continue;
  const decl = new RegExp(`^\\s+${e.field}\\s*\\??:`, 'm');
  if (!decl.test(rawSrc)) missingField.push(`${n} -> ${e.field}`);
}
if (missingField.length > 0) {
  failures++;
  console.error(`FAIL: ${missingField.length} ledger entr(ies) name a state field the engine no longer declares:`);
  for (const m of missingField) console.error(`    ${m}`);
}

console.log('');
console.log(`${found.size} distinct delta names in player-facing copy, ${known.size} in the ledger.`);
const backedByField = [...known.entries()].filter(([n, e]) => e.field && found.has(n)).length;
console.log(`${backedByField} of the names in use resolve to a real state field; the rest are recorded as prose (money and flavour, not stats).`);

if (CONTROL === 'phantom') {
  if (failures > 0) {
    console.log('simCareerStatNames control: green. The planted stat word went red, so the closed vocabulary is what passes this file.');
    process.exit(0);
  }
  console.error('simCareerStatNames control: RED. "Charisma +10" was planted and the check still passed.');
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimCareerStatNames: ${failures} failure(s). The flagship is naming a stat it does not have.`);
  process.exit(1);
}
console.log('simCareerStatNames: green. Every consequence the career promises names something the game actually has.');
