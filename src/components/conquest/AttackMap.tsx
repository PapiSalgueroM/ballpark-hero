import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LocateFixed, Minus, Plus } from 'lucide-react';
import { isLightHex } from '@/lib/conquestMapLook';
import type { AttackRegion, AttackState, Point } from '@/lib/conquestAttack';

interface Props {
  state: AttackState;
  inspectedRegion: string | null;
  onInspect: (regionId: string) => void;
}

interface ViewBox { x: number; y: number; width: number; height: number }
interface MapLabel { team: AttackState['teams'][number]; region: AttackRegion; x: number; y: number; width: number; moved: boolean }

const pathOf = (rings: Point[][]) => rings
  .map(ring => `M ${ring.map(point => `${point[0]} ${point[1]}`).join(' L ')} Z`)
  .join(' ');

function rayEnd(origin: Point, bearing: number, bounds: AttackState['setup']['bounds']): Point {
  const angle = bearing * Math.PI / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const candidates = [
    dx > 0 ? (bounds.width - origin[0]) / dx : dx < 0 ? -origin[0] / dx : Infinity,
    dy > 0 ? (bounds.height - origin[1]) / dy : dy < 0 ? -origin[1] / dy : Infinity,
  ].filter(value => value >= 0);
  const distance = Math.min(...candidates);
  return [origin[0] + dx * distance, origin[1] + dy * distance];
}

function placeLabels(entries: { team: AttackState['teams'][number]; region: AttackRegion }[], bounds: AttackState['setup']['bounds']): MapLabel[] {
  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  return [...entries].sort((a, b) => a.region.anchor[1] - b.region.anchor[1] || a.team.name.localeCompare(b.team.name)).map(entry => {
    const width = Math.min(176, Math.max(76, entry.team.name.length * 9 + 16));
    const [anchorX, anchorY] = entry.region.anchor;
    const offsets: Point[] = [];
    for (let ring = 0; ring <= 7; ring += 1) {
      for (let row = -ring; row <= ring; row += 1) {
        for (let column = -ring; column <= ring; column += 1) {
          if (Math.max(Math.abs(row), Math.abs(column)) === ring) offsets.push([column * 84, -25 + row * 50]);
        }
      }
    }
    let picked: Point | null = null;
    for (const offset of offsets) {
      const x = Math.min(bounds.width - width / 2 - 4, Math.max(width / 2 + 4, anchorX + offset[0]));
      const y = Math.min(bounds.height - 22, Math.max(22, anchorY + offset[1]));
      const box = { left: x - width / 2, right: x + width / 2, top: y - 21, bottom: y + 21 };
      if (!placed.some(other => box.left < other.right + 4 && box.right > other.left - 4 && box.top < other.bottom + 4 && box.bottom > other.top - 4)) {
        picked = [x, y];
        break;
      }
    }
    const [x, y] = picked ?? [anchorX, anchorY];
    placed.push({ left: x - width / 2, right: x + width / 2, top: y - 21, bottom: y + 21 });
    return { ...entry, x, y, width, moved: Math.hypot(x - anchorX, y - anchorY) > 22 };
  });
}

function shortTeamName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map(word => word[0]).join('').slice(0, 3).toUpperCase() : name.slice(0, 3).toUpperCase();
}

export default function AttackMap({ state, inspectedRegion, onInspect }: Props) {
  const bounds = state.setup.bounds;
  const [view, setView] = useState<ViewBox>({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: ViewBox; pointerId: number; captured: boolean } | null>(null);
  const teamById = useMemo(() => new Map(state.teams.map(team => [team.id, team])), [state.teams]);
  const regionById = useMemo(() => new Map(state.setup.regions.map(region => [region.id, region])), [state.setup.regions]);
  const viewText = `${view.x} ${view.y} ${view.width} ${view.height}`;

  const clamp = (next: ViewBox): ViewBox => ({
    ...next,
    x: Math.min(bounds.width - next.width, Math.max(0, next.x)),
    y: Math.min(bounds.height - next.height, Math.max(0, next.y)),
  });
  const zoom = (amount: number) => setView(current => {
    const factor = amount > 0 ? 0.75 : 1 / 0.75;
    const width = Math.min(bounds.width, Math.max(bounds.width / 6, current.width * factor));
    const height = Math.min(bounds.height, Math.max(bounds.height / 6, current.height * factor));
    return clamp({
      x: current.x + (current.width - width) / 2,
      y: current.y + (current.height - height) / 2,
      width,
      height,
    });
  });
  const pan = (x: number, y: number) => setView(current => clamp({
    ...current,
    x: current.x + current.width * x,
    y: current.y + current.height * y,
  }));
  const reset = () => setView({ x: 0, y: 0, width: bounds.width, height: bounds.height });

  const onKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === '+' || event.key === '=') zoom(1);
    else if (event.key === '-') zoom(-1);
    else if (event.key === 'ArrowLeft') pan(-0.12, 0);
    else if (event.key === 'ArrowRight') pan(0.12, 0);
    else if (event.key === 'ArrowUp') pan(0, -0.12);
    else if (event.key === 'ArrowDown') pan(0, 0.12);
    else if (event.key === 'Home') reset();
    else return;
    event.preventDefault();
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, view, pointerId: event.pointerId, captured: false };
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current || event.pointerId !== drag.current.pointerId) return;
    if ((event.buttons & 1) === 0) {
      drag.current = null;
      return;
    }
    const pixelX = event.clientX - drag.current.x;
    const pixelY = event.clientY - drag.current.y;
    if (!drag.current.captured && Math.hypot(pixelX, pixelY) < 4) return;
    if (!drag.current.captured) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      drag.current.captured = true;
    }
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = pixelX / rect.width * drag.current.view.width;
    const dy = pixelY / rect.height * drag.current.view.height;
    setView(clamp({ ...drag.current.view, x: drag.current.view.x - dx, y: drag.current.view.y - dy }));
  };
  const stopDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };
  const leaveMap = () => {
    if (drag.current && !drag.current.captured) drag.current = null;
  };

  const labels = useMemo(() => {
    const owned = new Map<string, AttackRegion>();
    for (const team of state.teams) {
      const home = regionById.get(team.homeRegion);
      if (home && state.owners[home.id] === team.id) owned.set(team.id, home);
    }
    for (const region of state.setup.regions) {
      const owner = state.owners[region.id];
      if (owner && !owned.has(owner)) owned.set(owner, region);
    }
    return placeLabels([...owned].map(([teamId, region]) => ({ team: teamById.get(teamId)!, region })), bounds);
  }, [bounds, regionById, state.owners, state.setup.regions, state.teams, teamById]);

  const origin = state.originRegion ? regionById.get(state.originRegion)?.anchor ?? null : null;
  const target = state.targetRegion ? regionById.get(state.targetRegion)?.anchor ?? null : null;
  const endpoint = origin && state.bearing !== null ? rayEnd(origin, state.bearing, bounds) : null;
  const selected = state.selectedTeam ? teamById.get(state.selectedTeam) : null;
  const showFullLabels = view.width <= bounds.width * 0.55;

  const inspect = (regionId: string) => onInspect(regionId);
  const focusRegion = (regionId: string) => {
    const region = regionById.get(regionId);
    if (!region) return;
    const width = bounds.width / 3;
    const height = bounds.height / 3;
    setView(clamp({ x: region.anchor[0] - width / 2, y: region.anchor[1] - height / 2, width, height }));
    inspect(regionId);
  };

  return (
    <section aria-label="Attack territory map" className="min-w-0 rounded-2xl border border-slate-950/35 bg-[#4d9bc6] p-2 shadow-[0_12px_30px_rgba(15,23,42,0.2)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-bold text-slate-950">England, generated game regions</p>
        <div className="flex items-center gap-1" aria-label="Map controls">
          <button type="button" onClick={() => zoom(1)} aria-label="Zoom in" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><Minus className="h-4 w-4" /></button>
          <button type="button" onClick={reset} aria-label="Reset map view" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><LocateFixed className="h-4 w-4" /></button>
          <button type="button" onClick={() => pan(0, -0.12)} aria-label="Pan up" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => pan(-0.12, 0)} aria-label="Pan left" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => pan(0, 0.12)} aria-label="Pan down" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={() => pan(0.12, 0)} aria-label="Pan right" className="grid min-h-[34px] min-w-[34px] place-items-center rounded-lg border border-slate-950/40 bg-white text-slate-950"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl border-2 border-slate-950/60 bg-[#4d9bc6]">
        <svg
          ref={svgRef}
          viewBox={viewText}
          data-view-box={viewText}
          role="application"
          aria-label="Soccer Attack map"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onPointerLeave={leaveMap}
          className="h-[56vh] min-h-[410px] max-h-[720px] w-full cursor-grab touch-none bg-[#4d9bc6] outline-none focus-visible:ring-4 focus-visible:ring-sky-100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker id="attack-ray-arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="strokeWidth">
              <path d="M0 0 L12 6 L0 12 Z" fill="#111827" />
            </marker>
          </defs>
          {state.setup.regions.map(region => {
            const owner = state.owners[region.id];
            const team = owner ? teamById.get(owner) : null;
            const active = inspectedRegion === region.id;
            const label = `${region.name}, ${team ? `owned by ${team.name}` : 'neutral region'}`;
            return (
              <path
                key={region.id}
                d={pathOf(region.rings)}
                fill={team?.color ?? '#ffffff'}
                fillRule="evenodd"
                stroke={active ? '#facc15' : '#172033'}
                strokeWidth={active ? 5 : 1.8}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={label}
                onClick={() => inspect(region.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    inspect(region.id);
                  }
                }}
                className="cursor-pointer outline-none focus-visible:stroke-yellow-300"
              />
            );
          })}
          {endpoint && origin && (
            <line
              x1={origin[0]}
              y1={origin[1]}
              x2={endpoint[0]}
              y2={endpoint[1]}
              stroke="#111827"
              strokeWidth="4"
              strokeDasharray="10 7"
              vectorEffect="non-scaling-stroke"
              markerEnd="url(#attack-ray-arrow)"
              pointerEvents="none"
              data-attack-origin={`${origin[0]},${origin[1]}`}
            />
          )}
          {origin && <circle cx={origin[0]} cy={origin[1]} r="7" fill={selected?.color ?? '#111827'} stroke="#ffffff" strokeWidth="3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          {target && <circle cx={target[0]} cy={target[1]} r="10" fill="none" stroke="#facc15" strokeWidth="4" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
          {labels.map(({ team, region, x, y, width, moved }) => {
            const light = isLightHex(team.color);
            const displayWidth = showFullLabels ? width : 62;
            const displayHeight = showFullLabels ? 28 : 40;
            return (
              <g key={team.id} pointerEvents="none">
                {moved && <line x1={region.anchor[0]} y1={region.anchor[1]} x2={x} y2={y} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
                <rect x={x - displayWidth / 2} y={y - displayHeight / 2} width={displayWidth} height={displayHeight} rx="8" fill={team.color} stroke="#111827" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                <text x={x} y={y + (showFullLabels ? 6 : 10)} textAnchor="middle" fontSize={showFullLabels ? 18 : 32} fontWeight="900" fill={light ? '#111827' : '#ffffff'}>
                  {showFullLabels ? team.name : shortTeamName(team.name)}
                </text>
                <title>{team.name}</title>
              </g>
            );
          })}
        </svg>
      </div>
      <label className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-950">
        Inspect a club
        <select
          aria-label="Inspect a club"
          value={state.teams.find(team => team.homeRegion === inspectedRegion)?.homeRegion ?? ''}
          onChange={event => event.target.value && focusRegion(event.target.value)}
          className="min-h-[34px] min-w-0 flex-1 rounded-lg border border-slate-950/40 bg-white px-2 text-slate-950"
        >
          <option value="">Choose a club</option>
          {[...state.teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
            <option key={team.id} value={team.homeRegion}>{team.name}</option>
          ))}
        </select>
      </label>
      <p className="mt-1 px-1 text-[11px] text-slate-950/75">Drag or use arrow keys to pan. Use plus and minus to zoom. Press Home to reset.</p>
    </section>
  );
}
