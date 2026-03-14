import { useState, useRef, useCallback, useEffect } from 'react';
import {
  NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, STATE_POSITIONS,
  DIRECTIONS, DIR_ANGLES, POWER_UP_STATES,
} from '@/data/conquestData';

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

function buildInitialTerritories(): Record<string, string | null> {
  const t: Record<string, string | null> = {};
  STATE_POSITIONS.forEach(s => { t[s.id] = INITIAL_TERRITORIES[s.id] || null; });
  return t;
}

function buildInitialRosters(): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  NFL_TEAMS.forEach(t => { r[t.id] = [...t.roster]; });
  return r;
}

function getTeamCenter(teamId: string, territories: Record<string, string | null>): { x: number; y: number } {
  const states = STATE_POSITIONS.filter(s => territories[s.id] === teamId);
  if (states.length === 0) return { x: 290, y: 180 };
  return {
    x: states.reduce((s, st) => s + st.x, 0) / states.length,
    y: states.reduce((s, st) => s + st.y, 0) / states.length,
  };
}

function getAliveTeamsFrom(territories: Record<string, string | null>): string[] {
  const s = new Set<string>();
  Object.values(territories).forEach(t => { if (t) s.add(t); });
  return Array.from(s);
}

function findTarget(teamId: string, direction: string, territories: Record<string, string | null>): string {
  const center = getTeamCenter(teamId, territories);
  const dirAngle = DIR_ANGLES[direction];
  const alive = getAliveTeamsFrom(territories).filter(t => t !== teamId);

  let best: string | null = null;
  let bestDist = Infinity;

  // Try within 67.5° cone
  for (const enemy of alive) {
    const ec = getTeamCenter(enemy, territories);
    const dx = ec.x - center.x, dy = ec.y - center.y;
    let diff = Math.abs(Math.atan2(dy, dx) - dirAngle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= Math.PI * 3 / 8) {
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = enemy; }
    }
  }

  // Fallback: closest overall
  if (!best) {
    bestDist = Infinity;
    for (const enemy of alive) {
      const ec = getTeamCenter(enemy, territories);
      const dx = ec.x - center.x, dy = ec.y - center.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = enemy; }
    }
  }

  return best || alive[0];
}

function simulateBattle(
  attacker: string, defender: string,
  territories: Record<string, string | null>,
  rosters: Record<string, string[]>,
): BattleResult {
  const at = TEAM_MAP.get(attacker)!, dt = TEAM_MAP.get(defender)!;
  const aTerr = Object.values(territories).filter(t => t === attacker).length;
  const dTerr = Object.values(territories).filter(t => t === defender).length;
  const aPU = STATE_POSITIONS.filter(s => territories[s.id] === attacker && POWER_UP_STATES.has(s.id)).length;
  const dPU = STATE_POSITIONS.filter(s => territories[s.id] === defender && POWER_UP_STATES.has(s.id)).length;

  const aPower = at.rating + aTerr * 0.5 + aPU * 3 + (rosters[attacker]?.length || 0) * 0.3;
  const dPower = dt.rating + dTerr * 0.5 + dPU * 3 + (rosters[defender]?.length || 0) * 0.3;

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

    const team = alive[Math.floor(Math.random() * alive.length)];
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    const target = findTarget(team, dir, territories);
    const result = simulateBattle(team, target, territories, rosters);

    setAttackingTeam(team);
    setDirection(dir);
    setDefendingTeam(target);
    setBattleResult(null);
    setPhase('animating');
    setAnimStartTime(Date.now());

    // After 4s animation → show battle result
    addTimeout(() => {
      setBattleResult(result);
      setPhase('battle');

      // After 2.5s → apply results
      addTimeout(() => {
        const newTerr = { ...territories };
        Object.keys(newTerr).forEach(s => {
          if (newTerr[s] === result.loser) newTerr[s] = result.winner;
        });
        setTerritories(newTerr);
        setEliminated(prev => [...prev, result.loser]);
        setTurn(prev => prev + 1);
        setGameLog(prev => [...prev, {
          turn: prev.length + 1,
          attacker: team,
          defender: target,
          winner: result.winner,
          score: `${result.winScore}-${result.loseScore}`,
        }]);

        const loserRoster = rosters[result.loser] || [];
        const aliveAfter = getAliveTeamsFrom(newTerr);
        if (aliveAfter.length <= 1) {
          setPhase('gameover');
        } else if (loserRoster.length > 0) {
          setPhase('steal');
        } else {
          setPhase('ready');
        }
      }, 2500);
    }, 4000);
  }, [territories, rosters]);

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
  }, []);

  return {
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime,
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
  };
}
