/**
 * Round 1532: the four Stadium Tycoon bots the scoreline round is measured with
 * (brief-1532 design 3.6). Read by scripts/genTycoonScorelineBaseline.mjs (the
 * base record, taken before any engine edit) and, from step 2 on, by
 * scripts/simTycoonScorelines.mjs, so the base and the head are played by the
 * same hands.
 *
 * - The cadence is read out of useStadiumTycoon.ts with simTycoonLeague's regex,
 *   never typed here (the simTycoonClock rule).
 * - Every roll comes from a mulberry32 per run, seeded by the run's seed exactly as
 *   simTycoonLeague's greedyPace seeds its stream, so the `pace` bot on seeds 1 to
 *   10 IS that harness's section 4 run. Math.random is never called.
 * - No set piece is taken, no whistle caught, no Hype pressed: the bots measure
 *   the match and the economy, not the minigames.
 *
 * Policies:
 *   pace        simTycoonLeague's greedyPace buying loop verbatim: every two
 *               seconds six taps, then up to 25 purchases cheapest first, Stands
 *               at 0.55 of its price when the ground is full. Never sells up.
 *   overinvest  the same, but each two second round first buys Squad while it is
 *               affordable (up to 25 levels), then the cheapest first loop.
 *   nosquad     pace that never buys Squad.
 *   paceSell    pace that sells up at the first full time that ends a season
 *               while the bar is full (simTycoonPackPace's afterFinal shape).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const POLICIES = ['pace', 'overinvest', 'nosquad', 'paceSell'];
export const CHECKPOINTS = [5, 15, 30, 60, 120, 240, 300];
/** Windows by full time minute, [from, to). Five minutes is about two matches:
 *  printed, never fenced. */
export const WINDOWS = [[0, 5], [5, 15], [15, 30], [30, 60], [60, 120], [120, 240], [240, 300]];
export const MILESTONE_IDS = ['win1', 'win10', 'win50', 'goals25', 'streak5', 'fans500', 'fans2k', 'fans10k', 'full', 'allTracks'];
export const BADGE_IDS = ['ag25', 'ag100', 'ag500', 'ag2000', 'aw1', 'aw10', 'aw50', 'aw150', 'aw400', 'as5', 'as10'];

/** The hook's tick threshold, read with simTycoonLeague's own regex. */
export function readDt(root) {
  const hook = fs.readFileSync(path.join(root, 'src/hooks/useStadiumTycoon.ts'), 'utf8');
  const m = hook.match(/if \(acc >= ([0-9.]+)\)/);
  if (!m) throw new Error('cannot read the tick threshold out of useStadiumTycoon.ts, so the cadence would be a guess');
  return Number(m[1]);
}

export const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** Bundle a TypeScript entry (the real lib, or a patched copy) into the OS temp
 *  folder and import it. `tmp` is the caller's own fresh folder. */
export async function bundleTs(root, entry, tmp, name) {
  const out = path.join(tmp, `${name}-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`);
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(root, 'src') } });
  return import(pathToFileURL(out).href);
}
export const freshTmp = label => fs.mkdtempSync(path.join(os.tmpdir(), `${label}-`));

/** Unboosted income: the expression offlineEarnings has always used. */
export const unboosted = (T, s) => (typeof T.unboostedIncomePerSec === 'function'
  ? T.unboostedIncomePerSec(s)
  : T.incomePerSec({ ...s, boostLeftSec: 0, goldenLeftSec: 0, goldenKind: null }));

function buyRound(T, s, policy) {
  for (let i = 0; i < 6; i += 1) s = T.tap(s);
  if (policy === 'overinvest') {
    for (let guard = 0; guard < 25 && T.canBuy(s, 'squad'); guard += 1) s = T.buy(s, 'squad');
  }
  for (let guard = 0; guard < 25; guard += 1) {
    const full = T.attendance(s) >= T.capacity(s) - 5;
    const options = T.TRACKS.filter(tr => (policy !== 'nosquad' || tr.id !== 'squad') && T.canBuy(s, tr.id)).sort((a, b) =>
      T.costOf(s, a.id) * (full && a.id === 'stands' ? 0.55 : 1) - T.costOf(s, b.id) * (full && b.id === 'stands' ? 0.55 : 1));
    if (!options.length) break;
    s = T.buy(s, options[0].id);
  }
  return s;
}

const RESULT_GEMS = { win: 3, draw: 1, loss: 0 };
const TABLE_GEMS = pos => (pos === 1 ? 20 : pos === 2 ? 6 : 0);

/**
 * Play one bot. Returns every watched league match (full time minute, division,
 * the Squad level and the opponent offset averaged over the minutes the chances
 * read them, matchGap the same way when the lib exports it, goals each side, the
 * result, the streak after it, the gems it pays), every season end, every
 * promotion (minute, Squad on that tick, division reached), the first Sell up,
 * the stars a paceSell bot sells for, a snapshot at each checkpoint, each win
 * bonus in seconds of the unboosted income of the tick it was paid in, and the
 * minute each tracked milestone and badge was first earned. Gem pay is GEM_PAY's
 * (src/lib/tycoonRewards.ts 30), credited per watched full time; no ledger is
 * written.
 */
export function runBot(T, { policy, seed, minutes, dt }) {
  if (!POLICIES.includes(policy)) throw new Error(`unknown policy ${policy}`);
  const roll = mulberry(seed);
  let s = T.newTycoon(0);
  const everyTwo = Math.round(2 / dt);
  const steps = Math.round((minutes * 60) / dt);
  const matches = []; const seasons = []; const promotions = []; const stars = []; const winBonusSec = [];
  const checkpoints = {}; const firsts = {};
  let sellUp = null;
  let acc = { sq: 0, off: 0, gap: 0, mins: 0, gf: 0, ga: 0 };
  const hasGap = typeof T.matchGap === 'function';
  const cps = CHECKPOINTS.filter(c => c <= minutes);
  for (let step = 0; step < steps; step += 1) {
    const prev = s;
    const r = T.tick(s, dt, roll);
    s = r.state;
    const t = ((step + 1) * dt) / 60;
    const played = ((s.totalMatches ?? 0) - (prev.totalMatches ?? 0)) * 90 + s.minute - prev.minute;
    if (played > 0) {
      acc.sq += played * T.levelOf(prev, 'squad');
      acc.off += played * T.currentOpponentOffset(prev);
      if (hasGap) acc.gap += played * T.matchGap(prev);
      acc.mins += played;
    }
    for (const e of r.events) {
      if (e.kind === 'goal') acc.gf += 1;
      else if (e.kind === 'conceded') acc.ga += 1;
    }
    const result = r.events.find(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss');
    if (result) {
      const end = r.events.find(e => (e.kind === 'title' || e.kind === 'seasonEnd') && e.position !== undefined);
      const m = acc.mins || 1;
      matches.push({
        t, div: T.divisionIndex(prev), sq: acc.sq / m, off: acc.off / m, gap: hasGap ? acc.gap / m : null,
        gf: acc.gf, ga: acc.ga, res: result.kind[0], streak: s.streak, gems: RESULT_GEMS[result.kind] + (end ? TABLE_GEMS(end.position) : 0),
      });
      if (result.kind === 'win' && result.amount !== undefined) {
        const inc = unboosted(T, prev);
        if (inc > 0) winBonusSec.push([t, result.amount / inc]);
      }
      if (end) seasons.push({ t, div: T.divisionIndex(prev), pos: end.position, title: end.kind === 'title' });
      acc = { sq: 0, off: 0, gap: 0, mins: 0, gf: 0, ga: 0 };
    }
    if (r.events.some(e => e.kind === 'promoted')) promotions.push({ t, sq: T.levelOf(s, 'squad'), div: T.divisionIndex(s) });
    if (sellUp === null && T.canPrestige(s)) sellUp = t;
    if ((s.claimed?.length ?? 0) !== (prev.claimed?.length ?? 0)) for (const id of s.claimed) if (firsts[id] === undefined) firsts[id] = t;
    if ((s.ach?.length ?? 0) !== (prev.ach?.length ?? 0)) for (const id of s.ach) if (firsts[id] === undefined) firsts[id] = t;
    if (policy === 'paceSell' && T.canPrestige(s) && r.events.some(e => e.kind === 'title' || e.kind === 'seasonEnd')) {
      s = T.prestige(s, Math.round(t * 60000));
      stars.push({ t, rep: s.rep });
    }
    if ((step + 1) % everyTwo === 0) s = buyRound(T, s, policy);
    for (const c of cps) {
      if (checkpoints[c] === undefined && t >= c - 1e-9) {
        checkpoints[c] = {
          sq: T.levelOf(s, 'squad'), div: T.divisionIndex(s), rep: s.rep, lifetime: s.lifetime, income: T.incomePerSec(s),
          unboosted: unboosted(T, s), streak: s.streak, fanbase: s.fanbase, capacity: T.capacity(s), matches: s.totalMatches ?? 0,
          wins: s.totalWins, goals: s.totalGoals, titles: s.leagueTitles ?? 0,
        };
      }
    }
  }
  return { policy, seed, minutes, matches, seasons, promotions, sellUp, stars, checkpoints, winBonusSec, firsts };
}
