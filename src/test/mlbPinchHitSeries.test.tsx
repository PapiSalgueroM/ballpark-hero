import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import { keyedRng } from '@/lib/keyedRng';
import type { UsCareerCore } from '@/lib/usCareerSport';
import { MLB_ARCHETYPES, startMlbCareer, type MlbCareerPos } from '@/lib/mlbMyCareer';
import { MATCHUPS, SWINGS, newSeries, playAtBat, readSeries, type Swing } from '@/lib/mlbPinchHit';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const careerKey = 'mlb-my-career-save-v1';
const mountBoard = () => render(<MemoryRouter><MlbMyCareerBoard /></MemoryRouter>);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

function seedCareer(pos: MlbCareerPos) {
  const c: UsCareerCore = startMlbCareer('Practice hitter', pos, MLB_ARCHETYPES[pos][0], keyedRng('pinch hit:' + pos), null, 'y2004');
  delete c.summerSalt;
  localStorage.setItem(careerKey, JSON.stringify({ c, phase: 'season', teamQuality: 77, coach: null }));
}

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); });

describe('Pinch-Hit Series', () => {
  it('scores the same three inherited counts and baserunners differently according to the approach', () => {
    function score(plans: Swing[][]) {
      return MATCHUPS.map((matchup, i) => {
        const result = playAtBat(matchup, plans[i]);
        return [result.outcome, result.rbi];
      });
    }
    expect(score([['contact'], ['take'], ['contact', 'offspeed']])).toEqual([
      ['Sacrifice fly', 1], ['Walk', 1], ['Home run', 3],
    ]);
    expect(score([['take', 'take', 'take'], ['take'], ['take']])).toEqual([
      ['Strikeout', 0], ['Walk', 1], ['Strikeout', 0],
    ]);
    expect(score([['take', 'take', 'fastball'], ['contact', 'contact', 'offspeed'], ['fastball', 'offspeed']])).toEqual([
      ['Home run', 2], ['Home run', 4], ['Home run', 3],
    ]);
  });

  it('keeps a two-strike foul alive, punishes a chase, and counts only runners who score', () => {
    const third = MATCHUPS[2];
    expect(playAtBat(third, ['fastball'])).toMatchObject({ strikes: 2, log: [expect.stringContaining('Foul')] });
    expect(playAtBat(third, ['offspeed'])).toMatchObject({ strikes: 3, outcome: 'Strikeout', rbi: 0 });
    expect(playAtBat(third, ['contact', 'contact'])).toMatchObject({ outcome: 'Single', rbi: 0 });
    expect(playAtBat(MATCHUPS[0], ['fastball'])).toMatchObject({ outcome: 'Double', rbi: 1 });
    expect(playAtBat({ ...MATCHUPS[0], outs: 2 }, ['contact'])).toMatchObject({ outcome: 'Flyout', rbi: 0 });
    expect(playAtBat({ ...MATCHUPS[1], runners: [1, 3] }, ['take'])).toMatchObject({ outcome: 'Walk', rbi: 0 });
  });

  it('finishes every legal line, restores exact pitch history and discards impossible transcripts', () => {
    let terminal = 0;
    for (const matchup of MATCHUPS) {
      function walk(swings: Swing[]) {
        const played = playAtBat(matchup, swings);
        if (played.outcome) { terminal++; return; }
        expect(swings.length).toBeLessThan(9);
        for (const swing of Object.keys(SWINGS) as Swing[]) walk([...swings, swing]);
      }
      walk([]);
    }
    expect(terminal).toBeGreaterThan(30);
    const valid = { atBats: [['contact'], ['take'], ['contact']], best: 5 };
    expect(readSeries(JSON.stringify(valid))).toEqual(valid);
    for (const invalid of [[[], []], [['contact', 'take']], [['toString']], [[['take']]], [['guess']]]) {
      expect(readSeries(JSON.stringify({ atBats: invalid }))).toEqual(newSeries());
    }
  });

  it.each(['SP', 'RP'] as const)('keeps the hitter series out of %s practice', async pos => {
    seedCareer(pos);
    mountBoard();
    expect(await screen.findByRole('button', { name: 'Start practice' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pinch-Hit Series' })).toBeNull();
  });

  it('uses an old hitter career, resumes a foul after remount and preserves both best and original career', async () => {
    seedCareer('DH');
    let view = mountBoard();
    await screen.findByRole('button', { name: 'Pinch-Hit Series' });
    const original = localStorage.getItem(careerKey);
    click('Pinch-Hit Series'); click('Protect the plate'); click('Next at-bat'); click('Take pitch'); click('Next at-bat'); click('Protect the plate');
    view.unmount();
    view = mountBoard();
    expect(await screen.findByText('Count 0-2 · Pitch 2')).toBeInTheDocument();
    click('Sit on offspeed');
    expect(screen.getByRole('heading', { name: 'Series won · 5 RBI' })).toBeInTheDocument();
    click('Replay series'); click('Take pitch'); click('Take pitch'); click('Take pitch');
    click('Next at-bat'); click('Take pitch'); click('Next at-bat'); click('Take pitch');
    expect(screen.getByRole('heading', { name: 'Series complete · 1 RBI' })).toBeInTheDocument();
    expect(screen.getByText('Target 3 RBI · Best in this tab 5 RBI')).toBeInTheDocument();
    click('Back to career');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(careerKey)).toBe(original);
  });
});
