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

/* Round 1052: the position groups and the nationality alias table moved to
   scripts/lib/gatheredLeague.mjs with the rest of the generator's rules, so
   every gathered league reads one copy. They are re-exported here so this
   file's importers did not have to change. */
export { GROUP_OF, GROUP_DEFAULT, NATIONALITY_ALIAS } from './gatheredLeague.mjs';
