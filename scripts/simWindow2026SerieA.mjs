/* Round 738: the Serie A research file for the 2026 windows holds its shape.

   scripts/data/window2026/serieA.json lists the January 2026 and summer 2026
   moves in and out of the twenty 2026-27 Serie A clubs that the market value
   table's 2026 rows (an autumn 2025 snapshot) have not caught up with, and
   that scripts/transferOverlay2026.mjs does not already carry. It is a
   research file: nothing reads it yet, and one integration round folds it
   into the overlay later. Its companion serieA.left-out.json lists the moves
   found but not two sourced, with the reason.

   Every entry uses the overlay's field shape (name, to, db, loan, add) plus:
     sources  two URLs on two different hosts. sources[0] is the official
              club or league announcement, fetched live on the checked date
              and naming the player. sources[1] is the destination club's
              ESPN 2026-27 squad page, which listed him on the checked date.
     window   "2026-01" or "2026-summer": the window of the move that put
              him where he plays now.
     checked  the date both sources were read.
     dbMissing  true when the table has no row spelling the club yet, said
              in the note as well.

   Sections:
     1. SHAPE     every field has its type; to null carries a note.
     2. WINDOW    window is one of the two windows and checked is a date.
     3. HOSTS     the two sources sit on two different hosts.
     4. OVERLAY   no name repeats one already in transferOverlay2026.mjs, and
                  no name appears twice in this file.
     5. SPELLING  every db spelling is a club the 2026 rows carry, unless the
                  entry says dbMissing (read only query, one probe per club).
     6. ENGINE    to is what scripts/lib/dbClubNames.mjs maps db to (null
                  when the engine does not model the club).
     7. ROWS      a name without add matches exactly one 2026 row (the
                  migration keys on the name alone); a name with add matches
                  none.
     8. LEFT OUT  the left-out file has its shape and names nobody the main
                  file carries.

   NEGATIVE CONTROLS (house rule: prove each check can fail). Each plants one
   bad value in memory, refuses to run if what it rewrites is not there, and
   is judged on its own section only:
     WINDOW2026_CONTROL=shape     an entry's loan becomes the string "yes"
     WINDOW2026_CONTROL=window    an entry loses its checked date
     WINDOW2026_CONTROL=hosts     an entry's second source moves to the
                                  first source's host
     WINDOW2026_CONTROL=overlay   an entry takes an overlay name (Mario Gila)
     WINDOW2026_CONTROL=spelling  an entry's db becomes a spelling no row has
     WINDOW2026_CONTROL=engine    a Como entry claims the engine club Juventus
     WINDOW2026_CONTROL=rows      an entry with a 2026 row gains add data
     WINDOW2026_CONTROL=leftout   the left-out file names a player the main
                                  file carries

   Needs the database for sections 5 and 7. When it cannot be reached it says
   so and exits red: nothing was checked, which is not a pass.

   Run: node scripts/simWindow2026SerieA.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* Round 795: the overlay now ends with this file's own accepted rows
   (scripts/data/window2026/overlayAdditions.generated.mjs), so the repeat
   check reads the hand list, the one these rows must not repeat. */
import { TRANSFER_OVERLAY_2026_HAND as TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'scripts', 'data', 'window2026', 'serieA.json');
const LEFT = path.join(ROOT, 'scripts', 'data', 'window2026', 'serieA.left-out.json');
const CONTROL = process.env.WINDOW2026_CONTROL || '';
const SECTIONS = { shape: 1, window: 2, hosts: 3, overlay: 4, spelling: 5, engine: 6, rows: 7, leftout: 8 };
const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const entries = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const leftOut = JSON.parse(fs.readFileSync(LEFT, 'utf8'));
if (!Array.isArray(entries) || entries.length === 0) abort('serieA.json is empty or not an array. NOTHING WAS CHECKED.');
if (!Array.isArray(leftOut)) abort('serieA.left-out.json is not an array. NOTHING WAS CHECKED.');

/* ------------------------------------------------------------------ */
/* Negative controls: each rewrites one value in memory.              */
/* ------------------------------------------------------------------ */
if (CONTROL) {
  if (!SECTIONS[CONTROL]) abort(`unknown control "${CONTROL}" (${Object.keys(SECTIONS).join(', ')})`);
  const plain = entries.find(e => e.to !== null && !e.add && !e.dbMissing && !e.loan);
  if (!plain) abort('control cannot run: no plain entry to plant into');
  if (CONTROL === 'shape') { plain.loan = 'yes'; }
  if (CONTROL === 'window') { delete plain.checked; }
  if (CONTROL === 'hosts') { plain.sources = [plain.sources[0], plain.sources[0].replace(/\/[^/]*$/, '/another-page')]; }
  if (CONTROL === 'overlay') {
    if (!TRANSFER_OVERLAY_2026.some(o => o.name === 'Mario Gila')) abort('control cannot run: Mario Gila is not in the overlay');
    /* Mario Gila has one 2026 row, so section 7 still holds for him. */
    plain.name = 'Mario Gila';
  }
  if (CONTROL === 'spelling') {
    /* to becomes null with a note, so section 6 (engine mapping) still
       holds for the misspelled club and section 1 is still satisfied. */
    plain.db = `${plain.db} (typo)`; plain.to = null; plain.note = 'control';
  }
  if (CONTROL === 'engine') {
    const como = entries.find(e => e.db === 'Como 1907' && e.to === 'Como');
    if (!como) abort('control cannot run: no Como entry');
    como.to = 'Juventus';
  }
  if (CONTROL === 'rows') { plain.add = { p: 'Centre-Forward', a: 25, usd: 10800000 }; }
  if (CONTROL === 'leftout') { leftOut.push({ name: entries[0].name, move: 'planted by the control', why: 'control' }); }
  console.log(`   NEGATIVE CONTROL ON: ${CONTROL} (section ${SECTIONS[CONTROL]})`);
}

/* ------------------------------------------------------------------ */
section = 1;
console.log(`1) Shape (${entries.length} entries)`);
{
  const KEYS = new Set(['name', 'to', 'db', 'loan', 'add', 'window', 'checked', 'sources', 'note', 'dbMissing']);
  for (const e of entries) {
    const who = e && typeof e.name === 'string' ? e.name : JSON.stringify(e).slice(0, 60);
    if (typeof e.name !== 'string' || !e.name.trim()) fail(`${who}: no name`);
    if (!(typeof e.to === 'string' || e.to === null)) fail(`${who}: to must be an engine club or null`);
    if (typeof e.db !== 'string' || !e.db.trim()) fail(`${who}: no db spelling`);
    if ('loan' in e && e.loan !== true) fail(`${who}: loan is written only as true`);
    if ('dbMissing' in e && e.dbMissing !== true) fail(`${who}: dbMissing is written only as true`);
    if ('add' in e) {
      const a = e.add;
      if (!a || typeof a.p !== 'string' || !Number.isInteger(a.a) || a.a < 15 || a.a > 45 || !Number.isFinite(a.usd) || a.usd <= 0) fail(`${who}: add needs p (a position), a (an age) and usd (a value above zero)`);
    }
    if (!Array.isArray(e.sources) || e.sources.length !== 2 || !e.sources.every(u => typeof u === 'string' && /^https:\/\/[^\s/]+\.[^\s/]+\//.test(u))) fail(`${who}: sources must be two https URLs`);
    if ('note' in e && (typeof e.note !== 'string' || !e.note.trim())) fail(`${who}: an empty note`);
    if (e.to === null && typeof e.note !== 'string') fail(`${who}: to is null but no note names the club`);
    if (e.dbMissing && !/spelling/.test(e.note || '')) fail(`${who}: dbMissing without a note saying so`);
    for (const k of Object.keys(e)) if (!KEYS.has(k)) fail(`${who}: unknown field "${k}"`);
  }
}

section = 2;
console.log('2) Window and checked date on every entry');
for (const e of entries) {
  if (e.window !== '2026-01' && e.window !== '2026-summer') fail(`${e.name}: window must be "2026-01" or "2026-summer", got ${JSON.stringify(e.window)}`);
  if (typeof e.checked !== 'string' || !/^2026-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(e.checked)) fail(`${e.name}: checked must be a 2026 date, got ${JSON.stringify(e.checked)}`);
}

section = 3;
console.log('3) Two sources on two different hosts');
{
  let n = 0;
  for (const e of entries) {
    if (!Array.isArray(e.sources) || e.sources.length !== 2) continue; /* section 1 owns that */
    let hosts;
    try { hosts = e.sources.map(u => new URL(u).hostname.replace(/^www\./, '')); } catch { fail(`${e.name}: a source is not a URL`); continue; }
    if (hosts[0] === hosts[1]) fail(`${e.name}: both sources are on ${hosts[0]}`);
    else n += 1;
  }
  console.log(`   ${n} entries with two hosts`);
}

section = 4;
console.log('4) Nobody the overlay already carries, nobody twice');
{
  const overlayNames = new Set(TRANSFER_OVERLAY_2026.map(o => o.name));
  const seen = new Set();
  for (const e of entries) {
    if (overlayNames.has(e.name)) fail(`${e.name}: already in scripts/transferOverlay2026.mjs`);
    if (seen.has(e.name)) fail(`${e.name}: listed twice`);
    seen.add(e.name);
  }
  console.log(`   ${seen.size} names, checked against ${overlayNames.size} overlay names`);
}

/* ------------------------------------------------------------------ */
/* The database: read only, through the public REST endpoint.         */
/* ------------------------------------------------------------------ */
const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };
async function rest(pathAndQuery) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res;
    try { res = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEADERS }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; res = null; }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  abort(`\nSUPABASE ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. NOTHING WAS CHECKED.`);
}

section = 5;
console.log('5) Every db spelling is one the 2026 rows carry, or the entry says it is missing');
{
  const wanted = [...new Set(entries.map(e => e.db).filter(d => typeof d === 'string'))];
  const present = new Set();
  for (let i = 0; i < wanted.length; i += 10) {
    await Promise.all(wanted.slice(i, i + 10).map(async c => {
      const r = await rest(`player_market_values?select=club&year=eq.2026&club=eq.${encodeURIComponent(c)}&limit=1`);
      if (r.length > 0) present.add(c);
    }));
  }
  let flagged = 0;
  for (const e of entries) {
    if (present.has(e.db) && e.dbMissing) fail(`${e.name}: says dbMissing but the table carries "${e.db}"`);
    if (!present.has(e.db) && !e.dbMissing) fail(`${e.name}: "${e.db}" is not a club spelling in the 2026 rows and the entry does not say so`);
    if (e.dbMissing) flagged += 1;
  }
  console.log(`   ${wanted.length} spellings, ${present.size} present, ${flagged} entries flagged as missing`);
}

section = 6;
console.log('6) to is the engine name the club map gives db');
{
  let n = 0;
  for (const e of entries) {
    const want = DB_TO_ENGINE[e.db] ?? null;
    if (e.to !== want) fail(`${e.name}: to is ${JSON.stringify(e.to)} but dbClubNames maps "${e.db}" to ${JSON.stringify(want)}`);
    else n += 1;
  }
  console.log(`   ${n} of ${entries.length} match`);
}

section = 7;
console.log('7) One 2026 row per name, none when the entry adds the player');
{
  const names = [...new Set(entries.map(e => e.name))];
  const byName = new Map();
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40).map(n => `"${n.replace(/"/g, '\\"')}"`).join(',');
    const rows = await rest(`player_market_values?select=player_name,club&year=eq.2026&player_name=in.(${encodeURIComponent(chunk)})&limit=1000`);
    for (const r of rows) byName.set(r.player_name, (byName.get(r.player_name) || 0) + 1);
  }
  let checked = 0;
  for (const e of entries) {
    const n = byName.get(e.name) || 0;
    if (e.add && n > 0) fail(`${e.name}: has ${n} 2026 row(s), so it must not carry add data`);
    if (!e.add && n !== 1) fail(`${e.name}: ${n} rows for 2026, the migration keys on the name alone and needs exactly one`);
    checked += 1;
  }
  if (checked !== entries.length) fail(`checked ${checked} of ${entries.length} entries`);
  console.log(`   ${checked} entries checked against the 2026 rows`);
}

section = 8;
console.log(`8) The left-out file (${leftOut.length} records)`);
{
  const mainNames = new Set(entries.map(e => e.name));
  for (const l of leftOut) {
    const who = l && typeof l.name === 'string' ? l.name : JSON.stringify(l).slice(0, 60);
    if (typeof l.name !== 'string' || !l.name.trim()) fail(`${who}: no name`);
    if (typeof l.move !== 'string' || !l.move.trim()) fail(`${who}: no move`);
    if (typeof l.why !== 'string' || !l.why.trim()) fail(`${who}: no reason`);
    if (mainNames.has(l.name)) fail(`${who}: left out AND in serieA.json`);
  }
}

/* ------------------------------------------------------------------ */
const own = SECTIONS[CONTROL];
const total = Object.values(failures).reduce((a, b) => a + b, 0);
if (CONTROL) {
  const others = Object.entries(failures).filter(([s, n]) => Number(s) !== own && n > 0);
  if (failures[own] === 0) abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
  if (others.length) abort(`\ncontrol "${CONTROL}": fired in section ${own} but also in section(s) ${others.map(([s]) => s).join(', ')}, the control is not clean`);
  console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} and nowhere else, the check works`);
  process.exit(0);
}
if (total > 0) { console.error(`\nsimWindow2026SerieA: ${total} failure(s)`); process.exit(1); }
console.log(`\nsimWindow2026SerieA: all green (${entries.length} entries, ${leftOut.length} left out)`);
