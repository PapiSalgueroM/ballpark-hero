import { F1DriverPuzzle } from '@/types/f1Driver';

export const F1_DRIVERS: F1DriverPuzzle[] = [
  {
    id: 'hamilton',
    driverName: 'Lewis Hamilton',
    commonNames: ['Hamilton', 'Lewis Hamilton', 'Lewis', 'HAM'],
    clues: [
      'Dominant',
      '105 race wins: the all-time record holder',
      '7 World Championships (2008, 2014, 2015, 2017, 2018, 2019, 2020)',
      'Ferrari (2025-present), formerly Mercedes (2013-2024) and McLaren (2007-2012)',
      'British driver, debuted in 2007, moved to Ferrari in 2025 after over a decade at Mercedes',
      'Lost the 2021 title on the last lap of the final race in Abu Dhabi under controversial safety-car circumstances',
    ],
  },
  {
    id: 'verstappen',
    driverName: 'Max Verstappen',
    commonNames: ['Verstappen', 'Max Verstappen', 'Max', 'VER'],
    clues: [
      'Fierce',
      '63 race wins through the 2025 season',
      '4 World Championships (2021, 2022, 2023, 2024)',
      'Red Bull Racing (2016-present), previously Toro Rosso (2015-2016)',
      'Dutch driver, youngest ever to start a Grand Prix at 17, racing since 2015',
      'Won his first title on the last lap of the 2021 Abu Dhabi finale in one of the most controversial finishes ever',
    ],
  },
  {
    id: 'leclerc',
    driverName: 'Charles Leclerc',
    commonNames: ['Leclerc', 'Charles Leclerc', 'Charles', 'LEC'],
    clues: [
      'Passionate',
      '8 race wins through the 2025 season',
      'No championship yet: finished runner-up in 2022 before reliability issues derailed his campaign',
      'Ferrari (2019-present), previously Sauber (2018)',
      'Monégasque driver who debuted in 2018, now partnered with a 7-time champion',
      'Finally won his home race at Monaco in 2024 after years of heartbreak at that circuit',
    ],
  },
  {
    id: 'norris',
    driverName: 'Lando Norris',
    commonNames: ['Norris', 'Lando Norris', 'Lando', 'NOR'],
    clues: [
      'Entertaining',
      '10+ race wins through the 2025 season',
      '2025 World Drivers\' Champion: his maiden title',
      'McLaren (2019-present), has been with the team his entire F1 career',
      'British driver who debuted in 2019, one of the most popular drivers in the paddock',
      'Known for his streaming, humor, and close friendship with other young drivers on the grid',
    ],
  },
  {
    id: 'piastri',
    driverName: 'Oscar Piastri',
    commonNames: ['Piastri', 'Oscar Piastri', 'Oscar', 'PIA'],
    clues: [
      'Composed',
      'Multiple race wins including his maiden victory at the 2024 Hungarian Grand Prix',
      'No championship yet but a strong contender at a top team',
      'McLaren (2023-present), Norris\'s teammate',
      'Australian driver who debuted in 2023 after winning F3 and F2 back-to-back',
      'Was at the center of a dramatic contract dispute between Alpine and McLaren before even racing in F1',
    ],
  },
  {
    id: 'russell',
    driverName: 'George Russell',
    commonNames: ['Russell', 'George Russell', 'RUS'],
    clues: [
      'Polished',
      'Multiple race wins since joining Mercedes',
      'No championship yet but consistently among the top performers',
      'Mercedes (2022-present), previously Williams (2019-2021)',
      'British driver who debuted in 2019, now leading Mercedes alongside a rookie',
      'Earned the nickname "Mr. Saturday" for his exceptional qualifying performances',
    ],
  },
  {
    id: 'sainz',
    driverName: 'Carlos Sainz',
    commonNames: ['Sainz', 'Carlos Sainz', 'Carlos Sainz Jr', 'SAI'],
    clues: [
      'Resilient',
      '4 race wins through the 2025 season',
      'No championship yet: finished in the top 5 multiple times',
      'Williams (2025-present), previously Ferrari (2021-2024), McLaren (2019-2020), Renault (2018-2019), Toro Rosso (2015-2017)',
      'Spanish driver who debuted in 2015, son of rally legend Carlos Sainz Sr.',
      'Won the 2024 Australian Grand Prix just weeks after appendix surgery in a remarkable comeback',
    ],
  },
  {
    id: 'alonso',
    driverName: 'Fernando Alonso',
    commonNames: ['Alonso', 'Fernando Alonso', 'Fernando', 'Nando', 'ALO'],
    clues: [
      'Tenacious',
      '32 race wins across his career',
      '2 World Championships (2005, 2006), ended Michael Schumacher\'s dominant era',
      'Aston Martin (2023-present), previously Alpine/Renault, McLaren, Ferrari across a 20+ year career',
      'Spanish driver who debuted in 2001, the elder statesman of the grid at 44 years old',
      'The oldest driver on the 2026 grid, still racing competitively after more than two decades in F1',
    ],
  },
  {
    id: 'stroll',
    driverName: 'Lance Stroll',
    commonNames: ['Stroll', 'Lance Stroll', 'STR'],
    clues: [
      'Polarizing',
      '0 race wins but has scored podium finishes including a front-row start in his debut season',
      'No championship: typically finishes in the midfield',
      'Aston Martin (2019-present, formerly Racing Point/Force India), previously Williams (2017-2018)',
      'Canadian driver who debuted in 2017, his father owns the team he drives for',
      'Scored a podium on his debut season at Baku 2017, becoming one of the youngest podium finishers ever',
    ],
  },
  {
    id: 'gasly',
    driverName: 'Pierre Gasly',
    commonNames: ['Gasly', 'Pierre Gasly', 'GAS'],
    clues: [
      'Reborn',
      '2 race wins: Monza 2020 and a second victory later',
      'No championship: was demoted from Red Bull after half a season in 2019',
      'Alpine (2023-present), previously AlphaTauri/Toro Rosso (2017-2022) with a brief Red Bull stint (2019)',
      'French driver who debuted in 2017, demoted from a top team before rebuilding his career',
      'Won the 2020 Italian Grand Prix at Monza in one of the most dramatic and unexpected victories in recent history',
    ],
  },
  {
    id: 'ocon',
    driverName: 'Esteban Ocon',
    commonNames: ['Ocon', 'Esteban Ocon', 'OCO'],
    clues: [
      'Determined',
      '1 race win: the 2021 Hungarian Grand Prix',
      'No championship: typically a midfield runner',
      'Haas (2025-present), previously Alpine (2021-2024), Renault (2020), Force India/Racing Point (2017-2018)',
      'French driver who debuted in 2016, moved to Haas for 2025',
      'Won his maiden race in chaotic conditions at Hungary 2021 with Alpine, crossing the line in tears',
    ],
  },
  {
    id: 'albon',
    driverName: 'Alex Albon',
    commonNames: ['Albon', 'Alex Albon', 'ALB'],
    clues: [
      'Likeable',
      '0 race wins but regularly extracts strong results from midfield machinery',
      'No championship: was dropped by Red Bull after 2020 before returning with Williams',
      'Williams (2022-present), previously Red Bull (2019-2020) and Toro Rosso (2019)',
      'Thai-British driver who debuted in 2019, dropped by Red Bull but rebuilt his career',
      'Known for consistently out-performing his car and his wholesome personality off-track',
    ],
  },
  {
    id: 'tsunoda',
    driverName: 'Yuki Tsunoda',
    commonNames: ['Tsunoda', 'Yuki Tsunoda', 'Yuki', 'TSU'],
    clues: [
      'Fiery',
      '0 race wins but has shown strong pace and improved consistency',
      'No championship: competes in the midfield',
      'RB / VCARB (2021-present, formerly AlphaTauri/Toro Rosso)',
      'Japanese driver who debuted in 2021, the only Japanese driver on the 2026 grid',
      'Famous for his explosive and often hilarious radio outbursts during races',
    ],
  },
  {
    id: 'hulkenberg',
    driverName: 'Nico Hülkenberg',
    commonNames: ['Hulkenberg', 'Nico Hulkenberg', 'Hülkenberg', 'Nico Hülkenberg', 'HUL', 'Hulk'],
    clues: [
      'Unlucky',
      '0 race wins: holds the record for most F1 starts without a victory',
      'No championship: known as a strong qualifier but often unlucky on race day',
      'Sauber/Audi (2025-present), previously Haas (2023-2024), and earlier stints at Renault, Force India, Sauber, Williams',
      'German driver who returned to F1 full-time in 2023 after serving as a super-sub',
      'Holds the record for most race starts without ever standing on the podium: the ultimate nearly man',
    ],
  },
  {
    id: 'lawson',
    driverName: 'Liam Lawson',
    commonNames: ['Lawson', 'Liam Lawson', 'LAW'],
    clues: [
      'Fearless',
      '0 race wins: still in the early stages of his career',
      'No championship yet: partnered with the reigning champion at Red Bull',
      'Red Bull Racing (2025-present), previously RB/VCARB and AlphaTauri substitute',
      'New Zealand driver who got his first full-time seat in 2025 after impressing as a substitute',
      'Impressed as a last-minute substitute at multiple races, earning a promotion to the senior Red Bull team',
    ],
  },
  {
    id: 'antonelli',
    driverName: 'Kimi Antonelli',
    commonNames: ['Antonelli', 'Kimi Antonelli', 'Andrea Kimi Antonelli', 'ANT'],
    clues: [
      'Prodigious',
      '0 race wins: a rookie finding his feet at a top team',
      'No championship yet: tipped as a future star',
      'Mercedes (2025-present), replaced Lewis Hamilton when he left for Ferrari',
      'Italian driver who debuted in 2025 as one of the youngest ever, a Mercedes junior prodigy',
      'Crashed heavily during his first FP1 appearance at Monza 2024 but was still given the 2025 seat based on his immense talent',
    ],
  },
  {
    id: 'bearman',
    driverName: 'Oliver Bearman',
    commonNames: ['Bearman', 'Oliver Bearman', 'Ollie Bearman', 'BEA'],
    clues: [
      'Brave',
      '0 race wins: still building his F1 career',
      'No championship yet: the youngest British driver on the grid',
      'Haas (2025-present), previously a Ferrari junior who substituted at Ferrari and Haas in 2024',
      'British driver who earned a full-time seat for 2025 after starring as a substitute',
      'Scored points on his F1 debut subbing for Sainz at Ferrari in Saudi Arabia 2024, finishing 7th at age 18',
    ],
  },
  {
    id: 'doohan',
    driverName: 'Jack Doohan',
    commonNames: ['Doohan', 'Jack Doohan', 'DOO'],
    clues: [
      'Legacy',
      '0 race wins: a rookie at a midfield team',
      'No championship yet: working to establish himself in F1',
      'Alpine (2025-present), an Alpine academy graduate',
      'Australian driver who debuted in 2025, son of motorcycle racing legend Mick Doohan',
      'Son of 5-time 500cc motorcycle world champion Mick Doohan, carrying on a family racing tradition',
    ],
  },
  {
    id: 'hadjar',
    driverName: 'Isack Hadjar',
    commonNames: ['Hadjar', 'Isack Hadjar', 'HAD'],
    clues: [
      'Rapid',
      '0 race wins: a rookie in his first full season',
      'No championship yet: finished runner-up in F2 in 2024',
      'RB / VCARB (2025-present), part of the Red Bull young driver program',
      'French-Algerian driver who debuted in 2025 as a Red Bull junior graduate',
      'Nearly won the 2024 F2 championship, losing out in a tight title fight before earning his F1 promotion',
    ],
  },
  {
    id: 'bortoleto',
    driverName: 'Gabriel Bortoleto',
    commonNames: ['Bortoleto', 'Gabriel Bortoleto', 'BOR'],
    clues: [
      'Rising',
      '0 race wins: a rookie finding his feet',
      'No championship yet: 2024 F2 Champion',
      'Sauber/Audi (2025-present), joined as the team transitions to the Audi works project',
      'Brazilian driver who debuted in 2025 after winning the F2 championship',
      'Won back-to-back junior titles (F3 2023, F2 2024) before stepping up to Formula 1',
    ],
  },
];

/** Get daily puzzle using date-based index */
export function getDailyF1Puzzle(): F1DriverPuzzle {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return F1_DRIVERS[seed % F1_DRIVERS.length];
}

/** Get a random puzzle */
export function getRandomF1Puzzle(): F1DriverPuzzle {
  return F1_DRIVERS[Math.floor(Math.random() * F1_DRIVERS.length)];
}

/** Resolve a user input to a puzzle, checking common names */
export function resolveF1Driver(input: string): F1DriverPuzzle | undefined {
  const norm = input.trim().toLowerCase();
  return F1_DRIVERS.find(d =>
    d.commonNames.some(n => n.toLowerCase() === norm) ||
    d.driverName.toLowerCase() === norm
  );
}

/** All driver names for autocomplete, ensures current puzzle answer is included */
export function getAllF1DriverNames(currentPuzzle?: F1DriverPuzzle): { name: string; id: string }[] {
  const names = F1_DRIVERS.map(d => ({ name: d.driverName, id: d.id }));
  if (currentPuzzle && !names.some(n => n.id === currentPuzzle.id)) {
    names.push({ name: currentPuzzle.driverName, id: currentPuzzle.id });
  }
  return names;
}
