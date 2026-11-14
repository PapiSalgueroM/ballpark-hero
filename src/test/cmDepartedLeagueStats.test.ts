import { createElement } from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CmCardsProvider } from '@/components/club-manager/CmCards';
import { LeagueLeadersCard } from '@/components/club-manager/LeagueLeadersCard';
import {
  acceptBid, careerLeagueOf, finishSeason, generateIncomingBids, goldenBootTable, leagueBoardsOf, loadCareer, loanOutPlayer, playNextEntry,
  recallLoanedPlayer, releasePlayer, saveCareer, setTransferStatus, startCareer, startNextSeason, worldRosterFor,
} from '@/lib/clubManager';
import { leaders } from '@/lib/clubManagerLeagueBoards';
import { creditGoal, openBook } from '@/lib/clubManagerLeagueBook';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: null, SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '',
}));

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

function seedMatches(seed: number) {
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed + 0x6d2b79f5) | 0;
    let draw = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    draw = (draw + Math.imul(draw ^ (draw >>> 7), 61 | draw)) ^ draw;
    return ((draw ^ (draw >>> 14)) >>> 0) / 4294967296;
  });
}

function january(club: string, seed: number) {
  seedMatches(seed);
  let career = startCareer(club);
  for (let i = 0; i < 60 && career.transferWindow !== 'january'; i++) {
    career = playNextEntry(career, { skipHalftime: true, noCoach: true }).state;
  }
  expect(career.transferWindow).toBe('january');
  return career;
}

describe('departed players in Club Manager league stats', () => {
  it.each([
    { club: 'Arsenal', player: 'Viktor Gyökeres', seed: 7493905, bidSeed: 7493905, buyer: 'Como', sameLeague: false },
    { club: 'Liverpool', player: 'Alexander Isak', seed: 7493917, bidSeed: 7493938, buyer: 'Manchester United', sameLeague: true },
  ])('keeps $player’s earned goals at $club after selling him to $buyer', ({ club, player, seed, bidSeed, buyer, sameLeague }) => {
    const januaryCareer = january(club, seed);
    const target = januaryCareer.squad.find(p => p.name === player)!;
    const career = setTransferStatus(januaryCareer, target.id, 'listed');
    seedMatches(bidSeed);
    generateIncomingBids(career);
    expect(career.incomingBids?.find(bid => bid.playerId === target.id)).toMatchObject({ club: buyer, fromListing: true });
    expect(career.leagueClubs?.includes(buyer)).toBe(sameLeague);
    const goals = target.comp?.league?.goals ?? 0;
    expect(goals).toBeGreaterThan(0);
    const before = leagueBoardsOf(career)!;
    expect(career.departedLeagueLines).toBeUndefined();
    expect(leaders(before.input, 'goals').find(p => p.name === player)).toMatchObject({ club, n: goals });

    const sold = acceptBid(career, target.id)!;
    expect(sold.squad.some(p => p.id === target.id)).toBe(false);
    expect(worldRosterFor(sold, buyer).some(p => p.n === player)).toBe(true);
    expect(sold.table).toEqual(career.table);
    expect(sold.departedLeagueLines).toEqual([expect.objectContaining({ club, leagueId: careerLeagueOf(career).id, goals })]);

    expect(saveCareer(sold)).toBe(true);
    for (const state of [sold, loadCareer()!]) {
      const board = leagueBoardsOf(state)!;
      expect(leaders(board.input, 'goals').find(p => p.name === player)).toMatchObject({ club, n: goals, departed: true });
      expect(goldenBootTable(state, 100).find(p => p.name === player)).toMatchObject({ club, goals });
      expect(goldenBootTable(state, 100, null).find(p => p.name === player)).toMatchObject({ club, goals });
    }
    const view = render(createElement(CmCardsProvider, {
      children: createElement(LeagueLeadersCard, { career: sold, board: 'goals', onBoard: vi.fn() }),
    }));
    const rows = [...view.container.querySelectorAll('[data-cm-board-row]')];
    const archived = rows.find(row => row.querySelector('[data-cm-board-name]')?.textContent === player)!;
    expect(archived.querySelector('[data-cm-board-club]')?.textContent).toBe(club);
    expect(archived.querySelector('[data-cm-card-link]')).toBeNull();
    expect(rows.some(row => row.querySelector('[data-cm-card-link]'))).toBe(true);
    view.unmount();
  });

  it('restores a recalled loanee without counting his first stint twice', () => {
    const career = january('Arsenal', 7493905);
    const player = career.squad.find(p => p.name === 'Viktor Gyökeres')!;
    const expected = player.comp!.league!.goals;
    expect(expected).toBeGreaterThan(0);
    const away = loanOutPlayer(career, player.id, 'Everton')!;
    const recalled = recallLoanedPlayer(away, player.id)!;
    for (const state of [away, recalled]) {
      const board = leagueBoardsOf(state)!;
      expect(leaders(board.input, 'goals', 1000).filter(p => p.name === player.name)).toEqual([
        expect.objectContaining({ club: 'Arsenal', n: expected }),
      ]);
    }
    expect(recalled.departedLeagueLines).toHaveLength(0);
  });

  it('keeps a same-league loan, recall, second departure and another player’s row distinct', () => {
    const career = january('Arsenal', 7493905);
    const player = career.squad.find(p => p.name === 'Viktor Gyökeres')!;
    const teammate = career.squad.find(p => p.name === 'Bukayo Saka')!;
    const playerGoals = player.comp!.league!.goals;
    const teammateGoals = teammate.comp!.league!.goals;
    expect(playerGoals).toBeGreaterThan(0);
    expect(teammateGoals).toBeGreaterThan(0);
    expect(career.leagueClubs).toContain('Everton');

    const away = loanOutPlayer(career, player.id, 'Everton')!;
    const anotherDeparture = releasePlayer(away, teammate.id)!;
    const recalled = recallLoanedPlayer(anotherDeparture, player.id)!;
    expect(loanOutPlayer(recalled, player.id, 'Everton')).toBeNull();
    const secondDeparture = releasePlayer(recalled, player.id)!;
    expect(secondDeparture.history).toEqual(career.history);
    expect(secondDeparture.table).toEqual(career.table);

    for (const state of [anotherDeparture, recalled, secondDeparture]) {
      const rows = leaders(leagueBoardsOf(state)!.input, 'goals', 1000);
      expect(rows.filter(p => p.name === player.name)).toEqual([
        expect.objectContaining({ club: 'Arsenal', n: playerGoals }),
      ]);
      expect(rows.filter(p => p.name === teammate.name)).toEqual([
        expect.objectContaining({ club: 'Arsenal', n: teammateGoals, departed: true }),
      ]);
    }
  });

  it('retains a released keeper’s league clean sheets', () => {
    const career = january('Arsenal', 7493905);
    const before = leagueBoardsOf(career)!;
    const keeper = leaders(before.input, 'sheets', 1000).find(p => p.mine)!;
    const player = career.squad.find(p => p.name === keeper.name)!;
    expect(keeper.n).toBeGreaterThan(0);
    const released = releasePlayer(career, player.id)!;
    expect(released.squad.some(p => p.id === player.id)).toBe(false);
    expect(leaders(leagueBoardsOf(released)!.input, 'sheets', 1000)).toContainEqual(
      expect.objectContaining({ club: 'Arsenal', name: keeper.name, n: keeper.n }),
    );
  });

  it('keeps the older scorer race without claiming pre-book stats in a late book', () => {
    const career = { ...january('Arsenal', 7493905), leagueBook: undefined };
    const player = career.squad.find(p => p.name === 'Viktor Gyökeres')!;
    const released = releasePlayer(career, player.id)!;
    expect(goldenBootTable(released, 1000)).toContainEqual(
      expect.objectContaining({ club: 'Arsenal', name: player.name, goals: player.comp!.league!.goals }),
    );
    let later = released;
    for (let i = 0; i < 10 && !leagueBoardsOf(later); i++) {
      later = playNextEntry(later, { skipHalftime: true, noCoach: true }).state;
    }
    const late = leagueBoardsOf(later)!;
    expect(late.from).not.toBeNull();
    expect(leaders(late.input, 'goals', 1000).some(p => p.name === player.name)).toBe(false);
  });

  it('keeps separate club rows when a rival book row has no stable identity', () => {
    const career = january('Liverpool', 7493906);
    const player = career.squad.find(p => p.name === 'Alexander Isak')!;
    const buyer = 'Manchester United';
    const moved = loanOutPlayer(career, player.id, buyer)!;
    const input = leagueBoardsOf(moved)!.input;
    expect(input.clubs.some(club => club.club === buyer)).toBe(true);
    const book = openBook(input.book.s);
    expect(creditGoal(book, buyer, { n: player.name, p: player.position, r: player.rating })).toBe(true);
    expect(leaders({ ...input, book }, 'goals', 1000).filter(p => p.name === player.name)).toEqual([
      expect.objectContaining({ club: 'Liverpool', n: player.comp!.league!.goals }),
      expect.objectContaining({ club: buyer, n: 1 }),
    ]);
  });

  it('drops the retained stints at rollover while retaining the completed season', () => {
    const career = january('Arsenal', 7493905);
    const player = career.squad.find(p => p.name === 'Viktor Gyökeres')!;
    let played = releasePlayer(career, player.id)!;
    expect(played.departedLeagueLines).toHaveLength(1);
    for (let i = 0; i < 120 && played.week < played.calendar.length; i++) {
      played = playNextEntry(played, { skipHalftime: true, noCoach: true }).state;
    }
    expect(played.week).toBe(played.calendar.length);
    const { state: closed } = finishSeason(played);
    expect(closed.pendingSummary).toBeTruthy();
    const next = startNextSeason(closed);
    expect(next.season).toBe(closed.season + 1);
    expect(next.departedLeagueLines).toBeUndefined();
    expect(next.history.some(record => record.season === closed.season)).toBe(true);
    expect(leaders(leagueBoardsOf(next)!.input, 'goals')).toEqual([]);
  });
});
