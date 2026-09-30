-- Round 730: public.ballon_dor, every row two source verified, nationality filled.
--
-- UNAPPLIED. Written for review; nothing in the repo applies it. Read with
-- SELECT only, on 2026-09-30: 76 rows (69 Men, 7 Women), all rank 1, ids 2 to 77
-- (no id 1), points NULL and nationality NULL on every row. Men run 1956 to 2025
-- and Women 2018 to 2025, both without 2020, when the award was not given.
--
-- What was checked. Every row's winner, year, rank and club against the list
-- UEFA publishes as co-organiser of the award (since 2024, with Groupe Amaury,
-- owner of France Football) plus at least one independent source on another
-- host. Winner, year, rank and club were right on all 76 rows: nothing is
-- renamed, moved, inserted or deleted. The only change is nationality, NULL on
-- every row, filled with the nation each player represented when he or she won,
-- in the spelling the site's other tables use.
--
-- Sources (keys used below):
--   uefaLaureates: https://www.uefa.com/ballondor/news/0292-1c27056169a7-bc88d1fdba43-1000--ballon-d-or-laureates-who-has-won-football-s-most-prestig/
--   uefaHistory: https://www.uefa.com/ballondor/news/0287-195e642735da-0594342b9554-1000--history-of-the-ballon-d-or-all-the-winners/
--   uefa2025Men: https://www.uefa.com/uefachampionsleague/news/029d-1ec96c30aa3f-f6868c869cbd-1000--ousmane-dembele-wins-2025-men-s-ballon-d-or/
--   uefa2025Women: https://www.uefa.com/womenschampionsleague/news/029d-1ec96b619751-1db5282da758-1000--aitana-bonmati-wins-2025-women-s-ballon-d-or/
--   rsssfEuropa: https://www.rsssf.org/miscellaneous/europa-poy.html
--   rsssfMerged: https://www.rsssf.org/miscellaneous/fifa-awards.html
--   topendsportsMen: https://www.topendsports.com/sport/soccer/list-player-of-the-year-ballondor.htm
--   topendsportsWomen: https://www.topendsports.com/sport/soccer/awards/ballondor-women.htm
--   espnList: https://www.espn.com/soccer/story/_/id/42055052/ballon-dor-winners-list-messi-ronaldo-ronaldinho-more
--   espn2025: https://www.espn.com/soccer/story/_/id/46344733/psg-ousmane-dembele-wins-ballon-dor-ahead-lamine-yamal
--
-- Changes, one per row (id, award, year, winner: nationality NULL -> value; sources):
--   id 2 Men 1956 Stanley Matthews: nationality NULL -> England; uefaLaureates, rsssfEuropa, espnList
--   id 3 Men 1957 Alfredo Di Stefano: nationality NULL -> Spain; uefaLaureates, rsssfEuropa, espnList
--   id 4 Men 1958 Raymond Kopa: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 5 Men 1959 Alfredo Di Stefano: nationality NULL -> Spain; uefaLaureates, rsssfEuropa, espnList
--   id 6 Men 1960 Luis Suarez: nationality NULL -> Spain; uefaLaureates, rsssfEuropa, espnList
--   id 7 Men 1961 Omar Sivori: nationality NULL -> Italy; uefaLaureates, rsssfEuropa, espnList
--   id 8 Men 1962 Josef Masopust: nationality NULL -> Czechoslovakia; uefaLaureates, rsssfEuropa, espnList
--   id 9 Men 1963 Lev Yashin: nationality NULL -> Soviet Union; uefaLaureates, rsssfEuropa, espnList
--   id 10 Men 1964 Denis Law: nationality NULL -> Scotland; uefaLaureates, rsssfEuropa, espnList
--   id 11 Men 1965 Eusebio: nationality NULL -> Portugal; uefaLaureates, rsssfEuropa, espnList
--   id 12 Men 1966 Bobby Charlton: nationality NULL -> England; uefaLaureates, rsssfEuropa, espnList
--   id 13 Men 1967 Florian Albert: nationality NULL -> Hungary; uefaLaureates, rsssfEuropa, espnList
--   id 14 Men 1968 George Best: nationality NULL -> Northern Ireland; uefaLaureates, rsssfEuropa, espnList
--   id 15 Men 1969 Gianni Rivera: nationality NULL -> Italy; uefaLaureates, rsssfEuropa, espnList
--   id 16 Men 1970 Gerd Muller: nationality NULL -> West Germany; uefaLaureates, rsssfEuropa, espnList
--   id 17 Men 1971 Johan Cruyff: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 18 Men 1972 Franz Beckenbauer: nationality NULL -> West Germany; uefaLaureates, rsssfEuropa, espnList
--   id 19 Men 1973 Johan Cruyff: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 20 Men 1974 Johan Cruyff: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 21 Men 1975 Oleg Blokhin: nationality NULL -> Soviet Union; uefaLaureates, rsssfEuropa, espnList
--   id 22 Men 1976 Franz Beckenbauer: nationality NULL -> West Germany; uefaLaureates, rsssfEuropa, espnList
--   id 23 Men 1977 Allan Simonsen: nationality NULL -> Denmark; uefaLaureates, rsssfEuropa, espnList
--   id 24 Men 1978 Kevin Keegan: nationality NULL -> England; uefaLaureates, rsssfEuropa, espnList
--   id 25 Men 1979 Kevin Keegan: nationality NULL -> England; uefaLaureates, rsssfEuropa, espnList
--   id 26 Men 1980 Karl-Heinz Rummenigge: nationality NULL -> West Germany; uefaLaureates, rsssfEuropa, espnList
--   id 27 Men 1981 Karl-Heinz Rummenigge: nationality NULL -> West Germany; uefaLaureates, rsssfEuropa, espnList
--   id 28 Men 1982 Paolo Rossi: nationality NULL -> Italy; uefaLaureates, rsssfEuropa, espnList
--   id 29 Men 1983 Michel Platini: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 30 Men 1984 Michel Platini: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 31 Men 1985 Michel Platini: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 32 Men 1986 Igor Belanov: nationality NULL -> Soviet Union; uefaLaureates, rsssfEuropa, espnList
--   id 33 Men 1987 Ruud Gullit: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 34 Men 1988 Marco van Basten: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 35 Men 1989 Marco van Basten: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 36 Men 1990 Lothar Matthaus: nationality NULL -> Germany; uefaLaureates, espnList, topendsportsMen
--   id 37 Men 1991 Jean-Pierre Papin: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 38 Men 1992 Marco van Basten: nationality NULL -> Netherlands; uefaLaureates, rsssfEuropa, espnList
--   id 39 Men 1993 Roberto Baggio: nationality NULL -> Italy; uefaLaureates, rsssfEuropa, espnList
--   id 40 Men 1994 Hristo Stoichkov: nationality NULL -> Bulgaria; uefaLaureates, rsssfEuropa, espnList
--   id 41 Men 1995 George Weah: nationality NULL -> Liberia; uefaLaureates, rsssfEuropa, espnList
--   id 42 Men 1996 Matthias Sammer: nationality NULL -> Germany; uefaLaureates, rsssfEuropa, espnList
--   id 43 Men 1997 Ronaldo: nationality NULL -> Brazil; uefaLaureates, rsssfEuropa, espnList
--   id 44 Men 1998 Zinedine Zidane: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 45 Men 1999 Rivaldo: nationality NULL -> Brazil; uefaLaureates, rsssfEuropa, espnList
--   id 46 Men 2000 Luis Figo: nationality NULL -> Portugal; uefaLaureates, rsssfEuropa, espnList
--   id 47 Men 2001 Michael Owen: nationality NULL -> England; uefaLaureates, rsssfEuropa, espnList
--   id 48 Men 2002 Ronaldo: nationality NULL -> Brazil; uefaLaureates, rsssfEuropa, espnList
--   id 49 Men 2003 Pavel Nedved: nationality NULL -> Czech Republic; uefaLaureates, rsssfEuropa, espnList
--   id 50 Men 2004 Andriy Shevchenko: nationality NULL -> Ukraine; uefaLaureates, rsssfEuropa, espnList
--   id 51 Men 2005 Ronaldinho: nationality NULL -> Brazil; uefaLaureates, rsssfEuropa, espnList
--   id 52 Men 2006 Fabio Cannavaro: nationality NULL -> Italy; uefaLaureates, rsssfEuropa, espnList
--   id 53 Men 2007 Kaka: nationality NULL -> Brazil; uefaLaureates, rsssfEuropa, espnList
--   id 54 Men 2008 Cristiano Ronaldo: nationality NULL -> Portugal; uefaLaureates, rsssfEuropa, espnList
--   id 55 Men 2009 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfEuropa, espnList
--   id 56 Men 2010 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfMerged, topendsportsMen
--   id 57 Men 2011 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfMerged, topendsportsMen
--   id 58 Men 2012 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfMerged, topendsportsMen
--   id 59 Men 2013 Cristiano Ronaldo: nationality NULL -> Portugal; uefaLaureates, rsssfMerged, topendsportsMen
--   id 60 Men 2014 Cristiano Ronaldo: nationality NULL -> Portugal; uefaLaureates, rsssfMerged, topendsportsMen
--   id 61 Men 2015 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfMerged, topendsportsMen
--   id 62 Men 2016 Cristiano Ronaldo: nationality NULL -> Portugal; uefaLaureates, rsssfEuropa, espnList
--   id 63 Men 2017 Cristiano Ronaldo: nationality NULL -> Portugal; uefaLaureates, rsssfEuropa, espnList
--   id 64 Men 2018 Luka Modric: nationality NULL -> Croatia; uefaLaureates, rsssfEuropa, espnList
--   id 66 Men 2019 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfEuropa, espnList
--   id 68 Men 2021 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfEuropa, espnList
--   id 70 Men 2022 Karim Benzema: nationality NULL -> France; uefaLaureates, rsssfEuropa, espnList
--   id 72 Men 2023 Lionel Messi: nationality NULL -> Argentina; uefaLaureates, rsssfEuropa, espnList
--   id 74 Men 2024 Rodri: nationality NULL -> Spain; uefaLaureates, rsssfEuropa, espnList
--   id 76 Men 2025 Ousmane Dembele: nationality NULL -> France; uefaLaureates, uefa2025Men, espn2025, espnList
--   id 65 Women 2018 Ada Hegerberg: nationality NULL -> Norway; uefaLaureates, espnList, topendsportsWomen
--   id 67 Women 2019 Megan Rapinoe: nationality NULL -> United States; uefaLaureates, espnList, topendsportsWomen
--   id 69 Women 2021 Alexia Putellas: nationality NULL -> Spain; uefaLaureates, espnList, topendsportsWomen
--   id 71 Women 2022 Alexia Putellas: nationality NULL -> Spain; uefaLaureates, espnList, topendsportsWomen
--   id 73 Women 2023 Aitana Bonmati: nationality NULL -> Spain; uefaLaureates, espnList, topendsportsWomen
--   id 75 Women 2024 Aitana Bonmati: nationality NULL -> Spain; uefaLaureates, espnList, topendsportsWomen
--   id 77 Women 2025 Aitana Bonmati: nationality NULL -> Spain; uefaLaureates, uefa2025Women, espn2025, espnList
--
-- Dissent on the way in, each settled by the official list plus a second source:
--   1957, 1959 Di Stefano: ESPN writes Argentina (birth nation); UEFA and RSSSF write Spain.
--   1990 Matthaus: RSSSF writes West Germany; UEFA, ESPN and Topend Sports write Germany,
--   and the award was presented on 25 December 1990, after reunification.
--
-- Fail closed. Each row is updated only if it is still exactly what was read:
-- same id, year, award type, rank, winner and club, and nationality still NULL.
-- If the table has moved at all (a row count, a winner, a club, a nationality
-- someone already filled), the block raises and changes nothing. Names and
-- clubs with accents are written as Unicode escapes (the table stores them
-- precomposed, NFC, checked on the read) so the file's encoding cannot change
-- what they match.
--
-- scripts/simBallonDor.mjs reads this file's end state and holds it to
-- scripts/data/ballonDorVerified2026-09.json.

do $migration$
declare
  n integer;
begin
  select count(*) into n from public.ballon_dor;
  if n <> 76 then
    raise exception 'Round 730: expected 76 rows as read on 2026-09-30, found %. Nothing was changed.', n;
  end if;

  select count(*) into n from public.ballon_dor where award_type = 'Men' and rank = 1;
  if n <> 69 then
    raise exception 'Round 730: expected 69 Men rank 1 rows, found %. Nothing was changed.', n;
  end if;

  select count(*) into n from public.ballon_dor where award_type = 'Women' and rank = 1;
  if n <> 7 then
    raise exception 'Round 730: expected 7 Women rank 1 rows, found %. Nothing was changed.', n;
  end if;

  select count(*) into n from public.ballon_dor where nationality is not null;
  if n <> 0 then
    raise exception 'Round 730: % rows already carry a nationality, so the table moved since it was read. Nothing was changed.', n;
  end if;

  update public.ballon_dor b
     set nationality = v.nationality
    from (values
    (2, 1956, 'Men', 1, 'Stanley Matthews', 'Blackpool', 'England'),
    (3, 1957, 'Men', 1, U&'Alfredo Di St\00E9fano', 'Real Madrid', 'Spain'),
    (4, 1958, 'Men', 1, 'Raymond Kopa', 'Real Madrid', 'France'),
    (5, 1959, 'Men', 1, U&'Alfredo Di St\00E9fano', 'Real Madrid', 'Spain'),
    (6, 1960, 'Men', 1, U&'Luis Su\00E1rez', 'Barcelona', 'Spain'),
    (7, 1961, 'Men', 1, U&'Omar S\00EDvori', 'Juventus', 'Italy'),
    (8, 1962, 'Men', 1, 'Josef Masopust', 'Dukla Prague', 'Czechoslovakia'),
    (9, 1963, 'Men', 1, 'Lev Yashin', 'Dynamo Moscow', 'Soviet Union'),
    (10, 1964, 'Men', 1, 'Denis Law', 'Manchester United', 'Scotland'),
    (11, 1965, 'Men', 1, U&'Eus\00E9bio', 'Benfica', 'Portugal'),
    (12, 1966, 'Men', 1, 'Bobby Charlton', 'Manchester United', 'England'),
    (13, 1967, 'Men', 1, U&'Fl\00F3ri\00E1n Albert', U&'Ferencv\00E1ros', 'Hungary'),
    (14, 1968, 'Men', 1, 'George Best', 'Manchester United', 'Northern Ireland'),
    (15, 1969, 'Men', 1, 'Gianni Rivera', 'Milan', 'Italy'),
    (16, 1970, 'Men', 1, U&'Gerd M\00FCller', 'Bayern Munich', 'West Germany'),
    (17, 1971, 'Men', 1, 'Johan Cruyff', 'Ajax', 'Netherlands'),
    (18, 1972, 'Men', 1, 'Franz Beckenbauer', 'Bayern Munich', 'West Germany'),
    (19, 1973, 'Men', 1, 'Johan Cruyff', 'Barcelona', 'Netherlands'),
    (20, 1974, 'Men', 1, 'Johan Cruyff', 'Barcelona', 'Netherlands'),
    (21, 1975, 'Men', 1, 'Oleg Blokhin', 'Dynamo Kyiv', 'Soviet Union'),
    (22, 1976, 'Men', 1, 'Franz Beckenbauer', 'Bayern Munich', 'West Germany'),
    (23, 1977, 'Men', 1, 'Allan Simonsen', U&'Borussia M\00F6nchengladbach', 'Denmark'),
    (24, 1978, 'Men', 1, 'Kevin Keegan', 'Hamburger SV', 'England'),
    (25, 1979, 'Men', 1, 'Kevin Keegan', 'Hamburger SV', 'England'),
    (26, 1980, 'Men', 1, 'Karl-Heinz Rummenigge', 'Bayern Munich', 'West Germany'),
    (27, 1981, 'Men', 1, 'Karl-Heinz Rummenigge', 'Bayern Munich', 'West Germany'),
    (28, 1982, 'Men', 1, 'Paolo Rossi', 'Juventus', 'Italy'),
    (29, 1983, 'Men', 1, 'Michel Platini', 'Juventus', 'France'),
    (30, 1984, 'Men', 1, 'Michel Platini', 'Juventus', 'France'),
    (31, 1985, 'Men', 1, 'Michel Platini', 'Juventus', 'France'),
    (32, 1986, 'Men', 1, 'Igor Belanov', 'Dynamo Kyiv', 'Soviet Union'),
    (33, 1987, 'Men', 1, 'Ruud Gullit', 'Milan', 'Netherlands'),
    (34, 1988, 'Men', 1, 'Marco van Basten', 'Milan', 'Netherlands'),
    (35, 1989, 'Men', 1, 'Marco van Basten', 'Milan', 'Netherlands'),
    (36, 1990, 'Men', 1, U&'Lothar Matth\00E4us', 'Inter Milan', 'Germany'),
    (37, 1991, 'Men', 1, 'Jean-Pierre Papin', 'Marseille', 'France'),
    (38, 1992, 'Men', 1, 'Marco van Basten', 'Milan', 'Netherlands'),
    (39, 1993, 'Men', 1, 'Roberto Baggio', 'Juventus', 'Italy'),
    (40, 1994, 'Men', 1, 'Hristo Stoichkov', 'Barcelona', 'Bulgaria'),
    (41, 1995, 'Men', 1, 'George Weah', 'Milan', 'Liberia'),
    (42, 1996, 'Men', 1, 'Matthias Sammer', 'Borussia Dortmund', 'Germany'),
    (43, 1997, 'Men', 1, 'Ronaldo', 'Inter Milan', 'Brazil'),
    (44, 1998, 'Men', 1, 'Zinedine Zidane', 'Juventus', 'France'),
    (45, 1999, 'Men', 1, 'Rivaldo', 'Barcelona', 'Brazil'),
    (46, 2000, 'Men', 1, U&'Lu\00EDs Figo', 'Real Madrid', 'Portugal'),
    (47, 2001, 'Men', 1, 'Michael Owen', 'Liverpool', 'England'),
    (48, 2002, 'Men', 1, 'Ronaldo', 'Real Madrid', 'Brazil'),
    (49, 2003, 'Men', 1, U&'Pavel Nedv\011Bd', 'Juventus', 'Czech Republic'),
    (50, 2004, 'Men', 1, 'Andriy Shevchenko', 'Milan', 'Ukraine'),
    (51, 2005, 'Men', 1, 'Ronaldinho', 'Barcelona', 'Brazil'),
    (52, 2006, 'Men', 1, 'Fabio Cannavaro', 'Real Madrid', 'Italy'),
    (53, 2007, 'Men', 1, U&'Kak\00E1', 'Milan', 'Brazil'),
    (54, 2008, 'Men', 1, 'Cristiano Ronaldo', 'Manchester United', 'Portugal'),
    (55, 2009, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (56, 2010, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (57, 2011, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (58, 2012, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (59, 2013, 'Men', 1, 'Cristiano Ronaldo', 'Real Madrid', 'Portugal'),
    (60, 2014, 'Men', 1, 'Cristiano Ronaldo', 'Real Madrid', 'Portugal'),
    (61, 2015, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (62, 2016, 'Men', 1, 'Cristiano Ronaldo', 'Real Madrid', 'Portugal'),
    (63, 2017, 'Men', 1, 'Cristiano Ronaldo', 'Real Madrid', 'Portugal'),
    (64, 2018, 'Men', 1, U&'Luka Modri\0107', 'Real Madrid', 'Croatia'),
    (66, 2019, 'Men', 1, 'Lionel Messi', 'Barcelona', 'Argentina'),
    (68, 2021, 'Men', 1, 'Lionel Messi', 'Paris Saint-Germain', 'Argentina'),
    (70, 2022, 'Men', 1, 'Karim Benzema', 'Real Madrid', 'France'),
    (72, 2023, 'Men', 1, 'Lionel Messi', 'Inter Miami', 'Argentina'),
    (74, 2024, 'Men', 1, 'Rodri', 'Manchester City', 'Spain'),
    (76, 2025, 'Men', 1, U&'Ousmane Demb\00E9l\00E9', 'Paris Saint-Germain', 'France'),
    (65, 2018, 'Women', 1, 'Ada Hegerberg', 'Lyon', 'Norway'),
    (67, 2019, 'Women', 1, 'Megan Rapinoe', 'Reign FC', 'United States'),
    (69, 2021, 'Women', 1, 'Alexia Putellas', 'Barcelona', 'Spain'),
    (71, 2022, 'Women', 1, 'Alexia Putellas', 'Barcelona', 'Spain'),
    (73, 2023, 'Women', 1, U&'Aitana Bonmat\00ED', 'Barcelona', 'Spain'),
    (75, 2024, 'Women', 1, U&'Aitana Bonmat\00ED', 'Barcelona', 'Spain'),
    (77, 2025, 'Women', 1, U&'Aitana Bonmat\00ED', 'Barcelona', 'Spain')
    ) as v(id, year, award_type, rank, player_name, club, nationality)
   where b.id = v.id
     and b.year = v.year
     and b.award_type = v.award_type
     and b.rank = v.rank
     and b.player_name = v.player_name
     and b.club = v.club
     and b.nationality is null;
  get diagnostics n = row_count;
  if n <> 76 then
    raise exception 'Round 730: only % of 76 rows are still exactly as read on 2026-09-30. Nothing was changed.', n;
  end if;

  select count(*) into n from public.ballon_dor where nationality is null or btrim(nationality) = '';
  if n <> 0 then
    raise exception 'Round 730: % rows still have no nationality after the fill. Nothing was changed.', n;
  end if;

  select count(*) into n from public.ballon_dor;
  if n <> 76 then
    raise exception 'Round 730: the table holds % rows after the fill, not 76. Nothing was changed.', n;
  end if;
end
$migration$;
