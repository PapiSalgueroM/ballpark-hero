-- Round 707 (2026-09-30): the verified 2026 moves reach soccer_player_club_stints.
--
-- UNAPPLIED. Written for review; the release manager applies it. The three
-- Round 707 files touch different rows and can go in any order:
--   20260930170000_round_707_overlay_stints.sql    (this file) 240 inserts
--   20260930170100_round_707_stint_duplicates.sql  1,465 exact copies deleted
--   20260930170200_round_707_stint_person_keys.sql person_key follows the market rows
-- Run the whole file through the Supabase MCP (apply_migration or execute_sql).
-- Before, scripts/simSoccerStints.mjs section 1 reports "would insert 240", the
-- expected_missing below; afterwards it reports "would insert 0". Any other
-- number is the table having moved, and the file refuses on its own count too.
--
-- WHY. soccer_player_club_stints was derived from the market value years before
-- the Round 393 and Round 450 migrations wrote the verified 2026 window into the
-- 2026 market rows, so the stints never learned those moves. Soccer Grid's
-- records pass reads this table, and when a player's career looks complete it
-- answers a club it cannot find with a hard, CACHED no. The cache held exactly
-- that on 2026-09-30: "Mohamed Salah does not satisfy Played for Trabzonspor"
-- (2026-09-29), the same for Sandro Tonali at Tottenham and Diego Moreira at
-- AC Milan. Soccer Connect 4 only confirms from this table, so there the move
-- fell through to the model, whose knowledge predates the window.
--
-- MEASURED 2026-09-30, read only SELECTs:
--   5,496 (player, club) pairs in the 2026 market rows; 307 have no stint at
--   that club, and every one of those players has stints at other clubs.
--   The 241 entries of scripts/transferOverlay2026.mjs:
--     221 have no stint at their new club at all (Salah at Trabzonspor,
--         Goretzka at Aston Villa, Anthony Gordon at Barcelona, Bruno
--         Guimaraes at Arsenal, Morgan Rogers at Chelsea, ...)
--      18 have a stint there from an earlier spell that stops before 2026
--         (Lucas Digne at PSG to 2015, Rashford at United to 2024, Nkunku at
--         Leipzig to 2023; Rodri's only FC Barcelona row is a different man's
--         2006 season, a namesake merge this file does not touch)
--       1 is already covered (Jan-Carlo Simic at Al-Ittihad)
--       1 has no 2026 market row (Griezmann, Orlando City); the move is still
--         two source verified, so his stint takes his latest stint's
--         nationality and position
--   So this inserts 240 rows. The other 86 of the 307 pairs are outside the
--   overlay and are NOT inserted here. 12 say "Without Club", which is not a
--   club. 64 of the remaining 74 are exactly the clubs the 2026-08-29 stale
--   sweep wrote (scripts/data/staleSweep2026.json, Casemiro at Inter Miami,
--   Xhaka at Sunderland, ...), whose record cites Wikipedia plus Transfermarkt
--   rather than the overlay's two news sources; they are listed for a follow
--   up, not written on this round's say so.
--
-- OUT OF SCOPE, SO NOBODY READS "ACCEPTS THE 2026 MOVES" AS "EVERY MOVE IS
-- RIGHT": a gap in the market rows BEFORE 2026 stays a gap. Sandro Tonali's
-- market rows run Brescia 2018 to 2020, AC Milan 2021 to 2022, then Tottenham
-- 2026, with no 2023 to 2025 row, so his Newcastle years are in neither table.
-- This file gives him Tottenham 2026; "Played for Newcastle" is still a hard,
-- cached no for him under the deployed and the Round 707 function alike, and it
-- joins the 64 stale sweep pairs above on the follow up list. That list needs a
-- two source record per move, the same as this one.
--
-- SOURCE. Each row is one entry of scripts/transferOverlay2026.mjs. Its header
-- and the comment above each block name the two sources for every move (for
-- Premier League moves both ESPN's and Sky Sports' club by club lists; for the
-- rest the club or league site plus ESPN, AP or Sky). The list below is that
-- file's (name, db) pairs in its own order, and simSoccerStints section 0 fails
-- if the two ever differ.
--
-- WHAT A ROW SAYS.
--   club               the entry's db spelling, which is the spelling the
--                      2026 market row carries
--   first_year, last_year  2026, the year the market table files the move under
--   seasons            1
--   nationality, position  the player's 2026 market row (Griezmann: his latest stint)
--   debut_year, debut_age, name_folded  copied from the player's existing stint
--                      rows; the table carries one value per name for each
--                      (measured: no name has two), so the grid's careerComplete
--                      and the name lookup read exactly what they read before
--   person_key         null, like every row but Luis Suarez's nine
--
-- WHY THE OLD CLUB'S STINT IS NOT CUT BACK. The 2026 market row is the autumn
-- 2025 snapshot season, so Salah really was at Liverpool in the season the table
-- files as 2026; he left in August 2026. Two clubs in one filed year is a shape
-- the table already has (overlapping stints for winter moves, "A / B" split
-- seasons), and cutting Liverpool to 2025 would un-say a true season.
--
-- KEYED AND FAIL CLOSED. A row is inserted only where no stint of that name at
-- that exact club covers 2026, so a second run inserts nothing. Before a single
-- write it checks that the overlay is in the market table (one 2026 row per
-- name, at the verified club), that every name has a stint to copy from, and
-- that exactly the 240 measured moves are missing. Any of those off and it
-- raises and writes nothing: re-measure rather than apply a plan the table has
-- moved away from.
--
-- UNDO. The notice at the end prints the highest id before the insert:
--   delete from public.soccer_player_club_stints
--    where id > <that id> and first_year = 2026 and last_year = 2026
--      and seasons = 1 and person_key is null;

do $migration$
declare
  expected_entries constant integer := 241;
  expected_missing constant integer := 240;
  n integer;
  max_before bigint;
begin
  create temporary table r707_overlay (player_name text primary key, club text not null) on commit drop;
  insert into r707_overlay (player_name, club) values
    ('Morgan Rogers', 'Chelsea FC'),
    ('Elliot Anderson', 'Manchester City'),
    ('Sandro Tonali', 'Tottenham Hotspur'),
    ('Mateus Fernandes', 'Tottenham Hotspur'),
    ('Bruno Guimarães', 'Arsenal FC'),
    ('Anthony Gordon', 'FC Barcelona'),
    ('Crysencio Summerville', 'Al-Hilal SFC'),
    ('Jérémy Jacquet', 'Liverpool FC'),
    ('Jan Paul van Hecke', 'Tottenham Hotspur'),
    ('Maxence Lacroix', 'Chelsea FC'),
    ('Johan Manzambi', 'Aston Villa'),
    ('Andrey Santos', 'Manchester United'),
    ('Marco Palestra', 'Chelsea FC'),
    ('Luka Vuskovic', 'Brighton & Hove Albion'),
    ('Geovany Quenda', 'Chelsea FC'),
    ('Christos Tzolis', 'Arsenal FC'),
    ('Antoine Semenyo', 'Manchester City'),
    ('Marc Guéhi', 'Manchester City'),
    ('Bradley Barcola', 'Liverpool FC'),
    ('Omar Marmoush', 'Tottenham Hotspur'),
    ('Nick Woltemade', 'Juventus FC'),
    ('Tijjani Reijnders', 'Al-Qadsiah FC'),
    ('Yan Diomande', 'Real Madrid'),
    ('Marc Cucurella', 'Real Madrid'),
    ('Bernardo Silva', 'Real Madrid'),
    ('Denzel Dumfries', 'Real Madrid'),
    ('Karim Adeyemi', 'FC Barcelona'),
    ('Rodri', 'FC Barcelona'),
    ('Gonçalo Ramos', 'AC Milan'),
    ('Rafael Leão', 'Galatasaray'),
    ('Ismael Saibari', 'Bayern Munich'),
    ('Nathaniel Brown', 'Bayern Munich'),
    ('Marc-André ter Stegen', 'Ajax Amsterdam'),
    ('Julian Brandt', 'Ajax Amsterdam'),
    ('Francisco Trincão', 'Al-Ahli SFC'),
    ('Eduard Spertsyan', 'Al-Ahli SFC'),
    ('Jan-Carlo Simić', 'Al-Ittihad Club'),
    ('Malang Sarr', 'NEOM SC'),
    ('Souffian El Karouani', 'SL Benfica'),
    ('Angelo Fulgini', 'Al-Khaleej FC'),
    ('Abdou Diallo', 'Abha Club'),
    ('Robert Lewandowski', 'Chicago Fire FC'),
    ('Antoine Griezmann', 'Orlando City SC'),
    ('Allan Saint-Maximin', 'Charlotte FC'),
    ('Brais Méndez', 'Columbus Crew'),
    ('Gabriel Pec', 'Cruzeiro Esporte Clube'),
    ('Enzo Fernández', 'Manchester City'),
    ('Iliman Ndiaye', 'Manchester City'),
    ('Ayyoub Bouaddi', 'Manchester City'),
    ('Gerónimo Rulli', 'Manchester City'),
    ('Vitor Reis', 'Manchester City'),
    ('John Stones', 'Inter Milan'),
    ('Nathan Aké', 'Fenerbahce'),
    ('James Trafford', 'Leeds United'),
    ('Savinho', 'Tottenham Hotspur'),
    ('Jeremy Monga', 'Swansea City'),
    ('Mathys Detourbet', 'AS Monaco'),
    ('Claudio Echeverri', 'SL Benfica'),
    ('Divine Mukasa', 'West Ham United'),
    ('Cristian Romero', 'Atlético de Madrid'),
    ('Djed Spence', 'Inter Milan'),
    ('Guglielmo Vicario', 'Juventus FC'),
    ('Pape Matar Sarr', 'Juventus FC'),
    ('Randal Kolo Muani', 'Juventus FC'),
    ('Kevin Danso', 'Sunderland AFC'),
    ('Radu Drăgușin', 'ACF Fiorentina'),
    ('Andrew Robertson', 'Tottenham Hotspur'),
    ('Marcos Senesi', 'Tottenham Hotspur'),
    ('Tosin Adarabioyo', 'Tottenham Hotspur'),
    ('Ibrahima Konaté', 'Real Madrid'),
    ('Curtis Jones', 'Inter Milan'),
    ('Mohamed Salah', 'Trabzonspor'),
    ('Harvey Elliott', 'Valencia CF'),
    ('Ronald Araujo', 'Liverpool FC'),
    ('Víctor Muñoz', 'Liverpool FC'),
    ('Gabriel Martinelli', 'Al-Hilal SFC'),
    ('Gabriel Jesus', 'FC Barcelona'),
    ('Ezri Konsa', 'Arsenal FC'),
    ('Illan Meslier', 'Arsenal FC'),
    ('Leandro Trossard', 'Besiktas JK'),
    ('Ethan Nwaneri', 'Borussia Dortmund'),
    ('Alejandro Garnacho', 'Aston Villa'),
    ('Nicolas Jackson', 'Aston Villa'),
    ('Youri Tielemans', 'Manchester United'),
    ('Ollie Watkins', 'Al-Hilal SFC'),
    ('Leon Bailey', 'Olympiacos Piraeus'),
    ('Evann Guessand', 'Crystal Palace'),
    ('Ibrahim Mbaye', 'Aston Villa'),
    ('Zion Suzuki', 'Aston Villa'),
    ('Matteo Ruggeri', 'Aston Villa'),
    ('Taylor Harwood-Bellis', 'Aston Villa'),
    ('Leon Goretzka', 'Aston Villa'),
    ('Aaron Wan-Bissaka', 'Aston Villa'),
    ('Lucas Digne', 'Paris Saint-Germain'),
    ('Emiliano Martínez', 'Chelsea FC'),
    ('Trevoh Chalobah', 'Como 1907'),
    ('Liam Delap', 'Nottingham Forest'),
    ('Benoît Badiashile', 'SSC Napoli'),
    ('Axel Disasi', 'Crystal Palace'),
    ('Marc Guiu', 'RB Leipzig'),
    ('Robert Sánchez', 'Como 1907'),
    ('Valentín Barco', 'Chelsea FC'),
    ('Pep Chavarría', 'Chelsea FC'),
    ('Emmanuel Emegha', 'Chelsea FC'),
    ('Danny Welbeck', 'Chelsea FC'),
    ('Honest Ahanor', 'Crystal Palace'),
    ('Brennan Johnson', 'Everton FC'),
    ('Dwight McNeil', 'Crystal Palace'),
    ('Beto', 'ACF Fiorentina'),
    ('Nathan Patterson', 'Torino FC'),
    ('Tim Iroegbunam', 'Hull City'),
    ('Quinten Timber', 'Crystal Palace'),
    ('Takehiro Tomiyasu', 'Crystal Palace'),
    ('Óscar Mingueza', 'Crystal Palace'),
    ('Ben Chilwell', 'Crystal Palace'),
    ('Anan Khalaili', 'Crystal Palace'),
    ('Zavier Gozo', 'Crystal Palace'),
    ('Darío Osorio', 'Crystal Palace'),
    ('Daniel Muñoz', 'Nottingham Forest'),
    ('Ousmane Diomande', 'Nottingham Forest'),
    ('Xaver Schlager', 'Nottingham Forest'),
    ('Omari Hutchinson', 'AC Milan'),
    ('Dilane Bakwa', 'LOSC Lille'),
    ('Taiwo Awoniyi', 'Coventry City'),
    ('Morato', 'West Ham United'),
    ('Bazoumana Touré', 'Newcastle United'),
    ('Matias Fernandez-Pardo', 'Newcastle United'),
    ('Sean Steur', 'Newcastle United'),
    ('Lukas Hornicek', 'Newcastle United'),
    ('Amar Dedić', 'Newcastle United'),
    ('Ewen Jaouen', 'Newcastle United'),
    ('Kieran Trippier', 'Wolverhampton Wanderers'),
    ('Hugo Larsson', 'Fulham FC'),
    ('Gonzalo García', 'Fulham FC'),
    ('César Palacios', 'Fulham FC'),
    ('David Affengruber', 'Fulham FC'),
    ('Harry Wilson', 'Leeds United'),
    ('Raúl Jiménez', 'Wolverhampton Wanderers'),
    ('Saša Lukić', 'Ipswich Town'),
    ('Issa Diop', 'Ipswich Town'),
    ('Exequiel Palacios', 'Ipswich Town'),
    ('Abdul Fatawu', 'Ipswich Town'),
    ('Emersonn', 'Ipswich Town'),
    ('Daizen Maeda', 'Ipswich Town'),
    ('Kjell Scherpen', 'Ipswich Town'),
    ('Zian Flemming', 'Ipswich Town'),
    ('Malick Fofana', 'Sunderland AFC'),
    ('Thomas Meunier', 'Sunderland AFC'),
    ('Dayann Methalie', 'Sunderland AFC'),
    ('Simon Adingra', 'Ajax Amsterdam'),
    ('Eliezer Mayenda', 'Stade Rennais FC'),
    ('Dan Neil', 'Rangers FC'),
    ('Mamadou Sangaré', 'Brentford FC'),
    ('El Hadji Malick Diouf', 'Brentford FC'),
    ('Jaidon Anthony', 'Brentford FC'),
    ('Callum Wilson', 'Brentford FC'),
    ('Pascal Struijk', 'Brighton & Hove Albion'),
    ('Costinha', 'Brighton & Hove Albion'),
    ('Jaouen Hadjam', 'Brighton & Hove Albion'),
    ('Femi Azeez', 'Brighton & Hove Albion'),
    ('Evan Ferguson', 'Brighton & Hove Albion'),
    ('Brajan Gruda', 'RB Leipzig'),
    ('Igor Julio', 'Burnley FC'),
    ('António Silva', 'AFC Bournemouth'),
    ('Juanlu Sánchez', 'AFC Bournemouth'),
    ('Álvaro Rodríguez', 'AFC Bournemouth'),
    ('Michele Di Gregorio', 'AFC Bournemouth'),
    ('Álex Jiménez', 'ACF Fiorentina'),
    ('Enes Ünal', 'Getafe CF'),
    ('Joël Piroe', 'West Ham United'),
    ('Manor Solomon', 'West Ham United'),
    ('Michael Zetterer', 'Leeds United'),
    ('Nico Elvedi', 'Leeds United'),
    ('Tarik Muharemović', 'Leeds United'),
    ('Jean-Mattéo Bahoya', 'Leeds United'),
    ('Melvin Bard', 'Leeds United'),
    ('Sebastiaan Bornauw', 'Hamburger SV'),
    ('Lucas Perri', 'Torino FC'),
    ('Wilfried Gnonto', 'ACF Fiorentina'),
    ('Facundo Buonanotte', 'Elche CF'),
    ('Largie Ramazani', 'Burnley FC'),
    ('Jack Harrison', 'New England Revolution'),
    ('Marcus Rashford', 'Manchester United'),
    ('Altay Bayındır', 'Celta de Vigo'),
    ('Mohamed-Ali Cho', 'Hull City'),
    ('Ilyas Ansah', 'Hull City'),
    ('Konstantinos Tzolakis', 'Hull City'),
    ('Nobel Mendy', 'Hull City'),
    ('Hidemasa Morita', 'Hull City'),
    ('Jack Butland', 'Hull City'),
    ('Matt Targett', 'Hull City'),
    ('Ivor Pandur', 'Rangers FC'),
    ('Radek Vítek', 'Middlesbrough FC'),
    ('Will Lankshear', 'Middlesbrough FC'),
    ('Ashley Phillips', 'Middlesbrough FC'),
    ('Caleb Yirenkyi', 'Coventry City'),
    ('Aurèle Amenda', 'Coventry City'),
    ('Gustavo Hamer', 'Coventry City'),
    ('Kota Takai', 'Sint-Truidense VV'),
    ('Min-hyeok Yang', 'KVC Westerlo'),
    ('Mikey Moore', '1.FC Köln'),
    ('Alejo Veliz', 'Esporte Clube Bahia'),
    ('David Carmo', 'Olympiacos Piraeus'),
    ('Jota Silva', 'Olympiacos Piraeus'),
    ('Kang-in Lee', 'Atlético de Madrid'),
    ('Alejandro Grimaldo', 'Atlético de Madrid'),
    ('Jonathan David', 'Atlético de Madrid'),
    ('Nahuel Molina', 'AS Roma'),
    ('Endrick', 'Real Madrid'),
    ('Franco Mastantuono', 'ACF Fiorentina'),
    ('Ferran Torres', 'Paris Saint-Germain'),
    ('Mario Gila', 'AC Milan'),
    ('Diego Moreira', 'AC Milan'),
    ('Christopher Nkunku', 'RB Leipzig'),
    ('Santiago Gimenez', 'FC Porto'),
    ('Dušan Vlahović', 'Besiktas JK'),
    ('Loïs Openda', 'Olympique Lyon'),
    ('Douglas Luiz', 'Juventus FC'),
    ('Nico González', 'Juventus FC'),
    ('Davide Frattesi', 'SS Lazio'),
    ('Benjamin Pavard', 'Inter Milan'),
    ('Santiago Castro', 'AS Roma'),
    ('Artem Dovbyk', 'Bologna FC 1909'),
    ('Neil El Aynaoui', 'RB Leipzig'),
    ('Rodrigo Mora', 'AS Roma'),
    ('Romelu Lukaku', 'Fenerbahce'),
    ('Moise Kean', 'Como 1907'),
    ('Pedro Gonçalves', 'ACF Fiorentina'),
    ('Konstantinos Karetsas', 'Borussia Dortmund'),
    ('Giannis Konstantelias', 'Borussia Dortmund'),
    ('Joey Veerman', 'Borussia Dortmund'),
    ('Julien Duranville', 'Olympique Lyon'),
    ('Moussa Diaby', 'Bayer 04 Leverkusen'),
    ('Guéla Doué', 'Bayer 04 Leverkusen'),
    ('Facundo Medina', 'Bayer 04 Leverkusen'),
    ('Victor Boniface', 'Bayer 04 Leverkusen'),
    ('Lutsharel Geertruida', 'PSV Eindhoven'),
    ('Giovanni Reyna', 'RC Strasbourg Alsace'),
    ('Mason Greenwood', 'Fenerbahce'),
    ('Maghnes Akliouche', 'Paris Saint-Germain'),
    ('Mika Godts', 'Paris Saint-Germain')
  ;

  select count(*) into n from r707_overlay;
  if n <> expected_entries then
    raise exception 'Round 707: the list holds % entries, expected %. Nothing was changed.', n, expected_entries;
  end if;

  -- The overlay is in the market table: at most one 2026 row per name, and it
  -- says the verified club (Rounds 393 and 450, fenced by simTransferOverlay).
  select count(*) into n
  from r707_overlay o
  where (select count(*) from public.player_market_values m
          where m.year = 2026 and m.player_name = o.player_name) > 1
     or exists (select 1 from public.player_market_values m
                 where m.year = 2026 and m.player_name = o.player_name
                   and m.club is distinct from o.club);
  if n <> 0 then
    raise exception 'Round 707: % entries have no single 2026 market row at their verified club. Nothing was changed.', n;
  end if;

  -- Every name already has a stint to copy its debut and folded name from.
  select count(*) into n
  from r707_overlay o
  where not exists (select 1 from public.soccer_player_club_stints s where s.player_name = o.player_name);
  if n <> 0 then
    raise exception 'Round 707: % entries have no stint row at all to copy from. Nothing was changed.', n;
  end if;

  -- Exactly the measured moves are missing.
  select count(*) into n
  from r707_overlay o
  where not exists (select 1 from public.soccer_player_club_stints s
                     where s.player_name = o.player_name and s.club = o.club
                       and 2026 between s.first_year and s.last_year);
  if n <> expected_missing then
    raise exception 'Round 707: expected % moves without a 2026 stint, found %. The table has moved since 2026-09-30; re-measure first. Nothing was changed.', expected_missing, n;
  end if;

  select max(id) into max_before from public.soccer_player_club_stints;

  insert into public.soccer_player_club_stints
    (player_name, club, first_year, last_year, seasons, nationality, position,
     debut_year, debut_age, person_key, name_folded)
  select o.player_name, o.club, 2026, 2026, 1,
         coalesce(m.nationality, latest.nationality),
         coalesce(m.position, latest.position),
         latest.debut_year, latest.debut_age, null, latest.name_folded
  from r707_overlay o
  left join public.player_market_values m
         on m.year = 2026 and m.player_name = o.player_name
  cross join lateral (
    select s.nationality, s.position, s.debut_year, s.debut_age, s.name_folded
    from public.soccer_player_club_stints s
    where s.player_name = o.player_name
    order by s.last_year desc, s.id desc
    limit 1
  ) latest
  where not exists (select 1 from public.soccer_player_club_stints s
                     where s.player_name = o.player_name and s.club = o.club
                       and 2026 between s.first_year and s.last_year);
  get diagnostics n = row_count;
  if n <> expected_missing then
    raise exception 'Round 707: inserted % rows, expected %. Rolled back.', n, expected_missing;
  end if;

  -- Prove the shape promised: every move now has a 2026 stint at its club.
  select count(*) into n
  from r707_overlay o
  where not exists (select 1 from public.soccer_player_club_stints s
                     where s.player_name = o.player_name and s.club = o.club
                       and 2026 between s.first_year and s.last_year);
  if n <> 0 then
    raise exception 'Round 707: % moves still have no 2026 stint after the insert. Rolled back.', n;
  end if;

  raise notice 'Round 707: % overlay stints inserted above id %. Undo: delete from public.soccer_player_club_stints where id > % and first_year = 2026 and last_year = 2026 and seasons = 1 and person_key is null;', expected_missing, max_before, max_before;
end
$migration$;
