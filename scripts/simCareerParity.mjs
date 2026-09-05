/**
 * Round 469 harness: one loop, two careers.
 *
 * His words (docs/TWEAKS-2026-08-28.md): "The gap between the soccer career
 * and the NFL career is visible to a casual eye; close it." And CLAUDE.md,
 * 2026-09-04: a new sport is DATA plus that sport's events, not a new engine.
 *
 * Round 469 lifted three pieces of the flagship's loop into sport neutral
 * modules and bound the NFL career to them:
 *
 *   careerMoney.ts    the savings account, the market, the statement and the
 *                     card school (Round 134, Round 437), behind a MoneySport
 *                     descriptor. soccerMoney.ts and nflCareerMoney.ts bind it.
 *   careerSocial.ts   what the fans nag you for, by position (Round 319), and
 *                     the headlines a season writes. PhonePanel.tsx and
 *                     nflCareerLoop.ts read it.
 *   careerBadges.ts   a badge table evaluated on the facts of a career.
 *
 * The thing this harness exists to stop is the Round 426 shape: the same idea
 * written twice, so a bug fixed in one career lives on in the other. It holds
 * that with source checks and with outcomes, because a source check alone
 * cannot tell whether the shared module actually runs in both games.
 *
 * SECTIONS
 *
 *   1. Source. careerMoney.ts is imported by both money wrappers and each
 *      engine runs its wrapper; careerSocial.ts is imported by both careers'
 *      screens; and no rule fingerprint of either (the savings rate, the
 *      market season, the anchor pull, the card school, the keeper's ask, the
 *      paper) lives in any other file under src, comments stripped first so
 *      prose about the rules cannot satisfy or trip the check.
 *   2. Money balances, in both careers, driven through the REAL engines with
 *      random deposits, withdrawals, buys, sells and card sittings between
 *      seasons: every accepted action moves cash by exactly what the statement
 *      says, conserves cash plus savings plus holdings to the trade fee, and
 *      never takes cash under the floor; a refused action changes nothing;
 *      every season pays savings exactly the printed rate, keeps the history
 *      and the statement bounded, and covers a balance under the floor out of
 *      savings. Then the seam itself: the two sport descriptors on the same
 *      seed must draw the same eight seasons of prices and the same savings
 *      to the cent, differing only in the currency sign.
 *   3. Social. Every line the fans and the paper can print for every position
 *      in both sports, enumerated statically and harvested from played
 *      careers, is checked against the stat words that position is never
 *      judged on. A keeper is never asked for goals and a kicker is never
 *      asked for touchdowns.
 *   4. Rival. A named generated rival exists on every NFL save from draft
 *      night and on every soccer save by the time the player is 22, and he
 *      moves: ages, changes rating, and the head to head or the career line
 *      grows season on season.
 *   5. Badges. Every badge in the NFL table is earned at least once across
 *      ordinary and forced elite careers (a badge nobody can earn is dead
 *      words in a case), and a career that has not played a season earns
 *      none.
 *
 * NEGATIVE CONTROLS, PARITY_CONTROL=...
 *
 *   privatecopy  section 1 sees soccerMoney.ts with the real moneySeasonTick
 *                body pasted back in as a private copy. Must go red.
 *   printer      the bundle runs a copy of careerMoney.ts where a deposit
 *                credits savings without debiting the account, which is the
 *                shape of a money printer. Section 2 must go red in BOTH
 *                careers, which is the proof they run one module.
 *   blindfans    the bundle runs a copy of careerSocial.ts that asks a kicker
 *                for touchdowns. Section 3 must go red.
 *
 *   Each control asserts the text it rewrites is present first, because a
 *   control that rewrites a string the file does not contain changes nothing
 *   and is green for the wrong reason.
 *
 * THRESHOLDS, from measured headroom on the shipped code (40 careers a sport):
 *   soccer saves with a rival by the end of the run   measured 100%, floor 90%
 *   NFL rival rating moved off its draft number        measured 100%, floor 90%
 *   fan and paper lines harvested per sport            measured 1,100 to 3,600, floor 200
 *
 * Run: node scripts/simCareerParity.mjs [careers]
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAREERS = Number(process.argv[2] || 40);
const CONTROL = process.env.PARITY_CONTROL || '';
const CONTROLS = ['privatecopy', 'printer', 'blindfans'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`PARITY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerparity-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const norm = s => s.split('\r\n').join('\n');
const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const r2 = v => Math.round(v * 100) / 100;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const pct = (n, d) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`);

/* ─── controls that patch the shared modules ──────────────────────────────── */

const MONEY_SRC = 'src/lib/careerMoney.ts';
const SOCIAL_SRC = 'src/lib/careerSocial.ts';
/* The deposit, both halves. The printer keeps the second and drops the first. */
const DEPOSIT_LINES = '    s.netWorth = r2(cashOf(s) - amount);\n    m.vault = r2(m.vault + amount);';
const PRINTER_LINES = '    m.vault = r2(m.vault + amount);';
const KICKER_ASK = "case 'K': return 'Just make the kicks please 🙏';";
const BLIND_ASK = "case 'K': return 'More touchdowns please 🙏';";

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
/* Both shared modules import nothing, so a patched copy can live in the temp
   directory and every import of them in the bundle is pointed at it. */
if (CONTROL === 'printer') redirects.careerMoney = patchedCopy(MONEY_SRC, DEPOSIT_LINES, PRINTER_LINES, 'printer');
if (CONTROL === 'blindfans') redirects.careerSocial = patchedCopy(SOCIAL_SRC, KICKER_ASK, BLIND_ASK, 'blindfans');
if (CONTROL) console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);

const redirectPlugin = {
  name: 'parity-control',
  setup(b) {
    b.onResolve({ filter: /careerMoney(\.ts)?$/ }, () => (redirects.careerMoney ? { path: redirects.careerMoney } : undefined));
    b.onResolve({ filter: /careerSocial(\.ts)?$/ }, () => (redirects.careerSocial ? { path: redirects.careerSocial } : undefined));
  },
};

/* ─── bundle the real engines ─────────────────────────────────────────────── */

const R = ROOT.replaceAll('\\', '/');
const ENTRY = path.join(tmpDir, 'parityEntry.mjs');
const BUNDLE = path.join(tmpDir, 'parity.bundle.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${R}/src/lib/soccerCareerEngine.ts');
export const soccerMoney = await import('${R}/src/lib/soccerMoney.ts');
export const nfl = await import('${R}/src/lib/nflMyCareer.ts');
export const nflMoney = await import('${R}/src/lib/nflCareerMoney.ts');
export const nflLoop = await import('${R}/src/lib/nflCareerLoop.ts');
export const social = await import('${R}/src/lib/careerSocial.ts');
export const badges = await import('${R}/src/lib/careerBadges.ts');
export const shared = await import('${R}/src/lib/careerMoney.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [redirectPlugin], absWorkingDir: ROOT,
});
const { soccer, soccerMoney, nfl, nflMoney, nflLoop, social, badges, shared } = await import(pathToFileURL(BUNDLE).href);

const { ASSETS, CASH_FLOOR, TRADE_FEE, SAVINGS_RATE, MAX_LEDGER, MAX_HISTORY, PAR, CARD_MAX, CARD_PAYS } = shared;

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Source: one module, imported by both, copied by neither
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('1) Source: the shared modules are imported by both careers and copied by neither');

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

if (CONTROL === 'privatecopy') {
  const money = readSrc(MONEY_SRC);
  const start = money.indexOf('export function moneySeasonTick');
  const end = money.indexOf('\n}\n', start);
  if (start < 0 || end < 0) { console.error('control privatecopy: could not find moneySeasonTick in careerMoney.ts'); process.exit(1); }
  const body = money.slice(start, end + 3).replace('export function', 'function');
  const rel = 'src/lib/soccerMoney.ts';
  const before = code.get(rel);
  const after = stripComments(`${before}\n${body}`);
  if (after === before || !/m\.age \+= 1;/.test(after) || !/def\.pull \* \(anchor - shocked\)/.test(after)) {
    console.error('control privatecopy: the rewrite changed nothing, so this control would prove nothing');
    process.exit(1);
  }
  code.set(rel, after);
}

/* The shapes of the rules. Each must be found in its home file, because a
   fingerprint that matches nothing is a check that cannot fail, and in no
   other file, because that is a second copy. */
const RULES = [
  { home: 'src/lib/careerMoney.ts', what: 'the savings rate', re: /export const SAVINGS_RATE\s*=/ },
  /* The wrappers export a function of the same name that delegates, so the
     fingerprint is the season counter inside the rule, not the name. */
  { home: 'src/lib/careerMoney.ts', what: 'the market season', re: /m\.age \+= 1;/ },
  { home: 'src/lib/careerMoney.ts', what: 'the anchor pull', re: /def\.pull \* \(anchor - shocked\)/ },
  { home: 'src/lib/careerMoney.ts', what: 'the card school', re: /function cardsPlay\b/ },
  { home: 'src/lib/careerMoney.ts', what: 'the card odds', re: /export const CARD_WIN\s*=/ },
  { home: 'src/lib/careerMoney.ts', what: 'the forced sale', re: /"Savings covered the bills"/ },
  { home: 'src/lib/careerMoney.ts', what: 'the fee on both sides', re: /\* \(1 - TRADE_FEE\)/ },
  { home: 'src/lib/careerSocial.ts', what: 'the fan comments', re: /function fanComments\b/ },
  { home: 'src/lib/careerSocial.ts', what: "the keeper's ask", re: /More clean sheets please/ },
  { home: 'src/lib/careerSocial.ts', what: "the defender's ask", re: /Lock it down at the back please/ },
  { home: 'src/lib/careerSocial.ts', what: 'the paper', re: /function statHeadline\b/ },
];
let copies = 0;
for (const rule of RULES) {
  if (!rule.re.test(code.get(rule.home) ?? '')) fail(`${rule.what} is not in ${rule.home}, so the fingerprint is stale and this check proves nothing`);
  for (const [rel, text] of code) {
    if (rel === rule.home) continue;
    if (rule.re.test(text)) { copies += 1; fail(`${rel} carries a private copy of ${rule.what} (${rule.re})`); }
  }
}
const IMPORTS = [
  { rel: 'src/lib/soccerMoney.ts', re: /from\s+["'](\.\/|@\/lib\/)careerMoney["']/, what: 'the soccer money wrapper binds careerMoney' },
  { rel: 'src/lib/nflCareerMoney.ts', re: /from\s+["'](\.\/|@\/lib\/)careerMoney["']/, what: 'the NFL money wrapper binds careerMoney' },
  { rel: 'src/lib/soccerCareerEngine.ts', re: /from\s+["'](\.\/|@\/lib\/)soccerMoney["']/, what: 'the soccer engine runs the money season' },
  { rel: 'src/lib/nflMyCareer.ts', re: /from\s+["'](\.\/|@\/lib\/)nflCareerMoney["']/, what: 'the NFL engine runs the money season' },
  { rel: 'src/components/soccer-career/PhonePanel.tsx', re: /from\s+["']@\/lib\/careerSocial["']/, what: "the flagship's phone reads the fan rule" },
  { rel: 'src/lib/nflCareerLoop.ts', re: /from\s+["'](\.\/|@\/lib\/)careerSocial["']/, what: 'the NFL loop reads the fan rule and the paper' },
  { rel: 'src/components/nfl-my-career/NflMyCareerBoard.tsx', re: /from\s+["']@\/lib\/nflCareerLoop["']/, what: 'the NFL board draws the loop' },
  { rel: 'src/components/nfl-my-career/NflMyCareerBoard.tsx', re: /from\s+["']@\/components\/us-career\/MoneyApp["']/, what: 'the NFL board opens the money app' },
];
for (const imp of IMPORTS) {
  if (!imp.re.test(code.get(imp.rel) ?? '')) fail(`${imp.rel}: ${imp.what}, and it does not import it`);
}
console.log(`   ${code.size} source files scanned, ${RULES.length} rule fingerprints each found once at home, ${copies} private copies, ${IMPORTS.length} imports held`);

/* ═══════════════════════════════════════════════════════════════════════════
   the two careers, adapted
   ═══════════════════════════════════════════════════════════════════════════ */

const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const SOCCER_POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM'];
const NFL_POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

const SPORTS = {
  soccer: {
    label: 'soccer',
    fresh(seed) {
      Math.random = mulberry32(seed);
      const c = soccer.initCareer(
        `Parity ${seed}`, NATIONS[seed % NATIONS.length], SOCCER_POS[seed % SOCCER_POS.length],
        'modern', flat(58), 58, 2020, soccer.FALLBACK_CLUBS, null, 76 + (seed % 14),
      );
      Math.random = REAL_RANDOM;
      return { c, seed, i: 0 };
    },
    /** True while the money app has nothing to run on (the academy years). */
    idle: run => run.c.phase === 'youth',
    season(run) {
      run.i += 1;
      Math.random = mulberry32(run.seed * 7919 + run.i);
      let c = run.c.phase === 'youth' ? soccer.advanceYouthYear(run.c, soccer.FALLBACK_CLUBS) : soccer.advanceProSeason(run.c, soccer.FALLBACK_CLUBS);
      if (c.transferSituation) c = { ...c, transferSituation: null };
      Math.random = REAL_RANDOM;
      run.c = c;
    },
    done: run => run.c.retired,
    act(run, action) {
      const res = soccer.applyMoneyAction(run.c, action);
      const ok = res.state !== run.c;
      run.c = res.state;
      return ok;
    },
    bank: c => soccerMoney.bankSummary(c),
    money: c => soccerMoney.ensureMoney(c),
    spendable: c => soccerMoney.spendable(c),
    cardOpen: c => soccerMoney.cardStatus(c).open && soccerMoney.cardCap(c) >= 0.01,
    cardCap: c => soccerMoney.cardCap(c),
    pos: c => c.position,
    standing: c => c.karma ?? 50,
    rival: c => c.rival,
    /* Seasons the market should have run for. initCareer seeds the first
       academy row before anything has happened and retirement writes a
       marker row of type "retired" that nobody played (Round 437 runs the
       market on the post retirement steps that follow it), so it is the
       youth and playing rows less the seed. Traced step by step before this
       was written: every other row ticks exactly once. */
    playedSeasons: c => c.seasons.filter(s => s.type === 'youth' || s.type === 'playing').length - 1,
  },
  nfl: {
    label: 'nfl',
    fresh(seed, elite = false) {
      const rng = mulberry32(seed);
      const pos = NFL_POS[seed % NFL_POS.length];
      const arch = nfl.ARCHETYPES[pos][seed % nfl.ARCHETYPES[pos].length];
      const c = nfl.startCareer(`Parity ${seed}`, pos, arch, rng, null);
      if (elite) { c.ovr = 93; c.pot = 99; }
      return { c, seed, i: 0, rng, tq: null, elite };
    },
    idle: () => false,
    season(run) {
      run.i += 1;
      const c = run.c;
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });
        run.lastLine = null;
      } else {
        /* Team quality is on the rating scale (rollTeamQuality draws 62 to
           94), so an elite career plays on a 90 roster. */
        run.tq = run.elite ? 90 : nfl.rollTeamQuality(run.tq, run.rng);
        const { line } = nfl.simSeason(c, run.tq, run.rng);
        run.lastLine = line;
      }
      nfl.progress(c, run.rng);
      if (nfl.shouldRetire(c)) c.retired = true;
    },
    done: run => run.c.retired,
    act(run, action) {
      const clone = JSON.parse(JSON.stringify(run.c));
      const res = nflMoney.nflMoneyAct(clone, action);
      if (res.ok) run.c = clone;
      return res.ok;
    },
    bank: c => nflMoney.nflBankSummary(c),
    money: c => nflMoney.ensureNflMoney(c),
    spendable: c => shared.spendable(c),
    cardOpen: c => nflMoney.nflCardStatus(c).open && nflMoney.nflCardCap(c) >= 0.01,
    cardCap: c => nflMoney.nflCardCap(c),
    pos: c => c.pos,
    standing: c => c.fanbase,
    rival: c => c.rival,
    /* progress() runs the market after every season line, suspended ones
       included, so every row on the record is one market season. */
    playedSeasons: c => c.seasons.length,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. Money balances in both careers
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('2) Money: every tap balances, every season pays the rate, in both careers');

/** What one accepted or refused action is allowed to do to the account. */
function auditAction(tag, sp, before, after, action, ok) {
  const b = sp.bank(before), a = sp.bank(after);
  const ma = sp.money(after);
  if (!ok) {
    if (JSON.stringify(b) !== JSON.stringify(a)) fail(`${tag}: a refused ${action.t} changed the account`);
    return;
  }
  const dCash = r2(a.cash - b.cash), dVault = r2(a.vault - b.vault), dInv = r2(a.invested - b.invested);
  const last = ma.log[ma.log.length - 1];
  if (!last) fail(`${tag}: ${action.t} wrote nothing on the statement`);
  else if (!near(last.a, dCash, 0.011)) fail(`${tag}: ${action.t} moved cash ${dCash} but the statement says ${last.a}`);
  if (action.t === 'deposit' || action.t === 'withdraw') {
    if (!near(dCash + dVault, 0, 0.011) || dInv !== 0) fail(`${tag}: ${action.t} cash ${dCash}, savings ${dVault}, holdings ${dInv}: money appeared or vanished`);
    if (action.t === 'deposit' && !(dCash < 0)) fail(`${tag}: a deposit left the account untouched`);
  } else if (action.t === 'buy') {
    if (dVault !== 0 || !near(dInv, -dCash * (1 - TRADE_FEE), 0.02)) fail(`${tag}: buy took ${-dCash} of cash and holdings rose ${dInv}, the fee is ${TRADE_FEE}`);
  } else if (action.t === 'sell') {
    if (dVault !== 0 || !near(dCash, -dInv * (1 - TRADE_FEE), 0.02)) fail(`${tag}: sell dropped holdings ${-dInv} and cash rose ${dCash}, the fee is ${TRADE_FEE}`);
  } else if (action.t === 'cards') {
    if (dVault !== 0 || dInv !== 0) fail(`${tag}: a hand of cards touched savings or holdings`);
    if (Math.abs(dCash) > CARD_MAX * CARD_PAYS + 0.011) fail(`${tag}: a hand of cards moved ${dCash}, over the cap`);
  }
  if (b.cash >= CASH_FLOOR && a.cash < CASH_FLOOR - 0.011) fail(`${tag}: ${action.t} took cash under the ${CASH_FLOOR} floor to ${a.cash}`);
  if (ma.log.length > MAX_LEDGER) fail(`${tag}: statement has ${ma.log.length} lines, cap ${MAX_LEDGER}`);
}

/** What one step of the engine is allowed to do to the account. The soccer
 *  engine advances in phase steps (a transfer window, a summary screen) and
 *  only some of them play a season, so a step that did not run the market
 *  is counted and left alone; one that ran it twice is a defect. Whether
 *  the market ran exactly once per season on the record is checked at the
 *  end of the career, where the two counts have to agree. */
function auditSeason(tag, sp, before, after, stats) {
  const mb = sp.money(before), ma = sp.money(after);
  const ba = sp.bank(after);
  const delta = ma.age - mb.age;
  if (delta > 1) { fail(`${tag}: one step ran the market ${delta} times`); return; }
  if (delta === 0) { stats.steps += 1; return; }
  stats.seasons += 1;
  const covered = ma.log.some(e => e.y === ma.year && (e.t === 'Savings covered the bills' || e.t.startsWith('Forced sale')));
  if (covered) stats.covered += 1;
  if (mb.vault > 0 && !covered) {
    const interest = r2(mb.vault * SAVINGS_RATE);
    const expected = interest >= 0.01 ? r2(mb.vault + interest) : mb.vault;
    if (!near(ma.vault, expected, 0.011)) fail(`${tag}: savings went ${mb.vault} to ${ma.vault} in a season, the ${SAVINGS_RATE} rate says ${expected}`);
    else stats.paid += 1;
  }
  for (const a of ASSETS) {
    if (ma.hist[a.id].length > MAX_HISTORY) fail(`${tag}: ${a.id} keeps ${ma.hist[a.id].length} prices, cap ${MAX_HISTORY}`);
    if (!(ma.price[a.id] >= 3 && ma.price[a.id] <= PAR * 40)) fail(`${tag}: ${a.id} priced ${ma.price[a.id]}`);
    if (mb.age > 0 && ma.price[a.id] !== mb.price[a.id]) stats.moved += 1;
  }
  if (ma.log.length > MAX_LEDGER) fail(`${tag}: statement has ${ma.log.length} lines after a season, cap ${MAX_LEDGER}`);
  if (ba.cash < CASH_FLOOR - 0.011 && (ma.vault > 0.01 || ba.invested > 0.01)) {
    fail(`${tag}: cash ${ba.cash} sits under the floor with ${ma.vault} saved and ${ba.invested} invested, the season did not cover it`);
  }
}

/** A player who does a bit of everything with the money between seasons. */
function actionsFor(sp, c, draw) {
  const out = [];
  const free = sp.spendable(c);
  const m = sp.money(c);
  const roll = draw();
  if (free >= 0.3 && roll < 0.35) out.push({ t: 'deposit', amount: r2(free * (0.2 + draw() * 0.5)) });
  else if (free >= 0.3 && roll < 0.7) out.push({ t: 'buy', id: ASSETS[Math.floor(draw() * ASSETS.length)].id, amount: r2(free * (0.2 + draw() * 0.5)) });
  if (m.vault > 0.05 && draw() < 0.3) out.push({ t: 'withdraw', amount: r2(m.vault * (0.3 + draw() * 0.7)) });
  for (const a of ASSETS) {
    if ((m.hold[a.id] ?? 0) > 0 && draw() < 0.25) out.push({ t: 'sell', id: a.id, frac: [0.25, 0.5, 1][Math.floor(draw() * 3)] });
  }
  if (sp.cardOpen(c) && draw() < 0.5) out.push({ t: 'cards', stake: sp.cardCap(c) });
  /* Refusals are part of the contract too: an oversized deposit is clamped to
     what is free, and a deposit with nothing free is refused outright. */
  if (draw() < 0.15) out.push({ t: 'deposit', amount: free + 5 });
  if (draw() < 0.1) out.push({ t: 'sell', id: 'spark', frac: 1 });
  return out;
}

const played = { soccer: [], nfl: [] };
const moneyStats = {};
for (const key of ['soccer', 'nfl']) {
  const sp = SPORTS[key];
  const stats = { careers: 0, actions: 0, accepted: 0, refused: 0, seasons: 0, steps: 0, offRecord: 0, paid: 0, covered: 0, moved: 0, retired: 0 };
  for (let n = 0; n < CAREERS; n += 1) {
    const run = sp.fresh(1000 + n);
    const draw = mulberry32(50_000 + n);
    let guard = 0;
    while (!sp.done(run) && guard < 34) {
      guard += 1;
      const tag = `${key} #${n} y${guard}`;
      if (!sp.idle(run)) {
        for (const action of actionsFor(sp, run.c, draw)) {
          const before = JSON.parse(JSON.stringify(run.c));
          const ok = sp.act(run, action);
          stats.actions += 1;
          if (ok) stats.accepted += 1; else stats.refused += 1;
          auditAction(`${tag} ${action.t}`, sp, before, run.c, action, ok);
        }
      }
      const wasIdle = sp.idle(run);
      const before = JSON.parse(JSON.stringify(run.c));
      sp.season(run);
      if (key === 'nfl' && run.lastLine) run.lines = [...(run.lines ?? []), { line: run.lastLine, snap: JSON.parse(JSON.stringify(run.c)) }];
      if (!wasIdle && !sp.idle(run)) auditSeason(tag, sp, before, run.c, stats);
    }
    if (sp.done(run)) stats.retired += 1;
    stats.careers += 1;
    /* One market season per season played, academy years included (Round
       134 ticks the market while you are still a kid so the prices are not
       frozen at par when you first look). */
    const m = sp.money(run.c);
    const shouldHave = sp.playedSeasons(run.c);
    if (m.age !== shouldHave) {
      stats.offRecord += 1;
      if (stats.offRecord <= 3) fail(`${key} #${n}: ${shouldHave} seasons played and the market ran ${m.age} times`);
    }
    played[key].push(run);
  }
  moneyStats[key] = stats;
  console.log(`   ${key}: ${stats.careers} careers, ${stats.actions} taps (${stats.accepted} accepted, ${stats.refused} refused), ${stats.seasons} market seasons over ${stats.seasons + stats.steps} steps, savings paid ${stats.paid} times, bills covered ${stats.covered} times, ${stats.retired} retired, ${stats.offRecord} careers where the market count and the seasons played disagree`);
  if (stats.accepted < CAREERS * 4) fail(`${key}: only ${stats.accepted} accepted taps over ${CAREERS} careers, the money app was barely used`);
  if (stats.refused < 1) fail(`${key}: no tap was ever refused, so the refusal path was not measured`);
  if (stats.paid < CAREERS) fail(`${key}: savings paid interest only ${stats.paid} times over ${CAREERS} careers`);
  if (stats.offRecord > 3) fail(`${key}: ${stats.offRecord} careers where the market did not run once per season`);
  if (stats.seasons > 0 && stats.moved < stats.seasons * ASSETS.length * 0.9) fail(`${key}: prices moved in only ${stats.moved} of ${stats.seasons * ASSETS.length} asset seasons`);
}

/* The seam: the two descriptors on one seed are one market. */
{
  const s = { playerName: 'Parity Seam', seasons: [{ year: 2025 }], netWorth: 6, morale: 60, lifestyleCostPerYear: 0.5, karma: 50, events: [] };
  const n = { name: 'Parity Seam', seasons: [{ year: 2025 }], year: 2025, netWorth: 6, morale: 60, yearlyCosts: 0.5, fanbase: 50 };
  const sDep = soccerMoney.moneyAct(s, { t: 'deposit', amount: 2 });
  const nDep = nflMoney.nflMoneyAct(n, { t: 'deposit', amount: 2 });
  const sBuy = soccerMoney.moneyAct(s, { t: 'buy', id: 'cleats', amount: 1.5 });
  const nBuy = nflMoney.nflMoneyAct(n, { t: 'buy', id: 'cleats', amount: 1.5 });
  if (!sDep.ok || !nDep.ok || !sBuy.ok || !nBuy.ok) fail('seam: the same deposit and buy were not accepted in both sports');
  if (sDep.toast !== '€2.0M into savings' || nDep.toast !== '$2.0M into savings') fail(`seam: the toasts differ beyond the currency sign: ${sDep.toast} / ${nDep.toast}`);
  let same = 0, seasons = 0;
  for (let y = 2026; y <= 2033; y += 1) {
    s.seasons.push({ year: y }); n.seasons.push({ year: y });
    const st = soccerMoney.moneySeasonTick(s, y);
    const nt = nflMoney.nflMoneySeasonTick(n);
    seasons += 1;
    const sm = soccerMoney.ensureMoney(s), nm = nflMoney.ensureNflMoney(n);
    for (const a of ASSETS) {
      if (sm.price[a.id] === nm.price[a.id]) same += 1;
      else fail(`seam: ${a.id} priced ${sm.price[a.id]} in soccer and ${nm.price[a.id]} in the NFL after ${seasons} seasons on one seed`);
    }
    if (sm.vault !== nm.vault) fail(`seam: savings ${sm.vault} in soccer and ${nm.vault} in the NFL after ${seasons} seasons`);
    const strip = t => t.replace(/[€$]/g, '');
    if (st.events.map(strip).join('|') !== nt.events.map(strip).join('|')) fail(`seam: the season's lines differ beyond the currency: ${st.events.join(' / ')} vs ${nt.events.join(' / ')}`);
  }
  const sb = soccerMoney.bankSummary(s), nb = nflMoney.nflBankSummary(n);
  if (sb.total !== nb.total || sb.invested !== nb.invested) fail(`seam: everything you have reads ${sb.total} in soccer and ${nb.total} in the NFL`);
  console.log(`   seam: ${same} of ${seasons * ASSETS.length} prices identical across the two sports on one seed, savings ${sb.vault} in both, total ${sb.total} in both`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. Social: no line asks a position for a stat it is not judged on
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('3) Social: the fans and the paper never ask a position for the wrong stat');

/* The stat words each position is never judged on. A match in any fan
   comment or headline for that position is the Round 319 bug. */
const NEVER = {
  soccer: {
    GK: /\bgoals?\b|\bscore\b|\bassists?\b/i,
    CB: /\bgoals?\b|\bscore\b/i, LB: /\bgoals?\b|\bscore\b/i, RB: /\bgoals?\b|\bscore\b/i, LWB: /\bgoals?\b|\bscore\b/i, RWB: /\bgoals?\b|\bscore\b/i,
    CDM: /\bclean sheets?\b|\bgoals?\b/i, CM: /\bclean sheets?\b|\bgoals?\b/i,
    CAM: /\bclean sheets?\b|\bat the back\b|\bmidfield\b/i, LW: /\bclean sheets?\b|\bat the back\b|\bmidfield\b/i, RW: /\bclean sheets?\b|\bat the back\b|\bmidfield\b/i,
    ST: /\bclean sheets?\b|\bat the back\b|\bmidfield\b/i, CF: /\bclean sheets?\b|\bat the back\b|\bmidfield\b/i,
  },
  nfl: {
    QB: /\bsacks?\b|\btackles?\b|\bcatch(es)?\b|\bkicks?\b|\bfield goals?\b|\bruns for\b|\brushing\b|\bhauls in\b/i,
    RB: /\bsacks?\b|\btackles?\b|\bkicks?\b|\bfield goals?\b|\bthrows?\b|\bpassing\b|\bthrow\b/i,
    WR: /\bsacks?\b|\btackles?\b|\bkicks?\b|\bfield goals?\b|\bthrows for\b|\bpassing\b|\brushing\b|\bruns for\b/i,
    TE: /\bsacks?\b|\btackles?\b|\bkicks?\b|\bfield goals?\b|\bthrows for\b|\bpassing\b|\brushing\b|\bruns for\b/i,
    /* "no throw zone" is a corner's own phrase, so the forbidden shape for
       the defenders and the kicker is the passer's stat, "throws for". */
    LB: /\btouchdowns?\b|\bcatch(es)?\b|\bkicks?\b|\bfield goals?\b|\bthrows for\b|\bthrow him\b|\bpassing\b|\brushing\b|\byards\b|\bthe ball\b/i,
    CB: /\btouchdowns?\b|\bsacks?\b|\bcatch(es)?\b|\bkicks?\b|\bfield goals?\b|\bthrows for\b|\bthrow him\b|\byards\b|\bthe ball\b/i,
    EDGE: /\btouchdowns?\b|\bcatch(es)?\b|\bkicks?\b|\bfield goals?\b|\bthrows for\b|\bthrow him\b|\byards\b|\bbreaks up\b|\bthe ball\b/i,
    K: /\btouchdowns?\b|\btackles?\b|\bsacks?\b|\bcatch(es)?\b|\bthrows for\b|\bthrow him\b|\byards\b|\binterceptions?\b|\bthe ball\b/i,
  },
};
/* The en and em dash, as escapes, so this file carries neither. */
const DASH = /[–—]/;

const socialSeen = { soccer: 0, nfl: 0 };
function checkLine(sport, pos, line, where) {
  socialSeen[sport] += 1;
  const re = NEVER[sport][pos];
  if (!re) { fail(`${sport}: no forbidden list for position ${pos}`); return; }
  if (re.test(line)) fail(`${sport} ${pos} ${where}: "${line}" asks for a stat this position is not judged on`);
  if (DASH.test(line)) fail(`${sport} ${pos} ${where}: dash in "${line}"`);
}

/* Static: every position at every standing tier. */
for (const sport of ['soccer', 'nfl']) {
  for (const pos of Object.keys(NEVER[sport])) {
    for (const standing of [10, 30, 50, 70, 90]) {
      for (const line of social.fanComments(sport, { pos, standing, followers: '1.2M' })) checkLine(sport, pos, line, `fans at ${standing}`);
      checkLine(sport, pos, social.askForMore(sport, pos), 'ask');
    }
  }
}
/* Static, the paper: a full season line for every position, so every branch
   of the headline writer is read at least once. */
for (const pos of NFL_POS) {
  const full = {
    games: 17, passYds: 5100, passTd: 40, ints: 8, rushYds: 2050, rushTd: 18, rec: 110, recYds: 1600, recTd: 14,
    tackles: 140, sacks: 21, picks: 6, passDef: 18, forcedFum: 3, fgMade: 35, fgAtt: 35, longFg: 58,
    awards: ['MVP', 'All-Pro'], teamResult: 'WON THE SUPER BOWL',
  };
  const thin = { ...full, passYds: 900, passTd: 4, ints: 16, rushYds: 300, rec: 20, recYds: 200, tackles: 40, sacks: 2, picks: 1, fgMade: 18, fgAtt: 24, awards: [], teamResult: 'Missed playoffs' };
  for (const line of [full, thin]) {
    for (const h of social.nflSeasonHeadlines({ name: 'Parity Man', team: 'the Parity Bears', pos, line, missed: 5, role: 'starter' })) checkLine('nfl', pos, h, 'paper');
  }
}
/* Harvested from the careers section 2 played. */
for (const run of played.nfl) {
  for (const { line, snap } of run.lines ?? []) {
    for (const h of nflLoop.nflHeadlinesFor(snap, line)) checkLine('nfl', snap.pos, h, `paper y${line.year}`);
    for (const f of nflLoop.nflFanComments(snap)) checkLine('nfl', snap.pos, f, `fans y${line.year}`);
  }
}
for (const run of played.soccer) {
  const c = run.c;
  for (const standing of [SPORTS.soccer.standing(c), 20, 80]) {
    for (const f of social.fanComments('soccer', { pos: c.position, standing, followers: social.fmtFollowers(1.2) })) checkLine('soccer', c.position, f, 'fans');
  }
}
for (const sport of ['soccer', 'nfl']) {
  if (socialSeen[sport] < 200) fail(`${sport}: only ${socialSeen[sport]} fan and paper lines checked, too few to mean anything`);
}
console.log(`   ${socialSeen.soccer} soccer lines and ${socialSeen.nfl} NFL lines checked across ${Object.keys(NEVER.soccer).length + Object.keys(NEVER.nfl).length} positions`);

/* ═══════════════════════════════════════════════════════════════════════════
   4. Rival: named, generated, present in both, and moving
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('4) Rival: a generated rival exists in both careers and moves season on season');
{
  let present = 0, named = 0, moved = 0, scored = 0, aged = 0;
  for (const run of played.nfl) {
    const start = SPORTS.nfl.fresh(run.seed).c.rival;
    const r = run.c.rival;
    if (!r) continue;
    present += 1;
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(r.name) && r.pos === run.c.pos) named += 1;
    /* Read after his first season: a young rival grows toward his ceiling
       every year, and a whole career can end back on the draft number. */
    const afterOne = run.lines?.[0]?.snap.rival;
    if (afterOne && afterOne.ovr !== start.ovr) moved += 1;
    if (r.myYears + r.hisYears >= 1 && r.lastLine.length > 0) scored += 1;
    if (r.age > start.age || r.retired) aged += 1;
  }
  const n = played.nfl.length;
  console.log(`   nfl: rival on ${present} of ${n} saves, ${named} named at my position, ${moved} changed rating, ${scored} on the head to head, ${aged} aged or retired`);
  if (present !== n) fail(`nfl: rival missing on ${n - present} of ${n} saves`);
  if (named !== present) fail(`nfl: ${present - named} rivals without a generated two word name at my position`);
  if (moved < present * 0.9) fail(`nfl: rival rating moved on only ${moved} of ${present} saves`);
  if (scored !== present) fail(`nfl: ${present - scored} rivals never entered the head to head`);
  if (aged !== present) fail(`nfl: ${present - aged} rivals never aged`);
}
{
  let present = 0, named = 0, moved = 0, played22 = 0;
  const snaps = [];
  for (const run of played.soccer) {
    const c = run.c;
    if (c.age >= 22) played22 += 1;
    const r = c.rival;
    if (!r) continue;
    present += 1;
    if (r.name && r.name.trim().split(/\s+/).length >= 2 && r.nationality) named += 1;
    if (r.careerApps > 0 && r.age > 19) moved += 1;
    snaps.push(r);
  }
  /* Moving is measured twice for soccer: careers apps growing on the save the
     run ended on, and a fresh rival watched for three seasons. */
  let grew = 0, watched = 0;
  for (let n = 0; n < Math.min(12, CAREERS); n += 1) {
    const run = SPORTS.soccer.fresh(2000 + n);
    let guard = 0;
    while (!run.c.rival && !run.c.retired && guard < 12) { guard += 1; SPORTS.soccer.season(run); }
    if (!run.c.rival) continue;
    const first = { ...run.c.rival };
    for (let k = 0; k < 3 && !run.c.retired; k += 1) SPORTS.soccer.season(run);
    watched += 1;
    const r = run.c.rival;
    if (r.retired || (r.age > first.age && r.careerApps > first.careerApps)) grew += 1;
  }
  const n = played.soccer.length;
  console.log(`   soccer: rival on ${present} of ${n} saves (${played22} reached 22), ${named} named with a nationality, ${moved} with a career line, ${grew} of ${watched} watched rivals aged and played over three seasons`);
  if (present < played22 * 0.9) fail(`soccer: rival on only ${present} of ${played22} saves that reached 22`);
  if (named !== present) fail(`soccer: ${present - named} rivals without a name and a nationality`);
  if (moved !== present) fail(`soccer: ${present - moved} rivals never played a season`);
  if (watched < 6) fail(`soccer: only ${watched} rivals watched, too few`);
  if (grew !== watched) fail(`soccer: ${watched - grew} of ${watched} watched rivals did not move over three seasons`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. Badges: every one reachable, none free
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('5) Badges: every NFL badge is reachable and none is handed out for nothing');
{
  const earnedBy = new Map(badges.NFL_BADGES.map(b => [b.id, 0]));
  const count = c => { for (const b of nflLoop.nflEarnedBadges(c)) earnedBy.set(b.id, (earnedBy.get(b.id) ?? 0) + 1); };
  for (const run of played.nfl) count(run.c);
  let elite = 0;
  for (let n = 0; n < Math.max(24, CAREERS); n += 1) {
    const run = SPORTS.nfl.fresh(3000 + n, true);
    let guard = 0;
    while (!SPORTS.nfl.done(run) && guard < 22) {
      guard += 1;
      /* An elite earner who saves keeps the money badges honest. */
      const free = SPORTS.nfl.spendable(run.c);
      if (free > 1) SPORTS.nfl.act(run, { t: 'deposit', amount: r2(free * 0.5) });
      SPORTS.nfl.season(run);
    }
    elite += 1;
    count(run.c);
  }
  const fresh = nflLoop.nflEarnedBadges(SPORTS.nfl.fresh(4000).c);
  if (fresh.length > 0) fail(`a career that has not played a season already wears ${fresh.map(b => b.id).join(', ')}`);
  const never = [...earnedBy].filter(([, n]) => n === 0).map(([id]) => id);
  const rare = [...earnedBy].filter(([, n]) => n > 0 && n <= 2).map(([id, n]) => `${id}:${n}`);
  console.log(`   ${badges.NFL_BADGES.length} badges, ${played.nfl.length} ordinary and ${elite} elite careers, ${[...earnedBy].filter(([, n]) => n > 0).length} badges earned at least once${rare.length ? `, rare: ${rare.join(' ')}` : ''}`);
  if (never.length) fail(`badges nobody could earn: ${never.join(', ')}`);
  for (const b of badges.NFL_BADGES) {
    if (DASH.test(b.label) || DASH.test(b.blurb)) fail(`badge ${b.id}: dash in its copy`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   verdict
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('');
if (CONTROL) {
  if (failures > 0) {
    console.log(`simCareerParity control ${CONTROL}: green. The planted defect was reported (${failures} finding${failures === 1 ? '' : 's'}), so this harness works.`);
    process.exit(0);
  }
  console.error(`simCareerParity control ${CONTROL}: RED. The planted defect went unreported, so this harness proves nothing.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`simCareerParity: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerParity: green. One money app, one fan rule, one rival shape, one badge case, in both careers.');
