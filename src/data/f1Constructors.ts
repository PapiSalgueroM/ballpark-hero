import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { F1ConstructorPuzzle } from '@/types/f1Constructor';

export const F1_CONSTRUCTORS: F1ConstructorPuzzle[] = [
  {
    id: 'ferrari',
    constructorName: 'Ferrari',
    commonNames: ['Ferrari', 'Scuderia Ferrari'],
    clues: [
      'Iconic',
      'Italy',
      'Competitive across nearly every decade since the championship began in 1950',
      'Won 16 Constructors\' Championships',
      'Famous for their all-red livery, known as "Rosso Corsa"',
      'Had both a 7-time and a 5-time world champion drive for them',
    ],
  },
  {
    id: 'mclaren',
    constructorName: 'McLaren',
    commonNames: ['McLaren', 'Mclaren'],
    clues: [
      'Prestigious',
      'United Kingdom',
      'Dominated the late 1980s and late 1990s, then won the Constructors\' title again in 2024',
      'Won 9 Constructors\' Championships',
      'Historically raced in papaya orange, then red and white, now back to papaya',
      'Ayrton Senna won all three of his championships with this team',
    ],
  },
  {
    id: 'williams',
    constructorName: 'Williams',
    commonNames: ['Williams', 'Williams Racing'],
    clues: [
      'Resilient',
      'United Kingdom',
      'Dominated the 1980s and 1990s but declined sharply in the 2010s',
      'Won 9 Constructors\' Championships',
      'Raced in various liveries but most associated with blue and white',
      'Nigel Mansell won his only title with this team in 1992',
    ],
  },
  {
    id: 'mercedes',
    constructorName: 'Mercedes',
    commonNames: ['Mercedes', 'Mercedes-AMG', 'Mercedes AMG'],
    clues: [
      'Dominant',
      'Germany (based in the UK)',
      'Won eight consecutive Constructors\' Championships from 2014 to 2021',
      'Won 8 Constructors\' Championships',
      'Famous for their all-silver livery, earning the nickname "Silver Arrows"',
      'Lewis Hamilton won six of his seven titles driving for this team before moving to Ferrari in 2025',
    ],
  },
  {
    id: 'red-bull',
    constructorName: 'Red Bull Racing',
    commonNames: ['Red Bull', 'Red Bull Racing', 'RBR'],
    clues: [
      'Audacious',
      'Austria (based in the UK)',
      'Rose from midfield to domination in the early 2010s, then again from 2021 onward',
      'Won 6 Constructors\' Championships',
      'Race in dark blue with red and yellow bull branding',
      'Max Verstappen has won multiple consecutive titles with this team',
    ],
  },
  {
    id: 'lotus',
    constructorName: 'Lotus',
    commonNames: ['Lotus', 'Team Lotus', 'Lotus Racing'],
    clues: [
      'Innovative',
      'United Kingdom',
      'Revolutionized car design in the 1960s and 1970s with ground-breaking aerodynamics',
      'Won 7 Constructors\' Championships',
      'Raced in iconic British Racing Green, later in black and gold with a tobacco sponsor',
      'Jim Clark won both his championships driving for this legendary constructor',
    ],
  },
  {
    id: 'renault',
    constructorName: 'Renault',
    commonNames: ['Renault', 'Alpine', 'Renault F1'],
    clues: [
      'Revolutionary',
      'France',
      'Introduced the turbo engine to Formula 1 and won back-to-back titles in the mid-2000s',
      'Won 2 Constructors\' Championships',
      'Raced in blue and yellow, now competes as Alpine in blue, white, and red',
      'Fernando Alonso won both his world championships with this team',
    ],
  },
  {
    id: 'brabham',
    constructorName: 'Brabham',
    commonNames: ['Brabham'],
    clues: [
      'Pioneering',
      'United Kingdom (founded by an Australian)',
      'Competitive from the 1960s through the 1980s',
      'Won 2 Constructors\' Championships',
      'Raced in various liveries including dark green and later blue',
      'Founded by Jack Brabham, who won a championship in his own car, a unique achievement',
    ],
  },
  {
    id: 'tyrrell',
    constructorName: 'Tyrrell',
    commonNames: ['Tyrrell', 'Tyrrell Racing'],
    clues: [
      'Resourceful',
      'United Kingdom',
      'Most successful in the early 1970s before declining through the 1980s and 1990s',
      'Won 1 Constructors\' Championship',
      'Raced in blue livery, famously built a controversial 6-wheeled car',
      'Jackie Stewart won his final two world titles driving for this team',
    ],
  },
  {
    id: 'benetton',
    constructorName: 'Benetton',
    commonNames: ['Benetton', 'Benetton Formula'],
    clues: [
      'Flashy',
      'United Kingdom (Italian ownership)',
      'Rose to prominence in the early-to-mid 1990s',
      'Won 1 Constructors\' Championship',
      'Known for colorful, multicolored liveries reflecting their fashion brand owner',
      'Michael Schumacher won his first two world titles with this team before leaving for Ferrari',
    ],
  },
  {
    id: 'brawn',
    constructorName: 'Brawn GP',
    commonNames: ['Brawn', 'Brawn GP'],
    clues: [
      'Fairytale',
      'United Kingdom',
      'Only existed for one season in 2009 and dominated it',
      'Won 1 Constructors\' Championship',
      'Raced in a simple white, fluorescent yellow, and black livery',
      'Jenson Button won the championship in their only year of existence before the team became Mercedes',
    ],
  },
  {
    id: 'cooper',
    constructorName: 'Cooper',
    commonNames: ['Cooper', 'Cooper Car Company'],
    clues: [
      'Trailblazing',
      'United Kingdom',
      'Revolutionized the sport by introducing the rear-engine layout in the late 1950s',
      'Won 2 Constructors\' Championships',
      'Raced in traditional British Racing Green',
      'Jack Brabham won back-to-back championships with this team before founding his own constructor',
    ],
  },
  {
    id: 'matra',
    constructorName: 'Matra',
    commonNames: ['Matra'],
    clues: [
      'Patriotic',
      'France',
      'Brief but successful period in the late 1960s and early 1970s',
      'Won 1 Constructors\' Championship',
      'Raced in French blue livery',
      'Jackie Stewart won the 1969 World Championship driving a car powered by this manufacturer',
    ],
  },
  {
    id: 'alfa-romeo',
    constructorName: 'Alfa Romeo',
    commonNames: ['Alfa Romeo', 'Alfa'],
    clues: [
      'Historic',
      'Italy',
      'Won the very first Formula 1 World Championship in 1950',
      'Won 0 Constructors\' Championships (the award didn\'t exist when they dominated)',
      'Raced in deep Italian red, returned to F1 as a team name partner in the 2010s-2020s',
      'Juan Manuel Fangio won his first championship driving for this team in 1951',
    ],
  },
  {
    id: 'haas',
    constructorName: 'Haas',
    commonNames: ['Haas', 'Haas F1'],
    clues: [
      'Ambitious',
      'United States',
      'Entered Formula 1 in 2016 as the newest American team',
      'Won 0 Constructors\' Championships',
      'Race in white, red, and dark grey livery',
      'Became the first American constructor to score points on debut since 1986',
    ],
  },
  {
    id: 'racing-point',
    constructorName: 'Racing Point',
    commonNames: ['Racing Point', 'Force India', 'Aston Martin'],
    clues: [
      'Overachieving',
      'United Kingdom',
      'Evolved through multiple identities: Jordan, then Midland, Spyker, Force India, Racing Point, and finally Aston Martin',
      'Won 0 Constructors\' Championships',
      'Raced in pink livery that earned the nickname "Pink Panthers"',
      'Sergio Pérez won their first race in years at the 2020 Sakhir Grand Prix',
    ],
  },
  {
    id: 'aston-martin',
    constructorName: 'Aston Martin',
    commonNames: ['Aston Martin', 'Aston'],
    clues: [
      'Glamorous',
      'United Kingdom',
      'Returned to F1 as a constructor name in 2021 after decades away',
      'Won 0 Constructors\' Championships',
      'Race in British Racing Green with a modern twist',
      'Fernando Alonso delivered surprise podiums in 2023, including back-to-back second places in the opening rounds',
    ],
  },
  {
    id: 'jordan',
    constructorName: 'Jordan',
    commonNames: ['Jordan', 'Jordan Grand Prix'],
    clues: [
      'Colourful',
      'Ireland / United Kingdom',
      'Most competitive in the late 1990s, occasionally challenging the top teams',
      'Won 0 Constructors\' Championships',
      'Famous for their bright yellow livery with distinctive branding',
      'Gave Michael Schumacher his F1 debut at the 1991 Belgian Grand Prix',
    ],
  },
  {
    id: 'toro-rosso',
    constructorName: 'Toro Rosso',
    commonNames: ['Toro Rosso', 'AlphaTauri', 'RB', 'VCARB', 'Minardi'],
    clues: [
      'Nurturing',
      'Italy (Austrian ownership)',
      'Served as the junior team for a top constructor, developing future champions',
      'Won 0 Constructors\' Championships',
      'Raced in dark blue and red before rebranding with fashion-inspired liveries',
      'Sebastian Vettel won a shock maiden race at the 2008 Italian Grand Prix driving for this team in the rain',
    ],
  },
  {
    id: 'sauber',
    constructorName: 'Sauber',
    commonNames: ['Sauber', 'Stake', 'Kick Sauber'],
    clues: [
      'Steady',
      'Switzerland',
      'A reliable midfield presence from the 1990s onward, set to become an Audi works team',
      'Won 0 Constructors\' Championships',
      'Raced in various liveries including blue, white, and red over the years',
      'Gave Kimi Räikkönen his F1 debut in 2001 despite the Finn having minimal single-seater experience',
    ],
  },
  {
    id: 'vanwall',
    constructorName: 'Vanwall',
    commonNames: ['Vanwall'],
    clues: [
      'Historic',
      'United Kingdom',
      'Won the very first Constructors\' Championship ever awarded',
      'Won 1 Constructors\' Championship (1958)',
      'Raced in British Racing Green in the 1950s',
      'Stirling Moss and Tony Brooks drove the team to glory in the inaugural constructors\' title fight',
    ],
  },
  {
    id: 'ligier',
    constructorName: 'Ligier',
    commonNames: ['Ligier'],
    clues: [
      'Spirited',
      'France',
      'Competed from the 1970s to the 1990s, occasionally challenging for victories',
      'Won 0 Constructors\' Championships',
      'Raced in French blue, often with the Gitanes cigarette branding',
      'Founded by Guy Ligier in memory of his friend Jo Schlesser, who died racing in the 1968 French Grand Prix',
    ],
  },
  {
    id: 'march',
    constructorName: 'March',
    commonNames: ['March', 'March Engineering'],
    clues: [
      'Entrepreneurial',
      'United Kingdom',
      'Competed intermittently across the 1970s and 1980s, also a prolific customer chassis builder',
      'Won 0 Constructors\' Championships',
      'Raced in various customer liveries, most notably orange and white',
      'Won 3 Grands Prix over its history, providing competitive cars to privateers across many formulas',
    ],
  },
  {
    id: 'brm',
    constructorName: 'BRM',
    commonNames: ['BRM', 'British Racing Motors'],
    clues: [
      'Tenacious',
      'United Kingdom',
      'Most competitive in the early 1960s before a gradual decline',
      'Won 1 Constructors\' Championship',
      'Raced in British Racing Green',
      'Graham Hill won the 1962 World Championship driving for this team',
    ],
  },
  {
    id: 'honda',
    constructorName: 'Honda',
    commonNames: ['Honda', 'Honda Racing', 'Honda F1'],
    clues: [
      'Engineering',
      'Japan',
      'Competed as both engine supplier and full constructor at different times',
      'Won 0 Constructors\' Championships as a full team',
      'Raced in white with a red circle inspired by the Japanese flag',
      'Their withdrawal after 2008 led directly to the formation of Brawn GP, who won the 2009 title with Honda\'s car',
    ],
  },
  {
    id: 'toyota',
    constructorName: 'Toyota',
    commonNames: ['Toyota', 'Toyota Racing', 'Toyota F1'],
    clues: [
      'Underachieving',
      'Japan (based in Germany)',
      'Competed from 2002 to 2009 with massive budget but limited success',
      'Won 0 Constructors\' Championships',
      'Raced in white and red livery',
      'Despite being one of the most well-funded teams in history, they never won a single Grand Prix',
    ],
  },
  {
    id: 'manor',
    constructorName: 'Manor',
    commonNames: ['Manor', 'Marussia', 'Manor Racing', 'Virgin Racing'],
    clues: [
      'Plucky',
      'United Kingdom',
      'Perpetual backmarkers who competed from 2010 to 2016 under various names',
      'Won 0 Constructors\' Championships',
      'Raced in red and black, later blue and orange liveries',
      'Jules Bianchi scored their only ever points with a remarkable 9th place at the 2014 Monaco Grand Prix',
    ],
  },
  {
    id: 'caterham',
    constructorName: 'Caterham',
    commonNames: ['Caterham', 'Lotus Racing', 'Team Lotus (2010s)'],
    clues: [
      'Struggling',
      'Malaysia / United Kingdom',
      'Competed from 2010 to 2014 at the back of the grid',
      'Won 0 Constructors\' Championships',
      'Raced in green and yellow livery',
      'Originally entered as "Lotus Racing" causing a legal dispute with the Lotus car brand and Renault\'s Lotus team',
    ],
  },
  {
    id: 'bmw-sauber',
    constructorName: 'BMW Sauber',
    commonNames: ['BMW Sauber', 'BMW', 'BMW F1'],
    clues: [
      'Clinical',
      'Germany / Switzerland',
      'Brief but impactful stint as a works team from 2006 to 2009',
      'Won 0 Constructors\' Championships',
      'Raced in white and blue BMW livery',
      'Robert Kubica won their only race at the 2008 Canadian Grand Prix, briefly leading the championship',
    ],
  },
  {
    id: 'jaguar',
    constructorName: 'Jaguar',
    commonNames: ['Jaguar', 'Jaguar Racing'],
    clues: [
      'Underperforming',
      'United Kingdom',
      'Competed from 2000 to 2004 before being sold and rebranded',
      'Won 0 Constructors\' Championships',
      'Raced in dark green livery reflecting their British heritage',
      'The team was purchased by Red Bull at the end of 2004 and transformed into Red Bull Racing',
    ],
  },
  {
    id: 'cadillac',
    constructorName: 'Cadillac',
    commonNames: ['Cadillac', 'GM', 'General Motors', 'Cadillac F1'],
    clues: [
      'Bold',
      'United States',
      'Set to join the grid in 2026 as a new American manufacturer entry backed by General Motors',
      'Won 0 Constructors\' Championships (has not yet competed)',
      'Expected to race in a livery reflecting their luxury American brand heritage',
      'Became the 11th team on the grid after years of negotiations, marking GM\'s return to top-level open-wheel racing',
    ],
  },
];

export function getDailyF1ConstructorPuzzle(): F1ConstructorPuzzle {
  const today = new Date();
  /* ROUND 366: seeded from ET, not from the viewer's own clock. This used
     new Date()'s local getFullYear/getMonth/getDate, so the seed was whatever
     calendar date the visitor's machine was on: Europe rolls over five to six
     hours before ET, Australia fourteen to sixteen, Pacific three hours after.
     With a small pool, one local date apart is a different answer, and the page
     tells the visitor to play the daily "for a shared puzzle". Grepping src for
     this pattern returned exactly these two files, so it was an isolated pair
     rather than a convention. */
  const seed = dateSeed(getTodayET());
  // Different offset from driver game so they don't overlap. The offset only
  // decorrelates the two games; it never had anything to do with the timezone.
  return F1_CONSTRUCTORS[(seed + 17) % F1_CONSTRUCTORS.length];
}

export function getRandomF1ConstructorPuzzle(): F1ConstructorPuzzle {
  return F1_CONSTRUCTORS[Math.floor(Math.random() * F1_CONSTRUCTORS.length)];
}

export function resolveF1Constructor(input: string): F1ConstructorPuzzle | undefined {
  const norm = input.trim().toLowerCase();
  return F1_CONSTRUCTORS.find(c =>
    c.commonNames.some(n => n.toLowerCase() === norm) ||
    c.constructorName.toLowerCase() === norm
  );
}

export function getAllF1ConstructorNames(currentPuzzle?: F1ConstructorPuzzle): { name: string; id: string }[] {
  const names = F1_CONSTRUCTORS.map(c => ({ name: c.constructorName, id: c.id }));
  if (currentPuzzle && !names.some(n => n.id === currentPuzzle.id)) {
    names.push({ name: currentPuzzle.constructorName, id: currentPuzzle.id });
  }
  return names;
}
