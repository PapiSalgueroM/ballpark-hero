import { useState, useRef, useCallback, useEffect } from 'react';
import {
  NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, STATE_POSITIONS,
  DIRECTIONS, DIR_ANGLES, DIR_LABELS,
} from '@/data/conquestData';
import { US_STATES } from '@/data/usStatesPaths';
import {
  PowerupId, PowerupDef, POWERUPS, getRandomPowerup,
  FREE_AGENTS, TEAM_LEGENDS, FreeAgent,
} from '@/data/conquestPowerups';

export type Phase =
  | 'ready' | 'animating' | 'battle' | 'steal' | 'gameover'
  | 'powerup_received'   // show "you got a powerup" modal
  | 'powerup_use';       // executing a powerup (free agent pick, etc.)

export interface BattleResult {
  winner: string;
  loser: string;
  winScore: number;
  loseScore: number;
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

// Re-export for consumers
export type { PowerupId, PowerupDef, FreeAgent };
export { POWERUPS, FREE_AGENTS, TEAM_LEGENDS };

// Build a lookup from state ID → geographic center (from SVG paths)
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

function getTeamGeoCenter(teamId: string, territories: Record<string, string | null>): { x: number; y: number } {
  const stateIds = Object.keys(territories).filter(s => territories[s] === teamId);
  if (stateIds.length === 0) return { x: 290, y: 180 };
  let sumX = 0, sumY = 0, count = 0;
  for (const sid of stateIds) {
    const geo = GEO_CENTERS.get(sid);
    if (geo) { sumX += geo.x; sumY += geo.y; count++; }
  }
  if (count === 0) return { x: 290, y: 180 };
  return { x: sumX / count, y: sumY / count };
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
  const coneHalf = Math.PI * 3 / 8;

  let best: TargetResult | null = null;
  let bestDist = Infinity;

  const alive = getAliveTeamsFrom(territories).filter(t => t !== teamId);
  for (const enemy of alive) {
    const ec = getTeamGeoCenter(enemy, territories);
    const dx = ec.x - center.x, dy = ec.y - center.y;
    let diff = Math.abs(Math.atan2(dy, dx) - dirAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= coneHalf) {
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = { type: 'team', id: enemy }; }
    }
  }

  for (const [sid, owner] of Object.entries(territories)) {
    if (owner !== null) continue;
    const geo = GEO_CENTERS.get(sid);
    if (!geo) continue;
    const dx = geo.x - center.x, dy = geo.y - center.y;
    let diff = Math.abs(Math.atan2(dy, dx) - dirAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= coneHalf) {
      const dist = dx * dx + dy * dy;
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
): BattleResult {
  const at = TEAM_MAP.get(attacker)!, dt = TEAM_MAP.get(defender)!;
  const aTerr = Object.values(territories).filter(t => t === attacker).length;
  const dTerr = Object.values(territories).filter(t => t === defender).length;

  let aPower = at.rating + aTerr * 0.5 + (rosters[attacker]?.length || 0) * 0.3;
  let dPower = dt.rating + dTerr * 0.5 + (rosters[defender]?.length || 0) * 0.3;

  // Upgrade powerup: +10 to the team that has an active upgrade
  if (upgradeTeam === attacker) aPower += 10;
  if (upgradeTeam === defender) dPower += 10;

  const attackerWins = Math.random() < aPower / (aPower + dPower);
  const winScore = Math.floor(Math.random() * 25) + 17;
  const loseScore = Math.floor(Math.random() * Math.min(winScore, 24));

  return {
    winner: attackerWins ? attacker : defender,
    loser: attackerWins ? defender : attacker,
    winScore, loseScore,
  };
}

// Find states owned by enemies that border a team's territory
function findBorderEnemyStates(teamId: string, territories: Record<string, string | null>): string[] {
  // Use geographic proximity: find enemy states whose SVG center is within ~60px of any team state
  const teamStates = Object.keys(territories).filter(s => territories[s] === teamId);
  const teamCenters = teamStates.map(s => GEO_CENTERS.get(s)).filter(Boolean) as { x: number; y: number }[];
  const results: string[] = [];
  
  for (const [sid, owner] of Object.entries(territories)) {
    if (!owner || owner === teamId) continue;
    const geo = GEO_CENTERS.get(sid);
    if (!geo) continue;
    for (const tc of teamCenters) {
      const dx = geo.x - tc.x, dy = geo.y - tc.y;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
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

  const timeoutsRef = useRef<number[]>([]);
  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const addTimeout = (fn: () => void, ms: number) => { timeoutsRef.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => () => clearTimeouts(), []);

  const aliveTeams = useCallback(() => getAliveTeamsFrom(territories), [territories]);

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
        const dx = ec.x - center.x, dy = ec.y - center.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; fallbackEnemy = enemy; }
      }
      if (!fallbackEnemy) return;
      target = { type: 'team', id: fallbackEnemy };
      const ec = getTeamGeoCenter(fallbackEnemy, territories);
      const angle = Math.atan2(ec.y - center.y, ec.x - center.x);
      let bestDirDiff = Infinity;
      chosenDir = 'E';
      for (const d of DIRECTIONS) {
        let diff = Math.abs(angle - DIR_ANGLES[d]);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
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
      const result = simulateBattle(team, enemyId, territories, rosters, upgradeActiveTeam);

      if (missedFirst) {
        addTimeout(() => setNoEnemyMsg(`No target ${DIR_LABELS[firstAttemptDir] || firstAttemptDir}!`), 3600);
        addTimeout(() => { setNoEnemyMsg(null); setDirection(chosenDir!); }, 5000);
        addTimeout(() => setDefendingTeam(enemyId), 6200);
        addTimeout(() => {
          setBattleResult(result);
          setPhase('battle');
          addTimeout(() => applyBattleResult(team, enemyId, result), 4500);
        }, 8000);
      } else {
        setDirection(chosenDir);
        addTimeout(() => setDefendingTeam(enemyId), 3800);
        addTimeout(() => {
          setBattleResult(result);
          setPhase('battle');
          addTimeout(() => applyBattleResult(team, enemyId, result), 4500);
        }, 6000);
      }
    }
  }, [territories, rosters, powerupStates, upgradeActiveTeam]);

  const applyBattleResult = useCallback((attacker: string, defender: string, result: BattleResult) => {
    const loserIsInvincible = invincibleTeams.has(result.loser);

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
      } else if (loserRoster.length > 0) {
        setPhase('steal');
      } else {
        setPhase('ready');
      }

      return newTerr;
    });
  }, [rosters, invincibleTeams]);

  const stealPlayer = useCallback((playerName: string) => {
    if (!battleResult) return;
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
    const alive = getAliveTeamsFrom(territories);
    setPhase(alive.length <= 1 ? 'gameover' : 'ready');
  }, [battleResult, territories]);

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
  }, []);

  return {
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime, noEnemyMsg, powerupStates,
    // Powerup system
    teamSavedPowerups, invincibleTeams, upgradeActiveTeam, upgradedPlayer,
    pendingPowerup, powerupUseType, freeAgentList, territoryStolenState,
    // Actions
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
    usePowerupNow, savePowerupForLater, useSavedPowerup, signFreeAgent,
  };
}
