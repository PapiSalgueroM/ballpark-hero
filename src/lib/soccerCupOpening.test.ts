import { describe, expect, it, vi } from 'vitest';
import { cupAssociation, cupFor, drawCupRun, readCupRun, type CupRunInput } from '@/lib/soccerCareerCup';
import { FALLBACK_CLUBS } from '@/lib/soccerCareerEngine';
import { savedSeasonCompetitions } from '@/lib/soccerSeasonCompetitions';
import { cupSeason } from '@/test/fixtures/soccerSeasonCompetitions1173';

const input = (patch: Partial<CupRunInput> = {}): CupRunInput => ({ status: cupFor('England', 2026), club: 'Arsenal', year: 2026, won: true, chance: 0.25, clubs: FALLBACK_CLUBS, goals: 15, apps: 40, seedKey: 'opening-test', ...patch });
describe('recorded modern simulated cup opening tie', () => {
  it('legacy callers keep the exact old run with no opening key', () => {
    const held = input(), before = structuredClone(held);
    const normal = drawCupRun(held), explicit = drawCupRun({ ...held, includeOpening: false });
    expect(normal).toEqual(explicit); expect(normal?.opening).toBeUndefined(); expect(held).toEqual(before);
  });
  it('new opening data leaves every existing tie and final identical across win and loss seeds', () => {
    for (const won of [false, true]) for (let seed = 0; seed < 24; seed++) {
      const held = input({ won, seedKey: 'opening-pair-' + seed });
      const old = drawCupRun(held), current = drawCupRun({ ...held, includeOpening: true });
      expect(current?.opening).toBeDefined(); const existing = structuredClone(current!); delete existing.opening; expect(existing).toEqual(old);
    }
  });
  it('the opening result follows the recorded early outcome and has a real decisive saved score', () => {
    for (const won of [false, true]) for (let seed = 0; seed < 12; seed++) {
      const run = drawCupRun(input({ includeOpening: true, won, seedKey: 'decisive-opening-' + seed }))!;
      expect(run.opening?.won).toBe(run.stages[0].won); expect(run.opening!.for === run.opening!.against).toBe(false);
      expect(run.opening!.for > run.opening!.against).toBe(run.opening!.won);
      const opponent = FALLBACK_CLUBS.find(club => club.name === run.opening!.opp)!;
      expect(cupAssociation(opponent.country, opponent.league)).toBe('England'); expect(opponent.name).not.toBe('Arsenal');
      expect(run.stages.some(tie => tie.opp === opponent.name)).toBe(false);
    }
  });
  it('does not generate historic or unnamed opening matches', () => {
    expect(drawCupRun(input({ includeOpening: true, year: 2025, status: cupFor('England', 2025) }))?.opening).toBeUndefined();
    expect(drawCupRun(input({ includeOpening: true, status: { kind: 'UNKNOWN', association: 'England' } }))?.opening).toBeUndefined();
  });
  it('does not read the global random stream or reroll on reload', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Global opening draw'); });
    try { const run = drawCupRun(input({ includeOpening: true }))!; expect(drawCupRun(input({ includeOpening: true }))).toEqual(run); const row = { ...cupSeason, year: 2026, cupRun: run }; expect(readCupRun(JSON.parse(JSON.stringify(row)))).toEqual(run); expect(random).not.toHaveBeenCalled(); } finally { random.mockRestore(); }
  });
  it('renders only recorded opening facts without changing any season totals', () => {
    const run = drawCupRun(input({ includeOpening: true }))!, row = { ...cupSeason, year: 2026, cupRun: run }, before = structuredClone(row);
    const opening = savedSeasonCompetitions({ lastUCLResult: null }, row)[0].matches[0];
    expect(opening).toMatchObject({ round: 'Opening cup tie', opponent: run.opening!.opp, goalsFor: run.opening!.for, goalsAgainst: run.opening!.against, home: run.opening!.home, result: run.opening!.won ? 'Through' : 'Out' }); expect(opening.playerGoals).toBeUndefined(); expect(row).toEqual(before);
  });
  it.each([{ won: false }, { for: -1 }, { against: NaN }, { for: 1.5 }, { home: 'home' }, { opp: 'Arsenal' }, { country: 'Spain', league: 'La Liga' }])('rejects an incoherent opening field %j', patch => {
    const run = drawCupRun(input({ includeOpening: true }))!;
    const invalid = { ...cupSeason, year: 2026, cupRun: { ...run, opening: { ...run.opening!, ...patch } } };
    expect(readCupRun(invalid)).toBeNull();
  });
  it('rejects a duplicate later opponent and a historical row carrying future opening data', () => {
    const run = drawCupRun(input({ includeOpening: true }))!;
    expect(readCupRun({ ...cupSeason, year: 2026, cupRun: { ...run, opening: { ...run.opening!, opp: run.stages[1].opp! } } })).toBeNull();
    expect(readCupRun({ ...cupSeason, year: 2025, cupRun: run })).toBeNull();
  });
});
