/* Club Manager: the books add up, the projection lands near the season it
   projects, prices move the fans and the board, and the sponsor desk pays
   what it says after a push.

   Round 467. His words: "Finances: ticket and concession pricing with fan
   and board reactions, sponsor offers (good and bad brands, local or global,
   negotiable), a full projected finances screen: player wages, staff wages,
   travel, transfer income, everything a club spends and earns." The desk is
   src/lib/clubManagerFinances.ts and this file holds it to those words.

   Sections:
     1) the line items sum to the totals, at every week of several seasons:
        income lines to income, spend lines to spend, result to the
        difference, actual and projected alike, and the closed ledger the
        same way.
     2) the kitty identity. A passive manager (no deals, no scouts, no
        builders) plays a whole season, and the kitty's movement equals
        tickets plus food plus sponsor money to the pound. Wages, staff and
        travel are in the ledger and NOT in that sum, which is what the
        screen says: the engine has never taken them out of the kitty and
        this section is what stops anybody quietly starting.
     3) the projection made at week N against the season's closed ledger,
        over clubs and seeds, reported as the relative error on income and
        on spend at weeks 5, 15 and 30. The bands below come from the
        distribution printed here.
     4) prices and the fans: a fresh save opens on 50 with a crowd
        multiplier of exactly 1; fair tickets and cheap food lift the mood
        and premium costs it, by the numbers the desk prints; the board
        moves one point the day a ticket price changes and not for food;
        twelve weeks of drift never overshoots the target; the crowd
        multiplier runs 0.9 to 1.1.
     5) the sponsor desk: four offers (three shapes plus the bad brand at
        1.35 times the safe cheque), deterministic per club and season, each
        push worth six percent, one push past the ceiling walks the brand,
        and signing pays the pushed figure into the kitty and the ledger.
        A bad brand costs six mood on the day and buys the board a point.
     6) an old save and a mangled block fail closed: nine wreckages repair
        to fresh books, a save from before the desk plays a season and its
        ledger fills, a garbage block loads through loadCareer, a stay closes
        the ledger into lastSeason with the fans carried, a move opens fresh.
     7) words match code: the comment stripped sources never write the
        kitty from a wage or a travel figure, and the screen says so.

   Negative controls (house rule: prove the checks can fail):
     CM_FINANCES_CONTROL=leak bundles a copy of the desk whose weekly tick
       takes the wage bill out of the kitty. Sections 2 and 7 must go red.
     CM_FINANCES_CONTROL=nosum bundles a copy whose income total is the sum
       plus one. Section 1 must go red.
     Either control refuses to run if its rewrite did not find its text.

   Bands (this harness's own seeded stream, 6 clubs x 3 seeds, 13 seasons
   that reached the last day, measured on 2026-09-05): relative error of the
   projection against the closed ledger, income abs median 4.9 / 5.9 / 1.7
   percent and p90 9.2 / 7.9 / 4.5 percent at weeks 5 / 15 / 30; spend abs
   median 0.3 / 0.4 / 0.1 percent and p90 0.5 / 0.4 / 0.4 percent. The spend
   side is wages, which the calendar fixes, so it lands within half a
   percent from week 5; the income side leans on the average gate and the
   certain home games, so it undershoots a little when a cup run adds home
   ties. The bands sit at roughly twice those numbers: income median 10 /
   12 / 5 and p90 18 / 16 / 9 percent, spend median 1 / 1 / 0.5 and p90
   2 / 2 / 1 percent. Re-measured on SIM_SEED=2 (15 seasons: income abs
   median 4.4 / 6.6 / 1.1, p90 9.3 / 9.1 / 4.0) and SIM_SEED=3 (17 seasons:
   income abs median 6.4 / 8.3 / 1.7, p90 12.2 / 11.4 / 3.3; spend p90 0.6
   at worst) before the bands were kept.

   Run: node scripts/simClubManagerFinances.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_FINANCES_CONTROL || '';
if (CONTROL && CONTROL !== 'leak' && CONTROL !== 'nosum') {
  console.error(`CM_FINANCES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const lf = s => s.replaceAll('\r\n', '\n');
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN; };
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

/* ---- bundle the engine and the desk, regressed when a control is on ---- */
let deskPath = `${ROOT_URL}/src/lib/clubManagerFinances.ts`;
if (CONTROL) {
  const src = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFinances.ts'), 'utf8'));
  const fixed = CONTROL === 'leak'
    ? '  s.playerWages = round3(s.playerWages + wageBill(state) / 1000);'
    : "  const incomeProjected = sum(income, 'projected');";
  const broken = CONTROL === 'leak'
    ? '  s.playerWages = round3(s.playerWages + wageBill(state) / 1000);\n  state.budget = round2(state.budget - wageBill(state) / 1000);'
    : "  const incomeProjected = round2(sum(income, 'projected') + 1);";
  if (!src.includes(fixed)) { console.error(`control cannot run: clubManagerFinances.ts is not in the shape CM_FINANCES_CONTROL=${CONTROL} rewrites`); process.exit(1); }
  deskPath = `${TMP}/clubManagerFinances.${CONTROL}.ts`;
  fs.writeFileSync(deskPath, src.replace(fixed, broken));
  console.log(CONTROL === 'leak' ? 'NEGATIVE CONTROL ON: the weekly tick takes wages out of the kitty' : 'NEGATIVE CONTROL ON: the income total is the sum plus one');
}
const ENTRY = `${TMP}/clubManagerFinances.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerFinances.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/clubManager.ts');
export const desk = await import('${deskPath}');
export const fac = await import('${ROOT_URL}/src/lib/clubManagerFacilities.ts');
`);
const aliases = [`--alias:@/lib/clubManagerFinances=${deskPath}`, `--alias:@=${ROOT_URL}/src`];
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error ${aliases.join(' ')}`, { stdio: 'inherit' });
const mod = await import(pathToFileURL(BUNDLE).href);
const cm = mod.engine;
const fin = mod.desk;
const { startCareer, playNextEntry, finishSeason, startNextSeason, loadCareer, sponsorOffers, signSponsor } = cm;
const {
  projectFinances, closeLedger, booksOf, ensureBooks, isValidBooks, tickBooks, fanCrowdMult, fanMoodTarget,
  setTicketPolicy, setConcessionTier, sponsorTable, pushSponsor, acceptSponsor, FAN_MOOD_START,
  SPONSOR_PUSH_STEP, BAD_SPONSOR_MULT, BAD_SPONSOR_MOOD,
} = fin;
const { upgradeFacility } = mod.fac;

function makeStream(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* SIM_SEED moves every stream this harness owns, so a threshold can be
   re-measured on a fresh sample on purpose (the seedRandom convention). */
const SEED_OFFSET = (Number(process.env.SIM_SEED) || 0) * 7919;
const withStream = (seed, fn) => {
  const saved = Math.random;
  Math.random = makeStream(seed + SEED_OFFSET);
  try { return fn(); } finally { Math.random = saved; }
};
const clone = s => JSON.parse(JSON.stringify(s));
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* Clubs come off the playable lists, never from memory: startCareer takes
   any name and builds a world around it, and a name that is not in its
   league's list plays the whole season as byes. The floor club is the first
   tier 4 club on the 8m budget floor in the real leagues. */
const { playableClubs, REAL_LEAGUES } = cm;
const floorClub = (() => {
  for (const l of REAL_LEAGUES) for (const c of playableClubs(l.id)) if (c.budget <= 8 && c.tier === 4) return c.name;
  throw new Error('no floor club in the playable lists');
})();
for (const name of ['Real Madrid', 'Manchester City', 'Arsenal', 'Brentford', 'Napoli', 'Ajax', 'Newcastle', 'Everton']) {
  if (!REAL_LEAGUES.some(l => playableClubs(l.id).some(c => c.name === name))) { console.error(`${name} is not a playable club any more`); process.exit(1); }
}
const complete = s => s.week >= s.calendar.length;

/** Plays a season with a passive manager, calling `at(state)` before every entry. */
function playSeason(s, at) {
  let guard = 0;
  while (guard < 120 && s.week < s.calendar.length && !s.sacked) {
    guard++;
    if (at) at(s);
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}

function checkSums(p, where) {
  const sum = (lines, k) => Math.round(lines.reduce((n, l) => n + l[k], 0) * 100) / 100;
  if (!near(sum(p.income, 'actual'), p.incomeActual, 0.011)) fail(`${where}: income lines to date sum to ${sum(p.income, 'actual')}, total says ${p.incomeActual}`);
  if (!near(sum(p.income, 'projected'), p.incomeProjected, 0.011)) fail(`${where}: projected income lines sum to ${sum(p.income, 'projected')}, total says ${p.incomeProjected}`);
  if (!near(sum(p.spend, 'actual'), p.spendActual, 0.011)) fail(`${where}: spend lines to date sum to ${sum(p.spend, 'actual')}, total says ${p.spendActual}`);
  if (!near(sum(p.spend, 'projected'), p.spendProjected, 0.011)) fail(`${where}: projected spend lines sum to ${sum(p.spend, 'projected')}, total says ${p.spendProjected}`);
  if (!near(p.incomeActual - p.spendActual, p.resultActual, 0.011)) fail(`${where}: result to date is not income minus spend`);
  if (!near(p.incomeProjected - p.spendProjected, p.resultProjected, 0.011)) fail(`${where}: projected result is not income minus spend`);
  for (const l of [...p.income, ...p.spend]) {
    if (!Number.isFinite(l.actual) || !Number.isFinite(l.projected) || l.actual < 0 || l.projected < 0) fail(`${where}: line ${l.id} reads ${l.actual} / ${l.projected}`);
    if (l.projected + 0.011 < l.actual) fail(`${where}: line ${l.id} projects ${l.projected} below the ${l.actual} already on the books`);
  }
}

/* ---------- 1. The line items sum to the totals ---------- */
console.log('1) Every projection and every closed ledger adds up, week after week');
{
  let checked = 0, sacked = 0, finals = 0;
  for (const [i, club] of ['Real Madrid', 'Manchester City', 'Arsenal', floorClub].entries()) {
    withStream(10 + i, () => {
      const end = playSeason(startCareer(club), s => { checkSums(projectFinances(s), `${club} week ${s.week}`); checked++; });
      const c = closeLedger(end);
      if (!near(c.tickets + c.concessions + c.sponsor + c.transferIn, c.income, 0.011)) fail(`${club}: closed income does not sum`);
      if (!near(c.playerWages + c.staffWages + c.travel + c.transferOut + c.facilities, c.spend, 0.011)) fail(`${club}: closed spend does not sum`);
      if (!near(c.income - c.spend, c.result, 0.011)) fail(`${club}: closed result is not income minus spend`);
      if (!complete(end)) { sacked++; return; }
      finals++;
      const p = projectFinances(end);
      if (!near(p.incomeProjected, c.income, 0.011) || !near(p.spendProjected, c.spend, 0.011)) fail(`${club}: with nothing left to play the projection (${p.incomeProjected}/${p.spendProjected}) is not the ledger (${c.income}/${c.spend})`);
    });
  }
  if (checked < 120) fail(`only ${checked} weekly projections checked`);
  if (finals < 2) fail(`only ${finals} seasons reached the last day (${sacked} sacked)`);
  console.log(`   ${checked} weekly projections and 4 closed ledgers, every total the sum of its lines; on the ${finals} seasons that reached the last day the final projection equals the ledger (${sacked} sacked early)`);
}

/* ---------- 2. The kitty identity ---------- */
console.log('2) The kitty moves by tickets, food and sponsor money and nothing else; wages stay in the ledger');
{
  for (const [i, club] of ['Real Madrid', 'Manchester City', 'Brentford', 'Napoli'].entries()) {
    withStream(20 + i, () => {
      let s = startCareer(club);
      const start = s.budget;
      s = acceptSponsor(s, 'safe') ?? s;
      const end = playSeason(s);
      const c = closeLedger(end);
      const kittyLines = c.tickets + c.concessions + c.sponsor + c.transferIn - c.transferOut - c.facilities;
      const moved = end.budget - start;
      if (!near(moved, kittyLines, 0.6)) fail(`${club}: the kitty moved ${moved.toFixed(2)}m, the kitty lines say ${kittyLines.toFixed(2)}m`);
      if (!(c.playerWages > 0 && c.staffWages > 0 && c.travel > 0)) fail(`${club}: the ledger has no running costs (${c.playerWages}/${c.staffWages}/${c.travel})`);
      if (c.weeks !== end.week) fail(`${club}: ${c.weeks} weeks charged over ${end.week} calendar entries`);
      if (c.homeGames + c.awayTrips < Math.floor(c.weeks * 0.6)) fail(`${club}: only ${c.homeGames} home and ${c.awayTrips} away in the ledger over ${c.weeks} weeks`);
      console.log(`   ${club}: kitty ${start.toFixed(1)}m to ${end.budget.toFixed(1)}m (${moved >= 0 ? '+' : ''}${moved.toFixed(2)}m), kitty lines ${kittyLines.toFixed(2)}m; wages ${c.playerWages.toFixed(1)}m, staff ${c.staffWages.toFixed(1)}m, travel ${c.travel.toFixed(2)}m stayed in the ledger over ${c.weeks} weeks, ${c.homeGames} home, ${c.awayTrips} away`);
    });
  }
}

/* ---------- 3. The projection against the season ---------- */
console.log('3) The projection at week N against the closed ledger, over clubs and seeds');
{
  const AT = [5, 15, 30];
  const err = { income: { 5: [], 15: [], 30: [] }, spend: { 5: [], 15: [], 30: [] } };
  const CLUBS = ['Real Madrid', 'Manchester City', 'Arsenal', 'Brentford', 'Napoli', 'Ajax'];
  let runs = 0, sackedRuns = 0;
  for (const [i, club] of CLUBS.entries()) {
    for (let seed = 0; seed < 3; seed++) {
      withStream(1000 + i * 10 + seed, () => {
        const snaps = {};
        const end = playSeason(startCareer(club), s => { if (AT.includes(s.week)) snaps[s.week] = projectFinances(s); });
        /* A sacking ends the season early and the projection was made for a
           season that plays out, so those runs are counted and left out. */
        if (!complete(end)) { sackedRuns++; return; }
        const c = closeLedger(end);
        for (const w of AT) {
          const p = snaps[w];
          if (!p) continue;
          err.income[w].push((p.incomeProjected - c.income) / Math.max(1, c.income));
          err.spend[w].push((p.spendProjected - c.spend) / Math.max(1, c.spend));
        }
        runs++;
      });
    }
  }
  for (const w of AT) {
    const ai = err.income[w].map(Math.abs), as = err.spend[w].map(Math.abs);
    console.log(`   week ${w}: income error median ${(median(err.income[w]) * 100).toFixed(1)}% (abs median ${(median(ai) * 100).toFixed(1)}%, p90 ${(pct(ai, 0.9) * 100).toFixed(1)}%), spend error median ${(median(err.spend[w]) * 100).toFixed(1)}% (abs median ${(median(as) * 100).toFixed(1)}%, p90 ${(pct(as, 0.9) * 100).toFixed(1)}%) over ${ai.length} runs`);
  }
  console.log(`   ${runs} seasons reached the last day, ${sackedRuns} ended in a sacking and are left out`);
  if (runs < 12) fail(`only ${runs} seasons projected`);
  /* Bands: [abs median, p90] of the relative error, set at roughly twice
     the distribution measured on 2026-09-05 (see the header) rather than
     beside it, and re-measured on SIM_SEED=2 and 3 before they were kept. */
  const BAND = { income: { 5: [0.10, 0.18], 15: [0.12, 0.16], 30: [0.05, 0.09] }, spend: { 5: [0.01, 0.02], 15: [0.01, 0.02], 30: [0.005, 0.01] } };
  for (const w of AT) {
    for (const side of ['income', 'spend']) {
      const abs = err[side][w].map(Math.abs);
      const [med, p90] = BAND[side][w];
      if (!(median(abs) <= med)) fail(`week ${w} ${side}: abs median error ${(median(abs) * 100).toFixed(1)}% is over the ${med * 100}% band`);
      if (!(pct(abs, 0.9) <= p90)) fail(`week ${w} ${side}: p90 error ${(pct(abs, 0.9) * 100).toFixed(1)}% is over the ${p90 * 100}% band`);
    }
  }
  /* And the projection tightens as the season goes on, which is the whole point of projecting from actuals. */
  const tight = side => median(err[side][30].map(Math.abs)) <= median(err[side][5].map(Math.abs));
  if (!tight('income')) fail('the income projection is no tighter at week 30 than at week 5');
  if (!tight('spend')) fail('the spend projection is no tighter at week 30 than at week 5');
}

/* ---------- 4. Prices, the fans and the board ---------- */
console.log('4) Prices move the fans and the board by the numbers the desk prints');
{
  const s = startCareer('Everton');
  const b = booksOf(s);
  if (b.fanMood !== FAN_MOOD_START) fail(`a fresh save opens on ${b.fanMood} mood, not ${FAN_MOOD_START}`);
  if (fanCrowdMult(s) !== 1) fail(`a fresh save's crowd multiplier is ${fanCrowdMult(s)}, not exactly 1`);
  if (fanMoodTarget(s) !== FAN_MOOD_START) fail(`a fresh save's mood target is ${fanMoodTarget(s)}`);
  const conf = s.boardConfidence;
  const fair = setTicketPolicy(s, 0);
  if (!near(booksOf(fair).fanMood, b.fanMood + 3, 0.001)) fail(`fair tickets moved the fans ${booksOf(fair).fanMood - b.fanMood}, promised +3`);
  if (fair.boardConfidence !== conf - 1) fail(`fair tickets moved the board ${fair.boardConfidence - conf}, promised -1`);
  const prem = setTicketPolicy(s, 2);
  if (!near(booksOf(prem).fanMood, b.fanMood - 4, 0.001)) fail(`premium tickets moved the fans ${booksOf(prem).fanMood - b.fanMood}, promised -4`);
  if (prem.boardConfidence !== conf + 1) fail(`premium tickets moved the board ${prem.boardConfidence - conf}, promised +1`);
  const same = setTicketPolicy(s, 1);
  if (booksOf(same).fanMood !== b.fanMood || same.boardConfidence !== conf) fail('setting the price you already had moved something');
  if (booksOf(s).fanMood !== b.fanMood) fail('setTicketPolicy mutated the state it was handed');
  const cheap = setConcessionTier(s, 0);
  if (!near(booksOf(cheap).fanMood, b.fanMood + 2, 0.001) || cheap.boardConfidence !== conf) fail('cheap food did not move the fans +2 and the board 0');
  const dear = setConcessionTier(s, 2);
  if (!near(booksOf(dear).fanMood, b.fanMood - 3, 0.001) || dear.boardConfidence !== conf) fail('premium food did not move the fans -3 and the board 0');
  const drift = (st, weeks) => { const c = clone(st); for (let i = 0; i < weeks; i++) tickBooks(c); return c; };
  const warm = setConcessionTier(setTicketPolicy(s, 0), 0);
  const cold = setConcessionTier(setTicketPolicy(s, 2), 2);
  const warmT = fanMoodTarget(warm), coldT = fanMoodTarget(cold);
  if (warmT !== FAN_MOOD_START + 13) fail(`fair tickets and cheap food put the target on ${warmT}, designed ${FAN_MOOD_START + 13}`);
  if (coldT !== FAN_MOOD_START - 14) fail(`premium everything put the target on ${coldT}, designed ${FAN_MOOD_START - 14}`);
  const w12 = drift(warm, 12), c12 = drift(cold, 12);
  const wm = booksOf(w12).fanMood, cmood = booksOf(c12).fanMood;
  if (!(wm > booksOf(warm).fanMood + 5 && wm <= warmT)) fail(`twelve warm weeks took the mood to ${wm} against a target of ${warmT}`);
  if (!(cmood < booksOf(cold).fanMood - 5 && cmood >= coldT)) fail(`twelve cold weeks took the mood to ${cmood} against a target of ${coldT}`);
  const floor = { ...s, books: { ...booksOf(s), fanMood: 0 } };
  const ceil = { ...s, books: { ...booksOf(s), fanMood: 100 } };
  if (!near(fanCrowdMult(floor), 0.9, 0.0001) || !near(fanCrowdMult(ceil), 1.1, 0.0001)) fail(`the crowd multiplier runs ${fanCrowdMult(floor)} to ${fanCrowdMult(ceil)}, designed 0.9 to 1.1`);
  const winning = { ...s, form: ['W', 'W', 'W', 'W', 'W'] };
  const losing = { ...s, form: ['L', 'L', 'L', 'L', 'L'] };
  if (fanMoodTarget(winning) !== FAN_MOOD_START + 10 || fanMoodTarget(losing) !== FAN_MOOD_START - 10) fail(`five wins and five defeats put the target on ${fanMoodTarget(winning)} and ${fanMoodTarget(losing)}`);
  console.log(`   fresh save 50 mood, crowd x1; fair tickets +3 fans -1 board, premium -4 fans +1 board, cheap food +2, premium food -3; twelve weeks warm ${wm} (target ${warmT}), cold ${cmood} (target ${coldT}); crowd x0.9 to x1.1; five wins +10 on the target`);
}

/* ---------- 5. The sponsor desk ---------- */
console.log('5) Four offers, a six percent push, a brand that walks, and a signing that pays the pushed figure');
{
  const s = startCareer('Brentford');
  const table = sponsorTable(s);
  const good = table.filter(o => o.rep === 'good');
  const bad = table.find(o => o.rep === 'bad');
  if (table.length !== 4 || good.length !== 3 || !bad) fail(`the desk holds ${table.length} offers, ${good.length} good`);
  const safe = table.find(o => o.id === 'safe');
  if (!safe || !bad) fail('no safe or bad offer to compare');
  else if (!near(bad.perSeason, Math.round(safe.perSeason * BAD_SPONSOR_MULT * 10) / 10, 0.011)) fail(`the bad brand pays ${bad.perSeason}, the safe cheque is ${safe.perSeason}, designed x${BAD_SPONSOR_MULT}`);
  if (!table.every(o => o.reach === 'local' || o.reach === 'global')) fail('an offer has no reach');
  if (!table.some(o => o.reach === 'local') || !table.some(o => o.reach === 'global')) fail('the desk is all local or all global');
  if (JSON.stringify(sponsorTable(s)) !== JSON.stringify(table)) fail('the same club drew two different desks');
  const engineOffers = sponsorOffers(s);
  for (const o of good) {
    const e = engineOffers.find(x => x.id === o.id);
    if (!e || e.perSeason !== o.perSeason || e.brand !== o.brand) fail(`${o.id}: the desk's offer differs from the engine's before any push`);
  }
  if (new Set(table.map(o => o.brand)).size !== 4) fail('two offers share a brand');
  /* Push once: six percent up. Push until the brand walks. */
  const once = pushSponsor(s, 'safe');
  const after1 = sponsorTable(once).find(o => o.id === 'safe');
  if (!after1 || !near(after1.perSeason, Math.round(safe.perSeason * (1 + SPONSOR_PUSH_STEP) * 10) / 10, 0.011)) fail(`one push took the safe offer to ${after1?.perSeason}, expected six percent over ${safe.perSeason}`);
  if (after1 && after1.pushed !== 1) fail('the push was not counted');
  if (sponsorTable(s).find(o => o.id === 'safe').pushed !== 0) fail('pushSponsor mutated the state it was handed');
  let st = s, walkedAt = 0, guard = 0;
  while (guard++ < 6) {
    const next = pushSponsor(st, 'safe');
    if (!next) break;
    st = next;
    if (!sponsorTable(st).some(o => o.id === 'safe')) { walkedAt = guard; break; }
  }
  if (!walkedAt) fail('six pushes never walked the brand');
  else if (walkedAt !== safe.ceilingRounds + 1) fail(`the brand walked on push ${walkedAt}, its ceiling was ${safe.ceilingRounds} pushes`);
  if (!booksOf(st).walked.includes('safe')) fail('the walked brand is not on the books');
  if (pushSponsor(st, 'safe') !== null) fail('a walked brand took another push');
  if (sponsorTable(st).length !== 3) fail(`after the walk ${sponsorTable(st).length} offers remain, expected 3`);
  /* Sign after a push: the pushed figure lands in the kitty and the ledger. */
  const pushed = sponsorTable(once).find(o => o.id === 'safe');
  const before = once.budget;
  const signed = acceptSponsor(once, 'safe');
  if (!signed) fail('could not sign a pushed offer');
  else {
    if (!near(signed.budget - before, pushed.perSeason, 0.011)) fail(`signing paid ${(signed.budget - before).toFixed(2)}, the desk said ${pushed.perSeason}`);
    if (signed.sponsor?.perSeason !== pushed.perSeason) fail('the deal on the wall is not the pushed figure');
    if (signed.sponsor?.rep !== 'good' || !signed.sponsor?.reach) fail('the deal lost its reputation or reach');
    if (!near(booksOf(signed).season.sponsor, pushed.perSeason, 0.011)) fail('the ledger did not record the sponsor money');
    if (acceptSponsor(signed, 'performance') !== null) fail('a club signed two sponsors');
    if (pushSponsor(signed, 'performance') !== null) fail('a club with a deal pushed an offer');
  }
  if (acceptSponsor(s, 'not-an-offer') !== null) fail('an unknown offer id signed something');
  /* The bad brand. */
  const conf = s.boardConfidence, mood = booksOf(s).fanMood;
  const dirty = acceptSponsor(s, 'bad');
  if (!dirty) fail('could not sign the bad brand');
  else {
    if (dirty.sponsor?.rep !== 'bad') fail('the bad deal is not marked bad');
    if (!near(booksOf(dirty).fanMood, mood - 6, 0.001)) fail(`the bad brand moved the fans ${booksOf(dirty).fanMood - mood}, promised -6`);
    if (dirty.boardConfidence !== conf + 1) fail(`the bad brand moved the board ${dirty.boardConfidence - conf}, promised +1`);
    if (fanMoodTarget(dirty) !== fanMoodTarget(s) + BAD_SPONSOR_MOOD) fail(`the bad shirt moved the mood target ${fanMoodTarget(dirty) - fanMoodTarget(s)}, designed ${BAD_SPONSOR_MOOD}`);
    if (!near(dirty.budget - s.budget, bad.perSeason, 0.011)) fail('the bad brand did not pay what it said');
  }
  /* The engine's own three shape signing still works beside the desk. */
  if (!signSponsor(s, 'long')) fail('the engine\'s own signSponsor stopped working');
  console.log(`   Brentford: safe ${safe.perSeason}m (${safe.reach}), bad ${bad.perSeason}m; one push ${after1?.perSeason}m, walked on push ${walkedAt} (ceiling ${safe.ceilingRounds}); a bad shirt is -6 fans, +1 board, ${BAD_SPONSOR_MOOD} on the target`);
}

/* ---------- 6. Old saves and wreckage ---------- */
console.log('6) A save from before the desk, and a mangled block, both open fresh books and play');
{
  const base = startCareer('Newcastle');
  const WRECK = ['garbage', '{"v":1,"fan', 42, {}, null, [], { v: 99 }, { v: 1, concessionTier: 3, fanMood: 50, season: {}, lastSeason: null, pushed: {}, walked: [] }, { v: 1, concessionTier: 1, fanMood: 500, season: {}, lastSeason: null, pushed: {}, walked: [] }];
  for (const w of WRECK) {
    if (isValidBooks(w)) fail(`wreckage ${JSON.stringify(w)} passed as valid`);
    const s = { ...clone(base), books: w };
    const b = ensureBooks(s);
    if (!isValidBooks(b) || b.fanMood !== FAN_MOOD_START || b.concessionTier !== 1 || b.season.weeks !== 0) fail(`wreckage ${JSON.stringify(w)} repaired to ${JSON.stringify(b).slice(0, 80)}`);
  }
  const old = { ...clone(base), books: undefined };
  const played = withStream(31, () => playSeason(old));
  const c = closeLedger(played);
  if (!(c.weeks === played.week && c.homeGames >= 5 && c.playerWages > 0)) fail(`an old save's ledger did not fill (${c.weeks} weeks, ${c.homeGames} home, ${c.playerWages}m wages)`);
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  store.set('dukb-club-manager-save', JSON.stringify({ ...played, books: 'garbage' }));
  const loaded = loadCareer();
  if (!loaded) fail('a save with a garbage books block refused to load');
  else if (!isValidBooks(loaded.books)) fail('loadCareer handed back an invalid books block');
  /* The summer. */
  const warm = setTicketPolicy(played, 0);
  const { state: closed } = withStream(32, () => finishSeason(warm));
  const stay = withStream(33, () => startNextSeason(closed));
  const sb = booksOf(stay);
  if (!sb.lastSeason) fail('staying did not close the ledger into lastSeason');
  else if (!near(sb.lastSeason.income, closeLedger(closed).income, 0.011)) fail('lastSeason is not the season just closed');
  if (sb.season.weeks !== 0 || sb.season.tickets !== 0) fail('the new season opened with an old ledger');
  if (sb.fanMood !== booksOf(closed).fanMood) fail('the fans did not carry over a stay');
  if (sb.concessionTier !== booksOf(closed).concessionTier) fail('the food price did not carry over a stay');
  const moved = withStream(34, () => startNextSeason(closed, 'Ajax'));
  if (moved.clubName === 'Ajax' && moved.books !== undefined) fail('the manager took the books to Ajax in a suitcase');
  /* And a sponsor's summer money lands in the NEW season's ledger. */
  const withDeal = acceptSponsor(clone(closed), 'safe');
  if (withDeal) {
    const next = withStream(35, () => startNextSeason(withDeal));
    const deal = withDeal.sponsor;
    if (!near(booksOf(next).season.sponsor, deal.perSeason, 0.011)) fail(`the summer's sponsor money reads ${booksOf(next).season.sponsor} in the new ledger, the deal pays ${deal.perSeason}`);
  } else fail('could not sign a deal at the season end');
  const probe = { ...clone(base), books: undefined };
  booksOf(probe);
  if (probe.books !== undefined) fail('booksOf wrote into the state it was handed');
  console.log(`   ${WRECK.length} wreckages repaired to fresh books; an old save filled ${c.weeks} weeks, ${c.homeGames} home games, ${c.playerWages.toFixed(1)}m wages; garbage loads; stay closes and carries, move drops; summer sponsor money lands in the new ledger`);
}

/* ---------- 7. Words match code ---------- */
console.log('7) The kitty is never written from a wage or a travel figure, and the screen says so');
{
  const strip = s => lf(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const desk = strip(fs.readFileSync(deskPath, 'utf8'));
  const engine = strip(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
  const leaks = [];
  for (const [name, src] of [['clubManagerFinances.ts', desk], ['clubManager.ts', engine]]) {
    for (const line of src.split('\n')) {
      if (/\bbudget\s*(=|\+=|-=)/.test(line) && /wageBill|staffWagesWeekly|travelCost|playerWages|staffWages/.test(line)) leaks.push(`${name}: ${line.trim()}`);
    }
  }
  for (const l of leaks) fail(`the kitty is written from a running cost: ${l}`);
  const screen = lf(fs.readFileSync(path.join(ROOT, 'src/components/club-manager/FinancesScreen.tsx'), 'utf8'));
  if (!/never leave the kitty/.test(screen)) fail('the finances screen no longer says wages and travel never leave the kitty');
  const guide = lf(fs.readFileSync(path.join(ROOT, 'src/data/gameContent/soccer1.ts'), 'utf8'));
  if (!/never leave the transfer kitty/.test(guide)) fail('the guide no longer says wages and travel never leave the transfer kitty');
  const DASH = /[–—]/;
  for (const [name, src] of [['clubManagerFinances.ts', desk], ['clubManagerFacilities.ts', lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerFacilities.ts'), 'utf8'))], ['FinancesScreen.tsx', screen], ['FacilitiesScreen.tsx', lf(fs.readFileSync(path.join(ROOT, 'src/components/club-manager/FacilitiesScreen.tsx'), 'utf8'))]]) {
    if (DASH.test(src)) fail(`a dash in ${name}`);
  }
  console.log(`   0 kitty writes from a running cost across the desk and the engine; the screen and the guide both say so; no dashes in the four new files`);
}

console.log('');
if (failures > 0) {
  console.error(`simClubManagerFinances: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simClubManagerFinances: PASS. The books add up, the projection lands, prices move the fans and the board, and the sponsor desk pays what it says.');
