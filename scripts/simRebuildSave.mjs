/* Rebuild save harness, Round 477: the run survives a refresh, and a bad
 * save opens a fresh one.
 *
 * WHAT IT DRIVES. src/lib/rebuildSave.ts is the first save shape Rebuild has
 * ever had. It does not write the run, which carries functions and two big
 * player lists: it writes the seats, their clubs by name, the preset, the
 * salt, whose turn it is and one list of moves per seat, and restores by
 * replaying those moves through the same pure functions in
 * src/lib/rebuildLoop.ts and src/lib/rebuildTable.ts that the page calls.
 * This bundles the REAL modules with esbuild, builds every club's market
 * through the REAL buildMarket from the baked pool
 * (scripts/data/rebuildMarket.json), and plays tables of one to four seats
 * through the very functions the hook calls, saving and restoring as it goes.
 *
 * WHAT IT HOLDS
 *   1) A SAVE WRITTEN AT ANY POINT RESTORES THE SAME RUN. Deep tables save
 *      and restore after EVERY move; wide tables sample. The restored table
 *      has to be identical in everything a player can see: every seat's
 *      fingerprint, XI, rating, budget, funds, grade, board demands met, war
 *      log, open scouts' list, reckoning notes, rival personas, and the
 *      shared season once it has been played.
 *   2) A TAMPERED OR TRUNCATED SAVE OPENS FRESH. The six kinds of wreckage
 *      scripts/sweepSaves.mjs pours into every key on the site, truncations
 *      at nine depths, and dozens of targeted mutations (versions, seat
 *      counts, a club that is not in the list any more, an unknown move,
 *      a move deleted from the middle, a corrupted fingerprint, a nudged
 *      turn) all have to come back null. Not one may come back as a table.
 *   3) AN ABSENT SAVE OPENS FRESH. Nothing stored, a whitespace value and an
 *      empty string all read as null, and a table with no club picked writes
 *      nothing at all rather than a stub.
 *   4) NO RESTORE HANDS A SEAT ANOTHER SEAT'S BOARD. Across every restored
 *      table, no two seats hold the same man, each seat's restored names are
 *      its own and not its neighbour's, and a restore taken during a hand
 *      over puts no run on the board at all.
 *   5) NO RELOAD RECORDS A SECOND COMPLETION OR PAYS POINTS TWICE. The real
 *      src/lib/restoredFinish.ts is driven under useGameCompletion's two
 *      rules (record only a witnessed transition, and consume a restored
 *      mark first) across a finish and two reloads, and the hook's restore
 *      path is read as code to hold it to announcing the restore.
 *   6) EVERY ACTION IS SAVED, NOT JUST THE ONES THIS ROUND TOUCHED. The
 *      engine's mutating actions and the ones the hook reaches are counted
 *      out of the source, and every action the hook can reach must have a
 *      case in applyMove. A new action added next round with no case fails
 *      here rather than being silently dropped from every save.
 *
 * NEGATIVE CONTROLS, each patching a copy of a file after normalising CRLF,
 * asserting the text it rewrites is present exactly once, and refusing to run
 * otherwise. Each is judged on its own section's output, never on an exit
 * code:
 *   SIM_REBUILD_SAVE_CONTROL=trustshape  parseRebuildSave returns whatever
 *                                        parsed, no field checks: section 2
 *                                        must FAIL, and two of its three
 *                                        failures are the loader throwing,
 *                                        which on the page is a dead screen
 *   SIM_REBUILD_SAVE_CONTROL=partial     restoreTable hands back the table it
 *                                        got to when a move is refused, the
 *                                        half restored run: section 2 must
 *                                        FAIL on the five mutations that get
 *                                        past the field checks
 *   SIM_REBUILD_SAVE_CONTROL=endonly     toSave writes only a finished table,
 *                                        Round 468's defect: sections 1, 4
 *                                        and 5 must FAIL, because nothing
 *                                        mid table is written so nothing mid
 *                                        table comes back
 *   SIM_REBUILD_SAVE_CONTROL=missmove    applyMove loses its sell case:
 *                                        sections 1, 2 and 6 must FAIL
 *   SIM_REBUILD_SAVE_CONTROL=nomark      the hook's markRestoredFinish call
 *                                        removed: section 5 must FAIL
 *
 * Run: node scripts/simRebuildSave.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
const TMP = os.tmpdir().replace(/\\/g, '/');

const SECTIONS = [1, 2, 3, 4, 5, 6];
const failures = Object.fromEntries(SECTIONS.map(n => [n, 0]));
let section = 1;
const fail = m => { failures[section] += 1; console.error(`  FAIL: ${m}`); };
const total = () => SECTIONS.reduce((t, n) => t + failures[n], 0);

const CONTROLS = ['trustshape', 'partial', 'endonly', 'missmove', 'nomark'];
const CONTROL = process.env.SIM_REBUILD_SAVE_CONTROL || '';
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`SIM_REBUILD_SAVE_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}

/* ---------- sources, patched in memory for a control ---------- */

const SAVE_SRC = `${ROOT}/src/lib/rebuildSave.ts`;
const LOOP_SRC = `${ROOT}/src/lib/rebuildLoop.ts`;
const HOOK_SRC = `${ROOT}/src/hooks/useRebuild.ts`;
const COMPLETION_SRC = `${ROOT}/src/hooks/useGameCompletion.ts`;
/* Under the ignored .sim-control, in a folder of its own: runAllSims runs the
   harnesses side by side and the rebuild loop harness clears the parent. */
const CONTROL_DIR = `${ROOT}/.sim-control/save`;
fs.rmSync(CONTROL_DIR, { recursive: true, force: true });

const readLf = file => fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Rewrites text in memory, refusing unless every old text is present exactly once. */
function rewrite(label, src, edits) {
  let out = src;
  for (const [oldText, newText] of edits) {
    const hits = out.split(oldText).length - 1;
    if (hits !== 1) {
      console.error(`control cannot fire: ${label} contains the text it rewrites ${hits} times, not once`);
      console.error(oldText);
      process.exit(1);
    }
    out = out.replace(oldText, newText);
  }
  return out;
}

let savePath = SAVE_SRC;
/* The source section 6 reads. A control patches this text too, so a control
   that takes a case out of applyMove is seen by the check that counts cases
   and not only by the runs. */
let saveSrc = readLf(SAVE_SRC);
let hookSrc = readLf(HOOK_SRC);

function patchSave(edits, outName) {
  fs.mkdirSync(CONTROL_DIR, { recursive: true });
  const out = `${CONTROL_DIR}/${outName}`;
  saveSrc = rewrite('rebuildSave.ts', saveSrc, edits);
  fs.writeFileSync(out, saveSrc);
  savePath = out;
}

const CONTROL_FILE = 'simRebuildSave.control.rebuildSave.ts';
if (CONTROL === 'trustshape') {
  patchSave([[
    '  const migrated = migrate(parsed as Record<string, unknown>);',
    '  return parsed as RebuildSave;\n  const migrated = migrate(parsed as Record<string, unknown>);',
  ]], CONTROL_FILE);
  console.log('NEGATIVE CONTROL ON: the loader trusts whatever parsed, with no field checks');
}
if (CONTROL === 'partial') {
  patchSave([[
    '      const next = table.updateRun(t, r => applyMove(r, m));\n      if (next === t) return null;\n      t = next;',
    '      const next = table.updateRun(t, r => applyMove(r, m));\n      if (next === t) return { table: t, moves };\n      t = next;',
  ]], CONTROL_FILE);
  console.log('NEGATIVE CONTROL ON: a refused move hands back the half restored table');
}
if (CONTROL === 'endonly') {
  patchSave([[
    '  if (!t.seats.some(s => s.club)) return null;',
    '  if (!t.seats.some(s => s.club) || !isFinishedTable(t)) return null;',
  ]], CONTROL_FILE);
  console.log("NEGATIVE CONTROL ON: the run is written only when it is over, Round 468's defect");
}
if (CONTROL === 'missmove') {
  patchSave([[
    "    case 'sell': return loop.sell(r);\n",
    '',
  ]], CONTROL_FILE);
  console.log('NEGATIVE CONTROL ON: applyMove has lost its sell case');
}
if (CONTROL === 'nomark') {
  hookSrc = rewrite('useRebuild.ts', hookSrc, [[
    "          if (isFinishedTable(back.table)) markRestoredFinish('rebuild');",
    '          /* control: the restore says nothing */',
  ]]);
  console.log('NEGATIVE CONTROL ON: the restore no longer announces a finish it read back');
}

/* ---------- bundle the real modules ---------- */

const ENTRY = `${TMP}/rebuildSave.entry.mjs`;
const BUNDLE = `${TMP}/rebuildSave.bundle.mjs`;
fs.writeFileSync(ENTRY, `
export * as deck from '${ROOT}/src/lib/rebuildDeck.ts';
export * as loop from '${ROOT}/src/lib/rebuildLoop.ts';
export * as policy from '${ROOT}/src/lib/rebuildPolicy.ts';
export * as table from '${ROOT}/src/lib/rebuildTable.ts';
export * as save from '${savePath}';
export * as finish from '${ROOT}/src/lib/restoredFinish.ts';
export { normalizePosition } from '${ROOT}/src/lib/squadDeal.ts';
export { getEnrichment } from '${ROOT}/src/data/footleEnrichment.ts';
`);
try {
  execSync(
    `${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error --alias:@=${ROOT}/src`,
    { stdio: 'inherit' },
  );
} finally {
  fs.rmSync(CONTROL_DIR, { recursive: true, force: true });
}
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
const { deck, loop, policy, table, save, finish, normalizePosition, getEnrichment } = await import(pathToFileURL(BUNDLE).href);

/* ---------- fixtures, the same mapping the seats harness and fetchRebuild do ---------- */

const squadsFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildSquads.json`, 'utf8'));
const marketFixture = JSON.parse(fs.readFileSync(`${ROOT}/scripts/data/rebuildMarket.json`, 'utf8'));

function toSquad(rows) {
  const out = [];
  for (const [name, rawPos, age, usd] of rows) {
    const position = normalizePosition(rawPos || '');
    if (!position) continue;
    out.push({
      name, position, age, club: 'x', nationality: 'Unknown', league: 'Other',
      goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
      marketValue: Math.max(1, Math.round((usd || 1_000_000) / 1_000_000)),
    });
  }
  return out;
}
const MARKET_ROWS = marketFixture.rows.map(([player_name, position, age, nationality, club, market_value_usd]) => ({ player_name, position, age, nationality, club, market_value_usd }));
const leagueOf = (name, club) => getEnrichment(name, club).league;
const CLUBS = squadsFixture.clubs.map(c => ({ club: c.club, tier: c.tier, squadSize: c.squad.length, squadValueM: 0 }));
const SQUADS = new Map(squadsFixture.clubs.map(c => [c.club, toSquad(c.squad)]));
const MARKETS = new Map(CLUBS.map(c => [c.club, deck.buildMarket(MARKET_ROWS, c.club, leagueOf)]));
const dataFor = preset => ({ squads: SQUADS, markets: MARKETS, preset });

const { KEEP_ALL, SELL_ALL, THINKING } = policy;
const POLICIES = { keep: KEEP_ALL, sell: SELL_ALL, think: THINKING };
const PRESETS = ['none', 'europe5', 'u25', 'bargain'];

console.log(`Rebuild save: ${CLUBS.length} clubs, ${MARKET_ROWS.length} market rows pulled ${marketFixture.pulled}${CONTROL ? `  [CONTROL=${CONTROL}]` : ''}`);
console.log(`save version ${save.REBUILD_SAVE_VERSION}, key ${save.REBUILD_SAVE_KEY}, cap ${save.MAX_MOVES_PER_SEAT} moves a seat`);

/* ---------- the driver ---------- */

/** The move descriptor behind a policy's step. policyMove names what it
 *  asked for, and the two moves that carry a payload are recomputed from the
 *  same policy and the same state, so this is the policy's own answer and
 *  never a second guess at it. */
function moveOf(what, s, pol) {
  if (what === 'toManager') return { k: 'toManager' };
  if (what === 'pickFinance') return { k: 'finance', i: pol.finance(s) };
  if (what === 'hireManager') return { k: 'manager', id: pol.manager(s) };
  if (what === 'clearWar') return { k: 'clearWar' };
  if (what === 'rivalReply') return { k: 'reply' };
  if (what === 'raise') return { k: 'raise' };
  if (what === 'walk') return { k: 'walk' };
  if (what === 'redeal') return { k: 'redeal' };
  if (what === 'takeForty') return { k: 'forty' };
  if (what === 'sell') return { k: 'sell' };
  if (what === 'keep') return { k: 'keep' };
  if (what === 'spinNext') return { k: 'spin' };
  if (what === 'blowWhistle') return { k: 'whistle' };
  if (what.startsWith('takeOffer ')) return { k: 'offer', name: what.slice('takeOffer '.length) };
  if (what.startsWith('promote ')) return { k: 'promote', name: what.slice('promote '.length) };
  return null;
}

/** Everything about a table a player can see, as one string. */
function snapTable(t) {
  return JSON.stringify({
    phase: t.phase,
    turn: t.turn,
    salt: t.salt,
    seats: t.seats.map(s => ({
      kind: s.kind, name: s.name, emoji: s.emoji, club: s.club?.club ?? null,
      run: s.run ? {
        fp: save.runFingerprint(s.run),
        xi: loop.xiOf(s.run).map(p => p?.name ?? null),
        rating: loop.ratingOf(s.run),
        budget: loop.budgetOf(s.run),
        ceiling: loop.spendCeilingOf(s.run),
        funds: loop.finalFundsOf(s.run),
        grade: loop.gradeOf(s.run),
        target: s.run.target,
        objectives: loop.objectivesOf(s.run).map(o => `${o.objective.id}:${o.met}`),
        rivals: s.run.rivalPlans.map(r => `${r.name}@${r.club.club}`),
        managers: s.run.managerOptions.map(m => m.id),
        board: `${s.run.board.mood}/${s.run.board.title}/${s.run.board.delta}`,
        finance: s.run.financeCard?.title ?? null,
        post: s.run.post.map(e => `${e.text}${e.delta}`),
        war: s.run.war ? s.run.war.log : null,
        deal: s.run.deal ? { offers: s.run.deal.offers.map(p => p.name), bench: s.run.deal.bench.map(p => p.name) } : null,
        notes: s.run.reckoning?.notes ?? null,
      } : null,
    })),
    season: t.season,
  });
}

/** Round trip: what the hook writes, what the browser stores, what the hook
 *  reads back. Returns the restored session, or null. */
function roundTrip(session, preset, clubs = CLUBS) {
  const written = save.toSave(session, preset);
  if (!written) return { raw: null, back: null };
  const raw = JSON.stringify(written);
  localStorage.setItem(save.REBUILD_SAVE_KEY, raw);
  const read = save.readRebuildSave();
  if (!read) return { raw, back: null };
  return { raw, back: save.restoreTable(read, clubs, dataFor(preset)) };
}

const seatKindsFor = (n, k) => Array.from({ length: n }, (_, i) => (i === 0 ? 'human' : (k >> (i - 1)) & 1 ? 'cpu' : 'human'));

/**
 * Plays one whole table (clubs, then every seat's window in turn, then the
 * season) through the table's own functions, keeping the hook's session
 * shape beside it. `onStep` is handed the session after every change, which
 * is where the save and restore checks hang.
 */
function playTable({ kinds, salt, preset, pol, onStep, formationAt = null }) {
  let sess = { table: table.createTable(kinds, salt), moves: kinds.map(() => []) };
  const step = t => {
    sess = { table: t, moves: sess.moves };
    onStep(sess);
  };
  const stepMove = (t, move) => {
    const turn = sess.table.turn;
    sess = { table: t, moves: sess.moves.map((l, i) => (i === turn ? [...l, move] : l)) };
    onStep(sess);
  };

  if (!kinds.includes('human')) {
    const drawn = table.drawClubs(sess.table, CLUBS);
    if (drawn === sess.table) throw new Error('drawClubs refused');
    step(drawn);
  }
  let picks = 0;
  while (sess.table.phase === 'clubs') {
    if (++picks > 8) throw new Error('the clubs never got picked');
    const seat = sess.table.seats[sess.table.turn];
    const open = CLUBS.filter(c => !sess.table.seats.some(s => s.club?.club === c.club));
    const club = open[deck.hashSeed(`pick-${salt}-${seat.index}`) % open.length];
    const next = table.pickClub(sess.table, club, CLUBS);
    if (next === sess.table) throw new Error(`pickClub refused ${club.club}`);
    step(next);
  }

  const data = dataFor(preset);
  let guard = 0;
  while (sess.table.phase !== 'season') {
    if (++guard > 4000) throw new Error('the table never finished');
    if (sess.table.phase === 'handover') {
      const opened = table.openWindow(sess.table, data, CLUBS);
      if (opened === sess.table) throw new Error(`openWindow refused seat ${sess.table.turn}`);
      step(opened);
      continue;
    }
    const run = table.activeRun(sess.table);
    if (!run) throw new Error('a window is open with no run');
    if (run.phase === 'done') {
      const closed = table.closeWindow(sess.table, CLUBS);
      if (closed === sess.table) throw new Error('closeWindow refused');
      step(closed);
      continue;
    }
    /* One pre spin formation change per table where asked, so the save's
       formation move is exercised rather than assumed. */
    if (formationAt !== null && sess.table.turn === formationAt && run.phase === 'manager') {
      const name = deck.hashSeed(`form-${salt}`) % 2 === 0 ? '4-4-2' : '3-5-2';
      const changed = table.updateRun(sess.table, r => loop.setFormation(r, name));
      if (changed !== sess.table) { stepMove(changed, { k: 'formation', name }); continue; }
    }
    const { what, next } = policy.policyMove(run, pol);
    if (next === run) throw new Error(`the engine refused ${what}`);
    const move = moveOf(what, run, pol);
    if (!move) throw new Error(`no save move for ${what}`);
    stepMove(table.updateRun(sess.table, () => next), move);
  }
  return sess;
}

/* =================== 1) a save at any point restores the same run =================== */

console.log('');
console.log('1) a save written at any point restores the same run');
section = 1;

const restoredHandover = [];
let deepChecks = 0;
let deepTables = 0;
let longestSeat = 0;
const seatMoveCounts = [];

/* DEEP: every single move, saved and restored. */
const DEEP = [];
for (let n = 1; n <= 4; n += 1) {
  for (let k = 0; k < (n === 1 ? 1 : 3); k += 1) {
    DEEP.push({ seats: n, kinds: seatKindsFor(n, k), salt: deck.hashSeed(`deep-${n}-${k}`) >>> 0, pol: ['think', 'keep', 'sell'][k % 3], preset: PRESETS[k % PRESETS.length] });
  }
}
for (const cfg of DEEP) {
  deepTables += 1;
  try {
    playTable({
      kinds: cfg.kinds, salt: cfg.salt, preset: cfg.preset, pol: POLICIES[cfg.pol], formationAt: 0,
      onStep: sess => {
        if (!sess.table.seats.some(s => s.club)) return;
        const before = snapTable(sess.table);
        const { back } = roundTrip(sess, cfg.preset);
        deepChecks += 1;
        if (!back) { fail(`${cfg.seats} seats salt ${cfg.salt}: a save taken at phase ${sess.table.phase} turn ${sess.table.turn} would not restore`); return; }
        const after = snapTable(back.table);
        if (after !== before) {
          const i = [...before].findIndex((c, k) => c !== after[k]);
          fail(`${cfg.seats} seats salt ${cfg.salt}: the restored table differs at char ${i}: ${before.slice(Math.max(0, i - 60), i + 60)} vs ${after.slice(Math.max(0, i - 60), i + 60)}`);
        }
        if (JSON.stringify(back.moves) !== JSON.stringify(sess.moves)) {
          fail(`${cfg.seats} seats salt ${cfg.salt}: the restored move lists differ from the ones played`);
        }
        /* Every hand over the deep pass walks through, kept for section 4:
           the phone changing hands is exactly the moment a save must not put
           the last player's board back on screen. */
        if (back.table.phase === 'handover') restoredHandover.push(back.table);
      },
    });
  } catch (e) {
    fail(`${cfg.seats} seats salt ${cfg.salt}: ${String(e.message ?? e)}`);
  }
}
console.log(`   deep: ${deepChecks} saves taken and restored across ${deepTables} tables, one after every move`);

/* WIDE: many more tables, sampled, plus the final state of every one. */
const WIDE_TABLES = Number(process.env.SIM_REBUILD_SAVE_TABLES || 140);
let wideChecks = 0;
let finishedTables = 0;
const restoredFinished = [];
const restoredMid = [];
for (let t = 0; t < WIDE_TABLES; t += 1) {
  const n = 1 + (t % 4);
  const cfg = {
    kinds: seatKindsFor(n, t >> 2), salt: deck.hashSeed(`wide-${t}`) >>> 0,
    preset: PRESETS[t % PRESETS.length], pol: POLICIES[['think', 'think', 'keep', 'sell'][t % 4]],
  };
  const sample = (deck.hashSeed(`sample-${t}`) % 5) + 3;
  let seen = 0;
  let kept = 0;
  try {
    const end = playTable({
      ...cfg, formationAt: n > 1 ? 1 : null,
      onStep: sess => {
        seen += 1;
        if (!sess.table.seats.some(s => s.club)) return;
        if (seen % sample !== 0) return;
        wideChecks += 1;
        const before = snapTable(sess.table);
        const { back } = roundTrip(sess, cfg.preset);
        if (!back) { fail(`wide ${t}: a save at phase ${sess.table.phase} turn ${sess.table.turn} would not restore`); return; }
        if (snapTable(back.table) !== before) fail(`wide ${t}: the restored table differs at phase ${sess.table.phase} turn ${sess.table.turn}`);
        /* Sections 4 and 5 read these back; two a table is plenty and a
           whole table carries two big player lists per seat. */
        if (kept < 2) { restoredMid.push(back.table); kept += 1; }
      },
    });
    finishedTables += 1;
    for (const list of end.moves) { seatMoveCounts.push(list.length); longestSeat = Math.max(longestSeat, list.length); }
    wideChecks += 1;
    const before = snapTable(end.table);
    const { back } = roundTrip(end, cfg.preset);
    if (!back) { fail(`wide ${t}: the finished table would not restore`); }
    else {
      if (snapTable(back.table) !== before) fail(`wide ${t}: the restored finished table differs`);
      restoredFinished.push(back.table);
    }
  } catch (e) {
    fail(`wide ${t}: ${String(e.message ?? e)}`);
  }
}
const avgMoves = seatMoveCounts.length ? (seatMoveCounts.reduce((a, b) => a + b, 0) / seatMoveCounts.length).toFixed(1) : '0';
console.log(`   wide: ${wideChecks} saves taken and restored across ${finishedTables} finished tables of one to four seats`);
console.log(`   a seat's window took ${avgMoves} moves on average and ${longestSeat} at the longest, against a cap of ${save.MAX_MOVES_PER_SEAT}`);
if (longestSeat * 2 > save.MAX_MOVES_PER_SEAT) fail(`the move cap ${save.MAX_MOVES_PER_SEAT} leaves no headroom over the ${longestSeat} a real window needed`);
if (deepChecks < 500) fail(`only ${deepChecks} deep saves were taken, too few to mean anything`);
if (restoredFinished.length < WIDE_TABLES / 2) fail(`only ${restoredFinished.length} finished tables restored, expected about ${WIDE_TABLES}`);

/* =================== 2) a tampered or truncated save opens fresh =================== */

console.log('');
console.log('2) a tampered, truncated or stale save opens fresh, never half restored');
section = 2;

/* One real save, deep into a four seat table, to wreck in every way. */
let sampleSave = null;
let sampleRaw = null;
let sampleSnapshot = null;
{
  const kinds = ['human', 'human', 'cpu', 'human'];
  const salt = deck.hashSeed('tamper') >>> 0;
  let taken = 0;
  const end = playTable({
    kinds, salt, preset: 'none', pol: THINKING, formationAt: 2,
    onStep: sess => {
      taken += 1;
      if (taken === 90 && !sampleSave) {
        sampleSave = save.toSave(sess, 'none');
        sampleRaw = JSON.stringify(sampleSave);
        sampleSnapshot = snapTable(sess.table);
      }
    },
  });
  if (!sampleSave) { sampleSave = save.toSave(end, 'none'); sampleRaw = JSON.stringify(sampleSave); sampleSnapshot = snapTable(end.table); }
}
/* The sample has to be a real, mid table save or every mutation below is
   testing nothing. */
if (!sampleSave || sampleSave.seats.length !== 4) fail('the sample save is not the four seat table it should be');
{
  const ok = save.restoreTable(save.parseRebuildSave(sampleRaw), CLUBS, dataFor('none'));
  if (!ok || snapTable(ok.table) !== sampleSnapshot) fail('the untouched sample save does not restore, so the mutations below prove nothing');
}

const clone = () => JSON.parse(sampleRaw);
const mutations = [];
const add = (label, fn) => { const o = clone(); fn(o); mutations.push([label, JSON.stringify(o)]); };

/* the six kinds of wreckage scripts/sweepSaves.mjs pours into every key */
for (const [label, value] of [
  ['garbage', 'not json at all {'],
  ['truncated', '{"v":1,"cash":12'],
  ['hostileVersion', '{"v":999,"version":999}'],
  ['emptyObject', '{}'],
  ['bareNull', 'null'],
  ['emptyArray', '[]'],
]) mutations.push([`sweepSaves ${label}`, value]);

/* truncations of a real save at nine depths */
for (let p = 1; p <= 9; p += 1) mutations.push([`truncated at ${p * 10} percent`, sampleRaw.slice(0, Math.floor(sampleRaw.length * p / 10))]);

add('version 0', o => { o.v = 0; });
add('version 2', o => { o.v = 2; });
add('version 999', o => { o.v = 999; });
add('version missing', o => { delete o.v; });
add('version as text', o => { o.v = '1'; });
add('salt negative', o => { o.salt = -1; });
add('salt fractional', o => { o.salt = 1.5; });
add('salt as text', o => { o.salt = 'x'; });
add('preset unknown', o => { o.preset = 'everything'; });
add('preset missing', o => { delete o.preset; });
add('phase unknown', o => { o.phase = 'playing'; });
add('phase season with a live turn', o => { o.phase = 'season'; });
add('turn negative', o => { o.turn = -1; });
add('turn past the last seat', o => { o.turn = o.seats.length + 1; });
add('turn nudged down one', o => { o.turn = Math.max(0, o.turn - 1); });
add('turn nudged up one', o => { o.turn += 1; });
add('turn as text', o => { o.turn = '1'; });
add('no seats', o => { o.seats = []; });
add('five seats', o => { o.seats = [...o.seats, { ...o.seats[0], club: null, moves: [], fp: null }]; });
add('seats not a list', o => { o.seats = { 0: o.seats[0] }; });
add('a seat kind nobody plays', o => { o.seats[0].kind = 'robot'; });
add('a seat kind flipped', o => { o.seats[0].kind = o.seats[0].kind === 'human' ? 'cpu' : 'human'; });
add('a club that is not in the list', o => { o.seats[0].club = 'Nowhere Athletic'; });
add('two seats on one club', o => { o.seats[1].club = o.seats[0].club; });
add('a club dropped', o => { o.seats[0].club = null; });
add('a move with an unknown kind', o => { o.seats[0].moves[1] = { k: 'teleport' }; });
add('a move with no kind', o => { o.seats[0].moves[1] = {}; });
add('a move that is a string', o => { o.seats[0].moves[1] = 'spin'; });
add('an offer with no name', o => { o.seats[0].moves = [...o.seats[0].moves, { k: 'offer' }]; });
add('a finance pick out of range', o => { o.seats[0].moves = [{ k: 'finance', i: 9999 }, ...o.seats[0].moves.slice(1)]; });
add('a move deleted from the middle', o => { o.seats[0].moves.splice(Math.floor(o.seats[0].moves.length / 2), 1); });
add('a move added at the end', o => { o.seats[0].moves = [...o.seats[0].moves, { k: 'keep' }]; });
add('two moves swapped', o => { const m = o.seats[0].moves; const i = Math.floor(m.length / 2); [m[i], m[i + 1]] = [m[i + 1], m[i]]; });
add('a whole seat of moves emptied', o => { o.seats[0].moves = []; });
add('the move cap blown', o => { o.seats[0].moves = Array.from({ length: save.MAX_MOVES_PER_SEAT + 1 }, () => ({ k: 'spin' })); });
add('moves not a list', o => { o.seats[0].moves = 'spin,spin'; });
add('a fingerprint corrupted', o => { const s = o.seats[0]; s.fp = `x${s.fp.slice(1)}`; });
add('a fingerprint dropped', o => { o.seats[0].fp = null; });
add('a fingerprint on a seat that never opened', o => { o.seats[o.seats.length - 1].fp = 'anything'; });
add('the fingerprints rotated between seats', o => { const fps = o.seats.map(s => s.fp); o.seats.forEach((s, i) => { s.fp = fps[(i + 1) % fps.length]; }); });
add('the clubs rotated between seats', o => { const cs = o.seats.map(s => s.club); o.seats.forEach((s, i) => { s.club = cs[(i + 1) % cs.length]; }); });
add('the moves moved to the next seat', o => { const ms = o.seats.map(s => s.moves); o.seats.forEach((s, i) => { s.moves = ms[(i + 1) % ms.length]; }); });
add('the salt changed', o => { o.salt = (o.salt ^ 0x1234) >>> 0; });

let refusedCleanly = 0;
for (const [label, raw] of mutations) {
  localStorage.setItem(save.REBUILD_SAVE_KEY, raw);
  let read = null;
  try { read = save.readRebuildSave(); } catch (e) { fail(`${label}: the loader threw (${String(e.message ?? e)})`); continue; }
  if (!read) { refusedCleanly += 1; continue; }
  let back = null;
  try { back = save.restoreTable(read, CLUBS, dataFor(read.preset)); } catch (e) { fail(`${label}: the restore threw (${String(e.message ?? e)})`); continue; }
  if (!back) { refusedCleanly += 1; continue; }
  if (snapTable(back.table) === sampleSnapshot) { refusedCleanly += 1; continue; }
  fail(`${label}: came back as a table that is not the one that was saved`);
}
console.log(`   ${refusedCleanly} of ${mutations.length} wrecked saves opened fresh, none half restored`);

/* the club list moving under a save is the same thing: it must not restore */
{
  const read = save.parseRebuildSave(sampleRaw);
  const gone = CLUBS.filter(c => c.club !== read.seats[0].club);
  const back = save.restoreTable(read, gone, dataFor('none'));
  if (back) fail('a save whose club has left the list still restored');
  const renamedTier = CLUBS.map(c => (c.club === read.seats[0].club ? { ...c, tier: c.tier === 'elite' ? 'modest' : 'elite' } : c));
  const back2 = save.restoreTable(read, renamedTier, dataFor('none'));
  if (back2 && snapTable(back2.table) !== sampleSnapshot) fail('a save whose club changed tier restored to a different run instead of refusing');
}
/* the wrong preset is a different market, so a different run */
{
  const read = save.parseRebuildSave(sampleRaw);
  const back = save.restoreTable(read, CLUBS, dataFor('bargain'));
  if (back && snapTable(back.table) !== sampleSnapshot) fail('a save replayed against the wrong preset restored a different run instead of refusing');
}
console.log('   a club that has left the list, and a market cut a different way, both refuse');

/* =================== 3) an absent save opens fresh =================== */

console.log('');
console.log('3) an absent save opens fresh');
section = 3;
for (const [label, raw] of [['nothing stored', null], ['an empty string', ''], ['whitespace', '   '], ['a bare number', '7'], ['a bare string', '"hello"']]) {
  if (raw === null) localStorage.removeItem(save.REBUILD_SAVE_KEY); else localStorage.setItem(save.REBUILD_SAVE_KEY, raw);
  if (save.readRebuildSave() !== null) fail(`${label} did not read as no save`);
}
{
  const fresh = { table: table.createTable(['human', 'human']), moves: [[], []] };
  if (save.toSave(fresh, 'none') !== null) fail('a table with nobody on a club still wrote a save');
  const seated = { table: table.configureSeats(table.createTable(['human']), ['human', 'cpu', 'human']), moves: [[], [], []] };
  if (save.toSave(seated, 'none') !== null) fail('a table where the seats are set but no club is picked still wrote a save');
}
console.log('   five empty or nonsense values read as no save; a table before the first club pick writes nothing');

/* =================== 4) no restore hands a seat another seat's board =================== */

console.log('');
console.log("4) no restore hands a seat another seat's board");
section = 4;
let seatPairs = 0;
let handoverChecks = 0;
for (const t of [...restoredFinished, ...restoredMid, ...restoredHandover]) {
  if (t.seats.length < 2) continue;
  const held = t.seats.map(s => {
    if (!s.run) return new Set();
    const names = new Set();
    for (const p of Object.values(s.run.decided)) if (p) names.add(p.name);
    for (const p of s.run.signed) names.add(p.name);
    for (const p of s.run.reckoning?.xi ?? []) if (p) names.add(p.name);
    return names;
  });
  for (let i = 0; i < held.length; i += 1) {
    for (let j = i + 1; j < held.length; j += 1) {
      seatPairs += 1;
      const shared = [...held[i]].filter(n => held[j].has(n));
      if (shared.length) fail(`two seats came back holding the same man: ${shared.slice(0, 3).join(', ')}`);
      const ci = t.seats[i].club?.club;
      const cj = t.seats[j].club?.club;
      if (ci && ci === cj) fail(`two seats came back on the same club: ${ci}`);
    }
  }
  if (t.phase === 'handover') {
    handoverChecks += 1;
    if (table.activeRun(t) !== null) fail('a restore taken during a hand over put a run on the board');
    if (t.seats[t.turn]?.run) fail('a restore taken during a hand over opened the next seat');
  }
}
if (seatPairs < WIDE_TABLES) fail(`only ${seatPairs} seat pairs were compared across ${WIDE_TABLES} tables, too few to mean anything`);
if (handoverChecks < 4) fail(`only ${handoverChecks} restores landed mid hand over, too few to mean anything`);
console.log(`   ${seatPairs} seat pairs across ${restoredFinished.length + restoredMid.length + restoredHandover.length} restored tables share no man and no club`);
console.log(`   ${handoverChecks} restores taken mid hand over put no run on the board`);

/* =================== 5) no reload records a second completion =================== */

console.log('');
console.log('5) a reload does not record a second completion or pay the score twice');
section = 5;
{
  /* useGameCompletion's two rules, as it applies them: record only a
     transition it witnessed, and consume a restored mark before recording.
     Driven against the real src/lib/restoredFinish.ts. */
  const runCompletionHook = ({ startsComplete, marked }) => {
    if (marked) finish.markRestoredFinish('rebuild');
    let seenIncomplete = !startsComplete;
    let recorded = 0;
    const render = isComplete => {
      if (!isComplete) { seenIncomplete = true; return; }
      if (!seenIncomplete) return;
      seenIncomplete = false;
      if (finish.consumeRestoredFinish('rebuild')) return;
      recorded += 1;
    };
    return { render, count: () => recorded };
  };

  /* one real finish, then two reloads of the same shut table */
  let paid = 0;
  {
    const h = runCompletionHook({ startsComplete: false, marked: false });
    h.render(false);
    h.render(true);
    paid += h.count();
  }
  const floor = Math.max(2, Math.floor(WIDE_TABLES / 4));
  const finished = restoredFinished.filter(t => save.isFinishedTable(t));
  if (finished.length < floor) fail(`only ${finished.length} restored tables read as finished, too few of ${WIDE_TABLES} to mean anything`);
  for (let reload = 0; reload < 2 && reload < finished.length; reload += 1) {
    const h = runCompletionHook({ startsComplete: false, marked: save.isFinishedTable(finished[reload]) });
    h.render(false);
    h.render(true);
    paid += h.count();
  }
  if (paid !== 1) fail(`a finish and two reloads recorded ${paid} completions, not 1`);

  /* and a restore that is not finished must not swallow the real finish later */
  const midUnfinished = [...restoredMid, ...restoredHandover].filter(t => !save.isFinishedTable(t));
  if (midUnfinished.length < floor) fail(`only ${midUnfinished.length} mid table restores read as unfinished`);
  if (midUnfinished.length > 0) {
    const h = runCompletionHook({ startsComplete: false, marked: save.isFinishedTable(midUnfinished[0]) });
    h.render(false);
    h.render(true);
    if (h.count() !== 1) fail('a run restored part way then finished recorded no completion');
  }
  console.log(`   a finish plus two reloads of ${finished.length} shut tables recorded 1 completion; ${midUnfinished.length} unfinished restores still record their own`);
}
{
  const hook = stripComments(hookSrc);
  if (!/markRestoredFinish\('rebuild'\)/.test(hook)) fail('the hook does not announce a finish it read back from storage');
  if (!/isFinishedTable\(/.test(hook)) fail('the hook does not ask whether the table it restored was already finished');
  const idxMark = hook.indexOf("markRestoredFinish('rebuild')");
  const idxSet = hook.indexOf('setSession(back)');
  if (idxMark < 0 || idxSet < 0 || idxMark > idxSet) fail('the hook applies the restored table before it announces the restore');
  const completion = stripComments(readLf(COMPLETION_SRC));
  if (completion.indexOf('consumeRestoredFinish(') > completion.indexOf('recordCompletion(')) {
    fail('useGameCompletion no longer consumes the restore mark before it records');
  }
  console.log('   the hook announces the restore before it applies it, and the completion hook still consumes the mark first');
}

/* =================== 6) every action the hook can reach is saved =================== */

console.log('');
console.log('6) every action the hook can reach has a case in the save');
section = 6;
{
  const loopSrc = stripComments(readLf(LOOP_SRC));
  const saveCode = stripComments(saveSrc);
  const hook = stripComments(hookSrc);

  /* Every exported function in the engine that takes a run and returns one:
     these are the moves a page can make. */
  const engineActions = [...loopSrc.matchAll(/export function (\w+)\(s: RunState[^)]*\): RunState/g)].map(m => m[1]);
  if (engineActions.length < 12) fail(`only ${engineActions.length} engine actions were found in rebuildLoop.ts, the pattern must have moved`);

  /* Every one of those the hook actually calls. */
  const hookCalls = [...new Set([...hook.matchAll(/loop\.(\w+)/g)].map(m => m[1]))].filter(n => engineActions.includes(n));
  /* Every one applyMove can replay. */
  const body = saveCode.slice(saveCode.indexOf('export function applyMove'), saveCode.indexOf('export function runFingerprint'));
  if (!body || body.length < 200) fail('applyMove could not be read out of rebuildSave.ts, the markers must have moved');
  const saved = [...new Set([...body.matchAll(/loop\.(\w+)\(/g)].map(m => m[1]))];
  const cases = [...body.matchAll(/case '(\w+)':/g)].map(m => m[1]);

  const missing = hookCalls.filter(n => !saved.includes(n));
  if (missing.length) fail(`the hook can make ${missing.length} move(s) the save cannot replay: ${missing.join(', ')}`);
  const stray = saved.filter(n => !engineActions.includes(n));
  if (stray.length) fail(`applyMove calls ${stray.join(', ')}, which is not an engine action any more`);
  if (cases.length !== saved.length) fail(`applyMove has ${cases.length} cases for ${saved.length} engine calls, so one case does not replay a move`);

  /* The counts, so a new action moves them and this check has to be looked at. */
  console.log(`   ${engineActions.length} engine actions, ${hookCalls.length} of them reachable from the board, ${saved.length} with a case in applyMove`);
  const kinds = [...saveCode.matchAll(/\| \{ k: '(\w+)'/g)].map(m => m[1]);
  if (kinds.length !== cases.length) fail(`the RebuildMove union names ${kinds.length} kinds and applyMove handles ${cases.length}`);
  console.log(`   the move union names ${kinds.length} kinds and every one of them replays`);
}

/* ---------- verdict ---------- */

console.log('');
for (const n of SECTIONS) console.log(`   section ${n}: ${failures[n] === 0 ? 'green' : `${failures[n]} failure${failures[n] === 1 ? '' : 's'}`}`);
if (total() > 0) {
  console.error(`simRebuildSave: ${total()} failure${total() === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simRebuildSave: green. A Rebuild run written at any point comes back the same, and anything else opens fresh.');
