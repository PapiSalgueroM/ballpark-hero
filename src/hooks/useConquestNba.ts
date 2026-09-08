// NBA Conquest game state hook (item 90). Parallel to useConquest.ts by
// design (same phases, same state shape, same action names) so
// ConquestBoardNba.tsx can be a near-verbatim copy of ConquestBoard.tsx
// wired to this hook instead. Duplicated rather than parameterized because
// useConquest.ts imports NFL_TEAMS/TEAM_MAP/INITIAL_TERRITORIES directly at
// module scope in over a dozen places; forking the hook was far less
// invasive than threading a dataset prop through every one of those call
// sites and every helper closure. Every underlying pure helper this hook
// depends on (geometry, adjacency, direction/compass math shape) is still
// shared via conquestData.ts's exports (STATE_POSITIONS, DIRECTIONS,
// DIR_ANGLES, DIR_LABELS, STATE_GEO_COORDS, isLightColor) and
// conquestPowerups.ts's POWERUPS/getRandomPowerup, so nothing
// sport-agnostic is copy-pasted twice.

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  STATE_POSITIONS, DIRECTIONS, DIR_ANGLES, DIR_LABELS, STATE_GEO_COORDS,
} from '@/data/conquestData';
import {
  NBA_TEAMS, NBA_TEAM_MAP, INITIAL_TERRITORIES_NBA,
  CONQUEST_FREE_AGENCY_POOL_NBA, ConquestFreeAgentCandidateNba,
  TEAM_LEGENDS_NBA,
} from '@/data/conquestDataNba';
import { NBA_STATES } from '@/data/usStatesPaths';
import {
  PowerupId, PowerupDef, POWERUPS, getRandomPowerup,
  FreeAgent,
} from '@/data/conquestPowerups';
import { simulateDetailedBattleNba, BattleSimulation, PlayEvent, BoxScore, TeamStatLine, TeamRatingOverride } from '@/lib/conquestBattleNba';

export type Phase =
  | 'ready' | 'animating' | 'battle' | 'steal' | 'gameover'
  | 'powerup_received'
  | 'powerup_use';

export interface BattleResult {
  winner: string;
  loser: string;
  winScore: number;
  loseScore: number;
  simulation?: BattleSimulation;
}

export interface LogEntry {
  turn: number;
  attacker: string;
  defender: string;
  winner: string;
  score: string;
  stolenPlayer?: string;
}

export interface SavedPowerup {
  id: PowerupId;
  label: string;
  icon: string;
}

export interface PowerRankEntry {
  id: string;
  offense: number;
  defense: number;
  overall: number;
  wins: number;
  losses: number;
}

export type { PowerupId, PowerupDef, FreeAgent, BattleSimulation, PlayEvent, BoxScore, TeamStatLine, TeamRatingOverride, ConquestFreeAgentCandidateNba };
export { POWERUPS, TEAM_LEGENDS_NBA, CONQUEST_FREE_AGENCY_POOL_NBA };

const POWER_RANK_WIN_BUMP = 1.5;
const POWER_RANK_LOSS_BUMP = -1.5;
const POWER_RANK_CLAMP = 12;
const EXPANSION_BONUS_BUMP = 1;
const FREE_AGENCY_SIGN_COOLDOWN = 3;
const FREE_AGENCY_SIGN_BUMP = 2;

function clampDrift(v: number) {
  return Math.max(-POWER_RANK_CLAMP, Math.min(POWER_RANK_CLAMP, v));
}

function buildInitialPowerRankDrift(): Record<string, number> {
  const d: Record<string, number> = {};
  NBA_TEAMS.forEach(t => { d[t.id] = 0; });
  return d;
}

function buildInitialTerritories(): Record<string, string | null> {
  const t: Record<string, string | null> = {};
  NBA_STATES.forEach(s => { t[s.id] = INITIAL_TERRITORIES_NBA[s.id] || null; });
  return t;
}

function pickRandomPowerupStates(): Set<string> {
  const terr = buildInitialTerritories();
  const neutralIds = Object.keys(terr).filter(id => terr[id] === null);
  const count = 4 + Math.floor(Math.random() * 4);
  const shuffled = neutralIds.sort(() => Math.random() - 0.5);
  return new Set(shuffled.slice(0, count));
}

function buildInitialRosters(): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  NBA_TEAMS.forEach(t => {
    r[t.id] = t.players && t.players.length > 0
      ? t.players.map(p => p.name)
      : [...t.roster];
  });
  return r;
}

function getTeamGeoCenter(teamId: string, territories: Record<string, string | null>): { lat: number; lon: number } {
  const stateIds = Object.keys(territories).filter(s => territories[s] === teamId);
  if (stateIds.length === 0) return { lat: 39.0, lon: -98.0 };
  let sumLat = 0, sumLon = 0, count = 0;
  for (const sid of stateIds) {
    const geo = STATE_GEO_COORDS[sid];
    if (geo) { sumLat += geo.lat; sumLon += geo.lon; count++; }
  }
  if (count === 0) return { lat: 39.0, lon: -98.0 };
  return { lat: sumLat / count, lon: sumLon / count };
}

function compassBearing(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  let bearing = Math.atan2(dLon, dLat);
  if (bearing < 0) bearing += 2 * Math.PI;
  return bearing;
}

function angleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}

function geoDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const dLon = (lon2 - lon1) * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  return dLat * dLat + dLon * dLon;
}

function getAliveTeamsFrom(territories: Record<string, string | null>): string[] {
  const s = new Set<string>();
  Object.values(territories).forEach(t => { if (t) s.add(t); });
  return Array.from(s);
}

export type TargetResult = { type: 'team'; id: string } | { type: 'neutral'; stateId: string };

function findTarget(teamId: string, direction: string, territories: Record<string, string | null>): TargetResult | null {
  const center = getTeamGeoCenter(teamId, territories);
  const dirAngle = DIR_ANGLES[direction];
  const coneHalf = (67 / 2) * Math.PI / 180;

  let best: TargetResult | null = null;
  let bestDist = Infinity;

  const alive = getAliveTeamsFrom(territories).filter(t => t !== teamId);
  for (const enemy of alive) {
    const ec = getTeamGeoCenter(enemy, territories);
    const bearing = compassBearing(center.lat, center.lon, ec.lat, ec.lon);
    const diff = angleDiff(bearing, dirAngle);
    if (diff <= coneHalf) {
      const dist = geoDist(center.lat, center.lon, ec.lat, ec.lon);
      if (dist < bestDist) { bestDist = dist; best = { type: 'team', id: enemy }; }
    }
  }

  for (const [sid, owner] of Object.entries(territories)) {
    if (owner !== null) continue;
    const geo = STATE_GEO_COORDS[sid];
    if (!geo) continue;
    const bearing = compassBearing(center.lat, center.lon, geo.lat, geo.lon);
    const diff = angleDiff(bearing, dirAngle);
    if (diff <= coneHalf) {
      const dist = geoDist(center.lat, center.lon, geo.lat, geo.lon);
      if (dist < bestDist) { bestDist = dist; best = { type: 'neutral', stateId: sid }; }
    }
  }

  return best;
}

function simulateBattle(
  attacker: string, defender: string,
  territories: Record<string, string | null>,
  rosters: Record<string, string[]>,
  teamUpgrades: Record<string, string>,
  legendPlayers: ReadonlySet<string>,
  ratingOverrides?: Record<string, TeamRatingOverride>,
): BattleResult {
  const sim = simulateDetailedBattleNba(attacker, defender, territories, rosters, null, null, ratingOverrides, teamUpgrades, legendPlayers);

  const winnerId = sim.winner === 'att' ? attacker : defender;
  const loserId = sim.winner === 'att' ? defender : attacker;

  return {
    winner: winnerId,
    loser: loserId,
    winScore: sim.winner === 'att' ? sim.finalAttScore : sim.finalDefScore,
    loseScore: sim.winner === 'att' ? sim.finalDefScore : sim.finalAttScore,
    simulation: sim,
  };
}

function findBorderEnemyStates(teamId: string, territories: Record<string, string | null>): string[] {
  const teamStates = Object.keys(territories).filter(s => territories[s] === teamId);
  const teamCoords = teamStates.map(s => STATE_GEO_COORDS[s]).filter(Boolean);
  const results: string[] = [];

  for (const [sid, owner] of Object.entries(territories)) {
    if (!owner || owner === teamId) continue;
    const geo = STATE_GEO_COORDS[sid];
    if (!geo) continue;
    for (const tc of teamCoords) {
      const dist = geoDist(tc.lat, tc.lon, geo.lat, geo.lon);
      if (dist < 36) {
        results.push(sid);
        break;
      }
    }
  }
  return results;
}

export function useConquestNba() {
  const [territories, setTerritories] = useState(buildInitialTerritories);
  const [rosters, setRosters] = useState(buildInitialRosters);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhaseState] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);
  const [attackingTeam, setAttackingTeam] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [defendingTeam, setDefendingTeam] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [animStartTime, setAnimStartTime] = useState(0);
  const [noEnemyMsg, setNoEnemyMsg] = useState<string | null>(null);
  const [powerupStates, setPowerupStates] = useState<Set<string>>(() => pickRandomPowerupStates());

  const [teamSavedPowerups, setTeamSavedPowerups] = useState<Record<string, SavedPowerup[]>>({});
  const savedPowerupsRef = useRef(teamSavedPowerups);
  savedPowerupsRef.current = teamSavedPowerups;
  const [invincibleTeams, setInvincibleTeams] = useState<Set<string>>(new Set());
  const [teamUpgrades, setTeamUpgrades] = useState<Record<string, string>>({});
  const [battleUpgrades, setBattleUpgrades] = useState<Record<string, string>>({});
  const [legendPlayers, setLegendPlayers] = useState<Set<string>>(new Set());

  const [pendingPowerup, setPendingPowerup] = useState<{ teamId: string; powerup: PowerupDef } | null>(null);
  const pendingPowerupRef = useRef(pendingPowerup);
  pendingPowerupRef.current = pendingPowerup;
  const [powerupUseType, setPowerupUseType] = useState<PowerupId | null>(null);
  const [freeAgentList, setFreeAgentList] = useState<FreeAgent[]>([]);
  const [territoryStolenState, setTerritoryStolenState] = useState<string | null>(null);
  // Round 457: the unclaimed territory an attack is heading for, so the shared
  // map can ring the target before the claim lands.
  const [targetState, setTargetState] = useState<string | null>(null);

  const [visiblePlays, setVisiblePlays] = useState<PlayEvent[]>([]);
  const [playByPlayActive, setPlayByPlayActive] = useState(false);
  const [simulatingRemainder, setSimulatingRemainder] = useState(false);
  const [boxScore, setBoxScore] = useState<BoxScore | null>(null);
  const [stealModalOpen, setStealModalOpen] = useState(false);
  const [pendingBattleApply, setPendingBattleApply] = useState<{ attacker: string; defender: string; result: BattleResult } | null>(null);
  const pendingBattleRef = useRef(pendingBattleApply);
  pendingBattleRef.current = pendingBattleApply;
  const [playerConfirmed, setPlayerConfirmed] = useState<string | null>(null);
  const settlingBattleRef = useRef(false);

  const inFlightBattleRef = useRef<{ team: string; enemyId: string; result: BattleResult } | null>(null);
  const [canSkipBattle, setCanSkipBattle] = useState(false);

  const [powerRankDrift, setPowerRankDrift] = useState<Record<string, number>>(() => buildInitialPowerRankDrift());
  const [powerRankRecord, setPowerRankRecord] = useState<Record<string, { wins: number; losses: number }>>({});

  const [favoriteTeam, setFavoriteTeamState] = useState<string | null>(null);
  const [conquestsSinceSign, setConquestsSinceSign] = useState(0);
  const [signedFreeAgents, setSignedFreeAgents] = useState<string[]>([]);

  const timeoutsRef = useRef<number[]>([]);
  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const addTimeout = (fn: () => void, ms: number) => { timeoutsRef.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => () => clearTimeouts(), []);

  const aliveTeams = useCallback(() => getAliveTeamsFrom(territories), [territories]);

  const buildRatingOverrides = useCallback((): Record<string, TeamRatingOverride> => {
    const overrides: Record<string, TeamRatingOverride> = {};
    NBA_TEAMS.forEach(t => {
      const drift = powerRankDrift[t.id] || 0;
      overrides[t.id] = {
        offense: Math.max(40, Math.min(99, Math.round(t.offense + drift))),
        defense: Math.max(40, Math.min(99, Math.round(t.defense + drift))),
      };
    });
    return overrides;
  }, [powerRankDrift]);

  const powerRankings = useCallback((): PowerRankEntry[] => {
    const overrides = buildRatingOverrides();
    return NBA_TEAMS
      .map(t => {
        const o = overrides[t.id];
        const rec = powerRankRecord[t.id] || { wins: 0, losses: 0 };
        return {
          id: t.id,
          offense: o.offense,
          defense: o.defense,
          overall: Math.round((o.offense + o.defense) / 2),
          wins: rec.wins,
          losses: rec.losses,
        };
      })
      .sort((a, b) => b.overall - a.overall || b.wins - a.wins || a.losses - b.losses);
  }, [buildRatingOverrides, powerRankRecord]);

  const getTeamTerritoryCount = useCallback(
    (teamId: string) => Object.values(territories).filter(t => t === teamId).length,
    [territories],
  );

  const buildFreeAgentList = useCallback(() => {
    const activeRosterNames = new Set<string>();
    const alive = getAliveTeamsFrom(territories);
    for (const tid of alive) {
      for (const name of (rosters[tid] || [])) activeRosterNames.add(name);
    }

    const agents: FreeAgent[] = [];
    const offered = new Set<string>();

    for (const elimId of eliminated) {
      const team = NBA_TEAM_MAP.get(elimId);
      if (!team) continue;
      for (const p of (team.players || [])) {
        if (!activeRosterNames.has(p.name) && !offered.has(p.name)) {
          agents.push({ name: p.name, position: p.position, overall: p.overall });
          offered.add(p.name);
        }
      }
    }

    return agents.sort((a, b) => b.overall - a.overall).slice(0, 30);
  }, [territories, rosters, eliminated]);

  const activeRosterNames = new Set(getAliveTeamsFrom(territories).flatMap(id => rosters[id] || []));
  const pendingLegend = pendingPowerup && TEAM_LEGENDS_NBA[pendingPowerup.teamId];
  const powerupUnavailableReason = !pendingPowerup ? null
    : pendingPowerup.powerup.id === 'invincibility' && invincibleTeams.has(pendingPowerup.teamId)
      ? 'This team already has a shield. Save this one for later.'
      : pendingPowerup.powerup.id === 'upgrade' && teamUpgrades[pendingPowerup.teamId]
        ? 'This team already has an upgrade waiting for its next battle.'
        : pendingPowerup.powerup.id === 'legend' && (!pendingLegend || activeRosterNames.has(pendingLegend.name))
          ? 'This legend is already on an active roster or unavailable. Save this power for later.' : null;
  const availablePowerupTerritories = pendingPowerup && powerupUseType === 'territory_steal'
    ? findBorderEnemyStates(pendingPowerup.teamId, territories) : [];

  const finishPowerup = useCallback(() => {
    pendingPowerupRef.current = null;
    setPendingPowerup(null);
    setPowerupUseType(null);
    setFreeAgentList([]);
    setPhase('ready');
  }, [setPhase]);

  const usePowerupNow = useCallback(() => {
    if (phaseRef.current !== 'powerup_received' || !pendingPowerup
      || pendingPowerupRef.current !== pendingPowerup || powerupUnavailableReason) return;
    const { teamId, powerup } = pendingPowerup;
    if (['free_agent', 'upgrade', 'territory_steal'].includes(powerup.id)) {
      if (powerup.id === 'free_agent') setFreeAgentList(buildFreeAgentList());
      setPowerupUseType(powerup.id);
      setPhase('powerup_use');
      return;
    }
    finishPowerup();
    if (powerup.id === 'invincibility') {
      setInvincibleTeams(prev => new Set([...prev, teamId]));
    } else if (powerup.id === 'legend' && pendingLegend) {
      setRosters(prev => ({ ...prev, [teamId]: [...(prev[teamId] || []), pendingLegend.name] }));
      setLegendPlayers(prev => new Set([...prev, pendingLegend.name]));
    }
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup', winner: teamId,
      score: powerup.id === 'invincibility' ? '🛡️ Shield activated!' : `🐐 ${pendingLegend?.name} joins the roster!`,
    }]);
  }, [pendingPowerup, powerupUnavailableReason, pendingLegend, buildFreeAgentList, finishPowerup, setPhase]);

  const savePowerupForLater = useCallback(() => {
    if (phaseRef.current !== 'powerup_received' || !pendingPowerup || pendingPowerupRef.current !== pendingPowerup) return;
    const { teamId, powerup } = pendingPowerup;
    setTeamSavedPowerups(prev => {
      const current = prev[teamId] || [];
      if (current.length >= 2) {
        return { ...prev, [teamId]: [...current.slice(1), { id: powerup.id, label: powerup.label, icon: powerup.icon }] };
      }
      return { ...prev, [teamId]: [...current, { id: powerup.id, label: powerup.label, icon: powerup.icon }] };
    });
    finishPowerup();
  }, [pendingPowerup, finishPowerup]);

  const useSavedPowerup = useCallback((teamId: string, index: number) => {
    const saved = teamSavedPowerups[teamId];
    if (phaseRef.current !== 'ready' || !getAliveTeamsFrom(territories).includes(teamId)
      || !saved || !saved[index] || savedPowerupsRef.current[teamId]?.[index] !== saved[index]) return;
    const pu = saved[index];
    setTeamSavedPowerups(prev => ({
      ...prev,
      [teamId]: prev[teamId].filter((_, i) => i !== index),
    }));
    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });
    setPhase('powerup_received');
  }, [teamSavedPowerups, territories, setPhase]);

  const cancelPowerupUse = useCallback(() => {
    if (phaseRef.current !== 'powerup_use' || !pendingPowerup || pendingPowerupRef.current !== pendingPowerup) return;
    setPowerupUseType(null);
    setFreeAgentList([]);
    setPhase('powerup_received');
  }, [pendingPowerup, setPhase]);

  const signFreeAgent = useCallback((playerName: string) => {
    if (phaseRef.current !== 'powerup_use' || powerupUseType !== 'free_agent' || !pendingPowerup
      || pendingPowerupRef.current !== pendingPowerup || !freeAgentList.some(p => p.name === playerName)
      || activeRosterNames.has(playerName)) return;
    const { teamId } = pendingPowerup;
    finishPowerup();
    setRosters(prev => ({
      ...prev,
      [teamId]: [...(prev[teamId] || []), playerName],
    }));
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup',
      winner: teamId, score: `✍️ Signed ${playerName}!`,
    }]);
  }, [pendingPowerup, powerupUseType, freeAgentList, activeRosterNames, finishPowerup]);

  const chooseUpgradePlayer = useCallback((playerName: string) => {
    if (phaseRef.current !== 'powerup_use' || powerupUseType !== 'upgrade' || !pendingPowerup
      || pendingPowerupRef.current !== pendingPowerup || teamUpgrades[pendingPowerup.teamId]
      || !(rosters[pendingPowerup.teamId] || []).includes(playerName)) return;
    const { teamId } = pendingPowerup;
    finishPowerup();
    setTeamUpgrades(prev => ({ ...prev, [teamId]: playerName }));
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup', winner: teamId,
      score: `⬆️ ${playerName} upgraded to 99 OVR for this team's next battle!`,
    }]);
  }, [pendingPowerup, powerupUseType, teamUpgrades, rosters, finishPowerup]);

  const choosePowerupTerritory = useCallback((stateId: string) => {
    if (phaseRef.current !== 'powerup_use' || powerupUseType !== 'territory_steal' || !pendingPowerup
      || pendingPowerupRef.current !== pendingPowerup || !availablePowerupTerritories.includes(stateId)) return;
    const { teamId } = pendingPowerup;
    const previousOwner = territories[stateId]!;
    const updated = { ...territories, [stateId]: teamId };
    const aliveAfter = getAliveTeamsFrom(updated);
    finishPowerup();
    setTerritories(updated);
    if (!aliveAfter.includes(previousOwner)) {
      setEliminated(prev => [...prev, previousOwner]);
      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== previousOwner)));
    }
    setTerritoryStolenState(stateId);
    const stateName = STATE_POSITIONS.find(s => s.id === stateId)?.name || stateId;
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup', winner: teamId, score: `🗺️ Stole ${stateName}!`,
    }]);
    if (aliveAfter.length <= 1) setPhase('gameover');
    addTimeout(() => setTerritoryStolenState(null), 1500);
  }, [pendingPowerup, powerupUseType, availablePowerupTerritories, territories, finishPowerup, setPhase]);

  const setFavoriteTeam = useCallback((teamId: string) => {
    setFavoriteTeamState(teamId);
  }, []);

  const canSignFreeAgent = useCallback((): boolean => {
    if (!favoriteTeam) return false;
    if (!getAliveTeamsFrom(territories).includes(favoriteTeam)) return false;
    return conquestsSinceSign >= FREE_AGENCY_SIGN_COOLDOWN;
  }, [favoriteTeam, territories, conquestsSinceSign]);

  const signFreeAgencyCandidate = useCallback((candidate: ConquestFreeAgentCandidateNba) => {
    if (!canSignFreeAgent() || !favoriteTeam) return;

    const roster = rosters[favoriteTeam] || [];
    if (roster.length === 0) return;

    const team = NBA_TEAM_MAP.get(favoriteTeam);
    const playerMap = new Map((team?.players || []).map(p => [p.name, p]));
    let weakestName = roster[0];
    let weakestOvr = playerMap.get(roster[0])?.overall ?? 75;
    for (const name of roster) {
      const ovr = playerMap.get(name)?.overall ?? 75;
      if (ovr < weakestOvr) { weakestOvr = ovr; weakestName = name; }
    }

    setRosters(prev => ({
      ...prev,
      [favoriteTeam]: [...(prev[favoriteTeam] || []).filter(n => n !== weakestName), candidate.name],
    }));
    setPowerRankDrift(prev => ({
      ...prev,
      [favoriteTeam]: clampDrift((prev[favoriteTeam] || 0) + FREE_AGENCY_SIGN_BUMP),
    }));
    setConquestsSinceSign(0);
    setSignedFreeAgents(prev => [...prev, candidate.name]);
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: favoriteTeam, defender: 'powerup',
      winner: favoriteTeam,
      score: `✍️ Free agency: signed ${candidate.name}, waived ${weakestName} (+${FREE_AGENCY_SIGN_BUMP} OVR)`,
    }]);
  }, [canSignFreeAgent, favoriteTeam, rosters]);

  const startBattle = useCallback(() => {
    if (phaseRef.current !== 'ready') return;
    const alive = getAliveTeamsFrom(territories);
    if (alive.length <= 1) { setPhase('gameover'); return; }

    clearTimeouts();
    setNoEnemyMsg(null);

    settlingBattleRef.current = false;
    setTerritoryStolenState(null);
    setBattleUpgrades({});

    const team = alive[Math.floor(Math.random() * alive.length)];

    const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    let chosenDir: string | null = null;
    let target: TargetResult | null = null;

    for (const dir of shuffledDirs) {
      const t = findTarget(team, dir, territories);
      if (t) { chosenDir = dir; target = t; break; }
    }

    if (!chosenDir || !target) {
      const center = getTeamGeoCenter(team, territories);
      let bestDist = Infinity;
      let fallbackEnemy: string | null = null;
      for (const enemy of alive.filter(t => t !== team)) {
        const ec = getTeamGeoCenter(enemy, territories);
        const dist = geoDist(center.lat, center.lon, ec.lat, ec.lon);
        if (dist < bestDist) { bestDist = dist; fallbackEnemy = enemy; }
      }
      if (!fallbackEnemy) return;
      target = { type: 'team', id: fallbackEnemy };
      const ec = getTeamGeoCenter(fallbackEnemy, territories);
      const bearing = compassBearing(center.lat, center.lon, ec.lat, ec.lon);
      let bestDirDiff = Infinity;
      chosenDir = 'E';
      for (const d of DIRECTIONS) {
        const diff = angleDiff(bearing, DIR_ANGLES[d]);
        if (diff < bestDirDiff) { bestDirDiff = diff; chosenDir = d; }
      }
    }

    const firstAttemptDir = shuffledDirs[0];
    const missedFirst = firstAttemptDir !== chosenDir;

    setAttackingTeam(team);
    setDirection(firstAttemptDir);
    setDefendingTeam(null);
    setBattleResult(null);
    setTargetState(target.type === 'neutral' ? target.stateId : null);
    setPhase('animating');
    setAnimStartTime(Date.now());

    if (target.type === 'neutral') {
      const stateId = target.stateId;
      const stateName = STATE_POSITIONS.find(s => s.id === stateId)?.name || stateId;
      const isPowerup = powerupStates.has(stateId);

      const claimState = () => {
        setTerritories(prev => ({ ...prev, [stateId]: team }));
        setTargetState(null);
        setTurn(t => t + 1);

        setPowerRankDrift(prev => ({
          ...prev,
          [team]: clampDrift((prev[team] || 0) + EXPANSION_BONUS_BUMP),
        }));

        if (isPowerup) {
          const pu = getRandomPowerup();
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: team, defender: 'neutral',
            winner: team, score: `claimed ${stateName} ${pu.icon} ${pu.label}! (+1 OVR expansion bonus)`,
          }]);
          setPendingPowerup({ teamId: team, powerup: pu });
          setPhase('powerup_received');
        } else {
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: team, defender: 'neutral',
            winner: team, score: `claimed ${stateName} · expansion bonus +1 OVR`,
          }]);
          setPhase('ready');
        }
      };

      if (missedFirst) {
        addTimeout(() => setNoEnemyMsg(`No target ${DIR_LABELS[firstAttemptDir] || firstAttemptDir}!`), 3600);
        addTimeout(() => { setNoEnemyMsg(null); setDirection(chosenDir!); }, 5000);
        addTimeout(claimState, 6500);
      } else {
        setDirection(chosenDir);
        addTimeout(claimState, 4000);
      }
    } else {
      const enemyId = target.id;
      const upgrades = Object.fromEntries(Object.entries(teamUpgrades).filter(([id]) => id === team || id === enemyId));
      const result = simulateBattle(team, enemyId, territories, rosters, upgrades, legendPlayers, buildRatingOverrides());
      setBattleUpgrades(upgrades);
      setTeamUpgrades(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => id !== team && id !== enemyId)));

      const startPlayByPlay = () => {
        setBattleResult(result);
        setPhase('battle');
        setVisiblePlays([]);
        setBoxScore(null);
        setPlayByPlayActive(true);

        const sim = result.simulation;
        if (!sim) {
          addTimeout(() => applyBattleResult(team, enemyId, result), 4500);
          return;
        }

        inFlightBattleRef.current = { team, enemyId, result };
        setCanSkipBattle(true);

        sim.plays.forEach((play, idx) => {
          addTimeout(() => {
            setVisiblePlays(prev => [...prev, play]);
          }, idx * 1500);
        });

        const totalPlayTime = sim.plays.length * 1500;
        addTimeout(() => {
          setPlayByPlayActive(false);
          setSimulatingRemainder(true);
        }, totalPlayTime);
        addTimeout(() => {
          setSimulatingRemainder(false);
          setBoxScore(sim.boxScore);
          setCanSkipBattle(false);
          inFlightBattleRef.current = null;
          setPendingBattleApply({ attacker: team, defender: enemyId, result });
        }, totalPlayTime + 2000);
      };

      if (missedFirst) {
        addTimeout(() => setNoEnemyMsg(`No target ${DIR_LABELS[firstAttemptDir] || firstAttemptDir}!`), 3600);
        addTimeout(() => { setNoEnemyMsg(null); setDirection(chosenDir!); }, 5000);
        addTimeout(() => setDefendingTeam(enemyId), 6200);
        addTimeout(startPlayByPlay, 8000);
      } else {
        setDirection(chosenDir);
        addTimeout(() => setDefendingTeam(enemyId), 3800);
        addTimeout(startPlayByPlay, 6000);
      }
    }
  }, [territories, rosters, powerupStates, teamUpgrades, legendPlayers, buildRatingOverrides, setPhase]);

  const applyPowerRankUpdate = useCallback((winnerId: string, loserId: string) => {
    setPowerRankDrift(prev => ({
      ...prev,
      [winnerId]: clampDrift((prev[winnerId] || 0) + POWER_RANK_WIN_BUMP),
      [loserId]: clampDrift((prev[loserId] || 0) + POWER_RANK_LOSS_BUMP),
    }));
    setPowerRankRecord(prev => {
      const w = prev[winnerId] || { wins: 0, losses: 0 };
      const l = prev[loserId] || { wins: 0, losses: 0 };
      return {
        ...prev,
        [winnerId]: { wins: w.wins + 1, losses: w.losses },
        [loserId]: { wins: l.wins, losses: l.losses + 1 },
      };
    });
    setConquestsSinceSign(prev => prev + 1);
  }, []);

  const applyBattleResult = useCallback((attacker: string, defender: string, result: BattleResult, stolenPlayer?: string) => {
    const loserIsInvincible = invincibleTeams.has(result.loser);
    applyPowerRankUpdate(result.winner, result.loser);

    // The defender is always at home. A losing attacker is repelled, so no
    // territory changes hands and a saved shield is not spent.
    if (result.loser === attacker) {
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore} · away raid repelled`,
        stolenPlayer,
      }]);
      setPhase('ready');
      return;
    }

    if (loserIsInvincible) {
      setInvincibleTeams(prev => {
        const next = new Set(prev);
        next.delete(result.loser);
        return next;
      });
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore} (🛡️ ${NBA_TEAM_MAP.get(result.loser)?.name} survived!)`,
        stolenPlayer,
      }]);
      setPhase('ready');
      return;
    }

    const newTerr = { ...territories };
    Object.keys(newTerr).forEach(s => {
      if (newTerr[s] === result.loser) newTerr[s] = result.winner;
    });
    const aliveAfter = getAliveTeamsFrom(newTerr);
    setTerritories(newTerr);
    setEliminated(e => [...e, result.loser]);
    setTurn(t => t + 1);
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker, defender, winner: result.winner,
      score: `${result.winScore}-${result.loseScore}`, stolenPlayer,
    }]);
    if (aliveAfter.length <= 1) {
      setPhase('gameover');
    } else {
      setPendingPowerup({ teamId: result.winner, powerup: getRandomPowerup() });
      setPhase('powerup_received');
    }
  }, [territories, invincibleTeams, applyPowerRankUpdate, setPhase]);

  const openStealModal = useCallback(() => {
    setStealModalOpen(true);
  }, []);

  const closeStealModal = useCallback(() => {
    setStealModalOpen(false);
  }, []);

  const stealPlayer = useCallback((playerName: string) => {
    if (phaseRef.current !== 'battle' || !battleResult || !pendingBattleApply || settlingBattleRef.current
      || pendingBattleRef.current !== pendingBattleApply || !(rosters[battleResult.loser] || []).includes(playerName)
      || (rosters[battleResult.winner] || []).includes(playerName)) return;
    settlingBattleRef.current = true;
    setPlayerConfirmed(playerName);
    setStealModalOpen(false);

    addTimeout(() => {
      setRosters(prev => {
        const next = { ...prev };
        next[battleResult.loser] = (next[battleResult.loser] || []).filter(p => p !== playerName);
        next[battleResult.winner] = [...(next[battleResult.winner] || []), playerName];
        return next;
      });
      applyBattleResult(pendingBattleApply.attacker, pendingBattleApply.defender, pendingBattleApply.result, playerName);
      pendingBattleRef.current = null;
      setPendingBattleApply(null);
      setPlayerConfirmed(null);
      setBoxScore(null);
      setVisiblePlays([]);
    }, 1200);
  }, [battleResult, pendingBattleApply, rosters, applyBattleResult]);

  const skipSteal = useCallback(() => {
    if (phaseRef.current !== 'battle' || !pendingBattleApply || settlingBattleRef.current
      || pendingBattleRef.current !== pendingBattleApply) return;
    settlingBattleRef.current = true;
    applyBattleResult(pendingBattleApply.attacker, pendingBattleApply.defender, pendingBattleApply.result);
    pendingBattleRef.current = null;
    setPendingBattleApply(null);
    setStealModalOpen(false);
    setBoxScore(null);
    setVisiblePlays([]);
  }, [pendingBattleApply, applyBattleResult]);

  const skipToResult = useCallback(() => {
    const inFlight = inFlightBattleRef.current;
    if (!inFlight || !inFlight.result.simulation) return;
    clearTimeouts();
    const { team, enemyId, result } = inFlight;
    const sim = result.simulation;
    setVisiblePlays(sim.plays);
    setPlayByPlayActive(false);
    setSimulatingRemainder(false);
    setBoxScore(sim.boxScore);
    setCanSkipBattle(false);
    inFlightBattleRef.current = null;
    setPendingBattleApply({ attacker: team, defender: enemyId, result });
  }, [clearTimeouts]);

  const reset = useCallback(() => {
    clearTimeouts();
    setTerritories(buildInitialTerritories());
    setRosters(buildInitialRosters());
    setEliminated([]);
    setTurn(0);
    setPhase('ready');
    setAttackingTeam(null);
    setDirection(null);
    setTargetState(null);
    setDefendingTeam(null);
    setBattleResult(null);
    setGameLog([]);
    setPowerupStates(pickRandomPowerupStates());
    setTeamSavedPowerups({});
    savedPowerupsRef.current = {};
    setInvincibleTeams(new Set());
    setTeamUpgrades({});
    setBattleUpgrades({});
    setLegendPlayers(new Set());
    setPendingPowerup(null);
    pendingPowerupRef.current = null;
    setPowerupUseType(null);
    setFreeAgentList([]);
    setTerritoryStolenState(null);
    setVisiblePlays([]);
    setPlayByPlayActive(false);
    setSimulatingRemainder(false);
    setBoxScore(null);
    setStealModalOpen(false);
    setPendingBattleApply(null);
    pendingBattleRef.current = null;
    settlingBattleRef.current = false;
    setPlayerConfirmed(null);
    setPowerRankDrift(buildInitialPowerRankDrift());
    setPowerRankRecord({});
    inFlightBattleRef.current = null;
    setCanSkipBattle(false);
    setFavoriteTeamState(null);
    setConquestsSinceSign(0);
    setSignedFreeAgents([]);
  }, []);

  return {
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime, noEnemyMsg, powerupStates,
    teamSavedPowerups, invincibleTeams, teamUpgrades, battleUpgrades, legendPlayers,
    pendingPowerup, powerupUseType, freeAgentList, territoryStolenState, targetState,
    powerupUnavailableReason, availablePowerupTerritories,
    visiblePlays, playByPlayActive, simulatingRemainder, boxScore,
    stealModalOpen, pendingBattleApply, playerConfirmed,
    powerRankings,
    favoriteTeam, setFavoriteTeam, conquestsSinceSign, signedFreeAgents,
    canSignFreeAgent, signFreeAgencyCandidate,
    freeAgencyCooldownRemaining: Math.max(0, FREE_AGENCY_SIGN_COOLDOWN - conquestsSinceSign),
    canSkipBattle, skipToResult,
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
    usePowerupNow, savePowerupForLater, useSavedPowerup, signFreeAgent,
    chooseUpgradePlayer, choosePowerupTerritory, cancelPowerupUse,
    openStealModal, closeStealModal, skipSteal,
  };
}
