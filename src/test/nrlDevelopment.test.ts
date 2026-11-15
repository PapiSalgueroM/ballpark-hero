import { describe, expect, it, vi } from 'vitest';
import * as random from '@/lib/careerEngine';
import {
  createNrlCareer, nrlCareerCap, nrlCareerMarket, nrlContractOffer, nrlDevelopmentAffected, readNrlCareerSave, reduceNrlCareer,
  nrlYouthFocusProgress, type NrlCareerState, type NrlDevelopmentFocus,
} from '@/lib/nrlCareer';
import { createNrlSeason, nrlNextRound, nrlStarterOptions, nrlUnavailable } from '@/lib/nrlManager';

const open = () => createNrlCareer('panthers', 1, 2026);
const focus = (career: NrlCareerState, option: NrlDevelopmentFocus) =>
  reduceNrlCareer(career, { type: 'setDevelopmentFocus', focus: option });
const next = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'startNextSeason' });
const save = (career: NrlCareerState) => readNrlCareerSave(JSON.stringify(career));
const advance = (career: NrlCareerState) => reduceNrlCareer(career, { type: 'advance' });
function finish(career: NrlCareerState) {
  while (career.season.phase !== 'complete') career = reduceNrlCareer(career, { type: 'advance' });
  return career;
}

const hooker = 'storm-9-1';
const hookerRating = (state: NrlCareerState) => state.players.find(player => player.id === hooker)!.rating;
const stormMatches = (state: NrlCareerState) => state.season.results.filter(match => match.homeId === 'storm' || match.awayId === 'storm');

function chooseHooker(state: NrlCareerState, selected: boolean) {
  if (!nrlNextRound(state.season).clubMatch) return state;
  const player = nrlStarterOptions(state.season, 'Hooker').find(option => (option.id === hooker) === selected)!;
  const starting = reduceNrlCareer(state, { type: 'selectStarter', role: 'Hooker', playerId: player.id });
  const { season } = starting;
  const slot = season.bench!.indexOf(hooker);
  if (selected || slot === -1) return starting;
  const unavailable = nrlUnavailable(season);
  const spare = season.squad.find(({ id }) => !unavailable.has(id) && !Object.values(season.lineup).includes(id) && !season.bench!.includes(id))!;
  return reduceNrlCareer(starting, { type: 'selectBench', slot, playerId: spare.id });
}

describe('NRL development focus', () => {
  it('saves a choice without changing current play and can restore exact Balanced bytes', () => {
    const state = open();
    const chosen = focus(state, 'youth');
    expect(chosen?.developmentFocus).toBe('youth');
    expect(chosen.youthFocusRequiresAppearances).toBe(true);
    expect(chosen.season).toBe(state.season);
    expect(chosen.players).toBe(state.players);
    expect(chosen.finance).toBe(state.finance);
    expect(save(chosen)).toStrictEqual(chosen);
    expect(focus(chosen, 'youth')).toBe(chosen);
    expect(JSON.stringify(focus(chosen, 'balanced'))).toBe(JSON.stringify(state));
    expect(focus(chosen, 'veterans')).not.toHaveProperty('youthFocusRequiresAppearances');
    const paused = reduceNrlCareer(reduceNrlCareer(state, { type: 'advance' }), { type: 'startLive' });
    expect(paused.season.live).toBeDefined();
    expect(focus(paused, 'veterans')).toBe(paused);
    const old = readNrlCareerSave(JSON.stringify(createNrlSeason('panthers', 1)))!;
    expect(focus(old, 'veterans')).toBe(old);
    expect(focus(next(finish(old)), 'veterans').developmentFocus).toBe('veterans');
  });

  it.each([false, true])('requires four actually used selections including the review match (%s)', useHooker => {
    const initial = createNrlCareer('storm', 1, 2026);
    let standard = initial;
    let youth = focus(initial, 'youth');
    let old = save({ ...initial, developmentFocus: 'youth' })!;
    let byes = 0;
    while (youth.season.round < 23) {
      const selected = useHooker && youth.season.round <= 3;
      const before = nrlYouthFocusProgress(youth)!;
      const bye = !nrlNextRound(youth.season).clubMatch;
      standard = advance(chooseHooker(standard, selected));
      youth = advance(chooseHooker(youth, selected));
      old = advance(chooseHooker(old, selected));
      expect(stormMatches(youth)).toEqual(stormMatches(standard));
      expect(stormMatches(old)).toEqual(stormMatches(standard));
      expect(nrlDevelopmentAffected(youth)).toBe(0);
      expect(nrlYouthFocusProgress(youth)!.played).toBe(before.played + Number(!bye));
      if (bye) {
        expect(nrlYouthFocusProgress(save(youth)!)).toEqual(before);
        byes++;
      }
    }
    expect(byes).toBe(2);
    const progress = nrlYouthFocusProgress(save(youth)!)!;
    expect(progress).toMatchObject({ played: 20, tracked: 20 });
    expect(progress.rows.find(({ id }) => id === hooker)?.apps).toBe(useHooker ? 3 : 0);
    const chosen = chooseHooker(youth, useHooker);
    const neutral = chooseHooker(standard, useHooker);
    const rng = vi.spyOn(random, 'rngFrom');
    try {
      standard = advance(neutral);
      const streams = rng.mock.calls.slice();
      expect(streams.length).toBeGreaterThan(0);
      rng.mockClear();
      youth = advance(chosen);
      expect(rng.mock.calls).toEqual(streams);
    } finally { rng.mockRestore(); }
    old = advance(chooseHooker(old, useHooker));
    expect(nrlYouthFocusProgress(youth)?.played).toBe(21);
    expect(nrlYouthFocusProgress(youth)?.rows).toHaveLength(0);
    expect(stormMatches(youth).filter(match => match.playerScoring?.starters.includes(hooker) || match.benchUsed?.includes(hooker))
      .map(match => match.round)).toEqual(useHooker ? [1, 2, 3, 23] : []);
    expect(stormMatches(youth).map(match => [match.homeScore, match.awayScore])).toEqual(stormMatches(standard).map(match => [match.homeScore, match.awayScore]));
    expect(hookerRating(standard)).toBe(82);
    expect(hookerRating(youth)).toBe(useHooker ? 83 : 82);
    expect(hookerRating(old)).toBe(83);
    expect(youth.ratingReview?.focus?.includes(hooker)).toBe(useHooker);
    expect(save(youth)).toEqual(youth);
    expect(save(old)).toEqual(old);
    if (!useHooker) expect(save({ ...old, youthFocusRequiresAppearances: true })).toBeNull();
  });

  it('credits actual interchange use and treats unused bench spots and missing match sheets separately', () => {
    const original = focus(createNrlCareer('storm', 1, 2026), 'youth');
    const onBench = reduceNrlCareer(original, { type: 'selectBench', slot: 5, playerId: hooker });
    expect(onBench.season.bench?.[5]).toBe(hooker);
    const benchMatch = advance(onBench);
    expect(stormMatches(benchMatch)[0].benchUsed).not.toContain(hooker);
    expect(nrlYouthFocusProgress(benchMatch)?.rows.find(({ id }) => id === hooker)?.apps).toBe(0);
    const earlyBench = reduceNrlCareer(original, { type: 'selectBench', slot: 0, playerId: hooker });
    const usedBench = advance(earlyBench);
    expect(stormMatches(usedBench)[0].playerScoring?.starters).not.toContain(hooker);
    expect(stormMatches(usedBench)[0].benchUsed).toContain(hooker);
    expect(nrlYouthFocusProgress(usedBench)?.rows.find(({ id }) => id === hooker)?.apps).toBe(1);
    const played = advance(chooseHooker(original, true));
    const stripped = { ...played, season: { ...played.season, results: played.season.results.map(match => match.playerScoring
      ? { ...match, playerScoring: undefined, benchUsed: undefined, ratingChanges: undefined } : match) } };
    expect(save(stripped)).toBeNull();
    expect(nrlYouthFocusProgress(played)?.rows.find(({ id }) => id === hooker)?.apps).toBe(1);
    const progress = nrlYouthFocusProgress(stripped)!;
    expect(progress).toMatchObject({ played: 1, tracked: 0 });
    expect(progress.rows.find(({ id }) => id === hooker)?.apps).toBe(0);
    expect(save({ ...original, developmentFocus: 'veterans' })).toBeNull();
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
    expect(trained).not.toHaveProperty('youthFocusRequiresAppearances');
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
