/* Round 1013: Soccer Career's extra clubs come from Club Manager, never from a
   second hand typed list. Club Manager owns the membership, the strength and
   the colour of its leagues (four of them in Round 1013, every current one
   since Round 1100: POOL_LEAGUE_ROWS below), and this file turns them into
   Soccer Career rows. scripts/genCareerClubPool.mjs
   writes the result to src/data/soccerCareerClubPool.ts and
   scripts/simCareerClubPool.mjs re-derives it to prove the file is fresh.

   deriveCareerClubPool is pure: everything it reads is passed in. The bundle
   helper below it is the only part that touches esbuild or the disk. */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* Round 1100: ONE table of the Club Manager leagues the pool reads, every
   current league Club Manager carries. A new league is one row here plus its
   leagueWorld row in scripts/data/soccerCareerFacts.json, and no other code
   (simCareerClubPool derives a two league fixture to prove it, and fails on
   a Club Manager league that has no row).

   label is byte identical to the label FALLBACK_CLUBS already uses for the
   league's hand clubs: league is free text, and a near miss silently makes a
   new league (Round 302). Two ids may share a label (MLS): their clubs are
   gathered first and the tier rule runs once over the label. top: false is a
   second flight, where every generated club takes tier 4.

   Order matters and is append only: the four leagues Round 1013 read come
   first, in that round's order, so the 51 rows main shipped stay the first
   51 rows of the generated file; the rest follow in REAL_LEAGUES order. */
export const POOL_LEAGUE_ROWS = [
  { id: 'premier', label: 'Premier League', country: 'England', top: true },
  { id: 'championship', label: 'Championship', country: 'England', top: false },
  { id: 'laliga', label: 'La Liga', country: 'Spain', top: true },
  { id: 'brasileirao', label: 'Brasileirao', country: 'Brazil', top: true },
  { id: 'seriea', label: 'Serie A', country: 'Italy', top: true },
  { id: 'bundesliga', label: 'Bundesliga', country: 'Germany', top: true },
  { id: 'ligue1', label: 'Ligue 1', country: 'France', top: true },
  { id: 'eredivisie', label: 'Eredivisie', country: 'Netherlands', top: true },
  { id: 'saudi', label: 'Saudi Pro League', country: 'Saudi Arabia', top: true },
  { id: 'mlsEast', label: 'MLS', country: 'USA', top: true },
  { id: 'mlsWest', label: 'MLS', country: 'USA', top: true },
  { id: 'primeira', label: 'Primeira Liga', country: 'Portugal', top: true },
  { id: 'scottish', label: 'Scottish Premiership', country: 'Scotland', top: true },
  { id: 'superlig', label: 'Super Lig', country: 'Turkey', top: true },
  { id: 'bundesliga2', label: '2. Bundesliga', country: 'Germany', top: false },
  { id: 'proleague', label: 'Belgian Pro League', country: 'Belgium', top: true },
  { id: 'austria', label: 'Austrian Bundesliga', country: 'Austria', top: true },
  { id: 'greece', label: 'Super League Greece', country: 'Greece', top: true },
  { id: 'denmark', label: 'Danish Superliga', country: 'Denmark', top: true },
  { id: 'switzerland', label: 'Swiss Super League', country: 'Switzerland', top: true },
  { id: 'croatia', label: 'HNL', country: 'Croatia', top: true },
  { id: 'ligamx', label: 'Liga MX', country: 'Mexico', top: true },
  { id: 'aleague', label: 'A-League', country: 'Australia', top: true },
  { id: 'serieb', label: 'Serie B', country: 'Italy', top: false },
  { id: 'ligue2', label: 'Ligue 2', country: 'France', top: false },
  { id: 'segunda', label: 'Segunda Division', country: 'Spain', top: false },
  /* Release AO: Round 1052 gave Club Manager the Russian Premier League on a
     branch that never saw this table, and simCareerClubPool section 2 went
     red on the merged tree, as it is built to. The league is named here and
     held below. The label is the one the hand club Zenit already carries. */
  { id: 'russia', label: 'Russian Premier League', country: 'Russia', top: true },
];
/* Leagues the table names but the pool does not read yet, each with its
   reason. None of their clubs is generated and none gets a ladder. */
export const HELD_LEAGUES = {
  serieb: '11 clubs without a verified colour, and its format read from one source so far',
  ligue2: '9 clubs without a verified colour, and its format read from one source so far',
  segunda: '10 clubs without a verified colour, and its format read from one source so far',
  /* Round 1052 read one host for each club's colour and shipped none, so
     Club Manager draws all sixteen in the neutral grey the generator
     refuses. A Soccer Career manager can still be offered a job there: the
     dugout's size is Round 1052's row in DUGOUT_SIZES. */
  russia: '16 clubs without a verified colour (Round 1052 read one host for each), and no page read yet for its points rule',
};
/* The three names Round 1013 exported, derived from the table now. */
export const LEAGUE_LABELS = Object.fromEntries(POOL_LEAGUE_ROWS.map(r => [r.id, r.label]));
export const POOL_LEAGUES = POOL_LEAGUE_ROWS.filter(r => !HELD_LEAGUES[r.id]).map(r => r.id);
export const LEAGUE_COUNTRY = Object.fromEntries(POOL_LEAGUE_ROWS.map(r => [r.id, r.country]));
/* A club whose country is not its league's, by career name. The Welsh clubs
   in the English pyramid shipped with Round 1013 (goal.com and
   footballgroundguide.com, read 2026-10-05; Wales is a Soccer Career
   nationality with a flag). CF Montreal and Vaduz: two sources each in
   soccerCareerFacts.json clubCountries. FC Andorra, of the held Segunda
   Division, needs its own row there before that league is released. Club
   Manager's own clubCountry rows (LEAGUE_RULES) are read too and win. */
export const CLUB_COUNTRY = {
  'Cardiff City': 'Wales', 'Swansea City': 'Wales', 'Wrexham': 'Wales',
  'CF Montreal': 'Canada', 'Vaduz': 'Liechtenstein',
};
export const WELSH_CLUBS = new Set(Object.keys(CLUB_COUNTRY).filter(n => CLUB_COUNTRY[n] === 'Wales'));
/* Club Manager answers its fallback grey for a club it has no colour for.
   The generator refuses a grey row; this ledger supplies the colour instead,
   by Club Manager name, ONLY where Club Manager is grey, and each hex is the
   rendering of a colour in words that soccerCareerFacts.json clubColours
   holds from two sources. The list may only shrink. */
export const FALLBACK_GREY = '#8899aa';
export const POOL_COLORS = { 'Macarthur FC': '#1A1A1A' };
/* Club Manager name to Soccer Career name, applied before the ASCII fold.
   The two careerEras strings ("Deportivo", "Atletico Mineiro") must match
   byte for byte: the world feed only refuses to crown the player's own club
   when the strings are equal. */
export const NAME_ALIASES = {
  'Manchester City': 'Man City',
  'Manchester United': 'Man United',
  'Athletic Club': 'Athletic Bilbao',
  'Atlético Madrid': 'Atletico Madrid',
  'São Paulo': 'Sao Paulo',
  'Grêmio': 'Gremio',
  'Deportivo La Coruña': 'Deportivo',
  'Atlético Mineiro': 'Atletico Mineiro',
  /* Round 1100. Fourteen hand clubs Club Manager spells another way, which
     would otherwise be generated a second time under its spelling. */
  'Borussia Dortmund': 'Dortmund', 'RB Leipzig': 'Leipzig', 'Bayer Leverkusen': 'Leverkusen', 'Eintracht Frankfurt': 'Frankfurt',
  'Hertha BSC': 'Hertha Berlin', 'RB Salzburg': 'Red Bull Salzburg',
  'América': 'Club America', 'Guadalajara': 'Chivas', 'Pumas UNAM': 'Pumas',
  'Al-Hilal': 'Al Hilal', 'Al-Nassr': 'Al Nassr', 'Al-Ittihad': 'Al Ittihad', 'Al-Ahli': 'Al Ahli', 'Al-Shabab': 'Al Shabab',
  /* The eleven other Saudi clubs, in the hand rows' style. */
  'Al-Diriyah': 'Al Diriyah', 'Al-Ettifaq': 'Al Ettifaq', 'Al-Faisaly': 'Al Faisaly', 'Al-Fateh': 'Al Fateh', 'Al-Fayha': 'Al Fayha',
  'Al-Hazem': 'Al Hazem', 'Al-Khaleej': 'Al Khaleej', 'Al-Kholood': 'Al Kholood', 'Al-Qadsiah': 'Al Qadsiah', 'Al-Riyadh': 'Al Riyadh',
  'Al-Taawoun': 'Al Taawoun',
  /* Club Manager's Nacional is the Madeira club; hand row fb-152 "Nacional"
     is the Uruguayan one. ESPN's 2026-27 Primeira Liga table prints
     "C.D. Nacional" (BBC Sport prints "Nacional"). */
  'Nacional': 'CD Nacional',
  /* careerEras spells the club without the full stops, and the world feed
     only refuses to crown the player's own club when the strings are equal. */
  'D.C. United': 'DC United',
};

/* plain code unit order, the same on every machine */
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const slugOf =name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* One row per Club Manager club that Soccer Career does not already carry.
   realLeagues: Club Manager's REAL_LEAGUES. xiOf(cmName): the club's XI
   (bakedXIAvg, then STRENGTH_PRIORS, then 65, exactly as Club Manager ranks
   it). colorOf(cmName): clubDefFor(cmName).color. partial: CM_PARTIAL.
   handClubs: Soccer Career's HAND_CLUBS. fold: accent stripper.

   Tier rule. Hand tiers are stature calls every existing band rests on, so
   they never change. A new top flight club takes the worst (highest number)
   tier among the hand clubs Club Manager lists in the same league that it
   rates at least as strong. With none that strong it takes the league's best
   hand tier, or 4 if the league has no hand club. A thin (CM_PARTIAL) club
   takes 4, and every Championship club takes 4, Soccer Career's own "lower
   league" tier, where Norwich City already sits. */
/* Round 1100 adds to the inputs, all optional so a Round 1013 call derives
   what it always did: leagueRows and held (the table above), rankable(cmName)
   (true when the club's XI is a full baked one: not CM_PARTIAL and not a
   prior or the 65 default), cmCountryOf(id, cmName) (Club Manager's own
   clubCountry row), and since (soccerCareerFacts.json clubSince). rankable
   fails closed: a caller that leaves it out ranks nobody, so every tier of
   its ladder is one shared group (the default once ranked everybody, thin
   squads by their padded eleven; simCareerClubPool sections 2 and 4L).

   It also returns two ledgers the generated file carries.
   ladder: for every label read, the whole league as the career knows it
   (hand clubs under their career names) as an ordered list of GROUPS. The
   order is the game's own tier first, then Club Manager's XI, strongest
   first, then the name. A group is one club where the game can place it,
   and several where it cannot tell them apart: the clubs of one tier whose
   XI is not a full baked one (a thin squad's XI mostly counts how many of
   its players the dataset holds) sit together after that tier's ranked
   clubs, in name order, and that order means nothing.
   poolSince: generated club to the first season the game offers it, for
   every club whose decision is "held" (the facts file's heldBefore) or a
   first season after 1990. A club with no decision is an error. */
export function deriveCareerClubPool({ realLeagues, xiOf, colorOf, partial, handClubs, fold, leagueRows = POOL_LEAGUE_ROWS, held = HELD_LEAGUES, rankable = () => false, cmCountryOf = () => undefined, since = null }) {
  const handByName = new Map(handClubs.map(c => [c.name, c]));
  const partialSet = new Set(partial);
  const rows = [];
  const table = [];
  const ladder = {};
  const poolSince = {};
  const grey = [];
  const undecided = [];
  const labels = [...new Set(leagueRows.filter(r => !held[r.id]).map(r => r.label))];
  for (const label of labels) {
    const ids = leagueRows.filter(r => r.label === label && !held[r.id]);
    const top = ids[0].top;
    if (ids.some(r => r.top !== top)) throw new Error(`${label}: its Club Manager leagues disagree on being a top flight`);
    const mapped = [];
    for (const row of ids) {
      const league = realLeagues.find(l => l.id === row.id);
      if (!league) throw new Error(`Club Manager has no league ${row.id}`);
      for (const cm of league.clubs) mapped.push({ cm, id: row.id, country: row.country, name: NAME_ALIASES[cm] ?? fold(cm), xi: xiOf(cm) });
    }
    /* a hand club is this league's only under this label: the same name in
       another league is another club, and an alias must tell them apart */
    for (const m of mapped) {
      const hand = handByName.get(m.name);
      if (hand && hand.league !== label) throw new Error(`${m.cm} (${label}) would be taken for the hand club ${hand.name} of ${hand.league}: give it a NAME_ALIASES row`);
    }
    const handInLeague = mapped.filter(m => handByName.has(m.name)).map(m => ({ ...m, tier: handByName.get(m.name).tier }));
    const members = [];
    for (const m of mapped) {
      const hand = handByName.get(m.name);
      if (hand) {
        table.push({ league: m.id, name: m.name, xi: m.xi, tier: hand.tier, hand: true });
        members.push({ name: m.name, tier: hand.tier, xi: m.xi, ranked: rankable(m.cm) });
        continue;
      }
      let tier;
      if (!top || partialSet.has(m.cm)) tier = 4;
      else {
        const stronger = handInLeague.filter(h => h.xi >= m.xi);
        if (stronger.length) tier = Math.max(...stronger.map(h => h.tier));
        else tier = handInLeague.length ? Math.min(...handInLeague.map(h => h.tier)) : 4;
      }
      const country = cmCountryOf(m.id, m.cm) ?? CLUB_COUNTRY[m.name] ?? m.country;
      let color = colorOf(m.cm);
      if (color.toLowerCase() === FALLBACK_GREY) { color = POOL_COLORS[m.cm]; if (!color) grey.push(`${m.cm} (${label})`); }
      rows.push({ id: `cm-${slugOf(m.name)}`, name: m.name, country, tier, color, league: label });
      table.push({ league: m.id, name: m.name, xi: m.xi, tier, hand: false, partial: partialSet.has(m.cm) });
      members.push({ name: m.name, tier, xi: m.xi, ranked: rankable(m.cm) });
      if (since) {
        if (since.shipped.has(m.name)) { /* in every era, as Round 1013 shipped it */ }
        else if (since.held.has(m.name)) poolSince[m.name] = since.heldBefore;
        else if (since.years.has(m.name)) { if (since.years.get(m.name) > 1990) poolSince[m.name] = since.years.get(m.name); }
        else undecided.push(`${m.name} (${label})`);
      }
    }
    const groups = [];
    for (const tier of [...new Set(members.map(m => m.tier))].sort((a, b) => a - b)) {
      const inTier = members.filter(m => m.tier === tier);
      for (const m of inTier.filter(x => x.ranked).sort((a, b) => b.xi - a.xi || byName(a.name, b.name))) groups.push([m.name]);
      const rest = inTier.filter(x => !x.ranked).map(x => x.name).sort(byName);
      if (rest.length) groups.push(rest);
    }
    ladder[label] = groups;
  }
  if (grey.length) throw new Error(`no colour for ${grey.join(', ')}: Club Manager answers its fallback grey; hold the league or give each a POOL_COLORS row backed by soccerCareerFacts.json clubColours`);
  if (undecided.length) throw new Error(`no clubSince decision in soccerCareerFacts.json for ${undecided.join(', ')}`);
  return { rows, table, ladder, poolSince };
}

/* soccerCareerFacts.json clubSince as the derive reads it. */
export function sinceInput(root) {
  const s = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'data', 'soccerCareerFacts.json'), 'utf8')).clubSince;
  return { heldBefore: s.heldBefore, shipped: new Set(s.shipped), held: new Set(Object.values(s.held).flat()), years: new Map(Object.entries(s.since).map(([n, v]) => [n, v.year])) };
}

/* Bundles Club Manager, the Soccer Career engine and careerEras from root
   into tmpDir and imports the result. transforms maps a path under src (for
   example 'lib/soccerCareerEngine.ts') to a function that rewrites that
   file's source in memory, so a control never edits a file in the tree.
   stubPool resolves the generated pool to an empty module: the generator and
   the freshness check need only HAND_CLUBS, so they can start from nothing
   (no generated file, or a broken one). STRENGTH_PRIORS is private in
   clubManager.ts and is exported in memory here, the same way
   simCmLeagueRules exposes its private helpers. */
let bundleSeq = 0;
export async function bundleCareerSources({ root, tmpDir, stubPool = false, transforms = {}, extra = {} }) {
  /* extra (Round 1100): more entry modules, name to path under src, each
     exported as a namespace beside the six below, so a harness that needs the
     league, format or season modules shares this one bundle helper. */
  bundleSeq += 1;
  const fwd = root.replaceAll('\\', '/');
  const entry = path.join(tmpDir, `pool-entry${bundleSeq}.mjs`);
  const out = path.join(tmpDir, `pool-bundle${bundleSeq}.mjs`);
  fs.writeFileSync(entry, [
    `export * as cm from '${fwd}/src/lib/clubManager.ts';`,
    `export { CM_PARTIAL, CM_ROSTER_META } from '${fwd}/src/data/clubManagerRosters.ts';`,
    `export * as engine from '${fwd}/src/lib/soccerCareerEngine.ts';`,
    `export * as eras from '${fwd}/src/lib/careerEras.ts';`,
    `export * as save from '${fwd}/src/lib/soccerCareerSave.ts';`,
    `export { foldSpecialLatin } from '${fwd}/src/lib/nameFold.ts';`,
    ...Object.entries(extra).map(([name, rel]) => `export * as ${name} from '${fwd}/src/${rel}';`),
  ].join('\n'));
  const srcDir = path.resolve(root, 'src');
  const allTransforms = {
    'lib/clubManager.ts': s => {
      if (!/\nconst STRENGTH_PRIORS: /.test(s)) throw new Error('clubManager.ts has no STRENGTH_PRIORS to expose');
      return `${s}\nexport { STRENGTH_PRIORS as __STRENGTH_PRIORS };\n`;
    },
  };
  for (const [k, f] of Object.entries(transforms)) {
    const before = allTransforms[k];
    allTransforms[k] = before ? s => f(before(s)) : f;
  }
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${fwd}/src` }, logLevel: 'error',
    plugins: [{
      name: 'career-pool',
      setup(b) {
        if (stubPool) {
          b.onResolve({ filter: /soccerCareerClubPool(\.ts)?$/ }, () => ({ path: 'stub', namespace: 'stubpool' }));
          b.onLoad({ filter: /.*/, namespace: 'stubpool' }, () => ({ contents: 'export const CAREER_CLUB_POOL = []; export const CAREER_LEAGUE_LADDER = {}; export const CAREER_POOL_SINCE = {};', loader: 'js' }));
        }
        b.onLoad({ filter: /\.tsx?$/ }, args => {
          const rel = path.relative(srcDir, args.path).replaceAll('\\', '/');
          const f = allTransforms[rel];
          if (!f) return undefined;
          const src = fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
          return { contents: f(src), loader: args.path.endsWith('x') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

/* The derive inputs, read off one bundle. */
export function poolInputs(mod) {
  const priors = mod.cm.__STRENGTH_PRIORS;
  return {
    realLeagues: mod.cm.REAL_LEAGUES,
    xiOf: name => mod.cm.bakedXIAvg(name) ?? priors[name] ?? 65,
    colorOf: name => mod.cm.clubDefFor(name).color,
    partial: mod.CM_PARTIAL,
    /* a full baked XI: not a thin squad, not a prior and not the 65 default */
    rankable: name => mod.cm.bakedXIAvg(name) != null && !mod.CM_PARTIAL.includes(name),
    cmCountryOf: (id, name) => mod.cm.LEAGUE_RULES?.[id]?.clubCountry?.[name],
    handClubs: mod.engine.HAND_CLUBS,
    fold: s => mod.foldSpecialLatin(s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
  };
}

/* The generated file, byte for byte. The harness renders it again and compares. */
export function renderPoolFile(rows, meta, ladder = {}, poolSince = {}, leagueRows = POOL_LEAGUE_ROWS, held = HELD_LEAGUES) {
  const lines = rows.map(r => `  { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, country: ${JSON.stringify(r.country)}, tier: ${r.tier}, color: ${JSON.stringify(r.color)}, league: ${JSON.stringify(r.league)} },`);
  const read = leagueRows.filter(r => !held[r.id]).map(r => r.id);
  const wrap = (words, width) => {
    const out = [];
    let line = '';
    for (const w of words) { if (line && line.length + w.length + 1 > width) { out.push(line); line = w; } else line = line ? `${line} ${w}` : w; }
    if (line) out.push(line);
    return out;
  };
  const sinceYears = [...new Set(Object.values(poolSince))].sort((a, b) => a - b);
  return [
    '/* GENERATED by scripts/genCareerClubPool.mjs. DO NOT EDIT BY HAND.',
    '   Regenerate: node scripts/genCareerClubPool.mjs',
    `   Source: Club Manager's REAL_LEAGUES, the 2026-27 season (the calendar`,
    '   year 2026 for brasileirao and the two mls rows):',
    ...wrap(read.map((id, i) => `${id}${i < read.length - 1 ? ',' : '.'}`), 70).map(l => `   ${l}`),
    `   Rosters baked ${meta.generated}.`,
    '   The file has no imports on purpose, so the Soccer Career page never pulls',
    '   Club Manager into its bundle. */',
    'export interface CareerPoolClub { id: string; name: string; country: string; tier: number; color: string; league: string }',
    '',
    'export const CAREER_CLUB_POOL: CareerPoolClub[] = [',
    ...lines,
    '];',
    '',
    '/** Every generated league as the career knows it (hand clubs included),',
    " *  strongest first: the game's own tier, then Club Manager's XI, then the",
    ' *  name. Each entry is a GROUP: one club where the game can place it, and',
    ' *  several where it cannot tell them apart (clubs of one tier whose squad',
    ' *  Club Manager holds too thinly to rank). A group of several is in name',
    ' *  order and that order means nothing. 2026-27 only. */',
    'export const CAREER_LEAGUE_LADDER: Record<string, string[][]> = {',
    ...Object.entries(ladder).map(([label, groups]) => `  ${JSON.stringify(label)}: [${groups.map(g => `[${g.map(n => JSON.stringify(n)).join(', ')}]`).join(', ')}],`),
    '};',
    '',
    '/** The first season (start year) the game offers a generated club, for the',
    ' *  clubs it does not offer in every era. A club this file brought in as a',
    ' *  2026-27 club is held out of earlier seasons until its first season is',
    ' *  two sourced (scripts/data/soccerCareerFacts.json clubSince). Never a',
    ' *  founding date. */',
    `export const CAREER_POOL_SINCE: Record<string, number> = ${Object.keys(poolSince).length ? '{' : '{};'}`,
    ...sinceYears.flatMap(y => wrap(Object.keys(poolSince).filter(n => poolSince[n] === y).map(n => `${JSON.stringify(n)}: ${y},`), 116).map(l => `  ${l}`)),
    ...(Object.keys(poolSince).length ? ['};'] : []),
    '',
  ].join('\n');
}
