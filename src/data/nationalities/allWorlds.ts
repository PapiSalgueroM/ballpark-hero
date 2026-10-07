/* Round 1042, step 5a. FOR SCRIPTS AND TESTS ONLY. The app must never import this file.
   Every harness that wants all five nationality worlds at once reads them from here. Today this
   hands on the one map src/data/playerNationalities.ts still holds; the next commit of this round
   splits the past worlds into their own files and this file is then written by
   scripts/bakeNationalities.mjs with them. */
export { NATIONALITY_BY_WORLD } from '../playerNationalities';

/** Registers every past world at once, for a script that calls nationalityOf without loading the
 *  engine's eras. Nothing to register while one module still holds all five worlds. */
export function registerAllNationalityWorlds(): void {
  /* nothing yet: see the header */
}
