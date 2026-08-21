/**
 * Round 194 harness: the nationality maps behind the market filter,
 * CM-7's last open line.
 *
 * What Round 194 shipped: src/data/playerNationalities.ts, one map per
 * sealed world baked from player_market_values (provenance and the twelve
 * batch queries live in scripts/bakeNationalities.mjs's header), a
 * nationality dropdown in the transfer market's deep filters, and real
 * flags on market and squad rows. The one rule that matters: A NAME IS
 * NOT A PERSON. The 2010 world's Aaron Ramsey is Welsh, the modern one is
 * English, and this file pins that the per-world windows keep them apart.
 *
 * All checks are logical. The famous-name pins are facts with two
 * independent sources (the table and undisputed public record), which is
 * the house bar for anything real.
 *
 * Run: node scripts/simNationalities.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/natEntry.mjs';
const BUNDLE = '/tmp/nat.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { NATIONALITY_BY_WORLD, nationalityOf } from '${ROOT}/src/data/playerNationalities.ts';
export { FLAG_CODES } from '${ROOT}/src/components/FlagImg.tsx';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --loader:.tsx=tsx --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { NATIONALITY_BY_WORLD, nationalityOf, FLAG_CODES } = await import(BUNDLE);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const WORLD_FILES = {
  now: 'src/data/clubManagerRosters.ts',
  era2015: 'src/data/clubManagerEra2015.ts',
  era2010: 'src/data/clubManagerEra2010.ts',
  era2005: 'src/data/clubManagerEra2005.ts',
};
const namesOf = f => {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf-8');
  const out = new Set();
  for (const m of t.matchAll(/\bn:\s*'((?:[^'\\]|\\.)*)'/g)) out.add(m[1].replace(/\\'/g, "'"));
  for (const m of t.matchAll(/\bn:\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);
  return out;
};

/* Names the bake could not honestly resolve are allowed to be absent.
   Currently NONE: every one of the 6,262 world names carries a country. */
const ALLOWED_MISSING = { now: [], era2015: [], era2010: [], era2005: [] };

/* ---------- 1. Every real player in every world has a country ---------- */
console.log('1) Coverage is total, and the maps hold nothing but world names');
for (const [world, file] of Object.entries(WORLD_FILES)) {
  const names = namesOf(file);
  const map = NATIONALITY_BY_WORLD[world];
  if (!map) { fail(`world ${world} has no map`); continue; }
  const allowed = new Set(ALLOWED_MISSING[world]);
  let missing = 0;
  for (const n of names) {
    if (!map[n] && !allowed.has(n)) { missing += 1; if (missing <= 5) fail(`${world}: ${n} has no nationality`); }
  }
  if (missing > 5) fail(`${world}: ${missing} names missing in total`);
  for (const k of Object.keys(map)) {
    if (!names.has(k)) fail(`${world}: map entry "${k}" is not a player in that world (leak)`);
  }
  console.log(`   ${world}: ${Object.keys(map).length} entries over ${names.size} names`);
}

/* ---------- 2. A name is not a person: the cross-world pins ---------- */
console.log('2) The same name wears the right flag in each world');
{
  const pins = [
    /* The pair that forced per-world maps: Arsenal's 2010 Ramsey is the
       Welshman (b. 1990); the modern roster's is the English midfielder. */
    ['era2010', 'Aaron Ramsey', 'Wales'],
    ['era2015', 'Aaron Ramsey', 'Wales'],
    ['now', 'Aaron Ramsey', 'England'],
    /* Luzern's Lucas Silva is Portuguese per the Round 185 receipt; the
       2015 world's is Real Madrid's Brazilian. */
    ['now', 'Lucas Silva', 'Portugal'],
    ['era2015', 'Lucas Silva', 'Brazil'],
  ];
  for (const [world, name, nat] of pins) {
    const got = NATIONALITY_BY_WORLD[world][name];
    if (got !== nat) fail(`${world} ${name}: expected ${nat}, got ${got}`);
  }
}

/* ---------- 3. Famous names, two-source facts ---------- */
console.log('3) The famous pins agree with undisputed public record');
{
  const pins = [
    ['now', 'Lionel Messi', 'Argentina'], ['era2010', 'Lionel Messi', 'Argentina'], ['era2005', 'Lionel Messi', 'Argentina'],
    ['now', 'Cristiano Ronaldo', 'Portugal'], ['era2010', 'Cristiano Ronaldo', 'Portugal'], ['era2005', 'Cristiano Ronaldo', 'Portugal'],
    ['era2015', 'Jamie Vardy', 'England'],
    ['era2015', 'Gianluigi Buffon', 'Italy'],
    ['era2015', 'Mohamed Salah', 'Egypt'],
    ['era2015', 'Heung-min Son', 'Korea, South'],
    ['now', 'Erling Haaland', 'Norway'],
    ['now', 'Kylian Mbappé', 'France'],
    ['era2005', 'Zinédine Zidane', 'France'],
    ['era2005', 'Ronaldinho', 'Brazil'],
    ['era2005', 'Wayne Rooney', 'England'], ['era2010', 'Wayne Rooney', 'England'],
    ['era2010', 'Xavi', 'Spain'],
  ];
  for (const [world, name, nat] of pins) {
    const got = NATIONALITY_BY_WORLD[world][name];
    if (got !== nat) fail(`${world} ${name}: expected ${nat}, got ${got}`);
  }
}

/* ---------- 4. Every country has a flag ---------- */
console.log('4) No nationality without a FLAG_CODES entry');
{
  const flagless = new Set();
  for (const map of Object.values(NATIONALITY_BY_WORLD)) {
    for (const nat of Object.values(map)) if (!FLAG_CODES[nat]) flagless.add(nat);
  }
  if (flagless.size) fail(`flagless nationalities: ${[...flagless].join(' | ')}`);
}

/* ---------- 5. The lookup's honest edges ---------- */
console.log('5) nationalityOf: made-up men get null, unknown eras fall back to now');
{
  if (nationalityOf('now', 'Zzz Not A Player') !== null) fail('an invented name got a nationality');
  if (nationalityOf(undefined, 'Erling Haaland') !== 'Norway') fail('undefined era did not read the modern map');
  if (nationalityOf('era1990', 'Erling Haaland') !== 'Norway') fail('an unknown era did not fall back to now');
  if (nationalityOf('era2005', 'Erling Haaland') !== null) fail('Haaland leaked into 2005, the worlds are not sealed');
  if (nationalityOf('era2005', 'Thierry Henry') !== 'France') fail('the 2005 world lost Henry');
}

/* ---------- 6. Copy discipline ---------- */
console.log('6) No em or en dash anywhere in the shipped map');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const [world, map] of Object.entries(NATIONALITY_BY_WORLD)) {
    for (const [k, v] of Object.entries(map)) {
      if (DASHES.test(k) || DASHES.test(v)) fail(`${world}: dash in "${k}" or "${v}"`);
    }
  }
}

console.log('');
if (failures > 0) {
  console.error(`simNationalities: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNationalities: green. Every real player carries his real flag, and no name wears the wrong one.');
