import { useState, useRef, useCallback, useEffect } from 'react';
import {
  NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, STATE_POSITIONS,
  DIRECTIONS, DIR_ANGLES, DIR_LABELS,
} from '@/data/conquestData';
import { US_STATES } from '@/data/usStatesPaths';

export const POWERUP_TYPES = [
  { id: 'blitz', label: '⚡ Blitz', description: '+5 power for next battle' },
  { id: 'shield', label: '🛡️ Shield', description: 'Survive one loss' },
  { id: 'scout', label: '🔭 Scout', description: 'Choose your next direction' },
  { id: 'rally', label: '📣 Rally', description: '+2 roster bonus' },
  { id: 'ambush', label: '🎯 Ambush', description: 'Auto-win next neutral claim' },
] as const;

export type PowerupType = typeof POWERUP_TYPES[number]['id'];

export type Phase = 'ready' | 'animating' | 'battle' | 'steal' | 'gameover';

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
  const count = 4 + Math.floor(Math.random() * 4); // 4-7
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
  const coneHalf = Math.PI * 3 / 8; // 67.5° half-cone

  let best: TargetResult | null = null;
  let bestDist = Infinity;

  // Check enemy teams
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

  // Check neutral (unclaimed) states — they could be closer
  for (const [sid, owner] of Object.entries(territories)) {
    if (owner !== null) continue; // owned, skip
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
): BattleResult {
  const at = TEAM_MAP.get(attacker)!, dt = TEAM_MAP.get(defender)!;
  const aTerr = Object.values(territories).filter(t => t === attacker).length;
  const dTerr = Object.values(territories).filter(t => t === defender).length;

  const aPower = at.rating + aTerr * 0.5 + (rosters[attacker]?.length || 0) * 0.3;
  const dPower = dt.rating + dTerr * 0.5 + (rosters[defender]?.length || 0) * 0.3;

  const attackerWins = Math.random() < aPower / (aPower + dPower);
  const winScore = Math.floor(Math.random() * 25) + 17;
  const loseScore = Math.floor(Math.random() * Math.min(winScore, 24));

  return {
    winner: attackerWins ? attacker : defender,
    loser: attackerWins ? defender : attacker,
    winScore, loseScore,
  };
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
  const [teamPowerups, setTeamPowerups] = useState<Record<string, PowerupType[]>>({});

  const timeoutsRef = useRef<number[]>([]);
  const clearTimeouts = () => { timeoutsRef.current.forEach(clearTimeout); timeoutsRef.current = []; };
  const addTimeout = (fn: () => void, ms: number) => { timeoutsRef.current.push(window.setTimeout(fn, ms)); };

  useEffect(() => () => clearTimeouts(), []);

  const aliveTeams = useCallback(() => getAliveTeamsFrom(territories), [territories]);

  const getTeamTerritoryCount = useCallback(
    (teamId: string) => Object.values(territories).filter(t => t === teamId).length,
    [territories],
  );

  const startBattle = useCallback(() => {
    const alive = getAliveTeamsFrom(territories);
    if (alive.length <= 1) { setPhase('gameover'); return; }

    clearTimeouts();
    setNoEnemyMsg(null);

    const team = alive[Math.floor(Math.random() * alive.length)];

    // Pick a random direction first for the spinner
    const shuffledDirs = [...DIRECTIONS].sort(() => Math.random() - 0.5);
    let chosenDir: string | null = null;
    let target: TargetResult | null = null;

    for (const dir of shuffledDirs) {
      const t = findTarget(team, dir, territories);
      if (t) {
        chosenDir = dir;
        target = t;
        break;
      }
    }

    // Fallback: find closest enemy regardless of direction
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
      // Claiming a neutral state — no battle needed
      const stateId = target.stateId;
      const stateName = STATE_POSITIONS.find(s => s.id === stateId)?.name || stateId;
      const isPowerup = powerupStates.has(stateId);

      const claimState = () => {
        setTerritories(prev => ({ ...prev, [stateId]: team }));
        setTurn(t => t + 1);
        // Award random powerup if this was a powerup state
        if (isPowerup) {
          const randomPU = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
          setTeamPowerups(prev => ({
            ...prev,
            [team]: [...(prev[team] || []), randomPU.id],
          }));
          setGameLog(prev => [...prev, {
            turn: prev.length + 1,
            attacker: team,
            defender: 'neutral',
            winner: team,
            score: `claimed ${stateName} ⚡ ${randomPU.label}`,
          }]);
        } else {
          setGameLog(prev => [...prev, {
            turn: prev.length + 1,
            attacker: team,
            defender: 'neutral',
            winner: team,
            score: `claimed ${stateName}`,
          }]);
        }
        setPhase('ready');
      };

      if (missedFirst) {
        addTimeout(() => {
          setNoEnemyMsg(`No target ${DIR_LABELS[firstAttemptDir] || firstAttemptDir}!`);
        }, 3600);
        addTimeout(() => {
          setNoEnemyMsg(null);
          setDirection(chosenDir!);
        }, 5000);
        addTimeout(claimState, 6500);
      } else {
        setDirection(chosenDir);
        addTimeout(claimState, 4000);
      }
    } else {
      // Battle against enemy team
      const enemyId = target.id;
      const result = simulateBattle(team, enemyId, territories, rosters);

      if (missedFirst) {
        addTimeout(() => {
          setNoEnemyMsg(`No target ${DIR_LABELS[firstAttemptDir] || firstAttemptDir}!`);
        }, 3600);
        addTimeout(() => {
          setNoEnemyMsg(null);
          setDirection(chosenDir!);
        }, 5000);
        addTimeout(() => { setDefendingTeam(enemyId); }, 6200);
        addTimeout(() => {
          setBattleResult(result);
          setPhase('battle');
          addTimeout(() => { applyBattleResult(team, enemyId, result); }, 4500);
        }, 8000);
      } else {
        setDirection(chosenDir);
        addTimeout(() => { setDefendingTeam(enemyId); }, 3800);
        addTimeout(() => {
          setBattleResult(result);
          setPhase('battle');
          addTimeout(() => { applyBattleResult(team, enemyId, result); }, 4500);
        }, 6000);
      }
    }
  }, [territories, rosters]);

  const applyBattleResult = useCallback((attacker: string, defender: string, result: BattleResult) => {
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
        turn: prev.length + 1,
        attacker,
        defender,
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
  }, [rosters]);

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
    setTeamPowerups({});
  }, []);

  return {
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime, noEnemyMsg, powerupStates, teamPowerups,
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
  };
}
