/**
 * Round 971: bake the 2020-21 era world for Club Manager, a fourth past
 * season and the first born a full big five: the Premier League, La Liga,
 * Serie A, the Bundesliga and Ligue 1 of 2020-21, every player a real
 * year-2020 row of our own player_market_values table.
 *
 * ONE SHARED STEP. There is no shipped 2020-21 file to grow, so this bake
 * hands the shared extend step (scripts/lib/eraBakeExtend.mjs, Round 899)
 * an EMPTY era, zero leagues and zero players, and adds all five leagues as
 * new ones. Everything that step does for 2015-16 it does here, with no
 * copy of its logic: the documented query reproduced offline, one name one
 * player across the whole world, the window corrections proved twice, the
 * thin squads declared, and the file written.
 *
 *   node scripts/bakeEra2020.mjs            write src/data/clubManagerEra2020.ts
 *   node scripts/bakeEra2020.mjs --dry      run every check, write nothing
 *   node scripts/bakeEra2020.mjs --check    rebuild and compare with the shipped file
 *                                           (--against=<file> compares with another copy)
 *
 * THE DATA, OFFLINE. Production is off limits to a bake, so the lead pulled
 * the base table once (2026-10-03) into
 * C:/Users/antho/dukb-handoff/data/market-base-2020-2021.json, every row of
 * years 2020 and 2021 (--pull= overrides). The documented query shape (base
 * table, year = 2020 exact, DISTINCT ON (player_name) ... ORDER BY
 * player_name, market_value_usd DESC, no fallback year) is reproduced from
 * it: filter the year and the league's club spellings, keep one row per
 * player_name with the highest value, break a tie on the lowest id. The
 * year-2021 rows of the same file are used ONLY as the second proof of a
 * summer 2020 move: the club the following year's row names. Never a
 * second year to fill a thin squad: thin is honest.
 *
 * WHAT A YEAR-2020 ROW IS. Its ages put it in the spring of 2020 (Messi 32,
 * born June 1987; Havertz 20, born June 1999), so it predates the summer
 * 2020 window, which COVID pushed to 5 October 2020 (in England a domestic
 * window then ran to 16 October for deals between Premier League and EFL
 * clubs only, never between two Premier League clubs: premierleague.com
 * news 1725887, "Dates for summer 2020 transfer window agreed", and Sky
 * Sports, "Deadline Day 2: What deals can be done in the domestic transfer
 * window", read 2026-10-05). Some rows are older still: Bruno Fernandes sits at
 * Sporting although he joined Manchester United on 29 January 2020.
 *
 * THE SPELLINGS. Each league's map below names every table spelling it
 * reads. Two extra ones: the short spelling "Juventus" holds five first team
 * centre-backs (de Ligt, Bonucci, Chiellini, Danilo, Demiral) and one
 * youth forward beside the 18 rows of "Juventus FC", and "FC Spezia Calcio"
 * holds Tommaso Pobega, whose year-2021 row is at "Spezia Calcio" too; each
 * pair folds into the one club. The reserve and youth spellings stay out, as Round 899 left
 * them out of 2015-16 ("FC Barcelona Atlètic", "Real Madrid Castilla",
 * "Manchester United U21", "Liverpool FC U21", "FC Bayern Munich",
 * "FC Bayern Munich II", the Primavera sides, the short spellings "Napoli",
 * "Roma", "Sassuolo", "Bologna" and "Torino", which hold only youth team
 * forwards).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runExtend, readPull, updateNationalityBlock } from './lib/eraBakeExtend.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOf = (flag, dflt) => {
  const a = process.argv.find(x => x.startsWith(`${flag}=`));
  return a ? a.slice(a.indexOf('=') + 1) : dflt;
};

/* Table spelling -> engine name, one map per league. Engine names reuse the
 * 2026 world's spelling wherever the club exists there (Wolves, Brighton,
 * Verona, Gladbach, Köln, PSG...) and an earlier era's spelling where only
 * an era has it (Leicester City, Eibar, Granada, Cádiz, Sampdoria,
 * Saint-Étienne, Bordeaux, Montpellier, Reims), so colours and rivalries
 * carry over; Huesca, Valladolid, Spezia, Benevento, Crotone, Nîmes and
 * Dijon are new. Each league's membership is the final table of 2020-21,
 * two sources read 2026-10-03 that agree on every club: RSSSF's season
 * records (https://www.rsssf.org/tablese/eng2021.html, tabless/span2021,
 * tablesi/ital2021, tablesd/duit2021, tablesf/fran2021) and ESPN's final
 * standings (https://www.espn.com/soccer/standings/_/league/ENG.1/season/2020,
 * and ESP.1, ITA.1, GER.1, FRA.1 for the same season). The step fails on a
 * spelling with no year-2020 rows, so each one is checked against the pull. */
export const DB_TO_ERA_PL = {
  'Manchester City': 'Manchester City', 'Manchester United': 'Manchester United', 'Liverpool FC': 'Liverpool',
  'Chelsea FC': 'Chelsea', 'Leicester City': 'Leicester City', 'West Ham United': 'West Ham',
  'Tottenham Hotspur': 'Tottenham', 'Arsenal FC': 'Arsenal', 'Leeds United': 'Leeds United',
  'Everton FC': 'Everton', 'Aston Villa': 'Aston Villa', 'Newcastle United': 'Newcastle',
  'Wolverhampton Wanderers': 'Wolves', 'Crystal Palace': 'Crystal Palace', 'Southampton FC': 'Southampton',
  'Brighton & Hove Albion': 'Brighton', 'Burnley FC': 'Burnley', 'Fulham FC': 'Fulham',
  'West Bromwich Albion': 'West Brom', 'Sheffield United': 'Sheffield United',
};
export const DB_TO_ERA_LL = {
  'Atlético de Madrid': 'Atlético Madrid', 'Real Madrid': 'Real Madrid', 'FC Barcelona': 'Barcelona',
  'Sevilla FC': 'Sevilla', 'Real Sociedad': 'Real Sociedad', 'Real Betis Balompié': 'Real Betis',
  'Villarreal CF': 'Villarreal', 'Celta de Vigo': 'Celta Vigo', 'Athletic Bilbao': 'Athletic Club',
  'Granada CF': 'Granada', 'CA Osasuna': 'Osasuna', 'Cádiz CF': 'Cádiz', 'Valencia CF': 'Valencia',
  'Levante UD': 'Levante', 'Getafe CF': 'Getafe', 'Deportivo Alavés': 'Alavés', 'Elche CF': 'Elche',
  'SD Huesca': 'Huesca', 'Real Valladolid CF': 'Valladolid', 'SD Eibar': 'Eibar',
};
export const DB_TO_ERA_SA = {
  'Inter Milan': 'Inter Milan', 'AC Milan': 'AC Milan', 'Atalanta BC': 'Atalanta', 'Juventus FC': 'Juventus',
  'Juventus': 'Juventus', 'SSC Napoli': 'Napoli', 'SS Lazio': 'Lazio', 'AS Roma': 'Roma',
  'US Sassuolo': 'Sassuolo', 'UC Sampdoria': 'Sampdoria', 'Hellas Verona': 'Verona', 'Genoa CFC': 'Genoa',
  'Bologna FC 1909': 'Bologna', 'ACF Fiorentina': 'Fiorentina', 'Udinese Calcio': 'Udinese',
  'Spezia Calcio': 'Spezia', 'FC Spezia Calcio': 'Spezia', 'Cagliari Calcio': 'Cagliari', 'Torino FC': 'Torino',
  'Benevento Calcio': 'Benevento', 'FC Crotone': 'Crotone', 'Parma Calcio 1913': 'Parma',
};
export const DB_TO_ERA_BL = {
  'Bayern Munich': 'Bayern Munich', 'RB Leipzig': 'RB Leipzig', 'Borussia Dortmund': 'Borussia Dortmund',
  'VfL Wolfsburg': 'Wolfsburg', 'Eintracht Frankfurt': 'Eintracht Frankfurt', 'Bayer 04 Leverkusen': 'Bayer Leverkusen',
  '1.FC Union Berlin': 'Union Berlin', 'Borussia Mönchengladbach': 'Gladbach', 'VfB Stuttgart': 'Stuttgart',
  'SC Freiburg': 'Freiburg', 'TSG 1899 Hoffenheim': 'Hoffenheim', '1.FSV Mainz 05': 'Mainz',
  'FC Augsburg': 'Augsburg', 'Hertha BSC': 'Hertha BSC', 'Arminia Bielefeld': 'Arminia Bielefeld',
  '1.FC Köln': 'Köln', 'SV Werder Bremen': 'Werder Bremen', 'FC Schalke 04': 'Schalke 04',
};
export const DB_TO_ERA_L1 = {
  'LOSC Lille': 'Lille', 'Paris Saint-Germain': 'PSG', 'AS Monaco': 'Monaco', 'Olympique Lyon': 'Lyon',
  'Olympique Marseille': 'Marseille', 'Stade Rennais FC': 'Rennes', 'RC Lens': 'Lens', 'Montpellier HSC': 'Montpellier',
  'OGC Nice': 'Nice', 'FC Metz': 'Metz', 'AS Saint-Étienne': 'Saint-Étienne', 'FC Girondins Bordeaux': 'Bordeaux',
  'Angers SCO': 'Angers', 'Stade Reims': 'Reims', 'RC Strasbourg Alsace': 'Strasbourg', 'FC Lorient': 'Lorient',
  'Stade Brestois 29': 'Brest', 'FC Nantes': 'Nantes', 'Nîmes Olympique': 'Nîmes', 'Dijon FCO': 'Dijon',
};

/* THE SUMMER 2020 WINDOW. A year-2020 row predates it, so the famous movers
 * sit at their 2019-20 clubs in the raw pull (Havertz at Leverkusen, Werner
 * at Leipzig, Thiago at Bayern). Every correction below is proved twice:
 * a DATED published record of the move AND the table's own year-2021 row,
 * which the shared step CHECKS in code (a move or an arrival dies unless a
 * year-2021 row names the destination; a removal dies if a year-2021 row
 * still sits inside the world, unless the record shows he reached that club
 * only in a later window). The 2021 row proves WHERE, never WHEN: it can
 * already show a January 2021 or a summer 2021 move, so the timing of every
 * line rests on its dated record, and a man whose year-2021 club he reached
 * only in January 2021 stays where the snapshot has him (Jovic, Lingard,
 * Ozil, Tomori, Milik, Moussa Dembele, Kondogbia, Willian Jose, Minamino,
 * Amad Diallo, Bruun Larsen and others). Values stay the year-2020 snapshot
 * for every player, moved or not.
 *
 * THE RECORDS, all read 2026-10-03, cited on each line by these keys:
 *   MF-EN, MF-ES, MF-IT, MF-DE   Maxifoot, "Tableaux transfert mercato Ete
 *        2020", the principal official transfers of the summer 2020 window
 *        in England, Spain, Italy and Germany, each line dated:
 *        https://www.maxifoot.fr/mercato/transfert-angleterre-ete-2020.php
 *        (and transfert-espagne-, transfert-italie-, transfert-allemagne-).
 *   MF-FR   the same publisher's French table for the same window, every
 *        Ligue 1 club's ins and outs: https://www.maxifoot.fr/mercato/index-ete-2020.php
 *   -W20, -W21, -S19, -S21   the same tables for the winter 2019-20 and
 *        winter 2020-21 windows and the summers of 2019 and 2021 (the same
 *        URL with hiver-2019-2020, hiver-2020-2021, ete-2019, ete-2021).
 *   Where a line leans on a loan's LENGTH, the record's own Maxifoot article
 *   (linked from that table line) is named on the line, because a table
 *   line that says "loan" does not say for how long: Politano's January
 *   2020 loan ran 18 months, so a January loan is never assumed to end in
 *   June. Without an article that gives its length the man stays where the
 *   snapshot has him (Ighalo at United; Cutrone at Fiorentina, whose return
 *   to Wolves is dated 7 January 2021, MF-EN-W21).
 * Maxifoot prints a few lines with the two clubs the wrong way round
 * (Loftus-Cheek, Odriozola); those name a second record.
 *
 * WHAT IS CORRECTED AND WHAT IS NOT. Every player of the five pools whose
 * year-2021 row names another club, and every year-2020 row outside the
 * pools whose year-2021 row names a club of this world, was crossed against
 * those tables by name: 638 candidates. A line below exists for each one a
 * dated record places. The round's review then crossed every shipped man
 * against those tables the other way round, by the club a summer 2020 line
 * takes him FROM, which found the leavers with no year-2021 row at all
 * (Cazorla, Glik, Tatarusanu and twelve more, each read beside a second
 * publisher) and four movers the first pass had missed (Morata, Barreca,
 * Juan Miranda, Pierre-Gabriel): 139 moves, 67 arrivals, 50 removals in all.
 * The tables list the principal transfers, not every one, so a mover with
 * no line in them stays where the year-2020 row has him, whatever his value,
 * and the harness (scripts/simEra2020.mjs) prints the biggest of them by
 * name every run (Lazaro at Newcastle, Bas Dost at Frankfurt and Biraghi at
 * Inter among them), so the gap is measured, not hidden. A move
 * the records place but the year-2021 row cannot prove is not made either:
 * Kubo (on loan at Villarreal, his year-2021 row at Getafe), Pellistri
 * (Manchester United, the row at Alaves) and Ivo Grbic (Atletico, the row at
 * Lille) are not in this world. */

/* Moves inside the world: the record named on each line, plus the year-2021 row. */
export const ERA2020_MOVES = [
  { n: 'Christian Eriksen', to: 'Inter Milan', why: 'Tottenham to Inter Milan, transfer, 28 Jan 2020 (MF-EN-W20)' },
  { n: 'Kai Havertz', to: 'Chelsea', why: 'Bayer Leverkusen to Chelsea, transfer, 4 Sep 2020 (MF-EN)' },
  { n: 'Leroy Sané', to: 'Bayern Munich', why: 'Manchester City to Bayern Munich, transfer, 3 Jul 2020 (MF-EN)' },
  { n: 'Timo Werner', to: 'Chelsea', why: 'RB Leipzig to Chelsea, transfer, 18 Jun 2020 (MF-EN)' },
  { n: 'Miralem Pjanić', to: 'Barcelona', why: 'Juventus Turin to FC Barcelone, transfer, 29 Jun 2020 (MF-IT)' },
  { n: 'Arthur Melo', to: 'Juventus', why: 'FC Barcelone to Juventus Turin, transfer, 29 Jun 2020 (MF-IT, where he is "Arthur")' },
  { n: 'Achraf Hakimi', to: 'Inter Milan', why: 'Real Madrid to Inter Milan, transfer, 2 Jul 2020 (MF-IT)' },
  { n: 'Philippe Coutinho', to: 'Barcelona', why: 'Bayern Munich to FC Barcelone, loan return, 2 Sep 2020 (MF-ES)' },
  { n: 'Ben Chilwell', to: 'Chelsea', why: 'Leicester City to Chelsea, transfer, 26 Aug 2020 (MF-EN)' },
  { n: 'Ferran Torres', to: 'Manchester City', why: 'FC Valence to Manchester City, transfer, 4 Aug 2020 (MF-EN)' },
  { n: 'Thomas Partey', to: 'Arsenal', why: 'Atl. Madrid to Arsenal, transfer, 5 Oct 2020 (MF-EN)' },
  { n: 'Victor Osimhen', to: 'Napoli', why: 'Lille to Naples, transfer, 31 Jul 2020 (MF-IT)' },
  { n: 'Federico Chiesa', to: 'Juventus', why: 'Fiorentina to Juventus Turin, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Thiago Alcántara', to: 'Liverpool', why: 'Bayern Munich to Liverpool, transfer, 18 Sep 2020 (MF-EN)' },
  { n: 'Mattéo Guendouzi', to: 'Hertha BSC', why: 'Arsenal to Hertha Berlin, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Dejan Kulusevski', to: 'Juventus', why: 'Atalanta to Juventus, transfer, 2 Jan 2020, the rest of 2019-20 on loan at Parma and Turin from 1 July (MF-IT-W20 and its article "Juve : Kulusevski, c\'est boucle ! (officiel)")' },
  { n: 'Diogo Jota', to: 'Liverpool', why: 'Wolverhampton to Liverpool, transfer, 19 Sep 2020 (MF-EN)' },
  { n: 'Nélson Semedo', to: 'Wolves', why: 'FC Barcelone to Wolverhampton, transfer, 23 Sep 2020 (MF-EN)' },
  { n: 'Rodrigo', to: 'Leeds United', why: 'FC Valence to Leeds United, transfer, 26 Aug 2020 (MF-EN)' },
  { n: 'Allan', to: 'Everton', why: 'Naples to Everton, transfer, 5 Sep 2020 (MF-IT)' },
  { n: 'Lucas Torreira', to: 'Atlético Madrid', why: 'Arsenal to Atl. Madrid, loan, 6 Oct 2020 (MF-EN)' },
  { n: 'James Rodríguez', to: 'Everton', why: 'Real Madrid to Everton, free, 7 Sep 2020 (MF-EN)' },
  { n: 'Luis Suárez', to: 'Atlético Madrid', why: 'FC Barcelone to Atl. Madrid, transfer, 24 Sep 2020 (MF-ES); the Granada row of 2021 is the namesake, below' },
  { n: 'Gareth Bale', to: 'Tottenham', why: 'Real Madrid to Tottenham, loan, 19 Sep 2020 (MF-EN)' },
  { n: 'Ryan Sessegnon', to: 'Hoffenheim', why: 'Tottenham to Hoffenheim, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Pierre-Emile Højbjerg', to: 'Tottenham', why: 'Southampton to Tottenham, transfer, 11 Aug 2020 (MF-EN)' },
  { n: 'Douglas Costa', to: 'Bayern Munich', why: 'Juventus Turin to Bayern Munich, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Tiemoué Bakayoko', to: 'Napoli', why: 'Chelsea to Naples, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Willian', to: 'Arsenal', why: 'Chelsea to Arsenal, free, 14 Aug 2020 (MF-EN)' },
  { n: 'Moise Kean', to: 'PSG', why: 'Everton to Paris SG, loan, 4 Oct 2020 (MF-EN)' },
  { n: 'Sergio Reguilón', to: 'Tottenham', why: 'Real Madrid to Tottenham, transfer, 19 Sep 2020 (MF-EN)' },
  { n: 'Dani Parejo', to: 'Villarreal', why: 'FC Valence to Villarreal, transfer, 12 Aug 2020 (MF-ES)' },
  { n: 'Lucas Paquetá', to: 'Lyon', why: 'Milan AC to Lyon, transfer, 30 Sep 2020 (MF-IT)' },
  { n: 'Kevin Volland', to: 'Monaco', why: 'Bayer Leverkusen to Monaco, transfer, 2 Sep 2020 (MF-DE)' },
  { n: 'Gabriel', to: 'Arsenal', why: 'Lille to Arsenal, transfer, 1 Sep 2020 (MF-EN)' },
  { n: 'Marash Kumbulla', to: 'Roma', why: 'Hellas Vérone to AS Rome, loan, 17 Sep 2020 (MF-IT)' },
  { n: 'Wesley Fofana', to: 'Leicester City', why: 'St Etienne to Leicester City, transfer, 2 Oct 2020 (MF-EN)' },
  { n: 'Matteo Politano', to: 'Napoli', why: 'Inter Milan to Naples, an 18 month loan with an option, 28 Jan 2020 (MF-IT-W20 and its article "Inter : Politano rejoint Naples (officiel)")' },
  { n: 'Weston McKennie', to: 'Juventus', why: 'Schalke 04 to Juventus Turin, loan, 29 Aug 2020 (MF-IT)' },
  { n: 'Patrik Schick', to: 'Bayer Leverkusen', why: 'AS Rome to Bayer Leverkusen, transfer, 8 Sep 2020 (MF-IT)' },
  { n: 'Edouard Mendy', to: 'Chelsea', why: 'Rennes to Chelsea, transfer, 23 Sep 2020 (MF-EN)' },
  { n: 'Jeff Reine-Adélaïde', to: 'Nice', why: 'Lyon to Nice, loan, 6 Oct 2020 (MF-FR)' },
  { n: 'Ruben Loftus-Cheek', to: 'Fulham', why: 'Chelsea to Fulham, loan, 5 Oct 2020 (MF-EN prints the two clubs the other way round; premierleague.com, "Transfer Deadline Day Summer 2020: All the confirmed deals", 6 Oct 2020)' },
  { n: 'Timothy Castagne', to: 'Leicester City', why: 'Atalanta Bergame to Leicester City, transfer, 3 Sep 2020 (MF-IT)' },
  { n: 'Thomas Meunier', to: 'Borussia Dortmund', why: 'Paris SG to Borussia Dortmund, free, 25 Jun 2020 (MF-DE)' },
  { n: 'Reinier', to: 'Borussia Dortmund', why: 'Real Madrid to Borussia Dortmund, loan, 19 Aug 2020 (MF-ES, where he is "Reinier Carvalho")' },
  { n: 'Jean-Philippe Gbamin', to: 'Everton', why: 'Mainz to Everton, transfer, 2 Aug 2019 (MF-DE-S19); the year-2020 row files him at Metz, which no record does' },
  { n: 'Ross Barkley', to: 'Aston Villa', why: 'Chelsea to Aston Villa, loan, 30 Sep 2020 (MF-EN)' },
  { n: 'Matt Doherty', to: 'Tottenham', why: 'Wolverhampton to Tottenham, transfer, 30 Aug 2020 (MF-EN)' },
  { n: 'Diego Llorente', to: 'Leeds United', why: 'Real Sociedad to Leeds United, transfer, 22 Sep 2020 (MF-EN)' },
  { n: 'Frank Anguissa', to: 'Fulham', why: 'Fulham to Villarreal, a one year loan, 26 Jul 2019 (MF-ES-S19 and its article "Villarreal : Anguissa arrive en pret (off.)")' },
  { n: 'Ivan Rakitic', to: 'Sevilla', why: 'FC Barcelone to FC Seville, transfer, 1 Sep 2020 (MF-ES)' },
  { n: 'Sofyan Amrabat', to: 'Fiorentina', why: 'Hellas Verona to Fiorentina, transfer, 31 Jan 2020, the rest of 2019-20 on loan at Verona (MF-IT-W20 and its article "Fiorentina : Amrabat pour 20 M (officiel)")' },
  { n: 'Joachim Andersen', to: 'Fulham', why: 'Lyon to Fulham, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Raphinha', to: 'Leeds United', why: 'Rennes to Leeds United, transfer, 5 Oct 2020 (MF-EN)' },
  { n: 'Lucas Tousart', to: 'Hertha BSC', why: 'Lyon to Hertha Berlin, loan return, 31 May 2020 (MF-DE)' },
  { n: 'Edinson Cavani', to: 'Manchester United', why: 'Paris SG to Manchester Utd, free, 5 Oct 2020 (MF-EN)' },
  { n: 'Francis Coquelin', to: 'Villarreal', why: 'FC Valence to Villarreal, transfer, 12 Aug 2020 (MF-ES)' },
  { n: 'Emiliano Martínez', to: 'Aston Villa', why: 'Arsenal to Aston Villa, transfer, 16 Sep 2020 (MF-EN)' },
  { n: 'Diogo Dalot', to: 'AC Milan', why: 'Manchester Utd to Milan AC, loan, 4 Oct 2020 (MF-IT)' },
  { n: 'Michy Batshuayi', to: 'Crystal Palace', why: 'Chelsea to Crystal Palace, loan, 10 Sep 2020 (MF-EN)' },
  { n: 'Ivan Perišić', to: 'Inter Milan', why: 'Bayern Munich to Inter Milan, loan return, 9 Sep 2020 (MF-IT)' },
  { n: 'Robin Koch', to: 'Leeds United', why: 'Fribourg to Leeds United, transfer, 30 Aug 2020 (MF-EN)' },
  { n: 'Aurélien Tchouaméni', to: 'Monaco', why: 'Bordeaux to Monaco, transfer, 29 Jan 2020 (MF-FR-W20)' },
  { n: 'Alessandro Florenzi', to: 'PSG', why: 'AS Rome to Paris SG, loan, 11 Sep 2020 (MF-IT)' },
  { n: 'Álvaro Odriozola', to: 'Real Madrid', why: 'Bayern Munich back to Real Madrid, loan return, 3 Sep 2020 (MF-ES prints the clubs the other way round; the loan out of Real Madrid on 22 Jan 2020 is MF-ES-W20)' },
  { n: 'Keita Baldé', to: 'Sampdoria', why: 'Monaco to Sampdoria Gênes, loan, 30 Sep 2020 (MF-IT)' },
  { n: 'Pervis Estupiñán', to: 'Villarreal', why: 'Watford to Villarreal, transfer, 16 Sep 2020 (MF-EN)' },
  { n: 'Cristian Romero', to: 'Atalanta', why: 'Juventus Turin to Atalanta Bergame, loan, 5 Sep 2020 (MF-IT)' },
  { n: 'Axel Disasi', to: 'Monaco', why: 'Reims to Monaco, transfer, 7 Aug 2020 (MF-FR)' },
  { n: 'Wylan Cyprien', to: 'Parma', why: 'Nice to Parme, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Amine Gouiri', to: 'Nice', why: 'Lyon to Nice, transfer, 1 Jul 2020 (MF-FR)' },
  { n: 'Habib Diallo', to: 'Strasbourg', why: 'Metz to Strasbourg, transfer, 5 Oct 2020 (MF-FR)' },
  { n: 'Ibrahima Diallo', to: 'Southampton', why: 'Brest to Southampton, transfer, 4 Oct 2020 (MF-EN)' },
  { n: 'Maxime Lopez', to: 'Sassuolo', why: 'Marseille to Sassuolo, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Brahim Díaz', to: 'AC Milan', why: 'Real Madrid to Milan AC, loan, 4 Sep 2020 (MF-IT)' },
  { n: 'Luca Pellegrini', to: 'Genoa', why: 'Juventus Turin to Genoa, loan, 26 Sep 2020 (MF-IT)' },
  { n: 'Alphonse Areola', to: 'Fulham', why: 'Paris SG to Fulham, loan, 9 Sep 2020 (MF-EN)' },
  { n: 'Bertrand Traoré', to: 'Aston Villa', why: 'Lyon to Aston Villa, transfer, 19 Sep 2020 (MF-EN)' },
  { n: 'Youssouf Fofana', to: 'Monaco', why: 'Strasbourg to Monaco, transfer, 29 Jan 2020 (MF-FR-W20)' },
  { n: 'David Silva', to: 'Real Sociedad', why: 'Manchester City to Real Sociedad, free, 18 Aug 2020 (MF-EN)' },
  { n: 'Theo Walcott', to: 'Southampton', why: 'Everton to Southampton, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Pedro', to: 'Roma', why: 'Chelsea to AS Rome, free, 25 Aug 2020 (MF-IT)' },
  { n: 'Cenk Tosun', to: 'Everton', why: 'Everton to Crystal Palace, a loan to the end of 2019-20, 10 Jan 2020 (MF-EN-W20 and its article "Everton : Tosun prete a Crystal Palace (off.)")' },
  { n: 'Giacomo Bonaventura', to: 'Fiorentina', why: 'Milan AC to Fiorentina, free, 8 Sep 2020 (MF-IT)' },
  { n: 'José Callejón', to: 'Fiorentina', why: 'Naples to Fiorentina, free, 5 Oct 2020 (MF-IT)' },
  { n: 'Davide Zappacosta', to: 'Genoa', why: 'Chelsea to Genoa, loan, 19 Sep 2020 (MF-IT)' },
  { n: 'Benjamin Henrichs', to: 'RB Leipzig', why: 'Monaco to RB Leipzig, loan, 8 Jul 2020 (MF-DE)' },
  { n: 'Martin Terrier', to: 'Rennes', why: 'Lyon to Rennes, transfer, 6 Jul 2020 (MF-FR)' },
  { n: 'Arturo Vidal', to: 'Inter Milan', why: 'FC Barcelone to Inter Milan, transfer, 22 Sep 2020 (MF-IT)' },
  { n: 'Djibril Sidibé', to: 'Monaco', why: 'Everton to Monaco, loan return, 31 May 2020 (MF-EN)' },
  { n: 'Morgan Schneiderlin', to: 'Nice', why: 'Everton to Nice, transfer, 23 Jun 2020 (MF-EN)' },
  { n: 'Rony Lopes', to: 'Nice', why: 'FC Seville to Nice, loan, 29 Jul 2020 (MF-ES)' },
  { n: 'Borja Mayoral', to: 'Roma', why: 'Real Madrid to AS Rome, loan, 2 Oct 2020 (MF-IT)' },
  { n: 'Seko Fofana', to: 'Lens', why: 'Udinese to Lens, transfer, 18 Aug 2020 (MF-IT)' },
  { n: 'Michaël Cuisance', to: 'Marseille', why: 'Bayern Munich to Marseille, loan, 5 Oct 2020 (MF-DE)' },
  { n: 'Adil Aouchiche', to: 'Saint-Étienne', why: 'Paris SG to St Etienne, free, 20 Jul 2020 (MF-FR)' },
  { n: 'Baptiste Santamaria', to: 'Freiburg', why: 'Angers to Fribourg, transfer, 17 Sep 2020 (MF-DE)' },
  { n: 'Adam Lallana', to: 'Brighton', why: 'Liverpool to Brighton, free, 28 Jul 2020 (MF-EN)' },
  { n: 'Rafinha', to: 'PSG', why: 'FC Barcelone to Paris SG, transfer, 6 Oct 2020 (MF-ES)' },
  { n: 'Carles Pérez', to: 'Roma', why: 'FC Barcelone to AS Rome, a loan with an obligation to buy, 30 Jan 2020 (MF-IT-W20 and its article "Barca : Carles Perez part a la Roma (off.)")' },
  { n: 'Dalbert', to: 'Rennes', why: 'Inter Milan to Rennes, loan, 3 Oct 2020 (MF-IT)' },
  { n: 'Mattia De Sciglio', to: 'Lyon', why: 'Juventus Turin to Lyon, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Alfred Gomis', to: 'Rennes', why: 'Dijon to Rennes, transfer, 29 Sep 2020 (MF-FR)' },
  { n: 'Bouna Sarr', to: 'Bayern Munich', why: 'Marseille to Bayern Munich, transfer, 5 Oct 2020 (MF-DE)' },
  { n: 'Sofiane Boufal', to: 'Angers', why: 'Southampton to Angers, transfer, 5 Oct 2020 (MF-EN)' },
  { n: 'Paul Bernardoni', to: 'Angers', why: 'Bordeaux to Angers, transfer, 8 Jun 2020 (MF-FR)' },
  { n: 'Gerónimo Rulli', to: 'Villarreal', why: 'Real Sociedad to Villarreal, transfer, 4 Sep 2020 (MF-ES)' },
  { n: 'Hassane Kamara', to: 'Nice', why: 'Reims to Nice, transfer, 25 Jun 2020 (MF-FR)' },
  { n: 'Adam Ounas', to: 'Cagliari', why: 'Naples to Cagliari, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Adrien Silva', to: 'Sampdoria', why: 'Leicester City to Sampdoria Gênes, transfer, 3 Oct 2020 (MF-IT)' },
  { n: 'Matteo Darmian', to: 'Inter Milan', why: 'Parme to Inter Milan, loan, 5 Oct 2020 (MF-IT)' },
  { n: 'Mijat Gacinovic', to: 'Hoffenheim', why: 'Eintracht Francfort to Hoffenheim, transfer, 4 Aug 2020 (MF-DE)' },
  { n: 'Ignatius Ganago', to: 'Lens', why: 'Nice to Lens, transfer, 10 Jul 2020 (MF-FR)' },
  { n: 'Robin Olsen', to: 'Everton', why: 'AS Rome to Everton, loan, 6 Oct 2020 (MF-IT)' },
  { n: 'Aleksandar Kolarov', to: 'Inter Milan', why: 'AS Rome to Inter Milan, transfer, 8 Sep 2020 (MF-IT)' },
  { n: 'Arthur Zagré', to: 'Dijon', why: 'Monaco to Dijon, loan, 6 Oct 2020 (MF-FR)' },
  { n: 'Amin Younes', to: 'Eintracht Frankfurt', why: 'Naples to Eintracht Francfort, loan, 3 Oct 2020 (MF-IT)' },
  { n: 'Marko Pjaca', to: 'Genoa', why: 'Juventus Turin to Genoa, loan, 19 Sep 2020 (MF-IT)' },
  { n: 'Adrien Tamèze', to: 'Verona', why: 'Nice to Hellas Vérone, transfer, 4 Sep 2020 (MF-IT)' },
  { n: 'Christophe Hérelle', to: 'Brest', why: 'Nice to Brest, transfer, 11 Aug 2020 (MF-FR)' },
  { n: 'Kenny Tete', to: 'Fulham', why: 'Lyon to Fulham, transfer, 8 Sep 2020 (MF-EN)' },
  { n: 'Hatem Ben Arfa', to: 'Bordeaux', why: 'Real Valladolid to Bordeaux, free, 7 Oct 2020 (MF-ES)' },
  { n: 'Thiago Silva', to: 'Chelsea', why: 'Paris SG to Chelsea, free, 28 Aug 2020 (MF-EN)' },
  { n: 'Franck Honorat', to: 'Brest', why: 'St Etienne to Brest, transfer, 1 Jul 2020 (MF-FR)' },
  { n: 'Eric-Maxim Choupo-Moting', to: 'Bayern Munich', why: 'Paris SG to Bayern Munich, free, 5 Oct 2020 (MF-DE)' },
  { n: 'Joe Hart', to: 'Tottenham', why: 'Burnley to Tottenham, free, 18 Aug 2020 (MF-EN)' },
  { n: 'Pedro Chirivella', to: 'Nantes', why: 'Liverpool to Nantes, free, 12 Jun 2020 (MF-EN)' },
  { n: 'Hamza Mendyl', to: 'Schalke 04', why: 'Dijon to Schalke 04, loan return, 31 May 2020 (MF-DE)' },
  { n: 'Patrick Burner', to: 'Nîmes', why: 'Nice to Nimes, transfer, 25 Sep 2020 (MF-FR)' },
  { n: 'Jonathan Clauss', to: 'Lens', why: 'Arminia Bielefeld to Lens, free, 19 Jun 2020 (MF-DE)' },
  { n: 'Rúnar Alex Rúnarsson', to: 'Arsenal', why: 'Dijon to Arsenal, transfer, 21 Sep 2020 (MF-EN)' },
  { n: 'Sacha Boey', to: 'Dijon', why: 'Rennes to Dijon, loan, 5 Oct 2020 (MF-FR)' },
  { n: 'Claudio Bravo', to: 'Real Betis', why: 'Manchester City to Betis Séville, free, 31 Aug 2020 (MF-EN)' },
  { n: 'Jimmy Cabot', to: 'Angers', why: 'Lorient to Angers, free, 25 Sep 2020 (MF-FR)' },
  /* Round 971 review fix: two leavers the first bake missed (its name match
     read Mainz's French spelling "Mayence" as no club of this world). */
  { n: 'Ronaël Pierre-Gabriel', to: 'Brest', why: 'Mayence to Brest, loan, 7 Jul 2020 (MF-DE, MF-FR)' },
  /* The loans to Fiorentina and Betis are not in the Maxifoot tables, so two
     other publishers date each (read 2026-10-05). */
  { n: 'Álvaro Morata', to: 'Juventus', why: 'Atletico Madrid to Juventus, loan, 22 Sep 2020 (juventus.com, "Welcome home, Alvaro!"; Sky Sports, "Alvaro Morata returns to Juventus on loan from Atletico Madrid")' },
  { n: 'Antonio Barreca', to: 'Fiorentina', why: 'Genoa to Monaco, loan return, 3 Aug 2020 (MF-IT, MF-FR), then Monaco to Fiorentina, loan, 5 Oct 2020 (Corriere dello Sport, 5 Oct 2020, "Fiorentina, preso Barreca"; asmonaco.com, "Antonio Barreca loaned to Fiorentina"), back 31 May 2021 (MF-IT-S21)' },
  { n: 'Juan Miranda', to: 'Real Betis', why: 'Schalke 04 to FC Barcelone, loan return, 30 Jun 2020 (MF-ES, MF-DE), then Barcelona to Real Betis, loan, 5 Oct 2020 (Football Espana, 5 Oct 2020, "Barcelona defender Miranda joining Betis on loan deal"; fcbarcelona.com, "Miranda to stay at Betis": on loan there in 2020/21)' },
];

/* Arrivals from outside the five leagues (or from a club that went down in 2020):
   the year-2020 row at the table club named, placed at the engine club. */
export const ERA2020_ARRIVALS = [
  { n: 'Bruno Fernandes', from: 'Sporting CP', to: 'Manchester United', why: 'Sporting Lisbonne to Manchester Utd, transfer, 29 Jan 2020 (MF-EN-W20)' },
  { n: 'Rúben Dias', from: 'SL Benfica', to: 'Manchester City', why: 'Benfica Lisbonne to Manchester City, transfer, 28 Sep 2020 (MF-EN)' },
  { n: 'Hakim Ziyech', from: 'Ajax Amsterdam', to: 'Chelsea', why: 'Ajax Amsterdam to Chelsea, transfer, 3 Jun 2020 (MF-EN)' },
  { n: 'Donny van de Beek', from: 'Ajax Amsterdam', to: 'Manchester United', why: 'Ajax Amsterdam to Manchester Utd, transfer, 2 Sep 2020 (MF-EN)' },
  { n: 'Nathan Aké', from: 'AFC Bournemouth', to: 'Manchester City', why: 'Bournemouth to Manchester City, transfer, 5 Aug 2020 (MF-EN)' },
  { n: 'Alex Telles', from: 'FC Porto', to: 'Manchester United', why: 'FC Porto to Manchester Utd, transfer, 5 Oct 2020 (MF-EN)' },
  { n: 'Sandro Tonali', from: 'Brescia Calcio', to: 'AC Milan', why: 'Brescia to Milan AC, loan, 9 Sep 2020 (MF-IT)' },
  { n: 'Pedri', from: 'UD Las Palmas', to: 'Barcelona', why: 'UD Las Palmas to FC Barcelone, transfer, 2 Sep 2019 (MF-ES-S19)' },
  { n: 'Jonathan David', from: 'KAA Gent', to: 'Lille', why: 'La Gantoise to Lille, transfer, 11 Aug 2020 (MF-FR)' },
  { n: 'Steven Bergwijn', from: 'PSV Eindhoven', to: 'Tottenham', why: 'PSV Eindhoven to Tottenham, transfer, 29 Jan 2020 (MF-EN-W20)' },
  { n: 'Jude Bellingham', from: 'Birmingham City', to: 'Borussia Dortmund', why: 'Birmingham City to Borussia Dortmund, transfer, 20 Jul 2020 (MF-DE)' },
  { n: 'Ben Godfrey', from: 'Norwich City', to: 'Everton', why: 'Norwich City to Everton, transfer, 5 Oct 2020 (MF-EN)' },
  { n: 'Abdoulaye Doucouré', from: 'Watford FC', to: 'Everton', why: 'Watford to Everton, transfer, 8 Sep 2020 (MF-EN)' },
  { n: 'Fábio Silva', from: 'FC Porto', to: 'Wolves', why: 'FC Porto to Wolverhampton, transfer, 5 Sep 2020 (MF-EN)' },
  { n: 'Danilo Pereira', from: 'FC Porto', to: 'PSG', why: 'FC Porto to Paris SG, loan, 4 Oct 2020 (MF-FR)' },
  { n: 'Callum Wilson', from: 'AFC Bournemouth', to: 'Newcastle', why: 'Bournemouth to Newcastle, transfer, 7 Sep 2020 (MF-EN)' },
  { n: 'Sergiño Dest', from: 'Ajax Amsterdam U21', to: 'Barcelona', why: 'Ajax Amsterdam to FC Barcelone, transfer, 1 Oct 2020 (MF-ES)' },
  { n: 'Jérémy Doku', from: 'RSC Anderlecht', to: 'Rennes', why: 'Anderlecht to Rennes, transfer, 4 Oct 2020 (MF-FR)' },
  { n: 'Carlos Vinícius', from: 'SL Benfica', to: 'Tottenham', why: 'Benfica Lisbonne to Tottenham, loan, 2 Oct 2020 (MF-EN)' },
  { n: 'Alexander Sørloth', from: 'Trabzonspor', to: 'RB Leipzig', why: 'Crystal Palace to RB Leipzig, transfer, 22 Sep 2020 (MF-EN)' },
  { n: 'Aleksey Miranchuk', from: 'Lokomotiv Moscow', to: 'Atalanta', why: 'Lokomotiv Moscou to Atalanta Bergame, transfer, 30 Aug 2020 (MF-IT)' },
  { n: 'Florentino', from: 'SL Benfica', to: 'Monaco', why: 'Benfica Lisbonne to Monaco, loan, 25 Sep 2020 (MF-FR, where he is "Florentino Luis")' },
  { n: 'Marc Roca', from: 'RCD Espanyol Barcelona', to: 'Bayern Munich', why: 'Espanyol Barcelone to Bayern Munich, transfer, 4 Oct 2020 (MF-ES)' },
  { n: 'Óscar Rodríguez', from: 'CD Leganés', to: 'Sevilla', why: 'Real Madrid to FC Seville, transfer, 30 Aug 2020 (MF-ES)' },
  { n: 'Hee-chan Hwang', from: 'Red Bull Salzburg', to: 'RB Leipzig', why: 'Red Bull Salzbourg to RB Leipzig, transfer, 8 Jul 2020 (MF-DE)' },
  { n: 'Serhou Guirassy', from: 'Amiens SC', to: 'Rennes', why: 'Amiens to Rennes, transfer, 27 Aug 2020 (MF-FR)' },
  { n: 'Mario Lemina', from: 'Galatasaray', to: 'Fulham', why: 'Southampton to Fulham, loan, 30 Aug 2020 (MF-EN)' },
  { n: 'Marcos Acuña', from: 'Sporting CP', to: 'Sevilla', why: 'Sporting Lisbonne to FC Seville, transfer, 14 Sep 2020 (MF-ES)' },
  { n: 'Jens Petter Hauge', from: 'FK Bodø/Glimt', to: 'AC Milan', why: 'Bodo-Glimt to Milan AC, transfer, 1 Oct 2020 (MF-IT)' },
  { n: 'Konstantinos Tsimikas', from: 'Olympiacos Piraeus', to: 'Liverpool', why: 'Olympiakos to Liverpool, transfer, 10 Aug 2020 (MF-EN)' },
  { n: 'Adrian Grbic', from: 'Clermont Foot 63', to: 'Lorient', why: 'Clermont F. to Lorient, transfer, 8 Jul 2020 (MF-FR)' },
  { n: 'Joël Veltman', from: 'Ajax Amsterdam', to: 'Brighton', why: 'Ajax Amsterdam to Brighton, transfer, 30 Jul 2020 (MF-EN)' },
  { n: 'Luis Henrique', from: 'Botafogo de Futebol e Regatas', to: 'Marseille', why: 'Botafogo to Marseille, transfer, 25 Sep 2020 (MF-FR)' },
  { n: 'Tino Kadewere', from: 'Le Havre AC', to: 'Lyon', why: 'Le Havre to Lyon, loan return, 31 May 2020 (MF-FR)' },
  { n: 'Steve Mounié', from: 'Huddersfield Town', to: 'Brest', why: 'Huddersfield Town to Brest, transfer, 9 Sep 2020 (MF-EN)' },
  { n: 'Ricardo Rodríguez', from: 'PSV Eindhoven', to: 'Torino', why: 'Milan AC to Torino, transfer, 19 Aug 2020 (MF-IT)' },
  { n: 'Roger Assalé', from: 'BSC Young Boys', to: 'Dijon', why: 'Young Boys Berne to Dijon, transfer, 5 Sep 2020 (MF-FR)' },
  { n: 'Mohamed Elneny', from: 'Besiktas JK', to: 'Arsenal', why: 'Arsenal to Besiktas, loan, 31 Aug 2019 (MF-EN-S19)' },
  { n: 'Jonas Omlin', from: 'FC Basel 1893', to: 'Montpellier', why: 'FC Bale to Montpellier, transfer, 12 Aug 2020 (MF-FR)' },
  { n: 'Robson Bambu', from: 'Club Athletico Paranaense', to: 'Nice', why: 'Atletico-PR to Nice, transfer, 5 Jun 2020 (MF-FR)' },
  { n: 'Jordan Lotomba', from: 'BSC Young Boys', to: 'Nice', why: 'Young Boys Berne to Nice, transfer, 3 Aug 2020 (MF-FR)' },
  { n: 'Gaël Kakuta', from: 'Amiens SC', to: 'Lens', why: 'Amiens to Lens, transfer, 9 Jul 2020 (MF-FR)' },
  { n: 'Sofiane Diop', from: 'FC Sochaux-Montbéliard', to: 'Monaco', why: 'Sochaux to Monaco, loan return, 30 Jun 2020 (MF-FR)' },
  { n: 'Terem Moffi', from: 'KV Kortrijk', to: 'Lorient', why: 'KV Courtrai to Lorient, transfer, 1 Oct 2020 (MF-FR)' },
  { n: 'Wuilker Fariñez', from: 'Millonarios FC', to: 'Lens', why: 'Millonarios to Lens, loan, 24 Jun 2020 (MF-FR)' },
  { n: 'Radoslaw Majecki', from: 'Legia Warszawa', to: 'Monaco', why: 'Legia Varsovie to Monaco, loan return, 30 Jun 2020 (MF-FR)' },
  { n: 'Loris Karius', from: 'Besiktas JK', to: 'Union Berlin', why: 'Liverpool to Union Berlin, loan, 28 Sep 2020 (MF-EN)' },
  { n: 'Caio Henrique', from: 'Grêmio Foot-Ball Porto Alegrense', to: 'Monaco', why: 'Atl. Madrid to Monaco, transfer, 27 Aug 2020 (MF-ES)' },
  { n: 'Niclas Eliasson', from: 'Bristol City', to: 'Nîmes', why: 'Bristol City to Nimes, transfer, 2 Oct 2020 (MF-FR)' },
  { n: 'Andreaw Gravillon', from: 'Ascoli Calcio', to: 'Lorient', why: 'Inter Milan to Lorient, loan, 25 Sep 2020 (MF-IT)' },
  { n: 'Jonathan Panzo', from: 'Cercle Brugge', to: 'Dijon', why: 'Monaco to Dijon, transfer, 26 Aug 2020 (MF-FR)' },
  { n: 'Tiago Dantas', from: 'SL Benfica', to: 'Bayern Munich', why: 'Benfica Lisbonne to Bayern Munich, loan, 5 Oct 2020 (MF-DE)' },
  { n: 'Valon Berisha', from: 'Fortuna Düsseldorf', to: 'Reims', why: 'Lazio Rome to Reims, transfer, 9 Jul 2020 (MF-IT)' },
  { n: 'Andrés Cubas', from: 'CA Talleres', to: 'Nîmes', why: 'Talleres Cordoba to Nimes, transfer, 14 Jul 2020 (MF-FR)' },
  { n: 'Baptiste Reynet', from: 'FC Toulouse', to: 'Nîmes', why: 'Toulouse to Nimes, transfer, 24 Jun 2020 (MF-FR)' },
  { n: 'Loïc Badé', from: 'Le Havre AC', to: 'Lens', why: 'Le Havre to Lens, transfer, 30 Jun 2020 (MF-FR)' },
  { n: 'Trevoh Chalobah', from: 'Huddersfield Town', to: 'Lorient', why: 'Chelsea to Lorient, loan, 18 Aug 2020 (MF-EN)' },
  { n: 'Niels Nkounkou', from: 'Olympique de Marseille B', to: 'Everton', why: 'Marseille to Everton, transfer, 2 Jul 2020 (MF-EN)' },
  { n: 'Issiaga Sylla', from: 'FC Toulouse', to: 'Lens', why: 'Toulouse to Lens, loan, 13 Aug 2020 (MF-FR)' },
  { n: 'Stéphane Diarra', from: 'Le Mans FC', to: 'Lorient', why: 'Le Mans to Lorient, transfer, 30 Jun 2020 (MF-FR)' },
  { n: 'Pape Gueye', from: 'Le Havre AC', to: 'Marseille', why: 'Le Havre to Marseille, free, 1 Jul 2020 (MF-FR)' },
  { n: 'Saturnin Allagbé', from: 'Chamois Niortais FC', to: 'Dijon', why: 'Niort to Dijon, transfer, 2 Oct 2020 (MF-FR)' },
  { n: 'Marc-Aurèle Caillard', from: 'EA Guingamp', to: 'Metz', why: 'Guingamp to Metz, free, 21 Jul 2020 (MF-FR)' },
  { n: 'Aníbal Chalá', from: 'Deportivo Toluca', to: 'Dijon', why: 'LDU Quito to Dijon, loan, 26 Aug 2020 (MF-FR)' },
  { n: 'Mehdi Chahiri', from: 'Red Star FC', to: 'Strasbourg', why: 'Red Star to Strasbourg, loan return, 31 May 2020 (MF-FR)' },
  { n: 'Dan Ndoye', from: 'FC Lausanne-Sport', to: 'Nice', why: 'Lausanne-Sport to Nice, loan return, 31 Jul 2020 (MF-FR)' },
  { n: 'Thomas Monconduit', from: 'Amiens SC', to: 'Lorient', why: 'Amiens to Lorient, transfer, 26 Aug 2020 (MF-FR)' },
];

/* Out of the world by the deadline. later: the year-2021 row names a club of this
   world he reached only in a later window, named on the line. */
export const ERA2020_REMOVALS = [
  { n: 'Martin Ødegaard', later: true, why: 'Real Sociedad to Real Madrid, loan return, 12 Aug 2020 (MF-ES); then Real Madrid to Arsenal, loan, 27 Jan 2021 (MF-EN-W21)' },
  { n: 'Gonzalo Higuaín', why: 'Juventus Turin to Miami, free, 18 Sep 2020 (MF-IT)' },
  { n: 'William Saliba', later: true, why: 'St Etienne to Arsenal, loan return, 31 Jul 2020 (MF-EN); then Arsenal to Nice, loan, 4 Jan 2021 (MF-EN-W21)' },
  { n: 'Dejan Lovren', why: 'Liverpool to Zenit St Petersbourg, transfer, 27 Jul 2020 (MF-EN)' },
  { n: 'Malang Sarr', why: 'Chelsea to FC Porto, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Davy Klaassen', why: 'Werder Breme to Ajax Amsterdam, transfer, 5 Oct 2020 (MF-DE)' },
  { n: 'Blaise Matuidi', why: 'Juventus Turin to Miami, free, 13 Aug 2020 (MF-IT)' },
  { n: 'Mario Götze', why: 'Borussia Dortmund to PSV Eindhoven, free, 7 Oct 2020 (MF-DE)' },
  { n: 'Santiago Arias', later: true, why: 'Atl. Madrid to Bayer Leverkusen, loan, 24 Sep 2020 (MF-ES); the Granada row of 2021 is a later move' },
  { n: 'Jean-Kévin Augustin', why: 'RB Leipzig to Nantes, free, 6 Oct 2020 (MF-DE)' },
  { n: 'François Kamano', why: 'Bordeaux to Lokomotiv Moscou, transfer, 17 Aug 2020 (MF-FR)' },
  { n: 'Éver Banega', why: 'Sevilla to Al Shabab, transfer agreed 25 Jan 2020 (MF-ES-W20); the year-2021 row is at Al Shabab, outside this world' },
  { n: 'Victor Moses', why: 'Chelsea to Inter, a loan to the end of 2019-20, 23 Jan 2020 (MF-EN-W20 and its article "Chelsea : Moses prete a l\'Inter (officiel)")' },
  { n: 'Rachid Ghezzal', why: 'Leicester City to Besiktas, loan, 5 Oct 2020 (MF-EN)' },
  { n: 'Yann M\'Vila', why: 'St Etienne to Olympiakos, transfer, 14 Sep 2020 (MF-FR)' },
  { n: 'Moussa Wagué', why: 'FC Barcelone to PAOK Salonique, loan, 21 Sep 2020 (MF-ES)' },
  { n: 'Islam Slimani', later: true, why: 'Monaco to Leicester City, loan return, 31 May 2020 (MF-EN); then Leicester City to Lyon, free, 13 Jan 2021 (MF-EN-W21)' },
  { n: 'Rafael', why: 'Lyon to Istanbul Basaksehir, transfer, 8 Sep 2020 (MF-FR)' },
  { n: 'Danny Drinkwater', why: 'Chelsea to Aston Villa, loan, 7 Jan 2020 (MF-EN-W20); the year-2021 row is at Kasimpasa, outside this world' },
  { n: 'Youssef Aït Bennasser', why: 'Bordeaux to Monaco, loan return, 31 May 2020 (MF-FR)' },
  { n: 'Jérémy Gélin', why: 'Rennes to Royal Antwerp, loan, 5 Oct 2020 (MF-FR)' },
  { n: 'Angel Gomes', why: 'Lille to Boavista Porto, loan, 9 Aug 2020 (MF-FR)' },
  { n: 'Léo Jardim', why: 'Lille to Boavista Porto, loan, 1 Sep 2020 (MF-FR)' },
  { n: 'Gabriel Boschilia', why: 'Monaco to Porto Alegre, transfer, 28 Jan 2020 (MF-FR-W20)' },
  { n: 'Asmir Begovic', why: 'Bournemouth to AC Milan, a five month loan, 13 Jan 2020 (MF-EN-W20 and its article "Milan : Begovic remplace Reina (officiel)")' },
  { n: 'Jorge', why: 'Monaco to FC Bale, loan, 2 Oct 2020 (MF-FR)' },
  { n: 'Sergi Palencia', why: 'St Etienne to CD Leganés, loan, 28 Sep 2020 (MF-ES)' },
  { n: 'Cristian Benavente', why: 'Nantes to Pyramids FC, loan return, 31 May 2020 (MF-FR)' },
  { n: 'Nico Gaitán', why: 'Lille to Sporting Braga, free, 11 Aug 2020 (MF-FR)' },
  { n: 'Samuel Grandsir', why: 'Brest to Monaco, loan return, 31 May 2020 (MF-FR)' },
  { n: 'Jhonder Cádiz', why: 'Dijon to Benfica Lisbonne, loan return, 30 Jun 2020 (MF-FR)' },
  { n: 'Lucas Da Cunha', why: 'Rennes to Nice, transfer, 30 Sep 2020 (MF-FR)' },
  { n: 'Théo Valls', why: 'Nimes to Libre, free, 31 May 2020 (MF-FR)' },
  { n: 'Raoul Bellanova', why: 'Bordeaux to Atalanta, loan, 30 Jan 2020 (MF-IT-W20); his loan return from Pescara to Bordeaux on 31 May 2021 (MF-IT-S21) puts his 2020-21 at Pescara' },
  { n: 'Marcin Bulka', why: 'Paris SG to FC Carthagène, loan, 28 Sep 2020 (MF-FR)' },
  /* Round 971 review fix: the summer 2020 leavers with NO year-2021 row at
     all, which the first bake never looked at (its candidates were men whose
     2021 row names another club). Each is a dated Maxifoot line that takes
     him away from the club the snapshot has him at, read beside a second
     publisher (read 2026-10-05, named on the line), so the step's `single`
     flag records only that the table has no row to add. Those who went to a
     club of this world (Glik, Tatarusanu, Mavididi, Philippoteaux, Durmisi,
     Aholou) leave it rather than arrive: an arrival needs a 2021 row, and
     none of them has one. */
  { n: 'Santi Cazorla', single: true, why: 'Villarreal to Al Sadd, free, 20 Jul 2020 (MF-ES); Sky Sports, "Santi Cazorla joins Al Sadd after Villarreal send-off"' },
  { n: 'Kamil Glik', single: true, why: 'Monaco to Benevento, transfer, 11 Aug 2020 (MF-IT, MF-FR); asmonaco.com and OneFootball, "Benevento confirm signing of Kamil Glik from Monaco"' },
  { n: 'Ciprian Tătărușanu', single: true, why: 'Lyon to AC Milan, transfer, 11 Sep 2020 (MF-IT, MF-FR); acmilan.com, "Official statement: Ciprian Tataruşanu", 12 Sep 2020' },
  { n: 'Stephy Mavididi', single: true, why: 'Dijon to Juventus, loan return, 31 May 2020, then Juventus to Montpellier, transfer, 2 Jul 2020 (MF-IT, MF-FR); France 24, 2 Jul 2020, "Juventus\' top quality Mavididi joins Montpellier"' },
  { n: 'Romain Philippoteaux', single: true, why: 'Nimes to Brest, transfer, 22 Sep 2020 (MF-FR); France Bleu, 22 Sep 2020, "Romain Philippoteaux a Brest, c\'est officiel"' },
  { n: 'Mathias Autret', single: true, why: 'Brest to Auxerre, free, 30 Jun 2020 (MF-FR); MaLigue2, 29 Jun 2020, "Officiel: Mathias Autret rejoint l\'AJ Auxerre"' },
  { n: 'Arnaud Lusamba', single: true, why: 'Nice to no club, end of contract, 30 Jun 2020 (MF-FR); MaLigue2, 20 Oct 2020, "Officiel: Arnaud Lusamba de retour en Ligue 2" (Amiens, a free agent since June)' },
  { n: 'Samuel Moutoussamy', single: true, why: 'Nantes to Fortuna Sittard, loan, 7 Oct 2020 (MF-FR); Foot Mercato, "Nantes: Samuel Moutoussamy prete au Fortuna Sittard"' },
  { n: 'Assane Dioussé', single: true, why: 'St Etienne to MKE Ankaragucu, loan, 18 Sep 2020 (MF-FR), back 31 May 2021 (MF-FR-S21); foot-sur7, "ASSE Mercato: Assane Diousse file en Turquie (Officiel)"' },
  { n: 'Gaëtan Robail', single: true, why: 'Lens to Guingamp, loan, 5 Oct 2020 (MF-FR); Made in Lens, "Officiel: Gaetan Robail prete un an a Guingamp"' },
  { n: 'Jules Keita', single: true, why: 'Lens to CSKA Sofia, loan, dated 20 Aug 2020 by MF-FR; Foot Mercato, "Le RC Lens prete Jules Keita", and Lensois.com\'s review of his 2020-21 on loan at CSKA Sofia' },
  { n: 'Quentin Lecoeuche', single: true, why: 'Lorient to AC Ajaccio, loan, 16 Jul 2020 (MF-FR); fclorient.bzh, "Quentin Lecoeuche prete a l\'AC Ajaccio"' },
  { n: 'Riza Durmisi', single: true, why: 'Nice to Lazio, loan return, 31 May 2020 (MF-IT, MF-FR); Football Italia, "Nice send back Ounas and Durmisi", and The Laziali, 5 May 2020, Nice turning down the option to buy' },
  { n: 'Jean-Eudes Aholou', single: true, why: 'St Etienne to Monaco, loan return, 31 Jul 2020, then Monaco to Strasbourg, loan, 29 Sep 2020 (MF-FR); asmonaco.com, "Jean-Eudes Aholou prete au RC Strasbourg"' },
  { n: 'Joris Gnagnon', single: true, why: 'Rennes to Sevilla, loan return, 31 May 2020 (MF-ES, MF-FR); Foot Mercato\'s Rennes 2020-21 transfer table, "Retour de pret, Rennes, FC Seville"' },
];

/* A 2020-21 world without its own headlines is not that season, and the
   window has to have landed: these men must be where 2020-21 had them. */
export const ERA2020_ANCHORS = [
  ['Manchester City', 'Kevin De Bruyne'], ['Manchester City', 'Rúben Dias'], ['Liverpool', 'Mohamed Salah'],
  ['Liverpool', 'Thiago Alcántara'], ['Chelsea', 'Kai Havertz'], ['Chelsea', 'Timo Werner'],
  ['Manchester United', 'Bruno Fernandes'], ['Leicester City', 'Jamie Vardy'], ['Tottenham', 'Harry Kane'],
  ['Barcelona', 'Lionel Messi'], ['Atlético Madrid', 'Luis Suárez'], ['Real Madrid', 'Karim Benzema'],
  ['Juventus', 'Cristiano Ronaldo'], ['Inter Milan', 'Romelu Lukaku'], ['Inter Milan', 'Achraf Hakimi'],
  ['AC Milan', 'Zlatan Ibrahimović'], ['Bayern Munich', 'Robert Lewandowski'], ['Bayern Munich', 'Leroy Sané'],
  ['Borussia Dortmund', 'Erling Haaland'], ['Borussia Dortmund', 'Jude Bellingham'],
  ['PSG', 'Neymar'], ['PSG', 'Kylian Mbappé'], ['Lille', 'Jonathan David'],
];

/* Thin only where the table itself is thin (under 8 real rows after the
   corrections), measured on this bake: see the run's club sizes. */
export const ERA2020_THIN = ['Arminia Bielefeld', 'Benevento', 'Cádiz', 'Crotone', 'Elche'];

/* One string with year-2020 rows at two clubs of the five leagues. Since
   Round 901 the shared step makes the caller name the row that stays rather
   than settling it by value in silence. Both here are two men by the table's
   own rows (different positions, ages and values), and the row kept is the
   one the first bake of this round kept by value, so the shipped file is
   unchanged: one name, one player, the higher value stays. */
const ERA2020_POOL_NAMESAKES = [
  { n: 'Sergio Álvarez', keep: 'Eibar', why: 'two men: Eibar\'s defensive midfielder (27, 1.5m) and Celta\'s keeper (33, 0.8m), whose row is dropped by the one name rule' },
  { n: 'Adama Traoré', keep: 'Wolves', why: 'two men: Wolves\' right winger (23, 32.3m) and Metz\'s central midfielder (24, 2.3m), whose row is dropped by the one name rule' },
];

/* THE EMPTY ERA the shared step grows from: no leagues, no players. Written
   to the temp folder on every run, never shipped, so the step's own audit
   (every shipped line survives byte for byte) holds trivially and every
   line of the output is a new league line it baked itself. */
const EMPTY_BASE = [
  '// The empty 2020-21 era scripts/bakeEra2020.mjs grows the five leagues from.',
  `import type { BakedPlayer } from '@/data/clubManagerRosters';`, '',
  'export const ERA2020_META = {', '  year: 2020,', '  players: 0,', '  clubs: 0,', '  moves: 0,', '};', '',
  'export const ERA2020_PARTIAL: string[] = [];', '',
  'export const ERA2020_ROSTERS: Record<string, BakedPlayer[]> = {', '};', '',
].join('\n');

const OUT = path.join(ROOT, 'src/data/clubManagerEra2020.ts');
const base = path.join(os.tmpdir(), `era2020-empty-${process.pid}.ts`);
fs.writeFileSync(base, EMPTY_BASE);
const check = process.argv.includes('--check');
const dry = process.argv.includes('--dry') || check;
const rows = readPull(argOf('--pull', 'C:/Users/antho/dukb-handoff/data/market-base-2020-2021.json'));
const res = runExtend({
  file: base, outFile: OUT, prefix: 'ERA2020', year: 2020, rows, nextRows: rows,
  newLeagues: [
    { label: 'Premier League', dbToEra: DB_TO_ERA_PL },
    { label: 'La Liga', dbToEra: DB_TO_ERA_LL },
    { label: 'Serie A', dbToEra: DB_TO_ERA_SA },
    { label: 'Bundesliga', dbToEra: DB_TO_ERA_BL },
    { label: 'Ligue 1', dbToEra: DB_TO_ERA_L1 },
  ],
  worldDbToEra: { ...DB_TO_ERA_PL, ...DB_TO_ERA_LL, ...DB_TO_ERA_SA, ...DB_TO_ERA_BL, ...DB_TO_ERA_L1 },
  moves: ERA2020_MOVES, arrivals: ERA2020_ARRIVALS, removals: ERA2020_REMOVALS, folds: [], namesakes: [], poolNamesakes: ERA2020_POOL_NAMESAKES,
  anchors: ERA2020_ANCHORS, expectedThin: ERA2020_THIN,
  header: s => [
    '// AUTO-GENERATED by scripts/bakeEra2020.mjs (Round 971).',
    '// The 2020-21 era world: real year-2020 Transfermarkt rows from',
    `// player_market_values for all ${s.clubs} clubs of the 2020-21 Premier League,`,
    '// La Liga, Serie A, Bundesliga and Ligue 1, baked through the shared extend',
    '// step (scripts/lib/eraBakeExtend.mjs) from an empty era and an offline pull',
    '// of the base table. Memberships and sources are in the script header. The',
    `// summer 2020 window corrections with a dated record are applied (${s.moves} rows`,
    '// moved, arrived or removed). Values in £m at the year-2020 snapshot,',
    '// ratings 48-94 on the same curve as the 2026 bake.',
    '// Regenerate per the header of scripts/bakeEra2020.mjs.',
    '// DO NOT EDIT BY HAND.',
  ],
}, { write: !dry });
fs.rmSync(base, { force: true });
const s = res.stats;
console.log(`Baked ${s.players} players across ${s.clubs} clubs (${s.partial.length} partial: ${s.partial.join(', ')}).`);
console.log(`Window: ${s.moved} moved, ${s.arrived} arrived, ${s.removed} removed; ${s.collisions} namesakes resolved.`);
console.log(`Club sizes: ${Object.entries(s.sizes).sort((a, b) => a[1] - b[1]).map(([c, n]) => `${c} ${n}`).join(', ')}`);
if (check) {
  const norm = t => t.replace(/\r\n/g, '\n');
  /* --against= names another copy to compare with (simEraBakeExtend's
     control hands it a mutated one); the default is the shipped file. */
  const against = argOf('--against', OUT);
  if (!fs.existsSync(against) || norm(fs.readFileSync(against, 'utf8')) !== norm(res.text)) {
    console.error(`CHECK: the rebuilt era file differs from ${against === OUT ? 'src/data/clubManagerEra2020.ts' : against}`);
    process.exit(1);
  }
  console.log('CHECK: the rebuilt era file is byte identical to the shipped one (line endings aside).');
  process.exit(0);
}
/* The market's nationality filter reads one map per world, holding exactly
   this world's names, each with the nationality on the row it was baked from. */
if (!dry) {
  const n = updateNationalityBlock(path.join(ROOT, 'src/data/playerNationalities.ts'), 'era2020', res);
  console.log(`Nationalities, era2020 block: ${n.added} added, ${n.changed} re-pointed, ${n.dropped} dropped, ${n.total} entries for ${s.players} players.`);
}
