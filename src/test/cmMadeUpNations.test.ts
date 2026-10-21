/**
 * Round 1520: made up Club Manager players carry a country of their own. The draw (deterministic, keyed, never the
 * main stream), a scouted boy keeping his trip's country, every move in the brief's item 3 and a reload, and an old
 * save gaining the same countries twice. scripts/simCmMadeUpNations.mjs holds the shares, the fleet and the board.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { countNations, drawNation, mapSpelling } from '@/lib/clubManagerMadeUpNations';
import {
  SAVE_KEY, buyPlayer, careerPlace, ensureMadeUpNations, loadCareer, loanOutPlayer, madeUpNationAt, promoteProspect,
  recallLoanedPlayer, releasePlayer, saveCareer, shownNation, startCareer, type CareerState, type MarketPlayer,
} from '@/lib/clubManager';
import { nationalityOf } from '@/data/playerNationalities';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

const COUNT = countNations(['England', 'England', 'France', null, 'Spain', 'France', 'England', 'Brazil'], 'England');

describe('the draw', () => {
  it('counts the known men by country, the home country apart, busiest abroad first', () => {
    expect(COUNT).toEqual({ known: 7, home: 3, abroad: [['France', 2], ['Brazil', 1], ['Spain', 1]] });
  });
  it('is the same for the same man every time, and never takes a number from Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const once = Array.from({ length: 200 }, (_, i) => drawNation(`Unit Man ${i}`, 'England', COUNT));
    const twice = Array.from({ length: 200 }, (_, i) => drawNation(`Unit Man ${i}`, 'England', COUNT));
    expect(twice).toEqual(once);
    expect(spy).not.toHaveBeenCalled();
    expect(new Set(once)).toEqual(new Set(['England', 'France', 'Brazil', 'Spain']));
  });
  it('lands at home at the counted share', () => {
    const n = 4000;
    const home = Array.from({ length: n }, (_, i) => drawNation(`Share Man ${i}`, 'England', COUNT)).filter(x => x === 'England').length;
    expect(Math.abs(home / n - 3 / 7)).toBeLessThan(4 * Math.sqrt((3 / 7) * (4 / 7) / n));
  });
  it('is the home country when there is nothing to count', () => {
    expect(drawNation('Lonely Man', 'Scotland', null)).toBe('Scotland');
    expect(drawNation('Lonely Man', 'Scotland', countNations([null, null], 'Scotland'))).toBe('Scotland');
  });
  it('spells a scouting trip the way the verified map does', () => {
    expect(mapSpelling('Turkey')).toBe('Türkiye');
    expect(mapSpelling('Ivory Coast')).toBe("Cote d'Ivoire");
    expect(mapSpelling('Brazil')).toBe('Brazil');
  });
  it('through the engine: keyed on the man, never the main stream, undefined with no place', () => {
    const s = startCareer('Everton');
    const place = careerPlace(s);
    expect(place).toEqual({ league: 'premier', home: 'England' });
    const spy = vi.spyOn(Math, 'random');
    const a = madeUpNationAt('Engine Man', place, s.eraId);
    expect(madeUpNationAt('Engine Man', place, s.eraId)).toBe(a);
    expect(spy).not.toHaveBeenCalled();
    expect(typeof a).toBe('string');
    expect(madeUpNationAt('Engine Man', null, s.eraId)).toBeUndefined();
  });
});

/** A made up man on the market at a Spanish club, from Japan. */
const listing = (name: string): MarketPlayer => ({ name, club: 'Getafe', position: 'CM', age: 24, rating: 66, price: 2, value: 2, generated: true, nation: 'Japan' });
const find = (s: CareerState, name: string) => [...s.squad, ...(s.loanedOut ?? []).map(l => l.player)].find(p => p.name === name);

describe('it stays with him', () => {
  it('every made up man of a new career carries one, and no real man does', () => {
    const s = startCareer('Everton');
    for (const p of s.squad) {
      if (p.generated || p.isYouth || p.academyGrad) expect(typeof p.nation).toBe('string');
      else { expect(p.nation).toBeUndefined(); expect(shownNation(s.eraId, p)).toBe(nationalityOf(s.eraId, p.name)); }
    }
    for (const f of s.freeAgents ?? []) if (f.generated) expect(typeof f.nation).toBe('string');
  });
  it('a scouted boy keeps his trip\'s country when promoted, a home boy is drawn at home', () => {
    let s: CareerState = startCareer('Everton');
    s.academy!.prospects = [
      { id: 'u1', name: 'Unit Scouted', position: 'CM', age: 17, rating: 58, potential: 80, lowGuess: 70, highGuess: 86, source: 'Turkey', flag: '', fee: 0, season: s.season },
      { id: 'u2', name: 'Unit Home', position: 'CB', age: 17, rating: 58, potential: 80, lowGuess: 70, highGuess: 86, source: 'Academy', flag: '', fee: 0, season: s.season },
    ];
    s = promoteProspect(s, 'u1')!;
    s = promoteProspect(s, 'u2')!;
    expect(find(s, 'Unit Scouted')?.nation).toBe('Türkiye');
    expect(find(s, 'Unit Home')?.nation).toBe(madeUpNationAt('Unit Home', careerPlace(s), s.eraId));
  });
  it('bought, loaned out and back, released, reloaded', () => {
    let s: CareerState = { ...startCareer('Everton'), budget: 500 };
    s = buyPlayer(s, listing('Unit Bought'))!;
    const bought = find(s, 'Unit Bought')!;
    expect(bought).toMatchObject({ generated: true, nation: 'Japan' });
    const out = loanOutPlayer(s, bought.id)!;
    expect(out.loanedOut!.find(l => l.player.name === 'Unit Bought')!.player.nation).toBe('Japan');
    s = recallLoanedPlayer(out, bought.id)!;
    expect(find(s, 'Unit Bought')?.nation).toBe('Japan');
    saveCareer(s);
    const back = loadCareer()!;
    expect(find(back, 'Unit Bought')?.nation).toBe('Japan');
    const freed = releasePlayer(back, bought.id)!;
    expect(freed.freeAgents!.find(f => f.name === 'Unit Bought')).toMatchObject({ generated: true, nation: 'Japan' });
  });
});

describe('an old save', () => {
  it('gains the same countries twice, the ones its home made men had (the harness proves nothing else moves)', () => {
    const s = startCareer('Everton');
    const had = new Map([...s.squad, ...(s.freeAgents ?? [])].filter(p => p.nation).map(p => [p.name, p.nation]));
    expect(had.size).toBeGreaterThan(0);
    const old = JSON.parse(JSON.stringify(s, (k, v) => (k === 'nation' ? undefined : v))) as CareerState;
    const opened: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(old));
      const back = loadCareer()!;
      for (const p of [...back.squad, ...(back.freeAgents ?? [])]) if (had.has(p.name)) expect(p.nation).toBe(had.get(p.name));
      opened.push(JSON.stringify(back));
    }
    expect(opened[1]).toBe(opened[0]);
  });
  it('ensureMadeUpNations leaves a man who has one alone and touches no real man', () => {
    const s = startCareer('Everton');
    const before = JSON.stringify(s);
    ensureMadeUpNations(s);
    expect(JSON.stringify(s)).toBe(before);
  });
});
