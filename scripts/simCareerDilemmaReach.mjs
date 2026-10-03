/**
 * Round 819: the Soccer Career moral dilemmas reach the player.
 *
 * THE BUG, found by a reviewer of another round on 2026-10-01 and reproduced
 * here through the real page before anything changed. The season close runs
 * Ballon d'Or, debut, tournament, rivalry, then the social media screen, then
 * the dilemma roll, then the random events. The social media screen opens
 * every season from 18 and its Continue (dismissSocialMediaPhase) went
 * straight to the random events, so the dilemma roll that sat after it in
 * advanceToNextPhase never ran again. The dilemma roll itself only starts at
 * 20. Net effect: no player ever saw a dilemma, the four rival ones included,
 * from the day they were added (commit 8c25e5d0, 2026-03-29, which put the
 * roll after the social media check and never touched the screen's Continue).
 *
 * Measured on main before the fix, through the REAL page (section 2, 6
 * careers per start age, 4 seasons each, seed 819): 77 seasons closed at 20
 * or older, 0 dilemmas offered, 0 drawn. Section 1 on main: 0 shown in 0
 * offered over every age band.
 *
 * SECTIONS
 *   1. Headless, at scale. Careers from 16 to retirement, every screen
 *      answered with the same engine call the page's own handler makes for
 *      that screen (handleDismissSocialMedia is dismissSocialMediaPhase,
 *      handleMoralDilemmaChoice is applyMoralDilemmaChoice, and so on), so
 *      this is the page's phase path without the DOM. Per age band of the
 *      season that closes it holds:
 *        a. the rate of dilemmas shown per season closed, inside a band set
 *           from measured seeds (numbers below);
 *        b. nothing below 20, the engine's own age gate (a rule, not a band);
 *        c. every dilemma the engine offers (a new id on
 *           moralDilemmasTriggered) is shown, exactly once, in order;
 *        d. never two in one season;
 *        e. the four rival dilemmas are shown at all, at a floor;
 *        f. no career dead ends or throws on any choice of any dilemma;
 *        g. the choice lands and Continue keeps it: every choice writes its
 *           outcome line, and after the dilemma's Continue that line and the
 *           consequence fields (popularity, money, integrity, bans, the drug
 *           and diving flags, sponsor pot, mafia stage, feud heat, stat boost,
 *           agent) are exactly what the choice left. Added by the Round 819
 *           review: a Continue that dismissed from the save as it was before
 *           the choice, or a choice that changed nothing, left every check
 *           above green.
 *   2. Rendered. src/test/careerDilemmaReach.test.tsx mounts the real page on
 *      saves at 17, 19, 24 and 30 and presses the buttons on screen for four
 *      seasons. It holds c, d and g off the DOM itself, and this section
 *      holds the count of dilemmas drawn from 20 up to its own band.
 *      src/test/careerDilemmaSaves.test.tsx (Round 819 review) loads saves
 *      the page can be sitting on: the social media screen from before the
 *      round, a dilemma waiting for its choice, a dilemma already decided
 *      (reloaded between the choice and Continue, the case the card fix is
 *      for), and a match fixing ban, and plays each on through the page.
 *
 * BANDS, from measured headroom (reruns on 2026-10-01, the fixed tree; the
 * MEASURED block next to each constant has the numbers).
 *
 * NEGATIVE CONTROLS, each proven to go red:
 *   DILEMMA_REACH_CONTROL=skip   puts the skipping transition back: the roll
 *                                is cut out of dismissSocialMediaPhase. 1a and
 *                                1e and section 2 go red.
 *   DILEMMA_REACH_CONTROL=twice  makes the first Continue after a choice put
 *                                the same dilemma back on screen. 1c, 1d and
 *                                section 2 go red.
 *   DILEMMA_REACH_CONTROL=tworolls  rolls a second time in the season, when
 *                                the player posts on the social media screen,
 *                                the double offer a fix in the wrong place
 *                                would make. 1c and section 2 go red.
 *   DILEMMA_REACH_CONTROL=lost   the dilemma's Continue dismisses from the save
 *                                as it was before the choice, so everything
 *                                the choice did is thrown away. 1g and the
 *                                rendered reach cases go red.
 *   DILEMMA_REACH_CONTROL=noeffect  the choice clears the card and changes
 *                                nothing else. 1g and the rendered reach cases
 *                                go red.
 *   DILEMMA_REACH_CONTROL=chosenflag  puts the pre 819 dilemma card back in
 *                                the page (it waited on a local "chosen" flag
 *                                and drew nothing for a decided dilemma it had
 *                                not seen chosen). The saves test's reloaded
 *                                decided dilemma goes red.
 * The engine is rewritten in the bundle for section 1 and in a gitignored
 * copy (src/lib/__control_*.ts) that section 2 is pointed at through the
 * NO_DOUBLE_SWAP alias in vitest.config.ts; the page control writes a
 * gitignored copy of the page (src/pages/__control_*.tsx) the same way. Each
 * rewrite asserts the text it changes is there exactly once, or the control
 * refuses to run.
 *
 * Run: node scripts/simCareerDilemmaReach.mjs
 *      DILEMMA_REACH_CONTROL=skip node scripts/simCareerDilemmaReach.mjs
 *      SECTIONS=1 (or 2) runs one section; SIM_SEED reseeds section 1.
 */
import './lib/seedRandom.mjs';
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const ENGINE_FILE = path.join(ROOT, 'src', 'lib', 'soccerCareerEngine.ts');
const PAGE_FILE = path.join(ROOT, 'src', 'pages', 'SoccerCareer.tsx');
const CONTROL = process.env.DILEMMA_REACH_CONTROL || '';
const CONTROLS = ['skip', 'twice', 'tworolls', 'lost', 'noeffect', 'chosenflag'];
const PAGE_CONTROLS = ['chosenflag'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`DILEMMA_REACH_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const SECTIONS = (process.env.SECTIONS || '1,2').split(',').map(x => x.trim());
const CAREERS = Number(process.env.DILEMMA_REACH_HEADLESS || 160);

/* ---------------- bands ---------------- */
/* Section 1a: dilemmas shown per season closed, by the age at the close.
   MEASURED 2026-10-01 on the fixed tree, 160 careers, nine streams (the
   filename seed and SIM_SEED 0 to 7):
     20-23  0.284 to 0.330   (about 620 seasons a run)
     24-29  0.288 to 0.339   (about 925)
     30+    0.286 to 0.333   (about 1010)
   The engine's own roll is 30 percent a season, plus the two follow ups
   that jump the queue. On main every band was 0. A second roll in the
   season would put it near 0.51. The band is wide of every measured value
   by five standard errors or more on both sides, and shut to both of
   those. */
const RATE_BANDS = {
  '20-23': [0.20, 0.42],
  '24-29': [0.20, 0.42],
  '30+': [0.20, 0.42],
};
/* Section 1e: rival dilemmas shown over the whole sample. MEASURED over the
   same nine streams: 84 to 116. On main: 0. The floor is half the lowest. */
const RIVAL_FLOOR = 40;
/* Section 2: dilemmas drawn on screen from 20 up, over the rendered sample
   (about 85 seasons closed at 20 or older). MEASURED with DILEMMA_REACH_SEED
   819, 1, 2, 3 and 4: 28, 33, 24, 22 and 24. On main: 0 (77 seasons). */
const RENDERED_BAND = [10, 50];

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'dilemmaReach-')).replaceAll('\\', '/');
const readLF = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');
let controlCopy = null;
let pageCopy = null;
function cleanup() {
  try { if (controlCopy) fs.rmSync(controlCopy, { force: true }); } catch { /* best effort */ }
  try { if (pageCopy) fs.rmSync(pageCopy, { force: true }); } catch { /* best effort */ }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
}
const abort = m => { console.error(m); cleanup(); process.exit(1); };

/* ---------------- the controls' rewrites ---------------- */
const ROLL = '  if (tryTriggerMoralDilemma(s)) {\n    s.phase = "moral_dilemma";\n    return s;\n  }\n';
const SOCIAL_HEAD = 'export function dismissSocialMediaPhase(prev: CareerState, clubs: ClubData[]): CareerState {\n';
/* Round 835 moved the "posted this summer" flag into the shared post rule
   (careerSocial.ts, set through the sport's descriptor), so the engine no
   longer holds that line. The control hooks the engine's own call of the
   shared rule instead: the line that returns early for a refused post, so the
   second roll still happens only when a post was really made. */
const ACTED = '  if (!applySocialPost(s, actionId, SOCCER_SOCIAL)) return s;\n';
const DISMISS_HEAD ='export function dismissMoralDilemma(prev: CareerState, clubs: ClubData[]): CareerState {\n  const s = { ...prev };\n  s.pendingMoralDilemma = null;\n';
const APPLY_HEAD = 'export function applyMoralDilemmaChoice(prev: CareerState, choiceIndex: number): CareerState {\n  const s = { ...prev };\n';
const APPLY_TAIL = '  // Stay on moral_dilemma phase, UI calls dismissMoralDilemma to continue\n  s.phase = "moral_dilemma";\n  return s;\n';
function count(src, needle) { return src.split(needle).length - 1; }
function rewrite(src) {
  if (PAGE_CONTROLS.includes(CONTROL)) return src;
  if (CONTROL === 'lost') {
    if (count(src, APPLY_HEAD) !== 1) abort(`control lost cannot run: applyMoralDilemmaChoice's opening is not in the engine exactly once`);
    if (count(src, DISMISS_HEAD) !== 1) abort(`control lost cannot run: dismissMoralDilemma's opening is not in the engine exactly once`);
    return src
      .replace(APPLY_HEAD, `${APPLY_HEAD}  (s as any).__beforeChoice = prev;\n`)
      .replace(DISMISS_HEAD, 'export function dismissMoralDilemma(prev: CareerState, clubs: ClubData[]): CareerState {\n'
        + '  const s = { ...(((prev as any).__beforeChoice as CareerState | undefined) ?? prev) };\n'
        + '  delete (s as any).__beforeChoice;\n'
        + '  s.pendingMoralDilemma = null;\n');
  }
  if (CONTROL === 'noeffect') {
    if (count(src, APPLY_TAIL) !== 1) abort(`control noeffect cannot run: applyMoralDilemmaChoice's closing lines are in the engine ${count(src, APPLY_TAIL)} times, expected 1`);
    return src.replace(APPLY_TAIL, '  // Stay on moral_dilemma phase, UI calls dismissMoralDilemma to continue\n  s.phase = "moral_dilemma";\n  return { ...prev, pendingMoralDilemma: null, phase: "moral_dilemma" };\n');
  }
  if (CONTROL === 'skip') {
    if (count(src, SOCIAL_HEAD) !== 1) abort(`control skip cannot run: dismissSocialMediaPhase's header is not in the engine exactly once`);
    const at = src.indexOf(SOCIAL_HEAD);
    const end = src.indexOf('\nexport function ', at + SOCIAL_HEAD.length);
    const body = src.slice(at, end);
    if (count(body, ROLL) !== 1) abort(`control skip cannot run: dismissSocialMediaPhase holds ${count(body, ROLL)} dilemma rolls, expected 1, so there is nothing to put back`);
    return src.slice(0, at) + body.replace(ROLL, '') + src.slice(end);
  }
  if (CONTROL === 'tworolls') {
    if (count(src, ACTED) !== 1) abort(`control tworolls cannot run: applySocialMediaAction's call of the shared post rule is in the engine ${count(src, ACTED)} times, expected 1`);
    return src.replace(ACTED, `${ACTED}  tryTriggerMoralDilemma(s);\n`);
  }
  if (CONTROL === 'twice') {
    if (count(src, DISMISS_HEAD) !== 1) abort(`control twice cannot run: dismissMoralDilemma's opening is not in the engine exactly once`);
    return src.replace(DISMISS_HEAD, 'export function dismissMoralDilemma(prev: CareerState, clubs: ClubData[]): CareerState {\n  const s = { ...prev };\n'
      + '  const again = MORAL_DILEMMAS.find(d => d.id === s.moralDilemmasTriggered[s.moralDilemmasTriggered.length - 1]);\n'
      + '  if (again && !(s as any).__shownAgain) { (s as any).__shownAgain = true; s.pendingMoralDilemma = again; s.phase = "moral_dilemma"; return s; }\n'
      + '  (s as any).__shownAgain = false;\n'
      + '  s.pendingMoralDilemma = null;\n');
  }
  return src;
}
/* The page control: the dilemma card as it was before Round 819, which kept a
   local "chosen" flag and drew nothing for a decided dilemma it had not seen
   chosen in this mount, i.e. after a reload. Scoped to the card's own body. */
const CARD_HEAD = 'function MoralDilemmaCard(';
const CARD_OPEN = '  if (!dilemma) {\n';
const CARD_CLICK = 'onClick={() => onChoice(i)}';
function rewritePage(src) {
  if (CONTROL !== 'chosenflag') return src;
  if (count(src, CARD_HEAD) !== 1) abort('control chosenflag cannot run: MoralDilemmaCard is not in the page exactly once');
  const at = src.indexOf(CARD_HEAD);
  const end = src.indexOf('\nfunction ', at + CARD_HEAD.length);
  const body = src.slice(at, end);
  if (count(body, CARD_OPEN) !== 1) abort(`control chosenflag cannot run: the card's no dilemma branch is in it ${count(body, CARD_OPEN)} times, expected 1`);
  if (count(body, CARD_CLICK) !== 1) abort(`control chosenflag cannot run: the card's choice handler is in it ${count(body, CARD_CLICK)} times, expected 1`);
  const broken = body
    .replace(CARD_OPEN, '  const [chosen, setChosen] = useState(false);\n  if (!dilemma && !chosen) return null;\n' + CARD_OPEN)
    .replace(CARD_CLICK, 'onClick={() => { onChoice(i); setChosen(true); }}');
  return src.slice(0, at) + broken + src.slice(end);
}
if (CONTROL) {
  if (PAGE_CONTROLS.includes(CONTROL)) {
    const before = readLF(PAGE_FILE);
    if (rewritePage(before) === before) abort(`control ${CONTROL} changed nothing in the page, so a green run would prove nothing`);
  } else {
    const before = readLF(ENGINE_FILE);
    if (rewrite(before) === before) abort(`control ${CONTROL} changed nothing in the engine, so a green run would prove nothing`);
  }
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}

const red = [];
const fail = m => { red.push(m); console.log(`  RED  ${m}`); };
const ok = m => console.log(`  ok   ${m}`);

/* ======================= Section 1: headless ======================= */
if (SECTIONS.includes('1')) {
  console.log(`\n1) Headless: ${CAREERS} careers through the page's phase path${process.env.SIM_SEED ? ` (SIM_SEED ${process.env.SIM_SEED})` : ''}`);
  const ENTRY = `${TMP}/engine.entry.mjs`;
  const BUNDLE = `${TMP}/engine.bundle.mjs`;
  fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const engine = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
`);
  const plugins = CONTROL ? [{
    name: `dilemma-reach-${CONTROL}`,
    setup(b) {
      b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => ({ contents: rewrite(readLF(args.path)), loader: 'ts', resolveDir: path.dirname(args.path) }));
    },
  }] : [];
  await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', alias: { '@': `${ROOT_URL}/src` }, plugins });
  const { engine: E } = await import(pathToFileURL(BUNDLE).href);
  const clubs = E.FALLBACK_CLUBS;
  const RIVAL_IDS = ['rival_club_offer', 'rival_bad_tackle', 'goat_debate_show', 'rival_charity_match'];
  for (const id of RIVAL_IDS) if (!E.MORAL_DILEMMAS.some(d => d.id === id)) abort(`the rival dilemma ${id} is not in MORAL_DILEMMAS, so 1e would count something that cannot exist`);

  const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
  const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
  const ACTIONS = E.SOCIAL_MEDIA_ACTIONS.map(a => a.id);
  const band = age => age < 20 ? 'under 20' : age < 24 ? '20-23' : age < 30 ? '24-29' : '30+';
  const seasons = {}, shows = {};
  let offersTotal = 0, showsTotal = 0, rivalShows = 0, crashes = 0, deadEnds = 0, orderBreaks = 0, doubleSeasons = 0, under20 = 0;
  /* 1g: what a choice leaves behind, and whether Continue keeps it. Morale
     is left out on purpose: the transfer window Continue opens can take 12
     off it when the club freezes you out, which is that screen's doing. */
  const fingerprint = x => JSON.stringify([x.popularity, x.netWorth, x.integrityBonus, x.matchFixBanned, x.pedActive, x.divingActive,
    x.sponsorBonus ?? 0, x.mafiaStage ?? 0, x.rivalryIntensity ?? null, x.statBoostNextSeason ?? null, x.agentId ?? null]);
  let choicesMade = 0, silentChoices = 0, keptOnContinue = 0, lostOnContinue = 0;
  const choiceSeen = new Map();
  const examples = [];

  for (let c = 0; c < CAREERS; c++) {
    const o = 48 + (c * 7) % 30;
    const st = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
    let s;
    const offered = [], shown = [];
    const perSeason = new Map();
    let decided = null;
    try {
      s = E.initCareer(`Reach ${c}`, NATIONS[c % NATIONS.length], POSITIONS[c % POSITIONS.length], '2020s', st, o, 2020, clubs, null, Math.min(99, o + 10 + (c % 25)));
      let known = s.moralDilemmasTriggered.length;
      let dilemmasAnswered = 0;
      let guard = 0;
      for (; guard < 900 && !s.retired; guard++) {
        const trig = s.moralDilemmasTriggered || [];
        for (; known < trig.length; known++) { offered.push(trig[known]); offersTotal += 1; }
        switch (s.phase) {
          case 'youth': s = E.advanceYouthYear(s, clubs); break;
          case 'playing': s = E.advanceProSeason(s, clubs); break;
          case 'contract_offer': { const offers = s.pendingOffers || []; s = offers.length ? E.acceptOffer(s, offers[c % offers.length]) : { ...s, phase: 'playing' }; break; }
          case 'newspaper': s = E.dismissNewspaper(s); break;
          case 'season_summary': {
            const b = band(s.age);
            seasons[b] = (seasons[b] || 0) + 1;
            s = E.dismissSummary(s, clubs);
            break;
          }
          case 'social_media_action':
            /* The page has no skip on this screen: a player picks one post,
               answers the cover offer if it comes, then presses Continue. */
            if (!s.socialMediaActionUsedThisSeason) s = E.applySocialMediaAction(s, ACTIONS[(c + s.seasons.length) % ACTIONS.length]);
            else if (s.pendingCoverAthleteEvent) s = E.handleCoverAthleteDecision(s, c % 2 === 0);
            else s = E.dismissSocialMediaPhase(s, clubs);
            break;
          case 'moral_dilemma': {
            const d = s.pendingMoralDilemma;
            if (d) {
              const b = band(s.age);
              shows[b] = (shows[b] || 0) + 1;
              showsTotal += 1;
              if (s.age < 20) under20 += 1;
              if (RIVAL_IDS.includes(d.id)) rivalShows += 1;
              shown.push(d.id);
              const season = s.seasons.length;
              perSeason.set(season, (perSeason.get(season) || 0) + 1);
              const idx = (c + dilemmasAnswered++) % d.choices.length;
              choiceSeen.set(`${d.id}#${idx}`, true);
              const eventsBefore = (s.events || []).length;
              s = E.applyMoralDilemmaChoice(s, idx);
              choicesMade += 1;
              const ev = s.events || [];
              if (ev.length <= eventsBefore) {
                silentChoices += 1;
                if (examples.length < 8) examples.push(`career ${c}: ${d.id} option ${idx} wrote no outcome`);
                decided = null;
              } else decided = { id: `${d.id}#${idx}`, line: ev[ev.length - 1], fp: fingerprint(s) };
            } else {
              s = E.dismissMoralDilemma(s, clubs);
              if (decided) {
                if ((s.events || []).includes(decided.line) && fingerprint(s) === decided.fp) keptOnContinue += 1;
                else { lostOnContinue += 1; if (examples.length < 8) examples.push(`career ${c}: ${decided.id} lost on Continue`); }
                decided = null;
              }
            }
            break;
          }
          case 'random_events': s = s.pendingEvents?.[0] ? E.applyEventChoice(s, c % Math.max(1, s.pendingEvents[0].choices.length), clubs) : { ...s, pendingEvents: [], phase: 'playing' }; break;
          case 'rehab_choice': s = E.applyRehabChoice(s, 1); break;
          case 'red_card_appeal_result': s = E.dismissAppealResult(s, clubs); break;
          case 'international_debut': s = E.dismissDebut(s, clubs); break;
          case 'world_cup': s = E.dismissWorldCup(s, clubs); break;
          case 'rivalry_event': s = E.dismissRivalryEvent(s, clubs); break;
          case 'ballon_dor': s = E.dismissBallonDor(s, clubs); break;
          case 'transfer_window': {
            const sit = s.transferSituation;
            if (!sit || sit.type === 'no_interest') { s = E.stayAtClub(s); break; }
            if (sit.type === 'contract_expiry') { const off = (sit.offers || [])[0]; s = c % 3 === 0 && off ? E.acceptOffer(s, off) : E.signExtension(s); break; }
            const off = sit.offer || sit.offerA;
            s = off && c % 2 === 0 ? E.acceptOffer(s, off) : E.stayAtClub(s);
            break;
          }
          case 'retirement_suggestion': s = s.age >= 35 ? E.acceptRetirementSuggestion(s) : E.declineRetirementSuggestion(s, clubs); break;
          case 'retirement_ceremony': case 'post_retirement': case 'retired': s = { ...s, retired: true }; break;
          default: deadEnds += 1; examples.push(`career ${c}: no move for phase ${s.phase} at ${s.age}`); guard = 9999; break;
        }
      }
      if (guard >= 900 && guard < 9999 && !s.retired) { deadEnds += 1; examples.push(`career ${c}: still going after 900 screens, phase ${s.phase} at ${s.age}`); }
    } catch (e) {
      crashes += 1;
      examples.push(`career ${c} threw: ${String(e && e.stack || e).split('\n').slice(0, 3).join(' / ')}`);
      continue;
    }
    if (offered.join(',') !== shown.join(',')) { orderBreaks += 1; if (examples.length < 8) examples.push(`career ${c}: offered [${offered.join(', ')}] shown [${shown.join(', ')}]`); }
    for (const [season, n] of perSeason) if (n > 1) { doubleSeasons += 1; if (examples.length < 8) examples.push(`career ${c}: ${n} dilemmas shown in season ${season}`); }
  }

  for (const b of ['under 20', '20-23', '24-29', '30+']) {
    const n = seasons[b] || 0, k = shows[b] || 0;
    console.log(`   ${b.padEnd(8)} seasons ${String(n).padStart(4)}  shown ${String(k).padStart(3)}  rate ${n ? (k / n).toFixed(3) : 'n/a'}`);
  }
  console.log(`   offered ${offersTotal}, shown ${showsTotal}, rival shown ${rivalShows}, distinct dilemma choices taken ${choiceSeen.size}`);
  for (const x of examples.slice(0, 8)) console.log(`   ${x}`);

  /* a */
  for (const [b, [lo, hi]] of Object.entries(RATE_BANDS)) {
    const n = seasons[b] || 0, k = shows[b] || 0;
    if (n < 100) { fail(`1a ${b}: only ${n} seasons closed in this band, too few to hold a rate`); continue; }
    const r = k / n;
    if (r < lo || r > hi) fail(`1a ${b}: ${r.toFixed(3)} dilemmas shown per season, band [${lo}, ${hi}]`);
    else ok(`1a ${b}: ${r.toFixed(3)} dilemmas shown per season, inside [${lo}, ${hi}]`);
  }
  /* b */
  if ((seasons['under 20'] || 0) < 100) fail(`1b: only ${seasons['under 20'] || 0} seasons closed under 20, the rule was not exercised`);
  else if (under20 > 0) fail(`1b: ${under20} dilemmas shown under 20`);
  else ok(`1b: none shown under 20 over ${seasons['under 20']} seasons`);
  /* c */
  if (orderBreaks > 0) fail(`1c: ${orderBreaks} careers where what was shown is not exactly what the engine offered`);
  else ok(`1c: every one of ${offersTotal} offered dilemmas shown exactly once, in order`);
  /* d */
  if (doubleSeasons > 0) fail(`1d: ${doubleSeasons} seasons showed more than one dilemma`);
  else ok('1d: never two in one season');
  /* e */
  if (rivalShows < RIVAL_FLOOR) fail(`1e: rival dilemmas shown ${rivalShows} times, floor ${RIVAL_FLOOR}`);
  else ok(`1e: rival dilemmas shown ${rivalShows} times (floor ${RIVAL_FLOOR})`);
  /* f */
  if (crashes || deadEnds) fail(`1f: ${crashes} careers threw and ${deadEnds} dead ended`);
  else ok(`1f: ${CAREERS} careers ran to the end, ${choiceSeen.size} different dilemma choices taken without a throw`);
  /* g. a rule, not a band: every choice says what it did and Continue keeps
     all of it. The floor only proves the rule was exercised. */
  if (choicesMade < 100) fail(`1g: only ${choicesMade} choices made, too few to hold the rule`);
  else if (silentChoices > 0) fail(`1g: ${silentChoices} of ${choicesMade} choices wrote no outcome line`);
  else if (lostOnContinue > 0 || keptOnContinue !== choicesMade) fail(`1g: Continue kept ${keptOnContinue} of ${choicesMade} choices and lost ${lostOnContinue}`);
  else ok(`1g: all ${choicesMade} choices wrote their outcome and Continue kept every one`);
}

/* ======================= Section 2: rendered ======================= */
if (SECTIONS.includes('2')) {
  console.log('\n2) Rendered: src/test/careerDilemmaReach.test.tsx and src/test/careerDilemmaSaves.test.tsx, the real page played by its buttons');
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', TEMP: TMP, TMP };
  delete env.NO_DOUBLE_SWAP;
  if (CONTROL && PAGE_CONTROLS.includes(CONTROL)) {
    /* Inside src/pages under the gitignored __control_ prefix, removed in
       the finally below. */
    pageCopy = path.join(ROOT, 'src', 'pages', `__control_dilemmaReach_${process.pid}.tsx`);
    fs.writeFileSync(pageCopy, rewritePage(readLF(PAGE_FILE)));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/SoccerCareer': pageCopy.replaceAll('\\', '/') });
  } else if (CONTROL) {
    /* Inside src/lib so the engine's relative imports resolve, under the
       gitignored __control_ prefix, removed in the finally below. */
    controlCopy = path.join(ROOT, 'src', 'lib', `__control_dilemmaReach_${process.pid}.ts`);
    fs.writeFileSync(controlCopy, rewrite(readLF(ENGINE_FILE)));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/soccerCareerEngine': controlCopy.replaceAll('\\', '/') });
  }
  function findUp(rel) {
    for (let dir = ROOT; ; dir = path.dirname(dir)) {
      const p = path.join(dir, rel);
      if (fs.existsSync(p)) return p;
      if (path.dirname(dir) === dir) return null;
    }
  }
  const VITEST = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
  if (!VITEST) abort('vitest is not installed anywhere above this tree');
  const JSON_OUT = `${TMP}/vitest.json`;
  let run;
  try {
    run = spawnSync(process.execPath, [VITEST, 'run', 'src/test/careerDilemmaReach.test.tsx', 'src/test/careerDilemmaSaves.test.tsx', '--reporter=default', '--reporter=json', `--outputFile.json=${JSON_OUT}`],
      { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } finally {
    if (controlCopy) { fs.rmSync(controlCopy, { force: true }); controlCopy = null; }
    if (pageCopy) { fs.rmSync(pageCopy, { force: true }); pageCopy = null; }
  }
  const ESC = String.fromCharCode(27);
  const out = ((run.stdout || '') + (run.stderr || '')).split(new RegExp(ESC + '\\[[0-9;]*m', 'g')).join('');
  if (!fs.existsSync(JSON_OUT)) abort('vitest wrote no report, so nothing was checked:\n' + out.slice(-3000));
  if (/Failed to load|Cannot find module|Failed to resolve import|SyntaxError/.test(out)) abort('the rendered test did not load (a load error is not a check firing):\n' + out.slice(-3000));
  const reach = out.split('\n').map(l => l.trim()).filter(l => l.startsWith('REACH '));
  for (const l of reach) console.log('   ' + l);
  const report = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));
  const cases = (report.testResults || []).flatMap(f => f.assertionResults || []);
  /* 5 reach cases and 4 saves cases. Both files have to have run: a count
     short of 9 is a file that did not load, not a check that passed. */
  if (cases.length !== 9) abort(`the rendered tests reported ${cases.length} cases, expected 9:\n` + out.slice(-3000));
  for (const t of cases) {
    if (t.status === 'passed') ok(`2 ${t.title}`);
    else fail(`2 ${t.title} (${t.status}) ${(t.failureMessages || []).join(' ').split('\n')[0].slice(0, 300)}`);
  }
  const total = reach.find(l => l.startsWith('REACH total'));
  const adultShows = Number((total || '').match(/adultShows=(\d+)/)?.[1]);
  if (!Number.isFinite(adultShows)) fail('2: the rendered test printed no REACH total line, so its count cannot be read');
  else if (adultShows < RENDERED_BAND[0] || adultShows > RENDERED_BAND[1]) fail(`2: ${adultShows} dilemmas drawn on screen from 20 up, band [${RENDERED_BAND[0]}, ${RENDERED_BAND[1]}]`);
  else ok(`2: ${adultShows} dilemmas drawn on screen from 20 up, inside [${RENDERED_BAND[0]}, ${RENDERED_BAND[1]}]`);
  const unhandled = /Unhandled Errors?|Uncaught Exception|Unhandled Rejection/.test(out);
  if (unhandled) fail('2: vitest caught an unhandled error while running the rendered test');
  if (run.status !== 0 && !red.some(r => r.startsWith('2'))) fail(`2: vitest exited ${run.status} with every case passing`);
  console.log(`   vitest exit ${run.status}`);
}

cleanup();
console.log(`\nsimCareerDilemmaReach: ${red.length ? `${red.length} RED` : 'all green'}${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(red.length ? 1 : 0);
