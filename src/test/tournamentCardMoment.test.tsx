/**
 * Round 926: winning an international tournament becomes a moment.
 *
 * TournamentCard is the card every World Cup, Euros or Copa run ends on. A
 * won tournament now lands with gold confetti, the trophy and the title
 * slamming in and the lines under them ticking in on the kit's pace. A lost or
 * missed one stays quiet: one plain rise, no shake, no confetti.
 *
 * What this file holds, over a winner fixture and a group exit fixture:
 *  1. the winner has the confetti layer and cm-slam on the heading, the group
 *     exit has neither (and no shake), only a plain cm-rise on the card;
 *  2. every number in the markup is a number the fixture carries (or one the
 *     card derives from it in plain sight: the group position and size);
 *  3. the staggered delays strictly increase top to bottom, and the speech
 *     buttons land last, gated so they cannot be pressed before they show;
 *  4. the moment plays once: opening a tile and coming Back does not replay
 *     it, a second mount of the same card does not replay it, a reload (fresh
 *     module, same tab storage) does not replay it, and the control (fresh
 *     module, storage cleared) proves it is the memory doing the stopping.
 *
 * Rendered with testing-library rather than react-dom/server because the
 * confetti draws in an effect (it honours reduced motion there), and a static
 * render would report it missing on a card that does draw it. Reduced motion
 * itself is CSS that jsdom does not apply; the kit's own block holds it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TournamentCard } from '@/components/soccer-career/InternationalPanel';
import type { IntlTournament, IntlTableRow } from '@/lib/soccerCareerEngine';

const row = (nation: string, won: number, drawn: number, lost: number, gf: number, ga: number): IntlTableRow => ({
  nation, played: won + drawn + lost, won, drawn, lost, gf, ga, points: won * 3 + drawn,
});

function winner(year = 2030): IntlTournament {
  return {
    year, name: 'World Cup', short: 'WC', kind: 'World Cup',
    confederation: null, nation: 'Portugal', teams: 48,
    qualifying: { confederation: 'UEFA', table: [row('Portugal', 6, 1, 1, 17, 5), row('Poland', 5, 1, 2, 12, 7)], myPosition: 1, through: 1, qualified: true, automatic: false },
    qualified: true,
    squad: { called: true, role: 'Starter', reason: 'You are in.', myRank: 2, poolSize: 9, places: 3, myScore: 81, cutScore: 74 },
    groupTable: [row('Portugal', 2, 1, 0, 6, 2), row('Ghana', 1, 1, 1, 3, 3), row('Uruguay', 1, 0, 2, 2, 4), row('Japan', 0, 2, 1, 2, 4)],
    groupLabel: 'Group F', thirdsThrough: 8,
    bracket: [
      { round: 'SF', slot: 0, home: 'Portugal', away: 'France', homeGoals: 2, awayGoals: 1, winner: 'Portugal', mine: true },
      { round: 'SF', slot: 1, home: 'Brazil', away: 'Spain', homeGoals: 1, awayGoals: 1, pens: true, winner: 'Brazil', mine: false },
      { round: 'F', slot: 0, home: 'Portugal', away: 'Brazil', homeGoals: 3, awayGoals: 2, winner: 'Portugal', mine: true },
    ],
    champion: 'Portugal', runnerUp: 'Brazil', myResult: 'Winner',
    matches: [
      { round: 'SF', home: 'Portugal', away: 'France', homeGoals: 2, awayGoals: 1, pens: false, playerGoals: 1, playerAssists: 1, playerRating: 8.2 },
      { round: 'Final', home: 'Portugal', away: 'Brazil', homeGoals: 3, awayGoals: 2, pens: false, playerGoals: 2, playerAssists: 0, playerRating: 9.1 },
    ],
    playerApps: 7, playerGoals: 6, playerAssists: 3, playerAvgRating: 7.86,
    goldenBoot: true, bestPlayer: true,
  };
}

function groupExit(year = 2028): IntlTournament {
  return {
    ...winner(year), name: 'European Championship', short: 'Euros', kind: 'Continental',
    confederation: 'UEFA', nation: 'Scotland', teams: 24,
    groupTable: [row('Germany', 3, 0, 0, 8, 1), row('Switzerland', 1, 1, 1, 3, 3), row('Hungary', 1, 0, 2, 2, 5), row('Scotland', 0, 1, 2, 2, 6)],
    qualifying: { confederation: 'UEFA', table: [row('Scotland', 5, 2, 1, 14, 6), row('Norway', 4, 2, 2, 11, 8)], myPosition: 1, through: 1, qualified: true, automatic: false },
    groupLabel: 'Group A', thirdsThrough: 4,
    bracket: [{ round: 'F', slot: 0, home: 'Spain', away: 'England', homeGoals: 2, awayGoals: 1, winner: 'Spain', mine: false }],
    champion: 'Spain', runnerUp: 'England', myResult: 'Group Stage',
    matches: [{ round: 'Group', home: 'Scotland', away: 'Germany', homeGoals: 1, awayGoals: 5, pens: false, playerGoals: 1, playerAssists: 0, playerRating: 6.4 }],
    playerApps: 3, playerGoals: 1, playerAssists: 0, playerAvgRating: 6.43,
    goldenBoot: false, bestPlayer: false,
  };
}

function mount(t: IntlTournament, Card: typeof TournamentCard = TournamentCard) {
  return render(
    <MemoryRouter>
      <Card t={t} onDismiss={() => undefined} onSpeech={() => undefined} />
    </MemoryRouter>,
  );
}

const card = (c: HTMLElement) => c.querySelector('[data-intl-moment]') as HTMLElement;
const confettiPieces = (c: HTMLElement) => c.querySelectorAll('.animate-confetti-fall').length;

/** Every number the fixture carries, as the card could print it: whole, and to
    one decimal place (the average rating). Plus the two the card derives in
    plain sight from the group table: where the nation finished and out of how
    many. Nothing else may appear. */
function fixtureNumbers(t: IntlTournament): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === 'number') { out.add(String(v)); out.add(v.toFixed(1)); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(t);
  out.add(String(t.groupTable.length));
  out.add(String(t.groupTable.findIndex(r => r.nation === t.nation) + 1));
  return out;
}

function strayNumbers(c: HTMLElement, t: IntlTournament): string[] {
  const allowed = fixtureNumbers(t);
  const printed = (card(c).textContent ?? '').match(/\d+(?:\.\d+)?/g) ?? [];
  return printed.filter(n => !allowed.has(n));
}

/** The card's own staggered lines in document order, the confetti excluded
    (its pieces carry their own scattered delays and are aria hidden). */
function staggerDelays(c: HTMLElement): number[] {
  return [...card(c).querySelectorAll<HTMLElement>('[style]')]
    .filter(el => el.style.animationDelay && !el.closest('[aria-hidden="true"]'))
    .map(el => parseFloat(el.style.animationDelay));
}

beforeEach(() => { window.sessionStorage.clear(); });
afterEach(() => { cleanup(); });

describe('Round 926: the won tournament moment', () => {
  it('a won World Cup lands with gold confetti and the title slamming in', () => {
    const { container } = mount(winner(2030));
    expect(card(container).dataset.intlMoment).toBe('won');
    expect(confettiPieces(container)).toBeGreaterThan(0);
    const h3 = card(container).querySelector('h3') as HTMLElement;
    expect(h3.textContent).toBe('World Cup 2030');
    expect(h3.className).toContain('cm-slam');
    expect(card(container).querySelectorAll('.cm-tick-in').length).toBe(8);
    expect(card(container).className).not.toContain('cm-loss-shake');
  });

  it('a group exit stays quiet: one plain rise, no confetti, no slam, no shake', () => {
    const { container } = mount(groupExit(2028));
    expect(card(container).dataset.intlMoment).toBe('quiet');
    expect(card(container).className).toContain('cm-rise');
    expect(confettiPieces(container)).toBe(0);
    expect(container.querySelectorAll('.cm-slam, .cm-loss-shake, .cm-tick-in').length).toBe(0);
    expect(staggerDelays(container)).toEqual([]);
  });

  it('every number on either card is a number the fixture carries', () => {
    const won = mount(winner(2031));
    expect((card(won.container).textContent ?? '').match(/\d+/g)?.length).toBeGreaterThan(8);
    expect(strayNumbers(won.container, winner(2031))).toEqual([]);
    cleanup();
    const lost = mount(groupExit(2029));
    expect(strayNumbers(lost.container, groupExit(2029))).toEqual([]);
  });

  it('the control: a number the fixture never carried is caught', () => {
    const { container } = mount(winner(2032));
    const extra = document.createElement('span');
    extra.textContent = 'Golden Boot, 99 goals';
    card(container).appendChild(extra);
    expect(strayNumbers(container, winner(2032))).toEqual(['99']);
  });

  it('the staggered lines strictly increase, and the speech lands last and gated', () => {
    const { container } = mount(winner(2033));
    const delays = staggerDelays(container);
    /* trophy, title, nation row, champions line, four stat tiles, honours,
       four tiles, the speech: fourteen beats on a won card with honours. */
    expect(delays.length).toBe(14);
    for (let i = 1; i < delays.length; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    const gated = card(container).querySelector('.cm-rise-gated') as HTMLElement;
    expect(gated).not.toBeNull();
    expect(parseFloat(gated.style.animationDelay)).toBe(delays[delays.length - 1]);
    expect(gated.querySelectorAll('button').length).toBeGreaterThan(0);
    /* No animated class sits on a control: every button's own class is clean. */
    for (const b of card(container).querySelectorAll('button')) {
      expect(b.className).not.toMatch(/\bcm-(rise|slam|tick-in|rise-gated)\b/);
    }
  });
});

describe('Round 926: the moment plays once', () => {
  it('opening a tile and coming Back does not replay it', () => {
    const { container, getByText } = mount(winner(2034));
    expect(card(container).dataset.intlMoment).toBe('won');
    fireEvent.click(getByText('Bracket'));
    fireEvent.click(getByText(/Back/));
    expect(card(container).dataset.intlMoment).toBe('none');
    expect(confettiPieces(container)).toBe(0);
    expect(container.querySelectorAll('.cm-slam, .cm-tick-in, .cm-rise, .cm-rise-gated').length).toBe(0);
  });

  it('a second mount of the same card does not replay it, a different tournament does', () => {
    mount(winner(2035));
    cleanup();
    const again = mount(winner(2035));
    expect(card(again.container).dataset.intlMoment).toBe('none');
    expect(confettiPieces(again.container)).toBe(0);
    cleanup();
    const next = mount(winner(2039));
    expect(card(next.container).dataset.intlMoment).toBe('won');
  });

  it('a reload (fresh module, same tab) does not replay it; the control with storage cleared does', async () => {
    mount(winner(2036));
    cleanup();
    vi.resetModules();
    const reloaded = (await import('@/components/soccer-career/InternationalPanel')).TournamentCard;
    const after = mount(winner(2036), reloaded);
    expect(card(after.container).dataset.intlMoment).toBe('none');
    cleanup();
    window.sessionStorage.clear();
    vi.resetModules();
    const cleared = (await import('@/components/soccer-career/InternationalPanel')).TournamentCard;
    const control = mount(winner(2036), cleared);
    expect(card(control.container).dataset.intlMoment).toBe('won');
  });
});
