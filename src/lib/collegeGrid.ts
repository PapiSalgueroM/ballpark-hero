import type { PlayerSourceConfig } from '@/lib/playerSearch';
import type { GridAttribute } from '@/types/footballGrid';
import {
  fetchFranchiseGridData,
  type FranchiseGridConfig,
  type FranchiseGridData,
  type FranchisePlayer,
} from '@/lib/gridEngine';

/**
 * College Grid, judged in the browser against its answer key (Round 611).
 *
 * The page used to send every guess to an AI validator that runs out of its
 * free allowance for most of the US day, and a guess it could not confirm was
 * never counted, so boards could be neither won nor lost. This module judges
 * a guess in memory against public.college_grid_players, which is
 * scripts/data/collegeGridPlayers.json loaded row for row. Every fact on a
 * row is derived by scripts/genCollegeGridData.mjs (the rules are written on
 * the file); this module only reads them and turns them into yes, no or
 * unknown. A guess costs a turn only on a no, and a no only comes from a
 * complete fact.
 *
 * EXPORTS
 *   COLLEGE_GRID_PLAYER_SOURCE  the PlayerAutocomplete source: the key's display names.
 *   MIN_POOL_SIZE               fewer rows than this means a broken fetch (the key holds 35,709).
 *   fetchCollegeGridData()      pages the whole key once through gridEngine and indexes it; null on failure.
 *   toCollegeEntry(raw)         one table row (or one row of the JSON file read back into
 *                               column keys) to an entry, namesake flags not yet set.
 *   indexCollegeEntries(raws)   rows to entries with the namesake flags set. This is what a
 *                               node script calls on the JSON file's rows: pure, no fetch.
 *   markCollegeNamesakes(list)  sets identityOpen and heismanOpen across a list of entries.
 *   COLLEGE_LABELS, CRITERIA_LABELS, LABELS
 *                               the closed vocabulary: 44 schools and 13 criteria.
 *   labelOf(label)              the vocabulary entry for a label text or a board attribute, or null.
 *   judgeLabel(entry, label)    yes, no or unknown for one label.
 *   judgeCollegeCell(entry, row, col)
 *                               yes when both labels are yes, no when either is no, unknown otherwise.
 *   schoolsOnRecord(entry)      the schools the records hold, for the toast on a college unknown.
 *   Verdict, LabelKind, CollegeLabel, CollegeGridEntry, CollegeGridData (types).
 *
 * PER LABEL
 *   A school            yes when the school is in colleges; otherwise unknown. A college
 *                       miss is never charged: no table holds a full transfer history.
 *   A position group    yes when the group is in groups; no when groups is non-empty and
 *                       lacks it; unknown when groups is empty.
 *   Heisman Winner      yes when heisman_year is set; otherwise no, except unknown when the
 *                       entry shares a winner's folded name, or its surname and a school
 *                       with a winner row that joined no entry (John Lattner won in 1953;
 *                       the draft table spells him Johnny).
 *   First Round Pick    yes when first_round is true; no when first_round is false or the
 *                       entry is undrafted; unknown when first_round is null.
 *   Top 10, Top 5, 1st Overall Pick
 *                       yes when best_pick is at most 10, 5 or 1; no when best_pick is
 *                       larger or the entry is undrafted; unknown otherwise.
 *
 * ONE GUARD ON TOP, FOR SPLIT IDENTITIES. The key keeps a draft row that joined
 * no NFL career as its own entry, and one person can end up as two entries
 * (Joe Namath's 1965 draft row and his 1970 to 1977 career, because the NFL
 * key starts in 1970). When an entry shares its folded name with an entry of
 * the other kind (a career and a non-career), its position and pick facts may
 * be split across the two, so they never say no for it: identityOpen turns
 * those no verdicts into unknown. Two non-career entries with one folded name
 * at one school are open the same way (Merv Pregulman is a 1944 and a 1950
 * Michigan draft row, split by the gap between them). Yes verdicts are untouched.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Verdict = 'yes' | 'no' | 'unknown';

export type LabelKind = 'college' | 'position' | 'heisman' | 'firstRound' | 'topPick';

export interface CollegeLabel {
  /** The text on the board, also the school's spelling in the key for a college. */
  label: string;
  kind: LabelKind;
  /** The board attribute type the puzzle file carries. */
  type: GridAttribute['type'];
  /** For a position label: QB, RB, WR, TE, OL, DL, LB or DB. */
  group?: string;
  /** For a top pick label: the largest pick that counts. */
  maxPick?: number;
}

export interface CollegeGridEntry extends FranchisePlayer {
  /** The display name the search offers and a guess is matched on. */
  name: string;
  /** The entry's schools, as a set, for the shared engine. */
  franchises: Set<string>;
  id: string;
  nameNorm: string;
  colleges: string[];
  collegesAgreed: string[];
  groups: Set<string>;
  bestPick: number | null;
  firstRound: boolean | null;
  undrafted: boolean;
  heismanYear: number | null;
  firstSeason: number | null;
  seasons: number;
  dup: boolean;
  /** Shares a folded name with an entry of the other kind, or is a non-career sharing one with another at a school: position and pick facts never say no. */
  identityOpen: boolean;
  /** Heisman Winner never says no (a winner's name, or a lone winner's surname at one of its schools). */
  heismanOpen: boolean;
}

export type CollegeGridData = FranchiseGridData<CollegeGridEntry>;

// ---------------------------------------------------------------------------
// The closed vocabulary
// ---------------------------------------------------------------------------

/** The 44 schools on the College Grid boards, spelled as the draft table spells them. */
export const COLLEGE_LABELS: CollegeLabel[] = [
  'Alabama', 'Arizona State', 'Arkansas', 'Auburn', 'Baylor', 'Boise State', 'BYU', 'Cincinnati',
  'Clemson', 'Colorado', 'Florida', 'Florida State', 'Georgia', 'Houston', 'Iowa', 'LSU',
  'Louisville', 'Miami (FL)', 'Michigan', 'Michigan State', 'Mississippi State', 'Nebraska', 'Notre Dame', 'Ohio State',
  'Oklahoma', 'Oklahoma State', 'Ole Miss', 'Oregon', 'Penn State', 'Pittsburgh', 'Purdue', 'South Carolina',
  'Stanford', 'Syracuse', 'TCU', 'Tennessee', 'Texas', 'Texas A&M', 'UCLA', 'USC',
  'Virginia Tech', 'Washington', 'West Virginia', 'Wisconsin',
].map((label) => ({ label, kind: 'college' as const, type: 'college' as const }));

/** The 13 criteria: eight position groups, the Heisman and four draft slots. */
export const CRITERIA_LABELS: CollegeLabel[] = [
  { label: 'Quarterback', kind: 'position', type: 'position', group: 'QB' },
  { label: 'Running Back', kind: 'position', type: 'position', group: 'RB' },
  { label: 'Wide Receiver', kind: 'position', type: 'position', group: 'WR' },
  { label: 'Tight End', kind: 'position', type: 'position', group: 'TE' },
  { label: 'Offensive Lineman', kind: 'position', type: 'position', group: 'OL' },
  { label: 'Defensive Lineman', kind: 'position', type: 'position', group: 'DL' },
  { label: 'Linebacker', kind: 'position', type: 'position', group: 'LB' },
  { label: 'Defensive Back', kind: 'position', type: 'position', group: 'DB' },
  { label: 'Heisman Winner', kind: 'heisman', type: 'award' },
  { label: 'First Round Pick', kind: 'firstRound', type: 'draft' },
  { label: 'Top 10 Pick', kind: 'topPick', type: 'draft', maxPick: 10 },
  { label: 'Top 5 Pick', kind: 'topPick', type: 'draft', maxPick: 5 },
  { label: '1st Overall Pick', kind: 'topPick', type: 'draft', maxPick: 1 },
];

export const LABELS: CollegeLabel[] = [...COLLEGE_LABELS, ...CRITERIA_LABELS];

const LABEL_BY_TEXT = new Map(LABELS.map((l) => [l.label, l]));

export function labelOf(label: string | { label: string }): CollegeLabel | null {
  const text = typeof label === 'string' ? label : label?.label;
  return LABEL_BY_TEXT.get(String(text ?? '')) ?? null;
}

// ---------------------------------------------------------------------------
// Rows to entries
// ---------------------------------------------------------------------------

const textList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);
const intOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};
const boolOrNull = (v: unknown): boolean | null => (v === true ? true : v === false ? false : null);

export function toCollegeEntry(raw: Record<string, unknown>): CollegeGridEntry | null {
  const name = String(raw.display_name ?? '').trim();
  const id = String(raw.id ?? '').trim();
  if (!name || !id) return null;
  const colleges = textList(raw.colleges);
  return {
    name,
    franchises: new Set(colleges),
    id,
    nameNorm: String(raw.name_norm ?? ''),
    colleges,
    collegesAgreed: textList(raw.colleges_agreed),
    groups: new Set(textList(raw.groups)),
    bestPick: intOrNull(raw.best_pick),
    firstRound: boolOrNull(raw.first_round),
    undrafted: raw.undrafted === true,
    heismanYear: intOrNull(raw.heisman_year),
    firstSeason: intOrNull(raw.first_season),
    seasons: intOrNull(raw.seasons) ?? 0,
    dup: raw.dup === true,
    identityOpen: false,
    heismanOpen: false,
  };
}

const surnameOf = (nameNorm: string) => nameNorm.split(' ').pop() ?? '';

/** Sets identityOpen and heismanOpen from the whole key; each flag only ever turns a no into unknown. */
export function markCollegeNamesakes(entries: CollegeGridEntry[]): void {
  const kindsByName = new Map<string, { career: number; other: number }>();
  /* Non-career entries per folded name and school. */
  const othersAtSchool = new Map<string, number>();
  const winnerNames = new Set<string>();
  const loneWinners = new Set<string>();
  for (const e of entries) {
    const k = kindsByName.get(e.nameNorm) ?? { career: 0, other: 0 };
    if (e.firstSeason !== null) k.career += 1;
    else {
      k.other += 1;
      for (const c of new Set(e.colleges)) othersAtSchool.set(`${e.nameNorm}|${c}`, (othersAtSchool.get(`${e.nameNorm}|${c}`) ?? 0) + 1);
    }
    kindsByName.set(e.nameNorm, k);
    if (e.heismanYear !== null) {
      winnerNames.add(e.nameNorm);
      /* A winner row that joined no drafted player or career stands alone. */
      if (e.id.startsWith('heisman:')) for (const c of e.colleges) loneWinners.add(`${surnameOf(e.nameNorm)}|${c}`);
    }
  }
  for (const e of entries) {
    const k = kindsByName.get(e.nameNorm) ?? { career: 0, other: 0 };
    e.identityOpen = e.firstSeason !== null
      ? k.other > 0
      : k.career > 0 || e.colleges.some((c) => (othersAtSchool.get(`${e.nameNorm}|${c}`) ?? 0) > 1);
    e.heismanOpen = e.heismanYear === null
      && (winnerNames.has(e.nameNorm) || e.colleges.some((c) => loneWinners.has(`${surnameOf(e.nameNorm)}|${c}`)));
  }
}

export function indexCollegeEntries(raws: Record<string, unknown>[]): CollegeGridEntry[] {
  const entries = raws.map(toCollegeEntry).filter((e): e is CollegeGridEntry => e !== null);
  markCollegeNamesakes(entries);
  return entries;
}

// ---------------------------------------------------------------------------
// The judge
// ---------------------------------------------------------------------------

export function judgeLabel(entry: CollegeGridEntry, label: string | { label: string }): Verdict {
  const l = labelOf(label);
  if (!l) return 'unknown';
  switch (l.kind) {
    case 'college':
      return entry.colleges.includes(l.label) ? 'yes' : 'unknown';
    case 'position':
      if (entry.groups.has(l.group as string)) return 'yes';
      return entry.groups.size > 0 && !entry.identityOpen ? 'no' : 'unknown';
    case 'heisman':
      if (entry.heismanYear !== null) return 'yes';
      return entry.heismanOpen ? 'unknown' : 'no';
    case 'firstRound':
      if (entry.firstRound === true) return 'yes';
      return (entry.firstRound === false || entry.undrafted) && !entry.identityOpen ? 'no' : 'unknown';
    case 'topPick': {
      const max = l.maxPick as number;
      if (entry.bestPick !== null && entry.bestPick <= max) return 'yes';
      return ((entry.bestPick !== null && entry.bestPick > max) || entry.undrafted) && !entry.identityOpen ? 'no' : 'unknown';
    }
    default:
      return 'unknown';
  }
}

export function judgeCollegeCell(
  entry: CollegeGridEntry,
  row: string | { label: string },
  col: string | { label: string },
): Verdict {
  const a = judgeLabel(entry, row);
  const b = judgeLabel(entry, col);
  if (a === 'no' || b === 'no') return 'no';
  if (a === 'yes' && b === 'yes') return 'yes';
  return 'unknown';
}

export function schoolsOnRecord(entry: CollegeGridEntry): string[] {
  return [...entry.colleges];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

// The key holds 35,709 rows (2026-09-15); far fewer means a broken fetch.
export const MIN_POOL_SIZE = 25000;

const COLLEGE_GRID: FranchiseGridConfig<CollegeGridEntry> = {
  table: 'college_grid_players',
  select: 'id, display_name, name_norm, colleges, colleges_agreed, groups, best_pick, first_round, undrafted, heisman_year, first_season, seasons, dup',
  /* Paged on colleges, which is never null (text[] not null default '{}'), so
     the engine's null filter drops nothing; ordered on the primary key. */
  franchiseColumn: 'colleges',
  orderColumn: 'id',
  minPoolSize: MIN_POOL_SIZE,
  toPlayer: toCollegeEntry,
};

/**
 * Fetches the whole key once and builds the in-memory index every guess is
 * judged against. Returns null on failure or an implausibly small result, so
 * the page can show its error card instead of a board it cannot judge.
 */
export async function fetchCollegeGridData(): Promise<CollegeGridData | null> {
  const data = await fetchFranchiseGridData(COLLEGE_GRID);
  if (!data) return null;
  markCollegeNamesakes(data.players);
  return data;
}

/** The search box source: the key's display names, longest NFL careers first. */
export const COLLEGE_GRID_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'college_grid_players',
  nameColumn: 'display_name',
  prominenceColumn: 'seasons',
  ilikeLimit: 200,
  prominenceLimit: 1000,
};
