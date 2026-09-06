/**
 * Round 473 harness: the life sim half of Soccer Career, measured.
 *
 * His list (docs/TWEAKS-2026-08-28.md) asks for a life lived in public:
 * badges for career peaks, critics, headlines at every step. Round 473 shipped
 * the badge case on the Round 469 shared evaluator and one generated columnist
 * who follows a career from the day it turns pro. Neither of those is a thing
 * tsc can check, and both are exactly the kind of thing that can look finished
 * and be dead: a badge nobody can earn is dead words in a case, and a critic
 * who says the same thing whatever you do is wallpaper.
 *
 * So this measures OUTCOMES over careers driven through the real engine:
 *
 *   1  Careers driven. Three cohorts, so the peaks a loyal or an elite career
 *      reaches are actually reachable here.
 *   2  Every badge is earned by somebody, and almost none of them by
 *      everybody, because a peak everybody has is a participation sticker.
 *   3  The badges are honest: six of the tests are recomputed here from the
 *      raw save and compared against the module's verdict.
 *   4  Nothing grows past its ceiling. Checked at every season boundary of
 *      every career, not at the end.
 *   5  The critic has more than one opinion, and his opinion tracks the
 *      football: the seasons he backs really do rate higher than the seasons
 *      he writes off, by a measured margin.
 *   6  What you do about him is a choice: the same seasons replayed under
 *      each of the four answers land in measurably different places, and none
 *      of the three options is free.
 *   7  His clause follows the Round 319 law: a keeper is never written about
 *      in goals, a centre back is never asked for them.
 *   8  The column runs every season, which is the "at every step" half.
 *   9  He stores nothing, and an old save's lifestyle band migrates.
 *   10 The branding money you build yourself is still there after the season
 *      roll that used to wipe it, and no catalog adds money straight to the
 *      field that gets recomputed.
 *
 * NEGATIVE CONTROLS. Each one puts a real defect back and names the section it
 * must break. A control that changed nothing refuses to run.
 *   SIM_CAREER_LIFE_CONTROL=billion      the money badge back at a billion,
 *                                        the number this engine cannot reach:
 *                                        section 2 must fail.
 *   SIM_CAREER_LIFE_CONTROL=flatcritic   one stance for everybody, the shape a
 *                                        critic has when he is wallpaper:
 *                                        section 5 must fail.
 *   SIM_CAREER_LIFE_CONTROL=blindclause  every position written about in
 *                                        goals, the Round 319 bug: section 7
 *                                        must fail.
 *
 * Run: node scripts/simCareerLife.mjs [careers]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const CONTROL = process.env.SIM_CAREER_LIFE_CONTROL || '';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 1000) / 10}%`);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r2 = v => Math.round(v * 100) / 100;

/* ─── the controls ───────────────────────────────────────────────────────── */

const CONTROLS = {
  /* The needle names the whole soccer row on purpose. The first draft of this
     control was just "test: f => f.wealth >= 100 }", which is also the NFL
     row four hundred lines above it, so the rewrite landed on the wrong sport
     and the harness stayed green with the control on. The uniqueness check
     below is what turns that into a refusal instead of a false pass. */
  billion: {
    file: 'src/lib/careerBadges.ts',
    from: "label: 'A hundred million', blurb: 'A hundred million to your name, everything added up.', test: f => f.wealth >= 100 }",
    to: "label: 'A hundred million', blurb: 'A hundred million to your name, everything added up.', test: f => f.wealth >= 1000 }",
    note: 'the top money badge is back at a billion, which 120 seeded careers never reached',
    breaks: 2,
  },
  flatcritic: {
    file: 'src/lib/careerCritic.ts',
    from: "  if (score >= 68) return 'backing';",
    to: "  if (score >= -1) return 'watching';",
    note: 'the critic has one opinion for everybody, which is what wallpaper looks like',
    breaks: 5,
  },
  blindclause: {
    file: 'src/lib/soccerCareerCritic.ts',
    from: '  if (GK(pos)) return `${s.cleanSheets ?? 0} clean sheets in ${games}`;',
    to: '  if (GK(pos)) return `${s.goals ?? 0} goals and ${s.assists ?? 0} assists in ${games}`;',
    note: 'the column asks a goalkeeper for goals again, the Round 319 bug',
    breaks: 7,
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_CAREER_LIFE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* Absolute paths for the three modules the assertions read. A control writes a
   rewritten copy into the temp directory and points its path here; every other
   path stays the real file, so with no control this bundles the real modules. */
const LIB = {
  badges: `${ROOT_URL}/src/lib/careerBadges.ts`,
  critic: `${ROOT_URL}/src/lib/careerCritic.ts`,
  soccerCritic: `${ROOT_URL}/src/lib/soccerCareerCritic.ts`,
};

if (CONTROL) {
  const c = CONTROLS[CONTROL];
  /* CRLF normalised before matching, because the desktop clone writes these
     files with CRLF and a needle spelt with bare newlines would never match. */
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replace(/\r\n/g, '\n');
  const hits = src.split(c.from).length - 1;
  if (hits === 0) {
    console.error(`control cannot run: ${c.file} is not in the shape this control rewrites`);
    process.exit(1);
  }
  if (hits > 1) {
    console.error(`control cannot run: ${c.file} contains that line ${hits} times, so the rewrite would land on whichever came first`);
    process.exit(1);
  }
  const rewritten = src.replace(c.from, c.to);
  if (rewritten === src) { console.error('control cannot run: the rewrite changed nothing'); process.exit(1); }
  const key = CONTROL === 'billion' ? 'badges' : CONTROL === 'flatcritic' ? 'critic' : 'soccerCritic';
  const out = `${TMP}/r473.${key}.control.ts`;
  /* The copy sits in the temp directory, so any relative runtime import in it
     is repointed at the real module beside the original. */
  fs.writeFileSync(out, rewritten.replace('from "./careerCritic"', `from "${LIB.critic}"`));
  LIB[key] = out;
  /* And when the critic core is the one rewritten, the soccer binding has to
     be pointed at the rewritten core rather than the real one, or the control
     would be bundled twice and only the unused copy would be defective. */
  if (key === 'critic') {
    const bind = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerCritic.ts'), 'utf8').replace(/\r\n/g, '\n');
    const rebound = bind.replace('from "./careerCritic"', `from "${out}"`);
    if (rebound === bind) { console.error('control cannot run: soccerCareerCritic no longer imports ./careerCritic'); process.exit(1); }
    const bindOut = `${TMP}/r473.soccerCritic.rebound.ts`;
    fs.writeFileSync(bindOut, rebound);
    LIB.soccerCritic = bindOut;
  }
  console.log(`NEGATIVE CONTROL ON: ${c.note} (section ${c.breaks} must fail)`);
}

/* ─── bundle ─────────────────────────────────────────────────────────────── */

const ENTRY = `${TMP}/r473.entry.mjs`;
const BUNDLE = `${TMP}/r473.bundle.mjs`;
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
  clear: () => store.clear(),
};
export const engine = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
export const facts = await import('${ROOT_URL}/src/lib/soccerCareerBadges.ts');
export const badges = await import('${LIB.badges}');
export const critic = await import('${LIB.critic}');
export const scritic = await import('${LIB.soccerCritic}');
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error --alias:@=${ROOT_URL}/src`, { stdio: 'inherit' });
const { engine, facts, badges, critic, scritic } = await import(pathToFileURL(BUNDLE).href);

const {
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, dismissBallonDor, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyBdorSpeech, applyWorldCupSpeech,
  acceptRetirementSuggestion, stayAtClub, signExtension, applyRehabChoice, applySocialMediaAction,
  FALLBACK_CLUBS, effectivePotential, repairCareer,
} = engine;
const { soccerBadgeFacts } = facts;
const { SOCCER_BADGES, earnedBadges } = badges;
const { criticScore, criticStance } = critic;
const { seasonClause, playedSeasons, soccerCriticName } = scritic;

/* ─── 1. drive the careers ───────────────────────────────────────────────── */

/* Default and floor both set from measured rarity, not from feel. The rarest
   badge in the case turns up in about 7% of careers, so at the default 100
   (260 careers driven) the chance of it never appearing by luck is around one
   in two hundred million, and section 2 is a rule rather than a coin toss. At
   the floor of 40 it is about one in two thousand, which is fine for a run by
   hand and is why the default is not the floor. */
const N = Math.max(40, Number(process.argv[2] || 100));
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const clubs = FALLBACK_CLUBS;
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

let crashes = 0;
let ceilingBreaks = 0;
let seasonSteps = 0;
let criticEventsSeen = 0;
const criticChoiceTaken = [0, 0, 0];
let bootEventsSeen = 0;
const bootChoiceTaken = [0, 0, 0];
let papersSeen = 0;
let papersWithColumn = 0;
const careers = [];

function drive(seed, mode) {
  const nat = NATIONS[seed % NATIONS.length];
  const pos = POSITIONS[seed % POSITIONS.length];
  const startOvr = mode === 'elite' ? 68 : 40 + (seed % 30);
  let s = initCareer(`Sim ${seed}`, nat, pos, '2020s', stats(startOvr), startOvr, 2020, clubs, null,
    mode === 'elite' ? 99 : undefined);
  const name = soccerCriticName(s);
  let guard = 0;
  /* A loyal career never leaves, so the one club badge is reachable here; an
     ordinary one takes whatever is offered, which is how most saves go. */
  const loyal = mode === 'loyal';
  const preferHome = offers => {
    if (!offers || !offers.length) return null;
    if (loyal) {
      const same = offers.find(o => !o.isLoan && o.club.name === s.currentClub);
      if (same) return same;
      const home = offers.find(o => !o.isLoan && o.isHomegrown);
      if (home) return home;
      const anyPerm = offers.find(o => !o.isLoan);
      if (anyPerm) return anyPerm;
    }
    return offers.find(o => o.isHomegrown) || offers[0];
  };

  while (!s.retired && guard++ < 400) {
    switch (s.phase) {
      case 'youth': s = advanceYouthYear(s, clubs); break;
      case 'contract_offer': {
        const pickOffer = preferHome(s.pendingOffers);
        if (!pickOffer) { s.phase = 'playing'; break; }
        s = acceptOffer(s, pickOffer);
        break;
      }
      case 'playing': s = advanceProSeason(s, clubs); break;
      case 'newspaper': {
        const news = s.pendingNews || [];
        if (news.length) {
          papersSeen += 1;
          const nameNow = soccerCriticName(s);
          if (news.some(a => (a.body || '').includes(nameNow) || (a.body || '').includes(name))) papersWithColumn += 1;
          else if (papersSeen - papersWithColumn <= 2) {
            console.error(`   paper with no column (${nameNow} / ${name}, ${playedSeasons(s).length} playing seasons): ${news.map(a => a.headline).join(' | ')}`);
          }
        }
        s = dismissNewspaper(s);
        break;
      }
      case 'season_summary': {
        seasonSteps += 1;
        if (s.overall > effectivePotential(s)) ceilingBreaks += 1;
        s = dismissSummary(s, clubs);
        break;
      }
      case 'rehab_choice': s = applyRehabChoice(s, seed % 3); break;
      case 'random_events': {
        const ev = s.pendingEvents && s.pendingEvents[0];
        if (!ev) { s.pendingEvents = []; s.phase = 'playing'; break; }
        let idx = seed % 3 === 0 ? 0 : Math.min(ev.choices.length - 1, 1);
        if (ev.id === 500) {
          criticEventsSeen += 1;
          idx = seed % 3;
          criticChoiceTaken[idx] += 1;
        }
        if (ev.id === 501) {
          bootEventsSeen += 1;
          idx = seed % 3;
          bootChoiceTaken[idx] += 1;
        }
        s = applyEventChoice(s, idx, clubs);
        break;
      }
      case 'moral_dilemma': s = dismissMoralDilemma(s, clubs); break;
      case 'social_media_action': {
        /* Somebody has to press the follower buttons or the branding badges
           could never be reached here. Not every season though: pressing the
           viral button nine years running is not what a save looks like, and
           it inflated followers far past what the engine hands a player who
           just plays. */
        const post = !s.socialMediaActionUsedThisSeason && s.seasons.length % 3 === 0;
        s = post ? applySocialMediaAction(s, seed % 2 ? 'viral_celebration' : 'training_video') : dismissSocialMediaPhase(s, clubs);
        if (s.phase === 'social_media_action') s = dismissSocialMediaPhase(s, clubs);
        break;
      }
      case 'red_card_appeal_result': s = dismissAppealResult(s, clubs); break;
      case 'international_debut': s = dismissDebut(s, clubs); break;
      case 'world_cup': {
        const won = s.pendingWorldCup && s.pendingWorldCup.result === 'Winner';
        s = won ? applyWorldCupSpeech(s, 'for_the_country', clubs) : dismissWorldCup(s, clubs);
        break;
      }
      case 'rivalry_event': s = dismissRivalryEvent(s, clubs); break;
      case 'ballon_dor': {
        const b = s.pendingBallonDor;
        s = b && b.playerRank === 1 ? applyBdorSpeech(s, 'tears', clubs) : dismissBallonDor(s, clubs);
        break;
      }
      case 'transfer_window': {
        const sit = s.transferSituation;
        if (!sit || sit.type === 'no_interest') { s = stayAtClub(s); break; }
        if (loyal && sit.type !== 'contract_expiry') { s = stayAtClub(s); break; }
        if (sit.type === 'one_offer') { s = seed % 2 === 0 ? acceptOffer(s, sit.offer) : stayAtClub(s); break; }
        if (sit.type === 'bidding_war') { s = acceptOffer(s, sit.offerA); break; }
        if (sit.type === 'dream_club') { s = acceptOffer(s, sit.offer); break; }
        if (sit.type === 'contract_expiry') {
          /* Signing the extension is how a real player stays: the transfer
             card offers it above the free transfer offers. The first draft of
             this harness picked an offer here instead, which capped every
             career in the sample at five straight seasons somewhere and made
             the one club badge look unreachable when it was the driver that
             could not sit still. */
          if (loyal) { s = signExtension(s); break; }
          const o = preferHome(sit.offers);
          s = o ? acceptOffer(s, o) : stayAtClub(s);
          break;
        }
        if (sit.type === 'request_result') { s = sit.offer ? acceptOffer(s, sit.offer) : stayAtClub(s); break; }
        s = stayAtClub(s);
        break;
      }
      case 'retirement_suggestion': s = acceptRetirementSuggestion(s); break;
      default: guard = 999; break;
    }
  }
  return { state: s, mode, criticName: name };
}

console.log('1) Driving careers through the real engine');
for (let i = 0; i < N; i += 1) {
  for (const [mode, offset] of [['ordinary', 0], ['elite', 90000], ['loyal', 40000]]) {
    if (mode === 'loyal' && i >= Math.ceil(N * 0.6)) continue;
    try { careers.push(drive(i + offset, mode)); }
    catch (err) {
      crashes += 1;
      if (crashes <= 2) console.error(`   ${mode} ${i} crashed: ${err && err.message}`);
    }
  }
}
const byMode = m => careers.filter(c => c.mode === m).length;
console.log(`   ${careers.length} careers (${byMode('ordinary')} ordinary, ${byMode('elite')} elite, ${byMode('loyal')} one club), ${seasonSteps} season boundaries, ${crashes} crashes`);
if (crashes > 0) fail(`${crashes} careers crashed`);
const expected = N * 2 + Math.ceil(N * 0.6);
if (careers.length < expected) fail(`${expected - careers.length} of the ${expected} careers asked for never finished, so the sections below are measuring less than they think`);

/* ─── 2. the badge case, reachable and not free ──────────────────────────── */

console.log('2) Every peak is reachable, and almost none of them are free');
const allFacts = careers.map(c => soccerBadgeFacts(c.state));
const earnCount = new Map(SOCCER_BADGES.map(b => [b.id, 0]));
for (const f of allFacts) {
  for (const b of earnedBadges(SOCCER_BADGES, f)) earnCount.set(b.id, earnCount.get(b.id) + 1);
}
/* The two first rungs are meant to be near universal: a career that never
   banked a million or never lasted a decade is barely a career. Everything
   else has to be something you did rather than something you turned up for. */
const RUNGS = new Set(['first_million', 'decade']);
const never = [...earnCount].filter(([, n]) => n === 0).map(([id]) => id);
const universal = [...earnCount].filter(([id, n]) => !RUNGS.has(id) && n === careers.length).map(([id]) => id);
const rare = [...earnCount].filter(([, n]) => n / careers.length < 0.4).length;
const rows = [...earnCount].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${pct(n, careers.length)}`);
const longestOneClub = Math.max(0, ...careers.map(c => {
  const played = playedSeasons(c.state);
  let best = 0, run = 0, at = null;
  for (const s of played) { run = s.club === at ? run + 1 : 1; at = s.club; if (run > best) best = run; }
  return best;
}));
console.log(`   longest unbroken run at one club anywhere in the sample: ${longestOneClub} seasons`);
console.log(`   ${SOCCER_BADGES.length} badges, ${rare} of them earned by under 40% of careers`);
console.log(`   ${rows.join(', ')}`);
if (never.length) fail(`badges nobody can earn, which is dead words in a case: ${never.join(', ')}`);
if (universal.length) fail(`badges every single career earns, which is a sticker not a peak: ${universal.join(', ')}`);
if (rare < 10) fail(`only ${rare} badges are rarer than 40%, the case is not marking peaks`);

/* ─── 3. the badges are honest ───────────────────────────────────────────── */

console.log('3) Six badge verdicts recomputed here from the raw save');
{
  /* Deliberately recomputed off the CareerState rather than off the facts the
     module built, so a facts builder that quietly loses a season is caught. */
  const independent = {
    ballon_dor: c => c.seasons.filter(s => s.type === 'playing').some(s => s.ballonDor),
    world_cup: c => c.seasons.filter(s => s.type === 'playing').some(s => s.worldCup),
    goals_100: c => c.seasons.filter(s => s.type === 'playing').reduce((a, s) => a + (s.goals || 0), 0) >= 100,
    apps_500: c => c.seasons.filter(s => s.type === 'playing').reduce((a, s) => a + (s.apps || 0), 0) >= 500,
    season_30: c => c.seasons.filter(s => s.type === 'playing').some(s => (s.goals || 0) >= 30),
    decade: c => c.seasons.filter(s => s.type === 'playing').length >= 10,
  };
  let disagreements = 0;
  let checked = 0;
  for (let i = 0; i < careers.length; i += 1) {
    const have = new Set(earnedBadges(SOCCER_BADGES, allFacts[i]).map(b => b.id));
    for (const [id, testFn] of Object.entries(independent)) {
      checked += 1;
      if (have.has(id) !== testFn(careers[i].state)) {
        disagreements += 1;
        if (disagreements <= 3) console.error(`   ${id} disagrees with the save on career ${i}`);
      }
    }
  }
  console.log(`   ${checked} verdicts checked against the seasons themselves, ${disagreements} disagreements`);
  if (disagreements > 0) fail(`${disagreements} badge verdicts do not match the career they claim to describe`);
}

/* ─── 4. the ceiling holds ───────────────────────────────────────────────── */

console.log('4) Nothing grew past its own ceiling');
console.log(`   ${seasonSteps} season boundaries checked, ${ceilingBreaks} of them above the rolled potential`);
if (ceilingBreaks > 0) fail(`${ceilingBreaks} season boundaries had an overall above the player's ceiling`);

/* ─── 5. the critic has more than one opinion, and it tracks the football ── */

console.log('5) The critic moves, and he moves with the football');
const seasonRows = [];
for (const c of careers) {
  const played = playedSeasons(c.state);
  for (let i = 0; i < played.length; i += 1) {
    const window = played.slice(Math.max(0, i - 2), i + 1);
    const upTo = played.slice(0, i + 1);
    const troph = s => (s.leagueTitle ? 1 : 0) + (s.domesticCup ? 1 : 0) + (s.championsLeague ? 1 : 0) + (s.worldCup ? 1 : 0) + (s.continentalCup ? 1 : 0);
    const score = criticScore({
      recentRatings: window.map(s => s.rating || 0),
      recentApps: window.map(s => s.apps || 0),
      recentTrophies: window.reduce((a, s) => a + troph(s), 0),
      careerTrophies: upTo.reduce((a, s) => a + troph(s), 0),
      popularity: c.state.popularity || 50,
      answered: 0,
    });
    seasonRows.push({ score, stance: criticStance(score), rating: played[i].rating || 0, apps: played[i].apps || 0, pos: c.state.position, season: played[i] });
  }
}
{
  const bands = ['backing', 'watching', 'doubting', 'written_off'];
  const counts = bands.map(b => seasonRows.filter(r => r.stance === b).length);
  const scores = seasonRows.map(r => r.score).sort((a, b) => a - b);
  console.log(`   ${seasonRows.length} seasons scored, spread ${scores[0]} to ${scores[scores.length - 1]}, median ${scores[Math.floor(scores.length / 2)]}`);
  console.log(`   ${bands.map((b, i) => `${b} ${pct(counts[i], seasonRows.length)}`).join(', ')}`);
  const backingRating = mean(seasonRows.filter(r => r.stance === 'backing').map(r => r.rating));
  const offRating = mean(seasonRows.filter(r => r.stance === 'written_off').map(r => r.rating));
  console.log(`   mean season rating he backs ${r2(backingRating)}, mean he writes off ${r2(offRating)}, gap ${r2(backingRating - offRating)}`);
  for (let i = 0; i < bands.length; i += 1) {
    if (counts[i] / seasonRows.length < 0.02) fail(`stance "${bands[i]}" holds ${pct(counts[i], seasonRows.length)} of seasons, so it is not really an opinion he has`);
  }
  /* Margin from measured headroom: the gap sits near 1.5 rating points over
     repeated runs, so 0.8 is well clear of the noise and still fails outright
     if the stance stops reading the football. */
  if (backingRating - offRating < 0.8) {
    fail(`the seasons he backs rate only ${r2(backingRating - offRating)} higher than the ones he writes off, so his opinion is not about the football`);
  }
}

/* ─── 6. what you do about him is a choice ───────────────────────────────── */

console.log('6) The three answers land in measurably different places');
{
  /* The same careers, replayed through the stance maths under each answer.
     No engine, no rng: this is a controlled comparison of the one thing each
     choice changes, and each one is measured with the instrument that matches
     what it claims to do. Answering back claims to sharpen him in both
     directions, so the measure is how far apart careers end up. Telling him to
     judge the season in front of him claims to make his verdict swing with
     each year, so the measure is how much it moves season to season. Inviting
     him in claims to soften him for good, so the measure is the mean. */
  const troph = s => (s.leagueTitle ? 1 : 0) + (s.domesticCup ? 1 : 0) + (s.championsLeague ? 1 : 0) + (s.worldCup ? 1 : 0) + (s.continentalCup ? 1 : 0);
  const scorePath = (c, answered) => {
    const played = playedSeasons(c.state);
    const path = [];
    for (let i = 0; i < played.length; i += 1) {
      const window = played.slice(Math.max(0, i - 2), i + 1);
      path.push(criticScore({
        recentRatings: window.map(s => s.rating || 0),
        recentApps: window.map(s => s.apps || 0),
        recentTrophies: window.reduce((a, s) => a + troph(s), 0),
        careerTrophies: played.slice(0, i + 1).reduce((a, s) => a + troph(s), 0),
        popularity: c.state.popularity || 50,
        answered,
      }));
    }
    return path;
  };
  const paths = [0, 1, 2, 3].map(a => careers.map(c => scorePath(c, a)).filter(p => p.length > 0));
  const finals = paths.map(ps => ps.map(p => p[p.length - 1]));
  const swings = paths.map(ps => ps.filter(p => p.length >= 2).map(p => {
    let total = 0;
    for (let i = 1; i < p.length; i += 1) total += Math.abs(p[i] - p[i - 1]);
    return total / (p.length - 1);
  }));
  const spread = arr => {
    const s = arr.slice().sort((a, b) => a - b);
    const q = Math.max(1, Math.floor(s.length / 4));
    return mean(s.slice(s.length - q)) - mean(s.slice(0, q));
  };
  const LABEL = ['say nothing about it  ', 'answer him back       ', 'let next season answer', 'invite him in         '];
  for (let i = 0; i < 4; i += 1) {
    console.log(`   ${LABEL[i]} final mean ${r2(mean(finals[i]))}, top quartile minus bottom ${r2(spread(finals[i]))}, mean season to season swing ${r2(mean(swings[i]))}`);
  }
  /* Margins from measured headroom over repeated runs: inviting him in is
     worth about 6 points of verdict, answering back adds about 11 to the
     spread, and judging the season in front of him adds about 5 to the swing.
     Each threshold sits well under its measured value and well over zero. */
  if (mean(finals[3]) - mean(finals[0]) < 4) {
    fail(`inviting him in moves his verdict by ${r2(mean(finals[3]) - mean(finals[0]))}, which is not worth the morale it costs`);
  }
  if (spread(finals[1]) - spread(finals[0]) < 5) {
    fail(`answering him back widens the outcome by only ${r2(spread(finals[1]) - spread(finals[0]))}, so it is not the gamble it is sold as`);
  }
  if (mean(swings[2]) - mean(swings[0]) < 2) {
    fail(`telling him to judge the season in front of him moves his verdict ${r2(mean(swings[2]) - mean(swings[0]))} more per season, which is a button that does nothing`);
  }
  console.log(`   the event fired in ${criticEventsSeen} careers; choices taken ${criticChoiceTaken.join(' / ')}`);
  if (criticEventsSeen === 0) fail('the critic event never fired in any career, so nobody can ever answer him');
  console.log(`   the signature boot was offered in ${bootEventsSeen} careers; choices taken ${bootChoiceTaken.join(' / ')}`);
  if (bootEventsSeen === 0) fail('the signature boot was never offered to anybody, so the branding line still has no peak');
}

/* ─── 7. the clause follows the position law ─────────────────────────────── */

console.log('7) He never asks a position for a stat it does not carry');
{
  /* Round 319: the gram told a goalkeeper to score more goals. Every clause
     this file can print, for every position it can print one for, against the
     words that position is never judged on. */
  const BANNED = {
    GK: ['goal', 'assist'],
    CB: ['goal', 'assist', 'clean sheet'],
    LB: ['goal', 'assist', 'clean sheet'],
    RB: ['goal', 'assist', 'clean sheet'],
    LWB: ['goal', 'assist', 'clean sheet'],
    RWB: ['goal', 'assist', 'clean sheet'],
    CDM: ['goal', 'assist', 'clean sheet'],
    CM: ['clean sheet'],
    CAM: ['clean sheet'],
    ST: ['clean sheet'],
    LW: ['clean sheet'],
    RW: ['clean sheet'],
  };
  let clauses = 0;
  let breaches = 0;
  const sample = seasonRows.slice(0, 400).map(r => r.season);
  for (const pos of Object.keys(BANNED)) {
    for (const s of sample) {
      const line = seasonClause(pos, s).toLowerCase();
      clauses += 1;
      for (const word of BANNED[pos]) {
        if (line.includes(word)) {
          breaches += 1;
          if (breaches <= 3) console.error(`   a ${pos} was written about in "${word}": ${line}`);
          break;
        }
      }
    }
  }
  console.log(`   ${clauses} clauses across ${Object.keys(BANNED).length} positions, ${breaches} of them naming the wrong stat`);
  if (breaches > 0) fail(`${breaches} columns judge a position on a stat it does not carry`);
}

/* ─── 8. the column runs every season ────────────────────────────────────── */

console.log('8) The column runs every time the paper does');
console.log(`   ${papersSeen} newspapers printed, ${papersWithColumn} of them carrying his column (${pct(papersWithColumn, papersSeen)})`);
if (papersSeen === 0) fail('no newspaper was ever printed, so section 8 measured nothing');
else if (papersWithColumn < papersSeen) fail(`${papersSeen - papersWithColumn} newspapers had no column in them, so he is not there at every step`);

/* ─── 9. he stores nothing, and an old save still loads ──────────────────── */

console.log('9) Nothing new on the save, and the old lifestyle band migrates');
{
  const sample = careers[0].state;
  const stray = Object.keys(sample).filter(k => /critic|badge|peak/i.test(k) && k !== 'peakOverall');
  if (stray.length) fail(`this round put fields on the save it said it would not: ${stray.join(', ')}`);
  const flags = Object.keys(sample.lifeFlags || {});
  console.log(`   save carries ${Object.keys(sample).length} top level fields, ${stray.length} of them from this round; life flags in play: ${flags.length}`);

  /* Round trip: what the browser actually does with a save. */
  const trip = repairCareer(JSON.parse(JSON.stringify(sample)));
  if (trip.overall !== sample.overall || trip.seasons.length !== sample.seasons.length) {
    fail('a driven save does not survive a JSON round trip through repairCareer');
  }
  const cols = scritic.soccerCriticColumns(trip, 4);
  if (cols.length === 0 && playedSeasons(trip).length > 0) {
    fail('a reloaded save lost the whole back catalogue, which was the point of storing nothing');
  }
  console.log(`   reloaded save rebuilt ${cols.length} of his old columns from the seasons alone`);

  /* The Round 473 rename, from the save a player already has on disk. */
  const legacy = repairCareer(JSON.parse(JSON.stringify({ ...sample, lifestyleLevel: 'Billionaire' })));
  if (legacy.lifestyleLevel !== 'Untouchable') {
    fail(`an old save's lifestyle band came out as "${legacy.lifestyleLevel}" instead of migrating to Untouchable`);
  } else {
    console.log('   an old save written when the top band was called Billionaire loads as Untouchable');
  }
}

/* ─── 10. the branding money you build actually gets paid ────────────────── */

console.log('10) Branding money survives the season roll it used to be wiped by');
{
  /* Before this round, six events sold a permanent yearly income by adding to
     s.sponsorshipIncome, and simulateSeasonFinances recomputes that field from
     scratch at the top of every season, so not one of those bumps was ever
     paid out. This measures the outcome: the same careers rolled forward one
     season with and without a branding pot. */
  const alive = careers.filter(c => !c.state.retired).map(c => c.state);
  const pool = (alive.length >= 20 ? alive : careers.map(c => c.state)).slice(0, 40);
  const withPot = [];
  const without = [];
  let kept = 0;
  for (const s of pool) {
    const base = { ...JSON.parse(JSON.stringify(s)), retired: false, phase: 'playing' };
    const a = advanceProSeason(repairCareer({ ...base, sponsorBonus: 3 }), clubs);
    const b = advanceProSeason(repairCareer({ ...base, sponsorBonus: 0 }), clubs);
    withPot.push(a.sponsorshipIncome);
    without.push(b.sponsorshipIncome);
    if ((a.sponsorBonus ?? 0) === 3) kept += 1;
  }
  const gap = mean(withPot) - mean(without);
  console.log(`   ${pool.length} careers rolled a season with a 3 pot and without: mean sponsorship ${r2(mean(withPot))} against ${r2(mean(without))}, gap ${r2(gap)}`);
  console.log(`   the pot itself survived the roll in ${kept} of ${pool.length}`);
  if (gap < 2) fail(`a 3 a year branding pot was worth ${r2(gap)} after one season, which is the bug this round fixed coming back`);
  if (kept < pool.length) fail(`${pool.length - kept} careers lost the branding pot itself across one season`);

  /* And the ratchet, so it cannot come back by the same route. Comments are
     stripped first, because the paragraph explaining the fix names the field
     and would otherwise satisfy the check that the fix exists. */
  const stripped = f => fs.readFileSync(path.join(ROOT, f), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const OFFENDERS = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerRealismA.ts', 'src/lib/soccerCareerRealismB.ts', 'src/lib/soccerCareerCorruption.ts'];
  let writes = 0;
  for (const f of OFFENDERS) {
    for (const m of stripped(f).matchAll(/sponsorshipIncome\s*(\+=|-=)/g)) {
      writes += 1;
      console.error(`   ${f} adds straight to sponsorshipIncome: ${m[0]}`);
    }
  }
  console.log(`   ${OFFENDERS.length} catalogs scanned for money added straight to the field that gets recomputed, ${writes} found`);
  if (writes > 0) fail(`${writes} events add money to sponsorshipIncome, which the next season roll throws away`);
}

/* ─── verdict ────────────────────────────────────────────────────────────── */

if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (failures === 0) {
    console.error(`\nCONTROL DID NOT FIRE: ${CONTROL} put the defect back and section ${c.breaks} stayed green. The check is not checking.`);
    process.exit(1);
  }
  console.log(`\nCONTROL FIRED: ${failures} failure${failures === 1 ? '' : 's'} with the defect back in, as it should. Section ${c.breaks} was the target.`);
  process.exit(0);
}
console.log(failures ? `\nsimCareerLife: ${failures} FAILURE${failures === 1 ? '' : 'S'}` : '\nsimCareerLife: green. Every peak is reachable, the critic has an opinion and it is about the football, and nothing about either of them is on the save.');
process.exit(failures ? 1 : 0);
