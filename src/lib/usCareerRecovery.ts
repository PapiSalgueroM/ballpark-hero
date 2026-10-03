type RecoverySport = 'nfl' | 'nba' | 'mlb' | 'nhl';

const RECOVERY_ITEMS: Record<RecoverySport, string> = {
  nfl: 'recovery_suite', nba: 'recovery_nba', mlb: 'recovery_mlb', nhl: 'recovery_nhl',
};

/** Active service lowers simulation injury chance by 25%, without changing injury severity or drawing RNG. */
export function careerRecoveryRisk(sport: RecoverySport, purchased: readonly string[] | undefined, risk: number): number {
  return purchased?.includes(RECOVERY_ITEMS[sport]) ? risk * 0.75 : risk;
}
