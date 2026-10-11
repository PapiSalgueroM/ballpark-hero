/**
 * Round 1219: a real save of every long game, made at run time.
 *
 * The 21 games of src/data/continueSaves.ts each get saves built by the
 * game's own engine and wrapped the way the game's own writer wraps them.
 * Nothing here is a committed JSON: a committed save goes stale the day a
 * shape moves, and then every proof built on it is about last month's game.
 *
 * WHAT "REAL" MEANS, per game (WRITERS below says which):
 *   serializer  the engine exports the function its hook writes with, and the
 *               fixture is that function's output.
 *   engine      the engine itself writes storage (Club Manager's saveCareer,
 *               Rebuild's writeRebuildSave). The fixture is what that writer
 *               left in a stub storage, so it is the writer's bytes exactly.
 *   whole       the writer stringifies the engine's state object as it is.
 *   literal     the writer is an object literal typed inside a board. The
 *               engine state inside it is real; the board's own fields (a
 *               phase, counters, nulls) hold the board's opening values as
 *               read on 2026-10-10. scripts/simSaveKeeper.mjs section 0 reads
 *               the writer's literal on the TypeScript tree and fails when
 *               the fixture's top level keys are not that literal's.
 *
 * `unset` names literal keys a fresh save does not carry, with the reason.
 * `indirect` marks a writer whose setItem does not name the key itself (the
 * key arrives through a binding): the harness holds the anchors named there.
 *
 * PLAYED, NOT JUST STARTED (Release AU fix pass, 2026-10-10). Soccer Career
 * and the four US careers are played before they are saved (see soccerPlayed
 * and usCareer in the bundle below), because a save's optional parts, and the
 * version numbers two of those parts carry, only exist on a save that has been
 * played. Seeds 0 and 1, the pair the browser walk plants, are played hub
 * saves in every game; a US career's seeds 2 and 3 are the road to the draft.
 *
 * Imported by a harness as a function; nothing is built at import time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const WRITERS = {
  '/soccer-career': { kind: 'whole', file: 'src/pages/SoccerCareer.tsx' },
  '/club-manager': { kind: 'engine', file: 'src/lib/clubManager.ts', fn: 'saveCareer' },
  '/stadium-tycoon': { kind: 'serializer', file: 'src/hooks/useStadiumTycoon.ts', fn: 'serializeTycoon' },
  '/wonderkid-factory': { kind: 'serializer', file: 'src/hooks/useWonderkidFactory.ts', fn: 'serialize' },
  '/rebuild': { kind: 'engine', file: 'src/lib/rebuildSave.ts', fn: 'writeRebuildSave' },
  '/front-office': { kind: 'literal', file: 'src/components/front-office/FrontOfficeBoard.tsx' },
  '/nfl-my-career': { kind: 'literal', file: 'src/components/us-career/UsCareerBoard.tsx', indirect: ['saveValue(JSON.stringify(', 'localStorage.setItem(pending.key, pending.value)'] },
  '/cfb-dynasty': { kind: 'literal', file: 'src/components/cfb-dynasty/CfbDynastyBoard.tsx', indirect: ['encodeSave:'], unset: { postseason: 'only written from the recap screen (SaveShape, Round 426 part three)' } },
  '/cbb-dynasty': { kind: 'literal', file: 'src/components/cbb-dynasty/CbbDynastyBoard.tsx', indirect: ['encodeSave:'], unset: { march: 'only written from the recap screen (SaveShape, Round 823)' } },
  '/nba-front-office': { kind: 'literal', file: 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx' },
  '/nba-my-career': { kind: 'literal', file: 'src/components/us-career/UsCareerBoard.tsx', indirect: ['saveValue(JSON.stringify(', 'localStorage.setItem(pending.key, pending.value)'] },
  '/mlb-my-career': { kind: 'literal', file: 'src/components/us-career/UsCareerBoard.tsx', indirect: ['saveValue(JSON.stringify(', 'localStorage.setItem(pending.key, pending.value)'] },
  '/mlb-front-office': { kind: 'literal', file: 'src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', unset: { draftBatchesLeft: 'written as undefined outside a draft, which JSON drops' } },
  '/nhl-my-career': { kind: 'literal', file: 'src/components/us-career/UsCareerBoard.tsx', indirect: ['saveValue(JSON.stringify(', 'localStorage.setItem(pending.key, pending.value)'] },
  '/nhl-front-office': { kind: 'literal', file: 'src/components/nhl-front-office/NhlFrontOfficeBoard.tsx' },
  '/aussie-rules-manager': { kind: 'whole', file: 'src/hooks/useAussieRulesLeague.ts' },
  '/fight-career': { kind: 'literal', file: 'src/components/fight-career/FightCareerBoard.tsx', unset: { offerId: 'only set while a camp is being run for one fight (SaveShape, Round 916)' } },
  '/fight-promoter': { kind: 'literal', file: 'src/components/fight-promoter/FightPromoterBoard.tsx' },
  '/fight-gym': { kind: 'literal', file: 'src/components/fight-gym/FightGymBoard.tsx' },
  '/hall-of-champions': { kind: 'serializer', file: 'src/hooks/useHallOfChampions.ts', fn: 'serialize' },
  '/idle-arena': { kind: 'serializer', file: 'src/hooks/useIdleArena.ts', fn: 'serialize' },
};

/* The games whose engine exports a pure check of a stored save. */
export const PURE_LOADERS = ['/soccer-career', '/stadium-tycoon', '/wonderkid-factory', '/rebuild', '/front-office', '/nhl-front-office', '/aussie-rules-manager', '/hall-of-champions', '/idle-arena', '/club-manager'];

const ENTRY = `
import * as SOC from './src/lib/soccerCareerEngine';
import { isSoccerCareerSave } from './src/lib/soccerCareerSave';
import * as PROG from './src/lib/soccerCareerProgramme';
import { careerStep } from './scripts/lib/careerStep.mjs';
import * as USP from './src/lib/usCareerProgramme';
import { createUsCareerProspect, loadUsCareerProspect } from './src/lib/usCareerProspect';
import { defaultAppearance } from './src/lib/soccerCareerAppearance';
import { NFL_CAREER_SPORT } from './src/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport';
import * as CM from './src/lib/clubManager';
import * as ST from './src/lib/stadiumTycoon';
import * as WF from './src/lib/wonderkidFactory';
import * as RBT from './src/lib/rebuildTable';
import * as RBS from './src/lib/rebuildSave';
import * as FO from './src/lib/frontOffice';
import * as NBAFO from './src/lib/nbaFrontOffice';
import * as MLBFO from './src/lib/mlbFrontOffice';
import * as NHLFO from './src/lib/nhlFrontOffice';
import { isFrontOfficeSave } from './src/lib/frontOfficeSave';
import * as CFB from './src/lib/cfbDynasty';
import * as CBB from './src/lib/cbbDynasty';
import * as ARL from './src/lib/aussieRulesLeague';
import * as FC from './src/lib/fightCareer';
import * as FG from './src/lib/fightGym';
import * as FP from './src/lib/fightPromoter';
import * as HC from './src/lib/hallOfChampions';
import * as IA from './src/lib/idleArena';

const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const NATIONS = ['England', 'Spain', 'France', 'Brazil', 'Germany', 'Argentina', 'Portugal', 'Italy'];
const SOCCER_POS = ['ST', 'CM', 'CB', 'LW', 'GK', 'CAM', 'RB', 'CDM'];
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const CM_CLUBS = ['Real Madrid', 'Everton', 'Lincoln City', 'Brentford'];
const NOW = 1760000000000;
const store = globalThis.__realSavesStore;
const written = key => { const v = store.get(key); if (typeof v !== 'string') throw new Error('the engine writer left nothing at ' + key); return v; };
/* Release AU fix pass (ruling R5): a start state is a save no player holds
   after his first hour, and a check that only reads start states cannot see
   what a played save gains. So the careers are PLAYED, by the calls their own
   pages make, with the plans and the roads this head can write:
     Soccer Career   played until two pro seasons are on the save and the hub
                     offers a tactical role, then one season plan chosen
                     through chooseProgramme (state.programme, with its
                     version; cup runs and chance wheels as the seasons left
                     them).
     the US careers  seeds 0 and 1: two seasons in the board's own order (plan,
                     camp, prepare, season, restore, progress, settle), then a
                     plan held for the third (c.programme, c.programmeResults,
                     c.programmePartnership). Seeds 2 and 3: the FIRST save a
                     new career writes, the road to the draft
                     (phase 'prospect', with prospect.v). */
const SOCCER_SEASONS = 2;
const soccerPlayed = seed => {
  const clubs = SOC.FALLBACK_CLUBS;
  const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;
  let c = SOC.initCareer(
    'Real Save ' + seed, NATIONS[seed % NATIONS.length], SOCCER_POS[seed % SOCCER_POS.length],
    'modern', flat(58), 58, 2020, clubs, null, 76 + (seed % 14),
  );
  let pick = null;
  for (let g = 0; g < 900 && !c.retired; g += 1) {
    if (c.phase === 'playing' && played(c) >= SOCCER_SEASONS) {
      const view = PROG.programmeOptions(c).find(o => o.id === 'tactics');
      pick = view ? (view.choices.find(x => x.eligible) || null) : null;
      if (pick) break;
    }
    c = careerStep(SOC, c, clubs);
  }
  if (!pick) throw new Error('Soccer Career seed ' + seed + ' never reached a hub that offers a tactical role (phase ' + c.phase + ', ' + played(c) + ' seasons played)');
  c = PROG.chooseProgramme(c, 'tactics', pick.id);
  if (!c.programme || !c.programme.plan) throw new Error('Soccer Career seed ' + seed + ': chooseProgramme did not keep the plan on the save');
  return JSON.stringify(c);
};
const US_SEASONS = 2;
const usPick = (sport, seed) => {
  const pos = sport.create.positions[seed % sport.create.positions.length];
  const list = sport.create.archetypes[pos];
  return { pos, arch: list[seed % list.length] };
};
const usPlayed = (sport, seed) => {
  const { pos, arch } = usPick(sport, seed);
  const rng = mulberry32(seed + 1);
  let c = sport.startCareer('Real Save ' + seed, pos, arch, rng, null, sport.create.eras[0].id);
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  const plan = more => USP.saveUsCareerProgramme(c, sport.slug, { ...USP.usProgrammeDefaults(), ...more });
  for (let n = 0; n < US_SEASONS; n += 1) {
    /* A career that leaves the plain road (retired, suspended, out of contract) stops here with what it has played. */
    if (c.retired || (c.suspendedSeasons ?? 0) > 0 || c.contractYears <= 0) break;
    c = plan({ workload: 'push', expectation: 'steady', partnership: 'build' });
    sport.campBattle(c, tq, rng);
    const prepared = USP.prepareUsCareerProgramme(c, sport.slug);
    const { line } = sport.simSeason(c, tq, rng);
    USP.restoreUsCareerProgramme(c, prepared);
    sport.progress(c, rng);
    /* The board settles after progress too; a player moved on in between keeps no result for that year. */
    USP.settleUsCareerProgramme(c, line, sport.slug, prepared);
    tq = sport.rollTeamQuality(tq, rng);
  }
  USP.expireUsCareerProgramme(c);
  c = plan({ workload: 'recover', bonus: 'steady' });
  if (!c.programme || !Array.isArray(c.programmeResults) || c.programmeResults.length < 1 || c.seasons.length < 1) throw new Error(sport.slug + ' seed ' + seed + ': the played save holds no plan, no settled plan or no season (' + c.seasons.length + ' seasons played)');
  return JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
};
const usProspect = (sport, seed) => {
  const { pos, arch } = usPick(sport, seed);
  const prospect = createUsCareerProspect(sport, { name: 'Real Save ' + seed, pos, archetypeId: arch.id, eraId: sport.create.eras[0].id, appearance: defaultAppearance(), seed: sport.slug + ':real' + seed });
  return JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect });
};
const usCareer = (sport, seed) => {
  const keep = Math.random;
  Math.random = mulberry32(seed + 31);
  try { return seed % 4 < 2 ? usPlayed(sport, seed) : usProspect(sport, seed); } finally { Math.random = keep; }
};
const office = (league, myTeam) => JSON.stringify({
  league, myTeam, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
  mandate: null, trust: 50, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null,
});

/** One real save of every game for one seed. rebuildClubs comes from scripts/data/rebuildSquads.json. */
export function makeSaves(seed, rebuildClubs) {
  const out = {};
  const realRandom = Math.random;
  Math.random = mulberry32(seed + 11);
  try {
    out['/soccer-career'] = soccerPlayed(seed);
    /* Club Manager draws from its own stream, so the length of the career above cannot move it. */
    Math.random = mulberry32(seed + 12);
    store.clear();
    if (CM.saveCareer(CM.startCareer(CM_CLUBS[seed % CM_CLUBS.length])) !== true) throw new Error('saveCareer answered false');
    out['/club-manager'] = written('dukb-club-manager-save');
  } finally {
    Math.random = realRandom;
  }
  out['/stadium-tycoon'] = ST.serializeTycoon(ST.newTycoon(NOW + seed), NOW + seed);
  out['/wonderkid-factory'] = WF.serialize(WF.newFactory(NOW + seed, seed + 7));
  store.clear();
  /* The human seat picks a club (the CPU seat then draws its own): the first moment Rebuild has something to save. */
  const table = RBT.pickClub(RBT.createTable(seed % 2 ? ['human', 'cpu'] : ['human'], seed + 3), rebuildClubs[seed % rebuildClubs.length], rebuildClubs);
  const save = RBS.toSave({ table, moves: table.seats.map(() => []) }, 'none');
  if (!save) throw new Error('Rebuild had nothing to save after the clubs were drawn');
  RBS.writeRebuildSave(save);
  out['/rebuild'] = written('rebuild-table');
  const rng = mulberry32(seed + 21);
  const nfl = FO.initLeague(rng);
  out['/front-office'] = office(nfl, Object.keys(nfl.teams)[seed % Object.keys(nfl.teams).length]);
  const nba = NBAFO.initNbaLeague(rng);
  out['/nba-front-office'] = office(nba, Object.keys(nba.teams)[seed % Object.keys(nba.teams).length]);
  const mlb = MLBFO.initMlbLeague(rng);
  out['/mlb-front-office'] = office(mlb, Object.keys(mlb.teams)[seed % Object.keys(mlb.teams).length]);
  const nhl = NHLFO.initNhlLeague(rng);
  out['/nhl-front-office'] = office(nhl, Object.keys(nhl.teams)[seed % Object.keys(nhl.teams).length]);
  out['/nfl-my-career'] = usCareer(NFL_CAREER_SPORT, seed);
  out['/nba-my-career'] = usCareer(NBA_CAREER_SPORT, seed);
  out['/mlb-my-career'] = usCareer(MLB_CAREER_SPORT, seed);
  out['/nhl-my-career'] = usCareer(NHL_CAREER_SPORT, seed);
  out['/cfb-dynasty'] = JSON.stringify({ st: CFB.initCfb(CFB.CFB_SCHOOLS[seed % CFB.CFB_SCHOOLS.length].id, rng), phase: 'season', recruits: null, portal: null });
  out['/cbb-dynasty'] = JSON.stringify({ st: CBB.initCbb(CBB.CBB_SCHOOLS[seed % CBB.CBB_SCHOOLS.length].id, rng), phase: 'season', recruits: null, portal: null });
  const league = ARL.createLeague(seed + 7, 'club-00');
  if (!league) throw new Error('createLeague refused club-00');
  out['/aussie-rules-manager'] = JSON.stringify(league);
  out['/fight-career'] = JSON.stringify({ st: FC.newFightCareer('Real Save ' + seed, 'welter', 'slugger', 'real' + seed), phase: 'hub' });
  out['/fight-promoter'] = JSON.stringify({ st: FP.newPromoter('Real Shows ' + seed, 'real' + seed) });
  out['/fight-gym'] = JSON.stringify({ g: FG.newGym('Real Gym ' + seed, 'real' + seed) });
  out['/hall-of-champions'] = HC.serialize(HC.freshState(seed + 7), NOW + seed);
  out['/idle-arena'] = IA.serialize(IA.newState(NOW + seed));
  return out;
}

/** The game's own pure check of a stored save, where it exports one: true when the game would open it. */
export const accepts = {
  '/soccer-career': raw => { try { return isSoccerCareerSave(JSON.parse(raw)) === true; } catch { return false; } },
  '/stadium-tycoon': raw => ST.deserializeTycoon(raw, NOW + 60000) !== null,
  '/wonderkid-factory': raw => WF.deserialize(raw, NOW + 60000) !== null,
  '/rebuild': raw => RBS.parseRebuildSave(raw) !== null,
  '/front-office': raw => { try { return isFrontOfficeSave(JSON.parse(raw), 'NFL', FO.REGULAR_WEEKS) === true; } catch { return false; } },
  '/nhl-front-office': raw => { try { return isFrontOfficeSave(JSON.parse(raw), 'NHL', NHLFO.NHL_FO_ROUNDS) === true; } catch { return false; } },
  '/aussie-rules-manager': raw => ARL.readLeagueSave(raw) !== null,
  '/hall-of-champions': raw => HC.loadSave(raw) !== null,
  '/idle-arena': raw => IA.loadSave(raw, NOW + 60000) !== null,
  /* Club Manager's loader reads storage itself, so it is handed the save through the stub. */
  '/club-manager': raw => { store.clear(); store.set('dukb-club-manager-save', raw); try { return CM.loadCareer() !== null; } finally { store.clear(); } },
};

/**
 * A version number on a PART of a save (scripts/simSaveKeeper.mjs, PART_VERSIONS): true when the game's own reader
 * of that part still reads it. Soccer Career's reader is not exported, so its answer is read off the hub: the plan
 * the save holds is still the plan the hub shows.
 */
const prospectRead = sport => raw => { try { return loadUsCareerProspect(sport, JSON.parse(raw).prospect) !== null; } catch { return false; } };
export const partReads = {
  '/soccer-career': raw => { try { return PROG.programmeOptions(JSON.parse(raw)).some(view => view.choice !== null); } catch { return false; } },
  '/nfl-my-career': prospectRead(NFL_CAREER_SPORT),
  '/nba-my-career': prospectRead(NBA_CAREER_SPORT),
  '/mlb-my-career': prospectRead(MLB_CAREER_SPORT),
  '/nhl-my-career': prospectRead(NHL_CAREER_SPORT),
};
`;

/**
 * Bundles the engines once (esbuild, into `tmpDir`) and returns:
 *   fleet    { '/route': [raw save, one per seed] } for all 21 games
 *   accepts  { '/route': raw => boolean } for the games with a pure loader
 *   partReads { '/route': raw => boolean } for the games that keep a version number on a part of the save
 * Throws when an engine refuses to start; a caller prints and exits.
 */
export async function buildRealSaves({ root, tmpDir, seeds = [0, 1, 2, 3] }) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const outfile = path.join(tmpDir, 'realSaves.bundle.mjs');
  await build({
    stdin: { contents: ENTRY, resolveDir: root, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error',
    alias: { '@': path.join(root, 'src') },
    define: { 'process.env.NODE_ENV': '"production"' },
    /* The stub storage exists before any engine module runs. */
    banner: {
      js: 'globalThis.__realSavesStore = new Map(); Object.defineProperty(globalThis, "localStorage", { configurable: true, writable: true, value: { getItem: k => (globalThis.__realSavesStore.has(k) ? globalThis.__realSavesStore.get(k) : null), setItem: (k, v) => { globalThis.__realSavesStore.set(k, String(v)); }, removeItem: k => { globalThis.__realSavesStore.delete(k); }, clear: () => { globalThis.__realSavesStore.clear(); }, key: i => [...globalThis.__realSavesStore.keys()][i] ?? null, get length() { return globalThis.__realSavesStore.size; } } });',
    },
  });
  const mod = await import(pathToFileURL(outfile).href);
  const squads = JSON.parse(fs.readFileSync(path.join(root, 'scripts/data/rebuildSquads.json'), 'utf8'));
  const rebuildClubs = squads.clubs.map(c => ({ club: c.club, tier: c.tier, squadSize: c.squad.length, squadValueM: 0 }));
  const fleet = {};
  for (const seed of seeds) {
    const one = mod.makeSaves(seed, rebuildClubs);
    for (const [route, raw] of Object.entries(one)) (fleet[route] ??= []).push(raw);
  }
  return { fleet, accepts: mod.accepts, partReads: mod.partReads };
}
