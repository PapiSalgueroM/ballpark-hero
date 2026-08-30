import { useMemo, useState } from 'react';
import { GEO_COUNTRIES, WORLD_H, WORLD_W } from '@/data/worldMapGeo';
import { pathOf, boundsOf } from '@/lib/worldMapPaths';
import { SOCCER_CLUB_MAP } from '@/data/conquestDataSoccer';
import { isLightColor } from '@/data/conquestData';

/**
 * The Soccer Conquest world map (Round 358). 173 country territories drawn from
 * the projected Natural Earth basemap the dart draft already uses, filled by
 * whoever owns them.
 *
 * Labelling is the one thing this map has to solve that the US maps do not.
 * There is no room to write 32 club names across a world at phone width, so a
 * club is named only where it holds enough ground for the name to fit, and the
 * label sits on the largest country it owns rather than at the centre of its
 * empire, which for a scattered empire is usually ocean.
 */

interface Props {
  /** iso -> club id */
  territories: Record<string, string>;
  /** the player's club, outlined so it stays findable as the map churns */
  favorite?: string | null;
  /** the two clubs in the featured tie, lifted above the rest */
  spotlight?: [string, string] | null;
}

const OCEAN = 'hsl(215 40% 12%)';
const UNCLAIMED = '#2a3040';

export default function ConquestMapSoccer({ territories, favorite, spotlight }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const geoByIso = useMemo(() => new Map(GEO_COUNTRIES.map(c => [c.iso, c])), []);

  // One label per club, on the biggest country it owns, and only when the empire
  // is big enough that the name will not sit on top of three neighbours.
  const labels = useMemo(() => {
    const best = new Map<string, { iso: string; area: number; held: number }>();
    for (const [iso, clubId] of Object.entries(territories)) {
      const geo = geoByIso.get(iso);
      if (!geo) continue;
      const area = boundsOf(geo).area;
      const cur = best.get(clubId);
      if (!cur) best.set(clubId, { iso, area, held: 1 });
      else {
        cur.held += 1;
        if (area > cur.area) { cur.iso = iso; cur.area = area; }
      }
    }
    const out: { clubId: string; x: number; y: number; text: string; size: number }[] = [];
    for (const [clubId, info] of best) {
      const club = SOCCER_CLUB_MAP.get(clubId);
      const geo = geoByIso.get(info.iso);
      if (!club || !geo) continue;
      // The biggest country it owns has to be able to carry the text.
      const b = boundsOf(geo);
      const width = b.maxx - b.minx;
      if (width < 26 && info.held < 6) continue;
      out.push({
        clubId,
        x: geo.cx,
        y: geo.cy,
        text: club.name,
        size: Math.max(6, Math.min(11, 5 + Math.sqrt(info.held) * 1.9)),
      });
    }
    return out.sort((a, b) => b.size - a.size);
  }, [territories, geoByIso]);

  const hoveredGeo = hovered ? geoByIso.get(hovered) : null;
  const hoveredClub = hovered ? SOCCER_CLUB_MAP.get(territories[hovered]) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WORLD_W} ${WORLD_H}`}
        className="w-full rounded-xl border border-border"
        style={{ background: OCEAN }}
        role="img"
        aria-label="World map of Soccer Conquest, every country coloured by the club that owns it"
      >
        {GEO_COUNTRIES.map(c => {
          const clubId = territories[c.iso];
          const club = clubId ? SOCCER_CLUB_MAP.get(clubId) : undefined;
          const isMine = !!favorite && clubId === favorite;
          const isSpot = !!spotlight && (clubId === spotlight[0] || clubId === spotlight[1]);
          return (
            <path
              key={c.iso}
              d={pathOf(c)}
              fill={club?.color ?? UNCLAIMED}
              stroke={isMine ? 'hsl(45 95% 70%)' : isSpot ? 'hsl(0 0% 100% / 0.85)' : 'hsl(222 30% 8%)'}
              strokeWidth={isMine ? 1.5 : isSpot ? 1.1 : 0.5}
              vectorEffect="non-scaling-stroke"
              opacity={hovered && hovered !== c.iso ? 0.82 : 1}
              /* Round 336's lesson, applied rather than rediscovered: a finger
                 synthesizes one mouseenter and never the matching mouseleave,
                 so a hover-only caption is a mouse feature wearing a phone's
                 clothes. The tap is handled explicitly and the caption then
                 stays on the last country touched, which is what a reader of a
                 map on a phone actually wants. */
              onMouseEnter={() => setHovered(c.iso)}
              onMouseLeave={() => setHovered(null)}
              onPointerDown={e => { if (e.pointerType !== 'mouse') setHovered(c.iso); }}
            />
          );
        })}
        {labels.map(l => {
          const club = SOCCER_CLUB_MAP.get(l.clubId);
          const dark = club ? !isLightColor(club.color) : true;
          return (
            <text
              key={l.clubId}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize={l.size}
              fontWeight={700}
              fill={dark ? '#fff' : '#111'}
              stroke={dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)'}
              strokeWidth={0.5}
              paintOrder="stroke"
              pointerEvents="none"
            >
              {l.text}
            </text>
          );
        })}
      </svg>
      {/* A caption rather than a floating tooltip: it cannot be knocked off the
          edge of a phone, and it never covers the map it is describing. */}
      <p className="mt-1 min-h-[1.25rem] text-center text-[11px] text-muted-foreground">
        {hoveredGeo && hoveredClub
          ? `${hoveredGeo.name} flies the flag of ${hoveredClub.name}`
          : 'Every country belongs to somebody. Win and you take the lot.'}
      </p>
    </div>
  );
}
