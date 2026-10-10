/**
 * Round 521 harness: the rivalry events, lifted from Soccer Career into
 * src/lib/careerRivalryEvents.ts and bound to the NFL career in
 * src/lib/nflCareerRivalryEvents.ts.
 *
 * His 2026-08-28 backlog row "Bring the Soccer Career depth to the NFL
 * career, then the other US careers" still marked two things open:
 * interactive rivalry events, and an inbox (that one is
 * scripts/simCareerInbox.mjs). This file is the rivalry events half, and it
 * carries the single most important gate in this round: the NFL rival's
 * name can never collide with a real player, checked here as its own
 * explicit section with its own printed verdict, not merely assumed from an
 * existing green run elsewhere.
 *
 * SECTIONS
 *
 *   1. Source. careerRivalryEvents.ts is the only home for rivalryEventPool,
 *      rollRivalryEvent, forcedRetirementEvent and applyRivalryEvent, and
 *      the trigger's own rule (the coin flip, the no-repeat filter, the
 *      forced beat on retirement) lives nowhere else, comments stripped.
 *   2. Soccer unchanged. A hand written golden reimplementation of the
 *      exact pre-Round-521 getRivalryEvents and applyRivalryEvent bodies
 *      (all eighteen beats), run against the real careerRivalryEvents.ts
 *      functions bound through SOCCER_RIVALRY_EVENTS, across hundreds of
 *      randomised player-and-rival fixtures. Same facts in, same pool and
 *      same mutation out.
 *   3. Soccer end to end. A real career driven through initCareer and
 *      advanceProSeason for enough years to draft a rival and roll beats,
 *      through the real dismissRivalryEvent, proving the pending slot, the
 *      no-repeat rule and the forced retirement beat are all still wired.
 *   4. The NFL binding: every one of the twenty three beats reachable and
 *      correct against constructed fixtures (a badge-style coverage proof,
 *      since natural play cannot be trusted to roll every gate on its own),
 *      plus real simulated careers proving the tick actually fires and the
 *      forced retirement beat shows up when the rival hangs it up.
 *   5. THE INVENTED-NAME COLLISION GUARD. careerRival.ts's FIRST and LAST
 *      banks (the NFL, NBA, MLB and NHL rival, all four sports use the same
 *      one), enumerated in full against a freshly harvested real-name
 *      universe, and the live draftRival function sampled thousands of
 *      times and checked the same way. Zero collisions required, printed
 *      either way. Covers MLB structurally already: the bank is shared
 *      across every RivalSport value, not per sport, so Round 525's MLB
 *      slice needs nothing added here.
 *   6. The MLB binding, Round 525's slice: the same two proofs section 4
 *      gives the NFL, against src/lib/mlbCareerRivalryEvents.ts's own
 *      seventeen beats, gated on what a baseball rival's save actually
 *      tracks (the same CareerRival shape the NFL, NBA and NHL rivals share).
 *      A measured pending-beat RATE over many simulated careers, never a
 *      weak "ever showed one beat" binary signal, matching the fix Round
 *      524's review made to section 4 below.
 *   7. The NBA binding, Round 525's slice: same proof shape as section 6.
 *   8. The NHL binding, Round 525's slice: same proof shape as section 6.
 *   9. Round 988: the 24 beats Rounds 917 to 920 added, words against
 *      effects, run from each sport's section (see beatWords).
 *
 * NEGATIVE CONTROLS, RIVALRY_CONTROL=...
 *
 *   deaf       careerRivalryEvents.ts's rivalryEventPool is patched to
 *              ignore the descriptor's own table and read an empty one
 *              instead, which is exactly "the descriptor injection
 *              stripped": both soccer and the NFL must then never produce a
 *              pending event again, which sections 2, 3 and 4 must catch.
 *   collision  a copy of careerRival.ts has "Tom" spliced into FIRST and
 *              "Brady" spliced into LAST, a real collision by construction
 *              (Tom Brady, src/data/nflCareerPlayers.ts). Section 5 must
 *              name it.
 *   beatlie    (Round 988) NFL beat 223 takes morale -5 under "Morale -2":
 *              section 9, the new beats' words, must name it.
 *   beatheat   (Round 988) NHL beat 319 heats the rivalry while its line
 *              says nothing of it: section 9 must name it.
 *   coin306    (Round 1112) NBA beat 306 decides who made the All-Star
 *              roster on a coin again instead of the two seasons: section
 *              7's All-Star check must name it. Since Round 1149 the swap
 *              is in the shared builder (factBeat), so every sport whose
 *              beat is built on it must name it too.
 *   oldcard    (Round 1149) the tap stops reading the card it was shown, so
 *              a card dealt on the old coin is paid out on today's facts:
 *              the fact beat check's old card half must name it.
 *
 *   Each control asserts the text it rewrites is present first, so a
 *   control that rewrites a string the file does not contain cannot pass
 *   silently for the wrong reason.
 *
 * Run: node scripts/simCareerRivalryEvents.mjs
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { US_CAREER_BOARD, allWrapperProblems } from './lib/usCareerFiles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.RIVALRY_CONTROL || '';
const CONTROLS = ['deaf', 'collision', 'beatlie', 'beatheat', 'coin306', 'oldcard'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`RIVALRY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const norm = s => s.split('\r\n').join('\n');
const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ─── Round 988: the 24 beats of Rounds 917 to 920, words against effects ──
   Sections 4, 6, 7 and 8 prove each beat is reachable and moves something;
   they never compared what the player reads with what moved. Each of the
   new beats (six a sport) is applied from its own gate fixture, mid range,
   at rolls 0.25, 0.4999, 0.5001 and 0.75, rated above the rival and below
   wherever its gate still holds that way (its own fixture as built when it
   holds neither way). What the player reads is the line the beat pushes
   when it pushes one, else its consequence: the numbers must equal the move,
   "intensifies" or "heats up" must raise the rivalry, "softens" lower it,
   no such word means no change, nothing it does not name may move, and a
   "50/50" beat must land its two ends either side of 0.5. This check lived
   in simNflCareer (the NFL six) and simNbaCareer R2 (the NBA six); the MLB
   and NHL six had none. Measured 2026-10-03: 160 applies (deterministic),
   the floor is 150.
   Controls: beatlie (NFL 223 takes morale -5 under "Morale -2") and beatheat
   (NHL 319 heats the rivalry without saying so). Called from each sport's
   section before its own gate loop, which mutates the fixtures it applies. */
const NEW_BEATS = {
  NFL: [218, 219, 220, 221, 222, 223], MLB: [218, 219, 220, 221, 222, 223],
  NBA: [318, 319, 320, 321, 322, 323], NHL: [318, 319, 320, 321, 322, 323],
};
const BEAT_APPLIES_MIN = 150;
let beatApplies = 0;
const jclone = o => JSON.parse(JSON.stringify(o));
function beatNumbers(text) {
  const out = { morale: 0, fanbase: 0, health: 0, rating: 0, netWorth: 0 };
  for (const m of text.matchAll(/\b(morale|fanbase|health|rating) ([+-]\d+)\b/gi)) out[m[1].toLowerCase()] += Number(m[2]);
  for (const m of text.matchAll(/\bnet worth ([+-]?\d+(?:\.\d+)?)M/gi)) out.netWorth += Number(m[1]);
  out.netWorth = Math.round(out.netWorth * 100) / 100;
  return out;
}
const beatKey = v => ['morale', 'fanbase', 'health', 'rating', 'netWorth'].map(f => `${f}:${v[f]}`).join('|');
function beatWords(label, defs, gates) {
  for (const id of NEW_BEATS[label]) {
    const def = defs.find(d => d.id === id);
    if (!def) { fail(`${label} beat ${id} is missing from its table`); continue; }
    const [p0, r0] = gates[id] ?? [];
    if (!p0) { fail(`${label} beat ${id} has no gate fixture for the words check`); continue; }
    const mid = { morale: 50, fanbase: 60, health: 60, rivalryIntensity: 50 };
    let homes = [true, false]
      .map(above => [{ ...jclone(p0), ...mid, ovr: above ? 86 : 80 }, { ...jclone(r0), ovr: above ? 80 : 86 }])
      .filter(([p, r]) => def.when(p, r));
    if (!homes.length) homes = [[{ ...jclone(p0), ...mid }, jclone(r0)]];
    let applies = 0;
    for (const [p1, r1] of homes) {
      const ends = [];
      for (const roll of [0.25, 0.4999, 0.5001, 0.75]) {
        const s = jclone(p1), before = jclone(p1);
        const lines = [];
        def.apply(s, jclone(r1), () => roll, l => lines.push(l));
        beatApplies++; applies++;
        /* Round 1149: a fact beat's promise is read off the two facts, like its words. */
        const promise = typeof def.consequence === 'function' ? def.consequence(p1, r1) : def.consequence;
        const read = lines.length ? lines.join(' ') : String(promise);
        const moved = {
          morale: s.morale - before.morale, fanbase: s.fanbase - before.fanbase, health: s.health - before.health,
          rating: s.ovr - before.ovr, netWorth: Math.round(((s.netWorth ?? 0) - (before.netWorth ?? 0)) * 100) / 100,
        };
        if (beatKey(beatNumbers(read)) !== beatKey(moved)) fail(`${label} beat ${id}: the player reads "${read}" and the save moved [${beatKey(moved)}]`);
        const heat = (s.rivalryIntensity ?? 0) - (before.rivalryIntensity ?? 0);
        const heatWord = /intensif|heats up/i.test(promise) ? 1 : /soften/i.test(promise) ? -1 : 0;
        if (Math.sign(heat) !== heatWord) fail(`${label} beat ${id}: "${promise}" and the rivalry moved ${heat}`);
        const others = o => { const x = { ...o }; for (const k of ['morale', 'fanbase', 'health', 'ovr', 'netWorth', 'rivalryIntensity']) delete x[k]; return JSON.stringify(x); };
        if (others(s) !== others(before)) fail(`${label} beat ${id}: moved something its words do not name`);
        ends.push(beatKey(moved));
      }
      if (typeof def.consequence === 'string' && /50\/50/.test(def.consequence) && ends[1] === ends[2]) fail(`${label} beat ${id}: sold as 50/50 and rolls of 0.4999 and 0.5001 land the same end`);
    }
    if (applies < 4) fail(`${label} beat ${id}: only ${applies} applies made`);
  }
}

/* ─── Round 1149: a fact beat, checked the same way in every sport ──────────
   factBeat (careerRivalryEvents.ts) builds a beat from cards, each supported
   by facts already on the save. `never` lists fixtures the beat must not be
   dealt on; `deal` lists one fixture a card with what it must read (says),
   must not claim (silent, for a sport that knows nothing of the rival's
   roster), promise (reads), move, and push into the feed (told). Each dealt
   card is applied at four rolls through the real applyRivalryEvent: nothing
   may be drawn, the move must be exactly the promise, nothing unnamed may
   move. Then the OLD CARD: the same facts with the card a save from before
   would be sitting on (its promise reads "50/50 outcome"), which must move
   nothing, draw nothing and push only its title. And the promises of one
   beat's cards must all differ, because the promise is how the tap finds
   the card it was shown. Deterministic. Controls: coin306 (the tap picks a
   card by a draw) and oldcard (the tap stops reading the card it was shown). */
const OLD_COIN_PROMISE = '50/50 outcome';
let factCardsApplied = 0;
function factBeatCheck(label, defs, id, { never = [], deal }) {
  const def = defs.find(d => d.id === id);
  if (!def) { fail(`${label} beat ${id} is missing from its table`); return 0; }
  for (const n of never) if (def.when(n.p, n.r)) fail(`${label} beat ${id} is dealt ${n.name}`);
  const zero = { morale: 0, fanbase: 0, health: 0, rating: 0, netWorth: 0 };
  const movedOf = (s, p) => ({
    morale: s.morale - p.morale, fanbase: s.fanbase - p.fanbase, health: (s.health ?? 0) - (p.health ?? 0),
    rating: s.ovr - p.ovr, netWorth: Math.round(((s.netWorth ?? 0) - (p.netWorth ?? 0)) * 100) / 100,
  });
  const others = o => { const x = { ...o }; for (const k of ['morale', 'fanbase', 'health', 'ovr', 'netWorth', 'rivalryIntensity']) delete x[k]; return JSON.stringify(x); };
  const promises = new Set();
  let dealt = 0;
  for (const k of deal) {
    const built = rivalryMod.rivalryEventPool(k.p, k.r, defs).find(e => e.id === id);
    if (!built) { fail(`${label} beat ${id} is not dealt ${k.name}`); continue; }
    dealt += 1;
    promises.add(built.consequence);
    if (!k.says.test(built.description)) fail(`${label} beat ${id} (${k.name}) reads "${built.description}"`);
    if (k.silent && k.silent.test(built.description)) fail(`${label} beat ${id} (${k.name}) claims what the save cannot know: "${built.description}"`);
    if (built.consequence !== k.reads) fail(`${label} beat ${id} (${k.name}) promises "${built.consequence}", expected "${k.reads}"`);
    for (const roll of [0.25, 0.4999, 0.5001, 0.75]) {
      const s = jclone(k.p); const lines = []; let draws = 0;
      rivalryMod.applyRivalryEvent(s, jclone(k.r), built, defs, () => { draws += 1; return roll; }, l => lines.push(l));
      factCardsApplied += 1;
      const moved = movedOf(s, k.p);
      if (draws !== 0) fail(`${label} beat ${id} (${k.name}) drew ${draws} times: it has no coin to flip`);
      if (beatKey(moved) !== beatKey({ ...zero, ...k.move })) fail(`${label} beat ${id} (${k.name}, roll ${roll}) promised "${built.consequence}" and moved [${beatKey(moved)}]`);
      if (beatKey(beatNumbers(built.consequence)) !== beatKey(moved)) fail(`${label} beat ${id}: the consequence "${built.consequence}" does not read as what moved`);
      const heat = (s.rivalryIntensity ?? 0) - (k.p.rivalryIntensity ?? 0);
      const heatWord = /intensif|heats up/i.test(built.consequence) ? 1 : /soften/i.test(built.consequence) ? -1 : 0;
      if (Math.sign(heat) !== heatWord) fail(`${label} beat ${id} (${k.name}): "${built.consequence}" and the rivalry moved ${heat}`);
      if (!lines.some(l => k.told.test(l))) fail(`${label} beat ${id} (${k.name}) pushed "${lines.join(' | ')}"`);
      if (k.silent && lines.some(l => k.silent.test(l))) fail(`${label} beat ${id} (${k.name}) pushed a claim the save cannot know: "${lines.join(' | ')}"`);
      if (others(s) !== others(k.p)) fail(`${label} beat ${id} moved something its words do not name`);
    }
    {
      const s = jclone(k.p); const lines = []; let draws = 0;
      const oldCard = { ...built, title: 'Ballot Squeeze', description: 'a card dealt before the beat left its coin', consequence: OLD_COIN_PROMISE };
      rivalryMod.applyRivalryEvent(s, jclone(k.r), oldCard, defs, () => { draws += 1; return 0.25; }, l => lines.push(l));
      if (draws !== 0) fail(`${label} beat ${id} (${k.name}): resolving a card dealt on the old coin drew ${draws} times`);
      if (JSON.stringify(s) !== JSON.stringify(k.p)) fail(`${label} beat ${id} (${k.name}): a card that promised "${OLD_COIN_PROMISE}" moved the save (${beatKey(movedOf(s, k.p))}), paid out on today's facts`);
      if (lines.length !== 1 || !lines[0].includes(oldCard.title)) fail(`${label} beat ${id} (${k.name}): the old card pushed "${lines.join(' | ')}", expected its title and nothing else`);
    }
  }
  if (promises.size !== dealt) fail(`${label} beat ${id}: ${dealt} cards dealt and ${promises.size} different promises, and the promise is how the tap finds its card`);
  return dealt;
}

/* ─── Round 1149: the roster beat of a sport that knows only the player's own season ───
   The MLB, NHL and NFL rivals do not play their season on the player's stat line yet (only the NBA rival
   does), so their roster beat is dealt on one fact: the award word the engine wrote on the player's own last
   season. This builds that beat's fixtures the same way for each of them and hands them to factBeatCheck:
   never dealt on a save with no season, the card for making it dealt whatever the two ratings are, the card
   for missing it (a sport that has one) only while both are rated 80 or better, and both read off the LAST
   season (each fixture's season before it holds the opposite fact). `silent` is what no card may claim: that
   the rival is or is not on a roster, or that one of you made it over the other. */
function ownRosterBeatCheck(label, defs, id, { p, r, award, rivalName, made, missed }) {
  const season = (has, year = 2030) => ({ year, awards: has ? [award] : [] });
  const silent = new RegExp(`${rivalName} (is|made|did|was)\\b|over (you|${rivalName})`);
  const never = [{ name: 'on a save with no season played (both rated 90)', p: p({ ovr: 90, seasons: [] }), r: r({ ovr: 90 }) }];
  const deal = [{ name: 'you made it (both rated 70, left off the year before)', p: p({ ovr: 70, seasons: [season(false, 2029), season(true)] }), r: r({ ovr: 70 }), silent, ...made }];
  if (missed) {
    never.push({ name: 'when you missed it and you are rated 79', p: p({ ovr: 79, seasons: [season(false)] }), r: r({ ovr: 90 }) });
    never.push({ name: 'when you missed it and he is rated 79', p: p({ ovr: 90, seasons: [season(false)] }), r: r({ ovr: 79 }) });
    deal.push({ name: 'you missed it (both rated 85, on it the year before)', p: p({ ovr: 85, seasons: [season(true, 2029), season(false)] }), r: r({ ovr: 85 }), silent, ...missed });
  } else {
    never.push({ name: 'when you missed it (both rated 90, on it the year before)', p: p({ ovr: 90, seasons: [season(true, 2029), season(false)] }), r: r({ ovr: 90 }) });
  }
  const dealt = factBeatCheck(label, defs, id, { never, deal });
  console.log(`   the roster beat (${id}, read off your own season's "${award}"): ${dealt} of ${deal.length} cards dealt and applied at 4 rolls each, ${never.length} fixtures it must stay shut on, never on a coin, never a word on the rival's roster, and a card from the old coin resolves with no effect`);
  if (dealt < deal.length) fail(`${label} beat ${id}: only ${dealt} of ${deal.length} cards were dealt`);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerrivalry-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;

/* ─── controls that patch the shared files ────────────────────────────────── */

const RIVALRY_SRC = 'src/lib/careerRivalryEvents.ts';
const POOL_FILTER = 'return defs\n    .filter(d => d.when(p, r))';
const DEAF_FILTER = 'return []\n    .filter(d => d.when(p, r))';

const redirects = {};
function patchedCopy(rel, from, to, label) {
  const raw = readSrc(rel);
  if (!raw.includes(from)) {
    console.error(`control ${label}: ${rel} does not contain ${JSON.stringify(from)}, so this control would prove nothing`);
    process.exit(1);
  }
  const out = path.join(tmpDir, path.basename(rel));
  fs.writeFileSync(out, raw.replace(from, to));
  return out;
}
let collisionContents = null;
const CAREER_RIVAL_PATH = path.join(ROOT, 'src/lib/careerRival.ts');
if (CONTROL === 'deaf') redirects.careerRivalryEvents = patchedCopy(RIVALRY_SRC, POOL_FILTER, DEAF_FILTER, 'deaf');
if (CONTROL === 'collision') {
  const raw = readSrc('src/lib/careerRival.ts');
  const firstFrom = "const FIRST = [\n  'Marcus'";
  const lastFrom = "const LAST = [\n  'Whitaker'";
  if (!raw.includes(firstFrom) || !raw.includes(lastFrom)) {
    console.error('control collision: careerRival.ts FIRST/LAST banks do not open the way this control expects, so it would prove nothing');
    process.exit(1);
  }
  /* careerRival.ts imports careerVariance.ts, so a copy dropped in a temp
     directory (the trick careerMoney.ts and careerSocial.ts get away with,
     since they import nothing) would fail to resolve its own import. This
     patches the CONTENT esbuild loads for the real path instead, so the
     file's own relative imports keep resolving normally. */
  collisionContents = raw
    .replace(firstFrom, "const FIRST = [\n  'Tom', 'Marcus'")
    .replace(lastFrom, "const LAST = [\n  'Brady', 'Whitaker'");
}
/* Round 988: two controls for the new beats' words check, each patching the
   content esbuild loads for one sport's beat table (the file keeps its own
   relative imports). */
const BEAT_CONTROLS = {
  beatlie: { /* NFL 223 takes morale -5 under "Morale -2" */
    file: 'src/lib/nflCareerRivalryEvents.ts',
    from: '      s.morale = clamp(s.morale - 2, 0, 100);\n      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 6, 0, 100);',
    to: '      s.morale = clamp(s.morale - 5, 0, 100);\n      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 6, 0, 100);',
  },
  coin306: { /* a fact beat back on a coin: the tap picks a card by a draw, not the card the player was shown.
                Round 1149 moved the beat onto the shared builder, so this one swap breaks every sport on it. */
    file: 'src/lib/careerRivalryEvents.ts',
    from: '      const card = spec.cards.find(k => (!event || k.consequence === event.consequence) && k.when(s, r));',
    to: '      const card = spec.cards[Math.floor(_rng() * spec.cards.length)];',
  },
  oldcard: { /* (Round 1149) the tap no longer looks at the card it was shown: a card dealt before the beat
                moved off its coin ("50/50 outcome") is then paid out as whatever today's facts say */
    file: 'src/lib/careerRivalryEvents.ts',
    from: '      const card = spec.cards.find(k => (!event || k.consequence === event.consequence) && k.when(s, r));',
    to: '      const card = spec.cards.find(k => k.when(s, r));',
  },
  beatheat: { /* NHL 319 heats the rivalry and its line says nothing of it */
    file: 'src/lib/nhlCareerRivalryEvents.ts',
    from: '      s.morale = clamp(s.morale - 4, 0, 100);\n      s.fanbase = clamp(s.fanbase + 2, 0, 100);\n    },\n  },\n  {\n    id: 320,',
    to: '      s.morale = clamp(s.morale - 4, 0, 100);\n      s.fanbase = clamp(s.fanbase + 2, 0, 100);\n      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100);\n    },\n  },\n  {\n    id: 320,',
  },
};
let beatPatch = null;
if (BEAT_CONTROLS[CONTROL]) {
  const ctl = BEAT_CONTROLS[CONTROL];
  const raw = readSrc(ctl.file);
  if (raw.split(ctl.from).length !== 2) {
    console.error(`control ${CONTROL}: ${ctl.file} does not contain its string exactly once, so this control would prove nothing`);
    process.exit(1);
  }
  beatPatch = { path: path.join(ROOT, ctl.file), contents: raw.replace(ctl.from, ctl.to) };
}
if (CONTROL) console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);

const redirectPlugin = {
  name: 'rivalry-control',
  setup(b) {
    b.onResolve({ filter: /careerRivalryEvents(\.ts)?$/ }, () => (redirects.careerRivalryEvents ? { path: redirects.careerRivalryEvents } : undefined));
    b.onLoad({ filter: /[cC]areerRivalryEvents\.ts$/ }, args => {
      if (!beatPatch || path.resolve(args.path) !== path.resolve(beatPatch.path)) return undefined;
      return { contents: beatPatch.contents, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
    b.onLoad({ filter: /careerRival\.ts$/ }, args => {
      if (!collisionContents || args.path !== CAREER_RIVAL_PATH) return undefined;
      return { contents: collisionContents, loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  },
};

/* ─── bundle the real engines ─────────────────────────────────────────────── */

const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'rivalryEntry.mjs');
const BUNDLE = path.join(tmpDir, 'rivalry.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${R}/src/lib/soccerCareerEngine.ts');
export const rivalryMod = await import('${R}/src/lib/careerRivalryEvents.ts');
export const careerRival = await import('${R}/src/lib/careerRival.ts');
export const nfl = await import('${R}/src/lib/nflMyCareer.ts');
export const nflRivalry = await import('${R}/src/lib/nflCareerRivalryEvents.ts');
export const mlb = await import('${R}/src/lib/mlbMyCareer.ts');
export const mlbRivalry = await import('${R}/src/lib/mlbCareerRivalryEvents.ts');
export const nba = await import('${R}/src/lib/nbaMyCareer.ts');
export const nbaRivalry = await import('${R}/src/lib/nbaCareerRivalryEvents.ts');
export const nhl = await import('${R}/src/lib/nhlMyCareer.ts');
export const nhlRivalry = await import('${R}/src/lib/nhlCareerRivalryEvents.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [redirectPlugin], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const { soccer, rivalryMod, careerRival, nfl, nflRivalry, mlb, mlbRivalry, nba, nbaRivalry, nhl, nhlRivalry } = B;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Source: one module, imported by both careers, copied by neither
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('1) Source: careerRivalryEvents.ts is the only home for the rule');
{
  function stripComments(t) {
    return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
  }
  function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  const code = new Map();
  for (const p of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, p).split(path.sep).join('/');
    code.set(rel, stripComments(norm(fs.readFileSync(p, 'utf8'))));
  }
  const RULES = [
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the pool builder', re: /export function rivalryEventPool\b/ },
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the season roll, no repeat', re: /\.filter\(e => e\.id !== lastId\)/ },
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the forced retirement lookup', re: /export function forcedRetirementEvent\b/ },
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the apply-and-log function', re: /export function applyRivalryEvent\b/ },
    /* Round 1149: the fact beat builder and the season view the ticks hand the roll. */
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the fact beat builder', re: /export function factBeat\b/ },
    { home: 'src/lib/careerRivalryEvents.ts', what: 'the season view a tick rolls on', re: /seasons: \[\.\.\.c\.seasons, season\]/ },
  ];
  for (const rule of RULES) {
    if (!rule.re.test(code.get(rule.home) ?? '')) fail(`${rule.what} is not in ${rule.home}, so the fingerprint is stale and this check proves nothing`);
    for (const [rel, text] of code) {
      if (rel === rule.home) continue;
      if (rule.re.test(text)) fail(`${rel} carries a private copy of ${rule.what} (${rule.re})`);
    }
  }
  const IMPORTS = [
    { rel: 'src/lib/soccerCareerEngine.ts', re: /from\s+["']\.\/careerRivalryEvents["']/, what: 'the soccer engine binds careerRivalryEvents' },
    { rel: 'src/lib/nflCareerRivalryEvents.ts', re: /from\s+["']\.\/careerRivalryEvents["']/, what: 'the NFL binding binds careerRivalryEvents' },
    { rel: 'src/lib/nflMyCareer.ts', re: /from\s+["']\.\/nflCareerRivalryEvents["']/, what: 'the NFL engine runs the rivalry tick' },
    { rel: 'src/lib/nflCareerSport.ts', re: /from\s+["']@\/lib\/nflCareerRivalryEvents["']/, what: 'the NFL board binding hands the board its rivalry beats' },
    { rel: 'src/lib/mlbCareerRivalryEvents.ts', re: /from\s+["']\.\/careerRivalryEvents["']/, what: 'the MLB binding binds careerRivalryEvents' },
    { rel: 'src/lib/mlbMyCareer.ts', re: /from\s+["']\.\/mlbCareerRivalryEvents["']/, what: 'the MLB engine runs the rivalry tick' },
    { rel: 'src/lib/mlbCareerSport.ts', re: /from\s+["']@\/lib\/mlbCareerRivalryEvents["']/, what: 'the MLB board binding hands the board its rivalry beats' },
    { rel: 'src/lib/nbaCareerRivalryEvents.ts', re: /from\s+["']\.\/careerRivalryEvents["']/, what: 'the NBA binding binds careerRivalryEvents' },
    { rel: 'src/lib/nbaMyCareer.ts', re: /from\s+["']\.\/nbaCareerRivalryEvents["']/, what: 'the NBA engine runs the rivalry tick' },
    { rel: 'src/lib/nbaCareerSport.ts', re: /from\s+["']@\/lib\/nbaCareerRivalryEvents["']/, what: 'the NBA board binding hands the board its rivalry beats' },
    { rel: 'src/lib/nhlCareerRivalryEvents.ts', re: /from\s+["']\.\/careerRivalryEvents["']/, what: 'the NHL binding binds careerRivalryEvents' },
    { rel: 'src/lib/nhlMyCareer.ts', re: /from\s+["']\.\/nhlCareerRivalryEvents["']/, what: 'the NHL engine runs the rivalry tick' },
    { rel: 'src/lib/nhlCareerSport.ts', re: /from\s+["']@\/lib\/nhlCareerRivalryEvents["']/, what: 'the NHL board binding hands the board its rivalry beats' },
  ];
  for (const imp of IMPORTS) {
    if (!imp.re.test(code.get(imp.rel) ?? '')) fail(`${imp.what}: no import found in ${imp.rel}`);
  }
  /* Round 900: the four boards are one. The binding importing its rivalry
     module proves nothing unless the shared board calls it and each sport's
     page is on that board, so both halves are checked here. */
  const BOARD_DOES = [
    { re: /sport\.dismissRivalryEvent\(/, what: 'dismisses the pending beat through the sport binding' },
    { re: /sport\.resolveRivalryChoice\(/, what: 'resolves a rival choice through the sport binding' },
    { re: /<RivalryEventCard\b/, what: 'draws the rivalry beat card' },
    { re: /<RivalryChoiceCard\b/, what: 'draws the rival choice card' },
  ];
  for (const b of BOARD_DOES) {
    if (!b.re.test(code.get(US_CAREER_BOARD) ?? '')) fail(`the shared US career board no longer ${b.what} (${US_CAREER_BOARD})`);
  }
  for (const why of allWrapperProblems(ROOT)) fail(why);
  console.log(`   ${RULES.length} rule fingerprints checked, ${IMPORTS.length} bindings confirmed`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. Soccer unchanged: golden reimplementation vs the real lifted functions
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('2) Soccer unchanged: same facts in, same pool and same mutation out');

/** The exact pre-Round-521 getRivalryEvents body. */
function goldenPool(state) {
  if (!state.rival) return [];
  const r = state.rival;
  const events = [];
  if (r.ballonDors > 0) events.push({ id: 101, emoji: '🏅', title: "Rival Wins Ballon d'Or", description: `${r.name} won the Ballon d'Or. You finished 3rd.`, consequence: 'Motivation boost: stats +1 next season' });
  events.push({ id: 102, emoji: '🏠', title: 'Transfer Battle', description: `You and ${r.name} both want to sign for the same club. The club chose your rival.`, consequence: 'Morale -5' });
  events.push({ id: 103, emoji: '🤝', title: 'Rival Shows Respect', description: `${r.name} publicly says he respects you as the best player in the world.`, consequence: 'Popularity +5, Morale +5' });
  events.push({ id: 104, emoji: '⚽', title: 'Head to Head Victory!', description: `In a head-to-head match you scored twice against ${r.name}'s team.`, consequence: 'Popularity +5, Confidence boost' });
  if (r.retired) events.push({ id: 105, emoji: '👋', title: 'Rival Retires', description: `${r.name} announces retirement. He calls you the greatest rival of his career.`, consequence: 'Legacy +10, End of an era' });
  if (state.internationalCareer) events.push({ id: 106, emoji: '🇺🇳', title: 'National Team Battle', description: `Both you and ${r.name} are on the same national team. The manager must pick one to start.`, consequence: '50/50 outcome' });
  if (r.championsLeagues > 0) events.push({ id: 107, emoji: '⭐', title: 'Rival Wins Champions League', description: `${r.name} wins the Champions League. You were eliminated in the semis.`, consequence: 'Morale -5, Motivation boost' });
  if (state.overall > r.overall && state.overall - r.overall >= 2) events.push({ id: 108, emoji: '📈', title: 'Surpassed Your Rival!', description: `For the first time in your career, your overall rating (${state.overall}) has surpassed ${r.name}'s (${r.overall}).`, consequence: 'Morale +10, Legacy boost' });
  if (r.club === state.currentClub) events.push({ id: 109, emoji: '😬', title: 'Your Rival Is Now Your Teammate', description: `${r.name} just signed for YOUR club. The first training session is the most watched non-match footage of the year.`, consequence: 'The feud cools, the cameras multiply' });
  events.push({ id: 110, emoji: '🤬', title: 'Tunnel Bust-Up', description: `Cameras catch you and ${r.name} chest to chest in the tunnel after a bad-blood derby. Lip readers are having the week of their lives.`, consequence: 'Rivalry intensifies, the league schedules you for prime time' });
  if (r.careerGoals >= 300) events.push({ id: 111, emoji: '🎯', title: 'The Chase', description: `${r.name} just passed 300 career goals. Every broadcast now shows your tallies side by side in real time.`, consequence: 'Motivation surges: +1 Shooting next season' });
  if (r.nationality === state.nationality) events.push({ id: 112, emoji: '💫', title: 'The Armband Snub', description: `The national team named ${r.name} captain. Your shirt number stays, the armband does not.`, consequence: 'Morale -5, motivation +2 Physical next season' });
  events.push({ id: 113, emoji: '👕', title: 'The Shirt Swap', description: `After a classic against ${r.name}, you swap shirts and embrace. The photo becomes the wallpaper of half the football internet.`, consequence: 'Popularity +8, the feud softens' });
  events.push({ id: 114, emoji: '🏥', title: 'Rival Goes Down', description: `${r.name} tears a ligament and faces a year out. You post a genuine get-well message within the hour.`, consequence: 'Integrity +5, Popularity +5, rivalry cools' });
  if (state.overall >= 88 && r.overall >= 88) events.push({ id: 115, emoji: '🐐', title: 'The GOAT Debate', description: `Every pundit panel this week ran the same segment: you or ${r.name}. Your teammates printed the losing poll and taped it to his locker room door.`, consequence: 'Popularity +5, the era has a name now' });
  if (state.popularity >= 40) events.push({ id: 116, emoji: '🏴', title: 'The Banner', description: `${r.name}'s ultras unveil a 40-meter banner mocking you before kickoff. You answer the only way that matters.`, consequence: '+1 Shooting and +1 Dribbling next season, rivalry intensifies' });
  if (state.age >= 28) events.push({ id: 117, emoji: '🎬', title: 'The Rivalry Documentary', description: `A streaming giant offers to make a series about you and ${r.name}. Both camps say yes before the call ends.`, consequence: 'Net worth +3M, Popularity +8' });
  if (state.age >= 32) events.push({ id: 118, emoji: '🤝', title: 'Testimonial Invitation', description: `${r.name} personally invites you to captain the opposition in his testimonial match. Two decades of war, one guard of honor.`, consequence: 'Integrity +8, Popularity +8, the feud becomes history' });
  return events;
}

/** The exact pre-Round-521 applyRivalryEvent body. */
function goldenApply(state, event, rng) {
  const s = { ...state, statBoostNextSeason: { ...state.statBoostNextSeason } };
  switch (event.id) {
    case 101: s.statBoostNextSeason.shooting = (s.statBoostNextSeason.shooting || 0) + 1; s.statBoostNextSeason.dribbling = (s.statBoostNextSeason.dribbling || 0) + 1; s.morale = clamp(s.morale - 5, 0, 100); break;
    case 102: s.morale = clamp(s.morale - 5, 0, 100); break;
    case 103: s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); break;
    case 104: s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); break;
    case 105: s.popularity = clamp(s.popularity + 10, 0, 100); break;
    case 106:
      if (rng() < 0.5) { s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, `🇺🇳 Manager chose you over ${s.rival?.name}!`]; }
      else { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, `🇺🇳 Manager chose ${s.rival?.name} over you.`]; }
      break;
    case 107: s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason.physical = (s.statBoostNextSeason.physical || 0) + 1; break;
    case 108: s.morale = clamp(s.morale + 10, 0, 100); break;
    case 109: s.morale = clamp(s.morale + 3, 0, 100); s.popularity = clamp(s.popularity + 5, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 10, 0, 100); break;
    case 110: s.popularity = clamp(s.popularity + 3, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 15, 0, 100); break;
    case 111: s.statBoostNextSeason.shooting = (s.statBoostNextSeason.shooting || 0) + 1; s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 5, 0, 100); break;
    case 112: s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason.physical = (s.statBoostNextSeason.physical || 0) + 2; s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100); break;
    case 113: s.popularity = clamp(s.popularity + 8, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 15, 0, 100); break;
    case 114: s.integrityBonus = s.integrityBonus + 5; s.popularity = clamp(s.popularity + 5, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 20, 0, 100); break;
    case 115: s.popularity = clamp(s.popularity + 5, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100); break;
    case 116: s.statBoostNextSeason.shooting = (s.statBoostNextSeason.shooting || 0) + 1; s.statBoostNextSeason.dribbling = (s.statBoostNextSeason.dribbling || 0) + 1; s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 10, 0, 100); break;
    case 117: s.netWorth = Math.round((s.netWorth + 3) * 100) / 100; s.popularity = clamp(s.popularity + 8, 0, 100); break;
    case 118: s.integrityBonus = s.integrityBonus + 8; s.popularity = clamp(s.popularity + 8, 0, 100); s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) - 25, 0, 100); break;
  }
  s.events = [...s.events, `${event.emoji} ${event.title}`];
  return s;
}

function fixture(seed) {
  const rng = mulberry32(seed);
  const nations = ['England', 'France', 'Spain', 'Brazil', 'Nigeria'];
  const nat = nations[Math.floor(rng() * nations.length)];
  const clubs = ['Everton', 'Ajax', 'Real Madrid', 'Boca Juniors'];
  const club = clubs[Math.floor(rng() * clubs.length)];
  const sameClub = rng() < 0.3;
  const rival = {
    name: `Rival ${seed}`, nationality: rng() < 0.4 ? nat : nations[(Math.floor(rng() * nations.length) + 1) % nations.length],
    position: 'CM', club: sameClub ? club : clubs[(clubs.indexOf(club) + 1) % clubs.length], clubTier: 1 + Math.floor(rng() * 3),
    overall: 55 + Math.floor(rng() * 40), careerGoals: Math.floor(rng() * 400), careerAssists: Math.floor(rng() * 200),
    careerApps: Math.floor(rng() * 500), leagueTitles: Math.floor(rng() * 4), championsLeagues: rng() < 0.3 ? 1 + Math.floor(rng() * 2) : 0,
    worldCups: 0, ballonDors: rng() < 0.25 ? 1 + Math.floor(rng() * 2) : 0, intCaps: Math.floor(rng() * 100), intGoals: Math.floor(rng() * 40),
    marketValue: Math.round(rng() * 150), age: 18 + Math.floor(rng() * 20), retired: rng() < 0.2,
  };
  const state = {
    overall: 55 + Math.floor(rng() * 40), popularity: Math.floor(rng() * 101), age: 16 + Math.floor(rng() * 24),
    nationality: nat, currentClub: club, internationalCareer: rng() < 0.5,
    morale: Math.floor(rng() * 101), netWorth: Math.round(rng() * 60 * 10) / 10,
    integrityBonus: Math.floor(rng() * 20), rivalryIntensity: Math.floor(rng() * 101),
    statBoostNextSeason: {}, events: [], rival,
  };
  return state;
}

let poolMismatches = 0, applyMismatches = 0, scenarios = 0;
const idsSeenGolden = new Set();
for (let seed = 1; seed <= 600; seed += 1) {
  const golden = fixture(seed);
  const real = JSON.parse(JSON.stringify(golden));
  scenarios += 1;

  const gPool = goldenPool(golden);
  const rPool = rivalryMod.rivalryEventPool(real, real.rival, soccer.SOCCER_RIVALRY_EVENTS);
  gPool.forEach(e => idsSeenGolden.add(e.id));
  if (JSON.stringify(gPool) !== JSON.stringify(rPool)) {
    poolMismatches += 1;
    if (poolMismatches <= 3) fail(`seed ${seed}: pool differs\n     golden: ${JSON.stringify(gPool)}\n     real:   ${JSON.stringify(rPool)}`);
  }

  /* Apply every event the pool produced, not just one, so all eighteen ids
     get an apply-comparison across the sweep rather than whichever one a
     single random pick happened to land on. */
  for (const event of gPool) {
    Math.random = mulberry32(seed * 97 + event.id);
    const gApplied = goldenApply(golden, event, Math.random);
    Math.random = mulberry32(seed * 97 + event.id);
    const lines = [];
    const rState = JSON.parse(JSON.stringify(real));
    rivalryMod.applyRivalryEvent(rState, rState.rival, event, soccer.SOCCER_RIVALRY_EVENTS, Math.random, l => lines.push(l));
    Math.random = REAL_RANDOM;
    rState.events = lines;
    const gCompare = { ...gApplied, events: gApplied.events };
    if (JSON.stringify(gCompare) !== JSON.stringify(rState)) {
      applyMismatches += 1;
      if (applyMismatches <= 3) fail(`seed ${seed} event ${event.id}: apply differs\n     golden: ${JSON.stringify(gCompare)}\n     real:   ${JSON.stringify(rState)}`);
    }
  }
}
console.log(`   ${scenarios} fixtures, ${idsSeenGolden.size} of 18 beat ids appeared, ${poolMismatches} pool mismatches, ${applyMismatches} apply mismatches`);
if (idsSeenGolden.size < 18) fail(`only ${idsSeenGolden.size} of 18 beats ever appeared across the sweep, so this section did not cover the table`);
if (poolMismatches > 3) fail(`${poolMismatches - 3} more pool mismatches, not printed`);
if (applyMismatches > 3) fail(`${applyMismatches - 3} more apply mismatches, not printed`);

/* ═══════════════════════════════════════════════════════════════════════════
   3. Soccer end to end: the real game loop
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('3) Soccer end to end: a real career, the pending slot, the no-repeat rule, the forced beat');
{
  const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  let careersWithRival = 0, everPending = 0, dismissedOk = 0, noRepeatOk = 0, sawForcedRetire = 0;
  const SOCCER_SEEDS = 60;
  for (let seed = 1; seed <= SOCCER_SEEDS; seed += 1) {
    Math.random = mulberry32(seed * 13 + 3);
    let c = soccer.initCareer(`Rivalry ${seed}`, 'England', 'CM', 'modern', flat(58), 78, 2015, soccer.FALLBACK_CLUBS, null, 90);
    Math.random = REAL_RANDOM;
    let lastId = null;
    let repeats = 0, applied = 0;
    let guard = 0;
    while (!c.retired && guard < 22) {
      guard += 1;
      Math.random = mulberry32(seed * 6151 + guard);
      c = c.phase === 'youth' ? soccer.advanceYouthYear(c, soccer.FALLBACK_CLUBS) : soccer.advanceProSeason(c, soccer.FALLBACK_CLUBS);
      Math.random = REAL_RANDOM;
      if (c.pendingRivalryEvent) {
        everPending += 1;
        if (c.pendingRivalryEvent.id === lastId) repeats += 1;
        if (c.pendingRivalryEvent.id === 105) sawForcedRetire += 1;
        c = soccer.dismissRivalryEvent(c, soccer.FALLBACK_CLUBS);
        if (c.pendingRivalryEvent === null && c.lastRivalryEventId !== null) { dismissedOk += 1; lastId = c.lastRivalryEventId; applied += 1; }
      }
    }
    if (c.rival) careersWithRival += 1;
    if (repeats === 0) noRepeatOk += 1;
    if (applied === 0 && !c.rival) { /* never drafted a rival this run, nothing to check */ }
  }
  console.log(`   ${careersWithRival} of ${SOCCER_SEEDS} careers drafted a rival, ${everPending} pending beats seen, ${dismissedOk} dismissed cleanly, ${noRepeatOk} of ${SOCCER_SEEDS} careers never repeated the last beat back to back, ${sawForcedRetire} saw the forced retirement beat`);
  /* soccerCareerEngine.ts:4816 forces rival creation unconditionally at
     age === 21 if the 19-20 coin flip has not already created one, so this
     is not a probabilistic floor, it is close to a determinism check: the
     only miss is a career that retires before 21, which the engine's own
     injury and burnout paths make possible but rare. Measured here over 60
     seeds rather than assumed: 60 of 60 had a rival every run this was
     checked, so the floor is set one below that measured result, not at a
     number that felt right (CLAUDE.md's own rule on margins). */
  if (careersWithRival < SOCCER_SEEDS - 1) fail(`only ${careersWithRival} of ${SOCCER_SEEDS} careers drafted a rival; the forced-at-21 rule should make this near universal`);
  if (everPending === 0) fail(`not one pending rivalry beat appeared across ${SOCCER_SEEDS} careers, so the trigger may not be firing`);
  if (dismissedOk === 0) fail('not one dismiss actually cleared the pending slot');
  if (noRepeatOk < careersWithRival) fail('a beat repeated back to back, so the no-repeat filter is not holding');
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. The NFL binding
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('4) The NFL binding: every beat reachable and correct, and the tick fires in real careers');
{
  /* 4a. Every id in the table, exercised against a fixture built to satisfy
     its gate, the same badge-style reachability proof simCareerParity.mjs
     uses for careerBadges.ts: a beat nobody can trigger is dead words. */
  const nflFixture = over => ({
    ovr: 80, age: 25, rings: 0, morale: 60, fanbase: 50, netWorth: 5, rivalryIntensity: 30, ...over,
  });
  const rivalFixture = over => ({
    name: 'Rival NFL', pos: 'QB', team: 'KC', ovr: 80, pot: 90, age: 25, rings: 0,
    hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0, ...over,
  });
  const gates = {
    201: [nflFixture({ rings: 0 }), rivalFixture({ rings: 1 })],
    202: [nflFixture(), rivalFixture()],
    203: [nflFixture(), rivalFixture()],
    204: [nflFixture(), rivalFixture()],
    205: [nflFixture(), rivalFixture({ retired: true })],
    206: [nflFixture({ ovr: 85 }), rivalFixture({ ovr: 85 })],
    207: [nflFixture({ rings: 0 }), rivalFixture({ rings: 2 })],
    208: [nflFixture({ ovr: 90 }), rivalFixture({ ovr: 85 })],
    209: [nflFixture({ team: 'DAL' }), rivalFixture({ team: 'DAL' })],
    210: [nflFixture(), rivalFixture()],
    211: [nflFixture(), rivalFixture({ hisYears: 4, myYears: 1 })],
    212: [nflFixture(), rivalFixture({ myYears: 4, hisYears: 1 })],
    213: [nflFixture(), rivalFixture()],
    214: [nflFixture(), rivalFixture({ ovr: 55, retired: false })],
    215: [nflFixture({ ovr: 90 }), rivalFixture({ ovr: 90 })],
    216: [nflFixture({ age: 30 }), rivalFixture()],
    217: [nflFixture({ age: 34 }), rivalFixture()],
    /* Round 917: the six NFL beats added with the content pack. */
    218: [nflFixture({ team: 'DAL', fanbase: 60 }), rivalFixture()],
    219: [nflFixture({ team: 'DAL' }), rivalFixture()],
    220: [nflFixture(), rivalFixture({ ovr: 88 })],
    221: [nflFixture({ team: 'DAL', ovr: 85 }), rivalFixture({ ovr: 85 })],
    222: [nflFixture(), rivalFixture()],
    223: [nflFixture({ team: 'DAL' }), rivalFixture({ age: 27 })],
  };
  /* Round 917 review: the rival is drafted onto the player's own team, so a
     beat that puts the two on opposite sides must stay shut while they are
     teammates. Same fixture, the player moved onto the rival's team. */
  for (const id of [218, 219, 221, 223]) {
    const def = nflRivalry.NFL_RIVALRY_EVENTS.find(d => d.id === id);
    const [p, r] = gates[id];
    if (!def) fail(`beat ${id} is missing from the NFL table`);
    else if (def.when({ ...p, team: r.team }, r)) fail(`beat ${id} (${def.title}) fires while the rival is your teammate`);
  }
  beatWords('NFL', nflRivalry.NFL_RIVALRY_EVENTS, gates); /* Round 988, before the loop below mutates the fixtures */
  let reachable = 0, correct = 0;
  const total = nflRivalry.NFL_RIVALRY_EVENTS.length;
  for (const def of nflRivalry.NFL_RIVALRY_EVENTS) {
    const [p, r] = gates[def.id] ?? [];
    if (!p) { fail(`beat ${def.id} (${def.title}) has no fixture written for it in this harness`); continue; }
    if (!def.when(p, r)) { fail(`beat ${def.id} (${def.title}) is not reachable with the fixture built for it, so its gate may have drifted`); continue; }
    reachable += 1;
    const pool = rivalryMod.rivalryEventPool(p, r, nflRivalry.NFL_RIVALRY_EVENTS);
    const built = pool.find(e => e.id === def.id);
    if (!built) { fail(`beat ${def.id}: rivalryEventPool did not include it even though when() returned true`); continue; }
    if (!built.description.includes(r.name)) { fail(`beat ${def.id}: description does not mention the rival by name`); continue; }
    /* Apply and confirm SOMETHING moved: every beat here mutates morale,
       fanbase, netWorth or rivalryIntensity, so a no-op apply is a bug. */
    const before = JSON.stringify(p);
    const lines = [];
    const rng = mulberry32(def.id);
    rivalryMod.applyRivalryEvent(p, r, built, nflRivalry.NFL_RIVALRY_EVENTS, rng, l => lines.push(l));
    if (JSON.stringify(p) === before) fail(`beat ${def.id}: applying it changed nothing on the player state`);
    else correct += 1;
    if (lines.length === 0) fail(`beat ${def.id}: apply produced no line for the feed`);
  }
  console.log(`   ${reachable} of ${total} beats reachable with a built fixture, ${correct} of ${total} actually mutated state when applied`);
  if (reachable < total) fail(`${total - reachable} beats were not reachable, so the table has dead entries`);

  /* 4b. Real careers: the tick fires, and the forced retirement beat shows
     up when it should. */
  const positions = Object.keys(nfl.ARCHETYPES);
  let careersWithRival = 0, everPending = 0, dismissedOk = 0, sawForcedRetire = 0, sawAnyBeat = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed * 733 + 5);
    const pos = positions[seed % positions.length];
    const arch = nfl.ARCHETYPES[pos][seed % nfl.ARCHETYPES[pos].length];
    let c = nfl.startCareer(`Rivalry NFL ${seed}`, pos, arch, rng, null);
    if (c.rival) careersWithRival += 1;
    let lastId = null, sawPendingThisCareer = false;
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      const tq = nfl.rollTeamQuality(year === 0 ? null : 78, rng);
      nfl.simSeason(c, tq, rng);
      nfl.progress(c, rng);
      if (nfl.shouldRetire(c)) c.retired = true;
      if (c.pendingRivalryEvent) {
        everPending += 1;
        sawPendingThisCareer = true;
        if (c.pendingRivalryEvent.id === nflRivalry.NFL_RIVAL_RETIRE_ID) sawForcedRetire += 1;
        const { state, lines } = nflRivalry.dismissNflRivalryEvent(c, rng);
        c = state;
        if (c.pendingRivalryEvent === null && lines.length > 0) { dismissedOk += 1; lastId = c.lastRivalryEventId; }
        void lastId;
      }
    }
    if (sawPendingThisCareer) sawAnyBeat += 1;
  }
  /* The strongest signal here is not "did a career ever see one pending beat
     across 14 years" (sawAnyBeat), which a coin flip weakened five times
     over would still clear: a 0.1 per-season rate still has roughly a 77%
     chance of firing at least once in 14 tries, so that binary bar would
     stay green through a five times weaker mechanic. rollRivalryEvent
     (careerRivalryEvents.ts) rolls a straight 0.5 coin flip every season the
     rival is alive and the gated pool is non-empty, so the RATE, beats per
     career-season, is the measurable CLAUDE.md asks for. Measured here
     rather than assumed: */
  const seasonsRun = careersWithRival * 14;
  const rate = everPending / seasonsRun;
  console.log(`   ${careersWithRival} of 40 NFL careers drafted a rival, ${sawAnyBeat} showed at least one pending beat, ${everPending} pending beats total over ${seasonsRun} career-seasons (rate ${rate.toFixed(3)}), ${dismissedOk} dismissed cleanly, ${sawForcedRetire} saw the forced retirement beat`);
  if (careersWithRival < 40) fail(`only ${careersWithRival} of 40 NFL careers had a rival; draftRival runs unconditionally at startCareer so this should be 40`);
  /* Measured over this exact run: the rate sits close to the raw 0.5 coin
     flip once the mostly-satisfied gates and the no-repeat filter are
     accounted for. A floor of 0.30 sits well under every measured run and
     would still catch the coin flip being weakened by more than a third,
     which sawAnyBeat's binary bar could not. */
  if (rate < 0.30) fail(`the pending-beat rate is ${rate.toFixed(3)} per career-season, well under the measured 0.5 coin flip; the tick may be firing far less often than it should`);
  if (dismissedOk === 0) fail('not one NFL dismiss actually cleared the pending slot');
}

console.log('');
/* ═══════════════════════════════════════════════════════════════════════════
   5. THE INVENTED-NAME COLLISION GUARD
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('5) THE INVENTED-NAME COLLISION GUARD: the rival can never be a real player');
{
  /* The real-name universe, harvested the same way scripts/simInventedNames.mjs
     does: every name: / n: / player: / playerName: literal under src/data,
     plus the baked Club Manager worlds, which carry the deepest real-player
     lists on the site (the international pools and the era rosters). */
  const real = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const t = fs.readFileSync(p, 'utf-8');
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*'([A-Z][^']{2,40})'/g)) real.add(m[1]);
        for (const m of t.matchAll(/\b(?:name|n|player|playerName):\s*"([A-Z][^"]{2,40})"/g)) real.add(m[1]);
      }
    }
  })(path.join(ROOT, 'src/data'));
  {
    const WENTRY = path.join(tmpDir, 'worldsEntry.mjs');
    const WBUNDLE = path.join(tmpDir, 'worlds.bundle.mjs');
    fs.writeFileSync(WENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export { NATIONALITY_BY_WORLD } from '${R}/src/data/nationalities/allWorlds.ts';
export { allIntlNames } from '${R}/src/lib/intlNames.ts';
`);
    execSync(`"${ROOT}/node_modules/.bin/esbuild" "${WENTRY}" --bundle --format=esm --platform=node --outfile="${WBUNDLE}" --log-level=error`, { stdio: 'inherit' });
    const { NATIONALITY_BY_WORLD, allIntlNames } = await import(pathToFileURL(WBUNDLE).href);
    for (const world of Object.values(NATIONALITY_BY_WORLD)) for (const n of Object.keys(world)) real.add(n);
    for (const n of allIntlNames()) real.add(n);
  }
  if (real.size < 8000) fail(`only ${real.size} real names harvested, this check is not checking much`);
  console.log(`   ${real.size} real names harvested (src/data plus the sealed Club Manager worlds and the international pools)`);

  /* 5a. Static: every combination the bank COULD produce. */
  const bankOf = (src, name) => {
    const m = src.match(new RegExp(`const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`));
    if (!m) return null;
    return [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] ?? x[2]);
  };
  const rivalSrc = collisionContents ?? readSrc('src/lib/careerRival.ts');
  const FIRST = bankOf(rivalSrc, 'FIRST');
  const LAST = bankOf(rivalSrc, 'LAST');
  if (!FIRST || !LAST) fail('could not read careerRival.ts FIRST/LAST, the generator may have been rewritten');
  else {
    const combos = [];
    for (const a of FIRST) for (const b of LAST) combos.push(`${a} ${b}`);
    const collisions = combos.filter(n => real.has(n));
    console.log(`   ${FIRST.length} first names x ${LAST.length} surnames = ${combos.length} combinations, ${collisions.length} collide with a real name`);
    if (combos.length < 400) fail(`only ${combos.length} possible rival names, too small a bank to be checking anything meaningful`);
    if (collisions.length > 0) {
      for (const n of collisions.slice(0, 8)) fail(`careerRival.ts can name the rival "${n}", a real player this site ships`);
      if (collisions.length > 8) fail(`${collisions.length - 8} more colliding names, not printed`);
    }
  }

  /* 5b. Runtime: the LIVE draftRival function, sampled thousands of times
     across positions, teams and ages, checked the same way the static half
     was. A guard that is correct on paper and wired up wrong would pass 5a
     and fail here. Round 525 note: draftRival takes no sport parameter and
     careerRival.ts's FIRST/LAST bank is shared across every RivalSport
     value (mlb, nba, nfl, nhl all draw from it), so this single runtime
     sweep already covers the MLB rival too; nothing extra is needed in
     section 6 below for the name guard specifically. */
  const teams = ['KC', 'DAL', 'BUF', 'SF', 'PHI', 'GB', 'MIA', 'BAL'];
  const seen = new Set();
  let emitted = 0, realHits = 0;
  const badShown = [];
  for (let seed = 1; seed <= 6000; seed += 1) {
    const rng = mulberry32(seed);
    const r = careerRival.draftRival('QB', 60 + Math.floor(rng() * 35), 70 + Math.floor(rng() * 25), 20 + Math.floor(rng() * 6), teams[seed % teams.length], rng);
    emitted += 1;
    seen.add(r.name);
    if (real.has(r.name)) { realHits += 1; if (badShown.length < 5) badShown.push(r.name); }
  }
  badShown.forEach(n => fail(`draftRival actually emitted a real player: "${n}"`));
  if (realHits > badShown.length) fail(`and ${realHits - badShown.length} more real emissions from draftRival, not printed`);
  console.log(`   ${emitted} live draftRival rolls, ${seen.size} distinct names, ${realHits} of them real`);
  if (seen.size < 200) fail(`only ${seen.size} distinct names in ${emitted} rolls, the generator may have collapsed`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. The MLB binding, Round 525's slice
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('6) The MLB binding: every beat reachable and correct, and the tick fires in real careers');
{
  /* 6a. Every id in mlbCareerRivalryEvents.ts's own table, exercised
     against a fixture built to satisfy its gate. Same badge-style
     reachability proof as section 4a: a beat nobody can trigger is dead
     words. */
  /* seasons: every MLB save carries the list, and since Round 1149 beat 206 reads its last entry. */
  const mlbFixture = over => ({
    ovr: 80, age: 25, rings: 0, morale: 60, fanbase: 50, netWorth: 5, rivalryIntensity: 30, team: 'BOS', seasons: [], ...over,
  });
  const rivalFixture = over => ({
    name: 'Rival MLB', pos: 'SP', team: 'NYY', ovr: 80, pot: 90, age: 25, rings: 0,
    hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0, ...over,
  });
  const gates = {
    201: [mlbFixture({ rings: 0 }), rivalFixture({ rings: 1 })],
    202: [mlbFixture(), rivalFixture()],
    203: [mlbFixture(), rivalFixture()],
    204: [mlbFixture(), rivalFixture()],
    205: [mlbFixture(), rivalFixture({ retired: true })],
    /* Round 1149: 206 is dealt on the season's own All-Star fact, never on a coin. */
    206: [mlbFixture({ seasons: [{ year: 2030, awards: ['All-Star'] }] }), rivalFixture()],
    207: [mlbFixture({ rings: 0 }), rivalFixture({ rings: 2 })],
    208: [mlbFixture({ ovr: 90 }), rivalFixture({ ovr: 85 })],
    209: [mlbFixture({ team: 'NYY' }), rivalFixture({ team: 'NYY' })],
    210: [mlbFixture(), rivalFixture()],
    211: [mlbFixture(), rivalFixture({ hisYears: 4, myYears: 1 })],
    212: [mlbFixture(), rivalFixture({ myYears: 4, hisYears: 1 })],
    213: [mlbFixture(), rivalFixture()],
    214: [mlbFixture(), rivalFixture({ ovr: 55, retired: false })],
    215: [mlbFixture({ ovr: 90 }), rivalFixture({ ovr: 90 })],
    216: [mlbFixture({ age: 30 }), rivalFixture()],
    217: [mlbFixture({ age: 34 }), rivalFixture()],
    /* Round 919: the six new MLB beats. */
    218: [mlbFixture({ pos: 'SS' }), rivalFixture({ pos: 'SS' })],
    219: [mlbFixture({ pos: 'SS' }), rivalFixture({ pos: 'SP' })],
    220: [mlbFixture({ ovr: 80 }), rivalFixture({ ovr: 84 })],
    221: [mlbFixture({ age: 24 }), rivalFixture({ age: 24 })],
    222: [mlbFixture({ team: 'BOS' }), rivalFixture({ team: 'NYY' })],
    223: [mlbFixture({ age: 34 }), rivalFixture({ age: 35 })],
  };
  beatWords('MLB', mlbRivalry.MLB_RIVALRY_EVENTS, gates); /* Round 988, before the loop below mutates the fixtures */
  /* Round 1149: the All-Star beat, read off the player's own season (see ownRosterBeatCheck). */
  ownRosterBeatCheck('MLB', mlbRivalry.MLB_RIVALRY_EVENTS, 206, {
    p: mlbFixture, r: rivalFixture, award: mlbRivalry.MLB_ROSTER_AWARD, rivalName: 'Rival MLB',
    made: { says: /The All-Star rosters are out and you are on one\./, reads: 'Morale +5', move: { morale: 5 }, told: /You made the All-Star roster\./ },
    missed: { says: /The All-Star rosters are out and you are not on one,/, reads: 'Morale -5', move: { morale: -5 }, told: /You were left off the All-Star roster\./ },
  });
  let reachable = 0, correct = 0;
  const total = mlbRivalry.MLB_RIVALRY_EVENTS.length;
  for (const def of mlbRivalry.MLB_RIVALRY_EVENTS) {
    const [p, r] = gates[def.id] ?? [];
    if (!p) { fail(`beat ${def.id} (${def.title}) has no fixture written for it in this harness`); continue; }
    if (!def.when(p, r)) { fail(`beat ${def.id} (${def.title}) is not reachable with the fixture built for it, so its gate may have drifted`); continue; }
    reachable += 1;
    const pool = rivalryMod.rivalryEventPool(p, r, mlbRivalry.MLB_RIVALRY_EVENTS);
    const built = pool.find(e => e.id === def.id);
    if (!built) { fail(`beat ${def.id}: rivalryEventPool did not include it even though when() returned true`); continue; }
    if (!built.description.includes(r.name)) { fail(`beat ${def.id}: description does not mention the rival by name`); continue; }
    const before = JSON.stringify(p);
    const lines = [];
    const rng = mulberry32(def.id * 3);
    rivalryMod.applyRivalryEvent(p, r, built, mlbRivalry.MLB_RIVALRY_EVENTS, rng, l => lines.push(l));
    if (JSON.stringify(p) === before) fail(`beat ${def.id}: applying it changed nothing on the player state`);
    else correct += 1;
    if (lines.length === 0) fail(`beat ${def.id}: apply produced no line for the feed`);
  }
  console.log(`   ${reachable} of ${total} beats reachable with a built fixture, ${correct} of ${total} actually mutated state when applied`);
  if (reachable < total) fail(`${total - reachable} beats were not reachable, so the table has dead entries`);
  if (total < 15) fail(`only ${total} beats in MLB_RIVALRY_EVENTS, short of the 15 to 18 the round asked for`);

  /* 6b. Real careers: the tick fires, and the forced retirement beat shows
     up when it should. Same shape as section 4b, and the same reasoning on
     why the RATE is the measured signal rather than a binary "ever showed
     one beat", which Round 524's review found missing from an earlier draft
     of this exact check on the NFL side. */
  const positions = Object.keys(mlb.MLB_ARCHETYPES);
  let careersWithRival = 0, everPending = 0, dismissedOk = 0, sawForcedRetire = 0, sawAnyBeat = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed * 911 + 13);
    const pos = positions[seed % positions.length];
    const arch = mlb.MLB_ARCHETYPES[pos][seed % mlb.MLB_ARCHETYPES[pos].length];
    let c = mlb.startMlbCareer(`Rivalry MLB ${seed}`, pos, arch, rng, null);
    if (c.rival) careersWithRival += 1;
    let lastId = null, sawPendingThisCareer = false;
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      const tq = mlb.mlbRollTeamQuality(year === 0 ? null : 78, rng);
      mlb.simMlbSeason(c, tq, rng);
      mlb.mlbProgress(c, rng);
      if (mlb.mlbShouldRetire(c)) c.retired = true;
      if (c.pendingRivalryEvent) {
        everPending += 1;
        sawPendingThisCareer = true;
        if (c.pendingRivalryEvent.id === mlbRivalry.MLB_RIVAL_RETIRE_ID) sawForcedRetire += 1;
        const { state, lines } = mlbRivalry.dismissMlbRivalryEvent(c, rng);
        c = state;
        if (c.pendingRivalryEvent === null && lines.length > 0) { dismissedOk += 1; lastId = c.lastRivalryEventId; }
        void lastId;
      }
    }
    if (sawPendingThisCareer) sawAnyBeat += 1;
  }
  const seasonsRun = careersWithRival * 14;
  const rate = everPending / seasonsRun;
  console.log(`   ${careersWithRival} of 40 MLB careers drafted a rival, ${sawAnyBeat} showed at least one pending beat, ${everPending} pending beats total over ${seasonsRun} career-seasons (rate ${rate.toFixed(3)}), ${dismissedOk} dismissed cleanly, ${sawForcedRetire} saw the forced retirement beat`);
  if (careersWithRival < 40) fail(`only ${careersWithRival} of 40 MLB careers had a rival; draftRival runs unconditionally at startMlbCareer so this should be 40`);
  /* Same floor logic as section 4b, measured over this exact run: the rate
     sits close to the raw 0.5 coin flip once the mostly-satisfied gates and
     the no-repeat filter are accounted for, and 0.30 sits well under every
     measured run. */
  if (rate < 0.30) fail(`the pending-beat rate is ${rate.toFixed(3)} per career-season, well under the measured 0.5 coin flip; the tick may be firing far less often than it should`);
  if (dismissedOk === 0) fail('not one MLB dismiss actually cleared the pending slot');
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. Round 525: the NBA binding
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('7) The NBA binding: every beat reachable and correct, and the tick fires in real careers');
{
  /* 6a. Every id in the table, exercised against a fixture built to satisfy
     its gate, the same badge-style reachability proof section 4 ran for the
     NFL table: a beat nobody can trigger is dead words. */
  /* seasons: every NBA save carries the list, and since Round 1112 beat 306 reads its last entry. */
  const nbaFixture = over => ({
    ovr: 80, age: 25, rings: 0, morale: 60, fanbase: 50, netWorth: 5, rivalryIntensity: 30, seasons: [], ...over,
  });
  const rivalFixture = over => ({
    name: 'Rival NBA', pos: 'PG', team: 'LAL', ovr: 80, pot: 90, age: 25, rings: 0,
    hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0, ...over,
  });
  const gates = {
    301: [nbaFixture({ rings: 0 }), rivalFixture({ rings: 1 })],
    302: [nbaFixture(), rivalFixture()],
    303: [nbaFixture(), rivalFixture()],
    304: [nbaFixture(), rivalFixture()],
    305: [nbaFixture(), rivalFixture({ retired: true })],
    /* Round 1112: 306 is dealt on the season's two All-Star facts, never on the ratings. */
    306: [nbaFixture({ seasons: [{ year: 2030, allStar: 'reserve', awards: ['All-Star'] }] }), rivalFixture({ lastYear: 2030, lastAllStar: false })],
    307: [nbaFixture({ rings: 0 }), rivalFixture({ rings: 2 })],
    308: [nbaFixture({ ovr: 90 }), rivalFixture({ ovr: 85 })],
    309: [nbaFixture({ team: 'LAL' }), rivalFixture({ team: 'LAL' })],
    310: [nbaFixture(), rivalFixture()],
    311: [nbaFixture(), rivalFixture({ hisYears: 4, myYears: 1 })],
    312: [nbaFixture(), rivalFixture({ myYears: 4, hisYears: 1 })],
    313: [nbaFixture(), rivalFixture()],
    314: [nbaFixture(), rivalFixture({ ovr: 55, retired: false })],
    315: [nbaFixture({ ovr: 90 }), rivalFixture({ ovr: 90 })],
    316: [nbaFixture({ age: 30 }), rivalFixture()],
    317: [nbaFixture({ age: 34 }), rivalFixture()],
    /* Round 918: the six new NBA beats. */
    318: [nbaFixture({ pos: 'PG', team: 'BOS' }), rivalFixture({ pos: 'PG', team: 'LAL' })],
    319: [nbaFixture({ ovr: 80 }), rivalFixture({ ovr: 84 })],
    320: [nbaFixture({ team: 'BOS' }), rivalFixture({ team: 'LAL', ovr: 85 })],
    321: [nbaFixture({ age: 24 }), rivalFixture()],
    322: [nbaFixture({ age: 27 }), rivalFixture()],
    323: [nbaFixture({ rings: 1 }), rivalFixture({ rings: 1 })],
  };
  beatWords('NBA', nbaRivalry.NBA_RIVALRY_EVENTS, gates); /* Round 988, before the loop below mutates the fixtures */
  /* Round 1112: the All-Star beat. It flipped a coin for who made the roster, in a game whose engine picks
     All-Stars for real, so the card could contradict the season card of the same year. Every pair of facts,
     as a card and as an apply: dealt only when one of you made it and the two facts are one season's, the
     words say those facts, the consequence is exactly what moves, and nothing is drawn. Deterministic: 3
     cases that must not be dealt and 3 that must, each applied at 4 rolls. Round 1149: the beat is built on
     the shared factBeat now, so the check is the shared one (factBeatCheck above), with the old card half. */
  {
    const season = (allStar, year = 2030) => ({ year, awards: allStar ? ['All-Star'] : [], ...(allStar ? { allStar: 'reserve' } : {}) });
    const pair = (mine, his) => ({ p: nbaFixture({ seasons: [season(mine)] }), r: rivalFixture({ lastYear: 2030, lastAllStar: his }) });
    const dealt = factBeatCheck('NBA', nbaRivalry.NBA_RIVALRY_EVENTS, 306, {
      never: [
        { name: 'in a season neither of you made the All-Star roster', p: nbaFixture({ ovr: 90, seasons: [season(false)] }), r: rivalFixture({ ovr: 90, lastYear: 2030, lastAllStar: false }) },
        { name: 'on two different seasons (mine of 2031, his of 2030)', p: nbaFixture({ seasons: [season(true, 2031)] }), r: rivalFixture({ lastYear: 2030, lastAllStar: true }) },
        { name: 'on the two ratings again (both at 90, nobody on the roster, a rival from before Round 1112)', p: nbaFixture({ ovr: 90, seasons: [season(false)] }), r: rivalFixture({ ovr: 90 }) },
      ],
      deal: [
        { name: 'mine=true his=false', ...pair(true, false), says: /You are on one and Rival NBA is not/, reads: 'Morale +5', move: { morale: 5 }, told: /You made the All-Star roster and Rival NBA did not/ },
        { name: 'mine=false his=true', ...pair(false, true), says: /Rival NBA is on one and you are not/, reads: 'Morale -5', move: { morale: -5 }, told: /Rival NBA made the All-Star roster and you did not/ },
        { name: 'mine=true his=true', ...pair(true, true), says: /you and Rival NBA are both on them/, reads: 'Fanbase +3', move: { fanbase: 3 }, told: /both made the All-Star roster/ },
      ],
    });
    console.log(`   the All-Star beat: ${dealt} of 3 fact pairs dealt and applied at 4 rolls each, never on a coin, never when neither made it, and a card from the old coin resolves with no effect`);
    if (dealt < 3) fail(`only ${dealt} of 3 All-Star fact pairs were dealt`);
  }
  let reachable = 0, correct = 0;
  const total = nbaRivalry.NBA_RIVALRY_EVENTS.length;
  for (const def of nbaRivalry.NBA_RIVALRY_EVENTS) {
    const [p, r] = gates[def.id] ?? [];
    if (!p) { fail(`NBA beat ${def.id} (${def.title}) has no fixture written for it in this harness`); continue; }
    if (!def.when(p, r)) { fail(`NBA beat ${def.id} (${def.title}) is not reachable with the fixture built for it, so its gate may have drifted`); continue; }
    reachable += 1;
    const pool = rivalryMod.rivalryEventPool(p, r, nbaRivalry.NBA_RIVALRY_EVENTS);
    const built = pool.find(e => e.id === def.id);
    if (!built) { fail(`NBA beat ${def.id}: rivalryEventPool did not include it even though when() returned true`); continue; }
    if (!built.description.includes(r.name)) { fail(`NBA beat ${def.id}: description does not mention the rival by name`); continue; }
    /* Apply and confirm SOMETHING moved: every beat here mutates morale,
       fanbase, netWorth or rivalryIntensity, so a no-op apply is a bug. */
    const before = JSON.stringify(p);
    const lines = [];
    const rng = mulberry32(def.id);
    rivalryMod.applyRivalryEvent(p, r, built, nbaRivalry.NBA_RIVALRY_EVENTS, rng, l => lines.push(l));
    if (JSON.stringify(p) === before) fail(`NBA beat ${def.id}: applying it changed nothing on the player state`);
    else correct += 1;
    if (lines.length === 0) fail(`NBA beat ${def.id}: apply produced no line for the feed`);
  }
  console.log(`   ${reachable} of ${total} beats reachable with a built fixture, ${correct} of ${total} actually mutated state when applied`);
  if (reachable < total) fail(`${total - reachable} NBA beats were not reachable, so the table has dead entries`);

  /* 6b. Real careers: the tick fires, and the forced retirement beat shows
     up when it should. */
  const positions = Object.keys(nba.NBA_ARCHETYPES);
  let careersWithRival = 0, everPending = 0, dismissedOk = 0, sawForcedRetire = 0, sawAnyBeat = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed * 733 + 5);
    const pos = positions[seed % positions.length];
    const arch = nba.NBA_ARCHETYPES[pos][seed % nba.NBA_ARCHETYPES[pos].length];
    let c = nba.startNbaCareer(`Rivalry NBA ${seed}`, pos, arch, rng, null);
    if (c.rival) careersWithRival += 1;
    let lastId = null, sawPendingThisCareer = false;
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      const tq = nba.nbaRollTeamQuality(year === 0 ? null : 78, rng);
      nba.simNbaSeason(c, tq, rng);
      nba.nbaProgress(c, rng);
      if (nba.nbaShouldRetire(c)) c.retired = true;
      if (c.pendingRivalryEvent) {
        everPending += 1;
        sawPendingThisCareer = true;
        if (c.pendingRivalryEvent.id === nbaRivalry.NBA_RIVAL_RETIRE_ID) sawForcedRetire += 1;
        const { state, lines } = nbaRivalry.dismissNbaRivalryEvent(c, rng);
        c = state;
        if (c.pendingRivalryEvent === null && lines.length > 0) { dismissedOk += 1; lastId = c.lastRivalryEventId; }
        void lastId;
      }
    }
    if (sawPendingThisCareer) sawAnyBeat += 1;
  }
  /* Same reasoning as section 4b: sawAnyBeat (did a career ever see one
     pending beat across 14 years) is a weak binary signal a coin flip
     weakened five times over would still mostly clear. rollRivalryEvent
     rolls a straight 0.5 coin flip every season the rival is alive and the
     gated pool is non-empty, so the RATE, beats per career-season, is the
     measurable CLAUDE.md asks for. Measured here rather than assumed. */
  const seasonsRun = careersWithRival * 14;
  const rate = everPending / seasonsRun;
  console.log(`   ${careersWithRival} of 40 NBA careers drafted a rival, ${sawAnyBeat} showed at least one pending beat, ${everPending} pending beats total over ${seasonsRun} career-seasons (rate ${rate.toFixed(3)}), ${dismissedOk} dismissed cleanly, ${sawForcedRetire} saw the forced retirement beat`);
  if (careersWithRival < 40) fail(`only ${careersWithRival} of 40 NBA careers had a rival; draftRival runs unconditionally at startNbaCareer so this should be 40`);
  /* Same 0.30 floor as section 4b: measured over this exact run the rate
     sits close to the raw 0.5 coin flip once the mostly-satisfied gates and
     the no-repeat filter are accounted for, and 0.30 sits well under every
     measured run while still catching the coin flip being weakened by more
     than a third, which sawAnyBeat's binary bar could not. */
  if (rate < 0.30) fail(`the NBA pending-beat rate is ${rate.toFixed(3)} per career-season, well under the measured 0.5 coin flip; the tick may be firing far less often than it should`);
  if (dismissedOk === 0) fail('not one NBA dismiss actually cleared the pending slot');
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. The NHL binding (Round 525)
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('8) The NHL binding: every beat reachable and correct, and the tick fires in real careers');
{
  /* 5a. Every id in the table, exercised against a fixture built to satisfy
     its gate, the same badge-style reachability proof section 4 runs for
     the NFL table. */
  const nhlFixture = over => ({
    ovr: 80, age: 25, cups: 0, morale: 60, fanbase: 50, netWorth: 5, rivalryIntensity: 30, team: 'TOR', ...over,
  });
  const rivalFixture = over => ({
    name: 'Rival NHL', pos: 'C', team: 'BOS', ovr: 80, pot: 90, age: 25, rings: 0,
    hisYears: 0, myYears: 0, retired: false, lastLine: '', lastScore: 0, ...over,
  });
  const gates = {
    301: [nhlFixture({ cups: 0 }), rivalFixture({ rings: 1 })],
    302: [nhlFixture(), rivalFixture()],
    303: [nhlFixture(), rivalFixture()],
    304: [nhlFixture(), rivalFixture()],
    305: [nhlFixture(), rivalFixture({ retired: true })],
    306: [nhlFixture({ ovr: 85 }), rivalFixture({ ovr: 85 })],
    307: [nhlFixture({ cups: 0 }), rivalFixture({ rings: 2 })],
    308: [nhlFixture({ ovr: 90 }), rivalFixture({ ovr: 85 })],
    309: [nhlFixture({ team: 'DAL' }), rivalFixture({ team: 'DAL' })],
    310: [nhlFixture(), rivalFixture()],
    311: [nhlFixture(), rivalFixture({ hisYears: 4, myYears: 1 })],
    312: [nhlFixture(), rivalFixture({ myYears: 4, hisYears: 1 })],
    313: [nhlFixture(), rivalFixture()],
    314: [nhlFixture(), rivalFixture({ ovr: 55, retired: false })],
    315: [nhlFixture({ ovr: 90 }), rivalFixture({ ovr: 90 })],
    316: [nhlFixture({ age: 30 }), rivalFixture()],
    317: [nhlFixture({ age: 34 }), rivalFixture()],
    /* Round 920: the six new NHL beats. */
    318: [nhlFixture({ pos: 'C' }), rivalFixture({ pos: 'C' })],
    319: [nhlFixture({ ovr: 80 }), rivalFixture({ ovr: 84 })],
    320: [nhlFixture(), rivalFixture({ ovr: 85 })],
    321: [nhlFixture({ age: 24 }), rivalFixture()],
    322: [nhlFixture({ age: 28 }), rivalFixture()],
    323: [nhlFixture({ cups: 1 }), rivalFixture({ rings: 1 })],
  };
  beatWords('NHL', nhlRivalry.NHL_RIVALRY_EVENTS, gates); /* Round 988, before the loop below mutates the fixtures */
  let reachable = 0, correct = 0;
  const total = nhlRivalry.NHL_RIVALRY_EVENTS.length;
  for (const def of nhlRivalry.NHL_RIVALRY_EVENTS) {
    const [p, r] = gates[def.id] ?? [];
    if (!p) { fail(`beat ${def.id} (${def.title}) has no fixture written for it in this harness`); continue; }
    if (!def.when(p, r)) { fail(`beat ${def.id} (${def.title}) is not reachable with the fixture built for it, so its gate may have drifted`); continue; }
    reachable += 1;
    const pool = rivalryMod.rivalryEventPool(p, r, nhlRivalry.NHL_RIVALRY_EVENTS);
    const built = pool.find(e => e.id === def.id);
    if (!built) { fail(`beat ${def.id}: rivalryEventPool did not include it even though when() returned true`); continue; }
    if (!built.description.includes(r.name)) { fail(`beat ${def.id}: description does not mention the rival by name`); continue; }
    /* Apply and confirm SOMETHING moved: every beat here mutates morale,
       fanbase, netWorth or rivalryIntensity, so a no-op apply is a bug. */
    const before = JSON.stringify(p);
    const lines = [];
    const rng = mulberry32(def.id);
    rivalryMod.applyRivalryEvent(p, r, built, nhlRivalry.NHL_RIVALRY_EVENTS, rng, l => lines.push(l));
    if (JSON.stringify(p) === before) fail(`beat ${def.id}: applying it changed nothing on the player state`);
    else correct += 1;
    if (lines.length === 0) fail(`beat ${def.id}: apply produced no line for the feed`);
  }
  console.log(`   ${reachable} of ${total} beats reachable with a built fixture, ${correct} of ${total} actually mutated state when applied`);
  if (reachable < total) fail(`${total - reachable} beats were not reachable, so the table has dead entries`);

  /* 5b. Real careers: the tick fires, and the forced retirement beat shows
     up when it should. */
  const positions = Object.keys(nhl.NHL_ARCHETYPES);
  let careersWithRival = 0, everPending = 0, dismissedOk = 0, sawForcedRetire = 0, sawAnyBeat = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = mulberry32(seed * 823 + 11);
    const pos = positions[seed % positions.length];
    const arch = nhl.NHL_ARCHETYPES[pos][seed % nhl.NHL_ARCHETYPES[pos].length];
    let c = nhl.startNhlCareer(`Rivalry NHL ${seed}`, pos, arch, rng, null);
    if (c.rival) careersWithRival += 1;
    let lastId = null, sawPendingThisCareer = false;
    let tq = nhl.nhlRollTeamQuality(null, rng);
    for (let year = 0; year < 14 && !c.retired; year += 1) {
      tq = nhl.nhlRollTeamQuality(year === 0 ? tq : 78, rng);
      nhl.simNhlSeason(c, tq, rng);
      nhl.nhlProgress(c, rng);
      if (nhl.nhlShouldRetire(c)) c.retired = true;
      if (c.pendingRivalryEvent) {
        everPending += 1;
        sawPendingThisCareer = true;
        if (c.pendingRivalryEvent.id === nhlRivalry.NHL_RIVAL_RETIRE_ID) sawForcedRetire += 1;
        const { state, lines } = nhlRivalry.dismissNhlRivalryEvent(c, rng);
        c = state;
        if (c.pendingRivalryEvent === null && lines.length > 0) { dismissedOk += 1; lastId = c.lastRivalryEventId; }
        void lastId;
      }
    }
    if (sawPendingThisCareer) sawAnyBeat += 1;
  }
  /* Same reasoning as section 4: the RATE is the measurable signal, not the
     binary "did it ever fire once" bar. rollRivalryEvent rolls a straight
     0.5 coin flip every season the rival is alive and the gated pool is
     non-empty, measured here rather than assumed. */
  const seasonsRun = careersWithRival * 14;
  const rate = everPending / seasonsRun;
  console.log(`   ${careersWithRival} of 40 NHL careers drafted a rival, ${sawAnyBeat} showed at least one pending beat, ${everPending} pending beats total over ${seasonsRun} career-seasons (rate ${rate.toFixed(3)}), ${dismissedOk} dismissed cleanly, ${sawForcedRetire} saw the forced retirement beat`);
  if (careersWithRival < 40) fail(`only ${careersWithRival} of 40 NHL careers had a rival; draftRival runs unconditionally at startNhlCareer so this should be 40`);
  /* Same floor section 4 uses, for the same measured reason. */
  if (rate < 0.30) fail(`the NHL pending-beat rate is ${rate.toFixed(3)} per career-season, well under the measured 0.5 coin flip; the tick may be firing far less often than it should`);
  if (dismissedOk === 0) fail('not one NHL dismiss actually cleared the pending slot');
}

console.log(`9) The 24 new beats, words against effects: ${beatApplies} applies over NFL and MLB 218 to 223, NBA and NHL 318 to 323`);
if (beatApplies < BEAT_APPLIES_MIN) fail(`only ${beatApplies} new beat applies made, the floor is ${BEAT_APPLIES_MIN}`);

console.log('');
if (failures > 0) {
  console.error(`simCareerRivalryEvents: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerRivalryEvents: green. Soccer is unchanged, the NFL, MLB, NBA and NHL beats fire, and the rival is never a real player.');
