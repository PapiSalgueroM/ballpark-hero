import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as dates from '@/lib/dateUtils';
import FullXiRecall from '@/components/missing-xi/FullXiRecall';
import { HELD_LINEUP_IDS, LINEUPS, pickDailyPuzzle } from '@/lib/missingXi';
import { makeScoutReport, restoreScouting, scoutBalance, scoutMove, type ScoutMove } from '@/lib/missingXiScouting';
import { newRecallSheet, recallStarter, unassistedCount } from '@/lib/missingXiRecall';

const barca = LINEUPS.find(l => l.id === 'cl-2011-final-barca')!;
const name = (index: number): ScoutMove => ({ type: 'name', name: barca.slots[index].name });
const state = (...moves: ScoutMove[]) => restoreScouting(barca, JSON.stringify(moves)).round;
afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe('Full XI scouting challenge', () => {
  it('offers exactly one starter and two distinct archived position matches for every eligible shirt', () => {
    const eligible = LINEUPS.filter(l => !HELD_LINEUP_IDS.has(l.id));
    const positions = new Map<string, Set<string>>();
    for (const l of eligible) for (const p of l.slots) {
      if (!positions.has(p.position)) positions.set(p.position, new Set());
      positions.get(p.position)!.add(p.name);
    }
    for (const l of eligible) for (const [i, p] of l.slots.entries()) {
      const report = makeScoutReport(l, i);
      expect(report?.names.length, l.id + ' ' + p.position).toBe(3);
      expect(new Set(report!.names).size).toBe(3);
      expect(report!.names.filter(n => l.slots.some(s => s.name === n))).toEqual([p.name]);
      const sheet = newRecallSheet(l);
      expect(report!.names.filter(n => recallStarter(sheet, n).sheet !== sheet)).toEqual([p.name]);
      const roles = p.position === 'DF' ? ['DF', 'CB', 'RB', 'LB', 'RWB', 'LWB']
        : p.position === 'MF' ? ['MF', 'CDM', 'CM', 'CAM', 'LM', 'RM']
        : p.position === 'FW' ? ['FW', 'RW', 'LW', 'ST', 'CF'] : [p.position];
      expect(report!.names.every(n => roles.some(role => positions.get(role)?.has(n)))).toBe(true);
    }
  });

  it('earns reports only from clean recollections and makes the same wrong pick cost a locked shirt', () => {
    const offer = makeScoutReport(barca, 0)!;
    const win: ScoutMove = { type: 'pick', name: barca.slots[0].name };
    const miss: ScoutMove = { type: 'pick', name: offer.names.find(n => n !== barca.slots[0].name)! };
    expect(state(offer, win).sheet.found).toEqual([0]);
    expect(state(offer, miss).sheet.found).toEqual([]);
    const locked = state(offer, miss);
    expect(scoutMove(barca, locked, name(0)).round).toBe(locked);
    expect(scoutMove(barca, locked, { type: 'name', name: 'Nobody' }).round).toBe(locked);
    const open = state(offer);
    expect(scoutMove(barca, open, name(0)).round).toBe(open);
    expect(scoutMove(barca, locked, makeScoutReport(barca, 1)!).round).toBe(locked);
    expect(unassistedCount(state(offer, win).sheet)).toBe(0);
    expect(scoutBalance(state(offer, win, name(1), name(2)))).toBe(0);
    expect(scoutBalance(state(offer, win, name(1), name(2), name(3)))).toBe(1);
    expect(scoutBalance(state(...[0,1,2,3,4,5,6,7,8].map(name)))).toBe(3);
    const rest = barca.slots.slice(1).map((_, i) => name(i + 1));
    expect(state(offer, win, ...rest).sheet).toMatchObject({ finished: true, best: 10 });
    expect(state(offer, miss, ...rest).sheet).toMatchObject({ finished: true, best: 10 });
    expect(state(offer, miss, ...rest).sheet.found).toHaveLength(10);
    expect(state(offer, win, ...rest).sheet.found).toHaveLength(11);
    expect(restoreScouting(barca, JSON.stringify([{ ...offer, names: [barca.slots[0].name, barca.slots[1].name, 'Unknown'] }])).moves).toEqual([]);
  });

  it('holds both sides of the daily match and resumes a separate, frozen scouting shortlist', async () => {
    vi.spyOn(dates, 'getTodayET').mockReturnValue('2026-11-27');
    const rival = LINEUPS.find(l => l.matchDate === barca.matchDate && l.team === barca.opponent)!;
    const view = render(<FullXiRecall dailyLineup={rival} />);
    const select = screen.getByLabelText('Match and team');
    fireEvent.change(select, { target: { value: barca.id } });
    expect(screen.getByRole('button', { name: 'Scouting Challenge' })).toBeDisabled();
    fireEvent.change(select, { target: { value: pickDailyPuzzle().lineup.id } });
    expect(screen.getByRole('button', { name: 'Scouting Challenge' })).toBeDisabled();
    view.unmount();
    const daily = LINEUPS.find(l => l.matchDate !== barca.matchDate)!;
    const dailyKey = 'missing-xi-daily-held', fullKey = 'missing-xi-full-v1-' + barca.id;
    localStorage.setItem(dailyKey, 'original'); localStorage.setItem(fullKey, 'old team sheet');
    const second = render(<FullXiRecall dailyLineup={daily} />);
    fireEvent.change(screen.getByLabelText('Match and team'), { target: { value: barca.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Scouting Challenge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Scout GK, slot 1' }));
    const list = await screen.findByRole('group', { name: /Scout report/ });
    const options = within(list).getAllByRole('button').map(b => b.textContent);
    second.unmount(); render(<FullXiRecall dailyLineup={daily} />);
    const restored = screen.getByRole('group', { name: /Scout report/ });
    expect(within(restored).getAllByRole('button').map(b => b.textContent)).toEqual(options);
    fireEvent.click(within(restored).getByRole('button', { name: barca.slots[0].name }));
    expect(await screen.findByText('1/11 named')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('region', { name: 'Scouting Challenge' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Scouting Challenge' })).toHaveFocus();
    expect(localStorage.getItem(dailyKey)).toBe('original');
    expect(localStorage.getItem(fullKey)).toBe('old team sheet');
  });
});
