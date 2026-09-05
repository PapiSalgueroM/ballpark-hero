/* Every other dugout has a manager, the summer turns them over, and no name
   is ever a real person's.

   Round 308, owner tweaks item 11 arc two ("different managers on different
   teams"). The rules this harness pins:

   1. a fresh career names every dugout in the league except yours, all
      distinct, all generated: not one of them may collide with any name in
      the full modern bake or the trivia pool, because an invented career
      under a real name is the simNoInventedQuotes exposure;
   2. the record is deterministic (two identical careers agree on every
      name) and the ensure is idempotent (a second call changes nothing);
   3. the merry-go-round turns chairs over at a believable rate, measured
      across many summers, and every sack headline tells the truth: the
      name it prints was that club's manager the season before;
   4. changing clubs writes its own truths: your new club's entry is gone
      (the chair is yours), your old club gets a new appointment;
   5. a save from before the feature grows a full record on load repair and
      never an entry for its own club.

   Negative control: SIM_MANAGERS_CONTROL=sever cuts the ensure call out of
   startCareer in a bundled copy and section 1 must fail.

   Run: node scripts/simManagers.mjs
*/
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const CONTROL = process.env.SIM_MANAGERS_CONTROL === 'sever';

const ENTRY = path.join(os.tmpdir(), 'managers.entry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'managers.bundle.mjs');
let cmPath = `${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts`;
if (CONTROL) {
  // A Windows checkout writes the engine with CRLF, and a needle spelt with
  // bare newlines never matched it, so the control refused to run on every
  // desktop build. Normalise first, as the harness rules say.
  const src = fs.readFileSync(cmPath, 'utf8').replace(/\r\n/g, '\n');
  const needle = 'ensurePress(state);\n  ensureManagers(state);\n  state.wageCap';
  if (!src.includes(needle)) { console.error('control run: the startCareer ensure call to sever is not in the source, refusing a dead control'); process.exit(1); }
  cmPath = path.join(os.tmpdir(), 'clubManager.severed.ts').replaceAll('\\', '/');
  fs.writeFileSync(cmPath, src.replace(needle, 'ensurePress(state);\n  state.wageCap'));
}
fs.writeFileSync(ENTRY, `
export * as cm from '${cmPath}';
export { CM_ROSTERS } from '${ROOT.replaceAll('\\', '/')}/src/data/clubManagerRosters.ts';
export { players as POOL } from '${ROOT.replaceAll('\\', '/')}/src/data/players.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`, { stdio: 'inherit' });
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm, CM_ROSTERS, POOL } = await import(pathToFileURL(BUNDLE).href);

const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const realNames = new Set();
for (const roster of Object.values(CM_ROSTERS)) for (const p of roster) realNames.add(fold(p.n));
for (const p of POOL) realNames.add(fold(p.name));

console.log('1) a fresh career names every dugout but yours, no real person among them');
{
  const c = cm.startCareer('Arsenal');
  const m = c.managers ?? {};
  const entries = Object.entries(m);
  const expected = c.leagueClubs.length - 1;
  if (entries.length !== expected) fail(`${entries.length} dugouts named, expected ${expected}`);
  if (m['Arsenal']) fail('your own club has an AI manager, the chair is supposed to be yours');
  const names = entries.map(([, v]) => v.name);
  if (new Set(names).size !== names.length) fail('two clubs share a manager name');
  for (const n of names) {
    if (realNames.has(fold(n))) fail(`generated manager "${n}" is a real person's name`);
  }
  console.log(`   ${entries.length} dugouts named, all distinct, none real, yours empty`);
}

console.log('2) deterministic and idempotent');
{
  const a = cm.startCareer('Liverpool');
  const b = cm.startCareer('Liverpool');
  if (JSON.stringify(a.managers) !== JSON.stringify(b.managers)) fail('two identical careers disagree on the dugouts');
  const before = JSON.stringify(a.managers);
  cm.ensureManagers(a);
  cm.ensureManagers(a);
  if (JSON.stringify(a.managers) !== before) fail('a second ensure changed the record, the repair is not idempotent');
  console.log('   same career twice, same names; double ensure, no change');
}

console.log('3) the summer turns chairs over honestly');
{
  let c = cm.startCareer('Chelsea');
  let changes = 0, chairs = 0, badLines = 0, checkedLines = 0;
  for (let s = 0; s < 10; s++) {
    const prev = c;
    c = cm.startNextSeason(c);
    const before = prev.managers ?? {};
    const after = c.managers ?? {};
    for (const club of Object.keys(after)) {
      if (before[club] && before[club].name !== after[club].name) changes += 1;
      chairs += 1;
    }
    for (const line of c.aiHeadlines) {
      if (!line.includes('sack')) continue;
      checkedLines += 1;
      const truth = Object.keys(before).some(club => line.includes(club) && line.includes(before[club].name));
      if (!truth) { badLines += 1; fail(`a sack headline names nobody the record ever held: "${line}"`); }
    }
    const missing = c.leagueClubs.filter(x => x !== c.clubName && !after[x]);
    if (missing.length) fail(`season ${s + 2}: ${missing.length} dugouts empty after the rollover`);
    if (after[c.clubName]) fail(`season ${s + 2}: your own club grew an AI manager`);
  }
  const rate = changes / chairs;
  console.log(`   ${changes} changes across ${chairs} chair seasons (${(rate * 100).toFixed(1)}% churn), ${checkedLines} sack lines checked, ${badLines} untrue`);
  if (rate < 0.03) fail(`churn ${(rate * 100).toFixed(1)}% is a job for life, the merry-go-round is dead`);
  if (rate > 0.45) fail(`churn ${(rate * 100).toFixed(1)}% is a revolving door beyond any real league`);
}

console.log('4) moving clubs writes its own truths');
{
  let c = cm.startCareer('Everton');
  const target = 'Aston Villa';
  const hadName = c.managers?.[target]?.name;
  const moved = cm.startNextSeason(c, target);
  if (moved.clubName !== target) fail(`the move to ${target} did not happen, the section is not testing anything`);
  else {
    if (moved.managers?.[target]) fail('your new club still has an AI manager after you took the chair');
    if (!moved.managers?.['Everton']) fail('the club you left has nobody in the dugout');
    if (hadName && !moved.aiHeadlines.some(l => l.includes(hadName))) {
      /* The takeover line can be pushed out by a busy summer; the record is
         the contract, the line is a bonus, so this is a note not a failure. */
      console.log(`   note: the takeover line for ${hadName} did not survive the 8 item feed cap this run`);
    }
    console.log(`   moved to ${target}: their chair cleared, Everton appointed ${moved.managers?.['Everton']?.name}`);
  }
}

console.log('5) an old save grows a record on load, never for its own club');
{
  const c = cm.startCareer('Newcastle');
  const old = JSON.parse(JSON.stringify(c));
  delete old.managers;
  cm.ensureManagers(old);
  const m = old.managers ?? {};
  if (Object.keys(m).length !== old.leagueClubs.length - 1) fail('the load repair did not fill the dugouts');
  if (m['Newcastle']) fail('the load repair gave your own club a manager');
  console.log('   repaired in one call, own chair left alone');
}

console.log('6) offers and the merry-go-round agree on one vacancy list');
{
  /* Round 309. Drive many season ends with the offer gate forced open (a
     trophy) and check the contract: every vacancy offer names the outgoing
     manager truthfully, and every decided vacancy the player declines is
     filled by a NEW name at the rollover. */
  let offersSeen = 0, vacancyOffers = 0, blurbLies = 0, refills = 0, staleRefills = 0;
  for (let i = 0; i < 30; i++) {
    let c = cm.startCareer('Brighton');
    c.trophies.push({ name: 'League Title', emoji: '\u{1F3C6}', season: c.season });
    const { state: fin } = cm.finishSeason(c);
    if (!Array.isArray(fin.pendingVacancies)) { fail('finishSeason wrote no vacancy list'); break; }
    const byClub = new Map(fin.pendingVacancies.map(v => [v.club, v.name]));
    for (const o of fin.pendingSummary?.offers ?? []) {
      offersSeen += 1;
      if (byClub.has(o.club)) {
        vacancyOffers += 1;
        if (!o.blurb.includes(byClub.get(o.club))) { blurbLies += 1; fail(`vacancy offer for ${o.club} does not name ${byClub.get(o.club)}: "${o.blurb}"`); }
      }
    }
    const next = cm.startNextSeason(fin);
    for (const v of fin.pendingVacancies) {
      if (v.club === next.clubName) continue;
      /* Round 310: promotion and relegation can carry a vacancy's club out
         of the division over the same summer, and the record only ever
         tracks the CURRENT league's dugouts, so a chair that left is no
         longer this record's to fill. */
      if (!next.leagueClubs.includes(v.club)) continue;
      refills += 1;
      const now = next.managers?.[v.club];
      if (!now) { staleRefills += 1; fail(`declined vacancy at ${v.club} left an empty chair`); }
      else if (now.name === v.name) { staleRefills += 1; fail(`declined vacancy at ${v.club} kept ${v.name}, the sacking never happened`); }
    }
    if (next.pendingVacancies !== undefined) fail('the rollover did not clear the consumed vacancy list');
  }
  console.log(`   ${offersSeen} offers over 30 summers, ${vacancyOffers} from real vacancies (${blurbLies} untrue blurbs), ${refills} declined chairs refilled (${staleRefills} stale)`);
  if (vacancyOffers === 0) fail('30 trophy summers produced zero vacancy offers, the queue jump is dead');
}

if (CONTROL) {
  if (failures > 0) { console.log(`\ncontrol run: ${failures} failure(s) fired as expected`); process.exit(0); }
  console.error('\ncontrol run: severing the ensure changed NOTHING, the checks are dead');
  process.exit(1);
}
console.log('   teeth: real names from the live bakes, truth checked headlines, churn measured not asserted per run');
if (failures > 0) { console.error(`\nsimManagers: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimManagers: all green');
