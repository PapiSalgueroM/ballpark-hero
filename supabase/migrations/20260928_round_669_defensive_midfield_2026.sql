-- Round 669 (2026-09-28): World XI knows its defensive midfielders again.
--
-- UNAPPLIED. Written for review; the lead applies it. Every statement below is
-- guarded: a precondition that does not hold raises and nothing is written.
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
--   1. 399 year-2026 "Defensive Midfield" rows. The population is Transfermarkt's
--      most valuable players at that main position (the top 500, EUR 140m down to
--      EUR 2m, read 2026-09-28), minus the men the 2026 snapshot already carries
--      and minus every row the two hosts (Transfermarkt and FotMob) did not agree
--      on for identity, club, position and value. Value is Transfermarkt's figure
--      times 1.08, the convention every other row follows.
--   2. 4 club corrections among the existing 46, where both hosts name a
--      different club today than the row does.
--
-- Keyed so a row cannot duplicate a person already present: no new row may share
-- a folded name with ANY existing 2026 row, except the two namesakes declared
-- here (Vitinha, Nico González), whose existing 2026 row must be exactly the
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
  ('Vitinha', 'Paris Saint-Germain', 'Portugal', 26, 151200000, 'Genoa CFC', 'Centre-Forward'),
  ('Aleksandar Pavlovic', 'Bayern Munich', 'Germany', 22, 97200000, null, null),
  ('Adam Wharton', 'Crystal Palace', 'England', 22, 75600000, null, null),
  ('Carlos Baleba', 'Manchester United', 'Cameroon', 22, 59400000, null, null),
  ('Kaishu Sano', '1.FSV Mainz 05', 'Japan', 25, 54000000, null, null),
  ('Angelo Stiller', 'VfB Stuttgart', 'Germany', 25, 48600000, null, null),
  ('James Garner', 'Everton FC', 'England', 25, 48600000, null, null),
  ('Morten Hjulmand', 'Atlético de Madrid', 'Denmark', 27, 48600000, null, null),
  ('Nico González', 'Newcastle United', 'Spain', 24, 43200000, 'Juventus FC', 'Left Winger'),
  ('Máximo Perrone', 'Como 1907', 'Argentina', 23, 37800000, null, null),
  ('Alan Varela', 'FC Porto', 'Argentina', 25, 34560000, null, null),
  ('Aleksandar Stanković', 'Inter Milan', 'Serbia', 21, 34560000, null, null),
  ('Hayden Hackney', 'Everton FC', 'England', 24, 34560000, null, null),
  ('Ethan Ampadu', 'Leeds United', 'Wales', 26, 32400000, null, null),
  ('Leon Avdullahu', 'TSG 1899 Hoffenheim', 'Kosovo', 22, 32400000, null, null),
  ('Tyler Morton', 'Olympique Lyon', 'England', 23, 32400000, null, null),
  ('Anton Stach', 'Leeds United', 'Germany', 27, 30240000, null, null),
  ('Jack Hinshelwood', 'Brighton & Hove Albion', 'England', 21, 30240000, null, null),
  ('Jon Gorrotxategi', 'Real Sociedad', 'Spain', 24, 27000000, null, null),
  ('Manuel Ugarte', 'Manchester United', 'Uruguay', 25, 27000000, null, null),
  ('Nicolas Seiwald', 'RB Leipzig', 'Austria', 25, 27000000, null, null),
  ('Richard Ríos', 'Al-Ittihad Club', 'Colombia', 26, 27000000, null, null),
  ('Sander Berge', 'Fulham FC', 'Norway', 28, 27000000, null, null),
  ('Tyler Adams', 'AFC Bournemouth', 'United States', 27, 27000000, null, null),
  ('Raphael Onyedika', 'Eintracht Frankfurt', 'Nigeria', 25, 24840000, null, null),
  ('Youssouf Fofana', 'Sevilla FC', 'France', 27, 24840000, null, null),
  ('Ardon Jashari', 'AC Milan', 'Switzerland', 24, 23760000, null, null),
  ('Lesley Ugochukwu', 'Galatasaray', 'France', 22, 23760000, null, null),
  ('Roméo Lavia', 'Chelsea FC', 'Belgium', 22, 23760000, null, null),
  ('Samuele Ricci', 'Como 1907', 'Italy', 25, 23760000, null, null),
  ('Arthur Vermeeren', 'Royal Antwerp FC', 'Belgium', 21, 21600000, null, null),
  ('Billy Gilmour', 'SSC Napoli', 'Scotland', 25, 21600000, null, null),
  ('Chema Andrés', 'Brighton & Hove Albion', 'Spain', 21, 21600000, null, null),
  ('Equi Fernández', 'Bayer 04 Leverkusen', 'Argentina', 24, 21600000, null, null),
  ('Ibrahim Sangaré', 'Nottingham Forest', 'Cote d''Ivoire', 28, 21600000, null, null),
  ('Kennet Eichhorn', 'Bayer 04 Leverkusen', 'Germany', 17, 21600000, null, null),
  ('Mandela Keita', 'Parma Calcio 1913', 'Belgium', 24, 21600000, null, null),
  ('Aladji Bamba', 'Newcastle United', 'France', 20, 19440000, null, null),
  ('Lamare Bogarde', 'Aston Villa', 'Netherlands', 22, 19440000, null, null),
  ('Marc Casadó', 'Deportivo de La Coruña', 'Spain', 23, 19440000, null, null),
  ('Nicolas Raskin', 'Rangers FC', 'Belgium', 25, 18360000, null, null),
  ('Florentino', 'Ipswich Town', 'Portugal', 27, 17280000, null, null),
  ('Jerdy Schouten', 'PSV Eindhoven', 'Netherlands', 29, 17280000, null, null),
  ('Martinelli', 'Fluminense Football Club', 'Brazil', 24, 17280000, null, null),
  ('Oussama Targhalline', 'Feyenoord Rotterdam', 'Morocco', 24, 17280000, null, null),
  ('Vitaly Janelt', 'Brentford FC', 'Germany', 28, 17280000, null, null),
  ('Dário Essugo', 'RC Strasbourg Alsace', 'Portugal', 21, 16200000, null, null),
  ('İsmail Yüksek', 'Fenerbahce', 'Türkiye', 27, 16200000, null, null),
  ('Jorthy Mokio', 'Ajax Amsterdam', 'DR Congo', 18, 16200000, null, null),
  ('Lucien Agoumé', 'Sevilla FC', 'France', 24, 16200000, null, null),
  ('Morten Frendrup', 'Genoa CFC', 'Denmark', 25, 16200000, null, null),
  ('Ngal''ayel Mukau', 'LOSC Lille', 'DR Congo', 21, 16200000, null, null),
  ('Peer Koopmeiners', 'AZ Alkmaar', 'Netherlands', 26, 16200000, null, null),
  ('Samú Costa', 'Al-Nassr FC', 'Portugal', 25, 16200000, null, null),
  ('Shea Charles', 'Fulham FC', 'Northern Ireland', 22, 16200000, null, null),
  ('Soungoutou Magassa', 'West Ham United', 'France', 22, 16200000, null, null),
  ('Érik Lira', 'CD Cruz Azul', 'Mexico', 26, 15120000, null, null),
  ('Santiago Hezze', 'Olympiacos Piraeus', 'Argentina', 24, 15120000, null, null),
  ('Aljoscha Kemlein', '1.FC Union Berlin', 'Germany', 22, 12960000, null, null),
  ('Azor Matusiwa', 'Ipswich Town', 'Netherlands', 28, 12960000, null, null),
  ('Enzo Barrenechea', 'SL Benfica', 'Argentina', 25, 12960000, null, null),
  ('Gianluca Gaetano', 'Atalanta BC', 'Italy', 26, 12960000, null, null),
  ('Ilia Gruev', 'Leeds United', 'Bulgaria', 26, 12960000, null, null),
  ('Kristjan Asllani', 'Al-Jazira Club', 'Albania', 24, 12960000, null, null),
  ('Noël Aséko', 'Eintracht Frankfurt', 'Germany', 20, 12960000, null, null),
  ('Patrick Berg', 'FK Bodø/Glimt', 'Norway', 28, 12960000, null, null),
  ('Patrick Osterhage', 'SC Freiburg', 'Germany', 26, 12960000, null, null),
  ('Urko González de Zárate', 'RCD Espanyol Barcelona', 'Spain', 25, 12960000, null, null),
  ('Antonio Blanco', 'Deportivo Alavés', 'Spain', 26, 10800000, null, null),
  ('Cajetan Lenz', 'TSG 1899 Hoffenheim', 'Germany', 20, 10800000, null, null),
  ('Evertton Araújo', 'CR Flamengo', 'Brazil', 23, 10800000, null, null),
  ('Flynn Downes', 'Southampton FC', 'England', 27, 10800000, null, null),
  ('Freddie Potts', 'Club Brugge KV', 'England', 23, 10800000, null, null),
  ('Mario Martín', 'Getafe CF', 'Spain', 22, 10800000, null, null),
  ('Milton Delgado', 'CA Boca Juniors', 'Argentina', 21, 10800000, null, null),
  ('Tanner Tessmann', 'Olympique Lyon', 'United States', 25, 10800000, null, null),
  ('Volodymyr Brazhko', 'Dynamo Kyiv', 'Ukraine', 24, 10800000, null, null),
  ('Mohamed Camara', 'Al-Sadd SC', 'Mali', 26, 9720000, null, null),
  ('Nicolai Remberg', 'Hamburger SV', 'Germany', 26, 9720000, null, null),
  ('Orel Mangala', 'Getafe CF', 'Belgium', 28, 9720000, null, null),
  ('Aleksandr Chernikov', 'FC Krasnodar', 'Russia', 26, 8640000, null, null),
  ('Alonzo Engwanda', 'FC Utrecht', 'Belgium', 23, 8640000, null, null),
  ('Anthony Dennis', 'Al-Jazira Club', 'Nigeria', 22, 8640000, null, null),
  ('Atakan Karazor', 'VfB Stuttgart', 'Türkiye', 29, 8640000, null, null),
  ('Demir Ege Tıknaz', 'SC Braga', 'Türkiye', 22, 8640000, null, null),
  ('Eric Martel', '1.FSV Mainz 05', 'Germany', 24, 8640000, null, null),
  ('Lorenzo Amatucci', 'Deportivo de La Coruña', 'Italy', 22, 8640000, null, null),
  ('Pablo Rosario', 'FC Porto', 'Dominican Republic', 29, 8640000, null, null),
  ('Pepelu', 'Valencia CF', 'Spain', 28, 8640000, null, null),
  ('Santiago Sosa', 'Clube de Regatas Vasco da Gama', 'Argentina', 27, 8640000, null, null),
  ('Senne Lynen', 'SV Werder Bremen', 'Belgium', 27, 8640000, null, null),
  ('Sofyan Amrabat', 'Ajax Amsterdam', 'Morocco', 30, 8640000, null, null),
  ('Soumaïla Diabaté', 'Red Bull Salzburg', 'Mali', 21, 8640000, null, null),
  ('Vanja Dragojevic', 'Rangers FC', 'Serbia', 20, 8640000, null, null),
  ('Zé Lucas', 'Cruzeiro Esporte Clube', 'Brazil', 18, 8640000, null, null),
  ('Batista Mendy', 'Trabzonspor', 'France', 26, 8100000, null, null),
  ('Luca Lipani', 'US Sassuolo', 'Italy', 21, 8100000, null, null),
  ('Nail Umyarov', 'Spartak Moscow', 'Russia', 26, 8100000, null, null),
  ('Rolando Mandragora', 'Torino FC', 'Italy', 29, 8100000, null, null),
  ('Yacine Adli', 'Al-Shabab FC', 'France', 26, 8100000, null, null),
  ('Amadou Koné', 'NEOM SC', 'Cote d''Ivoire', 21, 7560000, null, null),
  ('Aníbal Moreno', 'CA River Plate', 'Argentina', 27, 7560000, null, null),
  ('Artem Karpukas', 'Zenit St. Petersburg', 'Russia', 24, 7560000, null, null),
  ('Ben Sheaf', 'Wrexham AFC', 'England', 28, 7560000, null, null),
  ('Bryan Cristante', 'AS Roma', 'Italy', 31, 7560000, null, null),
  ('Caio Alexandre', 'Esporte Clube Bahia', 'Brazil', 27, 7560000, null, null),
  ('Charles Vanhoutte', 'Feyenoord Rotterdam', 'Belgium', 28, 7560000, null, null),
  ('Daniil Fomin', 'Dynamo Moscow', 'Russia', 29, 7560000, null, null),
  ('Danil Glebov', 'Dynamo Moscow', 'Russia', 26, 7560000, null, null),
  ('Dmitriy Barinov', 'CSKA Moscow', 'Russia', 30, 7560000, null, null),
  ('Franco Romero', 'Deportivo Toluca', 'Argentina', 26, 7560000, null, null),
  ('Gabriel Moscardo', 'RCD Espanyol Barcelona', 'Brazil', 21, 7560000, null, null),
  ('Jens Cajuste', 'Málaga CF', 'Sweden', 27, 7560000, null, null),
  ('Joris Chotard', 'Stade Brestois 29', 'France', 25, 7560000, null, null),
  ('Maestro', 'Alanyaspor', 'Angola', 23, 7560000, null, null),
  ('Manu Silva', 'SL Benfica', 'Portugal', 25, 7560000, null, null),
  ('Nikola Moro', 'Bologna FC 1909', 'Croatia', 28, 7560000, null, null),
  ('Patrik Vydra', 'AC Sparta Prague', 'Czech Republic', 23, 7560000, null, null),
  ('Stije Resink', 'AZ Alkmaar', 'Netherlands', 23, 7560000, null, null),
  ('Vini Souza', 'VfL Wolfsburg', 'Brazil', 27, 7560000, null, null),
  ('Yannik Engelhardt', 'SC Freiburg', 'Germany', 25, 7560000, null, null),
  ('Ramiz Zerrouki', 'FC Twente Enschede', 'Algeria', 28, 7020000, null, null),
  ('Antoni Kozubal', 'Lech Poznan', 'Poland', 22, 6480000, null, null),
  ('Facundo Bernal', 'Real Betis Balompié', 'Uruguay', 23, 6480000, null, null),
  ('Franco Ibarra', 'CA Rosario Central', 'Argentina', 25, 6480000, null, null),
  ('Hans Nicolussi Caviglia', 'Parma Calcio 1913', 'Italy', 26, 6480000, null, null),
  ('Ibrahima Sory Bangoura', 'KRC Genk', 'Guinea', 22, 6480000, null, null),
  ('Jefferson Lerma', 'Crystal Palace', 'Colombia', 31, 6480000, null, null),
  ('Johann Lepenant', 'FC Nantes', 'France', 23, 6480000, null, null),
  ('Junior Mwanga', 'Le Havre AC', 'France', 23, 6480000, null, null),
  ('Kristijan Jakic', 'PAOK Thessaloniki', 'Croatia', 29, 6480000, null, null),
  ('Lucas Gourna-Douath', 'Hull City', 'France', 23, 6480000, null, null),
  ('Luis Chávez', 'Dynamo Moscow', 'Mexico', 30, 6480000, null, null),
  ('Marlon Freitas', 'Sociedade Esportiva Palmeiras', 'Brazil', 31, 6480000, null, null),
  ('Nicolás Acevedo', 'Esporte Clube Bahia', 'Uruguay', 27, 6480000, null, null),
  ('Nicolás Barros Schelotto', 'Club de Gimnasia y Esgrima La Plata', 'Argentina', 20, 6480000, null, null),
  ('Robert Andrich', 'Bayer 04 Leverkusen', 'Germany', 32, 6480000, null, null),
  ('Alexsander', 'Clube Atlético Mineiro', 'Brazil', 22, 5940000, null, null),
  ('Denzell García', 'FC Juárez', 'Mexico', 23, 5940000, null, null),
  ('Leonel Pérez', 'Racing Club', 'Argentina', 22, 5940000, null, null),
  ('Matteo Prati', 'Racing Santander', 'Italy', 22, 5940000, null, null),
  ('Regan Slater', 'Hull City', 'England', 27, 5940000, null, null),
  ('Santiago Ascacíbar', 'CA Boca Juniors', 'Argentina', 29, 5940000, null, null),
  ('Abdoulaye Kanté', 'Al-Ettifaq FC', 'Cote d''Ivoire', 21, 5400000, null, null),
  ('Arthur Piedfort', 'AJ Auxerre', 'Belgium', 21, 5400000, null, null),
  ('Cauan Barros', 'Clube de Regatas Vasco da Gama', 'Brazil', 22, 5400000, null, null),
  ('Christian Nørgaard', 'Everton FC', 'Denmark', 32, 5400000, null, null),
  ('Darko Nejasmic', 'NEC Nijmegen', 'Croatia', 27, 5400000, null, null),
  ('Doğucan Haspolat', 'KVC Westerlo', 'Türkiye', 26, 5400000, null, null),
  ('Ellyes Skhiri', '1.FC Köln', 'Tunisia', 31, 5400000, null, null),
  ('Erick Noriega', 'Grêmio Foot-Ball Porto Alegrense', 'Peru', 24, 5400000, null, null),
  ('James Sands', 'New York City FC', 'United States', 26, 5400000, null, null),
  ('Jordan Holsgrove', 'GD Estoril Praia', 'Scotland', 27, 5400000, null, null),
  ('Julien De Sart', 'Al-Rayyan SC', 'Belgium', 31, 5400000, null, null),
  ('Kevin Castaño', 'Clube Atlético Mineiro', 'Colombia', 25, 5400000, null, null),
  ('Kevin Pina', 'FC Krasnodar', 'Cape Verde', 29, 5400000, null, null),
  ('Matías Orozco', 'CD Castellón', 'Colombia', 18, 5400000, null, null),
  ('Matt Grimes', 'Coventry City', 'England', 31, 5400000, null, null),
  ('Matteo Cichella', 'Frosinone Calcio', 'Italy', 20, 5400000, null, null),
  ('Maxi Oyedele', 'RC Strasbourg Alsace', 'Poland', 21, 5400000, null, null),
  ('Maxime Lopez', 'Paris FC', 'France', 28, 5400000, null, null),
  ('Melayro Bogarde', 'LASK', 'Suriname', 24, 5400000, null, null),
  ('Novatus Miroshi', 'Göztepe', 'Tanzania', 24, 5400000, null, null),
  ('Pablo Maia', 'São Paulo Futebol Clube', 'Brazil', 24, 5400000, null, null),
  ('Pedro Chirivella', 'Panathinaikos', 'Spain', 29, 5400000, null, null),
  ('Rafael Luís', 'Genclerbirligi Ankara', 'Portugal', 21, 5400000, null, null),
  ('Santiago Castañeda', 'SC Paderborn 07', 'United States', 21, 5400000, null, null),
  ('Toby Collyer', 'West Bromwich Albion', 'England', 22, 5400000, null, null),
  ('Tochi Chukwuani', 'Rangers FC', 'Denmark', 23, 5400000, null, null),
  ('Tom van de Looi', 'FC Famalicão', 'Netherlands', 27, 5400000, null, null),
  ('Tomás Händel', 'Red Star Belgrade', 'Portugal', 25, 5400000, null, null),
  ('Ugo Raghouber', 'Burnley FC', 'France', 23, 5400000, null, null),
  ('Wilmar Barrios', 'Zenit St. Petersburg', 'Colombia', 32, 5400000, null, null),
  ('Youri Regeer', 'SV Werder Bremen', 'Netherlands', 23, 5400000, null, null),
  ('Alan Cervantes', 'CF América', 'Mexico', 28, 4860000, null, null),
  ('Andrés Cubas', 'Vancouver Whitecaps FC', 'Paraguay', 30, 4860000, null, null),
  ('Erick Pulgar', 'CR Flamengo', 'Chile', 32, 4860000, null, null),
  ('Fausto Vera', 'CA River Plate', 'Argentina', 26, 4860000, null, null),
  ('Giacomo Faticanti', 'US Avellino 1912', 'Italy', 22, 4860000, null, null),
  ('Mario Lemina', 'Galatasaray', 'Gabon', 33, 4860000, null, null),
  ('Nabil Bentaleb', 'LOSC Lille', 'Algeria', 31, 4860000, null, null),
  ('Pierre Lees-Melou', 'Paris FC', 'France', 33, 4860000, null, null),
  ('Santiago Homenchenko', 'Querétaro FC', 'Uruguay', 23, 4860000, null, null),
  ('Tochukwu Nnadi', 'Olympique Marseille', 'Nigeria', 23, 4860000, null, null),
  ('Tom Krauß', '1.FC Köln', 'Germany', 25, 4860000, null, null),
  ('Vicente Pizarro', 'CA Rosario Central', 'Chile', 23, 4860000, null, null),
  ('Adam Markhiev', '1.FC Nuremberg', 'Finland', 24, 4320000, null, null),
  ('Alpha Touré', 'FC Metz', 'Senegal', 20, 4320000, null, null),
  ('Amir Hadziahmetovic', 'Ludogorets Razgrad', 'Bosnia-Herzegovina', 29, 4320000, null, null),
  ('Antoine Makoumbou', 'UC Sampdoria', 'Congo', 28, 4320000, null, null),
  ('Boubacar Traoré', 'Wolverhampton Wanderers', 'Mali', 25, 4320000, null, null),
  ('César Araújo', 'Tigres UANL', 'Uruguay', 25, 4320000, null, null),
  ('David Ozoh', 'Derby County', 'England', 21, 4320000, null, null),
  ('Djé D''Avilla', 'Chicago Fire FC', 'Cote d''Ivoire', 23, 4320000, null, null),
  ('Djibril Soumaré', 'Stoke City', 'Senegal', 23, 4320000, null, null),
  ('Elisha Owusu', 'Erzurumspor FK', 'Ghana', 28, 4320000, null, null),
  ('Étienne Camara', 'Panathinaikos', 'France', 23, 4320000, null, null),
  ('Fabricio Díaz', 'Al-Gharafa SC', 'Uruguay', 23, 4320000, null, null),
  ('Gregore', 'Al-Rayyan SC', 'Brazil', 32, 4320000, null, null),
  ('Hamza Choudhury', 'Sheffield United', 'Bangladesh', 28, 4320000, null, null),
  ('Ivan Zhelizko', 'Ludogorets Razgrad', 'Ukraine', 25, 4320000, null, null),
  ('Jesper Karlström', 'Udinese Calcio', 'Sweden', 31, 4320000, null, null),
  ('Kofi Amoako', 'Hamburger SV', 'Germany', 21, 4320000, null, null),
  ('Leonardo Colombo', 'AC Monza', 'Italy', 21, 4320000, null, null),
  ('Luca Regiardo', 'CA Newell''s Old Boys', 'Argentina', 19, 4320000, null, null),
  ('Marwan Ateya', 'Al Ahly FC', 'Egypt', 28, 4320000, null, null),
  ('Mathías Villasanti', 'Grêmio Foot-Ball Porto Alegrense', 'Paraguay', 29, 4320000, null, null),
  ('Mirko Topic', 'Norwich City', 'Serbia', 25, 4320000, null, null),
  ('Mirza Catovic', 'FC Barcelona Atlètic', 'Germany', 19, 4320000, null, null),
  ('Mory Gbane', 'Stade Reims', 'Cote d''Ivoire', 25, 4320000, null, null),
  ('Niko Sigur', 'FC Toulouse', 'Canada', 23, 4320000, null, null),
  ('Njegos Petrovic', 'FK Vojvodina Novi Sad', 'Serbia', 27, 4320000, null, null),
  ('Philipp Sander', 'Borussia Mönchengladbach', 'Germany', 28, 4320000, null, null),
  ('Raniele', 'Sport Club Corinthians Paulista', 'Brazil', 29, 4320000, null, null),
  ('Salis Abdul Samed', 'OGC Nice', 'Ghana', 26, 4320000, null, null),
  ('Thiago Helguera', 'Atlético Madrileño', 'Uruguay', 20, 4320000, null, null),
  ('Tygo Land', 'FC Groningen', 'Netherlands', 20, 4320000, null, null),
  ('Vasilije Novicic', 'FK IMT Belgrad', 'Serbia', 18, 4320000, null, null),
  ('Veldin Hodza', 'Rubin Kazan', 'Kosovo', 23, 4320000, null, null),
  ('Wataru Endo', 'Liverpool FC', 'Japan', 33, 4320000, null, null),
  ('Adrian Șut', 'Levadiakos', 'Romania', 27, 3780000, null, null),
  ('Bartosz Slisz', 'Bröndby IF', 'Poland', 27, 3780000, null, null),
  ('Braian Ojeda', 'Orlando City SC', 'Paraguay', 26, 3780000, null, null),
  ('Christopher Martins', 'Spartak Moscow', 'Luxembourg', 29, 3780000, null, null),
  ('Danilo Cataldi', 'SS Lazio', 'Italy', 32, 3780000, null, null),
  ('Edwin Cerrillo', 'CF América', 'United States', 25, 3780000, null, null),
  ('Elián Irala', 'Shabab Al-Ahli Club', 'Argentina', 22, 3780000, null, null),
  ('Fidel Ambríz', 'CF Monterrey', 'Mexico', 23, 3780000, null, null),
  ('Ibrahima Diallo', 'Al-Shahania SC', 'France', 27, 3780000, null, null),
  ('Jamie Roche', 'KV Kortrijk', 'Sweden', 25, 3780000, null, null),
  ('Joe Bell', 'Viking FK', 'New Zealand', 27, 3780000, null, null),
  ('José Caicedo', 'Portland Timbers', 'Colombia', 24, 3780000, null, null),
  ('Juljan Shehu', 'Widzew Lodz', 'Albania', 28, 3780000, null, null),
  ('Lorenzo Scipioni', 'Olympiacos Piraeus', 'Argentina', 21, 3780000, null, null),
  ('Lucas Sanabria', 'Los Angeles Galaxy', 'Uruguay', 22, 3780000, null, null),
  ('Marc Aguado', 'Elche CF', 'Spain', 26, 3780000, null, null),
  ('Niklas Dorsch', 'Toronto FC', 'Germany', 28, 3780000, null, null),
  ('Patrik Hellebrand', 'Korona Kielce', 'Czech Republic', 27, 3780000, null, null),
  ('Rade Krunic', 'Red Star Belgrade', 'Bosnia-Herzegovina', 32, 3780000, null, null),
  ('Robin Fellhauer', 'FC Augsburg', 'Germany', 28, 3780000, null, null),
  ('Rodrigo Villagra', 'Sport Club Internacional', 'Argentina', 25, 3780000, null, null),
  ('Salih Özcan', 'Besiktas JK', 'Türkiye', 28, 3780000, null, null),
  ('Sivert Mannsverk', 'AC Sparta Prague', 'Norway', 24, 3780000, null, null),
  ('William Clem', 'FC Copenhagen', 'Denmark', 22, 3780000, null, null),
  ('Yunus Konak', 'Lincoln City', 'Türkiye', 20, 3780000, null, null),
  ('Marten de Roon', 'AS Roma', 'Netherlands', 35, 3456000, null, null),
  ('Adam Randell', 'Bristol City', 'England', 25, 3240000, null, null),
  ('Aiden O''Neill', 'New York City FC', 'Australia', 28, 3240000, null, null),
  ('Aliou Dieng', 'Valencia CF', 'Mali', 28, 3240000, null, null),
  ('Áron Csongvai', 'AS Saint-Étienne', 'Hungary', 25, 3240000, null, null),
  ('Aschraf El Mahdioui', 'Al-Taawoun FC', 'Morocco', 30, 3240000, null, null),
  ('Benjamin André', 'LOSC Lille', 'France', 36, 3240000, null, null),
  ('Billy Mitchell', 'Sheffield Wednesday', 'England', 25, 3240000, null, null),
  ('Danley Jean Jacques', 'Philadelphia Union', 'Haiti', 26, 3240000, null, null),
  ('Fredrik Hammar', 'KV Mechelen', 'Sweden', 25, 3240000, null, null),
  ('Hamzat Ojediran', 'Colorado Rapids', 'Nigeria', 22, 3240000, null, null),
  ('Hiroki Akiyama', 'SV Darmstadt 98', 'Japan', 25, 3240000, null, null),
  ('Ibrahim Fofana', 'KVC Westerlo', 'Cote d''Ivoire', 22, 3240000, null, null),
  ('Jacob Wright', 'Norwich City', 'England', 21, 3240000, null, null),
  ('Keaton Parks', 'New York City FC', 'United States', 29, 3240000, null, null),
  ('Leonel Picco', 'Clube do Remo (PA)', 'Argentina', 27, 3240000, null, null),
  ('Marco Kana', 'RSC Anderlecht', 'Belgium', 24, 3240000, null, null),
  ('Mateja Stjepanović', 'Moreirense FC', 'Serbia', 22, 3240000, null, null),
  ('Mathys de Carvalho', 'Al-Diriyah FC', 'Portugal', 21, 3240000, null, null),
  ('Miguel Chaiwa', 'Hibernian FC', 'Zambia', 22, 3240000, null, null),
  ('Mohanad Lasheen', 'Pyramids FC', 'Egypt', 30, 3240000, null, null),
  ('Newton', 'São Paulo Futebol Clube', 'Brazil', 26, 3240000, null, null),
  ('Nicolás Fonseca', 'Coritiba Foot Ball Club', 'Uruguay', 27, 3240000, null, null),
  ('Oliver Skipp', 'Charlton Athletic', 'England', 26, 3240000, null, null),
  ('Oumar Ngom', 'US Lecce', 'Mauritania', 22, 3240000, null, null),
  ('Pedro Ferreira', 'CD Santa Clara', 'Portugal', 28, 3240000, null, null),
  ('Péter Baráth', 'SK Sigma Olomouc', 'Hungary', 24, 3240000, null, null),
  ('Ryan Wintle', 'Milton Keynes Dons', 'England', 29, 3240000, null, null),
  ('Salvatore Esposito', 'UC Sampdoria', 'Italy', 25, 3240000, null, null),
  ('Tamar Svetlin', 'AS Saint-Étienne', 'Slovenia', 25, 3240000, null, null),
  ('Tomás Belmonte', 'CA Boca Juniors', 'Argentina', 28, 3240000, null, null),
  ('Tomás Pérez', 'Clube Atlético Mineiro', 'Argentina', 21, 3240000, null, null),
  ('Tommy Marqués', 'SC Braga', 'Spain', 19, 3240000, null, null),
  ('Ugochukwu Iwu', 'Rubin Kazan', 'Armenia', 26, 3240000, null, null),
  ('Uros Racic', 'Aris Thessaloniki', 'Serbia', 28, 3240000, null, null),
  ('Jadsom', 'Al-Wahda FC', 'Brazil', 25, 3024000, null, null),
  ('Lucas Ventura', 'Hapoel Beer Sheva', 'Brazil', 28, 3024000, null, null),
  ('Marius Marin', 'Al-Nasr SC (UAE)', 'Romania', 28, 3024000, null, null),
  ('Teboho Mokoena', 'Mamelodi Sundowns FC', 'South Africa', 29, 3024000, null, null),
  ('Agustín Cardozo', 'CA Lanús', 'Argentina', 29, 2700000, null, null),
  ('Aldo López', 'Santos Laguna', 'Mexico', 26, 2700000, null, null),
  ('Allan', 'Sport Club Corinthians Paulista', 'Brazil', 29, 2700000, null, null),
  ('Andréa Le Borgne', 'Hellas Verona', 'France', 20, 2700000, null, null),
  ('Andrej Bacanin', 'FC Basel 1893', 'Serbia', 19, 2700000, null, null),
  ('Andrés Perea', 'New York City FC', 'United States', 25, 2700000, null, null),
  ('Anzor Mekvabishvili', 'Chicago Fire FC', 'Georgia', 25, 2700000, null, null),
  ('Baptiste Santamaria', 'PAOK Thessaloniki', 'France', 31, 2700000, null, null),
  ('Baralhas', 'Esporte Clube Vitória', 'Brazil', 27, 2700000, null, null),
  ('Berat Özdemir', 'Corum FK', 'Türkiye', 28, 2700000, null, null),
  ('Brian De Keersmaecker', 'Bristol City', 'Belgium', 26, 2700000, null, null),
  ('Charles Pickel', 'Sharjah FC', 'DR Congo', 29, 2700000, null, null),
  ('Connor Barron', 'Middlesbrough FC', 'Scotland', 24, 2700000, null, null),
  ('David Ayala', 'Inter Miami CF', 'Argentina', 24, 2700000, null, null),
  ('Dirk Proper', 'SC Heerenveen', 'Netherlands', 24, 2700000, null, null),
  ('Federico Redondo', 'Elche CF', 'Argentina', 23, 2700000, null, null),
  ('Fernando Costanza', 'Krylya Sovetov Samara', 'Brazil', 27, 2700000, null, null),
  ('Florian Grillitsch', 'Frosinone Calcio', 'Austria', 31, 2700000, null, null),
  ('Giacomo Calò', 'Frosinone Calcio', 'Italy', 29, 2700000, null, null),
  ('Gustav Berggren', 'Lech Poznan', 'Sweden', 29, 2700000, null, null),
  ('Ignacio Miramón', 'Club de Gimnasia y Esgrima La Plata', 'Argentina', 23, 2700000, null, null),
  ('Ignacio Perruzzi', 'CA San Lorenzo de Almagro', 'Argentina', 21, 2700000, null, null),
  ('Ignacio Saavedra', 'Rubin Kazan', 'Chile', 27, 2700000, null, null),
  ('Jakub Kaluzinski', 'Basaksehir FK', 'Poland', 23, 2700000, null, null),
  ('Jon Gorenc Stankovic', 'SK Sturm Graz', 'Slovenia', 30, 2700000, null, null),
  ('Jonathan Varane', 'Queens Park Rangers', 'Martinique', 25, 2700000, null, null),
  ('Jorge Rodríguez', 'CF Monterrey', 'Argentina', 31, 2700000, null, null),
  ('Josen Escobar', 'CD América de Cali', 'Colombia', 21, 2700000, null, null),
  ('Joshua Kitolano', 'FK Bodø/Glimt', 'Norway', 25, 2700000, null, null),
  ('Juergen Elitim', 'Bursaspor', 'Colombia', 27, 2700000, null, null),
  ('Kartal Yılmaz', 'Besiktas JK', 'Türkiye', 25, 2700000, null, null),
  ('Kasper Boogaard', 'Willem II Tilburg', 'Netherlands', 20, 2700000, null, null),
  ('Kasper Davidsen', 'Holstein Kiel', 'Denmark', 21, 2700000, null, null),
  ('Kevin Gutiérrez', 'AA Argentinos Juniors', 'Argentina', 29, 2700000, null, null),
  ('Kristijan Belic', 'Maccabi Tel Aviv', 'Serbia', 25, 2700000, null, null),
  ('Lennard Maloney', '1.FSV Mainz 05', 'United States', 26, 2700000, null, null),
  ('Lucas Romero', 'Cruzeiro Esporte Clube', 'Argentina', 32, 2700000, null, null),
  ('Lucas Torró', 'CA Osasuna', 'Spain', 32, 2700000, null, null),
  ('Lukasz Poreba', 'SV 07 Elversberg', 'Poland', 26, 2700000, null, null),
  ('Marius Courcoul', 'RAAL La Louvière', 'France', 19, 2700000, null, null),
  ('Marko Bulat', 'Raków Częstochowa', 'Croatia', 25, 2700000, null, null),
  ('Obinna Nwobodo', 'FC Cincinnati', 'Nigeria', 29, 2700000, null, null),
  ('Pape Diong', 'KVC Westerlo', 'Senegal', 20, 2700000, null, null),
  ('Patrick de Paula', 'Sport Club do Recife', 'Brazil', 27, 2700000, null, null),
  ('Pedro Pedraza', 'Club Necaxa', 'Mexico', 26, 2700000, null, null),
  ('Philipp Maybach', 'Austria Vienna', 'Austria', 18, 2700000, null, null),
  ('Sam Field', 'Norwich City', 'England', 28, 2700000, null, null),
  ('Santiago Colombatto', 'Club León U21', 'Argentina', 29, 2700000, null, null),
  ('Taisei Abe', 'Holstein Kiel', 'Japan', 22, 2700000, null, null),
  ('Thiago Maia', 'Sport Club Internacional', 'Brazil', 29, 2700000, null, null),
  ('Tomás Avilés', 'CD O''Higgins', 'Argentina', 22, 2700000, null, null),
  ('Walace', 'Esporte Clube Vitória', 'Brazil', 31, 2700000, null, null),
  ('Bruno Leyes', 'Club Atlético Tigre', 'Argentina', 24, 2484000, null, null),
  ('Edimilson Fernandes', 'BSC Young Boys', 'Switzerland', 30, 2376000, null, null),
  ('Felipe Peña Biafore', 'CA Lanús', 'Argentina', 25, 2376000, null, null),
  ('Nikolas Sattlberger', 'KRC Genk', 'Austria', 22, 2376000, null, null),
  ('Andri Fannar Baldursson', 'Kasimpasa', 'Iceland', 24, 2160000, null, null),
  ('Andrusw Araujo', 'Polissya Zhytomyr', 'Venezuela', 23, 2160000, null, null),
  ('Callum McGregor', 'Celtic FC', 'Scotland', 33, 2160000, null, null),
  ('Casper De Norre', 'Millwall FC', 'Belgium', 29, 2160000, null, null),
  ('Chris Durkin', 'St. Louis CITY SC', 'United States', 26, 2160000, null, null),
  ('Conor Coventry', 'Charlton Athletic', 'Ireland', 26, 2160000, null, null),
  ('Damián García', 'Shabab Al-Ahli Club', 'Uruguay', 23, 2160000, null, null),
  ('Dani Silva', 'Widzew Lodz', 'Portugal', 26, 2160000, null, null),
  ('Daniel Edelman', 'St. Louis CITY SC', 'United States', 23, 2160000, null, null),
  ('Danilo Barbosa', 'Grêmio Foot-Ball Porto Alegrense', 'Brazil', 30, 2160000, null, null),
  ('Danny Leyva', 'Club Necaxa', 'United States', 23, 2160000, null, null),
  ('Davy van den Berg', 'FC Utrecht', 'Netherlands', 26, 2160000, null, null),
  ('Daylam Meddah', 'Montpellier HSC', 'France', 23, 2160000, null, null),
  ('Eduardo Felicíssimo', 'Sporting CP B', 'Portugal', 19, 2160000, null, null),
  ('Elliot Watt', 'Samsunspor', 'Scotland', 26, 2160000, null, null),
  ('Enric Llansana', 'RSC Anderlecht', 'Netherlands', 25, 2160000, null, null),
  ('Federico Navarro', 'CA Rosario Central', 'Argentina', 26, 2160000, null, null),
  ('Gaius Makouta', 'Alanyaspor', 'Congo', 29, 2160000, null, null),
  ('Giuseppe Leone', 'Pisa Sporting Club', 'Italy', 25, 2160000, null, null),
  ('Houssem Mrezigue', 'Dinamo Makhachkala', 'Algeria', 26, 2160000, null, null),
  ('Iker Muñoz', 'CA Osasuna', 'Spain', 24, 2160000, null, null),
  ('Ivan Lepinjica', 'Sabah FK', 'Croatia', 27, 2160000, null, null),
  ('Ivan Šunjić', 'Pafos FC', 'Bosnia-Herzegovina', 29, 2160000, null, null),
  ('Iván Tona', 'Club Tijuana', 'Mexico', 26, 2160000, null, null),
  ('Johan Caicedo', 'Atlético de San Luis', 'Colombia', 22, 2160000, null, null),
  ('Jordy Alcívar', 'Independiente del Valle', 'Ecuador', 27, 2160000, null, null),
  ('Josh Atencio', 'Colorado Rapids', 'United States', 24, 2160000, null, null),
  ('Kalidou Sidibé', 'Akhmat Grozny', 'Mali', 27, 2160000, null, null),
  ('Kervin Arriaga', 'AEK Athens', 'Honduras', 28, 2160000, null, null),
  ('Lukasz Lakomy', 'Oud-Heverlee Leuven', 'Poland', 25, 2160000, null, null),
  ('Maguette Gueye', 'Racing Santander', 'Senegal', 23, 2160000, null, null),
  ('Marco Pompetti', 'Calcio Padova', 'Italy', 26, 2160000, null, null),
  ('Mark Brink', 'FC Nordsjaelland', 'Denmark', 28, 2160000, null, null),
  ('Mateusz Łęgowski', 'Motor Lublin', 'Poland', 23, 2160000, null, null),
  ('Maximiliano Amarfil', 'Club Atlético Platense', 'Argentina', 24, 2160000, null, null),
  ('Melker Heier', 'IK Sirius', 'Sweden', 25, 2160000, null, null),
  ('Mykola Mykhaylenko', 'Dynamo Kyiv', 'Ukraine', 25, 2160000, null, null),
  ('Nemanja Gudelj', 'Getafe CF', 'Serbia', 34, 2160000, null, null),
  ('Neto Moura', 'Mirassol Futebol Clube (SP)', 'Brazil', 30, 2160000, null, null),
  ('Nicolás Tripichio', 'CA San Lorenzo de Almagro', 'Argentina', 30, 2160000, null, null),
  ('Oskar Repka', 'Raków Częstochowa', 'Poland', 27, 2160000, null, null),
  ('Ousmane Diakité', 'West Bromwich Albion', 'Mali', 26, 2160000, null, null),
  ('Pedro Bicalho', 'Qarabağ FK', 'Brazil', 25, 2160000, null, null),
  ('Peter Pokorný', 'Slovan Bratislava', 'Slovakia', 25, 2160000, null, null),
  ('Philip Brittijn', 'Fortuna Sittard', 'Netherlands', 22, 2160000, null, null),
  ('Rani Khedira', '1.FC Union Berlin', 'Tunisia', 32, 2160000, null, null),
  ('Rodrigo Dourado', 'FC Juárez', 'Brazil', 32, 2160000, null, null),
  ('Rodrigo Echeverría', 'Club León FC', 'Chile', 31, 2160000, null, null),
  ('Ron Schallenberg', 'FC Schalke 04', 'Germany', 27, 2160000, null, null),
  ('Ryan Fosso', 'Standard Liège', 'Cameroon', 24, 2160000, null, null),
  ('Santiago Longo', 'Club Atlético Belgrano', 'Argentina', 28, 2160000, null, null),
  ('Sasa Zdjelar', 'FC Noah Yerevan', 'Serbia', 31, 2160000, null, null),
  ('Satoshi Tanaka', 'FC Schalke 04', 'Japan', 24, 2160000, null, null),
  ('Taylor Gardner-Hickman', 'Birmingham City', 'England', 24, 2160000, null, null),
  ('Tomoki Iwata', 'Birmingham City', 'Japan', 29, 2160000, null, null),
  ('Yannick Bright', 'Inter Miami CF', 'Italy', 25, 2160000, null, null),
  ('Yannik Keitel', 'FC Augsburg', 'Germany', 26, 2160000, null, null),
  ('Yvan Neyou', 'Volos NFC', 'Cameroon', 29, 2160000, null, null),
  ('Zanocelo', 'Ceará Sporting Club', 'Brazil', 25, 2160000, null, null);

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
  if n <> 399 then raise exception 'Round 669: expected 399 staged rows, staged %', n; end if;

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

  -- each correction targets exactly one 2026 row, still at the club that was checked
  select string_agg(f.player_name, ', ') into bad
  from r669_fix f
  where (select count(*) from public.player_market_values p
          where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield') <> 1
     or not exists (select 1 from public.player_market_values p
          where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.from_club);
  if bad is not null then raise exception 'Round 669: a club correction no longer matches its row: %', bad; end if;
end $$;

insert into public.player_market_values (player_name, position, age, nationality, club, market_value_usd, year)
select player_name, 'Defensive Midfield', age, nationality, club, market_value_usd, 2026
from r669_dm;

update public.player_market_values p
set club = f.to_club
from r669_fix f
where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.from_club;

do $$
declare
  n integer;
  b record;
begin
  select * into b from r669_before;

  select count(*) into n from public.player_market_values where year = 2026 and position = 'Defensive Midfield';
  if n <> 46 + 399 then raise exception 'Round 669: expected % Defensive Midfield rows in 2026 after, found %', 46 + 399, n; end if;

  select count(*) into n from public.player_market_values where year = 2026;
  if n <> b.total_2026 + 399 then raise exception 'Round 669: expected % rows in 2026 after, found %', b.total_2026 + 399, n; end if;

  -- every staged row landed exactly once, with its own values
  select count(*) into n from r669_dm d
  where (select count(*) from public.player_market_values p
          where p.year = 2026 and p.player_name = d.player_name and p.club = d.club
            and p.position = 'Defensive Midfield' and p.nationality = d.nationality
            and p.age = d.age and p.market_value_usd = d.market_value_usd) <> 1;
  if n <> 0 then raise exception 'Round 669: % staged rows did not land exactly once', n; end if;

  -- every correction took
  select count(*) into n from r669_fix f
  where not exists (select 1 from public.player_market_values p
    where p.year = 2026 and p.player_name = f.player_name and p.position = 'Defensive Midfield' and p.club = f.to_club);
  if n <> 0 then raise exception 'Round 669: % club corrections did not take', n; end if;
end $;

commit;
