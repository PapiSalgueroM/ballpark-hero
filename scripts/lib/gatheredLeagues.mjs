/**
 * Round 1052: the leagues whose squads are GATHERED (read on two or more
 * squad lists a club and written down in a research file) rather than baked
 * from the value table, beyond the A-League (which keeps its own Round 1035
 * ledgers and caller). One row a league, read by:
 *   scripts/genClubManagerGathered.mjs   writes `out` from `research`
 *   scripts/simClubManagerGathered.mjs   holds `out` to `research`
 *   scripts/simClubManagerNewLeagues.mjs reads which leagues mark their own
 *                                        partial clubs
 * so a later gathered league is one row here, one research file and its
 * engine rows. Pure, no I/O.
 *
 *   id         the folder under scripts/data/gatheredSquads/
 *   prefix     the generated file's export prefix: CM_<prefix>_ROSTERS
 *   label      how the picker's date line names the league's squads
 *   research   the committed research file the generator reads, and nothing else
 *   out        the generated file
 *   leagueIds  the engine's league ids (REAL_LEAGUES) these clubs sit in
 *   clubs      how many clubs the research must hold
 */
export const GATHERED_LEAGUES = [
  {
    id: 'russia2026', prefix: 'RUSSIA', label: 'Russian Premier League',
    research: 'scripts/data/gatheredSquads/russia2026/research.json',
    out: 'src/data/clubManagerRussia2026.ts', leagueIds: ['russia'], clubs: 16,
  },
];

export const gatheredLeague = id => GATHERED_LEAGUES.find(l => l.id === id) ?? null;
