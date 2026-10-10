// Reviewer cm, Release AU: what Manager Hot Seat and Deadline Day deal for N dates, from any tree's source.
//   node review-cm-daily.mjs --root <tree> --out <file.json> [--fetch]   deal and write
//   node review-cm-daily.mjs --compare <a.json> <b.json>                 compare two files, exit 1 on a difference
// --fetch: every real fixture list is fetched first (a player who opened Club Manager, then a daily).
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

if (argv[0] === '--compare') {
  const a = JSON.parse(fs.readFileSync(argv[1], 'utf8')), b = JSON.parse(fs.readFileSync(argv[2], 'utf8'));
  let bad = 0, same = 0;
  const leagues = { hot: {}, deadline: {} };
  for (const kind of ['hot', 'deadline']) {
    const dates = [...new Set([...Object.keys(a[kind]), ...Object.keys(b[kind])])].sort();
    for (const d of dates) {
      const x = JSON.stringify(a[kind][d]), y = JSON.stringify(b[kind][d]);
      const lg = (b[kind][d] ?? a[kind][d])?.league ?? '?';
      leagues[kind][lg] = (leagues[kind][lg] ?? 0) + 1;
      if (x === y) { same++; continue; }
      bad++;
      const fa = a[kind][d] ?? {}, fb = b[kind][d] ?? {};
      const fields = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter(k => JSON.stringify(fa[k]) !== JSON.stringify(fb[k]));
      console.log(`DIFF ${kind} ${d} (${lg}): fields ${fields.join(', ')}`);
      for (const k of fields.slice(0, 3)) console.log(`   ${k}: A ${JSON.stringify(fa[k])?.slice(0, 220)}\n   ${k}: B ${JSON.stringify(fb[k])?.slice(0, 220)}`);
    }
  }
  console.log(`leagues dealt, hot: ${JSON.stringify(leagues.hot)}`);
  console.log(`leagues dealt, deadline: ${JSON.stringify(leagues.deadline)}`);
  console.log(`errors recorded in A: ${a.errors}, in B: ${b.errors}`);
  console.log(`review-cm-daily compare ${path.basename(argv[1])} vs ${path.basename(argv[2])}: ${same} deals equal, ${bad} different${a.errors || b.errors ? ' (ERRORS RECORDED, read them)' : ''}`);
  process.exit(bad || a.errors || b.errors ? 1 : 0);
}

const ROOT = path.resolve(arg('--root'));
const OUT = arg('--out');
const FETCH = argv.includes('--fetch');
const N = Number(arg('--days') || 60);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rcm-daily-'));
const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
const hasFx = fs.existsSync(path.join(ROOT, 'src/lib/clubManagerFixtures.ts'));
fs.writeFileSync(path.join(work, 'entry.ts'), `export * as hs from ${P('src/lib/managerHotSeat.ts')};\nexport * as dd from ${P('src/lib/deadlineDay.ts')};\n${hasFx ? `export * as fx from ${P('src/lib/clubManagerFixtures.ts')};\n` : 'export const fx = null;\n'}`);
const bundle = path.join(work, 'daily.cjs');
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(HERE, '..', '..', 'node_modules'), path.join(process.cwd(), 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
let fetched = 0;
async function fresh() {
  delete req.cache[req.resolve(bundle)];
  store.clear();
  const m = req(bundle);
  if (FETCH) {
    if (!m.fx || !m.fx.REAL_LEAGUE_FIXTURES || !m.fx.ensureRealLeagueFixtures) throw new Error('--fetch asked for and this tree has no registry to fetch from');
    for (const e of m.fx.REAL_LEAGUE_FIXTURES) await m.fx.ensureRealLeagueFixtures(e.key);
    fetched = m.fx.REAL_LEAGUE_FIXTURES.filter(e => m.fx.realLeagueFixturesLoaded(e.key)).length;
  }
  return m;
}
let errors = 0;
const safe = fn => { try { return fn(); } catch (e) { errors++; return `THROW ${String(e && e.message || e).slice(0, 160)}`; } };
const matchRow = m => [m.compLabel, m.opponent, m.home, m.myGoals, m.oppGoals, m.res, m.counts, m.pens, m.board, m.boardDelta, m.fans, m.morale, m.events];
const calRow = (s, hs) => (s.calendar ?? []).map(e => [e.type, e.round, e.cupRound ?? null, e.uclRound ?? null]);

function hot(m, date) {
  const { hs } = m;
  const setup = hs.dailyHotSeat(date);
  const start = () => hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  const run0 = start();
  const out = { league: setup.leagueName, club: setup.club, seed: setup.seed, keyed: 'realLeagueFixtures' in run0.state };
  out.takeover = run0.takeover; out.target = run0.target; out.leash = run0.leash;
  out.week = run0.state.week; out.season = run0.state.season; out.played = safe(() => hs.leagueGamesPlayed(run0.state));
  out.upcoming = safe(() => hs.upcoming(run0));
  out.table = run0.state.table;
  out.form = run0.state.form; out.budget = run0.state.budget; out.board = run0.state.boardConfidence ?? null;
  out.calendar = calRow(run0.state);
  out.meters = safe(() => hs.hotSeatMeters(run0.state));
  out.squad = (run0.state.squad ?? []).map(p => [p.name, p.position, p.rating, p.age]);
  /* every choice at the first decision: three mentalities by five talks, and every press answer */
  out.first = {};
  const firstPress = hs.pendingPress(run0);
  if (firstPress) {
    out.pressQuestion = firstPress;
    (firstPress.options ?? [0, 1, 2]).forEach((_, i) => { out.first[`press${i}`] = safe(() => { const r = hs.answerHotSeatPress(start(), i); return [hs.hotSeatMeters(r.state), r.points, r.verdict]; }); });
  }
  const afterPress = () => { let r = start(); let g = 0; while (hs.pendingPress(r) && g++ < 5) r = hs.answerHotSeatPress(r, 0); return r; };
  for (const ment of ['defensive', 'balanced', 'attacking']) for (const talk of [null, 'calm', 'rally', 'demand', 'blast']) {
    out.first[`${ment}/${talk}`] = safe(() => { const r = hs.playHotSeatMatch(afterPress(), ment, talk); const last = r.log[r.log.length - 1]; return last ? matchRow(last) : null; });
  }
  /* three whole days, each played one fixed way */
  out.runs = {};
  for (const [name, ment, talk, press] of [['balanced', 'balanced', null, 0], ['attack', 'attacking', 'rally', 1], ['defend', 'defensive', 'calm', 2]]) {
    out.runs[name] = safe(() => {
      let r = start(), g = 0;
      while (!r.verdict && g++ < 60) { const q = hs.pendingPress(r); r = q ? hs.answerHotSeatPress(r, Math.min(press, (q.options?.length ?? 1) - 1)) : hs.playHotSeatMatch(r, ment, talk); }
      return { log: r.log.map(matchRow), verdict: r.verdict, points: r.points, share: r.verdict ? hs.shareText(r) : null, keyed: 'realLeagueFixtures' in r.state, table: r.state.table };
    });
  }
  return out;
}

function deadline(m, date) {
  const { dd } = m;
  const setup = dd.dailyDeadlineDay(date);
  const start = () => dd.startDeadlineDay(setup);
  const run0 = start();
  const tRow = t => [t.mp?.name ?? null, t.mp?.club ?? null, t.mp?.position ?? null, t.mp?.rating ?? null, t.mp?.value ?? null, t.mp?.price ?? null, t.need, t.status, t.rival, t.hours, t.note, t.fee ?? null, t.bonus ?? null, t.wage ?? null, t.lostTo ?? null];
  const out = { league: setup.leagueName, club: setup.club, seed: setup.seed, keyed: 'realLeagueFixtures' in run0.state };
  out.needs = run0.needs; out.targets = run0.targets.map(tRow); out.sales = run0.sales; out.startBudget = run0.startBudget; out.ticker = run0.ticker;
  out.week = run0.state.week; out.season = run0.state.season; out.table = run0.state.table; out.budget = run0.state.budget;
  out.squad = (run0.state.squad ?? []).map(p => [p.name, p.position, p.rating, p.age]);
  out.gradeAtOnce = safe(() => dd.gradeWindow(dd.endDay(start())));
  /* every choice: open talks with each target, the desk's read, a bid at value and at 1.3 value, the terms he wants, walk; every sale */
  out.each = run0.targets.map((t, i) => safe(() => {
    const opened = dd.openTalks(start(), i);
    const read = dd.deskRead(opened, i);
    const value = t.mp?.value ?? t.mp?.price ?? 0;
    const bids = [1.0, 1.3].map(k => safe(() => { const amt = Math.round(value * k); const r = dd.placeBid(dd.openTalks(start(), i), i, amt); const want = dd.termsWanted(r, i); const done = want ? dd.offerPersonalTerms(r, i, { wage: want.wage, years: want.years, bonus: want.bonus }) : r; return [amt, dd.bidMeter(dd.openTalks(start(), i), i, amt), tRow(r.targets[i]), want, tRow(done.targets[i]), done.hour, done.ticker[0] ?? null, done.state.budget]; }));
    const walked = dd.walkFrom(dd.openTalks(start(), i), i);
    return { refusal: dd.openRefusal(start(), i), opened: tRow(opened.targets[i]), hour: opened.hour, read, bids, walked: tRow(walked.targets[i]) };
  }));
  out.sells = run0.sales.map((s, k) => safe(() => { const r = dd.sellPlayer(start(), k); return [r.sales[k], r.state.budget, r.hour, r.ticker[0] ?? null]; }));
  /* one whole day: sell the first, then sign each need's first target at 1.3 value on the terms he wants */
  out.day = safe(() => {
    let r = start();
    if (r.sales.length) r = dd.sellPlayer(r, 0);
    const seen = new Set();
    r.targets.forEach((t, i) => { if (seen.has(t.need) || dd.isOver(r)) return; seen.add(t.need); r = dd.openTalks(r, i); r = dd.placeBid(r, i, Math.round((t.mp?.value ?? t.mp?.price ?? 0) * 1.3)); const want = dd.termsWanted(r, i); if (want) r = dd.offerPersonalTerms(r, i, { wage: want.wage, years: want.years, bonus: want.bonus }); });
    r = dd.endDay(r);
    return { grade: dd.gradeWindow(r), share: dd.shareText(r), targets: r.targets.map(tRow), ticker: r.ticker, keyed: 'realLeagueFixtures' in r.state };
  });
  return out;
}

const out = { root: ROOT, fetch: FETCH, hot: {}, deadline: {}, errors: 0 };
const day0 = Date.UTC(2026, 9, 10);
for (let i = 0; i < N; i++) {
  const date = new Date(day0 + i * 86400000).toISOString().slice(0, 10);
  out.hot[date] = hot(await fresh(), date);
  out.deadline[date] = deadline(await fresh(), date);
}
out.errors = errors;
fs.writeFileSync(OUT, JSON.stringify(out));
const keyed = k => Object.values(out[k]).filter(v => v.keyed || v.runs?.balanced?.keyed || v.day?.keyed).length;
const lg = k => { const c = {}; for (const v of Object.values(out[k])) c[v.league] = (c[v.league] ?? 0) + 1; return JSON.stringify(c); };
console.log(`hot leagues: ${lg('hot')}`);
console.log(`deadline leagues: ${lg('deadline')}`);
console.log(`review-cm-daily ${path.basename(OUT)}: ${N} dates each, lists fetched ${FETCH ? fetched : 'none'}, hot keyed ${keyed('hot')}, deadline keyed ${keyed('deadline')}, throws recorded ${errors}, ${fs.statSync(OUT).size} bytes`);
