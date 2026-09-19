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
   cutting team cannot sign him back until the offseason, and each sport's
   offseason rolls the ledger and clears the list for every team. Both fields
   are optional on the save. MLB has no cap: the number is its luxury tax line,
   which is what mlbSign checks.

   Every section below runs the REAL engines, bundled with esbuild, over
   several seeded leagues per sport. Nothing here reads dist or the clock.

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
        offseason under the same rng
     6) the season close test and the four board cut test still pass under
        vitest
     7) the source guard: every front office engine in src/lib takes a man off
        a roster only through the helper. No engine may contain a roster
        splice of its own, and each must call cutPlayer, signRefusal,
        rollDeadCap and payrollWithDeadCap. The engines are DISCOVERED by file
        name, not listed, so a fifth engine cannot ship the exploit quietly.

   Controls, through FO_CUTS_CONTROL. The first three edit a COPY of the
   helper in OS temp and point every engine's import at it; the fourth edits
   copies of the four engines. None touches src. Each refuses to run if its
   anchor is not in the file, and each must turn exactly its own sections red,
   on every sport:
     FO_CUTS_CONTROL=freecut      dead money driven to zero      -> 1 and 4 red
     FO_CUTS_CONTROL=resign       the same season re-sign allowed -> 2 and 4 red
     FO_CUTS_CONTROL=norollover   the offseason never rolls       -> 3 red
     FO_CUTS_CONTROL=nohelper     a raw roster splice put back in every engine copy -> 7 red
   Section 4 is the probe replayed, and the probe's outcome rests on both
   halves of the rule, so it goes red under either half's control by design.
   The run asserts the exact set, per sport, and fails if anything else moves.
   Section 6 is skipped under a control because vitest reads src, which a
   control never touches.

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
const CONTROL = process.env.FO_CUTS_CONTROL || '';
const KNOWN = ['freecut', 'resign', 'norollover', 'nohelper'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`FO_CUTS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}
const EXPECT_RED = { freecut: [1, 4], resign: [2, 4], norollover: [3], nohelper: [7] };

const SECTION_NAMES = {
  1: 'a cut charges dead money',
  2: 'no way back this season, for the cutting team only',
  3: 'the offseason rolls the ledger and clears the list',
  4: 'the exploit replayed end to end',
  5: 'a league saved before this round, against its twin',
  6: 'the boards under vitest',
  7: 'no engine takes a man off a roster on its own',
};

/* The four sims, the way FrontOfficeSeasonClose.test.tsx tables them. floor
   and max are each sport's own roster rules, read off its release and sign. */
const SPORTS = [
  { key: 'NFL', file: 'frontOffice.ts', init: 'initLeague', release: 'releasePlayer', sign: 'signPlayer', capUsed: 'capUsed', capRoom: 'capRoom', offseason: 'runOffseason', floor: 6, max: Infinity },
  { key: 'NBA', file: 'nbaFrontOffice.ts', init: 'initNbaLeague', release: 'nbaRelease', sign: 'nbaSign', capUsed: 'nbaCapUsed', capRoom: 'nbaCapRoom', offseason: 'nbaOffseason', floor: 8, max: 15 },
  { key: 'MLB', file: 'mlbFrontOffice.ts', init: 'initMlbLeague', release: 'mlbRelease', sign: 'mlbSign', capUsed: 'mlbCapUsed', capRoom: 'mlbCapRoom', offseason: 'mlbOffseason', floor: 9, max: 16 },
  { key: 'NHL', file: 'nhlFrontOffice.ts', init: 'initNhlLeague', release: 'nhlRelease', sign: 'nhlSign', capUsed: 'nhlCapUsed', capRoom: 'nhlCapRoom', offseason: 'nhlOffseason', floor: 8, max: 15 },
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
/* A cap no roster can fill. Every sign call in sections 2 to 5 uses it, so a
   refusal there is the rule and never the room: the NBA ships most clubs over
   the cap, and a check that never gets past the room proves nothing. Section
   1 reads the room under the real cap, because that is the arithmetic. */
const BIG = 1e6;

/* Line endings are not a fact about the code: the anchors are written LF and
   a Windows checkout carries CRLF, so every source is normalised before any
   anchor is looked for. */
const normaliseEol = t => t.split('\r\n').join('\n');
/* esbuild and vitest resolve by walk-up from the repo root, so a worktree
   inside the repo, which has no node_modules of its own, still finds them. */
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

/* ---- the engines and the helper, bundled ---------------------------------- */
/* The helper controls rewrite a copy of frontOfficeCuts.ts and an esbuild
   plugin points every import of it, from every engine, at that copy. */
const HELPER_SWAPS = {
  freecut: [['  const now = round1(p.salary * 0.5);', '  const now = 0;']],
  resign: [['  if ((team.releasedThisSeason ?? []).includes(playerId)) return', '  if (false) return']],
  norollover: [['export function rollDeadCap(team: CutLedger): void {', 'export function rollDeadCap(team: CutLedger): void {\n  if (team) return;']],
};
const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-focuts-'));
const engines = {};
let cuts = null;
try {
  let helperPath = HELPER;
  if (HELPER_SWAPS[CONTROL]) {
    const src = normaliseEol(fs.readFileSync(HELPER, 'utf8'));
    for (const [now] of HELPER_SWAPS[CONTROL]) {
      if (!src.includes(now)) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} is not in frontOfficeCuts.ts, so it would change nothing. Refusing to run.`);
    }
    let rewritten = src;
    for (const [now, was] of HELPER_SWAPS[CONTROL]) rewritten = rewritten.split(now).join(was);
    if (rewritten === src) throw new Error(`control ${CONTROL}: the rewrite changed nothing. Refusing to run.`);
    helperPath = path.join(BUNDLE_DIR, 'frontOfficeCuts.ts');
    fs.writeFileSync(helperPath, rewritten);
    console.log({
      freecut: '   control freecut: dead money driven to zero in a copy of the helper, a cut frees the whole salary again',
      resign: '   control resign: the helper copy takes a man back the season he was cut',
      norollover: '   control norollover: the helper copy never rolls the ledger or clears the list',
    }[CONTROL]);
  }
  const redirect = {
    name: 'dukb-helper-copy',
    setup(b) { b.onResolve({ filter: /frontOfficeCuts(\.ts)?$/ }, () => ({ path: helperPath })); },
  };
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  const lines = SPORTS.map(s => `export * as ${s.key} from ${JSON.stringify(path.join(LIB, s.file).replaceAll('\\', '/'))};`);
  lines.push(`export * as cuts from ${JSON.stringify(HELPER.replaceAll('\\', '/'))};`);
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
} catch (e) {
  console.error(`FAIL: the engines could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 220)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
for (const s of SPORTS) {
  for (const fn of ['init', 'release', 'sign', 'capUsed', 'capRoom', 'offseason']) {
    if (typeof engines[s.key][s[fn]] !== 'function') {
      console.error(`FAIL: ${s.file} does not export ${s[fn]}, so the ${s.key} adapter is wrong and nothing below can be trusted`);
      process.exit(1);
    }
  }
}
for (const fn of ['deadMoneyFor', 'deadCapUsed', 'signRefusal', 'rollDeadCap', 'payrollWithDeadCap']) {
  if (typeof cuts[fn] !== 'function') { console.error(`FAIL: frontOfficeCuts.ts does not export ${fn}`); process.exit(1); }
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
    const league = E.init(rng);
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
  const others = Object.values(league.teams).filter(t => t.abbr !== abbr && t.players.length < sport.max);
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
  const spot = team.players.length < sport.max;
  ok(3, sport.key, `${abbr}: has a roster spot to take him back (fixture)`, spot, `${team.players.length} on the roster against a ceiling of ${sport.max}`);
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
    const league = E.init(rng);
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
   every answer to agree. What the rule charges or refuses is sections 1 and
   2's business; here only the agreement counts, so a control on those
   sections moves nothing in this one. */
console.log('5) A league saved before this round behaves exactly like one carrying empty arrays, on all four sims');
for (const s of SPORTS) {
  const E = api(s);
  const fresh = E.init(lcg(2026));
  const legacy = clone(fresh);
  for (const t of Object.values(legacy.teams)) { delete t.deadCap; delete t.releasedThisSeason; }
  const empty = clone(fresh);
  for (const t of Object.values(empty.teams)) { t.deadCap = []; t.releasedThisSeason = []; }
  const twins = [legacy, empty];
  const abbrs = Object.keys(fresh.teams);
  ok(5, s.key, 'the stripped twin has neither field on any team', abbrs.every(a => !('deadCap' in legacy.teams[a]) && !('releasedThisSeason' in legacy.teams[a])));
  ok(5, s.key, 'the stripped twin reads as carrying no dead money', abbrs.every(a => cuts.deadCapUsed(legacy.teams[a]) === 0
    && near(E.capUsed(legacy.teams[a]), round1(legacy.teams[a].players.reduce((sum, p) => sum + p.salary, 0)))));
  const agree = (label, f) => {
    const [a, b] = twins.map(f);
    ok(5, s.key, label, JSON.stringify(a) === JSON.stringify(b), `stripped ${JSON.stringify(a).slice(0, 90)} against empty ${JSON.stringify(b).slice(0, 90)}`);
  };
  agree('capUsed agrees on every team', lg => abbrs.map(a => E.capUsed(lg.teams[a])));
  agree('signRefusal agrees for every free agent on every team', lg => abbrs.map(a => lg.freeAgents.map(p => cuts.signRefusal(lg.teams[a], p.id))));
  const buyer = abbrs.filter(a => fresh.teams[a].players.length < s.max).sort((x, y) => E.capRoom(fresh.teams[y], BIG) - E.capRoom(fresh.teams[x], BIG))[0];
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
}
{
  let bare = null;
  try { cuts.rollDeadCap({ abbr: 'X', players: [] }); } catch (e) { bare = String(e && e.message ? e.message : e).slice(0, 120); }
  ok(5, 'helper', 'rollDeadCap on a team with neither field does not throw', bare === null, bare ?? '');
}

/* ---- 6. the boards under vitest ------------------------------------------ */
if (CONTROL) {
  console.log('6) skipped under a control: vitest reads src, and a control only ever edits a copy in temp');
} else {
  console.log('6) The season close test and the four board cut test, under vitest');
  const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
  const TESTS = [
    'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx',
    'src/components/front-office/FrontOfficeCuts.test.tsx',
  ];
  ok(6, 'boards', 'vitest can be found by walking up from the repo root', !!vitest, 'no node_modules/vitest/vitest.mjs above the repo');
  ok(6, 'boards', 'both test files exist', TESTS.every(t => fs.existsSync(path.join(ROOT, t))), TESTS.filter(t => !fs.existsSync(path.join(ROOT, t))).join(', '));
  if (vitest) {
    const r = spawnSync(process.execPath, [vitest, 'run', ...TESTS, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
    const out = (r.stdout || '') + (r.stderr || '');
    const summary = out.match(/Tests\s+(.+)/);
    const line = summary ? summary[1].trim() : 'no summary line';
    console.log(`   vitest exit ${r.status}, ${line}`);
    ok(6, 'boards', 'vitest reported on both files', TESTS.every(t => out.includes(path.basename(t))), out.slice(-600));
    ok(6, 'boards', 'vitest exited zero', r.status === 0, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 10).join(' | '));
    ok(6, 'boards', 'the summary line counts passes and no failures', !!summary && /\d+ passed/.test(line) && !/failed/.test(line), line);
    for (const s of SPORTS) {
      const rows = out.split('\n').filter(l => new RegExp(`✓.*${s.key} Front Office: a cut costs dead money on the board`).test(l)).length;
      ok(6, s.key, `the ${s.key} board's cut rows are green`, rows >= 2, `${rows} green rows`);
    }
  }
}

/* ---- 7. no engine takes a man off a roster on its own -------------------- */
/* Reads the CODE, comments stripped, of every front office engine in src/lib,
   discovered by file name so a new one is covered the day it appears. The
   helper is the only file allowed to splice a roster, and every engine has to
   call all four helper entry points, or its cut path is not the shared one. */
console.log('7) Every front office engine in src/lib goes through the helper, and none splices a roster on its own');
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const discovered = fs.readdirSync(LIB).filter(f => /^(frontOffice|[a-z]+FrontOffice)\.ts$/.test(f) && f !== 'frontOfficeCuts.ts').sort();
ok(7, 'discovery', 'the four known engines are discovered by name', SPORTS.every(s => discovered.includes(s.file)),
  `found ${discovered.join(', ')}`);
console.log(`   engines discovered: ${discovered.join(', ')}`);
let sources = discovered.map(f => [f, normaliseEol(fs.readFileSync(path.join(LIB, f), 'utf8'))]);
if (CONTROL === 'nohelper') {
  /* the pre 631 body put back into every engine copy, with the engine's own
     argument names, so the copy is exactly what shipped before this round */
  const RAW = /return cutPlayer\((\w+), (\w+), (\w+), \d+\);/;
  sources = sources.map(([f, src]) => {
    if (!RAW.test(src)) throw new Error(`control nohelper: no "return cutPlayer(team, pool, id, floor);" line in ${f}, so it would change nothing. Refusing to run.`);
    const rewritten = src.replace(RAW, (m, t, fa, id) =>
      `const i = ${t}.players.findIndex(p => p.id === ${id}); if (i < 0) return false; const [p] = ${t}.players.splice(i, 1); ${fa}.push({ ...p, years: 1 }); return true;`);
    if (rewritten === src) throw new Error(`control nohelper: the rewrite of ${f} changed nothing. Refusing to run.`);
    return [f, rewritten];
  });
  console.log('   control nohelper: a raw roster splice put back into a temp copy of every engine, the helper call gone');
}
const REQUIRED = ['cutPlayer(', 'signRefusal(', 'rollDeadCap(', 'payrollWithDeadCap('];
for (const [f, raw] of sources) {
  const code = stripComments(raw);
  const key = SPORTS.find(s => s.file === f)?.key ?? f;
  ok(7, key, `${f}: contains no roster splice of its own`, !/players\.splice\(/.test(code),
    'a "players.splice(" outside the helper is a release path that can free a whole salary');
  ok(7, key, `${f}: imports the helper`, /from '\.\/frontOfficeCuts'/.test(code));
  for (const call of REQUIRED) {
    ok(7, key, `${f}: calls ${call.slice(0, -1)}`, code.includes(call), `no ${call} in the code, so its cut, sign, offseason or cap path is not the shared one`);
  }
}
{
  const helperCode = stripComments(normaliseEol(fs.readFileSync(HELPER, 'utf8')));
  ok(7, 'helper', 'the helper itself is where the one roster splice lives', (helperCode.match(/players\.splice\(/g) ?? []).length === 1);
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
  const want = EXPECT_RED[CONTROL];
  for (const f of fails.slice(0, 6)) console.log('   red: ' + f);
  const everySport = want.every(n => SPORTS.every(s => (redSports.get(n) ?? new Set()).has(s.key)));
  if (red.join(',') === want.join(',') && everySport) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red on all four sims as expected (${fails.length} failures) and nothing else moved, the check works`);
    process.exit(0);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red on every sim, got ${red.length ? red.join(' and ') : 'nothing'}`
    + ` (${want.map(n => `${n}: ${[...(redSports.get(n) ?? [])].join('/') || 'none'}`).join('; ')}), so the check is dead somewhere or bleeds`);
  process.exit(1);
}
if (fails.length) {
  console.error(`simFrontOfficeCuts: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 24)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simFrontOfficeCuts: ${checks} checks passed over ${SPORTS.length} sims and ${SEEDS.length} seeded leagues each. A cut costs dead money, the man waits a season, the offseason rolls it, and no engine cuts on its own.`);
