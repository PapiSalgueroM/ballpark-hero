/* Window 2026, La Liga: the researched moves file is fit to merge.

   Round 736. The market value table's 2026 rows are an autumn 2025
   snapshot, and scripts/transferOverlay2026.mjs applies the verified January
   and summer 2026 moves only for the pool the games share plus the Premier
   League. This round researched La Liga's twenty 2026-27 clubs, both
   windows, into scripts/data/window2026/laLiga.json (the overlay's field
   shape plus sources, window and checked) and the moves it could not two
   source into scripts/data/window2026/laLiga.left-out.json. One integration
   round merges the files into the overlay later; this harness is what makes
   the file safe to merge:

     1. SHAPE. Every entry carries name, to (engine club or null), db,
        sources, window ("2026-01" or "2026-summer") and checked (a date),
        and loan, add and note are the right types when present. No field
        the overlay does not know.
     2. SOURCES. Exactly two https URLs on two different hosts, one of them
        a named outlet (ESPN, BBC Sport, Sky Sports, AP, Reuters, The
        Athletic), and never Wikipedia, which is a spot check here and never
        a source.
     3. NO DUPLICATES. No entry repeats an overlay name (the overlay already
        applies it) or another entry in this file.
     4. SPELLINGS. Every db is a club spelling the table's 2026 rows carry,
        unless the entry says dbAbsent: true, because the migration writes
        db to the player's row and a typo would invent a club.
     5. ENGINE. A db the roster bake maps (scripts/lib/dbClubNames.mjs) must
        carry exactly that engine club as to, so the bake and the table
        agree on where the player is.
     6. THE TABLE. No entry name matches more than one 2026 row (the
        migration keys on the name alone), and an entry with a club and no
        add data names a player the bake can find (a 2026 or 2025 row at a
        club it models), or the bake fails with "not found and no add data".
     7. LEFT OUT. Every left out row names the player and says why, and no
        player is both applied and left out.
     8. DASHES. No em or en dash in either file (house style).

   NEGATIVE CONTROLS (house rule: prove each check can fail). Each plants
   one bad entry in memory, refuses to run if what it needs is not there,
   and must turn its own section red while every other section stays green:
     WINDOW2026_CONTROL=shape       an entry without its window field
     WINDOW2026_CONTROL=onehost     both sources on espn.com
     WINDOW2026_CONTROL=dupe        an entry repeating the overlay's Rodri
     WINDOW2026_CONTROL=spelling    db "Real Betis Balompie" (no accent)
     WINDOW2026_CONTROL=engine      db Real Betis Balompié with to Sevilla
     WINDOW2026_CONTROL=unreachable a player no row carries, with no add
     WINDOW2026_CONTROL=namesake    a name two 2026 rows carry
     WINDOW2026_CONTROL=leftout     an applied name also in the left out file
     WINDOW2026_CONTROL=dash        an en dash planted in a note

   Needs the database (read only REST, the public anon key). When it cannot
   be reached it says so, checks nothing and exits 1.

   Run: node scripts/simWindow2026LaLiga.mjs
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
const FILE = path.join(ROOT, 'scripts', 'data', 'window2026', 'laLiga.json');
const LEFT_FILE = path.join(ROOT, 'scripts', 'data', 'window2026', 'laLiga.left-out.json');
const CONTROL = process.env.WINDOW2026_CONTROL || '';
const CONTROL_SECTION = { shape: 1, onehost: 2, dupe: 3, spelling: 4, engine: 5, unreachable: 6, namesake: 6, leftout: 7, dash: 8 };
const SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const failures = Object.fromEntries(SECTIONS.map(s => [s, 0]));
let section = 1;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* The named outlets the round's rule accepts as the second source. */
const OUTLET_HOSTS = ['espn.com', 'bbc.co.uk', 'bbc.com', 'skysports.com', 'apnews.com', 'reuters.com', 'theathletic.com', 'nytimes.com'];
const ENTRY_KEYS = new Set(['name', 'to', 'db', 'loan', 'add', 'sources', 'window', 'checked', 'note', 'dbAbsent']);
const WINDOWS = new Set(['2026-01', '2026-summer']);
const EN_DASH = String.fromCharCode(0x2013);
const EM_DASH = String.fromCharCode(0x2014);

function readClient() {
  const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
  const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/);
  const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/);
  if (!url || !key) abort('cannot read the Supabase URL and key from client.ts. NOTHING WAS CHECKED.');
  return { url: url[1], headers: { apikey: key[1], authorization: `Bearer ${key[1]}` } };
}

/* Three attempts, as simTransferOverlay learned: one transient HTTP 500
   under a full board is not a red. A pull that never answers aborts. */
async function rest(db, pathAndQuery) {
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let res = null;
    try { res = await fetch(`${db.url}/rest/v1/${pathAndQuery}`, { headers: db.headers }); }
    catch (err) { last = `unreachable (${String(err).slice(0, 80)})`; }
    if (res && res.ok) return res.json();
    if (res) last = `HTTP ${res.status}`;
    if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
  }
  abort(`\nSUPABASE ${last} for ${pathAndQuery.slice(0, 120)} after 3 attempts. NOTHING WAS CHECKED.`);
}

const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const hostIs = (h, base) => h === base || h.endsWith('.' + base);
const inList = names => names.map(n => `"${String(n).replace(/"/g, '\\"')}"`).join(',');

async function rowsFor(db, names, years) {
  const out = [];
  for (let i = 0; i < names.length; i += 40) {
    const chunk = names.slice(i, i + 40);
    const q = `player_market_values?select=player_name,club,year&year=in.(${years.join(',')})&player_name=in.(${encodeURIComponent(inList(chunk))})&limit=1000`;
    out.push(...await rest(db, q));
  }
  return out;
}

function plantControl(entries, left) {
  const base = entries.find(e => e.db === 'Real Betis Balompié' && !e.add);
  if (!base) abort('control cannot run: no Real Betis Balompié entry to copy');
  const copy = over => ({ ...JSON.parse(JSON.stringify(base)), ...over });
  switch (CONTROL) {
    case 'shape':
      if (!base.window) abort('control cannot run: the base entry has no window to remove');
      delete base.window;
      console.log(`   NEGATIVE CONTROL ON: ${base.name}'s entry lost its window field`);
      return;
    case 'onehost':
      if (hostOf(base.sources[1]) !== 'espn.com') abort('control cannot run: the base entry has no espn.com source');
      base.sources = [base.sources[1], base.sources[1].replace('/squad/', '/roster/')];
      console.log(`   NEGATIVE CONTROL ON: ${base.name}'s two sources are both espn.com`);
      return;
    case 'dupe': {
      const rodri = TRANSFER_OVERLAY_2026.find(e => e.name === 'Rodri');
      if (!rodri || rodri.db !== 'FC Barcelona') abort('control cannot run: the overlay has no Rodri at FC Barcelona');
      const planted = copy({ name: 'Rodri', to: 'Barcelona', db: 'FC Barcelona' });
      delete planted.loan;
      entries.push(planted);
      console.log('   NEGATIVE CONTROL ON: an entry repeats the overlay\'s Rodri');
      return;
    }
    case 'spelling':
      base.db = 'Real Betis Balompie';
      console.log(`   NEGATIVE CONTROL ON: ${base.name}'s db lost its accent ("Real Betis Balompie")`);
      return;
    case 'engine':
      base.to = 'Sevilla';
      console.log(`   NEGATIVE CONTROL ON: ${base.name} goes to Sevilla in the bake but Real Betis Balompié in the table`);
      return;
    case 'unreachable':
      entries.push(copy({ name: 'Planted Nobody Window2026' }));
      console.log('   NEGATIVE CONTROL ON: an entry for a player no row carries, with no add data');
      return;
    case 'namesake':
      /* filled in by main() once the table has named a real namesake */
      return;
    case 'leftout':
      left.push({ name: base.name, move: 'planted', reason: 'planted by the leftout control' });
      console.log(`   NEGATIVE CONTROL ON: ${base.name} is also in the left out file`);
      return;
    case 'dash':
      base.note = `${base.note || ''} planted ${EN_DASH} dash`;
      console.log(`   NEGATIVE CONTROL ON: an en dash planted in ${base.name}'s note`);
      return;
    default:
      abort(`unknown control "${CONTROL}" (${Object.keys(CONTROL_SECTION).join(', ')})`);
  }
}

async function main() {
  const rawEntries = fs.readFileSync(FILE, 'utf8');
  const rawLeft = fs.readFileSync(LEFT_FILE, 'utf8');
  const entries = JSON.parse(rawEntries);
  const left = JSON.parse(rawLeft);
  if (!Array.isArray(entries) || !Array.isArray(left)) abort('both files must be JSON arrays');
  const db = readClient();
  if (CONTROL) plantControl(entries, left);

  if (CONTROL === 'namesake') {
    /* A real namesake, found in the table rather than typed here: the first
       2026 name that two rows carry among a few common single names. */
    const probe = await rest(db, `player_market_values?select=player_name&year=eq.2026&player_name=in.(${encodeURIComponent(inList(['Rodri', 'Paulinho', 'Lucas Silva', 'Danilo', 'Rafinha', 'Pedro', 'Vitinha', 'Marquinhos', 'Bruno', 'Fabinho', 'Raphael', 'Wesley', 'Gabriel', 'Juninho', 'Diego', 'Rodrigo', 'Joao Pedro', 'Douglas']))})&limit=1000`);
    const count = new Map();
    for (const r of probe) count.set(r.player_name, (count.get(r.player_name) || 0) + 1);
    const twin = [...count.entries()].find(([, n]) => n > 1);
    if (!twin) abort('control cannot run: none of the probe names has two 2026 rows');
    const base = entries.find(e => e.db === 'Real Betis Balompié' && !e.add);
    entries.push({ ...JSON.parse(JSON.stringify(base)), name: twin[0] });
    console.log(`   NEGATIVE CONTROL ON: an entry for "${twin[0]}", a name ${twin[1]} rows of 2026 carry`);
  }

  section = 1;
  console.log(`1) Shape: every entry has the overlay's fields plus sources, window and checked (${entries.length} entries)`);
  for (const e of entries) {
    const who = typeof e.name === 'string' && e.name.trim() ? e.name : '(no name)';
    if (who === '(no name)') fail('an entry has no name');
    for (const k of Object.keys(e)) if (!ENTRY_KEYS.has(k)) fail(`${who}: unknown field "${k}"`);
    if (!(typeof e.to === 'string' || e.to === null)) fail(`${who}: to must be an engine club or null`);
    if (typeof e.db !== 'string' || !e.db.trim()) fail(`${who}: no db spelling`);
    if (!Array.isArray(e.sources)) fail(`${who}: sources must be an array`);
    if (!WINDOWS.has(e.window)) fail(`${who}: window must be "2026-01" or "2026-summer", got ${JSON.stringify(e.window)}`);
    if (typeof e.checked !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.checked)) fail(`${who}: checked must be a YYYY-MM-DD date`);
    if ('loan' in e && e.loan !== true) fail(`${who}: loan is either true or absent`);
    if ('note' in e && (typeof e.note !== 'string' || !e.note.trim())) fail(`${who}: note must be text`);
    if ('dbAbsent' in e && (e.dbAbsent !== true || typeof e.note !== 'string')) fail(`${who}: dbAbsent must be true and explained in a note`);
    if ('add' in e) {
      const a = e.add || {};
      if (typeof a.p !== 'string' || !a.p.trim()) fail(`${who}: add.p must be the table's position text`);
      if (!Number.isInteger(a.a) || a.a < 15 || a.a > 45) fail(`${who}: add.a must be a whole age from 15 to 45`);
      if (!Number.isFinite(a.usd) || a.usd <= 0) fail(`${who}: add.usd must be a positive dollar value`);
    }
  }

  section = 2;
  console.log('2) Sources: two https URLs on two hosts, one a named outlet, none Wikipedia');
  for (const e of entries) {
    const s = Array.isArray(e.sources) ? e.sources : [];
    if (s.length !== 2) { fail(`${e.name}: ${s.length} sources, the rule is two`); continue; }
    const hosts = s.map(hostOf);
    if (s.some(u => typeof u !== 'string' || !u.startsWith('https://'))) fail(`${e.name}: every source must be an https URL`);
    if (hosts.some(h => !h)) fail(`${e.name}: a source does not parse as a URL`);
    if (hosts[0] === hosts[1]) fail(`${e.name}: both sources are on ${hosts[0]}, two sources means two hosts`);
    if (hosts.some(h => hostIs(h, 'wikipedia.org'))) fail(`${e.name}: Wikipedia is a spot check, never a source`);
    if (!hosts.some(h => OUTLET_HOSTS.some(o => hostIs(h, o)))) fail(`${e.name}: neither source is a named outlet (${hosts.join(', ')})`);
  }

  section = 3;
  console.log('3) No entry repeats an overlay name or another entry');
  {
    const overlayNames = new Set(TRANSFER_OVERLAY_2026.map(e => e.name));
    const seen = new Set();
    for (const e of entries) {
      if (overlayNames.has(e.name)) fail(`${e.name}: already in scripts/transferOverlay2026.mjs`);
      if (seen.has(e.name)) fail(`${e.name}: listed twice in this file`);
      seen.add(e.name);
    }
    console.log(`   ${entries.length} names against ${overlayNames.size} overlay names`);
  }

  section = 4;
  console.log('4) Every db spelling is a club the 2026 rows carry (or is flagged dbAbsent)');
  {
    const wanted = [...new Set(entries.filter(e => !e.dbAbsent).map(e => e.db).filter(Boolean))];
    const present = new Set();
    /* one existence probe per club, as simTransferOverlay learned: a single
       pull of every row at the wanted clubs is capped at 1,000 rows */
    for (let i = 0; i < wanted.length; i += 10) {
      await Promise.all(wanted.slice(i, i + 10).map(async c => {
        const r = await rest(db, `player_market_values?select=club&year=eq.2026&club=eq.${encodeURIComponent(c)}&limit=1`);
        if (r.length > 0) present.add(c);
      }));
    }
    for (const c of wanted) if (!present.has(c)) fail(`"${c}" is not a club spelling in the 2026 rows`);
    const flagged = entries.filter(e => e.dbAbsent).length;
    console.log(`   ${wanted.length} spellings, ${present.size} present; ${flagged} entries flagged dbAbsent`);
  }

  section = 5;
  console.log('5) A db the bake maps carries that engine club as to');
  {
    const engineClubs = new Set(Object.values(DB_TO_ENGINE));
    let mapped = 0;
    for (const e of entries) {
      const engine = DB_TO_ENGINE[e.db];
      if (engine !== undefined) {
        mapped += 1;
        if (e.to !== engine) fail(`${e.name}: db "${e.db}" is the bake's "${engine}", but to says ${JSON.stringify(e.to)}`);
      } else if (e.to !== null && !engineClubs.has(e.to)) {
        fail(`${e.name}: to "${e.to}" is not an engine club`);
      }
    }
    console.log(`   ${mapped} of ${entries.length} entries land on a club the bake models`);
  }

  section = 6;
  console.log('6) The table: no namesakes, and the bake can find every entry without add data');
  {
    const names = [...new Set(entries.map(e => e.name).filter(Boolean))];
    const rows = await rowsFor(db, names, [2025, 2026]);
    const by = new Map();
    for (const r of rows) { if (!by.has(r.player_name)) by.set(r.player_name, []); by.get(r.player_name).push(r); }
    let with2026 = 0, alreadyThere = 0;
    for (const e of entries) {
      const list = by.get(e.name) || [];
      const r26 = list.filter(r => r.year === 2026);
      if (r26.length > 1) fail(`${e.name}: ${r26.length} rows for 2026 (${r26.map(r => r.club).join(' | ')}), the migration keys on the name alone`);
      if (r26.length) with2026 += 1;
      if (r26.length === 1 && r26[0].club === e.db) alreadyThere += 1;
      const bakeFinds = list.some(r => DB_TO_ENGINE[r.club] !== undefined);
      if (e.to !== null && !e.add && !bakeFinds) fail(`${e.name}: no 2025 or 2026 row at a club the bake models and no add data, the bake would stop`);
      if (e.add && r26.some(r => DB_TO_ENGINE[r.club] !== undefined)) fail(`${e.name}: has add data but a 2026 row at a modeled club, add is for players the bake cannot find`);
    }
    /* a floor, because an empty answer used to read as green (Round 399) */
    if (entries.length && rows.length === 0) fail('the table answered with no rows at all for these names');
    console.log(`   ${with2026} of ${entries.length} entries have a 2026 row; ${alreadyThere} already say the entry's club`);
  }

  section = 7;
  console.log(`7) Left out: every row names the player and says why (${left.length} rows)`);
  {
    const applied = new Set(entries.map(e => e.name));
    for (const l of left) {
      const who = typeof l.name === 'string' && l.name.trim() ? l.name : '(no name)';
      if (who === '(no name)') fail('a left out row has no name');
      if (typeof l.reason !== 'string' || l.reason.trim().length < 10) fail(`${who}: a left out row must say why`);
      if (typeof l.move !== 'string' || !l.move.trim()) fail(`${who}: a left out row must say what move was found`);
      if (applied.has(l.name)) fail(`${who}: both applied and left out`);
    }
  }

  section = 8;
  console.log('8) No em or en dash in either file');
  {
    const text = JSON.stringify(entries) + JSON.stringify(left) + rawEntries + rawLeft;
    const n = [...text].filter(ch => ch === EN_DASH || ch === EM_DASH).length;
    if (n > 0) fail(`${n} em or en dash characters`);
  }

  const total = SECTIONS.reduce((s, k) => s + failures[k], 0);
  if (CONTROL) {
    const own = CONTROL_SECTION[CONTROL];
    const others = SECTIONS.filter(k => k !== own && failures[k] > 0);
    if (failures[own] === 0) abort(`\ncontrol "${CONTROL}": changed NOTHING in section ${own}, the check is dead`);
    if (others.length) abort(`\ncontrol "${CONTROL}": section ${own} fired but so did section(s) ${others.join(', ')}, the control is not clean`);
    console.log(`\ncontrol "${CONTROL}": ${failures[own]} failure(s) fired in section ${own} and nowhere else, the check works`);
    process.exit(0);
  }
  if (total > 0) { console.error(`\nsimWindow2026LaLiga: ${total} failure(s)`); process.exit(1); }
  console.log(`\nsimWindow2026LaLiga: all green (${entries.length} moves, ${left.length} left out)`);
}

main().catch(err => { console.error(err); process.exit(1); });
