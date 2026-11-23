export type CupScorerCredit = {
  id: string;
  name: string;
  club: string;
  generated?: true;
} | 'own-goal' | null;

type PlayerRow = [id: string, name: string, club: string, goals: number, generated?: true];

export interface CupScorerLedger {
  v: 1;
  /** Retain the stored field name for Europa League saves. Domestic cups count rounds here. */
  nights: number;
  unresolved: number;
  ownGoals: number;
  players: PlayerRow[];
}

export interface CupScorerRow {
  id: string;
  name: string;
  club: string;
  goals: number;
  generated?: true;
}

export type CupScorerWinner = Pick<CupScorerRow, 'name' | 'club' | 'goals' | 'generated'>;

export interface CupScorerRace {
  status: 'ahead' | 'racing' | 'winner' | 'shared' | 'undecided' | 'no-goals' | 'unavailable';
  rows: CupScorerRow[];
  leaders: CupScorerRow[];
  unresolved: number;
  ownGoals: number;
}

const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const label = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const byText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

export function isCupScorerLedger(value: unknown): value is CupScorerLedger {
  if (!value || typeof value !== 'object') return false;
  const ledger = value as Partial<CupScorerLedger>;
  if (ledger.v !== 1 || !count(ledger.nights) || !count(ledger.unresolved) || !count(ledger.ownGoals)
    || !Array.isArray(ledger.players)) return false;
  if (ledger.nights === 0 && (ledger.players.length || ledger.unresolved || ledger.ownGoals)) return false;
  const seen = new Set<string>();
  for (const row of ledger.players) {
    if (!Array.isArray(row) || row.length < 4 || row.length > 5 || !label(row[0]) || !label(row[1])
      || !label(row[2]) || !count(row[3]) || row[3] === 0 || (row[4] !== undefined && row[4] !== true)
      || seen.has(row[0])) return false;
    seen.add(row[0]);
  }
  return true;
}

export function newCupScorerLedger(): CupScorerLedger {
  return { v: 1, nights: 0, unresolved: 0, ownGoals: 0, players: [] };
}

/** Settle exactly one complete round. Repeating a write or leaving a gap changes nothing. */
export function recordCupScorerRound(
  ledger: CupScorerLedger,
  round: number,
  credits: readonly CupScorerCredit[],
): CupScorerLedger {
  if (round !== ledger.nights) return ledger;
  const players = new Map(ledger.players.map(row => [row[0], row]));
  let { unresolved, ownGoals } = ledger;
  for (const credit of credits) {
    if (credit === 'own-goal') {
      ownGoals++;
    } else if (!credit) {
      unresolved++;
    } else {
      const previous = players.get(credit.id);
      const next: PlayerRow = [credit.id, credit.name, credit.club, (previous?.[3] ?? 0) + 1];
      if (credit.generated || previous?.[4]) next[4] = true;
      players.set(credit.id, next);
    }
  }
  return { v: 1, nights: round + 1, unresolved, ownGoals, players: [...players.values()] };
}

export function cupScorerRace(saved: unknown, roundsDone: number, done: boolean): CupScorerRace {
  if (!isCupScorerLedger(saved)) {
    return { status: !done && roundsDone === 0 ? 'ahead' : 'unavailable', rows: [], leaders: [], unresolved: 0, ownGoals: 0 };
  }
  const rows = saved.players.map(([id, name, club, goals, generated]) => ({ id, name, club, goals, generated }));
  rows.sort((a, b) => b.goals - a.goals || byText(a.name, b.name) || byText(a.club, b.club) || byText(a.id, b.id));
  const race = { rows, leaders: [], unresolved: saved.unresolved, ownGoals: saved.ownGoals };
  if (saved.nights !== roundsDone) return { ...race, status: 'unavailable' };
  if (!done) return { ...race, status: roundsDone ? 'racing' : 'ahead' };
  if (!rows.length) return { ...race, status: saved.unresolved ? 'undecided' : 'no-goals' };

  const leaders = rows.filter(row => row.goals === rows[0].goals);
  // All missing credits could go to one rival, including a previously unnamed player.
  if (saved.unresolved && (leaders.length > 1 || rows[0].goals <= (rows[1]?.goals ?? 0) + saved.unresolved)) {
    return { ...race, status: 'undecided' };
  }
  return { ...race, status: leaders.length === 1 ? 'winner' : 'shared', leaders };
}
