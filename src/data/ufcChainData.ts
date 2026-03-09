import { UfcFighter, FightResult } from '@/types/ufcChain';

export const UFC_FIGHTERS: UfcFighter[] = [
  // Heavyweights
  { name: 'Jon Jones', weightClass: 'Heavyweight', record: '27-1-0', wins: 27, losses: 1, draws: 0 },
  { name: 'Stipe Miocic', weightClass: 'Heavyweight', record: '20-4-0', wins: 20, losses: 4, draws: 0 },
  { name: 'Francis Ngannou', weightClass: 'Heavyweight', record: '17-3-0', wins: 17, losses: 3, draws: 0 },
  { name: 'Daniel Cormier', weightClass: 'Heavyweight', record: '22-3-0', wins: 22, losses: 3, draws: 0 },
  { name: 'Cain Velasquez', weightClass: 'Heavyweight', record: '14-3-0', wins: 14, losses: 3, draws: 0 },
  { name: 'Junior dos Santos', weightClass: 'Heavyweight', record: '21-9-0', wins: 21, losses: 9, draws: 0 },

  // Light Heavyweights
  { name: 'Alex Pereira', weightClass: 'Light Heavyweight', record: '11-2-0', wins: 11, losses: 2, draws: 0 },
  { name: 'Jamahal Hill', weightClass: 'Light Heavyweight', record: '12-1-0', wins: 12, losses: 1, draws: 0 },
  { name: 'Glover Teixeira', weightClass: 'Light Heavyweight', record: '33-9-0', wins: 33, losses: 9, draws: 0 },
  { name: 'Jan Blachowicz', weightClass: 'Light Heavyweight', record: '29-9-0', wins: 29, losses: 9, draws: 0 },
  { name: 'Chuck Liddell', weightClass: 'Light Heavyweight', record: '21-9-0', wins: 21, losses: 9, draws: 0 },

  // Middleweights  
  { name: 'Israel Adesanya', weightClass: 'Middleweight', record: '24-3-0', wins: 24, losses: 3, draws: 0 },
  { name: 'Sean Strickland', weightClass: 'Middleweight', record: '28-6-0', wins: 28, losses: 6, draws: 0 },
  { name: 'Robert Whittaker', weightClass: 'Middleweight', record: '25-7-0', wins: 25, losses: 7, draws: 0 },
  { name: 'Paulo Costa', weightClass: 'Middleweight', record: '14-2-0', wins: 14, losses: 2, draws: 0 },
  { name: 'Yoel Romero', weightClass: 'Middleweight', record: '13-6-0', wins: 13, losses: 6, draws: 0 },

  // Welterweights
  { name: 'Leon Edwards', weightClass: 'Welterweight', record: '22-3-0', wins: 22, losses: 3, draws: 0 },
  { name: 'Kamaru Usman', weightClass: 'Welterweight', record: '20-4-0', wins: 20, losses: 4, draws: 0 },
  { name: 'Colby Covington', weightClass: 'Welterweight', record: '17-4-0', wins: 17, losses: 4, draws: 0 },
  { name: 'Jorge Masvidal', weightClass: 'Welterweight', record: '35-17-0', wins: 35, losses: 17, draws: 0 },
  { name: 'Tyron Woodley', weightClass: 'Welterweight', record: '19-7-1', wins: 19, losses: 7, draws: 1 },
  { name: 'Robbie Lawler', weightClass: 'Welterweight', record: '29-16-0', wins: 29, losses: 16, draws: 0 },

  // Lightweights
  { name: 'Islam Makhachev', weightClass: 'Lightweight', record: '26-1-0', wins: 26, losses: 1, draws: 0 },
  { name: 'Charles Oliveira', weightClass: 'Lightweight', record: '34-10-0', wins: 34, losses: 10, draws: 0 },
  { name: 'Justin Gaethje', weightClass: 'Lightweight', record: '25-5-0', wins: 25, losses: 5, draws: 0 },
  { name: 'Dustin Poirier', weightClass: 'Lightweight', record: '30-8-0', wins: 30, losses: 8, draws: 0 },
  { name: 'Conor McGregor', weightClass: 'Lightweight', record: '22-6-0', wins: 22, losses: 6, draws: 0 },
  { name: 'Khabib Nurmagomedov', weightClass: 'Lightweight', record: '29-0-0', wins: 29, losses: 0, draws: 0 },
  { name: 'Tony Ferguson', weightClass: 'Lightweight', record: '25-10-0', wins: 25, losses: 10, draws: 0 },

  // Featherweights
  { name: 'Alexander Volkanovski', weightClass: 'Featherweight', record: '26-3-0', wins: 26, losses: 3, draws: 0 },
  { name: 'Ilia Topuria', weightClass: 'Featherweight', record: '15-0-0', wins: 15, losses: 0, draws: 0 },
  { name: 'Max Holloway', weightClass: 'Featherweight', record: '25-7-0', wins: 25, losses: 7, draws: 0 },
  { name: 'Brian Ortega', weightClass: 'Featherweight', record: '16-3-0', wins: 16, losses: 3, draws: 0 },
  { name: 'Jose Aldo', weightClass: 'Featherweight', record: '31-8-0', wins: 31, losses: 8, draws: 0 },

  // Bantamweights
  { name: 'Sean O\'Malley', weightClass: 'Bantamweight', record: '18-1-0', wins: 18, losses: 1, draws: 0 },
  { name: 'Aljamain Sterling', weightClass: 'Bantamweight', record: '23-4-0', wins: 23, losses: 4, draws: 0 },
  { name: 'Petr Yan', weightClass: 'Bantamweight', record: '17-4-0', wins: 17, losses: 4, draws: 0 },
  { name: 'Cory Sandhagen', weightClass: 'Bantamweight', record: '17-4-0', wins: 17, losses: 4, draws: 0 },
  { name: 'TJ Dillashaw', weightClass: 'Bantamweight', record: '17-5-0', wins: 17, losses: 5, draws: 0 },

  // Flyweights
  { name: 'Alexandre Pantoja', weightClass: 'Flyweight', record: '27-5-0', wins: 27, losses: 5, draws: 0 },
  { name: 'Brandon Moreno', weightClass: 'Flyweight', record: '21-6-2', wins: 21, losses: 6, draws: 2 },
  { name: 'Deiveson Figueiredo', weightClass: 'Flyweight', record: '23-3-1', wins: 23, losses: 3, draws: 1 },
  { name: 'Kai Kara-France', weightClass: 'Flyweight', record: '24-11-0', wins: 24, losses: 11, draws: 0 },
];

export const FIGHT_RESULTS: FightResult[] = [
  // Jon Jones defeats
  { winner: 'Jon Jones', loser: 'Stipe Miocic', event: 'UFC 309', method: 'TKO', round: 3, time: '4:29' },
  
  // Stipe Miocic defeats
  { winner: 'Stipe Miocic', loser: 'Francis Ngannou', event: 'UFC 220', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Stipe Miocic', loser: 'Daniel Cormier', event: 'UFC 241', method: 'KO', round: 4, time: '4:09' },
  { winner: 'Stipe Miocic', loser: 'Junior dos Santos', event: 'UFC 211', method: 'TKO', round: 1, time: '2:22' },
  
  // Francis Ngannou defeats
  { winner: 'Francis Ngannou', loser: 'Stipe Miocic', event: 'UFC 260', method: 'KO', round: 2, time: '0:52' },
  { winner: 'Francis Ngannou', loser: 'Junior dos Santos', event: 'UFC on ESPN 3', method: 'TKO', round: 1, time: '1:11' },
  { winner: 'Francis Ngannou', loser: 'Cain Velasquez', event: 'UFC on ESPN 1', method: 'TKO', round: 1, time: '0:26' },
  
  // Daniel Cormier defeats  
  { winner: 'Daniel Cormier', loser: 'Stipe Miocic', event: 'UFC 226', method: 'KO', round: 1, time: '4:33' },
  
  // Light Heavyweight fights
  { winner: 'Alex Pereira', loser: 'Jamahal Hill', event: 'UFC 300', method: 'TKO', round: 1, time: '3:14' },
  { winner: 'Alex Pereira', loser: 'Jan Blachowicz', event: 'UFC 291', method: 'TKO', round: 2, time: '1:31' },
  { winner: 'Glover Teixeira', loser: 'Jan Blachowicz', event: 'UFC 267', method: 'Submission', round: 2, time: '3:02' },
  { winner: 'Jan Blachowicz', loser: 'Israel Adesanya', event: 'UFC 259', method: 'Decision', round: 5, time: '5:00' },
  
  // Middleweight fights
  { winner: 'Sean Strickland', loser: 'Israel Adesanya', event: 'UFC 293', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Israel Adesanya', loser: 'Robert Whittaker', event: 'UFC 243', method: 'KO', round: 2, time: '3:33' },
  { winner: 'Israel Adesanya', loser: 'Paulo Costa', event: 'UFC 253', method: 'TKO', round: 2, time: '3:59' },
  { winner: 'Robert Whittaker', loser: 'Yoel Romero', event: 'UFC 213', method: 'Decision', round: 5, time: '5:00' },
  
  // Welterweight fights
  { winner: 'Leon Edwards', loser: 'Kamaru Usman', event: 'UFC 278', method: 'KO', round: 5, time: '4:04' },
  { winner: 'Kamaru Usman', loser: 'Colby Covington', event: 'UFC 268', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Kamaru Usman', loser: 'Jorge Masvidal', event: 'UFC 261', method: 'KO', round: 2, time: '1:02' },
  { winner: 'Kamaru Usman', loser: 'Tyron Woodley', event: 'UFC 235', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Tyron Woodley', loser: 'Robbie Lawler', event: 'UFC 201', method: 'Decision', round: 5, time: '5:00' },
  
  // Lightweight fights
  { winner: 'Islam Makhachev', loser: 'Charles Oliveira', event: 'UFC 280', method: 'Submission', round: 2, time: '3:16' },
  { winner: 'Charles Oliveira', loser: 'Justin Gaethje', event: 'UFC 274', method: 'Submission', round: 1, time: '3:18' },
  { winner: 'Charles Oliveira', loser: 'Dustin Poirier', event: 'UFC 269', method: 'Submission', round: 3, time: '2:32' },
  { winner: 'Dustin Poirier', loser: 'Conor McGregor', event: 'UFC 257', method: 'TKO', round: 2, time: '2:32' },
  { winner: 'Khabib Nurmagomedov', loser: 'Conor McGregor', event: 'UFC 229', method: 'Submission', round: 4, time: '3:03' },
  { winner: 'Khabib Nurmagomedov', loser: 'Dustin Poirier', event: 'UFC 242', method: 'Submission', round: 3, time: '2:06' },
  { winner: 'Justin Gaethje', loser: 'Tony Ferguson', event: 'UFC 249', method: 'TKO', round: 5, time: '3:39' },
  
  // Featherweight fights
  { winner: 'Ilia Topuria', loser: 'Alexander Volkanovski', event: 'UFC 298', method: 'KO', round: 2, time: '3:32' },
  { winner: 'Alexander Volkanovski', loser: 'Max Holloway', event: 'UFC 245', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Alexander Volkanovski', loser: 'Brian Ortega', event: 'UFC 266', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Max Holloway', loser: 'Jose Aldo', event: 'UFC 212', method: 'TKO', round: 3, time: '4:13' },
  
  // Bantamweight fights
  { winner: 'Sean O\'Malley', loser: 'Aljamain Sterling', event: 'UFC 292', method: 'TKO', round: 2, time: '0:51' },
  { winner: 'Aljamain Sterling', loser: 'Petr Yan', event: 'UFC 273', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Petr Yan', loser: 'Cory Sandhagen', event: 'UFC 267', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Cory Sandhagen', loser: 'TJ Dillashaw', event: 'UFC on ESPN 27', method: 'Decision', round: 5, time: '5:00' },
  
  // Flyweight fights
  { winner: 'Alexandre Pantoja', loser: 'Brandon Moreno', event: 'UFC 290', method: 'Decision', round: 5, time: '5:00' },
  { winner: 'Brandon Moreno', loser: 'Deiveson Figueiredo', event: 'UFC 283', method: 'TKO', round: 3, time: '4:19' },
  { winner: 'Deiveson Figueiredo', loser: 'Brandon Moreno', event: 'UFC 256', method: 'Draw', round: 5, time: '5:00' },
];

export function getFightersWhoBeat(fighterName: string): UfcFighter[] {
  const victories = FIGHT_RESULTS.filter(result => result.loser === fighterName);
  return victories.map(victory => 
    UFC_FIGHTERS.find(fighter => fighter.name === victory.winner)!
  ).filter(Boolean);
}

export function getRandomStartingFighter(): UfcFighter {
  const fightersWithLosses = UFC_FIGHTERS.filter(fighter => fighter.losses > 0);
  return fightersWithLosses[Math.floor(Math.random() * fightersWithLosses.length)];
}