import { describe, expect, it } from 'vitest';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import {
  chooseCareerProject, getCareerProjectsView, normalizeCareerProjects, resolveCareerProject,
  type CareerProjects,
} from '@/lib/soccerCareerProjects';

type Career = Pick<CareerState, 'phase' | 'retired' | 'seasons' | 'morale' | 'popularity'> & { careerProjects?: CareerProjects };

function row(year: number, values: Partial<SeasonRecord> = {}): SeasonRecord {
  return { year, type: 'playing', apps: 30, rating: 7.4, yellowCards: 1, redCards: 0, ...values } as SeasonRecord;
}

function createCareer(values: Partial<Career> = {}): Career {
  return { phase: 'playing', retired: false, seasons: [row(2025)], morale: 60, popularity: 30, ...values };
}

function settle(career: Career, season: SeasonRecord): Career {
  return resolveCareerProject({ ...career, seasons: [...career.seasons, season] }, season);
}

describe('Soccer Career Projects', () => {
  it('opens old saves without writing or changing the player', () => {
    const career = createCareer();
    const before = JSON.stringify(career);
    const view = getCareerProjectsView(career);
    expect(view.canChoose).toBe(true);
    expect(view.pending).toBeNull();
    expect(view.history).toEqual([]);
    expect(view.projects.map(p => [p.total, p.chapter?.choices.length])).toEqual([[3, 2], [3, 2], [3, 2], [3, 2]]);
    expect(JSON.stringify(career)).toBe(before);
    expect(normalizeCareerProjects(undefined)).toBeUndefined();
  });

  it('locks one choice across all tracks without receiving its effect up front', () => {
    const before = createCareer();
    const chosen = chooseCareerProject(before, 'street-league', 'open-signups');
    expect(chosen).not.toBe(before);
    expect(chosen.morale).toBe(before.morale);
    expect(chosen.popularity).toBe(before.popularity);
    expect(chosen.seasons).toBe(before.seasons);
    expect(getCareerProjectsView(chosen).pending?.fromYear).toBe(2026);
    expect(getCareerProjectsView(chosen).canChoose).toBe(false);
    expect(chooseCareerProject(chosen, 'match-lab', 'keep-notes')).toBe(chosen);
    expect(chooseCareerProject(chosen, 'street-league', 'showcase')).toBe(chosen);
    expect(chooseCareerProject(before, 'street-league', 'headline-final')).toBe(before);
    const youth = createCareer({ phase: 'youth' });
    expect(chooseCareerProject(youth, 'street-league', 'open-signups')).toBe(youth);
    const retired = createCareer({ phase: 'retired', retired: true });
    expect(chooseCareerProject(retired, 'street-league', 'open-signups')).toBe(retired);
  });

  it('reads the actual recorded result, reports a miss, and never pays it twice', () => {
    const chosen = chooseCareerProject(createCareer(), 'street-league', 'showcase');
    const excellent = row(2026);
    expect(resolveCareerProject(chosen, excellent)).toBe(chosen);
    const actual = row(2026, { apps: 12, rating: 6.3 });
    const settled = resolveCareerProject({ ...chosen, seasons: [...chosen.seasons, actual] }, excellent);
    expect(settled.morale).toBe(60);
    expect(settled.popularity).toBe(29);
    expect(getCareerProjectsView(settled).lastResult).toMatchObject({
      year: 2026, outcome: 'missed', effectLabel: 'Popularity -1', actualLabel: '12 appearances, 6.30 average rating',
    });
    expect(getCareerProjectsView(settled).projects[0].completed).toBe(0);
    expect(getCareerProjectsView(settled).pending).toBeNull();
    expect(resolveCareerProject(settled, actual)).toBe(settled);
    expect(getCareerProjectsView(chooseCareerProject(settled, 'street-league', 'open-signups')).pending?.fromYear).toBe(2027);
  });

  it('keeps commitments through a skipped or non-playing year', () => {
    const chosen = chooseCareerProject(createCareer(), 'players-council', 'standards');
    const skipped = settle(chosen, row(2026, { apps: 0, rating: 0, yellowCards: 0, redCards: 0 }));
    const other = settle(skipped, row(2027, { type: 'manager' }));
    expect(getCareerProjectsView(other).pending?.fromYear).toBe(2026);
    expect(getCareerProjectsView(other).history).toEqual([]);
    expect(other.morale).toBe(chosen.morale);
    const played = settle(other, row(2028));
    expect(getCareerProjectsView(played).lastResult).toMatchObject({ year: 2028, outcome: 'completed' });
    expect(getCareerProjectsView(played).projects[2].completed).toBe(1);
  });

  it('offers distinct stakes and caps the effect to the player stats', () => {
    const original = createCareer({ morale: 99, popularity: 98 });
    const signup = settle(chooseCareerProject(original, 'street-league', 'open-signups'), row(2026));
    const show = settle(chooseCareerProject(original, 'street-league', 'showcase'), row(2026));
    expect([signup.morale, signup.popularity]).toEqual([100, 98]);
    expect([show.morale, show.popularity]).toEqual([99, 100]);
    expect(getCareerProjectsView(signup).lastResult?.effectLabel).toBe('Morale +1');
    expect(getCareerProjectsView(show).lastResult?.effectLabel).toBe('Popularity +2');

    const low = createCareer({ popularity: 0 });
    const missed = settle(chooseCareerProject(low, 'fan-radio', 'analysis-show'), row(2026, { rating: 5.9 }));
    expect(missed.popularity).toBe(0);
    expect(getCareerProjectsView(missed).lastResult?.effectLabel).toBe('No change to morale or popularity');
  });

  it('advances every track across three chapters and keeps the finished tracks closed', () => {
    let career = createCareer();
    let year = 2026;
    for (const project of getCareerProjectsView(career).projects) {
      for (let chapter = 1; chapter <= project.total; chapter++) {
        const active = getCareerProjectsView(career).projects.find(p => p.id === project.id)?.chapter;
        expect(active?.number).toBe(chapter);
        career = settle(chooseCareerProject(career, project.id, active!.choices[1].id), row(year++));
        expect(getCareerProjectsView(career).lastResult?.outcome).toBe('completed');
      }
      expect(getCareerProjectsView(career).projects.find(p => p.id === project.id)?.chapter).toBeNull();
      expect(chooseCareerProject(career, project.id, project.chapter!.choices[0].id)).toBe(career);
    }
    expect(getCareerProjectsView(career).projects.map(p => p.completed)).toEqual([3, 3, 3, 3]);
    expect(getCareerProjectsView(career).canChoose).toBe(false);
    expect(getCareerProjectsView(career).history.map(entry => entry.year)).toEqual(Array.from({ length: 12 }, (_, index) => 2037 - index));
  });

  it('round trips legitimate history and rejects malformed fields', () => {
    const chosen = chooseCareerProject(createCareer(), 'match-lab', 'film-review');
    const played = settle(chosen, row(2026));
    const next = chooseCareerProject(played, 'match-lab', 'patterns');
    const reloaded = JSON.parse(JSON.stringify(next));
    expect(normalizeCareerProjects(reloaded.careerProjects)).toEqual(next.careerProjects);
    expect(getCareerProjectsView(reloaded)).toEqual(getCareerProjectsView(next));

    expect(normalizeCareerProjects({ progress: { 'street-league': 9999, junk: 2 }, pending: { projectId: '__proto__' } })).toBeUndefined();
    expect(normalizeCareerProjects({ progress: { 'match-lab': 2 }, pending: next.careerProjects?.pending })).toEqual({ progress: { 'match-lab': 2 } });
    const receipt = played.careerProjects!.receipts![0];
    const hostile = { receipts: [{ ...receipt, effects: { morale: 900, popularity: 900 } }, receipt, { ...receipt, year: -2 }], pending: chosen.careerProjects?.pending };
    const read = normalizeCareerProjects(hostile);
    expect(read?.pending).toBeUndefined();
    expect(read?.receipts).toHaveLength(1);
    expect(read?.receipts?.[0].effects).toEqual({});

    const future = {
      progress: {}, receipts: [{ ...receipt, year: 2099 }],
      pending: { ...chosen.careerProjects!.pending!, fromYear: 2099 },
    };
    expect(normalizeCareerProjects(future, 2026)).toBeUndefined();
    const repaired = { ...played, careerProjects: future };
    expect(getCareerProjectsView(repaired)).toMatchObject({ canChoose: true, pending: null, history: [] });
  });
});
