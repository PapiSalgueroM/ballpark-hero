import { US_STATES } from '@/data/usStatesPaths';
import { TEAM_MAP, isLightColor } from '@/data/conquestData';
import { POWERUPS } from '@/data/conquestPowerups';
import { useState, useMemo } from 'react';
import {
  TERRITORY_ADJACENCY, pathBoundingBox, bboxArea, computeTeamBlobs, blobFontSize,
  TerritoryGeom,
} from '@/lib/conquestMapGeometry';

interface ConquestMapProps {
  territories: Record<string, string | null>;
  attackingTeam: string | null;
  defendingTeam: string | null;
  phase: string;
  powerupStates: Set<string>;
  invincibleTeams: Set<string>;
  territoryStolenState: string | null;
}

export default function ConquestMap({
  territories, attackingTeam, defendingTeam, phase,
  powerupStates, invincibleTeams, territoryStolenState,
}: ConquestMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const getColor = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return '#2a3040';
    return TEAM_MAP.get(teamId)?.color || '#2a3040';
  };

  const isActive = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    if (phase === 'battle' || phase === 'animating') {
      return teamId === attackingTeam || teamId === defendingTeam;
    }
    return false;
  };

  // Per-territory geometry (centroid = labelX/labelY, weight = path bounding-box
  // area), used to group contiguous same-owner territories into "empire" blobs
  // and place one area-weighted-centroid label per blob instead of one label
  // per state. Static input (US_STATES never changes at runtime) so this only
  // needs to run once.
  const geomById = useMemo(() => {
    const map = new Map<string, TerritoryGeom>();
    for (const state of US_STATES) {
      const bbox = pathBoundingBox(state.path);
      map.set(state.id, { id: state.id, x: state.labelX, y: state.labelY, area: bboxArea(bbox) });
    }
    return map;
  }, []);

  // Contiguous ownership blobs + their area-weighted centroids. Recomputed
  // only when ownership actually changes.
  const teamBlobs = useMemo(
    () => computeTeamBlobs(territories, geomById),
    [territories, geomById],
  );

  // A territory reads as "interior" to its empire when every neighbor it has
  // is owned by the same team (no unclaimed/enemy edge touches it), so its
  // border can fade into the blob instead of competing with the outer edge.
  const isInteriorToBlob = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    const neighbors = TERRITORY_ADJACENCY[stateId] || [];
    if (neighbors.length === 0) return false;
    return neighbors.every(n => territories[n] === teamId);
  };

  // Build one label per contiguous empire, anchored at its area-weighted
  // centroid. Single-territory owners fall back to that territory's own
  // labelX/labelY, matching the previous per-state label behavior exactly.
  const stateLabels = useMemo(() => {
    return teamBlobs.map(blob => {
      const teamId = blob.teamId;
      const color = TEAM_MAP.get(teamId)?.color || '#4a4a4a';
      const single = blob.memberIds.length === 1;
      const anchor = single ? geomById.get(blob.memberIds[0]) : null;
      const x = single && anchor ? anchor.x : blob.centroidX;
      const y = single && anchor ? anchor.y : blob.centroidY;
      const active = (phase === 'battle' || phase === 'animating')
        && blob.memberIds.some(mid => territories[mid] === attackingTeam || territories[mid] === defendingTeam)
        && (teamId === attackingTeam || teamId === defendingTeam);
      return {
        teamId,
        blobKey: blob.memberIds.join('-'),
        x, y,
        fontSize: blobFontSize(blob.totalArea, blob.memberIds.length),
        light: isLightColor(color),
        active,
        invincible: invincibleTeams.has(teamId),
      };
    });
  }, [teamBlobs, geomById, phase, attackingTeam, defendingTeam, invincibleTeams, territories]);

  // Deterministic pseudo-type per unclaimed powerup tile, purely for display:
  // the real powerup type is rolled at claim time (see useConquest.ts), so
  // there is no per-state type to read here. Hashing the state id into the
  // POWERUPS list gives each tile a stable (not flickering on re-render)
  // icon so players see distinct power-up types on the board instead of one
  // repeated bolt, without inventing new game state.
  const powerupIconByState = useMemo(() => {
    const map = new Map<string, typeof POWERUPS[number]>();
    for (const stateId of powerupStates) {
      let hash = 0;
      for (let i = 0; i < stateId.length; i++) hash = (hash * 31 + stateId.charCodeAt(i)) >>> 0;
      map.set(stateId, POWERUPS[hash % POWERUPS.length]);
    }
    return map;
  }, [powerupStates]);

  const hoveredTeamId = hovered ? territories[hovered] : null;
  const hoveredState = hovered ? US_STATES.find(s => s.id === hovered) : null;
  const hoveredTeam = hoveredTeamId ? TEAM_MAP.get(hoveredTeamId) : null;
  const hoveredTerrCount = hoveredTeam
    ? Object.values(territories).filter(t => t === hoveredTeamId).length
    : 0;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 590 310"
        className="w-full h-auto rounded-xl border border-border bg-[#0a0f1a]"
        preserveAspectRatio="xMidYMid meet"
      >
        {US_STATES.map(state => {
          const color = getColor(state.id);
          const teamId = territories[state.id];
          const active = isActive(state.id);
          const isStolen = state.id === territoryStolenState;

          return (
            <path
              key={`fill-${state.id}`}
              d={state.path}
              fill={color}
              stroke={teamId ? color : 'rgba(255,255,255,0.12)'}
              strokeWidth={teamId ? 1.5 : 0.8}
              strokeLinejoin="round"
              style={{
                transition: 'fill 0.8s ease-in-out, stroke 0.8s ease-in-out',
                filter: active
                  ? 'brightness(1.3) drop-shadow(0 0 4px rgba(255,255,255,0.4))'
                  : isStolen
                    ? 'brightness(1.5) drop-shadow(0 0 6px rgba(255,215,0,0.8))'
                    : undefined,
              }}
            />
          );
        })}

        {US_STATES.map(state => {
          const teamId = territories[state.id];
          const active = isActive(state.id);

          if (teamId) {
            const teamColor = TEAM_MAP.get(teamId)?.color || '#2a3040';
            // Territories fully surrounded by same-owner neighbors are
            // "interior" to their empire's contiguous blob: their border
            // fades thin/dim so the blob reads as one merged region, while
            // states touching an unclaimed or enemy neighbor keep the bold
            // owner-colored edge that marks the empire's actual frontier.
            const interior = !active && isInteriorToBlob(state.id);
            return (
              <path
                key={`border-${state.id}`}
                d={state.path}
                fill="transparent"
                stroke={active ? '#ffffff' : teamColor}
                strokeWidth={active ? 2 : interior ? 0.6 : 1.5}
                strokeOpacity={interior ? 0.35 : 1}
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s, stroke-opacity 0.2s' }}
              />
            );
          }

          return (
            <path
              key={`border-${state.id}`}
              d={state.path}
              fill="transparent"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          );
        })}

        {US_STATES.map(state => (
          <path
            key={`interact-${state.id}`}
            d={state.path}
            fill="transparent"
            stroke="none"
            onMouseEnter={() => setHovered(state.id)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer"
          />
        ))}

        {/* Power-up indicators on unclaimed states: each tile shows its own
            type's icon (from conquestPowerups.ts) instead of a single
            hardcoded bolt, with a subtle pulse so they read as interactive. */}
        {US_STATES.map(state => {
          const teamId = territories[state.id];
          if (teamId || !powerupStates.has(state.id)) return null;
          const powerup = powerupIconByState.get(state.id);
          if (!powerup) return null;
          return (
            <text
              key={`powerup-${state.id}`}
              x={state.labelX}
              y={state.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              className="conquest-powerup-pulse"
              style={{ pointerEvents: 'none', transformOrigin: `${state.labelX}px ${state.labelY}px` }}
            >
              {powerup.icon}
            </text>
          );
        })}

        {/* One team label per contiguous empire, anchored at the blob's
            area-weighted centroid (single-territory owners keep the exact
            same per-state anchor and font size as before). Font size scales
            modestly with blob area so big empires read clearly without
            becoming cartoonish. */}
        {stateLabels.map(({ teamId, blobKey, x, y, fontSize, light, active: isActiveTeam, invincible }) => (
          <g key={`label-${blobKey}`}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight="bold"
              fill={light ? '#111' : '#fff'}
              style={{
                pointerEvents: 'none',
                textShadow: '0 0 3px rgba(0,0,0,0.7)',
                filter: isActiveTeam ? 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' : undefined,
                transition: 'font-size 0.4s ease-in-out',
              }}
            >
              {teamId}
            </text>
            {invincible && (
              <text
                x={x + fontSize + 5}
                y={y - fontSize * 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={6}
                style={{ pointerEvents: 'none' }}
              >
                🛡️
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Scoped pulse for power-up icons; mirrors index.css's simple
          keyframe + prefers-reduced-motion convention without needing to
          touch the global stylesheet. */}
      <style>{`
        @keyframes conquest-powerup-pulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.22); opacity: 1; }
        }
        .conquest-powerup-pulse {
          animation: conquest-powerup-pulse 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .conquest-powerup-pulse {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>

      {/* Tooltip */}
      {hovered && hoveredState && (
        <div className="absolute top-2 right-2 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none z-10">
          <div className="font-bold text-foreground">{hoveredState.name}</div>
          {hoveredTeam ? (
            <>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: hoveredTeam.color }} />
                <span className="text-muted-foreground">{hoveredTeam.city} {hoveredTeam.name}</span>
              </div>
              <div className="text-muted-foreground mt-0.5">
                {hoveredTerrCount} territories
                {invincibleTeams.has(hoveredTeamId!) && ' 🛡️ Invincible'}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">
              Unclaimed{hovered && powerupStates.has(hovered) ? ` ${powerupIconByState.get(hovered)?.icon || '⚡'} Power-Up` : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
