/**
 * Round 669 harness: World XI knows its defensive midfielders.
 *
 * The report (World XI "Wrong answer", 2026-09-21): a CDM or CM slot answered
 * "Nobody from X matches that" for Manuel Ugarte, Sofyan Amrabat, Wataru Endo,
 * Tyler Adams and PSG's Vitinha. The game was right about its pool and the pool
 * was wrong: player_market_values carried no "Defensive Midfield" rows for 2023
 * to 2025 and 46 for 2026. Round 669 writes the missing 2026 rows, two sourced
 * and recorded in scripts/data/defensiveMidfield2026.json, as the migration
 * supabase/migrations/20260928_round_669_defensive_midfield_2026.sql.
 *
 * What this holds, on the pool World XI itself fetches (fetchWorldXiPool,
 * bundled from src/lib/worldXi.ts):
 *   1. The record and the migration agree. Every row the record writes is staged
 *      in the migration exactly once with the same club, nationality, age and
 *      value, nothing else is staged, the club corrections match, and every
 *      staged value is the record's own Transfermarkt figure times 1.08 with
 *      FotMob inside the record's band and listing him at defensive midfield.
 *      The SQL is read with its comments stripped.
 *   2. The named current defensive midfielders are in the pool: the report's
 *      four plus a list from the research, each at his club with his country,
 *      and a search for his name in his country's slot offers him; and every
 *      staged row is a pooled player at its staged club. Measured before the
 *      migration: 0 of the named are there.
 *   3. They fit the slots Round 319's rules give them: every staged row found in
 *      the pool is a CDM and fits every CDM and every CM slot in every formation.
 *   4. Namesakes stay two people: Paris Saint-Germain's Vitinha and Genoa's, and
 *      Newcastle's Nico González and Juventus', are all in the pool, and a search
 *      for "vitinha" in Portugal's slot offers both.
 *
 * MODES. By default it reads the live pool, so it is RED until the migration is
 * applied: that is the point of it. WXIDM_PROJECT=1 measures the migration
 * before it is applied: the live fetch is answered with the rows the migration
 * would leave behind (its staged rows after every existing 2026 row, the
 * corrections applied), parsed from the SQL file itself. It refuses (exit 2)
 * once the migration is live.
 *
 * NEGATIVE CONTROLS. WXIDM_CONTROL=<name> breaks one input in memory. Each
 * refuses to run (exit 2) unless the thing it changes is there exactly once, and
 * each must turn exactly its own section red; the run then exits 1 and says so.
 * A control that turns no section red, or another one too, exits 4.
 *   stagedrift  Ugarte's staged value moved by one dollar in the SQL copy   (1)
 *   commented   Ugarte's staged line commented out in the SQL copy         (1)
 *   recordvalue    Ugarte's Transfermarkt value moved in the record copy   (1)
 *   recordband     Ugarte's FotMob value set far outside the band          (1)
 *   recordposition FotMob no longer lists Ugarte at defensive midfield     (1)
 *   recordcountry  FotMob plays Ugarte for another country                 (1)
 *   noplayer    Ugarte's 2026 row dropped from what the game is served      (2)
 *   normalize   "Defensive Midfield" normalised to CB in squadDeal's copy   (3)
 *   namesake    the Round 669 same-year namesake keying undone in worldXi   (4)
 * WXIDM_CONTROL=all runs every control in turn and is green only if each one
 * behaved.
 *
 * Run: node scripts/simWorldXiDefensiveMids.mjs                (live, needs the database)
 *      WXIDM_PROJECT=1 node scripts/simWorldXiDefensiveMids.mjs (before the migration)
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SELF), '..');
const RECORD = path.join(ROOT, 'scripts/data/defensiveMidfield2026.json');
const MIGRATION = path.join(ROOT, 'supabase/migrations/20260928_round_669_defensive_midfield_2026.sql');
const PROJECT = process.env.WXIDM_PROJECT === '1';
const CONTROLS = { stagedrift: 1, commented: 1, recordvalue: 1, recordband: 1, recordposition: 1, recordcountry: 1, noplayer: 2, normalize: 3, namesake: 4 };
const CONTROL = process.env.WXIDM_CONTROL || '';
const MARK = 'WXIDM-CONTROL-BEHAVED';

if (CONTROL === 'all') {
  let bad = 0;
  for (const name of Object.keys(CONTROLS)) {
    const r = spawnSync(process.execPath, [SELF], { env: { ...process.env, WXIDM_CONTROL: name }, encoding: 'utf8' });
    const out = `${r.stdout || ''}\n${r.stderr || ''}`;
    const ok = r.status === 1 && out.includes(`${MARK} ${name}`);
    if (!ok) bad += 1;
    const last = out.trim().split('\n').filter(Boolean).pop() || '';
    console.log(`  ${ok ? 'ok  ' : 'BAD '} ${name.padEnd(11)} exit ${r.status}  ${last}`);
  }
  console.log('');
  if (bad) { console.error(`simWorldXiDefensiveMids controls: ${bad} of ${Object.keys(CONTROLS).length} did not behave.`); process.exit(1); }
  console.log(`simWorldXiDefensiveMids controls: green. All ${Object.keys(CONTROLS).length} turned their own section red and only that one.`);
  process.exit(0);
}
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`WXIDM_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')}, all)`);
  process.exit(2);
}
const refuse = m => { console.error(`control ${CONTROL} cannot run: ${m}`); process.exit(2); };
const once = (text, anchor, what) => {
  const n = text.split(anchor).length - 1;
  if (n !== 1) refuse(`${what}: the anchor ${JSON.stringify(anchor)} appears ${n} times, not once`);
};
if (CONTROL) console.log(`NEGATIVE CONTROL ${CONTROL} is on: section ${CONTROLS[CONTROL]} is SUPPOSED to go red, and only that one.\n`);

/* ---- per section bookkeeping ---- */
const failed = new Map();
let section = 0;
const fail = m => {
  failed.set(section, (failed.get(section) || 0) + 1);
  if (failed.get(section) <= 8) console.error('  FAIL: ' + m);
};

/* ---- the named current defensive midfielders (the report's four, then the
   research's most valuable and most widely known, across leagues). Namesakes
   are held in section 4, so the namesake control cannot reach this list. ---- */
const NAMED = [
  ['Manuel Ugarte', 'Manchester United', 'Uruguay'],
  ['Sofyan Amrabat', 'Ajax Amsterdam', 'Morocco'],
  ['Wataru Endo', 'Liverpool FC', 'Japan'],
  ['Tyler Adams', 'AFC Bournemouth', 'United States'],
  ['Aleksandar Pavlovic', 'Bayern Munich', 'Germany'],
  ['Adam Wharton', 'Crystal Palace', 'England'],
  ['Carlos Baleba', 'Manchester United', 'Cameroon'],
  ['Angelo Stiller', 'VfB Stuttgart', 'Germany'],
  ['James Garner', 'Everton FC', 'England'],
  ['Morten Hjulmand', 'Atlético de Madrid', 'Denmark'],
  ['Máximo Perrone', 'Como 1907', 'Argentina'],
  ['Alan Varela', 'FC Porto', 'Argentina'],
  ['Aleksandar Stanković', 'Inter Milan', 'Serbia'],
  ['Ethan Ampadu', 'Leeds United', 'Wales'],
  ['Tyler Morton', 'Olympique Lyon', 'England'],
  ['Nicolas Seiwald', 'RB Leipzig', 'Austria'],
  ['Sander Berge', 'Fulham FC', 'Norway'],
  ['Youssouf Fofana', 'Sevilla FC', 'France'],
  ['Ardon Jashari', 'AC Milan', 'Switzerland'],
  ['Roméo Lavia', 'Chelsea FC', 'Belgium'],
  ['Samuele Ricci', 'Como 1907', 'Italy'],
  ['Billy Gilmour', 'SSC Napoli', 'Scotland'],
  ['Ibrahim Sangaré', 'Nottingham Forest', "Cote d'Ivoire"],
  ['Marc Casadó', 'Deportivo de La Coruña', 'Spain'],
  ['Richard Ríos', 'Al-Ittihad Club', 'Colombia'],
  ['Bryan Cristante', 'AS Roma', 'Italy'],
  ['Jefferson Lerma', 'Crystal Palace', 'Colombia'],
  ['Callum McGregor', 'Celtic FC', 'Scotland'],
  ['Robert Andrich', 'Bayer 04 Leverkusen', 'Germany'],
  ['Andrés Cubas', 'Vancouver Whitecaps FC', 'Paraguay'],
];
const NAMESAKES = [
  ['Vitinha', 'Paris Saint-Germain', 'Genoa CFC', 'Portugal'],
  ['Nico González', 'Newcastle United', 'Juventus FC', null],
];

/* ---- inputs, read once, mutated only in memory by a control ---- */
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
if (CONTROL.startsWith('record')) {
  const rows = record.write.filter(w => w.name === 'Manuel Ugarte');
  if (rows.length !== 1) refuse(`the record carries ${rows.length} Manuel Ugarte rows, not one`);
  const u = rows[0];
  const expect = (got, want, what) => { if (got !== want) refuse(`Ugarte's ${what} is ${JSON.stringify(got)}, the control expects ${JSON.stringify(want)}`); };
  if (CONTROL === 'recordvalue') { expect(u.transfermarkt.valueEur, 25000000, 'Transfermarkt value'); u.transfermarkt.valueEur = 26000000; }
  if (CONTROL === 'recordband') { expect(u.fotmob.valueEur, 30586410, 'FotMob value'); u.fotmob.valueEur = 1; }
  if (CONTROL === 'recordposition') { expect(u.fotmob.primary, 'Defensive Midfielder', 'FotMob primary'); expect(u.fotmob.positions.join(','), 'DM,CM', 'FotMob positions'); u.fotmob.primary = 'Central Midfielder'; u.fotmob.positions = ['CM']; }
  if (CONTROL === 'recordcountry') { expect(u.fotmob.country, 'Uruguay', 'FotMob country'); u.fotmob.country = 'Argentina'; }
}
const sqlOnDisk = fs.readFileSync(MIGRATION, 'utf8');
let sqlText = sqlOnDisk;
const UGARTE_LINE = "('Manuel Ugarte', 'Manchester United', 'Uruguay', 25, 27000000, null, null)";
if (CONTROL === 'stagedrift') {
  once(sqlText, UGARTE_LINE, 'the migration copy');
  sqlText = sqlText.replace(UGARTE_LINE, UGARTE_LINE.replace('27000000', '27000001'));
}
if (CONTROL === 'commented') {
  const line = `  ${UGARTE_LINE},\n`;
  once(sqlText, line, 'the migration copy');
  sqlText = sqlText.replace(line, `  -- ${UGARTE_LINE},\n`);
}

/* SQL comments stripped before anything is read, so a line commented out is
   never mistaken for a staged row. */
function stripSql(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => {
    let inStr = false;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === "'") inStr = !inStr;
      else if (!inStr && l[i] === '-' && l[i + 1] === '-') return l.slice(0, i);
    }
    return l;
  }).join('\n');
}
function tuples(sql, table) {
  const code = stripSql(sql);
  const start = code.indexOf(`insert into ${table} (`);
  if (start < 0) return null;
  const vals = code.indexOf(') values', start);
  const end = code.indexOf(';', vals);
  const body = code.slice(vals + ') values'.length, end);
  const out = [];
  const re = /\(((?:'(?:[^']|'')*'|[^()'])*)\)/g;
  for (const m of body.matchAll(re)) {
    const fields = [];
    const fre = /'((?:[^']|'')*)'|(-?\d+)|(null)/g;
    for (const f of m[1].matchAll(fre)) fields.push(f[1] !== undefined ? f[1].replace(/''/g, "'") : f[2] !== undefined ? Number(f[2]) : null);
    out.push(fields);
  }
  return out;
}
/* FotMob and Transfermarkt spell a handful of countries differently */
const COUNTRY_ALIAS = { usa: 'united states', 'ivory coast': "cote d'ivoire", czechia: 'czech republic', 'bosnia and herzegovina': 'bosnia-herzegovina', 'congo dr': 'dr congo' };
const foldCountry = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const sameCountry = (a, b) => { const x = foldCountry(a), y = foldCountry(b); return x === y || COUNTRY_ALIAS[x] === y || COUNTRY_ALIAS[y] === x; };
const stagedOf = sql => (tuples(sql, 'r669_dm') || []).map(([name, club, nationality, age, value, namesakeClub, namesakePosition]) => ({ name, club, nationality, age, value, namesakeClub, namesakePosition }));
const fixesOf = sql => (tuples(sql, 'r669_fix') || []).map(([name, from, to]) => ({ name, from, to }));

/* ---- section 1: the record and the migration agree ---- */
section = 1;
console.log('1) the record and the migration agree');
{
  const staged = stagedOf(sqlText);
  const fixes = fixesOf(sqlText);
  const key = r => `${r.name}|${r.club}`;
  const byKey = new Map();
  for (const s of staged) {
    if (byKey.has(key(s))) fail(`${s.name} (${s.club}) is staged twice`);
    byKey.set(key(s), s);
  }
  const want = new Set();
  for (const w of record.write) {
    want.add(key(w));
    const s = byKey.get(key(w));
    if (!s) { fail(`${w.name} (${w.club}) is in the record but not staged in the migration`); continue; }
    if (s.nationality !== w.nationality || s.age !== w.age || s.value !== w.value_usd) {
      fail(`${w.name}: the migration stages ${s.nationality}, ${s.age}, ${s.value}; the record says ${w.nationality}, ${w.age}, ${w.value_usd}`);
    }
    if (!!w.namesake !== !!s.namesakeClub) fail(`${w.name}: namesake in the record ${!!w.namesake}, in the migration ${!!s.namesakeClub}`);
    const tm = w.transfermarkt, fm = w.fotmob;
    if (w.value_usd !== Math.round(tm.valueEur * record.eurUsdRate)) fail(`${w.name}: ${w.value_usd} is not Transfermarkt's EUR ${tm.valueEur} times ${record.eurUsdRate}`);
    const ratio = fm.valueEur / tm.valueEur;
    if (!(ratio >= record.valueBand.low && ratio <= record.valueBand.high)) fail(`${w.name}: FotMob's EUR ${fm.valueEur} is outside the band against Transfermarkt's EUR ${tm.valueEur}`);
    if (!fm.positions.includes('DM') && !/defensive midfielder/i.test(fm.primary || '')) fail(`${w.name}: FotMob does not list him at defensive midfield`);
    if (w.age !== tm.age) fail(`${w.name}: the staged age ${w.age} is not Transfermarkt's ${tm.age}`);
    if (w.nationality !== tm.citizenship[0]) fail(`${w.name}: the staged country ${w.nationality} is not Transfermarkt's first citizenship ${tm.citizenship[0]}`);
    if (!sameCountry(w.nationality, fm.country)) fail(`${w.name}: FotMob plays him for ${fm.country}, the row says ${w.nationality}`);
  }
  for (const s of staged) if (!want.has(key(s))) fail(`${s.name} (${s.club}) is staged but the record does not write him`);
  const fixKey = f => `${f.name}|${f.from}|${f.to}`;
  const wantFix = new Set(record.corrections.map(c => fixKey({ name: c.name, from: c.from, to: c.to })));
  const gotFix = new Set(fixes.map(fixKey));
  for (const k of wantFix) if (!gotFix.has(k)) fail(`the correction ${k} is in the record but not the migration`);
  for (const k of gotFix) if (!wantFix.has(k)) fail(`the migration corrects ${k}, which the record does not`);
  if (record.write.length === 0) fail('the record writes nothing');
  console.log(`   ${staged.length} staged rows against ${record.write.length} in the record, ${fixes.length} corrections against ${record.corrections.length}`);
}

/* ---- the pool, fetched by the game's own code ---- */
const client = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const realFetch = globalThis.fetch;
const H = { apikey: KEY, authorization: `Bearer ${KEY}` };

async function allLive2026() {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const res = await realFetch(`${URL_}/rest/v1/player_market_values?select=id,player_name,nationality,position,club,market_value_usd,year,age&year=eq.2026&market_value_usd=gt.0&order=id.asc&limit=1000&offset=${off}`, { headers: H });
    if (!res.ok) { console.error(`DATABASE REFUSED THE 2026 READ (HTTP ${res.status}). NOTHING WAS CHECKED.`); process.exit(1); }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

let served2026 = null; // the projected 2026 snapshot, when projecting
if (PROJECT) {
  const live = await allLive2026();
  const staged = stagedOf(sqlOnDisk);
  const applied = staged.filter(s => live.some(r => r.player_name === s.name && r.club === s.club && r.position === 'Defensive Midfield'));
  if (applied.length) {
    console.error(`WXIDM_PROJECT refuses: ${applied.length} staged rows are already live (${applied.slice(0, 3).map(s => s.name).join(', ')}), so the migration is applied. Run without WXIDM_PROJECT.`);
    process.exit(2);
  }
  const fixes = fixesOf(sqlOnDisk);
  for (const f of fixes) for (const r of live) if (r.player_name === f.name && r.position === 'Defensive Midfield' && r.club === f.from) r.club = f.to;
  let id = Math.max(...live.map(r => r.id));
  served2026 = [...live, ...staged.map(s => ({ id: ++id, player_name: s.name, nationality: s.nationality, position: 'Defensive Midfield', club: s.club, market_value_usd: s.value, year: 2026, age: s.age }))];
  console.log(`\n   PROJECTED: the live ${live.length} rows of 2026 plus the migration's ${staged.length} staged rows and ${fixes.length} corrections`);
}

let controlDropped = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (!url.pathname.endsWith('/rest/v1/player_market_values')) return realFetch(input, init);
  const is2026 = url.searchParams.get('year') === 'eq.2026';
  let rows;
  if (PROJECT && is2026) {
    const off = Number(url.searchParams.get('offset') || 0);
    const lim = Number(url.searchParams.get('limit') || 1000);
    rows = served2026.slice(off, off + lim);
  } else {
    const res = await realFetch(input, init);
    if (!res.ok || CONTROL !== 'noplayer') return res;
    rows = await res.json();
  }
  if (CONTROL === 'noplayer' && is2026) {
    const before = rows.length;
    rows = rows.filter(r => !(r.player_name === 'Manuel Ugarte' && r.club === 'Manchester United'));
    controlDropped += before - rows.length;
  }
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
};

/* bundle worldXi exactly as the page uses it; the source controls swap one
   file's text in memory through a load hook, never on disk */
const swaps = new Map();
if (CONTROL === 'normalize') {
  const f = path.join(ROOT, 'src/lib/squadDeal.ts');
  const text = fs.readFileSync(f, 'utf8');
  const anchor = "'Defensive Midfield': 'CDM'";
  once(text, anchor, 'squadDeal.ts');
  swaps.set(path.normalize(f), text.replace(anchor, "'Defensive Midfield': 'CB'"));
}
if (CONTROL === 'namesake') {
  const f = path.join(ROOT, 'src/lib/worldXi.ts');
  let text = fs.readFileSync(f, 'utf8');
  for (const [a, b] of [['prev.byClub.get(club)', "prev.byClub.get('')"], ['prev.byClub.set(club, player)', "prev.byClub.set('', player)"], ['new Map([[club, player]])', "new Map([['', player]])"]]) {
    once(text, a, 'worldXi.ts');
    text = text.replace(a, b);
  }
  swaps.set(path.normalize(f), text);
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'simWxiDm-'));
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const w = await import('${ROOT.replaceAll('\\', '/')}/src/lib/worldXi.ts');`,
  `const s = await import('${ROOT.replaceAll('\\', '/')}/src/lib/squadDeal.ts');`,
  'export const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers } = w;',
  'export const { FORMATIONS } = s;',
].join('\n'));
let swapped = 0;
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'control-swap',
    setup(b) {
      b.onLoad({ filter: /\.tsx?$/ }, args => {
        const text = swaps.get(path.normalize(args.path));
        if (text === undefined) return undefined;
        swapped += 1;
        return { contents: text, loader: 'ts' };
      });
    },
  }],
});
if (swaps.size && swapped !== swaps.size) refuse(`${swaps.size} source swaps prepared, ${swapped} reached the bundle`);
const { fetchWorldXiPool, fitsSlot, suggestCountryPlayers, FORMATIONS } = await import(pathToFileURL(BUNDLE).href);
const data = await fetchWorldXiPool();
fs.rmSync(TMP, { recursive: true, force: true });
if (!data) {
  console.error('SUPABASE UNREACHABLE OR POOL TOO SMALL. NOTHING WAS CHECKED.');
  process.exit(1);
}
if (CONTROL === 'noplayer' && controlDropped !== 1) refuse(`it should drop exactly one Ugarte row from what the game is served, it dropped ${controlDropped}`);

const at = (name, club) => data.players.filter(p => p.name === name && p.club === club);
const staged = stagedOf(sqlOnDisk);

/* ---- section 2: the named current defensive midfielders are in the pool ---- */
section = 2;
console.log('\n2) the named current defensive midfielders are in the pool the game fetches');
{
  let present = 0;
  for (const [name, club, country] of NAMED) {
    const hit = at(name, club).find(p => p.country === country);
    if (!hit) { fail(`${name} (${club}, ${country}) is not in the World XI pool, so his slot says nobody matches`); continue; }
    const offered = suggestCountryPlayers(data, country, name).some(p => p.name === name && p.club === club);
    if (!offered) { fail(`${name} is pooled but a search for his name in ${country}'s slot does not offer him`); continue; }
    present += 1;
  }
  let stagedIn = 0;
  const missing = [];
  for (const s of staged) {
    if (at(s.name, s.club).length) stagedIn += 1;
    else missing.push(`${s.name} (${s.club})`);
  }
  if (missing.length) fail(`${missing.length} staged rows are not in the pool, e.g. ${missing.slice(0, 4).join(', ')}`);
  const cdm = data.players.filter(p => p.position === 'CDM').length;
  console.log(`   ${present} of ${NAMED.length} named defensive midfielders pooled and offered by search (before Round 669: 0)`);
  console.log(`   ${stagedIn} of ${staged.length} staged rows pooled; ${cdm} pooled CDMs of ${data.players.length} players (before Round 669: 46)`);
}

/* ---- section 3: they fit the slots ---- */
section = 3;
console.log('\n3) they fit every CDM and CM slot the formations have');
{
  const slots = FORMATIONS.flatMap(f => f.slots.filter(s => s.label === 'CDM' || s.label === 'CM').map(s => ({ ...s, formation: f.name })));
  const cdmSlots = slots.filter(s => s.label === 'CDM').length;
  const cmSlots = slots.filter(s => s.label === 'CM').length;
  if (!cdmSlots || !cmSlots) fail(`the formations offer ${cdmSlots} CDM and ${cmSlots} CM slots; both must exist`);
  let checked = 0;
  let misfit = 0;
  for (const s of staged) {
    for (const p of at(s.name, s.club)) {
      checked += 1;
      const bad = p.position !== 'CDM' ? [`stored as ${p.position}`] : slots.filter(sl => !fitsSlot(p, sl)).map(sl => `${sl.formation} ${sl.label}`);
      if (bad.length) { misfit += 1; fail(`${p.name} (${p.club}) does not take a defensive or central midfield slot: ${bad.slice(0, 3).join(', ')}`); }
    }
  }
  if (checked === 0) fail('no staged row is in the pool, so no slot was checked');
  console.log(`   ${checked - misfit} of ${checked} pooled staged players fit all ${cdmSlots} CDM and ${cmSlots} CM slots across ${FORMATIONS.length} formations`);
}

/* ---- section 4: namesakes stay two people ---- */
section = 4;
console.log('\n4) namesakes stay two people');
{
  for (const [name, newClub, oldClub, country] of NAMESAKES) {
    const a = data.players.find(p => p.name === name && p.club === newClub);
    const b = data.players.find(p => p.name === name && p.club === oldClub);
    if (!a) fail(`${name} of ${newClub} is not in the pool`);
    if (!b) fail(`${name} of ${oldClub} is not in the pool (a namesake swallowed him)`);
    if (a && b && country) {
      const offered = suggestCountryPlayers(data, country, name.toLowerCase()).filter(p => p.name === name).map(p => p.club);
      if (!(offered.includes(newClub) && offered.includes(oldClub))) fail(`a search for "${name.toLowerCase()}" in ${country}'s slot offers ${offered.join(' and ') || 'nobody'}, not both`);
    }
    console.log(`   ${name}: ${a ? newClub : 'MISSING ' + newClub} and ${b ? oldClub : 'MISSING ' + oldClub}`);
  }
}

/* ======================================================================= */
console.log('');
const red = [...failed.keys()].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (red.length === 1 && red[0] === want) {
    console.log(`${MARK} ${CONTROL}: section ${want} went red (${failed.get(want)} finding${failed.get(want) === 1 ? '' : 's'}) and no other section did.`);
    process.exit(1);
  }
  console.error(`simWorldXiDefensiveMids control ${CONTROL}: CONTROL FAILED. Expected only section ${want} red, got ${red.length ? red.join(', ') : 'none'}.`);
  process.exit(4);
}
if (red.length) {
  const n = [...failed.values()].reduce((a, b) => a + b, 0);
  console.error(`simWorldXiDefensiveMids${PROJECT ? ' (projected)' : ''}: ${n} failure${n === 1 ? '' : 's'} in section${red.length === 1 ? '' : 's'} ${red.join(', ')}.`);
  if (!PROJECT && red.includes(2)) console.error('If supabase/migrations/20260928_round_669_defensive_midfield_2026.sql is not applied yet, that is why: WXIDM_PROJECT=1 measures it before it lands.');
  process.exit(1);
}
console.log(`simWorldXiDefensiveMids${PROJECT ? ' (projected, the migration is not applied yet)' : ''}: green. The defensive midfielders are pooled, offered and fit their slots, and namesakes stay two people.`);
