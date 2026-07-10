import { NFL_STATES } from '@/data/usStatesPaths';
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
  // per state. Static input (NFL_STATES never changes at runtime) so this only
  // needs to run once.
  const geomById = useMemo(() => {
    const map = new Map<string, TerritoryGeom>();
    for (const state of NFL_STATES) {
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
  const hoveredState = hovered ? NFL_STATES.find(s => s.id === hovered) : null;
  const hoveredTeam = hoveredTeamId ? TEAM_MAP.get(hoveredTeamId) : null;
  const hoveredTerrCount = hoveredTeam
    ? Object.values(territories).filter(t => t === hoveredTeamId).length
    : 0;

  // Attack arrow (item 89): during a live battle, draw one curved arrow from
  // the attacker's empire label to the defender's, in the attacker's color.
  // Reuses the same `stateLabels` blob anchors the team-name text already
  // renders at, so the arrow always points at exactly where the labels are
  // (including after the blob's centroid shifts from a territory change).
  // `active` on a stateLabels entry already means "this blob is the one
  // fighting right now" (see the stateLabels useMemo above), so filtering on
  // that instead of just teamId correctly picks the fighting blob even for
  // a team that owns multiple disconnected empires.
  const isBattlePhase = phase === 'battle' || phase === 'animating';
  const attackerAnchor = isBattlePhase
    ? stateLabels.find(l => l.teamId === attackingTeam && l.active)
    : undefined;
  const defenderAnchor = isBattlePhase
    ? stateLabels.find(l => l.teamId === defendingTeam && l.active)
    : undefined;
  const showAttackArrow = isBattlePhase && !!attackerAnchor && !!defenderAnchor && !!attackingTeam;
  const attackerColor = attackingTeam ? (TEAM_MAP.get(attackingTeam)?.color || '#ffffff') : '#ffffff';

  // Quadratic bezier control point offset perpendicular to the attacker-
  // defender line, so the arrow curves instead of drawing a straight line
  // through whatever territory sits between them.
  const arrowPath = (() => {
    if (!attackerAnchor || !defenderAnchor) return '';
    const { x: x1, y: y1 } = attackerAnchor;
    const { x: x2, y: y2 } = defenderAnchor;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    // Perpendicular unit vector, scaled to a gentle curve (curve amount
    // capped so very long cross-country attacks don't bow absurdly wide).
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
        {NFL_STATES.map(state => {
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

        {NFL_STATES.map(state => {
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

        {NFL_STATES.map(state => (
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
        {NFL_STATES.map(state => {
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

        {/* Attack arrow (item 89): curved line from the attacker's empire
            label to the defender's, drawn in the attacker's team color with
            a subtle pulse so an ongoing battle reads clearly on the map
            itself, not just in the text panel below it. Purely visual, no
            pointer events, so it never blocks hovering the underlying
            states. */}
        {showAttackArrow && (
          <g style={{ pointerEvents: 'none' }}>
            <defs>
              <marker
                id="conquest-attack-arrowhead"
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
              markerEnd="url(#conquest-attack-arrowhead)"
              className="conquest-attack-arrow"
              style={{
                filter: `drop-shadow(0 0 3px ${attackerColor}aa)`,
              }}
            />
          </g>
        )}
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
        /* Attack arrow (item 89): a gentle opacity pulse, not a shape/position
           change, so it reads as "live" without being distracting. Reduced-
           motion users get the arrow fully visible and static instead. */
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
