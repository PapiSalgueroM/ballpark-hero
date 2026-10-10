import type { CareerState, SeasonRecord, UCLResult } from './soccerCareerEngine';
import { readCupRun } from './soccerCareerCup';
import { isFirstStageResult } from './soccerCareerContinental';

export interface SavedCompetitionMatch {
  round: string;
  opponent: string | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  home?: boolean;
  playerGoals?: number;
  result?: string;
  note?: string;
}

export interface SavedSeasonCompetition {
  id: 'domestic' | 'club';
  name: string;
  result: string;
  matches: SavedCompetitionMatch[];
  note?: string;
}

/** An unanchored latest result cannot establish which season it belongs to. */
export function savedClubCampaign(career: Pick<CareerState, 'lastUCLResult'>, row: SeasonRecord): UCLResult | null {
  const run = row.clubCupRun ?? career.lastUCLResult;
  if (!run?.qualified || run.seasonYear !== row.year || run.club !== row.club || !Array.isArray(run.matches)) return null;
  if (run.firstStage !== undefined && !isFirstStageResult(run.firstStage)) return null;
  const goals = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0;
  if (run.matches.some(match => !match || typeof match.opponent !== 'string' || !match.opponent || typeof match.round !== 'string'
    || !goals(match.goalsFor) || !goals(match.goalsAgainst) || !goals(match.playerGoals) || !goals(match.leg) || match.leg < 1)) return null;
  return run;
}

const ROUND_NAMES: Record<string, string> = { R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', Final: 'Final', PO: 'Play-off' };
const roundName = (round: string) => ROUND_NAMES[round] ?? round;

/** Every opponent and score is copied from the save, never generated for this screen. */
export function savedSeasonCompetitions(career: Pick<CareerState, 'lastUCLResult'>, row: SeasonRecord): SavedSeasonCompetition[] {
  const competitions: SavedSeasonCompetition[] = [];
  const cup = readCupRun(row);
  if (cup) {
    const end = cup.stages[cup.stages.length - 1];
    competitions.push({
      id: 'domestic', name: cup.cup ?? 'Domestic cup', result: end.stage === 'F' && end.won ? 'Winners' : end.won ? 'Through' : 'Knocked out',
      matches: cup.stages.map(tie => {
        if (tie.stage === 'early' && cup.opening) return {
          round: 'Opening cup tie', opponent: cup.opening.opp, goalsFor: cup.opening.for, goalsAgainst: cup.opening.against, home: cup.opening.home,
          result: cup.opening.won ? 'Through' : 'Out', note: 'Simplified simulated opening tie. Other early rounds were not recorded.',
        };
        const final = tie.stage === 'F' ? cup.final : undefined;
        return {
          round: { early: 'Early rounds', QF: 'Quarter-final', SF: 'Semi-final', F: 'Final' }[tie.stage],
          opponent: tie.opp ?? null, goalsFor: final?.for ?? tie.for ?? null, goalsAgainst: final?.against ?? tie.against ?? null,
          ...(tie.home !== undefined && !final ? { home: tie.home } : {}),
          result: tie.won ? tie.stage === 'F' ? 'Winners' : 'Through' : 'Out',
          note: final?.decidedBy === 'penalties' ? `${final.pensFor}-${final.pensAgainst} on penalties`
            : final?.legs === 2 ? 'Final score on aggregate' : tie.stage === 'early' ? 'Opponents and scores were not kept for these rounds.' : undefined,
        };
      }),
      note: cup.stages.some(tie => tie.stage === 'QF' || tie.stage === 'SF') ? 'Rounds before the final are shown as one match each.' : undefined,
    });
  } else if (row.domesticCup) {
    competitions.push({ id: 'domestic', name: 'Domestic cup', result: 'Winners', matches: [], note: 'The cup name and match details were not kept in this save.' });
  }
  const run = savedClubCampaign(career, row);
  if (run) {
    const matches: SavedCompetitionMatch[] = (run.firstStage?.stages ?? []).flatMap(stage => stage.games.map(game => ({
      round: `${stage.label}, game ${game.matchday}`, opponent: game.opponent,
      goalsFor: game.goalsFor, goalsAgainst: game.goalsAgainst, home: game.home, playerGoals: game.playerGoals,
    })));
    const twoLegFinal = run.matches.some(match => match.round === 'Final' && match.leg === 2);
    for (const match of run.matches) {
      const showLeg = match.round !== 'Final' || twoLegFinal;
      const notes = [
        match.aggFor !== undefined && match.aggAgainst !== undefined ? `${match.aggFor}-${match.aggAgainst} on aggregate` : null,
        match.decidedBy === 'penalties' ? Number.isInteger(match.pensFor) && Number.isInteger(match.pensAgainst)
          ? `${match.pensFor}-${match.pensAgainst} on penalties` : 'Settled on penalties. Penalty score not recorded.'
          : match.decidedBy === 'awayGoals' ? 'Settled on away goals' : match.decidedBy === 'extraTime' || match.afterExtraTime ? 'After extra time' : null,
      ].filter(Boolean);
      matches.push({ round: `${roundName(match.round)}${showLeg ? `, leg ${match.leg}` : ''}`, opponent: match.opponent,
        goalsFor: match.goalsFor, goalsAgainst: match.goalsAgainst, playerGoals: match.playerGoals,
        ...(showLeg ? { home: match.home } : {}),
        result: match.decidedBy ? match.won ? 'Through' : 'Out' : undefined, note: notes.join(' · ') || undefined,
      });
    }
    competitions.push({ id: 'club', name: run.competition ?? 'European club cup', result: run.result, matches, note: run.simplified });
  } else if (row.championsLeague || row.clubCupTitle) {
    competitions.push({ id: 'club', name: row.clubCupTitle ?? 'European club cup', result: 'Winners', matches: [], note: 'The match details for this season were not kept in this save.' });
  }
  return competitions;
}
