/* Which round every NFL draft pick from 1968 to 2025 fell in, on two sources.

   Round 705. nfl_grid_players copied its draft round from nfl_draft_picks,
   whose scrape files an unparsed round as 1: the 1968 and 1969 drafts carry
   round 1 on all 904 picks, and 1970 to 1982 lose their late rounds to round
   1 as well (1972 files picks 209 to 442 as round 1). So the NFL grid counted
   hundreds of ninth to seventeenth round picks as first rounders. The round
   of a pick is a fact about the draft, not about the player, so this file
   records it per draft: for each year, the first and last overall pick of
   every round.

   SOURCES, TWO FOR EVERY YEAR, COMPARED PICK BY PICK:
     1980 to 2025  nflverse draft_picks (the documented nflverse release
                   "draft_picks", built from Pro Football Reference), checked
                   against drafthistory.com's page for the year.
     1968 to 1979  drafthistory.com's page for the year, checked against
                   footballdb.com's round pages for the year (nflverse's file
                   starts in 1980 and Pro Football Reference answers scripts
                   with a bot check).
   A round's bounds ship only when both sources put the same overall picks in
   it. A year where they disagree on any pick ships no bounds at all, and the
   disagreement is printed; nothing is settled by picking a side.

   Fetched pages are cached in scripts/.cache/draftRounds/ (gitignored), so a
   rerun reads the same bytes and needs no network.

   Output: scripts/data/nflDraftRounds.json, read by scripts/genNflGridData.mjs
   (the NFL grid key) and held by scripts/simImportedTables.mjs.

   Run: node scripts/genNflDraftRounds.mjs
        node scripts/genNflDraftRounds.mjs --check   (rebuild in memory, compare, write nothing)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib/nflverseRosters.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'scripts', '.cache', 'draftRounds');
export const OUT = path.join(ROOT, 'scripts', 'data', 'nflDraftRounds.json');
export const FOOTBALLDB_RECORD = path.join(ROOT, 'scripts', 'data', 'nflDraftRoundsFootballDb.json');
export const FIRST_YEAR = 1968;
export const LAST_YEAR = 2025;
export const NFLVERSE_FROM = 1980;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const NFLVERSE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/draft_picks/draft_picks.csv';

async function cached(name, url) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name);
  if (fs.existsSync(file) && fs.statSync(file).size > 500) return fs.readFileSync(file, 'utf8');
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (res.ok) {
        const text = await res.text();
        fs.writeFileSync(file, text);
        await new Promise(r => setTimeout(r, 700));
        return text;
      }
      last = `HTTP ${res.status}`;
    } catch (err) { last = String(err).slice(0, 100); }
    await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  throw new Error(`${url} could not be fetched: ${last}. NOTHING WAS WRITTEN.`);
}

const decode = s => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const cells = row => [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map(m => decode(m[1]));

/** drafthistory.com year page: Round (first row of each round only), Pick in round, Overall, Name, Team, Position, College. */
export function parseDraftHistory(html, year) {
  const out = [];
  let round = null;
  for (const m of html.matchAll(/<tr bgcolor[^>]*>([\s\S]*?)<\/tr>/g)) {
    const c = cells(m[1]);
    if (c.length < 7 || !/^\d+$/.test(c[2])) continue;
    if (/^\d+$/.test(c[0])) round = Number(c[0]);
    if (round == null) continue;
    out.push({ year, round, inRound: Number(c[1]), pick: Number(c[2]), name: c[3] });
  }
  return out;
}

/** footballdb.com round page: Round, Pick (overall), Team, Player, Pos, College, Note. */
export function parseFootballDb(html, year) {
  const out = [];
  for (const m of html.matchAll(/<tr class="row\d"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const raw = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1]);
    if (raw.length < 4) continue;
    const round = Number(decode(raw[0].replace(/<span[\s\S]*?<\/span>/g, '')));
    const pick = Number(decode(raw[1]));
    const name = decode(raw[3]);
    if (Number.isInteger(round) && Number.isInteger(pick) && pick > 0) out.push({ year, round, pick, name });
  }
  return out;
}

export function parseNflverse(text) {
  const rows = parseCsv(text);
  const head = rows[0];
  const at = k => head.indexOf(k);
  return rows.slice(1).filter(r => r.length >= head.length - 1).map(r => ({
    year: Number(r[at('season')]), round: Number(r[at('round')]), pick: Number(r[at('pick')]), name: r[at('pfr_player_name')],
  })).filter(r => Number.isInteger(r.year) && Number.isInteger(r.round) && Number.isInteger(r.pick));
}

/** Rounds as [round, first overall, last overall], or a list of problems when the picks do not form contiguous rounds. */
export function boundsOf(picks) {
  const byRound = new Map();
  for (const p of picks) {
    const b = byRound.get(p.round) ?? [p.round, p.pick, p.pick];
    b[1] = Math.min(b[1], p.pick); b[2] = Math.max(b[2], p.pick);
    byRound.set(p.round, b);
  }
  const bounds = [...byRound.values()].sort((a, b) => a[0] - b[0]);
  const problems = [];
  for (let i = 1; i < bounds.length; i += 1) {
    if (bounds[i][0] !== bounds[i - 1][0] + 1) problems.push(`round ${bounds[i - 1][0] + 1} is missing`);
    if (bounds[i][1] <= bounds[i - 1][2]) problems.push(`round ${bounds[i][0]} starts at ${bounds[i][1]}, inside round ${bounds[i - 1][0]}`);
  }
  if (bounds.length && bounds[0][0] !== 1) problems.push('the draft does not start in round 1');
  return { bounds, problems };
}

/** Both sources, per year: agreement on every overall pick's round, then the bounds. */
export function compareYear(year, primary, second) {
  const a = new Map(primary.map(p => [p.pick, p]));
  const b = new Map(second.map(p => [p.pick, p]));
  const disagree = [];
  for (const [pick, p] of a) {
    const q = b.get(pick);
    if (q && q.round !== p.round) disagree.push(`pick ${pick}: round ${p.round} (${p.name}) against ${q.round} (${q.name})`);
  }
  const onlyOne = [...a.keys()].filter(k => !b.has(k)).length + [...b.keys()].filter(k => !a.has(k)).length;
  const A = boundsOf(primary);
  const B = boundsOf(second);
  const same = JSON.stringify(A.bounds) === JSON.stringify(B.bounds);
  return { year, picks: a.size, secondPicks: b.size, onlyOne, disagree, problems: [...A.problems, ...B.problems], same, bounds: A.bounds, secondBounds: B.bounds };
}

export async function pullSources(log = () => {}) {
  const nflverse = parseNflverse(await cached('nflverse_draft_picks.csv', NFLVERSE_URL));
  const dh = new Map();
  const fdb = new Map();
  const fdbCounts = new Map();
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    dh.set(year, parseDraftHistory(await cached(`dh_${year}.html`, `http://www.drafthistory.com/index.php/years/${year}`), year));
    log(`${year}: drafthistory ${dh.get(year).length}`);
  }
  /* footballdb answers a browser but refuses a script, so its round pages
     were read in a browser and recorded, per round, as the first and last
     overall pick and the number of picks (FOOTBALLDB_RECORD). A recorded
     round expands to its picks for the pick by pick comparison. */
  const record = JSON.parse(fs.readFileSync(FOOTBALLDB_RECORD, 'utf8'));
  for (const [year, rounds] of Object.entries(record.years)) {
    fdb.set(Number(year), rounds.flatMap(([round, first, last]) => Array.from({ length: last - first + 1 }, (_, i) => ({ year: Number(year), round, pick: first + i, name: '' }))));
    fdbCounts.set(Number(year), new Map(rounds.map(([round, , , count]) => [round, count])));
  }
  return { nflverse, dh, fdb, fdbCounts };
}

export function buildRounds({ nflverse, dh, fdb, fdbCounts = new Map() }) {
  const years = {};
  const report = [];
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    const primary = year >= NFLVERSE_FROM ? nflverse.filter(p => p.year === year) : dh.get(year) ?? [];
    const second = year >= NFLVERSE_FROM ? dh.get(year) ?? [] : fdb.get(year) ?? [];
    const r = compareYear(year, primary, second);
    /* A recorded round is a first pick, a last pick and a count; the count
       must be the primary source's count for that round too. */
    const counts = fdbCounts.get(year);
    if (year < NFLVERSE_FROM && counts) {
      const mine = new Map();
      for (const p of primary) mine.set(p.round, (mine.get(p.round) ?? 0) + 1);
      for (const [round, n] of counts) if (mine.get(round) !== n) r.problems.push(`round ${round}: ${mine.get(round) ?? 0} picks against ${n} recorded`);
    }
    report.push(r);
    if (r.picks > 0 && r.secondPicks > 0 && r.disagree.length === 0 && r.problems.length === 0 && r.same) years[year] = r.bounds;
  }
  return { years, report };
}

export function renderFile(years) {
  return JSON.stringify({
    round: 705,
    what: 'For each NFL draft, every round as [round, first overall pick, last overall pick]. A year is present only when both of its sources put every overall pick in the same round.',
    sources: {
      '1980-2025': 'nflverse-data release draft_picks (draft_picks.csv), checked pick by pick against drafthistory.com/index.php/years/YYYY',
      '1968-1979': 'drafthistory.com/index.php/years/YYYY, checked pick by pick against footballdb.com/draft/draft.html?lg=NFL&yr=YYYY&rnd=R',
    },
    years,
  }, null, 1);
}

/** The round an overall pick fell in, or null when the year is not recorded or the pick is outside every round. */
export function roundOfPick(file, year, pick) {
  const bounds = file?.years?.[String(year)];
  if (!bounds || !Number.isInteger(Number(pick))) return null;
  const hit = bounds.find(([, first, last]) => Number(pick) >= first && Number(pick) <= last);
  return hit ? hit[0] : null;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const check = process.argv.includes('--check');
  const src = await pullSources(m => console.log('   ' + m));
  const { years, report } = buildRounds(src);
  let held = 0;
  for (const r of report) {
    const ok = Boolean(years[r.year]);
    if (!ok) held += 1;
    const firstEnd = r.bounds[0]?.[2];
    console.log(`${r.year}: ${r.picks} picks against ${r.secondPicks}, ${r.bounds.length} rounds, first round ends at ${firstEnd}${r.onlyOne ? `, ${r.onlyOne} picks on one source only` : ''}${ok ? '' : '  HELD'}`);
    for (const d of r.disagree.slice(0, 6)) console.log(`      disagree ${d}`);
    for (const p of r.problems.slice(0, 6)) console.log(`      problem ${p}`);
    if (!r.same && r.disagree.length === 0) console.log(`      bounds differ: ${JSON.stringify(r.bounds)} against ${JSON.stringify(r.secondBounds)}`);
  }
  console.log(`${Object.keys(years).length} years recorded, ${held} held`);
  if (check) {
    const current = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const same = current && JSON.stringify(current.years) === JSON.stringify(years);
    console.log(same ? 'up to date: the committed file matches the sources' : 'STALE: the committed file differs from the sources');
    process.exit(same ? 0 : 1);
  }
  fs.writeFileSync(OUT, renderFile(years));
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
