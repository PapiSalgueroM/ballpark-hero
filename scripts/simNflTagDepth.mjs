/* NFL Front Office: the franchise tag and the depth chart. Round 723.

   THE RULES THIS FENCES, both in src/lib/frontOffice.ts:

   The franchise tag. Once per offseason, before free agency opens (the
   offseason step the last draft pick runs), a club may tag one man whose
   deal is up: one fully guaranteed year at the mean of the five largest
   salaries at his position across the thirty two rosters this season, or 120
   percent of his own salary, whichever is greater. That is the CBA's
   exclusive tender (Article 10, Section 2; the engine cites two sources)
   without the Cap Percentage Average leg, which needs years of tag history
   the sim does not have. A tagged man never reaches the pool, and once his
   tag year is over without a second tag he is an ordinary man again (no tag
   marks, no guarantee). CPU clubs tag their best expiring starter when he is
   one of the five best at his position league wide and the tender fits their
   room, and never touch the GM's club, whose tag is the GM's call.

   The depth chart. Every club carries an ordered chart per position group,
   by rating until the GM reorders it, and team strength reads its starters
   off the chart: a unit's slots are shared out by rating (the top five
   healthy skill men decide how many slots RB, WR and TE each earn), and each
   group's chart order decides who fills that group's slots. With a chart by
   rating that is exactly the men the pre round code picked, which is what
   keeps every saved league's strength unchanged. The line is every healthy
   lineman, as it was before the round, so a save carrying six or more of
   them reads exactly as it did too. A man the GM's saved order does not name
   (signed, drafted or traded for since) slots in ahead of the first named
   man rated below him, and a saved order that reads exactly like the order
   by rating is dropped, so a swap and a swap back hands the group back to
   the sim.

   One more rule rides along: an untagged star (76 plus) on his last year now
   walks STAR_WALK_CHANCE of the time, where before he always stayed, so the
   tag has something to protect. Role players keep their coin flip.

   Everything here runs the REAL engine, bundled with esbuild. Nothing reads
   dist or the clock. Sections:

     1) the tender is the top five mean or 120 percent, whichever is greater,
        on a table of fixtures: a man under the mean, a man over it, the top
        five mean recomputed here for every position on several leagues, and
        the second tag in a row costing at least 120 percent of the first.
        Plus the refusals (second tag, years left, no room), the cap check
        charging only the raise (room between the raise and the whole tender
        is enough, room just under the raise is not), the cap hit landing
        now, and a cut tagged man costing his whole salary.
     2) a tagged man never appears in that year's free agent pool, over six
        seeded offseasons per seed with the GM's club tagging in even
        offseasons and passing in odd ones and the CPU clubs tagging, and he
        carries the tender into the season on one year. A man whose tag year
        ends without a second tag carries no tag marks and no guarantee,
        wherever he lands. The CPU policy never tags the GM's club: checked
        in the GM's passing years and on a GM club picked, every offseason,
        from the clubs the policy would tag.
     3) the chart moves strength the right way: over 200 random swaps of a
        starter and a backup within a group, a better backup promoted raises
        strength, a worse one lowers it, swapping back restores it exactly,
        and no swap changes how many men any group starts. An injured starter
        is skipped and the next man in the order steps up. A newcomer to a
        group with a saved order slots in at the rule's place: one who
        outrates every starter in his group starts, and adds strength
        whenever he moves no slot between groups; one rated below everyone
        goes last. A swap and a swap back leaves no saved order, and a
        better man signed after it starts and adds strength.
     4) the fixture: the pre round strength formula, frozen in this file, and
        the engine agree to 1e-9 on every club of several seeded leagues,
        fresh, after offseasons and drafts, and with a third of the clubs
        handed four or five extra linemen, under random injuries, with no
        chart saved; a chartless chart is the order by rating; every
        scheduled game's win probability matches; a reordered chart survives
        a save round trip.
     5) the CPU tag rate, pooled over six seeds and six offseasons, sits in a
        band set from the measurements below.
     6) the engine cites the rule's sources, two of them, by URL.
     7) untagged men on their last year walk at the rule's rates: stars
        STAR_WALK_CHANCE of the time, role players half the time.

   MEASUREMENTS (2026-10-01, the engine as shipped, the harness's six seeds
   unless stated):
     Section 3: 200 swaps found in 1019 tries, 109 promotions and 91
     demotions, every one moving strength the right way; 159 injury cases, 8
     of them in a single group unit (all quarterbacks, since every healthy
     lineman starts).
     Section 4: 960 club states compared, 54 of them carrying six or more
     linemen, and 8160 scheduled games, 0 mismatches. Why the line is every
     lineman: a probe of board like careers (eight seeds, fifteen seasons, the
     GM taking the best graded prospect) found six or more linemen on 43 of
     3840 club seasons and on 23 of the GM's own 120, so a five man line
     would have changed those saves.
     Section 5, the CPU tag rate with the top five rule: pooled 0.349 of
     clubs an offseason (402 of 1152); the first offseason, the same for
     every seed because the bake fixes who is expiring, 0.094; later
     offseasons 0.094 to 0.594 one at a time. The same pooled statistic over
     30 other six seed sets: 0.329 to 0.356, median 0.341. The two policies
     this one replaced: any expiring starter rated 80, pooled 0.917 and 1.000
     every offseason from the third; the same with repeats banned, 0.839 to
     0.917. Band: pooled in [0.25, 0.48], about 0.08 clear of the lowest set
     measured and well under the nearest broken policy; no tags at all is 0.
     Section 7: stars 316 of 2070 walked, 0.153 (per seed 0.122 to 0.168);
     role players 414 of 810, 0.511. Over 30 other six seed sets the pooled
     star rate ran 0.130 to 0.167 and the role rate 0.460 to 0.541. Bands:
     stars [0.10, 0.20], role players [0.42, 0.58]; the pre round rule keeps
     every star, which is 0.

   CONTROLS, through NFL_TAG_DEPTH_CONTROL. Each rewrites a copy of the engine
   in OS temp (src is never touched), refuses to run if its anchor is not in
   the file, and must turn exactly its sections red:
     nochart     strength ignores the chart order         -> 3
     tagwalks    a tagged man reaches the expiring branch -> 1 and 2 (the copy
                 forgets the tag at the offseason, so section 1's second tag
                 in a row reads as a first; measured 58 of 474 tagged men in
                 the pool and 397 without their tender)
     cheaptag    the 120 percent floor dropped            -> 1
     fixedslots  skill slots fixed at RB 1, WR 3, TE 1    -> 4
     olcap       the line cut to five starters            -> 4
     nostarwalk  every untagged star stays, the old rule  -> 7
     capstrict   the cap check charges the whole tender   -> 1
                 against the room, not only the raise
     usertag     the CPU policy no longer skips the GM's  -> 2
                 club
     noclear     a former tagged man keeps his tag marks  -> 2
                 and guarantee after re-signing or walking
     newbottom   a man the saved order does not name goes -> 3
                 to the bottom, the first draft's rule
     newtop      a man the saved order does not name goes -> 3
                 to the top
     keepsaved   a saved order equal to the order by      -> 3
                 rating is kept, not handed back
   Every anchor must appear exactly once in the engine, or the control
   refuses to run. Under a control the process exits non zero whether or not the expected
   sections went red, and says which it was.

   Run: node scripts/simNflTagDepth.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = path.join(ROOT, 'src', 'lib', 'frontOffice.ts');
const CUTS = path.join(ROOT, 'src', 'lib', 'frontOfficeCuts.ts');
const CONTROL = process.env.NFL_TAG_DEPTH_CONTROL || '';
const EXPECT = {
  nochart: [3],
  tagwalks: [1, 2],
  cheaptag: [1],
  fixedslots: [4],
  olcap: [4],
  nostarwalk: [7],
  capstrict: [1],
  usertag: [2],
  noclear: [2],
  newbottom: [3],
  newtop: [3],
  keepsaved: [3],
};
if (CONTROL && !EXPECT[CONTROL]) {
  console.error(`NFL_TAG_DEPTH_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(EXPECT).join(', ')})`);
  process.exit(1);
}
const SWAPS = {
  nochart: [[
    '    const order = depthOrder(team, g);',
    '    const order = [...team.players.filter(p => p.pos === g)].sort((a, b) => b.ovr - a.ovr);',
  ]],
  tagwalks: [[
    '        if (p.tagSeason === league.season + 1) {',
    '        if (false) {',
  ]],
  cheaptag: [[
    '  return Math.max(topFiveSalary(league, p.pos), round1(p.salary * TAG_PRIOR_MULT));',
    '  return topFiveSalary(league, p.pos);',
  ]],
  fixedslots: [[
    '    const share = top.filter(p => p.pos === g).length;',
    "    const share = g === 'WR' ? 3 : g === 'RB' || g === 'TE' ? 1 : top.filter(p => p.pos === g).length;",
  ]],
  olcap: [[
    'export const OL_SLOTS = Number.POSITIVE_INFINITY;',
    'export const OL_SLOTS = 5;',
  ]],
  nostarwalk: [[
    '        const walks = p.ovr < 76 ? rng() < 0.5 : rng() < STAR_WALK_CHANCE;',
    '        const walks = p.ovr < 76 ? rng() < 0.5 : (rng(), false);',
  ]],
  capstrict: [[
    '  const short = round1(salary - p.salary - capRoom(team, league.cap));',
    '  const short = round1(salary - capRoom(team, league.cap));',
  ]],
  usertag: [[
    '    if (t.abbr === userTeam || t.tagUsedFor === league.season + 1) continue;',
    '    if (t.tagUsedFor === league.season + 1) continue;',
  ]],
  noclear: [[
    '        clearTag(p);',
    '        /* tag marks kept */',
  ]],
  newbottom: [[
    '    if (at < 0) out.push(p); else out.splice(at, 0, p);',
    '    out.push(p);',
  ]],
  newtop: [[
    '    if (at < 0) out.push(p); else out.splice(at, 0, p);',
    '    out.splice(0, 0, p);',
  ]],
  keepsaved: [[
    "  if (depthOrder(team, pos).map(p => p.id).join(',') === byRating) delete team.depth[pos];",
    "  if (depthOrder(team, pos).map(p => p.id).join(',') === byRating && false) delete team.depth[pos];",
  ]],
};
const NOTE = {
  nochart: 'the engine copy fills every unit by rating, the chart order ignored',
  tagwalks: 'the engine copy sends a tagged man through the ordinary expiring branch',
  cheaptag: 'the engine copy charges the top five mean alone, never 120 percent',
  fixedslots: 'the engine copy starts RB 1, WR 3, TE 1 whatever the ratings say',
  olcap: 'the engine copy starts five linemen, not every healthy one',
  nostarwalk: 'the engine copy keeps every untagged star, the pre round rule',
  capstrict: 'the engine copy charges the whole tender against the room, not only the raise',
  usertag: 'the engine copy lets the CPU policy tag the GM\'s own club',
  noclear: 'the engine copy keeps the tag marks and the guarantee after the tag year',
  newbottom: 'the engine copy puts a man the saved order does not name at the bottom',
  newtop: 'the engine copy puts a man the saved order does not name at the top',
  keepsaved: 'the engine copy keeps a saved order that equals the order by rating',
};

const SECTION_NAMES = {
  1: 'the tender: top five mean or 120 percent, whichever is greater',
  2: 'a tagged man never reaches that year\'s pool',
  3: 'the chart moves strength the right way',
  4: 'the fixture: the pre round formula and the engine agree',
  5: 'the CPU tag rate',
  6: 'the engine cites the rule',
  7: 'untagged men on their last year walk at the rule\'s rates',
};

let checks = 0;
const fails = [];
const bySection = new Map();
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) { s.bad += 1; fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`); }
  bySection.set(section, s);
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const round1 = n => Math.round(n * 10) / 10;
const clone = v => JSON.parse(JSON.stringify(v));
const lcg = start => { let seed = start >>> 0; return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; };
const normaliseEol = t => t.split('\r\n').join('\n');

/* ---- the engine, bundled, with the control's rewrite when there is one ---- */
const BUNDLE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-nfltag-'));
let engine = null;
let cuts = null;
try {
  const engineSrc = normaliseEol(fs.readFileSync(ENGINE, 'utf8'));
  let enginePath = ENGINE;
  if (CONTROL) {
    for (const [now] of SWAPS[CONTROL]) {
      const n = engineSrc.split(now).length - 1;
      if (n !== 1) throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 70))} appears ${n} times in frontOffice.ts, not once, so the rewrite would change ${n === 0 ? 'nothing' : 'more than its rule'}. Refusing to run.`);
    }
    let text = engineSrc;
    for (const [now, was] of SWAPS[CONTROL]) text = text.split(now).join(was);
    if (text === engineSrc) throw new Error(`control ${CONTROL}: the rewrite changed nothing. Refusing to run.`);
    /* the copy sits outside src, so its relative siblings point back at the real directory */
    const libDir = path.join(ROOT, 'src', 'lib').split('\\').join('/');
    text = text.replace(/from '\.\/([A-Za-z0-9_-]+)'/g, `from '${libDir}/$1'`);
    enginePath = path.join(BUNDLE_DIR, 'frontOfficeControl.ts');
    fs.writeFileSync(enginePath, text);
    console.log(`   control ${CONTROL}: ${NOTE[CONTROL]}`);
  }
  const fwd = p => JSON.stringify(p.split('\\').join('/'));
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  fs.writeFileSync(entry, `export * as engine from ${fwd(enginePath)};\nexport * as cuts from ${fwd(CUTS)};\n`);
  const out = path.join(BUNDLE_DIR, 'engine.mjs');
  /* esbuild resolves by walk-up from the repo root, so a worktree inside the repo finds it */
  let esbuildBin = null;
  let dir = ROOT;
  for (let i = 0; i < 6 && !esbuildBin; i += 1) {
    const candidate = path.join(dir, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
    if (fs.existsSync(candidate)) esbuildBin = candidate;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  if (!esbuildBin) throw new Error('esbuild not found by walk-up from the repo root');
  execSync(`"${esbuildBin}" "${entry}" --bundle --format=esm --platform=node --alias:@="${path.join(ROOT, 'src')}" --outfile="${out}" --log-level=error`);
  const mod = await import(pathToFileURL(out).href);
  engine = mod.engine;
  cuts = mod.cuts;
} catch (e) {
  console.error(`FAIL: the engine could not be bundled and run: ${String(e && e.message ? e.message : e).slice(0, 240)}`);
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  process.exit(1);
} finally {
  fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
}
for (const fn of ['initLeague', 'runOffseason', 'teamStrength', 'defenceRating', 'winProb', 'depthOrder', 'depthChart', 'setDepthOrder', 'swapDepth',
  'unitStarters', 'starterIds', 'topFiveSalary', 'franchiseTagSalary', 'expiringPlayers', 'tagRefusal', 'applyFranchiseTag', 'cpuFranchiseTags',
  'releasePlayer', 'capUsed', 'capRoom', 'generateDraftClass', 'draftOrder', 'prospectToPlayer', 'hasSavedDepth', 'resetDepth']) {
  if (typeof engine[fn] !== 'function') { console.error(`FAIL: frontOffice.ts does not export ${fn}`); process.exit(1); }
}
for (const k of ['DEPTH_GROUPS', 'SKILL_POS', 'DEF_POS', 'DEF_SLOTS', 'REPLACEMENT_OVR', 'SKILL_SLOTS', 'OL_SLOTS', 'TAG_TOP_N', 'TAG_PRIOR_MULT', 'TAG_CPU_MIN_OVR', 'STAR_WALK_CHANCE']) {
  if (engine[k] === undefined) { console.error(`FAIL: frontOffice.ts does not export ${k}`); process.exit(1); }
}
if (typeof cuts.deadMoneyFor !== 'function') { console.error('FAIL: frontOfficeCuts.ts does not export deadMoneyFor'); process.exit(1); }
/* OL_SLOTS is left out of this guard on purpose: the olcap control sets it
   to five, and section 4's fixture with six and seven linemen is what has to
   catch that, not a refusal to run. */
if (engine.SKILL_SLOTS !== 5 || engine.DEF_SLOTS !== 6 || engine.REPLACEMENT_OVR !== 60) {
  console.error(`FAIL: the unit shape changed (skill ${engine.SKILL_SLOTS}, DEF ${engine.DEF_SLOTS}, replacement ${engine.REPLACEMENT_OVR}); the frozen formula below encodes 5, 6, 60 and every healthy lineman`);
  process.exit(1);
}

/* ---- the pre round formula, frozen as it stood before Round 723 ---------- */
const SKILL = new Set(['RB', 'WR', 'TE']);
const DEF = new Set(['DL', 'LB', 'DB']);
const oldDefence = team => {
  const best = team.players.filter(p => p.out === 0 && DEF.has(p.pos)).map(p => p.ovr).sort((a, b) => b - a).slice(0, 6);
  const filled = best.reduce((s, v) => s + v, 0);
  return (filled + (6 - best.length) * 60) / 6;
};
const oldStrength = team => {
  const healthy = team.players.filter(p => p.out === 0);
  const qb = Math.max(64, ...healthy.filter(p => p.pos === 'QB').map(p => p.ovr));
  const skill = healthy.filter(p => SKILL.has(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, 5);
  const skillAvg = skill.length ? skill.reduce((s, p) => s + p.ovr, 0) / skill.length : 64;
  const ol = healthy.filter(p => p.pos === 'OL');
  const olAvg = ol.length ? ol.reduce((s, p) => s + p.ovr, 0) / ol.length : 64;
  return qb * 0.30 + skillAvg * 0.30 + olAvg * 0.12 + oldDefence(team) * 0.28;
};
const oldWinProb = (home, away) => 1 / (1 + Math.pow(10, -(oldStrength(home) - oldStrength(away) + 2) / 14));

/* A league a few offseasons in, the way the board gets there: offseason, then
   a draft that hands every club one prospect, so rosters grow uneven. */
const advance = (lg, rng, seasons) => {
  for (let s = 0; s < seasons; s += 1) {
    engine.runOffseason(lg, rng);
    const cls = engine.generateDraftClass(rng, 40, new Set());
    let i = 0;
    for (const abbr of engine.draftOrder(lg.teams)) lg.teams[abbr].players.push(engine.prospectToPlayer(cls[i++ % cls.length], rng));
  }
  return lg;
};
const injure = (lg, rng, rate = 0.1) => {
  for (const t of Object.values(lg.teams)) for (const p of t.players) p.out = rng() < rate ? 1 + Math.floor(rng() * 3) : 0;
};
const heal = lg => { for (const t of Object.values(lg.teams)) for (const p of t.players) p.out = 0; };
const SEEDS = [723, 20261001, 61, 4242, 9, 1337];

/* ======================================================================= 1 */
{
  /* the top five mean, recomputed here from the rosters, for every position
     on several leagues */
  let agree = 0, disagree = [];
  for (const seed of SEEDS.slice(0, 3)) {
    const lg = advance(engine.initLeague(lcg(seed)), lcg(seed + 1), seed % 2);
    for (const pos of engine.DEPTH_GROUPS) {
      const top = Object.values(lg.teams).flatMap(t => t.players.filter(p => p.pos === pos).map(p => p.salary)).sort((a, b) => b - a).slice(0, 5);
      const mean = round1(top.reduce((s, v) => s + v, 0) / top.length);
      if (near(engine.topFiveSalary(lg, pos), mean)) agree += 1;
      else disagree.push(`${pos} seed ${seed}: engine ${engine.topFiveSalary(lg, pos)} vs ${mean}`);
    }
  }
  ok(1, 'the top five mean is the mean of the five largest salaries at the position', disagree.length === 0 && agree === 24, disagree.slice(0, 3).join(' | '));

  const lg = engine.initLeague(lcg(SEEDS[0]));
  const teams = Object.values(lg.teams);
  /* fixture a: a last year man well under the mean pays the mean */
  const under = teams.flatMap(t => t.players.filter(p => p.years <= 1 && round1(p.salary * 1.2) < engine.topFiveSalary(lg, p.pos) - 1));
  ok(1, 'the fixture league has last year men under the mean', under.length >= 5, `${under.length} found`);
  let underBad = [];
  for (const p of under.slice(0, 12)) {
    const want = engine.topFiveSalary(lg, p.pos);
    if (!near(engine.franchiseTagSalary(lg, p), want)) underBad.push(`${p.name} ${p.pos} ${p.salary}M: ${engine.franchiseTagSalary(lg, p)} vs ${want}`);
  }
  ok(1, 'a man under the mean is tendered the top five mean', underBad.length === 0, underBad.slice(0, 3).join(' | '));
  /* fixture b: a man whose 120 percent clears the mean pays 120 percent.
     Built on a copy by raising a last year man's salary above the mean. */
  const over = [];
  for (const pos of engine.DEPTH_GROUPS) {
    const lgb = clone(lg);
    const t = Object.values(lgb.teams).find(x => x.players.some(p => p.pos === pos && p.years <= 1));
    if (!t) continue;
    const p = t.players.find(x => x.pos === pos && x.years <= 1);
    const mean = engine.topFiveSalary(lgb, pos);
    p.salary = round1(mean + 4);
    /* his own raise moves the mean, so read it again before asking */
    const meanNow = engine.topFiveSalary(lgb, pos);
    const want = Math.max(meanNow, round1(p.salary * 1.2));
    over.push({ pos, got: engine.franchiseTagSalary(lgb, p), want, floor: round1(p.salary * 1.2), meanNow });
  }
  ok(1, 'the fixture has a man over the mean at every position', over.length === engine.DEPTH_GROUPS.length && over.every(o => o.floor > o.meanNow),
    over.filter(o => !(o.floor > o.meanNow)).map(o => `${o.pos} floor ${o.floor} mean ${o.meanNow}`).join(' | '));
  ok(1, 'a man whose 120 percent clears the mean is tendered 120 percent', over.every(o => near(o.got, o.want) && near(o.got, o.floor)),
    over.filter(o => !near(o.got, o.floor)).map(o => `${o.pos}: ${o.got} vs ${o.floor}`).join(' | '));

  /* fixture c: the second tag in a row, through the real offseason */
  let chained = 0, chainBad = [];
  for (const seed of SEEDS.slice(0, 4)) {
    const lgc = engine.initLeague(lcg(seed));
    const rng = lcg(seed + 99);
    const team = Object.values(lgc.teams).find(t => engine.expiringPlayers(t).length > 0 && engine.capRoom(t, lgc.cap) > 80);
    if (!team) continue;
    const man = engine.expiringPlayers(team)[0];
    const first = engine.applyFranchiseTag(lgc, team, man.id);
    if (!first.ok) { chainBad.push(`seed ${seed}: first tag refused, ${first.reason}`); continue; }
    engine.runOffseason(lgc, rng);
    const still = team.players.find(p => p.id === man.id);
    if (!still) continue; /* retired: nothing to chain */
    const second = engine.applyFranchiseTag(lgc, team, man.id);
    if (!second.ok) { chainBad.push(`seed ${seed}: second tag refused, ${second.reason}`); continue; }
    chained += 1;
    const want = Math.max(engine.topFiveSalary(lgc, man.pos), round1(first.salary * 1.2));
    if (!near(second.salary, want)) chainBad.push(`seed ${seed}: second ${second.salary} vs ${want}`);
    if (second.salary < round1(first.salary * 1.2) - 1e-9) chainBad.push(`seed ${seed}: second ${second.salary} under 120 percent of first ${first.salary}`);
    if (second.count !== 2 || still.tagCount !== 2) chainBad.push(`seed ${seed}: count ${second.count}/${still.tagCount}`);
  }
  ok(1, 'the second tag in a row costs the greater of the mean and 120 percent of the first', chained >= 2 && chainBad.length === 0, chainBad.slice(0, 3).join(' | ') || `${chained} chains`);

  /* the refusals and the books */
  const lgd = engine.initLeague(lcg(SEEDS[1]));
  const td = Object.values(lgd.teams).find(t => engine.expiringPlayers(t).length >= 2 && engine.capRoom(t, lgd.cap) > 80);
  ok(1, 'a fixture club with two expiring men and room exists', !!td);
  if (td) {
    const [a, b] = engine.expiringPlayers(td);
    const long = td.players.find(p => p.years > 1);
    const before = engine.capUsed(td);
    const res = engine.applyFranchiseTag(lgd, td, a.id);
    ok(1, 'the first tag goes through', res.ok, res.ok ? '' : res.reason);
    ok(1, 'the cap hit counts now', res.ok && near(engine.capUsed(td), round1(before - res.prior + res.salary)), `${before} -> ${engine.capUsed(td)} with ${res.ok ? res.salary - res.prior : 'nothing'}`);
    ok(1, 'the tagged man is on one guaranteed year for the coming season', a.years === 1 && a.guaranteed === true && a.tagSeason === lgd.season + 1 && a.tagCount === 1);
    const again = engine.tagRefusal(lgd, td, b.id);
    ok(1, 'a second tag the same offseason is refused with the sentence', again === 'One tag per offseason, and yours is used.', String(again));
    ok(1, 'a second tag the same offseason does not apply', engine.applyFranchiseTag(lgd, td, b.id).ok === false && b.guaranteed === undefined);
    const lge = engine.initLeague(lcg(SEEDS[1]));
    const te = lge.teams[td.abbr];
    const longE = te.players.find(p => p.years > 1);
    ok(1, 'a man with years left is refused', !!long && !!longE && /years left/.test(engine.tagRefusal(lge, te, longE.id) ?? ''), engine.tagRefusal(lge, te, longE ? longE.id : ''));
    const lgf = engine.initLeague(lcg(SEEDS[1]));
    const tf = lgf.teams[td.abbr];
    const af = engine.expiringPlayers(tf)[0];
    lgf.cap = engine.capUsed(tf) + 1;
    const short = engine.tagRefusal(lgf, tf, af.id);
    ok(1, 'a tender the room cannot cover is refused with the shortfall', /over the cap/.test(short ?? '') && engine.applyFranchiseTag(lgf, tf, af.id).ok === false, String(short));
    /* the size of the cap check. His old salary is already on the books, so
       the room has to cover the raise, not the whole tender. One fixture
       with room halfway between the raise and the whole tender (allowed) and
       one with room just under the raise (refused), on every expiring man of
       the club whose old salary leaves a real gap between the two. */
    let between = 0, betweenBad = [], justUnder = 0, justUnderBad = [];
    /* each fixture is a fresh league, and ids are minted per league, so the
       man is found again by name (names are unique in a league) */
    for (const name of engine.expiringPlayers(engine.initLeague(lcg(SEEDS[1])).teams[td.abbr]).map(p => p.name)) {
      const lgg = engine.initLeague(lcg(SEEDS[1]));
      const tg = lgg.teams[td.abbr];
      const man = tg.players.find(p => p.name === name);
      if (!man || man.salary < 1) continue;
      const tender = engine.franchiseTagSalary(lgg, man);
      const raise = round1(tender - man.salary);
      lgg.cap = round1(engine.capUsed(tg) + raise + man.salary / 2);
      const room = engine.capRoom(tg, lgg.cap);
      if (!(room >= raise && room < tender)) { betweenBad.push(`${man.name}: fixture room ${room} not between raise ${raise} and tender ${tender}`); continue; }
      between += 1;
      const why = engine.tagRefusal(lgg, tg, man.id);
      const res = engine.applyFranchiseTag(lgg, tg, man.id);
      if (why !== null || !res.ok) betweenBad.push(`${man.name}: room ${room} covers the raise ${raise} of a ${tender} tender and was refused (${why})`);
      else if (engine.capRoom(tg, lgg.cap) < -1e-9) betweenBad.push(`${man.name}: the tag left room ${engine.capRoom(tg, lgg.cap)}`);
      if (raise < 0.5) continue;
      const lgu = engine.initLeague(lcg(SEEDS[1]));
      const tu = lgu.teams[td.abbr];
      const manU = tu.players.find(p => p.name === name);
      lgu.cap = round1(engine.capUsed(tu) + raise - 0.2);
      justUnder += 1;
      const whyU = engine.tagRefusal(lgu, tu, manU.id);
      if (whyU === null || !/over the cap/.test(whyU)) justUnderBad.push(`${man.name}: room ${engine.capRoom(tu, lgu.cap)} under the raise ${raise} gave ${JSON.stringify(whyU)}`);
    }
    ok(1, 'room for the raise but not the whole tender is enough to tag', between >= 1 && betweenBad.length === 0, betweenBad.slice(0, 3).join(' | ') || `${between} men`);
    ok(1, 'room just under the raise is refused', justUnder >= 1 && justUnderBad.length === 0, justUnderBad.slice(0, 3).join(' | ') || `${justUnder} men`);
    /* the guarantee: cutting him is dead money in full, and the pool copy is ordinary */
    const dm = cuts.deadMoneyFor(a);
    ok(1, 'cutting a tagged man is dead money in full, nothing next season', near(dm.now, a.salary) && dm.next === 0, `${dm.now}/${dm.next} vs ${a.salary}`);
    const roomBefore = engine.capRoom(td, lgd.cap);
    const cutOk = engine.releasePlayer(td, lgd.freeAgents, a.id);
    const fa = lgd.freeAgents.find(p => p.id === a.id);
    ok(1, 'the cut lands the whole tender as dead money', cutOk && near(engine.capRoom(td, lgd.cap), roomBefore), `room ${roomBefore} -> ${engine.capRoom(td, lgd.cap)}`);
    ok(1, 'in the pool he is an ordinary man on one year', !!fa && fa.guaranteed === undefined && fa.tagSeason === undefined && fa.years === 1);
  }
}

/* ======================================================================= 2 */
{
  let tags = 0, inPool = [], lostTender = [], seasonsRun = 0;
  let gmPassed = 0, cpuOnGm = [], picked = 0, skipBad = [], former = 0, marksKept = [];
  const everyMan = lg => [...Object.values(lg.teams).flatMap(t => t.players), ...lg.freeAgents];
  for (const seed of SEEDS) {
    const rng = lcg(seed * 31 + 5);
    const lg = engine.initLeague(lcg(seed));
    const me = Object.keys(lg.teams)[seed % 32];
    for (let s = 0; s < 6; s += 1) {
      /* The skip, where it matters: read off a copy the clubs the policy
         would tag with no GM anywhere, then make each of the first three the
         GM's club on a fresh copy. The policy must pass over him, called
         directly and inside the offseason, and still tag somebody else. */
      const wouldTag = engine.cpuFranchiseTags(clone(lg)).map(x => x.team);
      for (const abbr of wouldTag.slice(0, 3)) {
        picked += 1;
        const asGm = clone(lg);
        const byPolicy = engine.cpuFranchiseTags(asGm, abbr);
        if (byPolicy.some(x => x.team === abbr) || asGm.teams[abbr].tagUsedFor === asGm.season + 1) skipBad.push(`${abbr} seed ${seed} offseason ${s + 1}: the policy tagged the GM's club`);
        if (wouldTag.length > 1 && byPolicy.length === 0) skipBad.push(`${abbr} seed ${seed} offseason ${s + 1}: the policy tagged nobody at all`);
        const inOff = clone(lg);
        const newsOff = engine.runOffseason(inOff, lcg(seed * 101 + s), abbr);
        if (newsOff.tagged.some(x => x.team === abbr)) skipBad.push(`${abbr} seed ${seed} offseason ${s + 1}: the offseason tagged the GM's club`);
      }
      /* the men on a tag for the season just played: unless tagged again,
         this offseason ends it */
      const onTag = new Set(everyMan(lg).filter(p => p.tagSeason === lg.season).map(p => p.id));
      const tagged = [];
      const mine = lg.teams[me];
      /* the GM tags in even offseasons and passes in odd ones, so the skip is
         also read where his club's tag is not already used */
      const cand = s % 2 === 0 ? engine.expiringPlayers(mine).find(p => engine.tagRefusal(lg, mine, p.id) === null) : undefined;
      if (s % 2 === 1) gmPassed += 1;
      if (cand) {
        const res = engine.applyFranchiseTag(lg, mine, cand.id);
        if (res.ok) tagged.push({ team: me, id: cand.id, name: cand.name, salary: res.salary });
      }
      const news = engine.runOffseason(lg, rng, me);
      seasonsRun += 1;
      for (const tg of news.tagged) if (tg.team === me) cpuOnGm.push(`${me} ${tg.player} seed ${seed} offseason ${s + 1}`);
      /* No tag marks and no guarantee on anyone, rostered or in the pool,
         except a man on a tag for the coming season. */
      for (const p of everyMan(lg)) {
        if (onTag.has(p.id) && p.tagSeason !== lg.season) former += 1;
        if (p.tagSeason === undefined && p.tagCount === undefined && p.guaranteed === undefined) continue;
        if (!(p.tagSeason === lg.season && p.guaranteed === true && p.tagCount >= 1)) marksKept.push(`${p.name}: tagSeason ${p.tagSeason} tagCount ${p.tagCount} guaranteed ${p.guaranteed} in season ${lg.season}`);
      }
      for (const tg of news.tagged) {
        const man = lg.teams[tg.team].players.find(p => p.name === tg.player) ?? lg.freeAgents.find(p => p.name === tg.player);
        tagged.push({ team: tg.team, id: man ? man.id : `?${tg.player}`, name: tg.player, salary: tg.salary });
      }
      tags += tagged.length;
      for (const tg of tagged) {
        if (lg.freeAgents.some(p => p.id === tg.id || p.name === tg.name)) inPool.push(`${tg.team} ${tg.name} seed ${seed} offseason ${s + 1}`);
        const on = lg.teams[tg.team].players.find(p => p.id === tg.id);
        /* retired men are nowhere, which is not the pool */
        if (on && !(on.years === 1 && near(on.salary, tg.salary) && on.tagSeason === lg.season)) lostTender.push(`${tg.team} ${tg.name}: years ${on.years} salary ${on.salary} vs ${tg.salary} tagSeason ${on.tagSeason} vs ${lg.season}`);
      }
      const cls = engine.generateDraftClass(rng, 40, new Set());
      let i = 0;
      for (const abbr of engine.draftOrder(lg.teams)) lg.teams[abbr].players.push(engine.prospectToPlayer(cls[i++ % cls.length], rng));
    }
  }
  ok(2, 'enough tags happened for the check to mean anything', tags >= 60, `${tags} tags over ${seasonsRun} offseasons`);
  ok(2, 'no tagged man is in that year\'s free agent pool', inPool.length === 0, `${inPool.length} of ${tags}, e.g. ${inPool.slice(0, 3).join(' | ')}`);
  ok(2, 'every tagged man carries the tender into the season on one year', lostTender.length === 0, `${lostTender.length} of ${tags}, e.g. ${lostTender.slice(0, 3).join(' | ')}`);
  console.log(`   tag year over: ${former} men came off a tag; the GM's club was put in front of the policy ${picked} times; the GM passed ${gmPassed} offseasons`);
  ok(2, 'enough men came off a tag for the check to mean anything', former >= 100, `${former}`);
  ok(2, 'a man whose tag year is over carries no tag marks and no guarantee, rostered or in the pool', marksKept.length === 0, `${marksKept.length}, e.g. ${marksKept.slice(0, 3).join(' | ')}`);
  ok(2, 'the GM\'s club was put in front of the policy often enough', picked >= 60, `${picked}`);
  ok(2, 'the CPU policy never tags the GM\'s club, a club it would tag otherwise', skipBad.length === 0, `${skipBad.length}, e.g. ${skipBad.slice(0, 3).join(' | ')}`);
  ok(2, 'the offseason never names the GM\'s club among the CPU tags, in the years he passes too', cpuOnGm.length === 0 && gmPassed >= 18, `${cpuOnGm.length} of ${gmPassed} passing years, e.g. ${cpuOnGm.slice(0, 3).join(' | ')}`);
}

/* ======================================================================= 3 */
{
  const rng = lcg(7230);
  const leagues = SEEDS.slice(0, 3).map((seed, i) => advance(engine.initLeague(lcg(seed)), lcg(seed + 7), i + 1));
  const UNITS = [[['QB'], 1], [engine.SKILL_POS, engine.SKILL_SLOTS], [['OL'], engine.OL_SLOTS], [engine.DEF_POS, engine.DEF_SLOTS]];
  /* how many men each group starts, read the way the engine does */
  const sharesOf = team => {
    const out = {};
    for (const [groups, slots] of UNITS) for (const p of engine.unitStarters(team, groups, slots)) out[p.pos] = (out[p.pos] ?? 0) + 1;
    return out;
  };
  let swaps = 0, promoted = 0, demoted = 0, wrong = [], notRestored = [], sharesMoved = [], tries = 0;
  while (swaps < 200 && tries < 20000) {
    tries += 1;
    const lg = leagues[Math.floor(rng() * leagues.length)];
    const teams = Object.values(lg.teams);
    const team = clone(teams[Math.floor(rng() * teams.length)]);
    heal({ teams: { x: team } });
    const pos = engine.DEPTH_GROUPS[Math.floor(rng() * engine.DEPTH_GROUPS.length)];
    const share = sharesOf(team)[pos] ?? 0;
    /* a chart by rating has no better man on the bench, so the GM's chart is
       shuffled first: that is the state a reorder is made from, and it is what
       lets a promotion happen at all */
    const shuffled = engine.depthOrder(team, pos).map(p => p.id);
    for (let k = shuffled.length - 1; k > 0; k -= 1) { const r = Math.floor(rng() * (k + 1)); [shuffled[k], shuffled[r]] = [shuffled[r], shuffled[k]]; }
    if (!engine.setDepthOrder(team, pos, shuffled)) { wrong.push(`${team.abbr} ${pos}: shuffle refused`); continue; }
    const order = engine.depthOrder(team, pos);
    if (share === 0 || order.length <= share) continue;
    const i = Math.floor(rng() * share);
    const j = share + Math.floor(rng() * (order.length - share));
    const a = order[i], b = order[j];
    if (a.ovr === b.ovr) continue;
    const base = engine.teamStrength(team);
    const sharesBefore = JSON.stringify(sharesOf(team));
    if (!engine.swapDepth(team, pos, a.id, b.id)) { wrong.push(`${team.abbr} ${pos}: swap refused`); continue; }
    const after = engine.teamStrength(team);
    swaps += 1;
    if (b.ovr > a.ovr) {
      promoted += 1;
      if (!(after > base + 1e-9)) wrong.push(`${team.abbr} ${pos}: promoting ${b.ovr} over ${a.ovr} moved ${base.toFixed(4)} -> ${after.toFixed(4)}`);
    } else {
      demoted += 1;
      if (!(after < base - 1e-9)) wrong.push(`${team.abbr} ${pos}: benching ${a.ovr} for ${b.ovr} moved ${base.toFixed(4)} -> ${after.toFixed(4)}`);
    }
    if (JSON.stringify(sharesOf(team)) !== sharesBefore) sharesMoved.push(`${team.abbr} ${pos}: ${sharesBefore} -> ${JSON.stringify(sharesOf(team))}`);
    /* the chart on screen agrees: the promoted man now starts and the benched man does not */
    const ids = engine.starterIds(team);
    if (!ids.has(b.id) || ids.has(a.id)) wrong.push(`${team.abbr} ${pos}: starterIds disagrees with the swap`);
    engine.swapDepth(team, pos, a.id, b.id);
    if (!near(engine.teamStrength(team), base)) notRestored.push(`${team.abbr} ${pos}: ${base} -> ${engine.teamStrength(team)}`);
  }
  console.log(`   swaps: ${swaps} in ${tries} tries, ${promoted} promotions and ${demoted} demotions`);
  ok(3, 'two hundred starter and backup swaps were found', swaps === 200, `${swaps} in ${tries} tries`);
  ok(3, 'both directions were exercised', promoted >= 40 && demoted >= 40, `${promoted} promotions, ${demoted} demotions`);
  ok(3, 'a better backup promoted raises strength and a worse one benched lowers it, every time', wrong.length === 0, `${wrong.length} of ${swaps}, e.g. ${wrong.slice(0, 3).join(' | ')}`);
  ok(3, 'swapping back restores the number exactly', notRestored.length === 0, notRestored.slice(0, 3).join(' | '));
  ok(3, 'a reorder never changes how many men a group starts', sharesMoved.length === 0, sharesMoved.slice(0, 3).join(' | '));

  /* injuries: the first man in a group's order goes down. Skipped means read
     exactly as if he were not on the roster at all: same starters, same
     number. In a group that is a unit on its own (QB, OL) that is the next
     man in the order; in the skill and defence units the slots are shared
     out by rating again without him, so the next man up may be a man from
     another group, which is the five best healthy men rule and not a bug. */
  let stepUps = 0, stuck = [], singleGroup = 0;
  for (const lg of leagues) {
    for (const t0 of Object.values(lg.teams)) {
      const team = clone(t0);
      heal({ teams: { x: team } });
      for (const pos of engine.DEPTH_GROUPS) {
        const order = engine.depthOrder(team, pos);
        const share = sharesOf(team)[pos] ?? 0;
        if (share === 0 || order.length <= share) continue;
        const starter = order[0], next = order[share];
        const before = engine.teamStrength(team);
        const hurt = clone(team);
        hurt.players.find(p => p.id === starter.id).out = 2;
        const gone = clone(team);
        gone.players = gone.players.filter(p => p.id !== starter.id);
        stepUps += 1;
        const idsHurt = [...engine.starterIds(hurt)].sort().join();
        const idsGone = [...engine.starterIds(gone)].sort().join();
        if (idsHurt !== idsGone || !near(engine.teamStrength(hurt), engine.teamStrength(gone))) stuck.push(`${team.abbr} ${pos}: ${starter.name} out reads differently from ${starter.name} gone`);
        if (engine.starterIds(hurt).has(starter.id)) stuck.push(`${team.abbr} ${pos}: ${starter.name} is out and still starts`);
        if (pos === 'QB' || pos === 'OL') {
          singleGroup += 1;
          if (!engine.starterIds(hurt).has(next.id)) stuck.push(`${team.abbr} ${pos}: ${starter.name} out, next man ${next.name} sits`);
        }
        /* it costs whenever the best healthy man on the unit's bench, from any
           of its groups, is worse than the man who went down */
        const [groups] = UNITS.find(([g]) => g.includes(pos));
        const ids0 = engine.starterIds(team);
        const bench = team.players.filter(p => p.out === 0 && groups.includes(p.pos) && !ids0.has(p.id));
        const bestBench = bench.length ? Math.max(...bench.map(p => p.ovr)) : null;
        if (bestBench !== null && bestBench < starter.ovr && !(engine.teamStrength(hurt) < before - 1e-9)) stuck.push(`${team.abbr} ${pos}: losing a ${starter.ovr} with a ${bestBench} as the best man behind him did not cost`);
      }
    }
  }
  /* measured 159 and 8: every healthy lineman starts, so the line never has
     a man behind its starters, and most clubs carry one quarterback, so a
     single group unit with a bench is rare (all 8 are quarterbacks) */
  console.log(`   injury cases: ${stepUps}, ${singleGroup} of them at QB or OL`);
  ok(3, 'injury cases were found, some in single group units', stepUps >= 100 && singleGroup >= 4, `${stepUps}, ${singleGroup} at QB or OL`);
  ok(3, 'an injured starter is skipped and the next man steps up', stuck.length === 0, `${stuck.length} of ${stepUps}, e.g. ${stuck.slice(0, 3).join(' | ')}`);

  /* Newcomers. Every group of two or more men on every club gets a saved
     order (the order by rating turned upside down, the furthest a GM's order
     can sit from the ratings), then a new man arrives the way a signing, a
     pick or a trade brings him: pushed onto the roster, named by no saved
     order. Three arrivals, each on its own copy:
       better  rated above everyone in the group and above the weakest man
               his unit starts (and at least 70, so the quarterback floor of
               64 cannot hide him): he starts, and team strength goes up,
               every time;
       worse   rated below everyone: he goes last;
       random  anywhere from three under the group to three over it: he sits
               exactly where the rule puts him, ahead of the first man in the
               saved order rated below him, and everyone else keeps the GM's
               order. */
  const newcomer = (team, pos, ovr, tag) => ({ id: `new-${tag}-${team.abbr}-${pos}`, name: `New ${tag} ${pos}`, pos, age: 25, ovr, salary: 1, years: 2, out: 0, pot: ovr });
  /* one over the weakest man the unit starts when its slots are full, so a
     lineup picked by rating alone would start him too: a group that starts
     nobody (its unit's slots all held by better men of other groups) is not
     a group a merely better man walks into */
  const unitFloor = (team, pos) => {
    const [groups, slots] = UNITS.find(([g]) => g.includes(pos));
    const now = engine.unitStarters(team, groups, slots);
    return now.length >= slots ? Math.min(...now.map(p => p.ovr)) + 1 : 0;
  };
  const rngN = lcg(72302);
  let cases = 0, betterBad = [], weakBad = [], worseBad = [], ruleBad = [], slotMoves = 0;
  for (const lg of leagues) {
    for (const t0 of Object.values(lg.teams)) {
      for (const pos of engine.DEPTH_GROUPS) {
        const team = clone(t0);
        heal({ teams: { x: team } });
        const group = engine.depthOrder(team, pos);
        if (group.length < 2) continue;
        engine.setDepthOrder(team, pos, group.map(p => p.id).reverse());
        if (!engine.hasSavedDepth(team, pos)) continue; /* every man tied: upside down is the same order */
        cases += 1;
        const named = engine.depthOrder(team, pos);
        const base = engine.teamStrength(team);
        const sharesBefore = sharesOf(team);
        const top = Math.max(...group.map(p => p.ovr)), bottom = Math.min(...group.map(p => p.ovr));

        const tb = clone(team);
        const better = newcomer(team, pos, Math.max(70, top + 2, unitFloor(team, pos)), 'better');
        tb.players.push(better);
        if (!engine.starterIds(tb).has(better.id)) betterBad.push(`${team.abbr} ${pos}: a ${better.ovr} over a group topping at ${top} sits`);
        if (!(engine.teamStrength(tb) > base + 1e-9)) weakBad.push(`${team.abbr} ${pos}: a ${better.ovr} arrived and strength went ${base.toFixed(4)} -> ${engine.teamStrength(tb).toFixed(4)}`);
        const sharesNow = sharesOf(tb);
        if (Object.keys({ ...sharesBefore, ...sharesNow }).some(g => g !== pos && (sharesBefore[g] ?? 0) !== (sharesNow[g] ?? 0))) slotMoves += 1;

        const tw = clone(team);
        const worse = newcomer(team, pos, bottom - 2, 'worse');
        tw.players.push(worse);
        const wOrder = engine.depthOrder(tw, pos);
        if (wOrder[wOrder.length - 1].id !== worse.id) worseBad.push(`${team.abbr} ${pos}: a ${worse.ovr} under a group bottoming at ${bottom} is number ${wOrder.findIndex(p => p.id === worse.id) + 1} of ${wOrder.length}`);

        const tr = clone(team);
        const mid = newcomer(team, pos, bottom - 3 + Math.floor(rngN() * (top - bottom + 7)), 'random');
        tr.players.push(mid);
        const at = named.findIndex(q => q.ovr < mid.ovr);
        const want = [...named];
        if (at < 0) want.push(mid); else want.splice(at, 0, mid);
        const got = engine.depthOrder(tr, pos);
        if (got.map(p => p.id).join() !== want.map(p => p.id).join()) ruleBad.push(`${team.abbr} ${pos}: a ${mid.ovr} into ${named.map(p => p.ovr).join('/')} read ${got.map(p => p.ovr).join('/')}`);
      }
    }
  }
  console.log(`   newcomers: ${cases} saved groups, ${slotMoves} of the better arrivals moved a slot between groups`);
  ok(3, 'a real number of saved groups took a newcomer', cases >= 300, `${cases}`);
  ok(3, 'a newcomer who outrates his whole group starts at once', betterBad.length === 0, `${betterBad.length} of ${cases}, e.g. ${betterBad.slice(0, 3).join(' | ')}`);
  ok(3, 'that newcomer makes the team stronger, every time', weakBad.length === 0, `${weakBad.length} of ${cases}, e.g. ${weakBad.slice(0, 3).join(' | ')}`);
  ok(3, 'a newcomer rated below his whole group goes last', worseBad.length === 0, `${worseBad.length} of ${cases}, e.g. ${worseBad.slice(0, 3).join(' | ')}`);
  ok(3, 'any newcomer sits ahead of the first man rated below him, the GM\'s order kept', ruleBad.length === 0, `${ruleBad.length} of ${cases}, e.g. ${ruleBad.slice(0, 3).join(' | ')}`);

  /* A swap and a swap back on a group nobody had touched hands it back to
     the sim: nothing saved, and a better man signed after it starts and
     makes the team stronger. This is the board's own flow, the one the
     review found benching a 97 in 1520 of 3200 cases. */
  let undone = 0, stillSaved = [], afterBad = [];
  for (const lg of leagues) {
    for (const t0 of Object.values(lg.teams)) {
      for (const pos of engine.DEPTH_GROUPS) {
        const team = clone(t0);
        heal({ teams: { x: team } });
        const order = engine.depthOrder(team, pos);
        if (order.length < 2 || team.depth !== undefined) continue;
        const [a, b] = [order[0], order[order.length - 1]];
        if (a.ovr === b.ovr) continue;
        const base = engine.teamStrength(team);
        engine.swapDepth(team, pos, a.id, b.id);
        engine.swapDepth(team, pos, a.id, b.id);
        undone += 1;
        if (engine.hasSavedDepth(team, pos) || team.depth !== undefined) { stillSaved.push(`${team.abbr} ${pos}: ${JSON.stringify(team.depth)}`); continue; }
        const better = newcomer(team, pos, Math.max(70, a.ovr + 2, unitFloor(team, pos)), 'signed');
        team.players.push(better);
        if (!engine.starterIds(team).has(better.id) || !(engine.teamStrength(team) > base + 1e-9)) afterBad.push(`${team.abbr} ${pos}: a ${better.ovr} signed after a swap and back sits or adds nothing`);
      }
    }
  }
  ok(3, 'a swap and a swap back leaves nothing saved', undone >= 300 && stillSaved.length === 0, `${stillSaved.length} of ${undone}, e.g. ${stillSaved.slice(0, 2).join(' | ')}`);
  ok(3, 'a better man signed after a swap and back starts and adds strength', afterBad.length === 0, `${afterBad.length} of ${undone}, e.g. ${afterBad.slice(0, 3).join(' | ')}`);
}

/* ======================================================================= 4 */
{
  let compared = 0, mismatch = [], orderBad = [], probBad = 0, games = 0, bigLine = 0;
  /* A save can carry six or more linemen (a probe of board like careers found
     it on 23 of the GM's 120 seasons), and the pre round formula read every
     healthy one. The last stage hands a third of the clubs four or five extra
     generated linemen (clubs carry two or three) so the fixture covers that
     shape too. */
  const extraLinemen = (lg, rng) => {
    let n = 0;
    for (const t of Object.values(lg.teams)) {
      if (rng() >= 1 / 3) continue;
      const add = 4 + Math.floor(rng() * 2);
      for (let k = 0; k < add; k += 1) {
        const ovr = 62 + Math.floor(rng() * 24);
        t.players.push({ id: `ol-extra-${n++}-${t.abbr}`, name: `Extra Lineman ${n}`, pos: 'OL', age: 25, ovr, salary: 2, years: 2, out: 0, pot: ovr });
      }
    }
  };
  for (const seed of SEEDS) {
    const rng = lcg(seed * 3 + 1);
    const lg = engine.initLeague(lcg(seed));
    for (let stage = 0; stage < 5; stage += 1) {
      if (stage > 0 && stage < 4) advance(lg, rng, 1);
      if (stage === 4) extraLinemen(lg, rng);
      injure(lg, rng, stage === 0 ? 0 : 0.12);
      for (const t of Object.values(lg.teams)) {
        if (t.depth !== undefined) { mismatch.push(`${t.abbr}: a chart was written where nobody reordered anything`); continue; }
        compared += 1;
        const a = engine.teamStrength(t), b = oldStrength(t);
        if (!near(a, b)) mismatch.push(`${t.abbr} seed ${seed} stage ${stage}: engine ${a} vs frozen ${b}`);
        if (!near(engine.defenceRating(t), oldDefence(t))) mismatch.push(`${t.abbr} seed ${seed} stage ${stage}: defence ${engine.defenceRating(t)} vs ${oldDefence(t)}`);
        if (t.players.filter(p => p.pos === 'OL').length >= 6) bigLine += 1;
        for (const pos of engine.DEPTH_GROUPS) {
          const want = t.players.filter(p => p.pos === pos).sort((x, y) => y.ovr - x.ovr).map(p => p.id).join(',');
          const got = engine.depthOrder(t, pos).map(p => p.id).join(',');
          if (want !== got) orderBad.push(`${t.abbr} ${pos}`);
        }
      }
      /* every scheduled game reads the same probability as the frozen formula would */
      for (const week of lg.schedule) for (const g of week) {
        games += 1;
        if (!near(engine.winProb(lg.teams[g.home], lg.teams[g.away]), oldWinProb(lg.teams[g.home], lg.teams[g.away]))) probBad += 1;
      }
      heal(lg);
    }
  }
  console.log(`   fixture: ${compared} club states, ${bigLine} of them with six or more linemen, ${games} scheduled games`);
  ok(4, 'a real number of club states were compared', compared >= 700, `${compared}`);
  ok(4, 'the engine and the frozen pre round formula agree on every chartless club', mismatch.length === 0, `${mismatch.length} of ${compared}, e.g. ${mismatch.slice(0, 3).join(' | ')}`);
  ok(4, 'a chartless chart is the order by rating', orderBad.length === 0, `${orderBad.length}, e.g. ${orderBad.slice(0, 3).join(' | ')}`);
  ok(4, 'every scheduled game reads the same win probability', probBad === 0 && games > 1000, `${probBad} of ${games} games differ`);
  ok(4, 'the fixtures include clubs carrying six or more linemen', bigLine >= 30, `${bigLine} club states`);

  /* a reordered chart survives a save round trip, and a chart that names men
     who have gone still reads */
  const lg = advance(engine.initLeague(lcg(SEEDS[2])), lcg(99), 2);
  const t = Object.values(lg.teams).find(x => x.players.filter(p => p.pos === 'WR').length >= 3);
  ok(4, 'a club with three receivers exists for the round trip', !!t);
  if (t) {
    const wr = engine.depthOrder(t, 'WR');
    engine.swapDepth(t, 'WR', wr[0].id, wr[wr.length - 1].id);
    const after = engine.teamStrength(t);
    const copy = JSON.parse(JSON.stringify(t));
    ok(4, 'the reordered chart reads the same after a save round trip', near(engine.teamStrength(copy), after) && engine.depthOrder(copy, 'WR').map(p => p.id).join() === engine.depthOrder(t, 'WR').map(p => p.id).join());
    copy.depth.WR.unshift('p-gone-forever');
    ok(4, 'a saved order naming a man who has gone still reads, without him', engine.depthOrder(copy, 'WR').every(p => p.id !== 'p-gone-forever') && near(engine.teamStrength(copy), after));
    ok(4, 'setDepthOrder refuses a list that is not exactly the group', engine.setDepthOrder(copy, 'WR', copy.depth.WR.slice(1, 2)) === false && engine.setDepthOrder(copy, 'WR', [...engine.depthOrder(copy, 'WR').map(p => p.id)]) === true);
  }
}

/* ======================================================================= 5 */
{
  let clubs = 0, tagged = 0;
  const perOffseason = [];
  for (const seed of SEEDS) {
    const rng = lcg(seed * 7919 + 17);
    const lg = engine.initLeague(rng);
    for (let s = 0; s < 6; s += 1) {
      const news = engine.runOffseason(lg, rng);
      clubs += 32;
      tagged += news.tagged.length;
      perOffseason.push(news.tagged.length / 32);
      const cls = engine.generateDraftClass(rng, 40, new Set());
      let i = 0;
      for (const abbr of engine.draftOrder(lg.teams)) lg.teams[abbr].players.push(engine.prospectToPlayer(cls[i++ % cls.length], rng));
    }
  }
  const rate = tagged / clubs;
  console.log(`   CPU tag rate: ${tagged} tags over ${clubs} club offseasons, pooled ${rate.toFixed(3)}; one offseason at a time ${Math.min(...perOffseason).toFixed(3)} to ${Math.max(...perOffseason).toFixed(3)}`);
  ok(5, 'the CPU tag rate sits in the measured band [0.25, 0.48]', rate >= 0.25 && rate <= 0.48, `pooled ${rate.toFixed(3)}`);
}

/* ======================================================================= 6 */
{
  const src = normaliseEol(fs.readFileSync(ENGINE, 'utf8'));
  ok(6, 'the engine cites the rule\'s source by URL', src.includes('https://www.profootballhof.com/news/2020-franchise-and-transition-players-named'));
  ok(6, 'the engine names the CBA article', /Article 10, Section 2/.test(src));
  ok(6, 'the engine cites a second source by URL', src.includes('https://www.buffalobills.com/news/a-closer-look-what-is-the-franchise-tag-12632897'));
}

/* ======================================================================= 7 */
{
  /* Every man put on his last year at 26, so nobody develops, declines or
     retires and the contract branch is the only way off a roster, and every
     club's tag marked used, so nobody is tagged. What walks is then exactly
     the rule: role players (under 76) half the time, stars STAR_WALK_CHANCE
     of the time. news.expired names each man who walked; names are unique in
     a league, so team and name find his rating. */
  let stars = 0, starsWalked = 0, role = 0, roleWalked = 0;
  const perSeed = [];
  for (const seed of SEEDS) {
    const lg = engine.initLeague(lcg(seed));
    const rng = lcg(seed * 13 + 3);
    const before = new Map();
    for (const t of Object.values(lg.teams)) {
      t.tagUsedFor = lg.season + 1;
      for (const p of t.players) { p.age = 26; p.pot = p.ovr; p.years = 1; before.set(`${t.abbr}|${p.name}`, p.ovr); }
    }
    const news = engine.runOffseason(lg, rng);
    const walked = new Set(news.expired.map(e => `${e.team}|${e.player}`));
    let s = 0, sw = 0;
    for (const [key, ovr] of before) {
      const w = walked.has(key);
      if (ovr >= 76) { stars += 1; s += 1; if (w) { starsWalked += 1; sw += 1; } }
      else { role += 1; if (w) roleWalked += 1; }
    }
    perSeed.push(sw / s);
    ok(7, `seed ${seed}: nobody was tagged and nobody retired`, news.tagged.length === 0 && news.retired.length === 0, `${news.tagged.length} tagged, ${news.retired.length} retired`);
  }
  const starRate = starsWalked / stars, roleRate = roleWalked / role;
  console.log(`   walk rates: stars ${starsWalked}/${stars} = ${starRate.toFixed(3)} (per seed ${Math.min(...perSeed).toFixed(3)} to ${Math.max(...perSeed).toFixed(3)}), role players ${roleWalked}/${role} = ${roleRate.toFixed(3)}`);
  ok(7, 'untagged stars walk at the rule rate, pooled in [0.10, 0.20]', starRate >= 0.10 && starRate <= 0.20, `${starRate.toFixed(3)} with STAR_WALK_CHANCE ${engine.STAR_WALK_CHANCE}`);
  ok(7, 'role players walk half the time, pooled in [0.42, 0.58]', roleRate >= 0.42 && roleRate <= 0.58, roleRate.toFixed(3));
}

/* ---- the verdict ---------------------------------------------------------- */
console.log('');
for (const [section, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`${s.bad ? 'FAIL' : ' ok '} [${section}] ${SECTION_NAMES[section]}: ${s.n - s.bad}/${s.n}`);
}
for (const f of fails) console.log('   ' + f);
if (CONTROL) {
  const red = [...bySection.entries()].filter(([, s]) => s.bad > 0).map(([k]) => k).sort((a, b) => a - b);
  const want = EXPECT[CONTROL];
  const fired = want.every(w => red.includes(w));
  const onlyThose = red.every(r => want.includes(r));
  console.log(`\ncontrol ${CONTROL}: expected sections ${want.join(', ')} red; got ${red.join(', ') || 'none'}. ${fired && onlyThose ? 'The control fired exactly where it should.' : fired ? 'The control fired, and also elsewhere.' : 'THE CONTROL DID NOT FIRE.'}`);
  /* a control run is red by construction; the line above is the proof */
  process.exit(fired ? 1 : 2);
}
console.log(`\nsimNflTagDepth: ${checks - fails.length}/${checks} checks passed${fails.length ? `, ${fails.length} FAILED` : ''}`);
process.exit(fails.length ? 1 : 0);
