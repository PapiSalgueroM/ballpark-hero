// Reviewer probe (r1329-run): old saves made by the BASE engine (c5fc5470) loaded and played on the HEAD.
// Part A: why simSoccerWorldTruth section 4 is red at SEED_OFFSET=7 (old 2028 saves, real men off their era club).
// Part B: a broad fleet of base saves at several years and phases, played three seasons on the head.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1329run-old-'));
const BASE_SHA = 'c5fc5470b3e377f22d6d538f459b9f5310b08dd0';
async function bundle(tag, ref) {
  const entry = "export * as engine from './src/lib/soccerCareerEngine'; export * as eras from './src/lib/careerEras'; export * as arcade from './src/lib/soccerArcade'; export * as phone from './src/lib/soccerPhone';" + (ref ? '' : " export * as truth from './src/lib/soccerWorldTruth';");
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!ref || !rel.startsWith('src/')) return undefined;
    return { contents: execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }), loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
  }); } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, plugins: [plugin], loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' } });
  return import(pathToFileURL(out).href);
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, get length() { return store.size; }, clear: () => store.clear() };
const HEAD = await bundle('head', null);
const BASEB = await bundle('base', BASE_SHA);
const T = HEAD.truth;
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const copy = v => JSON.parse(JSON.stringify(v));
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
const NATIONS = ['England', 'Brazil', 'France', 'Spain', 'Germany', 'Argentina', 'Italy', 'Netherlands', 'Nigeria', 'Japan'];
const ERA = new Map();
for (let y = 1990; y <= 2032; y += 1) for (const st of HEAD.eras.getEraStars(y)) { if (!ERA.has(st.name)) ERA.set(st.name, new Map()); ERA.get(st.name).set(y, st.club); }
/* the step policy of scripts/simSoccerWorldTruth.mjs, lifted */
function step(M, s, seed) {
  const clubs = M.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = (s.pendingOffers || []).find(x => !x.isLoan) || (s.pendingOffers || [])[0]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, seed % 3);
    case 'random_events': { const ev = s.pendingEvents && s.pendingEvents[0]; if (!ev) return { ...s, pendingEvents: [], phase: 'playing' }; return M.applyEventChoice(s, (seed + ev.id + s.seasons.length) % Math.max(1, ev.choices.length), clubs); }
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { let t = M.dismissSocialMediaPhase(s, clubs); if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs); return t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return s.pendingWorldCup && s.pendingWorldCup.result === 'Winner' ? M.applyWorldCupSpeech(s, 'for_the_country', clubs) : M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': { const sit = s.transferSituation; if (!sit || sit.type === 'no_interest') return M.stayAtClub(s); return M.stayAtClub(s); }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
const offEra = s => { const y = s.phone?.world?.year; let n = 0; for (const [name, club] of Object.entries(s.phone?.clubs || {})) if (ERA.has(name) && ERA.get(name).has(y) && ERA.get(name).get(y) !== club) n += 1; return n; };
const nightOff = s => { const n = s.pendingBallonDor; if (!n) return 0; const y = s.phone?.world?.year; let k = 0; for (const x of (n.nominees || n.top || [])) if (x && ERA.has(x.name) && ERA.get(x.name).has(y) && ERA.get(x.name).get(y) !== x.club) k += 1; return k; };

/* ─── Part A: the section 4 old saves at SEED_OFFSET=7, played on for two seasons ─── */
const OFF = Number(process.env.SEED_OFFSET || 7);
const A = { olds: 0, offAfter1: 0, careersOff1: 0, tickRan1: 0, offWhenTickRan1: 0, offWhenNoTick1: 0, offAfter2: 0, nightOff: 0, nights: 0, examples: [] };
for (let i = 0; i < 40; i += 1) {
  const c = { seed: 70000 + OFF * 100 + i, start: 2021, pos: POSITIONS[i % 10], nation: NATIONS[i % 10], ovr: 60 + (i % 12), pot: 85 };
  let s; const real = Math.random; Math.random = seeded(c.seed);
  try { const M = BASEB.engine; s = M.initCareer(`Old ${c.seed}`, c.nation, c.pos, '2020s', stats(c.ovr), c.ovr, c.start, M.FALLBACK_CLUBS, null, c.pot);
    for (let g = 0; g < 300 && !s.retired && !(s.phone?.world?.year >= 2028); g += 1) { const n = step(M, s, c.seed); if (!n) break; s = n; } } finally { Math.random = real; }
  if (s.phone?.world?.year !== 2028) continue;
  A.olds += 1;
  let t = HEAD.engine.repairCareer(copy(s));
  const again = Math.random; Math.random = seeded(c.seed + 7);
  try {
    for (let season = 1; season <= 2; season += 1) {
      const n0 = t.seasons.length; const y0 = t.phone.world.year;
      for (let g = 0; g < 80 && t.seasons.length === n0 && !t.retired; g += 1) { const nx = step(HEAD.engine, t, c.seed); if (!nx) break; t = nx; if (t.phase === 'ballon_dor') { A.nights += 1; A.nightOff += nightOff(t); } }
      if (t.seasons.length === n0) break;
      const off = offEra(t); const ran = t.phone.world.year !== y0; const row = t.seasons.at(-1);
      if (season === 1) { A.offAfter1 += off; if (off) A.careersOff1 += 1; if (ran) { A.tickRan1 += 1; A.offWhenTickRan1 += off; } else A.offWhenNoTick1 += off;
        if (off && A.examples.length < 6) A.examples.push(`seed ${c.seed}: world ${y0} -> ${t.phone.world.year}, row ${row.year} type ${row.type} apps ${row.apps} injuryWeeks ${row.injuryWeeks ?? 0}, ${off} real men off their era club`); }
      else A.offAfter2 += off;
    }
  } finally { Math.random = again; }
}
console.log(`A) seed offset ${OFF}: ${A.olds} old 2028 saves; after one season on the head ${A.offAfter1} real men off their era club in ${A.careersOff1} careers (tick ran in ${A.tickRan1}: ${A.offWhenTickRan1} off; no tick: ${A.offWhenNoTick1} off); after a second season ${A.offAfter2}; Ballon d'Or nights ${A.nights}, nominees off their era club ${A.nightOff}`);
for (const e of A.examples) console.log(`   ${e}`);

/* ─── Part B: base saves at several years and phases, three seasons on the head beside the base ─── */
const REAL_Q = [/champions of Europe/, /Who won /, / move to in /, / finish on in /];
const B = { saves: 0, phases: {}, threw: 0, baseThrew: 0, newKeys: new Set(), newPhoneKeys: new Set(), seasons: 0, worldQPast: 0, realQ: 0, pastClaims: 0, pastNames: 0, honestMissing: 0, quiz3: 0, baseQuiz3: 0, ex: [] };
const STARTS = [2004, 2010, 2016, 2022, 2027];
const playSeasons = (M, s0, seed, n, onSeason) => {
  let s = s0; const real = Math.random; Math.random = seeded(seed);
  try { for (let k = 0; k < n && !s.retired; k += 1) { const n0 = s.seasons.length; const prevFeed = (s.phone?.feed || []).slice();
      for (let g = 0; g < 80 && s.seasons.length === n0 && !s.retired; g += 1) { const nx = step(M, s, seed); if (!nx) break; s = nx; }
      if (s.seasons.length === n0) break; if (onSeason) onSeason(s, prevFeed); } } finally { Math.random = real; }
  return s;
};
for (let si = 0; si < STARTS.length; si += 1) for (let p = 0; p < 10; p += 1) for (let k = 0; k < 2; k += 1) {
  const seed = 90000 + si * 100 + p * 10 + k;
  let s; const real = Math.random; Math.random = seeded(seed);
  try { const M = BASEB.engine; s = M.initCareer(`Base ${seed}`, NATIONS[(p + k) % 10], POSITIONS[p], `${Math.floor(STARTS[si] / 10) * 10}s`, stats(62 + (seed % 14)), 62 + (seed % 14), STARTS[si], M.FALLBACK_CLUBS, null, 80 + (seed % 15));
    const target = 3 + k * 4; let extra = seed % 6;
    for (let g = 0; g < 400 && !s.retired; g += 1) { if (s.seasons.length >= target) { if (extra-- <= 0) break; } const n = step(M, s, seed); if (!n) break; s = n; } } finally { Math.random = real; }
  if (s.retired) continue;
  B.saves += 1; B.phases[s.phase] = (B.phases[s.phase] || 0) + 1;
  const json = JSON.stringify(s);
  let head, base;
  try {
    head = playSeasons(HEAD.engine, HEAD.engine.repairCareer(JSON.parse(json)), seed + 99, 3, (t, prevFeed) => {
      B.seasons += 1; const y = t.phone?.world?.year; const happened = y != null && T.seasonHappened(y);
      const qs = HEAD.arcade.arcadeQuestions(copy(t)); if (qs.length === 3) B.quiz3 += 1;
      for (const q of qs) { if (REAL_Q.some(re => re.test(q.q)) && happened) { B.worldQPast += 1; if (B.ex.length < 8) B.ex.push(`${y} quiz: ${q.q}`); }
        if ([...ERA.keys()].some(nm => q.q.includes(nm))) { B.realQ += 1; if (B.ex.length < 8) B.ex.push(`${y} quiz names a real man: ${q.q}`); } }
      const prev = new Set(prevFeed); const fresh = (t.phone?.feed || []).filter(l => !prev.has(l)); const rival = t.rival?.name;
      if (happened) {
        if (!fresh.includes(T.feedPastSeasonLine(y)) && t.seasons.at(-1).year === y) B.honestMissing += 1;
        for (const l of fresh) { if (/DONE DEAL| are champions of Europe|top scorer| win (?!the (World Cup|Euro|Copa|Africa|Asian|Gold))/.test(l)) { B.pastClaims += 1; if (B.ex.length < 8) B.ex.push(`${y} feed: ${l}`); }
          if ([...ERA.keys()].some(nm => l.includes(nm)) && !(rival && l.includes(rival))) { B.pastNames += 1; if (B.ex.length < 8) B.ex.push(`${y} feed names: ${l}`); } }
      }
    });
  } catch (e) { B.threw += 1; if (B.ex.length < 8) B.ex.push(`head threw on seed ${seed} (${s.phase}): ${String(e.message).slice(0, 120)}`); continue; }
  try { base = playSeasons(BASEB.engine, BASEB.engine.repairCareer(JSON.parse(json)), seed + 99, 3, t => { if (BASEB.arcade.arcadeQuestions(copy(t)).length === 3) B.baseQuiz3 += 1; }); } catch (e) { B.baseThrew += 1; continue; }
  for (const key of Object.keys(head)) if (!(key in base) && !(key in s)) B.newKeys.add(key);
  for (const key of Object.keys(head.phone || {})) if (!(key in (base.phone || {})) && !(key in (s.phone || {}))) B.newPhoneKeys.add(key);
}
console.log(`B) ${B.saves} base saves (phases ${JSON.stringify(B.phases)}) played 3 seasons on the head: ${B.seasons} seasons, threw ${B.threw} (base ${B.baseThrew}), new CareerState keys [${[...B.newKeys].join(',')}], new phone keys [${[...B.newPhoneKeys].join(',')}], world questions about a season that happened ${B.worldQPast}, questions naming a real man ${B.realQ}, past claims in new feed lines ${B.pastClaims}, real names in new feed lines ${B.pastNames}, honest line missing ${B.honestMissing}, three questions ${B.quiz3} (base ${B.baseQuiz3})`);
for (const e of B.ex) console.log(`   ${e}`);
const bad = B.threw + B.newKeys.size + B.newPhoneKeys.size + B.worldQPast + B.realQ + B.pastClaims + B.pastNames + B.honestMissing;
console.log(bad ? `r1329run-oldsaves: ${bad} problems` : 'r1329run-oldsaves: green');
process.exit(bad ? 1 : 0);
