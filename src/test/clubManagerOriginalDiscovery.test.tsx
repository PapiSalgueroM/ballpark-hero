import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { TransferScreen } from '@/components/club-manager/TransferScreen';
import * as CM from '@/lib/clubManager';
import * as Eras from '@/lib/clubManagerEras';
import { readWorldRoster, type WorldRosterState } from '@/lib/clubManagerWorldRoster';
import type { CareerState, CMPlayer, MarketPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';

interface Discovery {
  readonly key: string;
  readonly name: string;
  readonly position: Position;
  readonly projectedAge: number;
  readonly projectionYear: number;
  readonly careerStatus: 'untracked';
}
interface RawOriginal {
  key: string;
  origin: { eraId: string; club: string; name: string; position: Position; birthYear: number; since: 0 };
  player: Eras.ProjectedPlayer;
}

function discoveries(career: CareerState): readonly Discovery[] {
  const fn = (CM as unknown as {
    projectedOriginalDiscoveriesFor?: (career: CareerState) => readonly Discovery[];
  }).projectedOriginalDiscoveriesFor;
  expect(typeof fn, 'CM_DISCOVERY_API: read-only caller exists').toBe('function');
  return fn!(career);
}

function raw(career: CareerState): RawOriginal[] {
  const fn = (Eras as unknown as {
    projectedActiveOriginalsFor?: (era: string, year: number, seed?: number) => RawOriginal[];
  }).projectedActiveOriginalsFor;
  expect(typeof fn, 'CM_DISCOVERY_RAW_PREREQUISITE').toBe('function');
  return fn!(career.eraId ?? 'now', CM.yearsOn(career), career.worldSeed);
}

function career(): CareerState {
  const rng = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  try {
    const c = CM.startCareer('Real Madrid', 'era2005', undefined, undefined, { yearsOn: 3, uclField: null, keepLeagueOverrides: false, worldSeed: 31 });
    return { ...c, transferWindow: 'summer', goneNames: [], retiredNames: [], releasedNames: [],
      freeAgents: [], loanedOut: [], negotiation: null,
      worldRoster: { version: 1, eraId: 'era2005', records: [] } };
  } finally { rng.mockRestore(); }
}

function original(c: CareerState): RawOriginal {
  const row = raw(c).find(row => row.key === '["era2005","Barcelona","Lionel Messi","RW",1988,0]');
  expect(row, 'CM_DISCOVERY_SOURCE_FOUNDATION').toBeDefined();
  expect(Eras.projectedWorldFor('era2005', CM.yearsOn(c), c.worldSeed).Barcelona
    .some(player => player.n === row!.player.n && player.g !== true)).toBe(false);
  return row!;
}

function player(c: CareerState, row: RawOriginal): CMPlayer {
  const p = { ...c.squad[0], id: 'test-held-original', name: row.player.n, position: row.player.p,
    age: row.player.a, rating: row.player.r, value: row.player.v, worldRosterKey: row.key,
    worldRosterSince: 0, generated: false, isYouth: false, academyGrad: false };
  delete p.onLoan;
  return p;
}

function recorded(c: CareerState, row: RawOriginal, status: 'owned' | 'released' | 'retired'): CareerState {
  const ledger: WorldRosterState = { version: 1, eraId: 'era2005', records: [{
    key: row.key, origin: { club: row.origin.club, name: row.origin.name, position: row.origin.position,
      birthYear: row.origin.birthYear, since: 0 },
    owner: status === 'owned' ? 'Chelsea' : null, status, year: CM.worldYear(c), player: player(c, row),
  }] };
  const next = { ...c, worldRoster: ledger };
  const admitted = readWorldRoster(next);
  expect(admitted?.records.map(record => ({ key: record.key, status: record.status, owner: record.owner })),
    'CM_DISCOVERY_LEDGER_FOUNDATION').toEqual([{ key: row.key, status, owner: status === 'owned' ? 'Chelsea' : null }]);
  return next;
}

const noop = () => {};
function Screen({ c, market = [], talk = noop }: { c: CareerState; market?: MarketPlayer[]; talk?: (p: MarketPlayer) => void }) {
  return <TransferScreen career={c} market={market}
    onNegotiate={talk} onOffer={noop} onWalk={noop} onDismissNegotiation={noop}
    onClause={noop} onLoan={noop} onAcceptBid={noop} onRejectBid={noop}
    onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop} onBuyLoanee={noop}
    onEndLoanEarly={noop} onRecallLoanee={noop} />;
}

beforeAll(async () => { await Eras.ensureEraRosters('era2005'); }, 30000);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Club Manager projected original discovery', () => {
  it('finds a dropped original only as an untracked current-year projection', () => {
    const c = career(), rows = discoveries(c), source = original(c);
    const found = rows.filter(row => row.key === source.key);
    expect(found, 'CM_DISCOVERY_DROPPED_RECORD').toHaveLength(1);
    expect(found[0]).toEqual({ key: source.key, name: source.player.n, position: 'RW',
      projectedAge: source.player.a, projectionYear: 2008, careerStatus: 'untracked' });
    for (const field of ['club', 'price', 'owner', 'available', 'active', 'freeAgent']) expect(found[0]).not.toHaveProperty(field);
    expect(new Set(rows.map(row => row.key)).size).toBe(rows.length);
  }, 30000);

  it('does not duplicate any canonical modeled original', () => {
    const c = career(), rows = discoveries(c), year = CM.worldYear(c);
    const keys = new Set(Object.entries(Eras.projectedWorldFor(c.eraId!, CM.yearsOn(c), c.worldSeed))
      .flatMap(([club, players]) => players.filter(p => p.g !== true).map(p => p.worldRosterKey
        ?? JSON.stringify([c.eraId, club, p.n, p.p, year - p.a, p.since]))));
    expect(keys.size, 'CM_DISCOVERY_MODELED_FOUNDATION').toBeGreaterThan(0);
    expect(rows.some(row => keys.has(row.key)), 'CM_DISCOVERY_NO_MODELED_DUPLICATE').toBe(false);
  }, 30000);

  it('lets every verified owned released and retired record suppress the raw fallback', () => {
    const c = career(), source = original(c);
    expect(discoveries(c).some(row => row.key === source.key)).toBe(true);
    for (const status of ['owned', 'released', 'retired'] as const) {
      const next = recorded(c, source, status), before = JSON.stringify(next);
      expect(discoveries(next).some(row => row.key === source.key),
        'CM_DISCOVERY_LEDGER_PRECEDENCE ' + status).toBe(false);
      expect(JSON.stringify(next) === before, 'CM_DISCOVERY_LEDGER_READ_ONLY').toBe(true);
      const legacy = structuredClone(next), entry = legacy.worldRoster!.records[0];
      entry.origin.since = null;
      entry.key = JSON.stringify(['era2005', source.origin.club, source.origin.name,
        source.origin.position, source.origin.birthYear, null]);
      entry.player.worldRosterKey = entry.key;
      expect(readWorldRoster(legacy)?.records.map(record => ({ key: record.key, status: record.status, owner: record.owner })),
        'CM_DISCOVERY_LEGACY_LEDGER_FOUNDATION').toEqual([{ key: entry.key, status, owner: status === 'owned' ? 'Chelsea' : null }]);
      expect(discoveries(legacy).some(row => row.key === source.key),
        'CM_DISCOVERY_LEGACY_LEDGER').toBe(false);
    }
    for (const status of ['released', 'retired'] as const) {
      const old = recorded(c, source, status), entry = old.worldRoster!.records[0];
      entry.year -= 1; entry.player.age -= 1;
      expect(entry.year < CM.worldYear(old), 'CM_DISCOVERY_OLD_TERMINAL_FOUNDATION').toBe(true);
      expect(readWorldRoster(old)?.records.map(record => ({ key: record.key, status: record.status, owner: record.owner })),
        'CM_DISCOVERY_OLD_TERMINAL_READ').toEqual([{ key: source.key, status, owner: null }]);
      const saved = JSON.stringify(old);
      expect(discoveries(old).some(row => row.key === source.key), 'CM_DISCOVERY_OLD_TERMINAL').toBe(false);
      expect(JSON.stringify(old) === saved, 'CM_DISCOVERY_OLD_TERMINAL_READ_ONLY').toBe(true);
    }
  }, 30000);

  it('keeps own squad loans free agents and durable name restrictions authoritative', () => {
    const c = career(), source = original(c), held = player(c, source);
    // Selector fixtures isolate membership fields, not executed loan or free-agent histories.
    const own = { ...c, squad: [...c.squad, held] };
    const loan = { ...c, loanedOut: [{ player: held } as NonNullable<CareerState['loanedOut']>[number]] };
    const pool = { ...c, freeAgents: [{ name: held.name } as NonNullable<CareerState['freeAgents']>[number]] };
    for (const next of [own, loan, pool, { ...c, retiredNames: [held.name] },
      { ...c, releasedNames: [held.name] }, { ...c, goneNames: [held.name] }]) {
      expect(discoveries(next).some(row => row.key === source.key), 'CM_DISCOVERY_SAVED_BLOCK').toBe(false);
    }
  }, 30000);

  it('refuses an unreadable present ledger and keeps absent-history status untracked', () => {
    const c = career(), source = original(c);
    const invalid = { ...c, worldRoster: { ...c.worldRoster!, version: 2 } } as unknown as CareerState;
    expect(discoveries(invalid), 'CM_DISCOVERY_INVALID_LEDGER').toEqual([]);
    const legacy = { ...c }; delete legacy.worldRoster;
    expect(discoveries(legacy).find(row => row.key === source.key)?.careerStatus,
      'CM_DISCOVERY_UNKNOWN_NOT_ACTIVE').toBe('untracked');
  }, 30000);

  it('preserves the full career world market and global draw stream across reads and reload', () => {
    const c = career();
    const state = JSON.stringify(c);
    const world = JSON.stringify(Eras.projectedWorldFor(c.eraId!, CM.yearsOn(c), c.worldSeed));
    const market = JSON.stringify(CM.marketForScreen(c));
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Discovery consumed the global draw stream'); });
    const first = discoveries(c), second = discoveries(JSON.parse(state) as CareerState);
    expect(first, 'CM_DISCOVERY_RELOAD_IDENTITIES').toEqual(second);
    expect(JSON.stringify(c) === state, 'CM_DISCOVERY_SAVE_HELD').toBe(true);
    expect(JSON.stringify(Eras.projectedWorldFor(c.eraId!, CM.yearsOn(c), c.worldSeed)) === world,
      'CM_DISCOVERY_WORLD_HELD').toBe(true);
    expect(JSON.stringify(CM.marketForScreen(c)) === market, 'CM_DISCOVERY_MARKET_HELD').toBe(true);
    expect(rng).not.toHaveBeenCalled();
  }, 30000);

  it('shows projected name matches with no seller money or transaction controls', () => {
    const c = career(), source = original(c), talk = vi.fn();
    const view = render(<Screen c={c} talk={talk} />);
    const input = view.getByRole('textbox', { name: 'Search player or club' });
    fireEvent.change(input, { target: { value: source.player.n } });
    const region = view.queryByRole('region', { name: 'Projected player records' });
    expect(region, 'CM_DISCOVERY_VISIBLE_RECORDS').not.toBeNull();
    expect(within(region!).getByText(source.player.n)).toBeDefined();
    expect(region!.textContent).toContain('2008');
    expect(region!.textContent, 'CM_DISCOVERY_UNTRACKED_COPY').toContain('Career status is untracked');
    expect(region!.textContent).toContain('current club and contract are not tracked');
    expect(region!.textContent).not.toContain(source.origin.club);
    expect(within(region!).queryAllByRole('button'), 'CM_DISCOVERY_NO_TRANSACTION').toHaveLength(0);
    expect(region!.textContent).not.toMatch(/Talk|Loan|free agent|available|active player|£|€/i);
    expect(talk).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'no matching projected record' } });
    expect(view.queryByRole('region', { name: 'Projected player records' })).toBeNull();
  }, 30000);

  it('keeps one usable name query when the transfer window is closed', () => {
    const c = { ...career(), transferWindow: null }, source = original(c);
    const view = render(<Screen c={c} />);
    const inputs = view.queryAllByRole('textbox', { name: 'Search player or club' });
    expect(inputs, 'CM_DISCOVERY_CLOSED_QUERY').toHaveLength(1);
    fireEvent.change(inputs[0], { target: { value: source.player.n } });
    const region = view.queryByRole('region', { name: 'Projected player records' });
    expect(region, 'CM_DISCOVERY_CLOSED_RESULT').not.toBeNull();
    expect(within(region!).getByText(source.player.n)).toBeDefined();
    expect(within(region!).queryAllByRole('button')).toHaveLength(0);
  }, 30000);

  it('keeps the existing market Talk handler and exact market payload unchanged', () => {
    const c = career(), market = CM.buildMarket(c).slice(0, 1), talk = vi.fn();
    expect(market, 'CM_DISCOVERY_MARKET_ACTION_FOUNDATION').toHaveLength(1);
    const view = render(<Screen c={c} market={market} talk={talk} />);
    fireEvent.change(view.getByRole('textbox', { name: 'Search player or club' }), { target: { value: market[0].name } });
    fireEvent.click(view.getByRole('button', { name: /^Talk/ }));
    expect(talk.mock.calls, 'CM_DISCOVERY_MARKET_ACTION_HELD').toEqual([[market[0]]]);
  }, 30000);
});

