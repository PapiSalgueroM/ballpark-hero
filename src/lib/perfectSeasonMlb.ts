import { supabase } from '@/integrations/supabase/client';
import { DraftablePlayer, SeasonSlot, SpinSquad } from '@/lib/perfectSeason';

export const MLB_SLOTS: SeasonSlot[] = [
  { key: 'C', label: 'Catcher', weight: 1 },
  { key: '1B', label: 'First Base', weight: 1 },
  { key: '2B', label: 'Second Base', weight: 1 },
  { key: '3B', label: 'Third Base', weight: 1 },
  { key: 'SS', label: 'Shortstop', weight: 1 },
  { key: 'LF', label: 'Left Field', weight: 1 },
  { key: 'CF', label: 'Center Field', weight: 1 },
  { key: 'RF', label: 'Right Field', weight: 1 },
  { key: 'DH', label: 'Designated Hitter', weight: 1 },
  { key: 'SP', label: 'Starting Pitcher', weight: 1.6 },
  { key: 'RP', label: 'Relief Ace', weight: 0.9 },
];

export const MLB_GAMES = 162;

export interface TeamSeasonIndexEntry {
  yearid: number;
  teamid: string;
  name: string;
  w: number;
  l: number;
}

/** One light query, cached by the page: every team season since 1901. */
export async function fetchTeamSeasonIndex(): Promise<TeamSeasonIndexEntry[] | null> {
  try {
    const { data, error } = await supabase
      .from('lahman_teams' as any)
      .select('yearid, teamid, name, w, l, g')
      .gte('yearid', 1901)
      .limit(5000);
    if (error || !data) return null;
    const rows = (data as any[])
      .filter(r => (Number(r.g) || 0) >= 100 && r.name && r.teamid)
      .map(r => ({
        yearid: Number(r.yearid),
        teamid: String(r.teamid),
        name: String(r.name),
        w: Number(r.w) || 0,
        l: Number(r.l) || 0,
      }));
    return rows.length >= 500 ? rows : null;
  } catch {
    return null;
  }
}

interface BattingRow {
  playerid: string; ab: number; h: number; doubles: number; triples: number;
  hr: number; bb: number; hbp: number | null; sf: number | null;
}
interface PitchingRow {
  playerid: string; ipouts: number; er: number; so: number; bb: number;
  w: number; sv: number; g: number; gs: number; era: number | null;
}
interface AppearanceRow {
  playerid: string; g_all: number; g_c: number; g_1b: number; g_2b: number;
  g_3b: number; g_ss: number; g_lf: number; g_cf: number; g_rf: number;
  g_dh: number; g_p: number;
}

/**
 * Era normalization (2026-07-03, #93/94): batterRating and pitcherRating both
 * read raw OPS/ERA with no adjustment for the offensive environment of the
 * decade they were posted in, so a .760 OPS in the 1968 "Year of the Pitcher"
 * season (league OPS ~.685) scored identically to a .760 OPS in 2000 (league
 * OPS ~.760), even though the first is a much better season relative to its
 * league. MLB_DECADE_MULT holds each decade's league-average OPS against a
 * modern (2010s-2020s) ~.720 baseline, clamped conservatively to +-5% per the
 * spec (raw ratios ran as high as 1.11 for the dead-ball 1900s):
 *   dead-ball 1900s-10s and the 1960s pitcher's era -> hitters get the full
 *     +5% boost (their raw OPS understates how good they were)
 *   1930s peak-offense and the 1990s-2000s steroid era -> hitters get a -5%
 *     trim (their raw OPS overstates it)
 *   2010s is the baseline (1.0, no change) since the formula was tuned there.
 * Pitchers get the inverse: a low ERA in a high-offense decade (1930s, 1990s-
 * 2000s) is more impressive than the same ERA in a pitcher's era, so pitcher
 * multipliers mirror the hitting environment rather than opposing it.
 */
const MLB_DECADE_MULT: Record<number, number> = {
  1900: 1.05, 1910: 1.05, 1920: 0.98, 1930: 0.95, 1940: 1.03, 1950: 0.98,
  1960: 1.05, 1970: 1.03, 1980: 1.03, 1990: 0.95, 2000: 0.95, 2010: 1.0, 2020: 1.0,
};
function decadeMult(year: number): number {
  const decade = Math.floor(year / 10) * 10;
  return MLB_DECADE_MULT[decade] ?? 1.0;
}

function batterRating(b: BattingRow, year: number): number {
  const ab = b.ab || 0;
  const hbp = b.hbp ?? 0;
  const sf = b.sf ?? 0;
  const pa = ab + b.bb + hbp + sf;
  if (pa <= 0) return 40;
  const obp = (b.h + b.bb + hbp) / pa;
  const tb = b.h + b.doubles + 2 * b.triples + 3 * b.hr;
  const slg = ab > 0 ? tb / ab : 0;
  const ops = obp + slg;
  const base = 40 + (ops - 0.5) * 100;
  return Math.round(Math.min(99, Math.max(40, base * decadeMult(year))));
}

function pitcherRating(p: PitchingRow, year: number): number {
  const ip = (p.ipouts || 0) / 3;
  if (ip < 20) return 40;
  const era = p.era != null && p.era > 0 ? Number(p.era) : (p.er * 9) / Math.max(1, ip);
  const kbb = p.so / Math.max(1, p.bb);
  const base = 42 + (4.8 - era) * 13 + Math.min(14, kbb * 2.5) + Math.min(6, (p.sv || 0) * 0.15);
  return Math.round(Math.min(99, Math.max(40, base * decadeMult(year))));
}

function batterDetail(b: BattingRow): string {
  const ab = b.ab || 0;
  const avg = ab > 0 ? (b.h / ab).toFixed(3).replace(/^0/, '') : '.000';
  return `${avg} AVG · ${b.hr} HR`;
}

function pitcherDetail(p: PitchingRow): string {
  const ip = (p.ipouts || 0) / 3;
  const era = p.era != null && p.era > 0 ? Number(p.era) : ip > 0 ? (p.er * 9) / ip : 0;
  const role = p.gs >= 10 ? `${p.w} W` : `${p.sv} SV`;
  return `${era.toFixed(2)} ERA · ${role} · ${p.so} K`;
}

const POS_MAP: [keyof AppearanceRow, string][] = [
  ['g_c', 'C'], ['g_1b', '1B'], ['g_2b', '2B'], ['g_3b', '3B'], ['g_ss', 'SS'],
  ['g_lf', 'LF'], ['g_cf', 'CF'], ['g_rf', 'RF'],
];

/** Full draftable squad for one team season. */
export async function fetchSquad(entry: TeamSeasonIndexEntry): Promise<SpinSquad | null> {
  try {
    const match = { teamid: entry.teamid, yearid: entry.yearid };
    const [bat, pit, app] = await Promise.all([
      supabase.from('lahman_batting' as any)
        .select('playerid, ab, h, doubles, triples, hr, bb, hbp, sf')
        .match(match).limit(80),
      supabase.from('lahman_pitching' as any)
        .select('playerid, ipouts, er, so, bb, w, sv, g, gs, era')
        .match(match).limit(60),
      supabase.from('lahman_appearances' as any)
        .select('playerid, g_all, g_c, g_1b, g_2b, g_3b, g_ss, g_lf, g_cf, g_rf, g_dh, g_p')
        .match(match).limit(80),
    ]);
    if (bat.error || pit.error) return null;

    const appMap = new Map<string, AppearanceRow>();
    for (const a of ((app.data ?? []) as any[]) as AppearanceRow[]) appMap.set(a.playerid, a);

    const players = new Map<string, DraftablePlayer>();

    for (const raw of ((bat.data ?? []) as any[]) as BattingRow[]) {
      const b = { ...raw, ab: Number(raw.ab) || 0, h: Number(raw.h) || 0, bb: Number(raw.bb) || 0, hr: Number(raw.hr) || 0, doubles: Number(raw.doubles) || 0, triples: Number(raw.triples) || 0 };
      if (b.ab < 100) continue;
      const a = appMap.get(b.playerid);
      const eligible: string[] = [];
      if (a) {
        const gAll = Math.max(1, Number(a.g_all) || 1);
        for (const [col, slot] of POS_MAP) {
          const g = Number(a[col]) || 0;
          if (g >= 15 || g / gAll >= 0.3) eligible.push(slot);
        }
      }
      eligible.push('DH'); // any qualified bat can DH
      players.set(b.playerid, {
        playerId: b.playerid,
        name: b.playerid, // replaced with the real name below
        rating: batterRating(b, entry.yearid),
        eligible,
        detail: batterDetail(b),
      });
    }

    for (const raw of ((pit.data ?? []) as any[]) as PitchingRow[]) {
      const p = { ...raw, ipouts: Number(raw.ipouts) || 0, er: Number(raw.er) || 0, so: Number(raw.so) || 0, bb: Number(raw.bb) || 0, w: Number(raw.w) || 0, sv: Number(raw.sv) || 0, g: Number(raw.g) || 0, gs: Number(raw.gs) || 0 };
      const ip = p.ipouts / 3;
      if (ip < 30) continue;
      const eligible: string[] = [];
      if (p.gs >= 10) eligible.push('SP');
      if (p.sv >= 5 || (p.g >= 25 && p.gs <= 5)) eligible.push('RP');
      if (eligible.length === 0) continue;
      // A pitcher who also batted keeps only pitching slots (keeps draft clean)
      players.set(p.playerid, {
        playerId: p.playerid,
        name: p.playerid,
        rating: pitcherRating(p, entry.yearid),
        eligible,
        detail: pitcherDetail(p),
      });
    }

    const ids = [...players.keys()];
    if (ids.length < 6) return null;

    const { data: people } = await supabase
      .from('lahman_people' as any)
      .select('playerid, namefirst, namelast')
      .in('playerid', ids)
      .limit(ids.length);
    for (const person of (people ?? []) as any[]) {
      const pl = players.get(person.playerid);
      if (pl) pl.name = `${person.namefirst ?? ''} ${person.namelast ?? ''}`.trim() || pl.playerId;
    }

    const list = [...players.values()].sort((a, b) => b.rating - a.rating);
    return {
      squadId: `${entry.teamid}-${entry.yearid}`,
      teamName: entry.name,
      year: entry.yearid,
      players: list,
    };
  } catch {
    return null;
  }
}
