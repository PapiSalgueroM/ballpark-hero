// Round 1052 research tooling: the Russian Premier League 2026-27 club table.
// GATHERED_RAW names the folder the hosts' answers are kept in (fetch.mjs fills it; it is kept beside the
// research's working copy and never committed: three publishers' pages do not belong in a public repo).
// GATHERED_OUT names the file build.mjs writes, by default the committed research file.
// espn ids from ESPN's standings feed, tm slug and id from Transfermarkt's competition page, both read 2026-10-08.
export const LEAGUE = {
  key: 'ru', code: 'rus.1', league: 'Russian Premier League', season: '2026-27', tmSeason: 2026,
  out: process.env.GATHERED_OUT || 'scripts/data/gatheredSquads/russia2026/research.json',
  raw: process.env.GATHERED_RAW || (() => { throw new Error('set GATHERED_RAW to the folder that holds the saved host answers'); })(),
};
export const CLUBS = [
  { slug: 'zenit', engine: 'Zenit', zone: null, espn: 2533, tm: ['zenit-st-petersburg', 964], fotmob: [8698, 'zenit-st-petersburg'] },
  { slug: 'krasnodar', engine: 'Krasnodar', zone: null, espn: 11336, tm: ['fk-krasnodar', 16704], fotmob: [168719, 'fc-krasnodar'] },
  { slug: 'spartak-moscow', engine: 'Spartak Moscow', zone: null, espn: 1941, tm: ['spartak-moskau', 232], fotmob: [8643, 'spartak-moscow'] },
  { slug: 'cska-moscow', engine: 'CSKA Moscow', zone: null, espn: 1963, tm: ['zska-moskau', 2410], fotmob: [9760, 'cska-moscow'] },
  { slug: 'lokomotiv-moscow', engine: 'Lokomotiv Moscow', zone: null, espn: 442, tm: ['lokomotiv-moskau', 932], fotmob: [8710, 'lokomotiv-moscow'] },
  { slug: 'rubin-kazan', engine: 'Rubin Kazan', zone: null, espn: 3851, tm: ['rubin-kazan', 2698], fotmob: [8683, 'rubin-kazan'] },
  { slug: 'dynamo-moscow', engine: 'Dynamo Moscow', zone: null, espn: 596, tm: ['dinamo-moskau', 121], fotmob: [9763, 'dinamo-moscow'] },
  { slug: 'rostov', engine: 'Rostov', zone: null, espn: 3852, tm: ['fk-rostov', 1083], fotmob: [8705, 'fc-rostov'] },
  { slug: 'akhmat-grozny', engine: 'Akhmat Grozny', zone: null, espn: 2991, tm: ['akhmat-grozny', 3725], fotmob: [8708, 'fk-akhmat'] },
  { slug: 'krylia-sovetov', engine: 'Krylia Sovetov', zone: null, espn: 3850, tm: ['krylya-sovetov-samara', 2696], fotmob: [8709, 'krylya-sovetov-samara'] },
  { slug: 'baltika', engine: 'Baltika', zone: null, espn: 21949, tm: ['baltika-kaliningrad', 2741], fotmob: [49694, 'baltika'] },
  { slug: 'orenburg', engine: 'Orenburg', zone: null, espn: 18285, tm: ['fk-orenburg', 14589], fotmob: [132286, 'fc-orenburg'] },
  { slug: 'akron-tolyatti', engine: 'Akron Tolyatti', zone: null, espn: 22271, tm: ['akron-togliatti', 71985], fotmob: [1068364, 'akron-togliatti'] },
  { slug: 'dynamo-makhachkala', engine: 'Dynamo Makhachkala', zone: null, espn: 22300, tm: ['fk-makhachkala', 75231], fotmob: [1068353, 'dynamo-makhachkala'] },
  { slug: 'rodina-moscow', engine: 'Rodina Moscow', zone: null, espn: 21927, tm: ['rodina-moskau', 59024], fotmob: [1066681, 'rodina'] },
  { slug: 'fakel-voronezh', engine: 'Fakel Voronezh', zone: null, espn: 21539, tm: ['fakel-voronezh', 1124], fotmob: [1692, 'fakel'] },
];

/* ESPN's spelling to Transfermarkt's, the same nation (also added to the alias table in scripts/lib). */
export const NAT_ALIAS_EXTRA = { 'Cape Verde Islands': 'Cape Verde' };
