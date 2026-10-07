/**
 * Round 1051: a career that retired before the legacy recalibration keeps the
 * legacy and the Hall of Fame ballot it was told.
 *
 * src/test/fixtures/careerHallV1.json was written once by
 * scripts/recordCareerHallV1.mjs on the base commit of Round 1051 (its
 * baseCommit field), before any line of src changed: whole retired saves off
 * the engine loop and off the board's own loop (one per answer policy, one
 * with the speech given), each with the sport's legacyOf and hallRecordFor as
 * that code returned them. None of them carries a calibration stamp, which is
 * exactly what a save retired before the round looks like.
 *
 * WHAT THIS HOLDS:
 *   1. For every recorded save, legacyOf and hallRecordFor today equal the
 *      recording, whole objects. It was green on the base by construction and
 *      must stay green, untouched, on every later tree.
 *   2. The comparison can fail: a recorded score moved by one is caught, so
 *      the file cannot pass on an empty or unread fixture.
 *   3. Through the real board: every recorded save, seeded as the board's own
 *      save and mounted, shows the recorded verdict, the recorded legacy
 *      score, and a Hall card with the recorded headline and ballot lines.
 *      The load rewrites nothing and the card prints no line about what the
 *      voters weigh (that line belongs to careers retired on calibration 2).
 *      The engine loops never answer a rivalry beat, so every recorded save
 *      carries one, and the board shows it before the retirement screen as it
 *      would for a player: the test answers it. That answer saves the career
 *      again, and the save written on top of an old retired one must still
 *      carry no calibration stamp.
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { hallRecordFor, type HallRecord, type UsHallSport, type UsCareerShape } from '@/lib/careerHallOfFame';
import { legacyOf } from '@/lib/nflMyCareer';
import { nbaLegacyOf } from '@/lib/nbaMyCareer';
import { mlbLegacyOf } from '@/lib/mlbMyCareer';
import { nhlLegacyOf } from '@/lib/nhlMyCareer';
import { NFL_CAREER_HALL } from '@/lib/nflCareerHall';
import { NBA_CAREER_HALL } from '@/lib/nbaCareerHall';
import { MLB_CAREER_HALL } from '@/lib/mlbCareerHall';
import { NHL_CAREER_HALL } from '@/lib/nhlCareerHall';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { ballotLine, hallHeadline, hallYearsShown } from '@/components/career/HallOfFameCard';
import type { UsCareerSport } from '@/lib/usCareerSport';

type V1SportId = 'nfl' | 'nba' | 'mlb' | 'nhl';
interface V1Entry {
  id: string;
  from: string;
  why: string;
  save: UsCareerShape & { retired: boolean; hallCal?: unknown };
  legacy: { score: number; verdict: string; hof: boolean; bullets: string[] };
  hall: HallRecord;
}
interface V1Fixture { baseCommit: string; careersPlayed: number; sports: Record<V1SportId, V1Entry[]> }

const V1_FIXTURE_PATH = path.resolve(process.cwd(), 'src/test/fixtures/careerHallV1.json');
const loadV1Fixture = (): V1Fixture => JSON.parse(readFileSync(V1_FIXTURE_PATH, 'utf8')) as V1Fixture;

/* The engines type their own career states; the fixture holds them as JSON. */
type AnySave = V1Entry['save'];
const SPORTS: Record<V1SportId, { legacy: (c: AnySave) => unknown; hall: UsHallSport<AnySave> }> = {
  nfl: { legacy: legacyOf as unknown as (c: AnySave) => unknown, hall: NFL_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nba: { legacy: nbaLegacyOf as unknown as (c: AnySave) => unknown, hall: NBA_CAREER_HALL as unknown as UsHallSport<AnySave> },
  mlb: { legacy: mlbLegacyOf as unknown as (c: AnySave) => unknown, hall: MLB_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nhl: { legacy: nhlLegacyOf as unknown as (c: AnySave) => unknown, hall: NHL_CAREER_HALL as unknown as UsHallSport<AnySave> },
};
const IDS = Object.keys(SPORTS) as V1SportId[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Every way a save's reading today differs from its recording. */
function mismatches(sport: V1SportId, e: V1Entry): string[] {
  const out: string[] = [];
  const save = clone(e.save);
  if (JSON.stringify(SPORTS[sport].legacy(save)) !== JSON.stringify(e.legacy)) out.push(`${e.id}: legacy`);
  if (JSON.stringify(hallRecordFor(SPORTS[sport].hall, save)) !== JSON.stringify(e.hall)) out.push(`${e.id}: hall record`);
  return out;
}

describe('Round 1051: careers retired before the recalibration keep what they were told', () => {
  const fixture = loadV1Fixture();

  it('the fixture is the recording: a base commit, retired unstamped saves, every outcome', () => {
    expect(fixture.baseCommit).toMatch(/^[0-9a-f]{40}$/);
    for (const sport of IDS) {
      const list = fixture.sports[sport];
      expect(list.length, sport).toBeGreaterThanOrEqual(20);
      expect(list.every(e => e.save.retired === true && e.save.hallCal === undefined), sport).toBe(true);
      expect(list.filter(e => e.from.startsWith('board:')).length, sport).toBe(4);
      expect(list.some(e => e.legacy.hof) && list.some(e => !e.legacy.hof), sport).toBe(true);
      expect(list.some(e => e.hall.outcome === 'inducted' && e.hall.firstBallot), sport).toBe(true);
      expect(list.some(e => e.hall.outcome === 'inducted' && !e.hall.firstBallot), sport).toBe(true);
    }
  });

  it.each(IDS)('%s: legacyOf and hallRecordFor equal the recording, whole objects', sport => {
    const list = fixture.sports[sport];
    for (const e of list) {
      const save = clone(e.save);
      expect(SPORTS[sport].legacy(save), `${e.id} legacy`).toEqual(e.legacy);
      expect(hallRecordFor(SPORTS[sport].hall, save), `${e.id} hall`).toEqual(e.hall);
      // Reading it changed nothing on the save (no stamp is written by a read).
      expect(save, `${e.id} save untouched`).toEqual(e.save);
    }
    expect(list.flatMap(e => mismatches(sport, e))).toEqual([]);
  });

  it.each(IDS)('%s: the comparison can fail (a recorded score moved by one is caught)', sport => {
    const list = fixture.sports[sport];
    const bent = clone(list[0]);
    bent.legacy.score += 1;
    bent.hall.score += 1;
    expect(mismatches(sport, bent)).toEqual([`${bent.id}: legacy`, `${bent.id}: hall record`]);
  });
});

const BINDINGS: Record<V1SportId, () => UsCareerSport> = {
  nfl: () => NFL_CAREER_SPORT, nba: () => NBA_CAREER_SPORT, mlb: () => MLB_CAREER_SPORT, nhl: () => NHL_CAREER_SPORT,
};

/** Answers whatever rivalry beat or choice stands in front of the retirement
 *  screen. Returns how many presses it took, or -1 if it never cleared. */
async function clearRivalry(): Promise<number> {
  for (let k = 0; k < 8; k += 1) {
    const beat = document.querySelector<HTMLElement>('[data-rivalry-event] button');
    const option = document.querySelector<HTMLElement>('[data-rivalry-option="0"]');
    const outcome = document.querySelector('[data-rivalry-outcome]');
    const next = beat ?? option ?? (outcome ? [...document.querySelectorAll<HTMLElement>('button')].find(b => b.textContent?.trim() === 'Continue') ?? null : null);
    if (!next) return k;
    fireEvent.click(next);
    await act(async () => { await Promise.resolve(); });
  }
  return -1;
}

describe('Round 1051: the recorded saves through the real board', () => {
  const fixture = loadV1Fixture();
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(IDS)('%s: the board shows each save the verdict, the legacy and the ballot it was told, and writes nothing', async sport => {
    const binding = BINDINGS[sport]();
    const rules = binding.hall!.rules;
    let seen = 0, answered = 0;
    for (const e of fixture.sports[sport]) {
      localStorage.clear();
      localStorage.setItem(binding.saveKey, JSON.stringify({ c: e.save, phase: 'retired', teamQuality: null, coach: null }));
      const bytes = localStorage.getItem(binding.saveKey);
      render(createElement(MemoryRouter, null, createElement(UsCareerBoard, { sport: binding })));
      await act(async () => { await Promise.resolve(); });
      expect(localStorage.getItem(binding.saveKey), `${e.id}: the load writes nothing`).toBe(bytes);
      const presses = await clearRivalry();
      expect(presses, `${e.id}: the rivalry cards clear`).toBeGreaterThanOrEqual(0);
      const headline = hallHeadline(e.hall, rules);
      const head = await waitFor(() => {
        const h = [...document.querySelectorAll('h3')].find(x => x.textContent === headline);
        expect(h, `${e.id}: the Hall card's headline "${headline}"`).toBeTruthy();
        return h!;
      }, { timeout: 15000 });
      const card = head.parentElement!;
      const years = hallYearsShown(rules, e.hall);
      expect([...card.querySelectorAll('li')].map(l => l.textContent), `${e.id}: ballot lines`).toEqual(e.hall.ballots.map((b, i) => ballotLine(rules, b, i, years)));
      expect(document.body.textContent, `${e.id}: verdict`).toContain(e.legacy.verdict);
      const pill = [...document.querySelectorAll('span')].find(s => s.textContent?.startsWith('Legacy '));
      expect(pill?.textContent, `${e.id}: legacy pill`).toBe(`Legacy ${e.legacy.score}`);
      expect(document.querySelector('[data-hall-weighs]'), `${e.id}: no voters line on calibration 1`).toBeNull();
      const onDisk = JSON.parse(localStorage.getItem(binding.saveKey)!) as { c: Record<string, unknown>; phase: string };
      if (presses === 0) expect(localStorage.getItem(binding.saveKey), `${e.id}: nothing was written`).toBe(bytes);
      else answered += 1;
      // Whatever was saved on top of an old retired save, it carries no stamp and is still retired.
      expect('hallCal' in onDisk.c, `${e.id}: no stamp on an old retired save`).toBe(false);
      expect(onDisk.c.retired).toBe(true);
      expect(onDisk.phase).toBe('retired');
      cleanup();
      seen += 1;
    }
    expect(seen).toBe(fixture.sports[sport].length);
    expect(seen).toBeGreaterThanOrEqual(20);
    // The second write path is really exercised: rivalry answers saved on top of old retired saves.
    expect(answered).toBeGreaterThan(0);
  }, 240000);
});
