import { TEAM_MAP, ConquestPlayer } from '@/data/conquestData';
import { TEAM_LEGENDS } from '@/data/conquestPowerups';
import { winProbability } from '@/lib/perfectSeason';

/* ── Types ── */

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
  defenseStat: string; // e.g. "3 sacks" or "8 tackles"
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

/* ── Helpers ── */

function getPlayersByPos(roster: string[], teamId: string) {
  const team = TEAM_MAP.get(teamId);
  const legend = TEAM_LEGENDS[teamId];
  const playerMap = new Map((team?.players || []).map(p => [p.name, p]));

  if (legend && roster.includes(legend.name) && !playerMap.has(legend.name)) {
    playerMap.set(legend.name, { name: legend.name, position: legend.position, overall: 99, keyStat: 'Legend' });
  }

  const all = roster.map(name => playerMap.get(name) || { name, position: '?', overall: 75, keyStat: '' });

  return {
    qbs: all.filter(p => p.position === 'QB'),
    rbs: all.filter(p => p.position === 'RB'),
    wrs: all.filter(p => p.position === 'WR'),
    tes: all.filter(p => p.position === 'TE'),
    dls: all.filter(p => ['DE', 'DT'].includes(p.position)),
    lbs: all.filter(p => p.position === 'LB'),
    dbs: all.filter(p => ['CB', 'S'].includes(p.position)),
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

/* ── Generate a single visible play ── */

interface PlayResult {
  description: string;
  type: PlayEvent['type'];
  yards: number;
  points: number;
  passingYds?: number;
  rushingYds?: number;
  isCompletion?: boolean;
  isSack?: boolean;
  isInt?: boolean;
  isTd?: boolean;
  offPlayerName?: string;   // QB / rusher
  recPlayerName?: string;   // receiver
  defPlayerName?: string;   // defender
}

function generatePlay(
  offTeamId: string, defTeamId: string,
  offRoster: string[], defRoster: string[],
  upgradeTeam: string | null, upgradedPlayer: string | null,
): PlayResult {
  const off = getPlayersByPos(offRoster, offTeamId);
  const def = getPlayersByPos(defRoster, defTeamId);

  const getOvr = (p: ConquestPlayer) => {
    if ((upgradeTeam === offTeamId || upgradeTeam === defTeamId) && upgradedPlayer === p.name) return 99;
    return p.overall;
  };

  const qb = off.qbs[0] || pick(off.all);
  const receivers = [...off.wrs, ...off.tes];
  const rushers = off.rbs.length > 0 ? off.rbs : [pick(off.all)];
  const defPlayers = [...def.dls, ...def.lbs, ...def.dbs];
  const defPlayer = defPlayers.length > 0 ? pick(defPlayers) : pick(def.all);

  const roll = Math.random();

  // Pass play (~55%)
  if (roll < 0.55 && receivers.length > 0) {
    const target = pick(receivers);
    const offRating = (getOvr(qb) + getOvr(target)) / 2;
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      const yards = randInt(5, 44);
      const isTd = yards > 28 && Math.random() < 0.35;
      return {
        description: isTd
          ? `${qb.name} launches a ${yards}-yard TD strike to ${target.name}! 🏈`
          : `${qb.name} throws a ${yards}-yard pass to ${target.name}`,
        type: 'pass', yards, points: isTd ? 7 : 0,
        passingYds: yards, isCompletion: true, isTd,
        offPlayerName: qb.name, recPlayerName: target.name, defPlayerName: defPlayer.name,
      };
    } else {
      if (Math.random() < 0.6) {
        const sackYds = randInt(3, 14);
        return {
          description: `${defPlayer.name} sacks ${qb.name} for a ${sackYds}-yard loss!`,
          type: 'sack', yards: -sackYds, points: 0,
          isSack: true, offPlayerName: qb.name, defPlayerName: defPlayer.name,
        };
      }
      return {
        description: `${defPlayer.name} intercepts ${qb.name}! Turnover!`,
        type: 'interception', yards: 0, points: 0,
        isInt: true, offPlayerName: qb.name, defPlayerName: defPlayer.name,
      };
    }
  }

  // Rush play (~35%)
  if (roll < 0.90) {
    const runner = pick(rushers);
    const offRating = getOvr(runner);
    const defRating = getOvr(defPlayer);

    if (ratingCheck(offRating, defRating)) {
      const yards = randInt(2, 32);
      const isTd = yards > 18 && Math.random() < 0.3;
      return {
        description: isTd
          ? `${runner.name} breaks free for a ${yards}-yard rushing TD! 💨`
          : `${runner.name} rushes for ${yards} yards`,
        type: 'rush', yards, points: isTd ? 7 : 0,
        rushingYds: yards, isTd,
        offPlayerName: runner.name, defPlayerName: defPlayer.name,
      };
    }
    if (Math.random() < 0.25) {
      return {
        description: `${defPlayer.name} forces a fumble from ${runner.name}! Turnover!`,
        type: 'fumble', yards: 0, points: 0,
        offPlayerName: runner.name, defPlayerName: defPlayer.name,
      };
    }
    const yards = randInt(-1, 2);
    return {
      description: `${runner.name} stuffed by ${defPlayer.name} for ${yards <= 0 ? 'no gain' : `${yards} yard${yards > 1 ? 's' : ''}`}`,
      type: 'rush', yards: Math.max(yards, 0), points: 0,
      rushingYds: Math.max(yards, 0),
      offPlayerName: runner.name, defPlayerName: defPlayer.name,
    };
  }

  // Field goal (~10%)
  const distance = randInt(25, 52);
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

/* ── Win probability (Wave B: perfectSeason logistic composite) ── */

// Home-field advantage (item 89): the defender is always defending its own
// turf in Conquest's attacker-picks-a-direction model, so it gets a flat
// rating bump in both matchup legs below. Kept small and constant (not
// territory-scaled) so it reads as a stable "home edge" rather than another
// version of the territory bump. Exported so any battle-header UI can
// display the exact number being applied instead of a hardcoded copy of it.
export const HOME_FIELD_BUMP = 2;

/**
 * Composite win probability for the attacker, built from perfectSeason's
 * winProbability (logistic, clamped .05-.985) applied to two head-to-head
 * matchups: attacker offense vs defender defense, and defender offense vs
 * attacker defense. Each matchup is expressed as an "overall" centered the
 * same way perfectSeason expects (delta added to the 77 baseline it anchors
 * on), then the two probabilities are combined into one attacker win prob.
 * Territory counts convert to a modest rating bump rather than a flat power
 * addition, so a big territorial lead nudges the odds without swamping the
 * underlying O/D matchup. The defender also gets HOME_FIELD_BUMP added to
 * both its defense (matchup 1) and its offense (matchup 2), since it is
 * always the team being attacked on its own turf.
 */
export function compositeAttackerWinProb(
  attOffense: number, attDefense: number,
  defOffense: number, defDefense: number,
  attTerr: number, defTerr: number,
): number {
  // Territory bonus: +1 rating point per 3 states of net lead, capped at +/-6.
  const terrBump = clamp((attTerr - defTerr) / 3, -6, 6);

  // Home edge: defender's ratings get a small bump in both legs below,
  // modeling "defending home turf" (item 89).
  const homeDefDefense = defDefense + HOME_FIELD_BUMP;
  const homeDefOffense = defOffense + HOME_FIELD_BUMP;

  // Matchup 1: attacker's offense driving against defender's (home-boosted)
  // defense. Expressed as an overall centered on 77 (perfectSeason's pivot)
  // plus the gap between the two ratings, so a bigger gap pushes further
  // from 50/50.
  const attOffVsDefDef = 77 + (attOffense - homeDefDefense) + terrBump;
  const attOffenseWinProb = winProbability(attOffVsDefDef);

  // Matchup 2: defender's (home-boosted) offense driving against attacker's
  // defense. This is the probability the DEFENDER wins that half of the
  // exchange, so we take its complement to get the attacker's side.
  const defOffVsAttDef = 77 + (homeDefOffense - attDefense) - terrBump;
  const attDefenseWinProb = 1 - winProbability(defOffVsAttDef);

  // Combine the two halves (average keeps both matchups honest rather than
  // letting one lopsided side dominate), then re-clamp to perfectSeason's
  // upset-preserving bounds.
  const combined = (attOffenseWinProb + attDefenseWinProb) / 2;
  return clamp(combined, 0.05, 0.985);
}

/* ── Generate realistic NFL final scores ── */

function generateFinalScore(
  attRating: number, defRating: number,
  attOffense: number, attDefense: number,
  defOffense: number, defDefense: number,
  attTerr: number, defTerr: number,
  playByPlayAttScore: number, playByPlayDefScore: number,
): { attScore: number; defScore: number } {
  const attWinProb = compositeAttackerWinProb(attOffense, attDefense, defOffense, defDefense, attTerr, defTerr);

  const attackerWins = Math.random() < attWinProb;

  // Determine if it's a close game (~40% of the time, margin ≤ 7)
  const isCloseGame = Math.random() < 0.40;

  // Common NFL score ranges
  // Winners typically score 17-38, losers 10-31
  const winnerBaseMin = 17;
  const winnerBaseMax = 38;
  const winnerRating = attackerWins ? attRating : defRating;
  // Scale winner score slightly by rating (higher rated = slightly higher ceiling)
  const ratingBonus = ((winnerRating - 75) / 25) * 5; // ~0-5 pts
  let winnerScore = randInt(winnerBaseMin, winnerBaseMax) + Math.round(ratingBonus * Math.random());
  winnerScore = clamp(winnerScore, 13, 42);

  let loserScore: number;
  if (isCloseGame) {
    // Close game: margin 1-7 points
    const margin = randInt(1, 7);
    loserScore = winnerScore - margin;
    // Make sure common close scores happen: 3-pt and 7-pt margins
    if (Math.random() < 0.4) {
      loserScore = winnerScore - pick([3, 7]);
    }
  } else {
    // Bigger margin: 8-21 points
    const margin = randInt(8, 21);
    loserScore = winnerScore - margin;
  }

  // Ensure loser scores at least 3, typically at least 10
  loserScore = clamp(loserScore, Math.random() < 0.08 ? 3 : 10, winnerScore - 1);

  // Round to NFL-realistic scores (multiples of 7 and 3 combos)
  // Make scores end in common NFL digits
  winnerScore = snapToNflScore(winnerScore);
  loserScore = snapToNflScore(loserScore);

  // Ensure winner still wins after snapping
  if (loserScore >= winnerScore) {
    loserScore = winnerScore - pick([3, 7]);
  }
  loserScore = Math.max(loserScore, 3);

  let attScore = attackerWins ? winnerScore : loserScore;
  let defScore = attackerWins ? loserScore : winnerScore;

  // CONSISTENCY: Ensure final scores are consistent with play-by-play
  // If a team scored points in PBP, their final score must be >= that
  attScore = Math.max(attScore, playByPlayAttScore);
  defScore = Math.max(defScore, playByPlayDefScore);

  // Re-ensure there's a winner (no ties)
  if (attScore === defScore) {
    if (attackerWins) attScore += 3;
    else defScore += 3;
  }

  return { attScore, defScore };
}

function snapToNflScore(score: number): number {
  // Common NFL scores: 3, 6, 7, 9, 10, 13, 14, 16, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 37, 38
  const common = [3, 6, 7, 10, 13, 14, 16, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 37, 38, 41, 42];
  let best = common[0], bestDist = Math.abs(score - common[0]);
  for (const c of common) {
    const d = Math.abs(score - c);
    if (d < bestDist) { best = c; bestDist = d; }
  }
  return best;
}

/* ── Generate full-game stats based on final scores & ratings ── */

function generateFullGameStats(
  teamId: string, roster: string[],
  score: number, upgradeTeam: string | null, upgradedPlayer: string | null,
): TeamStatLine {
  const pos = getPlayersByPos(roster, teamId);

  const getOvr = (p: ConquestPlayer) => {
    if (upgradeTeam === teamId && upgradedPlayer === p.name) return 99;
    return p.overall;
  };

  // QB stats, scale by rating
  const qb = pos.qbs[0] || pick(pos.all);
  const qbOvr = getOvr(qb);
  const qbFactor = qbOvr / 85; // normalise around 85 OVR
  const passingYds = Math.round(clamp((150 + score * 5) * qbFactor + randInt(-30, 30), 120, 420));
  const passingAtt = clamp(Math.round(passingYds / randInt(6, 9)), 18, 42);
  const completionPct = clamp(0.55 + (qbOvr - 75) * 0.005 + Math.random() * 0.08 - 0.04, 0.50, 0.78);
  const passingComp = clamp(Math.round(passingAtt * completionPct), 10, passingAtt);
  // TDs from passing: roughly 1 per 7 points scored, with some going to rushing
  const totalTds = Math.max(Math.floor(score / 7), 0);
  const passTdShare = Math.random() < 0.65 ? Math.ceil(totalTds * 0.65) : Math.floor(totalTds * 0.5);
  const passingTds = clamp(passTdShare, 0, 5);
  const passingInts = Math.random() < (0.5 - (qbOvr - 75) * 0.01) ? randInt(1, 2) : 0;

  // Rushing stats
  const topRusher = pos.rbs[0] || pick(pos.all);
  const rushOvr = getOvr(topRusher);
  const rushFactor = rushOvr / 85;
  const rushingYds = Math.round(clamp((40 + score * 2.5) * rushFactor + randInt(-20, 20), 25, 180));
  const rushingCarries = clamp(Math.round(rushingYds / randInt(3, 6)), 8, 28);
  const rushingTds = clamp(totalTds - passingTds, 0, 3);

  // Receiving stats
  const topReceiver = pos.wrs[0] || pos.tes[0] || pick(pos.all);
  const recOvr = getOvr(topReceiver);
  const recFactor = recOvr / 85;
  const receivingYds = Math.round(clamp(passingYds * (0.3 + Math.random() * 0.2) * recFactor, 30, 180));
  const receivingCatches = clamp(Math.round(receivingYds / randInt(8, 15)), 2, 12);
  const receivingTds = clamp(Math.min(passingTds, randInt(0, 2)), 0, passingTds);

  // Defense stats
  const defPlayers = [...pos.dls, ...pos.lbs, ...pos.dbs];
  const topDefender = defPlayers.length > 0 ? defPlayers.reduce((a, b) => getOvr(a) > getOvr(b) ? a : b) : pick(pos.all);
  const defOvr = getOvr(topDefender);
  const isSackGuy = ['DE', 'DT', 'LB'].includes(topDefender.position);
  let defenseStat: string;
  if (isSackGuy && Math.random() < 0.6) {
    const sacks = clamp(Math.round(1 + (defOvr - 80) * 0.05 + Math.random()), 1, 4);
    defenseStat = `${sacks} sack${sacks > 1 ? 's' : ''}`;
  } else {
    const tackles = clamp(Math.round(5 + (defOvr - 75) * 0.1 + randInt(0, 4)), 4, 14);
    defenseStat = `${tackles} tackles`;
  }

  return {
    passingQb: qb.name,
    passingComp, passingAtt, passingYds, passingTds, passingInts,
    rushingName: topRusher.name,
    rushingCarries, rushingYds, rushingTds,
    receivingName: topReceiver.name,
    receivingCatches, receivingYds, receivingTds,
    defenseName: topDefender.name,
    defenseStat,
  };
}

/* ── Main Simulation ── */

export interface TeamRatingOverride {
  offense: number;
  defense: number;
}

export function simulateDetailedBattle(
  attackerId: string,
  defenderId: string,
  territories: Record<string, string | null>,
  rosters: Record<string, string[]>,
  upgradeTeam: string | null,
  upgradedPlayer: string | null,
  // Power-rankings-adjusted O/D ratings (item 86). When supplied, these
  // override the static conquestData.ts offense/defense so the panel's
  // in-run adjustments actually drive the odds instead of just being cosmetic.
  ratingOverrides?: Record<string, TeamRatingOverride>,
): BattleSimulation {
  const attTeam = TEAM_MAP.get(attackerId)!;
  const defTeam = TEAM_MAP.get(defenderId)!;
  const aTerr = Object.values(territories).filter(t => t === attackerId).length;
  const dTerr = Object.values(territories).filter(t => t === defenderId).length;

  const attOffense = ratingOverrides?.[attackerId]?.offense ?? attTeam.offense;
  const attDefense = ratingOverrides?.[attackerId]?.defense ?? attTeam.defense;
  const defOffense = ratingOverrides?.[defenderId]?.offense ?? defTeam.offense;
  const defDefense = ratingOverrides?.[defenderId]?.defense ?? defTeam.defense;

  const attRoster = rosters[attackerId] || [];
  const defRoster = rosters[defenderId] || [];

  // Step 1: Generate 6-8 visible plays (the "preview")
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

  // Step 2: Generate realistic final scores consistent with PBP
  const { attScore: finalAttScore, defScore: finalDefScore } = generateFinalScore(
    attTeam.rating, defTeam.rating,
    attOffense, attDefense, defOffense, defDefense,
    aTerr, dTerr,
    pbpAttScore, pbpDefScore,
  );

  const winner: 'att' | 'def' = finalAttScore > finalDefScore ? 'att' : 'def';

  // Step 3: Generate full-game box score stats based on final scores
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
