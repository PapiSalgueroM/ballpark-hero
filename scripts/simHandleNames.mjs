/* Round 318: the leaderboard names decision, both halves pinned.
 *
 * The owner's call in docs/TWEAKS-2026-08-28.md: legacy Baller-NNNN guest
 * handles regenerate to the sports word pool, and every name RENDERED on a
 * shared surface passes a profanity blocklist, because write-time moderation
 * (Profile.tsx) cannot reach names that were saved before it existed.
 *
 * WHAT IT HOLDS:
 *   1. a stored legacy Baller-NNNN handle regenerates to a word pool handle
 *      on the next read, and the regeneration persists;
 *   2. a stored word pool handle is returned byte for byte, never re-minted;
 *   3. minted handles always pair two different pool words (the old doubled
 *      word fallback was a no-op when the doubled word was Baller);
 *   4. publicName passes a clean name through byte for byte, and replaces a
 *      blocklisted name with a substitute that is stable across calls,
 *      different from the input, and itself clean under the same blocklist;
 *   5. Leaderboard.tsx actually routes every board row through publicName,
 *      read from the comment-stripped source so prose cannot satisfy it.
 *
 * NEGATIVE CONTROL: SIM_HANDLE_CONTROL=unfence severs the moderation check
 * inside a bundled copy of publicName and section 4's dirty case must stop
 * substituting, proving the fence is load bearing rather than decorative.
 *
 * Run: node scripts/simHandleNames.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_HANDLE_CONTROL || '';
if (CONTROL && CONTROL !== 'unfence') { console.error(`SIM_HANDLE_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

const TMP = os.tmpdir().replace(/\\/g, '/');
const ENTRY = `${TMP}/handleNames.entry.mjs`;
const BUNDLE = `${TMP}/handleNames.bundle.mjs`;

let completionsPath = `${ROOT}/src/lib/completions.ts`;
if (CONTROL === 'unfence') {
  const src = fs.readFileSync(completionsPath, 'utf8');
  const needle = 'if (nameModerationError(raw) === null) return raw;';
  if (!src.includes(needle)) { console.error('control run: the fence line to sever is not in the source, refusing to run a dead control'); process.exit(1); }
  completionsPath = `${TMP}/completions.control.ts`;
  fs.writeFileSync(completionsPath, src.replace(needle, 'return raw;'));
  console.log('NEGATIVE CONTROL ON: the moderation fence severed in a bundled copy, the dirty case below must slip through');
}
fs.writeFileSync(ENTRY, `
export { getGuestHandle, publicName } from '${completionsPath}';
export { nameModerationError } from '${ROOT}/src/lib/nameModeration.ts';
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
const { getGuestHandle, publicName, nameModerationError } = await import(pathToFileURL(BUNDLE).href);

const KEY = 'dukb-guest-handle';
const POOL_SHAPE = /^[A-Z][A-Za-z]+-\d{2}$/;

if (CONTROL !== 'unfence') {
  console.log('1) a legacy Baller-NNNN handle regenerates and the regeneration persists');
  {
    store.set(KEY, 'Baller-4821');
    const regenerated = getGuestHandle();
    if (/^Baller-\d+$/.test(regenerated)) fail(`legacy handle survived the read: ${regenerated}`);
    if (!POOL_SHAPE.test(regenerated)) fail(`regenerated handle is not pool shaped: ${regenerated}`);
    if (store.get(KEY) !== regenerated) fail(`regeneration did not persist: stored ${store.get(KEY)}, returned ${regenerated}`);
    if (getGuestHandle() !== regenerated) fail('a second read re-minted instead of returning the stored handle');
    console.log(`   Baller-4821 became ${regenerated}, stored, and stayed put on the second read`);
  }

  console.log('2) a stored word pool handle is returned byte for byte');
  {
    store.set(KEY, 'IcyKeeper-42');
    if (getGuestHandle() !== 'IcyKeeper-42') fail(`stored pool handle was not returned as is: ${getGuestHandle()}`);
    console.log('   IcyKeeper-42 in, IcyKeeper-42 out');
  }

  console.log('3) minted handles never double a word');
  {
    let doubled = 0; let shapeBad = 0;
    for (let i = 0; i < 400; i += 1) {
      store.delete(KEY);
      const h = getGuestHandle();
      if (h.startsWith('BallerBaller')) doubled += 1;
      if (!POOL_SHAPE.test(h)) shapeBad += 1;
    }
    if (doubled > 0) fail(`${doubled} of 400 mints doubled Baller, the no-op fallback is back`);
    if (shapeBad > 0) fail(`${shapeBad} of 400 mints broke the pool shape`);
    console.log('   400 mints, zero doubled words, every one pool shaped');
  }
}

console.log('4) publicName: clean passes through, dirty substitutes stably');
{
  for (const clean of ['IcyKeeper-42', 'Anthony S', 'GoldenVolley-77']) {
    if (publicName(clean) !== clean) fail(`clean name was rewritten: ${clean} -> ${publicName(clean)}`);
  }
  const dirty = 'xXsh1t_lordXx';
  if (nameModerationError(dirty) === null) { console.error('the fixture is not actually blocklisted, the test below would prove nothing'); process.exit(1); }
  const sub = publicName(dirty);
  if (CONTROL === 'unfence') {
    if (sub === dirty) { console.log('simHandleNames control: green. With the fence severed the dirty name slipped through, so the fence is what stops it.'); process.exit(0); }
    console.error('simHandleNames control: RED. The dirty name was still substituted with the fence severed, something else is doing the work.');
    process.exit(1);
  }
  if (sub === dirty) fail('a blocklisted name rendered unchanged');
  if (publicName(dirty) !== sub) fail('the substitute is not stable across calls');
  if (nameModerationError(sub) !== null) fail(`the substitute itself fails moderation: ${sub}`);
  if (!POOL_SHAPE.test(sub)) fail(`the substitute is not pool shaped: ${sub}`);
  if (publicName('') !== 'Player' || publicName('   ') !== 'Player') fail('an empty name should render as Player');
  console.log(`   clean names untouched; the dirty fixture rendered as ${sub}, same on every call, clean itself`);
}

console.log('5) the blocklist blocks words, not letters (the kkk/xxx collapse bug)');
{
  /* Found by this harness's own clean fixture: the old normalizer collapsed
     the blocklist entries "kkk" and "xxx" to single letters at module load,
     so every name containing a k or an x was refused as blocked language
     from the day moderation shipped. Both directions pinned. */
  for (const clean of ['Mark', 'Luka', 'Xavi', 'Max Parker', 'IcyKeeper']) {
    if (nameModerationError(clean) !== null) fail(`ordinary name refused: ${clean}`);
  }
  for (const dirty of ['KKK crew', 'xXx zone', 'shiiiiit', 'f u c k', 'sh1thead']) {
    if (nameModerationError(dirty) === null) fail(`blocklisted name accepted: ${dirty}`);
  }
  console.log('   Mark, Luka, Xavi, Max Parker all pass; kkk, xxx, padded and leet evasions all refused');
}

console.log('6) the leaderboard actually uses the fence');
{
  const src = fs.readFileSync(`${ROOT}/src/pages/Leaderboard.tsx`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  if (!/publicName\(String\(r\.player_name\)\)/.test(src)) fail('Leaderboard.tsx no longer maps board rows through publicName');
  if (!/publicName\(ownHandle\)/.test(src)) fail('Leaderboard.tsx no longer filters the own displayed handle');
  console.log('   board rows and the own displayed handle both pass through publicName, read from code not prose');
}

console.log('');
if (failures > 0) { console.error(`simHandleNames: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simHandleNames: green. Legacy handles regenerate, and nothing blocklisted reaches a shared surface.');
