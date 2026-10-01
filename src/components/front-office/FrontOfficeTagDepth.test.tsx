/**
 * Round 723: the NFL board's depth chart and franchise tag.
 *
 * The engine rules are fenced by scripts/simNflTagDepth.mjs. This is the
 * board: the chart opens from the Roster box as small tiles with a back
 * button at each level, two taps swap two men, the order lands on the save
 * and survives a reload, and team strength moves with it. The tag card sits
 * on the draft screen before the last pick, quotes the tender the engine
 * charges, greys a tag the room cannot cover with the reason, and a tagged
 * man is still on the roster on his tender after the last pick runs the
 * offseason.
 *
 * Same setup as FrontOfficeCuts.test.tsx: a save from the real engine under a
 * seeded rng, the real board rendered on it, the save read back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import {
  initLeague, generateDraftClass, teamStrength, franchiseTagSalary, depthOrder, starterIds, capUsed,
  DEPTH_GROUPS, type LeagueState, type GmTeamState,
} from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const read = (): any => JSON.parse(localStorage.getItem(KEY)!);
const save = (league: LeagueState, team: string, extra: Record<string, unknown> = {}) =>
  localStorage.setItem(KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...extra }));
const el = (sel: string) => document.querySelector(sel) as HTMLElement;
const rowIds = () => [...document.querySelectorAll('[data-depth-row]')].map(r => r.getAttribute('data-depth-row'));

describe('NFL Front Office: the depth chart and the franchise tag on the board', () => {
  let restoreRandom: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(11));
    restoreRandom = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restoreRandom?.(); });

  it('opens the chart from the Roster box, swaps two men on two taps, saves the order and moves strength', () => {
    const league = initLeague(lehmer(7));
    /* a club with a group where a starter has a worse man behind him */
    let pick: { team: string; pos: string; starter: string; bench: string } | null = null;
    for (const abbr of Object.keys(league.teams)) {
      const t = league.teams[abbr];
      const ids = starterIds(t);
      for (const pos of DEPTH_GROUPS) {
        const order = depthOrder(t, pos);
        const s = order.find(p => ids.has(p.id));
        const b = order.find(p => !ids.has(p.id) && s && p.ovr < s.ovr);
        if (s && b) { pick = { team: abbr, pos, starter: s.id, bench: b.id }; break; }
      }
      if (pick) break;
    }
    expect(pick, 'no club in the fixture has a starter with a worse man behind him').toBeTruthy();
    const { team, pos, starter, bench } = pick!;
    save(league, team);
    render(<FrontOfficeBoard />);
    const before = teamStrength(league.teams[team]);

    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(el('[data-depth-open]'));
    expect(document.querySelectorAll('[data-depth-group]')).toHaveLength(DEPTH_GROUPS.length);
    fireEvent.click(el(`[data-depth-group="${pos}"]`));
    const order = depthOrder(league.teams[team], pos as GmTeamState['players'][number]['pos']).map(p => p.id);
    expect(rowIds()).toEqual(order);
    expect(el(`[data-depth-row="${starter}"]`).querySelector('[data-depth-starter]')).toBeTruthy();
    expect(el(`[data-depth-row="${bench}"]`).querySelector('[data-depth-starter]')).toBeNull();

    /* one tap, then the same man again, cancels and writes nothing */
    fireEvent.click(el(`[data-depth-row="${starter}"]`));
    fireEvent.click(el(`[data-depth-row="${starter}"]`));
    expect(read().league.teams[team].depth).toBeUndefined();

    /* two taps swap them: the worse man starts, the save has the order, the club is weaker */
    fireEvent.click(el(`[data-depth-row="${starter}"]`));
    fireEvent.click(el(`[data-depth-row="${bench}"]`));
    const swapped = [...order];
    const a = swapped.indexOf(starter), b = swapped.indexOf(bench);
    [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
    expect(read().league.teams[team].depth[pos]).toEqual(swapped);
    expect(rowIds()).toEqual(swapped);
    expect(el(`[data-depth-row="${bench}"]`).querySelector('[data-depth-starter]')).toBeTruthy();
    expect(el(`[data-depth-row="${starter}"]`).querySelector('[data-depth-starter]')).toBeNull();
    expect(teamStrength(read().league.teams[team])).toBeLessThan(before);

    /* the order survives a reload */
    cleanup();
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(el('[data-depth-open]'));
    fireEvent.click(el(`[data-depth-group="${pos}"]`));
    expect(rowIds()).toEqual(swapped);

    /* swapping back restores the strength exactly */
    fireEvent.click(el(`[data-depth-row="${bench}"]`));
    fireEvent.click(el(`[data-depth-row="${starter}"]`));
    expect(teamStrength(read().league.teams[team])).toBeCloseTo(before, 9);

    /* the back buttons walk out a level at a time */
    fireEvent.click(screen.getByText('Groups'));
    expect(el('[data-depth-chart]')).toBeTruthy();
    fireEvent.click(within(el('[data-depth-chart]')).getByText('Roster'));
    expect(el('[data-depth-chart]')).toBeNull();
    expect(document.querySelectorAll('[data-roster-row]').length).toBeGreaterThan(0);
  });

  it('greys every tag the room cannot cover, with the shortfall', () => {
    const league = initLeague(lehmer(7));
    const team = Object.keys(league.teams).find(a => league.teams[a].players.some(p => p.years <= 1))!;
    league.cap = capUsed(league.teams[team]);
    save(league, team, { phase: 'draft', draftClass: generateDraftClass(lehmer(3), 40, new Set()), picksLeft: 3 });
    render(<FrontOfficeBoard />);
    const rows = [...document.querySelectorAll('[data-tag-row]')] as HTMLElement[];
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      const btn = within(r).getByText('Tag') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(r.textContent).toMatch(/The tag would put you \$[\d.]+M over the cap\./);
      fireEvent.click(btn);
    }
    expect(read().league.teams[team].tagUsedFor).toBeUndefined();
  });

  it('tags one expiring man before free agency, and he is still on his tender after the offseason', () => {
    const league = initLeague(lehmer(7));
    league.cap += 1000;
    const team = Object.keys(league.teams).find(a => league.teams[a].players.filter(p => p.years <= 1).length >= 2)!;
    const season = league.season;
    save(league, team, { phase: 'draft', draftClass: generateDraftClass(lehmer(3), 40, new Set()), picksLeft: 3 });
    render(<FrontOfficeBoard />);
    expect(el('[data-franchise-tag]')).toBeTruthy();
    const rows = [...document.querySelectorAll('[data-tag-row]')] as HTMLElement[];
    const expiring = league.teams[team].players.filter(p => p.years <= 1);
    expect(rows).toHaveLength(expiring.length);
    /* every row quotes the tender the engine charges */
    for (const p of expiring) {
      expect(el(`[data-tag-row="${p.id}"]`).textContent).toContain(`tag $${franchiseTagSalary(league, p)}M`);
    }
    const man = [...expiring].sort((x, y) => y.ovr - x.ovr)[0];
    const price = franchiseTagSalary(league, man);
    fireEvent.click(within(el(`[data-tag-row="${man.id}"]`)).getByText('Tag'));

    const tagged = read().league.teams[team].players.find((p: any) => p.id === man.id);
    expect(tagged).toMatchObject({ salary: price, years: 1, tagSeason: season + 1, tagCount: 1, guaranteed: true });
    expect(read().league.teams[team].tagUsedFor).toBe(season + 1);
    expect(el('[data-tag-done]').textContent).toContain(man.name);
    expect(document.querySelectorAll('[data-tag-row]')).toHaveLength(0);

    /* the three picks; the last one runs the offseason */
    for (let i = 0; i < 3; i += 1) {
      const next = read().draftClass[0];
      const btn = [...document.querySelectorAll('button')].find(x => x.textContent?.includes(next.name) && x.textContent.includes(String(next.grade)))!;
      expect(btn, `pick ${i + 1}: no button for ${next.name}`).toBeTruthy();
      fireEvent.click(btn);
    }
    const after = read();
    expect(after.league.season).toBe(season + 1);
    expect(after.phase).toBe('hub');
    expect(after.league.freeAgents.some((p: any) => p.id === man.id)).toBe(false);
    const still = after.league.teams[team].players.find((p: any) => p.id === man.id);
    /* a retirement is the one way off the roster the tag does not stop */
    if (still) expect(still).toMatchObject({ salary: price, years: 1, tagSeason: season + 1, guaranteed: true });
    else expect(man.age + 1).toBeGreaterThanOrEqual(34);
    expect(el('[data-franchise-tag]')).toBeNull();
  });
});
