/* Round 1537: the NBA hub's Roster box reads the tip off floor only before tip off.
   The real board, mounted on a fictional restored franchise with local only persistence.
   Round 722 put the floor line ahead of a hurt star, rightly, while the league can still
   fill the roster at tip off. The board passed the floor in every round, so a manager who
   waived one man after round 1 read "1 short of the 14 man floor. Filled on minimum deals
   at tip off." for the rest of the season, the box stayed lit with everyone fit, and a
   hurt star was never named. */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import { initNbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'nba-front-office-save-v1';
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };

/** Mounts the hub at a round with a roster of `size` fictional men, the best of them out `starOut` rounds. */
function mount(round: number, size: number, starOut = 0) {
  const league = initNbaLeague(rng(1537));
  const team = NBA_TEAMS[0].id;
  league.round = round;
  league.teams[team].players = Array.from({ length: size }, (_, i) => ({
    id: `fictional-box-${i}`, name: `Simulated box player ${i + 1}`, pos: (['G', 'F', 'C'] as const)[i % 3],
    age: 26, ovr: 90 - i, pot: 90 - i, salary: 2, years: 3, out: i === 0 ? starOut : 0,
  }));
  localStorage.setItem(KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  render(<NbaFrontOfficeBoard />);
}

/** The hub's Roster box: its words and how many pulsing dots it carries. */
function rosterBox() {
  const boxes = Array.from(document.querySelectorAll('button')).filter(b => b.querySelector('div.uppercase')?.textContent === 'Roster');
  expect(boxes).toHaveLength(1);
  return { text: boxes[0].textContent ?? '', dots: boxes[0].querySelectorAll('span.animate-pulse').length };
}

describe('NBA hub Roster box and the tip off floor', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(rng(1538)); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('names a hurt star on a roster one under the floor once the season has tipped off', () => {
    mount(2, 13, 3);
    const box = rosterBox();
    expect(box.text).toContain('1 unavailable');
    expect(box.text).toContain('Simulated box player 1 is out 3 rounds');
    expect(box.text).not.toContain('short of');
    expect(box.dots).toBe(1);
  });

  it('puts the dot out for a fit roster one under the floor after tip off', () => {
    mount(2, 13);
    const box = rosterBox();
    expect(box.text).toContain('13 under contract');
    expect(box.text).toContain('Simulated box player 1 leads them at 90');
    expect(box.text).not.toContain('short of');
    expect(box.dots).toBe(0);
  });

  it('still says a roster is short of the floor before tip off, and lights the box', () => {
    mount(1, 10);
    const box = rosterBox();
    expect(box.text).toContain('10 under contract');
    expect(box.text).toContain('4 short of the 14 man floor. Filled on minimum deals at tip off.');
    expect(box.dots).toBe(1);
  });

  it('warns a roster exactly one short before tip off, the boundary of the floor rule', () => {
    mount(1, 13);
    const box = rosterBox();
    expect(box.text).toContain('1 short of the 14 man floor. Filled on minimum deals at tip off.');
    expect(box.dots).toBe(1);
  });

  it('names a hurt star before tip off once the roster is at the floor', () => {
    mount(1, 14, 2);
    const box = rosterBox();
    expect(box.text).toContain('Simulated box player 1 is out 2 rounds');
    expect(box.text).not.toContain('short of');
    expect(box.dots).toBe(1);
  });
});
