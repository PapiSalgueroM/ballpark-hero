/* Round 737: the Bundesliga's 2026 transfer windows, checked before they are merged.

   scripts/data/window2026/bundesliga.json holds completed January 2026 and
   summer 2026 moves for the eighteen 2026-27 Bundesliga clubs (plus the
   three relegated clubs' moves, marked in their notes), in the field shape
   of scripts/transferOverlay2026.mjs. It is research output: nothing reads
   it until one integration round folds every league's file into the overlay
   and writes the migration. This harness keeps the file honest until then.

     1. SHAPE. name, to (engine club or null), db, optional loan (true) and
        add ({p, a, usd}), sources (exactly two https URLs), window
        ("2026-01" or "2026-summer"), checked (an ISO date), optional note
        and optional dbMissing (true). Nothing else.
     2. HOSTS. The two sources sit on two different hosts, so one outlet
        cannot count twice.
     3. OVERLAY. No entry repeats a name already in transferOverlay2026.mjs,
        and no name appears twice in this file.
     4. ENGINE. Every non-null `to` is a club Club Manager models (the
        `clubs` lists in src/lib/clubManager.ts), so the bake cannot be
        handed a club it has never heard of.
     5. SPELLINGS. Every `db` is a club spelling the market value table's
        2026 rows already carry, unless the entry says dbMissing, in which
        case the spelling must really be absent (the flag cannot lie either
        way). Read only, one probe per spelling.
     6. ROWS. The migration keys on the name alone, so every entry without
        `add` must match exactly one 2026 row, and every `add` entry must
        match none. Entries whose row already says `db` are counted and
        reported (after the integration round they all will), not failed.
     7. DASHES. No em or en dash anywhere in either file (house rule).
     8. LEFT OUT. scripts/data/window2026/bundesliga.left-out.json is an
        array of {name, reason, ...}, and no name is both applied and left out.

   NEGATIVE CONTROLS (house rule: prove each check can fail). Each plants
   one bad entry in memory, refuses to run if what it rewrites is not there,
   and passes only when its own section goes red AND every other section
   stays green:
     WINDOW2026_CONTROL=shape     an entry's window becomes "2026-13"      (1)
     WINDOW2026_CONTROL=hosts     both sources on one host                 (2)
     WINDOW2026_CONTROL=overlay   a planted entry named Rodri             (3)
     WINDOW2026_CONTROL=engine    `to` becomes "Bayern Munchen"            (4)
     WINDOW2026_CONTROL=spelling  `db` becomes "RB Leipzig (typo)"         (5)
     WINDOW2026_CONTROL=rows      a planted entry for a man with no row   (6)
     WINDOW2026_CONTROL=dash      an en dash written into a note           (7)
     WINDOW2026_CONTROL=leftout   an applied name also listed as left out (8)

   Needs the database for sections 5 and 6. When it cannot be reached it
   says so and exits 1: nothing checked is not green.

   Run: node scripts/simWindow2026Bundesliga.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/* Round 795: the overlay now ends with this file's own accepted rows
   (scripts/data/window2026/overlayAdditions.generated.mjs), so the repeat
   check reads the hand list, the one these rows must not repeat. */
import { TRANSFER_OVERLAY_2026_HAND as TRANSFER_OVERLAY_2026 } from './transferOverlay2026.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'scripts', 'data', 'window2026', 'bundesliga.json');
const LEFT = path.join(ROOT, 'scripts', 'data', 'window2026', 'bundesliga.left-out.json');
const CONTROL = process.env.WINDOW2026_CONTROL || '';
const OWN = { shape: 1, hosts: 2, overlay: 3, engine: 4, spelling: 5, rows: 6, dash: 7, leftout: 8 };
const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const failures = Object.fromEntries(SECTIONS.map(s => [s, 0]));
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEADERS = { apikey: KEY, authorization: `Bearer ${KEY}` };

/* Three attempts, the transient-500 lesson simTransferOverlay carries. */
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

const rawEntries = fs.readFileSync(FILE, 'utf8');
const rawLeft = fs.readFileSync(LEFT, 'utf8');
let entries = JSON.parse(rawEntries);
let leftOut = JSON.parse(rawLeft);
if (!Array.isArray(entries) || entries.length === 0) abort('bundesliga.json is not a non-empty array');
let entriesText = rawEntries;

/* ---------------- negative controls ---------------- */
if (CONTROL && !OWN[CONTROL]) abort(`unknown control "${CONTROL}" (${Object.keys(OWN).join(', ')})`);
const firstNonAdd = () => {
  const e = entries.find(x => !x.add && !x.dbMissing && typeof x.to === 'string');
  if (!e) abort('control cannot run: no plain entry to rewrite');
  return e;
};
if (CONTROL === 'shape') {
  const e = firstNonAdd();
  if (e.window !== '2026-summer' && e.window !== '2026-01') abort('control cannot run: the entry has no valid window to break');
  e.window = '2026-13';
  console.log(`   NEGATIVE CONTROL ON: ${e.name}'s window rewritten to 2026-13`);
}
if (CONTROL === 'hosts') {
  const e = firstNonAdd();
  const h = new URL(e.sources[0]).host;
  if (new URL(e.sources[1]).host === h) abort('control cannot run: the entry already has one host');
  e.sources = [e.sources[0], `https://${h}/control-second-page`];
  console.log(`   NEGATIVE CONTROL ON: ${e.name}'s two sources both on ${h}`);
}
if (CONTROL === 'overlay') {
  const rodri = TRANSFER_OVERLAY_2026.find(x => x.name === 'Rodri');
  if (!rodri) abort('control cannot run: the overlay has no Rodri entry');
  const t = firstNonAdd();
  entries.push({ name: 'Rodri', to: rodri.to, db: rodri.db, sources: [...t.sources], window: '2026-summer', checked: t.checked });
  console.log('   NEGATIVE CONTROL ON: a planted entry repeats the overlay name Rodri');
}
if (CONTROL === 'engine') {
  const e = firstNonAdd();
  e.to = 'Bayern Munchen';
  console.log(`   NEGATIVE CONTROL ON: ${e.name}'s engine club rewritten to Bayern Munchen`);
}
if (CONTROL === 'spelling') {
  const e = entries.find(x => x.db === 'RB Leipzig' && !x.dbMissing);
  if (!e) abort('control cannot run: no RB Leipzig entry to misspell');
  e.db = 'RB Leipzig (typo)';
  console.log(`   NEGATIVE CONTROL ON: ${e.name}'s db club misspelled to "RB Leipzig (typo)"`);
}
if (CONTROL === 'rows') {
  const t = firstNonAdd();
  entries.push({ name: 'Control Nobody Nowhere', to: t.to, db: t.db, sources: [...t.sources], window: '2026-summer', checked: t.checked });
  console.log('   NEGATIVE CONTROL ON: a planted entry for a man with no 2026 row and no add data');
}
if (CONTROL === 'dash') {
  const e = firstNonAdd();
  const before = entriesText;
  e.note = (e.note || '') + ' – planted';
  entriesText = JSON.stringify(entries, null, 2);
  if (entriesText === before) abort('control cannot run: the rewrite changed nothing');
  console.log(`   NEGATIVE CONTROL ON: an en dash written into ${e.name}'s note`);
}
if (CONTROL === 'leftout') {
  const e = firstNonAdd();
  leftOut = [...leftOut, { name: e.name, reason: 'planted by the leftout control' }];
  console.log(`   NEGATIVE CONTROL ON: ${e.name} planted in the left-out list too`);
}

/* ---------------- 1. shape ---------------- */
section = 1;
console.log(`1) Shape (${entries.length} entries)`);
const ALLOWED = new Set(['name', 'to', 'db', 'loan', 'add', 'sources', 'window', 'checked', 'note', 'dbMissing']);
for (const e of entries) {
  const who = typeof e?.name === 'string' ? e.name : JSON.stringify(e).slice(0, 60);
  if (typeof e !== 'object' || e === null || Array.isArray(e)) { fail(`${who}: not an object`); continue; }
  for (const k of Object.keys(e)) if (!ALLOWED.has(k)) fail(`${who}: unexpected field "${k}"`);
  if (typeof e.name !== 'string' || !e.name.trim() || e.name !== e.name.trim()) fail(`${who}: name must be a trimmed non-empty string`);
  if (!(typeof e.to === 'string' || e.to === null)) fail(`${who}: to must be an engine club or null`);
  if (typeof e.db !== 'string' || !e.db.trim()) fail(`${who}: no db spelling`);
  if ('loan' in e && e.loan !== true) fail(`${who}: loan is present but not true`);
  if ('dbMissing' in e && e.dbMissing !== true) fail(`${who}: dbMissing is present but not true`);
  if ('note' in e && (typeof e.note !== 'string' || !e.note.trim())) fail(`${who}: note must be a non-empty string`);
  if ('add' in e) {
    const a = e.add;
    if (!a || typeof a.p !== 'string' || !Number.isInteger(a.a) || a.a < 15 || a.a > 45 || !Number.isInteger(a.usd) || a.usd <= 0) {
      fail(`${who}: add must be {p: position, a: age 15 to 45, usd: positive integer}`);
    }
  }
  if (!Array.isArray(e.sources) || e.sources.length !== 2) fail(`${who}: sources must be exactly two URLs`);
  else for (const s of e.sources) {
    let ok = false;
    try { ok = new URL(s).protocol === 'https:'; } catch { ok = false; }
    if (!ok) fail(`${who}: source "${String(s).slice(0, 60)}" is not an https URL`);
  }
  if (e.window !== '2026-01' && e.window !== '2026-summer') fail(`${who}: window must be 2026-01 or 2026-summer, got ${e.window}`);
  if (typeof e.checked !== 'string' || !/^2026-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(e.checked)) fail(`${who}: checked must be a 2026 ISO date`);
}

/* ---------------- 2. two hosts ---------------- */
section = 2;
console.log('2) Two distinct source hosts per entry');
{
  const host = s => { try { return new URL(s).host.replace(/^www\./, ''); } catch { return null; } };
  const tally = new Map();
  for (const e of entries) {
    if (!Array.isArray(e.sources) || e.sources.length !== 2) continue; // section 1 owns this
    const [a, b] = e.sources.map(host);
    if (!a || !b) continue; // section 1 owns this
    if (a === b) fail(`${e.name}: both sources are on ${a}`);
    for (const h of [a, b]) tally.set(h, (tally.get(h) || 0) + 1);
  }
  console.log('   hosts: ' + [...tally.entries()].sort((x, y) => y[1] - x[1]).map(([h, n]) => `${h} ${n}`).join(', '));
}

/* ---------------- 3. overlay and self duplicates ---------------- */
section = 3;
console.log('3) No overlay name repeated, no name twice');
{
  const overlayNames = new Set(TRANSFER_OVERLAY_2026.map(x => x.name));
  const seen = new Set();
  for (const e of entries) {
    if (overlayNames.has(e.name)) fail(`${e.name}: already in transferOverlay2026.mjs`);
    if (seen.has(e.name)) fail(`${e.name}: listed twice`);
    seen.add(e.name);
  }
  console.log(`   ${seen.size} distinct names, overlay holds ${overlayNames.size}`);
}

/* ---------------- 4. engine clubs ---------------- */
section = 4;
console.log('4) Every `to` is a club Club Manager models');
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'clubManager.ts'), 'utf8');
  const engine = new Set();
  for (const m of src.matchAll(/clubs:\s*\[([^\]]*)\]/g)) {
    for (const q of m[1].matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)) engine.add((q[1] ?? q[2]).replace(/\\'/g, "'"));
  }
  if (engine.size < 300) fail(`only ${engine.size} engine clubs parsed from clubManager.ts, the parser is broken`);
  let checked = 0;
  for (const e of entries) {
    if (e.to === null || typeof e.to !== 'string') continue;
    checked += 1;
    if (!engine.has(e.to)) fail(`${e.name}: "${e.to}" is not a Club Manager club`);
  }
  console.log(`   ${checked} engine clubs checked against ${engine.size} modelled clubs`);
}

/* ---------------- 5. db spellings ---------------- */
section = 5;
console.log('5) Every db spelling is carried by the 2026 rows (or honestly flagged missing)');
{
  const wanted = [...new Set(entries.map(e => e.db).filter(d => typeof d === 'string' && d.trim()))];
  const present = new Set();
  for (let i = 0; i < wanted.length; i += 10) {
    await Promise.all(wanted.slice(i, i + 10).map(async c => {
      const r = await rest(`player_market_values?select=club&year=eq.2026&club=eq.${encodeURIComponent(c)}&limit=1`);
      if (r.length > 0) present.add(c);
    }));
  }
  let flagged = 0;
  for (const e of entries) {
    if (typeof e.db !== 'string') continue;
    if (e.dbMissing) {
      flagged += 1;
      if (present.has(e.db)) fail(`${e.name}: flagged dbMissing but "${e.db}" IS a 2026 spelling`);
      else console.log(`   flagged: ${e.name} -> "${e.db}" has no 2026 spelling yet`);
    } else if (!present.has(e.db)) fail(`${e.name}: "${e.db}" is not a club spelling in the 2026 rows (typo, or flag it dbMissing)`);
  }
  console.log(`   ${wanted.length} spellings, ${wanted.filter(c => present.has(c)).length} present, ${flagged} entries flagged missing`);
}

/* ---------------- 6. one row per name ---------------- */
section = 6;
console.log('6) Each entry names exactly one 2026 row (none for add entries)');
{
  const names = entries.map(e => e.name).filter(n => typeof n === 'string');
  const byName = new Map();
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    const inList = chunk.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',');
    const rows = await rest(`player_market_values?select=player_name,club&year=eq.2026&player_name=in.(${encodeURIComponent(inList)})&limit=1000`);
    for (const r of rows) { if (!byName.has(r.player_name)) byName.set(r.player_name, []); byName.get(r.player_name).push(r); }
  }
  let applied = 0, pending = 0;
  for (const e of entries) {
    const list = byName.get(e.name) || [];
    if (e.add) {
      if (list.length !== 0) fail(`${e.name}: carries add data but already has ${list.length} 2026 row(s)`);
      continue;
    }
    if (list.length === 0) fail(`${e.name}: no 2026 row and no add data, the migration would change nothing`);
    else if (list.length > 1) fail(`${e.name}: ${list.length} rows for 2026, the migration keys on the name alone`);
    else if (list[0].club === e.db) applied += 1;
    else pending += 1;
  }
  if (names.length > 0 && byName.size === 0) fail('the table answered no rows at all, nothing was really checked');
  console.log(`   ${pending} rows still stale (the moves to apply), ${applied} already say the verified club`);
}

/* ---------------- 7. dashes ---------------- */
section = 7;
console.log('7) No em or en dash in either file');
{
  const DASH = /[–—]/;
  for (const [label, text] of [['bundesliga.json', entriesText], ['bundesliga.left-out.json', rawLeft]]) {
    const lines = text.split('\n');
    lines.forEach((l, i) => { if (DASH.test(l)) fail(`${label}:${i + 1} carries an em or en dash`); });
  }
}

/* ---------------- 8. left out ---------------- */
section = 8;
console.log(`8) Left-out list (${Array.isArray(leftOut) ? leftOut.length : 'not an array'})`);
{
  if (!Array.isArray(leftOut)) fail('bundesliga.left-out.json is not an array');
  else {
    const applied = new Set(entries.map(e => e.name));
    const seen = new Set();
    for (const l of leftOut) {
      if (!l || typeof l.name !== 'string' || !l.name.trim()) { fail('a left-out item has no name'); continue; }
      if (typeof l.reason !== 'string' || l.reason.trim().length < 15) fail(`${l.name}: a left-out item needs a real reason`);
      if (applied.has(l.name)) fail(`${l.name}: both applied and left out`);
      if (seen.has(l.name)) fail(`${l.name}: left out twice`);
      seen.add(l.name);
    }
  }
}

const total = SECTIONS.reduce((n, s) => n + failures[s], 0);
if (CONTROL) {
  const own = OWN[CONTROL];
  const others = SECTIONS.filter(s => s !== own).reduce((n, s) => n + failures[s], 0);
  if (failures[own] > 0 && others === 0) {
    console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} and no other section moved, the check works`);
    process.exit(0);
  }
  if (failures[own] === 0) abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
  abort(`\ncontrol "${CONTROL}": section ${own} fired but ${others} failure(s) leaked into other sections`);
}
if (total > 0) { console.error(`\nsimWindow2026Bundesliga: ${total} failure(s)`); process.exit(1); }
console.log(`\nsimWindow2026Bundesliga: all green (${entries.length} entries, ${leftOut.length} left out)`);
