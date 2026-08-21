/**
 * Round 197 harness: the national team's actual starting eleven, and the
 * rule that no invented man may ever wear a real player's name.
 *
 * The owner's screenshot ask was plain: "I do not like this score thing.
 * When I think of the squad I imagine u can see the starting eleven."
 * pickSquad now builds a real team sheet, and this file holds it to the
 * two things a team sheet has to be:
 *
 *   HONEST ABOUT HIM. The eleven cannot contradict the rank the same
 *   function just calculated. If he is his nation's first choice he is on
 *   the sheet in his own position; if he made the squad but not the team
 *   the sheet names the man keeping him out; if he was left out entirely
 *   he is nowhere on it, and the eleven still exists, because watching the
 *   team you are not in is the whole feeling of being left out.
 *
 *   HONEST ABOUT THEM. The other ten are invented, and inventing them is
 *   where this could have gone wrong. The audit that opened this round
 *   enumerated the career engine's old name banks and found SEVENTY SIX
 *   pairings that landed on a real footballer's exact name (Mohamed Salah,
 *   Victor Osimhen, Lautaro Martinez among them), plus four more in the
 *   rivalry generator. Both were rewired to src/lib/intlNames.ts, whose
 *   entire combination space is small enough to enumerate: section 5 checks
 *   every single name it can ever produce against every real player baked
 *   into the four Club Manager worlds. Section 6 is the static guard that
 *   stops the free-pairing banks coming back.
 *
 * Run: node scripts/simStartingXi.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/xiEntry.mjs';
const BUNDLE = '/tmp/xi.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { pickSquad, xiMen, NATION_CONFED } from '${ROOT}/src/lib/soccerInternational.ts';
export { allIntlNames, intlName, NATION_FAMILY, NAME_FAMILIES, familyFor } from '${ROOT}/src/lib/intlNames.ts';
export { NATIONALITY_BY_WORLD } from '${ROOT}/src/data/playerNationalities.ts';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });
const {
  pickSquad, xiMen, NATION_CONFED,
  allIntlNames, intlName, NATION_FAMILY, NAME_FAMILIES, familyFor,
  NATIONALITY_BY_WORLD,
} = await import(BUNDLE);

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const form = (o) => ({
  overall: 84, position: 'ST', lastRating: 7.2, lastGoals: 18, age: 26, isCaptain: false, ...o,
});
const SHAPE = { GK: ['GK'], DEF: ['RB', 'CB', 'CB', 'LB'], MID: ['CDM', 'CM', 'CM'], ATT: ['RW', 'ST', 'LW'] };

/* ---------- 1. Every sheet is a real eleven ---------- */
console.log('1) Eleven men, one keeper, the shape it says it is');
{
  const nations = ['Argentina', 'Spain', 'Japan', 'Nigeria', 'Norway', 'Wales', 'Jamaica', 'Iran', 'Georgia', 'Vietnam'];
  for (const nation of nations) {
    for (const pos of ['GK', 'CB', 'LB', 'CDM', 'CM', 'CAM', 'LW', 'ST']) {
      for (const ovr of [58, 74, 88]) {
        const call = pickSquad(nation, form({ position: pos, overall: ovr }));
        const xi = call.xi;
        if (!xi) { fail(`${nation}/${pos}/${ovr}: no team sheet`); continue; }
        const men = xiMen(xi);
        if (men.length !== 11) { fail(`${nation}/${pos}: ${men.length} men on the sheet`); continue; }
        if (xi.gk.length !== 1 || xi.def.length !== 4 || xi.mid.length !== 3 || xi.att.length !== 3) {
          fail(`${nation}/${pos}: lines are ${xi.gk.length}/${xi.def.length}/${xi.mid.length}/${xi.att.length}, expected 1/4/3/3`);
        }
        const names = men.map(m => m.name);
        if (new Set(names).size !== 11) fail(`${nation}/${pos}: two men share a name (${names.join(', ')})`);
        for (const m of men) {
          if (!Number.isFinite(m.ovr) || m.ovr < 30 || m.ovr > 99) fail(`${nation}/${pos}: ${m.name} rated ${m.ovr}`);
          if (!m.slot) fail(`${nation}/${pos}: a man with no shirt`);
        }
        const mine = men.filter(m => m.me);
        if (mine.length > 1) fail(`${nation}/${pos}: ${mine.length} men marked as the player`);
        if (xi.mySlot && mine.length !== 1) fail(`${nation}/${pos}: mySlot ${xi.mySlot} but nobody is marked`);
        if (!xi.mySlot && mine.length !== 0) fail(`${nation}/${pos}: nobody starts but somebody is marked`);
        if (xi.formation !== '4-3-3') fail(`${nation}/${pos}: formation reads ${xi.formation}`);
      }
    }
  }
  /* The invented ten always keep the shape's own shirts. */
  const call = pickSquad('Brazil', form({ position: 'CB', overall: 90 }));
  for (const [line, want] of [['gk', SHAPE.GK], ['def', SHAPE.DEF], ['mid', SHAPE.MID], ['att', SHAPE.ATT]]) {
    const got = call.xi[line].filter(m => !m.me).map(m => m.slot).sort();
    const expect = [...want].sort();
    for (const s of got) if (!expect.includes(s)) fail(`an invented man wears ${s} in the ${line} line`);
  }
  console.log('   240 sheets built, all eleven strong, all 4-3-3');
}

/* ---------- 2. The sheet cannot contradict the rank ---------- */
console.log('2) He starts, he sits, or he is not there, and the sheet agrees');
{
  let started = 0, benched = 0, omitted = 0;
  for (let i = 0; i < 400; i++) {
    const ovr = 45 + (i % 50);
    const nation = ['Spain', 'Argentina', 'Wales', 'Uganda'][i % 4];
    const call = pickSquad(nation, form({ overall: ovr, position: ['ST', 'CB', 'CM', 'GK'][i % 4] }));
    const xi = call.xi;
    const starters = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
    const grp = ['ATT', 'DEF', 'MID', 'GK'][i % 4];
    if (!call.called) {
      omitted += 1;
      if (xi.mySlot) fail('a player left out of the squad is on the team sheet');
      if (xiMen(xi).some(m => m.me)) fail('a player left out is marked on the sheet');
      if (xi.aheadOfMe) fail('a player left out was told who is ahead of him in the eleven');
    } else if (call.myRank <= starters[grp]) {
      started += 1;
      if (!xi.mySlot) fail(`rank ${call.myRank} of ${starters[grp]} starters did not start`);
      const me = xiMen(xi).find(m => m.me);
      if (!me) fail('a starter is not on his own sheet');
      else if (me.ovr !== Math.round(ovr)) fail(`the sheet rates the player ${me.ovr}, he is ${ovr}`);
    } else {
      benched += 1;
      if (xi.mySlot) fail(`rank ${call.myRank} started anyway`);
      if (!xi.aheadOfMe) fail('a squad player was not told who keeps him out');
      if (xi.aheadOfMe && !xiMen(xi).some(m => m.name === xi.aheadOfMe)) {
        fail(`the man ahead (${xi.aheadOfMe}) is not in the eleven`);
      }
    }
  }
  if (started < 20 || benched < 5 || omitted < 20) {
    fail(`the sample missed a state: ${started} started, ${benched} benched, ${omitted} omitted`);
  }
  console.log(`   ${started} starts, ${benched} squad places, ${omitted} left out, every one consistent`);
}

/* ---------- 3. He wears his own position ---------- */
console.log('3) A number ten is not filed as a holding midfielder');
{
  const pins = [['GK', 'GK'], ['CB', 'CB'], ['LB', 'LB'], ['RB', 'RB'], ['CDM', 'CDM'], ['CM', 'CM'], ['CAM', 'CAM'], ['ST', 'ST'], ['LW', 'LW'], ['RW', 'RW']];
  for (const [pos, want] of pins) {
    /* A 95 at a small nation is first choice for certain. */
    const call = pickSquad('Wales', form({ position: pos, overall: 95, lastRating: 7.8, lastGoals: 25 }));
    if (!call.called) { fail(`a 95 rated ${pos} did not make the Wales squad`); continue; }
    if (call.xi.mySlot !== want) fail(`a ${pos} starts at ${call.xi.mySlot}, expected ${want}`);
    const me = xiMen(call.xi).find(m => m.me);
    if (me && me.slot !== want) fail(`the sheet shirts a ${pos} as ${me.slot}`);
  }
  console.log('   ten positions, ten correct shirts, the ten keeps his own label');
}

/* ---------- 4. Better nations field better elevens ---------- */
console.log('4) Spain fields a better eleven than Luxembourg');
{
  const avg = nation => {
    let sum = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      const call = pickSquad(nation, null);
      for (const m of xiMen(call.xi)) { sum += m.ovr; n += 1; }
    }
    return sum / n;
  };
  const strong = avg('Spain');
  const weak = avg('Luxembourg');
  /* Measured 2026-08-19: about 82 against 70, a twelve point gap on the
     nation-strength curve the squad picker already used. The bar sits at 5,
     wide enough that jitter can never trip it and tight enough that a
     flattened curve fails loudly. */
  if (strong - weak < 5) fail(`Spain's eleven averages ${strong.toFixed(1)} against Luxembourg's ${weak.toFixed(1)}`);
  console.log(`   Spain ${strong.toFixed(1)}, Luxembourg ${weak.toFixed(1)}`);
}

/* ---------- 5. No invented man wears a real name ---------- */
console.log('5) The whole invented name space, against every real player');
{
  const real = new Set();
  for (const world of Object.values(NATIONALITY_BY_WORLD)) {
    for (const name of Object.keys(world)) real.add(name);
  }
  if (real.size < 5000) fail(`only ${real.size} real names loaded, the check is not checking much`);
  const all = allIntlNames();
  if (all.length < 4000) fail(`only ${all.length} invented names enumerated`);
  const hits = all.filter(n => real.has(n));
  if (hits.length) fail(`invented names that belong to real players: ${hits.slice(0, 10).join(' | ')}`);
  /* And against the real contenders the career engine ships by name. */
  const engine = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf-8');
  const contenders = new Set([...engine.matchAll(/\{ name: "([^"]+)", nationality:/g)].map(m => m[1]));
  if (contenders.size < 20) fail(`only ${contenders.size} real contenders parsed`);
  const clash = all.filter(n => contenders.has(n));
  if (clash.length) fail(`invented names that clash with the engine's real contenders: ${clash.join(' | ')}`);
  console.log(`   ${all.length} invented names over ${NAME_FAMILIES.length} traditions, 0 collide with ${real.size} real players or ${contenders.size} named contenders`);
}

/* ---------- 6. The free-pairing banks stay gone ---------- */
console.log('6) The banks that could mint a real name do not come back');
{
  const engine = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), 'utf-8');
  for (const banned of ['GEN_FIRST_NAMES', 'GEN_LAST_NAMES', 'RIVAL_FIRST_NAMES', 'RIVAL_LAST_NAMES']) {
    if (engine.includes(`const ${banned}`)) {
      fail(`${banned} is back in soccerCareerEngine; free pairing is how Mohamed Salah became a generated contender`);
    }
  }
  if (!engine.includes("from './intlNames'")) fail('the engine no longer imports the guarded pools');
  if (!engine.includes('intlName(nat')) fail('generateContender is not using the guarded pools');
  const intl = fs.readFileSync(path.join(ROOT, 'src/lib/soccerInternational.ts'), 'utf-8');
  if (!intl.includes("from './intlNames'")) fail('the international engine does not use the guarded pools');
}

/* ---------- 7. Every nation can field a named eleven ---------- */
console.log('7) No nation the engine can hand you is nameless');
{
  const nations = Object.keys(NATION_CONFED);
  if (nations.length < 90) fail(`only ${nations.length} nations parsed from the engine`);
  const missing = nations.filter(n => !NATION_FAMILY[n]);
  if (missing.length) fail(`nations with no naming tradition: ${missing.join(' | ')}`);
  /* And the families they point at all exist. */
  const ids = new Set(NAME_FAMILIES.map(f => f.id));
  for (const [nation, fam] of Object.entries(NATION_FAMILY)) {
    if (!ids.has(fam)) fail(`${nation} points at missing family ${fam}`);
  }
  /* A nation not in the map still gets a working eleven rather than blanks. */
  const oddball = pickSquad('Atlantis', null);
  if (xiMen(oddball.xi).some(m => !m.name || m.name.length < 3)) fail('an unmapped nation produced blank names');
  if (familyFor('Atlantis').id !== 'anglo') fail('the fallback family moved without the comment being updated');
  console.log(`   ${nations.length} nations, every one with a naming tradition`);
}

/* ---------- 8. The same save always draws the same eleven ---------- */
console.log('8) Names are stable, ratings are the only thing that moves');
{
  const a = Array.from({ length: 11 }, (_, i) => intlName('Japan', i));
  const b = Array.from({ length: 11 }, (_, i) => intlName('Japan', i));
  if (a.join('|') !== b.join('|')) fail('the same nation drew two different elevens');
  if (new Set(a).size !== 11) fail('a single eleven repeated a name');
  const jp = new Set(Array.from({ length: 11 }, (_, i) => intlName('Japan', i)));
  const ng = new Set(Array.from({ length: 11 }, (_, i) => intlName('Nigeria', i)));
  for (const n of jp) if (ng.has(n)) fail(`${n} turns out for both Japan and Nigeria`);
  console.log('   stable per nation, distinct across nations');
}

/* ---------- 9. Copy discipline ---------- */
console.log('9) No em or en dash in the new files');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  for (const f of ['src/lib/intlNames.ts', 'src/components/soccer-career/InternationalPanel.tsx']) {
    const t = fs.readFileSync(path.join(ROOT, f), 'utf-8');
    if (DASHES.test(t)) fail(`${f}: dash in copy`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`simStartingXi: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simStartingXi: green. He can see the eleven, and not one man on it is somebody real.');
