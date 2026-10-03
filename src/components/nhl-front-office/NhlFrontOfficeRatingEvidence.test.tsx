/* Offline actual Board/engine integration. Save edits below are explicit simulation progress. */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { NHL_TEAMS } from '@/data/conquestDataNhl';
import { NHL_FO_ROSTERS } from '@/data/nhlFoPlayers';
import type { NhlOpeningRatingEvidence } from '@/data/nhlOpeningRatings';
import * as engine from '@/lib/nhlFrontOffice';
import type { NhlGmPlayer, NhlLeague, NhlProspect } from '@/lib/nhlFrontOffice';
import { deadMoneyFor } from '@/lib/frontOfficeCuts';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';
import { leagueNames } from '@/lib/foNames';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
// Delay only chunk resolution. Return the unchanged actual rating table.
const loading = vi.hoisted(() => {
  let finish: () => void = () => undefined;
  const promise = new Promise<void>(resolve => { finish = resolve; });
  return { promise, release: () => finish(), entered: false };
});
vi.mock('@/data/nhlOpeningRatings', async () => {
  loading.entered = true; await loading.promise;
  return vi.importActual('@/data/nhlOpeningRatings');
});
const { NHL_OPENING_RATINGS } = await vi.importActual<typeof import('@/data/nhlOpeningRatings')>('@/data/nhlOpeningRatings');

const KEY = 'nhl-front-office-save-v1';
const SENTINEL = 'nhl-evidence-unrelated-fixture';
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const saved = (): { league: NhlLeague; myTeam: string; phase: string; draftClass: NhlProspect[] | null; picksLeft: number } => JSON.parse(localStorage.getItem(KEY)!);
function seed(league: NhlLeague, team = 'ANA', draftClass: NhlProspect[] | null = null) {
  const save = { league, myTeam: team, phase: draftClass ? 'draft' : 'hub', titles: 0, seasonsPlayed: 0, draftClass, picksLeft: draftClass ? 2 : 0 };
  expect(isFrontOfficeSave(save, 'NHL', engine.NHL_FO_ROUNDS)).toBe(true);
  const raw = JSON.stringify(save); localStorage.setItem(KEY, raw); return raw;
}
const teamButton = (abbr: string) => {
  const t = NHL_TEAMS.find(t => t.id === abbr)!;
  return screen.getByRole('button', { name: new RegExp(`^${t.city} ${t.name}\\s`) });
};
const row = (player: NhlGmPlayer) => document.querySelector(`[data-roster-row="${player.id}"]`) as HTMLElement;
const marketRow = (player: NhlGmPlayer) => document.querySelector(`[data-fa-row="${player.id}"]`) as HTMLElement;
const note = (element: HTMLElement) => {
  const evidence = element.querySelector('[data-rating-evidence]');
  expect(evidence).not.toBeNull(); return evidence as HTMLElement;
};
const roster = () => fireEvent.click(screen.getByText('Roster'));
const hub = () => fireEvent.click(screen.getByRole('button', { name: 'Hub' }));
const market = () => fireEvent.click(screen.getByText('Free agency'));
async function start(abbr = 'ANA') {
  await act(async () => { fireEvent.click(teamButton(abbr)); });
  await waitFor(() => expect(saved().myTeam).toBe(abbr));
}
function evidencePlayer(league: NhlLeague, basis: NhlOpeningRatingEvidence['basis']) {
  for (const team of Object.values(league.teams)) {
    const player = team.players.find(p => p.openingRatingEvidence?.basis === basis);
    if (player) return { team: team.abbr, player };
  }
  throw new Error('Actual reviewed evidence fixture must exist');
}

describe('NHL actual opening ratings and readable saved evidence', () => {
  beforeEach(() => {
    localStorage.clear(); localStorage.setItem(SENTINEL, 'exact unrelated payload');
    vi.spyOn(Math, 'random').mockImplementation(rng(898));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('drops a real pending rating import after unmount without overwriting a newer save', async () => {
    const newer = engine.initNhlLeague(rng(80));
    const newerRaw = JSON.stringify({ league: newer, myTeam: 'BOS', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<NhlFrontOfficeBoard />); fireEvent.click(teamButton('ANA'));
    // The physical original sync Board is a completed-action baseline, not a pending import.
    if (!localStorage.getItem(KEY)) await waitFor(() => expect(loading.entered).toBe(true));
    view.unmount(); localStorage.setItem(KEY, newerRaw);
    const count = writes.mock.calls.filter(([key]) => key === KEY).length;
    loading.release(); await act(async () => { await import('@/data/nhlOpeningRatings'); });
    expect(localStorage.getItem(KEY)).toBe(newerRaw);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(count);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('starts actual ANA with all416 reviewed prices ratings and opening evidence', async () => {
    render(<NhlFrontOfficeBoard />); await start();
    const league = saved().league;
    expect(saved().phase).toBe('hub');
    expect(league.ratingModelVersion).toBe(engine.NHL_RATING_MODEL_VERSION);
    expect(league.draftAffordabilityVersion).toBe(engine.NHL_DRAFT_AFFORDABILITY_VERSION);
    let count = 0;
    for (const [abbr, originals] of Object.entries(NHL_FO_ROSTERS)) for (const original of originals) {
      const expected = NHL_OPENING_RATINGS[abbr][`${original.name}|${original.pos}`];
      const player = league.teams[abbr].players.find(p => p.name === original.name)!;
      expect({ ovr: player.ovr, salary: player.salary, evidence: player.openingRatingEvidence }).toEqual(expected);
      count++;
    }
    expect(count).toBe(416); roster();
    expect(document.querySelector('[data-rating-legend]')).toHaveTextContent('2024-25 and 2025-26 regular-season inputs');
    expect(document.querySelectorAll('[data-roster-row]')).toHaveLength(13);
    const partial = league.teams.ANA.players.filter(p => p.openingRatingEvidence!.partial).length;
    expect(document.querySelectorAll('[data-rating-partial]')).toHaveLength(partial);
    for (const player of league.teams.ANA.players) expect(note(row(player))).toHaveTextContent(`Opening estimate ${player.openingRatingEvidence!.openingOvr}:`);
    const forward = league.teams.ANA.players.find(p => p.openingRatingEvidence!.basis === 'offensive-production' && !p.openingRatingEvidence!.partial)!;
    expect(note(row(forward))).toHaveTextContent('Defense and other skills are not measured.');
    expect(row(forward).querySelector('[data-rating-partial]')).toBeNull();
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('settles two same-frame franchise clicks with one initializer and one save', async () => {
    const init = vi.spyOn(engine, 'initNhlLeague'), writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<NhlFrontOfficeBoard />); const ana = teamButton('ANA'), bos = teamButton('BOS');
    await act(async () => { ana.click(); bos.click(); });
    await waitFor(() => expect(saved().myTeam).toBe('ANA'));
    expect(init).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(saved().league.teams.ANA.players[0].openingRatingEvidence).toBeDefined();
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('holds legacy progression and exact saved bytes as an independent baseline', () => {
    const league = engine.initNhlLeague(rng(81)), player = league.teams.ANA.players[0];
    player.ovr = 66; player.pot = 77; player.salary = 3.4; player.years = 3; league.round = 11;
    const raw = seed(league), init = vi.spyOn(engine, 'initNhlLeague');
    render(<NhlFrontOfficeBoard />); roster();
    expect(row(player)).toHaveTextContent('66'); expect(row(player)).toHaveTextContent('$3.4M x3');
    expect(row(player).querySelector('[data-rating-evidence]')).toBeNull();
    expect(init).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('keeps opening estimates separate from developed grades after a real saved trade', () => {
    const league = engine.initNhlLeague(rng(83), NHL_OPENING_RATINGS);
    const player = league.teams.ANA.players[0], partner = league.teams.BOS.players[0];
    const original = clone(player.openingRatingEvidence)!;
    // This saved simulation allows the agreed swap, without changing either opening estimate.
    league.cap = 1000;
    expect(engine.nhlExecuteTalksTrade(league.teams.ANA, league.teams.BOS, player.id, partner.id, false, league.cap)).toBe('done');
    player.ovr = 67; player.pot = 71;
    const raw = seed(league, 'BOS'); render(<NhlFrontOfficeBoard />); roster();
    expect(row(player)).toHaveTextContent('67');
    expect(note(row(player))).toHaveTextContent(`Opening estimate ${original.openingOvr}: offensive production.`);
    expect(note(row(player))).not.toHaveTextContent('Opening estimate 67:');
    expect(saved().league.teams.BOS.players.find(p => p.id === player.id)!.openingRatingEvidence).toEqual(original);
    hub(); fireEvent.click(screen.getByText('Trades'));
    const shop = document.querySelector('[data-trade-shop-list]')!;
    const card = within(shop as HTMLElement).getByRole('button', { name: new RegExp(`^${player.name}`) });
    expect(note(card)).toHaveTextContent(`Opening estimate ${original.openingOvr}:`);
    expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('qualifies actual defense goalie and unmeasured evidence by their different limits', () => {
    const league = engine.initNhlLeague(rng(84), NHL_OPENING_RATINGS);
    for (const [basis, words] of [
      ['offense-usage-proxy', 'offense and usage proxy'],
      ['save-rate-proxy', 'save-rate proxy, shot quality unavailable'],
      ['unmeasured-prior', 'unmeasured game prior'],
    ] as const) {
      const { team, player } = evidencePlayer(league, basis), raw = seed(league, team);
      const view = render(<NhlFrontOfficeBoard />); roster();
      expect(note(row(player))).toHaveTextContent(words);
      expect(note(row(player))).toHaveTextContent('Limited opening evidence.');
      expect(row(player).querySelector('[data-rating-partial]')).toBeInTheDocument();
      expect(localStorage.getItem(KEY)).toBe(raw); view.unmount();
    }
  });

  it('marks damaged saved basis and version unavailable while preserving exact save bytes', () => {
    for (const damage of ['basis', 'version', 'role'] as const) {
      const league = engine.initNhlLeague(rng(85), NHL_OPENING_RATINGS), player = league.teams.ANA.players[0];
      if (damage === 'basis') player.openingRatingEvidence!.basis = 'damaged-save' as NhlOpeningRatingEvidence['basis'];
      if (damage === 'version') player.openingRatingEvidence!.modelVersion = 'unknown-model';
      if (damage === 'role') player.openingRatingEvidence!.basis = 'save-rate-proxy';
      const raw = seed(league), view = render(<NhlFrontOfficeBoard />); roster();
      expect(note(row(player))).toHaveTextContent('Opening rating evidence unavailable.');
      expect(row(player).querySelector('[data-rating-partial]')).toBeNull();
      expect(row(player)).toHaveTextContent(String(player.ovr));
      expect(localStorage.getItem(KEY)).toBe(raw); view.unmount();
    }
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('refuses an invalid opening version without overwriting another save and retries cleanly', async () => {
    render(<NhlFrontOfficeBoard />); const old = engine.initNhlLeague(rng(86)), raw = seed(old, 'BOS');
    const first = NHL_FO_ROSTERS.ANA[0], rating = NHL_OPENING_RATINGS.ANA[`${first.name}|${first.pos}`];
    const version = rating.evidence.modelVersion, writes = vi.spyOn(Storage.prototype, 'setItem');
    try {
      rating.evidence.modelVersion = 0 as unknown as string;
      await act(async () => { fireEvent.click(teamButton('ANA')); });
      expect(await screen.findByRole('alert')).toHaveTextContent('Try your team again. Your existing save is unchanged.');
      expect(localStorage.getItem(KEY)).toBe(raw);
      expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(0);
      expect(teamButton('ANA')).toBeEnabled();
    } finally { rating.evidence.modelVersion = version; }
    await start();
    expect(saved().league.teams.ANA.players[0].openingRatingEvidence!.modelVersion).toBe(version);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('forwards saved quote version through actual waiver market display and signing', () => {
    const league = engine.initNhlLeague(rng(87), NHL_OPENING_RATINGS);
    const waived = league.teams.ANA.players[0];
    waived.ovr = 92; waived.salary = 0.7;
    const cost = deadMoneyFor(waived), quote = engine.nhlSalaryFor(waived.ovr, league.ratingModelVersion);
    league.cap = 1000; seed(league); const view = render(<NhlFrontOfficeBoard />); roster();
    fireEvent.click(within(row(waived)).getByRole('button', { name: /^Waive, / }));
    fireEvent.click(within(row(waived)).getByRole('button', { name: 'Waive him' }));
    const committed = saved().league;
    expect(committed.freeAgents.find(p => p.id === waived.id)!.salary).toBe(quote);
    expect(committed.teams.ANA.deadCap!.find(entry => entry.playerId === waived.id)!.amount).toBe(cost.now);
    expect(committed.freeAgents.find(p => p.id === waived.id)!.openingRatingEvidence).toEqual(waived.openingRatingEvidence);
    hub(); market();
    expect(note(marketRow(waived))).toHaveTextContent(`Opening estimate ${waived.openingRatingEvidence!.openingOvr}:`);
    expect(within(marketRow(waived)).getByRole('button', { name: 'Sign' })).toBeDisabled();
    view.unmount();
    // Another club releases a developed player. A stale pool ask must not become a cheap new contract.
    const target = committed.teams.BOS.players[0]; target.ovr = 94;
    expect(engine.nhlRelease(committed.teams.BOS, committed.freeAgents, target.id, committed.ratingModelVersion)).toBe(true);
    const free = committed.freeAgents.find(p => p.id === target.id)!; free.salary = 0.7;
    const actualAsk = engine.nhlSalaryFor(free.ovr, committed.ratingModelVersion);
    committed.cap = Math.round((engine.nhlCapUsed(committed.teams.ANA) + actualAsk - 0.1) * 10) / 10;
    const raw = seed(committed), low = render(<NhlFrontOfficeBoard />); market();
    expect(marketRow(free)).toHaveTextContent(`wants $${actualAsk}M`);
    expect(within(marketRow(free)).getByRole('button', { name: 'Sign' })).toBeDisabled();
    expect(localStorage.getItem(KEY)).toBe(raw); low.unmount();
    committed.cap = 1000; seed(committed); render(<NhlFrontOfficeBoard />); market();
    fireEvent.click(within(marketRow(free)).getByRole('button', { name: 'Sign' }));
    const signed = saved().league.teams.ANA.players.find(p => p.id === free.id)!;
    expect(signed.salary).toBe(actualAsk); expect(signed.openingRatingEvidence).toEqual(free.openingRatingEvidence);
    expect(saved().league.freeAgents.some(p => p.id === free.id)).toBe(false);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });

  it('forwards saved quote version through an actual GM pick and guarded AI draft', () => {
    const league = engine.initNhlLeague(rng(88), NHL_OPENING_RATINGS);
    league.round = engine.NHL_FO_ROUNDS;
    const draftClass = engine.nhlDraftClass(rng(8981), 24, leagueNames(league)), chosen = draftClass[0];
    const ai = vi.spyOn(engine, 'nhlAiDraftPicks'); seed(league, 'ANA', draftClass);
    render(<NhlFrontOfficeBoard />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${chosen.name}\\s`) }));
    const result = saved(), gm = result.league.teams.ANA.players.find(p => p.name === chosen.name)!;
    expect(gm.ovr).toBe(chosen.trueOvr);
    expect(gm.salary).toBe(engine.nhlSalaryFor(chosen.trueOvr, league.ratingModelVersion));
    expect(ai).toHaveBeenCalledTimes(1);
    const decision = ai.mock.results[0].value as ReturnType<typeof engine.nhlAiDraftPicks>;
    expect(decision.guarded).toBe(true);
    expect(decision.picks.length).toBeGreaterThan(0);
    for (const { team, prospect } of decision.picks) {
      const player = result.league.teams[team].players.find(p => p.name === prospect.name)!;
      expect(player.ovr).toBe(prospect.trueOvr);
      expect(player.salary).toBe(engine.nhlSalaryFor(prospect.trueOvr, league.ratingModelVersion));
    }
    expect(result.draftClass).toEqual(decision.remaining); expect(result.picksLeft).toBe(1);
    expect(result.league.season).toBe(league.season);
    expect(localStorage.getItem(SENTINEL)).toBe('exact unrelated payload');
  });
});
