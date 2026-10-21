import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CareerState } from '@/lib/clubManager';

const E = (process.env.CM_OWN_CORE ? await import(/* @vite-ignore */ process.env.CM_OWN_CORE)
  : await import('@/lib/clubManager')) as typeof import('@/lib/clubManager');
const UI = (process.env.CM_OWN_COMPONENT ? await import(/* @vite-ignore */ process.env.CM_OWN_COMPONENT)
  : await import('@/components/club-manager/ClubDetailScreen')) as typeof import('@/components/club-manager/ClubDetailScreen');
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
function roll<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-14T00:00:00Z'));
  try { return action(); } finally { random.mockRestore(); clock.mockRestore(); }
}
function initial(era = 'now'): CareerState {
  return roll(() => E.startCareer('Barcelona', era));
}
function legacy(state: CareerState): CareerState {
  const saved = copy(state); delete saved.worldSeed; delete saved.worldRoster; return saved;
}
function saved(state: CareerState): CareerState {
  localStorage.setItem(E.SAVE_KEY, JSON.stringify(state));
  const result = roll(() => E.loadCareer()); expect(result, 'actual complete save loader must accept the fixture').not.toBeNull(); return result!;
}
function changed(seed: boolean): { state: CareerState; gone: string; added: string } {
  const base = initial(), input = seed ? base : legacy(base);
  // These budgets prepare a legal deal; the actual catalog supplies every player and value.
  const ready = { ...input, budget: 9999, wageCap: 9999, transferWindow: 'summer' as const };
  const leaving = ready.squad.find(p => p.position !== 'GK' && !p.isYouth && E.releaseBlock(ready, p) === null);
  expect(leaving, 'actual release must have an eligible source player').toBeDefined();
  const released = roll(() => E.releasePlayer(ready, leaving!.id)); expect(released).not.toBeNull();
  const offer = E.buildMarket(released!).find(p => p.position !== 'GK' && p.age < 27 && p.rating < 80 && p.club !== released!.clubName);
  expect(offer, 'actual catalog must supply the signing').toBeDefined();
  const bought = roll(() => E.buyPlayer(released!, offer!)); expect(bought).not.toBeNull();
  expect(bought!.squad.some(p => p.name === leaving!.name)).toBe(false);
  expect(bought!.squad.some(p => p.name === offer!.name)).toBe(true);
  return { state: saved(bought!), gone: leaving!.name, added: offer!.name };
}
function inspect(state: CareerState, club = state.clubName) {
  const held = JSON.stringify(state), random = vi.spyOn(Math, 'random');
  const view = render(<UI.ClubDetailScreen clubName={club} career={state} onBack={() => {}} />);
  const blocks = [...view.container.querySelectorAll('.bg-card')], squad = blocks[1];
  expect(squad, 'the actual roster card must render').toBeDefined();
  const rows = [...squad.querySelectorAll('div.py-1\\.5')];
  const names = rows.map(row => row.querySelector('span.text-xs')?.textContent ?? '');
  const text = view.container.textContent ?? '', html = view.container.innerHTML;
  expect(JSON.stringify(state), 'display must hold the whole saved input').toBe(held);
  expect(random).not.toHaveBeenCalled(); random.mockRestore();
  return { text, html, names };
}
function own(state: CareerState, name: string, missing = false): void {
  const observed = inspect(state), names = state.squad.map(p => p.name);
  const top = [...state.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  const average = top.length ? String(Math.round(top.reduce((sum, p) => sum + p.rating, 0) / top.length)) : '-';
  const value = E.moneyIn(state)(Math.round(state.squad.reduce((sum, p) => sum + (p.value ?? 0), 0)));
  const correct = JSON.stringify(observed.names) === JSON.stringify(names)
    && observed.text.includes(`Squad (${names.length} on the books)`)
    && observed.text.includes(`${average}Best XI`) && observed.text.includes(`${value}Squad value`);
  console.log('CM_OWN_UI_RECEIPT:' + JSON.stringify({ name, state, observed, expected: { names, average, value }, correct }));
  if (missing) expect(correct, 'legacy own-club display lost the actual saved roster').toBe(true);
  expect(observed.names).toEqual(names); expect(observed.text).toContain(`Squad (${names.length} on the books)`);
  expect(observed.text).toContain(`${average}Best XI`); expect(observed.text).toContain(`${value}Squad value`);
}
describe('Club details use the current owned squad', () => {
  it('current roster missing: legacy saved release and signing show current names value and XI', () => {
    const result = changed(false); expect(result.state.worldSeed).toBeUndefined(); expect(result.state.worldRoster).toBeUndefined();
    own(result.state, 'legacy-deal', true);
  });
  it('current roster missing: legacy historical save shows its actual owned squad', async () => {
    await E.ensureEraRosters('era2015'); own(saved(legacy(initial('era2015'))), 'legacy-historical', true);
  });
  it('current roster missing: an empty legacy squad never falls back to startup players', () => {
    // A complete initialized state explicitly presents an empty squad; no natural empty-career claim.
    const state = { ...legacy(initial()), squad: [], xiIds: [] } as CareerState;
    own(state, 'legacy-empty', true);
  });
  it('current roster preservation: seeded save without a ledger shows its owned squad', () => {
    /* Round 1344: a new career now carries its opening window's deals between other clubs in a ledger, and a seeded
       save written without one has this season's moves mended into one when it opens (repairAiMoves, which mends only
       names on goneNames). So the save this case opens has no ledger and no gone names: seeded, nothing to mend. */
    const fresh = initial(); delete fresh.worldRoster; fresh.goneNames = [];
    const state = saved(fresh); expect(state.worldSeed).toBeDefined(); expect(state.worldRoster).toBeUndefined(); own(state, 'seeded');
  });
  it('current roster preservation: seeded actual deals show the owned roster', () => {
    const result = changed(true); expect(result.state.worldSeed).toBeDefined(); expect(result.state.worldRoster).toBeDefined(); own(result.state, 'seeded-deal');
  });
  it('current roster preservation: a valid ledger without a seed still shows the owned squad', () => {
    const result = changed(true), state = copy(result.state); delete state.worldSeed;
    expect(state.worldRoster).toBeDefined(); own(state, 'ledger-without-seed');
  });
  it('current roster preservation: a founded club keeps its own generated squad and sale values', () => {
    const state = roll(() => E.startCareer('Harbour Fixture Club', undefined, {
      name: 'Harbour Fixture Club', stadium: 'Harbour Park', budgetTier: 'mid', leagueId: 'premier', replacedClub: '',
      crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'HFC' }, quality: 80,
    }));
    own(state, 'founded'); expect(inspect(state).text).toContain('The club you founded');
  });
  it('current roster preservation: rival details keep the saved world roster', () => {
    const state = changed(true).state, roster = [...E.oppRosterFor(state, 'Real Madrid')].sort((a, b) => b.v - a.v);
    const observed = inspect(state, 'Real Madrid'); expect(observed.names).toEqual(roster.map(p => p.n));
    expect(observed.text).toContain(`Squad (${roster.length} on the books)`);
    const value = E.moneyIn(state)(Math.round(roster.reduce((sum, p) => sum + p.v, 0)));
    expect(observed.text).toContain(`${value}Squad value`);
    console.log('CM_OWN_UI_RECEIPT:' + JSON.stringify({ name: 'rival', state, observed, expected: { names: roster.map(p => p.n), value } }));
  });
});
