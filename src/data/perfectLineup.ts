import { Player, Position } from '@/types/game';
import { players } from '@/data/players';

export type ConstraintType = 'league' | 'nationality' | 'any';

export interface SlotConstraint {
  type: ConstraintType;
  value?: string;
}

export interface LineupSlot {
  id: number;
  label: string; // formation position, e.g. "ST"
  allowed: Position[]; // acceptable source positions
  constraint: SlotConstraint;
}

export type SlotGrade = 'green' | 'yellow' | 'black';

export interface SimResult {
  rating: number; // 0..100
  chemistry: number; // 0..100
  squadValue: number; // sum of marketValue (€M)
  goalsFor: number;
  goalsAgainst: number;
  grade: string; // 'A+'..'D'
  slotGrades: SlotGrade[];
}

// 4-3-3. Each formation slot lists the source positions that may fill it.
const FORMATION_433: { label: string; allowed: Position[] }[] = [
  { label: 'GK', allowed: ['GK'] },
  { label: 'RB', allowed: ['RB', 'RWB'] },
  { label: 'CB', allowed: ['CB'] },
  { label: 'CB', allowed: ['CB'] },
  { label: 'LB', allowed: ['LB', 'LWB'] },
  { label: 'CDM', allowed: ['CDM', 'CM'] },
  { label: 'CM', allowed: ['CM', 'CDM', 'CAM'] },
  { label: 'CAM', allowed: ['CAM', 'CM'] },
  { label: 'RW', allowed: ['RW', 'RM', 'CF', 'ST'] },
  { label: 'ST', allowed: ['ST', 'CF'] },
  { label: 'LW', allowed: ['LW', 'LM', 'CF', 'ST'] },
];

export const FORMATION_SIZE = FORMATION_433.length;
const MIN_CONSTRAINT_DEPTH = 4;
const DEFAULT_CONSTRAINED_SLOTS = 6;

/** Deterministic PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function matchesConstraint(p: Player, c: SlotConstraint): boolean {
  if (c.type === 'league') return p.league === c.value;
  if (c.type === 'nationality') return p.nationality === c.value;
  return true;
}

/** Build a constrained 4-3-3 from a seed. Every constrained slot is guaranteed solvable. */
export function rollLineup(seed: number, constrainedSlots = DEFAULT_CONSTRAINED_SLOTS): LineupSlot[] {
  const rng = makeRng(seed);
  const slots: LineupSlot[] = FORMATION_433.map((f, i) => ({
    id: i,
    label: f.label,
    allowed: f.allowed,
    constraint: { type: 'any' },
  }));

  const toConstrain = shuffle(
    slots.map((s) => s.id),
    rng,
  ).slice(0, constrainedSlots);

  for (const id of toConstrain) {
    const slot = slots[id];
    const pool = players.filter((p) => slot.allowed.includes(p.position));
    const useLeague = rng() < 0.5;
    const counts = new Map<string, number>();
    for (const p of pool) {
      const key = useLeague ? p.league : p.nationality;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const candidates = [...counts.entries()]
      .filter(([, n]) => n >= MIN_CONSTRAINT_DEPTH)
      .map(([k]) => k);
    if (candidates.length === 0) continue; // leave wildcard
    const value = candidates[Math.floor(rng() * candidates.length)];
    slot.constraint = { type: useLeague ? 'league' : 'nationality', value };
  }

  return slots;
}

/** Players eligible for a slot given the names already used elsewhere in the XI. */
export function eligiblePlayers(slot: LineupSlot, usedNames: Set<string>): Player[] {
  return players
    .filter(
      (p) =>
        slot.allowed.includes(p.position) &&
        !usedNames.has(p.name) &&
        matchesConstraint(p, slot.constraint),
    )
    .sort((a, b) => b.marketValue - a.marketValue);
}

const power = (p: Player) => Math.max(1, Math.min(200, p.marketValue));

/** Deterministic squad simulation. */
export function simulate(picks: Player[]): SimResult {
  const avgPower = picks.reduce((s, p) => s + power(p), 0) / picks.length;

  const leagueCount = new Map<string, number>();
  const natCount = new Map<string, number>();
  for (const p of picks) {
    leagueCount.set(p.league, (leagueCount.get(p.league) || 0) + 1);
    natCount.set(p.nationality, (natCount.get(p.nationality) || 0) + 1);
  }
  let chemPts = 0;
  for (const p of picks) {
    if ((leagueCount.get(p.league) || 0) >= 2) chemPts++;
    if ((natCount.get(p.nationality) || 0) >= 2) chemPts++;
  }
  const chemistry = Math.round((chemPts / (picks.length * 2)) * 100);

  const normPower = Math.min(100, (avgPower / 150) * 100);
  const rating = Math.round(Math.min(100, normPower * 0.75 + chemistry * 0.25));

  const squadValue = picks.reduce((s, p) => s + p.marketValue, 0);
  const goalsFor = Math.max(1, Math.round((rating / 100) * 9) + (rating >= 90 ? 3 : 0));
  const goalsAgainst = Math.max(0, Math.round(((100 - rating) / 100) * 4));
  const grade =
    rating >= 90 ? 'A+' : rating >= 80 ? 'A' : rating >= 68 ? 'B' : rating >= 55 ? 'C' : 'D';
  const slotGrades: SlotGrade[] = picks.map((p) => {
    const pw = power(p);
    return pw >= 80 ? 'green' : pw >= 35 ? 'yellow' : 'black';
  });

  return { rating, chemistry, squadValue, goalsFor, goalsAgainst, grade, slotGrades };
}

const GRADE_EMOJI: Record<SlotGrade, string> = { green: '🟩', yellow: '🟨', black: '⬛' };

/** Emoji grid (4 per row) for the share card. */
export function slotGradesToEmoji(grades: SlotGrade[]): string {
  const cells = grades.map((g) => GRADE_EMOJI[g]);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 4) rows.push(cells.slice(i, i + 4).join(''));
  return rows.join('\n');
}

export function describeConstraint(c: SlotConstraint): string {
  if (c.type === 'any') return 'Any';
  return c.value || 'Any';
}
