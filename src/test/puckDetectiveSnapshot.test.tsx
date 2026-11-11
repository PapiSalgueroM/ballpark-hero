import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PuckDetective from '@/pages/PuckDetective';
import { HOCKEY_CONTENT } from '@/data/gameContent/hockey';
import { hubFor } from '@/lib/sportHub';
import { evaluateGuess, teamLabel, type PuckDetectivePlayer } from '@/lib/puckDetective';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

// Exact ID, team, jersey, position and birth-date-derived age from the public snapshot, 2026-11-10.
const players: PuckDetectivePlayer[] = [
  { playerId: 8474037, name: 'James van Riemsdyk', team: 'DET', jerseyNumber: 21, position: 'L', age: 37, country: 'USA', group: 'forward', careerPoints: null },
  { playerId: 8477845, name: 'Trevor van Riemsdyk', team: 'WSH', jerseyNumber: 57, position: 'D', age: 35, country: 'USA', group: 'defense', careerPoints: null },
];
const mystery: PuckDetectivePlayer = { playerId: 9000000, name: 'Fixture mystery', team: 'DET', jerseyNumber: 21, position: 'L', age: 37, country: 'USA', group: 'forward', careerPoints: null };
const saveKey = 'puck-detective-daily-2026-11-10';
const notice = /Team and jersey clues use the game['’]s roster snapshot\. Players may have since moved or become free agents\./;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('@/lib/puckDetective', async original => ({
  ...await original<typeof import('@/lib/puckDetective')>(),
  fetchPuckDetectivePool: vi.fn(async () => [...players, mystery]),
  pickDailyMystery: () => mystery,
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => <nav>Fixture navigation</nav> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('rules-gate-seen:/puck-detective', '1');
  consumeRestoredFinish('puck-detective');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T17:00:00Z'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = async () => {
  const view = render(<MemoryRouter initialEntries={['/puck-detective']}><HelmetProvider><PuckDetective /></HelmetProvider></MemoryRouter>);
  await act(async () => {});
  return view;
};

it('keeps saved van Riemsdyk IDs and snapshot clue feedback while explaining the roster', async () => {
  const saved = JSON.stringify({ v: 1, date: '2026-11-10', puzzleIndex: 0, guesses: players.map(player => ({ playerId: player.playerId })), gameStatus: 'playing' });
  localStorage.setItem(saveKey, saved);
  const view = await start();
  expect(view.getByText(notice)).toBeVisible();
  for (const player of players) {
    const card = view.container.querySelector<HTMLElement>(`[data-puck-guess="${player.playerId}"]`)!;
    expect(within(card).getByText(player.name)).toBeVisible();
    expect(within(card).getByLabelText(`Team: ${teamLabel(player.team)}, ${evaluateGuess(player, mystery).team === 'exact' ? 'exact match' : 'no match'}`)).toBeVisible();
    expect(card.querySelector('[data-puck-attribute="jersey"]')).toHaveTextContent(`#${player.jerseyNumber}`);
  }
  expect(localStorage.getItem(saveKey)).toBe(saved);
  expect(recordCompletion).not.toHaveBeenCalled();

  fireEvent.click(view.getByRole('button', { name: 'How to play' }));
  expect(within(view.getByRole('dialog')).getByText(notice)).toBeVisible();
});

it('keeps the snapshot notice on a restored finished round', async () => {
  const saved = JSON.stringify({ v: 1, date: '2026-11-10', puzzleIndex: 0, guesses: [{ playerId: mystery.playerId }], gameStatus: 'won' });
  localStorage.setItem(saveKey, saved);
  const view = await start();
  expect(view.getByRole('heading', { name: 'Case closed!' })).toBeVisible();
  expect(view.getByText(notice)).toBeVisible();
  expect(localStorage.getItem(saveKey)).toBe(saved);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('avoids claiming that the puzzle snapshot is a current NHL roster', () => {
  const hub = hubFor('/hockey')!;
  const game = hub.startHere!.find(entry => entry.path === '/puck-detective')!;
  const copy = JSON.stringify([HOCKEY_CONTENT['/puck-detective'], hub.whyHere, game.why, hub.hubFaqs]);
  expect(copy).not.toMatch(/current NHL (?:roster|player)|current[- ]roster|up[- ]to[- ]date roster|latest roster/i);
});
