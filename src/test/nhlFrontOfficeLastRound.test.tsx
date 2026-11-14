import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initNhlLeague, NHL_FO_ROUNDS, simNhlRound, type NhlLeague } from '@/lib/nhlFrontOffice';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'nhl-front-office-save-v1';
const team = 'BOS';
const read = () => JSON.parse(localStorage.getItem(key)!);
const openRound = () => fireEvent.click(screen.getByText('Play', { exact: true }));

function fixture(round: number) {
  const league = initNhlLeague(keyedRng('round history fixture'));
  league.round = round;
  league.inSeasonRatings = true;
  league.teams[team].players.forEach((p, i) => {
    Object.assign(p, { name: 'Fixture Skater ' + i, ovr: 78, pot: 89, age: i % 2 ? 36 : 20, out: 0, years: 3 });
  });
  return league;
}

function install(league: NhlLeague, lastRound?: unknown) {
  const raw = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, lastRound });
  localStorage.setItem(key, raw);
  return raw;
}

function chooseOracle(league: NhlLeague, exact: boolean) {
  for (let i = 0; i < 500; i++) {
    const seed = 'round result ' + i;
    const fork = structuredClone(league);
    const report = simNhlRound(fork, team, keyedRng(seed));
    const ratings = report.notes.filter(note => /OVR [+-]1/.test(note));
    if (ratings.length === 0) continue;
    if (exact && (report.myWins !== 2 || report.myLosses !== 1 || report.myOtLosses !== 1)) continue;
    return { seed, report, fork, ratings };
  }
  throw new Error('No matching NHL ratings fixture');
}

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NHL Front Office last round', () => {
  it.each([3, NHL_FO_ROUNDS])('keeps Round %d result, OVR and notes on reload', async round => {
    const league = fixture(round), before = install(league);
    const { seed, report, fork, ratings } = chooseOracle(league, round === 3);
    const view = render(<NhlFrontOfficeBoard />);
    openRound();
    expect(localStorage.getItem(key)).toBe(before);
    const playName = round === NHL_FO_ROUNDS ? /Final stretch/ : /Play Round 3/;
    const play = await screen.findByRole('button', { name: playName });
    await waitFor(() => expect(play).toBeEnabled());
    vi.spyOn(Math, 'random').mockImplementation(keyedRng(seed));
    fireEvent.click(play);
    const saved = read(), receipt = saved.lastRound;
    expect(receipt).toMatchObject({ team, season: league.season, round, wins: report.myWins, losses: report.myLosses, otLosses: report.myOtLosses });
    const exact = `Round ${round}: you went ${report.myWins}-${report.myLosses}-${report.myOtLosses}.`;
    expect(screen.getByText(exact)).toBeInTheDocument();
    const headline = receipt.notes.find((note: string) => ratings.includes(note));
    expect(headline).toBeTruthy();
    expect(screen.getByText(headline)).toBeInTheDocument();
    const player = fork.teams[team].players.find(p => headline.startsWith(p.name + ' OVR '))!;
    expect(saved.league.teams[team].players.find((p: typeof player) => p.id === player.id)?.ovr).toBe(player.ovr);
    if (round === NHL_FO_ROUNDS) expect(saved.postseason.series).toHaveLength(15);
    else expect(exact).toBe('Round 3: you went 2-1-1.');
    view.unmount();
    render(<NhlFrontOfficeBoard />);
    expect(await screen.findByText(exact)).toBeInTheDocument();
    expect(screen.getByText(headline)).toBeInTheDocument();
    expect(read()).toEqual(saved);
    if (round === 3) {
      openRound();
      fireEvent.click(screen.getByRole('button', { name: /Play Round 4/ }));
      expect(read().lastRound.round).toBe(4);
      expect(screen.queryByText(exact)).toBeNull();
    }
  });

  it('ignores stale or malformed optional receipts while opening the old save', () => {
    const league = fixture(4);
    const record = { team, season: league.season, round: 3, wins: 0, losses: 0, otLosses: 0, notes: ['Receipt fixture'] };
    for (const lastRound of [undefined, { ...record, team: 'NYR' }, { ...record, round: 2 }, { ...record, season: league.season - 1 },
      { ...record, otLosses: -1 }, { ...record, notes: [33] }]) {
      const raw = install(league, lastRound);
      const view = render(<NhlFrontOfficeBoard />);
      expect(screen.getByText('Play', { exact: true })).toBeVisible();
      expect(screen.queryByText('Receipt fixture')).toBeNull();
      expect(localStorage.getItem(key)).toBe(raw);
      view.unmount();
    }
  });
});
