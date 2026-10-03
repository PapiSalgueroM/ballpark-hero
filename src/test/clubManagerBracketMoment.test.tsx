/**
 * Round 983: the cup and Champions League brackets show who just went
 * through. A round that settled since the card last looked plays once: the
 * winners' lines pulse and their scores land, the next round's ties tick in,
 * and a final the manager won glows on the trophy line. Reopening the card on
 * the same bracket plays nothing, and neither does the first look after a
 * reload. The career is a real startCareer save; only the results are written
 * by hand, in the engine's own shape (a round settles whole and the next one
 * is drawn in the same step, as advanceCupBracket does).
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CupBracketCard, bracketMoment } from '@/components/club-manager/CupBracketCard';
import { UclBracketCard } from '@/components/club-manager/UclBracketCard';
import { startCareer } from '@/lib/clubManager';
import type { CareerState, CupTie, UclTie } from '@/lib/clubManager';

const ORDER = ['R16', 'QF', 'SF', 'F'] as const;
type Round = typeof ORDER[number];
type Tie = CupTie | UclTie;

/** Settle every open tie of `round` (home wins unless `winnerOf` says), then draw the next. */
function settle<T extends Tie>(bracket: T[], round: Round, winnerOf?: (t: T) => string): T[] {
  const out = bracket.map(t => ({ ...t }));
  const these = out.filter(t => t.round === round).sort((a, b) => a.slot - b.slot);
  for (const t of these) {
    const w = winnerOf ? winnerOf(t) : t.home;
    t.homeGoals = w === t.home ? 2 : 0;
    t.awayGoals = w === t.home ? 1 : 3;
    t.winner = w;
  }
  const next = ORDER[ORDER.indexOf(round) + 1];
  if (next) {
    for (let i = 0; i * 2 + 1 < these.length; i++) {
      out.push({
        ...these[0], round: next, slot: i,
        home: these[i * 2].winner as string, away: these[i * 2 + 1].winner as string,
        homeGoals: null, awayGoals: null, winner: null, mine: false,
      } as T);
    }
  }
  return out;
}

const base = startCareer('Real Madrid');
/** A career of its own per test: the season is part of the moment's key. */
function careerAt(season: number): CareerState {
  return { ...base, season };
}

function uclDraw(c: CareerState): UclTie[] {
  const clubs = c.leagueClubs.slice(0, 16);
  return Array.from({ length: 8 }, (_, i) => ({
    round: 'R16', slot: i, home: clubs[i * 2], away: clubs[i * 2 + 1],
    homeGoals: null, awayGoals: null, winner: null, mine: clubs[i * 2] === c.clubName || clubs[i * 2 + 1] === c.clubName,
  }));
}

const keysOf = (root: HTMLElement, sel: string, attr: string) =>
  Array.from(root.querySelectorAll(sel)).map(el => el.getAttribute(attr));
const delays = (root: HTMLElement, sel: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(sel)).map(el => parseFloat(el.style.animationDelay));
const anyMotion = (root: HTMLElement) =>
  root.querySelectorAll('.cm-win-pulse, .cm-slam, .cm-tick-in, .cm-gold-glow').length;

describe('the bracket moment (pure)', () => {
  it('first sight and an unchanged count play nothing; a grown count names only the latest round', () => {
    const c = careerAt(1);
    const b0 = c.cupBracket as CupTie[];
    const b1 = settle(b0, 'R16');
    const b2 = settle(b1, 'QF');
    expect(bracketMoment(undefined, b1, ORDER, c.clubName)).toBeNull();
    expect(bracketMoment(8, b1, ORDER, c.clubName)).toBeNull();
    const m = bracketMoment(0, b2, ORDER, c.clubName);
    expect(m?.round).toBe('QF');
    expect(m?.through).toEqual(['QF-0', 'QF-1', 'QF-2', 'QF-3']);
    expect(m?.drawn).toEqual(['SF-0', 'SF-1']);
    expect(m?.wonFinal).toBe(false);
    /* A final somebody else won is a moment, with no glow. */
    const b4 = settle(settle(b2, 'SF'), 'F');
    const other = (b4.find(t => t.round === 'F') as CupTie).winner as string;
    const f = bracketMoment(14, b4, ORDER, other === c.clubName ? 'Somebody Else FC' : c.clubName);
    expect(f?.through).toEqual(['F-0']);
    expect(f?.wonFinal).toBe(false);
    expect(bracketMoment(14, b4, ORDER, other)?.wonFinal).toBe(true);
  });
});

describe.each([
  ['cup', (c: CareerState, b: Tie[]) => ({ ...c, cupBracket: b as CupTie[] }), (c: CareerState) => c.cupBracket as Tie[], CupBracketCard],
  ['Champions League', (c: CareerState, b: Tie[]) => ({ ...c, uclBracket: b as UclTie[] }), (c: CareerState) => uclDraw(c) as Tie[], UclBracketCard],
] as const)('the %s card', (label, withBracket, firstDraw, Card) => {
  const seasonBase = label === 'cup' ? 100 : 200;

  it('plays the newly settled round once, on the new ties only, and never on a remount', () => {
    const c = careerAt(seasonBase + 1);
    const r16 = settle(firstDraw(c), 'R16');
    const qf = settle(r16, 'QF');

    /* Round N settled, first sight: nothing plays (the reload rule). */
    const first = render(<Card career={withBracket(c, r16)} />);
    expect(anyMotion(first.container)).toBe(0);
    first.unmount();

    /* Round N plus 1: the four quarter-final winners land, the semis tick in. */
    const second = render(<Card career={withBracket(c, qf)} onClubClick={() => {}} />);
    const root = second.container;
    expect(keysOf(root, '.cm-win-pulse', 'data-cm-bracket-through')).toEqual(['QF-0', 'QF-1', 'QF-2', 'QF-3']);
    expect(keysOf(root, '.cm-slam', 'data-cm-bracket-landed')).toEqual(['QF-0', 'QF-1', 'QF-2', 'QF-3']);
    expect(keysOf(root, '.cm-tick-in', 'data-cm-bracket-drawn')).toEqual(['SF-0', 'SF-1']);
    expect(root.querySelectorAll('.cm-gold-glow').length).toBe(0);
    /* The landed score is the winner's own goals from the save, nothing else. */
    for (const el of Array.from(root.querySelectorAll('.cm-slam'))) {
      const t = qf.find(x => `${x.round}-${x.slot}` === el.getAttribute('data-cm-bracket-landed'))!;
      expect(el.textContent).toBe(String(t.winner === t.home ? t.homeGoals : t.awayGoals));
    }
    /* The pulse sits on a wrapper, never on the clickable line. */
    for (const el of Array.from(root.querySelectorAll('.cm-win-pulse'))) {
      expect(el.className).not.toContain('cursor-pointer');
      expect(el.firstElementChild?.className).toContain('cursor-pointer');
    }
    /* Winners first, then the draw, every step later than the one before. */
    const order = [...delays(root, '.cm-win-pulse'), ...delays(root, '.cm-tick-in')];
    expect(order.every((d, i) => i === 0 || d > order[i - 1])).toBe(true);
    expect(root.querySelectorAll('style').length).toBe(1);
    second.unmount();

    /* Reopened on the same bracket: nothing plays and the kit is not mounted. */
    const third = render(<Card career={withBracket(c, qf)} />);
    expect(anyMotion(third.container)).toBe(0);
    expect(third.container.querySelectorAll('style').length).toBe(0);
    third.unmount();
  });

  it('plays when the round settles while the card is open, and keeps playing through a re-render', () => {
    const c = careerAt(seasonBase + 2);
    const r16 = settle(firstDraw(c), 'R16');
    const qf = settle(r16, 'QF');
    const view = render(<Card career={withBracket(c, r16)} />);
    expect(anyMotion(view.container)).toBe(0);
    view.rerender(<Card career={withBracket(c, qf)} />);
    expect(keysOf(view.container, '.cm-win-pulse', 'data-cm-bracket-through')).toEqual(['QF-0', 'QF-1', 'QF-2', 'QF-3']);
    /* A parent re-render with the same bracket must not cut the moment off. */
    view.rerender(<Card career={withBracket(c, qf)} />);
    expect(keysOf(view.container, '.cm-tick-in', 'data-cm-bracket-drawn')).toEqual(['SF-0', 'SF-1']);
    view.unmount();
  });

  it('after a missed round plays only the latest, and a final won by the club glows', () => {
    const c = careerAt(seasonBase + 3);
    const draw = firstDraw(c);
    const seen = render(<Card career={withBracket(c, draw)} />);
    seen.unmount();
    const sf = settle(settle(draw, 'R16'), 'QF');
    const late = render(<Card career={withBracket(c, sf)} />);
    expect(keysOf(late.container, '.cm-win-pulse', 'data-cm-bracket-through')).toEqual(['QF-0', 'QF-1', 'QF-2', 'QF-3']);
    late.unmount();

    /* Make the manager's club one of the finalists and let him win it. */
    const semis = settle(sf, 'SF').map(t => (t.round === 'F'
      ? { ...t, home: c.clubName, away: t.away === c.clubName ? t.home : t.away, mine: true }
      : t));
    render(<Card career={withBracket(c, semis)} />).unmount();
    const won = settle(semis, 'F', t => t.home);
    const final = render(<Card career={withBracket(c, won)} />);
    expect(keysOf(final.container, '.cm-win-pulse', 'data-cm-bracket-through')).toEqual(['F-0']);
    expect(final.container.querySelectorAll('.cm-tick-in').length).toBe(0);
    const glow = final.container.querySelectorAll('.cm-gold-glow');
    expect(glow.length).toBe(1);
    expect(glow[0].textContent).toContain(c.clubName);
    final.unmount();
    const again = render(<Card career={withBracket(c, won)} />);
    expect(anyMotion(again.container)).toBe(0);
    again.unmount();
  });
});
