import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playFleet, seeded } from './lib/cmVarFleet.mjs';
import { derive } from './genCmVarRates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/clubManager.ts', helper = 'src/lib/clubManagerVar.ts', rates = 'src/data/clubManagerVarRates.ts';
/* Round 1218: the shipped rates come from real football and are small, so the MECHANICS outcomes below (a goal
   held for its review, a played review kept on a recut, a reload) are proven on FIXTURE rates, where every kind of
   review is frequent enough to find in a bounded search: the constants Round 1181 wrote, handed to the engine in
   place of the generated module. The BANDS outcome plays the generated module itself. */
const FIXTURE_RATES = 'export const CM_VAR_RATES = { goalReview: 0.16, overturn: 0.32, penaltyReview: 0.45, missedFoulReview: 0.015, penaltyScores: 0.74, penaltyOnTarget: 0.70 } as const;';
const RATES_LINE = /^export const CM_VAR_RATES = \{[^}]*\} as const;$/m;
const withFixtureRates = source => { assert.ok(RATES_LINE.test(source), 'The generated rates line exists'); return source.replace(RATES_LINE, FIXTURE_RATES); };
const clone = value => JSON.parse(JSON.stringify(value));
/* Round 1218, the bands outcome. The ranges are real football's (scripts/data/cmVarRates.json, through the generator).
   Since the review fix a range is the counts of the figures two publishers each counted and nothing else (Serie A
   2017-18: goals ruled out 29 to 31 in 380, penalties awarded 34 to 35 in 380), so a range is narrow and the band
   around it is in effect a band around the target: goals 0.0611 to 0.0979 a match, penalties 0.0716 to 0.1105. A
   rate that doubles, or halves, is outside it.
   headroom: how far past a range's edge the fleet's own sampling may put a healthy engine. MEASURED on a GitHub runner
   (result r1218-fx-a, head 79b9b254): seven fleets on seven disjoint sets of six seeds (31 to 36, 41 to 46, 51 to 56,
   61 to 66, 71 to 76, 101 to 106, 201 to 206), 3,955 to 4,065 league matches each.
     goals ruled out a match      0.0704 0.0807 0.0802 0.0767 0.0781 0.0845 0.0730   (target 0.0763: from 7.7% under to 10.7% over)
     penalties awarded a match    0.0873 0.0905 0.0969 0.0962 0.0952 0.0882 0.0952   (target 0.0895: from 2.5% under to 8.3% over)
   The engine aims at the LOW end of each range, so about half of all fleets land under it. One fleet's figure moves
   by about 6.3% of the target from fleet to fleet for goals and 4.5% for penalties (standard deviation over the
   seven), which is what counting about 310 and 370 events gives. The band's edges lie 3.5 and 4.2 of those from
   the goals mean and 5.3 and 4.4 from the penalties mean. The old constants land 77% under, 100% and 175% over.
   goalGap: the 0.05 goals a match simCmStoppageTime (tolGpm) already allows a rule to move the goal count by, taken
   here on the SAME match played with and without reviews. Measured: -0.0007 -0.0054 -0.0085 0.0002 -0.0015 -0.0180 0.0020.
   scoredShare: how far the share of review penalties that go in may sit from the engine penalty law's 0.76.
   Measured: 0.774 0.755 0.740 0.818 0.760 0.777 0.785 (349 to 388 kicks a fleet, one standard deviation 0.022).
   Round 1302 (the lead's decision 4): penalties a match with reviews on IS held now, against all the penalties of a
   real season in the ledger (penaltiesTotal: 120 and 126 in 380 by two publishers, 0.3158 to 0.3316 a match; with
   the same headroom the band is 0.2526 to 0.3979). MEASURED: seven fleets of Round 1218 gave 0.4515 0.4526 0.4679
   0.4780 0.4692 0.4518 0.4613 with reviews on (of which 0.087 to 0.097 a review awarded), every one above the band,
   the nearest by 13%, so the engine is outside it and not by sampling. What the band then asks is that penalties
   by review stay OFF: the ledger's open entry penalties-total holds the switch, and this harness is red when the
   engine is outside the band and that entry is gone (control penaltyband), or inside it with the entry still there.
   About 630 league matches in 4,000 have a review and about 240 end with another result than the same match
   without reviews.
   Round 1302, what the run review measured and this header did not know (no band was moved for it: the default
   seeds are fixed, so nothing here is a coin toss today, and it becomes one only if those seeds or a rate move).
   Three more fleets (seeds 301 to 306, 501 to 506, 901 to 906; runner result r1302-run-a) gave goals ruled out
   0.0788 0.0735 0.0644. Over the ten fleets on record the mean is 0.0760 and the standard deviation 0.0058, so the
   LOW edge of the goals band (0.0611) lies 2.6 standard deviations under the mean, not the 3.5 said above (that was
   seven fleets). Whoever next moves a rate or the default seeds measures the band again on more fleets first.
   And the penalty band's headroom (0.20) is the other bands', not one measured for that quantity: without reviews
   the engine sits at 0.3597 to 0.3821 a match against the band's top of 0.3979, a margin of 4 percent that is
   printed on every run and not asserted. It decides nothing while penalties-total is open; the day somebody
   closes that entry, that margin has to be measured on several fleets before it is trusted.
   Round 1303 (the lead's decision 1: a rate stands on the LOWEST of every reading two publishers or more give within
   a factor of two). The goal rate is 0.031456 a goal now (target 0.0752 a match, 23 in 306) and the ledger's range
   for goals ruled out runs to 0.1447, so the band is 0.0601 to 0.1737: the low edge is the one that works, the top
   edge only stops a rate that more than doubles. The penalty rate is 0.003605 a foul (target 0.0658 a match).
   MEASURED again on the new rates, ten fleets of 3,917 to 4,060 league matches (runner result r1303-gap, the goal
   kind alone, the same ten sets of six seeds as above):
     goals ruled out a match   0.0713 0.0770 0.0794 0.0720 0.0779 0.0838 0.0704 0.0781 0.0700 0.0662
       mean 0.0746, standard deviation 0.0054; the low edge lies 2.7 of those under the mean, and the lowest fleet
       (0.0662) is 10 percent above it. The default seeds give 0.0713.
     goals a match moved by    -0.0671 -0.0750 -0.0789 -0.0740 -0.0740 -0.0876 -0.0739 -0.0751 -0.0700 -0.0660
       mean -0.0743: EVERY fleet is outside goalGap (0.05), the nearest by a third. A goal a review rules out is a
       goal fewer, and with the penalty kind off nothing gives one back (the staged pair sits at -0.0189 because a
       review's penalties put about 0.05 back). So the goal kind ALONE is outside the family's band by its own
       design value, not by sampling, and the ledger holds it (owed goals-level) until the lead rules or the engine
       changes. The bands outcome plays both fleets and is red when the ledger and the measured engine disagree
       (controls goalslevel and playsgoal).
     results moved             2.6 to 3.6 percent of league matches (about one in 32); 6.4 to 8.2 percent have a
       goal ruled out (about one in 14).
   The KINDS outcome (decision 2) holds that the engine plays a kind only in a match kicked off with it and that
   the list is saved with the match (controls kindgoal, kindpenalty, kindsaved).
   Round 1303, THE FIX PASS (what the block above calls "until the engine changes"). The goals a review rules out
   are drawn ON TOP now: a match that reviews goals draws them 1 / (1 - goalReview x overturn) times as often
   (cmVarGoalLift), a goal a review can look at is ruled out at goalReview = 0.030501 a DRAWN goal, and a penalty
   or a direct free kick, which no review looks at, is taken back at the same rate without a review. The owed
   entry goals-level is gone, the goal kind is on in the ledger, and the controls goalslevel and playsgoal gave
   way to nolift (no lift: the old gap comes back), liftkind (the lift in a match that does not review goals)
   and liftpens (penalty goals lifted and never taken back). MEASURED on that engine (runner result r1303-fx-c,
   head 0eb6e17a), the goal kind alone, ten fleets of 3,897 to 4,046 league matches on the same ten sets of seeds:
     goals a match moved by    0.0054 0.0058 0.0058 -0.0118 0.0005 -0.0060 -0.0077 0.0106 0.0033 0.0012
       mean 0.0007, standard deviation 0.007: the band (0.05) lies 7 of those from the mean and the widest fleet
       (-0.0118) uses a quarter of it. Control nolift on the default seeds: -0.0753.
     goals ruled out a match   0.0699 0.0765 0.0771 0.0751 0.0785 0.0808 0.0715 0.0779 0.0731 0.0705
       mean 0.0751 (the target is 0.0752), standard deviation 0.0037; the low edge (0.0601) lies 4 of those
       under the mean and the lowest fleet is 16 percent above it.
     penalties a match moved by 0.0037 0.0121 0.0010 -0.0038 0.0020 -0.0028 -0.0079 0.0058 0.0036 -0.0072
       mean 0.0007 on 0.355 to 0.386 a match: level (the first version of the lift, which lifted penalty goals and
       never took them back, put about 0.008 on: r1303-fx-a). Printed on every run, not asserted here; the take
       back itself is held in the rates outcome (control liftpens).
     results moved             5.9 to 7.0 percent of league matches: more than before the lift (2.6 to 3.6),
       because a lifted match draws from the match stream differently from its first goal on, not because more
       goals are ruled out. The paired gap is unbiased noise around zero for the same reason.
   An independent fleet that shares no code with this harness (the run review's probe, r1303-fx-d): 4,297 league
   matches 2.7142 with against 2.7152 without, 4,327 matches 2.7083 against 2.7132, no penalty review in either.
   With EVERY kind staged the same ten fleets sit at 0.0435 to 0.0656 UP (a review's penalties add goals and
   nothing takes them back): at and past the band, the penalty kind's own doing, held with that kind by
   penalties-total (everyKindLevel below). */
const BANDS = { seeds: '31,32,33,34,35,36', headroom: 0.20, goalGap: 0.05, scoredShare: 0.10 };
const BASE = 'c33d013965aa33b87f5db23e2ca270be6fcd977c';
/** One seeded stretch on a fixed clock: the fleet's own function (scripts/lib/cmVarFleet.mjs), under the name the walk imports. */
export const withCmVarSeed = seeded;
function fresh(cm) {
  const career = withCmVarSeed(4107, () => cm.startCareer('Everton'));
  /* Release AT: Round 1184 gives a new Everton career the real fixture list, so its opener is another club than
     the one this search and the prior engine below were written against. The generated list is asked for the
     way Round 1184 itself asks for it in simLiveMatch and simClubManagerSlots: only the opt in key is taken off. */
  delete career.realLeagueFixtures;
  career.squad = career.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  return career;
}
export function findCmVarFixture(cm, kind = 'disallowed') {
  const pre = fresh(cm);
  for (let seed = 1700; seed < 3700; seed++) {
    const stop = withCmVarSeed(seed, () => cm.playNextEntry(pre, { varReviews: true }));
    assert.equal(stop.kind, 'halftime');
    const feed = cm.liveFeed(stop.state.live);
    const event = feed.find(e => e.kind === 'var' && e.review && e.minute > 2 && e.minute < 40 && !e.plus
      && (kind.startsWith('awarded_') ? e.review.decision === 'awarded' && !!stop.state.live.h1Play.find(p => p.kind === 'shot' && p.review?.id === e.review.id)?.goal === (kind === 'awarded_scored')
        : kind === 'penalty' ? e.review.incident === 'penalty' && e.review.decision === 'confirmed' : e.review.incident === 'goal' && e.review.decision === kind)
      && (kind !== 'disallowed' || e.side === 'me')
      && !feed.some(other => other.kind === 'var' && other !== e && other.minute >= e.minute - 2 && other.minute <= e.minute));
    if (event) return { pre, seed, paused: stop.state, event };
  }
  throw new Error(`No actual ${kind} review in the bounded engine fixture search`);
}
const titles = {
  goal: 'overturns an actual drawn goal before scorer credit and goal-shot commitment',
  penalty: 'links every reviewed penalty to one actual penalty resolution without extra shots',
  awarded: 'awards actual penalties from saved defensive foul incidents and resolves scored and missed kicks once',
  saved: 'retains the exact stored decisions on save load and deterministic settlement',
  past: 'keeps played reviews and scores while only the future is recut after a tactical change',
  reveal: 'holds the accepted goal and penalty shot until its own saved decision is shown',
  resume: 'shows already played reviewed goals and added-time events when a saved later period opens',
  rates: 'uses stated game rates with bilateral outcomes and reports the enabled baseline delta',
  baseline: 'preserves the full prior default match and old live or historical kickoff behavior',
  bands: 'holds every review outcome a match inside the range real football gives, on the generated rates',
  coverage: 'asks for reviews only where the competition uses them and plays the same match everywhere else',
  kinds: 'plays a kind of review only in a match kicked off with it and saves the list with the match',
  stream: 'deals every review from its own keyed generator and never from the match stream',
};
const controls = {
  counted: { file: engine, from: '  if (myReview) me.goals = myReview.goals;', to: '  if (false) me.goals = myReview!.goals;', test: 'goal' },
  decorative: { file: helper, from: '    if (!overturned) accepted.push(goal);', to: '    accepted.push(goal);', test: 'goal' },
  penalty: { file: helper, from: "    if (shot.kind !== 'shot' || !shot.penalty || shot.review) return [];", to: '    if (false) return [];', test: 'penalty' },
  awards: { file: helper, from: 'if (index < 0 || !taker) continue;', to: 'if (true) continue;', test: 'awarded' },
  resolution: { file: helper, from: 'const scored = rng() < CM_VAR_GAME_RATES.penaltyScores;', to: 'const scored = false;', test: 'awarded' },
  past: { file: engine, from: 'live.h1Play = keepUpTo(live.h1Play, minute);', to: 'live.h1Play = [];', test: 'past' },
  reveal: { file: helper, from: "  if (event.kind !== 'goal' && event.kind !== 'save' && event.kind !== 'shot') return false;", to: '  return false;', test: 'reveal' },
  resume: { file: helper, from: 'return new Set(feed.filter(event => {', to: 'return new Set([]); return new Set(feed.filter(event => {', test: 'resume' },
  announce: { file: helper, from: "  if (event.kind === 'var' && event.review) return settled.has(event.review.id);", to: '  return true;', test: 'reveal' },
  disabled: { file: engine, from: "...(varReviews && worldYear(state) >= 2026", to: "...(false && worldYear(state) >= 2026", test: 'rates' },
  everywhere: { file: helper, from: '  if (!from) return false;', to: '  if (!from) return true;', test: 'coverage' },
  /* Round 1218 fix: the historic era clause of the lit rule taken out of kickOff. A historic save's league is never a
     coverage key, so this is only seen where the coverage outcome stages that key in. */
  historic: { file: engine, from: 'worldYear(state) >= 2026 && !isHistoricEra(state.eraId ?? DEFAULT_ERA_ID)', to: 'worldYear(state) >= 2026', test: 'coverage' },
  /* Round 1218 fix: a review dealt from the match's own random stream, the goal review and the missed foul one. */
  streamgoal: { file: helper, from: '    if (rng() >= CM_VAR_GAME_RATES.goalReview) { accepted.push(goal); continue; }', to: '    if (Math.random() >= CM_VAR_GAME_RATES.goalReview) { accepted.push(goal); continue; }', test: 'stream' },
  streamfoul: { file: helper, from: '    if (rng() >= CM_VAR_GAME_RATES.missedFoulReview) continue;', to: '    if (Math.random() >= CM_VAR_GAME_RATES.missedFoulReview) continue;', test: 'stream' },
  /* Round 1218: each rate Round 1181 typed, put back into the generated module. Each must leave the range for its own reason. */
  oldgoalreview: { file: rates, from: /goalReview: [0-9.]+/, to: 'goalReview: 0.16', test: 'bands' },
  oldoverturn: { file: rates, from: /overturn: [0-9.]+/, to: 'overturn: 0.32', test: 'bands' },
  oldpenaltyreview: { file: rates, from: /penaltyReview: [0-9.]+/, to: 'penaltyReview: 0.45', test: 'bands' },
  oldmissedfoul: { file: rates, from: /missedFoulReview: [0-9.]+/, to: 'missedFoulReview: 0.015', test: 'bands' },
  oldpenaltyscores: { file: rates, from: /penaltyScores: [0-9.]+/, to: 'penaltyScores: 0.74', test: 'bands' },
  oldpenaltyontarget: { file: rates, from: /penaltyOnTarget: [0-9.]+/, to: 'penaltyOnTarget: 0.7', test: 'bands' },
  /* Round 1302: the generated rates no longer say the ledger holds the switch for the season total of penalties,
     while the engine is outside that band. */
  penaltyband: { file: rates, from: "'penalties-total'", to: "'penalties-total-let-go'", test: 'bands' },
  /* Round 1303 fix: the goals a review rules out are no longer drawn on top (the lift taken out of a match that
     reviews goals), so the goal kind alone takes its goals out of the match again. This replaces the controls
     goalslevel and playsgoal, which twisted the owed entry goals-level: that entry is closed and gone. */
  nolift: { file: helper, from: '  return 1 / (1 - CM_VAR_GAME_RATES.goalReview * CM_VAR_GAME_RATES.overturn);', to: '  return 1;', test: 'bands' },
  /* Round 1303 fix: a goal a review cannot look at (a penalty, a direct free kick) is no longer taken back, so the
     lift reaches those goals too and penalties a match creep up with the goal kind on. */
  liftpens: { file: helper, from: ":lift`)() >= CM_VAR_GAME_RATES.goalReview * CM_VAR_GAME_RATES.overturn) accepted.push(goal);", to: ':lift`)() >= 0) accepted.push(goal);', test: 'rates' },
  /* Round 1303 fix: the lift given to a match that does not review goals (kicked off with the penalty kind alone). */
  liftkind: { file: helper, from: "  if (!kinds.includes('goal')) return 1;", to: '  if (kinds.length === 0) return 1;', test: 'kinds' },
  /* Round 1303, the kinds: the engine reviewing goals in a match kicked off without the goal kind, giving penalties in
     one kicked off without the penalty kind, and kicking off without saving the list. */
  kindgoal: { file: engine, from: "  const myReview = reviewKinds.includes('goal') ? settleGoalReviews(me.goals, 'me', reviewKey) : null;", to: "  const myReview = live.varReviews ? settleGoalReviews(me.goals, 'me', reviewKey) : null;", test: 'kinds' },
  kindpenalty: { file: engine, from: "    const penaltyKind = reviewKinds.includes('penalty');", to: '    const penaltyKind = true;', test: 'kinds' },
  kindsaved: { file: engine, from: '...(varReviews === true ? {} : { varKinds }) }', to: '...(varReviews === true ? {} : {}) }', test: 'kinds' },
};
async function main() {
  const control = process.env.CM_VAR_CONTROL || '';
  assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known VAR control');
  const evidence = path.resolve(process.env.CM_VAR_ARTIFACTS || path.join(root, 'cm-var-artifacts/outcomes'));
  await mkdir(evidence, { recursive: true });
  if (control === 'all') {
    const summary = [];
    for (const name of ['', ...Object.keys(controls)]) {
      const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CM_VAR_CONTROL: name, CM_VAR_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 1500000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      const output = `${run.stdout || ''}\n${run.stderr || ''}`;
      await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
      summary.push({ name: name || 'normal', passed: run.status === 0 && !run.error && !run.signal, exit: run.status });
      console.log(`${summary.at(-1).passed ? 'PASS' : 'FAIL'} VAR ${name || 'normal'}`);
      process.stdout.write(summary.at(-1).passed ? output.split('\n').filter(line => line.startsWith('simCmVar')).join('\n') + '\n' : output.slice(-12000));
    }
    await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
    assert.ok(summary.every(row => row.passed), 'Normal proof and every effective control execute');
    console.log(`simCmVar: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`); return;
  }
  const sources = Object.fromEntries(await Promise.all([engine, helper, rates].map(async file => [file, (await readFile(path.join(root, file), 'utf8')).replaceAll('\r\n', '\n')])));
  const sourceBytes = Object.fromEntries(await Promise.all([engine, helper, rates].map(async file => [file, await readFile(path.join(root, file))])));
  const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
  const folder = await mkdtemp(path.join(parent, 'cm-var-'));
  const unhandled = [], capture = error => unhandled.push({ name: error?.name, message: String(error?.message ?? error) });
  process.on('unhandledRejection', capture); process.on('uncaughtExceptionMonitor', capture);
  try {
    const require = createRequire(import.meta.url);
    async function bundle(source, varSource, name, ratesSource = withFixtureRates(sources[rates]), siblings = {}) {
      const entry = path.join(folder, `${name}.ts`), leaf = path.join(folder, `${name}-var.ts`), ratesLeaf = path.join(folder, `${name}-rates.ts`), output = path.join(folder, `${name}.cjs`);
      await writeFile(ratesLeaf, ratesSource);
      await writeFile(entry, source + `\nexport { settleGoalReviews, penaltyReviews, cmVarEventWaiting, cmVarPlayWaiting, CM_VAR_GAME_RATES, awardReviewedPenalties, cmVarPlayedReviewIds, cmVarCanAnnounce, cmVarCovers, cmVarKindsAsked, cmVarKindsOf, cmVarGameAsk, cmVarGoalLift, CM_VAR_KINDS } from '@/lib/clubManagerVar';\nexport { CM_VAR_REAL, CM_VAR_HOLDS, CM_VAR_ACCEPTED } from '@/data/clubManagerVarRates';\n`);
      await writeFile(leaf, varSource);
      const siblingAlias = {};
      for (const [spec, text] of Object.entries(siblings)) {
        siblingAlias[spec] = path.join(folder, `${name}-${spec.split('/').pop()}.ts`);
        await writeFile(siblingAlias[spec], text);
      }
      await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias: { '@/lib/clubManager': entry, '@/lib/clubManagerVar': leaf, '@/data/clubManagerVarRates': ratesLeaf, ...siblingAlias, '@': path.join(root, 'src') } });
      return () => { delete require.cache[require.resolve(output)]; return require(output); };
    }
    const git = spawnSync('git', ['show', `${BASE}:${engine}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    assert.equal(git.status, 0, 'The prior accepted engine is available for a whole-save comparison');
    /* Release AZ: the engine imports the calendar and the calendar imports the engine back. Since Round 1250
       (PR224) today's calendar asks the engine for refreshWorldRoster and worldSeedOf, which the prior engine
       never had, so linking the prior engine with today's calendar stopped building. The prior engine takes the
       calendar of its own commit instead; between BASE and Release AX that file only gained the review opt in
       of simToWeek, which the engine's own import (lateSummerWindowWeeks) does not touch. */
    const gitCalendar = spawnSync('git', ['show', `${BASE}:src/lib/clubManagerCalendar.ts`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    assert.equal(gitCalendar.status, 0, 'The prior accepted calendar is available beside the prior engine');
    const oldFactory = await bundle(git.stdout, sources[helper], 'prior', undefined, { '@/lib/clubManagerCalendar': gitCalendar.stdout });
    const originalFactory = await bundle(sources[engine], sources[helper], 'original');
    const changed = { ...sources };
    if (control) {
      const spec = controls[control]; assert.equal(changed[spec.file].split(spec.from).length - 1, 1, 'One exact executable mutation anchor');
      changed[spec.file] = changed[spec.file].replace(spec.from, spec.to); assert.notEqual(changed[spec.file], sources[spec.file]);
      await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ ...spec, from: String(spec.from), originalHash: createHash('sha256').update(sources[spec.file]).digest('hex'), changedHash: createHash('sha256').update(changed[spec.file]).digest('hex') }, null, 2));
    }
    const candidateFactory = control ? await bundle(changed[engine], changed[helper], 'candidate') : originalFactory;
    const memory = new Map();
    globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
    const original = originalFactory(), cm = candidateFactory();
    const fixture = kind => findCmVarFixture(original, kind);
    const rows = [], metrics = {};
    const outcomes = {
      goal() {
        const f = fixture('disallowed');
        const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
        const event = actual.state.live.h1Play.find(e => e.review?.id === f.event.review.id);
        assert.ok(event?.review?.decision === 'disallowed', 'The real candidate produces the same saved overturned incident');
        const goals = actual.state.live.h1My;
        assert.ok(!goals.some(g => g.minute === event.minute && g.name === event.who), 'A ruled-out candidate is not committed as a scorer');
        assert.ok(!actual.state.live.h1Play.some(e => e.kind === 'shot' && e.goal && e.minute === event.minute && e.who === event.who), 'A ruled-out candidate is not a goal shot');
        const withoutReviews = clone(actual.state.live); withoutReviews.h1Play = withoutReviews.h1Play.filter(e => e.kind !== 'var');
        assert.deepEqual(cm.liveStatsAt(actual.state.live, 45), cm.liveStatsAt(withoutReviews, 45), 'Review incidents add no shots, on-target efforts, saves, fouls, corners or xG');
        const settled = withCmVarSeed(5301, () => cm.resumeMatch(actual.state));
        const ownGoals = settled.report.home === f.pre.clubName ? settled.report.homeGoals : settled.report.awayGoals;
        const credits = settled.state.squad.reduce((n, p) => n + p.seasonGoals, 0) - f.pre.squad.reduce((n, p) => n + p.seasonGoals, 0);
        assert.equal(credits, ownGoals, 'Only accepted goals receive player credit');
        assert.ok(settled.report.detail.timeline.some(e => e.review?.id === event.review.id));
        assert.equal(settled.report.myScorers.length, ownGoals);
      },
      penalty() {
        const f = fixture('penalty');
        const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
        const reviews = actual.state.live.h1Play.filter(e => e.kind === 'var' && e.review?.incident === 'penalty');
        assert.ok(reviews.length > 0, 'A real reviewed penalty is drawn');
        for (const review of reviews) {
          const shots = actual.state.live.h1Play.filter(e => e.kind === 'shot' && e.penalty && e.side === review.side && e.minute === review.minute && e.who === review.who);
          assert.equal(shots.length, 1, 'A reviewed penalty links to exactly one existing actual penalty shot');
          assert.equal(review.review.decision, 'confirmed');
          assert.equal(actual.state.live.h1Play.filter(e => e.kind === 'shot' && e.goal && e.side === review.side && e.minute === review.minute).length, shots[0].goal ? 1 : 0);
        }
      },
      awarded() {
        for (const kind of ['awarded_scored', 'awarded_missed']) {
          const f = fixture(kind);
          const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
          const live = actual.state.live, review = live.h1Play.find(e => e.kind === 'var' && e.review?.id === f.event.review.id);
          assert.ok(review?.review?.decision === 'awarded', 'The actual missed-foul review awards a penalty');
          const trigger = review.review.trigger;
          assert.ok(live.h1Play.some(e => e.kind === 'foul' && e.minute === review.minute && e.side === trigger.side && e.who === trigger.who), 'The penalty follows its original actual defending-side foul');
          const shots = live.h1Play.filter(e => e.kind === 'shot' && e.review?.id === review.review.id);
          assert.equal(shots.length, 1, 'Awarded penalty resolves exactly one actual kick');
          const shot = shots[0]; assert.equal(shot.penalty, true); assert.equal(shot.who, review.who); assert.equal(shot.minute, review.minute);
          assert.equal(shot.side, review.side); assert.equal(!!shot.goal, kind === 'awarded_scored', 'The saved actual kick can score or miss');
          const scorers = review.side === 'me' ? live.h1My : live.h1Opp;
          assert.equal(scorers.filter(g => g.name === shot.who && g.minute === shot.minute && g.penalty).length, shot.goal ? 1 : 0, 'Only a scored penalty creates a scorer');
          if (shot.side === 'me') assert.ok(cm.myOnPitchAt(live, shot.minute).some(id => actual.state.squad.find(p => p.id === id)?.name === shot.who), 'Assigned taker is on the actual pitch');
          const result = withCmVarSeed(5310, () => cm.resumeMatch(actual.state));
          assert.equal(result.report.detail.play.filter(e => e.kind === 'shot' && e.goal).length, result.report.homeGoals + result.report.awayGoals);
          const credits = result.state.squad.reduce((n, p) => n + p.seasonGoals, 0) - f.pre.squad.reduce((n, p) => n + p.seasonGoals, 0);
          assert.equal(credits, result.report.myScorers.length, 'Awarded penalty player credit matches the accepted score once');
          const takerGoal = result.report.myScorers.find(g => g.name === shot.who && g.minute === shot.minute && g.penalty);
          if (takerGoal) assert.equal(takerGoal.assist, undefined, 'Penalty goals never receive invented assists');
        }
      },
      saved() {
        const f = fixture('disallowed'), before = clone(f.paused);
        assert.equal(cm.saveCareer(f.paused), true);
        const bytes = memory.get(cm.SAVE_KEY), loaded = cm.loadCareer(); assert.ok(loaded?.live);
        assert.deepEqual(loaded.live, before.live, 'Loading preserves all stored review decisions and every decided event');
        assert.equal(memory.get(cm.SAVE_KEY), bytes, 'Loading alone does not rewrite the save');
        const a = withCmVarSeed(5302, () => candidateFactory().resumeMatch(loaded));
        const b = withCmVarSeed(5302, () => candidateFactory().resumeMatch(before));
        assert.deepEqual(a, b, 'Reload and uninterrupted settlement are identical'); assert.deepEqual(f.paused, before);
        assert.equal(a.state.resultLog.length, before.resultLog.length + 1);
        assert.equal(a.state.week, before.week + 1);
      },
      past() {
        const f = fixture('disallowed'), minute = f.event.minute;
        const expected = f.paused.live.h1Play.filter(e => cm.playedBy(minute)(e));
        const changed = withCmVarSeed(5303, () => cm.changeLive(f.paused, minute, { kind: 'shape', mentality: 'attacking' })); assert.ok(changed);
        assert.deepEqual(changed.live.h1Play.filter(e => cm.playedBy(minute)(e)), expected, 'Played review decisions and all played football survive the recut');
        assert.deepEqual(changed.live.h1My.filter(e => cm.playedBy(minute)(e)), f.paused.live.h1My.filter(e => cm.playedBy(minute)(e)));
        const boardState = clone(f.paused); boardState.live.added.h1 = 3;
        const boardReview = clone(boardState.live.h1Play.find(e => e.review?.id === f.event.review.id)); boardReview.minute = 45; boardReview.plus = 1;
        boardState.live.h1Play.push(boardReview);
        const afterBoard = withCmVarSeed(5304, () => cm.changeLive(boardState, 45, { kind: 'shape', mentality: 'defensive' }, 1)); assert.ok(afterBoard);
        assert.ok(afterBoard.live.h1Play.some(e => e.review?.id === boardReview.review.id && e.minute === 45 && e.plus === 1), 'A played added-time review survives a board recut');
      },
      reveal() {
        for (const kind of ['confirmed', 'penalty', 'awarded_scored', 'awarded_missed']) {
          const f = fixture(kind), feed = cm.liveFeed(f.paused.live);
          const e = feed.find(line => (line.kind === 'goal' || line.kind === 'save' || line.kind === 'shot') && line.side === f.event.side && line.minute === f.event.minute && line.text === f.event.text);
          assert.ok(e, 'The reviewed accepted resolution exists');
          assert.equal(cm.cmVarEventWaiting(e, feed, new Set()), true, 'An unresolved review withholds its own accepted resolution');
          const shot = f.paused.live.h1Play.find(line => line.kind === 'shot' && line.side === e.side && line.minute === e.minute && line.who === e.text);
          assert.ok(shot); assert.equal(cm.cmVarPlayWaiting(shot, feed, new Set()), true, 'The accepted shot stats also wait for review');
          assert.equal(cm.cmVarEventWaiting(e, feed, new Set([f.event.review.id])), false);
          const boundary = feed.filter(line => line.minute === f.event.minute).map(line => ({ ...line, minute: 46 }));
          const accepted = { ...e, minute: 46 };
          const review = { ...f.event, minute: 46 };
          assert.equal(cm.cmVarCanAnnounce(accepted, boundary, new Set()), false, 'A 46th-minute accepted resolution cannot announce during its review');
          assert.equal(cm.cmVarCanAnnounce(review, boundary, new Set()), false, 'The 46th-minute stored outcome cannot announce during checking');
          assert.equal(cm.cmVarCanAnnounce(review, boundary, new Set([review.review.id])), true);
          assert.equal(cm.cmVarEventWaiting({ ...e, text: 'Different simulated player' }, feed, new Set()), false);
        }
      },
      resume() {
        const f = fixture('confirmed'), feed = cm.liveFeed(f.paused.live);
        const settled = cm.cmVarPlayedReviewIds(feed, f.event.minute + 1, 'first');
        assert.ok(settled.has(f.event.review.id), 'A previously played reviewed goal is settled on resume');
        const goal = feed.find(e => e.kind === 'goal' && e.side === f.event.side && e.minute === f.event.minute && e.text === f.event.text);
        assert.equal(cm.cmVarEventWaiting(goal, feed, settled), false, 'An already played reviewed goal remains visible');
        assert.equal(cm.cmVarPlayedReviewIds(feed, f.event.minute, 'first').has(f.event.review.id), false, 'An exact opening-minute review can replay its saved decision without exposing a fresh restart outcome');
        const board = { ...f.event, minute: 45, plus: 5 };
        assert.ok(cm.cmVarPlayedReviewIds([board], 46, 'second').has(board.review.id), 'The first-half board stays played when the second half opens');
        assert.equal(cm.cmVarPlayedReviewIds([board], 45, 'first').has(board.review.id), false);
      },
      rates() {
        const pre = fresh(original); let reviews = 0, overturned = 0, penalty = 0, awarded = 0, awardedGoals = 0, enabledGoals = 0, disabledGoals = 0; const sides = new Set();
        for (let seed = 6100; seed < 6356; seed++) {
          const enabled = withCmVarSeed(seed, () => candidateFactory().playNextEntry(pre, { skipHalftime: true, varReviews: true, noCoach: true }));
          const disabled = withCmVarSeed(seed, () => originalFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          const incidents = enabled.report.detail.play.filter(e => e.kind === 'var');
          reviews += incidents.length;
          for (const e of incidents) { sides.add(e.side); overturned += e.review.decision === 'disallowed'; penalty += e.review.incident === 'penalty'; awarded += e.review.decision === 'awarded'; }
          awardedGoals += enabled.report.detail.play.filter(e => e.kind === 'shot' && e.goal && e.review?.decision === 'awarded').length;
          enabledGoals += enabled.report.homeGoals + enabled.report.awayGoals;
          disabledGoals += disabled.report.homeGoals + disabled.report.awayGoals;
          assert.equal(enabled.report.detail.play.filter(e => e.kind === 'shot' && e.goal).length, enabled.report.homeGoals + enabled.report.awayGoals);
        }
        assert.ok(reviews > 0 && overturned > 0 && penalty > 0 && awarded > 0 && awardedGoals > 0 && awardedGoals < awarded, 'Enabled actual matches draw reviewed goals, overturned goals and reviewed penalties');
        assert.deepEqual([...sides].sort(), ['me', 'opp']);
        let candidates = 0, sampledReviews = 0, sampledOverturns = 0;
        for (let seed = 0; seed < 8192; seed++) {
          const draw = cm.settleGoalReviews([{ name: 'Simulated candidate', minute: 25 }], 'me', `rate:${seed}`);
          candidates++; sampledReviews += draw.reviews.length; sampledOverturns += draw.reviews.filter(e => e.review.decision === 'disallowed').length;
        }
        // Wide bounds around explicit game constants, not a claim about real VAR frequencies.
        assert.ok(sampledReviews / candidates > 0.10 && sampledReviews / candidates < 0.23);
        assert.ok(sampledOverturns / candidates > 0.025 && sampledOverturns / candidates < 0.09);
        /* Round 1303 fix: a match that reviews goals draws every goal a little more often (cmVarGoalLift), and a
           goal a review cannot look at is taken back as often as a review rules a goal out, with no review shown,
           so only reviewable goals end up lifted. Sampled on the same keys as above, on the fixture rates (0.16 x
           0.32 = 0.0512 a goal; the bounds are the overturn bounds just above). Control liftpens. */
        let spot = 0, spotKept = 0, spotReviews = 0, free = 0, freeKept = 0;
        for (let seed = 0; seed < 8192; seed++) {
          const pen = cm.settleGoalReviews([{ name: 'Simulated taker', minute: 25, penalty: true }], 'me', `rate:${seed}`);
          const fk = cm.settleGoalReviews([{ name: 'Simulated taker', minute: 25, freeKick: true }], 'opp', `rate:${seed}`);
          spot++; spotKept += pen.goals.length; spotReviews += pen.reviews.length + fk.reviews.length; free++; freeKept += fk.goals.length;
        }
        assert.equal(spotReviews, 0, 'A penalty or a direct free kick is never reviewed as a goal');
        assert.ok(1 - spotKept / spot > 0.025 && 1 - spotKept / spot < 0.09, `A penalty goal is taken back as often as a review rules a goal out (${(1 - spotKept / spot).toFixed(4)} of ${spot})`);
        assert.ok(1 - freeKept / free > 0.025 && 1 - freeKept / free < 0.09, `A direct free kick goal is taken back as often as a review rules a goal out (${(1 - freeKept / free).toFixed(4)} of ${free})`);
        const lift = cm.cmVarGoalLift(['goal']), back = cm.CM_VAR_GAME_RATES.goalReview * cm.CM_VAR_GAME_RATES.overturn;
        assert.ok(Math.abs(lift * (1 - back) - 1) < 1e-12 && lift > 1, 'Goals are drawn more often by exactly what is taken back');
        assert.deepEqual([cm.cmVarGoalLift([]), cm.cmVarGoalLift(['penalty'])], [1, 1], 'A match that does not review goals draws them as it always did');
        Object.assign(metrics, { matches: 256, reviews, overturned, penalty, awarded, awardedGoals, enabledGoals, disabledGoals, sampledReviews, sampledOverturns, candidates, gameRates: cm.CM_VAR_GAME_RATES });
      },
      async baseline() {
        const pre = fresh(original);
        /* Round 1229: the league book (leagueBook) is a save field newer than the PRIOR engine this test reads
           from git. That engine carries the book it is handed untouched, while the engine of today writes the
           round's rows into it. So the two comparisons against the prior engine below, and no other comparison
           in this file, leave that one field out on both sides. scripts/simCmLeagueBook.mjs holds the book
           itself, and that the match stream does not move with it. */
        const sansBook = played => { const state = { ...played.state }; delete state.leagueBook; return { ...played, state }; };
        for (const seed of [7110, 7111, 7112]) {
          const current = withCmVarSeed(seed, () => candidateFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          const prior = withCmVarSeed(seed, () => oldFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          assert.deepEqual(sansBook(current), sansBook(prior), 'Default callers retain every prior report, stat, player credit and save byte');
        }
        const before2026 = { ...clone(pre), startYear: 2025 };
        const plainBefore2026 = withCmVarSeed(7113, () => originalFactory().playNextEntry(before2026));
        const enabledBefore2026 = withCmVarSeed(7113, () => candidateFactory().playNextEntry(before2026, { varReviews: true }));
        assert.deepEqual(enabledBefore2026, plainBefore2026, 'Pre-2026 clocks ignore review opt-in');
        const historicalPlain = originalFactory(), historicalCandidate = candidateFactory(), historicalPrior = oldFactory();
        await Promise.all([historicalPlain, historicalCandidate, historicalPrior].map(engine => engine.ensureEraRosters('era2010')));
        const historical = withCmVarSeed(4107, () => historicalPlain.startCareer('Everton', 'era2010'));
        // Override only this simulation's clock so the historic-era guard is tested independently of the year guard.
        historical.startYear = 2026;
        const plainHistoric = withCmVarSeed(7113, () => historicalPlain.playNextEntry(historical));
        const enabledHistoric = withCmVarSeed(7113, () => historicalCandidate.playNextEntry(historical, { varReviews: true }));
        const priorHistoric = withCmVarSeed(7113, () => historicalPrior.playNextEntry(historical));
        assert.deepEqual(enabledHistoric, plainHistoric, 'Actual loaded historic squads ignore review opt-in even on a 2026 simulation clock');
        assert.deepEqual(sansBook(plainHistoric), sansBook(priorHistoric), 'Loaded historic squads retain the entire prior default match');
        const oldLive = withCmVarSeed(7114, () => originalFactory().playNextEntry(pre));
        const before = clone(oldLive.state.live);
        const plain = withCmVarSeed(7115, () => candidateFactory().playNextEntry(oldLive.state, { skipHalftime: true }));
        const enabled = withCmVarSeed(7115, () => candidateFactory().playNextEntry(oldLive.state, { skipHalftime: true, varReviews: true }));
        assert.deepEqual(enabled, plain); assert.deepEqual(oldLive.state.live, before);
        assert.ok(!enabled.report.detail.play.some(e => e.kind === 'var'), 'A loaded legacy live match is never opted in retrospectively');
      },
      /* Round 1218: only where VAR is used. On fixture rates, so a review that slipped into a competition without
         them would show at once. A match whose competition has no row that says yes (which ones is read off the
         ledger below: after the closing fix of 2026-10-10 that is the Championship and every domestic cup of the
         clubs walked here, while the Eredivisie, Ligue 1 and the Scottish Premiership say yes) is the same match, and leaves
         the random stream in the same place, whether reviews are asked for or not, and its saved live match
         carries no opt in. A league match in a league that says yes carries it. */
      async coverage() {
        /* A fresh engine for each side of a comparison: the engine numbers its inbox messages from a counter of its
           own, so two matches played one after the other on one engine differ in those ids and in nothing else. */
        const both = (state, seed, opts) => withCmVarSeed(seed, () => { const result = candidateFactory().playNextEntry(state, opts); return { result, next: Math.random() }; });
        /* What a kickoff SHOULD carry is read here off the ledger itself (scripts/data/cmVarCompetitions.json), not
           off the generated module the engine reads and not off a list typed in this harness: a row that turns to
           yes with its second source moves this expectation with it, and nothing here needs a hand. */
        const ledger = JSON.parse((await readFile(path.join(root, 'scripts/data/cmVarCompetitions.json'), 'utf8')));
        const yesRow = key => ledger.rows.find(r => r.key === key && r.verdict === 'yes') ?? null;
        const fromStage = (row, order, stage) => !!row && order.indexOf(stage) >= 0 && order.indexOf(stage) >= order.indexOf(row.from);
        const wanted = live => {
          const entry = live.entry, home = cm.careerLeagueOf(live.state);
          if (entry.type === 'league') return { lit: !!yesRow(`league:${home.id}`), kind: 'league' };
          if (entry.type === 'cup') return { lit: fromStage(yesRow(`cup:${home.cupName}`), ['R16', 'QF', 'SF', 'F'], entry.cupRound), kind: 'cup' };
          return { lit: fromStage(yesRow('ucl'), ['group', 'R16', 'QF', 'SF', 'F'], entry.type === 'uclGroup' ? 'group' : entry.uclRound), kind: 'europe' };
        };
        /* The kickoff a save would take next, with reviews asked for: what it carries and what it should. */
        const kickoffOf = (state, seed) => {
          const stop = withCmVarSeed(seed, () => cm.playNextEntry(state, { noCoach: true, varReviews: true }));
          if (stop.kind !== 'halftime') return null;
          const want = wanted({ state: stop.state, entry: stop.state.calendar[stop.state.live.week] });
          return { ...want, carries: stop.state.live.varReviews === true, comp: stop.state.live.compLabel };
        };
        const met = { league: { lit: 0, dark: 0 }, cup: { lit: 0, dark: 0 }, europe: { lit: 0, dark: 0 } };
        const walk = (club, start, firstSeed, limit, enough) => {
          let state = withCmVarSeed(start, () => cm.startCareer(club)), matches = 0;
          const mine = { league: { lit: 0, dark: 0 }, cup: { lit: 0, dark: 0 }, europe: { lit: 0, dark: 0 } };
          for (let i = 0; i < limit && !enough(mine, matches); i++) {
            const seed = firstSeed + i;
            const at = kickoffOf(state, seed);
            if (at) {
              assert.equal(at.carries, at.lit, at.lit ? `${club}, ${at.comp}: a match in a competition whose row says yes carries the opt in` : `${club}, ${at.comp}: a match in a competition without reviews carries no opt in`);
              mine[at.kind][at.lit ? 'lit' : 'dark'] += 1; met[at.kind][at.lit ? 'lit' : 'dark'] += 1;
            }
            const plain = both(state, seed, { skipHalftime: true, noCoach: true });
            if (at && !at.lit) {
              const asked = both(state, seed, { skipHalftime: true, noCoach: true, varReviews: true });
              assert.deepEqual(asked, plain, `${club}, ${at.comp}: where the competition has no reviews, asking for them plays the same match and leaves the stream where it was`);
              if (asked.result.kind === 'match') assert.ok(!asked.result.report.detail.play.some(e => e.kind === 'var'));
            }
            if (plain.result.kind === 'seasonOver' || plain.result.state?.sacked) break;
            if (plain.result.kind === 'match') matches += 1;
            state = plain.result.state;
          }
          return { mine, matches };
        };
        /* Four clubs of four leagues, each walked through twelve matches: league nights, and Europe for those in it. */
        for (const [c, club] of ['Wolves', 'Ajax', 'Lyon', 'Celtic'].entries()) {
          const { mine, matches } = walk(club, 4200 + c, 8100 + c * 101, 60, (_, n) => n >= 12);
          /* Five, not more: a club in Europe and its cup (Celtic) meets seven league nights in its first twelve matches. */
          assert.ok(matches >= 10 && mine.league.lit + mine.league.dark >= 5, `${club} played ${matches} matches, ${mine.league.lit + mine.league.dark} of them league kickoffs`);
          /* A league is one row: every league kickoff of a club is lit or none is. */
          assert.ok(mine.league.lit === 0 || mine.league.dark === 0, `${club}: its league kickoffs were lit ${mine.league.lit} times and dark ${mine.league.dark}`);
        }
        /* And a club of a league whose row says yes, until it has met its league, its cup and Europe. */
        const arsenal = walk('Arsenal', 4107, 8600, 120, m => m.league.lit + m.league.dark >= 3 && m.cup.lit + m.cup.dark >= 1 && m.europe.lit + m.europe.dark >= 1).mine;
        assert.ok(arsenal.league.lit + arsenal.league.dark >= 3 && arsenal.cup.lit + arsenal.cup.dark >= 1 && arsenal.europe.lit + arsenal.europe.dark >= 1, `Arsenal met ${JSON.stringify(arsenal)}`);
        assert.ok(met.league.lit >= 3, `The walks met ${met.league.lit} league kickoffs in a league whose row says yes`);
        /* While the ledger leaves any league or cup of these five clubs without reviews, the walks must have met one:
           the same match proof above is then not empty. */
        const leavesOut = ['league:championship', 'league:eredivisie', 'league:ligue1', 'league:scottish', 'cup:FA Cup'].filter(key => !yesRow(key));
        assert.ok(leavesOut.length === 0 || met.league.dark + met.cup.dark >= 8, `The ledger leaves ${leavesOut.join(', ')} without reviews and the walks met ${met.league.dark + met.cup.dark} such kickoffs`);
        /* Round 1218 fix (review finding 2): the historic era clause of the lit rule. A historic save's league is
           premier2010, never a coverage key, so its league matches are dark with or without the clause, and the
           baseline outcome above cannot see the clause go. What the clause is for is a past world that has run on
           to 2026 and plays in a competition whose key IS covered (the Champions League). Held here on a bundle whose
           coverage is staged to name the historic league itself: covered, on a 2026 clock, reviews asked for, and
           the match must still be the one without them. */
        const eraEngine = candidateFactory(); await eraEngine.ensureEraRosters('era2010');
        const old = withCmVarSeed(4107, () => eraEngine.startCareer('Everton', 'era2010'));
        old.startYear = 2026;
        const oldKey = `league:${eraEngine.careerLeagueOf(old).id}`;
        assert.equal(old.calendar[old.week].type, 'league', 'The historic save opens on a league match');
        assert.equal(eraEngine.cmVarCovers(oldKey), false, `${oldKey} is not a key of the real coverage`);
        const historicSource = withFixtureRates(sources[rates]).replace("Readonly<Record<string, string>> = { ", `Readonly<Record<string, string>> = { '${oldKey}': 'all', `);
        assert.ok(historicSource.includes(`'${oldKey}': 'all'`), 'The staged historic coverage reached the module');
        const historicFactory = await bundle(changed[engine], changed[helper], 'historic', historicSource);
        const eraAsked = historicFactory(), eraPlain = historicFactory();
        await Promise.all([eraAsked, eraPlain].map(e => e.ensureEraRosters('era2010')));
        assert.equal(eraAsked.cmVarCovers(oldKey), true, 'On the staged bundle the historic league is covered, so only the era clause keeps reviews out');
        assert.ok(eraAsked.worldYear(old) >= 2026, 'and its clock stands in 2026');
        const eraOn = withCmVarSeed(7113, () => eraAsked.playNextEntry(old, { varReviews: true }));
        const eraOff = withCmVarSeed(7113, () => eraPlain.playNextEntry(old));
        assert.equal(eraOn.kind, 'halftime');
        assert.equal(eraOn.state.live.varReviews, undefined, 'A historic era save carries no opt in, on a 2026 clock in a covered competition');
        assert.deepEqual(eraOn, eraOff, 'A historic era save plays the same match whether reviews are asked for or not');
        const stagedSource = withFixtureRates(sources[rates]).replace("Readonly<Record<string, string>> = { ", "Readonly<Record<string, string>> = { 'cup:FA Cup': 'QF', ");
        assert.ok(stagedSource.includes("'cup:FA Cup': 'QF'"), 'The staged coverage reached the module');
        const staged = (await bundle(changed[engine], changed[helper], 'staged', stagedSource))();
        assert.deepEqual(['R16', 'QF', 'SF', 'F'].map(s => staged.cmVarCovers('cup:FA Cup', s)), [false, true, true, true], 'A cup is covered from its first stage with reviews on');
        assert.deepEqual(['group', 'R16', 'QF', 'SF', 'F'].map(s => staged.cmVarCovers('ucl', s)), [true, true, true, true, true]);
        assert.deepEqual([staged.cmVarCovers('league:premier'), staged.cmVarCovers('league:championship'), staged.cmVarCovers('cup:FA Cup'), staged.cmVarCovers('toString'), staged.cmVarCovers('league:atlantis')], [true, false, false, false, false]);
        metrics.coverage = { met, leavesOut, historicKey: oldKey };
      },
      /* Round 1303, the lead's decision 2: the KIND of review is data, and the engine plays a kind only in a match
         kicked off with it. On the fixture rates, where both kinds are frequent, over 60 first halves of the fresh
         Everton career and their second halves:
           a list is saved with the match in the engine's own order, `true` (a staged match) saves none and plays
           every kind, an empty list asks for nothing at all (the same save as a caller that does not ask);
           the goal kind alone shows no penalty review and rules out exactly the goals every kind rules out;
           the penalty kind alone shows no goal review;
           a match closed at half time (a JSON round trip) plays its second half on the list it was kicked off with;
           and the game's own ask (cmVarGameAsk) is the generated list, and nothing while the switch is off or the
           list is empty. Never `true`: that is how a harness stages every kind. */
      kinds() {
        const pre = fresh(cm);
        const idsOf = (play, incident) => play.filter(e => e.kind === 'var' && e.review?.incident === incident).map(e => e.review.id).sort();
        const t = { halves: 0, goalReviews: 0, penaltyReviews: 0, secondHalfGoal: 0, secondHalfPenalty: 0 };
        for (let seed = 1700; seed < 1760; seed++) {
          const kick = ask => withCmVarSeed(seed, () => cm.playNextEntry(clone(pre), ask === undefined ? {} : { varReviews: ask }));
          const all = kick(true), goal = kick(['goal']), pen = kick(['penalty']), both = kick(['penalty', 'goal']), none = kick([]), plain = kick(undefined);
          assert.equal(all.kind, 'halftime'); assert.equal(goal.kind, 'halftime'); assert.equal(pen.kind, 'halftime');
          t.halves += 1;
          assert.equal(all.state.live.varReviews, true);
          assert.equal('varKinds' in all.state.live, false, 'A staged match (asked with true) saves no list');
          assert.deepEqual(goal.state.live.varKinds, ['goal'], 'A match kicked off with the goal kind saves that list');
          assert.deepEqual(pen.state.live.varKinds, ['penalty'], 'A match kicked off with the penalty kind saves that list');
          assert.deepEqual(both.state.live.varKinds, ['goal', 'penalty'], 'The list is saved in the engine order whatever order it was asked in');
          assert.equal('varReviews' in plain.state.live, false);
          assert.deepEqual(none.state, plain.state, 'An empty list asks for nothing: the same save as a caller that does not ask');
          const A = all.state.live.h1Play, G = goal.state.live.h1Play, P = pen.state.live.h1Play;
          t.goalReviews += idsOf(A, 'goal').length; t.penaltyReviews += idsOf(A, 'penalty').length;
          assert.deepEqual(both.state.live.h1Play, A, 'Asking for both kinds by name is the match a staged ask plays');
          assert.deepEqual(idsOf(G, 'penalty'), [], 'The goal kind alone shows no penalty review');
          assert.deepEqual(idsOf(G, 'goal'), idsOf(A, 'goal'), 'The goal kind alone reviews exactly the goals every kind reviews');
          assert.deepEqual(idsOf(P, 'goal'), [], 'The penalty kind alone shows no goal review');
          assert.equal(G.some(e => e.kind === 'shot' && e.review?.decision === 'awarded'), false, 'The goal kind alone plays no kick a review gave');
          /* Round 1303 fix: the lift belongs to the goal kind (cmVarGoalLift). A match kicked off with the penalty
             kind alone draws the goals of the match nobody asks a review in, and adds only the penalties a review
             gave that went in. Control liftkind. */
          const givenAndScored = g => !!g.penalty && P.some(e => e.kind === 'shot' && e.goal && e.review?.decision === 'awarded' && e.minute === g.minute && e.who === g.name);
          const drawnGoals = live => [live.h1My, live.h1Opp].map(list => (list ?? []).filter(g => !givenAndScored(g)).map(g => `${g.minute}:${g.name}`));
          assert.deepEqual(drawnGoals(pen.state.live), drawnGoals(plain.state.live), 'A match kicked off with the penalty kind alone draws the goals of the match nobody asks a review in');
          /* A save closed at half time and opened again: the second half plays the saved list. */
          const finish = stop => withCmVarSeed(seed + 7000, () => cm.resumeMatch(clone(stop.state)));
          const second = play => play.filter(e => e.minute > 45);
          const gDone = finish(goal), pDone = finish(pen), aDone = finish(all);
          assert.deepEqual(idsOf(second(gDone.report.detail.play), 'penalty'), [], 'The second half of a match kicked off with the goal kind shows no penalty review');
          assert.deepEqual(idsOf(second(pDone.report.detail.play), 'goal'), [], 'The second half of a match kicked off with the penalty kind shows no goal review');
          t.secondHalfGoal += idsOf(second(aDone.report.detail.play), 'goal').length; t.secondHalfPenalty += idsOf(second(aDone.report.detail.play), 'penalty').length;
        }
        assert.ok(t.goalReviews >= 5 && t.penaltyReviews >= 5 && t.secondHalfGoal >= 5 && t.secondHalfPenalty >= 5, 'The sample holds both kinds of review in both halves, so the cases above are not empty: ' + JSON.stringify(t));
        /* The game's own ask. */
        assert.deepEqual(cm.cmVarGameAsk(false, ['goal']), {}, 'The game asks for nothing while the switch is off');
        assert.deepEqual(cm.cmVarGameAsk(true, []), {}, 'The game asks for nothing while no kind is played');
        assert.deepEqual(cm.cmVarGameAsk(true, ['goal']), { varReviews: ['goal'] }, 'The game asks for the kinds it is handed');
        assert.deepEqual(cm.cmVarGameAsk(true), cm.CM_VAR_KINDS.length ? { varReviews: cm.CM_VAR_KINDS } : {}, 'Left to itself the game asks for the generated list');
        assert.deepEqual([cm.cmVarKindsAsked(true), cm.cmVarKindsAsked(false), cm.cmVarKindsAsked(undefined), cm.cmVarKindsAsked(['penalty', 'goal', 'offside'])], [['goal', 'penalty'], [], [], ['goal', 'penalty']]);
        assert.deepEqual([cm.cmVarKindsOf({}), cm.cmVarKindsOf({ varReviews: true }), cm.cmVarKindsOf({ varReviews: true, varKinds: ['goal'] }), cm.cmVarKindsOf({ varKinds: ['goal'] })], [[], ['goal', 'penalty'], ['goal'], []]);
        metrics.kinds = { ...t, gamePlays: cm.CM_VAR_KINDS };
      },
      /* Round 1218. The generated rates themselves, on a fleet of league matches in the leagues whose row says
         yes (scripts/lib/cmVarFleet.mjs: 20 clubs, one season a seed). Each outcome a match must sit inside the
         range real football gives it in scripts/data/cmVarRates.json, wider by BANDS.headroom on each side.
         The engine aims at the LOW end of each range (the stricter reading), so the low edge is the one that
         works; the headroom is what the fleet's own sampling was measured to need, see BANDS. */
      async bands() {
        const d = derive();
        assert.equal(d.engine.provisional, false, 'The engine figures the rates are derived from are measured, not provisional');
        const real = (await bundle(changed[engine], changed[helper], 'bands', changed[rates]))();
        const shipped = real.CM_VAR_GAME_RATES;
        assert.equal(shipped.penaltyScores, real.SHOOTOUT_BASE_RATE, 'A penalty a review awards is taken under the engine penalty law, not under a rate of its own');
        assert.equal(shipped.penaltyOnTarget, d.law.onTarget, 'A missed review penalty is on target as often as the engine penalty law says');
        const seeds = (process.env.CM_VAR_BANDS_SEEDS || BANDS.seeds).split(',').map(Number);
        assert.ok(seeds.length >= 5, 'The fleet plays at least five seeds');
        const fleet = playFleet(real, { seeds, paired: true });
        const L = fleet.byKind.league, per = n => n / L.matches;
        const ruled = per(L.ruledOut), awarded = per(L.penaltyAwarded), gap = (L.goals - L.goalsOff) / L.matches;
        const r4 = x => Number(x.toFixed(4));
        metrics.bands = { seeds, leagueMatches: L.matches, ruledOut: L.ruledOut, ruledOutPerMatch: r4(ruled), awarded: L.penaltyAwarded, awardedPerMatch: r4(awarded), awardedScored: L.awardedScored,
          goalConfirmed: L.goalConfirmed, penaltyConfirmed: L.penaltyConfirmed, goalsPerMatchOn: r4(per(L.goals)), goalsPerMatchOff: r4(per(L.goalsOff)), goalGap: r4(gap), resultMoved: L.resultMoved,
          penaltiesPerMatch: r4(per(L.penalties)), matchesWithReview: L.matchesWithReview,
          perSeed: fleet.perSeed.map(s => [s.matches, r4(s.ruledOut / s.matches), r4(s.penaltyAwarded / s.matches)]) };
        assert.ok(L.matches >= 3000, `The fleet played ${L.matches} league matches, fewer than 3,000`);
        const inside = (x, range) => x >= range.low * (1 - BANDS.headroom) && x <= range.high * (1 + BANDS.headroom);
        assert.ok(inside(ruled, d.goals), `Goals ruled out a match ${r4(ruled)} is outside real football's ${r4(d.goals.low)} to ${r4(d.goals.high)} (headroom ${BANDS.headroom})`);
        assert.ok(inside(awarded, d.pens), `Penalties awarded a match ${r4(awarded)} is outside real football's ${r4(d.pens.low)} to ${r4(d.pens.high)} (headroom ${BANDS.headroom})`);
        assert.equal(L.goalConfirmed + L.penaltyConfirmed, 0, `The game showed ${L.goalConfirmed} goal and ${L.penaltyConfirmed} penalty reviews that ended with the call standing, and no publisher counts those by kind of call`);
        const share = L.penaltyAwarded ? L.awardedScored / L.penaltyAwarded : 0;
        metrics.bands.awardedScoredShare = r4(share);
        assert.ok(Math.abs(share - d.law.scores) <= BANDS.scoredShare, `Review penalties went in ${r4(share)} of the time, more than ${BANDS.scoredShare} from the engine penalty law's ${d.law.scores}`);
        /* Round 1302, the lead's decision 4. ALL penalties a match with reviews on, against all the penalties of a
           real season (the ledger's penaltiesTotal, the generated CM_VAR_REAL.penaltiesTotal). A penalty a review
           gives is one of a real season's penalties; here it comes on top of the engine's own. Outside the band,
           penalties by review must stay off, and what keeps them off is the ledger's open entry penalties-total
           (the generated CM_VAR_HOLDS, which holds the switch in scripts/simCmVarLedger.mjs). So: outside the band
           and not held is red, and so is held while inside (the entry would be stale). Never a wider band. */
        const total = per(L.penalties), totalOff = per(L.penaltiesOff), band = real.CM_VAR_REAL.penaltiesTotal, holds = real.CM_VAR_HOLDS;
        assert.ok(band && band.low > 0 && band.high >= band.low && Array.isArray(holds), 'The generated rates carry the season total of penalties and what the ledger still owes');
        const insideTotal = inside(total, band), held = holds.includes('penalties-total');
        metrics.bands.penaltiesPerMatchOff = r4(totalOff);
        metrics.bands.penaltiesTotalBand = { low: r4(band.low * (1 - BANDS.headroom)), high: r4(band.high * (1 + BANDS.headroom)), inside: insideTotal, held };
        assert.ok(insideTotal || held, `Penalties a match with reviews on ${r4(total)} (without: ${r4(totalOff)}) is outside real football's ${r4(band.low)} to ${r4(band.high)} (headroom ${BANDS.headroom}) and the ledger does not hold the switch for it (owed penalties-total)`);
        assert.ok(!(insideTotal && held), `Penalties a match with reviews on ${r4(total)} is inside real football's ${r4(band.low)} to ${r4(band.high)} (headroom ${BANDS.headroom}): the ledger's owed entry penalties-total is stale, take it out`);
        /* Round 1303 fix. GOALS A MATCH WITH EVERY KIND STAGED. Until this fix the staged pair sat inside the 0.05
           by two errors that cancelled: the goals a review ruled out were taken from the match (about 0.075 down)
           and the penalties a review gave put about 0.05 back. The goals a review rules out are now drawn on top,
           so the goal kind alone is level (asserted below with nothing to excuse it), and what is left with every
           kind staged is the penalty kind's own doing: about 0.05 a match UP, at the band's edge. The game does not
           play that kind; the same owed entry that holds it for penalties a match holds it for this. So: outside
           the band and the penalty kind not held is red. Never a wider band. */
        const insidePairGap = Math.abs(gap) <= BANDS.goalGap;
        metrics.bands.everyKindLevel = { band: BANDS.goalGap, inside: insidePairGap, penaltyKindHeld: held };
        assert.ok(insidePairGap || held, `With every kind staged reviews moved goals a match by ${r4(gap)}, past the ${BANDS.goalGap} the family allows a rule to move them, and the ledger does not hold the penalty kind for it (owed penalties-total): with the goal kind level, a review's penalties are what moves them`);
        /* Round 1303, the lead's decisions 2 and 6. THE GOAL KIND ALONE, which is what the game would play with
           penalties by review off: the same fleet again, asked for the goal kind only, each match beside the same
           match without reviews. Its goals ruled out a match must sit inside real football's range like the staged
           fleet's, and it must give no penalty. And GOALS A MATCH. As Round 1303 first built it, a review that
           ruled a goal out took a goal away and nothing gave one back, so the goal kind alone moved goals a match
           by about the goals it ruled out (-0.066 to -0.088 on ten fleets), past the 0.05 the family allows a rule
           to move them (BANDS.goalGap), and an owed entry (goals-level) held the kind off. The fix pass closed that
           entry in the engine: a match that reviews goals draws them a little more often, by exactly what its
           reviews rule out (cmVarGoalLift), so those goals come ON TOP and the level stays. MEASURED, see the
           header. The rule is unchanged and has nothing left to excuse it: the goal kind alone must sit inside the
           band. An OPEN owed entry goals-level would hold the kind off and there is none (if one ever comes back
           while the engine is inside, it is stale); an ACCEPTED one excuses nothing (the read review's minor 3: with
           a ruling in the ledger this check passed at any gap). And the list the game is handed (the generated
           CM_VAR_KINDS) may not hold a kind the measured engine is outside its band for. Never a wider band.
           Control nolift takes the lift away and must go red here. */
        const goalOnly = playFleet(real, { seeds, paired: true, reviews: ['goal'] });
        const G = goalOnly.byKind.league, perG = n => n / G.matches;
        const ruledG = perG(G.ruledOut), gapG = (G.goals - G.goalsOff) / G.matches;
        metrics.bands.goalKindAlone = { leagueMatches: G.matches, ruledOut: G.ruledOut, ruledOutPerMatch: r4(ruledG), awarded: G.penaltyAwarded, goalsPerMatchOn: r4(perG(G.goals)), goalsPerMatchOff: r4(perG(G.goalsOff)),
          goalGap: r4(gapG), resultMoved: G.resultMoved, matchesWithReview: G.matchesWithReview, penaltiesPerMatch: r4(perG(G.penalties)), penaltiesPerMatchOff: r4(perG(G.penaltiesOff)) };
        assert.ok(G.matches >= 3000, `The goal kind's fleet played ${G.matches} league matches, fewer than 3,000`);
        assert.equal(G.penaltyAwarded + G.penaltyConfirmed + G.goalConfirmed, 0, 'With the goal kind alone a review only ever rules a goal out');
        assert.ok(inside(ruledG, d.goals), `With the goal kind alone, goals ruled out a match ${r4(ruledG)} is outside real football's ${r4(d.goals.low)} to ${r4(d.goals.high)} (headroom ${BANDS.headroom})`);
        const accepted = real.CM_VAR_ACCEPTED, plays = real.CM_VAR_KINDS;
        assert.ok(Array.isArray(accepted) && Array.isArray(plays), 'The generated rates carry the rulings the ledger holds and the kinds the game plays');
        const insideGap = Math.abs(gapG) <= BANDS.goalGap, heldGoal = holds.includes('goals-level'), ruledGoal = accepted.includes('goals-level');
        metrics.bands.goalKindAlone.level = { band: BANDS.goalGap, inside: insideGap, held: heldGoal, accepted: ruledGoal };
        metrics.bands.gamePlays = plays;
        assert.ok(insideGap || heldGoal, `With the goal kind alone reviews move goals a match by ${r4(gapG)}, past the ${BANDS.goalGap} the family allows a rule to move them, and the ledger does not hold the goal kind off for it (a ruling does not excuse it: the engine draws the goals a review rules out on top, so the level is the engine's to keep)`);
        assert.ok(!(insideGap && heldGoal), `With the goal kind alone reviews move goals a match by ${r4(gapG)}, inside the ${BANDS.goalGap} the family allows: the ledger's owed entry goals-level is stale, take it out`);
        assert.ok(!plays.includes('goal') || insideGap, `The game plays the goal kind while it moves goals a match by ${r4(gapG)}, past the ${BANDS.goalGap} the family allows`);
        assert.ok(!plays.includes('penalty') || insideTotal, `The game plays the penalty kind while penalties a match with reviews on (${r4(total)}) is outside real football's ${r4(band.low)} to ${r4(band.high)}`);
        assert.ok(!plays.includes('penalty') || insidePairGap, `The game plays the penalty kind while reviews with every kind staged move goals a match by ${r4(gap)}, past the ${BANDS.goalGap} the family allows`);
      },
      /* Round 1218 fix (review finding 6, fix-AT section 7 item 3). A review is dealt from its own keyed generator,
         never from the match's random stream. Each helper is called inside a seeded stretch: the stream's next two
         draws after the calls are the draws it gives with no call at all, and the same keys deal the same reviews
         whatever the stream holds. On the fixture rates, so the sample holds every kind of review. */
      stream() {
        const goals = Array.from({ length: 400 }, (_, i) => ({ name: `Simulated scorer ${i}`, minute: 1 + (i % 90) }));
        const stretches = Array.from({ length: 1500 }, (_, i) => [
          { kind: 'foul', minute: 1 + (i % 90), side: i % 2 ? 'me' : 'opp', who: `Simulated defender ${i}` },
          { kind: 'shot', minute: 1 + (i % 90), side: i % 2 ? 'opp' : 'me', who: `Simulated forward ${i}`, on: false },
        ]);
        const kicks = Array.from({ length: 200 }, (_, i) => ({ kind: 'shot', penalty: true, minute: 1 + (i % 90), side: i % 2 ? 'me' : 'opp', who: `Simulated taker ${i}` }));
        const taker = side => ({ id: `taker-${side}`, name: `Simulated taker of ${side}` });
        const deal = seed => withCmVarSeed(seed, () => {
          const dealt = {
            goal: cm.settleGoalReviews(goals, 'me', 'stream:goal').reviews,
            foul: stretches.flatMap((play, i) => cm.awardReviewedPenalties(play, `stream:foul:${i}`, taker).reviews),
            kick: cm.penaltyReviews(kicks, 'stream:kick'),
          };
          return { dealt, next: [Math.random(), Math.random()] };
        });
        const untouched = seed => withCmVarSeed(seed, () => [Math.random(), Math.random()]);
        const a = deal(9001), b = deal(9002);
        assert.ok(a.dealt.goal.length > 0 && a.dealt.foul.length > 0 && a.dealt.kick.length > 0, `The sample holds every kind of review (${a.dealt.goal.length} goal, ${a.dealt.foul.length} missed foul, ${a.dealt.kick.length} penalty)`);
        assert.deepEqual(a.next, untouched(9001), 'Dealing reviews draws nothing from the match stream');
        assert.deepEqual(b.next, untouched(9002), 'Dealing reviews draws nothing from the match stream, on a second seed');
        assert.notDeepEqual(a.next, b.next);
        assert.deepEqual(a.dealt, b.dealt, 'The same keys deal the same reviews whatever the match stream holds');
        metrics.stream = { goal: a.dealt.goal.length, foul: a.dealt.foul.length, kick: a.dealt.kick.length };
      },
    };
    for (const [name, title] of Object.entries(titles)) {
      if (control && name !== controls[control].test && name !== 'baseline') { rows.push({ title, status: 'skipped' }); continue; }
      try { await outcomes[name](); rows.push({ title, status: 'passed' }); }
      catch (error) { rows.push({ title, status: 'failed', errorName: error.name, message: error.message, stack: error.stack }); }
    }
    await new Promise(resolve => setImmediate(resolve));
    await writeFile(path.join(evidence, `${control || 'normal'}-report.json`), JSON.stringify({ numUnhandledErrors: unhandled.length, unhandled, metrics, cases: rows }, null, 2));
    assert.deepEqual(unhandled, [], 'Import or runtime errors cannot receive control credit');
    if (control) {
      assert.deepEqual(rows.filter(r => r.status === 'failed').map(r => [r.title, r.errorName]), [[titles[controls[control].test], 'AssertionError']]);
      assert.deepEqual(rows.filter(r => r.status === 'passed').map(r => r.title), [titles.baseline]);
      assert.equal(rows.filter(r => r.status === 'skipped').length, Object.keys(titles).length - 2);
    } else {
      assert.deepEqual(rows.filter(r => r.status === 'failed'), []); assert.equal(rows.filter(r => r.status === 'passed').length, Object.keys(titles).length);
      await writeFile(path.join(evidence, 'native-fixtures.json'), JSON.stringify(Object.fromEntries(['disallowed', 'confirmed', 'penalty', 'awarded_scored', 'awarded_missed'].map(kind => [kind, findCmVarFixture(original, kind)]))));
    }
    if (control) console.log(`simCmVar ${control}: CAUGHT by "${String(rows.find(r => r.status === 'failed')?.message).split('\n')[0].slice(0, 220)}"`);
    if (metrics.bands) console.log(`simCmVar bands: ${JSON.stringify(metrics.bands)}`);
    if (metrics.coverage) console.log(`simCmVar coverage: ${JSON.stringify(metrics.coverage)}`);
    if (metrics.kinds) console.log(`simCmVar kinds: ${JSON.stringify(metrics.kinds)}`);
    if (metrics.stream) console.log(`simCmVar stream: ${JSON.stringify(metrics.stream)}`);
    console.log(`simCmVar ${control || 'normal'}: actual review outcomes and full prior baseline passed.`);
  } finally {
    process.off('unhandledRejection', capture); process.off('uncaughtExceptionMonitor', capture);
    assert.equal(path.dirname(folder), parent); assert.ok(path.basename(folder).startsWith('cm-var-'));
    await rm(folder, { recursive: true, force: true });
    for (const [file, bytes] of Object.entries(sourceBytes)) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Original source bytes held');
  }
}
if (process.env.CM_VAR_FIXTURE_ONLY !== '1') await main();
