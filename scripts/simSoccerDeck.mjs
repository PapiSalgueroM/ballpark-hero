/* ─── Round 1334: Soccer Career's binding of the shared deck, proven in node ──

   src/lib/soccerDeck.ts binds the shared deck (src/lib/gmInbox.ts) to Soccer
   Career's between seasons batch: at most one card a summer, first, from its
   own keyed stream, added and never replacing. It is lazy: the engine reaches
   it only through src/lib/soccerDeckGate.ts, which answers [] until something
   calls loadSoccerDeck(), and nothing in the game calls it in this round. This
   harness bundles the head and SC_BASE (the tree the round was cut from) and
   holds the binding to what it claims, exactly: at a deal, from the same
   state, the old batch is the base's and the deck card is first; a neutral
   answer changes nothing else. Nobody may report more than that.

     1) BIND. The shipped pack has no problem (soccerDeckProblems, which runs
        gmPackProblems over the soccer words first); every soccer rule is
        refused by one breakage made in memory, each with its own message
        (cash, popularity, karma, a desk effect, a keeper word on an outfield
        card, an outfield word on a keeper card, a training key on a situation
        card, a training value that is not a whole number above 0, id 650, a
        duplicate id, a missing title, a missing kind, no neutral option,
        wordings, a tag, a one shot, a story, a card's own chance, a pack
        chance other than 1, an undeclared fact); and a pack with a problem
        deals nothing where the clean pack deals.
     2) INERT. The deck not loaded: a fleet of 200 careers (the page's ten
        position codes and its eight eras round robin, Math.random seeded 0 to
        199, twelve seasons, every card answered on its first option) on the
        head and on SC_BASE: the save after every step byte equal (sha1 of its
        JSON) and the Math.random call count equal.
     3) ADDS, NEVER REPLACES. The deck loaded. Per deal, from one identical
        state (each deal state of the base fleet, handed to both bundles with
        Math.random reseeded identically just before generateRandomEvents and
        before getAllEvents): the head's batch minus a first deck card equals
        the base's batch (ids, order, titles, words, the choices' labels and
        consequences), at most one deck card and only at index 0, the same
        Math.random count, getAllEvents equal, and the stamps the base's plus
        the deck card's own key. Then a head fleet with the deck loaded: no
        deck card is pending at any deal, and the deck dealt cards (counted).
     4) NEUTRAL. The deck loaded and every deck card answered on its option
        that moves nothing, every other card on its first option, Math.random
        reseeded before every engine step from the career, the season, the
        step's phase and its count, with no key for the deck card's answer
        (answering it builds the catalog, and the catalog draws, so a
        continuous stream would part the fleets on healthy code): every
        season end save equals the base's once the deck's own stamps are
        taken out of eventLastFired; seasons whose old draw was empty (the
        deck card dealt alone, the one way lastEventId could move) are
        counted and listed.
     5) PROMISES. Every option of every card on fixture careers of each group
        (GK, CB, CM, ST) at room 0, 1 and 5 under the ceiling and morale 0, 1,
        50, 99 and 100, fresh for each answer: the whole save after the answer
        equals the save before with exactly the printed effects applied, each
        by the printed amount or to its bound (training at momentsRoom and at
        a stat of 99, where the season start clamps it: at morale 50 each
        fixture also runs with all seven stats at 99; morale at 0 and 100),
        and one season log line saying what landed; netWorth,
        totalEarnings, socialMediaFollowers, popularity and karma never move;
        the option that moves nothing moves nothing and logs nothing. At room
        0 and 1 no card is dealt whose training would not fit (the hold). A
        drill banked between the deal and the answer: the answer lands what
        fits and its line says it is at the ceiling. Over a loaded fleet: how
        many deck answers clamp (0 expected: the card is answered first), and
        how often a deck boost and a full drill in one summer would pass the
        ceiling only because of the deck (printed: the drills' room does not
        count queued boosts, a rule owed to the drills).
     6) REACH BY POSITION. 400 careers (the ten codes, 40 each) of 18 seasons
        (15 never reach card 722, which needs 31) with the deck loaded: every position card is dealt to its own group
        (the drills' grouping: a CDM defends, LW and RW are forwards) and never
        to another, every situation card to at least one group, no keeper is
        printed an outfield training word nor an outfielder a keeper one; per
        code the cards reached, deck cards a summer and the top card's share,
        and per group the share of summers that dealt a deck card (printed,
        not asserted: Round 1504's words read it).
     7) KEYED. A spy around the slot and the deck's answers only (the
        fleet's whole Math.random count is printed, never asserted): they
        draw nothing. The same saves dealt in a second, fresh bundle under a
        different Math.random stream deal the same cards. The same save dealt
        eight summers with only the last row's year moved and no stamp
        carried: the share of careers dealt two different cards stays over a
        floor measured over five samples.
     8) ECONOMY. Four arms (the deck off, BEST, WORST, NEUTRAL) over five
        seeds of whole careers: morale and integrity at 25 and 30, the overall
        at 30, the peak, the legacy score, the share ever at integrity 40, the
        share of season starts past the ceiling, each arm against the deck off
        inside a band set from the measured seed to seed spread; exact: no
        deck answer queues more than momentsRoom allowed just before it.
        Since Round 1504 the arms are paired (Math.random reseeded before
        every engine step, the deck answer on a stream of its own) and the
        legacy band is the lead's ruling, 1.2 for every arm.
     9) OLD SAVES. Saves the base wrote load to the same JSON here and play
        the same season (the deck not loaded); a save written here with a
        deck card pending passes the save validator, loads on the base and is
        skipped with its stamp handed back (Round 667's path), and answers
        here once the deck is loaded.
     10) LAZY, the static half. The static closure (scripts/lib/
        staticClosure.mjs) of src/pages/SoccerCareer.tsx and of the engine
        holds soccerDeckGate.ts and none of soccerDeck.ts, src/data/
        soccerDeck/* or gmInbox.ts; and, since Round 1504, the page calls
        loadSoccerDeck and no other src file but the gate and tests does,
        read as code with its comments gone.

   Every section deals the shipped pack (28 cards). The one card fixture pack
   made in memory (FIXTURE below) is what the leak control hands the gate, and
   what the deal sections would fall back on if the shipped pack were ever
   empty.

   Negative controls (SIM_SOCCER_DECK_CONTROL), each asserting the text it
   changes is in its file exactly once and refusing to run otherwise:
     bindopen  soccerDeckProblems returns [] (soccerDeck.ts, in memory): every
               breakage passes; section 1 fails.
     leak      the gate's two answers read a deck the harness hands in through
               a global, as if the ready test were forced true, over the one
               card fixture (soccerDeckGate.ts, in memory); section 2 fails.
     last      the engine's slot line pushes the deck card instead of putting
               it first (in memory); section 3 fails.
     pool      the pending reader loses its phase guard and returns every
               card of the pack (soccerDeck.ts, in memory); section 3 fails.
     silent    the button's words drop every outfield training word
               (soccerDeck.ts, in memory); section 5 fails.
     drop      the answer skips every outfield training apply (soccerDeck.ts,
               in memory); section 5 fails. Both refuse to run on a pack that
               moves no outfield training key (their first form targeted
               integrity, which the pack stopped moving, and changed nothing).
     ceiling   a training key ignores momentsRoom (soccerDeck.ts, in memory):
               a boost lands at room 0; section 5 fails.
     statmax   a training key ignores a stat at 99 (soccerDeck.ts, in memory):
               the +1 the season start clamp drops is queued and its cost is
               paid; section 5 fails on the maxed fixtures (review of
               2026-10-17).
     posleak   card 706 (a defender's) is widened to pos < 3 in the pack the
               fleet deals from; the widened pack passes the bind check, so the
               red is a midfielder dealt 706, not a pack that deals nothing;
               section 6 fails.
     neutralmoves the option that moves nothing gives morale +1 (soccerDeck.ts,
               in memory); section 4 fails.
     noreseed  section 4's fleets run on one continuous stream each; the deck
               answer's catalog draws part them; section 4 fails, which is
               what proves the reseeding load bearing.
     mathrandom the slot draws from Math.random (soccerDeck.ts, in memory);
               section 7 fails.
     keyseason the engine's slot key loses the season (in memory): the same
               save deals one card every summer; section 7 fails.
     pressure  every deck move times ten (the pack, in memory); section 8
               fails on a band.
     freetraining every training option's time cost stripped and its
               training doubled (the pack, in memory, Round 1504), with the
               bind rule that refuses free training off (soccerDeck.ts, in
               memory) so the free pack deals; section 8 fails on the
               ruling's legacy band.
     onefree   the first training option of the shipped pack loses its time
               cost (the pack, in memory; review of 2026-10-17), and a key
               only that cost moved leaves the pressure book, so the one
               problem left is the free training: the bind check refuses the
               pack, so section 1 fails on the shipped pack.
     noresolve the engine's catalog spread of the pending deck card is gone
               (in memory): a saved deck card is skipped here too; section 9
               fails.
     eager     the gate gains a static import of './soccerDeck' (in memory);
               section 10 fails.
     caller    the engine gains a call of loadSoccerDeck (in memory, Round
               1504: the page is the one caller now); section 10 fails.
     pagesilent the page's calls of loadSoccerDeck are gone (in memory, Round
               1504): no card would ever be dealt; section 10 fails.
   Exit 0 green, 1 red (or a control that fired), 2 could not run, 3 a control
   that did not fire.

   SIM_SOCCER_DECK_SECTIONS=2,3 runs only those sections. SIM_SOCCER_DECK_BASE
   moves SC_BASE (default e814c2de, origin/main when the round started).
   Runtime, measured 2026-10-16 on a GitHub runner (rc r1334-f1): the whole harness 188 s, over the 150 s an agent's
   command may take, so the gate runs it as three lines: SIM_SOCCER_DECK_SECTIONS=1,2,3,4,5 (112 s),
   SIM_SOCCER_DECK_SECTIONS=6,7,9,10 (69 s) and SIM_SOCCER_DECK_SECTIONS=8 (98 s). A control runs only its own
   section: 2 s (bindopen, eager, caller) to 82 s (pressure). */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import { staticClosure, codeOf } from './lib/staticClosure.mjs';

const T0 = Date.now();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SIM_SOCCER_DECK_BASE || 'e814c2def671e07bd6163462dff8ab1230be2000';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const GATE = 'src/lib/soccerDeckGate.ts';
const DECK = 'src/lib/soccerDeck.ts';
const PAGE = 'src/pages/SoccerCareer.tsx';
const CONTROL = process.env.SIM_SOCCER_DECK_CONTROL || '';
const SECTIONS = (process.env.SIM_SOCCER_DECK_SECTIONS || '').split(',').filter(Boolean);
/* A control runs only the section it breaks, unless SIM_SOCCER_DECK_SECTIONS names others. */
const runs = n => (SECTIONS.length ? SECTIONS.includes(String(n)) : !CONTROL || CONTROLS[CONTROL]?.breaks === String(n));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-deck-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
const secs = () => ((Date.now() - T0) / 1000).toFixed(1);
const lf = t => t.split('\r\n').join('\n');
const readSrc = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const copy = v => JSON.parse(JSON.stringify(v));
const sha1 = t => createHash('sha1').update(t).digest('hex');

let SECTION = '';
const red = new Set();
let failures = 0;
const fail = msg => { failures += 1; red.add(SECTION); console.error(`   FAIL ${msg}`); };
const ok = msg => console.log(`   ok ${msg}`);

/* ─── the controls: one in memory edit each ───────────────────────────── */

const CONTROLS = {
  bindopen: { breaks: '1', file: DECK, edits: [['export function soccerDeckProblems(pack: SoccerDeckPack): string[] {\n', 'export function soccerDeckProblems(pack: SoccerDeckPack): string[] {\n  if (pack) return []; /* bindopen control */\n']] },
  leak: { breaks: '2', file: GATE, edits: [
    ['  return DECK ? DECK.pendingSoccerDeck(state) : [];', '  const d = DECK ?? (globalThis as { __sdLeak?: SoccerDeckModule }).__sdLeak; return d ? d.pendingSoccerDeck(state) : []; /* leak control */'],
    ['  return DECK ? DECK.dealSoccerDeck(state, season, key, taken) : [];', '  const d = DECK ?? (globalThis as { __sdLeak?: SoccerDeckModule }).__sdLeak; return d ? d.dealSoccerDeck(state, season, key, taken) : []; /* leak control */']] },
  last: { breaks: '3', file: ENGINE, edits: [['  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));', '  picked.push(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked)); /* last control */']] },
  pool: { breaks: '3', file: DECK, edits: [["  if (state.phase !== 'random_events' || problemsOf(pack).length > 0) return [];\n", '  return deckToRandomEvents(pack, pack.events); /* pool control */\n']] },
  silent: { breaks: '5', file: DECK, edits: [["        consequence: choiceEffects(c, pack, SOCCER_FX_WORDS).join(', ') || 'Nothing changes',",
    "        consequence: choiceEffects(c, pack, SOCCER_FX_WORDS).filter(w => !/^(Pace|Shooting|Passing|Dribbling|Defending|Physical) next season /.test(w)).join(', ') || 'Nothing changes', /* silent control */"]] },
  drop: { breaks: '5', file: DECK, edits: [['    def.apply(s, v);\n', "    if (!k.startsWith('t_')) def.apply(s, v); /* drop control */\n"]] },
  ceiling: { breaks: '5', file: DECK, edits: [['      const add = Math.max(0, Math.min(v, momentsRoom(s), top));', '      const add = Math.max(0, v); /* ceiling control */']] },
  statmax: { breaks: '5', file: DECK, edits: [['      const add = Math.max(0, Math.min(v, momentsRoom(s), top));', '      const add = Math.max(0, Math.min(v, momentsRoom(s))); /* statmax control */']] },
  posleak: { breaks: '6', file: null, edits: null },
  neutralmoves: { breaks: '4', file: DECK, edits: [['        apply: still ? (s: CareerState) => s : (s: CareerState) => landChoice(s, def.emoji, title, c),',
    '        apply: still ? (s: CareerState) => ({ ...s, morale: Math.min(100, s.morale + 1) }) : (s: CareerState) => landChoice(s, def.emoji, title, c), /* neutralmoves control */']] },
  noreseed: { breaks: '4', file: null, edits: null },
  mathrandom: { breaks: '7', file: DECK, edits: [['  return deckToRandomEvents(pack, [gmTake(eligible, keyedRng(key))]);', '  return deckToRandomEvents(pack, [gmTake(eligible, Math.random)]); /* mathrandom control */']] },
  keyseason: { breaks: '7', file: ENGINE, edits: [['  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|${season}|deckslot`, picked));', '  picked.unshift(...soccerDeckSlot(state, season, `${soccerDeckIdentity(state)}|deckslot`, picked)); /* keyseason control */']] },
  pressure: { breaks: '8', file: null, edits: null },
  freetraining: { breaks: '8', file: DECK, edits: [['      else if (costs < gains) out.push(costs === 0 ? `${e.id}: "${c.label}" trains ${gains} and pays no cost` : `${e.id}: "${c.label}" trains ${gains} and pays only ${costs}`);\n', '      /* freetraining control: the bind rule on free training is off */\n']] },
  onefree: { breaks: '1', file: null, edits: null },
  noresolve: { breaks: '9', file: ENGINE, edits: [['    ...soccerDeckPending(state),\n', '    /* noresolve control */\n']] },
  eager: { breaks: '10', file: GATE, edits: null },
  caller: { breaks: '10', file: ENGINE, edits: null },
  pagesilent: { breaks: '10', file: PAGE, edits: null },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`SIM_SOCCER_DECK_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(2); }
const swapped = new Map();
if (CONTROL && CONTROLS[CONTROL].edits) {
  const { file, edits } = CONTROLS[CONTROL];
  let src = readSrc(file);
  for (const [from, to] of edits) {
    const hits = src.split(from).length - 1;
    if (hits !== 1) { console.error(`${CONTROL} control: its text is in ${file} ${hits} times, not once, refusing to run`); process.exit(2); }
    src = src.replace(from, () => to);
  }
  swapped.set(file, src);
}
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL} (section ${CONTROLS[CONTROL].breaks} must fail)`);

/* ─── bundle ───────────────────────────────────────────────────────────── */

/* One mark in every copy of the engine, base and head alike, which draws
   nothing: generateRandomEvents hands its state to a hook, so a drive knows
   the exact state each deal starts from. It must find its line once. */
const MARK = ['export function generateRandomEvents(state: CareerState): RandomEvent[] {\n',
  'export function generateRandomEvents(state: CareerState): RandomEvent[] {\n  (globalThis as { __sdDeal?: (s: CareerState) => void }).__sdDeal?.(state);\n'];
async function bundle(tag, { ref = null } = {}) {
  let marked = 0;
  const plugin = { name: 'soccer-deck-source', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      let source = ref
        ? lf(execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
        : (swapped.get(rel) ?? readSrc(rel));
      if (rel === ENGINE) {
        assert.equal(source.split(MARK[0]).length - 1, 1, 'the harness mark finds generateRandomEvents exactly once');
        source = source.replace(MARK[0], () => MARK[1]);
        marked += 1;
      }
      return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.mjs`);
  const entry = ref ? "export * as engine from './src/lib/soccerCareerEngine';"
    : ["export * as engine from './src/lib/soccerCareerEngine';", "export * as gate from './src/lib/soccerDeckGate';",
      "export * as deck from './src/lib/soccerDeck';", "export { SOCCER_DECK_PACKS } from './src/data/soccerDeck';",
      "export * as words from './src/data/soccerDeck/words';", "export * as drills from './src/lib/careerDrills';",
      "export { momentsRoom } from './src/lib/season/soccerMoments';", "export * as save from './src/lib/soccerCareerSave';"].join('\n');
  await esbuild.build({
    stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  });
  assert.equal(marked, 1, `the ${tag} bundle loaded the engine exactly once`);
  return import(pathToFileURL(out).href);
}

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); }, key: i => [...store.keys()][i] ?? null, get length() { return store.size; }, clear: () => store.clear(),
};
const H = await bundle('head');
const B = await bundle('base', { ref: BASE });
const SHIPPED = H.SOCCER_DECK_PACKS.soccer;
console.log(`simSoccerDeck: head and base ${BASE.slice(0, 8)} bundled (${secs()} s); the shipped pack holds ${SHIPPED.events.length} cards${CONTROL ? `, CONTROL=${CONTROL}` : ''}`);

/* A one card pack for the sections that need a card while the shipped pack is
   empty: a situation card every group can be dealt, one option that moves
   morale and integrity and one that moves nothing. Never shipped. */
const FIXTURE_CARD = {
  id: '799', beat: 'summer', from: 'The coaching staff', emoji: '🧪', cooldown: 1,
  text: 'The coaching staff want a word about preseason.',
  choices: [
    { label: 'Come in early', reply: 'You come in early.', karma: 0, morale: -1, fx: { integrity: 1 } },
    { label: 'Come in on the usual day', reply: 'You come in with everyone else.', karma: 0 },
  ],
};
const FIXTURE = (() => {
  const p = { ...SHIPPED, events: [FIXTURE_CARD], titles: { 799: 'A word about preseason' }, kinds: { 799: 'positive' } };
  delete p.pressure;
  return p;
})();
/* The pack the deal sections use: the shipped one once it has cards. */
const PACK = SHIPPED.events.length > 0 ? SHIPPED : FIXTURE;
/* silent and drop change how the outfield training keys print and land: they prove nothing on a pack that moves none. */
if ((CONTROL === 'silent' || CONTROL === 'drop') && !PACK.events.some(e => e.choices.some(c => Object.keys(c.fx ?? {}).some(k => k.startsWith('t_'))))) {
  console.error(`${CONTROL} control: the pack moves no outfield training key, so the control would change nothing, refusing to run`);
  process.exit(2);
}
const moduleFor = pack => ({ ...H.deck,
  dealSoccerDeck: (s, season, key, taken) => H.deck.dealFromPack(pack, s, season, key, taken),
  pendingSoccerDeck: s => H.deck.pendingFromPack(pack, s) });

/* ─── seeded streams and the fleet ─────────────────────────────────────── */

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
const hashInt = key => parseInt(sha1(key).slice(0, 8), 16);
/** fn under a counted Math.random drawn from `stream`. */
function withStream(fn, stream) {
  const real = Math.random;
  let calls = 0;
  Math.random = () => { calls += 1; return stream(); };
  try { return { value: fn(), calls }; } finally { Math.random = real; }
}

/* The page's ten position codes and eight eras (src/pages/SoccerCareer.tsx POSITIONS and ERAS). */
const CODES = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const ERAS = [['1990-94', 1990], ['1995-99', 1995], ['2000-04', 2000], ['2005-09', 2005], ['2010-14', 2010], ['2015-19', 2015], ['2020-24', 2020], ['2025', 2025]];
const NATIONS = ['England', 'Brazil', 'France', 'Spain', 'Nigeria', 'Argentina', 'Japan', 'Norway', 'Morocco'];
const FLEET = 200;
const SEASONS = 12;
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const startOf = (M, seed) => {
  const [era, year] = ERAS[seed % ERAS.length];
  const ovr = 45 + (seed % 25);
  return M.initCareer(`Deck ${seed}`, NATIONS[seed % NATIONS.length], CODES[seed % CODES.length], era, stats(ovr), ovr, year, M.FALLBACK_CLUBS, null);
};

/** One move of the drive's policy, the same for every bundle: every card on its first option. */
function step(M, s, seed, clubs) {
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = (s.pendingOffers || []).find(x => x.isHomegrown) || (s.pendingOffers || [])[0]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': return s.pendingEvents && s.pendingEvents[0] ? M.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': {
      let t = M.dismissSocialMediaPhase(s, clubs);
      if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs);
      return t;
    }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (!sit || sit.type === 'no_interest') return M.stayAtClub(s);
      if (sit.type === 'one_offer') return seed % 2 === 0 ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      if (sit.type === 'bidding_war') return M.acceptOffer(s, sit.offerA);
      if (sit.type === 'dream_club') return M.acceptOffer(s, sit.offer);
      if (sit.type === 'contract_expiry') { const o = (sit.offers || []).find(x => x.isHomegrown) || (sit.offers || [])[0]; return o ? M.acceptOffer(s, o) : M.stayAtClub(s); }
      if (sit.type === 'request_result') return sit.offer ? M.acceptOffer(s, sit.offer) : M.stayAtClub(s);
      return M.stayAtClub(s);
    }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}

/**
 * One career of the fleet on one bundle, Math.random seeded from its seed, twelve seasons (or retirement).
 * `onStep(s)` sees the save after every step; `onDeal(state)` sees the exact state each deal starts from.
 */
function drive(M, seed, { onStep = null, onDeal = null, seasons = SEASONS, deckChoice = null } = {}) {
  const real = Math.random;
  let calls = 0;
  const stream = seeded(seed + 1);
  Math.random = () => { calls += 1; return stream(); };
  globalThis.__sdDeal = onDeal ? st => onDeal(copy(st)) : undefined;
  let steps = 0;
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = startOf(M, seed);
    onStep?.(s);
    for (let guard = 0; guard < 1500 && !s.retired; guard += 1) {
      if (s.phase === 'playing' && s.seasons.length >= seasons) break;
      const first = s.phase === 'random_events' ? s.pendingEvents?.[0] : null;
      const next = deckChoice && isDeck(first?.id) ? M.applyEventChoice(s, deckChoice(first), clubs) : step(M, s, seed, clubs);
      if (!next) break;
      s = next;
      steps += 1;
      onStep?.(s);
    }
    return { s, calls, steps };
  } finally { Math.random = real; globalThis.__sdDeal = undefined; }
}
const isDeck = id => typeof id === 'number' && id >= 700 && id <= 999;

/* ─── 1. the bind check ────────────────────────────────────────────────── */

SECTION = '1';
console.log('1) Bind: the shipped pack has no problem, every soccer rule is refused with its own message, and a pack with a problem deals nothing');
if (runs(1)) {
  const D = H.deck;
  /* onefree: the first option that pays a training cost loses it, as a later pack edit could (review of 2026-10-17) */
  let S1 = SHIPPED;
  if (CONTROL === 'onefree') {
    const at = SHIPPED.events.findIndex(e => e.choices.some(c => Object.values(c.fx ?? {}).some(v => v < 0)));
    if (at < 0) { console.error('onefree control: no option of the shipped pack pays a training cost, refusing to run'); process.exit(2); }
    const e = SHIPPED.events[at];
    const ci = e.choices.findIndex(c => Object.values(c.fx ?? {}).some(v => v < 0));
    const choices = e.choices.map((c, i) => (i === ci ? { ...c, fx: Object.fromEntries(Object.entries(c.fx).filter(([, v]) => v >= 0)) } : c));
    S1 = { ...SHIPPED, events: SHIPPED.events.map((x, i) => (i === at ? { ...e, choices } : x)) };
    /* a key only that cost moved leaves the pressure book too, so the one problem left is the free training itself
       (without this the control fired on the pressure book alone, rc r1504-x1) */
    const moved = new Set(S1.events.flatMap(x => x.choices).flatMap(c => [...Object.keys(c.fx ?? {}), ...(c.morale ? ['morale'] : [])]));
    if (S1.pressure) S1.pressure = Object.fromEntries(Object.entries(S1.pressure).filter(([k]) => moved.has(k)));
    console.log(`   onefree control: ${e.id} "${e.choices[ci].label}" loses its cost (${JSON.stringify(e.choices[ci].fx)} becomes ${JSON.stringify(choices[ci].fx)})`);
  }
  const shipped = D.soccerDeckProblems(S1);
  if (shipped.length) fail(`the shipped pack has ${shipped.length} problems: ${shipped.slice(0, 3).join('; ')}`);
  else ok(`the shipped pack (${SHIPPED.events.length} cards) has no problem`);
  /* The titles live outside the kit's frozen words and its legal scan, so they are scanned here with the kit's own
     rules (scripts/simEventDeck.mjs section 12): no quote mark, no dash, no first person, no conduct or private life
     word, and no real name off the thirteen roster files the kit harvests. */
  const deaccent = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const REAL = new Set();
  for (const rel of ['src/data/frontOfficePlayers.ts', 'src/data/conquestDataNba.ts', 'src/data/mlbFoPlayers.ts', 'src/data/mlbFoRosters2026.ts',
    'src/data/nhlFoPlayers.ts', 'src/data/cfbHLPlayers.ts', 'src/data/ufcFighters.ts', 'src/data/aflGoalKickers.ts']) {
    for (const m of readSrc(rel).matchAll(/name:\s*(?:"([A-Z][^"]{1,40} [^"]{2,40})"|'([A-Z][^']{1,40} [^']{2,40})')/g)) REAL.add(deaccent(m[1] ?? m[2]));
  }
  for (const rel of ['src/data/clubManagerRosters.ts', 'src/data/clubManagerEra2005.ts', 'src/data/clubManagerEra2010.ts', 'src/data/clubManagerEra2015.ts', 'src/data/clubManagerEra2020.ts']) {
    for (const m of readSrc(rel).matchAll(/\bn:\s*(?:"([^"]{2,40} [^"]{2,40})"|'([^']{2,40} [^']{2,40})')/g)) REAL.add(deaccent(m[1] ?? m[2]));
  }
  const TITLE_BAD = [
    [/["“”]/, 'a quote mark'], [new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`), 'a dash'],
    [/\b(I|I'm|I am|I've|I'll|my|me|mine|we|we're|us|our|boss|gaffer)\b/, 'the first person'],
    [/\b(casino|gambling debts?|drunk|drink driv\w*|arrested|having an affair|cheating on|missed training|hungover|assaulted|fined|suspended|disciplin\w*|curfew|police|court|arrest\w*)\b/i, 'a conduct word'],
    [/transfer request|bust-up|bust up|leaked|refus(ed|es)|demand(ed|s)|fell out|falling out|walked out|sulk|tantrum|handed in/i, 'a conduct word'],
    [/\b(family|homesick|faith|pray\w*|fasting|religio\w*|illness|mental health|grief|funeral|bereave\w*|wedding|divorce|pregnan\w*)\b/i, 'a private life word'],
  ];
  const titleBad = [];
  for (const [id, title] of Object.entries(SHIPPED.titles)) {
    for (const [re, what] of TITLE_BAD) if (re.test(title)) titleBad.push(`${id} "${title}": ${what}`);
    const name = [...REAL].find(n => deaccent(title).includes(n));
    if (name) titleBad.push(`${id} "${title}": a real name (${name})`);
  }
  if (REAL.size < 8000) fail(`only ${REAL.size} real names harvested, so the title scan means nothing`);
  if (titleBad.length) fail(`${titleBad.length} titles break the words rules: ${titleBad.slice(0, 3).join('; ')}`);
  else ok(`${Object.keys(SHIPPED.titles).length} titles: no quote mark, dash, first person, conduct or private word, or any of ${REAL.size} real names`);
  /* the breakages' base: the deal sections' pack plus a keeper and a forward training card made here */
  const KEEPER = { id: '798', beat: 'summer', from: 'Your keeper coach', emoji: '🧤', cooldown: 3, when: [{ fact: 'pos', op: '<', value: 1 }], text: 'Crosses.',
    choices: [{ label: 'Work on it', reply: 'You work on it.', karma: 0, fx: { gk_aerial_command: 1, gk_positioning: -1 } }, { label: 'Leave it', reply: 'You leave it.', karma: 0 }] };
  const FORWARD = { id: '797', beat: 'summer', from: 'The coaching staff', emoji: '⚽', cooldown: 3, when: [{ fact: 'pos', op: '>=', value: 3 }], text: 'Penalties.',
    choices: [{ label: 'Put your name down', reply: 'You put your name down.', karma: 0, fx: { t_shooting: 1, t_pace: -1 } }, { label: 'Leave it', reply: 'You leave it.', karma: 0 }] };
  const BB = { ...PACK, events: [...PACK.events, KEEPER, FORWARD], titles: { ...PACK.titles, 797: 'Penalties', 798: 'Crosses' }, kinds: { ...PACK.kinds, 797: 'positive', 798: 'positive' } };
  delete BB.pressure;
  const situation = BB.events.find(e => !(e.when ?? []).some(c => c.fact === 'pos'));
  const at = (id, patch) => ({ ...BB, events: BB.events.map(e => (e.id === id ? { ...e, ...patch } : e)) });
  const opt = (id, patch) => at(id, { choices: BB.events.find(e => e.id === id).choices.map((c, i) => (i === 0 ? { ...c, ...patch } : c)) });
  const without = (book, id) => { const o = { ...book }; delete o[id]; return o; };
  const BREAKAGES = {
    cash: opt('797', { cash: 1 }), popularity: opt('797', { popularity: 1 }), karma: opt('797', { karma: 1 }), desk: opt('797', { recruit: 1 }),
    'a keeper word on an outfield card': opt('797', { fx: { gk_reflexes: 1 } }),
    'an outfield word on a keeper card': opt('798', { fx: { t_shooting: 1 } }),
    'a training key on a situation card': opt(situation.id, { fx: { t_pace: 1 } }),
    'a training value of 0.5': opt('797', { fx: { t_shooting: 0.5 } }),
    'a cost with no training': opt('797', { fx: { t_pace: -1 } }), 'a cost above the training': opt('797', { fx: { t_shooting: 1, t_pace: -2 } }),
    'training with no cost': opt('797', { fx: { t_shooting: 1 } }), 'a cost below the training': opt('797', { fx: { t_shooting: 2, t_pace: -1 } }),
    'id 650': { ...BB, events: BB.events.map(e => (e.id === '797' ? { ...e, id: '650' } : e)), titles: { ...BB.titles, 650: 'x' }, kinds: { ...BB.kinds, 650: 'positive' } },
    'a duplicate id': { ...BB, events: [...BB.events, FORWARD] },
    'a missing title': { ...BB, titles: without(BB.titles, '797') },
    'a missing kind': { ...BB, kinds: without(BB.kinds, '797') },
    'no neutral option': at('797', { choices: [FORWARD.choices[0]] }),
    wordings: at('797', { texts: ['Another wording.'] }), tag: at('797', { tag: 'conduct', subject: 'x' }), 'a one shot': at('797', { oneShot: true }),
    story: at('797', { story: 'penalties' }), "a card's own chance": at('797', { chance: 0.3 }), 'a pack chance of 0.5': { ...BB, chance: 0.5 },
    'an undeclared fact': at('797', { when: [{ fact: 'mood', op: '>', value: 1 }] }),
  };
  const clean = D.soccerDeckProblems(BB);
  if (clean.length) fail(`the breakages' base has problems of its own: ${clean.slice(0, 3).join('; ')}`);
  const cleanSet = new Set(clean);
  const seen = new Map();
  for (const [name, pack] of Object.entries(BREAKAGES)) {
    const fresh = D.soccerDeckProblems(pack).filter(p => !cleanSet.has(p));
    if (fresh.length === 0) { fail(`${name}: the bind check passes it`); continue; }
    const words = fresh.join(' | ');
    if (seen.has(words)) fail(`${name} is refused with the same words as ${seen.get(words)}`);
    seen.set(words, name);
  }
  if (!red.has('1')) ok(`${Object.keys(BREAKAGES).length} breakages, each refused with its own message`);
  /* a pack with a problem deals nothing where the clean pack deals */
  const st = withStream(() => startOf(H.engine, 3), seeded(3)).value;
  const row = { ...(st.seasons[0] ?? {}), year: 2010, age: 24, club: 'Deck Albion', clubCountry: 'England', clubTier: 2, type: 'playing', apps: 30, goals: 5, assists: 2, cleanSheets: 0, yellowCards: 1, redCards: 0, rating: 7, intApps: 0 };
  const career = { ...st, position: 'ST', age: 24, currentClub: 'Deck Albion', currentClubTier: 2, seasons: [row], overall: 70, potential: 85, statBoostNextSeason: {}, eventLastFired: {}, lastEventId: null, pendingEvents: [], retired: false };
  const dealtClean = Array.from({ length: 20 }, (_, i) => D.dealFromPack(BB, copy(career), 2010, `bind|${i}`, []).length).reduce((a, b) => a + b, 0);
  const dealtBroken = Array.from({ length: 20 }, (_, i) => D.dealFromPack(BREAKAGES['a pack chance of 0.5'], copy(career), 2010, `bind|${i}`, []).length).reduce((a, b) => a + b, 0);
  if (dealtClean === 0) fail('the clean pack dealt nothing to the probe career, so the fail closed check proves nothing');
  else if (dealtBroken !== 0) fail(`a pack with a problem dealt ${dealtBroken} cards`);
  else ok(`the clean pack dealt ${dealtClean} of 20 keys, the same pack with a problem none`);
}

/* ─── 2. inert until loaded ────────────────────────────────────────────── */

SECTION = '2';
console.log(`2) Inert: the deck not loaded, ${FLEET} careers of ${SEASONS} seasons, every save byte equal to the base's after every step and the Math.random count equal`);
if (runs(2)) {
  if (H.gate.soccerDeckReady()) fail('the deck is loaded before section 2 runs');
  if (CONTROL === 'leak') globalThis.__sdLeak = moduleFor(FIXTURE);
  let steps = 0, differ = 0, callsDiffer = 0, calls = 0;
  const firsts = [];
  for (let seed = 0; seed < FLEET; seed += 1) {
    const hs = [], bs = [];
    const h = drive(H.engine, seed, { onStep: s => hs.push(sha1(JSON.stringify(s))) });
    const b = drive(B.engine, seed, { onStep: s => bs.push(sha1(JSON.stringify(s))) });
    steps += bs.length;
    calls += b.calls;
    let i = 0;
    while (i < Math.max(hs.length, bs.length) && hs[i] === bs[i]) i += 1;
    if (i < Math.max(hs.length, bs.length)) { differ += 1; if (firsts.length < 3) firsts.push(`career ${seed} (${CODES[seed % CODES.length]}, ${ERAS[seed % ERAS.length][0]}) from step ${i}`); }
    if (h.calls !== b.calls) callsDiffer += 1;
  }
  delete globalThis.__sdLeak;
  console.log(`   ${FLEET} careers, ${steps} saves compared, ${calls} Math.random calls on the base`);
  if (steps < FLEET * 20) fail(`only ${steps} saves compared: the fleet drove almost nothing`);
  if (differ) fail(`${differ} careers part from the base: ${firsts.join('; ')}`);
  if (callsDiffer) fail(`${callsDiffer} careers draw Math.random a different number of times`);
  if (!differ && !callsDiffer) ok('every save after every step byte equal to the base, and every career\'s Math.random count equal');
}

/* ─── 3. adds, never replaces ──────────────────────────────────────────── */

SECTION = '3';
console.log('3) Adds, never replaces: at each deal, from one identical state, the old batch is the base\'s and a deck card is first');
const view = batch => batch.map(e => ({ id: e.id, title: e.title, description: e.description, category: e.category, cooldown: e.cooldown, story: e.story,
  choices: (e.choices || []).map(c => ({ label: c.label, consequence: c.consequence, emoji: c.emoji, color: c.color })) }));
if (runs(3)) {
  H.gate.setSoccerDeckLoader(async () => moduleFor(PACK));
  await H.gate.loadSoccerDeck();
  if (!H.gate.soccerDeckReady()) fail('the deck did not load');
  let deals = 0, dealt = 0, apart = 0, notFirst = 0, many = 0, callsApart = 0, poolApart = 0, stampsApart = 0;
  const firsts = [];
  const note = m => { if (firsts.length < 4) firsts.push(m); };
  for (let seed = 0; seed < FLEET; seed += 1) {
    const states = [];
    drive(B.engine, seed, { onDeal: st => states.push(st) });
    states.forEach((st, k) => {
      if (st.age < 17) return;
      deals += 1;
      const key = `${seed}|${k}`;
      const run = M => withStream(() => { const s2 = copy(st); const batch = view(M.engine.generateRandomEvents(s2)); return { batch, stamps: s2.eventLastFired ?? {} }; }, seeded(hashInt(key)));
      const h = run(H), b = run(B);
      const deckAt = h.value.batch.map((e, i) => (isDeck(e.id) ? i : -1)).filter(i => i >= 0);
      if (deckAt.length > 1) { many += 1; note(`career ${seed} deal ${k}: ${deckAt.length} deck cards`); }
      if (deckAt.some(i => i !== 0)) { notFirst += 1; note(`career ${seed} deal ${k}: a deck card at index ${deckAt.find(i => i !== 0)}`); }
      const rest = deckAt[0] === 0 ? h.value.batch.slice(1) : h.value.batch;
      if (deckAt.length) dealt += 1; /* any deal holding a deck card, wherever it sits: the checks below say where */
      if (JSON.stringify(rest.filter(e => !isDeck(e.id))) !== JSON.stringify(b.value.batch) || rest.some(e => isDeck(e.id))) { apart += 1; note(`career ${seed} deal ${k}: the old batch ${b.value.batch.map(e => e.id).join(',')} became ${h.value.batch.map(e => e.id).join(',')}`); }
      if (h.calls !== b.calls) { callsApart += 1; note(`career ${seed} deal ${k}: ${h.calls} Math.random calls against ${b.calls}`); }
      const want = deckAt[0] === 0 ? { ...b.value.stamps, [String(h.value.batch[0].id)]: st.seasons[st.seasons.length - 1]?.year ?? 0 } : b.value.stamps;
      const sorted = o => JSON.stringify(Object.keys(o).sort().map(x => [x, o[x]]));
      if (sorted(h.value.stamps) !== sorted(want)) { stampsApart += 1; note(`career ${seed} deal ${k}: the stamps are not the base's plus the deck card's`); }
      const all = M => withStream(() => view(M.engine.getAllEvents(copy(st))), seeded(hashInt(`${key}|all`)));
      const ha = all(H), ba = all(B);
      if (JSON.stringify(ha.value) !== JSON.stringify(ba.value) || ha.calls !== ba.calls) { poolApart += 1; note(`career ${seed} deal ${k}: getAllEvents differs (${ha.value.length} cards against ${ba.value.length})`); }
    });
  }
  console.log(`   ${deals} deals compared from the base fleet's own states; a deck card dealt at ${dealt} (${(100 * dealt / Math.max(1, deals)).toFixed(1)}%)`);
  for (const m of firsts) console.error(`     ${m}`);
  if (deals < FLEET * 5) fail(`only ${deals} deals compared`);
  if (dealt === 0) fail('the deck dealt no card at any deal, so nothing here was proven');
  if (many) fail(`${many} deals hold more than one deck card`);
  if (notFirst) fail(`${notFirst} deals hold a deck card that is not first`);
  if (apart) fail(`${apart} deals change the old batch`);
  if (callsApart) fail(`${callsApart} deals draw Math.random a different number of times`);
  if (stampsApart) fail(`${stampsApart} deals stamp something other than the base's stamps plus the deck card's`);
  if (poolApart) fail(`${poolApart} deals read a different catalog (getAllEvents)`);
  if (!many && !notFirst && !apart && !callsApart && !stampsApart && !poolApart && dealt) ok('at every deal the old batch is the base\'s (ids, order, words), the deck card is first, the draws and the catalog are the base\'s, the stamps the base\'s plus the deck card\'s');
  /* and a head fleet with the deck loaded: no deck card is ever pending at a deal */
  let pendingAtDeal = 0, headDeals = 0, headDealt = 0, headOpen = 0;
  for (let seed = 0; seed < FLEET; seed += 1) {
    let prev = '';
    drive(H.engine, seed, {
      onDeal: st => { headDeals += 1; if ((st.pendingEvents || []).some(e => isDeck(e.id))) pendingAtDeal += 1; },
      /* any batch holding a deck card counts as dealt, wherever it sits (the per deal checks above say where) */
      onStep: s => {
        if (s.phase === 'random_events' && prev !== 'random_events') {
          if ((s.pendingEvents || []).some(e => isDeck(e.id))) headDealt += 1;
          if (isDeck(s.pendingEvents?.[0]?.id)) headOpen += 1;
        }
        prev = s.phase;
      },
    });
  }
  console.log(`   a head fleet with the deck loaded: ${headDeals} deals, ${headDealt} batches holding a deck card, ${headOpen} batches opening on a deck card`);
  if (headDealt === 0) fail('the loaded head fleet was dealt no deck card');
  if (pendingAtDeal) fail(`${pendingAtDeal} deals start with a deck card still pending`);
  else ok('no deck card is pending at any deal of the loaded head fleet');
  H.gate.setSoccerDeckLoader();
}

/* ─── 4. a neutral deck changes nothing else ───────────────────────────── */

SECTION = '4';
console.log('4) Neutral: every deck card answered on the option that moves nothing, every season end save is the base\'s but for the deck\'s own stamps');
/* Answering a deck card builds the catalog once more (applyEventChoice resolves the card through getAllEvents), and
   building the catalog draws Math.random (the life catalog's pending chances), so a continuous stream would shift
   every later draw of the career. So both bundles reseed Math.random before every engine step from the career, the
   season, the step's phase and its count in that season, and the deck card's answer has no key of its own (it draws
   from a throwaway stream): the base's draws are the base's whatever the deck does. The noreseed control turns the
   reseeding off and the fleets part, which proves it is load bearing.
   One driver serves this section and section 8 (review of 2026-10-17, minor 15). Its options: reseed (off only for
   the noreseed control); onDeck, how a deck card is answered (a function of the card, null for the option that moves
   nothing, false to leave the card to the step policy like any other card); tag, a prefix that gives section 8 streams
   of its own; seasons and steps, where the walk stops; and onStep, handed every state from the first on. Without
   onStep the driver keeps what this section reads: every season end save and the seasons whose deck answer emptied
   the batch. */
const neutralOf = card => Math.max(0, card.choices.findIndex(c => c.consequence === 'Nothing changes'));
function driveKeyed(M, seed, { reseed = true, onDeck = null, tag = '', seasons = SEASONS, steps = 600, onStep = null } = {}) {
  const real = Math.random;
  let stream = seeded(hashInt(`${seed}|${tag}start`));
  Math.random = () => stream();
  const counts = {};
  const ends = [];
  const empties = [];
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = startOf(M, seed);
    if (!reseed) stream = seeded(seed + 1);
    if (onStep) onStep(s);
    for (let guard = 0; guard < steps && !s.retired; guard += 1) {
      if (s.phase === 'playing' && s.seasons.length >= seasons) break;
      const first = s.phase === 'random_events' ? s.pendingEvents?.[0] : null;
      const deck = onDeck !== false && isDeck(first?.id);
      if (reseed) {
        if (deck) stream = seeded(hashInt(`${seed}|${tag}the deck answer`));
        else {
          const k = `${seed}|${s.seasons.length}|${s.phase}`;
          counts[k] = (counts[k] ?? 0) + 1;
          stream = seeded(hashInt(`${tag}${k}|${counts[k]}`));
        }
      }
      const next = deck ? M.applyEventChoice(s, onDeck ? onDeck(first) : neutralOf(first), clubs) : step(M, s, seed, clubs);
      if (!next) break;
      if (onStep) onStep(next);
      else {
        if (deck && !(next.pendingEvents ?? []).length) empties.push(s.seasons.length);
        if (next.phase === 'playing' && s.phase !== 'playing') ends.push(JSON.stringify(next));
      }
      s = next;
    }
    return { ends, empties, s };
  } finally { Math.random = real; }
}
const withoutDeckStamps = json => {
  const o = JSON.parse(json);
  if (o.eventLastFired) o.eventLastFired = Object.fromEntries(Object.entries(o.eventLastFired).filter(([k]) => !isDeck(Number(k))));
  return JSON.stringify(o);
};
if (runs(4)) {
  H.gate.setSoccerDeckLoader(async () => moduleFor(PACK));
  await H.gate.loadSoccerDeck();
  const reseed = CONTROL !== 'noreseed';
  let seasons = 0, apart = 0, deckAnswers = 0;
  const empties = [], firsts = [];
  for (let seed = 0; seed < FLEET; seed += 1) {
    let answered = 0;
    const h = driveKeyed(H.engine, seed, { reseed, onDeck: card => { answered += 1; return neutralOf(card); } });
    const b = driveKeyed(B.engine, seed, { reseed });
    deckAnswers += answered;
    for (const e of h.empties) empties.push(`career ${seed} season ${e}`);
    const n = Math.max(h.ends.length, b.ends.length);
    seasons += b.ends.length;
    for (let i = 0; i < n; i += 1) {
      if (h.ends[i] === undefined || b.ends[i] === undefined || withoutDeckStamps(h.ends[i]) !== b.ends[i]) {
        apart += 1;
        if (firsts.length < 3) firsts.push(`career ${seed} (${CODES[seed % CODES.length]}) from season end ${i}`);
        break;
      }
    }
  }
  H.gate.setSoccerDeckLoader();
  console.log(`   ${FLEET} careers, ${seasons} season ends compared, ${deckAnswers} deck cards answered on the option that moves nothing; seasons whose old draw was empty: ${empties.length}${empties.length ? ` (${empties.slice(0, 5).join(', ')})` : ''}`);
  for (const f of firsts) console.error(`     ${f}`);
  if (deckAnswers === 0) fail('no deck card was answered, so nothing here was proven');
  if (empties.length) fail(`${empties.length} seasons dealt the deck card alone, so lastEventId moved (listed above)`);
  if (apart) fail(`${apart} careers part from the base at a season end`);
  else if (deckAnswers) ok('every season end save equals the base\'s once the deck\'s own stamps are taken out');
}

/* ─── 5. promises ──────────────────────────────────────────────────────── */

SECTION = '5';
console.log('5) Promises: every option moves what its button prints, to the bound and no further, says what landed, and never moves money or fame');
const sgn = v => (v >= 0 ? `+${v}` : `${v}`);
if (runs(5)) {
  const D = H.deck, W = H.words;
  const LABEL = Object.fromEntries(Object.entries(W.SOCCER_FX_WORDS).map(([k, w]) => [w.label, k]));
  const KEEP = ['netWorth', 'totalEarnings', 'socialMediaFollowers', 'popularity', 'karma'];
  const base5 = withStream(() => startOf(H.engine, 5), seeded(5)).value;
  const row5 = { ...(base5.seasons[0] ?? {}), year: 2012, age: 25, club: 'Deck Albion', clubCountry: 'England', clubTier: 2, type: 'playing', apps: 30, goals: 6,
    assists: 3, cleanSheets: 4, yellowCards: 8, redCards: 0, rating: 7, intApps: 2, injury: null, injuryWeeks: 9 };
  /* maxed (review of 2026-10-17): all seven stats at 99, where the season start clamps them, so no training lands
     there and no cost is paid for it */
  const SEVEN = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
  const fixture = (code, room, morale, maxed = false) => ({ ...copy(base5), position: code, age: 25, morale, overall: 70, potential: 70 + room, potentialEarned: 0,
    statBoostNextSeason: {}, currentClub: 'Deck Albion', currentClubTier: 1, seasons: [{ ...row5 }], retired: false, contractYearsLeft: 1,
    isClubCaptain: true, captainClub: 'Deck Albion', eventLastFired: {}, lastEventId: null, pendingEvents: [],
    ...(maxed ? Object.fromEntries(SEVEN.map(k => [k, 99])) : {}) });
  const defOf = id => PACK.events.find(e => Number(e.id) === id);
  let answers = 0, neutral = 0, atBound = 0, atMax = 0;
  const wrong = [];
  for (const code of ['GK', 'CB', 'CM', 'ST']) for (const room of [0, 1, 5]) for (const morale of [0, 1, 50, 99, 100]) for (const maxed of morale === 50 ? [false, true] : [false]) {
    const s0 = fixture(code, room, morale, maxed);
    for (const card of D.deckToRandomEvents(PACK, PACK.events)) {
      card.choices.forEach((c, i) => {
        const before = copy(s0);
        const after = c.apply(copy(s0));
        answers += 1;
        for (const k of KEEP) if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) wrong.push(`${card.id} "${c.label}" moved ${k}`);
        if (c.consequence === 'Nothing changes') {
          neutral += 1;
          if (JSON.stringify(after) !== JSON.stringify(before)) wrong.push(`${card.id} "${c.label}" prints Nothing changes and moves something`);
          return;
        }
        const want = copy(before);
        /* Morale first, then what it trains (to the room), then each cost (Round 1504), never more than the training
           landed; the line keeps the printed order. */
        const parts = [];
        for (const w of c.consequence.split(', ')) {
          const m = /^(.*) ([+-]\d+)$/.exec(w);
          if (!m) { wrong.push(`${card.id} "${c.label}" prints ${w}, which names no amount`); continue; }
          parts.push({ label: m[1], v: Number(m[2]) });
        }
        const text = new Map();
        let trained = 0;
        for (const p of [...parts.filter(q => q.label === 'Morale'), ...parts.filter(q => q.label !== 'Morale' && q.v > 0), ...parts.filter(q => q.label !== 'Morale' && q.v < 0)]) {
          const { label, v } = p;
          if (label === 'Morale') {
            const to = Math.max(0, Math.min(100, want.morale + v)), d = to - want.morale;
            if (d !== v) atBound += 1;
            want.morale = to;
            text.set(p, d === 0 ? `Morale stays at ${to}` : d === v ? `Morale ${sgn(d)}` : `Morale ${sgn(d)}, now at ${to}`);
            continue;
          }
          const key = LABEL[label];
          if (!key) { wrong.push(`${card.id} "${c.label}" prints ${label}, which no registered key carries`); continue; }
          if (key === 'integrity') { want.integrityBonus += v; text.set(p, `Integrity ${sgn(v)}`); continue; }
          const stat = W.SOCCER_TRAINING_KEYS[key].stat;
          if (v < 0) {
            const pay = Math.min(-v, trained);
            trained -= pay;
            if (pay !== -v) atBound += 1;
            if (pay > 0) want.statBoostNextSeason = { ...want.statBoostNextSeason, [stat]: (want.statBoostNextSeason[stat] ?? 0) - pay };
            text.set(p, pay === -v ? `${label} ${sgn(-pay)}` : `${label} ${sgn(-pay)}, you only pay for training that landed`);
            continue;
          }
          const top = 99 - want[stat] - (want.statBoostNextSeason[stat] ?? 0);
          const fit = Math.max(0, Math.min(v, H.momentsRoom(want), top));
          if (fit !== v) atBound += 1;
          if (top < Math.min(v, H.momentsRoom(want))) atMax += 1;
          trained += fit;
          if (fit > 0) want.statBoostNextSeason = { ...want.statBoostNextSeason, [stat]: (want.statBoostNextSeason[stat] ?? 0) + fit };
          text.set(p, fit === v ? `${label} ${sgn(fit)}` : `${label} ${sgn(fit)}, you are at your ceiling`);
        }
        const said = parts.map(p => text.get(p)).filter(t => t !== undefined);
        want.events = [...want.events, `${card.emoji} ${card.title}: ${defOf(card.id).choices[i].reply} ${said.join(', ')}.`];
        if (JSON.stringify(after) !== JSON.stringify(want)) {
          const keys = Object.keys({ ...after, ...want }).filter(k => JSON.stringify(after[k]) !== JSON.stringify(want[k]));
          wrong.push(`${card.id} "${c.label}" at room ${room}, morale ${morale}: ${keys.join(', ')} not as printed (${keys.map(k => `${JSON.stringify(after[k])?.slice(-60)} against ${JSON.stringify(want[k])?.slice(-60)}`).join('; ')})`);
        }
      });
    }
  }
  for (const w of wrong.slice(0, 4)) console.error(`     ${w}`);
  console.log(`   ${answers} answers (${neutral} on the option that moves nothing), ${atBound} effects at a bound, ${atMax} trainings held at 99`);
  if (answers < 1000) fail(`only ${answers} answers checked`);
  if (atBound === 0) fail('no effect met a bound, so the clamp was never checked');
  if (atMax === 0) fail('no training met a stat at 99, so that bound was never checked');
  if (wrong.length) fail(`${wrong.length} answers move something other than what they print, or say it wrong`);
  else ok('every option moves exactly what it prints (to the bound and no further), the season log says what landed, nothing moves money, fame or karma, and the option that moves nothing moves nothing');
  /* the hold: at room 0 and 1 no card is dealt whose training would not fit */
  let held = 0, dealtAtRoom = 0;
  for (const code of ['GK', 'CB', 'CM', 'ST']) for (const room of [0, 1]) {
    const s = fixture(code, room, 50);
    for (let k = 0; k < 40; k += 1) for (const e of D.dealFromPack(PACK, copy(s), 2012, `hold|${k}`, [])) {
      dealtAtRoom += 1;
      const most = Math.max(...defOf(e.id).choices.map(c => Object.entries(c.fx ?? {}).reduce((n, [key, v]) => n + (key in W.SOCCER_TRAINING_KEYS ? v : 0), 0)));
      if (most > room) held += 1;
    }
  }
  if (dealtAtRoom === 0) fail('nothing was dealt at room 0 or 1, so the hold was never asked');
  else if (held) fail(`${held} cards dealt whose training passes the room`);
  else ok(`${dealtAtRoom} deals at room 0 and 1, none with training that would not fit`);
  /* a drill banked between the deal and the answer: the answer lands what fits and says so */
  const st = fixture('ST', 1, 50);
  const dealt = [...Array(60).keys()].map(k => D.dealFromPack(PACK, copy(st), 2012, `drill|${k}`, [])[0]).find(e => e && e.choices.some(c => / next season \+1/.test(c.consequence)));
  if (!dealt) fail('no training card dealt to the drill probe');
  else {
    const drilled = H.drills.applyDrillResult(copy(st), H.drills.drillForPosition('ST'), H.drills.ROUNDS_PER_RUN);
    const opt = dealt.choices.find(c => / next season \+1/.test(c.consequence));
    const after = opt.apply(copy(drilled));
    const line = after.events[after.events.length - 1];
    const same = JSON.stringify(after.statBoostNextSeason) === JSON.stringify(drilled.statBoostNextSeason);
    console.log(`   the banked drill: room ${H.momentsRoom(st)} at the deal, ${H.momentsRoom(drilled)} after the drill; the answer logs "${line}"`);
    if (!same || !line.includes(', you are at your ceiling')) fail('a drill banked before the answer: the answer still landed training or its cost, or its line does not say it is at the ceiling');
    else ok('a drill banked between the deal and the answer: the answer lands nothing past the ceiling and its line says so');
  }
  /* the fleet: how often a deck answer clamps (answered first, so 0 is expected) and how often a deck boost and a
     drill in one summer would pass the ceiling together (the drills' room does not count queued boosts; owed) */
  H.gate.setSoccerDeckLoader(async () => moduleFor(PACK));
  await H.gate.loadSoccerDeck();
  let trainAnswers = 0, clampedAnswers = 0, passTogether = 0;
  const queued = s => Object.values(s.statBoostNextSeason ?? {}).reduce((n, v) => n + (v > 0 ? v : 0), 0);
  for (let seed = 0; seed < FLEET; seed += 1) {
    let prev = null;
    drive(H.engine, 5000 + seed, { onStep: s => {
      const card = prev?.phase === 'random_events' ? prev.pendingEvents?.[0] : null;
      if (card && isDeck(card.id)) {
        /* what the first option trains, stat by stat (its cost sits on another stat, Round 1504) */
        const gains = card.choices[0].consequence.split(', ').map(w => /^(.*) \+(\d+)$/.exec(w))
          .filter(m => m && LABEL[m[1]] && LABEL[m[1]] !== 'integrity').map(m => [W.SOCCER_TRAINING_KEYS[LABEL[m[1]]].stat, Number(m[2])]);
        const printed = gains.reduce((n, [, v]) => n + v, 0);
        if (printed > 0) {
          trainAnswers += 1;
          if (gains.some(([stat, v]) => (s.statBoostNextSeason?.[stat] ?? 0) - (prev.statBoostNextSeason?.[stat] ?? 0) < v)) clampedAnswers += 1;
          const kind = H.drills.drillForPosition(s.position);
          const withDeck = H.drills.applyDrillResult(copy(s), kind, H.drills.ROUNDS_PER_RUN);
          const without = H.drills.applyDrillResult(copy(prev), kind, H.drills.ROUNDS_PER_RUN);
          if (queued(withDeck) > H.drills.drillHeadroom(withDeck) && queued(without) <= H.drills.drillHeadroom(without)) passTogether += 1;
        }
      }
      prev = s;
    } });
  }
  H.gate.setSoccerDeckLoader();
  console.log(`   the fleet: ${trainAnswers} deck training answers, ${clampedAnswers} clamped (expected 0: the deck card is answered first); with a full drill banked after each, ${passTogether} (${(100 * passTogether / Math.max(1, trainAnswers)).toFixed(1)}%) would pass the ceiling only because of the deck's boost (the drills' rule, owed)`);
  if (trainAnswers === 0) fail('the fleet answered no deck training card');
  if (clampedAnswers) fail(`${clampedAnswers} deck answers in the fleet landed less than they printed`);
}

/* ─── 6. reach by position ─────────────────────────────────────────────── */

SECTION = '6';
console.log('6) Reach by position: every position card reaches its own group and never another, every situation card someone, no keeper word for an outfielder');
if (runs(6)) {
  const W = H.words;
  let P6 = SHIPPED;
  if (CONTROL === 'posleak') {
    const e = SHIPPED.events.find(x => x.id === '706');
    const at = e ? e.when.findIndex(c => c.fact === 'pos' && c.op === '<' && c.value === 2) : -1;
    if (at < 0) { console.error('posleak control: 706 does not hold pos < 2, refusing to run'); process.exit(2); }
    P6 = { ...SHIPPED, events: SHIPPED.events.map(x => (x.id === '706' ? { ...x, when: x.when.map((c, i) => (i === at ? { ...c, value: 3 } : c)) } : x)) };
    const problems = H.deck.soccerDeckProblems(P6);
    if (problems.length) { console.error(`posleak control: the widened pack has problems (${problems[0]}), so it would prove the fail closed path, refusing`); process.exit(2); }
    console.log('   posleak: 706 widened to pos < 3, and the widened pack passes the bind check');
  }
  const GROUP = { GK: 'keeper', CB: 'defender', LB: 'defender', RB: 'defender', CDM: 'defender', CM: 'midfielder', CAM: 'midfielder', LW: 'forward', RW: 'forward', ST: 'forward' };
  const LOW = ['keeper', 'defender', 'midfielder', 'forward'];
  /* a card's own group is read off the SHIPPED pack, so a widened card still counts as its group's */
  const own = Object.fromEntries(SHIPPED.events.map(e => {
    const lo = (e.when ?? []).filter(c => c.fact === 'pos').map(c => (c.op === '>=' ? c.value : 0));
    return [Number(e.id), lo.length ? LOW[Math.max(...lo)] : 'situation'];
  }));
  const keeperWords = Object.entries(W.SOCCER_TRAINING_KEYS).filter(([, t]) => t.keeper).map(([k]) => W.SOCCER_FX_WORDS[k].label);
  const outfieldWords = Object.entries(W.SOCCER_TRAINING_KEYS).filter(([, t]) => !t.keeper).map(([k]) => W.SOCCER_FX_WORDS[k].label);
  H.gate.setSoccerDeckLoader(async () => moduleFor(P6));
  await H.gate.loadSoccerDeck();
  const per = {};
  const strays = [], wordsWrong = [];
  for (let n = 0; n < 400; n += 1) {
    const seed = 1000 + n;
    const code = CODES[seed % CODES.length];
    const p = (per[code] ??= { summers: 0, dealt: 0, ids: {} });
    let prev = '';
    drive(H.engine, seed, { seasons: 18,
      onDeal: st => { if (st.age >= 17) p.summers += 1; },
      onStep: s => {
        const first = s.pendingEvents?.[0];
        if (s.phase === 'random_events' && prev !== 'random_events' && isDeck(first?.id)) {
          p.dealt += 1;
          p.ids[first.id] = (p.ids[first.id] ?? 0) + 1;
          if (own[first.id] !== 'situation' && own[first.id] !== GROUP[code]) strays.push(`a ${GROUP[code]} (${code}) was dealt ${first.id}, a ${own[first.id]} card`);
          const words = first.choices.map(c => c.consequence).join(' | ');
          const foreign = (code === 'GK' ? outfieldWords : keeperWords).find(w => words.includes(w));
          if (foreign) wordsWrong.push(`${code} was dealt ${first.id} printing ${foreign}`);
        }
        prev = s.phase;
      } });
  }
  H.gate.setSoccerDeckLoader();
  const byGroup = {};
  for (const [code, p] of Object.entries(per)) {
    const g = (byGroup[GROUP[code]] ??= { summers: 0, dealt: 0, ids: new Set() });
    g.summers += p.summers; g.dealt += p.dealt;
    for (const id of Object.keys(p.ids)) g.ids.add(Number(id));
    const top = Object.entries(p.ids).sort((a, b) => b[1] - a[1])[0];
    console.log(`   ${code}: ${Object.keys(p.ids).length} cards reached, ${p.dealt} deck cards in ${p.summers} summers (${(p.dealt / Math.max(1, p.summers)).toFixed(2)} a summer), the top card ${top ? `${top[0]} at ${(100 * top[1] / p.dealt).toFixed(1)}%` : 'none'}`);
  }
  for (const [g, x] of Object.entries(byGroup)) console.log(`   ${g}s: a deck card in ${(100 * x.dealt / Math.max(1, x.summers)).toFixed(1)}% of summers (${x.dealt} of ${x.summers})`);
  for (const s of strays.slice(0, 4)) console.error(`     ${s}`);
  if (strays.length) fail(`${strays.length} position cards dealt to another group: ${strays[0]}`);
  for (const w of wordsWrong.slice(0, 3)) console.error(`     ${w}`);
  if (wordsWrong.length) fail(`${wordsWrong.length} deals print another group's training word`);
  const unreached = SHIPPED.events.map(e => Number(e.id)).filter(id => own[id] === 'situation' ? ![...Object.values(byGroup)].some(g => g.ids.has(id)) : !byGroup[own[id]]?.ids.has(id));
  if (unreached.length) fail(`${unreached.length} cards never reached their group (a situation card: no group): ${unreached.join(', ')}`);
  if (!strays.length && !wordsWrong.length && !unreached.length) ok(`all ${SHIPPED.events.length} cards reached: every position card its own group and no other, every situation card at least one, and no group printed another's training words`);
}

/* ─── 7. keyed ─────────────────────────────────────────────────────────── */

SECTION = '7';
console.log('7) Keyed: the slot and the deck\'s answers draw no Math.random, the same save deals the same card in a fresh bundle, and the season moves the pick');
/* Measured on a runner (r1334-s4b, 2026-10-16) over five samples of 100 careers (seed offsets 0 to 4), each the same
   save dealt eight summers with only the last row's year moved and no stamp carried: the share of careers dealt at
   least two different deck cards, of those dealt one in at least two of the eight. Read: 100.0 percent in all five
   samples, and 0.0 in all five under the keyseason control (r1334-s4b); the floor sits between, far from both. */
const KEYED_FLOOR = 0.8;
const spiedModule = (pack, tally) => {
  const counted = fn => (...args) => {
    const real = Math.random;
    let n = 0;
    Math.random = () => { n += 1; return real(); };
    try { return fn(...args); } finally { Math.random = real; tally.calls += n; }
  };
  const wrap = cards => cards.map(c => ({ ...c, choices: c.choices.map(ch => ({ ...ch, apply: counted(st => { tally.applies += 1; return ch.apply(st); }) })) }));
  return { ...H.deck,
    dealSoccerDeck: counted((s, season, key, taken) => { tally.slots += 1; return wrap(H.deck.dealFromPack(pack, s, season, key, taken)); }),
    pendingSoccerDeck: s => wrap(H.deck.pendingFromPack(pack, s)) };
};
if (runs(7)) {
  /* (a) the spy: Math.random calls inside the slot and the deck's applies over a loaded fleet */
  const tally = { calls: 0, slots: 0, applies: 0 };
  H.gate.setSoccerDeckLoader(async () => spiedModule(PACK, tally));
  await H.gate.loadSoccerDeck();
  let whole = 0;
  for (let seed = 0; seed < FLEET; seed += 1) whole += drive(H.engine, seed).calls;
  console.log(`   the loaded fleet: ${tally.slots} slot calls and ${tally.applies} deck answers drew Math.random ${tally.calls} times; the whole fleet drew it ${whole} times (printed, never asserted)`);
  if (tally.slots === 0 || tally.applies === 0) fail('the spy saw no slot call or no deck answer, so it proves nothing');
  else if (tally.calls) fail(`the slot and the deck's answers drew Math.random ${tally.calls} times`);
  else ok('the slot and the deck\'s answers drew Math.random 0 times');
  H.gate.setSoccerDeckLoader();
  /* (b) the same saves in a second, fresh bundle deal the same cards */
  const H2 = await bundle('head2');
  const P2 = H2.SOCCER_DECK_PACKS.soccer.events.length ? H2.SOCCER_DECK_PACKS.soccer : FIXTURE;
  let same = 0, asked = 0, differ = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    const states = [];
    drive(B.engine, seed, { onDeal: st => states.push(st) });
    for (const st of states) {
      if (st.age < 17) continue;
      const key = `${H.engine.soccerDeckIdentity(st)}|${H.engine.eventSeasonIndex(st)}|deckslot`;
      const a = withStream(() => H.deck.dealFromPack(PACK, copy(st), H.engine.eventSeasonIndex(st), key, []), seeded(1)).value.map(e => e.id).join();
      const b = withStream(() => H2.deck.dealFromPack(P2, copy(st), H2.engine.eventSeasonIndex(st), key, []), seeded(2)).value.map(e => e.id).join();
      asked += 1;
      if (a === b) { if (a) same += 1; } else differ += 1;
    }
  }
  if (asked === 0 || same === 0) fail('no deal was asked of both bundles');
  else if (differ) fail(`${differ} of ${asked} saves deal a different card in a fresh bundle`);
  else ok(`${asked} saves dealt in two fresh bundles (and two different Math.random streams): the same card every time (${same} dealt one)`);
  /* (c) the same save eight summers with only the year moved deals different cards: the key holds the season */
  H.gate.setSoccerDeckLoader(async () => moduleFor(PACK));
  await H.gate.loadSoccerDeck();
  const shares = [];
  let oneCard = 0;
  for (let off = 0; off < 5; off += 1) {
    let asked8 = 0, varied = 0;
    for (let n = 0; n < 100; n += 1) {
      const seed = 7000 + off * 100 + n;
      let first = null;
      drive(B.engine, seed, { onDeal: st => { if (!first && st.age >= 17 && st.seasons[st.seasons.length - 1]?.type === 'playing') first = st; } });
      if (!first) continue;
      const ids = [];
      for (let y = 0; y < 8; y += 1) {
        const st = copy(first);
        st.seasons[st.seasons.length - 1].year += y;
        const batch = withStream(() => H.engine.generateRandomEvents(st), seeded(hashInt(`${seed}|${y}`))).value;
        if (isDeck(batch[0]?.id)) ids.push(batch[0].id);
      }
      if (ids.length < 2) continue;
      asked8 += 1;
      if (new Set(ids).size >= 2) varied += 1;
      else if (off === 0) oneCard += 1;
    }
    shares.push(asked8 ? varied / asked8 : 0);
  }
  H.gate.setSoccerDeckLoader();
  console.log(`   the same save eight summers, the year moved: careers dealt at least two different cards, by sample: ${shares.map(x => (100 * x).toFixed(1)).join(', ')} percent (floor ${100 * KEYED_FLOOR}); sample 0 had ${oneCard} saves dealt one card eight times`);
  if (Math.min(...shares) < KEYED_FLOOR) fail(`a sample fell to ${(100 * Math.min(...shares)).toFixed(1)} percent of careers dealt two different cards, under the floor ${100 * KEYED_FLOOR}`);
  else ok('the pick moves with the season');
}

/* ─── 8. economy ───────────────────────────────────────────────────────── */

SECTION = '8';
console.log('8) Economy: four answer arms against the deck off, over five seeds of whole careers');
/* Arms: OFF (the deck not loaded), BEST (every deck card answered on the option that moves the most: integrity first,
   then training, then morale), WORST (the option that moves morale least), NEUTRAL (the option that moves nothing).
   Every other card is answered on its first option in every arm. Per career: morale and integrityBonus at 25 and 30,
   the overall at 30, the peak overall, the boosts the deck queued, the legacy score at the end (calculateLegacy:
   integrity counts there, clamped -30 to 20), whether integrity ever reached 40 (the other lane's Clean Hands Award
   needs it), and the share of season starts past the ceiling. BANDS (each arm's mean minus OFF's, averaged over the
   five seeds) are set from the measured seed to seed spread, written with the reading. Exact, the strongest signal:
   at every deck answer the boost it queued is at most momentsRoom just before it. */
const ECON_N = Number(process.env.SIM_SOCCER_DECK_ECONOMY_N || 100);
/* Read 2026-10-16 on a runner (rc r1334-s4e, the pack without integrity effects, 100 careers a seed, seeds 0 to 4),
   each arm's mean minus OFF's (the largest of BEST, WORST and NEUTRAL) and OFF's seed to seed sd:
     morale25 1.62 (sd 1.77)   morale30 1.33 (sd 1.13)   integrity25 0.44 (sd 1.44)   integrity30 1.10 (sd 3.49)
     overall30 0.12 (sd 0.36)  peak 0.44 (sd 0.12)       legacy 1.66 (sd 1.21)        clean40 0.04 (sd 0.05)
     pastCeiling 0 (sd 0)
   Each band is that reading plus two of OFF's seed to seed sd, rounded up (pastCeiling: no season start was ever past
   the ceiling in any arm and its spread is 0, so its band is the smallest step, 0.01: a mean share of season starts
   past the ceiling above one percent is red). The fleet is seeded, so a reading repeats exactly on the same
   code; the margin is for a later change to the engine under the deck. The pressure control (every deck move times
   ten) reads morale25 +9.33 and morale30 +5.76. Before the pack dropped its integrity effects (r1334-s4b) the BEST arm
   moved legacy +2.26 against a spread of 1.21 and clean40 +0.09: ruling 2(j), so the pack dropped them. What still
   moves legacy (+1.66 BEST, +1.56 WORST, -0.09 NEUTRAL) is the training the cards offer: it lands under the ceiling
   (pastCeiling stays 0) and lifts the peak overall by 0.4. */
/* Round 1504, the lead's ruling 3 on Round 1334: before the cards go live, the mean legacy move of EVERY answer policy
   sits within the measured seed to seed spread (absolute value at most 1.2; 1334 read OFF's spread 1.21), NEUTRAL about
   0. So the legacy band is the ruling's 1.2, not a reading plus a margin, and the training options pay a time cost
   (src/data/soccerDeck/starter.ts). The freetraining control strips the costs and doubles the training and must go red
   on it. Read 2026-10-17 on a runner (rc r1504-s1, the paired fleet, 100 careers a seed, seeds 0 to 4), each arm
   against the deck off as BEST / WORST / NEUTRAL: legacy -0.38 / -0.42 / 0.00 (OFF's seed to seed sd 1.33; per seed
   BEST -1.66 to +0.44), morale25 +0.14 / -1.27 / 0, morale30 +1.31 / -0.85 / 0, integrity30 +0.17 / +0.23 / 0,
   overall30 +0.11 / +0.11 / 0, peak -0.02 / -0.00 / 0, clean40 +0.02 / +0.02 / 0, pastCeiling 0; every other band as
   Round 1334 set it holds these with room. Round 1334's pack (the costs stripped, nothing doubled) on the same fleet:
   legacy +1.13 / +1.17 / 0, peak +0.46 / +0.48. */
const BANDS = { morale25: 5.5, morale30: 4, integrity25: 3.5, integrity30: 8.5, overall30: 1, peak: 0.75, legacy: 1.2, clean40: 0.15, pastCeiling: 0.01 };
if (runs(8)) {
  let P8 = PACK;
  if (CONTROL === 'pressure') {
    P8 = { ...PACK, events: PACK.events.map(e => ({ ...e, choices: e.choices.map(c => ({ ...c, ...(c.morale ? { morale: c.morale * 10 } : {}),
      ...(c.fx ? { fx: Object.fromEntries(Object.entries(c.fx).map(([k, v]) => [k, v * 10])) } : {}) })) })) };
    if (H.deck.soccerDeckProblems(P8).length) { console.error(`pressure control: the scaled pack has problems (${H.deck.soccerDeckProblems(P8)[0]}), refusing to run`); process.exit(2); }
  }
  /* Round 1504: freetraining strips every training cost and doubles what each option trains (the pack, in memory), so
     the deck raises the legacy score for free; the legacy band must go red. Doubled because the costs stripped alone,
     which is Round 1334's pack, read BEST +1.13 and WORST +1.17 on this paired fleet (rc r1504-s1), inside the band by
     a hair: a control at that size would be a coin toss, not a proof that the band bites. Doubled it reads BEST +1.44
     and WORST +1.66 (rc r1504-s3), both past the band (the hold deals a +2 card only at a room of 2 or more). */
  if (CONTROL === 'freetraining') {
    const costs = PACK.events.flatMap(e => e.choices).filter(c => Object.values(c.fx ?? {}).some(v => v < 0)).length;
    if (costs === 0) { console.error('freetraining control: no option of the pack carries a training cost, refusing to run'); process.exit(2); }
    P8 = { ...PACK, events: PACK.events.map(e => ({ ...e, choices: e.choices.map(c => (c.fx ? { ...c, fx: Object.fromEntries(Object.entries(c.fx).filter(([, v]) => v >= 0).map(([k, v]) => [k, k in H.words.SOCCER_TRAINING_KEYS ? v * 2 : v])) } : c)) })) };
    /* a key only a cost moved (gk_positioning) leaves the pressure book with the cost, or the bind check refuses the pack */
    const moved = new Set(P8.events.flatMap(e => e.choices).flatMap(c => [...Object.keys(c.fx ?? {}), ...(c.morale ? ['morale'] : [])]));
    P8.pressure = Object.fromEntries(Object.entries(PACK.pressure ?? {}).filter(([k]) => moved.has(k)).map(([k, v]) => [k, k in H.words.SOCCER_TRAINING_KEYS ? v * 2 : v]));
    if (H.deck.soccerDeckProblems(P8).length) { console.error(`freetraining control: the free pack has problems (${H.deck.soccerDeckProblems(P8)[0]}), refusing to run`); process.exit(2); }
    console.log(`   freetraining control: ${costs} options lose their training cost and train double`);
  }
  const defs = Object.fromEntries(P8.events.map(e => [Number(e.id), e]));
  const TRAIN = H.words.SOCCER_TRAINING_KEYS;
  const sumOf = (c, pick) => Object.entries(c.fx ?? {}).reduce((n, [k, v]) => n + (pick(k) ? v : 0), 0);
  /* BEST trains whenever it can: its training counts what an option adds, never the cost it pays (Round 1504) */
  const gainOf = c => Object.entries(c.fx ?? {}).reduce((n, [k, v]) => n + (k in TRAIN && v > 0 ? v : 0), 0);
  const ARMS = {
    best: card => { const cs = defs[card.id].choices; let at = 0; const v = c => 100 * sumOf(c, k => k === 'integrity') + 10 * gainOf(c) + (c.morale ?? 0); cs.forEach((c, i) => { if (v(c) > v(cs[at])) at = i; }); return at; },
    worst: card => { const cs = defs[card.id].choices; let at = 0; cs.forEach((c, i) => { if ((c.morale ?? 0) < (cs[at].morale ?? 0)) at = i; }); return at; },
    neutral: card => neutralOf(card),
  };
  const queuedOf = s => Object.values(s.statBoostNextSeason ?? {}).reduce((n, v) => n + (v > 0 ? v : 0), 0);
  /* Round 1504: the arms are PAIRED. Math.random is reseeded before every engine step from the seed, the season count,
     the phase and the step's count there (section 4's rule), and the deck answer draws from a stream of its own and
     counts no step, so a deck answer cannot move the base's draws. Before this the fleet ran on one stream a career
     and the first deck answer's catalog draws parted the arms (correction 1), so each arm's mean carried the noise of
     500 careers simulated apart (NEUTRAL read -0.09 on a deck answer that moves nothing). Now an arm differs from the
     deck off only by what its answers move. Since the review of 2026-10-17 this is driveKeyed (section 4) with section
     8's own streams (tag), forty seasons, its step limit and onStep; onDeck false lets the deck off arm's cards, if
     any, go to the step policy as they did. */
  let answers = 0, overRoom = 0;
  const careerOf = (M, seed, arm) => {
    const out = { clean40: 0, queued: 0, starts: 0, past: 0 };
    let prev = null;
    const r = driveKeyed(M, seed, { tag: 'economy|', seasons: 40, steps: 1500, onDeck: arm ? ARMS[arm] : false, onStep: s => {
      const card = prev?.phase === 'random_events' ? prev.pendingEvents?.[0] : null;
      if (arm && card && isDeck(card.id)) {
        answers += 1;
        const added = queuedOf(s) - queuedOf(prev);
        out.queued += Math.max(0, added);
        if (added > H.momentsRoom(prev)) overRoom += 1;
      }
      if (s.phase === 'playing' && prev?.phase !== 'playing') {
        out.starts += 1;
        if (s.overall > H.engine.effectivePotential(s)) out.past += 1;
        if (s.age >= 25 && out.morale25 === undefined) { out.morale25 = s.morale; out.integrity25 = s.integrityBonus; }
        if (s.age >= 30 && out.morale30 === undefined) { out.morale30 = s.morale; out.integrity30 = s.integrityBonus; out.overall30 = s.overall; }
      }
      if ((s.integrityBonus ?? 0) >= 40) out.clean40 = 1;
      prev = s;
    } });
    out.peak = r.s.peakOverall ?? r.s.overall;
    out.legacy = withStream(() => H.engine.calculateLegacy(r.s).score, seeded(seed)).value;
    out.pastCeiling = out.starts ? out.past / out.starts : 0;
    return out;
  };
  const METRICS = Object.keys(BANDS);
  const table = {};
  for (const arm of ['off', 'best', 'worst', 'neutral']) {
    if (arm !== 'off') { H.gate.setSoccerDeckLoader(async () => moduleFor(P8)); await H.gate.loadSoccerDeck(); }
    table[arm] = [];
    for (let sd = 0; sd < 5; sd += 1) {
      const rows = [];
      for (let n = 0; n < ECON_N; n += 1) rows.push(careerOf(H.engine, 20000 + sd * 1000 + n, arm === 'off' ? null : arm));
      const mean = m => { const v = rows.map(r => r[m]).filter(x => typeof x === 'number'); return v.reduce((a, b) => a + b, 0) / Math.max(1, v.length); };
      table[arm].push(Object.fromEntries([...METRICS, 'queued'].map(m => [m, mean(m)])));
    }
    H.gate.setSoccerDeckLoader();
  }
  const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = xs => { const m = avg(xs); return Math.sqrt(avg(xs.map(x => (x - m) ** 2))); };
  for (const m of [...METRICS, 'queued']) {
    const off = table.off.map(r => r[m]);
    const parts = ['best', 'worst', 'neutral'].map(a => `${a} ${avg(table[a].map(r => r[m])).toFixed(2)} (${(avg(table[a].map(r => r[m])) - avg(off)) >= 0 ? '+' : ''}${(avg(table[a].map(r => r[m])) - avg(off)).toFixed(2)})`);
    console.log(`   ${m}: off ${avg(off).toFixed(2)} (seed to seed sd ${sd(off).toFixed(2)}), ${parts.join(', ')}${BANDS[m] !== undefined ? `, band ${BANDS[m]}` : ''}`);
    if (BANDS[m] === undefined) continue;
    for (const a of ['best', 'worst', 'neutral']) {
      const d = avg(table[a].map((r, i) => r[m] - off[i]));
      if (Math.abs(d) > BANDS[m]) fail(`${a} moves ${m} by ${d.toFixed(2)} against the deck off, band ${BANDS[m]}`);
    }
  }
  const legacySpread = sd(table.off.map(r => r.legacy));
  const moveOf = a => avg(table[a].map((r, i) => r.legacy - table.off[i].legacy));
  const perSeed = a => table[a].map((r, i) => (r.legacy - table.off[i].legacy).toFixed(2)).join(' ');
  console.log(`   legacy against the deck off: BEST ${moveOf('best').toFixed(2)} (seeds ${perSeed('best')}), WORST ${moveOf('worst').toFixed(2)} (seeds ${perSeed('worst')}), NEUTRAL ${moveOf('neutral').toFixed(2)} (seeds ${perSeed('neutral')}); the seed to seed spread ${legacySpread.toFixed(2)}, the ruling's band ${BANDS.legacy}`);
  console.log(`   ${answers} deck answers, ${overRoom} queued more than the room just before them`);
  if (answers === 0) fail('no deck card was answered in any arm');
  if (overRoom) fail(`${overRoom} deck answers queued more than momentsRoom allowed`);
  if (!red.has('8')) ok('every arm inside its bands against the deck off, and no deck answer queued past the room');
}

/* ─── 9. old saves ─────────────────────────────────────────────────────── */

SECTION = '9';
console.log('9) Old saves: the base\'s saves load and play here as they do there; a save with a deck card pending loads on the base (skipped, its stamp handed back) and answers here');
if (runs(9)) {
  const clubs = H.engine.FALLBACK_CLUBS;
  const playSeason = (M, st, seed) => withStream(() => {
    let s = M.repairCareer(st);
    for (let k = 0; k < 60; k += 1) { const t = step(M, s, seed, clubs); if (!t) break; s = t; if (s.phase === 'playing') break; }
    return JSON.stringify(s);
  }, seeded(hashInt(`old|${seed}`))).value;
  let loaded = 0, apartLoad = 0, apartPlay = 0, threw = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    const saves = [];
    let k = 0;
    drive(B.engine, seed, { onStep: s => { if ((k += 1) % 9 === 0) saves.push(JSON.stringify(s)); } });
    for (const json of saves) {
      loaded += 1;
      try {
        const h = withStream(() => JSON.stringify(H.engine.repairCareer(JSON.parse(json))), seeded(1)).value;
        const b = withStream(() => JSON.stringify(B.engine.repairCareer(JSON.parse(json))), seeded(1)).value;
        if (h !== b) apartLoad += 1;
        if (playSeason(H.engine, JSON.parse(json), seed) !== playSeason(B.engine, JSON.parse(json), seed)) apartPlay += 1;
      } catch (e) { threw += 1; if (threw < 3) console.error(`     a base save threw here: ${e.message}`); }
    }
  }
  console.log(`   ${loaded} saves the base wrote, loaded and played a season on both`);
  if (loaded < 200) fail(`only ${loaded} base saves read`);
  if (threw) fail(`${threw} base saves threw here`);
  if (apartLoad || apartPlay) fail(`${apartLoad} base saves load differently here and ${apartPlay} play their season differently (the deck not loaded)`);
  else ok('every base save loads to the same JSON here and plays the same season');
  /* a head save with a deck card pending */
  H.gate.setSoccerDeckLoader(async () => moduleFor(PACK));
  await H.gate.loadSoccerDeck();
  const pending = [];
  for (let seed = 0; seed < 60 && pending.length < 60; seed += 1) {
    drive(H.engine, seed, { onStep: s => { if (s.phase === 'random_events' && isDeck(s.pendingEvents?.[0]?.id) && pending.length < 60) pending.push(JSON.stringify(s)); } });
  }
  let skippedOnBase = 0, answeredHere = 0, valid = 0;
  for (const json of pending) {
    const saved = JSON.parse(json);
    if (H.save.isSoccerCareerSave(saved)) valid += 1;
    const card = saved.pendingEvents[0];
    const season = saved.seasons[saved.seasons.length - 1].year;
    const key = String(card.id);
    const moving = card.choices.findIndex(c => c.consequence !== 'Nothing changes');
    try {
      const b = withStream(() => B.engine.applyEventChoice(JSON.parse(json), moving, clubs), seeded(3)).value;
      const skipped = b.pendingEvents.length === saved.pendingEvents.length - 1 && !(b.events ?? []).some(l => l.includes(card.title))
        && !(saved.eventLastFired?.[key] === season && b.eventLastFired?.[key] === season);
      if (skipped) skippedOnBase += 1;
    } catch (e) { console.error(`     the base threw on a pending deck card: ${e.message}`); }
    const h = withStream(() => H.engine.applyEventChoice(JSON.parse(json), moving, clubs), seeded(3)).value;
    if ((h.events ?? []).slice(saved.events.length).some(l => l.includes(card.title)) && h.eventLastFired?.[key] === season) answeredHere += 1;
  }
  H.gate.setSoccerDeckLoader();
  console.log(`   ${pending.length} saves with a deck card pending: ${valid} pass the save validator, ${skippedOnBase} skipped on the base with the stamp handed back, ${answeredHere} answered here`);
  if (pending.length < 20) fail(`only ${pending.length} saves with a deck card pending`);
  if (valid !== pending.length) fail(`${pending.length - valid} saves with a deck card pending fail the save validator`);
  if (skippedOnBase !== pending.length) fail(`${pending.length - skippedOnBase} pending deck cards were not skipped cleanly on the base`);
  if (answeredHere !== pending.length) fail(`${pending.length - answeredHere} pending deck cards were not answered here after the reload`);
  if (!red.has('9')) ok('a saved deck card loads on the base and is skipped with its stamp handed back, and here it is answered');
}

/* ─── 10. lazy, the static half ────────────────────────────────────────── */

SECTION = '10';
console.log('10) Lazy: the page and the engine reach the gate and nothing of the deck, and the page is the one caller that loads it');
if (runs(10)) {
  const gateAbs = path.join(ROOT, GATE);
  const override = {};
  if (CONTROL === 'eager') {
    const text = readSrc(GATE);
    if (text.includes("import './soccerDeck';")) { console.error('eager control: the gate already imports the deck statically, refusing to run'); process.exit(2); }
    override[gateAbs] = `import './soccerDeck';\n${text}`;
  }
  for (const entry of [PAGE, ENGINE]) {
    const closure = staticClosure(ROOT, entry, override);
    const leaked = [...closure].filter(f => f === DECK || f.startsWith('src/data/soccerDeck/') || f === 'src/lib/gmInbox.ts');
    if (!closure.has(GATE)) fail(`${entry}'s static closure (${closure.size} files) does not hold the gate`);
    if (leaked.length) fail(`${entry}'s static closure holds ${leaked.join(', ')}`);
    else ok(`${entry}: ${closure.size} files load with it, the gate among them, and none of the deck`);
  }
  const walk = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(`${dir}/${d.name}`)
    : /\.(ts|tsx)$/.test(d.name) ? [`${dir}/${d.name}`] : []));
  const files = walk('src');
  const isTest = f => /\.test\.tsx?$/.test(f) || f.startsWith('src/test/');
  /* Round 1504: the page loads the deck now, and it is the one caller. `caller` adds a call to the engine (which must
     never fetch the deck: the deal would then wait on the network) and `pagesilent` takes the page's calls away
     (the cards would never be dealt), each in memory. */
  if (CONTROL === 'caller' && !files.includes(ENGINE)) { console.error('caller control: the engine is gone, refusing to run'); process.exit(2); }
  const callers = [];
  let read = 0;
  for (const f of files) {
    if (f === GATE || isTest(f)) continue;
    read += 1;
    let text = readSrc(f);
    if (CONTROL === 'caller' && f === ENGINE) text = `${text}\nvoid loadSoccerDeck();\n`;
    if (CONTROL === 'pagesilent' && f === PAGE) {
      const n = (text.match(/loadSoccerDeck\(\)/g) ?? []).length;
      if (n === 0) { console.error('pagesilent control: the page calls loadSoccerDeck nowhere, refusing to run'); process.exit(2); }
      text = text.split('loadSoccerDeck()').join('Promise.resolve()');
    }
    if (!text.includes('loadSoccerDeck')) continue;
    if (/\bloadSoccerDeck\s*\(/.test(codeOf(path.join(ROOT, f), text))) callers.push(f);
  }
  if (read < 500) fail(`only ${read} src files read: the caller check saw nothing`);
  const others = callers.filter(f => f !== PAGE);
  if (others.length) fail(`${others.length} src files besides the page call loadSoccerDeck: ${others.join(', ')}`);
  if (!callers.includes(PAGE)) fail(`${PAGE} never calls loadSoccerDeck, so no summer card is ever dealt`);
  if (!others.length && callers.includes(PAGE)) ok(`${read} src files read as code: the page loads the deck, and nothing else but the gate and tests calls loadSoccerDeck`);
}

/* ─── the verdict ──────────────────────────────────────────────────────── */

console.log('');
console.log(`runtime ${secs()} s`);
if (CONTROL) {
  const breaks = CONTROLS[CONTROL].breaks;
  if (red.has(breaks)) { console.error(`simSoccerDeck: CONTROL=${CONTROL} FIRED: section ${breaks} failed (${failures} failures, red sections ${[...red].join(', ')})`); process.exit(1); }
  console.error(`simSoccerDeck: CONTROL=${CONTROL} did NOT fire: section ${breaks} stayed green, which is itself a failure of the control`);
  process.exit(3);
}
if (failures > 0) {
  console.error(`simSoccerDeck: ${failures} failure${failures === 1 ? '' : 's'}, red sections ${[...red].join(', ')}`);
  process.exit(1);
}
console.log(`simSoccerDeck: green.${SECTIONS.length ? ` Sections ${SECTIONS.join(', ')} only.` : ' Every section.'}`);
