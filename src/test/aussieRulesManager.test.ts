import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  automaticLineup, clubById, createManager, createWorld, effectiveSkill, fixturesForRound,
  ladderFor, opponentTactic, readManagerSave, reduceManager, replayManager, SAVE_KEY,
  type ManagerAction, type ManagerState, type Preparation, type Tactic,
} from '@/lib/aussieRulesManager';
import { useAussieRulesManager } from '@/hooks/useAussieRulesManager';

const outward = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: outward.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: outward.record, getCurrentPlayerName: () => 'Fixture manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const counter = (against: Tactic): Tactic => against === 'control' ? 'pressure' : against === 'pressure' ? 'direct' : 'control';
function advanceMatch(initial: ManagerState, preparation: Preparation = 'train', tactic?: Tactic, actions?: ManagerAction[]): ManagerState {
  let state = initial;
  const send = (action: ManagerAction) => { state = reduceManager(state, action); actions?.push(action); };
  send({ type: 'prepare', choice: preparation });
  for (let index = 0; index < 4; index += 1) {
    send({ type: 'play', tactic: tactic ?? counter(opponentTactic(state)) });
    if (index < 3) send({ type: 'next' });
  }
  return state;
}
function campaign(seed: number, clubId = 'club-0') {
  let state = createManager(seed, clubId)!;
  const actions: ManagerAction[] = [];
  for (let index = 0; index < 10; index += 1) {
    state = advanceMatch(state, index % 2 ? 'rest' : 'train', undefined, actions);
    const action: ManagerAction = { type: 'next' }; actions.push(action); state = reduceManager(state, action);
  }
  return { state, actions };
}
const ownPoints = (state: ManagerState) => state.match!.homeId === state.clubId ? state.match!.homeScore.total : state.match!.awayScore.total;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('fictional Aussie Rules manager engine', () => {
  it('creates six deterministic fictional clubs with216 unique valid people and legal23-player teams', () => {
    for (const seed of [0, 1, 792, 0xffffffff]) {
      const world = createWorld(seed);
      expect(createWorld(seed)).toEqual(world);
      expect(world).toHaveLength(6);
      const players = world.flatMap(club => club.players);
      expect(players).toHaveLength(216);
      expect(new Set(players.map(player => player.id)).size).toBe(216);
      expect(new Set(players.map(player => player.name)).size).toBe(216);
      for (const club of world) {
        expect(club.players).toHaveLength(36);
        const lineup = automaticLineup(club);
        expect(new Set([...lineup.starters, ...lineup.bench]).size).toBe(23);
        expect(lineup.starters).toHaveLength(18); expect(lineup.bench).toHaveLength(5);
        for (const [role, count] of [['defender', 6], ['midfielder', 5], ['ruck', 1], ['forward', 6]]) {
          expect(lineup.starters.filter(id => club.players.find(player => player.id === id)!.role === role)).toHaveLength(count as number);
        }
        for (const player of club.players) {
          expect(player.name).not.toBe(''); expect(player.skill).toBeGreaterThanOrEqual(40); expect(player.skill).toBeLessThanOrEqual(90);
          expect(player.stamina).toBeGreaterThanOrEqual(45); expect(player.stamina).toBeLessThanOrEqual(90);
          expect(player.fatigue).toBe(0); expect(player.prep).toBe(0);
        }
      }
    }
    expect(createWorld(Number.NaN)).toEqual([]);
    for (const seed of [-1, 0.1, Infinity, 0x100000000]) expect(createManager(seed)).toBeNull();
    expect(createManager(1, 'club-6')).toBeNull();
  });

  it('schedules every pair twice with opposite venues, ten games and five home games per club', () => {
    const fixtures = Array.from({ length: 10 }, (_, round) => fixturesForRound(round));
    expect(fixtures.flat()).toHaveLength(30);
    for (const round of fixtures) expect(new Set(round.flatMap(match => [match.homeId, match.awayId])).size).toBe(6);
    for (let index = 0; index < 6; index += 1) {
      const id = `club-${index}`;
      expect(fixtures.flat().filter(match => match.homeId === id)).toHaveLength(5);
      expect(fixtures.flat().filter(match => match.awayId === id)).toHaveLength(5);
      for (let other = index + 1; other < 6; other += 1) {
        expect(fixtures.flat().filter(match => match.homeId === id && match.awayId === `club-${other}`)).toHaveLength(1);
        expect(fixtures.flat().filter(match => match.awayId === id && match.homeId === `club-${other}`)).toHaveLength(1);
      }
    }
    expect(fixturesForRound(10)).toEqual([]); expect(fixturesForRound(-1)).toEqual([]);
  });

  it('rejects illegal lineups, phases, unknown IDs, invalid keys and repeated no-ops without mutation', () => {
    const original = createManager(792)!;
    const bytes = JSON.stringify(original);
    const invalid: unknown[] = [
      { type: 'next' }, { type: 'play', tactic: 'control' }, { type: 'swap', outId: original.starters[0], inId: original.bench[0] },
      { type: 'prepare', choice: 'train', extra: true }, { type: 'prepare', choice: 'sleep' },
      { type: 'lineup', starters: original.starters, bench: original.bench },
      { type: 'lineup', starters: Array(18).fill(original.starters[0]), bench: original.bench },
      { type: 'lineup', starters: [...original.starters.slice(0, 17), 'club-1-p-0'], bench: original.bench },
      { type: 'lineup', starters: original.starters, bench: [original.starters[0], ...original.bench.slice(1)] },
      { type: 'lineup', starters: original.starters.slice(1), bench: original.bench },
      { type: 'lineup', starters: [...original.starters.slice(0, 17), original.bench[0]], bench: [original.starters[17], ...original.bench.slice(1)] },
      null, {}, { type: 'next', extra: 'unexpected' },
    ];
    for (const action of invalid) expect(reduceManager(original, action as ManagerAction)).toBe(original);
    expect(JSON.stringify(original)).toBe(bytes);
    const prepared = reduceManager(original, { type: 'prepare', choice: 'train' });
    expect(reduceManager(prepared, { type: 'prepare', choice: 'rest' })).toBe(prepared);
    const played = reduceManager(prepared, { type: 'play', tactic: 'control' });
    expect(reduceManager(played, { type: 'play', tactic: 'control' })).toBe(played);
  });

  it('applies exact training, rest, stamina and tactic fatigue to the players who actually play', () => {
    const base = createManager(43)!;
    const trained = reduceManager(base, { type: 'prepare', choice: 'train' });
    const own = clubById(trained, trained.clubId)!;
    expect(own.players.every(player => player.prep === 8 && player.fatigue === 8)).toBe(true);
    const played = reduceManager(trained, { type: 'play', tactic: 'pressure' });
    for (const player of clubById(played, played.clubId)!.players) {
      const before = own.players.find(value => value.id === player.id)!;
      expect(player.fatigue).toBeCloseTo(base.starters.includes(player.id) ? 8 + 7 + (100 - player.stamina) * 0.1 + 7 : before.fatigue);
      expect(effectiveSkill(player)).toBeCloseTo(player.skill * (1 - player.fatigue * 0.0045) + player.prep);
    }
    const first = advanceMatch(base);
    const next = reduceManager(first, { type: 'next' });
    const rested = reduceManager(next, { type: 'prepare', choice: 'rest' });
    for (const player of clubById(rested, rested.clubId)!.players) {
      const prior = clubById(first, first.clubId)!.players.find(value => value.id === player.id)!;
      expect(player.fatigue).toBeCloseTo(Math.max(0, prior.fatigue - 20 - 30)); expect(player.prep).toBe(0);
    }
  });

  it('keeps every opponent participant and scorer within its pinned opening23 for all quarters and all matches', () => {
    for (let seed = 0; seed < 24; seed += 1) {
      let state = reduceManager(createManager(seed)!, { type: 'prepare', choice: 'train' });
      const opponent = state.match!.homeId === state.clubId ? state.match!.awayId : state.match!.homeId;
      const pinned = state.match!.homeId === opponent ? state.match!.homeSquad : state.match!.awaySquad;
      expect(pinned).toHaveLength(23); expect(new Set(pinned).size).toBe(23);
      for (let index = 0; index < 4; index += 1) {
        const previous = clubById(state, opponent)!;
        state = reduceManager(state, { type: 'play', tactic: 'pressure' });
        const participants = clubById(state, opponent)!.players.filter(player => player.fatigue !== previous.players.find(value => value.id === player.id)!.fatigue);
        expect(participants).toHaveLength(18);
        expect(participants.every(player => pinned.includes(player.id))).toBe(true);
        if (index < 3) state = reduceManager(state, { type: 'next' });
      }
      expect(state.results).toHaveLength(3);
      for (const match of state.results) {
        expect(match.homeSquad).toHaveLength(23); expect(match.awaySquad).toHaveLength(23);
        expect(new Set([...match.homeSquad, ...match.awaySquad]).size).toBe(46);
        expect(match.events.every(event => (event.clubId === match.homeId ? match.homeSquad : match.awaySquad).includes(event.playerId))).toBe(true);
        if (match !== state.match) {
          for (const [id, squad] of [[match.homeId, match.homeSquad], [match.awayId, match.awaySquad]] as const) {
            const club = clubById(state, id)!;
            expect(club.players.filter(player => !squad.includes(player.id)).every(player => player.fatigue === 8)).toBe(true);
          }
        }
      }
    }
  });

  it('swaps only nominated same-role players at a break, preserves18+5 and rejects a sixth change', () => {
    let state = reduceManager(reduceManager(createManager(52)!, { type: 'prepare', choice: 'rest' }), { type: 'play', tactic: 'control' });
    const starter = state.starters.find(id => clubById(state, state.clubId)!.players.find(player => player.id === id)!.role === 'defender')!;
    const replacement = state.bench.find(id => clubById(state, state.clubId)!.players.find(player => player.id === id)!.role === 'defender')!;
    const wrongRole = state.bench.find(id => clubById(state, state.clubId)!.players.find(player => player.id === id)!.role === 'ruck')!;
    expect(reduceManager(state, { type: 'swap', outId: starter, inId: wrongRole })).toBe(state);
    const pinned = [...state.starters, ...state.bench].sort();
    for (let index = 0; index < 5; index += 1) {
      const outId = index % 2 ? replacement : starter; const inId = index % 2 ? starter : replacement;
      const prior = state; state = reduceManager(state, { type: 'swap', outId, inId });
      expect(state).not.toBe(prior); expect(state.starters).toContain(inId); expect(state.bench).toContain(outId);
      expect([...state.starters, ...state.bench].sort()).toEqual(pinned); expect(state.swapsThisBreak).toBe(index + 1);
    }
    expect(reduceManager(state, { type: 'swap', outId: replacement, inId: starter })).toBe(state);
    const next = reduceManager(state, { type: 'next' }); expect(next.swapsThisBreak).toBe(0); expect(next.phase).toBe('quarter');
    expect(reduceManager(next, { type: 'swap', outId: replacement, inId: starter })).toBe(next);
  });

  it('derives every quarter and season score from real6/1 events, then produces an exact ten-game ladder and quiet league finish', () => {
    const original = createManager(31)!;
    const originalBytes = JSON.stringify(original);
    let state = original;
    for (let round = 0; round < 10; round += 1) {
      const prepared = reduceManager(state, { type: 'prepare', choice: round % 2 ? 'rest' : 'train' });
      state = prepared;
      for (let index = 0; index < 4; index += 1) {
        state = reduceManager(state, { type: 'play', tactic: counter(opponentTactic(state)) });
        if (index < 3) state = reduceManager(state, { type: 'next' });
      }
      for (const match of state.results.slice(-3)) {
        for (const [id, squad] of [[match.homeId, match.homeSquad], [match.awayId, match.awaySquad]] as const) {
          expect(squad).toHaveLength(23); expect(new Set(squad).size).toBe(23);
          expect(match.events.filter(event => event.clubId === id).every(event => squad.includes(event.playerId))).toBe(true);
          const before = clubById(prepared, id)!;
          for (const reserve of clubById(state, id)!.players.filter(player => !squad.includes(player.id))) {
            expect(reserve.fatigue).toBe(before.players.find(player => player.id === reserve.id)!.fatigue);
          }
        }
      }
      state = reduceManager(state, { type: 'next' });
    }
    expect(JSON.stringify(original)).toBe(originalBytes);
    expect(state.phase).toBe('complete'); expect(state.results).toHaveLength(30); expect(state.round).toBe(9);
    expect(state.match!.quarter).toBe(4);
    for (const match of state.results) {
      expect(match.quarter).toBe(4);
      expect(new Set(match.events.map(event => event.id)).size).toBe(match.events.length);
      for (const event of match.events) {
        expect(event.points).toBe(event.kind === 'goal' ? 6 : 1);
        expect(event.quarter).toBeGreaterThanOrEqual(1); expect(event.quarter).toBeLessThanOrEqual(4);
        expect(event.minute).toBeGreaterThanOrEqual(1); expect(event.minute).toBeLessThanOrEqual(20);
      }
      for (const [id, score] of [[match.homeId, match.homeScore], [match.awayId, match.awayScore]] as const) {
        const events = match.events.filter(event => event.clubId === id);
        expect(score.total).toBe(events.reduce((sum, event) => sum + event.points, 0));
        expect(score.total).toBe(score.goals * 6 + score.behinds);
        expect(score.goals).toBe(events.filter(event => event.kind === 'goal').length);
        expect(score.behinds).toBe(events.filter(event => event.kind === 'behind').length);
      }
    }
    const ladder = ladderFor(state);
    expect(ladder).toHaveLength(6);
    for (const row of ladder) {
      expect(row.played).toBe(10); expect(row.wins + row.draws + row.losses).toBe(10);
      expect(row.points).toBe(row.wins * 4 + row.draws * 2);
      expect(row.percentage).toBeCloseTo(row.pointsFor / row.pointsAgainst * 100);
    }
    expect(ladder.reduce((sum, row) => sum + row.pointsFor, 0)).toBe(ladder.reduce((sum, row) => sum + row.pointsAgainst, 0));
    expect(ladder.reduce((sum, row) => sum + row.points, 0)).toBe(120);
    expect(reduceManager(state, { type: 'next' })).toBe(state); expect(reduceManager(state, { type: 'prepare', choice: 'rest' })).toBe(state);
  });

  it('awards actual drawn games2 points each and ranks equal points by percentage', () => {
    let drawn: ManagerState | null = null;
    for (let seed = 0; seed < 240 && !drawn; seed += 1) {
      const state = advanceMatch(createManager(seed)!);
      if (state.results.some(match => match.homeScore.total === match.awayScore.total)) drawn = state;
    }
    expect(drawn).not.toBeNull();
    const match = drawn!.results.find(value => value.homeScore.total === value.awayScore.total)!;
    for (const id of [match.homeId, match.awayId]) expect(ladderFor(drawn!).find(row => row.clubId === id)!.points).toBe(2);
    const rows = ladderFor(campaign(792).state);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1].points).toBeGreaterThanOrEqual(rows[index].points);
      if (rows[index - 1].points === rows[index].points) expect(rows[index - 1].percentage).toBeGreaterThanOrEqual(rows[index].percentage);
    }
  });

  it('replays the strict versioned action log exactly and refuses corrupt, impossible, extra or oversized saves', () => {
    const { state, actions } = campaign(155, 'club-3');
    expect(replayManager(155, 'club-3', actions)).toEqual(state);
    const save = { version: 1, seed: 155, clubId: 'club-3', actions };
    expect(readManagerSave(JSON.stringify(save))!.state).toEqual(state);
    let lineupState = createManager(155, 'club-3')!;
    const original = { starters: lineupState.starters, bench: lineupState.bench };
    const worst = automaticLineup(clubById(lineupState, lineupState.clubId)!, 'worst');
    const oversizedActions: ManagerAction[] = [];
    for (let index = 0; index < 261; index += 1) {
      const action: ManagerAction = { type: 'lineup', ...(index % 2 ? original : worst) };
      const next = reduceManager(lineupState, action);
      expect(next).not.toBe(lineupState); lineupState = next; oversizedActions.push(action);
    }
    const oversizedLog = JSON.stringify({ ...save, actions: oversizedActions });
    expect(oversizedLog.length).toBeLessThan(150000);
    expect(readManagerSave(oversizedLog)).toBeNull();
    const validShort = JSON.stringify({ version: 1, seed: 155, clubId: 'club-3', actions: [] });
    expect(readManagerSave(JSON.stringify({ ...JSON.parse(validShort), unexpected: true }))).toBeNull();
    const oversizedRaw = ' '.repeat(150001 - validShort.length) + validShort;
    expect(JSON.parse(oversizedRaw)).toEqual(JSON.parse(validShort));
    expect(oversizedRaw.length).toBe(150001); expect(readManagerSave(oversizedRaw)).toBeNull();
    const corrupt = [null, 'not json', '[]', JSON.stringify({ ...save, version: 2 }), JSON.stringify({ ...save, seed: Infinity }), JSON.stringify({ ...save, clubId: 'club-8' }), JSON.stringify({ ...save, state }), JSON.stringify({ ...save, actions: [...actions, { type: 'next' }] }), JSON.stringify({ ...save, actions: [{ type: 'play', tactic: 'control' }] }), JSON.stringify({ ...save, actions: [{ type: 'prepare', choice: 'train', name: 'unexpected' }] })];
    for (const raw of corrupt) expect(readManagerSave(raw)).toBeNull();
  });

  it('restores a full legal campaign with all five changes at every break within the action bound', () => {
    let state = createManager(71)!;
    const actions: ManagerAction[] = [];
    const send = (action: ManagerAction) => { const next = reduceManager(state, action); expect(next).not.toBe(state); state = next; actions.push(action); };
    for (let round = 0; round < 10; round += 1) {
      send({ type: 'prepare', choice: 'rest' });
      for (let index = 0; index < 4; index += 1) {
        send({ type: 'play', tactic: 'control' });
        if (index < 3) {
          for (let change = 0; change < 5; change += 1) {
            const outId = state.starters.find(id => clubById(state, state.clubId)!.players.find(player => player.id === id)!.role === 'defender')!;
            const inId = state.bench.find(id => clubById(state, state.clubId)!.players.find(player => player.id === id)!.role === 'defender')!;
            send({ type: 'swap', outId, inId });
          }
          send({ type: 'next' });
        }
      }
      send({ type: 'next' });
    }
    expect(actions).toHaveLength(240); expect(state.phase).toBe('complete');
    expect(readManagerSave(JSON.stringify({ version: 1, seed: 71, clubId: 'club-0', actions }))!.state).toEqual(state);
  });

  it('measures stronger squads, counter tactics and rested player readiness against paired seeded match outcomes', () => {
    const squad: number[] = [], tactics: number[] = [], readiness: number[] = [];
    for (let seed = 0; seed < 96; seed += 1) {
      const best = createManager(seed)!;
      expect(new Set(best.clubs.flatMap(club => club.players.map(player => player.name))).size).toBe(216);
      const worst = reduceManager(best, { type: 'lineup', ...automaticLineup(clubById(best, best.clubId)!, 'worst') });
      squad.push(ownPoints(advanceMatch(best, 'train', 'control')) - ownPoints(advanceMatch(worst, 'train', 'control')));
      tactics.push(ownPoints(advanceMatch(best, 'train')) - ownPoints(advanceMatch(best, 'train', 'control')));
      let fresh = best, tired = best;
      for (let round = 0; round < 2; round += 1) {
        fresh = reduceManager(advanceMatch(fresh, 'rest', 'control'), { type: 'next' });
        tired = reduceManager(advanceMatch(tired, 'train', 'control'), { type: 'next' });
      }
      readiness.push(ownPoints(advanceMatch(fresh, 'train', 'control')) - ownPoints(advanceMatch(tired, 'train', 'control')));
    }
    for (const [label, values, floor, blockFloor] of [['squad', squad, 12, 10], ['tactics', tactics, 10, 8], ['readiness', readiness, 8, 6]] as const) {
      const blocks = [mean(values.slice(0, 32)), mean(values.slice(32, 64)), mean(values.slice(64))];
      console.log(`Aussie manager paired${label}:96 seeds, mean point gap${mean(values).toFixed(3)}, block means${blocks.map(value => value.toFixed(3)).join(',')}`);
      // Floors sit below half the first measured mean and below each32-seed block.
      expect(mean(values)).toBeGreaterThan(floor);
      for (const value of blocks) expect(value).toBeGreaterThan(blockFloor);
    }
  }, 60000);
});

describe('actual manager hook with existing once-only completion', () => {
  it('coalesces repeated lineup edits including return to the original, and restores exact progress without extra writes', () => {
    const { result, unmount } = renderHook(() => useAussieRulesManager());
    act(() => { expect(result.current.start(88, 'club-0')).toBe(true); });
    const original = result.current.state!;
    const worst = automaticLineup(clubById(original, original.clubId)!, 'worst');
    act(() => { expect(result.current.dispatch({ type: 'lineup', ...worst })).toBe(true); expect(result.current.dispatch({ type: 'lineup', starters: original.starters, bench: original.bench })).toBe(true); });
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).actions).toEqual([]);
    act(() => { result.current.dispatch({ type: 'lineup', ...worst }); result.current.dispatch({ type: 'prepare', choice: 'train' }); result.current.dispatch({ type: 'play', tactic: 'direct' }); });
    const settled = result.current.state!;
    const raw = localStorage.getItem(SAVE_KEY)!;
    expect(readManagerSave(raw)!.state).toEqual(settled);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    unmount(); const restored = renderHook(() => useAussieRulesManager());
    expect(restored.result.current.state).toEqual(settled); expect(writes).not.toHaveBeenCalled(); expect(outward.record).not.toHaveBeenCalled();
    act(() => { expect(restored.result.current.dispatch({ type: 'play', tactic: 'control' })).toBe(false); });
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw); expect(writes).not.toHaveBeenCalled();
  });

  it('records the actual completed league once with undefined score, keeps restored finishes quiet and permits a new season', () => {
    const { result, unmount } = renderHook(() => useAussieRulesManager());
    act(() => { result.current.start(792, 'club-2'); });
    const finish = () => {
      for (let round = 0; round < 10; round += 1) {
        result.current.dispatch({ type: 'prepare', choice: round % 2 ? 'rest' : 'train' });
        for (let quarter = 0; quarter < 4; quarter += 1) {
          result.current.dispatch({ type: 'play', tactic: 'control' });
          if (quarter < 3) result.current.dispatch({ type: 'next' });
        }
        result.current.dispatch({ type: 'next' });
      }
    };
    act(finish);
    expect(result.current.state!.phase).toBe('complete'); expect(result.current.state!.results).toHaveLength(30);
    expect(outward.record).toHaveBeenCalledTimes(1); expect(outward.record).toHaveBeenCalledWith('/aussie-rules-manager', undefined, 'Fixture manager', 0);
    const raw = localStorage.getItem(SAVE_KEY)!;
    act(() => { expect(result.current.dispatch({ type: 'next' })).toBe(false); });
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw); expect(outward.record).toHaveBeenCalledTimes(1);
    unmount(); const restored = renderHook(() => useAussieRulesManager());
    expect(restored.result.current.state!.phase).toBe('complete'); expect(outward.record).toHaveBeenCalledTimes(1);
    act(() => { restored.result.current.start(793, 'club-2'); });
    act(() => {
      for (let round = 0; round < 10; round += 1) {
        restored.result.current.dispatch({ type: 'prepare', choice: 'rest' });
        for (let quarter = 0; quarter < 4; quarter += 1) { restored.result.current.dispatch({ type: 'play', tactic: 'direct' }); if (quarter < 3) restored.result.current.dispatch({ type: 'next' }); }
        restored.result.current.dispatch({ type: 'next' });
      }
    });
    expect(outward.record).toHaveBeenCalledTimes(2);
  });

  it('fails closed on invalid saves and keeps valid in-memory play when storage refuses writes', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, seed: 3, clubId: 'club-0', actions: [{ type: 'play', tactic: 'control' }] }));
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Fixture private browser'); });
    const { result } = renderHook(() => useAussieRulesManager());
    expect(result.current.state).toBeNull();
    act(() => { expect(result.current.start(3, 'club-0')).toBe(true); result.current.dispatch({ type: 'prepare', choice: 'rest' }); result.current.dispatch({ type: 'play', tactic: 'control' }); });
    expect(result.current.state!.phase).toBe('break'); expect(result.current.state!.match!.quarter).toBe(1);
    expect(typeof result.current.storageNotice).toBe('string'); expect(result.current.storageNotice).toMatch(/could not save/);
    expect(writes).toHaveBeenCalledTimes(3); expect(outward.record).not.toHaveBeenCalled();
    act(() => result.current.reset()); expect(result.current.state).toBeNull(); expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });
});
