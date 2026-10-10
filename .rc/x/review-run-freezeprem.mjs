/* Reviewer probe: what happens the day Round Y adds the Premier League's line to the frozen file.
 * Run from the root of a tree that holds Round 1184's Premier ledger and this round's files. */
import fs from 'node:fs';
import { loadLedgers } from './scripts/lib/cmFixtureSources/gameBundle.mjs';
import { ledgerDigest } from './scripts/lib/cmFixtureSources/build.mjs';

const file = 'src/data/clubManagerPremierFixtures2026.ts';
const [entry] = await loadLedgers([file]);
if (!entry || !entry.ledger) { console.error('PROBE COULD NOT RUN: no Premier ledger in this tree'); process.exit(2); }
const F = JSON.parse(fs.readFileSync('scripts/data/cmLeagueFixtures.frozen.json', 'utf8'));
if (F.ledgers[entry.ledger.key]) { console.error('PROBE COULD NOT RUN: the line is already there'); process.exit(2); }
const fixtures = entry.ledger.rounds.reduce((s, r) => s + r.length, 0);
F.ledgers[entry.ledger.key] = {
  leagueId: entry.ledger.leagueId, file, receipt: 'scripts/data/clubManagerPremierFixtures2026.receipt.json',
  clubs: entry.ledger.clubs.length, rounds: entry.ledger.rounds.length, fixtures, sha256: ledgerDigest(entry.ledger),
};
fs.writeFileSync('scripts/data/cmLeagueFixtures.frozen.json', `${JSON.stringify(F, null, 2)}\n`);
console.log(`PROBE: froze ${entry.ledger.key} (${fixtures} fixtures) as ${ledgerDigest(entry.ledger).slice(0, 16)}`);
