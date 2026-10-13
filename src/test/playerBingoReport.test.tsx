import './dailyReload/mocks';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import PlayerBingo from '@/pages/PlayerBingo';
import type { BingoCriterion, BingoData } from '@/lib/playerBingo';

const boundary = vi.hoisted(() => ({ resolve: null as ((data: BingoData) => void) | null, context: {} as Record<string, unknown>, tests: 0 }));
vi.mock('@/lib/playerBingo', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/playerBingo')>();
  return { ...real,
    fetchBingoData: () => new Promise<BingoData>(resolve => { boundary.resolve = resolve; }),
    buildCriteria: () => Array.from({ length: 24 }, (_, i): BingoCriterion => ({ id: `qzx-${i}`, kind: 'honour', label: `Qzx tile ${i}`, icon: 'T', support: [], test: () => { boundary.tests++; return i !== 0; } })),
    generateBoard: (criteria: BingoCriterion[]) => criteria,
    buildDeck: (pool: BingoData['pool']) => pool,
  };
});
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, reportGameContext }: { children: ReactNode; reportGameContext: Record<string, unknown> }) => {
  boundary.context = reportGameContext;
  return <main>{children}</main>;
} }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const rows = Array.from({ length: 40 }, (_, i) => ({
  name: `Qzx Report Player ${i}`, nationality: 'Fixture', position: 'Central Midfield',
  club: 'Qzx Fixture Club', value: 1000000, age: 25, year: 2026,
}));
const fixture: BingoData = { pool: rows, clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(), worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set() };
beforeEach(() => { boundary.resolve = null; boundary.context = {}; boundary.tests = 0; localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Player Bingo minimal report context', () => {
  it('remembers the rejected card after advancing once without repeating validation', async () => {
    const view = render(<HelmetProvider><MemoryRouter><PlayerBingo /></MemoryRouter></HelmetProvider>);
    await act(async () => { boundary.resolve!(fixture); });
    expect(boundary.context).toEqual({
      mode: 'standard', phase: 'playing', currentPlayer: { name: rows[0].name, nationality: rows[0].nationality, position: rows[0].position, club: rows[0].club, year: rows[0].year },
      playerIndex: 0, strikes: 0, criterionIds: Array.from({ length: 24 }, (_, i) => `qzx-${i}`), claimedCells: [], choice: false, endReason: null, lastRejected: null,
    });
    fireEvent.click(view.getByTitle('Qzx tile 0'));
    expect(boundary.tests).toBe(1);
    expect(boundary.context.currentPlayer).toEqual({ name: rows[1].name, nationality: rows[1].nationality, position: rows[1].position, club: rows[1].club, year: rows[1].year });
    expect(boundary.context.lastRejected).toEqual({ playerName: rows[0].name, playerYear: 2026, playerNationality: rows[0].nationality, playerPosition: rows[0].position, playerClub: rows[0].club, criterionId: 'qzx-0' });
    expect(boundary.context.playerIndex).toBe(1);
    expect(boundary.context.strikes).toBe(1);
    expect(boundary.context.claimedCells).toEqual([]);
    fireEvent.click(view.getByTitle('Qzx tile 1'));
    expect(boundary.tests).toBe(2);
    expect(boundary.context.playerIndex).toBe(2);
    expect(boundary.context.claimedCells).toEqual([1]);
    expect(boundary.context.lastRejected).toEqual({ playerName: rows[0].name, playerYear: 2026, playerNationality: rows[0].nationality, playerPosition: rows[0].position, playerClub: rows[0].club, criterionId: 'qzx-0' });
    expect(JSON.stringify(boundary.context).length).toBeLessThan(1000);
    for (const key of ['pool', 'data', 'save', 'storage', 'auth', 'support']) expect(boundary.context).not.toHaveProperty(key);
    fireEvent.click(view.getByTitle('Qzx tile 0'));
    fireEvent.click(view.getByTitle('Qzx tile 0'));
    expect(boundary.tests).toBe(4);
    expect(boundary.context.phase).toBe('lost');
    expect(boundary.context.lastRejected).toEqual({ playerName: rows[3].name, playerYear: 2026, playerNationality: rows[3].nationality, playerPosition: rows[3].position, playerClub: rows[3].club, criterionId: 'qzx-0' });
    fireEvent.click(view.getByRole('button', { name: 'Try a new board' }));
    expect(boundary.context.phase).toBe('playing');
    expect(boundary.context.playerIndex).toBe(0);
    expect(boundary.context.strikes).toBe(0);
    expect(boundary.context.lastRejected).toBeNull();
  });
});
