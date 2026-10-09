import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { recentClubForm } from '@/lib/soccerCareerSelection';
import { managerTrust, squadNow } from '@/lib/soccerClubSquad';
import { planLine, trustLines } from '@/lib/soccerClubSquadSheet';
import { applyCareerPreparation, pickCareerPreparation, preparationForSeason, preparationInjuryDelta,
  preparationSkill, settleCareerPreparation } from '@/lib/soccerCareerPreparation';
import { createCareerMentor, endCareerMentorForMove, endCareerMentorForRetirement, recordMentorSeason } from '@/lib/soccerCareerMentor';

function career(): CareerState {
  const data = JSON.parse(readFileSync(resolve(process.cwd(), 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  return structuredClone(data.saves.find((save: { id: string }) => save.id === 'ere').state);
}
function previous(c: CareerState, extra: Partial<SeasonRecord> = {}): SeasonRecord {
  return { ...c.seasons[c.seasons.length - 1], club: c.currentClub, type: 'playing', apps: 30, leagueApps: 30,
    rating: 7, injurySevere: false, ...extra };
}

describe('Soccer Career development selection', () => {
  it.each([[7.6, 2], [10, 2], [6.4, -2], [0, -2], [7.599, 0], [6.401, 0]])(
    'uses the exact saved rating boundary %s', (rating, swing) => {
      const c = career(), row = previous(c, { rating }); c.seasons = [row];
      const result = recentClubForm(c);
      expect(result.swing).toBe(swing); expect(result.row).toBe(row);
      expect(result.reason).toContain(`${rating.toFixed(1)} over 30 league games`);
    },
  );
  it.each([
    { leagueApps: undefined }, { leagueApps: 9 }, { leagueApps: 39 }, { leagueApps: 10.5 },
    { rating: Number.NaN }, { rating: Number.POSITIVE_INFINITY }, { rating: -0.1 }, { rating: 10.1 },
    { type: 'youth' as const }, { type: 'manager' as const }, { club: 'Other Club' },
  ])('leaves unavailable or ineligible records neutral (%j)', extra => {
    const c = career(); c.seasons = [previous(c, { rating: 8.2, ...extra })];
    expect(recentClubForm(c)).toMatchObject({ swing: 0, row: null });
  });
  it('uses ten and thirty-eight league appearances inclusively', () => {
    const c = career();
    for (const leagueApps of [10, 38]) {
      c.seasons = [previous(c, { rating: 8, leagueApps })];
      expect(recentClubForm(c).swing).toBe(2);
    }
  });
  it('requires the exact prior year and never falls back to an older qualifying row', () => {
    const c = career(), row = previous(c, { rating: 8 });
    c.seasons = [row, { ...row, year: row.year + 1, type: 'youth' }];
    expect(recentClubForm(c, c.currentClub, row.year + 2)).toMatchObject({ swing: 0, row: null });
    c.seasons = [row];
    expect(recentClubForm(c, c.currentClub, row.year + 2)).toMatchObject({ swing: 0, row: null });
    expect(recentClubForm(c, c.currentClub, Number.NaN)).toMatchObject({ swing: 0, row: null });
  });
  it('excludes every saved year-out marker even with plausible stats', () => {
    const c = career();
    for (const club of ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED']) {
      c.currentClub = club; c.seasons = [previous(c, { club, rating: 8 })];
      expect(recentClubForm(c)).toMatchObject({ swing: 0, row: null });
    }
  });
  it('preserves all input fields and draws no randomness', () => {
    const c = career(), before = structuredClone(c);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('pure form must not draw randomness'); });
    try { recentClubForm(c); expect(c).toEqual(before); } finally { random.mockRestore(); }
  });
  it('quotes the same form swing and freeze order without changing the base role', () => {
    const c = career(); c.overall = 70; c.seasons = [previous(c, { rating: 7.6 })];
    const at = squadNow(c)!;
    for (const frozenOut of [0, 1]) {
      c.frozenOut = frozenOut;
      const trust = managerTrust(c, at), raw = Math.max(0, Math.min(38, (trust.band.min + trust.band.max) / 2 + trust.swing + 2));
      expect(trust.expected).toBe(frozenOut ? Math.min(8, Math.round(raw * 0.25)) : raw);
      expect(trust.inPlans).toBe(!frozenOut && trust.band.min >= 20);
      expect(planLine(trust)).toContain('league');
      expect(trustLines(c, at, trust).join(' ')).toContain(trust.form.reason);
    }
  });
});

describe('Soccer Career preseason preparation', () => {
  it('holds one next-year club plan without immediate growth or input mutation', () => {
    const c = career(), before = structuredClone(c), next = pickCareerPreparation(c, 'push');
    expect(next.seasonPreparation).toEqual({ id: 'push', year: c.seasons.at(-1)!.year + 1, club: c.currentClub });
    const expected = { ...c, seasonPreparation: next.seasonPreparation };
    expect(next).toEqual(expected); expect(c).toEqual(before);
    expect(pickCareerPreparation(next, 'push')).toBe(next);
    expect(pickCareerPreparation(next, null)).toEqual(c);
    expect(pickCareerPreparation(c, null)).toBe(c);
  });
  it('rejects choices outside playing and invalid club or year bindings', () => {
    const c = career();
    for (const phase of ['season_summary', 'random_events', 'retirement_suggestion'] as const) {
      const blocked = { ...c, phase }; expect(pickCareerPreparation(blocked, 'push')).toBe(blocked);
    }
    const held = pickCareerPreparation(c, 'recovery');
    expect(preparationForSeason({ ...held, currentClub: 'Other Club' })).toBeNull();
    expect(preparationForSeason(held, held.seasonPreparation!.year + 1)).toBeNull();
    expect(preparationForSeason({ ...held, retired: true })).toBeNull();
  });
  it('uses the exact workload risk deltas without drawing randomness', () => {
    const c = career();
    expect(preparationInjuryDelta(c)).toBe(0);
    expect(preparationInjuryDelta(pickCareerPreparation(c, 'push'))).toBe(0.03);
    expect(preparationInjuryDelta(pickCareerPreparation(c, 'recovery'))).toBe(-0.04);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('plan choices must not draw randomness'); });
    try { pickCareerPreparation(c, 'push'); preparationInjuryDelta(c); } finally { random.mockRestore(); }
  });
  it('maps every playable position to its promised primary skill', () => {
    expect(Object.fromEntries(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'].map(position =>
      [position, preparationSkill(position)]))).toEqual({ GK: 'reflexes', CB: 'defending', LB: 'defending', RB: 'defending',
      CDM: 'passing', CM: 'passing', CAM: 'passing', LW: 'dribbling', RW: 'dribbling', ST: 'shooting' });
  });
  it('modifies only the primary skill once, retaining growth caps and queued training', () => {
    for (const [id, before, adjustment] of [['push', 75, 1], ['recovery', 75, -1], ['push', 99, 0], ['recovery', 20, 0]] as const) {
      const c = pickCareerPreparation(career(), id); c.passing = before;
      const row = previous(c, { year: c.seasonPreparation!.year });
      const original = structuredClone(c);
      applyCareerPreparation(c, row);
      expect(c).toEqual({ ...original, passing: before + adjustment });
      expect(row.preparation).toEqual({ id, outcome: 'completed', skill: 'passing', adjustment });
      const settled = structuredClone({ c, row }); applyCareerPreparation(c, row);
      expect({ c, row }).toEqual(settled);
      settleCareerPreparation(c, row); expect(c.seasonPreparation).toBeUndefined();
      const once = structuredClone({ c, row }); settleCareerPreparation(c, row); expect({ c, row }).toEqual(once);
      expect(c.statBoostNextSeason).toEqual(original.statBoostNextSeason);
    }
  });
  it('records interrupted years without developing or banking an unused plan', () => {
    for (const extra of [{ apps: 0 }, { injurySevere: true }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 },
      { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }]) {
      const c = pickCareerPreparation(career(), 'push'), before = c.passing;
      const row = previous(c, { year: c.seasonPreparation!.year, ...extra });
      applyCareerPreparation(c, row); settleCareerPreparation(c, row);
      expect(c.passing).toBe(before); expect(c.seasonPreparation).toBeUndefined();
      expect(row.preparation).toEqual({ id: 'push', outcome: 'interrupted', skill: 'passing', adjustment: 0 });
    }
  });
  it('expires foreign club or year targets without claiming a completed season', () => {
    for (const extra of [{ club: 'Other Club' }, { year: career().seasons.at(-1)!.year + 2 }]) {
      const c = pickCareerPreparation(career(), 'push'), before = c.passing;
      const row = previous(c, { year: c.seasonPreparation!.year, ...extra });
      applyCareerPreparation(c, row); settleCareerPreparation(c, row);
      expect(c.passing).toBe(before); expect(row.preparation).toBeUndefined(); expect(c.seasonPreparation).toBeUndefined();
    }
  });
});

describe('Soccer Career generated academy mentorship', () => {
  it('creates one deterministic fictional player without a main random draw', () => {
    const c = career(), before = structuredClone(c);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('mentorship must use its private generator'); });
    try {
      const next = createCareerMentor(c);
      expect(next.mentor).toMatchObject({ generated: true, club: c.currentClub, startYear: c.seasons.at(-1)!.year + 1,
        lastYear: c.seasons.at(-1)!.year, age: 16, progress: 0, status: 'active', history: [] });
      expect(next.mentor!.name).not.toBe(c.playerName); expect(next.mentor!.name).not.toBe(c.rival?.name);
      expect(createCareerMentor(c)).toEqual(next); expect(createCareerMentor(next)).toBe(next); expect(c).toEqual(before);
    } finally { random.mockRestore(); }
  });
  it('credits only an actual appended senior row and never the same year twice', () => {
    const c = createCareerMentor(career()), row = previous(c, { year: c.mentor!.startYear, apps: 10 });
    expect(recordMentorSeason(c, row)).toBe(c);
    const appended = { ...c, seasons: [...c.seasons, row] }, before = structuredClone(appended);
    const next = recordMentorSeason(appended, row);
    expect(next.mentor).toMatchObject({ progress: 1, age: 17, status: 'active', lastYear: row.year });
    expect(appended).toEqual(before); expect(recordMentorSeason(next, row)).toBe(next);
  });
  it('graduates after three qualifying saved years and retains the finished history', () => {
    let c = createCareerMentor(career());
    for (let progress = 1; progress <= 3; progress++) {
      const row = previous(c, { year: c.mentor!.lastYear + 1, apps: 10 });
      c = recordMentorSeason({ ...c, seasons: [...c.seasons, row] }, row);
      expect(c.mentor).toMatchObject({ progress, age: 16 + progress, status: progress === 3 ? 'graduated' : 'active' });
      expect(c.mentor!.history).toHaveLength(progress);
    }
    expect(createCareerMentor(c)).toBe(c);
    const later = previous(c, { year: c.mentor!.lastYear + 1 });
    const held = { ...c, seasons: [...c.seasons, later] }; expect(recordMentorSeason(held, later)).toBe(held);
  });
  it('pauses every interruption while chronological age and saved history advance', () => {
    const original = createCareerMentor(career());
    for (const extra of [{ apps: 9 }, { injurySevere: true }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 },
      { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }]) {
      const row = previous(original, { year: original.mentor!.startYear, ...extra });
      const next = recordMentorSeason({ ...original, seasons: [...original.seasons, row] }, row);
      expect(next.mentor).toMatchObject({ progress: 0, age: 17, status: 'paused', lastYear: row.year });
      expect(next.mentor!.history).toHaveLength(1); expect(recordMentorSeason(next, row)).toBe(next);
    }
  });
  it('resumes progress after a pause without inventing a credited year', () => {
    const original = createCareerMentor(career()), year = original.mentor!.startYear;
    const pause = previous(original, { year, apps: 6 });
    let next = recordMentorSeason({ ...original, seasons: [...original.seasons, pause] }, pause);
    const played = previous(next, { year: year + 1, apps: 12 });
    next = recordMentorSeason({ ...next, seasons: [...next.seasons, played] }, played);
    expect(next.mentor).toMatchObject({ progress: 1, age: 18, status: 'active' });
    expect(next.mentor!.history.map(row => row.progress)).toEqual([0, 1]);
  });
  it('ends immediately on a club move without erasing history or mutating the input', () => {
    const c = createCareerMentor(career()), before = structuredClone(c);
    expect(endCareerMentorForMove(c, c.currentClub)).toBe(c);
    const next = endCareerMentorForMove(c, 'Other Club');
    expect(next.mentor).toEqual({ ...c.mentor!, status: 'ended', endReason: 'club-move' }); expect(c).toEqual(before);
    expect(endCareerMentorForMove(next, 'Third Club')).toBe(next); expect(createCareerMentor(next)).toBe(next);
    const row = previous(next, { year: next.mentor!.startYear, club: 'Other Club' });
    const moved = { ...next, seasons: [...next.seasons, row] }; expect(recordMentorSeason(moved, row)).toBe(moved);
  });
  it('ends active and paused mentoring at retirement without inventing a season', () => {
    for (const status of ['active', 'paused'] as const) {
      const c = createCareerMentor(career()); c.mentor!.status = status;
      const before = structuredClone(c);
      const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('retirement must not draw mentoring randomness'); });
      try {
        const next = endCareerMentorForRetirement(c);
        expect(next.mentor).toEqual({ ...before.mentor!, status: 'ended', endReason: 'retirement' });
        expect(next.seasons).toEqual(before.seasons); expect(c).toEqual(before);
        expect(endCareerMentorForRetirement(next)).toBe(next);
      } finally { random.mockRestore(); }
    }
  });
});
