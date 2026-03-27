import { US_STATES } from '@/data/usStatesPaths';
import { TEAM_MAP, POWER_UP_STATES, isLightColor } from '@/data/conquestData';
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
    if (!teamId) return '#4a4a4a';
    return TEAM_MAP.get(teamId)?.color || '#4a4a4a';
  };

  const isActive = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return false;
    if (phase === 'battle' || phase === 'animating') {
      return teamId === attackingTeam || teamId === defendingTeam;
    }
    return false;
  };

  const getTeamAbbr = (stateId: string) => {
    const teamId = territories[stateId];
    if (!teamId) return '';
    return teamId;
  };

  const hoveredState = hovered ? US_STATES.find(s => s.id === hovered) : null;
  const hoveredTeam = hovered && territories[hovered] ? TEAM_MAP.get(territories[hovered]!) : null;
  const hoveredTerrCount = hoveredTeam
    ? Object.values(territories).filter(t => t === hoveredTeam.id).length
    : 0;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 590 540"
        className="w-full h-auto rounded-xl border border-border bg-[#0a0f1a]"
        preserveAspectRatio="xMidYMid meet"
      >
        {US_STATES.map(state => {
          const color = getColor(state.id);
          const teamId = territories[state.id];
          const active = isActive(state.id);
          const light = teamId ? isLightColor(color) : false;
          const abbr = getTeamAbbr(state.id);
          const isPowerUp = !teamId && POWER_UP_STATES.has(state.id);

          return (
            <g
              key={state.id}
              onMouseEnter={() => setHovered(state.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <path
                d={state.path}
                fill={color}
                stroke={active ? '#ffffff' : hovered === state.id ? '#ffffff66' : '#ffffff22'}
                strokeWidth={active ? 2 : 0.5}
                style={{
                  transition: 'fill 0.8s ease-in-out, stroke 0.2s, stroke-width 0.2s',
                  filter: active ? 'brightness(1.3) drop-shadow(0 0 4px rgba(255,255,255,0.4))' : undefined,
                }}
              />
              {/* Team abbreviation label */}
              {abbr && (
                <text
                  x={state.labelX}
                  y={state.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={state.id === 'AK' || state.id === 'HI' ? 6 : 7}
                  fontWeight="bold"
                  fill={light ? '#111' : '#fff'}
                  style={{ pointerEvents: 'none', textShadow: '0 0 2px rgba(0,0,0,0.6)' }}
                >
                  {abbr}
                </text>
              )}
              {/* Power-up indicator for unclaimed states */}
              {isPowerUp && (
                <text
                  x={state.labelX}
                  y={state.labelY}
                  textAnchor="middle"
                  dominantBaseline="central"
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
