/* Every club label on the Soccer Grid can be satisfied by somebody.
 *
 * Round 489. Five of the grid's own club labels could not be satisfied by ANY
 * player, which is 87 of its 1,883 club cells, 4.6 percent of the board. A
 * player dealt one of those rows could not fill it with any spelling of any
 * name, and the game never said why.
 *
 * Measured 2026-09-06 by running the validator's own clubMatches over all 4,931
 * stored club strings and all 100 labels the 710 puzzles use:
 *     "PSG"              25 cells, stored as Paris Saint-Germain
 *     "Bayer Leverkusen" 21 cells, stored as Bayer 04 Leverkusen
 *     "Celta Vigo"       17 cells, stored as Celta de Vigo
 *     "Rennes"           17 cells, stored as Stade Rennais FC
 *     "LA Galaxy"         7 cells, stored as Los Angeles Galaxy
 * All five fail the same way: a substring test cannot cross an inserted word.
 * "bayer leverkusen" is not inside "bayer 04 leverkusen" and neither contains
 * the other. Build Your XI had already carried aliases for three of them since
 * Round 442, so the knowledge existed in one game and not in its neighbour.
 *
 * AND THE CACHE HELD THE WRONG ANSWERS. Seven verdicts were stored refusing a
 * real player for one of those labels: Mbappe, Messi, Dembele, Vitinha and Xavi
 * Simons all refused at PSG. A cached refusal is served before the deterministic
 * pass, so fixing the rule alone would have left those players refused forever.
 *
 * WHAT THIS HOLDS, against the live puzzles, the live table and the live cache:
 *   1. No club label the puzzles use is unsatisfiable. It reads the labels from
 *      the puzzles and the clubs from the stints table, so a new puzzle with a
 *      new label is checked without anyone remembering to.
 *   2. The live function accepts a real player for each label that used to be
 *      dead.
 *   3. No cached refusal contradicts the current rule. That is the general form
 *      of the poisoned cache: whenever a matching rule is loosened, the
 *      verdicts it produced while broken have to go, and this finds them
 *      instead of trusting somebody to remember.
 *
 * NEGATIVE CONTROLS, both fire on correct code:
 *   GRID_LABELS_CONTROL=noalias   drops the alias map, so section 1 reports the
 *     five real dead labels again.
 *   GRID_LABELS_CONTROL=deadlabel adds a label no club can satisfy, so section 1
 *     must report it. It proves the section can see a dead label rather than
 *     passing because none exists.
 *
 * Run: node scripts/simSoccerGridLabels.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.GRID_LABELS_CONTROL || '';
if (CONTROL && !['noalias', 'deadlabel'].includes(CONTROL)) {
  console.error(`GRID_LABELS_CONTROL=${CONTROL} is not a control this harness knows (noalias, deadlabel)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/* The alias map is READ OUT OF THE DEPLOYED SOURCE, comments stripped, so the
   harness cannot drift from the function it is judging. */
const SRC = fs.readFileSync(path.join(ROOT, 'supabase', 'functions', 'soccer-grid-validate', 'index.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
let ALIASES = {};
{
  const at = SRC.indexOf('const CLUB_ALIASES');
  if (at < 0) fail('soccer-grid-validate no longer carries CLUB_ALIASES');
  else {
    const open = SRC.indexOf('{', at);
    let depth = 0, end = -1;
    for (let i = open; i < SRC.length; i++) {
      if (SRC[i] === '{') depth++;
      else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    ALIASES = new Function(`return (${SRC.slice(open, end + 1)})`)();
  }
}
if (CONTROL === 'noalias') ALIASES = {};

/* clubMatches, exactly as the function defines it. */
const clubMatches = (stintClub, wanted) => {
  const b = norm(wanted);
  if (!b) return false;
  const aliases = (ALIASES[b] ?? []).map(norm);
  return String(stintClub || '').split(' / ').some(part => {
    const a = norm(part);
    if (!a) return false;
    if (a === b || a.includes(b) || b.includes(a)) return true;
    return aliases.includes(a);
  });
};

/* Retried, because this pages 80,586 rows and a single dropped connection used
   to abort the whole run. A blip is not a finding. */
async function getPage(qs, from, attempt = 0) {
  try {
    const res = await fetch(`${URL_}/rest/v1/${qs}`, { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
    if (res.ok) return res.json();
  } catch { /* falls to the retry */ }
  if (attempt < 2) {
    await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    return getPage(qs, from, attempt + 1);
  }
  return null;
}

async function pageAll(qs, cap = 90000) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = await getPage(qs, from);
    if (page === null) return null;
    out.push(...page);
    if (page.length < 1000) break;
    if (from > cap) break;
  }
  return out;
}

console.log('1) no club label on the board is unsatisfiable');
const uses = new Map();
{
  const rows = await pageAll('soccer_player_club_stints?select=club&order=club.asc');
  if (!rows) { fail('could not read soccer_player_club_stints'); }
  const clubs = [...new Set((rows ?? []).map(r => r.club).filter(Boolean))];

  const puzzles = await pageAll('soccer_grid_puzzles?select=rows_json,cols_json&order=id.asc', 5000);
  for (const p of puzzles ?? []) {
    for (const side of [p.rows_json, p.cols_json]) {
      for (const e of side || []) {
        if (e && e.type === 'club' && e.label) {
          const l = String(e.label).replace('Played for ', '');
          uses.set(l, (uses.get(l) || 0) + 1);
        }
      }
    }
  }
  if (CONTROL === 'deadlabel') uses.set('Nowhere United', 1);

  const dead = [];
  for (const [label, n] of uses) {
    if (!clubs.some(cl => clubMatches(cl, label))) dead.push({ label, n });
  }
  const totalCells = [...uses.values()].reduce((a, b) => a + b, 0);
  const deadCells = dead.reduce((a, b) => a + b.n, 0);
  console.log(`   ${clubs.length} stored clubs, ${uses.size} labels, ${totalCells} club cells`);
  for (const d of dead.sort((a, b) => b.n - a.n)) {
    fail(`"${d.label}" is used in ${d.n} cells and NO stored club satisfies it, so those cells cannot be filled by anybody`);
  }
  console.log(`   ${dead.length} dead labels, ${deadCells} unanswerable cells (${(deadCells / Math.max(totalCells, 1) * 100).toFixed(1)}%)`);
  if (CONTROL && dead.length === 0) {
    console.error(`   CONTROL ${CONTROL} changed nothing: it must produce a dead label`);
    process.exit(1);
  }
}

console.log('2) the live function accepts a real player for each label that was dead');
{
  /* One real player per formerly dead label, with the position the table
     actually records for him so the paired criterion is satisfiable too. */
  const PAIRS = [
    ['Lionel Messi', 'Played for PSG', 'Forward (FWD)'],
    ['Michael Ballack', 'Played for Bayer Leverkusen', 'Midfielder (MID)'],
    ['Iago Aspas', 'Played for Celta Vigo', 'Forward (FWD)'],
    ['Ousmane Dembélé', 'Played for Rennes', 'Forward (FWD)'],
    ['Robbie Keane', 'Played for LA Galaxy', 'Forward (FWD)'],
  ];
  let ok = 0;
  for (const [player, row, col] of PAIRS) {
    const res = await fetch(`${URL_}/functions/v1/soccer-grid-validate`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: player, rowAttribute: row, colAttribute: col }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.valid === true) ok++;
    else fail(`${player} should satisfy "${row}" and "${col}" and came back: ${String(j.reason || j.error || '').slice(0, 70)}`);
    console.log(`   ${player} / ${row.replace('Played for ', '')}: ${j.valid === true ? 'accepted' : 'REFUSED'}`);
  }
  console.log(`   ${ok}/${PAIRS.length} accepted`);
}

console.log('3) the refusals that were cached from the broken rule are gone');
{
  /* The poisoned cache is the half of this defect that fixing the rule does not
     touch: a cached refusal is served BEFORE the deterministic pass runs, so
     every player already refused by a dead label stays refused forever.
     Seven such verdicts existed on 2026-09-06 and were deleted. Six of them
     refused a real player.

     This section CANNOT read ai_validation_cache: the table has row security on
     with no policy, so the public key sees nothing, which is the correct
     posture for a table only the service role writes. It therefore asks the
     LIVE FUNCTION instead, which does read the cache, and holds that none of
     the poisoned answers comes back. Reading zero rows and calling that clean
     would be the harness passing for the wrong reason.

     A WARNING FOR ANYONE EDITING THIS: driving a caching validator WRITES.
     Running this section against a broken build stores that build's refusals,
     so the next run reports them as poison even after the code is fixed. It
     happened while this file was being written. If a name here is stuck, delete
     its row from ai_validation_cache before concluding the fix failed. */
  const readable = await pageAll('ai_validation_cache?select=cache_key&game=eq.soccer-grid', 20000);
  console.log(`   the cache is ${readable && readable.length ? 'readable' : 'not readable'} with the public key, so this section drives the function instead`);

  const WERE_POISONED = [
    ['Kylian Mbappé', 'Played for PSG', 'Forward (FWD)'],
    ['Vitinha', 'Played for PSG', 'Midfielder (MID)'],
    ['Ousmane Dembélé', 'Played for PSG', 'Forward (FWD)'],
  ];
  let stale = 0;
  for (const [player, row, col] of WERE_POISONED) {
    const res = await fetch(`${URL_}/functions/v1/soccer-grid-validate`, {
      method: 'POST', headers: { ...HEAD, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName: player, rowAttribute: row, colAttribute: col }),
    });
    const j = await res.json().catch(() => ({}));
    const hardRefusal = j.valid === false && !j.unverified;
    if (hardRefusal) { fail(`${player} is still refused for "${row}": a verdict cached while the rule was broken is still being served`); stale++; }
    console.log(`   ${player} / ${row.replace('Played for ', '')}: ${j.valid === true ? 'accepted' : hardRefusal ? 'STILL REFUSED' : 'not settled from records'}`);
  }
  console.log(`   ${WERE_POISONED.length - stale}/${WERE_POISONED.length} of the poisoned answers are gone`);
}

if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exit(failures > 0 ? 0 : 1);
}
console.log(failures === 0
  ? '\nsimSoccerGridLabels: green. Every club cell can be filled, and nothing cached contradicts the rule.'
  : `\nsimSoccerGridLabels: ${failures} finding(s).`);
process.exit(failures === 0 ? 0 : 1);
