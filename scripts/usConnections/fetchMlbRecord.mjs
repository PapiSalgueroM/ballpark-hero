/**
 * Round 1558: read the league's own data service (statsapi.mlb.com) for every
 * man on a Baseball Connections board, so the checker can judge the groups
 * from the record instead of from memory.
 *
 * It never runs inside a harness (it reaches the network); the harness reads
 * only the compact record this writes into
 * scripts/data/baseballConnectionsVerified-2026-10.json. The raw pages stay in
 * a scratch work folder (.tmp-fx/, never committed).
 *
 *   node scripts/usConnections/fetchMlbRecord.mjs search <work>   name -> candidate ids (cached, MAX per run)
 *   node scripts/usConnections/fetchMlbRecord.mjs person <work>   every candidate's person record (cached, MAX per run)
 *   node scripts/usConnections/fetchMlbRecord.mjs pick <work>     choose one man per tile name, list the namesakes
 *
 * The names are every tile of src/data/baseballConnectionsPuzzles.ts plus
 * EXTRA (men a fix may deal in). A namesake is settled by PICK (tile name ->
 * person id) where the most games rule would choose the wrong man.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [, , step, workArg] = process.argv;
const WORK = path.resolve(workArg ?? '.tmp-fx/mlbwork');
const MAX = Number(process.env.MAX ?? 120);
fs.mkdirSync(path.join(WORK, 'search'), { recursive: true });
fs.mkdirSync(path.join(WORK, 'person'), { recursive: true });

/* men a fix may deal in, read the same way as the board's own */
export const EXTRA = [
  /* Round 1558's fixes: a Vanderbilt man for bconn-010, an LSU man for bconn-012, a second baseman for bconn-013 */
  'Bryan Reynolds', 'Paul Skenes', 'Brandon Phillips',
  /* men the round took off the boards: kept, so the live table's rows from before the round are judged too */
  'Al Simmons', 'Babe Ruth', 'Billy Hamilton', 'CC Sabathia', 'Cole Hamels', 'Dale Murphy', 'Dee Gordon', 'J.D. Martinez',
  'Justin Turner', 'Kumar Rocker', 'Mike Mussina', 'Nomar Garciaparra', 'Rich Gossage', 'Xander Bogaerts',
  /* Round 1567: men its rebuilt groups took off every board (each sat beside a group the record could not judge
     him against), kept for the same reason */
  'Curt Schilling', 'Dave Winfield', 'Evan Longoria', 'Frankie Frisch', 'Harry Heilmann', 'Robin Roberts', 'Rogers Hornsby',
];
/* tile name -> statsapi person id, where a namesake would otherwise win */
export const PICK = {
  /* the service spells these four another way, so a name search finds no one */
  'Giovanny Urshela': 570482, // Gio Urshela
  'Goose Gossage': 114989, // Rich Gossage
  'Hyun-Jin Ryu': 547943, // Hyun Jin Ryu
  'Tris Speaker': 122566, // Tristram Speaker
  /* the son the tile names, not the father the most games rule would take */
  'Fernando Tatis Jr.': 665487,
  'Sandy Alomar Jr.': 110184,
  'Vladimir Guerrero Jr.': 665489,
  /* the man the board means: bconn-003's base stealer is the Reds' Billy Hamilton (2013 on), bconn-051's
     Silver Slugger catcher is the Dodgers' Will Smith (2019 on), not the pitcher of the same name */
  'Billy Hamilton': 571740,
  'Will Smith': 669257,
};

export const fold = s => String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '');
const slug = s => fold(s) || 'x';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function tileNames(root = ROOT) {
  const R = root.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mlbrec-'));
  fs.writeFileSync(path.join(tmp, 'e.mjs'), `export const b = (await import('${R}/src/data/baseballConnectionsPuzzles.ts')).baseballConnectionsPuzzles;`);
  await build({ entryPoints: [path.join(tmp, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(tmp, 'o.mjs'), logLevel: 'error' });
  const { b } = await import(pathToFileURL(path.join(tmp, 'o.mjs')).href);
  /* NAMES_FROM=<a read only export of the live table>: the record reads every man on the live rows too, so the
     rows past the file (dealt only from the table) are judged by the same checker */
  const live = process.env.NAMES_FROM ? JSON.parse(fs.readFileSync(process.env.NAMES_FROM, 'utf8')).flatMap(r => { const v = typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json; return (Array.isArray(v) ? v : []).flatMap(g => g.players ?? []); }) : [];
  return [...new Set([...b.flatMap(x => x.groups.flatMap(g => g.players)), ...EXTRA, ...live])].sort();
}

async function getJson(url) {
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (DoUKnowBall data check)' } });
      if (r.ok) return await r.json();
      console.log('  status', r.status, url);
    } catch (e) { console.log('  error', e.message); }
    await sleep(1500);
  }
  return null;
}

const SUFFIX = /\s+(jr\.?|sr\.?|ii|iii|iv)$/i;
const searchUrl = q => `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(q)}&sportIds=1`;
export const personUrl = id => `https://statsapi.mlb.com/api/v1/people/${id}?hydrate=awards,draft,education,xrefId,stats(group=[hitting,pitching,fielding],type=[career,yearByYear])`;

if (step === 'search') {
  let n = 0;
  for (const name of await tileNames()) {
    const f = path.join(WORK, 'search', slug(name) + '.json');
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    const tries = [name, name.replace(SUFFIX, ''), name.replace(/\./g, '')];
    const people = new Map();
    for (const q of [...new Set(tries)]) {
      const j = await getJson(searchUrl(q));
      for (const p of j?.people ?? []) people.set(p.id, { id: p.id, fullName: p.fullName, birthDate: p.birthDate, debut: p.mlbDebutDate ?? null, last: p.lastPlayedDate ?? null });
      await sleep(120);
    }
    fs.writeFileSync(f, JSON.stringify({ name, people: [...people.values()] }));
    console.log(name, people.size);
  }
  console.log('search step done, fetched', Math.min(n, MAX));
}

/* the awards a board can name; the rest of the service's list (player of the week and so on) is left out */
/* where the Lahman id is not baseball-reference's page id (its page answers 404); read off baseball-reference's own search */
const BBREF_FIX = { 282332: 'sabatc.01', 276371: 'santajo02', 407822: 'rosajo01' };
const KEEP_AWARDS = new Set(['ALMVP', 'NLMVP', 'ALCY', 'NLCY', 'ALROY', 'NLROY', 'ALGG', 'NLGG', 'ALSS', 'NLSS', 'WSMVP', 'ASMVP', 'MLBHOF', 'WSCHAMP', 'ALAS', 'NLAS']);
const num = v => (v === undefined || v === null || v === '' ? 0 : Number(v));

/** One man's compact record from the service's person page. */
export function compact(person) {
  const p = person;
  const out = {
    id: p.id,
    name: p.fullName,
    /* baseball-reference's player id: the service files it as bbref for some men and as the Lahman id (the same
       id) for the rest */
    bbref: BBREF_FIX[p.id] ?? (p.xrefIds ?? []).find(x => x.xrefType === 'bbref')?.xrefId ?? (p.xrefIds ?? []).find(x => x.xrefType === 'lahman')?.xrefId ?? null,
    born: { country: p.birthCountry ?? null, state: p.birthStateProvince ?? null, city: p.birthCity ?? null, date: p.birthDate ?? null },
    bats: p.batSide?.code ?? null,
    throws: p.pitchHand?.code ?? null,
    pos: p.primaryPosition?.abbreviation ?? null,
    debut: p.mlbDebutDate ?? null,
    last: p.lastPlayedDate ?? null,
    franchises: [],
    awards: {},
    career: {},
    seasons: {},
    drafts: (p.drafts ?? []).map(d => ({ year: num(d.year), type: d.draftType?.code ?? null, round: d.pickRound ?? null, pick: num(d.pickNumber), school: d.school?.name ?? null })),
    colleges: (p.education?.colleges ?? []).map(c => c.name),
  };
  const teams = new Map(); // club id -> the seasons he played for it
  for (const s of p.stats ?? []) {
    const group = s.group?.displayName;
    if (s.type?.displayName === 'career') {
      const st = s.splits?.[0]?.stat ?? {};
      if (group === 'hitting') out.career.hitting = { G: num(st.gamesPlayed), PA: num(st.plateAppearances), AB: num(st.atBats), H: num(st.hits), HR: num(st.homeRuns), RBI: num(st.rbi), SB: num(st.stolenBases), AVG: st.avg ?? null };
      if (group === 'pitching') out.career.pitching = { G: num(st.gamesPlayed), GS: num(st.gamesStarted), W: num(st.wins), SO: num(st.strikeOuts), SV: num(st.saves), IP: st.inningsPitched ?? null };
      continue;
    }
    if (s.type?.displayName !== 'yearByYear') continue;
    /* a season with two clubs has a split per club and one without a club (the total) */
    const bySeason = new Map();
    for (const sp of s.splits ?? []) {
      if (sp.sport && sp.sport.id !== 1) continue;
      if (sp.team?.id) { if (!teams.has(sp.team.id)) teams.set(sp.team.id, new Set()); teams.get(sp.team.id).add(sp.season); }
      const y = sp.season;
      if (!bySeason.has(y)) bySeason.set(y, { total: null, parts: [] });
      if (sp.team) bySeason.get(y).parts.push(sp); else bySeason.get(y).total = sp;
    }
    for (const [y, { total, parts }] of bySeason) {
      const row = (out.seasons[y] ??= {});
      if (group === 'fielding') {
        /* fielding has a split per club and position; games at each position, all clubs together */
        const pos = (row.pos ??= {});
        for (const sp of parts.length ? parts : [total]) {
          const a = sp?.position?.abbreviation;
          if (a) pos[a] = (pos[a] ?? 0) + num(sp.stat?.gamesPlayed);
        }
        continue;
      }
      const sum = k => (total ? num(total.stat?.[k]) : parts.reduce((t, sp) => t + num(sp.stat?.[k]), 0));
      if (group === 'hitting') Object.assign(row, { HR: sum('homeRuns'), RBI: sum('rbi'), SB: sum('stolenBases'), H: sum('hits'), AB: sum('atBats'), PA: sum('plateAppearances') });
      if (group === 'pitching') Object.assign(row, { W: sum('wins'), SO: sum('strikeOuts'), SV: sum('saves'), GS: sum('gamesStarted'), Gp: sum('gamesPlayed') });
    }
  }
  out.franchises = [...teams.keys()].sort((a, b) => a - b);
  out.franchiseSeasons = Object.fromEntries([...teams].map(([id, s]) => [id, s.size]));
  /* the clubs of the season just played: a 2026 World Series MVP can only come from its two clubs */
  out.clubs2026 = [...teams].filter(([, s]) => s.has("2026")).map(([id]) => id).sort((a, b) => a - b);
  /* each award as [season, club id]: a World Series title names its club, so "with two teams" can be judged */
  for (const a of p.awards ?? []) {
    if (!KEEP_AWARDS.has(a.id)) continue;
    const row = [Number(a.season), a.team?.id ?? null];
    const list = (out.awards[a.id] ??= []);
    if (!list.some(x => x[0] === row[0] && x[1] === row[1])) list.push(row);
  }
  for (const k of Object.keys(out.awards)) out.awards[k].sort((a, b) => a[0] - b[0]);
  return out;
}

const gamesOf = c => Math.max(c.career.hitting?.G ?? 0, c.career.pitching?.G ?? 0);

if (step === 'pick') {
  const out = {};
  const namesakes = [];
  for (const name of await tileNames()) {
    const s = JSON.parse(fs.readFileSync(path.join(WORK, 'search', slug(name) + '.json'), 'utf8'));
    const ids = PICK[name] ? [PICK[name]] : s.people.filter(p => p.debut).map(p => p.id);
    const cands = ids.map(id => {
      const f = path.join(WORK, 'person', id + '.json');
      return fs.existsSync(f) ? compact(JSON.parse(fs.readFileSync(f, 'utf8')).people[0]) : null;
    }).filter(Boolean);
    if (!cands.length) { console.log('NO RECORD', name); continue; }
    cands.sort((a, b) => gamesOf(b) - gamesOf(a));
    if (cands.length > 1) namesakes.push(`${name}: ${cands.map(c => `${c.id} ${c.name} ${c.debut}..${c.last} G${gamesOf(c)}`).join(' | ')}`);
    out[name] = cands[0];
  }
  fs.writeFileSync(path.join(WORK, 'record.json'), JSON.stringify(out));
  console.log(`record: ${Object.keys(out).length} men; namesakes settled by most games: ${namesakes.length}`);
  for (const n of namesakes) console.log('  ' + n);
}

/** The committed form: only what the checker reads. */
export function trim(c) {
  const posG = {};
  const ss = {};
  for (const [y, s] of Object.entries(c.seasons)) {
    let top = null;
    for (const [a, g] of Object.entries(s.pos ?? {})) { posG[a] = (posG[a] ?? 0) + g; if (!top || g > s.pos[top]) top = a; }
    ss[y] = [s.HR ?? 0, s.SB ?? 0, s.RBI ?? 0, top, s.GS ?? 0, s.Gp ?? 0];
  }
  const h = c.career.hitting ?? {};
  const pi = c.career.pitching ?? {};
  return {
    id: c.id, bbref: c.bbref, country: c.born.country, bats: c.bats, throws: c.throws, pos: c.pos, debut: c.debut, last: c.last,
    fr: c.franchiseSeasons, c26: c.clubs2026, aw: c.awards,
    car: { G: h.G ?? 0, PA: h.PA ?? 0, H: h.H ?? 0, HR: h.HR ?? 0, RBI: h.RBI ?? 0, SB: h.SB ?? 0, AVG: h.AVG ?? null, pG: pi.G ?? 0, GS: pi.GS ?? 0, W: pi.W ?? 0, SO: pi.SO ?? 0, SV: pi.SV ?? 0 },
    posG, ss,
    dr: c.drafts.map(d => [d.year, d.type, d.round, d.pick, d.school]),
    col: c.colleges,
  };
}

if (step === 'export') {
  const out = process.argv[4];
  const rec = JSON.parse(fs.readFileSync(path.join(WORK, 'record.json'), 'utf8'));
  const men = {};
  for (const name of Object.keys(rec).sort()) men[name] = trim(rec[name]);
  const doc = {
    about: 'Round 1558. The record the Baseball Connections checker judges every tile by: one row per man on a board, read from the league\'s own data service (statsapi.mlb.com, the people endpoint with awards, draft, education and career and season by season hitting, pitching and fielding). One host: a group this record flags is decided on two hosts in scripts/data/baseballConnectionsVerified-2026-10.json before any board changes. Regenerate with scripts/usConnections/fetchMlbRecord.mjs (search, person, pick, export); never edit by hand.',
    source: 'https://statsapi.mlb.com/api/v1/people/<id>?hydrate=awards,draft,education,xrefId,stats(group=[hitting,pitching,fielding],type=[career,yearByYear])',
    read: process.env.READ_ON ?? null,
    fields: 'country, bats, throws, pos (primary), debut, last; fr: club id -> seasons; aw: award -> [season, club id]; car: career hitting (G PA H HR RBI SB AVG) and pitching (pG GS W SO SV); posG: games by position; ss: season -> [HR, SB, RBI, most games position, GS, pitching G]; dr: [year, draft type, round, overall pick, school]; col: colleges',
    clubs: { 108: 'Angels', 109: 'Diamondbacks', 110: 'Orioles (St. Louis Browns)', 111: 'Red Sox', 112: 'Cubs', 113: 'Reds', 114: 'Guardians (Indians)', 115: 'Rockies', 116: 'Tigers', 117: 'Astros', 118: 'Royals', 119: 'Dodgers (Brooklyn)', 120: 'Nationals (Montreal Expos)', 121: 'Mets', 133: 'Athletics', 134: 'Pirates', 135: 'Padres', 136: 'Mariners', 137: 'Giants (New York)', 138: 'Cardinals', 139: 'Rays', 140: 'Rangers (1961 to 1971 Senators)', 141: 'Blue Jays', 142: 'Twins (Senators to 1960)', 143: 'Phillies', 144: 'Braves (Boston, Milwaukee)', 145: 'White Sox', 146: 'Marlins', 147: 'Yankees', 158: 'Brewers (Seattle Pilots)' },
    men,
  };
  fs.writeFileSync(out, JSON.stringify(doc, null, 0).replace(/,"men":\{/, ',\n"men":{\n').replace(/\},"(?=[^"]+":\{"id")/g, '},\n"') + '\n');
  console.log('wrote', out, Object.keys(men).length, 'men', fs.statSync(out).size, 'bytes');
}

if (step === 'person') {
  let n = 0;
  const ids = new Set();
  for (const f of fs.readdirSync(path.join(WORK, 'search'))) {
    const s = JSON.parse(fs.readFileSync(path.join(WORK, 'search', f), 'utf8'));
    const cand = s.people.filter(p => p.debut);
    const want = PICK[s.name] ? [PICK[s.name]] : cand.map(p => p.id);
    for (const id of want) ids.add(id);
  }
  for (const id of ids) {
    const f = path.join(WORK, 'person', id + '.json');
    if (fs.existsSync(f)) continue;
    if (n++ >= MAX) break;
    const j = await getJson(personUrl(id));
    if (j) fs.writeFileSync(f, JSON.stringify(j));
    await sleep(120);
  }
  console.log('person step: ids', ids.size, 'fetched this run', Math.min(n, MAX));
}

/*
 * Round 1567: add only the men the record has no row for (a man a rebuilt group deals in), without touching any
 * other row. Each is searched, read and trimmed exactly as search, person, pick and export would do it (PICK first,
 * then the most games rule, namesakes printed), and written as its own line of the committed record in the
 * export's order; every other line stays byte for byte, so a later full export changes nothing it already holds.
 *   node scripts/usConnections/fetchMlbRecord.mjs add <work>
 */
if (step === 'add') {
  const file = path.join(ROOT, 'scripts', 'data', 'baseballConnectionsRecord-2026-10.json');
  const text = fs.readFileSync(file, 'utf8');
  const doc = JSON.parse(text);
  const want = (await tileNames()).filter(n => !doc.men[n]);
  const rows = {};
  for (const name of want) {
    const sf = path.join(WORK, 'search', slug(name) + '.json');
    if (!fs.existsSync(sf)) {
      const people = new Map();
      for (const q of [...new Set([name, name.replace(SUFFIX, ''), name.replace(/\./g, '')])]) {
        const j = await getJson(searchUrl(q));
        for (const p of j?.people ?? []) people.set(p.id, { id: p.id, fullName: p.fullName, birthDate: p.birthDate, debut: p.mlbDebutDate ?? null, last: p.lastPlayedDate ?? null });
        await sleep(120);
      }
      fs.writeFileSync(sf, JSON.stringify({ name, people: [...people.values()] }));
    }
    const s = JSON.parse(fs.readFileSync(sf, 'utf8'));
    const ids = PICK[name] ? [PICK[name]] : s.people.filter(p => p.debut).map(p => p.id);
    const cands = [];
    for (const id of ids) {
      const pf = path.join(WORK, 'person', id + '.json');
      if (!fs.existsSync(pf)) {
        const j = await getJson(personUrl(id));
        if (j) fs.writeFileSync(pf, JSON.stringify(j));
        await sleep(120);
      }
      if (fs.existsSync(pf)) cands.push(compact(JSON.parse(fs.readFileSync(pf, 'utf8')).people[0]));
    }
    if (!cands.length) { console.log('NO RECORD', name); continue; }
    cands.sort((a, b) => gamesOf(b) - gamesOf(a));
    if (cands.length > 1) console.log(`  namesakes for ${name}: ${cands.map(c => `${c.id} ${c.name} ${c.debut}..${c.last} G${gamesOf(c)}`).join(' | ')}`);
    rows[name] = trim(cands[0]);
  }
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(eol);
  const first = lines.findIndex(l => l === '"men":{') + 1;
  const nameOf = l => (l.match(/^"((?:[^"\\]|\\.)*)":\{"id"/) ?? [])[1];
  for (const name of Object.keys(rows).sort()) {
    let at = first;
    while (nameOf(lines[at]) !== undefined && JSON.parse(`"${nameOf(lines[at])}"`) < name) at += 1;
    if (nameOf(lines[at]) === undefined) throw new Error(`add: ${name} sorts after the last man; write it by a full export instead`);
    lines.splice(at, 0, `${JSON.stringify(name)}:${JSON.stringify(rows[name])},`);
  }
  const out = lines.join(eol);
  JSON.parse(out);
  fs.writeFileSync(file, out);
  console.log(`add: ${Object.keys(rows).length} of ${want.length} missing men written: ${Object.keys(rows).join(', ')}`);
}
