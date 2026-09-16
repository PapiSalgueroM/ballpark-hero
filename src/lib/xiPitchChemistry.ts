/**
 * Neighbor chemistry and a transparent overall for Build Your XI drafts.
 *
 * Chemistry only scores adjacent pitch neighbors (same-row consecutive slots,
 * plus consecutive rows whose x is close). Same club +3. Same league or
 * nationality +1. Same club does not also add a league point: that would
 * count the same fact twice.
 *
 * Overall prefers the market-value card ratings already on each pick. If a
 * squad has none, the score is filled-slot-count * 6 + chemistry, labeled
 * as a placeholder so nobody reads it as a real rating.
 */

import { playerRating } from '@/lib/squadDeal';
import { CLUB_TABLE_NAMES } from '@/data/lineupTeams';
import type { FilledSlot, PositionSlot } from '@/types/lineupBuilder';
import type { ChemistryResult } from '@/lib/chemistry';

const ROLE_TIER: Record<string, number> = {
  GK: 0,
  LWB: 1, LB: 1, CB: 1, RB: 1, RWB: 1,
  CDM: 2, LM: 2, CM: 2, RM: 2,
  CAM: 3, LW: 3, RW: 3,
  CF: 4, ST: 4,
};

/** Display-name and stored-name clubs from lineupTeams, mapped to a real league. */
const CLUB_LEAGUE: Record<string, string> = {
  'Real Madrid': 'La Liga',
  'Barcelona': 'La Liga',
  'FC Barcelona': 'La Liga',
  'Atlético Madrid': 'La Liga',
  'Atlético de Madrid': 'La Liga',
  'Sevilla': 'La Liga',
  'Sevilla FC': 'La Liga',
  'Manchester City': 'Premier League',
  'Liverpool': 'Premier League',
  'Liverpool FC': 'Premier League',
  'Chelsea': 'Premier League',
  'Chelsea FC': 'Premier League',
  'Arsenal': 'Premier League',
  'Arsenal FC': 'Premier League',
  'Manchester United': 'Premier League',
  'Tottenham': 'Premier League',
  'Tottenham Hotspur': 'Premier League',
  'Newcastle': 'Premier League',
  'Newcastle United': 'Premier League',
  'Aston Villa': 'Premier League',
  'West Ham': 'Premier League',
  'West Ham United': 'Premier League',
  'Bayern Munich': 'Bundesliga',
  'FC Bayern Munich': 'Bundesliga',
  'Borussia Dortmund': 'Bundesliga',
  'Bayer Leverkusen': 'Bundesliga',
  'Bayer 04 Leverkusen': 'Bundesliga',
  'PSG': 'Ligue 1',
  'Paris Saint-Germain': 'Ligue 1',
  'Marseille': 'Ligue 1',
  'Olympique Marseille': 'Ligue 1',
  'Lyon': 'Ligue 1',
  'Olympique Lyon': 'Ligue 1',
  'Juventus': 'Serie A',
  'Juventus FC': 'Serie A',
  'AC Milan': 'Serie A',
  'Inter Milan': 'Serie A',
  'Napoli': 'Serie A',
  'SSC Napoli': 'Serie A',
  'Roma': 'Serie A',
  'AS Roma': 'Serie A',
  'Ajax': 'Eredivisie',
  'Ajax Amsterdam': 'Eredivisie',
  'Benfica': 'Primeira Liga',
  'SL Benfica': 'Primeira Liga',
  'Porto': 'Primeira Liga',
  'FC Porto': 'Primeira Liga',
  'Sporting CP': 'Primeira Liga',
  'Celtic': 'Scottish Premiership',
  'Celtic FC': 'Scottish Premiership',
  'Galatasaray': 'Super Lig',
};

for (const [label, names] of Object.entries(CLUB_TABLE_NAMES)) {
  const league = CLUB_LEAGUE[label];
  if (!league) continue;
  for (const name of names) {
    if (!CLUB_LEAGUE[name]) CLUB_LEAGUE[name] = league;
  }
}

export function leagueForClub(club: string | undefined): string | undefined {
  if (!club) return undefined;
  const trimmed = club.trim();
  if (!trimmed) return undefined;
  return CLUB_LEAGUE[trimmed];
}

function positionCoords(positions: PositionSlot[]): { x: number; y: number }[] {
  const tiers = new Map<number, number[]>();
  positions.forEach((pos, i) => {
    const tier = ROLE_TIER[pos.role] ?? 2;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(i);
  });
  const sortedTiers = [...tiers.entries()].sort(([a], [b]) => a - b);
  const coords: { x: number; y: number }[] = Array.from({ length: positions.length });
  sortedTiers.forEach(([_tier, indices], rowIdx) => {
    const padding = 8;
    const rowY = padding + (1 - rowIdx / Math.max(1, sortedTiers.length - 1)) * (100 - 2 * padding);
    const count = indices.length;
    indices.forEach((posIdx, col) => {
      coords[posIdx] = { x: (100 / (count + 1)) * (col + 1), y: rowY };
    });
  });
  return coords;
}

function rowsOf(positions: PositionSlot[]): number[][] {
  const tiers = new Map<number, number[]>();
  positions.forEach((pos, i) => {
    const tier = ROLE_TIER[pos.role] ?? 2;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(i);
  });
  return [...tiers.entries()].sort(([a], [b]) => a - b).map(([, indices]) => indices);
}

/** Adjacent pitch neighbors: consecutive in a row, or consecutive rows with close x. */
export function pitchNeighborPairs(positions: PositionSlot[]): [number, number][] {
  const coords = positionCoords(positions);
  const rows = rowsOf(positions);
  const pairs: [number, number][] = [];
  const seen = new Set<string>();

  const add = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(a < b ? [a, b] : [b, a]);
  };

  for (const row of rows) {
    for (let i = 0; i < row.length - 1; i++) add(row[i], row[i + 1]);
  }

  for (let r = 0; r < rows.length - 1; r++) {
    const here = rows[r];
    const next = rows[r + 1];
    for (const a of here) {
      for (const b of next) {
        if (Math.abs((coords[a]?.x ?? 0) - (coords[b]?.x ?? 0)) <= 30) add(a, b);
      }
    }
  }

  return pairs;
}

export function computeNeighborChemistry(
  positions: PositionSlot[],
  filledSlots: Map<number, FilledSlot>,
): ChemistryResult {
  const links: ChemistryResult['links'] = [];
  const perPlayerBonus: Record<string, number> = {};
  const counts: ChemistryResult['counts'] = { club: 0, league: 0, nationality: 0 };

  for (const slot of filledSlots.values()) perPlayerBonus[slot.playerName] = 0;

  for (const [aIdx, bIdx] of pitchNeighborPairs(positions)) {
    const a = filledSlots.get(aIdx);
    const b = filledSlots.get(bIdx);
    if (!a || !b || a.playerName === b.playerName) continue;

    const clubA = a.pick?.club?.trim();
    const clubB = b.pick?.club?.trim();
    const sameClub = !!clubA && !!clubB && clubA === clubB;
    if (sameClub) {
      links.push({ a: a.playerName, b: b.playerName, type: 'club' });
      counts.club += 1;
      perPlayerBonus[a.playerName] = (perPlayerBonus[a.playerName] ?? 0) + 3;
      perPlayerBonus[b.playerName] = (perPlayerBonus[b.playerName] ?? 0) + 3;
    } else {
      const leagueA = leagueForClub(clubA);
      const leagueB = leagueForClub(clubB);
      if (leagueA && leagueB && leagueA === leagueB) {
        links.push({ a: a.playerName, b: b.playerName, type: 'league' });
        counts.league += 1;
        perPlayerBonus[a.playerName] = (perPlayerBonus[a.playerName] ?? 0) + 1;
        perPlayerBonus[b.playerName] = (perPlayerBonus[b.playerName] ?? 0) + 1;
      }
    }

    const natA = a.pick?.nationality?.trim();
    const natB = b.pick?.nationality?.trim();
    if (natA && natB && natA === natB) {
      links.push({ a: a.playerName, b: b.playerName, type: 'nationality' });
      counts.nationality += 1;
      perPlayerBonus[a.playerName] = (perPlayerBonus[a.playerName] ?? 0) + 1;
      perPlayerBonus[b.playerName] = (perPlayerBonus[b.playerName] ?? 0) + 1;
    }
  }

  const totalBonus = counts.club * 3 + counts.league + counts.nationality;
  return { totalBonus, links, perPlayerBonus, counts };
}

export interface XiOverall {
  score: number;
  source: 'market-value' | 'placeholder';
  ratedCount: number;
  filledCount: number;
  label: string;
}

export function xiOverall(slots: FilledSlot[], chemistryBonus: number): XiOverall {
  const filledCount = slots.length;
  const ratings: number[] = [];
  for (const slot of slots) {
    const value = slot.pick?.value;
    if (typeof value !== 'number' || value <= 0) continue;
    ratings.push(playerRating({
      marketValue: value / 1_000_000,
      age: slot.pick?.age ?? 27,
    } as Parameters<typeof playerRating>[0]));
  }

  if (ratings.length > 0) {
    const avg = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    return {
      score: avg,
      source: 'market-value',
      ratedCount: ratings.length,
      filledCount,
      label: `Overall ${avg} from search market values (${ratings.length}/${filledCount} rated)`,
    };
  }

  const score = filledCount * 6 + chemistryBonus;
  return {
    score,
    source: 'placeholder',
    ratedCount: 0,
    filledCount,
    label: `Placeholder overall ${score}: filled slots x6 + chemistry (no ratings on these picks)`,
  };
}
