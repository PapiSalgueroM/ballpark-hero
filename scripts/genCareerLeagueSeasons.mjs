/* Round 1037: who was in each league, season by season, for Soccer Career.

   Reads the six Round 1036 ledgers in scripts/data/leagueSeasons/ (Premier
   League, Championship, La Liga, Serie A, Bundesliga, Ligue 1, 1990-91 to
   2025-26, each season read from two independent non-wiki sources) and writes
   src/data/careerLeagueSeasons.ts. The ledgers are the source of truth and
   are never edited to make code pass; this file is never typed by hand.

   Per league (keyed by the label the career's club list uses), per season
   start year: the name the league carried that season (First Division,
   Second Division, Division 1 and so on, from the ledger's tierNames), the
   verified number of clubs, and the career's canon names of the clubs that
   were in it. A club the career world does not know (canon null) is counted
   in the size and never named. Only seasons marked verified: true are
   written; a season missing from the file is unknown, and the game claims
   nothing about it.

   Fails, writing nothing, when a ledger disagrees with itself: a season whose
   club count is not its size, a club named twice, a start year that is not
   the season's, a season outside every tierNames span, or a per season tier
   name that disagrees with the span (La Liga is the one ledger whose per
   season tier is the competition's official name, "Primera Division", and
   says so in its tierNote; its span carries the career's label).

   Run: node scripts/genCareerLeagueSeasons.mjs          (writes the file)
        node scripts/genCareerLeagueSeasons.mjs --check  (exit 1 if stale)
   No network, no database. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_DIR = path.join(ROOT, 'scripts', 'data', 'leagueSeasons');
export const OUT = path.join(ROOT, 'src', 'data', 'careerLeagueSeasons.ts');

/* Ledger file to the league label the career's club list uses. */
export const LEDGERS = [
  ['premier-league.json', 'Premier League'],
  ['championship.json', 'Championship'],
  ['la-liga.json', 'La Liga'],
  ['serie-a.json', 'Serie A'],
  ['bundesliga.json', 'Bundesliga'],
  ['ligue-1.json', 'Ligue 1'],
];

/* The identity a club is matched by when the career world does not know it
   (a Club Manager job at Lazio or Gladbach): accents folded, lowercase,
   "&" read as "and", split on anything that is not a letter or digit, and
   the club form words and founding numbers dropped ("1. FC Koln" and "Koln"
   meet, "SC Paderborn 07" and "Paderborn" meet). It never decides a name to
   print, only whether a manager's own club was a member; buildSeasons
   refuses a season where two members share one. The same function lives in
   src/lib/soccerCareerLeague.ts (identityKey) and simCareerLeagueSeasons
   holds the two together. */
export const IDENTITY_STOP = ['fc', 'sc', 'ac', 'as', 'ss', 'us', 'sv', 'afc', 'cf', 'cfc', 'vfl', 'vfb', 'tsg', 'fsv', 'spvgg', 'calcio', 'sco', 'rc', 'ogc', 'aj', 'sd', 'ud', 'cd', 'rcd', 'ca', 'bsc'];
const STOP = new Set(IDENTITY_STOP);
export function identityKey(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w)).join(' ');
}

export function readLedgers(dir = LEDGER_DIR) {
  return LEDGERS.map(([file, label]) => ({ file, label, ledger: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) }));
}

/** The table the generated file holds, from the parsed ledgers. Throws on a
 *  ledger that disagrees with itself. */
export function buildSeasons(ledgers) {
  const out = {};
  const problems = [];
  const seen = {};
  for (const { file, label, ledger } of ledgers) {
    const spans = ledger.tierNames || [];
    const byYear = {};
    for (const s of ledger.seasons) {
      if (s.verified !== true) continue;
      const where = `${file} ${s.season}`;
      if (Number(String(s.season).slice(0, 4)) !== s.startYear) problems.push(`${where}: start year ${s.startYear}`);
      const span = spans.find(t => s.season >= t.from && s.season <= t.to);
      if (!span) { problems.push(`${where}: in no tierNames span`); continue; }
      const own = s.tierName ?? (ledger.tierNote ? undefined : s.tier);
      if (own !== undefined && own !== span.name) problems.push(`${where}: tier "${own}" but the span says "${span.name}"`);
      if (!Number.isInteger(s.size) || s.clubs.length !== s.size) problems.push(`${where}: ${s.clubs.length} clubs for size ${s.size}`);
      const known = c => typeof c.canon === 'string' && c.canon.length > 0;
      const canon = s.clubs.filter(known).map(c => c.canon);
      if (new Set(canon).size !== canon.length) problems.push(`${where}: a canon club twice`);
      const others = s.clubs.filter(c => !known(c)).map(c => [...new Set(c.printed.map(identityKey).filter(Boolean))].join('|'));
      if (others.some(o => !o)) problems.push(`${where}: an unnamed club with no printed name`);
      if (byYear[s.startYear]) problems.push(`${where}: start year twice`);
      byYear[s.startYear] = { name: span.name, size: s.size, clubs: canon, others };
      /* every identity in the season, across all six leagues, belongs to one member */
      const owners = (seen[s.startYear] ??= new Map());
      s.clubs.forEach((c, i) => {
        const ids = new Set([...c.printed, ...(known(c) ? [c.canon] : [])].map(identityKey).filter(Boolean));
        for (const id of ids) {
          const who = `${label}#${i}`;
          if (owners.has(id) && owners.get(id) !== who) problems.push(`${where}: "${id}" names two clubs`);
          owners.set(id, who);
        }
      });
    }
    out[label] = byYear;
  }
  if (problems.length) throw new Error(`ledgers disagree with themselves:\n  ${problems.join('\n  ')}`);
  return out;
}

export function render(seasons) {
  const lines = [];
  lines.push('/* DO NOT EDIT. Generated by scripts/genCareerLeagueSeasons.mjs from the');
  lines.push('   Round 1036 ledgers in scripts/data/leagueSeasons/ (two independent');
  lines.push('   non-wiki sources a season). Rerun the generator after any ledger change;');
  lines.push('   scripts/simCareerLeagueSeasons.mjs fails while this file is stale.');
  lines.push('');
  lines.push('   Per league (the career list\'s label), per season start year: the name');
  lines.push('   the league carried that season, its verified number of clubs, and the');
  lines.push('   career\'s names for the clubs in it that the career world knows. The');
  lines.push('   rest are counted in the size and never named: `others` holds one entry');
  lines.push('   for each of them, the identity keys of the ways the sources spelled it');
  lines.push('   joined by "|", read only to tell whether a manager\'s own club was in the');
  lines.push('   league that season. A season not listed is unknown. */');
  lines.push('export interface CareerLeagueSeason { name: string; size: number; clubs: readonly string[]; others: readonly string[] }');
  lines.push('');
  lines.push('export const CAREER_LEAGUE_SEASONS: Readonly<Record<string, Readonly<Record<number, CareerLeagueSeason>>>> = {');
  for (const [label, byYear] of Object.entries(seasons)) {
    lines.push(`  ${JSON.stringify(label)}: {`);
    for (const year of Object.keys(byYear).map(Number).sort((a, b) => a - b)) {
      const s = byYear[year];
      const list = a => `[${a.map(c => JSON.stringify(c)).join(', ')}]`;
      lines.push(`    ${year}: { name: ${JSON.stringify(s.name)}, size: ${s.size}, clubs: ${list(s.clubs)}, others: ${list(s.others)} },`);
    }
    lines.push('  },');
  }
  lines.push('};');
  return lines.join('\n') + '\n';
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const text = render(buildSeasons(readLedgers()));
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (now !== text) { console.error('src/data/careerLeagueSeasons.ts is stale: run node scripts/genCareerLeagueSeasons.mjs'); process.exit(1); }
    console.log('careerLeagueSeasons.ts is current');
  } else {
    fs.writeFileSync(OUT, text);
    const counts = Object.entries(buildSeasons(readLedgers())).map(([l, y]) => `${l} ${Object.keys(y).length}`).join(', ');
    console.log(`wrote ${path.relative(ROOT, OUT)}: ${counts}`);
  }
}
