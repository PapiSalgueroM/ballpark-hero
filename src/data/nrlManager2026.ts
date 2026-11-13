// NRL club fields and original simulated regular-season draws for 2026 and 2027.
export const NRL_MANAGER_SEASON = 2026;
export const NRL_CLUBS_SOURCE = 'https://www.nrl.com/clubs/';
export const NRL_MEMBERSHIP_CROSS_CHECK = 'https://www.rugbyleagueproject.org/seasons/nrl-2026/summary.html';
export const NRL_STRENGTH_SOURCE = 'https://www.nrl.com/ladder/?competition=111&season=2025&round=27';
export const NRL_STRENGTH_CROSS_CHECK = 'https://www.rugbyleagueproject.org/seasons/nrl-2025/summary.html';
export const NRL_DRAW_DESCRIPTION = 'Original simulated 2026 regular-season draw';

// Each 20 points of differential in the prior final regular-season ladder shifts the base rating by one.
const openingStrength = (pointDifferential: number) => Math.round(75 + pointDifferential / 20);

export const NRL_CLUBS = [
  { id: 'broncos', name: 'Brisbane Broncos', shortName: 'Broncos', strength: openingStrength(172) },
  { id: 'raiders', name: 'Canberra Raiders', shortName: 'Raiders', strength: openingStrength(148) },
  { id: 'bulldogs', name: 'Canterbury-Bankstown Bulldogs', shortName: 'Bulldogs', strength: openingStrength(120) },
  { id: 'sharks', name: 'Cronulla-Sutherland Sharks', shortName: 'Sharks', strength: openingStrength(109) },
  { id: 'dolphins', name: 'Dolphins', shortName: 'Dolphins', strength: openingStrength(125) },
  { id: 'titans', name: 'Gold Coast Titans', shortName: 'Titans', strength: openingStrength(-199) },
  { id: 'sea-eagles', name: 'Manly-Warringah Sea Eagles', shortName: 'Sea Eagles', strength: openingStrength(21) },
  { id: 'storm', name: 'Melbourne Storm', shortName: 'Storm', strength: openingStrength(212) },
  { id: 'warriors', name: 'New Zealand Warriors', shortName: 'Warriors', strength: openingStrength(21) },
  { id: 'knights', name: 'Newcastle Knights', shortName: 'Knights', strength: openingStrength(-300) },
  { id: 'cowboys', name: 'North Queensland Cowboys', shortName: 'Cowboys', strength: openingStrength(-146) },
  { id: 'eels', name: 'Parramatta Eels', shortName: 'Eels', strength: openingStrength(-76) },
  { id: 'panthers', name: 'Penrith Panthers', shortName: 'Panthers', strength: openingStrength(107) },
  { id: 'rabbitohs', name: 'South Sydney Rabbitohs', shortName: 'Rabbitohs', strength: openingStrength(-181) },
  { id: 'dragons', name: 'St George Illawarra Dragons', shortName: 'Dragons', strength: openingStrength(-130) },
  { id: 'roosters', name: 'Sydney Roosters', shortName: 'Roosters', strength: openingStrength(132) },
  { id: 'tigers', name: 'Wests Tigers', shortName: 'Wests Tigers', strength: openingStrength(-135) },
] as const;

type Nrl2026ClubId = (typeof NRL_CLUBS)[number]['id'];
export type NrlClubId = (typeof NRL_CLUBS_2027)[number]['id'];
export type NrlFixture = readonly [homeId: NrlClubId, awayId: NrlClubId];

// A complete round robin plus eight reverse fixtures per club, spaced across 27 rounds.
export const NRL_DRAW: readonly (readonly NrlFixture[])[] = [
  [ // Round 1
    ['broncos', 'tigers'], ['raiders', 'dragons'], ['bulldogs', 'roosters'], ['storm', 'sharks'],
    ['warriors', 'dolphins'], ['knights', 'titans'], ['cowboys', 'sea-eagles'],
  ],
  [ // Round 2
    ['raiders', 'sharks'], ['broncos', 'dolphins'], ['tigers', 'titans'], ['roosters', 'sea-eagles'],
    ['storm', 'dragons'], ['warriors', 'rabbitohs'], ['knights', 'panthers'], ['cowboys', 'eels'],
  ],
  [ // Round 3
    ['broncos', 'bulldogs'], ['tigers', 'sharks'], ['roosters', 'dolphins'], ['dragons', 'titans'],
    ['sea-eagles', 'rabbitohs'], ['storm', 'panthers'], ['warriors', 'eels'], ['knights', 'cowboys'],
  ],
  [ // Round 4
    ['raiders', 'broncos'], ['titans', 'sharks'], ['storm', 'sea-eagles'], ['knights', 'warriors'],
    ['eels', 'cowboys'], ['rabbitohs', 'panthers'], ['roosters', 'dragons'],
  ],
  [ // Round 5
    ['sharks', 'raiders'], ['dolphins', 'bulldogs'], ['warriors', 'sea-eagles'], ['knights', 'storm'],
    ['panthers', 'cowboys'], ['roosters', 'eels'], ['tigers', 'dragons'],
  ],
  [ // Round 6
    ['broncos', 'rabbitohs'], ['dolphins', 'raiders'], ['sharks', 'bulldogs'], ['storm', 'titans'],
    ['knights', 'sea-eagles'], ['tigers', 'panthers'],
  ],
  [ // Round 7
    ['warriors', 'cowboys'], ['storm', 'eels'], ['sea-eagles', 'panthers'], ['titans', 'rabbitohs'],
    ['dragons', 'dolphins'], ['roosters', 'sharks'], ['tigers', 'bulldogs'], ['broncos', 'raiders'],
  ],
  [ // Round 8
    ['sharks', 'titans'], ['bulldogs', 'sea-eagles'], ['raiders', 'storm'], ['broncos', 'warriors'],
    ['knights', 'tigers'], ['cowboys', 'roosters'], ['eels', 'dragons'], ['panthers', 'rabbitohs'],
  ],
  [ // Round 9
    ['titans', 'storm'], ['dolphins', 'warriors'], ['sharks', 'knights'], ['bulldogs', 'cowboys'],
    ['eels', 'raiders'], ['panthers', 'broncos'], ['rabbitohs', 'tigers'], ['dragons', 'roosters'],
  ],
  [ // Round 10
    ['knights', 'eels'], ['warriors', 'panthers'], ['storm', 'rabbitohs'], ['sea-eagles', 'dragons'],
    ['roosters', 'titans'], ['tigers', 'dolphins'], ['broncos', 'sharks'], ['raiders', 'bulldogs'],
  ],
  [ // Round 11
    ['eels', 'rabbitohs'], ['cowboys', 'dragons'], ['knights', 'roosters'], ['warriors', 'tigers'],
    ['broncos', 'storm'], ['raiders', 'sea-eagles'], ['bulldogs', 'titans'], ['sharks', 'dolphins'],
  ],
  [ // Round 12
    ['bulldogs', 'broncos'], ['raiders', 'tigers'], ['titans', 'dolphins'], ['cowboys', 'warriors'],
    ['eels', 'knights'], ['dragons', 'panthers'], ['roosters', 'rabbitohs'],
  ],
  [ // Round 13
    ['dragons', 'tigers'], ['rabbitohs', 'broncos'], ['panthers', 'raiders'], ['eels', 'bulldogs'],
    ['sharks', 'cowboys'], ['dolphins', 'knights'], ['titans', 'warriors'], ['sea-eagles', 'storm'],
  ],
  [ // Round 14
    ['storm', 'knights'], ['sea-eagles', 'cowboys'], ['titans', 'eels'], ['dolphins', 'panthers'],
    ['rabbitohs', 'sharks'], ['dragons', 'bulldogs'], ['roosters', 'raiders'], ['tigers', 'broncos'],
  ],
  [ // Round 15
    ['cowboys', 'panthers'], ['knights', 'rabbitohs'], ['warriors', 'dragons'], ['storm', 'roosters'],
    ['tigers', 'sea-eagles'], ['broncos', 'titans'], ['raiders', 'dolphins'], ['bulldogs', 'sharks'],
  ],
  [ // Round 16
    ['dolphins', 'sharks'], ['sea-eagles', 'titans'], ['warriors', 'storm'], ['cowboys', 'knights'],
    ['panthers', 'eels'], ['dragons', 'rabbitohs'], ['tigers', 'roosters'],
  ],
  [ // Round 17
    ['dolphins', 'broncos'], ['raiders', 'roosters'], ['titans', 'bulldogs'], ['eels', 'storm'],
    ['rabbitohs', 'knights'], ['dragons', 'cowboys'],
  ],
  [ // Round 18
    ['broncos', 'dragons'], ['titans', 'raiders'], ['sea-eagles', 'bulldogs'], ['sharks', 'tigers'],
    ['cowboys', 'storm'], ['panthers', 'warriors'], ['rabbitohs', 'eels'],
  ],
  [ // Round 19
    ['panthers', 'dragons'], ['eels', 'roosters'], ['cowboys', 'tigers'], ['knights', 'broncos'],
    ['raiders', 'warriors'], ['bulldogs', 'storm'], ['sharks', 'sea-eagles'], ['dolphins', 'titans'],
  ],
  [ // Round 20
    ['roosters', 'broncos'], ['dragons', 'raiders'], ['rabbitohs', 'bulldogs'], ['panthers', 'sharks'],
    ['dolphins', 'eels'], ['titans', 'cowboys'], ['sea-eagles', 'knights'], ['storm', 'warriors'],
  ],
  [ // Round 21
    ['sharks', 'broncos'], ['bulldogs', 'tigers'], ['sea-eagles', 'dolphins'], ['warriors', 'titans'],
    ['rabbitohs', 'cowboys'], ['dragons', 'eels'], ['roosters', 'panthers'],
  ],
  [ // Round 22
    ['broncos', 'roosters'], ['bulldogs', 'raiders'], ['sea-eagles', 'sharks'], ['storm', 'dolphins'],
    ['eels', 'warriors'], ['panthers', 'knights'], ['tigers', 'rabbitohs'],
  ],
  [ // Round 23
    ['tigers', 'raiders'], ['roosters', 'bulldogs'], ['dragons', 'sharks'], ['rabbitohs', 'dolphins'],
    ['titans', 'panthers'], ['sea-eagles', 'eels'], ['storm', 'cowboys'], ['warriors', 'knights'],
  ],
  [ // Round 24
    ['dolphins', 'sea-eagles'], ['sharks', 'storm'], ['bulldogs', 'warriors'], ['raiders', 'knights'],
    ['cowboys', 'broncos'], ['eels', 'tigers'], ['panthers', 'roosters'], ['rabbitohs', 'dragons'],
  ],
  [ // Round 25
    ['bulldogs', 'dolphins'], ['raiders', 'titans'], ['broncos', 'sea-eagles'], ['tigers', 'storm'],
    ['warriors', 'roosters'], ['knights', 'dragons'], ['cowboys', 'rabbitohs'], ['eels', 'panthers'],
  ],
  [ // Round 26
    ['rabbitohs', 'roosters'], ['panthers', 'tigers'], ['eels', 'broncos'], ['cowboys', 'raiders'],
    ['bulldogs', 'knights'], ['sharks', 'warriors'], ['dolphins', 'storm'], ['titans', 'sea-eagles'],
  ],
  [ // Round 27
    ['sea-eagles', 'warriors'], ['titans', 'knights'], ['dolphins', 'cowboys'], ['sharks', 'eels'],
    ['panthers', 'bulldogs'], ['rabbitohs', 'raiders'], ['dragons', 'broncos'], ['roosters', 'tigers'],
  ],
];

// 2027 adds Perth, confirmed by the NRL and the Bears.
// https://www.nrl.com/news/2025/05/08/arlc-reaches-historic-agreement-with-wa-government-for-18th-team/
// https://www.perthbears.com.au/news/2026/11/01/perth-bears-are-out-of-hibernation/
// Final 2026 regular-season point differentials, cross-checked against Rugby League Project.
// https://www.nrl.com/ladder/?competition=111&season=2026&round=27
// https://www.rugbyleagueproject.org/seasons/nrl-2026/week-27/ladder.html
const POINT_DIFFERENTIAL_2026: Record<Nrl2026ClubId, number> = {
  broncos: -206,
  raiders: -45,
  bulldogs: -60,
  sharks: 149,
  dolphins: 156,
  titans: -186,
  'sea-eagles': 99,
  storm: 18,
  warriors: 310,
  knights: 42,
  cowboys: -84,
  eels: -181,
  panthers: 336,
  rabbitohs: 113,
  dragons: -325,
  roosters: 118,
  tigers: -254,
};

const NRL_CLUBS_2027 = [
  ...NRL_CLUBS.map(club => ({ ...club, strength: openingStrength(POINT_DIFFERENTIAL_2026[club.id]) })),
  { id: 'bears', name: 'Perth Bears', shortName: 'Bears', strength: 75 }, // Neutral game rating for the expansion club.
] as const;

// The 2027 game uses a 27-round simulation with three byes per club. The full official draw was pending.
// https://travel.nrl.com/blog/nrl-2027-magic-round
// https://leagueunlimited.com/news/44795-nrl-2027-draw-what-you-need-to-know/
// Each club plays the other 17 once and seven opponents again with home and away reversed.
const NRL_DRAW_2027: readonly (readonly NrlFixture[])[] = [
  [ // Round 1
    ['bulldogs', 'bears'], ['dolphins', 'warriors'], ['titans', 'storm'], ['knights', 'broncos'],
    ['cowboys', 'eels'], ['panthers', 'dragons'], ['roosters', 'sea-eagles'],
  ],
  [ // Round 2
    ['broncos', 'titans'], ['raiders', 'dragons'], ['bulldogs', 'rabbitohs'], ['sharks', 'panthers'],
    ['dolphins', 'eels'], ['sea-eagles', 'knights'], ['storm', 'warriors'], ['tigers', 'bears'],
  ],
  [ // Round 3
    ['dolphins', 'bulldogs'], ['warriors', 'bears'], ['knights', 'storm'], ['cowboys', 'sea-eagles'],
    ['eels', 'titans'], ['rabbitohs', 'sharks'], ['roosters', 'raiders'], ['tigers', 'broncos'],
  ],
  [ // Round 4
    ['raiders', 'bulldogs'], ['sea-eagles', 'titans'], ['storm', 'dolphins'], ['warriors', 'sharks'],
    ['eels', 'broncos'], ['roosters', 'rabbitohs'], ['tigers', 'panthers'], ['bears', 'dragons'],
  ],
  [ // Round 5
    ['broncos', 'roosters'], ['raiders', 'eels'], ['sharks', 'knights'], ['titans', 'cowboys'],
    ['panthers', 'dolphins'], ['dragons', 'bulldogs'], ['tigers', 'rabbitohs'], ['bears', 'sea-eagles'],
  ],
  [ // Round 6
    ['broncos', 'cowboys'], ['bulldogs', 'warriors'], ['storm', 'eels'], ['panthers', 'sea-eagles'],
    ['rabbitohs', 'titans'], ['dragons', 'dolphins'], ['roosters', 'sharks'], ['bears', 'knights'],
  ],
  [ // Round 7
    ['raiders', 'knights'], ['bulldogs', 'broncos'], ['sharks', 'storm'], ['dolphins', 'sea-eagles'],
    ['titans', 'bears'], ['eels', 'tigers'], ['panthers', 'roosters'], ['rabbitohs', 'dragons'],
  ],
  [ // Round 8
    ['broncos', 'panthers'], ['titans', 'dolphins'], ['sea-eagles', 'sharks'], ['storm', 'bulldogs'],
    ['warriors', 'raiders'], ['cowboys', 'tigers'], ['rabbitohs', 'bears'], ['roosters', 'dragons'],
  ],
  [ // Round 9
    ['warriors', 'sea-eagles'], ['knights', 'titans'], ['cowboys', 'dolphins'],
    ['eels', 'sharks'], ['panthers', 'bulldogs'], ['rabbitohs', 'raiders'],
    ['dragons', 'broncos'], ['tigers', 'roosters'], ['bears', 'storm'],
  ],
  [ // Round 10
    ['broncos', 'rabbitohs'], ['raiders', 'panthers'], ['bulldogs', 'eels'],
    ['sharks', 'cowboys'], ['dolphins', 'knights'], ['titans', 'warriors'],
    ['sea-eagles', 'storm'], ['dragons', 'tigers'], ['roosters', 'bears'],
  ],
  [ // Round 11
    ['titans', 'raiders'], ['sea-eagles', 'broncos'], ['storm', 'tigers'], ['warriors', 'roosters'],
    ['knights', 'dragons'], ['cowboys', 'rabbitohs'], ['eels', 'panthers'], ['bears', 'sharks'],
  ],
  [ // Round 12
    ['raiders', 'dolphins'], ['bulldogs', 'sharks'], ['panthers', 'cowboys'], ['rabbitohs', 'knights'],
    ['dragons', 'warriors'], ['roosters', 'storm'], ['tigers', 'sea-eagles'], ['bears', 'eels'],
  ],
  [ // Round 13
    ['raiders', 'tigers'], ['bulldogs', 'roosters'], ['sharks', 'dragons'],
    ['dolphins', 'rabbitohs'], ['titans', 'panthers'], ['sea-eagles', 'eels'],
    ['storm', 'cowboys'], ['knights', 'warriors'], ['bears', 'broncos'],
  ],
  [ // Round 14
    ['broncos', 'storm'], ['raiders', 'sea-eagles'], ['bulldogs', 'titans'],
    ['dolphins', 'sharks'], ['knights', 'roosters'], ['eels', 'rabbitohs'],
    ['panthers', 'bears'], ['dragons', 'cowboys'], ['tigers', 'warriors'],
  ],
  [ // Round 15
    ['raiders', 'titans'], ['bulldogs', 'dolphins'], ['sharks', 'bears'], ['panthers', 'broncos'],
    ['rabbitohs', 'cowboys'], ['dragons', 'knights'], ['roosters', 'warriors'], ['tigers', 'storm'],
  ],
  [ // Round 16
    ['broncos', 'raiders'], ['sharks', 'sea-eagles'], ['dolphins', 'titans'], ['cowboys', 'warriors'],
    ['dragons', 'panthers'], ['roosters', 'eels'], ['tigers', 'bulldogs'], ['bears', 'rabbitohs'],
  ],
  [ // Round 17
    ['raiders', 'warriors'], ['bulldogs', 'dragons'], ['sharks', 'rabbitohs'], ['cowboys', 'knights'],
    ['panthers', 'storm'], ['roosters', 'broncos'], ['bears', 'tigers'],
  ],
  [ // Round 18
    ['titans', 'sharks'], ['sea-eagles', 'bulldogs'], ['storm', 'raiders'],
    ['warriors', 'broncos'], ['knights', 'tigers'], ['rabbitohs', 'panthers'],
    ['dragons', 'eels'], ['roosters', 'cowboys'], ['bears', 'dolphins'],
  ],
  [ // Round 19
    ['broncos', 'knights'], ['raiders', 'bears'], ['bulldogs', 'storm'], ['eels', 'warriors'],
    ['rabbitohs', 'sea-eagles'], ['dragons', 'titans'], ['roosters', 'dolphins'], ['tigers', 'cowboys'],
  ],
  [ // Round 20
    ['broncos', 'sea-eagles'], ['sharks', 'bulldogs'], ['dolphins', 'raiders'], ['storm', 'roosters'],
    ['warriors', 'dragons'], ['knights', 'rabbitohs'], ['cowboys', 'panthers'], ['eels', 'bears'],
  ],
  [ // Round 21
    ['sharks', 'broncos'], ['dolphins', 'tigers'], ['titans', 'roosters'], ['sea-eagles', 'dragons'],
    ['warriors', 'panthers'], ['cowboys', 'bears'], ['eels', 'knights'], ['rabbitohs', 'storm'],
  ],
  [ // Round 22
    ['sharks', 'tigers'], ['titans', 'broncos'], ['sea-eagles', 'rabbitohs'], ['warriors', 'dolphins'],
    ['knights', 'bulldogs'], ['cowboys', 'raiders'], ['panthers', 'eels'],
  ],
  [ // Round 23
    ['dolphins', 'roosters'], ['titans', 'dragons'], ['sea-eagles', 'tigers'], ['storm', 'panthers'],
    ['warriors', 'eels'], ['knights', 'cowboys'], ['bears', 'raiders'],
  ],
  [ // Round 24
    ['broncos', 'dolphins'], ['sea-eagles', 'bears'], ['storm', 'titans'], ['knights', 'sharks'],
    ['cowboys', 'bulldogs'], ['eels', 'raiders'], ['rabbitohs', 'tigers'], ['dragons', 'roosters'],
  ],
  [ // Round 25
    ['broncos', 'tigers'], ['warriors', 'storm'], ['knights', 'sea-eagles'], ['cowboys', 'titans'],
    ['eels', 'dolphins'], ['panthers', 'sharks'], ['rabbitohs', 'bulldogs'], ['dragons', 'raiders'],
  ],
  [ // Round 26
    ['broncos', 'bulldogs'], ['raiders', 'roosters'], ['dolphins', 'panthers'], ['titans', 'eels'],
    ['sea-eagles', 'cowboys'], ['storm', 'knights'], ['tigers', 'sharks'], ['bears', 'warriors'],
  ],
  [ // Round 27
    ['bulldogs', 'cowboys'], ['sharks', 'raiders'], ['storm', 'dragons'], ['warriors', 'rabbitohs'],
    ['eels', 'roosters'], ['panthers', 'knights'], ['tigers', 'titans'],
  ],
];

export const NRL_SEASONS = {
  2026: { clubs: NRL_CLUBS, draw: NRL_DRAW },
  2027: { clubs: NRL_CLUBS_2027, draw: NRL_DRAW_2027 },
} as const;

export type NrlYear = keyof typeof NRL_SEASONS;
