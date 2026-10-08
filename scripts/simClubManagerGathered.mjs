/* Round 1052: the gathered leagues' squads, held to their research. Offline:
   the database client is a stub that throws, and nothing here reads a host.

   A gathered league's squads are not baked from the value table. They are
   read on two or more squad lists a club, written into a research file
   (scripts/data/gatheredSquads/<id>/research.json) and generated from that
   file alone (scripts/genClubManagerGathered.mjs). This harness is driven by
   scripts/lib/gatheredLeagues.mjs, so a later gathered league is one row
   there. It is modelled on simClubManagerALeague parts A to C.

   A. RESEARCH (hard). The file on disk IS a fresh generation from the
      committed research. Every research row is in the generated file exactly
      once, under its own club; nobody in the generated file is missing from
      the rows (the invented player check); nobody in a club's leftOut list
      ships at that club, and nobody left out because the game already holds
      him ships anywhere in the league. Every club stands on two squad lists
      or more on different hosts; every shipped row names at least two of its
      club's hosts; no address anywhere in the file is on a wiki host. Every
      fact the league's rules row comment cites exists in `facts`: two sources
      and not thin, or thin where the comment says THIN.
   B. VALUES (hard). Every rating is the shared curve's rating of the row's
      EUR value, every value is the curve's pounds at two decimals and above
      zero, every man with no value is at the floor and in the NO_VALUE
      export, and nobody else is.
   C. PEOPLE (hard, the data guardian's smell list). Every age is on two
      hosts and between 15 and 45. Every shipped nationality has two hosts,
      has a FlagImg code and is what nationalityOf answers; a null answers
      null. No keeper outfield and no outfielder in goal. No name of a
      generated squad is in any other squad of the world, in the free agent
      pool or twice inside the league, by exact spelling and under the
      engine's own name fold (a folded hit needs the research row's namesake
      verdict). The partial export is the rule's own answer.
   D. NAMES (hard). All engine club names fold to distinct strings; every
      research club is a member of its league in REAL_LEAGUES and every member
      has a research club; the fixed spellings the game already used are
      there; no trap spelling is an engine name; DB_TO_ENGINE_GATHERED holds
      no trap, no key of DB_TO_ENGINE, and only clubs of a gathered league.
      The library's name fold is the engine's.
   G. OLD SAVE (hard). scripts/data/cmOldSave1052Fixture.json, one real save
      written by the engine BEFORE the round (5ba57826: Sevilla, seed 1052,
      four league weeks left in season one, 135,548 bytes, tables for the 25
      other leagues of a 26 league world), loads; its club, squad, budget,
      table and calendar are what the file holds; it plays its four weeks and
      its summer without a throw; its world holds 26 leagues until that
      summer and every league of REAL_LEAGUES after it; a second summer runs.

   The per club printout is information, not a check: a real squad list that
   two sites agree on is allowed to be short.

   CONTROLS (GATHERED_CONTROL), each on an in memory copy, each asserting its
   anchor first and turning its own section red:
     invented  a man appended to one generated club                      A
     onehost   one research row's hosts cut to one                       A
     wiki      one squad list's address moved to a wiki host             A
     stale     one research value changed, so the file is not fresh      A
     offcurve  one rating plus one                                       B
     noflag    one generated nationality given a spelling with no code   C
     twice     a baked man's name given to a generated man               C
     keeper    one keeper's position set to ST                           C
     trap      one engine name replaced by a trap spelling               D
     oldsave   the fixture's club renamed                                G

   MEASURED: see the block at the end of this header, written from the runs.

   Run: node scripts/simClubManagerGathered.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { ratingOf, gbpM, usdOfEur, FLOOR_USD } from './lib/cmValueCurve.mjs';
import { GROUP_OF, foldName } from './lib/gatheredLeague.mjs';
import { GATHERED_LEAGUES } from './lib/gatheredLeagues.mjs';
import { generateGathered } from './genClubManagerGathered.mjs';
import { DB_TO_ENGINE, DB_TO_ENGINE_GATHERED } from './lib/dbClubNames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.GATHERED_CONTROL || '';
const CONTROLS = ['invented', 'onehost', 'wiki', 'stale', 'offcurve', 'noflag', 'twice', 'keeper', 'trap', 'oldsave'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`GATHERED_CONTROL=${CONTROL} is not one of ${CONTROLS.join(', ')}`); process.exit(1); }

let failures = 0;
const bySection = {};
let section = '?';
const fail = m => { failures += 1; bySection[section] = (bySection[section] || 0) + 1; console.error(`  FAIL [${section}]: ${m}`); };
const refuse = m => { console.error(`control ${CONTROL}: ${m}; refusing to run`); process.exit(1); };
const lf = s => s.split('\r\n').join('\n');
const WIKI = /(^|\.)(wikipedia|wikimedia|wikidata|fandom|wikia)\./i;
/* Spellings the value table uses for OTHER sides, never to be an engine club or a key of the gathered table. */
const TRAPS = ['Rodina 2 Moscow', 'CSB Atenas (Rio Cuarto)', 'CA Racing (Cordoba)'];
/* Engine names the game already used for these clubs before the round (ERA_UCL_FIELDS, Soccer Career, the rivalry table). */
const FIXED = { russia2026: ['Zenit', 'Krasnodar', 'Spartak Moscow', 'CSKA Moscow', 'Lokomotiv Moscow', 'Rubin Kazan'], argentina2026: ['Boca Juniors', 'River Plate', 'Racing Club'] };
/* The roster ledger's men a gathered club may hold today (brief 3.2 rule 8): in his club's rows, or in its leftOut with a reason. */
const LEDGER_MEN = { argentina2026: [['Ángel Correa', 'River Plate'], ['Joaquín Correa', 'Estudiantes de La Plata'], ['Diego Valdés', 'Vélez Sarsfield'], ['Diego Valoyes', 'Talleres'], ['Ramiro Macagno', 'Independiente Rivadavia']] };
const OLD_SAVE = { file: 'scripts/data/cmOldSave1052Fixture.json', club: 'Sevilla', bytes: 135548, leaguesThen: 26, worldTablesThen: 25 };

const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmgathered-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, [
    `export * from '${ROOT_FWD}/src/lib/clubManager.ts';`,
    `export { CM_WORLD_ROSTERS, CM_WORLD_PARTIAL, CM_GENERATED_LEAGUES } from '${ROOT_FWD}/src/data/clubManagerWorldRosters.ts';`,
    `export { nationalityOf } from '${ROOT_FWD}/src/data/playerNationalities.ts';`,
    `export { FLAG_CODES } from '${ROOT_FWD}/src/components/FlagImg.tsx';`,
    `export { CM_REAL_FREE_AGENTS } from '${ROOT_FWD}/src/data/clubManagerFreeAgents2026.ts';`,
    `export { foldSpecialLatin } from '${ROOT_FWD}/src/lib/nameFold.ts';`,
    ...GATHERED_LEAGUES.map(l => `export * as __g_${l.id} from '${ROOT_FWD}/${l.out}';`),
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error', loader: { '.tsx': 'tsx' }, jsx: 'automatic',
    plugins: [{
      name: 'cm-gathered',
      setup(b) {
        b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
        b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline harness"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "offline";', loader: 'js' }));
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

const clone = v => JSON.parse(JSON.stringify(v));
const cm = await bundleEngine();
/* The engine's own fold (foldClubName in src/lib/clubManager.ts), over the app's own special letter table. */
const engineFold = s => cm.foldSpecialLatin(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const engineSrc = lf(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));

function loadLeague(row) {
  const research = JSON.parse(lf(fs.readFileSync(path.join(ROOT, row.research), 'utf8')));
  const mod = cm[`__g_${row.id}`];
  const gen = {
    rosters: clone(mod[`CM_${row.prefix}_ROSTERS`]), nationalities: clone(mod[`CM_${row.prefix}_NATIONALITIES`]),
    noValue: [...mod[`CM_${row.prefix}_NO_VALUE`]], partial: [...mod[`CM_${row.prefix}_PARTIAL`]],
    supersedes: clone(mod[`CM_${row.prefix}_SUPERSEDES`]), meta: clone(mod[`CM_${row.prefix}_META`]),
  };
  const members = clone(Object.fromEntries(row.leagueIds.map(id => [id, cm.REAL_LEAGUES.find(l => l.id === id)?.clubs ?? []])));
  return { row, research, forGen: clone(research), gen, members };
}
const leagues = GATHERED_LEAGUES.map(loadLeague);

/* The controls, on the first gathered league's in memory copies only. */
if (CONTROL) {
  const L = leagues[0];
  const club = L.research.clubs[0];
  const list = L.gen.rosters[club.engine];
  if (!list?.length) refuse(`${club.engine} has no generated squad`);
  if (CONTROL === 'invented') list.push({ n: 'Invented Man Of The Control', p: 'ST', a: 25, v: 1, r: 64 });
  if (CONTROL === 'onehost') { if ((club.rows[0].hosts ?? []).length < 2) refuse('the first row is not on two hosts'); club.rows[0].hosts = [club.rows[0].hosts[0]]; }
  if (CONTROL === 'wiki') { if (WIKI.test(club.sources[0].host)) refuse('the first squad list is already on a wiki'); club.sources[0].url = 'https://en.wikipedia.org/wiki/A_squad_list'; }
  if (CONTROL === 'stale') { const r = L.forGen.clubs[0].rows[0]; if (!(r.valueEur > 0)) refuse('the first row has no value to change'); r.valueEur += 1000000; }
  if (CONTROL === 'offcurve') { if (!Number.isInteger(list[0].r)) refuse('the first man has no rating'); list[0].r += 1; }
  if (CONTROL === 'noflag') { const n = Object.keys(L.gen.nationalities)[0]; if (!n || !cm.FLAG_CODES[L.gen.nationalities[n]] || cm.FLAG_CODES.Atlantis) refuse('no flagged nationality to respell'); L.gen.nationalities[n] = 'Atlantis'; }
  if (CONTROL === 'twice') {
    const baked = cm.CM_ROSTERS.Arsenal?.[0]?.n;
    const man = club.rows[0];
    if (!baked || list.every(p => p.n !== man.name) || list.some(p => p.n === baked)) refuse('no baked name to hand to a generated man');
    list.find(p => p.n === man.name).n = baked;
    if (L.gen.nationalities[man.name]) { L.gen.nationalities[baked] = L.gen.nationalities[man.name]; delete L.gen.nationalities[man.name]; }
    L.gen.noValue = L.gen.noValue.map(s => (s === `${man.name}|${club.engine}` ? `${baked}|${club.engine}` : s));
    man.name = baked;
  }
  if (CONTROL === 'keeper') { const k = list.find(p => p.p === 'GK'); if (!k) refuse(`${club.engine} has no keeper`); k.p = 'ST'; }
  if (CONTROL === 'trap') { const id = L.row.leagueIds[0]; if (!L.members[id].length || L.members[id].includes(TRAPS[0])) refuse('no league member to respell'); L.members[id][L.members[id].length - 1] = TRAPS[0]; }
}

let totalMen = 0; let totalUrls = 0; let totalCited = 0;
for (const L of leagues) {
  const { row, research, gen } = L;
  const engines = research.clubs.map(c => c.engine);
  const genAt = new Map();
  for (const [club, list] of Object.entries(gen.rosters)) for (const p of list) { if (!genAt.has(p.n)) genAt.set(p.n, []); genAt.get(p.n).push(club); }
  const men = Object.values(gen.rosters).reduce((s, l) => s + l.length, 0);
  totalMen += men;
  console.log(`${row.id}: ${research.clubs.length} clubs, ${men} men in the generated file`);

  section = 'A';
  const g = generateGathered(row.id, L.forGen);
  if (g.errors.length) for (const e of g.errors.slice(0, 5)) fail(`${row.id}: the generator failed closed: ${e}`);
  else if (g.text !== lf(fs.readFileSync(path.join(ROOT, row.out), 'utf8'))) fail(`${row.id}: ${row.out} is not a fresh generation from the committed research`);
  const rowKeys = new Set();
  for (const c of research.clubs) {
    for (const r of c.rows) {
      rowKeys.add(`${c.engine}|${r.name}`);
      const at = genAt.get(r.name) ?? [];
      if (at.length !== 1 || at[0] !== c.engine) fail(`${r.name} is a ${c.engine} research row and is in the generated file at ${at.length ? at.join(', ') : 'no club'}`);
      const hosts = new Set(c.sources.map(s => s.host));
      if ([...new Set(r.hosts ?? [])].filter(h => hosts.has(h)).length < 2) fail(`${r.name} (${c.engine}) names fewer than two of his club's squad lists`);
    }
    if (new Set(c.sources.map(s => s.host)).size < 2) fail(`${c.engine} stands on fewer than two squad lists on different hosts`);
    for (const l of c.leftOut) {
      if ((gen.rosters[c.engine] ?? []).some(p => p.n === l.name)) fail(`${l.name} is in ${c.engine}'s leftOut list and ships there`);
      if (/^also baked at |^in the free agent pool$|^namesake in the nationality map$/.test(l.reason) && genAt.has(l.name)) fail(`${l.name} is left out (${l.reason}) and ships at ${genAt.get(l.name).join(', ')}`);
    }
  }
  for (const [club, list] of Object.entries(gen.rosters)) for (const p of list) if (!rowKeys.has(`${club}|${p.n}`)) fail(`${p.n} (${club}) is in the generated file and in no research row of that club`);
  let urls = 0;
  (function walk(v) {
    if (typeof v === 'string') { if (/^https?:\/\//.test(v)) { urls += 1; if (WIKI.test(new URL(v).host)) fail(`${row.id}: an address in the research is on a wiki host: ${v}`); } }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  })(research);
  totalUrls += urls;
  const prefix = (research.facts[0]?.id ?? '').split('-')[0];
  const factOf = new Map(research.facts.map(f => [f.id, f]));
  let cited = 0;
  for (const id of row.leagueIds) {
    const at = engineSrc.indexOf(`\n  ${id}: {\n`);
    if (at < 0) { fail(`${id} has no rules row in the engine`); continue; }
    const comment = engineSrc.slice(engineSrc.lastIndexOf('/*', at), at);
    for (const fid of new Set(comment.match(new RegExp(`\\b${prefix}-[a-z]+\\b`, 'g')) ?? [])) {
      cited += 1;
      const f = factOf.get(fid);
      const saysThin = new RegExp(`${fid} is THIN`).test(comment);
      if (!f) fail(`${id}'s rules row cites ${fid}, which the research does not hold`);
      else if (saysThin !== (f.thin === true)) fail(`${fid}: the rules row comment ${saysThin ? 'says THIN' : 'leans on it'} and the research says thin ${f.thin}`);
      else if (!saysThin && new Set(f.sources.map(s => s.publisher)).size < 2) fail(`${fid} is leaned on with fewer than two publishers`);
    }
    if (!comment.includes(row.research)) fail(`${id}'s rules row comment does not name ${row.research}`);
  }
  if (!cited) fail(`${row.id}: no rules row comment cites a research fact`);
  totalCited += cited;

  section = 'B';
  const wantNoValue = [];
  for (const c of research.clubs) for (const r of c.rows) {
    const p = (gen.rosters[c.engine] ?? []).find(x => x.n === r.name);
    if (!p) continue;
    const has = Number.isFinite(r.valueEur) && r.valueEur > 0;
    const usd = has ? usdOfEur(r.valueEur) : FLOOR_USD;
    if (!has) wantNoValue.push(`${r.name}|${c.engine}`);
    if (p.r !== ratingOf(usd)) fail(`${r.name} (${c.engine}) is rated ${p.r}, the curve says ${ratingOf(usd)}`);
    if (p.v !== gbpM(usd, 2) || !(p.v > 0)) fail(`${r.name} (${c.engine}) is valued ${p.v}, the curve says ${gbpM(usd, 2)}`);
  }
  if (JSON.stringify([...gen.noValue].sort()) !== JSON.stringify(wantNoValue.sort())) fail(`${row.id}: the NO_VALUE export is not exactly the men with no value (${gen.noValue.length} listed, ${wantNoValue.length} expected)`);

  section = 'C';
  const freeAgents = new Set(cm.CM_REAL_FREE_AGENTS.map(p => p.name));
  const elsewhereFold = new Map();
  for (const [club, list] of Object.entries(cm.CM_WORLD_ROSTERS)) if (!engines.includes(club)) for (const p of list) elsewhereFold.set(engineFold(p.n), { n: p.n, where: club });
  for (const n of freeAgents) elsewhereFold.set(engineFold(n), { n, where: 'the free agent pool' });
  let flagged = 0;
  for (const c of research.clubs) for (const r of c.rows) {
    const p = (gen.rosters[c.engine] ?? []).find(x => x.n === r.name);
    if (!p) continue;
    if ((r.ageHosts ?? []).length < 2 || !Number.isInteger(r.age) || r.age < 15 || r.age > 45 || p.a !== r.age) fail(`${r.name} (${c.engine}): age ${p.a} is not two sourced, not 15 to 45, or not the research's ${r.age}`);
    const nat = gen.nationalities[r.name] ?? null;
    if (r.nationality) {
      flagged += 1;
      if ((r.nationalityHosts ?? []).length < 2) fail(`${r.name}: nationality on fewer than two hosts`);
      if (nat !== r.nationality) fail(`${r.name}: the generated nationality is ${nat}, the research says ${r.nationality}`);
      else if (!cm.FLAG_CODES[nat]) fail(`${r.name}: ${nat} has no FlagImg code, so it would render as bare text`);
      else if (cm.nationalityOf(undefined, r.name) !== nat) fail(`${r.name}: nationalityOf answers ${cm.nationalityOf(undefined, r.name)}, the research says ${nat}`);
    } else if (nat !== null || cm.nationalityOf(undefined, r.name) !== null) fail(`${r.name} has no two host nationality and the game answers ${nat ?? cm.nationalityOf(undefined, r.name)}`);
    if (GROUP_OF[p.p] !== r.group) fail(`${r.name} (${c.engine}) plays ${p.p}, outside his two host group ${r.group}`);
    for (const [club, list] of Object.entries(cm.CM_WORLD_ROSTERS)) if (club !== c.engine && !engines.includes(club) && list.some(x => x.n === p.n)) fail(`${p.n} (${c.engine}) is also in ${club}'s squad`);
    if (freeAgents.has(p.n)) fail(`${p.n} (${c.engine}) is also in the free agent pool`);
    if ((genAt.get(p.n) ?? []).length > 1) fail(`${p.n} is in two squads of the league`);
    const hit = elsewhereFold.get(engineFold(p.n));
    if (hit && hit.n !== p.n && r.foldedNamesake?.of !== hit.n) fail(`${p.n} (${c.engine}) folds to the same name as "${hit.n}" (${hit.where}) and the research row carries no namesake verdict`);
  }
  for (const [n, nat] of Object.entries(gen.nationalities)) if (!cm.FLAG_CODES[nat]) fail(`${n}: the generated nationality ${nat} has no FlagImg code`);
  const wantPartial = research.clubs.filter(c => c.rows.length < 8 || c.rows.filter(r => !(r.valueEur > 0)).length * 2 > c.rows.length).map(c => c.engine).sort();
  if (JSON.stringify([...gen.partial].sort()) !== JSON.stringify(wantPartial)) fail(`${row.id}: the PARTIAL export is ${JSON.stringify(gen.partial)}, the rule says ${JSON.stringify(wantPartial)}`);
  for (const c of wantPartial) if (!cm.isPartialClub(c)) fail(`${c} is partial by the rule and the game does not mark it`);
  for (const [name, engine] of LEDGER_MEN[row.id] ?? []) {
    const c = research.clubs.find(x => x.engine === engine);
    if (!c || !(c.rows.some(r => r.name === name) || c.leftOut.some(l => l.name === name && l.reason))) fail(`${name} (${engine}): a roster ledger man who is neither in the club's rows nor in its leftOut with a reason`);
  }

  section = 'D';
  const flat = Object.values(L.members).flat();
  if (flat.length !== row.clubs) fail(`${row.id}: ${flat.length} clubs in its leagues, the table says ${row.clubs}`);
  for (const e of engines) if (!flat.includes(e)) fail(`${e} is a research club and no member of ${row.leagueIds.join(', ')}`);
  for (const m of flat) if (!engines.includes(m)) fail(`${m} is a member of ${row.leagueIds.join(', ')} with no research club`);
  for (const f of FIXED[row.id] ?? []) if (!flat.includes(f)) fail(`${f}, a spelling the game already used, is not a member`);
  for (const t of TRAPS) if (flat.includes(t)) fail(`the trap spelling ${t} is an engine club`);
  const perClub = research.clubs.map(c => {
    const by = {}; for (const l of c.leftOut) { const k = l.reason.replace(/^also baked at .*/, 'already in the game'); by[k] = (by[k] || 0) + 1; }
    const grp = k => c.rows.filter(r => r.group === k).length;
    return `   ${c.engine.padEnd(20)} ships ${String(c.rows.length).padStart(2)} (GK ${grp('GK')} DEF ${grp('DEF')} MID ${grp('MID')} FWD ${grp('FWD')})${wantPartial.includes(c.engine) ? ' PARTIAL' : ''}; left out ${c.leftOut.length}: ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')}`;
  });
  console.log(perClub.join('\n'));
  console.log(`   ${flagged} of ${men} men carry a two host nationality; ${wantNoValue.length} have no value; ${urls} addresses read, none on a wiki; ${cited} facts cited by the rules rows`);
}

section = 'D';
{
  const all = cm.REAL_LEAGUES.flatMap(l => l.clubs);
  const folded = new Map();
  for (const n of all) { const f = engineFold(n); if (folded.has(f)) fail(`engine clubs "${folded.get(f)}" and "${n}" fold to one name`); folded.set(f, n); }
  let foldDiffers = 0;
  for (const n of [...all, ...leagues.flatMap(L => Object.values(L.gen.rosters).flat().map(p => p.n))]) if (engineFold(n) !== foldName(n)) foldDiffers += 1;
  if (foldDiffers) fail(`the library's name fold differs from the engine's on ${foldDiffers} names`);
  const gatheredClubs = new Set(GATHERED_LEAGUES.flatMap(l => l.leagueIds).flatMap(id => cm.REAL_LEAGUES.find(l => l.id === id)?.clubs ?? []));
  for (const [k, v] of Object.entries(DB_TO_ENGINE_GATHERED)) {
    if (TRAPS.includes(k)) fail(`DB_TO_ENGINE_GATHERED holds the trap spelling ${k}`);
    if (Object.prototype.hasOwnProperty.call(DB_TO_ENGINE, k)) fail(`${k} is a key of both club name tables`);
    if (!gatheredClubs.has(v)) fail(`DB_TO_ENGINE_GATHERED maps ${k} to ${v}, which is no club of a gathered league`);
  }
  console.log(`D) ${all.length} engine clubs fold to ${folded.size} names; ${Object.keys(DB_TO_ENGINE_GATHERED).length} gathered table spellings`);
}

section = 'G';
{
  let raw = fs.readFileSync(path.join(ROOT, OLD_SAVE.file), 'utf8');
  if (Buffer.byteLength(raw) !== OLD_SAVE.bytes) fail(`the old save is ${Buffer.byteLength(raw)} bytes, it was written at ${OLD_SAVE.bytes}`);
  const parsed = JSON.parse(raw);
  if (CONTROL === 'oldsave') { if (parsed.clubName !== OLD_SAVE.club) refuse('the fixture is not the Sevilla save'); parsed.clubName = 'Sevilla Of The Control'; raw = JSON.stringify(parsed); }
  if (Object.keys(parsed.world ?? {}).length !== OLD_SAVE.worldTablesThen) fail(`the old save holds ${Object.keys(parsed.world ?? {}).length} world tables, it was written with ${OLD_SAVE.worldTablesThen}`);
  store.clear(); store.set(cm.SAVE_KEY, raw);
  let s = null;
  try { s = cm.loadCareer(); } catch (e) { fail(`loading the old save threw ${e.message}`); }
  if (!s || s.clubName !== OLD_SAVE.club) fail(`the old save did not load as ${OLD_SAVE.club} (${s?.clubName ?? 'nothing'})`);
  else {
    for (const k of ['squad', 'budget', 'table', 'calendar']) if (JSON.stringify(s[k]) !== JSON.stringify(parsed[k])) fail(`the loaded ${k} is not what the file holds`);
    const play = st => { let x = st; for (let i = 0; i < 160; i++) { x.boardConfidence = 100; const r = cm.playNextEntry(x, { skipHalftime: true }); x = r.state; if (r.kind === 'seasonOver') return x; if (x.sacked) throw new Error('sacked'); } throw new Error('the season did not end'); };
    try {
      Math.random = seeded(hashKey('gathered|G|1'));
      const before = Object.keys(s.world ?? {}).length + 1;
      const next1 = cm.startNextSeason(cm.finishSeason(play(s)).state);
      const after = Object.keys(next1.world ?? {}).length + 1;
      if (before !== OLD_SAVE.leaguesThen) fail(`the old save's world held ${before} leagues before its summer, not ${OLD_SAVE.leaguesThen}`);
      if (after !== cm.REAL_LEAGUES.length) fail(`after its first summer the old save's world holds ${after} leagues, the game has ${cm.REAL_LEAGUES.length}`);
      Math.random = seeded(hashKey('gathered|G|2'));
      const next2 = cm.startNextSeason(cm.finishSeason(play(next1)).state);
      console.log(`G) the old save loaded as ${s.clubName}, played its four weeks: ${before} leagues before its summer, ${after} after; a second summer ran (season ${next2.season})`);
    } catch (e) { fail(`the old save's seasons threw: ${e.message}`); }
    Math.random = REAL_RANDOM;
  }
}

const OWN = { invented: 'A', onehost: 'A', wiki: 'A', stale: 'A', offcurve: 'B', noflag: 'C', twice: 'C', keeper: 'C', trap: 'D', oldsave: 'G' };
const sections = Object.entries(bySection).map(([k, v]) => `${k} ${v}`).join(', ');
if (CONTROL) {
  const own = bySection[OWN[CONTROL]] || 0;
  const other = failures - own;
  console.log(`simClubManagerGathered: ${failures} failure(s) under control ${CONTROL} (${sections || 'none'})${own ? '' : ': THE CONTROL DID NOT FIRE'}${other ? ': RED OUTSIDE ITS OWN SECTION' : ''}`);
  process.exit(own && !other ? 1 : 3);
}
if (failures) { console.log(`simClubManagerGathered: ${failures} failure(s) (${sections})`); process.exit(1); }
console.log(`simClubManagerGathered: all checks passed (${leagues.length} gathered league(s), ${totalMen} men, ${totalUrls} addresses, ${totalCited} cited facts, the old save)`);
