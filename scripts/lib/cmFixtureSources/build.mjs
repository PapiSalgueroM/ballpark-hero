/**
 * Round 1213: from two kept snapshots to one ledger, or to a list of reasons why not.
 *
 * buildLedger never writes a file and never fills a gap. It parses each source
 * with its committed parser, maps club spellings through the league's explicit
 * table, and returns { ledger, receipt } only when every check below holds.
 * Otherwise it returns { problems } and the caller writes nothing.
 */
import crypto from 'node:crypto';
import { readSnapshot } from './fetchRaw.mjs';
import * as feedJson from './feedJson.mjs';
import * as maxifoot from './maxifoot.mjs';
import * as tuttomercatoweb from './tuttomercatoweb.mjs';
import * as dflPdf from './dflPdf.mjs';
import * as tff from './tff.mjs';
import * as walfoot from './walfoot.mjs';
import * as hessenschau from './hessenschau.mjs';
import * as espnByDate from './espnByDate.mjs';

export const PARSERS = { feedJson, maxifoot, tuttomercatoweb, dflPdf, tff, walfoot, hessenschau, espnByDate };

export const COVERAGE = 'Real league opponent order and home/away venues only. Calendar dates and match results are simulated.';
export const DIGEST_FIELDS = ['key', 'leagueId', 'seasonStartYear', 'clubs', 'rounds'];
export const SEASON_START_YEAR = 2026;
export const ledgerKeyOf = leagueId => `${leagueId}-2026-27-v1`;

/** The frozen form of a ledger: the five fields a save depends on, in a fixed order, nothing else. */
export function canonicalLedgerJson(ledger) {
  return JSON.stringify({
    key: ledger.key, leagueId: ledger.leagueId, seasonStartYear: ledger.seasonStartYear,
    clubs: ledger.clubs, rounds: ledger.rounds,
  });
}
export const ledgerDigest = ledger => crypto.createHash('sha256').update(canonicalLedgerJson(ledger)).digest('hex');

const LONG_DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
/* Three shapes the rival name fence (scripts/simNoRivalNames.mjs) refuses that a league's sponsor or a page
   title can carry. The fence itself stays the net and is run on every data commit; this is only the tool
   refusing to write a file it already knows would fail there. The words are joined here, never written out,
   because the fence reads this file too. */
const FENCED_WORDS = [['football', 'manager'], ['championship', 'manager'], ['ea', 'sports']]
  .map(([a, b]) => new RegExp(`${a} ?${b}`, 'i'));
export function fencedReason(s) {
  if (LONG_DASH.test(s)) return 'holds a long dash';
  const hit = FENCED_WORDS.find(re => re.test(s));
  return hit ? `holds words the rival name fence refuses (${hit.source})` : null;
}

const tupleOf = r => `${r.round}|${r.home}|${r.away}`;

/** The calendar day of a stamp, in the stamp's own offset: its first ten characters, or null when it has no day. */
export const dayOf = stamp => (typeof stamp === 'string' && /^\d{4}-\d{2}-\d{2}/.test(stamp) ? stamp.slice(0, 10) : null);

/**
 * Is a source a release day copy of the list, or a page kept up to date?
 * 'release day' takes all three: a parser family that reads release day documents (the parser's own
 * listAsOf), the day the list came out (released), and a last change stamp from the source's bytes
 * (modified) that is no later than that day. Anything less is 'read day'. The harness calls this with what a
 * receipt recorded, so a receipt cannot claim more than its own evidence bears out.
 */
export function listAsOfFrom(parserListAsOf, released, modified) {
  const [day, changed] = [dayOf(released), dayOf(modified)];
  return parserListAsOf === 'release day' && day && changed && changed <= day ? 'release day' : 'read day';
}

/**
 * The day the list a source prints came out, and how that day is known. An article says it itself (its
 * publication stamp). A document that prints no such stamp takes it from the league table (released, typed
 * there with where it was read). When both exist they must be the same day.
 */
function releaseDay(source, parsed) {
  const own = dayOf(parsed.published);
  if (own && source.released && own !== source.released) {
    return { problem: `${source.id}: the league table says its list came out on ${source.released} and its own publication stamp says ${own}` };
  }
  if (own) return { released: own, releasedBasis: 'The publication stamp in this source\'s own bytes.' };
  if (source.released) return { released: source.released, releasedBasis: source.releasedNote || 'Typed in the league table.' };
  return {};
}

/** Parse one source and map its spellings. Returns the mapped rows and every reason the source cannot be used. */
function readSource(league, index, gameClubs, dir) {
  const source = league.sources[index];
  const table = league.names[index] || {};
  const parser = PARSERS[source.parser];
  if (!parser) return { problems: [`${source.id}: no committed parser named ${source.parser}`] };
  const pages = readSnapshot(dir, source);
  const parsed = parser.parse(pages, source);
  const problems = [];
  const untimed = pages.filter(p => !READ_AT.test(p.meta.readAtUtc || '')).length;
  if (untimed) problems.push(`${source.id}: ${untimed} kept page(s) do not say when they were read (readAtUtc in the .meta.json beside the bytes)`);
  const game = new Set(gameClubs);
  const spellings = new Set(parsed.rows.flatMap(r => [r.home, r.away]));
  const mapOf = s => (Object.hasOwn(table, s) ? table[s] : (game.has(s) ? s : null));
  const unmapped = [...spellings].filter(s => mapOf(s) === null).sort();
  if (unmapped.length) problems.push(`${source.id}: ${unmapped.length} spelling(s) not in the name table: ${unmapped.join(' ; ')}`);
  const badTargets = Object.entries(table).filter(([, to]) => !game.has(to)).map(([from, to]) => `${from} -> ${to}`);
  if (badTargets.length) problems.push(`${source.id}: the table maps onto a club the game's league does not have: ${badTargets.join(' ; ')}`);
  const unused = Object.keys(table).filter(from => !spellings.has(from));
  if (unused.length) problems.push(`${source.id}: the table holds spellings the source never prints: ${unused.join(' ; ')}`);
  const targets = [...spellings].map(mapOf).filter(Boolean);
  if (new Set(targets).size !== targets.length) problems.push(`${source.id}: two source spellings land on one club`);
  if (!unmapped.length && (new Set(targets).size !== game.size || targets.some(t => !game.has(t)))) {
    const missing = gameClubs.filter(c => !targets.includes(c));
    problems.push(`${source.id}: its clubs are not the game's clubs for this league (missing: ${missing.join(' ; ') || 'none'})`);
  }
  const seen = new Map();
  const duplicates = [];
  const rows = [];
  for (const r of parsed.rows) {
    const mapped = { ...r, home: mapOf(r.home) ?? r.home, away: mapOf(r.away) ?? r.away };
    const t = tupleOf(mapped);
    if (seen.has(t)) duplicates.push({ sourceLine: r.sourceLine, ref: r.ref, round: r.round, home: r.home, away: r.away });
    else { seen.set(t, true); rows.push(mapped); }
  }
  const used = Object.fromEntries(Object.entries(table).filter(([from]) => spellings.has(from)).sort(([a], [b]) => (a < b ? -1 : 1)));
  const day = releaseDay(source, parsed);
  if (day.problem) problems.push(day.problem);
  const stamps = {
    ...(parsed.published ? { published: parsed.published } : {}),
    ...(parsed.created ? { created: parsed.created } : {}),
    ...(parsed.modified ? { modified: parsed.modified } : {}),
    ...(day.released ? { released: day.released, releasedBasis: day.releasedBasis } : {}),
  };
  const listAsOf = listAsOfFrom(parser.listAsOf, day.released, parsed.modified);
  return { source, pages, parsed, rows, duplicates, problems, used, roundBasis: parser.roundBasis, listAsOf, stamps };
}

/** Every structural reason a list is not a whole double round robin for these clubs. */
export function shapeProblems(rows, clubs) {
  const problems = [];
  const n = clubs.length;
  const wantRounds = 2 * (n - 1);
  const byRound = new Map();
  for (const r of rows) byRound.set(r.round, [...(byRound.get(r.round) || []), r]);
  const numbers = [...byRound.keys()].sort((a, b) => a - b);
  if (numbers.length !== wantRounds || numbers.some((v, i) => v !== i + 1)) {
    problems.push(`matchdays are ${numbers.length ? `${numbers[0]} to ${numbers[numbers.length - 1]} (${numbers.length})` : 'none'}, the league plays 1 to ${wantRounds}`);
  }
  for (const [round, list] of byRound) {
    const inRound = list.flatMap(r => [r.home, r.away]);
    if (list.length !== n / 2 || new Set(inRound).size !== n) {
      problems.push(`matchday ${round} holds ${list.length} matches and ${new Set(inRound).size} different clubs, wanted ${n / 2} and ${n}`);
    }
  }
  const pairs = new Map();
  for (const r of rows) pairs.set(`${r.home}|${r.away}`, (pairs.get(`${r.home}|${r.away}`) || 0) + 1);
  let missing = 0;
  let repeated = 0;
  for (const h of clubs) for (const a of clubs) {
    if (h === a) continue;
    const c = pairs.get(`${h}|${a}`) || 0;
    if (c === 0) missing += 1;
    if (c > 1) repeated += 1;
  }
  if (missing || repeated) problems.push(`${missing} ordered pair(s) of clubs never meet and ${repeated} meet more than once`);
  return problems;
}

const aggregateSnapshot = pages => {
  const list = pages.map(p => ({ url: p.meta.url, readAtUtc: p.meta.readAtUtc, bytes: p.meta.bytes, sha256: p.meta.sha256 }));
  const bytes = list.reduce((sum, p) => sum + p.bytes, 0);
  const sha256 = list.length === 1
    ? list[0].sha256
    : crypto.createHash('sha256').update(list.map(p => p.sha256).join('\n')).digest('hex');
  return { files: list.length, bytes, sha256, ...(list.length > 1 ? { pages: list } : {}) };
};

export const READ_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/**
 * When ONE source's bytes were read, for its own entry in the receipt: the day and the moment (UTC) its last
 * page was saved, and the moment of its first page too when it is more than one page. These pages change every
 * week, so the moment of the read is part of what identifies a snapshot, and it is written into the repo
 * because the kept bytes and their .meta.json files are not.
 */
export const readTimes = pages => {
  const times = pages.map(p => p.meta.readAtUtc).sort();
  return { readOn: times.at(-1).slice(0, 10), readAtUtc: times.at(-1), ...(times.length > 1 ? { firstPageReadAtUtc: times[0] } : {}) };
};

/**
 * The whole proof for one league. gameLeague is the game's own row { id, name, clubs }.
 * Returns { problems } (a non empty list: write nothing) or { ledger, receipt }.
 */
export function buildLedger(league, gameLeague, dir) {
  const problems = [];
  if (league.sources.length !== 2) return { problems: ['a league has exactly two sources'] };
  const gameClubs = [...gameLeague.clubs];
  const read = league.sources.map((_, i) => {
    try {
      return readSource(league, i, gameClubs, dir);
    } catch (e) {
      return { problems: [`${league.sources[i].id}: ${e.message}`] };
    }
  });
  read.forEach(r => problems.push(...r.problems));
  if (problems.length) return { problems };

  for (const r of read) shapeProblems(r.rows, gameClubs).forEach(p => problems.push(`${r.source.id}: ${p}`));
  const [a, b] = read.map(r => new Set(r.rows.map(tupleOf)));
  const onlyA = [...a].filter(t => !b.has(t)).sort();
  const onlyB = [...b].filter(t => !a.has(t)).sort();
  if (onlyA.length || onlyB.length) {
    problems.push(`the two sources differ in ${onlyA.length + onlyB.length} matchday|home|away tuple(s)`);
    onlyA.forEach(t => problems.push(`  only in ${read[0].source.id}: ${t}`));
    onlyB.forEach(t => problems.push(`  only in ${read[1].source.id}: ${t}`));
  }
  /* A row one source prints twice is dropped only because the other source prints it once. The tuple sets
     above already had to be equal, so the other source holds it; what is left to refuse is both printing it twice. */
  if (read[0].duplicates.length && read[1].duplicates.length) {
    problems.push('both sources repeat a row, so neither can vouch for the other printing it once');
  }
  const hosts = league.sources.map(s => new URL(s.url).host.replace(/^www\./, ''));
  if (hosts[0] === hosts[1]) problems.push(`both sources are on ${hosts[0]}`);
  for (const [i, s] of league.sources.entries()) {
    const title = s.title || read[i].parsed.title || '';
    for (const [what, value] of [['title', title], ['address', s.url], ['cited address', s.citedUrl || s.url], ['label', s.label]]) {
      const why = fencedReason(value);
      if (why) problems.push(`${s.id}: its ${what} ${why}: ${value}`);
    }
    if (!title) problems.push(`${s.id}: no title, neither in the league table nor on the page`);
  }
  if (problems.length) return { problems };

  const clubs = [...gameClubs].sort();
  const n = clubs.length;
  const order = read[league.orderSource].rows;
  const rounds = Array.from({ length: 2 * (n - 1) }, (_, i) => order.filter(r => r.round === i + 1).map(r => [r.home, r.away]));
  const ledger = {
    schemaVersion: 1,
    key: ledgerKeyOf(league.leagueId),
    leagueId: league.leagueId,
    seasonStartYear: SEASON_START_YEAR,
    coverage: COVERAGE,
    clubs,
    rounds,
    sources: league.sources.map(s => ({ label: s.label, url: s.citedUrl || s.url })),
  };
  /* Counted from each side, never copied from the other: the receipt says what was measured. */
  const homePerClub = new Set(clubs.map(c => order.filter(r => r.home === c).length));
  const awayPerClub = new Set(clubs.map(c => order.filter(r => r.away === c).length));
  if (homePerClub.size !== 1 || awayPerClub.size !== 1) return { problems: ['the clubs do not all have the same number of home games and of away games'] };
  const readOn = read.flatMap(r => r.pages.map(p => p.meta.readAtUtc)).sort().at(-1).slice(0, 10);
  const released = read.find(r => r.listAsOf === 'release day');
  const receipt = {
    schemaVersion: 1,
    ledgerKey: ledger.key,
    leagueId: league.leagueId,
    leagueName: gameLeague.name,
    dataFile: `src/data/${league.file}.ts`,
    exportName: league.exportName,
    readOn,
    asFirstPublished: !!released,
    roundNumbers: released
      ? `The matchdays and venues of the list as first published: ${released.source.label} is a release day copy of it, and the second source agrees on every row.`
      : `The matchdays and venues as both sources showed them on ${readOn}. Both are kept up to date. A match moved to another date keeps its matchday on both, but no release day copy of the list was read, so a change of ground made after the list came out would be in here as the list now stands.`,
    validatedFields: ['round', 'home', 'away'],
    excludedFields: ['match date', 'kickoff time', 'score', 'result', 'goalscorer'],
    orderSource: league.orderSource,
    sources: read.map((r, i) => {
      const s = r.source;
      const title = s.title || r.parsed.title;
      return {
        kind: s.kind,
        label: s.label,
        url: s.url,
        citedUrl: s.citedUrl || s.url,
        ...(s.citedNote ? { citedNote: s.citedNote } : {}),
        ...readTimes(r.pages),
        title,
        ...(s.titleNote ? { titleNote: s.titleNote } : {}),
        ...r.stamps,
        parser: `scripts/lib/cmFixtureSources/${s.parser}.mjs`,
        roundBasis: r.roundBasis,
        listAsOf: r.listAsOf,
        snapshot: aggregateSnapshot(r.pages),
        fixtureRows: r.parsed.rows.length,
        uniqueFixtures: r.rows.length,
        nameNormalization: r.used,
        rows: r.parsed.rows.filter(x => !r.duplicates.some(d => d.sourceLine === x.sourceLine && d.ref === x.ref))
          .map(x => ({ sourceLine: x.sourceLine, ref: x.ref, round: x.round, home: x.home, away: x.away })),
        ...(i === league.orderSource ? { orderOfMatches: 'The ledger keeps this source\'s order of matches inside a matchday.' } : {}),
      };
    }),
    validation: {
      clubs: n,
      rounds: rounds.length,
      matches: order.length,
      matchesPerRound: n / 2,
      clubsPerRound: n,
      homePerClub: [...homePerClub][0],
      awayPerClub: [...awayPerClub][0],
      roundHomeAwayTupleDifferences: 0,
      unmappedClubs: 0,
      duplicates: read.flatMap(r => r.duplicates.map(d => ({ source: r.source.id, ...d, handling: 'Dropped the repeated row. The other source prints this fixture once in the same matchday.' }))),
      calendarStatus: 'Dates and kickoffs are not certified by this ledger and none is stored in it.',
    },
    ledgerDigest: { fields: DIGEST_FIELDS, sha256: ledgerDigest(ledger) },
    recheck: null,
  };
  return { ledger, receipt };
}
