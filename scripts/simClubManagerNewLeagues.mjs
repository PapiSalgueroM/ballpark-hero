/* Round 876: the leagues Club Manager gained, played for real.

   Brazil's Serie A came in as rows only (a LEAGUE_RULES row, a REAL_LEAGUES
   row, a nation, priors, colours, the name map and the bake). This harness
   plays it, so a row that reads right and plays wrong cannot ship. A later
   league (Liga MX is the next one) is one more entry in NEW_LEAGUES below.

   What this holds, per new league, on the real engine bundled with esbuild:

   A. ROWS (hard). The rules row carries the drop count and the cup the
      league's entry below says; the league has its real size; the engine's
      own drop count (relegationSpots) agrees; and the weakest club's board
      asks it to stay up, which is finishing size minus drop.
   B. SEASONS (hard). Over SEEDS seeded careers at mid table clubs a full
      season ends; every club of the league plays 2 x (size - 1) league
      matches, wins equal losses across the table; a league with a cup draws
      a bracket of its own nation's clubs, plays it to a winner and names
      the right cup; a league with no cup never schedules, draws or names one.
      The summer: a league with a modelled second tier trades exactly the
      drop count both ways; a league with none (Brazil) keeps its membership,
      which is the existing rule for every such league (the Primeira Liga,
      the Super Lig and the rest), and the drop count is the zone the board
      and the headlines read.
   C. STRENGTH (hard). The title odds follow squad strength: across the seeds
      each strong club of the league's sanity pairs (the bake's own pairs)
      takes more points on average than its weak partner by PAIR_GAP, and the
      rank correlation between each club's preview rating and its mean points
      is at least RHO_MIN.
   D. NO INVENTED MEN (hard). Every club of the league builds its day one
      squad from its real baked roster plus youth pads that are flagged as
      pads; no unflagged man is missing from the roster, and a club is in
      CM_PARTIAL exactly when it has fewer than 8 real players.

   MEASURED 2026-10-02, six seasons a run, SIM_SEED unset and 1 to 5:
     pair gap   Flamengo over Remo 37.3 to 48.2 points a season,
                Palmeiras over Chapecoense 42.2 to 53.3      band PAIR_GAP 20
     rank correlation, 14 unmanaged clubs, 0.908 to 0.971    band RHO_MIN 0.7
     (a table with no strength in it sits near 0 on both; the swap control
     measured -42.5 and -45.3)
     sacked careers 0 to 2 per run of six, each replaced by the next seed
     day one: 281 real men, 95 flagged pads, 4 partial clubs (Coritiba,
     Mirassol, Remo, Chapecoense)
   The whole run takes a few seconds.

   Round 883 added Liga MX, the first real league with no cup and no drop.
   Besides A to D it holds, for a league whose drop count is 0: no board of
   any of its clubs asks anybody to stay up, no headline over a full season
   talks of the drop (every headline is read, not just the newest eight), and
   finishing last is no relegation on the manager's record (wildernessProfile
   read last place, 18th, as one before this round). Its cupless rows ride
   on part B: no cup week, no bracket, no cup match, no cup name.

   MEASURED 2026-10-02, Round 883 tree, six seasons a run, SIM_SEED unset
   and 1 to 5:
     Liga MX    América over Necaxa 8.5 to 17.5 points a season (rated 74
                against 69, both real squads of 19 and 10), Guadalajara over
                FC Juárez 14.5 to 21.2                       band pairGap 4
                rank correlation, 12 clubs, 0.843 to 0.942  band RHO_MIN 0.7
                244 to 259 headlines a run, none about the drop (the
                check asks for at least 10 a season, so it cannot pass
                on an empty feed)
     Brazil on the same tree: 39.0 to 52.7 and 43.3 to 51.2, rho 0.932 to
                0.956, above the Round 876 numbers and well clear of its band

   NEGATIVE CONTROLS (each must turn the run red, and each refuses to run if
   the text it mutates is not in the source):
     CM_NEW_CONTROL=dropcount  Brazil's rules row drops 3, part A goes red;
     CM_NEW_CONTROL=nocup      Brazil's rules row loses its cup, part B goes red;
     CM_NEW_CONTROL=swap       the sanity pairs swap rosters in memory
                               (Flamengo with Remo, Palmeiras with
                               Chapecoense), part C goes red;
     CM_NEW_CONTROL=invented   makeYouth stops flagging its pads, part D goes red.
     CM_NEW_CONTROL=cupon      Liga MX's rules row gains a cup, parts A and B
                               go red;
     CM_NEW_CONTROL=dropcount2 Liga MX's rules row drops 2, part A and the
                               drop talk checks go red.

   Run: node scripts/simClubManagerNewLeagues.mjs   (SIM_SEEDS=n, default 6)
*/
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const SEEDS = Number(process.env.SIM_SEEDS || 6);
const SEED_SET = process.env.SIM_SEED || "";
const CONTROL = process.env.CM_NEW_CONTROL || '';
const CONTROLS = ['dropcount', 'nocup', 'swap', 'invented', 'cupon', 'dropcount2'];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`CM_NEW_CONTROL=${CONTROL} is not one of ${CONTROLS.join(', ')}`); process.exit(1); }

/* One entry per league this round family added. size, drop and cup are the
   real format with its sources beside the LEAGUE_RULES row; pairs are the
   bake's sanity pairs; managed are the mid table clubs the careers run at,
   so the pairs are always played by the engine and never by the career. */
const NEW_LEAGUES = [
  {
    id: 'brasileirao', size: 20, drop: 4, cup: 'Copa do Brasil',
    pairs: [['Flamengo', 'Remo'], ['Palmeiras', 'Chapecoense']],
    managed: ['Santos', 'Grêmio', 'Internacional', 'Fluminense', 'Botafogo', 'Corinthians'],
  },
  {
    id: 'ligamx', size: 18, drop: 0, cup: null, pairGap: 4,
    pairs: [['América', 'Necaxa'], ['Guadalajara', 'FC Juárez']],
    managed: ['Pumas UNAM', 'León', 'Atlético San Luis', 'Pachuca', 'Monterrey', 'Tijuana'],
  },
];
/* Round 883: what a league that relegates nobody must never say. */
const DROP_TALK = /relegat|from safety|stay up/i;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
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

const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'cmnew-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });

/* Replace exactly one occurrence, refusing to run when it is absent: a
   control that changes nothing would leave the run green for nothing. */
function mutateOnce(src, from, to, label) {
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`control ${label}: expected the text once in clubManager.ts, found it ${n} times; refusing to run`); process.exit(1); }
  return src.replace(from, to);
}

function transformEngine(src) {
  if (CONTROL === 'dropcount') src = mutateOnce(src, "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil', europe: null, drop: 4,", "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil', europe: null, drop: 3,", 'dropcount');
  if (CONTROL === 'nocup') src = mutateOnce(src, "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: 'Copa do Brasil',", "brasileirao: {\n    nationId: 'brazil', flag: 'Brazil', cup: null,", 'nocup');
  if (CONTROL === 'cupon') src = mutateOnce(src, "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null,", "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: 'Copa MX',", 'cupon');
  if (CONTROL === 'dropcount2') src = mutateOnce(src, "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null, europe: null, drop: 0,", "ligamx: {\n    nationId: 'mexico', flag: 'Mexico', cup: null, europe: null, drop: 2,", 'dropcount2');
  if (CONTROL === 'invented') src = mutateOnce(src, '    isYouth: true,\n', '    isYouth: false,\n', 'invented');
  /* Private helpers the checks ask directly. */
  return `${src}\nexport { relegationSpots as __relegationSpots, buildSquad as __buildSquad, getPool as __getPool };\n`;
}

async function bundleEngine() {
  const entry = path.join(TMP, 'entry.mjs');
  const out = path.join(TMP, 'engine.mjs');
  fs.writeFileSync(entry, `export * from '${ROOT_FWD}/src/lib/clubManager.ts';\n`);
  const enginePath = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
    plugins: [{
      name: 'cm-new',
      setup(b) {
        /* The engine never reaches the network here: the client module is
           replaced by a stub that throws if anything asks it for data. */
        b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' }));
        b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = new Proxy({}, { get() { throw new Error("offline harness"); } }); export const SUPABASE_URL = "http://offline.invalid"; export const SUPABASE_PUBLISHABLE_KEY = "x";', loader: 'js' }));
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => {
          let src = fs.readFileSync(a.path, 'utf8').replaceAll('\r\n', '\n');
          if (path.resolve(a.path) === path.resolve(enginePath)) src = transformEngine(src);
          return { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  return import(pathToFileURL(out).href);
}

/* Every headline the season printed is kept, since the state holds only the
   newest eight. */
function playSeason(cm, state) {
  let s = state;
  const headlines = new Set();
  for (let i = 0; i < 160; i++) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    for (const h of s.aiHeadlines ?? []) headlines.add(h);
    if (r.kind === 'seasonOver') return { state: s, headlines };
    if (s.sacked) return { state: s, sacked: true, headlines };
  }
  return { state: s, stuck: true, headlines };
}

/* A. The rows say what the league is, and the engine reads them. */
function partRows(cm, row) {
  console.log(`A) ${row.id}: the rows`);
  const lg = cm.REAL_LEAGUES.find(l => l.id === row.id);
  if (!lg) { fail(`${row.id} is not in REAL_LEAGUES`); return null; }
  const rules = cm.leagueRulesOf(row.id);
  if (lg.clubs.length !== row.size) fail(`${row.id} has ${lg.clubs.length} clubs, the real league has ${row.size}`);
  if (new Set(lg.clubs).size !== lg.clubs.length) fail(`${row.id} lists a club twice`);
  if (rules.drop !== row.drop) fail(`${row.id}'s rules row drops ${rules.drop}, the real league drops ${row.drop}`);
  if (cm.__relegationSpots(row.id) !== row.drop) fail(`the engine's drop count for ${row.id} is ${cm.__relegationSpots(row.id)}, not ${row.drop}`);
  if ((rules.cup ?? null) !== row.cup) fail(`${row.id}'s cup is ${rules.cup}, expected ${row.cup}`);
  if ((lg.cupName ?? null) !== row.cup) fail(`${row.id}'s league def names cup ${lg.cupName}, expected ${row.cup}`);
  for (const c of lg.clubs) if (cm.leagueOf(c).id !== row.id) fail(`${c} resolves to league ${cm.leagueOf(c).id}`);
  /* The weakest club by the engine's own preview is asked to stay up. */
  const byRating = [...lg.clubs].sort((a, b) => cm.clubPreviewRating(a) - cm.clubPreviewRating(b));
  Math.random = seeded(hashKey(`newleagues|${row.id}|weakest`));
  const weak = cm.startCareer(byRating[0], 'now');
  Math.random = REAL_RANDOM;
  const lgObj = (weak.boardObjectives ?? []).find(o => o.id === 'league');
  const want = row.drop > 0 ? row.size - row.drop : null;
  console.log(`   ${lg.clubs.length} clubs, drop ${rules.drop}, cup ${rules.cup}; weakest ${byRating[0]} (${cm.clubPreviewRating(byRating[0])}) is asked: ${lgObj?.label} (${lgObj?.target})`);
  if (want !== null && (!lgObj || lgObj.target !== want)) fail(`${byRating[0]}'s board asks ${lgObj?.label} (target ${lgObj?.target}), not to finish ${want}th or better`);
  /* Round 883: a league that relegates nobody has no board, of any of its
     clubs, asking anybody to stay up. */
  if (row.drop === 0) {
    const asks = new Set();
    for (const c of lg.clubs) {
      const o = cm.buildBoardObjectives(c, false, lg.clubs.length).find(x => x.id === 'league');
      if (!o) { fail(`${c}'s board sets no league objective`); continue; }
      asks.add(o.label);
      if (DROP_TALK.test(o.label)) fail(`${c}'s board asks "${o.label}" in a league nobody goes down from`);
      if (!(o.target >= 1 && o.target <= row.size)) fail(`${c}'s board target ${o.target} is off the table`);
    }
    console.log(`   every board of ${lg.clubs.length} asks one of: ${[...asks].join(' | ')}`);
  }
  return lg;
}

/* B. Full seasons. Returns each club's points per seed for part C. */
function partSeasons(cm, row, lg) {
  console.log(`B) ${row.id}: ${SEEDS} seeded seasons`);
  const clubs = new Set(lg.clubs);
  const nationClubs = new Set(cm.REAL_LEAGUES.filter(l => cm.leagueRulesOf(l.id).nationId === cm.leagueRulesOf(row.id).nationId).flatMap(l => l.clubs));
  const perClub = Object.fromEntries(lg.clubs.map(c => [c, []]));
  const matchesEach = 2 * (row.size - 1);
  let ended = 0, sacked = 0, cupWeeks = 0, cupFinals = 0, cupNamed = 0, moved = 0, headlinesSeen = 0;
  let k = 0;
  /* A sacking ends a career before its season does, and the engine sacks a
     mid table manager now and then (3 of 18 measured), so a sacked seed is
     replaced by the next one, up to three times as many seeds. */
  for (; ended < SEEDS && k < 3 * SEEDS; k++) {
    const club = row.managed[k % row.managed.length];
    Math.random = seeded(hashKey(`newleagues${SEED_SET}|${row.id}|${k}`));
    const start = cm.startCareer(club, 'now');
    cupWeeks += start.calendar.filter(e => e.type === 'cup').length;
    if (cm.careerLeagueOf(start).cupName === row.cup) cupNamed += 1;
    const played = playSeason(cm, start);
    const s = played.state;
    if (played.stuck) { fail(`${row.id} seed ${k} at ${club}: the season never ended`); Math.random = REAL_RANDOM; continue; }
    if (played.sacked) { sacked += 1; Math.random = REAL_RANDOM; continue; }
    ended += 1;
    headlinesSeen += played.headlines.size;
    if (row.drop === 0) {
      /* Round 883: nobody goes down, so no headline counts anybody into a
         drop zone and a last place finish is no relegation on the manager's
         record either. */
      for (const h of played.headlines) if (DROP_TALK.test(h)) fail(`${row.id} seed ${k}: a headline talks of the drop: "${h}"`);
      const last = { ...s, history: [{ season: s.season, club, position: row.size, points: 0, trophies: [] }] };
      const prof = cm.wildernessProfile(last);
      if (prof.departure === 'relegated' || prof.relegations) fail(`${row.id} seed ${k}: finishing last at ${club} reads as ${prof.relegations} relegation(s), departure ${prof.departure}`);
    }
    const table = s.table ?? [];
    if (table.length !== row.size) fail(`${row.id} seed ${k}: the table has ${table.length} rows`);
    let w = 0, l = 0;
    for (const r of table) {
      if (!clubs.has(r.club)) fail(`${row.id} seed ${k}: ${r.club} is in the table and not in the league`);
      if (r.w + r.d + r.l !== matchesEach) fail(`${row.id} seed ${k}: ${r.club} played ${r.w + r.d + r.l}, not ${matchesEach}`);
      w += r.w; l += r.l;
      perClub[r.club]?.push(r.pts);
    }
    if (w !== l) fail(`${row.id} seed ${k}: ${w} wins against ${l} losses`);
    const bracket = s.cupBracket ?? [];
    if (row.cup) {
      for (const t of bracket) for (const c of [t.home, t.away]) if (c && !nationClubs.has(c)) fail(`${row.id} seed ${k}: ${c} drawn into the ${row.cup}`);
      const fin = bracket.find(t => t.round === 'F');
      if (fin?.winner) cupFinals += 1; else fail(`${row.id} seed ${k}: the ${row.cup} has no final winner`);
    } else {
      if (bracket.length) fail(`${row.id} seed ${k}: a cupless league drew a bracket`);
      if ((s.resultLog ?? []).some(r => r.competition === 'cup')) fail(`${row.id} seed ${k}: a cupless league played a cup match`);
    }
    /* The summer. */
    const fin = cm.finishSeason(s);
    const next = cm.startNextSeason(fin.state);
    const nextClubs = new Set(cm.careerLeagueOf(next).id === row.id ? cm.careerLeagueOf(next).clubs : (next.leagueOverrides?.[row.id] ?? lg.clubs));
    const gone = lg.clubs.filter(c => !nextClubs.has(c)).length;
    const second = cm.leagueRulesOf(row.id).secondTier;
    const wantGone = second ? row.drop : 0;
    if (gone !== wantGone) fail(`${row.id} seed ${k}: ${gone} clubs left the league in the summer, expected ${wantGone}`);
    if (nextClubs.size !== row.size) fail(`${row.id} seed ${k}: ${nextClubs.size} clubs next season`);
    moved += gone;
    Math.random = REAL_RANDOM;
  }
  console.log(`   ${ended} seasons ended, ${sacked} sacked, ${cupWeeks} cup weeks scheduled, ${cupFinals} cup finals won, cup named on ${cupNamed} saves, ${moved} clubs moved in the summers, ${headlinesSeen} headlines read`);
  if (row.drop === 0 && headlinesSeen < 10 * ended) fail(`only ${headlinesSeen} headlines over ${ended} seasons, too few to say none of them talks of the drop`);
  if (ended < SEEDS) fail(`only ${ended} of ${SEEDS} seasons reached the end in ${k} tries`);
  if (row.cup) {
    if (cupNamed !== k) fail(`the ${row.cup} was named on ${cupNamed} of ${k} saves`);
    if (cupWeeks !== 4 * k) fail(`${cupWeeks} cup weeks over ${k} saves, a cup league schedules four each`);
  } else if (cupWeeks) fail(`${cupWeeks} cup weeks were scheduled in a cupless league`);
  return perClub;
}

const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
function ranks(values) {
  const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(values.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}
function spearman(x, y) {
  const rx = ranks(x), ry = ranks(y);
  const mx = mean(rx), my = mean(ry);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}

/* C. Strength orders the table. Managed clubs are left out of the
   correlation, since a career's own club is the one the engine does not pick
   the team for. */
const PAIR_GAP = Number(process.env.CM_NEW_PAIR_GAP || 20);
const RHO_MIN = Number(process.env.CM_NEW_RHO_MIN || 0.7);
function partStrength(cm, row, lg, perClub) {
  console.log(`C) ${row.id}: strength orders the table`);
  for (const [strong, weak] of row.pairs) {
    const gap = mean(perClub[strong]) - mean(perClub[weak]);
    console.log(`   ${strong} ${mean(perClub[strong]).toFixed(1)} pts (rated ${cm.clubPreviewRating(strong)}) against ${weak} ${mean(perClub[weak]).toFixed(1)} (rated ${cm.clubPreviewRating(weak)}): gap ${gap.toFixed(1)}`);
    const band = process.env.CM_NEW_PAIR_GAP ? PAIR_GAP : (row.pairGap ?? PAIR_GAP);
    if (!(gap >= band)) fail(`${strong} beat ${weak} by ${gap.toFixed(1)} points a season, the band is ${band}`);
  }
  const managed = new Set(row.managed);
  const field = lg.clubs.filter(c => !managed.has(c) && perClub[c].length);
  const rho = spearman(field.map(c => cm.clubPreviewRating(c)), field.map(c => mean(perClub[c])));
  console.log(`   rank correlation, preview rating against mean points, ${field.length} clubs: ${rho.toFixed(3)}`);
  if (!(rho >= RHO_MIN)) fail(`the rank correlation is ${rho.toFixed(3)}, the band is ${RHO_MIN}`);
}

/* D. Nobody in the league is invented beyond the flagged youth pads. */
function partNoInvented(cm, row, lg) {
  console.log(`D) ${row.id}: no invented men`);
  let real = 0, pads = 0, partial = 0;
  for (const c of lg.clubs) {
    const baked = cm.CM_ROSTERS[c] ?? [];
    const allowed = new Set(baked.length ? baked.map(p => p.n) : cm.__getPool().filter(p => p.club === c).map(p => p.name));
    const squad = cm.__buildSquad(c, 0, 'now');
    for (const p of squad) {
      if (p.isYouth) { pads += 1; continue; }
      if (!allowed.has(p.name)) fail(`${c} fields ${p.name}, who is neither in its real roster nor flagged as a youth pad`);
      else real += 1;
    }
    const isPartial = cm.CM_PARTIAL.includes(c);
    if (isPartial !== (baked.length < 8)) fail(`${c} has ${baked.length} real players and CM_PARTIAL says ${isPartial}`);
    if (isPartial !== cm.isPartialClub(c)) fail(`${c}: isPartialClub disagrees with CM_PARTIAL`);
    if (isPartial) partial += 1;
  }
  console.log(`   ${real} real men and ${pads} flagged pads on day one, ${partial} partial clubs`);
  if (real < 10 * row.size / 2) fail(`only ${real} real men in ${row.id}, the bake did not reach it`);
}

const cm = await bundleEngine();
if (CONTROL === 'swap') {
  for (const [a, b] of NEW_LEAGUES.flatMap(r => r.pairs)) {
    if (!(cm.CM_ROSTERS[a]?.length > (cm.CM_ROSTERS[b]?.length ?? 0))) { console.error(`control swap: ${a} does not carry a bigger roster than ${b}; refusing to run`); process.exit(1); }
    [cm.CM_ROSTERS[a], cm.CM_ROSTERS[b]] = [cm.CM_ROSTERS[b] ?? [], cm.CM_ROSTERS[a]];
  }
}
for (const row of NEW_LEAGUES) {
  const lg = partRows(cm, row);
  if (!lg) continue;
  const perClub = partSeasons(cm, row, lg);
  partStrength(cm, row, lg, perClub);
  partNoInvented(cm, row, lg);
}
console.log(failures ? `simClubManagerNewLeagues: ${failures} failure(s)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simClubManagerNewLeagues: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : 0);
