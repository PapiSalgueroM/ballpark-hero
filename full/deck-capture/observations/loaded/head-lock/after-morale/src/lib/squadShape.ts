/* Round 1042: the squad shape. The formations, the slot rules, the position names and the rating
   curve, lifted word for word out of squadDeal.ts so a manager game can read them without Squad
   Deal's loader, the database client and Footle's data behind it. squadDeal.ts re exports every
   name here, so nothing that imported them from there had to change; Club Manager imports this
   file directly. It imports types only, on purpose: anything this file imports rides with every
   game that needs a formation. scripts/simCmDataOnDemand.mjs holds that. */
import type { Player, Position } from '@/types/game';

/* ---------------- Position normalization ---------------- */
export const POSITION_NORMALIZE: Record<string, Position> = {
  'Goalkeeper': 'GK', 'GK': 'GK',
  'Centre-Back': 'CB', 'Center-Back': 'CB', 'CB': 'CB', 'Defender': 'CB',
  'Left-Back': 'LB', 'LB': 'LB', 'Right-Back': 'RB', 'RB': 'RB',
  'Left Wing-Back': 'LWB', 'LWB': 'LWB', 'Right Wing-Back': 'RWB', 'RWB': 'RWB',
  'Defensive Midfield': 'CDM', 'CDM': 'CDM', 'Central Midfield': 'CM', 'CM': 'CM', 'Midfield': 'CM',
  'Attacking Midfield': 'CAM', 'CAM': 'CAM', 'Left Midfield': 'LM', 'LM': 'LM', 'Right Midfield': 'RM', 'RM': 'RM',
  'Left Winger': 'LW', 'LW': 'LW', 'Right Winger': 'RW', 'RW': 'RW',
  'Centre-Forward': 'CF', 'Center-Forward': 'CF', 'Second Striker': 'CF', 'CF': 'CF',
  'Striker': 'ST', 'ST': 'ST', 'Forward': 'ST', 'Attack': 'ST',
};
export function normalizePosition(raw: string): Position | null {
  return POSITION_NORMALIZE[raw] ?? null;
}

/* ---------------- Formations ---------------- */
export interface FormationSlot { label: string; allowed: Position[]; x: number; y: number; }
export interface Formation { name: string; slots: FormationSlot[]; }

const s = (label: string, allowed: Position[], x: number, y: number): FormationSlot => ({ label, allowed, x, y });
const G = (): FormationSlot => s('GK', ['GK'], 50, 90);
const DC: Position[] = ['CB'];
const DR: Position[] = ['RB', 'RWB', 'CB'];
const DL: Position[] = ['LB', 'LWB', 'CB'];
// Owner 2026-08-05: central-mid slots take central mids ONLY. Wide mids and
// (via the winger family) wingers were sneaking into CM slots; a CM slot now
// accepts CM/CDM/CAM and nothing wide.
const MD: Position[] = ['CM', 'CDM', 'CAM'];
const WR: Position[] = ['RW', 'RM', 'RWB'];
const WL: Position[] = ['LW', 'LM', 'LWB'];
const FW: Position[] = ['ST', 'CF'];
const DM: Position[] = ['CDM', 'CM'];
const AM: Position[] = ['CAM', 'CM'];
const AMF: Position[] = ['CAM', 'CF', 'CM'];
/** Round 505: the allowed set behind each slot label, one copy. Club Manager
 *  builds its extra shapes from these so a slot called CM grades a man the
 *  same way in every shape on the site; a change here reaches all of them. */
export const SLOT_ALLOWED: Record<'DC' | 'DR' | 'DL' | 'MD' | 'DM' | 'AM' | 'AMF' | 'WR' | 'WL' | 'FW', Position[]> = { DC, DR, DL, MD, DM, AM, AMF, WR, WL, FW };

export const FORMATIONS: Formation[] = [
  { name: '4-3-3', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CM', MD, 70, 50), s('CM', MD, 50, 54), s('CM', MD, 30, 50), s('RW', WR, 80, 24), s('ST', FW, 50, 18), s('LW', WL, 20, 24)] },
  { name: '4-4-2', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 82, 48), s('CM', MD, 60, 52), s('CM', MD, 40, 52), s('LM', WL, 18, 48), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '4-2-3-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CDM', DM, 62, 56), s('CDM', DM, 38, 56), s('RW', WR, 80, 34), s('CAM', AM, 50, 36), s('LW', WL, 20, 34), s('ST', FW, 50, 16)] },
  { name: '4-1-2-1-2', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('CDM', DM, 50, 60), s('CM', MD, 68, 46), s('CM', MD, 32, 46), s('CAM', AM, 50, 32), s('ST', FW, 60, 18), s('ST', FW, 40, 18)] },
  { name: '4-5-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 84, 44), s('CM', MD, 64, 50), s('CM', MD, 50, 52), s('CM', MD, 36, 50), s('LM', WL, 16, 44), s('ST', FW, 50, 18)] },
  { name: '3-5-2', slots: [G(), s('CB', DC, 68, 74), s('CB', DC, 50, 76), s('CB', DC, 32, 74), s('RWB', WR, 86, 50), s('CM', MD, 64, 54), s('CM', MD, 50, 56), s('CM', MD, 36, 54), s('LWB', WL, 14, 50), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '3-4-3', slots: [G(), s('CB', DC, 68, 74), s('CB', DC, 50, 76), s('CB', DC, 32, 74), s('RM', WR, 84, 50), s('CM', MD, 60, 54), s('CM', MD, 40, 54), s('LM', WL, 16, 50), s('RW', WR, 78, 22), s('ST', FW, 50, 18), s('LW', WL, 22, 22)] },
  { name: '5-3-2', slots: [G(), s('RWB', WR, 88, 64), s('CB', DC, 68, 76), s('CB', DC, 50, 78), s('CB', DC, 32, 76), s('LWB', WL, 12, 64), s('CM', MD, 66, 50), s('CM', MD, 50, 52), s('CM', MD, 34, 50), s('ST', FW, 60, 20), s('ST', FW, 40, 20)] },
  { name: '4-4-1-1', slots: [G(), s('RB', DR, 84, 70), s('CB', DC, 62, 74), s('CB', DC, 38, 74), s('LB', DL, 16, 70), s('RM', WR, 82, 48), s('CM', MD, 60, 52), s('CM', MD, 40, 52), s('LM', WL, 18, 48), s('CAM', AMF, 50, 32), s('ST', FW, 50, 16)] },
];

/* ---------------- Rating ---------------- */
/**
 * Rating spread audit (2026-07-03): the old curve was 45 + 55 * (log10(mv+1) / log10(231)),
 * which used log10(231) as its scale ceiling. That saturates hard: a mid-table
 * squad (marketValue ~20-60) already averaged rating 83, a "good XI" (~60-120)
 * averaged 91, and near-full Legends squads (~150-230) averaged 98. Everything
 * above roughly 60 in market value read as 89+, so almost every squad a player
 * builds landed in the A/A+ verdict bands, and the D band was only reachable by
 * deliberately drafting the cheapest 1-10 value scrubs at every slot.
 *
 * Fix: stretch the curve over a wider ceiling (1000, comfortably above the
 * highest Legends value of 230) and widen the floor-to-ceiling span (35-99
 * instead of 45-99) so cheap squads read meaningfully lower and only the very
 * top of the market pins near 99. New spread, same input data:
 *   mv=2   -> 46   (was 56)   scrub-tier case
 *   mv=10  -> 55   (was 69)   squad player
 *   mv=30  -> 62   (was 80)   solid starter
 *   mv=60  -> 68   (was 87)   mid-table XI average
 *   mv=120 -> 75   (was 93)   good XI average
 *   mv=180 -> 80   (was 98)   star player
 *   mv=230 -> 83   (was 99)   Messi/Ronaldo-tier ceiling
 */
export function playerRating(p: Player): number {
  // 0-99 player card scale (owner 2026-08-05): he wanted our ratings to sit
  // where a player expects them to, so the anchors land on familiar card
  // numbers: £1M→62, £5M→71, £15M→77, £40M→82, £80M→86, £200M→91, capped at
  // 96. Bottom pros sit around 55-65.
  //
  // Age correction (owner: "just because people are old dosent mean their
  // value should be so low. ur giving lewa such a low rating even though he's
  // still so good"): market values crater for veterans while their level
  // doesn't. 30+ gets a value multiplier that roughly undoes the age discount
  // BEFORE the curve runs: Lewandowski (~£15M at 37) reads ~86 instead of 72,
  // 39-year-old Messi lands ~86, prime Mbappe/Yamal money still tops the pile.
  const age = typeof p.age === 'number' && p.age > 0 ? p.age : 27;
  const ageBoost = age >= 30 ? Math.min(6, 1 + (age - 29) * 0.55) : 1;
  const mv = Math.max(0.5, p.marketValue * ageBoost);
  const r = 62 + (33 * Math.log10(mv)) / Math.log10(400);
  return Math.max(52, Math.min(96, Math.round(r)));
}

/**
 * Owner (2026-07-10): "only giving the best defenders of all time 80 somethings
 * is so disrespectful." Legends get their own curve: the synthetic legend
 * market values (140-230) map to 85-99 so all-time greats read like it.
 */
export function ratingFor(p: Player, era: Era): number {
  if (era === 'legends') {
    const r = 85 + ((Math.max(140, Math.min(230, p.marketValue)) - 140) * 14) / 90;
    return Math.round(Math.max(85, Math.min(99, r)));
  }
  return playerRating(p);
}

export type Era = 'current' | 'legends';
