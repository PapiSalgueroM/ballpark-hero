/* Club Manager's real dugouts: every real manager in the table is a dated fact two hosts agree on.

   Round 1607 filled src/data/clubManagerDugouts.ts with the 2026-27 big five on the opening day (the 'now'
   era, 96 chairs). Each row is the man in charge for the club's first league match of 2026-27, plus the
   month his stint began where two hosts agree on it. Every read behind a row is in
   scripts/data/cmDugouts.receipt.json (url, title, published, read date, the row read). This harness is
   the fence between that receipt and the table the game ships:

   0. the table is the receipt: the same chairs, the same names, the same months, and a row carries a name
      and a month and nothing else;
   1. every chair has reads on at least two different registrable domains, every source's domain is on the
      fence's VETTED list (a league's own site, a club's own site or a news outlet, each checked by hand) and on
      none of WIKI_DOMAINS (wikis and the sites that copy them) nor any host with "wiki" in it, and every read
      names its source (an https url and a read date), its club and its man;
   2. every chair's club is a club of its league's 2026-27 table (REAL_LEAGUES), and every read's club maps
      to it through the receipt's nameNormalization (no orphan rows, no read about another club);
   3. coverage is exact for every league the receipt declares covered: rows plus partial entries equal the
      league's club count with each club once; a league not declared is listed, not failed;
   4. the hosts agree on the man after accent folding, and a stored month is printed by at least two reads
      on two different domains while no read prints another month; a month is never after the opening;
   5. a table name that is also a player's name is LISTED (the 2026 world rosters, then the four era
      bakes), never silently merged; so is any name the made up name generator could build (expected none).

   Section 0 also fails a man who sits in two chairs (one table, one opening day, one club each).

   Negative controls, each refusing to run if its mutation changed nothing, each turning its section red:
   DUGOUTS_CONTROL=twochairs Arsenal's man is also written into Aston Villa's chair (section 0)
   DUGOUTS_CONTROL=onehost  the first chair's reads all point at one source (section 1)
   DUGOUTS_CONTROL=orphan    a chair for a club in no league is added to table and receipt (section 2)
   DUGOUTS_CONTROL=gap       Arsenal's chair leaves table and receipt (section 3)
   DUGOUTS_CONTROL=monthclash one read of a dated chair prints another month (section 4)
   DUGOUTS_CONTROL=samedomain a two read chair rests on two source ids on one registrable domain (section 1; pins
                              that the two host rule counts domains, not source ids)
   DUGOUTS_CONTROL=monthsamedomain a stored month is printed by two source ids on one domain (section 4; same)
   DUGOUTS_CONTROL=wikimirror S-PL2 moves to infogalactic.com, a Wikipedia fork without "wiki" in its name (section 1)
   A control run prints "control <name> FIRED" and exits 1 when its section went red, exits 3 if it did not
   fire, and exits 2 when it refuses to run (unknown name, or its mutation could not be applied or changed nothing).

   Measured on the committed table (2026-10-30): 96 chairs, 0 partial, 6 stored months, 27 sources on 19
   registrable domains. Nothing here is statistical, so there are no bands.

   Run: node scripts/simClubManagerDugouts.mjs
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = `${ROOT.replaceAll('\\', '/')}/src`;
const CONTROL = process.env.DUGOUTS_CONTROL || '';
const CONTROLS = { twochairs: 0, onehost: 1, samedomain: 1, wikimirror: 1, orphan: 2, gap: 3, monthclash: 4, monthsamedomain: 4 };
if (CONTROL && !(CONTROL in CONTROLS)) { console.error(`unknown DUGOUTS_CONTROL=${CONTROL}`); process.exit(2); }

const failed = new Set();
let failures = 0;
const fail = (section, m) => { failures += 1; failed.add(section); console.error(`  FAIL [${section}]: ${m}`); };

/* Load the shipped table, the league tables and every roster through one bundle. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-dugouts-'));
const entry = path.join(tmp, 'entry.mjs');
const bundle = path.join(tmp, 'bundle.mjs');
fs.writeFileSync(entry, `
export { CM_DUGOUTS, CM_DUGOUTS_PARTIAL } from '${SRC}/data/clubManagerDugouts.ts';
export { REAL_LEAGUES } from '${SRC}/lib/clubManager.ts';
export { CM_WORLD_ROSTERS } from '${SRC}/data/clubManagerWorldRosters.ts';
export { ERA2005_ROSTERS } from '${SRC}/data/clubManagerEra2005.ts';
export { ERA2010_ROSTERS } from '${SRC}/data/clubManagerEra2010.ts';
export { ERA2015_ROSTERS } from '${SRC}/data/clubManagerEra2015.ts';
export { ERA2020_ROSTERS } from '${SRC}/data/clubManagerEra2020.ts';
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error', alias: { '@': SRC } });
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 };
const mod = await import(pathToFileURL(bundle).href);

const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/cmDugouts.receipt.json'), 'utf8'));
const table = JSON.parse(JSON.stringify(mod.CM_DUGOUTS));
const partialTable = JSON.parse(JSON.stringify(mod.CM_DUGOUTS_PARTIAL));
const ERA = receipt.era;

/* ---- helpers ---- */
const fold = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss').replace(/[øØ]/g, 'o').replace(/[łŁ]/g, 'l')
  .replace(/[đĐ]/g, 'd').replace(/[‘’`´]/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
const TWO_LEVEL = new Set(['co.uk', 'org.uk', 'com.br', 'com.ar', 'com.au', 'com.mx', 'co.za', 'co.jp', 'com.co', 'com.pt', 'com.es']);
const domainOf = url => {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  const parts = host.split('.');
  return TWO_LEVEL.has(parts.slice(-2).join('.')) ? parts.slice(-3).join('.') : parts.slice(-2).join('.');
};

/* ---- the controls: mutate the in memory copies, and refuse if the mutation changed nothing ---- */
if (CONTROL) {
  const before = JSON.stringify([receipt, table]);
  const refuse = m => { console.error(`control ${CONTROL}: ${m}, refusing a dead control`); process.exit(2); };
  const srcDomain = id => domainOf(receipt.sources.find(s => s.id === id)?.url ?? 'https://x.invalid');
  if (CONTROL === 'twochairs') {
    const a = receipt.chairs.find(c => c.club === 'Arsenal');
    const v = receipt.chairs.find(c => c.club === 'Aston Villa');
    if (!a || !v || a.name === v.name || !table[ERA]?.Arsenal || !table[ERA]?.['Aston Villa']) refuse('Arsenal and Aston Villa do not hold two different men');
    v.name = a.name;
    for (const r of v.reads) r.name = a.name;
    table[ERA]['Aston Villa'] = { name: a.name };
  } else if (CONTROL === 'onehost') {
    const c = receipt.chairs[0];
    if (!c || c.reads.length < 2 || new Set(c.reads.map(r => r.source)).size < 2) refuse('the first chair has no second source to remove');
    for (const r of c.reads) r.source = c.reads[0].source;
  } else if (CONTROL === 'wikimirror') {
    /* A Wikipedia fork with no "wiki" in its name: the closed ban list alone let this through once. */
    const s = receipt.sources.find(x => x.id === 'S-PL2');
    if (!s || domainOf(s.url) === 'infogalactic.com') refuse('S-PL2 is missing or already on the mirror');
    s.url = 'https://infogalactic.com/info/Premier_League';
  } else if (CONTROL === 'samedomain') {
    /* Two DIFFERENT source ids on ONE registrable domain: a fence that counted ids instead of domains stays green. */
    let hit = null;
    for (const c of receipt.chairs) {
      if (c.reads.length !== 2 || c.reads.some(r => r.month)) continue;
      const ids = c.reads.map(r => r.source);
      for (const [keep, swap] of [[0, 1], [1, 0]]) {
        const twin = receipt.sources.find(s => !ids.includes(s.id) && domainOf(s.url) === srcDomain(ids[keep]));
        if (twin && srcDomain(ids[swap]) !== srcDomain(ids[keep])) { hit = { c, swap, twin }; break; }
      }
      if (hit) break;
    }
    if (!hit) refuse('no two read chair has a second source id on the domain of one of its reads');
    hit.c.reads[hit.swap].source = hit.twin.id;
    console.log(`control samedomain: ${hit.c.club} now rests on ${hit.c.reads.map(r => r.source).join(' and ')}, both on ${srcDomain(hit.twin.id)}`);
  } else if (CONTROL === 'monthsamedomain') {
    /* A stored month printed by two DIFFERENT source ids on ONE domain: a section 4 that counted ids stays green.
       Prefer a chair whose reads still span two domains afterwards, so section 1 stays out of it. */
    const cands = [];
    for (const c of receipt.chairs) {
      if (!c.appointed) continue;
      const mr = c.reads.filter(r => r.month === c.appointed);
      const doms = [...new Set(mr.map(r => srcDomain(r.source)))];
      if (mr.length !== 2 || doms.length !== 2) continue;
      const twin = receipt.sources.find(s => !c.reads.some(r => r.source === s.id) && domainOf(s.url) === srcDomain(mr[1].source));
      if (!twin) continue;
      const after = new Set(c.reads.map(r => (r === mr[0] ? domainOf(twin.url) : srcDomain(r.source))));
      cands.push({ c, r: mr[0], twin, clean: after.size >= 2 });
    }
    const hit = cands.find(x => x.clean) ?? cands[0];
    if (!hit) refuse('no stored month is printed by exactly two reads with a spare source id on one of their domains');
    hit.r.source = hit.twin.id;
    console.log(`control monthsamedomain: ${hit.c.club}'s month ${hit.c.appointed} now printed only on ${domainOf(hit.twin.url)}`);
  } else if (CONTROL === 'orphan') {
    const club = 'Testa Realmann FC';
    if (mod.REAL_LEAGUES.some(l => l.clubs.includes(club)) || table[ERA]?.[club]) refuse('the orphan club already exists');
    const src = receipt.chairs[0].reads;
    receipt.chairs.push({ league: 'premier', club, name: 'Testa Realmann', reads: src.map(r => ({ ...r, club, name: 'Testa Realmann' })) });
    table[ERA][club] = { name: 'Testa Realmann' };
  } else if (CONTROL === 'gap') {
    const i = receipt.chairs.findIndex(c => c.club === 'Arsenal');
    if (i < 0 || !table[ERA]?.Arsenal) refuse('Arsenal has no chair to remove');
    receipt.chairs.splice(i, 1);
    delete table[ERA].Arsenal;
  } else if (CONTROL === 'monthclash') {
    const c = receipt.chairs.find(x => x.appointed && x.reads.filter(r => r.month === x.appointed).length >= 2);
    if (!c) refuse('no chair stores a month two reads print');
    const r = c.reads.find(x => x.month === c.appointed);
    const [y, m] = c.appointed.split('-').map(Number);
    r.month = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  }
  if (JSON.stringify([receipt, table]) === before) refuse('the mutation changed nothing');
  console.log(`control ${CONTROL}: mutation applied, section ${CONTROLS[CONTROL]} must go red`);
}

/* ---- the receipt's view ---- */
/* The ban: wikis and the sites that copy them, many of them without "wiki" in the name. A backstop only: the
   real gate is VETTED below, so a mirror nobody has heard of is refused for being unvetted. */
const WIKI_DOMAINS = new Set(['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'fandom.com', 'wikia.com', 'wikia.org', 'wikiwand.com', 'dbpedia.org', 'alchetron.com', 'everybodywiki.com', 'wiki2.org',
  'infogalactic.com', 'en-academic.com', 'enacademic.com', 'academic.ru', 'justapedia.org', 'explained.today', 'everipedia.org', 'newworldencyclopedia.org',
  'wikimili.com', 'wikizero.com', 'thereaderwiki.com', 'hmong.es', 'thefreedictionary.com']);
const isWiki = url => WIKI_DOMAINS.has(domainOf(url)) || /wiki/i.test(new URL(url).hostname);
/* VETTED: every registrable domain the receipt may cite, each checked by hand to be the league's own site, a
   club's own site or a news outlet with its own reporting, never a wiki copy. A new host fails section 1 until it
   is added here with its kind, so a wiki mirror cannot slip in under a name the ban list has never seen. */
const VETTED = {
  'premierleague.com': 'league', 'bundesliga.com': 'league', 'ligue1.com': 'league',
  'theanalyst.com': 'outlet', 'dazn.com': 'outlet', 'skysports.com': 'outlet', 'esdiario.com': 'outlet', 'elidealgallego.com': 'outlet',
  'sportsmole.co.uk': 'outlet', 'rtp.pt': 'outlet', 'infobae.com': 'outlet', 'sky.it': 'outlet', 'fantacalcio.it': 'outlet', '90min.de': 'outlet',
  'flashscore.de': 'outlet', 'flashscore.fr': 'outlet', 'info.fr': 'outlet', 'orange.fr': 'outlet', 'maxifoot.fr': 'outlet',
};
const vettedKind = url => VETTED[domainOf(url)] ?? null;
const sources = new Map(receipt.sources.map(s => [s.id, s]));
const mapClub = c => receipt.nameNormalization[c] ?? c;
const leagueById = new Map(mod.REAL_LEAGUES.map(l => [l.id, l]));
const rows = table[ERA] ?? {};
const partial = partialTable[ERA] ?? [];
const chairs = receipt.chairs;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const OPENING = '2026-08';

/* ---- 0. the table is the receipt ---- */
console.log('section 0: the shipped table equals the receipt');
for (const c of chairs) {
  const row = rows[c.club];
  if (!row) { fail(0, `${c.club}: in the receipt, not in the table`); continue; }
  if (row.name !== c.name) fail(0, `${c.club}: table says ${row.name}, receipt says ${c.name}`);
  if ((row.appointed ?? null) !== (c.appointed ?? null)) fail(0, `${c.club}: table month ${row.appointed ?? 'none'}, receipt month ${c.appointed ?? 'none'}`);
  const extra = Object.keys(row).filter(k => k !== 'name' && k !== 'appointed');
  if (extra.length) fail(0, `${c.club}: the row carries ${extra.join(', ')}; a real manager's row is a name and a month only`);
}
for (const club of Object.keys(rows)) if (!chairs.some(c => c.club === club)) fail(0, `${club}: in the table, not in the receipt`);
const seat = new Map();
for (const [club, row] of Object.entries(rows)) {
  const k = fold(row.name);
  if (seat.has(k)) fail(0, `${row.name} sits in two chairs: ${seat.get(k)} and ${club}`);
  else seat.set(k, club);
}
const receiptPartial = (receipt.partial ?? []).map(p => p.club);
if (JSON.stringify([...receiptPartial].sort()) !== JSON.stringify([...partial].sort())) fail(0, `partial list differs: table [${partial}] receipt [${receiptPartial}]`);
const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
for (const [club, row] of Object.entries(rows)) if (dashes.some(d => (club + row.name).includes(d))) fail(0, `${club}: a dash in the row`);
const domains = new Set();
for (const s of receipt.sources) domains.add(domainOf(s.url));
console.log(`  ${Object.keys(rows).length} rows, ${partial.length} partial, ${chairs.filter(c => c.appointed).length} stored months, ${receipt.sources.length} sources on ${domains.size} registrable domains`);

/* ---- 1. two independent non wiki hosts per chair, each read complete ---- */
console.log('section 1: two hosts on two registrable domains per chair, none a wiki');
for (const s of receipt.sources) {
  if (!/^https:\/\//.test(s.url ?? '')) fail(1, `${s.id}: no https url`);
  else if (isWiki(s.url)) fail(1, `${s.id}: ${domainOf(s.url)} is a wiki or a wiki mirror`);
  else if (!vettedKind(s.url)) fail(1, `${s.id}: ${domainOf(s.url)} is a host nobody vetted (add it to VETTED with its kind once it is checked not to copy a wiki)`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.readOn ?? '')) fail(1, `${s.id}: no read date`);
  if (!s.title) fail(1, `${s.id}: no title`);
}
for (const c of chairs) {
  const doms = new Set();
  for (const r of c.reads ?? []) {
    const s = sources.get(r.source);
    if (!s) { fail(1, `${c.club}: read cites unknown source ${r.source}`); continue; }
    if (!r.club || !r.name) fail(1, `${c.club}: a read from ${r.source} has no row (club and man)`);
    if (s.role && /check/.test(s.role)) fail(1, `${c.club}: ${r.source} is a check page, not a chair read`);
    doms.add(domainOf(s.url));
  }
  if (doms.size < 2) fail(1, `${c.club}: reads on ${doms.size} registrable domain(s) (${[...doms].join(', ')}), two needed`);
}
for (const p of receipt.partial ?? []) if (!p.reason) fail(1, `partial ${p.club}: no reason recorded`);

/* ---- 2. no orphan rows ---- */
console.log('section 2: every chair belongs to its league table');
for (const c of chairs) {
  const lg = leagueById.get(c.league);
  if (!lg) { fail(2, `${c.club}: unknown league ${c.league}`); continue; }
  if (!lg.clubs.includes(c.club)) fail(2, `${c.club}: not a club of ${lg.name} in REAL_LEAGUES`);
  for (const r of c.reads ?? []) if (mapClub(r.club) !== c.club) fail(2, `${c.club}: a read from ${r.source} is about ${r.club}, which maps to ${mapClub(r.club)}`);
}
for (const club of partial) if (!receipt.coveredLeagues.some(id => leagueById.get(id)?.clubs.includes(club))) fail(2, `partial ${club}: not a club of a covered league`);

/* ---- 3. exact coverage of every declared league ---- */
console.log('section 3: covered leagues are complete');
for (const id of receipt.coveredLeagues) {
  const lg = leagueById.get(id);
  if (!lg) { fail(3, `covered league ${id} is not in REAL_LEAGUES`); continue; }
  const have = lg.clubs.filter(club => rows[club] || partial.includes(club));
  const both = lg.clubs.filter(club => rows[club] && partial.includes(club));
  const extra = chairs.filter(c => c.league === id && !lg.clubs.includes(c.club)).length;
  const count = chairs.filter(c => c.league === id).length + partial.filter(club => lg.clubs.includes(club)).length;
  if (have.length !== lg.clubs.length) fail(3, `${lg.name}: ${lg.clubs.length - have.length} chair(s) neither verified nor partial: ${lg.clubs.filter(club => !have.includes(club)).join(', ')}`);
  if (both.length) fail(3, `${lg.name}: on both lists: ${both.join(', ')}`);
  if (count !== lg.clubs.length || extra) fail(3, `${lg.name}: rows plus partial ${count}, clubs ${lg.clubs.length}`);
  console.log(`  ${lg.name}: ${lg.clubs.length - partial.filter(club => lg.clubs.includes(club)).length} verified, ${partial.filter(club => lg.clubs.includes(club)).length} partial, of ${lg.clubs.length}`);
}
const notCovered = mod.REAL_LEAGUES.filter(l => !receipt.coveredLeagues.includes(l.id)).map(l => l.id);
console.log(`  not declared (listed, not failed): ${notCovered.length} leagues: ${notCovered.join(', ')}`);

/* ---- 4. the hosts agree on the man, and on the month wherever one is stored ---- */
console.log('section 4: names agree after accent folding, stored months are two hosted and unopposed');
for (const c of chairs) {
  for (const r of c.reads ?? []) if (fold(r.name) !== fold(c.name)) fail(4, `${c.club}: ${r.source} names ${r.name}, the chair stores ${c.name}`);
  const months = (c.reads ?? []).filter(r => r.month);
  for (const r of months) if (!MONTH.test(r.month)) fail(4, `${c.club}: ${r.source} month ${r.month} is not YYYY-MM`);
  const distinct = new Set(months.map(r => r.month));
  if (c.appointed) {
    if (!MONTH.test(c.appointed)) fail(4, `${c.club}: stored month ${c.appointed} is not YYYY-MM`);
    if (c.appointed > OPENING) fail(4, `${c.club}: stored month ${c.appointed} is after the opening day`);
    const agreeing = new Set(months.filter(r => r.month === c.appointed).map(r => domainOf(sources.get(r.source)?.url ?? 'https://x.invalid')));
    if (agreeing.size < 2) fail(4, `${c.club}: month ${c.appointed} printed on ${agreeing.size} domain(s), two needed`);
    if (distinct.size > 1) fail(4, `${c.club}: reads print ${[...distinct].join(' and ')}, so the month must be dropped (name only)`);
  }
}

/* ---- 5. namesakes and players turned managers are listed, never merged ---- */
console.log('section 5: table names that are also player names (listed, not failed)');
const names = Object.values(rows).map(r => r.name);
const rosterHits = (label, rosters) => {
  const byName = new Map();
  for (const [club, players] of Object.entries(rosters)) for (const p of players) if (!byName.has(fold(p.n))) byName.set(fold(p.n), `${p.n} (${club})`);
  const hits = names.filter(n => byName.has(fold(n))).map(n => `${n} = ${byName.get(fold(n))}`);
  console.log(`  ${label}: ${hits.length}${hits.length ? `: ${hits.join('; ')}` : ''}`);
};
rosterHits('2026 world rosters (same era)', mod.CM_WORLD_ROSTERS);
rosterHits('era 2020 bake', mod.ERA2020_ROSTERS);
rosterHits('era 2015 bake', mod.ERA2015_ROSTERS);
rosterHits('era 2010 bake', mod.ERA2010_ROSTERS);
rosterHits('era 2005 bake', mod.ERA2005_ROSTERS);
/* The made up name generator builds "first last" from two closed lists in clubManagerEras.ts. They are not
   exported, so read them from the code with the comments stripped, never from the prose about them. */
const erasSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerEras.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const listOf = id => {
  const m = erasSrc.match(new RegExp(`const ${id} = \\[([\\s\\S]*?)\\];`));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : null;
};
const GEN_FIRST = listOf('GEN_FIRST');
const GEN_LAST = listOf('GEN_LAST');
if (!GEN_FIRST?.length || !GEN_LAST?.length) fail(5, 'could not read GEN_FIRST and GEN_LAST from clubManagerEras.ts');
else {
  const gen = new Set();
  for (const f of GEN_FIRST) for (const l of GEN_LAST) gen.add(`${f} ${l}`);
  const hits = names.filter(n => gen.has(n));
  console.log(`  generator set (${GEN_FIRST.length} by ${GEN_LAST.length} = ${gen.size} names) met in the table: ${hits.length}${hits.length ? `: ${hits.join(', ')}` : ' (expected none)'}`);
}

fs.rmSync(tmp, { recursive: true, force: true });
if (CONTROL) {
  const target = CONTROLS[CONTROL];
  if (failed.has(target)) { console.log(`control ${CONTROL} FIRED: section ${target} red (${failures} failure(s) in all)`); process.exit(1); }
  console.log(`control ${CONTROL} DID NOT FIRE: section ${target} stayed green`);
  process.exit(3);
}
console.log(failures ? `simClubManagerDugouts: ${failures} failure(s) in section(s) ${[...failed].join(', ')}` : `simClubManagerDugouts: all green (${Object.keys(rows).length} chairs, ${partial.length} partial)`);
process.exit(failures ? 1 : 0);
