import { keyedRng } from '@/lib/keyedRng';

/** Round 1521: how one drawn figure looks. A generic person, never anybody's likeness: every trait is a keyed
 *  draw from the key a binder hands over (Club Manager hands a player's id), so the same key is the same man in
 *  every match, and nothing here reads a name, a nationality, a photo or a rating. Two flat colours and lines,
 *  as every figure on the pitch has always been: no kit, crest or face. */
export interface FigureLook {
  skin: string;
  hair: string;
  /** Which of HAIR_STYLES, 0 to HAIR_STYLES - 1. */
  style: number;
  boots: string;
  /** How tall he stands, 0.92 to 1.08 of the figure. A keeper is drawn at his full reach and is never scaled. */
  tall: number;
}
export const SKIN_TONES = ['#f1d0b5', '#e0ac8a', '#c68a62', '#a86b45', '#7d4a2e', '#5a3420'] as const;
export const HAIR_COLOURS = ['#14110f', '#3b2618', '#6a4428', '#c9a25a', '#9c4a22', '#8a8a8a'] as const;
/** How often each hair colour is drawn, in the order above. */
const HAIR_WEIGHT = [32, 26, 18, 12, 6, 6];
export const BOOT_COLOURS = ['#e8eef2', '#111418', '#ff7a1a', '#2f6bff', '#ff4fa3', '#b8f000', '#f5d000'] as const;
/** Crop, buzz, curls, long, shaved, quiff, tied up. */
export const HAIR_STYLES = 7;

const pick = <T,>(list: readonly T[], roll: number): T => list[Math.min(list.length - 1, Math.floor(roll * list.length))];

export function figureLook(key: string): FigureLook {
  const roll = keyedRng(`look:${key}`);
  const skin = pick(SKIN_TONES, roll());
  const style = Math.min(HAIR_STYLES - 1, Math.floor(roll() * HAIR_STYLES));
  let left = roll() * HAIR_WEIGHT.reduce((a, b) => a + b, 0);
  let hair: string = HAIR_COLOURS[HAIR_COLOURS.length - 1];
  for (let i = 0; i < HAIR_WEIGHT.length; i++) { left -= HAIR_WEIGHT[i]; if (left < 0) { hair = HAIR_COLOURS[i]; break; } }
  const boots = pick(BOOT_COLOURS, roll());
  const tall = Math.round((0.92 + 0.16 * roll()) * 1000) / 1000;
  return { skin, hair, style, boots, tall };
}
