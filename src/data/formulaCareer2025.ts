// Frozen Grand Prix template, names/order only. Later seasons are fictional.
// Calendar: formula1.com/en/racing/2025 and Sky Sports 2025 season calendar.
// Points: FIA 2025 Sporting Regulations, article 6, and PlanetF1's 2025 points explanation.
// Qualifying: FIA 2025 article 39 and PlanetF1's January 2025 format explanation.
// No fastest-lap point: Formula1's 2025 rule changes and PlanetF1's 2025 points explanation.
export const FORMULA_RULEBOOK = 'gp-2025-simple-v1' as const;
export const FORMULA_CALENDAR = [
  'Australia', 'China', 'Japan', 'Bahrain', 'Saudi Arabia', 'Miami',
  'Emilia-Romagna', 'Monaco', 'Spain', 'Canada', 'Austria', 'Great Britain',
  'Belgium', 'Hungary', 'Netherlands', 'Italy', 'Azerbaijan', 'Singapore',
  'United States', 'Mexico', 'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi',
] as const;
export const FORMULA_GP_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const FORMULA_CAREER_SEASONS = 20;
