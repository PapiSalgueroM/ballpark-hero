/* The front office cuts fence. Round 631.

   THE DEFECT. In NFL Front Office, releasePlayer freed a man's whole salary in
   one move and the man landed in the pool where signPlayer would take him
   straight back on a one year deal. So a cut was full cap relief for nothing
   and a cut plus re-sign was a free contract reset. Measured on the shipped
   engine before the fix: Trey McBride, 23.7M with three years left, cap room
   190.4 to 214.1 on the cut and back to 190.4 on the re-sign, his deal now
   one year, no dead money anywhere on the save.

   THE RULE, in src/lib/frontOffice.ts above releasePlayer: half his salary
   stays on this season's cap as dead money (rounded to 0.1), a quarter lands
   on next season's if he had years left, capUsed adds it, the cutting team
   cannot sign him back until the offseason, and runOffseason rolls the ledger
   and clears the list for every team. Both fields are optional on the save.

   Every section below runs the REAL engine, bundled with esbuild, over
   several seeded leagues. Nothing here reads dist or the clock.

     1) a cut charges dead money: exact arithmetic on the entry, on capUsed
        and on the cap room, which rises by less than the salary and by more
        than zero
     2) the cut man cannot be signed back that season by the cutting team,
        and every other team can still sign him
     3) the offseason rolls the second year charge to a quarter, drops a one
        year charge, clears releasedThisSeason, and the cutting team can then
        sign him back; a second offseason clears the rest
     4) the exploit replayed end to end, the probe's exact sequence: cut, read
        the room, try to sign him back, read it again, and again, on the same
        man. He never comes back and the room never shows a free salary.
     5) a league saved before this round, with neither field, behaves exactly
        like a twin carrying empty arrays through the same signing, cut and
        offseason under the same rng
     6) the season close test on the real board (FrontOfficeSeasonClose) and
        the cut board test (FrontOfficeCuts) still pass under vitest

   Controls, through FO_CUTS_CONTROL. Each one edits a COPY of the engine in
   OS temp, never src, refuses to run if its anchor is not in the file, and
   must turn its own section red:
     FO_CUTS_CONTROL=freecut      dead money driven to zero      -> 1 and 4 red
     FO_CUTS_CONTROL=resign       the same season re-sign allowed -> 2 and 4 red
     FO_CUTS_CONTROL=norollover   the offseason never rolls       -> 3 red
   Section 4 is the probe replayed, and the probe's outcome rests on both
   halves of the rule, so it goes red under either half's control by design.
   The run asserts the exact set and fails if any other section moves.
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
const CONTROL = process.env.FO_CUTS_CONTROL || '';
const KNOWN = ['freecut', 'resign', 'norollover'];
if (CONTROL && !KNOWN.includes(CONTROL)) {
  console.error(`FO_CUTS_CONTROL=${CONTROL} is not a control this harness knows (${KNOWN.join(', ')})`);
  process.exit(1);
}
const EXPECT_RED = { freecut: [1, 4], resign: [2, 4], norollover: [3] };

const SECTION_NAMES = {
  1: 'a cut charges dead money',
  2: 'no way back this season, for the cutting team only',
  3: 'the offseason rolls the ledger and clears the list',
  4: 'the exploit replayed end to end',
  5: 'a league saved before this round, against its twin',
  6: 'the boards under vitest',
};
let checks = 0;
const fails = [];
const bySection = new Map();
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) s.bad += 1;
  bySection.set(section, s);
  if (!pass) fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`);
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const tenth = n => near(n * 10, Math.round(n * 10), 1e-6);
const round1 = n => Math.round(n * 10) / 10;

/* ---- the engine, bundled from a copy so a control can edit it ------------ */
/* Line endings are not a fact about the code: the anchors are written LF and
   a Windows checkout carries CRLF, so the source is normalised before any
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

const SWAPS = {
  freecut: [['  const now = round1(p.salary * 0.5);', '  const now = 0;']],
  resign: [['  if ((team.releasedThisSeason ?? []).includes(playerId)) return', '  if (false) return']],
  norollover: [['    rollDeadCap(t);\n', '']],
};

const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-focuts-'));
let engine = null;
try {
  const enginePath = path.join(ROOT, 'src', 'lib', 'frontOffice.ts');
  let importPath = enginePath.replaceAll('\\', '/');
  if (CONTROL) {
    const engineSrc = normaliseEol(fs.readFileSync(enginePath, 'utf8'));
    for (const [now] of SWAPS[CONTROL]) {
      if (!engineSrc.includes(now)) {
        throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} is not in frontOffice.ts, so it would change nothing. Refusing to run.`);
      }
    }
    let rewritten = engineSrc;
    for (const [now, was] of SWAPS[CONTROL]) rewritten = rewritten.split(now).join(was);
    if (rewritten === engineSrc) throw new Error(`control ${CONTROL}: the rewrite changed nothing. Refusing to run.`);
    /* the copy sits outside src, so its relative siblings are repointed at the
       real directory or esbuild cannot find them */
    const libDir = path.join(ROOT, 'src', 'lib').split('\\').join('/');
    rewritten = rewritten.replace(/from '\.\/([A-Za-z0-9_-]+)'/g, `from '${libDir}/$1'`);
    const patched = path.join(BUNDLE_DIR, 'frontOfficeControl.ts');
    fs.writeFileSync(patched, rewritten);
    importPath = patched.replaceAll('\\', '/');
    console.log({
      freecut: '   control freecut: dead money driven to zero, a cut frees the whole salary again',
      resign: '   control resign: signPlayer takes a man back the season he was cut',
      norollover: '   control norollover: the offseason never rolls the ledger or clears the list',
    }[CONTROL]);
  }
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  fs.writeFileSync(entry, `export * from ${JSON.stringify(importPath)};\n`);
  const out = path.join(BUNDLE_DIR, 'engine.mjs');
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  await esbuild.build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, outfile: out, logLevel: 'error',
  });
  engine = await import(pathToFileURL(out).href);
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 200)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}

const SEEDS = [20260919, 631, 7, 4242, 98765];
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const clone = v => JSON.parse(JSON.stringify(v));

/* One league per seed, the GM's team varying with the seed, and the two men
   the sections cut: the best rated man with years left (he has to survive the
   pool trim at the offseason, which keeps the forty best) and the best rated
   man on his last year. */
const fixtures = SEEDS.map((seed, i) => {
  const rng = lcg(seed);
  const league = engine.initLeague(rng);
  const abbr = Object.keys(league.teams)[(i * 7) % Object.keys(league.teams).length];
  const team = league.teams[abbr];
  const two = [...team.players].filter(p => p.years >= 2).sort((a, b) => b.ovr - a.ovr || b.salary - a.salary)[0];
  const one = [...team.players].filter(p => p.years === 1).sort((a, b) => b.ovr - a.ovr || b.salary - a.salary)[0];
  return { seed, rng, league, abbr, team, two, one };
});

/* ---- 1. a cut charges dead money ---------------------------------------- */
console.log('1) A cut charges dead money: half now, a quarter next season if he had years left');
for (const f of fixtures) {
  const { league, team, abbr } = f;
  ok(1, `${abbr}: the fixture has a man with years left and a man on his last year`, !!f.two && !!f.one,
    `years left ${f.two ? 'found' : 'missing'}, last year ${f.one ? 'found' : 'missing'}`);
  if (!f.two || !f.one) continue;
  for (const p of [f.two, f.one]) {
    const salaries = () => round1(team.players.reduce((s, x) => s + x.salary, 0));
    const roomBefore = engine.capRoom(team, league.cap);
    const usedBefore = engine.capUsed(team);
    const deadBefore = engine.deadCapUsed(team);
    const quote = engine.deadMoneyFor(p);
    const done = engine.releasePlayer(team, league.freeAgents, p.id);
    const roomAfter = engine.capRoom(team, league.cap);
    const entry = (team.deadCap ?? []).find(d => d.playerId === p.id);
    const pooled = league.freeAgents.find(x => x.id === p.id);
    const tag = `${abbr} ${p.name} ${p.salary}M x${p.years}`;
    ok(1, `${tag}: the cut went through`, done === true && !team.players.some(x => x.id === p.id));
    ok(1, `${tag}: he joins the pool on one year`, !!pooled && pooled.years === 1, pooled ? `years ${pooled.years}` : 'not in the pool');
    ok(1, `${tag}: the ledger holds an entry for him`, !!entry && entry.name === p.name,
      entry ? '' : `deadCap is ${JSON.stringify(team.deadCap ?? null)}`);
    if (!entry) continue;
    ok(1, `${tag}: this season carries half his salary, rounded to 0.1`,
      entry.amount > 0 && tenth(entry.amount) && Math.abs(entry.amount - p.salary / 2) <= 0.05 + 1e-9,
      `entry ${entry.amount}, half is ${p.salary / 2}`);
    ok(1, `${tag}: the entry runs ${p.years > 1 ? 'two seasons' : 'one season'}`, entry.seasonsLeft === (p.years > 1 ? 2 : 1),
      `seasonsLeft ${entry.seasonsLeft}`);
    ok(1, `${tag}: the quote the button shows is the charge the engine made`, near(quote.now, entry.amount),
      `quote ${quote.now}, charged ${entry.amount}`);
    ok(1, `${tag}: the quoted second year is ${p.years > 1 ? 'a quarter' : 'nothing'}`,
      p.years > 1 ? (quote.next > 0 && tenth(quote.next) && Math.abs(quote.next - entry.amount / 2) <= 0.05 + 1e-9) : quote.next === 0,
      `next ${quote.next}`);
    ok(1, `${tag}: deadCapUsed is the sum of the ledger`, near(engine.deadCapUsed(team), round1(deadBefore + entry.amount)),
      `deadCapUsed ${engine.deadCapUsed(team)}, expected ${round1(deadBefore + entry.amount)}`);
    ok(1, `${tag}: capUsed is salaries plus dead money`, near(engine.capUsed(team), round1(salaries() + engine.deadCapUsed(team))),
      `capUsed ${engine.capUsed(team)}, salaries ${salaries()}, dead ${engine.deadCapUsed(team)}`);
    const relief = round1(roomAfter - roomBefore);
    ok(1, `${tag}: the room rises by less than his salary and by more than zero`, relief > 0 && relief < p.salary,
      `room ${roomBefore} to ${roomAfter}, relief ${relief} against a salary of ${p.salary}`);
    ok(1, `${tag}: the relief is exactly his salary less the dead money`, near(roomAfter, round1(roomBefore + p.salary - entry.amount)),
      `room ${roomAfter}, expected ${round1(roomBefore + p.salary - entry.amount)} (used before ${usedBefore})`);
  }
}

/* ---- 2. no way back this season, for the cutting team only ---------------- */
console.log('2) The cutting team cannot sign him back this season, and every other team can');
for (const f of fixtures) {
  if (!f.two || !f.one) continue;
  /* On a copy, so a re-sign that wrongly goes through here cannot rewrite
     the fixture section 3 reads: the control for this section must move
     this section and nothing else. */
  const { abbr } = f;
  const league = clone(f.league);
  const team = league.teams[abbr];
  for (const p of [f.two, f.one]) {
    const tag = `${abbr} ${p.name}`;
    const reason = engine.signRefusal(team, p.id);
    ok(2, `${tag}: the engine names the refusal`, typeof reason === 'string' && reason.length > 0, `signRefusal returned ${JSON.stringify(reason)}`);
    const roomBefore = engine.capRoom(team, league.cap);
    const size = team.players.length;
    const signed = engine.signPlayer(team, league.freeAgents, p.id, league.cap);
    ok(2, `${tag}: signPlayer refuses the cutting team`, signed === false && team.players.length === size && !team.players.some(x => x.id === p.id),
      `returned ${signed}, roster ${size} to ${team.players.length}`);
    ok(2, `${tag}: he is still in the pool`, league.freeAgents.some(x => x.id === p.id));
    ok(2, `${tag}: the room did not move on the refusal`, near(engine.capRoom(team, league.cap), roomBefore));
  }
  /* another team takes the man on his last year; the man with years left is
     kept in the pool for section 3, but the other team's answer is read for
     him too */
  const others = Object.values(league.teams).filter(t => t.abbr !== abbr);
  const other = others.filter(t => engine.capRoom(t, league.cap) >= f.one.salary).sort((a, b) => engine.capRoom(b, league.cap) - engine.capRoom(a, league.cap))[0];
  ok(2, `${abbr}: some other team has the room to sign ${f.one.name}`, !!other,
    other ? '' : `nobody has ${f.one.salary}M of room, so the fixture cannot prove the rule is per team`);
  if (!other) continue;
  ok(2, `${other.abbr}: has no refusal for ${f.two.name}`, engine.signRefusal(other, f.two.id) === null);
  ok(2, `${other.abbr}: has no refusal for ${f.one.name}`, engine.signRefusal(other, f.one.id) === null);
  const otherRoom = engine.capRoom(other, league.cap);
  const took = engine.signPlayer(other, league.freeAgents, f.one.id, league.cap);
  const landed = other.players.find(x => x.id === f.one.id);
  ok(2, `${other.abbr}: signs ${f.one.name} the same season`, took === true && !!landed && landed.years === 1,
    `returned ${took}, on roster ${!!landed}`);
  ok(2, `${other.abbr}: pays his salary and no dead money`, near(engine.capRoom(other, league.cap), round1(otherRoom - f.one.salary)) && engine.deadCapUsed(other) === 0,
    `room ${otherRoom} to ${engine.capRoom(other, league.cap)}, dead ${engine.deadCapUsed(other)}`);
  ok(2, `${abbr}: still carries ${f.one.name}'s dead money after another team signed him`,
    (team.deadCap ?? []).some(d => d.playerId === f.one.id));
}

/* ---- 3. the offseason rolls the ledger and clears the list --------------- */
console.log('3) The offseason halves a two season entry, drops a one season entry, and clears the cut list');
for (const f of fixtures) {
  if (!f.two || !f.one) continue;
  const { league, team, abbr, rng } = f;
  const before = clone(team.deadCap ?? []);
  const entryTwo = before.find(d => d.playerId === f.two.id);
  const entryOne = before.find(d => d.playerId === f.one.id);
  ok(3, `${abbr}: the ledger going in holds both men`, !!entryTwo && !!entryOne && entryTwo.seasonsLeft === 2 && entryOne.seasonsLeft === 1,
    JSON.stringify(before));
  ok(3, `${abbr}: the cut list going in holds both men`, [f.two.id, f.one.id].every(id => (team.releasedThisSeason ?? []).includes(id)));
  if (!entryTwo || !entryOne) continue;
  engine.runOffseason(league, rng);
  const after = team.deadCap ?? [];
  const rolled = after.find(d => d.playerId === f.two.id);
  ok(3, `${abbr}: ${f.one.name}'s one season charge is gone`, !after.some(d => d.playerId === f.one.id), JSON.stringify(after));
  ok(3, `${abbr}: ${f.two.name}'s charge rolled to its second season`, !!rolled && rolled.seasonsLeft === 1,
    rolled ? `seasonsLeft ${rolled.seasonsLeft}` : `no entry, ledger is ${JSON.stringify(after)}`);
  if (rolled) {
    /* relative to what was recorded, on purpose: how much was recorded is
       section 1's claim, and this section only owns the roll */
    ok(3, `${abbr}: and it is half of the recorded amount, rounded to 0.1`,
      tenth(rolled.amount) && Math.abs(rolled.amount - entryTwo.amount / 2) <= 0.05 + 1e-9,
      `rolled ${rolled.amount} from ${entryTwo.amount}`);
    ok(3, `${abbr}: the cap still carries it`, near(engine.deadCapUsed(team), rolled.amount) && near(engine.capUsed(team), round1(team.players.reduce((s, x) => s + x.salary, 0) + rolled.amount)),
      `deadCapUsed ${engine.deadCapUsed(team)}`);
  }
  ok(3, `${abbr}: the ledger holds exactly one entry now`, after.length === 1, `${after.length} entries`);
  const lists = Object.values(league.teams).map(t => (t.releasedThisSeason ?? []).length);
  ok(3, 'every team\'s cut list is empty after the offseason', lists.every(n => n === 0), `longest list ${Math.max(...lists)}`);
  ok(3, `${abbr}: no refusal for ${f.two.name} next season`, engine.signRefusal(team, f.two.id) === null);
  const stillPooled = league.freeAgents.some(x => x.id === f.two.id);
  ok(3, `${abbr}: ${f.two.name} survived the pool trim (fixture)`, stillPooled,
    'he was trimmed from the pool, so the re-sign below cannot be exercised; pick a better rated man');
  if (stillPooled) {
    const room = engine.capRoom(team, league.cap);
    ok(3, `${abbr}: has the room to take him back (fixture)`, room >= f.two.salary, `room ${room}, wants ${f.two.salary}`);
    if (room >= f.two.salary) {
      const back = engine.signPlayer(team, league.freeAgents, f.two.id, league.cap);
      ok(3, `${abbr}: signs ${f.two.name} back the season after cutting him`, back === true && team.players.some(x => x.id === f.two.id),
        `returned ${back}`);
      ok(3, `${abbr}: and pays his salary on top of the dead money, not instead of it`,
        near(engine.capRoom(team, league.cap), round1(room - f.two.salary)) && !!rolled && near(engine.deadCapUsed(team), rolled.amount),
        `room ${room} to ${engine.capRoom(team, league.cap)}, dead ${engine.deadCapUsed(team)}`);
    }
  }
  engine.runOffseason(league, rng);
  ok(3, `${abbr}: a second offseason clears the ledger`, (team.deadCap ?? []).length === 0 && engine.deadCapUsed(team) === 0,
    JSON.stringify(team.deadCap ?? null));
}

/* ---- 4. the exploit replayed end to end ---------------------------------- */
/* The probe's exact sequence on a fresh league per seed, three times over on
   the same man: cut, read the room, sign him back, read it again. Before this
   round it printed 190.4, 214.1, 190.4 and a three year deal reset to one. */
console.log('4) The exploit replayed: cut, sign back, cut, sign back, on the same man');
for (const [i, seed] of SEEDS.entries()) {
  const rng = lcg(seed + 1);
  const league = engine.initLeague(rng);
  const abbr = Object.keys(league.teams)[(i * 11) % Object.keys(league.teams).length];
  const team = league.teams[abbr];
  const target = [...team.players].filter(p => p.years >= 2).sort((a, b) => b.salary - a.salary)[0];
  ok(4, `${abbr}: the fixture has a man with years left`, !!target);
  if (!target) continue;
  const before = engine.capRoom(team, league.cap);
  const half = round1(target.salary / 2);
  const ceiling = round1(before + target.salary - half);
  let peak = before;
  let cuts = 0;
  let signs = 0;
  for (let k = 0; k < 3; k += 1) {
    if (engine.releasePlayer(team, league.freeAgents, target.id)) cuts += 1;
    peak = Math.max(peak, engine.capRoom(team, league.cap));
    if (engine.signPlayer(team, league.freeAgents, target.id, league.cap)) signs += 1;
    peak = Math.max(peak, engine.capRoom(team, league.cap));
  }
  const entries = (team.deadCap ?? []).filter(d => d.playerId === target.id).length;
  const line = `${abbr} ${target.name} ${target.salary}M x${target.years}: room ${before} before, peak ${peak}, cuts ${cuts}, re-signs ${signs}, ledger entries ${entries}, on roster ${team.players.some(p => p.id === target.id)}`;
  console.log(`   ${line}`);
  ok(4, `${abbr}: the cut happened once and only once`, cuts === 1, line);
  ok(4, `${abbr}: he never came back`, signs === 0 && !team.players.some(p => p.id === target.id) && league.freeAgents.some(p => p.id === target.id), line);
  ok(4, `${abbr}: the room never showed a free salary`, near(peak, ceiling) && peak < before + target.salary - 1e-9,
    `${line}; the most the room may reach is ${ceiling}`);
  ok(4, `${abbr}: one ledger entry, so nothing was charged twice either`, entries === 1, line);
  ok(4, `${abbr}: the room ends where one honest cut leaves it`, near(engine.capRoom(team, league.cap), ceiling), line);
}

/* ---- 5. a league saved before this round --------------------------------- */
/* Neither field exists on a save written before Round 631. The claim is that
   such a save behaves EXACTLY like one carrying empty arrays, so this runs
   the same moves on two twins of one league, one stripped of both fields and
   one with them set to [], under identical rngs, and requires every answer
   to agree. What the rule charges or refuses is sections 1 and 2's business;
   here only the agreement counts, so a control on those sections moves
   nothing in this one. */
console.log('5) A league saved before this round behaves exactly like one carrying empty arrays');
{
  const fresh = engine.initLeague(lcg(2026));
  const legacy = clone(fresh);
  for (const t of Object.values(legacy.teams)) { delete t.deadCap; delete t.releasedThisSeason; }
  const empty = clone(fresh);
  for (const t of Object.values(empty.teams)) { t.deadCap = []; t.releasedThisSeason = []; }
  const twins = [legacy, empty];
  const abbrs = Object.keys(fresh.teams);
  ok(5, 'the stripped twin has neither field on any team', abbrs.every(a => !('deadCap' in legacy.teams[a]) && !('releasedThisSeason' in legacy.teams[a])));
  ok(5, 'the stripped twin reads as carrying no dead money', abbrs.every(a => engine.deadCapUsed(legacy.teams[a]) === 0
    && near(engine.capUsed(legacy.teams[a]), round1(legacy.teams[a].players.reduce((s, p) => s + p.salary, 0)))));
  const agree = (label, f) => {
    const [a, b] = twins.map(f);
    ok(5, label, JSON.stringify(a) === JSON.stringify(b), `stripped ${JSON.stringify(a).slice(0, 90)} against empty ${JSON.stringify(b).slice(0, 90)}`);
  };
  agree('capUsed agrees on every team', lg => abbrs.map(a => engine.capUsed(lg.teams[a])));
  agree('signRefusal agrees for every free agent on every team', lg => abbrs.map(a => lg.freeAgents.map(p => engine.signRefusal(lg.teams[a], p.id))));
  const buyer = abbrs.slice().sort((x, y) => engine.capRoom(fresh.teams[y], fresh.cap) - engine.capRoom(fresh.teams[x], fresh.cap))[0];
  const cheapest = fresh.freeAgents.slice().sort((x, y) => x.salary - y.salary)[0];
  agree(`${buyer}: signing a free agent agrees`, lg => [engine.signPlayer(lg.teams[buyer], lg.freeAgents, cheapest.id, lg.cap), lg.teams[buyer].players.map(p => p.id)]);
  const cutter = abbrs[3];
  const victim = [...fresh.teams[cutter].players].filter(p => p.years >= 2).sort((x, y) => y.salary - x.salary)[0];
  agree(`${cutter}: a cut agrees, ledger and list included`, lg => [
    engine.releasePlayer(lg.teams[cutter], lg.freeAgents, victim.id),
    lg.teams[cutter].deadCap ?? null, lg.teams[cutter].releasedThisSeason ?? null,
    engine.capUsed(lg.teams[cutter]), engine.deadCapUsed(lg.teams[cutter]),
  ]);
  ok(5, `${cutter}: the cut wrote both fields onto the stripped twin`, Array.isArray(legacy.teams[cutter].deadCap) && Array.isArray(legacy.teams[cutter].releasedThisSeason));
  agree(`${cutter}: the answer on signing him back agrees`, lg => [engine.signRefusal(lg.teams[cutter], victim.id), engine.signPlayer(lg.teams[cutter], lg.freeAgents, victim.id, lg.cap)]);
  const threw = twins.map(lg => { try { engine.runOffseason(lg, lcg(777)); return null; } catch (e) { return String(e && e.message ? e.message : e).slice(0, 120); } });
  ok(5, 'an offseason on the stripped twin does not throw', threw[0] === null, threw[0] ?? '');
  ok(5, 'nor on the empty one', threw[1] === null, threw[1] ?? '');
  if (threw.every(t => t === null)) {
    agree('after the offseason the ledgers and lists agree on every team', lg => abbrs.map(a => [lg.teams[a].deadCap ?? [], lg.teams[a].releasedThisSeason ?? []]));
    agree('and capUsed agrees on every team', lg => abbrs.map(a => engine.capUsed(lg.teams[a])));
    agree('and signRefusal agrees for every free agent', lg => abbrs.map(a => lg.freeAgents.map(p => engine.signRefusal(lg.teams[a], p.id))));
  }
  let bare = null;
  try { engine.rollDeadCap({ abbr: 'X', players: [], defense: 70, wins: 0, losses: 0, picks: [] }); } catch (e) { bare = String(e && e.message ? e.message : e).slice(0, 120); }
  ok(5, 'rollDeadCap on a team with neither field does not throw', bare === null, bare ?? '');
}

/* ---- 6. the boards under vitest ------------------------------------------ */
if (CONTROL) {
  console.log('6) skipped under a control: vitest reads src, and a control only ever edits a copy in temp');
} else {
  console.log('6) The season close test and the cut board test on the real board, under vitest');
  const vitest = findUp(path.join('node_modules', 'vitest', 'vitest.mjs'));
  const TESTS = [
    'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx',
    'src/components/front-office/FrontOfficeCuts.test.tsx',
  ];
  ok(6, 'vitest can be found by walking up from the repo root', !!vitest, 'no node_modules/vitest/vitest.mjs above the repo');
  ok(6, 'both test files exist', TESTS.every(t => fs.existsSync(path.join(ROOT, t))), TESTS.filter(t => !fs.existsSync(path.join(ROOT, t))).join(', '));
  if (vitest) {
    const r = spawnSync(process.execPath, [vitest, 'run', ...TESTS, '--reporter=verbose'],
      { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 });
    const out = (r.stdout || '') + (r.stderr || '');
    const summary = out.match(/Tests\s+(.+)/);
    const line = summary ? summary[1].trim() : 'no summary line';
    console.log(`   vitest exit ${r.status}, ${line}`);
    ok(6, 'vitest reported on both files', TESTS.every(t => out.includes(path.basename(t))), out.slice(-600));
    ok(6, 'vitest exited zero', r.status === 0, out.split('\n').filter(l => /×|FAIL|AssertionError|Unable to find/.test(l)).slice(0, 10).join(' | '));
    ok(6, 'the summary line counts passes and no failures', !!summary && /\d+ passed/.test(line) && !/failed/.test(line), line);
    const cutRows = out.split('\n').filter(l => /✓.*a cut costs dead money on the board/.test(l)).length;
    ok(6, 'the cut board test rows are green', cutRows >= 2, `${cutRows} green rows`);
  }
}

/* ---- report --------------------------------------------------------------- */
if (checks === 0) {
  console.error('FAIL: NOTHING WAS CHECKED');
  process.exit(1);
}
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`   ${n}. ${SECTION_NAMES[n]}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([n]) => n).sort((a, b) => a - b);
  const want = EXPECT_RED[CONTROL];
  for (const f of fails.slice(0, 6)) console.log('   red: ' + f);
  if (red.join(',') === want.join(',')) {
    console.log(`control "${CONTROL}": section${want.length === 1 ? '' : 's'} ${want.join(' and ')} went red as expected (${fails.length} failures) and nothing else moved, the check works`);
    process.exit(0);
  }
  console.error(`control "${CONTROL}": expected section${want.length === 1 ? '' : 's'} ${want.join(' and ')} red, got ${red.length ? red.join(' and ') : 'nothing'}, so the check is dead or bleeds`);
  process.exit(1);
}
if (fails.length) {
  console.error(`simFrontOfficeCuts: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 20)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simFrontOfficeCuts: ${checks} checks passed over ${SEEDS.length} seeded leagues. A cut costs dead money, the man waits a season, and the offseason rolls it.`);
