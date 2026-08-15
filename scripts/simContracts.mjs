/**
 * Round 105 harness: do contracts and wages actually constrain anything?
 *
 * Before this, keeping a 92 rated superstar cost exactly the same as keeping
 * a 68 rated squad player: nothing. No deal ever ran down, nobody ever left
 * on a free, and the transfer market was a one way street where you
 * accumulate forever. A constraint that never binds is not a feature, so
 * this measures whether it binds:
 *  - every player has a deal and a wage, and the wage curve is steep enough
 *    that a squad of superstars is genuinely unaffordable
 *  - deals run down, and a player you never sit down with leaves for nothing
 *  - a run down deal collapses his sale value, which is the real cost
 *  - renewing works, costs money, and resets the clock
 *  - an overspent wage bill actually moves board confidence
 *  - and a save made before any of this existed repairs itself
 * Run: node scripts/simContracts.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/conEntry.mjs';
const BUNDLE = '/tmp/con.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const cm = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { cm } = await import(BUNDLE);
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  wageFor, wageBill, wageCapFor, renewalTerms, renewContract, expiringPlayers,
  ensureContracts, sellValue,
} = cm;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

function runSeason(s) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 140) {
    guard++;
/* Round 125: Round 119 made every match stop at half time, and playNextEntry
   parks on the interval waiting for a decision unless it is told not to. This
   harness is about the season, not the interval, so every call below takes the
   straight through path, which is exactly the game this file was calibrated
   against before Round 119 existed. simHalftime and simOpposition are the two
   that DO want the break and they call playNextEntry raw on purpose. */
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

/* ---------- 1. Everyone has a deal, and the wage curve is steep ---------- */
console.log('1) Every player has a deal and a wage');
{
  for (const club of ['Manchester City', 'Burnley', 'Real Madrid', 'Inter Miami']) {
    const s = startCareer(club);
    for (const p of s.squad) {
      if (p.contractYears === undefined || p.contractYears < 1 || p.contractYears > 5) fail(`${club}: ${p.name} has contract ${p.contractYears}`);
      if (!p.wage || p.wage < 1) fail(`${club}: ${p.name} is on a wage of ${p.wage}`);
    }
    const years = new Set(s.squad.map(p => p.contractYears));
    if (years.size < 3) fail(`${club}: only ${years.size} distinct contract lengths, the whole squad expires together`);
    const bill = wageBill(s);
    const cap = s.wageCap;
    console.log(`   ${club}: bill ${bill}k a week vs a ${cap}k cap, ${((bill / cap) * 100).toFixed(0)} percent used`);
    if (bill > cap * 1.15) fail(`${club} starts ${Math.round((bill / cap - 1) * 100)} percent over its own wage cap`);
    if (bill < cap * 0.25) fail(`${club} starts on a quarter of its cap, so wages will never constrain anything`);
  }
  // The curve has to punish superstars far harder than squad players.
  const cheap = wageFor({ name: 'a', rating: 68, age: 26, value: 8, isYouth: false, morale: 70, fitness: 90 });
  const dear = wageFor({ name: 'b', rating: 90, age: 26, value: 120, isYouth: false, morale: 70, fitness: 90 });
  console.log(`   an 8m player costs ${cheap}k a week, a 120m player costs ${dear}k`);
  if (dear < cheap * 5) fail('the wage curve is too flat for a superstar to be a real decision');
}

/* ---------- 2. Deals run down and players walk ---------- */
console.log('2) Deals run down and the expired leave for nothing');
{
  let walked = 0, seasons = 0;
  let s = startCareer('Everton');
  const startNames = new Set(s.squad.map(p => p.name));
  for (let year = 0; year < 5; year++) {
    s = runSeason(s);
    s = finishSeason(s).state;
    const before = s.squad.length;
    s = startNextSeason(s);
    seasons++;
    // anyone gone who was not sold, loaned or retired: he walked
    const nowNames = new Set(s.squad.map(p => p.name));
    for (const n of startNames) if (!nowNames.has(n)) { /* counted below */ }
    walked += Math.max(0, before - s.squad.length);
    for (const p of s.squad) {
      if ((p.contractYears ?? 0) < 0) fail(`${p.name} is on a negative contract`);
    }
  }
  const feed = (s.transferLog ?? []).filter(t => t.to === 'a free transfer');
  console.log(`   over ${seasons} summers the news feed logged ${feed.length} free transfers out`);
  if (feed.length === 0) fail('nobody ever ran their deal down and left, so contracts never bite');
  if (s.squad.length < 14) fail(`the squad collapsed to ${s.squad.length} through expiries alone`);
}

/* ---------- 3. A run down deal wrecks his sale value ---------- */
console.log('3) A year left collapses the fee');
{
  const s = startCareer('Arsenal');
  const p = [...s.squad].sort((a, b) => b.rating - a.rating)[0];
  const safe = sellValue({ ...p, contractYears: 4 });
  const runDown = sellValue({ ...p, contractYears: 1 });
  console.log(`   ${p.name}: worth ${safe}m on a long deal, ${runDown}m with a year left`);
  if (runDown >= safe) fail('a player in the final year of his deal is worth the same, so letting it run is free');
  if (runDown < safe * 0.3) fail('the run down discount is so harsh the player is worthless');
}

/* ---------- 4. Renewing works and costs ---------- */
console.log('4) Renewing costs money and resets the clock');
{
  let s = startCareer('Chelsea');
  s = { ...s, squad: s.squad.map((p, i) => (i === 0 ? { ...p, contractYears: 1 } : p)) };
  const target = s.squad[0];
  const terms = renewalTerms(target);
  const budget0 = s.budget;
  const next = renewContract(s, target.id);
  if (!next) { fail('a renewal in an open window was refused'); }
  else {
    const after = next.squad.find(x => x.id === target.id);
    console.log(`   ${target.name}: ${terms.years} years at ${terms.wage}k, ${terms.fee}m to sign`);
    if (after.contractYears !== terms.years) fail('the renewal did not reset the deal');
    if (after.wage !== terms.wage) fail('the renewal did not set the new wage');
    if (next.budget >= budget0) fail('the renewal was free');
    if (after.morale <= target.morale) fail('a player is no happier for being kept');
    if (expiringPlayers(next).some(x => x.id === target.id)) fail('a renewed player still shows as expiring');
  }
  // Cannot renew someone else's loanee.
  const borrowed = { ...s.squad[1], onLoan: true };
  const t2 = { ...s, squad: s.squad.map(x => (x.id === borrowed.id ? borrowed : x)) };
  if (renewContract(t2, borrowed.id)) fail('a borrowed player was handed a new contract');
}

/* ---------- 5. The wage bill moves the board ---------- */
console.log('5) An overspent wage bill costs board confidence');
{
  // Measured over a run of matches at a strong club, so RESULTS do not swamp
  // the thing being measured. Averaged over FORTY runs, which sounds like a
  // lot until you watch it: results move confidence by plus or minus fifteen
  // a season and the wage penalty is worth about eight, so at twelve runs the
  // noise won a quarter of the time and this check flapped.
  const measure = (mult) => {
    let total = 0;
    for (let k = 0; k < 40; k++) {
      let s = startCareer('Manchester City');
      s = { ...s, wageCap: Math.round(wageBill(s) / mult) };
      const start = s.boardConfidence;
      let guard = 0;
      while (guard < 14 && s.week < s.calendar.length) {
        guard++;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      total += s.boardConfidence - start;
    }
    return total / 40;
  };
  const within = measure(0.7);   // bill is 70 percent of cap
  const over = measure(2.0);     // bill is double the cap
  console.log(`   inside the cap: confidence moved ${within.toFixed(1)}, well over it: ${over.toFixed(1)}`);
  if (over >= within) fail('blowing the wage budget costs nothing');
}

/* ---------- 6. Old saves repair themselves ---------- */
console.log('6) A save from before contracts existed');
{
  const s = startCareer('Ajax');
  const legacy = JSON.parse(JSON.stringify(s));
  for (const p of legacy.squad) { delete p.contractYears; delete p.wage; }
  delete legacy.wageCap;
  ensureContracts(legacy);
  const missing = legacy.squad.filter(p => p.contractYears === undefined || p.wage === undefined).length;
  console.log(`   ${legacy.squad.length} players repaired, ${missing} still missing a deal, cap ${legacy.wageCap}k`);
  if (missing > 0) fail(`${missing} players came out of the repair with no contract`);
  if (!legacy.wageCap) fail('the repair did not set a wage cap');
  // and it must be a no-op the second time
  const before = JSON.stringify(legacy);
  ensureContracts(legacy);
  if (JSON.stringify(legacy) !== before) fail('the repair changed an already repaired save');
}

/* ---------- 7. Copy check ---------- */
console.log('7) Copy check');
{
  const text = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
  let dashes = 0;
  text.split('\n').forEach((line, i) => {
    if (/[–—]/.test(line) && !line.includes('─')) { dashes++; fail(`clubManager.ts:${i + 1} has an em or en dash`); }
  });
  if (dashes === 0) console.log('   clean');
}

console.log(failures === 0 ? '\nALL CONTRACT CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
