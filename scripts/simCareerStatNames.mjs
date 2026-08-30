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
 * ROUND 351 ADDED SECTION 4, because naming a real stat is not the same as
 * changing it. Round 349 made every consequence name something the game has;
 * section 4 asks whether the choice actually DOES what its own line promises,
 * and six had drifted apart: three "Social media +NNk" lines delivered no
 * followers at all, a "Legacy +5" paid out in popularity and morale instead,
 * an "Overall +1" was really a shooting boost banked for next season, and a
 * "Red cards +1" recorded no card (redCards lives on SeasonRecord, so there
 * was no counter here to raise and faking one into the season being played
 * would have risked the record itself; that promise was reworded to the ban
 * that really happens). It also corrected two ledger mappings from Round 349
 * that had pointed at a same-named field on a different interface, "legacy"
 * at the computed LegacyResult rather than the integrityBonus counter behind
 * it, and "wage" at a club offer field rather than CareerState's weeklyWage.
 * That near miss is the argument for section 3 existing.
 *
 * NEGATIVE CONTROLS, both of which refuse to run if the plant changes nothing:
 *   STATNAME_CONTROL=phantom plants "Charisma +10" into the scanned source in
 *     memory, the shape of the Round 349 bug, and sections 1 to 3 must go red.
 *   STATNAME_CONTROL=broken strips the payout out of a promise that is
 *     currently kept, the shape of the Round 351 bug, and section 4 must go
 *     red, so its green means the promises are really kept and not merely
 *     counted.
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
if (CONTROL && !['phantom', 'broken'].includes(CONTROL)) {
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

/* 4. ROUND 351: naming a real stat is not the same as changing it.
 *
 * Round 349 made every consequence name something the game has. This section
 * asks the harder question: does the choice actually DO what its own line
 * promises? Each choice in the event pools carries a consequence string the
 * player reads before deciding and an apply() that runs after, and they had
 * drifted apart in six places. Three "Social media +NNk" lines delivered no
 * followers at all, a "Legacy +5" paid out in popularity and morale instead,
 * an "Overall +1" was really a shooting boost, and a "Red cards +1" recorded
 * no card.
 *
 * The pairing is textual on purpose. Driving the engine would need the event
 * pool exported and would only reach the choices a random career happened to
 * offer, which is coverage by luck; the apply body sits right beside its own
 * promise, so reading the pair is both complete and deterministic.
 *
 * A promise counts as kept when the apply body touches the field the ledger
 * says that name means. The one deliberate widening: a promise that says
 * "next season" may be paid through statBoostNextSeason rather than the
 * attribute itself, because that is how the engine banks a future boost.
 */
function choicesWithApply(source) {
  const out = [];
  for (const m of source.matchAll(/consequence:\s*"((?:[^"\\]|\\.)*)"/g)) {
    const applyIdx = source.indexOf('apply:', m.index);
    if (applyIdx === -1 || applyIdx - m.index > 400) continue;
    const open = source.indexOf('{', applyIdx);
    if (open === -1) continue;
    let depth = 0, i = open;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    out.push({
      line: source.slice(0, m.index).split('\n').length,
      consequence: m[1],
      body: source.slice(open, i),
    });
  }
  return out;
}

let promiseSrc = src;
if (CONTROL === 'broken') {
  /* Break a promise that is currently kept: strip the follower payout this
     round added back, which is exactly the bug shape section 4 exists for. */
  const anchor = 's.socialMediaFollowers += 0.05;';
  if (!promiseSrc.includes(anchor)) {
    console.error(`STATNAME_CONTROL=broken: the anchor is gone, so the plant would change nothing. Refusing to run.\n  looked for: ${anchor}`);
    process.exit(1);
  }
  promiseSrc = promiseSrc.replace(anchor, '');
  console.log('STATNAME_CONTROL=broken: stripped a kept promise\'s payout from the apply body.');
}

const pairs = choicesWithApply(promiseSrc);
const brokenPromises = [];
let promisesChecked = 0;
for (const c of pairs) {
  for (const d of c.consequence.matchAll(/([A-Za-z][A-Za-z]*)\s([+-])(\d+)/g)) {
    const entry = known.get(d[1].toLowerCase());
    if (!entry || !entry.field) continue;   // prose deltas promise nothing about a stat
    promisesChecked++;
    if (c.body.includes(`s.${entry.field}`)) continue;
    if (/next season/i.test(c.consequence) && c.body.includes('statBoostNextSeason')) continue;
    brokenPromises.push(`line ${c.line}: promises "${d[1]} ${d[2]}${d[3]}" but apply never touches s.${entry.field}\n        ${c.consequence}`);
  }
}
if (brokenPromises.length > 0) {
  failures++;
  console.error(`FAIL: ${brokenPromises.length} choice(s) promise a stat change their apply never makes:`);
  for (const b of brokenPromises) console.error(`    ${b}`);
}

console.log('');
console.log(`${pairs.length} choices pair a consequence line with an apply body, ${promisesChecked} stat promises checked, ${promisesChecked - brokenPromises.length} kept.`);
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

if (CONTROL === 'broken') {
  if (brokenPromises.length > 0) {
    console.log('simCareerStatNames control: green. Removing one payout made section 4 go red, so its green means the promises are really kept.');
    process.exit(0);
  }
  console.error('simCareerStatNames control: RED. A kept promise had its payout stripped and section 4 still passed.');
  process.exit(1);
}

if (failures > 0) {
  console.error(`\nsimCareerStatNames: ${failures} failure(s). The flagship is naming a stat it does not have.`);
  process.exit(1);
}
console.log('simCareerStatNames: green. Every consequence the career promises names something the game has, and does what it says.');
