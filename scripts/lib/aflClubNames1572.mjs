/**
 * Round 1572: the one bot, the one bundler and the one mask shared by the base
 * recorder (scripts/recordAussieV2SaveFixture1572.mjs) and the harness
 * (scripts/simAflClubNames.mjs), so the harness replays exactly what was recorded.
 *
 * THE BOT is fixed and draws nothing: train unless the matchday 23 averages over
 * 40 fatigue, play quarter by quarter with a tactic by round parity, one same role
 * swap at the first break of odd rounds, simWeek when the club has no game, the
 * list manager drafts. Every action must change the state: a refused action is a
 * stuck career and throws.
 *
 * THE MASK hides the only things a club set may change: every club's name, the
 * save's clubName and its clubSet key. Two careers with equal masked JSON are the
 * same game with other words on it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const sha = text => createHash('sha256').update(text).digest('hex');
export const lf = text => text.split('\r\n').join('\n');

/* The base fleet: seeds 1 to 24 by one club of tier 1, 3 and 5 (the same tiers in both sets), two seasons each. */
export const FLEET_CLUBS = ['club-00', 'club-06', 'club-17'];
export const FLEET_SEEDS = Array.from({ length: 24 }, (_, i) => i + 1);
/* The default identity run (critic advice 10): three seeds by the three clubs. AFL_NAMES_LONG=1 runs all 72. */
export const SHORT_SEEDS = [1, 12, 24];
export const FLEET_SEASONS = 2;
export const MORE = 60;

/**
 * Bundles the engine (and anything in `entries`) into a fresh temp file, imports it and deletes it.
 * `patch` is [relative file, anchor, replacement]: the anchor must occur exactly once and the text must change.
 */
export async function bundle(ROOT, { entries = ["export * from './src/lib/aussieRulesLeague.ts';"], patch = null, metafile = false } = {}) {
  const esbuild = await import('esbuild');
  let patched = false;
  const plugin = {
    name: 'afl-club-names-control',
    setup(build) {
      build.onLoad({ filter: /(aussieRulesLeague|aussieRulesManager|aussieRulesFormat|aflClubs2026)\.ts$/ }, args => {
        const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
        let src = lf(fs.readFileSync(args.path, 'utf8'));
        if (patch && patch[0] === rel) {
          const count = src.split(patch[1]).length - 1;
          if (count !== 1) { console.error(`control cannot run: its anchor occurs ${count} times in ${rel}`); process.exit(2); }
          const next = src.replace(patch[1], patch[2]);
          if (next === src) { console.error('control changed nothing'); process.exit(2); }
          src = next; patched = true;
        }
        return { contents: src, loader: 'ts' };
      });
    },
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `aflClubNames-${process.pid}-${Date.now()}-`));
  const out = path.join(dir, 'bundle.mjs');
  const result = await esbuild.build({
    stdin: { contents: entries.join('\n'), resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', plugins: [plugin], metafile, absWorkingDir: ROOT,
  });
  const L = await import(pathToFileURL(out).href);
  fs.rmSync(dir, { recursive: true, force: true });
  if (patch && !patched) { console.error(`control: ${patch[0]} was never bundled`); process.exit(2); }
  const inputs = metafile ? Object.keys(result.metafile.inputs).filter(p => !p.startsWith('<')).map(p => p.split(path.sep).join('/')).sort() : [];
  return { L, inputs };
}

export function botAction(L, s) {
  if (s.phase === 'prepare') {
    if (!s.match) return { type: 'simWeek' };
    const club = L.clubOf(s, s.myClub);
    const ids = new Set([...s.starters, ...s.bench]);
    const tired = club.players.filter(p => ids.has(p.id)).reduce((sum, p) => sum + p.fatigue, 0) / 23;
    return { type: 'prepare', choice: tired > 40 ? 'rest' : 'train' };
  }
  if (s.phase === 'quarter') return { type: 'play', tactic: s.match.round % 2 === 0 ? 'control' : 'pressure' };
  if (s.phase === 'break') {
    if (s.match.round % 2 === 1 && s.match.quarter === 1 && s.swapsThisBreak === 0) {
      for (const outId of s.starters) {
        const role = L.leaguePlayer(s, outId).role;
        const inId = s.bench.find(id => L.leaguePlayer(s, id).role === role);
        if (inId) return { type: 'swap', outId, inId };
      }
    }
    return { type: 'next' };
  }
  if (s.phase === 'draft' && s.draft && s.draft.at < s.draft.order.length) return { type: 'draftAuto' };
  return { type: 'next' };
}

/** One bot action; throws on a refusal so a stuck career can never pass as a shorter one. */
export function step(L, s) {
  const action = botAction(L, s);
  const next = L.reduceLeague(s, action);
  if (next === s) throw new Error(`stuck: ${action.type} refused at ${s.phase}/${s.stage} season ${s.season} round ${s.round + 1}`);
  return next;
}
export function play(L, s, count) { let state = s; for (let i = 0; i < count; i += 1) state = step(L, state); return state; }

export function mask(s) {
  const copy = { ...s, clubName: s.myClub, clubs: s.clubs.map(club => ({ ...club, name: club.id })) };
  delete copy.clubSet;
  return copy;
}
export const rawHash = s => sha(JSON.stringify(s));
export const maskedHash = s => sha(JSON.stringify(mask(s)));

/**
 * Plays one fleet career; a checkpoint at each season close and at the end (the next season's
 * first state), each with its raw and masked hash. `extra(state)` adds what a caller wants to read.
 */
export function fleetCareer(L, seed, clubId, set, extra = () => ({})) {
  let s = set ? L.createLeague(seed, clubId, set) : L.createLeague(seed, clubId);
  if (!s) throw new Error(`createLeague refused ${seed} ${clubId}`);
  const points = [];
  const point = (at, state) => ({ at, season: state.season, phase: state.phase, raw: rawHash(state), masked: maskedHash(state), ...extra(state) });
  let actions = 0;
  while (s.season <= FLEET_SEASONS) {
    const next = step(L, s);
    actions += 1;
    if (next.phase === 'seasonOver' && s.phase !== 'seasonOver') points.push(point(actions, next));
    s = next;
  }
  points.push(point(actions, s));
  return points;
}

/*
 * The save recipes: each group is one career played from createLeague, and each target is
 * the first action count at which its test holds. 16 targets, at least one club per tier.
 */
export const RECIPE_GROUPS = [
  { seed: 7, club: 'club-06', targets: [
    ['prepare', s => s.season === 1 && s.round === 2 && s.phase === 'prepare' && !!s.match],
    ['quarter', s => s.season === 1 && s.round === 2 && s.phase === 'quarter' && s.match.quarter === 0],
    ['breakAfterSwap', s => s.phase === 'break' && s.swapsThisBreak > 0],
    ['report', s => s.season === 1 && s.round === 4 && s.phase === 'report'],
    ['lastHomeAway', s => s.season === 1 && s.stage === 'homeAway' && s.round === 22 && s.phase === 'prepare'],
    ['finalsPrepare', s => s.stage === 'finals' && s.phase === 'prepare'],
    ['finalsReport', s => s.stage === 'finals' && s.phase === 'report'],
    ['seasonOver', s => s.phase === 'seasonOver'],
    ['summer', s => s.phase === 'summer'],
    ['draftPart', s => s.phase === 'draft' && s.draft.at > 0 && s.draft.at < s.draft.order.length],
    ['season2Prepare', s => s.season === 2 && s.phase === 'prepare' && !!s.match && s.round === 1],
    ['season3Break', s => s.season === 3 && s.phase === 'break'],
  ] },
  { seed: 11, club: 'club-00', targets: [['tier1MidMatch', s => s.round === 6 && s.phase === 'break' && s.match.quarter === 2]] },
  { seed: 12, club: 'club-02', targets: [['tier2FinalsNoGame', s => s.stage === 'finals' && s.phase === 'prepare' && !s.match]] },
  { seed: 13, club: 'club-03', targets: [['tier4Break', s => s.round === 8 && s.phase === 'break' && s.match.quarter === 3]] },
  { seed: 14, club: 'club-05', targets: [['tier5Season2Report', s => s.season === 2 && s.round === 0 && s.phase === 'report']] },
];
export const RECIPE_CAP = 6000;

/** Plays a recipe group from createLeague and calls onTarget(name, at, state) the first time each target holds. */
export function runGroup(L, group, onTarget, set) {
  let s = set ? L.createLeague(group.seed, group.club, set) : L.createLeague(group.seed, group.club);
  if (!s) throw new Error(`createLeague refused ${group.seed} ${group.club}`);
  const left = new Map(group.targets);
  let at = 0;
  for (;;) {
    for (const [name, test] of [...left]) if (test(s)) { onTarget(name, at, s); left.delete(name); }
    if (!left.size) return;
    if (at >= RECIPE_CAP) throw new Error(`seed ${group.seed} ${group.club}: never reached ${[...left.keys()].join(', ')} in ${RECIPE_CAP} actions`);
    s = step(L, s);
    at += 1;
  }
}
