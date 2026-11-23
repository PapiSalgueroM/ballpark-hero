import './dailyReload/mocks';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import roster from '@/data/careerLadderRoster.json';
import { ladderGuessWins, type CareerPlayer } from '@/lib/careerLadder';
import CareerLadder from '@/pages/CareerLadder';
import { mountPage } from './dailyReload/harness';

const { fetchPool } = vi.hoisted(() => ({ fetchPool: vi.fn() }));
vi.mock('@/lib/careerLadder', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/careerLadder')>(),
  fetchCareerPool: fetchPool,
}));

function player(id: string, name: string, position = 'GK'): CareerPlayer {
  return {
    id, name, position, nationality: 'Brazil',
    seasons: Array.from({ length: 4 }, (_, sortOrder) => ({
      season: String(2000 + sortOrder), club: 'Fixture club for ' + name,
      goals: null, assists: null, appearances: null, marketValue: null, sortOrder,
    })),
  };
}

const short = player('a0000001-0000-0000-0000-000000000040', 'Alisson');
const full = player('a0000001-0000-0000-0000-000000000066', 'Alisson Becker');
const other = player('fixture-other', 'Fixture Player', 'ST');
const pool = Array.from(new Map([
  [short.id, short] as const, [full.id, full] as const, [other.id, other] as const,
  ...roster.entries.filter(([id]) => id !== short.id && id !== full.id)
    .map(([id, , , name]) => [id, player(id, name)] as const),
]).values());

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-12-25T15:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  fetchPool.mockResolvedValue(pool);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function openLadder() {
  mountPage(<CareerLadder />, '/career-ladder');
  fireEvent.click(await screen.findByRole('button', { name: "Let's Play!" }));
  return screen.findByRole('textbox', { name: 'Guess the player by name' });
}

it.each([
  ['2026-12-25', short, full, false, full.name],
  ['2027-06-11', full, short, true, 'Ederson'],
] as const)('restores the original daily ID on %s and accepts the alternate keeper name', async (date, answer, guess, submit, previousName) => {
  vi.setSystemTime(new Date(date + 'T15:00:00Z'));
  const key = 'career-ladder-daily-' + date;
  const previous = [{ t: 'wrong', name: previousName }, { t: 'reveal' }];
  localStorage.setItem(key, JSON.stringify({
    v: 1, date, puzzleIndex: 0, puzzleId: answer.id, guesses: previous, gameStatus: 'playing',
  }));

  const input = await openLadder();
  expect(screen.getByText('Not ' + previousName)).toBeInTheDocument();
  if (previousName !== guess.name) {
    fireEvent.change(input, { target: { value: previousName } });
    fireEvent.submit(input.closest('form')!);
    expect(JSON.parse(localStorage.getItem(key)!).guesses).toEqual(previous);
  }
  fireEvent.change(input, { target: { value: guess.name } });
  if (submit) fireEvent.submit(input.closest('form')!);
  else fireEvent.click(screen.getByRole('button', { name: guess.name }));
  expect(await screen.findByText('You know ball')).toBeInTheDocument();

  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({
    puzzleId: answer.id,
    guesses: [...previous, { t: 'won', score: 300 }],
    gameStatus: 'won',
  });
});

it('skips the other keeper row on the next Unlimited round', async () => {
  await openLadder();
  fireEvent.click(screen.getByRole('button', { name: /Unlimited/ }));
  expect(screen.getByText('Fixture club for Alisson')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Give up' }));
  fireEvent.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Next player' }));
  expect(screen.getByText('Fixture club for Fixture Player')).toBeInTheDocument();
  expect(screen.queryByText('Fixture club for Alisson Becker')).not.toBeInTheDocument();
});

it('does not accept a non-keeper using the same short name or merge other namesakes', () => {
  const otherAlisson = player('fixture-namesake', 'Alisson', 'CM');
  const ederson = player('fixture-keeper', 'Ederson');
  expect(ladderGuessWins(otherAlisson.name, full, [otherAlisson, full])).toBe(false);
  expect(ladderGuessWins('Éderson', ederson, [ederson])).toBe(false);
  expect(ladderGuessWins('Ederson', ederson, [ederson])).toBe(true);
});
