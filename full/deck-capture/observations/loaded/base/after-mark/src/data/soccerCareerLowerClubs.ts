/* Round 1175: names already verified for Club Manager's 2026-27 pools,
   copied without importing its engine. Read 2026-10-06.
   Serie B: espn.com/soccer/standings/_/league/ita.2 and
   sport.sky.it/calcio/serie-b/squadre-serie-b-2026-2027 (2026-06-07).
   Ligue 2: espn.com/soccer/standings/_/league/fra.2 and
   asse.fr/fr/club/saison-2026-2027/classement-ligue-2-bkt/.
   Segunda: espn.com/soccer/standings/_/league/esp.2 and
   laliga.com/en-GB/laliga-hypermotion/standing.
   Segunda keeps Club Manager's partial pool: 20 named first teams out of
   22, with the two reserve teams excluded. Future tables and movement are
   simulated, including direct swaps instead of promotion playoffs. */
export const CAREER_LOWER_CLUBS: Record<string, string[]> = {
  'Ligue 2': ['Metz', 'Nantes', 'Saint-Étienne', 'Red Star FC', 'Reims', 'Montpellier', 'Nancy', 'Annecy', 'Sochaux', 'Dijon', 'Pau', 'Guingamp', 'Dunkerque', 'Grenoble', 'Rodez', 'Clermont', 'Boulogne', 'Laval'],
  'Serie B': ['Cremonese', 'Verona', 'Pisa', 'Avellino', 'Carrarese', 'Catanzaro', 'Cesena', 'Empoli', 'Entella', 'Juve Stabia', 'Mantova', 'Modena', 'Padova', 'Palermo', 'Sampdoria', 'Südtirol', 'Vicenza', 'Arezzo', 'Benevento', 'Ascoli'],
  'Segunda Division': ['Real Oviedo', 'Girona', 'Mallorca', 'Eibar', 'Castellón', 'Almería', 'Burgos', 'Sabadell', 'Sporting Gijón', 'Granada', 'Las Palmas', 'Tenerife', 'Leganés', 'Valladolid', 'Córdoba', 'Eldense', 'Cádiz', 'FC Andorra', 'Ceuta', 'Albacete'],
};
