// Reviewer cm, Release AU: what a new Club Manager career opens on, and what stays the base's.
//   node review-cm-bind.mjs --root <tree> --out <file.json> [--fetch]
//   node review-cm-bind.mjs --compare <base.json> <cand.json>
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

if (argv[0] === '--compare') {
  const a = JSON.parse(fs.readFileSync(argv[1], 'utf8')).cases, b = JSON.parse(fs.readFileSync(argv[2], 'utf8')).cases;
  const by = {};
  for (const label of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const [section, league] = label.split('/');
    const s = (by[section] ??= { equal: 0, diff: [], leagues: new Set() });
    if (JSON.stringify(a[label]) === JSON.stringify(b[label])) s.equal++;
    else { s.diff.push(label + (a[label] === undefined ? ' (not in A)' : b[label] === undefined ? ' (not in B)' : (b[label].keyed && !a[label].keyed ? ' (B keyed)' : ''))); s.leagues.add(league); }
  }
  let total = 0;
  for (const [section, s] of Object.entries(by)) {
    total += s.diff.length;
    console.log(`${section}: ${s.equal} equal, ${s.diff.length} different${s.diff.length ? `, leagues ${[...s.leagues].sort().join(' ')}` : ''}`);
    for (const d of s.diff.slice(0, 4)) console.log(`     ${d}`);
  }
  console.log(`review-cm-bind compare ${path.basename(argv[1])} vs ${path.basename(argv[2])}: ${total} case(s) different`);
  process.exit(0);
}

const ROOT = path.resolve(arg('--root'));
const OUT = arg('--out');
const FETCH = argv.includes('--fetch');
const QUICK = argv.includes('--quick');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rcm-bind-'));
const P = f => JSON.stringify(path.join(ROOT, f).split(path.sep).join('/'));
const has = f => fs.existsSync(path.join(ROOT, f));
fs.writeFileSync(path.join(work, 'entry.ts'), [
  `export * as cm from ${P('src/lib/clubManager.ts')};`,
  `export * as cal from ${P('src/lib/clubManagerCalendar.ts')};`,
  has('src/lib/clubManagerFixtures.ts') ? `export * as fx from ${P('src/lib/clubManagerFixtures.ts')};` : 'export const fx = null;',
].join('\n'));
const bundle = path.join(work, 'cm.cjs');
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
  alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(process.cwd(), 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const req = createRequire(import.meta.url);
const M = req(bundle);
const { cm, cal, fx } = M;
const registry = fx?.REAL_LEAGUE_FIXTURES ?? null;
const ledgers = new Map();
if (registry) for (const e of registry) {
  if (FETCH) await fx.ensureRealLeagueFixtures(e.key);
  ledgers.set(e.leagueId, e.ledger ?? (e.load ? await e.load() : null));   /* the data file itself, read for the row check either way */
}
function seeded(seed, fn) {
  const random = Math.random, now = Date.now;
  let a = seed >>> 0, draws = 0;
  Math.random = () => { draws++; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  Date.now = () => 1791547200000;
  try { return { value: fn(), draws }; } finally { Math.random = random; Date.now = now; }
}
const cases = {};
let throws = 0;
const note = (label, fn) => { try { cases[label] = fn(); } catch (e) { throws++; cases[label] = { threw: String(e && e.message || e).slice(0, 200) }; } };
/** A career played the way Play (not Quick Sim) plays it: stop at the interval, then the second half. */
function playOn(start, seed, entries) {
  const s0 = seeded(seed, start);
  let state = s0.value, draws = [s0.draws];
  const chain = [sha(state)];
  const fixtures = [];
  for (let i = 0; i < entries; i++) {
    const r = seeded(seed + 100 + i, () => { let x = cm.playNextEntry(state, { skipHalftime: false }); let g = 0; while (x.kind === 'halftime' && g++ < 3) x = cm.resumeMatch(x.state); return x; });
    draws.push(r.draws);
    state = r.value.state;
    chain.push(sha([r.value.kind, r.value.report ?? null, state]));
    if (r.value.report) fixtures.push([r.value.report.competition ?? null, r.value.report.opponent ?? null, r.value.report.home ?? null, r.value.report.myGoals ?? r.value.report.homeGoals ?? null, r.value.report.oppGoals ?? r.value.report.awayGoals ?? null, (r.value.report.detail?.play ?? []).filter(e => e.kind === 'var').length]);
    if (r.value.kind === 'seasonOver') break;
  }
  return { keyed: 'realLeagueFixtures' in s0.value ? s0.value.realLeagueFixtures : false, coverage: cm.careerFixtureCoverage ? (cm.careerFixtureCoverage(s0.value)?.label ?? null) : null, draws, chain, fixtures, live: !!state.live };
}
const LEAGUES = cm.REAL_LEAGUES.map(l => ({ id: l.id, name: l.name, clubs: [...l.clubs] })).filter(l => !QUICK || ['premier', 'laliga', 'scottish', 'ligue1'].includes(l.id));
const bound = new Set((registry ? registry.map(e => e.leagueId) : ['premier', 'championship', 'laliga', 'seriea', 'bundesliga', 'eredivisie', 'primeira', 'superlig', 'bundesliga2', 'ligue2']).filter(id => !QUICK || ['premier', 'laliga'].includes(id)));
const pick = leagueId => { const pool = cm.playableClubs(leagueId).filter(c => !c.partial).map(c => c.name); const all = pool.length >= 2 ? pool : LEAGUES.find(l => l.id === leagueId).clubs; return [all[0], all[all.length - 1]]; };

/* 1. row for row: every club of every registered league, its whole first season against the data file */
const row = { leagues: 0, clubs: 0, keyed: 0, fixtures: 0, mismatches: 0, pairRows: 0, pairMismatch: 0, first: {} };
if (registry) for (const e of registry) {
  if (!bound.has(e.leagueId)) continue;
  const ledger = ledgers.get(e.leagueId);
  row.leagues++;
  for (const club of ledger.clubs) {
    row.clubs++;
    const s = seeded(9000 + row.clubs, () => cm.startCareer(club)).value;
    if (s.realLeagueFixtures === e.key) row.keyed++;
    const mine = [];
    for (const entry of s.calendar) {
      if (entry.type !== 'league') continue;
      const fxr = cm.fixtureFor(s, entry);
      const real = ledger.rounds[entry.round]?.find(([h, a]) => h === club || a === club);
      row.fixtures++;
      const want = real ? [real[0] === club ? real[1] : real[0], real[0] === club] : null;
      if (!fxr || !want || fxr.opponent !== want[0] || fxr.home !== want[1]) row.mismatches++;
      if (mine.length < 3 && fxr) mine.push(`${fxr.home ? 'H' : 'A'} ${fxr.opponent}`);
    }
    if (club === ledger.clubs[0]) {
      row.first[e.leagueId] = { club, key: s.realLeagueFixtures ?? null, first: mine, rounds: ledger.rounds.length, coverage: cm.careerFixtureCoverage(s)?.label ?? null, sources: (cm.careerFixtureCoverage(s)?.sources ?? []).map(x => x.url) };
      for (let r = 0; r < ledger.rounds.length; r++) { row.pairRows++; if (JSON.stringify(cm.careerRoundPairs(s, r)) !== JSON.stringify(ledger.rounds[r])) row.pairMismatch++; }
    }
  }
}

/* 2. plain: two clubs of every league, two seeds, eight entries played with the interval */
for (const l of LEAGUES) for (const club of pick(l.id)) for (const seed of [1717, 2828]) note(`plain/${l.id}/${club}/${seed}`, () => playOn(() => cm.startCareer(club), seed, 8));
/* 3. founded, edited: every bound league and two that are not */
for (const leagueId of [...bound, 'scottish', 'ligue1']) {
  const clubs = LEAGUES.find(l => l.id === leagueId)?.clubs;
  if (!clubs) continue;
  const spec = { name: 'Reviewer Test FC', stadium: 'Test Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'RTF' }, budgetTier: 'small', leagueId, replacedClub: clubs.at(-1) };
  note(`founded/${leagueId}`, () => playOn(() => cm.startCareer(spec.name, 'now', JSON.parse(JSON.stringify(spec))), 3939, 5));
  note(`edited/${leagueId}`, () => playOn(() => cm.startCareer(clubs[0], 'now', undefined, undefined, undefined, { [leagueId]: [...clubs] }), 4040, 5));
}
/* 4. another start year: every league of two past seasons */
for (const eraId of QUICK ? [] : ['era2020', 'era2010']) {
  await cm.ensureEraRosters(eraId);
  for (const l of cm.worldLeagueDefs({ eraId })) {
    const names = cm.eraPlayableClubs(eraId, l.id).map(c => c.name);
    note(`era/${l.id}/${eraId}/${names[0]}`, () => playOn(() => cm.startCareer(names[0], eraId), 5151, 5));
  }
}
/* 5. a mid season takeover, every bound league and two that are not, at each of the game's entry points */
for (const leagueId of [...bound, 'scottish', 'ligue1']) for (const entry of Object.keys(cal.MIDSEASON_ENTRY ?? {})) {
  const club = pick(leagueId)[0];
  note(`takeover/${leagueId}/${entry}`, () => { const r = playOn(() => cal.startMidSeason(cm.startCareer(club), entry), 6262, 3); return r; });
}
/* 6. a later season: season one played out, then season two holds no key and reads the generated list */
const later = {};
for (const leagueId of bound) {
  const club = pick(leagueId)[0];
  try {
    let s = seeded(7373, () => cm.startCareer(club)).value;
    const had = s.realLeagueFixtures ?? null;
    let g = 0, over = false;
    while (g++ < 90 && !over) { const r = seeded(7373 + g, () => cm.playNextEntry(s, { skipHalftime: true })); s = r.value.state; over = r.value.kind === 'seasonOver' || !!s.sacked; }
    if (s.sacked) { later[leagueId] = { had, sacked: true }; continue; }
    const next = seeded(8484, () => cm.startNextSeason(cm.finishSeason(s).state)).value;
    let gen = 0;
    for (let r = 0; r < 6; r++) if (JSON.stringify(cm.careerRoundPairs(next, r)) === JSON.stringify(cm.roundPairs(next.leagueClubs, r, !!next.balancedFixtures))) gen++;
    later[leagueId] = { had, season: next.season, keyed: 'realLeagueFixtures' in next, coverage: cm.careerFixtureCoverage(next)?.label ?? null, generatedRounds: gen };
  } catch (e) { throws++; later[leagueId] = { threw: String(e && e.message || e).slice(0, 200) }; }
}

fs.writeFileSync(OUT, JSON.stringify({ root: ROOT, fetch: FETCH, row, later, cases, throws }));
const keyedPlain = Object.entries(cases).filter(([k, v]) => k.startsWith('plain/') && v.keyed).map(([k]) => k.split('/')[1]);
const varSeen = Object.values(cases).reduce((n, v) => n + (v.fixtures ?? []).reduce((m, f) => m + (f[5] || 0), 0), 0);
console.log(`row: ${JSON.stringify({ ...row, first: undefined })}`);
for (const [id, f] of Object.entries(row.first)) console.log(`  ${id}: ${f.club} key ${f.key} first ${f.first.join(' | ')} (${f.rounds} rounds) :: ${f.coverage}`);
console.log(`later: ${JSON.stringify(later)}`);
console.log(`takeover keyed: ${Object.entries(cases).filter(([k, v]) => k.startsWith('takeover/') && v.keyed).map(([k]) => k.slice(9)).join(' ') || 'none'}`);
console.log(`founded/edited/era keyed: ${Object.entries(cases).filter(([k, v]) => /^(founded|edited|era)\//.test(k) && v.keyed).map(([k]) => k).join(' ') || 'none'}`);
console.log(`review-cm-bind ${path.basename(OUT)}: fetch ${FETCH}, ${Object.keys(cases).length} cases, plain keyed leagues [${[...new Set(keyedPlain)].join(' ')}], review lines seen ${varSeen}, throws ${throws}`);
