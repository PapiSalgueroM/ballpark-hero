import { expect, it } from 'vitest';
import { createLeague, clubOf, readLeagueSave, reduceLeague, summerTradeOffer, summerDelistCandidates, roleDeficits, picksLeft, LIST_SIZE, type LeagueState, type LeagueAction } from '@/lib/aussieRulesLeague';

function until(s: LeagueState, done: (s: LeagueState) => boolean) {
  let state = s;
  for (let i = 0; !done(state) && i < 350; i++) {
    const action: LeagueAction = state.phase === 'prepare' ? state.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' }
      : state.phase === 'quarter' || state.phase === 'break' ? { type: 'playMatch', tactic: 'control' }
      : state.phase === 'draft' && state.draft!.at < state.draft!.order.length ? { type: 'draftAuto' } : { type: 'next' };
    state = reduceLeague(state, action);
  }
  expect(done(state)).toBe(true);
  return state;
}
function resume(s: LeagueState) {
  const text = JSON.stringify(s), loaded = readLeagueSave(text);
  expect(loaded).not.toBeNull();
  expect(JSON.stringify(loaded)).toBe(text);
  return loaded!;
}
const summer = () => until(createLeague(1, 'club-04', 'afl2026', true)!, s => s.phase === 'summer');
const next = { type: 'next' } as const;
function deal(state: LeagueState) {
  const offer = summerTradeOffer(state);
  expect(offer).not.toBeNull();
  return { type: 'tradePick', season: state.season, fromClub: offer!.fromClub, playerId: offer!.player.id, pick: offer!.pick } as const;
}

it('trades a returning player for the original selection and archives who both clubs received across two seasons', () => {
  const start = resume(summer()), action = deal(start);
  const senior = clubOf(start, action.fromClub)!.players.find(p => p.id === action.playerId)!;
  const baseline = resume(reduceLeague(start, next));
  expect(baseline.draft!.order[action.pick - 1]).toBe(start.myClub);
  expect(clubOf(baseline, action.fromClub)!.players).toContainEqual(senior);
  expect(baseline.history.at(-1)).not.toHaveProperty('trade');
  let accepted = resume(reduceLeague(start, action));
  expect(accepted.phase).toBe('draft');
  expect(clubOf(accepted, start.myClub)!.players).toContainEqual(senior);
  expect(clubOf(accepted, action.fromClub)!.players.map(p => p.id)).not.toContain(senior.id);
  const order = [...baseline.draft!.order]; order[action.pick - 1] = action.fromClub;
  expect(accepted.draft!.order).toEqual(order);
  expect(reduceLeague(accepted, action)).toBe(accepted);
  expect(reduceLeague(baseline, action)).toBe(baseline);
  expect(reduceLeague(start, { ...action, pick: action.pick + 1 })).toBe(start);
  expect(reduceLeague(start, { ...action, season: 2 })).toBe(start);
  expect(reduceLeague(start, { ...action, fromClub: start.myClub })).toBe(start);
  expect(reduceLeague(start, { ...action, playerId: clubOf(start, start.myClub)!.players[0].id })).toBe(start);
  accepted = resume(reduceLeague(accepted, { type: 'draftAuto' }));
  const selection = accepted.draft!.made[action.pick - 1];
  const rookie = clubOf(accepted, action.fromClub)!.players.find(p => p.id === selection.prospectId)!;
  expect(selection.clubId).toBe(action.fromClub);
  const trade = accepted.history[0].trade!;
  expect(trade).toEqual({ fromClub: action.fromClub, playerId: senior.id, playerName: senior.name, role: senior.role, pick: action.pick, drafted: { id: rookie.id, name: rookie.name } });
  for (const c of accepted.clubs) {
    expect(c.players).toHaveLength(LIST_SIZE);
    expect(Object.values(roleDeficits(c))).toEqual([0, 0, 0, 0]);
  }
  expect(new Set(accepted.clubs.flatMap(c => c.players.map(p => p.id))).size).toBe(18 * 36);
  const corrupted = structuredClone(accepted);
  corrupted.history[0].trade!.drafted!.id = senior.id;
  expect(readLeagueSave(JSON.stringify(corrupted))).toBeNull();
  const y2 = resume(reduceLeague(accepted, next)), y3 = resume(until(y2, s => s.season === 3));
  expect(y3.history[0].trade).toEqual(trade);
  expect(y3.history[1]).not.toHaveProperty('trade');
  expect(clubOf(y3, y3.myClub)!.players.some(p => p.id === senior.id)).toBe(true);
  expect(reduceLeague(y3, action)).toBe(y3);
}, 30000);

it('reconciles a prior delisting with the original pick and rejects conflicting ownership', () => {
  const before = summer(), delisted = summerDelistCandidates(before)[0];
  const start = resume(reduceLeague(before, { type: 'delist', season: before.season, playerId: delisted.id }));
  const action = deal(start), accepted = resume(reduceLeague(start, action)), baseline = resume(reduceLeague(start, next));
  expect(picksLeft(accepted, start.myClub)).toBe(picksLeft(baseline, start.myClub) - 1);
  const ids = accepted.clubs.flatMap(club => club.players.map(p => p.id));
  expect(ids).not.toContain(delisted.id);
  expect(ids.filter(id => id === action.playerId)).toHaveLength(1);
  expect(accepted.history[0].delisted).toEqual(start.history[0].delisted);
  const tampered = structuredClone(accepted);
  tampered.history[0].trade!.fromClub = start.myClub;
  expect(readLeagueSave(JSON.stringify(tampered))).toBeNull();
  expect(resume(reduceLeague(accepted, { type: 'draftAuto' })).clubs.map(c => c.players.length)).toEqual(Array(18).fill(36));
});
