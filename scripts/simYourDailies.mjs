/**
 * Round 293 harness: the home page checklist offers only what this person
 * plays, only dailies, only games that still exist, and says the truth
 * about today.
 *
 *   1. A first visit gets nothing (so the fold does not move).
 *   2. A record with eight dailies offers six, best streak first, with the
 *      right done flag against today's date; ties break on the longest run,
 *      then the label, so the order is the same on every render.
 *   3. A game that is not a daily is never offered, however long its streak.
 *   4. A slug that has left the registry is never offered: a retired route
 *      cannot be linked from the home page by an old save.
 *   5. Garbage in the record (missing fields, negatives, wrong types) is
 *      skipped, never thrown.
 *   6. The line under the heading counts what is left.
 *
 * NEGATIVE CONTROL: DAILIES_CONTROL=retired hands the picker a registry that
 * still lists the retired slug as a daily; section 4 must go red, which
 * proves the exclusion is the registry's doing and not an accident of the
 * fixture.
 *
 * Run: node scripts/simYourDailies.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/yourDailiesEntry.mjs';
const BUNDLE = '/tmp/yourDailies.bundle.mjs';
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${ROOT}/src/lib/yourDailies.ts';
export { ALL_GAMES } from '${ROOT}/src/data/gameRegistry.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const { pickYourDailies, yourDailiesLine, MAX_YOUR_DAILIES, ALL_GAMES } = await import(BUNDLE);

const CONTROL = process.env.DAILIES_CONTROL || '';
if (CONTROL && CONTROL !== 'retired') { console.error(`DAILIES_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const TODAY = '2026-08-25';
const dailies = ALL_GAMES.filter(g => g.daily);
const nonDaily = ALL_GAMES.find(g => !g.daily);
if (dailies.length < 8 || !nonDaily) { console.error('the registry has too few dailies or no non daily to test with'); process.exit(1); }
const slug = g => g.path.replace(/^\//, '');
const entry = (current, longest, lastDate) => ({ current, longest, lastDate });

console.log('1) a first visit gets nothing');
{
  if (pickYourDailies({}, TODAY).length !== 0) fail('an empty record offered something');
  if (pickYourDailies(undefined, TODAY).length !== 0) fail('a missing record offered something');
  if (yourDailiesLine([]) !== '') fail('an empty list has a line under it');
}

console.log('2) eight played dailies become six, best streak first, done flags right');
{
  const per = {};
  dailies.slice(0, 8).forEach((g, i) => { per[slug(g)] = entry(i % 4, 3 + i, i % 2 === 0 ? TODAY : '2026-08-24'); });
  const out = pickYourDailies(per, TODAY);
  if (out.length !== MAX_YOUR_DAILIES) fail(`${out.length} offered, wanted ${MAX_YOUR_DAILIES}`);
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1], b = out[i];
    if (a.streak < b.streak || (a.streak === b.streak && a.longest < b.longest)) fail(`order broke at ${a.game.label} then ${b.game.label}`);
  }
  for (const d of out) {
    const e = per[slug(d.game)];
    if (d.done !== (e.lastDate === TODAY)) fail(`${d.game.label} done flag is ${d.done} with lastDate ${e.lastDate}`);
    if (d.streak !== e.current) fail(`${d.game.label} streak ${d.streak}, record says ${e.current}`);
    if (!d.game.daily) fail(`${d.game.label} is not a daily`);
  }
  const twice = JSON.stringify(pickYourDailies(per, TODAY));
  if (twice !== JSON.stringify(out)) fail('two calls on the same record disagree');
  console.log(`   ${out.map(d => `${d.game.label}:${d.streak}${d.done ? '✓' : ''}`).join(', ')}`);
}

console.log('3) a game that is not a daily is never offered');
{
  const per = { [slug(nonDaily)]: entry(30, 30, TODAY), [slug(dailies[0])]: entry(1, 1, TODAY) };
  const out = pickYourDailies(per, TODAY);
  if (out.some(d => d.game.path === nonDaily.path)) fail(`${nonDaily.label} (not a daily) was offered`);
  if (out.length !== 1) fail(`${out.length} offered, wanted the one daily`);
}

console.log('4) a slug that has left the registry is never offered');
{
  const per = { 'zz-retired-daily': entry(40, 40, TODAY), [slug(dailies[1])]: entry(2, 2, '2026-08-24') };
  let registry = ALL_GAMES;
  if (CONTROL === 'retired') {
    registry = [...ALL_GAMES, { path: '/zz-retired-daily', label: 'Retired Daily', emoji: '🪦', description: 'a ghost', daily: true }];
    console.log('   NEGATIVE CONTROL ON: the registry handed in still lists the retired slug as a daily, this section must go red');
  }
  const out = pickYourDailies(per, TODAY, registry);
  if (out.some(d => d.game.path === '/zz-retired-daily')) fail('a retired slug was offered from an old save');
  if (!out.some(d => d.game.path === dailies[1].path)) fail('the live daily beside it was dropped');
}

console.log('5) garbage in the record is skipped, not thrown');
{
  const per = {
    [slug(dailies[2])]: entry(-3, 'x', TODAY),
    [slug(dailies[3])]: null,
    [slug(dailies[4])]: 'nonsense',
    [slug(dailies[5])]: entry(2, 5, '2026-08-24'),
    [slug(dailies[6])]: {},
  };
  let out;
  try { out = pickYourDailies(per, TODAY); } catch (e) { fail(`garbage threw: ${String(e).slice(0, 80)}`); out = []; }
  if (!out.some(d => d.game.path === dailies[5].path)) fail('the one good entry was lost among the garbage');
  const bad = out.find(d => d.game.path === dailies[2].path);
  if (bad && (bad.streak !== 0 || bad.longest !== 0)) fail('a negative streak or a non numeric longest leaked through');
  if (out.some(d => d.game.path === dailies[3].path || d.game.path === dailies[4].path || d.game.path === dailies[6].path)) fail('an entry with nothing in it was offered');
}

console.log('6) the line under the heading counts what is left');
{
  const mk = (done) => ({ game: dailies[0], done, streak: 1, longest: 1 });
  if (yourDailiesLine([mk(true), mk(true)]) !== 'All done for today. See you tomorrow.') fail('all done line wrong');
  if (yourDailiesLine([mk(false), mk(false), mk(false)]) !== '3 to play today.') fail('none done line wrong');
  if (yourDailiesLine([mk(true), mk(false), mk(false)]) !== '1 done, 2 to go.') fail('mixed line wrong');
}

console.log('');
if (CONTROL === 'retired') {
  if (failures > 0) { console.log(`simYourDailies control: green. The registry that kept the retired slug was reported (${failures} finding).`); process.exit(0); }
  console.error('simYourDailies control: RED. A retired slug offered from an old save went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`simYourDailies: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simYourDailies: green. The checklist offers what you play, only what exists, and tells the truth about today.');
