/**
 * Round 1042: a photograph of origin/release-al-int taken BEFORE that round moved any data,
 * proving a move.
 *
 * Round 1042 took data off pages that never read it: the national team pools left with the squad
 * picker (src/lib/soccerInternationalSquads.ts), the squad shape left Squad Deal's loader
 * (src/lib/squadShape.ts), and each past season's nationalities now arrive with that season
 * (src/data/nationalities/). The promise of that round is that nothing moved but the address, and
 * this file is the proof: every number below was recorded on the untouched base (the commit named
 * in the fixture) and must still come out the same.
 *
 *   A. the dailies. Manager Hot Seat and Deadline Day on thirty days running, plus every day the
 *      dailies' ledger changes and the day before it: the club, the league and the seed in clear,
 *      and the digest of the run the player is actually dealt (squad, needs, targets, prices).
 *   B. the squad picker. pickSquad and runInternationalSummer over 140 seeded cases, and how many
 *      of those sheets carried a real man from the pools (it may never be none).
 *   C. the nationalities. Every name of every world, read through nationalityOf.
 *   D. the squad shape. The formations, the slot rules, the position names and the rating curve.
 *
 * It is NEVER re recorded to make it pass. The engine stamps a few ids with the clock and a module
 * counter, so the clock is pinned and every part loads the engine in a fresh module instance.
 * Recording is CM_IDENTITY_RECORD=1 with CM_IDENTITY_BASE=<the base commit>; without the flag the
 * test only compares, and a missing fixture fails.
 *
 * The first later round that changes a roster, a nationality, a pool or a rating on purpose
 * deletes this file and its fixture in its first data commit, and says so.
 *
 * Negative control, run on the base on 2026-10-07 (CM_IDENTITY_CONTROL=flip): one nationality of
 * the 2010 world is changed in memory after its old value is asserted, the file on disk is never
 * touched, and part C must fail. Result: part C failed (the 2010 world's digest moved) and A, B
 * and D stayed green, vitest exit 1. Two recordings taken one after the other on the base were
 * byte identical, which is what makes a difference later mean something.
 * Measured on a busy twelve core machine: the whole file in 13 seconds, part A in 11.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import DAILY_CLUB_POOL from '@/data/dailyClubPool.json';

/* No part of this file may reach the database: the client is replaced by nothing at all. */
vi.mock('@/integrations/supabase/client', () => ({
  supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
}));

const FIXTURE = path.resolve(process.cwd(), 'src/test/fixtures/cmDataOnDemandIdentity.json');
const RECORD = process.env.CM_IDENTITY_RECORD === '1';
const CONTROL = process.env.CM_IDENTITY_CONTROL ?? '';
/** One instant for the whole file: the engine reads the clock into a few of its ids. */
const PINNED = Date.UTC(2026, 9, 7, 12, 0, 0);

/* eslint-disable @typescript-eslint/no-explicit-any */
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const fixture: any = fs.existsSync(FIXTURE) ? JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) : null;
const got: any = {};

function dayBefore(d: string): string {
  const t = new Date(`${d}T00:00:00Z`).getTime() - 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Thirty days running, plus every day the ledger changes and the day before each (read from the file). */
function theDates(): string[] {
  const out = new Set<string>();
  for (let i = 0; i < 30; i++) out.add(new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10));
  for (const l of (DAILY_CLUB_POOL as any).lines as any[]) {
    for (const d of [l.from, l.until]) {
      if (typeof d !== 'string') continue;
      out.add(d);
      out.add(dayBefore(d));
    }
  }
  return [...out].sort();
}

function check(part: string): void {
  if (RECORD) return;
  expect(fixture, 'the fixture src/test/fixtures/cmDataOnDemandIdentity.json is missing').not.toBe(null);
  expect(got[part]).toEqual(fixture[part]);
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(PINNED);
});

afterAll(() => {
  vi.useRealTimers();
  if (!RECORD) return;
  const base = process.env.CM_IDENTITY_BASE;
  if (!base) throw new Error('record mode needs CM_IDENTITY_BASE=<the base commit>');
  for (const part of ['dailies', 'squadPicker', 'nationalities', 'squadShape']) {
    if (!got[part]) throw new Error(`record mode ran without part ${part}: run the whole file`);
  }
  const out = {
    about: 'Round 1042 identity photograph. Recorded on the base commit below, before any data moved. Never re recorded to make a test pass: see the header of src/test/cmDataOnDemandIdentity.test.ts.',
    baseCommit: base,
    pinnedClock: PINNED,
    ...got,
  };
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(process.env.CM_IDENTITY_OUT ?? FIXTURE, JSON.stringify(out, null, 1) + '\n');
});

describe('Round 1042 identity: the dailies deal the same club, seed and run', () => {
  it('A. Manager Hot Seat, then Deadline Day, on every date', async () => {
    vi.resetModules();
    const hot = await import('@/lib/managerHotSeat');
    const dd = await import('@/lib/deadlineDay');
    const dates = theDates();
    expect(dates.length).toBeGreaterThanOrEqual(30);
    const rows: any[] = [];
    for (const date of dates) {
      const h = hot.dailyHotSeat(date);
      rows.push({
        game: 'hot-seat', date, club: h.club, leagueName: h.leagueName, seed: h.seed,
        run: sha(JSON.stringify(hot.startHotSeat(h))),
      });
    }
    for (const date of dates) {
      const d = dd.dailyDeadlineDay(date);
      rows.push({
        game: 'deadline-day', date, club: d.club, leagueName: d.leagueName, seed: d.seed,
        run: sha(JSON.stringify(dd.startDeadlineDay(d))),
      });
    }
    got.dailies = { dates, rows };
    console.log(`  A: ${dates.length} dates, ${rows.length} runs, first ${rows[0].club}, last ${rows[rows.length - 1].club}`);
    check('dailies');
  }, 600000);
});

describe('Round 1042 identity: the squad picker picks the same squads', () => {
  it('B. pickSquad and runInternationalSummer over 140 seeded cases', async () => {
    vi.resetModules();
    const hot = await import('@/lib/managerHotSeat');
    const core = await import('@/lib/soccerInternational');
    /* Round 1042, step 3: this ONE import line moved here from '@/lib/soccerInternational'. */
    const { pickSquad, runInternationalSummer, realPool } = await import('@/lib/soccerInternationalSquads');
    const nations = [...Object.keys(core.NATION_CONFED).slice(0, 12), 'Wales', 'Nowhereland United'];
    const years = [2016, 2019, 2022, 2026, 2045];
    const forms = [
      { overall: 62, position: 'CB', lastRating: 6.6, lastGoals: 1, age: 24, isCaptain: false },
      { overall: 88, position: 'ST', lastRating: 7.8, lastGoals: 27, age: 27, isCaptain: false },
    ];
    const cases: string[] = [];
    let realSheets = 0;
    let n = 0;
    for (const nation of nations) for (const year of years) for (const form of forms) {
      n++;
      const call = hot.withSeed(hot.mixSeed(1042, n), () => pickSquad(nation, form, year));
      const summer = hot.withSeed(hot.mixSeed(2084, n), () => runInternationalSummer(nation, year, form));
      const pool = realPool(nation, year);
      const real = new Set((pool ?? []).map((m: any) => m.name));
      const men = call.xi ? [...call.xi.gk, ...call.xi.def, ...call.xi.mid, ...call.xi.att] : [];
      if (men.some((m: any) => !m.me && real.has(m.name))) realSheets++;
      cases.push(`${nation}|${year}|${form.position} ${sha(JSON.stringify(call)).slice(0, 20)} ${sha(JSON.stringify(summer)).slice(0, 20)}`);
    }
    expect(cases.length).toBe(140);
    if (RECORD && realSheets === 0) throw new Error('refusing to record: no case reached the real pools');
    got.squadPicker = { cases, realSheets };
    console.log(`  B: ${cases.length} cases, ${realSheets} sheets carried a real pool man`);
    check('squadPicker');
  }, 120000);
});

describe('Round 1042 identity: every name of every world wears the same flag', () => {
  it('C. the five worlds, read through nationalityOf', async () => {
    vi.resetModules();
    const cm = await import('@/lib/clubManager');
    /* Round 1042, step 5: this ONE import line moves to '@/data/nationalities/allWorlds'. */
    const { NATIONALITY_BY_WORLD } = await import('@/data/playerNationalities');
    const { nationalityOf } = await import('@/data/playerNationalities');
    await cm.ensureAllEraRosters();
    const names: Record<string, string[]> = {};
    for (const world of Object.keys(NATIONALITY_BY_WORLD)) names[world] = Object.keys(NATIONALITY_BY_WORLD[world]).sort();
    if (CONTROL === 'flip') {
      /* The control: one man of the 2010 world changes country in memory. Never on disk. */
      const victim = names.era2010[0];
      const old = NATIONALITY_BY_WORLD.era2010[victim];
      expect(typeof old).toBe('string');
      (NATIONALITY_BY_WORLD.era2010 as any)[victim] = old === 'Brazil' ? 'Peru' : 'Brazil';
      expect(nationalityOf('era2010', victim)).not.toBe(old);
    }
    const worlds: Record<string, { count: number; digest: string }> = {};
    for (const world of Object.keys(names)) {
      const lines = names[world].map(name => `${name}\t${nationalityOf(world === 'now' ? undefined : world, name)}`);
      worlds[world] = { count: lines.length, digest: sha(lines.join('\n')) };
    }
    const edges = {
      invented: nationalityOf('now', 'Zzz Not A Player'),
      undefinedEra: nationalityOf(undefined, 'Erling Haaland'),
      unknownEra: nationalityOf('era1990', 'Erling Haaland'),
      sealed: nationalityOf('era2005', 'Erling Haaland'),
      henry: nationalityOf('era2005', 'Thierry Henry'),
    };
    got.nationalities = { order: Object.keys(names), worlds, edges };
    console.log(`  C: ${Object.entries(worlds).map(([w, v]) => `${w} ${v.count}`).join(', ')}`);
    check('nationalities');
  }, 120000);
});

describe('Round 1042 identity: the squad shape is the same shape', () => {
  it('D. formations, slot rules, position names and the rating curve', async () => {
    vi.resetModules();
    const deal = await import('@/lib/squadDeal');
    const values = [0.5, 1, 5, 15, 40, 80, 200, 400];
    const ages = [19, 27, 30, 34, 38];
    const ladder: number[] = [];
    const legends: number[] = [];
    for (const marketValue of values) for (const age of ages) {
      const p: any = { name: 'Ladder Man', club: 'Nowhere', nationality: 'Nowhere', league: 'Other', position: 'CM', marketValue, age, goals: 0, assists: 0, kitNumber: 8, difficulty: 'easy' };
      ladder.push(deal.playerRating(p));
      legends.push(deal.ratingFor(p, 'legends'));
    }
    got.squadShape = {
      formations: { count: deal.FORMATIONS.length, names: deal.FORMATIONS.map((f: any) => f.name), digest: sha(JSON.stringify(deal.FORMATIONS)) },
      slotAllowed: sha(JSON.stringify(deal.SLOT_ALLOWED)),
      positionNormalize: { count: Object.keys(deal.POSITION_NORMALIZE).length, digest: sha(JSON.stringify(deal.POSITION_NORMALIZE)) },
      ladder, legends,
    };
    console.log(`  D: ${deal.FORMATIONS.length} formations, ladder ${ladder.slice(0, 8).join(' ')} ...`);
    check('squadShape');
    /* Round 1042, step 4 adds here: the objects from squadDeal and from squadShape are the SAME
       references (a re export, never a copy). */
  }, 60000);
});
