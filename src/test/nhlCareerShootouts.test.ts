import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { NHL_ARCHETYPES, nhlProgress, simNhlSeason, startNhlCareer } from '@/lib/nhlMyCareer';
import { expectsEarlyShootoutShots, NHL_SHOOTOUT_STANCES, practicedShootoutStance, type ShootoutStance } from '@/lib/nhlShootout';
import { prepareUsCareerProgramme, restoreUsCareerProgramme, saveUsCareerProgramme, settleUsCareerProgramme, usProgrammeDefaults, usProgrammeMenus } from '@/lib/usCareerProgramme';
import { nhlSeasonReview } from '@/lib/usCareerSeasonReview';

function goalie(seed: number, team = 'SEA', year = 2026) {
  const c = startNhlCareer('Goalie ' + seed, 'G', NHL_ARCHETYPES.G[0], keyedRng('goalie draft ' + seed), null, year < 2026 ? 'y2006' : 'now');
  Object.assign(c, { team, year, ovr: 82, pot: 90, health: 95, contractYears: 2, role: 'starter' });
  delete c.rival;
  return c;
}
function play(c: ReturnType<typeof goalie>, seed: number, stance?: ShootoutStance) {
  const held = saveUsCareerProgramme(structuredClone(c), 'nhl', stance ? { ...usProgrammeDefaults(), tactics: stance } : null);
  const rng = keyedRng('goalie season ' + seed);
  const prep = prepareUsCareerProgramme(held, 'nhl');
  const { line } = simNhlSeason(held, 78, rng, true, prep);
  restoreUsCareerProgramme(held, prep);
  nhlProgress(held, rng, line.seasonRating);
  const receipt = settleUsCareerProgramme(held, line, 'nhl', prep);
  return { held, line, receipt, prep, nextDraw: rng() };
}

describe('goalie shootout depth', () => {
  it('lets both forecast reads win their matchup without changing the next draw or playoff stats', () => {
    const gained = { early: 0, deke: 0 }, lost = { early: 0, deke: 0 };
    for (const team of ['SEA', 'BOS', 'TOR', 'NYR', 'DAL', 'LAK', 'VAN', 'CHI']) {
      const forecast = expectsEarlyShootoutShots(team, 2026) ? 'early' : 'deke';
      for (let seed = 0; seed < 25; seed++) {
        const c = goalie(seed, team);
        const usual = play(c, seed), challenge = play(c, seed, 'shootout-challenge'), hold = play(c, seed, 'shootout-hold');
        const fit = forecast === 'early' ? challenge : hold, exposed = forecast === 'early' ? hold : challenge;
        gained[forecast] += fit.line.wins! - usual.line.wins!;
        lost[forecast] += usual.line.wins! - exposed.line.wins!;
        expect(usual.line.shootout).toBeUndefined();
        for (const changed of [challenge, hold]) {
          const result = changed.line.shootout!;
          expect(result.earlyShots + result.dekes).toBe(Math.floor(usual.line.games / 6));
          expect(changed.line.wins).toBe(usual.line.wins! - result.usualWins + result.wins);
          expect(changed.line.wins).toBeLessThanOrEqual(usual.line.games);
          expect(changed.line.wins).toBeGreaterThanOrEqual(0);
          expect(changed.line.svpct).toBe(usual.line.svpct);
          expect(changed.line.poWins).toBe(usual.line.poWins);
          expect(changed.line.poSvpct).toBe(usual.line.poSvpct);
          expect(changed.nextDraw).toBe(usual.nextDraw);
          expect(changed.receipt?.decisions[0]).toMatchObject({ outcome: 'completed', actual: result.wins, unit: 'shootout wins' });
          expect(result.usualWins).toBe(challenge.line.shootout!.usualWins);
          expect(result.earlyShots).toBe(challenge.line.shootout!.earlyShots);
        }
      }
    }
    for (const read of ['early', 'deke'] as const) {
      expect(gained[read]).toBeGreaterThan(15);
      expect(lost[read]).toBeGreaterThan(15);
    }
  });

  it('uses actual backup starts on a shortened schedule and preserves the settled result on reload', () => {
    const c = goalie(0, 'BOS', 2012);
    c.role = 'backup';
    c.contractYears = 1;
    const { held, line, prep, receipt } = play(c, 8, 'shootout-hold');
    expect(line.slate).toBe(48);
    expect(line.games).toBeLessThan(18);
    expect(line.shootout!.earlyShots + line.shootout!.dekes).toBe(Math.floor(line.games / 6));
    expect(held.contractYears).toBe(0);
    expect(receipt?.decisions[0].label).toBe(NHL_SHOOTOUT_STANCES['shootout-hold']);
    const saved = JSON.stringify(held);
    expect(settleUsCareerProgramme(held, line, 'nhl', prep)).toBeNull();
    expect(JSON.stringify(held)).toBe(saved);
    const loaded = JSON.parse(saved).seasons[0];
    expect(nhlSeasonReview(loaded, 'G').regular).toContainEqual(expect.objectContaining({ label: 'Shootout wins', value: String(line.shootout!.wins) }));
    expect(nhlSeasonReview(loaded, 'C').regular.some(stat => stat.label.includes('Shootout'))).toBe(false);
    expect(nhlSeasonReview(play(c, 8).line, 'G').regular.some(stat => stat.label.includes('Shootout'))).toBe(false);
  });

  it('carries a practiced stance to a new team for the next season and records only wins it actually salvages', () => {
    let recovered = 0;
    for (let seed = 0; seed < 120; seed++) {
      const first = play(goalie(seed), seed, 'shootout-hold');
      const next = { ...structuredClone(first.held), team: 'BOS' };
      expect(practicedShootoutStance(next)).toBe('shootout-hold');
      const old = structuredClone(next);
      delete old.seasons[0].shootout;
      const learned = play(next, seed, 'shootout-hold').line, fresh = play(old, seed, 'shootout-hold').line;
      expect(fresh.shootout!.recoveries).toBeUndefined();
      expect(learned.shootout!.recoveries).toBe(learned.wins! - fresh.wins!);
      expect(learned.shootout!.wins - fresh.shootout!.wins).toBe(learned.shootout!.recoveries);
      recovered += learned.shootout!.recoveries!;
      expect(play(next, seed, 'shootout-challenge').line.shootout!.recoveries).toBeUndefined();
      expect(practicedShootoutStance({ ...next, year: next.year + 1 })).toBeUndefined();
      expect(practicedShootoutStance({ ...next, seasons: [{ ...first.line, games: 12 }] })).toBeUndefined();
    }
    expect(recovered).toBeGreaterThan(20);
  });

  it('offers signed goalies both stances and ignores a preparation from another team or season', () => {
    const c = goalie(2);
    const options = (player: typeof c) => usProgrammeMenus(player, 'nhl').find(m => m.id === 'tactics')!.options.filter(o => o.id.startsWith('shootout-'));
    expect(options(c).map(o => o.id)).toEqual(['shootout-challenge', 'shootout-hold']);
    for (const unavailable of [{ ...c, pos: 'C' as const }, { ...c, retired: true }, { ...c, contractYears: 0 }, { ...c, suspendedSeasons: 1 }]) expect(options(unavailable)).toEqual([]);
    const prep = prepareUsCareerProgramme(saveUsCareerProgramme(c, 'nhl', { ...usProgrammeDefaults(), tactics: 'shootout-challenge' }), 'nhl')!;
    for (const stale of [{ year: 2025 }, { team: 'BOS' }]) {
      const { line } = simNhlSeason(structuredClone(c), 78, keyedRng('goalie season 2'), true, { ...prep, plan: { ...prep.plan, ...stale } });
      expect(line).toEqual(play(c, 2).line);
    }
  });
});
