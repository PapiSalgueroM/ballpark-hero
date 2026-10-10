/* Round 1214 fix pass, runner only (never committed): one slip a mode in the two libraries, so the
   request can show the vitest go red for each rule the fix pass added. Each mode replaces a text
   that must be in its file exactly once, or refuses with exit 3. */
import fs from 'node:fs';

const CURVE = 'scripts/lib/cmValueCurve.mjs';
const AGES = 'scripts/lib/cmAges.mjs';
const swap = (file, from, to) => ({ file, from, to });
const MODES = {
  /* a null world falls through to the destructuring again */
  nullworld: swap(CURVE, "if (world === null || typeof world !== 'object' || Array.isArray(world)) {", 'if (false) {'),
  /* a list is taken for a world */
  listworld: swap(CURVE, " || Array.isArray(world)) {", ') {'),
  /* a stretch that is no function is called anyway */
  badstretch: swap(CURVE, "if (stretch && typeof stretch !== 'function') {", 'if (false) {'),
  /* every month has 31 days */
  calendar: swap(AGES, 'return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;', 'return 31;'),
  /* every fourth year is a leap year, 1900 included */
  leap: swap(AGES, '(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28', 'year % 4 === 0 ? 29 : 28'),
  /* February always has 29 */
  feb: swap(AGES, 'year % 400 === 0 ? 29 : 28', 'year % 400 === 0 ? 29 : 29'),
  /* a birth date after the day answers a negative age again */
  bornafter: swap(AGES, "if (age < 0) throw new Error(`ageOn: the birth date is after the day (got born ${born}, day ${isoDate})`);", ''),
  /* the join no longer names the man */
  joinname: swap(AGES, 'try { ageOn(born, AGES_AS_OF); } catch (slip) { throw new Error(`buildBirths: ${key} (${from}): ${slip.message}`); }', 'ageOn(born, AGES_AS_OF);'),
  /* the join no longer checks the date at all */
  joinoff: swap(AGES, 'try { ageOn(born, AGES_AS_OF); } catch (slip) { throw new Error(`buildBirths: ${key} (${from}): ${slip.message}`); }', ''),
  /* year zero is a year */
  yearzero: swap(AGES, 'year >= 1 && month >= 1', 'month >= 1'),
};

const mode = process.argv[2];
const m = MODES[mode];
if (!m) { console.error(`fxMut2: REFUSED, unknown mode ${mode}`); process.exit(3); }
const text = fs.readFileSync(m.file, 'utf8');
const hits = text.split(m.from).length - 1;
if (hits !== 1) { console.error(`fxMut2: REFUSED, the anchor of ${mode} is in ${m.file} ${hits} times, not once`); process.exit(3); }
fs.writeFileSync(m.file, text.replace(m.from, () => m.to));
console.log(`FIX MUTATION ${mode} APPLIED to ${m.file}`);
