import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initNhlLeague, nhlAiMoves, NHL_FO_ROUNDS, simNhlRound, type NhlLeague, type NhlProspect } from '@/lib/nhlFrontOffice';
import { keyedRng } from '@/lib/keyedRng';
import type { FoRoundResult } from '@/lib/foRoundHistory';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'nhl-front-office-save-v1';
const team = 'BOS';
const read = () => JSON.parse(localStorage.getItem(key)!);
const openRound = () => fireEvent.click(screen.getByText('Play', { exact: true }));
const roundResults = () => within(screen.getByRole('region', { name: 'Round results' }));
const ratingLines = (changes: [string, number, number][]) => changes.map(([name, delta, overall]) => `${name} ${delta > 0 ? '+' : ''}${delta} OVR to ${overall}`);

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
    const archived = saved.roundHistory.rounds[0];
    expect(archived).toMatchObject({ round, wins: report.myWins, losses: report.myLosses, otLosses: report.myOtLosses });
    expect(archived.changes.length).toBeGreaterThan(0);
    expect(roundResults().getAllByRole('listitem').map(row => row.textContent)).toEqual(ratingLines(archived.changes));
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
    } else {
      expect(roundResults().getByText(`Won ${report.myWins} · Lost ${report.myLosses} · OT losses ${report.myOtLosses}`)).toBeVisible();
    }
  });

  it('reopens a settled batch and legacy score without losing overtime, exact OVR or league fidelity', () => {
    const league = fixture(1);
    const earlier = simNhlRound(league, team, keyedRng('NHL legacy first round'));
    league.round += 1;
    const lastRound = { team, season: league.season, round: 1, wins: earlier.myWins, losses: earlier.myLosses, otLosses: earlier.myOtLosses, notes: [] };
    const before = install(league, lastRound);
    const view = render(<NhlFrontOfficeBoard />);
    openRound();
    expect(roundResults().getByText('Rating changes are unavailable for this round.')).toBeVisible();
    expect(localStorage.getItem(key)).toBe(before);

    const paired = structuredClone(league);
    const keySeed = 'NHL paired round records';
    const server = keyedRng(keySeed), ui = keyedRng(keySeed);
    let serverDraws = 0, uiDraws = 0;
    const draw = () => { serverDraws++; return server(); };
    vi.spyOn(Math, 'random').mockImplementation(() => { uiDraws++; return ui(); });
    const historical: FoRoundResult[] = [{ round: 1, wins: lastRound.wins, losses: lastRound.losses, otLosses: lastRound.otLosses, changes: null }];
    let moved = 0, overtimeLosses = 0;
    for (let round = 2; round <= 6; round += 1) {
      const starting = paired.teams[team].players.map(player => player.ovr);
      const batch = simNhlRound(paired, team, draw);
      const changes = paired.teams[team].players.flatMap<[string, number, number]>((player, i) => player.ovr === starting[i]
        ? [] : [[player.name, player.ovr - starting[i], player.ovr]]);
      nhlAiMoves(paired, team, draw);
      paired.round += 1;
      fireEvent.click(screen.getByRole('button', { name: `Play Round ${round}` }));
      historical.push({ round, wins: batch.myWins, losses: batch.myLosses, otLosses: batch.myOtLosses, changes });
      expect(read().league).toEqual(paired);
      expect(read().roundHistory).toEqual({ team, season: league.season, rounds: historical });
      if (!changes.length) expect(roundResults().getByText('No rating changes this round.')).toBeVisible();
      moved += changes.length;
      overtimeLosses += batch.myOtLosses;
    }
    expect(uiDraws).toBe(serverDraws);
    expect(moved).toBeGreaterThan(0);
    expect(overtimeLosses).toBeGreaterThan(0);
    const held = localStorage.getItem(key);
    view.unmount();
    render(<NhlFrontOfficeBoard />);
    openRound();
    fireEvent.change(roundResults().getByRole('combobox', { name: 'Played round' }), { target: { value: '1' } });
    expect(roundResults().getByText('Rating changes are unavailable for this round.')).toBeVisible();
    expect(roundResults().getByText(`Won ${lastRound.wins} · Lost ${lastRound.losses} · OT losses ${lastRound.otLosses}`)).toBeVisible();
    const changed = historical.find(row => row.changes?.length)!;
    fireEvent.change(roundResults().getByRole('combobox', { name: 'Played round' }), { target: { value: String(changed.round) } });
    expect(roundResults().getAllByRole('listitem').map(row => row.textContent)).toEqual(ratingLines(changed.changes!));
    expect(localStorage.getItem(key)).toBe(held);
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

  it('rejects archive rows outside the current franchise season and keeps their original save bytes', () => {
    const league = fixture(4);
    const played = { round: 2, wins: 0, losses: 0, otLosses: 0, changes: [['Invalid fixture', 1, 70]] };
    for (const roundHistory of [
      { team: 'NYR', season: league.season, rounds: [played] },
      { team, season: league.season - 1, rounds: [played] },
      { team, season: league.season, rounds: [{ ...played, round: 4 }, { ...played, otLosses: -1 }] },
      { team, season: league.season, rounds: [played, played] },
    ]) {
      const raw = JSON.stringify({ ...JSON.parse(install(league)), roundHistory });
      localStorage.setItem(key, raw);
      const view = render(<NhlFrontOfficeBoard />);
      openRound();
      fireEvent.change(roundResults().getByRole('combobox', { name: 'Played round' }), { target: { value: '2' } });
      expect(roundResults().getByText('Results and rating changes are unavailable for this round.')).toBeVisible();
      expect(roundResults().queryByText('Invalid fixture')).toBeNull();
      expect(localStorage.getItem(key)).toBe(raw);
      view.unmount();
    }
  });
});

describe('NHL draft prospect access', () => {
  function draft(shortlist?: unknown) {
    const league = fixture(NHL_FO_ROUNDS);
    league.teams[team].picks = [1, 2];
    const draftClass: NhlProspect[] = Array.from({ length: 24 }, (_, i) => ({
      id: 'fixture-draft-' + i, name: 'Fixture Prospect ' + String(i + 1).padStart(2, '0'),
      pos: i >= 14 ? 'G' : 'W', age: 19, grade: 76, trueOvr: 86,
    }));
    // Legacy draft path takes the first five prospects not chosen by the user.
    delete league.draftAffordabilityVersion;
    const raw = JSON.stringify({ league, myTeam: team, phase: 'draft', titles: 0, seasonsPlayed: 1,
      draftClass, picksLeft: 2, draftBatchesLeft: 2, draftShortlist: shortlist });
    localStorage.setItem(key, raw);
    return { raw, draftClass };
  }
  const section = () => within(screen.getByRole('region', { name: 'Draft prospects' }));
  const filter = () => section().getByRole('combobox', { name: 'Filter prospects' });
  const pin = (n: string) => section().getByRole('button', { name: 'Shortlist Fixture Prospect ' + n });
  const choose = (n: string) => section().getByRole('button', { name: new RegExp('^Fixture Prospect ' + n) });

  it('finds a goalie beyond the old 14, shortlists across reload, then really drafts him', () => {
    const { raw, draftClass } = draft();
    let page = render(<NhlFrontOfficeBoard />);
    expect(section().getByRole('status')).toHaveTextContent('1 to 12 of 24');
    expect(section().queryByRole('button', { name: /^Fixture Prospect 23/ })).toBeNull();
    fireEvent.click(section().getByRole('button', { name: 'Next page' }));
    expect(section().getByRole('status')).toHaveTextContent('13 to 24 of 24');
    expect(choose('23')).toHaveTextContent('76');
    expect(choose('23')).not.toHaveTextContent('86');
    fireEvent.change(filter(), { target: { value: 'G' } });
    expect(section().getByRole('status')).toHaveTextContent('1 to 10 of 10');
    expect(section().queryByRole('button', { name: /^Fixture Prospect 02/ })).toBeNull();
    expect(localStorage.getItem(key)).toBe(raw);

    fireEvent.click(pin('23'));
    expect(read().draftShortlist).toEqual([draftClass[22].id]);
    expect(read().picksLeft).toBe(2);
    fireEvent.change(filter(), { target: { value: 'all' } });
    fireEvent.click(pin('01'));
    fireEvent.click(pin('02'));
    expect(pin('03')).toBeDisabled();
    const beforeReload = localStorage.getItem(key);
    page.unmount();
    page = render(<NhlFrontOfficeBoard />);
    expect(localStorage.getItem(key)).toBe(beforeReload);
    fireEvent.change(filter(), { target: { value: 'shortlist' } });
    expect(section().getByRole('status')).toHaveTextContent('1 to 3 of 3');
    expect(pin('23')).toHaveAttribute('aria-pressed', 'true');
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('draft choice preserved'));
    fireEvent.click(choose('23'));
    const saved = read();
    expect(saved.league.teams[team].players.find((player: { name: string }) => player.name === draftClass[22].name))
      .toMatchObject({ name: draftClass[22].name, pos: 'G', ovr: 86 });
    expect(saved.picksLeft).toBe(1);
    expect(saved.draftClass).toHaveLength(18);
    expect(saved.draftShortlist).toBeUndefined();
    expect(section().getByRole('status')).toHaveTextContent('Your shortlist is empty.');
    page.unmount();
  });

  it('ignores invalid pins and reports a refused write without moving a pick', () => {
    const { draftClass, raw } = draft(['unknown', false, 'fixture-draft-0', 'fixture-draft-0', 'fixture-draft-23']);
    render(<NhlFrontOfficeBoard />);
    fireEvent.change(filter(), { target: { value: 'shortlist' } });
    expect(section().getByRole('status')).toHaveTextContent('1 to 2 of 2');
    expect(pin('01')).toHaveAttribute('aria-pressed', 'true');
    expect(pin('24')).toHaveAttribute('aria-pressed', 'true');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    fireEvent.click(pin('24'));
    expect(section().getByRole('alert')).toHaveTextContent('Could not save');
    expect(pin('24')).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(key)).toBe(raw);
    fireEvent.click(pin('24'));
    expect(read().draftShortlist).toEqual([draftClass[0].id]);
    expect(read().picksLeft).toBe(2);
    expect(section().queryByRole('alert')).toBeNull();
    expect(filter()).toHaveFocus();
  });
});
