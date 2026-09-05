import { WhoAmIPlayer, clubKey, shortPosition } from '@/lib/whoAmI';
import { flagFor } from '@/lib/dealPlayers';

/**
 * Clue Auction: one secret footballer, a bank of 100 points, and a priced
 * clue menu. Every clue can be bought once, a wrong guess burns 10 points,
 * and the bank you are still holding when you name him is your score.
 *
 * The secret is drawn with pickSecret from the Who Am I? pool
 * (player_market_values, most recent row per player from 2024 onward;
 * secrets always come from the top of the pool by market value, 300 names
 * since 2026-08-05 and 400 since Round 463). Reveal values are computed from that pool row plus the
 * career club-history set that fetchWhoAmIPool builds from every year in
 * the table.
 *
 * Menu prices sum to 155 against a bank of 100, so buying everything is
 * impossible by design.
 *
 * Live-data sanity checks (flawuiqbvjobmkfkauhw, 2026-07-02):
 *   Top-200 market values: min $38M, p50 $54M, p75 $71.5M, p90 $97M,
 *   max $216M. The value bands below are tuned to that spread.
 *   22 of the top 200 have no former club on record, so the former-club
 *   clue must support an unavailable state.
 */

export const START_BANK = 100;
export const WRONG_GUESS_COST = 10;

export type ClueId =
  | 'nationality'
  | 'position'
  | 'ageBracket'
  | 'valueBand'
  | 'clubInitial'
  | 'club'
  | 'clubCount'
  | 'formerClub';

export interface ClueDef {
  id: ClueId;
  label: string;
  price: number;
  emoji: string;
  /** One-line pitch shown on the card before purchase. */
  teaser: string;
}

/** The menu in display order. Prices are fixed and each clue sells once. */
export const CLUE_MENU: ClueDef[] = [
  { id: 'nationality', label: 'Nationality', price: 25, emoji: '🌍', teaser: 'Flag and country' },
  { id: 'position', label: 'Position', price: 15, emoji: '🧭', teaser: 'His exact role on the pitch' },
  { id: 'ageBracket', label: 'Age bracket', price: 10, emoji: '🎂', teaser: 'An age range, not the exact number' },
  { id: 'valueBand', label: 'Market value band', price: 10, emoji: '💰', teaser: 'A rough price tag' },
  { id: 'clubInitial', label: 'Club initial', price: 20, emoji: '🔤', teaser: 'First letter of his current club' },
  { id: 'club', label: 'Current club', price: 35, emoji: '🏟️', teaser: 'Where he plays right now' },
  { id: 'clubCount', label: 'Career club count', price: 10, emoji: '🧳', teaser: 'How many clubs he has on record' },
  { id: 'formerClub', label: 'One former club', price: 30, emoji: '⏪', teaser: 'A club from his past' },
];

export const CLUE_BY_ID: Record<ClueId, ClueDef> = CLUE_MENU.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<ClueId, ClueDef>,
);

/** Reveal text per clue; null means the clue cannot be offered for this player. */
export type ClueReveals = Record<ClueId, string | null>;

/** Bracket edges chosen so top-200 secrets spread across the answers. */
export function ageBracket(age: number): string {
  if (age <= 20) return 'Under 21';
  if (age <= 24) return '21 to 24';
  if (age <= 28) return '25 to 28';
  if (age <= 32) return '29 to 32';
  return '33 or older';
}

/** Band edges tuned to the live top-200 value spread (see header comment). */
export function valueBand(value: number): string {
  if (value >= 120_000_000) return '$120M or more';
  if (value >= 80_000_000) return '$80M to $120M';
  if (value >= 60_000_000) return '$60M to $80M';
  if (value >= 45_000_000) return '$45M to $60M';
  return 'Under $45M';
}

/**
 * Map from normalized club key to a nicely cased display name, built from the
 * raw current-club strings already sitting in the pool. Former clubs that
 * match a pool club get the pretty name; the rest fall back to formatClubKey.
 */
export function buildClubDisplayMap(pool: WhoAmIPlayer[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of pool) {
    const key = clubKey(p.club);
    if (key && !map.has(key)) map.set(key, p.club.trim());
  }
  return map;
}

const CLUB_TOKEN_UPPER = new Set([
  'fc', 'cf', 'afc', 'ac', 'as', 'sc', 'ssc', 'sl', 'sv', 'vfb', 'vfl', 'bsc', 'tsg',
  'rb', 'rc', 'rcd', 'cd', 'ca', 'ud', 'us', 'ss', 'fk', 'nk', 'sk', 'bk', 'if',
  'psv', 'az', 'aek', 'ogc', 'losc', 'psg', 'cska', 'ec', 'se',
]);

/** Best-effort title case for a normalized club key ("fc porto" to "FC Porto"). */
export function formatClubKey(key: string): string {
  return key
    .split(' ')
    .filter(Boolean)
    .map(t => (CLUB_TOKEN_UPPER.has(t) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1)))
    .join(' ');
}

/**
 * Computes every reveal for one secret player. Call it once when a round
 * starts and keep the result in state: the former-club pick is randomized
 * here (preferring clubs that have a pretty display name in the pool), so
 * re-running it mid-round would shuffle that answer.
 *
 * The former club is never the current club. When the history holds nothing
 * beyond the current club, that clue comes back null and the shop shows it
 * as unavailable. The same null convention covers missing nationality,
 * position or club data, so a clue with no real information never sells.
 */
export function buildClueReveals(
  secret: WhoAmIPlayer,
  history: Set<string> | undefined,
  clubDisplay: Map<string, string>,
): ClueReveals {
  const currentKey = clubKey(secret.club);
  const clubName = secret.club.trim();
  const nationality = secret.nationality.trim();
  const position = secret.position.trim();

  const clubs = new Set<string>(history ?? []);
  if (currentKey) clubs.add(currentKey);
  const clubCount = clubs.size;

  const formerKeys = [...clubs].filter(k => k !== currentKey);
  let formerClub: string | null = null;
  if (formerKeys.length > 0) {
    const pretty = formerKeys.filter(k => clubDisplay.has(k));
    const pickFrom = pretty.length > 0 ? pretty : formerKeys;
    const key = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    formerClub = clubDisplay.get(key) ?? formatClubKey(key);
  }

  return {
    nationality: nationality ? `${flagFor(nationality)} ${nationality}` : null,
    position: position ? `${position} (${shortPosition(position)})` : null,
    ageBracket: ageBracket(secret.age),
    valueBand: valueBand(secret.value),
    clubInitial: currentKey ? `Starts with "${clubName.charAt(0).toUpperCase()}"` : null,
    club: currentKey ? clubName : null,
    clubCount: clubCount > 0 ? `${clubCount} ${clubCount === 1 ? 'club' : 'clubs'} on record` : null,
    formerClub,
  };
}
