import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import { MLB_ARCHETYPES, startMlbCareer, type MlbCareerPos } from '@/lib/mlbMyCareer';
import { keyedRng } from '@/lib/keyedRng';
import { ENTRIES, freshCard, pitchOuting, restorePitchCard, type PitchCall } from '@/lib/mlbInheritedRunners';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const holds: PitchCall[][] = [['sinker'], ['fastball', 'changeup'], ['fastball', 'changeup', 'sinker']];
const losses: PitchCall[][] = [['fastball'], ['changeup'], ['fastball', 'fastball']];
const careerKey = 'mlb-my-career-save-v1';

function seed(pos: MlbCareerPos) {
  const c = startMlbCareer('Archive arm', pos, MLB_ARCHETYPES[pos][0], keyedRng('bullpen:' + pos), null, 'y2004');
  expect(c).not.toHaveProperty('summerSalt');
  localStorage.setItem(careerKey, JSON.stringify({ c, phase: 'season', teamQuality: 72, coach: null }));
}

const mount = () => render(<MemoryRouter><MlbMyCareerBoard /></MemoryRouter>);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Inherited Runners', () => {
  it('holds all three leads with a force third out and two setup changeups, or loses the same three leads', () => {
    const won = ENTRIES.map((entry, i) => pitchOuting(entry, holds[i]));
    const lost = ENTRIES.map((entry, i) => pitchOuting(entry, losses[i]));
    expect(won.map(s => [s.result, s.runs, s.inheritedScored, s.outs, s.strikeouts])).toEqual([
      ['Lead held', 0, 0, 3, 0], ['Lead held', 0, 0, 3, 1], ['Lead held', 0, 0, 3, 1],
    ]);
    expect(lost.map(s => [s.result, s.runs, s.inheritedScored])).toEqual(Array(3).fill(['Lead lost', 1, 1]));
    expect(won[0].log).toEqual(['Sinker down. Ground-ball double play.']);
    expect(lost[1].log).toContain('Changeup below the zone. Ball four. Walk.');
    expect(lost[2].log[1]).toContain('The hitter timed the repeated pitch');
    expect(pitchOuting(ENTRIES[2], ['changeup'])).toMatchObject({ balls: 1, strikes: 1 });
    expect(pitchOuting(ENTRIES[2], ['fastball', 'changeup'])).toMatchObject({ outs: 2, batter: 1, previous: null, bases: [null, 'inherited', null] });
  });

  it('applies walks to forced runners only, tags up before the third out, and distinguishes inherited runners from its own', () => {
    const entry = ENTRIES[1];
    expect(pitchOuting({ ...entry, bases: [null, null, 'inherited'] }, ['changeup'])).toMatchObject({
      bases: ['own', null, 'inherited'], runs: 0, batter: 1,
    });
    expect(pitchOuting({ ...entry, outs: 1 }, ['sinker'])).toMatchObject({ runs: 1, inheritedScored: 1, outs: 2 });
    expect(pitchOuting(entry, ['sinker'])).toMatchObject({ runs: 0, inheritedScored: 0, outs: 3 });
    expect(pitchOuting({ ...entry, bases: ['own', 'own', 'own'] }, ['changeup'])).toMatchObject({ runs: 1, inheritedScored: 0 });
  });

  it('reconstructs every saved legal pitch and rejects an invented call, early inning advance or action after a result', () => {
    expect(restorePitchCard(holds)).toEqual(holds);
    expect(restorePitchCard([holds[0], ['fastball']])).toEqual([holds[0], ['fastball']]);
    for (const bad of [[], null, [['toString']], [[], []], [['sinker', 'sinker']], [...holds, []], [Array(121).fill('changeup')]]) {
      expect(restorePitchCard(bad)).toEqual(freshCard());
    }
  });

  it('resumes a legacy starter on the exact full count and preserves his completed career and the hitter series', async () => {
    seed('SP');
    sessionStorage.setItem('mlb-pinch-hit-series-v1', 'other practice');
    let board = mount();
    await screen.findByRole('button', { name: 'Inherited Runners' });
    const before = localStorage.getItem(careerKey);
    click('Inherited Runners'); click('Sinker down'); click('Next inning'); click('Fastball up');
    board.unmount();
    board = mount();
    expect(await screen.findByText('Count 3-2 · Pitch 2')).toBeInTheDocument();
    click('Changeup below the zone'); click('Next inning'); click('Fastball up'); click('Changeup below the zone'); click('Sinker down');
    expect(screen.getByText('3 of 3 leads held')).toBeInTheDocument();
    click('Replay the same innings'); click('Fastball up'); click('Next inning'); click('Changeup below the zone');
    click('Next inning'); click('Fastball up'); click('Fastball up');
    expect(screen.getByText('0 of 3 leads held')).toBeInTheDocument();
    click('Back to career');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionStorage.getItem('mlb-pinch-hit-series-v1')).toBe('other practice');
    expect(localStorage.getItem(careerKey)).toBe(before);
  });

  it('opens for a relief pitcher, while the hitter retains only the batting series', async () => {
    seed('RP');
    const board = mount();
    await screen.findByRole('button', { name: 'Inherited Runners' });
    expect(screen.queryByRole('button', { name: 'Pinch-Hit Series' })).toBeNull();
    board.unmount();
    seed('DH'); mount();
    await screen.findByRole('button', { name: 'Pinch-Hit Series' });
    expect(screen.queryByRole('button', { name: 'Inherited Runners' })).toBeNull();
  });
});
