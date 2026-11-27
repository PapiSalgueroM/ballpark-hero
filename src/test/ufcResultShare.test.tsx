import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import UfcGame from '@/pages/UfcGame';
import { dailyUfcFighters, uniqueUfcFighters } from '@/data/ufcFighters';
import { dailyIndex } from '@/lib/dateUtils';

vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const date = '2026-11-11';
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(date + 'T17:00:00Z'));
  localStorage.clear();
  localStorage.setItem('ufc-rules-seen', '1');
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each(['win', 'give up', 'give up before guessing'] as const)('shares the played clue rows without revealing the daily fighter on a %s', async (outcome) => {
  const share = vi.fn(async (_data: { text: string }) => {});
  const writeText = vi.fn(async (_text: string) => {});
  vi.stubGlobal('navigator', Object.create(navigator, { share: { value: share }, clipboard: { value: { writeText } } }));
  const target = dailyUfcFighters[dailyIndex(date, dailyUfcFighters.length)].name;
  const wrong = uniqueUfcFighters.find(fighter => fighter.name !== target)!.name;
  const view = render(<UfcGame />);
  function pick(name: string) {
    fireEvent.change(screen.getByRole('textbox', { name: 'Search for a fighter' }), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: text => text.startsWith(name) }));
  }
  if (outcome !== 'give up before guessing') pick(wrong);
  if (outcome === 'win') pick(target);
  else {
    fireEvent.click(screen.getByRole('button', { name: 'Give up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
  }
  expect(screen.getByText(outcome === 'win' ? 'You guessed' : 'The fighter was', { exact: false })).toHaveTextContent(target);
  const colors: Record<string, string> = { Exact: '🟩', Close: '🟨', 'No match': '⬜' };
  const board = screen.getByRole('region', { name: 'Fighter comparison board' });
  const squares = Array.from(board.querySelectorAll('.sr-only'), cell => colors[cell.textContent!.split(' · ')[0]]);
  const expectedRows = outcome === 'win' ? 2 : outcome === 'give up' ? 1 : 0;
  expect(squares).toHaveLength(expectedRows * 9);
  const grid = expectedRows ? Array.from({ length: expectedRows }, (_, i) => squares.slice(i * 9, i * 9 + 9).join('')).join('\n') : 'No guesses made';
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Share result' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Copy Score Card/ })); });
  const card = view.container.querySelector('pre')!.parentElement!.textContent!;
  for (const text of [share.mock.calls[0][0].text, writeText.mock.calls[0][0], card]) {
    expect(text).not.toContain(target);
    expect(text).not.toContain(wrong);
    expect(text).toContain(grid);
    expect(text).toContain(outcome === 'win' ? '2/8' : 'X/8');
  }
});
