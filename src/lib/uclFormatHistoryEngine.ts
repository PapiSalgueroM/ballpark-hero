/**
 * Round 520: what Club Manager actually plays, read off the engine.
 *
 * This module imports the engine, so it is NOT imported by the reference
 * page. The review of Round 520 measured what that import cost: the page's
 * own chunk was 20 KB and it pulled clubManager (728 KB) plus the modules the
 * engine drags in, about 1.2 MB of JavaScript to print four lines. So the
 * lines are generated at build time instead, the way the Record Books are
 * (Round 372): scripts/genUclEngineShapes.mjs runs this module against the
 * real engine and writes src/data/uclEngineShapes.json, the page reads the
 * JSON, and scripts/simUclFormatHistory.mjs section 3 recomputes the shapes
 * from the engine and fails if the JSON is stale. The claim on the page,
 * "generated from the game engine", stays true because a stale file cannot
 * pass the gate.
 */
import type { CMEra } from '@/lib/clubManagerEras';
import { CM_ERAS } from '@/lib/clubManagerEras';
import { uclFirstKoRound, uclLegsFor, uclAwayGoalsApply } from '@/lib/clubManager';
import { periodFor, seasonOf, UCL_AWAY_GOALS, type UclFormatPeriod } from '@/lib/uclFormatHistory';

export interface ClubManagerUclShape {
  era: Pick<CMEra, 'id' | 'label' | 'startYear' | 'emoji'>;
  /** The first knockout round the engine plays after its eight groups. */
  firstKo: 'R16' | 'QF';
  legs: 1 | 2;
  awayGoals: boolean;
  /** The id of the real format period the era starts in. */
  realId: string;
  /** Whether the engine's shape is the real one or a stand in. */
  matchesReal: boolean;
  /** The one line the page prints under the era. */
  line: string;
}

/** The one line the page prints under each era. Pure, so the harness can
 *  assert on it without rendering anything. */
export function clubManagerUclLine(
  s: Pick<ClubManagerUclShape, 'era' | 'firstKo' | 'legs' | 'awayGoals' | 'matchesReal'>,
  real: UclFormatPeriod,
): string {
  const ko = s.firstKo === 'R16' ? 'round of 16' : 'quarter-finals';
  const legs = s.legs === 2 ? 'two legged ties' : 'one off ties';
  const ag = s.awayGoals ? 'away goals count double' : 'no away goals rule';
  const shape = `Eight groups of four into the ${ko}, ${legs}, ${ag}.`;
  if (s.matchesReal) return `${shape} That is the real ${seasonOf(s.era.startYear)} format.`;
  const verb = real.to === null ? 'runs' : 'ran';
  return `${shape} A stand in: the real ${seasonOf(s.era.startYear)} competition ${verb} ${real.title.toLowerCase()}, which the engine does not play yet.`;
}

/**
 * Every value here comes from the engine's own helpers, never from the
 * timeline, so the page can only ever describe what the game does. The engine
 * always draws eight groups (initUclWorld in clubManager.ts); what changes by
 * era is where the knockout starts, how many legs a tie has and whether away
 * goals count.
 */
export function clubManagerUclShape(era: CMEra): ClubManagerUclShape {
  const firstKo = uclFirstKoRound({ eraId: era.id }) === 'R16' ? 'R16' : 'QF';
  const legs = uclLegsFor(era.id, 'QF');
  const awayGoals = uclAwayGoalsApply(era.id);
  const real = periodFor(era.startYear);
  const matchesReal =
    real.stage === 'groups'
    && real.groups === 8
    && !real.secondGroupStage
    && real.roundOf16 === (firstKo === 'R16')
    && real.koLegs === legs
    && awayGoals === (era.startYear <= UCL_AWAY_GOALS.lastSeason);
  const shape: Omit<ClubManagerUclShape, 'line'> = {
    era: { id: era.id, label: era.label, startYear: era.startYear, emoji: era.emoji },
    firstKo,
    legs,
    awayGoals,
    realId: real.id,
    matchesReal,
  };
  return { ...shape, line: clubManagerUclLine(shape, real) };
}

export function clubManagerUclShapes(): ClubManagerUclShape[] {
  return CM_ERAS.map(clubManagerUclShape);
}
