/* simFrontOfficeSchedule (Round 851): every club in the NBA, MLB and NHL front
   offices plays the season the board promises, and the standings compare like
   with like.

   THE FINDING (QA847-09). Those three engines played a round by letting every
   club draw a random opponent per game slot and then skipping half the draws
   on a coin. Nothing booked a game for both clubs, so a finished season left
   clubs on different game counts while the standings sorted raw wins.
   Measured on origin/main cf3679e7 over 20 seeded full seasons each:
     NBA  58 to 101 games a club (80 promised), median spread in a season 30
     MLB 136 to 204 (162 promised), median spread 41
     NHL  63 to 104 (80 promised), median spread 30
   The NFL front office has booked a real fixture list since Round 419 and is
   not part of this harness.

   THE FIX. src/lib/foSchedule.ts books each season once (circle method
   matchings, one shuffled order per season, home and away by closed trails)
   and the three engines play the booked games through foPlayRound.

   SECTIONS
     1. The booked schedule, per sport and seed: every round has every club
        exactly perRound times, nobody plays himself, no pairing twice inside a
        round, and every club hosts exactly half its games.
     2. Played through the real engine: every club ends the regular season on
        exactly the games the board's own copy declares (read from the board's
        FoSportWords line), total wins equal total losses (NHL: losses plus
        overtime losses), and the next summer books a fresh season that plays
        out the same way.
     3. Old saves, from origin/main's own engine (cf3679e7, read with git
        show): a league saved mid season loads, finishes the season the old
        way with wins equal to losses, stays unbooked until its summer, then
        plays an exact season; a league saved before its first game is booked
        at its first round and plays an exact season at once.
     4. Balance, reported not asserted: title share of the three strongest and
        ten weakest clubs (preseason strength), origin/main against this tree,
        over the same seeds.

   CONTROLS (each must turn the harness red on the named check, exit 1; an
   anchor that is missing refuses to run, exit 2):
     FO_SCHEDULE_CONTROL=skip     foPlayRound ignores the booked games and
                                  plays the old random skip. Red on 2 (games).
     FO_SCHEDULE_CONTROL=oneside  the NBA books a home win for the winner only,
                                  the loser keeps no loss. Red on 2 (wins vs
                                  losses).
   Seeds: FO_SCHEDULE_SEEDS (default 20).

   MEASURED 2026-10-02 (20 seeds, about 25 seconds): green; every club on
   exactly 80, 162 and 80; control skip red with 3497 failed checks, all in
   2.games; control oneside red with 1240, in 2.games and 2.wl. Section 4 over
   60 seeds, title share of the three strongest and the ten weakest clubs:
     NBA origin/main 36/60 and 0/60, this tree 43/60 and 0/60
     MLB origin/main 30/60 and 0/60, this tree 29/60 and 0/60
     NHL origin/main 31/60 and 2/60, this tree 32/60 and 1/60
   The NBA's favourites gain a little now that nobody plays fewer games than
   they do; nothing was retuned in this round. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASE_SHA = 'cf3679e7';
const SEEDS = Number(process.env.FO_SCHEDULE_SEEDS || 20);
const CONTROL = process.env.FO_SCHEDULE_CONTROL || '';
const req = createRequire(path.join(ROOT, 'package.json'));

const CONTROLS = {
  skip: ['lib/foSchedule.ts', '  const booked = league.schedule?.[league.round - 1];', '  const booked = undefined as string[] | undefined;'],
  oneside: ['lib/nbaFrontOffice.ts', '    if (homeWon) { me.wins += 1; them.losses += 1;', '    if (homeWon) { me.wins += 1;'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`FAIL: unknown control ${CONTROL}`); process.exit(2); }

let failures = 0;
const failed = new Set();
const check = (section, ok, msg) => {
  if (ok) return;
  failures += 1; failed.add(section);
  if (failures <= 12) console.log(`FAIL [${section}] ${msg}`);
};

const mulberry = s => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const eol = s => s.replace(/\r\n/g, '\n');
const fwd = p => JSON.stringify(p.replaceAll('\\', '/'));
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'dukb-fosched-'));

/* ---- bundling: the current tree (under a control when one is set) and
   origin/main's tree, extracted once from git ---------------------------------- */
async function bundle(srcDir, tag, swap) {
  const esbuild = await import(pathToFileURL(req.resolve('esbuild')).href);
  const plugin = {
    name: 'dukb-fosched',
    setup(b) {
      if (!swap) return;
      b.onLoad({ filter: /\.ts$/ }, args => {
        if (path.resolve(args.path) !== path.resolve(srcDir, swap[0])) return undefined;
        const text = eol(fs.readFileSync(args.path, 'utf8'));
        if (!text.includes(swap[1])) throw new Error(`control ${CONTROL}: anchor not found in ${swap[0]}`);
        const out = text.replace(swap[1], swap[2]);
        if (out === text) throw new Error(`control ${CONTROL}: the rewrite changed nothing`);
        return { contents: out, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    },
  };
  const entry = path.join(TMP, `${tag}-entry.mjs`);
  fs.writeFileSync(entry, [
    `export * as nba from ${fwd(path.join(srcDir, 'lib/nbaFrontOffice.ts'))};`,
    `export * as mlb from ${fwd(path.join(srcDir, 'lib/mlbFrontOffice.ts'))};`,
    `export * as nhl from ${fwd(path.join(srcDir, 'lib/nhlFrontOffice.ts'))};`,
  ].join('\n') + '\n');
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', alias: { '@': srcDir }, plugins: [plugin], outfile: out, logLevel: 'error' });
  return import(pathToFileURL(out).href);
}

/* origin/main's src at BASE_SHA, written out with git cat-file (no tar, so it
   behaves the same under every shell). */
function extractBase() {
  const dir = path.join(TMP, 'base');
  const names = execFileSync('git', ['ls-tree', '-r', '--name-only', BASE_SHA, 'src'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    .split('\n').filter(Boolean);
  const blob = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: names.map(n => `${BASE_SHA}:${n}`).join('\n') + '\n', maxBuffer: 1 << 30 });
  let at = 0;
  for (const name of names) {
    const nl = blob.indexOf(10, at);
    const size = Number(blob.subarray(at, nl).toString('utf8').split(' ')[2]);
    const file = path.join(dir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, blob.subarray(nl + 1, nl + 1 + size));
    at = nl + 1 + size + 1;
  }
  return path.join(dir, 'src');
}

/* ---- the three leagues, as the boards drive them --------------------------- */
const sports = E => ({
  NBA: { board: 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', words: 'NBA_WORDS', rounds: E.nba.NBA_ROUNDS, per: E.nba.GAMES_PER_ROUND,
    init: r => E.nba.initNbaLeague(r), sim: (lg, r) => E.nba.simRound(lg, 'BOS', r), lost: t => t.losses,
    po: (lg, r) => E.nba.runNbaPlayoffs(lg, r).champion, off: (lg, r) => E.nba.nbaOffseason(lg, r, 'BOS'), str: t => E.nba.nbaStrength(t) },
  MLB: { board: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', words: 'MLB_WORDS', rounds: E.mlb.MLB_ROUNDS, per: E.mlb.MLB_GAMES_PER_ROUND,
    init: r => E.mlb.initMlbLeague(r), sim: (lg, r) => E.mlb.simMlbRound(lg, 'BOS', r), lost: t => t.losses,
    po: (lg, r) => E.mlb.runMlbPlayoffs(lg, r).champion, off: (lg, r) => E.mlb.mlbOffseason(lg, r, 'BOS'), str: t => E.mlb.mlbStrength(t) },
  NHL: { board: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', words: 'NHL_WORDS', rounds: E.nhl.NHL_FO_ROUNDS, per: E.nhl.NHL_GAMES_PER_ROUND,
    init: r => E.nhl.initNhlLeague(r), sim: (lg, r) => E.nhl.simNhlRound(lg, 'BOS', r), lost: t => t.losses + t.otLosses,
    po: (lg, r) => E.nhl.runNhlFoPlayoffs(lg, r).champion, off: (lg, r) => E.nhl.nhlOffseason(lg, r), str: t => E.nhl.nhlStrength(t) },
});

/* The season length the player is told, read off the board's own line. */
function declared(s) {
  const text = eol(fs.readFileSync(path.join(ROOT, s.board), 'utf8'));
  const m = text.match(new RegExp(`const ${s.words}: FoSportWords = \\{[^}]*games: (\\d+)`));
  if (!m) throw new Error(`no games count in ${s.words} on ${s.board}`);
  return Number(m[1]);
}

/* Rounds 1..N as the board plays them: the last round is followed by the
   playoffs with the round still on N. */
function playRegular(s, lg, rng, from = lg.round) {
  for (let r = from; r <= s.rounds; r += 1) { s.sim(lg, rng); if (r < s.rounds) lg.round += 1; }
}

/* Section 1: the booked schedule itself. */
function checkSchedule(name, s, lg, label) {
  const sched = lg.schedule;
  check('1.booked', Array.isArray(sched) && sched.length === s.rounds, `${label}: ${name} has ${sched ? sched.length : 'no'} booked rounds, wants ${s.rounds}`);
  if (!Array.isArray(sched)) return;
  const clubs = Object.keys(lg.teams);
  const home = Object.fromEntries(clubs.map(c => [c, 0])), away = { ...home };
  sched.forEach((round, ri) => {
    const count = Object.fromEntries(clubs.map(c => [c, 0]));
    const pairs = new Set();
    for (const g of round) {
      const [h, a] = g.split('-');
      check('1.self', h !== a, `${label}: ${name} round ${ri + 1} books ${h} against itself`);
      check('1.known', h in count && a in count, `${label}: ${name} round ${ri + 1} books an unknown club in ${g}`);
      const key = [h, a].sort().join('|');
      check('1.twice', !pairs.has(key), `${label}: ${name} round ${ri + 1} books ${key} twice`);
      pairs.add(key);
      count[h] += 1; count[a] += 1; home[h] += 1; away[a] += 1;
    }
    for (const c of clubs) check('1.perround', count[c] === s.per, `${label}: ${name} round ${ri + 1} gives ${c} ${count[c]} games, wants ${s.per}`);
  });
  for (const c of clubs) check('1.homeaway', home[c] === away[c], `${label}: ${name} ${c} hosts ${home[c]} and travels ${away[c]}`);
}

/* Section 2: what the standings read at the end of the regular season. */
function checkRecords(name, s, lg, want, label, section = '2') {
  const teams = Object.values(lg.teams);
  for (const t of teams) {
    const gp = t.wins + s.lost(t);
    check(`${section}.games`, gp === want, `${label}: ${name} ${t.abbr} played ${gp} games, the board promises ${want}`);
  }
  const w = teams.reduce((a, t) => a + t.wins, 0), l = teams.reduce((a, t) => a + s.lost(t), 0);
  check(`${section}.wl`, w === l, `${label}: ${name} total wins ${w} against total losses ${l}`);
}

/* ---- run ------------------------------------------------------------------- */

try {
  let E, B = null;
  try {
    E = await bundle(SRC, 'cur', CONTROL ? CONTROLS[CONTROL] : null);
    if (!CONTROL) B = await bundle(extractBase(), 'base', null);
  } catch (e) {
    console.error(`FAIL: could not bundle the engines: ${String(e && e.message ? e.message : e).slice(0, 300)}`);
    process.exit(2);
  }
  if (CONTROL) console.log(`   control ${CONTROL}: ${CONTROLS[CONTROL][0]} rewritten in memory`);
  const S = sports(E);

  /* Sections 1 and 2: two seasons per seed, the second booked at the summer. */
  for (const [name, s] of Object.entries(S)) {
    const want = declared(s);
    check('2.copy', want === s.rounds * s.per, `${name}: the board promises ${want} games, the engine books ${s.rounds} x ${s.per}`);
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      const rng = mulberry(seed * 7919);
      const lg = s.init(rng);
      for (let season = 1; season <= 2; season += 1) {
        const label = `seed ${seed} season ${season}`;
        checkSchedule(name, s, lg, label);
        playRegular(s, lg, rng);
        checkRecords(name, s, lg, want, label);
        lg.champions.push({ season: lg.season, team: s.po(lg, rng) });
        s.off(lg, rng);
      }
    }
    console.log(`   ${name}: ${SEEDS} seeds x 2 seasons, every club checked against ${want} games`);
  }

  if (B) {
    const O = sports(B);
    const OLD_SEEDS = Math.max(5, Math.floor(SEEDS / 2));
    /* Section 3: saves written by origin/main's engine. */
    for (const [name, s] of Object.entries(S)) {
      const o = O[name], want = declared(s);
      for (let seed = 1; seed <= OLD_SEEDS; seed += 1) {
        /* (a) saved mid season: finishes the old way, booked at its summer. */
        const rng = mulberry(seed * 104729);
        const old = o.init(rng);
        const half = Math.floor(s.rounds / 2);
        for (let r = 1; r <= half; r += 1) { o.sim(old, rng); old.round += 1; }
        const lg = JSON.parse(JSON.stringify(old));
        check('3.oldshape', lg.schedule === undefined, `${name} seed ${seed}: origin/main's save already carries a schedule`);
        let ok = true;
        try {
          playRegular(s, lg, rng);
          const teams = Object.values(lg.teams);
          const w = teams.reduce((a, t) => a + t.wins, 0), l = teams.reduce((a, t) => a + s.lost(t), 0);
          check('3.wl', w === l, `${name} seed ${seed}: an old mid season save ends on ${w} wins against ${l} losses`);
          check('3.unbooked', lg.schedule === undefined, `${name} seed ${seed}: an old mid season save was booked part way through a season`);
          lg.champions.push({ season: lg.season, team: s.po(lg, rng) });
          s.off(lg, rng);
          checkSchedule(name, s, lg, `old save seed ${seed}, next season`);
          playRegular(s, lg, rng);
          checkRecords(name, s, lg, want, `old save seed ${seed}, next season`, '3');
        } catch (e) { ok = false; check('3.crash', false, `${name} seed ${seed}: an old mid season save threw ${String(e && e.message).slice(0, 160)}`); }
        /* (b) saved before the first game: booked at round one. */
        try {
          const rng2 = mulberry(seed * 15485863);
          const fresh = JSON.parse(JSON.stringify(o.init(rng2)));
          playRegular(s, fresh, rng2);
          checkSchedule(name, s, fresh, `old fresh save seed ${seed}`);
          checkRecords(name, s, fresh, want, `old fresh save seed ${seed}`, '3');
        } catch (e) { ok = false; check('3.crash', false, `${name} seed ${seed}: an old fresh save threw ${String(e && e.message).slice(0, 160)}`); }
        void ok;
      }
      console.log(`   ${name}: ${OLD_SEEDS} origin/main saves mid season and ${OLD_SEEDS} before tip off, loaded and played on`);
    }

    /* Section 4: title share, reported. The three strongest and ten weakest
       clubs by preseason strength, same seeds, origin/main against this tree. */
    const TITLE_SEEDS = Math.max(SEEDS, 60);
    for (const [name, s] of Object.entries(S)) {
      const row = [];
      for (const [tag, eng] of [['origin/main', O[name]], ['this tree', s]]) {
        let top = 0, bottom = 0;
        for (let seed = 1; seed <= TITLE_SEEDS; seed += 1) {
          const rng = mulberry(seed * 31337);
          const lg = eng.init(rng);
          const ranked = Object.values(lg.teams).sort((a, b) => eng.str(b) - eng.str(a)).map(t => t.abbr);
          for (let r = 1; r <= eng.rounds; r += 1) { eng.sim(lg, rng); if (r < eng.rounds) lg.round += 1; }
          const champ = eng.po(lg, rng);
          if (ranked.slice(0, 3).includes(champ)) top += 1;
          if (ranked.slice(-10).includes(champ)) bottom += 1;
        }
        row.push(`${tag} top three ${top}/${TITLE_SEEDS}, bottom ten ${bottom}/${TITLE_SEEDS}`);
      }
      console.log(`   ${name} titles (reported, not asserted): ${row.join('; ')}`);
    }
  }
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

if (failures) {
  console.log(`simFrontOfficeSchedule: RED, ${failures} failed checks in ${[...failed].sort().join(', ')}${CONTROL ? ` (control ${CONTROL} fired)` : ''}`);
  process.exit(1);
}
console.log(`simFrontOfficeSchedule: GREEN, NBA, MLB and NHL seasons booked and played exactly over ${SEEDS} seeds${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
