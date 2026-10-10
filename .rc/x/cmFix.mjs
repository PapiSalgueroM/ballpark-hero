// Release AT review (area cm): the real fixture list binds ONLY a new original 2026/27 Premier League career.
// usage, from a tree's root: node cmFix.mjs <mk|cmp> <shared dir>
//   mk : in a worktree of 54e3820a. Makes saves with Release AS code (through its own saveCareer) and records
//        their fixture lists and a seeded match week.
//   cmp: in the merged head. Loads those saves through loadCareer and plays the same week; then checks the new list.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2];
const shared = process.argv[3];
const root = process.cwd();
const out = process.env.RC_OUT || shared;
fs.mkdirSync(shared, { recursive: true });
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-fix-'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const cm = createRequire(import.meta.url)(bundle);
await cm.ensureEraRosters('era2015');
const J = JSON.stringify;
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : J(v)).digest('hex').slice(0, 20);
const realRandom = Math.random, realNow = Date.now;
function seeded(seed, fn) {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}
const leagueEntries = s => s.calendar.filter(e => e.type === 'league');
const noLive = s => { const { live, ...rest } = s; return rest; };
// One seeded match week from a loaded save, the way the hook asked for it on Release AS (no reviews).
function week(state, extra) {
  const rows = [];
  let s = state;
  if (s.live) {
    const r = seeded(7001, () => { const second = cm.startSecondHalf(s); return second ? cm.resumeMatch(second) : null; });
    if (r) { rows.push([r.kind, r.report ? sha(r.report) : null, sha(noLive(r.state))]); s = r.state; }
  }
  for (let i = 0; i < 3; i++) {
    const r = seeded(7100 + i, () => cm.playNextEntry(s, { skipHalftime: true, ...extra }));
    rows.push([r.kind, r.report ? sha(r.report) : null, sha(noLive(r.state)), r.report ? `${r.report.home} ${r.report.homeGoals}-${r.report.awayGoals} ${r.report.away}` : '']);
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return rows;
}

if (mode === 'mk') {
  const made = [];
  const keep = (tag, state) => {
    store.clear();
    if (!cm.saveCareer(state)) throw new Error('saveCareer refused ' + tag);
    const bytes = store.get(cm.SAVE_KEY);
    const loaded = cm.loadCareer();
    const pairs = leagueEntries(loaded).map(e => cm.roundPairs(loaded.leagueClubs, e.round, !!loaded.balancedFixtures));
    made.push({ tag, bytes, club: loaded.clubName, season: loaded.season, rounds: pairs.length, pairsSha: sha(pairs), pairs0: pairs[0], next: J(cm.nextFixture(loaded)), week: week(loaded) });
  };
  const walk = (state, n, seed0) => { let s = state; for (let i = 0; i < n; i++) { const r = seeded(seed0 + i, () => cm.playNextEntry(s, { skipHalftime: true })); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; } return s; };
  const pl = cm.playableClubs('premier').map(c => c.name);
  for (const club of ['Everton', 'Arsenal', 'Liverpool', 'Sunderland']) keep(`${club} new`, seeded(4107, () => cm.startCareer(club)));
  const ev = walk(seeded(4107, () => cm.startCareer('Everton')), 7, 5000);
  keep('Everton after 7 entries', ev);
  keep('Arsenal after 22 entries', walk(seeded(4107, () => cm.startCareer('Arsenal')), 22, 5100));
  let half = ev;
  for (let i = 0; i < 6; i++) { const r = seeded(5200 + i, () => cm.playNextEntry(half, {})); half = r.state; if (r.kind === 'halftime') break; }
  if (half.live) keep('Everton stopped at half time', half);
  keep('Barcelona new (another league)', seeded(4107, () => cm.startCareer('Barcelona')));
  keep('Everton 2015-16 (another start year)', seeded(4107, () => cm.startCareer('Everton', 'era2015')));
  const spec = { name: 'Review Fixture FC', stadium: 'Review Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'RFC' }, budgetTier: 'small', leagueId: 'premier', replacedClub: pl.at(-1) };
  try { keep('custom club in the Premier League', seeded(4107, () => cm.startCareer(spec.name, 'now', spec))); } catch (e) { made.push({ tag: 'custom club', error: String(e.message || e) }); }
  try { keep('edited world, Everton', seeded(4107, () => cm.startCareer('Everton', 'now', undefined, undefined, undefined, { premier: [...pl] }))); } catch (e) { made.push({ tag: 'edited world', error: String(e.message || e) }); }
  // A second season: play Liverpool's first to the end, close it, open the next.
  let s2 = seeded(4107, () => cm.startCareer('Liverpool'));
  for (let i = 0; i < 200 && s2.week < s2.calendar.length; i++) {
    const r = seeded(5300 + i, () => cm.playNextEntry(s2, { skipHalftime: true }));
    s2 = r.state.sacked ? { ...r.state, sacked: false, boardConfidence: 60 } : r.state;
    if (r.kind === 'seasonOver') break;
  }
  try { const closed = seeded(6100, () => cm.finishSeason(s2)); keep('Liverpool season 2', seeded(6200, () => cm.startNextSeason(closed.state))); } catch (e) { made.push({ tag: 'season 2', error: String(e.message || e) }); }
  fs.writeFileSync(path.join(shared, 'fix-base.json'), J({ pl, made }));
  console.log(`cmFix mk: ${made.length} saves made by this tree: ${made.map(m => m.tag + (m.error ? ' ERROR ' + m.error : '')).join('; ')}`);
  process.exit(0);
}

const { pl, made } = JSON.parse(fs.readFileSync(path.join(shared, 'fix-base.json'), 'utf8'));
const fails = [], notes = [];
const check = (ok, text) => { if (!ok) fails.push(text); return ok; };
// 1. Saves made by Release AS, loaded and played here.
for (const m of made) {
  if (m.error) { notes.push(`not made on AS: ${m.tag}: ${m.error}`); continue; }
  store.clear(); store.set(cm.SAVE_KEY, m.bytes);
  const loaded = cm.loadCareer();
  if (!check(!!loaded, `${m.tag}: the AS save does not load`)) continue;
  check(loaded.realLeagueFixtures === undefined, `${m.tag}: an old save claims the real list`);
  check(cm.careerFixtureCoverage(loaded) === null, `${m.tag}: an old save shows the real fixture line`);
  const pairs = leagueEntries(loaded).map(e => cm.careerRoundPairs(loaded, e.round));
  check(sha(pairs) === m.pairsSha, `${m.tag}: its fixture list changed (round 1 was ${J(m.pairs0).slice(0, 80)}, is ${J(pairs[0]).slice(0, 80)})`);
  check(J(cm.nextFixture(loaded)) === m.next, `${m.tag}: its next fixture changed`);
  const w = week(loaded);
  check(J(w) === J(m.week), `${m.tag}: the same seeded match week without reviews plays differently (${J(m.week).slice(0, 120)} against ${J(w).slice(0, 120)})`);
  let on = null;
  try { on = week(loaded, { varReviews: true }); } catch (e) { fails.push(`${m.tag}: the match week with reviews on THROWS: ${e.message}`); }
  notes.push(`${m.tag}: loads, no key, ${m.rounds} rounds unchanged, week byte equal without reviews; with reviews on (the hook) ${on ? (J(on) === J(m.week) ? 'the same results' : 'DIFFERENT results: ' + on.map(r => r[3]).join(' | ') + ' against AS ' + m.week.map(r => r[3]).join(' | ')) : 'threw'}`);
}
// 2. The list itself, read through the engine for every Premier League club.
const directed = new Map();
let boundClubs = 0;
for (const club of pl) {
  const s = seeded(4107, () => cm.startCareer(club));
  if (s.realLeagueFixtures) boundClubs += 1;
  const entries = leagueEntries(s);
  check(entries.length === 38, `${club}: ${entries.length} league entries in the calendar`);
  const cov = cm.careerFixtureCoverage(s);
  check(!!cov && /simulated/i.test(cov.label), `${club}: no coverage line, or it does not say simulated`);
  let home = 0, away = 0;
  entries.forEach(e => {
    const pairs = cm.careerRoundPairs(s, e.round);
    const seen = new Set(pairs.flat());
    check(pairs.length === 10 && seen.size === 20, `${club} round ${e.round + 1}: ${pairs.length} pairs, ${seen.size} clubs`);
    const mine = pairs.find(p => p.includes(club));
    const fx = cm.fixtureFor(s, e);
    check(!!mine && !!fx && fx.opponent === (mine[0] === club ? mine[1] : mine[0]) && fx.home === (mine[0] === club), `${club} round ${e.round + 1}: the fixture card disagrees with the list`);
    if (mine && mine[0] === club) home += 1; else away += 1;
    if (club === pl[0]) for (const [h, a] of pairs) directed.set(`${h}>${a}`, (directed.get(`${h}>${a}`) ?? 0) + 1);
  });
  check(home === 19 && away === 19, `${club}: ${home} home, ${away} away`);
}
check(boundClubs === pl.length, `only ${boundClubs} of ${pl.length} new Premier League careers bind the list`);
check(directed.size === 380 && [...directed.values()].every(n => n === 1), `directed pairs: ${directed.size} distinct, some repeated`);
check([...directed.keys()].every(k => { const [h, a] = k.split('>'); return directed.has(`${a}>${h}`); }), 'a pair does not have its return match');
// 3. A whole first season on the list the way the hook plays it, then the summer.
let s = seeded(4107, () => cm.startCareer('Arsenal'));
let leaguePlayed = 0, wrong = 0, reviewed = 0;
for (let i = 0; i < 220 && s.week < s.calendar.length; i++) {
  const entry = s.calendar[s.week];
  const want = entry.type === 'league' ? cm.careerRoundPairs(s, entry.round).find(p => p.includes('Arsenal')) : null;
  const r = seeded(5300 + i, () => cm.playNextEntry(s, { skipHalftime: true, varReviews: true }));
  if (r.kind === 'match' && r.report?.competition === 'league') { leaguePlayed += 1; if (!want || r.report.home !== want[0] || r.report.away !== want[1]) wrong += 1; if ((r.report.detail?.timeline ?? []).some(e => e.kind === 'var')) reviewed += 1; }
  s = r.state.sacked ? { ...r.state, sacked: false, boardConfidence: 60 } : r.state;
  if (r.kind === 'seasonOver') break;
}
check(leaguePlayed === 38 && wrong === 0, `Arsenal's first season: ${leaguePlayed} league matches, ${wrong} against the wrong club or at the wrong ground`);
check(s.table.every(r => r.w + r.d + r.l === 38), 'not every club played 38');
const closed = seeded(6100, () => cm.finishSeason(s));
const next = seeded(6200, () => cm.startNextSeason(closed.state));
check(next.realLeagueFixtures === undefined && cm.careerFixtureCoverage(next) === null, 'season 2 still claims the real list');
const p2 = leagueEntries(next).map(e => cm.careerRoundPairs(next, e.round));
check(J(p2) === J(leagueEntries(next).map(e => cm.roundPairs(next.leagueClubs, e.round, !!next.balancedFixtures))), 'season 2 is not the generated list');
const w2 = week(next, { varReviews: true });
notes.push(`Arsenal: 38 league matches on the list, ${reviewed} of them with a review; season 2 has no key, ${p2.length} generated rounds, and plays (${w2.map(r => r[3]).filter(Boolean).join(' | ')})`);
const NL = String.fromCharCode(10);
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'fix-compare.txt'), notes.join(NL) + NL + 'FAILS:' + NL + fails.join(NL) + NL);
console.log(notes.join(NL));
console.log(fails.length ? `cmFix: ${fails.length} FAILURE(S)${NL}${fails.slice(0, 30).join(NL)}` : `cmFix: ALL GREEN. ${made.filter(m => !m.error).length} Release AS saves load and play unchanged, the list is a true double round robin for all ${pl.length} clubs, a first season plays it and the second does not.`);
process.exit(fails.length ? 1 : 0);
