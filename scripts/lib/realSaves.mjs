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
 * Release AW closing pass (2026-10-11): Soccer Career's seed 2 is a veteran's
 * hub that holds an agent review, a national team comeback and an announced
 * farewell season, and its seed 3 is a transfer window with a brief filed
 * (see soccerVeteran and soccerWindow in the bundle below).
 *
 * Imported by a harness as a function; nothing is built at import time.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export const WRITERS = {
  '/soccer-career': { kind: 'serializer', file: 'src/pages/SoccerCareer.tsx', fn: 'serializeSoccerCareerSave' },
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
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave } from './src/lib/soccerCareerSave';
import * as PROG from './src/lib/soccerCareerProgramme';
import * as BRIEF from './src/lib/soccerCareerTransferBrief';
import * as AGENT from './src/lib/soccerAgentReview';
import * as INTL from './src/lib/soccerInternationalReturn';
import * as FARE from './src/lib/soccerCareerFarewell';
import * as PRESS from './src/lib/soccerCareerPress';
import { AGENTS } from './src/lib/soccerCareerLife';
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
import * as GLOG from './src/lib/gmGameLog';
import * as NFLGD from './src/lib/frontOfficeGameDay';
import * as NFLPOST from './src/lib/frontOfficePostseason';
import * as GPOST from './src/lib/gmPostseason';
import * as BRK from './src/lib/gmBracket';
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
  return serializeSoccerCareerSave(c);
};
/* Release AW closing pass (ruling C4). Four more parts of the Soccer Career save carry a version number one
   level down (transferBrief, agentReview, internationalReturn, farewellSeason) and no save above holds one:
   they are written late in a career or in the middle of a transfer window. Two more played saves, made by
   the calls the page itself makes:
     seed 2 of 4  a veteran's hub. The career is played until a hub from age 30 where the player has caps and
                  an agent; there he reviews his agent (changeCareerAgent), retires from his national team and
                  makes himself available again (retireFromInternational, makeInternationallyAvailable) and
                  announces his farewell season (announceFarewellSeason). Three parts on one save.
     seed 3 of 4  a transfer window. The career is played until a window whose situation takes a brief, and
                  a brief for minutes is filed (setTransferBrief, the call of AgentBrief.tsx). A brief only
                  lives inside its window, which is why it cannot sit on the hub save beside the other three.
   Each tries a bounded list of careers and throws when none gets there, so a fixture can never quietly lose
   its parts. */
const SOCCER_PART_TRIES = 60;
const soccerCareerFor = (seed, attempt) => SOC.initCareer(
  'Real Save ' + seed, NATIONS[(seed + attempt) % NATIONS.length], SOCCER_POS[(seed + attempt) % SOCCER_POS.length],
  'modern', flat(58), 58, 2020, SOC.FALLBACK_CLUBS, null, 86 + (attempt % 8),
);
const veteranParts = (c, clubs) => {
  if (!AGENT.agentReviewEligibility(c).available || !c.intStats || !(c.intStats.caps >= 1) || !FARE.farewellEligibility(c).eligible) return null;
  const target = AGENTS.find(agent => agent.id !== c.agentId);
  let s = target ? AGENT.changeCareerAgent(c, target.id) : c;
  if (!AGENT.readAgentReview(s)) return null;
  if (s.internationalCareer !== false || s.intStats.isRetired !== true) s = SOC.retireFromInternational(s);
  if (!INTL.internationalReturnEligibility(s).available) return null;
  s = INTL.makeInternationallyAvailable(s);
  if (!INTL.readInternationalReturn(s)) return null;
  s = SOC.announceFarewellSeason(s, clubs);
  if (!FARE.readSoccerFarewell(s) || !AGENT.readAgentReview(s) || !INTL.readInternationalReturn(s)) return null;
  /* Release AX: the Press room is a fifth part. The veteran answers for his last season once, the way the tile
     does (answerSoccerPress); a hub where the room is not open is passed over like any other that lacks a part. */
  s = PRESS.answerSoccerPress(s, 'accountable');
  if (!s.pressRoom || PRESS.pressRoomView(s).history.length !== 1) return null;
  return s;
};
const soccerVeteran = seed => {
  const clubs = SOC.FALLBACK_CLUBS;
  for (let attempt = 0; attempt < SOCCER_PART_TRIES; attempt += 1) {
    Math.random = mulberry32(seed * 1000 + 211 + attempt);
    let c = soccerCareerFor(seed, attempt);
    for (let g = 0; g < 2500 && !c.retired; g += 1) {
      if (c.phase === 'playing' && c.age >= 30) {
        const held = veteranParts(c, clubs);
        if (held) return serializeSoccerCareerSave(held);
      }
      c = careerStep(SOC, c, clubs);
    }
  }
  throw new Error('Soccer Career seed ' + seed + ': no career of ' + SOCCER_PART_TRIES + ' reached a hub from age 30 with caps and an agent, so the fixture holds no agentReview, internationalReturn and farewellSeason');
};
const soccerWindow = seed => {
  const clubs = SOC.FALLBACK_CLUBS;
  const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;
  for (let attempt = 0; attempt < SOCCER_PART_TRIES; attempt += 1) {
    Math.random = mulberry32(seed * 1000 + 733 + attempt);
    let c = soccerCareerFor(seed, attempt);
    for (let g = 0; g < 2500 && !c.retired; g += 1) {
      if (c.phase === 'transfer_window' && played(c) >= SOCCER_SEASONS) {
        const filed = BRIEF.setTransferBrief(c, 'minutes');
        if (filed !== c && BRIEF.readTransferBrief(filed, SOC.projectLeagueApps)) return serializeSoccerCareerSave(filed);
      }
      c = careerStep(SOC, c, clubs);
    }
  }
  throw new Error('Soccer Career seed ' + seed + ': no career of ' + SOCCER_PART_TRIES + ' reached a transfer window that takes a brief, so the fixture holds no transferBrief');
};
const soccerSave = seed => (seed % 4 === 2 ? soccerVeteran(seed) : seed % 4 === 3 ? soccerWindow(seed) : soccerPlayed(seed));
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
/* Round 1305: an NFL Front Office save after one played week, made by the calls the board's press makes, in the
   board's order: the injury pass, the computer clubs' moves, the week's games, each told by the football law, and
   his own game into the season's log (gameLog, one level down, with a version number: PART_VERSIONS of
   scripts/simSaveKeeper.mjs has its row). The GM desk is off, so the save holds no gm block. It throws when the
   log did not take his game, so the fixture can never quietly lose its part. */
const officePlayed = (league, myTeam, rng) => {
  FO.injuryPass(league.teams, rng);
  FO.aiWeeklyMoves(league, myTeam, rng);
  const told = league.schedule[league.week - 1].map(g => NFLGD.nflTell(FO.simGame(g, league.teams, rng), league.teams, league.season, NFLGD.nflWhere(league.week)));
  const mine = told.find(t => t.game.home === myTeam || t.game.away === myTeam);
  const gameLog = GLOG.addToGmGameLog(null, league.season, mine && mine.last ? [mine.last] : []);
  if (!gameLog || gameLog.games.length !== 1) throw new Error('NFL Front Office: the played week kept no game in the log, so the fixture holds no gameLog');
  league.week += 1;
  return JSON.stringify({ ...JSON.parse(office(league, myTeam)), gameLog });
};
/* Round 1309: an NFL Front Office save in the playoffs after one round, made by the calls the board makes: the
   seventeen weeks played and his games told into the log, then "Play Week 17" (the seeds frozen as the engine
   seeds them, the bracket opened, Week 18), then one round through nflPlayTie with his games of it in the log. The
   bracket is its own part with a version number (playoffs.v: PART_VERSIONS of scripts/simSaveKeeper.mjs has its
   row). It throws when the bracket played no round or the log took no playoff game of his. */
const officeInBracket = (league, rng) => {
  const told = [];
  const played = [];
  for (let w = 1; w <= FO.REGULAR_WEEKS; w += 1) {
    played.push(league.schedule[w - 1].map(g => NFLGD.nflTell(FO.simGame(g, league.teams, rng), league.teams, league.season, NFLGD.nflWhere(w))));
    if (w < FO.REGULAR_WEEKS) league.week += 1;
  }
  const seeds = NFLPOST.NFL_POSTSEASON.seeds(league);
  const myTeam = seeds[1];
  const format = NFLPOST.NFL_POSTSEASON.formatFor(league.season);
  league.week = FO.REGULAR_WEEKS + 1;
  const playoffs = BRK.playBracketWeek(format, BRK.openBracket(format, league.season, seeds), NFLPOST.nflPlayTie(league.teams, rng, league.season, undefined, told));
  const his = played.flatMap(week => week.filter(t => t.game.home === myTeam || t.game.away === myTeam).map(t => t.last)).filter(Boolean);
  const gameLog = GLOG.addToGmGameLog(GLOG.addToGmGameLog(null, league.season, his), league.season, told.filter(g => g.home === myTeam || g.away === myTeam));
  if (playoffs.played.length === 0 || !gameLog || gameLog.games.length !== his.length + 1) throw new Error('NFL Front Office: the bracket fixture played no round, or its log took no playoff game of his');
  return JSON.stringify({ ...JSON.parse(office(league, myTeam)), gameLog, playoffs });
};
const logOf = s => GLOG.readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam);

/** One real save of every game for one seed. rebuildClubs comes from scripts/data/rebuildSquads.json. */
export function makeSaves(seed, rebuildClubs) {
  const out = {};
  const realRandom = Math.random;
  Math.random = mulberry32(seed + 11);
  try {
    out['/soccer-career'] = soccerSave(seed);
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
  /* Round 1305: the odd seeds hold a played week, and with it a gameLog; the even seeds stay the start state. The
     played week draws from a stream of its own, so the leagues made below are the leagues they were. */
  const nflTeam = Object.keys(nfl.teams)[seed % Object.keys(nfl.teams).length];
  /* Round 1309: seed 3 (and every seed that is 3 in 4) holds a save in the playoffs after one round instead */
  out['/front-office'] = seed % 4 === 3 ? officeInBracket(nfl, mulberry32(seed + 1309)) : seed % 2 === 1 ? officePlayed(nfl, nflTeam, mulberry32(seed + 1305)) : office(nfl, nflTeam);
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
  '/soccer-career': raw => { try { return isSoccerCareerSave(parseSoccerCareerSave(raw)) === true; } catch { return false; } },
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
const parsed = (raw, fn) => { try { return fn(JSON.parse(raw)); } catch { return false; } };
const soccerParsed = (raw, fn) => { try { return fn(parseSoccerCareerSave(raw)); } catch { return false; } };
/* Round 1309: the NFL board's load of the playoffs, asked exactly as FrontOfficeBoard.tsx asks it */
const bracketLoad = s => GPOST.loadGmPostseason(NFLPOST.NFL_POSTSEASON, s.league, s.league.season, GPOST.inGmPostseason({
  period: s.league.week, phase: s.phase, seasonHasChampion: s.league.champions.some(c => c.season === s.league.season),
}, NFLPOST.NFL_POSTSEASON.bracketPeriod), s.playoffs);
/* Release AW closing pass (ruling C4): a route can hold a version number on several parts, so the readers are
   keyed by the part's path as PART_VERSIONS writes it. The four new parts export their readers. */
export const partReads = {
  '/soccer-career': {
    'programme.version': raw => soccerParsed(raw, s => PROG.programmeOptions(s).some(view => view.choice !== null)),
    'transferBrief.version': raw => soccerParsed(raw, s => BRIEF.readTransferBrief(s, SOC.projectLeagueApps) !== null),
    'agentReview.version': raw => soccerParsed(raw, s => AGENT.readAgentReview(s) !== null),
    'internationalReturn.version': raw => soccerParsed(raw, s => INTL.readInternationalReturn(s) !== null),
    'farewellSeason.version': raw => soccerParsed(raw, s => FARE.readSoccerFarewell(s) !== null),
    'pressRoom.version': raw => soccerParsed(raw, s => PRESS.pressRoomView(s).history.length > 0),
    'generatedBallonPool.version': raw => soccerParsed(raw, s => SOC.isGeneratedBallonPool(s.generatedBallonPool, s.seasons.at(-1).year)),
  },
  '/front-office': {
    'gameLog.v': raw => parsed(raw, s => logOf(s) !== null),
    /* Round 1309: the board's load hands the bracket back as it is (rebuilt null) only when it reads it */
    'playoffs.v': raw => parsed(raw, s => { const r = bracketLoad(s); return !!r && r.kind === 'bracket' && r.repair.rebuilt === null && r.repair.save === s.playoffs; }),
  },
  '/nfl-my-career': { 'prospect.v': prospectRead(NFL_CAREER_SPORT) },
  '/nba-my-career': { 'prospect.v': prospectRead(NBA_CAREER_SPORT) },
  '/mlb-my-career': { 'prospect.v': prospectRead(MLB_CAREER_SPORT) },
  '/nhl-my-career': { 'prospect.v': prospectRead(NHL_CAREER_SPORT) },
};

/**
 * What a row of PART_VERSIONS means by "absent" (the lead's ruling C3 of Release AW): a part the reader cannot
 * verify is read as if it were not there, and the next honest write of that part overwrites it. Each function
 * takes a real save whose part carries ANOTHER version number and answers null when the game does exactly that,
 * or the sentence that did not hold. The actions are the game's own (the calls the page makes).
 */
const sameAnswer = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const without = (s, key) => { const o = { ...s }; delete o[key]; return o; };
export const partAbsent = {
  '/soccer-career': {
    'transferBrief.version': raw => {
      const s = parseSoccerCareerSave(raw);
      if (BRIEF.readTransferBrief(s, SOC.projectLeagueApps) !== null) return 'the brief is still read';
      const next = BRIEF.setTransferBrief(s, 'level');
      if (next === s || !BRIEF.readTransferBrief(next, SOC.projectLeagueApps) || next.transferBrief.version !== 1) return 'a new brief did not overwrite the unreadable one';
      return null;
    },
    'agentReview.version': raw => {
      const s = parseSoccerCareerSave(raw);
      if (AGENT.readAgentReview(s) !== null) return 'the receipt is still read';
      const now = AGENT.agentReviewEligibility(s);
      if (!sameAnswer(now, AGENT.agentReviewEligibility(without(s, 'agentReview')))) return 'the review is not judged as on the same save without the part (' + now.reason + ')';
      if (!now.available) return 'the review stays closed (' + now.reason + ')';
      const target = AGENTS.find(agent => agent.id !== s.agentId);
      const next = AGENT.changeCareerAgent(s, target.id);
      if (next === s || !AGENT.readAgentReview(next)) return 'a new review did not overwrite the unreadable receipt';
      return null;
    },
    'internationalReturn.version': raw => {
      const s = parseSoccerCareerSave(raw);
      if (INTL.readInternationalReturn(s) !== null) return 'the receipt is still read';
      const now = INTL.internationalReturnEligibility(s);
      if (!sameAnswer(now, INTL.internationalReturnEligibility(without(s, 'internationalReturn')))) return 'the comeback is not judged as on the same save without the part (' + now.reason + ')';
      const again = SOC.retireFromInternational(s);
      const open = INTL.internationalReturnEligibility(again);
      if (!open.available) return 'after retiring from the national team again the comeback stays closed (' + open.reason + ')';
      const next = INTL.makeInternationallyAvailable(again);
      if (next === again || !INTL.readInternationalReturn(next)) return 'a new comeback did not overwrite the unreadable receipt';
      return null;
    },
    /* The farewell is judged as on the same save without the part, whatever the save's isFinalSeason flag
       says (the engine never ended a career by that flag, so it is no commitment to keep a card closed for):
       the card is offered again on this save, which still holds the flag the announcement set, and a new
       announcement overwrites the unreadable plan. */
    'farewellSeason.version': raw => {
      const s = parseSoccerCareerSave(raw);
      if (FARE.readSoccerFarewell(s) !== null) return 'the plan is still read';
      if (FARE.farewellSeasonComplete(s)) return 'an unreadable plan still completes a farewell season';
      if (s.isFinalSeason !== true) return 'the fixture did not keep the flag the announcement set';
      const now = FARE.farewellEligibility(s);
      if (!sameAnswer(now, FARE.farewellEligibility(without(s, 'farewellSeason')))) return 'the farewell is not judged as on the same save without the part (' + now.reason + ')';
      if (!now.eligible) return 'the card stays closed on a save that holds nothing but the flag of its unreadable plan (' + now.reason + ')';
      const next = FARE.announceSoccerFarewell(s);
      if (next === s || !FARE.readSoccerFarewell(next) || next.isFinalSeason !== true) return 'a new announcement did not overwrite the unreadable plan';
      return null;
    },
    /* Release AX: the Press room. With another number nothing is read out of the part, the room is judged as on
       the same save with the part taken out (no sentence about verifying holds it shut), and the next answer
       writes a fresh part with that one answer in it. */
    'pressRoom.version': raw => {
      const s = parseSoccerCareerSave(raw);
      const now = PRESS.pressRoomView(s);
      if (now.history.length !== 0 || now.credibility !== 50) return 'the part is still read';
      if (!sameAnswer(now, PRESS.pressRoomView(without(s, 'pressRoom')))) return 'the room is not judged as on the same save without the part (' + now.reason + ')';
      if (!now.eligible) return 'the room stays closed (' + now.reason + ')';
      const next = PRESS.answerSoccerPress(s, 'calm');
      if (next === s || !next.pressRoom || next.pressRoom.version !== 1 || PRESS.pressRoomView(next).history.length !== 1) return 'a new answer did not overwrite the unreadable part';
      return null;
    },
    /* Round 1318: the Ballon d'Or pool of generated rivals (Rounds 1280 to 1282). With another number the save
       still opens and the reader refuses the part; the next night, played by the passive player under one seed,
       is the night of the same save with the part taken out (the whole state and the draws; each night plays
       from its own parse, since a step changes the state it is handed), and it leaves a
       fresh pool of version 1 that reads. */
    'generatedBallonPool.version': raw => {
      const s = parseSoccerCareerSave(raw);
      if (!isSoccerCareerSave(s)) return 'the save no longer opens';
      if (SOC.isGeneratedBallonPool(s.generatedBallonPool, s.seasons.at(-1).year)) return 'the pool is still read';
      const night = start => {
        const real = Math.random, draw = mulberry32(1318);
        let draws = 0;
        Math.random = () => { draws += 1; return draw(); };
        try {
          let c = start;
          for (let g = 0; g < 400 && !c.retired; g += 1) {
            c = careerStep(SOC, c, SOC.FALLBACK_CLUBS);
            if (c.phase === 'ballon_dor' && c.pendingBallonDor) return { c, draws };
          }
          return null;
        } finally { Math.random = real; }
      };
      const a = night(parseSoccerCareerSave(raw)), b = night(without(parseSoccerCareerSave(raw), 'generatedBallonPool'));
      if (!a || !b) return 'no next night was reached';
      if (a.draws !== b.draws || !sameAnswer(without(a.c, 'generatedBallonPool'), without(b.c, 'generatedBallonPool'))
        || !sameAnswer(a.c.generatedBallonPool, b.c.generatedBallonPool)) return 'the next night is not the night of the same save without the part';
      const pool = a.c.generatedBallonPool;
      if (!pool || pool.version !== 1 || !SOC.isGeneratedBallonPool(pool, a.c.seasons.at(-1).year)) return 'the next night did not write a fresh readable pool over the unreadable part';
      return null;
    },
  },
  /* Round 1305. The NFL board reads the season's log through readGmGameLog and treats null as no log at all: the
     save still opens (a log never refuses a save), and the next press, handed no log, writes a fresh one that holds
     that week's game alone. The press below is the board's own order of calls; the real board is held to the same
     by src/components/front-office/FrontOfficeGameDay.test.tsx (its case "an unknown version"). */
  '/front-office': {
    'gameLog.v': raw => {
      const s = JSON.parse(raw);
      if (logOf(s) !== null) return 'the log is still read';
      if (isFrontOfficeSave(s, 'NFL', FO.REGULAR_WEEKS) !== true) return 'the save is refused, and a log must never refuse a save';
      const rng = mulberry32(1305);
      const lg = JSON.parse(JSON.stringify(s.league));
      FO.injuryPass(lg.teams, rng);
      FO.aiWeeklyMoves(lg, s.myTeam, rng);
      const told = lg.schedule[lg.week - 1].map(g => NFLGD.nflTell(FO.simGame(g, lg.teams, rng), lg.teams, lg.season, NFLGD.nflWhere(lg.week)));
      const mine = told.find(t => t.game.home === s.myTeam || t.game.away === s.myTeam);
      const next = GLOG.addToGmGameLog(logOf(s), lg.season, mine && mine.last ? [mine.last] : []);
      if (!next || next.v !== 1 || next.games.length !== 1 || logOf({ ...s, league: lg, gameLog: JSON.parse(JSON.stringify(next)) }) === null) return 'the next press did not write a fresh log of one game over the unreadable one';
      return null;
    },
    /* Round 1309. The NFL board reads the bracket through loadGmPostseason, which reads a block of another version as
       absent: in the playoffs that is a fresh unplayed bracket from the engine's own seeds with its feed line, the
       save loads, and the bracket written over it (version 1) is read as it is. The real board is held to the same
       by src/components/front-office/FrontOfficePostseason.test.tsx. */
    'playoffs.v': raw => {
      const s = JSON.parse(raw);
      if (isFrontOfficeSave(s, 'NFL', FO.REGULAR_WEEKS) !== true) return 'the save is refused, and a bracket of another version must never refuse a save';
      const r = bracketLoad(s);
      if (!r || r.kind !== 'bracket') return 'the load refused the save';
      if (r.repair.rebuilt !== 'fresh' || r.repair.line !== BRK.BRACKET_REBUILT_LINES.fresh) return 'the bracket was not started again from the final standings with its feed line';
      if (r.repair.save.v !== 1 || r.repair.save.played.length !== 0) return 'the bracket started again is not an unplayed bracket of version 1';
      const next = BRK.playBracketWeek(r.format, r.repair.save, NFLPOST.nflPlayTie(JSON.parse(JSON.stringify(s.league.teams)), mulberry32(1309), s.league.season, undefined, []));
      if (next.played.length === 0) return 'the bracket started again cannot be played';
      const again = bracketLoad({ ...s, playoffs: JSON.parse(JSON.stringify(next)) });
      if (!again || again.kind !== 'bracket' || again.repair.rebuilt !== null) return 'the bracket written over it is not read as it is';
      return null;
    },
  },
};
`;

/**
 * Bundles the engines once (esbuild, into `tmpDir`) and returns:
 *   fleet    { '/route': [raw save, one per seed] } for all 21 games
 *   accepts  { '/route': raw => boolean } for the games with a pure loader
 *   partReads { '/route': { 'part.path': raw => boolean } } for the games that keep a version number on a part of the save
 *   partAbsent { '/route': { 'part.path': raw => null | string } } for the parts a reader treats as absent when it cannot verify them
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
  return { fleet, accepts: mod.accepts, partReads: mod.partReads, partAbsent: mod.partAbsent };
}
