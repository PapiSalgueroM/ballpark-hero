/**
 * Round 1115 harness: the dressing room, a squad for every club and season.
 *
 * The Squad tile on Soccer Career shows a squad and his place in it for any
 * club in any year. It is DISPLAY ONLY, so the questions here are: is it
 * honest about what is real, is it the same every time, does it agree with
 * the games the engine really hands out, and does it change nothing.
 *
 * THE FLEET IS PLAYED ONCE AND RECORDED. advanceProSeason changes the object
 * it is handed (the phone moves on every call), so a list of live states
 * drifts. Before every pro season this records a SLIM save as JSON strings
 * holding only what the readers read (a few scalars, the phone's standing,
 * the season rows kept once per career) and, after it, the row the engine
 * wrote. Every section and every control reads that recording. The slim
 * save is proven against the full one as it is taken.
 *
 * Trust reads the phone as it stands on the hub; the engine draws after that
 * summer's texts arrive, so the two swings differ in some seasons. That is
 * why the screen says "about", and why section 9 holds a mean, not a match.
 *
 * Run:   node scripts/simCareerSquad.mjs            the gate (200 careers an era, long: detach it)
 *        node scripts/simCareerSquad.mjs 40         the quick loop (floors printed, not asserted)
 *        SEED=3 node scripts/simCareerSquad.mjs     another seed
 *
 * MEASURED TABLE AND FLOORS: see the block above FLOORS below.
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
/* found by walk up, so the harness runs from a worktree as well as the main tree */
const NM = path.dirname(path.dirname(require.resolve('react/package.json'))).replaceAll('\\', '/');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'careersquad-'));
const SIZE = Number(process.argv[2]) || 200;
const QUICK = SIZE < 200;
const SEED = Number(process.env.SEED) || 1;
const ONLY_CONTROL = process.env.CAREER_SQUAD_CONTROL || '';

let checks = 0;
let failed = 0;
const failures = [];
/* While a control is being judged, failures land in the sink (by section)
   and nothing is printed or counted. */
let sink = null;
const say = (...a) => { if (!sink) console.log(...a); };
function check(section, ok, what) {
  if (sink) { if (!ok) sink.add(section); return ok; }
  checks += 1;
  if (ok) return true;
  failed += 1;
  failures.push(`[${section}] ${what}`);
  console.log(`   FAIL [${section}] ${what}`);
  return false;
}
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f1 = n => (Number.isFinite(n) ? n.toFixed(2) : 'n/a');

/* ── the bundle ─────────────────────────────────────────────────────────── */
const ENTRY = path.join(WORK, 'entry.mjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT_URL}/src/lib/soccerClubSquad.ts');
export const sheet = await import('${ROOT_URL}/src/lib/soccerClubSquadSheet.ts');
export const gen = await import('${ROOT_URL}/src/lib/soccerClubSquadGen.ts');
export const data = await import('${ROOT_URL}/src/data/clubSquads.ts');
export const engine = await import('${ROOT_URL}/src/lib/soccerCareerEngine.ts');
export const intl = await import('${ROOT_URL}/src/lib/intlNames.ts');
export const phone = await import('${ROOT_URL}/src/lib/soccerPhone.ts');
export const international = await import('${ROOT_URL}/src/lib/soccerInternational.ts');
export const tile = await import('${ROOT_URL}/src/components/soccer-career/SquadTile.tsx');
export const sheetUi = await import('${ROOT_URL}/src/components/soccer-career/SquadSheet.tsx');
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
const built = await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', write: false,
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [NM], logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
const BUNDLE = built.outputFiles[0].text;
let copies = 0;
async function load(text) {
  copies += 1;
  const file = path.join(WORK, `bundle-${copies}.mjs`);
  fs.writeFileSync(file, text);
  return import(pathToFileURL(file).href);
}
const MAIN = await load(BUNDLE);

/* ── the fleet ──────────────────────────────────────────────────────────── */
const ERAS = [
  ['1990-94', 1990], ['1995-99', 1995], ['2000-04', 2000], ['2005-09', 2005],
  ['2010-14', 2010], ['2015-19', 2015], ['2020-24', 2020], ['2025', 2025],
];
const NATIONS = ['England', 'Brazil', 'Japan', 'Nigeria', 'Spain', 'Argentina'];
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB', 'CAM'];
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every offer on the table in this state, whatever the phase calls them. */
function offersOf(s) {
  if (s.phase === 'contract_offer') return s.pendingOffers || [];
  if (s.phase !== 'transfer_window' || !s.transferSituation) return [];
  const t = s.transferSituation;
  if (t.type === 'one_offer' || t.type === 'dream_club') return [t.offer];
  if (t.type === 'bidding_war') return [t.offerA, t.offerB];
  if (t.type === 'contract_expiry' || t.type === 'frozen_out') return t.offers || [];
  if (t.type === 'request_result') return t.offer ? [t.offer] : [];
  return [];
}

/** One step of a career that takes the first offer and never answers its phone. */
function step(engine, s, clubs, unknown) {
  if (s.phase === 'rehab_choice') return engine.applyRehabChoice(s, 1);
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, clubs);
    case 'contract_offer': {
      const offers = s.pendingOffers || [];
      if (!offers.length) { s.phase = 'playing'; return s; }
      return engine.acceptOffer(s, offers[0]);
    }
    case 'playing': return engine.advanceProSeason(s, clubs);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, clubs);
    case 'random_events': {
      if (!s.pendingEvents || !s.pendingEvents[0]) { s.pendingEvents = []; s.phase = 'playing'; return s; }
      return engine.applyEventChoice(s, 0, clubs);
    }
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, clubs);
    case 'international_debut': return engine.dismissDebut(s, clubs);
    case 'world_cup': return engine.dismissWorldCup(s, clubs);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return engine.dismissBallonDor(s, clubs);
    case 'retirement_suggestion':
      /* play on into the decline, where a man loses his place: until 36 */
      return s.age < 36 ? engine.declineRetirementSuggestion(s, clubs) : engine.acceptRetirementSuggestion(s);
    case 'transfer_window': {
      const sit = s.transferSituation;
      if (sit && sit.type === 'one_offer') return engine.acceptOffer(s, sit.offer);
      if (sit && sit.type === 'frozen_out' && sit.offers.length) {
        const o = sit.offers[0];
        return o.isLoan ? engine.acceptLoan(s, o) : engine.acceptOffer(s, o);
      }
      return engine.stayAtClub(s, clubs);
    }
    default:
      unknown[s.phase] = (unknown[s.phase] || 0) + 1;
      s.retired = true;
      return s;
  }
}

/**
 * Plays `size` careers in every era from one seed. `hooks.preSeason(s, ctx)`
 * runs just before every pro season, `hooks.postSeason(s, ctx)` just after,
 * `hooks.offers(s, offers, ctx)` whenever offers are on the table and
 * `hooks.done(s, ctx)` when the career ends.
 */
function playFleet(mods, size, seed, hooks) {
  const { engine } = mods;
  const clubs = engine.FALLBACK_CLUBS;
  const unknown = {};
  let id = 0;
  seedRandom(seed * 0x9e3779b1);
  for (let e = 0; e < ERAS.length; e += 1) {
    for (let c = 0; c < size; c += 1) {
      const ovr = 45 + (c % 28);
      let s = engine.initCareer(`Squad ${e} ${c}`, NATIONS[c % NATIONS.length], POSITIONS[c % POSITIONS.length],
        ERAS[e][0], stats(ovr), ovr, ERAS[e][1], clubs, null);
      const ctx = { era: e, id, k: 0 };
      let guard = 0;
      while (!s.retired && s.age < 40 && guard < 600) {
        guard += 1;
        const offers = offersOf(s);
        if (offers.length && hooks.offers) hooks.offers(s, offers, ctx);
        const pro = s.phase === 'playing';
        if (pro && hooks.preSeason) hooks.preSeason(s, ctx);
        s = step(engine, s, clubs, unknown);
        if (pro) { if (hooks.postSeason) hooks.postSeason(s, ctx); ctx.k += 1; }
      }
      if (hooks.done) hooks.done(s, ctx);
      id += 1;
    }
  }
  Math.random = realRandom;
  return { careers: id, unknown };
}

/* ── the slim save ──────────────────────────────────────────────────────── */
const SCALARS = ['playerName', 'position', 'overall', 'currentClub', 'currentClubCountry', 'currentClubTier',
  'frozenOut', 'isClubCaptain', 'phase', 'retired', 'nationality'];
const ROW_FIELDS = ['year', 'age', 'club', 'clubCountry', 'clubTier', 'type', 'apps', 'leagueApps', 'ovr',
  'injury', 'injuryWeeks', 'onLoanFrom', 'rating'];
const pick = (o, keys) => { const out = {}; for (const k of keys) if (o[k] !== undefined) out[k] = o[k]; return out; };
const slimPhone = p => (p && Array.isArray(p.threads) ? { threads: p.threads.map(t => ({ rel: t.rel })) } : undefined);

/** The save a reader sees, rebuilt from the recording. */
function rebuild(rec, R) {
  const s = JSON.parse(rec.scal);
  if (rec.phone) s.phone = JSON.parse(rec.phone);
  s.seasons = R.rows[rec.id].slice(0, rec.n).map(j => JSON.parse(j));
  return s;
}

/** What the readers say about a save, as plain values. */
function reading(mods, s) {
  const v = mods.lib.squadView(s);
  const last = mods.sheet.lastSeason(s);
  return JSON.stringify([v, last]);
}

function record(mods, size, seed) {
  const R = { seasons: [], rows: [], offers: [], careers: 0, proven: 0, bytes: 0, unknown: {}, ended: [] };
  let open = null;
  const out = playFleet(mods, size, seed, {
    preSeason(s, ctx) {
      const rows = R.rows[ctx.id] || (R.rows[ctx.id] = []);
      for (let i = rows.length; i < s.seasons.length; i += 1) rows.push(JSON.stringify(pick(s.seasons[i], ROW_FIELDS)));
      const phone = slimPhone(s.phone);
      open = { era: ctx.era, id: ctx.id, k: ctx.k, n: s.seasons.length, age: s.age,
        scal: JSON.stringify(pick(s, SCALARS)), phone: phone ? JSON.stringify(phone) : '', after: null };
      R.bytes += open.scal.length + open.phone.length;
      /* the slim save must read exactly as the full save does: the first 300 and then every 20th */
      if (R.seasons.length < 300 || R.seasons.length % 20 === 0) {
        const full = reading(mods, JSON.parse(JSON.stringify(s)));
        const slim = reading(mods, rebuild(open, R));
        check('record', full === slim, `season ${R.seasons.length}: the slim save reads differently from the full save`);
        R.proven += 1;
      }
      R.seasons.push(open);
    },
    postSeason(s) {
      const row = s.seasons[s.seasons.length - 1];
      if (open && row && row.type === 'playing' && s.seasons.length > open.n && row.leagueApps !== undefined) {
        open.after = pick(row, ['leagueApps', 'apps', 'ovr', 'clubTier', 'club', 'year']);
      }
      open = null;
    },
    offers(s, offers) {
      for (const o of offers) {
        const fit = mods.sheet.offerFit(s, o);
        R.offers.push(fit ? [fit.rank, fit.groupSize, fit.source] : null);
      }
    },
    done(s) { R.ended.push(s.seasons.length); },
  });
  for (const rows of R.rows) if (rows) for (const j of rows) R.bytes += j.length;
  R.careers = out.careers;
  R.unknown = out.unknown;
  return R;
}

/* ── one pass over the recording with a given copy of the code ──────────── */
/* The harness's OWN copy of the verified window: the data file must agree. */
const WINDOW = { first: 2016, last: 2026 };

function realNameSet(mods) {
  const set = new Set();
  for (const blob of Object.values(mods.data.CLUB_SQUADS)) for (const e of blob.split(',')) set.add(e.split(':')[0]);
  return set;
}

/**
 * Reads every recorded season with `mods` and returns one small summary a
 * season plus the counters sections 4, 5 and 7 are judged on. Nothing here
 * asserts: the sections do, so a control can be judged on the same numbers.
 */
function scan(mods, R) {
  const { lib, sheet, gen, intl } = mods;
  const real = realNameSet(mods);
  const pool = intl.allIntlNames();
  const famOf = new Map();
  { let at = 0; for (const f of intl.NAME_FAMILIES) { const n = f.firsts.length * f.lasts.length; famOf.set(f.id, new Set(pool.slice(at, at + n))); at += n; } }
  const C = {
    seasons: 0, noView: 0, shapeBad: 0, onceBad: 0, sizeBad: 0, twice: 0, ratingBad: 0, ageBad: 0, squads: 0,
    srcBad: 0, realMixed: 0, rolesNamed: 0, inventedReal: 0, carriedStranger: 0, realExact: 0, realChecked: 0,
    familyBad: 0, familyChecked: 0,
    pairs: 0, carriedOver: 0, brokeMan: 0, arrivedBad: 0, arrivals: [], noArrival: 0,
    moves: 0, sameSlotName: 0, anyShared: 0, randomDraws: 0, examples: [],
  };
  const note = (kind, text) => { if (C.examples.length < 12) C.examples.push(`${kind}: ${text}`); };
  const out = [];
  let prev = null;
  let draws = 0;
  const seeded = Math.random;
  Math.random = () => { draws += 1; return seeded(); };
  for (const rec of R.seasons) {
    const s = rebuild(rec, R);
    const v = lib.squadView(s);
    const last = sheet.lastSeason(s);
    C.seasons += 1;
    if (!v) { C.noView += 1; out.push(null); prev = null; continue; }
    const xi = [...v.eleven.GK, ...v.eleven.DEF, ...v.eleven.MID, ...v.eleven.ATT];
    const all = [...xi, ...v.bench];
    const men = all.filter(m => !m.me);
    if (v.eleven.GK.length !== 1 || v.eleven.DEF.length !== 4 || v.eleven.MID.length !== 3 || v.eleven.ATT.length !== 3) { C.shapeBad += 1; note('shape', `${v.club} ${v.year}`); }
    if (all.filter(m => m.me).length !== 1) C.onceBad += 1;
    if (new Set(men.map(m => m.name)).size !== men.length) { C.twice += 1; note('twice', `${v.club} ${v.year}`); }
    /* 5: real, by role or invented, and never one passed off as another */
    const baked = lib.clubSquad(v.club, v.year);
    const inWindow = v.year >= WINDOW.first && v.year <= WINDOW.last;
    const want = baked ? 'real' : v.year > WINDOW.last ? 'invented' : 'roles';
    if (v.source !== want || (v.source === 'real' && !inWindow)) { C.srcBad += 1; note('source', `${v.club} ${v.year} is ${v.source}, should be ${want}`); }
    if (v.source === 'real') {
      C.realChecked += 1;
      if (men.length === baked.length && baked.every(b => men.some(m => m.name === b.name && m.ovr === b.ovr && m.pos === b.pos && m.id === undefined && m.age === undefined))) C.realExact += 1;
      else note('real', `${v.club} ${v.year} is not exactly the baked squad`);
    } else {
      C.squads += 1;
      if (men.length < 22 || (v.carried === 0 && men.length !== 22)) { C.sizeBad += 1; note('size', `${v.club} ${v.year} has ${men.length}`); }
      const lastReal = v.source === 'invented' ? new Set((lib.clubSquad(v.club, WINDOW.last) || []).map(m => m.name)) : null;
      for (const m of men) {
        if (m.ovr < 40 || m.ovr > 94) C.ratingBad += 1;
        if (m.id !== undefined && (m.age < 16 || m.age > 40)) { C.ageBad += 1; note('age', `${m.age} at ${v.club} ${v.year}`); }
        if (v.source === 'roles') {
          if (m.role !== m.name || real.has(m.name) || m.id === undefined) { C.rolesNamed += 1; note('roles', `${m.name} at ${v.club} ${v.year}`); }
        } else if (m.id === undefined) {
          /* a real man in the game's own years: only one who was in the club's last real squad */
          if (!lastReal.has(m.name)) { C.carriedStranger += 1; note('carried', `${m.name} at ${v.club} ${v.year}`); }
        } else {
          if (real.has(m.name)) { C.inventedReal += 1; note('invented', `${m.name} is a real name, at ${v.club} ${v.year}`); }
          C.familyChecked += 1;
          const fam = famOf.get(gen.familyIdFor(m.nation));
          if (!fam || !fam.has(m.name)) { C.familyBad += 1; note('family', `${m.name} (${m.nation}) at ${v.club}`); }
        }
      }
    }
    /* 7: the same man a year older, and the new man dated to this summer */
    const gens = v.source === 'real' ? null : new Map(men.filter(m => m.id !== undefined).map(m => [m.id, m]));
    if (prev && gens && prev.id === rec.id && prev.gens && prev.year + 1 === v.year) {
      if (prev.club === v.club) {
        C.pairs += 1;
        let arrived = 0;
        for (const [id, m] of gens) {
          const was = prev.gens.get(id);
          if (was) {
            C.carriedOver += 1;
            const named = prev.source === 'invented' && v.source === 'invented';
            if (m.pos !== was.pos || m.age !== was.age + 1 || m.since !== was.since && !(prev.source === 'roles' && v.source === 'invented')
              || (named && (m.name !== was.name || m.nation !== was.nation))) { C.brokeMan += 1; note('man', `${was.name} ${was.age} then ${m.name} ${m.age} at ${v.club} ${v.year}`); }
          } else {
            arrived += 1;
            if (m.since !== v.year) { C.arrivedBad += 1; note('arrival', `${m.name} since ${m.since} first seen ${v.year} at ${v.club}`); }
          }
        }
        if (v.carried === 0 && prev.carried === 0) { C.arrivals.push(arrived); if (arrived === 0) C.noArrival += 1; }
      } else if (prev.source === 'invented' && v.source === 'invented') {
        C.moves += 1;
        let same = 0; let any = 0;
        const names = new Set([...prev.gens.values()].map(m => m.name));
        for (const [id, m] of gens) {
          const slot = id.split(':')[0];
          for (const [pid, pm] of prev.gens) if (pid.split(':')[0] === slot && pm.name === m.name) same += 1;
          if (names.has(m.name)) any += 1;
        }
        if (same) C.sameSlotName += 1;
        if (any) C.anyShared += 1;
      }
    }
    prev = { id: rec.id, club: v.club, year: v.year, source: v.source, carried: v.carried, gens };
    out.push({
      source: v.source, carried: v.carried, group: v.group, rank: v.rank, groupSize: v.groupSize,
      inXi: v.inElevenOnRating, inPlans: v.trust.inPlans, expected: v.trust.expected, pct: v.trust.pct,
      label: v.trust.label, swing: v.trust.swing, frozen: v.trust.frozen,
      last: last ? { thin: last.thin, lines: last.lines, leagueApps: last.leagueApps } : null,
    });
  }
  Math.random = seeded;
  C.randomDraws = draws;
  return { S: out, C };
}

/* ── the sections ───────────────────────────────────────────────────────── */
/* FLOORS-BEGIN (set from five seeds, see the table in this block) */
const FLOORS = {
  arrivalsMin: null, arrivalsMax: null,   // mean arrivals a summer, generated squads
  gap13: null,                            // per era: mean league games ranked 1st minus ranked 3rd
  gapBench: null,                         // pooled: in the eleven on rating minus outside it
  gap13Real: null,                        // the real squad arm, pooled
  disagreeMax: null,                      // 8b: share of generated seasons where rating and plan disagree
  trustTol: null,                         // 9: |mean(league games - trust.expected)|
  fallbackMax: null,                      // 10: share of thin seasons left with only the fallback line
  underGap: null,                         // 10: seasons with the "under the level" line play this many fewer
  labelTol: null,                           // 9: the same, per trust label with 200 or more seasons
  sameSlotMax: null,                      // 7: share of moves that meet a namesake in the same slot
  age30Min: null,                         // rows played at 30 or over
};
/* FLOORS-END */
const floor = (section, name, value, ok, text) => {
  if (QUICK || FLOORS[name] === null) { say(`   (not asserted) ${text}`); return; }
  check(section, ok(FLOORS[name], value), `${text}, the line is ${FLOORS[name]}`);
};

function sec1(mods) {
  say('1. Names');
  const { intl, gen, engine } = mods;
  const real = realNameSet(mods);
  const pool = intl.allIntlNames();
  const shared = pool.filter(n => real.has(n));
  say(`   ${pool.length} names the generator can show against ${real.size} real names: ${shared.length} shared`);
  check('1', pool.length >= 4000 && real.size >= 2000, 'the name pool or the real name set is smaller than it has ever been');
  check('1', shared.length === 0, `invented names that belong to real players: ${shared.slice(0, 5).join(', ')}`);
  check('1', new Set(pool).size === pool.length, 'the name pool holds the same name twice, so two families could put one name in a squad');
  const countries = [...new Set(engine.FALLBACK_CLUBS.map(c => c.country))];
  const lost = countries.filter(c => gen.familyIdFor(c) === null);
  say(`   ${countries.length} club countries, ${countries.filter(c => gen.FAMILY_ALIAS[c]).length} by alias, ${lost.length} with no name family`);
  check('1', countries.length >= 50, 'fewer than 50 club countries were read');
  check('1', lost.length === 0, `club countries with no name family (add a FAMILY_ALIAS line): ${lost.join(', ')}`);
  const foreign = gen.FOREIGN_NATIONS.filter(n => !intl.NATION_FAMILY[n]);
  check('1', gen.FOREIGN_NATIONS.length === 30 && foreign.length === 0, `signing nations with no family: ${foreign.join(', ')}`);
}

function sec2(mods) {
  say('2. The two copies');
  const { gen, engine, international, lib } = mods;
  const got = [];
  for (const tier of [1, 2, 3, 4, 5]) {
    let r = 30;
    while (r < 99 && engine.projectLeagueApps(r, tier, '', 2).min < 20) r += 1;
    got.push(r + 5);
    check('2', gen.squadCentre(tier) === r + 5, `tier ${tier}: the squad level here is ${gen.squadCentre(tier)} and the engine's is ${r + 5}`);
  }
  say(`   squad level by tier, from the engine's own projection: ${got.join(', ')}`);
  seedRandom(7);
  const xi = international.xiMen(international.pickSquad('England', null, 2040).xi);
  Math.random = realRandom;
  const lines = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const m of xi) lines[lib.groupOf(m.slot)] += 1;
  say(`   the national eleven: ${JSON.stringify(lines)}`);
  check('2', xi.length === 11, `the national eleven has ${xi.length} men`);
  for (const g of Object.keys(lines)) check('2', gen.ELEVEN_SHAPE[g] === lines[g], `the ${g} line is ${gen.ELEVEN_SHAPE[g]} here and ${lines[g]} on the national sheet`);
  check('2', mods.data.CLUB_SQUAD_YEARS.first === WINDOW.first && mods.data.CLUB_SQUAD_YEARS.last === WINDOW.last, 'the baked window moved: this harness holds 2016 to 2026');
}

function sec3(R, S) {
  say('3. The fleet');
  for (let e = 0; e < ERAS.length; e += 1) {
    const n = { real: 0, roles: 0, invented: 0, mixed: 0, none: 0 };
    R.seasons.forEach((rec, i) => {
      if (rec.era !== e) return;
      const s = S[i];
      if (!s) n.none += 1; else if (s.source === 'invented' && s.carried > 0) n.mixed += 1; else n[s.source] += 1;
    });
    const total = n.real + n.roles + n.invented + n.mixed + n.none;
    say(`   ${ERAS[e][0].padEnd(8)} ${String(total).padStart(5)} pro seasons: real ${n.real}, by role ${n.roles}, invented ${n.invented}, invented with real men still there ${n.mixed}, none ${n.none}`);
    check('3', total >= SIZE * 4, `era ${ERAS[e][0]} recorded only ${total} pro seasons`);
  }
  const ended = Object.entries(R.unknown);
  say(`   ${R.careers} careers, ${R.seasons.length} seasons, recording ${(R.bytes / 1e6).toFixed(1)} MB, slim save proven on ${R.proven}; careers ended on an unknown phase: ${ended.length ? ended.map(([k, v]) => `${k} ${v}`).join(', ') : 'none'}`);
  check('3', R.bytes / 1e6 < 300, `the recording is ${(R.bytes / 1e6).toFixed(0)} MB`);
  check('3', R.proven >= Math.min(300, R.seasons.length), `the slim save was proven on only ${R.proven} seasons`);
  const old = R.seasons.filter(r => r.after && r.age >= 30).length;
  const bands = [[16, 21], [22, 25], [26, 29], [30, 33], [34, 40]].map(([a, b]) => `${a} to ${b}: ${R.seasons.filter(r => r.after && r.age >= a && r.age <= b).length}`);
  say(`   played rows by age going in: ${bands.join(', ')}`);
  floor('3', 'age30Min', old, (line, v) => v >= line, `${old} rows played at 30 or over`);
}

function sec4(C) {
  say('4. Shape');
  say(`   ${C.seasons} seasons, ${C.noView} with no view, ${C.squads} squads that are not real; bad shape ${C.shapeBad}, not once ${C.onceBad}, wrong size ${C.sizeBad}, a name twice ${C.twice}, rating out of range ${C.ratingBad}, age out of range ${C.ageBad}`);
  check('4', C.seasons >= SIZE * 30, `only ${C.seasons} seasons were read`);
  check('4', C.noView === 0, `${C.noView} pro seasons had no squad to show`);
  check('4', C.shapeBad === 0, `${C.shapeBad} elevens are not 1, 4, 3 and 3`);
  check('4', C.onceBad === 0, `${C.onceBad} sheets do not hold him exactly once`);
  check('4', C.sizeBad === 0, `${C.sizeBad} squads are the wrong size`);
  check('4', C.twice === 0, `${C.twice} squads hold a name twice`);
  check('4', C.ratingBad === 0 && C.ageBad === 0, `${C.ratingBad} ratings and ${C.ageBad} ages out of range`);
}

function sec5(C) {
  say('5. Real, by role or invented, never one passed off as another');
  say(`   ${C.realChecked} real squads, ${C.realExact} exactly the baked one; wrong source ${C.srcBad}; a role sheet with a name on it ${C.rolesNamed}; an invented man with a real name ${C.inventedReal}; a real man who was not in the club's last real squad ${C.carriedStranger}; ${C.familyChecked} invented men checked against their name family, ${C.familyBad} outside it`);
  check('5', C.realChecked >= 50 && C.familyChecked >= 1000, 'too few real squads or invented men were read to mean anything');
  check('5', C.realExact === C.realChecked, `${C.realChecked - C.realExact} real squads are not exactly the baked squad`);
  check('5', C.srcBad === 0, `${C.srcBad} squads carry the wrong source`);
  check('5', C.rolesNamed === 0, `${C.rolesNamed} men on a role sheet carry a name`);
  check('5', C.inventedReal === 0, `${C.inventedReal} invented men carry a real player's name`);
  check('5', C.carriedStranger === 0, `${C.carriedStranger} real men appear at a club whose last real squad they were not in`);
  check('5', C.familyBad === 0, `${C.familyBad} invented names are not from the man's own name family`);
}

/** The club years the recording visited, each once, for the checks that ask a squad directly. */
function clubYears(mods, R, limit) {
  const seen = new Set();
  const out = [];
  for (const rec of R.seasons) {
    const s = rebuild(rec, R);
    const at = mods.lib.squadNow(s);
    if (!at) continue;
    const key = `${mods.lib.squadSaveKey(s)}|${at.club}|${at.year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key: mods.lib.squadSaveKey(s), at });
    if (out.length >= limit) break;
  }
  return out;
}

async function sec6(mods, R, C, text) {
  say('6. The same every time, and keyed to the save');
  const other = await load(text);
  const asked = clubYears(mods, R, 2500);
  let differ = 0;
  for (const q of asked) {
    if (JSON.stringify(mods.lib.livingSquad(q.key, q.at)) !== JSON.stringify(other.lib.livingSquad(q.key, q.at))) differ += 1;
  }
  say(`   6a ${asked.length} club years asked of two separately loaded copies: ${differ} differ`);
  check('6a', asked.length >= Math.min(2000, SIZE * 40), `only ${asked.length} club years were asked`);
  check('6a', differ === 0, `${differ} squads differ between two copies of the same code`);
  let round = 0; let roundBad = 0;
  for (let i = 0; i < R.seasons.length && round < 500; i += 7) {
    const s = rebuild(R.seasons[i], R);
    round += 1;
    if (JSON.stringify(mods.lib.squadView(s)) !== JSON.stringify(mods.lib.squadView(JSON.parse(JSON.stringify(s))))) roundBad += 1;
  }
  say(`   6b ${round} saves through JSON and back: ${roundBad} read differently`);
  check('6b', round >= 100 && roundBad === 0, `${roundBad} of ${round} saves read differently after a JSON round trip`);
  say(`   6c Math.random drawn ${C.randomDraws} times inside the readers over ${C.seasons} seasons`);
  check('6c', C.randomDraws === 0, `the readers drew from Math.random ${C.randomDraws} times`);
  let pairs = 0; let same = 0;
  for (const q of asked) {
    if (mods.lib.clubSquad(q.at.club, q.at.year)) continue;
    pairs += 1;
    const a = JSON.stringify(mods.lib.livingSquad(q.key, q.at).men.filter(m => m.id !== undefined).map(m => [m.id, m.age, m.ovr, m.since]));
    const b = JSON.stringify(mods.lib.livingSquad(`${q.key}|another save`, q.at).men.filter(m => m.id !== undefined).map(m => [m.id, m.age, m.ovr, m.since]));
    if (a === b) same += 1;
    if (pairs >= 800) break;
  }
  say(`   6d ${pairs} pairs of different saves at the same club and season: ${same} got the same squad`);
  check('6d', pairs >= Math.min(500, SIZE * 10), `only ${pairs} pairs were compared`);
  check('6d', same === 0, `${same} pairs of different saves share a squad`);
  /* 6e: the nation on the save is not part of the key */
  let swapped = 0; let moved = 0;
  for (let i = 0; i < R.seasons.length && swapped < 300; i += 11) {
    const s = rebuild(R.seasons[i], R);
    swapped += 1;
    if (JSON.stringify(mods.lib.squadView(s)) !== JSON.stringify(mods.lib.squadView({ ...s, nationality: s.nationality === 'Ghana' ? 'Peru' : 'Ghana' }))) moved += 1;
  }
  say(`   6e ${swapped} saves with the nation swapped: ${moved} read differently`);
  check('6e', swapped >= 100 && moved === 0, `${moved} of ${swapped} saves got a new squad when only the nation changed`);
}

function sec7(C) {
  say('7. Ageing and turnover');
  const m = mean(C.arrivals);
  say(`   ${C.pairs} summers at one club, ${C.carriedOver} men carried over, ${C.brokeMan} broke "same man, one year older", ${C.arrivedBad} arrivals dated wrong; arrivals a summer ${f1(m)} over ${C.arrivals.length} summers (${C.noArrival} with none)`);
  check('7', C.pairs >= SIZE * 10 && C.carriedOver >= SIZE * 150, `too few summers (${C.pairs}) or men (${C.carriedOver}) to mean anything`);
  check('7', C.brokeMan === 0, `${C.brokeMan} men changed name, nation, position or did not age one year`);
  check('7', C.arrivedBad === 0, `${C.arrivedBad} new men are not dated to the summer they arrived`);
  floor('7', 'arrivalsMin', m, (line, v) => v >= line, `mean arrivals a summer ${f1(m)}`);
  floor('7', 'arrivalsMax', m, (line, v) => v <= line, `mean arrivals a summer ${f1(m)}`);
  const share = C.moves ? C.sameSlotName / C.moves : NaN;
  say(`   ${C.moves} moves between two invented squads: ${C.sameSlotName} (${f1(share * 100)}%) meet a man with the same name in the same slot, ${C.anyShared} share any name`);
  if (!QUICK) check('7', C.moves >= 200, `only ${C.moves} moves between invented squads`);
  floor('7', 'sameSlotMax', share, (line, v) => v <= line, `share of moves meeting a namesake in the same slot ${f1(share * 100)}%`);
}

const armOf = s => (s.source === 'real' ? 'real' : s.source === 'invented' && s.carried > 0 ? 'mixed' : 'made');
function rows(R, S, keep) {
  const out = [];
  R.seasons.forEach((rec, i) => { const s = S[i]; if (s && rec.after && keep(s, rec)) out.push({ s, rec, apps: rec.after.leagueApps }); });
  return out;
}

function sec8(R, S) {
  say('8. Rank tracks the games the engine hands out');
  for (let e = 0; e < ERAS.length; e += 1) {
    const first = rows(R, S, (s, rec) => rec.era === e && armOf(s) === 'made' && s.rank === 1);
    const third = rows(R, S, (s, rec) => rec.era === e && armOf(s) === 'made' && s.rank === 3);
    const gap = mean(first.map(r => r.apps)) - mean(third.map(r => r.apps));
    say(`   ${ERAS[e][0].padEnd(8)} ranked 1st ${f1(mean(first.map(r => r.apps)))} (n ${first.length}), 3rd ${f1(mean(third.map(r => r.apps)))} (n ${third.length}), gap ${f1(gap)}`);
    if (!QUICK) check('8', first.length >= 100 && third.length >= 100, `era ${ERAS[e][0]}: a bucket under 100 (${first.length}, ${third.length})`);
    floor('8', 'gap13', gap, (line, v) => v >= line, `era ${ERAS[e][0]} gap 1st minus 3rd ${f1(gap)}`);
  }
  const inXi = rows(R, S, s => armOf(s) === 'made' && s.inXi);
  const out = rows(R, S, s => armOf(s) === 'made' && !s.inXi);
  const gapBench = mean(inXi.map(r => r.apps)) - mean(out.map(r => r.apps));
  say(`   pooled, squads the game made: in the eleven on rating ${f1(mean(inXi.map(r => r.apps)))} (n ${inXi.length}), outside it ${f1(mean(out.map(r => r.apps)))} (n ${out.length}), gap ${f1(gapBench)}`);
  if (!QUICK) check('8', inXi.length >= 100 && out.length >= 100, `a pooled bucket under 100 (${inXi.length}, ${out.length})`);
  floor('8', 'gapBench', gapBench, (line, v) => v >= line, `pooled gap, eleven minus the rest ${f1(gapBench)}`);
  const r1 = rows(R, S, s => armOf(s) === 'real' && s.rank === 1);
  const r3 = rows(R, S, s => armOf(s) === 'real' && s.rank === 3);
  const gapReal = mean(r1.map(r => r.apps)) - mean(r3.map(r => r.apps));
  say(`   real squads, pooled: ranked 1st ${f1(mean(r1.map(r => r.apps)))} (n ${r1.length}), 3rd ${f1(mean(r3.map(r => r.apps)))} (n ${r3.length}), gap ${f1(gapReal)}`);
  if (!QUICK) check('8', r1.length >= 200 && r3.length >= 200, `a real squad bucket under 200 (${r1.length}, ${r3.length})`);
  floor('8', 'gap13Real', gapReal, (line, v) => v >= line, `real squads gap 1st minus 3rd ${f1(gapReal)}`);
}

function sec8b(R, S) {
  say('8b. Two pictures: where rating puts him, and the plan');
  for (const arm of ['made', 'mixed', 'real']) {
    const all = rows(R, S, s => armOf(s) === arm && !s.frozen);
    const off = all.filter(r => r.s.inXi !== r.s.inPlans);
    const benchPlan = all.filter(r => !r.s.inXi && r.s.inPlans).length;
    const share = all.length ? off.length / all.length : NaN;
    say(`   ${arm.padEnd(5)} ${all.length} seasons, the two disagree in ${off.length} (${f1(share * 100)}%); outside the eleven on rating but in the plans ${benchPlan}`);
    if (arm === 'made') {
      if (!QUICK) check('8b', all.length >= 300, `only ${all.length} seasons in squads the game made`);
      floor('8b', 'disagreeMax', share, (line, v) => v <= line, `rating and plan disagree in ${f1(share * 100)}% of the seasons in squads the game made`);
    }
  }
}

function sec9(R, S) {
  say('9. Trust is the engine\'s own expectation');
  const all = rows(R, S, () => true);
  const off = mean(all.map(r => r.apps - r.s.expected));
  say(`   ${all.length} played seasons: league games minus the plan, mean ${f1(off)}`);
  check('9', all.length >= SIZE * 20, `only ${all.length} played seasons`);
  floor('9', 'trustTol', off, (line, v) => Math.abs(v) <= line, `mean of league games minus the plan ${f1(off)}`);
  const labels = [...new Set(all.map(r => r.s.label))].sort();
  for (const label of labels) {
    const mine = all.filter(r => r.s.label === label);
    const m = mean(mine.map(r => r.apps - r.s.expected));
    const asserted = mine.length >= 200;
    say(`   ${label.padEnd(30)} n ${String(mine.length).padStart(6)}  mean ${f1(m)}${asserted ? '' : '  (printed only: under 200)'}`);
    if (asserted) floor('9', 'labelTol', m, (line, v) => Math.abs(v) <= line, `"${label}": league games minus the plan ${f1(m)}`);
  }
  const swings = {};
  for (const r of all) swings[r.s.swing] = (swings[r.s.swing] || 0) + 1;
  say(`   dressing room swings the fleet saw: ${JSON.stringify(swings)}`);
}

const UNDER = 'rating points under the level that squad expects';
const FALLBACK = 'Nothing in your record explains it beyond selection';
function sec10(R, S) {
  say('10. The reasons for a thin season');
  const seen = S.filter(s => s && s.last).map(s => s.last);
  const thin = seen.filter(l => l.thin);
  const none = thin.filter(l => l.lines.length === 0).length;
  const only = thin.filter(l => l.lines.length === 1 && l.lines[0].startsWith(FALLBACK)).length;
  const withLine = seen.filter(l => l.lines.some(x => x.includes(UNDER)));
  const without = seen.filter(l => !l.lines.some(x => x.includes(UNDER)));
  const gap = mean(without.map(l => l.leagueApps)) - mean(withLine.map(l => l.leagueApps));
  const shirtFull = seen.filter(l => !l.thin && l.lines.some(x => x.includes('last one in ahead of you'))).length;
  say(`   ${seen.length} last seasons read, ${thin.length} under 20 league games: ${none} with no line, ${only} (${f1(100 * only / Math.max(1, thin.length))}%) with only the fallback`);
  say(`   "under the level" line: ${f1(mean(withLine.map(l => l.leagueApps)))} league games with it (n ${withLine.length}), ${f1(mean(without.map(l => l.leagueApps)))} without (n ${without.length}), gap ${f1(gap)}`);
  check('10', thin.length >= SIZE * 4, `only ${thin.length} thin seasons were read`);
  check('10', none === 0, `${none} thin seasons got no line at all`);
  check('10', shirtFull === 0, `${shirtFull} seasons of 20 or more league games print the "last one in" line`);
  floor('10', 'fallbackMax', only / Math.max(1, thin.length), (line, v) => v <= line, `share of thin seasons with only the fallback ${f1(100 * only / Math.max(1, thin.length))}%`);
  floor('10', 'underGap', gap, (line, v) => v >= line, `seasons with the "under the level" line play ${f1(gap)} fewer league games`);
}

function sec11(R) {
  say('11. Offers');
  const bad = R.offers.filter(o => !o || !(o[0] >= 1 && o[0] <= o[1])).length;
  const by = {};
  for (const o of R.offers) if (o) by[o[2]] = (by[o[2]] || 0) + 1;
  say(`   ${R.offers.length} offers shown to the fleet, ${bad} without a rank inside the group: ${JSON.stringify(by)}`);
  check('11', R.offers.length >= SIZE * 20, `only ${R.offers.length} offers were seen`);
  check('11', bad === 0, `${bad} offers did not resolve to a rank from 1 to the group size`);
}

function sec12(mods) {
  say('12. It changes nothing');
  const size = Math.min(60, SIZE);
  const play = consult => {
    const saves = [];
    const lens = [];
    playFleet(mods, size, SEED + 100, {
      preSeason(s) {
        if (!consult) return;
        const at = mods.lib.squadNow(s);
        mods.lib.squadView(s);
        if (at) mods.lib.managerTrust(s, at);
        mods.sheet.lastSeason(s);
      },
      offers(s, offers) { if (consult) for (const o of offers) mods.sheet.offerFit(s, o); },
      done(s) { saves.push(JSON.stringify(s)); lens.push(s.seasons.length); },
    });
    return { saves, lens };
  };
  const plain = play(false);
  const consulted = play(true);
  let drift = 0;
  for (let i = 0; i < plain.saves.length; i += 1) if (plain.saves[i] !== consulted.saves[i]) drift += 1;
  const deep = plain.lens.filter(n => n > 4).length;
  say(`   ${plain.saves.length} careers played twice from one seed, ${deep} past four seasons: ${drift} final saves differ`);
  check('12', plain.saves.length === size * ERAS.length && consulted.saves.length === plain.saves.length, 'the two fleets are not the same size');
  check('12', deep >= Math.floor(plain.saves.length / 3), `only ${deep} careers ran past four seasons`);
  check('12', drift === 0, `${drift} careers saved differently once the squad was consulted`);
}

/* ── 13: the screens ────────────────────────────────────────────────────── */
const SCREENS = ['home', 'eleven', 'bench', 'place', 'last', 'help', 'examples'];
const unescape = t => t.replaceAll('&#x27;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const textOf = html => unescape(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' '));
/** The text of every element carrying a data attribute, e.g. data-squad-headline. */
function texts(html, attr) {
  const out = [];
  const re = new RegExp(`<[a-z0-9]+[^>]*\\s${attr}(?:="[^"]*")?[^>]*>(.*?)</`, 'g');
  let m;
  while ((m = re.exec(html))) out.push(textOf(m[1]));
  return out;
}
const RATING_WORDS = /last one in|last of the|in line|inside the eleven|are in it|is above you/;

function sec13(mods, R, S) {
  say('13. The screens');
  const { lib, sheet, tile, sheetUi, render, engine, intl } = mods;
  const firstOf = keep => { const i = S.findIndex((s, k) => s && keep(s, R.seasons[k])); return i < 0 ? null : rebuild(R.seasons[i], R); };
  const saves = {
    invented: firstOf(s => s.source === 'invented' && s.carried === 0 && s.last),
    real: firstOf(s => s.source === 'real' && s.last),
    roles: firstOf(s => s.source === 'roles' && s.last),
    mixed: firstOf(s => s.source === 'invented' && s.carried > 0),
  };
  const youth = engine.initCareer('Squad Youth', 'England', 'ST', '2025', stats(55), 55, 2025, engine.FALLBACK_CLUBS, null);
  check('13', render(tile.SquadTile, { career: youth }) === '', 'an academy save renders a tile');
  const pool = intl.allIntlNames();
  const real = realNameSet(mods);
  for (const [kind, save] of Object.entries(saves)) {
    if (!check('13', !!save, `the fleet has no ${kind} season to render`)) continue;
    const view = lib.squadView(save);
    const html = render(tile.SquadTile, { career: save });
    check('13', html.includes(`data-squad-rank="${view.rank}"`) && html.includes(`data-squad-trust="${view.trust.pct}"`) && html.includes('data-squad-tile'),
      `${kind}: the tile does not print the rank ${view.rank} and trust ${view.trust.pct} the lib gives`);
    check('13', !/text-\[(?:9|10|11)px\]/.test(html), `${kind}: the tile has text under 12 px`);
    let all = '';
    for (const screen of SCREENS) {
      const out = render(sheetUi.default, { career: save, view, onClose: () => {}, initialScreen: screen });
      all += out;
      const wanted = screen === 'last' && !sheet.lastSeason(save) ? 'help' : screen;
      check('13', out.includes(`data-squad-screen="${wanted}"`) && out.includes(`data-squad-source="${view.source}"`), `${kind}: the ${screen} screen did not render with its source chip`);
      check('13', !/text-\[(?:9|10|11)px\]/.test(out), `${kind}: the ${screen} screen has text under 12 px`);
      if (screen === 'eleven') check('13', (out.match(/data-squad-man=/g) || []).length === 11 && (out.match(/data-squad-man="me"/g) || []).length === (view.inElevenOnRating ? 1 : 0), `${kind}: the eleven is not 11 cells with him in it exactly when his rank says so`);
      if (screen === 'bench') check('13', (out.match(/data-squad-man=/g) || []).length === view.bench.length, `${kind}: the bench does not list its ${view.bench.length} men`);
    }
    const txt = textOf(all);
    if (kind === 'real') {
      check('13', !all.includes('data-squad-age') && !all.includes('data-squad-new') && !all.includes('data-squad-arrival') && !all.includes('flagcdn'), 'a real squad prints an age, a NEW chip, a flag or an arrival line');
      check('13', all.includes('REAL SQUAD'), 'a real squad is not labelled REAL SQUAD');
    }
    if (kind === 'roles') {
      const named = pool.filter(n => txt.includes(n)).length + [...real].filter(n => n.length > 5 && txt.includes(n)).length;
      check('13', named === 0, `a sheet by role prints ${named} names`);
      check('13', all.includes('ROLES ONLY') && all.includes('data-squad-age') && txt.includes('no checked squad list'), 'a sheet by role does not say so, or prints no ages');
    }
    if (kind === 'invented') check('13', all.includes('INVENTED TEAMMATES') && all.includes('data-squad-age'), 'an invented squad is not labelled, or prints no ages');
    if (kind === 'mixed') check('13', txt.includes('of the real 2026 squad are still here'), 'a squad that carries real men on does not say so');
    const help = sheet.squadHelp();
    for (const line of [...help.rules, ...help.examples]) check('13', txt.includes(line), `${kind}: the help does not print "${line.slice(0, 50)}..."`);
  }
  /* Two pictures, named every time: no sentence about the eleven or the last
     shirt without the words "our ratings", over 300 seasons an arm. */
  const seen = { made: 0, mixed: 0, real: 0 };
  let sentences = 0; let bare = 0;
  for (let i = 0; i < R.seasons.length; i += 1) {
    const s = S[i];
    if (!s) continue;
    const arm = armOf(s);
    if (seen[arm] >= 300) continue;
    seen[arm] += 1;
    const save = rebuild(R.seasons[i], R);
    const view = lib.squadView(save);
    let html = '';
    for (const screen of ['home', 'eleven', 'last']) html += render(sheetUi.default, { career: save, view, onClose: () => {}, initialScreen: screen });
    for (const attr of ['data-squad-headline', 'data-squad-xi-line', 'data-squad-reason']) {
      for (const t of texts(html, attr)) {
        if (!RATING_WORDS.test(t)) continue;
        sentences += 1;
        if (!/our ratings/i.test(t)) { bare += 1; if (bare <= 3) say(`   bare: ${t}`); }
      }
    }
  }
  say(`   rendered ${seen.made} + ${seen.mixed} + ${seen.real} seasons (made, mixed, real): ${sentences} sentences about the eleven or the last shirt, ${bare} without "our ratings"`);
  if (!QUICK) check('13', seen.made >= 300 && seen.real >= 300, `fewer than 300 seasons rendered in an arm (${JSON.stringify(seen)})`);
  check('13', sentences >= seen.made + seen.real, `only ${sentences} rating sentences were found, so the search is missing them`);
  check('13', bare === 0, `${bare} sentences about the eleven or the last shirt do not say "our ratings"`);
}

/* ── 14: negative controls ──────────────────────────────────────────────── */
/* Each patches the BUNDLE text, never a source file, on ONE line that must be
   found exactly once, reads the same recording again and must turn its own
   section red. `floors: true` marks a control judged on a measured line, which
   the quick loop cannot run. */
const CONTROLS = [
  { name: 'widen', red: ['5'], what: 'the last baked squad is served for every later year',
    needle: 'if (year < CLUB_SQUAD_YEARS.first || year > CLUB_SQUAD_YEARS.last) return null;',
    swap: 'if (year > CLUB_SQUAD_YEARS.last) year = CLUB_SQUAD_YEARS.last; if (year < CLUB_SQUAD_YEARS.first) return null;' },
  { name: 'names', red: ['5'], what: 'a real past season with no checked squad gets invented names',
    needle: 'men: genClubSquad({ ...q, named: false }) };', swap: 'men: genClubSquad({ ...q, named: true }) };' },
  { name: 'unkey', red: ['6a', '6c'], what: 'the generator draws from Math.random',
    needle: 'stream = (key) => keyedRng(`squad|${key}`);', swap: 'stream = (key) => Math.random;' },
  { name: 'shared', red: ['6d'], what: 'the squad is keyed to the club only',
    needle: 'const seed = `${q.saveKey}|${q.club}`;', swap: 'const seed = `${q.club}`;' },
  { name: 'nation', red: ['6e'], what: 'the nation is back in the key',
    needle: 'return [c.playerName, c.position, first?.year, first?.club].join("|");',
    swap: 'return [c.playerName, c.nationality, c.position, first?.year, first?.club].join("|");' },
  { name: 'noage', red: ['7'], what: 'nobody gets older',
    needle: 'const age = arrival + (y - start);', swap: 'const age = arrival;' },
  { name: 'nokeeper', red: ['4'], what: 'the eleven has no keeper',
    needle: 'ELEVEN_SHAPE = { GK: 1, DEF: 4, MID: 3, ATT: 3 };', swap: 'ELEVEN_SHAPE = { GK: 0, DEF: 4, MID: 3, ATT: 3 };' },
  { name: 'invert', red: ['8'], floors: true, what: 'men rated at or below him count as ahead',
    needle: 'const ahead = rivals.filter((m) => m.ovr >= me.ovr).length;', swap: 'const ahead = rivals.filter((m) => m.ovr <= me.ovr).length;' },
  { name: 'jitter', red: ['8b'], floors: true, what: 'the last starter is rated like any other starter',
    needle: 'const fitted = LAST_STARTER_SLOTS.includes(i) ? centre - LAST_STARTER_UNDER :', swap: 'const fitted = false ? centre - LAST_STARTER_UNDER :' },
  { name: 'noswing', red: ['9'], floors: true, what: 'trust ignores the dressing room',
    needle: 'const swing = phoneAppsSwing(c);', swap: 'const swing = 0;' },
  { name: 'bare', red: ['13'], what: 'the headline drops the words "on our ratings"',
    needle: 'const place = `On our ratings you are ${ordinal(view.rank)} of ${view.groupSize} ${label}`;',
    swap: 'const place = `You are ${ordinal(view.rank)} of ${view.groupSize} ${label}`;' },
];

async function sec14(R, text) {
  console.log('14. Negative controls');
  for (const c of CONTROLS) {
    if (ONLY_CONTROL && ONLY_CONTROL !== c.name) continue;
    const found = text.split(c.needle).length - 1;
    if (found !== 1) {
      console.log(`control cannot run: ${c.name}: its needle is in the bundle ${found} times, not once`);
      check('14', false, `control ${c.name} cannot run`);
      continue;
    }
    if (c.floors && (QUICK || Object.values(FLOORS).some(v => v === null))) {
      console.log(`   ${c.name.padEnd(9)} skipped: it is judged on a measured line, and the lines are not asserted in this run`);
      continue;
    }
    const patched = text.replace(c.needle, c.swap);
    const mods = await load(patched);
    sink = new Set();
    const { S, C } = scan(mods, R);
    sec2(mods); sec4(C); sec5(C); await sec6(mods, R, C, patched); sec7(C); sec8(R, S); sec8b(R, S); sec9(R, S); sec10(R, S);
    if (c.red.includes('13')) sec13(mods, R, S);
    const red = [...sink];
    sink = null;
    const hit = c.red.every(sec => red.includes(sec));
    console.log(`   ${c.name.padEnd(9)} ${c.what}: red in ${red.length ? red.join(', ') : 'nothing'} (must be red in ${c.red.join(' and ')})`);
    check('14', hit, `control ${c.name} did not turn section ${c.red.join(' and ')} red`);
  }
}

/* ── run ────────────────────────────────────────────────────────────────── */
const t0 = Date.now();
console.log(`simCareerSquad: ${SIZE} careers an era, seed ${SEED}${QUICK ? ' (QUICK: floors printed, not asserted)' : ''}`);
sec1(MAIN);
sec2(MAIN);
const R = record(MAIN, SIZE, SEED);
console.log(`   (fleet recorded in ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
const { S, C } = scan(MAIN, R);
sec3(R, S);
sec4(C);
if (C.examples.length) console.log(`   examples: ${C.examples.join(' | ')}`);
sec5(C);
await sec6(MAIN, R, C, BUNDLE);
sec7(C);
sec8(R, S);
sec8b(R, S);
sec9(R, S);
sec10(R, S);
sec11(R);
sec12(MAIN);
sec13(MAIN, R, S);
if (process.env.CAREER_SQUAD_NO_CONTROLS !== '1') await sec14(R, BUNDLE);
console.log(`   (${((Date.now() - t0) / 1000).toFixed(0)} s, work folder ${WORK})`);
if (failed) for (const f of failures.slice(0, 20)) console.log(`FAILED ${f}`);
console.log(QUICK
  ? `simCareerSquad QUICK: ${checks} checks, ${failed} failed, floors not asserted`
  : `simCareerSquad: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
