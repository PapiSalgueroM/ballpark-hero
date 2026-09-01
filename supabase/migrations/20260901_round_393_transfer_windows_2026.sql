-- Round 393 (2026-09-01): the 2026 transfer windows reach the market value table.
-- The 2026 rows are an autumn 2025 snapshot. Every move below is two-source
-- verified and listed in scripts/transferOverlay2026.mjs, which is the single
-- list driving both the Club Manager roster bake and this table. Keyed on the
-- name alone because no overlay name matches more than one 2026 row (checked
-- before writing, and fenced by scripts/simTransferOverlay.mjs section 4).
-- Loans write the club the player is playing for, the convention the dataset
-- itself uses. Griezmann has no 2026 row, so his statement updates nothing.

update public.player_market_values set club = 'Chelsea FC' where year = 2026 and player_name = 'Morgan Rogers' and club <> 'Chelsea FC';
update public.player_market_values set club = 'Manchester City' where year = 2026 and player_name = 'Elliot Anderson' and club <> 'Manchester City';
update public.player_market_values set club = 'Tottenham Hotspur' where year = 2026 and player_name = 'Sandro Tonali' and club <> 'Tottenham Hotspur';
update public.player_market_values set club = 'Tottenham Hotspur' where year = 2026 and player_name = 'Mateus Fernandes' and club <> 'Tottenham Hotspur';
update public.player_market_values set club = 'Arsenal FC' where year = 2026 and player_name = 'Bruno Guimarães' and club <> 'Arsenal FC';
update public.player_market_values set club = 'FC Barcelona' where year = 2026 and player_name = 'Anthony Gordon' and club <> 'FC Barcelona';
update public.player_market_values set club = 'Al-Hilal SFC' where year = 2026 and player_name = 'Crysencio Summerville' and club <> 'Al-Hilal SFC';
update public.player_market_values set club = 'Liverpool FC' where year = 2026 and player_name = 'Jérémy Jacquet' and club <> 'Liverpool FC';
update public.player_market_values set club = 'Tottenham Hotspur' where year = 2026 and player_name = 'Jan Paul van Hecke' and club <> 'Tottenham Hotspur';
update public.player_market_values set club = 'Chelsea FC' where year = 2026 and player_name = 'Maxence Lacroix' and club <> 'Chelsea FC';
update public.player_market_values set club = 'Aston Villa' where year = 2026 and player_name = 'Johan Manzambi' and club <> 'Aston Villa';
update public.player_market_values set club = 'Manchester United' where year = 2026 and player_name = 'Andrey Santos' and club <> 'Manchester United';
update public.player_market_values set club = 'Chelsea FC' where year = 2026 and player_name = 'Marco Palestra' and club <> 'Chelsea FC';
update public.player_market_values set club = 'Brighton & Hove Albion' where year = 2026 and player_name = 'Luka Vuskovic' and club <> 'Brighton & Hove Albion';
update public.player_market_values set club = 'Chelsea FC' where year = 2026 and player_name = 'Geovany Quenda' and club <> 'Chelsea FC';
update public.player_market_values set club = 'Arsenal FC' where year = 2026 and player_name = 'Christos Tzolis' and club <> 'Arsenal FC';
update public.player_market_values set club = 'Manchester City' where year = 2026 and player_name = 'Antoine Semenyo' and club <> 'Manchester City';
update public.player_market_values set club = 'Manchester City' where year = 2026 and player_name = 'Marc Guéhi' and club <> 'Manchester City';
update public.player_market_values set club = 'Liverpool FC' where year = 2026 and player_name = 'Bradley Barcola' and club <> 'Liverpool FC';
update public.player_market_values set club = 'Tottenham Hotspur' where year = 2026 and player_name = 'Omar Marmoush' and club <> 'Tottenham Hotspur';
update public.player_market_values set club = 'Juventus FC' where year = 2026 and player_name = 'Nick Woltemade' and club <> 'Juventus FC';
update public.player_market_values set club = 'Al-Qadsiah FC' where year = 2026 and player_name = 'Tijjani Reijnders' and club <> 'Al-Qadsiah FC';
update public.player_market_values set club = 'Real Madrid' where year = 2026 and player_name = 'Yan Diomande' and club <> 'Real Madrid';
update public.player_market_values set club = 'Real Madrid' where year = 2026 and player_name = 'Marc Cucurella' and club <> 'Real Madrid';
update public.player_market_values set club = 'Real Madrid' where year = 2026 and player_name = 'Bernardo Silva' and club <> 'Real Madrid';
update public.player_market_values set club = 'Real Madrid' where year = 2026 and player_name = 'Denzel Dumfries' and club <> 'Real Madrid';
update public.player_market_values set club = 'FC Barcelona' where year = 2026 and player_name = 'Karim Adeyemi' and club <> 'FC Barcelona';
update public.player_market_values set club = 'FC Barcelona' where year = 2026 and player_name = 'Rodri' and club <> 'FC Barcelona';
update public.player_market_values set club = 'AC Milan' where year = 2026 and player_name = 'Gonçalo Ramos' and club <> 'AC Milan';
update public.player_market_values set club = 'Galatasaray' where year = 2026 and player_name = 'Rafael Leão' and club <> 'Galatasaray';
update public.player_market_values set club = 'Bayern Munich' where year = 2026 and player_name = 'Ismael Saibari' and club <> 'Bayern Munich';
update public.player_market_values set club = 'Bayern Munich' where year = 2026 and player_name = 'Nathaniel Brown' and club <> 'Bayern Munich';
update public.player_market_values set club = 'Ajax Amsterdam' where year = 2026 and player_name = 'Marc-André ter Stegen' and club <> 'Ajax Amsterdam';
update public.player_market_values set club = 'Ajax Amsterdam' where year = 2026 and player_name = 'Julian Brandt' and club <> 'Ajax Amsterdam';
update public.player_market_values set club = 'Al-Ahli SFC' where year = 2026 and player_name = 'Francisco Trincão' and club <> 'Al-Ahli SFC';
update public.player_market_values set club = 'Al-Ahli SFC' where year = 2026 and player_name = 'Eduard Spertsyan' and club <> 'Al-Ahli SFC';
update public.player_market_values set club = 'Al-Ittihad Club' where year = 2026 and player_name = 'Jan-Carlo Simić' and club <> 'Al-Ittihad Club';
update public.player_market_values set club = 'NEOM SC' where year = 2026 and player_name = 'Malang Sarr' and club <> 'NEOM SC';
update public.player_market_values set club = 'SL Benfica' where year = 2026 and player_name = 'Souffian El Karouani' and club <> 'SL Benfica';
update public.player_market_values set club = 'Al-Khaleej FC' where year = 2026 and player_name = 'Angelo Fulgini' and club <> 'Al-Khaleej FC';
update public.player_market_values set club = 'Abha Club' where year = 2026 and player_name = 'Abdou Diallo' and club <> 'Abha Club';
update public.player_market_values set club = 'Chicago Fire FC' where year = 2026 and player_name = 'Robert Lewandowski' and club <> 'Chicago Fire FC';
update public.player_market_values set club = 'Orlando City SC' where year = 2026 and player_name = 'Antoine Griezmann' and club <> 'Orlando City SC';
update public.player_market_values set club = 'Charlotte FC' where year = 2026 and player_name = 'Allan Saint-Maximin' and club <> 'Charlotte FC';
update public.player_market_values set club = 'Columbus Crew' where year = 2026 and player_name = 'Brais Méndez' and club <> 'Columbus Crew';
update public.player_market_values set club = 'Cruzeiro Esporte Clube' where year = 2026 and player_name = 'Gabriel Pec' and club <> 'Cruzeiro Esporte Clube';
