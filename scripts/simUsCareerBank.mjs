/**
 * Round 1104 harness: the bank of the four US careers never goes below zero,
 * and a reload never pays anybody.
 *
 * THE BUG THIS EXISTS FOR. In NFL, NBA, MLB and NHL My Career a card, a text or
 * a rival beat could take the bank below zero. The board printed "-$0.4M", and
 * the next load "repaired" it: the Round 422 repair read any negative balance
 * as the old upkeep defect and rebuilt the account from career earnings, so
 * -0.4M reloaded as $4.2M. One idea in four copies (the Round 426 lesson).
 * The rule is one function now, src/lib/usCareerBank.ts, applied where each
 * sport's binding is built, and it collects a shortfall from savings and
 * holdings (coverShortfall in src/lib/careerMoney.ts) before it writes
 * anything off, so money parked in savings is not a shield.
 *
 * TWO ARMS, ONE BUNDLE. The four bindings are bundled once. The OLD arm is
 * that bundle patched back to the behaviour before the round (the wrapper
 * hands the binding back untouched and every negative balance is rebuilt on
 * load). The bundle is patched, never the source, and every patch first
 * proves its needle is there exactly once.
 *
 * CHECKS (each failure is tagged check:sport, which is what the controls read):
 *   1a  Every option of every card a mid career deck holds, applied at a ZERO
 *       balance with empty savings: the new arm never ends below zero. The old
 *       arm's count is printed and must be above zero for every sport, or the
 *       check proves nothing.
 *   1b  The same, with a zero pocket and 50M in savings: pocket plus savings
 *       plus holdings ends exactly where the old arm's did (the wrapper moved
 *       money from savings to the pocket and forgave nothing), and the pocket
 *       is not below zero. A played save reloaded with savings behind a debt
 *       pays the debt out of them.
 *   2   Whole careers through the board's loop (seasons, progress, the summer's
 *       cards, inbox answers, rival beats and choices, random shop buys and
 *       money app actions): the balance is read after EVERY call and is never
 *       below zero.
 *   3   Reload: a healthy save is the same object; an old save with no summer
 *       mark keeps the Round 422 rebuild to the digit; a played save reloads at
 *       exactly zero, for 2,000 random negative balances a sport.
 *   4   Printed, asserted on nothing: how many options the floor touched and
 *       what it wrote off, per sport.
 *
 * MEASURED 2026-10-08 on GitHub runners (request r1104-fc), at 104 states and
 * 300 careers a sport, SIM_SEED 1, 2 and 3 (every verdict the same on all
 * three; the counts are seed 1, with seeds 2 and 3 within 5 percent of them):
 *   1a  options applied at a zero pocket, and how many of them the OLD arm
 *       left below zero (the bug) against the new arm:
 *         nfl 20,684 applied, old 3,267 (15.8 percent), new 0
 *         nba 20,426 applied, old 3,310 (16.2 percent), new 0
 *         mlb 18,987 applied, old 2,474 (13.0 percent), new 0
 *         nhl 19,994 applied, old 2,756 (13.8 percent), new 0
 *   1b  with 50M in savings every one of those bills was collected in full
 *       (3,267, 3,310, 2,474, 2,756), 0 forgiven, 0 pockets left below zero.
 *   2   whole careers, the balance read after every call: nfl 5,053 seasons
 *       and 43,553 calls, nba 6,013 and 50,359, mlb 6,102 and 49,567, nhl
 *       6,465 and 54,705; 0 below zero in any, lowest balance seen 0.
 *   3   old save rebuilt to 90 as before, the scout's save on 0, and 0 of
 *       2,000 played saves refilled, in all four.
 *   4   printed only: what the floor wrote off at an empty account, a time:
 *       nfl 0.60M, nba 0.68M, mlb 0.44M, nhl 0.59M.
 * These are hard rules (a count that must be zero), so there is no band to
 * set; the numbers above are the size of what was read, and each check also
 * fails when it read too little (1a under 2,000 options, 2 under four
 * seasons a career). On the code as found, 72 of the digest's 464 careers
 * went below zero (src/test/usCareerTruthDigest.test.ts).
 *
 * NEGATIVE CONTROLS, BANK_CONTROL=:
 *   nfl | nba | mlb | nhl   that sport's binding is built without the wrapper
 *                           and with the old repair: 1a and 3 go red for that
 *                           sport and nothing else does.
 *   refill                  every negative balance is rebuilt on load again: 3
 *                           goes red for all four, and so does 1b, whose load
 *                           case (a played save with savings behind a debt)
 *                           reads the same marker. Nothing else does.
 *   nocover                 the floor writes a shortfall off without asking
 *                           savings: 1b goes red for all four and nothing else
 *                           does.
 * A control run exits 0 only when exactly the expected tags failed.
 *
 * Sizes: BANK_STATES mid career states a sport (default 112, which is 20,000
 * options or more in every sport, the size the round's brief asked for),
 * BANK_CAREERS whole careers a sport (default 300, the brief's size too). The
 * first cut ran 48 and 40. A run takes about three minutes on a GitHub runner. Nothing here reaches the network.
 *
 * Run: node scripts/simUsCareerBank.mjs
 */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { build } from 'esbuild';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.BANK_CONTROL || '';
const SPORT_IDS = ['nfl', 'nba', 'mlb', 'nhl'];
const CONTROLS = [...SPORT_IDS, 'refill', 'nocover'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`BANK_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const SEED = Number(process.env.SIM_SEED || 1);
const STATES = Number(process.env.BANK_STATES || 112);
const CAREERS = Number(process.env.BANK_CAREERS || 300);

const failed = new Map();
const fail = (tag, msg) => {
  if (!failed.has(tag)) { failed.set(tag, 0); console.error(`  FAIL [${tag}]: ${msg}`); }
  failed.set(tag, failed.get(tag) + 1);
};

function mulberry(seed) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const store = new Map();
globalThis.localStorage ??= { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear() };

/* ── the bundle and its arms ── */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `uscareerbank-${process.pid}-`));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

const ENTRY = [
  `export { NFL_CAREER_SPORT as nfl } from './src/lib/nflCareerSport.ts';`,
  `export { NBA_CAREER_SPORT as nba } from './src/lib/nbaCareerSport.ts';`,
  `export { MLB_CAREER_SPORT as mlb } from './src/lib/mlbCareerSport.ts';`,
  `export { NHL_CAREER_SPORT as nhl } from './src/lib/nhlCareerSport.ts';`,
  `export { startSummer, answerSummerCard } from './src/lib/usCareerSummer.ts';`,
  `export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';`,
].join('\n');
const rawOut = path.join(tmpDir, 'raw.mjs');
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: rawOut, absWorkingDir: ROOT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const RAW = fs.readFileSync(rawOut, 'utf8');

/** Replace a needle that must be in the bundle exactly once, or refuse to run. */
function patch(text, needle, next, what) {
  const n = text.split(needle).length - 1;
  if (n !== 1) {
    console.error(`simUsCareerBank: the patch "${what}" needs its needle exactly once in the bundle and found it ${n} times, so it would prove nothing:\n  ${needle}`);
    process.exit(1);
  }
  return text.replace(needle, next);
}
const N_WRAP = 'function withBankFloor(sport) {';
const N_MARK = 'function playedSinceSummer(c) {';
const N_COVER = 'function coverShortfall(s, year, sport, floor) {';
const bindingNeedle = id => `var ${id.toUpperCase()}_CAREER_SPORT = withBankFloor({`;
/* The Round 422 repair as it stood, for a save that owns nothing (the reload
   saves below own nothing), put back on one sport by its control. */
const OLD_ONE = 'function __r1104OldBinding(s) { return { ...s, repairNetWorth: (c) => ((c.netWorth ?? 0) >= 0 ? c : { ...c, netWorth: Math.max(0, Math.round(c.earnings * 0.45 * 10) / 10) }) }; }\n';

function armText(kind) {
  let t = RAW;
  if (kind === 'old') {
    t = patch(t, N_WRAP, `${N_WRAP}\n  return sport;`, 'old arm: no wrapper');
    t = patch(t, N_MARK, `${N_MARK}\n  return false;`, 'old arm: every negative balance is rebuilt');
    return t;
  }
  if (SPORT_IDS.includes(CONTROL)) {
    t = patch(t, bindingNeedle(CONTROL), `var ${CONTROL.toUpperCase()}_CAREER_SPORT = __r1104OldBinding({`, `control ${CONTROL}: the old binding`);
    t = OLD_ONE + t;
  }
  if (CONTROL === 'refill') t = patch(t, N_MARK, `${N_MARK}\n  return false;`, 'control refill');
  if (CONTROL === 'nocover') t = patch(t, N_COVER, `${N_COVER}\n  return [];`, 'control nocover');
  return t;
}
async function loadArm(kind) {
  const file = path.join(tmpDir, `${kind}.mjs`);
  fs.writeFileSync(file, armText(kind));
  return import(pathToFileURL(file).href);
}
/* Every needle is proved present even on a plain run, so a rename in src
   cannot quietly retire a control. */
for (const [needle, what] of [[N_WRAP, 'wrapper'], [N_MARK, 'summer mark'], [N_COVER, 'cover'], ...SPORT_IDS.map(id => [bindingNeedle(id), `${id} binding`])]) patch(RAW, needle, needle, what);
const NEW = await loadArm('new');
const OLD = await loadArm('old');

/* ── the board's loop, on one arm ── */
const r2 = v => Math.round(v * 100) / 100;
const copy = o => JSON.parse(JSON.stringify(o));
const SHOP_ACTIONS = ['deposit', 'withdraw', 'buy', 'sell', 'cards'];
const ASSET_IDS = ['ladder', 'bricks', 'cleats', 'screens', 'spark'];

/** One career through the binding. `see(c, where)` is told after every call.
 *  `stopAt` seasons, or the sport's own retirement. Math.random is this
 *  career's own stream for the whole drive (the bindings dismiss a rival beat
 *  with no generator handed in) and is put back in the finally. */
function drive(arm, id, key, stopAt, see, extras) {
  const sport = arm[id];
  const keep = Math.random;
  Math.random = mulberry(SEED * 100003 + key * 7919 + id.charCodeAt(1));
  const pick = mulberry(SEED * 50021 + key * 104729 + id.charCodeAt(2));
  try {
    const pos = sport.create.positions[key % sport.create.positions.length];
    const archs = sport.create.archetypes[pos];
    const era = sport.create.eras[key % sport.create.eras.length].id;
    let c = sport.startCareer(`Bank ${key}`, pos, archs[key % archs.length], Math.random, null, era);
    let tq = sport.rollTeamQuality(null, Math.random);
    sport.assignRole(c, tq, Math.random);
    for (let n = 0; n < stopAt && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(sport.suspendedLine(c));
        sport.progress(c, Math.random); see(c, 'progress');
        continue;
      }
      if (c.contractYears <= 0) {
        const open = sport.buildFaWindow(c, tq, Math.random).offers.filter(x => !x.gone);
        if (open.length) {
          const offer = open[Math.floor(pick() * open.length)];
          arm.applyFaSigning(c, offer);
          sport.campBattle(c, offer.quality, Math.random);
          tq = offer.quality;
        }
      }
      sport.campBattle(c, tq, Math.random);
      sport.simSeason(c, tq, Math.random); see(c, 'season');
      sport.progress(c, Math.random); see(c, 'progress');
      if (sport.shouldRetire(c)) { c.retired = true; break; }
      let ev = arm.startSummer(c, sport, Math.random, null);
      while (ev) {
        ev = arm.answerSummerCard(c, sport, ev, Math.floor(pick() * ev.options.length), Math.random, null).next; see(c, 'card');
      }
      tq = sport.rollTeamQuality(tq, Math.random);
      const unread = (c.phoneInbox ?? []).find(m => m.answered === undefined);
      if (unread) { sport.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length)); see(c, 'inbox'); }
      if (c.pendingRivalryEvent) { c = sport.dismissRivalryEvent(c).state; see(c, 'rival beat'); }
      if (c.pendingRivalryChoice) {
        const res = sport.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), Math.random);
        if (res) { c = res.state; see(c, 'rival choice'); }
      }
      if (extras) {
        /* The hub between seasons: one shop tap and two money app taps. */
        const item = sport.shopItems[Math.floor(pick() * sport.shopItems.length)];
        const bought = sport.buyItem(c, item.id);
        if (bought) { c = bought.state; see(c, 'shop'); }
        for (let k = 0; k < 2; k += 1) {
          const t = SHOP_ACTIONS[Math.floor(pick() * SHOP_ACTIONS.length)];
          const amount = r2(Math.max(0.05, (c.netWorth ?? 0) * (0.2 + pick() * 1.1)));
          const assetId = ASSET_IDS[Math.floor(pick() * ASSET_IDS.length)];
          const action = t === 'deposit' ? { t, amount } : t === 'withdraw' ? { t, amount: r2(pick() * 5) }
            : t === 'buy' ? { t, id: assetId, amount } : t === 'sell' ? { t, id: assetId, frac: 0.5 } : { t, stake: 0.05 };
          sport.moneyAct(c, action); see(c, `money ${t}`);
        }
      }
    }
    return c;
  } finally {
    Math.random = keep;
  }
}

/* ── checks 1a, 1b and 4: every option of every card, at a zero pocket ── */
const total = (arm, id, c) => r2((c.netWorth ?? 0) + arm[id].moneyWealth(c));
const printed = {};
console.log(`simUsCareerBank: seed ${SEED}, ${STATES} mid career states and ${CAREERS} whole careers a sport${CONTROL ? `, control ${CONTROL}` : ''}`);
console.log('1) every option of every card in the deck, applied at a zero pocket');
for (const id of SPORT_IDS) {
  let applied = 0, oldBelow = 0, newBelow = 0, writtenOff = 0, shieldChecked = 0, shieldBroken = 0, pocketBelow = 0;
  for (let k = 0; k < STATES; k += 1) {
    const state = drive(NEW, id, 1000 + k, 2 + (k % 9), () => {}, false);
    if (state.retired) continue;
    delete state.summer;
    const snap = JSON.stringify({ ...state, netWorth: 0, money: undefined });
    const rich = JSON.stringify({ ...state, netWorth: 0, money: { vault: 50 } });
    const deckSeed = SEED * 31 + k;
    const cardsNew = NEW[id].eventDeck(JSON.parse(snap), mulberry(deckSeed));
    const cardsOld = OLD[id].eventDeck(JSON.parse(snap), mulberry(deckSeed));
    if (cardsNew.length !== cardsOld.length) { fail(`1a:${id}`, `the two arms dealt decks of ${cardsNew.length} and ${cardsOld.length} cards from one state`); continue; }
    for (let ci = 0; ci < cardsNew.length; ci += 1) {
      for (let oi = 0; oi < cardsNew[ci].options.length; oi += 1) {
        const seed = deckSeed * 977 + ci * 31 + oi;
        const a = JSON.parse(snap); const b = JSON.parse(snap);
        cardsOld[ci].options[oi].apply(a, mulberry(seed));
        cardsNew[ci].options[oi].apply(b, mulberry(seed));
        applied += 1;
        if ((a.netWorth ?? 0) < 0) { oldBelow += 1; writtenOff += -(a.netWorth); }
        if ((b.netWorth ?? 0) < 0) { newBelow += 1; fail(`1a:${id}`, `card ${cardsNew[ci].id} option ${oi} left the bank on ${b.netWorth} from a zero balance`); }
        /* 1b: the same answer with 50M in savings behind an empty pocket. */
        const ra = JSON.parse(rich); const rb = JSON.parse(rich);
        cardsOld[ci].options[oi].apply(ra, mulberry(seed));
        cardsNew[ci].options[oi].apply(rb, mulberry(seed));
        if ((ra.netWorth ?? 0) < 0 && (ra.netWorth ?? 0) > -50) {
          shieldChecked += 1;
          if (Math.abs(total(OLD, id, ra) - total(NEW, id, rb)) > 0.011) {
            shieldBroken += 1;
            fail(`1b:${id}`, `card ${cardsNew[ci].id} option ${oi} cost ${r2(-ra.netWorth)} with 50 in savings, and pocket plus savings ended on ${total(NEW, id, rb)} where the bill in full leaves ${total(OLD, id, ra)}`);
          }
          if ((rb.netWorth ?? 0) < 0) { pocketBelow += 1; fail(`1b:${id}`, `card ${cardsNew[ci].id} option ${oi} left the pocket on ${rb.netWorth} with savings to pay from`); }
        }
      }
    }
  }
  if (applied < 2000) fail(`1a:${id}`, `only ${applied} options were applied, so the check is close to empty`);
  if (oldBelow === 0) fail(`1a:${id}`, 'the old arm never ended below zero, so this check proves nothing for this sport');
  if (shieldChecked === 0) fail(`1b:${id}`, 'no option cost more than an empty pocket held, so the savings check ran on nothing');
  printed[id] = { applied, oldBelow, writtenOff: r2(writtenOff) };
  console.log(`   ${id}: ${applied} options applied; below zero after, old arm ${oldBelow}, new arm ${newBelow}; with 50M in savings ${shieldChecked} bills collected in full, ${shieldBroken} forgiven, ${pocketBelow} pockets left below zero`);
}
/* 1b on load: a played save with savings behind a debt pays the debt from them. */
for (const id of SPORT_IDS) {
  const s = drive(NEW, id, 1, 2, () => {}, false);
  const save = { ...copy(s), netWorth: -0.4, eventLastFired: { some_card: 2026 }, money: { vault: 50 } };
  const loaded = NEW[id].repairNetWorth(save);
  if (loaded.netWorth !== 0 || Math.abs(NEW[id].moneyWealth(loaded) - 49.6) > 0.001) {
    fail(`1b:${id}`, `a played save at -0.4 with 50 in savings reloaded on ${loaded.netWorth} with ${NEW[id].moneyWealth(loaded)} in savings; the debt should come out of savings (0 and 49.6)`);
  }
}

/* ── check 2: whole careers, the balance read after every call ── */
console.log('2) whole careers through the board loop, with shop and money app taps, read after every call');
for (const id of SPORT_IDS) {
  let calls = 0, below = 0, seasons = 0, lowest = Infinity, firstBad = null;
  for (let k = 0; k < CAREERS; k += 1) {
    const c = drive(NEW, id, 5000 + k, 30, (s, where) => {
      calls += 1;
      const n = s.netWorth ?? 0;
      if (n < lowest) lowest = n;
      if (n < 0) { below += 1; firstBad ??= `career ${k} after ${where}: ${n}`; }
    }, true);
    seasons += c.seasons.length;
  }
  if (below > 0) fail(`2:${id}`, `${below} of ${calls} calls left the balance below zero (first: ${firstBad})`);
  if (seasons < CAREERS * 4) fail(`2:${id}`, `only ${seasons} seasons were played over ${CAREERS} careers`);
  console.log(`   ${id}: ${CAREERS} careers, ${seasons} seasons, ${calls} calls read, ${below} below zero, lowest balance seen ${lowest === Infinity ? 'none' : lowest}`);
}

/* ── check 3: the reload ── */
console.log('3) the reload: healthy untouched, an old save rebuilt as before, a played save stopped at zero');
const MARK = { eventLastFired: { some_card: 2026 } };
for (const id of SPORT_IDS) {
  const sport = NEW[id];
  const base = { ...copy(drive(NEW, id, 2, 2, () => {}, false)), purchased: [] };
  delete base.eventLastFired; delete base.summerSalt; delete base.summer; delete base.money;
  const healthy = { ...base, netWorth: 12.5 };
  if (sport.repairNetWorth(healthy) !== healthy) fail(`3:${id}`, 'a healthy save did not come back as the same object');
  const rebuilt = sport.repairNetWorth({ ...base, netWorth: -40, earnings: 200 }).netWorth;
  if (rebuilt !== 90) fail(`3:${id}`, `an old save at -40 with 200 earned (no summer mark) was rebuilt to ${rebuilt}, not the 90 Round 422 gives it`);
  const scout = sport.repairNetWorth({ ...base, ...MARK, netWorth: -0.4, earnings: 9.4 }).netWorth;
  if (scout !== 0) fail(`3:${id}`, `a played save at -0.4 with 9.4 earned reloaded on ${scout}, not 0 (the scout's reload gave 4.2)`);
  const rng = mulberry(SEED * 13 + id.charCodeAt(0));
  let refilled = 0, worst = 0;
  for (let i = 0; i < 2000; i += 1) {
    const debt = -r2(0.1 + rng() * 60);
    const marks = i % 3 === 0 ? MARK : i % 3 === 1 ? { summerSalt: 'k3' } : { summer: { year: 2026, ids: ['x'], at: 0 } };
    const out = sport.repairNetWorth({ ...base, ...marks, netWorth: debt, earnings: r2(rng() * 400) }).netWorth;
    if (out !== 0) { refilled += 1; if (out > worst) worst = out; }
  }
  if (refilled > 0) fail(`3:${id}`, `${refilled} of 2000 played saves with a negative balance reloaded on something other than 0 (the most: ${worst})`);
  console.log(`   ${id}: healthy same object, old save rebuilt to ${rebuilt}, the scout's save on ${scout}, 2000 played saves swept, ${refilled} refilled`);
}

/* ── 4: printed, asserted on nothing ── */
console.log('4) MEASURED, asserted on nothing: what the floor touches at a zero balance with nothing in savings');
for (const id of SPORT_IDS) {
  const p = printed[id];
  console.log(`   ${id}: ${p.oldBelow} of ${p.applied} options (${(100 * p.oldBelow / Math.max(1, p.applied)).toFixed(1)} percent) cost more than an empty account held; the floor wrote off ${p.writtenOff}M across them, ${(p.writtenOff / Math.max(1, p.oldBelow)).toFixed(2)}M a time`);
}
console.log('   The floor is read at the end of a call, so a card that spends and then pays out is netted first: nobody is handed a ticket he could not pay for and also its winnings on top of a forgiven price.');

/* ── the verdict ── */
const tags = [...failed.keys()].sort();
console.log('');
if (CONTROL) {
  /* A sport's own control must turn 1a and 3 red for that sport. Its 1b and 2
     may go red with them (an unwrapped binding leaves a pocket below zero
     there too, when a career happens to meet such a card) and are not
     required, because requiring a thing that depends on the draw is a coin
     toss. No tag of another sport may appear. */
  const must = (SPORT_IDS.includes(CONTROL) ? [`1a:${CONTROL}`, `3:${CONTROL}`]
    : CONTROL === 'refill' ? SPORT_IDS.flatMap(id => [`1b:${id}`, `3:${id}`]) : SPORT_IDS.map(id => `1b:${id}`));
  const may = SPORT_IDS.includes(CONTROL) ? [`1b:${CONTROL}`, `2:${CONTROL}`] : [];
  const missing = must.filter(t => !tags.includes(t));
  const stray = tags.filter(t => !must.includes(t) && !may.includes(t));
  if (!missing.length && !stray.length) {
    console.log(`simUsCareerBank control ${CONTROL}: green. The expected checks went red (${tags.join(', ')}) and nothing else did, so this harness works.`);
    process.exit(0);
  }
  console.error(`simUsCareerBank control ${CONTROL}: RED. Must fail [${must.join(', ')}], may fail [${may.join(', ')}], got [${tags.join(', ')}]; missing [${missing.join(', ')}], stray [${stray.join(', ')}].`);
  process.exit(1);
}
if (tags.length) {
  console.error(`simUsCareerBank: ${tags.length} check${tags.length === 1 ? '' : 's'} failed (${tags.join(', ')})`);
  process.exit(1);
}
console.log('simUsCareerBank: green. No call leaves a bank below zero in any of the four careers, savings pay a bill before anything is written off, and a reload never adds money.');
