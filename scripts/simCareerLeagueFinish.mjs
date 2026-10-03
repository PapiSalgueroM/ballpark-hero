/* Round 929: every Soccer Career season knows where the club finished.

   Before this round a playing season recorded only leagueTitle, a coin drawn
   by tier, so a player finished a season and never learned where his club
   ended up. And the elite title boost read one era blind list, so Man City
   and PSG won the league in about two seasons of three in a 1990s career
   while the era tier rules rated Man City tier 4 until 2008.

   This runs the real engine, bundled the way simCareerCleanSheets does it,
   over seeded careers, and measures:

   1. finish is 1 exactly when leagueTitle is true, every season, and a title
      season always carries a finish;
   2. a finish is never above the league size, never below 1, and a season
      in a league with a verified size always carries both fields;
   3. the tier ordering of mean finish holds over pooled seeds (elite, then
      tier 1, 2, 3, 4), each step of the ladder, not only its two ends;
   4. the current era digest: seeded careers starting in 2020 produce a state
      byte identical to the one recorded from main before this round, once the
      two new fields are taken out, so the main Math.random stream did not move;
   5. the elite boost is era aware: a season played at Man City in 1995 wins
      the title at its tier's rate, at Man City in 2020 at the elite rate, and
      Real Madrid in 1995 at the elite rate (forced seasons over many seeds).

   Negative controls (each asserts its anchor exists exactly once first):
   SIM_LEAGUE_FINISH_CONTROL=notitle   the title rule leaves the module: a
     title season is drawn a finish like any other. Section 1 must go red.
   SIM_LEAGUE_FINISH_CONTROL=eliteblind the engine reads the era blind list
     again. Section 5 must go red.
   Exit 1 when a control did its job, 2 when it proved nothing or its name is
   not one this harness knows.

   Record mode: node scripts/simCareerLeagueFinish.mjs --record prints the
   per career digests of the CURRENT tree (run on main, before the round).

   Run: node scripts/simCareerLeagueFinish.mjs [careersPerTier] */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_LEAGUE_FINISH_CONTROL || '';
const CONTROLS = { notitle: [3, 1], eliteblind: [5] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error('unknown control ' + CONTROL + ' (known: ' + Object.keys(CONTROLS).join(', ') + ')'); process.exit(2); }
const RECORD = process.argv.includes('--record');
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const WORK = path.join(TMP, `sc-leaguefinish-${process.pid}`);
fs.mkdirSync(WORK, { recursive: true });
const OUT = path.join(WORK, 'bundle.mjs');
const ENTRY = path.join(WORK, 'entry.mjs');
const lib = `${ROOT}/src/lib/`.replaceAll('\\', '/');

/* A control edits a COPY. The copies live outside src/lib, so their relative
   imports are pointed back at the real files, except the engine's import of
   the league module when the league module is the copy being mutated. */
function mutate(file, anchor, replacement) {
  const src = fs.readFileSync(`${ROOT}/src/lib/${file}`, 'utf8');
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`control ${CONTROL}: the anchor appears ${n} times in ${file}, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}
const relocate = (src, keep = '') => src.replace(/from (['"])\.\/([A-Za-z0-9_]+)\1/g, (m, q, name) => name === keep ? m : `from ${q}${lib}${name}${q}`);
let enginePath = `${ROOT}/src/lib/soccerCareerEngine.ts`;
if (CONTROL === 'notitle') {
  const league = mutate('soccerCareerLeague.ts', 'if (input.leagueTitle) return { leagueFinish: 1', 'if (false) return { leagueFinish: 1');
  fs.writeFileSync(path.join(WORK, 'soccerCareerLeague.ts'), relocate(league));
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(fs.readFileSync(`${ROOT}/src/lib/soccerCareerEngine.ts`, 'utf8'), 'soccerCareerLeague'));
} else if (CONTROL === 'eliteblind') {
  const engine = mutate('soccerCareerEngine.ts', 'const isElite = eliteInYear(ELITE_CLUBS, state.currentClub, seasonYear);', 'const isElite = ELITE_CLUBS.includes(state.currentClub);');
  enginePath = path.join(WORK, 'soccerCareerEngine.ts');
  fs.writeFileSync(enginePath, relocate(engine));
}

/* Same two stage entry with a localStorage stub as simCareerEngaged: the
   engine's import chain reaches the Supabase client module, which reads
   localStorage as it loads. Nothing here fetches anything. */
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${enginePath.replaceAll('\\', '/')}');
export const engine = mod;
`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: OUT, logLevel: 'error', alias: { '@': './src' }, absWorkingDir: ROOT });
const { engine } = await import(pathToFileURL(OUT).href);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const NEED = ['initCareer', 'advanceYouthYear', 'acceptOffer', 'advanceProSeason', 'dismissSummary', 'dismissNewspaper', 'dismissDebut', 'dismissWorldCup', 'dismissRivalryEvent', 'dismissBallonDor', 'applyEventChoice', 'dismissMoralDilemma', 'dismissSocialMediaPhase', 'dismissAppealResult', 'applyBdorSpeech', 'applyWorldCupSpeech', 'acceptRetirementSuggestion', 'stayAtClub', 'applyRehabChoice', 'FALLBACK_CLUBS'];
for (const k of NEED) if (!engine[k]) { console.error('engine export missing: ' + k + ', so nothing below measures anything'); process.exit(1); }
const clubs = engine.FALLBACK_CLUBS;

/* Deterministic: a seeded generator stands in for Math.random for the length
   of each career, so every red here reproduces. */
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];

/* simCareerCleanSheets' full phase switch: every pause the engine can raise
   between seasons is answered, an unknown one is nudged once. */
function step(s) {
  const e = engine;
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return e.stayAtClub(s);
    default: { const n = e.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

function runCareer(seed, { era = '2020-24', startYear = 2020, proSeasons = 10, ovr = 64 } = {}) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    let s = engine.initCareer(`Sim ${seed}`, 'England', position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    let guard = 0;
    const played = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    while (!s.retired && guard++ < 500 && played() < proSeasons) s = step(s);
    return s;
  } finally {
    Math.random = realRandom;
  }
}

/* The digest drops the two new fields and nothing else. Everything the engine
   writes into the state goes in, so a moved Math.random stream anywhere in a
   season shows up as a changed hash. */
const NEW_FIELDS = ['leagueFinish', 'leagueSize'];
function digest(s) {
  const json = JSON.stringify(s, (k, v) => (NEW_FIELDS.includes(k) ? undefined : v));
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}
const DIGEST_SEEDS = 16;
/* Recorded with --record on the untouched tree at origin/main 5f2622fd, before
   any line of this round existed, and twice to prove the digest is stable. */
const BASELINE = ['539858d7000e4591', 'e62cdae073abe906', 'da4789abe4543321', '92f21863034d5bce', '707970f71384bd3d', '5879c7a10fb90659', '1a9c7b940f5968e4', '69e1d33d413b0656', '8cdcb230d5724e65', '4ebd88d3d4b6a6a0', '48ca4ba73be9e9fe', '74d8b0a22eed6238', 'de756b5070df2302', '197b2357e2742487', '2dc97ee74f43440b', '6009b15056656286'];
if (RECORD) {
  const out = [];
  for (let i = 1; i <= DIGEST_SEEDS; i++) out.push(digest(runCareer(i)));
  console.log(JSON.stringify(out));
  process.exit(0);
}
