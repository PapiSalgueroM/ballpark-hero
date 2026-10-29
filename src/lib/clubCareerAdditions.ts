/**
 * Round 1571: a man's career clubs, counted the way the club squares state
 * the rule ("Played for 4+ clubs", "One-club man", "Played for <club>"):
 * senior first teams only, loans included, each club once.
 *
 * The market table the clubs are read from has holes. It holds no Defensive
 * Midfield rows for 2023, 2024 or 2025 (Round 669's finding), so Tyler Morton
 * read as Liverpool and Lyon while he had also played for Blackburn Rovers and
 * Hull City on loan. The fix is a committed, two source record of the senior
 * clubs the table lacks (scripts/data/bingoClubAdditions-2026-10.json), derived
 * into src/data/bingoClubAdditions.json by scripts/genBingoClubAdditions.mjs
 * and applied here. Union only: an addition never removes a table club.
 *
 * Sport neutral and pure: it imports nothing. The caller hands it the name,
 * nationality, role and club key functions of its own game, so Clue Auction,
 * Who Am I or another sport can bind the same record later.
 */

/** One verified man and the senior clubs the table lacks for him. */
export interface ClubAddition {
  /** His name as the table spells it. */
  n: string;
  /** His primary nationality as the table spells it. */
  nat: string;
  /** Birth year, from the sources. */
  by: number;
  /** The pool row's position as read from the fixture: the role guard (two Vitinhas share name, nationality and birth year). */
  pos: string;
  /** Club strings the table lacks for him, in the table's own spelling where the table carries the club at all. */
  clubs: string[];
}

/** The reviewed counting rules: spellings of one club, and reserve sides that are not a club of their own. */
export interface CareerClubRules {
  /** club key -> the key it is counted as (two spellings of one club). */
  aliases: Record<string, string>;
  /** club keys of youth, reserve and B sides, never counted as a club. */
  reserves: string[];
}

/** The fields of a pool row the guard reads. */
export interface CareerMan {
  name: string;
  nationality: string;
  position: string;
  age: number;
  year: number;
}

/** The caller's own functions: name folding, primary nationality, role, and club key. */
export interface CareerKeyFns {
  norm: (s: string) => string;
  nat: (s: string) => string;
  role: (position: string) => string;
  club: (s: string) => string;
}

export type AdditionStatus = 'added' | 'present' | 'unmatched' | 'ambiguous';

export interface AdditionReceipt {
  name: string;
  club: string;
  status: AdditionStatus;
}

/**
 * The parts of a mid season "Club A / Club B" value. Only a slash with spaces
 * on both sides separates two clubs: "FK Bodø/Glimt" is one club.
 */
export function clubParts(value: string): string[] {
  return value.split(' / ').map(part => part.trim()).filter(Boolean);
}

/**
 * The career club set: every key split into its clubs, reserve sides dropped,
 * spellings of one club mapped onto one key.
 */
export function careerClubs(keys: Iterable<string>, rules: CareerClubRules, keyOf: (s: string) => string): Set<string> {
  const out = new Set<string>();
  for (const key of keys) {
    for (const part of clubParts(key)) {
      const k = keyOf(part);
      if (!k || rules.reserves.includes(k)) continue;
      out.add(rules.aliases[k] ?? k);
    }
  }
  return out;
}

/**
 * Same man: folded name, primary nationality and role all equal, and his row's
 * year minus its listed age within a year of the birth year (the table lists
 * age on 1 January, so both conventions occur; the Rodri honour's rule). A row
 * with no positive whole age or year never matches.
 */
export function matchesAddition(a: ClubAddition, man: CareerMan, fns: CareerKeyFns): boolean {
  if (!Number.isInteger(man.age) || man.age <= 0 || !Number.isInteger(man.year) || man.year <= 0) return false;
  if (fns.norm(man.name) !== fns.norm(a.n)) return false;
  const nat = fns.nat(man.nationality);
  if (!nat || nat !== fns.nat(a.nat)) return false;
  const role = fns.role(man.position);
  if (!role || role !== fns.role(a.pos)) return false;
  const born = man.year - man.age;
  return born >= a.by && born <= a.by + 1;
}

/**
 * Adds each addition's clubs to the one pool man it matches. An addition that
 * matches no pool man, or more than one, is reported and never applied, so a
 * namesake can never inherit another man's clubs. Applying twice adds nothing.
 */
export function applyClubAdditions(
  history: Map<string, Set<string>>,
  pool: CareerMan[],
  additions: ClubAddition[],
  fns: CareerKeyFns,
): AdditionReceipt[] {
  const receipts: AdditionReceipt[] = [];
  for (const a of additions) {
    const matches = pool.filter(man => matchesAddition(a, man, fns));
    if (matches.length !== 1) {
      for (const club of a.clubs) receipts.push({ name: a.n, club, status: matches.length ? 'ambiguous' : 'unmatched' });
      continue;
    }
    const man = matches[0];
    let set = history.get(man.name);
    if (!set) {
      set = new Set<string>();
      history.set(man.name, set);
    }
    for (const club of a.clubs) {
      const key = fns.club(club);
      if (!key) continue;
      receipts.push({ name: man.name, club: key, status: set.has(key) ? 'present' : 'added' });
      set.add(key);
    }
  }
  return receipts;
}
