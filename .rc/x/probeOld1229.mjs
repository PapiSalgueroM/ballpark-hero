/* Round 1229 review (lens RUN): an independent probe, written without the round's harness.
 *   A  EVERY LEAGUE OF EVERY ERA (the round's fleet is eight clubs in seven leagues): one career each, a whole
 *      season, the summer and six entries more, on the candidate and on the BASE commit's source on the same
 *      seeded stream: the whole save but the book, and the count of draws, must be equal (the stream did not
 *      move); on the candidate the first law after every entry; and for every league match of mine THE BOOK
 *      AGAINST THE REPORT: the men the report names got exactly those goals, own goal lines went to og, a
 *      named man with no row went to unnamed, and no more assists than lines that may carry one.
 *   B  OLD SAVES: saves written by the BASE engine at six points of a season (day one, weeks 3, 11 and 27, a
 *      match paused at half time, the season's end), loaded through loadCareer on the candidate and on the
 *      base and played to the end, through the summer and six entries on: byte equal whole saves until the
 *      summer, no book before it, an empty lawful book after it.
 * PROBE_BASE names a worktree of the base commit. Exit 0 green, 1 failures, 2 could not run. */
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = path.resolve(process.env.PROBE_BASE || '/tmp/base1229o');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1229-'));
const T0 = Date.now();
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
if (!fs.existsSync(path.join(BASE, 'src/lib/clubManager.ts'))) { console.error(`probeOld1229: cannot run: no base tree at ${BASE}`); process.exit(2); }

async function engine(label, root) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  const P = f => JSON.stringify(path.join(root, f).replaceAll('\\', '/'));
  const has = f => fs.existsSync(path.join(root, f));
  fs.writeFileSync(entry, [
    `export * as cm from ${P('src/lib/clubManager.ts')};`,
    has('src/lib/clubManagerLeagueBook.ts') ? `export * as book from ${P('src/lib/clubManagerLeagueBook.ts')};` : 'export const book = null;',
  ].join('\n') + '\n');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: root,
    alias: { '@': path.join(root, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  let copies = 0;
  const load = async () => { const m = await import(`${pathToFileURL(out).href}?copy=${copies++}`); await m.cm.ensureAllEraRosters(); return { cm: m.cm, book: m.book, again: load }; };
  return load();
}

function seeded(seed) {
  let a = seed >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}
function onStream(seed, fn) {
  const draw = seeded(seed);
  const R = Math.random;
  const N = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  try { return fn(draw); } finally { Math.random = R; Date.now = N; }
}
const sha = text => createHash('sha256').update(text).digest('hex').slice(0, 20);
const withoutBook = s => JSON.stringify(s, (k, v) => (k === 'leagueBook' ? undefined : v));
const fails = [];
const fail = m => { fails.push(m); if (fails.length <= 40) console.log(`   FAIL ${m}`); };
const count = { law: 0, faces: 0, reportMatches: 0, reportGoals: 0, reportUnnamed: 0, reportOg: 0, setPieceLines: 0, assists: 0, eligible: 0, soleSetPiece: 0, byeWeeks: 0, oldFaces: 0 };

/** The first law on a candidate save, right now. */
function law(mod, s, where) {
  const book = mod.cm.leagueBookOf(s);
  count.law += 1;
  if (!book) { fail(`${where}: no readable book`); return null; }
  if (JSON.stringify(s.leagueBook).includes('null')) fail(`${where}: the book holds a null`);
  const gf = new Map(s.table.map(r => [r.club, r.gf]));
  for (const club of s.leagueClubs) {
    if (club === s.clubName) { if (book.c[club]) fail(`${where}: my own club has an entry`); continue; }
    const g = mod.book.bookClubGoals(book, club);
    count.law += 1;
    if (g.rows + g.og + g.u !== (gf.get(club) ?? 0)) fail(`${where}: ${club} ${g.rows}+${g.og}+${g.u} on the book, ${gf.get(club)} in the table`);
  }
  return book;
}

/** One league match of mine: the book's change for the opponent against the lines of the report. */
function reportAgainstBook(before, after, r, where, gfBefore) {
  const rep = r.report;
  const opp = rep.home === after.clubName ? rep.away : rep.home;
  const empty = { m: {}, og: 0, u: 0 };
  const prior = before.c[opp] ?? empty;
  const now = after.leagueBook?.c?.[opp] ?? empty;
  const got = new Map();
  const assisters = [];
  let dAssists = 0;
  for (const [key, row] of Object.entries(now.m)) {
    const old = prior.m[key] ?? [0, 0, 0, 0];
    const name = key.slice(0, key.lastIndexOf('|'));
    if (row[0] - old[0]) got.set(name, (got.get(name) ?? 0) + row[0] - old[0]);
    if (row[1] - old[1]) { dAssists += row[1] - old[1]; assisters.push(name); }
  }
  const lines = rep.oppScorers ?? [];
  const want = new Map();
  let ogLines = 0;
  for (const l of lines) { if (l.og) ogLines += 1; else want.set(l.name, (want.get(l.name) ?? 0) + 1); }
  count.reportMatches += 1;
  count.reportGoals += lines.length;
  count.reportOg += ogLines;
  if (now.og - prior.og !== ogLines) fail(`${where}: ${ogLines} own goal lines for ${opp}, the book added ${now.og - prior.og}`);
  let short = 0;
  for (const [name, c] of want) {
    const g = got.get(name) ?? 0;
    if (g > c) fail(`${where}: ${name} of ${opp} scored ${c} by the report and ${g} by the book`);
    short += Math.max(0, c - g);
  }
  for (const [name, g] of got) if (!want.has(name)) fail(`${where}: the book gave ${g} to ${name} of ${opp}, the report does not name him`);
  const theirGoals = rep.home === after.clubName ? rep.awayGoals : rep.homeGoals;
  const gfNow = after.table.find(row => row.club === opp)?.gf ?? 0;
  if (lines.length !== theirGoals) count.shortReports = (count.shortReports ?? 0) + 1;
  if (gfNow - gfBefore !== theirGoals) count.tableOff = (count.tableOff ?? 0) + 1;
  if (short !== now.u - prior.u) {
    fail(`${where}: ${short} named goals of ${opp} are on no row, the book counted ${now.u - prior.u} unnamed`);
    console.log(`      DETAIL report ${rep.home} ${rep.homeGoals}-${rep.awayGoals} ${rep.away}; their lines ${JSON.stringify(lines.map(l => ({ n: l.name, m: l.minute, og: !!l.og, pen: !!l.penalty, fk: !!l.freeKick })))}; ${opp} goals for in the table ${gfBefore} -> ${gfNow}; book rows gained ${JSON.stringify([...got])}; og ${prior.og} -> ${now.og}; u ${prior.u} -> ${now.u}; decided by ${rep.decidedBy ?? "?"}; eleven named: ${after.leagueBook ? "see next" : "?"}`);
  }
  count.reportUnnamed += short;
  const eligible = lines.filter(l => !l.og && !l.penalty && !l.freeKick).length;
  const setPiece = lines.filter(l => l.penalty || l.freeKick).length;
  count.setPieceLines += setPiece;
  count.assists += dAssists;
  count.eligible += eligible;
  if (dAssists > eligible) fail(`${where}: ${dAssists} assists for ${opp} on ${eligible} goals that may carry one (${setPiece} from the spot or a free kick)`);
  if (lines.length === 1 && setPiece === 1) count.soleSetPiece += 1;
  if (lines.length === 1 && !lines[0].og && assisters.includes(lines[0].name)) fail(`${where}: ${lines[0].name} of ${opp} set up his own goal`);
}

const cand = await engine('cand', ROOT);
const base = await engine('base', BASE);
if (!cand.book) { console.error('probeOld1229: cannot run: no book module in the candidate'); process.exit(2); }
if (base.book) { console.error('probeOld1229: cannot run: the base tree holds the book module, it is not the base'); process.exit(2); }

/* ---------- A: every league of every era ---------- */
const CREST = { shape: 1, pattern: 3, color1: '#059669', color2: '#f8fafc', initials: 'RV' };
const plan = [];
for (const era of ['now', 'era2020', 'era2015', 'era2010', 'era2005']) {
  const leagues = era === 'now' ? cand.cm.REAL_LEAGUES : (cand.cm.ERA_LEAGUES?.[era] ?? []);
  for (const lg of leagues) {
    let clubs = [];
    try { clubs = (era === 'now' ? cand.cm.playableClubs(lg.id) : cand.cm.eraPlayableClubs(era, lg.id)).map(c => c.name); } catch { clubs = []; }
    if (!clubs.length) { console.log(`   A  ${era} ${lg.id}: no playable club, skipped`); continue; }
    /* Not the first club of the list every time: the middle one, so the fleet is not all giants. */
    plan.push({ era, league: lg.id, club: clubs[Math.floor(clubs.length / 2)] });
  }
}
const firstNow = cand.cm.REAL_LEAGUES[0];
const lastNow = cand.cm.REAL_LEAGUES[cand.cm.REAL_LEAGUES.length - 1];
for (const lg of [firstNow, lastNow]) {
  const name = `Review Town ${lg.id}`;
  plan.push({ era: 'now', league: lg.id, club: name, spec: { name, stadium: `${name} Park`, crest: { ...CREST }, budgetTier: 'mid', leagueId: lg.id, replacedClub: '' } });
}
console.log(`A  ${plan.length} careers: every league of every era, and two created clubs`);

function career(mod, p, seed, watch) {
  return onStream(seed, draw => {
    const faces = [];
    let s;
    try { s = mod.cm.startCareer(p.club, p.era, p.spec); } catch (e) { return { error: `startCareer threw: ${String(e?.message ?? e).slice(0, 120)}` }; }
    const label = `${p.club} (${p.era}, ${p.league})`;
    const step = (state, n) => {
      const entry = state.calendar[state.week];
      const before = watch && state.leagueBook ? JSON.parse(JSON.stringify(state.leagueBook)) : null;
      const r = mod.cm.playNextEntry(state, { skipHalftime: true });
      if (watch) {
        const where = `${label} ${n}`;
        law(mod, r.state, where);
        if (entry?.type === 'league' && r.kind !== 'match' && r.kind !== 'seasonOver') count.byeWeeks += 1;
        if (before && r.kind === 'match' && r.report?.competition === 'league') {
          const oppName = r.report.home === r.state.clubName ? r.report.away : r.report.home;
          reportAgainstBook(before, r.state, r, where, state.table.find(row => row.club === oppName)?.gf ?? 0);
          if (process.env.PROBE_DEBUG && where.includes(process.env.PROBE_DEBUG)) console.log(`      DEBUG ${where}: eleven of ${oppName} ${JSON.stringify((mod.cm.leagueBookEleven(state, oppName) ?? []).map(p => p.n + '|' + p.p))}; roster size ${mod.cm.oppRosterFor(state, oppName, new Set()).length}`);
        }
      }
      return r;
    };
    if (watch) { const b = law(mod, s, `${label} day one`); if (b && (Object.keys(b.c).length || b.my.length)) fail(`${label}: the book did not open empty`); }
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 260) { const r = step(s, `season 1 entry ${guard}`); s = r.state; if (r.kind === 'seasonOver') break; }
    faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
    const size = s.leagueClubs.length;
    const unnamed = watch && s.leagueBook ? Object.values(s.leagueBook.c).reduce((n, e) => n + e.u, 0) : 0;
    const goals = s.table.filter(r => r.club !== s.clubName).reduce((n, r) => n + r.gf, 0);
    s = mod.cm.startNextSeason(mod.cm.finishSeason(s).state);
    faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
    if (watch) { const b = law(mod, s, `${label} season 2 day one`); if (b && (Object.keys(b.c).length || b.my.length)) fail(`${label}: the book of season 2 did not open empty`); }
    for (let k = 0; k < 6 && s.week < s.calendar.length; k++) s = step(s, `season 2 entry ${k + 1}`).state;
    faces.push(`${sha(withoutBook(s))}|${draw.calls()}`);
    return { faces, size, unnamed, goals, league2: mod.cm.careerLeagueOf(s).id };
  });
}
const seedA = i => (0x51a7 + i * 977) >>> 0;
const candA = plan.map((p, i) => career(cand, p, seedA(i), true));
const baseA = plan.map((p, i) => career(base, p, seedA(i), false));
let sameFaces = 0;
const odd = [];
plan.forEach((p, i) => {
  const a = candA[i];
  const b = baseA[i];
  const label = `${p.club} (${p.era}, ${p.league})`;
  if (a.error || b.error) { fail(`${label}: ${a.error ? `candidate ${a.error}` : ''} ${b.error ? `base ${b.error}` : ''}`); return; }
  if (a.size % 2) odd.push(`${p.era} ${p.league} ${a.size}`);
  a.faces.forEach((face, j) => { count.faces += 1; if (face === b.faces[j]) sameFaces += 1; else fail(`${label}: face ${j} differs from the base commit's (${face} against ${b.faces[j]})`); });
});
console.log(`A  stream: ${sameFaces} of ${count.faces} faces equal to the base commit's source, over ${plan.length} careers`);
console.log(`A  reports whose lines are not as many as the goals: ${count.shortReports ?? 0}; matches where the opponent's goals for moved by another number than the report's: ${count.tableOff ?? 0}`);
console.log(`A  law: ${count.law} checks; leagues with an odd number of clubs: ${odd.length ? odd.join(', ') : 'none'}; league weeks of mine with no match (a bye): ${count.byeWeeks}`);
console.log(`A  report against book: ${count.reportMatches} league matches of mine, ${count.reportGoals} rival goal lines, ${count.reportOg} own goal lines, ${count.reportUnnamed} named by the report and on no row, ${count.setPieceLines} from the spot or a free kick, ${count.assists} assists on ${count.eligible} lines that may carry one (${(count.assists / Math.max(1, count.eligible)).toFixed(3)}), ${count.soleSetPiece} matches whose only rival goal was a set piece`);
{
  const rows = plan.map((p, i) => ({ p, r: candA[i] })).filter(x => !x.r.error && x.r.goals > 0).map(x => ({ key: `${x.p.era} ${x.p.league}`, share: x.r.unnamed / x.r.goals }));
  rows.sort((x, y) => y.share - x.share);
  console.log(`A  share of rival goals with nobody named, by league (highest first): ${rows.slice(0, 14).map(x => `${x.key} ${(100 * x.share).toFixed(0)}%`).join(', ')}`);
  console.log(`A  leagues at 0 to 5 percent unnamed: ${rows.filter(x => x.share <= 0.05).length} of ${rows.length}; over 25 percent: ${rows.filter(x => x.share > 0.25).length}`);
}

/* ---------- B: saves written by the base engine, loaded on the candidate ---------- */
if (!process.env.PROBE_SKIP_B) {
  const writer = await base.again();
  const candCopy = await cand.again();
  const baseCopy = await base.again();
  const CLUBS = [['Arsenal', 'now'], ['Southampton', 'now'], ['Hertha BSC', 'now'], ['Real Madrid', 'now'], ['Barcelona', 'era2010'], ['Ajax', 'now']];
  const STOPS = [0, 3, 11, 27, 'half', 'end'];
  const saves = [];
  CLUBS.forEach(([club, era], ci) => STOPS.forEach((stop, si) => {
    const seed = (0xb00c + ci * 211 + si * 13) >>> 0;
    const made = onStream(seed, () => {
      let s = writer.cm.startCareer(club, era);
      const n = stop === 'end' ? 400 : stop === 'half' ? 7 : stop;
      for (let k = 0; k < n && s.week < s.calendar.length; k++) { const r = writer.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; }
      let paused = false;
      if (stop === 'half') {
        /* Kick off the next fixtures WITHOUT skipping the break until one stops at half time: that state is the save. */
        for (let k = 0; k < 6 && !paused && s.week < s.calendar.length; k++) {
          const r = writer.cm.playNextEntry(s);
          s = r.state;
          paused = !!s.live || r.kind === 'halftime';
          if (r.kind === 'seasonOver') break;
        }
      }
      return { raw: JSON.stringify(s), paused, week: s.week, sacked: !!s.sacked };
    });
    saves.push({ name: `${club} (${era}) saved by the base engine at stop ${stop}, week ${made.week}${made.paused ? ', paused at half time' : ''}${made.sacked ? ', sacked' : ''}`, raw: made.raw, seed: seed + 5000, stop, paused: made.paused });
  }));
  const finishOn = (mod, raw, seed, isCand, name) => onStream(seed, draw => {
    store.clear();
    store.set(mod.cm.SAVE_KEY, raw);
    let s = mod.cm.loadCareer();
    if (!s) return null;
    const faces = [`loaded ${sha(JSON.stringify(s))}`];
    let sawBook = 'leagueBook' in s;
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 260) {
      const r = mod.cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      faces.push(`${sha(JSON.stringify(s))}|${draw.calls()}`);
      if ('leagueBook' in s) sawBook = true;
      if (r.kind === 'seasonOver') break;
    }
    const fin = mod.cm.finishSeason(s);
    faces.push(`summary ${sha(JSON.stringify(fin.summary ?? null))}`);
    let next = mod.cm.startNextSeason(fin.state);
    faces.push(`summer ${sha(withoutBook(next))}|${draw.calls()}`);
    const opened = isCand ? mod.cm.leagueBookOf(next) : null;
    const openedEmpty = !!opened && !Object.keys(opened.c).length && !opened.my.length;
    for (let k = 0; k < 6 && next.week < next.calendar.length; k++) {
      next = mod.cm.playNextEntry(next, { skipHalftime: true }).state;
      faces.push(`next ${sha(withoutBook(next))}|${draw.calls()}`);
      if (isCand) law(mod, next, `${name}, the season after, entry ${k + 1}`);
    }
    return { faces, sawBook, openedEmpty };
  });
  let equal = 0;
  let pausedSaves = 0;
  for (const save of saves) {
    if (save.paused) pausedSaves += 1;
    let a = null;
    let b = null;
    try { a = finishOn(candCopy, save.raw, save.seed, true, save.name); } catch (e) { fail(`${save.name}: the candidate threw: ${String(e?.message ?? e).slice(0, 160)}`); }
    try { b = finishOn(baseCopy, save.raw, save.seed, false, save.name); } catch (e) { console.log(`   B  ${save.name}: the BASE engine threw (${String(e?.message ?? e).slice(0, 120)}), not comparable`); }
    if (!a || !b) { if (!a && b) fail(`${save.name}: did not load or play on the candidate, and did on the base`); continue; }
    if (a.sawBook) fail(`${save.name}: a league book appeared in a season that began without one`);
    if (!a.openedEmpty) fail(`${save.name}: the season after did not open with an empty readable book`);
    const off = a.faces.findIndex((f, i) => f !== b.faces[i]);
    count.oldFaces += a.faces.length;
    if (a.faces.length !== b.faces.length || off >= 0) fail(`${save.name}: differs from the base engine at face ${off} of ${a.faces.length} (${a.faces[off]} against ${b.faces[off]})`);
    else equal += 1;
  }
  console.log(`B  ${equal} of ${saves.length} saves written by the base engine play out byte equal on the candidate (${count.oldFaces} faces: every entry to the season's end, the summary, the summer, six entries on); ${pausedSaves} of them were paused at half time`);
  if (pausedSaves < 3) fail(`B: only ${pausedSaves} saves were paused at half time, the probe wanted at least three`);
}

const secs = Math.round((Date.now() - T0) / 1000);
console.log(fails.length ? `probeOld1229: ${fails.length} FAILURE(S) (${secs}s)` : `probeOld1229: green, sections A and B (${secs}s)`);
process.exit(fails.length ? 1 : 0);
