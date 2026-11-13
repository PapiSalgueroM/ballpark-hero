import { uclTieOutcome } from './uclTieRule';
import type { SettleableTie } from './worldCompetition';

export type PlayoffStage = 'eliminator' | 'semi' | 'final';
export const PLAYOFF_STAGES: readonly PlayoffStage[] = ['eliminator', 'semi', 'semi', 'final'];
export const PLAYOFF_LABELS = [
  'Championship playoff eliminator', 'Championship playoff semi-final · first leg',
  'Championship playoff semi-final · second leg', 'Championship playoff final',
] as const;

export interface PromotionTie extends SettleableTie {
  stage: PlayoffStage;
}

export interface ChampionshipPlayoffs {
  season: number;
  /** Championship places three through eight, in the game table's order. */
  seeds: string[];
  ties: PromotionTie[];
}

function drawTie(stage: PlayoffStage, home: string, away: string): PromotionTie {
  return { stage, home, away, homeGoals: null, awayGoals: null, winner: null };
}

export function openChampionshipPlayoffs(season: number, seeds: string[]): ChampionshipPlayoffs {
  return {
    season, seeds,
    ties: [drawTie('eliminator', seeds[2], seeds[5]), drawTie('eliminator', seeds[3], seeds[4])],
  };
}

export function promotionTieAt(playoffs: ChampionshipPlayoffs | undefined, round: number, club: string): PromotionTie | undefined {
  return playoffs?.ties.find(tie => tie.stage === PLAYOFF_STAGES[round] && (tie.home === club || tie.away === club));
}

export function promotionWinner(playoffs: ChampionshipPlayoffs | undefined): string | null {
  return playoffs?.ties.find(tie => tie.stage === 'final')?.winner ?? null;
}

/** The 2026/27 EFL rules reseed the semi-finals after the eliminators. */
export function drawNextPlayoffRound(playoffs: ChampionshipPlayoffs, round: number): void {
  if (round !== 0 && round !== 2) return;
  const stage = PLAYOFF_STAGES[round];
  const next = round === 0 ? 'semi' : 'final';
  if (playoffs.ties.some(tie => tie.stage === next)) return;
  const winners = playoffs.ties.filter(tie => tie.stage === stage).map(tie => tie.winner);
  const [a, b] = winners;
  if (!a || !b || winners.length !== 2) return;
  if (next === 'semi') {
    const rank = (club: string) => playoffs.seeds.indexOf(club);
    const [lower, higher] = rank(a) > rank(b) ? [a, b] : [b, a];
    playoffs.ties.push(drawTie('semi', lower, playoffs.seeds[0]), drawTie('semi', higher, playoffs.seeds[1]));
  } else {
    playoffs.ties.push(drawTie('final', a, b));
  }
}

export function recordPromotionResult(tie: PromotionTie, round: number, myClub: string, myGoals: number, oppGoals: number,
  advanced: boolean, extraTime: boolean, penalties: boolean): void {
  const mineHome = tie.home === myClub;
  const score = { homeGoals: mineHome ? myGoals : oppGoals, awayGoals: mineHome ? oppGoals : myGoals };
  if (round === 1) {
    tie.legs = 2;
    tie.leg1 = score;
    return;
  }
  if (round === 2) tie.leg2 = score;
  const total = round === 2 ? uclTieOutcome(tie, false) : null;
  tie.homeGoals = total?.homeAgg ?? score.homeGoals;
  tie.awayGoals = total?.awayAgg ?? score.awayGoals;
  if (extraTime) tie.aet = true;
  if (penalties) tie.pens = true;
  tie.winner = advanced ? myClub : mineHome ? tie.away : tie.home;
}
