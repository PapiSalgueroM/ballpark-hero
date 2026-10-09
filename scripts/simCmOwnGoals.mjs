/**
 * Round 1146 harness: own goals and penalty marks in Club Manager.
 *
 * Two players' reports, 2026-10-09: "if a player scores a penalty in manager
 * mode, it should show (P) next to their goal" and "make it so a player can
 * score an own goal. it'll show (O.G) next to the goal". An own goal here is a
 * goal the match already had, RE-LABELLED (tagOwnGoals in src/lib/clubManager.ts,
 * over the rule the Soccer Career Season Centre reads, src/lib/ownGoalRule.ts).
 * So the failure modes are: the re-label moves a result or a seeded draw; the
 * attacker keeps a goal that is no longer his; a penalty is called an own goal;
 * the man named is not a defender or the keeper of the side that conceded, or
 * was not on the pitch; a goal recorded before the round is re-labelled.
 *
 * What it plays: FLEET careers (clubs x seeds x SEASONS whole seasons, summers
 * included), every match as a quick sim that pauses at the break (so the eleven
 * that kicked off is known) and is then finished by the quick sim's own coach.
 * Each career is played TWICE on the same seeded stream: by the engine as
 * committed (the candidate) and by the same engine with the one tagOwnGoals call
 * taken out (the baseline, which is the engine before the round). Sections:
 *
 *   1 digest   the two careers agree byte for byte on every result, table,
 *              squad condition, rival tally and on HOW MANY draws the stream
 *              gave, season by season, summers included
 *   2 share    own goals are a 1 in 32 keyed draw over the eligible goals: the
 *              count sits inside four binomial standard deviations of
 *              eligible / 32, on at least FLOOR eligible goals
 *   3 marks    no goal is both from the spot and an own goal, none is a free
 *              kick and an own goal, an own goal has no assist, and the
 *              timeline row of every goal carries the flags of its scorer line
 *   4 man      the man behind an own goal is a defender or the keeper of the
 *              side that conceded it and was on its pitch at that minute
 *              (mine is read in the slot he was STANDING in, the engine's
 *              rule everywhere else, theirs off their line)
 *     weights  a defender is twice as likely as the keeper: two places to
 *              one in the engine's ownGoalMan, read on 18,000 keys
 *     gone     a man of mine who has left the pitch is never named: real
 *              matches played again with two backs sent off before the
 *              break, on an engine where every eligible goal is an own goal
 *   5 credit  every one of my players' season goals and assists moved by
 *              exactly the lines that name him, and the candidate's tallies
 *              are the baseline's minus the own goals, never above them
 *   6 inflight a first half recorded by the baseline engine and finished by
 *              the candidate keeps the goals it had, unmarked
 *
 * MEASURED on a GitHub runner, 2026-10-09, the default fleet (6 clubs x 3
 * seeds x 2 seasons, 18 careers) on five seed sets. Re-taken at a0b1e0b7:
 * the table this header first carried was taken before the quick sim's coach
 * (the round's third step) and the review's last ten fix moved every quick
 * sim, and it no longer reproduced.
 *   seedset  matches  goals  own goals     eligible  expected  z      for/against  keeper
 *   0        1643     4398    92 (2.09%)   3318      103.7     -1.17  59/33         9
 *   1        1644     4400    86 (1.95%)   3333      104.2     -1.81  43/43         8
 *   2        1648     4393    92 (2.09%)   3291      102.8     -1.09  59/33        11
 *   3        1616     4219    95 (2.25%)   3146       98.3     -0.34  55/40        18
 *   4        1673     4538   107 (2.36%)   3444      107.6     -0.06  55/52        18
 * "Eligible" is every goal that is not from the spot or a direct free kick,
 * minus my goals against a side with no named eleven (nobody to name), which
 * is why the share of ALL goals lands under 1 in 32: 2.0 to 2.4 in a hundred
 * here, 2.4 to 3.0 a season in my own matches. The real game runs near 3 in a
 * hundred. Penalties were 7.2 to 8.6 percent of goals (the engine deals 8)
 * and direct free kicks 3.3 to 4.2 (it deals 4).
 * Section 2 holds the count to four standard deviations of the binomial the
 * rule IS (about 40 own goals either side on these fleets). All five sets
 * read under the expectation this time (472 own goals against 516.6, 1.99
 * standard deviations under together); the five sets of the first table read
 * over it (553 against 529.1, 1.06 over), and the ten together are 0.65
 * under. A goal's key holds its minute and its scorer, so every re-take of
 * the fleet is a new sample of the same keyed draw. The two controls that
 * move the rate landed 10.35 (off) and 7.81 (double) away on seed set 0. The
 * floor of 2500 eligible goals sits under the smallest fleet measured (3146).
 * Section 1 agreed on all 90 careers, at the end of both seasons and after
 * both summers.
 * The man. 64 of the 472 were by a keeper. Of the 201 against me, 11 were by
 * a man standing at the back whose card says something else (he is read in
 * his slot). Section weights reads the keeper on 2,045 of 18,000 keyed picks
 * with four at the back (one place in nine is 2,000, the band is 169 either
 * side); with a place each (control evens) he reads 3,556. Section gone
 * played 142 to 156 matches a set again with two backs sent off in the 40th
 * minute and read 77 to 94 own goals against me after it, none by a man who
 * had gone; with the filter out (control ungone) 42 of 94 were. Its floor of
 * 20 sits far under those.
 * Awards over those 180 seasons (section 5 prints them): with own goals on,
 * my squad is 1.2 to 1.6 goals and 0.6 to 1.2 assists a season down and my
 * top scorer 0.3 to 0.4 goals a season down on a mean of 21 to 22.5. A
 * different man was top scorer at my club in 3 seasons; the golden boot, the
 * player of the season and the world award went to the same man in all 180
 * (on the first table's fleets they moved in 2, 1 and 2).
 *
 * NEGATIVE CONTROLS. CM_OWN_GOAL_CONTROL=<name> patches the bundled copy of
 * the source (never a file on disk; the anchor must occur exactly once or the
 * run refuses) and the run then exits 0 only if the NAMED section went red:
 *   off       the tag call removed                       -> share
 *   double    one in 16 instead of one in 32             -> share
 *   attacker  the attacker keeps the own goal in his season -> credit
 *   penalty   a goal from the spot may be tagged         -> marks
 *   digest    the scorer's lift is taken off an own goal -> digest
 *   ambient   the tag roll reads Math.random             -> digest
 *   striker   the man is picked from their forwards      -> man
 *   mystriker mine is picked from the men standing up front -> man
 *   evens     a defender holds one place, like the keeper -> weights
 *   ungone    a man of mine who has left can be named    -> gone
 * weights and gone were added after the round's review deleted the two
 * places to one and the "has he gone" filter with this harness green: the
 * fleet printed "0 by a keeper" and asserted nothing on it, and none of its
 * own goals fell after a red or an injury to one of my backs.
 *
 * Run: node scripts/simCmOwnGoals.mjs        (SEEDSET=n for another set of seeds)
 * Offline: bundles the engine from src, reads no network and no database.
 */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = 'src/lib/clubManager.ts';
const RULE = 'src/lib/ownGoalRule.ts';
const CONTROL = process.env.CM_OWN_GOAL_CONTROL || '';
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const SEEDS = Number(process.env.SEEDS ?? 3);
const SEASONS = Number(process.env.SEASONS ?? 2);
const CLUBS = (process.env.CLUBS ?? 'Everton,Real Madrid,Ajax,Aston Villa,Barcelona,Manchester City').split(',');
/** The fewest eligible goals section 2 will judge a share on. */
const FLOOR = Number(process.env.FLOOR ?? 2500);
const ONE_IN = 32;

const TAG_CALL = '  tagOwnGoals(state, live, fx, half, me.goals, oppGoals);';
const OFF = [{ file: ENGINE, from: TAG_CALL, to: '  void tagOwnGoals;' }];
const CONTROLS = {
  off: { patch: OFF, red: 'share' },
  double: { patch: [{ file: ENGINE, from: 'export const CM_OWN_GOAL_ONE_IN = 32;', to: 'export const CM_OWN_GOAL_ONE_IN = 16;' }], red: 'share' },
  attacker: { patch: [{ file: ENGINE, from: 'if (!own) sq.seasonGoals += 1;', to: 'sq.seasonGoals += 1;' }], red: 'credit' },
  penalty: { patch: [{ file: ENGINE, from: '!g.og && !g.penalty && !g.freeKick', to: '!g.og && !g.freeKick' }], red: 'marks' },
  digest: { patch: [{ file: ENGINE, from: '      sq.morale = clamp(sq.morale + 3, 5, 99);', to: '      if (!own) sq.morale = clamp(sq.morale + 3, 5, 99);' }], red: 'digest' },
  ambient: { patch: [{ file: RULE, from: 'if (keyedRng(`${key}|tag`)() >= 1 / oneIn) return false;', to: 'if (Math.random() >= 1 / oneIn) return false;' }], red: 'digest' },
  striker: { patch: [{ file: ENGINE, from: "there.filter(p => groupOf(p.p) === 'DEF'), there.find(p => p.p === 'GK') ?? null", to: "there.filter(p => groupOf(p.p) === 'ATT'), null" }], red: 'man' },
  mystriker: { patch: [{ file: ENGINE, from: "there.filter(p => lineAt.get(p.id) === 'defence'), there.find(p => lineAt.get(p.id) === 'keeper') ?? null", to: "there.filter(p => lineAt.get(p.id) === 'attack'), null" }], red: 'man' },
  evens: { patch: [{ file: ENGINE, from: 'const places = [...defenders, ...defenders, ...(keeper ? [keeper] : [])];', to: 'const places = [...defenders, ...(keeper ? [keeper] : [])];' }], red: 'weights' },
  ungone: { patch: [{ file: ENGINE, from: 'const there = squadByIds(state, myOnPitchAt(live, g.minute)).filter(p => !gone.has(p.id));', to: 'const there = squadByIds(state, myOnPitchAt(live, g.minute));' }], red: 'gone' },
};
/** The dense engine of section gone: every eligible goal with a man to name is an own goal. */
const DENSE = { file: ENGINE, from: 'export const CM_OWN_GOAL_ONE_IN = 32;', to: 'export const CM_OWN_GOAL_ONE_IN = 1;' };
/** How many careers of the fleet have every match of theirs played again for section gone. */
const PROBE = Number(process.env.PROBE ?? 2);
if (CONTROL && !Object.hasOwn(CONTROLS, CONTROL)) { console.error(`simCmOwnGoals: unknown control "${CONTROL}"`); process.exit(2); }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-og-'));
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engine, bundled from src with a list of exact text patches applied to the bundle's copy of the source. */
async function engine(label, patches) {
  const entry = path.join(TMP, `${label}-entry.mjs`);
  const out = path.join(TMP, `${label}.bundle.mjs`);
  fs.writeFileSync(entry, `export * from ${JSON.stringify(path.join(ROOT, ENGINE).replaceAll('\\', '/'))};\n`);
  const applied = new Set();
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
    absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
    plugins: [{ name: 'cm-own-goal-control', setup(b) {
      b.onLoad({ filter: /\.ts$/ }, args => {
        const mine = patches.filter(p => path.resolve(ROOT, p.file) === path.resolve(args.path));
        if (!mine.length) return undefined;
        let text = fs.readFileSync(args.path, 'utf8').replace(/\r\n/g, '\n');
        for (const p of mine) {
          const n = text.split(p.from).length - 1;
          if (n !== 1) throw new Error(`control anchor occurs ${n} times, not once, in ${p.file}: ${p.from}`);
          text = text.replace(p.from, p.to);
          applied.add(p);
        }
        return { contents: text, loader: 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (applied.size !== patches.length) throw new Error(`${label}: ${patches.length - applied.size} patch(es) never met their file`);
  return import(pathToFileURL(out).href);
}

/* ---------- the seeded stream, counted ---------- */
function seeded(seed) {
  let a = seed >>> 0;
  let calls = 0;
  const draw = () => {
    calls += 1;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  draw.calls = () => calls;
  return draw;
}

const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const place = e => e.minute + (e.plus ?? 0) / 100;
const tallies = s => new Map(s.squad.map(p => [p.id, {
  name: p.name, goals: p.seasonGoals ?? 0, assists: p.seasonAssists ?? 0,
  comp: Object.values(p.comp ?? {}).reduce((n, l) => n + (l?.goals ?? 0), 0),
}]));

/** Everything a result is, and nothing a scorer credit is: what section 1 compares. */
function resultFace(s, calls) {
  return {
    calls, season: s.season, week: s.week, budget: s.budget, confidence: s.boardConfidence, sacked: !!s.sacked,
    table: s.table, form: s.form, results: (s.resultLog ?? []).map(r => [r.week, r.opp, r.score, r.res, r.comp]),
    squad: s.squad.map(p => [p.id, p.name, p.rating, p.morale, p.fitness, p.apps ?? 0, p.injuryWeeks, p.suspendedMatches, p.value, p.wage, p.seasonYellows ?? 0, p.seasonReds ?? 0, p.cleanSheets ?? 0]),
    race: s.scorerRace ?? [], world: Object.fromEntries(Object.entries(s.world ?? {}).map(([id, w]) => [id, w?.table ?? null])),
    cup: s.cupRound, ucl: s.uclKoRound, trophies: s.trophies, history: s.history, stats: s.careerStats, strengths: s.clubStrengths,
  };
}

/** One career: SEASONS seasons, every match paused at the break and finished by the quick sim. */
function playCareer(cm, club, seed, inflight, onHalf) {
  const draw = seeded(seed);
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = draw;
  Date.now = () => 1791302400000;
  const out = { club, seed, faces: [], matches: [], seasons: [], halves: [] };
  try {
    let s = cm.startCareer(club);
    for (let season = 0; season < SEASONS; season++) {
      let guard = 0;
      const seasonRow = { ownFor: 0, ownAgainst: 0, matches: 0 };
      while (s.week < s.calendar.length && guard++ < 200) {
        const before = tallies(s);
        let r = cm.playNextEntry(s);
        let startXi = null;
        let lines = null;
        if (r.kind === 'halftime') {
          startXi = r.state.live.startXi.slice();
          /* the band of the shape each starting slot belongs to (keeper, defence, midfield, attack), by the engine's own reading */
          const shape = cm.FORMATIONS[r.state.live.formationIndex ?? r.state.formationIndex] ?? cm.FORMATIONS[0];
          lines = startXi.map((_, i) => (shape.slots[i] ? cm.pitchLineOf(shape.slots[i]) : null));
          /* a save built off this break, played on another engine and another stream: the career's own stream is put back */
          if (onHalf) { const keep = Math.random; try { onHalf(r.state, out.matches.length); } finally { Math.random = keep; } }
          if (inflight) out.halves.push({ state: JSON.parse(JSON.stringify(r.state)), calls: draw.calls(), seed, at: out.matches.length });
          r = cm.playNextEntry(r.state, { skipHalftime: true });
        }
        s = r.state;
        if (r.kind === 'match') {
          out.matches.push({ season, report: r.report, startXi, lines, before, after: tallies(s), squad: new Map(s.squad.map(p => [p.id, p.position])), names: new Map(s.squad.map(p => [p.name, p.position])) });
          seasonRow.matches += 1;
          seasonRow.ownFor += r.report.myScorers.filter(l => l.og).length;
          seasonRow.ownAgainst += r.report.oppScorers.filter(l => l.og).length;
        }
        if (r.kind === 'seasonOver') break;
      }
      out.faces.push(sha(resultFace(s, draw.calls())));
      const fin = cm.finishSeason(s);
      seasonRow.tallies = tallies(s);
      seasonRow.summary = { topScorer: fin.summary.topScorer ?? null, goldenBoot: fin.summary.goldenBoot ?? null, poty: fin.summary.playerOfSeason ?? null, ballonDor: fin.summary.ballonDor ?? null };
      out.seasons.push(seasonRow);
      s = cm.startNextSeason(fin.state);
      out.faces.push(sha(resultFace(s, draw.calls())));
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
  }
  return out;
}

/* ---------- the sections ---------- */
const SECTIONS = ['digest', 'share', 'marks', 'man', 'weights', 'gone', 'credit', 'inflight'];
const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (section, message) => { const xs = red.get(section); xs.push(message); };
const tick = section => checked.set(section, checked.get(section) + 1);

const tot = { goals: 0, pens: 0, fks: 0, eligible: 0, og: { me: 0, opp: 0 }, ogKeeper: 0, ogOffCard: 0, manUnknown: 0, matches: 0, ogMatches: 0 };
/** Section gone: the matches played again on the dense engine, and the own goals against me read in them. */
const dense = { matches: 0, sentOff: 0, og: 0 };

/**
 * Section gone: a man of mine who has LEFT the pitch is never named. A fleet of whole careers never tests it (no
 * own goal of the five measured fleets fell after a red or an injury to one of my backs, so the filter could be
 * deleted with every section green), so the save is built: at the break of a real match two men standing at the
 * back are sent off in the 40th minute, and the match is finished on an engine where EVERY eligible goal is an
 * own goal (CM_OWN_GOAL_ONE_IN patched to 1). Each one against me after the break must name somebody else.
 */
function probeGone(cm, paused, seed) {
  const st = JSON.parse(JSON.stringify(paused));
  const live = st.live;
  const shape = cm.FORMATIONS[live.formationIndex ?? st.formationIndex] ?? cm.FORMATIONS[0];
  const out = cm.liveGoneIds(live, 45);
  const sentOff = [];
  for (let i = 0; i < live.onPitch.length && sentOff.length < 2; i++) {
    const man = st.squad.find(p => p.id === live.onPitch[i]);
    if (!man || out.has(man.id) || !shape.slots[i] || cm.pitchLineOf(shape.slots[i]) !== 'defence') continue;
    live.h1Cards = [...(live.h1Cards ?? []), { name: man.name, minute: 40, kind: 'red', id: man.id }];
    sentOff.push(man.name);
  }
  if (!sentOff.length) return;
  Math.random = seeded(seed);
  const done = cm.playNextEntry(st, { skipHalftime: true });
  if (done.kind !== 'match') return;
  /* Only a man the finished match still has down as sent off in the 40th minute. When a man of mine was hurt
     before that, the quick sim's coach replaces him at his minute and the rest of the first half is drawn again
     from there, the built red with it (3 of the first 161 matches, and the man was then rightly on the pitch). */
  const off = sentOff.filter(name => done.report.detail.cards.some(c => c.kind === 'red' && c.name === name && c.minute === 40));
  if (!off.length) return;
  dense.matches += 1;
  dense.sentOff += off.length;
  for (const line of done.report.oppScorers) {
    if (!line.og || line.minute <= 45) continue;
    dense.og += 1;
    tick('gone');
    if (off.includes(line.name)) fail('gone', `${line.name} was sent off in the 40th minute and is named for an own goal at ${line.minute}'`);
  }
}

/**
 * Section weights: "a defender twice as likely as the keeper" is two places to one in ownGoalMan, read here on
 * 18,000 keys of the harness's own with four at the back and a keeper. The rolls are keyed, so the counts are the
 * same on every run: the keeper holds one place in nine (2,000 of 18,000, measured 2,045) and each back two.
 * With one place each the keeper reads 3,600, with none 0; the band is four binomial standard deviations.
 */
function weights(cm) {
  const N = 18000;
  const backs = ['left back', 'left centre back', 'right centre back', 'right back'];
  const hits = new Map([...backs, 'keeper'].map(k => [k, 0]));
  for (let i = 0; i < N; i++) {
    const who = cm.ownGoalMan(`simCmOwnGoals|weights|${i}`, backs, 'keeper');
    hits.set(who, (hits.get(who) ?? 0) + 1);
  }
  const band = (share) => 4 * Math.sqrt(N * share * (1 - share));
  tick('weights');
  if (Math.abs(hits.get('keeper') - N / 9) > band(1 / 9)) fail('weights', `the keeper was named ${hits.get('keeper')} times in ${N} with four at the back, and one place in nine is ${N / 9}`);
  for (const b of backs) {
    tick('weights');
    if (Math.abs(hits.get(b) - 2 * N / 9) > band(2 / 9)) fail('weights', `the ${b} was named ${hits.get(b)} times in ${N}, and two places in nine is ${2 * N / 9}`);
  }
  tick('weights');
  if (cm.ownGoalMan('simCmOwnGoals|weights|nobody', [], null) !== null) fail('weights', 'with nobody at the back and no keeper somebody was still named');
  if (cm.ownGoalMan('simCmOwnGoals|weights|keeper', [], 'keeper') !== 'keeper') fail('weights', 'with only a keeper to name he was not named');
  if (!backs.includes(cm.ownGoalMan('simCmOwnGoals|weights|backs', backs, null))) fail('weights', 'with no keeper a back was not named');
  return hits;
}

/** Sections 3, 4 and 5 on one finished match of the candidate. */
function inspectMatch(cm, career, m) {
  const r = m.report;
  const d = r.detail;
  const where = `${career.club} seed ${career.seed} season ${m.season + 1}, match ${tot.matches + 1} of the fleet`;
  tot.matches += 1;
  if (!d) { fail('marks', `${where}: a report with no detail`); return; }
  let own = 0;
  for (const [side, list] of [['me', r.myScorers], ['opp', r.oppScorers]]) {
    for (const line of list) {
      tot.goals += 1;
      if (line.penalty) tot.pens += 1;
      if (line.freeKick) tot.fks += 1;
      /* a goal of mine needs a named opposition to have anybody to name */
      if (!line.penalty && !line.freeKick && (side === 'opp' || !!d.oppXi)) tot.eligible += 1;
      tick('marks');
      const row = d.timeline.find(e => e.kind === 'goal' && e.side === side && e.minute === line.minute && (e.plus ?? 0) === (line.plus ?? 0));
      if (!row) fail('marks', `${where}: ${line.name} ${line.minute}' has no timeline row`);
      else if (!!row.og !== !!line.og || !!row.penalty !== !!line.penalty) fail('marks', `${where}: the timeline row of ${line.name} ${line.minute}' carries other flags than his scorer line`);
      else if (row.text !== line.name && !row.text.startsWith(`${line.name} (assist: `)) fail('marks', `${where}: the timeline row at ${line.minute}' names "${row.text}", the list names ${line.name}`);
      if (!line.og) continue;
      own += 1;
      tot.og[side] += 1;
      if (line.penalty) fail('marks', `${where}: ${line.name} ${line.minute}' is both from the spot and an own goal`);
      if (line.freeKick) fail('marks', `${where}: ${line.name} ${line.minute}' is both a direct free kick and an own goal`);
      if (line.assist) fail('marks', `${where}: the own goal at ${line.minute}' has an assist`);
      tick('man');
      const at = place(line);
      if (side === 'me') {
        /* one of THEIRS: he kicked off or came on, had not gone off or been sent off, and plays at the back or in goal */
        const start = (d.oppXi ?? []).find(p => p.n === line.name);
        const on = (d.oppSubs ?? []).find(s => s.on === line.name);
        const off = (d.oppSubs ?? []).find(s => s.off === line.name);
        const sentOff = (d.oppCards ?? []).some(c => c.kind === 'red' && c.name === line.name && place(c) < at);
        const there = (!!start || (!!on && place(on) < at)) && !(off && place(off) < at) && !sentOff;
        const pos = start?.p ?? d.oppRatings?.find(p => p.name === line.name)?.pos ?? null;
        if (!start && !on) fail('man', `${where}: ${line.name} (O.G) at ${line.minute}' is not in their eleven or off their bench`);
        else if (!there) fail('man', `${where}: ${line.name} (O.G) at ${line.minute}' was not on their pitch then`);
        else if (pos === null) tot.manUnknown += 1;
        else if (pos !== 'GK' && cm.groupOf(pos) !== 'DEF') fail('man', `${where}: ${line.name} (O.G) plays ${pos}, not at the back or in goal`);
        if (pos === 'GK') tot.ogKeeper += 1;
      } else {
        /* one of MINE */
        const ids = [...m.before].filter(([, t]) => t.name === line.name).map(([id]) => id);
        const pos = m.names.get(line.name) ?? null;
        const on = d.subs.find(s => s.on === line.name);
        const gone = d.subs.some(s => s.off === line.name && place(s) < at)
          || d.cards.some(c => c.kind === 'red' && c.name === line.name && place(c) < at)
          || d.injuries.some(x => x.name === line.name && place(x) < at);
        const there = m.startXi === null || ((ids.some(id => m.startXi.includes(id)) || (!!on && place(on) < at)) && !gone);
        /* Where he was STANDING: his own slot at kick off, or the slot of the man he came on for. The engine reads
           each of mine in his slot, so a centre back sent up front is not at the back and a midfielder at full back is. */
        let idx = m.startXi === null ? -1 : m.startXi.findIndex(id => m.before.get(id)?.name === line.name);
        for (let cur = line.name, hop = 0; m.startXi !== null && idx < 0 && hop < 3; hop++) {
          const came = d.subs.find(s => s.on === cur && place(s) < at);
          if (!came) break;
          cur = came.off;
          idx = m.startXi.findIndex(id => m.before.get(id)?.name === cur);
        }
        const stood = idx >= 0 ? m.lines[idx] : null;
        const atTheBack = stood === null ? (pos === 'GK' || (pos !== null && cm.groupOf(pos) === 'DEF')) : (stood === 'defence' || stood === 'keeper');
        if (!ids.length || pos === null) fail('man', `${where}: ${line.name} (O.G) at ${line.minute}' is not in my squad`);
        else if (!there) fail('man', `${where}: ${line.name} (O.G) at ${line.minute}' was not on my pitch then`);
        else if (!atTheBack) fail('man', `${where}: ${line.name} (O.G) was standing in ${stood ?? pos}, not at the back or in goal`);
        if (!line.drawn) fail('man', `${where}: the own goal at ${line.minute}' does not keep the man it was drawn for`);
        if (stood === 'keeper' || (stood === null && pos === 'GK')) tot.ogKeeper += 1;
        if (stood !== null && pos !== null && (stood === 'defence') !== (cm.groupOf(pos) === 'DEF') && stood !== 'keeper') tot.ogOffCard += 1;
      }
    }
  }
  if (own) tot.ogMatches += 1;
  /* Section 5: the lines that name a man are exactly what his season moved by. */
  const want = new Map();
  const slot = name => want.get(name) ?? want.set(name, { goals: 0, assists: 0 }).get(name);
  for (const line of r.myScorers) {
    if (!line.og) slot(line.name).goals += 1;
    if (line.assist) slot(line.assist).assists += 1;
  }
  const got = new Map();
  for (const [id, b] of m.before) {
    const a = m.after.get(id);
    if (!a) continue;
    const g = got.get(b.name) ?? got.set(b.name, { goals: 0, assists: 0, comp: 0 }).get(b.name);
    g.goals += a.goals - b.goals;
    g.assists += a.assists - b.assists;
    g.comp += a.comp - b.comp;
  }
  tick('credit');
  for (const name of new Set([...want.keys(), ...got.keys()])) {
    const w = want.get(name) ?? { goals: 0, assists: 0 };
    const g = got.get(name);
    if (!g) { fail('credit', `${where}: ${name} is on the scoresheet and not in my squad`); continue; }
    if (g.goals !== w.goals) fail('credit', `${where}: ${name}'s season goals moved by ${g.goals}, the list gives him ${w.goals}`);
    if (g.comp !== g.goals) fail('credit', `${where}: ${name}'s season goals moved by ${g.goals} and his competition lines by ${g.comp}`);
    if (g.assists !== w.assists) fail('credit', `${where}: ${name}'s season assists moved by ${g.assists}, the list gives him ${w.assists}`);
  }
}

/* ---------- the run ---------- */
const shift = { seasons: 0, lost: 0, topLost: 0, topChanged: 0, bootChanged: 0, potyChanged: 0, ballonChanged: 0, assistsLost: 0, topGoals: 0 };
const sameMan = (a, b) => (a?.name ?? null) === (b?.name ?? null);

/** Section 5 against the baseline, and what the awards moved by, for one season both careers agree on. */
function compareSeason(label, a, b) {
  let lost = 0;
  let assistsLost = 0;
  tick('credit');
  for (const [id, t] of b.tallies) {
    const o = a.tallies.get(id);
    if (!o) { fail('credit', `${label}: ${t.name} is in one squad and not the other`); continue; }
    if (o.goals > t.goals || o.assists > t.assists) fail('credit', `${label}: ${t.name} has more with own goals on (${o.goals} goals, ${o.assists} assists) than off (${t.goals}, ${t.assists})`);
    lost += t.goals - o.goals;
    assistsLost += t.assists - o.assists;
  }
  if (lost !== a.ownFor) fail('credit', `${label}: my squad is ${lost} goals down on the baseline and ${a.ownFor} of my goals were own goals`);
  if (assistsLost > a.ownFor) fail('credit', `${label}: ${assistsLost} assists gone for ${a.ownFor} own goals`);
  shift.seasons += 1;
  shift.lost += lost;
  shift.assistsLost += assistsLost;
  shift.topGoals += b.summary.topScorer?.goals ?? 0;
  shift.topLost += (b.summary.topScorer?.goals ?? 0) - (a.summary.topScorer?.goals ?? 0);
  if (!sameMan(a.summary.topScorer, b.summary.topScorer)) shift.topChanged += 1;
  if (!sameMan(a.summary.goldenBoot, b.summary.goldenBoot)) shift.bootChanged += 1;
  if (!sameMan(a.summary.poty, b.summary.poty)) shift.potyChanged += 1;
  if (!sameMan(a.summary.ballonDor, b.summary.ballonDor)) shift.ballonChanged += 1;
}

/** Section 6: a first half the baseline recorded, where the candidate marked an own goal, finished by the candidate. */
function inflight(candidate, fixture) {
  tick('inflight');
  if (!fixture) { fail('inflight', 'no first half with an own goal in the first two careers, so there was nothing to hand over'); return; }
  const before = fixture.half.state.live;
  const want = [...(before.h1My ?? []).map(g => ['me', g.name, g.minute, g.plus ?? 0]), ...(before.h1Opp ?? []).map(g => ['opp', g.name, g.minute, g.plus ?? 0])];
  const realRandom = Math.random;
  Math.random = seeded(11460777);
  let done;
  try { done = candidate.playNextEntry(fixture.half.state, { skipHalftime: true }); } finally { Math.random = realRandom; }
  const rep = done.report;
  const first = (side, list) => list.filter(l => l.minute <= 45).map(l => [side, l.name, l.minute, l.plus ?? 0, !!l.og]);
  const got = [...first('me', rep.myScorers), ...first('opp', rep.oppScorers)];
  if (got.some(g => g[4])) fail('inflight', `a goal recorded before the round came back marked as an own goal (${fixture.pair.club} seed ${fixture.pair.seed})`);
  if (JSON.stringify(got.map(g => g.slice(0, 4))) !== JSON.stringify(want)) fail('inflight', 'the first half goals of a match in flight changed when the match was finished');
}

async function main() {
  const candidate = await engine('candidate', CONTROL ? CONTROLS[CONTROL].patch : []);
  const baseline = await engine('baseline', OFF);
  /* the dense engine carries the control too (section gone is read on it), unless the control is the odds line itself */
  const denseEngine = await engine('dense', [DENSE, ...(CONTROL ? CONTROLS[CONTROL].patch.filter(p => p.from !== DENSE.from && p.from !== TAG_CALL) : [])]);
  const keeperHits = weights(candidate).get('keeper');
  const pairs = [];
  for (let c = 0; c < CLUBS.length; c++) for (let k = 0; k < SEEDS; k++) pairs.push({ club: CLUBS[c], seed: 11460000 + SEEDSET * 100003 + c * 7919 + k * 104729 });
  let fixture = null;
  for (const [n, pair] of pairs.entries()) {
    const on = playCareer(candidate, pair.club, pair.seed, false, n < PROBE ? (state, i) => probeGone(denseEngine, state, (pair.seed + 7919 * (i + 1)) >>> 0) : null);
    const off = playCareer(baseline, pair.club, pair.seed, n < 2 && !fixture);
    /* Section 1: the same results, tables, squads, rival tallies and draw count, at every season's end and after every summer. */
    tick('digest');
    const at = on.faces.length !== off.faces.length ? 0 : on.faces.findIndex((f, i) => f !== off.faces[i]);
    if (at >= 0) fail('digest', `${pair.club} seed ${pair.seed}: the career with own goals parts from the career without them by ${at % 2 === 0 ? `the end of season ${at / 2 + 1}` : `the summer after season ${(at + 1) / 2}`}`);
    for (const m of on.matches) inspectMatch(candidate, on, m);
    /* Only where the two careers are the same career can the tallies be set side by side. */
    for (let i = 0; i < on.seasons.length && at < 0; i++) compareSeason(`${pair.club} seed ${pair.seed} season ${i + 1}`, on.seasons[i], off.seasons[i]);
    /* A first half with no injury in it: the quick sim's coach changes nothing before the break, so nothing in it is drawn again. */
    for (const h of fixture ? [] : off.halves) {
      const m = on.matches[h.at];
      if (!m || (h.state.live.h1Injuries ?? []).length) continue;
      if ([...m.report.myScorers, ...m.report.oppScorers].some(l => l.og && l.minute <= 45)) { fixture = { half: h, pair }; break; }
    }
  }
  inflight(candidate, fixture);
  /* a section that read nothing is not green: the floor is far under what the two probed careers give (measured in the header) */
  if (!CONTROL && dense.og < 20) fail('gone', `only ${dense.og} own goals against me in the ${dense.matches} matches played again on the dense engine`);

  /* Section 2: the share, against the binomial the rule is. */
  const own = tot.og.me + tot.og.opp;
  const expected = tot.eligible / ONE_IN;
  const sd = Math.sqrt(tot.eligible * (1 / ONE_IN) * (1 - 1 / ONE_IN));
  const z = sd > 0 ? (own - expected) / sd : 0;
  tick('share');
  if (tot.eligible < FLOOR) fail('share', `only ${tot.eligible} eligible goals, under the floor of ${FLOOR}`);
  else if (Math.abs(z) > 4) fail('share', `${own} own goals on ${tot.eligible} eligible goals, ${z.toFixed(2)} standard deviations from the ${expected.toFixed(1)} a one in ${ONE_IN} draw gives`);

  const pct = (a, b) => (b ? (100 * a / b).toFixed(2) : '0.00');
  const per = n => (n / Math.max(1, shift.seasons)).toFixed(2);
  console.log(`simCmOwnGoals${CONTROL ? ` (control ${CONTROL})` : ''}: ${pairs.length} careers (${CLUBS.length} clubs x ${SEEDS} seeds, seedset ${SEEDSET}) x ${SEASONS} seasons, ${tot.matches} matches, ${tot.goals} goals`);
  console.log(`  MEASURED own goals: ${own} of ${tot.goals} goals (${pct(own, tot.goals)}%), ${tot.og.me} for me and ${tot.og.opp} against; ${tot.eligible} eligible, expected ${expected.toFixed(1)}, z ${z.toFixed(2)}; ${tot.ogKeeper} by a keeper; ${tot.ogMatches} of ${tot.matches} matches had one; ${(own / (pairs.length * SEASONS)).toFixed(2)} a season in my matches`);
  console.log(`  MEASURED the man: ${tot.ogOffCard} of the ${tot.og.opp} against me were by a man standing at the back whose card says otherwise; the keeper holds ${keeperHits} places in 18000 keyed picks with four at the back (one in nine is 2000); section gone: ${dense.matches} matches played again with ${dense.sentOff} men at the back sent off, ${dense.og} own goals against me after it`);
  console.log(`  MEASURED penalties: ${tot.pens} of ${tot.goals} goals (${pct(tot.pens, tot.goals)}%) carry the flag every listing marks (P); direct free kicks ${tot.fks} (${pct(tot.fks, tot.goals)}%); ${tot.manUnknown} own goals by a sub of theirs with no sheet to read his position from`);
  console.log(`  MEASURED awards over the ${shift.seasons} seasons both careers agree on: my squad ${shift.lost} goals and ${shift.assistsLost} assists down (${per(shift.lost)} and ${per(shift.assistsLost)} a season); my top scorer ${per(shift.topLost)} goals down a season on a mean of ${per(shift.topGoals)}, a different man in ${shift.topChanged}; golden boot a different man in ${shift.bootChanged}, player of the season in ${shift.potyChanged}, world award in ${shift.ballonChanged}`);
  let failed = 0;
  for (const s of SECTIONS) {
    const xs = red.get(s);
    if (xs.length) { failed += 1; console.log(`  FAIL ${s}: ${xs.length} finding(s) on ${checked.get(s)} checks. ${xs.slice(0, 3).join(' | ')}`); }
    else console.log(`  ok ${s} (${checked.get(s)} checks)`);
  }
  if (CONTROL) {
    const target = CONTROLS[CONTROL].red;
    const fired = red.get(target).length > 0;
    console.log(fired
      ? `simCmOwnGoals: CONTROL ${CONTROL} FIRED, section ${target} went red as it must (red in all: ${SECTIONS.filter(s => red.get(s).length).join(', ')})`
      : `simCmOwnGoals: CONTROL ${CONTROL} did NOT fire, section ${target} stayed green`);
    return fired ? 0 : 1;
  }
  console.log(failed ? `simCmOwnGoals: FAILED, ${failed} of ${SECTIONS.length} sections red` : `simCmOwnGoals: PASS, ${SECTIONS.length} sections green`);
  return failed ? 1 : 0;
}

let code = 1;
try { code = await main(); } catch (error) { console.error(error.stack ?? String(error)); console.log('simCmOwnGoals: FAILED, the harness threw'); } finally { fs.rmSync(TMP, { recursive: true, force: true }); }
process.exit(code);
