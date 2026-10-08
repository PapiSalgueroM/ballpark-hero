import { describe, expect, it } from 'vitest';
import {
  clubConfederation, clubCupFor, continentalOpponents, firstStageShape, playFirstStage,
  firstStageTarget, solveStageStrength, stagePassChance, PASS_CURVES, LEAGUE_TOP8,
  LEAGUE_PHASE, SC_CONTINENTAL_PARTIAL, CONTINENTAL_PERIODS, CONTINENTAL_GAPS, isFirstStageResult, type CurveId,
} from './soccerCareerContinental';
import { UCL_FORMAT_PERIODS } from './uclFormatHistory';

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('which cup a club plays', () => {
  it('reads the confederation off the club country, including the spellings the club list uses', () => {
    expect(clubConfederation('Brazil')).toBe('CONMEBOL');
    expect(clubConfederation('Argentina')).toBe('CONMEBOL');
    expect(clubConfederation('USA')).toBe('CONCACAF');
    expect(clubConfederation('Mexico')).toBe('CONCACAF');
    expect(clubConfederation('Saudi Arabia')).toBe('AFC');
    expect(clubConfederation('UAE')).toBe('AFC');
    expect(clubConfederation('Malaysia')).toBe('AFC');
    expect(clubConfederation('Egypt')).toBe('CAF');
    expect(clubConfederation('Spain')).toBe('UEFA');
    expect(clubConfederation('Monaco')).toBe('UEFA');
  });

  it('names the cup by the season, and only UEFA clubs get the Champions League', () => {
    expect(clubCupFor('Spain', 2010)?.cup).toBe('ucl');
    expect(clubCupFor('Brazil', 1995)?.period?.name).toBe('Copa Libertadores');
    expect(clubCupFor('Brazil', 2018)?.period?.finalLegs).toBe(2);
    expect(clubCupFor('Brazil', 2019)?.period?.finalLegs).toBe(1);
    expect(clubCupFor('USA', 2007)?.period?.name).toBe('CONCACAF Champions Cup');
    expect(clubCupFor('USA', 2008)?.period?.name).toBe('CONCACAF Champions League');
    expect(clubCupFor('Mexico', 2023)?.period?.name).toBe('CONCACAF Champions Cup');
    expect(clubCupFor('Saudi Arabia', 2023)?.period?.name).toBe('AFC Champions League');
    expect(clubCupFor('Saudi Arabia', 2024)?.period?.name).toBe('AFC Champions League Elite');
    expect(clubCupFor('Egypt', 1996)?.period?.name).toBe('African Cup of Champions Clubs');
    expect(clubCupFor('Egypt', 1997)?.period?.name).toBe('CAF Champions League');
    expect(clubCupFor('New Zealand', 2010)).toBeNull();
    expect(clubCupFor('Mexico', 2001)).toBeNull();
  });

  it('leaves no season of any confederation without a row, and marks every row it could not two source', () => {
    for (const conf of ['CONMEBOL', 'CONCACAF', 'AFC', 'CAF'] as const) {
      for (let y = 1990; y <= 2035; y++) {
        const gap = CONTINENTAL_GAPS.some(g => g.confederation === conf && g.year === y);
        expect(CONTINENTAL_PERIODS.filter(p => p.confederation === conf && y >= p.from && (p.to === null || y <= p.to))).toHaveLength(gap ? 0 : 1);
      }
    }
    // Every row's name and first season rest on two publishers outside
    // Wikipedia, each with an address and a read date; the partial list
    // names only rows whose finals are still on one.
    const ids = CONTINENTAL_PERIODS.map(p => p.id);
    for (const id of SC_CONTINENTAL_PARTIAL) expect(ids).toContain(id);
    for (const p of CONTINENTAL_PERIODS) {
      for (const s of p.sources) {
        expect(s).toMatch(/https:\/\//);
        expect(s).toMatch(/read 20\d\d-\d\d-\d\d/);
        expect(s.toLowerCase()).not.toContain('wikipedia');
      }
      const publishers = new Set(p.sources.map(s => s.slice(0, s.indexOf(','))));
      expect(publishers.size, p.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('draws opponents from the same confederation, that existed that season', () => {
    const clubs = [
      { id: '1', name: 'Boca Juniors', country: 'Argentina', tier: 1, color: '', league: '' },
      { id: '2', name: 'Flamengo', country: 'Brazil', tier: 1, color: '', league: '' },
      { id: '3', name: 'Inter Miami', country: 'USA', tier: 2, color: '', league: '' },
      { id: '4', name: 'Monterrey', country: 'Mexico', tier: 2, color: '', league: '' },
      { id: '5', name: 'Real Madrid', country: 'Spain', tier: 1, color: '', league: '' },
    ];
    expect(continentalOpponents(clubs, 'CONMEBOL', 2010, 'Flamengo')).toEqual(['Boca Juniors']);
    expect(continentalOpponents(clubs, 'CONCACAF', 2005, 'Monterrey')).toEqual([]);
    expect(continentalOpponents(clubs, 'CONCACAF', 2021, 'Monterrey')).toEqual(['Inter Miami']);
    /* Australian clubs first played the AFC's cup in its 2007 edition (RSSSF
       ascup06 and ascup07, read 2026-10-03), and season 2006 is the 2006 one.
       Round 1100: the club in this fixture is Melbourne Victory, a club the
       era filter already lets through in 2006 (its typed first season is
       2004), so the 2006 line is held by the Australia rule and nothing
       else. It was Sydney FC, which the round's pool brought in as a 2026-27
       club: the game holds it out of every earlier season until its first
       season is two sourced, so it can no longer stand in for 2007. */
    const asia = [
      { id: '6', name: 'Al Hilal', country: 'Saudi Arabia', tier: 2, color: '', league: '' },
      { id: '7', name: 'Melbourne Victory', country: 'Australia', tier: 4, color: '', league: '' },
    ];
    expect(continentalOpponents(asia, 'AFC', 2006, 'Al Hilal')).toEqual([]);
    expect(continentalOpponents(asia, 'AFC', 2007, 'Al Hilal')).toEqual(['Melbourne Victory']);
    /* and the hold itself: a club the pool brought in for 2026-27 is nobody's
       opponent before that season, and is one from it */
    const held = [...asia, { id: '8', name: 'Sydney FC', country: 'Australia', tier: 4, color: '', league: '' }];
    expect(continentalOpponents(held, 'AFC', 2025, 'Al Hilal')).toEqual(['Melbourne Victory']);
    expect(continentalOpponents(held, 'AFC', 2026, 'Al Hilal')).toEqual(['Melbourne Victory', 'Sydney FC']);
  });
});

describe('the Champions League first stage', () => {
  it('derives the knockout ladder from the format table, period by period', () => {
    for (const p of UCL_FORMAT_PERIODS) {
      if (p.from < 1990) continue;
      const shape = firstStageShape(p.from);
      if (p.stage === 'knockout') { expect(shape.kind).toBe('none'); continue; }
      expect(shape.kind).toBe(p.stage === 'leaguePhase' ? 'leaguePhase' : 'groups');
      expect(shape.ladder.includes('R16')).toBe(p.roundOf16);
      if (p.koLegs === null) expect(shape.ladder).toEqual(['Final']);
      expect(shape.stages).toBe(p.secondGroupStage ? 2 : 1);
    }
    expect(firstStageShape(1993).ladder).toEqual(['SF', 'Final']);
    expect(firstStageShape(1997).advance).toBe('winnerOrBestRunnerUp');
    expect(firstStageShape(1994).pointsForWin).toBe(2);
    expect(firstStageShape(1995).pointsForWin).toBe(3);
  });

  it('plays a real double round robin and a table that adds up', () => {
    const rng = seeded(7);
    for (const year of [1991, 1994, 1997, 2000, 2010, 2016]) {
      const shape = firstStageShape(year);
      for (let i = 0; i < 40; i++) {
        const r = playFirstStage(shape, 'Mine', 0.5, ['A', 'B', 'C', 'D', 'E', 'F'], rng);
        for (const st of r.stages) {
          expect(st.games).toHaveLength(6);
          expect(st.games.filter(g => g.home)).toHaveLength(3);
          for (const opp of new Set(st.games.map(g => g.opponent))) {
            expect(st.games.filter(g => g.opponent === opp)).toHaveLength(2);
          }
          for (const row of st.table!) expect(row.pts).toBe(row.w * shape.pointsForWin + row.d);
          const me = st.table![st.position - 1];
          expect(me.club).toBe('Mine');
          expect(me.gf).toBe(st.games.reduce((a, g) => a + g.goalsFor, 0));
        }
        const last = r.stages[r.stages.length - 1];
        if (shape.advance === 'winner') expect(r.through).toBe(last.position === 1);
        if (shape.advance === 'top2') expect(r.through).toBe(last.position <= 2 && r.stages.length === shape.stages);
      }
    }
  });

  it('plays a league phase of eight different opponents, four at home', () => {
    const rng = seeded(11);
    const shape = firstStageShape(2026);
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let i = 0; i < 40; i++) {
      const r = playFirstStage(shape, 'Mine', 0, names, rng);
      const st = r.stages[0];
      expect(st.games).toHaveLength(LEAGUE_PHASE.games);
      expect(new Set(st.games.map(g => g.opponent)).size).toBe(8);
      expect(st.games.filter(g => g.home)).toHaveLength(4);
      expect(st.of).toBe(36);
      expect(r.through).toBe(st.position <= 8);
      expect(!!r.playoff).toBe(st.position > 8 && st.position <= 24);
      expect(st.myRow.pts).toBe(st.games.reduce((a, g) => a + (g.goalsFor > g.goalsAgainst ? 3 : g.goalsFor === g.goalsAgainst ? 1 : 0), 0));
    }
  });
});

describe('solving the pass rate', () => {
  it('keeps every measured curve non-decreasing, so the inversion is well posed', () => {
    for (const row of [...Object.values(PASS_CURVES), LEAGUE_TOP8]) {
      for (let i = 1; i < row.length; i++) expect(row[i]).toBeGreaterThanOrEqual(row[i - 1]);
    }
  });

  it('lands on the target it was asked for, at every step of the ladder', () => {
    const curves: CurveId[] = ['winner2', 'top2_2', 'top2_3', 'best6_3', 'twice_3', 'league'];
    for (const c of curves) {
      for (const target of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]) {
        const s = solveStageStrength(c, target, 0.5);
        expect(Math.abs(stagePassChance(c, s, 0.5) - target)).toBeLessThan(0.002);
      }
    }
  });

  it('never asks for a qualification rate above 98 percent, and lifts the pass rate with strength', () => {
    for (const reach of [0.35, 0.85]) {
      let prev = 0;
      for (const ko of [0.15, 0.3, 0.45, 0.6, 0.75]) {
        const p = firstStageTarget(ko, reach);
        expect(reach / p).toBeLessThanOrEqual(0.98 + 1e-9);
        expect(p).toBeLessThanOrEqual(0.97);
        expect(p).toBeGreaterThanOrEqual(prev);
        prev = p;
      }
    }
  });
});

describe('an old or broken save', () => {
  it('accepts a first stage the engine wrote and refuses one the card could not read', () => {
    const good = playFirstStage(firstStageShape(2010), 'Mine', 0.5, ['A', 'B', 'C'], seeded(3));
    expect(isFirstStageResult(JSON.parse(JSON.stringify(good)))).toBe(true);
    const lp = playFirstStage(firstStageShape(2026), 'Mine', 0.5, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], seeded(4));
    expect(isFirstStageResult(JSON.parse(JSON.stringify(lp)))).toBe(true);
    expect(isFirstStageResult(undefined)).toBe(false);
    expect(isFirstStageResult({ kind: 'groups', through: true, stages: [{ label: 'Group stage' }] })).toBe(false);
    const broken = JSON.parse(JSON.stringify(good));
    broken.stages[0].games[0].goalsFor = 'two';
    expect(isFirstStageResult(broken)).toBe(false);
  });
});

describe('the group footnote says only what is on the record', () => {
  it('marks the game\'s own tiebreak and makes no claim about the year three points came in', () => {
    const own = playFirstStage(firstStageShape(2012), 'Mine', 0.5, ['A', 'B', 'C'], seeded(5));
    expect(own.stages[0].footnote).toContain("this game's order");
    const verified = playFirstStage(firstStageShape(2007), 'Mine', 0.5, ['A', 'B', 'C'], seeded(6));
    expect(verified.stages[0].footnote).not.toContain("this game's order");
    expect(verified.stages[0].footnote).toContain('games between the level clubs');
    const twoPoints = playFirstStage(firstStageShape(1994), 'Mine', 0.5, ['A', 'B', 'C'], seeded(7));
    expect(twoPoints.stages[0].footnote).toContain('Two points for a win in this table.');
    expect(twoPoints.stages[0].footnote).not.toContain('1995');
  });
});
