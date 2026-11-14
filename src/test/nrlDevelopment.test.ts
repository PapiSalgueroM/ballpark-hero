import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractOffer, nrlDevelopmentAffected, readNrlCareerSave, reduceNrlCareer,
  type NrlCareerState, type NrlDevelopmentFocus,
} from '@/lib/nrlCareer';
import { createNrlSeason } from '@/lib/nrlManager';

const open = () => createNrlCareer('panthers', 1, 2026);
const focus = (career: NrlCareerState, option: NrlDevelopmentFocus) =>
  reduceNrlCareer(career, { type: 'setDevelopmentFocus', focus: option });
const next = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'startNextSeason' });
const save = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));
function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

describe('NRL development focus', () => {
  it('saves a choice without changing current play and can restore exact Balanced bytes', () => {
    const state = open();
    const chosen = focus(state, 'youth');
    expect(chosen?.developmentFocus).toBe('youth');
    expect(chosen.season).toBe(state.season);
    expect(chosen.players).toBe(state.players);
    expect(chosen.finance).toBe(state.finance);
    expect(save(chosen)).toStrictEqual(chosen);
    expect(focus(chosen, 'youth')).toBe(chosen);
    expect(JSON.stringify(focus(chosen, 'balanced'))).toBe(JSON.stringify(state));
    const paused = reduceNrlCareer(reduceNrlCareer(state, { type: 'advance' }), { type: 'startLive' });
    expect(paused.season.live).toBeDefined();
    expect(focus(paused, 'veterans')).toBe(paused);
    const old = readNrlCareerSave(JSON.stringify(createNrlSeason('panthers', 1)))!;
    expect(focus(old, 'veterans')).toBe(old);
    expect(focus(next(finish(old)), 'veterans').developmentFocus).toBe('veterans');
  });

  it.each(['youth', 'veterans'] as const)('applies %s once to returning players and reports only actual rating effects', option => {
    const opened = open();
    const signing = nrlCareerMarket(opened).find(entry => entry.kind === 'rival' && entry.player.age <= 23
      && nrlContractOffer(opened, entry.player.id, entry.askingSalary, 1).ok)!;
    const recruited = reduceNrlCareer(opened, { type: 'offerContract', playerId: signing.player.id, salary: signing.askingSalary, years: 1 });
    let chosen = focus(recruited, option);
    let normal = recruited;
    const ownMatches = (career: NrlCareerState) => career.season.results.filter(match => !match.finalsRound
      && (match.homeId === 'panthers' || match.awayId === 'panthers')).length;
    while (!nrlDevelopmentAffected(chosen) && chosen.season.phase === 'regular') {
      chosen = reduceNrlCareer(chosen, { type: 'advance' });
      normal = reduceNrlCareer(normal, { type: 'advance' });
    }
    const affected = chosen.ratingReview?.focus ?? [];
    expect(affected.length).toBeGreaterThan(0);
    expect(affected).not.toContain(signing.player.id);
    if (option === 'youth') expect(ownMatches(chosen)).toBe(21);
    for (const id of affected) {
      const player = chosen.players.find(row => row.id === id)!;
      const standard = normal.players.find(row => row.id === id)!;
      expect(player.contract?.clubId).toBe('panthers');
      expect(player.futureContract?.clubId === 'panthers' || player.contract!.endYear >= 2027).toBe(true);
      expect(option === 'youth' ? player.age <= 23 : player.age >= 29).toBe(true);
      expect(player.rating).toBe(standard.rating + 1);
    }
    expect(focus(chosen, 'balanced')).toBe(chosen);
    expect(save(chosen)).toEqual(chosen);
    const complete = finish(chosen);
    const trained = next(save(complete)!);
    const oldRatings = new Map(complete.players.map(player => [player.id, player.rating]));
    expect(trained.players.every(player => !oldRatings.has(player.id) || oldRatings.get(player.id) === player.rating)).toBe(true);
    expect(trained.history[0].development).toEqual({ focus: option, affected: nrlDevelopmentAffected(complete) });
    expect(trained.developmentFocus).toBeUndefined();
    expect(trained.ratingReview).toBeUndefined();
    expect(next(trained)).toBe(trained);
    expect(JSON.stringify(save(trained))).toBe(JSON.stringify(trained));
    expect(next(finish(trained)).history.map(row => row.development)).toEqual([trained.history[0].development, undefined]);
  });

  it('reports zero affected players if youth already reached their potential', () => {
    const state = open();
    const capped = {
      ...state,
      players: state.players.map(player => player.contract?.clubId === 'panthers' && player.age <= 23
        ? { ...player, potential: player.rating } : player),
    };
    const chosen = focus(capped, 'youth');
    const complete = finish(chosen);
    expect(complete.developmentFocus).toBe('youth');
    expect(nrlDevelopmentAffected(complete)).toBe(0);
    const trained = next(complete);
    expect(nrlCareerCap(trained)).toEqual(nrlCareerCap(next(finish(capped))));
    expect(trained.players).toEqual(next(finish(capped)).players);
    expect(trained.history[0].development).toEqual({ focus: 'youth', affected: 0 });
  });

  it('rejects an unknown selection, out-of-range receipt or growth attached before rollover', () => {
    const state = open();
    expect(focus(state, 'invalid' as NrlDevelopmentFocus)).toBe(state);
    expect(readNrlCareerSave(JSON.stringify({ ...state, developmentFocus: 'invalid' }))).toBeNull();
    const complete = finish(state);
    const receipt = { ...complete.history[0], development: { focus: 'youth', affected: 2 } } as const;
    expect(save({ ...complete, history: [receipt] })).toBeNull();
    const rolled = next(complete);
    expect(save({ ...rolled, history: [{ ...receipt, development: { focus: 'youth', affected: 31 } }] })).toBeNull();
  });
});
