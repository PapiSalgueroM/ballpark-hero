import { UfcFighter, FightResult, WeightClass } from '@/types/ufcChain';

/* Round 660: records, divisions and Hall of Fame flags checked on 2026-09-19
   against ufc.com, Sherdog and ESPN, and the UFC Hall of Fame list. Stipe
   Miocic, Cain Velasquez and Henry Cejudo were flagged as Hall of Famers and
   are not; a fight wing induction (Jon Jones, Israel Adesanya) honours the
   fight, not the fighter, so it does not count here either.
   Junior dos Santos and Yoel Romero left the chain because the sources do not agree on their record.

   weightClass here is NOT the same field as weightClass in
   src/data/ufcFighters.ts, and the two are allowed to differ for one reason.
   Here it decides which division's CHAIN a fighter belongs to, so it can be a
   division they have since left; there it is the division they last competed
   in. Every such pair is in the record with a source for both.
   scripts/simUfcFacts.mjs compares the two files, and
   scripts/simSportsFacts.mjs compares both with the record. */
export const UFC_FIGHTERS: UfcFighter[] = [

  { name: 'Jon Jones', weightClass: 'Heavyweight', record: '28-1-0', wins: 28, losses: 1, draws: 0, isHallOfFamer: false },

  { name: 'Stipe Miocic', weightClass: 'Heavyweight', record: '20-5-0', wins: 20, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Francis Ngannou', weightClass: 'Heavyweight', record: '19-3-0', wins: 19, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Daniel Cormier', weightClass: 'Heavyweight', record: '22-3-0', wins: 22, losses: 3, draws: 0, isHallOfFamer: true },

  { name: 'Cain Velasquez', weightClass: 'Heavyweight', record: '14-3-0', wins: 14, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Tom Aspinall', weightClass: 'Heavyweight', record: '15-3-0', wins: 15, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Ciryl Gane', weightClass: 'Heavyweight', record: '14-2-0', wins: 14, losses: 2, draws: 0, isHallOfFamer: false },


  { name: 'Alex Pereira', weightClass: 'Light Heavyweight', record: '13-4-0', wins: 13, losses: 4, draws: 0, isHallOfFamer: false },

  { name: 'Jamahal Hill', weightClass: 'Light Heavyweight', record: '12-4-0', wins: 12, losses: 4, draws: 0, isHallOfFamer: false },

  { name: 'Glover Teixeira', weightClass: 'Light Heavyweight', record: '33-9-0', wins: 33, losses: 9, draws: 0, isHallOfFamer: false },

  { name: 'Jan Blachowicz', weightClass: 'Light Heavyweight', record: '29-12-2', wins: 29, losses: 12, draws: 2, isHallOfFamer: false },

  { name: 'Jiří Procházka', weightClass: 'Light Heavyweight', record: '32-6-1', wins: 32, losses: 6, draws: 1, isHallOfFamer: false },

  { name: 'Chuck Liddell', weightClass: 'Light Heavyweight', record: '21-9-0', wins: 21, losses: 9, draws: 0, isHallOfFamer: true },

  { name: 'Randy Couture', weightClass: 'Light Heavyweight', record: '19-11-0', wins: 19, losses: 11, draws: 0, isHallOfFamer: true },


  { name: 'Israel Adesanya', weightClass: 'Middleweight', record: '24-6-0', wins: 24, losses: 6, draws: 0, isHallOfFamer: false },

  { name: 'Dricus du Plessis', weightClass: 'Middleweight', record: '24-3-0', wins: 24, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Sean Strickland', weightClass: 'Middleweight', record: '31-7-0', wins: 31, losses: 7, draws: 0, isHallOfFamer: false },

  { name: 'Robert Whittaker', weightClass: 'Middleweight', record: '28-9-0', wins: 28, losses: 9, draws: 0, isHallOfFamer: false },

  { name: 'Paulo Costa', weightClass: 'Middleweight', record: '16-4-0', wins: 16, losses: 4, draws: 0, isHallOfFamer: false },

  { name: 'Anderson Silva', weightClass: 'Middleweight', record: '34-11-0', wins: 34, losses: 11, draws: 0, isHallOfFamer: true },

  { name: 'Michael Bisping', weightClass: 'Middleweight', record: '30-9-0', wins: 30, losses: 9, draws: 0, isHallOfFamer: true },


  { name: 'Leon Edwards', weightClass: 'Welterweight', record: '22-6-0', wins: 22, losses: 6, draws: 0, isHallOfFamer: false },

  { name: 'Belal Muhammad', weightClass: 'Welterweight', record: '24-6-0', wins: 24, losses: 6, draws: 0, isHallOfFamer: false },

  { name: 'Shavkat Rakhmonov', weightClass: 'Welterweight', record: '19-0-0', wins: 19, losses: 0, draws: 0, isHallOfFamer: false },

  { name: 'Kamaru Usman', weightClass: 'Welterweight', record: '21-5-0', wins: 21, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Colby Covington', weightClass: 'Welterweight', record: '17-5-0', wins: 17, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Jorge Masvidal', weightClass: 'Welterweight', record: '35-17-0', wins: 35, losses: 17, draws: 0, isHallOfFamer: false },

  { name: 'Tyron Woodley', weightClass: 'Welterweight', record: '19-7-1', wins: 19, losses: 7, draws: 1, isHallOfFamer: false },

  { name: 'Robbie Lawler', weightClass: 'Welterweight', record: '30-16-0', wins: 30, losses: 16, draws: 0, isHallOfFamer: true },

  { name: 'Georges St-Pierre', weightClass: 'Welterweight', record: '26-2-0', wins: 26, losses: 2, draws: 0, isHallOfFamer: true },

  { name: 'Matt Hughes', weightClass: 'Welterweight', record: '45-9-0', wins: 45, losses: 9, draws: 0, isHallOfFamer: true },


  { name: 'Islam Makhachev', weightClass: 'Lightweight', record: '29-1-0', wins: 29, losses: 1, draws: 0, isHallOfFamer: false },

  { name: 'Arman Tsarukyan', weightClass: 'Lightweight', record: '23-3-0', wins: 23, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Charles Oliveira', weightClass: 'Lightweight', record: '37-11-0', wins: 37, losses: 11, draws: 0, isHallOfFamer: false },

  { name: 'Justin Gaethje', weightClass: 'Lightweight', record: '28-5-0', wins: 28, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Dustin Poirier', weightClass: 'Lightweight', record: '30-10-0', wins: 30, losses: 10, draws: 0, isHallOfFamer: false },

  { name: 'Conor McGregor', weightClass: 'Lightweight', record: '22-7-0', wins: 22, losses: 7, draws: 0, isHallOfFamer: false },

  { name: 'Khabib Nurmagomedov', weightClass: 'Lightweight', record: '29-0-0', wins: 29, losses: 0, draws: 0, isHallOfFamer: true },

  { name: 'Tony Ferguson', weightClass: 'Lightweight', record: '26-11-0', wins: 26, losses: 11, draws: 0, isHallOfFamer: false },

  { name: 'BJ Penn', weightClass: 'Lightweight', record: '16-14-2', wins: 16, losses: 14, draws: 2, isHallOfFamer: true },


  { name: 'Ilia Topuria', weightClass: 'Featherweight', record: '17-1-0', wins: 17, losses: 1, draws: 0, isHallOfFamer: false },

  { name: 'Alexander Volkanovski', weightClass: 'Featherweight', record: '28-4-0', wins: 28, losses: 4, draws: 0, isHallOfFamer: false },

  { name: 'Max Holloway', weightClass: 'Featherweight', record: '28-9-0', wins: 28, losses: 9, draws: 0, isHallOfFamer: false },

  { name: 'Diego Lopes', weightClass: 'Featherweight', record: '28-8-0', wins: 28, losses: 8, draws: 0, isHallOfFamer: false },

  { name: 'Movsar Evloev', weightClass: 'Featherweight', record: '20-0-0', wins: 20, losses: 0, draws: 0, isHallOfFamer: false },

  { name: 'Brian Ortega', weightClass: 'Featherweight', record: '16-5-0', wins: 16, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Jose Aldo', weightClass: 'Featherweight', record: '32-10-0', wins: 32, losses: 10, draws: 0, isHallOfFamer: true },

  { name: 'Frankie Edgar', weightClass: 'Featherweight', record: '23-11-1', wins: 23, losses: 11, draws: 1, isHallOfFamer: true },


  { name: 'Merab Dvalishvili', weightClass: 'Bantamweight', record: '21-5-0', wins: 21, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Sean O\'Malley', weightClass: 'Bantamweight', record: '20-3-0', wins: 20, losses: 3, draws: 0, isHallOfFamer: false },

  { name: 'Aljamain Sterling', weightClass: 'Bantamweight', record: '26-5-0', wins: 26, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Petr Yan', weightClass: 'Bantamweight', record: '20-5-0', wins: 20, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Cory Sandhagen', weightClass: 'Bantamweight', record: '18-7-0', wins: 18, losses: 7, draws: 0, isHallOfFamer: false },

  { name: 'TJ Dillashaw', weightClass: 'Bantamweight', record: '18-5-0', wins: 18, losses: 5, draws: 0, isHallOfFamer: false },

  { name: 'Dominick Cruz', weightClass: 'Bantamweight', record: '24-4-0', wins: 24, losses: 4, draws: 0, isHallOfFamer: true },

  { name: 'Urijah Faber', weightClass: 'Bantamweight', record: '35-11-0', wins: 35, losses: 11, draws: 0, isHallOfFamer: true },


  { name: 'Alexandre Pantoja', weightClass: 'Flyweight', record: '30-6-0', wins: 30, losses: 6, draws: 0, isHallOfFamer: false },

  { name: 'Brandon Moreno', weightClass: 'Flyweight', record: '24-10-2', wins: 24, losses: 10, draws: 2, isHallOfFamer: false },

  { name: 'Deiveson Figueiredo', weightClass: 'Flyweight', record: '25-7-1', wins: 25, losses: 7, draws: 1, isHallOfFamer: false },

  { name: 'Kai Kara-France', weightClass: 'Flyweight', record: '25-12-0', wins: 25, losses: 12, draws: 0, isHallOfFamer: false },

  { name: 'Demetrious Johnson', weightClass: 'Flyweight', record: '25-4-1', wins: 25, losses: 4, draws: 1, isHallOfFamer: true },

  { name: 'Henry Cejudo', weightClass: 'Flyweight', record: '16-6-0', wins: 16, losses: 6, draws: 0, isHallOfFamer: false },

];

/* Round 660: every link here is a real fight with the right winner, event and
   year, checked on 2026-09-19 against ufc.com and an independent record
   (Sherdog, ESPN and others; URLs in scripts/data/sportsFactsVerified2026-09.json).
   scripts/simSportsFacts.mjs fails on any link the record does not hold. Four
   links were removed: Aspinall over Jones at UFC 313 (they never fought),
   Aspinall over Gane (UFC 321 was a no contest), Figueiredo over Moreno at
   UFC 256 (a majority draw) and a Silva over Bisping row (Bisping won, and
   that result is listed). Five reversed or misdated links now say what
   happened, and the rest had their method, round, time or title corrected.
   A draw or a no contest is not a win and never goes in this list. */
/* Round 660: every link here is a real fight with the right winner, event and
   year, checked on 2026-09-19 against ufc.com and an independent record
   (Sherdog, ESPN and others; URLs in scripts/data/sportsFactsVerified2026-09.json).
   scripts/simSportsFacts.mjs fails on any link the record does not hold. Four
   links were removed: Aspinall over Jones at UFC 313 (they never fought),
   Aspinall over Gane (UFC 321 was a no contest), Figueiredo over Moreno at
   UFC 256 (a majority draw) and a Silva over Bisping row (Bisping won, and
   that result is listed). Five reversed or misdated links now say what
   happened, and the rest had their method, round, time or title corrected.
   A draw or a no contest is not a win and never goes in this list. */
/* Round 660: every link here is a real fight with the right winner, event and
   year, checked on 2026-09-19 against ufc.com and an independent record
   (Sherdog, ESPN and others; URLs in scripts/data/sportsFactsVerified2026-09.json).
   scripts/simSportsFacts.mjs fails on any link the record does not hold. Seven
   links were removed: Aspinall over Jones at UFC 313 (they never fought),
   Aspinall over Gane (UFC 321 was a no contest), Figueiredo over Moreno at
   UFC 256 (a majority draw), a Silva over Bisping row (Bisping won, and that
   result is listed), and three whose fighter left the chain. Five reversed or
   misdated links now say what happened, and the rest had their method, round,
   time or title corrected.
   A draw or a no contest is not a win and never goes in this list. */
export const FIGHT_RESULTS: FightResult[] = [
  { winner: 'Jon Jones', loser: 'Stipe Miocic', event: 'UFC 309', year: 2024, method: 'KO/TKO', round: 3, time: '4:29', wasChampionshipFight: true },
  { winner: 'Stipe Miocic', loser: 'Francis Ngannou', event: 'UFC 220', year: 2018, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Stipe Miocic', loser: 'Daniel Cormier', event: 'UFC 241', year: 2019, method: 'KO/TKO', round: 4, time: '4:09', wasChampionshipFight: true },
  { winner: 'Francis Ngannou', loser: 'Stipe Miocic', event: 'UFC 260', year: 2021, method: 'KO/TKO', round: 2, time: '0:52', wasChampionshipFight: true },
  { winner: 'Francis Ngannou', loser: 'Cain Velasquez', event: 'UFC on ESPN 1', year: 2019, method: 'KO/TKO', round: 1, time: '0:26', wasChampionshipFight: false },
  { winner: 'Francis Ngannou', loser: 'Ciryl Gane', event: 'UFC 270', year: 2022, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Daniel Cormier', loser: 'Stipe Miocic', event: 'UFC 226', year: 2018, method: 'KO/TKO', round: 1, time: '4:33', wasChampionshipFight: true },
  { winner: 'Alex Pereira', loser: 'Jamahal Hill', event: 'UFC 300', year: 2024, method: 'KO/TKO', round: 1, time: '3:14', wasChampionshipFight: true },
  { winner: 'Alex Pereira', loser: 'Jiří Procházka', event: 'UFC 303', year: 2024, method: 'KO/TKO', round: 2, time: '0:13', wasChampionshipFight: true },
  { winner: 'Alex Pereira', loser: 'Jan Blachowicz', event: 'UFC 291', year: 2023, method: 'Decision (split)', round: 3, time: '5:00', wasChampionshipFight: false },
  { winner: 'Glover Teixeira', loser: 'Jan Blachowicz', event: 'UFC 267', year: 2021, method: 'Submission', round: 2, time: '3:02', wasChampionshipFight: true },
  { winner: 'Jan Blachowicz', loser: 'Israel Adesanya', event: 'UFC 259', year: 2021, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Jiří Procházka', loser: 'Glover Teixeira', event: 'UFC 275', year: 2022, method: 'Submission', round: 5, time: '4:32', wasChampionshipFight: true },
  { winner: 'Chuck Liddell', loser: 'Randy Couture', event: 'UFC 52', year: 2005, method: 'KO/TKO', round: 1, time: '2:06', wasChampionshipFight: true },
  { winner: 'Randy Couture', loser: 'Chuck Liddell', event: 'UFC 43', year: 2003, method: 'KO/TKO', round: 3, time: '2:39', wasChampionshipFight: true },
  { winner: 'Dricus du Plessis', loser: 'Israel Adesanya', event: 'UFC 305', year: 2024, method: 'Submission', round: 4, time: '3:38', wasChampionshipFight: true },
  { winner: 'Dricus du Plessis', loser: 'Sean Strickland', event: 'UFC 297', year: 2024, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Sean Strickland', loser: 'Israel Adesanya', event: 'UFC 293', year: 2023, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Israel Adesanya', loser: 'Robert Whittaker', event: 'UFC 243', year: 2019, method: 'KO/TKO', round: 2, time: '3:33', wasChampionshipFight: true },
  { winner: 'Israel Adesanya', loser: 'Paulo Costa', event: 'UFC 253', year: 2020, method: 'KO/TKO', round: 2, time: '3:59', wasChampionshipFight: true },
  { winner: 'Michael Bisping', loser: 'Anderson Silva', event: 'UFC Fight Night 84', year: 2016, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: false },
  { winner: 'Leon Edwards', loser: 'Kamaru Usman', event: 'UFC 278', year: 2022, method: 'KO/TKO', round: 5, time: '4:04', wasChampionshipFight: true },
  { winner: 'Leon Edwards', loser: 'Colby Covington', event: 'UFC 296', year: 2023, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Belal Muhammad', loser: 'Leon Edwards', event: 'UFC 304', year: 2024, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Colby Covington', event: 'UFC 268', year: 2021, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Jorge Masvidal', event: 'UFC 261', year: 2021, method: 'KO/TKO', round: 2, time: '1:02', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Tyron Woodley', event: 'UFC 235', year: 2019, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Tyron Woodley', loser: 'Robbie Lawler', event: 'UFC 201', year: 2016, method: 'KO/TKO', round: 1, time: '2:12', wasChampionshipFight: true },
  { winner: 'Georges St-Pierre', loser: 'Matt Hughes', event: 'UFC 79', year: 2007, method: 'Submission', round: 2, time: '4:54', wasChampionshipFight: true },
  { winner: 'Matt Hughes', loser: 'Georges St-Pierre', event: 'UFC 50', year: 2004, method: 'Submission', round: 1, time: '4:59', wasChampionshipFight: true },
  { winner: 'Islam Makhachev', loser: 'Charles Oliveira', event: 'UFC 280', year: 2022, method: 'Submission', round: 2, time: '3:16', wasChampionshipFight: true },
  { winner: 'Islam Makhachev', loser: 'Dustin Poirier', event: 'UFC 302', year: 2024, method: 'Submission', round: 5, time: '2:42', wasChampionshipFight: true },
  { winner: 'Islam Makhachev', loser: 'Arman Tsarukyan', event: 'UFC Fight Night: Overeem vs. Oleinik', year: 2019, method: 'Decision (unanimous)', round: 3, time: '5:00', wasChampionshipFight: false },
  { winner: 'Charles Oliveira', loser: 'Justin Gaethje', event: 'UFC 274', year: 2022, method: 'Submission', round: 1, time: '3:22', wasChampionshipFight: true },
  { winner: 'Charles Oliveira', loser: 'Dustin Poirier', event: 'UFC 269', year: 2021, method: 'Submission', round: 3, time: '1:02', wasChampionshipFight: true },
  { winner: 'Dustin Poirier', loser: 'Conor McGregor', event: 'UFC 257', year: 2021, method: 'KO/TKO', round: 2, time: '2:32', wasChampionshipFight: false },
  { winner: 'Khabib Nurmagomedov', loser: 'Conor McGregor', event: 'UFC 229', year: 2018, method: 'Submission', round: 4, time: '3:03', wasChampionshipFight: true },
  { winner: 'Khabib Nurmagomedov', loser: 'Dustin Poirier', event: 'UFC 242', year: 2019, method: 'Submission', round: 3, time: '2:06', wasChampionshipFight: true },
  { winner: 'Justin Gaethje', loser: 'Tony Ferguson', event: 'UFC 249', year: 2020, method: 'KO/TKO', round: 5, time: '3:39', wasChampionshipFight: true },
  { winner: 'Frankie Edgar', loser: 'BJ Penn', event: 'UFC 112', year: 2010, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Ilia Topuria', loser: 'Alexander Volkanovski', event: 'UFC 298', year: 2024, method: 'KO/TKO', round: 2, time: '3:32', wasChampionshipFight: true },
  { winner: 'Ilia Topuria', loser: 'Max Holloway', event: 'UFC 308', year: 2024, method: 'KO/TKO', round: 3, time: '1:34', wasChampionshipFight: true },
  { winner: 'Alexander Volkanovski', loser: 'Max Holloway', event: 'UFC 245', year: 2019, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Alexander Volkanovski', loser: 'Brian Ortega', event: 'UFC 266', year: 2021, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Max Holloway', loser: 'Jose Aldo', event: 'UFC 212', year: 2017, method: 'KO/TKO', round: 3, wasChampionshipFight: true },
  { winner: 'Jose Aldo', loser: 'Frankie Edgar', event: 'UFC 156', year: 2013, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Jose Aldo', loser: 'Frankie Edgar', event: 'UFC 200', year: 2016, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Merab Dvalishvili', loser: 'Sean O\'Malley', event: 'UFC 306', year: 2024, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Sean O\'Malley', loser: 'Aljamain Sterling', event: 'UFC 292', year: 2023, method: 'KO/TKO', round: 2, time: '0:51', wasChampionshipFight: true },
  { winner: 'Aljamain Sterling', loser: 'Petr Yan', event: 'UFC 273', year: 2022, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Petr Yan', loser: 'Cory Sandhagen', event: 'UFC 267', year: 2021, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'TJ Dillashaw', loser: 'Cory Sandhagen', event: 'UFC on ESPN 27', year: 2021, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: false },
  { winner: 'Dominick Cruz', loser: 'TJ Dillashaw', event: 'UFC Fight Night 81', year: 2016, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Dominick Cruz', loser: 'Urijah Faber', event: 'UFC 199', year: 2016, method: 'Decision (unanimous)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Urijah Faber', loser: 'Dominick Cruz', event: 'WEC 26', year: 2007, method: 'Submission', round: 1, time: '1:38', wasChampionshipFight: true },
  { winner: 'Alexandre Pantoja', loser: 'Brandon Moreno', event: 'UFC 290', year: 2023, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Brandon Moreno', loser: 'Deiveson Figueiredo', event: 'UFC 283', year: 2023, method: 'KO/TKO', round: 3, time: '5:00', wasChampionshipFight: true },
  { winner: 'Henry Cejudo', loser: 'Demetrious Johnson', event: 'UFC 227', year: 2018, method: 'Decision (split)', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Demetrious Johnson', loser: 'Henry Cejudo', event: 'UFC 197', year: 2016, method: 'KO/TKO', round: 1, wasChampionshipFight: true },
];

export function getFightersWhoBeat(fighterName: string, weightClass?: WeightClass): UfcFighter[] {
  const victories = FIGHT_RESULTS.filter(result => result.loser === fighterName);
  let fighters = victories.map(victory => 
    UFC_FIGHTERS.find(fighter => fighter.name === victory.winner)!
  ).filter(Boolean);
  
  if (weightClass) {
    fighters = fighters.filter(f => f.weightClass === weightClass);
  }
  
  return fighters;
}

export function getFightResult(winner: string, loser: string): FightResult | undefined {
  return FIGHT_RESULTS.find(r => r.winner === winner && r.loser === loser);
}

/* Round 660: a fighter can only start a chain if somebody IN THIS BOOK beat
   them, in the mode being played. A losing record is not enough: Jon Jones has
   a loss, but no fighter here beat him, so starting on him left every guess
   wrong and the give up screen with nothing to reveal. Round 660 removed the
   invented Aspinall win over him and three other links, which would have made
   twelve starts like that. */
function startable(fighter: UfcFighter, options?: { weightClass?: WeightClass; hallOfFameOnly?: boolean }): boolean {
  return getFightersWhoBeat(fighter.name, options?.weightClass)
    .some(w => !options?.hallOfFameOnly || w.isHallOfFamer);
}

function eligibleStarters(options?: { weightClass?: WeightClass; hallOfFameOnly?: boolean }): UfcFighter[] {
  let fighters = UFC_FIGHTERS.filter(fighter => fighter.losses > 0);
  if (options?.weightClass) fighters = fighters.filter(f => f.weightClass === options.weightClass);
  if (options?.hallOfFameOnly) fighters = fighters.filter(f => f.isHallOfFamer);
  const withAnAnswer = fighters.filter(f => startable(f, options));
  return withAnAnswer.length ? withAnAnswer : fighters;
}

export function getRandomStartingFighter(options?: {
  weightClass?: WeightClass;
  hallOfFameOnly?: boolean;
}): UfcFighter {
  const eligibleFighters = eligibleStarters(options);
  return eligibleFighters[Math.floor(Math.random() * eligibleFighters.length)];
}

export function getDailyStartingFighter(options?: {
  weightClass?: WeightClass;
  hallOfFameOnly?: boolean;
}): UfcFighter {
  const eligibleFighters = eligibleStarters(options);

  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % eligibleFighters.length;
  return eligibleFighters[index];
}

export function getHallOfFamers(): UfcFighter[] {
  return UFC_FIGHTERS.filter(f => f.isHallOfFamer);
}

export function getFightersByWeightClass(weightClass: WeightClass): UfcFighter[] {
  return UFC_FIGHTERS.filter(f => f.weightClass === weightClass);
}
