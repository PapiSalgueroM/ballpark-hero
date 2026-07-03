import { useState, useRef, useCallback, useEffect } from 'react';
import {
  NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, STATE_POSITIONS,
  DIRECTIONS, DIR_ANGLES, DIR_LABELS, STATE_GEO_COORDS,
} from '@/data/conquestData';
import { US_STATES } from '@/data/usStatesPaths';
import {
  PowerupId, PowerupDef, POWERUPS, getRandomPowerup,
  FREE_AGENTS, TEAM_LEGENDS, FreeAgent,
} from '@/data/conquestPowerups';
import { simulateDetailedBattle, BattleSimulation, PlayEvent, BoxScore, TeamStatLine, TeamRatingOverride } from '@/lib/conquestBattle';

export type Phase =
  | 'ready' | 'animating' | 'battle' | 'steal' | 'gameover'
  | 'powerup_received'   // show "you got a powerup" modal
  | 'powerup_use';       // executing a powerup (free agent pick, etc.)

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

// Power rankings entry (item 86): rank, abbr, adjusted overall, in-run W-L.
export interface PowerRankEntry {
  id: string;
  offense: number;
  defense: number;
  overall: number;
  wins: number;
  losses: number;
}

// Re-export for consumers
export type { PowerupId, PowerupDef, FreeAgent, BattleSimulation, PlayEvent, BoxScore, TeamStatLine, TeamRatingOverride };
export { POWERUPS, FREE_AGENTS, TEAM_LEGENDS };

// Power rankings tuning (item 86): a win/loss nudges a team's O/D a small
// amount so the ranked list reflects in-run form, and — critically — the
// SAME adjusted numbers feed simulateDetailedBattle's win probability, so
// the panel isn't just cosmetic. Kept small and clamped so a hot streak
// bends the odds without erasing the underlying talent gap.
const POWER_RANK_WIN_BUMP = 1.5;
const POWER_RANK_LOSS_BUMP = -1.5;
const POWER_RANK_CLAMP = 12; // max total drift from the static base rating

function clampDrift(v: number) {
  return Math.max(-POWER_RANK_CLAMP, Math.min(POWER_RANK_CLAMP, v));
}

function buildInitialPowerRankDrift(): Record<string, number> {
  const d: Record<string, number> = {};
  NFL_TEAMS.forEach(t => { d[t.id] = 0; });
  return d;
}

// Build a lookup from state ID → geographic center (from SVG paths) - kept for map rendering
const GEO_CENTERS = new Map<string, { x: number; y: number }>();
US_STATES.forEach(s => GEO_CENTERS.set(s.id, { x: s.labelX, y: s.labelY }));

function buildInitialTerritories(): Record<string, string | null> {
  const t: Record<string, string | null> = {};
  STATE_POSITIONS.forEach(s => { t[s.id] = INITIAL_TERRITORIES[s.id] || null; });
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
  NFL_TEAMS.forEach(t => {
    r[t.id] = t.players && t.players.length > 0
      ? t.players.map(p => p.name)
      : [...t.roster];
  });
  return r;
}

// Get team's geographic center using real lat/lon coordinates
function getTeamGeoCenter(teamId: string, territories: Record<string, string | null>): { lat: number; lon: number } {
  const stateIds = Object.keys(territories).filter(s => territories[s] === teamId);
  if (stateIds.length === 0) return { lat: 39.0, lon: -98.0 }; // center of US fallback
  let sumLat = 0, sumLon = 0, count = 0;
  for (const sid of stateIds) {
    const geo = STATE_GEO_COORDS[sid];
    if (geo) { sumLat += geo.lat; sumLon += geo.lon; count++; }
  }
  if (count === 0) return { lat: 39.0, lon: -98.0 };
  return { lat: sumLat / count, lon: sumLon / count };
}

// Calculate compass bearing from point A to point B (in radians, 0=N, PI/2=E, PI=S, 3PI/2=W)
function compassBearing(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const dLat = toLat - fromLat; // positive = north
  const dLon = toLon - fromLon; // positive = east
  // atan2(east, north) gives bearing from north clockwise
  let bearing = Math.atan2(dLon, dLat);
  if (bearing < 0) bearing += 2 * Math.PI;
  return bearing;
}

// Angular difference (smallest angle between two bearings)
function angleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}

// Haversine-like distance (simplified, using lat/lon degree differences)
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
  const dirAngle = DIR_ANGLES[direction]; // compass bearing in radians
  const coneHalf = (67 / 2) * Math.PI / 180; // 33.5 degrees half-cone

  let best: TargetResult | null = null;
  let bestDist = Infinity;

  // Check enemy teams
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

  // Check neutral territories
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
  upgradeTeam?: string | null,
  upgradedPlayer?: string | null,
  ratingOverrides?: Record<string, TeamRatingOverride>,
): BattleResult {
  const sim = simulateDetailedBattle(attacker, defender, territories, rosters, upgradeTeam || null, upgradedPlayer || null, ratingOverrides);

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

// Find states owned by enemies that border a team's territory (using real geo coords)
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
      if (dist < 36) { // ~6 degrees proximity
        results.push(sid);
        break;
      }
    }
  }
  return results;
}

export function useConquest() {
  const [territories, setTerritories] = useState(buildInitialTerritories);
  const [rosters, setRosters] = useState(buildInitialRosters);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [attackingTeam, setAttackingTeam] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [defendingTeam, setDefendingTeam] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [gameLog, setGameLog] = useState<LogEntry[]>([]);
  const [animStartTime, setAnimStartTime] = useState(0);
  const [noEnemyMsg, setNoEnemyMsg] = useState<string | null>(null);
  const [powerupStates, setPowerupStates] = useState<Set<string>>(() => pickRandomPowerupStates());
  
  // Powerup system
  const [teamSavedPowerups, setTeamSavedPowerups] = useState<Record<string, SavedPowerup[]>>({});
  const [invincibleTeams, setInvincibleTeams] = useState<Set<string>>(new Set());
  const [upgradeActiveTeam, setUpgradeActiveTeam] = useState<string | null>(null);
  const [upgradedPlayer, setUpgradedPlayer] = useState<string | null>(null);
  
  // Powerup modal state
  const [pendingPowerup, setPendingPowerup] = useState<{ teamId: string; powerup: PowerupDef } | null>(null);
  const [powerupUseType, setPowerupUseType] = useState<PowerupId | null>(null);
  const [freeAgentList, setFreeAgentList] = useState<FreeAgent[]>([]);
  const [territoryStolenState, setTerritoryStolenState] = useState<string | null>(null);
  
  // Play-by-play state
  const [visiblePlays, setVisiblePlays] = useState<PlayEvent[]>([]);
  const [playByPlayActive, setPlayByPlayActive] = useState(false);
  const [simulatingRemainder, setSimulatingRemainder] = useState(false);
  const [boxScore, setBoxScore] = useState<BoxScore | null>(null);
  const [stealModalOpen, setStealModalOpen] = useState(false);
  const [pendingBattleApply, setPendingBattleApply] = useState<{ attacker: string; defender: string; result: BattleResult } | null>(null);
  const [playerConfirmed, setPlayerConfirmed] = useState<string | null>(null);

  // Power rankings (item 86): per-team O/D drift from this run's battle
  // results, plus a battle win/loss tally. The drift feeds BOTH the ranked
  // panel display and the actual win-probability calculation, so the panel
  // is never just decorative.
  const [powerRankDrift, setPowerRankDrift] = useState<Record<string, number>>(() => buildInitialPowerRankDrift());
  const [powerRankRecord, setPowerRankRecord] = useState<Record<string, { wins: number; losses: number }>>({});

  const timeoutsRef = useRef<number[]>([]);
  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const addTimeout = (fn: () => void, ms: number) => { timeoutsRef.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => () => clearTimeouts(), []);

  const aliveTeams = useCallback(() => getAliveTeamsFrom(territories), [territories]);

  // Build the O/D override map that feeds simulateDetailedBattle, applying
  // each team's current power-rank drift on top of its static base rating.
  const buildRatingOverrides = useCallback((): Record<string, TeamRatingOverride> => {
    const overrides: Record<string, TeamRatingOverride> = {};
    NFL_TEAMS.forEach(t => {
      const drift = powerRankDrift[t.id] || 0;
      overrides[t.id] = {
        offense: Math.max(40, Math.min(99, Math.round(t.offense + drift))),
        defense: Math.max(40, Math.min(99, Math.round(t.defense + drift))),
      };
    });
    return overrides;
  }, [powerRankDrift]);

  // Ranked list for the panel: overall = avg of drift-adjusted offense/defense,
  // sorted descending, ties broken by in-run wins then fewer losses.
  const powerRankings = useCallback((): PowerRankEntry[] => {
    const overrides = buildRatingOverrides();
    return NFL_TEAMS
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

  // Build the free agent list: base free agents + eliminated team players not on active rosters
  const buildFreeAgentList = useCallback(() => {
    const activeRosterNames = new Set<string>();
    const alive = getAliveTeamsFrom(territories);
    for (const tid of alive) {
      for (const name of (rosters[tid] || [])) activeRosterNames.add(name);
    }

    const agents: FreeAgent[] = FREE_AGENTS.filter(fa => !activeRosterNames.has(fa.name));
    
    // Add eliminated team players
    for (const elimId of eliminated) {
      const team = TEAM_MAP.get(elimId);
      if (!team) continue;
      for (const p of (team.players || [])) {
        if (!activeRosterNames.has(p.name)) {
          agents.push({ name: p.name, position: p.position, overall: p.overall });
        }
      }
    }

    return agents.sort((a, b) => b.overall - a.overall).slice(0, 30);
  }, [territories, rosters, eliminated]);

  // Execute a powerup immediately
  const executePowerup = useCallback((teamId: string, puId: PowerupId) => {
    switch (puId) {
      case 'invincibility':
        setInvincibleTeams(prev => new Set([...prev, teamId]));
        setGameLog(prev => [...prev, {
          turn: prev.length + 1, attacker: teamId, defender: 'powerup',
          winner: teamId, score: '🛡️ Invincibility activated!',
        }]);
        setPhase('ready');
        break;

      case 'free_agent':
        setFreeAgentList(buildFreeAgentList());
        setPowerupUseType('free_agent');
        setPhase('powerup_use');
        break;

      case 'upgrade': {
        const roster = rosters[teamId] || [];
        if (roster.length > 0) {
          const player = roster[Math.floor(Math.random() * roster.length)];
          setUpgradeActiveTeam(teamId);
          setUpgradedPlayer(player);
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: teamId, defender: 'powerup',
            winner: teamId, score: `⬆️ ${player} upgraded to 99 OVR!`,
          }]);
        }
        setPhase('ready');
        break;
      }

      case 'legend': {
        const legend = TEAM_LEGENDS[teamId];
        if (legend && !(rosters[teamId] || []).includes(legend.name)) {
          setRosters(prev => ({
            ...prev,
            [teamId]: [...(prev[teamId] || []), legend.name],
          }));
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: teamId, defender: 'powerup',
            winner: teamId, score: `🐐 ${legend.name} joins the roster!`,
          }]);
        }
        setPhase('ready');
        break;
      }

      case 'territory_steal': {
        const borderStates = findBorderEnemyStates(teamId, territories);
        if (borderStates.length > 0) {
          const stolenId = borderStates[Math.floor(Math.random() * borderStates.length)];
          const prevOwner = territories[stolenId];
          const stateName = STATE_POSITIONS.find(s => s.id === stolenId)?.name || stolenId;
          setTerritoryStolenState(stolenId);
          setTerritories(prev => ({ ...prev, [stolenId]: teamId }));
          
          // Check if prev owner lost all territory
          const updatedTerr = { ...territories, [stolenId]: teamId };
          const ownerStatesLeft = prevOwner ? Object.values(updatedTerr).filter(t => t === prevOwner).length : 0;
          if (prevOwner && ownerStatesLeft === 0) {
            setEliminated(e => [...e, prevOwner]);
          }
          
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: teamId, defender: prevOwner || 'neutral',
            winner: teamId, score: `🗺️ Stole ${stateName}!`,
          }]);
          
          // Clear animation after a moment
          addTimeout(() => {
            setTerritoryStolenState(null);
            setPhase('ready');
          }, 1500);
        } else {
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: teamId, defender: 'powerup',
            winner: teamId, score: '🗺️ No border states to steal!',
          }]);
          setPhase('ready');
        }
        break;
      }
    }
  }, [territories, rosters, eliminated, buildFreeAgentList]);

  // Called when user chooses "Use Now" on powerup received modal
  const usePowerupNow = useCallback(() => {
    if (!pendingPowerup) return;
    const { teamId, powerup } = pendingPowerup;
    setPendingPowerup(null);
    executePowerup(teamId, powerup.id);
  }, [pendingPowerup, executePowerup]);

  // Called when user chooses "Save for Later"
  const savePowerupForLater = useCallback(() => {
    if (!pendingPowerup) return;
    const { teamId, powerup } = pendingPowerup;
    setTeamSavedPowerups(prev => {
      const current = prev[teamId] || [];
      if (current.length >= 2) {
        // Drop oldest
        return { ...prev, [teamId]: [...current.slice(1), { id: powerup.id, label: powerup.label, icon: powerup.icon }] };
      }
      return { ...prev, [teamId]: [...current, { id: powerup.id, label: powerup.label, icon: powerup.icon }] };
    });
    setPendingPowerup(null);
    setPhase('ready');
  }, [pendingPowerup]);

  // Use a saved powerup
  const useSavedPowerup = useCallback((teamId: string, index: number) => {
    const saved = teamSavedPowerups[teamId];
    if (!saved || !saved[index]) return;
    const pu = saved[index];
    setTeamSavedPowerups(prev => ({
      ...prev,
      [teamId]: prev[teamId].filter((_, i) => i !== index),
    }));
    setPendingPowerup({ teamId, powerup: POWERUPS.find(p => p.id === pu.id)! });
  }, [teamSavedPowerups]);

  // Sign a free agent (called from free agent modal)
  const signFreeAgent = useCallback((playerName: string) => {
    if (!pendingPowerup && !attackingTeam) return;
    const teamId = pendingPowerup?.teamId || attackingTeam!;
    setRosters(prev => ({
      ...prev,
      [teamId]: [...(prev[teamId] || []), playerName],
    }));
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup',
      winner: teamId, score: `✍️ Signed ${playerName}!`,
    }]);
    setPowerupUseType(null);
    setPhase('ready');
  }, [pendingPowerup, attackingTeam]);

  const startBattle = useCallback(() => {
    const alive = getAliveTeamsFrom(territories);
    if (alive.length <= 1) { setPhase('gameover'); return; }

    clearTimeouts();
    setNoEnemyMsg(null);

    // Clear upgrade after one battle if it was active
    if (upgradeActiveTeam) {
      setUpgradeActiveTeam(null);
      setUpgradedPlayer(null);
    }

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
    setPhase('animating');
    setAnimStartTime(Date.now());

    if (target.type === 'neutral') {
      const stateId = target.stateId;
      const stateName = STATE_POSITIONS.find(s => s.id === stateId)?.name || stateId;
      const isPowerup = powerupStates.has(stateId);

      const claimState = () => {
        setTerritories(prev => ({ ...prev, [stateId]: team }));
        setTurn(t => t + 1);

        if (isPowerup) {
          const pu = getRandomPowerup();
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: team, defender: 'neutral',
            winner: team, score: `claimed ${stateName} ${pu.icon} ${pu.label}!`,
          }]);
          setPendingPowerup({ teamId: team, powerup: pu });
          setPhase('powerup_received');
        } else {
          setGameLog(prev => [...prev, {
            turn: prev.length + 1, attacker: team, defender: 'neutral',
            winner: team, score: `claimed ${stateName}`,
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
      const result = simulateBattle(team, enemyId, territories, rosters, upgradeActiveTeam, upgradedPlayer, buildRatingOverrides());

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

        // Reveal plays one at a time with 1.5s delay
        sim.plays.forEach((play, idx) => {
          addTimeout(() => {
            setVisiblePlays(prev => [...prev, play]);
          }, idx * 1500);
        });

        // After all plays: show "Simulating remainder..." for 2s, then box score
        const totalPlayTime = sim.plays.length * 1500;
        addTimeout(() => {
          setPlayByPlayActive(false);
          setSimulatingRemainder(true);
        }, totalPlayTime);
        addTimeout(() => {
          setSimulatingRemainder(false);
          setBoxScore(sim.boxScore);
          // Store pending battle info so user can trigger steal when ready
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
  }, [territories, rosters, powerupStates, upgradeActiveTeam, upgradedPlayer, buildRatingOverrides]);

  // Power rankings update (item 86): a battle win nudges the winner's O/D up
  // and the loser's down by a small clamped amount, and both teams' in-run
  // W-L tally moves. Runs for every real battle, including ones where the
  // loser survives via invincibility (they still lost the on-field battle).
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
  }, []);

  const applyBattleResult = useCallback((attacker: string, defender: string, result: BattleResult) => {
    const loserIsInvincible = invincibleTeams.has(result.loser);
    applyPowerRankUpdate(result.winner, result.loser);

    if (loserIsInvincible) {
      // Invincibility: loser survives, just remove the shield
      setInvincibleTeams(prev => {
        const next = new Set(prev);
        next.delete(result.loser);
        return next;
      });
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore} (🛡️ ${TEAM_MAP.get(result.loser)?.name} survived!)`,
      }]);
      setPhase('ready');
      return;
    }

    setTerritories(prev => {
      const newTerr = { ...prev };
      Object.keys(newTerr).forEach(s => {
        if (newTerr[s] === result.loser) newTerr[s] = result.winner;
      });

      const aliveAfter = getAliveTeamsFrom(newTerr);
      const loserRoster = rosters[result.loser] || [];

      setEliminated(e => [...e, result.loser]);
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore}`,
      }]);

      if (aliveAfter.length <= 1) {
        setPhase('gameover');
      } else {
        setPhase('ready');
      }

      return newTerr;
    });
  }, [rosters, invincibleTeams, applyPowerRankUpdate]);

  const openStealModal = useCallback(() => {
    setStealModalOpen(true);
  }, []);

  const closeStealModal = useCallback(() => {
    setStealModalOpen(false);
  }, []);

  const stealPlayer = useCallback((playerName: string) => {
    if (!battleResult || !pendingBattleApply) return;
    setPlayerConfirmed(playerName);
    setStealModalOpen(false);

    // Brief confirmation animation, then apply
    setTimeout(() => {
      setRosters(prev => {
        const next = { ...prev };
        next[battleResult.loser] = (next[battleResult.loser] || []).filter(p => p !== playerName);
        next[battleResult.winner] = [...(next[battleResult.winner] || []), playerName];
        return next;
      });
      setGameLog(prev => {
        const u = [...prev];
        if (u.length > 0) u[u.length - 1].stolenPlayer = playerName;
        return u;
      });

      // Now apply the battle result (territory transfer, elimination)
      applyBattleResult(pendingBattleApply.attacker, pendingBattleApply.defender, pendingBattleApply.result);
      setPendingBattleApply(null);
      setPlayerConfirmed(null);
      setBoxScore(null);
      setVisiblePlays([]);
    }, 1200);
  }, [battleResult, pendingBattleApply, applyBattleResult]);

  // Skip steal (if loser has no roster)
  const skipSteal = useCallback(() => {
    if (!pendingBattleApply) return;
    applyBattleResult(pendingBattleApply.attacker, pendingBattleApply.defender, pendingBattleApply.result);
    setPendingBattleApply(null);
    setBoxScore(null);
    setVisiblePlays([]);
  }, [pendingBattleApply, applyBattleResult]);

  const reset = useCallback(() => {
    clearTimeouts();
    setTerritories(buildInitialTerritories());
    setRosters(buildInitialRosters());
    setEliminated([]);
    setTurn(0);
    setPhase('ready');
    setAttackingTeam(null);
    setDirection(null);
    setDefendingTeam(null);
    setBattleResult(null);
    setGameLog([]);
    setPowerupStates(pickRandomPowerupStates());
    setTeamSavedPowerups({});
    setInvincibleTeams(new Set());
    setUpgradeActiveTeam(null);
    setUpgradedPlayer(null);
    setPendingPowerup(null);
    setPowerupUseType(null);
    setTerritoryStolenState(null);
    setVisiblePlays([]);
    setPlayByPlayActive(false);
    setSimulatingRemainder(false);
    setBoxScore(null);
    setStealModalOpen(false);
    setPendingBattleApply(null);
    setPlayerConfirmed(null);
    setPowerRankDrift(buildInitialPowerRankDrift());
    setPowerRankRecord({});
  }, []);

  return {
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime, noEnemyMsg, powerupStates,
    // Powerup system
    teamSavedPowerups, invincibleTeams, upgradeActiveTeam, upgradedPlayer,
    pendingPowerup, powerupUseType, freeAgentList, territoryStolenState,
    // Play-by-play
    visiblePlays, playByPlayActive, simulatingRemainder, boxScore,
    stealModalOpen, pendingBattleApply, playerConfirmed,
    // Power rankings (item 86)
    powerRankings,
    // Actions
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
    usePowerupNow, savePowerupForLater, useSavedPowerup, signFreeAgent,
    openStealModal, closeStealModal, skipSteal,
  };
}
