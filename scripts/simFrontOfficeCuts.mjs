/* The front office cuts fence. Round 631, over all four GM sims.

   THE DEFECT. In every front office (NFL, NBA, MLB, NHL) the release freed a
   man's whole salary in one move and he landed in the pool where the sign path
   would take him straight back on a one year deal. So a cut was full cap
   relief for nothing and a cut plus re-sign was a free contract reset.
   Measured on the shipped engines, cap room before, after the cut, after the
   re-sign: NFL Trey McBride 23.7M with three years left, 190.4, 214.1, 190.4,
   his deal reset to one year. MLB Corbin Carroll 21.8M with four, 75.3, 97.1,
   75.3. NHL Leo Carlsson 9.6M with four, 19.6, 29.2, 19.6. NBA Nikola Jokic
   61.1M with three freed the whole 61.1, the re-sign refused only by Denver's
   own cap position, never by a rule.

   THE RULE lives once, in src/lib/frontOfficeCuts.ts: half his salary stays
   on this season's number as dead money (rounded to 0.1), a quarter lands on
   next season's if he had years left, each sport's capUsed adds it, the
   cutting team cannot sign him back or trade for him until the offseason,
   and each sport's offseason rolls the ledger and clears the list for every
   team. Both fields are optional on the save. MLB has no cap: the number is
   its luxury tax line, which is what mlbSign checks.

   Every section runs the REAL engines, bundled with esbuild, over several
   seeded leagues per sport. Nothing here reads dist or the clock.

     1) a cut charges dead money: exact arithmetic on the entry, on capUsed
        and on the room, which rises by less than the salary and more than zero
     2) the cut man cannot be signed back that season by the cutting team,
        and every other team can still sign him
     3) the offseason rolls the second year charge to a quarter, drops a one
        year charge, clears releasedThisSeason, and the cutting team can then
        sign him back; a second offseason clears the rest
     4) the exploit replayed end to end, the probe's exact sequence: cut, read
        the room, try to sign him back, read it again, and again, on one man.
        He never comes back and the room never shows a free salary.
     5) a league saved before this round, with neither field, behaves exactly
        like a twin carrying empty arrays through the same signing, cut and
        offseason under the same rng. Sections 1 to 4, 8 and 9 give every
        team empty arrays up front so that the absent shape is this section's
        alone, which is what lets its control move it and nothing else.
     6) the season close test and the four board cut test pass under vitest,
        every board row by name
     7) the source guard, read through the TypeScript parser so no comment of
        any kind can satisfy it. Every file under src/lib ending FrontOffice.ts
        is an engine and must have an adapter below (so a fifth engine fails
        until it gets sections 1 to 5 too); every function named release,
        waive, cut, DFA or designate must call cutPlayer and must not splice or
        filter a players array itself; every function that takes a man off a
        players array (splice, pop, shift, or players = ...filter) must be a
        trade path that asks tradeRefusal; and every engine imports the helper
        and calls signRefusal, rollDeadCap and payrollWithDeadCap.
     8) the hub's Free agency box agrees with the sign path: every club cuts
        its best man, and the box never names a man the sign path refuses for
        any reason but money, nor calls a man in reach whom it refuses at the
        real cap. Without the ledger the box would have named the man just cut
        on most clubs; that baseline is measured and must stay above zero.
     9) a man cut this season cannot come back by trade: after another club
        signs him, both trade paths refuse the deal, the reason is named, the
        same deal for another man goes through, and the Trade Finder never
        offers him.

   Controls, through FO_CUTS_CONTROL. None touches src: the helper and hub
   controls bundle a copy from OS temp behind an esbuild redirect, the source
   controls edit the text section 7 reads, and onetap renders board copies
   written to dist/.cuts-control. Each refuses to run if its anchor is not in
   the file, and each must turn exactly its own sections red on every sim:
     freecut      dead money driven to zero               -> 1 and 4
     resign       the same season re-sign allowed          -> 2 and 4
     norollover   the offseason never rolls                -> 3
     legacysave   the helper loses its guards for absent fields -> 5
     onetap       the cut fires on the first tap           -> 6
     nohelper     a raw roster splice in every release     -> 7
     filtercut    a release by players.filter and a push   -> 7
     prosecall    the cutPlayer call moved into a comment  -> 7
     fifthengine  a fifth engine with no adapter           -> 7 (the discovery check)
     hubtile      the hub box offers the whole pool again  -> 8
     tradeback    the trade refusal switched off           -> 9
   Section 4 is the probe replayed, and the probe's outcome rests on both
   halves of the rule, so it goes red under either half's control by design.
   Section 6 is skipped under every control but onetap, because vitest reads
   src, which the other controls never touch.

   Run: node scripts/simFrontOfficeCuts.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src', 'lib');
const HELPER = path.join(LIB, 'frontOfficeCuts.ts');
const HUB = path.join(LIB, 'foHub.ts');
const FINDER = path.join(LIB, 'tradeFinder.ts');
const CONTROL = process.env.FO_CUTS_CONTROL || '';
const EXPECT = {
  freecut: { sections: [1, 4] },
  resign: { sections: [2, 4] },
  norollover: { sections: [3] },
  legacysave: { sections: [5] },
  onetap: { sections: [6] },
  nohelper: { sections: [7] },
  filtercut: { sections: [7] },
  prosecall: { sections: [7] },
  fifthengine: { sections: [7], sports: ['discovery'] },
  hubtile: { sections: [8] },
  tradeback: { sections: [9] },
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`FO_CUTS_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}

const SECTION_NAMES = {
  1: 'a cut charges dead money',
  2: 'no way back this season, for the cutting team only',
  3: 'the offseason rolls the ledger and clears the list',
  4: 'the exploit replayed end to end',
  5: 'a league saved before this round, against its twin',
  6: 'the boards under vitest',
  7: 'no engine takes a man off a roster on its own',
  8: 'the hub box agrees with the sign path',
  9: 'no way back by trade either',
};

/* The four sims, the way FrontOfficeSeasonClose.test.tsx tables them. The
   roster floor and ceiling are read from each engine's own exports. */
const SPORTS = [
  { key: 'NFL', file: 'frontOffice.ts', init: 'initLeague', release: 'releasePlayer', sign: 'signPlayer', capUsed: 'capUsed', capRoom: 'capRoom', offseason: 'runOffseason', propose: 'proposeTrade', talks: 'executeTalksTrade', value: 'tradeValue', min: 'NFL_ROSTER_MIN', max: null },
  { key: 'NBA', file: 'nbaFrontOffice.ts', init: 'initNbaLeague', release: 'nbaRelease', sign: 'nbaSign', capUsed: 'nbaCapUsed', capRoom: 'nbaCapRoom', offseason: 'nbaOffseason', propose: 'nbaTrade', talks: 'nbaExecuteTalksTrade', value: 'nbaTradeValue', min: 'NBA_ROSTER_MIN', max: 'NBA_ROSTER_MAX' },
  { key: 'MLB', file: 'mlbFrontOffice.ts', init: 'initMlbLeague', release: 'mlbRelease', sign: 'mlbSign', capUsed: 'mlbCapUsed', capRoom: 'mlbCapRoom', offseason: 'mlbOffseason', propose: 'mlbTrade', talks: 'mlbExecuteTalksTrade', value: 'mlbTradeValue', min: 'MLB_ROSTER_MIN', max: 'MLB_ROSTER_MAX' },
  { key: 'NHL', file: 'nhlFrontOffice.ts', init: 'initNhlLeague', release: 'nhlRelease', sign: 'nhlSign', capUsed: 'nhlCapUsed', capRoom: 'nhlCapRoom', offseason: 'nhlOffseason', propose: 'nhlTrade', talks: 'nhlExecuteTalksTrade', value: 'nhlTradeValue', min: 'NHL_ROSTER_MIN', max: 'NHL_ROSTER_MAX' },
];
const BOARDS = {
  NFL: ['FO_CUTS_BOARD_NFL', 'src/components/front-office/FrontOfficeBoard.tsx'],
  NBA: ['FO_CUTS_BOARD_NBA', 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx'],
  MLB: ['FO_CUTS_BOARD_MLB', 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx'],
  NHL: ['FO_CUTS_BOARD_NHL', 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx'],
};
/* The rows FrontOfficeCuts.test.tsx carries for every board, by name. The
   ceiling row exists only where the sign path has a ceiling. */
const BOARD_ROWS = [
  'quotes the dead money before the tap, asks twice, and only then charges it',
  'shows why the man you cut cannot be signed back and greys his button',
  'at the roster floor every cut is disabled with the reason',
  'at the roster ceiling every Sign is disabled with the reason',
  'a man you cut this season cannot come back by trade, and the trade screen says why',
];

let checks = 0;
const fails = [];
const bySection = new Map();
/* which sports each section went red on, so a control can be proved per sport */
const redSports = new Map();
const ok = (section, sport, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) {
    s.bad += 1;
    if (!redSports.has(section)) redSports.set(section, new Set());
    redSports.get(section).add(sport);
    fails.push(`[${section}] ${sport} ${label}${detail ? ': ' + detail : ''}`);
  }
  bySection.set(section, s);
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const tenth = n => near(n * 10, Math.round(n * 10), 1e-6);
const round1 = n => Math.round(n * 10) / 10;
const clone = v => JSON.parse(JSON.stringify(v));
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const safe = f => { try { return f(); } catch (e) { return `THREW ${String(e && e.message ? e.message : e).slice(0, 80)}`; } };
/* Every team gets both fields as empty arrays, so the absent shape is section
   5's alone. See the note on section 5 in the header. */
const seedLedgers = league => { for (const t of Object.values(league.teams)) { t.deadCap = []; t.releasedThisSeason = []; } return league; };
/* A cap no roster can fill. Every sign call in sections 2 to 5 and 9 uses it,
   so a refusal there is the rule and never the room: the NBA ships most clubs
   over the cap, and a check that never gets past the room proves nothing.
   Section 1 reads the room under the real cap, because that is the arithmetic. */
const BIG = 1e6;

/* Line endings are not a fact about the code: the anchors are written LF and
   a Windows checkout carries CRLF, so every source is normalised before any
   anchor is looked for. */
const normaliseEol = t => t.split('\r\n').join('\n');
/* esbuild, typescript and vitest resolve by walk-up from the repo root, so a
   worktree inside the repo, which has no node_modules of its own, still finds
   them. */
const req = createRequire(path.join(ROOT, 'package.json'));
const findUp = rel => {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
};
/* Rewrite a copy, refusing to run if any anchor is missing or the result is unchanged. */
const rewrite = (label, src, swaps) => {
  for (const [now] of swaps) {
    if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} is not in ${label}, so it would change nothing. Refusing to run.`);
  }
  let out = src;
  for (const [now, was] of swaps) out = out.split(now).join(was);
  if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${label} changed nothing. Refusing to run.`);
  return out;
};

/* ---- the engines, the helper, the hub and the finder, bundled ------------ */
const HELPER_SWAPS = {
  freecut: [['  const now = round1(p.salary * 0.5);', '  const now = 0;']],
  resign: [['  if ((team.releasedThisSeason ?? []).includes(playerId)) return', '  if (false) return']],
  norollover: [['export function rollDeadCap(team: CutLedger): void {', 'export function rollDeadCap(team: CutLedger): void {\n  if (team) return;']],
  /* the regression this guards: somebody drops the absent field guards */
  legacysave: [
    ['(team.deadCap ?? [])', '(team.deadCap as DeadCapEntry[])'],
    ['(team.releasedThisSeason ?? [])', '(team.releasedThisSeason as string[])'],
  ],
  tradeback: [['  if ((team.releasedThisSeason ?? []).includes(incomingId)) return', '  if (false) return']],
};
const HUB_SWAPS = {
  hubtile: [['    const market = f.freeAgents.filter(p => !(f.ledger && p.id && signRefusal(f.ledger, p.id)));', '    const market = f.freeAgents;']],
};
const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-focuts-'));
const engines = {};
let cuts = null;
let hub = null;
let finder = null;
try {
  let helperPath = HELPER;
  let hubPath = HUB;
  if (HELPER_SWAPS[CONTROL]) {
    helperPath = path.join(BUNDLE_DIR, 'frontOfficeCuts.ts');
    fs.writeFileSync(helperPath, rewrite('frontOfficeCuts.ts', normaliseEol(fs.readFileSync(HELPER, 'utf8')), HELPER_SWAPS[CONTROL]));
  }
  if (HUB_SWAPS[CONTROL]) {
    hubPath = path.join(BUNDLE_DIR, 'foHub.ts');
    fs.writeFileSync(hubPath, rewrite('foHub.ts', normaliseEol(fs.readFileSync(HUB, 'utf8')), HUB_SWAPS[CONTROL]));
  }
  const NOTE = {
    freecut: 'dead money driven to zero in a copy of the helper, a cut frees the whole salary again',
    resign: 'the helper copy takes a man back the season he was cut',
    norollover: 'the helper copy never rolls the ledger or clears the list',
    legacysave: 'the helper copy reads deadCap and releasedThisSeason with no guard for a save that lacks them',
    tradeback: 'the helper copy lets a man come back by trade the season he was cut',
    hubtile: 'the hub copy offers the whole pool again, the cut ledger ignored',
  }[CONTROL];
  if (NOTE) console.log(`   control ${CONTROL}: ${NOTE}`);
  /* every import of the helper or the hub, from every engine and from the
     entry itself, lands on the chosen file */
  const redirect = {
    name: 'dukb-control-copies',
    setup(b) {
      b.onResolve({ filter: /frontOfficeCuts(\.ts)?$/ }, () => ({ path: helperPath }));
      b.onResolve({ filter: /foHub(\.ts)?$/ }, () => ({ path: hubPath }));
    },
  };
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
  const lines = SPORTS.map(s => `export * as ${s.key} from ${fwd(path.join(LIB, s.file))};`);
  lines.push(`export * as cuts from ${fwd(HELPER)};`, `export * as hub from ${fwd(HUB)};`, `export * as finder from ${fwd(FINDER)};`);
  fs.writeFileSync(entry, lines.join('\n') + '\n');
  const out = path.join(BUNDLE_DIR, 'engines.mjs');
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [redirect], outfile: out, logLevel: 'error',
  });
  const mod = await import(pathToFileURL(out).href);
  for (const s of SPORTS) engines[s.key] = mod[s.key];
  cuts = mod.cuts;
  hub = mod.hub;
  finder = mod.finder;
} catch (e) {
  console.error(`FAIL: the engines could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 220)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
for (const s of SPORTS) {
  for (const fn of ['init', 'release', 'sign', 'capUsed', 'capRoom', 'offseason', 'propose', 'talks', 'value']) {
    if (typeof engines[s.key][s[fn]] !== 'function') {
      console.error(`FAIL: ${s.file} does not export ${s[fn]}, so the ${s.key} adapter is wrong and nothing below can be trusted`);
      process.exit(1);
    }
  }
  s.floor = engines[s.key][s.min];
  s.ceiling = s.max ? engines[s.key][s.max] : Infinity;
  if (!Number.isInteger(s.floor) || !(s.ceiling === Infinity || Number.isInteger(s.ceiling))) {
    console.error(`FAIL: ${s.file} does not export a roster floor ${s.min}${s.max ? ` and ceiling ${s.max}` : ''} this harness can read`);
    process.exit(1);
  }
}
for (const fn of ['deadMoneyFor', 'deadCapUsed', 'signRefusal', 'tradeRefusal', 'rollDeadCap', 'payrollWithDeadCap']) {
  if (typeof cuts[fn] !== 'function') { console.error(`FAIL: frontOfficeCuts.ts does not export ${fn}`); process.exit(1); }
}
if (typeof hub.foHubTiles !== 'function' || typeof finder.findTrades !== 'function') {
  console.error('FAIL: foHub.ts or tradeFinder.ts did not bundle, so sections 8 and 9 cannot run');
  process.exit(1);
}

const SEEDS = [20260919, 631, 7, 4242];
const api = s => {
  const e = engines[s.key];
  return {
    init: rng => e[s.init](rng),
    release: (t, fa, id) => e[s.release](t, fa, id),
    sign: (t, fa, id, cap) => e[s.sign](t, fa, id, cap),
    capUsed: t => e[s.capUsed](t),
    capRoom: (t, cap) => e[s.capRoom](t, cap),
    offseason: (lg, rng) => e[s.offseason](lg, rng),
    propose: (my, their, mine, theirs, sweeten, cap) => e[s.propose](my, their, mine, theirs, sweeten, cap),
    talks: (my, their, mine, theirs, addPick, cap) => e[s.talks](my, their, mine, theirs, addPick, cap),
    proposeFn: e[s.propose],
    valueFn: e[s.value],
  };
};

/* One league per seed per sport. The GM's team is the first, walking from a
   seed dependent offset, that sits at least two men above the floor and holds
   both the men the sections cut: the best rated man with years left (he has
   to survive the pool trim at the offseason, which keeps the best thirty or
   forty) and a man on his last year. The NBA, MLB and NHL bakes ship nobody
   on a one year deal, so where a roster has none the fixture puts its second
   best man on his last year first: every offseason decrements years, so a
   saved league holds such men within a season, and the rule has to be right
   for them. The harness says when it did that. */
const fixtures = [];
for (const s of SPORTS) {
  const E = api(s);
  let wrote = 0;
  SEEDS.forEach((seed, i) => {
    const rng = lcg(seed);
    const league = seedLedgers(E.init(rng));
    const abbrs = Object.keys(league.teams);
    let picked = null;
    for (let k = 0; k < abbrs.length && !picked; k += 1) {
      const abbr = abbrs[(i * 7 + k) % abbrs.length];
      const team = league.teams[abbr];
      if (team.players.length < s.floor + 2) continue;
      const onYears = [...team.players].filter(p => p.years >= 2).sort((a, b) => b.ovr - a.ovr || b.salary - a.salary);
      const two = onYears[0];
      let one = [...team.players].filter(p => p.years === 1).sort((a, b) => b.ovr - a.ovr || b.salary - a.salary)[0];
      if (two && !one && onYears[1]) { one = onYears[1]; one.years = 1; wrote += 1; }
      if (two && one) picked = { abbr, team, two, one };
    }
    fixtures.push({ sport: s, E, seed, rng, league, ...(picked ?? { abbr: null, team: null, two: null, one: null }) });
  });
  if (wrote) console.log(`   ${s.key}: the bake ships no one year deals, so ${wrote} of ${SEEDS.length} fixtures put a second man on his last year`);
}

/* ---- 1. a cut charges dead money ---------------------------------------- */
console.log('1) A cut charges dead money: half now, a quarter next season if he had years left, on all four sims');
for (const f of fixtures) {
  const { sport, E, league } = f;
  ok(1, sport.key, `seed ${f.seed}: a team above the floor with a man on years and a man on his last year exists (fixture)`, !!f.team,
    'no team in this league fits the fixture, so nothing was measured for it');
  if (!f.team) continue;
  const { team, abbr } = f;
  for (const p of [f.two, f.one]) {
    const salaries = () => round1(team.players.reduce((s, x) => s + x.salary, 0));
    const roomBefore = E.capRoom(team, league.cap);
    const usedBefore = E.capUsed(team);
    const deadBefore = cuts.deadCapUsed(team);
    const quote = cuts.deadMoneyFor(p);
    const done = E.release(team, league.freeAgents, p.id);
    const roomAfter = E.capRoom(team, league.cap);
    const entry = (team.deadCap ?? []).find(d => d.playerId === p.id);
    const pooled = league.freeAgents.find(x => x.id === p.id);
    const tag = `${abbr} ${p.name} ${p.salary}M x${p.years}`;
    ok(1, sport.key, `${tag}: the cut went through`, done === true && !team.players.some(x => x.id === p.id));
    ok(1, sport.key, `${tag}: he joins the pool on one year`, !!pooled && pooled.years === 1, pooled ? `years ${pooled.years}` : 'not in the pool');
    ok(1, sport.key, `${tag}: the ledger holds an entry for him`, !!entry && entry.name === p.name,
      entry ? '' : `deadCap is ${JSON.stringify(team.deadCap ?? null)}`);
    if (!entry) continue;
    ok(1, sport.key, `${tag}: this season carries half his salary, rounded to 0.1`,
      entry.amount > 0 && tenth(entry.amount) && Math.abs(entry.amount - p.salary / 2) <= 0.05 + 1e-9,
      `entry ${entry.amount}, half is ${p.salary / 2}`);
    ok(1, sport.key, `${tag}: the entry runs ${p.years > 1 ? 'two seasons' : 'one season'}`, entry.seasonsLeft === (p.years > 1 ? 2 : 1),
      `seasonsLeft ${entry.seasonsLeft}`);
    ok(1, sport.key, `${tag}: the quote the button shows is the charge the engine made`, near(quote.now, entry.amount),
      `quote ${quote.now}, charged ${entry.amount}`);
    ok(1, sport.key, `${tag}: the quoted second year is ${p.years > 1 ? 'a quarter' : 'nothing'}`,
      p.years > 1 ? (quote.next > 0 && tenth(quote.next) && Math.abs(quote.next - entry.amount / 2) <= 0.05 + 1e-9) : quote.next === 0,
      `next ${quote.next}`);
    ok(1, sport.key, `${tag}: deadCapUsed is the sum of the ledger`, near(cuts.deadCapUsed(team), round1(deadBefore + entry.amount)),
      `deadCapUsed ${cuts.deadCapUsed(team)}, expected ${round1(deadBefore + entry.amount)}`);
    ok(1, sport.key, `${tag}: capUsed is salaries plus dead money`, near(E.capUsed(team), round1(salaries() + cuts.deadCapUsed(team))),
      `capUsed ${E.capUsed(team)}, salaries ${salaries()}, dead ${cuts.deadCapUsed(team)}`);
    const relief = round1(roomAfter - roomBefore);
    ok(1, sport.key, `${tag}: the room rises by less than his salary and by more than zero`, relief > 0 && relief < p.salary,
      `room ${roomBefore} to ${roomAfter}, relief ${relief} against a salary of ${p.salary}`);
    ok(1, sport.key, `${tag}: the relief is exactly his salary less the dead money`, near(roomAfter, round1(roomBefore + p.salary - entry.amount)),
      `room ${roomAfter}, expected ${round1(roomBefore + p.salary - entry.amount)} (used before ${usedBefore})`);
  }
}

/* ---- 2. no way back this season, for the cutting team only ---------------- */
console.log('2) The cutting team cannot sign him back this season, and every other team can');
for (const f of fixtures) {
  if (!f.team) continue;
  /* On a copy, so a re-sign that wrongly goes through here cannot rewrite
     the fixture section 3 reads: the control for this section must move
     this section and nothing else. */
  const { sport, E, abbr } = f;
  const league = clone(f.league);
  const team = league.teams[abbr];
  for (const p of [f.two, f.one]) {
    const tag = `${abbr} ${p.name}`;
    const reason = cuts.signRefusal(team, p.id);
    ok(2, sport.key, `${tag}: the engine names the refusal`, typeof reason === 'string' && reason.length > 0, `signRefusal returned ${JSON.stringify(reason)}`);
    const roomBefore = E.capRoom(team, BIG);
    const size = team.players.length;
    const signed = E.sign(team, league.freeAgents, p.id, BIG);
    ok(2, sport.key, `${tag}: the sign path refuses the cutting team even with unlimited room`, signed === false && team.players.length === size && !team.players.some(x => x.id === p.id),
      `returned ${signed}, roster ${size} to ${team.players.length}`);
    ok(2, sport.key, `${tag}: he is still in the pool`, league.freeAgents.some(x => x.id === p.id));
    ok(2, sport.key, `${tag}: the room did not move on the refusal`, near(E.capRoom(team, BIG), roomBefore));
  }
  const others = Object.values(league.teams).filter(t => t.abbr !== abbr && t.players.length < sport.ceiling);
  const other = others.sort((a, b) => E.capRoom(b, BIG) - E.capRoom(a, BIG))[0];
  ok(2, sport.key, `${abbr}: some other team has a roster spot for ${f.one.name} (fixture)`, !!other,
    other ? '' : 'every other roster is full, so the rule cannot be shown to be per team');
  if (!other) continue;
  ok(2, sport.key, `${other.abbr}: has no refusal for ${f.two.name}`, cuts.signRefusal(other, f.two.id) === null);
  ok(2, sport.key, `${other.abbr}: has no refusal for ${f.one.name}`, cuts.signRefusal(other, f.one.id) === null);
  const otherRoom = E.capRoom(other, BIG);
  const took = E.sign(other, league.freeAgents, f.one.id, BIG);
  const landed = other.players.find(x => x.id === f.one.id);
  ok(2, sport.key, `${other.abbr}: signs ${f.one.name} the same season`, took === true && !!landed && landed.years === 1,
    `returned ${took}, on roster ${!!landed}`);
  ok(2, sport.key, `${other.abbr}: pays his salary and no dead money`, near(E.capRoom(other, BIG), round1(otherRoom - f.one.salary)) && cuts.deadCapUsed(other) === 0,
    `room ${otherRoom} to ${E.capRoom(other, BIG)}, dead ${cuts.deadCapUsed(other)}`);
  ok(2, sport.key, `${abbr}: still carries ${f.one.name}'s dead money after another team signed him`,
    (team.deadCap ?? []).some(d => d.playerId === f.one.id));
}

/* ---- 3. the offseason rolls the ledger and clears the list --------------- */
console.log('3) The offseason halves a two season entry, drops a one season entry, and clears the cut list');
for (const f of fixtures) {
  if (!f.team) continue;
  const { sport, E, league, team, abbr, rng } = f;
  const before = clone(team.deadCap ?? []);
  const entryTwo = before.find(d => d.playerId === f.two.id);
  const entryOne = before.find(d => d.playerId === f.one.id);
  ok(3, sport.key, `${abbr}: the ledger going in holds both men`, !!entryTwo && !!entryOne && entryTwo.seasonsLeft === 2 && entryOne.seasonsLeft === 1,
    JSON.stringify(before));
  ok(3, sport.key, `${abbr}: the cut list going in holds both men`, [f.two.id, f.one.id].every(id => (team.releasedThisSeason ?? []).includes(id)));
  if (!entryTwo || !entryOne) continue;
  E.offseason(league, rng);
  const after = team.deadCap ?? [];
  const rolled = after.find(d => d.playerId === f.two.id);
  ok(3, sport.key, `${abbr}: ${f.one.name}'s one season charge is gone`, !after.some(d => d.playerId === f.one.id), JSON.stringify(after));
  ok(3, sport.key, `${abbr}: ${f.two.name}'s charge rolled to its second season`, !!rolled && rolled.seasonsLeft === 1,
    rolled ? `seasonsLeft ${rolled.seasonsLeft}` : `no entry, ledger is ${JSON.stringify(after)}`);
  if (rolled) {
    /* relative to what was recorded, on purpose: how much was recorded is
       section 1's claim, and this section only owns the roll */
    ok(3, sport.key, `${abbr}: and it is half of the recorded amount, rounded to 0.1`,
      tenth(rolled.amount) && Math.abs(rolled.amount - entryTwo.amount / 2) <= 0.05 + 1e-9,
      `rolled ${rolled.amount} from ${entryTwo.amount}`);
    ok(3, sport.key, `${abbr}: the number still carries it`, near(cuts.deadCapUsed(team), rolled.amount) && near(E.capUsed(team), round1(team.players.reduce((s, x) => s + x.salary, 0) + rolled.amount)),
      `deadCapUsed ${cuts.deadCapUsed(team)}`);
  }
  ok(3, sport.key, `${abbr}: the ledger holds exactly one entry now`, after.length === 1, `${after.length} entries`);
  const lists = Object.values(league.teams).map(t => (t.releasedThisSeason ?? []).length);
  ok(3, sport.key, 'every team\'s cut list is empty after the offseason', lists.every(n => n === 0), `longest list ${Math.max(...lists)}`);
  ok(3, sport.key, `${abbr}: no refusal for ${f.two.name} next season`, cuts.signRefusal(team, f.two.id) === null);
  const stillPooled = league.freeAgents.some(x => x.id === f.two.id);
  ok(3, sport.key, `${abbr}: ${f.two.name} survived the pool trim (fixture)`, stillPooled,
    'he was trimmed from the pool, so the re-sign below cannot be exercised; the fixture picks the best rated man for this reason');
  const spot = team.players.length < sport.ceiling;
  ok(3, sport.key, `${abbr}: has a roster spot to take him back (fixture)`, spot, `${team.players.length} on the roster against a ceiling of ${sport.ceiling}`);
  if (stillPooled && spot) {
    const room = E.capRoom(team, BIG);
    const back = E.sign(team, league.freeAgents, f.two.id, BIG);
    ok(3, sport.key, `${abbr}: signs ${f.two.name} back the season after cutting him`, back === true && team.players.some(x => x.id === f.two.id),
      `returned ${back}`);
    ok(3, sport.key, `${abbr}: and pays his salary on top of the dead money, not instead of it`,
      near(E.capRoom(team, BIG), round1(room - f.two.salary)) && !!rolled && near(cuts.deadCapUsed(team), rolled.amount),
      `room ${room} to ${E.capRoom(team, BIG)}, dead ${cuts.deadCapUsed(team)}`);
  }
  E.offseason(league, rng);
  ok(3, sport.key, `${abbr}: a second offseason clears the ledger`, (team.deadCap ?? []).length === 0 && cuts.deadCapUsed(team) === 0,
    JSON.stringify(team.deadCap ?? null));
}

/* ---- 4. the exploit replayed end to end ---------------------------------- */
/* The probe's exact sequence on a fresh league per seed per sport, three times
   over on the same man: cut, read the room, sign him back, read it again.
   Before this round it printed 190.4, 214.1, 190.4 for the NFL and a three
   year deal reset to one, and the same shape in the other three. */
console.log('4) The exploit replayed: cut, sign back, cut, sign back, on the same man, on all four sims');
for (const s of SPORTS) {
  const E = api(s);
  for (const [i, seed] of SEEDS.entries()) {
    const rng = lcg(seed + 1);
    const league = seedLedgers(E.init(rng));
    const abbrs = Object.keys(league.teams);
    let abbr = null;
    for (let k = 0; k < abbrs.length && !abbr; k += 1) {
      const a = abbrs[(i * 11 + k) % abbrs.length];
      if (league.teams[a].players.length > s.floor && league.teams[a].players.some(p => p.years >= 2)) abbr = a;
    }
    ok(4, s.key, `seed ${seed}: a team above the floor with a man on years exists (fixture)`, !!abbr);
    if (!abbr) continue;
    const team = league.teams[abbr];
    const target = [...team.players].filter(p => p.years >= 2).sort((a, b) => b.salary - a.salary)[0];
    const before = E.capRoom(team, league.cap);
    const half = round1(target.salary / 2);
    const ceiling = round1(before + target.salary - half);
    let peak = before;
    let cutsMade = 0;
    let signs = 0;
    for (let k = 0; k < 3; k += 1) {
      if (E.release(team, league.freeAgents, target.id)) cutsMade += 1;
      peak = Math.max(peak, E.capRoom(team, league.cap));
      if (E.sign(team, league.freeAgents, target.id, BIG)) signs += 1;
      peak = Math.max(peak, E.capRoom(team, league.cap));
    }
    const entries = (team.deadCap ?? []).filter(d => d.playerId === target.id).length;
    const line = `${s.key} ${abbr} ${target.name} ${target.salary}M x${target.years}: room ${before} before, peak ${peak}, cuts ${cutsMade}, re-signs ${signs}, ledger entries ${entries}, on roster ${team.players.some(p => p.id === target.id)}`;
    if (i === 0) console.log(`   ${line}`);
    ok(4, s.key, `${abbr}: the cut happened once and only once`, cutsMade === 1, line);
    ok(4, s.key, `${abbr}: he never came back`, signs === 0 && !team.players.some(p => p.id === target.id) && league.freeAgents.some(p => p.id === target.id), line);
    ok(4, s.key, `${abbr}: the room never showed a free salary`, near(peak, ceiling) && peak < before + target.salary - 1e-9,
      `${line}; the most the room may reach is ${ceiling}`);
    ok(4, s.key, `${abbr}: one ledger entry, so nothing was charged twice either`, entries === 1, line);
    ok(4, s.key, `${abbr}: the room ends where one honest cut leaves it`, near(E.capRoom(team, league.cap), ceiling), line);
  }
}

/* ---- 5. a league saved before this round --------------------------------- */
/* Neither field exists on a save written before Round 631. The claim is that
   such a save behaves EXACTLY like one carrying empty arrays, so this runs
   the same moves on two twins of one league per sport, one stripped of both
   fields and one with them set to [], under identical rngs, and requires
   every answer to agree. A throw is an answer too, which is how a lost guard
   shows up here. What the rule charges or refuses is sections 1 and 2's
   business; here only the agreement counts. */
console.log('5) A league saved before this round behaves exactly like one carrying empty arrays, on all four sims');
for (const s of SPORTS) {
  const E = api(s);
  const fresh = E.init(lcg(2026));
  const legacy = clone(fresh);
  for (const t of Object.values(legacy.teams)) { delete t.deadCap; delete t.releasedThisSeason; }
  const empty = seedLedgers(clone(fresh));
  const twins = [legacy, empty];
  const abbrs = Object.keys(fresh.teams);
  ok(5, s.key, 'the stripped twin has neither field on any team', abbrs.every(a => !('deadCap' in legacy.teams[a]) && !('releasedThisSeason' in legacy.teams[a])));
  const reads = safe(() => abbrs.every(a => cuts.deadCapUsed(legacy.teams[a]) === 0
    && near(E.capUsed(legacy.teams[a]), round1(legacy.teams[a].players.reduce((sum, p) => sum + p.salary, 0)))));
  ok(5, s.key, 'the stripped twin reads as carrying no dead money', reads === true, String(reads));
  const agree = (label, f) => {
    const [a, b] = twins.map(lg => safe(() => f(lg)));
    ok(5, s.key, label, JSON.stringify(a) === JSON.stringify(b), `stripped ${JSON.stringify(a).slice(0, 90)} against empty ${JSON.stringify(b).slice(0, 90)}`);
  };
  agree('capUsed agrees on every team', lg => abbrs.map(a => E.capUsed(lg.teams[a])));
  agree('signRefusal agrees for every free agent on every team', lg => abbrs.map(a => lg.freeAgents.map(p => cuts.signRefusal(lg.teams[a], p.id))));
  agree('tradeRefusal agrees for every rostered man on every team', lg => abbrs.map(a => abbrs.flatMap(b => lg.teams[b].players.map(p => cuts.tradeRefusal(lg.teams[a], p.id)))));
  /* the fixture is picked off the empty twin: reading the stripped league here
     would put the check under test inside the fixture, outside any agree() */
  const buyer = abbrs.filter(a => empty.teams[a].players.length < s.ceiling).sort((x, y) => E.capRoom(empty.teams[y], BIG) - E.capRoom(empty.teams[x], BIG))[0];
  const cheapest = fresh.freeAgents.slice().sort((x, y) => x.salary - y.salary)[0];
  ok(5, s.key, 'a buyer with a roster spot and a free agent to buy exist (fixture)', !!buyer && !!cheapest);
  if (buyer && cheapest) {
    agree(`${buyer}: signing a free agent agrees`, lg => [E.sign(lg.teams[buyer], lg.freeAgents, cheapest.id, BIG), lg.teams[buyer].players.map(p => p.id)]);
  }
  const cutter = abbrs.find(a => fresh.teams[a].players.length > s.floor && fresh.teams[a].players.some(p => p.years >= 2));
  ok(5, s.key, 'a cutter above the floor with a man on years exists (fixture)', !!cutter);
  if (cutter) {
    const victim = [...fresh.teams[cutter].players].filter(p => p.years >= 2).sort((x, y) => y.salary - x.salary)[0];
    agree(`${cutter}: a cut agrees, ledger and list included`, lg => [
      E.release(lg.teams[cutter], lg.freeAgents, victim.id),
      lg.teams[cutter].deadCap ?? null, lg.teams[cutter].releasedThisSeason ?? null,
      E.capUsed(lg.teams[cutter]), cuts.deadCapUsed(lg.teams[cutter]),
    ]);
    ok(5, s.key, `${cutter}: the cut wrote both fields onto the stripped twin`, Array.isArray(legacy.teams[cutter].deadCap) && Array.isArray(legacy.teams[cutter].releasedThisSeason));
    agree(`${cutter}: the answer on signing him back agrees`, lg => [cuts.signRefusal(lg.teams[cutter], victim.id), E.sign(lg.teams[cutter], lg.freeAgents, victim.id, BIG)]);
  }
  const threw = twins.map(lg => { try { E.offseason(lg, lcg(777)); return null; } catch (e) { return String(e && e.message ? e.message : e).slice(0, 120); } });
  ok(5, s.key, 'an offseason on the stripped twin does not throw', threw[0] === null, threw[0] ?? '');
  ok(5, s.key, 'nor on the empty one', threw[1] === null, threw[1] ?? '');
  if (threw.every(t => t === null)) {
    agree('after the offseason the ledgers and lists agree on every team', lg => abbrs.map(a => [lg.teams[a].deadCap ?? [], lg.teams[a].releasedThisSeason ?? []]));
    agree('and capUsed agrees on every team', lg => abbrs.map(a => E.capUsed(lg.teams[a])));
    agree('and signRefusal agrees for every free agent', lg => abbrs.map(a => lg.freeAgents.map(p => cuts.signRefusal(lg.teams[a], p.id))));
  }
  const bare = safe(() => { cuts.rollDeadCap({ abbr: 'X', players: [] }); return null; });
  ok(5, s.key, 'rollDeadCap on a team with neither field does not throw', bare === null, bare ?? '');
}

/* ---- 6. the boards under vitest ------------------------------------------ */
if (CONTROL && CONTROL !== 'onetap') {
  console.log('6) skipped under this control: vitest reads src, and this control only ever edits a copy in temp');
} else {
  console.log('6) The season close test and the four board cut test, under vitest, every board row by name');
  const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
  const TESTS = [
    'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx',
    'src/components/front-office/FrontOfficeCuts.test.tsx',
  ];
  ok(6, 'boards', 'vitest can be found by walking up from the repo root', !!vitest, 'no node_modules/vitest/vitest.mjs above the repo');
  ok(6, 'boards', 'both test files exist', TESTS.every(t => fs.existsSync(path.join(ROOT, t))), TESTS.filter(t => !fs.existsSync(path.join(ROOT, t))).join(', '));
  const env = {};
  const distDir = path.join(ROOT, 'dist');
  const hadDist = fs.existsSync(distDir);
  const controlDir = path.join(distDir, '.cuts-control');
  if (CONTROL === 'onetap') {
    /* the cut fires on the first tap: the button that should only open the
       confirm calls the release directly */
    const ANCHOR = 'onClick={() => setCutArmed(arming ? null : p.id)}';
    fs.mkdirSync(controlDir, { recursive: true });
    for (const s of SPORTS) {
      const [key, file] = BOARDS[s.key];
      const src = normaliseEol(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      if (src.split(ANCHOR).length !== 2) {
        fs.rmSync(controlDir, { recursive: true, force: true });
        console.error(`control onetap: ${file} does not carry the cut button exactly once, so it cannot be rewritten. Refusing to run.`);
        process.exit(1);
      }
      const copy = path.join(controlDir, `${path.basename(file, '.tsx')}.control.tsx`);
      fs.writeFileSync(copy, rewrite(file, src, [[ANCHOR, 'onClick={() => doRelease(p.id)}']]));
      env[key] = copy.replaceAll('\\', '/');
    }
    console.log('   control onetap: all four boards rendered from copies whose cut fires on the first tap');
  }
  if (vitest) {
    let r;
    try {
      r = spawnSync(process.execPath, [vitest, 'run', ...TESTS, '--reporter=verbose'],
        { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
    } finally {
      if (CONTROL === 'onetap') {
        fs.rmSync(controlDir, { recursive: true, force: true });
        if (!hadDist) fs.rmSync(distDir, { recursive: true, force: true });
      }
    }
    const out = (r.stdout || '') + (r.stderr || '');
    const summary = out.match(/Tests\s+(.+)/);
    const line = summary ? summary[1].trim() : 'no summary line';
    console.log(`   vitest exit ${r.status}, ${line}`);
    if (CONTROL === 'onetap' && /Failed to (load|resolve)|SyntaxError|Cannot find module|Transform failed/.test(out)) {
      console.error('control onetap: a rewritten board did not load, so any red is a load error and not the check:\n' + out.slice(-1500));
      process.exit(1);
    }
    ok(6, 'boards', 'vitest reported on both files', TESTS.every(t => out.includes(path.basename(t))), out.slice(-600));
    ok(6, 'boards', 'vitest exited zero', r.status === 0, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 10).join(' | '));
    ok(6, 'boards', 'the summary line counts passes and no failures', !!summary && /\d+ passed/.test(line) && !/failed/.test(line), line);
    const lines = out.split('\n');
    for (const s of SPORTS) {
      const describe = `${s.key} Front Office: a cut costs dead money on the board`;
      /* the floor row does not tap a cut, so it proves the board rendered */
      for (const row of BOARD_ROWS) {
        if (row.startsWith('at the roster ceiling') && s.ceiling === Infinity) continue;
        const green = lines.some(l => l.includes('✓') && l.includes(describe) && l.includes(row));
        ok(6, s.key, `the ${s.key} board: ${row}`, green, green ? '' : (lines.find(l => l.includes(describe) && l.includes(row)) ?? 'the row did not run'));
      }
    }
  }
}

/* ---- 7. no engine takes a man off a roster on its own -------------------- */
/* Reads the CODE through the TypeScript parser, so a comment of any kind, a
   string or a stray word cannot satisfy it. Engines are discovered by file
   name under src/lib, so a new one is covered the day it appears, and each
   must have an adapter in SPORTS, so it is also measured by sections 1 to 5. */
console.log('7) Every front office engine goes through the helper, read as code, and every one has an adapter here');
const ts = req('typescript');
const isEngineFile = name => /frontoffice\.ts$/i.test(name);
{
  const accept = ['frontOffice.ts', 'mlbFrontOffice.ts', 'x2FrontOffice.ts', 'WnbaFrontOffice.ts', 'cfbFrontOffice.ts'];
  const reject = ['frontOfficeCuts.ts', 'foHub.ts', 'frontOfficePlayers.ts', 'frontOffice.test.ts', 'tradeFinder.ts'];
  ok(7, 'discovery', 'the engine matcher takes any file ending FrontOffice.ts, camelCase or digits in front',
    accept.every(isEngineFile) && !reject.some(isEngineFile),
    `accepted ${accept.filter(isEngineFile).join(', ')}; wrongly took ${reject.filter(isEngineFile).join(', ') || 'none'}`);
}
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
let discovered = walk(LIB).filter(p => isEngineFile(path.basename(p))).map(p => path.relative(LIB, p).split(path.sep).join('/')).sort();
let sources = discovered.map(f => [f, normaliseEol(fs.readFileSync(path.join(LIB, f), 'utf8'))]);
/* the release body the source controls replace, in each engine's own names */
const RELEASE_CALL = /return cutPlayer\((\w+), (\w+), (\w+), (\w+)\);/;
const SOURCE_CONTROLS = {
  nohelper: (t, fa, id) => `const i = ${t}.players.findIndex(p => p.id === ${id}); if (i < 0) return false; const [p] = ${t}.players.splice(i, 1); ${fa}.push({ ...p, years: 1 }); return true;`,
  filtercut: (t, fa, id) => `const p = ${t}.players.find(x => x.id === ${id}); if (!p) return false; ${t}.players = ${t}.players.filter(x => x.id !== ${id}); ${fa}.push({ ...p, years: 1 }); return true;`,
  prosecall: (t, fa, id, floor) => `return true; // return cutPlayer(${t}, ${fa}, ${id}, ${floor});`,
};
if (SOURCE_CONTROLS[CONTROL]) {
  sources = sources.map(([f, src]) => {
    if (!RELEASE_CALL.test(src)) throw new Error(`control ${CONTROL}: no "return cutPlayer(team, pool, id, floor);" line in ${f}, so it would change nothing. Refusing to run.`);
    const out = src.replace(RELEASE_CALL, (m, t, fa, id, floor) => SOURCE_CONTROLS[CONTROL](t, fa, id, floor));
    if (out === src) throw new Error(`control ${CONTROL}: the rewrite of ${f} changed nothing. Refusing to run.`);
    return [f, out];
  });
  console.log({
    nohelper: '   control nohelper: a raw roster splice put back into every engine copy, the helper call gone',
    filtercut: '   control filtercut: every release rewritten as players.filter and a push to the pool',
    prosecall: '   control prosecall: every release does nothing, with its cutPlayer call moved into a trailing comment',
  }[CONTROL]);
}
if (CONTROL === 'fifthengine') {
  const nfl = sources.find(([f]) => f === 'frontOffice.ts');
  if (!nfl) throw new Error('control fifthengine: frontOffice.ts was not discovered, so there is nothing to copy. Refusing to run.');
  sources.push(['xflFrontOffice.ts', nfl[1]]);
  discovered = [...discovered, 'xflFrontOffice.ts'].sort();
  console.log('   control fifthengine: a fifth engine, xflFrontOffice.ts, is discovered with no adapter in this harness');
}
console.log(`   engines discovered: ${discovered.join(', ')}`);
const adapters = SPORTS.map(s => s.file).sort();
ok(7, 'discovery', 'every discovered engine has an adapter, and every adapter an engine',
  JSON.stringify(discovered) === JSON.stringify(adapters),
  `discovered ${discovered.join(', ')}; adapters ${adapters.join(', ')}. A new engine needs an adapter so sections 1 to 5 measure it too.`);

const RELEASE_WORDS = new Set(['release', 'waive', 'cut', 'dfa', 'designate']);
const wordsOf = name => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const callsIn = node => { const out = []; const v = n => { if (ts.isCallExpression(n)) out.push(n); ts.forEachChild(n, v); }; v(node); return out; };
const identCalls = node => new Set(callsIn(node).filter(c => ts.isIdentifier(c.expression)).map(c => c.expression.text));
const isPlayers = e => ts.isPropertyAccessExpression(e) && e.name.text === 'players';
/* a call on a players array: X.players.splice(...), .filter(...), .pop(), .shift() */
const playersCalls = (node, names) => callsIn(node).filter(c => ts.isPropertyAccessExpression(c.expression) && isPlayers(c.expression.expression) && names.includes(c.expression.name.text));
/* X.players = <anything>.filter(...) */
const playersFilterAssigns = node => {
  const out = [];
  const v = n => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && isPlayers(n.left)
      && ts.isCallExpression(n.right) && ts.isPropertyAccessExpression(n.right.expression) && n.right.expression.name.text === 'filter') out.push(n);
    ts.forEachChild(n, v);
  };
  v(node);
  return out;
};
const functionsOf = sf => {
  const out = [];
  const v = n => {
    if (ts.isFunctionDeclaration(n) && n.name) out.push({ name: n.name.text, node: n });
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) out.push({ name: n.name.text, node: n.initializer });
    else if (ts.isMethodDeclaration(n) && n.name && ts.isIdentifier(n.name)) out.push({ name: n.name.text, node: n });
    ts.forEachChild(n, v);
  };
  v(sf);
  return out;
};
for (const [f, text] of sources) {
  const key = SPORTS.find(s => s.file === f)?.key ?? f;
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const importsHelper = sf.statements.some(s => ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && /(^|\/)frontOfficeCuts$/.test(s.moduleSpecifier.text));
  ok(7, key, `${f}: imports the helper`, importsHelper);
  const fileCalls = identCalls(sf);
  for (const fn of ['signRefusal', 'rollDeadCap', 'payrollWithDeadCap']) {
    ok(7, key, `${f}: calls ${fn}`, fileCalls.has(fn), `no ${fn}( call in the code, so its sign, offseason or cap path is not the shared one`);
  }
  const fns = functionsOf(sf);
  const releases = fns.filter(fn => wordsOf(fn.name).some(w => RELEASE_WORDS.has(w)));
  ok(7, key, `${f}: has a release path to check`, releases.length > 0, `no function named release, waive, cut, DFA or designate among ${fns.length}`);
  for (const fn of releases) {
    ok(7, key, `${f} ${fn.name}: calls cutPlayer`, identCalls(fn.node).has('cutPlayer'),
      'a release that does not call cutPlayer frees the whole salary and lets the man straight back');
    const own = playersCalls(fn.node, ['splice', 'filter', 'pop', 'shift']).map(c => c.expression.name.text);
    ok(7, key, `${f} ${fn.name}: splices or filters no players array itself`, own.length === 0,
      `it calls players.${own.join(', players.')} itself`);
  }
  /* anybody else who takes a man off a players array must be a trade path that asks the rule */
  const removers = fns.filter(fn => !releases.includes(fn))
    .map(fn => ({ fn, how: [...playersCalls(fn.node, ['splice', 'pop', 'shift']).map(c => `players.${c.expression.name.text}`), ...playersFilterAssigns(fn.node).map(() => 'players = filter')] }))
    .filter(x => x.how.length > 0);
  for (const { fn, how } of removers) {
    const trade = wordsOf(fn.name).includes('trade');
    ok(7, key, `${f} ${fn.name}: takes men off a roster (${how[0]}) only as a trade that asks tradeRefusal`,
      trade && identCalls(fn.node).has('tradeRefusal'),
      trade ? 'a trade path that never asks tradeRefusal can hand a team back the man it cut' : 'a function outside the trade paths removes a man from a roster, which is a free cut by another name');
  }
}
{
  const helperSf = ts.createSourceFile('frontOfficeCuts.ts', normaliseEol(fs.readFileSync(HELPER, 'utf8')), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  ok(7, 'helper', 'the helper itself is where the one roster splice lives', playersCalls(helperSf, ['splice']).length === 1);
}

/* ---- 8. the hub box agrees with the sign path --------------------------- */
/* Every club in one league per sport cuts its best man, and the hub's Free
   agency box is drawn from the facts the boards hand it. The box may never
   name a man the sign path refuses for anything but money, and may never call
   a man in reach whom it refuses at the real cap. Stated as agreement with
   the engine on purpose: under the resign control the engine takes the man
   back, so the box naming him is true, and this section stays green while
   sections 2 and 4 go red. */
console.log('8) The hub Free agency box never offers a man the sign path refuses, after each club cuts its best man');
const facts = (s, E, team, lg) => ({
  roster: team.players.map(p => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
  freeAgents: lg.freeAgents.map(p => ({ id: p.id, name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
  capRoom: E.capRoom(team, lg.cap),
  ledger: team,
  rosterMax: s.ceiling === Infinity ? undefined : s.ceiling,
  wins: 0, losses: 0, period: 1, periods: 17, playWord: 'Play', periodWord: 'week', hasFixtures: false,
  nextOpponent: null, lastResult: null, place: 1, cut: 7, tableName: 'league', tradeLine: null, titles: 0,
});
const marketOf = f => hub.foHubTiles(f).find(t => t.key === 'market');
const names = (tile, name) => tile.sub.includes(name) || tile.value.includes(name);
for (const s of SPORTS) {
  const E = api(s);
  const league = seedLedgers(E.init(lcg(8080)));
  let cutClubs = 0;
  let atFloor = 0;
  let baseline = 0;
  let namedCut = 0;
  const disagree = [];
  for (const abbr of Object.keys(league.teams)) {
    const lg = clone(league);
    const team = lg.teams[abbr];
    const star = [...team.players].sort((a, b) => b.ovr - a.ovr || b.salary - a.salary)[0];
    if (!E.release(team, lg.freeAgents, star.id)) { atFloor += 1; continue; }
    cutClubs += 1;
    const f = facts(s, E, team, lg);
    const market = marketOf(f);
    if (names(marketOf({ ...f, ledger: undefined }), star.name)) baseline += 1;
    if (names(market, star.name)) namedCut += 1;
    for (const p of lg.freeAgents.filter(x => names(market, x.name))) {
      const anyCap = E.sign(clone(team), clone(lg.freeAgents), p.id, BIG);
      if (!anyCap) disagree.push(`${abbr} names ${p.name}${p.id === star.id ? ', the man it just cut,' : ''} whom the sign path refuses at any cap`);
      if (/fits your room|In reach/.test(market.sub) && !E.sign(clone(team), clone(lg.freeAgents), p.id, lg.cap)) {
        disagree.push(`${abbr} calls ${p.name} in reach but the sign path refuses him at the real cap`);
      }
    }
  }
  console.log(`   ${s.key}: ${cutClubs} clubs cut their best man (${atFloor} at the floor); without the ledger the box names him on ${baseline}, with it on ${namedCut}`);
  ok(8, s.key, 'clubs could cut their best man (fixture)', cutClubs > 0, `${atFloor} clubs sat at the floor`);
  ok(8, s.key, 'without the ledger the box would have named the man just cut (baseline)', baseline > 0,
    `${baseline} of ${cutClubs}: if the unfiltered box never names him, nothing here proves the filter does anything`);
  ok(8, s.key, 'the box never names a man the sign path refuses', disagree.length === 0,
    `${disagree.length} disagreements: ${disagree.slice(0, 3).join('; ')}`);
}

/* ---- 9. no way back by trade either ------------------------------------- */
/* The cutting club cuts its most expensive man with years left, another club
   signs him, and the cutting club tries to trade for him. Both trade paths
   must refuse (invalid, before any value or salary question), the reason
   must be named, the same deal for the next man on that roster must go
   through, and the Trade Finder, which probes the real trade function, must
   never offer him. Unlimited cap throughout, so the refusal is the rule. */
console.log('9) A man cut this season cannot come back by trade after another club signs him, on all four sims');
for (const s of SPORTS) {
  const E = api(s);
  for (const [i, seed] of SEEDS.entries()) {
    const league = seedLedgers(E.init(lcg(seed + 9)));
    const abbrs = Object.keys(league.teams);
    let gm = null;
    for (let k = 0; k < abbrs.length && !gm; k += 1) {
      const a = abbrs[(i * 5 + k) % abbrs.length];
      if (league.teams[a].players.length > s.floor + 1 && league.teams[a].players.some(p => p.years >= 2)) gm = a;
    }
    ok(9, s.key, `seed ${seed}: a club two above the floor with a man on years exists (fixture)`, !!gm);
    if (!gm) continue;
    const mine = league.teams[gm];
    const target = [...mine.players].filter(p => p.years >= 2).sort((a, b) => b.salary - a.salary)[0];
    const cutOk = E.release(mine, league.freeAgents, target.id);
    const other = abbrs.filter(a => a !== gm && league.teams[a].players.length < s.ceiling && league.teams[a].players.length > s.floor)[0];
    const signedOk = !!other && E.sign(league.teams[other], league.freeAgents, target.id, BIG);
    ok(9, s.key, `${gm}: cut ${target.name} and ${other ?? 'nobody'} signed him (fixture)`, cutOk && signedOk, `cut ${cutOk}, signed ${signedOk}`);
    if (!cutOk || !signedOk) continue;
    const piece = [...mine.players].sort((a, b) => b.ovr - a.ovr)[0];
    const alt = [...league.teams[other].players].filter(p => p.id !== target.id).sort((a, b) => b.ovr - a.ovr)[0];
    const reason = cuts.tradeRefusal(mine, target.id);
    ok(9, s.key, `${gm}: the engine names the refusal for ${target.name}`, typeof reason === 'string' && reason.length > 0, JSON.stringify(reason));
    ok(9, s.key, `${gm}: and names none for ${alt.name}`, cuts.tradeRefusal(mine, alt.id) === null);
    const a = clone(league);
    const talks = E.talks(a.teams[gm], a.teams[other], piece.id, target.id, false, BIG);
    ok(9, s.key, `${gm}: the agreed deal path refuses ${target.name}`, talks === 'invalid' && a.teams[other].players.some(p => p.id === target.id),
      `returned ${talks}`);
    const b = clone(league);
    const propose = E.propose(b.teams[gm], b.teams[other], piece.id, target.id, true, BIG);
    ok(9, s.key, `${gm}: the direct trade refuses ${target.name} before any value question`, propose === 'invalid', `returned ${propose}`);
    const c = clone(league);
    const base = E.talks(c.teams[gm], c.teams[other], piece.id, alt.id, false, BIG);
    ok(9, s.key, `${gm}: the same deal for ${alt.name} goes through (baseline)`, base === 'done', `returned ${base}, so the refusal above may not be the rule`);
    const offers = finder.findTrades(clone(league).teams, gm, piece.id, BIG, api(s).proposeFn, api(s).valueFn, { maxOffers: 50 });
    ok(9, s.key, `${gm}: the Trade Finder never offers ${target.name}`, !offers.some(o => o.playerId === target.id),
      `${offers.length} offers, one of them for the man ${gm} cut`);
  }
}

/* ---- report --------------------------------------------------------------- */
if (checks === 0) {
  console.error('FAIL: NOTHING WAS CHECKED');
  process.exit(1);
}
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  const reds = redSports.get(n);
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED on ${[...reds].join(', ')}` : ''}`);
}
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT[CONTROL].sections;
  const wantSports = EXPECT[CONTROL].sports ?? SPORTS.map(s => s.key);
  for (const f of fails.slice(0, 6)) console.log('   red: ' + f);
  const everySport = want.every(n => wantSports.every(k => (redSports.get(n) ?? new Set()).has(k)));
  const where = wantSports.length === SPORTS.length ? 'on all four sims' : `on ${wantSports.join(', ')}`;
  if (red.join(',') === want.join(',') && everySport) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red ${where} as expected (${fails.length} failures) and nothing else moved, the check works`);
    process.exit(0);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red ${where}, got ${red.length ? red.join(' and ') : 'nothing'}`
    + ` (${want.map(n => `${n}: ${[...(redSports.get(n) ?? [])].join('/') || 'none'}`).join('; ')}), so the check is dead somewhere or bleeds`);
  process.exit(1);
}
if (fails.length) {
  console.error(`simFrontOfficeCuts: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simFrontOfficeCuts: ${checks} checks passed over ${SPORTS.length} sims and ${SEEDS.length} seeded leagues each. A cut costs dead money, the man waits a season by any door, the hub and the boards say so, and no engine cuts on its own.`);
