/**
 * Round 1213: the one tool that writes a Club Manager real fixture ledger.
 *
 *   node scripts/genCmLeagueFixtures.mjs fetch <leagueId> [--dir <folder>]
 *   node scripts/genCmLeagueFixtures.mjs rows  <leagueId> [--dir <folder>]
 *   node scripts/genCmLeagueFixtures.mjs write <leagueId> [--dir <folder>] [--refreeze]
 *   node scripts/genCmLeagueFixtures.mjs check <leagueId> [--dir <folder>] [--record "<who read it>"]
 *
 * fetch saves both sources of a league as raw bytes (scripts/lib/cmFixtureSources/fetchRaw.mjs).
 * rows  parses the kept bytes with the committed parsers and prints counts and club spellings, never a list.
 * write does the whole proof and then writes the data file, the receipt and the
 *       frozen line. It writes NOTHING and exits 1 on any doubt (the list below).
 * check parses kept bytes (a reviewer's fresh read, in its own folder) and
 *       compares them with the ledger that is already committed. It writes
 *       nothing, unless --record is given AND the fresh read is a second read
 *       with no difference: then it writes that comparison into the receipt as
 *       its recheck (who, the day, the matchdays compared, the hash and the read
 *       moment of each source's fresh bytes). A recheck is never typed by hand.
 *
 * WHAT A LEDGER IS: for one league and one season, the matchday number, the
 * home club and the away club of every league match. Where one of the two
 * sources is a release day copy of the list, that is the list as first
 * published. Where both are pages kept up to date, it is the list as both
 * showed it on the day they were read: a match moved to another date keeps its
 * matchday there, but a change of ground made after the list came out would be
 * in it. The tool decides which from the sources (listAsOfFrom in build.mjs)
 * and the receipt and the data file's header say which (asFirstPublished).
 * No date, no kick off time, no score. A ledger is never typed and
 * never inferred: every row is parsed from kept bytes by a committed parser
 * (one file a source family under scripts/lib/cmFixtureSources/), and the two
 * sources of a league are parsed by two different parsers.
 *
 * write refuses when: a source spelling is not in the league's name table and
 * is not already a game spelling; a table does not land one to one on the
 * game's clubs for that league; the two sources differ in any matchday, home,
 * away tuple; a matchday does not hold every club exactly once; any ordered
 * pair of clubs is missing or repeated; the matchday count is not 2 x (n - 1);
 * a title or an address holds another company's product name or a long dash;
 * the ledger's frozen line already exists with another digest (--refreeze
 * allows that, and only before the key has shipped in a release).
 *
 * The snapshots stay outside the repo (CM_FIXTURE_RAW). The repo holds their
 * hashes, the parsers and this tool, so anybody with the bytes can rerun it.
 * The default snapshot folder is a folder on the owner's PC. On a machine that
 * does not have it every command stops and asks for --dir or CM_FIXTURE_RAW,
 * so a fetch can never put other publishers' pages inside the repo by accident.
 */
import fs from 'node:fs';
import path from 'node:path';
import { CM_FIXTURE_LEAGUES, cmFixtureLeague } from './lib/cmFixtureSources/leagues.mjs';
import { DEFAULT_RAW_ROOT, rawRoot, readSnapshot, saveSource } from './lib/cmFixtureSources/fetchRaw.mjs';
import { PARSERS, buildLedger, ledgerDigest } from './lib/cmFixtureSources/build.mjs';
import { dataFileText, frozenText, receiptText, refuseText } from './lib/cmFixtureSources/emit.mjs';
import { ROOT, gameLeagues, loadLedgers } from './lib/cmFixtureSources/gameBundle.mjs';

const [cmd, leagueId, ...rest] = process.argv.slice(2);
const dirArg = rest.indexOf('--dir') >= 0 ? rest[rest.indexOf('--dir') + 1] : null;
const FROZEN = path.join(ROOT, 'scripts/data/cmLeagueFixtures.frozen.json');

function die(msg) {
  console.error(`genCmLeagueFixtures: ${msg}`);
  process.exit(1);
}

const league = cmFixtureLeague(leagueId);
if (!['fetch', 'rows', 'write', 'check'].includes(cmd) || !league) {
  die(`usage: fetch|rows|write|check <leagueId>. Leagues: ${CM_FIXTURE_LEAGUES.map(l => l.leagueId).join(', ')}`);
}
if (!dirArg && !process.env.CM_FIXTURE_RAW && !fs.existsSync(DEFAULT_RAW_ROOT)) {
  die(`no snapshot folder. The default (${DEFAULT_RAW_ROOT}) is a folder on the owner's PC and this machine does not have it. Pass --dir <folder> or set CM_FIXTURE_RAW.`);
}
const dir = (dirArg || path.join(rawRoot(), league.leagueId)).replaceAll('\\', '/');

if (cmd === 'fetch') {
  let bad = 0;
  for (const source of league.sources) {
    for (const s of await saveSource(dir, source)) {
      if (s.error || s.status !== 200 || !s.bytes) bad += 1;
      console.log(`${league.leagueId} ${source.id}: ${s.error ? `ERROR ${s.error}` : `status ${s.status}, ${s.bytes} bytes, ${s.contentType}, sha256 ${s.sha256.slice(0, 16)}${s.kept ? ' (kept from an earlier read)' : ''}`} <- ${s.url}`);
    }
  }
  console.log(`${league.leagueId}: ${bad ? `${bad} page(s) could not be read` : 'both sources kept'} in ${dir}`);
  /* Not process.exit: on Windows that can abort inside a socket that is still closing. Let the loop drain. */
  process.exitCode = bad ? 1 : 0;
} else {
  await prove();
}

async function prove() {
  const gameLeague = (await gameLeagues()).find(l => l.id === league.leagueId);
  if (!gameLeague) die(`the game has no league with the id ${league.leagueId}`);

  if (cmd === 'rows') {
    console.log(`${league.leagueId}: the game's ${gameLeague.clubs.length} clubs: ${[...gameLeague.clubs].sort().join(' ; ')}`);
    league.sources.forEach((source, i) => {
      let parsed;
      try {
        parsed = PARSERS[source.parser].parse(readSnapshot(dir, source), source);
      } catch (e) {
        console.log(`${source.id}: CANNOT PARSE: ${e.message}`);
        return;
      }
      const perRound = new Map();
      parsed.rows.forEach(r => perRound.set(r.round, (perRound.get(r.round) || 0) + 1));
      const numbers = [...perRound.keys()].sort((a, b) => a - b);
      const spellings = [...new Set(parsed.rows.flatMap(r => [r.home, r.away]))].sort();
      const table = league.names[i] || {};
      const open = spellings.filter(s => !Object.hasOwn(table, s) && !gameLeague.clubs.includes(s));
      console.log(`${source.id}: ${parsed.rows.length} rows, matchdays ${numbers[0]} to ${numbers.at(-1)} (${numbers.length}), sizes ${[...new Set(perRound.values())].join(',')}, ${spellings.length} spellings, title: ${parsed.title ?? '(none)'}`);
      console.log(`${source.id}: spellings: ${spellings.join(' ; ')}`);
      console.log(`${source.id}: not yet mapped (${open.length}): ${open.join(' ; ') || 'none'}`);
    });
    process.exit(0);
  }

  const built = buildLedger(league, gameLeague, dir);
  if (built.problems) {
    console.error(`${league.leagueId}: NOTHING WRITTEN, ${built.problems.filter(p => !p.startsWith('  ')).length} reason(s):`);
    built.problems.slice(0, 60).forEach(p => console.error(`  ${p}`));
    if (built.problems.length > 60) console.error(`  and ${built.problems.length - 60} more line(s)`);
    process.exit(1);
  }
  const { ledger, receipt } = built;
  const digest = ledgerDigest(ledger);
  const receiptFile = path.join(ROOT, `scripts/data/${league.file}.receipt.json`);
  const before = fs.existsSync(receiptFile) ? JSON.parse(fs.readFileSync(receiptFile, 'utf8')) : null;
  const recordBy = rest.indexOf('--record') >= 0 ? rest[rest.indexOf('--record') + 1] : null;

  if (cmd === 'check') {
    const onDisk = (await loadLedgers([`src/data/${league.file}.ts`]))[0]?.ledger;
    if (!onDisk) die(`no committed ledger at src/data/${league.file}.ts to compare with`);
    const same = ledgerDigest(onDisk) === digest;
    const fresh = new Set(ledger.rounds.flatMap((r, i) => r.map(([h, a]) => `${i + 1}|${h}|${a}`)));
    const kept = new Set(onDisk.rounds.flatMap((r, i) => r.map(([h, a]) => `${i + 1}|${h}|${a}`)));
    const differences = [...fresh].filter(t => !kept.has(t)).length + [...kept].filter(t => !fresh.has(t)).length;
    console.log(`${league.leagueId}: fresh read in ${dir}: ${ledger.rounds.length} matchdays compared, ${differences} tuple difference(s), digest ${same ? 'equal' : 'DIFFERENT'} (${digest.slice(0, 16)})`);
    const agrees = same && differences === 0;
    if (agrees && recordBy) {
      /* The receipt's recheck is never typed: it is this comparison, written by the tool that made it, with
         the hash and the read moment of the second read's own bytes. Only a read that is NOT the one the
         receipt was written from counts, and only one with no difference is ever recorded. */
      if (!before || !before.ledgerDigest || before.ledgerDigest.sha256 !== digest) die(`${league.leagueId}: NOTHING RECORDED, the receipt on disk is not this ledger's`);
      if (receipt.sources.some((s, i) => s.readAtUtc === before.sources[i].readAtUtc)) die(`${league.leagueId}: NOTHING RECORDED, ${dir} holds the very read the receipt was written from, and a recheck is a second read`);
      before.recheck = {
        on: receipt.readOn,
        by: recordBy,
        how: 'Both sources fetched again into a folder of their own, parsed by the committed parsers, compared with the committed ledger by scripts/genCmLeagueFixtures.mjs check.',
        matchdaysCompared: ledger.rounds.length,
        differences,
        sources: receipt.sources.map(s => ({ label: s.label, readAtUtc: s.readAtUtc, bytes: s.snapshot.bytes, sha256: s.snapshot.sha256 })),
      };
      const text = receiptText(before);
      const why = refuseText('the receipt', text);
      if (why) die(`${league.leagueId}: NOTHING RECORDED, ${why}`);
      fs.writeFileSync(receiptFile, text);
      console.log(`${league.leagueId}: recorded as the receipt's recheck (read ${receipt.readOn}, ${differences} differences)`);
    }
    process.exit(agrees ? 0 : 1);
  }

  /* A reviewer's recheck is of the LIST. A write that leaves the list as it was (the same digest) keeps the
     recheck the receipt already holds; a write that changes the list drops it, because it was of another list. */
  if (before && before.recheck && before.ledgerDigest && before.ledgerDigest.sha256 === digest) receipt.recheck = before.recheck;
  const dataText = dataFileText(league, ledger, receipt);
  const recText = receiptText(receipt);
  for (const why of [refuseText('the data file', dataText), refuseText('the receipt', recText)]) if (why) die(`${league.leagueId}: NOTHING WRITTEN, ${why}`);
  const frozen = fs.existsSync(FROZEN) ? JSON.parse(fs.readFileSync(FROZEN, 'utf8')) : { ledgers: {} };
  const line = frozen.ledgers[ledger.key];
  if (line && line.sha256 !== digest && !rest.includes('--refreeze')) {
    die(`${league.leagueId}: NOTHING WRITTEN, ${ledger.key} is frozen as ${line.sha256.slice(0, 16)} and this read gives ${digest.slice(0, 16)}`);
  }
  frozen.ledgers[ledger.key] = { leagueId: ledger.leagueId, file: receipt.dataFile, receipt: `scripts/data/${league.file}.receipt.json`, clubs: ledger.clubs.length, rounds: ledger.rounds.length, fixtures: receipt.validation.matches, sha256: digest };
  fs.writeFileSync(path.join(ROOT, receipt.dataFile), dataText);
  fs.writeFileSync(path.join(ROOT, `scripts/data/${league.file}.receipt.json`), recText);
  fs.writeFileSync(FROZEN, frozenText(frozen));
  console.log(`${league.leagueId}: wrote ${receipt.dataFile} (${Buffer.byteLength(dataText)} bytes), its receipt (${Buffer.byteLength(recText)} bytes) and the frozen line ${digest.slice(0, 16)}: ${ledger.clubs.length} clubs, ${ledger.rounds.length} matchdays, ${receipt.validation.matches} fixtures, two sources agree on every tuple`);
}
