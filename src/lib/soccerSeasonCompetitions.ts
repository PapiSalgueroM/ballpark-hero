import type { CareerState, SeasonRecord, UCLResult } from './soccerCareerEngine';
import { readCupRun } from './soccerCareerCup';
import { isFirstStageResult } from './soccerCareerContinental';
import { readCommunityShield, communityShieldPlayerSide, readGermanSupercup, germanSupercupPlayerSide } from './soccerCareerExtraCups';
import { readClubWorldCup } from './soccerClubWorldCup';

export interface SavedCompetitionMatch {
  round: string;
  opponent: string | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  home?: boolean;
  neutral?: boolean;
  playerGoals?: number;
  result?: string;
  note?: string;
}

export interface SavedSeasonCompetition {
  id: 'domestic' | 'club' | 'shield' | 'german-supercup' | 'club-world-cup';
  name: string;
  result: string;
  matches: SavedCompetitionMatch[];
  note?: string;
  group?: { label: string; rows: { club: string; played: number; points: number; gf: number; ga: number }[] };
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
  const shield = readCommunityShield(row);
  const side = shield ? communityShieldPlayerSide(shield) : null;
  if (shield && side !== null) {
    const other = side === 0 ? 1 : 0;
    const won = shield.decidedBy === 'penalties'
      ? shield.penalties![side] > shield.penalties![other] : shield.score[side] > shield.score[other];
    const availabilityReason = shield.player.reason === 'unresolved-rehab' ? 'Rehabilitation was still pending.'
      : shield.player.reason === 'pending-generic-suspension' ? 'A suspension was pending; match eligibility was not confirmed.' : '';
    const participation = shield.player.selected
      ? `You played: ${shield.player.apps} app, ${shield.player.assists} assists, ${shield.player.cleanSheets} clean sheets, rating ${shield.player.rating!.toFixed(1)}. Already included in your season totals.`
      : `${shield.player.availability === 'unknown' ? 'Your availability was not confirmed.' : shield.player.availability === 'unavailable' ? 'You were unavailable.' : 'You were not selected.'}${availabilityReason ? ` ${availabilityReason}` : ''} You did not play, so no appearance or personal Shield trophy is added.`;
    const note = [
      `Opening match in ${shield.eventYear}.`,
      shield.decidedBy === 'penalties' ? `${shield.penalties![side]}-${shield.penalties![other]} on penalties. Shootout kicks are separate from the match score and player goals.` : null,
      participation,
    ].filter(Boolean).join(' ');
    competitions.push({ id: 'shield', name: 'Community Shield', result: won ? 'Club won' : 'Club lost',
      matches: [{ round: 'Opening match', opponent: shield.entrants[other].club, goalsFor: shield.score[side], goalsAgainst: shield.score[other],
        neutral: true, ...(shield.player.selected ? { playerGoals: shield.player.goals } : {}), result: won ? 'Club won' : 'Club lost', note }],
    });
  }
  const german = readGermanSupercup(row);
  const germanSide = german ? germanSupercupPlayerSide(german) : null;
  if (german && germanSide !== null) {
    const other = germanSide === 0 ? 1 : 0;
    const won = german.decidedBy === 'penalties'
      ? german.penalties![germanSide] > german.penalties![other] : german.score[germanSide] > german.score[other];
    const reason = german.player.reason === 'unresolved-rehab' ? ' Rehabilitation was still pending.'
      : german.player.reason === 'pending-generic-suspension' ? ' A suspension was pending; match eligibility was not confirmed.' : '';
    const participation = german.player.selected
      ? `You played: ${german.player.apps} app, ${german.player.assists} assists, ${german.player.cleanSheets} clean sheets, rating ${german.player.rating!.toFixed(1)}. Already included in your season totals.`
      : `${german.player.availability === 'unknown' ? 'Your availability was not confirmed.' : german.player.availability === 'unavailable' ? 'You were unavailable.' : 'You were not selected.'}${reason} You did not play, so no appearance or personal German Supercup trophy is added.`;
    const note = [
      `Opening match in ${german.eventYear}.`,
      german.decidedBy === 'penalties' ? `${german.penalties![germanSide]}-${german.penalties![other]} on penalties. Shootout kicks are separate from the match score and player goals.` : null,
      participation,
    ].filter(Boolean).join(' ');
    competitions.push({ id: 'german-supercup', name: 'German Supercup', result: won ? 'Club won' : 'Club lost',
      matches: [{ round: 'Opening match', opponent: german.entrants[other].club, goalsFor: german.score[germanSide], goalsAgainst: german.score[other],
        ...(german.player.selected ? { playerGoals: german.player.goals } : {}), result: won ? 'Club won' : 'Club lost', note }],
    });
  }
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
  const worldCup = readClubWorldCup(row);
  if (worldCup) {
    const matches = worldCup.matches.map(match => {
      const home = match.home === worldCup.club;
      const homeScore = match.homeGoals + (match.extraTime?.homeGoals ?? 0);
      const awayScore = match.awayGoals + (match.extraTime?.awayGoals ?? 0);
      const note = [match.extraTime ? 'After extra time.' : '', match.penalties ? `${match.penalties} won on penalties.` : '',
        match.player ? `You played. ${match.player.assists} assists and ${match.player.rating.toFixed(1)} rating.` : 'You did not play.'].filter(Boolean).join(' ');
      return { opponent: home ? match.away : match.home, round: match.stage === 'Group' ? `Group ${worldCup.group}` : match.stage,
        goalsFor: home ? homeScore : awayScore, goalsAgainst: home ? awayScore : homeScore, neutral: true,
        ...(match.player ? { playerGoals: match.player.goals } : {}), note };
    });
    competitions.push({ id: 'club-world-cup', name: '2025 Club World Cup', result: worldCup.result, matches,
      note: `Simulated champion: ${worldCup.champion}. Your campaign: ${worldCup.apps} apps, ${worldCup.goals} goals and ${worldCup.assists} assists.`,
      group: { label: `Group ${worldCup.group}`, rows: worldCup.table } });
  }
  return competitions;
}
