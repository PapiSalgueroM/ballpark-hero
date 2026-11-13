import { describe, expect, it } from 'vitest';
import { NRL_LAST_YEAR } from '@/data/nrlManagerSeasons';
import { nrlBoardChallengeStatus, nrlBoardTarget } from '@/lib/nrlBoardTarget';
import {
  createNrlCareer, nrlCareerFinance, nrlOffseasonClubs, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { createNrlSeason, NRL_ROLES, nrlFitLineup, nrlStarterOptions } from '@/lib/nrlManager';

const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const stay = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startNextSeason' });
const move = (state: NrlCareerState, clubId: string) =>
  reduceNrlCareer(state, { type: 'startNextSeason', move: { fromYear: state.season.year, clubId } });
const status = nrlBoardChallengeStatus;

function finals(state: NrlCareerState) {
  while (state.season.phase === 'regular') state = advance(state);
  return state;
}

function finish(state: NrlCareerState) {
  while (state.season.phase !== 'complete') state = advance(state);
  return state;
}

function rotateStarters(state: NrlCareerState) {
  for (const role of NRL_ROLES) {
    const reserve = nrlStarterOptions(state.season, role).sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id))[0];
    state = reduceNrlCareer(state, { type: 'selectStarter', role, playerId: reserve.id });
  }
  return state;
}

describe('NRL Manager Board challenge', () => {
  it('opts in only at creation and reads existing v1 and standard v2 without a challenge field', () => {
    const standard = createNrlCareer('storm', 62);
    const off = createNrlCareer('storm', 62, 2026, false);
    expect(JSON.stringify(off)).toBe(JSON.stringify(standard));
    expect(standard).not.toHaveProperty('boardChallenge');
    expect(status(standard)).toBeNull();
    const enabled = createNrlCareer('storm', 62, 2026, true);
    const { boardChallenge, ...rest } = enabled;
    expect(boardChallenge).toBe(true);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(standard));
    expect(JSON.stringify(readNrlCareerSave(JSON.stringify(enabled)))).toBe(JSON.stringify(enabled));
    expect(readNrlCareerSave(JSON.stringify({ ...enabled, boardChallenge: false })) === null).toBe(true);

    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 62)))!;
    expect(legacy).not.toHaveProperty('boardChallenge');
    expect(status(legacy)).toBeNull();
  });

  it('warns after the first miss, requires another club only after a second completed miss, and preserves separate books', () => {
    const initial = createNrlCareer('storm', 62, 2026, true);
    expect(status(initial)).toBeNull();
    const firstFinals = finals(initial);
    expect(nrlBoardTarget(firstFinals)?.result).toBe('missed');
    expect(status(firstFinals)).toBe('warning');
    const first = finish(firstFinals);
    expect(status(first)).toBe('warning');
    const next = stay(first);
    expect(next.season.year).toBe(2027);
    expect(status(next)).toBe('warning');

    const secondFinals = finals(next);
    expect(nrlBoardTarget(secondFinals)?.result).toBe('missed');
    expect(status(secondFinals)).toBe('review');
    expect(stay(secondFinals) === secondFinals).toBe(true);
    const completed = finish(secondFinals);
    const bytes = JSON.stringify(completed);
    const restored = readNrlCareerSave(bytes)!;
    expect(status(restored)).toBe('must-move');
    expect(stay(restored) === restored).toBe(true);
    expect(move(restored, 'storm') === restored).toBe(true);
    expect(nrlOffseasonClubs(restored).some(club => club.id === 'chiefs')).toBe(true);
    expect(JSON.stringify(restored)).toBe(bytes);

    const changed = move(restored, 'chiefs');
    expect(changed.season.clubId).toBe('chiefs');
    expect(changed.boardChallenge).toBe(true);
    expect(status(changed)).toBeNull();
    expect(changed.history.slice(0, 1)).toEqual(completed.history.slice(0, 1));
    const { playerSeasons, ...secondArchived } = changed.history[1];
    expect(playerSeasons?.length).toBeGreaterThanOrEqual(13);
    expect([changed.history[0], secondArchived]).toEqual([
      completed.history[0],
      {
        ...completed.history[1],
        finals: {
          seeds: ['broncos', 'raiders', 'warriors', 'bulldogs', 'sharks', 'dolphins', 'roosters', 'panthers'],
          scores: [[22, 0], [10, 18], [18, 12], [10, 20], [18, 0], [29, 28], [22, 6], [20, 24], [18, 34]],
        },
      },
    ]);
    expect(changed.finance.openingCash).toBe(2_500_000);
    const { boardChallenge, ...standard } = restored;
    expect(JSON.stringify({ ...changed, boardChallenge: undefined })).toBe(JSON.stringify(move(standard, 'chiefs')));
    expect(stay(standard).season.clubId).toBe('storm');

    const back = move(finish(changed), 'storm');
    expect(back.season.clubId).toBe('storm');
    expect(status(back)).toBeNull();
    expect(back.finance.openingCash).toBe(nrlCareerFinance(completed).cash);
  });

  it('resets a warning when a club meets its next target', () => {
    const first = finish(createNrlCareer('storm', 1, 2026, true));
    expect(status(first)).toBe('warning');
    const second = finish(stay(first));
    expect(nrlBoardTarget(second)?.result).toBe('met');
    expect(status(second)).toBeNull();
    expect(status(stay(second))).toBeNull();
  });

  it('clears the warning after winning the Grand Final from sixth, while the ladder target still reads missed', () => {
    const first = finish(rotateStarters(createNrlCareer('panthers', 5, 2027, true)));
    expect(status(first)).toBe('warning');
    let second = finals(rotateStarters(stay(first)));
    expect(nrlBoardTarget(second)).toMatchObject({ place: 6, targetRank: 4, result: 'missed' });
    expect(status(second)).toBe('review');

    second = reduceNrlCareer(second, { type: 'setTactic', tactic: 'attack' });
    second = reduceNrlCareer(second, { type: 'hireCoach', role: 'attack', year: second.season.year, round: second.season.round });
    while (second.season.phase !== 'complete') {
      const fit = nrlFitLineup(second.season);
      if (fit) {
        second = reduceNrlCareer(second, { type: 'applyFitLineup', previewKey: fit.key });
        second = reduceNrlCareer(second, { type: 'prepare', choice: 'train' });
      }
      second = advance(second);
    }
    expect(second.season.championId).toBe('panthers');
    expect(nrlBoardTarget(second)?.result).toBe('missed');
    expect(status(second)).toBe('cleared');
    const stayed = stay(second);
    expect(stayed.season.clubId).toBe('panthers');
    expect(stayed.season.year).toBe(2029);
    expect(status(stayed)).toBeNull();
  });

  it('leaves the terminal completed year as a finished career without requiring a destination', () => {
    const season = finish(createNrlCareer('storm', 62, 2026, true));
    const terminal = { ...season, season: { ...season.season, year: NRL_LAST_YEAR } };
    expect(status(terminal)).toBeNull();
    expect(nrlOffseasonClubs(terminal)).toEqual([]);
    expect(stay(terminal) === terminal).toBe(true);
  });
});
