/* simUsCareerSummer.mjs, Round 1038: the US offseason is a summer.

   Every NFL, NBA, MLB and NHL offseason deals up to three cards
   (src/lib/usCareerSummer.ts) under the flagship's cooldown ledger, lifted
   into src/lib/careerEventDeck.ts. This harness drives seeded careers headless
   in the board's own call order through the REAL bindings (nflCareerSport.ts
   and its three siblings), once on each binding's own knob ("on") and once on
   the one card knob ("off": cards 1, cooldowns off, which is the old game draw
   for draw; scripts/simUsBoardParity.mjs proves that on the board). Answers
   are picked from a stream keyed to the career, the year and the card, so the
   choice policy never touches the season's Math.random.

   Run: node scripts/simUsCareerSummer.mjs [careers per sport, default 400]
        SIM_SECTIONS=1,2,... runs only those sections (default all).
        SIM_CONTROL=<name> runs one negative control; it exits 1 only when
        its own check fires (FIRED) and 0 when it does not (DID NOT FIRE).
        SIM_SEED=<n> moves every stream.

   SECTIONS, each with the control that must turn it red:
     1. depth     cards answered per offseason that is neither banned nor
                  final: on, the median is at least 2 and the mean sits in
                  its sport's band; off, every one is exactly 1. Control
                  onecard (the four bindings deal one card). The scout's
                  design asked for a median of 3; the later-card rules that
                  section 6 needed (see MEASURED) leave the NFL at 3 and the
                  other three at 2.
     2. cooldown  an independent reading of the rule (the card's own cooldown
                  when it is a finite number at or over zero, else 1; the key
                  is 'story:' plus the story, else the id; press cards are
                  outside the ledger) finds no card answered again inside its
                  cooldown, in any career. Control nocooldown.
     3. story     no two cards of one offseason share a ledger key, so two
                  cards telling one story never land together. Control
                  samestory.
     3b. press    per offseason, from the same state: card 1 is a big press
                  moment exactly when the one card draw would be one (a
                  repeat champion keeps his podium), and no later card is.
                  Control pressfilter (the cooldown reaches the big press).
     4. keyed     per offseason, one state and ledger cloned, the same answers:
                  cards 3 and cards 1 at the same cooldown setting make the
                  same number of Math.random calls, so cards 2 and 3 never
                  touch the season's stream. Control mathrandom.
     5. never     a career with every card in its deck stamped this season is
        empty     still dealt card 1. Control nofallback.
     6. balance   an equivalence bound, on against off, careers pooled over
                  three seeds: the 95 percent interval of each difference must
                  sit inside the design tolerance written below, chosen before
                  anything was measured. 6b: the Round 123 award scarcity
                  and the Round 915 Hall floor, measured on the loop players
                  now play (on). Control doubletraining (the Offseason focus
                  card in every slot) must push peak OVR outside its tolerance.
     7. coverage  distinct cards answered per career, on over off, at least
                  the lift in its band. Control onecard.
     8. agreement until Soccer Career imports careerEventDeck.ts, it and the
                  soccer engine's eventLedgerKey, eventCooldown and
                  isEventOnCooldown agree on 10,000 generated cases. Control
                  drift.
     9. board     src/test/usCareerSummer.test.tsx passes on the real board
                  (Vitest's own exit code and its count). Control noresume
                  (the board's summer restore switched off) must fail it.
     10. later    no answer to a card after card 1 moves the rating or its
                  ceiling, read off the career before and after each answer
                  (the guides promise it). Control probe (the deal's rating
                  probe and the show time check both off).
     11. arc      no corruption card is dealt after card 1, and some are
                  dealt as card 1. Control latercorrupt.
     12. kind     card 1 is the one card draw on slot 0's stream unless that
                  card is resting; a resting one is replaced by a fresh card
                  of its own kind (moves the rating or not) whenever one is
                  there, judged by this harness on the dealt state. Control
                  nokind (any fresh card takes its place).

   DESIGN TOLERANCES (section 6), set before any measurement: a summer may
   move a career this much and no more, on against off.
     peak OVR (mean)                  1.0 rating point either way
     median legacy score              7.5 percent of off's median
     Hall of Fame share               3 percentage points
     headline awards per season       15 percent of off's rate
   Headline awards are simAwards' MAJOR table (NFL MVP and Defensive Player
   of the Year, NBA MVP, MLB MVP and Cy Young, NHL Hart, Norris and Vezina)
   plus its all-league honour (All-Pro, All-NBA, All-Star). Written first as
   the MAJOR table alone; the first measurement put that rate's interval at
   about plus or minus 17 percent with 3000 careers a side (an MVP is rare),
   so a 15 percent bound could not be met at any size this harness can run
   even with no effect at all. The all-league honour was added to the count
   and the tolerance was left exactly where it was set. The MAJOR table alone
   is still what 6b checks.

   MEASURED (2026-10-06, this machine, the tree at Round 1038's head):

   How the summer got here, section 6 at every step, on against off:
     three cards from the whole deck: peak OVR +4.2 to +7.2, Hall share
       +29 to +51 points, median legacy +55 to +130 percent. Red everywhere.
     later cards may not move the rating (the probe in usCareerSummer.ts):
       peak inside; NFL legacy +12.8 percent, MLB Hall +11 points. Red.
     card 1 redrawn in kind when resting: MLB card 1 had become a rating
       card in 49 percent of summers against 38; the redraw alone did not
       hold it, because later cards opened arcs whose cards then came as
       card 1 (MLB's PED clinic), so the corruption deck went to card 1 only.
     later cards whose answers lift morale on average are passed over
       (LATER_CARD_MORALE_LIFT 0). At a lift of 4, every sport still ran 7
       to 11 percent high on median legacy over 800 careers a side; a camp
       settle of half or three quarters of the later cards' swing changed
       almost nothing (tried and removed). At 0, green, below.

   6, 2000 careers a sport a seed, three seeds, children in parallel (about
   27 minutes here), difference and 95 percent interval, on minus off:
     nfl  peak +0.07 [-0.05, 0.19]  legacy +1.4% [-4.1, 6.3]
          Hall +0.27 [-1.01, 1.54]  headline -6.8% [-14.3, 1.0]
     nba  peak +0.16 [0.04, 0.28]   legacy +0.3% [-1.6, 3.7]
          Hall +0.95 [-0.68, 2.58]  headline +0.8% [-3.5, 5.6]
     mlb  peak +0.13 [-0.00, 0.26]  legacy +3.1% [0.8, 4.9]
          Hall +1.20 [-0.46, 2.86]  headline +0.9% [-4.8, 6.2]
     nhl  peak +0.12 [-0.00, 0.25]  legacy +1.8% [-0.4, 3.7]
          Hall +0.55 [-1.05, 2.15]  headline +3.0% [-1.8, 7.3]
     Rerun after review with the show time check (same seeds): nfl, nba and
     mlb identical to the last digit; nhl peak +0.13 [0.00, 0.25], legacy
     +1.8% [-0.3, 3.7], Hall +0.60 [-1.00, 2.20], headline +3.0% [-1.8, 7.4],
     so the check skipped a handful of NHL later cards in 6000 careers.
     A second seed for the NFL, whose headline interval sat 0.7 points
     inside its bound (SIM_SEED=7 SIM_SPORTS=nfl SIM_SECTIONS=6): peak +0.12
     [-0.01, 0.24], legacy +2.5% [-3.1, 6.8], Hall +0.17 [-1.14, 1.47],
     headline -1.9% [-9.4, 6.7]. The headline edge moved to 5.6 points
     inside, but the legacy edge is now the close one (0.7 points): with
     2000 careers a seed the NFL's legacy and headline intervals are about
     plus or minus 5 and 7.5 points wide, so either can come up red on a
     seed with no real change. More NFL careers, not a wider bound, is the
     cure if it does.
     IT DID, at Release AP (2026-10-09, the tree with Round 1104's football
     truth: 16 game seasons to 2020, rookie pay off the slot, one bank). The
     NFL's median legacy, on minus off, all on GitHub runners:
       2000 a seed, default seed   +3.2% [-2.5, 7.5]   red by the edge
       2000 a seed, SIM_SEED=7     +2.0% [-3.6, 6.8]   inside
       4000 a seed                 +4.6% [0.7, 8.6]    red
       8000 a seed                 +3.9% [0.3, 6.8]    inside
       main before it, 4000        +2.1% [-1.7, 5.8]   inside
     So the lift is real, near 4 percent where it was near 2, and inside the
     7.5 percent the design allows; the check at 2000 could not tell that
     from 8. The NFL now runs 8000 a seed by default (BAL_DEFAULT below, the
     cure this header named before the fact; the bound is untouched; about
     29 minutes for that child on a runner). STILL CLOSE: 0.7 points inside
     at 8000. The next round that moves the NFL engine should expect this
     line to speak first, and the honest answers are a smaller lift from the
     deck's later cards or more careers again, never a wider bound.
     THE NBA NEXT, with Round 1103 (2026-10-09, the tree with the NBA's new
     stat line and awards, merged with Release AP). The NBA's Hall share, on
     minus off, in points, all on GitHub runners:
       this tree, 2000 a seed, default seed   +1.90 [0.29, 3.51]    red
       this tree, 2000 a seed, SIM_SEED=7     +0.43 [-1.19, 2.05]   inside
       this tree, 2000 a seed, SIM_SEED=11    +0.43 [-1.18, 2.05]   inside
       this tree, 8000 a seed                 +1.30 [0.49, 2.11]    inside
       Release AP's, 2000, default seed       +0.62 [-1.02, 2.25]   inside
       Release AP's, 2000, SIM_SEED=7         +1.33 [-0.31, 2.98]   inside by 0.02
       Release AP's, 8000 a seed              +1.20 [0.39, 2.02]    inside
     So the lift is about 1.25 points on both trees and Round 1103 did not
     move it. At 2000 a seed the interval is 1.62 points either way against a
     bound of 3, so a run goes red whenever its estimate passes 1.38, a
     tenth of a point over the lift itself: one run of five did and another
     sat 0.02 inside, on two trees. The NBA
     runs 8000 a seed by default now (BAL_DEFAULT below, the same cure, the
     bound untouched): 0.89 points inside, about 46 minutes for that child
     on a runner with one other heavy job beside it. Its median legacy at
     8000 reads +3.6% [2.1, 5.5] here and +2.3% [0.8, 3.7] on Release AP's.
     NOT CHANGED, and the next to speak: the MLB's Hall share at 2000 a seed
     is +1.28 [-0.38, 2.95], 0.05 inside, on a tree no round has moved.
     6b on the summer loop: median career majors 0 in all four, a major
     ever won by 4.5, 16.9, 7.6 and 15.5 percent, Hall 15.1, 30.1, 32.0 and
     27.9 percent (floors: median 0, at most 25 percent, Hall at least 5).

   1 and 7, 400 careers a sport, the default seed and SIM_SEED 1 to 5 (see
   DEPTH_MEAN and COVERAGE_LIFT below for the bands set from these):
     mean cards a summer (median):  nfl 2.699 to 2.721 (3), nba 1.973 to
       1.999 (2), mlb 1.789 to 1.844 (2), nhl 2.192 to 2.235 (2, once 3);
       off, exactly 1 in every offseason of every run.
     coverage lift, distinct cards a career on over off: nfl 2.12 to 2.21,
       nba 1.95 to 2.02, mlb 1.76 to 1.84, nhl 1.92 to 1.98 (band: at
       least 1.6; control onecard puts it at 1.00 to 1.04).
     2, 3, 3b, 4, 5, 8 are exact: 0 repeats inside a cooldown (12,000 to
       16,000 cards a sport), 0 summers with a repeated key, 0 press
       disagreements over 343 to 972 back to back big press moments a
       sport, 0 of 400 replayed offseasons with a different Math.random
       count, 0 empty summers, 0 of 10,000 cases disagreeing with soccer.
   Controls, each run alone at the default size, every one FIRED: onecard,
   nocooldown, samestory, pressfilter, mathrandom, nofallback, drift,
   noresume, and doubletraining (peak OVR +6.5, +6.7, +8.1 and +6.8 against
   a tolerance of 1.0). After review (the show time check and sections 10
   to 12), each control run alone on its own section, every one FIRED again:
   onecard, nocooldown, samestory, pressfilter, mathrandom and nofallback at
   150 careers, drift and noresume, and probe, latercorrupt and nokind at
   400. doubletraining now also switches the show time check off (it skips
   a later rating card when shown, so the forced card was never answered)
   and, at SIM_BALANCE_CAREERS=200, pushed peak OVR +6.31, +6.48 and +7.87
   for nfl, nba and mlb, every interval outside 1.0.

   10 to 12, added after review (2026-10-06, 400 careers a sport, default
   seed, on the tree with the show time check in seekSummerCard):
     10: later answers nfl 10669, nba 7361, mlb 6094, nhl 9706, none moved
       the rating; dealt cards skipped when shown 113 of 17036, 131 of
       14858, 47 of 13692, 75 of 17872. A counting copy of the run found
       every skip at 40 careers was a card that left its deck: the show time
       check never fired in real play, so sections 1 to 8 are unchanged by
       it (depth above is the same to the third decimal). Control probe:
       2541, 3862, 3305 and 2518 later answers moved the rating.
     11: corruption cards as card 1 932, 1174, 847, 1350; later 0. Control
       latercorrupt: 3001, 5481, 1039 and 3532 dealt after card 1.
     12: card 1 was the draw itself in 6017, 7239, 7350, 7471 offseasons
       (never otherwise); resting draws 237, 127, 201, 620, every one with a
       fresh card of its kind (35, 33, 76, 82 of them rating cards), none
       replaced by the other kind. Control nokind: 114 of 245, 55 of 122,
       109 of 204 and 266 of 608 replaced by the other kind. The floor of 50
       resting draws a sport is why this section wants the default 400
       careers: at 40 it reads too few and says so.

   Nothing here reaches the network: the bundle is the four bindings, the
   summer, the ledger and the soccer engine's three exported rules, with
   localStorage stubbed. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CAREERS = Number(process.argv[2] || 400);
const CONTROL = process.env.SIM_CONTROL || '';
const SECTIONS = new Set((process.env.SIM_SECTIONS || '1,2,3,3b,4,5,6,7,8,9,10,11,12').split(',').map(s => s.trim()));
const SEED = Number.isFinite(Number(process.env.SIM_SEED)) && process.env.SIM_SEED ? Number(process.env.SIM_SEED) : 0;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'usSummer-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

/* ─── controls: each rewrites source at bundle time, never on disk ─────────── */
const LEDGER = 'src/lib/careerEventDeck.ts';
const SUMMER = 'src/lib/usCareerSummer.ts';
const BINDINGS = ['nfl', 'nba', 'mlb', 'nhl'].map(s => `src/lib/${s}CareerSport.ts`);
const ONE_CARD_LINE = 'summer: { cards: 3, cooldowns: true, fallbackCooldown: 1 },';
const CONTROLS = {
  onecard: { section: '1', note: 'the four bindings deal one card', edits: BINDINGS.map(file => ({ file, from: ONE_CARD_LINE, to: 'summer: { cards: 1, cooldowns: true, fallbackCooldown: 1 },' })) },
  nocooldown: { section: '2', note: 'nothing is ever on cooldown', edits: [{ file: LEDGER, from: '  return season - last <= cooldownOf(e, fallback);', to: '  return false;' }] },
  samestory: { section: '3', note: 'a summer forgets the keys it already dealt', edits: [{ file: SUMMER, from: 'const taken = new Set<string>([ledgerKey(first)]);', to: 'const taken = new Set<string>();' }, { file: SUMMER, from: '    taken.add(ledgerKey(e));', to: '' }] },
  pressfilter: {
    section: '3b', note: 'the cooldown reaches the press room, big moments included',
    edits: [{ file: SUMMER, from: 'const outsideLedger = (e: UsCareerEvent<C>) => !!e.press;', to: 'const outsideLedger = (_e: UsCareerEvent<C>) => false;' }],
  },
  mathrandom: { section: '4', note: 'cards 2 and 3 are dealt on Math.random', edits: [{ file: SUMMER, from: 'const r = slotStream(c, sport.slug, year, i);', to: 'const r = Math.random;' }] },
  nofallback: { section: '5', note: 'a summer whose deck is all resting deals nothing', edits: [{ file: SUMMER, from: 'if (first === raw && any) first = any;', to: 'if (first === raw) first = any as UsCareerEvent<C>;' }] },
  doubletraining: {
    section: '6', note: 'the Offseason focus card in every slot',
    edits: [
      { file: SUMMER, from: 'const picked: UsCareerEvent<C>[] = [first];', to: "first = sport.eventDeck(c, slotStream(c, sport.slug, year, 0)).find(x => x.id === 'training') ?? first; const picked: UsCareerEvent<C>[] = [first];" },
      { file: SUMMER, from: '[e] = takeFresh(deck, 1, knob.cooldowns ? ledger : null, year, knob.fallbackCooldown, passed, r, outsideLedger);', to: "e = deck.find(x => x.id === 'training'); break;" },
      /* Since the show time check, a later rating card is skipped when shown,
         so the forced card would never be answered without this. */
      /* Round 1039 put the board's held out check in front of this line and the
         anchor went stale (the control refused to run from then until Release
         AP's gate read it on 2026-10-09). The held out check stays. */
      { file: SUMMER, from: 'if (card && !(exclude && exclude(card)) && (s.at === 0 || !laterAnswerMovesRating(c, sport, card, s.at))) return card;', to: 'if (card && !(exclude && exclude(card))) return card;' },
    ],
  },
  probe: {
    section: '10', note: 'later cards are never checked for the rating, at the deal or when shown',
    edits: [
      { file: SUMMER, from: 'if (moraleLiftOf(c, e, snapshot) <= LATER_CARD_MORALE_LIFT && !movesRating(c, e, snapshot)) break;', to: 'if (moraleLiftOf(c, e, snapshot) <= LATER_CARD_MORALE_LIFT) break;' },
      /* Round 1039 put the board's held out check in front of this line and the
         anchor went stale (the control refused to run from then until Release
         AP's gate read it on 2026-10-09). The held out check stays. */
      { file: SUMMER, from: 'if (card && !(exclude && exclude(card)) && (s.at === 0 || !laterAnswerMovesRating(c, sport, card, s.at))) return card;', to: 'if (card && !(exclude && exclude(card))) return card;' },
    ],
  },
  latercorrupt: { section: '11', note: 'the later slots may deal the corruption deck', edits: [{ file: SUMMER, from: ".filter(e => e.press !== 'big' && !e.corruption);", to: ".filter(e => e.press !== 'big');" }] },
  nokind: { section: '12', note: 'a resting card 1 is replaced by any fresh card, whatever its kind', edits: [{ file: SUMMER, from: 'if (movesRating(c, cand, snapshot) === kind) { first = cand; break; }', to: '{ first = cand; break; }' }] },
  drift: { section: '8', note: 'the shared ledger compares with < where soccer uses <=', edits: [{ file: LEDGER, from: '  return season - last <= cooldownOf(e, fallback);', to: '  return season - last < cooldownOf(e, fallback);' }] },
  noresume: { section: '9', note: "the board's summer restore switched off", edits: [{ file: 'src/components/us-career/UsCareerBoard.tsx', from: "if (restoredPhase === 'season' && loaded.summer) {", to: "if (restoredPhase === 'season' && loaded.summer && false) {" }] },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control "${CONTROL}": use ${Object.keys(CONTROLS).join(', ')}`); process.exit(1); }
const rewrites = new Map();
if (CONTROL) {
  for (const ed of CONTROLS[CONTROL].edits) {
    const abs = path.join(ROOT, ed.file);
    const src = rewrites.get(abs) ?? fs.readFileSync(abs, 'utf8').split('\r\n').join('\n');
    const hits = src.split(ed.from).length - 1;
    if (hits !== 1) { console.error(`control ${CONTROL} cannot run: ${ed.file} holds "${ed.from}" ${hits} times, not once, so it would prove nothing`); process.exit(1); }
    rewrites.set(abs, src.replace(ed.from, ed.to));
  }
  console.log(`NEGATIVE CONTROL ${CONTROL}: ${CONTROLS[CONTROL].note} (section ${CONTROLS[CONTROL].section} must fail)`);
}
const controlPlugin = {
  name: 'us-summer-control',
  setup(b) {
    if (!rewrites.size) return;
    b.onLoad({ filter: /\.tsx?$/ }, args => {
      const abs = path.resolve(args.path);
      if (!rewrites.has(abs)) return undefined;
      return { contents: rewrites.get(abs), loader: abs.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(abs) };
    });
  },
};

/* ─── the seeded stream, with its state in reach so a run can be replayed ── */
let RS = 0;
let CALLS = 0;
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
const reseed = key => { RS = hash(`${SEED}:${key}`) | 0; };
Math.random = () => {
  CALLS += 1;
  RS = (RS + 0x6d2b79f5) | 0;
  let t = Math.imul(RS ^ (RS >>> 15), 1 | RS);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ─── bundle ─────────────────────────────────────────────────────────────── */
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
export const nfl = (await import('${ROOT_URL}/src/lib/nflCareerSport.ts')).NFL_CAREER_SPORT;
export const nba = (await import('${ROOT_URL}/src/lib/nbaCareerSport.ts')).NBA_CAREER_SPORT;
export const mlb = (await import('${ROOT_URL}/src/lib/mlbCareerSport.ts')).MLB_CAREER_SPORT;
export const nhl = (await import('${ROOT_URL}/src/lib/nhlCareerSport.ts')).NHL_CAREER_SPORT;
export const summer = await import('${ROOT_URL}/src/lib/usCareerSummer.ts');
export const ledger = await import('${ROOT_URL}/src/lib/careerEventDeck.ts');
export const keyed = await import('${ROOT_URL}/src/lib/keyedRng.ts');
export const soccer = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') }, plugins: [controlPlugin],
});
const B = await import(pathToFileURL(OUT).href);
const { startSummer, answerSummerCard, summerOn, newSummerSalt } = B.summer;
const { keyedRng } = B.keyed;
const ONLY_SPORTS = (process.env.SIM_SPORTS || '').split(',').map(s => s.trim()).filter(Boolean);
const SPORTS = Object.fromEntries(Object.entries({ nfl: B.nfl, nba: B.nba, mlb: B.mlb, nhl: B.nhl }).filter(([slug]) => !ONLY_SPORTS.length || ONLY_SPORTS.includes(slug)));
const OFF = { cards: 1, cooldowns: false, fallbackCooldown: 1 };
const clone = v => JSON.parse(JSON.stringify(v));
const lastYear = c => c.seasons[c.seasons.length - 1]?.year ?? 0;
const keyOf = e => (e.story ? `story:${e.story}` : String(e.id));

/* The answer: a stream keyed to the career, the year and the card, so it is
   the same whichever knob dealt the card and never draws Math.random. */
const pickOption = (tag, year, ev) => Math.floor(keyedRng(`policy:${tag}:${year}:${ev.id}`)() * ev.options.length);

/* One offseason, in the board's order: deal, answer every card (card 1 on the
   season's stream, the rest on their own), then one team quality roll. */
function offseason(sport, c, tq, tag) {
  const year = lastYear(c);
  let ev = startSummer(c, sport, Math.random);
  const dealt = c.summer ? c.summer.ids.length : ev ? 1 : 0;
  const answered = [];
  while (ev) {
    /* slot: the card's place in the summer (0 is card 1); moved: whether its
       answer changed the rating or its ceiling (sections 10 to 12). */
    const slot = c.summer ? c.summer.at : 0;
    const ovr = c.ovr, pot = c.pot;
    const next = answerSummerCard(c, sport, ev, pickOption(tag, year, ev), Math.random).next;
    answered.push({ id: ev.id, story: ev.story, cooldown: ev.cooldown, press: ev.press, corruption: !!ev.corruption, slot, moved: c.ovr !== ovr || c.pot !== pot });
    ev = next;
  }
  return { year, answered, dealt, tq: sport.rollTeamQuality(tq, Math.random) };
}

/* Section 12's independent reading of card 1, from the state the summer was
   dealt on: the one card draw on slot 0's stream, whether it was resting, and
   when it was, whether a fresh card of its kind (moves the rating or not)
   was there to take its place and what kind card 1 turned out to be. Draws
   only keyed streams, and puts the seeded stream back as it found it. */
function card1Kind(sport, pre, first) {
  if (!first || first.slot !== 0) return null;
  const rs = RS, calls = CALLS;
  const { movesRating, summerCareerKey } = B.summer;
  const year = lastYear(pre);
  const ledger = pre.eventLastFired ?? {};
  const fb = sport.summer.fallbackCooldown;
  const stream = () => keyedRng(`summer:${sport.slug}:${summerCareerKey(pre)}:${year}:0`);
  const raw = sport.drawEvent(clone(pre), stream());
  const resting = sport.summer.cooldowns && !raw.press && B.ledger.onCooldown(ledger, raw, year, fb);
  let out;
  if (!resting) out = { resting: false, same: first.id === raw.id, raw: raw.id };
  else {
    const deck = sport.eventDeck(clone(pre), stream()).filter(e => e.press !== 'big');
    const rawKind = movesRating(pre, raw);
    const card = deck.find(e => e.id === first.id);
    let sameKindFresh = false;
    for (const e of deck) {
      if (keyOf(e) === keyOf(raw) || (!e.press && B.ledger.onCooldown(ledger, e, year, fb))) continue;
      if (movesRating(pre, e) === rawKind) { sameKindFresh = true; break; }
    }
    out = { resting: true, rawKind, firstKind: card ? movesRating(pre, card) : null, sameKindFresh, raw: raw.id };
  }
  RS = rs; CALLS = calls;
  return out;
}

/* One career on one knob, the board's order: the day you arrive (with the
   summer's salt last, when the summer is on), then every season: a banned
   year ages you and deals nothing; otherwise camp, season, progress, the
   retirement check, and the offseason. A contract that runs out is renewed
   in place without a draw (the market window is not what this measures).
   `probe` (on runs only) records, per offseason, whether the one card draw
   from the same state would have been a big press moment, and keeps the
   first `keep` starting states for section 4. */
function playCareer(slug, sport, ci, { probe = false, keep = 0, states = null } = {}) {
  const tag = `${slug}:${ci}`;
  reseed(`career:${tag}`);
  const pos = sport.create.positions[ci % sport.create.positions.length];
  const archs = sport.create.archetypes[pos];
  const era = ci % 5 === 4 && sport.create.eras[1] ? sport.create.eras[1].id : sport.create.eras[0].id;
  const c = sport.startCareer(`Summer ${ci}`, pos, archs[ci % archs.length], Math.random, null, era);
  let tq = sport.rollTeamQuality(null, Math.random);
  sport.assignRole(c, tq, Math.random);
  sport.draftNightInbox(c);
  if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(Math.random);
  let peak = c.ovr;
  const offs = [];
  for (let guard = 0; !c.retired && guard < 30; guard += 1) {
    if ((c.suspendedSeasons ?? 0) > 0) {
      c.suspendedSeasons -= 1;
      c.seasons.push(sport.suspendedLine(c));
      sport.progress(c, Math.random);
      offs.push({ banned: true });
      continue;
    }
    if (c.contractYears <= 0) c.contractYears = 3;
    sport.campBattle(c, tq, Math.random);
    sport.simSeason(c, tq, Math.random);
    sport.progress(c, Math.random);
    peak = Math.max(peak, c.ovr);
    if (sport.shouldRetire(c)) { c.retired = true; offs.push({ final: true }); break; }
    const knobBig = probe ? B[slug].drawEvent(clone(c), () => 0.5).press === 'big' : null;
    if (states && states.length < keep) states.push({ c: clone(c), tq, rs: RS, tag });
    const pre = probe && want('12') && summerOn(sport.summer) ? clone(c) : null;
    const o = offseason(sport, c, tq, tag);
    tq = o.tq;
    peak = Math.max(peak, c.ovr);
    offs.push({ year: o.year, answered: o.answered, dealt: o.dealt, knobBig, kind: pre ? card1Kind(sport, pre, o.answered[0]) : null });
  }
  const legacy = sport.legacyOf(c);
  return { c, peak, legacy, offs };
}

/* ─── report helpers ─────────────────────────────────────────────────────── */
let failures = 0;
const failedSections = new Set();
const fail = (section, m) => { failures += 1; failedSections.add(section); console.error(`  FAIL [${section}]: ${m}`); };
const median = a => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const MAJOR = { nfl: ['MVP', 'Defensive Player of the Year'], nba: ['MVP'], mlb: ['MVP', 'Cy Young'], nhl: ['Hart', 'Norris', 'Vezina'] };
const majorsOf = (slug, c) => c.seasons.reduce((n, s) => n + (s.awards ?? []).filter(a => MAJOR[slug].includes(a)).length, 0);
const ALL_LEAGUE = { nfl: 'All-Pro', nba: 'All-NBA', mlb: 'All-Star', nhl: 'All-Star' };
const headlinesOf = (slug, c) => c.seasons.reduce((n, s) => n + (s.awards ?? []).filter(a => MAJOR[slug].includes(a) || a === ALL_LEAGUE[slug]).length, 0);
const want = s => SECTIONS.has(s);

/* ─── the main runs: every sport, on and off, the same careers ──────────── */
const needMain = ['1', '2', '3', '3b', '4', '5', '7', '10', '11', '12'].some(want);
const RUNS = {};
const STATES = {};
const t0 = Date.now();
if (needMain) {
  for (const [slug, sport] of Object.entries(SPORTS)) {
    const off = { ...sport, summer: OFF };
    STATES[slug] = [];
    RUNS[slug] = { on: [], off: [] };
    for (let i = 0; i < CAREERS; i += 1) {
      RUNS[slug].on.push(playCareer(slug, sport, i, { probe: want('3b') || want('12'), keep: 400, states: STATES[slug] }));
      RUNS[slug].off.push(playCareer(slug, off, i));
    }
  }
  console.log(`ran ${CAREERS} careers a sport on and off in ${((Date.now() - t0) / 1000).toFixed(1)} s (seed ${SEED})`);
}
const played = offs => offs.filter(o => !o.banned && !o.final);

/* Bands, from measured headroom (see MEASURED below). */
/* Per sport, from six seeds (header): the lowest mean measured less 0.15,
   about three times the spread; three is the most a summer deals. */
const DEPTH_MEAN = { nfl: [2.55, 3], nba: [1.82, 3], mlb: [1.64, 3], nhl: [2.04, 3] };
const COVERAGE_LIFT = 1.6;

if (want('1')) {
  console.log('1) depth: cards answered per offseason');
  for (const slug of Object.keys(SPORTS)) {
    const on = RUNS[slug].on.flatMap(r => played(r.offs).map(o => o.answered.length));
    const off = RUNS[slug].off.flatMap(r => played(r.offs).map(o => o.answered.length));
    console.log(`   ${slug}: on median ${median(on)} mean ${mean(on).toFixed(3)} (${on.length} offseasons); off mean ${mean(off).toFixed(3)} (${off.length})`);
    if (!(median(on) >= 2)) fail('1', `${slug}: the median summer answers ${median(on)} cards, under 2`);
    if (!(mean(on) >= DEPTH_MEAN[slug][0] && mean(on) <= DEPTH_MEAN[slug][1])) fail('1', `${slug}: mean ${mean(on).toFixed(3)} outside [${DEPTH_MEAN[slug]}]`);
    if (off.some(n => n !== 1)) fail('1', `${slug}: an off offseason answered ${off.find(n => n !== 1)} cards`);
  }
}

if (want('2')) {
  console.log('2) cooldown: an independent reading of the rule');
  for (const slug of Object.keys(SPORTS)) {
    let repeats = 0, checked = 0, example = '';
    for (const r of RUNS[slug].on) {
      const lastFired = new Map();
      for (const o of played(r.offs)) {
        for (const e of o.answered) {
          if (e.press) continue;
          const key = keyOf(e);
          const cd = typeof e.cooldown === 'number' && Number.isFinite(e.cooldown) && e.cooldown >= 0 ? Math.floor(e.cooldown) : 1;
          const last = lastFired.get(key);
          checked += 1;
          if (last !== undefined && o.year - last <= cd) { repeats += 1; example ||= `${key} in ${last} and ${o.year} (cooldown ${cd})`; }
          lastFired.set(key, o.year);
        }
      }
    }
    console.log(`   ${slug}: ${checked} cards checked, ${repeats} inside their cooldown${example ? `, first ${example}` : ''}`);
    if (!checked) fail('2', `${slug}: no card was checked`);
    if (repeats) fail('2', `${slug}: ${repeats} cards came back inside their cooldown`);
  }
}

if (want('3')) {
  console.log('3) story: no two cards of one offseason share a ledger key');
  for (const slug of Object.keys(SPORTS)) {
    let clashes = 0, summers = 0, storied = 0, example = '';
    for (const r of RUNS[slug].on) {
      for (const o of played(r.offs)) {
        summers += 1;
        const keys = o.answered.map(keyOf);
        storied += o.answered.filter(e => e.story).length;
        if (new Set(keys).size !== keys.length) { clashes += 1; example ||= keys.join(', '); }
      }
    }
    console.log(`   ${slug}: ${summers} summers, ${storied} storied cards answered, ${clashes} summers with a repeated key${example ? ` (first: ${example})` : ''}`);
    if (clashes) fail('3', `${slug}: ${clashes} summers dealt one key twice`);
  }
}

if (want('3b')) {
  console.log('3b) press: card 1 is a big press moment exactly when the one card draw is');
  for (const slug of Object.keys(SPORTS)) {
    let offseasons = 0, bigKnob = 0, bigOn = 0, mismatch = 0, laterBig = 0, repeatChamp = 0;
    for (const r of RUNS[slug].on) {
      let prevBig = false;
      for (const o of played(r.offs)) {
        offseasons += 1;
        const firstBig = o.answered[0]?.press === 'big';
        if (o.knobBig) bigKnob += 1;
        if (firstBig) bigOn += 1;
        if (o.knobBig !== firstBig) mismatch += 1;
        if (o.answered.slice(1).some(e => e.press === 'big')) laterBig += 1;
        if (o.knobBig && prevBig) repeatChamp += 1;
        prevBig = o.knobBig;
      }
    }
    console.log(`   ${slug}: big press in ${bigKnob} of ${offseasons} offseasons one card, ${bigOn} on the summer; ${repeatChamp} back to back; ${mismatch} differ; ${laterBig} later cards big`);
    if (!bigKnob) fail('3b', `${slug}: no big press moment in the sample, so this proves nothing`);
    if (!repeatChamp) fail('3b', `${slug}: no back to back big press moment in the sample, so the cooldown was never tested against one`);
    if (mismatch) fail('3b', `${slug}: in ${mismatch} offseasons the summer's card 1 and the one card draw disagree about the big press moment`);
    if (laterBig) fail('3b', `${slug}: a big press moment was dealt after card 1 in ${laterBig} offseasons`);
  }
}

if (want('7')) {
  console.log('7) coverage: distinct cards answered per career, on over off');
  for (const slug of Object.keys(SPORTS)) {
    const distinct = runs => runs.map(r => new Set(played(r.offs).flatMap(o => o.answered.map(e => e.id))).size);
    const on = mean(distinct(RUNS[slug].on)), off = mean(distinct(RUNS[slug].off));
    const all = runs => new Set(runs.flatMap(r => played(r.offs).flatMap(o => o.answered.map(e => e.id)))).size;
    console.log(`   ${slug}: ${on.toFixed(2)} distinct cards a career on, ${off.toFixed(2)} off, lift ${(on / off).toFixed(2)}; ${all(RUNS[slug].on)} and ${all(RUNS[slug].off)} distinct over the fleet`);
    if (!(on / off >= COVERAGE_LIFT)) fail('7', `${slug}: lift ${(on / off).toFixed(2)} under ${COVERAGE_LIFT}`);
  }
}

/* Sections 10 to 12 read the summer's own rules directly, card by card, so
   none of them leans on section 6's statistics to notice a rule is gone. */
const laterOf = r => played(r.offs).flatMap(o => o.answered.filter(e => e.slot > 0));
if (want('10')) {
  console.log('10) later cards: no answer after card 1 moves the rating or its ceiling');
  for (const slug of Object.keys(SPORTS)) {
    const later = RUNS[slug].on.flatMap(laterOf);
    const moved = later.filter(e => e.moved);
    const dealt = RUNS[slug].on.reduce((n, r) => n + played(r.offs).reduce((m, o) => m + o.dealt, 0), 0);
    const answered = RUNS[slug].on.reduce((n, r) => n + played(r.offs).reduce((m, o) => m + o.answered.length, 0), 0);
    console.log(`   ${slug}: ${later.length} later answers, ${moved.length} moved the rating${moved.length ? ` (first ${moved[0].id})` : ''}; ${dealt - answered} of ${dealt} dealt cards skipped when shown`);
    if (later.length < 100) fail('10', `${slug}: only ${later.length} later answers, too few to read`);
    if (moved.length) fail('10', `${slug}: ${moved.length} answers after card 1 moved the rating`);
  }
}

if (want('11')) {
  console.log('11) the integrity arc stays with card 1: no corruption card after it');
  for (const slug of Object.keys(SPORTS)) {
    const first = RUNS[slug].on.flatMap(r => played(r.offs).flatMap(o => o.answered.filter(e => e.slot === 0 && e.corruption)));
    const later = RUNS[slug].on.flatMap(laterOf).filter(e => e.corruption);
    console.log(`   ${slug}: ${first.length} corruption cards as card 1, ${later.length} later${later.length ? ` (first ${later[0].id})` : ''}`);
    if (!first.length) fail('11', `${slug}: no corruption card was dealt at all, so this proves nothing`);
    if (later.length) fail('11', `${slug}: ${later.length} corruption cards were dealt after card 1`);
  }
}

if (want('12')) {
  console.log('12) card 1: the one card draw, or when it rests, a fresh card of its kind');
  for (const slug of Object.keys(SPORTS)) {
    const ks = RUNS[slug].on.flatMap(r => played(r.offs).map(o => o.kind).filter(Boolean));
    const kept = ks.filter(k => !k.resting), rested = ks.filter(k => k.resting);
    const notRaw = kept.filter(k => !k.same);
    const reachable = rested.filter(k => k.sameKindFresh);
    const wrongKind = reachable.filter(k => k.firstKind !== k.rawKind);
    const ratingRested = reachable.filter(k => k.rawKind).length;
    console.log(`   ${slug}: ${kept.length} card 1s were the draw itself (${notRaw.length} were not); ${rested.length} draws were resting, ${reachable.length} with a fresh card of their kind (${ratingRested} rating cards), ${wrongKind.length} redrawn in another kind`);
    if (notRaw.length) fail('12', `${slug}: ${notRaw.length} card 1s differ from a draw that was not resting`);
    if (reachable.length < 50 || !ratingRested) fail('12', `${slug}: only ${reachable.length} resting draws (${ratingRested} of them rating cards), too few to read`);
    if (wrongKind.length) fail('12', `${slug}: ${wrongKind.length} resting draws were replaced by a card of the other kind (first ${wrongKind[0].raw})`);
  }
}

if (want('4')) {
  console.log('4) keyed: Math.random calls per offseason, cards 3 against cards 1, from one cloned state');
  const sameCooldowns = k => ({ ...k, cards: 1 });
  for (const [slug, sport] of Object.entries(SPORTS)) {
    let differ = 0, n = 0, example = '';
    const one = { ...sport, summer: sameCooldowns(sport.summer) };
    for (const st of STATES[slug]) {
      const run = s => {
        const c = clone(st.c);
        RS = st.rs; CALLS = 0;
        const o = offseason(s, c, st.tq, st.tag);
        return { calls: CALLS, cards: o.answered.length };
      };
      const three = run(sport), single = run(one);
      n += 1;
      if (three.calls !== single.calls) { differ += 1; example ||= `${st.tag} ${lastYear(st.c)}: ${three.calls} calls with ${three.cards} cards, ${single.calls} with 1`; }
    }
    console.log(`   ${slug}: ${n} offseasons replayed, ${differ} differ${example ? ` (first ${example})` : ''}`);
    if (n < 100) fail('4', `${slug}: only ${n} offseasons replayed`);
    if (differ) fail('4', `${slug}: in ${differ} offseasons the later cards moved the season's stream`);
  }
}

if (want('5')) {
  console.log('5) never empty: every card in the deck stamped this season, card 1 still comes');
  const { summerCareerKey } = B.summer;
  for (const [slug, sport] of Object.entries(SPORTS)) {
    let tested = 0, empty = 0, firstError = '';
    for (const st of STATES[slug].slice(0, 120)) {
      const c = clone(st.c);
      const year = lastYear(c);
      if (B[slug].drawEvent(clone(c), () => 0.5).press === 'big') continue;
      const fired = { ...(c.eventLastFired ?? {}) };
      for (let i = 0; i < sport.summer.cards; i += 1) {
        for (const e of sport.eventDeck(clone(c), keyedRng(`summer:${slug}:${summerCareerKey(c)}:${year}:${i}`))) fired[keyOf(e)] = year;
      }
      c.eventLastFired = fired;
      tested += 1;
      try {
        const ev = startSummer(c, sport, Math.random);
        if (!ev || !c.summer || c.summer.ids.length < 1) empty += 1;
      } catch (err) { empty += 1; firstError ||= err.message; }
    }
    console.log(`   ${slug}: ${tested} fully stamped offseasons, ${empty} dealt nothing${firstError ? ` (${firstError})` : ''}`);
    if (tested < 20) fail('5', `${slug}: only ${tested} offseasons tested`);
    if (empty) fail('5', `${slug}: ${empty} fully stamped offseasons dealt no card`);
  }
}

/* ─── 6. balance: an equivalence bound ──────────────────────────────────── */
const TOL = { peak: 1.0, legacyRel: 0.075, hofPts: 3, headlineRel: 0.15 };
/* Careers a seed, by sport. The NFL runs four times the others since Release
   AP (2026-10-09): at 2000 its legacy interval is about plus or minus 5 points
   wide against a tolerance of 7.5, so a real lift near 4 percent came up red
   on two runs of four (the header has the measurement). The NBA does too
   since Round 1103 (2026-10-09): at 2000 its Hall share interval is 1.62
   points either way against a tolerance of 3, and a lift near 1.25 points
   came up red on one run of five and 0.02 inside on another, on two trees
   (the header has the measurement). SIM_BALANCE_CAREERS still sets one size
   for every sport. */
const BAL_DEFAULT = { nfl: 8000, nba: 8000 };
const balCareers = slug => Number(process.env.SIM_BALANCE_CAREERS || BAL_DEFAULT[slug] || 2000);
const BAL_SIZES = Object.keys(SPORTS).map(slug => `${slug} ${balCareers(slug)}`).join(', ');
const BAL_SEEDS = 3;
function bootstrap(a, b, stat, n = 300) {
  let s = 0x2545f491;
  const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const draw = x => x.map(() => x[Math.floor(r() * x.length)]);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(stat(draw(a), draw(b)));
  out.sort((x, y) => x - y);
  return [out[Math.floor(n * 0.025)], out[Math.ceil(n * 0.975) - 1]];
}
/* Section 6 is most of this harness's time, so with more than one sport it
   runs one child per sport at once, each with its own temp folder, and reads
   their reports. A child exits 1 when its section 6 is red (or, under a
   control, when the control fired), which is red here. */
const balanceInChildren = want('6') && Object.keys(SPORTS).length > 1 && !process.env.SIM_CHILD;
if (balanceInChildren) {
  console.log(`6) balance: one child per sport, careers a seed ${BAL_SIZES}, ${BAL_SEEDS} seeds`);
  const t6 = Date.now();
  const { spawn } = await import('node:child_process');
  const runs = Object.keys(SPORTS).map(slug => new Promise(resolve => {
    const tmp = fs.mkdtempSync(path.join(TMP, `child-${slug}-`));
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      cwd: ROOT, env: { ...process.env, SIM_CHILD: '1', SIM_SPORTS: slug, SIM_SECTIONS: '6', TEMP: tmp, TMP: tmp, TMPDIR: tmp },
    });
    let text = '';
    child.stdout.on('data', d => { text += d; });
    child.stderr.on('data', d => { text += d; });
    child.on('close', code => resolve({ slug, code, text }));
  }));
  for (const r of await Promise.all(runs)) {
    const keep = r.text.split('\n').filter(l => /^\s{3}|FAIL|CONTROL/.test(l));
    for (const l of keep) console.log(l);
    if (r.code !== 0) fail('6', `${r.slug}: the balance child exited ${r.code}`);
  }
  console.log(`   balance ran in ${((Date.now() - t6) / 1000).toFixed(1)} s`);
}
if (want('6') && !balanceInChildren) {
  console.log(`6) balance: on against off, careers a seed ${BAL_SIZES}, ${BAL_SEEDS} seeds`);
  const t6 = Date.now();
  for (const [slug, sport] of Object.entries(SPORTS)) {
    const off = { ...sport, summer: OFF };
    const rows = { on: [], off: [] };
    for (let s = 0; s < BAL_SEEDS; s += 1) {
      for (let i = 0; i < balCareers(slug); i += 1) {
        const ci = 100000 * (s + 1) + i;
        for (const [side, sp] of [['on', sport], ['off', off]]) {
          const r = playCareer(slug, sp, ci);
          rows[side].push({ peak: r.peak, legacy: r.legacy.score, hof: r.legacy.hof ? 1 : 0, majors: majorsOf(slug, r.c), headlines: headlinesOf(slug, r.c), seasons: r.c.seasons.length });
        }
      }
    }
    const col = (side, k) => rows[side].map(x => x[k]);
    const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
    const nOn = rows.on.length, nOff = rows.off.length;
    const dPeak = mean(col('on', 'peak')) - mean(col('off', 'peak'));
    const sePeak = Math.sqrt(sd(col('on', 'peak')) ** 2 / nOn + sd(col('off', 'peak')) ** 2 / nOff);
    const pOn = mean(col('on', 'hof')), pOff = mean(col('off', 'hof'));
    const seHof = Math.sqrt(pOn * (1 - pOn) / nOn + pOff * (1 - pOff) / nOff);
    const legRel = (a, b) => median(a.map(x => x.legacy)) / median(b.map(x => x.legacy)) - 1;
    const headRel = (a, b) => (a.reduce((n, x) => n + x.headlines, 0) / a.reduce((n, x) => n + x.seasons, 0)) / (b.reduce((n, x) => n + x.headlines, 0) / b.reduce((n, x) => n + x.seasons, 0)) - 1;
    const checks = [
      ['peak OVR', dPeak, [dPeak - 1.96 * sePeak, dPeak + 1.96 * sePeak], TOL.peak, v => v.toFixed(2)],
      ['median legacy', legRel(rows.on, rows.off), bootstrap(rows.on, rows.off, legRel), TOL.legacyRel, v => `${(100 * v).toFixed(1)}%`],
      ['Hall share', 100 * (pOn - pOff), [100 * (pOn - pOff - 1.96 * seHof), 100 * (pOn - pOff + 1.96 * seHof)], TOL.hofPts, v => `${v.toFixed(2)} pts`],
      ['headline awards a season', headRel(rows.on, rows.off), bootstrap(rows.on, rows.off, headRel), TOL.headlineRel, v => `${(100 * v).toFixed(1)}%`],
    ];
    console.log(`   ${slug}: off peak ${mean(col('off', 'peak')).toFixed(2)}, legacy median ${median(col('off', 'legacy'))}, Hall ${(100 * pOff).toFixed(1)}%; on peak ${mean(col('on', 'peak')).toFixed(2)}, legacy median ${median(col('on', 'legacy'))}, Hall ${(100 * pOn).toFixed(1)}%`);
    for (const [name, d, [lo, hi], tol, f] of checks) {
      const inside = lo >= -tol && hi <= tol;
      console.log(`      ${name}: difference ${f(d)}, interval [${f(lo)}, ${f(hi)}], tolerance ${f(tol)} either way: ${inside ? 'inside' : 'OUTSIDE'}`);
      if (!inside) fail('6', `${slug} ${name}: interval [${f(lo)}, ${f(hi)}] is not inside ${f(tol)}`);
    }
    /* 6b. Round 123 and Round 915, on the loop players now play. */
    const majorsOn = col('on', 'majors');
    const ever = 100 * mean(majorsOn.map(m => (m > 0 ? 1 : 0)));
    console.log(`      6b: on the summer loop, median career majors ${median(majorsOn)}, ${ever.toFixed(1)}% ever win one, Hall ${(100 * pOn).toFixed(1)}%`);
    if (median(majorsOn) !== 0) fail('6', `${slug}: on the summer loop the median career wins ${median(majorsOn)} majors (Round 123: it must win none)`);
    if (ever > 25) fail('6', `${slug}: ${ever.toFixed(1)}% of summer careers win a major (Round 123 ceiling 25)`);
    if (100 * pOn < 5) fail('6', `${slug}: the Hall takes ${(100 * pOn).toFixed(1)}% of summer careers (Round 915 floor 5)`);
  }
  console.log(`   balance ran in ${((Date.now() - t6) / 1000).toFixed(1)} s`);
}

/* ─── 8. agreement with the flagship's own copy ─────────────────────────── */
if (want('8')) {
  console.log('8) agreement: careerEventDeck.ts against soccerCareerEngine.ts on 10,000 cases');
  const { ledgerKey, cooldownOf, onCooldown } = B.ledger;
  const { eventLedgerKey, eventCooldown, isEventOnCooldown, EVENT_COOLDOWN_DEFAULT } = B.soccer;
  let s = 0x1038;
  const r = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(r() * a.length)];
  const cats = Object.keys(EVENT_COOLDOWN_DEFAULT);
  const cooldowns = [undefined, 0, 1, 2, 3, 99, 1.7, -1, NaN, Infinity, '2', null];
  let bad = 0, onTrue = 0, example = '';
  for (let i = 0; i < 10000; i += 1) {
    const e = { id: pick([1, 2, 17, 200, 'lifeA_x', 'press']), category: pick(cats), story: pick([undefined, '', 'wax', 'pigeon']), cooldown: pick(cooldowns) };
    const season = 2000 + Math.floor(r() * 30);
    const ledger = {};
    for (let k = 0; k < 4; k += 1) ledger[pick(['1', '2', '17', '200', 'lifeA_x', 'story:wax', 'story:pigeon'])] = pick([season, season - 1, season - 2, season - 3, season - 100, 'x', NaN]);
    const state = { eventLastFired: ledger, seasons: [{ year: season }] };
    const fallback = EVENT_COOLDOWN_DEFAULT[e.category] ?? 1;
    const a = [ledgerKey(e), cooldownOf(e, fallback), onCooldown(ledger, e, season, fallback)];
    const b = [eventLedgerKey(e), eventCooldown(e), isEventOnCooldown(state, e, season)];
    if (a[2]) onTrue += 1;
    if (JSON.stringify(a) !== JSON.stringify(b)) { bad += 1; example ||= `${JSON.stringify(e)} at ${season}: shared ${JSON.stringify(a)}, soccer ${JSON.stringify(b)}`; }
  }
  console.log(`   10000 cases, ${onTrue} on cooldown, ${bad} disagree${example ? ` (first ${example})` : ''}`);
  if (onTrue < 1000) fail('8', `only ${onTrue} cases were on cooldown, so the comparison was hardly tested`);
  if (bad) fail('8', `${bad} cases disagree`);
}

/* ─── 9. the real board, through Vitest ──────────────────────────────────── */
if (want('9')) {
  console.log('9) board: src/test/usCareerSummer.test.tsx on the real board');
  const VITEST = path.join(path.dirname(createRequire(path.join(ROOT, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  let copy = '';
  if (CONTROL === 'noresume') {
    const [abs, src] = [...rewrites.entries()][0];
    copy = path.join(ROOT, 'src/test', '__control_usSummer_noresume.tsx');
    fs.writeFileSync(copy, src);
    process.on('exit', () => { try { fs.rmSync(copy, { force: true }); } catch { /* best effort */ } });
    Object.assign(env, { US_BOARD_CONTROL_ALIAS: '@/components/us-career/UsCareerBoard', US_BOARD_CONTROL_FILE: copy });
    if (!abs.endsWith('UsCareerBoard.tsx')) { console.error('control noresume: the rewrite is not the board'); process.exit(1); }
  }
  const out = path.join(TMP, 'vitest.json');
  const v = spawnSync(process.execPath, [VITEST, 'run', 'src/test/usCareerSummer.test.tsx', '--reporter=json', `--outputFile.json=${out}`], { cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
  const rows = fs.existsSync(out) ? (JSON.parse(fs.readFileSync(out, 'utf8')).testResults || []).flatMap(f => f.assertionResults || []) : [];
  const passed = rows.filter(a => a.status === 'passed').length, failedRows = rows.filter(a => a.status === 'failed');
  console.log(`   Vitest exit ${v.status}, ${passed} passed, ${failedRows.length} failed${failedRows.length ? `: ${failedRows.slice(0, 4).map(a => a.title).join('; ')}` : ''}`);
  if (v.status !== 0) fail('9', `Vitest exited ${v.status}`);
  if (passed < 32) fail('9', `only ${passed} of the 32 board tests passed`);
}

/* ─── verdict ────────────────────────────────────────────────────────────── */
if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  if (failedSections.has(target)) { console.log(`CONTROL ${CONTROL} FIRED: section ${target} went red, as it must.`); process.exit(1); }
  console.log(`CONTROL ${CONTROL} DID NOT FIRE: section ${target} stayed green.`);
  process.exit(0);
}
if (failures) { console.error(`simUsCareerSummer: ${failures} failure(s) in sections ${[...failedSections].join(', ')}`); process.exit(1); }
console.log(`simUsCareerSummer: green. Sections ${[...SECTIONS].join(', ')} held${needMain ? ` over ${CAREERS} careers a sport` : ''}.`);
