/* Club Manager: the transfer kitty survives the summer, and the wage ceiling
   is the club's rather than a mirror of your own payroll.

   Round 436. Two defects in startNextSeason, both measured on the shipped
   engine before this harness existed.

   1) The budget rollover rebuilt next season's kitty from the club's STATIC
      definition and never read career.budget. Measured at Napoli: a manager
      who never signed anybody closed the season on 75.08m and was handed
      54m, while one who spent every window down to the floor closed on
      14.30m and was handed 64m. Saving was not merely ignored, it was
      punished, and the game's own rules screen says the opposite ("it is all
      one kitty"). A whole season of not buying was deleted every August.

   2) The wage ceiling was rebuilt every summer as 115 percent of the bill
      you happened to be paying that morning, so it tracked your own payroll
      in both directions. Measured over 12 clubs and 8 seasons: a manager who
      renewed every expiring player and bought every upgrade he could afford
      breached it in only 18 of 63 seasons, because each renewal he signed
      raised next summer's ceiling to cover itself, and his ceiling had
      drifted to 1.37x its day one number. Running the other way was worse: a
      squad that simply aged and churned dragged the ceiling DOWN with it, so
      Real Madrid's fell from 1593 to 808 by season seven and the club could
      no longer pay for the squad it had handed you on day one.

   Sections:
     1) the carried balance is an input at all. At every real summer the
        season-end state is cloned three ways (banked nothing, banked what it
        actually had, banked four times that), each clone rolled on the same
        seeded stream so the squads come out identical and the ONLY
        difference is the money. More banked must never open lower, and
        banking real money must open higher.
     2) the bound the rules screen promises. The four-times clone must not
        open four times higher: the carry stops at one more allocation, so
        the ceiling is exactly double what an empty balance opens on. The
        copy in src/pages/ClubManager.tsx is read and has to say so.
     3) a hoarder and a spender across consecutive summers of real careers,
        which is the outcome a player actually feels.
     4) the ceiling is no longer a mirror: how often next summer's cap comes
        out at exactly max(60, round(bill * 1.15)), the fingerprint of the
        old line.
     5) the ceiling binds. An engaged manager (renews everyone, buys every
        upgrade) must breach it in a measured share of seasons, and a manager
        living inside the squad he was handed must almost never breach it.
     6) a corrupt or pre-Round 436 balance fails closed rather than putting
        NaN into next season's kitty.

   Negative controls (house rule: prove the checks can fail):
     CM_BUDGET_CONTROL=static  bundles a copy of the engine with the static
       rebuild put back. Sections 1 and 3 must go red (measured: 18 failures,
       every banked balance opening on the same number as an empty one, and
       the saver's advantage falling from 1.47x to 1.00x).
     CM_BUDGET_CONTROL=selfcap bundles a copy with the self anchoring wage
       cap put back. Sections 4 and 5 must go red (measured: the mirror rate
       going 0 to 100 percent and the engaged breach rate 79 to 28).
     Either control refuses to run if its rewrite did not find its text.

   The thresholds come from these bands, this harness run over four to six
   seeds with the engine fixed and again with each control on. Every one of
   them sits roughly midway between the two bands rather than beside either:
     hoard/spend opening ratio, median   fixed 1.43 to 1.62   static 0.99 to 1.03   floor 1.20
     cap equals bill * 1.15              fixed 0% on 6 seeds  selfcap 100%          ceiling 25%
     engaged manager breaches the cap    fixed 74 to 81%      selfcap 19 to 29%     floor 50%
     keeper breaches the cap             fixed 0 to 5%                              ceiling 25%

   Run: node scripts/simClubManagerBudget.mjs
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
const CONTROL = process.env.CM_BUDGET_CONTROL || '';
if (CONTROL && CONTROL !== 'static' && CONTROL !== 'selfcap') {
  console.error(`CM_BUDGET_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

/* ---- bundle the engine, regressed when a control is on ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
if (CONTROL) {
  // The worktree checks out CRLF, the anchors below are written LF.
  const src = fs.readFileSync(ENGINE, 'utf8').replaceAll('\r\n', '\n');
  const fixed = CONTROL === 'static'
    ? '  const carried = moving || !Number.isFinite(career.budget) ? 0 : Math.max(0, career.budget);\n'
      + '  let budget = Math.round((allocation + Math.min(carried, allocation)) * 10) / 10;'
    : '  state.wageCap = moving\n'
      + '    ? wageCapFrom(wageBill(state))\n'
      + '    : nextWageCap(career.wageCap ?? wageCapFrom(wageBill(career)), club.expectation, prevPos, seasonTrophyCount);';
  const broken = CONTROL === 'static'
    ? '  let budget = allocation;'
    : '  state.wageCap = wageCapFrom(wageBill(state));';
  if (!src.includes(fixed)) {
    console.error(`control cannot run: clubManager.ts is not in the shape CM_BUDGET_CONTROL=${CONTROL} rewrites`);
    process.exit(1);
  }
  enginePath = `${TMP}/clubManagerBudget.control.ts`;
  fs.writeFileSync(enginePath, src.replace(fixed, broken));
  console.log(CONTROL === 'static'
    ? 'NEGATIVE CONTROL ON: the summer rebuilds the kitty from the club definition again'
    : 'NEGATIVE CONTROL ON: the wage ceiling re-anchors to your own bill again');
}
const ENTRY = `${TMP}/clubManagerBudget.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerBudget.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath}');
export const engine = mod;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const cm = (await import(pathToFileURL(BUNDLE).href)).engine;
const {
  startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, wageBill, expiringPlayers, renewContract,
} = cm;

/* A second stream the harness owns, so the three clones of one summer can be
   rolled from an identical draw and differ ONLY in the money. Same mix as
   scripts/lib/seedRandom.mjs. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rollWith(state, seed) {
  const saved = Math.random;
  Math.random = seeded(seed);
  try { return startNextSeason(state); }
  finally { Math.random = saved; }
}
/* The deep copy happens HERE and the balance is written after it, because a
   JSON round trip turns NaN and Infinity into null and section 6 would then
   be testing null seven times over. */
function withBudget(state, budget) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.budget = budget;
  return copy;
}

/** One season of football under a policy. 'hoard' signs nobody at all,
    'spend' empties the kitty on the best players it can reach every window,
    'engaged' also renews every expiring deal, which is what actually loads a
    wage bill up. */
function playSeason(start, policy) {
  let s = start;
  let guard = 0;
  let breached = false;
  let peak = 0;
  for (;;) {
    if (++guard > 130) break;
    if (policy === 'engaged') {
      for (const p of expiringPlayers(s)) { const nx = renewContract(s, p.id); if (nx) s = nx; }
    }
    if (policy !== 'hoard' && s.transferWindow) {
      const market = buildMarket(s).filter(m => m.price <= s.budget).sort((a, b) => b.rating - a.rating);
      for (const mp of market.slice(0, 60)) {
        if (s.squad.length >= 28) break;
        const nx = buyPlayer(s, mp);
        if (nx) s = nx;
      }
    }
    const bill = wageBill(s);
    if (isNum(bill) && isNum(s.wageCap) && s.wageCap > 0) {
      peak = Math.max(peak, bill / s.wageCap);
      if (bill > s.wageCap) breached = true;
    }
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind === 'seasonOver' || s.sacked) break;
  }
  return { state: s, breached, peak };
}

const CLUBS = ['Real Madrid', 'Arsenal', 'Napoli', 'Wolves', 'Ajax', 'Roma', 'Newcastle', 'Inter Miami'];

/* ---------- 1 and 2. the carry is an input, and it is bounded ---------- */
console.log('1) The carried balance is an input to the summer, and it is bounded');
let clones = 0, raised = 0, lowered = 0, realBalances = 0;
const doubleMultiples = [];
let cloneSeed = 0;
for (const club of CLUBS) {
  let s = startCareer(club);
  for (let season = 1; season <= 4; season++) {
    const played = playSeason(s, season % 2 ? 'hoard' : 'spend');
    s = played.state;
    if (s.sacked) break;
    s = finishSeason(s).state;
    const close = s.budget;
    const seed = (cloneSeed += 7919);
    const openEmpty = rollWith(withBudget(s, 0), seed);
    const openReal = rollWith(withBudget(s, close), seed);
    const openRich = rollWith(withBudget(s, close * 4 + 500), seed);
    clones += 1;
    for (const [label, o] of [['empty', openEmpty], ['real', openReal], ['rich', openRich]]) {
      if (!isNum(o.budget)) fail(`${club} s${season}: ${label} clone opened on a non-number budget (${o.budget})`);
      if (o.budget < 10) fail(`${club} s${season}: ${label} clone opened on ${o.budget}, below the 10m floor`);
    }
    if (openReal.budget < openEmpty.budget) lowered += 1;
    if (openRich.budget < openReal.budget) lowered += 1;
    if (close >= 1) {
      realBalances += 1;
      if (openReal.budget > openEmpty.budget) raised += 1;
      else fail(`${club} s${season}: closed on ${close}m banked and still opened on ${openReal.budget}, the same as a manager who banked nothing (${openEmpty.budget})`);
    }
    if (openEmpty.budget > 0) doubleMultiples.push(openRich.budget / openEmpty.budget);
    s = openReal;
  }
}
if (clones < 12) fail(`only ${clones} summers cloned, the sample is too thin to mean anything`);
if (realBalances < 10) fail(`only ${realBalances} of ${clones} summers closed with a real balance to carry`);
if (lowered > 0) fail(`${lowered} clone pairs opened LOWER on more money banked`);
const richMult = median(doubleMultiples);
const richMax = Math.max(...doubleMultiples);
console.log(`   ${clones} summers cloned three ways, ${realBalances} with a real balance banked; banking raised the opening kitty in ${raised}/${realBalances}`);
console.log(`   a balance of four times the close plus 500m opens on ${richMult.toFixed(2)}x what an empty balance opens on (highest ${richMax.toFixed(2)}x)`);
if (raised < realBalances) fail(`banking money raised next summer's kitty in only ${raised} of ${realBalances} summers`);
if (!(richMult >= 1.95 && richMax <= 2.05)) {
  fail(`the carry is not bounded at one extra allocation: an absurd balance opens on ${richMult.toFixed(2)}x (max ${richMax.toFixed(2)}x), expected 2.00x`);
}

console.log('2) The rules screen states the bound the engine enforces');
{
  const page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'ClubManager.tsx'), 'utf8');
  // Read the copy the player is shown, not the comments around it.
  const copy = page.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const claims = [
    ['carries the balance', /whatever you did not spend (?:comes|rolls)/i],
    ['names the cap on the carry', /one more (?:season'?s|summer'?s) worth|double the board'?s/i],
    ['says the balance stays with the club', /leave (?:the club|and the balance)|stays behind with the club|belongs to the club/i],
  ];
  for (const [what, re] of claims) {
    if (!re.test(copy)) fail(`the How to Play copy never ${what} (${re})`);
  }
  if (!/ceiling.*(club'?s season|not (?:on )?your (?:own )?(?:wage )?bill)|moves with the club/i.test(copy)) {
    fail('the How to Play copy never says what moves the wage ceiling');
  }
  console.log('   How to Play states the carry, its one-allocation cap, that it stays with the club, and what moves the ceiling');
}

/* ---------- 3. hoarder against spender, real careers ---------- */
console.log('3) A hoarder and a spender across consecutive summers');
/* Wider than the other sections on purpose. The two careers do not finish in
   the same league position, so their board allocations differ as well as
   their balances, and on eight clubs the median ratio swung between 1.23 and
   1.61 over five seeds. On twenty it sits in a band a threshold can live in.
   The clone in section 1 is the noise-free version of this same question; this
   one is here because it is what a player actually feels. */
const PAIR_CLUBS = [...CLUBS, 'Chelsea', 'Juventus', 'Marseille', 'Al-Hilal', 'Tottenham',
  'Sevilla', 'Lyon', 'Benfica', 'Celtic', 'Feyenoord', 'Bologna', 'Brentford'];
const ratios = [], closeGaps = [];
for (const club of PAIR_CLUBS) {
  let hoard = startCareer(club), spend = startCareer(club);
  for (let season = 1; season <= 6; season++) {
    hoard = playSeason(hoard, 'hoard').state;
    spend = playSeason(spend, 'spend').state;
    if (hoard.sacked || spend.sacked) break;
    hoard = finishSeason(hoard).state;
    spend = finishSeason(spend).state;
    const hClose = hoard.budget, sClose = spend.budget;
    hoard = startNextSeason(hoard);
    spend = startNextSeason(spend);
    if (hClose - sClose >= 5) {
      closeGaps.push(hClose - sClose);
      ratios.push(hoard.budget / Math.max(0.1, spend.budget));
    }
  }
}
const ratioMed = median(ratios);
console.log(`   ${ratios.length} summers where the saver ended at least 5m up (median gap ${median(closeGaps).toFixed(1)}m): he opens on ${ratioMed.toFixed(2)}x the spender's kitty`);
if (ratios.length < 18) fail(`only ${ratios.length} usable summer pairs, the sample is too thin`);
if (!(ratioMed >= 1.2)) fail(`the saver opens on only ${ratioMed.toFixed(2)}x the spender's kitty (floor 1.20; see the header for the measured bands)`);

/* ---------- 4 and 5. the wage ceiling ---------- */
console.log('4) The wage ceiling is no longer a mirror of your own bill');
let mirrors = 0, summers = 0;
let engagedSeasons = 0, engagedBreaches = 0;
const engagedPeaks = [];
for (const club of CLUBS) {
  let s = startCareer(club);
  for (let season = 1; season <= 7; season++) {
    const played = playSeason(s, 'engaged');
    s = played.state;
    engagedSeasons += 1;
    if (played.breached) engagedBreaches += 1;
    engagedPeaks.push(played.peak);
    if (s.sacked) break;
    s = startNextSeason(finishSeason(s).state);
    summers += 1;
    if (!isNum(s.wageCap) || s.wageCap < 60) fail(`${club} s${season}: bad wage cap ${s.wageCap}`);
    if (s.wageCap === Math.max(60, Math.round(wageBill(s) * 1.15))) mirrors += 1;
  }
}
const mirrorRate = mirrors / Math.max(1, summers);
console.log(`   ${summers} summers rolled: the new ceiling equalled 115 percent of that morning's bill in ${mirrors} of them (${(100 * mirrorRate).toFixed(0)} percent)`);
if (summers < 20) fail(`only ${summers} summers rolled, the sample is too thin`);
if (mirrorRate > 0.25) {
  fail(`the ceiling still mirrors your own payroll in ${(100 * mirrorRate).toFixed(0)} percent of summers (ceiling 25; see the header for the measured bands)`);
}

console.log('5) The wage ceiling actually binds, and only on the manager loading it up');
let keeperSeasons = 0, keeperBreaches = 0;
for (const club of CLUBS) {
  let s = startCareer(club);
  for (let season = 1; season <= 7; season++) {
    const played = playSeason(s, 'hoard');
    s = played.state;
    keeperSeasons += 1;
    if (played.breached) keeperBreaches += 1;
    if (s.sacked) break;
    s = startNextSeason(finishSeason(s).state);
  }
}
const engagedRate = engagedBreaches / Math.max(1, engagedSeasons);
const keeperRate = keeperBreaches / Math.max(1, keeperSeasons);
console.log(`   engaged manager breached in ${engagedBreaches}/${engagedSeasons} seasons (${(100 * engagedRate).toFixed(0)} percent, median peak bill ${median(engagedPeaks).toFixed(2)}x cap)`);
console.log(`   manager keeping the squad he was handed breached in ${keeperBreaches}/${keeperSeasons} seasons (${(100 * keeperRate).toFixed(0)} percent)`);
if (engagedSeasons < 20 || keeperSeasons < 15) fail(`thin sample: ${engagedSeasons} engaged seasons, ${keeperSeasons} keeper seasons`);
if (!(engagedRate >= 0.5)) {
  fail(`the ceiling binds in only ${(100 * engagedRate).toFixed(0)} percent of an engaged manager's seasons (floor 50; see the header for the measured bands)`);
}
if (keeperRate > 0.25) {
  fail(`the ceiling binds on ${(100 * keeperRate).toFixed(0)} percent of seasons for a manager who signed nobody, which makes it a tax rather than a cap (ceiling 25, measured 0 to 4)`);
}

/* ---------- 6. a corrupt balance fails closed ---------- */
console.log('6) A corrupt or pre-Round 436 balance carries nothing rather than NaN');
{
  let s = startCareer('Roma');
  s = finishSeason(playSeason(s, 'spend').state).state;
  const seed = 424242;
  const empty = rollWith(withBudget(s, 0), seed).budget;
  let checked = 0;
  for (const bad of [NaN, Infinity, -Infinity, -50, undefined, null, '210']) {
    const open = rollWith(withBudget(s, bad), seed).budget;
    checked += 1;
    if (!isNum(open)) fail(`a saved balance of ${String(bad)} opened the season on ${open}`);
    else if (open !== empty) fail(`a saved balance of ${String(bad)} carried ${open - empty}m into the new season instead of nothing`);
  }
  console.log(`   ${checked} corrupt balances all opened on ${empty}m, the same as a balance of zero`);
}

console.log(failures === 0 ? '\nsimClubManagerBudget: PASS' : `\nsimClubManagerBudget: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
