/**
 * Round 819 review: every Soccer Career moral dilemma does what its card says.
 *
 * Round 819 made the dilemmas reachable for the first time (they had been cut
 * off from 18 up since the day they were added), so every card's promise met
 * real players for the first time too. The review found the promises and the
 * engine disagreeing: "2-season ban" served one season and "3-SEASON BAN"
 * two, the risk lines never said a ban was coming at all, the tunnel fight's
 * ban and fine never landed, firing your agent left him on the books,
 * accepting the armband never made you captain, the insurance on a crashed
 * hypercar paid you 1.5M, joining your rival never moved you, and an old save
 * with a Ballon d'Or podium from years ago got "THE SNUB" out of nowhere.
 * Those are fixed in the engine; this harness is what keeps them fixed.
 *
 * Every check drives the REAL engine from a real save at an adult season
 * close (the social media screen, fresh), puts one dilemma on it, answers it
 * the way the page does (applyMoralDilemmaChoice, then dismissMoralDilemma on
 * Continue), and plays on with the engine's own season loop.
 *
 *   1. Bans. The card's risk line names the length ("banned for a season",
 *      "banned for two seasons") and that is exactly how many seasons are
 *      served, counted as season records with the BANNED club, after which
 *      the next season is played. The risk roll is forced to land.
 *      Match fixing, the hotel bar fixer, and both mafia outcomes. The
 *      drug test fails on its own roll, so it is read off natural careers:
 *      every failed test is one banned season, and the floor proves it ran.
 *   2. Promises, each a rule over several saves:
 *      a. "Join forces with your rival": after Continue you play for his
 *         club on a four year deal.
 *      b. "Accept the armband": you are the club captain of your club.
 *      c. "Fire your agent and sue": you have no agent.
 *      d. "Insurance war": the crash costs you nothing and pays you nothing.
 *      e. "Swing back" and "Trash talk": fined two weeks' and one week's
 *         wages.
 *   3. THE SNUB comes only on the close of the season the 2nd or 3rd place
 *      came in: a save carrying the old flag with no podium this season is
 *      never offered it over many rolls, and the same save with a 2nd place
 *      this season is offered it on the first.
 *
 * NEGATIVE CONTROLS, each proven to go red (TRUTH_CONTROL=...):
 *   banlen     match fixing sets a three value ban, two seasons served
 *              against a card that says one. Section 1 goes red.
 *   promises   puts back the broken promises at once (no move, no armband,
 *              agent kept, insurance pays 1.5M, neither tunnel fine).
 *              All six checks in section 2 go red.
 *   stalesnub  drops the podium this season condition. Section 3 goes red.
 * Each rewrite asserts the text it changes is in the engine exactly once.
 *
 * MEASURED 2026-10-01 on the fixed tree: 12 saves per ban case, every one
 * served exactly what its card says; 40 drug careers gave 19 failed tests on
 * the default seed and 20, 18, 19, 15, 15 on SIM_SEED 1 to 5, each one
 * season, so the floor of 5 is a third of the lowest; every promise held on
 * every save. These are rules, not bands: one disagreement is a defect.
 * Runs in about 4 seconds.
 *
 * Run: node scripts/simCareerDilemmaTruth.mjs
 */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const ENGINE_FILE = path.join(ROOT, 'src', 'lib', 'soccerCareerEngine.ts');
const CONTROL = process.env.TRUTH_CONTROL || '';
const CONTROLS = ['banlen', 'promises', 'stalesnub'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`TRUTH_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'dilemmaTruth-')).replaceAll('\\', '/');
const cleanup = () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } };
const abort = m => { console.error(m); cleanup(); process.exit(1); };
const count = (src, needle) => src.split(needle).length - 1;

/* ---------------- the controls' rewrites ---------------- */
function swap(src, from, to, what) {
  if (count(src, from) !== 1) abort(`control ${CONTROL} cannot run: ${what} is in the engine ${count(src, from)} times, expected 1`);
  return src.replace(from, to);
}
function rewrite(src) {
  if (CONTROL === 'banlen') {
    return swap(src,
      '          // it, so 2 here is one season out, which is what the card says.\n          s.matchFixBanned = 2;\n',
      '          // it, so 2 here is one season out, which is what the card says.\n          s.matchFixBanned = 3;\n',
      "match fixing's caught ban");
  }
  if (CONTROL === 'promises') {
    let out = src;
    out = swap(out, '        s.pendingRivalMove = s.rival.club;\n', '', 'the rival move marker');
    out = swap(out, '          s.isClubCaptain = true;\n', '', "the armband's captain flag");
    out = swap(out, '        s.agentId = "self";\n', '', 'the agent firing');
    out = swap(out, '           you 1.5M on top of a car that cost you nothing. */\n',
      '           you 1.5M on top of a car that cost you nothing. */\n        s.netWorth = Math.round((s.netWorth + 1.5) * 100) / 100;\n', "the valet's insurance");
    out = swap(out, '        s.netWorth = Math.round((s.netWorth - weekFine * 2) * 100) / 100;\n', '', "the tunnel swing's fine");
    out = swap(out, '        s.netWorth = Math.round((s.netWorth - weekFine) * 100) / 100;\n', '', "the tunnel words' fine");
    return out;
  }
  if (CONTROL === 'stalesnub') {
    return swap(src, '(closedRank === 2 || closedRank === 3) && ', '', 'the snub podium condition');
  }
  return src;
}
if (CONTROL) {
  const before = readLF(ENGINE_FILE);
  if (rewrite(before) === before) abort(`control ${CONTROL} changed nothing in the engine, so a green run would prove nothing`);
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}

const ENTRY = `${TMP}/engine.entry.mjs`;
const BUNDLE = `${TMP}/engine.bundle.mjs`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
`);
const plugins = CONTROL ? [{
  name: `dilemma-truth-${CONTROL}`,
  setup(b) {
    b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => ({ contents: rewrite(readLF(args.path)), loader: 'ts', resolveDir: path.dirname(args.path) }));
  },
}] : [];
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` }, plugins });
const { engine: E } = await import(pathToFileURL(BUNDLE).href);
const clubs = E.FALLBACK_CLUBS;

const red = [];
const fail = m => { red.push(m); console.log(`  RED  ${m}`); };
const ok = m => console.log(`  ok   ${m}`);

/* ---------------- the season loop, answered the way the page does ---------------- */
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'LW', 'RB', 'CDM'];
/* Dilemmas the loop meets on its own are answered with the plain option, so
   only the one under test can ban anyone. */
const SAFE = { match_fixing: 2, match_fixer_approach: 2, mafia_cup_ask: 2, mafia_second_ask: 2, ped_offer: 1 };
function step(s, c) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'social_media_action':
      if (!s.socialMediaActionUsedThisSeason) return E.applySocialMediaAction(s, 'training_video');
      if (s.pendingCoverAthleteEvent) return E.handleCoverAthleteDecision(s, false);
      return E.dismissSocialMediaPhase(s, clubs);
    case 'moral_dilemma': {
      const d = s.pendingMoralDilemma;
      if (!d) return E.dismissMoralDilemma(s, clubs);
      return E.applyMoralDilemmaChoice(s, SAFE[d.id] ?? (c % d.choices.length));
    }
    case 'random_events': return s.pendingEvents?.[0] ? E.applyEventChoice(s, c % Math.max(1, s.pendingEvents[0].choices.length), clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (sit && sit.type === 'contract_expiry') return E.signExtension(s);
      if (sit && sit.type === 'frozen_out' && sit.offers && sit.offers[0]) return E.acceptOffer(s, sit.offers[0]);
      return E.stayAtClub(s);
    }
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: return { ...s, retired: true };
  }
}
/* A real save: a career played to the first fresh social media screen at the
   age asked for, or null if it retired first. */
function saveAt(c, minAge, extra = () => true) {
  const o = 62 + (c * 5) % 24;
  const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
  let s = E.initCareer(`Truth ${c}`, NATIONS[c % NATIONS.length], POSITIONS[c % POSITIONS.length], '2020s', st, o, 2020, clubs, null, Math.min(99, o + 14));
  for (let g = 0; g < 900 && !s.retired; g++) {
    if (s.phase === 'social_media_action' && !s.socialMediaActionUsedThisSeason && s.age >= minAge && extra(s)) {
      return { ...E.applySocialMediaAction(s, 'training_video') };
    }
    s = step(s, c);
  }
  return null;
}
const def = id => E.MORAL_DILEMMAS.find(d => d.id === id);
function put(s, id) {
  return { ...s, phase: 'moral_dilemma', pendingMoralDilemma: def(id), moralDilemmasTriggered: [...s.moralDilemmasTriggered, id] };
}
function choose(s, idx, forceRoll) {
  if (!forceRoll) return E.applyMoralDilemmaChoice(s, idx);
  const real = Math.random;
  Math.random = () => 0;
  try { return E.applyMoralDilemmaChoice(s, idx); } finally { Math.random = real; }
}
const WORDS = { a: 1, one: 1, two: 2, three: 3 };
function statedBan(risk) {
  const m = /banned for (a|one|two|three) seasons?/i.exec(risk || '');
  return m ? WORDS[m[1].toLowerCase()] : null;
}
/* Play on until `seasons` more season records exist (or the career ends). */
function playSeasons(s, seasons, c) {
  const target = s.seasons.length + seasons;
  for (let g = 0; g < 900 && !s.retired && s.seasons.length < target; g++) s = step(s, c);
  return s;
}

/* ======================= Section 1: bans ======================= */
console.log('\n1) Every ban the card states is the ban served');
const BAN_CASES = [['match_fixing', 0], ['match_fixer_approach', 0], ['mafia_second_ask', 0], ['mafia_second_ask', 1]];
const PER_CASE = 12;
for (const [id, idx] of BAN_CASES) {
  const d = def(id);
  if (!d) { fail(`1 ${id}: not in MORAL_DILEMMAS`); continue; }
  const said = statedBan(d.choices[idx].risk);
  if (said === null) { fail(`1 ${id}#${idx}: the card's risk line does not say how long the ban is ("${d.choices[idx].risk}")`); continue; }
  let saves = 0, right = 0;
  const wrong = [];
  for (let c = 0; c < PER_CASE * 3 && saves < PER_CASE; c++) {
    const start = saveAt(1000 + c * 13 + idx, 22);
    if (!start) continue;
    saves += 1;
    let s = choose(put(start, id), idx, true);
    s = E.dismissMoralDilemma(s, clubs);
    const from = s.seasons.length;
    s = playSeasons(s, said + 1, c);
    const after = s.seasons.slice(from);
    const served = after.filter(x => String(x.club).startsWith('BANNED')).length;
    const playedAfter = after.length === said + 1 && !String(after[said].club).startsWith('BANNED');
    if (served === said && playedAfter) right += 1;
    else if (wrong.length < 3) wrong.push(`served ${served}, then ${after[said] ? after[said].club : 'nothing'}`);
  }
  if (saves < PER_CASE) fail(`1 ${id}#${idx}: only ${saves} saves reached 22`);
  else if (right !== saves) fail(`1 ${id}#${idx}: the card says ${said} season${said === 1 ? '' : 's'}, ${saves - right} of ${saves} saves served something else (${wrong.join('; ')})`);
  else ok(`1 ${id}#${idx}: the card says ${said} season${said === 1 ? '' : 's'} and all ${saves} saves served exactly that, then played`);
}
{
  const d = def('ped_offer');
  const said = statedBan(d && d.choices[0].risk);
  if (said === null) fail('1 ped_offer#0: the card does not say how long a failed test bans you');
  else {
    let failures = 0, right = 0, careers = 0;
    for (let c = 0; c < 40; c++) {
      const start = saveAt(2000 + c * 7, 22, x => x.overall <= 90);
      if (!start) continue;
      careers += 1;
      let s = choose(put(start, 'ped_offer'), 0, false);
      s = E.dismissMoralDilemma(s, clubs);
      const from = s.seasons.length;
      s = playSeasons(s, 5, c);
      const after = s.seasons.slice(from);
      const at = after.findIndex(x => String(x.club).startsWith('BANNED'));
      if (at === -1) continue;
      failures += 1;
      const run = after.slice(at).findIndex(x => !String(x.club).startsWith('BANNED'));
      if (run === said) right += 1;
    }
    if (failures < 5) fail(`1 ped_offer#0: only ${failures} failed tests in ${careers} careers, too few to hold the rule`);
    else if (right !== failures) fail(`1 ped_offer#0: the card says ${said}, ${failures - right} of ${failures} failed tests served something else`);
    else ok(`1 ped_offer#0: ${failures} failed tests in ${careers} careers, every one ${said} season as the card says`);
  }
}

/* ======================= Section 2: promises ======================= */
console.log('\n2) Every promise the review fixed is kept');
const PROMISE_SAVES = 10;
function promise(label, minAge, prep, id, idx, check) {
  let saves = 0, kept = 0;
  const why = [];
  for (let c = 0; c < PROMISE_SAVES * 3 && saves < PROMISE_SAVES; c++) {
    const start = saveAt(3000 + c * 17 + label.length, minAge);
    if (!start) continue;
    const ready = prep(start, c);
    if (!ready) continue;
    saves += 1;
    const chosen = choose(put(ready, id), idx, false);
    const after = E.dismissMoralDilemma(chosen, clubs);
    const res = check(ready, chosen, after);
    if (res === true) kept += 1;
    else if (why.length < 2) why.push(res);
  }
  if (saves < PROMISE_SAVES) fail(`2${label}: only ${saves} saves could be set up`);
  else if (kept !== saves) fail(`2${label}: kept on ${kept} of ${saves} saves (${why.join('; ')})`);
  else ok(`2${label}: kept on all ${saves} saves`);
}
const otherClub = (s, c) => {
  const year = (s.seasons[s.seasons.length - 1]?.year ?? 2024) + 1;
  const pool = E.adjustClubsForYear ? E.adjustClubsForYear(clubs, year) : clubs;
  const cands = pool.filter(x => x.name !== s.currentClub && x.tier <= 2);
  return cands.length ? cands[c % cands.length] : null;
};
const weekFine = s => Math.max(0.02, s.weeklyWage / 1000000);
const near = (a, b) => Math.abs(a - b) < 0.011;

promise('a rival move', 24, (s, c) => {
  const club = otherClub(s, c);
  if (!club) return null;
  const rival = s.rival ?? { name: 'Rival', nationality: 'Spain', position: s.position, club: club.name, clubTier: club.tier, overall: s.overall, careerGoals: 0, careerAssists: 0, careerApps: 0, leagueTitles: 0, championsLeagues: 0, worldCups: 0, ballonDors: 0, intCaps: 0, intGoals: 0, marketValue: 10, age: s.age, retired: false };
  return { ...s, rival: { ...rival, club: club.name, clubTier: club.tier, retired: false } };
}, 'rival_club_offer', 0, (before, _chosen, after) => {
  if (after.currentClub !== before.rival.club) return `still at ${after.currentClub}, his club is ${before.rival.club}`;
  if (after.contractYearsLeft !== 4) return `contract ${after.contractYearsLeft} years`;
  if (after.phase !== 'playing') return `phase ${after.phase}`;
  return true;
});
promise('b armband', 23, s => ({ ...s, isClubCaptain: false, captainClub: null, captainSeasons: 0 }), 'captain_armband_feud', 0, (before, chosen, after) => {
  if (!chosen.isClubCaptain || chosen.captainClub !== before.currentClub) return `captain ${chosen.isClubCaptain} of ${chosen.captainClub}`;
  if (!after.isClubCaptain && after.currentClub === before.currentClub) return 'the armband was gone after Continue';
  return true;
});
promise('c agent', 22, s => ({ ...s, agentId: 'shark', totalEarnings: Math.max(s.totalEarnings, 10) }), 'agent_corruption', 0, (_b, chosen) => (chosen.agentId === 'self' ? true : `agent still ${chosen.agentId}`));
promise('d insurance', 22, s => ({ ...s, purchasedItems: [...(s.purchasedItems || []), 'sports_car'] }), 'valet_crash', 1, (before, chosen) => (near(chosen.netWorth, before.netWorth) ? true : `net worth ${before.netWorth} to ${chosen.netWorth}`));
promise('e tunnel swing', 22, s => s, 'tunnel_brawl', 0, (before, chosen) => (near(chosen.netWorth, before.netWorth - 2 * weekFine(before)) ? true : `net worth ${before.netWorth} to ${chosen.netWorth}, fine should be ${(2 * weekFine(before)).toFixed(2)}`));
promise('e tunnel words', 22, s => s, 'tunnel_brawl', 2, (before, chosen) => (near(chosen.netWorth, before.netWorth - weekFine(before)) ? true : `net worth ${before.netWorth} to ${chosen.netWorth}, fine should be ${weekFine(before).toFixed(2)}`));

/* ======================= Section 3: the snub ======================= */
console.log('\n3) THE SNUB comes on the podium close and only then');
{
  let saves = 0, staleOffered = 0, staleRolls = 0, freshOffered = 0;
  for (let c = 0; c < 30 && saves < 10; c++) {
    const start = saveAt(4000 + c * 11, 22);
    if (!start) continue;
    saves += 1;
    const last = start.seasons.length - 1;
    const base = { ...start, mafiaStage: 0, bdorSnubFuel: true, moralDilemmasTriggered: start.moralDilemmasTriggered.filter(x => x !== 'bdor_snub') };
    const stale = { ...base, seasons: start.seasons.map((x, i) => (i === last ? { ...x, ballonDorRank: null } : x)) };
    for (let r = 0; r < 20; r++) {
      staleRolls += 1;
      const after = E.dismissSocialMediaPhase({ ...stale }, clubs);
      if (after.pendingMoralDilemma && after.pendingMoralDilemma.id === 'bdor_snub') staleOffered += 1;
    }
    const fresh = { ...base, seasons: start.seasons.map((x, i) => (i === last ? { ...x, ballonDorRank: 2 } : x)) };
    const got = E.dismissSocialMediaPhase({ ...fresh }, clubs);
    if (got.pendingMoralDilemma && got.pendingMoralDilemma.id === 'bdor_snub') freshOffered += 1;
  }
  if (saves < 10) fail(`3: only ${saves} saves reached 22`);
  else {
    if (staleOffered > 0) fail(`3 stale: a save with the old flag and no podium this season was offered THE SNUB ${staleOffered} times in ${staleRolls} rolls`);
    else ok(`3 stale: never offered over ${staleRolls} rolls on ${saves} saves carrying the old flag`);
    if (freshOffered !== saves) fail(`3 podium: offered on ${freshOffered} of ${saves} saves with a 2nd place this season`);
    else ok(`3 podium: offered on all ${saves} saves with a 2nd place this season`);
  }
}

cleanup();
console.log(`\nsimCareerDilemmaTruth: ${red.length ? `${red.length} RED` : 'all green'}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(red.length ? 1 : 0);
