import { TEAM_MAP, ConquestPlayer } from '@/data/conquestData';
import { TEAM_LEGENDS } from '@/data/conquestPowerups';

export interface PlayEvent {
  description: string;
  attScore: number;
  defScore: number;
  yards: number;
  type: 'pass' | 'rush' | 'sack' | 'interception' | 'fumble' | 'field_goal' | 'punt';
  team: 'att' | 'def'; // which team had possession
}

export interface BoxScore {
  attPassYds: number;
  attRushYds: number;
  defPassYds: number;
  defRushYds: number;
  attTopPerformer: string;
  defTopPerformer: string;
}

export interface BattleSimulation {
  plays: PlayEvent[];
  finalAttScore: number;
  finalDefScore: number;
  winner: 'att' | 'def';
  boxScore: BoxScore;
}

function getPlayersByPos(roster: string[], teamId: string): {
  qbs: ConquestPlayer[];
  rbs: ConquestPlayer[];
  wrs: ConquestPlayer[];
  tes: ConquestPlayer[];
  dls: ConquestPlayer[];
  lbs: ConquestPlayer[];
  dbs: ConquestPlayer[];
  ols: ConquestPlayer[];
  all: ConquestPlayer[];
} {
  const team = TEAM_MAP.get(teamId);
  const legend = TEAM_LEGENDS[teamId];
  const playerMap = new Map((team?.players || []).map(p => [p.name, p]));
  
  // Add legend if in roster
  if (legend && roster.includes(legend.name) && !playerMap.has(legend.name)) {
    playerMap.set(legend.name, { name: legend.name, position: legend.position, overall: 99, keyStat: 'Legend' });
  }

  const all = roster.map(name => playerMap.get(name) || { name, position: '?', overall: 75, keyStat: '' });
  
  return {
    qbs: all.filter(p => p.position === 'QB'),
    rbs: all.filter(p => p.position === 'RB'),
    wrs: all.filter(p => ['WR', 'TE'].includes(p.position) && p.position === 'WR'),
    tes: all.filter(p => p.position === 'TE'),
    dls: all.filter(p => ['DE', 'DT'].includes(p.position)),
    lbs: all.filter(p => p.position === 'LB'),
    dbs: all.filter(p => ['CB', 'S'].includes(p.position)),
    ols: all.filter(p => ['OT', 'OG', 'C'].includes(p.position)),
    all,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ratingCheck(offOvr: number, defOvr: number): boolean {
  // Higher rated player wins matchup more often
  const ratio = offOvr / (offOvr + defOvr);
  return Math.random() < ratio;
}

function generatePlay(
  offTeamId: string, defTeamId: string,
  offRoster: string[], defRoster: string[],
  offSide: 'att' | 'def',
  upgradeTeam: string | null,
  upgradedPlayer: string | null,
): { description: string; type: PlayEvent['type']; yards: number; points: number } {
  const off = getPlayersByPos(offRoster, offTeamId);
  const def = getPlayersByPos(defRoster, defTeamId);

  const getOvr = (p: ConquestPlayer) => {
    if (upgradeTeam === offTeamId && upgradedPlayer === p.name) return 99;
    if (upgradeTeam === defTeamId && upgradedPlayer === p.name) return 99;
    return p.overall;
  };

  const qb = off.qbs[0] || pick(off.all);
  const receivers = [...off.wrs, ...off.tes];
  const rushers = off.rbs.length > 0 ? off.rbs : [pick(off.all)];
  const defPlayers = [...def.dls, ...def.lbs, ...def.dbs];
  const defPlayer = defPlayers.length > 0 ? pick(defPlayers) : pick(def.all);

  const playTypeRoll = Math.random();

  // Pass play (~55%)
  if (playTypeRoll < 0.55 && receivers.length > 0) {
    const target = pick(receivers);
    const offRating = (getOvr(qb) + getOvr(target)) / 2;
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      // Completion
      const yards = Math.floor(Math.random() * 40) + 5;
      if (yards > 30 && Math.random() < 0.35) {
        // Touchdown
        return {
          description: `${qb.name} launches a ${yards}-yard TD strike to ${target.name}! 🏈`,
          type: 'pass', yards, points: 7,
        };
      }
      return {
        description: `${qb.name} throws a ${yards}-yard pass to ${target.name}`,
        type: 'pass', yards, points: 0,
      };
    } else {
      // Failed: sack or interception
      if (Math.random() < 0.6) {
        const sackYards = Math.floor(Math.random() * 12) + 3;
        return {
          description: `${defPlayer.name} sacks ${qb.name} for a ${sackYards}-yard loss!`,
          type: 'sack', yards: -sackYards, points: 0,
        };
      } else {
        return {
          description: `${defPlayer.name} intercepts ${qb.name}! Turnover!`,
          type: 'interception', yards: 0, points: 0,
        };
      }
    }
  }

  // Rush play (~35%)
  if (playTypeRoll < 0.90) {
    const runner = pick(rushers);
    const offRating = getOvr(runner);
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      const yards = Math.floor(Math.random() * 30) + 2;
      if (yards > 20 && Math.random() < 0.3) {
        return {
          description: `${runner.name} breaks free for a ${yards}-yard rushing TD! 💨`,
          type: 'rush', yards, points: 7,
        };
      }
      return {
        description: `${runner.name} rushes for ${yards} yards`,
        type: 'rush', yards, points: 0,
      };
    } else {
      if (Math.random() < 0.3) {
        return {
          description: `${defPlayer.name} forces a fumble from ${runner.name}! Turnover!`,
          type: 'fumble', yards: 0, points: 0,
        };
      }
      const yards = Math.floor(Math.random() * 3) - 1;
      return {
        description: `${runner.name} stuffed by ${defPlayer.name} for ${yards <= 0 ? 'no gain' : `${yards} yard${yards > 1 ? 's' : ''}`}`,
        type: 'rush', yards: Math.max(yards, 0), points: 0,
      };
    }
  }

  // Field goal (~10%)
  const distance = Math.floor(Math.random() * 25) + 25;
  const kicker = qb; // simplified
  if (Math.random() < 0.75) {
    return {
      description: `${distance}-yard field goal is GOOD! ✅`,
      type: 'field_goal', yards: 0, points: 3,
    };
  }
  return {
    description: `${distance}-yard field goal attempt is NO GOOD! ❌`,
    type: 'field_goal', yards: 0, points: 0,
  };
}

export function simulateDetailedBattle(
  attackerId: string,
  defenderId: string,
  territories: Record<string, string | null>,
  rosters: Record<string, string[]>,
  upgradeTeam: string | null,
  upgradedPlayer: string | null,
): BattleSimulation {
  const attTeam = TEAM_MAP.get(attackerId)!;
  const defTeam = TEAM_MAP.get(defenderId)!;
  const aTerr = Object.values(territories).filter(t => t === attackerId).length;
  const dTerr = Object.values(territories).filter(t => t === defenderId).length;

  const attRoster = rosters[attackerId] || [];
  const defRoster = rosters[defenderId] || [];

  // Generate 6-8 plays, alternating possession
  const numPlays = 6 + Math.floor(Math.random() * 3);
  const plays: PlayEvent[] = [];
  let attScore = 0, defScore = 0;
  let attPassYds = 0, attRushYds = 0, defPassYds = 0, defRushYds = 0;
  const playerYards: Record<string, number> = {};

  for (let i = 0; i < numPlays; i++) {
    const isAttPossession = i % 2 === 0;
    const offTeamId = isAttPossession ? attackerId : defenderId;
    const defTeamId2 = isAttPossession ? defenderId : attackerId;
    const offRoster = isAttPossession ? attRoster : defRoster;
    const defRosterFor = isAttPossession ? defRoster : attRoster;
    const side: 'att' | 'def' = isAttPossession ? 'att' : 'def';

    const play = generatePlay(offTeamId, defTeamId2, offRoster, defRosterFor, side, upgradeTeam, upgradedPlayer);

    if (side === 'att') {
      attScore += play.points;
      if (play.type === 'pass') attPassYds += Math.max(play.yards, 0);
      if (play.type === 'rush') attRushYds += Math.max(play.yards, 0);
    } else {
      defScore += play.points;
      if (play.type === 'pass') defPassYds += Math.max(play.yards, 0);
      if (play.type === 'rush') defRushYds += Math.max(play.yards, 0);
    }

    // Track yards for top performer
    const nameMatch = play.description.match(/^([A-Za-z'. -]+?)(?:\s+(?:throws|launches|rushes|breaks))/);
    if (nameMatch) {
      const name = nameMatch[1];
      playerYards[name] = (playerYards[name] || 0) + Math.abs(play.yards);
    }

    plays.push({
      description: play.description,
      attScore,
      defScore,
      yards: play.yards,
      type: play.type,
      team: side,
    });
  }

  // Ensure there's a winner (no ties). Rating-weighted coin flip if tied
  if (attScore === defScore) {
    const attPower = attTeam.rating + aTerr * 0.5;
    const defPower = defTeam.rating + dTerr * 0.5;
    if (Math.random() < attPower / (attPower + defPower)) {
      attScore += 3;
      plays.push({
        description: `Last-second field goal is GOOD! ${attTeam.name} win it! 🎉`,
        attScore, defScore, yards: 0, type: 'field_goal', team: 'att',
      });
    } else {
      defScore += 3;
      plays.push({
        description: `Last-second field goal is GOOD! ${defTeam.name} steal it! 🎉`,
        attScore, defScore, yards: 0, type: 'field_goal', team: 'def',
      });
    }
  }

  // Top performers
  const attPlayerNames = new Set(attRoster);
  const defPlayerNames = new Set(defRoster);
  let attTop = attRoster[0] || 'N/A', defTop = defRoster[0] || 'N/A';
  let attTopYds = 0, defTopYds = 0;
  for (const [name, yds] of Object.entries(playerYards)) {
    if (attPlayerNames.has(name) && yds > attTopYds) { attTop = name; attTopYds = yds; }
    if (defPlayerNames.has(name) && yds > defTopYds) { defTop = name; defTopYds = yds; }
  }

  return {
    plays,
    finalAttScore: attScore,
    finalDefScore: defScore,
    winner: attScore > defScore ? 'att' : 'def',
    boxScore: {
      attPassYds, attRushYds, defPassYds, defRushYds,
      attTopPerformer: `${attTop} (${attTopYds} yds)`,
      defTopPerformer: `${defTop} (${defTopYds} yds)`,
    },
  };
}
