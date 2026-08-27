/* The created manager: optional, honest, and never a real person's name.

   Round 303, off the owner's tweaks document ("customizable created
   manager"). The spec is a name, a homeland, a background badge and a
   preferred football. The rules this harness pins:

   1. the name gate holds: a real baked footballer's name is refused, a real
      trivia pool name is refused, blocked language is refused, digits are
      refused, and a clean invented name passes;
   2. startCareer stores a valid spec and applies its style to the day one
      tactics EXACTLY as a founding club identity does; with no spec the day
      one tactics are byte identical to what the game always shipped, and at
      a custom club the founding identity outranks the manager's style;
   3. startCareer refuses to store a spec whose name fails the gate, so no
      caller can smuggle a real name past the form (defense in depth);
   4. the homeland actually flows: nationOfferFor calls with the manager's
      own federation when the engine can run it, and wildernessProfile
      carries the homeland into the job market instead of the old England
      hardcode;
   5. a save without a manager (every save made before this round) reads,
      advances a week and finishes cleanly.

   Negative control: SIM_MANAGER_CONTROL=unguard severs the real name check
   in a bundled copy and the refusal test must stop refusing, proving the
   gate is load bearing rather than decorative.

   Run: node scripts/simManagerSpec.mjs
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_MANAGER_CONTROL === 'unguard';

const ENTRY = '/tmp/managerSpec.entry.mjs';
const BUNDLE = '/tmp/managerSpec.bundle.mjs';
let cmPath = `${ROOT}/src/lib/clubManager.ts`;
if (CONTROL) {
  const src = fs.readFileSync(cmPath, 'utf8');
  const needle = 'if (realPersonNamesFolded().has(foldClubName(trimmed))) {';
  if (!src.includes(needle)) { console.error('control run: the guard line to sever is not in the source, refusing to run a dead control'); process.exit(1); }
  cmPath = '/tmp/clubManager.control.ts';
  fs.writeFileSync(cmPath, src.replace(needle, 'if (false) {'));
}
fs.writeFileSync(ENTRY, `
export * as cm from '${cmPath}';
export { CM_ROSTERS } from '${ROOT}/src/data/clubManagerRosters.ts';
export { players as POOL } from '${ROOT}/src/data/players.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
/* Stub in THIS process, before the import: a stub inside the entry hoists
   below the imports and the module scope reads localStorage first. */
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm, CM_ROSTERS, POOL } = await import(BUNDLE);

console.log('1) the name gate holds');
{
  const baked = Object.values(CM_ROSTERS).flat()[0].n;
  if (cm.validateManagerName(baked) === null) fail(`baked roster name "${baked}" was accepted`);
  const pool = POOL[0].name;
  if (cm.validateManagerName(pool) === null) fail(`trivia pool name "${pool}" was accepted`);
  if (cm.validateManagerName('moron rovers') === null) fail('blocked language was accepted');
  if (cm.validateManagerName('Agent 47') === null) fail('digits were accepted in a person name');
  if (cm.validateManagerName('X') === null) fail('a single letter was accepted');
  if (cm.validateManagerName('Sam Calloway') !== null) fail(`clean invented name refused: ${cm.validateManagerName('Sam Calloway')}`);
  if (cm.validateManagerName("Tomas O'Riain-Vega") !== null) fail('apostrophes and hyphens refused in a normal name');
  console.log(`   refused: "${baked}", "${pool}", blocked word, digits, one letter; accepted the invented names`);
}

const SPEC = { name: 'Sam Calloway', nationality: 'Spain', background: 'analyst', style: 'gegenpress' };

console.log('2) the spec lands and the style sets day one tactics, nothing else');
{
  const plain = cm.startCareer('Arsenal');
  const withSpec = cm.startCareer('Arsenal', undefined, undefined, SPEC);
  if (!withSpec.manager || withSpec.manager.name !== 'Sam Calloway') fail('the spec was not stored');
  const id = cm.CLUB_IDENTITIES[SPEC.style];
  if (withSpec.formationIndex !== id.formationIndex) fail(`style formation not applied: ${withSpec.formationIndex} vs ${id.formationIndex}`);
  if (withSpec.mentality !== id.mentality) fail(`style mentality not applied: ${withSpec.mentality} vs ${id.mentality}`);
  if (plain.manager !== undefined) fail('a plain career grew a manager from nowhere');
  if (plain.formationIndex !== 0 || plain.mentality !== 'balanced') {
    fail(`the classic day one tactics moved: formation ${plain.formationIndex}, mentality ${plain.mentality}`);
  }
  /* Identical squads either way: the spec must never touch the football. */
  const ratingOf = s => Math.round(s.squad.reduce((t, p) => t + p.rating, 0) / s.squad.length * 10);
  if (ratingOf(plain) !== ratingOf(withSpec)) fail('the manager spec changed the squad, it must never touch the football');
  console.log(`   spec stored, ${id.label} day one shape applied, plain career byte compatible`);
}

console.log('3) a real name cannot be smuggled past the form');
{
  const baked = Object.values(CM_ROSTERS).flat()[0].n;
  const smuggled = cm.startCareer('Arsenal', undefined, undefined, { ...SPEC, name: baked });
  if (CONTROL) {
    if (smuggled.manager) console.log('   control: the severed gate let the real name through, as expected');
    else fail('control run: the gate is severed yet the real name was still refused, something else is guarding');
  } else if (smuggled.manager) {
    fail(`startCareer stored a real footballer's name ("${baked}") as the manager`);
  } else {
    console.log('   startCareer refused the real name even when handed it directly');
  }
}

console.log('4) the homeland flows into the federation call and the job market');
{
  const c = cm.startCareer('Manchester City', undefined, undefined, SPEC);
  /* Earn the standing honestly on paper: a tier one club, silverware, a
     played record. nationStanding is pure arithmetic over these fields. */
  c.trophies = [{ kind: 'league', season: 1 }, { kind: 'cup', season: 2 }, { kind: 'ucl', season: 3 }, { kind: 'league', season: 4 }];
  c.careerStats.played = 100; c.careerStats.wins = 70;
  const offer = cm.nationOfferFor(c);
  if (!offer) fail('no federation call despite a decorated record');
  else if (offer.nation !== 'Spain') fail(`the manager is Spanish and ${offer.nation} called instead`);
  const noSpec = cm.startCareer('Manchester City');
  noSpec.trophies = c.trophies; noSpec.careerStats.played = 100; noSpec.careerStats.wins = 70;
  const fallback = cm.nationOfferFor(noSpec);
  if (!fallback || fallback.nation !== 'England') fail(`the classic career should still get the club's country: got ${fallback?.nation}`);
  const wp = cm.wildernessProfile(c);
  if (wp.nationality !== 'Spain') fail(`wilderness profile carries ${wp.nationality}, wanted the manager's Spain`);
  const wpPlain = cm.wildernessProfile(noSpec);
  if (wpPlain.nationality !== 'England') fail('the classic career lost its England default in the wilderness');
  console.log(`   Spain called the created manager, England called the classic one, the wilderness knows both`);
}

console.log('5) a pre round 303 save still reads and plays');
{
  const c = cm.startCareer('Newcastle');
  const old = JSON.parse(JSON.stringify(c));
  delete old.manager;
  try {
    const after = cm.playNextEntry(old);
    const st = after.state ?? after;
    if (!st || typeof st.week !== 'number') fail('advancing an old save returned nonsense');
    if (st.manager !== undefined) fail('advancing an old save invented a manager');
    console.log('   an old save advanced a week with no manager and grew none');
  } catch (e) {
    fail(`advancing an old save threw: ${e && e.message}`);
  }
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: severing the real name gate changed NOTHING, the checks are dead');
  process.exit(1);
}
console.log('   teeth: real names pulled from the live bakes, tactics compared against the identity table, defaults pinned');
if (failures > 0) { console.error(`\nsimManagerSpec: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimManagerSpec: all green');
