import { UfcFighter, FightResult, WeightClass } from '@/types/ufcChain';

export const UFC_FIGHTERS: UfcFighter[] = [
  // Heavyweights
  { name: 'Jon Jones', weightClass: 'Heavyweight', record: '27-1-0', wins: 27, losses: 1, draws: 0, isHallOfFamer: false },
  { name: 'Stipe Miocic', weightClass: 'Heavyweight', record: '20-4-0', wins: 20, losses: 4, draws: 0, isHallOfFamer: true },
  { name: 'Francis Ngannou', weightClass: 'Heavyweight', record: '17-3-0', wins: 17, losses: 3, draws: 0, isHallOfFamer: false },
  { name: 'Daniel Cormier', weightClass: 'Heavyweight', record: '22-3-0', wins: 22, losses: 3, draws: 0, isHallOfFamer: true },
  { name: 'Cain Velasquez', weightClass: 'Heavyweight', record: '14-3-0', wins: 14, losses: 3, draws: 0, isHallOfFamer: true },
  { name: 'Junior dos Santos', weightClass: 'Heavyweight', record: '21-9-0', wins: 21, losses: 9, draws: 0, isHallOfFamer: false },

  // Light Heavyweights
  { name: 'Alex Pereira', weightClass: 'Light Heavyweight', record: '11-2-0', wins: 11, losses: 2, draws: 0, isHallOfFamer: false },
  { name: 'Jamahal Hill', weightClass: 'Light Heavyweight', record: '12-1-0', wins: 12, losses: 1, draws: 0, isHallOfFamer: false },
  { name: 'Glover Teixeira', weightClass: 'Light Heavyweight', record: '33-9-0', wins: 33, losses: 9, draws: 0, isHallOfFamer: false },
  { name: 'Jan Blachowicz', weightClass: 'Light Heavyweight', record: '29-9-0', wins: 29, losses: 9, draws: 0, isHallOfFamer: false },
  { name: 'Chuck Liddell', weightClass: 'Light Heavyweight', record: '21-9-0', wins: 21, losses: 9, draws: 0, isHallOfFamer: true },
  { name: 'Randy Couture', weightClass: 'Light Heavyweight', record: '19-11-0', wins: 19, losses: 11, draws: 0, isHallOfFamer: true },

  // Middleweights  
  { name: 'Israel Adesanya', weightClass: 'Middleweight', record: '24-3-0', wins: 24, losses: 3, draws: 0, isHallOfFamer: false },
  { name: 'Sean Strickland', weightClass: 'Middleweight', record: '28-6-0', wins: 28, losses: 6, draws: 0, isHallOfFamer: false },
  { name: 'Robert Whittaker', weightClass: 'Middleweight', record: '25-7-0', wins: 25, losses: 7, draws: 0, isHallOfFamer: false },
  { name: 'Paulo Costa', weightClass: 'Middleweight', record: '14-2-0', wins: 14, losses: 2, draws: 0, isHallOfFamer: false },
  { name: 'Yoel Romero', weightClass: 'Middleweight', record: '13-6-0', wins: 13, losses: 6, draws: 0, isHallOfFamer: false },
  { name: 'Anderson Silva', weightClass: 'Middleweight', record: '34-11-0', wins: 34, losses: 11, draws: 0, isHallOfFamer: true },
  { name: 'Michael Bisping', weightClass: 'Middleweight', record: '30-9-0', wins: 30, losses: 9, draws: 0, isHallOfFamer: true },

  // Welterweights
  { name: 'Leon Edwards', weightClass: 'Welterweight', record: '22-3-0', wins: 22, losses: 3, draws: 0, isHallOfFamer: false },
  { name: 'Kamaru Usman', weightClass: 'Welterweight', record: '20-4-0', wins: 20, losses: 4, draws: 0, isHallOfFamer: false },
  { name: 'Colby Covington', weightClass: 'Welterweight', record: '17-4-0', wins: 17, losses: 4, draws: 0, isHallOfFamer: false },
  { name: 'Jorge Masvidal', weightClass: 'Welterweight', record: '35-17-0', wins: 35, losses: 17, draws: 0, isHallOfFamer: false },
  { name: 'Tyron Woodley', weightClass: 'Welterweight', record: '19-7-1', wins: 19, losses: 7, draws: 1, isHallOfFamer: false },
  { name: 'Robbie Lawler', weightClass: 'Welterweight', record: '29-16-0', wins: 29, losses: 16, draws: 0, isHallOfFamer: true },
  { name: 'Georges St-Pierre', weightClass: 'Welterweight', record: '26-2-0', wins: 26, losses: 2, draws: 0, isHallOfFamer: true },
  { name: 'Matt Hughes', weightClass: 'Welterweight', record: '45-9-0', wins: 45, losses: 9, draws: 0, isHallOfFamer: true },

  // Lightweights
  { name: 'Islam Makhachev', weightClass: 'Lightweight', record: '26-1-0', wins: 26, losses: 1, draws: 0, isHallOfFamer: false },
  { name: 'Charles Oliveira', weightClass: 'Lightweight', record: '34-10-0', wins: 34, losses: 10, draws: 0, isHallOfFamer: false },
  { name: 'Justin Gaethje', weightClass: 'Lightweight', record: '25-5-0', wins: 25, losses: 5, draws: 0, isHallOfFamer: false },
  { name: 'Dustin Poirier', weightClass: 'Lightweight', record: '30-8-0', wins: 30, losses: 8, draws: 0, isHallOfFamer: false },
  { name: 'Conor McGregor', weightClass: 'Lightweight', record: '22-6-0', wins: 22, losses: 6, draws: 0, isHallOfFamer: false },
  { name: 'Khabib Nurmagomedov', weightClass: 'Lightweight', record: '29-0-0', wins: 29, losses: 0, draws: 0, isHallOfFamer: true },
  { name: 'Tony Ferguson', weightClass: 'Lightweight', record: '25-10-0', wins: 25, losses: 10, draws: 0, isHallOfFamer: false },
  { name: 'BJ Penn', weightClass: 'Lightweight', record: '16-14-2', wins: 16, losses: 14, draws: 2, isHallOfFamer: true },

  // Featherweights
  { name: 'Alexander Volkanovski', weightClass: 'Featherweight', record: '26-3-0', wins: 26, losses: 3, draws: 0, isHallOfFamer: false },
  { name: 'Ilia Topuria', weightClass: 'Featherweight', record: '15-0-0', wins: 15, losses: 0, draws: 0, isHallOfFamer: false },
  { name: 'Max Holloway', weightClass: 'Featherweight', record: '25-7-0', wins: 25, losses: 7, draws: 0, isHallOfFamer: false },
  { name: 'Brian Ortega', weightClass: 'Featherweight', record: '16-3-0', wins: 16, losses: 3, draws: 0, isHallOfFamer: false },
  { name: 'Jose Aldo', weightClass: 'Featherweight', record: '31-8-0', wins: 31, losses: 8, draws: 0, isHallOfFamer: true },
  { name: 'Frankie Edgar', weightClass: 'Featherweight', record: '24-11-1', wins: 24, losses: 11, draws: 1, isHallOfFamer: true },

  // Bantamweights
  { name: 'Sean O\'Malley', weightClass: 'Bantamweight', record: '18-1-0', wins: 18, losses: 1, draws: 0, isHallOfFamer: false },
  { name: 'Aljamain Sterling', weightClass: 'Bantamweight', record: '23-4-0', wins: 23, losses: 4, draws: 0, isHallOfFamer: false },
  { name: 'Petr Yan', weightClass: 'Bantamweight', record: '17-4-0', wins: 17, losses: 4, draws: 0, isHallOfFamer: false },
  { name: 'Cory Sandhagen', weightClass: 'Bantamweight', record: '17-4-0', wins: 17, losses: 4, draws: 0, isHallOfFamer: false },
  { name: 'TJ Dillashaw', weightClass: 'Bantamweight', record: '17-5-0', wins: 17, losses: 5, draws: 0, isHallOfFamer: false },
  { name: 'Dominick Cruz', weightClass: 'Bantamweight', record: '24-4-0', wins: 24, losses: 4, draws: 0, isHallOfFamer: true },
  { name: 'Urijah Faber', weightClass: 'Bantamweight', record: '35-11-0', wins: 35, losses: 11, draws: 0, isHallOfFamer: true },

  // Flyweights
  { name: 'Alexandre Pantoja', weightClass: 'Flyweight', record: '27-5-0', wins: 27, losses: 5, draws: 0, isHallOfFamer: false },
  { name: 'Brandon Moreno', weightClass: 'Flyweight', record: '21-6-2', wins: 21, losses: 6, draws: 2, isHallOfFamer: false },
  { name: 'Deiveson Figueiredo', weightClass: 'Flyweight', record: '23-3-1', wins: 23, losses: 3, draws: 1, isHallOfFamer: false },
  { name: 'Kai Kara-France', weightClass: 'Flyweight', record: '24-11-0', wins: 24, losses: 11, draws: 0, isHallOfFamer: false },
  { name: 'Demetrious Johnson', weightClass: 'Flyweight', record: '30-4-1', wins: 30, losses: 4, draws: 1, isHallOfFamer: true },
  { name: 'Henry Cejudo', weightClass: 'Flyweight', record: '16-2-0', wins: 16, losses: 2, draws: 0, isHallOfFamer: true },
];

export const FIGHT_RESULTS: FightResult[] = [
  // Heavyweight championship fights
  { winner: 'Jon Jones', loser: 'Stipe Miocic', event: 'UFC 309', method: 'TKO', round: 3, time: '4:29', wasChampionshipFight: true },
  { winner: 'Stipe Miocic', loser: 'Francis Ngannou', event: 'UFC 220', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Stipe Miocic', loser: 'Daniel Cormier', event: 'UFC 241', method: 'KO', round: 4, time: '4:09', wasChampionshipFight: true },
  { winner: 'Stipe Miocic', loser: 'Junior dos Santos', event: 'UFC 211', method: 'TKO', round: 1, time: '2:22', wasChampionshipFight: true },
  { winner: 'Francis Ngannou', loser: 'Stipe Miocic', event: 'UFC 260', method: 'KO', round: 2, time: '0:52', wasChampionshipFight: true },
  { winner: 'Francis Ngannou', loser: 'Junior dos Santos', event: 'UFC on ESPN 3', method: 'TKO', round: 1, time: '1:11', wasChampionshipFight: false },
  { winner: 'Francis Ngannou', loser: 'Cain Velasquez', event: 'UFC on ESPN 1', method: 'TKO', round: 1, time: '0:26', wasChampionshipFight: false },
  { winner: 'Daniel Cormier', loser: 'Stipe Miocic', event: 'UFC 226', method: 'KO', round: 1, time: '4:33', wasChampionshipFight: true },

  // Light Heavyweight fights
  { winner: 'Alex Pereira', loser: 'Jamahal Hill', event: 'UFC 300', method: 'TKO', round: 1, time: '3:14', wasChampionshipFight: true },
  { winner: 'Alex Pereira', loser: 'Jan Blachowicz', event: 'UFC 291', method: 'TKO', round: 2, time: '1:31', wasChampionshipFight: false },
  { winner: 'Glover Teixeira', loser: 'Jan Blachowicz', event: 'UFC 267', method: 'Submission', round: 2, time: '3:02', wasChampionshipFight: true },
  { winner: 'Jan Blachowicz', loser: 'Israel Adesanya', event: 'UFC 259', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Chuck Liddell', loser: 'Randy Couture', event: 'UFC 52', method: 'KO', round: 1, time: '2:06', wasChampionshipFight: true },
  { winner: 'Randy Couture', loser: 'Chuck Liddell', event: 'UFC 57', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: false },

  // Middleweight fights
  { winner: 'Sean Strickland', loser: 'Israel Adesanya', event: 'UFC 293', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Israel Adesanya', loser: 'Robert Whittaker', event: 'UFC 243', method: 'KO', round: 2, time: '3:33', wasChampionshipFight: true },
  { winner: 'Israel Adesanya', loser: 'Paulo Costa', event: 'UFC 253', method: 'TKO', round: 2, time: '3:59', wasChampionshipFight: true },
  { winner: 'Robert Whittaker', loser: 'Yoel Romero', event: 'UFC 213', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Anderson Silva', loser: 'Michael Bisping', event: 'UFC Fight Night 84', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: false },
  { winner: 'Michael Bisping', loser: 'Anderson Silva', event: 'UFC Fight Night 84', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: false },

  // Welterweight fights
  { winner: 'Leon Edwards', loser: 'Kamaru Usman', event: 'UFC 278', method: 'KO', round: 5, time: '4:04', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Colby Covington', event: 'UFC 268', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Jorge Masvidal', event: 'UFC 261', method: 'KO', round: 2, time: '1:02', wasChampionshipFight: true },
  { winner: 'Kamaru Usman', loser: 'Tyron Woodley', event: 'UFC 235', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Tyron Woodley', loser: 'Robbie Lawler', event: 'UFC 201', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Georges St-Pierre', loser: 'Matt Hughes', event: 'UFC 79', method: 'Submission', round: 2, time: '4:54', wasChampionshipFight: true },
  { winner: 'Matt Hughes', loser: 'Georges St-Pierre', event: 'UFC 50', method: 'Submission', round: 1, time: '4:59', wasChampionshipFight: true },

  // Lightweight fights
  { winner: 'Islam Makhachev', loser: 'Charles Oliveira', event: 'UFC 280', method: 'Submission', round: 2, time: '3:16', wasChampionshipFight: true },
  { winner: 'Charles Oliveira', loser: 'Justin Gaethje', event: 'UFC 274', method: 'Submission', round: 1, time: '3:18', wasChampionshipFight: true },
  { winner: 'Charles Oliveira', loser: 'Dustin Poirier', event: 'UFC 269', method: 'Submission', round: 3, time: '2:32', wasChampionshipFight: true },
  { winner: 'Dustin Poirier', loser: 'Conor McGregor', event: 'UFC 257', method: 'TKO', round: 2, time: '2:32', wasChampionshipFight: false },
  { winner: 'Khabib Nurmagomedov', loser: 'Conor McGregor', event: 'UFC 229', method: 'Submission', round: 4, time: '3:03', wasChampionshipFight: true },
  { winner: 'Khabib Nurmagomedov', loser: 'Dustin Poirier', event: 'UFC 242', method: 'Submission', round: 3, time: '2:06', wasChampionshipFight: true },
  { winner: 'Justin Gaethje', loser: 'Tony Ferguson', event: 'UFC 249', method: 'TKO', round: 5, time: '3:39', wasChampionshipFight: false },
  { winner: 'Frankie Edgar', loser: 'BJ Penn', event: 'UFC 112', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },

  // Featherweight fights
  { winner: 'Ilia Topuria', loser: 'Alexander Volkanovski', event: 'UFC 298', method: 'KO', round: 2, time: '3:32', wasChampionshipFight: true },
  { winner: 'Alexander Volkanovski', loser: 'Max Holloway', event: 'UFC 245', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Alexander Volkanovski', loser: 'Brian Ortega', event: 'UFC 266', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Max Holloway', loser: 'Jose Aldo', event: 'UFC 212', method: 'TKO', round: 3, time: '4:13', wasChampionshipFight: true },
  { winner: 'Jose Aldo', loser: 'Frankie Edgar', event: 'UFC 156', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Frankie Edgar', loser: 'Jose Aldo', event: 'UFC 200', method: 'TKO', round: 1, time: '0:56', wasChampionshipFight: false },

  // Bantamweight fights
  { winner: 'Sean O\'Malley', loser: 'Aljamain Sterling', event: 'UFC 292', method: 'TKO', round: 2, time: '0:51', wasChampionshipFight: true },
  { winner: 'Aljamain Sterling', loser: 'Petr Yan', event: 'UFC 273', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Petr Yan', loser: 'Cory Sandhagen', event: 'UFC 267', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: false },
  { winner: 'Cory Sandhagen', loser: 'TJ Dillashaw', event: 'UFC on ESPN 27', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: false },
  { winner: 'TJ Dillashaw', loser: 'Dominick Cruz', event: 'UFC Fight Night 81', method: 'KO', round: 2, time: '4:05', wasChampionshipFight: true },
  { winner: 'Dominick Cruz', loser: 'Urijah Faber', event: 'UFC 199', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Urijah Faber', loser: 'Dominick Cruz', event: 'WEC 26', method: 'Submission', round: 1, time: '2:28', wasChampionshipFight: true },

  // Flyweight fights
  { winner: 'Alexandre Pantoja', loser: 'Brandon Moreno', event: 'UFC 290', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Brandon Moreno', loser: 'Deiveson Figueiredo', event: 'UFC 283', method: 'TKO', round: 3, time: '4:19', wasChampionshipFight: true },
  { winner: 'Deiveson Figueiredo', loser: 'Brandon Moreno', event: 'UFC 256', method: 'Draw', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Henry Cejudo', loser: 'Demetrious Johnson', event: 'UFC 227', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
  { winner: 'Demetrious Johnson', loser: 'Henry Cejudo', event: 'UFC 197', method: 'Decision', round: 5, time: '5:00', wasChampionshipFight: true },
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

export function getRandomStartingFighter(options?: { 
  weightClass?: WeightClass; 
  hallOfFameOnly?: boolean;
}): UfcFighter {
  let eligibleFighters = UFC_FIGHTERS.filter(fighter => fighter.losses > 0);
  
  if (options?.weightClass) {
    eligibleFighters = eligibleFighters.filter(f => f.weightClass === options.weightClass);
  }
  
  if (options?.hallOfFameOnly) {
    eligibleFighters = eligibleFighters.filter(f => f.isHallOfFamer);
  }
  
  return eligibleFighters[Math.floor(Math.random() * eligibleFighters.length)];
}

export function getDailyStartingFighter(options?: { 
  weightClass?: WeightClass; 
  hallOfFameOnly?: boolean;
}): UfcFighter {
  let eligibleFighters = UFC_FIGHTERS.filter(fighter => fighter.losses > 0);
  
  if (options?.weightClass) {
    eligibleFighters = eligibleFighters.filter(f => f.weightClass === options.weightClass);
  }
  
  if (options?.hallOfFameOnly) {
    eligibleFighters = eligibleFighters.filter(f => f.isHallOfFamer);
  }
  
  // Use date as seed for consistent daily fighter
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