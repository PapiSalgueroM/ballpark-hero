/**
 * Round 1327 harness: Soccer Career deals its event cards fairly, the papers
 * print their rarer stories, and the cards only narrate what happened.
 *
 * What the depth hunt found (hunt-sc.md, sc MAJOR 7, MINOR 21, POLISH 23, and
 * inventory-soccer-career.md 3.4, on 48cb9d4b):
 *   - The deck shuffled with [...eligible].sort(() => Math.random() - 0.5),
 *     which is not a fair shuffle: over the real catalog the first tenth of
 *     the cards came up 1.58 times as often as a fair pick, the last tenth
 *     0.61 times.
 *   - The paper sorted its eligible stories by weight after shuffling, so the
 *     weights were a ranking: a story under weight 1 could print only when no
 *     weight 1 story qualified, and "REDEMPTION" (1.3) printed after every good
 *     season once you had been to prison.
 *   - SOCIAL MEDIA SENSATION checked followers >= 1000000 on a field held in
 *     millions: it needed a trillion followers.
 *   - Headlines printed position codes as nouns ("The Best ST In The World")
 *     and tails like "In Major signing".
 *   - Cards narrated a season the saved row did not hold: a late winner in a
 *     season with no goals, Player of the Month with no award, a hamstring
 *     that was not in the row, a sacking with no finish behind it, "Dropped!"
 *     whatever the appearances, a call up the call up rule refuses.
 *
 * THE SECTIONS
 *   1  THE DECK. One mid career save with no priority beat due, 40,000 draws
 *      through the real generateRandomEvents, each under its own player name
 *      (the deck key's only moving part; a name whose catalog is not the
 *      save's, because Round 1350's routines rotate with the player's
 *      identity, is set aside). Math.random replays one fixed seed
 *      for exactly the calls the catalogs make while the deck builds them, so
 *      their own random gates resolve alike in every trial, and runs on a
 *      fresh per trial stream after that (so an old shuffle shows its bias
 *      instead of repeating one batch). Per tenth of the eligible list in
 *      catalog order: the observed pick rate over the fair rate, inside
 *      0.9 to 1.1. Single cards are printed, not asserted (a max is noise).
 *   2  THE PAPER. A season where a weight 0.5 and a weight 1 story both
 *      qualify and the column takes the second slot (one story): the 0.5
 *      story prints at 0.44 to 0.56 of the weight 1 story's rate, 40,000
 *      draws (readings beside PAPER_BAND).
 *      Across the fleet of section 4 the stories under weight 1 print.
 *   3  KEYED. On 200 mid career saves from the fleet, the deck makes exactly
 *      the Math.random calls the catalog build makes on its own, and the
 *      batch is the same under two different streams after the build; the
 *      paper's chosen stories are the same under two different seeds. The
 *      keys hold the season: 100 saves dealt eight seasons running with
 *      only the year moved deal six or more different batches (all but 5
 *      percent of saves), and print more than one story (all but a quarter
 *      of the saves where two or more qualify).
 *   4  GATES. Over the fleet (simCareerLifeCooldowns' drive, 500 careers),
 *      every batch holding a card that narrates the season sits in a season
 *      whose last row holds that fact, read here by this file's own rules;
 *      each of those cards but 17 fires; 17 never fires. Fixed rows the
 *      fleet cannot be relied on to reach are asked of the engine and of
 *      these rules directly: a season before the Puskas Award, and a bad
 *      finish or a short season at a loan club he has since left, and
 *      half a season in divisions of 18 and 24 clubs.
 *   5  SENSATION. The headline prints in the fleet, and only at a million
 *      followers or more (the figure it prints ends in M).
 *   6  WORDING. Every story the paper can print, rendered for every position:
 *      no bare position code in a headline or a body, no "In <lower case>"
 *      tail in a headline, and no story calls an uncapped player "the
 *      <nation> international" (a capped one still is).
 *   7  PREFIX AND OLD SAVES. 200 careers driven on the base bundle and on
 *      this one with the same seeded Math.random agree, save and call count,
 *      step by step, until the first step that runs the paper or the deck,
 *      and that step's new season row is byte equal. Saves the base wrote
 *      with cards 1, 4, 7, 9, 11, 12, 15, 17, 18 and 19 on screen, one in the
 *      newspaper and one in a transfer window load here (JSON, repairCareer)
 *      and every choice answers without a throw, keeps the ledger's shape and
 *      adds no save field; an old card 17 records the debut year and age.
 *   8  THE INVERSE. scripts/lib/careerDeckFair1327.mjs applied in order to
 *      this engine gives the base's engine byte for byte (sha256 printed and
 *      asserted), and every hunk of the diff against the base sits inside
 *      the regions the brief gives this round (the imports, the dilemma
 *      comment, pickN, generateNewsArticles, the 40 inline cards, the new
 *      helpers and generateRandomEvents).
 *   9  FACES. Card 11 (its face and the log line its first choice writes)
 *      and INJURY BLOW, rendered for every injury careerEras.ts can put in
 *      a row, name that injury with "a" or "an" as it is said; across the
 *      fleet every card 11, 12, 15 and 19 dealt and every INJURY BLOW and
 *      move story printed says what its row holds (the injury, the finish,
 *      the league games, the tournament, a loan or not, the club).
 *
 * MEASURED: see docs/audits/ROUND-1327-NOTES.md, updated every step.
 *
 * NEGATIVE CONTROLS (SIM_SOCCER_DECK_FAIRNESS_CONTROL), each on a COPY of the
 * engine. Text not in the file exactly once refuses to run; the last line says
 * FIRED (its section failed) or DID NOT FIRE, and both exit 1.
 *   shuffle    the old sort shuffle back in front of the pick: section 1.
 *   ranking    the paper keeps only its top weight again: section 2.
 *   globalpick the deck and the paper draw from Math.random: section 3.
 *   keyseason  the deck's key loses the season: section 3.
 *   newsyear   the paper's key loses the year: section 3.
 *   nogate     the row gate line out of the deck's filter: section 4.
 *   puskas     card 7 forgets the award's first season: section 4 (fixed rows).
 *   loanclub   card 12 forgets the row must be his club's: section 4 (fixed rows).
 *   unit       the sensation check back to 1000000: section 5.
 *   poscode    the paper prints the raw position code: section 6.
 *   uncapped   the booed story calls an uncapped player an international: section 6.
 *   prefix     one extra Math.random call in the youth year: section 7.
 *   olddebut   an old card 17 no longer records the debut: section 7.
 *   outside    one constant of the transfer market changes: section 8.
 *   injlog     card 11 logs a hamstring whatever the row holds: section 9.
 *   injblow    INJURY BLOW names one fixed injury: section 9.
 *
 * Run: node scripts/simSoccerDeckFairness.mjs [careers]   (default 200, so 500)
 *      SEED_OFFSET=1 node scripts/simSoccerDeckFairness.mjs   another draw
 * Reads no network: the bundle is local, offlineTransport blocks sockets.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { inverseDeckFair, DECK_FAIR_ADDITIONS, DECK_FAIR_BASE_SHA256, DECK_FAIR_HEAD_SHA256 } from './lib/careerDeckFair1327.mjs';
/* Round 1329 edits the engine after this round (the month award, the tournament lines): section 8 takes that off
   first with the eighth inverse, then proves the seventh against its own pinned head and base. */
import { inverseWorldTruth, worldTruthReceiptProblem, WORLD_TRUTH_ADDITIONS } from './lib/careerWorldTruth1329.mjs';
/* Round 1334 adds three engine lines after both (the soccer deck's gate import, its catalog spread, its slot): section 8
   takes the ninth inverse off first, then the eighth, then proves the seventh. */
import { inverseSoccerDeck, soccerDeckReceiptProblem, SOCCER_DECK_ADDITIONS } from './lib/careerSoccerDeck1334.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* The tree this round was cut from. Section 7 bundles it from git.
   Release BH's join (Round BHH): PR275 changes the engine outside this round's regions (the rival veteran wage), so
   the base is now 31699c2b, which is c9c77eba with exactly PR275's engine change, recorded in this branch's history
   by an ours merge. Its engine differs from the engine with Round 1329 taken off by Round 1327 alone; the rows are
   unchanged and the two pins in scripts/lib/careerDeckFair1327.mjs moved with it. */
const BASE = '31699c2b0e77a1e46872e5f8c9d634e68007c7d6';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const CONTROL = process.env.SIM_SOCCER_DECK_FAIRNESS_CONTROL || '';
const SEED_OFFSET = Number(process.env.SEED_OFFSET || 0) * 100000;
const N = Math.max(60, Number(process.argv[2] || 200));
const TRIALS = 40000;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1327-fairness-'));

let failures = 0;
let SECTION = '0';
const failedSections = new Set();
const perSection = new Map();
const fail = m => {
  failures += 1; failedSections.add(SECTION);
  const n = (perSection.get(SECTION) || 0) + 1;
  perSection.set(SECTION, n);
  if (n <= 14) console.error(`  FAIL (section ${SECTION}): ${m}`);
  else if (n === 15) console.error(`  FAIL (section ${SECTION}): ... further failures in this section counted, not printed`);
};
const r3 = v => Math.round(v * 1000) / 1000;

/* ─── the controls ─────────────────────────────────────────────────────── */

const YOUTH = '  const s = repairCareer({ ...prev }); s.age += 1; s.story = archiveSeasonStory(s); s.events = [];\n  receivePhoneTexts(s, "youth");';
const CONTROLS = {
  shuffle: { breaks: '1', note: 'the deck shuffles with a sort on Math.random and takes the front of it again',
    edits: [['  return takeFresh(eligible, count, null, 0, 0, [], rng);', '  return takeFresh([...eligible].sort(() => Math.random() - 0.5), count, null, 0, 0, [], () => 0);']] },
  ranking: { breaks: '2', note: 'the paper keeps only its top weight stories, as the old ranking did',
    edits: [['  const pool = [...eligible];', '  const pool = [...eligible].filter((t, i, all) => t.weight === Math.max(...all.map(x => x.weight)));']] },
  globalpick: { breaks: '3', note: 'the deck and the paper draw from Math.random instead of their keyed streams',
    edits: [['  const rng = keyedRng(key);', '  const rng = Math.random;'],
      ['  const rng = keyedRng(`${soccerDeckIdentity(s)}|${season.year}|news`);', '  const rng = Math.random;']] },
  keyseason: { breaks: '3', note: 'the deck\'s key loses the season, so a career deals one batch every season',
    edits: [['  const picked = drawEventBatch(eligible, `${soccerDeckIdentity(state)}|${season}|deck`);', '  const picked = drawEventBatch(eligible, `${soccerDeckIdentity(state)}|deck`);']] },
  newsyear: { breaks: '3', note: 'the paper\'s key loses the year, so a career prints one story every season',
    edits: [['  const rng = keyedRng(`${soccerDeckIdentity(s)}|${season.year}|news`);', '  const rng = keyedRng(`${soccerDeckIdentity(s)}|news`);']] },
  nogate: { breaks: '4', note: 'the deck no longer asks whether a card fits the season just played',
    edits: [['    if (!cardFitsSeason(e.id, state)) return false;\n', '']] },
  puskas: { breaks: '4', note: 'card 7 deals a Puskas nominated goal in any season with goals, before the award existed too',
    edits: [['    case 7: return row.goals > 0 && row.year >= 2008;', '    case 7: return row.goals > 0;']] },
  loanclub: { breaks: '4', note: 'card 12 deals a sacking at a loan club he has already left',
    edits: [['    case 12: return row.club === state.currentClub && typeof row.leagueFinish', '    case 12: return typeof row.leagueFinish']] },
  unit: { breaks: '5', note: 'the sensation story needs 1000000 on a field held in millions again',
    edits: [['check: () => s.socialMediaFollowers >= 1,', 'check: () => s.socialMediaFollowers >= 1000000,']] },
  poscode: { breaks: '6', note: 'the paper prints the raw position code',
    edits: [['  const posWord = POSITION_WORDS[pos] ?? "Player";', '  const posWord = pos;']] },
  uncapped: { breaks: '6', note: 'the booed story calls every player "the <nation> international" again, caps or not',
    edits: [['The ${s.nationality} ${s.intStats.caps > 0 ? "international" : posLower} looked visibly shaken', 'The ${s.nationality} international looked visibly shaken']] },
  prefix: { breaks: '7', note: 'one extra Math.random call in every youth year, before any paper or deck',
    edits: [[YOUTH, YOUTH.replace('\n', '\n  Math.random();\n')]] },
  olddebut: { breaks: '7', note: 'an old card 17 answered from a save no longer records the debut',
    edits: [['s.intStats = { ...s.intStats, debutYear: eventSeasonIndex(s), debutAge: s.age }; ', '']] },
  injlog: { breaks: '9', note: 'card 11 logs a serious hamstring injury again, whatever the row holds',
    edits: [['`🏥 Took time to recover from ${injury ? withArticle(lowerFirst(injury)) : "an injury"}: Pace -2`', '"🏥 Serious hamstring injury: Pace -2"']] },
  injblow: { breaks: '9', note: 'INJURY BLOW names one fixed injury, whatever the row holds',
    edits: [['headline: `INJURY BLOW: ${name} Out For Weeks With ${injury}`,', 'headline: `INJURY BLOW: ${name} Out For Weeks With Hamstring Tear`,']] },
  outside: { breaks: '8', note: 'one constant of the transfer market changes, outside this round\'s hunks',
    edits: [['export const LEAGUE_DRAW_CAP = 5;', 'export const LEAGUE_DRAW_CAP = 6;']] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_SOCCER_DECK_FAIRNESS_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let controlSource = null;
if (CONTROL) {
  let src = fs.readFileSync(path.join(ROOT, ENGINE), 'utf8').replace(/\r\n/g, '\n');
  for (const [from, to] of CONTROLS[CONTROL].edits) {
    const hits = src.split(from).length - 1;
    if (hits !== 1) { console.error(`control cannot run: ${ENGINE} holds the ${CONTROL} control's text ${hits} times, it must be exactly once`); process.exit(1); }
    src = src.replace(from, () => to);
  }
  controlSource = src;
  fs.writeFileSync(path.join(TMP, `${CONTROL}.control.ts`), src);
  console.log(`NEGATIVE CONTROL ON: ${CONTROLS[CONTROL].note} (section ${CONTROLS[CONTROL].breaks} must fail)`);
}

/* ─── bundle ───────────────────────────────────────────────────────────── */

/* Three marks are added to every copy of the engine, base and head alike,
   none of which draws: a counter in the deck and in the paper (so section 7
   knows which step ran them), the paper's story table left on globalThis
   (section 6 renders every story), and an export of both functions (the
   base did not export them). Each mark must find its line exactly once. */
const MARKS = [
  /* the deck counts only once it is past its youth guard, which returns before any draw */
  [/(\n  if \(state\.age < 17\) return \[\];)/,
    '$1 globalThis.__r1327Ran = (globalThis.__r1327Ran || 0) + 1;'],
  [/(\nfunction generateNewsArticles\(s: CareerState, season: SeasonRecord, totalGoals: number, totalApps: number\): NewsArticle\[\] \{)/,
    '$1 globalThis.__r1327Ran = (globalThis.__r1327Ran || 0) + 1;'],
  [/(\n  const eligible = templates\.filter\(t => t\.check\(\)\);)/, '\n  globalThis.__r1327Templates = templates;$1\n  globalThis.__r1327Seen?.(templates, eligible, season);'],
];
function mark(source) {
  let out = source;
  for (const [re, to] of MARKS) {
    const hits = (out.match(new RegExp(re.source, 'g')) || []).length;
    assert.equal(hits, 1, `the harness mark ${re.source.slice(0, 50)} must find its line exactly once`);
    out = out.replace(re, to);
  }
  return `${out}\nexport { generateRandomEvents as __r1327Deck, generateNewsArticles as __r1327News };\n`;
}
async function bundle(tag, { ref = null, control = null, truthOut = null } = {}) {
  let hits = 0;
  const plugin = { name: 'r1327-source', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      let source = ref
        ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n')
        : fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
      if (control && rel === ENGINE) { source = control; hits += 1; }
      if (truthOut) source = inverseWorldTruth(rel, source, truthOut);
      if (rel === ENGINE) source = mark(source);
      return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({
    stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  });
  if (control) assert.equal(hits, 1, 'the control copy of the engine was loaded exactly once');
  return (await import(pathToFileURL(out).href)).engine;
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear(),
};
const E = await bundle('head', { control: controlSource });
const B = await bundle('base', { ref: BASE });
/* Round 1329 changes the month award, the phone's world and the season log after this round, on purpose, before any
   paper or deck runs: section 7's lockstep with the base reads this tree with Round 1329 taken out (the eighth
   inverse, scripts/lib/careerWorldTruth1329.mjs), every row of every file it loads once, in order. */
const truthOutReceipt = [];
const E7 = await bundle('head-1329out', { control: controlSource, truthOut: truthOutReceipt });
assert.equal(worldTruthReceiptProblem(truthOutReceipt), '', 'section 7\'s bundle takes Round 1329 out of every file it loads, once, in order');

/* ─── seeded streams ───────────────────────────────────────────────────── */

const seeded = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** Runs fn with Math.random counting its calls: `first` calls from one
 *  stream, every call after that from `then` (when given). */
function withStream(fn, first, then = null, prefixCalls = Infinity) {
  const real = Math.random;
  let calls = 0;
  Math.random = () => { calls += 1; return (then && calls > prefixCalls) ? then() : first(); };
  try { return { value: fn(), calls }; } finally { Math.random = real; }
}
const copy = v => JSON.parse(JSON.stringify(v));
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/* ─── the facts a narrating card states, read by this file's own rules ───
   Never asked of the engine: section 4 must catch an engine that agrees with
   itself about a fact the row does not hold. FULL_SEASON is the top of the
   league appearance band, checked against projectLeagueApps below. */
const FULL_SEASON = 38;
const GATED = [1, 4, 7, 9, 11, 12, 15, 17, 18, 19];
function factsOf(M, s) {
  const row = s.seasons[s.seasons.length - 1];
  const g = v => !!(row && row.type === 'playing' && v);
  const wc = row ? M.tournamentForYear(s.nationality, row.year) : null;
  return {
    1: g(row?.goals > 0),
    4: g((s.awards || []).some(a => a.name === 'Player of the Month' && a.year === row?.year)),
    /* the Puskas Award was first given in 2009, for a goal of the 2008/09 season */
    7: g(row?.goals > 0 && row.year >= 2008),
    9: g(row?.redCards > 0),
    11: g(typeof row?.injury === 'string' && row.injury.length > 0),
    12: g(row?.club === s.currentClub && Number.isFinite(row?.leagueFinish) && Number.isFinite(row?.leagueSize) && row.leagueFinish * 3 > row.leagueSize * 2),
    /* under half the division's league games: two against every other club when the row holds its size */
    15: g(row?.club === s.currentClub && Number.isFinite(row?.leagueApps)
      && row.leagueApps * 2 < (Number.isFinite(row.leagueSize) && row.leagueSize > 1 ? 2 * (row.leagueSize - 1) : FULL_SEASON)),
    17: false,
    18: g(row?.intApps > 0 && row?.intGoals > 0 && !s.seasons.slice(0, -1).some(r => (r.intApps ?? 0) > 0)),
    19: g(wc && wc.kind === 'World Cup' && row.tournament === wc.name && row.tournamentResult === 'Not Selected'),
  };
}

/* ─── the fleet: simCareerLifeCooldowns' drive ─────────────────────────── */

const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];

/** One move of the drive's policy, the same for every bundle. */
function step(M, s, seed, loyal, clubs) {
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
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = preferHome(s.pendingOffers); return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': {
      const ev = s.pendingEvents && s.pendingEvents[0];
      if (!ev) return { ...s, pendingEvents: [], phase: 'playing' };
      return M.applyEventChoice(s, (seed + ev.id + s.seasons.length) % Math.max(1, ev.choices.length), clubs);
    }
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': {
      const post = !s.socialMediaActionUsedThisSeason && s.seasons.length % 3 === 0;
      let t = post ? M.applySocialMediaAction(s, seed % 2 ? 'viral_celebration' : 'training_video') : M.dismissSocialMediaPhase(s, clubs);
      if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs);
      return t;
    }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': {
      const won = s.pendingWorldCup && s.pendingWorldCup.result === 'Winner';
      return won ? M.applyWorldCupSpeech(s, 'for_the_country', clubs) : M.dismissWorldCup(s, clubs);
    }
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': { const b = s.pendingBallonDor; return b && b.playerRank === 1 ? M.applyBdorSpeech(s, 'tears', clubs) : M.dismissBallonDor(s, clubs); }
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (!sit || sit.type === 'no_interest') return M.stayAtClub(s);
      if (loyal && sit.type !== 'contract_expiry') return M.stayAtClub(s);
      if (sit.type === 'one_offer') return seed % 2 === 0 ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      if (sit.type === 'bidding_war') return M.acceptOffer(s, sit.offerA);
      if (sit.type === 'dream_club') return M.acceptOffer(s, sit.offer);
      if (sit.type === 'contract_expiry') { if (loyal) return M.signExtension(s); const o = preferHome(sit.offers); return o ? M.acceptOffer(s, o) : M.stayAtClub(s); }
      if (sit.type === 'request_result') return sit.offer ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      return M.stayAtClub(s);
    }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
const startOf = (M, seed, mode) => {
  const startOvr = mode === 'elite' ? 68 : 40 + (seed % 30);
  return M.initCareer(`Sim ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020s', stats(startOvr), startOvr, 2020, M.FALLBACK_CLUBS, null, mode === 'elite' ? 99 : undefined);
};
const COHORTS = [['ordinary', 0], ['elite', 90000], ['loyal', 40000]];
const fleetSeeds = () => {
  const out = [];
  for (let i = 0; i < N; i += 1) for (const [mode, offset] of COHORTS) if (mode !== 'loyal' || i < Math.ceil(N * 0.5)) out.push([i + offset, mode]);
  return out;
};

/** For section 9: what the narrating cards of a fresh batch print and the row they were dealt for. Card 11's first
 *  choice is applied to a copy under a stream of its own, so the fleet's stream does not move. */
function facesOf(s) {
  const row = s.seasons[s.seasons.length - 1] || {};
  const faces = {};
  for (const ev of s.pendingEvents || []) {
    if (![11, 12, 15, 19].includes(ev.id)) continue;
    faces[ev.id] = { text: ev.description };
    if (ev.id === 11) faces[11].log = withStream(() => { const a = ev.choices[0].apply(copy(s)); return a.events[a.events.length - 1]; }, seeded(7)).value;
  }
  return { faces, row: { injury: row.injury ?? null, leagueFinish: row.leagueFinish, leagueApps: row.leagueApps, tournament: row.tournament ?? null } };
}

function driveFleetCareer(M, seed, mode) {
  const real = Math.random;
  Math.random = seeded(seed + SEED_OFFSET + 1);
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = startOf(M, seed, mode);
    const batches = [], papers = [];
    let prevPhase = s.phase, playing = 0, midSave = null;
    for (let guard = 0; guard < 400 && !s.retired; guard += 1) {
      if (s.phase === 'random_events' && prevPhase !== 'random_events' && prevPhase !== 'red_card_appeal_result') {
        batches.push({ ids: s.pendingEvents.map(e => e.id), facts: factsOf(M, s), year: s.seasons[s.seasons.length - 1]?.year, ...facesOf(s) });
        if (!midSave && playing >= 3 && playing <= 6) midSave = copy(s);
      }
      if (s.phase === 'newspaper' && prevPhase !== 'newspaper') {
        const row = s.seasons[s.seasons.length - 1] || {};
        papers.push({ news: (s.pendingNews || []).map(a => ({ headline: a.headline, body: a.body })), followers: s.socialMediaFollowers,
          row: { injury: row.injury ?? null, onLoanFrom: row.onLoanFrom ?? null, club: row.club } });
      }
      prevPhase = s.phase;
      if (s.phase === 'playing') playing += 1;
      const next = step(M, s, seed, mode === 'loyal', clubs);
      if (!next) break;
      s = next;
    }
    return { batches, papers, midSave, playing };
  } finally { Math.random = real; }
}

/* ─── the paper's stories, read off the engine's source ────────────────── */

/* Each story's weight and the longest fixed run of each headline it can
   print (a story may choose between headlines), which is how a printed
   headline is traced back to its story. A story starts at a line that opens
   with "{ weight:"; its headlines are the template strings between its first
   mention of a headline and its body. */
function parseTemplates(source) {
  const start = source.indexOf('const templates: Template[] = [');
  const end = source.indexOf('\n  ];', start);
  assert.ok(start > 0 && end > start, 'the paper\'s story table was not found in the engine');
  const chunks = source.slice(start, end).split(/\n {4}(?=\{ weight: )/).slice(1);
  return chunks.map(chunk => {
    const weight = Number(chunk.match(/^\{ weight: ([\d.]+),/)[1]);
    const from = chunk.search(/headline/), to = chunk.indexOf('body:', from);
    const region = from >= 0 ? chunk.slice(from, to > from ? to : undefined) : '';
    const headlines = [...region.matchAll(/`((?:[^`\\]|\\.)*)`/g)].map(m => m[1]);
    const fragments = headlines.map(h => h.split(/\$\{[^}]*\}/).map(p => p.trim()).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '');
    return { weight, fragments, fragment: fragments[0] || '', headline: headlines.join(' | ') };
  });
}
/* controlSource is already read with LF line endings */
const ENGINE_SOURCE = controlSource ?? fs.readFileSync(path.join(ROOT, ENGINE), 'utf8').replace(/\r\n/g, '\n');
const TEMPLATES = parseTemplates(ENGINE_SOURCE);
const storyOf = headline => TEMPLATES.findIndex(t => t.fragments.some(f => f && headline.includes(f)));
const lightTemplates = TEMPLATES.filter(t => t.weight < 1);
console.log(`The paper holds ${TEMPLATES.length} stories, ${lightTemplates.length} of them under weight 1`);
{
  const frags = TEMPLATES.flatMap(t => t.fragments);
  if (TEMPLATES.some(t => !t.fragments.length || t.fragments.some(f => !f))) throw new Error('a story in the table has no headline this harness can read');
  frags.forEach((f, i) => frags.forEach((g, j) => { if (i !== j && g.includes(f)) throw new Error(`story fragments collide: "${f}" inside "${g}"`); }));
}
assert.equal(E.projectLeagueApps(99, 1, '', 0).max, FULL_SEASON, 'the top of the league appearance band moved: re-read FULL_SEASON');

/* ─── the fleet ────────────────────────────────────────────────────────── */

console.log(`Driving the fleet: ${N} ordinary, ${N} elite and ${Math.ceil(N * 0.5)} loyal careers through the real engine`);
const fleet = [];
let crashes = 0;
/* While the fleet plays, every paper reports which stories qualified: a fair
   draw of one story prints story i with chance w_i over the qualifying
   weights, so `expectedPrints` is what each story should have printed. */
const expectedPrints = new Array(TEMPLATES.length).fill(0);
const qualified = new Array(TEMPLATES.length).fill(0);
let tableMismatch = 0;
globalThis.__r1327Seen = (templates, eligible) => {
  if (templates.length !== TEMPLATES.length || templates.some((t, i) => t.weight !== TEMPLATES[i].weight)) { tableMismatch += 1; return; }
  const W = eligible.reduce((a, t) => a + t.weight, 0);
  for (const t of eligible) { const i = templates.indexOf(t); qualified[i] += 1; expectedPrints[i] += t.weight / W; }
};
for (const [seed, mode] of fleetSeeds()) {
  try { fleet.push(driveFleetCareer(E, seed, mode)); }
  catch (err) { crashes += 1; if (crashes <= 2) console.error(`   ${mode} ${seed} crashed: ${err && err.stack}`); }
}
globalThis.__r1327Seen = undefined;
if (tableMismatch) throw new Error(`the story table read off the source disagrees with the engine's in ${tableMismatch} papers`);
const allBatches = fleet.flatMap(c => c.batches);
const allPapers = fleet.flatMap(c => c.papers);
console.log(`   ${fleet.length} careers, ${fleet.reduce((a, c) => a + c.playing, 0)} playing seasons, ${allBatches.length} batches, ${allPapers.length} papers, ${crashes} crashes`);

/* ─── 1. the deck ──────────────────────────────────────────────────────── */

SECTION = '1';
console.log('1) The deck: 40,000 keyed draws, every tenth of the eligible list at its fair rate');
if (crashes > 0) fail(`${crashes} fleet careers crashed`);
{
  const deck = E.__r1327Deck;
  const S = 777;
  /* A save with no beat due: no card in every one of 64 test draws, no batch over four. */
  let base = null;
  for (const c of fleet) {
    if (!c.midSave) continue;
    const probe = new Map();
    let big = false;
    for (let t = 0; t < 64; t += 1) {
      const st = { ...c.midSave, playerName: `Probe ${t}` };
      const K = withStream(() => E.getAllEvents({ ...st }), seeded(S)).calls;
      const ids = withStream(() => deck({ ...st }), seeded(S), seeded(5e6 + t), K).value.map(e => e.id);
      if (ids.length > 4) big = true;
      for (const id of ids) probe.set(id, (probe.get(id) || 0) + 1);
    }
    if (!big && ![...probe.values()].some(v => v === 64)) { base = c.midSave; break; }
  }
  if (!base) fail('no mid career save in the fleet is free of priority beats');
  else {
    const before = JSON.stringify(base);
    const catalogIds = withStream(() => E.getAllEvents({ ...base }), seeded(S)).value.map(e => e.id);
    const counts = new Map();
    let picks = 0;
    /* Release BF join: Round 1350's between season routines rotate with the player's identity, so a new name can also
       change which cards are in the catalog. A trial counts only when its catalog is the save's own, so every counted
       draw is over the one eligible list the tenths are read against; on a tree where the name moves nothing but the
       key, no name is set aside and the trials are exactly the ones before. */
    const catalogKey = catalogIds.join();
    let names = 0, setAside = 0;
    for (let t = 0; t < TRIALS; names += 1) {
      if (names >= TRIALS * 40) { fail(`only ${t} of ${names} player names kept the save's catalog`); break; }
      const st = { ...base, playerName: `Deck ${names}` };
      const built = withStream(() => E.getAllEvents({ ...st }), seeded(S));
      if (built.value.map(e => e.id).join() !== catalogKey) { setAside += 1; continue; }
      const K = built.calls;
      const ids = withStream(() => deck({ ...st }), seeded(S), seeded(1e6 + t + SEED_OFFSET), K).value.map(e => e.id);
      for (const id of ids) { counts.set(id, (counts.get(id) || 0) + 1); picks += 1; }
      t += 1;
    }
    console.log(`   ${setAside} of ${names} player names set aside because their catalog is not the save's (the routine rotation)`);
    if (JSON.stringify(base) !== before) fail('the draws wrote into the save they were handed');
    const eligible = catalogIds.filter(id => counts.has(id));
    const k = eligible.length;
    console.log(`   save: ${base.position}, age ${base.age}, ${base.seasons.length} rows; ${k} eligible cards, ${picks} picks over ${TRIALS} draws (${r3(picks / TRIALS)} a draw)`);
    if (picks < TRIALS * 2) fail(`only ${picks} picks in ${TRIALS} draws: a batch is 2 to 4 cards`);
    if (k < 50) fail(`only ${k} cards were eligible, too few to read tenths`);
    const ratios = [];
    for (let tenth = 0; tenth < 10; tenth += 1) {
      const ids = eligible.filter((id, i) => Math.floor((i * 10) / k) === tenth);
      const got = ids.reduce((a, id) => a + counts.get(id), 0) / picks;
      const fair = ids.length / k;
      ratios.push(r3(got / fair));
      if (got / fair < 0.9 || got / fair > 1.1) fail(`tenth ${tenth + 1} (${ids.length} cards, ids ${ids[0]} to ${ids[ids.length - 1]}) is drawn ${r3(got / fair)} times its fair rate`);
    }
    const single = eligible.map(id => (counts.get(id) / picks) * k);
    console.log(`   per tenth, observed over fair: ${ratios.join(', ')}; single cards ${r3(Math.min(...single))} to ${r3(Math.max(...single))} (reported, not asserted)`);
  }
}

/* ─── 2. the paper ─────────────────────────────────────────────────────── */

SECTION = '2';
console.log('2) The paper: a weight 0.5 story prints at half the rate of a weight 1 story');
/* Measured on the runner (r1327-g1, head d50c85d4) at seed offsets 0 to 4: 0.490, 0.480, 0.491, 0.493 and 0.489,
   sd about 0.008 a run; on the base (the weight ranking) 0. The band keeps at least five sd from each edge: the lowest
   reading 0.480 sits 0.040 above 0.44, the highest 0.493 sits 0.067 below 0.56.
   Why all five read under 0.5 (review 2026-10-13): the five offsets share one key family (Paper n, one era, nation,
   position and year), and that family's draws happen to sit low. A probe of keyedRng's first output over the same
   family at four years reads 0.4916 (the year this section's save holds: 0.488, 0.481, 0.501, 0.502, 0.486), 0.4984, 0.5024 and 0.5048,
   0.4993 over all twenty, and its first output is flat over 20 bins (chi square 6.7 to 30 on 19 df): noise, not bias. */
const PAPER_BAND = [0.44, 0.56];
const HALF = 'Reveals Secret To Success';
const ONE = 'Named In Team Of The Season';
const midOf = fleet.find(c => c.midSave)?.midSave;
const paperCase = () => {
  const s = copy(midOf);
  Object.assign(s, {
    overall: 82, popularity: 65, morale: 60, personality: 'professor', marketValue: 10, contractYearsLeft: 3,
    weeklyWage: 50000, socialMediaFollowers: 0.5, age: 26, rival: null, purchasedItems: [], corruptionHeat: 0,
    dirtyMoney: 0, bdorSnubFuel: false, isFinalSeason: false, isLeader: false,
    intStats: { ...s.intStats, isCaptain: false }, family: { ...(s.family || {}), children: 0 },
  });
  const season = { ...s.seasons[s.seasons.length - 1], rating: 7.9, goals: 1, apps: 30, cleanSheets: 0, yellowCards: 1, redCards: 0, intApps: 0 };
  return { s, season };
};
{
  const { s, season } = paperCase();
  E.__r1327News({ ...s }, season, 50, 200);
  const eligible = (globalThis.__r1327Templates || []).filter(t => t.check());
  const live = eligible.map(t => t.gen ? t.weight : 0);
  const has = frag => TEMPLATES.some(t => t.headline.includes(frag));
  if (!has(HALF) || !has(ONE)) fail('the two stories this section reads are gone from the table');
  let half = 0, one = 0, other = 0;
  for (let t = 0; t < TRIALS; t += 1) {
    const out = E.__r1327News({ ...s, playerName: `Paper ${t + SEED_OFFSET}` }, season, 50, 200);
    const story = out.filter(a => !a.headline.startsWith('THE COLUMN'));
    if (story.length !== 1) { fail(`a paper with the column printed ${story.length} stories, not 1`); break; }
    if (story[0].headline.includes(HALF)) half += 1; else if (story[0].headline.includes(ONE)) one += 1; else other += 1;
  }
  const ratio = one ? half / one : 0;
  const sd = one && half ? ratio * Math.sqrt(1 / half + 1 / one) : 0;
  console.log(`   ${eligible.length} stories eligible (weights ${live.join(' ')}); over ${TRIALS} papers the 0.5 story printed ${half} times, the weight 1 story ${one}, others ${other}: ratio ${r3(ratio)} (sd ${r3(sd)})`);
  if (ratio < PAPER_BAND[0] || ratio > PAPER_BAND[1]) fail(`the weight 0.5 story prints at ${r3(ratio)} of the weight 1 story's rate, outside ${PAPER_BAND.join(' to ')}`);
  /* the fleet: every story under weight 1 that the fleet's papers could print */
  const printed = new Map();
  let redemption = 0;
  for (const p of allPapers) for (const a of p.news) {
    const i = storyOf(a.headline);
    if (i >= 0) printed.set(i, (printed.get(i) || 0) + 1);
    if (a.headline.includes('Is Officially BACK')) redemption += 1;
  }
  /* A story under weight 1 whose fair share of the fleet's papers is 10 or
     more must print at least once (a Poisson count of 10 is 0 about once in
     22,000); the rest are reported with how often they even qualified. */
  const light = TEMPLATES.map((t, i) => ({ t, n: printed.get(i) || 0, q: qualified[i], e: expectedPrints[i] })).filter(x => x.t.weight < 1);
  const seenLight = light.reduce((a, x) => a + x.n, 0), dueLight = light.reduce((a, x) => a + x.e, 0);
  console.log(`   the fleet's ${allPapers.length} papers printed ${light.filter(x => x.n > 0).length} of the ${light.length} stories under weight 1, ${seenLight} prints against a fair ${r3(dueLight)}; REDEMPTION ${redemption} times`);
  console.log(`   under weight 1 (weight printed/fair/qualified): ${light.map(x => `${x.t.fragment.slice(0, 24)} ${x.t.weight} ${x.n}/${r3(x.e)}/${x.q}`).join('; ')}`);
  for (const x of light) if (x.e >= 10 && x.n === 0) fail(`the story "${x.t.fragment}" (weight ${x.t.weight}) qualified in ${x.q} papers with a fair share of ${r3(x.e)} prints and never printed`);
  if (dueLight > 50 && (seenLight / dueLight < 0.8 || seenLight / dueLight > 1.2)) fail(`the stories under weight 1 printed ${seenLight} times against a fair ${r3(dueLight)}`);
}

/* ─── 3. keyed ─────────────────────────────────────────────────────────── */

SECTION = '3';
console.log('3) Keyed: the deck and the paper draw nothing from the global stream');
{
  const saves = fleet.map(c => c.midSave).filter(Boolean).slice(0, 200);
  let extra = 0, moved = 0, paperMoved = 0;
  saves.forEach((save, i) => {
    const X = 9000 + i;
    const K = withStream(() => E.getAllEvents({ ...save }), seeded(X)).calls;
    const run = withStream(() => E.__r1327Deck({ ...save }), seeded(X));
    if (run.calls !== K) extra += 1;
    const a = withStream(() => E.__r1327Deck({ ...save }), seeded(X), seeded(31 + i), K).value.map(e => e.id).join(',');
    const b = withStream(() => E.__r1327Deck({ ...save }), seeded(X), seeded(77777 + i), K).value.map(e => e.id).join(',');
    if (a !== b) moved += 1;
    const row = save.seasons[save.seasons.length - 1];
    const goals = save.seasons.reduce((n, r) => n + (r.goals || 0), 0);
    const apps = save.seasons.reduce((n, r) => n + (r.apps || 0), 0);
    const chosen = seed => withStream(() => E.__r1327News(copy(save), { ...row }, goals, apps), seeded(seed)).value
      .filter(x => !x.headline.startsWith('THE COLUMN')).map(x => storyOf(x.headline)).join(',');
    if (chosen(100 + i) !== chosen(200000 + i)) paperMoved += 1;
  });
  console.log(`   ${saves.length} saves: ${extra} decks drew beyond the catalog build, ${moved} batches moved with the stream, ${paperMoved} papers chose other stories under another seed`);
  if (saves.length < 150) fail(`only ${saves.length} mid career saves to test`);
  if (extra) fail(`${extra} of ${saves.length} decks drew from Math.random beyond the catalog build`);
  if (moved) fail(`${moved} of ${saves.length} batches changed with the stream after the catalog build`);
  if (paperMoved) fail(`${paperMoved} of ${saves.length} papers chose different stories under a different seed`);

  /* The keys hold the season (review 2026-10-13: a deck key without its season, or a paper key without its year,
     passed every check above). Each save is dealt eight seasons running with its last row's year moved on one at a
     time and its ledger emptied, so the cards it may deal barely change (only a card that reads the year, such as a
     Player of the Month or a World Cup snub, can come and go). The deck must deal at least six different batches
     over the eight in nearly every save; the paper, given the same row with only its year moved, must not print one
     story all eight years in most saves where two or more stories qualify. */
  let deckFew = 0, paperOne = 0, paperAsked = 0;
  const distinct = [];
  saves.slice(0, 100).forEach((save, i) => {
    const batches = new Set(), stories = new Set();
    const row = save.seasons[save.seasons.length - 1];
    const goals = save.seasons.reduce((n, r) => n + (r.goals || 0), 0);
    const apps = save.seasons.reduce((n, r) => n + (r.apps || 0), 0);
    let qualified = 0;
    for (let y = 0; y < 8; y += 1) {
      const s = copy(save);
      s.eventLastFired = {};
      s.seasons[s.seasons.length - 1] = { ...row, year: row.year + y };
      const X = 4242 + i;
      const K = withStream(() => E.getAllEvents({ ...s }), seeded(X)).calls;
      batches.add(withStream(() => E.__r1327Deck({ ...s }), seeded(X), seeded(99 + i), K).value.map(e => e.id).join(','));
      const news = withStream(() => E.__r1327News(copy(save), { ...row, year: row.year + y }, goals, apps), seeded(X)).value;
      qualified = (globalThis.__r1327Templates || []).filter(t => t.check()).length;
      stories.add(news.filter(x => !x.headline.startsWith('THE COLUMN')).map(x => storyOf(x.headline)).join(','));
    }
    distinct.push(batches.size);
    if (batches.size < 6) deckFew += 1;
    if (qualified >= 2) { paperAsked += 1; if (stories.size === 1) paperOne += 1; }
  });
  const meanDistinct = distinct.reduce((a, b) => a + b, 0) / Math.max(1, distinct.length);
  console.log(`   eight seasons a save: the deck dealt ${r3(meanDistinct)} different batches on average, ${deckFew} of ${distinct.length} saves under six; the paper printed one story all eight years in ${paperOne} of ${paperAsked} saves with two or more stories`);
  if (deckFew > distinct.length * 0.05) fail(`${deckFew} of ${distinct.length} saves dealt under six different batches over eight seasons: the deck's key does not move with the season`);
  if (paperAsked < 20) fail(`only ${paperAsked} saves had two or more stories to choose from`);
  else if (paperOne > paperAsked * 0.25) fail(`${paperOne} of ${paperAsked} papers printed the same story eight years running: the paper's key does not move with the year`);
}

/* ─── 4. the cards that narrate the season ─────────────────────────────── */

SECTION = '4';
console.log('4) Gates: a card that narrates the season fires only when the row holds it');
{
  const fired = new Map(GATED.map(id => [id, 0]));
  const wrong = new Map(GATED.map(id => [id, 0]));
  const due = new Map(GATED.map(id => [id, 0]));
  for (const b of allBatches) {
    for (const id of GATED) if (b.facts[id]) due.set(id, due.get(id) + 1);
    for (const id of b.ids) {
      if (!fired.has(id)) continue;
      fired.set(id, fired.get(id) + 1);
      if (!b.facts[id]) wrong.set(id, wrong.get(id) + 1);
    }
  }
  console.log(`   card: fired / fired without its fact / batches whose row held the fact`);
  console.log(`   ${GATED.map(id => `${id}: ${fired.get(id)}/${wrong.get(id)}/${due.get(id)}`).join('  ')}`);
  for (const id of GATED) {
    if (wrong.get(id) > 0) fail(`card ${id} fired ${wrong.get(id)} times in a season whose row does not hold its fact`);
    if (id === 17 && fired.get(id) > 0) fail(`card 17 fired ${fired.get(id)} times: the engine's own call up tells that story`);
    if (id !== 17 && fired.get(id) === 0) fail(`card ${id} never fired in ${fleet.length} careers: its words are dead`);
  }
  /* Fixed rows the fleet cannot be relied on to reach (review 2026-10-13): its careers start in 2020, so no season
     before the Puskas Award exists, and a row at a club he has since left turns up only now and then (dropping that
     rule went unseen at four seed offsets of five). Each row is asked of the engine and of this file's own rules. */
  const FIXTURES = [
    ['7, goals in 2005/06, before the Puskas Award existed', 7, { year: 2005, goals: 4 }, false],
    ['7, goals in 2008/09, the first season it covered', 7, { year: 2008, goals: 4 }, true],
    ['12, 18th of 20 at a loan club he has since left', 12, { club: 'A Loan Club He Left', leagueFinish: 18, leagueSize: 20 }, false],
    ['12, 18th of 20 at his club', 12, { leagueFinish: 18, leagueSize: 20 }, true],
    ['15, 8 league games at a loan club he has since left', 15, { club: 'A Loan Club He Left', leagueApps: 8 }, false],
    ['15, 8 league games at his club', 15, { leagueApps: 8 }, true],
    ['15, 17 of an 18 club division\'s 34 league games', 15, { leagueApps: 17, leagueSize: 18 }, false],
    ['15, 16 of an 18 club division\'s 34 league games', 15, { leagueApps: 16, leagueSize: 18 }, true],
    ['15, 22 of a 24 club division\'s 46 league games', 15, { leagueApps: 22, leagueSize: 24 }, true],
    ['15, 20 league games and no division size (the band\'s 38)', 15, { leagueApps: 20, leagueSize: undefined }, false],
  ];
  let asked = 0;
  for (const [what, id, over, want] of FIXTURES) {
    const s = copy(midOf);
    const last = s.seasons.length - 1;
    s.seasons[last] = { ...s.seasons[last], type: 'playing', club: s.currentClub, ...over };
    const engineSays = E.cardFitsSeason(id, s), rulesSay = factsOf(E, s)[id];
    asked += 1;
    if (engineSays !== want) fail(`card ${id} (${what}): the engine says ${engineSays ? 'deal it' : 'do not'}, the row says ${want ? 'deal it' : 'do not'}`);
    if (rulesSay !== want) fail(`card ${id} (${what}): this file's own rules say ${rulesSay}, not ${want}`);
  }
  console.log(`   ${asked} fixed rows asked of the engine and of this file's rules`);
}

/* ─── 5. the sensation story ───────────────────────────────────────────── */

SECTION = '5';
console.log('5) SOCIAL MEDIA SENSATION prints, and only at a million followers or more');
{
  let printed = 0, under = 0;
  for (const p of allPapers) for (const a of p.news) {
    if (!a.headline.includes('SOCIAL MEDIA SENSATION')) continue;
    printed += 1;
    const figure = (a.headline.match(/Hits (\S+) Followers/) || [])[1] || '';
    if (!figure.endsWith('M')) under += 1;
  }
  console.log(`   printed ${printed} times in ${allPapers.length} papers, ${under} of them under a million`);
  if (printed === 0) fail('the sensation story never printed in the fleet');
  if (under > 0) fail(`${under} sensation stories printed a figure under a million`);
}

/* ─── 6. wording ───────────────────────────────────────────────────────── */

SECTION = '6';
console.log('6) Every story, every position: no bare position code, no "In <lower case>" tail');
{
  const CODES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  const codeRe = new RegExp(`\\b(${CODES.join('|')})\\b`);
  let rendered = 0, threw = 0;
  for (const pos of CODES) {
    const { s, season } = paperCase();
    Object.assign(s, { position: pos, rival: { name: 'Generated Rival', retired: false, ballonDors: 1 } });
    const row = { ...season, goals: 0 };
    E.__r1327News({ ...s }, row, 50, 200);
    for (const t of globalThis.__r1327Templates || []) {
      let a;
      try { a = t.gen(); } catch { threw += 1; continue; }
      rendered += 1;
      const bare = (a.headline.match(codeRe) || a.body.match(codeRe) || [])[0];
      if (bare) fail(`${pos}: "${a.headline}" prints the code ${bare}`);
      const tail = a.headline.match(/ In [a-z]\w*/);
      if (tail) fail(`${pos}: "${a.headline}" ends in "${tail[0].trim()}"`);
    }
  }
  console.log(`   ${rendered} stories rendered over ${CODES.length} positions, ${threw} could not render without their facts`);
  if (rendered < CODES.length * 40) fail(`only ${rendered} stories rendered`);
  /* "the <nation> international" states caps: no story calls an uncapped player one (the woken "Booed By Own Fans"
     story did, review 2026-10-13), and a capped player still is called one, so the phrase this reads is still there */
  let uncappedSays = 0, cappedSays = 0;
  for (const caps of [0, 12]) {
    const { s, season } = paperCase();
    s.intStats = { ...s.intStats, caps };
    const phrase = `${s.nationality} international`;
    E.__r1327News({ ...s }, season, 50, 200);
    for (const t of globalThis.__r1327Templates || []) {
      let a;
      try { a = t.gen(); } catch { continue; }
      if (!`${a.headline} ${a.body}`.includes(phrase)) continue;
      if (caps > 0) cappedSays += 1;
      else { uncappedSays += 1; fail(`an uncapped player is called "the ${phrase}": "${a.headline}"`); }
    }
  }
  console.log(`   "the <nation> international": ${uncappedSays} stories say it of an uncapped player, ${cappedSays} of a capped one`);
  if (cappedSays === 0) fail('no story calls a capped player an international: the phrase this check reads is gone, re-read it');
}

/* ─── 7. the prefix, and old saves ─────────────────────────────────────── */

SECTION = '7';
console.log('7) Before the first paper or deck nothing moves; saves the base wrote still answer here');
{
  /* (a) lockstep: base and head on one seed each, compared after every step. */
  /* The paper is handed the season row it reports on, so the row as it stood
     the moment the paper ran is what each arm hands over here. The steps
     after the paper (the finances, the summer's tournament) still draw into
     that row, and on a keyed paper they draw from a stream the old sort no
     longer shifts, so the row after the step is reported, not asserted. */
  const run = (rng, fn) => {
    const real = Math.random;
    let n = 0, paperRow = null;
    Math.random = () => { n += 1; return rng(); };
    globalThis.__r1327Ran = 0;
    globalThis.__r1327Seen = (t, e, season) => { if (paperRow === null) paperRow = JSON.stringify(season); };
    try { return { s: fn(), n, ran: globalThis.__r1327Ran, paperRow }; } finally { Math.random = real; globalThis.__r1327Seen = undefined; }
  };
  let afterStepDiffers = 0;
  let compared = 0, rowsEqual = 0, steps = 0, reached = 0;
  for (let i = 0; i < 200; i += 1) {
    const seed = 70000 + i + SEED_OFFSET;
    const rE = seeded(seed), rB = seeded(seed);
    let a = run(rE, () => startOf(E7, seed, 'ordinary'));
    let b = run(rB, () => startOf(B, seed, 'ordinary'));
    let touched = false;
    for (let k = 0; k < 80; k += 1) {
      const phase = a.s.phase;
      const na = run(rE, () => step(E7, a.s, seed, false, E7.FALLBACK_CLUBS));
      const nb = run(rB, () => step(B, b.s, seed, false, B.FALLBACK_CLUBS));
      steps += 1;
      const same = na.n === nb.n && JSON.stringify(na.s) === JSON.stringify(nb.s);
      if (na.ran || nb.ran) touched = true;
      if (same) { a = na; b = nb; continue; }
      compared += 1;
      if (!na.ran && !nb.ran) { fail(`career ${seed}: the saves part at step ${k + 1} (${phase}), which runs neither the paper nor the deck`); break; }
      const lastA = JSON.stringify(na.s.seasons[na.s.seasons.length - 1]);
      const lastB = JSON.stringify(nb.s.seasons[nb.s.seasons.length - 1]);
      if (lastA !== lastB) afterStepDiffers += 1;
      /* a step that ran the paper is judged on the row the paper was handed; a deck step writes no row */
      const rowA = na.paperRow ?? JSON.stringify(na.s.seasons);
      const rowB = nb.paperRow ?? JSON.stringify(nb.s.seasons);
      if (rowA === rowB) rowsEqual += 1;
      else {
        const a = JSON.parse(rowA), b = JSON.parse(rowB);
        const keys = Object.keys({ ...a, ...b }).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
        fail(`career ${seed}: the season row in the step that parts the saves (${phase}) differs in ${keys.join(', ')}`);
      }
      break;
    }
    if (touched) reached += 1;
  }
  console.log(`   200 careers, ${steps} steps compared: ${reached} reached a paper or deck step, ${compared} parted there, ${rowsEqual} with the season row byte equal when the paper ran (${afterStepDiffers} rows differ by the end of that step, from the draws after the paper)`);
  if (reached < 150) fail(`only ${reached} of 200 careers ever reached a paper or a deck`);

  /* (b) saves the base wrote with a card on screen. */
  const clubs = E.FALLBACK_CLUBS;
  const baseSave = (() => {
    const real = Math.random;
    Math.random = seeded(4321);
    try {
      let s = startOf(B, 4321, 'ordinary');
      for (let g = 0, played = 0; g < 400; g += 1) {
        if (s.phase === 'playing') played += 1;
        if (s.phase === 'random_events' && played >= 5) return s;
        s = step(B, s, 4321, false, B.FALLBACK_CLUBS);
      }
      throw new Error('the base save never reached a card batch');
    } finally { Math.random = real; }
  })();
  const baseCatalog = B.getAllEvents(copy(baseSave));
  let answered = 0;
  for (const id of GATED) {
    const card = baseCatalog.find(e => e.id === id);
    if (!card) { fail(`the base catalog has no card ${id}`); continue; }
    for (let ci = 0; ci < card.choices.length; ci += 1) {
      const saved = copy({ ...baseSave, pendingEvents: [card], phase: 'random_events', internationalCareer: id === 17 ? false : baseSave.internationalCareer, intStats: { ...baseSave.intStats, isRetired: false } });
      const label = E.getAllEvents(E.repairCareer(copy(saved))).find(e => e.id === id)?.choices[ci]?.label;
      if (label !== card.choices[ci].label) fail(`card ${id} choice ${ci + 1} means "${label}" here and "${card.choices[ci].label}" on the base`);
      let mine, theirs;
      try { mine = withStream(() => E.applyEventChoice(E.repairCareer(copy(saved)), ci, clubs), seeded(id * 10 + ci)).value; }
      catch (err) { fail(`card ${id} choice ${ci + 1} from a base save throws: ${err.message}`); continue; }
      theirs = withStream(() => B.applyEventChoice(B.repairCareer(copy(saved)), ci, B.FALLBACK_CLUBS), seeded(id * 10 + ci)).value;
      answered += 1;
      if (mine.pendingEvents.length !== 0 || mine.lastEventId !== id) fail(`card ${id} choice ${ci + 1} from a base save did not resolve`);
      const ledger = mine.eventLastFired;
      if (ledger !== undefined && (typeof ledger !== 'object' || Array.isArray(ledger) || Object.values(ledger).some(v => !Number.isFinite(v)))) fail(`card ${id} choice ${ci + 1} left the ledger misshapen`);
      const added = Object.keys(mine).filter(k => !(k in theirs) && !(k in saved));
      if (added.length) fail(`card ${id} choice ${ci + 1} adds save fields the base never wrote: ${added.join(', ')}`);
      if (id === 17) {
        const year = saved.seasons[saved.seasons.length - 1].year;
        if (mine.intStats.debutYear !== year || mine.intStats.debutAge !== saved.age) fail(`an old card 17 answered here records debut ${mine.intStats.debutYear} at ${mine.intStats.debutAge}, not ${year} at ${saved.age}`);
      }
    }
  }
  /* a newspaper and a transfer window the base wrote */
  const until = (phase, seed) => {
    const real = Math.random;
    Math.random = seeded(seed);
    try {
      let s = startOf(B, seed, 'ordinary');
      for (let g = 0; g < 400; g += 1) { if (s.phase === phase && s.seasons.length > 4) return s; s = step(B, s, seed, false, B.FALLBACK_CLUBS); }
      return null;
    } finally { Math.random = real; }
  };
  const paper = until('newspaper', 555), win = until('transfer_window', 556);
  for (const [name, saved, go] of [['newspaper', paper, s => E.dismissNewspaper(s)], ['transfer window', win, s => E.stayAtClub(s)]]) {
    if (!saved) { fail(`the base never reached a ${name}`); continue; }
    try { withStream(() => go(E.repairCareer(copy(saved))), seeded(9)); answered += 1; }
    catch (err) { fail(`a ${name} the base wrote throws here: ${err.message}`); }
  }
  console.log(`   ${answered} old saved screens answered here (every choice of cards ${GATED.join(', ')}, a newspaper, a transfer window)`);
}

/* ─── 8. the inverse, and where the round edits the engine ─────────────── */

SECTION = '8';
console.log('8) The seventh inverse gives the base\'s engine back byte for byte, and every change sits in this round\'s hunks');
{
  const sha = t => createHash('sha256').update(t).digest('hex');
  const baseText = execFileSync('git', ['show', `${BASE}:${ENGINE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r\n/g, '\n');
  const truthReceipt = [];
  const deckReceipt = [];
  let deckOff = ENGINE_SOURCE;
  try { deckOff = inverseSoccerDeck(ENGINE, ENGINE_SOURCE, deckReceipt); } catch (err) { fail(`Round 1334's inverse does not apply: ${err.message}`); }
  console.log(`   Round 1334's rows taken off first: ${deckReceipt.length} of ${SOCCER_DECK_ADDITIONS.length}`);
  if (soccerDeckReceiptProblem(deckReceipt)) fail(soccerDeckReceiptProblem(deckReceipt));
  let headText = deckOff;
  try { headText = inverseWorldTruth(ENGINE, deckOff, truthReceipt); } catch (err) { fail(`Round 1329's inverse does not apply: ${err.message}`); }
  const truthRows = WORLD_TRUTH_ADDITIONS.filter(name => name.startsWith('engine-'));
  console.log(`   Round 1329's rows taken off first: ${truthReceipt.length} of ${truthRows.length}; the seventh's head is then ${sha(headText)} (pinned ${DECK_FAIR_HEAD_SHA256})`);
  if (truthReceipt.map(row => row.addition).join() !== truthRows.join()) fail('Round 1329\'s inverse did not take every engine row off once, in order');
  if (!CONTROL && sha(headText) !== DECK_FAIR_HEAD_SHA256) fail('with Round 1329 taken off, this engine is not the head the seventh inverse was written for');
  const receipt = [];
  let back = null;
  try { back = inverseDeckFair(ENGINE, headText, receipt); } catch (err) { fail(`the inverse does not apply: ${err.message}`); }
  console.log(`   head ${sha(headText)}; inverse applied ${receipt.length} of ${DECK_FAIR_ADDITIONS.length} rows`);
  console.log(`   base ${sha(baseText)} (module says ${DECK_FAIR_BASE_SHA256}); inverse gives ${back === null ? 'nothing' : sha(back)}`);
  if (sha(baseText) !== DECK_FAIR_BASE_SHA256) fail('the base this harness reads is not the base the inverse was written for');
  if (back !== null && sha(back) !== sha(baseText)) fail('the inverse applied to this engine does not give the base\'s engine byte for byte');
  /* the hunks: each must sit in one of decision 1's regions of the head file */
  const lines = headText.split('\n');
  const lineOf = (needle, from = 0) => { const i = lines.findIndex((l, k) => k >= from && l.includes(needle)); return i < 0 ? -1 : i + 1; };
  const regions = [
    ['the imports', 1, lineOf('export interface ClubData {')],
    ['the dilemma comment', lineOf('function tryTriggerMoralDilemma('), lineOf('const second = MORAL_DILEMMAS.find(d => d.id === "mafia_second_ask");')],
    ['pickN', lineOf('export function pickAcrossLeagues('), lineOf('/* ─── Club helpers ─── */')],
    ['generateNewsArticles', lineOf('function generateNewsArticles('), lineOf('/* ─── Dismiss newspaper ─── */')],
    ['the 40 inline cards', lineOf('export function getAllEvents('), lineOf('    ...getExtraEvents(state),')],
    ['the helpers and generateRandomEvents', lineOf('export function isEventOnCooldown('), lineOf('/* ─── UCL Simulation ─── */')],
  ];
  if (regions.some(r => r[1] < 1 || r[2] <= r[1])) fail(`a region of decision 1 was not found in the head: ${regions.map(r => `${r[0]} ${r[1]} to ${r[2]}`).join('; ')}`);
  const dir = fs.mkdtempSync(path.join(TMP, 'hunks-'));
  fs.writeFileSync(path.join(dir, 'base.ts'), baseText);
  fs.writeFileSync(path.join(dir, 'head.ts'), headText);
  const diff = spawnSync('git', ['diff', '--no-index', '-U0', '--no-color', path.join(dir, 'base.ts'), path.join(dir, 'head.ts')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout || '';
  let hunks = 0;
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    hunks += 1;
    const start = Number(m[1]), count = m[2] === undefined ? 1 : Number(m[2]);
    const last = count === 0 ? start : start + count - 1;
    const home = regions.find(r => start >= r[1] && last <= r[2]);
    if (!home) fail(`the engine changes at head lines ${start} to ${last}, outside every hunk this round may edit`);
  }
  console.log(`   ${hunks} diff hunks against the base, each checked against ${regions.length} regions`);
  if (hunks === 0 && !CONTROL) fail('no diff hunks against the base: this harness is reading the base');
}

/* ─── 9. faces ─────────────────────────────────────────────────────────── */

SECTION = '9';
console.log('9) What a narrating card or story prints is what the row holds');
{
  /* Every injury the season can hold, read off careerEras.ts, on card 11 (its face and the log line its first choice
     writes) and on INJURY BLOW: each names the row's injury, with "a" or "an" as it is said. The review of
     2026-10-13 found card 11 logging a serious hamstring injury whatever the row held, and nothing here read it. */
  const erasSource = fs.readFileSync(path.join(ROOT, 'src/lib/careerEras.ts'), 'utf8');
  const INJURIES = [...erasSource.matchAll(/const INJ_[A-Z]+ = \[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]));
  const badArticle = t => /\ba (?:[AEIOUaeiou]|[FHLMNRSX][A-Z])/.test(t) || /\ban (?![AEIOUaeiou]|[FHLMNRSX][A-Z])/.test(t);
  /* names it, and with no article when the name is a plural ("with a bruised ribs" printed on the first fix) */
  const names = (t, injury) => {
    if (typeof t !== 'string') return false;
    const low = t.toLowerCase(), inj = String(injury).toLowerCase();
    return low.includes(inj) && !(/[^s]s$/.test(inj) && (low.includes(` a ${inj}`) || low.includes(` an ${inj}`)));
  };
  const blowAt = TEMPLATES.findIndex(t => t.fragments.some(f => f.includes('Out For Weeks With')));
  if (INJURIES.length < 10) fail(`only ${INJURIES.length} injury names read from careerEras.ts`);
  if (blowAt < 0) fail('the INJURY BLOW story is gone from the paper\'s table');
  let rendered = 0;
  for (const injury of INJURIES) {
    const s = copy(midOf);
    const last = s.seasons.length - 1;
    s.seasons[last] = { ...s.seasons[last], type: 'playing', club: s.currentClub, injury, injuryWeeks: 8 };
    const card = withStream(() => E.getAllEvents(s), seeded(11)).value.find(e => e.id === 11);
    const after = card.choices[0].apply({ ...copy(s), events: [...s.events] });
    const log = after.events[after.events.length - 1];
    if (!names(card.description, injury) || (/[^s]s$/.test(injury) && card.description.includes('has left its'))) fail(`card 11 on a row holding "${injury}" reads "${card.description}"`);
    if (!names(log, injury) || badArticle(log) || (/hamstring/i.test(log) && !/hamstring/i.test(injury))) fail(`card 11 on a row holding "${injury}" logs "${log}"`);
    if (/^Achilles/.test(injury) && !card.description.includes('Achilles')) fail(`card 11 lowercases a name: "${card.description}"`);
    const { s: ps, season } = paperCase();
    const row = { ...season, injury, injuryWeeks: 8, apps: 10 };
    E.__r1327News({ ...ps }, row, 50, 200);
    const story = (globalThis.__r1327Templates || [])[blowAt];
    if (!story || !story.check()) { fail(`INJURY BLOW does not qualify on a row with "${injury}" for 8 weeks and 10 games`); continue; }
    const a = story.gen();
    if (!names(a.headline, injury) || !names(a.body, injury) || badArticle(a.body)) fail(`INJURY BLOW on "${injury}" prints "${a.headline}" / "${a.body}"`);
    rendered += 1;
  }
  /* The fleet: every narrating card and story that was dealt or printed, against the row it was dealt for. */
  const ord = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
  const seen = { 11: 0, 12: 0, 15: 0, 19: 0, blow: 0, move: 0 };
  for (const b of allBatches) for (const [id, f] of Object.entries(b.faces || {})) {
    seen[id] += 1;
    const r = b.row;
    if (id === '11' && (!names(f.text, r.injury) || !names(f.log, r.injury))) fail(`card 11 dealt for "${r.injury}" reads "${f.text}" and logs "${f.log}"`);
    if (id === '12' && !f.text.includes(`finishing ${ord(r.leagueFinish)}`)) fail(`card 12 dealt for a ${r.leagueFinish} finish reads "${f.text}"`);
    if (id === '15' && !f.text.includes(`Only ${r.leagueApps} league game`)) fail(`card 15 dealt for ${r.leagueApps} league games reads "${f.text}"`);
    if (id === '19' && !f.text.includes(`${r.tournament} squad`)) fail(`card 19 dealt for ${r.tournament} reads "${f.text}"`);
  }
  for (const p of allPapers) for (const a of p.news) {
    if (a.headline.includes('INJURY BLOW')) { seen.blow += 1; if (!names(a.headline, p.row.injury)) fail(`INJURY BLOW printed "${a.headline}" for a row holding "${p.row.injury}"`); }
    const move = /^(ON LOAN|BACK AGAIN|NEW CHAPTER):/.exec(a.headline);
    if (move) {
      seen.move += 1;
      if ((move[1] === 'ON LOAN') !== !!p.row.onLoanFrom) fail(`"${a.headline}" printed for a row ${p.row.onLoanFrom ? `on loan from ${p.row.onLoanFrom}` : 'that is no loan'}`);
      if (!a.headline.includes(p.row.club)) fail(`"${a.headline}" printed for a season at ${p.row.club}`);
    }
  }
  console.log(`   ${INJURIES.length} injuries read; card 11 and INJURY BLOW rendered for ${rendered}; the fleet dealt card 11 ${seen[11]}, 12 ${seen[12]}, 15 ${seen[15]}, 19 ${seen[19]} times and printed INJURY BLOW ${seen.blow}, a move story ${seen.move} times, each read against its row`);
  if (rendered < INJURIES.length) fail(`INJURY BLOW rendered for ${rendered} of ${INJURIES.length} injuries`);
}

/* ─── verdict ──────────────────────────────────────────────────────────── */

if (CONTROL) {
  const t = CONTROLS[CONTROL].breaks;
  console.log(failedSections.has(t)
    ? `CONTROL ${CONTROL} FIRED: section ${t} failed (${failures} failures in all)`
    : `CONTROL ${CONTROL} DID NOT FIRE: section ${t} stayed green`);
  process.exit(1);
}
console.log(failures ? `simSoccerDeckFairness: ${failures} failures in section ${[...failedSections].sort().join(', ')}` : 'simSoccerDeckFairness: all sections green');
process.exit(failures ? 1 : 0);


