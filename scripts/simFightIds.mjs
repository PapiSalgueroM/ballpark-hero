/* Round 1546: a fighter keeps his identity across a reload (Fight Gym, Fight Promoter).
 *
 * THE BUG. Every fighter in the three fight games came out of makeFighter with
 * an id of "f" plus a counter that lived in the module. A page load restarts a
 * module; it does not restart a save. So after a reload the next prospect at
 * the gym door, or the next newcomer in a promoter's pool, wore an id a saved
 * man already had. Training credited the first man with the id, a fight
 * resolved the first man with the id (so the man you clicked was not the man
 * who fought), and letting one man go filtered by id and let both go. No
 * harness had ever round tripped a save through a fresh module.
 *
 * HOW THIS MEASURES IT. A page load is a fresh module, so every reload here is
 * the engine bundle evaluated afresh in a new context (with its own counter,
 * if it has one). Each game is played, saved to JSON,
 * loaded through the board's own sanitizer into a fresh instance and played
 * on, several times over. Every man is told apart by INDEX and by what he is
 * (his drawn fingerprint), never by the id under test.
 *
 * SECTIONS
 *   1 Fight Gym across five reloads: ids unique after every action, the man
 *     trained is the man clicked, the man who fights is the man clicked, one
 *     release removes exactly one man.
 *   2 Fight Promoter across four reloads: pool ids unique after every show,
 *     every bout on the result is the pair that was booked.
 *   3 A save the old rule really broke (played on the old rule, reloaded,
 *     played on) loads with every id unique, every man still showing the
 *     division he showed, the first holder keeping the id and his training,
 *     the counter above every id minted, and then plays on clean. A save with
 *     nothing to repair loads byte for byte as it was saved.
 *   4 The fix moves no draw: a new gym, a new promotion, a new Fight Career,
 *     its offers and the daily come out identical to the old rule's except for
 *     the ids.
 *   5 Every new promotion still opens with two pairs who can be matched.
 *
 * CONTROLS (FIGHT_IDS_CONTROL=...), each must turn its section red:
 *   counter    makeFighter ignores the caller's id and counts in the module
 *              again, which is main before this round            -> 1 and 2
 *   norepair   the load repair is skipped                         -> 3
 *   noclass    the repair forgets the division the man showed     -> 3
 *   drawid     the id costs a draw from the rng                   -> 4
 *   startone   the save counter starts at 1, not 10               -> 5
 *
 * FIGHT_IDS_BASE_DIR=<checkout> takes the OLD rule from that checkout's own
 * engine files (main before this round) instead of rebuilding it here by
 * putting the module counter back. Use it once to prove sections 3 and 4
 * against the real thing.
 *
 * MEASURED (filled in below the sections when set).
 */
import './lib/seedRandom.mjs';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FIGHT_IDS_CONTROL || '';
const BASE_DIR = process.env.FIGHT_IDS_BASE_DIR || '';
const KNOWN = ['', 'counter', 'norepair', 'noclass', 'drawid', 'startone'];
if (!KNOWN.includes(CONTROL)) {
  console.log(`   FAIL unknown control ${CONTROL}`);
  process.exit(1);
}

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);

/* A worktree carries no node_modules of its own, so walk up for the binary. */
function findEsbuild() {
  const exe = process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild';
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', '.bin', exe);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('esbuild not found walking up from ' + ROOT);
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fightids-'));
const deAlias = (s) => s
  .replaceAll('@/lib/careerEngine', './careerEngine')
  .replaceAll('@/lib/fightCareer', './fightCareer');
/* Line endings normalised before any anchor is looked for (simHarnessAnchors). */
const readFrom = (root, p) => deAlias(fs.readFileSync(path.join(root, p), 'utf8').replaceAll('\r\n', '\n'));
const FILES = ['src/lib/careerEngine.ts', 'src/lib/fightCareer.ts', 'src/lib/fightGym.ts', 'src/lib/fightPromoter.ts'];
const name = (p) => path.basename(p);

/* Every control and the old rule assert their anchor exists before editing,
   so a control that changes nothing aborts instead of reading as green. */
function swap(src, which, anchor, replacement) {
  if (!src.includes(anchor)) {
    console.log(`   FAIL ${which}: anchor is not in the source, so it would change nothing`);
    process.exit(1);
  }
  return src.replace(anchor, replacement);
}

const MAKE_ID = '  return { id: id ?? drawnId(drawn), ...drawn };';
const COUNTER = '  moduleSeq += 1;\n  return { id: `f${moduleSeq}`, ...drawn };';
const COUNTER_DECL = '\nlet moduleSeq = 0;\n';

const newSrc = Object.fromEntries(FILES.map(p => [name(p), readFrom(ROOT, p)]));
const oldSrc = BASE_DIR
  ? Object.fromEntries(FILES.map(p => [name(p), readFrom(BASE_DIR, p)]))
  : { ...newSrc };
if (!BASE_DIR) {
  oldSrc['fightCareer.ts'] = swap(oldSrc['fightCareer.ts'], 'old rule', MAKE_ID, COUNTER);
  oldSrc['fightCareer.ts'] = swap(oldSrc['fightCareer.ts'], 'old rule', 'function drawnId(', `${COUNTER_DECL}function drawnId(`);
}

if (CONTROL === 'counter') {
  newSrc['fightCareer.ts'] = swap(newSrc['fightCareer.ts'], 'counter', MAKE_ID, COUNTER);
  newSrc['fightCareer.ts'] = swap(newSrc['fightCareer.ts'], 'counter', 'function drawnId(', `${COUNTER_DECL}function drawnId(`);
} else if (CONTROL === 'norepair') {
  newSrc['fightGym.ts'] = swap(newSrc['fightGym.ts'], 'norepair', '    if (fixed.moved > 0) {\n      out.roster = fixed.lists[0];', '    if (false) {\n      out.roster = fixed.lists[0];');
  newSrc['fightPromoter.ts'] = swap(newSrc['fightPromoter.ts'], 'norepair', '    if (fixed.moved > 0) out.pool = fixed.lists[0];', '    if (false) out.pool = fixed.lists[0];');
} else if (CONTROL === 'noclass') {
  newSrc['fightCareer.ts'] = swap(newSrc['fightCareer.ts'], 'noclass', '    if (shown) fixed.weight = shown;', '    void shown;');
} else if (CONTROL === 'drawid') {
  newSrc['fightCareer.ts'] = swap(newSrc['fightCareer.ts'], 'drawid', MAKE_ID, '  const extra = rng();\n  return { id: id ?? `${drawnId(drawn)}${extra}`, ...drawn };');
} else if (CONTROL === 'startone') {
  newSrc['fightCareer.ts'] = swap(newSrc['fightCareer.ts'], 'startone', 'export const FIRST_FIGHTER_NO = 10;', 'export const FIRST_FIGHTER_NO = 1;');
}
if (CONTROL) console.log(`   [control ${CONTROL} applied]`);

function bundle(tag, src) {
  const dir = path.join(TMP, tag);
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, text] of Object.entries(src)) fs.writeFileSync(path.join(dir, f), text);
  fs.writeFileSync(path.join(dir, 'entry.ts'),
    "export * as ce from './careerEngine';\nexport * as fc from './fightCareer';\nexport * as gym from './fightGym';\nexport * as pro from './fightPromoter';\n");
  const out = path.join(dir, 'bundle.js');
  execSync(`"${findEsbuild()}" "${path.join(dir, 'entry.ts')}" --bundle --format=iife --global-name=FIGHT --platform=neutral --outfile="${out}"`, { stdio: 'pipe' });
  return `${fs.readFileSync(out, 'utf8')}\n;FIGHT;`;
}
const NEW_BUNDLE = bundle('new', newSrc);
const OLD_BUNDLE = bundle('old', oldSrc);

/* A page load: the bundle evaluated afresh in its own context, so it has its
   own module state (a counter, if it has one) exactly as a reloaded tab does,
   and is collected once nothing holds it. A fresh import() of an ES module
   would do the same but is never collected, and this makes hundreds. */
let loads = 0;
const pageLoad = async (code) => { loads += 1; return vm.runInNewContext(code, {}); };

/* What a man IS, which no id can fake: his draw and everything that has happened to him. */
const print = (f) => [f.name, f.style, f.attrs.power, f.attrs.chin, f.attrs.speed, f.attrs.stamina,
  f.attrs.defence, f.attrs.ringIq, f.potential, f.age, f.wins, f.losses, f.draws, f.kos, f.damage, f.rank].join('|');
const drawOnly = (f) => { const { id: _id, ...rest } = f; return JSON.stringify(rest); };
const dupes = (ids) => ids.length - new Set(ids).size;
const gymIds = (g) => [...g.roster.map(f => f.id), ...g.prospects.map(p => p.fighter.id)];
const roundTrip = (x) => JSON.parse(JSON.stringify(x));
const TACTICS = ['box', 'press', 'counter'];
/* Which roster slots an action changed, read off what the men are. */
const changedSlots = (before, after) => after.map((x, i) => (x !== before[i] ? i : -1)).filter(i => i >= 0);

/* One gym week on engine E, acting on the NEWEST man, because after a reload
   the newest man is the one who can wear an old id. */
function gymWeek(E, g, week, t) {
  g = { ...g, money: Math.max(g.money, 3) }; // staged cash: this harness is about who is who, not the books
  if (g.roster.length < 6 && g.prospects.length) {
    const n = E.gym.signProspect(g, g.prospects[week % g.prospects.length].id);
    if (n) { g = n; t.signed += 1; }
  }
  const ti = g.roster.length - 1;
  if (ti >= 0 && !E.gym.trainedThisWeek(g, g.roster[ti].id)) {
    const before = g.roster.map(print);
    const n = E.gym.trainFighter(g, g.roster[ti].id, E.gym.TRAIN_FOCI[week % 4]);
    if (n) {
      t.trained += 1;
      if (changedSlots(before, n.roster.map(print)).some(i => i !== ti)) t.wrongTrain += 1;
      g = n;
    }
  }
  const fi = g.roster.length - 1;
  if (fi >= 0 && g.roster[fi].damage < 60) {
    const offers = E.gym.offersForFighter(g, g.roster[fi].id);
    if (offers.length) {
      const before = g.roster.map(print);
      const r = E.gym.takeGymFight(g, g.roster[fi].id, offers[0], TACTICS);
      if (r) {
        t.fought += 1;
        const moved = changedSlots(before, r.state.roster.map(print));
        if (moved.length !== 1 || moved[0] !== fi) t.wrongFight += 1;
        g = r.state;
      }
    }
  }
  if (week % 7 === 0 && g.roster.length >= 3) {
    const ri = g.roster.length - 1;
    const keep = g.roster.filter((_, i) => i !== ri).map(print).sort().join('\n');
    const n = E.gym.releaseFighter(g, g.roster[ri].id);
    if (n) {
      t.released += 1;
      if (n.roster.length !== g.roster.length - 1 || n.roster.map(print).sort().join('\n') !== keep) t.badRelease += 1;
      g = n;
    }
  }
  g = E.gym.advanceWeek(g);
  t.weeks += 1;
  if (dupes(gymIds(g)) > 0) t.dupWeeks += 1;
  return g;
}

/* One show on engine E: up to three bouts, newest men booked first, every
   booking by id as the board books, every bout checked against who was booked. */
function promoterShow(E, st, t) {
  st = { ...st, money: Math.max(st.money, 2) }; // staged cash, as above
  const used = new Set();
  const bookings = [];
  const booked = [];
  for (let i = st.pool.length - 1; i >= 0 && bookings.length < 3; i -= 1) {
    if (used.has(i)) continue;
    let j = -1;
    for (let k = st.pool.length - 1; k >= 0; k -= 1) {
      if (k !== i && !used.has(k) && E.pro.legalMatch(st.pool[i], st.pool[k])) { j = k; break; }
    }
    if (j < 0) continue;
    used.add(i); used.add(j);
    bookings.push({ aId: st.pool[i].id, bId: st.pool[j].id, rounds: 6, title: false });
    booked.push([print(st.pool[i]), print(st.pool[j])]);
  }
  if (!bookings.length) { t.empty += 1; return st; }
  const r = E.pro.runShow(st, { venueId: 'hall', ticketPrice: 0.00006, bookings }, TACTICS);
  if (!r) { t.refused += 1; return st; }
  t.shows += 1;
  t.wrongBout += Math.abs(bookings.length - r.result.bouts.length);
  r.result.bouts.forEach((b, k) => {
    t.bouts += 1;
    if (!booked[k] || print(b.a) !== booked[k][0] || print(b.b) !== booked[k][1]) t.wrongBout += 1;
  });
  if (dupes(r.state.pool.map(f => f.id)) > 0) t.dupShows += 1;
  return r.state;
}

const GYMS = 40;
const PROMOS = 40;

/* ─── 1. Fight Gym across reloads ─── */
console.log('\n1. Fight Gym: 30 weeks, then a reload every 6 weeks to week 60, 40 gyms');
const s1 = { weeks: 0, dupWeeks: 0, signed: 0, trained: 0, wrongTrain: 0, fought: 0, wrongFight: 0, released: 0, badRelease: 0, reloads: 0, signedAfter: 0 };
for (let s = 0; s < GYMS; s += 1) {
  let E = await pageLoad(NEW_BUNDLE);
  let g = E.gym.newGym(`Ids Gym ${s}`, `fight-ids-gym-${s}`);
  for (let week = 1; week <= 60 && !g.closed; week += 1) {
    if (week > 30 && week % 6 === 1) {
      E = await pageLoad(NEW_BUNDLE);
      g = E.gym.sanitizeGym(roundTrip(g));
      s1.reloads += 1;
    }
    const signedBefore = s1.signed;
    g = gymWeek(E, g, week, s1);
    if (week > 30) s1.signedAfter += s1.signed - signedBefore;
  }
}
console.log(`   ${s1.reloads} reloads, ${s1.weeks} weeks: ${s1.signed} signed (${s1.signedAfter} after the first reload), ${s1.trained} blocks, ${s1.fought} fights, ${s1.released} released`);
console.log(`   weeks ending with two men under one id ${s1.dupWeeks}, wrong man trained ${s1.wrongTrain}, wrong man fought ${s1.wrongFight}, releases that did not remove exactly the one man ${s1.badRelease}`);
if (s1.reloads !== GYMS * 5) fail(`only ${s1.reloads} reloads of ${GYMS * 5}, so the section did not test a reload`);
if (s1.signedAfter < GYMS || s1.fought < GYMS * 30 || s1.released < GYMS * 4) fail('too little was done after the reloads to mean anything (floors: a signing a gym after the reload, 30 fights a gym, 4 releases a gym)');
if (s1.dupWeeks) fail(`${s1.dupWeeks} gym weeks ended with two men under one id`);
else ok('no gym ever holds two men under one id');
if (s1.wrongTrain) fail(`${s1.wrongTrain} training blocks went to a man nobody clicked`);
else ok('every block trains the man clicked');
if (s1.wrongFight) fail(`${s1.wrongFight} fights were fought by a man nobody clicked`);
else ok('the man clicked is the man who fights');
if (s1.badRelease) fail(`${s1.badRelease} releases did not remove exactly the one man`);
else ok('letting one man go lets one man go');

/* ─── 2. Fight Promoter across reloads ─── */
console.log('\n2. Fight Promoter: 15 shows, then a reload every 4 shows to show 30, 40 promotions');
const s2 = { shows: 0, empty: 0, refused: 0, bouts: 0, boutsAfter: 0, wrongBout: 0, dupShows: 0, reloads: 0 };
for (let s = 0; s < PROMOS; s += 1) {
  let E = await pageLoad(NEW_BUNDLE);
  let st = E.pro.newPromoter(`Ids Promotions ${s}`, `fight-ids-promo-${s}`);
  for (let show = 1; show <= 30 && !st.closed; show += 1) {
    if (show > 15 && show % 4 === 0) {
      E = await pageLoad(NEW_BUNDLE);
      st = E.pro.sanitizePromoter(roundTrip(st));
      s2.reloads += 1;
    }
    const before = s2.bouts;
    st = promoterShow(E, st, s2);
    if (show > 15) s2.boutsAfter += s2.bouts - before;
  }
}
console.log(`   ${s2.reloads} reloads, ${s2.shows} shows, ${s2.bouts} bouts (${s2.boutsAfter} after the first reload), ${s2.empty} cards with nobody to match, ${s2.refused} refused`);
console.log(`   shows ending with two men under one id ${s2.dupShows}, bouts fought by somebody other than the men booked ${s2.wrongBout}`);
if (s2.reloads !== PROMOS * 4) fail(`only ${s2.reloads} reloads of ${PROMOS * 4}`);
if (s2.boutsAfter < PROMOS * 15) fail(`only ${s2.boutsAfter} bouts after the reloads (floor ${PROMOS * 15})`);
if (s2.dupShows) fail(`${s2.dupShows} shows left two men under one id in the pool`);
else ok('no pool ever holds two men under one id');
if (s2.wrongBout) fail(`${s2.wrongBout} bouts were not the pair the card booked`);
else ok('every bout on the result is the pair that was booked');

/* ─── 3. Saves the old rule really broke, loaded by the fixed engine ─── */
console.log(`\n3. Saves broken by the old rule${BASE_DIR ? ' (main\'s own engine files)' : ''}: played, reloaded, played on, then loaded`);
const strip = (f) => { const { id: _id, weight: _w, ...rest } = f; return JSON.stringify(rest); };
const firstHolders = (ids) => { const m = new Map(); ids.forEach((id, i) => { if (!m.has(id)) m.set(id, i); }); return m; };
const counterAbove = (book, ids, prefix) => {
  const head = `${prefix}${(book.seed >>> 0).toString(36)}-`;
  const nums = ids.filter(id => id.startsWith(head)).map(id => Number(id.slice(head.length)));
  return !nums.length || (Number.isInteger(book.nextFighterNo) && book.nextFighterNo > Math.max(...nums));
};
const gymTally = () => ({ weeks: 0, dupWeeks: 0, signed: 0, trained: 0, wrongTrain: 0, fought: 0, wrongFight: 0, released: 0, badRelease: 0 });
const proTally = () => ({ shows: 0, empty: 0, refused: 0, bouts: 0, wrongBout: 0, dupShows: 0 });
const s3 = { broken: 0, brokenGym: 0, brokenPro: 0, saves: 0, moved: 0, dupLeft: 0, classMoved: 0, drawMoved: 0, firstLost: 0, trainChanged: 0, counterLow: 0, unstable: 0, clean: 0, cleanChanged: 0 };
const s3gym = gymTally();
const s3pro = proTally();

/* Load one save text on the fixed engine twice (two page loads) and check it. */
async function loadBroken(text, kind) {
  const isGym = kind === 'gym';
  const O = await pageLoad(OLD_BUNDLE);
  const saved = JSON.parse(text);
  const menOf = (x) => (isGym ? [...x.roster, ...x.prospects.map(p => p.fighter)] : x.pool);
  const classOf = (E, f) => (isGym ? E.gym.guessWeight(f) : E.pro.weightOf(f));
  const ids = menOf(saved).map(f => f.id);
  const shown = menOf(saved).map(f => classOf(O, f));
  const drawn = menOf(saved).map(strip);
  s3.saves += 1;
  if (dupes(ids)) { s3.broken += 1; if (isGym) s3.brokenGym += 1; else s3.brokenPro += 1; }
  const E = await pageLoad(NEW_BUNDLE);
  const sanitize = (Eng, x) => (isGym ? Eng.gym.sanitizeGym(x) : Eng.pro.sanitizePromoter(x));
  const h = sanitize(E, JSON.parse(text));
  const again = sanitize(await pageLoad(NEW_BUNDLE), JSON.parse(text));
  const men = menOf(h);
  const ids2 = men.map(f => f.id);
  s3.moved += ids.filter((id, i) => ids2[i] !== id).length;
  if (dupes(ids2)) s3.dupLeft += 1;
  men.forEach((f, i) => {
    if (classOf(E, f) !== shown[i]) s3.classMoved += 1;
    if (strip(f) !== drawn[i]) s3.drawMoved += 1;
  });
  for (const [id, i] of firstHolders(ids)) if (ids2[i] !== id) s3.firstLost += 1;
  if (isGym && JSON.stringify(h.training ?? {}) !== JSON.stringify(saved.training ?? {})) s3.trainChanged += 1;
  if (!counterAbove(h, ids2, isGym ? 'g' : 'p')) s3.counterLow += 1;
  if (JSON.stringify(menOf(again).map(f => f.id)) !== JSON.stringify(ids2)) s3.unstable += 1;
  return { E, h };
}

for (let s = 0; s < GYMS; s += 1) {
  let O = await pageLoad(OLD_BUNDLE);
  let g = O.gym.newGym(`Old Gym ${s}`, `fight-ids-old-gym-${s}`);
  const scratch = gymTally();
  for (let week = 1; week <= 20; week += 1) {
    if (week > 10 && week % 2 === 1) { O = await pageLoad(OLD_BUNDLE); g = roundTrip(g); } // main's load never looked at ids
    g = gymWeek(O, g, week, scratch);
  }
  let { E, h } = await loadBroken(JSON.stringify(g), 'gym');
  for (let week = 21; week <= 32 && !h.closed; week += 1) {
    if (week % 4 === 1) { E = await pageLoad(NEW_BUNDLE); h = E.gym.sanitizeGym(roundTrip(h)); }
    h = gymWeek(E, h, week, s3gym);
  }
}
for (let s = 0; s < PROMOS; s += 1) {
  let O = await pageLoad(OLD_BUNDLE);
  let st = O.pro.newPromoter(`Old Promotions ${s}`, `fight-ids-old-promo-${s}`);
  const scratch = proTally();
  for (let show = 1; show <= 14 && !st.closed; show += 1) {
    if (show > 8 && show % 2 === 1) { O = await pageLoad(OLD_BUNDLE); st = roundTrip(st); }
    st = promoterShow(O, st, scratch);
  }
  let { E, h } = await loadBroken(JSON.stringify(st), 'promoter');
  for (let show = 15; show <= 24 && !h.closed; show += 1) {
    if (show % 3 === 0) { E = await pageLoad(NEW_BUNDLE); h = E.pro.sanitizePromoter(roundTrip(h)); }
    h = promoterShow(E, h, s3pro);
  }
}
/* Nothing to repair: a save loads with its men exactly as written. */
for (let s = 0; s < 20; s += 1) {
  for (const B of [NEW_BUNDLE, OLD_BUNDLE]) {
    const X = await pageLoad(B);
    let g = X.gym.newGym(`Clean Gym ${s}`);
    let st = X.pro.newPromoter(`Clean Promotions ${s}`);
    const scratchG = gymTally();
    const scratchP = proTally();
    for (let w = 1; w <= 10; w += 1) { g = gymWeek(X, g, w, scratchG); st = promoterShow(X, st, scratchP); }
    const E = await pageLoad(NEW_BUNDLE);
    const g2 = E.gym.sanitizeGym(roundTrip(g));
    const st2 = E.pro.sanitizePromoter(roundTrip(st));
    s3.clean += 2;
    if (JSON.stringify([g2.roster, g2.prospects, g2.nextFighterNo]) !== JSON.stringify([g.roster, g.prospects, g.nextFighterNo])) s3.cleanChanged += 1;
    if (JSON.stringify([st2.pool, st2.nextFighterNo]) !== JSON.stringify([st.pool, st.nextFighterNo])) s3.cleanChanged += 1;
  }
}
console.log(`   ${s3.broken} of ${s3.saves} saves came out of the old rule holding two men under one id; ${s3.moved} men moved to a new id on load`);
console.log(`   after load: saves still holding a pair ${s3.dupLeft}, men showing another division ${s3.classMoved}, men changed beyond the id ${s3.drawMoved}, first holders who lost the id ${s3.firstLost}, training maps changed ${s3.trainChanged}, counters not above the ids ${s3.counterLow}, repairs that differ between two loads ${s3.unstable}`);
console.log(`   played on: gym weeks ${s3gym.weeks} (pairs ${s3gym.dupWeeks}, wrong trained ${s3gym.wrongTrain}, wrong fought ${s3gym.wrongFight}, bad releases ${s3gym.badRelease}); shows ${s3pro.shows}, bouts ${s3pro.bouts} (pairs ${s3pro.dupShows}, wrong bouts ${s3pro.wrongBout})`);
console.log(`   ${s3.clean} saves with nothing to repair, ${s3.cleanChanged} of them loaded different from how they were written`);
if (s3.broken < (GYMS + PROMOS) / 2) fail(`only ${s3.broken} broken saves were built, so the repair was barely exercised`);
if (s3.dupLeft) fail(`${s3.dupLeft} saves still hold two men under one id after the load`);
else ok('every broken save loads with every id unique');
if (s3.classMoved) fail(`${s3.classMoved} men show a different division after the load`);
else ok('every man still shows the division he showed before the load');
if (s3.drawMoved || s3.firstLost || s3.trainChanged) fail(`the repair touched more than the shadowing man's id (changed ${s3.drawMoved}, first holders moved ${s3.firstLost}, training maps ${s3.trainChanged})`);
else ok('the first holder keeps the id and his training; only the man shadowing him moves');
if (s3.counterLow || s3.unstable) fail(`counter not above the ids on ${s3.counterLow} saves, repair differs between loads on ${s3.unstable}`);
else ok('the counter sits above every id on the save, and the same save repairs the same way every load');
const after3 = s3gym.dupWeeks + s3gym.wrongTrain + s3gym.wrongFight + s3gym.badRelease + s3pro.dupShows + s3pro.wrongBout;
if (after3 || s3gym.weeks < GYMS * 10 || s3pro.bouts < PROMOS * 10) fail(`after the repair the games did not play on clean (${after3} faults, ${s3gym.weeks} weeks, ${s3pro.bouts} bouts)`);
else ok('a repaired save plays on through more reloads with nobody confused for anybody');
if (s3.cleanChanged) fail(`${s3.cleanChanged} saves with nothing to repair loaded different from how they were written`);
else ok('a save with nothing to repair loads exactly as it was written');

/* ─── 4. The fix moves no draw ─── */
console.log(`\n4. The same names on the old rule${BASE_DIR ? ' (main)' : ''} and the fixed one: everything but the ids, 60 names`);
{
  const N = await pageLoad(NEW_BUNDLE);
  const O = await pageLoad(OLD_BUNDLE);
  let compared = 0;
  let moved = 0;
  const same = (a, b) => { compared += 1; if (a !== b) moved += 1; };
  const offerText = (o) => JSON.stringify({ ...o, opponent: strip(o.opponent) });
  for (let s = 0; s < 60; s += 1) {
    const a = N.gym.newGym(`Draw Gym ${s}`);
    const b = O.gym.newGym(`Draw Gym ${s}`);
    a.roster.forEach((f, i) => same(strip(f), strip(b.roster[i])));
    a.prospects.forEach((p, i) => same(JSON.stringify({ ...p, fighter: strip(p.fighter) }), JSON.stringify({ ...b.prospects[i], fighter: strip(b.prospects[i].fighter) })));
    const ga = N.gym.offersForFighter(a, a.roster[0].id);
    const gb = O.gym.offersForFighter(b, b.roster[0].id);
    ga.forEach((o, i) => same(offerText(o), offerText(gb[i])));
    const pa = N.pro.newPromoter(`Draw Promotions ${s}`);
    const pb = O.pro.newPromoter(`Draw Promotions ${s}`);
    pa.pool.forEach((f, i) => same(strip(f), strip(pb.pool[i])));
    const ca = N.fc.newFightCareer(`Draw ${s}`, 'welter', 'outboxer');
    const cb = O.fc.newFightCareer(`Draw ${s}`, 'welter', 'outboxer');
    same(strip(ca.fighter), strip(cb.fighter));
    const fa = N.fc.offersFor(ca);
    const fb = O.fc.offersFor(cb);
    fa.forEach((o, i) => same(offerText(o), offerText(fb[i])));
    const day = `2026-10-${String(1 + (s % 28)).padStart(2, '0')}`;
    const da = N.fc.dailyFight(day);
    const db = O.fc.dailyFight(day);
    same(strip(da.player), strip(db.player));
    same(strip(da.opponent), strip(db.opponent));
  }
  console.log(`   ${compared} men and offers compared, ${moved} differ beyond the id`);
  if (compared < 60 * 20) fail(`only ${compared} comparisons`);
  if (moved) fail(`${moved} draws moved, so the id change shifted the rng`);
  else ok('every man, prospect, pool, career, offer and daily is drawn exactly as before');
}

/* ─── 5. A new promotion still opens with two pairs who can be matched ─── */
console.log('\n5. The divisions a new promotion opens with, 400 names');
{
  const N = await pageLoad(NEW_BUNDLE);
  const hist = new Map();
  let short = 0;
  for (let s = 0; s < 400; s += 1) {
    const st = N.pro.newPromoter(`Opening Night ${s}`);
    const by = new Map();
    for (const f of st.pool) { const w = N.pro.weightOf(f); by.set(w, (by.get(w) || 0) + 1); }
    const pairs = [...by.values()].reduce((n, v) => n + Math.floor(v / 2), 0);
    hist.set(pairs, (hist.get(pairs) || 0) + 1);
    if (pairs < 2) short += 1;
  }
  console.log(`   matchable pairs on the first card: ${[...hist.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k} pairs ${v}`).join(', ')}`);
  if (short) fail(`${short} of 400 new promotions open with fewer than two pairs who can be matched`);
  else ok('every new promotion opens with two pairs who can be matched, as it always has');
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures) {
  console.log(`\nsimFightIds: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}`);
  process.exit(1);
}
console.log(`\nsimFightIds: all sections passed${CONTROL ? ` under control ${CONTROL} (a control that passes did NOT fire)` : ''}`);
process.exit(0);
