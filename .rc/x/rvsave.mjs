// Reviewer's old save and default path check for Round 1146 (never committed). On the runner: node .rc/x/rvsave.mjs
// BASE is the tree the round was cut from (git archive of RV_BASE_SHA), BRANCH is the checked out head.
//  1 nocoach   BASE and BRANCH play the same careers on the same stream, every match stopped at the break and finished
//              WITHOUT the quick sim's coach: only own goals differ, so everything but scorer credit must be byte equal
//  2 legsout   BASE with its coach against BRANCH with the one restLegs call taken out: byte equal the same way
//  3 oldsave   a BASE save (before a match, and stopped at the break) opened by BRANCH and played on: loads, plays to
//              the end of the season and through the summer, the first half it had is kept and unmarked
//  4 legs      BASE against BRANCH as shipped, quick sims: printed only (results are allowed to move here)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvsave-'));
const BASE_SHA = process.env.RV_BASE_SHA || 'cbff760c';
const KEY = 'dukb-club-manager-save';
const CLUBS = (process.env.CLUBS ?? 'Everton,Real Madrid,Ajax,Aston Villa,Barcelona,Manchester City').split(',');
const SEEDS = Number(process.env.SEEDS ?? 2);
const SEASONS = Number(process.env.SEASONS ?? 2);
const ENGINE = 'src/lib/clubManager.ts';

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };

async function engine(label, root, patches = []) {
  const out = path.join(TMP, `${label}.mjs`);
  let applied = 0;
  await build({
    entryPoints: [path.join(root, ENGINE)], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'rv-patch', setup(b) {
      b.onLoad({ filter: /clubManager\.ts$/ }, args => {
        if (!patches.length || path.resolve(args.path) !== path.resolve(root, ENGINE)) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of patches) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`patch anchor occurs ${n} times: ${p.from}`);
          text = text.replace(p.from, () => p.to);
          applied += 1;
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied !== patches.length) throw new Error(`${label}: a patch never met its file`);
  return import(pathToFileURL(out).href);
}

function counted(seed) {
  let a = seed >>> 0; let calls = 0;
  const draw = () => { calls += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  draw.calls = () => calls;
  return draw;
}
/** Run fn on a counted seeded stream with the clock held. */
function onStream(seed, fn) {
  const draw = counted(seed); const real = Math.random; const realNow = Date.now;
  Math.random = draw; Date.now = () => 1791302400000;
  try { return fn(draw); } finally { Math.random = real; Date.now = realNow; }
}
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clone = v => JSON.parse(JSON.stringify(v));

/** Everything a result is and nothing a scorer credit is (the shape scripts/simCmOwnGoals.mjs compares). */
function resultFace(s, calls) {
  return {
    calls, season: s.season, week: s.week, budget: s.budget, confidence: s.boardConfidence, sacked: !!s.sacked,
    table: s.table, form: s.form, results: (s.resultLog ?? []).map(r => [r.week, r.opp, r.score, r.res, r.comp]),
    squad: s.squad.map(p => [p.id, p.name, p.rating, p.morale, p.fitness, p.apps ?? 0, p.injuryWeeks, p.suspendedMatches, p.value, p.wage, p.seasonYellows ?? 0, p.seasonReds ?? 0, p.cleanSheets ?? 0]),
    race: s.scorerRace ?? [], world: Object.fromEntries(Object.entries(s.world ?? {}).map(([id, w]) => [id, w?.table ?? null])),
    cup: s.cupRound, ucl: s.uclKoRound, trophies: s.trophies, history: s.history, stats: s.careerStats, strengths: s.clubStrengths,
  };
}
const goalFace = l => [l.minute, l.plus ?? 0, !!l.penalty, !!l.freeKick];
const matchFace = r => ({
  mine: r.myScorers.map(l => ({ at: goalFace(l), name: l.name, og: !!l.og, assist: l.assist ?? null })),
  theirs: r.oppScorers.map(l => ({ at: goalFace(l), name: l.name, og: !!l.og })),
  subs: (r.detail?.subs ?? []).length,
});

/** Play on from `start` (or a new career) for `seasons` seasons. `finish` is the options of the call that ends a match. */
function play(cm, club, seed, seasons, { pause, finish, start }) {
  return onStream(seed, draw => {
    const out = { faces: [], matches: [], threw: null };
    try {
      let s = start ? clone(start) : cm.startCareer(club);
      for (let season = 0; season < seasons; season++) {
        let guard = 0;
        while (s.week < s.calendar.length && guard++ < 220) {
          let r = cm.playNextEntry(s, pause ? undefined : finish);
          if (r.kind === 'halftime') r = cm.playNextEntry(r.state, finish);
          s = r.state;
          if (r.kind === 'match') out.matches.push(matchFace(r.report));
          if (r.kind === 'seasonOver') break;
        }
        out.faces.push(sha(resultFace(s, draw.calls())));
        const fin = cm.finishSeason(s);
        s = cm.startNextSeason(fin.state);
        out.faces.push(sha(resultFace(s, draw.calls())));
      }
      out.end = s;
    } catch (e) { out.threw = String(e?.stack ?? e).slice(0, 600); }
    return out;
  });
}

let checks = 0; const fails = [];
const check = (ok, message) => { checks += 1; if (!ok) { fails.push(message); console.log(`  FAIL: ${message}`); } };

/* ---------- engines ---------- */
const baseRoot = path.join(TMP, 'base');
fs.mkdirSync(baseRoot, { recursive: true });
execSync(`git archive ${BASE_SHA} src | tar -x -C "${baseRoot}"`, { cwd: ROOT, stdio: 'inherit', shell: '/bin/bash' });
const cmBase = await engine('base', baseRoot);
const cmBranch = await engine('branch', ROOT);
const cmLegsOut = await engine('legsout', ROOT, [{ from: '    restLegs(at);', to: '    void restLegs;' }]);
console.log(`engines: base ${BASE_SHA} (own goals: ${typeof cmBase.CM_OWN_GOAL_ONE_IN}), branch (own goals: ${typeof cmBranch.CM_OWN_GOAL_ONE_IN})`);

/** Two plays of one career that may differ ONLY in who a goal is credited to. */
function compare(section, where, a, b) {
  check(!a.threw && !b.threw, `${section} ${where}: threw: ${a.threw ?? ''} ${b.threw ?? ''}`);
  if (a.threw || b.threw) return { og: 0, matches: 0 };
  check(a.faces.length === b.faces.length && a.faces.every((f, i) => f === b.faces[i]), `${section} ${where}: the result faces differ (${a.faces.map((f, i) => (f === b.faces[i] ? '=' : 'X')).join('')})`);
  check(a.matches.length === b.matches.length, `${section} ${where}: ${a.matches.length} matches against ${b.matches.length}`);
  let og = 0; let bad = 0;
  for (let i = 0; i < Math.min(a.matches.length, b.matches.length); i++) {
    for (const side of ['mine', 'theirs']) {
      const x = a.matches[i][side]; const y = b.matches[i][side];
      if (x.length !== y.length) { bad += 1; continue; }
      for (let k = 0; k < x.length; k++) {
        if (x[k].at.join() !== y[k].at.join()) bad += 1;
        else if (y[k].og) { og += 1; if (y[k].assist) bad += 1; }
        else if (x[k].name !== y[k].name || (x[k].assist ?? null) !== (y[k].assist ?? null)) bad += 1;
      }
    }
    if (a.matches[i].subs !== b.matches[i].subs) bad += 1;
  }
  check(bad === 0, `${section} ${where}: ${bad} goal lines or sub counts differ beyond an own goal's credit`);
  return { og, matches: a.matches.length };
}

/* ---------- 1 and 2: the default path, base against branch ---------- */
for (const [section, cmB, opts] of [
  ['nocoach', cmBranch, { pause: true, finish: { skipHalftime: true, noCoach: true } }],
  ['legsout', cmLegsOut, { pause: false, finish: { skipHalftime: true } }],
  ['legsout-paused', cmLegsOut, { pause: true, finish: { skipHalftime: true } }],
]) {
  let og = 0; let matches = 0; let careers = 0;
  for (const club of CLUBS) for (let k = 0; k < SEEDS; k++) {
    const seed = 9100 + CLUBS.indexOf(club) * 17 + k * 101;
    const a = play(cmBase, club, seed, SEASONS, opts);
    const b = play(cmB, club, seed, SEASONS, opts);
    const got = compare(section, `${club} seed ${seed}`, a, b);
    og += got.og; matches += got.matches; careers += 1;
  }
  console.log(`${section}: ${careers} careers, ${matches} matches, ${og} own goals on the branch side, ${fails.length} failures so far`);
  check(og > 0, `${section}: not one own goal on the branch in ${matches} matches, so the comparison proved nothing`);
}

/* ---------- 3: an old save ---------- */
{
  const club = CLUBS[0];
  /* written by the BASE engine, 14 matches into a season */
  const pre = onStream(5150, () => {
    let s = cmBase.startCareer(club); let played = 0; let guard = 0;
    while (played < 14 && guard++ < 160) { const r = cmBase.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'match') played += 1; }
    return s;
  });
  let paused = null; let pausedSeed = 0;
  for (let seed = 7000; seed < 7400 && !paused; seed++) {
    const stop = onStream(seed, () => cmBase.playNextEntry(clone(pre)));
    /* no first half injury: the coach replaces an injured man AT his minute, which redraws what followed (Round 1072's rule, not this round's) */
    if (stop.kind === 'halftime' && (stop.state.live.h1My ?? []).length >= 1 && (stop.state.live.h1Opp ?? []).length >= 1
      && (stop.state.live.h1Injuries ?? []).length === 0) { paused = stop.state; pausedSeed = seed; }
  }
  check(!!paused, 'oldsave: no first half with a goal each way in 400 seeds');
  for (const [name, state] of [['before a match', pre], ['stopped at the break', paused]]) {
    if (!state) continue;
    memory.delete(KEY);
    check(cmBase.saveCareer(state), `oldsave ${name}: the base engine refused to save`);
    const raw = memory.get(KEY);
    const byBase = onStream(1, () => cmBase.loadCareer());
    memory.set(KEY, raw);
    const byBranch = onStream(1, () => cmBranch.loadCareer());
    check(!!byBranch, `oldsave ${name}: the branch does not open the base engine's save`);
    if (!byBranch || !byBase) continue;
    check(sha(byBase) === sha(byBranch), `oldsave ${name}: the branch opens it as another career than the base does`);
    console.log(`oldsave ${name}: ${(raw.length / 1024).toFixed(0)}K, opens on the branch, same as the base opens it: ${sha(byBase) === sha(byBranch)}`);
    /* played on without the coach: the same season as the base engine plays from it, own goals apart */
    const a = play(cmBase, club, 6161, 1, { pause: true, finish: { skipHalftime: true, noCoach: true }, start: byBase });
    const b = play(cmBranch, club, 6161, 1, { pause: true, finish: { skipHalftime: true, noCoach: true }, start: byBranch });
    const got = compare('oldsave', `${name}, played on without the coach`, a, b);
    console.log(`oldsave ${name}: played on ${got.matches} matches and a summer on both engines, ${got.og} own goals on the branch`);
    /* and as a player would: quick sims with the branch's coach */
    const c = play(cmBranch, club, 6262, 2, { pause: false, finish: { skipHalftime: true }, start: byBranch });
    check(!c.threw, `oldsave ${name}: quick simmed on by the branch threw: ${c.threw}`);
    console.log(`oldsave ${name}: quick simmed on for two seasons by the branch: ${c.threw ? 'THREW' : `${c.matches.length} matches`}`);
    if (state === paused) {
      /* the half it had: finished by the branch's quick sim, every first half line is still there and none is an own goal */
      const done = onStream(pausedSeed + 1, () => cmBranch.playNextEntry(clone(byBranch), { skipHalftime: true }));
      check(done.kind === 'match', `oldsave paused: finishing it gave ${done.kind}`);
      if (done.kind === 'match') {
        const had = [...paused.live.h1My.map(g => ['mine', g]), ...paused.live.h1Opp.map(g => ['theirs', g])];
        for (const [side, g] of had) {
          const list = side === 'mine' ? done.report.myScorers : done.report.oppScorers;
          const kept = list.find(l => l.minute === g.minute && (l.plus ?? 0) === (g.plus ?? 0) && l.name === g.name && !l.og);
          check(!!kept, `oldsave paused: the first half goal ${g.name} ${g.minute}' is not on the report as it was`);
        }
        console.log(`oldsave paused: ${had.length} first half goals kept as they were, ${done.report.detail?.subs?.length ?? 0} changes made by the coach after the break`);
      }
    }
  }
}

/* ---------- 4: what the coach moves (printed, never asserted) ---------- */
{
  const tot = { base: { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0, subs: 0 }, branch: { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0, subs: 0 } };
  for (const club of CLUBS) for (let k = 0; k < SEEDS; k++) {
    const seed = 9100 + CLUBS.indexOf(club) * 17 + k * 101;
    for (const [name, cm] of [['base', cmBase], ['branch', cmBranch]]) {
      const r = play(cm, club, seed, 1, { pause: false, finish: { skipHalftime: true } });
      for (const m of r.matches) {
        const t = tot[name]; t.n += 1; t.gf += m.mine.length; t.ga += m.theirs.length; t.subs += m.subs;
        if (m.mine.length > m.theirs.length) t.w += 1; else if (m.mine.length === m.theirs.length) t.d += 1; else t.l += 1;
      }
    }
  }
  for (const [name, t] of Object.entries(tot)) console.log(`legs ${name}: ${t.n} matches, W ${(100 * t.w / t.n).toFixed(1)} D ${(100 * t.d / t.n).toFixed(1)} L ${(100 * t.l / t.n).toFixed(1)}, goals ${(t.gf / t.n).toFixed(2)} for ${(t.ga / t.n).toFixed(2)} against, ${(t.subs / t.n).toFixed(2)} changes a match`);
}

console.log(fails.length ? `rvsave: FAIL, ${fails.length} of ${checks} checks red` : `rvsave: PASS, ${checks} checks`);
process.exit(fails.length ? 1 : 0);
