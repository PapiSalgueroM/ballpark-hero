// NBA Conquest battle simulation (item 90). Parallel to conquestBattle.ts
// rather than a parameterized version of it: conquestBattle.ts imports
// TEAM_MAP and ConquestPlayer directly from '@/data/conquestData' (NFL) at
// module scope inside getPlayersByPos/simulateDetailedBattle, so swapping
// in NBA_TEAM_MAP there would mean editing the NFL-only battle engine
// itself. Per the task's stated preference order, that qualifies as
// "invasive," so this file forks only the team-coupled functions
// (getPlayersByPos, generatePlay, generateFullGameStats,
// simulateDetailedBattle) and re-imports every team-shape-agnostic piece
// (compositeAttackerWinProb, HOME_FIELD_BUMP, generateFinalScore's snapping
// logic reimplemented identically below since it's private/unexported in
// conquestBattle.ts) so the two engines share their actual math, not just
// their file layout. NFL's conquestBattle.ts is never modified by this file.

import { NBA_TEAM_MAP, NbaPlayer } from '@/data/conquestDataNba';
import { TEAM_LEGENDS_NBA } from '@/data/conquestDataNba';
import { compositeAttackerWinProb, HOME_FIELD_BUMP } from '@/lib/conquestBattle';

/* ── Types (identical shape to conquestBattle.ts's, kept separate so this
   file has zero import coupling to the NFL module beyond the two pure
   exports above) ── */

export interface PlayEvent {
  description: string;
  attScore: number;
  defScore: number;
  yards: number;
  type: 'pass' | 'rush' | 'sack' | 'interception' | 'fumble' | 'field_goal' | 'punt';
  team: 'att' | 'def';
}

export interface TeamStatLine {
  passingQb: string;
  passingComp: number;
  passingAtt: number;
  passingYds: number;
  passingTds: number;
  passingInts: number;
  rushingName: string;
  rushingCarries: number;
  rushingYds: number;
  rushingTds: number;
  receivingName: string;
  receivingCatches: number;
  receivingYds: number;
  receivingTds: number;
  defenseName: string;
  defenseStat: string;
}

export interface BoxScore {
  attStats: TeamStatLine;
  defStats: TeamStatLine;
}

export interface BattleSimulation {
  plays: PlayEvent[];
  finalAttScore: number;
  finalDefScore: number;
  winner: 'att' | 'def';
  boxScore: BoxScore;
}

export { HOME_FIELD_BUMP };

/* ── Helpers ── */

function getPlayersByPos(roster: string[], teamId: string) {
  const team = NBA_TEAM_MAP.get(teamId);
  const legend = TEAM_LEGENDS_NBA[teamId];
  const playerMap = new Map((team?.players || []).map(p => [p.name, p]));

  if (legend && roster.includes(legend.name) && !playerMap.has(legend.name)) {
    playerMap.set(legend.name, { name: legend.name, position: legend.position, overall: 99, keyStat: 'Legend' });
  }

  const all = roster.map(name => playerMap.get(name) || { name, position: '?', overall: 75, keyStat: '' });

  // NBA position buckets replace NFL's QB/RB/WR/TE/DL/LB/DB split. "Ball
  // handlers" (guards) drive the passing-equivalent stat line, "scorers"
  // (forwards/centers) drive the rushing-equivalent, "bigs" drive the
  // receiving-equivalent rim finishing, and everyone contributes to the
  // defense stat line.
  return {
    guards: all.filter(p => p.position.includes('G')),
    forwards: all.filter(p => p.position.includes('F')),
    centers: all.filter(p => p.position.includes('C')),
    all,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ratingCheck(offOvr: number, defOvr: number): boolean {
  return Math.random() < offOvr / (offOvr + defOvr);
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function randInt(lo: number, hi: number) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

/* ── Generate a single visible play (basketball possessions) ── */

interface PlayResult {
  description: string;
  type: PlayEvent['type'];
  yards: number;
  points: number;
  isTd?: boolean;
  offPlayerName?: string;
  defPlayerName?: string;
}

function generatePlay(
  offTeamId: string, defTeamId: string,
  offRoster: string[], defRoster: string[],
  upgradeTeam: string | null, upgradedPlayer: string | null,
): PlayResult {
  const off = getPlayersByPos(offRoster, offTeamId);
  const def = getPlayersByPos(defRoster, defTeamId);

  const getOvr = (p: NbaPlayer) => {
    if ((upgradeTeam === offTeamId || upgradeTeam === defTeamId) && upgradedPlayer === p.name) return 99;
    return p.overall;
  };

  const ballHandler = off.guards[0] || pick(off.all);
  const scorer = off.forwards.length > 0 ? pick(off.forwards) : pick(off.all);
  const bigMan = off.centers[0] || pick(off.all);
  const defPlayers = [...def.guards, ...def.forwards, ...def.centers];
  const defPlayer = defPlayers.length > 0 ? pick(defPlayers) : pick(def.all);

  const roll = Math.random();

  // Three-point attempt (~35%)
  if (roll < 0.35) {
    const shooter = pick([ballHandler, scorer]);
    const offRating = getOvr(shooter);
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      const made = Math.random() < 0.42;
      if (made) {
        return {
          description: `${shooter.name} drills a three! 🎯`,
          type: 'pass', yards: 3, points: 3, isTd: true,
          offPlayerName: shooter.name, defPlayerName: defPlayer.name,
        };
      }
      return {
        description: `${shooter.name}'s three rims out, ${defPlayer.name} grabs the board`,
        type: 'pass', yards: 0, points: 0,
        offPlayerName: shooter.name, defPlayerName: defPlayer.name,
      };
    }
    return {
      description: `${defPlayer.name} contests hard, ${shooter.name} bricks the three`,
      type: 'sack', yards: 0, points: 0,
      offPlayerName: shooter.name, defPlayerName: defPlayer.name,
    };
  }

  // Drive / paint scoring (~40%)
  if (roll < 0.75) {
    const driver = pick([ballHandler, scorer, bigMan]);
    const offRating = getOvr(driver);
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      const andOne = Math.random() < 0.12;
      return {
        description: andOne
          ? `${driver.name} finishes through contact for the and-one! 💥`
          : `${driver.name} drives and finishes at the rim`,
        type: 'rush', yards: 2, points: andOne ? 3 : 2, isTd: andOne,
        offPlayerName: driver.name, defPlayerName: defPlayer.name,
      };
    }
    if (Math.random() < 0.3) {
      return {
        description: `${defPlayer.name} strips ${driver.name}! Turnover!`,
        type: 'fumble', yards: 0, points: 0,
        offPlayerName: driver.name, defPlayerName: defPlayer.name,
      };
    }
    return {
      description: `${defPlayer.name} blocks ${driver.name} at the rim!`,
      type: 'interception', yards: 0, points: 0,
      offPlayerName: driver.name, defPlayerName: defPlayer.name,
    };
  }

  // Free throws (~15%)
  if (roll < 0.90) {
    const shooter = pick(off.all);
    const made = Math.random() < 0.76;
    return {
      description: made
        ? `${shooter.name} steps to the line and knocks down both free throws`
        : `${shooter.name} misses at the charity stripe`,
      type: 'field_goal', yards: 0, points: made ? 2 : 0,
      offPlayerName: shooter.name,
    };
  }

  // Turnover on the possession (~10%)
  return {
    description: `${defPlayer.name} picks off the pass! Fast break the other way!`,
    type: 'interception', yards: 0, points: 0,
    defPlayerName: defPlayer.name,
  };
}

/* ── Generate realistic NBA final scores ── */

function generateFinalScore(
  attRating: number, defRating: number,
  attOffense: number, attDefense: number,
  defOffense: number, defDefense: number,
  attTerr: number, defTerr: number,
  playByPlayAttScore: number, playByPlayDefScore: number,
): { attScore: number; defScore: number } {
  const attWinProb = compositeAttackerWinProb(attOffense, attDefense, defOffense, defDefense, attTerr, defTerr);
  const attackerWins = Math.random() < attWinProb;
  const isCloseGame = Math.random() < 0.40;

  // NBA scoring range: winners typically 102-128, losers 90-120.
  const winnerBaseMin = 102;
  const winnerBaseMax = 128;
  const winnerRating = attackerWins ? attRating : defRating;
  const ratingBonus = ((winnerRating - 75) / 25) * 6;
  let winnerScore = randInt(winnerBaseMin, winnerBaseMax) + Math.round(ratingBonus * Math.random());
  winnerScore = clamp(winnerScore, 95, 135);

  let loserScore: number;
  if (isCloseGame) {
    const margin = randInt(1, 8);
    loserScore = winnerScore - margin;
  } else {
    const margin = randInt(9, 25);
    loserScore = winnerScore - margin;
  }
  loserScore = clamp(loserScore, 85, winnerScore - 1);

  let attScore = attackerWins ? winnerScore : loserScore;
  let defScore = attackerWins ? loserScore : winnerScore;

  attScore = Math.max(attScore, playByPlayAttScore);
  defScore = Math.max(defScore, playByPlayDefScore);

  if (attScore === defScore) {
    if (attackerWins) attScore += 2;
    else defScore += 2;
  }

  return { attScore, defScore };
}

/* ── Generate full-game stats based on final scores & ratings ── */

function generateFullGameStats(
  teamId: string, roster: string[],
  score: number, upgradeTeam: string | null, upgradedPlayer: string | null,
): TeamStatLine {
  const pos = getPlayersByPos(roster, teamId);

  const getOvr = (p: NbaPlayer) => {
    if (upgradeTeam === teamId && upgradedPlayer === p.name) return 99;
    return p.overall;
  };

  // Ball handler line stands in for "passing": points + assists.
  const guard = pos.guards[0] || pick(pos.all);
  const guardOvr = getOvr(guard);
  const guardFactor = guardOvr / 85;
  const guardPts = Math.round(clamp((14 + score * 0.16) * guardFactor + randInt(-3, 3), 8, 42));
  const guardAst = clamp(Math.round(4 + (guardOvr - 75) * 0.12 + randInt(0, 4)), 2, 14);

  // Top scorer line stands in for "rushing": points + field goals.
  const scorer = pos.forwards[0] || pick(pos.all);
  const scorerOvr = getOvr(scorer);
  const scorerFactor = scorerOvr / 85;
  const scorerPts = Math.round(clamp((16 + score * 0.18) * scorerFactor + randInt(-3, 3), 8, 45));
  const scorerFgm = clamp(Math.round(scorerPts / randInt(2, 3)), 3, 18);

  // Big man line stands in for "receiving": points + rebounds.
  const big = pos.centers[0] || pick(pos.all);
  const bigOvr = getOvr(big);
  const bigFactor = bigOvr / 85;
  const bigPts = Math.round(clamp((10 + score * 0.10) * bigFactor + randInt(-3, 3), 4, 30));
  const bigReb = clamp(Math.round(6 + (bigOvr - 75) * 0.15 + randInt(0, 6)), 3, 20);

  // Defense stat: steals/blocks from the best defensive player available.
  const defPlayers = [...pos.guards, ...pos.forwards, ...pos.centers];
  const topDefender = defPlayers.length > 0 ? defPlayers.reduce((a, b) => getOvr(a) > getOvr(b) ? a : b) : pick(pos.all);
  const defOvr = getOvr(topDefender);
  const isBlockGuy = topDefender.position.includes('C') || topDefender.position.includes('F');
  let defenseStat: string;
  if (isBlockGuy && Math.random() < 0.55) {
    const blocks = clamp(Math.round(1 + (defOvr - 80) * 0.05 + Math.random()), 1, 6);
    defenseStat = `${blocks} block${blocks > 1 ? 's' : ''}`;
  } else {
    const steals = clamp(Math.round(1 + (defOvr - 75) * 0.04 + Math.random()), 0, 5);
    defenseStat = `${steals} steal${steals !== 1 ? 's' : ''}`;
  }

  return {
    passingQb: guard.name,
    passingComp: guardAst, passingAtt: guardAst + randInt(1, 3), passingYds: guardPts, passingTds: Math.round(guardAst / 3), passingInts: randInt(0, 2),
    rushingName: scorer.name,
    rushingCarries: scorerFgm, rushingYds: scorerPts, rushingTds: Math.round(scorerFgm / 6),
    receivingName: big.name,
    receivingCatches: bigReb, receivingYds: bigPts, receivingTds: Math.round(bigReb / 8),
    defenseName: topDefender.name,
    defenseStat,
  };
}

/* ── Main Simulation ── */

export interface TeamRatingOverride {
  offense: number;
  defense: number;
}

export function simulateDetailedBattleNba(
  attackerId: string,
  defenderId: string,
  territories: Record<string, string | null>,
  rosters: Record<string, string[]>,
  upgradeTeam: string | null,
  upgradedPlayer: string | null,
  ratingOverrides?: Record<string, TeamRatingOverride>,
): BattleSimulation {
  const attTeam = NBA_TEAM_MAP.get(attackerId)!;
  const defTeam = NBA_TEAM_MAP.get(defenderId)!;
  const aTerr = Object.values(territories).filter(t => t === attackerId).length;
  const dTerr = Object.values(territories).filter(t => t === defenderId).length;

  const attOffense = ratingOverrides?.[attackerId]?.offense ?? attTeam.offense;
  const attDefense = ratingOverrides?.[attackerId]?.defense ?? attTeam.defense;
  const defOffense = ratingOverrides?.[defenderId]?.offense ?? defTeam.offense;
  const defDefense = ratingOverrides?.[defenderId]?.defense ?? defTeam.defense;

  const attRoster = rosters[attackerId] || [];
  const defRoster = rosters[defenderId] || [];

  const numPlays = randInt(6, 8);
  const plays: PlayEvent[] = [];
  let pbpAttScore = 0, pbpDefScore = 0;

  for (let i = 0; i < numPlays; i++) {
    const isAttPossession = i % 2 === 0;
    const offTeamId = isAttPossession ? attackerId : defenderId;
    const defTeamId2 = isAttPossession ? defenderId : attackerId;
    const offRoster = isAttPossession ? attRoster : defRoster;
    const defRosterFor = isAttPossession ? defRoster : attRoster;
    const side: 'att' | 'def' = isAttPossession ? 'att' : 'def';

    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, upgradeTeam, upgradedPlayer);

    if (side === 'att') pbpAttScore += play.points;
    else pbpDefScore += play.points;

    plays.push({
      description: play.description,
      attScore: pbpAttScore,
      defScore: pbpDefScore,
      yards: play.yards,
      type: play.type,
      team: side,
    });
  }

  const { attScore: finalAttScore, defScore: finalDefScore } = generateFinalScore(
    attTeam.rating, defTeam.rating,
    attOffense, attDefense, defOffense, defDefense,
    aTerr, dTerr,
    pbpAttScore, pbpDefScore,
  );

  const winner: 'att' | 'def' = finalAttScore > finalDefScore ? 'att' : 'def';

  const attStats = generateFullGameStats(attackerId, attRoster, finalAttScore, upgradeTeam, upgradedPlayer);
  const defStats = generateFullGameStats(defenderId, defRoster, finalDefScore, upgradeTeam, upgradedPlayer);

  return {
    plays,
    finalAttScore,
    finalDefScore,
    winner,
    boxScore: { attStats, defStats },
  };
}
