export interface PlayerBingoIdentity {
  name: string;
  nationality: string;
  position: string;
}

export interface PlayerBingoAgeSnapshot extends PlayerBingoIdentity {
  age: number;
  year: number;
}

export interface PlayerBingoAgeEligibility {
  exactAge: number | null;
  is21OrUnder: boolean;
  is29OrOlder: boolean;
  basis: 'verified-dob' | 'snapshot-bound' | 'excluded' | 'unresolved';
}

/** Exact fields from the Player Bingo pool row. No normalization is allowed. */
export function playerBingoIdentityKey(player: PlayerBingoIdentity): string {
  return JSON.stringify([player.name, player.nationality, player.position]);
}

/**
 * DOBs from the two-source Player Bingo age audit completed on 2026-09-02.
 * This keeps the 45 boundary crossings plus every identity whose latest
 * snapshot can still straddle either current-age rule under the deterministic
 * seed query. Diogo Jota remains in this factual ledger but is excluded below.
 */
export const PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY: ReadonlyMap<string, string> = new Map([
  [playerBingoIdentityKey({ name: 'Abdukodir Khusanov', nationality: 'Uzbekistan', position: 'Centre-Back' }), '2004-02-29'],
  [playerBingoIdentityKey({ name: 'Habib Diarra', nationality: 'Senegal', position: 'Central Midfield' }), '2004-01-03'],
  [playerBingoIdentityKey({ name: 'Yegor Yarmolyuk', nationality: 'Ukraine', position: 'Central Midfield' }), '2004-03-01'],
  [playerBingoIdentityKey({ name: 'Gonzalo García', nationality: 'Spain', position: 'Centre-Forward' }), '2004-03-24'],
  [playerBingoIdentityKey({ name: 'Savinho', nationality: 'Brazil', position: 'Left Winger' }), '2004-04-10'],
  [playerBingoIdentityKey({ name: 'Joel Ordóñez', nationality: 'Ecuador', position: 'Centre-Back' }), '2004-04-21'],
  [playerBingoIdentityKey({ name: 'Johan Bakayoko', nationality: 'Belgium', position: 'Right Winger' }), '2003-04-20'],
  [playerBingoIdentityKey({ name: 'Andrey Santos', nationality: 'Brazil', position: 'Central Midfield' }), '2004-05-03'],
  [playerBingoIdentityKey({ name: 'Samu Aghehowa', nationality: 'Spain', position: 'Centre-Forward' }), '2004-05-05'],
  [playerBingoIdentityKey({ name: 'Bilal El Khannouss', nationality: 'Morocco', position: 'Attacking Midfield' }), '2004-05-10'],
  [playerBingoIdentityKey({ name: 'Cristhian Mosquera', nationality: 'Spain', position: 'Centre-Back' }), '2004-06-27'],
  [playerBingoIdentityKey({ name: 'Hugo Larsson', nationality: 'Sweden', position: 'Central Midfield' }), '2004-06-27'],
  [playerBingoIdentityKey({ name: 'Alejandro Garnacho', nationality: 'Argentina', position: 'Left Winger' }), '2004-07-01'],
  [playerBingoIdentityKey({ name: 'Mateus Fernandes', nationality: 'Portugal', position: 'Central Midfield' }), '2004-07-10'],
  [playerBingoIdentityKey({ name: 'Michael Kayode', nationality: 'Italy', position: 'Right-Back' }), '2004-07-10'],
  [playerBingoIdentityKey({ name: 'Yankuba Minteh', nationality: 'The Gambia', position: 'Right Winger' }), '2004-07-22'],
  [playerBingoIdentityKey({ name: 'Valentín Barco', nationality: 'Argentina', position: 'Central Midfield' }), '2004-07-23'],
  [playerBingoIdentityKey({ name: 'Gavi', nationality: 'Spain', position: 'Central Midfield' }), '2004-08-05'],
  [playerBingoIdentityKey({ name: 'Jamie Gittens', nationality: 'England', position: 'Left Winger' }), '2004-08-08'],
  [playerBingoIdentityKey({ name: 'João Neves', nationality: 'Portugal', position: 'Central Midfield' }), '2004-09-27'],
  [playerBingoIdentityKey({ name: 'Nico Paz', nationality: 'Argentina', position: 'Attacking Midfield' }), '2004-09-08'],
  [playerBingoIdentityKey({ name: 'Lewis Hall', nationality: 'England', position: 'Left-Back' }), '2004-09-08'],
  [playerBingoIdentityKey({ name: 'Patrick Dorgu', nationality: 'Denmark', position: 'Left-Back' }), '2004-10-26'],
  [playerBingoIdentityKey({ name: 'Santiago Castro', nationality: 'Argentina', position: 'Centre-Forward' }), '2004-09-18'],
  [playerBingoIdentityKey({ name: 'Rico Lewis', nationality: 'England', position: 'Right-Back' }), '2004-11-21'],
  [playerBingoIdentityKey({ name: 'Noah Sadiki', nationality: 'DR Congo', position: 'Central Midfield' }), '2004-12-17'],
  [playerBingoIdentityKey({ name: 'Evan Ferguson', nationality: 'Ireland', position: 'Centre-Forward' }), '2004-10-19'],
  [playerBingoIdentityKey({ name: 'Brais Méndez', nationality: 'Spain', position: 'Attacking Midfield' }), '1997-01-07'],
  [playerBingoIdentityKey({ name: 'Luis Díaz', nationality: 'Colombia', position: 'Left Winger' }), '1997-01-13'],
  [playerBingoIdentityKey({ name: 'Pau Torres', nationality: 'Spain', position: 'Centre-Back' }), '1997-01-16'],
  [playerBingoIdentityKey({ name: 'Nicolò Barella', nationality: 'Italy', position: 'Central Midfield' }), '1997-02-07'],
  [playerBingoIdentityKey({ name: 'Pepê', nationality: 'Brazil', position: 'Right Winger' }), '1997-02-24'],
  [playerBingoIdentityKey({ name: 'David Neres', nationality: 'Brazil', position: 'Right Winger' }), '1997-03-03'],
  [playerBingoIdentityKey({ name: 'Bremer', nationality: 'Brazil', position: 'Centre-Back' }), '1997-03-18'],
  [playerBingoIdentityKey({ name: 'Gabriel Jesus', nationality: 'Brazil', position: 'Centre-Forward' }), '1997-04-03'],
  [playerBingoIdentityKey({ name: 'Mikel Oyarzabal', nationality: 'Spain', position: 'Centre-Forward' }), '1997-04-21'],
  [playerBingoIdentityKey({ name: 'Youri Tielemans', nationality: 'Belgium', position: 'Central Midfield' }), '1997-05-07'],
  [playerBingoIdentityKey({ name: 'Richarlison', nationality: 'Brazil', position: 'Centre-Forward' }), '1997-05-10'],
  [playerBingoIdentityKey({ name: 'Frenkie de Jong', nationality: 'Netherlands', position: 'Central Midfield' }), '1997-05-12'],
  [playerBingoIdentityKey({ name: 'Rúben Dias', nationality: 'Portugal', position: 'Centre-Back' }), '1997-05-14'],
  [playerBingoIdentityKey({ name: 'Ousmane Dembélé', nationality: 'France', position: 'Centre-Forward' }), '1997-05-15'],
  [playerBingoIdentityKey({ name: 'Kaoru Mitoma', nationality: 'Japan', position: 'Left Winger' }), '1997-05-20'],
  [playerBingoIdentityKey({ name: 'Maximilian Kilman', nationality: 'England', position: 'Centre-Back' }), '1997-05-23'],
  [playerBingoIdentityKey({ name: 'Konrad Laimer', nationality: 'Austria', position: 'Right-Back' }), '1997-05-27'],
  [playerBingoIdentityKey({ name: 'Unai Simón', nationality: 'Spain', position: 'Goalkeeper' }), '1997-06-11'],
  [playerBingoIdentityKey({ name: 'Albert Gudmundsson', nationality: 'Iceland', position: 'Second Striker' }), '1997-06-15'],
  [playerBingoIdentityKey({ name: 'Artem Dovbyk', nationality: 'Ukraine', position: 'Centre-Forward' }), '1997-06-21'],
  [playerBingoIdentityKey({ name: 'Jean-Philippe Mateta', nationality: 'France', position: 'Centre-Forward' }), '1997-06-28'],
  [playerBingoIdentityKey({ name: 'Marcus Thuram', nationality: 'France', position: 'Centre-Forward' }), '1997-08-06'],
  [playerBingoIdentityKey({ name: 'Antonee Robinson', nationality: 'United States', position: 'Left-Back' }), '1997-08-08'],
  [playerBingoIdentityKey({ name: 'Leon Bailey', nationality: 'Jamaica', position: 'Right Winger' }), '1997-08-09'],
  [playerBingoIdentityKey({ name: 'Lautaro Martínez', nationality: 'Argentina', position: 'Centre-Forward' }), '1997-08-22'],
  [playerBingoIdentityKey({ name: 'Lucas Paquetá', nationality: 'Brazil', position: 'Attacking Midfield' }), '1997-08-27'],
  [playerBingoIdentityKey({ name: 'Dominic Solanke', nationality: 'England', position: 'Centre-Forward' }), '1997-09-14'],
  [playerBingoIdentityKey({ name: 'Tammy Abraham', nationality: 'England', position: 'Centre-Forward' }), '1997-10-02'],
  [playerBingoIdentityKey({ name: 'Theo Hernández', nationality: 'France', position: 'Left-Back' }), '1997-10-06'],
  [playerBingoIdentityKey({ name: 'Ben White', nationality: 'England', position: 'Right-Back' }), '1997-10-08'],
  [playerBingoIdentityKey({ name: 'Nikola Milenković', nationality: 'Serbia', position: 'Centre-Back' }), '1997-10-12'],
  [playerBingoIdentityKey({ name: 'Ademola Lookman', nationality: 'Nigeria', position: 'Left Winger' }), '1997-10-20'],
  [playerBingoIdentityKey({ name: 'Ezri Konsa', nationality: 'England', position: 'Centre-Back' }), '1997-10-23'],
  [playerBingoIdentityKey({ name: 'Federico Chiesa', nationality: 'Italy', position: 'Right Winger' }), '1997-10-25'],
  [playerBingoIdentityKey({ name: 'Marcus Rashford', nationality: 'England', position: 'Left Winger' }), '1997-10-31'],
  [playerBingoIdentityKey({ name: 'Federico Dimarco', nationality: 'Italy', position: 'Left-Back' }), '1997-11-10'],
  [playerBingoIdentityKey({ name: 'Christopher Nkunku', nationality: 'France', position: 'Centre-Forward' }), '1997-11-14'],
  [playerBingoIdentityKey({ name: 'Noussair Mazraoui', nationality: 'Morocco', position: 'Right-Back' }), '1997-11-14'],
  [playerBingoIdentityKey({ name: 'Viktor Tsygankov', nationality: 'Ukraine', position: 'Right Winger' }), '1997-11-15'],
  [playerBingoIdentityKey({ name: 'Bruno Guimarães', nationality: 'Brazil', position: 'Central Midfield' }), '1997-11-16'],
  [playerBingoIdentityKey({ name: 'Gregor Kobel', nationality: 'Switzerland', position: 'Goalkeeper' }), '1997-12-06'],
  [playerBingoIdentityKey({ name: 'Harvey Barnes', nationality: 'England', position: 'Left Winger' }), '1997-12-09'],
  [playerBingoIdentityKey({ name: 'Dávid Hancko', nationality: 'Slovakia', position: 'Centre-Back' }), '1997-12-13'],
  [playerBingoIdentityKey({ name: 'Gabriel', nationality: 'Brazil', position: 'Centre-Back' }), '1997-12-19'],
  [playerBingoIdentityKey({ name: 'Fikayo Tomori', nationality: 'England', position: 'Centre-Back' }), '1997-12-19'],
  [playerBingoIdentityKey({ name: 'Diogo Jota', nationality: 'Portugal', position: 'Left Winger' }), '1996-12-04'],
]);

const PLAYER_BINGO_CURRENT_AGE_EXCLUSIONS = new Set([
  playerBingoIdentityKey({ name: 'Diogo Jota', nationality: 'Portugal', position: 'Left Winger' }),
]);

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > daysInMonth[month - 1]) return null;
  return { year, month, day };
}

/** Derives age on an explicit YYYY-MM-DD game date. */
export function calculatePlayerAgeOnDate(dateOfBirth: string, gameDate: string): number | null {
  const birth = parseCalendarDate(dateOfBirth);
  const game = parseCalendarDate(gameDate);
  if (!birth || !game) return null;
  const birthNumber = birth.year * 10_000 + birth.month * 100 + birth.day;
  const gameNumber = game.year * 10_000 + game.month * 100 + game.day;
  if (gameNumber < birthNumber) return null;
  const birthdayPassed = game.month > birth.month || (game.month === birth.month && game.day >= birth.day);
  return game.year - birth.year - (birthdayPassed ? 0 : 1);
}

export function isPlayerBingoCurrentAgeExcluded(player: PlayerBingoIdentity): boolean {
  return PLAYER_BINGO_CURRENT_AGE_EXCLUSIONS.has(playerBingoIdentityKey(player));
}

/** Returns an exact age only for an audited, living exact identity. */
export function getVerifiedPlayerBingoCurrentAge(player: PlayerBingoIdentity, gameDate: string): number | null {
  const key = playerBingoIdentityKey(player);
  if (PLAYER_BINGO_CURRENT_AGE_EXCLUSIONS.has(key)) return null;
  const dateOfBirth = PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY.get(key);
  return dateOfBirth ? calculatePlayerAgeOnDate(dateOfBirth, gameDate) : null;
}

/**
 * Classifies current-age tiles without pretending a snapshot bound is an
 * exact age. Exact DOB wins. Otherwise, an age observed at an unknown date
 * in row year y, at or before the game date, gives [age, age + 1] in the
 * game year, or
 * [age + elapsedYears - 1, age + elapsedYears + 1] in a later year.
 * A threshold is accepted only when the entire interval proves it.
 */
export function getPlayerBingoAgeEligibility(
  player: PlayerBingoAgeSnapshot,
  gameDate: string,
): PlayerBingoAgeEligibility {
  const game = parseCalendarDate(gameDate);
  if (!game) return { exactAge: null, is21OrUnder: false, is29OrOlder: false, basis: 'unresolved' };

  const key = playerBingoIdentityKey(player);
  if (PLAYER_BINGO_CURRENT_AGE_EXCLUSIONS.has(key)) {
    return { exactAge: null, is21OrUnder: false, is29OrOlder: false, basis: 'excluded' };
  }

  const dateOfBirth = PLAYER_BINGO_BIRTH_DATES_BY_IDENTITY.get(key);
  if (dateOfBirth) {
    const exactAge = calculatePlayerAgeOnDate(dateOfBirth, gameDate);
    if (exactAge == null) return { exactAge: null, is21OrUnder: false, is29OrOlder: false, basis: 'unresolved' };
    return {
      exactAge,
      is21OrUnder: exactAge <= 21,
      is29OrOlder: exactAge >= 29,
      basis: 'verified-dob',
    };
  }

  if (!Number.isInteger(player.age) || player.age <= 0 || !Number.isInteger(player.year) || player.year <= 0 || player.year > game.year) {
    return { exactAge: null, is21OrUnder: false, is29OrOlder: false, basis: 'unresolved' };
  }

  const elapsedYears = game.year - player.year;
  const minimumAge = elapsedYears === 0 ? player.age : player.age + elapsedYears - 1;
  const maximumAge = elapsedYears === 0 ? player.age + 1 : player.age + elapsedYears + 1;
  return {
    exactAge: null,
    is21OrUnder: maximumAge <= 21,
    is29OrOlder: minimumAge >= 29,
    basis: 'snapshot-bound',
  };
}
