import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLUBS, clubOf, createLeague, draftPool, LEGACY_SAVE_KEY, pickRefusal, picksLeft, readLeagueSave, reduceLeague, retirees, roleDeficits, SAVE_KEY, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { useAussieRulesLeague } from '@/hooks/useAussieRulesLeague';
import { automaticLineup } from '@/lib/aussieRulesManager';
import { hashLabel, rngFrom } from '@/lib/careerEngine';

const outward = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: outward.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: outward.record, getCurrentPlayerName: () => 'Fixture manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const bot = (s: LeagueState): LeagueAction => s.phase === 'prepare' ? (s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' })
  : s.phase === 'quarter' || s.phase === 'break' ? { type: 'playMatch', tactic: 'control' }
  : s.phase === 'draft' && s.draft!.at < s.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
const until = (s: LeagueState, done: (s: LeagueState) => boolean) => { let state = s; for (let n = 0; !done(state) && n < 5000; n += 1) state = reduceLeague(state, bot(state)); return state; };
const V1_SAVE = JSON.stringify({ version: 1, seed: 1234567, clubId: 'club-0', actions: [] });

describe('Aussie Rules Manager full season engine', () => {
  it('carries the exact selected 23 against the seeded automatic reset and can switch back', () => {
    const initial = createLeague(1, 'club-00', 'afl2026')!;
    const authored = [...initial.starters];
    expect([...initial.starters, ...initial.bench]).not.toContain('p-3');
    authored[0] = 'p-3';
    const selected = reduceLeague(initial, { type: 'lineup', starters: authored, bench: initial.bench });
    expect(selected.starters).toEqual(authored);
    const saved = reduceLeague(selected, { type: 'keepLineup' });
    const restored = readLeagueSave(JSON.stringify(saved))!;
    expect(restored).toEqual(saved);
    expect(reduceLeague(restored, { type: 'keepLineup' })).toBe(restored);
    const duplicate = JSON.parse(JSON.stringify(restored));
    duplicate.preferredLineup.bench[0] = 'p-3';
    expect(readLeagueSave(JSON.stringify(duplicate))).toBeNull();
    const play = (state: LeagueState) => reduceLeague(reduceLeague(state, { type: 'prepare', choice: 'rest' }), { type: 'playMatch', tactic: 'control' });
    const report = play(restored);
    expect(reduceLeague(report, { type: 'autoLineup' })).toBe(report);
    const match = report.match!;
    expect(match.homeId === report.myClub ? match.homeSquad : match.awaySquad).toContain('p-3');
    const kept = reduceLeague(report, { type: 'next' });
    expect(kept.starters).toEqual(authored);
    expect(kept.bench).toEqual(initial.bench);
    const automatic = reduceLeague(play(selected), { type: 'next' });
    expect(automatic.starters).not.toContain('p-3');
    expect(automatic.bench).not.toContain('p-3');
    const reset = reduceLeague(kept, { type: 'autoLineup' });
    expect(reset).toEqual(automatic);
  });

  it('rejects preferred slots assigned to another club or the wrong known position', () => {
    const initial = createLeague(1, 'club-00', 'afl2026')!;
    const kept = reduceLeague(initial, { type: 'keepLineup' });
    const preferred = kept.preferredLineup!;
    const rival = kept.clubs.find(club => club.id !== kept.myClub)!.players[0];
    const rivalSelection = { ...preferred, bench: [rival.id, ...preferred.bench.slice(1)] };
    expect(readLeagueSave(JSON.stringify({ ...kept, preferredLineup: rivalSelection }))).toBeNull();
    const own = preferred.starters[0];
    const other = preferred.starters.find(slot => slot.role !== own.role)!;
    const wrongRoles = preferred.starters.map(slot => slot === own ? { ...slot, role: other.role }
      : slot === other ? { ...slot, role: own.role } : slot);
    expect(readLeagueSave(JSON.stringify({ ...kept, preferredLineup: { ...preferred, starters: wrongRoles } }))).toBeNull();
  });

  it('fills only unavailable preference slots when opening a match', () => {
    const initial = createLeague(1, 'club-00', 'afl2026')!;
    const kept = reduceLeague(initial, { type: 'keepLineup' });
    const played = until(kept, state => state.phase === 'report');
    const missing = [initial.starters[0], initial.bench[4]];
    const club = clubOf(played, played.myClub)!;
    const replacements = missing.map((id, index) => ({ ...club.players.find(player => player.id === id)!, id: `p-${played.nextId + index}` }));
    const updated = { ...played, nextId: played.nextId + replacements.length,
      clubs: played.clubs.map(current => current.id === club.id
        ? { ...current, players: current.players.filter(player => !missing.includes(player.id)).concat(replacements) } : current) };
    const opened = reduceLeague(updated, { type: 'next' });
    expect(readLeagueSave(JSON.stringify(opened))).toEqual(opened);
    expect(opened.starters.slice(1)).toEqual(initial.starters.slice(1));
    expect(opened.bench.slice(0, 4)).toEqual(initial.bench.slice(0, 4));
    const starters = clubOf(opened, opened.myClub)!.players;
    expect(starters.find(player => player.id === opened.starters[0])?.role).toBe(replacements[0].role);
    expect(new Set([...opened.starters, ...opened.bench]).size).toBe(23);
    for (const id of missing) expect([...opened.starters, ...opened.bench]).not.toContain(id);
  });

  it('keeps a preferred 23 through a finals bye and starts the next season on automatic', () => {
    const initial = createLeague(3, 'club-00', 'afl2026')!;
    const late = until(initial, state => state.round === 22 && state.phase === 'prepare');
    const kept = reduceLeague(late, { type: 'keepLineup' });
    const bye = until(kept, state => state.stage === 'finals' && state.phase === 'prepare' && !state.match);
    expect(bye.stage).toBe('finals');
    expect(bye.match).toBeNull();
    expect(bye).toMatchObject(automaticLineup(clubOf(bye, bye.myClub)!));
    const reloaded = readLeagueSave(JSON.stringify(bye))!;
    const nextMatch = until(reloaded, state => state.season !== 1 || (state.stage === 'finals' && state.phase === 'prepare' && !!state.match));
    expect(nextMatch.season).toBe(1);
    expect(nextMatch.match).not.toBeNull();
    expect(nextMatch.starters).toEqual(late.starters);
    expect(nextMatch.bench).toEqual(late.bench);
    const newSeason = until(nextMatch, state => state.season === 2);
    expect(newSeason).toMatchObject(automaticLineup(clubOf(newSeason, newSeason.myClub)!));
    expect(newSeason).not.toHaveProperty('preferredLineup');
    expect(readLeagueSave(JSON.stringify(newSeason))).toEqual(newSeason);
  });

  it('starts 18 fixed clubs of 36 generated players with unique names and a readable save', () => {
    const state = createLeague(2026, 'club-04')!;
    expect(state.clubs.map(club => club.id)).toEqual(CLUBS.map(club => club.id));
    expect(state.clubs.every(club => club.players.length === 36)).toBe(true);
    const names = state.clubs.flatMap(club => club.players.map(player => player.name));
    expect(new Set(names).size).toBe(648);
    expect(state.clubName).toBe(`${CLUBS[4].place} ${CLUBS[4].nickname}`);
    expect(readLeagueSave(JSON.stringify(state))).toEqual(state);
    expect(createLeague(2026, 'club-18')).toBeNull();
  });

  it('reads back a real save in every phase of a season and refuses forged ones', () => {
    let state = createLeague(77, 'club-12')!;
    const phases = new Set<string>();
    for (let n = 0; state.season === 1 && n < 5000; n += 1) {
      expect(readLeagueSave(JSON.stringify(state))).toEqual(state);
      phases.add(state.phase);
      state = reduceLeague(state, bot(state));
    }
    expect([...phases].sort()).toEqual(['draft', 'prepare', 'quarter', 'report', 'seasonOver', 'summer']);
    const forged = JSON.parse(JSON.stringify(state));
    forged.clubs[0].players[0].skill = forged.clubs[0].players[0].potential + 1;
    expect(readLeagueSave(JSON.stringify(forged))).toBeNull();
    expect(readLeagueSave(JSON.stringify({ ...state, version: 1 }))).toBeNull();
  }, 60000); // a whole season of save round trips took 8.2 s on a loaded machine, past the 5 s default

  it('makes exactly one new selection when the normal draft has zero picks', () => {
    const completed = until(createLeague(19, 'club-04', 'afl2026')!, state => state.phase === 'seasonOver');
    const summer = reduceLeague(completed, { type: 'next' });
    const original = clubOf(summer, summer.myClub)!.players;
    const player = original[0];
    const action = { type: 'delist', season: 1, playerId: player.id } as const;
    expect(retirees(summer).size).toBe(0);
    expect(reduceLeague(completed, action)).toBe(completed);
    expect(reduceLeague(summer, { ...action, season: 2 })).toBe(summer);
    const none = reduceLeague(summer, { type: 'next' });
    expect(none.draft?.order).toEqual([]);
    expect(none.history[0].delisted).toBeUndefined();
    expect(readLeagueSave(JSON.stringify(none))).toEqual(none);

    const agreed = reduceLeague(summer, action);
    expect(agreed.history[0].delisted).toEqual({ playerId: player.id, playerName: player.name, role: player.role, picksBefore: 0 });
    expect(agreed.clubs).toBe(summer.clubs);
    expect(agreed.draft).toBeNull();
    expect(reduceLeague(agreed, { ...action, playerId: original[1].id })).toBe(agreed);
    const refused = { ...agreed, history: [{ ...agreed.history[0], delisted: {
      ...agreed.history[0].delisted!, playerId: clubOf(agreed, 'club-05')!.players[0].id,
    } }] };
    expect(readLeagueSave(JSON.stringify(refused))).toBeNull();
    const restored = readLeagueSave(JSON.stringify(agreed))!;
    expect(restored).toEqual(agreed);
    const draft = reduceLeague(restored, { type: 'next' });
    expect(draft.draft?.order).toEqual([summer.myClub]);
    expect(picksLeft(draft, summer.myClub)).toBe(1);
    expect(clubOf(draft, summer.myClub)!.players).toHaveLength(35);
    expect(clubOf(draft, summer.myClub)!.players.some(candidate => candidate.id === player.id)).toBe(false);
    expect(reduceLeague(draft, action)).toBe(draft);
    expect(readLeagueSave(JSON.stringify(draft))).toEqual(draft);
    const mismatchedDraft = { ...draft, history: [{ ...draft.history[0], delisted: { ...draft.history[0].delisted!, picksBefore: 1 } }] };
    expect(readLeagueSave(JSON.stringify(mismatchedDraft))).toBeNull();
    const next = reduceLeague(reduceLeague(draft, { type: 'draftAuto' }), { type: 'next' });
    expect(next.season).toBe(2);
    expect(clubOf(next, summer.myClub)!.players).toHaveLength(36);
    expect(next.history[0].delisted).toEqual(agreed.history[0].delisted);
    expect(readLeagueSave(JSON.stringify(next))).toEqual(next);
  });

  it('reserves a replacement for a delisted player at the role floor', () => {
    const completed = until(createLeague(16, 'club-04', 'afl2026')!, state => state.phase === 'seasonOver');
    const summer = reduceLeague(completed, { type: 'next' });
    const retiring = retirees(summer);
    const returningRucks = clubOf(summer, summer.myClub)!.players.filter(player => player.role === 'ruck' && !retiring.has(player.id));
    expect(returningRucks).toHaveLength(2);
    const action = { type: 'delist', season: 1, playerId: returningRucks[0].id } as const;
    const alreadyRetiring = clubOf(summer, summer.myClub)!.players.find(player => retiring.has(player.id))!;
    expect(reduceLeague(summer, { ...action, playerId: alreadyRetiring.id })).toBe(summer);
    const before = reduceLeague(summer, { type: 'next' });
    let draft = reduceLeague(reduceLeague(summer, action), { type: 'next' });
    expect(picksLeft(draft, summer.myClub)).toBe(picksLeft(before, summer.myClub) + 1);
    expect(roleDeficits(clubOf(draft, summer.myClub)!).ruck).toBe(1);
    while (picksLeft(draft, summer.myClub) > 1) {
      const prospect = draftPool(draft).find(player => player.role !== 'ruck' && !pickRefusal(draft, player.id));
      expect(prospect).toBeDefined();
      const changed = reduceLeague(draft, { type: 'pick', prospectId: prospect!.id });
      expect(changed).not.toBe(draft);
      draft = changed;
    }
    const wrong = draftPool(draft).find(player => player.role !== 'ruck')!;
    expect(pickRefusal(draft, wrong.id)).toMatch(/ruck/i);
    expect(reduceLeague(draft, { type: 'pick', prospectId: wrong.id })).toBe(draft);
    expect(readLeagueSave(JSON.stringify(draft))).toEqual(draft);
    const final = reduceLeague(draft, { type: 'draftAuto' });
    expect(roleDeficits(clubOf(final, summer.myClub)!)).toEqual({ defender: 0, midfielder: 0, ruck: 0, forward: 0 });
    expect(clubOf(final, summer.myClub)!.players).toHaveLength(36);
  });

  it('spends the old rating budget one point at a time before summer, through both play modes', () => {
    const opening = createLeague(77, 'club-12', 'afl2026')!;
    const ratings = (state: LeagueState) => state.clubs.flatMap(club => club.players.map(player => player.skill));
    let quick = opening;
    let stepwise = opening;
    let up = 0;
    let down = 0;
    let quiet = 0;
    while (quick.stage === 'homeAway') {
      const prepared = reduceLeague(quick, { type: 'prepare', choice: 'rest' });
      const before = ratings(prepared);
      const ownBefore = new Map(prepared.clubs.find(club => club.id === prepared.myClub)!.players.map(player => [player.id, player.skill]));
      stepwise = reduceLeague(stepwise, { type: 'prepare', choice: 'rest' });
      for (let quarter = 0; quarter < 4; quarter++) {
        stepwise = reduceLeague(stepwise, { type: 'play', tactic: 'control' });
        if (quarter < 3) {
          expect(ratings(stepwise)).toEqual(before);
          expect(stepwise.skillReviews).toEqual(quick.skillReviews);
          stepwise = reduceLeague(stepwise, { type: 'next' });
        }
      }
      const report = reduceLeague(prepared, { type: 'playMatch', tactic: 'control' });
      expect(stepwise).toEqual(report);
      const changes = report.clubs.find(club => club.id === report.myClub)!.players.flatMap(player => {
        const skill = ownBefore.get(player.id)!;
        return player.skill === skill ? [] : [[player.id, skill, player.skill]];
      });
      expect(report.skillReviews).toHaveLength(report.round + 1);
      expect(report.skillReviews?.at(-1)).toEqual({ round: report.round, changes });
      if (!changes.length) quiet += 1;
      ratings(report).forEach((skill, i) => {
        const delta = skill - before[i];
        expect(Math.abs(delta)).toBeLessThanOrEqual(1);
        if (delta > 0) up++;
        if (delta < 0) down++;
      });
      expect(readLeagueSave(JSON.stringify(report))).toEqual(report);
      quick = reduceLeague(report, { type: 'next' });
      stepwise = reduceLeague(stepwise, { type: 'next' });
    }
    expect(up).toBeGreaterThan(0);
    expect(down).toBeGreaterThan(0);
    expect(quiet).toBeGreaterThan(0);
    const rng = rngFrom(hashLabel(`${opening.seed}|${opening.season}|summer`));
    const oldBudget = opening.clubs.flatMap(club => club.players.map(player => {
      const roll = rng();
      const gain = player.age < 22 ? 2 + Math.floor(roll * 4) : player.age <= 25 ? Math.floor(roll * 4)
        : player.age <= 29 ? -1 + Math.floor(roll * 3) : -(1 + Math.floor(roll * 4));
      return Math.min(player.potential, Math.max(20, player.skill + gain));
    }));
    expect(ratings(quick)).toEqual(oldBudget);

    const completed = until(quick, state => state.phase === 'seasonOver');
    expect(completed.skillReviews).toEqual(quick.skillReviews);
    const summer = reduceLeague(completed, { type: 'next' });
    expect(ratings(summer)).toEqual(ratings(quick));
    expect(summer.clubs[0].players[0].age).toBe(completed.clubs[0].players[0].age + 1);
    const second = until(summer, state => state.season === 2);
    const existing = new Map(summer.clubs.flatMap(club => club.players.map(player => [player.id, player.skill])));
    expect(second.clubs.every(club => club.players.every(player => !existing.has(player.id) || existing.get(player.id) === player.skill))).toBe(true);
    expect(second.ratingReview).toBeUndefined();
    expect(second.skillReviews).toBeUndefined();
    const invalid = { ...quick, ratingReview: { round: 0, changes: [[opening.clubs[0].players[0].id, 1]] } };
    expect(readLeagueSave(JSON.stringify(invalid))).toBeNull();
    for (const skillReviews of [
      [{ round: 23, changes: [] }],
      [{ round: 0, changes: [] }, { round: 0, changes: [] }],
      [{ round: 0, changes: [[opening.clubs[0].players[0].id, 70, 71]] }],
      [{ round: 0, changes: [[opening.clubs[12].players[0].id, 70, 73]] }],
    ]) expect(readLeagueSave(JSON.stringify({ ...quick, skillReviews }))).toBeNull();
  }, 60000);
});

describe('useAussieRulesLeague', () => {
  it('removes the old ten round save on start and writes the whole state after each action', () => {
    localStorage.setItem(LEGACY_SAVE_KEY, V1_SAVE);
    const { result } = renderHook(() => useAussieRulesLeague());
    expect(result.current.state).toBeNull();
    act(() => { expect(result.current.start(99, 'club-02')).toBe(true); });
    expect(localStorage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    act(() => { expect(result.current.dispatch({ type: 'prepare', choice: 'rest' })).toBe(true); });
    expect(readLeagueSave(localStorage.getItem(SAVE_KEY))).toEqual(result.current.state);
    act(() => { expect(result.current.dispatch({ type: 'prepare', choice: 'rest' })).toBe(false); });
  });

  it('records one completion for each finished season and stays quiet when a finished season is restored', () => {
    const { result, unmount } = renderHook(() => useAussieRulesLeague());
    act(() => { result.current.start(31, 'club-07'); });
    const play = (done: (s: LeagueState) => boolean) => { for (let n = 0; !done(result.current.state!) && n < 5000; n += 1) act(() => { result.current.dispatch(bot(result.current.state!)); }); };
    play(s => s.phase === 'seasonOver');
    expect(outward.record).toHaveBeenCalledTimes(1);
    expect(outward.record).toHaveBeenCalledWith('/aussie-rules-manager', undefined, 'Fixture manager', 0);
    unmount();
    const restored = renderHook(() => useAussieRulesLeague());
    expect(restored.result.current.state!.phase).toBe('seasonOver');
    expect(outward.record).toHaveBeenCalledTimes(1);
    const again = restored.result;
    for (let n = 0; !(again.current.state!.season === 2 && again.current.state!.phase === 'seasonOver') && n < 5000; n += 1) act(() => { again.current.dispatch(bot(again.current.state!)); });
    expect(outward.record).toHaveBeenCalledTimes(2);
  });

  it('keeps playing in memory with a notice when storage refuses writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useAussieRulesLeague());
    act(() => { result.current.start(5, 'club-00'); });
    expect(result.current.state).not.toBeNull();
    expect(result.current.storageNotice).toMatch(/could not save/);
    act(() => { result.current.dispatch({ type: 'prepare', choice: 'train' }); });
    expect(result.current.state!.phase).toBe('quarter');
  });

  it('refuses an unreadable save whole, says so and leaves it in place', () => {
    const state = until(createLeague(8, 'club-09')!, s => s.round === 2);
    const broken = JSON.parse(JSON.stringify(state));
    broken.clubs[3].players.pop();
    localStorage.setItem(SAVE_KEY, JSON.stringify(broken));
    const { result } = renderHook(() => useAussieRulesLeague());
    expect(result.current.state).toBeNull();
    expect(result.current.storageNotice).toMatch(/could not be read/);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(broken));
  });
});
