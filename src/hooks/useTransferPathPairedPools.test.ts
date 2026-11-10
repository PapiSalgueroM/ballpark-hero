import { writeFileSync } from 'node:fs';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import type { CareerPlayer, CareerSeason } from '@/types/career';
import { useTransferPath, type TransferPathState } from '@/hooks/useTransferPath';

const seams = vi.hoisted(() => {
  function makeFamily(family: 'Bundled' | 'Live') {
    const puzzles: TransferPathPuzzle[] = [];
    const players: CareerPlayer[] = [];
    for (const round of ['Daily', 'First', 'Second']) {
      const prefix = 'Fixture ' + family + ' ' + round;
      const start = prefix + ' Start';
      const bridge = prefix + ' Bridge';
      const target = prefix + ' Target';
      const clubA = prefix + ' Club A';
      const clubB = prefix + ' Club B';
      const spell = (club: string, season: string): CareerSeason => ({
        club, season, goals: 0, assists: 0, appearances: 1, marketValue: 1,
      });
      const player = (name: string, career: CareerSeason[]): CareerPlayer => ({
        name, nationality: 'Fixture Nation', position: 'CM', career,
      });
      puzzles.push({
        id: 'fixture-' + family.toLowerCase() + '-' + round.toLowerCase(),
        playerA: start, playerB: target, minSteps: 2, hint: prefix + ' route hint',
        active: null, europe: null,
      });
      players.push(
        player(start, [spell(clubA, '2020-2021')]),
        player(bridge, [spell(clubA, '2020-2021'), spell(clubB, '2021-2022')]),
        player(target, [spell(clubB, '2021-2022')]),
        player(prefix + ' Wrong Season', [spell(clubA, '2019-2020')]),
      );
    }
    return { puzzles, players };
  }
  return {
    fixtures: { bundled: makeFamily('Bundled'), live: makeFamily('Live') },
    fetchPuzzles: vi.fn<() => Promise<TransferPathPuzzle[]>>(),
    fetchPlayers: vi.fn<() => Promise<CareerPlayer[]>>(),
    completion: vi.fn<(slug: string, complete: boolean, score: number, correctAnswers: number) => void>(),
  };
});

vi.mock('@/data/transferPathPuzzles', () => ({ default: seams.fixtures.bundled.puzzles }));
vi.mock('@/data/careerPlayers', () => ({ careerPlayers: seams.fixtures.bundled.players }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: seams.fetchPuzzles }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: seams.fetchPlayers }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: seams.completion }));

const NOW = '2026-11-07T02:30:00.000Z';
const DATE_ET = '2026-11-06';
const SAVE_KEY = 'transfer-path-daily-' + DATE_ET;

type Pool = 'puzzles' | 'players';
type Family = keyof typeof seams.fixtures;
type Move = ReturnType<TransferPathState['addPlayer']>;
type CaseKey = 'pairedLive' | 'pairedFallback' | 'puzzlesOnly' | 'playersOnly';
type Scenario = {
  key: CaseKey;
  title: string;
  marker?: string;
  delivered: { puzzles: boolean; players: boolean; first: Pool };
  expected: Family;
};
type Action = {
  label: string;
  type: 'move' | 'give-up' | 'switch-to-unlimited' | 'next-puzzle';
  name: string | null;
  result: Move | null;
};
type ProviderEvent = { pool: Pool; phase: 'requested' | 'resolved'; rows: number | null };
type Write = { area: 'local' | 'session'; key: string; value: string };

const scenarios: Scenario[] = [
  {
    key: 'pairedLive', title: 'uses the live puzzle and career pools when both arrive',
    delivered: { puzzles: true, players: true, first: 'puzzles' }, expected: 'live',
  },
  {
    key: 'pairedFallback', title: 'keeps both bundled pools when both providers are empty',
    delivered: { puzzles: false, players: false, first: 'players' }, expected: 'bundled',
  },
  {
    key: 'puzzlesOnly', title: 'keeps both bundled pools when only live puzzles arrive',
    marker: 'TRANSFER_PATH_PUZZLES_ONLY',
    delivered: { puzzles: true, players: false, first: 'puzzles' }, expected: 'bundled',
  },
  {
    key: 'playersOnly', title: 'keeps both bundled pools when only live careers arrive',
    marker: 'TRANSFER_PATH_PLAYERS_ONLY',
    delivered: { puzzles: false, players: true, first: 'players' }, expected: 'bundled',
  },
];

function deferred<T>() {
  let resolve!: (rows: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function storageValues(storage: Storage) {
  return Object.fromEntries(Object.keys(storage).sort().map(key => [key, storage.getItem(key)]));
}

function snapshot(label: string, s: TransferPathState) {
  const completionCalls = seams.completion.mock.calls;
  return {
    label, puzzle: s.puzzle, chain: [...s.chain], connections: [...s.connections],
    status: s.status, score: s.score, mode: s.mode, unlimitedIndex: s.unlimitedIndex,
    isLoading: s.isLoading, isLoadingPool: s.isLoadingPool, rule: s.rule, activeRule: s.activeRule,
    ruleLocked: s.ruleLocked, dailyRuleBlocked: s.dailyRuleBlocked, ruleAvailability: s.ruleAvailability,
    optimal: s.optimal, hint: s.hint, stranded: s.stranded, moreHelp: s.moreHelp, revealPath: s.revealPath,
    names: s.getAllPlayerNames(),
    storage: { local: storageValues(localStorage), session: storageValues(sessionStorage) },
    completion: completionCalls[completionCalls.length - 1],
  };
}

type Frame = ReturnType<typeof snapshot>;
type Packet = {
  key: CaseKey;
  delivered: Scenario['delivered'];
  frames: Frame[];
  actions: Action[];
  providers: ProviderEvent[];
  writes: Write[];
  closed: boolean;
};

const cases: Partial<Record<CaseKey, Packet>> = {};

function writeEvidence() {
  const file = process.env.TRANSFER_PATH_PAIRED_POOLS_RAW;
  if (file) writeFileSync(file, JSON.stringify({
    schema: 1, now: NOW, dateET: DATE_ET, fixtures: seams.fixtures, cases,
  }, null, 2) + '\n');
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  seams.completion.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

async function exercise(scenario: Scenario) {
  const packets = {
    puzzles: deferred<TransferPathPuzzle[]>(),
    players: deferred<CareerPlayer[]>(),
  };
  const packet: Packet = {
    key: scenario.key, delivered: scenario.delivered,
    frames: [], actions: [], providers: [], writes: [], closed: false,
  };
  cases[scenario.key] = packet;
  seams.fetchPuzzles.mockImplementation(() => {
    packet.providers.push({ pool: 'puzzles', phase: 'requested', rows: null });
    return packets.puzzles.promise;
  });
  seams.fetchPlayers.mockImplementation(() => {
    packet.providers.push({ pool: 'players', phase: 'requested', rows: null });
    return packets.players.promise;
  });

  const originalSetItem = Storage.prototype.setItem;
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    originalSetItem.call(this, key, value);
    packet.writes.push({ area: this === sessionStorage ? 'session' : 'local', key, value });
  });
  const selected = seams.fixtures[scenario.expected];
  const rendered = renderHook(() => useTransferPath());
  const read = () => rendered.result.current;
  function capture(label: string) {
    const frame = snapshot(label, read());
    packet.frames.push(frame);
    return frame;
  }
  function move(label: string, name: string) {
    let result!: Move;
    act(() => { result = read().addPlayer(name); });
    packet.actions.push({ label, type: 'move', name, result });
    return { result, frame: capture(label) };
  }
  function invoke(label: string, type: Exclude<Action['type'], 'move'>, action: () => void) {
    act(action);
    packet.actions.push({ label, type, name: null, result: null });
  }
  async function deliver(pool: Pool) {
    await act(async () => {
      if (pool === 'puzzles') {
        const rows = scenario.delivered.puzzles ? seams.fixtures.live.puzzles : [];
        packet.providers.push({ pool, phase: 'resolved', rows: rows.length });
        packets.puzzles.resolve(rows);
        await packets.puzzles.promise;
      } else {
        const rows = scenario.delivered.players ? seams.fixtures.live.players : [];
        packet.providers.push({ pool, phase: 'resolved', rows: rows.length });
        packets.players.resolve(rows);
        await packets.players.promise;
      }
    });
  }

  try {
    const mounted = capture('mounted');
    await deliver(scenario.delivered.first);
    const first = capture('first-settled');
    await deliver(scenario.delivered.first === 'puzzles' ? 'players' : 'puzzles');
    const daily = capture('daily-ready');
    const wrong = move('daily-wrong-season', selected.players[3].name);
    const dailyMove = move('daily-bridge', selected.players[1].name);
    if (read().status === 'building') invoke('daily-terminal', 'give-up', read().giveUp);
    const dailyTerminal = capture('daily-terminal');
    invoke('unlimited-ready', 'switch-to-unlimited', read().switchToUnlimited);
    const unlimited = capture('unlimited-ready');
    const unlimitedMove = move('unlimited-bridge', selected.players[5].name);
    if (read().status === 'building') invoke('unlimited-terminal', 'give-up', read().giveUp);
    const unlimitedTerminal = capture('unlimited-terminal');
    invoke('unlimited-next', 'next-puzzle', read().nextPuzzle);
    const next = capture('unlimited-next');
    return { mounted, first, daily, wrong, dailyMove, dailyTerminal, unlimited, unlimitedMove, unlimitedTerminal, next, selected };
  } finally {
    rendered.unmount();
    capture('unmounted');
    packet.closed = true;
    setItem.mockRestore();
    writeEvidence();
  }
}

function board(frame: Frame) {
  return {
    puzzle: frame.puzzle.id, chain: frame.chain, connections: frame.connections,
    status: frame.status, score: frame.score, mode: frame.mode, unlimitedIndex: frame.unlimitedIndex,
  };
}

describe('Transfer Path paired pools', () => {
  for (const scenario of scenarios) {
    it(scenario.title, async () => {
      const { mounted, first, daily, wrong, dailyMove, dailyTerminal, unlimited, unlimitedMove, unlimitedTerminal, next, selected } =
        await exercise(scenario);
      const [day, firstUnlimited, nextUnlimited] = selected.puzzles;
      const [start, bridge, target, , unlimitedStart, unlimitedBridge, unlimitedTarget] = selected.players;
      const [clubA, clubB] = bridge.career.map(spell => spell.club);
      const [unlimitedA, unlimitedB] = unlimitedBridge.career.map(spell => spell.club);
      const save = JSON.stringify({
        v: 1, date: DATE_ET, puzzleIndex: 0, puzzleId: day.id,
        guesses: [
          { t: 'step', player: bridge.name, club: clubA },
          { t: 'step', player: target.name, club: clubB },
          { t: 'won' },
        ],
        gameStatus: 'won',
      });
      const startBoard = (puzzle: TransferPathPuzzle, mode: TransferPathState['mode'], unlimitedIndex: number) => ({
        puzzle: puzzle.id, chain: [puzzle.playerA], connections: [null], status: 'building', score: 0, mode, unlimitedIndex,
      });
      const dailyBoard = startBoard(day, 'daily', 0);
      const unlimitedBoard = startBoard(firstUnlimited, 'unlimited', 0);
      const dayStorage = { local: { [SAVE_KEY]: save }, session: {} };

      expect({
        loading: [mounted.isLoadingPool, first.isLoadingPool, daily.isLoadingPool, daily.isLoading],
        whilePending: [mounted.puzzle.id, first.puzzle.id, mounted.names, first.names],
        daily: board(daily),
        family: { names: daily.names, hint: daily.hint, optimal: daily.optimal, rule: daily.activeRule, moreHelp: daily.moreHelp !== null },
        wrongSeason: { result: wrong.result, board: board(wrong.frame), storage: wrong.frame.storage },
        dailyMove: dailyMove.result,
        dailyFinish: board(dailyTerminal),
        dailySave: dailyTerminal.storage,
        unlimited: board(unlimited),
        unlimitedMove: unlimitedMove.result,
        unlimitedFinish: board(unlimitedTerminal),
        next: board(next),
        savesAfterSwitch: [unlimited.storage, unlimitedTerminal.storage, next.storage],
        completion: [daily.completion, dailyTerminal.completion, next.completion],
      }, scenario.marker).toEqual({
        loading: [true, true, false, false],
        whilePending: [
          seams.fixtures.bundled.puzzles[0].id, seams.fixtures.bundled.puzzles[0].id,
          seams.fixtures.bundled.players.map(player => player.name), seams.fixtures.bundled.players.map(player => player.name),
        ],
        daily: dailyBoard,
        family: { names: selected.players.map(player => player.name), hint: day.hint, optimal: 2, rule: 'classic', moreHelp: true },
        wrongSeason: { result: { ok: false, club: null }, board: dailyBoard, storage: { local: {}, session: {} } },
        dailyMove: { ok: true, club: clubA },
        dailyFinish: { ...dailyBoard, chain: [start.name, bridge.name, target.name], connections: [null, clubA, clubB], status: 'won', score: 1000 },
        dailySave: dayStorage,
        unlimited: unlimitedBoard,
        unlimitedMove: { ok: true, club: unlimitedA },
        unlimitedFinish: {
          ...unlimitedBoard, chain: [unlimitedStart.name, unlimitedBridge.name, unlimitedTarget.name],
          connections: [null, unlimitedA, unlimitedB], status: 'won', score: 1000,
        },
        next: startBoard(nextUnlimited, 'unlimited', 1),
        savesAfterSwitch: [dayStorage, dayStorage, dayStorage],
        completion: [['transfer-path', false, 0, 0], ['transfer-path', true, 1000, 1], ['transfer-path', true, 1000, 1]],
      });
    });
  }
});
