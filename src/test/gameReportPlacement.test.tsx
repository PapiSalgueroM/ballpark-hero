import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameShell } from '@/components/game/GameShell';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ReportQuestion from '@/components/game/ReportQuestion';

vi.mock('@/hooks/useRoutePath', () => ({ useRoutePath: () => '/player-bingo' }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({
  stripBrand: (title: string) => title,
  useSeoMetaTitle: () => 'Player Bingo guide',
}));
vi.mock('react-helmet-async', () => ({ Helmet: () => null }));
vi.mock('@/data/gameContent/loader', () => ({
  peekGameContent: () => null,
  loadGameContent: async () => null,
}));
vi.mock('@/components/game/ReportQuestion', () => ({
  default: ({ gameType, gameContext }: { gameType: string; gameContext?: Record<string, unknown> }) => (
    <button data-game={gameType} data-context={JSON.stringify(gameContext)}>Report a problem</button>
  ),
}));

afterEach(cleanup);

const guide = (context?: Record<string, unknown>) => (
  <GameSeoContent title="Player Bingo guide" description="Guide description" howToPlay={['Guide instruction']} reportGameContext={context} />
);

describe('game report placement', () => {
  it('puts one context-aware button after play and before the guide, including after a state change', () => {
    const page = (phase: string) => (
      <MemoryRouter>
        <GameShell width="narrow" showReportQuestion reportGameContext={{ phase }}>
          <div data-testid="play">Game board</div>
          {guide()}
        </GameShell>
      </MemoryRouter>
    );
    const view = render(page('draw'));
    const button = screen.getByRole('button', { name: 'Report a problem' });
    expect(screen.getAllByRole('button', { name: 'Report a problem' })).toHaveLength(1);
    expect(screen.getByTestId('play').compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(screen.getByText('Guide description')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button).toHaveAttribute('data-game', 'player-bingo');
    expect(JSON.parse(button.getAttribute('data-context')!)).toEqual({ phase: 'draw' });
    expect(button.closest('[data-no-prerender]')).not.toBeNull();
    view.rerender(page('done'));
    expect(JSON.parse(screen.getByRole('button').getAttribute('data-context')!)).toEqual({ phase: 'done' });
  });

  it('uses explicit page state outside GameShell', () => {
    render(<MemoryRouter>{guide({ mode: 'daily', puzzleDate: '2026-10-11' })}</MemoryRouter>);
    const button = screen.getByRole('button', { name: 'Report a problem' });
    expect(button).toHaveAttribute('data-game', 'player-bingo');
    expect(JSON.parse(button.getAttribute('data-context')!)).toEqual({ mode: 'daily', puzzleDate: '2026-10-11' });
  });

  it('keeps an existing page report and its specific state in the guide slot', () => {
    render(
      <MemoryRouter>
        <GameSeoContent
          title="Player Bingo guide" description="Guide description"
          reportControl={<ReportQuestion gameType="fixture-question" gameContext={{ target: 'Fixture Player' }} />}
        />
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Report a problem' });
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(button).toHaveAttribute('data-game', 'fixture-question');
    expect(JSON.parse(button.getAttribute('data-context')!)).toEqual({ target: 'Fixture Player' });
    expect(button.compareDocumentPosition(screen.getByText('Guide description')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the report available on archive pages that have no guide', () => {
    render(
      <MemoryRouter>
        <GameShell width="narrow" showReportQuestion reportPlacement="after-content" reportGameType="nba-grid-archive">
          <p>Archive boards</p>
        </GameShell>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Report a problem' })).toHaveAttribute('data-game', 'nba-grid-archive');
  });

  it('does not add a second control when a child board already owns reporting above the guide', () => {
    render(
      <MemoryRouter>
        <GameSeoContent title="Player Bingo guide" description="Guide description" reportControl={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Report a problem' })).toBeNull();
    expect(screen.getByText('Guide description')).toBeInTheDocument();
  });
});
