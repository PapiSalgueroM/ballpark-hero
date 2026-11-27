import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { XiTacticalCup } from '@/components/lineup/XiTacticalCup';
import { clubYearClubs } from '@/data/lineupTeams';
import { BUILD_XI_DRAFT_KEY } from '@/lib/buildXiDraft';
import { CUP_KEY, callRoute, coachHalf, cupMatchReport, cupOpponents, cupSquadId, readCup, routeSupport, startCup, type Adjustment } from '@/lib/xiTacticalCup';
import { FORMATIONS, type FilledSlot, type Formation } from '@/types/lineupBuilder';

function lineup(formation: Formation = '4-4-2'): FilledSlot[] {
  return FORMATIONS[formation].map((slot, i) => ({ ...slot, playerName: 'Test starter ' + i,
    assignedTeam: clubYearClubs[i], isNation: false, pick: { position: slot.role } }));
}
const slots = lineup();
const squad = cupSquadId('4-4-2', slots);
function play(seed: number, read: 'loose' | 'guarded', choice: Adjustment) {
  let cup = startCup(squad, seed);
  return cupOpponents(seed).map((opponent, i) => {
    cup = coachHalf(callRoute(cup, opponent[read]), choice);
    return cupMatchReport(cup, i, slots);
  });
}

afterEach(() => { cleanup(); localStorage.clear(); });
describe('Tactical Cup', () => {
  it('the same eleven and the same match rolls win or miss the cup on scouting and on halftime calls', () => {
    const points = (read: 'loose' | 'guarded', risk: Adjustment) => play(17, read, risk).reduce((sum, match) => sum + match.points, 0);
    expect(points('loose', 'steady')).toBe(7);
    expect(points('guarded', 'steady')).toBe(0);
    expect(points('loose', 'runner')).toBe(6);
    expect(points('loose', 'cover')).toBe(4);
    expect(play(17, 'loose', 'runner').map(match => match.first)).toEqual(play(17, 'loose', 'cover').map(match => match.first));
    expect(play(17, 'loose', 'runner')).toEqual(play(17, 'loose', 'runner'));
    const draws = Array.from({ length: 100 }, (_, seed) => cupOpponents(seed).map(o => o.name));
    expect(draws.every(order => new Set(order).size === 3)).toBe(true);
    expect(new Set(draws.map(order => order.join('/'))).size).toBe(6);
  });

  it('formation and actual recorded positions change opportunities; missing records only earn the shape bonus', () => {
    const incomplete = slots.map(slot => ({ ...slot, pick: undefined }));
    const three = lineup('4-3-3');
    expect(routeSupport(slots, 'direct')).toMatchObject({ shapeBonus: 1, fitBonus: 1 });
    expect(routeSupport(three, 'direct')).toMatchObject({ shapeBonus: 0, fitBonus: 0 });
    expect(routeSupport(three, 'central')).toMatchObject({ shapeBonus: 1, fitBonus: 1 });
    expect(routeSupport(incomplete, 'direct')).toMatchObject({ shapeBonus: 1, fitBonus: 0 });
    const cover = slots.map(slot => slot.role === 'ST' ? { ...slot, pick: { position: 'CF' as const } } : slot);
    expect(routeSupport(cover, 'direct').fitBonus).toBe(0);
    expect(routeSupport(cover.map(slot => ({ ...slot, pick: { ...slot.pick, played: [slot.role] } })), 'direct').fitBonus).toBe(1);
    const cup = callRoute(startCup(squad, 17), 'direct');
    expect(cupMatchReport(cup, 0, slots).first.own).toBe(cupMatchReport(cup, 0, three).first.own + 2);
    expect(cupMatchReport(cup, 0, slots).first.own).toBe(cupMatchReport(cup, 0, incomplete).first.own + 1);
  });

  it('restores a valid halftime exactly and rejects stolen, damaged, stale and premature turns', () => {
    const kickoff = startCup(squad, 17);
    const half = callRoute(kickoff, 'wide');
    const after = coachHalf(half, 'runner');
    const final = coachHalf(callRoute(coachHalf(callRoute(after, 'direct'), 'cover'), 'central'), 'steady');
    expect(readCup(JSON.stringify(half), squad)).toMatchObject(half);
    expect(readCup(JSON.stringify(final), squad)).toEqual(final);
    const newXI = slots.map((slot, i) => i === 0 ? { ...slot, playerName: 'Different keeper' } : slot);
    expect(readCup(JSON.stringify(half), cupSquadId('4-4-2', newXI))).toBeNull();
    for (const data of ['bad json', { ...half, seed: -1 }, { ...half, version: 2 }, { ...half, matches: [half.matches[0], half.matches[0]] },
      { ...half, matches: [{ route: 'toString' }] }, { ...half, matches: [{ route: 'wide', adjustment: 'invalid' }] },
      { ...final, matches: [...final.matches, ...final.matches] }]) {
      expect(readCup(typeof data === 'string' ? data : JSON.stringify(data), squad)).toBeNull();
    }
    expect(coachHalf(kickoff, 'runner')).toBe(kickoff);
    expect(callRoute(half, 'central')).toBe(half);
    expect(coachHalf(after, 'cover')).toBe(after);
    expect(callRoute(final, 'wide')).toBe(final);
    expect(coachHalf(final, 'cover')).toBe(final);
  });

  it('tucking the same wide midfielder inside survives reload and changes a defeat into a draw', () => {
    const kickoff = startCup(squad, 10);
    const tucked = { ...kickoff, tuckIn: true as const };
    expect(readCup(JSON.stringify(tucked), squad)).toEqual(tucked);
    const result = (c: typeof kickoff) => cupMatchReport(coachHalf(callRoute(c, 'central'), 'steady'), 0, slots);
    const before = result(kickoff);
    const after = result(tucked);
    expect(before.opponent.name).toBe('Overlapping Backs');
    expect([before.gf, before.ga, before.points]).toEqual([2, 3, 0]);
    expect([after.gf, after.ga, after.points]).toEqual([3, 3, 1]);
    expect(after.first.own).toBe(before.first.own + 1);
    expect(after.first.against).toBe(before.first.against + 1);
    expect(callRoute(tucked, 'central').tuckIn).toBeUndefined();
    expect(readCup(JSON.stringify({ ...callRoute(tucked, 'central'), tuckIn: true }), squad)).toBeNull();
    expect(slots.find(s => s.playerName === after.tucked)?.role).toBe('LM');
  });

  it('keeps another tab’s halftime call and the original saved XI, including after a damaged cup is replaced', async () => {
    const teams = slots.map(s => ({ name: s.assignedTeam, isNation: false }));
    const draft = JSON.stringify({ formation: '4-4-2', draftChoice: { mode: 'mixed' }, teamAssignments: teams, slots: slots.map((s, i) => [i, s]) });
    localStorage.setItem(BUILD_XI_DRAFT_KEY, draft);
    localStorage.setItem(CUP_KEY, 'unreadable');
    render(<XiTacticalCup slots={slots} formation="4-4-2"/>);
    fireEvent.click(screen.getByRole('button', { name: 'Play Tactical Cup' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Start cup' }));
    fireEvent.click(await dialog.findByRole('button', { name: /^Use the wings/ }));
    const half = readCup(localStorage.getItem(CUP_KEY), squad)!;
    const other = coachHalf(half, 'cover');
    localStorage.setItem(CUP_KEY, JSON.stringify(other));
    fireEvent.click(await dialog.findByRole('button', { name: /^Send another runner/ }));
    expect(await dialog.findByRole('status')).toHaveTextContent('changed in another tab');
    expect(localStorage.getItem(CUP_KEY)).toBe(JSON.stringify(other));
    expect(await dialog.findByRole('heading', { name: /^Match 2/ })).toBeVisible();
    expect(localStorage.getItem(BUILD_XI_DRAFT_KEY)).toBe(draft);
    localStorage.removeItem(BUILD_XI_DRAFT_KEY);
    fireEvent.click(dialog.getByRole('button', { name: /^Go direct/ }));
    expect(dialog.getByRole('status')).toHaveTextContent('Your XI changed');
    expect(localStorage.getItem(CUP_KEY)).toBe(JSON.stringify(other));
  });
});
