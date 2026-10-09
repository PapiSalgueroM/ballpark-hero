/**
 * Round 1104: the digest ledger. One digest per `sport|era|position`, over
 * seeded careers driven through each sport's binding the way the board drives
 * it (src/test/helpers/usCareerDrive.ts), hashing each whole final save, which
 * carries every season line.
 *
 * WHY IT EXISTS. The round changes pay, schedules, stat lines and a load rule
 * in engines four sports share a shape with. Each step of the round may move
 * only the keys its own row names (a 2026 career must not move when only the
 * 2005 schedule changed; baseball must not move when football's sacks did),
 * and a reader's eye on a diff is not a gate. This file is.
 *
 * TWO MODES.
 *   plain (CI, every run): every key equals the committed fixture
 *     src/test/fixtures/usCareerTruthDigest.json.
 *   the gate (a step of a round that means to move keys):
 *       DIGEST_RECORD=1 DIGEST_ALLOW='nfl|y2005|*' vitest run src/test/usCareerTruthDigest.test.ts
 *     recomputes, compares with the COMMITTED fixture, FAILS naming every key
 *     that moved outside DIGEST_ALLOW, and only on a pass writes the fixture.
 *     Patterns are comma separated, `*` matches anything; `none` allows no
 *     key; `dipped` allows every key whose committed lowest balance was below
 *     zero (the bank step); `new` records a fixture that does not exist yet.
 *     Its control: change an engine line and run with DIGEST_ALLOW=none, it
 *     must fail naming the keys.
 *
 * REPEATABLE, PROVED HERE. The drive replaces Math.random with a keyed stream.
 * One key per sport is driven twice in this process and must agree; a recorded
 * fixture is then read back by a plain run in a second process.
 *
 * Sizes: 8 careers a key, 14 seasons each, 58 keys. That is a few minutes of
 * synchronous work, so it yields to the event loop between keys (a vitest
 * worker that cannot answer its parent for a minute is reported as an error).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { driveCareer, sha } from './helpers/usCareerDrive';

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/usCareerTruthDigest.json');
const CAREERS = 8;
const SEASONS = 14;
const SPORTS: UsCareerSport[] = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];

/** `c` holds one entry a career: its own digest, a colon, the lowest balance any call left it on. */
interface KeyRow { digest: string; seasons: number; c: string[] }
interface Fixture { careers: number; seasons: number; keys: Record<string, KeyRow> }

function keyRow(sport: UsCareerSport, eraId: string, pos: string): KeyRow {
  let all = '';
  let seasons = 0;
  const c: string[] = [];
  for (let i = 0; i < CAREERS; i += 1) {
    const r = driveCareer(sport, { key: `${eraId}:${pos}:${i}`, pos, arch: i, eraId, seasons: SEASONS });
    all += r.json;
    seasons += r.seasons;
    c.push(`${sha(r.json).slice(0, 10)}:${Math.round(r.lowest * 100) / 100}`);
  }
  return { digest: sha(all), seasons, c };
}

const digestOf = (entry: string) => entry.split(':')[0];
const lowestOf = (entry: string) => Number(entry.split(':')[1]);

const breathe = () => new Promise<void>(r => setTimeout(r, 0));

async function compute(): Promise<Fixture> {
  const keys: Record<string, KeyRow> = {};
  for (const sport of SPORTS) {
    for (const era of sport.create.eras) {
      for (const pos of sport.create.positions) {
        keys[`${sport.slug}|${era.id}|${pos}`] = keyRow(sport, era.id, pos);
        await breathe();
      }
    }
  }
  return { careers: CAREERS, seasons: SEASONS, keys };
}

/** Whether career `i` of `key` may move: its key matches a pattern, or the
 *  step is the bank's (`dipped`) and this very career went below zero on the
 *  committed code. A career whose bank stayed healthy is never excused by a
 *  neighbour that dipped. */
const allowed = (key: string, i: number, patterns: string[], committed: Fixture): boolean =>
  patterns.some(p => {
    if (p === 'none' || p === 'new') return false;
    if (p === 'dipped') return lowestOf(committed.keys[key].c[i]) < 0;
    const rx = new RegExp(`^${p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    return rx.test(key);
  });

describe('Round 1104: the US career truth digest', () => {
  it('every key equals the committed fixture, or moved only where this step is allowed to move it', async () => {
    const now = await compute();
    /* Repeatable in one process: the first position of each sport, driven again. */
    for (const sport of SPORTS) {
      const era = sport.create.eras[0].id;
      const pos = sport.create.positions[0];
      expect(keyRow(sport, era, pos), `${sport.slug}|${era}|${pos} driven twice`).toEqual(now.keys[`${sport.slug}|${era}|${pos}`]);
      await breathe();
    }
    const committed: Fixture | null = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : null;
    const record = process.env.DIGEST_RECORD === '1';
    const patterns = (process.env.DIGEST_ALLOW ?? 'none').split(',').map(s => s.trim()).filter(Boolean);
    if (!committed) {
      if (!(record && patterns.includes('new'))) throw new Error('no committed digest fixture: record one with DIGEST_RECORD=1 DIGEST_ALLOW=new');
      writeFileSync(FIXTURE, `${JSON.stringify(now, null, 1)}\n`);
      console.log(`digest: recorded ${Object.keys(now.keys).length} keys (new fixture)`);
      return;
    }
    const names = Object.keys(now.keys);
    expect(names.length, 'keys counted').toBeGreaterThan(30);
    expect(Object.keys(committed.keys).sort(), 'the same keys as the fixture').toEqual(names.slice().sort());
    const moved = names.filter(k => committed.keys[k].digest !== now.keys[k].digest);
    if (!record) {
      expect(moved, 'keys that moved against the committed fixture').toEqual([]);
      return;
    }
    const outside: string[] = [];
    let careersMoved = 0;
    let dipped = 0;
    for (const k of names) {
      committed.keys[k].c.forEach((was, i) => {
        if (lowestOf(was) < 0) dipped += 1;
        if (digestOf(was) === digestOf(now.keys[k].c[i])) return;
        careersMoved += 1;
        if (!allowed(k, i, patterns, committed)) outside.push(`${k}#${i}`);
      });
    }
    console.log(`digest: ${moved.length} of ${names.length} keys moved (${careersMoved} of ${names.length * CAREERS} careers; ${dipped} careers were below zero on the committed code); allow=${patterns.join(',')}; outside the allow list: ${outside.length}`);
    console.log(`digest moved: ${moved.join(' ') || '(none)'}`);
    expect(outside, `careers that moved outside DIGEST_ALLOW=${patterns.join(',')}`).toEqual([]);
    writeFileSync(FIXTURE, `${JSON.stringify(now, null, 1)}\n`);
  }, 1_800_000);
});
