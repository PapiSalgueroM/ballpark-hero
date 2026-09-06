/**
 * Round 469 harness, widened in Round 470: one loop, five careers.
 *
 * His words (docs/TWEAKS-2026-08-28.md): "Bring the whole Soccer Career and
 * Club Manager depth to NFL, NBA, MLB, NHL and the GM games, each with its own
 * sport's texture." And CLAUDE.md, 2026-09-04: a new sport is DATA plus that
 * sport's events, not a new engine.
 *
 * Round 469 lifted three pieces of the flagship's loop into sport neutral
 * modules and bound the NFL career to them. Round 470 bound the other three:
 *
 *   careerMoney.ts    the savings account, the market, the statement and the
 *                     card school (Round 134, Round 437), behind a MoneySport
 *                     descriptor. soccerMoney.ts, nflCareerMoney.ts,
 *                     nbaCareerMoney.ts, mlbCareerMoney.ts and
 *                     nhlCareerMoney.ts bind it and carry no rule of their own.
 *   careerSocial.ts   what the fans nag you for, by position (Round 319), and
 *                     the paper a season writes. One comment ladder and one
 *                     headline writer, five voices and five papers.
 *   careerBadges.ts   badge tables evaluated on the facts of a career, with
 *                     five closing badges shared by all four US sports.
 *
 * The thing this harness exists to stop is the Round 426 shape: the same idea
 * written twice, so a bug fixed in one career lives on in the others. It holds
 * that with source checks and with outcomes, because a source check alone
 * cannot tell whether the shared module actually runs in every game.
 *
 * SECTIONS
 *
 *   1. Source. careerMoney.ts is imported by all five money wrappers and each
 *      engine runs its wrapper; careerSocial.ts is imported by every career's
 *      screens; and no rule fingerprint of either (the savings rate, the
 *      market season, the anchor pull, the card school, the keeper's ask, the
 *      comment ladder, the paper) lives in any other file under src, comments
 *      stripped first so prose about the rules cannot satisfy or trip it.
 *   2. Money balances, in all five careers, driven through the REAL engines
 *      with random deposits, withdrawals, buys, sells and card sittings
 *      between seasons: every accepted action moves cash by exactly what the
 *      statement says, conserves cash plus savings plus holdings to the trade
 *      fee, and never takes cash under the floor; a refused action changes
 *      nothing; every season pays savings exactly the printed rate, keeps the
 *      history and the statement bounded, and covers a balance under the floor
 *      out of savings. Then the seam itself: all five sport descriptors on the
 *      same seed must draw the same eight seasons of prices and the same
 *      savings to the cent, differing only in the currency sign.
 *   3. Social. Every line the fans and the paper can print for every position
 *      in all five sports, enumerated statically and harvested from played
 *      careers, is checked against the stat words that position is never
 *      judged on. A keeper is never asked for goals, a kicker is never asked
 *      for touchdowns, a centre is never asked for a three the sim does not
 *      count, a catcher is never asked for steals and a goalie is never
 *      written up for a point. 3b asks the question of every path rather than
 *      the paths this round happened to touch: every position each engine can
 *      deal, and every position token careerSocial.ts names, must have a
 *      forbidden list, so a sport that grows a position cannot walk through.
 *   4. Rival. A named generated rival exists on every American save from draft
 *      night and on every soccer save by the time the player is 22, and he
 *      moves: ages, changes rating, and the head to head or the career line
 *      grows season on season.
 *   5. Badges. Every badge in all four US tables is earned at least once
 *      across ordinary careers and an elite sweep of every position and
 *      archetype (a badge nobody can earn is dead words in a case), and a
 *      career that has not played a season earns none.
 *
 * WHY THE CAREERS RE-SIGN. Round 470 measurement, before the badges were
 * written: a harness career that never re-signs plays twenty seasons on its
 * rookie deal, so an MLB career banked at most $8.8M and an NHL one $35.7M,
 * and no money badge above a million was reachable in either. That is not what
 * the game does: an expiring deal opens a free agency window or an extension
 * and the salary moves to market. So the loop below re-signs at the sport's
 * own marketSalary when the contract runs out, which is the FA window's own
 * number, and career earnings then look like a career. With it the same
 * measurement reads: MLB elite p50 $307M, NHL elite p50 $183M, NBA $524M.
 *
 * NEGATIVE CONTROLS, PARITY_CONTROL=...
 *
 *   privatecopy  section 1 sees all five money wrappers with the real
 *                moneySeasonTick body pasted back in as a private copy. It
 *                must go red, and it must name every one of the five, so a
 *                check that only ever looked at soccer cannot pass for this.
 *   printer      the bundle runs a copy of careerMoney.ts where a deposit
 *                credits savings without debiting the account, which is the
 *                shape of a money printer. Section 2 must go red in EVERY
 *                career, which is the proof they run one module.
 *   blindfans    the bundle runs a copy of careerSocial.ts that asks a kicker
 *                for touchdowns. Section 3 must go red.
 *   blindgoalie  the same, one sport over: the NHL goalie is asked to score,
 *                which is the Round 319 bug itself in a new game.
 *   deadbadge    careerBadges.ts is patched so an NBA badge asks for a scoring
 *                average the engine caps below. Section 5 must report a badge
 *                nobody could earn.
 *
 *   Each control asserts the text it rewrites is present first, because a
 *   control that rewrites a string the file does not contain changes nothing
 *   and is green for the wrong reason. Line endings are normalised on every
 *   read, because a Windows checkout writes CRLF and a needle spelt with bare
 *   newlines would never match.
 *
 * THRESHOLDS, from measured headroom on the shipped code (40 careers a sport):
 *   soccer saves with a rival by the end of the run   measured 100%, floor 90%
 *   US rival rating moved off its draft number         measured 100%, floor 90%
 *   fan and paper lines harvested per sport            measured 900 to 3,600, floor 200
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
const CONTROLS = ['privatecopy', 'printer', 'blindfans', 'blindgoalie', 'deadbadge'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`PARITY_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careerparity-'));
process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ } });

let failures = 0;
const said = [];
const fail = m => { failures += 1; said.push(m); console.error('  FAIL: ' + m); };
const norm = s => s.split('\r\n').join('\n');
const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const r2 = v => Math.round(v * 100) / 100;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ─── controls that patch the shared modules ──────────────────────────────── */

const MONEY_SRC = 'src/lib/careerMoney.ts';
const SOCIAL_SRC = 'src/lib/careerSocial.ts';
const BADGE_SRC = 'src/lib/careerBadges.ts';
/* The deposit, both halves. The printer keeps the second and drops the first. */
const DEPOSIT_LINES = '    s.netWorth = r2(cashOf(s) - amount);\n    m.vault = r2(m.vault + amount);';
const PRINTER_LINES = '    m.vault = r2(m.vault + amount);';
const KICKER_ASK = "case 'K': return 'Just make the kicks please 🙏';";
const BLIND_ASK = "case 'K': return 'More touchdowns please 🙏';";
const GOALIE_ASK = "case 'G': return 'Just make the saves please 🙏';";
const BLIND_GOALIE = "case 'G': return 'More goals please 🙏';";
const PPG_BADGE = "test: f => f.seasons.some(s => s.ppg >= 30 && s.games >= 58) }";
const DEAD_BADGE = "test: f => f.seasons.some(s => s.ppg >= 80 && s.games >= 58) }";

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
/* careerMoney.ts and careerSocial.ts import nothing, so a patched copy can
   live in the temp directory. careerBadges.ts is the same. */
if (CONTROL === 'printer') redirects.careerMoney = patchedCopy(MONEY_SRC, DEPOSIT_LINES, PRINTER_LINES, 'printer');
if (CONTROL === 'blindfans') redirects.careerSocial = patchedCopy(SOCIAL_SRC, KICKER_ASK, BLIND_ASK, 'blindfans');
if (CONTROL === 'blindgoalie') redirects.careerSocial = patchedCopy(SOCIAL_SRC, GOALIE_ASK, BLIND_GOALIE, 'blindgoalie');
if (CONTROL === 'deadbadge') redirects.careerBadges = patchedCopy(BADGE_SRC, PPG_BADGE, DEAD_BADGE, 'deadbadge');
if (CONTROL) console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);

const redirectPlugin = {
  name: 'parity-control',
  setup(b) {
    b.onResolve({ filter: /careerMoney(\.ts)?$/ }, () => (redirects.careerMoney ? { path: redirects.careerMoney } : undefined));
    b.onResolve({ filter: /careerSocial(\.ts)?$/ }, () => (redirects.careerSocial ? { path: redirects.careerSocial } : undefined));
    b.onResolve({ filter: /careerBadges(\.ts)?$/ }, () => (redirects.careerBadges ? { path: redirects.careerBadges } : undefined));
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
export const nba = await import('${R}/src/lib/nbaMyCareer.ts');
export const nbaMoney = await import('${R}/src/lib/nbaCareerMoney.ts');
export const nbaLoop = await import('${R}/src/lib/nbaCareerLoop.ts');
export const mlb = await import('${R}/src/lib/mlbMyCareer.ts');
export const mlbMoney = await import('${R}/src/lib/mlbCareerMoney.ts');
export const mlbLoop = await import('${R}/src/lib/mlbCareerLoop.ts');
export const nhl = await import('${R}/src/lib/nhlMyCareer.ts');
export const nhlMoney = await import('${R}/src/lib/nhlCareerMoney.ts');
export const nhlLoop = await import('${R}/src/lib/nhlCareerLoop.ts');
export const social = await import('${R}/src/lib/careerSocial.ts');
export const badges = await import('${R}/src/lib/careerBadges.ts');
export const shared = await import('${R}/src/lib/careerMoney.ts');
`);
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [redirectPlugin], absWorkingDir: ROOT,
});
const B = await import(pathToFileURL(BUNDLE).href);
const { soccer, soccerMoney, social, badges, shared } = B;

const { ASSETS, CASH_FLOOR, TRADE_FEE, SAVINGS_RATE, MAX_LEDGER, MAX_HISTORY, PAR, CARD_MAX, CARD_PAYS } = shared;

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const REAL_RANDOM = Math.random;

/* ═══════════════════════════════════════════════════════════════════════════
   1. Source: one module, imported by all five, copied by none
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('1) Source: the shared modules are imported by every career and copied by none');

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

/** The five thin wrappers. Each binds careerMoney.ts and holds no rule. */
const WRAPPERS = [
  'src/lib/soccerMoney.ts',
  'src/lib/nflCareerMoney.ts',
  'src/lib/nbaCareerMoney.ts',
  'src/lib/mlbCareerMoney.ts',
  'src/lib/nhlCareerMoney.ts',
];

if (CONTROL === 'privatecopy') {
  const money = readSrc(MONEY_SRC);
  const start = money.indexOf('export function moneySeasonTick');
  const end = money.indexOf('\n}\n', start);
  if (start < 0 || end < 0) { console.error('control privatecopy: could not find moneySeasonTick in careerMoney.ts'); process.exit(1); }
  const body = money.slice(start, end + 3).replace('export function', 'function');
  /* Every wrapper, not just the flagship's: a check that only ever looked at
     soccer would pass this control while four sports carried a private copy. */
  for (const rel of WRAPPERS) {
    const before = code.get(rel);
    if (before === undefined) { console.error(`control privatecopy: ${rel} is not in the source map`); process.exit(1); }
    const after = stripComments(`${before}\n${body}`);
    if (after === before || !/m\.age \+= 1;/.test(after) || !/def\.pull \* \(anchor - shocked\)/.test(after)) {
      console.error(`control privatecopy: the rewrite of ${rel} changed nothing, so this control would prove nothing`);
      process.exit(1);
    }
    code.set(rel, after);
  }
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
  { home: 'src/lib/careerSocial.ts', what: 'the comment ladder', re: /export function fanComments\b/ },
  { home: 'src/lib/careerSocial.ts', what: "the keeper's ask", re: /More clean sheets please/ },
  { home: 'src/lib/careerSocial.ts', what: "the defender's ask", re: /Lock it down at the back please/ },
  { home: 'src/lib/careerSocial.ts', what: 'the paper', re: /export function seasonHeadlines\b/ },
  { home: 'src/lib/careerSocial.ts', what: 'the follower count', re: /Math\.pow\(Math\.max\(0, f\.fanbase\)/ },
  { home: 'src/lib/careerBadges.ts', what: 'the back to back test', re: /export function wentBackToBack\b/ },
  { home: 'src/lib/careerBadges.ts', what: 'the closing badges', re: /function closingBadges\b/ },
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
  ...WRAPPERS.map(rel => ({ rel, re: /from\s+["'](\.\/|@\/lib\/)careerMoney["']/, what: `${rel} binds careerMoney` })),
  { rel: 'src/lib/soccerCareerEngine.ts', re: /from\s+["'](\.\/|@\/lib\/)soccerMoney["']/, what: 'the soccer engine runs the money season' },
  { rel: 'src/lib/nflMyCareer.ts', re: /from\s+["'](\.\/|@\/lib\/)nflCareerMoney["']/, what: 'the NFL engine runs the money season' },
  { rel: 'src/lib/nbaMyCareer.ts', re: /from\s+["'](\.\/|@\/lib\/)nbaCareerMoney["']/, what: 'the NBA engine runs the money season' },
  { rel: 'src/lib/mlbMyCareer.ts', re: /from\s+["'](\.\/|@\/lib\/)mlbCareerMoney["']/, what: 'the MLB engine runs the money season' },
  { rel: 'src/lib/nhlMyCareer.ts', re: /from\s+["'](\.\/|@\/lib\/)nhlCareerMoney["']/, what: 'the NHL engine runs the money season' },
  { rel: 'src/components/soccer-career/PhonePanel.tsx', re: /from\s+["']@\/lib\/careerSocial["']/, what: "the flagship's phone reads the fan rule" },
  { rel: 'src/lib/nflCareerLoop.ts', re: /from\s+["'](\.\/|@\/lib\/)careerSocial["']/, what: 'the NFL loop reads the fan rule and the paper' },
  { rel: 'src/lib/nbaCareerLoop.ts', re: /from\s+["'](\.\/|@\/lib\/)careerSocial["']/, what: 'the NBA loop reads the fan rule and the paper' },
  { rel: 'src/lib/mlbCareerLoop.ts', re: /from\s+["'](\.\/|@\/lib\/)careerSocial["']/, what: 'the MLB loop reads the fan rule and the paper' },
  { rel: 'src/lib/nhlCareerLoop.ts', re: /from\s+["'](\.\/|@\/lib\/)careerSocial["']/, what: 'the NHL loop reads the fan rule and the paper' },
  { rel: 'src/components/nfl-my-career/NflMyCareerBoard.tsx', re: /from\s+["']@\/components\/us-career\/MoneyApp["']/, what: 'the NFL board opens the money app' },
  { rel: 'src/components/nba-my-career/NbaMyCareerBoard.tsx', re: /from\s+["']@\/components\/us-career\/MoneyApp["']/, what: 'the NBA board opens the money app' },
  { rel: 'src/components/mlb-my-career/MlbMyCareerBoard.tsx', re: /from\s+["']@\/components\/us-career\/MoneyApp["']/, what: 'the MLB board opens the money app' },
  { rel: 'src/components/nhl-my-career/NhlMyCareerBoard.tsx', re: /from\s+["']@\/components\/us-career\/MoneyApp["']/, what: 'the NHL board opens the money app' },
  { rel: 'src/components/nba-my-career/NbaMyCareerBoard.tsx', re: /from\s+["']@\/lib\/nbaCareerLoop["']/, what: 'the NBA board draws the loop' },
  { rel: 'src/components/mlb-my-career/MlbMyCareerBoard.tsx', re: /from\s+["']@\/lib\/mlbCareerLoop["']/, what: 'the MLB board draws the loop' },
  { rel: 'src/components/nhl-my-career/NhlMyCareerBoard.tsx', re: /from\s+["']@\/lib\/nhlCareerLoop["']/, what: 'the NHL board draws the loop' },
];
for (const imp of IMPORTS) {
  if (!imp.re.test(code.get(imp.rel) ?? '')) fail(`${imp.rel}: ${imp.what}, and it does not import it`);
}
console.log(`   ${code.size} source files scanned, ${RULES.length} rule fingerprints each found once at home, ${copies} private copies, ${IMPORTS.length} imports held`);

/* ═══════════════════════════════════════════════════════════════════════════
   the five careers, adapted
   ═══════════════════════════════════════════════════════════════════════════ */

const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const SOCCER_POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/**
 * One American career, described. Everything below the descriptor is shared,
 * which is the whole point: if the four games ever stop behaving the same way,
 * this is where it shows.
 */
function usSport(cfg) {
  const positions = Object.keys(cfg.arch);
  return {
    label: cfg.label,
    positions,
    /** Every position paired with every archetype, so the elite sweep covers
     *  the whole game rather than the seeds that happened to come up. */
    lineups: positions.flatMap(pos => cfg.arch[pos].map((a, i) => ({ pos, archIdx: i }))),
    fresh(seed, elite = false, lineup = null) {
      const rng = mulberry32(seed);
      const pos = lineup ? lineup.pos : positions[seed % positions.length];
      const list = cfg.arch[pos];
      const arch = list[(lineup ? lineup.archIdx : seed) % list.length];
      const c = cfg.start(`Parity ${seed}`, pos, arch, rng);
      if (elite) { c.ovr = 93; c.pot = 99; }
      return { c, seed, i: 0, rng, tq: null, elite, lines: [] };
    },
    idle: () => false,
    season(run) {
      run.i += 1;
      const c = run.c;
      /* An expired deal is re-signed at the sport's own market number, which
         is what the free agency window and the extension talk do on screen.
         Without this a career plays twenty years on a rookie contract and
         never banks a career's worth of money. */
      if (c.contractYears <= 0) { c.salary = cfg.market(c); c.contractYears = 3; }
      if ((c.suspendedSeasons ?? 0) > 0) {
        c.suspendedSeasons -= 1;
        c.seasons.push(cfg.blankSeason(c));
        run.lastLine = null;
      } else {
        /* Team quality is on the rating scale, so an elite career plays on a
           90 roster. */
        run.tq = run.elite ? 90 : cfg.roll(run.tq, run.rng);
        const { line } = cfg.sim(c, run.tq, run.rng);
        run.lastLine = line;
      }
      cfg.prog(c, run.rng);
      if (cfg.retire(c)) c.retired = true;
    },
    done: run => run.c.retired,
    act(run, action) {
      const clone = JSON.parse(JSON.stringify(run.c));
      const res = cfg.money.act(clone, action);
      if (res.ok) run.c = clone;
      return res.ok;
    },
    bank: c => cfg.money.bank(c),
    money: c => cfg.money.ensure(c),
    spendable: c => shared.spendable(c),
    cardOpen: c => cfg.money.status(c).open && cfg.money.cap(c) >= 0.01,
    cardCap: c => cfg.money.cap(c),
    pos: c => c.pos,
    standing: c => c.fanbase,
    rival: c => c.rival,
    /* progress() runs the market after every season line, suspended ones
       included, so every row on the record is one market season. */
    playedSeasons: c => c.seasons.length,
    headlines: cfg.headlines,
    fans: cfg.fans,
    earnedBadges: cfg.earnedBadges,
    badgeDefs: cfg.badgeDefs,
  };
}

const blankRow = c => ({ year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 });

const SPORTS = {
  soccer: {
    label: 'soccer',
    positions: SOCCER_POS,
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
  nfl: usSport({
    label: 'nfl', arch: B.nfl.ARCHETYPES,
    start: (name, pos, arch, rng) => B.nfl.startCareer(name, pos, arch, rng, null),
    sim: B.nfl.simSeason, prog: B.nfl.progress, retire: B.nfl.shouldRetire,
    roll: B.nfl.rollTeamQuality, market: B.nfl.marketSalary, blankSeason: blankRow,
    money: { act: B.nflMoney.nflMoneyAct, bank: B.nflMoney.nflBankSummary, ensure: B.nflMoney.ensureNflMoney, status: B.nflMoney.nflCardStatus, cap: B.nflMoney.nflCardCap },
    headlines: B.nflLoop.nflHeadlinesFor, fans: B.nflLoop.nflFanComments,
    earnedBadges: B.nflLoop.nflEarnedBadges, badgeDefs: badges.NFL_BADGES,
  }),
  nba: usSport({
    label: 'nba', arch: B.nba.NBA_ARCHETYPES,
    start: (name, pos, arch, rng) => B.nba.startNbaCareer(name, pos, arch, rng, null, 'now'),
    sim: B.nba.simNbaSeason, prog: B.nba.nbaProgress, retire: B.nba.nbaShouldRetire,
    roll: B.nba.nbaRollTeamQuality, market: B.nba.nbaMarketSalary,
    blankSeason: c => ({ ...blankRow(c), ppg: 0, rpg: 0, apg: 0 }),
    money: { act: B.nbaMoney.nbaMoneyAct, bank: B.nbaMoney.nbaBankSummary, ensure: B.nbaMoney.ensureNbaMoney, status: B.nbaMoney.nbaCardStatus, cap: B.nbaMoney.nbaCardCap },
    headlines: B.nbaLoop.nbaHeadlinesFor, fans: B.nbaLoop.nbaFanComments,
    earnedBadges: B.nbaLoop.nbaEarnedBadges, badgeDefs: badges.NBA_BADGES,
  }),
  mlb: usSport({
    label: 'mlb', arch: B.mlb.MLB_ARCHETYPES,
    start: (name, pos, arch, rng) => B.mlb.startMlbCareer(name, pos, arch, rng, null, 'now'),
    sim: B.mlb.simMlbSeason, prog: B.mlb.mlbProgress, retire: B.mlb.mlbShouldRetire,
    roll: B.mlb.mlbRollTeamQuality, market: B.mlb.mlbMarketSalary, blankSeason: blankRow,
    money: { act: B.mlbMoney.mlbMoneyAct, bank: B.mlbMoney.mlbBankSummary, ensure: B.mlbMoney.ensureMlbMoney, status: B.mlbMoney.mlbCardStatus, cap: B.mlbMoney.mlbCardCap },
    headlines: B.mlbLoop.mlbHeadlinesFor, fans: B.mlbLoop.mlbFanComments,
    earnedBadges: B.mlbLoop.mlbEarnedBadges, badgeDefs: badges.MLB_BADGES,
  }),
  nhl: usSport({
    label: 'nhl', arch: B.nhl.NHL_ARCHETYPES,
    start: (name, pos, arch, rng) => B.nhl.startNhlCareer(name, pos, arch, rng, null, 'now'),
    sim: B.nhl.simNhlSeason, prog: B.nhl.nhlProgress, retire: B.nhl.nhlShouldRetire,
    roll: B.nhl.nhlRollTeamQuality, market: B.nhl.nhlMarketSalary, blankSeason: blankRow,
    money: { act: B.nhlMoney.nhlMoneyAct, bank: B.nhlMoney.nhlBankSummary, ensure: B.nhlMoney.ensureNhlMoney, status: B.nhlMoney.nhlCardStatus, cap: B.nhlMoney.nhlCardCap },
    headlines: B.nhlLoop.nhlHeadlinesFor, fans: B.nhlLoop.nhlFanComments,
    earnedBadges: B.nhlLoop.nhlEarnedBadges, badgeDefs: badges.NHL_BADGES,
  }),
};
const US = ['nfl', 'nba', 'mlb', 'nhl'];
const ALL = ['soccer', ...US];

/* ═══════════════════════════════════════════════════════════════════════════
   2. Money balances in every career
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('2) Money: every tap balances, every season pays the rate, in all five careers');

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

const played = Object.fromEntries(ALL.map(k => [k, []]));
for (const key of ALL) {
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
      if (key !== 'soccer' && run.lastLine) run.lines.push({ line: run.lastLine, snap: JSON.parse(JSON.stringify(run.c)) });
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
  console.log(`   ${key}: ${stats.careers} careers, ${stats.actions} taps (${stats.accepted} accepted, ${stats.refused} refused), ${stats.seasons} market seasons over ${stats.seasons + stats.steps} steps, savings paid ${stats.paid} times, bills covered ${stats.covered} times, ${stats.retired} retired, ${stats.offRecord} careers where the market count and the seasons played disagree`);
  if (stats.accepted < CAREERS * 4) fail(`${key}: only ${stats.accepted} accepted taps over ${CAREERS} careers, the money app was barely used`);
  if (stats.refused < 1) fail(`${key}: no tap was ever refused, so the refusal path was not measured`);
  if (stats.paid < CAREERS) fail(`${key}: savings paid interest only ${stats.paid} times over ${CAREERS} careers`);
  if (stats.offRecord > 3) fail(`${key}: ${stats.offRecord} careers where the market did not run once per season`);
  if (stats.seasons > 0 && stats.moved < stats.seasons * ASSETS.length * 0.9) fail(`${key}: prices moved in only ${stats.moved} of ${stats.seasons * ASSETS.length} asset seasons`);
}

/* The seam: all five descriptors on one seed are one market. */
{
  const base = { seasons: [{ year: 2025 }], year: 2025, netWorth: 6, morale: 60, fanbase: 50, yearlyCosts: 0.5 };
  const hosts = {
    soccer: { playerName: 'Parity Seam', seasons: [{ year: 2025 }], netWorth: 6, morale: 60, lifestyleCostPerYear: 0.5, karma: 50, events: [] },
    nfl: { ...base, name: 'Parity Seam', seasons: [{ year: 2025 }] },
    nba: { ...base, name: 'Parity Seam', seasons: [{ year: 2025 }] },
    mlb: { ...base, name: 'Parity Seam', seasons: [{ year: 2025 }] },
    nhl: { ...base, name: 'Parity Seam', seasons: [{ year: 2025 }] },
  };
  const api = {
    soccer: { act: (h, a) => soccerMoney.moneyAct(h, a), tick: (h, y) => soccerMoney.moneySeasonTick(h, y), ensure: h => soccerMoney.ensureMoney(h), bank: h => soccerMoney.bankSummary(h), sign: '€' },
    nfl: { act: B.nflMoney.nflMoneyAct, tick: h => B.nflMoney.nflMoneySeasonTick(h), ensure: B.nflMoney.ensureNflMoney, bank: B.nflMoney.nflBankSummary, sign: '$' },
    nba: { act: B.nbaMoney.nbaMoneyAct, tick: h => B.nbaMoney.nbaMoneySeasonTick(h), ensure: B.nbaMoney.ensureNbaMoney, bank: B.nbaMoney.nbaBankSummary, sign: '$' },
    mlb: { act: B.mlbMoney.mlbMoneyAct, tick: h => B.mlbMoney.mlbMoneySeasonTick(h), ensure: B.mlbMoney.ensureMlbMoney, bank: B.mlbMoney.mlbBankSummary, sign: '$' },
    nhl: { act: B.nhlMoney.nhlMoneyAct, tick: h => B.nhlMoney.nhlMoneySeasonTick(h), ensure: B.nhlMoney.ensureNhlMoney, bank: B.nhlMoney.nhlBankSummary, sign: '$' },
  };
  const strip = t => t.replace(/[€$]/g, '');
  for (const key of ALL) {
    const dep = api[key].act(hosts[key], { t: 'deposit', amount: 2 });
    const buy = api[key].act(hosts[key], { t: 'buy', id: 'cleats', amount: 1.5 });
    if (!dep.ok || !buy.ok) fail(`seam: ${key} refused the same deposit and buy the others accepted`);
    if (dep.toast !== `${api[key].sign}2.0M into savings`) fail(`seam: ${key} toasts "${dep.toast}", which differs beyond the currency sign`);
  }
  let same = 0, seasons = 0, compared = 0;
  for (let y = 2026; y <= 2033; y += 1) {
    const ticks = {};
    for (const key of ALL) {
      hosts[key].seasons.push({ year: y });
      ticks[key] = key === 'soccer' ? api.soccer.tick(hosts.soccer, y) : api[key].tick(hosts[key]);
    }
    seasons += 1;
    const ref = api.soccer.ensure(hosts.soccer);
    for (const key of US) {
      const m = api[key].ensure(hosts[key]);
      for (const a of ASSETS) {
        compared += 1;
        if (ref.price[a.id] === m.price[a.id]) same += 1;
        else fail(`seam: ${a.id} priced ${ref.price[a.id]} in soccer and ${m.price[a.id]} in ${key} after ${seasons} seasons on one seed`);
      }
      if (ref.vault !== m.vault) fail(`seam: savings ${ref.vault} in soccer and ${m.vault} in ${key} after ${seasons} seasons`);
      if (ticks.soccer.events.map(strip).join('|') !== ticks[key].events.map(strip).join('|')) {
        fail(`seam: the season's lines differ beyond the currency between soccer and ${key}: ${ticks.soccer.events.join(' / ')} vs ${ticks[key].events.join(' / ')}`);
      }
    }
  }
  const sb = api.soccer.bank(hosts.soccer);
  for (const key of US) {
    const nb = api[key].bank(hosts[key]);
    if (sb.total !== nb.total || sb.invested !== nb.invested) fail(`seam: everything you have reads ${sb.total} in soccer and ${nb.total} in ${key}`);
  }
  console.log(`   seam: ${same} of ${compared} prices identical across the five sports on one seed, savings ${sb.vault} in all of them, total ${sb.total} in all of them`);
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
  /* Basketball. nbaMyCareer.ts counts points, rebounds and assists and
     nothing else, so no line may name a three, a block, a steal or a
     percentage from the floor whoever is being written about. On top of that
     the guards are never asked to protect the rim and the two bigs are never
     asked to bring the ball up, which is the Round 319 rule in this sport. */
  nba: {
    PG: /\bthrees?\b|\bthree pointers?\b|\bfrom deep\b|\bsteals?\b|\bblocks?\b|\bfrom the floor\b|\brim protection\b|\bprotect the rim\b|\bin the paint\b/i,
    SG: /\bthrees?\b|\bthree pointers?\b|\bfrom deep\b|\bsteals?\b|\bblocks?\b|\bfrom the floor\b|\brim protection\b|\bprotect the rim\b|\bin the paint\b/i,
    SF: /\bthrees?\b|\bthree pointers?\b|\bfrom deep\b|\bsteals?\b|\bblocks?\b|\bfrom the floor\b|\brim protection\b|\bprotect the rim\b/i,
    PF: /\bthrees?\b|\bthree pointers?\b|\bfrom deep\b|\bsteals?\b|\bblocks?\b|\bfrom the floor\b|\brun the offence\b|\brun the offense\b|\bbring it up\b/i,
    C: /\bthrees?\b|\bthree pointers?\b|\bfrom deep\b|\bsteals?\b|\bblocks?\b|\bfrom the floor\b|\brun the offence\b|\brun the offense\b|\bbring it up\b/i,
  },
  /* Baseball. Two sports in one clubhouse: an arm is never asked for a bat
     and a bat is never asked for an arm, and the three spots the profile
     table gives almost no speed to are never asked to run. */
  mlb: (() => {
    const ARM = /\bhome runs?\b|\bbatting average\b|\brbi\b|\bstolen bases?\b|\bsteals?\b|\bat the plate\b|\bdriven in\b|\bhits \./i;
    const BAT = /\bera\b|\bstrikeouts?\b|\bsaves?\b|\bon the mound\b|\bout of the bullpen\b|\binnings?\b|\bshut the door\b/i;
    const LEGS = /\bstolen bases?\b|\bsteals?\b|\bon the basepaths\b|\bmake something happen\b/i;
    const both = (a, b) => new RegExp(`${a.source}|${b.source}`, 'i');
    return {
      SP: ARM, RP: ARM,
      C: both(BAT, LEGS), '1B': both(BAT, LEGS), DH: both(BAT, LEGS),
      '2B': BAT, '3B': BAT, SS: BAT, LF: BAT, CF: BAT, RF: BAT,
    };
  })(),
  /* Hockey. The goalie's line is wins and a save percentage, so he is never
     written up for a goal, a point or an assist; the skaters are never
     written up in the crease; and a defenceman, whose offence weight is 0.55
     in NHL_POS_PROFILE, is never asked for a hat trick. */
  nhl: {
    C: /\bsaves?\b|\bsave percentage\b|\bshutouts?\b|\bin the crease\b|\bbody checks?\b|\bblocked shots?\b/i,
    LW: /\bsaves?\b|\bsave percentage\b|\bshutouts?\b|\bin the crease\b|\bbody checks?\b|\bblocked shots?\b/i,
    RW: /\bsaves?\b|\bsave percentage\b|\bshutouts?\b|\bin the crease\b|\bbody checks?\b|\bblocked shots?\b/i,
    D: /\bsaves?\b|\bsave percentage\b|\bshutouts?\b|\bin the crease\b|\bhat trick\b|\bbody checks?\b/i,
    G: /\bgoals?\b|\bassists?\b|\bpoints?\b|\bscore\b|\bbury\b|\bhat trick\b|\bon the blue line\b/i,
  },
};
/* The en and em dash, as escapes, so this file carries neither. */
const DASH = /[–—]/;

const socialSeen = Object.fromEntries(ALL.map(k => [k, 0]));
function checkLine(sport, pos, line, where) {
  socialSeen[sport] += 1;
  const re = NEVER[sport][pos];
  if (!re) { fail(`${sport}: no forbidden list for position ${pos}`); return; }
  if (re.test(line)) fail(`${sport} ${pos} ${where}: "${line}" asks for a stat this position is not judged on`);
  if (DASH.test(line)) fail(`${sport} ${pos} ${where}: dash in "${line}"`);
}

/* Static: every position at every standing tier, in every sport. */
for (const sport of ALL) {
  for (const pos of Object.keys(NEVER[sport])) {
    for (const standing of [10, 30, 50, 70, 90]) {
      for (const line of social.fanComments(sport, { pos, standing, followers: '1.2M' })) checkLine(sport, pos, line, `fans at ${standing}`);
      checkLine(sport, pos, social.askForMore(sport, pos), 'ask');
    }
  }
}

/* Static, the paper: a rich season line and a thin one for every position in
   every American sport, so every branch of every headline writer is read at
   least once whatever the played careers happened to produce. */
const PAPER_PROBE = {
  nfl: {
    write: social.nflSeasonHeadlines,
    full: {
      games: 17, passYds: 5100, passTd: 40, ints: 8, rushYds: 2050, rushTd: 18, rec: 110, recYds: 1600, recTd: 14,
      tackles: 140, sacks: 21, picks: 6, passDef: 18, forcedFum: 3, fgMade: 35, fgAtt: 35, longFg: 58,
      awards: ['MVP', 'All-Pro'], teamResult: 'WON THE SUPER BOWL',
    },
    thin: { passYds: 900, passTd: 4, ints: 16, rushYds: 300, rec: 20, recYds: 200, tackles: 40, sacks: 2, picks: 1, fgMade: 18, fgAtt: 24, awards: [], teamResult: 'Missed playoffs' },
  },
  nba: {
    write: social.nbaSeasonHeadlines,
    full: { games: 82, ppg: 33, rpg: 13, apg: 11, awards: ['MVP', 'All-NBA', 'Finals MVP'], teamResult: 'WON THE NBA FINALS' },
    thin: { ppg: 9, rpg: 3, apg: 2, awards: [], teamResult: 'Missed the playoffs' },
  },
  mlb: {
    write: social.mlbSeasonHeadlines,
    full: { games: 158, avg: 0.341, hr: 52, rbi: 140, sb: 44, wins: 22, lossesP: 4, era: 1.92, so: 280, saves: 46, awards: ['MVP', 'Cy Young', 'All-Star'], teamResult: 'WON THE WORLD SERIES' },
    thin: { avg: 0.244, hr: 9, rbi: 48, sb: 3, wins: 6, lossesP: 14, era: 4.85, so: 90, saves: 2, awards: [], teamResult: 'Missed October' },
  },
  nhl: {
    write: social.nhlSeasonHeadlines,
    full: { games: 82, goals: 56, assists: 70, points: 126, wins: 44, svpct: 0.934, awards: ['Hart', 'Vezina', 'Norris', 'Conn Smythe', 'Art Ross'], teamResult: 'WON THE STANLEY CUP' },
    thin: { games: 70, goals: 12, assists: 18, points: 30, wins: 24, svpct: 0.906, awards: [], teamResult: 'Missed the playoffs' },
  },
};
for (const sport of US) {
  const probe = PAPER_PROBE[sport];
  for (const pos of SPORTS[sport].positions) {
    const full = { games: 82, ...probe.full };
    const thin = { ...full, ...probe.thin, games: probe.thin.games ?? full.games };
    for (const line of [full, thin]) {
      for (const h of probe.write({ name: 'Parity Man', team: 'the Parity Bears', pos, line, missed: 25, role: 'starter' })) checkLine(sport, pos, h, 'paper');
    }
  }
}

/* Harvested from the careers section 2 actually played. */
for (const sport of US) {
  for (const run of played[sport]) {
    for (const { line, snap } of run.lines) {
      for (const h of SPORTS[sport].headlines(snap, line)) checkLine(sport, snap.pos, h, `paper y${line.year}`);
      for (const f of SPORTS[sport].fans(snap)) checkLine(sport, snap.pos, f, `fans y${line.year}`);
    }
  }
}
for (const run of played.soccer) {
  const c = run.c;
  for (const standing of [SPORTS.soccer.standing(c), 20, 80]) {
    for (const f of social.fanComments('soccer', { pos: c.position, standing, followers: social.fmtFollowers(1.2) })) checkLine('soccer', c.position, f, 'fans');
  }
}
for (const sport of ALL) {
  if (socialSeen[sport] < 200) fail(`${sport}: only ${socialSeen[sport]} fan and paper lines checked, too few to mean anything`);
}
console.log(`   ${ALL.map(s => `${s} ${socialSeen[s]}`).join(', ')} lines checked across ${ALL.reduce((n, s) => n + Object.keys(NEVER[s]).length, 0)} positions`);

/* 3b. Every path, not the paths this round touched. The check that missed the
   Round 467 board bug probed the two functions that round changed and nothing
   else, so the next round's new function walked straight through it. Here the
   universe of positions is taken from the engines themselves and from the
   source of careerSocial.ts, and a position with no forbidden list is a
   failure rather than a silent skip. */
{
  const socialSrc = stripComments(readSrc(SOCIAL_SRC));
  let engineGaps = 0, tokenGaps = 0, tokens = 0;
  for (const sport of US) {
    for (const pos of SPORTS[sport].positions) {
      if (!NEVER[sport][pos]) { engineGaps += 1; fail(`${sport}: ${pos} is a position the engine deals and it has no forbidden list`); }
    }
  }
  /* Every position token the module itself names, per sport, read out of the
     ask function and the stat function it belongs to. */
  const BLOCK = {
    soccer: [/function soccerAsk[\s\S]*?\n}/],
    nfl: [/function nflAsk[\s\S]*?\n}/, /function nflStat[\s\S]*?\n}/],
    nba: [/function nbaAsk[\s\S]*?\n}/, /function nbaStat[\s\S]*?\n}/],
    mlb: [/function mlbAsk[\s\S]*?\n}/, /function mlbStat[\s\S]*?\n}/],
    nhl: [/function nhlAsk[\s\S]*?\n}/, /function nhlStat[\s\S]*?\n}/],
  };
  for (const sport of ALL) {
    for (const re of BLOCK[sport]) {
      const body = re.exec(socialSrc)?.[0];
      if (!body) { fail(`3b: could not read ${re} out of careerSocial.ts, so this check proves nothing`); continue; }
      for (const m of body.matchAll(/(?:case|pos ===) '([A-Z0-9]{1,4})'/g)) {
        tokens += 1;
        if (!NEVER[sport][m[1]]) { tokenGaps += 1; fail(`${sport}: careerSocial.ts names position ${m[1]} and it has no forbidden list`); }
      }
    }
  }
  console.log(`   3b: ${US.reduce((n, s) => n + SPORTS[s].positions.length, 0)} engine positions and ${tokens} position tokens in careerSocial.ts, ${engineGaps + tokenGaps} without a forbidden list`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. Rival: named, generated, present in all five, and moving
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('4) Rival: a generated rival exists in every career and moves season on season');
for (const sport of US) {
  let present = 0, named = 0, moved = 0, scored = 0, aged = 0;
  for (const run of played[sport]) {
    const start = SPORTS[sport].fresh(run.seed).c.rival;
    const r = run.c.rival;
    if (!r) continue;
    present += 1;
    if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(r.name) && r.pos === run.c.pos) named += 1;
    /* Read after his first season: a young rival grows toward his ceiling
       every year, and a whole career can end back on the draft number. */
    const afterOne = run.lines[0]?.snap.rival;
    if (afterOne && afterOne.ovr !== start.ovr) moved += 1;
    if (r.myYears + r.hisYears >= 1 && r.lastLine.length > 0) scored += 1;
    if (r.age > start.age || r.retired) aged += 1;
  }
  const n = played[sport].length;
  console.log(`   ${sport}: rival on ${present} of ${n} saves, ${named} named at my position, ${moved} changed rating, ${scored} on the head to head, ${aged} aged or retired`);
  if (present !== n) fail(`${sport}: rival missing on ${n - present} of ${n} saves`);
  if (named !== present) fail(`${sport}: ${present - named} rivals without a generated two word name at my position`);
  if (moved < present * 0.9) fail(`${sport}: rival rating moved on only ${moved} of ${present} saves`);
  if (scored !== present) fail(`${sport}: ${present - scored} rivals never entered the head to head`);
  if (aged !== present) fail(`${sport}: ${present - aged} rivals never aged`);
}
{
  let present = 0, named = 0, moved = 0, played22 = 0;
  for (const run of played.soccer) {
    const c = run.c;
    if (c.age >= 22) played22 += 1;
    const r = c.rival;
    if (!r) continue;
    present += 1;
    if (r.name && r.name.trim().split(/\s+/).length >= 2 && r.nationality) named += 1;
    if (r.careerApps > 0 && r.age > 19) moved += 1;
  }
  /* Moving is measured twice for soccer: career apps growing on the save the
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

console.log('5) Badges: every badge in all four cases is reachable and none is handed out for nothing');
for (const sport of US) {
  const sp = SPORTS[sport];
  const earnedBy = new Map(sp.badgeDefs.map(b => [b.id, 0]));
  const count = c => { for (const b of sp.earnedBadges(c)) earnedBy.set(b.id, (earnedBy.get(b.id) ?? 0) + 1); };
  for (const run of played[sport]) count(run.c);
  /* The elite sweep covers every position paired with every archetype, twice,
     so a badge that only a closer or only a stretch five can reach is still
     asked for rather than left to whichever seeds came up. */
  let elite = 0;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const [i, lineup] of sp.lineups.entries()) {
      const run = sp.fresh(3000 + pass * 500 + i, true, lineup);
      let guard = 0;
      while (!sp.done(run) && guard < 24) {
        guard += 1;
        /* An elite earner who saves keeps the money badges honest. */
        const free = sp.spendable(run.c);
        if (free > 1) sp.act(run, { t: 'deposit', amount: r2(free * 0.5) });
        sp.season(run);
      }
      elite += 1;
      count(run.c);
    }
  }
  const fresh = sp.earnedBadges(sp.fresh(4000).c);
  if (fresh.length > 0) fail(`${sport}: a career that has not played a season already wears ${fresh.map(b => b.id).join(', ')}`);
  const never = [...earnedBy].filter(([, n]) => n === 0).map(([id]) => id);
  const rare = [...earnedBy].filter(([, n]) => n > 0 && n <= 2).map(([id, n]) => `${id}:${n}`);
  console.log(`   ${sport}: ${sp.badgeDefs.length} badges, ${played[sport].length} ordinary and ${elite} elite careers, ${[...earnedBy].filter(([, n]) => n > 0).length} earned at least once${rare.length ? `, rare: ${rare.join(' ')}` : ''}`);
  if (never.length) fail(`${sport}: badges nobody could earn: ${never.join(', ')}`);
  for (const b of sp.badgeDefs) {
    if (DASH.test(b.label) || DASH.test(b.blurb)) fail(`${sport} badge ${b.id}: dash in its copy`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   verdict
   ═══════════════════════════════════════════════════════════════════════════ */

console.log('');
if (CONTROL) {
  /* A control is judged by what the harness SAID, never by an exit code: it
     has to have reported the planted defect, and where the defect was planted
     in five places it has to have reported all five. */
  const missing = [];
  if (CONTROL === 'privatecopy') {
    for (const rel of WRAPPERS) if (!said.some(m => m.startsWith(`${rel} carries a private copy`))) missing.push(rel);
  }
  if (CONTROL === 'printer') {
    for (const key of ALL) if (!said.some(m => m.startsWith(`${key} #`))) missing.push(key);
  }
  if (missing.length) {
    console.error(`simCareerParity control ${CONTROL}: RED. The planted defect went unreported for ${missing.join(', ')}, so this harness proves nothing there.`);
    process.exit(1);
  }
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
console.log('simCareerParity: green. One money app, one fan rule, one rival shape, one badge case, in all five careers.');
