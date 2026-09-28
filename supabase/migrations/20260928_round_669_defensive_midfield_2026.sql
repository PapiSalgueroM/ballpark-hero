-- Round 669 (2026-09-28, fixed the same day): World XI knows its defensive
-- midfielders again.
--
-- UNAPPLIED. Written for review; the lead applies it. Every statement below is
-- guarded: a precondition that does not hold raises and nothing is written.
-- Before it was committed it was run on the live database as
-- BEGIN; <this file without its own begin and commit>; ROLLBACK; and the record
-- (scripts/data/defensiveMidfield2026.json, dryRun) carries that result and
-- the sha256 of the statements it ran. simWorldXiDefensiveMids fails if any
-- statement has changed since. Comments do not run, so this header may change.
--
-- APPLY PROCEDURE. The lead, in this order. docs/PROJECT-STATE.md carries the
-- same steps and the measurements behind them.
--   1. Apply this file in the first minutes after 00:00 America/New_York
--      (04:00 UTC until 2026-11-01, 05:00 UTC from then), never at 00:00 UTC,
--      which is 20:00 Eastern. The rows change Footle's daily answer on 344 of
--      the 366 days from 2026-09-28, and a Footle day turns over at Eastern
--      midnight. Applied mid-day, whoever loads Footle afterwards gets a new
--      answer: a saved board is thrown away (and a finished game can be played
--      and scored a second time), or kept and shown against an answer it was
--      never played for. Run the whole file, its own begin and commit included,
--      through the Supabase MCP's execute_sql, the tool the dry run used.
--   2. Read the counts with count(*), not the table list: 412 rows at
--      "Defensive Midfield" in 2026 (46 + 366) and 5862 rows in 2026 (5496 + 366).
--   3. Re-bake the Footle fallback pool from the new rows, on this round's branch:
--        node scripts/bakePlayers.mjs
--      It rewrites src/data/players.ts and nothing else. Measured on a stand in
--      for the table (the live 2026 rows plus this file's rows): 538 rows become
--      553. 16 written men are in the pool's seed and join; Genoa's Vitinha
--      leaves, because the seed name "Vitinha" now matches two 2026 rows and the
--      bake never guesses which man a seed name meant; 11 players change tier;
--      the header takes the bake day's date. Skip this and simPlayersPool is red
--      on every branch, main included, since the database is shared.
--   4. Run each of these and read its closing line and its exit code:
--        node_modules/.bin/tsc --noEmit -p tsconfig.app.json
--        simPlayersPool, then PLAYERS_CONTROL=handedit and PLAYERS_CONTROL=agezero
--        simWorldXiDefensiveMids with no WXIDM_PROJECT, then WXIDM_CONTROL=all
--        the readers of src/data/players.ts: simFootleDaily, simFootleAtomicPool,
--          simFootleLeagues, simFootleKitNumbers, simSportsBingo, simGauntletDraft,
--          simGauntletEngine, simDraftShowdown, simManagerSpec, simManagers,
--          simSearchDiscard, simCreateClub
--        the other harnesses that name player_market_values (27 in all on
--          2026-09-28, three of them above): simAdminAccess, simAlphabetSprint,
--          simAnswerFromRecords, simDatabaseReadEfficiency, simLineupPositions,
--          simMarketYearScope, simMissingXiReach, simNationalPools,
--          simNationalities, simNoZeroFacts, simPlayerBingoPool,
--          simPlayerSearchAccents, simRarityAgreement, simRarityPoolRecovery,
--          simRarityPools, simRebuildEconomy, simRosterAdjudication,
--          simSchemaNames, simSignThePlayerAuction, simSoccerConquest,
--          simTransferOverlay, simValidatePlayerRecords, simValidatorCache,
--          simValueFreshness. simRarityPools, simRarityAgreement and
--          simSchemaNames read views the stand in could not model, so this is
--          their first run on the new rows; docs/PROJECT-STATE.md has what the
--          others showed on it.
--   5. Commit exactly one generated file, src/data/players.ts, on this round's
--      branch, and merge the branch the same night: from step 1 until that
--      merge, simPlayersPool is red on main and on every other branch.
--   6. Publish the release that carries that file at an Eastern midnight as
--      well. Footle files a saved board under its answer's place in that file,
--      and the re-bake moves the place on 140 of 366 days, so a mid-day publish
--      throws those boards away for anyone who reloads.
--
-- The report (World XI "Wrong answer", 2026-09-21): a CDM or CM slot said
-- "Nobody from X matches that" for Manuel Ugarte, Sofyan Amrabat, Wataru Endo,
-- Tyler Adams and PSG's Vitinha. The cause is the table, not the game:
-- player_market_values carries 432 to 500 "Defensive Midfield" rows a year
-- through 2022, none at all in 2023, 2024 and 2025, and only 46 in 2026, all of
-- them written by hand in Rounds 344 and 393. Every other position has about
-- 500 a year.
--
-- What this writes, all of it recorded row by row with both sources in
-- scripts/data/defensiveMidfield2026.json:
--   1. 366 year-2026 "Defensive Midfield" rows. The population is Transfermarkt's
--      most valuable players at that main position (the top 500, EUR 140m down to
--      EUR 2m, read 2026-09-28), minus the men the 2026 snapshot already carries
--      and minus every row the two hosts (Transfermarkt and FotMob) did not agree
--      on. Transfermarkt has each one at defensive midfield as his MAIN position;
--      FotMob lists defensive midfield AMONG the positions he has played, and its
--      own primary for him is a midfield role, never a defender or a winger
--      (20 rows where it is were held). Value is Transfermarkt's figure times
--      1.08, the convention every other row follows, and FotMob's figure sits
--      inside the record's valueBand (0.323 to 1.341 of it; 12 rows
--      outside were held). Age is his age on 2026-01-01, the table's own
--      reference. 80 rows in all were held, each with its reason in the record.
--   2. 4 club corrections among the existing 46, where both hosts name a
--      different club today than the row does, and 1 age correction on one of
--      those same rows, where the stored age is not his age on 2026-01-01.
--
-- Keyed so a row cannot duplicate a person already present: no new row may share
-- a folded name with ANY existing 2026 row, except the namesake declared here
-- (Vitinha of Paris Saint-Germain), whose existing 2026 row must be exactly the
-- other man (club and position as declared) and whose new club must not already
-- carry that name. Running it twice fails on the first check.

begin;

create temporary table r669_dm (
  player_name text not null,
  club text not null,
  nationality text not null,
  age integer not null,
  market_value_usd bigint not null,
  namesake_club text,
  namesake_position text
) on commit drop;

insert into r669_dm (player_name, club, nationality, age, market_value_usd, namesake_club, namesake_position) values
  ('Vitinha', 'Paris Saint-Germain', 'Portugal', 25, 151200000, 'Genoa CFC', 'Centre-Forward'),
  ('Aleksandar Pavlovic', 'Bayern Munich', 'Germany', 21, 97200000, null, null),
  ('Adam Wharton', 'Crystal Palace', 'England', 21, 75600000, null, null),
  ('Carlos Baleba', 'Manchester United', 'Cameroon', 21, 59400000, null, null),
  ('Kaishu Sano', '1.FSV Mainz 05', 'Japan', 25, 54000000, null, null),
  ('Angelo Stiller', 'VfB Stuttgart', 'Germany', 24, 48600000, null, null),
  ('James Garner', 'Everton FC', 'England', 24, 48600000, null, null),
  ('Morten Hjulmand', 'Atlético de Madrid', 'Denmark', 26, 48600000, null, null),
  ('Máximo Perrone', 'Como 1907', 'Argentina', 22, 37800000, null, null),
  ('Alan Varela', 'FC Porto', 'Argentina', 24, 34560000, null, null),
  ('Aleksandar Stanković', 'Inter Milan', 'Serbia', 20, 34560000, null, null),
  ('Hayden Hackney', 'Everton FC', 'England', 23, 34560000, null, null),
  ('Ethan Ampadu', 'Leeds United', 'Wales', 25, 32400000, null, null),
  ('Leon Avdullahu', 'TSG 1899 Hoffenheim', 'Kosovo', 21, 32400000, null, null),
  ('Tyler Morton', 'Olympique Lyon', 'England', 23, 32400000, null, null),
  ('Anton Stach', 'Leeds United', 'Germany', 27, 30240000, null, null),
  ('Jack Hinshelwood', 'Brighton & Hove Albion', 'England', 20, 30240000, null, null),
  ('Manuel Ugarte', 'Manchester United', 'Uruguay', 24, 27000000, null, null),
  ('Nicolas Seiwald', 'RB Leipzig', 'Austria', 24, 27000000, null, null),
  ('Richard Ríos', 'Al-Ittihad Club', 'Colombia', 25, 27000000, null, null),
  ('Sander Berge', 'Fulham FC', 'Norway', 27, 27000000, null, null),
  ('Tyler Adams', 'AFC Bournemouth', 'United States', 26, 27000000, null, null),
  ('Raphael Onyedika', 'Eintracht Frankfurt', 'Nigeria', 24, 24840000, null, null),
  ('Youssouf Fofana', 'Sevilla FC', 'France', 26, 24840000, null, null),
  ('Ardon Jashari', 'AC Milan', 'Switzerland', 23, 23760000, null, null),
  ('Lesley Ugochukwu', 'Galatasaray', 'France', 21, 23760000, null, null),
  ('Roméo Lavia', 'Chelsea FC', 'Belgium', 21, 23760000, null, null),
  ('Samuele Ricci', 'Como 1907', 'Italy', 24, 23760000, null, null),
  ('Arthur Vermeeren', 'Royal Antwerp FC', 'Belgium', 20, 21600000, null, null),
  ('Billy Gilmour', 'SSC Napoli', 'Scotland', 24, 21600000, null, null),
  ('Chema Andrés', 'Brighton & Hove Albion', 'Spain', 20, 21600000, null, null),
  ('Equi Fernández', 'Bayer 04 Leverkusen', 'Argentina', 23, 21600000, null, null),
  ('Ibrahim Sangaré', 'Nottingham Forest', 'Cote d''Ivoire', 28, 21600000, null, null),
  ('Kennet Eichhorn', 'Bayer 04 Leverkusen', 'Germany', 16, 21600000, null, null),
  ('Mandela Keita', 'Parma Calcio 1913', 'Belgium', 23, 21600000, null, null),
  ('Aladji Bamba', 'Newcastle United', 'France', 19, 19440000, null, null),
  ('Lamare Bogarde', 'Aston Villa', 'Netherlands', 21, 19440000, null, null),
  ('Marc Casadó', 'Deportivo de La Coruña', 'Spain', 22, 19440000, null, null),
  ('Nicolas Raskin', 'Rangers FC', 'Belgium', 24, 18360000, null, null),
  ('Florentino', 'Ipswich Town', 'Portugal', 26, 17280000, null, null),
  ('Martinelli', 'Fluminense Football Club', 'Brazil', 24, 17280000, null, null),
  ('Oussama Targhalline', 'Feyenoord Rotterdam', 'Morocco', 23, 17280000, null, null),
  ('Vitaly Janelt', 'Brentford FC', 'Germany', 27, 17280000, null, null),
  ('Dário Essugo', 'RC Strasbourg Alsace', 'Portugal', 20, 16200000, null, null),
  ('İsmail Yüksek', 'Fenerbahce', 'Türkiye', 26, 16200000, null, null),
  ('Jorthy Mokio', 'Ajax Amsterdam', 'DR Congo', 17, 16200000, null, null),
  ('Lucien Agoumé', 'Sevilla FC', 'France', 23, 16200000, null, null),
  ('Morten Frendrup', 'Genoa CFC', 'Denmark', 24, 16200000, null, null),
  ('Peer Koopmeiners', 'AZ Alkmaar', 'Netherlands', 25, 16200000, null, null),
  ('Samú Costa', 'Al-Nassr FC', 'Portugal', 25, 16200000, null, null),
  ('Shea Charles', 'Fulham FC', 'Northern Ireland', 22, 16200000, null, null),
  ('Soungoutou Magassa', 'West Ham United', 'France', 22, 16200000, null, null),
  ('Santiago Hezze', 'Olympiacos Piraeus', 'Argentina', 24, 15120000, null, null),
  ('Aljoscha Kemlein', '1.FC Union Berlin', 'Germany', 21, 12960000, null, null),
  ('Azor Matusiwa', 'Ipswich Town', 'Netherlands', 27, 12960000, null, null),
  ('Enzo Barrenechea', 'SL Benfica', 'Argentina', 24, 12960000, null, null),
  ('Ilia Gruev', 'Leeds United', 'Bulgaria', 25, 12960000, null, null),
  ('Kristjan Asllani', 'Al-Jazira Club', 'Albania', 23, 12960000, null, null),
  ('Noël Aséko', 'Eintracht Frankfurt', 'Germany', 20, 12960000, null, null),
  ('Patrick Osterhage', 'SC Freiburg', 'Germany', 25, 12960000, null, null),
  ('Urko González de Zárate', 'RCD Espanyol Barcelona', 'Spain', 24, 12960000, null, null),
  ('Antonio Blanco', 'Deportivo Alavés', 'Spain', 25, 10800000, null, null),
  ('Evertton Araújo', 'CR Flamengo', 'Brazil', 22, 10800000, null, null),
  ('Flynn Downes', 'Southampton FC', 'England', 26, 10800000, null, null),
  ('Freddie Potts', 'Club Brugge KV', 'England', 22, 10800000, null, null),
  ('Mario Martín', 'Getafe CF', 'Spain', 21, 10800000, null, null),
  ('Milton Delgado', 'CA Boca Juniors', 'Argentina', 20, 10800000, null, null),
  ('Tanner Tessmann', 'Olympique Lyon', 'United States', 24, 10800000, null, null),
  ('Volodymyr Brazhko', 'Dynamo Kyiv', 'Ukraine', 23, 10800000, null, null),
  ('Nicolai Remberg', 'Hamburger SV', 'Germany', 25, 9720000, null, null),
  ('Orel Mangala', 'Getafe CF', 'Belgium', 27, 9720000, null, null),
  ('Aleksandr Chernikov', 'FC Krasnodar', 'Russia', 25, 8640000, null, null),
  ('Alonzo Engwanda', 'FC Utrecht', 'Belgium', 22, 8640000, null, null),
  ('Anthony Dennis', 'Al-Jazira Club', 'Nigeria', 21, 8640000, null, null),
  ('Atakan Karazor', 'VfB Stuttgart', 'Türkiye', 29, 8640000, null, null),
  ('Demir Ege Tıknaz', 'SC Braga', 'Türkiye', 21, 8640000, null, null),
  ('Eric Martel', '1.FSV Mainz 05', 'Germany', 23, 8640000, null, null),
  ('Lorenzo Amatucci', 'Deportivo de La Coruña', 'Italy', 21, 8640000, null, null),
  ('Pablo Rosario', 'FC Porto', 'Dominican Republic', 28, 8640000, null, null),
  ('Pepelu', 'Valencia CF', 'Spain', 27, 8640000, null, null),
  ('Santiago Sosa', 'Clube de Regatas Vasco da Gama', 'Argentina', 26, 8640000, null, null),
  ('Senne Lynen', 'SV Werder Bremen', 'Belgium', 26, 8640000, null, null),
  ('Sofyan Amrabat', 'Ajax Amsterdam', 'Morocco', 29, 8640000, null, null),
  ('Soumaïla Diabaté', 'Red Bull Salzburg', 'Mali', 21, 8640000, null, null),
  ('Zé Lucas', 'Cruzeiro Esporte Clube', 'Brazil', 17, 8640000, null, null),
  ('Batista Mendy', 'Trabzonspor', 'France', 25, 8100000, null, null),
  ('Luca Lipani', 'US Sassuolo', 'Italy', 20, 8100000, null, null),
  ('Nail Umyarov', 'Spartak Moscow', 'Russia', 25, 8100000, null, null),
  ('Rolando Mandragora', 'Torino FC', 'Italy', 28, 8100000, null, null),
  ('Yacine Adli', 'Al-Shabab FC', 'France', 25, 8100000, null, null),
  ('Amadou Koné', 'NEOM SC', 'Cote d''Ivoire', 20, 7560000, null, null),
  ('Aníbal Moreno', 'CA River Plate', 'Argentina', 26, 7560000, null, null),
  ('Artem Karpukas', 'Zenit St. Petersburg', 'Russia', 23, 7560000, null, null),
  ('Ben Sheaf', 'Wrexham AFC', 'England', 27, 7560000, null, null),
  ('Bryan Cristante', 'AS Roma', 'Italy', 30, 7560000, null, null),
  ('Caio Alexandre', 'Esporte Clube Bahia', 'Brazil', 26, 7560000, null, null),
  ('Charles Vanhoutte', 'Feyenoord Rotterdam', 'Belgium', 27, 7560000, null, null),
  ('Daniil Fomin', 'Dynamo Moscow', 'Russia', 28, 7560000, null, null),
  ('Danil Glebov', 'Dynamo Moscow', 'Russia', 26, 7560000, null, null),
  ('Dmitriy Barinov', 'CSKA Moscow', 'Russia', 29, 7560000, null, null),
  ('Franco Romero', 'Deportivo Toluca', 'Argentina', 25, 7560000, null, null),
  ('Gabriel Moscardo', 'RCD Espanyol Barcelona', 'Brazil', 20, 7560000, null, null),
  ('Jens Cajuste', 'Málaga CF', 'Sweden', 26, 7560000, null, null),
  ('Joris Chotard', 'Stade Brestois 29', 'France', 24, 7560000, null, null),
  ('Maestro', 'Alanyaspor', 'Angola', 22, 7560000, null, null),
  ('Manu Silva', 'SL Benfica', 'Portugal', 24, 7560000, null, null),
  ('Nikola Moro', 'Bologna FC 1909', 'Croatia', 27, 7560000, null, null),
  ('Patrik Vydra', 'AC Sparta Prague', 'Czech Republic', 22, 7560000, null, null),
  ('Stije Resink', 'AZ Alkmaar', 'Netherlands', 22, 7560000, null, null),
  ('Yannik Engelhardt', 'SC Freiburg', 'Germany', 24, 7560000, null, null),
  ('Ramiz Zerrouki', 'FC Twente Enschede', 'Algeria', 27, 7020000, null, null),
  ('Antoni Kozubal', 'Lech Poznan', 'Poland', 21, 6480000, null, null),
  ('Facundo Bernal', 'Real Betis Balompié', 'Uruguay', 22, 6480000, null, null),
  ('Franco Ibarra', 'CA Rosario Central', 'Argentina', 24, 6480000, null, null),
  ('Hans Nicolussi Caviglia', 'Parma Calcio 1913', 'Italy', 25, 6480000, null, null),
  ('Ibrahima Sory Bangoura', 'KRC Genk', 'Guinea', 21, 6480000, null, null),
  ('Jefferson Lerma', 'Crystal Palace', 'Colombia', 31, 6480000, null, null),
  ('Johann Lepenant', 'FC Nantes', 'France', 23, 6480000, null, null),
  ('Junior Mwanga', 'Le Havre AC', 'France', 22, 6480000, null, null),
  ('Kristijan Jakic', 'PAOK Thessaloniki', 'Croatia', 28, 6480000, null, null),
  ('Lucas Gourna-Douath', 'Hull City', 'France', 22, 6480000, null, null),
  ('Luis Chávez', 'Dynamo Moscow', 'Mexico', 29, 6480000, null, null),
  ('Marlon Freitas', 'Sociedade Esportiva Palmeiras', 'Brazil', 30, 6480000, null, null),
  ('Nicolás Acevedo', 'Esporte Clube Bahia', 'Uruguay', 26, 6480000, null, null),
  ('Alexsander', 'Clube Atlético Mineiro', 'Brazil', 22, 5940000, null, null),
  ('Denzell García', 'FC Juárez', 'Mexico', 22, 5940000, null, null),
  ('Leonel Pérez', 'Racing Club', 'Argentina', 21, 5940000, null, null),
  ('Matteo Prati', 'Racing Santander', 'Italy', 22, 5940000, null, null),
  ('Santiago Ascacíbar', 'CA Boca Juniors', 'Argentina', 28, 5940000, null, null),
  ('Abdoulaye Kanté', 'Al-Ettifaq FC', 'Cote d''Ivoire', 20, 5400000, null, null),
  ('Arthur Piedfort', 'AJ Auxerre', 'Belgium', 20, 5400000, null, null),
  ('Cauan Barros', 'Clube de Regatas Vasco da Gama', 'Brazil', 21, 5400000, null, null),
  ('Christian Nørgaard', 'Everton FC', 'Denmark', 31, 5400000, null, null),
  ('Darko Nejasmic', 'NEC Nijmegen', 'Croatia', 26, 5400000, null, null),
  ('Doğucan Haspolat', 'KVC Westerlo', 'Türkiye', 25, 5400000, null, null),
  ('Ellyes Skhiri', '1.FC Köln', 'Tunisia', 30, 5400000, null, null),
  ('Erick Noriega', 'Grêmio Foot-Ball Porto Alegrense', 'Peru', 24, 5400000, null, null),
  ('Jordan Holsgrove', 'GD Estoril Praia', 'Scotland', 26, 5400000, null, null),
  ('Julien De Sart', 'Al-Rayyan SC', 'Belgium', 31, 5400000, null, null),
  ('Kevin Castaño', 'Clube Atlético Mineiro', 'Colombia', 25, 5400000, null, null),
  ('Kevin Pina', 'FC Krasnodar', 'Cape Verde', 28, 5400000, null, null),
  ('Matías Orozco', 'CD Castellón', 'Colombia', 18, 5400000, null, null),
  ('Matt Grimes', 'Coventry City', 'England', 30, 5400000, null, null),
  ('Matteo Cichella', 'Frosinone Calcio', 'Italy', 20, 5400000, null, null),
  ('Maxi Oyedele', 'RC Strasbourg Alsace', 'Poland', 21, 5400000, null, null),
  ('Maxime Lopez', 'Paris FC', 'France', 28, 5400000, null, null),
  ('Melayro Bogarde', 'LASK', 'Suriname', 23, 5400000, null, null),
  ('Novatus Miroshi', 'Göztepe', 'Tanzania', 23, 5400000, null, null),
  ('Pablo Maia', 'São Paulo Futebol Clube', 'Brazil', 23, 5400000, null, null),
  ('Pedro Chirivella', 'Panathinaikos', 'Spain', 28, 5400000, null, null),
  ('Rafael Luís', 'Genclerbirligi Ankara', 'Portugal', 20, 5400000, null, null),
  ('Santiago Castañeda', 'SC Paderborn 07', 'United States', 21, 5400000, null, null),
  ('Toby Collyer', 'West Bromwich Albion', 'England', 21, 5400000, null, null),
  ('Tochi Chukwuani', 'Rangers FC', 'Denmark', 22, 5400000, null, null),
  ('Tom van de Looi', 'FC Famalicão', 'Netherlands', 26, 5400000, null, null),
  ('Tomás Händel', 'Red Star Belgrade', 'Portugal', 25, 5400000, null, null),
  ('Ugo Raghouber', 'Burnley FC', 'France', 22, 5400000, null, null),
  ('Wilmar Barrios', 'Zenit St. Petersburg', 'Colombia', 32, 5400000, null, null),
  ('Youri Regeer', 'SV Werder Bremen', 'Netherlands', 22, 5400000, null, null),
  ('Alan Cervantes', 'CF América', 'Mexico', 27, 4860000, null, null),
  ('Andrés Cubas', 'Vancouver Whitecaps FC', 'Paraguay', 29, 4860000, null, null),
  ('Erick Pulgar', 'CR Flamengo', 'Chile', 31, 4860000, null, null),
  ('Fausto Vera', 'CA River Plate', 'Argentina', 25, 4860000, null, null),
  ('Giacomo Faticanti', 'US Avellino 1912', 'Italy', 21, 4860000, null, null),
  ('Mario Lemina', 'Galatasaray', 'Gabon', 32, 4860000, null, null),
  ('Pierre Lees-Melou', 'Paris FC', 'France', 32, 4860000, null, null),
  ('Santiago Homenchenko', 'Querétaro FC', 'Uruguay', 22, 4860000, null, null),
  ('Tochukwu Nnadi', 'Olympique Marseille', 'Nigeria', 22, 4860000, null, null),
  ('Tom Krauß', '1.FC Köln', 'Germany', 24, 4860000, null, null),
  ('Vicente Pizarro', 'CA Rosario Central', 'Chile', 23, 4860000, null, null),
  ('Adam Markhiev', '1.FC Nuremberg', 'Finland', 23, 4320000, null, null),
  ('Alpha Touré', 'FC Metz', 'Senegal', 19, 4320000, null, null),
  ('Amir Hadziahmetovic', 'Ludogorets Razgrad', 'Bosnia-Herzegovina', 28, 4320000, null, null),
  ('Antoine Makoumbou', 'UC Sampdoria', 'Congo', 27, 4320000, null, null),
  ('Boubacar Traoré', 'Wolverhampton Wanderers', 'Mali', 24, 4320000, null, null),
  ('César Araújo', 'Tigres UANL', 'Uruguay', 24, 4320000, null, null),
  ('David Ozoh', 'Derby County', 'England', 20, 4320000, null, null),
  ('Djé D''Avilla', 'Chicago Fire FC', 'Cote d''Ivoire', 22, 4320000, null, null),
  ('Djibril Soumaré', 'Stoke City', 'Senegal', 22, 4320000, null, null),
  ('Elisha Owusu', 'Erzurumspor FK', 'Ghana', 28, 4320000, null, null),
  ('Étienne Camara', 'Panathinaikos', 'France', 22, 4320000, null, null),
  ('Fabricio Díaz', 'Al-Gharafa SC', 'Uruguay', 22, 4320000, null, null),
  ('Gregore', 'Al-Rayyan SC', 'Brazil', 31, 4320000, null, null),
  ('Ivan Zhelizko', 'Ludogorets Razgrad', 'Ukraine', 24, 4320000, null, null),
  ('Jesper Karlström', 'Udinese Calcio', 'Sweden', 30, 4320000, null, null),
  ('Kofi Amoako', 'Hamburger SV', 'Germany', 20, 4320000, null, null),
  ('Leonardo Colombo', 'AC Monza', 'Italy', 20, 4320000, null, null),
  ('Luca Regiardo', 'CA Newell''s Old Boys', 'Argentina', 19, 4320000, null, null),
  ('Marwan Ateya', 'Al Ahly FC', 'Egypt', 27, 4320000, null, null),
  ('Mathías Villasanti', 'Grêmio Foot-Ball Porto Alegrense', 'Paraguay', 28, 4320000, null, null),
  ('Mirko Topic', 'Norwich City', 'Serbia', 24, 4320000, null, null),
  ('Mirza Catovic', 'FC Barcelona Atlètic', 'Germany', 18, 4320000, null, null),
  ('Mory Gbane', 'Stade Reims', 'Cote d''Ivoire', 25, 4320000, null, null),
  ('Njegos Petrovic', 'FK Vojvodina Novi Sad', 'Serbia', 26, 4320000, null, null),
  ('Raniele', 'Sport Club Corinthians Paulista', 'Brazil', 29, 4320000, null, null),
  ('Salis Abdul Samed', 'OGC Nice', 'Ghana', 25, 4320000, null, null),
  ('Thiago Helguera', 'Atlético Madrileño', 'Uruguay', 19, 4320000, null, null),
  ('Tygo Land', 'FC Groningen', 'Netherlands', 19, 4320000, null, null),
  ('Vasilije Novicic', 'FK IMT Belgrad', 'Serbia', 17, 4320000, null, null),
  ('Veldin Hodza', 'Rubin Kazan', 'Kosovo', 23, 4320000, null, null),
  ('Wataru Endo', 'Liverpool FC', 'Japan', 32, 4320000, null, null),
  ('Adrian Șut', 'Levadiakos', 'Romania', 26, 3780000, null, null),
  ('Bartosz Slisz', 'Bröndby IF', 'Poland', 26, 3780000, null, null),
  ('Braian Ojeda', 'Orlando City SC', 'Paraguay', 25, 3780000, null, null),
  ('Christopher Martins', 'Spartak Moscow', 'Luxembourg', 28, 3780000, null, null),
  ('Danilo Cataldi', 'SS Lazio', 'Italy', 31, 3780000, null, null),
  ('Edwin Cerrillo', 'CF América', 'United States', 25, 3780000, null, null),
  ('Elián Irala', 'Shabab Al-Ahli Club', 'Argentina', 21, 3780000, null, null),
  ('Fidel Ambríz', 'CF Monterrey', 'Mexico', 22, 3780000, null, null),
  ('Ibrahima Diallo', 'Al-Shahania SC', 'France', 26, 3780000, null, null),
  ('Jamie Roche', 'KV Kortrijk', 'Sweden', 24, 3780000, null, null),
  ('Joe Bell', 'Viking FK', 'New Zealand', 26, 3780000, null, null),
  ('José Caicedo', 'Portland Timbers', 'Colombia', 23, 3780000, null, null),
  ('Juljan Shehu', 'Widzew Lodz', 'Albania', 27, 3780000, null, null),
  ('Lorenzo Scipioni', 'Olympiacos Piraeus', 'Argentina', 21, 3780000, null, null),
  ('Lucas Sanabria', 'Los Angeles Galaxy', 'Uruguay', 22, 3780000, null, null),
  ('Marc Aguado', 'Elche CF', 'Spain', 25, 3780000, null, null),
  ('Niklas Dorsch', 'Toronto FC', 'Germany', 27, 3780000, null, null),
  ('Patrik Hellebrand', 'Korona Kielce', 'Czech Republic', 26, 3780000, null, null),
  ('Rade Krunic', 'Red Star Belgrade', 'Bosnia-Herzegovina', 32, 3780000, null, null),
  ('Rodrigo Villagra', 'Sport Club Internacional', 'Argentina', 24, 3780000, null, null),
  ('Salih Özcan', 'Besiktas JK', 'Türkiye', 27, 3780000, null, null),
  ('Sivert Mannsverk', 'AC Sparta Prague', 'Norway', 23, 3780000, null, null),
  ('William Clem', 'FC Copenhagen', 'Denmark', 21, 3780000, null, null),
  ('Marten de Roon', 'AS Roma', 'Netherlands', 34, 3456000, null, null),
  ('Adam Randell', 'Bristol City', 'England', 25, 3240000, null, null),
  ('Aiden O''Neill', 'New York City FC', 'Australia', 27, 3240000, null, null),
  ('Aliou Dieng', 'Valencia CF', 'Mali', 28, 3240000, null, null),
  ('Aschraf El Mahdioui', 'Al-Taawoun FC', 'Morocco', 29, 3240000, null, null),
  ('Benjamin André', 'LOSC Lille', 'France', 35, 3240000, null, null),
  ('Billy Mitchell', 'Sheffield Wednesday', 'England', 24, 3240000, null, null),
  ('Danley Jean Jacques', 'Philadelphia Union', 'Haiti', 25, 3240000, null, null),
  ('Fredrik Hammar', 'KV Mechelen', 'Sweden', 24, 3240000, null, null),
  ('Hamzat Ojediran', 'Colorado Rapids', 'Nigeria', 22, 3240000, null, null),
  ('Hiroki Akiyama', 'SV Darmstadt 98', 'Japan', 25, 3240000, null, null),
  ('Ibrahim Fofana', 'KVC Westerlo', 'Cote d''Ivoire', 22, 3240000, null, null),
  ('Jacob Wright', 'Norwich City', 'England', 20, 3240000, null, null),
  ('Keaton Parks', 'New York City FC', 'United States', 28, 3240000, null, null),
  ('Leonel Picco', 'Clube do Remo (PA)', 'Argentina', 27, 3240000, null, null),
  ('Mateja Stjepanović', 'Moreirense FC', 'Serbia', 21, 3240000, null, null),
  ('Mathys de Carvalho', 'Al-Diriyah FC', 'Portugal', 20, 3240000, null, null),
  ('Miguel Chaiwa', 'Hibernian FC', 'Zambia', 21, 3240000, null, null),
  ('Mohanad Lasheen', 'Pyramids FC', 'Egypt', 29, 3240000, null, null),
  ('Nicolás Fonseca', 'Coritiba Foot Ball Club', 'Uruguay', 27, 3240000, null, null),
  ('Oumar Ngom', 'US Lecce', 'Mauritania', 21, 3240000, null, null),
  ('Pedro Ferreira', 'CD Santa Clara', 'Portugal', 27, 3240000, null, null),
  ('Péter Baráth', 'SK Sigma Olomouc', 'Hungary', 23, 3240000, null, null),
  ('Ryan Wintle', 'Milton Keynes Dons', 'England', 28, 3240000, null, null),
  ('Salvatore Esposito', 'UC Sampdoria', 'Italy', 25, 3240000, null, null),
  ('Tamar Svetlin', 'AS Saint-Étienne', 'Slovenia', 24, 3240000, null, null),
  ('Tomás Belmonte', 'CA Boca Juniors', 'Argentina', 27, 3240000, null, null),
  ('Tomás Pérez', 'Clube Atlético Mineiro', 'Argentina', 20, 3240000, null, null),
  ('Tommy Marqués', 'SC Braga', 'Spain', 19, 3240000, null, null),
  ('Ugochukwu Iwu', 'Rubin Kazan', 'Armenia', 26, 3240000, null, null),
  ('Uros Racic', 'Aris Thessaloniki', 'Serbia', 27, 3240000, null, null),
  ('Jadsom', 'Al-Wahda FC', 'Brazil', 24, 3024000, null, null),
  ('Lucas Ventura', 'Hapoel Beer Sheva', 'Brazil', 27, 3024000, null, null),
  ('Marius Marin', 'Al-Nasr SC (UAE)', 'Romania', 27, 3024000, null, null),
  ('Teboho Mokoena', 'Mamelodi Sundowns FC', 'South Africa', 28, 3024000, null, null),
  ('Agustín Cardozo', 'CA Lanús', 'Argentina', 28, 2700000, null, null),
  ('Aldo López', 'Santos Laguna', 'Mexico', 25, 2700000, null, null),
  ('Allan', 'Sport Club Corinthians Paulista', 'Brazil', 28, 2700000, null, null),
  ('Andréa Le Borgne', 'Hellas Verona', 'France', 19, 2700000, null, null),
  ('Andrej Bacanin', 'FC Basel 1893', 'Serbia', 18, 2700000, null, null),
  ('Andrés Perea', 'New York City FC', 'United States', 25, 2700000, null, null),
  ('Anzor Mekvabishvili', 'Chicago Fire FC', 'Georgia', 24, 2700000, null, null),
  ('Baptiste Santamaria', 'PAOK Thessaloniki', 'France', 30, 2700000, null, null),
  ('Baralhas', 'Esporte Clube Vitória', 'Brazil', 27, 2700000, null, null),
  ('Berat Özdemir', 'Corum FK', 'Türkiye', 27, 2700000, null, null),
  ('Brian De Keersmaecker', 'Bristol City', 'Belgium', 25, 2700000, null, null),
  ('Charles Pickel', 'Sharjah FC', 'DR Congo', 28, 2700000, null, null),
  ('Connor Barron', 'Middlesbrough FC', 'Scotland', 23, 2700000, null, null),
  ('David Ayala', 'Inter Miami CF', 'Argentina', 23, 2700000, null, null),
  ('Dirk Proper', 'SC Heerenveen', 'Netherlands', 23, 2700000, null, null),
  ('Florian Grillitsch', 'Frosinone Calcio', 'Austria', 30, 2700000, null, null),
  ('Giacomo Calò', 'Frosinone Calcio', 'Italy', 28, 2700000, null, null),
  ('Gustav Berggren', 'Lech Poznan', 'Sweden', 28, 2700000, null, null),
  ('Ignacio Miramón', 'Club de Gimnasia y Esgrima La Plata', 'Argentina', 22, 2700000, null, null),
  ('Ignacio Perruzzi', 'CA San Lorenzo de Almagro', 'Argentina', 20, 2700000, null, null),
  ('Ignacio Saavedra', 'Rubin Kazan', 'Chile', 26, 2700000, null, null),
  ('Jakub Kaluzinski', 'Basaksehir FK', 'Poland', 23, 2700000, null, null),
  ('Jon Gorenc Stankovic', 'SK Sturm Graz', 'Slovenia', 29, 2700000, null, null),
  ('Jonathan Varane', 'Queens Park Rangers', 'Martinique', 24, 2700000, null, null),
  ('Jorge Rodríguez', 'CF Monterrey', 'Argentina', 30, 2700000, null, null),
  ('Josen Escobar', 'CD América de Cali', 'Colombia', 21, 2700000, null, null),
  ('Joshua Kitolano', 'FK Bodø/Glimt', 'Norway', 24, 2700000, null, null),
  ('Juergen Elitim', 'Bursaspor', 'Colombia', 26, 2700000, null, null),
  ('Kartal Yılmaz', 'Besiktas JK', 'Türkiye', 25, 2700000, null, null),
  ('Kasper Boogaard', 'Willem II Tilburg', 'Netherlands', 19, 2700000, null, null),
  ('Kasper Davidsen', 'Holstein Kiel', 'Denmark', 20, 2700000, null, null),
  ('Kevin Gutiérrez', 'AA Argentinos Juniors', 'Argentina', 28, 2700000, null, null),
  ('Kristijan Belic', 'Maccabi Tel Aviv', 'Serbia', 24, 2700000, null, null),
  ('Lucas Romero', 'Cruzeiro Esporte Clube', 'Argentina', 31, 2700000, null, null),
  ('Lucas Torró', 'CA Osasuna', 'Spain', 31, 2700000, null, null),
  ('Lukasz Poreba', 'SV 07 Elversberg', 'Poland', 25, 2700000, null, null),
  ('Marius Courcoul', 'RAAL La Louvière', 'France', 19, 2700000, null, null),
  ('Marko Bulat', 'Raków Częstochowa', 'Croatia', 24, 2700000, null, null),
  ('Obinna Nwobodo', 'FC Cincinnati', 'Nigeria', 29, 2700000, null, null),
  ('Pape Diong', 'KVC Westerlo', 'Senegal', 19, 2700000, null, null),
  ('Patrick de Paula', 'Sport Club do Recife', 'Brazil', 26, 2700000, null, null),
  ('Pedro Pedraza', 'Club Necaxa', 'Mexico', 25, 2700000, null, null),
  ('Philipp Maybach', 'Austria Vienna', 'Austria', 18, 2700000, null, null),
  ('Sam Field', 'Norwich City', 'England', 27, 2700000, null, null),
  ('Santiago Colombatto', 'Club León U21', 'Argentina', 28, 2700000, null, null),
  ('Taisei Abe', 'Holstein Kiel', 'Japan', 21, 2700000, null, null),
  ('Thiago Maia', 'Sport Club Internacional', 'Brazil', 28, 2700000, null, null),
  ('Walace', 'Esporte Clube Vitória', 'Brazil', 30, 2700000, null, null),
  ('Bruno Leyes', 'Club Atlético Tigre', 'Argentina', 24, 2484000, null, null),
  ('Edimilson Fernandes', 'BSC Young Boys', 'Switzerland', 29, 2376000, null, null),
  ('Felipe Peña Biafore', 'CA Lanús', 'Argentina', 24, 2376000, null, null),
  ('Nikolas Sattlberger', 'KRC Genk', 'Austria', 21, 2376000, null, null),
  ('Andri Fannar Baldursson', 'Kasimpasa', 'Iceland', 23, 2160000, null, null),
  ('Andrusw Araujo', 'Polissya Zhytomyr', 'Venezuela', 22, 2160000, null, null),
  ('Callum McGregor', 'Celtic FC', 'Scotland', 32, 2160000, null, null),
  ('Casper De Norre', 'Millwall FC', 'Belgium', 28, 2160000, null, null),
  ('Chris Durkin', 'St. Louis CITY SC', 'United States', 25, 2160000, null, null),
  ('Conor Coventry', 'Charlton Athletic', 'Ireland', 25, 2160000, null, null),
  ('Damián García', 'Shabab Al-Ahli Club', 'Uruguay', 22, 2160000, null, null),
  ('Dani Silva', 'Widzew Lodz', 'Portugal', 25, 2160000, null, null),
  ('Daniel Edelman', 'St. Louis CITY SC', 'United States', 22, 2160000, null, null),
  ('Danilo Barbosa', 'Grêmio Foot-Ball Porto Alegrense', 'Brazil', 29, 2160000, null, null),
  ('Danny Leyva', 'Club Necaxa', 'United States', 22, 2160000, null, null),
  ('Davy van den Berg', 'FC Utrecht', 'Netherlands', 25, 2160000, null, null),
  ('Elliot Watt', 'Samsunspor', 'Scotland', 25, 2160000, null, null),
  ('Enric Llansana', 'RSC Anderlecht', 'Netherlands', 24, 2160000, null, null),
  ('Federico Navarro', 'CA Rosario Central', 'Argentina', 25, 2160000, null, null),
  ('Gaius Makouta', 'Alanyaspor', 'Congo', 28, 2160000, null, null),
  ('Giuseppe Leone', 'Pisa Sporting Club', 'Italy', 24, 2160000, null, null),
  ('Houssem Mrezigue', 'Dinamo Makhachkala', 'Algeria', 25, 2160000, null, null),
  ('Iker Muñoz', 'CA Osasuna', 'Spain', 23, 2160000, null, null),
  ('Ivan Lepinjica', 'Sabah FK', 'Croatia', 26, 2160000, null, null),
  ('Ivan Šunjić', 'Pafos FC', 'Bosnia-Herzegovina', 29, 2160000, null, null),
  ('Iván Tona', 'Club Tijuana', 'Mexico', 25, 2160000, null, null),
  ('Johan Caicedo', 'Atlético de San Luis', 'Colombia', 21, 2160000, null, null),
  ('Jordy Alcívar', 'Independiente del Valle', 'Ecuador', 26, 2160000, null, null),
  ('Josh Atencio', 'Colorado Rapids', 'United States', 23, 2160000, null, null),
  ('Kalidou Sidibé', 'Akhmat Grozny', 'Mali', 26, 2160000, null, null),
  ('Kervin Arriaga', 'AEK Athens', 'Honduras', 27, 2160000, null, null),
  ('Lukasz Lakomy', 'Oud-Heverlee Leuven', 'Poland', 24, 2160000, null, null),
  ('Maguette Gueye', 'Racing Santander', 'Senegal', 23, 2160000, null, null),
  ('Marco Pompetti', 'Calcio Padova', 'Italy', 25, 2160000, null, null),
  ('Mark Brink', 'FC Nordsjaelland', 'Denmark', 27, 2160000, null, null),
  ('Mateusz Łęgowski', 'Motor Lublin', 'Poland', 22, 2160000, null, null),
  ('Maximiliano Amarfil', 'Club Atlético Platense', 'Argentina', 24, 2160000, null, null),
  ('Melker Heier', 'IK Sirius', 'Sweden', 24, 2160000, null, null),
  ('Mykola Mykhaylenko', 'Dynamo Kyiv', 'Ukraine', 24, 2160000, null, null),
  ('Neto Moura', 'Mirassol Futebol Clube (SP)', 'Brazil', 29, 2160000, null, null),
  ('Nicolás Tripichio', 'CA San Lorenzo de Almagro', 'Argentina', 29, 2160000, null, null),
  ('Oskar Repka', 'Raków Częstochowa', 'Poland', 26, 2160000, null, null),
  ('Ousmane Diakité', 'West Bromwich Albion', 'Mali', 25, 2160000, null, null),
  ('Pedro Bicalho', 'Qarabağ FK', 'Brazil', 24, 2160000, null, null),
  ('Peter Pokorný', 'Slovan Bratislava', 'Slovakia', 24, 2160000, null, null),
  ('Philip Brittijn', 'Fortuna Sittard', 'Netherlands', 21, 2160000, null, null),
  ('Rani Khedira', '1.FC Union Berlin', 'Tunisia', 31, 2160000, null, null),
  ('Rodrigo Dourado', 'FC Juárez', 'Brazil', 31, 2160000, null, null),
  ('Rodrigo Echeverría', 'Club León FC', 'Chile', 30, 2160000, null, null),
  ('Ron Schallenberg', 'FC Schalke 04', 'Germany', 27, 2160000, null, null),
  ('Ryan Fosso', 'Standard Liège', 'Cameroon', 23, 2160000, null, null),
  ('Santiago Longo', 'Club Atlético Belgrano', 'Argentina', 27, 2160000, null, null),
  ('Sasa Zdjelar', 'FC Noah Yerevan', 'Serbia', 30, 2160000, null, null),
  ('Satoshi Tanaka', 'FC Schalke 04', 'Japan', 23, 2160000, null, null),
  ('Taylor Gardner-Hickman', 'Birmingham City', 'England', 24, 2160000, null, null),
  ('Yannick Bright', 'Inter Miami CF', 'Italy', 24, 2160000, null, null),
  ('Yannik Keitel', 'FC Augsburg', 'Germany', 25, 2160000, null, null),
  ('Yvan Neyou', 'Volos NFC', 'Cameroon', 28, 2160000, null, null),
  ('Zanocelo', 'Ceará Sporting Club', 'Brazil', 24, 2160000, null, null);

create temporary table r669_fix (
  player_name text not null,
  from_club text not null,
  to_club text not null
) on commit drop;

insert into r669_fix (player_name, from_club, to_club) values
  ('Yves Bissouma', 'Without Club', 'Ajax Amsterdam'),
  ('Ismaël Bennacer', 'Without Club', 'Al-Gharafa SC'),
  ('Marcelo Brozović', 'Without Club', 'Al-Sadd SC'),
  ('Leander Dendoncker', 'Without Club', 'HNK Hajduk Split');

create temporary table r669_age (
  player_name text not null,
  from_age integer not null,
  to_age integer not null
) on commit drop;

insert into r669_age (player_name, from_age, to_age) values
  ('Leander Dendoncker', 31, 30);

create temporary table r669_before on commit drop as
select
  (select count(*) from public.player_market_values where year = 2026) as total_2026,
  (select count(*) from public.player_market_values where year = 2026 and position = 'Defensive Midfield') as dm_2026;

do $$
declare
  n integer;
  bad text;
begin
  select count(*) into n from r669_dm;
  if n <> 366 then raise exception 'Round 669: expected 366 staged rows, staged %', n; end if;

  select count(*) into n from r669_fix;
  if n <> 4 then raise exception 'Round 669: expected 4 club corrections, staged %', n; end if;

  select count(*) into n from r669_age;
  if n <> 1 then raise exception 'Round 669: expected 1 age corrections, staged %', n; end if;

  select dm_2026 into n from r669_before;
  if n <> 46 then raise exception 'Round 669: expected the 46 checked Defensive Midfield rows in 2026 before, found %', n; end if;

  -- no two staged rows are one folded name
  select string_agg(f, ', ') into bad from (
    select public.fold_name(player_name) as f from r669_dm group by 1 having count(*) > 1
  ) d;
  if bad is not null then raise exception 'Round 669: staged rows repeat a name: %', bad; end if;

  -- no staged row duplicates a person already present in 2026
  select string_agg(d.player_name || ' (' || p.club || ')', ', ') into bad
  from r669_dm d
  join public.player_market_values p on p.year = 2026 and p.name_folded = public.fold_name(d.player_name)
  where d.namesake_club is null;
  if bad is not null then raise exception 'Round 669: a 2026 row already carries these names: %', bad; end if;

  -- a declared namesake's existing 2026 row is exactly the other man, and only him
  select string_agg(d.player_name, ', ') into bad
  from r669_dm d
  where d.namesake_club is not null
    and (
      (select count(*) from public.player_market_values p
        where p.year = 2026 and p.name_folded = public.fold_name(d.player_name)) <> 1
      or not exists (select 1 from public.player_market_values p
        where p.year = 2026 and p.name_folded = public.fold_name(d.player_name)
          and p.club = d.namesake_club and p.position = d.namesake_position)
      or exists (select 1 from public.player_market_values p
        where p.year = 2026 and p.name_folded = public.fold_name(d.player_name) and p.club = d.club)
    );
  if bad is not null then raise exception 'Round 669: the namesake precondition does not hold for: %', bad; end if;

  -- each club correction targets exactly one 2026 row, still at the club that was checked
  select string_agg(f.player_name, ', ') into bad
  from r669_fix f
  where (select count(*) from public.player_market_values p
          where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield') <> 1
     or not exists (select 1 from public.player_market_values p
          where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.from_club);
  if bad is not null then raise exception 'Round 669: a club correction no longer matches its row: %', bad; end if;

  -- each age correction targets exactly one 2026 row, still at the age that was checked
  select string_agg(a.player_name, ', ') into bad
  from r669_age a
  where (select count(*) from public.player_market_values p
          where p.year = 2026 and p.player_name = a.player_name and p.position = 'Defensive Midfield') <> 1
     or not exists (select 1 from public.player_market_values p
          where p.year = 2026 and p.player_name = a.player_name and p.position = 'Defensive Midfield' and p.age = a.from_age);
  if bad is not null then raise exception 'Round 669: an age correction no longer matches its row: %', bad; end if;
end $$;

insert into public.player_market_values (player_name, position, age, nationality, club, market_value_usd, year)
select player_name, 'Defensive Midfield', age, nationality, club, market_value_usd, 2026
from r669_dm;

update public.player_market_values p
set club = f.to_club
from r669_fix f
where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.from_club;

update public.player_market_values p
set age = a.to_age
from r669_age a
where p.year = 2026 and p.player_name = a.player_name and p.position = 'Defensive Midfield' and p.age = a.from_age;

do $$
declare
  n integer;
  b record;
begin
  select * into b from r669_before;

  select count(*) into n from public.player_market_values where year = 2026 and position = 'Defensive Midfield';
  if n <> 46 + 366 then raise exception 'Round 669: expected % Defensive Midfield rows in 2026 after, found %', 46 + 366, n; end if;

  select count(*) into n from public.player_market_values where year = 2026;
  if n <> b.total_2026 + 366 then raise exception 'Round 669: expected % rows in 2026 after, found %', b.total_2026 + 366, n; end if;

  -- every staged row landed exactly once, with its own values
  select count(*) into n from r669_dm d
  where (select count(*) from public.player_market_values p
          where p.year = 2026 and p.player_name = d.player_name and p.club = d.club
            and p.position = 'Defensive Midfield' and p.nationality = d.nationality
            and p.age = d.age and p.market_value_usd = d.market_value_usd) <> 1;
  if n <> 0 then raise exception 'Round 669: % staged rows did not land exactly once', n; end if;

  -- every club correction took
  select count(*) into n from r669_fix f
  where not exists (select 1 from public.player_market_values p
    where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.to_club);
  if n <> 0 then raise exception 'Round 669: % club corrections did not take', n; end if;

  -- every age correction took
  select count(*) into n from r669_age a
  where not exists (select 1 from public.player_market_values p
    where p.year = 2026 and p.player_name = a.player_name and p.position = 'Defensive Midfield' and p.age = a.to_age);
  if n <> 0 then raise exception 'Round 669: % age corrections did not take', n; end if;
end $$;

commit;
