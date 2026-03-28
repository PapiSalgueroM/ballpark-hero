import { US_STATES } from '@/data/usStatesPaths';
import { TEAM_MAP, isLightColor } from '@/data/conquestData';
import { useState, useMemo } from 'react';

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

  // Build per-territory labels: place team abbreviation centered in each owned state
  const stateLabels = useMemo(() => {
    return US_STATES
      .filter(state => territories[state.id])
      .map(state => {
        const teamId = territories[state.id]!;
        const color = TEAM_MAP.get(teamId)?.color || '#4a4a4a';
        return {
          teamId,
          stateId: state.id,
          x: state.labelX,
          y: state.labelY,
          light: isLightColor(color),
          active: (phase === 'battle' || phase === 'animating') && (teamId === attackingTeam || teamId === defendingTeam),
          invincible: invincibleTeams.has(teamId),
        };
      });
  }, [territories, phase, attackingTeam, defendingTeam, invincibleTeams]);

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
            return (
              <path
                key={`border-${state.id}`}
                d={state.path}
                fill="transparent"
                stroke={active ? '#ffffff' : teamColor}
                strokeWidth={active ? 2 : 1.5}
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
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

        {/* Power-up indicators on unclaimed states */}
        {US_STATES.map(state => {
          const teamId = territories[state.id];
          if (teamId || !powerupStates.has(state.id)) return null;
          return (
            <text
              key={`powerup-${state.id}`}
              x={state.labelX}
              y={state.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              style={{ pointerEvents: 'none' }}
            >
              ⚡
            </text>
          );
        })}

        {/* Team labels + invincibility shield icons */}
        {teamLabels.map(({ teamId, x, y, light, active: isActiveTeam, invincible }) => (
          <g key={`label-${teamId}`}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              fontWeight="bold"
              fill={light ? '#111' : '#fff'}
              style={{
                pointerEvents: 'none',
                textShadow: '0 0 3px rgba(0,0,0,0.7)',
                filter: isActiveTeam ? 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' : undefined,
              }}
            >
              {teamId}
            </text>
            {invincible && (
              <text
                x={x + 14}
                y={y - 4}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={7}
                style={{ pointerEvents: 'none' }}
              >
                🛡️
              </text>
            )}
          </g>
        ))}
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
              <div className="text-muted-foreground mt-0.5">
                {hoveredTerrCount} territories
                {invincibleTeams.has(hoveredTeamId!) && ' 🛡️ Invincible'}
              </div>
            </>
          ) : (
            <div className="text-muted-foreground">Unclaimed{powerupStates.has(hovered) ? ' ⚡ Power-Up' : ''}</div>
          )}
        </div>
      )}
    </div>
  );
}
