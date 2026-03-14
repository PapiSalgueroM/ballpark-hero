import { STATE_POSITIONS, TEAM_MAP, POWER_UP_STATES, TILE_W, TILE_H, isLightColor } from '@/data/conquestData';
import { useState } from 'react';

interface ConquestMapProps {
  territories: Record<string, string | null>;
  attackingTeam: string | null;
  defendingTeam: string | null;
  phase: string;
}

export default function ConquestMap({ territories, attackingTeam, defendingTeam, phase }: ConquestMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const getColor = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return '#111827';
    return TEAM_MAP.get(teamId)?.color || '#111827';
  };

  const isActive = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    if (phase === 'battle' || phase === 'animating') {
      return teamId === attackingTeam || teamId === defendingTeam;
    }
    return false;
  };

  const hoveredState = hovered ? STATE_POSITIONS.find(s => s.id === hovered) : null;
  const hoveredTeam = hovered && territories[hovered] ? TEAM_MAP.get(territories[hovered]!) : null;
  const hoveredTerrCount = hoveredTeam
    ? Object.values(territories).filter(t => t === hoveredTeam.id).length
    : 0;

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 580 360" className="w-full h-auto rounded-xl border border-border bg-[#0a0f1a]">
        {STATE_POSITIONS.map(state => {
          const color = getColor(state.id);
          const teamId = territories[state.id];
          const isPowerUp = !teamId && POWER_UP_STATES.has(state.id);
          const light = teamId ? isLightColor(color) : false;
          const active = isActive(state.id);

          return (
            <g key={state.id}
              onMouseEnter={() => setHovered(state.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <rect
                x={state.x} y={state.y}
                width={TILE_W} height={TILE_H}
                rx={3}
                fill={color}
                stroke={active ? '#ffffff' : hovered === state.id ? '#ffffff44' : '#ffffff11'}
                strokeWidth={active ? 2 : 1}
                className="transition-colors duration-300"
                style={active ? { filter: 'brightness(1.3)' } : undefined}
              />
              <text
                x={state.x + TILE_W / 2}
                y={state.y + TILE_H / 2 + (isPowerUp ? -2 : 1)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={isPowerUp ? 7 : 8}
                fontWeight="bold"
                fill={teamId ? (light ? '#111' : '#fff') : '#555'}
                style={{ pointerEvents: 'none' }}
              >
                {state.id}
              </text>
              {isPowerUp && (
                <text
                  x={state.x + TILE_W / 2}
                  y={state.y + TILE_H / 2 + 7}
                  textAnchor="middle"
                  fontSize={8}
                  style={{ pointerEvents: 'none' }}
                >
                  ⚡
                </text>
              )}
            </g>
          );
        })}
      </svg>

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
              <div className="text-muted-foreground mt-0.5">{hoveredTerrCount} territories</div>
            </>
          ) : (
            <div className="text-muted-foreground">Unclaimed{POWER_UP_STATES.has(hovered) ? ' ⚡ Power-Up' : ''}</div>
          )}
        </div>
      )}
    </div>
  );
}
