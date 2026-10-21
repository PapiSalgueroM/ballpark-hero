/** Round 1375: predecessor desk cards do not belong to a new appointment.
 * The public handovers and their match engine are real. To keep both pending
 * categories deterministic, the test-only whistle wrapper calls the real desk
 * settle first, then prepares source-built spareFunds and appeal cards. It
 * changes only decisions. The appeal covers pending-card clearing, not a
 * claim about a naturally rolled red or a successful inherited appeal.
 * Paired runs hold every other state field and every global random draw.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { CareerState } from '@/lib/clubManager';
import type { DeskItem } from '@/lib/clubManagerDecisions';
/* Release BI join (Round BII): Round 1335 (merged first) opens a new job's board at BOARD_FRESH (69) on a modern
   career, where this file was written against the old flat 62. The appointment premise is the same. */
import { BOARD_FRESH } from '@/lib/clubManagerBoardVerdict';

const fixture = vi.hoisted(() => ({ install: false, whistles: 0, predecessor: null as unknown }));
vi.mock('@/lib/clubManagerDecisions', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/clubManagerDecisions')>();
  return {
    ...actual,
    settleDecisionDesk(state: CareerState, reds: string[], opponent: string) {
      actual.settleDecisionDesk(state, reds, opponent);
      fixture.whistles += 1;
      if (!fixture.install) return;
      const definition = actual.DECK.find(card => card.id === 'spareFunds')!;
      const situation = actual.buildSituation(state, definition);
      const target = state.squad.find(player => player.suspendedMatches > 0) ?? state.squad[0];
      // If no actual ban exists, only the copied card metadata is prepared.
      // No suspension, squad field, budget or football result is changed.
      const cardContext = target.suspendedMatches > 0 ? state : {
        ...state, squad: state.squad.map(player => player.id === target.id ? { ...player, suspendedMatches: 2 } : player),
      };
      const appeal = actual.appealCard(cardContext, target.id, opponent)!;
      state.decisions = [situation, appeal];
      fixture.predecessor = JSON.parse(JSON.stringify(state));
    },
  };
});

type Path = 'picker' | 'job';
type Engine = typeof import('@/lib/clubManager');
type Desk = typeof import('@/lib/clubManagerDecisions');
interface Arm {
  state: CareerState; input: CareerState; inputBytes: string; draws: number[];
  predecessor: CareerState | null; whistles: number; E: Engine; D: Desk;
}
interface Pair { reference: Arm; prepared: Arm }
const pairs = new Map<Path, Promise<Pair>>();
const receipts: Record<string, unknown> = {};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const withoutDesk = (state: CareerState) => { const copy = clone(state); delete copy.decisions; return copy; };

beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-16T16:00:00Z')); });
afterAll(() => {
  fixture.install = false; vi.useRealTimers();
  if (process.env.CM_HANDOVER_RECEIPT) writeFileSync(process.env.CM_HANDOVER_RECEIPT, JSON.stringify(receipts, null, 2));
});
function seeded<T>(seed: number, action: () => T): { value: T; draws: number[] } {
  const draws: number[] = [];
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0; let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    const value = ((n ^ n >>> 14) >>> 0) / 4294967296; draws.push(value); return value;
  });
  try { return { value: action(), draws }; } finally { random.mockRestore(); }
}
async function arm(path: Path, install: boolean): Promise<Arm> {
  // Fresh module counters, not masked IDs, make the full-state comparison exact.
  vi.resetModules(); fixture.install = false; fixture.whistles = 0; fixture.predecessor = null;
  const E = await import('@/lib/clubManager'), C = await import('@/lib/clubManagerCalendar');
  const D = await import('@/lib/clubManagerDecisions');
  const opened = seeded(1375001, () => E.startCareer('Arsenal'));
  const input = opened.value;
  if (path === 'job') {
    // A saved accepted application is prepared, as in simClubManagerCalendar.
    // This tests the real join, not the application's acceptance probability.
    input.week = Math.max(2, Math.floor(input.calendar.length * 0.28));
    input.season = 3;
    input.jobHunt = { open: {
      club: 'Everton', league: 'premier', tier: 3, season: input.season, week: input.week,
      matchesLeft: 0, roll: 0, status: 'accepted',
    }, cooldowns: [], sentSeason: input.season, sent: 1, summerMove: null };
  }
  const inputBytes = JSON.stringify(input); fixture.install = install;
  const run = seeded(1375002, () => path === 'picker' ? C.startMidSeason(input, 'autumn') : C.joinClubNow(input));
  fixture.install = false;
  expect(run.value, 'Actual public handover must return a career').not.toBeNull();
  expect(fixture.whistles, 'The real predecessor run must reach a match whistle').toBeGreaterThan(0);
  expect(JSON.stringify(input), 'Public handover preserves its complete input').toBe(inputBytes);
  const result: Arm = { state: run.value!, input, inputBytes, draws: [...opened.draws, ...run.draws],
    predecessor: fixture.predecessor as CareerState | null, whistles: fixture.whistles, E, D };
  if (install) {
    expect(result.predecessor, 'Prepared predecessor desk is captured at an actual whistle').not.toBeNull();
    expect(D.deskOf(result.predecessor!).map(card => card.kind)).toEqual(['situation', 'appeal']);
    expect(D.deskOf(result.predecessor!).every(card => !card.resolved && card.options.length > 0)).toBe(true);
  }
  receipts[`${path}-${install ? 'prepared' : 'reference'}`] = {
    input, state: result.state, predecessor: result.predecessor, draws: result.draws, whistles: result.whistles,
  };
  return result;
}
function pair(path: Path): Promise<Pair> {
  if (!pairs.has(path)) pairs.set(path, (async () => ({ reference: await arm(path, false), prepared: await arm(path, true) }))());
  return pairs.get(path)!;
}
function pending(arm: Arm, kind: DeskItem['kind']): DeskItem {
  const item = arm.D.deskOf(arm.predecessor!).find(card => card.kind === kind);
  expect(item, 'The predecessor fixture contains the named pending card').toBeDefined(); return item!;
}
function assertFundedChoiceWorks(arm: Arm, item: DeskItem): void {
  expect(item.deckId).toBe('spareFunds');
  expect(item.options[0].effect).toEqual({ kind: 'move', meter: 'budget', delta: 0.2 });
  const before = arm.predecessor!, held = JSON.stringify(before);
  const answer = seeded(1375003, () => arm.E.answerMessage(before, item.id, 0));
  expect(answer.draws).toEqual([]); expect(JSON.stringify(before)).toBe(held);
  expect(answer.value.budget).toBe(Math.round((before.budget + 0.2) * 1000) / 1000);
}

describe('Club Manager appointment desk ownership', () => {
  for (const path of ['picker', 'job'] as const) {
    it(`handover desk missing: ${path} cannot claim predecessor funds`, async () => {
      const { prepared } = await pair(path), item = pending(prepared, 'situation');
      assertFundedChoiceWorks(prepared, item);
      const before = prepared.state, answer = seeded(1375004, () => prepared.E.answerMessage(before, item.id, 0));
      expect(answer.value.budget === before.budget, `CM_HANDOVER_${path.toUpperCase()}_FUNDS: inherited funds remain claimable`).toBe(true);
      expect(answer.value).toBe(before); expect(answer.draws).toEqual([]);
      expect(prepared.D.deskOf(before)).toEqual([]);
    }, 120000);
    it(`handover desk missing: ${path} clears pending predecessor appeal`, async () => {
      const { prepared } = await pair(path), item = pending(prepared, 'appeal');
      expect(prepared.D.deskOf(prepared.state).some(card => card.id === item.id),
        `CM_HANDOVER_${path.toUpperCase()}_APPEAL: predecessor pending appeal remains on the new desk`).toBe(false);
      expect(prepared.D.pendingDecisions(prepared.state)).toEqual([]);
    }, 120000);
    it(`handover desk preservation: ${path} keeps every other state field and draw`, async () => {
      const { reference, prepared } = await pair(path);
      expect(withoutDesk(prepared.state)).toEqual(withoutDesk(reference.state));
      expect(prepared.draws).toEqual(reference.draws); expect(prepared.whistles).toBe(reference.whistles);
      expect(prepared.state.boardConfidence).toBe(BOARD_FRESH); expect(prepared.state.week).toBeGreaterThan(0);
      expect(JSON.stringify(prepared.input)).toBe(prepared.inputBytes);
      expect(JSON.stringify(reference.input)).toBe(reference.inputBytes);
    }, 120000);
  }
  it('handover desk preservation: saved predecessor cards remain valid before appointment', async () => {
    const { prepared } = await pair('picker'), before = clone(prepared.predecessor!);
    const held = JSON.stringify(before), old = localStorage.getItem(prepared.E.SAVE_KEY);
    try {
      const run = seeded(1375005, () => { expect(prepared.E.saveCareer(before)).toBe(true); return prepared.E.loadCareer(); });
      expect(run.value).not.toBeNull(); expect(run.draws).toEqual([]);
      expect(prepared.D.deskOf(run.value!)).toEqual(prepared.D.deskOf(before));
      expect(JSON.stringify(before)).toBe(held);
      receipts.savedPredecessor = { before, loaded: run.value, draws: run.draws };
    } finally { if (old === null) localStorage.removeItem(prepared.E.SAVE_KEY); else localStorage.setItem(prepared.E.SAVE_KEY, old); }
  }, 120000);
  it('handover desk preservation: existing funded reply applies once', async () => {
    const { prepared } = await pair('picker'), item = pending(prepared, 'situation');
    assertFundedChoiceWorks(prepared, item);
    const first = prepared.E.answerMessage(prepared.predecessor!, item.id, 0);
    const bytes = JSON.stringify(first), repeated = seeded(1375006, () => prepared.E.answerMessage(first, item.id, 0));
    expect(repeated.value).toBe(first); expect(JSON.stringify(repeated.value)).toBe(bytes); expect(repeated.draws).toEqual([]);
  }, 120000);
  it('handover desk preservation: new manager matches still offer the original deck', async () => {
    const { prepared } = await pair('picker'); fixture.install = false;
    const oldIds = new Set(prepared.D.deskOf(prepared.state).map(card => card.id));
    let state = prepared.state, offered: DeskItem | undefined, matches = 0;
    const run = seeded(1375007, () => {
      for (let i = 0; i < 64 && state.week < state.calendar.length; i++) {
        const result = prepared.E.playNextEntry(state, { skipHalftime: true }); state = result.state;
        if (result.kind !== 'match') continue;
        matches += 1; offered = prepared.D.pendingDecisions(state).find(card => card.kind === 'situation' && !oldIds.has(card.id));
        if (offered) break;
      }
    });
    expect(matches).toBeGreaterThan(0); expect(offered, 'Actual later match must offer a new situation').toBeDefined();
    expect(prepared.D.DECK.map(card => card.id)).toEqual([
      'promoShoot', 'investorsNight', 'quietWord', 'schoolVisit', 'columnist', 'spareFunds', 'finesKitty',
      'poorRun', 'boardPressure', 'pressPressure', 'injurySupport', 'academyStepUp', 'minutesCheck',
    ]);
    expect(prepared.D.DECK.some(card => card.id === offered!.deckId)).toBe(true);
    expect(offered!.season).toBe(state.season); expect(offered!.week).toBe(state.week - 1);
    expect(prepared.E.answerMessage(state, offered!.id, offered!.options.length - 1).budget).toBe(state.budget);
    receipts.newManagerDesk = { state, offered, matches, draws: run.draws };
  }, 120000);
  it('handover desk preservation: refused join and empty calendar retain original guards', async () => {
    const { prepared } = await pair('picker'), C = await import('@/lib/clubManagerCalendar');
    const refused = { ...prepared.input, jobHunt: undefined }, held = JSON.stringify(refused);
    expect(C.joinClubNow(refused)).toBeNull(); expect(JSON.stringify(refused)).toBe(held);
    const empty = { ...prepared.input, calendar: [] }; expect(C.startMidSeason(empty, 'autumn')).toBe(empty);
  }, 120000);
});