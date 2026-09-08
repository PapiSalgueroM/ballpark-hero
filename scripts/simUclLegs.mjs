/*
 * Round 507 harness: the Champions League knockout is played over two legs.
 *
 * His ask was "add first and second legs to Champions League knockout ties
 * whenever that season's real format uses two legs", and the last clause is the
 * one this harness exists to protect. Before Round 507 a knockout tie was ONE
 * match: UclTie carried a single home and away pair, a winner and an optional
 * pens flag, and there was no leg anywhere in the engine.
 *
 * The rules underneath, two source verified on 2026-09-08 against UEFA's own
 * announcement and Sky Sports, with ESPN and Goal agreeing:
 *
 *   - R16, QF and SF are two legs; the final is one match at a neutral venue;
 *   - the away goals tiebreak ran from 1965 and was abolished for every UEFA
 *     club competition from the 2021/22 season, after which a level aggregate
 *     goes to extra time and then penalties, and away goals carry no extra
 *     weight in extra time either.
 *
 * So the three historic eras here (2005, 2010, 2015) play away goals and the
 * modern save does not, and section 1 checks that against the year rather than
 * against a list somebody typed.
 *
 * Sections:
 *  1. The format, per era. Legs per round, the final always one, and which
 *     seasons split a level aggregate on away goals.
 *  2. uclTieOutcome, driven directly. Aggregate both ways, away goals both
 *     ways, a tie level on everything the era can separate it by, and the rule
 *     that the SAME two legs give a different winner under the two eras, which
 *     is the strongest single signal that the era rule is really being read.
 *  3. A season actually played. My round of 16 tie has two weeks, at opposite
 *     grounds, the first leg eliminates nobody and settles nothing, the tie
 *     resolves only after the second, and the headline score equals the two
 *     legs added up.
 *  4. The rest of the round. Every AI tie in a two legged round carries both
 *     legs and an aggregate that matches them, and no tie in the round settles
 *     while mine is one match old.
 *  5. A one legged round and an old save. The final is still a single match,
 *     and a tie carrying no legs at all still settles the way it always did,
 *     which is what every bracket written before Round 507 looks like.
 *
 * Negative controls (house rule: prove the checks can fail):
 *   UCL_LEGS_CONTROL=oneleg    makes every round one leg again, so sections 1,
 *                              3 and 4 lose the second week and the legs.
 *   UCL_LEGS_CONTROL=noaway    turns the away goals rule off in every era, so
 *                              section 1 and section 2's era split go red.
 *   UCL_LEGS_CONTROL=alwaysaway turns it on in every era, the mirror, so the
 *                              modern era is wrongly split on away goals.
 *   UCL_LEGS_CONTROL=legone    lets a first leg settle the tie, so section 3
 *                              finds a winner a week early.
 *   UCL_LEGS_CONTROL=legacyguard restores the exact regression Round 507
 *                              shipped, reading a calendar entry with no uclLeg
 *                              as leg one of two, so section 5's legacy save
 *                              never settles its bracket.
 *   UCL_LEGS_CONTROL=eraseed   restores the seeding defect the FIX review found,
 *                              keying the two legged swap off the era format
 *                              instead of off the calendar this save holds, so a
 *                              one week round of 16 still hands the group winner
 *                              tie.away and he plays his only knockout match at
 *                              the runner-up's ground. Section 5's draw
 *                              comparison goes red on all three eras.
 * Each control refuses to run if its rewrite did not find its text.
 *
 * MEASURED. Printed every run rather than asserted as a band, because these are
 * counts of a format rather than a distribution: 4 eras read, 14 outcome cases,
 * at least two era seasons played to the round of 16, and every tie in those
 * rounds checked, plus three legacy calendars played out in section 5. A
 * section cannot pass empty because each prints its count and fails on a count
 * of zero.
 *
 * Two things in here were wrong until the review's dropped findings were read
 * by hand, and both are worth remembering. Section 2 passed literal true and
 * false into uclTieOutcome, so it measured the PARAMETER and never called
 * uclAwayGoalsApply at all, while this header credited it as the strongest
 * signal that the era rule is read: it takes the rule from the eras now.
 * And section 3 only failed when it measured ZERO era seasons, so a seed where
 * two of the three clubs went out early left the whole played half of the
 * harness resting on one season.
 *
 * Run: node scripts/simUclLegs.mjs
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const ENTRY = `${TMP}/uclLegs.entry.mjs`;
const BUNDLE = `${TMP}/uclLegs.bundle.mjs`;

const CONTROL = process.env.UCL_LEGS_CONTROL || '';
const KNOWN = ['oneleg', 'noaway', 'alwaysaway', 'legone', 'legacyguard', 'eraseed'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`UCL_LEGS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}

const ENGINE_PATH = `${ROOT}/src/lib/clubManager.ts`;
let enginePath = ENGINE_PATH;

if (CONTROL) {
  /* The worktree checks out CRLF and the anchors below are written LF, so the
     read is normalised first. Every rewrite asserts its target is present: a
     control that changes nothing reports green for the wrong reason. */
  let src = fs.readFileSync(ENGINE_PATH, 'utf8').replaceAll('\r\n', '\n');
  const swap = (from, to) => {
    if (!src.includes(from)) {
      console.error(`control cannot run: clubManager.ts is not in the shape UCL_LEGS_CONTROL=${CONTROL} rewrites`);
      console.error(`  looked for: ${from}`);
      process.exit(1);
    }
    src = src.replace(from, to);
  };
  if (CONTROL === 'oneleg') {
    swap('  return uclSeasonYear(eraId) >= UCL_TWO_LEG_FIRST_YEAR ? 2 : 1;', '  return 1;');
  } else if (CONTROL === 'noaway') {
    swap('  return uclSeasonYear(eraId) <= UCL_AWAY_GOALS_LAST_YEAR;', '  return false;');
  } else if (CONTROL === 'alwaysaway') {
    swap('  return uclSeasonYear(eraId) <= UCL_AWAY_GOALS_LAST_YEAR;', '  return true;');
  } else if (CONTROL === 'legacyguard') {
    /* Restores the exact regression Round 507 shipped: treat a calendar entry
       with no uclLeg as leg one of two, so a legacy save never settles its
       bracket. Section 5 must go red on every era. */
    swap(
      '        if (!entry.uclLeg || entry.uclLeg >= legs) advanceUclBracket(state, entry.uclRound);',
      '        if (legs === 1 || (entry.uclLeg ?? 1) === legs) advanceUclBracket(state, entry.uclRound);',
    );
  } else if (CONTROL === 'eraseed') {
    /* Restores the seeding defect the fix review found: key the two legged
       swap off the ERA format rather than off the calendar this save holds, so
       a legacy one week round of 16 still hands the group winner tie.away and
       he plays his only knockout match at the runner-up's ground. Section 5's
       draw comparison must go red. */
    swap(
      '  const weeks = (state.calendar ?? []).filter(e => e.type === \'uclKo\' && e.uclRound === \'R16\');\n  if (weeks.length === 0) return uclLegsFor(state.eraId, \'R16\') === 2;\n  return weeks.some(e => e.uclLeg !== undefined);',
      '  return uclLegsFor(state.eraId, \'R16\') === 2;',
    );
  } else if (CONTROL === 'legone') {
    swap(
      "  tie.legs = 2;\n  if (leg === 1) {",
      "  tie.legs = 2;\n  if (false) {",
    );
  }
  const copy = `${TMP}/uclLegs.control.engine.ts`;
  fs.writeFileSync(copy, src);
  enginePath = copy;
}

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const cm = mod;
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`,
  { stdio: 'inherit' },
);

const { cm } = await import(pathToFileURL(BUNDLE).href);
const {
  startCareer, playNextEntry, uclLegsFor, uclAwayGoalsApply, uclTieOutcome, uclRoundOf16Draw,
} = cm;

for (const [name, fn] of Object.entries({ startCareer, playNextEntry, uclLegsFor, uclAwayGoalsApply, uclTieOutcome, uclRoundOf16Draw })) {
  if (typeof fn !== 'function') {
    console.error(`the harness could not reach ${name}; the bundle is not the shape it expects`);
    process.exit(1);
  }
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* The eras this game offers. The historic ids are what startCareer takes. */
const ERAS = [
  { id: 'era2005', year: 2005, awayGoals: true },
  { id: 'era2010', year: 2010, awayGoals: true },
  { id: 'era2015', year: 2015, awayGoals: true },
  { id: undefined, year: 'modern', awayGoals: false },
];

/* ---------- 1. The format, per era ---------- */
console.log('1) Every era plays the legs its own season played');
{
  let read = 0;
  for (const era of ERAS) {
    read += 1;
    for (const round of ['R16', 'QF', 'SF']) {
      const legs = uclLegsFor(era.id, round);
      if (legs !== 2) fail(`${era.year}: the ${round} is ${legs} leg(s) rather than 2`);
    }
    if (uclLegsFor(era.id, 'F') !== 1) {
      fail(`${era.year}: the final is ${uclLegsFor(era.id, 'F')} legs rather than one match`);
    }
    const away = uclAwayGoalsApply(era.id);
    if (away !== era.awayGoals) {
      fail(`${era.year}: away goals ${away ? 'apply' : 'do not apply'}, and in that season they ${era.awayGoals ? 'did' : 'did not'}`);
    }
  }
  console.log(`   ${read} eras read: 2005, 2010 and 2015 split a level tie on away goals, the modern season does not`);
  if (read !== 4) fail(`only ${read} eras were read`);
}

/* ---------- 2. uclTieOutcome, driven directly ---------- */
console.log('2) The tie is read the way the competition reads it');
{
  let cases = 0;
  /*
   * Round 507 follow-up: these were literal true and false, so the section
   * measured uclTieOutcome's PARAMETER and never once called the function that
   * decides the rule. The header credited it as the strongest signal that the
   * era rule is really being read, and the noaway control was documented as
   * turning it red. Neither was true: only section 1 touched uclAwayGoalsApply.
   * The rule now comes from the eras themselves, so a control that breaks the
   * era rule breaks these cases too, which is what the header always claimed.
   */
  const ERA_RULE = uclAwayGoalsApply('era2005');
  const NOW_RULE = uclAwayGoalsApply(undefined);
  if (ERA_RULE !== true || NOW_RULE !== false) {
    fail(`section 2 cannot run its era split: 2005 reads ${ERA_RULE} and the modern season reads ${NOW_RULE}`);
  }
  const check = (label, tie, awayRule, wantWinner, wantByAway = false) => {
    cases += 1;
    const out = uclTieOutcome(tie, awayRule);
    if (out.winner !== wantWinner) {
      fail(`${label}: winner ${out.winner} rather than ${wantWinner} (agg ${out.homeAgg}-${out.awayAgg})`);
    } else if (out.byAwayGoals !== wantByAway) {
      fail(`${label}: byAwayGoals ${out.byAwayGoals} rather than ${wantByAway}`);
    }
  };

  // Plain aggregate, both directions, under both rules.
  const homeWins = { leg1: { homeGoals: 2, awayGoals: 0 }, leg2: { homeGoals: 0, awayGoals: 1 } };
  check('home 2-1 on aggregate, away goals era', homeWins, ERA_RULE, 'home');
  check('home 2-1 on aggregate, modern', homeWins, NOW_RULE, 'home');
  const awayWins = { leg1: { homeGoals: 0, awayGoals: 1 }, leg2: { homeGoals: 1, awayGoals: 3 } };
  check('away 4-1 on aggregate, away goals era', awayWins, ERA_RULE, 'away');
  check('away 4-1 on aggregate, modern', awayWins, NOW_RULE, 'away');

  /* THE CASE THAT MATTERS, and the first draft of it was wrong in a way worth
     recording: 0-2 then 2-0 is level on aggregate AND level on away goals, two
     each, so penalties is the right answer in both eras and it proved nothing.
     A real away goals case needs the counts to differ.
     Here: leg one at tie.home finishes 1-2, so the away side has two away
     goals; leg two at tie.away finishes 1-0 to the home side, so the home side
     has one. Level at 2-2 on aggregate, and in an away goals era the away side
     goes through on 2 against 1. From 2021/22 the same two legs go to
     penalties. Same football, two answers, which is the whole point of reading
     the season rather than hard coding the rule. */
  const levelAwayEdge = { leg1: { homeGoals: 1, awayGoals: 2 }, leg2: { homeGoals: 1, awayGoals: 0 } };
  check('2-2, away side holds the away goals 2-1, away goals era', levelAwayEdge, ERA_RULE, 'away', ERA_RULE);
  check('2-2, away side holds the away goals 2-1, modern', levelAwayEdge, NOW_RULE, null);

  // The mirror: the home side has the away goals, 2 against 1.
  const levelHomeEdge = { leg1: { homeGoals: 0, awayGoals: 1 }, leg2: { homeGoals: 2, awayGoals: 1 } };
  check('2-2, home side holds the away goals 2-1, away goals era', levelHomeEdge, ERA_RULE, 'home', ERA_RULE);
  check('2-2, home side holds the away goals 2-1, modern', levelHomeEdge, NOW_RULE, null);

  // Level on aggregate AND on away goals: penalties in either era.
  const levelBoth = { leg1: { homeGoals: 0, awayGoals: 2 }, leg2: { homeGoals: 2, awayGoals: 0 } };
  check('2-2 with two away goals each, away goals era', levelBoth, ERA_RULE, null);
  check('2-2 with two away goals each, modern', levelBoth, NOW_RULE, null);

  // Dead level on everything: penalties in either era.
  const dead = { leg1: { homeGoals: 1, awayGoals: 1 }, leg2: { homeGoals: 1, awayGoals: 1 } };
  check('1-1 and 1-1, away goals era', dead, ERA_RULE, null);
  check('1-1 and 1-1, modern', dead, NOW_RULE, null);

  // A goalless tie is level in both eras.
  const goalless = { leg1: { homeGoals: 0, awayGoals: 0 }, leg2: { homeGoals: 0, awayGoals: 0 } };
  check('0-0 and 0-0, away goals era', goalless, ERA_RULE, null);
  check('0-0 and 0-0, modern', goalless, NOW_RULE, null);

  console.log(`   ${cases} outcomes checked, including the same two legs giving a different winner in the two eras`);
  if (cases < 12) fail(`only ${cases} outcome cases ran`);
}

/* ---------- 3 and 4. A season played, my tie and the rest of the round ---------- */
console.log('3) A round of 16 tie is two weeks at opposite grounds, and half of it settles nothing');
{
  let seasons = 0;
  let twoLegTies = 0;
  let aggregatesChecked = 0;
  for (const era of ERAS.filter(e => e.id)) {
    let s = startCareer('Barcelona', era.id);
    const legWeeks = [];
    let sawWinnerEarly = false;
    let myTieAfterLeg1 = null;
    let guard = 0;
    while (guard < 300) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const entry = s.calendar[s.week];
      /* A knockout week only belongs to me if I am actually still in the
         competition, which is exactly the engine's own playability rule. A
         club that went out in the group still has the weeks on its calendar
         and skips straight through them, and counting those was reading a
         season nobody played. */
      const isR16 = entry && entry.type === 'uclKo' && entry.uclRound === 'R16' && s.uclKoRound === 'R16';
      /* playNextEntry returns a PlayResult and not a state, and it stops at
         half time unless told not to. Getting either of those wrong reads as
         "the calendar vanished" three lines later. */
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) break;
      s = r.state;
      if (r.kind === 'seasonOver') break;
      if (isR16) {
        legWeeks.push(entry.uclLeg ?? null);
        const tie = s.uclBracket?.find(t => t.round === 'R16' && t.mine);
        if (legWeeks.length === 1) {
          myTieAfterLeg1 = tie ? { ...tie } : null;
          if (tie && tie.winner) sawWinnerEarly = true;
          /* And nobody else in the round may be through either. */
          const settled = (s.uclBracket ?? []).filter(t => t.round === 'R16' && t.winner).length;
          if (settled > 0) fail(`${era.year}: ${settled} round of 16 ties were settled after only the first legs`);
        }
      }
      if (s.sacked) break;
      if (legWeeks.length >= 2) break;
    }
    if (legWeeks.length < 2) {
      /* Being knocked out of the group or sacked is a legitimate season, but
         it means this era proved nothing, so say so rather than pass quietly. */
      console.log(`   ${era.year}: only reached ${legWeeks.length} round of 16 week(s) this seed, nothing measured`);
      continue;
    }
    seasons += 1;
    if (legWeeks[0] !== 1 || legWeeks[1] !== 2) {
      fail(`${era.year}: the two round of 16 weeks were legs ${legWeeks.join(' and ')} rather than 1 then 2`);
    }
    if (sawWinnerEarly) fail(`${era.year}: my tie had a winner after the first leg`);
    if (myTieAfterLeg1 && !myTieAfterLeg1.leg1) fail(`${era.year}: the first leg was not recorded on the tie`);
    if (myTieAfterLeg1 && myTieAfterLeg1.homeGoals !== null) {
      fail(`${era.year}: the tie carried a headline score of ${myTieAfterLeg1.homeGoals} after one leg`);
    }
    const tie = s.uclBracket?.find(t => t.round === 'R16' && t.mine);
    if (!tie) { fail(`${era.year}: my round of 16 tie vanished`); continue; }
    twoLegTies += 1;
    if (tie.legs !== 2) fail(`${era.year}: my settled tie says ${tie.legs} legs`);
    if (!tie.leg1 || !tie.leg2) fail(`${era.year}: my settled tie is missing a leg`);
    if (!tie.winner) fail(`${era.year}: my tie had no winner after both legs`);
    if (tie.leg1 && tie.leg2) {
      aggregatesChecked += 1;
      const h = tie.leg1.homeGoals + tie.leg2.homeGoals;
      const a = tie.leg1.awayGoals + tie.leg2.awayGoals;
      if (tie.homeGoals !== h || tie.awayGoals !== a) {
        fail(`${era.year}: the headline ${tie.homeGoals}-${tie.awayGoals} is not the legs added up (${h}-${a})`);
      }
      const out = uclTieOutcome(tie, uclAwayGoalsApply(era.id));
      const wanted = out.winner === null ? null : (out.winner === 'home' ? tie.home : tie.away);
      if (wanted !== null && tie.winner !== wanted) {
        fail(`${era.year}: ${tie.winner} went through where the rule says ${wanted}`);
      }
      if (out.winner === null && !tie.pens) {
        fail(`${era.year}: a tie level on everything the era separates by was not marked as penalties`);
      }
    }
    /* Section 4: the rest of the round played both legs too. */
    for (const t of (s.uclBracket ?? []).filter(x => x.round === 'R16' && !x.mine && x.winner)) {
      if (t.legs !== 2) { fail(`${era.year}: ${t.home} v ${t.away} settled over ${t.legs} leg(s)`); break; }
      if (!t.leg1 || !t.leg2) { fail(`${era.year}: ${t.home} v ${t.away} is missing a leg`); break; }
      const h = t.leg1.homeGoals + t.leg2.homeGoals;
      const a = t.leg1.awayGoals + t.leg2.awayGoals;
      if (t.homeGoals !== h || t.awayGoals !== a) {
        fail(`${era.year}: ${t.home} v ${t.away} reads ${t.homeGoals}-${t.awayGoals} against legs of ${h}-${a}`);
        break;
      }
    }
  }
  console.log(`   ${seasons} era season(s) reached both round of 16 legs, ${twoLegTies} of my ties settled over two, ${aggregatesChecked} aggregates checked against their legs`);
  /* A floor of two rather than one: with only one era season behind it the
     whole played half of this harness rests on a single career, and across
     SIM_SEED 1 to 38 the count ranged from 1 to 3. Two is what the default seed
     and the seeds checked in the Round 507 gate actually reach. */
  if (seasons < 2) {
    fail(`only ${seasons} era season(s) reached a second round of 16 leg, which is too few to rest this section on`);
  }
}

/* ---------- 5. THE SHAPE EVERY SAVE IN FLIGHT ACTUALLY HAS ---------- */
console.log('5) A calendar written before Round 507 still plays its whole knockout');
{
  /*
   * This section exists because Round 507 shipped a disqualifying regression
   * past a green harness and the adversarial review found it.
   *
   * Every career the live build saved carries ONE uclKo week per round with no
   * uclLeg field, and nothing migrates it: ensureUclCalendar only inserts a
   * MISSING round of 16 week and returns early when one is already there, and
   * it never touches the quarter or semi finals. The first version of the AI
   * only guard read `(entry.uclLeg ?? 1) === legs`, which on such an entry is
   * 1 === 2, so advanceUclBracket was never called and the bracket froze the
   * moment the manager's own club went out: later rounds never seeded, no
   * European champion, all season.
   *
   * simClubManagerEraUcl's migration section could not catch it, because it
   * builds a PRE-462 save by deleting the round of 16 weeks entirely, which
   * ensureUclCalendar then repairs with both legs. The shape that breaks is the
   * one in between, and it is the one everybody is playing.
   */
  let checked = 0;
  for (const era of ERAS.filter(e => e.id)) {
    let s = startCareer('Valencia', era.id);
    /* Downgrade to the pre-507 calendar: drop every second leg and strip the
       leg marker off what is left, which is exactly what the old build wrote. */
    s.calendar = s.calendar
      .filter(e => !(e.type === 'uclKo' && e.uclLeg === 2))
      .map(e => (e.type === 'uclKo' ? { type: e.type, round: e.round, uclRound: e.uclRound } : e));
    if (!s.calendar.some(e => e.type === 'uclKo' && e.uclRound === 'R16' && e.uclLeg === undefined)) {
      fail(`${era.year}: the harness could not build a legacy calendar to test`);
      continue;
    }
    let guard = 0;
    let endedEarly = '';
    while (guard < 400) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) { endedEarly = 'playNextEntry stopped'; break; }
      s = r.state;
      if (s.sacked) { endedEarly = 'sacked'; break; }
      if (r.kind === 'seasonOver') break;
    }
    /* A career that ended before the knockout measures nothing about the
       bracket, and blaming the engine for it is how a harness cries wolf. The
       first version of this section asserted on every era unconditionally and
       reported "the bracket froze" about a season the manager was sacked in
       week 20 of, which is the season working exactly as designed. */
    if (endedEarly) {
      console.log(`   ${era.year} legacy calendar: ${endedEarly} before the knockout, nothing measured`);
      continue;
    }
    const br = s.uclBracket ?? [];
    const settled = round => br.filter(t => t.round === round && t.winner).length;
    const seeded = round => br.filter(t => t.round === round).length;
    checked += 1;
    console.log(`   ${era.year} legacy calendar: R16 ${settled('R16')}/${seeded('R16')}, QF ${settled('QF')}/${seeded('QF')}, SF ${settled('SF')}/${seeded('SF')}, F ${settled('F')}/${seeded('F')}, exit ${s.uclKoRound}`);
    /* The bracket must reach a champion whatever happened to my own club. */
    const champion = br.find(t => t.round === 'F')?.winner ?? null;
    if (seeded('R16') > 0 && settled('R16') !== seeded('R16')) {
      fail(`${era.year}: a legacy calendar left ${seeded('R16') - settled('R16')} round of 16 ties unsettled`);
    }
    if (!champion) {
      fail(`${era.year}: a legacy calendar produced no European champion, so the bracket froze`);
    }
  }
  /* Two, not one, for the same reason section 3 has a floor of two: a single
     surviving career is too thin to rest a section on, and sackings mean the
     count moves with the seed. */
  if (checked < 2) fail(`only ${checked} legacy calendar(s) reached a full season, which is too few to judge`);

  /*
   * AND THE VENUE, which is the half this section did not check and which let a
   * real defect through. The seeded club hosts the DECIDING leg, so with two
   * legs the group winner is tie.away and with one leg he is tie.home. The
   * first version of the seeding swap keyed that off the ERA rather than off
   * the calendar, so a legacy save whose round of 16 is a single match still
   * handed the winner tie.away and he played his only knockout tie at the
   * runner-up's ground: home advantage exactly inverted for the club that had
   * earned it. Section 5 played those calendars and never looked.
   *
   * The check needs no group table: the same career drawn both ways must put
   * the two clubs on opposite sides of every tie.
   */
  let compared = 0;
  for (const era of ERAS.filter(e => e.id)) {
    let s = startCareer('Barcelona', era.id);
    let guard = 0;
    while (guard < 400 && (s.uclGroup?.matchday ?? 0) < 6) {
      guard += 1;
      if (!s.calendar || s.week >= s.calendar.length) break;
      const r = playNextEntry(s, { skipHalftime: true });
      if (!r || !r.state) break;
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    const native = uclRoundOf16Draw(s);
    if (!native || native.length === 0) continue;
    const legacy = uclRoundOf16Draw({
      ...s,
      calendar: s.calendar
        .filter(e => !(e.type === 'uclKo' && e.uclLeg === 2))
        .map(e => (e.type === 'uclKo' ? { type: e.type, round: e.round, uclRound: e.uclRound } : e)),
    });
    if (!legacy || legacy.length !== native.length) { fail(`${era.year}: the legacy draw had ${legacy?.length} ties against ${native.length}`); continue; }
    compared += 1;
    for (let i = 0; i < native.length; i++) {
      if (native[i].home !== legacy[i].away || native[i].away !== legacy[i].home) {
        fail(`${era.year} tie ${i}: two legs give ${native[i].home} v ${native[i].away} and one leg gives ${legacy[i].home} v ${legacy[i].away}, which is not the same tie the other way up`);
        break;
      }
    }
  }
  console.log(`   ${compared} era draws compared two legged against one legged: the seeded club swaps ends`);
  if (compared < 2) fail(`only ${compared} draws could be compared, too few to judge the seeding`);
}

/* ---------- 6. A one legged round, and a bracket from before Round 507 ---------- */
console.log('6) The final is one match, and a legless tie still settles');
{
  if (uclLegsFor('era2005', 'F') !== 1 || uclLegsFor(undefined, 'F') !== 1) {
    fail('the final is not a single match in every era');
  }
  /* Every bracket written before Round 507 looks like this: no legs, no leg1,
     no leg2. uclTieOutcome must still answer, treating the missing legs as
     nothing scored, so an old save cannot crash or hang on a tie it wrote. */
  const legless = {};
  const out = uclTieOutcome(legless, true);
  if (out.homeAgg !== 0 || out.awayAgg !== 0 || out.winner !== null) {
    fail(`a legless tie read ${out.homeAgg}-${out.awayAgg} winner ${out.winner} rather than 0-0 and level`);
  }
  const halfLegless = { leg1: { homeGoals: 3, awayGoals: 0 } };
  const out2 = uclTieOutcome(halfLegless, true);
  if (out2.winner !== 'home' || out2.homeAgg !== 3) {
    fail(`a tie with one leg recorded read ${out2.homeAgg}-${out2.awayAgg} winner ${out2.winner}`);
  }
  console.log('   the final is one match in every era, and a tie with no legs or one leg still reads without throwing');
}

if (failures) {
  console.error(`\nsimUclLegs: ${failures} FAILURES`);
  process.exit(1);
}
console.log('\nsimUclLegs: green. Two legs, the right ground each week, and each season judged by its own rule for a level tie.');
