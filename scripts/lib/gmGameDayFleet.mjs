/* Round 1224: the fleet of NFL Front Office seasons that scripts/simGmGameDay.mjs
 * walks and scripts/recordGmBracketFixture.mjs records. ONE definition of the
 * fleet, so the recorded fixture and the harness that reads it cannot drift:
 * which seasons there are, how each is seeded, how a week is played (the way
 * src/components/front-office/FrontOfficeBoard.tsx plays one: the injury pass,
 * the computer clubs' moves, then the week's games), and what a postseason is
 * written down as.
 *
 * The generator is installed AS the global Math.random and the engine is
 * handed Math.random, the way the board does it. So a stray Math.random() in
 * anything that runs between two engine calls moves the engine's stream here
 * exactly as it would on the site, and the harness sees it.
 *
 * Nothing here reads the network or the clock. It bundles modules under src
 * that import no client.
 */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* Every read of a source file goes through here: the anchors are LF and the owner's checkout is CRLF. */
export const norm = s => s.replace(/\r\n/g, '\n');
export const readSrc = rel => norm(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
export const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');

/** The fleet: seed sets 0 to 4, and in each 40 seasons on each of the two leagues the engine makes. */
export const FLEET = { sets: [0, 1, 2, 3, 4], kinds: ['fifteen', 'deep'], perKind: 40 };
export const NEXT_DRAWS = 64;

/** A keyed generator (FNV-1a into mulberry32) whose state can be read and put back. */
export function seededGen(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let a = h >>> 0;
  return {
    next() {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    get state() { return a; },
    set state(v) { a = v; },
  };
}

/** Run `fn` with `gen` standing in for Math.random; hands back fn's result and how many draws it took. */
export function withMathRandom(gen, fn) {
  const real = Math.random;
  let calls = 0;
  Math.random = () => { calls += 1; return gen.next(); };
  try { return { value: fn(), calls }; } finally { Math.random = real; }
}

/** Bundle `entry` (lines of an ES module, paths from the repo root). `patches` is a control's list of
 *  { file, from, to }: each `from` must be in its file exactly once, or the bundle refuses. */
export async function bundle(entry, patches = [], tag = 'base') {
  const fired = new Set();
  const plugin = {
    name: 'gm-game-day-control',
    setup(b) {
      if (patches.length === 0) return;
      b.onLoad({ filter: /\.tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        const mine = patches.filter(p => p.file === rel);
        if (mine.length === 0) return undefined;
        let src = norm(fs.readFileSync(args.path, 'utf8'));
        for (const p of mine) {
          if (src.split(p.from).length !== 2) throw new Error(`control: its string is not exactly once in ${p.file}, refusing to run: ${p.from.slice(0, 80)}`);
          src = src.replace(p.from, () => p.to);
          fired.add(p);
        }
        return { contents: src, loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `gm-game-day-${tag}-${process.pid}-${Date.now()}.mjs`);
  await build({
    stdin: { contents: entry.join('\n'), resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, absWorkingDir: ROOT,
    logLevel: 'error', alias: { '@': './src' }, plugins: [plugin], jsx: 'automatic',
  });
  const M = await import(pathToFileURL(out).href);
  try { fs.unlinkSync(out); } catch { /* the temp file is only a copy */ }
  return { M, fired };
}

/** The engine side of the bundle: the untouched NFL Front Office engine and its two rosters. */
export const ENGINE_ENTRY = [
  "export * as engine from './src/lib/frontOffice.ts';",
  "export { FO_DEPTH } from './src/data/frontOfficeDepth.ts';",
  "export { FO_TEAMS } from './src/data/frontOfficePlayers.ts';",
];

export const seasonId = (set, kind, i) => `set ${set} ${kind} ${i}`;

/** One season of the fleet, opened and played to the end of Week 17 the way the board plays it.
 *  `onGame(game, pHome, week, league)` is called right after each game, inside the seeded Math.random
 *  (so whatever it draws from Math.random moves the engine's stream, as it would on the site). */
export function playRegularSeason(M, set, kind, i, onGame) {
  const E = M.engine;
  const gen = seededGen(`gm game day fleet|${seasonId(set, kind, i)}`);
  const user = M.FO_TEAMS[(set * 7 + i * 3 + (kind === 'deep' ? 11 : 0)) % M.FO_TEAMS.length].abbr;
  const { value: lg, calls } = withMathRandom(gen, () => {
    const league = E.initLeague(Math.random, kind === 'deep' ? { depth: M.FO_DEPTH, userTeam: user } : {});
    /* the board will not play a week while the GM's own club is over the limit: he cuts first */
    if (kind === 'deep' && E.deepOverLimit(league.teams[user]) > 0) E.cutDownToMax(league.teams[user], league.freeAgents);
    for (let w = 1; w <= E.REGULAR_WEEKS; w += 1) {
      E.injuryPass(league.teams, Math.random);
      E.aiWeeklyMoves(league, user, Math.random);
      for (const g of league.schedule[league.week - 1]) {
        const pHome = E.winProb(league.teams[g.home], league.teams[g.away]);
        const done = E.simGame(g, league.teams, Math.random);
        if (onGame) onGame(done, pHome, w, league);
      }
      if (league.week < E.REGULAR_WEEKS) league.week += 1;
    }
    return league;
  });
  return { lg, user, gen, calls };
}

/** The fourteen seeds as the engine seeds them: the AFC's seven, then the NFC's. */
export const seedsOf = (E, teams) => [...E.conferenceSeeds(teams, 'AFC'), ...E.conferenceSeeds(teams, 'NFC')];
export const recordsOf = teams => Object.keys(teams).sort().map(a => `${a} ${teams[a].wins}-${teams[a].losses}`).join(',');
export const gameText = (round, g) => `${round}|${g.home}|${g.away}|${g.homeScore}|${g.awayScore}|${g.winner}`;

/** The engine's own one press postseason on a league that has finished Week 17, written down: the
 *  thirteen games, the champion, a hash of the generator's next 64 draws and of the 32 records after. */
export function enginePostseason(M, season, onGame) {
  const E = M.engine;
  const { lg, gen } = season;
  const seeds = seedsOf(E, lg.teams);
  const { value } = withMathRandom(gen, () => {
    const { rounds, champion } = E.runPlayoffs(lg.teams, Math.random);
    if (onGame) for (const r of rounds) for (const g of r.games) onGame(g, r.name);
    const next = Array.from({ length: NEXT_DRAWS }, () => Math.random());
    return { rounds, champion, next };
  });
  return {
    seeds: seeds.join(','),
    games: value.rounds.flatMap(r => r.games.map(g => gameText(r.name, g))),
    champion: value.champion,
    next: sha1(value.next.join(',')),
    records: sha1(recordsOf(lg.teams)),
  };
}
