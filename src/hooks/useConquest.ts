import { useState, useRef, useCallback, useEffect } from 'react';
import {
  NFL_TEAMS, TEAM_MAP, INITIAL_TERRITORIES, STATE_POSITIONS,
  DIRECTIONS, DIR_ANGLES, DIR_LABELS, STATE_GEO_COORDS,
  CONQUEST_FREE_AGENCY_POOL, ConquestFreeAgentCandidate,
} from '@/data/conquestData';
import { NFL_STATES } from '@/data/usStatesPaths';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';
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
  // True when the matchup came from the nearest-enemy fallback because the
  // attacker had no bordering enemy or neutral to hit (islanded team).
  longDistance?: boolean;
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

// Candidate target for the choosable Territory Steal power-up: an enemy
// border state the stealing team may claim.
export interface StealCandidate {
  stateId: string;
  stateName: string;
  ownerId: string;
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
export type { PowerupId, PowerupDef, FreeAgent, BattleSimulation, PlayEvent, BoxScore, TeamStatLine, TeamRatingOverride, ConquestFreeAgentCandidate };
export { POWERUPS, FREE_AGENTS, TEAM_LEGENDS, CONQUEST_FREE_AGENCY_POOL };

// Power rankings tuning (item 86): a win/loss nudges a team's O/D a small
// amount so the ranked list reflects in-run form, and, critically, the
// SAME adjusted numbers feed simulateDetailedBattle's win probability, so
// the panel isn't just cosmetic. Kept small and clamped so a hot streak
// bends the odds without erasing the underlying talent gap.
const POWER_RANK_WIN_BUMP = 1.5;
const POWER_RANK_LOSS_BUMP = -1.5;
const POWER_RANK_CLAMP = 12; // max total drift from the static base rating

// Expansion bonus (item 84): claiming a neutral/unoccupied state grants a
// flat +1 drift, clamped by the same POWER_RANK_CLAMP ceiling as battle wins
// so a long uncontested run of neutral grabs still can't blow past the
// drift system's cap.
const EXPANSION_BONUS_BUMP = 1;

// Free Agency tab tuning (item 87): a favorite-team sign is a bigger deal
// than a random power-up pickup (it's a deliberate roster upgrade the user
// chose), so it's rate-limited to once every 3 conquests (battle
// resolutions, i.e. calls to applyPowerRankUpdate/applyBattleResult) and
// grants a slightly larger drift bump than a plain expansion bonus.
const FREE_AGENCY_SIGN_COOLDOWN = 3;
const FREE_AGENCY_SIGN_BUMP = 2;

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
NFL_STATES.forEach(s => GEO_CENTERS.set(s.id, { x: s.labelX, y: s.labelY }));

function buildInitialTerritories(): Record<string, string | null> {
  const t: Record<string, string | null> = {};
  STATE_POSITIONS.forEach(s => { t[s.id] = INITIAL_TERRITORIES[s.id] || null; });
  return t;
}

function pickRandomPowerupStates(): Set<string> {
  const terr = buildInitialTerritories();
  // Only reachable, NFL-map-rendered territories qualify: the NBA-only ghost
  // splits (TX_E, TX_CS, CA_NW, CA_NE) sit in the territory record but are
  // absent from TERRITORY_ADJACENCY, so a power-up there could never be
  // claimed under adjacency-only matchups (and never rendered either).
  const neutralIds = Object.keys(terr).filter(id => terr[id] === null && id in TERRITORY_ADJACENCY);
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

// Global name -> position/overall lookup so players keep their real card no
// matter how they travel between rosters (steals, signings, eliminations).
// First listing wins: team tables, then power-up FREE_AGENTS, then the Free
// Agency tab pool, then franchise legends.
const PLAYER_INFO = new Map<string, { position: string; overall: number }>();
NFL_TEAMS.forEach(t => (t.players || []).forEach(p => {
  if (!PLAYER_INFO.has(p.name)) PLAYER_INFO.set(p.name, { position: p.position, overall: p.overall });
}));
FREE_AGENTS.forEach(fa => {
  if (!PLAYER_INFO.has(fa.name)) PLAYER_INFO.set(fa.name, { position: fa.position, overall: fa.overall });
});
CONQUEST_FREE_AGENCY_POOL.forEach(c => {
  if (!PLAYER_INFO.has(c.name)) PLAYER_INFO.set(c.name, { position: c.position, overall: c.overall });
});
Object.values(TEAM_LEGENDS).forEach(l => {
  if (!PLAYER_INFO.has(l.name)) PLAYER_INFO.set(l.name, { position: l.position, overall: l.overall });
});
function lookupPlayerInfo(name: string): { position: string; overall: number } {
  return PLAYER_INFO.get(name) || { position: '?', overall: 75 };
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

// Adjacency-only matchups: collect the enemy teams and neutral states that
// actually border this team's territory (same hand-checked
// TERRITORY_ADJACENCY graph the map's blob renderer uses), so battles are
// always between neighbors instead of cross-map teleports.
function getAdjacentTargets(teamId: string, territories: Record<string, string | null>): { enemies: Set<string>; neutrals: Set<string> } {
  const enemies = new Set<string>();
  const neutrals = new Set<string>();
  for (const [sid, owner] of Object.entries(territories)) {
    if (owner !== teamId) continue;
    for (const n of (TERRITORY_ADJACENCY[sid] || [])) {
      if (!(n in territories)) continue;
      const nOwner = territories[n];
      if (nOwner === null) neutrals.add(n);
      else if (nOwner !== teamId) enemies.add(nOwner);
    }
  }
  return { enemies, neutrals };
}

function findTarget(teamId: string, direction: string, territories: Record<string, string | null>): TargetResult | null {
  const center = getTeamGeoCenter(teamId, territories);
  const dirAngle = DIR_ANGLES[direction]; // compass bearing in radians
  const coneHalf = (67 / 2) * Math.PI / 180; // 33.5 degrees half-cone

  let best: TargetResult | null = null;
  let bestDist = Infinity;

  // Only bordering enemies and bordering neutral states are legal targets.
  const adj = getAdjacentTargets(teamId, territories);

  // Check adjacent enemy teams
  for (const enemy of adj.enemies) {
    const ec = getTeamGeoCenter(enemy, territories);
    const bearing = compassBearing(center.lat, center.lon, ec.lat, ec.lon);
    const diff = angleDiff(bearing, dirAngle);
    if (diff <= coneHalf) {
      const dist = geoDist(center.lat, center.lon, ec.lat, ec.lon);
      if (dist < bestDist) { bestDist = dist; best = { type: 'team', id: enemy }; }
    }
  }

  // Check adjacent neutral territories
  for (const sid of adj.neutrals) {
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

// Find enemy-owned states that directly border a team's territory (true map
// adjacency via TERRITORY_ADJACENCY, not the old centroid-distance guess).
function findBorderEnemyStates(teamId: string, territories: Record<string, string | null>): string[] {
  const results = new Set<string>();
  for (const [sid, owner] of Object.entries(territories)) {
    if (owner !== teamId) continue;
    for (const n of (TERRITORY_ADJACENCY[sid] || [])) {
      const nOwner = territories[n];
      if (nOwner && nOwner !== teamId) results.add(n);
    }
  }
  return Array.from(results);
}

export function useConquest() {
  const [isReady, setIsReady] = useState(false);
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
  const [powerupStates, setPowerupStates] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPowerupStates(pickRandomPowerupStates());
    setIsReady(true);
  }, []);
  
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
  // Choosable power-up targets: which team is resolving a targeted power-up,
  // and (for territory steal) the legal border-state candidates.
  const [powerupTeam, setPowerupTeam] = useState<string | null>(null);
  const [stealCandidates, setStealCandidates] = useState<StealCandidate[]>([]);
  
  // Play-by-play state
  const [visiblePlays, setVisiblePlays] = useState<PlayEvent[]>([]);
  const [playByPlayActive, setPlayByPlayActive] = useState(false);
  const [simulatingRemainder, setSimulatingRemainder] = useState(false);
  const [boxScore, setBoxScore] = useState<BoxScore | null>(null);
  const [stealModalOpen, setStealModalOpen] = useState(false);
  const [pendingBattleApply, setPendingBattleApply] = useState<{ attacker: string; defender: string; result: BattleResult } | null>(null);
  const [playerConfirmed, setPlayerConfirmed] = useState<string | null>(null);

  // Skip-to-result (item 89): the battle result is fully pre-computed the
  // instant startBattle picks a target (see simulateBattle below), so once a
  // battle is in the reveal phase there is nothing left to simulate, only a
  // staggered reveal to fast-forward. This ref holds the already-computed
  // outcome for the battle currently revealing, so "Skip" can jump straight
  // to the end without touching the RNG or re-simulating anything.
  const inFlightBattleRef = useRef<{ team: string; enemyId: string; result: BattleResult } | null>(null);
  const [canSkipBattle, setCanSkipBattle] = useState(false);

  // Power rankings (item 86): per-team O/D drift from this run's battle
  // results, plus a battle win/loss tally. The drift feeds BOTH the ranked
  // panel display and the actual win-probability calculation, so the panel
  // is never just decorative.
  const [powerRankDrift, setPowerRankDrift] = useState<Record<string, number>>(() => buildInitialPowerRankDrift());
  const [powerRankRecord, setPowerRankRecord] = useState<Record<string, { wins: number; losses: number }>>({});

  // Free Agency tab (item 87): a docked panel of notable unattached players.
  // `favoriteTeam` is user-selected (defaults to null until chosen, so the
  // panel can prompt for a pick); `conquestsSinceSign` counts resolved
  // battles since the last sign and gates the once-per-3 cadence;
  // `signedFreeAgents` is a simple audit trail persisted for the run.
  const [favoriteTeam, setFavoriteTeamState] = useState<string | null>(null);
  const [conquestsSinceSign, setConquestsSinceSign] = useState(0);
  const [signedFreeAgents, setSignedFreeAgents] = useState<string[]>([]);

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
    const alive = new Set(getAliveTeamsFrom(territories));
    return NFL_TEAMS
      .filter(t => alive.has(t.id)) // eliminated teams drop out of the rankings
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
  }, [buildRatingOverrides, powerRankRecord, territories]);

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
    const seen = new Set(agents.map(x => x.name));

    // Add eliminated teams' players from their FINAL roster (not the static
    // team table), so stolen or signed players whose new team later fell
    // re-enter the pool and become signable again.
    for (const elimId of eliminated) {
      for (const name of (rosters[elimId] || [])) {
        if (activeRosterNames.has(name) || seen.has(name)) continue;
        seen.add(name);
        const info = lookupPlayerInfo(name);
        agents.push({ name, position: info.position, overall: info.overall });
      }
    }

    return agents.sort((a, b) => b.overall - a.overall).slice(0, 30);
  }, [territories, rosters, eliminated]);

  // Live pool for the docked Free Agency tab: the curated veteran pool plus
  // every eliminated team's final-roster players, minus anyone currently on
  // an alive roster. Eliminated-team players carry their real card via
  // lookupPlayerInfo, so a player stolen in battle re-enters free agency if
  // the team that stole them later falls.
  const freeAgencyPool = useCallback((): ConquestFreeAgentCandidate[] => {
    const activeRosterNames = new Set<string>();
    const alive = getAliveTeamsFrom(territories);
    for (const tid of alive) {
      for (const name of (rosters[tid] || [])) activeRosterNames.add(name);
    }

    const pool: ConquestFreeAgentCandidate[] = CONQUEST_FREE_AGENCY_POOL.filter(c => !activeRosterNames.has(c.name));
    const seen = new Set(pool.map(x => x.name));

    for (const elimId of eliminated) {
      const teamName = TEAM_MAP.get(elimId)?.name || elimId;
      for (const name of (rosters[elimId] || [])) {
        if (activeRosterNames.has(name) || seen.has(name)) continue;
        seen.add(name);
        const info = lookupPlayerInfo(name);
        pool.push({ name, position: info.position, overall: info.overall, blurb: `Hit the market when the ${teamName} fell` });
      }
    }

    return pool.sort((a, b) => b.overall - a.overall);
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
        setPowerupTeam(teamId);
        setPowerupUseType('free_agent');
        setPhase('powerup_use');
        break;

      case 'upgrade': {
        // Choosable target: open a picker over the team's current roster.
        // chooseUpgradePlayer() with no argument keeps the old random
        // auto-pick alive as the fallback code path.
        const roster = rosters[teamId] || [];
        if (roster.length === 0) { setPhase('ready'); break; }
        setPowerupTeam(teamId);
        setPowerupUseType('upgrade');
        setPhase('powerup_use');
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
        // Choosable target: list the enemy states that truly border this
        // team and let the user pick one. stealTerritoryTarget() with no
        // argument keeps the old random auto-pick as the fallback path.
        const borderStates = findBorderEnemyStates(teamId, territories);
        if (borderStates.length > 0) {
          setStealCandidates(borderStates.map(sid => ({
            stateId: sid,
            stateName: STATE_POSITIONS.find(st => st.id === sid)?.name || sid,
            ownerId: territories[sid] || 'neutral',
          })));
          setPowerupTeam(teamId);
          setPowerupUseType('territory_steal');
          setPhase('powerup_use');
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
  }, [territories, rosters, buildFreeAgentList]);

  // Resolve the Upgrade power-up for the chosen player (or a random roster
  // player when called with no argument, the auto-pick fallback).
  const chooseUpgradePlayer = useCallback((playerName?: string) => {
    if (!powerupTeam) return;
    const roster = rosters[powerupTeam] || [];
    if (roster.length === 0) {
      setPowerupTeam(null);
      setPowerupUseType(null);
      setPhase('ready');
      return;
    }
    const player = playerName && roster.includes(playerName)
      ? playerName
      : roster[Math.floor(Math.random() * roster.length)];
    setUpgradeActiveTeam(powerupTeam);
    setUpgradedPlayer(player);
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: powerupTeam, defender: 'powerup',
      winner: powerupTeam, score: `⬆️ ${player} upgraded to 99 OVR!`,
    }]);
    setPowerupTeam(null);
    setPowerupUseType(null);
    setPhase('ready');
  }, [powerupTeam, rosters]);

  // Resolve the Territory Steal power-up for the chosen border state (or a
  // random candidate when called with no argument, the auto-pick fallback).
  const stealTerritoryTarget = useCallback((stateId?: string) => {
    if (!powerupTeam) return;
    if (stealCandidates.length === 0) {
      setPowerupTeam(null);
      setPowerupUseType(null);
      setPhase('ready');
      return;
    }
    const chosen = stateId && stealCandidates.some(c => c.stateId === stateId)
      ? stateId
      : stealCandidates[Math.floor(Math.random() * stealCandidates.length)].stateId;
    const teamId = powerupTeam;
    const prevOwner = territories[chosen];
    const stateName = stealCandidates.find(c => c.stateId === chosen)?.stateName || chosen;

    setTerritoryStolenState(chosen);
    setTerritories(prev => ({ ...prev, [chosen]: teamId }));

    // Check if prev owner lost all territory
    const updatedTerr = { ...territories, [chosen]: teamId };
    const ownerStatesLeft = prevOwner ? Object.values(updatedTerr).filter(t => t === prevOwner).length : 0;
    if (prevOwner && ownerStatesLeft === 0) {
      setEliminated(e => [...e, prevOwner]);
    }

    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: prevOwner || 'neutral',
      winner: teamId, score: `🗺️ Stole ${stateName} from ${prevOwner ? (TEAM_MAP.get(prevOwner)?.name || prevOwner) : 'neutral'}!`,
    }]);

    setStealCandidates([]);
    setPowerupTeam(null);
    setPowerupUseType(null);

    // Clear animation after a moment
    addTimeout(() => {
      setTerritoryStolenState(null);
      setPhase('ready');
    }, 1500);
  }, [powerupTeam, stealCandidates, territories]);

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

  // Sign a free agent (called from free agent modal). powerupTeam is the
  // team actually using the power-up (set by executePowerup), so a saved
  // power-up used later can't mis-credit whoever happens to be attacking.
  const signFreeAgent = useCallback((playerName: string) => {
    const teamId = powerupTeam || pendingPowerup?.teamId || attackingTeam;
    if (!teamId) return;
    setRosters(prev => ({
      ...prev,
      [teamId]: [...(prev[teamId] || []), playerName],
    }));
    setGameLog(prev => [...prev, {
      turn: prev.length + 1, attacker: teamId, defender: 'powerup',
      winner: teamId, score: `✍️ Signed ${playerName}!`,
    }]);
    setPowerupTeam(null);
    setPowerupUseType(null);
    setPhase('ready');
  }, [powerupTeam, pendingPowerup, attackingTeam]);

  // Set (or change) which team the Free Agency tab (item 87) signs for.
  // Pass null to clear the pick and navigate back to the team picker.
  const setFavoriteTeam = useCallback((teamId: string | null) => {
    setFavoriteTeamState(teamId);
  }, []);

  // Whether a sign is currently allowed: needs a chosen favorite team, that
  // team must still be alive, and the once-per-3-conquests cooldown must
  // have elapsed. Exposed as a function (not derived state) so the panel
  // can call it fresh on every render without another effect.
  const canSignFreeAgent = useCallback((): boolean => {
    if (!favoriteTeam) return false;
    if (!getAliveTeamsFrom(territories).includes(favoriteTeam)) return false;
    return conquestsSinceSign >= FREE_AGENCY_SIGN_COOLDOWN;
  }, [favoriteTeam, territories, conquestsSinceSign]);

  // Sign a Free Agency tab candidate (item 87) to the favorite team: drops
  // the current weakest roster player (lowest overall, via conquestData's
  // player table with the same 75-overall fallback conquestBattle.ts uses
  // for unlisted names) and adds the candidate in their place, plus a small
  // clamped drift bump via the same clampDrift/POWER_RANK_CLAMP system that
  // backs battle wins and expansion bonuses, so this stays one coherent
  // rating system instead of a bolted-on second one.
  const signFreeAgencyCandidate = useCallback((candidate: ConquestFreeAgentCandidate) => {
    if (!canSignFreeAgent() || !favoriteTeam) return;

    const roster = rosters[favoriteTeam] || [];
    if (roster.length === 0) return;

    const team = TEAM_MAP.get(favoriteTeam);
    const playerMap = new Map((team?.players || []).map(p => [p.name, p]));
    let weakestName = roster[0];
    let weakestOvr = playerMap.get(roster[0])?.overall ?? lookupPlayerInfo(roster[0]).overall;
    for (const name of roster) {
      const ovr = playerMap.get(name)?.overall ?? lookupPlayerInfo(name).overall;
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
    let longDistanceRaid = false;

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
      longDistanceRaid = true; // islanded: no bordering target, nearest-enemy raid
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

        // Unoccupied-state capture bonus (item 84): grabbing a neutral state
        // is a real expansion, not just a walkover, so it earns the same
        // small clamped O/D drift a battle win does (reuses the
        // POWER_RANK_CLAMP-bounded clampDrift helper that backs
        // applyPowerRankUpdate, just with a flat +1 instead of the
        // win/loss bump size). This was weighed against handing out a free
        // free-agency pick instead; +1 rating was chosen because it slots
        // straight into the existing drift system that already drives win
        // probability, rather than adding a second reward currency.
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
      const result = simulateBattle(team, enemyId, territories, rosters, upgradeActiveTeam, upgradedPlayer, buildRatingOverrides());
      if (longDistanceRaid) result.longDistance = true;

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

        // The full outcome (all plays + final box score) already exists in
        // `sim` right now, before any reveal timeout has fired. Stash it so
        // "Skip to result" (item 89) can jump straight there instead of
        // re-simulating anything.
        inFlightBattleRef.current = { team, enemyId, result };
        setCanSkipBattle(true);

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
          setCanSkipBattle(false);
          inFlightBattleRef.current = null;
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
    // Free Agency cadence (item 87): every resolved battle ("conquest")
    // ticks the cooldown counter, independent of who won or lost, so the
    // once-per-3 gate tracks overall run progress rather than any one
    // team's record.
    setConquestsSinceSign(prev => prev + 1);
  }, []);

  const applyBattleResult = useCallback((attacker: string, defender: string, result: BattleResult, stolenPlayer?: string) => {
    const loserIsInvincible = invincibleTeams.has(result.loser);
    applyPowerRankUpdate(result.winner, result.loser);
    const raidTag = result.longDistance ? ' · long-distance raid' : '';

    // Home/away rule: the defender always fights on home turf. An attacker
    // that loses AWAY is merely repelled, it loses no territory and is
    // never eliminated. Only a defender that loses at home has its territory
    // conquered. Checked before invincibility so a shield is never consumed
    // on an away loss where no territory was at stake.
    if (result.loser === attacker) {
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore}${raidTag} · away raid repelled`,
        stolenPlayer,
      }]);
      setPhase('ready');
      return;
    }

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
        score: `${result.winScore}-${result.loseScore}${raidTag} (🛡️ ${TEAM_MAP.get(result.loser)?.name} survived!)`,
        stolenPlayer,
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

      setEliminated(e => [...e, result.loser]);
      setTurn(t => t + 1);
      setGameLog(prev => [...prev, {
        turn: prev.length + 1, attacker, defender,
        winner: result.winner,
        score: `${result.winScore}-${result.loseScore}${raidTag} · home turf conquered`,
        stolenPlayer,
      }]);

      if (aliveAfter.length <= 1) {
        setPhase('gameover');
      } else {
        setPhase('ready');
      }

      return newTerr;
    });
  }, [invincibleTeams, applyPowerRankUpdate]);

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
      // Apply the battle result; the stolen player rides along so the log
      // line for THIS battle carries the steal (it used to be patched onto
      // whatever entry happened to be last, i.e. the previous battle's line).
      applyBattleResult(pendingBattleApply.attacker, pendingBattleApply.defender, pendingBattleApply.result, playerName);
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

  // Skip to result (item 89): the battle is already fully simulated by the
  // time the reveal starts (see startPlayByPlay above), so skipping never
  // re-rolls anything, it just cancels the staggered reveal timeouts and
  // jumps straight to the final score + full box score, exactly as if every
  // play had already been revealed. The steal flow picks up normally from
  // there (pendingBattleApply gets set just like the non-skip path).
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
    setPowerupTeam(null);
    setStealCandidates([]);
    setVisiblePlays([]);
    setPlayByPlayActive(false);
    setSimulatingRemainder(false);
    setBoxScore(null);
    setStealModalOpen(false);
    setPendingBattleApply(null);
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
    isReady,
    territories, rosters, eliminated, turn, phase,
    attackingTeam, direction, defendingTeam, battleResult, gameLog,
    animStartTime, noEnemyMsg, powerupStates,
    // Powerup system
    teamSavedPowerups, invincibleTeams, upgradeActiveTeam, upgradedPlayer,
    pendingPowerup, powerupUseType, freeAgentList, territoryStolenState,
    powerupTeam, stealCandidates,
    // Play-by-play
    visiblePlays, playByPlayActive, simulatingRemainder, boxScore,
    stealModalOpen, pendingBattleApply, playerConfirmed,
    // Power rankings (item 86)
    powerRankings,
    // Free Agency tab (item 87)
    favoriteTeam, setFavoriteTeam, conquestsSinceSign, signedFreeAgents,
    canSignFreeAgent, signFreeAgencyCandidate, freeAgencyPool,
    freeAgencyCooldownRemaining: Math.max(0, FREE_AGENCY_SIGN_COOLDOWN - conquestsSinceSign),
    // Skip to result (item 89)
    canSkipBattle, skipToResult,
    // Actions
    startBattle, stealPlayer, reset, aliveTeams, getTeamTerritoryCount,
    usePowerupNow, savePowerupForLater, useSavedPowerup, signFreeAgent,
    chooseUpgradePlayer, stealTerritoryTarget,
    openStealModal, closeStealModal, skipSteal,
  };
}
