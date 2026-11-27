import './dailyReload/mocks';
import { useNavigate } from 'react-router-dom';
import { cleanup, screen, within } from '@testing-library/react';
import MissingXi from '@/pages/MissingXi';
import { recordCompletion } from '@/lib/completions';
import { click, mountPage } from './dailyReload/harness';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { drawDuel, duelPoints, duelProgress, readDuel, restoreDuel, saveDuel } from '@/lib/missingXiDuel';
import { LINEUPS, HELD_LINEUP_IDS } from '@/lib/missingXi';

describe('Missing XI Lineup Duel', () => {
  it('makes three different verified starters playable on every eligible side and preserves each ordered blank through archive edits', () => {
    const eligible = LINEUPS.filter(l => !HELD_LINEUP_IDS.has(l.id) && new Set(l.blankCandidates.map(b => l.slots[b.slotIndex].position)).size >= 3);
    expect(eligible.length).toBeGreaterThan(10);
    for (const lineup of eligible) {
      const code = drawDuel([], [lineup])!;
      const d = readDuel('#duel=' + code)!;
      expect(d.lineup.id).toBe(lineup.id);
      expect(new Set(d.blanks.map(b => b.slotIndex)).size).toBe(3);
      const changed = { ...lineup, blankCandidates: [...lineup.blankCandidates].reverse() };
      const received = readDuel('#duel=' + code + '~x21', [changed])!;
      expect(received.blanks).toEqual(d.blanks);
      expect(received.comparison).toBe('x21');
      expect(code).not.toMatch(/\s/);
      expect(duelProgress(d, received.blanks.map(b => b.name))?.card).toBe('111');
      expect(drawDuel([lineup.id], [lineup])).toBeNull();
    }
    console.info('Lineup Duel verified sides:', eligible.length);
  });

  it('preserves a v1 card across different canonical spelling if the old name is still a verified alias, and rejects replaced or duplicated answers', () => {
    const lineup = LINEUPS[0], code = drawDuel([], [lineup])!;
    const d = readDuel('#duel=' + code)!;
    const [first] = d.blanks;
    const change = (aliases: string[]) => ({ ...lineup, blankCandidates: lineup.blankCandidates.map(b =>
      b === first ? { ...b, name: 'Corrected spelling for test', aliases } : b) });
    expect(readDuel('#duel=' + code, [change([first.name])])?.blanks[0].slotIndex).toBe(first.slotIndex);
    expect(readDuel('#duel=' + code, [change([])])).toBeNull();
    const parts = code.split('.');
    parts[3] = parts[2];
    expect(readDuel('#duel=' + parts.join('.'))).toBeNull();
    for (const suffix of ['~1234', '~444', '~100', '~']) expect(readDuel('#duel=' + code + suffix)).toBeNull();
    expect(readDuel('#duel=' + code.replace('v1.', 'v2.'))).toBeNull();
  });

  it('scores misses, passes and wins per blank, with a bounded independent reload log', () => {
    const d = readDuel('#duel=' + drawDuel([], [LINEUPS[0]]))!;
    const guesses = ['Wrong first', d.blanks[0].name, null, 'Wrong first', 'Wrong second', d.blanks[2].name];
    const card = duelProgress(d, guesses)!.card;
    expect(card).toBe('2x3');
    expect(duelPoints(card)).toBe(110);
    expect(duelProgress(d, ['a','b','c'])?.card).toBe('x');
    expect(duelProgress(d, ['A','a'])).toBeNull();
    expect(restoreDuel(d, JSON.stringify({ code: d.code, guesses }))).toEqual(guesses);
    for (const saved of [{ code: d.code, guesses: [...guesses,'extra'] }, { code: 'other', guesses }, { code: d.code, guesses:[false] }])
      expect(restoreDuel(d, JSON.stringify(saved))).toEqual([]);
  });
});


afterEach(() => { cleanup(); sessionStorage.clear(); localStorage.clear(); vi.clearAllMocks(); });

it('opens a published v1 link without leaking starters, resumes its card, and keeps daily scoring and earlier modes independent', async () => {
  const code = 'v1.cl-2011-final-barca.727fy7.eyx29s.jvznn';
  const path = '/missing-xi#duel=' + code + '~211';
  expect(readDuel('#duel=' + code)?.blanks.map(b => b.name)).toEqual(['Javier Mascherano', 'Eric Abidal', 'Pedro']);
  const draftKey = 'dukb-missing-xi-unlimited-v1';
  const older = JSON.stringify({ lineupId: LINEUPS[0].id, slotIndex: 3, misses: ['Pedro'], active: true });
  localStorage.setItem(draftKey, older);
  sessionStorage.setItem('missing-xi-full-open', '1');
  async function open() {
    const page = mountPage(<MissingXi />, path);
    const rules = screen.queryByRole('button', { name: "Let's Play!" });
    if (rules) await click(rules);
    return page;
  }
  const first = await open();
  let duel = within(screen.getByRole('region', { name: 'Lineup Duel' }));
  const team = within(duel.getByRole('list', { name: 'Barcelona starting XI' }));
  expect(team.getAllByText(/^Blank [123]$/)).toHaveLength(3);
  for (const name of ['Javier Mascherano', 'Eric Abidal', 'Pedro']) expect(team.queryByText(name)).toBeNull();
  await click(duel.getByRole('button', { name: 'Pass this blank' }));
  first.unmount();
  await open();
  duel = within(screen.getByRole('region', { name: 'Lineup Duel' }));
  expect(duel.getByRole('heading', { name: 'Blank 2 of 3 · LB' })).toBeInTheDocument();
  await click(duel.getByRole('button', { name: 'Pass this blank' }));
  await click(duel.getByRole('button', { name: 'Pass this blank' }));
  expect(duel.getByRole('heading', { name: 'Your friend won' })).toBeInTheDocument();
  expect(duel.getByText(/Friend scored 270/)).toBeInTheDocument();
  expect(recordCompletion).not.toHaveBeenCalled();
  expect(localStorage.getItem(draftKey)).toBe(older);
  expect(sessionStorage.getItem('missing-xi-full-open')).toBe('1');
});

it('keeps the original single-card save and both played cards across Back, Forward and reload', async () => {
  const code = 'v1.cl-2011-final-barca.727fy7.eyx29s.jvznn';
  const path = '/missing-xi#duel=' + code + '~211';
  const previous = JSON.stringify({ code, guesses: ['Javier Mascherano'] });
  sessionStorage.setItem('dukb-missing-xi-duel-v1', previous);
  function History() {
    const navigate = useNavigate();
    return <><button onClick={() => navigate(-1)}>Browser back</button><button onClick={() => navigate(1)}>Browser forward</button></>;
  }
  const view = mountPage(<><History /><MissingXi /></>, path);
  const rules = screen.queryByRole('button', { name: "Let's Play!" });
  if (rules) await click(rules);
  expect(screen.getByRole('heading', { name: 'Blank 2 of 3 · LB' })).toBeInTheDocument();
  const pass = () => click(screen.getByRole('button', { name: 'Pass this blank' }));
  await pass(); await pass();
  await click(screen.getByRole('button', { name: 'Deal a new match' }));
  await pass();
  await click(screen.getByRole('button', { name: 'Browser back' }));
  expect(screen.getByRole('heading', { name: 'Your friend won' })).toBeInTheDocument();
  expect(screen.getByText('100/300 points')).toBeInTheDocument();
  await click(screen.getByRole('button', { name: 'Browser forward' }));
  expect(screen.getByRole('heading', { name: /^Blank 2 of 3/ })).toBeInTheDocument();
  view.unmount();
  mountPage(<MissingXi />, path);
  expect(screen.getByRole('heading', { name: 'Your friend won' })).toBeInTheDocument();
  expect(sessionStorage.getItem('dukb-missing-xi-duel-v1')).toBe(previous);
});

it('keeps the twelve most recently played cards and leaves other session data alone', () => {
  const cards = LINEUPS.flatMap(lineup => {
    const code = drawDuel([], [lineup]);
    return code ? [readDuel('#duel=' + code)!] : [];
  }).slice(0, 13);
  sessionStorage.setItem('unrelated', 'keep');
  cards.slice(0, 12).forEach(card => saveDuel(card, [null]));
  saveDuel(cards[0], [null, null]);
  saveDuel(cards[12], [null]);
  expect(restoreDuel(cards[0])).toEqual([null, null]);
  expect(restoreDuel(cards[1])).toEqual([]);
  expect(cards.slice(2).every(card => restoreDuel(card).length === 1)).toBe(true);
  expect(sessionStorage.getItem('unrelated')).toBe('keep');
});
