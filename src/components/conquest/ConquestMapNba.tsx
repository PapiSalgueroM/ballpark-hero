// NBA Conquest map (item 90). Parallel to ConquestMap.tsx, pointed at
// NBA_TEAM_MAP instead of NFL's TEAM_MAP. Every geometry helper
// (TERRITORY_ADJACENCY, pathBoundingBox, bboxArea, computeTeamBlobs,
// blobFontSize) and the underlying US_STATES paths are imported unchanged
// from the same shared modules ConquestMap.tsx uses, since none of that
// code has any NFL-specific content: it operates purely on state ids and
// (x, y, area) numbers, not on team data shapes.

import { US_STATES } from '@/data/usStatesPaths';
import { isLightColor } from '@/data/conquestData';
import { NBA_TEAM_MAP } from '@/data/conquestDataNba';
import { POWERUPS } from '@/data/conquestPowerups';
import { useState, useMemo } from 'react';
import {
  TERRITORY_ADJACENCY, pathBoundingBox, bboxArea, computeTeamBlobs, blobFontSize,
  TerritoryGeom,
} from '@/lib/conquestMapGeometry';

interface ConquestMapNbaProps {
  territories: Record<string, string | null>;
  attackingTeam: string | null;
  defendingTeam: string | null;
  phase: string;
  powerupStates: Set<string>;
  invincibleTeams: Set<string>;
  territoryStolenState: string | null;
}

export default function ConquestMapNba({
  territories, attackingTeam, defendingTeam, phase,
  powerupStates, invincibleTeams, territoryStolenState,
}: ConquestMapNbaProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const getColor = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return '#2a3040';
    return NBA_TEAM_MAP.get(teamId)?.color || '#2a3040';
  };

  const isActive = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    if (phase === 'battle' || phase === 'animating') {
      return teamId === attackingTeam || teamId === defendingTeam;
    }
    return false;
  };

  const geomById = useMemo(() => {
    const map = new Map<string, TerritoryGeom>();
    for (const state of US_STATES) {
      const bbox = pathBoundingBox(state.path);
      map.set(state.id, { id: state.id, x: state.labelX, y: state.labelY, area: bboxArea(bbox) });
    }
    return map;
  }, []);

  const teamBlobs = useMemo(
    () => computeTeamBlobs(territories, geomById),
    [territories, geomById],
  );

  const isInteriorToBlob = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    const neighbors = TERRITORY_ADJACENCY[stateId] || [];
    if (neighbors.length === 0) return false;
    return neighbors.every(n => territories[n] === teamId);
  };

  const stateLabels = useMemo(() => {
    return teamBlobs.map(blob => {
      const teamId = blob.teamId;
      const color = NBA_TEAM_MAP.get(teamId)?.color || '#4a4a4a';
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
  const hoveredTeam = hoveredTeamId ? NBA_TEAM_MAP.get(hoveredTeamId) : null;
  const hoveredTerrCount = hoveredTeam
    ? Object.values(territories).filter(t => t === hoveredTeamId).length
    : 0;

  const isBattlePhase = phase === 'battle' || phase === 'animating';
  const attackerAnchor = isBattlePhase
    ? stateLabels.find(l => l.teamId === attackingTeam && l.active)
    : undefined;
  const defenderAnchor = isBattlePhase
    ? stateLabels.find(l => l.teamId === defendingTeam && l.active)
    : undefined;
  const showAttackArrow = isBattlePhase && !!attackerAnchor && !!defenderAnchor && !!attackingTeam;
  const attackerColor = attackingTeam ? (NBA_TEAM_MAP.get(attackingTeam)?.color || '#ffffff') : '#ffffff';

  const arrowPath = (() => {
    if (!attackerAnchor || !defenderAnchor) return '';
    const { x: x1, y: y1 } = attackerAnchor;
    const { x: x2, y: y2 } = defenderAnchor;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const curveAmount = Math.min(len * 0.18, 26);
    const px = -dy / len;
    const py = dx / len;
    const cx = mx + px * curveAmount;
    const cy = my + py * curveAmount;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  })();

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
            const teamColor = NBA_TEAM_MAP.get(teamId)?.color || '#2a3040';
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

        {showAttackArrow && (
          <g style={{ pointerEvents: 'none' }}>
            <defs>
              <marker
                id="conquest-attack-arrowhead-nba"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill={attackerColor} />
              </marker>
            </defs>
            <path
              d={arrowPath}
              fill="none"
              stroke={attackerColor}
              strokeWidth={2}
              strokeLinecap="round"
              markerEnd="url(#conquest-attack-arrowhead-nba)"
              className="conquest-attack-arrow"
              style={{
                filter: `drop-shadow(0 0 3px ${attackerColor}aa)`,
              }}
            />
          </g>
        )}
      </svg>

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
        @keyframes conquest-attack-arrow-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .conquest-attack-arrow {
          animation: conquest-attack-arrow-pulse 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .conquest-attack-arrow {
            animation: none;
            opacity: 0.9;
          }
        }
      `}</style>

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
