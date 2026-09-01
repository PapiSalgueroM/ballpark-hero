/**
 * Round 72: verified 2026 transfer window overlay. Round 393: it reaches the
 * table too, and carries the table's own club spellings.
 *
 * The Supabase market value dataset's 2026 rows are an autumn 2025 snapshot
 * (Semenyo and Guehi, who moved in January 2026, still sit at Bournemouth
 * and Palace in it), so these COMPLETED moves are applied on top. Until
 * Round 393 they were applied at bake time only, so Club Manager's squads
 * knew about them and Footle, Player Bingo, Rarity Round and player search,
 * which read the table directly, did not. The Round 393 migration wrote
 * every entry with a `db` spelling to the player's 2026 row
 * (supabase/migrations/20260901_round_393_transfer_windows_2026.sql), and
 * scripts/simTransferOverlay.mjs fails if a re-import ever rolls one back.
 *
 * Fields:
 *   to    the ENGINE club name for the bake; null removes the player from
 *         Club Manager (a club the game does not model).
 *   db    the club spelling the market value table uses, written to the
 *         player's 2026 row. Must be a spelling the table already carries.
 *   loan  informational: a season long loan. The table lists the club a
 *         player is playing for, the same convention the dataset uses.
 *   add   the player has no 2026 dataset row, so the bake adds him outright.
 *
 * Verification. Every entry has two sources. The Round 72 pass (2026-08-13):
 * football365 top 20, fifaworldcupnews Europe list, MLSSoccer/ESPN/Chicago
 * Fire official (Lewandowski), NL Times/beIN/ESPN (ter Stegen loan), The
 * Week (Saudi), us11fc (MLS top 10). The Round 393 pass (2026-09-01): each
 * name checked against dated news headlines from named outlets (ESPN, BBC,
 * Sky Sports, The Athletic, AP, Reuters, Al Jazeera, Sports Illustrated,
 * official club sites, spl.com.sa, MLSsoccer.com), and the fourteen moves at
 * the top of the pool also against the player's Wikipedia infobox on the
 * same day. Wikipedia is a spot check here, never a pipeline.
 *
 * Deliberately excluded on 2026-08-13 because they were only "agreed" at the
 * time: Konate to Real Madrid, Bouaddi to Man City, Araujo to Liverpool
 * (loan), Romero to Atletico, Vinicius. Rodri was a rumour then and completed
 * on 2026-08-18, so he is in now. Griezmann has no 2026 dataset row and no
 * add data, so the bake takes his 2025 row and nothing is written for him.
 */
export const TRANSFER_OVERLAY_2026 = [
  // Premier League and out
  { name: 'Morgan Rogers', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Elliot Anderson', to: 'Manchester City', db: 'Manchester City' },
  // Tonali had no 2025/26 dataset row when this was written (the import has
  // since gained one, already at Tottenham), so the add data is kept for a
  // dataset that lacks him: CDM, born 2000, valued around $86m pre-move.
  { name: 'Sandro Tonali', to: 'Tottenham', db: 'Tottenham Hotspur', add: { p: 'Defensive Midfield', a: 26, usd: 86000000 } },
  { name: 'Mateus Fernandes', to: 'Tottenham', db: 'Tottenham Hotspur' },
  { name: 'Bruno Guimarães', to: 'Arsenal', db: 'Arsenal FC' },
  { name: 'Anthony Gordon', to: 'Barcelona', db: 'FC Barcelona' },
  { name: 'Crysencio Summerville', to: 'Al-Hilal', db: 'Al-Hilal SFC' },
  { name: 'Jérémy Jacquet', to: 'Liverpool', db: 'Liverpool FC' },
  { name: 'Jan Paul van Hecke', to: 'Tottenham', db: 'Tottenham Hotspur' },
  { name: 'Maxence Lacroix', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Johan Manzambi', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Andrey Santos', to: 'Manchester United', db: 'Manchester United' },
  { name: 'Marco Palestra', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Luka Vuskovic', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Geovany Quenda', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Christos Tzolis', to: 'Arsenal', db: 'Arsenal FC' },
  // Round 393 additions, Premier League. Semenyo (ESPN and Sky, 2026-01-09)
  // and Guehi (ESPN and Sky, 2026-01-19) are January moves the snapshot
  // predates; the rest are this summer: Barcola (ESPN, Sky, The Athletic,
  // 2026-08-31), Marmoush on a season long loan (ESPN and BBC, 2026-08-27),
  // Woltemade on loan (BBC and Yahoo, 2026-09-01), Reijnders (ESPN and The
  // Athletic, 2026-08-19).
  { name: 'Antoine Semenyo', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Marc Guéhi', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Bradley Barcola', to: 'Liverpool', db: 'Liverpool FC' },
  { name: 'Omar Marmoush', to: 'Tottenham', db: 'Tottenham Hotspur', loan: true },
  { name: 'Nick Woltemade', to: 'Juventus', db: 'Juventus FC', loan: true },
  { name: 'Tijjani Reijnders', to: 'Al-Qadsiah', db: 'Al-Qadsiah FC' },
  // La Liga
  { name: 'Yan Diomande', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Marc Cucurella', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Bernardo Silva', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Denzel Dumfries', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Karim Adeyemi', to: 'Barcelona', db: 'FC Barcelona' },
  // Round 393: Rodri, ESPN and Al Jazeera, 2026-08-18.
  { name: 'Rodri', to: 'Barcelona', db: 'FC Barcelona' },
  // Serie A
  { name: 'Gonçalo Ramos', to: 'AC Milan', db: 'AC Milan' },
  // Round 393: Leao to Galatasaray, AP News and ESPN, 2026-08-30.
  { name: 'Rafael Leão', to: 'Galatasaray', db: 'Galatasaray' },
  // Bundesliga
  { name: 'Ismael Saibari', to: 'Bayern Munich', db: 'Bayern Munich' },
  { name: 'Nathaniel Brown', to: 'Bayern Munich', db: 'Bayern Munich' },
  // Eredivisie. ter Stegen's 2026 row sits at Girona (a January loan); the
  // Ajax loan from Barcelona is the current one (ESPN, 2026-08-04).
  { name: 'Marc-André ter Stegen', to: 'Ajax', db: 'Ajax Amsterdam', loan: true },
  { name: 'Julian Brandt', to: 'Ajax', db: 'Ajax Amsterdam' },
  // Saudi Pro League
  { name: 'Francisco Trincão', to: 'Al-Ahli', db: 'Al-Ahli SFC' },
  // Spertsyan's dataset rows sit at FC Krasnodar, which we do not model.
  { name: 'Eduard Spertsyan', to: 'Al-Ahli', db: 'Al-Ahli SFC', add: { p: 'Attacking Midfield', a: 25, usd: 27000000 } },
  { name: 'Jan-Carlo Simić', to: 'Al-Ittihad', db: 'Al-Ittihad Club' },
  { name: 'Malang Sarr', to: 'NEOM SC', db: 'NEOM SC' },
  // Round 393: El Karouani's Al-Qadsiah contract was terminated and he
  // joined Benfica on a free (Goal.com and Yahoo Sports, 2026-09-01), so the
  // 2026-08-13 entry is superseded.
  { name: 'Souffian El Karouani', to: 'Benfica', db: 'SL Benfica' },
  { name: 'Angelo Fulgini', to: 'Al-Khaleej', db: 'Al-Khaleej FC' },
  // Diallo's 2026 row is at Umm Salal (unmodeled), so he is added outright.
  { name: 'Abdou Diallo', to: 'Abha', db: 'Abha Club', add: { p: 'Centre-Back', a: 30, usd: 5000000 } },
  // MLS
  { name: 'Robert Lewandowski', to: 'Chicago Fire', db: 'Chicago Fire FC' },
  { name: 'Antoine Griezmann', to: 'Orlando City', db: 'Orlando City SC' },
  { name: 'Allan Saint-Maximin', to: 'Charlotte FC', db: 'Charlotte FC' },
  { name: 'Brais Méndez', to: 'Columbus Crew', db: 'Columbus Crew' },
  // Left the modeled world
  { name: 'Gabriel Pec', to: null, note: 'Cruzeiro', db: 'Cruzeiro Esporte Clube' },
];
