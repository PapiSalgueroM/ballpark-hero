import { describe, expect, it } from 'vitest';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractOffer, nrlDevelopmentPreview, readNrlCareerSave, reduceNrlCareer,
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
    const complete = finish(recruited);
    const standard = next(complete);
    const chosen = focus(complete, option);
    expect(chosen?.developmentFocus).toBe(option);
    const trained = next(save(chosen)!);
    const oldPlayers = new Map(complete.players.map(player => [player.id, player]));
    const standardPlayers = new Map(standard.players.map(player => [player.id, player]));
    const affected = standard.players.filter(player => {
      const prior = oldPlayers.get(player.id);
      return prior?.contract?.clubId === 'panthers' && player.contract?.clubId === 'panthers'
        && (option === 'youth' ? player.age <= 24 && player.rating < player.potential : player.age >= 30 && player.rating < prior.rating);
    });
    expect(affected.length).toBeGreaterThan(0);
    if (option === 'youth') {
      expect(affected.some(player => player.rating === oldPlayers.get(player.id)!.rating)).toBe(true);
    }
    const ids = new Set(affected.map(player => player.id));
    expect(trained.players).toEqual(standard.players.map(player => ids.has(player.id) ? { ...player, rating: player.rating + 1 } : player));
    expect(trained.players.find(player => player.id === signing.player.id)).toEqual(standardPlayers.get(signing.player.id));
    const departed = complete.players.find(player => player.contract?.clubId === 'panthers' && player.age <= 23
      && standardPlayers.has(player.id) && standardPlayers.get(player.id)!.contract?.clubId !== 'panthers')!;
    expect(departed).toBeDefined();
    expect(trained.players.find(player => player.id === departed.id)).toEqual(standardPlayers.get(departed.id));
    const steadyVeteran = complete.players.find(player => player.contract?.clubId === 'panthers' && player.age >= 29
      && standardPlayers.get(player.id)?.contract?.clubId === 'panthers' && standardPlayers.get(player.id)?.rating === player.rating)!;
    expect(steadyVeteran).toBeDefined();
    expect(trained.players.find(player => player.id === steadyVeteran.id)).toEqual(standardPlayers.get(steadyVeteran.id));
    expect(nrlDevelopmentPreview(chosen)).toBe(affected.length);
    expect(trained.history[0].development).toEqual({ focus: option, affected: affected.length });
    expect(trained.developmentFocus).toBeUndefined();
    expect(nrlCareerCap(trained)).toEqual(nrlCareerCap(standard));
    expect(trained.finance).toEqual(standard.finance);
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
    const complete = finish(capped);
    const chosen = focus(complete, 'youth');
    expect(chosen?.developmentFocus).toBe('youth');
    expect(nrlDevelopmentPreview(chosen)).toBe(0);
    const trained = next(chosen);
    expect(trained.players).toEqual(next(complete).players);
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
