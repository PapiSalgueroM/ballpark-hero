/* Round 1013: Soccer Career's extra clubs come from Club Manager, never from a
   second hand typed list. Club Manager owns the membership, the strength and
   the colour of four leagues (premier, championship, laliga, brasileirao), and
   this file turns them into Soccer Career rows. scripts/genCareerClubPool.mjs
   writes the result to src/data/soccerCareerClubPool.ts and
   scripts/simCareerClubPool.mjs re-derives it to prove the file is fresh.

   deriveCareerClubPool is pure: everything it reads is passed in. The bundle
   helper below it is the only part that touches esbuild or the disk. */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* Byte identical to the labels FALLBACK_CLUBS already uses. league is free
   text, and a near miss silently makes a new league (Round 302). */
export const LEAGUE_LABELS = { premier: 'Premier League', championship: 'Championship', laliga: 'La Liga', brasileirao: 'Brasileirao' };
export const POOL_LEAGUES = Object.keys(LEAGUE_LABELS);
export const LEAGUE_COUNTRY = { premier: 'England', championship: 'England', laliga: 'Spain', brasileirao: 'Brazil' };
const TOP_FLIGHTS = new Set(['premier', 'laliga', 'brasileirao']);
/* Welsh clubs in the English pyramid (goal.com and footballgroundguide.com,
   read 2026-10-05). Wales is already a Soccer Career nationality with a flag. */
export const WELSH_CLUBS = new Set(['Cardiff City', 'Swansea City', 'Wrexham']);
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
};

export const slugOf = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
export function deriveCareerClubPool({ realLeagues, xiOf, colorOf, partial, handClubs, fold }) {
  const handByName = new Map(handClubs.map(c => [c.name, c]));
  const partialSet = new Set(partial);
  const rows = [];
  const table = [];
  for (const id of POOL_LEAGUES) {
    const league = realLeagues.find(l => l.id === id);
    if (!league) throw new Error(`Club Manager has no league ${id}`);
    const mapped = league.clubs.map(cm => ({ cm, name: NAME_ALIASES[cm] ?? fold(cm), xi: xiOf(cm) }));
    const handInLeague = mapped.filter(m => handByName.has(m.name)).map(m => ({ ...m, tier: handByName.get(m.name).tier }));
    for (const m of mapped) {
      const hand = handByName.get(m.name);
      if (hand) { table.push({ league: id, name: m.name, xi: m.xi, tier: hand.tier, hand: true }); continue; }
      let tier;
      if (!TOP_FLIGHTS.has(id) || partialSet.has(m.cm)) tier = 4;
      else {
        const stronger = handInLeague.filter(h => h.xi >= m.xi);
        if (stronger.length) tier = Math.max(...stronger.map(h => h.tier));
        else tier = handInLeague.length ? Math.min(...handInLeague.map(h => h.tier)) : 4;
      }
      const country = WELSH_CLUBS.has(m.name) ? 'Wales' : LEAGUE_COUNTRY[id];
      rows.push({ id: `cm-${slugOf(m.name)}`, name: m.name, country, tier, color: colorOf(m.cm), league: LEAGUE_LABELS[id] });
      table.push({ league: id, name: m.name, xi: m.xi, tier, hand: false, partial: partialSet.has(m.cm) });
    }
  }
  return { rows, table };
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
          b.onLoad({ filter: /.*/, namespace: 'stubpool' }, () => ({ contents: 'export const CAREER_CLUB_POOL = [];', loader: 'js' }));
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
    handClubs: mod.engine.HAND_CLUBS,
    fold: s => mod.foldSpecialLatin(s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')),
  };
}

/* The generated file, byte for byte. The harness renders it again and compares. */
export function renderPoolFile(rows, meta) {
  const lines = rows.map(r => `  { id: ${JSON.stringify(r.id)}, name: ${JSON.stringify(r.name)}, country: ${JSON.stringify(r.country)}, tier: ${r.tier}, color: ${JSON.stringify(r.color)}, league: ${JSON.stringify(r.league)} },`);
  return [
    '/* GENERATED by scripts/genCareerClubPool.mjs. DO NOT EDIT BY HAND.',
    '   Regenerate: node scripts/genCareerClubPool.mjs',
    `   Source: Club Manager's REAL_LEAGUES (premier, championship, laliga 2026-27;`,
    `   brasileirao Serie A 2026), rosters baked ${meta.generated}.`,
    '   The file has no imports on purpose, so the Soccer Career page never pulls',
    '   Club Manager into its bundle. */',
    'export interface CareerPoolClub { id: string; name: string; country: string; tier: number; color: string; league: string }',
    '',
    'export const CAREER_CLUB_POOL: CareerPoolClub[] = [',
    ...lines,
    '];',
    '',
  ].join('\n');
}
