import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SoccerFrontier } from '@/components/conquest/SoccerFrontier';
import { INITIAL_TERRITORIES_SOCCER, SOCCER_ADJACENCY, SOCCER_CLUBS, SOCCER_IMPERIALISM, SOCCER_REGIONS } from '@/data/soccerConquest';
import { homeWinProb, matchupMomentum, statesOf } from '@/lib/imperialismEngine';
import { contestFront, frontierBoard, FRONTIER_KEY, readFrontier, type FrontierRun } from '@/lib/soccerFrontier';

const start = (club = 'MUN', seed = 6): FrontierRun => ({ club, seed, games: [] });
const play = (run: FrontierRun, rivals: string[]) => rivals.reduce((s, id) => contestFront(s, id)!, run);
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('offers real borders, the published away odds and an attainable target from every starting club', () => {
  const ferries: string[] = [], single: string[] = [];
  function canWin(run: FrontierRun): boolean {
    const board = frontierBoard(run);
    if (board.finished) return board.won;
    return board.fronts.some(f => {
      const flipped = statesOf(board.owners, f.id);
      return canWin({ ...run, games: [...run.games, { home: f.id, away: run.club, winner: run.club,
        homeScore: 0, awayScore: 1, swing: flipped.length, flipped, overtime: false, comeback: false, nothingAtStake: false }] });
    });
  }
  for (const club of SOCCER_CLUBS) {
    const run = start(club.id);
    const board = frontierBoard(run);
    const borders = new Set(board.regions.flatMap(r => SOCCER_ADJACENCY[r]).map(r => INITIAL_TERRITORIES_SOCCER[r]));
    borders.delete(club.id);
    expect(board.fronts.length).toBeGreaterThan(0);
    expect(new Set(board.fronts.map(f => f.id)).size).toBe(board.fronts.length);
    expect(board.fronts.length).toBeLessThanOrEqual(3);
    if (board.ferry) ferries.push(club.id);
    if (board.fronts.length === 1) single.push(club.id);
    for (const f of board.fronts) {
      expect(borders.size === 0 || borders.has(f.id)).toBe(true);
      expect(f.chance).toBeCloseTo(1 - homeWinProb(SOCCER_IMPERIALISM, f.id, club.id, matchupMomentum(f.id, club.id, board.owners)));
    }
    expect(canWin(run), club.name).toBe(true);
  }
  expect(ferries).toEqual(['CAG']);
  expect(single).toHaveLength(1);
});

it('changes the match, land, future opponents and final outcome on paired campaigns', () => {
  const run = start();
  const first = frontierBoard(run);
  expect(first.fronts.map(f => [f.id, f.regions, Math.round(f.chance * 100)])).toEqual([
    ['AVL',3,54], ['COV',1,71], ['EVE',2,62],
  ]);
  expect(contestFront(run, 'CAG')).toBeNull();
  const risky = contestFront(run, 'EVE')!, safe = contestFront(run, 'COV')!;
  expect(risky.games[0].home).toBe('EVE');
  expect(safe.games[0].home).toBe('COV');
  expect(risky.games[0].swing).toBe(2);
  expect(safe.games[0].swing).toBe(1);
  for (const [next, id] of [[risky, 'EVE'], [safe, 'COV']] as const) {
    const after = frontierBoard(next);
    expect(after.rivals.filter(r => !first.rivals.includes(r))).toHaveLength(first.fronts.find(f => f.id === id)!.opens);
    expect(next.games[0].flipped).toEqual(statesOf(first.owners, id));
    expect(next.games[0].flipped.every(region => after.owners[region] === run.club)).toBe(true);
    expect(Object.keys(after.owners)).toEqual(Object.keys(INITIAL_TERRITORIES_SOCCER));
  }
  expect(frontierBoard(risky).fronts.map(f => f.id)).not.toEqual(frontierBoard(safe).fronts.map(f => f.id));
  const win = play(risky, ['LEE','HUL']);
  const loss = play(safe, ['EVE','AVL']);
  expect(win.games.map(g => [g.awayScore, g.homeScore, g.overtime])).toEqual([[1,0,false], [2,1,false], [1,1,true]]);
  expect(frontierBoard(win)).toMatchObject({ won: true, finished: true, gained: 5, fronts: [] });
  expect(frontierBoard(loss)).toMatchObject({ won: false, finished: true, regions: [], fronts: [] });
  expect(contestFront(win, 'AVL')).toBeNull();
  expect(contestFront(loss, 'AVL')).toBeNull();
});

it('ends a surviving three-match shortfall and gives an island club a separate ferry choice before its land borders', () => {
  const deadline = play(start('ARS', 1), ['COV','CHE','BHA']);
  expect(frontierBoard(deadline)).toMatchObject({ finished: true, won: false, gained: 3, fronts: [] });
  const island = start('CAG', 1);
  expect(frontierBoard(island)).toMatchObject({ ferry: true, rivals: expect.arrayContaining(['FIO','GEN','LAZ']) });
  const landed = contestFront(island,'GEN')!;
  expect(frontierBoard(landed)).toMatchObject({ ferry: false, gained: 1 });
  expect(frontierBoard(landed).fronts.map(f => f.id)).toEqual(['FIO','PAR','MIL']);
});

it('restores actual match receipts and rejects forged borders, scores or extra matches', () => {
  const run = play(start(), ['EVE','LEE','HUL']);
  const raw = JSON.stringify(run), restored = readFrontier(raw)!;
  expect(restored).toEqual(run);
  expect(frontierBoard(restored).owners).toEqual(frontierBoard(run).owners);
  expect(readFrontier(JSON.stringify({ ...run, games: [...run.games, run.games[0]] }))).toBeNull();
  for (const edit of [{ home: 'CAG' }, { flipped: ['fake'], swing: 1 }, { awayScore: 99 }, { overtime: true }]) {
    expect(readFrontier(JSON.stringify({ ...run, games: [{ ...run.games[0], ...edit }] }))).toBeNull();
  }
});

it('replays a completed draw, compares only the previous route after reload, and keeps a fresh campaign separate', () => {
  const original = play(start(), ['EVE','LEE','HUL']);
  localStorage.setItem(FRONTIER_KEY, JSON.stringify(original));
  const first = render(<SoccerFrontier />);
  fireEvent.click(screen.getByText('Review frontier campaign'));
  fireEvent.click(screen.getByText('Replay the same draw'));
  const read = () => readFrontier(localStorage.getItem(FRONTIER_KEY))!;
  expect(read()).toEqual({ club: original.club, seed: original.seed, games: [], previous: original.games });
  fireEvent.click(screen.getByRole('button', { name: /Challenge Everton/ }));
  first.unmount();
  render(<SoccerFrontier />);
  fireEvent.click(screen.getByText('Resume frontier campaign'));
  expect(screen.getByRole('region', { name: 'Previous run on this draw' })).toHaveTextContent('Everton → Leeds United → Hull City');
  fireEvent.click(screen.getByRole('button', { name: /Challenge Leeds United/ }));
  fireEvent.click(screen.getByRole('button', { name: /Challenge Hull City/ }));
  expect(read().games).toEqual(original.games);
  fireEvent.click(screen.getByText('Replay the same draw'));
  for (const name of ['Coventry City','Everton','Aston Villa']) fireEvent.click(screen.getByRole('button', { name: 'Challenge ' + name }));
  expect(screen.getByText(/Eliminated. Your empire/)).toBeInTheDocument();
  expect(screen.getByText('Previous run · Campaign won')).toBeInTheDocument();
  const alternate = read().games;
  fireEvent.click(screen.getByText('Replay the same draw'));
  expect(read().previous).toEqual(alternate);
  expect(screen.getByText('Previous run · Eliminated')).toBeInTheDocument();
  expect(screen.queryByText(/Everton → Leeds United/)).not.toBeInTheDocument();
  for (const name of ['Coventry City','Everton','Aston Villa']) fireEvent.click(screen.getByRole('button', { name: 'Challenge ' + name }));
  vi.spyOn(Math, 'random').mockReturnValue(original.seed / 0x100000000);
  fireEvent.click(screen.getByText('Play another campaign'));
  fireEvent.click(screen.getByText('Start frontier campaign'));
  expect(read().seed).not.toBe(original.seed);
  expect(read().previous).toBeUndefined();
});

it('returns keyboard focus without scrolling on Back, Escape and Close after the opener changes label', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(6 / 0x100000000);
  render(<SoccerFrontier />);
  const opener = screen.getByRole('button', { name: 'Play frontier campaign' });
  const focus = vi.spyOn(opener, 'focus');
  const returned = async (label: string) => {
    await waitFor(() => expect(opener).toHaveFocus());
    expect(opener).toHaveAccessibleName(label);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockClear();
  };
  fireEvent.click(opener);
  fireEvent.change(screen.getByLabelText('Starting club'), { target: { value: 'MUN' } });
  fireEvent.click(screen.getByText('Start frontier campaign'));
  fireEvent.click(screen.getByText('Back to Soccer Conquest'));
  await returned('Resume frontier campaign');
  fireEvent.click(opener);
  for (const name of ['Everton','Leeds United','Hull City']) fireEvent.click(screen.getByRole('button', { name: 'Challenge ' + name }));
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  await returned('Review frontier campaign');
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await returned('Review frontier campaign');
});

it('resumes from the chosen front, plays through elimination and starts a new campaign without writing a daily result', () => {
  vi.spyOn(Math, 'random').mockReturnValue(6 / 0x100000000);
  localStorage.setItem('dukb-conquest-soccer-daily-history', 'saved daily');
  const first = render(<SoccerFrontier />);
  fireEvent.click(screen.getByText('Play frontier campaign'));
  fireEvent.change(screen.getByLabelText('Starting club'), { target: { value: 'MUN' } });
  fireEvent.click(screen.getByText('Start frontier campaign'));
  fireEvent.click(screen.getByRole('button', { name: /Challenge Coventry/ }));
  const raw = localStorage.getItem(FRONTIER_KEY);
  first.unmount();
  render(<SoccerFrontier />);
  fireEvent.click(screen.getByText('Resume frontier campaign'));
  expect(localStorage.getItem(FRONTIER_KEY)).toBe(raw);
  fireEvent.click(screen.getByRole('button', { name: /Challenge Everton/ }));
  fireEvent.click(screen.getByRole('button', { name: /Challenge Aston Villa/ }));
  expect(screen.getByText(/Eliminated. Your empire was captured/)).toBeInTheDocument();
  fireEvent.click(screen.getByText('Territory after match 1'));
  const firstCapture = readFrontier(raw)!.games[0].flipped[0];
  const capturedName = SOCCER_REGIONS.find(r => r.id === firstCapture)!.name;
  expect(screen.getAllByText(capturedName + ' · now held by Aston Villa').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: /^Challenge / })).toBeNull();
  expect(Object.keys(localStorage).sort()).toEqual([FRONTIER_KEY, 'dukb-conquest-soccer-daily-history'].sort());
  expect(localStorage.getItem('dukb-conquest-soccer-daily-history')).toBe('saved daily');
  fireEvent.click(screen.getByText('Play another campaign'));
  fireEvent.click(screen.getByText('Start frontier campaign'));
  expect(readFrontier(localStorage.getItem(FRONTIER_KEY))?.games).toEqual([]);
});
