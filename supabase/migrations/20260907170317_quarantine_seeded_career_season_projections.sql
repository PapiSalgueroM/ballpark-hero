-- Quarantine the remaining 69 rows from the generated 2025-2026 seed tranche.
-- The first eight exact tuples were removed by migration 20260907165757.
-- These rows came from the same pre-completion fallback batch and are not
-- treated as verified completed-season records.
--
-- Rollback values are the 69 tuples below. Restore a tuple only after its
-- club, goals, assists, appearances and market value each have two sources.

do $migration$
declare
  rejected record;
  matching_rows integer;
  removed_rows integer := 0;
  removed_this_row integer;
begin
  for rejected in
    select *
    from (values
      ('Cristiano Ronaldo', '2025-2026', 'Al-Nassr', 12, 2, 20, 8, 21),
      ('Lionel Messi', '2025-2026', 'Inter Miami', 10, 7, 18, 10, 21),
      ('Neymar', '2025-2026', 'Santos', 5, 3, 16, 5, 16),
      ('Robert Lewandowski', '2025-2026', 'Barcelona', 14, 3, 25, 10, 16),
      ('Kylian Mbappé', '2025-2026', 'Real Madrid', 20, 5, 28, 180, 10),
      ('Erling Haaland', '2025-2026', 'Manchester City', 20, 3, 25, 180, 7),
      ('Mohamed Salah', '2025-2026', 'Liverpool', 17, 12, 28, 40, 13),
      ('Harry Kane', '2025-2026', 'Bayern Munich', 22, 6, 28, 65, 14),
      ('Vinícius Júnior', '2025-2026', 'Real Madrid', 15, 8, 28, 200, 8),
      ('Kevin De Bruyne', '2025-2026', 'Napoli', 5, 8, 22, 18, 14),
      ('Karim Benzema', '2025-2026', 'Al-Ittihad', 8, 3, 22, 5, 18),
      ('Paulo Dybala', '2025-2026', 'Roma', 6, 4, 18, 8, 13),
      ('Son Heung-min', '2025-2026', 'Tottenham', 12, 4, 25, 28, 15),
      ('Jude Bellingham', '2025-2026', 'Real Madrid', 15, 10, 36, 150, 6),
      ('Bukayo Saka', '2025-2026', 'Arsenal', 13, 10, 25, 160, 7),
      ('Phil Foden', '2025-2026', 'Manchester City', 8, 5, 22, 120, 8),
      ('Pedri', '2025-2026', 'Barcelona', 5, 7, 35, 100, 6),
      ('Lamine Yamal', '2025-2026', 'Barcelona', 12, 13, 25, 200, 3),
      ('Marcus Rashford', '2025-2026', 'Barcelona', 5, 3, 18, 35, 10),
      ('Thibaut Courtois', '2025-2026', 'Real Madrid', 0, 0, 22, 22, 14),
      ('Virgil van Dijk', '2025-2026', 'Liverpool', 2, 2, 25, 20, 12),
      ('Antoine Griezmann', '2025-2026', 'Atlético Madrid', 6, 4, 22, 12, 16),
      ('Bruno Fernandes', '2025-2026', 'Manchester United', 7, 6, 22, 40, 10),
      ('Declan Rice', '2025-2026', 'Arsenal', 5, 6, 25, 100, 8),
      ('Rodri', '2025-2026', 'Manchester City', 1, 2, 15, 120, 9),
      ('Gavi', '2025-2026', 'Barcelona', 4, 6, 34, 70, 5),
      ('Achraf Hakimi', '2025-2026', 'PSG', 4, 6, 22, 55, 8),
      ('Rafael Leão', '2025-2026', 'AC Milan', 10, 7, 22, 75, 7),
      ('Alphonso Davies', '2025-2026', 'Bayern Munich', 2, 5, 22, 55, 7),
      ('Federico Valverde', '2025-2026', 'Real Madrid', 5, 4, 25, 120, 7),
      ('Luis Suárez', '2025-2026', 'Inter Miami', 8, 4, 18, 2, 16),
      ('N''Golo Kanté', '2025-2026', 'Al-Ittihad', 1, 3, 22, 6, 12),
      ('Pierre-Emerick Aubameyang', '2025-2026', 'Marseille', 5, 2, 18, 2, 14),
      ('Bernardo Silva', '2025-2026', 'Manchester City', 5, 6, 22, 60, 11),
      ('Jamal Musiala', '2025-2026', 'Bayern Munich', 12, 8, 25, 150, 5),
      ('Florian Wirtz', '2025-2026', 'Liverpool', 14, 12, 25, 170, 5),
      ('Victor Osimhen', '2025-2026', 'Galatasaray', 15, 5, 22, 70, 6),
      ('Trent Alexander-Arnold', '2025-2026', 'Real Madrid', 1, 8, 22, 70, 9),
      ('Riyad Mahrez', '2025-2026', 'Al-Ahli', 4, 3, 20, 5, 12),
      ('Alexander Isak', '2025-2026', 'Liverpool', 18, 4, 25, 120, 8),
      ('Martin Ødegaard', '2025-2026', 'Arsenal', 8, 9, 22, 100, 10),
      ('Sergio Busquets', '2025-2026', 'Inter Miami', 1, 3, 20, 2, 17),
      ('Marquinhos', '2025-2026', 'PSG', 2, 1, 22, 25, 13),
      ('Cole Palmer', '2025-2026', 'Chelsea', 16, 10, 36, 120, 5),
      ('Alisson Becker', '2025-2026', 'Liverpool', 0, 0, 22, 30, 9),
      ('Romelu Lukaku', '2025-2026', 'Napoli', 10, 4, 22, 15, 14),
      ('Raheem Sterling', '2025-2026', 'Feyenoord', 4, 3, 15, 10, 13),
      ('Cristian Pulisic', '2025-2026', 'AC Milan', 9, 8, 22, 38, 10),
      ('Joshua Kimmich', '2025-2026', 'Bayern Munich', 3, 8, 25, 55, 10),
      ('Rodrygo', '2025-2026', 'Real Madrid', 10, 6, 22, 90, 6),
      ('Leroy Sané', '2025-2026', 'Galatasaray', 7, 5, 20, 25, 10),
      ('Enzo Fernández', '2025-2026', 'Chelsea', 7, 8, 22, 75, 6),
      ('Khvicha Kvaratskhelia', '2025-2026', 'PSG', 9, 7, 22, 80, 4),
      ('Dusan Vlahović', '2025-2026', 'Juventus', 10, 2, 22, 55, 7),
      ('Jonathan David', '2025-2026', 'Juventus', 10, 3, 22, 55, 7),
      ('Federico Chiesa', '2025-2026', 'Liverpool', 5, 3, 20, 18, 9),
      ('Sandro Tonali', '2025-2026', 'Newcastle', 4, 5, 22, 50, 6),
      ('Viktor Gyökeres', '2025-2026', 'Arsenal', 18, 5, 25, 100, 6),
      ('Xavi Simons', '2025-2026', 'Tottenham', 10, 9, 22, 90, 3),
      ('Estêvão', '2025-2026', 'Chelsea', 7, 6, 22, 50, 2),
      ('Endrick', '2025-2026', 'Lyon', 10, 3, 22, 35, 3),
      ('Moussa Diaby', '2025-2026', 'Al-Ittihad', 8, 6, 20, 22, 7),
      ('Nico Williams', '2025-2026', 'Athletic Bilbao', 9, 10, 34, 75, 4),
      ('Kobbie Mainoo', '2025-2026', 'Manchester United', 3, 4, 30, 60, 2),
      ('Pau Cubarsí', '2025-2026', 'Barcelona', 2, 1, 34, 80, 2),
      ('Warren Zaïre-Emery', '2025-2026', 'PSG', 6, 5, 35, 70, 3),
      ('Bradley Barcola', '2025-2026', 'PSG', 10, 7, 35, 75, 4),
      ('Moisés Caicedo', '2025-2026', 'Chelsea', 2, 3, 34, 90, 4),
      ('Arda Güler', '2025-2026', 'Real Madrid', 7, 6, 32, 60, 4)
    ) as rows(player_name, season, club, goals, assists, appearances, market_value, sort_order)
  loop
    select count(*)
      into matching_rows
    from public.career_seasons s
    join public.career_players p on p.id = s.player_id
    where p.player_name = rejected.player_name
      and s.season = rejected.season
      and s.club = rejected.club
      and s.goals = rejected.goals
      and s.assists = rejected.assists
      and s.appearances = rejected.appearances
      and s.market_value = rejected.market_value
      and s.sort_order = rejected.sort_order;

    if matching_rows <> 1 then
      raise exception 'Expected one exact seeded career row for %, found %',
        rejected.player_name, matching_rows;
    end if;

    delete from public.career_seasons s
    using public.career_players p
    where p.id = s.player_id
      and p.player_name = rejected.player_name
      and s.season = rejected.season
      and s.club = rejected.club
      and s.goals = rejected.goals
      and s.assists = rejected.assists
      and s.appearances = rejected.appearances
      and s.market_value = rejected.market_value
      and s.sort_order = rejected.sort_order;

    get diagnostics removed_this_row = row_count;
    removed_rows := removed_rows + removed_this_row;
  end loop;

  if removed_rows <> 69 then
    raise exception 'Expected to quarantine 69 seeded career rows, removed %', removed_rows;
  end if;
end
$migration$;
