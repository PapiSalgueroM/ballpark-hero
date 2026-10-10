/**
 * Round 834: the shared awards night (src/lib/careerAwardsNight.ts and
 * src/components/career/AwardsNightCard.tsx) and Soccer Career bound onto it.
 *
 * The owner's words were "my careers are nothing like the soccer ones". The
 * program answer is one engine, many sports: lift each of Soccer Career's
 * systems into a shared module behind a sport descriptor, then bind every US
 * career to it. This round lifts the awards night. Soccer must come out of the
 * lift exactly as it went in, and the shared module must keep its promises for
 * whichever sport binds it next.
 *
 *   1. Soccer unchanged, HARD. scripts/lib/careerAwardsNightProbe.mjs drives 48
 *      seeded careers through every screen and records the whole save's hash
 *      after every step (10,555 of them), every Ballon d'Or night in clear
 *      (shortlist order, points, the player's place, 860 nights, 30 won), what
 *      every speech does on every won night and tournament (405 tournaments),
 *      192 direct speech draws on real saves, and the ceremony and tournament
 *      cards' server rendered markup. First recorded from origin/main 3fb92eea
 *      before any code moved; re-recorded after the merge with main from a git
 *      archive of main itself (the fixture's recordedFrom, ac0801c1), never from
 *      the branch, and the merged branch replayed it identical before part 2.
 *      This requires an exact replay, directly or through the bounded copied
 *      historical attribution below. Soccer calls Math.random directly in a fixed order, so a
 *      single reordered draw anywhere breaks it. The winner's and the podium's
 *      ceremony cards are left out of the comparison since part 2 changed them
 *      on purpose (section 6 holds them); so is every tournament card's hash,
 *      since Round 926 changed TournamentCard on purpose (the won tournament
 *      moment; src/test/tournamentCardMoment.test.tsx holds it, and the rest
 *      of every tournament entry is still compared); every other card is
 *      compared whole.
 *   2. The contract, on a synthetic sport (2,000 nights with repeated names,
 *      short fields, fillers that repeat themselves, and verdict rules that
 *      throw points about): the shortlist never names a rival twice, the list
 *      is ranked so the winner is the top, the player's place is his index on
 *      the list or the wider ranking's number, the night says whether he made
 *      the ballot; a speech moves exactly the meters its steps name by exactly
 *      their deltas, draws once only when it has a risk, writes one line; the
 *      settle writes the place, the win, the cabinet and the right steps.
 *   3. Soccer's speeches are honest, on a save made by initCareer: 2,000 draws
 *      (250 per option, eight options). Every "Popularity -10" a line prints
 *      must be the move the option made, every meter it moves must be one it
 *      names, the gates hide what they say they hide, and each gamble lands on
 *      both sides near its stated chance.
 *   4. Rival names. A new sport's field must be generated people; only the
 *      Soccer engine may declare 'legacy-real-era-stars' (the era's real stars
 *      with invented goals, an open decision for the owner).
 *   5. No second copy. The inline shortlist, the wider ranking and the four
 *      hand written speech buttons must not come back beside the shared ones,
 *      and Soccer must keep calling them.
 *   6. The ceremony card tells the truth (Round 834 part 2 and its review).
 *      Every "Word +N" the winner and podium lines print must be what the
 *      night really moved that meter, and every meter it moves must be named
 *      (the card used to promise "Legacy +20" while the night moved
 *      popularity, then "Popularity +20" to winners already at the cap of
 *      100). Checked at popularity 50 (where the night must do exactly its
 *      steps), 95 and 100 (where the cap cuts them, and the case is asserted
 *      to be cut). A won ceremony offers the speeches this save may give in
 *      place of Continue, one pick moves exactly that speech's steps and
 *      writes one line, a second pick does nothing, the card then shows what
 *      it did with Continue, a lost or stale ceremony offers nothing. On the
 *      replay's real ceremonies the offer comes up on every win and on no
 *      loss, the measured move is on every win and podium and no other night,
 *      and every speech each real winner may give is given on a copy of his
 *      save: what the card shows after it must name only what really moved.
 *      Measured on the review's tree: 25 of 30 real wins cut short of
 *      Popularity +20 by the cap; 98 speeches given, 94 cut by a cap, the
 *      log line's own number untrue on 18 (the card no longer shows it).
 *   7. Round 1023: a won tournament's speech stays on the card. On every real
 *      won tournament the replay reaches, every speech is given with the
 *      card's own call (giveWorldCupSpeech): the career stays on the screen,
 *      the speech is kept once, the card then shows its words and what it
 *      measurably moved with Continue and no speech left, a reload shows the
 *      same, Continue leaves; a lost tournament, a speech off the screen and
 *      a pre Round 124 World Cup save are checked too.
 *
 * ROUND 1023 changed three things this file holds. (a) The speech log line:
 * the two gambles printed their coin's number ("Popularity +8") whatever the
 * cap let land; Soccer now gives every speech through speakSoccer, which adds
 * the coin's meters as measured. Section 3 drives speakSoccer and adds a cap
 * case (both sides of both gambles at popularity 0, 95, 100, rivalry 50 and
 * 95: 24 lines, 15 coin steps cut, 0 untrue); section 6 now requires the log
 * line true on every real winner (measured on main 1aaba4d5: untrue on 19 of
 * 98 speeches given; on the branch 0 of 98, 19 of them a gamble the cap cut)
 * and still needs a cut gamble to exist.
 * (b) The tournament speech card (section 7): measured 74 real won
 * tournaments, 296 speeches, 262 cut short by a cap, 0 problems. (c) The
 * fixture was re-recorded from the branch, with the move attributed: main
 * 1aaba4d5 recorded from a git archive replayed the old fixture on every key;
 * the branch with only the Ballon d'Or judging change taken out (the field
 * sliced at 10 again) recorded the same file as the whole branch, so that
 * change moves nothing here (simBallonDorFairness holds it); and main against
 * the branch differs only where a speech's log line changed: 11 careers part
 * at a speech step (bs or ws), the 32 won nights' speech lines, 38 won
 * tournaments' speech lines, 49 direct speeches (35 greatest_ever, 5
 * call_out_doubters, 9 others sampled from a career that had already
 * parted), no meter move and no night's place changed.
 *
 * The probe hashes a save with the night's measured `moved` taken out (the
 * one field the review added; no tree before it writes one), so the fixture
 * recorded from main still proves everything else unchanged.
 *
 * Round 1041 (the domestic cup run) re-recorded the fixture, on purpose,
 * from a clean git archive export of its branch (twice, identical), after
 * the probe learned to hash a save without the new season row key cupRun
 * the way it drops `moved`. Three deliberate changes of that round move
 * saves, attributed in throwaway copies with each taken back out in memory
 * (scripts/lib/careerAwardsNightBundle.mjs patches): with all three out the
 * old fixture replays whole (0 of 48 careers move, 0 nights differ). Only the
 * cup's real name in (the log line and the leader story say "FA Cup" where
 * they said "Domestic Cup", no draw): 34 careers move. Only the coin fix in
 * (a season whose association played no cup is never won, which changes the
 * newspaper's candidates): careers 3, 32 and 41 and one generated rival name.
 * Only the world rule in (cup winners by association, none crowned in a
 * season with no cup, Toronto FC never the U.S. Open Cup's): 25 careers and
 * 13 nights. The whole round: 41 of 48 careers and 73 nights, the union.
 *
 * Round 1100 (every league a real league) re-recorded the fixture, on
 * purpose, from its branch commit on a CI runner (twice, identical; the
 * fixture's recordedFrom is that commit). Round 1100: the career club pool
 * grew from 241 to 460 clubs, so the clubs a career is offered change, and
 * eight plain leagues got a size, a format and a derby cadence, so their
 * seasons hold a league position. Attribution: the same tree with the seven
 * source files that round changed read from Release AL's gated tree (the
 * pool, the ledger names, the rivalry spellings, the format, cadence and
 * size rows, the era table) replays the old fixture whole, 170 checks of 170.
 *
 * Negative controls (SIM_AWARDS_NIGHT_CONTROL), each must turn its section red:
 *   reorderdraw   the era star loop draws assists before goals   -> section 1
 *   winnernottop  the night is no longer re-ranked after a rule  -> section 2
 *   speechleak    a gamble's hit also lands its miss steps       -> sections 2 and 3
 *   legacyreal    a second file declares real era stars          -> section 4
 *   secondcopy    an inline wider ranking reappears in the engine -> section 5
 *   speechcopy    a second spoken speech block in the tournament card -> section 5
 *   cardtext      the winner line goes back to "Legacy +20, ..."  -> section 6
 *   effectonly    the night drops the winner's first step only    -> section 6
 *   speechtwice   the card's speech loses its once-only guard     -> section 6
 *   nominalnight  the night records its steps, not what landed    -> section 6
 *   nominalmoved  the speech reports its steps, not what landed   -> section 6
 *   numberedline  the card's speech line keeps the log's number   -> section 6
 *   numberback    a gamble's line prints its asked number again   -> section 3
 *   wcleaves      the tournament speech clears the card at once   -> section 7
 *   wctwice       the tournament speech loses its once-only guard -> section 7
 *   wcnominal     the tournament card reports the steps, not what landed -> section 7
 *   wccardmute    the tournament card stops showing the speech    -> section 7
 *   followersbare a follower move prints as a bare "+3" again    -> section 7
 * Each patch is refused unless the exact text it replaces is present, so a
 * control can never pass by changing nothing. Measured on the round's tree:
 * every control turns its own section red (winnernottop also breaks sections
 * 1 and 6, speechleak sections 1 and 3, effectonly sections 1 and 2,
 * nominalnight section 2).
 * Round 1023, measured on its branch: numberback turns 1, 3 and 6 red;
 * wcleaves, wctwice, wcnominal and wccardmute turn 7 red. Two old controls
 * went quiet once the log line's number became the measured move, and the
 * checks were tightened rather than the controls dropped: speechleak's line
 * now describes its leaked move truly, so section 3 also requires every meter
 * to move by exactly its steps away from the caps (red again: 1, 2 and 3);
 * numberedline's card line now carries a true number, so sections 6 and 7
 * require the card's line to be words only, the numbers once in the moved
 * line beside it (red again: 6).
 * Round 1023's review: the tournament card printed "Followers +3" for a move
 * of three million followers (the save counts them in millions), and the
 * claims parser dropped units, so nothing saw it. The followers meter now
 * shows "+3M", the parser keeps the unit and requires each meter's own
 * (market value and followers in millions, the rest plain points), and
 * section 7 requires some card to name a follower move so the unit check
 * cannot pass by never running. Control followersbare takes the unit off.
 * The same review lifted the kept speech (GivenSpeech, keepSpeech,
 * givenSpeechOf, giveSpeechOnce in careerAwardsNight.ts, SpokenSpeech in
 * AwardsNightCard.tsx) out of the soccer files, so wcleaves, wctwice,
 * wcnominal, nominalmoved, numberedline and speechtwice now patch the
 * shared helper's call sites (numberedline the helper itself, which turns 6
 * and 7 red); section 5 requires both soccer speeches to give through
 * giveSpeechOnce and both tournament cards to draw SpokenSpeech, with
 * control speechcopy. Measured: all nine of those controls fire.
 *
 * Bands, all on fixed seeds so the same numbers come back every run: the
 * synthetic 35% gamble came up 338 of 1,000 (band 30 to 40%); Soccer's
 * greatest_ever 103 of 250 on 35% and call_out_doubters 104 of 250 on 40%
 * (band: within 10 points of the stated chance, one standard deviation at 250
 * draws is about 3).
 *
 * Rounds 1185 and 1187 deliberately changed form-based selection and the
 * entire Youth Mentor event object. Only section 1 may undo those two edits
 * in a throwaway bundle, after applying its existing negative control. The
 * unchanged fixture must also match an independent actual 4ab source bundle.
 * Current, original and attributed full outputs, complete per-step saves and
 * every random draw are retained. The latter two stream into compressed JSONL
 * files without omitting fields. Sections 2 through 7 still use current code
 * and the current fleet. A moved stream must remain red after attribution.
 *
 * Run: node scripts/simCareerAwardsNight.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { probeAwardsNight, mulberry32 } from './lib/careerAwardsNightProbe.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { awardsNight1172Attribution } from './lib/careerAwardsNight1172.mjs';
import { careerLeagueWorld1175Attribution } from './lib/careerLeagueWorld1175.mjs';
import { careerDiscipline1176Attribution } from './lib/careerDiscipline1176.mjs';
import { SOCCER_CONTRACT_1177_BASELINE_PATCHES } from './lib/soccerContractBaseline1177.mjs';
import { withoutTrainFields } from './lib/soccerTrain1178.mjs';
import { inverseCareerDevelopment, careerDevelopmentOriginalPlugin, careerDevelopmentBaseReceipt } from './lib/careerDevelopmentAttribution1185.mjs';
/* Release AT: Rounds 1190 and 1191 moved these careers after Rounds 1185 and 1187 had (the New Manager card
   queues a smaller role; two goal tally articles and the two news returns). The third inverse puts exactly those
   five edits back on the copied engine, beside the two already composed here. Proof that they are all that moved
   the recording: remote check rAT-sc-engine-g. See scripts/lib/careerStoryRoleAttribution1190.mjs. */
import { inverseCareerStoryRole } from './lib/careerStoryRoleAttribution1190.mjs';

/* Release AT: two attributions meet in section 1. Release AQ replays the old fixture with the Soccer
   Career train (Rounds 1169 to 1178) taken out through these four lists. Rounds 1185 and 1187 replay it
   with their two development edits reversed, against the actual tree they were cut from, which is older
   than the train. The merged tree carries both, so the one attributed bundle takes both out: the train's
   lists first, as Release AQ applied them, then any control, then the development inverse. */
const TRAIN_OUT = [...awardsNight1172Attribution, ...careerLeagueWorld1175Attribution, ...careerDiscipline1176Attribution, ...SOCCER_CONTRACT_1177_BASELINE_PATCHES];
function trainOutOf(file, source) {
  let text = source;
  for (const p of TRAIN_OUT.filter(q => q.file === file)) {
    if (!text.includes(p.from)) throw new Error(`train out refused: ${file} does not contain ${JSON.stringify(p.from.slice(0, 80))}`);
    text = text.replace(p.from, () => p.to);
    if (text.includes(p.from) && p.from !== p.to && !p.to.includes(p.from)) throw new Error(`train out refused: ${file} contains ${JSON.stringify(p.from.slice(0, 80))} more than once`);
  }
  return text;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_AWARDS_NIGHT_CONTROL ?? '';
const CONTROLS = {
  reorderdraw: {
    section: 1,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: 'const goals = rand(star.baseGoals[0], star.baseGoals[1]);\n      const assists = rand(3, 18);',
      to: 'const assists = rand(3, 18);\n      const goals = rand(star.baseGoals[0], star.baseGoals[1]);',
    }],
  },
  winnernottop: {
    section: 2,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: '    verdict(nominees, place);\n    nominees.sort(byPoints);',
      to: '    verdict(nominees, place);',
    }],
  },
  speechleak: {
    section: 2,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: 'applyMeterSteps(sport.meters, s, hit ? option.risk.hit : option.risk.miss);',
      to: 'applyMeterSteps(sport.meters, s, hit ? [...option.risk.hit, ...option.risk.miss] : option.risk.miss);',
    }],
  },
  /* Round 1023: a gamble's line prints its asked number again. */
  numberback: {
    section: 3,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: `      : '🐐 "I am the greatest to ever do this." Delivered with such calm that people just... agreed.',`,
      to: `      : '🐐 "I am the greatest to ever do this." Delivered with such calm that people just... agreed. Popularity +8.',`,
    }],
  },
  /* Round 1023: the tournament speech clears the card in the same tap again. */
  wcleaves: {
    section: 7,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: '      else s.pendingWorldCup = { ...prev.pendingWorldCup!, speech };\n    },',
      to: '      else s.pendingWorldCup = { ...prev.pendingWorldCup!, speech };\n      Object.assign(s, dismissWorldCup(s, FALLBACK_CLUBS));\n    },',
    }],
  },
  /* Round 1023: the tournament speech loses its once-only guard. */
  wctwice: {
    section: 7,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: '    open: worldCupSpeechOpen,',
      to: '    open: () => true,',
    }],
  },
  /* Round 1023: the tournament card reports the speech's steps, not what landed. */
  wcnominal: {
    section: 7,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: '    speak: s => speakSoccer(s, SOCCER_WORLD_CUP_SPEECHES, choice)!,',
      to: '    speak: s => ({ ...speakSoccer(s, SOCCER_WORLD_CUP_SPEECHES, choice)!, moved: SOCCER_WORLD_CUP_SPEECHES.find(o => o.id === choice)!.effect }),',
    }],
  },
  /* Round 1023: the tournament card stops showing the speech it was given. */
  wccardmute: {
    section: 7,
    patches: [{
      file: 'src/components/soccer-career/InternationalPanel.tsx',
      from: '      {isWinner && given && <SpokenSpeech speech={given} />}',
      to: '      {null}',
    }],
  },
  /* Round 1023 review: a follower move prints as a bare number again
     ("Followers +3" for three million). */
  followersbare: {
    section: 7,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: 'read: s => s.socialMediaFollowers, show: d =>',
      to: 'read: s => s.socialMediaFollowers, unshown: d =>',
    }],
  },
  legacyreal: { section: 4, patches: [] },
  secondcopy: { section: 5, patches: [] },
  speechcopy: { section: 5, patches: [] },
  cardtext: {
    section: 6,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: 'winnerLine: moved => `The best player in the world!${moved ? ` ${moved}` : ""}`,',
      to: 'winnerLine: () => "The best player in the world! Legacy +20, Market Value +€15M",',
    }],
  },
  effectonly: {
    section: 6,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: 'moved = measureMoves(sport.meters, s, () => applyMeterSteps(sport.meters, s, sport.winnerSteps));',
      to: 'moved = measureMoves(sport.meters, s, () => applyMeterSteps(sport.meters, s, sport.winnerSteps.slice(1)));',
    }],
  },
  nominalnight: {
    section: 6,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: 'sport.stage(s, moved ? { ...night, moved: describeSteps(sport.meters, moved) } : night);',
      to: 'sport.stage(s, moved ? { ...night, moved: describeSteps(sport.meters, place === 1 ? sport.winnerSteps : sport.podiumSteps) } : night);',
    }],
  },
  nominalmoved: {
    section: 6,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: '    speak: s => speakSoccer(s, SOCCER_BDOR_SPEECHES, choice)!,',
      to: '    speak: s => ({ ...speakSoccer(s, SOCCER_BDOR_SPEECHES, choice)!, moved: SOCCER_BDOR_SPEECHES.find(o => o.id === choice)!.effect }),',
    }],
  },
  numberedline: {
    section: 6,
    patches: [{
      file: 'src/lib/careerAwardsNight.ts',
      from: '  return { id, line: narrativeOf(meters, line), moved: describeSteps(meters, moved) };',
      to: '  return { id, line, moved: describeSteps(meters, moved) };',
    }],
  },
  speechtwice: {
    section: 6,
    patches: [{
      file: 'src/lib/soccerCareerEngine.ts',
      from: '    open: bdorSpeechOpen,',
      to: '    open: () => true,',
    }],
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`unknown SIM_AWARDS_NIGHT_CONTROL "${CONTROL}" (known: ${Object.keys(CONTROLS).join(', ')})`);
  process.exit(2);
}
const patches = CONTROLS[CONTROL]?.patches ?? [];
if (CONTROL) console.log(`CONTROL ${CONTROL} active: section ${CONTROLS[CONTROL].section} must go red\n`);

const ARTIFACTS = path.resolve(ROOT, process.env.SIM_AWARDS_NIGHT_ARTIFACTS || '.tmp-fx/career-awards-night', CONTROL || 'healthy');
fs.mkdirSync(ARTIFACTS, { recursive: true });
const sourceFiles = ['src/lib/soccerCareerEngine.ts', 'src/lib/careerAwardsNight.ts', 'src/lib/soccerCareerAppearance.ts',
  'src/lib/soccerCareerSelection.ts', 'src/lib/soccerCareerPreparation.ts', 'src/lib/soccerCareerMentor.ts',
  'src/pages/SoccerCareer.tsx', 'src/components/career/AwardsNightCard.tsx', 'src/components/soccer-career/InternationalPanel.tsx',
  'scripts/lib/careerAwardsNightProbe.mjs', 'scripts/lib/careerAwardsNightBundle.mjs',
  'scripts/lib/careerDevelopmentAttribution1185.mjs', 'scripts/lib/careerStoryRoleAttribution1190.mjs', 'scripts/data/careerAwardsNightFixture.json', 'scripts/simCareerAwardsNight.mjs'];
function sourceHashes() {
  const result = {};
  for (const file of sourceFiles) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    result[file] = createHash('sha256').update(bytes).digest('hex');
  }
  return result;
}
const proof = { control: CONTROL, base: careerDevelopmentBaseReceipt(), sourceBefore: sourceHashes(), sourceAfter: null,
  sourceHeld: false, attribution: [], storyRoleAttribution: [], faultEdits: [], originalSources: [], replays: {}, originalFixtureMatches: false, fixtureMatches: false };
const writeProof = (file, value) => fs.writeFileSync(path.join(ARTIFACTS, file), JSON.stringify(value, null, 2));

/* The actual original tree is loaded independently. The sole page append is
   the same card export used by the existing recorder and current bundler. */
async function originalAwardsBundle() {
  const require = createRequire(path.join(ROOT, 'package.json'));
  const { build } = require('esbuild');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'awards-original-1185-'));
  const entry = path.join(work, 'entry.tsx'), out = path.join(work, 'bundle.cjs');
  const R = ROOT.replaceAll('\\', '/');
  fs.writeFileSync(entry, `import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export * as soccer from '${R}/src/lib/soccerCareerEngine.ts';
export * as appearance from '${R}/src/lib/soccerCareerAppearance.ts';
import * as page from '${R}/src/pages/SoccerCareer.tsx';
import * as intl from '${R}/src/components/soccer-career/InternationalPanel.tsx';
const noop = () => undefined;
export const cards = {
  bdor: (bdor, career) => renderToStaticMarkup(React.createElement(page.__BdorCard, { bdor, career, onDismiss: noop, onSpeech: noop })),
  worldCup: (wc, career) => renderToStaticMarkup(React.createElement(page.__WcCard, { wc, career, onDismiss: noop, onSpeech: noop })),
  tournament: t => renderToStaticMarkup(React.createElement(intl.TournamentCard, { t, onDismiss: noop, onSpeech: noop })),
};\n`);
  const original = careerDevelopmentOriginalPlugin(proof.originalSources);
  const plugin = { name: 'awards-original-card-exports', setup(builder) {
    original.setup({ onLoad(options, load) {
      builder.onLoad(options, async args => {
        const result = await load(args);
        if (result && path.relative(ROOT, args.path).replaceAll('\\', '/') === 'src/pages/SoccerCareer.tsx') {
          result.contents += '\nexport { BallonDorCeremonyCard as __BdorCard, WorldCupResultCard as __WcCard };\n';
        }
        return result;
      });
    } });
  } };
  try {
    await build({ entryPoints: [entry], bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
      alias: { '@': `${R}/src` }, nodePaths: [path.dirname(path.dirname(require.resolve('react/package.json')))], absWorkingDir: ROOT,
      define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
      outfile: out, logLevel: 'error', plugins: [plugin] });
    return require(out);
  } finally { fs.rmSync(work, { recursive: true, force: true }); }
}

/* Preserve every selected fault before reversing only the two certified
   development edits. The whole copied engine and effective receipts are kept. */
async function attributedAwardsBundle() {
  const file = 'src/lib/soccerCareerEngine.ts';
  const authored = fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
  let controlled = trainOutOf(file, authored);
  for (const patch of patches.filter(p => p.file === file)) {
    assert.equal(controlled.split(patch.from).length, 2, 'The awards engine fault has one effective anchor');
    const before = controlled;
    controlled = controlled.replace(patch.from, patch.to);
    assert.notEqual(controlled, before, 'The awards engine fault changed its copied source');
    proof.faultEdits.push({ file, beforeSha256: createHash('sha256').update(before).digest('hex'),
      afterSha256: createHash('sha256').update(controlled).digest('hex'), effective: true });
  }
  const inverse = inverseCareerStoryRole(inverseCareerDevelopment(controlled, proof.attribution), proof.storyRoleAttribution);
  fs.writeFileSync(path.join(ARTIFACTS, 'current-engine.ts'), authored);
  fs.writeFileSync(path.join(ARTIFACTS, 'controlled-engine.ts'), controlled);
  fs.writeFileSync(path.join(ARTIFACTS, 'attributed-engine.ts'), inverse);
  return bundleAwardsNight(ROOT, { patches: [...TRAIN_OUT.filter(p => p.file !== file), ...patches.filter(p => p.file !== file), { file, from: authored, to: inverse }] });
}

/* Observe assignments of the probe's existing seeded generators. A wrapper
   calls the assigned generator once and returns its unchanged value. Restored
   generators are unwrapped first, so nested speech probes do not double count.
   States and draws stream to disk rather than keeping three huge arrays. */
async function observedReplay(label, bundle, callbacks = {}) {
  const statesFile = path.join(ARTIFACTS, `${label}-states.jsonl`), drawsFile = path.join(ARTIFACTS, `${label}-draws.jsonl`);
  const statesFd = fs.openSync(statesFile, 'w'), drawsFd = fs.openSync(drawsFile, 'w');
  const stateHash = createHash('sha256'), drawHash = createHash('sha256');
  const descriptor = Object.getOwnPropertyDescriptor(Math, 'random');
  const originals = new WeakMap(), wrappers = new WeakMap();
  let active = descriptor.value, steps = 0, draws = 0, output;
  const wrap = random => {
    const original = originals.get(random) || random;
    if (!wrappers.has(original)) {
      const wrapper = () => {
        const value = original();
        const line = JSON.stringify({ draw: draws++, value }) + '\n';
        fs.writeSync(drawsFd, line); drawHash.update(line);
        return value;
      };
      originals.set(wrapper, original); wrappers.set(original, wrapper);
    }
    return wrappers.get(original);
  };
  Object.defineProperty(Math, 'random', { configurable: true, enumerable: descriptor.enumerable,
    get: () => wrap(active), set: random => { active = originals.get(random) || random; } });
  const error = console.error;
  console.error = (...args) => { if (!String(args[0]).includes('useLayoutEffect does nothing on the server')) error(...args); };
  try {
    output = JSON.parse(JSON.stringify(probeAwardsNight(bundle, { ...callbacks, onStep(save, career) {
      /* Release AT: the three fields the train writes on a save that no list takes back (they draw
         nothing) are left out on every side, the same replacer Release AQ's own compares use. */
      const line = JSON.stringify({ step: steps++, career, save }, withoutTrainFields) + '\n';
      fs.writeSync(statesFd, line); stateHash.update(line);
      callbacks.onStep?.(save, career);
    } })));
  } finally {
    Object.defineProperty(Math, 'random', descriptor); console.error = error;
    fs.closeSync(statesFd); fs.closeSync(drawsFd);
  }
  writeProof(`${label}-probe.json`, output);
  for (const file of [statesFile, drawsFile]) {
    await pipeline(fs.createReadStream(file), createGzip(), fs.createWriteStream(`${file}.gz`));
    fs.unlinkSync(file);
  }
  proof.replays[label] = { steps, draws, statesSha256: stateHash.digest('hex'), drawsSha256: drawHash.digest('hex'),
    probeSha256: createHash('sha256').update(JSON.stringify(output)).digest('hex') };
  return output;
}

let failures = 0;
const failedSections = new Set();
let section = 0;
const fail = m => { failures += 1; failedSections.add(section); console.error(`  FAIL: ${m}`); };
let checks = 0;
const check = (ok, m) => { checks += 1; if (!ok) fail(m); };

const B = await bundleAwardsNight(ROOT, { patches, extra: { awards: 'src/lib/careerAwardsNight.ts' } });
const { soccer, awards: A } = B;
/* Filled by section 1's replay, read by section 6: on every real ceremony the
   fleet reaches, was the speech offered exactly when the player won, did the
   night carry its measured `moved` exactly when it was a win or a podium, and
   how many wins did the popularity cap cut short. `wins` keeps a copy of each
   real won save on its ceremony (taken without a draw, so the replay is not
   disturbed) for section 6 to give speeches on. */
const liveNights = { won: 0, offered: 0, wrong: 0, measured: 0, measuredWrong: 0, winsCut: 0, wins: [] };
const liveTournaments = [];

/* ---------- 1. Soccer unchanged ---------- */
section = 1;
console.log('1) Soccer Career replays the pre-lift fixture byte for byte');
{
  const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerAwardsNightFixture.json'), 'utf8'));
  const current = await observedReplay('current', B, {
    onNight: (s, bdor) => {
      if (bdor.playerRank === 1) { liveNights.won += 1; if (soccer.bdorSpeechOpen(s)) liveNights.offered += 1; }
      else if (soccer.bdorSpeechOpen(s)) liveNights.wrong += 1;
      const podium = bdor.playerRank !== null && bdor.playerRank <= 3;
      if (podium !== (typeof bdor.moved === 'string')) liveNights.measuredWrong += 1;
      else if (podium) liveNights.measured += 1;
      if (bdor.playerRank === 1) {
        if (!/Popularity \+20\b/.test(bdor.moved ?? '')) liveNights.winsCut += 1;
        liveNights.wins.push(JSON.parse(JSON.stringify(s)));
      }
    },
    /* Round 1023: every real won tournament screen, copied without a draw,
       for section 7 to give speeches on. */
    onTournament: (s, won) => { if (won) liveTournaments.push(JSON.parse(JSON.stringify(s))); },
  });
  check(current.careers.length === fixture.careers.length && current.nights.length > 500, 'the current new-ballot replay did not exercise the whole fixture population');
  /* Release AQ's baseline bundle (the four lists, then a control) is the attributed bundle below now:
     attributedAwardsBundle() applies the same lists in the same order and then reverses Rounds 1185
     and 1187, and `fresh` is its replay. */
  console.log('   Round 1172 attribution: exact copied new-generation, newspaper and ceremony changes restored for the old fixture; current outcomes still checked in sections 2 to 7 and simSoccerAwardReveal');
  const original = await observedReplay('original', await originalAwardsBundle());
  /* Round 834 part 2 changed the winner's and the podium's ceremony cards on
     purpose (the speech is offered, the lines say what the night does), so
     those two cards are left out of the replay on both sides; section 6 holds
     them. Every other ceremony card, the shortlist, the wider ranking, no
     nomination and both World Cup cards, is still compared whole.
     Round 926 changed TournamentCard on purpose (a won tournament lands as a
     moment: confetti, cm-slam, cm-rise, wrappers around the tiles, and a
     data-intl-moment flag on every card), so every tournament's card hash
     moved while nothing else did: with only InternationalPanel.tsx put back
     to main's copy this section replays the fixture whole. The fixture is
     only ever recorded from main, never from a branch, so the card's hash is
     left out on both sides the same way as the ceremony cards above, and
     src/test/tournamentCardMoment.test.tsx holds the card. Every other field
     of every tournament (career, year, name, result, speeches, the choice)
     is still compared whole, and the card is still drawn for each one. */
  const changedOnPurpose = d => {
    let n = 0;
    for (const night of d.nights) if (night.rank !== null && night.rank <= 3 && 'ui' in night) { delete night.ui; n += 1; }
    d.markup = d.markup.map(m => (m.what === 'bdor winner' || m.what === 'bdor podium') && (m.html || m.ui) ? (n += 1, { what: m.what, night: m.night }) : m);
    return n;
  };
  const tournamentCards = d => {
    let n = 0;
    for (const t of d.tournaments) if ('ui' in t) { delete t.ui; n += 1; }
    return n;
  };
  const comparable = value => {
    const copy = JSON.parse(JSON.stringify(value));
    changedOnPurpose(copy); tournamentCards(copy);
    return copy;
  };
  const exactFixture = value => Object.keys(fixture).filter(key => key !== 'recordedFrom')
    .every(key => JSON.stringify(fixture[key]) === JSON.stringify(value[key]));
  const leftOut = changedOnPurpose(fixture);
  const cardsWant = tournamentCards(fixture);
  const oldCards = original.tournaments.filter(t => 'ui' in t).length;
  proof.originalFixtureMatches = exactFixture(comparable(original));
  check(proof.originalFixtureMatches && oldCards === cardsWant, 'the independent actual frozen original must replay every unchanged fixture field and tournament card count');
  proof.currentFixtureMatches = exactFixture(comparable(current));
  const replay = proof.currentFixtureMatches ? current : await observedReplay('attributed', await attributedAwardsBundle());
  const cardsGot = replay.tournaments.filter(t => 'ui' in t).length;
  const fresh = comparable(replay);
  proof.fixtureMatches = exactFixture(fresh);
  const kept = proof.replays[proof.currentFixtureMatches ? 'current' : 'attributed'], old = proof.replays.original;
  proof.drawsEqual = kept.draws === old.draws && kept.drawsSha256 === old.drawsSha256;
  proof.statesEqual = kept.steps === old.steps && kept.statesSha256 === old.statesSha256;
  check(proof.drawsEqual, 'the entire attributed random draw stream must match the independent original');
  check(proof.statesEqual, 'every complete attributed per-step save must match the independent original');
  console.log(`   current fixture ${proof.currentFixtureMatches ? 'identical' : 'changed'}; actual original ${proof.originalFixtureMatches ? 'identical' : 'DIFFERS'}; ${proof.currentFixtureMatches ? 'direct' : '1185 form plus 1187 whole Youth Mentor catalog inverse'} replay ${proof.fixtureMatches ? 'identical' : 'DIFFERS'}`);
  console.log(`   ${leftOut} winner and podium cards left out of the replay (changed on purpose, section 6)`);
  console.log(`   ${cardsWant} tournament cards left out of the replay (Round 926 changed the card on purpose, tournamentCardMoment.test.tsx), ${cardsGot} drawn now`);
  check(cardsWant > 0 && cardsGot === cardsWant, `the tournament card was drawn for ${cardsGot} tournaments, the fixture recorded ${cardsWant}`);
  const stepCount = fixture.careers.reduce((a, c) => a + c.steps.split(' ').length, 0);
  console.log(`   fixture: ${fixture.careers.length} careers, ${stepCount} saves, ${fixture.nights.length} nights (${fixture.nights.filter(n => n.rank === 1).length} won), ${fixture.tournaments.length} tournaments, ${fixture.speeches.length} speeches, ${fixture.markup.length} kept cards`);
  check(fixture.careers.length >= 40 && stepCount > 5000 && fixture.nights.length > 500, 'the fixture is smaller than the round recorded, it cannot prove much');
  const resolve = list => list.split(' ').map(t => {
    const [who, pts] = t.split(':');
    return `${who === 'P' ? 'YOU' : fixture.names[Number(who)] ?? fresh.names[Number(who)] ?? who}:${pts}`;
  }).join(', ');
  if (fixture.recordedFrom) console.log(`   recorded from ${fixture.recordedFrom}`);
  for (const key of Object.keys(fixture)) {
    if (key === 'recordedFrom') continue; // the header, not an output
    const want = fixture[key], got = fresh[key];
    if (JSON.stringify(want) === JSON.stringify(got)) { console.log(`   ${key.padEnd(12)} identical`); checks += 1; continue;
    }
    if (key === 'careers') {
      const i = want.findIndex((c, k) => JSON.stringify(c) !== JSON.stringify(got?.[k]));
      const a = want[i].steps.split(' '), b = (got?.[i]?.steps ?? '').split(' ');
      const j = a.findIndex((t, k) => t !== b[k]);
      fail(`career ${want[i].c} parts at step ${j} of ${a.length}: fixture ${a[j]} (phase ${a[j]?.slice(0, 2)}), now ${b[j] ?? 'nothing'}; the step before matched ${j > 0 ? a[j - 1] : '(none)'}`);
    } else if (key === 'nights') {
      const i = want.findIndex((n, k) => JSON.stringify(n) !== JSON.stringify(got?.[k]));
      const w = want[i], g = got?.[i];
      fail(`night ${i} (career ${w.c}, ${w.year}) differs: fixture rank ${w.rank} [${resolve(w.list)}], now rank ${g?.rank} [${g ? resolve(g.list) : 'missing'}]`);
    } else if (Array.isArray(want)) {
      const i = want.findIndex((n, k) => JSON.stringify(n) !== JSON.stringify(got?.[k]));
      fail(`${key}[${i}] differs: fixture ${JSON.stringify(want[i]).slice(0, 300)}, now ${JSON.stringify(got?.[i]).slice(0, 300)}`);
    } else {
      fail(`${key} differs`);
    }
  }
  /* The fixture has to exercise what it claims to: both sides of both gambles. */
  const seen = new Set(fixture.speeches.map(s => `${s.id}:${s.d.popularity ?? 'clamped'}`));
  for (const want of ['greatest_ever:-10', 'greatest_ever:8', 'call_out_doubters:-8', 'call_out_doubters:10']) {
    check(seen.has(want), `the fixture never saw ${want}, so it cannot prove that branch kept its draw`);
  }
}

/* ---------- 2. The contract on a synthetic sport ---------- */
section = 2;
console.log('\n2) The shared contract, on a synthetic sport');
{
  const rng = mulberry32(834);
  const award = { id: 'synthetic', name: 'Synthetic Cup', emoji: '🏆', shortlistSize: 8, widerSize: 20, podiumSize: 3, rivals: 'generated' };
  let nights = 0, repeatsOffered = 0, rerankedByRule = 0, widerPlaced = 0, onList = 0, filled = 0;
  const bad = { repeat: 0, order: 0, place: 0, wider: 0, nominated: 0, size: 0 };
  for (let night = 0; night < 2000; night += 1) {
    const fieldSize = 2 + Math.floor(rng() * 20);
    const field = [];
    for (let i = 0; i < fieldSize; i += 1) field.push({ name: `Gen ${Math.floor(rng() * 22)}`, points: Math.floor(rng() * 100), isPlayer: false });
    field.sort((a, b) => b.points - a.points);
    if (new Set(field.map(f => f.name)).size < field.length) repeatsOffered += 1;
    const playerPoints = Math.floor(rng() * 100);
    const player = rng() < 0.6 ? { name: 'You', points: playerPoints, isPlayer: true } : null;
    const verdicts = [
      list => { if (list.length > 1 && rng() < 0.5) { list[list.length - 1].points += 70; rerankedByRule += 1; } },
      (list, place) => { if (place !== null && rng() < 0.4) { const me = list.find(c => c.isPlayer); if (me) me.points -= 45; } },
    ];
    const fill = (list, need) => {
      let k = 0;
      while (list.length < need && k < 30) { list.push({ name: `Filler ${Math.floor(rng() * 5)}`, points: Math.floor(rng() * 50), isPlayer: false }); k += 1; }
    };
    const ballot = { field, player, playerPoints, fill: rng() < 0.7 ? fill : undefined, verdicts, widerEligible: rng() < 0.8 };
    const out = A.runAwardsNight(award, 2000 + night, ballot);
    nights += 1;
    if (ballot.fill && fieldSize < 8) filled += 1;
    const rivals = out.nominees.filter(c => !c.isPlayer);
    if (new Set(rivals.map(c => c.name)).size !== rivals.length || out.nominees.filter(c => c.isPlayer).length > 1) bad.repeat += 1;
    if (out.nominees.length > award.shortlistSize) bad.size += 1;
    for (let i = 1; i < out.nominees.length; i += 1) if (out.nominees[i].points > out.nominees[i - 1].points) { bad.order += 1; break; }
    const idx = out.nominees.findIndex(c => c.isPlayer);
    if (idx >= 0) {
      onList += 1;
      if (out.playerRank !== idx + 1) bad.place += 1;
    } else if (out.playerRank !== null) {
      widerPlaced += 1;
      const better = ballot.field.filter(n => !n.isPlayer && n.points > playerPoints).length;
      const want = Math.max(award.shortlistSize + 1, better + 1);
      if (!ballot.widerEligible || out.playerRank !== want || want > award.widerSize) bad.wider += 1;
    } else if (ballot.widerEligible) {
      const better = ballot.field.filter(n => !n.isPlayer && n.points > playerPoints).length;
      if (Math.max(award.shortlistSize + 1, better + 1) <= award.widerSize) bad.wider += 1;
    }
    if (out.playerNominated !== (player !== null)) bad.nominated += 1;
  }
  console.log(`   ${nights} nights: ${repeatsOffered} fields offered a repeated name, ${filled} short fields topped up, ${rerankedByRule} rules moved a name, player on the list ${onList}, placed in the wider ranking ${widerPlaced}`);
  check(repeatsOffered > 500 && rerankedByRule > 500 && onList > 500 && widerPlaced > 50, 'the synthetic nights did not exercise the contract (too few repeats, rule moves or placements)');
  check(bad.repeat === 0, `${bad.repeat} shortlists named someone twice`);
  check(bad.size === 0, `${bad.size} shortlists ran past their size`);
  check(bad.order === 0, `${bad.order} nights were not ranked after a rule moved points, so the winner was not the top ranked`);
  check(bad.place === 0, `${bad.place} nights gave the player a place that is not his spot on the list`);
  check(bad.wider === 0, `${bad.wider} nights placed (or failed to place) the player in the wider ranking against the rule`);
  check(bad.nominated === 0, `${bad.nominated} nights said the wrong thing about the player making the ballot`);

  /* Speeches on a plain meter set: no clamps, so every move is visible. */
  const meters = {};
  for (const [id, label] of [['a', 'Alpha'], ['b', 'Beta'], ['c', 'Gamma'], ['d', 'Delta']]) meters[id] = { label, add: (s, x) => { s[id] += x; }, read: s => s[id] };
  const sport = { meters, say: (s, line) => { s.log = [...s.log, line]; } };
  const options = [
    { id: 'sure', emoji: '🎤', label: 'Sure thing', tone: 'gold', effect: [{ meter: 'a', delta: 3 }, { meter: 'b', delta: -2 }], line: () => 'sure' },
    { id: 'coin', emoji: '🐐', label: 'A gamble', tone: 'bold', effect: [{ meter: 'c', delta: 1 }], risk: { chance: 0.35, hit: [{ meter: 'a', delta: -5 }, { meter: 'd', delta: 4 }], miss: [{ meter: 'b', delta: 6 }] }, line: (_s, o) => o },
    { id: 'gated', emoji: '👶', label: 'Gated', tone: 'quiet', available: s => s.ok, effect: [{ meter: 'd', delta: 7 }], line: () => 'gated' },
  ];
  const speechBad = { keys: 0, delta: 0, draws: 0, line: 0 };
  let hits = 0, coins = 0;
  for (let n = 0; n < 3000; n += 1) {
    const opt = options[n % options.length];
    const s = { a: 50 + (n % 7), b: 40, c: 30, d: 20, ok: n % 2 === 0, log: ['before'] };
    const before = { ...s };
    let draws = 0;
    const r = mulberry32(n * 31 + 9);
    const counted = () => { draws += 1; return r(); };
    const line = A.applySpeech(sport, options, s, opt.id, counted);
    let outcome = 'sure';
    if (opt.risk) { coins += 1; outcome = mulberry32(n * 31 + 9)() < opt.risk.chance ? 'hit' : 'miss'; if (outcome === 'hit') hits += 1; }
    const steps = [...opt.effect, ...(outcome === 'hit' ? opt.risk.hit : outcome === 'miss' ? opt.risk.miss : [])];
    const want = {};
    for (const st of steps) want[st.meter] = (want[st.meter] ?? 0) + st.delta;
    const moved = Object.keys(meters).filter(k => s[k] !== before[k]);
    if (moved.sort().join() !== Object.keys(want).sort().join()) speechBad.keys += 1;
    for (const k of Object.keys(want)) if (s[k] - before[k] !== want[k]) speechBad.delta += 1;
    if (draws !== (opt.risk ? 1 : 0)) speechBad.draws += 1;
    if (s.log.length !== 2 || s.log[1] !== line || (opt.risk && line !== outcome)) speechBad.line += 1;
  }
  console.log(`   3,000 speeches: ${coins} gambles, ${hits} came up (${(hits / coins * 100).toFixed(1)}% on a stated 35%)`);
  check(speechBad.keys === 0, `${speechBad.keys} speeches moved a meter their steps do not name, or missed one they do`);
  check(speechBad.delta === 0, `${speechBad.delta} meter moves were not the stated delta`);
  check(speechBad.draws === 0, `${speechBad.draws} speeches drew a number they had no risk for, or drew twice`);
  check(speechBad.line === 0, `${speechBad.line} speeches wrote the wrong line, or not exactly one`);
  check(hits / coins > 0.3 && hits / coins < 0.4, `a stated 35% gamble came up ${(hits / coins * 100).toFixed(1)}% of the time`);
  {
    const s = { a: 1, b: 1, c: 1, d: 1, log: [] };
    let drew = false;
    const out = A.applySpeech(sport, options, s, 'nope', () => { drew = true; return 0; });
    check(out === null && !drew && s.log.length === 0 && s.a === 1, 'a speech id the list does not carry still moved something');
  }
  check(A.availableSpeeches(options, { ok: false }).map(o => o.id).join() === 'sure,coin'
    && A.availableSpeeches(options, { ok: true }).map(o => o.id).join() === 'sure,coin,gated', 'availableSpeeches does not apply the gates');

  /* The settle: what the save keeps for each place, and the night it stages
     carries what the steps moved (a win or a podium only). */
  const settleNight = place => ({ year: 2031, nominees: [], playerRank: place, playerPoints: 0, playerNominated: place !== null && place <= 8 });
  for (const place of [1, 2, 3, 4, 8, 12, null]) {
    const calls = [];
    const s = { a: 10, b: 10, c: 10, d: 10, log: [] };
    const rec = {};
    let staged = null;
    const bound = {
      award: { ...award }, meters,
      winnerSteps: [{ meter: 'a', delta: 9 }], podiumSteps: [{ meter: 'b', delta: 2 }],
      stage: (_s, n) => { staged = n; calls.push('stage'); }, recordPlace: (r, p) => { r.place = p; calls.push('place'); },
      recordWin: r => { r.won = true; calls.push('win'); }, addToCabinet: (_s, e) => calls.push(`cabinet:${e.name}:${e.year}`),
      onPodium: () => calls.push('podium'), say: () => calls.push('say'), copy: {},
    };
    A.settleAwardsNight(bound, s, rec, settleNight(place));
    const want = place === null ? 'stage'
      : place === 1 ? 'place,win,cabinet:Synthetic Cup:2031,stage'
        : place <= 3 ? 'place,podium,stage' : 'place,stage';
    check(calls.join() === want, `settle at place ${place} did ${calls.join()} instead of ${want}`);
    check(s.a === (place === 1 ? 19 : 10) && s.b === (place !== null && place > 1 && place <= 3 ? 12 : 10), `settle at place ${place} moved the wrong meters`);
    check(place === null ? rec.place === undefined : rec.place === place, `settle at place ${place} recorded ${rec.place}`);
    const wantMoved = place === 1 ? 'Alpha +9' : place !== null && place <= 3 ? 'Beta +2' : undefined;
    check(staged?.moved === wantMoved, `settle at place ${place} staged moved ${JSON.stringify(staged?.moved)} instead of ${JSON.stringify(wantMoved)}`);
  }
  /* At a cap the staged night says what landed, not what the step asked for:
     Alpha capped at 15, a +9 win from 10 lands +5, and from 15 lands nothing. */
  const cappedMeters = { ...meters, a: { label: 'Alpha', add: (st, x) => { st.a = Math.min(15, st.a + x); }, read: st => st.a } };
  for (const [from, want] of [[10, 'Alpha +5'], [15, '']]) {
    const s = { a: from, b: 10, c: 10, d: 10, log: [] };
    let staged = null;
    A.settleAwardsNight({
      award: { ...award }, meters: cappedMeters, winnerSteps: [{ meter: 'a', delta: 9 }], podiumSteps: [{ meter: 'b', delta: 2 }],
      stage: (_s, n) => { staged = n; }, recordPlace: () => undefined, recordWin: () => undefined, addToCabinet: () => undefined, say: () => undefined, copy: {},
    }, s, {}, settleNight(1));
    check(staged?.moved === want, `a capped win from ${from} staged moved ${JSON.stringify(staged?.moved)}, it landed ${JSON.stringify(want)}`);
  }
}

/* The en and em dash, by code point, so this file carries neither. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

/* ---------- 3. Soccer's speeches are honest ---------- */
section = 3;
console.log('\n3) Soccer Career speeches: 2,000 draws on a real save');
{
  const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const keep = Math.random;
  Math.random = mulberry32(8341);
  let base;
  try {
    base = soccer.initCareer('Honest Test', 'England', 'ST', '2020-24', stats(72), 72, 2020, soccer.FALLBACK_CLUBS, null, 88);
  } finally {
    Math.random = keep;
  }
  Object.assign(base, { popularity: 50, morale: 50, integrityBonus: 0, rivalryIntensity: 50, socialMediaFollowers: 10, marketValue: 20 });
  const METERS = soccer.SOCCER_BALLON_DOR.meters;
  const ids = Object.keys(METERS);
  const labelRe = new RegExp(`(${ids.map(k => METERS[k].label).join('|')}) ([+-]\\d+(?:\\.\\d+)?)`, 'g');
  const labelToId = Object.fromEntries(ids.map(k => [METERS[k].label, k]));
  let mentions = 0, draws = 0;
  for (const [kind, list] of [['Ballon d\'Or', soccer.SOCCER_BDOR_SPEECHES], ['tournament', soccer.SOCCER_WORLD_CUP_SPEECHES]]) {
    for (const opt of list) {
      const r = mulberry32(opt.id.length * 7919 + 5);
      let hits = 0;
      const bad = { keys: 0, words: 0 };
      for (let n = 0; n < 250; n += 1) {
        const s = { ...base, events: [...base.events], rival: { name: 'Generated Rival', retired: false } };
        const before = { ...s };
        let hit = null;
        const coin = () => { const v = r(); hit = v < opt.risk.chance; return v; };
        /* Round 1023: through speakSoccer, the one way Soccer gives a speech,
           which builds the log line's number from the measured move. */
        const line = soccer.speakSoccer(s, list, opt.id, opt.risk ? coin : () => { throw new Error('drew without a risk'); }).line;
        draws += 1;
        if (hit) hits += 1;
        const steps = [...opt.effect, ...(opt.risk ? (hit ? opt.risk.hit : opt.risk.miss) : [])];
        const want = {};
        for (const st of steps) want[st.meter] = Math.round(((want[st.meter] ?? 0) + st.delta) * 100) / 100;
        const moved = ids.filter(k => s[k] !== before[k]);
        if (moved.sort().join() !== Object.keys(want).sort().join()) bad.keys += 1;
        /* Round 1023: the line's number is measured now, so a speech that
           moved the wrong amount would describe itself truly; away from the
           caps (every meter here sits mid range) each meter must move by
           exactly its steps. */
        else if (moved.some(k => Math.round((s[k] - before[k]) * 100) / 100 !== want[k])) bad.keys += 1;
        for (const m of line.matchAll(labelRe)) {
          mentions += 1;
          const id = labelToId[m[1]];
          const did = Math.round((s[id] - before[id]) * 100) / 100;
          if (did !== Number(m[2])) bad.words += 1;
        }
        if (s.events.length !== before.events.length + 1 || s.events[s.events.length - 1] !== line) bad.words += 1;
      }
      const note = opt.risk ? `, came up ${hits} of 250 on a stated ${Math.round(opt.risk.chance * 100)}%` : '';
      console.log(`   ${kind.padEnd(11)} ${opt.id.padEnd(18)} moves ${[...new Set([...opt.effect, ...(opt.risk ? [...opt.risk.hit, ...opt.risk.miss] : [])].map(x => x.meter))].join(', ')}${note}`);
      check(bad.keys === 0, `${opt.id}: ${bad.keys} of 250 moved a meter it does not name, missed one it does, or moved one by other than its steps`);
      check(bad.words === 0, `${opt.id}: ${bad.words} of 250 printed a number it did not do, or no single log line`);
      if (opt.risk) {
        /* Seeded, so this is the same count every run. 250 draws put one
           standard deviation near 3 points; the band is ten either side. */
        check(hits > 0 && hits < 250, `${opt.id}: the gamble only ever landed one way`);
        check(Math.abs(hits / 250 - opt.risk.chance) < 0.1, `${opt.id}: came up ${hits} of 250 against a stated ${opt.risk.chance}`);
      }
      check(!DASHES.test(`${opt.label} ${opt.line(base, 'hit')} ${opt.line(base, 'miss')}`), `${opt.id}: a dash in the copy`);
    }
  }
  console.log(`   ${draws} speeches, ${mentions} numbers in the lines checked against what the speech did`);
  check(draws === 2000, `ran ${draws} speeches, not 2,000`);
  check(mentions >= 500, 'too few numbers in the lines to prove the words match the moves');
  /* Round 1023: at the caps. The two gambles used to print the number their
     coin asked for ("Popularity +8", "-10", "+10", "-8") whatever landed, so
     at popularity 100 a "+8" moved nothing. Both sides of both gambles, at
     popularity 0, 95 and 100 and rivalry 50 and 95: every number a line prints
     must be what moved, every meter the coin moved must be named, and the
     cases must include ones the cap cut (or this proves nothing). */
  {
    let capCut = 0, capLines = 0;
    const capBad = [];
    for (const list of [soccer.SOCCER_BDOR_SPEECHES, soccer.SOCCER_WORLD_CUP_SPEECHES]) {
      for (const opt of list.filter(o => o.risk)) {
        for (const popularity of [0, 95, 100]) {
          for (const rivalryIntensity of [50, 95]) {
            for (const side of ['hit', 'miss']) {
              const s = { ...base, popularity, rivalryIntensity, events: [...base.events], rival: { name: 'Generated Rival', retired: false } };
              const before = { ...s };
              const line = soccer.speakSoccer(s, list, opt.id, () => (side === 'hit' ? 0 : 0.999)).line;
              capLines += 1;
              const did = id => Math.round((s[id] - before[id]) * 100) / 100;
              for (const st of opt.risk[side]) {
                if (did(st.meter) !== st.delta) capCut += 1;
                const named = new RegExp(`${METERS[st.meter].label} [+-]`).test(line);
                if (did(st.meter) !== 0 && !named) capBad.push(`${opt.id} ${side} at popularity ${popularity}: moved ${st.meter} ${did(st.meter)} and the line does not say so`);
              }
              for (const m of line.matchAll(labelRe)) {
                const id = labelToId[m[1]];
                if (did(id) !== Number(m[2])) capBad.push(`${opt.id} ${side} at popularity ${popularity}, rivalry ${rivalryIntensity}: says ${m[1]} ${m[2]}, moved ${did(id)}`);
              }
              if (s.events[s.events.length - 1] !== line) capBad.push(`${opt.id} ${side}: the log line is not the line returned`);
            }
          }
        }
      }
    }
    console.log(`   at the caps: ${capLines} gamble lines, ${capCut} coin steps cut by a cap, ${capBad.length} lines untrue`);
    check(capCut >= 8, `only ${capCut} coin steps were cut by a cap, so the cap case is not tested`);
    for (const b of capBad.slice(0, 5)) fail(b);
    if (capBad.length > 5) fail(`and ${capBad.length - 5} more`);
  }
  const gate = (s, id) => A.availableSpeeches(soccer.SOCCER_BDOR_SPEECHES, s).some(o => o.id === id);
  const fam = n => ({ ...base.family, children: n });
  check(!gate({ ...base, rival: null, family: fam(0) }, 'thank_rival') && !gate({ ...base, rival: { name: 'R', retired: true }, family: fam(0) }, 'thank_rival')
    && gate({ ...base, rival: { name: 'R', retired: false }, family: fam(0) }, 'thank_rival'), 'the rival speech is not gated on a rival who is still playing');
  check(!gate({ ...base, rival: null, family: fam(0) }, 'family_on_stage') && gate({ ...base, rival: null, family: fam(2) }, 'family_on_stage'), 'the family speech is not gated on having a child');
  check(A.availableSpeeches(soccer.SOCCER_WORLD_CUP_SPEECHES, base).length === 4, 'a tournament winner should always see all four speeches');
}

/* ---------- source helpers ---------- */
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : [];
});

/* ---------- 4. Rival names ---------- */
section = 4;
console.log('\n4) Only the Soccer engine may rank real people');
{
  const files = walk(path.join(ROOT, 'src')).map(f => ({ rel: path.relative(ROOT, f).replaceAll('\\', '/'), text: fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') }));
  if (CONTROL === 'legacyreal') files.push({ rel: 'src/lib/controlCareerSport.ts', text: 'export const X = { award: { rivals: "legacy-real-era-stars" } };\n' });
  const declare = /rivals\s*:\s*["'`]legacy-real-era-stars["'`]/;
  const declaring = files.filter(f => declare.test(stripComments(f.text))).map(f => f.rel);
  console.log(`   ${files.length} source files scanned, declared in: ${declaring.join(', ') || 'none'}`);
  check(declaring.includes('src/lib/soccerCareerEngine.ts'), 'the Soccer engine no longer declares its era stars, so this fence is reading the wrong thing');
  check(declaring.every(f => f === 'src/lib/soccerCareerEngine.ts'), `a sport other than Soccer ranks real people: ${declaring.filter(f => f !== 'src/lib/soccerCareerEngine.ts').join(', ')}`);
}

/* ---------- 5. No second copy ---------- */
section = 5;
console.log('\n5) One awards night: no second copy beside the shared one');
{
  const read = rel => stripComments(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'));
  let engine = read('src/lib/soccerCareerEngine.ts');
  if (CONTROL === 'secondcopy') engine += '\nconst extendedRank = Math.max(11, better + 1);\n';
  const page = read('src/pages/SoccerCareer.tsx');
  let intl = read('src/components/soccer-career/InternationalPanel.tsx');
  /* Round 1023's review: a second spoken speech block beside the shared one. */
  if (CONTROL === 'speechcopy') intl += '\nconst Spoken = ({ speech }) => <div data-spoken-speech={speech.id}>{speech.line}</div>;\n';
  const banned = [
    ['src/lib/soccerCareerEngine.ts', engine, /\bextendedRank\b|\btopNPCs\b|const top10 = /, 'an inline shortlist or wider ranking'],
    ['src/lib/soccerCareerEngine.ts', engine, /case "greatest_ever"|case "call_out_doubters"/, 'a hand written speech switch'],
    ['src/pages/SoccerCareer.tsx', page, /\brankEmoji\b|BALLON D'OR WINNER!/, 'an inline ceremony card'],
    ['src/pages/SoccerCareer.tsx', page, /onSpeech\("for_the_country"\)/, 'hand written speech buttons'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /onSpeech\("for_the_country"\)/, 'hand written speech buttons'],
    /* Round 1023's review: the kept speech's shape, its validator and the
       block that shows it live once, in the shared module and card. */
    ['src/lib/soccerCareerEngine.ts', engine, /interface StagedSpeech|function stagedSpeechOf|narrativeOf\(SOCCER_AWARDS_METERS/, 'its own kept speech shape'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /data-spoken-speech/, 'its own spoken speech block'],
    ['src/pages/SoccerCareer.tsx', page, /data-spoken-speech/, 'its own spoken speech block'],
  ];
  for (const [rel, text, re, what] of banned) check(!re.test(text), `${rel} carries ${what} again`);
  const needed = [
    ['src/lib/soccerCareerEngine.ts', engine, /runAwardsNight</, 'the shared night'],
    ['src/lib/soccerCareerEngine.ts', engine, /settleAwardsNight\(SOCCER_BALLON_DOR/, 'the shared settle'],
    /* Round 1023: Soccer gives every speech through speakSoccer, which runs
       the shared applySpeech and builds the log line from what it measured. */
    ['src/lib/soccerCareerEngine.ts', engine, /applySpeech\(hush, options, s, id, rng\)/, 'the shared speech'],
    ['src/lib/soccerCareerEngine.ts', engine, /speakSoccer\(s, SOCCER_BDOR_SPEECHES, choice\)/, 'the shared Ballon d\'Or speech'],
    ['src/lib/soccerCareerEngine.ts', engine, /speakSoccer\(s, SOCCER_WORLD_CUP_SPEECHES, choice\)/, 'the shared tournament speech'],
    ['src/pages/SoccerCareer.tsx', page, /<AwardsNightCard/, 'the shared ceremony card'],
    ['src/pages/SoccerCareer.tsx', page, /<SpeechChoices[^>]*SOCCER_WORLD_CUP_SPEECHES/, 'the shared speech buttons'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /<SpeechChoices[^>]*SOCCER_WORLD_CUP_SPEECHES/, 'the shared speech buttons'],
    ['src/lib/soccerCareerEngine.ts', engine, /giveSpeechOnce\(SOCCER_AWARDS_METERS, SOCCER_BDOR_SPEECHES,/, 'the shared give once for the Ballon d\'Or speech'],
    ['src/lib/soccerCareerEngine.ts', engine, /giveSpeechOnce\(SOCCER_AWARDS_METERS, SOCCER_WORLD_CUP_SPEECHES,/, 'the shared give once for the tournament speech'],
    ['src/components/soccer-career/InternationalPanel.tsx', intl, /<SpokenSpeech speech=\{given\} \/>/, 'the shared spoken speech block'],
    ['src/pages/SoccerCareer.tsx', page, /<SpokenSpeech speech=\{given\} \/>/, 'the shared spoken speech block'],
  ];
  for (const [rel, text, re, what] of needed) check(re.test(text), `${rel} no longer uses ${what}`);
  console.log(`   ${banned.length} old copies absent, ${needed.length} shared calls present`);
}

/* ---------- 6. The ceremony card tells the truth, and the speech is offered once ---------- */
section = 6;
console.log('\n6) The ceremony card says what the night does, and a win offers the speech once');
{
  const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const keep = Math.random;
  Math.random = mulberry32(8346);
  let base;
  try {
    base = soccer.initCareer('Card Test', 'England', 'ST', '2020-24', stats(72), 72, 2020, soccer.FALLBACK_CLUBS, null, 88);
  } finally {
    Math.random = keep;
  }
  /* Mid values everywhere but popularity, which each case sets: 50 (no clamp
     can hide a step, so the night must do exactly its steps), 95 and 100. A
     real winner sits near the cap: on the replay's 30 won ceremonies the
     review measured popularity before the win at 100 eleven times and 95 or
     more on 20, and the "+20" the card used to print landed whole on 5. */
  Object.assign(base, { popularity: 50, morale: 50, integrityBonus: 0, rivalryIntensity: 50, socialMediaFollowers: 10, marketValue: 20, rival: null });
  const SPORT = soccer.SOCCER_BALLON_DOR;
  const METERS = SPORT.meters;
  const ids = Object.keys(METERS);
  const labels = new Set(ids.map(k => METERS[k].label));
  const labelToId = Object.fromEntries(ids.map(k => [METERS[k].label, k]));
  /* Every "Word +N", "Word +€NM", "Word +NM" or "Word +Nk" a line prints,
     whatever the word, with the unit it printed and its value in the unit the
     save keeps ("+500k" is 0.5 of a million). Round 1023's review: the parser
     used to drop the unit, so "Followers +3" passed for a move of three
     MILLION followers. */
  const claims = text => [...text.matchAll(/([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*) ([+-])(€?)(\d+(?:\.\d+)?)([Mk]?)/g)]
    .map(m => ({ label: m[1], said: `${m[2]}${m[3]}${m[4]}${m[5]}`, unit: m[3] + m[5],
      delta: Math.round(Number(m[2] + m[4]) * (m[5] === 'k' ? 0.001 : 1) * 1000) / 1000 }));
  /* The units a card may print each meter in, read from how the save keeps it
     (not from the engine's own show(), which is what this checks): market
     value and followers are counted in millions (formatFollowers), the rest
     are plain points. */
  const UNITS = { marketValue: ['€M'], socialMediaFollowers: ['M', 'k'] };
  const unitsOf = id => UNITS[id] ?? [''];
  /* What changed on every meter between two saves, unmoved ones left out. */
  const movedBetween = (before, after) => Object.fromEntries(ids
    .map(k => [k, Math.round(((after[k] ?? 0) - (before[k] ?? 0)) * 100) / 100]).filter(([, v]) => v !== 0));
  /* Every number `text` prints must be what that meter really moved, and
     every meter that moved must be named in `named` (the text by default). */
  const lies = (text, did, named = text) => {
    const bad = [];
    for (const c of claims(text)) {
      if (!labels.has(c.label)) bad.push(`says "${c.label} ${c.delta}" and there is no such meter`);
      else if (!unitsOf(labelToId[c.label]).includes(c.unit)) bad.push(`says "${c.label} ${c.said}", and ${c.label} is counted in ${unitsOf(labelToId[c.label]).map(u => u || 'plain points').join(' or ')}`);
      else if (did[labelToId[c.label]] !== c.delta) bad.push(`says ${c.label} ${c.delta}, it moved ${did[labelToId[c.label]] ?? 0}`);
    }
    const namedClaims = claims(named);
    for (const k of Object.keys(did)) if (!namedClaims.some(c => c.label === METERS[k].label)) bad.push(`moves ${METERS[k].label} ${did[k]} and never says so`);
    return bad;
  };
  const YEAR = 2031;
  const nightAt = rank => ({
    year: YEAR, playerRank: rank, playerPoints: 90, playerNominated: true,
    nominees: Array.from({ length: 10 }, (_, i) => ({
      name: i + 1 === rank ? 'Card Test' : `Generated ${i}`, points: 100 - i, isPlayer: i + 1 === rank,
      nationality: 'England', position: 'ST', club: 'Generated FC', goals: 20, trophies: [],
    })),
  });
  /* The real settle on the base save at a given popularity: the save after,
     the night it staged, and what really moved. */
  const settleAt = (rank, popularity) => {
    const s = { ...base, popularity, events: [...base.events], awards: [...base.awards] };
    const before = { ...s };
    A.settleAwardsNight(SPORT, s, { year: YEAR, ballonDor: false, ballonDorRank: null }, nightAt(rank));
    return { s, night: s.pendingBallonDor, did: movedBetween(before, s) };
  };
  const lineOf = (rank, moved) => rank === 1 ? SPORT.copy.winnerLine(moved) : SPORT.copy.podiumLine(rank, moved);
  let capped = 0;
  for (const popularity of [50, 95, 100]) {
    for (const [what, rank] of [['winner', 1], ['2nd place', 2], ['3rd place', 3]]) {
      const { night, did } = settleAt(rank, popularity);
      const line = lineOf(rank, night?.moved);
      const asked = Object.fromEntries((rank === 1 ? SPORT.winnerSteps : SPORT.podiumSteps).map(st => [st.meter, st.delta]));
      if (popularity !== 50 && (did.popularity ?? 0) !== asked.popularity) capped += 1;
      console.log(`   ${what.padEnd(9)} at popularity ${String(popularity).padEnd(3)} says ${claims(line).map(c => `${c.label} ${c.delta}`).join(', ') || 'nothing'}; the night moved ${Object.entries(did).map(([k, v]) => `${METERS[k].label} ${v}`).join(', ') || 'nothing'}`);
      check(typeof night?.moved === 'string', `the ${what} night at popularity ${popularity} carries no measured move`);
      for (const b of lies(line, did)) fail(`the ${what} line at popularity ${popularity} ${b}`);
      if (popularity === 50) {
        /* Away from the caps the night does exactly its steps, and says so. */
        check(JSON.stringify(did) === JSON.stringify(Object.fromEntries(ids.filter(k => asked[k] !== undefined).map(k => [k, asked[k]]))),
          `the ${what} night at popularity 50 moved ${JSON.stringify(did)}, its steps are ${JSON.stringify(asked)}`);
        check(claims(line).length > 0, `the ${what} line names no effect at all`);
      }
      check(!DASHES.test(line), `a dash in the ${what} line`);
    }
  }
  /* The cap cases are cap cases: the winner at 95 and all three at 100. */
  check(capped === 4, `${capped} of the 95 and 100 cases were cut by the cap, 4 should be, so they are not testing what they say`);
  check(claims(SPORT.copy.winnerLine(undefined)).length === 0 && claims(SPORT.copy.podiumLine(2, undefined)).length === 0,
    'a night staged before the measure (an old save) still prints a number nobody measured');

  /* The card on screen carries those lines, and a won night offers the speech. */
  const onCeremony = (rank, lastYear = YEAR, extra = {}, popularity = 50) => {
    const { s } = settleAt(rank, popularity);
    return {
      ...s, phase: 'ballon_dor',
      seasons: [...base.seasons, { ...(base.seasons[base.seasons.length - 1] ?? {}), year: lastYear, ballonDor: rank === 1, ballonDorRank: rank }],
      family: { ...base.family, children: 0 }, ...extra,
    };
  };
  const strip = html => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const offered = s => A.availableSpeeches(soccer.SOCCER_BDOR_SPEECHES, s);
  const won = onCeremony(1);
  for (const waiting of [won, onCeremony(2)]) {
    const pending = strip(B.cards.bdorPending(waiting.pendingBallonDor, waiting));
    check(pending.includes('The ranked list is coming in') && !pending.includes(SPORT.copy.winnerTitle) && !/You finished|golden ball is yours/.test(pending), 'the pending ranked list leaks the saved outcome');
    check(soccer.SOCCER_BDOR_SPEECHES.every(o => !pending.includes(o.label)) && !/Continue/.test(pending), 'a speech or Continue appears before the ranked list');
  }
  const wonText = strip(B.cards.bdor(won.pendingBallonDor, won));
  check(wonText.includes(SPORT.copy.winnerLine(won.pendingBallonDor.moved)), 'the winner card does not show the winner line');
  const atCap = onCeremony(1, YEAR, {}, 100);
  const atCapText = strip(B.cards.bdor(atCap.pendingBallonDor, atCap));
  check(atCapText.includes(SPORT.copy.winnerLine(atCap.pendingBallonDor.moved)) && !/Popularity [+-]\d/.test(atCapText),
    'the card of a winner already at popularity 100 still promises a popularity move');
  check(soccer.bdorSpeechOpen(won), 'a won ceremony on the season just played does not offer the speech');
  check(offered(won).length === 2 && offered(won).every(o => wonText.includes(o.label)), 'the won card does not show the speeches this save may give');
  check(!wonText.includes(soccer.SOCCER_BDOR_SPEECHES.find(o => o.id === 'thank_rival').label), 'the won card offers the rival speech with no rival');
  check(!/Continue/.test(wonText), 'the won card lets the speech be skipped past before it is given');
  const podium = onCeremony(2);
  const podiumText = strip(B.cards.bdor(podium.pendingBallonDor, podium));
  check(podiumText.includes(SPORT.copy.podiumLine(2, podium.pendingBallonDor.moved)), 'the podium card does not show the podium line');
  check(!soccer.bdorSpeechOpen(podium) && soccer.SOCCER_BDOR_SPEECHES.every(o => !podiumText.includes(o.label)) && /Continue/.test(podiumText), 'a lost ceremony offers a speech');

  /* One pick, applied once, then the card shows what it did. */
  const after = soccer.giveBdorSpeech(won, 'tears');
  const tears = soccer.SOCCER_BDOR_SPEECHES.find(o => o.id === 'tears');
  const want = Object.fromEntries(tears.effect.map(st => [st.meter, st.delta]));
  const movedOk = ids.every(k => Math.round(((after[k] ?? 0) - (won[k] ?? 0)) * 100) / 100 === (want[k] ?? 0));
  check(movedOk, 'the speech given on the card did not move exactly its own steps');
  check(after.events.length === won.events.length + 1 && after.pendingBallonDor?.speech?.id === 'tears', 'the speech was not written once on the night and the log');
  check(after.phase === 'ballon_dor', 'giving the speech left the ceremony before the card could show it');
  const again = soccer.giveBdorSpeech(after, 'greatest_ever');
  check(again === after && !soccer.bdorSpeechOpen(after), 'a second speech can be given on the same night');
  const afterText = strip(B.cards.bdor(after.pendingBallonDor, after));
  check(afterText.includes(after.pendingBallonDor.speech.line) && afterText.includes(after.pendingBallonDor.speech.moved) && /Continue/.test(afterText)
    && soccer.SOCCER_BDOR_SPEECHES.every(o => !afterText.includes(o.label)), 'after the speech the card does not show what it did with Continue');
  console.log(`   given: ${after.pendingBallonDor.speech.moved}`);
  const next = soccer.dismissBallonDor(after, soccer.FALLBACK_CLUBS);
  check(next.pendingBallonDor === null && next.phase !== 'ballon_dor', 'Continue after the speech does not leave the ceremony');

  /* Old saves. A night that is not the season just played (a stale ceremony an
     old save still holds) offers nothing; a save from before this round on a
     won ceremony (no speech field) is the current night and is offered it. */
  const stale = onCeremony(1, YEAR - 1);
  check(!soccer.bdorSpeechOpen(stale) && soccer.giveBdorSpeech(stale, 'tears') === stale, 'a stale ceremony offers a speech for a past win');
  const offPhase = { ...won, phase: 'playing' };
  check(!soccer.bdorSpeechOpen(offPhase) && soccer.giveBdorSpeech(offPhase, 'tears') === offPhase, 'a speech can be given off the ceremony screen');
  const reloaded = JSON.parse(JSON.stringify(after));
  check(!soccer.bdorSpeechOpen(reloaded) && strip(B.cards.bdor(reloaded.pendingBallonDor, reloaded)).includes(after.pendingBallonDor.speech.line), 'a save written on the ceremony after the speech does not load as it was');

  /* On the replay's real ceremonies: offered on every win, never otherwise;
     the measured move on every win and podium, never otherwise; and the cap
     cuts real wins short, which is the case the card has to get right. */
  console.log(`   replay: ${liveNights.won} won ceremonies, speech offered on ${liveNights.offered}, offered on a lost one ${liveNights.wrong} times`);
  console.log(`   replay: ${liveNights.measured} win and podium nights carry their measured move (${liveNights.measuredWrong} nights wrong), ${liveNights.winsCut} of ${liveNights.won} wins cut short of Popularity +20 by the cap`);
  check(liveNights.won >= 20, 'too few won ceremonies in the replay to prove the offer');
  check(liveNights.offered === liveNights.won && liveNights.wrong === 0, 'the speech is not offered on exactly the won ceremonies');
  check(liveNights.measuredWrong === 0 && liveNights.measured >= liveNights.won, 'a real night carries a measured move it should not, or lacks one it should');
  check(liveNights.winsCut > 0, 'no real win was cut short by the popularity cap, so the replay cannot tell a measured night from one that prints its steps');

  /* Every speech each real winner may give, on a copy of his save on the
     ceremony (the replay's own draws untouched: these draw from their own
     seed). What the card shows after it, the line and the moved line, must
     name only what really moved; the log line keeps its own number, and on a
     capped winner that number is often not what happened, which is exactly
     why the card does not show it. */
  let given = 0, cut = 0, logLies = 0, coinCut = 0;
  const speechLies = [];
  liveNights.wins.forEach((real, k) => {
    for (const opt of A.availableSpeeches(soccer.SOCCER_BDOR_SPEECHES, real)) {
      const keepRandom = Math.random;
      Math.random = mulberry32(834000 + k * 31 + opt.id.length);
      let out;
      try { out = soccer.giveBdorSpeech(JSON.parse(JSON.stringify(real)), opt.id); } finally { Math.random = keepRandom; }
      given += 1;
      const sp = out.pendingBallonDor?.speech;
      if (!sp) { speechLies.push(`${opt.id} on real win ${k} was not given`); continue; }
      const did = movedBetween(real, out);
      const logged = out.events[out.events.length - 1];
      /* Round 1023: the log line is the option's words plus what the coin
         measurably moved, so it starts with the words. */
      const outcome = !opt.risk ? 'sure' : logged.startsWith(opt.line(out, 'hit')) ? 'hit' : 'miss';
      const asked = {};
      for (const st of [...opt.effect, ...(opt.risk ? opt.risk[outcome] : [])]) asked[st.meter] = (asked[st.meter] ?? 0) + st.delta;
      if (Object.keys(asked).some(m => (did[m] ?? 0) !== asked[m])) {
        cut += 1;
        /* the number the line used to print, the coin's step, would be untrue here */
        if (opt.risk && opt.risk[outcome].some(st => (did[st.meter] ?? 0) !== st.delta)) coinCut += 1;
      }
      if (claims(logged).some(c => did[labelToId[c.label]] !== c.delta)) logLies += 1;
      for (const b of lies(`${sp.line} ${sp.moved}`, did, sp.moved)) speechLies.push(`${opt.id} on real win ${k}: the card ${b}`);
      /* Round 1023: the log line's number is true now, but the card keeps
         its words and its numbers apart: the line is words, the moved line
         beside it carries every number once. */
      if (claims(sp.line).length) speechLies.push(`${opt.id} on real win ${k}: the card's line prints a number beside the moved line`);
      const shown = strip(B.cards.bdor(out.pendingBallonDor, out));
      if (!shown.includes(sp.line) || !shown.includes(sp.moved)) speechLies.push(`${opt.id} on real win ${k}: the card does not show the line and what it moved`);
    }
  });
  console.log(`   real winners: ${given} speeches given, ${cut} cut short by a cap (${coinCut} of them a gamble's coin step), the log line's own number untrue on ${logLies}; the card untrue on ${speechLies.length}`);
  check(given >= 2 * liveNights.won, `only ${given} speeches given on ${liveNights.won} real wins`);
  check(cut > 0, 'no real winner\'s speech was cut by a cap, so this cannot tell a measured card from one that prints the steps');
  /* Round 1023: the log line's number is built from the measured move now,
     so it is true on every real winner, including the ones whose coin step
     the cap cut (Round 834's review measured 18 untrue before). */
  check(coinCut > 0, 'no real gamble was cut by a cap, so this cannot tell a measured log line from one that prints the coin\'s step');
  check(logLies === 0, `the log line prints a number the speech did not do on ${logLies} real winners`);
  for (const b of speechLies.slice(0, 5)) fail(b);
  if (speechLies.length > 5) fail(`and ${speechLies.length - 5} more`);

  /* ---------- 7. The tournament speech stays on the card (Round 1023) ----------
     Inside section 6's block for its helpers. On every real won tournament the
     replay reaches, every speech is given on a copy of the save with the card's
     own call (giveWorldCupSpeech): the career stays on the tournament screen,
     the speech is kept on the tournament once, what the card shows after it
     names only what really moved, a second speech does nothing, the card then
     offers Continue and no speech, a reload shows the same, and Continue
     leaves. Then a lost tournament and a pre Round 124 World Cup save. */
  section = 7;
  console.log('\n7) A won tournament: the speech is given on the card, once, and the card shows what it did');
  const WC = soccer.SOCCER_WORLD_CUP_SPEECHES;
  let wcGiven = 0, wcCut = 0, wcFollowers = 0;
  const wcBad = [];
  liveTournaments.forEach((real, k) => {
    if (!soccer.worldCupSpeechOpen(real)) { wcBad.push(`real won tournament ${k} offers no speech`); return; }
    const before = strip(B.cards.tournament(real.pendingTournament));
    if (!WC.every(o => before.includes(o.label)) || /Continue/.test(before)) wcBad.push(`real won tournament ${k}: the card does not offer the four speeches in place of Continue`);
    for (const opt of WC) {
      const keepRandom = Math.random;
      Math.random = mulberry32(1023000 + k * 37 + opt.id.length);
      let out;
      try { out = soccer.giveWorldCupSpeech(JSON.parse(JSON.stringify(real)), opt.id); } finally { Math.random = keepRandom; }
      wcGiven += 1;
      const sp = out.pendingTournament?.speech;
      const tag = `${opt.id} on real won tournament ${k}`;
      if (out.phase !== 'world_cup' || !out.pendingTournament) { wcBad.push(`${tag}: the career left the tournament screen`); continue; }
      if (!sp || sp.id !== opt.id) { wcBad.push(`${tag}: the speech is not kept on the tournament`); continue; }
      if (out.events.length !== real.events.length + 1) wcBad.push(`${tag}: wrote ${out.events.length - real.events.length} log lines`);
      const did = movedBetween(real, out);
      const asked = {};
      const logged = out.events[out.events.length - 1];
      const outcome = !opt.risk ? 'sure' : logged.startsWith(opt.line(out, 'hit')) ? 'hit' : 'miss';
      for (const st of [...opt.effect, ...(opt.risk ? opt.risk[outcome] : [])]) asked[st.meter] = (asked[st.meter] ?? 0) + st.delta;
      if (Object.keys(asked).some(m => (did[m] ?? 0) !== asked[m])) wcCut += 1;
      for (const b of lies(`${sp.line} ${sp.moved}`, did, sp.moved)) wcBad.push(`${tag}: the card ${b}`);
      if (claims(sp.moved).some(c => c.label === 'Followers')) wcFollowers += 1;
      if (claims(sp.line).length) wcBad.push(`${tag}: the card's line prints a number beside the moved line`);
      for (const b of lies(logged, did, logged).filter(x => !x.includes('never says so'))) wcBad.push(`${tag}: the log line ${b}`);
      if (soccer.worldCupSpeechOpen(out)) wcBad.push(`${tag}: still offers a speech after one`);
      const other = WC.find(o => o.id !== opt.id).id;
      if (soccer.giveWorldCupSpeech(out, other) !== out) wcBad.push(`${tag}: a second speech was given`);
      const shown = strip(B.cards.tournament(out.pendingTournament));
      if (!shown.includes(sp.line) || !shown.includes(sp.moved) || !/Continue/.test(shown) || WC.some(o => shown.includes(o.label))) {
        wcBad.push(`${tag}: the card does not show the line and what it moved with Continue and no speech left`);
      }
      const reloaded = JSON.parse(JSON.stringify(out));
      if (soccer.worldCupSpeechOpen(reloaded) || !strip(B.cards.tournament(reloaded.pendingTournament)).includes(sp.moved)) wcBad.push(`${tag}: the save does not load as it was`);
      const next = soccer.dismissWorldCup(out, soccer.FALLBACK_CLUBS);
      if (next.pendingTournament || next.phase === 'world_cup' || next.popularity !== out.popularity) wcBad.push(`${tag}: Continue does not leave the tournament as it was`);
    }
  });
  console.log(`   ${liveTournaments.length} real won tournaments, ${wcGiven} speeches given on the card, ${wcCut} cut short by a cap, ${wcFollowers} naming a follower move; ${wcBad.length} problems`);
  check(liveTournaments.length >= 10, `only ${liveTournaments.length} real won tournaments in the replay`);
  check(wcGiven === 4 * liveTournaments.length, 'not every speech was given on every real won tournament');
  check(wcCut > 0, 'no real tournament speech was cut by a cap, so this cannot tell a measured card from one that prints the steps');
  check(wcFollowers > 0, 'no card named a follower move, so the unit check never ran');
  for (const b of wcBad.slice(0, 5)) fail(b);
  if (wcBad.length > 5) fail(`and ${wcBad.length - 5} more`);
  if (liveTournaments.length) {
    const real = liveTournaments[0];
    const lost = { ...real, pendingTournament: { ...real.pendingTournament, myResult: 'Runner-up' } };
    check(!soccer.worldCupSpeechOpen(lost) && soccer.giveWorldCupSpeech(lost, 'quiet_lap') === lost, 'a lost tournament offers a speech');
    const offScreen = { ...real, phase: 'playing' };
    check(!soccer.worldCupSpeechOpen(offScreen) && soccer.giveWorldCupSpeech(offScreen, 'quiet_lap') === offScreen, 'a speech can be given off the tournament screen');
    const t = real.pendingTournament;
    const legacy = { ...real, pendingTournament: null, pendingWorldCup: { year: t.year, nation: t.nation, matches: [], playerApps: 7, playerGoals: 4, playerAssists: 2, playerAvgRating: 7.9, result: 'Winner', bestPlayer: false } };
    const legacyOut = soccer.giveWorldCupSpeech(legacy, 'quiet_lap');
    const legacyText = legacyOut.pendingWorldCup ? strip(B.cards.worldCup(legacyOut.pendingWorldCup, legacyOut)) : '';
    check(legacyOut.phase === 'world_cup' && legacyOut.pendingWorldCup?.speech?.id === 'quiet_lap' && soccer.giveWorldCupSpeech(legacyOut, 'tears') === legacyOut
      && legacyText.includes(legacyOut.pendingWorldCup.speech.moved) && /Continue/.test(legacyText) && WC.every(o => !legacyText.includes(o.label)),
      'a pre Round 124 World Cup save does not keep its speech on the card the same way');
  }
}

console.log('');
proof.sourceAfter = sourceHashes();
proof.sourceHeld = JSON.stringify(proof.sourceBefore) === JSON.stringify(proof.sourceAfter);
check(proof.sourceHeld, 'historical replays and copied controls leave every authored source byte unchanged');
if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  console.log(`CONTROL ${CONTROL}: section ${target} ${failedSections.has(target) ? 'FIRED' : 'DID NOT FIRE'} (red sections: ${[...failedSections].join(', ') || 'none'})`);
  if (!failedSections.has(target)) failures += 1;
  proof.controlTarget = target;
  proof.controlFired = failedSections.has(target);
}
proof.failedSections = [...failedSections].sort((a, b) => a - b);
proof.checks = checks;
proof.failures = failures;
proof.status = failures === 0 ? 'passed' : 'failed';
writeProof('report.json', proof);
console.log(failures === 0 ? `simCareerAwardsNight: ALL ${checks} CHECKS PASSED` : `simCareerAwardsNight: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
