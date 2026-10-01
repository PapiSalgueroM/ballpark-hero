/**
 * Round 824: the NBA Front Office close screen draws the season in numbers.
 *
 * The real board on a save built from the real engine under a seeded rng:
 * play the final stretch, and the recap must carry the season box with the
 * sim note, the awards the engine named, the leaders and the club's lines.
 * A reload draws the same awards and writes nothing twice. A save from before
 * the round closes its season without lines and says so. A man with an award
 * wears it on his roster card.
 *
 * scripts/simNbaSeasonStats.mjs runs this file and reads its summary line.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague, simRound, NBA_ROUNDS, type NbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'nba-front-office-save-v1';
function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const finalWeek = (): { league: NbaLeague; team: string } => {
  const rng = lehmer(7);
  const league = initNbaLeague(rng);
  const team = Object.keys(league.teams)[0];
  for (let r = 1; r < NBA_ROUNDS; r += 1) { simRound(league, team, rng); league.round += 1; }
  return { league, team };
};
const save = (shape: unknown) => localStorage.setItem(SAVE_KEY, JSON.stringify(shape));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);
const allMen = (lg: NbaLeague) => [...Object.values(lg.teams).flatMap(t => t.players), ...lg.freeAgents];

describe('NBA Front Office: the season in numbers', () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restore = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restore?.(); });

  it('draws the awards the engine named, the leaders and the club lines, labelled as the sim season', () => {
    const { league, team } = finalWeek();
    save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final stretch + playoffs'));
    const box = document.querySelector('[data-season-stats]');
    expect(box).toBeTruthy();
    expect(box!.textContent).toContain("this save's games, not real NBA stats");
    const closed = read().league as NbaLeague;
    expect(closed.awards).toHaveLength(1);
    const mvp = closed.awards![0].mvp!;
    expect(mvp).toBeTruthy();
    expect(document.querySelector('[data-stats-awards]')!.textContent).toContain(mvp.name);
    fireEvent.click(screen.getByText('Leaders'));
    const leaders = document.querySelector('[data-stats-leaders]')!.textContent!;
    expect(leaders).toContain('Points');
    expect(leaders).toContain('Rebounds');
    fireEvent.click(screen.getByText('Your lines'));
    const lines = document.querySelector('[data-stats-team]')!;
    expect(lines.querySelectorAll('div.grid').length).toBeGreaterThan(5);
    /* the MVP wears it on his card, once */
    const card = allMen(closed).find(p => p.id === mvp.id)!;
    expect(card.awards).toContain(`${closed.season} MVP`);
  });

  it('a reload draws the same awards and writes nothing twice', () => {
    const { league, team } = finalWeek();
    save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    const first = render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final stretch + playoffs'));
    const before = read().league as NbaLeague;
    const badges = allMen(before).reduce((n, p) => n + (p.awards?.length ?? 0), 0);
    first.unmount();
    render(<NbaFrontOfficeBoard />);
    expect(document.querySelector('[data-season-stats]')).toBeTruthy();
    expect(document.querySelector('[data-stats-awards]')!.textContent).toContain(before.awards![0].mvp!.name);
    const after = read().league as NbaLeague;
    expect(after.awards).toHaveLength(1);
    expect(allMen(after).reduce((n, p) => n + (p.awards?.length ?? 0), 0)).toBe(badges);
    /* nine awards a season: four single ones and the five All-League places */
    expect(badges).toBeGreaterThanOrEqual(8);
  });

  it('a save from before the round closes its season without lines and says so', () => {
    const { league, team } = finalWeek();
    delete league.stats;
    delete league.awards;
    save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Final stretch + playoffs'));
    expect(document.querySelector('[data-season-stats]')).toBeNull();
    expect(document.querySelector('[data-season-stats-pending]')).toBeTruthy();
    expect(read().league.awards).toBeUndefined();
    expect(read().phase).toBe('recap');
  });

  it('a man with an award wears it on his roster card', () => {
    const { league, team } = finalWeek();
    const star = [...league.teams[team].players].sort((a, b) => b.ovr - a.ovr)[0];
    star.awards = ['2026 MVP', '2026 All-League First Team'];
    save({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    render(<NbaFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    const badge = document.querySelector(`[data-roster-row="${star.id}"] [data-award-badge]`);
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toContain('2026 MVP');
  });
});
