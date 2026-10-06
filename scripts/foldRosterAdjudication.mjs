/**
 * Round 1015: fold the six roster adjudication shards into the ledger.
 *
 * Rounds 930 to 935 each read one slice of the ledger's pending rows on the
 * web (two source families per row, every page and read date on the row) and
 * wrote one file under scripts/data/rosterAdjudication2026-10/. This script is
 * the only way those verdicts reach scripts/data/rosterConfirmation2026.json,
 * which scripts/bakeClubManagerRosters.mjs reads and
 * scripts/simRosterAdjudication.mjs holds the shipped roster to.
 *
 * WHAT IT DOES. Every pending row of the ledger must be answered by exactly one
 * shard row: same name, same club (the shard's `club`, or `from` for a row that
 * left), from the shard that owns that club's league in REAL_LEAGUES of
 * src/lib/clubManager.ts. The ledger row then takes the shard's verdict, in the
 * statuses the ledger already has (confirmedStill, movedTo,
 * removedClubNotModelled, notCurrent, pending), with the shard's sources, notes
 * and loan fields unchanged. A row the shard left pending (its families
 * disagreed, or no official page could be read) stays pending with the shard's
 * newer note: it is never guessed into a status. Nothing else in the ledger is
 * touched.
 *
 * FAILS CLOSED, writing nothing, when: a pending row has no shard answer or two;
 * a shard row answers no pending row, or a row of a club its shard does not own;
 * a shard repeats a name; a settled row has fewer than two sources or one source
 * family; a move names a club the roster file does not have, or its own club; a
 * shard's recorded counts disagree with its rows; a status outside the five; or
 * the folded ledger repeats a name across statuses or no longer adds up to its
 * population.
 *
 * RE-RUNNABLE. Every row the fold writes carries `shard` (the file it came
 * from). A second run first takes those rows back out to rebuild the pending
 * set it started from, then folds again, so running it twice changes nothing.
 * The bake and the harness read only name, club, from and to, and ignore it.
 *
 * Run: node scripts/foldRosterAdjudication.mjs           (writes the ledger)
 *      node scripts/foldRosterAdjudication.mjs --check   (folds in memory, exits
 *        1 if the committed ledger differs from what the fold would write)
 * No database, no network: committed files only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = path.join(ROOT, 'scripts/data/rosterConfirmation2026.json');
const SHARD_DIR = path.join(ROOT, 'scripts/data/rosterAdjudication2026-10');
const CHECK = process.argv.includes('--check');

/* Which shard owns which REAL_LEAGUES ids, and the round that wrote it.
   `rest` owns every league no other shard names. */
const SHARDS = [
  { file: 'germany.json', round: 930, leagues: ['bundesliga', 'bundesliga2'] },
  { file: 'spain-portugal.json', round: 931, leagues: ['laliga', 'primeira'] },
  { file: 'italy-france.json', round: 932, leagues: ['seriea', 'ligue1'] },
  { file: 'england-mls.json', round: 933, leagues: ['premier', 'championship', 'mlsEast', 'mlsWest'] },
  { file: 'benelux-turkey.json', round: 934, leagues: ['proleague', 'eredivisie', 'superlig'] },
  { file: 'rest.json', round: 935, leagues: null },
];
const SETTLED = ['confirmedStill', 'movedTo', 'removedClubNotModelled', 'notCurrent'];
const STATUSES = [...SETTLED, 'pending'];
const SHARD_KEYS = new Set(['round', 'shard', 'adjudicatedOn', 'revisedOn', 'method', 'counts', 'forTheFold',
  'measuredRowCount', 'measuredRowCountByLeague', 'heldOnTwoPublishers', ...STATUSES]);
/* The club a row was adjudicated AT: where the bake had him. */
const clubOf = (status, row) => (status === 'confirmedStill' || status === 'pending' ? row.club : row.from);

/* NEGATIVE CONTROLS, in memory only (a control never writes). Each breaks one
   shard the way a bad hand edit would and must make the fold refuse with the
   message named here:
     FOLD_CONTROL=missing     germany.json loses its first movedTo row
     FOLD_CONTROL=twice       rest.json's first confirmedStill row copied into england-mls.json
     FOLD_CONTROL=onesource   germany.json's first movedTo row keeps one source
     FOLD_CONTROL=badmove     germany.json's first movedTo row sent to a club the game does not have */
const CONTROLS = {
  missing: { file: 'germany.json', expect: 'no shard answers it', edit: j => j.movedTo.shift() },
  twice: { file: 'england-mls.json', expect: 'not to this one', edit: (j, rest) => j.confirmedStill.push(rest.confirmedStill[0]) },
  onesource: { file: 'germany.json', expect: 'a settled row needs two', edit: j => { j.movedTo[0].sources = j.movedTo[0].sources.slice(0, 1); } },
  badmove: { file: 'germany.json', expect: 'does not have', edit: j => { j.movedTo[0].to = 'Nowhere Athletic'; } },
};
const CONTROL = process.env.FOLD_CONTROL || '';
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) { console.error(`FOLD_CONTROL=${CONTROL} is not a control this script knows`); process.exit(1); }

const errors = [];
const fail = m => errors.push(m);
const die = () => {
  if (CONTROL) {
    const hit = errors.some(e => e.includes(CONTROLS[CONTROL].expect));
    console.log(hit ? `CONTROL FIRED: ${CONTROL} refused with "${CONTROLS[CONTROL].expect}"` : `CONTROL ${CONTROL} refused, but not with "${CONTROLS[CONTROL].expect}": ${errors[0]}`);
    process.exit(hit ? 0 : 1);
  }
  console.error(`\nfoldRosterAdjudication: ${errors.length} problem(s), nothing written`);
  for (const e of errors.slice(0, 40)) console.error('  FAIL: ' + e);
  if (errors.length > 40) console.error(`  ...and ${errors.length - 40} more`);
  process.exit(1);
};

/* ------------------------------------------------------------------ */
/* Club to league, from the game's own league table                    */
/* ------------------------------------------------------------------ */
const cmSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
const start = cmSrc.indexOf('export const REAL_LEAGUES');
const end = cmSrc.indexOf('\n]', start); /* the array closes as `].map(leagueFromRow);` */
if (start < 0 || end < 0) { console.error('FATAL: cannot find REAL_LEAGUES in src/lib/clubManager.ts'); process.exit(1); }
const leagueSrc = cmSrc.slice(start, end);
const leagueOfClub = new Map();
const strRe = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
const unesc = s => s.replace(/\\(.)/g, '$1');
for (const m of leagueSrc.matchAll(/id: '(\w+)'[\s\S]*?clubs: \[([^\]]*)\]/g)) {
  const clubs = [...m[2].replace(/\/\/[^\n]*/g, '').matchAll(strRe)].map(x => unesc(x[1] ?? x[2]));
  if (!clubs.length) fail(`league ${m[1]} parsed with no clubs`);
  for (const c of clubs) {
    if (leagueOfClub.has(c)) fail(`${c} is in two leagues (${leagueOfClub.get(c)}, ${m[1]})`);
    leagueOfClub.set(c, m[1]);
  }
}
const leagueIds = new Set(leagueOfClub.values());
const owned = new Map();
for (const s of SHARDS) for (const l of s.leagues ?? []) {
  if (!leagueIds.has(l)) fail(`shard ${s.file} owns league ${l}, which REAL_LEAGUES does not have`);
  owned.set(l, s.file);
}
const ownerOfClub = club => {
  const l = leagueOfClub.get(club);
  return l ? owned.get(l) ?? 'rest.json' : null;
};

/* The clubs the bake can place a man at: every block of the shipped roster. */
const rosterSrc = fs.readFileSync(path.join(ROOT, 'src/data/clubManagerRosters.ts'), 'utf8').split('\r\n').join('\n');
const rosterClubs = new Set([...rosterSrc.matchAll(/^  '((?:[^'\\]|\\.)+)': \[$/gm)].map(m => unesc(m[1])));
if (rosterClubs.size < 300) fail(`only ${rosterClubs.size} club blocks read from src/data/clubManagerRosters.ts`);

/* ------------------------------------------------------------------ */
/* The ledger, and the pending set the fold starts from               */
/* ------------------------------------------------------------------ */
const ledgerText = fs.readFileSync(LEDGER, 'utf8').split('\r\n').join('\n');
const L = JSON.parse(ledgerText);
for (const s of STATUSES) if (!Array.isArray(L[s])) fail(`the ledger has no ${s} array`);
if (errors.length) die();
const before = Object.fromEntries(STATUSES.map(s => [s, L[s].filter(r => !r.shard).length]));
/* Rows an earlier run folded go back to the pending row they answered. */
const base = [];
for (const s of STATUSES) {
  for (const r of L[s]) if (r.shard) base.push({ name: r.name, club: clubOf(s, r) });
  L[s] = L[s].filter(r => !r.shard);
}
const priorFolded = base.length;
base.push(...L.pending.map(r => ({ name: r.name, club: r.club })));
before.pending += priorFolded;
const key = (name, club) => `${name}\u0000${club}`;
const baseKeys = new Map();
for (const r of base) {
  const k = key(r.name, r.club);
  if (baseKeys.has(k)) fail(`${r.name} at ${r.club} is pending twice`);
  baseKeys.set(k, null);
  if (!ownerOfClub(r.club)) fail(`${r.name} is pending at ${r.club}, which is in no league of REAL_LEAGUES`);
}

/* ------------------------------------------------------------------ */
/* The shards: each row checked, then matched to its pending row      */
/* ------------------------------------------------------------------ */
const out = Object.fromEntries(STATUSES.map(s => [s, []]));
const shardCounts = [];
for (const s of SHARDS) {
  const stem = s.file.replace(/\.json$/, '');
  const j = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, s.file), 'utf8'));
  if (CONTROL && CONTROLS[CONTROL].file === s.file) {
    const rest = JSON.parse(fs.readFileSync(path.join(SHARD_DIR, 'rest.json'), 'utf8'));
    const was = JSON.stringify(j);
    if (!j.movedTo?.[0]?.sources?.length || !rest.confirmedStill?.[0]) { console.error(`CONTROL ${CONTROL} refuses to run: the row it edits is not there`); process.exit(1); }
    CONTROLS[CONTROL].edit(j, rest);
    if (JSON.stringify(j) === was) { console.error(`CONTROL ${CONTROL} refuses to run: the edit changed nothing`); process.exit(1); }
    console.log(`NEGATIVE CONTROL ON: ${CONTROL} (${s.file})`);
  }
  if (j.round !== s.round) fail(`${s.file} says round ${j.round}, expected ${s.round}`);
  for (const k of Object.keys(j)) if (!SHARD_KEYS.has(k)) fail(`${s.file} has a key the fold does not know: ${k}`);
  const counts = Object.fromEntries(STATUSES.map(st => [st, (j[st] ?? []).length]));
  const rows = Object.values(counts).reduce((a, b) => a + b, 0);
  if (j.counts) {
    for (const st of STATUSES) if ((j.counts[st] ?? 0) !== counts[st]) fail(`${s.file} records ${j.counts[st]} ${st} but holds ${counts[st]}`);
    if (j.counts.rows !== rows) fail(`${s.file} records ${j.counts.rows} rows but holds ${rows}`);
  }
  if (j.measuredRowCount != null && j.measuredRowCount !== rows) fail(`${s.file} records ${j.measuredRowCount} rows but holds ${rows}`);
  shardCounts.push({ file: s.file, ...counts, rows });
  const names = new Set();
  for (const st of STATUSES) {
    for (const r of j[st] ?? []) {
      const club = clubOf(st, r);
      const who = `${s.file} ${st} ${r.name}`;
      if (!r.name || !club) { fail(`${who}: no name or no club`); continue; }
      if (names.has(r.name)) fail(`${who}: the name appears twice in this shard`);
      names.add(r.name);
      const owner = ownerOfClub(club);
      if (owner !== s.file) fail(`${who}: ${club} belongs to ${owner ?? 'no shard'}, not to this one`);
      if (st !== 'pending') {
        const src = r.sources ?? [];
        if (src.length < 2) fail(`${who}: ${src.length} source(s), a settled row needs two`);
        if (new Set(src.map(x => x.family)).size < 2) fail(`${who}: every source is one family, a settled row needs two`);
        if (!r.adjudicatedOn) fail(`${who}: no adjudicatedOn`);
      }
      if (st === 'movedTo') {
        if (!rosterClubs.has(r.to)) fail(`${who}: moves to ${r.to}, a club src/data/clubManagerRosters.ts does not have`);
        if (r.to === r.from) fail(`${who}: moves to his own club`);
      }
      if (st === 'removedClubNotModelled' && rosterClubs.has(r.realClub)) fail(`${who}: removed, but ${r.realClub} is a club the game models`);
      const k = key(r.name, club);
      if (!baseKeys.has(k)) { fail(`${who}: no pending row of ${r.name} at ${club}`); continue; }
      if (baseKeys.get(k)) { fail(`${who}: ${r.name} at ${club} is already answered by ${baseKeys.get(k)}`); continue; }
      baseKeys.set(k, s.file);
      out[st].push({ ...r, shard: stem });
    }
  }
}
for (const [k, by] of baseKeys) if (!by) fail(`${k.replace('\u0000', ' at ')} is pending and no shard answers it`);
if (errors.length) die();

/* ------------------------------------------------------------------ */
/* Assemble, check the whole ledger, write                            */
/* ------------------------------------------------------------------ */
for (const st of SETTLED) L[st] = [...L[st], ...out[st]];
L.pending = out.pending;
L.adjudicatorShards2026_10 = 'Web adjudication of every row still pending on 2026-10-03, in six shards read 2026-10-03 to 2026-10-05 '
  + '(Rounds 930 to 935: Germany; Spain and Portugal; Italy and France; England and MLS; Belgium, the Netherlands and Turkey; the rest), '
  + 'folded by Round 1015 through scripts/foldRosterAdjudication.mjs. Each folded row carries shard, the file under '
  + 'scripts/data/rosterAdjudication2026-10/ that holds its evidence and that shard\'s notes for the fold. A settled row has two '
  + 'sources from two families (A, the club\'s or the league\'s own page; B, an independent publisher on another host). A row the '
  + 'shard left pending, because its families disagreed or no official page could be read, stays pending with the shard\'s note and '
  + 'still ships at the club recorded here. Not folded: rest.json\'s heldOnTwoPublishers (Andreas Hansen confirmed at FC Nordsjælland, '
  + 'Topi Keskinen moved to OB), which the shard keeps pending for want of an official page.';
const seen = new Map();
for (const st of STATUSES) for (const r of L[st]) {
  if (seen.has(r.name)) fail(`${r.name} is in both ${seen.get(r.name)} and ${st} after the fold`);
  else seen.set(r.name, st);
}
const total = STATUSES.reduce((n, st) => n + L[st].length, 0);
if (total !== L.population) fail(`the folded ledger holds ${total} rows, the population is ${L.population}`);
if (errors.length) die();
if (CONTROL) { console.error(`CONTROL DID NOT FIRE: ${CONTROL} folded cleanly`); process.exit(1); }

console.log('Shard rows by status:');
for (const c of shardCounts) console.log(`  ${c.file.padEnd(20)} ${STATUSES.map(st => `${st} ${c[st]}`).join(', ')} (${c.rows} rows)`);
console.log('Ledger by status, before and after the fold:');
for (const st of STATUSES) console.log(`  ${st.padEnd(23)} ${String(before[st]).padStart(4)} -> ${String(L[st].length).padStart(4)}`);
console.log(`  ${'total'.padEnd(23)} ${String(STATUSES.reduce((n, st) => n + before[st], 0)).padStart(4)} -> ${String(total).padStart(4)} (population ${L.population})`);

const text = JSON.stringify(L, null, 1) + '\n';
if (CHECK) {
  if (text !== ledgerText) { console.error('\nfoldRosterAdjudication --check: the committed ledger is not what the fold writes. Run it without --check.'); process.exit(1); }
  console.log('\nfoldRosterAdjudication --check: the committed ledger is the fold of the six shards');
} else {
  fs.writeFileSync(LEDGER, text);
  console.log(`\nfoldRosterAdjudication: wrote ${path.relative(ROOT, LEDGER)}`);
}
