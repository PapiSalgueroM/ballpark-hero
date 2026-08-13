/**
 * Round 72: verified summer 2026 transfer window overlay.
 *
 * The Supabase market value dataset is a pre-window snapshot of 2026, so
 * these COMPLETED moves (verified against news sources on 2026-08-13) are
 * applied on top at bake time. `to` is the ENGINE club name; `to: null`
 * removes the player from the game (moved to a club we do not model).
 *
 * Deliberately excluded because they were only "agreed/negotiating" at
 * verification time: Konate to Real Madrid, Bouaddi to Man City, Araujo to
 * Liverpool (loan), Romero to Atletico, Vinicius and Rodri rumors.
 *
 * Sources checked 2026-08-13: football365 top 20, fifaworldcupnews Europe
 * list, MLSSoccer/ESPN/Chicago Fire official (Lewandowski), NL Times/beIN/
 * ESPN (ter Stegen loan), The Week (Saudi), us11fc (MLS top 10).
 */
export const TRANSFER_OVERLAY_2026 = [
  // Premier League and out
  { name: 'Morgan Rogers', to: 'Chelsea' },
  { name: 'Elliot Anderson', to: 'Manchester City' },
  // Tonali has no 2025/26 dataset row (import gap), so he is added outright:
  // CDM, born 2000, valued around $86m pre-move.
  { name: 'Sandro Tonali', to: 'Tottenham', add: { p: 'Defensive Midfield', a: 26, usd: 86000000 } },
  { name: 'Mateus Fernandes', to: 'Tottenham' },
  { name: 'Bruno Guimarães', to: 'Arsenal' },
  { name: 'Anthony Gordon', to: 'Barcelona' },
  { name: 'Crysencio Summerville', to: 'Al-Hilal' },
  { name: 'Jérémy Jacquet', to: 'Liverpool' },
  { name: 'Jan Paul van Hecke', to: 'Tottenham' },
  { name: 'Maxence Lacroix', to: 'Chelsea' },
  { name: 'Johan Manzambi', to: 'Aston Villa' },
  { name: 'Andrey Santos', to: 'Manchester United' },
  { name: 'Marco Palestra', to: 'Chelsea' },
  { name: 'Luka Vuskovic', to: 'Brighton' },
  { name: 'Geovany Quenda', to: 'Chelsea' },
  { name: 'Christos Tzolis', to: 'Arsenal' },
  // La Liga
  { name: 'Yan Diomande', to: 'Real Madrid' },
  { name: 'Marc Cucurella', to: 'Real Madrid' },
  { name: 'Bernardo Silva', to: 'Real Madrid' },
  { name: 'Denzel Dumfries', to: 'Real Madrid' },
  { name: 'Karim Adeyemi', to: 'Barcelona' },
  // Serie A
  { name: 'Gonçalo Ramos', to: 'AC Milan' },
  // Bundesliga
  { name: 'Ismael Saibari', to: 'Bayern Munich' },
  { name: 'Nathaniel Brown', to: 'Bayern Munich' },
  // Eredivisie
  { name: 'Marc-André ter Stegen', to: 'Ajax' },
  { name: 'Julian Brandt', to: 'Ajax' },
  // Saudi Pro League
  { name: 'Francisco Trincão', to: 'Al-Ahli' },
  // Spertsyan's dataset rows sit at FC Krasnodar, which we do not model.
  { name: 'Eduard Spertsyan', to: 'Al-Ahli', add: { p: 'Attacking Midfield', a: 25, usd: 27000000 } },
  { name: 'Jan-Carlo Simić', to: 'Al-Ittihad' },
  { name: 'Malang Sarr', to: 'NEOM SC' },
  { name: 'Souffian El Karouani', to: 'Al-Qadsiah' },
  { name: 'Angelo Fulgini', to: 'Al-Khaleej' },
  // Diallo's 2026 row is at Umm Salal (unmodeled), so he is added outright.
  { name: 'Abdou Diallo', to: 'Abha', add: { p: 'Centre-Back', a: 30, usd: 5000000 } },
  // MLS
  { name: 'Robert Lewandowski', to: 'Chicago Fire' },
  { name: 'Antoine Griezmann', to: 'Orlando City' },
  { name: 'Allan Saint-Maximin', to: 'Charlotte FC' },
  { name: 'Brais Méndez', to: 'Columbus Crew' },
  // Left the modeled world
  { name: 'Gabriel Pec', to: null, note: 'Cruzeiro' },
];
