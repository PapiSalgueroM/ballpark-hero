import { US_STATES } from '@/data/usStatesPaths';
import { TEAM_MAP, POWER_UP_STATES, isLightColor } from '@/data/conquestData';
import { useState, useMemo } from 'react';

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

  // Compute one centered label per team across all their territories
  const teamLabels = useMemo(() => {
    const teamStates: Record<string, { xs: number[]; ys: number[]; color: string }> = {};
    for (const state of US_STATES) {
      const teamId = territories[state.id];
      if (!teamId) continue;
      if (!teamStates[teamId]) {
        const color = TEAM_MAP.get(teamId)?.color || '#4a4a4a';
        teamStates[teamId] = { xs: [], ys: [], color };
      }
      teamStates[teamId].xs.push(state.labelX);
      teamStates[teamId].ys.push(state.labelY);
    }
    return Object.entries(teamStates).map(([teamId, { xs, ys, color }]) => ({
      teamId,
      x: xs.reduce((a, b) => a + b, 0) / xs.length,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
      light: isLightColor(color),
      active: (phase === 'battle' || phase === 'animating') && (teamId === attackingTeam || teamId === defendingTeam),
    }));
  }, [territories, phase, attackingTeam, defendingTeam]);

  // Determine which team the hovered state belongs to
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
        {/* Layer 1: Fill states with team color, stroke = team color to merge same-team territories */}
        {US_STATES.map(state => {
          const color = getColor(state.id);
          const teamId = territories[state.id];
          const active = isActive(state.id);

          return (
            <path
              key={`fill-${state.id}`}
              d={state.path}
              fill={color}
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin="round"
              style={{
                transition: 'fill 0.8s ease-in-out, stroke 0.8s ease-in-out',
                filter: active ? 'brightness(1.3) drop-shadow(0 0 4px rgba(255,255,255,0.4))' : undefined,
              }}
            />
          );
        })}

        {/* Layer 2: Border overlay — only on unclaimed states or between different teams */}
        {US_STATES.map(state => {
          const teamId = territories[state.id];
          const active = isActive(state.id);

          // For owned states: use team color as stroke so internal borders disappear
          // Only show visible borders on unclaimed states
          if (teamId) {
            const teamColor = TEAM_MAP.get(teamId)?.color || '#4a4a4a';
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
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={0.4}
              strokeLinejoin="round"
            />
          );
        })}

        {/* Layer 3: Interaction layer (invisible, for mouse events) */}
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

        {/* Layer 4: Power-up indicators for unclaimed states */}
        {US_STATES.map(state => {
          const teamId = territories[state.id];
          if (teamId || !POWER_UP_STATES.has(state.id)) return null;
          return (
            <text
              key={`powerup-${state.id}`}
              x={state.labelX}
              y={state.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={8}
              style={{ pointerEvents: 'none' }}
            >
              ⚡
            </text>
          );
        })}

        {/* Layer 5: One label per team, centered across all their territories */}
        {teamLabels.map(({ teamId, x, y, light, active: isActiveTeam }) => (
          <text
            key={`label-${teamId}`}
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
