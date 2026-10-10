import { afterEach, describe, expect, it, vi } from 'vitest';
import { NFL_CAREER_SPORT } from './nflCareerSport';
import { NBA_CAREER_SPORT } from './nbaCareerSport';
import { MLB_CAREER_SPORT } from './mlbCareerSport';
import { NHL_CAREER_SPORT } from './nhlCareerSport';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from './usCareerSport';
import { currentUsCareerProgramme, expireUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus, type ProgrammeCareer, type ProgrammeChoices } from '@/lib/usCareerProgramme';

const sports: UsCareerSport[] = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];
const copy = <T,>(v: T): T => structuredClone(v);
function fixture<C extends UsCareerCore>(sport: UsCareerSport<C>): C & ProgrammeCareer {
  const c = sport.startCareer('Generated Programme Test', sport.create.defaultPos, sport.create.archetypes[sport.create.defaultPos][0], () => 0.5, null, sport.create.eras[0].id) as C & ProgrammeCareer;
  c.age = 31; c.health = 80; c.morale = 70; c.salary = 5; c.contractYears = 4; c.role = 'starter';
  return c;
}
function plan<C extends ProgrammeCareer>(c: C, sport: UsCareerSport, changes: Partial<ProgrammeChoices>) { return saveUsCareerProgramme(c, sport.slug, { ...usProgrammeDefaults(), ...changes }); }
function heldLine(c: ProgrammeCareer, extra: Record<string, unknown> = {}): UsCareerSeason {
  const row = { year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: c.programme?.sport === 'nfl' ? 17 : c.programme?.sport === 'mlb' ? c.pos === 'SP' ? 32 : c.pos === 'RP' ? 65 : 162 : 82, awards: [], teamResult: 'Recorded test season', salary: c.salary, ...extra };
  c.seasons.push(row); return row;
}
function random(seed: number, draws: number[]) {
  let n = seed;
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; const v = n / 4294967296; draws.push(v); return v; };
}
afterEach(() => vi.restoreAllMocks());
describe.each(sports)('$label season programme', sport => {
  it('preserves entire absent-programme season, progress and random stream', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1791590400000);
    for (const seed of [13, 37, 82]) {
      const original = fixture(sport), next = copy(original), a: number[] = [], b: number[] = [];
      const oldRng = random(seed, a), newRng = random(seed, b);
      const oldCamp = sport.campBattle(original, 75, oldRng), oldSeason = sport.simSeason(original, 75, oldRng), oldProgress = sport.progress(original, oldRng);
      const newCamp = sport.campBattle(next, 75, newRng);
      const prepared = prepareUsCareerProgramme(next, sport.slug), newSeason = sport.simSeason(next, 75, newRng);
      restoreUsCareerProgramme(next, prepared);
      const newProgress = sport.progress(next, newRng);
      expect(settleUsCareerProgramme(next, newSeason.line, sport.slug, prepared)).toBeNull();
      expireUsCareerProgramme(next);
      expect({ next, newCamp, newSeason, newProgress, draws: b }).toEqual({ next: original, newCamp: oldCamp, newSeason: oldSeason, newProgress: oldProgress, draws: a });
    }
  });
  it('workload uses real health and morale inputs, then retains actual injury and camp changes', () => {
    const c = plan(fixture(sport), sport, { workload: 'push' }), before = copy(c);
    const rng = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Programme consumed global RNG'); });
    const prepared = prepareUsCareerProgramme(c, sport.slug);
    expect([c.health, c.morale]).toEqual([72, 76]);
    c.health -= 7; c.morale += 3;
    restoreUsCareerProgramme(c, prepared);
    expect([c.health, c.morale]).toEqual([73, 73]);
    expect(c.seasons).toEqual(before.seasons); expect(rng).not.toHaveBeenCalled();
  });
  it('expectation settles coach games expectations once from the actual recorded row', () => {
    const c = plan(fixture(sport), sport, { expectation: 'stretch' }), row = heldLine(c);
    const before = copy(row);
    const result = settleUsCareerProgramme(c, row, sport.slug);
    expect(result?.decisions[0]).toMatchObject({ section: 'expectation', outcome: 'completed', actual: row.games, unit: 'games' });
    expect(c.morale).toBe(76); expect(row).toEqual(before); expect(c.programme).toBeUndefined();
    const settled = copy(c); expect(settleUsCareerProgramme(c, row, sport.slug)).toBeNull(); expect(c).toEqual(settled);
  });
  it('records missed coach targets without awarding success morale', () => {
    const c = plan(fixture(sport), sport, { expectation: 'steady' }), row = heldLine(c, { games: 1 });
    const result = settleUsCareerProgramme(c, row, sport.slug);
    expect(result?.decisions[0].outcome).toBe('missed'); expect(c.morale).toBe(67);
  });
  it('bonus pays only the position-specific saved-stat bonus and never rewrites the line', () => {
    const c = plan(fixture(sport), sport, { bonus: 'steady' });
    const extra = sport.slug === 'nfl' ? { passTd: 30 } : sport.slug === 'nba' ? { apg: 7 } : sport.slug === 'mlb' ? { hr: 30 } : { assists: 60, goals: 40 };
    const row = heldLine(c, extra), before = copy(row), earnings = c.earnings, bank = c.netWorth ?? 0;
    const result = settleUsCareerProgramme(c, row, sport.slug);
    expect(result).toMatchObject({ bonusGross: 0.1, bonusNet: 0.045 });
    expect(c.earnings).toBeCloseTo(earnings + 0.1); expect(c.netWorth).toBeCloseTo(bank + 0.045); expect(row).toEqual(before);
    expect(settleUsCareerProgramme(c, row, sport.slug)).toBeNull();
  });
  it('requires games as well as the stat threshold for a bonus', () => {
    const c = plan(fixture(sport), sport, { bonus: 'steady' }), row = heldLine(c, { games: 1, passTd: 50, apg: 20, hr: 50, goals: 60, assists: 90 });
    expect(settleUsCareerProgramme(c, row, sport.slug)?.bonusGross).toBe(0);
  });
  it('partnership builds three consecutive same-team partnership years and uses earned next-year morale', () => {
    let c = fixture(sport);
    for (let i = 1; i <= 3; i++) {
      c = plan(c, sport, { partnership: 'build' });
      const before = c.morale, prepared = prepareUsCareerProgramme(c, sport.slug);
      expect(c.morale).toBe(Math.min(100, before + (i - 1) * 2));
      const row = heldLine(c); restoreUsCareerProgramme(c, prepared);
      expect(settleUsCareerProgramme(c, row, sport.slug, prepared)?.partnershipProgress).toBe(i);
      c.year++;
    }
    c = plan(c, sport, { partnership: 'build' });
    const row = heldLine(c, { games: 1 });
    expect(settleUsCareerProgramme(c, row, sport.slug)?.decisions[0].outcome).toBe('missed'); expect(c.programmePartnership).toBeUndefined();
  });
  it('interrupts all six choices during a genuinely recorded zero-game year', () => {
    const c = plan(fixture(sport), sport, { workload: 'push', tactics: 'attack', expectation: 'stretch', partnership: 'build', bonus: 'stretch', reinvention: 'maintain' }), row = heldLine(c, { games: 0, teamResult: 'SUSPENDED' });
    const before = { health: c.health, morale: c.morale, earnings: c.earnings, netWorth: c.netWorth }, result = settleUsCareerProgramme(c, row, sport.slug);
    expect(result?.outcome).toBe('interrupted'); expect(result?.decisions).toHaveLength(6); expect(result?.decisions.every(d => d.outcome === 'interrupted')).toBe(true);
    expect(result?.bonusGross).toBe(0); expect({ health: c.health, morale: c.morale, earnings: c.earnings, netWorth: c.netWorth }).toEqual(before);
    expect(c.programme).toBeUndefined();
  });
  it('reinvention earns veteran health only after a recorded playing season', () => {
    const c = plan(fixture(sport), sport, { reinvention: 'maintain' });
    const prepared = prepareUsCareerProgramme(c, sport.slug); expect(c.morale).toBe(66);
    const row = heldLine(c, { games: 1 }); restoreUsCareerProgramme(c, prepared);
    expect(c.morale).toBe(70); settleUsCareerProgramme(c, row, sport.slug, prepared); expect(c.health).toBe(83);
  });
  it('tactics feeds tactical choices into the actual sport engine before saving any stats', () => {
    const input = fixture(sport);
    const attack = plan(copy(input), sport, { tactics: 'attack' }), support = plan(copy(input), sport, { tactics: 'support' });
    const first = prepareUsCareerProgramme(attack, sport.slug), second = prepareUsCareerProgramme(support, sport.slug);
    const a = (attack as unknown as { archetype: Record<string, number> }).archetype, b = (support as unknown as { archetype: Record<string, number> }).archetype;
    if (sport.slug === 'nba') { expect(a.scoring).toBeGreaterThan(b.scoring); expect(a.playmaking).toBeLessThan(b.playmaking); }
    else if (sport.slug === 'nhl') expect(a.scoringMult).toBeGreaterThan(b.scoringMult);
    else { expect(attack.morale).toBeGreaterThan(support.morale); expect(a.durability).toBeLessThan(b.durability); }
    const originalArchetype = copy((input as unknown as { archetype: unknown }).archetype);
    restoreUsCareerProgramme(attack, first); restoreUsCareerProgramme(support, second);
    expect((attack as unknown as { archetype: unknown }).archetype).toEqual(originalArchetype); expect((support as unknown as { archetype: unknown }).archetype).toEqual(originalArchetype);
  });
});
it('refuses premature settlement on a detached or different-team season', () => {
  const c = plan(fixture(NBA_CAREER_SPORT), NBA_CAREER_SPORT, { bonus: 'steady' });
  const row = { year: c.year, team: c.team, age: c.age, ovr: c.ovr, games: 82, awards: [], teamResult: '', salary: 5 };
  const before = copy(c); expect(settleUsCareerProgramme(c, row, 'nba')).toBeNull(); expect(c).toEqual(before);
  c.seasons.push({ ...row, team: 'Different generated team' });
  expect(settleUsCareerProgramme(c, c.seasons[0], 'nba')).toBeNull();
});
it('clears pending decisions and partnership immediately when a team changes', () => {
  const c = plan(fixture(NBA_CAREER_SPORT), NBA_CAREER_SPORT, { partnership: 'build' });
  c.programmePartnership = { sport: 'nba', team: c.team, progress: 3, lastYear: c.year - 1 };
  c.team = 'Different generated team'; expireUsCareerProgramme(c);
  expect(c.programme).toBeUndefined(); expect(c.programmePartnership).toBeUndefined();
});
it('preserves old saves exactly when selecting the usual routine', () => {
  const c = fixture(NBA_CAREER_SPORT), before = copy(c);
  expect(saveUsCareerProgramme(c, 'nba', usProgrammeDefaults())).toBe(c); expireUsCareerProgramme(c); expect(c).toEqual(before);
});
it('rejects retired, suspended, wrong-year and unavailable veteran choices', () => {
  const c = fixture(NBA_CAREER_SPORT);
  expect(saveUsCareerProgramme({ ...c, retired: true }, 'nba', { ...usProgrammeDefaults(), bonus: 'steady' }).programme).toBeUndefined();
  expect(saveUsCareerProgramme({ ...c, suspendedSeasons: 1 }, 'nba', { ...usProgrammeDefaults(), bonus: 'steady' }).programme).toBeUndefined();
  expect(saveUsCareerProgramme({ ...c, age: 29 }, 'nba', { ...usProgrammeDefaults(), reinvention: 'maintain' }).programme).toBeUndefined();
  const p = plan(c, NBA_CAREER_SPORT, { workload: 'push' }); p.year++;
  expect(currentUsCareerProgramme(p, 'nba')).toBeNull(); expireUsCareerProgramme(p); expect(p.programme).toBeUndefined();
});
it('clamps short-season targets to the existing sourced calendar instead of inventing one', () => {
  const c = fixture(NFL_CAREER_SPORT); c.year = 2005;
  expect(usProgrammeMenus(c, 'nfl').find(m => m.id === 'expectation')?.options[2].effect).toContain('12 games');
  const nba: ProgrammeCareer = fixture(NBA_CAREER_SPORT); nba.year = 2011; nba.seasons = [heldLine(nba, { games: 82 })];
  expect(usProgrammeMenus(nba, 'nba').find(m => m.id === 'expectation')?.options[2].effect).toContain('66 games');
});
it('restores clamped temporary inputs while retaining actual losses', () => {
  const c = plan({ ...fixture(NBA_CAREER_SPORT), health: 99, morale: 2 }, NBA_CAREER_SPORT, { workload: 'recover' });
  const prepared = prepareUsCareerProgramme(c, 'nba'); expect([c.health, c.morale]).toEqual([100, 0]);
  c.health -= 7; restoreUsCareerProgramme(c, prepared);
  expect([c.health, c.morale]).toEqual([92, 2]);
});

it.each(sports)('$label actual season tactics change recorded output before awards and preserve that line afterward', sport => {
  const key = sport.slug === 'nfl' ? 'passTd' : sport.slug === 'nba' ? 'ppg' : sport.slug === 'mlb' ? 'hr' : 'goals';
  let attackTotal = 0, supportTotal = 0;
  for (let ovr = 70; ovr <= 81; ovr++) for (const mode of ['attack', 'support'] as const) {
    const c = plan({ ...fixture(sport), ovr }, sport, { tactics: mode });
    sport.campBattle(c, 75, () => 0.99);
    const prepared = prepareUsCareerProgramme(c, sport.slug), result = sport.simSeason(c, 75, () => 0.99), raw = copy(result.line);
    const actual = (result.line as unknown as Record<string, number>)[key];
    if (mode === 'attack') attackTotal += actual; else supportTotal += actual;
    restoreUsCareerProgramme(c, prepared); sport.progress(c, () => 0.99); settleUsCareerProgramme(c, result.line, sport.slug, prepared);
    expect(result.line).toEqual(raw);
  }
  expect(attackTotal).toBeGreaterThan(supportTotal);
});
it('keeps an actual camp morale gain at the cap before preparing the season', () => {
  const c = plan({ ...fixture(NBA_CAREER_SPORT), role: 'backup' as const, ovr: 99, morale: 95 }, NBA_CAREER_SPORT, { workload: 'push' });
  NBA_CAREER_SPORT.campBattle(c, 75, () => 0.5); expect(c.morale).toBe(100);
  const prepared = prepareUsCareerProgramme(c, 'nba'); restoreUsCareerProgramme(c, prepared); expect(c.morale).toBe(100);
});
it.each([
  { programmePartnership: { sport: 'nba', team: 'ANY', progress: 'bad', lastYear: 2025 } },
  { programmeResults: {} },
  { programmeResults: [{ sport: 'nba', year: 2025, team: 'ANY', outcome: 'completed', bonusGross: 1, bonusNet: 1, partnershipProgress: 0 }] },
])('rejects malformed optional programme containers without effects or a reward %#', malformed => {
  const c = plan(fixture(NBA_CAREER_SPORT), NBA_CAREER_SPORT, { workload: 'push', bonus: 'steady' });
  Object.assign(c, malformed); const row = heldLine(c, { apg: 20 }), before = copy(c);
  expect(prepareUsCareerProgramme(c, 'nba')).toBeNull(); expect(settleUsCareerProgramme(c, row, 'nba')).toBeNull(); expect(c).toEqual(before);
});
it('rejects an unknown bonus choice at settlement even after the year has advanced', () => {
  const c = plan(fixture(NBA_CAREER_SPORT), NBA_CAREER_SPORT, { bonus: 'steady' });
  (c.programme as unknown as Record<string, unknown>).bonus = 'bogus'; const row = heldLine(c, { apg: 20 }); c.year++;
  const before = copy(c); expect(settleUsCareerProgramme(c, row, 'nba')).toBeNull(); expect(c).toEqual(before);
});
