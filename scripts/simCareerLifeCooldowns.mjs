/**
 * Round 725 harness: the Soccer Career life catalog, audited, and its
 * cooldowns, measured.
 *
 * D85 in docs/SPEC-RECONCILIATION.md read, before this round: "No per event
 * cooldown field and the list is not audited type by type." The picker's only
 * memory was lastEventId, one id, so the same wax statue could be unveiled in
 * back to back seasons and Gerald the pigeon adopted twice. Every event now
 * carries a cooldown in seasons (soccerCareerLife.ts COOLDOWN, engine default
 * per category for the other catalogs), the season each id fired in is stamped
 * on the save as eventLastFired, and generateRandomEvents holds an event out
 * while (this season minus that season) is at most its cooldown.
 *
 * THE AUDIT, type by type, of src/lib/soccerCareerLife.ts as it stood before
 * this round (48 events, ids 200 to 252 with 202 to 204, 209 and 250 unused):
 *
 *   type                     ids                                        n  found before this round
 *   identity beats           200 201                                    2  fine, self gating, fire once
 *   agent drama              205 206 207 208                            4  fine
 *   personality exclusives   210 211 212 213 214 215 216 217 218 219   10  212, 213, 216, 218 had ONE option
 *   dressing room, teammates 220 223 229 236 237 239                    6  237 had ONE option
 *   media and fame           221 225 233 240 243 244 245 246 249        9  fine
 *   money and brands         226 227 251                                3  227 had ONE option
 *   fans and community       224 232 238 241 248 252                    6  248 had ONE option
 *   chaos and mishaps        222 228 230 231 234 235 242 247            8  231 had ONE option
 *   family                                                              0  THIN, nothing at all
 *   injuries and recovery                                               0  THIN, nothing at all
 *   national team                                                       0  THIN, nothing at all
 *   late career                                                         0  THIN, only 225, 232, 249 age gated
 *
 *   "THIN" is about this file only. The same picker also draws from the
 *   base, eras, realism, corruption, critic and boot catalogs (250 ids in
 *   all), and the realism files already carry family (469 to 475), body and
 *   mind (431 to 437), the national team (450 to 457) and the late career
 *   (458 to 461, 489 to 494). New events here had to be new stories THERE.
 *
 *   near duplicate text inside this file: none. Section 5 measures word
 *     overlap over every pair; the closest is 226 and 227 (the esports arc,
 *     deliberately one story in two parts) at 0.15.
 *   near duplicates ACROSS the picker: three stories this file told that
 *     another catalog also told. 220 The Group Chat Leak against eras 63
 *     Leaked Group Chat and realism 422 (all three: your squad chat message
 *     about the manager gets out); 232 The Statue Vote against realism 462,
 *     same title, same story; 244 Start a Podcast? against eras 68 Launch
 *     Your Own Podcast, two offers to start the same podcast. FIXED with a
 *     shared story key (STORY in soccerCareerLife.ts): the members share one
 *     ledger entry, are once a career, and the picker never draws two of one
 *     story in the same batch, so each story happens once.
 *   identical consequence sets: none.
 *   options without a consequence: none.
 *   real person as a speaker: none. Every speaker is a role (the gaffer, the
 *     kit man, a teammate, your mum) or a generated person (Cousin Ricky,
 *     Marco De Luca, Zara Blackwood, Councilman Dave, Gerald, Gaffer Two).
 *     245 has a "legendary retired striker" answer you, unnamed on purpose.
 *   ids used twice anywhere in the full catalog: none, 250 distinct ids.
 *
 *   life events by category after this round: life 47, negative 16,
 *   positive 4, international 1 (68 events).
 *
 * WHAT CHANGED. The eight one button events got a real second choice. Ids 253
 * to 272 are new, twenty events: family (253 254 255), media (256), money and
 * brands (257 258 259), injuries and recovery (260 261 262), the dressing room
 * (263 264), agent and contract (265 266), national team (267), fans and
 * community (268 269), late career (270 271 272). The first draft of five of
 * them retold events from the other catalogs (a sleep coach, 431; a fines
 * treasurer, 419; the anthem, 453; a teenager at your position, 459; your
 * first coach raising money, 416) and was rewritten: 258 The Garden Centre
 * Charge, 260 The Head Knock, 263 Secret Santa, 267 The Camp Roommate, 271
 * The Screen Test. 269 was retitled, it shared "The Banner" with rivalry
 * event 116. 262 The Comeback Game fires only while the serious injury is
 * this season's or last season's, and as a priority beat, like 200 and 201.
 *
 * THE SECTIONS, all over careers driven through the real engine with a seeded
 * Math.random, three cohorts so the late career is actually reached:
 *
 *   1  Careers driven, batches recorded as the engine queued them.
 *   2  HARD. No event fires twice inside its cooldown, in any career. The gap
 *      is recomputed here from the season years on the raw save, and the
 *      cooldown read off the engine's own eventCooldown. Measured: 1,906 to
 *      2,022 repeat firings checked per run, 0 inside a cooldown; with the
 *      picker blind to the ledger (nocooldown) 589 of 2,481 were inside one.
 *   3  HARD. Every id in the life catalog is reachable (turned up in some
 *      state's catalog), and every new id actually FIRED in at least one
 *      career. A gate nobody can pass is dead words.
 *   4  The rate. Mean events per batch and batches per playing season, inside
 *      a band set from measurement, so the new events did not flood the game
 *      and the cooldowns did not starve it. Measured over seed offsets 0, 1
 *      and 2 at N=200 (500 careers, about 8,200 playing seasons each):
 *      events per batch 3.23, 3.21, 3.21 (the draw is 2 to 4, plus the four
 *      priority beats); batches per playing season 0.91 in all three (a
 *      career's final season draws none, and so does a season in prison);
 *      share of batch slots taken by the life catalog 0.25 in all three.
 *      With the cooldowns switched off (the nocooldown control) the same
 *      three numbers were 3.23, 0.91 and 0.25, so the cooldowns change WHICH
 *      events are drawn and not how many. Bands sit well outside the
 *      measured values: batch mean in [2.6, 3.7], batches per season in
 *      [0.8, 1.02], life share in [0.15, 0.45].
 *   5  HARD. Catalog shape: every life event has at least two choices, every
 *      choice a non empty consequence and an apply function, every life event
 *      an explicit cooldown, no id used twice anywhere in the full catalog,
 *      no two life events with the same consequence set, no two with word
 *      overlap above 0.5 (measured ceiling 0.35).
 *   6  HARD. Text hygiene over every title, description, label and
 *      consequence: no em or en dash, nothing on the RIVAL_NAMES list from
 *      simNoRivalNames, and every Capitalised Two Word name is one the
 *      allowlist here knows to be generated, so a real name cannot arrive
 *      without somebody reading this file.
 *   7  A save with no eventLastFired loads, plays, and gets its ledger on the
 *      next batch; a save with a corrupt ledger has it dropped on load.
 *
 * NEGATIVE CONTROLS. Each puts a defect back into an in memory copy of one
 * source file (also written to the temp directory for inspection), bundled in
 * place of the real one for EVERY importer. A control that changes nothing
 * refuses to run, and a control that fires nothing fails.
 *   SIM_CAREER_LIFE_COOLDOWNS_CONTROL=nocooldown  the picker stops reading the
 *                                        ledger: section 2 must fail.
 *   SIM_CAREER_LIFE_COOLDOWNS_CONTROL=oneoption   an option is removed from
 *                                        event 221 in the catalog copy, leaving
 *                                        it one button: section 5 must fail.
 *
 * Run: node scripts/simCareerLifeCooldowns.mjs [careers]
 *      SEED_OFFSET=1 node scripts/simCareerLifeCooldowns.mjs   another draw
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replace(/\\/g, '/');
const CONTROL = process.env.SIM_CAREER_LIFE_COOLDOWNS_CONTROL || '';
const SEED_OFFSET = Number(process.env.SEED_OFFSET || 0) * 100000;

let failures = 0;
/* Which section is running, and which ones failed, so a control is judged on
   the section it targets and not on any red anywhere. */
let SECTION = '0';
const failedSections = new Set();
const fail = m => { failures += 1; failedSections.add(SECTION); console.error(`  FAIL (section ${SECTION}): ${m}`); };
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 1000) / 10}%`);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r2 = v => Math.round(v * 100) / 100;

/* ─── the controls ───────────────────────────────────────────────────────── */

const CONTROLS = {
  nocooldown: {
    file: 'src/lib/soccerCareerEngine.ts',
    from: '    if (isEventOnCooldown(state, e, season)) return false;',
    to: '    if (false && isEventOnCooldown(state, e, season)) return false;',
    note: 'the picker no longer reads the cooldown ledger',
    breaks: '2',
  },
  oneoption: {
    file: 'src/lib/soccerCareerLife.ts',
    from: '      { label: "Never speak of it again", emoji: "🤐", color: "bg-muted", consequence: "It resurfaces every birthday forever",\n        apply: s => { s.events = [...s.events, "🤐 The karaoke video lives on in the group chat only"]; return s; } },\n',
    to: '',
    note: 'event 221 is back to one button',
    breaks: '5',
  },
  nostory: {
    file: 'src/lib/soccerCareerRealismB.ts',
    from: 'push({ id: 462, story: STORY.statueVote, cooldown: COOLDOWN.once, ',
    to: 'push({ id: 462, ',
    note: 'the realism statue vote no longer shares the life one\'s story key',
    breaks: '5b',
  },
  dupetitle: {
    file: 'src/lib/soccerCareerLife.ts',
    from: 'emoji: "🎁", title: "Secret Santa",',
    to: 'emoji: "🎁", title: "The Fines Committee",',
    note: 'a new event takes the title of an event in another catalog',
    breaks: '5b',
  },
};
if (CONTROL && !CONTROLS[CONTROL]) {
  console.error(`SIM_CAREER_LIFE_COOLDOWNS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let controlFile = null;
let controlSource = null;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const src = fs.readFileSync(path.join(ROOT, c.file), 'utf8').replace(/\r\n/g, '\n');
  const hits = src.split(c.from).length - 1;
  if (hits === 0) {
    console.error(`control cannot run: ${c.file} is not in the shape this control rewrites`);
    process.exit(1);
  }
  if (hits > 1) {
    console.error(`control cannot run: ${c.file} contains that text ${hits} times`);
    process.exit(1);
  }
  const rewritten = src.replace(c.from, c.to);
  if (rewritten === src) { console.error('control cannot run: the rewrite changed nothing'); process.exit(1); }
  controlFile = path.resolve(ROOT, c.file);
  controlSource = rewritten;
  fs.writeFileSync(`${TMP}/r725.${CONTROL}.control.ts`, rewritten);
  console.log(`NEGATIVE CONTROL ON: ${c.note} (section ${c.breaks} must fail)`);
}

/* ─── bundle ─────────────────────────────────────────────────────────────── */

/* The control swaps the SOURCE of one file at load time, with resolveDir left
   on the real directory, so every relative import inside the copy still
   resolves and every importer of that file gets the copy. That is what makes
   a 7,800 line engine rewritable without duplicating it. */
const controlPlugin = {
  name: 'r725-control',
  setup(build) {
    if (!controlFile) return;
    const base = path.basename(controlFile).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    build.onLoad({ filter: new RegExp(`${base}$`) }, args => {
      if (path.resolve(args.path) !== controlFile) return undefined;
      return { contents: controlSource, loader: 'ts', resolveDir: path.dirname(controlFile) };
    });
  },
};

const ENTRY = `${TMP}/r725.entry.mjs`;
const BUNDLE = `${TMP}/r725.bundle.mjs`;
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
export const life = await import('${ROOT_URL}/src/lib/soccerCareerLife.ts');
`);
await esbuild.build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE,
  logLevel: 'error', alias: { '@': `${ROOT_URL}/src` }, plugins: [controlPlugin],
});
const { engine, life } = await import(pathToFileURL(BUNDLE).href);

const {
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, dismissNewspaper, dismissDebut, dismissWorldCup,
  dismissRivalryEvent, dismissBallonDor, applyEventChoice, dismissMoralDilemma,
  dismissSocialMediaPhase, dismissAppealResult, applyBdorSpeech, applyWorldCupSpeech,
  acceptRetirementSuggestion, stayAtClub, signExtension, applyRehabChoice, applySocialMediaAction,
  FALLBACK_CLUBS, repairCareer, getAllEvents, eventCooldown, isEventOnCooldown, eventSeasonIndex,
  eventLedgerKey,
} = engine;
const { COOLDOWN, STORY } = life;

/* ─── 1. drive the careers ───────────────────────────────────────────────── */

/* Default and floor from measured rarity: the rarest new event (272, age 33
   and up) fired 7, 8 and 11 times in 500 careers over three seeds, so at the
   default 200 (500 careers) the chance section 3 misses it by luck is under
   one in a thousand. The floor of 120 (300 careers) is for a run by hand and
   is not the default. */
const N = Math.max(120, Number(process.argv[2] || 200));
/* Section 4's bands. Measurement in the header: before this round the life
   file gave 0.54 to 0.56 events per playing season, after it 0.76 to 0.77,
   with run to run noise about 0.01. The band excludes the old value, so it
   fails if the new events stop being drawn, and a fifth more than measured
   on top, so it fails on a flood. */
const LIFE_PER_SEASON_BAND = [0.66, 0.88];
const LIFE_SHARE_BAND = [0.22, 0.31];
const BATCH_MEAN_BAND = [2.9, 3.5];
const BATCHES_PER_SEASON_BAND = [0.85, 0.97];
const NATIONS = ['England', 'Brazil', 'France', 'Japan', 'Nigeria', 'Argentina', 'Morocco', 'Norway'];
const POSITIONS = ['ST', 'CAM', 'CM', 'CB', 'GK', 'LW', 'RB', 'CDM'];
const clubs = FALLBACK_CLUBS;
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/* mulberry32, one stream per career, so a red here is reproducible by seed. */
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

/* The life file's own id range. Read off the catalog, not typed here, so a
   new id joins the audit the moment it exists. */
const LIFE_IDS_IN_SOURCE = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerLife.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...src.matchAll(/\{ id: (\d+), /g)].map(m => Number(m[1]));
})();
const NEW_IDS = LIFE_IDS_IN_SOURCE.filter(id => id >= 253 && id <= 272);
const isLife = id => LIFE_IDS_IN_SOURCE.includes(id);

let crashes = 0;
const careers = [];
/* every event object ever offered, by id, for the shape audit */
const catalogById = new Map();
const lifeFireCount = new Map();
const newChoiceTaken = new Map();

function drive(seed, mode) {
  const realRandom = Math.random;
  Math.random = seeded(seed + SEED_OFFSET + 1);
  try {
    const nat = NATIONS[seed % NATIONS.length];
    const pos = POSITIONS[seed % POSITIONS.length];
    const startOvr = mode === 'elite' ? 68 : 40 + (seed % 30);
    let s = initCareer(`Sim ${seed}`, nat, pos, '2020s', stats(startOvr), startOvr, 2020, clubs, null,
      mode === 'elite' ? 99 : undefined);
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
    const batches = [];
    let playingSeasons = 0;
    let prevPhase = s.phase;
    let guard = 0;
    let midSave = null;

    while (!s.retired && guard++ < 400) {
      if (s.phase === 'random_events' && prevPhase !== 'random_events') {
        const season = eventSeasonIndex(s);
        batches.push({ season, events: s.pendingEvents.map(e => ({ id: e.id, key: eventLedgerKey(e), category: e.category, cooldown: eventCooldown(e) })) });
        for (const e of getAllEvents(s)) if (!catalogById.has(e.id)) catalogById.set(e.id, e);
        for (const e of s.pendingEvents) if (isLife(e.id)) lifeFireCount.set(e.id, (lifeFireCount.get(e.id) || 0) + 1);
        if (!midSave && playingSeasons >= 3 && playingSeasons <= 6) midSave = JSON.parse(JSON.stringify(s));
      }
      prevPhase = s.phase;
      switch (s.phase) {
        case 'youth': s = advanceYouthYear(s, clubs); break;
        case 'contract_offer': {
          const pickOffer = preferHome(s.pendingOffers);
          if (!pickOffer) { s.phase = 'playing'; break; }
          s = acceptOffer(s, pickOffer);
          break;
        }
        case 'playing': s = advanceProSeason(s, clubs); playingSeasons += 1; break;
        case 'newspaper': s = dismissNewspaper(s); break;
        case 'season_summary': s = dismissSummary(s, clubs); break;
        case 'rehab_choice': s = applyRehabChoice(s, seed % 3); break;
        case 'random_events': {
          const ev = s.pendingEvents && s.pendingEvents[0];
          if (!ev) { s.pendingEvents = []; s.phase = 'playing'; break; }
          const idx = (seed + ev.id + s.seasons.length) % Math.max(1, ev.choices.length);
          if (NEW_IDS.includes(ev.id)) {
            const key = `${ev.id}:${idx}`;
            newChoiceTaken.set(key, (newChoiceTaken.get(key) || 0) + 1);
          }
          s = applyEventChoice(s, idx, clubs);
          break;
        }
        case 'moral_dilemma': s = dismissMoralDilemma(s, clubs); break;
        case 'social_media_action': {
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
    return { state: s, mode, seed, batches, playingSeasons, midSave };
  } finally {
    Math.random = realRandom;
  }
}

SECTION = '1';
console.log('1) Driving careers through the real engine');
for (let i = 0; i < N; i += 1) {
  for (const [mode, offset] of [['ordinary', 0], ['elite', 90000], ['loyal', 40000]]) {
    if (mode === 'loyal' && i >= Math.ceil(N * 0.5)) continue;
    try { careers.push(drive(i + offset, mode)); }
    catch (err) {
      crashes += 1;
      if (crashes <= 2) console.error(`   ${mode} ${i} crashed: ${err && err.stack}`);
    }
  }
}
const totalBatches = careers.reduce((a, c) => a + c.batches.length, 0);
const totalFired = careers.reduce((a, c) => a + c.batches.reduce((x, b) => x + b.events.length, 0), 0);
const totalPlaying = careers.reduce((a, c) => a + c.playingSeasons, 0);
console.log(`   ${careers.length} careers, ${totalPlaying} playing seasons, ${totalBatches} event batches, ${totalFired} events shown, ${crashes} crashes`);
if (crashes > 0) fail(`${crashes} careers crashed`);
const expected = N * 2 + Math.ceil(N * 0.5);
if (careers.length < expected) fail(`${expected - careers.length} of ${expected} careers never finished`);
if (totalFired < 1000) fail(`only ${totalFired} events were shown across the sample, which is too few to measure anything below`);

/* ─── 2. no event fires twice inside its cooldown ────────────────────────── */

SECTION = '2';
console.log('2) No event fires twice inside its cooldown');
{
  /* Grouped by ledger key: the event id, or the story it shares with events
     in other catalogs, so a statue vote from the realism file inside the
     cooldown of the life one counts as the same story told twice. The gap
     is judged by the LATER event's cooldown, which is the rule the picker
     applies when it decides whether that later event may be drawn. */
  let pairs = 0;
  let storyPairs = 0;
  let violations = 0;
  let sameBatch = 0;
  const examples = [];
  for (const c of careers) {
    const firings = new Map();
    for (const b of c.batches) {
      const seen = new Set();
      for (const e of b.events) {
        if (seen.has(e.key)) sameBatch += 1;
        seen.add(e.key);
        if (!firings.has(e.key)) firings.set(e.key, []);
        firings.get(e.key).push({ id: e.id, season: b.season, cooldown: e.cooldown });
      }
    }
    for (const [key, list] of firings) {
      list.sort((a, b) => a.season - b.season);
      for (let i = 1; i < list.length; i += 1) {
        pairs += 1;
        if (key.startsWith('story:')) storyPairs += 1;
        const gap = list[i].season - list[i - 1].season;
        if (gap <= list[i].cooldown) {
          violations += 1;
          if (examples.length < 4) examples.push(`${key} (ids ${list[i - 1].id} then ${list[i].id}) fired in ${list[i - 1].season} and again in ${list[i].season} (cooldown ${list[i].cooldown}, ${c.mode} ${c.seed})`);
        }
      }
    }
  }
  console.log(`   ${pairs} repeat firings of the same event or story in the same career checked (${storyPairs} of them a shared story), ${violations} inside the cooldown, ${sameBatch} duplicated inside one batch`);
  for (const ex of examples) console.error(`   ${ex}`);
  if (pairs === 0) fail('no event ever fired twice in any career, so this section measured nothing');
  if (violations > 0) fail(`${violations} firings landed inside the event's cooldown`);
  if (sameBatch > 0) fail(`${sameBatch} batches carried the same event twice`);

  /* The ledger itself, read off the finished saves. */
  let ledgers = 0;
  let stamped = 0;
  for (const c of careers) {
    const led = c.state.eventLastFired;
    if (led && typeof led === 'object') { ledgers += 1; stamped += Object.keys(led).length; }
  }
  console.log(`   ${ledgers} of ${careers.length} finished saves carry a ledger, ${stamped} ids stamped in all`);
  if (ledgers < careers.length) fail(`${careers.length - ledgers} careers that drew events finished with no eventLastFired ledger`);
}

/* ─── 3. every id reachable, every new id fired ──────────────────────────── */

SECTION = '3';
console.log('3) Every life event is reachable, every new one fired');
{
  const unreachable = LIFE_IDS_IN_SOURCE.filter(id => !catalogById.has(id));
  const neverFired = NEW_IDS.filter(id => !(lifeFireCount.get(id) > 0));
  const counts = NEW_IDS.map(id => `${id}:${lifeFireCount.get(id) || 0}`).join(' ');
  console.log(`   ${LIFE_IDS_IN_SOURCE.length} ids in the life file, ${LIFE_IDS_IN_SOURCE.length - unreachable.length} of them offered to some career; ${NEW_IDS.length} new ids`);
  console.log(`   new id fire counts: ${counts}`);
  const optionsCovered = NEW_IDS.filter(id => {
    const e = catalogById.get(id);
    return e && e.choices.every((_, i) => (newChoiceTaken.get(`${id}:${i}`) || 0) > 0);
  }).length;
  console.log(`   ${optionsCovered} of the ${NEW_IDS.length} new events had every option taken at least once`);
  if (NEW_IDS.length < 15) fail(`only ${NEW_IDS.length} new ids in the 253 to 272 range, the round promised 15 to 20`);
  if (unreachable.length) fail(`life events no state in ${careers.length} careers could reach: ${unreachable.join(', ')}`);
  if (neverFired.length) fail(`new events that never fired in any career: ${neverFired.join(', ')}`);
}

/* ─── 4. the rate ────────────────────────────────────────────────────────── */

SECTION = '4';
console.log('4) The rate: not flooded, not starved');
{
  const perBatch = careers.flatMap(c => c.batches.map(b => b.events.length));
  const perSeason = totalPlaying ? totalBatches / totalPlaying : 0;
  const lifeSlots = careers.reduce((a, c) => a + c.batches.reduce((x, b) => x + b.events.filter(e => isLife(e.id)).length, 0), 0);
  const lifeShare = totalFired ? lifeSlots / totalFired : 0;
  const lifePerSeason = totalPlaying ? lifeSlots / totalPlaying : 0;
  const m = mean(perBatch);
  console.log(`   mean events per batch ${r2(m)}, batches per playing season ${r2(perSeason)}, life catalog share of slots ${r2(lifeShare)}, life events per playing season ${r2(lifePerSeason)}`);
  const band = (v, [lo, hi], what) => { if (v < lo || v > hi) fail(`${what} is ${r2(v)}, outside [${lo}, ${hi}]`); };
  band(m, BATCH_MEAN_BAND, 'mean events per batch');
  band(perSeason, BATCHES_PER_SEASON_BAND, 'batches per playing season');
  band(lifeShare, LIFE_SHARE_BAND, 'the life catalog share of batch slots');
  band(lifePerSeason, LIFE_PER_SEASON_BAND, 'life events per playing season');
}

/* ─── 5. the shape ───────────────────────────────────────────────────────── */

SECTION = '5';
console.log('5) Catalog shape: two real choices, a consequence each, an explicit cooldown');
{
  const lifeEvents = [...catalogById.values()].filter(e => isLife(e.id));
  const byCategory = {};
  for (const e of lifeEvents) byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  console.log(`   life events by category: ${Object.entries(byCategory).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  let fewOptions = 0, noConsequence = 0, noApply = 0, noCooldown = 0;
  for (const e of lifeEvents) {
    if (!Array.isArray(e.choices) || e.choices.length < 2) { fewOptions += 1; console.error(`   id ${e.id} "${e.title}" has ${e.choices ? e.choices.length : 0} option(s)`); }
    for (const ch of e.choices || []) {
      if (typeof ch.consequence !== 'string' || !ch.consequence.trim()) noConsequence += 1;
      if (typeof ch.apply !== 'function') noApply += 1;
    }
    if (typeof e.cooldown !== 'number') { noCooldown += 1; console.error(`   id ${e.id} carries no cooldown`); }
  }
  console.log(`   ${lifeEvents.length} life events: ${fewOptions} with fewer than two options, ${noConsequence} options without a consequence, ${noApply} without an apply, ${noCooldown} without a cooldown`);
  if (fewOptions) fail(`${fewOptions} life events offer fewer than two options`);
  if (noConsequence) fail(`${noConsequence} options have no consequence text`);
  if (noApply) fail(`${noApply} options have no apply function`);
  if (noCooldown) fail(`${noCooldown} life events have no explicit cooldown`);

  /* duplicate ids across the WHOLE catalog, which would conflate two ledgers */
  const sample = careers.find(c => c.midSave)?.midSave || careers[0].state;
  const allIds = getAllEvents(repairCareer(JSON.parse(JSON.stringify(sample)))).map(e => e.id);
  const dupIds = [...new Set(allIds.filter((id, i) => allIds.indexOf(id) !== i))];
  console.log(`   ${catalogById.size} distinct ids seen across every catalog, ${dupIds.length} ids used twice in one draw`);
  if (dupIds.length) fail(`event ids used more than once in one catalog draw: ${dupIds.join(', ')}`);

  /* identical consequence sets and near duplicate text, life catalog only */
  const sig = e => [...e.choices.map(c => c.consequence.trim().toLowerCase())].sort().join(' | ');
  const words = t => new Set(String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3));
  const jaccard = (a, b) => { let inter = 0; for (const w of a) if (b.has(w)) inter += 1; return inter / (a.size + b.size - inter || 1); };
  let sameSet = 0;
  let closest = { score: 0, a: null, b: null };
  for (let i = 0; i < lifeEvents.length; i += 1) {
    for (let j = i + 1; j < lifeEvents.length; j += 1) {
      const a = lifeEvents[i], b = lifeEvents[j];
      if (sig(a) === sig(b)) { sameSet += 1; console.error(`   ids ${a.id} and ${b.id} share an identical consequence set`); }
      const sc = jaccard(words(a.title + ' ' + a.description), words(b.title + ' ' + b.description));
      if (sc > closest.score) closest = { score: sc, a: a.id, b: b.id };
    }
  }
  console.log(`   ${sameSet} pairs with identical consequence sets; closest text pair ${closest.a} and ${closest.b} at ${r2(closest.score)} word overlap`);
  if (sameSet) fail(`${sameSet} pairs of life events have identical consequence sets`);
  if (closest.score > 0.5) fail(`life events ${closest.a} and ${closest.b} overlap at ${r2(closest.score)}, which is one event written twice`);

  /* the cooldown table itself: every value in COOLDOWN is a whole number of
     seasons, and the kinds the audit names all exist */
  for (const k of ['agent', 'personality', 'dressingRoom', 'media', 'money', 'family', 'injury', 'fans', 'national', 'late', 'once']) {
    if (!Number.isInteger(COOLDOWN[k]) || COOLDOWN[k] < 0) fail(`COOLDOWN.${k} is ${COOLDOWN[k]}, not a whole number of seasons`);
  }
  if (!(COOLDOWN.once >= 60)) fail(`COOLDOWN.once is ${COOLDOWN.once}, which a long career can outlive`);
}

/* ─── 5b. across the whole picker ────────────────────────────────────────── */

/* The life file is one of six catalogs the same picker draws from, and the
   first draft of this round's twenty events retold five events that already
   lived in the realism and eras files (a sleep coach, a fines treasurer, the
   anthem, a teenager at your position, your boyhood coach's fundraiser),
   while section 5 above, which only compares the life file with itself,
   stayed green. Two checks close that:
     STORY_SETS  the stories known to exist in more than one catalog, each
                 required to share one story key and to be once a career, so
                 the picker treats them as one story.
     REVIEWED    every pair of a life event and an event elsewhere whose
                 titles share a content word has been read and judged a
                 different story, with the reason. A pair nobody has read
                 fails, so the next retold story cannot arrive unread. */
const STORY_SETS = {
  squadChatLeak: [220, 63, 422],
  statueVote: [232, 462],
  podcastLaunch: [244, 68],
};
const REVIEWED = new Map([
  ['220:46', 'a squad chat message about the manager, against photos from a nightclub before a match'],
  ['220:473', 'the squad chat, against the FAMILY chat with your father\'s opinions and your baby photos'],
  ['221:46', 'a team dinner karaoke initiation, against a 3am nightclub two days before a match'],
  ['224:488', 'the mascot trash talks and races you, against a mascot costume of your own head'],
  ['230:438', 'a superstition about boots, against a boot sponsorship running out'],
  ['230:54', 'a superstition about boots, against boot makers bidding for you'],
  ['230:333', 'a superstition about boots, against fixing the top scorer race'],
  ['230:501', 'a superstition about boots, against your own signature boot'],
  ['238:485', 'a pigeon on your shoulder on live television, against a pigeon nesting in the goal as a charm'],
  ['217:500', 'a column you write, against a critic\'s column about you'],
  ['265:56', 'a rival agent pitching at a wedding, against your own agent raising his cut'],
  ['265:471', 'a rival agent pitching at a wedding, against your brother wanting the job'],
  ['207:56', 'your agent also representing your rival, against your agent raising his cut'],
  ['207:471', 'your agent also representing your rival, against your brother wanting the job'],
  ['248:42', 'a fan proposing on the pitch, against proposing to your own partner'],
  ['256:32', 'the club series editing you into a villain afterwards, against a crew asking to film your season'],
  ['243:41', 'going on a reality dating show, against tabloid dating rumours'],
  ['244:409', 'starting your own podcast, against a guest spot on somebody else\'s'],
  ['245:409', 'the payoff of the podcast you started in 244, a public feud with a retired striker, against naming teammates as a guest'],
  ['245:68', 'the payoff of 244, which can only follow 244 (68 shares its story key), against the offer to start one'],
  ['233:462', 'a wax museum figure, against an outdoor statue vote'],
  ['266:494', 'a paper printing the wrong release clause, against a club actually paying it'],
  ['232:450', 'a statue vote, against a squad voting to boycott a qualifier'],
  ['232:310', 'a statue vote, against buying award votes'],
  ['232:311', 'a statue vote, against the vote broker\'s receipts'],
  ['208:46', 'your agent leaking fake transfer interest, against nightclub photos'],
  ['214:436', 'an opponent stamping on your boot in the tunnel, against your own nerves in the tunnel'],
]);

SECTION = '5b';
console.log('5b) Across the whole picker: no story told twice, no title shared');
{
  const all = [...catalogById.values()];
  const lifeEvents = all.filter(e => isLife(e.id));
  const others = all.filter(e => !isLife(e.id));
  const norm = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  /* Grammar, plus the words that say where or in what format a story
     happens rather than what it is about (a room, a club, a show, a night,
     a pitch in either sense, a number). Measured: with only the grammar
     words, 63 pairs came up and the ones carried by these words were all
     coincidences of setting ("Film Room Legend" and "The Scan Room"). */
  const STOP = new Set(['your', 'with', 'that', 'they', 'them', 'from', 'have', 'wants', 'want', 'again', 'after',
    'what', 'when', 'this', 'more', 'than', 'into', 'about', 'were', 'been', 'every', 'same', 'just', 'only', 'over',
    'first', 'someone', 'somebody', 'there', 'their', 'nobody', 'everyone',
    'room', 'club', 'game', 'team', 'show', 'night', 'take', 'talk', 'break', 'need', 'named', 'forty', 'nine',
    'city', 'centre', 'head', 'contract', 'interview', 'pitch', 'training', 'ground', 'preseason']);
  const contentWords = t => new Set(norm(t).split(' ')
    .map(w => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter(w => w.length > 3 && !STOP.has(w)));

  /* the story sets */
  let storyProblems = 0;
  for (const [story, ids] of Object.entries(STORY_SETS)) {
    if (STORY[story] !== story) { storyProblems += 1; fail(`STORY.${story} is missing from soccerCareerLife.ts`); continue; }
    for (const id of ids) {
      const e = catalogById.get(id);
      if (!e) { storyProblems += 1; fail(`story ${story}: id ${id} never turned up in any career, so its key cannot be checked`); continue; }
      if (e.story !== story) { storyProblems += 1; fail(`story ${story}: id ${id} "${e.title}" carries story ${e.story ?? 'none'}, so it can retell the story inside the cooldown`); }
      if (eventCooldown(e) < COOLDOWN.once) { storyProblems += 1; fail(`story ${story}: id ${id} has cooldown ${eventCooldown(e)}, so the story can come round twice`); }
    }
  }
  const keyed = all.filter(e => e.story);
  const strays = keyed.filter(e => !(STORY_SETS[e.story] || []).includes(e.id));
  for (const e of strays) fail(`id ${e.id} "${e.title}" carries story ${e.story} but is not in STORY_SETS here, read it and add it`);
  console.log(`   ${Object.keys(STORY_SETS).length} stories told by more than one catalog, ${keyed.length} events carrying a story key, ${storyProblems + strays.length} problems`);

  /* exact titles */
  const titleClash = [];
  /* an identical title is fine only inside one story, where the player can
     only ever see one of the two */
  for (const a of lifeEvents) {
    for (const b of others) {
      if (norm(a.title) === norm(b.title) && !(a.story && a.story === b.story)) titleClash.push(`${a.id} and ${b.id} are both "${a.title}"`);
    }
  }
  /* shared title words */
  const shared = [];
  for (const a of lifeEvents) {
    const wa = contentWords(a.title);
    for (const b of others) {
      const common = [...contentWords(b.title)].filter(w => wa.has(w));
      if (!common.length) continue;
      const sameStory = a.story && a.story === b.story;
      shared.push({ a: a.id, b: b.id, words: common.join(' '), sameStory, at: a.title, bt: b.title });
    }
  }
  const unread = shared.filter(p => !p.sameStory && !REVIEWED.has(`${p.a}:${p.b}`));
  const staleReviews = [...REVIEWED.keys()].filter(k => !shared.some(p => `${p.a}:${p.b}` === k));
  console.log(`   ${lifeEvents.length} life events against ${others.length} elsewhere: ${titleClash.length} identical titles, ${shared.length} pairs sharing a title word (${shared.filter(p => p.sameStory).length} of them one shared story, ${REVIEWED.size} read and judged different, ${unread.length} unread)`);
  for (const t of titleClash) console.error(`   identical title: ${t}`);
  for (const p of unread) console.error(`   unread pair ${p.a}:${p.b} share "${p.words}": "${p.at}" and "${p.bt}"`);
  for (const k of staleReviews) console.error(`   REVIEWED carries ${k}, which no longer shares a title word: drop it`);
  if (titleClash.length) fail(`${titleClash.length} life events share an exact title with an event in another catalog`);
  if (unread.length) fail(`${unread.length} pairs share a title word and nobody has read them: read both, then add the pair to REVIEWED with the reason, or give them one story key`);
  if (staleReviews.length) fail(`${staleReviews.length} REVIEWED entries no longer match a pair`);
}

/* ─── 6. text hygiene ────────────────────────────────────────────────────── */

SECTION = '6';
console.log('6) Text: no dashes, no rival names, no real person speaking');
{
  const lifeEvents = [...catalogById.values()].filter(e => isLife(e.id));
  const texts = [];
  for (const e of lifeEvents) {
    texts.push([e.id, e.title], [e.id, e.description]);
    for (const ch of e.choices) texts.push([e.id, ch.label], [e.id, ch.consequence]);
  }
  /* The en dash (U+2013) and the em dash (U+2014), spelt by code point so
     this file does not itself carry the characters it bans. */
  const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
  let dashes = 0;
  for (const [id, t] of texts) if (DASHES.test(t)) { dashes += 1; if (dashes <= 3) console.error(`   id ${id} carries a dash: ${t}`); }

  /* RIVAL_NAMES, read off simNoRivalNames so the two lists cannot drift */
  const guard = fs.readFileSync(path.join(ROOT, 'scripts/simNoRivalNames.mjs'), 'utf8');
  const start = guard.indexOf('const RIVAL_NAMES = [');
  const end = guard.indexOf('];', start);
  if (start < 0 || end < 0) fail('could not find RIVAL_NAMES in scripts/simNoRivalNames.mjs');
  const rivals = start >= 0 ? new Function(`return [${guard.slice(start + 'const RIVAL_NAMES = ['.length, end)}];`)() : [];
  let rivalHits = 0;
  for (const [id, t] of texts) {
    for (const r of rivals) {
      if (new RegExp(r, 'i').test(t)) { rivalHits += 1; if (rivalHits <= 3) console.error(`   id ${id} matches rival pattern ${r}: ${t}`); }
    }
  }

  /* Capitalised Two Word names: everything that could be a person. The
     allowlist is the generated cast plus title case phrases the catalog
     uses; anything else is a name nobody has vouched for. */
  const ALLOW = new Set([
    'Cousin Ricky', 'Marco De', 'De Luca', 'Zara Blackwood', 'Councilman Dave', 'Gaffer Two',
    'The Showman', 'Ice Cold', 'The Hothead', 'The Professor', 'The Enigma', 'Who Are', 'Are You',
    'Everyone Wants', 'Wants To', 'To Rep', 'Rep You', 'Ricky Posted', 'Posted Your', 'Your Contract',
    'Wrong Preseason', 'Double Agent', 'The Leak', 'The Halftime', 'Halftime Backflip', 'Trademark The', 'The Celebration',
    'No Celebration', 'The One', 'Tunnel Incident', 'The Drinks', 'Drinks Cart', 'Cart Flip', 'Film Room', 'Room Legend',
    'The Tactics', 'Tactics Column', 'The Monastery', 'Monastery Offseason', 'The Cape', 'Cape Era', 'The Group', 'Group Chat',
    'Chat Leak', 'Karaoke Night', 'Night Leak', 'Wrong City', 'The Aux', 'Aux Cord', 'Cord War', 'Mascot Beef', 'The Tell',
    'Book Offer', 'Buy An', 'An Esports', 'Esports Team', 'Esports Season', 'Season Results', 'The Golf', 'Golf Bug',
    'The Milk', 'Milk Protocol', 'The Cursed', 'Cursed Boots', 'The Curse', 'Curse Breaks', 'The Statue', 'Statue Vote',
    'The Wax', 'Wax Statue', 'The Lookalike', 'Lookalike Strikes', 'Strikes Again', 'A Teammate', 'Teammate Needs',
    'The Repayment', 'The Pigeon', 'Prank War', 'War Escalation', 'Barber Catastrophe', 'A Village', 'Village Named',
    'Named A', 'A Goat', 'Goat After', 'After You', 'The Mansion', 'Mansion Is', 'Is Haunted', 'Reality Dating',
    'Dating Show', 'Show Invite', 'Start A', 'A Podcast', 'Podcast Hot', 'Hot Take', 'Take Backlash', 'The Spicy',
    'Spicy Wings', 'Wings Interview', 'The Training', 'Training Ground', 'Ground Raccoon', 'Pitch Invasion', 'Invasion Proposal',
    'The Biopic', 'Biopic Offer', 'The Teammate', 'Teammate Coin', 'The Pen', 'Pen Pal', 'Your Mum', 'Mum Is', 'Is In',
    'In The', 'The Comments', 'The Sibling', 'Sibling Trial', 'The Documentary', 'Documentary Edit', 'The Energy', 'Energy Drink',
    'Drink Pitch', 'The Garden', 'Centre Charge', 'The Accountant', 'The Head', 'The Niggle', 'The Comeback',
    'Comeback Game', 'Secret Santa', 'The Rookie', 'First Car', 'The Agent', 'Agent Poach', 'The Release', 'Release Clause',
    'Clause Rumour', 'The Camp', 'The Under', 'Under Nines', 'Medal Night', 'Forty Feet', 'One Typo', 'The Coaching',
    'Coaching Badges', 'The Screen', 'The Body', 'Body Talks', 'Pure Class',
    'Golden Boot', 'Player Of', 'Of The', 'The Month', 'The Shark', 'Super Agent', 'Champions League', 'World Cup', 'Mr Agent',
    /* fragments the regex cuts out of hyphenated titles and a pigeon's name */
    'Adopt Gerald', 'All Book', 'Word Interview',
  ]);
  const suspects = new Map();
  for (const [id, t] of texts) {
    for (const m of String(t).matchAll(/\b([A-Z][a-z]+) ([A-Z][a-z]+)\b/g)) {
      const name = `${m[1]} ${m[2]}`;
      if (!ALLOW.has(name)) suspects.set(name, id);
    }
  }
  console.log(`   ${texts.length} strings checked: ${dashes} with a dash, ${rivalHits} rival name hits, ${suspects.size} unvouched Capitalised Name pairs`);
  for (const [name, id] of suspects) console.error(`   id ${id}: "${name}" is not on the generated cast list, read it`);
  if (dashes) fail(`${dashes} strings carry an em or en dash`);
  if (rivalHits) fail(`${rivalHits} strings match the rival names list`);
  if (suspects.size) fail(`${suspects.size} capitalised names nobody has vouched for as generated`);
}

/* ─── 7. old saves ───────────────────────────────────────────────────────── */

SECTION = '7';
console.log('7) A save with no ledger loads and plays; a corrupt ledger is dropped');
{
  const withMid = careers.filter(c => c.midSave && !c.midSave.retired).slice(0, 25);
  let played = 0;
  let stampedAfter = 0;
  let threw = 0;
  for (const c of withMid) {
    const realRandom = Math.random;
    Math.random = seeded(c.seed + 777);
    try {
      const raw = JSON.parse(JSON.stringify(c.midSave));
      delete raw.eventLastFired;
      let s = repairCareer(raw);
      if (s.eventLastFired !== undefined) fail('repairCareer invented a ledger for a save that never had one');
      /* finish the batch that was on screen, then play a season through to the next batch */
      let guard = 0;
      let sawBatch = false;
      while (guard++ < 60 && !s.retired) {
        if (s.phase === 'random_events') {
          const ev = s.pendingEvents[0];
          if (!ev) { s.pendingEvents = []; s.phase = 'playing'; continue; }
          s = applyEventChoice(s, 0, clubs);
          if (s.phase !== 'random_events' && s.pendingEvents.length === 0) sawBatch = sawBatch || false;
          continue;
        }
        if (s.phase === 'playing') { if (played > withMid.length * 2) break; s = advanceProSeason(s, clubs); played += 1; continue; }
        if (s.phase === 'newspaper') { s = dismissNewspaper(s); continue; }
        if (s.phase === 'season_summary') { s = dismissSummary(s, clubs); continue; }
        if (s.phase === 'rehab_choice') { s = applyRehabChoice(s, 1); continue; }
        if (s.phase === 'moral_dilemma') { s = dismissMoralDilemma(s, clubs); continue; }
        if (s.phase === 'social_media_action') { s = dismissSocialMediaPhase(s, clubs); continue; }
        if (s.phase === 'red_card_appeal_result') { s = dismissAppealResult(s, clubs); continue; }
        if (s.phase === 'international_debut') { s = dismissDebut(s, clubs); continue; }
        if (s.phase === 'world_cup') { s = dismissWorldCup(s, clubs); continue; }
        if (s.phase === 'rivalry_event') { s = dismissRivalryEvent(s, clubs); continue; }
        if (s.phase === 'ballon_dor') { s = dismissBallonDor(s, clubs); continue; }
        if (s.phase === 'transfer_window') { s = stayAtClub(s); if (s.eventLastFired && Object.keys(s.eventLastFired).length) { sawBatch = true; break; } continue; }
        if (s.phase === 'retirement_suggestion') { s = acceptRetirementSuggestion(s); continue; }
        break;
      }
      if (sawBatch || (s.eventLastFired && Object.keys(s.eventLastFired).length)) stampedAfter += 1;
    } catch (err) {
      threw += 1;
      if (threw <= 2) console.error(`   old save ${c.seed} threw: ${err && err.message}`);
    } finally {
      Math.random = realRandom;
    }
  }
  console.log(`   ${withMid.length} mid career saves stripped of their ledger: ${threw} threw, ${stampedAfter} had a ledger again after their next batch`);
  if (withMid.length === 0) fail('no mid career save was captured, so section 7 measured nothing');
  if (threw) fail(`${threw} ledgerless saves threw while playing on`);
  if (stampedAfter < withMid.length) fail(`${withMid.length - stampedAfter} ledgerless saves played a season and still had no ledger`);

  /* the corrupt shapes repairCareer must drop */
  const base = withMid[0] ? JSON.parse(JSON.stringify(withMid[0].midSave)) : null;
  if (base) {
    for (const bad of [[1, 2], 'nope', 7, null]) {
      const fixed = repairCareer({ ...JSON.parse(JSON.stringify(base)), eventLastFired: bad });
      if (fixed.eventLastFired !== undefined) fail(`repairCareer kept a ledger of type ${Array.isArray(bad) ? 'array' : typeof bad}`);
    }
    const kept = repairCareer({ ...JSON.parse(JSON.stringify(base)), eventLastFired: { '220': 2024 } });
    if (!kept.eventLastFired || kept.eventLastFired['220'] !== 2024) fail('repairCareer dropped a perfectly good ledger');
    /* and the rule itself, on a hand built state */
    const probe = { ...kept, seasons: [{ year: 2026 }], eventLastFired: { '220': 2024 } };
    const ev = { id: 220, category: 'life', cooldown: 2, choices: [] };
    if (!isEventOnCooldown(probe, ev)) fail('id 220 fired in 2024 with cooldown 2 should still be held out in 2026');
    if (isEventOnCooldown({ ...probe, seasons: [{ year: 2027 }] }, ev)) fail('id 220 fired in 2024 with cooldown 2 should be free again in 2027');
    if (isEventOnCooldown({ ...probe, eventLastFired: undefined }, ev)) fail('an event with no ledger entry must never be on cooldown');
    console.log('   corrupt ledgers dropped, a good one kept, and the hold out rule answers 2024 + 2 correctly');
  }
}

/* ─── verdict ────────────────────────────────────────────────────────────── */

if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const others = [...failedSections].filter(s => s !== c.breaks);
  if (!failedSections.has(c.breaks)) {
    console.error(`\nCONTROL DID NOT FIRE: ${CONTROL} put the defect back and section ${c.breaks} stayed green${others.length ? ` (sections ${others.join(', ')} failed instead)` : ''}. The check is not checking.`);
    process.exit(1);
  }
  console.log(`\nCONTROL FIRED: section ${c.breaks} failed with the defect back in, as it should${others.length ? `; section${others.length === 1 ? '' : 's'} ${others.join(', ')} failed too` : ', and nothing else did'}.`);
  process.exit(0);
}
console.log(failures ? `\nsimCareerLifeCooldowns: ${failures} FAILURE${failures === 1 ? '' : 'S'}` : '\nsimCareerLifeCooldowns: green. No event repeats inside its cooldown, every new event fires, the rate held, and the catalog has two real choices everywhere.');
process.exit(failures ? 1 : 0);
