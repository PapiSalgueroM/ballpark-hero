// Geometry helpers for ConquestMap: territory adjacency, contiguous-blob
// grouping, and area-weighted centroid math used to render one team label
// per contiguous empire instead of one label per territory.
//
// Adjacency is a hand-checked map of real US state borders, adapted for the
// "split" territories (CA_N/CA_S/CA_SC, FL_N/FL_W/FL_S, NJ_N/NJ_S,
// OH_NE/OH_SW, PA_W/PA_E, TX_N/TX_S) that usStatesPaths.ts uses in place of
// a single state polygon. Internal split-state borders were confirmed by
// cross-referencing shared coordinate points between adjacent paths.

export const TERRITORY_ADJACENCY: Record<string, string[]> = {
  AL: ['FL_N', 'GA', 'MS', 'TN'],
  AR: ['LA', 'MO', 'MS', 'OK', 'TN', 'TX_N'],
  AZ: ['CA_S', 'CA_SC', 'CO', 'NM', 'NV', 'UT'],
  CA_N: ['CA_S', 'NV', 'OR'],
  CA_S: ['CA_N', 'CA_SC', 'AZ', 'NV'],
  CA_SC: ['CA_S', 'AZ'],
  CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
  CT: ['MA', 'NY', 'RI'],
  DE: ['MD', 'NJ_S', 'PA_E'],
  FL_N: ['AL', 'GA', 'FL_W'],
  FL_W: ['FL_N', 'FL_S'],
  FL_S: ['FL_W'],
  GA: ['AL', 'FL_N', 'NC', 'SC', 'TN'],
  IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
  ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
  IL: ['IN', 'IA', 'KY', 'MO', 'WI'],
  IN: ['IL', 'KY', 'MI', 'OH_SW'],
  KS: ['CO', 'MO', 'NE', 'OK'],
  KY: ['IL', 'IN', 'MO', 'OH_SW', 'TN', 'VA', 'WV'],
  LA: ['AR', 'MS', 'TX_S', 'TX_N'],
  MA: ['CT', 'NH', 'NY', 'RI', 'VT'],
  MD: ['DE', 'PA_E', 'PA_W', 'VA', 'WV'],
  ME: ['NH'],
  MI: ['IN', 'OH_NE', 'WI'],
  MN: ['IA', 'ND', 'SD', 'WI'],
  MO: ['AR', 'IA', 'IL', 'KS', 'KY', 'NE', 'OK', 'TN'],
  MS: ['AL', 'AR', 'LA', 'TN'],
  MT: ['ID', 'ND', 'SD', 'WY'],
  NC: ['GA', 'SC', 'TN', 'VA'],
  ND: ['MN', 'MT', 'SD'],
  NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
  NH: ['MA', 'ME', 'VT'],
  NJ_N: ['CT', 'NY', 'NJ_S'],
  NJ_S: ['NJ_N', 'DE'],
  NM: ['AZ', 'CO', 'OK', 'TX_N', 'TX_S'],
  NV: ['AZ', 'CA_N', 'CA_S', 'ID', 'OR', 'UT'],
  NY: ['CT', 'MA', 'NJ_N', 'PA_E', 'PA_W', 'VT'],
  OH_NE: ['MI', 'WV', 'OH_SW'],
  OH_SW: ['OH_NE', 'IN', 'KY', 'WV'],
  OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX_N'],
  OR: ['CA_N', 'ID', 'NV', 'WA'],
  PA_W: ['PA_E', 'MD', 'NY', 'WV'],
  PA_E: ['PA_W', 'DE', 'MD', 'NJ_N', 'NY'],
  RI: ['CT', 'MA'],
  SC: ['GA', 'NC'],
  SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
  TN: ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
  TX_N: ['AR', 'LA', 'NM', 'OK', 'TX_S'],
  TX_S: ['TX_N', 'LA', 'NM'],
  UT: ['AZ', 'CO', 'ID', 'NV', 'WY'],
  VA: ['KY', 'MD', 'NC', 'TN', 'WV'],
  VT: ['MA', 'NH', 'NY'],
  WA: ['ID', 'OR'],
  WI: ['IL', 'IA', 'MI', 'MN'],
  WV: ['KY', 'MD', 'OH_NE', 'OH_SW', 'PA_W', 'VA'],
  WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
};

/** Parses an SVG path `d` string's numeric coordinate pairs into a bounding box. */
export function pathBoundingBox(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  // Pull every numeric token out of the path (command letters are ignored).
  // Hand-authored paths here only use M/L/Z with absolute coordinates, so a
  // flat number scan is sufficient without a full path parser.
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [0];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = nums[i];
    const y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

/** Bounding-box area, used as a lightweight proxy for territory "weight" (real polygon area would need a full parser; the hand-authored paths are compact enough that bbox area tracks visual size well). */
export function bboxArea(bbox: { minX: number; minY: number; maxX: number; maxY: number }): number {
  return Math.max(0, bbox.maxX - bbox.minX) * Math.max(0, bbox.maxY - bbox.minY);
}

export interface TerritoryGeom {
  id: string;
  x: number;
  y: number;
  area: number;
}

export interface TeamBlob {
  teamId: string;
  memberIds: string[];
  centroidX: number;
  centroidY: number;
  totalArea: number;
}

/**
 * Groups territories owned by the same team into contiguous blobs (via BFS
 * over TERRITORY_ADJACENCY, restricted to same-owner neighbors), then
 * computes an area-weighted centroid per blob from per-territory
 * (x, y, area) geometry.
 */
export function computeTeamBlobs(
  territories: Record<string, string | null>,
  geomById: Map<string, TerritoryGeom>,
): TeamBlob[] {
  const visited = new Set<string>();
  const blobs: TeamBlob[] = [];

  for (const id of Object.keys(territories)) {
    const teamId = territories[id];
    if (!teamId || visited.has(id)) continue;

    // BFS the contiguous same-owner region starting at this territory.
    const memberIds: string[] = [];
    const queue = [id];
    visited.add(id);
    while (queue.length) {
      const cur = queue.shift()!;
      memberIds.push(cur);
      const neighbors = TERRITORY_ADJACENCY[cur] || [];
      for (const n of neighbors) {
        if (territories[n] === teamId && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }

    let sumX = 0, sumY = 0, sumArea = 0;
    for (const mid of memberIds) {
      const g = geomById.get(mid);
      if (!g) continue;
      // Weight each member's contribution by its own area, but guarantee a
      // minimum weight so slivers still pull the centroid slightly (avoids
      // a zero-area edge case collapsing the blob's position to (0,0)).
      const w = g.area > 0 ? g.area : 1;
      sumX += g.x * w;
      sumY += g.y * w;
      sumArea += w;
    }

    blobs.push({
      teamId,
      memberIds,
      centroidX: sumArea > 0 ? sumX / sumArea : 0,
      centroidY: sumArea > 0 ? sumY / sumArea : 0,
      totalArea: memberIds.reduce((acc, mid) => acc + (geomById.get(mid)?.area || 0), 0),
    });
  }

  return blobs;
}

/** Clamped font-size scaling: bigger empires read with a modestly larger label, without ever becoming cartoonish or vanishingly small. */
export function blobFontSize(totalArea: number, memberCount: number): number {
  if (memberCount <= 1) return 7;
  // Scale gently with sqrt(area) so growth feels proportional rather than
  // linear-explosive; clamp to a sane visual range for a 590x310 viewBox.
  const scaled = 7 + Math.sqrt(totalArea) * 0.045;
  return Math.min(15, Math.max(8, scaled));
}
