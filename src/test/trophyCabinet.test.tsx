import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import TrophyCabinet, { trophyWins, type TrophyCategory } from '@/components/soccer-career/TrophyCabinet';
import { getCareerTotals, type CareerState, type SeasonRecord } from '@/lib/soccerCareerEngine';

const season = (changes: Partial<SeasonRecord> = {}): SeasonRecord => ({
  year: 2026, age: 22, club: 'Harbour Town', clubCountry: 'England', clubTier: 2,
  apps: 35, goals: 27, assists: 11, cleanSheets: 8, yellowCards: 3, redCards: 0, rating: 7.6,
  leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false,
  ballonDor: false, ballonDorRank: null, type: 'playing',
  intApps: 6, intGoals: 3, intAssists: 2, intRating: 0, tournament: null, tournamentResult: null,
  ...changes,
});

const career = (seasons: SeasonRecord[], changes: Partial<CareerState> = {}): CareerState => ({
  playerName: 'Cabinet Tester', nationality: 'Brazil', position: 'ST', currentClub: 'New Harbour', seasons,
  awards: [], ...changes,
} as CareerState);

function openWin(container: HTMLElement, year: number) {
  const tile = container.querySelector<HTMLButtonElement>(`[data-trophy-win="${year}"]`);
  expect(tile, `A win in ${year} is offered`).not.toBeNull();
  fireEvent.click(tile!);
}

const stat = (scope: HTMLElement, label: string) => within(scope).getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Soccer Career trophy cabinet records', () => {
  it('matches all seven actual career counters without counting awards or national history twice', () => {
    const source = career([
      season({ year: 2026, leagueTitle: true, domesticCup: true }),
      season({ year: 2028, championsLeague: true, worldCup: true, ballonDor: true }),
      season({ year: 2029 }),
      season({ year: 2030, clubCupTitle: 'Copa Libertadores', continentalCup: true }),
    ], {
      awards: [{ year: 2028, name: 'World Cup', emoji: '🏆' }, { year: 2028, name: "Ballon d'Or", emoji: '🏅' }],
      intlHistory: [{ year: 2028, short: 'World Cup', nation: 'Brazil', champion: 'Brazil', myResult: 'Winner', apps: 6, goals: 3 }],
    });
    const totals = getCareerTotals(source.seasons);
    const expected = {
      league: totals.leagueTitles, domestic: totals.domesticCups, ucl: totals.championsLeagues,
      club: totals.clubCups, world: totals.worldCups, continental: totals.continentalCups, ballon: totals.ballonDors,
    };
    for (const category of Object.keys(expected) as TrophyCategory[]) {
      expect(trophyWins(source, category), category).toHaveLength(expected[category]);
      expect(trophyWins(source, category).some(row => row.year === 2029), `${category} excludes the losing season`).toBe(false);
    }
  });

  it('returns the actual winning rows newest first and leaves the source seasons untouched', () => {
    const older = season({ year: 2026, leagueTitle: true });
    const loser = season({ year: 2027 });
    const newer = season({ year: 2028, leagueTitle: true, club: 'Rivertown' });
    const source = career([older, loser, newer]);
    const before = JSON.stringify(source);
    Object.freeze(source.seasons);
    expect(trophyWins(source, 'league')).toEqual([newer, older]);
    expect(trophyWins(source, 'league')[0]).toBe(newer);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('does not grant a win just because a losing season has a cup run, an award or a national winner', () => {
    const source = career([season({ tournament: 'World Cup', tournamentResult: 'Runner-up' })], {
      awards: [{ year: 2026, name: 'World Cup', emoji: '🏆' }],
      intlHistory: [{ year: 2026, short: 'World Cup', nation: 'Brazil', champion: 'Brazil', myResult: 'Not Selected', apps: 0, goals: 0 }],
    });
    expect(trophyWins(source, 'world')).toEqual([]);
    const view = render(<TrophyCabinet career={source} category="world" onClose={vi.fn()} />);
    expect(view.getByText('No wins recorded here yet.')).toBeVisible();
    expect(view.container.querySelectorAll('[data-trophy-win]')).toHaveLength(0);
  });

  it('keeps old flags without fabricating names or numbers missing from a saved row', () => {
    const old = season({ year: 1994, domesticCup: true, apps: 0, rating: 0 });
    delete old.cupRun;
    delete old.continentalCup;
    delete old.clubCupTitle;
    delete old.ovr;
    const source = career([old]);
    expect(trophyWins(source, 'domestic')).toHaveLength(1);
    expect(trophyWins(source, 'club')).toEqual([]);
    expect(trophyWins(source, 'continental')).toEqual([]);
    const view = render(<TrophyCabinet career={source} category="domestic" onClose={vi.fn()} />);
    openWin(view.container, 1994);
    expect(view.getByRole('heading', { name: 'Domestic cup' })).toBeVisible();
    expect(view.getByText('Cup match details were not kept in this save.')).toBeVisible();
    const totals = view.getByRole('region', { name: 'Club season totals' });
    expect(stat(totals, 'Apps')).toBe('0');
    expect(stat(totals, 'Rating')).toBe('-');
    expect(within(totals).getByLabelText('not recorded')).toBeVisible();
  });
});

describe('Soccer Career trophy cabinet panel', () => {
  it('opens the recorded year and club, shows full season stats, then returns to the same win list', () => {
    const source = career([
      season({ year: 2024, leagueTitle: true, club: 'Rivertown' }),
      season({ year: 2026, leagueTitle: true }),
      season({ year: 2028 }),
    ]);
    const view = render(<TrophyCabinet career={source} category="league" onClose={vi.fn()} />);
    const tiles = [...view.container.querySelectorAll('[data-trophy-win]')];
    expect(tiles.map(tile => tile.getAttribute('data-trophy-win'))).toEqual(['2026', '2024']);
    expect(view.getByText('2 wins. Pick a season to see what you did.')).toBeVisible();
    openWin(view.container, 2026);
    expect(view.getByText('2026/27 · Harbour Town')).toBeVisible();
    expect(view.queryByText('New Harbour')).toBeNull();
    const totals = view.getByRole('region', { name: 'Club season totals' });
    expect(stat(totals, 'Apps')).toBe('35');
    expect(stat(totals, 'Goals')).toBe('27');
    expect(stat(totals, 'Assists')).toBe('11');
    expect(stat(totals, 'Rating')).toBe('7.6');
    expect(view.getByRole('heading', { name: 'League title' })).toHaveFocus();
    fireEvent.keyDown(view.getByRole('heading', { name: 'League title' }), { key: 'Tab' });
    expect(view.getByRole('button', { name: '‹ Back' })).toHaveFocus();
    fireEvent.click(view.getByRole('button', { name: '‹ All wins' }));
    expect([...view.container.querySelectorAll('[data-trophy-win]')].map(tile => tile.getAttribute('data-trophy-win'))).toEqual(['2026', '2024']);
    expect(view.container.querySelector('[data-trophy-win="2026"]')).toHaveFocus();
  });

  it('uses the recorded continental competition and keeps national numbers separate from club totals', () => {
    const source = career([season({ continentalCup: true, tournament: 'Copa América', tournamentResult: 'Winner' })]);
    const view = render(<TrophyCabinet career={source} category="continental" onClose={vi.fn()} />);
    openWin(view.container, 2026);
    expect(view.getByRole('heading', { name: 'Copa América' })).toBeVisible();
    expect(view.getByText('Won with Brazil')).toBeVisible();
    const national = view.getByRole('region', { name: 'International season totals' });
    expect(stat(national, 'Apps')).toBe('6');
    expect(stat(national, 'Goals')).toBe('3');
    expect(stat(national, 'Assists')).toBe('2');
    expect(stat(national, 'Rating')).toBe('-');
    const club = view.getByRole('region', { name: 'Club season totals' });
    expect(stat(club, 'Apps')).toBe('35');
    expect(stat(club, 'Goals')).toBe('27');
    expect(stat(club, 'Rating')).toBe('7.6');
  });

  it('reads a non-European club cup under its own saved name', () => {
    const source = career([season({ clubCupTitle: 'Copa Libertadores' })]);
    const view = render(<TrophyCabinet career={source} category="club" onClose={vi.fn()} />);
    openWin(view.container, 2026);
    expect(view.getByRole('heading', { name: 'Copa Libertadores' })).toBeVisible();
    expect(view.queryByText('European club title')).toBeNull();
  });

  it('shows a saved domestic cup route and final without substituting season goals for cup goals', () => {
    const source = career([season({ domesticCup: true, cupRun: {
      cup: 'FA Cup',
      stages: [{ stage: 'early', won: true }, { stage: 'SF', opp: 'Rivertown', won: true, for: 2, against: 1 }, { stage: 'F', opp: 'Harbour City', won: true }],
      final: { for: 1, against: 0, legs: 1, scored: true },
    } })]);
    const view = render(<TrophyCabinet career={source} category="domestic" onClose={vi.fn()} />);
    openWin(view.container, 2026);
    expect(view.getByRole('heading', { name: 'FA Cup' })).toBeVisible();
    expect(view.getByText('Semi-final: beat Rivertown 2-1')).toBeVisible();
    expect(view.getByText('Final: beat Harbour City 1-0, and you scored')).toBeVisible();
    expect(stat(view.getByRole('region', { name: 'Club season totals' }), 'Goals')).toBe('27');
    expect(view.getByText('These are the saved season totals, across all competitions.')).toBeVisible();
  });

  it('keeps the saved loan parent instead of the player current club', () => {
    const view = render(<TrophyCabinet career={career([season({ leagueTitle: true, onLoanFrom: 'Old Harbour' })])} category="league" onClose={vi.fn()} />);
    openWin(view.container, 2026);
    expect(view.getByText('On loan from Old Harbour')).toBeVisible();
    expect(view.getByText('2026/27 · Harbour Town')).toBeVisible();
  });

  it('keeps help reopenable, returns to the picked win, and never changes the career record', () => {
    const source = career([season({ leagueTitle: true })]);
    const before = JSON.stringify(source);
    const view = render(<TrophyCabinet career={source} category="league" onClose={vi.fn()} />);
    openWin(view.container, 2026);
    const help = view.getByRole('button', { name: 'Trophy cabinet help' });
    fireEvent.click(help);
    expect(help).toHaveAttribute('aria-expanded', 'true');
    expect(view.getByText(/Example: a season with one league title/)).toBeVisible();
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    expect(view.container.querySelector('[data-trophy-detail="2026"]')).not.toBeNull();
    fireEvent.click(help);
    expect(view.container.querySelector('[data-trophy-help]')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    fireEvent.click(view.getByRole('button', { name: '‹ All wins' }));
    fireEvent.click(help);
    fireEvent.click(view.getByRole('button', { name: 'Back to wins' }));
    expect(help).toHaveFocus();
    expect(JSON.stringify(source)).toBe(before);
  });

  it('locks the page, keeps keyboard focus inside, and restores the opener and body styles on close', () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Open league titles';
    document.body.append(trigger);
    trigger.focus();
    document.body.style.overflow = 'auto';
    const priorPadding = document.body.style.paddingRight;
    const view = render(<TrophyCabinet career={career([season({ leagueTitle: true })])} category="league" onClose={vi.fn()} />);
    const dialog = view.getByRole('dialog', { name: 'League titles' });
    expect(dialog).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    const buttons = within(dialog).getAllByRole('button');
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();
    view.unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.paddingRight).toBe(priorPadding);
    document.body.style.overflow = '';
    trigger.remove();
  });

  it('closes by Escape, Back and the backdrop but keeps content clicks inside the panel', () => {
    const close = vi.fn();
    const view = render(<TrophyCabinet career={career([])} category="league" onClose={close} />);
    const dialog = view.getByRole('dialog', { name: 'League titles' });
    fireEvent.click(view.getByText('No wins recorded here yet.'));
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
    fireEvent.click(view.getByRole('button', { name: '‹ Back' }));
    expect(close).toHaveBeenCalledTimes(2);
    fireEvent.click(view.container.querySelector('[data-trophy-cabinet]')!);
    expect(close).toHaveBeenCalledTimes(3);
  });
});
