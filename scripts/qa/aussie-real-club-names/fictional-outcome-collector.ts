import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createGzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import * as League from '../../../src/lib/aussieRulesLeague';

export async function collect(out: string, role: string) {
  assert(path.isAbsolute(out) && ['baseline', 'candidate'].includes(role));
  assert(!fs.existsSync(out), 'AUSSIE_PARITY_FRESH_DIRECTORY');
  fs.mkdirSync(out);
  const rows: { seed: number; club: string; file: string; rows: number; actions: number; seasons: number; bytes: number; sha256: string }[] = [];
  const ids = [League.CLUBS[0].id, League.CLUBS[League.CLUBS.length - 1].id];
  assert.equal(new Set(ids).size, 2);
  const bot = (s: League.LeagueState): League.LeagueAction => s.phase === 'prepare'
    ? (s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' })
    : s.phase === 'quarter' || s.phase === 'break' ? { type: 'playMatch', tactic: 'control' }
      : s.phase === 'draft' && s.draft!.at < s.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
  for (const seed of [31, 917]) for (const club of ids) {
    const file = [seed, club].join('-') + '.jsonl.gz';
    assert.equal(path.basename(file), file);
    const destination = path.join(out, file);
    const gzip = createGzip();
    const disk = fs.createWriteStream(destination, { flags: 'wx' });
    const finished = new Promise<void>((resolve, reject) => {
      disk.once('finish', resolve);
      disk.once('error', reject);
      gzip.once('error', reject);
    });
    gzip.pipe(disk);
    let count = 0;
    async function emit(row: unknown) {
      const bytes = JSON.stringify(row) + '\n';
      count++;
      if (!gzip.write(bytes)) await once(gzip, 'drain');
    }
    try {
      const defaults = {
        world: League.createLeagueWorld(seed),
        seasons: [1, 2].map(season => ({
          season, order: League.seasonOrder(seed, season),
          fixtures: Array.from({ length: League.ROUNDS }, (_, i) => League.fixturesFor(seed, season, i + 1)),
        })),
      };
      await emit({ kind: 'default-api', seed, club, defaults });
      let state = League.createLeague(seed, club);
      assert(state, 'AUSSIE_PARITY_FICTIONAL_START');
      assert.equal(state.version, 2);
      await emit({ kind: 'state', seed, club, step: 0, action: null, state });
      let steps = 0;
      const seasonSteps = new Map<number, number>();
      while (state.season <= 2) {
        const season = state.season;
        const used = (seasonSteps.get(season) ?? 0) + 1;
        assert(used <= 5000, 'AUSSIE_PARITY_FINITE_SEASON');
        seasonSteps.set(season, used);
        const action = bot(state);
        assert(League.isLeagueAction(action), 'AUSSIE_PARITY_LEGAL_ACTION');
        const next = League.reduceLeague(state, action);
        assert.notEqual(next, state, 'AUSSIE_PARITY_PROGRESS');
        state = next;
        steps++;
        await emit({ kind: 'state', seed, club, step: steps, action, state });
      }
      assert.equal(state.season, 3, 'AUSSIE_PARITY_TWO_COMPLETED_SEASONS');
      assert.equal(state.phase, 'prepare');
      assert.equal(state.history.length, 2);
      assert.deepEqual(League.readLeagueSave(JSON.stringify(state)), state, 'AUSSIE_PARITY_READABLE_FICTIONAL_SAVE');
      gzip.end();
      await finished;
      const body = fs.readFileSync(destination);
      rows.push({ seed, club, file, rows: count, actions: steps, seasons: 2, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
    } catch (error) {
      gzip.destroy(error instanceof Error ? error : new Error(String(error)));
      disk.destroy();
      await finished.catch(() => undefined);
      throw error;
    }
  }
  assert.equal(rows.length, 4);
  fs.writeFileSync(path.join(out, 'campaigns.json'), JSON.stringify({
    role, pid: process.pid, rows,
    scope: 'Four fixed fictional careers, complete state and action bytes at every step, two completed seasons each. Not universal RNG or performance equivalence.',
  }, null, 2) + '\n', { flag: 'wx' });
  return { role, pid: process.pid, campaigns: rows.length, completedSeasons: rows.reduce((n, row) => n + row.seasons, 0) };
}
