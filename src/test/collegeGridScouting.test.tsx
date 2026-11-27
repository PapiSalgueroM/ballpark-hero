import fs from 'node:fs';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CollegeGridScouting } from '@/components/college-grid/CollegeGridScouting';
import { collegeGridPuzzles } from '@/data/collegeGridPuzzles';
import { decodeCollegeKey, judgeCollegeCell, toCollegeJudgeEntry, type CollegeGridData } from '@/lib/collegeGrid';
import { mulberry32, normalizeGridName } from '@/lib/gridEngine';
import { dealScoutRun, placeScout, readScoutRun, reviewScoutRun, SCOUT_KEY } from '@/lib/collegeGridScouting';

let key: CollegeGridData;
const board = collegeGridPuzzles[0];
const schools = board.rows.map(r => r.label);
const permutations = [[0,1,2], [0,2,1], [1,0,2], [1,2,0], [2,0,1], [2,1,0]];
beforeAll(() => {
  const files = ['Search', 'Judge'].map(n => JSON.parse(fs.readFileSync('src/data/collegeGrid/collegeGrid' + n + '.json', 'utf8')));
  const rows = decodeCollegeKey(files);
  expect(rows!.length).toBeGreaterThan(25000);
  key = { players: [], byNormalizedName: new Map() };
  for (const row of rows!) {
    const p = toCollegeJudgeEntry(row)!;
    const name = normalizeGridName(p.name);
    key.players.push(p);
    key.byNormalizedName.set(name, [...(key.byNormalizedName.get(name) ?? []), p]);
  }
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('deals both rooms on all 75 daily boards with exactly one allocation and verified alternatives', () => {
  const schoolsSeen = new Set<string>();
  collegeGridPuzzles.forEach((p, i) => {
    const excluded = p.rows.map(r => r.label);
    for (const focus of ['draft','position'] as const) {
      const run = dealScoutRun(key, p.id, excluded, focus, mulberry32(i))!;
      expect(run).toBeTruthy();
      expect(excluded).not.toContain(run.school);
      schoolsSeen.add(run.school);
      const review = reviewScoutRun(run, key, excluded)!;
      const matrix = review.players.map(entry => {
        expect(entry.colleges.some(s => excluded.includes(s))).toBe(false);
        return run.labels.map(label => judgeCollegeCell(entry, run.school, label));
      });
      expect(matrix.flat()).not.toContain('unknown');
      expect(matrix.some(line => line.filter(v => v === 'yes').length > 1)).toBe(true);
      const legal = permutations.filter(slots => slots.every((player, role) => matrix[player][role] === 'yes'));
      expect(legal).toEqual([review.solution]);
      for (const slots of permutations) expect(review.legal(slots)).toBe(slots.filter((name, role) => matrix[name][role] === 'yes').length);
      expect(permutations.some(slots => review.legal(slots) > review.correct(slots))).toBe(true);
      expect(run.labels.includes('Top 10 Pick')).toBe(focus === 'draft');
    }
  });
  expect(schoolsSeen.size).toBeGreaterThan(20);
});

it('swaps occupied spots, refuses duplicated assignments, and keeps a changed key free of charged attempts', () => {
  const run = dealScoutRun(key, board.id, schools, 'draft', mulberry32(21))!;
  expect(placeScout([1,2,-1], 0, 2)).toEqual([2,1,-1]);
  expect(placeScout([1,2,-1], 2, 2)).toEqual([1,-1,2]);
  expect(readScoutRun(JSON.stringify({ ...run, slots: [0,0,2] }), board.id)).toBeNull();
  expect(readScoutRun(JSON.stringify(run), 'different-board')).toBeNull();
  const removed = new Map(key.byNormalizedName);
  removed.delete(normalizeGridName(run.names[0]));
  expect(reviewScoutRun(run, { ...key, byNormalizedName: removed }, schools)).toBeNull();
  expect(reviewScoutRun(run, key, [...schools, run.school])).toBeNull();
  expect(run.tries).toEqual([]);
});

it('retains one scout, an edited class and the first miss through reload, then wins without altering the daily save', async () => {
  const dailyKey = 'college-grid-daily-fixture';
  localStorage.setItem(dailyKey, 'existing daily action');
  const mount = () => render(<CollegeGridScouting puzzle={board} data={key} loadKey={async () => key} />);
  const first = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Play scouting challenge' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deal draft room' }));
  const get = () => readScoutRun(localStorage.getItem(SCOUT_KEY), board.id)!;
  const run = get();
  const answer = reviewScoutRun(run, key, schools)!.solution;
  fireEvent.click(screen.getByRole('button', { name: run.names[0] }));
  const selects = () => screen.getAllByRole('combobox');
  const set = (slots: number[]) => slots.forEach((n, i) => fireEvent.change(selects()[i], { target: { value: n } }));
  set([answer[1],answer[0],answer[2]]);
  fireEvent.click(screen.getByRole('button', { name: 'Submit class' }));
  expect(screen.getByText(/1 of 3 in place/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Submit final class' })).toBeDisabled();
  first.unmount();
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Open scouting challenge' }));
  expect(get().file).toBe(0);
  expect(get().tries).toHaveLength(1);
  expect(selects().map(s => Number((s as HTMLSelectElement).value))).toEqual([answer[1],answer[0],answer[2]]);
  set(answer);
  fireEvent.click(screen.getByRole('button', { name: 'Submit final class' }));
  expect(screen.getByText(/Class signed!/)).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(localStorage.getItem(dailyKey)).toBe('existing daily action');
  fireEvent.click(screen.getByRole('button', { name: 'Deal position room' }));
  expect(get().focus).toBe('position');
  expect(get().tries).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Back to daily grid' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Open scouting challenge' })).toHaveFocus());
});

it('allows two verified misses and reveals the class, while absent records preserve every saved byte', async () => {
  const run = dealScoutRun(key, board.id, schools, 'position', mulberry32(9))!;
  const review = reviewScoutRun(run, key, schools)!;
  const wrong = permutations.find(p => review.correct(p) === 0)!;
  const other = permutations.find(p => p !== wrong && review.correct(p) === 0)!;
  const raw = JSON.stringify({ ...run, slots: other, tries: [wrong] });
  localStorage.setItem(SCOUT_KEY, raw);
  const retry = vi.fn().mockResolvedValue(null);
  const mounted = render(<CollegeGridScouting puzzle={board} data={null} loadKey={retry} />);
  fireEvent.click(screen.getByText('Open scouting challenge'));
  expect(screen.queryByText('Submit final class')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry player records' })); });
  expect(retry).toHaveBeenCalledOnce();
  expect(localStorage.getItem(SCOUT_KEY)).toBe(raw);
  mounted.rerender(<CollegeGridScouting puzzle={board} data={key} loadKey={retry} />);
  fireEvent.click(screen.getByText('Submit final class'));
  const dlg = within(screen.getByRole('dialog'));
  expect(dlg.getByText(/Signing closed/)).toBeInTheDocument();
  expect(dlg.getAllByRole('listitem')).toHaveLength(3);
  expect(dlg.queryByRole('combobox')).toBeNull();
});
