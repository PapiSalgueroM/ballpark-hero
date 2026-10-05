/**
 * Round 952 review fix: each of the four US Connect 4 PAGES mounts the finish.
 *
 * connect4ReasonShape.test.tsx drives the hooks and renders Connect4Finish on
 * its own, and simResultMoment's wiring check works at import level, so a page
 * that kept `import { Connect4FinishStatus }` and dropped the <Connect4Finish>
 * mount stayed green everywhere while the game ended with no card and no New
 * Game button (review mutation M1). This file renders the real page with the
 * hook mocked to each end state and checks what the player gets:
 *
 * 1. while playing, no finish and no status row (the baseline the rest differ from);
 * 2. a red and a blue win: the card, announced (role status), wearing the
 *    page's OWN sport (a copy-pasted gamePath shows another sport's ink, M2),
 *    the status row's disc in the winner's colour (M4), and New Game calling
 *    the hook's resetGame;
 * 3. a draw: the close state and New Game;
 * 4. every column header keeps an invisible (never hidden, never absent)
 *    arrow, which is what keeps the board from jumping 14px when the last
 *    disc lands (commit 239715b2). jsdom has no layout, so this guards the
 *    two regressions that bring the jump back rather than measuring it.
 *
 * Nothing here reaches the network: the hooks are mocked, the supabase
 * client is a stub that throws on any use, and fetch rejects.
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import NbaConnect4 from '@/pages/NbaConnect4';
import MlbConnect4 from '@/pages/MlbConnect4';
import NflConnect4 from '@/pages/NflConnect4';
import NhlConnect4 from '@/pages/NhlConnect4';

const hook = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('@/hooks/useNbaConnect4', () => ({ useNbaConnect4: () => hook.current }));
vi.mock('@/hooks/useMlbConnect4', () => ({ useMlbConnect4: () => hook.current }));
vi.mock('@/hooks/useNflConnect4', () => ({ useNflConnect4: () => hook.current }));
vi.mock('@/hooks/useNhlConnect4', () => ({ useNhlConnect4: () => hook.current }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, { get: () => { throw new Error('the supabase client is blocked in this test'); } }),
  SUPABASE_URL: 'http://127.0.0.1:9',
  SUPABASE_PUBLISHABLE_KEY: 'blocked',
}));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra?: ReactNode }) => <div>{headerExtra}{children}</div>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));

type Team = 'red' | 'blue';
type Phase = 'playing' | 'won' | 'draw';

/* The sport each page must wear is written out here, never derived from the
   page's own gamePath: deriving it would agree with a wrong path. */
const PAGES: Array<[string, ComponentType, string]> = [
  ['NBA', NbaConnect4, 'basketball'],
  ['MLB', MlbConnect4, 'baseball'],
  ['NFL', NflConnect4, 'football'],
  ['NHL', NhlConnect4, 'hockey'],
];

const COLUMNS = ['Col A', 'Col B', 'Col C', 'Col D', 'Col E', 'Col F', 'Col G'];

function endState(phase: Phase, winner: Team = 'red') {
  const cell = (r: number, c: number) => ({ team: ((r + c) % 2 ? 'blue' : 'red') as Team, playerName: `P${r}${c}` });
  const grid = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => (phase === 'draw' ? cell(r, c) : phase === 'won' && c === 0 && r >= 2 ? { team: winner, playerName: `W${r}` } : null)),
  );
  return {
    board: { id: 'fixture', name: 'Fixture Board', columnAttributes: COLUMNS, rowAttributes: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] },
    grid,
    currentTeam: 'red' as Team,
    phase,
    winInfo: phase === 'won' ? { winner, cells: [[2, 0], [3, 0], [4, 0], [5, 0]] } : null,
    isValidating: false,
    validationError: null,
    selectedCol: null,
    usedPlayers: [],
    getTargetRow: () => (phase === 'playing' ? 5 : null),
    selectColumn: vi.fn(),
    submitPlayer: vi.fn(async () => {}),
    skipTurn: vi.fn(),
    resetGame: vi.fn(),
  };
}

const mount = (Page: ComponentType) => render(<MemoryRouter><Page /></MemoryRouter>).container;

/* a plain query, not getByRole: the role walk is slow in jsdom on a busy machine */
const buttonNamed = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text);

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network is blocked in this test'); }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Every column header keeps its arrow's room: an invisible arrow, never a hidden or missing one. */
function expectHeaderArrowsKeepTheirRoom(root: HTMLElement) {
  for (const name of COLUMNS) {
    const header = buttonNamed(root, name);
    expect(header, `column header ${name}`).toBeDefined();
    const arrow = header!.querySelector('svg');
    expect(arrow, `the arrow in ${name}`).not.toBeNull();
    expect(arrow!.classList.contains('invisible'), `${name} arrow is invisible`).toBe(true);
    expect(arrow!.classList.contains('hidden'), `${name} arrow is not display none`).toBe(false);
  }
}

describe('Round 952: every US Connect 4 page mounts the shared finish', () => {
  for (const [sport, Page, sportKey] of PAGES) {
    it(`${sport}: while playing there is no finish and no status row`, () => {
      hook.current = endState('playing');
      const root = mount(Page);
      expect(root.querySelector('[data-connect4-finish]')).toBeNull();
      expect(root.querySelector('[data-connect4-status]')).toBeNull();
      expect(buttonNamed(root, 'Skip')).toBeDefined();
      expectHeaderArrowsKeepTheirRoom(root);
    }, 30000);

    for (const winner of ['red', 'blue'] as const) {
      it(`${sport}: a ${winner} win ends on the card, in this page's sport, with New Game`, () => {
        const state = endState('won', winner);
        hook.current = state;
        const root = mount(Page);
        const finish = root.querySelector('[data-connect4-finish]');
        expect(finish?.getAttribute('data-connect4-finish')).toBe('win');
        expect(finish?.getAttribute('role')).toBe('status');
        const moment = finish!.querySelector('[data-result-moment]');
        expect(moment?.getAttribute('data-result-moment')).toBe('win');
        expect(moment?.getAttribute('data-sport')).toBe(sportKey);
        const name = winner === 'red' ? 'Red' : 'Blue';
        const other = winner === 'red' ? 'blue' : 'red';
        expect(finish!.querySelector('h2')?.textContent).toBe(`${name} wins!`);
        expect(finish!.querySelector(`[data-connect4-disc="${winner}"]`)).not.toBeNull();
        expect(finish!.querySelector(`[data-connect4-disc="${other}"]`)).toBeNull();
        const status = root.querySelector('[data-connect4-status]');
        expect(status?.getAttribute('data-connect4-status')).toBe('win');
        expect(status?.textContent).toBe(`${name} connected four`);
        expect(status!.querySelector(`[data-connect4-disc="${winner}"]`)).not.toBeNull();
        expect(status!.querySelector(`[data-connect4-disc="${other}"]`)).toBeNull();
        expect(buttonNamed(root, 'Skip')).toBeUndefined();
        expectHeaderArrowsKeepTheirRoom(root);
        const newGame = buttonNamed(finish as HTMLElement, 'New Game');
        expect(newGame).toBeDefined();
        fireEvent.click(newGame!);
        expect(state.resetGame).toHaveBeenCalledTimes(1);
      }, 30000);
    }

    it(`${sport}: a full board is the close state, in this page's sport, with New Game`, () => {
      const state = endState('draw');
      hook.current = state;
      const root = mount(Page);
      const finish = root.querySelector('[data-connect4-finish]');
      expect(finish?.getAttribute('data-connect4-finish')).toBe('draw');
      expect(finish?.getAttribute('role')).toBe('status');
      const moment = finish!.querySelector('[data-result-moment]');
      expect(moment?.getAttribute('data-result-moment')).toBe('close');
      expect(moment?.getAttribute('data-sport')).toBe(sportKey);
      expect(finish!.querySelector('h2')?.textContent).toBe("It's a draw!");
      expect(root.querySelector('[data-connect4-status]')?.textContent).toBe('Board full, no four in a row');
      expectHeaderArrowsKeepTheirRoom(root);
      const newGame = buttonNamed(finish as HTMLElement, 'New Game');
      expect(newGame).toBeDefined();
      fireEvent.click(newGame!);
      expect(state.resetGame).toHaveBeenCalledTimes(1);
    }, 30000);
  }
});
