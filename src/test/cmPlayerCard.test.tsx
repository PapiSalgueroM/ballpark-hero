/**
 * Round 1601: the player card screen and the page's stack of cards.
 *
 * The card prints what the reader returns: one of my men (this season, the league line and the seasons kept), a
 * rival of my league (the book's count, no apps), a man of a club outside the league (the outside line), and a man
 * who has left (a plain line and Back). The "?" holds the worked example, computed from the card's own numbers.
 * The stack: a link opens the card it names and Back pops one; with no provider above it a link draws exactly its
 * children, so every render without the page's provider is the markup it was.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  engineRegistrations, finishSeason, leagueBoardsOf, oppRosterFor, playNextEntry, restoreEngineRegistrations,
  startCareer, startNextSeason, type CareerState,
} from '@/lib/clubManager';
import { leaders } from '@/lib/clubManagerLeagueBoards';
import { playerCardOf, type CardRef } from '@/lib/clubManagerCards';
import { PlayerCardScreen } from '@/components/club-manager/PlayerCardScreen';
import { CmCardLink, CmCardsProvider, CmHost, mineCard, useCmCards } from '@/components/club-manager/CmCards';

function seeded<T>(seed: number, run: () => T): T {
  const original = Math.random;
  let value = seed | 0;
  Math.random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  try { return run(); } finally { Math.random = original; }
}
const play = (s: CareerState, n: number): CareerState => {
  for (let i = 0; i < n && s.week < s.calendar.length; i++) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
};

let held: ReturnType<typeof engineRegistrations>;
let s2: CareerState;
beforeAll(() => {
  held = engineRegistrations();
  vi.spyOn(Date, 'now').mockReturnValue(1791979200000);
  s2 = seeded(16012, () => play(startNextSeason(finishSeason(play(startCareer('Everton'), 220)).state), 24));
});
afterAll(() => { restoreEngineRegistrations(held); vi.restoreAllMocks(); });

describe('the card screen', () => {
  it('draws one of my men: this season, the league, and his seasons here; the "?" example is his own average', () => {
    const p = s2.squad.find(x => (x.apps ?? 0) > 2 && (s2.pastLines ?? []).some(e => e[0] === x.id));
    if (!p) throw new Error('no man of mine with a game and a kept season');
    const ref: CardRef = { k: 'mine', id: p.id };
    const card = playerCardOf(s2, ref);
    const onBack = vi.fn();
    const { container } = render(<PlayerCardScreen card={ref} career={s2} onBack={onBack} />);
    expect(container.querySelector('[data-cm-card="mine"]')).toBeTruthy();
    expect(container.querySelector('[data-cm-card-line="This season"]')?.textContent).toContain(`${p.apps} apps`);
    expect(container.querySelectorAll('[data-cm-card-season]').length).toBe(card?.past.length);
    fireEvent.click(screen.getByRole('button', { name: 'How the player card works' }));
    const example = container.querySelector('[data-cm-card-example]')?.textContent ?? '';
    expect(example).toContain(`over ${p.apps} games`);
    expect(example).toContain(`average of ${(card?.now?.average ?? 0).toFixed(1)}`);
    fireEvent.click(screen.getByRole('button', { name: /Back/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
  it('draws a rival of my league with the book\'s count and no apps', () => {
    const boards = leagueBoardsOf(s2);
    const top = boards ? leaders(boards.input, 'goals', Number.MAX_SAFE_INTEGER).find(m => !m.mine) : undefined;
    if (!top) throw new Error('no rival on the goals board');
    const { container } = render(<PlayerCardScreen card={{ k: 'man', name: top.name, pos: top.pos, club: top.club }} career={s2} onBack={() => {}} />);
    const line = container.querySelector('[data-cm-card-line="League, this season"]')?.textContent ?? '';
    expect(line).toContain(`${top.n} goals`);
    expect(line).not.toContain('apps');
    expect(container.querySelector('[data-cm-card-past]')).toBeNull();
  });
  it('draws a man outside the league with the outside line, and a man who left with a plain line', () => {
    const man = oppRosterFor(s2, 'Real Madrid')[0];
    const { container } = render(<PlayerCardScreen card={{ k: 'man', name: man.n, pos: man.p, club: 'Real Madrid' }} career={s2} onBack={() => {}} />);
    expect(container.querySelector('[data-cm-card-note="outside"]')).toBeTruthy();
    expect(container.querySelector('[data-cm-card-line]')).toBeNull();
    const gone = render(<PlayerCardScreen card={{ k: 'mine', id: 'sold-long-ago' }} career={s2} onBack={() => {}} />);
    expect(gone.container.querySelector('[data-cm-card-gone]')).toBeTruthy();
  });
});

describe('the stack and the link', () => {
  function Shown() {
    const cards = useCmCards();
    return <div data-shown>{cards?.top ? JSON.stringify(cards.top) : 'hub'}<button type="button" onClick={() => cards?.back()}>Pop</button></div>;
  }
  it('opens the card a link names, calls the host hold first, and Back pops one', () => {
    const hold = vi.fn();
    const { container } = render(
      <CmCardsProvider><CmHost hold={hold}><CmCardLink card={{ k: 'mine', id: 'a' }}><span>A</span></CmCardLink></CmHost><Shown /></CmCardsProvider>,
    );
    fireEvent.click(container.querySelector('[data-cm-card-link]') as Element);
    expect(hold).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-shown]')?.textContent).toContain('"id":"a"');
    fireEvent.click(screen.getByText('Pop'));
    expect(container.querySelector('[data-shown]')?.textContent).toContain('hub');
  });
  it('with no provider draws exactly its children', () => {
    const bare = renderToStaticMarkup(<span className="x">Name</span>);
    expect(renderToStaticMarkup(<CmCardLink card={{ k: 'mine', id: 'a' }}><span className="x">Name</span></CmCardLink>)).toBe(bare);
  });
  it('resolves one of mine from a board row only when exactly one man has that name and position', () => {
    const squad = [{ id: 'a', name: 'Sam Doe', position: 'CB' as const }, { id: 'b', name: 'Sam Doe', position: 'CB' as const }, { id: 'c', name: 'Al Roe', position: 'ST' as const }];
    expect(mineCard(squad, 'Sam Doe', 'CB')).toBeNull();
    expect(mineCard(squad, 'Al Roe', 'ST')).toEqual({ k: 'mine', id: 'c' });
    expect(mineCard(squad, 'Al Roe', 'LW')).toBeNull();
  });
});
