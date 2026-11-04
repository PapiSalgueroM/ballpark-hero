import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { initLeague, signPlayer, REGULAR_WEEKS, type GmPlayer } from '@/lib/frontOffice';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';

// Constructor IDs include a module token. Hold its import draws separately from every action tape.
const moduleRandom = vi.hoisted(() => {
  let seed = 314159;
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 16807) % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value); return value;
  });
  return { draws, restore: () => spy.mockRestore() };
});

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const moduleDraws = [...moduleRandom.draws];
moduleRandom.restore();

const KEY = 'front-office-save-v1';
const OTHER = 'front-office-market-access-unrelated';
const HEAD = 'market-access-fa-1';
const TAIL = 'market-access-fa-29';
const LAST = 'market-access-fa-33';
const orderedIds = Array.from({ length: 33 }, (_, i) => 'market-access-fa-' + (i + 1));
let draws: number[] = [];
let writes: string[] = [];

function seeded(initial: number) {
  let value = initial;
  return () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; };
}
function player(index: number, freeAgent: boolean): GmPlayer {
  const positions: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
  return { id: 'market-access-' + (freeAgent ? 'fa-' : 'roster-') + index,
    name: 'Market access fixture ' + (freeAgent ? 'free agent ' : 'roster ') + index,
    pos: positions[(index - 1) % positions.length], age: 24, ovr: freeAgent ? 99 - index : 70,
    salary: freeAgent ? 1 : 2, years: 2, out: 0, pot: 99 };
}
function fixture(kind: 'plain' | 'opening' | 'legacy' | 'cap' | 'full' | 'released' = 'plain') {
  const league = initLeague(seeded(73));
  league.teams.KC.players = Array.from({ length: kind === 'full' ? 53 : 7 }, (_, i) => player(i + 1, false));
  league.freeAgents = Array.from({ length: 33 }, (_, i) => player(i + 1, true)).reverse();
  const head = league.freeAgents.find(p => p.id === HEAD)!;
  const last = league.freeAgents.find(p => p.id === LAST)!;
  if (kind === 'opening') last.openingRatingEvidence = {
    modelVersion: 'fictional-market-access', originKey: LAST, openingOvr: last.ovr,
    basis: 'unmeasured-prior', partial: true,
  };
  if (kind === 'legacy') last.noSeason = true;
  if (kind === 'cap') head.salary = league.cap;
  if (kind === 'full') { league.teams.KC.rosterDepth = 2; league.teams.KC.practice = []; }
  if (kind === 'released') league.teams.KC.releasedThisSeason = [HEAD];
  const source = { league, myTeam: 'KC', phase: 'hub' as const, titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0,
    mandate: { tier: 'rebuild' as const, text: 'Fictional market access mandate.', winFloor: 0, reqLevel: 0, season: league.season },
    trust: 70, fired: false, pressTilt: 0 as const, seasonTradeLine: null, postseason: null };
  const raw = JSON.stringify(source);
  const frame: typeof source = JSON.parse(raw);
  const before = structuredClone(frame);
  localStorage.setItem(KEY, raw); localStorage.setItem(OTHER, 'held');
  writes.length = 0; draws.length = 0;
  return { frame, before, raw };
}
type Fixture = ReturnType<typeof fixture>;
function openMarket() {
  render(<FrontOfficeBoard />);
  fireEvent.click(screen.getByText('Free agency'));
}
function faRow(id: string) {
  return document.querySelector<HTMLElement>('[data-fa-row="' + id + '"]');
}
function observe(name: string, value: unknown) {
  if (!process.env.FO_MARKET_ACCESS_RAW) return;
  mkdirSync(process.env.FO_MARKET_ACCESS_RAW, { recursive: true });
  writeFileSync(join(process.env.FO_MARKET_ACCESS_RAW, name + '.json'), JSON.stringify({
    case: name,
    fixture: 'Fictional players in a real constructor-created saved league. Real board, signing engine and save reader. Not a naturally reached career.',
    moduleDraws, observations: value,
  }, null, 2) + '\n');
}
function preserved(f: Fixture) {
  return { inputHeld: isDeepStrictEqual(f.frame, f.before), unrelated: localStorage.getItem(OTHER) };
}
function signJourney(id: string) {
  const f = fixture();
  const reference = structuredClone(f.frame), referenceAt = draws.length;
  const accepted = signPlayer(reference.league.teams.KC, reference.league.freeAgents, id, reference.league.cap);
  const referenceDraws = draws.slice(referenceAt), referenceBytes = JSON.stringify(reference);
  const openAt = draws.length; openMarket();
  const opening = { bytes: localStorage.getItem(KEY), writes: [...writes], draws: draws.slice(openAt) };
  const row = faRow(id), sign = row?.querySelector<HTMLButtonElement>('button') ?? null;
  const signAt = draws.length;
  if (sign && !sign.disabled) fireEvent.click(sign);
  const bytes = localStorage.getItem(KEY)!;
  const actual = { rowPresent: !!row, buttonEnabled: !!sign && !sign.disabled,
    bytes, frame: JSON.parse(bytes) as typeof f.frame, writes: [...writes], draws: draws.slice(signAt) };
  cleanup();
  const reloadAt = draws.length, writesAt = writes.length; openMarket();
  const reloaded = { bytes: localStorage.getItem(KEY), frame: JSON.parse(localStorage.getItem(KEY)!) as typeof f.frame,
    writes: writes.slice(writesAt), draws: draws.slice(reloadAt) };
  cleanup();
  return { f, observation: { initial: f.frame, initialBytes: f.raw, validInput: isFrontOfficeSave(f.frame, 'NFL', REGULAR_WEEKS),
    reference: { accepted, frame: reference, bytes: referenceBytes, draws: referenceDraws },
    opening, actual, reloaded, ...preserved(f) } };
}
function assertSigned(value: ReturnType<typeof signJourney>['observation'], id: string) {
  expect(value.validInput).toBe(true);
  expect(value.reference.accepted).toBe(true);
  expect(value.reference.draws).toEqual([]);
  expect(value.reference.frame.league.teams.KC.players).toHaveLength(8);
  expect(value.reference.frame.league.freeAgents).toHaveLength(32);
  expect(value.reference.frame.league.teams.KC.players.filter(p => p.id === id)).toHaveLength(1);
  expect(value.reference.frame.league.freeAgents.some(p => p.id === id)).toBe(false);
  expect(value.actual.frame).toStrictEqual(value.reference.frame);
  expect(value.actual.bytes).toBe(value.reference.bytes);
  expect(value.actual.writes).toEqual([value.actual.bytes]);
  expect(value.opening).toEqual({ bytes: value.initialBytes, writes: [], draws: [] });
  expect(value.actual.draws).toEqual([]);
  expect(value.reloaded).toEqual({ bytes: value.actual.bytes, frame: value.actual.frame, writes: [], draws: [] });
  expect(value.inputHeld).toBe(true);
  expect(value.unrelated).toBe('held');
}

beforeEach(() => {
  localStorage.clear(); writes = []; draws = [];
  const random = seeded(103);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = random(); draws.push(value); return value; });
  const originalSet = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage && key === KEY) writes.push(String(value));
    originalSet.call(this, key, value);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL Front Office complete free agent market', () => {
  it('shows the complete sorted saved pool and explains opening or legacy ratings beyond the first 24', () => {
    const observations = [];
    for (const kind of ['opening', 'legacy'] as const) {
      const f = fixture(kind); openMarket();
      const row = faRow(LAST);
      observations.push({ kind, initial: f.frame, initialBytes: f.raw,
        validInput: isFrontOfficeSave(f.frame, 'NFL', REGULAR_WEEKS),
        ids: [...document.querySelectorAll('[data-fa-row]')].map(n => n.getAttribute('data-fa-row')),
        openingMark: !!row?.querySelector('[data-rating-partial]'),
        legacyMark: !!row?.querySelector('[data-draft-rated]'),
        openingLegend: !!document.querySelector('[data-rating-legend]'),
        legacyLegend: !!document.querySelector('[data-draft-legend]'),
        afterBytes: localStorage.getItem(KEY), writes: [...writes], draws: [...draws], ...preserved(f) });
      cleanup();
    }
    observe('complete-pool', { observations });
    expect(observations.map(row => ({ kind: row.kind, ids: row.ids,
      openingMark: row.openingMark, legacyMark: row.legacyMark,
      openingLegend: row.openingLegend, legacyLegend: row.legacyLegend })), 'FO_MARKET_COMPLETE_POOL').toEqual([
      { kind: 'opening', ids: orderedIds, openingMark: true, legacyMark: false, openingLegend: true, legacyLegend: false },
      { kind: 'legacy', ids: orderedIds, openingMark: false, legacyMark: true, openingLegend: false, legacyLegend: true },
    ]);
    for (const row of observations) {
      expect(row.validInput).toBe(true); expect(row.afterBytes).toBe(row.initialBytes);
      expect(row.writes).toEqual([]); expect(row.draws).toEqual([]);
      expect(row.inputHeld).toBe(true); expect(row.unrelated).toBe('held');
    }
  });

  it('signs a player beyond the first 24 through the unchanged model and reloads the complete saved result', () => {
    const { observation } = signJourney(TAIL);
    observe('tail-sign', observation);
    expect([observation.actual.rowPresent, observation.actual.buttonEnabled,
      observation.actual.frame.league.teams.KC.players.some(p => p.id === TAIL)], 'FO_MARKET_TAIL_SIGN').toEqual([true, true, true]);
    assertSigned(observation, TAIL);
    const signed = observation.actual.frame.league.teams.KC.players.find(p => p.id === TAIL)!;
    expect(signed).toStrictEqual(observation.initial.league.freeAgents.find(p => p.id === TAIL));
    expect(Object.fromEntries(Object.entries(observation.actual.frame.league.teams).filter(([id]) => id !== 'KC')))
      .toStrictEqual(Object.fromEntries(Object.entries(observation.initial.league.teams).filter(([id]) => id !== 'KC')));
  });

  it('preserves the existing head signing result and cap full roster and released player refusals', () => {
    const { observation: head } = signJourney(HEAD);
    const refusals = [];
    for (const kind of ['cap', 'full', 'released'] as const) {
      const f = fixture(kind), reference = structuredClone(f.frame), referenceAt = draws.length;
      const accepted = signPlayer(reference.league.teams.KC, reference.league.freeAgents, HEAD, reference.league.cap);
      const referenceDraws = draws.slice(referenceAt); openMarket();
      const row = faRow(HEAD), sign = row?.querySelector<HTMLButtonElement>('button') ?? null;
      const disabled = sign?.disabled ?? null;
      if (sign) fireEvent.click(sign);
      refusals.push({ kind, initial: f.frame, initialBytes: f.raw,
        reference: { accepted, frame: reference, draws: referenceDraws }, rowPresent: !!row, disabled,
        fullReason: document.querySelector('[data-market-full]')?.textContent ?? null,
        cutReason: sign?.title ?? null, afterBytes: localStorage.getItem(KEY),
        writes: [...writes], draws: [...draws], ...preserved(f) });
      cleanup();
    }
    observe('legacy-guards', { head, refusals });
    assertSigned(head, HEAD);
    expect(refusals.map(row => [row.kind, row.rowPresent, row.disabled, row.reference.accepted]))
      .toEqual([['cap', true, true, false], ['full', true, true, false], ['released', true, true, false]]);
    for (const row of refusals) {
      expect(row.reference.frame).toStrictEqual(row.initial); expect(row.reference.draws).toEqual([]);
      expect(row.afterBytes).toBe(row.initialBytes); expect(row.writes).toEqual([]); expect(row.draws).toEqual([]);
      expect(row.inputHeld).toBe(true); expect(row.unrelated).toBe('held');
    }
    expect(refusals.find(row => row.kind === 'full')?.fullReason).toContain('Roster full at 53');
    expect(refusals.find(row => row.kind === 'released')?.cutReason).toContain('You cut him this season');
  });
});
