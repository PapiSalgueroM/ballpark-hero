/* Round 647 fix: one sport's careers for scripts/simSeasonLedger.mjs, in a
   worker thread so the six sports play at once. It loads the bundle the
   harness built (the real engines, ledger and shapes, or a control's copy
   of one of them), plays the careers through scripts/lib/seasonLedgerPlay.mjs
   and posts back only what the harness judges: every idle season's pick,
   score, value and what a perfect season would have paid against the same
   projection; the skilled and the real policy seasons' pick and score; and
   the dodge pairs' gains and the cut men signed back. */
import { parentPort, workerData } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { seasonPlayer } from './seasonLedgerPlay.mjs';

const { bundle, key, seedBase, seasons, idleLeagues, skillLeagues, reportLeagues, dodgePairs, delta, pro } = workerData;
const M = await import(pathToFileURL(bundle).href);
const play = seasonPlayer(M, { delta });

const careers = (policy, leagues) => {
  const rows = [];
  for (let seed = 1; seed <= leagues; seed += 1) rows.push(...play.career(key, seed + seedBase, policy, seasons).map(r => ({ ...r, seed })));
  return rows;
};
const idle = careers('idle', idleLeagues).map(r => ({
  seed: r.seed, s: r.s, pick: r.pick, score: r.score, value: r.value,
  perfect: M.L.scoreSeason({ ...r.result, wins: r.result.games, stage: r.result.rounds + 1 }, r.exp),
  /* The projection's own seasons past its bar, each scored against it: a
     GM who lands his season anywhere in that headroom, with the odds the
     projection gives it, has won the same share of headroom whoever the
     pick is. */
  headroom: r.exp.top.filter(x => x > r.exp.top[0]).map(x => M.L.scoreValue(x, r.exp)),
}));
const brief = rows => rows.map(r => ({ pick: r.pick, score: r.score }));
const skill = brief(careers('skill', skillLeagues));
const real = brief(careers(pro ? 'sign' : 'recruit', reportLeagues));

const dodge = {};
if (pro) {
  const straight = new Map();
  for (const r of idle) if (r.seed <= dodgePairs && r.s <= 2) straight.set(r.seed, (straight.get(r.seed) ?? 0) + r.score);
  for (const policy of ['cutBefore', 'cutPlayoffs', 'cutAfter']) {
    const gains = [];
    const back = [];
    for (let seed = 1; seed <= dodgePairs; seed += 1) {
      const rows = play.career(key, seed + seedBase, policy, 2);
      gains.push(rows[0].score + rows[1].score - straight.get(seed));
      back.push(rows[0].resigned);
    }
    dodge[policy] = { gains, back };
  }
}
parentPort.postMessage({ idle, skill, real, dodge });
