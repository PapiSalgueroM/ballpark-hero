/**
 * Round 835: the Soccer Career probe behind the "soccer is unchanged" fixture
 * for the brand and identity lift.
 *
 * Round 835 lifts four Soccer Career systems into shared modules behind a
 * sport descriptor: the social posts and what each one moves, the endorsement
 * ladder (tiers, what they pay, the cover offer), the agent and the
 * personality. Soccer has to come out of that exactly as it went in, down to
 * the order of every Math.random draw. This file is the one procedure that
 * measures it, used twice:
 *
 *   scripts/recordSoccerBrandFixture835.mjs ran it against a main with no
 *   Round 835 code on it (origin/main 3fb92eea first, origin/main 6d29f561
 *   after the branch took main in again) and wrote
 *   scripts/data/soccerBrandFixture835.json.
 *
 *   scripts/simCareerSocialBrands.mjs section 1 runs it again against the
 *   current tree and requires the output to match that file byte for byte.
 *
 * Same procedure both times, so a difference can only come from the code it
 * drives. Three parts:
 *
 *   careers   48 seeded careers from 16 to the retirement ceremony, every
 *             screen answered with the engine call the page's own handler
 *             makes for it, with a spread of answers rather than the first
 *             one every time: all seven posts in rotation (plus a refused
 *             second post and a refused unknown post), the cover offer taken
 *             and turned down, every event card answered on a rotating
 *             choice (so the personality reveal and the agent signing land on
 *             every option), offers, loans, extensions and staying put. Some
 *             careers are handed a follower count just under a tier line, so
 *             every rung of the ladder is crossed by a real post. The WHOLE
 *             save is hashed after every step.
 *   oldSaves  saves written before Round 49 and before the Round 133 rename,
 *             carrying the stored tier ids ('nike_adidas' among them, and the
 *             'fifa_cover' value the repair maps) and the legacy named
 *             sponsor deals, loaded through repairCareer and played on.
 *   units     the lifted functions called directly over a grid of synthetic
 *             saves, so a branch the careers rarely reach is still pinned.
 *
 * Every random draw goes through a seeded Math.random, restored afterwards.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Bundle the soccer engine and the life module out of `tree` (a checkout's
 * root) and import them. `rewrite(relPath, src)` may change a source file's
 * text in the bundle only, for the negative controls; the file on disk is
 * never touched. `extra` maps more export names to tree relative module
 * paths, bundled in the same build so they share one module graph. node_modules
 * is found by walking up from this script, so a worktree with none of its own
 * still resolves.
 */
export async function loadSoccerBrand(tree, rewrite = null, extra = {}) {
  const { build } = await import('esbuild');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const nodePaths = [];
  for (let d = here; ; d = path.dirname(d)) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(nm)) nodePaths.push(nm);
    if (path.dirname(d) === d) break;
  }
  const T = tree.replaceAll('\\', '/');
  const tmp = fs.mkdtempSync(path.join(process.env.TEMP || os.tmpdir(), 'soccerbrand835-'));
  const entry = path.join(tmp, 'entry.mjs');
  const out = path.join(tmp, 'bundle.mjs');
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const soccer = await import('${T}/src/lib/soccerCareerEngine.ts');
export const life = await import('${T}/src/lib/soccerCareerLife.ts');
${Object.entries(extra).map(([name, rel]) => `export const ${name} = await import('${T}/${rel}');`).join('\n')}
`);
  const plugins = [];
  if (rewrite) {
    plugins.push({
      name: 'control-rewrite',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/].*\.tsx?$/ }, args => {
          const rel = path.relative(tree, args.path).replaceAll('\\', '/');
          const src = fs.readFileSync(args.path, 'utf8');
          const next = rewrite(rel, src);
          if (next === src) return undefined;
          return { contents: next, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
        });
      },
    });
  }
  try {
    await build({
      entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
      logLevel: 'error', alias: { '@': path.join(tree, 'src') }, absWorkingDir: tree, nodePaths, plugins,
    });
    return await import(pathToFileURL(out).href);
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

/** The whole state, every field, as one short string. Round 1041 gave a
 *  played season one new key, cupRun (the domestic cup's run, drawn from its
 *  own keyed generator), which no tree before it writes; it is taken out of
 *  every season row before the hash, the way the awards night probe drops it,
 *  so a fixture recorded from main still proves the rest of the save. A save
 *  with no run is hashed exactly as before. */
/* Release AQ: Round 1173 keeps the season's continental run on the row
   (clubCupRun, a plain copy of the last run) and stamps the last run with
   its season and club. Neither draws, and no tree before the train writes
   them, so they leave the hash the same way and for the same reason, as
   scripts/lib/careerAwardsNightProbe.mjs already does. A save without
   them is hashed exactly as before. */
const hasRun = r => r && typeof r === 'object' && ('cupRun' in r || 'clubCupRun' in r);
const withoutRun = r => {
  if (!hasRun(r)) return r;
  const { cupRun: _run, clubCupRun: _clubRun, ...rest } = r;
  return rest;
};
const withoutRuns = v => {
  if (!v || typeof v !== 'object') return v;
  const runs = Array.isArray(v.seasons) && v.seasons.some(hasRun);
  const pending = hasRun(v.pendingSummary);
  const last = v.lastUCLResult && typeof v.lastUCLResult === 'object' && ('seasonYear' in v.lastUCLResult || 'club' in v.lastUCLResult);
  if (!runs && !pending && !last) return v;
  const { seasonYear: _year, club: _club, ...legacyResult } = last ? v.lastUCLResult : {};
  return { ...v, ...(runs ? { seasons: v.seasons.map(withoutRun) } : {}), ...(pending ? { pendingSummary: withoutRun(v.pendingSummary) } : {}), ...(last ? { lastUCLResult: legacyResult } : {}) };
};
const hashOf = v => createHash('sha256').update(JSON.stringify(withoutRuns(v))).digest('hex').slice(0, 16);

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Hard coded, not read off the module, so the drive does not move if the
 *  list is reordered (the list itself is recorded separately in defs). */
export const POST_IDS = ['training_video', 'viral_celebration', 'controversial_opinion', 'charity_work', 'personal_life', 'troll_rival', 'stay_off'];
export const LEGACY_TIERS = ['local_brand', 'nike_adidas', 'global_ambassador', 'merchandise_line', 'cover_athlete', 'fifa_cover', null];
export const LEGACY_DEALS = ['Nike', 'Adidas', 'Vortex', 'Kinetiq', null];
const PERSONALITY_IDS = [undefined, null, '', 'showman', 'iceman', 'hothead', 'professor', 'enigma', 'nobody'];
const AGENT_IDS = [undefined, null, '', 'cousin', 'shark', 'super', 'self', 'nobody'];

const NATIONS = ['England', 'Spain', 'France', 'Germany', 'Brazil', 'Argentina', 'Portugal', 'Nigeria', 'Japan', 'USA', 'Netherlands', 'Ghana'];
const POSITIONS = ['ST', 'CAM', 'LW', 'RW', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];
const STARTS = [['1990s', 1992], ['2000s', 2004], ['2010s', 2012], ['2020s', 2020]];
const POTS = [72, 78, 84, 88, 92, 96];
/** Followers (millions) handed to a career at its first post from 21, each
 *  just under one of the five tier lines, so a post carries it over. */
const BOOSTS = [null, null, 0.95, 4.95, 14.95, 29.95, 49.95, null];
const DRILLS = ['shooting', 'pace', 'passing', 'dribbling'];
const BDOR_SPEECHES = ['thank_rival', 'family_on_stage', 'tears', 'greatest_ever'];
const WC_SPEECHES = ['for_the_country', 'shirt_to_the_fans', 'call_out_doubters', 'quiet_lap'];

const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

function offersOf(sit) {
  if (!sit) return [];
  return [sit.offer, sit.offerA, sit.offerB, ...(sit.offers || [])].filter(Boolean);
}

/**
 * One screen of the page, answered. Returns [label, nextState, done]. The
 * labels are short so the fixture stays small; they say which handler ran.
 */
function step(E, s, cfg, k, clubs) {
  const pick = (n) => (cfg.seed * 7 + k * 13) % Math.max(1, n);
  switch (s.phase) {
    case 'youth': return ['Y', E.advanceYouthYear(s, clubs)];
    case 'contract_offer': {
      const offers = s.pendingOffers || [];
      if (!offers.length) return ['c', { ...s, phase: 'playing' }];
      return ['C', E.acceptOffer(s, offers[pick(offers.length)])];
    }
    case 'playing': return ['P', E.advanceProSeason(s, clubs)];
    case 'rehab_choice': return ['H', E.applyRehabChoice(s, pick(3))];
    case 'newspaper': return ['N', E.dismissNewspaper(s)];
    case 'season_summary': return ['S', E.dismissSummary(s, clubs)];
    case 'international_debut': return ['D', E.dismissDebut(s, clubs)];
    case 'world_cup': {
      const t = s.pendingTournament;
      const won = (t && t.champion && t.champion === t.nation) || (s.pendingWorldCup && s.pendingWorldCup.result === 'Winner');
      if (won) return ['w', E.applyWorldCupSpeech(s, WC_SPEECHES[pick(4)], clubs)];
      return ['W', E.dismissWorldCup(s, clubs)];
    }
    case 'rivalry_event': return ['R', E.dismissRivalryEvent(s, clubs)];
    case 'ballon_dor': {
      if (s.pendingBallonDor && s.pendingBallonDor.playerRank === 1) return ['b', E.applyBdorSpeech(s, BDOR_SPEECHES[pick(4)], clubs)];
      return ['B', E.dismissBallonDor(s, clubs)];
    }
    case 'moral_dilemma': {
      if (s.pendingMoralDilemma) {
        const n = s.pendingMoralDilemma.choices?.length || 1;
        return ['d', E.applyMoralDilemmaChoice(s, pick(n))];
      }
      return ['x', E.dismissMoralDilemma(s, clubs)];
    }
    case 'social_media_action': {
      if (!s.socialMediaActionUsedThisSeason) {
        let cur = s;
        let label = 'M';
        /* Every fifth post season, the unknown post first: refused, nothing moves. */
        if ((cfg.seed + k) % 5 === 0) { cur = E.applySocialMediaAction(cur, 'not_a_post'); label += '?'; }
        /* The career's boost lands on its first post from 21, just under a line. */
        if (cfg.boost !== null && !cfg.boosted && cur.age >= 21) {
          cur = { ...cur, socialMediaFollowers: cfg.boost };
          if (cfg.star) cur.overall = Math.max(cur.overall, 91);
          cfg.boosted = true;
          label += '+';
        }
        const id = POST_IDS[(cfg.seed * 3 + k) % POST_IDS.length];
        cur = E.applySocialMediaAction(cur, id);
        cfg.posts[id] = (cfg.posts[id] || 0) + 1;
        /* And every third, a second post the same season: refused. */
        if ((cfg.seed + k) % 3 === 0) { cur = E.applySocialMediaAction(cur, POST_IDS[(k + 1) % POST_IDS.length]); label += '2'; }
        return [label + POST_IDS.indexOf(id), cur];
      }
      if (s.pendingCoverAthleteEvent) {
        const accept = (cfg.seed + k) % 2 === 0;
        cfg.cover[accept ? 'yes' : 'no'] += 1;
        return [accept ? 'G' : 'g', E.handleCoverAthleteDecision(s, accept)];
      }
      return ['X', E.dismissSocialMediaPhase(s, clubs)];
    }
    case 'red_card_appeal_result': return ['A', E.dismissAppealResult(s, clubs)];
    case 'retirement_suggestion': {
      if (s.age >= 34 || (cfg.seed + k) % 2 === 0) return ['Q', E.acceptRetirementSuggestion(s)];
      /* Round 850 gave Keep Playing the clubs (it plays the season on); the
         page's handler passes them, so the probe does. */
      return ['q', E.declineRetirementSuggestion(s, clubs)];
    }
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return ['e', { ...s, phase: 'playing', pendingEvents: [] }];
      return ['E' + ev.id, E.applyEventChoice(s, pick(ev.choices.length), clubs)];
    }
    case 'transfer_window': {
      const opts = offersOf(s.transferSituation);
      const loans = s.pendingLoanOffers || [];
      const way = (cfg.seed + k) % 5;
      if (way === 1 && opts.length) return ['O', E.acceptOffer(s, opts[pick(opts.length)])];
      if (way === 2 && loans.length) return ['L', E.acceptLoan(s, loans[0])];
      if (way === 3) return ['K', E.signExtension(s)];
      return ['T', E.stayAtClub(s)];
    }
    default: return [null, s];
  }
}

function driveFrom(E, s0, cfg, clubs, maxSteps, steps) {
  let s = s0;
  for (let k = 0; k < maxSteps; k += 1) {
    if (s.retired || s.phase === 'retirement_ceremony' || s.phase === 'retired') break;
    if (cfg.train && E.trainingAvailable(s) && s.phase === 'playing') {
      s = E.applyTrainingResult(s, DRILLS[(cfg.seed + k) % DRILLS.length], 40 + ((cfg.seed * 11 + k * 17) % 61));
      steps.push('t:' + hashOf(s));
    }
    const [label, next] = step(E, s, cfg, k, clubs);
    if (label === null) { steps.push('?' + s.phase); break; }
    s = next;
    steps.push(label + ':' + hashOf(s));
  }
  return s;
}

/**
 * A career played with the probe's own answers until it is about to play a
 * pro season at `minAge` or older. For the harness's own checks, never called
 * by the probe, so the fixture does not depend on it. The caller seeds
 * Math.random. Null if the career never gets there.
 */
export function driveToPlaying(E, seed, minAge) {
  const clubs = E.FALLBACK_CLUBS;
  const cfg = newCfg(seed);
  cfg.boost = null;
  cfg.train = false;
  let s = E.initCareer(`Stored ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2010s', stats(68), 68, 2012, clubs, null, 88);
  for (let k = 0; k < 400; k += 1) {
    if (s.retired || s.phase === 'retirement_ceremony' || s.phase === 'retired') return null;
    if (s.phase === 'playing' && s.age >= minAge) return s;
    const [label, next] = step(E, s, cfg, k, clubs);
    if (label === null) return null;
    s = next;
  }
  return null;
}

function newCfg(seed) {
  return {
    seed,
    boost: BOOSTS[seed % BOOSTS.length],
    star: seed % 12 === 6,
    train: seed % 3 !== 0,
    boosted: false,
    posts: {},
    cover: { yes: 0, no: 0 },
  };
}

function summary(s) {
  return {
    age: s.age,
    phase: s.phase,
    seasons: (s.seasons || []).length,
    followers: s.socialMediaFollowers,
    tier: s.activeSponsorship,
    cover: s.coverAthleteAccepted,
    personality: s.personality ?? null,
    agent: s.agentId ?? null,
    netWorth: s.netWorth,
    agentFees: s.agentFeesPaid,
    sponsorIncome: s.sponsorshipIncome,
  };
}

function probeCareers(E) {
  const clubs = E.FALLBACK_CLUBS;
  const out = [];
  for (let seed = 1; seed <= 48; seed += 1) {
    const cfg = newCfg(seed);
    const real = Math.random;
    Math.random = mulberry32(seed * 2654435 + 835);
    const steps = [];
    let s;
    try {
      const [era, year] = STARTS[seed % STARTS.length];
      const ovr = 55 + ((seed * 7) % 20);
      s = E.initCareer(`Probe ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], era, stats(ovr), ovr, year, clubs, null, POTS[seed % POTS.length]);
      steps.push('i:' + hashOf(s));
      s = driveFrom(E, s, cfg, clubs, 600, steps);
      steps.push('l:' + hashOf(E.calculateLegacy(s)));
    } finally {
      Math.random = real;
    }
    out.push({ seed, steps: steps.join(' '), posts: cfg.posts, cover: cfg.cover, end: summary(s) });
  }
  return out;
}

/** Saves written before the tier and agent fields existed, or carrying the
 *  values a repair has to map, loaded and played on for a few seasons. */
function probeOldSaves(E) {
  const clubs = E.FALLBACK_CLUBS;
  const out = [];
  let n = 0;
  for (const tier of LEGACY_TIERS) {
    for (const deal of LEGACY_DEALS) {
      n += 1;
      const seed = 900 + n;
      const cfg = newCfg(seed);
      cfg.boost = null;
      const real = Math.random;
      Math.random = mulberry32(seed * 7907 + 35);
      const steps = [];
      let s;
      try {
        s = E.initCareer(`Old ${n}`, NATIONS[n % NATIONS.length], POSITIONS[n % POSITIONS.length], '2010s', stats(66), 66, 2012, clubs, null, 86);
        s = driveFrom(E, s, cfg, clubs, 60, []);
        /* What localStorage hands back: functions gone, then the old fields. */
        const raw = JSON.parse(JSON.stringify(s));
        raw.activeSponsorship = tier;
        raw.sponsorDeal = deal;
        if (n % 3 === 0) { delete raw.personality; delete raw.agentId; }
        if (n % 4 === 0) { delete raw.sponsorBonus; delete raw.agentFeesPaid; }
        if (n % 5 === 0) raw.socialMediaFollowers = 16 + n;
        steps.push('v:' + hashOf(raw));
        s = E.repairCareer(raw);
        steps.push('r:' + hashOf(s));
        s = driveFrom(E, s, cfg, clubs, 80, steps);
      } finally {
        Math.random = real;
      }
      /* Indexes into the two lists, not the values: the values are old save
         strings, and one of them trips the rival names guard when it is
         written in the clear in a data file. */
      out.push({ tier: LEGACY_TIERS.indexOf(tier), deal: LEGACY_DEALS.indexOf(deal), steps: steps.join(' '), end: summary(s) });
    }
  }
  return out;
}

/** A synthetic save carrying every field the lifted code reads. */
function synthetic(i) {
  const r = mulberry32(i * 104729 + 11);
  const ladder = [0, 0.5, 0.99, 1, 4.99, 5, 14.99, 15, 29.99, 30, 49.99, 50, 51, 80];
  return {
    playerName: `Unit ${i}`,
    age: 18 + (i % 18),
    overall: 80 + (i % 16),
    popularity: Math.floor(r() * 101),
    morale: Math.floor(r() * 101),
    netWorth: Math.round(r() * 400) / 10,
    socialMediaFollowers: ladder[i % ladder.length],
    socialMediaActionUsedThisSeason: i % 9 === 4,
    socialMediaFocusBoost: i % 7 === 3,
    pendingCoverAthleteEvent: i % 11 === 5,
    coverAthleteAccepted: i % 13 === 6,
    activeSponsorship: [null, 'local_brand', 'nike_adidas', 'global_ambassador', 'merchandise_line', 'cover_athlete'][i % 6],
    rival: i % 4 === 0 ? null : { name: `Rival ${i}`, retired: i % 4 === 3 },
    events: ['earlier line'],
    awards: [],
    seasons: i % 10 === 0 ? [] : [{ year: 2010 + (i % 15) }],
    phase: 'social_media_action',
  };
}

/** Run fn on a seeded Math.random, restored afterwards. */
function seeded(seed, fn) {
  const real = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = real; }
}

function probeUnits(E, L) {
  const posts = [];
  for (const id of [...POST_IDS, 'not_a_post']) {
    for (let i = 0; i < 28; i += 1) {
      const next = seeded(i * 3001 + id.length * 17 + 5, () => E.applySocialMediaAction(synthetic(i), id));
      posts.push(`${id}/${i}:${hashOf(next)}`);
    }
  }
  const cover = [];
  for (const accept of [true, false]) {
    for (let i = 0; i < 14; i += 1) {
      const next = seeded(i * 17 + 3, () => E.handleCoverAthleteDecision(synthetic(i), accept));
      cover.push(`${accept}/${i}:${hashOf(next)}`);
    }
  }
  const agents = [];
  const clubs = E.FALLBACK_CLUBS;
  AGENT_IDS.forEach((agentId, ai) => {
    [0, 0.4, 12.5, 80].forEach((fee, fi) => {
      for (const homegrown of [false, true]) {
        const next = seeded(ai * 101 + fi * 7 + (homegrown ? 1 : 0), () => {
          const s = E.initCareer('Agent Probe', 'England', 'ST', '2020s', stats(70), 70, 2020, clubs, null, 88);
          if (agentId === undefined) delete s.agentId; else s.agentId = agentId;
          const club = clubs[(fi * 5 + ai) % clubs.length];
          const offer = { club, wage: 41250, contractYears: 4, transferFee: fee, isHomegrown: homegrown };
          return E.acceptOffer(s, offer);
        });
        agents.push(`${agentId}/${fee}/${homegrown}:${hashOf(next)}`);
      }
    });
  });
  const mults = {};
  for (const id of PERSONALITY_IDS) {
    mults[`p:${id}`] = [L.personalityFollowerMult(id), L.personalitySponsorMult(id)];
  }
  for (const id of AGENT_IDS) {
    mults[`a:${id}`] = [L.agentWageMult(id), L.agentIncomeCutRate(id), L.agentTransferCutRate(id)];
  }
  const defs = {
    posts: E.SOCIAL_MEDIA_ACTIONS,
    tiers: E.SPONSORSHIP_TIERS,
    personalities: L.PERSONALITIES.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, blurb: p.blurb, perk: p.perk })),
    agents: L.AGENTS.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, blurb: a.blurb, wageMult: a.wageMult, incomeCut: a.incomeCut, transferCut: a.transferCut })),
    personalityLookups: PERSONALITY_IDS.map(id => L.getPersonalityDef(id)?.name ?? null),
    agentLookups: AGENT_IDS.map(id => L.getAgentDef(id)?.name ?? null),
  };
  const beats = [];
  for (const personality of [undefined, null, 'showman']) {
    for (const agentId of [undefined, null, 'shark']) {
      for (const age of [16, 17, 18, 19, 20, 24]) {
        for (const retired of [false, true]) {
          for (const inj of [0, 1, 2]) {
            const seriousInjuries = inj === 0 ? undefined : [{ year: inj === 1 ? 2019 : 2012 }];
            const s = { personality, agentId, age, retired, seriousInjuries, seasons: [{ year: 2020 }] };
            beats.push(L.getPriorityLifeEventIds(s).join(','));
          }
        }
      }
    }
  }
  return { posts, cover, agents, mults, defs, beats };
}

export function probeSoccerBrand({ soccer, life }) {
  return {
    careers: probeCareers(soccer),
    oldSaves: probeOldSaves(soccer),
    units: probeUnits(soccer, life),
  };
}
