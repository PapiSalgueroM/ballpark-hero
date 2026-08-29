/**
 * Round 171 harness: the finance layer pays what it says and nothing else.
 *
 * Gate money is the first system that ADDS to the budget every week, so the
 * failure modes with teeth are: a gate that does not equal crowd times price
 * (the screen would lie), away or neutral games paying my till, ticket
 * policy with no real trade-off (a fake decision), expansions that cost
 * nothing or grow nothing or break the attendance bands, finance following
 * a manager to a new club, and old saves exploding on the missing field.
 *
 * Run: node scripts/simFinance.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'finEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'fin.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  setTicketTier, expandGround, groundUpgradeCost, gatePricePerFan,
  TICKET_TIERS,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function playWeeks(s, n) {
  for (let i = 0; i < n; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. The gate is exactly crowd times price, home only ---------- */
console.log('1) Home gates reconcile to the pound; nobody pays for away days');
{
  let s = startCareer('Everton');
  let homeGates = 0;
  let guard = 0;
  while (homeGates < 8 && guard < 40) {
    guard++;
    const before = s.budget;
    const priceBefore = gatePricePerFan(s);
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind !== 'match' || !r.report?.detail) continue;
    const d = r.report.detail;
    if (d.venue === 'home') {
      homeGates++;
      const expect = Math.round((d.attendance * priceBefore) / 1e6 * 100) / 100;
      const gained = Math.round((s.budget - before) * 100) / 100;
      if (Math.abs(gained - expect) > 0.011) fail(`home gate paid ${gained}m for ${d.attendance} at ${priceBefore}: expected ${expect}m`);
      if (s.finance?.lastGate === null || s.finance?.lastGate === undefined) fail('no lastGate after a home match');
      else if (Math.abs(s.finance.lastGate - expect) > 0.011) fail(`lastGate reads ${s.finance.lastGate}, gate was ${expect}`);
    } else {
      const gained = s.budget - before;
      if (gained > 0.001) fail(`an ${d.venue} match paid my till ${gained}m`);
    }
  }
  if (homeGates < 8) fail(`only ${homeGates} home gates sampled`);
  const fin = s.finance;
  if (!fin) fail('no finance block after home matches');
  console.log(`   ${homeGates} home gates exact; season gate so far ${fin?.seasonGate}m`);
}

/* ---------- 2. Ticket policy is a real trade-off ---------- */
console.log('2) Fair fills the ground, premium squeezes it');
{
  /* Same club, three policies. Round 190 re-derivation, after this
     section tailed TWICE (Rounds 188 and 190) on ten-game samples: a home
     crowd is uniform on the tier band (sigma about 4,330 at Everton's),
     so with n=10 per tier the fair-vs-premium RATIO has sigma about
     0.086 while the old bar sat 1.2 sigma under the true mean (1.165
     from multipliers 1.06 vs 0.91), an eleven percent flake per run.
     The engine offers no rng injection here, so per the standing rule
     the SAMPLE widens instead of the bar getting nudged blind: 40 home
     gates per tier (four careers each) puts ratio sigma near 0.037, and
     the re-derived bar of 1.04 sits 3.4 sigma under the mean, about one
     spurious failure in three thousand runs. Both directions of the
     trade-off stay guarded: fair fills a measurably bigger house, and
     premium still banks more money on the smaller crowd (1.3x price
     beats 0.8x, gate ratio about 1.6, nowhere near the noise floor). */
  const HOME_GATES_PER_TIER = 40;
  const results = [];
  for (const tier of [0, 1, 2]) {
    let att = 0;
    let gate = 0;
    let n = 0;
    for (let career = 0; career < 8 && n < HOME_GATES_PER_TIER; career++) {
      let s = startCareer('Everton');
      s = setTicketTier(s, tier);
      let guard = 0;
      while (n < HOME_GATES_PER_TIER && guard < 60) {
        guard++;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind !== 'match' || !r.report?.detail) continue;
        const d = r.report.detail;
        if (d.venue !== 'home') continue;
        n++;
        att += d.attendance;
      }
      gate += s.finance?.seasonGate ?? 0;
    }
    if (n < HOME_GATES_PER_TIER) fail(`tier ${tier}: only ${n} home gates sampled`);
    results.push({ tier, att: att / Math.max(1, n), gate });
  }
  const [fair, std, prem] = results;
  console.log(`   avg crowds over ${HOME_GATES_PER_TIER} gates: fair ${Math.round(fair.att)}, standard ${Math.round(std.att)}, premium ${Math.round(prem.att)} (ratio ${(fair.att / prem.att).toFixed(3)})`);
  console.log(`   summed gates: fair ${fair.gate.toFixed(1)}m, standard ${std.gate.toFixed(1)}m, premium ${prem.gate.toFixed(1)}m`);
  if (!(fair.att > prem.att * 1.04)) fail(`fair prices drew ${Math.round(fair.att)} against premium's ${Math.round(prem.att)}, the crowd effect is gone`);
  if (!(prem.gate > fair.gate)) fail(`premium earned ${prem.gate.toFixed(1)}m against fair's ${fair.gate.toFixed(1)}m, the pricing math is upside down`);
}

/* ---------- 3. Expansions cost, grow, and respect the bands ---------- */
console.log('3) The builders charge, the crowds grow, the caps hold');
{
  let s = startCareer('Everton');
  const cost0 = groundUpgradeCost(s);
  if (cost0 === null || cost0 <= 0) fail(`first expansion costs ${cost0}`);
  const poor = { ...s, budget: (cost0 ?? 1) - 1 };
  if (expandGround(poor) !== null) fail('an expansion the club cannot afford went through');
  const before = s.budget;
  const conf = s.boardConfidence;
  const e1 = expandGround(s);
  if (!e1) { fail('a funded expansion returned null'); }
  else {
    if (Math.abs(before - e1.budget - (cost0 ?? 0)) > 0.11) fail(`expansion charged ${before - e1.budget}m, priced ${cost0}m`);
    if ((e1.finance?.groundUpgrades ?? 0) !== 1) fail('the expansion did not land on the books');
    if (e1.boardConfidence <= conf && conf < 100) fail('the board did not warm to the ambition');
    const c2 = groundUpgradeCost(e1);
    if (c2 !== null && c2 <= (cost0 ?? 0)) fail(`the second expansion (${c2}m) is not dearer than the first (${cost0}m)`);
  }

  // Crowds actually grow: same club, 0 vs 3 expansions, mean home crowd.
  const meanCrowd = (state, n) => {
    let sum = 0, k = 0, guard = 0;
    let ss = state;
    while (k < n && guard < 60) {
      guard++;
      const r = playNextEntry(ss, { skipHalftime: true });
      ss = r.state;
      if (r.kind !== 'match' || !r.report?.detail) continue;
      if (r.report.detail.venue !== 'home') continue;
      k++;
      sum += r.report.detail.attendance;
      if (r.report.detail.attendance > 78000) fail(`a crowd of ${r.report.detail.attendance} broke the hard band`);
    }
    return sum / Math.max(1, k);
  };
  const base = startCareer('Everton');
  const built = { ...startCareer('Everton'), finance: { ticketTier: 1, groundUpgrades: 3, seasonGate: 0, lastGate: null } };
  const m0 = meanCrowd(base, 8);
  const m3 = meanCrowd(built, 8);
  console.log(`   mean home crowd: ${Math.round(m0)} unexpanded vs ${Math.round(m3)} with three expansions`);
  if (m3 < m0 * 1.15) fail(`three expansions moved the mean crowd only ${(m3 / m0).toFixed(2)}x`);

  // A custom ground's number genuinely rises and the crowd fits it.
  const spec = {
    name: 'Harbour City FC', stadium: 'Harbour Park',
    crest: { shape: 0, pattern: 2, color1: '#224488', color2: '#ffffff', initials: 'HC' },
    budgetTier: 'mid', leagueId: 'eredivisie', replacedClub: '',
    quality: 70, identity: 'balanced', capacity: 9000,
  };
  let cc = startCareer('Harbour City FC', undefined, spec);
  cc = { ...cc, finance: { ticketTier: 1, groundUpgrades: 2, seasonGate: 0, lastGate: null } };
  let seen = 0, guard2 = 0;
  while (seen < 3 && guard2 < 40) {
    guard2++;
    const r = playNextEntry(cc, { skipHalftime: true });
    cc = r.state;
    if (r.kind !== 'match' || !r.report?.detail) continue;
    const d = r.report.detail;
    if (d.venue !== 'home') continue;
    seen++;
    if (d.capacity !== 9000 + 12000) fail(`expanded custom ground reads ${d.capacity}, expected 21000`);
    if (d.attendance > (d.capacity ?? 0)) fail('the crowd outgrew the expanded custom ground');
  }
  if (seen < 3) fail('never saw three expanded custom home games');
}

/* ---------- 4. The books follow the club, not the manager ---------- */
console.log('4) Move clubs and the new ground is theirs, not yours');
{
  let s = startCareer('Everton');
  const grown = expandGround({ ...s, budget: 500 });
  if (!grown) { fail('setup expansion failed'); }
  else {
    let done = playWeeks(grown, 90);
    const fin = finishSeason(done);
    // Staying keeps the ground and resets the season books.
    const stay = startNextSeason(fin.state);
    if ((stay.finance?.groundUpgrades ?? 0) !== 1) fail('staying lost the expansion');
    if ((stay.finance?.seasonGate ?? -1) !== 0) fail('the new season did not open fresh books');
    if (stay.finance?.lastGate !== null) fail('last season\'s gate survived the summer');
    // Moving starts from scratch at the new club.
    const moved = startNextSeason(fin.state, 'Ajax');
    if (moved.clubName === 'Ajax' && moved.finance !== undefined) fail('the manager took the stadium works to Ajax in a suitcase');
  }
}

/* ---------- 5. Old saves and eras hold up ---------- */
console.log('5) Old saves default sanely; era prices run smaller');
{
  let s = startCareer('Everton');
  delete s.finance;
  const r = playWeeks(s, 6);
  if (!Number.isFinite(r.budget)) fail('an old save went NaN on its first gate');
  if (r.finance && !Number.isFinite(r.finance.seasonGate)) fail('seasonGate is not a number on an old save');
  const modern = gatePricePerFan(startCareer('Manchester United'));
  const era = gatePricePerFan(startCareer('Manchester United', 'era2010'));
  console.log(`   per-fan spend: ${modern} today vs ${era} in 2010`);
  if (!(era < modern)) fail('2010 ticket money is not smaller than 2026 ticket money');
  for (const tt of TICKET_TIERS) {
    if (!(tt.priceMult > 0 && tt.crowdMult > 0)) fail(`ticket tier ${tt.label} has a non-positive multiplier`);
  }
}

console.log(failures === 0 ? '\nALL FINANCE CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
