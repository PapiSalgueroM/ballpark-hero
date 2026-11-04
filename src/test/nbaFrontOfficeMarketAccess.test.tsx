import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague, nbaSign, type NbaGmPlayer, type NbaLeague } from '@/lib/nbaFrontOffice';
import { nbaContractsOf, nbaNoteArrivals, openNbaDesk } from '@/lib/nbaGmDesk';
import type { GmDesk } from '@/lib/gmDesk';

// Capture the entity token's import draws separately from every player action.
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
const KEY = 'nba-front-office-save-v1';
const OTHER = 'nba-front-office-market-access-unrelated';
const TEAM = 'DEN';
const HEAD = 'nba-market-access-fa-1';
const TAIL = 'nba-market-access-fa-31';
const LAST = 'nba-market-access-fa-33';
const orderedIds = Array.from({ length: 33 }, (_, i) => 'nba-market-access-fa-' + (i + 1));
const preferredRotation = [8, 7, 6, 5, 4, 3, 2, 1].map(i => 'nba-market-access-roster-' + i);
let draws: number[] = [];
let writes: string[] = [];

interface Frame {
  league: NbaLeague;
  myTeam: string;
  phase: 'hub';
  titles: number;
  seasonsPlayed: number;
  draftClass: null;
  picksLeft: number;
  mandate: { tier: 'rebuild'; text: string; winFloor: number; reqLevel: number; season: number };
  trust: number;
  fired: boolean;
  pressTilt: 0;
  seasonTradeLine: null;
  postseason: null;
  gm?: GmDesk;
}
function seeded(initial: number) {
  let value = initial;
  return () => { value = (value * 16807) % 2147483647; return (value - 1) / 2147483646; };
}
function player(index: number, freeAgent: boolean): NbaGmPlayer {
  const positions: NbaGmPlayer['pos'][] = ['G', 'F', 'C'];
  return { id: 'nba-market-access-' + (freeAgent ? 'fa-' : 'roster-') + index,
    name: 'NBA market access fixture ' + (freeAgent ? 'free agent ' : 'roster ') + index,
    pos: positions[(index - 1) % positions.length], age: 24, ovr: freeAgent ? 99 - index : 70,
    salary: freeAgent ? 3 : 2, years: 2, out: 0, pot: 99 };
}
function fixture(kind: 'plain' | 'cap' | 'full' | 'released' = 'plain', desk = false, rotation = true,
  basis?: 'box-score-proxy' | 'prior-only' | 'unmeasured-prior') {
  const league = initNbaLeague(seeded(73));
  const team = league.teams[TEAM];
  team.players = Array.from({ length: kind === 'full' ? 15 : 14 }, (_, i) => player(i + 1, false));
  if (rotation) team.rotation = [...preferredRotation]; else delete team.rotation;
  league.freeAgents = Array.from({ length: 33 }, (_, i) => player(i + 1, true)).reverse();
  const head = league.freeAgents.find(p => p.id === HEAD)!;
  const last = league.freeAgents.find(p => p.id === LAST)!;
  if (basis) last.openingRatingEvidence = {
    modelVersion: 'nba894-review-v0.4', originKey: 'fictional:' + LAST,
    openingOvr: 79, basis, partial: true,
  };
  if (kind === 'cap') head.salary = league.cap;
  if (kind === 'released') team.releasedThisSeason = [HEAD];
  const source: Frame = { league, myTeam: TEAM, phase: 'hub', titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0,
    mandate: { tier: 'rebuild', text: 'Fictional NBA market access mandate.', winFloor: 0, reqLevel: 0, season: league.season },
    trust: 70, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null,
    ...(desk ? { gm: openNbaDesk(league, TEAM) } : {}) };
  const raw = JSON.stringify(source), frame = JSON.parse(raw) as Frame, before = structuredClone(frame);
  localStorage.setItem(KEY, raw); localStorage.setItem(OTHER, 'held');
  draws.length = 0; writes.length = 0;
  return { frame, before, raw };
}
function openMarket() {
  render(<NbaFrontOfficeBoard />);
  fireEvent.click(screen.getByText('Free agency'));
}
const faRow = (id: string) => document.querySelector<HTMLElement>('[data-fa-row="' + id + '"]');
function observe(name: string, value: unknown) {
  if (!process.env.NBA_FO_MARKET_ACCESS_RAW) return;
  mkdirSync(process.env.NBA_FO_MARKET_ACCESS_RAW, { recursive: true });
  writeFileSync(join(process.env.NBA_FO_MARKET_ACCESS_RAW, name + '.json'), JSON.stringify({
    case: name,
    fixture: 'Fictional complete players in a real constructor-created NBA league. Actual board save reader, signing, rotation and arrival ledger. Not a naturally reached career.',
    moduleDraws, observations: value,
  }, null, 2) + '\n');
}
function signJourney(id: string, desk: boolean, rotation: boolean) {
  const f = fixture('plain', desk, rotation), reference = structuredClone(f.frame), referenceAt = draws.length;
  const accepted = nbaSign(reference.league.teams[TEAM], reference.league.freeAgents, id, reference.league.cap);
  if (accepted && reference.gm) reference.gm = nbaNoteArrivals(reference.gm, reference.league, TEAM, [id], 'signing');
  const referenceDraws = draws.slice(referenceAt), referenceBytes = JSON.stringify(reference);
  const openAt = draws.length; openMarket();
  const opening = { bytes: localStorage.getItem(KEY), writes: [...writes], draws: draws.slice(openAt) };
  const row = faRow(id), button = row?.querySelector<HTMLButtonElement>('button') ?? null;
  const enabled = !!button && !button.disabled, signAt = draws.length;
  if (enabled) fireEvent.click(button!);
  const bytes = localStorage.getItem(KEY)!;
  const actual = { rowPresent: !!row, buttonEnabled: enabled, bytes,
    frame: JSON.parse(bytes) as Frame, writes: [...writes], draws: draws.slice(signAt) };
  cleanup();
  const reloadAt = draws.length, writesAt = writes.length; openMarket();
  const reloaded = { bytes: localStorage.getItem(KEY), frame: JSON.parse(localStorage.getItem(KEY)!) as Frame,
    writes: writes.slice(writesAt), draws: draws.slice(reloadAt) };
  cleanup();
  return { desk, rotation, initial: f.frame, initialBytes: f.raw,
    reference: { accepted, frame: reference, bytes: referenceBytes, draws: referenceDraws },
    opening, actual, reloaded, inputHeld: isDeepStrictEqual(f.frame, f.before), unrelated: localStorage.getItem(OTHER) };
}
function assertSigned(value: ReturnType<typeof signJourney>, id: string) {
  expect(value.reference.accepted).toBe(true); expect(value.reference.draws).toEqual([]);
  expect(value.reference.frame.league.teams[TEAM].players).toHaveLength(15);
  expect(value.reference.frame.league.freeAgents).toHaveLength(32);
  expect(value.actual.frame).toStrictEqual(value.reference.frame); expect(value.actual.bytes).toBe(value.reference.bytes);
  expect(value.actual.writes).toEqual([value.actual.bytes]); expect(value.actual.draws).toEqual([]);
  expect(value.opening).toEqual({ bytes: value.initialBytes, writes: [], draws: [] });
  expect(value.reloaded).toEqual({ bytes: value.actual.bytes, frame: value.actual.frame, writes: [], draws: [] });
  const signed = value.actual.frame.league.teams[TEAM].players.filter(p => p.id === id);
  expect(signed).toHaveLength(1); expect(signed[0]).toStrictEqual(value.initial.league.freeAgents.find(p => p.id === id));
  expect(signed[0]).toMatchObject({ salary: 3, years: 2, age: 24, out: 0, pot: 99 });
  expect(value.actual.frame.league.freeAgents.some(p => p.id === id)).toBe(false);
  if (value.rotation) expect(value.actual.frame.league.teams[TEAM].rotation).toEqual(preferredRotation);
  else expect(Object.prototype.hasOwnProperty.call(value.actual.frame.league.teams[TEAM], 'rotation')).toBe(false);
  if (value.desk) {
    const ledger = nbaContractsOf(value.actual.frame.gm!, value.actual.frame.league, TEAM);
    expect(ledger.men[id]).toStrictEqual({ since: 2026, how: 'signing', mid: true });
    expect(value.initial.gm && nbaContractsOf(value.initial.gm, value.initial.league, TEAM).men[id]).toBeUndefined();
    expect(value.actual.frame.gm!.blocks.picks).toStrictEqual(value.initial.gm!.blocks.picks);
    expect(value.actual.frame.gm!.blocks.staff).toStrictEqual(value.initial.gm!.blocks.staff);
  } else expect(Object.prototype.hasOwnProperty.call(value.actual.frame, 'gm')).toBe(false);
  expect(Object.fromEntries(Object.entries(value.actual.frame.league.teams).filter(([id]) => id !== TEAM)))
    .toStrictEqual(Object.fromEntries(Object.entries(value.initial.league.teams).filter(([id]) => id !== TEAM)));
  expect(value.inputHeld).toBe(true); expect(value.unrelated).toBe('held');
}

beforeEach(() => {
  localStorage.clear(); draws = []; writes = [];
  const random = seeded(103);
  vi.spyOn(Math, 'random').mockImplementation(() => { const value = random(); draws.push(value); return value; });
  const originalSet = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage && key === KEY) writes.push(String(value));
    originalSet.call(this, key, value);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NBA Front Office complete free agent market', () => {
  it('shows every saved free agent beyond twenty and thirty with the actual tail rating evidence', () => {
    const rows = [];
    for (const basis of ['box-score-proxy', 'prior-only', 'unmeasured-prior'] as const) {
      const f = fixture('plain', false, true, basis); openMarket();
      const last = faRow(LAST);
      rows.push({ basis, initial: f.frame, initialBytes: f.raw,
        ids: [...document.querySelectorAll('[data-fa-row]')].map(n => n.getAttribute('data-fa-row')),
        evidenceIds: [...document.querySelectorAll('[data-fa-row]')].filter(n => n.querySelector('[data-rating-evidence]')).map(n => n.getAttribute('data-fa-row')),
        markerIds: [...document.querySelectorAll('[data-fa-row]')].filter(n => n.querySelector('[data-rating-partial]')).map(n => n.getAttribute('data-fa-row')),
        tailNote: last?.querySelector('[data-rating-evidence]')?.textContent ?? null,
        tailText: last?.textContent ?? null, afterBytes: localStorage.getItem(KEY),
        writes: [...writes], draws: [...draws], inputHeld: isDeepStrictEqual(f.frame, f.before), unrelated: localStorage.getItem(OTHER) });
      cleanup();
    }
    observe('complete-pool', { rows });
    expect(rows.map(row => [row.ids, row.evidenceIds, row.markerIds]), 'NBA_FO_MARKET_COMPLETE_POOL')
      .toEqual(rows.map(() => [orderedIds, [LAST], [LAST]]));
    const descriptions = ['retained-season box scores', 'prior season only, reduced confidence', 'unmeasured game prior'];
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].tailNote).toContain('Opening estimate 79: ' + descriptions[i]);
      expect(rows[i].tailText).toContain('66');
      expect(rows[i].afterBytes).toBe(rows[i].initialBytes); expect(rows[i].writes).toEqual([]); expect(rows[i].draws).toEqual([]);
      expect(rows[i].inputHeld).toBe(true); expect(rows[i].unrelated).toBe('held');
    }
  });

  it('signs a player beyond thirty through the real model with rotation and arrival metadata then reloads the full save', () => {
    const rows = [signJourney(TAIL, false, true), signJourney(TAIL, true, true)];
    observe('tail-sign', { rows });
    expect(rows.map(row => [row.actual.rowPresent, row.actual.buttonEnabled,
      row.actual.frame.league.teams[TEAM].players.some(p => p.id === TAIL)]), 'NBA_FO_MARKET_TAIL_SIGN')
      .toEqual([[true, true, true], [true, true, true]]);
    for (const row of rows) assertSigned(row, TAIL);
  });

  it('preserves original head signing automatic saves and cap full roster and same season waiver refusals', () => {
    const head = [signJourney(HEAD, false, false), signJourney(HEAD, true, true)], refusals = [];
    for (const kind of ['cap', 'full', 'released'] as const) {
      const f = fixture(kind), reference = structuredClone(f.frame), referenceAt = draws.length;
      const accepted = nbaSign(reference.league.teams[TEAM], reference.league.freeAgents, HEAD, reference.league.cap);
      const referenceDraws = draws.slice(referenceAt); openMarket();
      const row = faRow(HEAD), button = row?.querySelector<HTMLButtonElement>('button') ?? null, disabled = button?.disabled ?? null;
      if (button) fireEvent.click(button);
      refusals.push({ kind, initial: f.frame, initialBytes: f.raw, reference: { accepted, frame: reference, draws: referenceDraws },
        rowPresent: !!row, disabled, title: button?.title ?? null,
        fullReason: document.querySelector('[data-sign-block]')?.textContent ?? null,
        afterBytes: localStorage.getItem(KEY), writes: [...writes], draws: [...draws],
        inputHeld: isDeepStrictEqual(f.frame, f.before), unrelated: localStorage.getItem(OTHER) });
      cleanup();
    }
    observe('legacy-guards', { head, refusals });
    for (const row of head) assertSigned(row, HEAD);
    expect(refusals.map(row => [row.kind, row.rowPresent, row.disabled, row.reference.accepted]))
      .toEqual([['cap', true, true, false], ['full', true, true, false], ['released', true, true, false]]);
    for (const row of refusals) {
      expect(row.reference.frame).toStrictEqual(row.initial); expect(row.reference.draws).toEqual([]);
      expect(row.afterBytes).toBe(row.initialBytes); expect(row.writes).toEqual([]); expect(row.draws).toEqual([]);
      expect(row.inputHeld).toBe(true); expect(row.unrelated).toBe('held');
    }
    expect(refusals.find(row => row.kind === 'full')?.fullReason).toContain('Roster full at 15');
    expect(refusals.find(row => row.kind === 'released')?.title).toContain('You waived him this season');
  });
});
