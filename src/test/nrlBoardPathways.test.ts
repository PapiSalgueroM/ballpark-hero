import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlBoardPathwaysQuote, nrlCareerCap, nrlCareerFinance, readNrlCareerSave, reduceNrlCareer, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlBoardPathwaysProgress } from '@/lib/nrlBoardTarget';
import { createNrlSeason, nrlBench, nrlNextRound, nrlRegularRounds } from '@/lib/nrlManager';

const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
const accept = (career: NrlCareerState) => reduceNrlCareer(career, {
  type: 'acceptBoardPathways', year: career.season.year, clubId: career.season.clubId,
});
const read = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));

function until(career: NrlCareerState, predicate: (state: NrlCareerState) => boolean) {
  while (!predicate(career)) career = advance(career);
  return career;
}

const atLastRegular = (career: NrlCareerState) => until(career, ({ season }) => season.round === nrlRegularRounds(season.year));
const finish = (career: NrlCareerState) => until(career, ({ season }) => season.phase === 'complete');

function ageOnly(career: NrlCareerState, ids: string[]) {
  return { ...career, players: career.players.map(player => career.season.squad.some(member => member.id === player.id)
    ? { ...player, age: ids.includes(player.id) ? 23 : 24 } : player) };
}

describe('NRL board pathways', () => {
  it.each([[2026, 'storm'], [2027, 'bears']] as const)('accepts only before round one is played in %s', (year, clubId) => {
    const original = createNrlCareer(clubId, 39, year);
    expect(JSON.stringify(read(original))).toBe(JSON.stringify(original));
    expect(nrlBoardPathwaysQuote(original)).toMatchObject({ accepted: false, reason: null, bonus: 200_000 });
    const agreed = accept(original);
    expect(agreed.finance.pathways).toEqual({});
    expect(agreed.season).toBe(original.season);
    expect(nrlCareerFinance(agreed).cash).toBe(nrlCareerFinance(original).cash);
    expect(nrlCareerCap(agreed)).toEqual(nrlCareerCap(original));
    expect(accept(agreed)).toBe(agreed);
    expect(read(agreed)).toEqual(agreed);
    const second = advance(original);
    expect(accept(second)).toBe(second);
    expect(reduceNrlCareer(original, { type: 'acceptBoardPathways', year: year - 1, clubId })).toBe(original);
    expect(reduceNrlCareer(original, { type: 'acceptBoardPathways', year, clubId: 'chiefs' })).toBe(original);
    const short = ageOnly(original, Object.values(original.season.lineup).slice(0, 2));
    expect(nrlBoardPathwaysQuote(short).reason).toMatch(/three eligible/);
    expect(accept(short)).toBe(short);
    expect(read({ ...short, finance: { ...short.finance, pathways: {} } })).toBeNull();
  });

  it('counts players who actually appeared, excludes byes and finals, and closes on live kickoff', () => {
    const original = createNrlCareer('storm', 39, 2026);
    expect(nrlNextRound(original.season).clubMatch).toBeDefined();
    const live = reduceNrlCareer(original, { type: 'startLive' });
    expect(live.season.live).toBeDefined();
    expect(accept(live)).toBe(live);
    const career = ageOnly(original, [...Object.values(original.season.lineup), ...nrlBench(original.season)]);
    const played = advance(accept(career));
    const game = played.season.results.find(result => result.homeId === 'storm' || result.awayId === 'storm')!;
    expect(game.benchUsed).toHaveLength(4);
    const rowById = new Map(nrlBoardPathwaysProgress(played.season, played.players).map(row => [row.id, row.apps]));
    for (const id of game.playerScoring!.starters) expect(rowById.get(id)).toBe(1);
    for (const id of nrlBench(career.season)) expect(rowById.get(id)).toBe(Number(game.benchUsed!.includes(id)));
    const beforeBye = until(played, ({ season }) => nrlNextRound(season).clubStatus === 'bye');
    const bye = advance(beforeBye);
    expect(nrlBoardPathwaysProgress(bye.season, bye.players)).toEqual(nrlBoardPathwaysProgress(beforeBye.season, beforeBye.players));
    const finalsOnly = { ...played.season, results: played.season.results.map(result => ({ ...result, finalsRound: 1 })) };
    expect(nrlBoardPathwaysProgress(finalsOnly, played.players).every(row => row.apps === 0)).toBe(true);
    const legacy = readNrlCareerSave(JSON.stringify(createNrlSeason('storm', 39)))!;
    expect(accept(legacy)).toBe(legacy);
    expect(read({ ...legacy, finance: { ...legacy.finance, pathways: {} } })).toBeNull();
  });

  it('pays the original club exactly once at the regular-season close and verifies the receipt', () => {
    const original = createNrlCareer('storm', 39, 2026);
    const ordinary = atLastRegular(original);
    const agreed = atLastRegular(accept(original));
    const eligible = nrlBoardPathwaysProgress(agreed.season, agreed.players).filter(row => row.apps >= 4);
    expect(eligible.length).toBeGreaterThanOrEqual(3);
    expect(agreed.finance.pathways).toEqual({});
    expect(nrlCareerFinance(agreed).cash).toBe(nrlCareerFinance(ordinary).cash);
    const forged = { ...agreed, finance: { ...agreed.finance, pathways: { earnedBy: eligible.slice(0, 3).map(row => row.id).sort() } } };
    expect(read(forged)).toBeNull();
    const finals = advance(agreed);
    const standardFinals = advance(ordinary);
    expect(finals.season).toEqual(standardFinals.season);
    expect(finals.finance.pathways?.earnedBy).toHaveLength(3);
    expect(nrlCareerFinance(finals).cash - nrlCareerFinance(standardFinals).cash).toBe(200_000);
    expect(read(finals)).toEqual(finals);
    expect(read({ ...finals, finance: { ...finals.finance, pathways: {} } })).toBeNull();
    const closed = finish(finals);
    const standardClosed = finish(standardFinals);
    expect(nrlCareerFinance(closed).cash - nrlCareerFinance(standardClosed).cash).toBe(200_000);
    expect(closed.history[0].finance?.pathways).toEqual(finals.finance.pathways);
    expect(read(closed)).toEqual(closed);
    const moved = reduceNrlCareer(closed, { type: 'startNextSeason', move: { fromYear: 2026, clubId: 'bears' } });
    expect(moved.finance.pathways).toBeUndefined();
    expect(moved.finance.openingCash).toBe(2_500_000);
    expect(read(moved)).toEqual(moved);
    const receipt = moved.history[0];
    const corruptBook = nrlCareerFinance({ finance: { ...receipt.finance!, pathways: { earnedBy: ['missing-a', 'missing-b', 'missing-c'] } } });
    expect(read({ ...moved, history: [{ ...receipt, finance: corruptBook }] })).toBeNull();
  });

  it('keeps a missed objective in the season record without bonus or board penalty', () => {
    const original = createNrlCareer('storm', 39);
    const outside = original.season.squad.filter(player => !Object.values(original.season.lineup).includes(player.id)
      && !nrlBench(original.season).includes(player.id)).slice(0, 3).map(player => player.id);
    const youngOutside = ageOnly(original, outside);
    const agreed = accept(youngOutside);
    expect(agreed.finance.pathways).toEqual({});
    const closed = finish(agreed);
    const ordinary = finish(youngOutside);
    expect(closed.finance.pathways).toEqual({});
    expect(closed.history[0].finance?.pathways).toEqual({});
    expect(nrlCareerFinance(closed).cash).toBe(nrlCareerFinance(ordinary).cash);
    expect(closed.season).toEqual(ordinary.season);
    expect(read(closed)).toEqual(closed);
    const next = reduceNrlCareer(closed, { type: 'startNextSeason' });
    expect(next.finance.pathways).toBeUndefined();
  });
});
