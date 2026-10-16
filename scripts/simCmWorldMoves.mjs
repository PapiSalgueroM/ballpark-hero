/* Round 1344: Club Manager, a man two other clubs trade turns up at his new club and stays there.
 *
 * WHY. A player report on /club-manager, forwarded by the owner on 2026-10-16: "Bug: in manager mode, if a player
 * transfers to another club they get deleted from the database until next season, where they end up at their
 * former team." The other lane proved it (PR269, Round 1367). Three places close a deal between two clubs that are
 * not yours: the window news (generateHeadlines, at a career's start, every January and every summer), a rival who
 * closes while you dither (makeOffer) and a rival who takes the man when you walk away (walkAway). All three write a
 * news line and put the man on goneNames, and nothing else: he leaves the market, the world roster keeps him at the
 * seller, and goneNames is emptied every summer, so next season he is on sale at his old club again.
 *
 * THE FIX (step 2 on). In a seeded career generateHeadlines writes every deal to the ledger as it closes (a working
 * copy packed once a window, the lead's ruling 4), and skips a deal the ledger would refuse after its three draws;
 * a fresh career's opening window, which closes before the seed is drawn, is recorded by startCareer's last line
 * (the post seed flush); an AI club never takes a man the ledger holds from a deal of mine (ruling 3).
 *
 * SECTIONS:
 *   0. anchors: every edit this harness can make stands exactly once in the engine it is made to.
 *   1. ownership: seeded careers (2026-27, 2015-16 and 2005-06 worlds, a big club, a mid table club and a thin
 *      squad's club each, seeds 1 to 5, six seasons), saved and loaded after every window and every rollover. At
 *      every window: (i) every deal line between two other clubs is placed by the ledger at its buyer, who lists
 *      him, and the seller does not; (ii) the one club rule over every club of the world: a key is listed at most
 *      once, an owned record's man is listed at his owner and nowhere else, no other club lists a man matching his
 *      origin, and no man of my squad is listed at any club; (iii) every man moved in the run is at his buyer at
 *      every later rollover, or the ledger says he retired; (iv) printed per window type: deals, refusals,
 *      records, the ledger's stored length, and the opening window's refusals on a line of their own (the critic's
 *      correction 4: that window cannot skip, so its refusals are measured, expected 0). The opening window's (i) is
 *      also checked on the state startCareer hands back, before its first save (the review of 2026-10-16: the
 *      repair on load mended a missing flush and hid it from the noflush control).
 *   2. negotiation: at each seeded career's opening window (seeds 1 to 5), PR269's own scripts open a bidding war
 *      (startNegotiation on [.6, .99, .6], an offer at 0.8 of the ask on [.6, .01, .5, .5]); then the hijack
 *      (makeOffer again on [.01]) and, from the same state, the walk away (walkAway on [.01]): the rival owns the
 *      man (the ledger places him at the rival, who lists him, and the seller does not), and exactly one draw is
 *      taken. A career where the vectors raise no rival is counted, not failed; under 5 of either arm cannot run.
 *      The protected arms (the review of 2026-10-16, both reviews' first major): the 2026-27 trio, the same seeds, a
 *      man I sold (a season later, on sale at my buyer) and a man I left behind at a job move (on sale at my old
 *      club), each protected by the lead's ruling 3; the same war on a copy with the window open and the budget
 *      high; the hijack and the walk away each take one draw and nothing says he moved (no news line, gone name or
 *      headline, the talks not hijacked, his record unchanged). Under 3 wars of either kind cannot run.
 *   3. join: seeded 2026-27 careers (the trio, seeds 1 to 3) take a job mid season through joinClubNow, once before
 *      January and once after it (the brief's decision 3): the joined ledger holds every departed record (same key;
 *      the same owner and status unless a deal line of the run in moved him) plus only men of the run in's deal
 *      lines, every deal line of the run in between two other clubs is placed at its buyer, and every name gone
 *      before the move stays gone after it. Since the review of 2026-10-16 (both reviews' second major), also a join
 *      in season two, and: the joined log opens with the departed career's lines of this season's deals between two
 *      other clubs whose men stay gone, then the run in's lines, each with this season's number (a seeded run in
 *      plays the departed career's season, so the refusal reads its lines too); a departed record
 *      the run in did not move keeps its payload (or a later year); and every man of those lines is on the screen at
 *      the club that owns him, marked, with Talk and buy refusing him (pressed with the window open).
 *   4. the market, played inside section 1's careers: at every window each man of its deal lines is on the screen's
 *      market (marketForScreen) at his buyer, marked joinedThisSeason, and every door (buy, clause, loan, talk)
 *      answers what it answers today with that deal line taken out, or else the new sentence ("only joined ... this
 *      season"; the critic's corrections 9 and 15); a man hidden behind a namesake is counted, not failed
 *      (correction 23). At the next summer he is on sale at his club like anyone else, and when the buy door opens
 *      buyPlayer takes him (on its own stream). marketForScreen is timed against buildMarket on the same states:
 *      at most 3 times plus 5 ms a call. Since the review of 2026-10-16: the screen keeps every row buildMarket
 *      lists, and Talk and buy refuse every row it marks joinedThisSeason.
 *   5. the repair on load: saves BASE's engine wrote for the three worlds' careers (seeds 1 to 3) after the opening
 *      window and after the first January, loaded by the head: every deal line of this season between two other
 *      clubs whose man is on goneNames is mended (placed at his buyer), or left for a counted reason (a deal of mine
 *      holds him, Release AZ's promise; or the seller lists not exactly one man of that name); the load differs from
 *      BASE's load in the ledger alone, every added record is one of this season's deal lines, a second save and
 *      load is byte equal (idempotent), and every unseeded save loads byte equal to BASE's load.
 *   6. legacy: careers with no world seed (startCareer with PR269's legacy world, and fresh careers with the seed,
 *      the ledger and the squad's ledger keys stripped the way simClubManagerSaveSize strips them, and the legacy
 *      career with three deals of mine at its start: a release, a buy and a sale through acceptBid), the same nine
 *      clubs, seeds 0 to 4, two seasons with their January windows, a save and a reload after every window,
 *      deal and rollover, against BASE: every state, saved byte and Math.random draw equal. Since Round 1508 only up
 *      to the first summer, where the head adopts the career (a readable ledger and no seed, asserted); what it does
 *      after that is scripts/simCmUnseededWorld.mjs's.
 *   7. my deals with the recording on (the critic's correction 10): seeded careers of the three worlds (seeds 1 to 3)
 *      release, buy and sell (acceptBid), and since the review of 2026-10-16 also make a swap (an offer with a man of
 *      mine in it, his terms met) and take a loan with its option exercised, at the start and again a season later,
 *      on BASE and on the head (a deal the stream cannot reach is counted; no swap or no option at all on the head
 *      cannot run); each deal must
 *      leave exactly one ledger record with the right owner and status, and the head may not leave more deals without
 *      one than BASE (an AI record sharing a name and birth year with a keyless man of mine would be such a refusal).
 *   8. the bridge (the brief's decision 7, the critic's correction 6): seeded careers of the three worlds (seeds 0 to 2),
 *      two seasons with their January windows, saved and reloaded after every window and rollover: the head with
 *      scripts/lib/cmNoAiMoves1344.mjs (five anchors: the window's record line, recordAiDeals' loop, the join's
 *      ledger, its gone names and log, and the rival's guard) equals BASE in every saved string, draw and the last state; the head without it
 *      differs on at least one career (asserted, and printed: how many and from which save).
 *   9. shape (only when asked): the world's shape over fifteen seasons at the 2026-27 trio, BASE against the head,
 *      per tier (each league's top five and bottom five by the bake's year 0 XI, the clubs that sold and the clubs
 *      that bought in an AI deal line): the XI average, the roster length minus the projection's slot count and the
 *      mean age at seasons 1, 5, 10 and 15; plus AI deals a window, the ledger's records and stored length, the
 *      market's size and the January entry's time. Each run writes its per career numbers as JSON; --combine reads
 *      the files of every run, prints the paired statistic (head minus BASE on the same seeds, the mean of the per
 *      seed differences and its standard error, beside BASE against BASE on a second seed set) and ASSERTS the
 *      lead's ruling 2: the top and bottom tiers' XI and age at seasons 5, 10 and 15 move by no more than SHAPE_MARGIN
 *      once BASE against BASE is taken off, and the buyers' surplus stays at the level step 1 measured and flat.
 *  10. the window's skip (the review of 2026-10-16, the run review's M4): Real Madrid (2026-27) sells its eight best
 *      outfield men to other clubs at the start through acceptBid, so ruling 3 protects eight of the best rated men
 *      in the world, and plays three seasons, seeds 1 to 8; at every window each new deal line between two other
 *      clubs is placed at its buyer and none is a man I sold. Printed: how often a man I sold stood in the top 120 a
 *      window draws from (none at all cannot run).
 *  11. my own results (the brief's decision 5, the read review's major D): Aberdeen, Motherwell and St Mirren
 *      (2026-27), seeds 1 to 3, two seasons without a reload, BASE and the head on one stream, walked step by step.
 *      A step counts while no AI deal line seen so far on either arm names a club of my league or a club I have
 *      played; the first step that breaks that ends the comparison (a touched club changes the draws from there on,
 *      by design). Within season one every result of my own matches and the draw count equal BASE's (asserted).
 *      From the first summer the world's club strengths are worked out again from rosters the recording changed, so
 *      the simulated matches of clubs that bought or sold, in any league, draw a different number of times and the
 *      one shared stream moves (r1344-fx4's trace); where that happens is printed, not asserted: the brief's
 *      decision 5 cannot hold draw for draw across a summer under one stream, and that is the lead's to rule.
 *      Under 100 results of season one compared cannot run.
 *  12. the window entry's time (the lead's ruling 4, the critic's correction 20): the 2026-27 trio, seeds 1 to 3,
 *      played on BASE and on the head to the January of season 6; the playNextEntry call that opens it is timed
 *      WINDOW_TRIALS times on each engine, alternating, each from a fresh load of the same save, and the head's median
 *      may be at most 3 times BASE's plus 5 ms. A timing red is rerun alone once before it is called red.
 *
 * MEASURED AT STEP 1 (GitHub runners, 2026-10-16; the head was the base plus scripts and a throwaway probe,
 * scripts/lib/cmAiRecordProbe1344.mjs, removed at step 2 and kept in the history at ee949025 and 21b3fa70):
 *   section 1 on the base: RED in all three worlds (r1344-wm3: in 2026-27 (i) 812, (ii) 0, (iii) 649); with the
 *     probe GREEN, 0 unplaced, so the section measures the recording and nothing else.
 *   section 6: green; CONTROL=seedless FIRED, 18 failures.
 *   section 9: the table is in the round's notes, docs/audits/ROUND-1344-NOTES.md; the January entry took 37.8 ms on
 *     the base and about 255 ms with the probe (recorded deal by deal), which is why ruling 4 packs once a window.
 *
 * ENV. CM_WORLD_MOVES_SECTIONS (default 0,1,2,3,4,5,6,7,8,10,11,12), CM_WORLD_MOVES_SEEDS (a list or a range, 1-10; default per
 * section), CM_WORLD_MOVES_ERAS (default now,era2015,era2005), CM_WORLD_MOVES_BASE (default the commit the branch
 * started from), CM_WORLD_MOVES_SHAPE_ARMS (default base,head), CM_WORLD_MOVES_SEASONS (section 9, default 15),
 * CM_WORLD_MOVES_OUT (section 9's JSON folder, default $RC_OUT or the temp folder).
 * CONTROLS, each must go red on its own section (exit 1, the last line says FIRED); a control with a window must
 * also have its FIRST red at that window (the critic's correction 13: every later rollover goes red too):
 *   CM_WORLD_MOVES_CONTROL=seedless   the guard of recordActualRosterTransfer out of the head: section 6 red
 *   CM_WORLD_MOVES_CONTROL=norecord   no AI deal is recorded anywhere (the window's record line and recordAiDeals'
 *                                     loop out): section 1 red, first at the opening window
 *   CM_WORLD_MOVES_CONTROL=noflush    startCareer's last line back to `return state;`: section 1 red, first at the
 *                                     opening window (read before its first save; after the save the repair on
 *                                     load mends it, which is why it is read there since the review)
 *   CM_WORLD_MOVES_CONTROL=nojanuary  January's window keeps the ledger it had: section 1 red, first in January
 *   CM_WORLD_MOVES_CONTROL=nosummer   the summer's window keeps the ledger it had: section 1 red, first in the summer
 *   CM_WORLD_MOVES_CONTROL=joinledger joinClubNow takes the departed career's ledger again: section 3 red
 *   CM_WORLD_MOVES_CONTROL=nolock     the refusal's sentence out (a joined man is for sale): section 4 red
 *   CM_WORLD_MOVES_CONTROL=nolist     marketForScreen hands back buildMarket's list: section 4 red
 *   CM_WORLD_MOVES_CONTROL=norepair   the call out of loadCareer: section 5 red
 *   CM_WORLD_MOVES_CONTROL=repairthrows  the repair throws first thing: section 5 red on the unmended lines, while
 *                                     every save still loads, byte equal to BASE's load (else it did not fire)
 *   CM_WORLD_MOVES_CONTROL=nohijackmakeOffer's hijack records nothing: section 2 red on the hijack arm only
 *   CM_WORLD_MOVES_CONTROL=nowalk     walkAway's rival close records nothing: section 2 red on the walk arm only
 *   CM_WORLD_MOVES_CONTROL=noguard    a rival closes whatever the ledger says: section 2 red on the protected arms
 *   CM_WORLD_MOVES_CONTROL=nocarry    a job move carries the gone names but not their deal lines: section 3 red
 *   CM_WORLD_MOVES_CONTROL=seasonone  a seeded run in starts at season one again (startCareer stops taking the
 *                                     departed career's season): section 3 red at the season two joins
 *   CM_WORLD_MOVES_CONTROL=dropbase   the screen lists only the joined men: section 4 red
 *   CM_WORLD_MOVES_CONTROL=noskip     the window publishes a deal the ledger refuses: section 10 red
 *   CM_WORLD_MOVES_CONTROL=drawshift  every recorded AI deal takes one draw: section 11 red
 *   CM_WORLD_MOVES_CONTROL=slow       the window packs the ledger after every deal again (the step 1 probe's way):
 *                                     section 12 red
 *   CM_WORLD_MOVES_COMBINE_CONTROL=shift  --combine adds 0.2 to the head's top five XI at season 10: red
 * Exit 0 green, 1 red or a control that fired, 2 could not run, 3 a control that did not fire.
 *
 *   node scripts/simCmWorldMoves.mjs
 *   CM_WORLD_MOVES_SECTIONS=9 CM_WORLD_MOVES_SEEDS=1-5 node scripts/simCmWorldMoves.mjs
 *   node scripts/simCmWorldMoves.mjs --combine a.json b.json ...
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { withoutAiMoves, BRIDGE_FILES, bridgeAnchorCounts } from './lib/cmNoAiMoves1344.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const cannot = why => { console.log(`simCmWorldMoves: cannot run: ${why}`); process.exit(2); };
const lf = s => s.split('\r\n').join('\n');
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);
const range = (text, fallback) => {
  if (!text) return fallback;
  const out = [];
  for (const part of text.split(',')) {
    const [a, b] = part.split('-').map(Number);
    if (!Number.isInteger(a) || (b !== undefined && !Number.isInteger(b))) cannot(`not a seed list: ${text}`);
    for (let i = a; i <= (b ?? a); i += 1) out.push(i);
  }
  return out;
};

const COMBINE = process.argv[2] === '--combine';   // handled at the end of the file, once every helper exists

/* The commit this branch started from (origin/main at the claim, Release BG live; src equal to bd3b6244). */
const BASE = process.env.CM_WORLD_MOVES_BASE || 'd4f2c6f688d656205722ba52bbdb33f03490966a';
const SECTIONS = new Set(range(process.env.CM_WORLD_MOVES_SECTIONS, [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12]));
const ERAS = (process.env.CM_WORLD_MOVES_ERAS || 'now,era2015,era2005').split(',');
if (process.env.CM_WORLD_MOVES_HEAD) cannot('CM_WORLD_MOVES_HEAD is gone: the step 1 probe was removed at step 2 (the head records the deals itself)');
const CONTROL = process.env.CM_WORLD_MOVES_CONTROL || '';
/* The window's record line in generateHeadlines and the summer and January calls, as they stand in the engine. */
const RECORD_LINE = '    if (working && seen) { const moved = recordAiDeal(working, { mp, to: buyer, fee }, seen); if (moved === working) continue; working = moved; }\n    else unrecorded.push({ mp, to: buyer, fee });\n';
const JANUARY_CALL = '      generateHeadlines(state);\n      // Round 135:';
const SUMMER_CALL = '  state.intl = freshIntl(state);\n  generateHeadlines(state);\n';
/* joinClubNow's carried log (seededJoinCarry, src/lib/clubManagerCalendar.ts), the review of 2026-10-16. */
const CARRY_LINE = '    transferLog: [...lines, ...(s.transferLog ?? [])].slice(-SAVE_CAPS.transferLog),\n';
const keepLedger = indent => `${indent}{ const held1344 = state.worldRoster; generateHeadlines(state); if (held1344 === undefined) delete state.worldRoster; else state.worldRoster = held1344; }\n`;
/* Each control: the section it must turn red, the window its first red must be at (section 1), and its edits of
   this tree's engine, [anchor, replacement]. */
const CONTROLS = {
  seedless: { section: 6, edits: [['  if (!livingWorldOf(state)) return state;\n', '']] },
  norecord: { section: 1, first: 'opening', edits: [[RECORD_LINE, '    unrecorded.push({ mp, to: buyer, fee });\n'],
    ['  for (const deal of deals) next = recordAiDeal(next, deal, state);\n', '']] },
  noflush: { section: 1, first: 'opening', edits: [['  return recordAiDeals(state, unrecorded);\n}\n', '  return state;\n}\n']] },
  nojanuary: { section: 1, first: 'january', edits: [[JANUARY_CALL, `${keepLedger('      ')}      // Round 135:`]] },
  nosummer: { section: 1, first: 'summer', edits: [[SUMMER_CALL, `  state.intl = freshIntl(state);\n${keepLedger('  ')}`]] },
  joinledger: { section: 3, file: 'src/lib/clubManagerCalendar.ts', edits: [['    ...(s.worldRoster !== undefined ? { worldRoster: plainCopy(s.worldRoster) }\n      : departed.worldRoster === undefined ? {} : { worldRoster: plainCopy(departed.worldRoster) }),\n',
    '    ...(departed.worldRoster === undefined ? {} : { worldRoster: plainCopy(departed.worldRoster) }),\n']] },
  nolock: { section: 4, edits: [["  return `${mp.name} only joined ${mp.club} this season. They will not sell him on until ${career.transferWindow === 'summer' ? 'next summer' : 'the summer'}.`;\n", '  return null;\n']] },
  nolist: { section: 4, edits: [['  if (!gone.size || !worldRosterView(career)) return market;\n', '  return market;\n']] },
  norepair: { section: 5, edits: [['    repairAiMoves(parsed);\n', '']] },
  repairthrows: { section: 5, loads: true, edits: [["  try {\n    if (worldSeedOf(state) === undefined || !eraRostersLoaded(state.eraId)", "  try {\n    if (Math.abs(1) === 1) throw new Error('the repairthrows control');\n    if (worldSeedOf(state) === undefined || !eraRostersLoaded(state.eraId)"]] },
  nohijack: { section: 2, arm: 'hijack', edits: [['      return recordAiDeals(state, [{ mp: next.player, to: next.rivalBidder, fee: next.rivalOffer }]);\n', '      return state;\n']] },
  nowalk: { section: 2, arm: 'walk', edits: [['    return recordAiDeals(state, [{ mp: neg.player, to: neg.rivalBidder, fee: neg.rivalOffer }]);\n', '    return state;\n']] },
  noguard: { section: 2, edits: [['  return livingWorldOf(career) && recordAiDeal(career, deal, career) === career;\n', '  return false;\n']] },
  nocarry: { section: 3, file: 'src/lib/clubManagerCalendar.ts', edits: [[CARRY_LINE, '    transferLog: s.transferLog,\n']] },
  seasonone: { section: 3, edits: [['    state.season = world.rosterCareer.season;\n', '']] },
  dropbase: { section: 4, edits: [['  return world.filter(p => listed.has(at(p)) || joined.has(at(p))).map(', '  return world.filter(p => joined.has(at(p))).map(']] },
  noskip: { section: 10, edits: [['; if (moved === working) continue; working = moved; }\n', '; working = moved; }\n']] },
  drawshift: { section: 11, edits: [['  const player = aiDealPlayer(seen, deal.mp);\n', '  Math.random();\n  const player = aiDealPlayer(seen, deal.mp);\n']] },
  slow: { section: 12, edits: [[RECORD_LINE, '    if (working && seen) { const moved = recordAiDeal(working, { mp, to: buyer, fee }, working); if (moved === working) continue; working = packedLedger(moved); }\n    else unrecorded.push({ mp, to: buyer, fee });\n']] },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`);
/* A control runs its own section and the anchors only, unless the sections are named. */
if (CONTROL && !process.env.CM_WORLD_MOVES_SECTIONS) { SECTIONS.clear(); SECTIONS.add(0); }
if (CONTROL) SECTIONS.add(CONTROLS[CONTROL].section);
/* The careers of sections 1 and 6: a big club, a mid table club and a thin squad's club in each world. Aberdeen's
   2026-27 squad is CM_PARTIAL; Carpi and Treviso were the promoted sides with the thinnest bakes of their eras. */
const CLUBS = {
  now: ['Real Madrid', 'Everton', 'Aberdeen'],
  era2015: ['Bayern Munich', 'Stoke City', 'Carpi'],
  era2005: ['Chelsea', 'Bolton Wanderers', 'Treviso'],
};
for (const era of ERAS) if (!CLUBS[era]) cannot(`no careers named for the world ${era}`);
const OPT = { skipHalftime: true, noCoach: true };
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base commit ${BASE.slice(0, 8)} is not in this clone (fetch its history)`); }

/* ---------- the engines ---------- */
let esbuild;
try { esbuild = await import('esbuild'); } catch { cannot('esbuild is not installed'); }
/* Section 0's ledger: every edit made, by name, and how often it was made. */
const made = new Map();
function editOf(edits, name) {
  return text => {
    let out = text;
    for (const [from, to] of edits) {
      const n = out.split(from).length - 1;
      if (n !== 1) cannot(`${name}: its anchor is in ${ENGINE} ${n} times, it must be exactly once: ${from.trim().slice(0, 80)}`);
      out = out.replace(from, () => to);
      made.set(`${name}: ${from.trim().slice(0, 60)}`, (made.get(`${name}: ${from.trim().slice(0, 60)}`) ?? 0) + 1);
    }
    return out;
  };
}
/** One engine bundled once; each career runs in a fresh context, so module state never leaks between careers.
    `base` reads every source file from BASE; `edit` rewrites the engine file. */
async function engine(label, { base = false, edit = null, editFile = ENGINE, bridge = false } = {}) {
  let edited = false;
  const bridged = new Set();
  const plugin = {
    name: `world-moves-${label}`,
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        if (!rel.startsWith('src/')) return null;
        let text = base
          ? lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }))
          : lf(fs.readFileSync(args.path, 'utf8'));
        if (edit && rel === editFile) { text = edit(text); edited = true; }
        if (bridge) { const out = withoutAiMoves(text, rel); if (out !== text) { text = out; bridged.add(rel); } }
        return { contents: text, loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\nexport * as ledger from './src/lib/clubManagerWorldRoster';\nexport * as cal from './src/lib/clubManagerCalendar';\n";
  const out = await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: `world-moves-${label}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  if (edit && !edited) cannot(`the ${label} engine was to be edited and ${editFile} was never loaded`);
  if (bridge && bridged.size !== BRIDGE_FILES.length) cannot(`the ${label} engine was to carry the bridge and only ${[...bridged].join(', ') || 'no file'} took it`);
  const script = new vm.Script(out.outputFiles[0].text, { filename: `world-moves-${label}.cjs` });
  return {
    label,
    async fresh() {
      const module = { exports: {} }, store = new Map(), NOW = 1791633600000;
      class HeldDate extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
      const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')),
        console, process, Buffer, Math, Date: HeldDate, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, performance,
        setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('no network here')),
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
      script.runInContext(ctx);
      await module.exports.eras.ensureAllEraRosters();
      return { ...module.exports, store };
    },
  };
}

/* ---------- shared pieces ---------- */
function stream(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let v = s; v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
}
const mix = (...parts) => parseInt(sha(parts.join('|')).slice(0, 8), 16) >>> 0;
/** fn under Math.random on its own stream, every draw kept (section 6 compares their number and values). */
let tapeNow = [];   // Round 1508: the draws of the tape running now, so section 6 can mark the first summer
function tape(seed, fn) {
  const next = stream(seed), draws = [], keep = Math.random;
  tapeNow = draws;
  Math.random = () => { const d = next(); draws.push(d); return d; };
  try { return { value: fn(), draws }; } finally { Math.random = keep; }
}
const failures = {}, shown = {};
const fail = (section, line) => {
  (failures[section] ??= []).push(line);
  shown[section] = (shown[section] ?? 0) + 1;
  if (shown[section] <= 8) console.log(`  FAIL section ${section}: ${line}`);
};
/** Section 1's failures counted by check: (i) placed at the buyer, (ii) the one club rule, (iii) still there later. */
const checks = {};
/* Which window or rollover section 1 is checking, and the first one that went red (a control's must be its own). */
let phase1 = null, firstRed1 = null;
const fail1 = (check, line) => { checks[check] = (checks[check] ?? 0) + 1; firstRed1 ??= phase1; fail(1, line); };
/** The lines one step added to the transfer log. The log keeps its last 80, so the oldest may have gone. */
function addedLines(before, after) {
  const b = (before ?? []).map(x => JSON.stringify(x)), a = (after ?? []).map(x => JSON.stringify(x));
  for (let added = 0; added <= a.length; added += 1) {
    const kept = a.length - added;
    if (kept > b.length) continue;
    let same = true;
    for (let i = 0; i < kept && same; i += 1) same = a[i] === b[b.length - kept + i];
    if (same) return (after ?? []).slice(kept);
  }
  return [...(after ?? [])];
}
/** PR269's rule for a deal between two other clubs: a new line, not a loan, neither club mine. */
const aiLine = mine => line => !line.loan && line.from !== mine && line.to !== mine && line.from !== 'a free transfer' && line.to !== 'a free transfer';
/** Every club of the career's world but mine, and every club the ledger names as an owner. */
function worldClubs(M, s) {
  const era = s.eraId ?? 'now';
  const names = M.eras.isHistoricEra(era)
    ? M.cm.eraLeaguesFor(era).flatMap(l => l.clubs)
    : M.cm.REAL_LEAGUES.flatMap(l => M.cm.playableClubs(l.id).map(c => c.name));
  const out = new Set(names);
  for (const record of M.ledger.readWorldRoster(s)?.records ?? []) if (record.owner) out.add(record.owner);
  out.delete(s.clubName);
  return [...out];
}
const madeUp = p => p.generated === true || p.academyGrad === true || p.isYouth === true;
/** Where the ledger and the world put one deal line's man: his owned record at the buyer, listed there, not at the seller. */
function placement(M, s, line) {
  const records = (M.ledger.readWorldRoster(s)?.records ?? []).filter(r => r.status === 'owned' && r.owner === line.to && r.player.name === line.name);
  if (records.length !== 1) return records.length ? `${records.length} owned records of him at ${line.to}` : `the ledger holds no record of him at ${line.to}`;
  const record = records[0], year = M.cm.worldYear(s);
  if (!M.cm.worldRosterFor(s, line.to).some(p => p.worldRosterKey === record.key)) return `${line.to} does not list him`;
  const sameMan = p => p.worldRosterKey === record.key || p.n === record.origin.name && year - p.a === record.origin.birthYear && p.p === record.origin.position;
  if (M.cm.worldRosterFor(s, line.from).some(sameMan)) return `${line.from} still lists him`;
  return null;
}
/** Section 1 (ii), the one club rule over every club of the world. Returns how many men were checked. */
function oneClubRule(M, s, label) {
  const year = M.cm.worldYear(s), at = new Map(), origin = new Map();
  const add = (map, key, club) => { const list = map.get(key); if (list) list.push(club); else map.set(key, [club]); };
  for (const club of worldClubs(M, s)) {
    for (const p of M.cm.worldRosterFor(s, club)) {
      if (p.worldRosterKey) add(at, p.worldRosterKey, club);
      add(origin, `${p.n}|${year - p.a}|${p.p}`, club);
    }
  }
  for (const [key, clubs] of at) if (clubs.length > 1) fail1('ii', `${label}:the key ${key} is listed at ${clubs.join(' and ')}`);
  for (const r of M.ledger.readWorldRoster(s)?.records ?? []) {
    if (r.status !== 'owned' || r.owner === s.clubName) continue;
    const where = at.get(r.key) ?? [];
    if (where.length !== 1 || where[0] !== r.owner) fail1('ii', `${label}:${r.player.name}, owned by ${r.owner}, is listed at ${where.join(' and ') || 'no club'}`);
    const twins = (origin.get(`${r.origin.name}|${r.origin.birthYear}|${r.origin.position}`) ?? []).filter(c => c !== r.owner);
    if (twins.length) fail1('ii', `${label}:a man matching ${r.origin.name}'s origin (${r.origin.club}, born ${r.origin.birthYear}) is still listed at ${twins.join(' and ')}`);
  }
  let mine = 0;
  for (const p of s.squad) {
    if (madeUp(p) || p.onLoan) continue;
    mine += 1;
    const clubs = origin.get(`${p.name}|${year - p.age}|${p.position}`) ?? [];
    if (clubs.length) fail1('ii', `${label}:${p.name} of my squad is also listed at ${clubs.join(' and ')}`);
  }
  return at.size + mine;
}

/* ---------- section 4, the market (run inside section 1's careers) ---------- */
const s4 = { lines: 0, listed: 0, namesake: 0, doors: 0, buyLocked: 0, nextSummer: 0, bought: 0, gone: 0, screenMs: 0, baseMs: 0, calls: 0, kept: 0, marked: 0 };
const joinedLine = (name, club, s) => `${name} only joined ${club} this season. They will not sell him on until ${s.transferWindow === 'summer' ? 'next summer' : 'the summer'}.`;
/** At a window: every man of its deal lines is listed at his buyer, marked, and every door refuses him in today's order. */
function marketAt(M, s, lines, label, pending) {
  M.cm.buildMarket(s);   // warm the shared world list, so the two timings below compare the filters
  let t0 = performance.now(); const screen = M.cm.marketForScreen(s); s4.screenMs += performance.now() - t0;
  t0 = performance.now(); M.cm.buildMarket(s); s4.baseMs += performance.now() - t0; s4.calls += 1;
  s4.lines += lines.length;
  /* The review of 2026-10-16 (the read review's minor 5, and the root of both product majors): the screen keeps every
     row buildMarket lists, and every row it marks joinedThisSeason is refused by Talk and buy, pressed on a copy
     with the window open, the budget high and no talks running. */
  const onScreen = new Set(screen.map(p => `${p.name}|${p.club}`));
  for (const p of M.cm.buildMarket(s)) { s4.kept += 1; if (!onScreen.has(`${p.name}|${p.club}`)) fail(4, `${label}: buildMarket lists ${p.name} at ${p.club} and the screen does not`); }
  const doorsAt = { ...s, transferWindow: s.transferWindow ?? 'january', budget: 9999, negotiation: null };
  for (const p of screen.filter(x => x.joinedThisSeason)) for (const door of ['talk', 'buy']) {
    s4.marked += 1;
    if (M.cm.doorRefusal(doorsAt, p, door) === null) fail(4, `${label}: ${p.name} is marked joinedThisSeason at ${p.club} and the ${door} door opens`);
  }
  for (const line of lines) {
    const row = screen.find(p => p.name === line.name && p.club === line.to);
    if (!row) {
      /* worldMarket lists one man per name (the Paulinho and Allan rule): a namesake elsewhere can hide him. */
      if (screen.some(p => p.name === line.name) || s.squad.some(p => p.name === line.name)) { s4.namesake += 1; continue; }
      fail(4, `${label}: ${line.name}, bought by ${line.to}, is not on the screen's market there`); continue;
    }
    s4.listed += 1;
    if (row.joinedThisSeason !== true) fail(4, `${label}: ${line.name} is listed at ${line.to} without joinedThisSeason`);
    const without = { ...s, transferLog: (s.transferLog ?? []).filter(t => !(t.name === line.name && t.to === line.to && t.season === s.season)) };
    for (const door of ['buy', 'clause', 'loan', 'talk']) {
      s4.doors += 1;
      const want = M.cm.doorRefusal(without, row, door) ?? joinedLine(line.name, line.to, s);
      const got = M.cm.doorRefusal(s, row, door);
      if (got !== want) fail(4, `${label}: the ${door} door on ${line.name} answers "${got}", wanted "${want}"`);
      if (door === 'buy' && got === joinedLine(line.name, line.to, s)) s4.buyLocked += 1;
    }
    pending.set(line.name, { to: line.to, label });
  }
}
/** At the next summer: a man bought last season is on sale at his club like anyone else. */
function nextSummerAt(M, s, pending, resold, label) {
  const market = M.cm.buildMarket(s);
  const records = M.ledger.readWorldRoster(s)?.records ?? [];
  for (const [name, man] of pending) {
    if (resold.has(name) || s.goneNames.includes(name)) { s4.gone += 1; continue; }
    const owned = records.find(r => r.status === 'owned' && r.owner === man.to && r.player.name === name);
    if (!owned) { s4.gone += 1; continue; }   // retired, or released: the ledger says where he is, section 1 checks it
    const row = market.find(p => p.name === name && p.club === man.to);
    if (!row) {
      if (market.some(p => p.name === name) || s.squad.some(p => p.name === name)) { s4.namesake += 1; continue; }
      fail(4, `${label}: ${name}, bought by ${man.to} at ${man.label}, is not on sale there a season later`); continue;
    }
    s4.nextSummer += 1;
    const why = M.cm.doorRefusal(s, row, 'buy');
    if (why === joinedLine(name, man.to, s)) fail(4, `${label}: ${name} is still refused as a new signing a season later`);
    if (why === null) {
      /* buyPlayer on its own stream, so section 1's careers play the same whether or not section 4 runs. */
      const keep = Math.random; Math.random = stream(mix('buy4', label, name));
      try { if (M.cm.buyPlayer(s, row)) s4.bought += 1; else fail(4, `${label}: the buy door is open on ${name} and buyPlayer refused him`); }
      finally { Math.random = keep; }
    }
  }
  pending.clear();
}

/* ---------- section 1, ownership ---------- */
const S1_SEASONS = 6;
const tally = {};   // per window type: deals, refused, records, stored, windows
let s1Careers = 0, s1Checked = 0, s1Tracked = 0, s1Rollovers = 0, s1Sacked = 0;
async function ownershipCareer(E, era, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('own', era, club, seed));
  const tag = `${club} (${era}, seed ${seed})`;
  const moved = new Map();   // name -> { to, since }
  const pending4 = new Map();   // section 4: name -> { to, label }, checked at the next summer
  const reload = (st, label) => {
    M.store.clear();
    if (!M.cm.saveCareer(st)) { fail(1, `${tag} ${label}: the save was refused`); return st; }
    const back = M.cm.loadCareer();
    if (!back) { fail(1, `${tag} ${label}: the save did not load`); return st; }
    return back;
  };
  const atWindow = (kind, label, s, before) => {
    phase1 = kind;
    const lines = addedLines(before, s.transferLog).filter(aiLine(s.clubName));
    const held = M.ledger.readWorldRoster(s);
    const row = tally[kind] ??= { windows: 0, deals: 0, refused: 0, records: 0, stored: 0 };
    row.windows += 1; row.deals += lines.length; row.records += held?.records.length ?? 0;
    row.stored += s.worldRoster === undefined ? 0 : JSON.stringify(s.worldRoster).length;
    for (const line of lines) {
      const why = placement(M, s, line);
      if (why) { row.refused += 1; fail1('i',`${tag} ${label}: ${line.to} signed ${line.name} from ${line.from}, but ${why}`); }
      moved.set(line.name, { to: line.to, since: label });
    }
    s1Checked += oneClubRule(M, s, `${tag} ${label}`);
    if (SECTIONS.has(4)) marketAt(M, s, lines, `${tag} ${label}`, pending4);
  };
  const atRollover = (s, label, before) => {
    phase1 = 'rollover';
    const resold = new Set(addedLines(before, s.transferLog).filter(aiLine(s.clubName)).map(line => line.name));
    s1Rollovers += 1;
    if (SECTIONS.has(4)) nextSummerAt(M, s, pending4, resold, `${tag} ${label}`);
    const records = M.ledger.readWorldRoster(s)?.records ?? [];
    for (const [name, man] of moved) {
      if (resold.has(name)) continue;   // moved again in this summer's window: section (i) places him there
      s1Tracked += 1;
      if (records.some(r => r.status === 'retired' && r.origin.name === name)) { moved.delete(name); continue; }
      const record = records.find(r => r.status === 'owned' && r.owner === man.to && r.player.name === name);
      if (!record) { fail1('iii', `${tag} ${label}: ${name}, moved to ${man.to} at ${man.since},has no owned record there`); moved.delete(name); continue; }
      if (!M.cm.worldRosterFor(s, man.to).some(p => p.worldRosterKey === record.key)) { fail1('iii', `${tag} ${label}: ${name}, moved to ${man.to} at ${man.since},is not listed there`); moved.delete(name); }
    }
  };
  try {
    let s = M.cm.startCareer(club, era);
    if (M.cm.worldSeedOf(s) === undefined) cannot(`${tag}: a new career carries no worldSeed`);
    s1Careers += 1;
    /* The review of 2026-10-16 (the run review's M3): the opening window is checked first on the state startCareer
       hands back, BEFORE its first save and load, because the repair on load mends a missing flush and hid it from
       the noflush control (a player who plays on without reloading never meets the repair). */
    phase1 = 'opening';
    for (const line of addedLines([], s.transferLog).filter(aiLine(s.clubName))) {
      const why = placement(M, s, line);
      if (why) fail1('i', `${tag} the opening window, before any save: ${line.to} signed ${line.name} from ${line.from}, but ${why}`);
    }
    s = reload(s, 'the opening window');
    atWindow('opening', 'the opening window', s, []);
    for (let season = 1; season <= S1_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = s.transferLog, r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'window') { s = reload(s, `January of season ${season}`); atWindow('january', `January of season ${season}`, s, before); }
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { s1Sacked += 1; console.log(`  ${tag}: sacked in season ${season}, the run stops there`); break; }
      s = M.cm.finishSeason(s).state;
      if (season === S1_SEASONS) break;
      const before = s.transferLog;
      s = reload(M.cm.startNextSeason(s), `the summer before season ${season + 1}`);
      atRollover(s, `the rollover to season ${season + 1}`, before);
      atWindow('summer', `the summer before season ${season + 1}`, s, before);
    }
  } finally { Math.random = keep; }
}

/* ---------- section 2, negotiation ---------- */
/** fn under Math.random fed a fixed vector; one draw past its end throws. Returns the value and the draws taken. */
function onVector(values, fn) {
  const keep = Math.random; let taken = 0;
  Math.random = () => { if (taken >= values.length) throw new Error('a draw past the vector'); return values[taken++]; };
  try { return { value: fn(), taken }; } finally { Math.random = keep; }
}
const s2 = { hijack: { set: 0, owned: 0 }, walk: { set: 0, owned: 0 }, unset: 0 };
/* PR269's own scripts (src/test/managerAiOwnership.test.ts at 1923d291): a card a career can afford, under 27,
   with one source at its club; startNegotiation on [.6, .99, .6]; an offer at 0.8 of the ask on [.6, .01, .5, .5]
   brings the rival in; then the hijack (makeOffer again on [.01]) or the walk away (walkAway on [.01]). */
async function negotiationCareer(E, era, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('negotiate', era, club, seed));
  let s;
  try { s = M.cm.startCareer(club, era); } finally { Math.random = keep; }
  const tag = `${club} (${era}, seed ${seed})`;
  const card = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 27 && p.price >= 3 && p.price * 1.2 <= s.budget
    && M.cm.oppRosterFor(s, p.club).filter(x => x.n === p.name && x.a === p.age).length === 1);
  const started = card && onVector([0.6, 0.99, 0.6], () => M.cm.startNegotiation(s, card)).value;
  const amount = started?.negotiation ? Math.round(started.negotiation.theirAsk * 0.8 * 10) / 10 : 0;
  const war = started?.negotiation?.status === 'open' ? onVector([0.6, 0.01, 0.5, 0.5], () => M.cm.makeOffer(started, amount)).value : null;
  const neg = war?.negotiation;
  if (!neg || neg.status !== 'open' || !neg.rivalBidder || neg.rivalOffer === null) { s2.unset += 1; return; }
  for (const arm of ['hijack', 'walk']) {
    let run;
    try { run = onVector([0.01], () => arm === 'hijack' ? M.cm.makeOffer(war, amount) : M.cm.walkAway(war)); }
    catch (e) { fail(2, `${tag} ${arm}: ${e.message}`); continue; }
    s2[arm].set += 1;
    const after = run.value;
    if (run.taken !== 1) fail(2, `${tag} ${arm}: took ${run.taken} draws, the vector holds 1`);
    if (arm === 'hijack' && after?.negotiation?.status !== 'hijacked') { fail(2, `${tag} hijack: the rival did not close`); continue; }
    const line = { name: neg.player.name, from: neg.player.club, to: neg.rivalBidder };
    const why = placement(M, after, line);
    if (why) fail(2, `${tag} ${arm}: ${line.to} took ${line.name} from ${line.from}, but ${why}`);
    else s2[arm].owned += 1;
  }
}

/* The review of 2026-10-16 (both reviews' first major, the other lane's PR295): a rival never closes a deal the ledger
   refuses. Two men the lead's ruling 3 protects: one I SOLD (a 2026-27 career sells its second best outfield man at
   the start through acceptBid, the section 7 way, and plays the season out; at the next summer he is on sale at his
   buyer) and one I LEFT BEHIND (the career takes a job at week 6 through joinClubNow, and a man of my old squad is
   on sale at my old club). On a copy with the window open and the budget high, so the war and not the purse decides,
   PR269's vectors open a bidding war on him; then the hijack (makeOffer on [.01]) and, from the same state, the walk
   away (walkAway on [.01]) take exactly one draw and say nowhere that he moved: no news line, no gone name, no new
   headline, the talks not hijacked, his ledger record as it was. */
const s2p = { sold: { tried: 0, set: 0, held: 0, unprotected: 0 }, behind: { tried: 0, set: 0, held: 0, unprotected: 0 } };
const ledgerRecordOf = (M, st, name) => JSON.stringify((M.ledger.readWorldRoster(st)?.records ?? []).filter(r => r.player.name === name));
async function protectedCareer(E, club, seed, kind) {
  const M = await E.fresh(), keep = Math.random, row = s2p[kind];
  Math.random = stream(mix('protected', club, seed, kind));
  const tag = `${club} (now, seed ${seed}, a man I ${kind === 'sold' ? 'sold' : 'left behind'})`;
  row.tried += 1;
  let s, name, holder;
  try {
    s = M.cm.startCareer(club, 'now');
    if (kind === 'sold') {
      const man = [...s.squad].filter(p => !p.onLoan && p.position !== 'GK' && !p.isYouth).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
      const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
      const bid = man && buyer ? { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' } : null;
      const sold = bid && M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id);
      if (!sold) return;
      s = sold; name = man.name; holder = buyer;
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) return;
      s = M.cm.startNextSeason(M.cm.finishSeason(s).state);
    } else {
      /* Ruling 3 covers a man I SIGNED and left behind (his record carries my squad's payload): the career buys one
         at the start (the section 7 way, the purse lifted for the buy only), plays to week 6 and takes the job. */
      const have = new Set(s.squad.map(p => p.name));
      const mp = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !have.has(p.name));
      const bought = mp && M.cm.buyPlayer({ ...s, budget: 9999, wageCap: 9999 }, mp);
      if (!bought) return;
      s = { ...bought, budget: s.budget, wageCap: s.wageCap };
      for (let guard = 0; guard < 400 && s.week < 6; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) return;
      }
      if (!s.squad.some(p => p.name === mp.name)) return;
      const to = JOIN_TO[club];
      const league = M.cm.REAL_LEAGUES.find(l => M.cm.playableClubs(l.id).some(c => c.name === to))?.id;
      const open = { club: to, league, tier: 1, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
      holder = s.clubName;
      const j = M.cal.joinClubNow({ ...s, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } });
      if (!j || j.clubName !== to) return;
      s = j;
      name = mp.name;
    }
  } finally { Math.random = keep; }
  const card = name && M.cm.buildMarket(s).find(p => p.name === name && p.club === holder);
  if (!card) return;
  const st = { ...s, budget: 9999, wageCap: 9999, transferWindow: s.transferWindow ?? 'january', negotiation: null };
  if (M.cm.aiDealPlayer(st, card) !== null) { row.unprotected += 1; fail(2, `${tag} protected: the ledger does not protect ${name} at ${holder} (ruling 3)`); return; }
  let war, amount;
  try {
    const started = onVector([0.6, 0.99, 0.6], () => M.cm.startNegotiation(st, card)).value;
    amount = started?.negotiation ? Math.round(started.negotiation.theirAsk * 0.8 * 10) / 10 : 0;
    war = started?.negotiation?.status === 'open' ? onVector([0.6, 0.01, 0.5, 0.5], () => M.cm.makeOffer(started, amount)).value : null;
  } catch { return; }
  const neg = war?.negotiation;
  if (!neg || neg.status !== 'open' || !neg.rivalBidder || neg.rivalOffer === null) return;
  row.set += 1;
  const before = ledgerRecordOf(M, war, name);
  let held = true;
  for (const arm of ['hijack', 'walk']) {
    const label = `${tag} protected-${arm}:`;
    const bad = why => { held = false; fail(2, `${label} ${why}`); };
    let run;
    try { run = onVector([0.01], () => arm === 'hijack' ? M.cm.makeOffer(war, amount) : M.cm.walkAway(war)); }
    catch (e) { bad(e.message); continue; }
    const after = run.value;
    if (run.taken !== 1) bad(`took ${run.taken} draws, the vector holds 1`);
    if (!after) { bad('came back null'); continue; }
    if (arm === 'hijack' && after.negotiation?.status !== 'open') bad(`the talks went ${after.negotiation?.status ?? 'away'} (the rival closed on ${name})`);
    if (arm === 'walk' && after.negotiation !== null) bad('the talks did not end');
    if (JSON.stringify(after.transferLog) !== JSON.stringify(war.transferLog)) bad(`a news line says ${neg.rivalBidder} took ${name} from ${holder}`);
    if (JSON.stringify(after.goneNames) !== JSON.stringify(war.goneNames)) bad(`${name} went on goneNames`);
    if (JSON.stringify(after.aiHeadlines) !== JSON.stringify(war.aiHeadlines)) bad(`a headline says ${neg.rivalBidder} signed ${name}`);
    if (ledgerRecordOf(M, after, name) !== before) bad(`${name}'s ledger record changed`);
  }
  if (held) row.held += 1;
}

/* ---------- section 3, join ---------- */
const JOIN_TO ={ 'Real Madrid': 'Arsenal', Everton: 'Napoli', Aberdeen: 'Fulham' };
const s3 = { joins: 0, refused: 0, departed: 0, lines: 0, runIn: 0, gone: 0, carried: 0, payloads: 0, doors: 0, notOwned: 0, namesake: 0 };
/** A seeded 2026-27 career that takes a job mid season, before or after its January window, through joinClubNow. */
async function joinCareer(E, club, seed, when) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('join', club, seed, when));
  const tag = `${club} (now, seed ${seed}, ${when === 'second' ? 'in season two' : `${when} January`})`;
  try {
    let s = M.cm.startCareer(club, 'now'), january = false, after = 0;
    /* The review of 2026-10-16: a join in season two, where the run in's own lines (its fresh save's season one)
       must take this season's number for the refusal to read them. */
    if (when === 'second') {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { s3.refused += 1; return; }
      s = M.cm.startNextSeason(M.cm.finishSeason(s).state);
    }
    for (let guard = 0; guard < 400; guard += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      if (when !== 'after' && s.week >= 6) break;
      if (when === 'after' && january && (after += 1) > 3) break;
      const r = M.cm.playNextEntry(s, OPT);
      s = r.state;
      if (r.kind === 'window') january = true;
      if (r.kind === 'seasonOver' || s.sacked) { s3.refused += 1; return; }
    }
    const to = JOIN_TO[club];
    const league = M.cm.REAL_LEAGUES.find(l => M.cm.playableClubs(l.id).some(c => c.name === to))?.id;
    const open = { club: to, league, tier: 1, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted' };
    const j = M.cal.joinClubNow({ ...s, jobHunt: { open, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null } });
    if (!j || j.clubName !== to) { s3.refused += 1; return; }
    s3.joins += 1;
    const departed = M.ledger.readWorldRoster(M.cm.refreshWorldRoster(s))?.records ?? [];
    const joined = M.ledger.readWorldRoster(j)?.records ?? [];
    const byKey = new Map(joined.map(r => [r.key, r]));
    /* The review of 2026-10-16 (both reviews' second major): the joined log is the departed career's lines of this
       season's deals between two other clubs whose men stay gone, first, then the run in's own lines, every one with
       this season's number. The rest of this section reads the run in's lines only. */
    const movedBefore = new Set((s.transferLog ?? []).filter(aiLine(s.clubName)).filter(l => l.season === s.season).map(l => l.name));
    const keptGone = new Set(s.goneNames.filter(n => movedBefore.has(n)));
    const carried = (s.transferLog ?? []).filter(t => t.season === s.season && !t.loan && keptGone.has(t.name) && t.from !== s.clubName && t.to !== s.clubName);
    const log = j.transferLog ?? [];
    s3.carried += carried.length;
    if (JSON.stringify(log.slice(0, carried.length)) !== JSON.stringify(carried)) fail(3, `${tag}: the joined log does not open with the departed career's ${carried.length} deal lines of this season between two other clubs`);
    const stale = log.slice(carried.length).filter(t => t.season !== s.season);
    if (stale.length) fail(3, `${tag}: ${stale.length} of the run in's lines keep another season's number (${stale[0].season}, this season is ${s.season})`);
    const runLines = log.slice(carried.length).filter(line => !line.loan);
    const runNames = new Set(runLines.map(line => line.name));
    for (const r of departed) {
      s3.departed += 1;
      const k = byKey.get(r.key);
      if (!k) { fail(3, `${tag}: the departed ledger's ${r.player.name} (${r.owner ?? r.status}) is not in the joined ledger`); continue; }
      if ((k.owner !== r.owner || k.status !== r.status) && !runNames.has(r.player.name)) fail(3, `${tag}: ${r.player.name} moved from ${r.owner ?? r.status} to ${k.owner ?? k.status} with no deal line of the run in`);
    }
    for (const r of joined) if (!departed.some(d => d.key === r.key) && !runNames.has(r.player.name)) fail(3, `${tag}: the joined ledger holds ${r.player.name}, in no deal line of the run in nor the departed ledger`);
    for (const line of runLines.filter(aiLine(to))) {
      s3.lines += 1;
      const why = placement(M, j, line);
      if (why) fail(3, `${tag}: in the run in ${line.to} signed ${line.name} from ${line.from}, but ${why}`);
      else s3.runIn += 1;
    }
    /* The read review's minor 4 (the brief's decision 3, "payload equal or refreshed"): a departed record the run in
       did not move keeps its payload, read against the departed ledger exactly as joinClubNow builds it (my old
       squad's snapshot taken first), or carries a later year (refreshed). */
    const snapped = M.ledger.readWorldRoster(M.cm.refreshWorldRoster(M.ledger.snapshotWorldRosterClub(s, s.clubName)))?.records ?? [];
    for (const r of snapped) {
      const k = byKey.get(r.key);
      if (!k || k.owner !== r.owner || k.status !== r.status || runNames.has(r.player.name)) continue;
      s3.payloads += 1;
      if (k.year === r.year && JSON.stringify(k.player) !== JSON.stringify(r.player)) fail(3, `${tag}: ${r.player.name}'s payload changed across the move with no deal line of the run in`);
    }
    /* The men other clubs bought this season before the move stay gone after it (the men I bought, sold or let go
       keep today's rule). */
    for (const name of keptGone) { s3.gone += 1; if (!j.goneNames.includes(name)) fail(3, `${tag}: ${name}, bought by another club this season before the move, is buyable again after it`); }
    /* And no door sells them (the run review's M1 and m4: the gone name alone held, while the screen listed him and
       Talk opened): every man of this season's deals between two other clubs, carried or the run in's, is on the
       screen at the club the ledger says owns him, marked joinedThisSeason, and Talk and buy answer what they answer
       with his deal line taken out, or else the new sentence. The doors are pressed on a copy with the window open,
       the budget high and no talks running, since a shut window answers first. */
    const doorsAt = { ...j, transferWindow: j.transferWindow ?? 'january', budget: 9999, negotiation: null };
    const screen = M.cm.marketForScreen(doorsAt);
    const names = new Set([...carried, ...runLines.filter(aiLine(to))].map(t => t.name));
    for (const name of names) {
      if (j.squad.some(p => p.name === name)) continue;
      const owned = joined.filter(r => r.status === 'owned' && r.player.name === name);
      if (owned.length !== 1 || !owned[0].owner || owned[0].owner === to) { s3.notOwned += 1; continue; }
      const club = owned[0].owner;
      const row = screen.find(p => p.name === name && p.club === club);
      if (!row) {
        if (screen.some(p => p.name === name)) { s3.namesake += 1; continue; }
        fail(3, `${tag}: ${name}, bought by ${club} this season, is not on the screen's market there after the move`); continue;
      }
      if (row.joinedThisSeason !== true) fail(3, `${tag}: ${name} is listed at ${club} after the move without joinedThisSeason`);
      const without = { ...doorsAt, transferLog: (doorsAt.transferLog ?? []).filter(t => !(t.name === name && t.to === club && t.season === doorsAt.season)) };
      for (const door of ['talk', 'buy']) {
        s3.doors += 1;
        const want = M.cm.doorRefusal(without, row, door) ?? joinedLine(name, club, doorsAt);
        const got = M.cm.doorRefusal(doorsAt, row, door);
        if (got !== want) fail(3, `${tag}: after the move the ${door} door on ${name} at ${club} answers "${got}", wanted "${want}"`);
      }
    }
  } finally { Math.random = keep; }
}

/* ---------- section 5, the repair on load ---------- */
const s5 = { saves: 0, lines: 0, mended: 0, mine: 0, namesake: 0, equal: 0, legacy: 0, noLoad: 0 };
const withoutLedger = st => { const c = JSON.parse(JSON.stringify(st)); delete c.worldRoster; return JSON.stringify(c); };
/** Saves BASE's engine writes for one career: after the opening window and after its first January. */
async function baseSaves(MB, era, club, seed, world) {
  const keep = Math.random, out = [];
  Math.random = stream(mix('repair', era, club, seed, world ? 'legacy' : 'seeded'));
  try {
    let s = world ? MB.cm.startCareer(club, era, undefined, undefined, world) : MB.cm.startCareer(club, era);
    const keepSave = label => { MB.store.clear(); if (MB.cm.saveCareer(s)) out.push([label, MB.store.get(MB.cm.SAVE_KEY)]); };
    keepSave('the opening window');
    for (let guard = 0; guard < 400; guard += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = MB.cm.playNextEntry(s, OPT);
      s = r.state;
      if (r.kind === 'window') { keepSave('January'); break; }
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
  } finally { Math.random = keep; }
  return out;
}
const loadOn = (M, raw) => { M.store.clear(); M.store.set(M.cm.SAVE_KEY, raw); return M.cm.loadCareer(); };
async function repairCareer(B, H, era, club, seed) {
  const MB = await B.fresh(), MH = await H.fresh(), tag = `${club} (${era}, seed ${seed})`;
  for (const [label, raw] of await baseSaves(MB, era, club, seed, null)) {
    s5.saves += 1;
    const b = loadOn(MB, raw), h = loadOn(MH, raw);
    if (!b || !h) { s5.noLoad += 1; fail(5, `${tag} ${label}: BASE's save did not load on ${b ? 'the head' : 'BASE'}`); continue; }
    if (JSON.stringify(b) === JSON.stringify(h)) s5.equal += 1;
    if (withoutLedger(b) !== withoutLedger(h)) fail(5, `${tag} ${label}: the head's load differs from BASE's beyond the ledger`);
    const before = MB.ledger.readWorldRoster(b)?.records ?? [], after = MH.ledger.readWorldRoster(h)?.records ?? [];
    const lines = (h.transferLog ?? []).filter(aiLine(h.clubName)).filter(l => l.season === h.season && h.goneNames.includes(l.name));
    for (const line of lines) {
      s5.lines += 1;
      if (!placement(MH, h, line)) { s5.mended += 1; continue; }
      if (before.some(r => r.player.name === line.name || r.origin.name === line.name)) { s5.mine += 1; continue; }
      if (MB.cm.worldRosterFor(b, line.from).filter(p => p.n === line.name).length !== 1) { s5.namesake += 1; continue; }
      fail(5, `${tag} ${label}: ${line.to} signed ${line.name} from ${line.from} this season and the load did not mend it`);
    }
    for (const r of after) if (!before.some(x => x.key === r.key) && !lines.some(l => l.name === r.player.name && l.to === r.owner)) fail(5, `${tag} ${label}: the load added ${r.player.name} at ${r.owner}, in no deal line of this season`);
    MH.store.clear(); MH.cm.saveCareer(h);
    const first = MH.store.get(MH.cm.SAVE_KEY), again = MH.cm.loadCareer();
    MH.store.clear(); if (again) MH.cm.saveCareer(again);
    if (!again || MH.store.get(MH.cm.SAVE_KEY) !== first) fail(5, `${tag} ${label}: a mended save saved and loaded again is not byte equal (the repair is not idempotent)`);
  }
  for (const [label, raw] of await baseSaves(MB, era, club, seed, LEGACY_WORLD)) {
    s5.legacy += 1;
    const b = loadOn(MB, raw), h = loadOn(MH, raw);
    if (!b || !h || JSON.stringify(b) !== JSON.stringify(h)) fail(5, `${tag} ${label}: an unseeded save loads differently on the head`);
  }
}

/* ---------- section 6, legacy ---------- */
const LEGACY_SEASONS = 2;
const LEGACY_WORLD = { yearsOn: 0, uclField: null, keepLeagueOverrides: false };
/** One unseeded career on one engine: the hash of every saved string in order, and every Math.random draw. */
async function legacyCareer(E, era, club, seed, kind) {
  const M = await E.fresh(), saved = [];
  const run = tape(mix('legacy', kind, era, club, seed), () => {
    const keepSaved = s => {
      M.store.clear();
      if (!M.cm.saveCareer(s)) { saved.push('refused'); return s; }
      saved.push(sha(M.store.get(M.cm.SAVE_KEY) ?? ''));
      return M.cm.loadCareer() ?? s;
    };
    let s = kind === 'seeded' || kind === 'stripped' ? M.cm.startCareer(club, era) : M.cm.startCareer(club, era, undefined, undefined, LEGACY_WORLD);
    if (kind === 'stripped') {
      s = JSON.parse(JSON.stringify(s));
      delete s.worldSeed; delete s.worldRoster;
      for (const p of s.squad) { delete p.worldRosterKey; delete p.worldRosterSince; }
    }
    if (kind !== 'seeded' && (M.cm.worldSeedOf(s) !== undefined || s.worldRoster !== undefined)) return { error: 'the career still carries a seed or a ledger' };
    s = keepSaved(s);
    let dealt = 0;
    if (kind === 'deals') {
      /* Deals of mine in an unseeded career, the way simCmUnseededWorld's deal fleet makes them (a release, a buy,
         a sale through acceptBid), each saved and reloaded: every writer of the ledger is called, and with no seed
         none may write. Without them the seedless control cannot fire: a quiet unseeded career calls no writer. */
      s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
      const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
      const low = [...outfield(s)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
      const released = low && M.cm.releasePlayer(s, low.id);
      if (released) { s = keepSaved(released); dealt += 1; }
      const mine = new Set(s.squad.map(p => p.name));
      const mp = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
      const bought = mp && M.cm.buyPlayer(s, mp);
      if (bought) { s = keepSaved(bought); dealt += 1; }
      const man = [...outfield(s)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
      const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
      const bid = man && buyer ? { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' } : null;
      const sold = bid && M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id);
      if (sold) { s = keepSaved(sold); dealt += 1; }
    }
    /* Round 1508: the first summer on this engine adopts a career with no seed (an empty ledger, still no seed), so
       BASE and the head are compared up to it (`before`), and after it the head must have adopted the career. */
    let before = null, adopted = null;
    const mark = () => ({ saved: saved.length, draws: tapeNow.length, drawHash: sha(tapeNow.join(',')), state: sha(s), ledger: s.worldRoster !== undefined });
    for (let season = 1; season <= LEGACY_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'window') s = keepSaved(s);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) break;
      s = M.cm.finishSeason(s).state;
      if (season === LEGACY_SEASONS) break;
      before ??= mark();
      s = M.cm.startNextSeason(s);
      adopted ??= M.cm.worldSeedOf(s) === undefined && M.ledger.readWorldRoster(s) !== null;
      s = keepSaved(s);
    }
    before ??= mark();
    return { state: sha(s), ledger: s.worldRoster !== undefined, dealt, before, adopted };
  });
  return { saved, draws: run.draws.length, drawHash: sha(run.draws.join(',')), ...run.value };
}
let s6Careers = 0, s6Saves = 0, s6Draws = 0, s6Deals = 0;
async function legacySection(B, H) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [0, 1, 2, 3, 4]);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) for (const kind of ['legacy', 'stripped', 'deals']) {
    const tag = `${club} (${era}, seed ${seed}, ${kind})`;
    const [b, h] = [await legacyCareer(B, era, club, seed, kind), await legacyCareer(H, era, club, seed, kind)];
    s6Careers += 1; s6Saves += h.saved.length; s6Draws += h.draws; s6Deals += h.dealt ?? 0;
    /* A career that cannot be set up measures nothing, so it stops the run (exit 2) rather than turning the section
       red: otherwise the seedless control could "fire" on a broken fleet (it did once, remote check r1344-wm2). */
    if (b.error || h.error) cannot(`section 6, ${tag}: ${b.error ?? h.error}`);
    /* Round 1508: equal to BASE up to the first summer (saved strings, draws, the state at the end of season one),
       and adopted at it; what an adopted career then does is scripts/simCmUnseededWorld.mjs's to hold. */
    const [b0, h0] = [b.before, h.before];
    if (h0.ledger) fail(6, `${tag}: the head's career wrote a world ledger with no seed before its first summer`);
    if (b0.saved !== h0.saved) fail(6, `${tag}: before the first summer BASE saved ${b0.saved} times, the head ${h0.saved}`);
    const first = b.saved.slice(0, b0.saved).findIndex((x, i) => x !== h.saved[i]);
    if (first >= 0) fail(6, `${tag}: saved string ${first + 1} of ${b0.saved} (before the first summer) differs from BASE's`);
    if (b0.draws !== h0.draws || b0.drawHash !== h0.drawHash) fail(6, `${tag}: before the first summer Math.random draws ${h0.draws} against BASE's ${b0.draws} (values ${h0.drawHash === b0.drawHash ? 'equal' : 'differ'})`);
    if (b0.state !== h0.state) fail(6, `${tag}: the state before the first summer differs from BASE's`);
    if (h.adopted === false) fail(6, `${tag}: the head did not adopt the career at its first summer (a readable ledger and no seed)`);
    if (h.adopted) s6Adopted += 1;
  }
}
let s6Adopted = 0;

/* ---------- section 7, my deals with the recording on ---------- */
const s7 = { base: { deals: 0, refused: 0, swaps: 0, options: 0, unreached: 0 }, head: { deals: 0, refused: 0, swaps: 0, options: 0, unreached: 0 } };
/** A seeded career's deals of mine (a release, a buy, a sale through acceptBid) at its start and again a season later,
    each held to exactly one ledger record with the right owner and status. */
async function mineCareer(E, arm, era, club, seed) {
  const M = await E.fresh(), keep = Math.random, row = s7[arm];
  Math.random = stream(mix('mine', era, club, seed));
  const holds = (st, name, owner, status) => {
    row.deals += 1;
    const recs = (M.ledger.readWorldRoster(st)?.records ?? []).filter(r => r.player.name === name && r.status === status && r.owner === owner);
    if (recs.length !== 1) row.refused += 1;
  };
  const dealsOf = s => {
    s = { ...s, budget: 9999, wageCap: 9999, transferWindow: 'summer' };
    const outfield = cur => cur.squad.filter(p => !p.onLoan && p.position !== 'GK');
    const low = [...outfield(s)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id)).find(p => M.cm.releaseBlock(s, p) === null);
    const released = low && M.cm.releasePlayer(s, low.id);
    if (released) { s = released; holds(s, low.name, null, 'released'); }
    const mine = new Set(s.squad.map(p => p.name));
    const mp = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !mine.has(p.name));
    const bought = mp && M.cm.buyPlayer(s, mp);
    if (bought) { s = bought; holds(s, mp.name, s.clubName, 'owned'); }
    const man = [...outfield(s)].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))[1];
    const buyer = M.cm.buildMarket(s).find(p => p.club !== s.clubName)?.club;
    const bid = man && buyer ? { playerId: man.id, playerName: man.name, club: buyer, offer: 30, status: 'open' } : null;
    const sold = bid && M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id);
    if (sold) { s = sold; holds(s, man.name, buyer, 'owned'); }
    /* The read review's major C (the critic's correction 10): a swap and an exercised loan option too. The swap: talks
       for a man of another club, an offer over the ask with my lowest rated spare outfield man in the deal, and his
       asked terms met; the man who arrives is mine and the man who goes is the seller's. The option: a man of
       another club in on loan, his option to buy taken at once. Each deal that cannot be reached on this stream is
       counted, not failed. */
    const have = new Set(s.squad.map(p => p.name));
    const target = M.cm.buildMarket(s).find(p => p.position !== 'GK' && p.age < 29 && p.rating < 80 && !have.has(p.name) && M.cm.doorRefusal(s, p, 'talk') === null);
    const spare = [...outfield(s)].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id)).find(p => M.cm.canLeaveSquad(s, p));
    let talk = target && spare ? M.cm.startNegotiation(s, target) : null;
    if (talk?.negotiation?.status === 'open') talk = M.cm.makeOffer(talk, Math.round(talk.negotiation.theirAsk * 1.1 * 10) / 10, { swapId: spare.id });
    const want = talk?.negotiation?.phase === 'terms' ? talk.negotiation.terms?.want : undefined;
    const swapped = want ? M.cm.offerTerms(talk, want) : null;
    if (swapped?.negotiation?.status === 'agreed') {
      s = { ...swapped, negotiation: null }; row.swaps += 1;
      holds(s, target.name, s.clubName, 'owned'); holds(s, spare.name, target.club, 'owned');
    } else row.unreached += 1;
    const have2 = new Set(s.squad.map(p => p.name));
    const lent = M.cm.buildMarket(s).find(p => p.position !== 'GK' && !have2.has(p.name) && M.cm.doorRefusal(s, p, 'loan') === null);
    const loaned = lent ? M.cm.loanIn(s, lent) : null;
    const loanee = loaned?.squad.find(p => p.name === lent.name && p.onLoan);
    const optioned = loanee && loanee.loanOptionFee !== undefined ? M.cm.exerciseLoanOption(loaned, loanee.id) : null;
    if (optioned) { s = optioned; row.options += 1; holds(s, lent.name, s.clubName, 'owned'); }
    else row.unreached += 1;
    return s;
  };
  try {
    let s = dealsOf(M.cm.startCareer(club, era));
    for (let guard = 0; guard < 400; guard += 1) {
      if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
      const r = M.cm.playNextEntry(s, OPT);
      s = r.state;
      if (r.kind === 'seasonOver' || s.sacked) break;
    }
    if (!s.sacked) dealsOf(M.cm.startNextSeason(M.cm.finishSeason(s).state));
  } finally { Math.random = keep; }
}

/* ---------- section 8, the bridge ---------- */
const s8 = { careers: 0, equal: 0, differ: 0, first: {} };
async function bridgeSection(B, HB, H) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [0, 1, 2]);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) {
    const tag = `${club} (${era}, seed ${seed}, seeded)`;
    const [b, hb, h] = [await legacyCareer(B, era, club, seed, 'seeded'), await legacyCareer(HB, era, club, seed, 'seeded'), await legacyCareer(H, era, club, seed, 'seeded')];
    if (b.error || hb.error || h.error) cannot(`section 8, ${tag}: ${b.error ?? hb.error ?? h.error}`);
    s8.careers += 1;
    const firstB = b.saved.findIndex((x, i) => x !== hb.saved[i]);
    if (b.saved.length !== hb.saved.length || firstB >= 0) fail(8, `${tag}: with the bridge, saved string ${firstB + 1} of ${b.saved.length} differs from BASE's`);
    if (b.draws !== hb.draws || b.drawHash !== hb.drawHash) fail(8, `${tag}: with the bridge, ${hb.draws} draws against BASE's ${b.draws}`);
    if (b.state !== hb.state) fail(8, `${tag}: with the bridge, the last state differs from BASE's`);
    const firstH = b.saved.findIndex((x, i) => x !== h.saved[i]);
    if (firstH >= 0 || b.state !== h.state) { s8.differ += 1; const at = firstH >= 0 ? `save ${firstH + 1}` : 'the last state'; s8.first[at] = (s8.first[at] ?? 0) + 1; }
    else s8.equal += 1;
  }
}

/* ---------- section 10, the window's skip ---------- */
/* The review of 2026-10-16 (the run review's M4): a window never publishes a deal the ledger refuses. Real Madrid
   (2026-27) sells its eight best outfield men to other clubs at the start through acceptBid (the section 7 way, the
   review's skip probe), so the lead's ruling 3 protects eight of the best rated men in the world, then plays three
   seasons. At every window each new deal line between two other clubs is placed at its buyer (placement, as section
   1), and none of them is a man the ledger holds from my sale. Exposure is printed: how often a protected man stood
   in the top 120 of the market a window draws from. Control noskip takes the skip out. */
const S10_SEASONS = 3;
const s10 = { careers: 0, sold: 0, windows: 0, lines: 0, exposed: 0 };
async function skipCareer(E, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('skip', seed));
  const tag = `Real Madrid (now, seed ${seed}, eight men sold)`;
  const sold = new Set();
  const audit = (s, before, label) => {
    s10.windows += 1;
    const records = M.ledger.readWorldRoster(s)?.records ?? [];
    for (const line of addedLines(before, s.transferLog).filter(aiLine(s.clubName))) {
      s10.lines += 1;
      const why = placement(M, s, line);
      if (why) fail(10, `${tag} ${label}: the news says ${line.to} signed ${line.name} from ${line.from}, but ${why}`);
      if (sold.has(line.name) && records.some(r => r.status === 'owned' && r.player.name === line.name && r.player.wage !== undefined)) fail(10, `${tag} ${label}: ${line.to} took ${line.name}, a man I sold (ruling 3)`);
    }
  };
  const exposure = s => { const top = new Set(M.cm.buildMarket(s).slice(0, 120).map(p => p.name)); for (const name of sold) if (top.has(name)) s10.exposed += 1; };
  try {
    let s = M.cm.startCareer('Real Madrid', 'now');
    const clubs = [...new Set(M.cm.buildMarket(s).map(p => p.club).filter(c => c !== s.clubName))];
    const best = [...s.squad].filter(p => !p.onLoan && !p.isYouth && p.position !== 'GK').sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, 8);
    for (const [i, man] of best.entries()) {
      const bid = { playerId: man.id, playerName: man.name, club: clubs[(seed * 7 + i * 13) % clubs.length], offer: Math.max(30, man.value ?? 30), status: 'open' };
      const next = M.cm.acceptBid({ ...s, incomingBids: [...(s.incomingBids ?? []), bid] }, man.id);
      if (next) { s = next; sold.add(man.name); s10.sold += 1; }
    }
    s10.careers += 1;
    for (let season = 1; season <= S10_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = [...(s.transferLog ?? [])], prev = s;
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        if (r.kind === 'window') { exposure(prev); audit(s, before, `January of season ${season}`); }
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked || season === S10_SEASONS) break;
      s = M.cm.finishSeason(s).state;
      const before = [...(s.transferLog ?? [])];
      exposure({ ...s, goneNames: [] });
      s = M.cm.startNextSeason(s);
      audit(s, before, `the summer before season ${season + 1}`);
    }
  } finally { Math.random = keep; }
}

/* ---------- section 11, my own results where no AI deal touches my opponents ---------- */
/* The brief's decision 5 (the read review's major D): the recording reaches my own results only through the clubs
   its deals touch. The fleet: Scottish Premiership careers (2026-27), whose league the 120 best rated men a window
   draws from barely reach, played on BASE and on the head from one stream for three seasons, each without a reload.
   Both arms are walked step by step; a step is comparable while no AI deal line seen so far on either arm names a
   club of my league or a club I have played, and the first step that breaks that ends the career's comparison (a
   touched club changes the draws from there on, by design). Within the comparable steps every result of my own
   matches and the draw count must equal BASE's. Control drawshift adds one draw to every recorded AI deal. */
const S11_SEASONS = 2;
const S11_CLUBS = ['Aberdeen', 'Motherwell', 'St Mirren'];
const s11 = { careers: 0, compared: 0, seasonOne: 0, cutLeague: 0, cutOpponent: 0, whole: 0, parted: {} };
/* CM_WORLD_MOVES_TRACE=1: every draw of section 11 keeps the engine frames that took it, and a draw count that
   parts prints where the two arms first drew differently (slow; for one career at a time). */
const TRACE11 = process.env.CM_WORLD_MOVES_TRACE === '1';
const siteOf = stack => stack.split('\n').slice(2, 7).map(l => l.trim().replace(/^at /, '').replace(/ \(.*$/, '').replace(/^\S*\.cjs:\d+:\d+$/, '<anon>')).join(' < ');
function firstParting(b, h) {
  if (!b.sites || !h.sites) return '';
  let k = 0;
  while (k < b.sites.length && k < h.sites.length && b.sites[k] === h.sites[k]) k += 1;
  const around = xs => xs.slice(Math.max(0, k - 2), k + 3).map((x, i) => `      ${k - Math.min(2, k) + i}: ${x}`).join('\n');
  return `\n    the arms first part at draw ${k}:\n    BASE\n${around(b.sites)}\n    head\n${around(h.sites)}`;
}
async function ownResultsRun(E, club, seed) {
  const M = await E.fresh(), keep = Math.random, next = stream(mix('own11', club, seed));
  let draws = 0;
  const sites = TRACE11 ? [] : null;
  Math.random = () => { draws += 1; if (sites) sites.push(siteOf(new Error().stack)); return next(); };
  const steps = [];
  try {
    let s = M.cm.startCareer(club, 'now');
    const step = (kind, before, beforeResults) => steps.push({ kind, draws, season: s.season, lines: addedLines(before, s.transferLog).filter(aiLine(s.clubName)),
      results: addedLines(beforeResults, s.resultLog), league: [...s.leagueClubs] });
    step('start', [], []);
    for (let season = 1; season <= S11_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = [...(s.transferLog ?? [])], beforeResults = [...(s.resultLog ?? [])];
        const r = M.cm.playNextEntry(s, OPT);
        s = r.state;
        step(r.kind, before, beforeResults);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked || season === S11_SEASONS) break;
      s = M.cm.finishSeason(s).state;
      const before = [...(s.transferLog ?? [])];
      s = M.cm.startNextSeason(s);
      step('summer', before, [...(s.resultLog ?? [])]);
    }
  } finally { Math.random = keep; }
  steps.sites = sites;
  return steps;
}
async function ownResultsCareer(B, H, club, seed) {
  const tag = `${club} (now, seed ${seed})`;
  const [b, h] = [await ownResultsRun(B, club, seed), await ownResultsRun(H, club, seed)];
  s11.careers += 1;
  const touched = new Set(), played = new Set();
  for (let i = 0; i < Math.min(b.length, h.length); i += 1) {
    for (const line of [...b[i].lines, ...h[i].lines]) { touched.add(line.from); touched.add(line.to); }
    if (h[i].league.some(c => touched.has(c))) { s11.cutLeague += 1; return; }
    const opponents = [...b[i].results, ...h[i].results].map(r => r.opp);
    if (opponents.some(o => touched.has(o)) || [...played].some(o => touched.has(o))) { s11.cutOpponent += 1; return; }
    /* From the first summer the world's club strengths are worked out again from rosters the recording changed, so
       a simulated match of a club that bought or sold, in any league, draws a different number of times, and every
       later draw of mine comes off a moved stream (r1344-fx4's trace: the arms part in simAiMatch's poisson draws
       inside syncWorld). Measured and printed there, not asserted; season one is asserted. */
    const parted = (b[i].kind !== h[i].kind || b[i].draws !== h[i].draws);
    if (parted && h[i].season > 1) { s11.parted[`season ${h[i].season}`] = (s11.parted[`season ${h[i].season}`] ?? 0) + 1; return; }
    if (b[i].kind !== h[i].kind) { fail(11, `${tag}: step ${i + 1} is ${h[i].kind} on the head and ${b[i].kind} on BASE`); return; }
    if (b[i].draws !== h[i].draws) { fail(11, `${tag}: by step ${i + 1} (${h[i].kind}, season one) the head drew ${h[i].draws} times and BASE ${b[i].draws}, with no AI deal touching my league or my opponents${firstParting(b, h)}`); return; }
    if (JSON.stringify(b[i].results) !== JSON.stringify(h[i].results)) { fail(11, `${tag}: at step ${i + 1} my results differ from BASE's: ${JSON.stringify(h[i].results)} against ${JSON.stringify(b[i].results)}`); return; }
    s11.compared += h[i].results.length;
    if (h[i].season === 1) s11.seasonOne += h[i].results.length;
    for (const o of opponents) played.add(o);
  }
  if (b.length !== h.length) fail(11, `${tag}: the head played ${h.length} steps and BASE ${b.length}`);
  else s11.whole += 1;
}

/* ---------- section 9, shape ---------- */
const SHAPE_SEASONS = Number(process.env.CM_WORLD_MOVES_SEASONS || 15);
const SHAPE_AT = [1, 5, 10, 15].filter(t => t <= SHAPE_SEASONS);
/** Each league's top five and bottom five clubs by the bake's own XI (year 0, no seed: the same in both arms). */
function shapeTiers(M, s) {
  const era = s.eraId ?? 'now', top = [], bottom = [];
  const leagues = M.eras.isHistoricEra(era)
    ? M.cm.eraLeaguesFor(era).map(l => l.clubs)
    : M.cm.REAL_LEAGUES.map(l => M.cm.playableClubs(l.id).map(c => c.name));
  for (const clubs of leagues) {
    const rated = clubs.filter(c => c !== s.clubName).map(c => [c, M.eras.projectedXIAvg(c, 0, era) ?? 0]).sort((a, b) => b[1] - a[1]);
    if (rated.length < 10) continue;
    top.push(...rated.slice(0, 5).map(r => r[0]));
    bottom.push(...rated.slice(-5).map(r => r[0]));
  }
  return { top, bottom };
}
/** The XI average, the roster length minus the projection's slot count and the mean age over a set of clubs. */
function tierNumbers(M, s, clubs) {
  const years = M.cm.yearsOn(s), era = s.eraId ?? 'now', seed = M.cm.worldSeedOf(s);
  let xi = 0, surplus = 0, age = 0, n = 0;
  for (const club of clubs) {
    if (club === s.clubName) continue;
    const roster = M.cm.worldRosterFor(s, club);
    if (!roster.length) continue;
    xi += M.cm.worldRosterXIAvg(s, club) ?? 0;
    surplus += roster.length - M.eras.projectedRoster(club, years, era, seed).length;
    age += roster.reduce((sum, p) => sum + p.a, 0) / roster.length;
    n += 1;
  }
  return n ? { clubs: n, xi: xi / n, surplus: surplus / n, age: age / n } : { clubs: 0, xi: null, surplus: null, age: null };
}
async function shapeCareer(E, arm, era, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('shape', era, club, seed));
  const out = { arm, era, club, seed, seasons: SHAPE_SEASONS, at: {}, windows: [], sacked: null };
  const sold = new Set(), bought = new Set();
  const look = (s, kind, before, ms) => {
    const lines = addedLines(before, s.transferLog).filter(aiLine(s.clubName));
    for (const line of lines) { sold.add(line.from); bought.add(line.to); }
    const held = M.ledger.readWorldRoster(s);
    out.windows.push({ season: s.season, kind, deals: lines.length, records: held?.records.length ?? 0,
      stored: s.worldRoster === undefined ? 0 : JSON.stringify(s.worldRoster).length, market: M.cm.buildMarket(s).length, ms });
  };
  const measure = (s, t) => {
    const tiers = shapeTiers(M, s);
    out.at[t] = { top: tierNumbers(M, s, tiers.top), bottom: tierNumbers(M, s, tiers.bottom),
      sold: tierNumbers(M, s, [...sold]), bought: tierNumbers(M, s, [...bought]) };
  };
  try {
    let s = M.cm.startCareer(club, era);
    look(s, 'opening', [], null);
    if (SHAPE_AT.includes(1)) measure(s, 1);
    for (let season = 1; season <= SHAPE_SEASONS; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const before = s.transferLog, t0 = performance.now(), r = M.cm.playNextEntry(s, OPT), ms = performance.now() - t0;
        s = r.state;
        if (r.kind === 'window') look(s, 'january', before, Math.round(ms * 10) / 10);
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) { out.sacked = season; break; }
      s = M.cm.finishSeason(s).state;
      if (season === SHAPE_SEASONS) break;
      const before = s.transferLog;
      s = M.cm.startNextSeason(s);
      look(s, 'summer', before, null);
      if (SHAPE_AT.includes(season + 1)) measure(s, season + 1);
    }
  } finally { Math.random = keep; }
  return out;
}
async function shapeSection(engines) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const arms = (process.env.CM_WORLD_MOVES_SHAPE_ARMS || 'base,head').split(',');
  const dir = process.env.CM_WORLD_MOVES_OUT || process.env.RC_OUT || os.tmpdir();
  fs.mkdirSync(dir, { recursive: true });
  for (const arm of arms) {
    if (!engines[arm]) cannot(`no engine for the shape arm ${arm}`);
    const rows = [];
    for (const seed of seeds) for (const club of CLUBS.now) {
      const row = await shapeCareer(engines[arm], arm, 'now', club, seed);
      rows.push(row);
      const w = row.windows, deals = w.reduce((a, x) => a + x.deals, 0), last = w[w.length - 1];
      const t10 = row.at[10]?.top;
      console.log(`  shape ${row.arm} ${club} seed ${seed}: ${deals} AI deals in ${w.length} windows, ledger ${last.records} records ${last.stored} units, market ${last.market}${row.sacked ? `, sacked in season ${row.sacked}` : ''}${t10 ? `; season 10 top five XI ${t10.xi.toFixed(2)}, surplus ${t10.surplus.toFixed(2)}` : ''}`);
    }
    const file = path.join(dir, `shape-${arm}-${seeds[0]}-${seeds[seeds.length - 1]}.json`);
    fs.writeFileSync(file, JSON.stringify(rows));
    console.log(`  shape: ${rows.length} careers written to ${file}`);
  }
}

/* ---------- section 9's verdict (the lead's ruling 2), read by --combine ---------- */
/* The bound on a tier's move, once BASE against BASE is taken off: fixed numbers set from measured headroom, never a
   significance test (that gets easier the less data it is fed). Step 1 (r1344-shape, seeds 1 to 10, BASE against
   BASE on 11 to 20): the probe moved the top and bottom tiers' XI by at most 0.057 and their mean age by at most
   0.065 after BASE against BASE (whose own per seed spread reached 0.13 XI and 0.14 years), so 0.15 is more than
   twice the healthy move and about one per seed spread of BASE against itself. The buyers' surplus: +0.686, +0.665
   and +0.675 men a club at seasons 5, 10 and 15 (se 0.03 to 0.05), so at most 1.0 at each, and season 15 at most
   0.25 above season 5 (flat, not growing).
   Which tiers (the read review of 2026-10-16, minor 3): this reads ruling 2's "per tier" as the league tiers, the top
   five and the bottom five, plus the buyers' surplus the ruling names. The clubs that sold (the critic's correction
   2 names them too) are printed and not bounded: at the final step 1 head their XI moved -0.315, -0.330 and -0.216
   at seasons 5, 10 and 15 against BASE against BASE's +0.214, +0.138 and +0.086, and their surplus -0.356 at season 5
   (results-g/finish-1344-shape-head.txt), the seller a man short while his shadow keeps the slot. Bounding them is
   the lead's ruling to make, with part B's releases. */
const SHAPE_MARGIN = { xi: 0.15, age: 0.15 };
const SURPLUS_MAX = 1.0, SURPLUS_GROWTH_MAX = 0.25;
function shapeVerdict(seen, shifted) {
  const red = [];
  for (const t of [5, 10, 15]) for (const tier of ['top', 'bottom']) for (const m of ['xi', 'age']) {
    const row = seen[`${tier} ${m} season ${t}`];
    if (!row || !row.d.n || !row.nul.n) { console.log(`simCmWorldMoves --combine: cannot judge ${tier} ${m} season ${t}: the head or BASE against BASE is missing`); return 2; }
    const move = row.d.mean - row.nul.mean;
    if (Math.abs(move) > SHAPE_MARGIN[m]) red.push(`${tier} ${m} season ${t} moved ${sgn(move)} after BASE against BASE, over ${SHAPE_MARGIN[m]}`);
  }
  const surplus = t => seen[`bought surplus season ${t}`]?.d;
  for (const t of [5, 10, 15]) if (!surplus(t)?.n) { console.log(`simCmWorldMoves --combine: cannot judge the buyers' surplus at season ${t}`); return 2; }
  for (const t of [5, 10, 15]) if (surplus(t).mean > SURPLUS_MAX) red.push(`the buyers carry ${sgn(surplus(t).mean)} men over their slots at season ${t}, over ${SURPLUS_MAX}`);
  if (surplus(15).mean - surplus(5).mean > SURPLUS_GROWTH_MAX) red.push(`the buyers' surplus grew ${sgn(surplus(15).mean - surplus(5).mean)} from season 5 to 15, over ${SURPLUS_GROWTH_MAX}`);
  for (const line of red) console.log(`  FAIL section 9: ${line}`);
  if (shifted) {
    const fired = red.some(line => line.startsWith('top xi season 10'));
    console.log(fired ? `simCmWorldMoves --combine: control shift FIRED: ${red.length} red` : 'simCmWorldMoves --combine: control shift DID NOT FIRE: the top five XI at season 10 stayed inside its margin');
    return fired ? 1 : 3;
  }
  console.log(red.length ? `simCmWorldMoves --combine: RED, section 9 (${red.length})` : 'simCmWorldMoves --combine: green, section 9 held (every tier inside its margin, the buyers\' surplus flat)');
  return red.length ? 1 : 0;
}

/* ---------- section 12, the window entry's time ---------- */
const WINDOW_TRIALS = 5, WINDOW_SEASON = 6;
const median = xs => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
/** A career on one engine played to the call that opens January of WINDOW_SEASON: the saved string before it. */
async function beforeJanuary(E, club, seed) {
  const M = await E.fresh(), keep = Math.random;
  Math.random = stream(mix('time', club, seed));
  try {
    let s = M.cm.startCareer(club, 'now');
    for (let season = 1; season <= WINDOW_SEASON; season += 1) {
      for (let guard = 0; guard < 400; guard += 1) {
        if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
        const r = M.cm.playNextEntry(s, OPT);
        if (r.kind === 'window' && season === WINDOW_SEASON) {
          M.store.clear();
          if (!M.cm.saveCareer(s)) return { error: 'the save before January was refused' };
          return { M, saved: M.store.get(M.cm.SAVE_KEY), records: M.ledger.readWorldRoster(s)?.records.length ?? 0 };
        }
        s = r.state;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      if (s.sacked) return { error: `sacked in season ${season}` };
      s = M.cm.startNextSeason(M.cm.finishSeason(s).state);
    }
    return { error: 'no January window was reached' };
  } finally { Math.random = keep; }
}
/** One trial: a fresh load of the saved string (cold memos, as after a page load), then the timed window entry. */
function timeWindow(at, trial) {
  const keep = Math.random;
  at.M.store.set(at.M.cm.SAVE_KEY, at.saved);
  const st = at.M.cm.loadCareer();
  Math.random = stream(mix('trial', trial));
  try {
    const t0 = performance.now(), r = at.M.cm.playNextEntry(st, OPT), ms = performance.now() - t0;
    return r.kind === 'window' ? ms : NaN;
  } finally { Math.random = keep; }
}
let s12Careers = 0;
async function timeSection(B, H) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3]);
  for (const club of CLUBS.now) for (const seed of seeds) {
    const tag = `${club} (now, seed ${seed})`;
    const b = await beforeJanuary(B, club, seed), h = await beforeJanuary(H, club, seed);
    if (b.error || h.error) cannot(`section 12, ${tag}: ${b.error ?? h.error}`);
    const bt = [], ht = [];
    for (let trial = 0; trial < WINDOW_TRIALS; trial += 1) { bt.push(timeWindow(b, trial)); ht.push(timeWindow(h, trial)); }
    if ([...bt, ...ht].some(x => !Number.isFinite(x))) cannot(`section 12, ${tag}: a trial did not open the January window`);
    const mb = median(bt), mh = median(ht), limit = 3 * mb + 5;
    s12Careers += 1;
    console.log(`   ${tag}: ledger ${b.records} records on BASE, ${h.records} on the head; the window entry's median BASE ${mb.toFixed(1)} ms, head ${mh.toFixed(1)} ms (limit ${limit.toFixed(1)})`);
    if (mh > limit) fail(12, `${tag}: the head's window entry took ${mh.toFixed(1)} ms against BASE's ${mb.toFixed(1)} ms, over 3 x + 5 ms`);
  }
}

/* ---------- --combine: the paired statistic over the shape files of every run ---------- */
const stat = xs => {
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / (n || 1);
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : NaN;
  return { n, mean, se: sd / Math.sqrt(n) };
};
const sgn = v => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`;
function combine(files) {
  const rows = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const shift = process.env.CM_WORLD_MOVES_COMBINE_CONTROL;
  if (shift && shift !== 'shift') { console.log(`simCmWorldMoves --combine: unknown control ${shift}`); return 2; }
  if (shift) for (const r of rows) if (r.arm !== 'base' && r.at?.[10]?.top?.xi != null) r.at[10].top.xi += 0.2;
  const seen = {};
  const head = rows.filter(r => r.arm !== 'base'), base = rows.filter(r => r.arm === 'base');
  const armName = head[0]?.arm ?? 'head';
  const setA = [...new Set(head.map(r => r.seed))].sort((a, b) => a - b);
  const setB = [...new Set(base.map(r => r.seed))].filter(x => !setA.includes(x)).sort((a, b) => a - b);
  /** One number per seed: the mean over the careers of that seed (a sacked career's missing season is left out). */
  const perSeed = (list, seeds, get) => seeds.map(seed => {
    const xs = list.filter(r => r.seed === seed).map(get).filter(v => typeof v === 'number' && Number.isFinite(v));
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  });
  const diffs = (a, b) => a.map((x, i) => (x === null || b[i] === null ? null : x - b[i])).filter(v => v !== null);
  console.log(`simCmWorldMoves --combine: ${armName} seeds ${setA.join(',')} (${head.length} careers) against BASE on the same seeds; BASE against BASE pairs seeds ${setA.join(',')} with ${setB.join(',') || 'none'} by order`);
  console.log('  the statistic: the mean over seeds of the paired per seed difference (each seed the mean of its careers), its standard error, and z = (arm minus BASE less BASE minus BASE) over the root of both squared errors');
  const report = (label, get) => {
    const a = perSeed(base, setA, get), h = perSeed(head, setA, get), b = perSeed(base, setB, get);
    const d = stat(diffs(h, a)), nul = stat(diffs(b.slice(0, setA.length), a.slice(0, setB.length)));
    const z = (d.mean - (nul.n ? nul.mean : 0)) / Math.sqrt(d.se ** 2 + (nul.n > 1 ? nul.se ** 2 : 0));
    const baseMean = stat(a.filter(v => v !== null)).mean;
    seen[label] = { d, nul };
    console.log(`  ${label.padEnd(26)} BASE ${baseMean.toFixed(3)} | ${armName} minus BASE ${sgn(d.mean)} (se ${d.se.toFixed(3)}, n ${d.n}) | BASE minus BASE ${nul.n ? `${sgn(nul.mean)} (se ${nul.se.toFixed(3)}, n ${nul.n})` : 'not run'} | z ${Number.isFinite(z) ? z.toFixed(1) : 'n/a'}`);
  };
  for (const t of [5, 10, 15]) for (const tier of ['top', 'bottom', 'sold', 'bought']) for (const m of ['xi', 'surplus', 'age']) {
    report(`${tier} ${m} season ${t}`, r => r.at?.[t]?.[tier]?.[m]);
  }
  const win = (kind, field) => r => { const w = r.windows.filter(x => x.kind === kind); return w.length ? w.reduce((a, x) => a + (x[field] ?? 0), 0) / w.length : null; };
  for (const kind of ['opening', 'january', 'summer']) report(`AI deals a window, ${kind}`, win(kind, 'deals'));
  for (const t of [5, 10, 15]) {
    const atSummer = field => r => r.windows.find(x => x.kind === (t === 1 ? 'opening' : 'summer') && x.season === t)?.[field] ?? null;
    report(`ledger records season ${t}`, atSummer('records'));
    report(`ledger units season ${t}`, atSummer('stored'));
    report(`market size season ${t}`, atSummer('market'));
  }
  report('January entry ms', win('january', 'ms'));
  return shapeVerdict(seen, !!shift);
}

/* ---------- the run ---------- */
if (COMBINE) process.exit(combine(process.argv.slice(3)));
const treeSource = lf(fs.readFileSync(path.join(ROOT, ENGINE), 'utf8'));
if (SECTIONS.has(0)) {
  console.log('0) anchors: every edit this harness can make stands exactly once in the source it is made to');
  for (const [label, n] of bridgeAnchorCounts(file => lf(fs.readFileSync(path.join(ROOT, file), 'utf8')))) {
    console.log(`   bridge "${label}": ${n}`);
    if (n !== 1) fail(0, `the bridge's anchor "${label}" stands ${n} times`);
  }
  for (const [name, c] of Object.entries(CONTROLS)) for (const [from] of c.edits) {
    const n = (c.file ? lf(fs.readFileSync(path.join(ROOT, c.file), 'utf8')) : treeSource).split(from).length - 1;
    console.log(`   control ${name}: ${n}`);
    if (n !== 1) fail(0, `the anchor of the control ${name} stands ${n} times in ${ENGINE}`);
  }
}
const headEdits = [CONTROL ? editOf(CONTROLS[CONTROL].edits, CONTROL) : null].filter(Boolean);
const needBase = SECTIONS.has(11) || SECTIONS.has(5) || SECTIONS.has(7) || SECTIONS.has(8) || SECTIONS.has(6) || SECTIONS.has(12) || SECTIONS.has(9) && (process.env.CM_WORLD_MOVES_SHAPE_ARMS || 'base,head').split(',').includes('base');
const H = await engine('head', { edit: headEdits.length ? text => headEdits.reduce((t, f) => f(t), text) : null,
  editFile: CONTROL ? CONTROLS[CONTROL].file ?? ENGINE : ENGINE });
const B = needBase ? await engine('base', { base: true }) : null;
const HB = SECTIONS.has(8) ? await engine('bridge', { bridge: true }) : null;
if (made.size) for (const [what, n] of made) console.log(`   control edit made ${n} time(s): ${what}`);

if (SECTIONS.has(1) || SECTIONS.has(4)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5]);
  console.log(`1) ownership: seeded careers, ${S1_SEASONS} seasons, seeds ${seeds.join(',')}, the ${H.label} engine`);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) await ownershipCareer(H, era, club, seed);
  for (const [kind, row] of Object.entries(tally)) {
    console.log(`   ${kind.padEnd(8)} ${row.windows} windows, ${row.deals} AI deal lines, ${row.refused} not placed at the buyer, ledger ${(row.records / row.windows).toFixed(1)} records and ${Math.round(row.stored / row.windows)} units a window on average`);
  }
  console.log(`   ${s1Careers} careers (${s1Sacked} sacked early), ${s1Checked} listings checked by the one club rule, ${s1Tracked} moved men followed over ${s1Rollovers} rollovers`);
  console.log(`   failures by check: (i) ${checks.i ?? 0}, (ii) ${checks.ii ?? 0}, (iii) ${checks.iii ?? 0}; the first at ${firstRed1 ?? 'none'}`);
  console.log(`   the opening window's refusals (deal lines it closed before the seed that the flush could not place): ${tally.opening?.refused ?? 0} of ${tally.opening?.deals ?? 0} (expected 0)`);
  if (!s1Careers || !Object.values(tally).some(r => r.deals)) cannot('no AI deal line was seen, so nothing was measured');
  if (SECTIONS.has(4)) {
    console.log(`4) the market: ${s4.listed} moved men on the screen's market at their buyer (${s4.namesake} hidden behind a namesake, counted), ${s4.doors} door presses checked, the buy door locked on ${s4.buyLocked}; a season later ${s4.nextSummer} on sale there, ${s4.bought} bought, ${s4.gone} moved on or retired`);
    console.log(`   the screen was checked against ${s4.kept} buildMarket rows; ${s4.marked} Talk and buy presses on rows it marks joinedThisSeason`);
    const screen = s4.screenMs / (s4.calls || 1), base = s4.baseMs / (s4.calls || 1);
    console.log(`   marketForScreen ${screen.toFixed(2)} ms a call against buildMarket's ${base.toFixed(2)} ms on the same states (limit 3 x + 5 ms)`);
    if (screen > 3 * base + 5) fail(4, `marketForScreen took ${screen.toFixed(2)} ms a call against buildMarket's ${base.toFixed(2)} ms, over 3 x + 5 ms`);
    if (!s4.lines) cannot('section 4: no deal line was seen, so the market measured nothing');
    if (s4.listed && !s4.nextSummer) cannot('section 4: no man listed at a window was checked a season later');
  }
}
if (SECTIONS.has(2)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5]);
  console.log(`2) negotiation: a hijack and a walk away on PR269's vectors at each seeded career's opening window, seeds ${seeds.join(',')}`);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) await negotiationCareer(H, era, club, seed);
  console.log(`   hijack: ${s2.hijack.owned} of ${s2.hijack.set} at the rival; walk away: ${s2.walk.owned} of ${s2.walk.set}; ${s2.unset} careers where no bidding war could be set up on the vectors`);
  if (s2.hijack.set < 5 || s2.walk.set < 5) cannot(`section 2: only ${s2.hijack.set} hijacks and ${s2.walk.set} walk aways could be set up, under 5 each`);
  for (const club of CLUBS.now) for (const seed of seeds) for (const kind of ['sold', 'behind']) await protectedCareer(H, club, seed, kind);
  console.log(`   protected by ruling 3: a man I sold, ${s2p.sold.held} of ${s2p.sold.set} wars held (${s2p.sold.tried} careers tried, ${s2p.sold.unprotected} not protected); a man I left behind, ${s2p.behind.held} of ${s2p.behind.set} (${s2p.behind.tried} tried, ${s2p.behind.unprotected} not protected)`);
  if (s2p.sold.set < 3 || s2p.behind.set < 3) cannot(`section 2: only ${s2p.sold.set} wars on a man I sold and ${s2p.behind.set} on a man I left behind could be set up, under 3 each`);
}
if (SECTIONS.has(3)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3]);
  console.log(`3) join: seeded 2026-27 careers take a job mid season through joinClubNow, before and after January and in season two, seeds ${seeds.join(',')}`);
  for (const club of CLUBS.now) for (const seed of seeds) for (const when of ['before', 'after', 'second']) await joinCareer(H, club, seed, when);
  console.log(`   ${s3.joins} moves (${s3.refused} could not be set up), ${s3.departed} departed records kept, ${s3.runIn} deal lines of the run in placed, ${s3.gone} gone names carried over with ${s3.carried} deal lines, ${s3.payloads} payloads compared, ${s3.doors} door presses after the move (${s3.notOwned} men the ledger no longer holds at one club, ${s3.namesake} behind a namesake, counted)`);
  if (!s3.doors) cannot('section 3: no door was pressed after a move, so the carry measured nothing');
  if (s3.joins < 6) cannot(`section 3: only ${s3.joins} moves could be made, under 6`);
  if (!s3.lines) cannot('section 3: no deal line of a run in was seen, so the join measured nothing');
}
if (SECTIONS.has(5)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3]);
  console.log(`5) the repair: saves BASE's engine wrote after the opening window and after January, loaded by the head, seeds ${seeds.join(',')}`);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) await repairCareer(B, H, era, club, seed);
  console.log(`   ${s5.saves} seeded saves (${s5.equal} loaded byte equal to BASE's load, ${s5.noLoad} did not load), ${s5.lines} deal lines of this season: ${s5.mended} mended, ${s5.mine} left as a deal of mine holds him, ${s5.namesake} left for a namesake at the seller; ${s5.legacy} unseeded saves`);
  if (s5.saves < 6 || !s5.lines) cannot(`section 5: ${s5.saves} saves and ${s5.lines} deal lines, so the repair measured nothing`);
}
if (SECTIONS.has(6)) {
  console.log('6) legacy: unseeded careers, BASE against the head, every saved string and Math.random draw');
  await legacySection(B, H);
  console.log(`   ${s6Careers} careers, ${s6Saves} saves, ${s6Draws} draws and ${s6Deals} deals of mine on the head; ${s6Adopted} adopted at their first summer (Round 1508)`);
  if (!s6Careers || !s6Saves) cannot('section 6: no career was played');
  if (!s6Adopted) cannot('section 6: no career reached its first summer, so the adoption was never seen');
  if (!s6Deals) cannot('section 6: no deal of mine was made, so no ledger writer was called');
}
if (SECTIONS.has(12)) {
  console.log(`12) the window entry: ${CLUBS.now.join(', ')} to the January of season ${WINDOW_SEASON}, ${WINDOW_TRIALS} trials an engine, the head's median at most 3 x BASE's + 5 ms`);
  await timeSection(B, H);
  if (!s12Careers) cannot('section 12: no career was timed');
}
if (SECTIONS.has(7)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3]);
  console.log(`7) my deals with the recording on: a release, a buy and a sale at the start and a season later, on BASE and on the head, seeds ${seeds.join(',')}`);
  for (const era of ERAS) for (const club of CLUBS[era]) for (const seed of seeds) { await mineCareer(B, 'base', era, club, seed); await mineCareer(H, 'head', era, club, seed); }
  console.log(`   BASE: ${s7.base.deals} deals of mine, ${s7.base.refused} without exactly one record; the head: ${s7.head.deals} deals, ${s7.head.refused} without exactly one record`);
  if (s7.head.refused > s7.base.refused) fail(7, `the head left ${s7.head.refused} deals of mine without exactly one ledger record, BASE ${s7.base.refused}`);
  console.log(`   swaps: BASE ${s7.base.swaps}, the head ${s7.head.swaps}; exercised loan options: BASE ${s7.base.options}, the head ${s7.head.options}; deals not reached on the stream: BASE ${s7.base.unreached}, the head ${s7.head.unreached}`);
  if (!s7.head.deals) cannot('section 7: no deal of mine was made');
  if (!s7.head.swaps || !s7.head.options) cannot(`section 7: ${s7.head.swaps} swaps and ${s7.head.options} exercised options on the head, so a kind of deal went unmeasured`);
}
if (SECTIONS.has(8)) {
  console.log('8) the bridge: seeded careers, BASE against the head with scripts/lib/cmNoAiMoves1344.mjs, every saved string and draw; and without it');
  await bridgeSection(B, HB, H);
  console.log(`   ${s8.careers} careers: with the bridge every one checked against BASE; without it ${s8.differ} differ (first at ${Object.entries(s8.first).map(([k, v]) => `${k} x${v}`).join(', ') || 'none'}) and ${s8.equal} do not`);
  if (!s8.careers) cannot('section 8: no career was played');
  if (!s8.differ) fail(8, 'without the bridge no seeded career differs from BASE, so the fleet does not measure the recording');
}
if (SECTIONS.has(10)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3, 4, 5, 6, 7, 8]);
  console.log(`10) the window's skip: Real Madrid sells its eight best outfield men at the start and plays ${S10_SEASONS} seasons, seeds ${seeds.join(',')}`);
  for (const seed of seeds) await skipCareer(H, seed);
  console.log(`   ${s10.careers} careers, ${s10.sold} men sold, ${s10.windows} windows, ${s10.lines} deal lines checked; a man I sold stood in the top 120 a window draws from ${s10.exposed} times`);
  if (!s10.careers || !s10.lines) cannot('section 10: no window was audited');
  if (!s10.exposed) cannot('section 10: no man I sold ever stood where a window draws from, so the skip was never in play');
}
if (SECTIONS.has(11)) {
  const seeds = range(process.env.CM_WORLD_MOVES_SEEDS, [1, 2, 3]);
  console.log(`11) my own results: ${S11_CLUBS.join(', ')} (2026-27), ${S11_SEASONS} seasons, BASE against the head on one stream, seeds ${seeds.join(',')}`);
  for (const club of S11_CLUBS) for (const seed of seeds) await ownResultsCareer(B, H, club, seed);
  console.log(`   ${s11.careers} careers: ${s11.compared} results of mine compared; ${s11.seasonOne} of them in season one; ${s11.whole} compared to the end, ${s11.cutLeague} cut where a deal touched my league, ${s11.cutOpponent} where it touched a club I played; the stream parted after the first summer in ${Object.entries(s11.parted).map(([k, v]) => `${k} x${v}`).join(', ') || 'none'} (measured, not asserted)`);
  if (s11.seasonOne < 100 && !failures[11]?.length) cannot(`section 11: only ${s11.seasonOne} results of season one compared, under 100`);
}
if (SECTIONS.has(9)) {
  console.log(`9) shape: ${SHAPE_SEASONS} seasons at ${CLUBS.now.join(', ')} (the JSON goes to --combine)`);
  await shapeSection({ base: B, head: H });
}

const red = Object.keys(failures).map(Number).sort((a, b) => a - b);
for (const section of red) if (failures[section].length > 8) console.log(`  section ${section}: ${failures[section].length - 8} more failures not shown`);
if (CONTROL) {
  const target = CONTROLS[CONTROL].section;
  const first = CONTROLS[CONTROL].first, arm = CONTROLS[CONTROL].arm;
  /* repairthrows (the critic's correction 8): the repair throws, and every save must still load, byte equal to BASE's
     load (the fail safe left it as it was), while the lines it would have mended stay unmended (red). */
  if (CONTROLS[CONTROL].loads && (s5.noLoad || s5.equal !== s5.saves)) {
    console.log(`simCmWorldMoves: control ${CONTROL} DID NOT FIRE as it must: ${s5.noLoad} saves did not load and ${s5.saves - s5.equal} loaded unlike BASE's load`);
    process.exit(3);
  }
  /* An arm control (section 2) must turn its own arm red and leave the other arm green. */
  if (arm && failures[target]?.length && !failures[target].every(line => line.includes(` ${arm}:`))) {
    console.log(`simCmWorldMoves: control ${CONTROL} DID NOT FIRE as it must: section ${target} red beyond its own arm (${arm})`);
    process.exit(3);
  }
  if (failures[target]?.length && (!first || firstRed1 === first)) { console.log(`simCmWorldMoves: control ${CONTROL} FIRED: section ${target} red (${failures[target].length})${first ? `, first at ${first}` : ''}`); process.exit(1); }
  if (failures[target]?.length) { console.log(`simCmWorldMoves: control ${CONTROL} DID NOT FIRE as it must: section ${target} red, but first at ${firstRed1}, not ${first}`); process.exit(3); }
  console.log(`simCmWorldMoves: control ${CONTROL} DID NOT FIRE: section ${target} stayed green`);
  process.exit(3);
}
if (red.length) { console.log(`simCmWorldMoves: RED, sections ${red.map(s => `${s} (${failures[s].length})`).join(', ')}`); process.exit(1); }
console.log(`simCmWorldMoves: green, sections ${[...SECTIONS].sort((a, b) => a - b).join(', ')} held`);
