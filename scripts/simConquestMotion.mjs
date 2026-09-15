/* Round 605: committed plays drive the action, never the other way around.
   CONQUEST_MOTION_CORE=1 runs seed/geometry checks without a browser.
   CONQUEST_MOTION_CONTROL=rng|tag|points|reach|contact|carry|stealcarry|rim|kick|frozen|reduced|skip|layout must fail.
   Every control first checks an exact production anchor. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-conquest-motion-'));
const baselinePath = path.join(root, 'scripts/data/conquestMotionBaseline.json');
const control = process.env.CONQUEST_MOTION_CONTROL || '';
const controls = {
  rng: ['src/lib/conquestBattleNba.ts', 'const roll = Math.random();', 'const roll = (Math.random(), Math.random());'],
  tag: ['src/lib/conquestBattleNba.ts', "action: 'block',", "action: 'steal',"],
  points: ['src/components/conquest/conquestActionFrames.ts', 'play.attScore - (previous?.attScore ?? 0)', 'play.attScore - (previous?.attScore ?? 0) + 1'],
  reach: ['src/components/conquest/conquestActionFrames.ts', 'return { offense, defense, receiver, ball };', 'if (action === "rush") defense.hand = { x: offense.x + 14, y: 112 }; return { offense, defense, receiver, ball };'],
  contact: ['src/components/conquest/conquestActionFrames.ts', 'ball = p < 0.2 ? offense.hand', 'ball = p < 0.2 ? { x: offense.hand.x + 18, y: offense.hand.y }'],
  carry: ['src/components/conquest/conquestActionFrames.ts', 'ball = receiver.hand;', 'ball = line(catchAt, receiver.hand, carry);'],
  stealcarry: ['src/components/conquest/conquestActionFrames.ts', 'return { offense, defense, receiver, ball };', 'if ((action === "strip" || action === "steal") && p > 0.6) ball = { x: ball.x - 5, y: ball.y }; return { offense, defense, receiver, ball };'],
  rim: ['src/components/conquest/conquestActionFrames.ts', '{ x: 244, y: 124 }', '{ x: 290, y: 97 }'],
  kick: ['src/components/conquest/conquestActionFrames.ts', '{ x: 341, y: 72 }', '{ x: 302, y: 46 }'],
  frozen: ['src/components/conquest/ConquestActionScene.tsx', 'const progress = !active || reduced || hidden || action ===', 'const progress = true || !active || reduced || hidden || action ==='],
  reduced: ['src/components/conquest/ConquestActionScene.tsx', '!active || reduced || hidden', '!active || false || hidden'],
  skip: ['src/components/conquest/ConquestBoardNba.tsx', 'active={game.playByPlayActive}', 'active={true}'],
  layout: ['src/components/conquest/ConquestActionScene.tsx', 'className="overflow-hidden rounded-xl border border-border bg-card"', 'style={{ minWidth: 420 }} className="overflow-hidden rounded-xl border border-border bg-card"'],
};
assert(!control || controls[control], 'Unknown CONQUEST_MOTION_CONTROL');
const changed = new Map();
if (control) {
  const [relative, before, after] = controls[control];
  const original = fs.readFileSync(path.join(root, relative), 'utf8');
  const expected = control === 'reach' || control === 'reduced' || control === 'stealcarry' ? 2 : 1;
  assert.equal(original.split(before).length - 1, expected, `${control}: production anchors exist`);
  const source = control === 'reduced' || control === 'stealcarry' ? original.replaceAll(before, after) : original.replace(before, after);
  assert.notEqual(source, original, `${control}: mutation fired`);
  changed.set(path.join(root, relative), source);
}
const alias = { '@': path.join(root, 'src') };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const require = createRequire(import.meta.url);
async function library(frozenSource) {
  const built = await build({
    stdin: { contents: `export { simulateDetailedBattle as nfl } from '@/lib/conquestBattle'; export { simulateDetailedBattleNba as nba } from '@/lib/conquestBattleNba'; export { NFL_TEAMS, INITIAL_TERRITORIES } from '@/data/conquestData'; export { NBA_TEAMS, INITIAL_TERRITORIES_NBA } from '@/data/conquestDataNba'; export * from '@/components/conquest/conquestActionFrames';`, resolveDir: root, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', alias, logLevel: 'silent',
    plugins: [{ name: 'under-test', setup(builder) { builder.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      let source = changed.get(args.path);
      if (frozenSource && args.path === path.join(root, 'src/lib/conquestBattleNba.ts')) {
        const anchor = 'type: play.type,';
        assert.equal(frozenSource.split(anchor).length - 1, 1, 'Frozen branch observation anchor');
        source = frozenSource.replace(anchor, `${anchor} _branch: { offense: !!play.offPlayerName, andOne: !!play.isTd },`);
      }
      return source ? { contents: source, loader: args.path.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) } : undefined;
    }); } }],
  });
  const filename = path.join(output, frozenSource ? 'frozen.cjs' : 'current.cjs');
  fs.writeFileSync(filename, built.outputFiles[0].text);
  return require(filename);
}
function measure(lib, sport, seed) {
  const teams = sport === 'nfl' ? lib.NFL_TEAMS : lib.NBA_TEAMS;
  const attacker = teams[seed % teams.length];
  let defender = teams[(seed * 7 + 5) % teams.length];
  if (defender.id === attacker.id) defender = teams[(seed + 1) % teams.length];
  const rosters = Object.fromEntries(teams.map(team => [team.id, team.players.map(player => player.name)]));
  const territories = sport === 'nfl' ? lib.INITIAL_TERRITORIES : lib.INITIAL_TERRITORIES_NBA;
  let state = seed, draws = 0;
  const original = Math.random;
  Math.random = () => {
    draws += 1; state |= 0; state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let result;
  try { result = lib[sport](attacker.id, defender.id, territories, rosters, seed % 5 === 0 ? attacker.id : null, seed % 5 === 0 ? rosters[attacker.id][0] : null); }
  finally { Math.random = original; }
  const stripped = { ...result, plays: result.plays.map(({ action, _branch, ...play }) => play) };
  return { result, draws, hash: hash(stripped) };
}
function frozenAction(play) {
  if (play.type === 'pass' || play.type === 'sack') return 'three';
  if (play.type === 'rush') return play._branch.andOne ? 'and_one' : 'drive';
  if (play.type === 'fumble') return 'strip';
  if (play.type === 'field_goal') return 'free_throw';
  return play._branch.offense ? 'block' : 'steal';
}
// A deliberate one-time fixture capture from the untouched engine. Ordinary
// runs never regenerate their own expected values, and existing fixtures refuse overwrite.
if (process.env.CONQUEST_MOTION_FREEZE_SOURCE) {
  assert(!control && !fs.existsSync(baselinePath), 'Freeze only once, before baseline exists');
  const source = fs.readFileSync(process.env.CONQUEST_MOTION_FREEZE_SOURCE, 'utf8');
  assert(!source.includes('BasketballAction'), 'Freeze requires the pre-tag engine');
  const frozen = await library(source);
  const rows = [];
  for (const sport of ['nfl', 'nba']) for (let seed = 0; seed < 128; seed++) {
    const measured = measure(frozen, sport, seed);
    rows.push({ sport, seed, hash: measured.hash, draws: measured.draws, ...(sport === 'nba' ? { actions: measured.result.plays.map(frozenAction) } : {}) });
  }
  fs.writeFileSync(baselinePath, JSON.stringify({ from: 'd726bce5b546c868beaec6a77c325ce1a3427d73', sourceHash: createHash('sha256').update(source).digest('hex'), rows }, null, 2) + '\n');
  console.log('Captured 256 frozen pre-motion battle outcomes and RNG counts.');
  process.exit(0);
}
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assert.equal(baseline.rows.length, 256, 'All frozen cases are present');
const lib = await library();
const examples = new Map();
for (const row of baseline.rows) {
  const measured = measure(lib, row.sport, row.seed);
  assert.equal(measured.draws, row.draws, `${row.sport}/${row.seed}: identical RNG consumption`);
  assert.equal(measured.hash, row.hash, `${row.sport}/${row.seed}: identical plays, scores, winner and box score`);
  if (row.actions) assert.deepEqual(measured.result.plays.map(play => play.action), row.actions, `${row.seed}: presentation tags describe their actual engine branches`);
  measured.result.plays.forEach((play, index) => {
    const points = lib.playPoints(play, measured.result.plays[index - 1]);
    const previous = measured.result.plays[index - 1];
    const expectedPoints = play.team === 'att' ? play.attScore - (previous?.attScore ?? 0) : play.defScore - (previous?.defScore ?? 0);
    assert.equal(points, expectedPoints, `${row.sport}/${row.seed}/${index}: scene points match the committed scoreboard change`);
    const action = lib.actionOf(row.sport, play);
    const key = `${row.sport}/${action}/${points > 0 ? 'score' : 'stop'}`;
    if (!examples.has(key)) examples.set(key, { sport: row.sport, action, points, play: { ...play, attScore: play.team === 'att' ? points : 0, defScore: play.team === 'def' ? points : 0 } });
  });
}
assert.equal(new Set([...examples.values()].filter(example => example.sport === 'nba').map(example => example.action)).size, 7, 'Every basketball action is exercised');
let poses = 0, longestReach = 0;
for (const example of examples.values()) for (let frame = 0; frame <= 100; frame++) {
  const p = frame / 100;
  const drawing = example.sport === 'nfl' ? lib.footballFrame(example.action, example.play.yards, example.points > 0, p) : lib.basketballFrame(example.action, example.points > 0, p);
  for (const actor of [drawing.offense, drawing.defense, drawing.receiver].filter(Boolean)) {
    if (!actor.hand) continue;
    const radians = (actor.lean ?? 0) * Math.PI / 180;
    const shoulder = { x: actor.x + 6 * Math.cos(radians) + 18 * Math.sin(radians), y: actor.y - 12 + 6 * Math.sin(radians) - 18 * Math.cos(radians) };
    const reach = Math.hypot(actor.hand.x - shoulder.x, actor.hand.y - shoulder.y);
    longestReach = Math.max(longestReach, reach);
    assert(reach <= 34, `${example.sport}/${example.action}/${p}: arm stays attached and plausible (${reach.toFixed(1)}px)`);
    poses += 1;
  }
  assert(Number.isFinite(drawing.ball.x) && Number.isFinite(drawing.ball.y), 'Ball geometry is finite');
}
for (const action of ['three', 'free_throw', 'block']) {
  const missed = lib.basketballFrame(action, false, 1).ball;
  assert(missed.x < 275, `${action}: a missed or blocked ball finishes outside the net`);
}
const madeKick = lib.footballFrame('field_goal', 0, true, 1).ball;
const missedKick = lib.footballFrame('field_goal', 0, false, 1).ball;
assert(madeKick.x > 289 && madeKick.x < 319 && madeKick.y < 64, 'A made kick finishes between the uprights');
assert(missedKick.x < 289 || missedKick.x > 319, 'A missed kick finishes outside the uprights');
for (const [sport, action, progress, actor, endpoint] of [
  ['nfl', 'pass', 0, 'offense', 'hand'], ['nfl', 'pass', 0.2, 'offense', 'hand'], ['nfl', 'pass', 0.7, 'receiver', 'hand'],
  ['nfl', 'interception', 0.7, 'defense', 'hand'], ['nfl', 'fumble', 0.55, 'defense', 'hand'], ['nfl', 'field_goal', 0.18, 'offense', 'foot'],
  ['nba', 'three', 0.22, 'offense', 'hand'], ['nba', 'free_throw', 0.22, 'offense', 'hand'], ['nba', 'drive', 0.55, 'offense', 'hand'],
  ['nba', 'block', 0.75, 'defense', 'hand'], ['nba', 'strip', 0.6, 'defense', 'hand'], ['nba', 'steal', 0.6, 'defense', 'hand'],
]) {
  const frame = sport === 'nfl' ? lib.footballFrame(action, 24, true, progress) : lib.basketballFrame(action, true, progress);
  const contact = frame[actor][endpoint];
  assert(Math.hypot(frame.ball.x - contact.x, frame.ball.y - contact.y) < 0.001, `${sport}/${action}/${progress}: ball meets the actual ${endpoint}`);
}
let carries = 0;
for (const [sport, action, start, actor] of [
  ['nfl', 'pass', 0.7, 'receiver'], ['nfl', 'interception', 0.7, 'defense'],
  ['nba', 'strip', 0.6, 'defense'], ['nba', 'steal', 0.6, 'defense'],
]) for (const scored of [false, true]) for (let sample = 0; sample <= 100; sample++) {
  const progress = start + (1 - start) * sample / 100;
  const frame = sport === 'nfl' ? lib.footballFrame(action, 24, scored, progress) : lib.basketballFrame(action, scored, progress);
  const hand = frame[actor].hand;
  assert(Math.hypot(frame.ball.x - hand.x, frame.ball.y - hand.y) < 0.001, `${sport}/${action}/${progress}: carried ball stays attached to the hand`);
  carries += 1;
}
console.log(`CONQUEST_MOTION| 256 frozen battles identical, all 7 NBA tags match their branches, ${poses} sampled arm poses valid (longest ${longestReach.toFixed(1)}px), ${carries} carries attached.`);
if (process.env.CONQUEST_MOTION_CORE === '1') process.exit(0);

// Browser coverage is appended below: actual board, hooks, inputs and controls.
const { default: http } = await import('node:http');
const { default: postcss } = await import('postcss');
const { default: tailwind } = await import('tailwindcss');
const bundle = await build({
  entryPoints: [path.join(root, 'src/test/fixtures/conquestMotionRig.tsx')],
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias, logLevel: 'silent',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'real-board-observer', setup(builder) { builder.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    let source = changed.get(args.path);
    const hook = path.basename(args.path) === 'useConquest.ts' ? 'useConquest' : path.basename(args.path) === 'useConquestNba.ts' ? 'useConquestNba' : null;
    if (hook) {
      source ??= fs.readFileSync(args.path, 'utf8');
      const anchor = `export function ${hook}()`;
      assert.equal(source.split(anchor).length - 1, 1, 'Observer wraps one real hook');
      source = source.replace(anchor, `function ${hook}Observed()`);
      source += `\nexport function ${hook}() { const game = ${hook}Observed(); (window as any).conquestTestGame = game; return game; }\n`;
    }
    return source ? { contents: source, loader: args.path.endsWith('tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) } : undefined;
  }); } }],
});
const content = ['src/components/conquest/ConquestBoard.tsx', 'src/components/conquest/ConquestBoardNba.tsx', 'src/components/conquest/ConquestActionScene.tsx', 'src/components/conquest/ConquestRegionMap.tsx', 'src/components/ui/button.tsx'].map(file => ({ raw: fs.readFileSync(path.join(root, file), 'utf8'), extension: 'tsx' }));
const css = (await postcss([tailwind({ config: path.join(root, 'tailwind.config.ts'), content })]).process(fs.readFileSync(path.join(root, 'src/index.css'), 'utf8'), { from: path.join(root, 'src/index.css') })).css;
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conquest play motion</title><link rel="stylesheet" href="preview.css"></head><body><main style="max-width:560px;margin:0 auto;padding:12px"><div id="root"></div></main><script src="preview.js"></script></body></html>';
const assets = new Map([['/', [html, 'text/html']], ['/preview.css', [css, 'text/css']], ['/preview.js', [bundle.outputFiles[0].text, 'text/javascript']]]);
for (const [name, data] of [['index.html', html], ['preview.css', css], ['preview.js', bundle.outputFiles[0].text]]) fs.writeFileSync(path.join(output, name), data);
const server = http.createServer((req, res) => {
  const asset = assets.get(new URL(req.url, 'http://localhost').pathname);
  res.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.[1] || 'text/plain' });
  res.end(asset?.[0] || 'Not found');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const report = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const call = (method, ...args) => page.evaluate(({ method, args }) => window.conquestRig[method](...args), { method, args });
  for (const [key, example] of examples) {
    await call('scene', example.sport, example.play);
    await call('advance', 320);
    const early = await call('state');
    await call('advance', 320);
    const late = await call('state');
    assert(early.pose !== late.pose, `${key}: actual actors and ball animate`);
    assert.equal(late.randomCalls, 0, `${key}: drawing consumes no RNG`);
    await call('preferences', true);
    const reduced = await call('state');
    await call('advance', 1200);
    assert.equal((await call('state')).pose, reduced.pose, `${key}: reduced motion holds a static committed result`);
    assert.equal((await call('state')).scheduledFrames, 0, `${key}: reduced motion stops frames`);
    const expected = example.sport === 'nfl' ? lib.footballFrame(example.action, example.play.yards, example.points > 0, 1) : lib.basketballFrame(example.action, example.points > 0, 1);
    assert.equal((await call('state')).ball, `translate(${expected.ball.x} ${expected.ball.y})`, `${key}: rendered result is the actual final pose`);
    await call('scene', example.sport, example.play);
    await call('advance', 160);
    await call('preferences', false, true);
    await call('advance', 1200, false);
    const background = await call('state');
    await call('preferences', false, false);
    await call('advance', 400);
    assert.equal((await call('state')).pose, background.pose, `${key}: returning from a hidden tab does not replay old action`);
    report.push({ key, points: example.points, motion: 'full/reduced/hidden', finalBall: expected.ball });
  }
  // A newly delivered terminal play is visible even when the reveal is already over.
  const sample = [...examples.values()].find(example => example.sport === 'nba' && example.action === 'block');
  await call('scene', 'nba', sample.play);
  const terminal = [...examples.values()].find(example => example.sport === 'nba' && example.action === 'three' && example.points > 0);
  await call('updateScene', terminal.play, false);
  assert.equal((await call('state')).action, 'three', 'Terminal play replaces the previous block');
  assert.equal((await call('state')).progress, 1, 'Terminal play immediately shows its committed final pose');
  const legacy = { ...sample.play }; delete legacy.action;
  await call('scene', 'nba', legacy);
  assert.equal((await call('state')).action, 'unknown', 'An untagged old play never guesses block versus steal');

  for (const sport of ['nfl', 'nba']) {
    let selectedSeed;
    let reference;
    for (const mode of ['full', 'reduced', 'hidden', 'skip']) {
      let live;
      for (let seed = selectedSeed ?? 0; seed < 30; seed++) {
        await call('mount', sport, seed, mode === 'reduced');
        await page.getByRole('button', { name: /Start Conquest/i }).click();
        if (mode === 'hidden') await call('preferences', false, true);
        await call('advance', 10500);
        live = await call('state');
        if (live.game?.battleResult?.simulation && live.game.canSkipBattle) { selectedSeed = seed; break; }
        assert.equal(selectedSeed, undefined, `${sport}: the selected seed must replay the same real battle`);
      }
      assert(live?.game?.canSkipBattle, `${sport}: a real hook generated a skippable battle`);
      if (mode === 'skip') {
        const skip = page.getByRole('button', { name: /Skip to result/i });
        await skip.focus();
        await skip.press('Enter');
        assert.equal((await call('state')).progress, 1, `${sport}: keyboard skip shows the terminal play without replaying it`);
      } else await call('advance', 24000);
      const finished = await call('state');
      assert.equal(finished.game.playByPlayActive, false, 'Real reveal timers finish');
      assert(finished.game.boxScore, 'Real box score is present');
      assert.equal(finished.playNumber, finished.game.battleResult.simulation.plays.length, 'The scene reaches the final committed highlight');
      if (mode === 'full') for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), `${sport}/${width}: real board has no horizontal overflow`);
        await page.locator('[data-conquest-action-scene]').screenshot({ path: path.join(output, `${sport}-real-board-${width}-terminal.png`) });
      }
      await call('apply');
      const final = await call('state');
      const outcome = { game: final.game, records: final.records, randomCalls: final.randomCalls };
      if (!reference) reference = outcome; else assert.deepEqual(outcome, reference, `${sport}/${mode}: identical real hook result, map, rosters and RNG`);
      console.log(`CONQUEST_MOTION| ${sport} real board ${mode}: seed ${selectedSeed}, same outcome/map/rosters, ${final.randomCalls} RNG draws.`);
    }
  }
  for (const width of [320, 390, 430]) for (const [key, example] of examples) {
    await page.setViewportSize({ width, height: 480 });
    await call('scene', example.sport, example.play);
    await call('advance', 640);
    assert(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), `${key}/${width}: no horizontal overflow`);
    await page.screenshot({ path: path.join(output, `${key.replaceAll('/', '-')}-${width}.png`) });
  }
  assert.deepEqual(errors, [], 'No browser errors');
  if (process.env.CONQUEST_MOTION_VIDEO === '1') {
    const context = await browser.newContext({ viewport: { width: 390, height: 300 }, recordVideo: { dir: output, size: { width: 390, height: 300 } } });
    const film = await context.newPage();
    await film.goto(`http://127.0.0.1:${server.address().port}/`);
    const keys = ['nfl/pass/score', 'nfl/rush/stop', 'nfl/sack/stop', 'nfl/interception/stop', 'nfl/fumble/stop', 'nfl/field_goal/score', 'nba/three/score', 'nba/three/stop', 'nba/drive/score', 'nba/block/stop', 'nba/steal/stop'];
    for (const key of keys) {
      const example = examples.get(key);
      assert(example, `Video case exists: ${key}`);
      await film.evaluate(example => window.conquestRig.scene(example.sport, example.play), example);
      for (let frame = 0; frame < 38; frame++) {
        await film.evaluate(() => window.conquestRig.advance(32));
        await film.waitForTimeout(32);
      }
      await film.waitForTimeout(350);
    }
    const video = film.video();
    await context.close();
    fs.copyFileSync(await video.path(), path.join(output, 'conquest-action-preview.webm'));
  }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ report, errors, seedCases: baseline.rows.length, poses, longestReach, carries }, null, 2));
  console.log(`simConquestMotion: PASS. Evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
