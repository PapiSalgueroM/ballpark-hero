import { F1DriverPuzzle } from '@/types/f1Driver';

export const F1_DRIVERS: F1DriverPuzzle[] = [
  {
    id: 'hamilton',
    driverName: 'Lewis Hamilton',
    commonNames: ['Hamilton', 'Lewis Hamilton', 'Lewis'],
    clues: [
      'Dominant',
      'British driver who debuted in the late 2000s and competed through the 2020s',
      'Drove for a legendary British constructor for over a decade, moved to an iconic Italian team in 2025',
      'Won more than 100 races',
      'Won the championship 7 times, tying the all-time record',
      'Lost the 2021 title on the last lap of the final race in controversial circumstances',
    ],
  },
  {
    id: 'schumacher',
    driverName: 'Michael Schumacher',
    commonNames: ['Schumacher', 'Michael Schumacher', 'M. Schumacher', 'MSC'],
    clues: [
      'Relentless',
      'German driver who dominated the late 1990s and 2000s',
      'Most famously associated with an Italian constructor, also drove for British teams',
      'Won 91 races across his career',
      'Won 7 world championships, including 5 consecutively',
      'Deliberately collided with a rival at the 1997 finale but was disqualified from the championship',
    ],
  },
  {
    id: 'senna',
    driverName: 'Ayrton Senna',
    commonNames: ['Senna', 'Ayrton Senna'],
    clues: [
      'Legendary',
      'Brazilian driver who competed in the 1980s and early 1990s',
      'Rose to fame with a British team before moving to a dominant Japanese-powered constructor',
      'Won 41 races in his career',
      'Won 3 world championships between 1988 and 1991',
      'Tragically lost his life at Imola in 1994, forever changing the sport\'s approach to safety',
    ],
  },
  {
    id: 'verstappen',
    driverName: 'Max Verstappen',
    commonNames: ['Verstappen', 'Max Verstappen', 'Max', 'VER'],
    clues: [
      'Fierce',
      'Dutch driver who became the youngest ever to start a Grand Prix, competing from mid-2010s onward',
      'Has spent virtually his entire career with one Austrian-backed constructor',
      'Won over 60 races before turning 28',
      'Won multiple consecutive championships in dominant fashion',
      'Won his first title on the last lap of the 2021 season finale in hugely controversial fashion',
    ],
  },
  {
    id: 'prost',
    driverName: 'Alain Prost',
    commonNames: ['Prost', 'Alain Prost', 'The Professor'],
    clues: [
      'Calculated',
      'French driver who competed from the early 1980s to the early 1990s',
      'Drove for multiple top constructors including French, British, and Italian teams',
      'Won 51 races across his career',
      'Won 4 world championships across three different decades',
      'His fierce rivalry with Senna culminated in collisions that decided championships in 1989 and 1990',
    ],
  },
  {
    id: 'raikkonen',
    driverName: 'Kimi Räikkönen',
    commonNames: ['Raikkonen', 'Kimi', 'Kimi Raikkonen', 'Iceman', 'Räikkönen'],
    clues: [
      'Laconic',
      'Finnish driver who competed from the early 2000s to the early 2020s',
      'Drove for a famous British constructor, then moved to an iconic Italian team, also had a stint in rallying',
      'Won 21 races in his career',
      'Won the championship once, snatching it on the final race of the season',
      'Known as "The Iceman" for his deadpan personality and the famous "Leave me alone, I know what I\'m doing" radio message',
    ],
  },
  {
    id: 'vettel',
    driverName: 'Sebastian Vettel',
    commonNames: ['Vettel', 'Sebastian Vettel', 'Seb'],
    clues: [
      'Prodigious',
      'German driver who competed from the late 2000s to the early 2020s',
      'Rose to fame with an Austrian-backed constructor before moving to a legendary Italian team',
      'Won 53 races in his career',
      'Won 4 consecutive world championships as the sport\'s youngest ever champion',
      'Won the 2008 Italian Grand Prix in the rain at the age of 21, making him the youngest race winner at the time',
    ],
  },
  {
    id: 'alonso',
    driverName: 'Fernando Alonso',
    commonNames: ['Alonso', 'Fernando Alonso', 'Fernando', 'Nando'],
    clues: [
      'Tenacious',
      'Spanish driver who debuted in the early 2000s and is still racing in the 2020s',
      'Has driven for at least 5 different constructors including French, British, and Italian teams',
      'Won 32 races across his career',
      'Won 2 consecutive world championships, becoming the then-youngest champion',
      'Ended the dominant reign of a 7-time champion and later endured years at uncompetitive teams while remaining highly regarded',
    ],
  },
  {
    id: 'lauda',
    driverName: 'Niki Lauda',
    commonNames: ['Lauda', 'Niki Lauda'],
    clues: [
      'Resilient',
      'Austrian driver who competed in the 1970s and 1980s',
      'Most associated with an Italian constructor but also drove for a British team',
      'Won 25 races in his career',
      'Won the championship 3 times, with his titles bookending a remarkable comeback',
      'Suffered horrific burns at the Nürburgring in 1976 but returned to racing just 6 weeks later',
    ],
  },
  {
    id: 'fangio',
    driverName: 'Juan Manuel Fangio',
    commonNames: ['Fangio', 'Juan Manuel Fangio'],
    clues: [
      'Masterful',
      'Argentine driver who competed in the 1950s during the sport\'s earliest era',
      'Drove for at least 4 different constructors including Italian and German manufacturers',
      'Won 24 of his 52 race starts — an extraordinary win rate',
      'Won 5 world championships, a record that stood for nearly 50 years',
      'Won the 1957 German Grand Prix at the Nürburgring in what many consider the greatest single drive in history',
    ],
  },
  {
    id: 'clark',
    driverName: 'Jim Clark',
    commonNames: ['Clark', 'Jim Clark', 'Jimmy Clark'],
    clues: [
      'Graceful',
      'Scottish driver who competed in the 1960s',
      'Spent his entire career with one legendary British constructor',
      'Won 25 races from just 73 starts',
      'Won 2 world championships and also won the Indianapolis 500',
      'Tragically killed in a Formula Two race at Hockenheim in 1968, widely considered one of the greatest ever',
    ],
  },
  {
    id: 'mansell',
    driverName: 'Nigel Mansell',
    commonNames: ['Mansell', 'Nigel Mansell'],
    clues: [
      'Combative',
      'British driver who competed in the 1980s and early 1990s',
      'Drove for a famous Italian constructor and a dominant British team',
      'Won 31 races in his career',
      'Won the championship once in dominant fashion, winning 9 races in a single season',
      'Also won the CART IndyCar championship the following year, becoming the only driver to hold both titles simultaneously',
    ],
  },
  {
    id: 'hakkinen',
    driverName: 'Mika Häkkinen',
    commonNames: ['Hakkinen', 'Mika Hakkinen', 'Häkkinen', 'Mika Häkkinen'],
    clues: [
      'Brave',
      'Finnish driver who competed in the 1990s and early 2000s',
      'Spent the majority of his career with one famous British-German constructor',
      'Won 20 races in his career',
      'Won back-to-back world championships in 1998 and 1999',
      'Had an intense rivalry with Michael Schumacher and survived a near-fatal crash in Adelaide in 1995',
    ],
  },
  {
    id: 'hill_damon',
    driverName: 'Damon Hill',
    commonNames: ['Damon Hill', 'Hill', 'D. Hill'],
    clues: [
      'Determined',
      'British driver who competed in the 1990s, son of a former champion',
      'Most associated with a legendary British constructor founded by a famous team boss',
      'Won 22 races in his career',
      'Won the championship once, finishing what his famous teammate could not',
      'Controversially lost the 1994 title after being hit by Schumacher at the Adelaide street circuit',
    ],
  },
  {
    id: 'piquet',
    driverName: 'Nelson Piquet',
    commonNames: ['Piquet', 'Nelson Piquet'],
    clues: [
      'Cunning',
      'Brazilian driver who competed in the 1980s and early 1990s',
      'Drove for a famous British constructor before moving to other teams including a dominant British team',
      'Won 23 races in his career',
      'Won the championship 3 times across the 1980s',
      'Won his first title in 1981 by just one point, out-scoring his rivals through consistency',
    ],
  },
  {
    id: 'stewart',
    driverName: 'Jackie Stewart',
    commonNames: ['Stewart', 'Jackie Stewart', 'Sir Jackie Stewart'],
    clues: [
      'Pioneering',
      'Scottish driver who competed in the late 1960s and early 1970s',
      'Most associated with a French constructor team',
      'Won 27 of his 100 race starts',
      'Won the championship 3 times between 1969 and 1973',
      'Became one of the sport\'s greatest safety campaigners after witnessing numerous fatal accidents',
    ],
  },
  {
    id: 'button',
    driverName: 'Jenson Button',
    commonNames: ['Button', 'Jenson Button', 'Jenson'],
    clues: [
      'Smooth',
      'British driver who competed from the early 2000s to the mid-2010s',
      'Drove for several constructors including a team that dramatically rose from near-bankruptcy to title winners',
      'Won 15 races in his career',
      'Won the championship once in 2009 with a team that had nearly collapsed the year before',
      'Won 6 of the first 7 races in his championship season before rivals caught up',
    ],
  },
  {
    id: 'ricciardo',
    driverName: 'Daniel Ricciardo',
    commonNames: ['Ricciardo', 'Daniel Ricciardo', 'Danny Ric'],
    clues: [
      'Charismatic',
      'Australian driver who competed from the early 2010s to the mid-2020s',
      'Drove for an Austrian-backed constructor and later moved to a French, then American-linked team',
      'Won 8 races across his career',
      'Never won the championship but was regularly among the top drivers of his generation',
      'Famous for his "shoey" celebration — drinking champagne from his racing boot on the podium',
    ],
  },
  {
    id: 'rosberg',
    driverName: 'Nico Rosberg',
    commonNames: ['Rosberg', 'Nico Rosberg'],
    clues: [
      'Strategic',
      'German-Finnish driver who competed from the mid-2000s to late 2016',
      'Drove for a famous German-British constructor alongside his childhood friend turned rival',
      'Won 23 races in his career',
      'Won the championship once, then immediately retired at the peak of his career',
      'Beat his dominant teammate to the 2016 title in a fierce intra-team rivalry that sometimes erupted on track',
    ],
  },
  {
    id: 'norris',
    driverName: 'Lando Norris',
    commonNames: ['Norris', 'Lando Norris', 'Lando'],
    clues: [
      'Entertaining',
      'British driver who debuted in the late 2010s, one of the youngest on the grid',
      'Has spent his entire career with a famous British constructor based in Woking that won the 2024 Constructors\' title',
      'Won multiple races in 2024 and 2025',
      'Finished runner-up in the Drivers\' Championship to Verstappen in 2024',
      'Known for his streaming, humor, and close friendship with other young drivers on the grid',
    ],
  },
  {
    id: 'piastri',
    driverName: 'Oscar Piastri',
    commonNames: ['Piastri', 'Oscar Piastri', 'Oscar'],
    clues: [
      'Composed',
      'Australian driver who debuted in the early 2020s after winning F3 and F2 back-to-back',
      'Drives for a famous British constructor based in Woking alongside a close rival',
      'Won multiple races in 2024 including his maiden victory at the Hungarian Grand Prix',
      'Was at the center of a dramatic contract dispute between two teams before even racing in F1',
      'Won F3, F2, and scored F1 victories in consecutive years — a remarkably rapid rise through the ranks',
    ],
  },
  {
    id: 'leclerc',
    driverName: 'Charles Leclerc',
    commonNames: ['Leclerc', 'Charles Leclerc', 'Charles'],
    clues: [
      'Passionate',
      'Monégasque driver who debuted in the late 2010s',
      'Rapidly promoted to a legendary Italian constructor after just one season with a smaller team',
      'Won multiple races but has been affected by reliability and strategy issues',
      'Has not yet won the championship despite being in a top car',
      'Won his home race at Monaco after years of heartbreak, in an emotional victory in 2024',
    ],
  },
  {
    id: 'hunt',
    driverName: 'James Hunt',
    commonNames: ['Hunt', 'James Hunt'],
    clues: [
      'Flamboyant',
      'British driver who competed in the 1970s',
      'Most associated with a famous British constructor',
      'Won 10 races in his career',
      'Won the championship once in 1976 in a dramatic title fight',
      'His rivalry with Niki Lauda was immortalized in the film "Rush" — he won the title by one point after Lauda withdrew from the rain-soaked finale',
    ],
  },
  {
    id: 'villeneuve_gilles',
    driverName: 'Gilles Villeneuve',
    commonNames: ['Gilles Villeneuve', 'Villeneuve', 'G. Villeneuve'],
    clues: [
      'Spectacular',
      'Canadian driver who competed in the late 1970s and early 1980s',
      'Drove exclusively for a legendary Italian constructor',
      'Won only 6 races in his career but was universally admired',
      'Never won the championship despite being considered one of the most talented drivers of his era',
      'Killed in qualifying at Zolder in 1982, and is considered one of the most exciting drivers to ever race',
    ],
  },
  {
    id: 'moss',
    driverName: 'Stirling Moss',
    commonNames: ['Moss', 'Stirling Moss', 'Sir Stirling Moss'],
    clues: [
      'Noble',
      'British driver who competed in the 1950s and 1960s',
      'Drove for multiple constructors including British and German manufacturers',
      'Won 16 races from 66 starts',
      'Finished runner-up in the championship 4 times but never won it',
      'Often called "the greatest driver never to win the championship" — in 1958 he lost by one point after sportingly vouching for a rival',
    ],
  },
  {
    id: 'coulthard',
    driverName: 'David Coulthard',
    commonNames: ['Coulthard', 'David Coulthard', 'DC'],
    clues: [
      'Dependable',
      'Scottish driver who competed from the mid-1990s to the late 2000s',
      'Drove for two top British constructors across his career',
      'Won 13 races in his career',
      'Finished in the top 3 of the championship multiple times but never won it',
      'Survived a plane crash in 2000 that killed both pilots, then raced the following weekend',
    ],
  },
  {
    id: 'massa',
    driverName: 'Felipe Massa',
    commonNames: ['Massa', 'Felipe Massa'],
    clues: [
      'Emotional',
      'Brazilian driver who competed from the early 2000s to the late 2010s',
      'Most associated with a legendary Italian constructor',
      'Won 11 races in his career',
      'Lost the championship by one point on the last corner of the last lap of the last race in 2008',
      'Nearly killed by a spring that struck his helmet during qualifying in Hungary in 2009',
    ],
  },
  {
    id: 'webber',
    driverName: 'Mark Webber',
    commonNames: ['Webber', 'Mark Webber'],
    clues: [
      'Gritty',
      'Australian driver who competed from the early 2000s to the mid-2010s',
      'Started at smaller constructors before joining an Austrian-backed top team',
      'Won 9 races in his career',
      'Finished 3rd in the championship multiple times, never winning it despite driving a title-winning car',
      'Famous for his fractious relationship with his younger teammate over the "Multi 21" team orders incident',
    ],
  },
  {
    id: 'barrichello',
    driverName: 'Rubens Barrichello',
    commonNames: ['Barrichello', 'Rubens Barrichello', 'Rubens'],
    clues: [
      'Loyal',
      'Brazilian driver who competed from the early 1990s to the early 2010s, one of the longest careers in the sport',
      'Most famously served as the number two driver at a dominant Italian constructor',
      'Won 11 races across his career',
      'Finished runner-up in the championship twice but was often asked to yield to his teammate',
      'Holds the record for most race starts (322) and was ordered to let Schumacher past on the final straight at the 2002 Austrian Grand Prix',
    ],
  },
  {
    id: 'sainz',
    driverName: 'Carlos Sainz',
    commonNames: ['Sainz', 'Carlos Sainz', 'Carlos Sainz Jr'],
    clues: [
      'Resilient',
      'Spanish driver who debuted in the mid-2010s, son of a rally legend',
      'Has driven for multiple constructors including a French, British, and Italian team',
      'Won multiple races starting from 2022',
      'Finished in the top 5 of the championship multiple times',
      'Won the 2024 Australian Grand Prix just weeks after surgery, in a remarkable comeback',
    ],
  },
  {
    id: 'russell',
    driverName: 'George Russell',
    commonNames: ['Russell', 'George Russell'],
    clues: [
      'Polished',
      'British driver who debuted in the late 2010s',
      'Spent years at a backmarker before moving to a famous German-British constructor',
      'Won his first race as a substitute driver before joining his new team full-time',
      'Has won multiple races since joining a top team',
      'Earned the nickname "Mr. Saturday" for his exceptional qualifying performances',
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

/** All driver names for autocomplete — ensures current puzzle answer is included */
export function getAllF1DriverNames(currentPuzzle?: F1DriverPuzzle): { name: string; id: string }[] {
  const names = F1_DRIVERS.map(d => ({ name: d.driverName, id: d.id }));
  if (currentPuzzle && !names.some(n => n.id === currentPuzzle.id)) {
    names.push({ name: currentPuzzle.driverName, id: currentPuzzle.id });
  }
  return names;
}
