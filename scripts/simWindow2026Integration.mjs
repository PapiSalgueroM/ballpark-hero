/* Round 795 integration harness: the 2026 window research reaches the games,
   once per player, through one guarded migration.

   Rounds 735 to 740 researched the January and summer 2026 windows league by
   league (scripts/data/window2026/*.json). scripts/buildWindow2026.mjs keeps
   the rows that pass its rules and writes two files together: the overlay
   rows every bake reads (scripts/data/window2026/overlayAdditions.generated.mjs,
   appended to scripts/transferOverlay2026.mjs) and ONE unapplied migration
   (supabase/migrations/20261001170000_round_795_window_2026.sql). This
   harness holds the pair to the research and to the games:

     1. REBUILD. Re-running the builder on the research files and the live
        table writes both files byte for byte (only while the table is
        PENDING; once APPLIED the builder refuses to rewrite and so does this).
     2. TRACE. Every generated entry is a research row with exactly two https
        sources on two hosts (never Wikipedia), an allowed window (or, for a
        missing player, status verified and an insert block that agrees with
        the row), the same to and db in every file that names him, add data
        that is the research row's or his own 2026 row's, and a from club the
        table really carries. Every migration move, insert and stint is one of
        those entries. Written here again rather than calling the builder's
        rule function, so a builder bug cannot vouch for itself.
     3. ONCE. No player moves twice: entry names are unique exactly and
        accent and case folded, none repeats the hand written overlay, the
        migration's move, insert and stint lists name each man once, and no
        name is both moved and inserted.
     4. GUARDS RECOMPUTE. The migration's constants (expected_moves,
        expected_inserts, expected_stints, expected_rows_2026, hash_before,
        hash_after) and its three lists are recomputed from the generated
        entries, the research insert blocks and the live stint table, and
        must equal what the file says.
     5. NO WRITE WITHOUT ITS GUARD. The migration is read as code (comments
        cut): one DO block and nothing outside it; exactly three writes to
        public tables (the market row update, the market row insert, the stint
        insert) and no delete, truncate, alter, drop, grant, commit or dynamic
        SQL; every guard (list counts, the 2026 row count, the hash, the
        destinations, the inserts, the stints) comes before the first write;
        every write is followed at once by its row count check; the update
        keys on the year, the name AND the measured from club; the after
        checks (hash_after, the new row count) follow the last write.
     6. LIVE STATE. The table is the plan's before state (PENDING) or its
        after state (APPLIED); anything else is a partial apply or a table
        that moved under the plan.
     7. simTransferOverlay still passes (run as a child; its closing line and
        its exit code are both required).
     8. FOOTLE FALLBACK BAKE (scripts/bakePlayers.mjs, src/data/players.ts).
        A fresh bake, in memory, puts every window player in the pool at his
        verified club while the table row still says the old one (the bake
        reads the overlay); a bake over the table with the migration applied
        (a stand in: the live rows plus the plan's moves and inserts) agrees
        with it on every club, so the overlay and the migration say the same
        thing (only the inserted names may join). The committed file is not
        re-baked on this branch: the lead re-bakes it once the migration has
        landed, so it may sit behind the fresh bake, but only on window
        players; a club that differs for any other name fails here.
     9. FOOTLE LIVE POOL (src/lib/fetchFootlePlayerPool.ts, the real code,
        bundled). Served the migrated table, every window player in the pool
        sits at his verified club; served the table as it is, they do not.
        Prints how many of the next 366 daily answers (or the answer's club)
        the migration changes, which is why it is applied at an Eastern
        midnight.
    10. PLAYER BINGO (src/lib/playerBingo.ts, the real fetchBingoData).
        Served the migrated table, every window player in the pool sits at
        his verified club and his club history carries it; served the table
        as it is, the pool's clubs are the stale ones.
    11. TRANSFER PATH. Its graph is the career tables, which this migration
        does not touch; the overlay reaches it only as active identity
        evidence, and Round 795 holds that to the HAND list
        (scripts/genTransferPathHints.mjs and simTransferPathActiveIdentity
        import TRANSFER_OVERLAY_2026_HAND, read as code). The identities the
        window rows WOULD add are derived here and must be exactly
        TP_HELD below, a tripwire: a research file that grows a Transfer Path
        identity goes red here until a Transfer Path round reviews it.

   THE STAND IN (sections 9 and 10). While the migration is PENDING the real
   consumers are served the table as it will be: every REST read of
   player_market_values is re-issued with every column, the plan's moves are
   applied to the 2026 rows, rows the query's filters no longer match are
   dropped, moved and inserted rows that now match are merged in the query's
   own order, and the answer is cut to the query's limit and columns. A page
   it cannot serve exactly (a full page that lost a row) is counted and
   fails the section, so a green here never rests on a guess. Once APPLIED
   the live table is served as it is.

   FLOORS, measured 2026-10-01 with the table PENDING (deterministic counts,
   not samples; each floor sits near two thirds of the measure so a shrinking
   pool cannot read as green while an empty answer still fails):
     entries traced 396 (floor 264); window players in the Footle fallback
     pool 27 (floor 18); in the Footle live pool, with the stand in, 90
     (floor 60); in the Player Bingo pool, with the stand in, 10 of 482
     (floor 7). Bingo's pool is the top of the value ranking, where the hand
     list already carries most of the big moves, so the window rows reach
     only ten of it; seven of those ten sit at the old club in the table as
     it is, which is what the stale control fires on. Two full runs gave the
     same counts.

   NEGATIVE CONTROLS (SIM_WINDOW_CONTROL=<name>), each judged on its own
   section and refusing to run when what it rewrites is not there:
     drift      flips one window in the committed additions text in memory    -> 1
     onesource  drops a source from the research row behind the first entry   -> 2
     twice      adds a second entry for the first name at another club        -> 3
     guard      lowers expected_moves in the migration text by one            -> 4
     unguarded  adds an update with no row count check before the final notice -> 5
     moved      moves one planned row's live club to a third club in memory   -> 6
     footle     takes a window row that is in the Footle pool out of the
                overlay before the bake                                        -> 8
     stale      judges sections 9 and 10 on the table as it is instead of the
                stand in (needs a PENDING table)                               -> 9 and 10
     tpheld     empties TP_HELD                                               -> 11

   Needs the database (read only, the public REST endpoint, the URL and key
   in src/integrations/supabase/client.ts). Unreachable means it says so and
   exits red with nothing checked.

   Run: node scripts/simWindow2026Integration.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { TRANSFER_OVERLAY_2026, TRANSFER_OVERLAY_2026_HAND, WINDOW_2026_ADDITIONS } from './transferOverlay2026.mjs';
import {
  RESEARCH_FILES, ADDITIONS_REL, MIGRATION_REL,
  readResearch, buildPlan, renderAdditions, renderMigration, parseMigration,
  marketRows, stintRows, count2026, rest,
} from './buildWindow2026.mjs';
import { bake, fetchRows2026 } from './bakePlayers.mjs';
import { deriveVerifiedActiveIdentities, parseWorldCupIdentities } from './lib/transferPathActiveIdentities.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_WINDOW_CONTROL || '';
const OWN = {
  drift: [1], onesource: [2], twice: [3], guard: [4], unguarded: [5], moved: [6],
  footle: [8], stale: [9, 10], tpheld: [11],
};
if (CONTROL && !OWN[CONTROL]) { console.error(`unknown control "${CONTROL}" (${Object.keys(OWN).join(', ')})`); process.exit(1); }
const runs = s => !CONTROL || OWN[CONTROL].includes(s);

/* The identities the window rows would add to Transfer Path's active
   evidence, by identity key, measured 2026-10-01. See section 11. */
const TP_HELD = ['alvaro morata|spain'];

const FLOOR = { traced: 264, footleFallback: 18, footleLive: 60, bingo: 7 };
const WINDOWS = new Set(['2026-01', '2026-summer']);

const failures = {};
let section = 0;
const fail = m => { failures[section] = (failures[section] || 0) + 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const head = (n, title) => { section = n; console.log(`${n}) ${title}`); };

const lf = t => t.replace(/\r\n/g, '\n');
const md5 = s => crypto.createHash('md5').update(s, 'utf8').digest('hex');
const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const clone = x => JSON.parse(JSON.stringify(x));
const groupBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) (m.get(key(r)) ?? m.set(key(r), []).get(key(r))).push(r);
  return m;
};

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-w26i-'));
const ADD_PATH = path.join(ROOT, ADDITIONS_REL);
const MIG_PATH = path.join(ROOT, MIGRATION_REL);

/* ------------------------------------------------------------------ */
/* Inputs                                                             */
/* ------------------------------------------------------------------ */
const entries = WINDOW_2026_ADDITIONS.map(e => clone(e));
let migText = lf(fs.readFileSync(MIG_PATH, 'utf8'));
if (CONTROL === 'guard') {
  const m = migText.match(/expected_moves constant integer := (\d+);/);
  if (!m) abort('control cannot run: no expected_moves constant in the migration');
  migText = migText.replace(m[0], `expected_moves constant integer := ${Number(m[1]) - 1};`);
  console.log(`   NEGATIVE CONTROL ON: expected_moves lowered from ${m[1]} to ${Number(m[1]) - 1} in memory`);
}
if (CONTROL === 'unguarded') {
  const anchor = "  raise notice 'Round 795:";
  if (!migText.includes(anchor)) abort('control cannot run: the final notice is not in the migration');
  migText = migText.replace(anchor, "  update public.player_market_values set club = 'Round 795 control FC' where year = 2026 and player_name = 'Rodri';\n" + anchor);
  console.log('   NEGATIVE CONTROL ON: an update with no row count check sits before the final notice, in memory');
}
const mig = parseMigration(migText);
if (!mig.moves.length || mig.expectedMoves === undefined) abort('the migration did not parse: no move list or no expected_moves constant');

const moveNames = mig.moves.map(m => m.name);
const insertNames = mig.inserts.map(i => i.name);

/* The 2026 rows of every moving and inserted name, and the count. */
console.log(`reading the table: ${moveNames.length + insertNames.length} planned names, ${entries.length} entries`);
const live2026 = await marketRows([...new Set([...moveNames, ...insertNames, ...entries.map(e => e.name)])], [2026]);
const live2026By = groupBy(live2026, r => r.player_name);
const liveTotal = await count2026();

/* ------------------------------------------------------------------ */
/* 6 first, as data: the state every other section reads              */
/* ------------------------------------------------------------------ */
function classify(byName, total) {
  let atFrom = 0, atTo = 0, insPresent = 0, insAbsent = 0;
  const odd = [];
  for (const m of mig.moves) {
    const list = byName.get(m.name) || [];
    if (list.length === 1 && list[0].club === m.from) atFrom += 1;
    else if (list.length === 1 && list[0].club === m.to) atTo += 1;
    else odd.push(`${m.name}: ${list.map(r => r.club).join(' | ') || 'no 2026 row'} (plan ${m.from} to ${m.to})`);
  }
  for (const i of mig.inserts) {
    const list = byName.get(i.name) || [];
    if (list.length === 0) insAbsent += 1;
    else if (list.length === 1 && list[0].club === i.club) insPresent += 1;
    else odd.push(`${i.name}: ${list.map(r => r.club).join(' | ')} (insert at ${i.club})`);
  }
  const hash = md5(mig.moves.map(m => `${m.name}|${(byName.get(m.name) || [])[0]?.club ?? ''}`).join('\n'));
  let state = 'MOVED';
  if (!odd.length && atTo === 0 && insPresent === 0 && hash === mig.hashBefore && total === mig.expectedRows2026) state = 'PENDING';
  if (!odd.length && atFrom === 0 && insAbsent === 0 && hash === mig.hashAfter && total === mig.expectedRows2026 + mig.expectedInserts) state = 'APPLIED';
  return { state, atFrom, atTo, insPresent, insAbsent, odd, hash };
}
const STATE = classify(live2026By, liveTotal).state;
console.log(`   the table is ${STATE}\n`);

/* ------------------------------------------------------------------ */
/* 1. Rebuild                                                         */
/* ------------------------------------------------------------------ */
if (runs(1)) {
  head(1, 'The builder writes both committed files again, byte for byte');
  if (STATE !== 'PENDING') {
    if (CONTROL === 'drift') abort('control cannot run: the table is not PENDING, so nothing is rebuilt');
    console.log(`   the table is ${STATE}: the plan is history and the builder refuses to rewrite it; not rebuilt`);
  } else {
    let committedAdd = lf(fs.readFileSync(ADD_PATH, 'utf8'));
    if (CONTROL === 'drift') {
      if (!committedAdd.includes('"window":"2026-01"')) abort('control cannot run: no 2026-01 window in the committed additions');
      committedAdd = committedAdd.replace('"window":"2026-01"', '"window":"2026-summer"');
      console.log('   NEGATIVE CONTROL ON: one entry\'s window flipped in the committed additions text, in memory');
    }
    const committedMig = lf(fs.readFileSync(MIG_PATH, 'utf8'));
    const plan = await buildPlan();
    const a = renderAdditions(plan), m = renderMigration(plan);
    if (a !== committedAdd) fail(`${ADDITIONS_REL} is not what the builder writes from the research files and the table; re-run node scripts/buildWindow2026.mjs`);
    if (m !== committedMig) fail(`${MIGRATION_REL} is not what the builder writes from the research files and the table; re-run node scripts/buildWindow2026.mjs`);
    console.log(`   rebuilt: ${plan.additions.length} entries, ${plan.moves.length} moves, ${plan.inserts.length} inserts, ${plan.stints.length} stints, ${plan.refused.length} refused; additions ${a === committedAdd ? 'identical' : 'DIFFER'}, migration ${m === committedMig ? 'identical' : 'DIFFERS'}`);
  }
}

/* ------------------------------------------------------------------ */
/* 2. Trace                                                           */
/* ------------------------------------------------------------------ */
const research = readResearch();
const researchBy = new Map(research.map(f => [f.key, f]));
const kindOf = key => RESEARCH_FILES.find(f => f.key === key)?.kind;
if (runs(2)) {
  head(2, 'Every entry is a two source research row, and every planned write is an entry');
  if (CONTROL === 'onesource') {
    const e = entries[0];
    const row = researchBy.get(e.research[0])?.rows.find(r => r?.name === e.name);
    if (!row || !Array.isArray(row.sources) || row.sources.length !== 2) abort('control cannot run: the first entry\'s research row does not carry two sources');
    row.sources = row.sources.slice(0, 1);
    console.log(`   NEGATIVE CONTROL ON: ${e.name}'s research row in ${e.research[0]} keeps one source, in memory`);
  }
  const twoHosts = (srcs, who) => {
    if (!Array.isArray(srcs) || srcs.length !== 2) { fail(`${who}: ${Array.isArray(srcs) ? srcs.length : 'no'} sources, the rule is exactly two`); return; }
    if (srcs.some(u => typeof u !== 'string' || !u.startsWith('https://') || !hostOf(u))) fail(`${who}: a source is not a parseable https URL`);
    const hosts = srcs.map(hostOf);
    if (hosts[0] === hosts[1]) fail(`${who}: both sources on ${hosts[0]}`);
    if (hosts.some(h => h === 'wikipedia.org' || h.endsWith('.wikipedia.org'))) fail(`${who}: Wikipedia is never a source`);
  };
  let traced = 0;
  const byName = new Map(entries.map(e => [e.name, e]));
  for (const e of entries) {
    const who = `${e.name} (${(e.research || []).join(', ')})`;
    if (!Array.isArray(e.research) || e.research.length === 0) { fail(`${e.name}: names no research file`); continue; }
    const rows = [];
    for (const key of e.research) {
      const hits = (researchBy.get(key)?.rows || []).filter(r => r?.name === e.name);
      if (hits.length !== 1) { fail(`${who}: ${hits.length} rows in ${key}, expected exactly one`); continue; }
      rows.push(hits[0]);
    }
    if (rows.length !== e.research.length) continue;
    const first = rows[0];
    const kind = kindOf(e.research[0]);
    for (const [i, r] of rows.entries()) {
      twoHosts(r.sources, `${e.name} in ${e.research[i]}`);
      if (r.to !== e.to || r.db !== e.db) fail(`${who}: ${e.research[i]} says to ${JSON.stringify(r.to)} db ${JSON.stringify(r.db)}, the entry says ${JSON.stringify(e.to)} ${JSON.stringify(e.db)}`);
      if (r.dbAbsent || r.dbMissing) fail(`${who}: ${e.research[i]} flags its own db spelling as absent`);
    }
    if (JSON.stringify(first.sources) !== JSON.stringify(e.sources)) fail(`${who}: the entry's sources are not the first research row's`);
    if (kind === 'move') {
      if (!WINDOWS.has(first.window)) fail(`${who}: window ${JSON.stringify(first.window)} is not 2026-01 or 2026-summer`);
    } else {
      if (first.status !== 'verified') fail(`${who}: a missing player row with status ${JSON.stringify(first.status)}`);
      if ('window' in first && !WINDOWS.has(first.window)) fail(`${who}: window ${JSON.stringify(first.window)}`);
      const ins = first.insert || {};
      if (ins.player_name !== e.name || ins.club !== e.db || ins.year !== 2026 || ins.position !== first.add?.p || ins.age !== first.add?.a || ins.market_value_usd !== first.add?.usd || !String(ins.nationality || '').trim()) {
        fail(`${who}: the insert block does not agree with the row`);
      }
    }
    if ((first.window ?? null) !== (e.window ?? null)) fail(`${who}: window ${JSON.stringify(e.window)} is not the research row's ${JSON.stringify(first.window)}`);
    const want = rows.every(r => r.loan === true);
    if (!!e.loan !== want) fail(`${who}: loan ${!!e.loan}, the research rows say ${rows.map(r => !!r.loan).join('/')}`);
    const own = live2026By.get(e.name) || [];
    if (e.addDerived) {
      if (first.add) fail(`${who}: addDerived, but the research row carries add data`);
      if (STATE === 'PENDING') {
        const r = own.length === 1 ? own[0] : null;
        if (!r || !e.add || e.add.p !== r.position || e.add.a !== r.age || e.add.usd !== Number(r.market_value_usd)) fail(`${who}: derived add ${JSON.stringify(e.add)} is not his own 2026 row`);
      }
    } else if (first.add) {
      const a = first.add;
      if (!e.add || e.add.p !== a.p || e.add.a !== a.a || e.add.usd !== a.usd) fail(`${who}: add ${JSON.stringify(e.add)} is not the research row's ${JSON.stringify(a)}`);
    } else if (e.add) fail(`${who}: add data no research row carries`);
    if (STATE === 'PENDING') {
      const club = own.length === 1 ? own[0].club : own.length === 0 ? null : 'MANY';
      if (club !== e.from) fail(`${who}: from ${JSON.stringify(e.from)}, the table's 2026 row says ${JSON.stringify(club)}`);
    } else if (STATE === 'APPLIED' && e.from !== null) {
      if (own.length !== 1 || own[0].club !== e.db) fail(`${who}: applied, but the 2026 row says ${own.map(r => r.club).join(' | ') || 'nothing'}`);
    }
    traced += 1;
  }
  for (const m of mig.moves) {
    const e = byName.get(m.name);
    if (!e || e.from !== m.from || e.db !== m.to) fail(`migration move ${m.name} (${m.from} to ${m.to}) is not an entry's from and db`);
  }
  for (const i of mig.inserts) {
    const e = byName.get(i.name);
    const r = e && kindOf(e.research[0]) === 'missing' ? (researchBy.get(e.research[0])?.rows || []).find(x => x?.name === i.name) : null;
    const ins = r?.insert;
    if (!ins || ins.club !== i.club || ins.position !== i.position || ins.age !== i.age || ins.nationality !== i.nationality || ins.market_value_usd !== i.usd) fail(`migration insert ${i.name} is not a verified missing players row's insert block`);
  }
  for (const s of mig.stints) {
    const e = byName.get(s.name);
    if (!e || !e.window || e.db !== s.club) fail(`migration stint ${s.name} at ${s.club} is not a window entry's club`);
  }
  if (traced < FLOOR.traced) fail(`only ${traced} entries traced, the floor is ${FLOOR.traced}`);
  console.log(`   ${traced} of ${entries.length} entries traced to two source research rows; ${mig.moves.length} moves, ${mig.inserts.length} inserts and ${mig.stints.length} stints traced to entries`);
}

/* ------------------------------------------------------------------ */
/* 3. Once                                                            */
/* ------------------------------------------------------------------ */
if (runs(3)) {
  head(3, 'No player moves twice');
  const list = entries.map(e => ({ ...e }));
  if (CONTROL === 'twice') {
    const other = list.find(e => e.db !== list[0].db);
    if (!other) abort('control cannot run: every entry has the same club');
    list.push({ ...list[0], db: other.db, to: other.to });
    console.log(`   NEGATIVE CONTROL ON: a second ${list[0].name} entry at ${other.db}, in memory`);
  }
  const dupes = (xs, key) => [...groupBy(xs, key).entries()].filter(([, v]) => v.length > 1).map(([k]) => k);
  for (const n of dupes(list, e => e.name)) fail(`${n} has more than one entry`);
  for (const n of dupes(list, e => fold(e.name))) if (!dupes(list, e => e.name).some(x => fold(x) === n)) fail(`two entries fold to "${n}"`);
  const hand = new Set(TRANSFER_OVERLAY_2026_HAND.map(e => e.name));
  const handFold = new Set(TRANSFER_OVERLAY_2026_HAND.map(e => fold(e.name)));
  for (const e of list) {
    if (hand.has(e.name)) fail(`${e.name} is in the hand written overlay as well`);
    else if (handFold.has(fold(e.name))) fail(`${e.name} folds to a name in the hand written overlay`);
  }
  for (const n of dupes(mig.moves, m => m.name)) fail(`the migration moves ${n} twice`);
  for (const n of dupes(mig.inserts, i => i.name)) fail(`the migration inserts ${n} twice`);
  for (const n of dupes(mig.stints, s => s.name)) fail(`the migration writes ${n} a 2026 stint at two clubs`);
  const moved = new Set(moveNames);
  for (const n of insertNames) if (moved.has(n)) fail(`${n} is both moved and inserted`);
  /* One man, one destination, across every research file. */
  const allRows = research.flatMap(f => f.rows.map(r => ({ ...r, file: f.key }))).filter(r => typeof r?.name === 'string');
  const accepted = new Set(list.map(e => e.name));
  for (const [n, rs] of groupBy(allRows, r => r.name)) {
    if (!accepted.has(n)) continue;
    const dest = new Set(rs.map(r => `${r.to}|${r.db}`));
    if (dest.size > 1) fail(`${n}: the research files send him to ${[...dest].join(' and ')}, yet an entry was written`);
  }
  console.log(`   ${list.length} entries, ${new Set(list.map(e => fold(e.name))).size} distinct folded names, ${hand.size} hand names untouched; ${mig.moves.length} moves, ${mig.inserts.length} inserts, ${mig.stints.length} stints, each name once`);
}

/* ------------------------------------------------------------------ */
/* 4. The guards recompute from the files                             */
/* ------------------------------------------------------------------ */
if (runs(4)) {
  head(4, 'The migration\'s lists and guard constants recompute from the files');
  const moves = entries.filter(e => e.from !== null && e.from !== e.db).map((e, i) => ({ seq: i + 1, name: e.name, from: e.from, to: e.db }));
  const inserts = entries.filter(e => kindOf(e.research[0]) === 'missing').map((e, i) => {
    const ins = (researchBy.get(e.research[0])?.rows || []).find(r => r?.name === e.name)?.insert || {};
    return { seq: i + 1, name: e.name, position: ins.position, age: ins.age, nationality: ins.nationality, club: ins.club, usd: ins.market_value_usd };
  });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(moves, mig.moves)) fail(`the move list (${mig.moves.length}) is not the entries whose from differs from db (${moves.length})`);
  if (!same(inserts, mig.inserts)) fail(`the insert list (${mig.inserts.length}) is not the verified missing players rows (${inserts.length})`);
  if (mig.expectedMoves !== moves.length) fail(`expected_moves is ${mig.expectedMoves}, the entries give ${moves.length}`);
  if (mig.expectedInserts !== inserts.length) fail(`expected_inserts is ${mig.expectedInserts}, the entries give ${inserts.length}`);
  if (mig.expectedStints !== mig.stints.length) fail(`expected_stints is ${mig.expectedStints}, the list holds ${mig.stints.length}`);
  const hb = md5(moves.map(m => `${m.name}|${m.from}`).join('\n'));
  const ha = md5(moves.map(m => `${m.name}|${m.to}`).join('\n'));
  if (hb !== mig.hashBefore) fail(`hash_before is ${mig.hashBefore}, the entries give ${hb}`);
  if (ha !== mig.hashAfter) fail(`hash_after is ${mig.hashAfter}, the entries give ${ha}`);
  const windowed = entries.filter(e => e.window);
  const stints = await stintRows(windowed.map(e => e.name));
  const stBy = groupBy(stints, s => s.player_name);
  if (STATE === 'PENDING') {
    if (mig.expectedRows2026 !== liveTotal) fail(`expected_rows_2026 is ${mig.expectedRows2026}, the table holds ${liveTotal}`);
    const plan = windowed.filter(e => {
      const own = stBy.get(e.name) || [];
      return own.length > 0 && !own.some(s => s.club === e.db && s.first_year <= 2026 && 2026 <= s.last_year);
    }).map((e, i) => ({ seq: i + 1, name: e.name, club: e.db }));
    if (!same(plan, mig.stints)) fail(`the stint list (${mig.stints.length}) is not the window entries with a stint history and no 2026 stint at the new club (${plan.length})`);
    const noHistory = windowed.filter(e => !(stBy.get(e.name) || []).length).length;
    console.log(`   moves ${moves.length}, inserts ${inserts.length}, stints ${plan.length} (${noHistory} window movers have no stint row to copy from), 2026 rows ${liveTotal}; hashes ${hb.slice(0, 8)} and ${ha.slice(0, 8)}`);
  } else {
    if (STATE === 'APPLIED' && mig.expectedRows2026 + mig.expectedInserts !== liveTotal) fail(`expected_rows_2026 plus the inserts is ${mig.expectedRows2026 + mig.expectedInserts}, the table holds ${liveTotal}`);
    const uncovered = mig.stints.filter(s => !(stBy.get(s.name) || []).some(x => x.club === s.club && x.first_year <= 2026 && 2026 <= x.last_year));
    if (STATE === 'APPLIED' && uncovered.length) fail(`${uncovered.length} planned stints are not in the table after the apply`);
    console.log(`   ${STATE}: moves ${moves.length}, inserts ${inserts.length}, ${mig.stints.length - uncovered.length} of ${mig.stints.length} stints covered`);
  }
}

/* ------------------------------------------------------------------ */
/* 5. No write without its guard                                      */
/* ------------------------------------------------------------------ */
/** Statements of a plpgsql body, split on semicolons outside quotes. */
function statements(body) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (ch === "'") { q = !q; cur += ch; continue; }
    if (ch === ';' && !q) { out.push(cur.replace(/\s+/g, ' ').trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.replace(/\s+/g, ' ').trim());
  return out.filter(Boolean);
}
const unquote = s => s.replace(/'(?:[^']|'')*'/g, "''");
if (runs(5)) {
  head(5, 'Every write to a public table sits behind its guards and its row count check');
  const code = migText.split('\n').filter(l => !/^\s*--/.test(l)).join('\n');
  const doMatch = code.match(/^do \$migration\$\n([\s\S]*)\n\$migration\$;\s*$/m);
  if (!doMatch) fail('the migration is not one DO block');
  const outside = doMatch ? code.replace(doMatch[0], '').trim() : code;
  if (outside) fail(`statements outside the DO block: ${outside.slice(0, 80)}`);
  const body = doMatch ? doMatch[1].replace(/^declare[\s\S]*?\nbegin\n/, '').replace(/\nend\s*$/, '') : '';
  const st = statements(body).map(s => ({ s, bare: unquote(s).toLowerCase() }));
  const isWrite = x => /^(update|insert into|delete from|truncate|merge into|alter|drop|create|grant|revoke|copy)\b/.test(x.bare)
    && !/^create temporary table r795_\w+ /.test(x.bare) && !/^insert into r795_\w+ /.test(x.bare);
  const writes = st.map((x, i) => ({ ...x, i })).filter(isWrite);
  const wantWrites = [/^update public\.player_market_values m set club = o\.to_club from r795_moves o where m\.year = 2026 and m\.player_name = o\.player_name and m\.club = o\.from_club$/,
    /^insert into public\.player_market_values \(/, /^insert into public\.soccer_player_club_stints \(/];
  if (writes.length !== wantWrites.length) fail(`${writes.length} writes to tables other than the plan's temp lists, the plan has ${wantWrites.length}: ${writes.map(w => w.s.slice(0, 60)).join(' | ')}`);
  wantWrites.forEach((re, k) => { if (!writes[k] || !re.test(writes[k].bare)) fail(`write ${k + 1} is not ${re.source.slice(1, 60)}...`); });
  for (const w of writes) {
    const next = st[w.i + 1]?.bare || '', after = st[w.i + 2]?.bare || '';
    if (next !== 'get diagnostics n = row_count') fail(`no row count read right after: ${w.s.slice(0, 60)}`);
    if (!/^if n <> expected_\w+ then raise exception /.test(after)) fail(`no row count check against an expected count right after: ${w.s.slice(0, 60)}`);
  }
  for (const x of st) {
    if (/^(commit|rollback|savepoint|end transaction|begin transaction)\b/.test(x.bare)) fail(`a transaction statement inside the block: ${x.s.slice(0, 40)}`);
    if (/\bexecute\b/.test(x.bare) || /security definer/.test(x.bare)) fail(`dynamic SQL or a definer in the block: ${x.s.slice(0, 60)}`);
    if (/^create temporary table/.test(x.bare) && !/on commit drop$/.test(x.bare)) fail(`a temp table that outlives the transaction: ${x.s.slice(0, 60)}`);
    if (/^if /.test(x.bare) && !/ then raise exception /.test(x.bare)) fail(`a check that does not raise: ${x.s.slice(0, 60)}`);
  }
  const firstWrite = writes.length ? writes[0].i : st.length;
  const lastWrite = writes.length ? writes[writes.length - 1].i : -1;
  const before = st.slice(0, firstWrite).map(x => x.bare).join('\n');
  const afterAll = st.slice(lastWrite + 1).map(x => x.bare).join('\n');
  for (const g of ['if n <> expected_moves then', 'if n <> expected_inserts then', 'if n <> expected_stints then', 'if n <> expected_rows_2026 then', 'if h is distinct from hash_before then']) {
    if (!before.includes(g)) fail(`guard "${g}" is not before the first write`);
  }
  const zeroGuards = (before.match(/if n <> 0 then raise exception/g) || []).length;
  if (zeroGuards < 6) fail(`${zeroGuards} zero count guards before the first write, the plan has 6 (named rows at from, destinations, inserts, stint history, stint namesakes, stint not yet there)`);
  for (const g of ['if h is distinct from hash_after then', 'if n <> expected_rows_2026 + expected_inserts then']) {
    if (!afterAll.includes(g)) fail(`after check "${g}" does not follow the last write`);
  }
  console.log(`   ${st.length} statements, ${writes.length} writes to public tables, each followed by its row count check; ${zeroGuards + 5} guards before the first write`);
}

/* ------------------------------------------------------------------ */
/* 6. Live state                                                      */
/* ------------------------------------------------------------------ */
if (runs(6)) {
  head(6, 'The table is the plan\'s before state or its after state, never a mix');
  let by = live2026By;
  if (CONTROL === 'moved') {
    const m = mig.moves.find(x => (live2026By.get(x.name) || []).length === 1);
    if (!m) abort('control cannot run: no planned move with one 2026 row');
    by = new Map([...live2026By].map(([k, v]) => [k, v.map(r => ({ ...r }))]));
    by.get(m.name)[0].club = 'Round 795 control FC';
    console.log(`   NEGATIVE CONTROL ON: ${m.name}'s 2026 row moved to a third club, in memory`);
  }
  const c = classify(by, liveTotal);
  if (c.state === 'MOVED') fail(`the table is neither the plan's before nor its after state (${c.atFrom} at from, ${c.atTo} at the new club, ${c.insAbsent} inserts absent, ${c.insPresent} present, ${liveTotal} rows for 2026): ${c.odd.slice(0, 5).join('; ')}`);
  console.log(`   ${c.state}: ${c.atFrom} rows at the measured club, ${c.atTo} at the verified one, ${c.insAbsent} inserts to come, ${c.insPresent} in; ${liveTotal} rows for 2026`);
}

/* ------------------------------------------------------------------ */
/* 7. simTransferOverlay                                              */
/* ------------------------------------------------------------------ */
if (runs(7)) {
  head(7, 'simTransferOverlay still passes');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'simTransferOverlay.mjs')], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, SIM_OVERLAY_CONTROL: '' }, maxBuffer: 32 * 1024 * 1024 });
  const out = (r.stdout || '') + (r.stderr || '');
  const closing = out.trim().split('\n').pop();
  if (r.status !== 0 || !/^simTransferOverlay: all green$/.test(closing)) fail(`simTransferOverlay exit ${r.status}, closing line "${closing}"`);
  const gen = out.match(/generated window moves: (\d+) pending \(migration unapplied\), (\d+) applied/);
  console.log(`   exit ${r.status}, "${closing}"${gen ? `; it sees ${gen[1]} generated moves pending, ${gen[2]} applied` : ''}`);
}

/* ------------------------------------------------------------------ */
/* The stand in: the table as the migration leaves it                 */
/* ------------------------------------------------------------------ */
const CAP = 1000; // PostgREST answers at most this many rows
let SERVE = 'live';
const inexact = { pages: 0 };
let post = null;
async function preparePost() {
  if (post) return post;
  const full = [];
  for (let i = 0; i < moveNames.length; i += 40) {
    const inList = encodeURIComponent(moveNames.slice(i, i + 40).map(n => `"${n.replace(/"/g, '\\"')}"`).join(','));
    full.push(...(await rest(`player_market_values?select=*&year=eq.2026&player_name=in.(${inList})&limit=1000`)).rows);
  }
  const fromBy = new Map(mig.moves.map(m => [m.name, m]));
  const moverRows = full.filter(r => fromBy.get(r.player_name)?.from === r.club).map(r => ({ ...r, club: fromBy.get(r.player_name).to }));
  if (moverRows.length !== mig.moves.length) abort(`the stand in found ${moverRows.length} of ${mig.moves.length} moving rows at their measured club`);
  const maxId = (await rest('player_market_values?select=id&order=id.desc&limit=1')).rows[0].id;
  const insertRows = mig.inserts.map((i, k) => ({
    rank: null, player_name: i.name, position: i.position, age: i.age, nationality: i.nationality, club: i.club,
    market_value_usd: i.usd, matches: null, year: 2026, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0,
    id: maxId + 1 + k, person_key: null, name_folded: fold(i.name),
  }));
  post = { fromBy, moverRows, insertRows };
  return post;
}
function parseIn(v) {
  const inner = v.slice(v.indexOf('(') + 1, v.lastIndexOf(')'));
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    if (q && ch === '\\') { cur += inner[++i]; continue; }
    if (ch === '"') { q = !q; continue; }
    if (ch === ',' && !q) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}
function matcher(col, v) {
  const num = x => Number(x);
  if (v === 'not.is.null') return r => r[col] !== null && r[col] !== undefined;
  if (v === 'is.null') return r => r[col] === null || r[col] === undefined;
  const m = v.match(/^(eq|neq|gt|gte|lt|lte|in)\.(.*)$/s);
  if (!m) throw new Error(`the stand in cannot serve the filter ${col}=${v}`);
  const [, op, arg] = m;
  if (op === 'in') { const set = new Set(parseIn(v)); return r => set.has(String(r[col])); }
  if (op === 'eq') return r => String(r[col]) === arg;
  if (op === 'neq') return r => String(r[col]) !== arg;
  const cmp = { gt: (a, b) => a > b, gte: (a, b) => a >= b, lt: (a, b) => a < b, lte: (a, b) => a <= b }[op];
  return r => r[col] !== null && r[col] !== undefined && cmp(num(r[col]), num(arg));
}
function comparator(order) {
  if (!order) return null;
  const keys = order.split(',').map(k => { const [col, dir] = k.split('.'); return { col, desc: dir === 'desc' }; });
  return (a, b) => {
    for (const { col, desc } of keys) {
      const x = a[col], y = b[col];
      if (x === y) continue;
      if (x === null || x === undefined) return desc ? -1 : 1;
      if (y === null || y === undefined) return desc ? 1 : -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : (String(x) < String(y) ? -1 : 1);
      if (c !== 0) return desc ? -c : c;
    }
    return 0;
  };
}
async function servePost(realFetch, u, init) {
  const url = new URL(u);
  const sp = url.searchParams;
  const select = sp.get('select') || '*';
  const order = sp.get('order');
  const limit = sp.has('limit') ? Number(sp.get('limit')) : null;
  const offset = sp.has('offset') ? Number(sp.get('offset')) : 0;
  if (offset > 0 && order !== 'id.asc') throw new Error(`the stand in pages only id ordered reads, not ${order}`);
  if (/[(!]/.test(select)) throw new Error(`the stand in cannot project ${select}`);
  const filters = [...sp].filter(([k]) => !['select', 'order', 'limit', 'offset'].includes(k)).map(([k, v]) => matcher(k, v));
  const wideLimit = Math.min(limit === null ? CAP : limit + mig.moves.length + mig.inserts.length + 10, CAP);
  const wide = new URL(u);
  wide.searchParams.set('select', '*');
  wide.searchParams.set('limit', String(wideLimit));
  const res = await realFetch(wide.toString(), init);
  if (!res.ok) return res;
  const pre = await res.json();
  const endPage = pre.length < wideLimit;
  const { fromBy, moverRows, insertRows } = post;
  let removed = 0;
  const rows = [];
  for (const r0 of pre) {
    const m = fromBy.get(r0.player_name);
    const r = m && r0.year === 2026 && r0.club === m.from ? { ...r0, club: m.to } : r0;
    if (filters.every(f => f(r))) rows.push(r); else removed += 1;
  }
  const ids = new Set(rows.map(r => r.id));
  const cmp = comparator(order);
  for (const c of [...moverRows, ...insertRows]) {
    if (ids.has(c.id) || !filters.every(f => f(c))) continue;
    let pos = rows.length;
    if (cmp) { pos = rows.findIndex(r => cmp(c, r) < 0); if (pos === -1) pos = rows.length; }
    if (pos === rows.length && !endPage) continue; // it belongs past this page
    rows.splice(pos, 0, c);
    ids.add(c.id);
  }
  if (removed > 0 && !endPage) inexact.pages += 1;
  let page = limit === null ? rows : rows.slice(0, limit);
  if (select !== '*') {
    const cols = select.split(',').map(s => s.trim());
    page = page.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
  }
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(JSON.stringify(page), { status: res.status, headers });
}
{
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const u = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (SERVE !== 'post' || !u.includes('/rest/v1/player_market_values')) return realFetch(input, init);
    return servePost(realFetch, u, init);
  };
}

/* The app modules the consumer sections run, bundled once. */
let appPromise = null;
function loadApp() {
  if (appPromise) return appPromise;
  appPromise = (async () => {
    const entry = path.join(TMP, 'entry.ts');
    const bundle = path.join(TMP, 'bundle.mjs');
    fs.writeFileSync(entry, [
      "export { fetchFootlePlayerPool } from '@/lib/fetchFootlePlayerPool';",
      "export { dailyIndex, getDailyTier, getTodayET } from '@/lib/dateUtils';",
      "export { fetchBingoData } from '@/lib/playerBingo';",
      "export { clubKey } from '@/lib/whoAmI';",
      "export { careerPlayers } from '@/data/careerPlayers';",
      "export { transferPathIdentityKey } from '@/lib/transferPathIdentity';",
      '',
    ].join('\n'));
    await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
    if (!globalThis.localStorage) globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    return import(pathToFileURL(bundle).href);
  })();
  return appPromise;
}
const movers = entries.filter(e => e.from !== null && e.from !== e.db);
const windowByName = new Map(entries.map(e => [e.name, e]));

/* ------------------------------------------------------------------ */
/* 8. The Footle fallback bake                                        */
/* ------------------------------------------------------------------ */
if (runs(8)) {
  head(8, 'The Footle fallback bake puts every window player at his verified club');
  /* The committed file's clubs, by name. The file is the lead's to re-bake
     once the migration has landed (the bake then reads the moved rows and
     says "0 rows moved at bake time"), so until then it may sit behind the
     overlay, but only on window players: anything else behind is the table
     moving under it, which simPlayersPool owns. */
  const committedText = lf(fs.readFileSync(path.join(ROOT, 'src', 'data', 'players.ts'), 'utf8'));
  const committedClub = new Map([...committedText.matchAll(/^\s*\{ name: ("(?:[^"\\]|\\.)*"), club: ("(?:[^"\\]|\\.)*"),/gm)]
    .map(m => [JSON.parse(m[1]), JSON.parse(m[2])]));
  if (committedClub.size < 400) abort(`src/data/players.ts parsed to ${committedClub.size} rows, the reader is broken`);
  if (CONTROL === 'footle') {
    const e = movers.find(x => committedClub.get(x.name) === x.from || committedClub.get(x.name) === x.db);
    const at = e ? TRANSFER_OVERLAY_2026.findIndex(x => x.name === e.name && x.db === e.db) : -1;
    if (at < 0) abort('control cannot run: no window mover of the Footle pool is in the overlay');
    TRANSFER_OVERLAY_2026.splice(at, 1);
    console.log(`   NEGATIVE CONTROL ON: ${e.name} taken out of the overlay before the bake`);
  }
  const rows = await fetchRows2026();
  const fresh = await bake({ rows: clone(rows) });
  const freshClub = new Map(fresh.pool.map(x => [x.player.name, x.player.club]));
  const behind = [];
  for (const n of new Set([...committedClub.keys(), ...freshClub.keys()])) {
    if (committedClub.get(n) === freshClub.get(n)) continue;
    if (windowByName.has(n)) { behind.push(n); continue; }
    fail(`${n}: src/data/players.ts says ${committedClub.get(n) ?? 'nothing'}, a fresh bake says ${freshClub.get(n) ?? 'nothing'}, and no window row explains it`);
  }
  if (fresh.text === committedText) console.log('   src/data/players.ts is the fresh bake');
  else console.log(`   src/data/players.ts sits behind a fresh bake on ${behind.length} window player(s) and nothing else: the re-bake (node scripts/bakePlayers.mjs) is owed after the migration lands`);
  const rowBy = groupBy(rows, r => r.player_name);
  let inPool = 0, staleInTable = 0;
  for (const { player } of fresh.pool) {
    const e = windowByName.get(player.name);
    if (!e) continue;
    inPool += 1;
    if (player.club !== e.db) fail(`${player.name}: the Footle fallback pool says ${player.club}, the verified club is ${e.db}`);
    if ((rowBy.get(player.name) || [])[0]?.club !== e.db) staleInTable += 1;
  }
  const lost = entries.filter(e => (rowBy.get(e.name) || []).length === 1 && fresh.skipped.some(s => s.name === e.name || s.row?.player_name === e.name)).map(e => e.name);
  if (inPool < FLOOR.footleFallback) fail(`only ${inPool} window players in the Footle fallback pool, the floor is ${FLOOR.footleFallback}`);
  console.log(`   ${inPool} window players in the pool of ${fresh.pool.length}, all at the verified club; the table still has ${staleInTable} of them at the old one; ${lost.length} skipped by the bake at the new club (${lost.join(', ') || 'none'})`);
  if (STATE === 'PENDING') {
    await preparePost();
    const postRows = clone(rows).map(r => {
      const m = post.fromBy.get(r.player_name);
      return m && r.club === m.from ? { ...r, club: m.to } : r;
    });
    for (const i of post.insertRows) postRows.push({ id: i.id, player_name: i.player_name, position: i.position, age: i.age, nationality: i.nationality, club: i.club, market_value_usd: i.market_value_usd, goals: i.goals, assists: i.assists });
    const after = await bake({ rows: postRows });
    const a = new Map(fresh.pool.map(x => [x.player.name, x.player]));
    const b = new Map(after.pool.map(x => [x.player.name, x.player]));
    const ins = new Set(insertNames);
    for (const [n, p] of b) {
      if (!a.has(n) && !ins.has(n)) fail(`${n} joins the Footle bake only once the migration lands, and he is not an inserted name`);
      if (a.has(n) && a.get(n).club !== p.club) fail(`${n}: the bake says ${a.get(n).club} before the migration and ${p.club} after, the overlay and the migration disagree`);
    }
    for (const n of a.keys()) if (!b.has(n)) fail(`${n} leaves the Footle bake once the migration lands`);
    const joins = [...b.keys()].filter(n => !a.has(n));
    console.log(`   with the migration applied the bake keeps every club and gains ${joins.length} inserted name(s): ${joins.join(', ') || 'none'} (the re-bake owed after the apply)`);
  }
}

/* ------------------------------------------------------------------ */
/* 9 and 10. The live consumers                                       */
/* ------------------------------------------------------------------ */
async function underPost(fn) {
  const was = SERVE;
  if (STATE === 'PENDING' && CONTROL !== 'stale') { await preparePost(); SERVE = 'post'; }
  try { return await fn(); } finally { SERVE = was; }
}
if ((runs(9) || runs(10)) && CONTROL === 'stale') {
  if (STATE !== 'PENDING') abort('control cannot run: the table is not PENDING, so there is no stale table to judge');
  console.log('\n   NEGATIVE CONTROL ON: sections 9 and 10 judged on the table as it is, not the stand in');
}
if (runs(9)) {
  head(9, 'Footle\'s live pool, served the migrated table, has every window player at his verified club');
  const app = await loadApp();
  inexact.pages = 0;
  const before = STATE === 'PENDING' ? await app.fetchFootlePlayerPool() : null;
  const after = await underPost(() => app.fetchFootlePlayerPool());
  if (!after.length) fail('the Footle live pool came back empty (the page would fall back to the file)');
  if (inexact.pages) fail(`the stand in could not serve ${inexact.pages} page(s) exactly`);
  let inPool = 0, staleBefore = 0;
  for (const p of after) {
    const e = windowByName.get(p.name);
    if (!e) continue;
    inPool += 1;
    if (p.club !== e.db) fail(`${p.name}: Footle's live pool says ${p.club}, the verified club is ${e.db}`);
  }
  if (before) for (const p of before) { const e = windowByName.get(p.name); if (e && e.from !== e.db && p.club === e.from) staleBefore += 1; }
  if (inPool < FLOOR.footleLive) fail(`only ${inPool} window players in the Footle live pool, the floor is ${FLOOR.footleLive}`);
  console.log(`   ${inPool} window players in the live pool of ${after.length}, all at the verified club${before ? `; served the table as it is, ${staleBefore} of them sit at the old club` : ''}`);
  if (before) {
    const buildPool = (tier, pool) => tier === 'easy' ? pool.filter(p => p.difficulty === 'easy') : tier === 'hard' ? pool.filter(p => p.difficulty !== 'insane') : pool;
    const target = (tier, pool) => { const pure = pool.filter(p => p.difficulty === tier); return pure.length ? pure : buildPool(tier, pool); };
    const answer = (d, pool) => { const t = target(app.getDailyTier(d), pool); return t.length ? t[app.dailyIndex(d, t.length)] : null; };
    const start = app.getTodayET();
    let changed = 0, clubOnly = 0;
    for (let k = 0; k < 366; k += 1) {
      const d = new Date(`${start}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + k);
      const day = d.toISOString().slice(0, 10);
      const x = answer(day, before), y = answer(day, after);
      if (x?.name !== y?.name) changed += 1;
      else if (x && y && x.club !== y.club) clubOnly += 1;
    }
    console.log(`   of the 366 Footle days from ${start}, the migration changes the answer on ${changed} and only the answer's club on ${clubOnly}: apply it in the first minutes after an Eastern midnight`);
  }
}
if (runs(10)) {
  head(10, 'Player Bingo, served the migrated table, has every window player at his verified club');
  const app = await loadApp();
  /* fetchBingoData answers null on any failed read, a transient 500 included
     (the page offers a retry), so a null is retried twice. A stand in that
     cannot serve a read throws every time and stays null. */
  const bingo = async (label, fn) => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      inexact.pages = 0;
      const d = await fn();
      if (d) { if (attempt > 1) console.log(`   ${label}: fetchBingoData needed ${attempt} attempts`); return d; }
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
    return null;
  };
  const before = STATE === 'PENDING' ? await bingo('the table as it is', () => app.fetchBingoData()) : null;
  if (STATE === 'PENDING' && !before) fail('fetchBingoData returned null three times on the table as it is');
  const after = await bingo('the stand in', () => underPost(() => app.fetchBingoData()));
  if (!after) fail('fetchBingoData returned null (the board would show its error state)');
  if (inexact.pages) fail(`the stand in could not serve ${inexact.pages} page(s) exactly`);
  let inPool = 0, staleBefore = 0, noHistory = 0;
  for (const p of after?.pool || []) {
    const e = windowByName.get(p.name);
    if (!e) continue;
    inPool += 1;
    if (p.club !== e.db) fail(`${p.name}: Player Bingo's pool says ${p.club}, the verified club is ${e.db}`);
    const key = app.clubKey(e.db);
    if (key && !after.clubHistory.get(p.name)?.has(key)) { noHistory += 1; fail(`${p.name}: Player Bingo's club history lacks ${e.db}`); }
  }
  for (const p of before?.pool || []) { const e = windowByName.get(p.name); if (e && e.from !== e.db && p.club === e.from) staleBefore += 1; }
  if (inPool < FLOOR.bingo) fail(`only ${inPool} window players in the Player Bingo pool, the floor is ${FLOOR.bingo}`);
  console.log(`   ${inPool} window players in the pool of ${after?.pool?.length ?? 0}, all at the verified club with it in their history${before ? `; served the table as it is, ${staleBefore} of them sit at the old club` : ''}`);
}

/* ------------------------------------------------------------------ */
/* 11. Transfer Path                                                  */
/* ------------------------------------------------------------------ */
if (runs(11)) {
  head(11, 'Transfer Path: the career graph is untouched and the identity evidence is held to the hand list');
  const stripJs = t => lf(t).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
  for (const f of ['scripts/genTransferPathHints.mjs', 'scripts/simTransferPathActiveIdentity.mjs']) {
    const code = stripJs(fs.readFileSync(path.join(ROOT, f), 'utf8'));
    if (!/TRANSFER_OVERLAY_2026_HAND as overlay/.test(code)) fail(`${f} does not read the hand overlay as its identity evidence`);
  }
  const app = await loadApp();
  const careers = lf(fs.readFileSync(path.join(ROOT, 'scripts/data/transferPathPull/careers.txt'), 'utf8')).split('\n').filter(Boolean);
  const base = {
    careerPlayers: app.careerPlayers,
    careerNameUniverse: careers.map(l => ({ name: l.slice(0, l.indexOf('|')) })),
    worldCupRows: parseWorldCupIdentities(fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260901_round_389_world_cup_2026_squads.sql'), 'utf8')),
    staleRows: JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/staleSweep2026.json'), 'utf8')).active,
    identityKey: app.transferPathIdentityKey,
  };
  const hand = deriveVerifiedActiveIdentities({ ...base, overlayRows: TRANSFER_OVERLAY_2026_HAND });
  const full = deriveVerifiedActiveIdentities({ ...base, overlayRows: [...TRANSFER_OVERLAY_2026_HAND, ...WINDOW_2026_ADDITIONS] });
  const hk = new Set(hand.map(i => i.key)), fk = new Set(full.map(i => i.key));
  const added = [...fk].filter(k => !hk.has(k)).sort();
  const dropped = [...hk].filter(k => !fk.has(k)).sort();
  const held = CONTROL === 'tpheld' ? [] : [...TP_HELD].sort();
  if (CONTROL === 'tpheld') console.log('   NEGATIVE CONTROL ON: TP_HELD emptied');
  if (dropped.length) fail(`the window rows would take ${dropped.length} active identities away: ${dropped.join(', ')}`);
  if (JSON.stringify(added) !== JSON.stringify(held)) fail(`the window rows would add ${JSON.stringify(added)}, TP_HELD holds ${JSON.stringify(held)}: a Transfer Path round must review the change before either moves`);
  console.log(`   ${hand.length} active identities from the hand list; the window rows would add ${added.length} (${added.join(', ') || 'none'}), held for a Transfer Path round`);
}

/* ------------------------------------------------------------------ */
fs.rmSync(TMP, { recursive: true, force: true });
const total = Object.values(failures).reduce((s, n) => s + n, 0);
if (CONTROL) {
  const own = OWN[CONTROL];
  const fired = own.filter(s => (failures[s] || 0) > 0);
  if (fired.length === own.length) { console.log(`\ncontrol "${CONTROL}": fired in section(s) ${own.join(' and ')} as expected, the check works`); process.exit(0); }
  abort(`\ncontrol "${CONTROL}": changed NOTHING in section(s) ${own.filter(s => !fired.includes(s)).join(' and ')}, the check is dead`);
}
if (total > 0) { console.error(`\nsimWindow2026Integration: ${total} failure(s) in section(s) ${Object.keys(failures).join(', ')}`); process.exit(1); }
console.log(`\nsimWindow2026Integration: all green (${STATE}; ${entries.length} entries, ${mig.moves.length} moves, ${mig.inserts.length} inserts, ${mig.stints.length} stints)`);
