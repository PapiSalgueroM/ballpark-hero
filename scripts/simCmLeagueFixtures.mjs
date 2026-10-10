/**
 * Round 1213 harness: the real fixture ledgers Club Manager holds are whole, are the
 * game's own clubs, and are what two independent sources printed.
 *
 *   node scripts/simCmLeagueFixtures.mjs
 *   CM_LEAGUE_FIXTURES_ONLY=<leagueId> node scripts/simCmLeagueFixtures.mjs   one league (not ONLY: the suite
 *       runner passes ONLY=<harness name> down to every harness, and a league filter that read it would match
 *       no ledger and call nothing green; a filter that matches no ledger is a failure here for the same reason)
 *   CM_LEAGUE_FIXTURES_EXPECT=<n> CM_LEAGUE_FIXTURES_EXPECT_FROZEN=<m> node scripts/simCmLeagueFixtures.mjs
 *       the gate's own counts: n ledgers on disk, m of them with a frozen line. Give both in a gate line.
 *   CM_LEAGUE_FIXTURES_CONTROL=<name> [CM_LEAGUE_FIXTURES_CONTROL_LEAGUE=<leagueId>] node scripts/simCmLeagueFixtures.mjs
 *
 * PURE DATA. It starts no career and plays no match. It finds ledgers by listing
 * src/data/clubManager*Fixtures2026.ts, NOT through any registry in the game, so
 * a ledger is held to all of this before the game ever reads it. Each ledger is
 * read the way the game would read it, by importing the module, never by
 * parsing the file's text.
 *
 * For every ledger on disk:
 *  A. Shape. One export; the eight fields; the key's form; 2 x (n - 1) matchdays
 *     for n clubs; n / 2 matches in every matchday; two https sources.
 *  B. No club twice in a matchday: every matchday holds every club exactly once.
 *  C. Every club plays each other twice, once at each ground: each ordered pair
 *     (home, away) exactly once, so n - 1 home and n - 1 away games a club.
 *  D. The clubs are the game's clubs for that league in a new 2026/27 career:
 *     the same set as the league's row in REAL_LEAGUES, in the game's spellings.
 *  E. THE DRIFT GUARD. The ledger equals what each source printed, row for row,
 *     as the receipt recorded it: every source's rows, mapped through that
 *     source's name table, are the ledger's matchdays as a set, and in order
 *     for the source that gives the order; the receipt's counts are the
 *     ledger's; the two sources' tuples, compared again here, differ nowhere.
 *     This proves the ledger and the receipt have not drifted apart since the
 *     tool wrote both. It does NOT prove the rows were read correctly off the
 *     page: that proof is the tool's (two sources, two different committed
 *     parsers, every tuple equal) plus a reviewer's fresh read with
 *     `node scripts/genCmLeagueFixtures.mjs check <leagueId> --dir <new folder>`.
 *     For every ledger the tool wrote (all but the one named in PRE_TOOL_KEYS)
 *     each source also carries the hash of its kept bytes, the day and the
 *     moment they were read, and a parser this repo holds; and what a source
 *     says its list is a copy of (release day, read day) is worked out again
 *     here from that parser's own family and the stamps the receipt recorded,
 *     with the tool's own rule, so "as first published" cannot be claimed by
 *     editing a receipt.
 *  F. Two independent sources: two different hosts, neither one a wiki, and the
 *     two addresses the ledger ships are the two the receipt cites.
 *  G. Nothing that was excluded got in. Stated exactly, because club names
 *     carry digits and a loose "no date shaped value" would misfire on them:
 *     every match is exactly two strings, every string is one of the ledger's
 *     clubs, the export has exactly the eight known fields, the data file
 *     imports nothing, and a receipt row has no field but its line, its
 *     reference, the matchday and the two clubs.
 *  I. Frozen. Every line of scripts/data/cmLeagueFixtures.frozen.json has its
 *     ledger on disk with exactly that digest (key, leagueId, seasonStartYear,
 *     clubs, rounds; the sources are left out so a dead link can be mended).
 *     The tool freezes every ledger it writes, in the same write. So a ledger
 *     of the tool's with no frozen line, or whose receipt records no digest,
 *     is RED: a line was lost (a merge of the frozen file that kept one side
 *     does exactly that). Only the ledger written before the tool existed
 *     (PRE_TOOL_KEYS: Round 1184's Premier League list) may be PENDING, on
 *     disk with no frozen line: it is still held to A to G and named on the
 *     summary line. Whoever runs the gate asserts both counts
 *     (CM_LEAGUE_FIXTURES_EXPECT and CM_LEAGUE_FIXTURES_EXPECT_FROZEN).
 * Sections H (the game's registry agrees with the disk) and J (Help names the
 * registered leagues) belong to the round that binds the ledgers, not to this one.
 *
 * CONTROLS. Every run ends by proving its own checks: each control below is
 * applied to an in memory copy of each frozen ledger in turn, must first show
 * it changed something, and must turn red EXACTLY the sections written beside
 * it for exactly that league while every other league stays green. A run that
 * checked ledgers and ran no control at all is RED: nothing in it was shown
 * able to fail.
 *   swapvenue     one match's home and away flipped in the ledger      C E I
 *   droprow       one match removed from a matchday                    A B C E I
 *   twiceinround  one away club replaced by a club already playing     B C E I
 *   ghostclub     one club renamed, everywhere, to another league's    D I
 *   receiptdrift  one receipt row's clubs flipped                      E
 *   samehost      the second source moved onto the first one's host    F
 *   wikihost      the second source moved onto a wiki                  F
 *   datein        a date string put beside a match                     G I
 *   extrakey      a ninth field on the export                          G
 *   refreeze      a consistent rewrite of ledger AND receipt           I
 *   lostfile      the ledger file gone while its frozen line stays     I
 * and, on the ledgers the tool wrote:
 *   nosnapshot    a source loses the hash of its kept bytes            E
 *   noreadtime    a source loses the moment its bytes were read        E
 *   falsefirstpub the receipt's "as first published" flipped           E
 *   falseasof     a source's release day or read day flipped, and the
 *                 receipt's "as first published" made to agree with it E
 *   latechange    a release day source's bytes say they were changed
 *                 after the list came out (leagues that have one)      E
 *   unfrozen      the ledger's line gone from the frozen file          I
 *   nodigest      the receipt loses the digest it recorded             I
 * CM_LEAGUE_FIXTURES_CONTROL=<name> leaves that one fault in place instead: the
 * run then exits 1 with a last line that says the control FIRED as expected, or
 * exits 3 with a last line that says it MISFIRED or could not run.
 *
 * Green is the closing summary line and exit code 0, never the absence of FAIL lines.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, gameLeagues, ledgerFilesOnDisk, loadLedgers } from './lib/cmFixtureSources/gameBundle.mjs';
import { PARSERS, READ_AT, dayOf, ledgerDigest, listAsOfFrom } from './lib/cmFixtureSources/build.mjs';
import { cmFixtureLeague } from './lib/cmFixtureSources/leagues.mjs';

const ONLY = process.env.CM_LEAGUE_FIXTURES_ONLY || '';
const EXPECT = process.env.CM_LEAGUE_FIXTURES_EXPECT || '';
const EXPECT_FROZEN = process.env.CM_LEAGUE_FIXTURES_EXPECT_FROZEN || '';
/* The one ledger written before scripts/genCmLeagueFixtures.mjs existed: Round 1184's Premier League list.
   Its receipt was written by hand in another shape (no hash of kept bytes, no read time, no digest) and is
   not this harness's to demand a rewrite of. It is held to everything its shape can carry, it may be
   pending or frozen, and nothing else is let off: every other ledger is the tool's and is held to all of it.
   A second key never joins this list, a new ledger is written by the tool. */
const PRE_TOOL_KEYS = ['premier-2026-27-v1'];
const CONTROL = process.env.CM_LEAGUE_FIXTURES_CONTROL || '';
const CONTROL_LEAGUE = process.env.CM_LEAGUE_FIXTURES_CONTROL_LEAGUE || '';
const FROZEN_REL = 'scripts/data/cmLeagueFixtures.frozen.json';
const KNOWN_FIELDS = ['schemaVersion', 'key', 'leagueId', 'seasonStartYear', 'coverage', 'clubs', 'rounds', 'sources'];
/* duplicate is the mark Round 1184's receipt puts on the one row its official source prints twice. */
const ROW_FIELDS = ['sourceLine', 'ref', 'round', 'home', 'away', 'duplicate'];
const WIKI_HOST = /(^|\.)(wikipedia|wikimedia|wikidata|fandom)\./i;
const SECTIONS = { A: 'shape', B: 'no club twice in a matchday', C: 'each pair once at each ground', D: "the game's own clubs", E: 'the drift guard: ledger equals each source in the receipt', F: 'two independent sources', G: 'nothing excluded got in', I: 'frozen' };

const hostOf = url => { try { return new URL(url).host.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const isStr = v => typeof v === 'string' && v.length > 0;
const tuple = (round, home, away) => `${round}|${home}|${away}`;

/**
 * The whole judgement, as a pure function of what was loaded, so a control can
 * hand it a damaged copy. world = { leagues, entries: [{ file, exportNames,
 * ledger, receipt, source }], frozen }. Returns [{ id, section, msg }].
 */
function evaluate(world) {
  const reds = [];
  const keysSeen = new Map();
  for (const e of world.entries) {
    const L = e.ledger;
    const id = (L && isStr(L.leagueId) ? L.leagueId : e.file);
    const red = (section, msg) => reds.push({ id, section, msg });

    /* ---- A. shape ---- */
    if (e.exportNames.length !== 1 || !/^[A-Z0-9]+_FIXTURES_2026$/.test(e.exportNames[0] || '')) red('A', `the module exports ${e.exportNames.join(', ') || 'nothing'}, wanted one <LEAGUE>_FIXTURES_2026`);
    if (!L || typeof L !== 'object') { red('A', 'the export is not an object'); continue; }
    const clubs = Array.isArray(L.clubs) ? L.clubs : [];
    const rounds = Array.isArray(L.rounds) ? L.rounds : [];
    const n = clubs.length;
    if (L.schemaVersion !== 1) red('A', `schemaVersion is ${L.schemaVersion}`);
    if (!isStr(L.leagueId) || L.key !== `${L.leagueId}-2026-27-v1`) red('A', `the key ${L.key} is not <leagueId>-2026-27-v1`);
    if (L.seasonStartYear !== 2026) red('A', `seasonStartYear is ${L.seasonStartYear}`);
    if (!isStr(L.coverage)) red('A', 'no coverage sentence');
    if (n < 4 || n % 2 !== 0 || !clubs.every(isStr) || new Set(clubs).size !== n) red('A', `clubs is not an even list of different names (${n})`);
    if (rounds.length !== 2 * (n - 1)) red('A', `${rounds.length} matchdays for ${n} clubs, wanted ${2 * (n - 1)}`);
    const badSize = rounds.map((r, i) => [i + 1, Array.isArray(r) ? r.length : -1]).filter(([, len]) => len !== n / 2);
    if (badSize.length) red('A', `${badSize.length} matchday(s) do not hold ${n / 2} matches, the first is matchday ${badSize[0][0]} with ${badSize[0][1]}`);
    const srcs = Array.isArray(L.sources) ? L.sources : [];
    if (srcs.length !== 2 || !srcs.every(s => s && isStr(s.label) && isStr(s.url) && s.url.startsWith('https://'))) red('A', 'sources is not two { label, url } entries with https addresses');
    if (keysSeen.has(L.key)) red('A', `the key ${L.key} is also in ${keysSeen.get(L.key)}`);
    keysSeen.set(L.key, e.file);
    const pairs = rounds.map(r => (Array.isArray(r) ? r.filter(Array.isArray) : []));

    /* ---- B. no club twice in a matchday ---- */
    const clubSet = new Set(clubs);
    const badRounds = pairs.map((r, i) => {
      const playing = r.flatMap(p => [p[0], p[1]]);
      return new Set(playing).size === n && playing.length === n && playing.every(c => clubSet.has(c)) ? 0 : i + 1;
    }).filter(Boolean);
    if (badRounds.length) red('B', `${badRounds.length} matchday(s) do not hold every club exactly once, the first is matchday ${badRounds[0]}`);

    /* ---- C. each ordered pair exactly once ---- */
    const met = new Map();
    const homes = new Map();
    const aways = new Map();
    for (const r of pairs) for (const p of r) {
      met.set(`${p[0]}|${p[1]}`, (met.get(`${p[0]}|${p[1]}`) || 0) + 1);
      homes.set(p[0], (homes.get(p[0]) || 0) + 1);
      aways.set(p[1], (aways.get(p[1]) || 0) + 1);
    }
    let never = 0;
    let again = 0;
    for (const h of clubs) for (const a of clubs) {
      if (h === a) continue;
      const c = met.get(`${h}|${a}`) || 0;
      if (c === 0) never += 1;
      if (c > 1) again += 1;
    }
    if (never || again) red('C', `${never} ordered pair(s) never meet and ${again} meet more than once`);
    const lopsided = clubs.filter(c => homes.get(c) !== n - 1 || aways.get(c) !== n - 1);
    if (lopsided.length) red('C', `${lopsided.length} club(s) do not have ${n - 1} home and ${n - 1} away games, the first is ${lopsided[0]}`);

    /* ---- D. the game's own clubs ---- */
    const row = world.leagues.find(l => l.id === L.leagueId);
    if (!row) red('D', `the game has no league ${L.leagueId}`);
    else {
      const game = new Set(row.clubs);
      const strangers = clubs.filter(c => !game.has(c));
      const absent = row.clubs.filter(c => !clubSet.has(c));
      if (strangers.length || absent.length || row.clubs.length !== n) red('D', `not the game's ${row.clubs.length} clubs: ${strangers.length} the game does not have (${strangers.slice(0, 3).join(', ')}), ${absent.length} of the game's missing (${absent.slice(0, 3).join(', ')})`);
    }
    judgeReceipt(e, L, clubs, pairs, n, red);
    judgeExcluded(e, L, clubs, rounds, red);
  }
  judgeFrozen(world, reds);
  return reds;
}

/* ---- E. the drift guard, and F. two independent sources ---- */
function judgeReceipt(e, L, clubs, pairs, n, red) {
  const R = e.receipt;
  if (!R || typeof R !== 'object') { red('E', 'no receipt beside the ledger'); red('F', 'no receipt, so no sources to weigh'); return; }
  const clubSet = new Set(clubs);
  const ledgerTuples = pairs.flatMap((r, i) => r.map(p => tuple(i + 1, p[0], p[1])));
  const ledgerSet = new Set(ledgerTuples);
  const sources = Array.isArray(R.sources) ? R.sources : [];
  if (R.ledgerKey !== L.key) red('E', `the receipt is for ${R.ledgerKey}, the ledger is ${L.key}`);
  const recorded = (R.validation && (R.validation.duplicates || R.validation.officialDuplicates)) || [];
  const mappedSets = sources.map((s, si) => {
    const table = s.nameNormalization || R.nameNormalization || {};
    const map = name => (Object.hasOwn(table, name) ? table[name] : name);
    const rows = Array.isArray(s.rows) ? s.rows : [];
    const mapped = rows.map(r => ({ round: r.round, home: map(r.home), away: map(r.away) }));
    const set = new Set(mapped.map(r => tuple(r.round, r.home, r.away)));
    const strangers = mapped.filter(r => !clubSet.has(r.home) || !clubSet.has(r.away)).length;
    const missing = [...ledgerSet].filter(t => !set.has(t)).length;
    const extra = [...set].filter(t => !ledgerSet.has(t)).length;
    if (strangers) red('E', `source ${si + 1}: ${strangers} row(s) map to a club the ledger does not have`);
    if (missing || extra) red('E', `source ${si + 1}: ${missing} ledger fixture(s) are not in its rows and ${extra} of its rows are not in the ledger`);
    if (rows.length - set.size > recorded.length) red('E', `source ${si + 1}: ${rows.length - set.size} repeated row(s), the receipt records ${recorded.length}`);
    if (si === R.orderSource) {
      const inOrder = mapped.map(r => tuple(r.round, r.home, r.away));
      const sorted = [...inOrder].sort((x, y) => Number(x.split('|')[0]) - Number(y.split('|')[0]));
      if (sorted.join('\n') !== ledgerTuples.join('\n')) red('E', `source ${si + 1} gives the order of matches and the ledger's order differs from it`);
    }
    if (e.tool) judgeToolSource(L, s, si, red);
    return set;
  });
  if (e.tool) {
    /* A receipt may say "the list as first published" only when one of its sources is a release day copy. */
    if (R.asFirstPublished !== sources.some(s => s.listAsOf === 'release day')) red('E', 'the receipt says the list is as first published, and its sources do not bear that out (or the reverse)');
    if (R.readOn !== sources.map(s => String(s.readOn)).sort().at(-1)) red('E', `the receipt's readOn (${R.readOn}) is not the day its later source was read`);
  }
  if (mappedSets.length >= 2) {
    const differ = [...mappedSets[0]].filter(t => !mappedSets[1].has(t)).length + [...mappedSets[1]].filter(t => !mappedSets[0].has(t)).length;
    if (differ) red('E', `the two sources differ in ${differ} matchday|home|away tuple(s)`);
  }
  const V = R.validation || {};
  const want = { clubs: n, rounds: pairs.length, matches: ledgerTuples.length, matchesPerRound: n / 2, homePerClub: n - 1, awayPerClub: n - 1 };
  const off = Object.entries(want).filter(([k, v]) => V[k] !== v).map(([k, v]) => `${k} ${V[k]} not ${v}`);
  if (off.length) red('E', `the receipt's counts are not the ledger's: ${off.join(', ')}`);

  if (sources.length !== 2) red('F', `${sources.length} sources, wanted two`);
  const hosts = sources.map(s => hostOf(s.url));
  if (hosts.some(h => !h)) red('F', 'a source has no readable address');
  if (new Set(hosts).size !== hosts.length) red('F', `both sources are on ${hosts[0]}`);
  const wiki = [...hosts, ...(L.sources || []).map(s => hostOf(s.url))].filter(h => WIKI_HOST.test(h));
  if (wiki.length) red('F', `a wiki is not a source: ${wiki[0]}`);
  const cited = sources.map(s => s.citedUrl || s.url);
  const shipped = (Array.isArray(L.sources) ? L.sources : []).map(s => s && s.url);
  if (cited.join('\n') !== shipped.join('\n')) red('F', 'the addresses the ledger ships are not the ones the receipt cites');
  if (new Set(shipped.map(hostOf)).size !== shipped.length) red('F', 'the two addresses the ledger ships are on one host');
}

/**
 * E, for a ledger the tool wrote: what its receipt says about ONE source, held to the tool's own parsers and
 * league table rather than to another field of the same receipt.
 */
function judgeToolSource(L, s, si, red) {
  const n = si + 1;
  if (!(s.snapshot && /^[0-9a-f]{64}$/.test(s.snapshot.sha256 || '') && s.snapshot.bytes > 0)) red('E', `source ${n}: no hash of the bytes its rows were parsed from`);
  const pages = s.snapshot && Array.isArray(s.snapshot.pages) ? s.snapshot.pages : [];
  const lastPage = pages.map(p => String(p.readAtUtc)).sort().at(-1);
  if (!READ_AT.test(s.readAtUtc || '') || s.readOn !== String(s.readAtUtc).slice(0, 10) || pages.some(p => !READ_AT.test(p.readAtUtc || '')) || (pages.length && lastPage !== s.readAtUtc)) {
    red('E', `source ${n} does not say when its bytes were read (readOn, readAtUtc, and the same for each page of a source of many pages)`);
  }
  const name = path.basename(String(s.parser || ''), '.mjs');
  const family = Object.hasOwn(PARSERS, name) && s.parser === `scripts/lib/cmFixtureSources/${name}.mjs` ? PARSERS[name] : null;
  if (!family) { red('E', `source ${n} names no parser this repo holds (${s.parser})`); return; }
  if (s.roundBasis !== family.roundBasis) red('E', `source ${n} says its matchdays are ${s.roundBasis}, its parser reads them as ${family.roundBasis}`);
  /* The day the list came out is the source's own publication stamp, or the day typed in the league table for a document that prints none. */
  const table = cmFixtureLeague(L.leagueId);
  const wantDay = dayOf(s.published) || (table && table.sources[si] && table.sources[si].released) || undefined;
  if (s.released !== wantDay) red('E', `source ${n} says its list came out on ${s.released}, and neither its own publication stamp nor the league table says so`);
  if (s.listAsOf !== listAsOfFrom(family.listAsOf, s.released, s.modified)) {
    red('E', `source ${n} says it is a ${s.listAsOf} copy of the list, and its parser and the stamps it recorded do not bear that out (came out ${s.released || 'unknown'}, last changed ${s.modified || 'unknown'})`);
  }
}

/* ---- G. nothing that was excluded got in ---- */
function judgeExcluded(e, L, clubs, rounds, red) {
  const clubSet = new Set(clubs);
  let notTwo = 0;
  let notClub = 0;
  for (const r of rounds) for (const p of (Array.isArray(r) ? r : [])) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(isStr)) notTwo += 1;
    else if (!clubSet.has(p[0]) || !clubSet.has(p[1])) notClub += 1;
  }
  if (notTwo) red('G', `${notTwo} match(es) are not exactly two names`);
  if (notClub) red('G', `${notClub} match(es) hold a string that is not one of the ledger's clubs`);
  const fields = Object.keys(L);
  const extra = fields.filter(f => !KNOWN_FIELDS.includes(f));
  const lacking = KNOWN_FIELDS.filter(f => !fields.includes(f));
  if (extra.length || lacking.length) red('G', `the export's fields are not the eight known ones (extra: ${extra.join(', ') || 'none'}; missing: ${lacking.join(', ') || 'none'})`);
  const code = e.source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');
  if (/^\s*import\s/m.test(code) || /\brequire\s*\(/.test(code) || /^\s*export\s[^\n]*\sfrom\s/m.test(code)) red('G', 'the data file imports something');
  const rowFields = new Set();
  for (const s of (e.receipt && Array.isArray(e.receipt.sources) ? e.receipt.sources : [])) for (const r of (Array.isArray(s.rows) ? s.rows : [])) Object.keys(r).forEach(k => rowFields.add(k));
  const strange = [...rowFields].filter(k => !ROW_FIELDS.includes(k));
  if (strange.length) red('G', `a receipt row carries a field beyond its line, reference, matchday and clubs: ${strange.join(', ')}`);
}

/* ---- I. frozen ---- */
function judgeFrozen(world, reds) {
  const lines = world.frozen && world.frozen.ledgers ? world.frozen.ledgers : {};
  for (const [key, line] of Object.entries(lines)) {
    if (world.only && line.leagueId !== world.only) continue;
    const red = msg => reds.push({ id: line.leagueId || key, section: 'I', msg });
    const e = world.entries.find(x => x.ledger && x.ledger.key === key);
    if (!e) { red(`the frozen key ${key} has no ledger on disk`); continue; }
    if (e.file !== line.file) red(`the frozen line names ${line.file}, the ledger is in ${e.file}`);
    if (ledgerDigest(e.ledger) !== line.sha256) red(`the ledger's digest is not the frozen ${String(line.sha256).slice(0, 16)}: a frozen ledger never changes, a correction ships under a new key`);
  }
  /* The digest the tool wrote into the receipt is the same promise, kept beside the evidence. And the tool
     writes the ledger, the receipt with that digest and the frozen line in one go, so a ledger of the tool's
     that lacks either has LOST it: the frozen file is one JSON object that every later league round edits,
     and a merge that keeps one side drops the other side's lines without touching a ledger. */
  for (const e of world.entries) {
    if (!e.ledger) continue;
    const red = msg => reds.push({ id: e.ledger.leagueId || e.file, section: 'I', msg });
    const recorded = e.receipt && e.receipt.ledgerDigest && e.receipt.ledgerDigest.sha256;
    if (recorded && recorded !== ledgerDigest(e.ledger)) red('the digest the receipt recorded is not the ledger\'s');
    if (!e.tool) continue;
    if (!Object.hasOwn(lines, e.ledger.key)) red(`no frozen line for ${e.ledger.key}: the tool freezes every ledger it writes, so the line was lost`);
    if (e.receipt && !recorded) red('the receipt records no digest of its ledger, and every receipt the tool writes does');
  }
}

/* ---- load what is on disk ---- */
const readJson = rel => (fs.existsSync(path.join(ROOT, rel)) ? JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) : null);
const frozenOnDisk = readJson(FROZEN_REL) || { ledgers: {} };
const leagues = await gameLeagues();
const loaded = await loadLedgers(ledgerFilesOnDisk());
const frozenKeys = new Set(Object.keys(frozenOnDisk.ledgers));
const allEntries = loaded.map(l => ({
  ...l,
  receipt: readJson(l.file.replace(/^src\/data\//, 'scripts/data/').replace(/\.ts$/, '.receipt.json')),
  source: fs.readFileSync(path.join(ROOT, l.file), 'utf8'),
  frozen: !!(l.ledger && frozenKeys.has(l.ledger.key)),
  tool: !(l.ledger && PRE_TOOL_KEYS.includes(l.ledger.key)),
}));
const entries = ONLY ? allEntries.filter(e => e.ledger && e.ledger.leagueId === ONLY) : allEntries;
const world = { leagues, entries, frozen: frozenOnDisk, only: ONLY };
const idOf = e => (e.ledger && e.ledger.leagueId) || e.file;

/* ---- the controls: each damages a copy of the world for one league and names the sections that must go red ---- */
const tableOf = (R, s) => s.nameNormalization || R.nameNormalization || {};
const CONTROLS = {
  swapvenue: { expect: 'CEI', apply(w, e) { const p = e.ledger.rounds[2][1]; e.ledger.rounds[2][1] = [p[1], p[0]]; } },
  droprow: { expect: 'ABCEI', apply(w, e) { e.ledger.rounds[4].splice(1, 1); } },
  twiceinround: { expect: 'BCEI', apply(w, e) { const r = e.ledger.rounds[6]; r[0] = [r[0][0], r[1][0]]; } },
  ghostclub: {
    expect: 'DI',
    apply(w, e) {
      const old = e.ledger.clubs[0];
      const mine = new Set(e.ledger.clubs);
      const ghost = w.leagues.filter(l => l.id !== e.ledger.leagueId).flatMap(l => l.clubs).find(c => !mine.has(c));
      if (!ghost) throw new Error('no club of another league to borrow');
      const swap = c => (c === old ? ghost : c);
      e.ledger.clubs = e.ledger.clubs.map(swap);
      e.ledger.rounds = e.ledger.rounds.map(r => r.map(p => p.map(swap)));
      for (const s of e.receipt.sources) {
        const table = { ...tableOf(e.receipt, s) };
        const spellings = new Set(s.rows.flatMap(r => [r.home, r.away]));
        for (const sp of spellings) if ((Object.hasOwn(table, sp) ? table[sp] : sp) === old) table[sp] = ghost;
        s.nameNormalization = table;
      }
    },
  },
  receiptdrift: { expect: 'E', apply(w, e) { const r = e.receipt.sources[1].rows[7]; [r.home, r.away] = [r.away, r.home]; } },
  samehost: {
    expect: 'F',
    apply(w, e) {
      const moved = `https://${hostOf(e.receipt.sources[0].url)}/another-page`;
      Object.assign(e.receipt.sources[1], { url: moved, citedUrl: moved });
      e.ledger.sources = [e.ledger.sources[0], { ...e.ledger.sources[1], url: moved }];
    },
  },
  wikihost: {
    expect: 'F',
    apply(w, e) {
      const moved = 'https://en.wikipedia.org/wiki/A_season';
      Object.assign(e.receipt.sources[1], { url: moved, citedUrl: moved });
      e.ledger.sources = [e.ledger.sources[0], { ...e.ledger.sources[1], url: moved }];
    },
  },
  datein: { expect: 'GI', apply(w, e) { e.ledger.rounds[0][0] = [...e.ledger.rounds[0][0], '2026-08-15']; } },
  extrakey: { expect: 'G', apply(w, e) { e.ledger.kickoffs = ['2026-08-15 17:30']; } },
  refreeze: {
    expect: 'I',
    apply(w, e) {
      /* Swap the venues of BOTH meetings of one pair of clubs, in the ledger and in every receipt row:
         still a whole double round robin, still equal to its receipt, and no longer the frozen list. */
      const [x, y] = e.ledger.rounds[0][0];
      for (const r of e.ledger.rounds) r.forEach((p, i) => { if ((p[0] === x && p[1] === y) || (p[0] === y && p[1] === x)) r[i] = [p[1], p[0]]; });
      for (const s of e.receipt.sources) {
        const table = tableOf(e.receipt, s);
        const map = name => (Object.hasOwn(table, name) ? table[name] : name);
        for (const r of s.rows) {
          const [h, a] = [map(r.home), map(r.away)];
          if ((h === x && a === y) || (h === y && a === x)) [r.home, r.away] = [r.away, r.home];
        }
      }
      if (e.receipt.ledgerDigest) e.receipt.ledgerDigest.sha256 = ledgerDigest(e.ledger);
    },
  },
  lostfile: { expect: 'I', apply(w, e) { w.entries.splice(w.entries.indexOf(e), 1); } },
  /* The rest damage what only a receipt of the tool's carries, so they run on the tool's ledgers (applies). */
  nosnapshot: { expect: 'E', applies: e => e.tool, apply(w, e) { delete e.receipt.sources[0].snapshot.sha256; } },
  noreadtime: { expect: 'E', applies: e => e.tool, apply(w, e) { delete e.receipt.sources[1].readAtUtc; } },
  falsefirstpub: { expect: 'E', applies: e => e.tool, apply(w, e) { e.receipt.asFirstPublished = !e.receipt.asFirstPublished; } },
  falseasof: {
    expect: 'E',
    applies: e => e.tool,
    apply(w, e) {
      /* The receipt is made to agree with itself, so only the working out from the parser and the stamps can see it. */
      const s = e.receipt.sources.find(x => x.listAsOf === 'release day') || e.receipt.sources[0];
      s.listAsOf = s.listAsOf === 'release day' ? 'read day' : 'release day';
      e.receipt.asFirstPublished = e.receipt.sources.some(x => x.listAsOf === 'release day');
    },
  },
  latechange: {
    expect: 'E',
    applies: e => e.tool && e.receipt.sources.some(s => s.listAsOf === 'release day'),
    apply(w, e) {
      const s = e.receipt.sources.find(x => x.listAsOf === 'release day');
      const [y, rest] = [Number(String(s.released).slice(0, 4)), String(s.released).slice(4)];
      if (!y) throw new Error('the release day source records no day its list came out');
      s.modified = `${y + 1}${rest}T09:00:00Z`;
    },
  },
  unfrozen: { expect: 'I', applies: e => e.tool, apply(w, e) { delete w.frozen.ledgers[e.ledger.key]; } },
  nodigest: { expect: 'I', applies: e => e.tool, apply(w, e) { delete e.receipt.ledgerDigest; } },
};
const appliesTo = (name, e) => !CONTROLS[name].applies || CONTROLS[name].applies(e);

/** Apply one control to one league on a copy. Returns { ok, why, reds }: ok only when exactly the expected sections of exactly that league went red. */
function runControl(name, leagueId) {
  const copy = structuredClone(world);
  const target = copy.entries.find(e => idOf(e) === leagueId);
  if (!target) return { ok: false, why: `no ledger for ${leagueId}`, reds: [] };
  if (!appliesTo(name, target)) return { ok: false, why: `it does not apply to ${leagueId} (its receipt has nothing for this control to damage)`, reds: [] };
  const before = JSON.stringify(copy);
  try {
    CONTROLS[name].apply(copy, target);
  } catch (err) {
    return { ok: false, why: `could not be applied: ${err.message}`, reds: [] };
  }
  if (JSON.stringify(copy) === before) return { ok: false, why: 'changed nothing', reds: [] };
  const reds = evaluate(copy);
  const elsewhere = [...new Set(reds.filter(r => r.id !== leagueId).map(r => `${r.id} ${r.section}`))];
  const got = [...new Set(reds.filter(r => r.id === leagueId).map(r => r.section))].sort().join('');
  if (elsewhere.length) return { ok: false, why: `another league went red: ${elsewhere.join(', ')}`, reds };
  if (got !== CONTROLS[name].expect) return { ok: false, why: `sections ${got || 'none'} went red, wanted exactly ${CONTROLS[name].expect}`, reds };
  return { ok: true, why: `sections ${got} went red for ${leagueId} and nothing else`, reds };
}

function printSections(reds) {
  for (const [section, title] of Object.entries(SECTIONS)) {
    const mine = reds.filter(r => r.section === section);
    console.log(`${section}) ${title}: ${mine.length ? `RED for ${[...new Set(mine.map(r => r.id))].join(', ')}` : `green for ${entries.length} ledger(s)`}`);
    mine.slice(0, 8).forEach(r => console.error(`  FAIL: ${r.id}: ${r.msg}`));
    if (mine.length > 8) console.error(`  FAIL: and ${mine.length - 8} more in this section`);
  }
}

const frozenEntries = entries.filter(e => e.frozen);
const pending = entries.filter(e => !e.frozen).map(idOf);
const fixtures = entries.reduce((sum, e) => sum + (e.ledger && Array.isArray(e.ledger.rounds) ? e.ledger.rounds.reduce((s, r) => s + r.length, 0) : 0), 0);
console.log(`simCmLeagueFixtures: ${entries.length} ledger(s) on disk${ONLY ? ` for ${ONLY}` : ''}: ${entries.map(idOf).join(', ') || 'none'}`);

if (CONTROL) {
  /* One fault left in place, so the run is red on purpose. Exit 1 = it fired exactly as written. Exit 3 = it did not. */
  const first = CONTROLS[CONTROL] && frozenEntries.find(e => appliesTo(CONTROL, e));
  const leagueId = CONTROL_LEAGUE || (first && idOf(first)) || '';
  if (!CONTROLS[CONTROL] || !leagueId) {
    console.error(`CONTROL ${CONTROL} COULD NOT RUN: ${CONTROLS[CONTROL] ? 'no frozen ledger on disk that it applies to' : `no such control, the controls are ${Object.keys(CONTROLS).join(', ')}`}`);
    process.exit(3);
  }
  console.log(`NEGATIVE CONTROL ON: ${CONTROL} on a copy of ${leagueId}, sections ${CONTROLS[CONTROL].expect} must go red and nothing else`);
  const result = runControl(CONTROL, leagueId);
  printSections(result.reds);
  if (!result.ok) {
    console.error(`CONTROL ${CONTROL} MISFIRED on ${leagueId}: ${result.why}`);
    process.exit(3);
  }
  console.error(`CONTROL ${CONTROL} FIRED as expected on ${leagueId}: ${result.why}`);
  process.exit(1);
}

const reds = evaluate(world);
printSections(reds);
let failures = reds.length;
if (EXPECT && Number(EXPECT) !== entries.length) {
  failures += 1;
  console.error(`  FAIL: the gate expects ${EXPECT} ledger(s) and ${entries.length} are on disk`);
}
if (EXPECT_FROZEN && Number(EXPECT_FROZEN) !== frozenEntries.length) {
  failures += 1;
  console.error(`  FAIL: the gate expects ${EXPECT_FROZEN} frozen ledger(s) and ${frozenEntries.length} of the ${entries.length} on disk have a frozen line`);
}
if (ONLY && !entries.length) {
  failures += 1;
  console.error(`  FAIL: CM_LEAGUE_FIXTURES_ONLY=${ONLY} matches no ledger on disk, so nothing was checked`);
}

/* K. the controls prove the sections above can fail, on every frozen ledger, on every run. */
let fired = 0;
let controlRuns = 0;
if (reds.length) {
  console.log('K) the controls: not run, the ledgers themselves are red');
} else {
  const misfires = [];
  const everRan = new Set();
  for (const e of frozenEntries) for (const name of Object.keys(CONTROLS)) {
    if (!appliesTo(name, e)) continue;
    controlRuns += 1;
    everRan.add(name);
    const result = runControl(name, idOf(e));
    if (result.ok) fired += 1; else misfires.push(`${name} on ${idOf(e)}: ${result.why}`);
  }
  console.log(`K) the controls: ${fired} of ${controlRuns} fired exactly as written (${everRan.size} of the ${Object.keys(CONTROLS).length} controls ran, each on every one of the ${frozenEntries.length} frozen ledger(s) it applies to)`);
  misfires.slice(0, 12).forEach(m => console.error(`  FAIL: control ${m}`));
  failures += misfires.length;
  /* A whole run (no league filter) must have run every control at least once, or a check has lost its control without anybody seeing. */
  const idle = Object.keys(CONTROLS).filter(name => !everRan.has(name));
  if (entries.length && !controlRuns) {
    failures += 1;
    console.error('  FAIL: no control ran: none of the ledgers checked has a frozen line, so nothing above was shown able to fail');
  } else if (!ONLY && idle.length && frozenEntries.some(e => e.tool)) {
    failures += 1;
    console.error(`  FAIL: ${idle.length} control(s) ran on no ledger at all: ${idle.join(', ')}`);
  }
}

const tail = `${entries.length} ledger(s), ${frozenEntries.length} frozen, ${pending.length} pending${pending.length ? ` (${pending.join(', ')})` : ''}, ${fixtures} fixtures, ${fired} of ${controlRuns} controls fired`;
if (!entries.length) console.log('NOTHING CHECKED: no ledger on disk. That is green only for a tree that holds no ledger yet.');
if (failures) {
  console.error(`simCmLeagueFixtures: FAILED, ${failures} failure(s): ${tail}`);
  process.exit(1);
}
console.log(`simCmLeagueFixtures: OK, sections A to G and I green: ${tail}`);
