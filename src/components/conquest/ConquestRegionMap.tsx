/**
 * Round 457: ONE conquest map for every sport.
 *
 * Until this round /conquest, /conquest-nba, /conquest-mlb and /conquest-nhl
 * each carried their own copy of the map component. Measured before the
 * rewrite: the four files were 1,469 lines between them and differed only in
 * which team table they read colours from, which territory list they drew,
 * and the fact that the NFL copy alone animated a takeover (Round 92), so on
 * three of the four maps an empire changing hands was a 0.8 second colour
 * fade and nothing else. That is the counter example CLAUDE.md names.
 *
 * This component takes a sport spec (regions, borders, teams, viewBox) and
 * draws the imperialism format for all of them: every region painted in its
 * owner's colour, each empire outlined and named, the attacker and the target
 * highlighted before the roll, the result shown on the map, and a takeover
 * that flashes and spreads the winner's colour from the border inward. A
 * player moving between the sports finds the same map wearing different
 * teams. Team identity is colour plus name text only. Never a logo, crest or
 * photograph.
 *
 * What a sport injects: data, in ConquestMapSport. What must not differ:
 * anything drawn here.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { bboxArea, blobFontSize, computeTeamBlobs, pathBoundingBox, type TerritoryGeom } from '@/lib/conquestMapGeometry';
import {
  assignTeamLooks, diffOwners, labelFor, lookCss, takeoverWaves, UNCLAIMED_COLOR, PHONE_LABEL_SCALE,
  type ConquestMapSport, type TeamLook,
} from '@/lib/conquestMapLook';
import { POWERUPS } from '@/data/conquestPowerups';

/** Regions that just changed hands, keyed by region, valued by the OLD owner. */
export interface ConquestTakeover {
  /** Changes on every takeover so the animation restarts even when the same regions flip twice. */
  key: number;
  from: Record<string, string | null>;
}

/** The fight the map should show. Stages: the matchup is set and the roll has
 *  not happened (pending), the fight is on (live), the result is in (resolved). */
export interface ConquestBattleView {
  attacker: string | null;
  defender: string | null;
  stage: 'pending' | 'live' | 'resolved';
  winner?: string | null;
  /** Arcade only: the single unclaimed region at stake, when there is one. */
  targetRegion?: string | null;
}

export interface ConquestRegionMapProps {
  sport: ConquestMapSport;
  owners: Record<string, string | null>;
  battle?: ConquestBattleView | null;
  takeover?: ConquestTakeover | null;
  powerupStates?: Set<string>;
  invincibleTeams?: Set<string>;
  territoryStolenState?: string | null;
  showLegend?: boolean;
}

/**
 * Turns a changing ownership map into takeover events. The first map seen is
 * the baseline; every later change yields the regions that flipped and who
 * held them. `enabled` false swallows a change (a reset back to the opening
 * map is not a conquest).
 */
export function useOwnerTakeover(owners: Record<string, string | null>, enabled = true): ConquestTakeover | null {
  const prev = useRef(owners);
  const counter = useRef(0);
  const [takeover, setTakeover] = useState<ConquestTakeover | null>(null);
  useEffect(() => {
    if (prev.current === owners) return;
    const from = diffOwners(prev.current, owners);
    prev.current = owners;
    if (!enabled) { setTakeover(null); return; }
    if (Object.keys(from).length === 0) return;
    counter.current += 1;
    setTakeover({ key: counter.current, from });
  }, [owners, enabled]);
  return takeover;
}

interface RegionGeom extends TerritoryGeom { width: number }

const LEGEND_TILES = 6;
const WAVE_DELAY_MS = 160;

export default function ConquestRegionMap({
  sport, owners, battle = null, takeover = null,
  powerupStates, invincibleTeams, territoryStolenState = null, showLegend = true,
}: ConquestRegionMapProps) {
  const uid = useId().replace(/[^A-Za-z0-9_-]/g, '');
  const [hovered, setHovered] = useState<string | null>(null);

  const teamById = useMemo(() => new Map(sport.teams.map(t => [t.id, t])), [sport]);
  const looks = useMemo(() => assignTeamLooks(sport.teams), [sport]);

  const geomById = useMemo(() => {
    const map = new Map<string, RegionGeom>();
    for (const region of sport.regions) {
      const bbox = pathBoundingBox(region.path);
      map.set(region.id, {
        id: region.id, x: region.labelX, y: region.labelY,
        area: bboxArea(bbox), width: Math.max(0, bbox.maxX - bbox.minX),
      });
    }
    return map;
  }, [sport]);

  const blobs = useMemo(() => computeTeamBlobs(owners, geomById, sport.adjacency), [owners, geomById, sport]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const owner of Object.values(owners)) if (owner) map.set(owner, (map.get(owner) || 0) + 1);
    return map;
  }, [owners]);

  const waves = useMemo(
    () => (takeover ? takeoverWaves(takeover.from, owners, sport.adjacency) : {}),
    [takeover, owners, sport],
  );

  const powerupIconByRegion = useMemo(() => {
    const map = new Map<string, string>();
    for (const id of powerupStates ?? []) {
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
      map.set(id, POWERUPS[hash % POWERUPS.length].icon);
    }
    return map;
  }, [powerupStates]);

  const lookOf = (teamId: string | null | undefined): TeamLook | null => (teamId ? looks.get(teamId) ?? null : null);
  const fillOf = (teamId: string | null | undefined): string => {
    const look = lookOf(teamId);
    if (!look) return UNCLAIMED_COLOR;
    return look.kind === 'plain' ? look.color : `url(#${uid}-p-${look.teamId})`;
  };
  const isInterior = (regionId: string) => {
    const owner = owners[regionId];
    if (!owner) return false;
    const neighbours = sport.adjacency[regionId] || [];
    return neighbours.length > 0 && neighbours.every(n => owners[n] === owner);
  };

  // One label per contiguous empire, at its area weighted centroid. The name
  // goes on when it fits the widest member at the phone size, else the code.
  const labels = useMemo(() => blobs.map(blob => {
    const team = teamById.get(blob.teamId);
    const single = blob.memberIds.length === 1;
    const anchor = single ? geomById.get(blob.memberIds[0]) : null;
    const fontSize = blobFontSize(blob.totalArea, blob.memberIds.length) + 1;
    const width = 0.85 * Math.max(...blob.memberIds.map(id => geomById.get(id)?.width ?? 0));
    return {
      teamId: blob.teamId,
      key: blob.memberIds.join('-'),
      x: single && anchor ? anchor.x : blob.centroidX,
      y: single && anchor ? anchor.y : blob.centroidY,
      fontSize,
      area: blob.totalArea,
      text: team ? labelFor(team, fontSize, width) : blob.teamId,
      look: looks.get(blob.teamId) ?? null,
    };
  }), [blobs, teamById, geomById, looks]);

  const anchorFor = (teamId: string | null | undefined) => {
    if (!teamId) return null;
    let best: typeof labels[number] | null = null;
    for (const l of labels) if (l.teamId === teamId && (!best || l.area > best.area)) best = l;
    return best;
  };

  const attackerAnchor = battle ? anchorFor(battle.attacker) : null;
  const targetGeom = battle?.targetRegion ? geomById.get(battle.targetRegion) : null;
  const defenderAnchor = battle
    ? (targetGeom ? { x: targetGeom.x, y: targetGeom.y, fontSize: 8 } : anchorFor(battle.defender))
    : null;
  const showArrow = !!battle && !!attackerAnchor && !!defenderAnchor;
  const arrowTeam = battle?.stage === 'resolved' && battle.winner ? battle.winner : battle?.attacker;
  const arrowColor = lookOf(arrowTeam)?.color ?? '#ffffff';
  const arrowPath = (() => {
    if (!attackerAnchor || !defenderAnchor) return '';
    const { x: x1, y: y1 } = attackerAnchor;
    const { x: x2, y: y2 } = defenderAnchor;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(len * 0.18, 26);
    const cx = (x1 + x2) / 2 - (dy / len) * bow;
    const cy = (y1 + y2) / 2 + (dx / len) * bow;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  })();

  const roleOf = (teamId: string | null | undefined): 'attacker' | 'defender' | null => {
    if (!battle || !teamId) return null;
    if (teamId === battle.attacker) return 'attacker';
    if (teamId === battle.defender) return 'defender';
    return null;
  };
  const winnerGain = battle?.stage === 'resolved' && battle.winner && takeover
    ? Object.keys(takeover.from).filter(r => owners[r] === battle.winner).length
    : 0;
  const winnerAnchor = battle?.stage === 'resolved' ? anchorFor(battle.winner) : null;

  const hoveredRegion = hovered ? sport.regions.find(r => r.id === hovered) : null;
  const hoveredTeam = hovered && owners[hovered] ? teamById.get(owners[hovered]!) : null;
  const hoveredLook = hoveredTeam ? looks.get(hoveredTeam.id) : null;

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const legendTiles = ranked.slice(0, LEGEND_TILES);
  const patternedOnBoard = ranked.some(([id]) => (looks.get(id)?.kind ?? 'plain') !== 'plain');
  const summary = ranked.slice(0, 3).map(([id, n]) => `${teamById.get(id)?.name ?? id} ${n}`).join(', ');
  const noun = (n: number) => {
    const one = sport.regionNoun;
    if (n === 1) return one;
    return one.endsWith('y') ? `${one.slice(0, -1)}ies` : `${one}s`;
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${sport.viewBox.width} ${sport.viewBox.height}`}
        className="w-full h-auto rounded-xl border border-border bg-[#0a0f1a]"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${sport.key.toUpperCase()} conquest map. Biggest empires: ${summary || 'none yet'}.`}
        data-sport={sport.key}
        data-map="conquest-region-map"
      >
        <defs>
          {[...looks.values()].filter(l => l.kind !== 'plain').map(look => (
            <pattern
              key={look.teamId}
              id={`${uid}-p-${look.teamId}`}
              data-team={look.teamId}
              data-kind={look.kind}
              data-accent={look.accent}
              patternUnits="userSpaceOnUse"
              width={look.kind === 'dots' ? 5 : 4.5}
              height={look.kind === 'dots' ? 5 : 4.5}
              patternTransform={look.kind === 'stripes' ? 'rotate(45)' : look.kind === 'stripesBack' ? 'rotate(135)' : undefined}
            >
              <rect width="5" height="5" fill={look.color} />
              {look.kind === 'dots' && <circle cx="2.5" cy="2.5" r="1" fill={look.accent} />}
              {(look.kind === 'stripes' || look.kind === 'stripesBack') && (
                <rect x="0" y="0" width="1.4" height="5" fill={look.accent} />
              )}
              {look.kind === 'bars' && <rect x="0" y="0" width="5" height="1.4" fill={look.accent} />}
              {look.kind === 'cross' && (
                <>
                  <rect x="0" y="0" width="1.1" height="5" fill={look.accent} />
                  <rect x="0" y="0" width="5" height="1.1" fill={look.accent} />
                </>
              )}
            </pattern>
          ))}
          <marker id={`${uid}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 Z" fill={arrowColor} />
          </marker>
        </defs>

        {/* 1. Every region in its owner's colour. */}
        {sport.regions.map(region => {
          const owner = owners[region.id] ?? null;
          const role = roleOf(owner);
          const stolen = region.id === territoryStolenState;
          return (
            <path
              key={`fill-${region.id}`}
              d={region.path}
              fill={fillOf(owner)}
              stroke="none"
              data-layer="fill"
              data-region={region.id}
              data-owner={owner ?? ''}
              className={role === 'attacker' && battle?.stage !== 'resolved' ? 'cq-lit' : undefined}
              style={{
                transition: 'fill 0.5s ease-in-out',
                filter: stolen ? 'brightness(1.5) drop-shadow(0 0 6px rgba(255,215,0,0.8))' : undefined,
              }}
            />
          );
        })}

        {/* 2. The takeover: the old colour sits on top and burns away, wave by
            wave from the winner's border, so the map shows who took what. */}
        {takeover && Object.keys(takeover.from).map(regionId => {
          const region = sport.regions.find(r => r.id === regionId);
          if (!region) return null;
          const wave = waves[regionId] ?? 0;
          return (
            <g key={`take-${takeover.key}-${regionId}`} data-layer="takeover" data-region={regionId} data-from={takeover.from[regionId] ?? ''} data-wave={wave}>
              <path d={region.path} fill={fillOf(takeover.from[regionId])} className="cq-takeover" style={{ animationDelay: `${wave * WAVE_DELAY_MS}ms` }} />
              <path d={region.path} className="cq-flash" style={{ animationDelay: `${wave * WAVE_DELAY_MS}ms` }} />
            </g>
          );
        })}

        {/* 3. Borders: faint inside an empire, dark along its frontier. */}
        {sport.regions.map(region => {
          const owner = owners[region.id] ?? null;
          if (!owner) {
            return <path key={`edge-${region.id}`} d={region.path} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={0.7} strokeLinejoin="round" />;
          }
          const interior = isInterior(region.id);
          return (
            <path
              key={`edge-${region.id}`}
              d={region.path}
              fill="none"
              stroke={interior ? 'rgba(0,0,0,0.28)' : '#0b1020'}
              strokeWidth={interior ? 0.5 : 1.3}
              strokeLinejoin="round"
              data-layer="edge"
              data-region={region.id}
              data-frontier={interior ? 'no' : 'yes'}
            />
          );
        })}

        {/* 4. The fight, readable on the map: the attacker's empire pulses
            white, the target is ringed in gold, and once the result is in
            the loser's ring dims. */}
        {battle && sport.regions.map(region => {
          const owner = owners[region.id] ?? null;
          const role = region.id === battle.targetRegion ? 'defender' : roleOf(owner);
          if (!role) return null;
          const lost = battle.stage === 'resolved' && !!battle.winner && (role === 'attacker' ? battle.attacker : battle.defender) !== battle.winner;
          return (
            <path
              key={`role-${region.id}`}
              d={region.path}
              fill="none"
              className={role === 'attacker' ? 'cq-attacker' : 'cq-target'}
              stroke={role === 'attacker' ? '#ffffff' : '#ffd166'}
              strokeWidth={region.id === battle.targetRegion ? 2.2 : 1.7}
              strokeDasharray={role === 'defender' ? '3.5 2.5' : undefined}
              strokeOpacity={lost ? 0.45 : 1}
              strokeLinejoin="round"
              data-layer="role"
              data-role={role}
              data-region={region.id}
            />
          );
        })}

        {/* 5. Hover and tap targets. */}
        {sport.regions.map(region => (
          <path
            key={`hit-${region.id}`}
            d={region.path}
            fill="transparent"
            stroke="none"
            className="cursor-pointer"
            onMouseEnter={() => setHovered(region.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setHovered(h => (h === region.id ? null : region.id))}
          />
        ))}

        {/* 6. Power-up tiles on unclaimed land (arcade). */}
        {sport.regions.map(region => {
          if (owners[region.id] || !powerupStates?.has(region.id)) return null;
          return (
            <text
              key={`pu-${region.id}`}
              x={region.labelX}
              y={region.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              className="cq-powerup"
              style={{ pointerEvents: 'none', transformOrigin: `${region.labelX}px ${region.labelY}px` }}
            >
              {powerupIconByRegion.get(region.id)}
            </text>
          );
        })}

        {/* 7. One name per empire. */}
        {labels.map(label => {
          const role = roleOf(label.teamId);
          const ink = label.look?.ink ?? '#ffffff';
          return (
            <g key={`label-${label.key}`} style={{ pointerEvents: 'none' }}>
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontWeight="bold"
                fill={ink}
                stroke={ink === '#111111' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.8)'}
                strokeWidth={label.fontSize * 0.22}
                paintOrder="stroke"
                strokeLinejoin="round"
                className="cq-label"
                data-label-team={label.teamId}
                style={{
                  '--fs': label.fontSize,
                  filter: role ? 'drop-shadow(0 0 3px rgba(255,255,255,0.7))' : undefined,
                  transition: 'font-size 0.4s ease-in-out',
                } as CSSProperties}
              >
                {label.text}
              </text>
              {invincibleTeams?.has(label.teamId) && (
                <text x={label.x + label.fontSize + 5} y={label.y - label.fontSize * 0.5} textAnchor="middle" dominantBaseline="central" fontSize={6}>
                  🛡️
                </text>
              )}
            </g>
          );
        })}

        {/* 8. The attack arrow: dashed before the roll, pulsing while the
            fight is on, solid in the winner's colour once it is over. */}
        {showArrow && (
          <path
            d={arrowPath}
            fill="none"
            stroke={arrowColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={battle?.stage === 'pending' ? '5 3' : undefined}
            markerEnd={`url(#${uid}-arrow)`}
            className={battle?.stage === 'live' ? 'cq-arrow cq-arrow-live' : 'cq-arrow'}
            data-layer="arrow"
            data-stage={battle?.stage}
            style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 3px ${arrowColor}aa)` }}
          />
        )}

        {/* 9. The result, on the map: what the winner gained. */}
        {winnerAnchor && battle?.winner && (() => {
          const chip = winnerGain > 0 ? `+${winnerGain} ${noun(winnerGain)}` : 'WIN';
          const chipWidth = chip.length * 4.4 + 8;
          const cx = Math.min(Math.max(winnerAnchor.x, chipWidth / 2 + 2), sport.viewBox.width - chipWidth / 2 - 2);
          const cy = Math.max(winnerAnchor.y - winnerAnchor.fontSize - 8, 8);
          return (
            <g data-layer="result" data-winner={battle.winner} data-gain={winnerGain} style={{ pointerEvents: 'none' }} className="cq-result">
              <rect x={cx - chipWidth / 2} y={cy - 5} width={chipWidth} height={10} rx={3} fill="#ffd166" />
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight="bold" fill="#111111">
                {chip}
              </text>
            </g>
          );
        })()}
      </svg>

      <style>{`
        .cq-label { font-size: calc(var(--fs) * 1px); }
        @media (max-width: 640px) { .cq-label { font-size: calc(var(--fs) * ${PHONE_LABEL_SCALE}px); } }
        @keyframes cq-takeover {
          0% { opacity: 1; filter: none; }
          45% { opacity: 1; filter: brightness(2) drop-shadow(0 0 6px rgba(255,255,255,0.9)); }
          100% { opacity: 0; filter: none; }
        }
        .cq-takeover { animation: cq-takeover 720ms ease-in both; pointer-events: none; }
        @keyframes cq-flash {
          0% { stroke-opacity: 0; }
          40% { stroke-opacity: 1; }
          100% { stroke-opacity: 0; }
        }
        .cq-flash { fill: none; stroke: #ffffff; stroke-width: 2.4; stroke-linejoin: round; animation: cq-flash 900ms ease-out both; pointer-events: none; }
        @keyframes cq-attacker-pulse { 0%, 100% { stroke-opacity: 0.55; } 50% { stroke-opacity: 1; } }
        .cq-attacker { animation: cq-attacker-pulse 1.1s ease-in-out infinite; pointer-events: none; }
        .cq-target { pointer-events: none; }
        .cq-lit { filter: brightness(1.18); }
        @keyframes cq-arrow-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        .cq-arrow-live { animation: cq-arrow-pulse 1.1s ease-in-out infinite; }
        @keyframes cq-result-in { 0% { opacity: 0; transform: translateY(3px); } 100% { opacity: 1; transform: none; } }
        .cq-result { animation: cq-result-in 300ms ease-out both; }
        @keyframes cq-powerup-pulse { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.22); opacity: 1; } }
        .cq-powerup { animation: cq-powerup-pulse 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cq-takeover, .cq-flash { animation: none; opacity: 0; }
          .cq-attacker, .cq-arrow-live, .cq-result, .cq-powerup { animation: none; opacity: 1; }
        }
      `}</style>

      {hovered && hoveredRegion && (
        <div className="absolute top-2 right-2 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs shadow-lg pointer-events-none z-10">
          <div className="font-bold text-foreground">{hoveredRegion.name}</div>
          {hoveredTeam ? (
            <>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: hoveredLook ? lookCss(hoveredLook) : hoveredTeam.color }} />
                <span className="text-muted-foreground">{hoveredTeam.city ? `${hoveredTeam.city} ` : ''}{hoveredTeam.name}</span>
              </div>
              <div className="text-muted-foreground mt-0.5">
                {counts.get(hoveredTeam.id) ?? 0} {noun(counts.get(hoveredTeam.id) ?? 0)}
                {invincibleTeams?.has(hoveredTeam.id) && ' 🛡️ Invincible'}
              </div>
              {hoveredLook && hoveredLook.kind !== 'plain' && (
                <div className="text-muted-foreground mt-0.5">Patterned: another club here wears nearly this colour.</div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground">
              Unclaimed{powerupStates?.has(hovered) ? ` ${powerupIconByRegion.get(hovered) || '⚡'} Power-Up` : ''}
            </div>
          )}
        </div>
      )}

      {showLegend && legendTiles.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" data-map-legend>
          {legendTiles.map(([teamId, n]) => {
            const team = teamById.get(teamId);
            const look = looks.get(teamId);
            const role = roleOf(teamId);
            return (
              <span
                key={teamId}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${role ? 'border-gold/60 bg-gold/10' : 'border-border bg-card'}`}
              >
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: look ? lookCss(look) : UNCLAIMED_COLOR }} />
                <b className="text-foreground">{team?.name ?? teamId}</b>
                <span className="text-muted-foreground">{n}</span>
              </span>
            );
          })}
          {ranked.length > LEGEND_TILES && (
            <span className="text-[11px] text-muted-foreground">+{ranked.length - LEGEND_TILES} more</span>
          )}
          {patternedOnBoard && (
            <span className="basis-full text-center text-[10px] text-muted-foreground">
              Stripes and dots mark clubs whose colours are near twins. Tap a {sport.regionNoun} for its owner.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
