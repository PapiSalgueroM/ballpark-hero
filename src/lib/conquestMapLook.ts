/**
 * Round 457: how a team LOOKS on the conquest map, shared by every sport.
 *
 * The four conquest routes used to carry four copies of one map component
 * that differed only in which team table they read colours from. This module
 * holds the pure parts of the shared renderer so a harness can measure them
 * without a browser:
 *
 *   - the sport spec a map is drawn from (regions, borders, teams, viewBox),
 *   - colour distance, and the look each team gets so that two clubs whose
 *     colours are near twins never sit on a border looking identical. The
 *     second colour of a patterned look is the club's DOCUMENTED secondary
 *     colour where the data carries one; otherwise a plain neutral that
 *     contrasts with the base. Never a logo, never an invented colour.
 *   - which label fits a territory (the name where it fits, the code where
 *     it does not; the full name is always on hover or tap),
 *   - the takeover: which regions changed hands between two ownership maps,
 *     and the order they should flip in so the new colour spreads from the
 *     winner's border instead of blinking everywhere at once.
 */

export interface ConquestMapTeam {
  id: string;
  name: string;
  city?: string;
  color: string;
  secondaryColor?: string;
}

export interface ConquestRegion {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

/** Everything a sport injects into the shared map. Data, never drawing code. */
export interface ConquestMapSport {
  /** Short key for element ids and copy ("nfl", "nba", "mlb", "nhl"). */
  key: string;
  regions: ConquestRegion[];
  adjacency: Record<string, string[]>;
  teams: ConquestMapTeam[];
  viewBox: { width: number; height: number };
  /** What one region is called in this sport's copy: "state", "territory". */
  regionNoun: string;
  /** Round 459: label size relative to the US maps. The renderer sizes a
   *  label for a state, and a hex cartogram's regions are a third of that
   *  width, so at 1 the codes of neighbouring single hex empires ran into
   *  each other on a phone (measured 2026-09-05: a three letter code at the
   *  phone size is 19 units wide on a 21 unit hex). Default 1. */
  labelScale?: number;
}

export const LOOK_KINDS = ['plain', 'stripes', 'stripesBack', 'dots', 'cross', 'bars'] as const;
export type LookKind = typeof LOOK_KINDS[number];

export interface TeamLook {
  teamId: string;
  color: string;
  kind: LookKind;
  /** The second colour of a patterned look. Unused when kind is plain. */
  accent: string;
  /** Label ink that reads on the base colour. */
  ink: '#111111' | '#ffffff';
}

/**
 * Two base colours closer than this (CIE76 delta E) are near twins on a map.
 * Measured over the four leagues on 2026-09-05: NFL has 9 pairs under 5 and 3
 * between 5 and 10 (HOU/TEN at 11.1 and BAL/MIN at 11.2 are both navy on navy
 * and purple on purple); NHL has 18 pairs under 5 including three clubs on the
 * exact same red. At 12 the greedy assignment below needs 4, 5, 4 and 6 looks
 * for NFL, NBA, MLB and NHL, so six kinds cover every league with no overflow.
 *
 * Round 459 put 96 football clubs on one map and measured the same rule: the
 * reds alone are a cluster of twenty (Liverpool has 19 near twins), twelve
 * kinds would have been needed, and 38 pairs were indistinguishable at six.
 * Twelve patterns on one red is not a map anyone can read, so a look is now
 * a KIND and an ACCENT together: red and white stripes are not red and black
 * stripes. The accent is the club's documented second colour where it has
 * one, then the neutral that reads on the base, then the other neutral, and
 * the greedy assignment varies the kind first and the accent only when every
 * kind is spoken for in that accent.
 */
export const CLASH_DISTANCE = 12;

/** Base labels scale up by this on phones (see the renderer's style block), so
 *  a name only counts as fitting if it still fits at the phone size. */
export const PHONE_LABEL_SCALE = 1.3;

/** Average advance width of a bold sans glyph in em, measured over the team names. */
const GLYPH_EM = 0.6;

export const UNCLAIMED_COLOR = '#2a3040';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

export function isLightHex(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

function toLab(hex: string): [number, number, number] {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = hexToRgb(hex).map(lin);
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f((0.2126 * r + 0.7152 * g + 0.0722 * b) / 1.0);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 delta E between two hex colours. 0 is identical; under about 2 is invisible. */
export function colorDistance(a: string, b: string): number {
  const A = toLab(a);
  const B = toLab(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

/** The accents a club may wear, best first: its documented second colour, the
 *  neutral that reads on its base, the other neutral. Twins of the base are out. */
function accentCandidates(team: ConquestMapTeam, clash: number): string[] {
  const light = isLightHex(team.color);
  const out: string[] = [];
  for (const c of [team.secondaryColor, light ? '#111111' : '#ffffff', light ? '#ffffff' : '#111111']) {
    if (c && !out.includes(c) && colorDistance(c, team.color) >= clash) out.push(c);
  }
  return out;
}

/**
 * Greedy look assignment in team order: a team takes the first kind, in its
 * best accent, not already held by an earlier team whose base colour is
 * within CLASH_DISTANCE in an accent within CLASH_DISTANCE; plain counts as
 * one kind with no accent, so a cluster of twins holds at most one plain.
 * The result depends only on the team list, so a club looks the same on every
 * turn of every game, and any two near twins in the league carry looks that
 * can be told apart whether or not they ever share a border.
 */
export function assignTeamLooks(teams: readonly ConquestMapTeam[], clash = CLASH_DISTANCE): Map<string, TeamLook> {
  const looks = new Map<string, TeamLook>();
  for (const team of teams) {
    const twins: TeamLook[] = [];
    for (const [, placed] of looks) {
      if (colorDistance(placed.color, team.color) < clash) twins.push(placed);
    }
    const accents = accentCandidates(team, clash);
    let kind: LookKind | null = null;
    let accent = accents[0];
    outer: for (const candidate of accents) {
      for (const k of LOOK_KINDS) {
        const held = k === 'plain'
          ? twins.some(p => p.kind === 'plain')
          : twins.some(p => p.kind === k && colorDistance(p.accent, candidate) < clash);
        if (!held) { kind = k; accent = candidate; break outer; }
      }
    }
    if (!kind) kind = LOOK_KINDS[LOOK_KINDS.length - 1];
    const light = isLightHex(team.color);
    looks.set(team.id, { teamId: team.id, color: team.color, kind, accent, ink: light ? '#111111' : '#ffffff' });
  }
  return looks;
}

/** True when two looks can be told apart on a border: bases far enough apart,
 *  different kinds, or the same patterned kind in accents far enough apart. */
export function looksDistinct(a: TeamLook, b: TeamLook, clash = CLASH_DISTANCE): boolean {
  if (colorDistance(a.color, b.color) >= clash) return true;
  if (a.kind !== b.kind) return true;
  if (a.kind === 'plain') return false;
  return colorDistance(a.accent, b.accent) >= clash;
}

/** The name where it fits the territory at the phone size, else the code. */
export function labelFor(team: ConquestMapTeam, fontSize: number, availableWidth: number): string {
  const widthAtPhone = team.name.length * fontSize * PHONE_LABEL_SCALE * GLYPH_EM;
  return widthAtPhone <= availableWidth ? team.name : team.id;
}

/**
 * Regions whose owner changed between two maps, keyed by region, valued by
 * the OLD owner. Regions missing from either map are not flips: a season that
 * starts from an empty map is not a takeover of the whole country.
 */
export function diffOwners(
  prev: Record<string, string | null>,
  next: Record<string, string | null>,
): Record<string, string | null> {
  const from: Record<string, string | null> = {};
  for (const region of Object.keys(next)) {
    if (!(region in prev)) continue;
    if (prev[region] !== next[region]) from[region] = prev[region];
  }
  return from;
}

/**
 * The order annexed regions flip in. Wave 0 is every flipped region that
 * borders land the new owner ALREADY held, wave n is n borders deeper into
 * the fallen empire, and a region with no land bridge to the winner (the
 * imperialism format pairs teams at random, so a whole empire can fall to a
 * club on the other coast) goes last, all together. The renderer turns the
 * wave into an animation delay, so the colour visibly spreads from the border.
 */
export function takeoverWaves(
  from: Record<string, string | null>,
  owners: Record<string, string | null>,
  adjacency: Record<string, string[]>,
): Record<string, number> {
  const flipped = Object.keys(from);
  const waves: Record<string, number> = {};
  const seen = new Set<string>();
  let frontier = flipped.filter(r =>
    (adjacency[r] || []).some(n => !(n in from) && owners[n] != null && owners[n] === owners[r]),
  );
  for (const r of frontier) seen.add(r);
  let wave = 0;
  while (frontier.length > 0) {
    for (const r of frontier) waves[r] = wave;
    wave += 1;
    const next: string[] = [];
    for (const r of frontier) {
      for (const n of adjacency[r] || []) {
        if (n in from && !seen.has(n) && owners[n] === owners[r]) {
          seen.add(n);
          next.push(n);
        }
      }
    }
    frontier = next;
  }
  for (const r of flipped) if (!(r in waves)) waves[r] = wave;
  return waves;
}

/**
 * CSS background for a legend chip or a tile, matching the SVG pattern of the
 * same kind. Rendered side by side on 2026-09-05: an SVG pattern rotated 45
 * runs "/" while a CSS 45deg gradient runs "\", so the chip angles are the
 * mirror of the SVG ones on purpose, and the cross is an axis aligned grid
 * like the pattern, not a diagonal lattice.
 */
export function lookCss(look: TeamLook): string {
  const { color, accent, kind } = look;
  switch (kind) {
    case 'stripes': return `repeating-linear-gradient(135deg, ${color} 0 3px, ${accent} 3px 4.5px)`;
    case 'stripesBack': return `repeating-linear-gradient(45deg, ${color} 0 3px, ${accent} 3px 4.5px)`;
    case 'dots': return `radial-gradient(circle, ${accent} 0 1px, ${color} 1.2px) 0 0 / 5px 5px`;
    case 'cross': return `repeating-linear-gradient(90deg, transparent 0 3.4px, ${accent} 3.4px 4.5px), repeating-linear-gradient(0deg, ${color} 0 3.4px, ${accent} 3.4px 4.5px)`;
    case 'bars': return `repeating-linear-gradient(0deg, ${color} 0 3px, ${accent} 3px 4.5px)`;
    default: return color;
  }
}
