/**
 * Round 1329: the International panel names who won a tournament only where
 * the rule allows it (soccerWorldTruth.ts): a summer still to come, or finals
 * he played. A summer that really happened and that he watched from home
 * shows his own line and the edition's name, nothing about who won: no
 * champions line, no Bracket tile, no champion in the history list, and the
 * last tile neither names the winner nor opens the bracket.
 * scripts/simSoccerWorldTruth.mjs section 5 holds the same rule over the
 * card's and the tile's static markup.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InternationalHistoryTile, TournamentCard } from '@/components/soccer-career/InternationalPanel';
import { resetCareerMomentsForTest } from '@/components/soccer-career/careerMoments';
import type { IntlHistoryEntry, IntlTableRow, IntlTournament } from '@/lib/soccerCareerEngine';

const row = (nation: string, won: number, drawn: number, lost: number, gf: number, ga: number): IntlTableRow => ({
  nation, played: won + drawn + lost, won, drawn, lost, gf, ga, points: won * 3 + drawn,
});

function edition(year: number, myResult: string): IntlTournament {
  const called = myResult !== 'Did Not Qualify' && myResult !== 'Not Selected';
  return {
    year, name: 'World Cup', short: 'WC', kind: 'World Cup', confederation: null, nation: 'England', teams: 32,
    qualifying: { confederation: 'UEFA', table: [row('England', 6, 1, 1, 17, 5), row('Poland', 5, 1, 2, 12, 7)], myPosition: 1, through: 1, qualified: myResult !== 'Did Not Qualify', automatic: false },
    qualified: myResult !== 'Did Not Qualify',
    squad: myResult === 'Did Not Qualify' ? null : { called, role: called ? 'Starter' : null, reason: 'x', myRank: called ? 2 : 9, poolSize: 9, places: 3, myScore: 70, cutScore: 74 },
    groupTable: [], bracket: [{ round: 'F', slot: 0, home: 'Uruguay', away: 'Zambia', homeGoals: 2, awayGoals: 1, winner: 'Uruguay', mine: false }],
    champion: 'Uruguay', runnerUp: 'Zambia', myResult, matches: [], playerApps: called ? 4 : 0, playerGoals: 0, playerAssists: 0,
    playerAvgRating: called ? 6.8 : 0, goldenBoot: false, bestPlayer: false,
  } as IntlTournament;
}
const entry = (t: IntlTournament, myResult = t.myResult): IntlHistoryEntry => ({
  year: t.year, short: t.short, nation: t.nation, champion: t.champion, myResult, apps: t.playerApps, goals: 0,
});

const card = (t: IntlTournament) => render(
  <MemoryRouter><TournamentCard t={t} onDismiss={() => undefined} onSpeech={() => undefined} /></MemoryRouter>,
);
const tile = (history: IntlHistoryEntry[], last: IntlTournament) => render(
  <MemoryRouter><InternationalHistoryTile history={history} nation="England" last={last} /></MemoryRouter>,
);

beforeEach(() => { window.sessionStorage.clear(); window.localStorage.clear(); resetCareerMomentsForTest(); });
afterEach(() => { cleanup(); });

describe('the card', () => {
  it('names no winner and offers no bracket for a 2006 World Cup he missed, with a tidy three tile grid', () => {
    const { container } = card(edition(2006, 'Did Not Qualify'));
    expect(container.textContent).not.toContain('Champions:');
    expect(container.textContent).not.toContain('Uruguay');
    expect(container.querySelector('[data-intl-tile="bracket"]')).toBeNull();
    const tiles = container.querySelectorAll('[data-intl-tile]');
    expect(tiles.length).toBe(3);
    expect(tiles[0].parentElement!.className).toContain('[&>*:last-child]:col-span-2');
  });

  it('names the winner and offers the bracket for finals he played, and for a summer still to come', () => {
    for (const t of [edition(2006, 'Quarter-final'), edition(2030, 'Not Selected'), edition(2030, 'Did Not Qualify')]) {
      const { container } = card(t);
      expect(container.textContent).toContain('Champions:');
      expect(container.textContent).toContain('Uruguay');
      expect(container.querySelector('[data-intl-tile="bracket"]')).not.toBeNull();
      expect(container.querySelectorAll('[data-intl-tile]').length).toBe(4);
      cleanup();
    }
  });
});

describe('the history tile', () => {
  const played = edition(2006, 'Quarter-final');
  const watched = edition(2008, 'Not Selected');
  const outside = edition(2010, 'Did Not Qualify');
  const future = edition(2030, 'Not Selected');

  it('lists a champion only for finals he played and a summer still to come, his own line otherwise', () => {
    const history = [entry(played), entry(watched), entry(outside, ''), entry(future)];
    const { container, getByText } = tile(history, future);
    fireEvent.click(getByText('Tournaments'));
    const rows = [...container.querySelectorAll('.space-y-1 > .space-y-1')];
    expect(rows.length).toBe(4);
    const text = rows.map(r => r.textContent ?? '');
    /* newest first: 2030, 2010, 2008, 2006 */
    expect(text[0]).toContain('Uruguay');
    expect(text[1]).not.toContain('Uruguay');
    expect(text[1]).toContain('Watched from home');
    expect(text[2]).not.toContain('Uruguay');
    expect(text[3]).toContain('Uruguay');
  });

  it('keeps the last tile quiet about a missed past summer and never opens its bracket', () => {
    const { container, getByText } = tile([entry(played), entry(outside)], outside);
    expect(container.textContent).not.toContain('won it');
    expect(container.textContent).toContain('Did not qualify');
    fireEvent.click(getByText('WC 2010'));
    expect(container.textContent).toContain('Every tournament');
    expect(container.textContent).not.toContain('Final');
  });

  it('names the last winner and opens the bracket for a summer still to come (an old save reads the same way)', () => {
    const { container, getByText } = tile([entry(played), entry(future)], future);
    expect(container.textContent).toContain('Uruguay won it');
    fireEvent.click(getByText('WC 2030'));
    expect(container.textContent).toContain('World Cup 2030');
    expect(container.textContent).toContain('Final');
  });
});
