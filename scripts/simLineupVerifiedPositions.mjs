/* Build Your XI and World XI answer the position question the same way.
 *
 * Round 493. Both games use src/lib/positionFit.ts, and fitsAllowed has taken an
 * optional verified history since Round 345: its docstring calls it "optional
 * verified history, where the caller has it". World XI passes it at
 * worldXi.ts:131. checkLineupPick, which is what Build Your XI calls, dropped it
 * on the floor, so the same shared rule answered two different ways depending on
 * which game asked, and Build Your XI was the strict one for no reason.
 *
 * Measured 2026-09-06 with the REAL module bundled and the LIVE curated table:
 * over 134 players and all 15 slot roles, 94 of the 945 player-and-slot pairs
 * were refused when the history allows them. Every one is real football the game
 * was rejecting: Amad Diallo is a right winger who has played right wing-back,
 * Alex Baena a left winger who has played CAM, Anthony Gordon a left winger who
 * has played striker.
 *
 * A CORRECTION KEPT ON PURPOSE. The first measurement said 165 and was wrong.
 * player_verified_positions stores primary_position the way the market table
 * spells it ("Central Midfield") while fitsAllowed takes the short code ("CM"),
 * so comparing them directly made every "before" answer false for the wrong
 * reason and inflated the count. Normalising the primary first, exactly as
 * checkLineupPick does, gives 94. A number measured against the wrong shape is
 * not a smaller version of the truth, it is a different claim.
 *
 * WHAT THIS HOLDS:
 *   1. The goalkeeper boundary sits above BOTH widening paths, so no history
 *      however long lets a keeper reach an outfield slot or an outfielder reach
 *      goal. This is the one thing the round could have broken.
 *   2. The history actually changes something, measured against the live table.
 *      A wiring that silently became a no-op would pass every source check and
 *      fail this one.
 *   3. Build Your XI passes the history to the shared rule.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   VERIFIED_POS_CONTROL=nohistory stops passing the history in section 2, so
 *     nothing turns from refused into allowed and it goes red.
 *   VERIFIED_POS_CONTROL=nowire expects the caller NOT to pass the history, so
 *     section 3 goes red.
 *
 * Run: node scripts/simLineupVerifiedPositions.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.VERIFIED_POS_CONTROL || '';
if (CONTROL && !['nohistory', 'nowire'].includes(CONTROL)) {
  console.error(`VERIFIED_POS_CONTROL=${CONTROL} is not a control this harness knows (nohistory, nowire)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

/* squadDeal reaches the supabase client, which wants browser storage the moment
   it is imported. A memory shim is enough: nothing here signs in or persists. */
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
  clear: () => mem.clear(),
  key: i => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-verified-pos-'));
const ENTRY = path.join(tmpDir, 'entry.ts');
const BUNDLE = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  "export { fitsAllowed, SLOT_ALLOWED_BY_ROLE } from '@/lib/positionFit';",
  "export { normalizePosition } from '@/lib/squadDeal';",
].join('\n'));
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: BUNDLE, logLevel: 'silent',
  alias: { '@': path.join(ROOT, 'src') },
});
const M = await import(pathToFileURL(BUNDLE).href);

console.log('1) the goalkeeper boundary sits above the history');
{
  const ROLES = Object.keys(M.SLOT_ALLOWED_BY_ROLE);
  const EVERY = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
  let crossed = 0, tried = 0;
  for (const role of ROLES) {
    const allowed = M.SLOT_ALLOWED_BY_ROLE[role];
    for (const primary of EVERY) {
      /* the most generous history there could be: every position at once */
      tried++;
      const ok = M.fitsAllowed(primary, allowed, EVERY);
      const slotIsGoal = allowed.includes('GK');
      if (ok && slotIsGoal !== (primary === 'GK')) {
        fail(`a ${primary} reaches the ${role} slot with a full history, and the goalkeeper boundary should forbid it`);
        crossed++;
      }
    }
  }
  console.log(`   ${tried} position-and-slot combinations tried with an all-positions history, ${crossed} crossed the boundary`);
}

console.log('2) the history actually turns refusals into allowed picks');
{
  const res = await fetch(`${URL_}/rest/v1/player_verified_positions?select=player_name,primary_position,secondary_positions&limit=500`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const rows = res.ok ? await res.json() : null;
  if (!rows) { fail('could not read player_verified_positions'); }
  else {
    const ROLES = Object.keys(M.SLOT_ALLOWED_BY_ROLE);
    let pairs = 0, gained = 0, unnormalisable = 0;
    for (const v of rows) {
      const primary = v.primary_position ? M.normalizePosition(String(v.primary_position).trim()) : null;
      if (!primary) { unnormalisable++; continue; }
      const secs = (Array.isArray(v.secondary_positions)
        ? v.secondary_positions
        : String(v.secondary_positions || '').split(/[;,/]/))
        .map(x => String(x).trim()).filter(Boolean);
      if (secs.length === 0) continue;
      for (const role of ROLES) {
        const allowed = M.SLOT_ALLOWED_BY_ROLE[role];
        pairs++;
        const before = M.fitsAllowed(primary, allowed);
        const after = M.fitsAllowed(primary, allowed, CONTROL === 'nohistory' ? undefined : secs);
        if (!before && after) gained++;
      }
    }
    console.log(`   ${rows.length} curated players, ${pairs} pairs, ${gained} turn from refused into allowed, ${unnormalisable} primaries that do not normalise`);
    if (unnormalisable > 0) fail(`${unnormalisable} curated primary positions do not normalise, so their history can never be believed`);
    if (gained === 0) fail('the verified history changes nothing, so either the curated table is empty or the rule stopped reading it');
    if (CONTROL === 'nohistory' && gained > 0) {
      console.error('   CONTROL nohistory changed nothing: without the history nothing should turn');
      process.exit(1);
    }
  }
}

console.log('3) Build Your XI passes the history to the shared rule');
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useLineupBuilder.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  /* Matched over a bounded window rather than with a character class: the
     argument list contains playerName.trim(), so "everything up to the next
     bracket" stops at the wrong bracket and reports a wired-up caller as
     unwired. It did, on the first run. */
  const passes = CONTROL === 'nowire'
    ? false
    : /checkLineupPick\([\s\S]{0,260}?\bplayed\b/.test(src) && /verifiedSecondaries\(/.test(src);
  if (!passes) fail('useLineupBuilder no longer passes the verified history to checkLineupPick, so Build Your XI is strict again where World XI is not');
  console.log(`   passes the history: ${passes ? 'yes' : 'NO'}`);
  if (CONTROL === 'nowire' && failures === 0) {
    console.error('   CONTROL nowire changed nothing');
    process.exit(1);
  }
}

try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* non-fatal */ }

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimLineupVerifiedPositions: green. Both games read the same rule the same way, and the keeper boundary holds.'
    : `\nsimLineupVerifiedPositions: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
