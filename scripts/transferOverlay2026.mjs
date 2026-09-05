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
 *
 * The Round 450 pass (2026-09-05), after four player reports between
 * 2026-08-30 and 2026-09-04 said Player Bingo's transfers were stale: the
 * COMPLETED summer 2026 moves (the window shut 2026-09-01 in England, Spain
 * and Italy, 2026-08-31 in Germany and France) for the players the games
 * draw, worked through the 467 player pool Sign the Player and Player Bingo
 * share and then the rest of the Premier League's ins and outs. Two named
 * sources per entry: every Premier League move is on BOTH ESPN's club by
 * club list (updated 2026-09-04) and Sky Sports' club by club list (updated
 * 2026-09-03) unless its line says otherwise; the rest cite the official club
 * or league site plus ESPN, AP or Sky on their block. A loan that ended with
 * the parent club keeping the player (Endrick, Rashford, Vitor Reis, Pavard,
 * Boniface, Ferguson, Douglas Luiz, Nico Gonzalez) is written as the parent
 * club and was checked against ESPN's 2026-27 squad page for that club.
 * Konate, Bouaddi, Araujo and Romero, held back on 2026-08-13, completed and
 * are in now. Left out as unverified on 2026-09-05: Jadon Sancho (a Palmeiras
 * deal was reported, never announced), Joel Veltman (West Ham per Sky,
 * released per ESPN), Reiss Nelson and Stefan Ortega (the outlets disagree),
 * Thiago Almada, Clement Lenglet, Fran Garcia and Dani Ceballos (one source
 * each). Julian Alvarez and Cody Gakpo did not move; both sagas ended with
 * the player staying, so their rows are right as they stand.
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

  /* ------------------------------------------------------------------ */
  /* Round 450 (2026-09-05): the rest of the summer 2026 window.        */
  /* ------------------------------------------------------------------ */

  // Manchester City. In: Fernandez (2026-09-01, the joint British record),
  // Ndiaye (2026-09-01), Bouaddi (2026-08-26), Rulli. Vitor Reis came back
  // from Girona when the loan ended and stayed: ESPN's City squad page lists
  // him and mancity.com carries Maresca on him. Out: Stones and Spence to
  // Inter (ESPN's Inter squad page lists both), Ake, Trafford, Savio
  // (2026-08-25). Monga, Detourbet (Sky and NBC Sports; ESPN's list omits
  // him), Echeverri and Mukasa were signed or kept and loaned straight out,
  // so they sit at the loan club.
  { name: 'Enzo Fernández', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Iliman Ndiaye', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Ayyoub Bouaddi', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Gerónimo Rulli', to: 'Manchester City', db: 'Manchester City' },
  { name: 'Vitor Reis', to: 'Manchester City', db: 'Manchester City' },
  { name: 'John Stones', to: 'Inter Milan', db: 'Inter Milan' },
  { name: 'Nathan Aké', to: 'Fenerbahçe', db: 'Fenerbahce' },
  { name: 'James Trafford', to: 'Leeds United', db: 'Leeds United' },
  { name: 'Savinho', to: 'Tottenham', db: 'Tottenham Hotspur' },
  { name: 'Jeremy Monga', to: 'Swansea City', db: 'Swansea City', loan: true },
  { name: 'Mathys Detourbet', to: 'Monaco', db: 'AS Monaco', loan: true },
  { name: 'Claudio Echeverri', to: 'Benfica', db: 'SL Benfica', loan: true },
  { name: 'Divine Mukasa', to: 'West Ham', db: 'West Ham United', loan: true },
  // Tottenham. In: Robertson, Senesi, Adarabioyo (2026-09-01). Out: Romero
  // to Atletico (2026-08-15, also atleticodemadrid.com), Spence to Inter,
  // Vicario and Pape Matar Sarr on loan to Juventus (ESPN's Juventus squad
  // page lists both), Danso to Sunderland, Dragusin to Fiorentina. Kolo
  // Muani's loan ended and PSG sold him to Juventus outright (psg.fr,
  // 2026-08-02; ESPN grading list), so his Tottenham row moves to Turin.
  { name: 'Cristian Romero', to: 'Atlético Madrid', db: 'Atlético de Madrid' },
  { name: 'Djed Spence', to: 'Inter Milan', db: 'Inter Milan' },
  { name: 'Guglielmo Vicario', to: 'Juventus', db: 'Juventus FC', loan: true },
  { name: 'Pape Matar Sarr', to: 'Juventus', db: 'Juventus FC', loan: true },
  { name: 'Randal Kolo Muani', to: 'Juventus', db: 'Juventus FC' },
  { name: 'Kevin Danso', to: 'Sunderland', db: 'Sunderland AFC', loan: true },
  { name: 'Radu Drăgușin', to: 'Fiorentina', db: 'ACF Fiorentina', loan: true },
  { name: 'Andrew Robertson', to: 'Tottenham', db: 'Tottenham Hotspur' },
  { name: 'Marcos Senesi', to: 'Tottenham', db: 'Tottenham Hotspur' },
  { name: 'Tosin Adarabioyo', to: 'Tottenham', db: 'Tottenham Hotspur' },
  // Liverpool. In: Munoz, Araujo on loan (2026-08-10). Out: Konate to Real
  // Madrid on a free (ESPN's Real Madrid squad page lists him), Curtis Jones
  // to Inter (2026-08-21), Salah to Trabzonspor (2026-08-06), Elliott on loan
  // to Valencia from his Villa loan (2026-09-01).
  { name: 'Ibrahima Konaté', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Curtis Jones', to: 'Inter Milan', db: 'Inter Milan' },
  { name: 'Mohamed Salah', to: 'Trabzonspor', db: 'Trabzonspor' },
  { name: 'Harvey Elliott', to: 'Valencia', db: 'Valencia CF', loan: true },
  { name: 'Ronald Araujo', to: 'Liverpool', db: 'Liverpool FC', loan: true },
  { name: 'Víctor Muñoz', to: 'Liverpool', db: 'Liverpool FC' },
  // Arsenal. In: Konsa (2026-08-21), Meslier. Out: Martinelli to Al-Hilal
  // (arsenal.com "Gabriel Martinelli joins Al-Hilal", 2026-09-02, and Sky's
  // list at 60m; the Saudi window was still open), Jesus to Barcelona
  // (2026-09-01), Trossard to Besiktas, Nwaneri on loan to Dortmund (also
  // bundesliga.com's transfer centre).
  { name: 'Gabriel Martinelli', to: 'Al-Hilal', db: 'Al-Hilal SFC' },
  { name: 'Gabriel Jesus', to: 'Barcelona', db: 'FC Barcelona' },
  { name: 'Ezri Konsa', to: 'Arsenal', db: 'Arsenal FC' },
  { name: 'Illan Meslier', to: 'Arsenal', db: 'Arsenal FC' },
  { name: 'Leandro Trossard', to: 'Beşiktaş', db: 'Besiktas JK' },
  { name: 'Ethan Nwaneri', to: 'Borussia Dortmund', db: 'Borussia Dortmund', loan: true },
  // Aston Villa. In: Garnacho on loan (2026-07-23), Jackson (2026-08-28),
  // Mbaye and Harwood-Bellis (2026-09-01), Suzuki (2026-08-19), Ruggeri,
  // Goretzka on a free (2026-08-27, also bundesliga.com), Wan-Bissaka on
  // loan. Out: Tielemans (2026-07-14), Watkins to Al-Hilal (2026-08-30),
  // Bailey to Olympiacos (Sky and NBC Sports; ESPN's list omits him),
  // Guessand on loan to Palace, Digne to PSG (2026-08-08), Martinez to
  // Chelsea (2026-08-30).
  { name: 'Alejandro Garnacho', to: 'Aston Villa', db: 'Aston Villa', loan: true },
  { name: 'Nicolas Jackson', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Youri Tielemans', to: 'Manchester United', db: 'Manchester United' },
  { name: 'Ollie Watkins', to: 'Al-Hilal', db: 'Al-Hilal SFC' },
  { name: 'Leon Bailey', to: 'Olympiacos', db: 'Olympiacos Piraeus' },
  { name: 'Evann Guessand', to: 'Crystal Palace', db: 'Crystal Palace', loan: true },
  { name: 'Ibrahim Mbaye', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Zion Suzuki', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Matteo Ruggeri', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Taylor Harwood-Bellis', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Leon Goretzka', to: 'Aston Villa', db: 'Aston Villa' },
  { name: 'Aaron Wan-Bissaka', to: 'Aston Villa', db: 'Aston Villa', loan: true },
  { name: 'Lucas Digne', to: 'PSG', db: 'Paris Saint-Germain' },
  { name: 'Emiliano Martínez', to: 'Chelsea', db: 'Chelsea FC' },
  // Chelsea. Out: Chalobah to Como (2026-08-09), Delap to Forest
  // (2026-08-27), Badiashile on loan to Napoli, Disasi on loan to Palace,
  // Guiu to Leipzig (also bundesliga.com), Sanchez on loan to Como. In:
  // Barco, Chavarria (2026-08-12), Emegha, Welbeck (2026-08-01). Ahanor was
  // bought from Atalanta and loaned to Palace at once, so he sits at Palace.
  { name: 'Trevoh Chalobah', to: 'Como', db: 'Como 1907' },
  { name: 'Liam Delap', to: 'Nottingham Forest', db: 'Nottingham Forest' },
  { name: 'Benoît Badiashile', to: 'Napoli', db: 'SSC Napoli', loan: true },
  { name: 'Axel Disasi', to: 'Crystal Palace', db: 'Crystal Palace', loan: true },
  { name: 'Marc Guiu', to: 'RB Leipzig', db: 'RB Leipzig' },
  { name: 'Robert Sánchez', to: 'Como', db: 'Como 1907', loan: true },
  { name: 'Valentín Barco', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Pep Chavarría', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Emmanuel Emegha', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Danny Welbeck', to: 'Chelsea', db: 'Chelsea FC' },
  { name: 'Honest Ahanor', to: 'Crystal Palace', db: 'Crystal Palace', loan: true },
  // Everton and Crystal Palace. Johnson and McNeil swapped; Beto to
  // Fiorentina (2026-09-01, ESPN's Fiorentina squad page lists him),
  // Patterson to Torino, Iroegbunam to Hull. Palace's ins: Timber
  // (2026-09-01), Tomiyasu, Mingueza, Chilwell (2026-09-01), Khalaili, Gozo,
  // Osorio on loan (2026-09-01). Out: Munoz to Forest.
  { name: 'Brennan Johnson', to: 'Everton', db: 'Everton FC' },
  { name: 'Dwight McNeil', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Beto', to: 'Fiorentina', db: 'ACF Fiorentina' },
  { name: 'Nathan Patterson', to: 'Torino', db: 'Torino FC' },
  { name: 'Tim Iroegbunam', to: 'Hull City', db: 'Hull City' },
  { name: 'Quinten Timber', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Takehiro Tomiyasu', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Óscar Mingueza', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Ben Chilwell', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Anan Khalaili', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Zavier Gozo', to: 'Crystal Palace', db: 'Crystal Palace' },
  { name: 'Darío Osorio', to: 'Crystal Palace', db: 'Crystal Palace', loan: true },
  { name: 'Daniel Muñoz', to: 'Nottingham Forest', db: 'Nottingham Forest' },
  // Nottingham Forest. In: Diomande, Schlager on a free (also
  // bundesliga.com). Out: Hutchinson on loan to Milan, Bakwa on loan to
  // Lille, Awoniyi to Coventry, Morato on loan to West Ham.
  { name: 'Ousmane Diomande', to: 'Nottingham Forest', db: 'Nottingham Forest' },
  { name: 'Xaver Schlager', to: 'Nottingham Forest', db: 'Nottingham Forest' },
  { name: 'Omari Hutchinson', to: 'AC Milan', db: 'AC Milan', loan: true },
  { name: 'Dilane Bakwa', to: 'Lille', db: 'LOSC Lille', loan: true },
  { name: 'Taiwo Awoniyi', to: 'Coventry City', db: 'Coventry City' },
  { name: 'Morato', to: 'West Ham', db: 'West Ham United', loan: true },
  // Newcastle. In: Toure, Fernandez-Pardo (2026-09-01), Steur, Hornicek,
  // Dedic, Jaouen. Out: Trippier to Wolves on a free.
  { name: 'Bazoumana Touré', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Matias Fernandez-Pardo', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Sean Steur', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Lukas Hornicek', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Amar Dedić', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Ewen Jaouen', to: 'Newcastle', db: 'Newcastle United' },
  { name: 'Kieran Trippier', to: 'Wolves', db: 'Wolverhampton Wanderers' },
  // Fulham. In: Larsson (ESPN says a loan with an obligation and Frankfurt's
  // side on bundesliga.com says a loan, Sky says permanent at 21m; he plays
  // for Fulham either way), Gonzalo Garcia, Palacios and Angel from Real
  // Madrid, Affengruber (2026-09-01). Out: Wilson to Leeds, Jimenez to
  // Wolves, Lukic and Diop to Ipswich.
  { name: 'Hugo Larsson', to: 'Fulham', db: 'Fulham FC', loan: true },
  { name: 'Gonzalo García', to: 'Fulham', db: 'Fulham FC' },
  { name: 'César Palacios', to: 'Fulham', db: 'Fulham FC' },
  { name: 'David Affengruber', to: 'Fulham', db: 'Fulham FC' },
  { name: 'Harry Wilson', to: 'Leeds United', db: 'Leeds United' },
  { name: 'Raúl Jiménez', to: 'Wolves', db: 'Wolverhampton Wanderers' },
  { name: 'Saša Lukić', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Issa Diop', to: 'Ipswich Town', db: 'Ipswich Town' },
  // Ipswich's other ins: Palacios (also bundesliga.com), Fatawu, Emersonn,
  // Maeda, Scherpen, Flemming (2026-09-01).
  { name: 'Exequiel Palacios', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Abdul Fatawu', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Emersonn', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Daizen Maeda', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Kjell Scherpen', to: 'Ipswich Town', db: 'Ipswich Town' },
  { name: 'Zian Flemming', to: 'Ipswich Town', db: 'Ipswich Town' },
  // Sunderland. In: Fofana (2026-09-01), Meunier, Methalie. Out: Adingra on
  // loan to Ajax, Mayenda to Rennes, Neil to Rangers (those three are on Sky
  // and NBC Sports; ESPN's list omits them).
  { name: 'Malick Fofana', to: 'Sunderland', db: 'Sunderland AFC' },
  { name: 'Thomas Meunier', to: 'Sunderland', db: 'Sunderland AFC' },
  { name: 'Dayann Methalie', to: 'Sunderland', db: 'Sunderland AFC' },
  { name: 'Simon Adingra', to: 'Ajax', db: 'Ajax Amsterdam', loan: true },
  { name: 'Eliezer Mayenda', to: 'Rennes', db: 'Stade Rennais FC' },
  { name: 'Dan Neil', to: 'Rangers', db: 'Rangers FC' },
  // Brentford. In: Sangare, Diouf, Anthony, Callum Wilson.
  { name: 'Mamadou Sangaré', to: 'Brentford', db: 'Brentford FC' },
  { name: 'El Hadji Malick Diouf', to: 'Brentford', db: 'Brentford FC' },
  { name: 'Jaidon Anthony', to: 'Brentford', db: 'Brentford FC' },
  { name: 'Callum Wilson', to: 'Brentford', db: 'Brentford FC' },
  // Brighton. In: Struijk, Costinha, Hadjam, Azeez (Sky's list and ESPN's
  // Brighton squad page). Ferguson's Roma loan ended without the option and
  // he is on ESPN's Brighton squad page; a Genoa loan was agreed in
  // principle on deadline day and never announced. Out: Gruda's Leipzig loan
  // extended (also bundesliga.com), Igor Julio to Burnley.
  { name: 'Pascal Struijk', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Costinha', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Jaouen Hadjam', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Femi Azeez', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Evan Ferguson', to: 'Brighton', db: 'Brighton & Hove Albion' },
  { name: 'Brajan Gruda', to: 'RB Leipzig', db: 'RB Leipzig', loan: true },
  { name: 'Igor Julio', to: 'Burnley', db: 'Burnley FC' },
  // Bournemouth. In: Antonio Silva, Juanlu, Alvaro Rodriguez, Di Gregorio on
  // loan. Out: Alex Jimenez on loan to Fiorentina, Unal to Getafe.
  { name: 'António Silva', to: 'Bournemouth', db: 'AFC Bournemouth' },
  { name: 'Juanlu Sánchez', to: 'Bournemouth', db: 'AFC Bournemouth' },
  { name: 'Álvaro Rodríguez', to: 'Bournemouth', db: 'AFC Bournemouth' },
  { name: 'Michele Di Gregorio', to: 'Bournemouth', db: 'AFC Bournemouth', loan: true },
  { name: 'Álex Jiménez', to: 'Fiorentina', db: 'ACF Fiorentina', loan: true },
  { name: 'Enes Ünal', to: 'Getafe', db: 'Getafe CF' },
  // West Ham's ins: Piroe on loan, Solomon, Morato (above). Leeds. In:
  // Trafford (above), Wilson (above), Zetterer, Elvedi (also bundesliga.com),
  // Muharemovic, Bahoya and Bard on loan. Out: Bornauw on loan to Hamburg,
  // Perri on loan to Torino, Gnonto on loan to Fiorentina, Buonanotte on
  // loan to Elche, Ramazani to Burnley, Harrison to New England.
  { name: 'Joël Piroe', to: 'West Ham', db: 'West Ham United', loan: true },
  { name: 'Manor Solomon', to: 'West Ham', db: 'West Ham United' },
  { name: 'Michael Zetterer', to: 'Leeds United', db: 'Leeds United' },
  { name: 'Nico Elvedi', to: 'Leeds United', db: 'Leeds United' },
  { name: 'Tarik Muharemović', to: 'Leeds United', db: 'Leeds United' },
  { name: 'Jean-Mattéo Bahoya', to: 'Leeds United', db: 'Leeds United', loan: true },
  { name: 'Melvin Bard', to: 'Leeds United', db: 'Leeds United', loan: true },
  { name: 'Sebastiaan Bornauw', to: 'Hamburg', db: 'Hamburger SV', loan: true },
  { name: 'Lucas Perri', to: 'Torino', db: 'Torino FC', loan: true },
  { name: 'Wilfried Gnonto', to: 'Fiorentina', db: 'ACF Fiorentina', loan: true },
  { name: 'Facundo Buonanotte', to: 'Elche', db: 'Elche CF', loan: true },
  { name: 'Largie Ramazani', to: 'Burnley', db: 'Burnley FC' },
  { name: 'Jack Harrison', to: 'New England Revolution', db: 'New England Revolution' },
  // Manchester United. Rashford's Barcelona loan ended without the option
  // (ESPN, 2026-06) and he is on ESPN's United squad page after the window.
  // Out: Bayindir on loan to Celta.
  { name: 'Marcus Rashford', to: 'Manchester United', db: 'Manchester United' },
  { name: 'Altay Bayındır', to: 'Celta Vigo', db: 'Celta de Vigo', loan: true },
  // Hull, Middlesbrough, Coventry and the loans out of England. Hull's ins:
  // Cho, Ansah (also bundesliga.com), Tzolakis, Mendy, Morita, Butland,
  // Targett; out: Pandur to Rangers. Middlesbrough: Vitek, Lankshear,
  // Phillips. Coventry: Yirenkyi, Amenda (also bundesliga.com), Hamer.
  // Takai, Yang and Moore are Tottenham and Rangers loans. Veliz went to
  // Bahia, a club the engine does not model. Carmo and Jota Silva to
  // Olympiacos are on Sky and NBC Sports; ESPN's list omits them.
  { name: 'Mohamed-Ali Cho', to: 'Hull City', db: 'Hull City' },
  { name: 'Ilyas Ansah', to: 'Hull City', db: 'Hull City' },
  { name: 'Konstantinos Tzolakis', to: 'Hull City', db: 'Hull City' },
  { name: 'Nobel Mendy', to: 'Hull City', db: 'Hull City' },
  { name: 'Hidemasa Morita', to: 'Hull City', db: 'Hull City' },
  { name: 'Jack Butland', to: 'Hull City', db: 'Hull City' },
  { name: 'Matt Targett', to: 'Hull City', db: 'Hull City' },
  { name: 'Ivor Pandur', to: 'Rangers', db: 'Rangers FC' },
  { name: 'Radek Vítek', to: 'Middlesbrough', db: 'Middlesbrough FC' },
  { name: 'Will Lankshear', to: 'Middlesbrough', db: 'Middlesbrough FC' },
  { name: 'Ashley Phillips', to: 'Middlesbrough', db: 'Middlesbrough FC' },
  { name: 'Caleb Yirenkyi', to: 'Coventry City', db: 'Coventry City' },
  { name: 'Aurèle Amenda', to: 'Coventry City', db: 'Coventry City' },
  { name: 'Gustavo Hamer', to: 'Coventry City', db: 'Coventry City' },
  { name: 'Kota Takai', to: 'Sint-Truiden', db: 'Sint-Truidense VV', loan: true },
  { name: 'Min-hyeok Yang', to: 'Westerlo', db: 'KVC Westerlo', loan: true },
  { name: 'Mikey Moore', to: 'Köln', db: '1.FC Köln', loan: true },
  { name: 'Alejo Veliz', to: null, note: 'Bahia', db: 'Esporte Clube Bahia' },
  { name: 'David Carmo', to: 'Olympiacos', db: 'Olympiacos Piraeus' },
  { name: 'Jota Silva', to: 'Olympiacos', db: 'Olympiacos Piraeus', loan: true },
  // La Liga. Atletico: Lee Kang-in (psg.fr and Al Jazeera, 2026-07-25),
  // Grimaldo (atleticodemadrid.com and ESPN, 2026-06-30), David on loan from
  // Juventus (juventus.com, atleticodemadrid.com and ESPN, 2026-09-01);
  // Molina to Roma (asroma.com and atleticodemadrid.com, 2026-08-10). Real
  // Madrid: Endrick's Lyon loan ended with no option and he is on ESPN's
  // Real Madrid squad page (the Lyon and Madrid sides both said so in May);
  // Mastantuono on loan to Fiorentina (realmadrid.com and ESPN,
  // 2026-08-05). Barcelona sold Ferran Torres to PSG (psg.fr and ESPN,
  // 2026-08-15).
  { name: 'Kang-in Lee', to: 'Atlético Madrid', db: 'Atlético de Madrid' },
  { name: 'Alejandro Grimaldo', to: 'Atlético Madrid', db: 'Atlético de Madrid' },
  { name: 'Jonathan David', to: 'Atlético Madrid', db: 'Atlético de Madrid', loan: true },
  { name: 'Nahuel Molina', to: 'Roma', db: 'AS Roma' },
  { name: 'Endrick', to: 'Real Madrid', db: 'Real Madrid' },
  { name: 'Franco Mastantuono', to: 'Fiorentina', db: 'ACF Fiorentina', loan: true },
  { name: 'Ferran Torres', to: 'PSG', db: 'Paris Saint-Germain' },
  // Serie A. Milan: Gila in (acmilan.com and sslazio.it, 2026-07-10), Moreira
  // in (acmilan.com, 2026-08-19, and ESPN's grading list), Nkunku on loan to
  // Leipzig (acmilan.com and bundesliga.com, 2026-08-25), Gimenez on loan to
  // Porto (acmilan.com and ESPN, 2026-08-31). Juventus: Vlahovic left on a
  // free for Besiktas (ESPN's grading list, AFP, 2026-08-14), Openda on loan
  // to Lyon (juventus.com, 2026-07-28, and ESPN's Lyon squad page), Douglas
  // Luiz back from the Villa loan Sky and juventus.com reported in January
  // and on ESPN's Juventus squad page, Nico Gonzalez back from Atletico
  // because the obligation was never triggered (Goal, Football Italia, and
  // ESPN's Juventus squad page). Inter: Frattesi on loan to Lazio (inter.it,
  // 2026-08-14, and ESPN's Lazio squad page), Pavard back from Marseille
  // (AFP via France 24 in May, and ESPN's Inter squad page). Roma: Castro
  // in (asroma.com and AP, 2026-07-30), Dovbyk on loan to Bologna (asroma.com
  // and ESPN's Bologna squad page), El Aynaoui on loan to Leipzig (asroma.com
  // and bundesliga.com, 2026-09-01), Mora in (asroma.com and AP, 2026-08-19).
  // Napoli sold Lukaku to Fenerbahce (ESPN and the club, 2026-08-12).
  // Fiorentina: Kean to Como on a loan with an obligation (comofootball.com
  // and ESPN, 2026-09-01), Pedro Goncalves in on loan (acffiorentina.com and
  // ESPN's Fiorentina squad page, 2026-09-01).
  { name: 'Mario Gila', to: 'AC Milan', db: 'AC Milan' },
  { name: 'Diego Moreira', to: 'AC Milan', db: 'AC Milan' },
  { name: 'Christopher Nkunku', to: 'RB Leipzig', db: 'RB Leipzig', loan: true },
  { name: 'Santiago Gimenez', to: 'Porto', db: 'FC Porto', loan: true },
  { name: 'Dušan Vlahović', to: 'Beşiktaş', db: 'Besiktas JK' },
  { name: 'Loïs Openda', to: 'Lyon', db: 'Olympique Lyon', loan: true },
  { name: 'Douglas Luiz', to: 'Juventus', db: 'Juventus FC' },
  { name: 'Nico González', to: 'Juventus', db: 'Juventus FC' },
  { name: 'Davide Frattesi', to: 'Lazio', db: 'SS Lazio', loan: true },
  { name: 'Benjamin Pavard', to: 'Inter Milan', db: 'Inter Milan' },
  { name: 'Santiago Castro', to: 'Roma', db: 'AS Roma' },
  { name: 'Artem Dovbyk', to: 'Bologna', db: 'Bologna FC 1909', loan: true },
  { name: 'Neil El Aynaoui', to: 'RB Leipzig', db: 'RB Leipzig', loan: true },
  { name: 'Rodrigo Mora', to: 'Roma', db: 'AS Roma' },
  { name: 'Romelu Lukaku', to: 'Fenerbahçe', db: 'Fenerbahce' },
  { name: 'Moise Kean', to: 'Como', db: 'Como 1907', loan: true },
  { name: 'Pedro Gonçalves', to: 'Fiorentina', db: 'ACF Fiorentina', loan: true },
  // Bundesliga. Dortmund: Karetsas (bundesliga.com and AP, 2026-08-03),
  // Konstantelias (bvb.de and bundesliga.com, 2026-08-17), Veerman
  // (bundesliga.com, 2026-08-18, and ESPN's match sheets); Duranville sold
  // to Lyon (bundesliga.com and ESPN's Lyon squad page). Leverkusen: Diaby
  // back from Al-Ittihad (bundesliga.com, 2026-09-01, and ESPN's Leverkusen
  // squad page), Doue and Medina in (bundesliga.com and the same squad
  // page), Boniface back from his Bremen loan and kept (bayer04.de and the
  // same squad page). Leipzig loaned Geertruida to PSV (psv.nl and
  // bundesliga.com). Gladbach sold Reyna to Strasbourg (bundesliga.com and
  // ESPN's grading list, 2026-08-04).
  { name: 'Konstantinos Karetsas', to: 'Borussia Dortmund', db: 'Borussia Dortmund' },
  { name: 'Giannis Konstantelias', to: 'Borussia Dortmund', db: 'Borussia Dortmund' },
  { name: 'Joey Veerman', to: 'Borussia Dortmund', db: 'Borussia Dortmund' },
  { name: 'Julien Duranville', to: 'Lyon', db: 'Olympique Lyon' },
  { name: 'Moussa Diaby', to: 'Bayer Leverkusen', db: 'Bayer 04 Leverkusen' },
  { name: 'Guéla Doué', to: 'Bayer Leverkusen', db: 'Bayer 04 Leverkusen' },
  { name: 'Facundo Medina', to: 'Bayer Leverkusen', db: 'Bayer 04 Leverkusen' },
  { name: 'Victor Boniface', to: 'Bayer Leverkusen', db: 'Bayer 04 Leverkusen' },
  { name: 'Lutsharel Geertruida', to: 'PSV', db: 'PSV Eindhoven', loan: true },
  { name: 'Giovanni Reyna', to: 'Strasbourg', db: 'RC Strasbourg Alsace' },
  // Ligue 1. Marseille sold Greenwood to Fenerbahce (ESPN, 2026-07-16, and
  // Sky's player profile). PSG: Akliouche from Monaco (psg.fr, ESPN and Sky,
  // 2026-08-06), Godts from Ajax (psg.fr and AP, 2026-08-16).
  { name: 'Mason Greenwood', to: 'Fenerbahçe', db: 'Fenerbahce' },
  { name: 'Maghnes Akliouche', to: 'PSG', db: 'Paris Saint-Germain' },
  { name: 'Mika Godts', to: 'PSG', db: 'Paris Saint-Germain' },
];
