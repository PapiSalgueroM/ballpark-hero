// reviewer probe (runner only, never committed): node .rc/x/bigscore.mjs
// A saved last game whose score is a huge whole number: does readGmLastGame read it, and does gameStory come back?
// Each score runs in a child process with a time limit, so a hang is reported and not suffered.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const one = process.argv[2] === '--one' ? Number(process.argv[3]) : null;
if (one !== null) {
  const { bundle } = await import('../../scripts/lib/gmGameDayFleet.mjs');
  const { M } = await bundle([
    "export * as day from './src/lib/gmGameDay.ts';",
    "export * as nflDay from './src/lib/gameLaws/nflGameDay.ts';",
  ], [], `review-big-${one}`);
  const isClub = id => id === 'TEN' || id === 'BUF';
  const block = JSON.parse(JSON.stringify({ v: 1, key: 'k62', where: 'w3', home: 'TEN', away: 'BUF', homeScore: one, awayScore: 17, winner: 'TEN' }));
  const read = M.day.readGmLastGame(block, isClub);
  console.log(`READ ${read ? 'accepted' : 'refused'}`);
  if (read) {
    const t0 = Date.now();
    try {
      const story = M.day.gameStory(M.nflDay.NFL_GAME_DAY, read, 'home');
      console.log(`STORY ${story ? `${story.game.events.length} plays, ${new Set(story.game.events.map(e => e.min)).size} distinct minutes` : 'null'} in ${Date.now() - t0} ms`);
    } catch (e) {
      console.log(`THREW ${e && e.name}: ${String(e && e.message).slice(0, 100)} after ${Date.now() - t0} ms`);
    }
  }
  process.exit(0);
}

const LIMIT = 25000;
let bad = 0;
for (const score of [72, 100, 1000, 10000, 100000, 250000, 1000000, 100000000, 1e9, 1e21]) {
  const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--one', String(score)], { encoding: 'utf8', timeout: LIMIT });
  const lines = String(r.stdout || '').trim().split('\n').filter(Boolean);
  const verdict = r.error && r.error.code === 'ETIMEDOUT' ? `NO ANSWER in ${LIMIT} ms (killed)` : r.status !== 0 ? `child died, status ${r.status} signal ${r.signal}: ${String(r.stderr || '').trim().split('\n').pop().slice(0, 120)}` : '';
  if (verdict || lines.some(l => l.startsWith('THREW'))) bad += 1;
  console.log(`homeScore ${score}: ${[...lines, verdict].filter(Boolean).join(' | ')}`);
}
console.log(`bigscore: ${bad} of 10 saved scores that the guard reads make gameStory throw, die or never answer`);
