/* simUsRivalSense.mjs (Round 1227). Does the rival of a US My Career play the player's position on the player's
   own stat line, and does "who had the better year" say what the two printed lines say?

   It plays the real engines through each sport's own descriptor (the binding the board drives): one esbuild
   bundle of src, on a seeded mulberry32 that is both Math.random and the rng handed to the engine. Nothing
   reads the network and nothing is written outside the temp folder.

   Size. Full size is 1,500 careers a sport a seed, seeds 1 to 5. RIVAL_SEEDS=1,2 and RIVAL_CAREERS=300 shrink
   it while iterating: a shrunk run prints every number and judges only the exact checks.

   THE FLEET (playFleet). Positions are cycled, every archetype of a position in turn, and in the NFL every
   second lap of the positions is a 2005 career (16 game seasons through 2020), so a season whose length is not
   the engine's own rate is always played. The loop is the engine's: a role on draft night, a camp every
   season, the season, progress, the retirement test. NO rivalry card is answered, so the player's own path is
   the draw count law and nothing else (section P1).

   Run:  node scripts/simUsRivalSense.mjs
   It ends with one line, "simUsRivalSense: N checks, F failed (full size)", and exits by F.

   THE SECTIONS are listed with their measured numbers under "WHAT WAS MEASURED" further down. */

import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = s => s.replace(/\r\n/g, '\n');
const srcOf = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
const SEEDS = (process.env.RIVAL_SEEDS || '1,2,3,4,5').split(',').map(Number).filter(Number.isFinite);
const CAREERS = Number(process.env.RIVAL_CAREERS || 1500);
const FULL = CAREERS >= 1500 && SEEDS.length >= 5;
const PROVE = process.env.RIVAL_PROVE || '';
const namesOf = v => (v || '').split(',').map(x => x.trim()).filter(x => x && x !== 'none');
const MOVED = namesOf(process.env.RIVAL_MOVED);
const CARDS = namesOf(process.env.RIVAL_CARDS);
const CONTROL = process.env.US_RIVAL_CONTROL || '';
const ALL = ['nfl', 'mlb', 'nhl', 'nba'];
for (const n of [...MOVED, ...CARDS]) if (!ALL.includes(n)) { console.error(`unknown sport "${n}" in RIVAL_MOVED or RIVAL_CARDS`); process.exit(2); }

/* The sports whose rival is bound to the player's own line ON THIS TREE. A bound sport is judged (U, F1, F2);
   one that is not is measured and printed (the BEFORE table). The NBA has been bound since Round 1112 and is
   judged by scripts/simNbaAwardsSense.mjs section R; here it rides the fleet for P1 and L. */
const BOUND = ['nfl'];

/* NEGATIVE CONTROLS, US_RIVAL_CONTROL=<name>. Each swaps one line of source in memory (an esbuild plugin, never
   a file), refuses to run when the anchor is not there exactly once or the swap changed nothing (exit 2, "Refusing
   to run"), and must turn its own section red: the closing line names the sections that went red. */
const CONTROLS = {
  /* P1, P2 (Round 1149's control, moved here with the proof it fires in): the MLB rivalry tick takes one more
     draw of the season's stream, so every draw of the player's after it moves. */
  tickdraws: { file: 'src/lib/mlbCareerRivalryEvents.ts', prove: true, needs: 'P1,P2',
    find: '  const rolled = rollRivalryEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);', put: '  rng(); const rolled = rollRivalryEvent(p, c.rival, lastId, MLB_RIVALRY_EVENTS, rng);' },
  /* N.F2: the one comparison turned round (the tally and the note go to the wrong man). */
  verdictswap: { file: 'src/lib/careerRival.ts', needs: 'N.F2', find: '  return myScore > hisScore;', put: '  return myScore < hisScore;' },
  /* N.U2, N.F2: the rival's score put back on the formula the built in line used (yards over 60, scores doubled). */
  oldscalenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2,N.F2', find: '      score: nflHeadToHeadScore(pos, season),',
    put: '      score: ((season.passYds ?? 0) + (season.rushYds ?? 0) + (season.recYds ?? 0) + (season.tackles ?? 0) * 9 + (season.fgMade ?? 0) * 30) / 60 + ((season.passTd ?? 0) + (season.rushTd ?? 0) + (season.recTd ?? 0) + (season.sacks ?? 0) + (season.picks ?? 0)) * 2,' },
  /* N.F2: the player's side scored on his whole line (the award score), which reads a back's receiving yards and
     a linebacker's and a corner's forced fumbles: the verdict then says what the printed lines do not. */
  fullscorenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.F2', find: "judgeRivalSeason(c.rival, nflHeadToHeadScore(c.pos, line), c.name, 'nfl', rng,", put: "judgeRivalSeason(c.rival, statScore, c.name, 'nfl', rng," },
  /* N.U2, N.F1: the hook prints with a template of its own (the old linebacker's three parts for everybody). */
  offshapenfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2,N.F1', find: '      line: nflStatLine(season, pos),',
    put: '      line: `${season.tackles ?? 0} tackles, ${season.sacks ?? 0} sacks, ${season.picks ?? 0} INT`,' },
  /* N.U1 (and P1 under RIVAL_PROVE): the hook takes one more draw of the season's stream than the law allows. */
  drawsnfl: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U1', find: "    const keyed = rivalSeasonStream('nfl-rival', r, year, rng, rivalSeasonDraws('nfl', r.pos));",
    put: "    const keyed = rivalSeasonStream('nfl-rival', r, year, rng, rivalSeasonDraws('nfl', r.pos) + 1);" },
  /* N.U2, N.F2: a back's printed catches read at no yards at all in the source (the harness's own 8 disagrees). */
  bridge: { file: 'src/lib/usCareerStatLine.ts', needs: 'N.U2,N.F2', find: 'export const NFL_RB_PRINTED_YARDS_A_CATCH = 8;', put: 'export const NFL_RB_PRINTED_YARDS_A_CATCH = 0;' },
  /* N.U5: the one place rule taken out (two men on a first team that names one). */
  oneslot: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U5', find: '      year, allStar: won && !(onePlace && mine.firstTeam),', put: '      year, allStar: won,' },
  /* N.U2: the rival plays a 17 game line whatever the season's length (the defect of the built in line: Round
     1104 measured the player's share falling at every position in a 16 game season because of it). */
  workload17: { file: 'src/lib/nflMyCareer.ts', needs: 'N.U2', find: '    const len = nflSeasonLength(year);', put: '    const len = NFL_RATE_GAMES;' },
  /* P1, P2: the NFL line function takes one draw more than the block it was cut from (every draw of the player's
     after his stat line moves). */
  cutdraw: { file: 'src/lib/nflMyCareer.ts', prove: true, needs: 'P1,P2',
    find: '  const g = x.games / NFL_RATE_GAMES;', put: '  rng(); const g = x.games / NFL_RATE_GAMES;' },
  /* P1: the lifted stream keyed one character off the NBA's own key of Round 1112 (the NBA rival's whole trail
     moves, and nothing of the player's does). */
  liftkey: { file: 'src/lib/careerRival.ts', prove: true, needs: 'P1',
    find: '  let key = `${tag}|${r.name}|${year}`;', put: '  let key = `${tag}|${r.name}|${year}|`;' },
  /* L: one word of the lifted All-Star cards changed (the NBA's "both" card no longer reads as it did). */
  liftcard: { file: 'src/lib/careerRivalryEvents.ts', prove: true, needs: 'L',
    find: 'description: (r: { name: string }) => `The All-Star rosters are out, and you and ${r.name} are both on them.`,', put: 'description: (r: { name: string }) => `The All-Star rosters are out, and you and ${r.name} both made it.`,' },
};
if (CONTROL && CONTROLS[CONTROL]?.prove && !PROVE) { console.error(`control ${CONTROL} is judged against a tree before: set RIVAL_PROVE. Refusing to run.`); process.exit(2); }
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_RIVAL_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ') || '(none yet)'}`); process.exit(2); }
const edits = CONTROL ? [{ label: `control ${CONTROL}`, ...CONTROLS[CONTROL] }] : [];

function editedSource(list, file, src, onApplied = () => {}) {
  let out = src;
  for (const e of list.filter(x => file.replace(/\\/g, '/').endsWith(x.file))) {
    const hits = out.split(e.find).length - 1;
    if (hits !== 1) { console.error(`${e.label}: anchor ${e.find.slice(0, 80)} found ${hits} times in ${e.file}, expected exactly 1. Refusing to run.`); process.exit(2); }
    const was = out;
    out = out.replace(e.find, () => e.put);
    if (out === was) { console.error(`${e.label}: the swap changed nothing. Refusing to run.`); process.exit(2); }
    onApplied(e);
  }
  return out;
}

const BUNDLE = {
  stdin: {
    contents: [
      "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
      "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
      "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
      "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
      "export * as nfl from './src/lib/nflMyCareer.ts';",
      "export * as awards from './src/lib/careerAwards.ts';",
      "export * as rival from './src/lib/careerRival.ts';",
      "export * as events from './src/lib/careerRivalryEvents.ts';",
      "export * as nflEvents from './src/lib/nflCareerRivalryEvents.ts';",
      "export * as lines from './src/lib/usCareerStatLine.ts';",
      "export { keyedRng } from './src/lib/keyedRng.ts';",
      "export { seasonSwing } from './src/lib/careerVariance.ts';",
      "export * as drive from './src/test/helpers/usCareerDrive.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') },
};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engines with this run's control swapped in memory. */
async function bundleWith(list, tag) {
  let applied = 0;
  const plugin = {
    name: 'rival-control',
    setup(b) {
      if (!list.length) return;
      b.onLoad({ filter: /[.]ts$/ }, args => {
        if (!list.some(e => args.path.replace(/\\/g, '/').endsWith(e.file))) return undefined;
        return { contents: editedSource(list, args.path, norm(readFileSync(args.path, 'utf8')), () => { applied += 1; }), loader: 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  if (applied !== list.length) { console.error(`${list.map(e => e.label).join(', ')}: ${applied} of ${list.length} swaps were applied (a file was never bundled). Refusing to run.`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return mod;
}
/** The engines with every src file that differs from `commit` read at that commit (git show, in memory). Says
 *  how many files it took back, so a proof against a tree that is this tree cannot pass quietly. */
async function bundleAt(commit) {
  const changed = execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean);
  const served = new Set();
  const plugin = {
    name: 'rival-before',
    setup(b) {
      b.onLoad({ filter: /[.]tsx?$/ }, args => {
        const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
        if (!changed.includes(rel)) return undefined;
        let contents;
        try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; /* a file the round added */ }
        served.add(rel);
        return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  };
  const out = path.join(os.tmpdir(), `us-rival-${process.pid}-before.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* another run may have cleaned it */ }
  return { mod, changed, served: [...served] };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pc = (n, d) => (d ? (100 * n) / d : 0);
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const f2 = x => (Math.round(x * 100) / 100).toFixed(2);

let checks = 0; let failed = 0;
const failedSections = new Set();
/** One judged check. `exact` checks are judged at every size; a banded one only at full size. */
function check(section, cond, msg) {
  checks += 1;
  if (cond) { console.log(`   ok   ${section}: ${msg}`); return; }
  failed += 1; failedSections.add(section);
  console.log(`   FAIL ${section}: ${msg}`);
}

/* ------------------------------------------------------------------ */
/* What a printed line is, by sport and position                       */
/* ------------------------------------------------------------------ */
/* Written from the printers in src/lib/usCareerStatLine.ts (nflStatLine, mlbStatLine, nhlStatLine), part by
   part and in their order. STRICT is the player's own shape, character for character (thousands grouped, sacks
   in halves, a three place average with no leading zero). LOOSE finds the same labelled part anywhere in a
   line, so an old rival line that carries the right parts in another order or format can still be read back
   and scored: "readable" in the tables below means that. A line missing a part is "unread". */
const raw = String.raw;
const N = raw`(\d{1,3}(?:,\d{3})*)`;
const H = raw`(\d{1,3}(?:,\d{3})*(?:\.5)?)`;
const T = raw`([\d,]+(?:\.\d+)?)`;
const ERA = raw`(\d+\.\d{2})`;
const num = s => Number(s.replace(/,/g, ''));
const part = (key, tail, o = {}) => ({
  key, val: o.val ?? num,
  strict: `${o.head ?? ''}${o.strict ?? N}${tail}`,
  loose: `${o.head ?? ''}${o.loose ?? T}${o.looseTail ?? tail}`,
});
const three = { strict: raw`\.(\d{3})`, loose: raw`0?\.(\d{3})`, val: s => Number(`0.${s}`) };
const skater = [part('goals', ' G', { looseTail: ' ?G' }), part('assists', ' A', { looseTail: ' ?A' }), part('points', ' P', { looseTail: ' ?P' })];
const hitter = [part('avg', '', three), part('hr', ' HR'), part('rbi', ' RBI')];
const catcher = [part('rec', ' rec'), part('recYds', ' yds'), part('recTd', ' TD')];
const SHAPES = {
  nfl: {
    QB: [part('passYds', ' yds'), part('passTd', ' TD'), part('ints', ' INT')],
    RB: [part('rushYds', ' rush yds'), part('rushTd', ' TD'), part('rec', ' rec')],
    WR: catcher, TE: catcher,
    LB: [part('tackles', ' tackles?'), part('sacks', ' sacks?', { strict: H }), part('picks', ' INT')],
    CB: [part('picks', ' INT'), part('passDef', ' pass(?:es)? defended'), part('tackles', ' tackles?')],
    EDGE: [part('sacks', ' sacks?', { strict: H }), part('tackles', ' tackles?'), part('forcedFum', ' forced fumbles?')],
    K: [part('fgMade', raw` of [\d,]+ FG`), part('longFg', '', { head: 'long of ' })],
  },
  mlb: {
    SP: [part('wins', raw`-\d+`), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    RP: [part('saves', ' saves?'), part('holds', ' holds?'), part('era', ' ERA', { strict: ERA }), part('so', ' K')],
    C: hitter, '1B': hitter, '2B': hitter, '3B': hitter, SS: hitter, LF: hitter, CF: hitter, RF: hitter, DH: hitter,
  },
  nhl: { C: skater, LW: skater, RW: skater, D: skater, G: [part('wins', ' W'), part('svpct', ' SV%', three)] },
};
/** Is `text` the player's own shape at this position? */
function inShape(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  return !!parts && new RegExp(`^${parts.map(p => p.strict).join(', ')}$`).test(text);
}
/** The printed parts of a line as numbers, or null when a part is not there. */
function readBack(sport, pos, text) {
  const parts = SHAPES[sport]?.[pos];
  if (!parts) return null;
  const out = {};
  for (const p of parts) {
    const m = new RegExp(`(?:^|[ ,])${p.loose}(?=$|[ ,])`).exec(text);
    if (!m) return null;
    out[p.key] = p.val(m[1]);
  }
  return out;
}
/* A running back's line prints catches, not receiving yards, and the season score reads yards: the verdict
   reads his printed catches at 8 yards each. Typed HERE and not imported, so control `bridge` can fire. */
const RB_YARDS_A_CATCH = 8;
/** The season score of the PRINTED parts: what the screen shows decides. */
function printedScore(M, sport, pos, parts) {
  if (sport === 'nfl') return M.awards.nflSeasonScore(pos, pos === 'RB' ? { ...parts, recYds: parts.rec * RB_YARDS_A_CATCH } : parts);
  if (sport === 'mlb') return M.awards.mlbSeasonScore(pos, parts);
  return M.awards.nhlSeasonScore(pos, parts);
}

/* ------------------------------------------------------------------ */
/* The fleet                                                           */
/* ------------------------------------------------------------------ */
const FLEET = {
  nfl: { desc: M => M.NFL_CAREER_SPORT, pos: ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'], eras: ['now', 'y2005'] },
  mlb: { desc: M => M.MLB_CAREER_SPORT, pos: ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'], eras: ['now'] },
  nhl: { desc: M => M.NHL_CAREER_SPORT, pos: ['C', 'LW', 'RW', 'D', 'G'], eras: ['now'] },
  nba: { desc: M => M.NBA_CAREER_SPORT, pos: ['PG', 'SG', 'SF', 'PF', 'C'], eras: ['now'] },
};
const AGE_BANDS = [[0, 24, '24 and under'], [25, 27, '25 to 27'], [28, 30, '28 to 30'], [31, 33, '31 to 33'], [34, 99, '34 and over']];
const bandOf = age => AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi)[2];
const cell = () => ({ judged: 0, mine: 0, near: 0, off: 0, unread: 0, disagree: 0, careers: 0, retired: 0, badge: 0 });
const tally = () => ({ judged: 0, mine: 0 });
const bump = (o, k, mine) => { const t = (o[k] ??= tally()); t.judged += 1; if (mine) t.mine += 1; };
const sha = () => crypto.createHash('sha256');

/**
 * `per` careers of one sport on one seed, on the engines of bundle M. Returns the hashes section P1 compares
 * (the player's seasons and counters, the seasons a beat was dealt in, the notes without the rival's own, the
 * rival's trail, the beats word for word, every note) and what the tables print, by position.
 */
function playFleet(M, sport, seed, per) {
  const F = FLEET[sport]; const S = F.desc(M);
  const rnd = mulberry32(seed * 7919 + sport.charCodeAt(1) * 104729 + 1227);
  const keep = Math.random; Math.random = rnd;
  const h = { player: sha(), dealt: sha(), notes: sha(), rival: sha(), beats: sha(), allNotes: sha() };
  const by = {}; const job = {}; const age = {}; const arm = {}; const jobPos = {};
  const firstOff = []; const firstDisagree = [];
  /* One pair a career (the years he took, the years judged): the years of one career share a rating, so the
     error of a share is worked out over careers, never over years (clusterError below). */
  const pairs = [];
  try {
    for (let i = 0; i < per; i += 1) {
      const pos = F.pos[i % F.pos.length];
      const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
      const archs = S.create.archetypes[pos];
      const c = S.startCareer('Sim', pos, archs[i % archs.length], rnd, null, era);
      const m = (by[pos] ??= cell());
      let tq = S.rollTeamQuality(null, rnd);
      S.assignRole(c, tq, rnd);
      for (let guard = 0; guard < 30; guard += 1) {
        S.campBattle(c, tq, rnd);
        const r0 = c.rival; const judged = !!r0 && !r0.retired; const my0 = r0?.myYears ?? 0;
        const pend0 = c.pendingRivalryEvent; const role = c.role; const ageNow = c.age;
        const played = S.simSeason(c, tq, rnd);
        const r = c.rival;
        const beat = c.pendingRivalryEvent && c.pendingRivalryEvent !== pend0 ? c.pendingRivalryEvent : null;
        h.dealt.update(beat ? '1' : '0');
        h.beats.update(JSON.stringify(beat ? [beat.id, beat.emoji, beat.title, beat.description, beat.consequence] : 0));
        if (r) h.rival.update(JSON.stringify([r.lastLine, r.lastScore, r.myYears, r.hisYears, r.rings, r.ovr, r.age, r.retired, r.lastYear ?? null, r.lastAllStar ?? null]));
        const notes = played?.notes ?? [];
        h.allNotes.update(JSON.stringify(notes));
        h.notes.update(JSON.stringify(notes.filter(n => !n.startsWith('\u{1FA9E}'))));
        if (judged && sport !== 'nba') {
          const mine = r.myYears > my0;
          const hurt = notes.some(n => n.startsWith('\u{1F691}'));
          const jobNow = role === 'backup' && !(sport === 'nfl' && pos === 'K') ? 'backup' : hurt ? 'hurt' : 'starter';
          m.judged += 1; if (mine) m.mine += 1;
          if (notes.some(n => n.startsWith('\u{1FA9E}') && n.includes('Nothing in it again'))) m.near += 1;
          bump(job, jobNow, mine); bump(age, bandOf(ageNow), mine); bump(arm, `${pos} ${era}`, mine); bump(jobPos, `${pos} ${jobNow}`, mine);
          const hisText = r.lastLine; const myText = S.statLine(played.line, pos);
          if (!inShape(sport, pos, hisText)) { m.off += 1; if (firstOff.length < 3) firstOff.push(`${pos}: "${hisText}"`); }
          const his = readBack(sport, pos, hisText); const me = readBack(sport, pos, myText);
          if (!his || !me) m.unread += 1;
          else if ((printedScore(M, sport, pos, me) > printedScore(M, sport, pos, his)) !== mine) {
            m.disagree += 1;
            if (firstDisagree.length < 3) firstDisagree.push(`${pos} ${played.line.year}: mine "${myText}" his "${hisText}", the save gave the year to ${mine ? 'me' : 'him'}`);
          }
        }
        S.progress(c, rnd);
        if (S.shouldRetire(c)) break;
        tq = S.rollTeamQuality(tq, rnd);
      }
      const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
      h.player.update(JSON.stringify({ seasons: c.seasons, counters }));
      m.careers += 1;
      if (c.rival) pairs.push([c.rival.myYears, c.rival.myYears + c.rival.hisYears]);
      if (c.rival?.retired) { m.retired += 1; if (c.rival.myYears > c.rival.hisYears) m.badge += 1; }
    }
  } finally { Math.random = keep; }
  return { hash: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v.digest('hex')])), by, job, age, arm, jobPos, firstOff, firstDisagree, pairs };
}
/** The standard error, in percent, of a share pooled over careers (a ratio estimator's error by career). */
function clusterError(pairs) {
  const N = pairs.reduce((a, [, n]) => a + n, 0);
  if (!N) return 0;
  const p = pairs.reduce((a, [m]) => a + m, 0) / N;
  return (100 * Math.sqrt(pairs.reduce((a, [m, n]) => a + (m - p * n) ** 2, 0))) / N;
}

/** Add one seed's table into a running one. */
function addInto(total, one) {
  for (const group of ['by', 'job', 'age', 'arm', 'jobPos']) {
    total[group] ??= {};
    for (const [k, v] of Object.entries(one[group])) {
      const t = (total[group][k] ??= {});
      for (const [f, n] of Object.entries(v)) t[f] = (t[f] ?? 0) + n;
    }
  }
  return total;
}

/* ------------------------------------------------------------------ */
/* The tables                                                          */
/* ------------------------------------------------------------------ */
const shareOf = t => (t ? pc(t.mine, t.judged) : 0);
/** One sport's table, by position, with the by job, by age and by arm lines under it. */
function printTable(label, sport, total, perSeed) {
  console.log(`   ${label} ${sport}: my share of the head to head years by seed ${perSeed.map(f1).join(', ')} (mean ${f2(mean(perSeed))})`);
  for (const pos of FLEET[sport].pos) {
    const m = total.by[pos]; if (!m) continue;
    const read = m.judged - m.unread;
    const arms = FLEET[sport].eras.length > 1 ? `  (${FLEET[sport].eras.map(e => `${e} ${f1(shareOf(total.arm[`${pos} ${e}`]))}`).join(', ')})` : '';
    const hs = total.jobPos[`${pos} starter`];
    console.log(`     ${pos.padEnd(5)} judged ${String(m.judged).padStart(6)}  off shape ${f1(pc(m.off, m.judged)).padStart(5)}%  unread ${f1(pc(m.unread, m.judged)).padStart(5)}%  verdict against the printed lines: ${read ? `${f1(pc(m.disagree, read))}% disagree` : 'cannot be asked'}  my share ${f1(pc(m.mine, m.judged))}%${arms}  as a healthy starter ${f1(shareOf(hs))}% of ${hs?.judged ?? 0}  near ties ${f1(pc(m.near, m.judged))}%  rival retired behind me in ${f1(pc(m.badge, m.careers))}% of ${m.careers} careers`);
  }
  console.log(`     by job: ${['starter', 'backup', 'hurt'].map(j => `${j} ${f1(shareOf(total.job[j]))}% of ${total.job[j]?.judged ?? 0}`).join(', ')}`);
  console.log(`     by age: ${AGE_BANDS.map(([, , n]) => `${n} ${f1(shareOf(total.age[n]))}% of ${total.age[n]?.judged ?? 0}`).join(', ')}`);
}
/** Play every seed of one sport on bundle M. */
function runSport(M, sport) {
  const seeds = SEEDS.map(seed => playFleet(M, sport, seed, CAREERS));
  const total = seeds.reduce(addInto, {});
  const perSeed = seeds.map(s => { const t = Object.values(s.by).reduce((a, m) => ({ judged: a.judged + m.judged, mine: a.mine + m.mine }), tally()); return pc(t.mine, t.judged); });
  return { seeds, total, perSeed, error: clusterError(seeds.flatMap(s => s.pairs)) };
}

/* ------------------------------------------------------------------ */
/* N.U: the NFL rival's season, on hand built rivals                   */
/* ------------------------------------------------------------------ */
/* The first team All-Pro names ONE man at these positions (NFL_ALL_PRO in careerAwards.ts: one quarterback, one
   running back, one tight end, a kicker). Typed here and not read from the engine, so control `oneslot` fires. */
const ONE_PLACE = ['QB', 'RB', 'TE', 'K'];
function nflUnit(M) {
  const NAMES = ['Marcus Whitaker', 'Devon Delgado', 'Kai Okafor', 'Theo Novak', 'Cruz Halstead'];
  const YEARS = [2005, 2012, 2020, 2021, 2026, 2031];
  const bad = { draws: [], season: [], pure: [], place: [] }; const made = {}; const reached = {}; const lens = new Set();
  const note = (list, text) => { if (list.length < 3) list.push(text); };
  let n = 0;
  for (const pos of FLEET.nfl.pos) for (let i = 0; i < 120; i += 1) {
    const year = YEARS[i % YEARS.length]; const form = 70 + ((i * 7) % 36); const firstTeam = i % 2 === 1;
    const r = { name: NAMES[i % NAMES.length], pos, team: 'KC', ovr: 80, pot: 90, age: 26, rings: 0, hisYears: 2, myYears: 3, retired: false, lastLine: 'x', lastScore: 1 };
    const frozen = JSON.stringify(r);
    const base = mulberry32(9000 + i * 31 + pos.length); const draws = [];
    const out = M.nfl.nflRivalSeason(year, { pos, firstTeam })(r, form, () => { const v = base(); draws.push(v); return v; });
    n += 1;
    const want = M.rival.rivalSeasonDraws('nfl', pos);
    if (draws.length !== want || want !== (pos === 'K' ? 1 : 3)) note(bad.draws, `${pos}: took ${draws.length} draws, the law says ${want}`);
    const keyed = M.keyedRng(['nfl-rival', r.name, year, ...draws].join('|'));
    const len = M.nfl.nflSeasonLength(year); lens.add(len);
    const stat = M.nfl.nflStatLineFor({ form, pos, games: len }, keyed);
    const text = M.lines.nflStatLine({ ...stat, teamResult: '' }, pos);
    const read = readBack('nfl', pos, text);
    const score = read ? printedScore(M, 'nfl', pos, read) : NaN;
    const won = M.awards.wonAward(keyed, 'nfl', 'allPro', pos, M.awards.nflSeasonScore(pos, M.nfl.nflAwardPaceLine({ games: len, ...stat }, len)));
    const honour = won && !(ONE_PLACE.includes(pos) && firstTeam);
    if (won) made[pos] = (made[pos] ?? 0) + 1;
    if (won && firstTeam) reached[pos] = (reached[pos] ?? 0) + 1;
    if (out.line !== text || out.score !== score || out.year !== year || out.allStar !== honour) note(bad.season, `${pos} ${year} form ${form}: the hook gave "${out.line}" ${out.score} ${out.allStar}, rebuilt "${text}" ${score} ${honour}`);
    if (won && firstTeam && ONE_PLACE.includes(pos) && out.allStar) note(bad.place, `${pos} ${year}: he is on a first team that names one man, in a season the player is on it`);
    let k = 0;
    const again = M.nfl.nflRivalSeason(year, { pos, firstTeam })(r, form, () => draws[k++]);
    if (JSON.stringify(again) !== JSON.stringify(out) || JSON.stringify(r) !== frozen) note(bad.pure, `${pos} ${year}: a second run from the same draws differs, or the rival was written`);
  }
  return { n, bad, made, reached, lens: [...lens].sort() };
}

console.log(`simUsRivalSense: seeds ${SEEDS.join(', ')}, ${CAREERS} careers a sport a seed${FULL ? ' (full size)' : ' (SHRUNK: exact checks only)'}${CONTROL ? `, control ${CONTROL}` : ''}${PROVE ? `, proving against ${PROVE} (moved: ${MOVED.join(', ') || 'none'}; cards: ${CARDS.join(', ') || 'none'})` : ''}`);
const E = await bundleWith(edits, 'run');
const NOW = Object.fromEntries(ALL.map(s => [s, runSport(E, s)]));

console.log('T) the table on this tree (measured, printed; judged only where a sport is bound)');
for (const sport of ['nfl', 'mlb', 'nhl']) {
  printTable(BOUND.includes(sport) ? 'bound' : 'not bound', sport, NOW[sport].total, NOW[sport].perSeed);
  const first = NOW[sport].seeds[0];
  if (first.firstOff.length) console.log(`     off shape, for example: ${first.firstOff.join(' | ')}`);
  if (first.firstDisagree.length) console.log(`     disagreeing, for example: ${first.firstDisagree.join(' | ')}`);
  console.log(`     the error of the pooled share, by career: ${f2(NOW[sport].error)} points (one standard error at this size)`);
}

if (BOUND.includes('nfl')) {
  console.log('N) the NFL rival plays the player\'s position on the player\'s own line');
  const u = nflUnit(E);
  check('N.U1', u.bad.draws.length === 0, `the hook takes exactly the draws the law gives its position, 3 or a kicker's 1 (${u.n} hand built seasons)${u.bad.draws.length ? `: ${u.bad.draws.join(' | ')}` : ''}`);
  check('N.U2', u.bad.season.length === 0 && u.lens.join() === '16,17', `his season is nflStatLineFor's own on his keyed stream at the season's real length (${u.lens.join(' and ')} games seen), printed by the player's printer, scored off the printed text, with wonAward's answer${u.bad.season.length ? `: ${u.bad.season.join(' | ')}` : ''}`);
  check('N.U3', u.bad.pure.length === 0, `the same rival, form, year and draws give the same season, and the rival is left untouched${u.bad.pure.length ? `: ${u.bad.pure.join(' | ')}` : ''}`);
  check('N.U5', u.bad.place.length === 0 && ONE_PLACE.every(p => (u.reached[p] ?? 0) > 0) && FLEET.nfl.pos.every(p => (u.made[p] ?? 0) > 0),
    `where the first team names one man he is never on it in a season the player is (reached ${ONE_PLACE.map(p => `${p} ${u.reached[p] ?? 0}`).join(', ')} times; he made a first team at every position: ${FLEET.nfl.pos.map(p => `${p} ${u.made[p] ?? 0}`).join(', ')})${u.bad.place.length ? `: ${u.bad.place.join(' | ')}` : ''}`);
  const all = Object.values(NOW.nfl.total.by).reduce((a, m) => ({ judged: a.judged + m.judged, off: a.off + m.off, unread: a.unread + m.unread, disagree: a.disagree + m.disagree }), { judged: 0, off: 0, unread: 0, disagree: 0 });
  check('N.F1', all.judged > 0 && all.off === 0, `every rival line the fleet prints is in the player's own shape at his position (${all.off} of ${all.judged} off shape)`);
  check('N.F2', all.judged > 0 && all.unread === 0 && all.disagree === 0, `the verdict on the save never disagrees with the two printed lines scored the one way (${all.disagree} of ${all.judged} judged years disagree, ${all.unread} unread)`);
}

/* ------------------------------------------------------------------ */
/* P1: the player's own path against the tree before                   */
/* ------------------------------------------------------------------ */
if (PROVE) {
  const B = await bundleAt(PROVE);
  console.log(`P1) the player's path against ${PROVE}: ${B.changed.length} src files differ, ${B.served.length} read at that commit (${B.served.join(', ') || 'none'})`);
  check('P1', B.served.length > 0, `the tree before is not this tree (${B.served.length} files taken back)`);
  const WAS = Object.fromEntries(ALL.map(s => [s, runSport(B.mod, s)]));
  console.log('B) the table on the tree before');
  for (const sport of ['nfl', 'mlb', 'nhl']) printTable('before', sport, WAS[sport].total, WAS[sport].perSeed);
  for (const sport of ALL) {
    const same = k => NOW[sport].seeds.every((s, i) => s.hash[k] === WAS[sport].seeds[i].hash[k]);
    check('P1', same('player'), `${sport}: every season line and every numeric counter on the final save is byte equal (${SEEDS.length} seeds of ${CAREERS})`);
    check('P1', same('dealt'), `${sport}: a rivalry beat is dealt in exactly the same seasons`);
    check('P1', same('notes'), `${sport}: every season note that is not the rival's own is equal line for line`);
    if (MOVED.includes(sport)) check('P1', !same('rival'), `${sport}: the rival's trail moved, as this step says it does`);
    else {
      check('P1', same('rival'), `${sport}: the rival's trail (his line, score, tally, rings, rating, age, retired, roster fact) is byte equal`);
      check('P1', same('allNotes'), `${sport}: every season note, the rival's included, is byte equal`);
      if (!CARDS.includes(sport)) check(sport === 'nba' ? 'L' : 'P1', same('beats'), `${sport}: every card dealt reads word for word and promises exactly what it did`);
    }
  }
  for (const sport of BOUND) {
    const t = Object.values(WAS[sport].total.by).reduce((a, m) => a + m.off, 0);
    check('B', t > 0, `${sport}: the tree before was not clean (${t} rival lines off the player's shape), so this proof is against the old line`);
  }

  /* P2: the same proof with EVERY card answered, the way the board drives a career (src/test/helpers/
     usCareerDrive.ts, the truth digest's own driver: free agency, the camp, the season, the summer's cards, the
     inbox, the rivalry beat and the rival choice, each answered). Round 1149's proof never answered a card.
     A sport this step does not name: whole saves byte equal. A sport it names (RIVAL_MOVED or RIVAL_CARDS): the
     careers are driven one season further at a time, and at the first season where anything OFF the rival
     differs (a different beat was dealt or answered), every season line played so far is still byte equal. */
  const P2N = FULL ? 1000 : Math.min(200, CAREERS);
  console.log(`P2) with every card answered: ${P2N} careers a sport, driven through the sport's binding`);
  const driven = (M, sport, i, seasons) => {
    const F = FLEET[sport]; const S = F.desc(M); const pos = F.pos[i % F.pos.length];
    const era = F.eras[Math.floor(i / F.pos.length) % F.eras.length];
    let cards = 0; let choices = 0;
    const counted = { ...S,
      dismissRivalryEvent: c => { cards += 1; return S.dismissRivalryEvent(c); },
      resolveRivalryChoice: (...a) => { const res = S.resolveRivalryChoice(...a); if (res) choices += 1; return res; } };
    const out = M.drive.driveCareer(counted, { key: `p2-${i}`, pos, arch: i, eraId: era === 'now' ? undefined : era, seasons });
    return { json: out.json, cards, choices, seasons: out.seasons };
  };
  const offRival = json => { const c = JSON.parse(json); const seasons = JSON.stringify(c.seasons); delete c.rival; return { rest: JSON.stringify(c), seasons, c }; };
  for (const sport of ALL) {
    const named = MOVED.includes(sport) || CARDS.includes(sport);
    let cards = 0; let choices = 0; let equal = 0; let parted = 0; let linesHeld = 0; const firstKeys = {}; let seasons = 0;
    for (let i = 0; i < P2N; i += 1) {
      const now = driven(E, sport, i, 40); const was = driven(B.mod, sport, i, 40);
      cards += now.cards; choices += now.choices; seasons += now.seasons;
      if (now.json === was.json) { equal += 1; continue; }
      if (!named) continue;
      for (let k = 1; k <= Math.max(now.seasons, was.seasons); k += 1) {
        const a = offRival(driven(E, sport, i, k).json); const b = offRival(driven(B.mod, sport, i, k).json);
        if (a.rest === b.rest) continue;
        parted += 1; if (a.seasons === b.seasons) linesHeld += 1;
        for (const key of new Set([...Object.keys(a.c), ...Object.keys(b.c)])) if (JSON.stringify(a.c[key]) !== JSON.stringify(b.c[key])) firstKeys[key] = (firstKeys[key] ?? 0) + 1;
        break;
      }
    }
    check('P2', cards > 0 && seasons > 0, `${sport}: the drive answered ${cards} rivalry cards and ${choices} rival choices over ${seasons} seasons (more than none)`);
    if (!named) check('P2', equal === P2N, `${sport}: ${equal} of ${P2N} whole saves are byte equal`);
    else {
      check('P2', equal < P2N, `${sport}: the saves moved, as this step says they do (${P2N - equal} of ${P2N} differ)`);
      check('P2', linesHeld === parted, `${sport}: at the first season where anything off the rival differs, every season line so far is byte equal (${linesHeld} of ${parted} careers that part; ${P2N - equal - parted} differ under the rival alone)`);
      console.log(`     ${sport}: what differs off the rival at that first season, by top level key: ${Object.entries(firstKeys).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join(', ') || 'nothing'}`);
    }
  }
}

const size = FULL ? 'full size' : 'shrunk, exact checks only';
if (CONTROL) {
  const needs = CONTROLS[CONTROL].needs;
  const hit = needs.split(',').every(n => failedSections.has(n));
  console.log(`control ${CONTROL}: ${hit ? 'FIRED' : 'DID NOT FIRE'} (must turn ${needs} red; red: ${[...failedSections].join(', ') || 'nothing'})`);
}
console.log(`simUsRivalSense: ${checks} checks, ${failed} failed (${size})${failed ? `, red sections: ${[...failedSections].join(', ')}` : ''}`);
process.exit(failed ? 1 : 0);
