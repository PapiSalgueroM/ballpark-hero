/**
 * Round 96 harness: does PLAYING WELL in Soccer Career actually pay off?
 *
 * The existing playtest (simSoccerCareer.mjs) proves the career does not
 * crash. It does not prove the career is worth playing, because it makes no
 * choices: it never trains, never chases a big club, and takes whatever
 * option comes first. That is the "asleep at the wheel" baseline.
 *
 * This one runs the same engine two ways, an ENGAGED player against that
 * baseline, and measures the gap. If a player who trains every session,
 * signs for the biggest club that wants him and picks the ambitious option
 * every time ends up in the same place as one who does nothing, then none of
 * the systems in the game actually matter and the career is a slideshow.
 *
 * Run: node scripts/simCareerEngaged.mjs [careers]
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = '/tmp/sc-engaged.mjs';
const ENTRY = '/tmp/sc-engaged-entry.mjs';

/* Round 124: this harness died on import with "localStorage is not defined",
   and it had been dead at origin/main before this round touched anything. The
   engine imports managerJobMarket, which imports clubManager, which imports
   squadDeal, which imports the Supabase client, which reads localStorage the
   moment the module loads. Nothing here needs Supabase, so the fix is the
   same two stage entry with a localStorage stub that scripts/simCup.mjs has
   used since Round 102. If you ever see this harness "pass" instantly with no
   output, it did not run. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export const engine = mod;
`);

await build({
  entryPoints: [ENTRY],
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
const { engine } = await import(pathToFileURL(OUT).href);
const {
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, dismissBallonDor, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyBdorSpeech, applyWorldCupSpeech,
  acceptRetirementSuggestion, stayAtClub, signExtension,
  FALLBACK_CLUBS, getCareerTotals, trainingAvailable, applyTrainingResult,
} = engine;

const CAREERS = Number(process.argv[2] || 120);
const clubs = FALLBACK_CLUBS;
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/** Best offer by club tier, then by wage. What an ambitious player takes. */
function bestOffer(offers) {
  const tier = o => o.club?.tier ?? o.clubTier ?? 9;
  return [...offers].sort((a, b) => tier(a) - tier(b) || (b.wage ?? 0) - (a.wage ?? 0))[0];
}

/**
 * Run one career.
 * mode 'engaged': train every session, take the biggest club, pick the first
 *   (most ambitious) option on events.
 * mode 'asleep': never train, take the first offer, pick the last option.
 */
/**
 * Potential is rolled at birth and dominates peak overall, so comparing two
 * randomly rolled players tells you about the dice, not about the play. Both
 * arms get the SAME ceiling for a given seed, walking the whole distribution
 * from journeyman to generational, which makes this a paired test.
 */
const POT_LADDER = [74, 77, 80, 83, 86, 89, 92, 95];

function runCareer(seed, mode) {
  const engaged = mode === 'engaged';
  const pot = POT_LADDER[seed % POT_LADDER.length];
  let s = initCareer(`Sim ${seed}`, 'England', 'ST', '2020s', stats(62), 62, 2020, clubs, null, pot);
  let guard = 0;
  let peak = s.overall;
  let bestGoals = 0;
  let trained = 0;
  let bestTier = 9, moves = 0;
  const totalsAtEnd = () => getCareerTotals(s.seasons || []);

  while (!s.retired && guard++ < 500) {
    // Training is a free stat every time it is offered, and the asleep
    // player simply never touches it.
    if (engaged && trainingAvailable(s)) {
      // Nail the drill every time: 95/100 is the +2 band.
      const before = s.trainingSeasonYear;
      s = applyTrainingResult(s, 'shooting', 95);
      if (s.trainingSeasonYear !== before) trained++;
    }
    switch (s.phase) {
      case 'youth': s = advanceYouthYear(s, clubs); break;
      case 'contract_offer': {
        const offers = s.pendingOffers || [];
        if (!offers.length) { s = { ...s, phase: 'playing' }; break; }
        s = acceptOffer(s, engaged ? bestOffer(offers) : offers[offers.length - 1]);
        break;
      }
      case 'playing': s = advanceProSeason(s, clubs); break;
      case 'newspaper': s = dismissNewspaper(s); break;
      case 'season_summary': s = dismissSummary(s, clubs); break;
      /* Round 124: both of these take clubs as their LAST argument and were
         being called without it, so they ran advanceToNextPhase with an
         undefined club list. It never threw, which is exactly what makes it a
         trap: a phase can be skipped silently and the harness still says
         everything is fine. */
      case 'international_debut': s = dismissDebut(s, clubs); break;
      case 'world_cup': s = dismissWorldCup(s, clubs); break;
      case 'rivalry_event': s = dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': s = dismissBallonDor(s, clubs); break;
      case 'bdor_speech': s = applyBdorSpeech(s, 0); break;
      case 'wc_speech': s = applyWorldCupSpeech(s, 0); break;
      case 'moral_dilemma': s = dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': s = dismissSocialMediaPhase(s, clubs); break;
      case 'red_card_appeal_result': s = dismissAppealResult(s, clubs); break;
      case 'retirement_suggestion': s = acceptRetirementSuggestion(s); break;
      case 'retirement_ceremony': case 'retired': s = { ...s, retired: true }; break;
      case 'random_events': {
        const ev = (s.pendingEvents || [])[0];
        if (!ev || !ev.choices || !ev.choices.length) { s = { ...s, phase: 'playing', pendingEvents: [] }; break; }
        s = applyEventChoice(s, engaged ? 0 : ev.choices.length - 1, clubs);
        break;
      }
      case 'contract_expiring': s = engaged ? signExtension(s) : stayAtClub(s); break;
      case 'transfer_window': {
        // The ambitious player moves up whenever a better club calls. The
        // asleep one never moves, which is the whole point of the contrast.
        const sit = s.transferSituation;
        const opts = sit
          ? [sit.offer, sit.offerA, sit.offerB, ...(sit.offers || [])].filter(Boolean)
          : [];
        const myTier = s.currentClubTier ?? 9;
        const better = opts.filter(o => (o.club?.tier ?? 9) <= myTier);
        if (engaged && better.length) { s = acceptOffer(s, bestOffer(better)); moves++; }
        else s = stayAtClub(s);
        break;
      }
      default: {
        // Unknown phase: nudge it forward rather than spinning forever.
        const before = s.phase;
        s = advanceProSeason(s, clubs);
        if (s.phase === before) return { stuck: before };
      }
    }
    if (s.overall > peak) peak = s.overall;
    if ((s.currentClubTier ?? 9) < bestTier) bestTier = s.currentClubTier ?? 9;
    const last = s.seasons && s.seasons[s.seasons.length - 1];
    if (last && last.goals > bestGoals) bestGoals = last.goals;
  }
  const t = totalsAtEnd();
  return {
    peak, bestGoals, trained, bestTier, moves, pot,
    goals: t?.goals ?? 0,
    apps: t?.apps ?? 0,
    seasons: (s.seasons || []).length,
    ballonDors: t?.ballonDors ?? 0,
    finalTier: s.currentClubTier,
    netWorth: s.netWorth ?? 0,
    stuck: null,
  };
}

function summarise(label, runs) {
  const n = runs.length;
  const avg = k => (runs.reduce((a, r) => a + (r[k] ?? 0), 0) / n).toFixed(1);
  const rate = f => ((runs.filter(f).length / n) * 100).toFixed(0);
  console.log(`   ${label.padEnd(9)} peak OVR ${avg('peak').padStart(5)} | best season ${avg('bestGoals').padStart(5)}g | career ${avg('goals').padStart(6)}g in ${avg('seasons')} seasons`);
  console.log(`   ${''.padEnd(9)} reached 85+ ${rate(r => r.peak >= 85).padStart(3)}% | 90+ ${rate(r => r.peak >= 90).padStart(3)}% | played for a tier 1 club ${rate(r => r.bestTier === 1).padStart(3)}% | moves ${avg('moves')} | trained ${avg('trained')}`);
  return {
    peak: Number(avg('peak')),
    bestGoals: Number(avg('bestGoals')),
    goals: Number(avg('goals')),
    r85: Number(rate(r => r.peak >= 85)),
    r90: Number(rate(r => r.peak >= 90)),
    elite: Number(rate(r => r.bestTier === 1)),
  };
}

console.log(`Running ${CAREERS} careers each way (same striker build, opposite play styles)`);
const engagedRuns = [], asleepRuns = [];
let stuck = 0;
for (let i = 0; i < CAREERS; i++) {
  for (const [mode, bucket] of [['engaged', engagedRuns], ['asleep', asleepRuns]]) {
    try {
      const r = runCareer(i, mode);
      if (r.stuck) { stuck++; if (stuck <= 2) console.error(`  stuck in phase "${r.stuck}"`); continue; }
      bucket.push(r);
    } catch (e) {
      fail(`${mode} career ${i} crashed: ${e && e.message}`);
    }
  }
}
if (stuck > 0) fail(`${stuck} careers got stuck in a phase with no way forward`);

console.log('\n1) Does playing well pay off?');
const E = summarise('ENGAGED', engagedRuns);
const A = summarise('ASLEEP', asleepRuns);

const peakGap = E.peak - A.peak;
console.log(`\n   peak overall gap: ${peakGap > 0 ? '+' : ''}${peakGap.toFixed(1)}`);
console.log(`   best season goals gap: ${(E.bestGoals - A.bestGoals).toFixed(1)}`);
console.log(`   career goals gap: ${(E.goals - A.goals).toFixed(1)}`);
if (engagedRuns.length < CAREERS * 0.9) fail('too many engaged careers failed to complete');
// Peak overall is bounded by the ceiling you are BORN with, so the gap here
// is meant to be modest: you cannot train your way past your own potential,
// you can only arrive at it. The gaps that prove engagement matters are the
// ones below, and they are enormous.
if (peakGap < 0.2) fail(`playing well is worth only ${peakGap.toFixed(1)} overall, the systems do not matter`);
/* Round 124: this was 1.08 and it was a coin toss away from failing. Over 44
   consecutive runs the engaged-to-asleep career goals ratio came out between
   1.082 and 1.161, median 1.126, so the threshold sat 0.2% under the worst
   run and the gate failed roughly one time in forty for no reason at all.
   A gate that cries wolf once a month is a gate people start ignoring.
   1.05 still says an engaged career must outscore autopilot by a clear
   margin, and it now has real headroom under the observed floor. */
if (E.goals <= A.goals * 1.05) fail('an engaged career scores no more than a career on autopilot');
console.log(`   played for a tier 1 club: engaged ${E.elite}% vs asleep ${A.elite}%`);
if (E.elite < 50) fail(`only ${E.elite}% of ambitious careers ever reach a top club`);
if (A.elite > 15) fail('a career on autopilot reaches top clubs almost as often, ambition is meaningless');

console.log('\n2) The ceiling is reachable');
console.log(`   engaged players reaching 85+: ${E.r85}%  |  90+: ${E.r90}%`);
if (E.r85 < 15) fail(`only ${E.r85}% of engaged careers reach 85 overall, the ceiling is unreachable`);
if (E.r90 < 3) fail(`only ${E.r90}% of engaged careers reach 90 overall, superstardom is impossible`);

console.log('\n3) The very top of the game is reachable');
{
  // The ladder deliberately oversamples high ceilings, so a raw win rate is
  // meaningless here. What matters is that the award tracks the player: a
  // generational talent who plays well should win it, and an honest pro
  // should not, no matter how well he plays.
  const band = (runs, lo, hi) => runs.filter(r => r.pot >= lo && r.pot <= hi);
  const rateIn = runs => runs.length ? Math.round(runs.filter(r => (r.ballonDors ?? 0) > 0).length / runs.length * 100) : 0;
  const eliteE = band(engagedRuns, 89, 99), plainE = band(engagedRuns, 0, 80);
  const eliteA = band(asleepRuns, 89, 99);
  console.log(`   engaged, ceiling 89+: ${rateIn(eliteE)}% won one (${eliteE.length} careers)`);
  console.log(`   engaged, ceiling 80-: ${rateIn(plainE)}% won one (${plainE.length} careers)`);
  console.log(`   asleep,  ceiling 89+: ${rateIn(eliteA)}% won one (${eliteA.length} careers)`);
  if (rateIn(eliteE) < 40) fail(`a generational talent playing well only wins the Ballon d'Or ${rateIn(eliteE)}% of the time`);
  if (rateIn(plainE) > 30) fail(`an honest pro wins the Ballon d'Or ${rateIn(plainE)}% of the time, the award means nothing`);
  if (rateIn(eliteE) < rateIn(plainE) * 2.5) fail('ceiling barely changes your odds, the award is not tracking the player');
  if (rateIn(eliteE) <= rateIn(eliteA)) fail('playing well does not improve your Ballon d\'Or odds at all');
}

console.log('\n4) A star striker scores like a star striker');
{
  const stars = engagedRuns.filter(r => r.peak >= 85);
  if (stars.length === 0) fail('no star careers to measure');
  else {
    const best = (stars.reduce((a, r) => a + r.bestGoals, 0) / stars.length).toFixed(1);
    console.log(`   ${stars.length} star careers, best season averaged ${best} goals`);
    if (Number(best) < 18) fail(`a star striker's best season is only ${best} goals, that is not a star`);
  }
}

console.log(failures === 0 ? '\nALL ENGAGED CAREER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
