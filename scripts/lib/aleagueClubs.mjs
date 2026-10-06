/**
 * Round 1035: the A-League Men's names and position groups, shared by
 * scripts/genClubManagerALeague.mjs (which writes the squads) and
 * scripts/simClubManagerALeague.mjs (which holds them), so the two can never
 * disagree about which ledger is which club. Pure, no I/O.
 */

/** Ledger slug -> the engine's club name (REAL_LEAGUES, CLUB_COLORS key). */
export const ENGINE_NAME = {
  'adelaide-united': 'Adelaide United', 'auckland-fc': 'Auckland FC', 'brisbane-roar': 'Brisbane Roar',
  'central-coast-mariners': 'Central Coast Mariners', 'macarthur-fc': 'Macarthur FC',
  'melbourne-city': 'Melbourne City', 'melbourne-victory': 'Melbourne Victory',
  'newcastle-jets': 'Newcastle Jets', 'perth-glory': 'Perth Glory', 'sydney-fc': 'Sydney FC',
  'wellington-phoenix': 'Wellington Phoenix', 'western-sydney-wanderers': 'Western Sydney Wanderers',
};

/** The ledger's group of each engine position, and each group's default. */
export const GROUP_OF = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'FWD', RW: 'FWD', ST: 'FWD', CF: 'FWD' };
export const GROUP_DEFAULT = { GK: 'GK', DEF: 'CB', MID: 'CM', FWD: 'ST' };

/** Other hosts' nationality spellings -> Transfermarkt's, the house
 *  convention (the same table _people.json records). */
export const NATIONALITY_ALIAS = {
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina', 'Congo DR': 'DR Congo', 'Republic of Ireland': 'Ireland',
  'South Korea': 'Korea, South', 'Korea Republic': 'Korea, South', 'South Sudan': 'Southern Sudan', USA: 'United States',
};
