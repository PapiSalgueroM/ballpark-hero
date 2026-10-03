/* Actual NBA draft rights, saved progress and bounded league batches, offline only. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const boardFile = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx', engineFile = 'src/lib/nbaFrontOffice.ts';
const files = [boardFile, engineFile, 'src/lib/nbaSeasonStats.ts', 'src/lib/nbaRotation.ts', 'src/data/nbaOpeningRatings.ts', 'src/data/conquestDataNba.ts', 'src/lib/foSchedule.ts', 'src/components/front-office-shared/DraftNightCard.tsx', 'src/components/RouteErrorBoundary.tsx', 'src/lib/freshBuild.ts', 'scripts/simNbaDraftCapital.mjs'];
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all(files.map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
let board = held.find(([file]) => file === boardFile)[1].source;
let engine = held.find(([file]) => file === engineFile)[1].source;
const executable = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const controls = {
  capital: ['board', 'const capital = nbaDraftCapital(lg.teams[team]);', 'const capital = 2;', [3,4,5,6,22]],
  human: ['board', 'if (!nbaConsumeDraftPick(team)) return;', 'if (false) return;', [6,13]],
  eligibility: ['engine', 'if (!nbaConsumeDraftPick(team)) continue;', 'if (false) continue;', [7,8,22,24]],
  rivalConsume: ['engine', 'if (!nbaConsumeDraftPick(team)) continue;', 'if ((nbaDraftCapital(team) ?? 0) === 0) continue;', [8,24]],
  budget: ['board', '\n    let batches = draftAiBatchesLeft ?? Math.min(2, picksLeft);', '\n    let batches = draftAiBatchesLeft || Math.min(2, picksLeft);', [5,18]],
  pending: ['board', 'if (draftPending.current || !league || !draftClass || picksLeft <= 0) return;', 'if (!league || !draftClass || picksLeft <= 0) return;', [9,10]],
  zeroPending: ['board', 'if (draftPending.current || !league || picksLeft > 0 && (nbaDraftCapital(league.teams[myTeam]) ?? 0) > 0) return;', 'if (!league || picksLeft > 0 && (nbaDraftCapital(league.teams[myTeam]) ?? 0) > 0) return;', [11]],
  restoreBudget: ['board', 'setDraftAiBatchesLeft(s.draftAiBatchesLeft ?? null);', 'setDraftAiBatchesLeft(null);', [5,18,20]],
  legacyReplay: ['board', 'for (let batches = draftAiBatchesLeft ?? Math.min(2, picksLeft); batches > 0; batches--)', 'for (let batches = draftAiBatchesLeft ?? 2; batches > 0; batches--)', [14]],
  counter: ['board', 's.draftAiBatchesLeft !== undefined && (', 'false && (', [17]],
  roundOne: ['board', '(!completedLegacy && s.league.round !== NBA_ROUNDS)', 'false', [16,25]],
  complete: ['board', 'if (lg.round === 1 && lg.champions.some(c => c.season === lg.season - 1))', 'if (false && lg.round === 1 && lg.champions.some(c => c.season === lg.season - 1))', [15]],
  pool: ['board', 'Math.max(24, capital + Math.min(10, rivalCapital))', '24', [22]],
  recovery: ['board', 'const cls = nbaDraftClass(Math.random, Math.max(24, picksLeft + 10), leagueNames(league));', 'const cls: NbaProspect[] = [];', [20]],
  density: ['engine', 'Array.from(t.picks).every(pick => pick === 1 || pick === 2)', 't.picks.every(pick => pick === 1 || pick === 2)', [23]],
  five: ['engine', 'picks.length >= 5 || rest.length === 0', 'picks.length >= 6 || rest.length === 0', [2,3,4,5,7,8,9,12,13,21,24]],
  prospect: ['board', "!['G', 'F', 'C'].includes(p.pos)", 'false', [27]],
  legacyQuota: ['board', 'for (let batches = draftAiBatchesLeft ?? Math.min(2, picksLeft); batches > 0; batches--)', 'for (let batches = draftAiBatchesLeft ?? 0; batches > 0; batches--)', [21]],
  available: ['board', 'Math.min(picksLeft, nbaDraftCapital(my) ?? 0)', 'picksLeft', [13,21]],
  missing: ['board', 'const capital = draftTeam ? nbaDraftCapital(draftTeam) : null;', 'const capital = draftTeam ? nbaDraftCapital(draftTeam) : 0;', [26]],
  zeroBudget: ['board', '(s.picksLeft === 0 && !completedLegacy && s.draftAiBatchesLeft === 0)', 'false', [19]],
};
const mode = process.env.NBA_DRAFT_CAPITAL_CONTROL || '';
assert.ok(!mode || mode === 'original' || Object.hasOwn(controls, mode));
for (const [file, anchor] of Object.values(controls)) {
  const src = file === 'board' ? board : engine;
  assert.equal(executable(src).split(anchor).length - 1, 1, 'Unique executable control anchor');
  const crlfBytes = Buffer.from(src.replaceAll('\n', '\r\n')), copy = Buffer.from(crlfBytes);
  assert.equal(executable(holdSource(crlfBytes).source).split(anchor).length - 1, 1, 'CRLF control binding'); assert.deepEqual(crlfBytes, copy);
}
const receipts = await mkdtemp(path.join(os.tmpdir(), 'dukb-nba939-proof-'));
const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
const owned = await mkdtemp(path.join(parent, 'nba-draft939-'));
try {
  if (mode === 'original') {
    const original = file => {
      const result = spawnSync('git', ['show', '08c18814:' + file], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
      assert.ok(!result.error && !result.signal); assert.equal(result.status, 0);
      return result.stdout;
    };
    const b = original(boardFile), e = original(engineFile);
    board = b.replaceAll('\r\n', '\n'); engine = e.replaceAll('\r\n', '\n');
    await writeFile(path.join(receipts, 'physical-original-board.tsx'), b); await writeFile(path.join(receipts, 'physical-original-engine.ts'), e);
  } else if (mode) {
    const [file, anchor, replacement] = controls[mode];
    const before = file === 'board' ? board : engine, mutated = before.replace(anchor, replacement);
    assert.notEqual(mutated, before); assert.equal(mutated.split(anchor).length - 1, 0);
    if (file === 'board') board = mutated; else engine = mutated;
  }
  await writeFile(path.join(owned, 'inert.tsx'), 'export const useGameCompletion=()=>undefined; export const recordActivity=()=>undefined; export default()=>null;');
  await writeFile(path.join(owned, 'entry.ts'), "export { default as Board } from '@/components/nba-front-office/NbaFrontOfficeBoard'; export { default as Boundary } from '@/components/RouteErrorBoundary'; export * from '@/lib/nbaFrontOffice'; export { leagueNames } from '@/lib/foNames'; export { NBA_OPENING_RATINGS } from '@/data/nbaOpeningRatings';");
  const built = await build({ entryPoints: [path.join(owned, 'entry.ts')], outfile: path.join(owned, 'product.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'error', metafile: true, alias: { '@/hooks/useGameCompletion': path.join(owned, 'inert.tsx'), '@/lib/completions': path.join(owned, 'inert.tsx'), '@/components/game/ShareButtons': path.join(owned, 'inert.tsx'), '@': path.join(root, 'src') }, plugins: [{ name: 'actual-owned-copy', setup(b) { b.onLoad({ filter: /NbaFrontOfficeBoard\.tsx$|nbaFrontOffice\.ts$/ }, args => {
    if (path.resolve(args.path) === path.resolve(root, boardFile)) return { contents: board, loader: 'tsx', resolveDir: path.dirname(args.path) };
    if (path.resolve(args.path) === path.resolve(root, engineFile)) return { contents: engine, loader: 'ts', resolveDir: path.dirname(args.path) };
  }); } }] });
  assert.ok(!Object.keys(built.metafile.inputs).some(f => /integrations[\\/]supabase/.test(f)));
  const runner = `import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost' });
for (const name of ['window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Text', 'MutationObserver', 'SVGElement', 'getComputedStyle', 'MouseEvent']) globalThis[name] = dom.window[name];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.scrollTo = () => undefined;
HTMLElement.prototype.scrollIntoView = () => undefined;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
const React = await import('react'), { createRoot } = await import('react-dom/client');
const E = await import('./product.mjs');
const { act } = React;
const KEY = 'nba-front-office-save-v1', SENTINEL = 'nba939-unrelated';
const clone = v => JSON.parse(JSON.stringify(v));
const withoutIds = value => JSON.parse(JSON.stringify(value, (key, v) => key === 'id' ? undefined : v));
const hash = v => createHash('sha256').update(JSON.stringify(withoutIds(v))).digest('hex');
function random(seed) { let calls = 0; const draw = () => { calls++; seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; draw.calls = () => calls; return draw; }
function fixture(capital = 2) {
  const lg = E.initNbaLeague(random(939)); lg.cap = 10000;
  for (const t of Object.values(lg.teams)) t.players.forEach((p, i) => { p.name = \`Fictional capital \${t.abbr} \${i}\`; p.years = 4; });
  lg.freeAgents.forEach((p, i) => { p.name = \`Fictional free agent \${i}\`; });
  const trades = [];
  const move = (a, b, mineId, wantId) => {
    const from = lg.teams[a], to = lg.teams[b];
    const mine = mineId ? from.players.find(p => p.id === mineId) : from.players[0];
    const want = wantId ? to.players.find(p => p.id === wantId) : to.players[0];
    const before = [from.picks.length, to.picks.length];
    assert.equal(E.nbaExecuteTalksTrade(from, to, mine.id, want.id, true, lg.cap, lg.taxScale), 'done');
    assert.deepEqual([from.picks.length, to.picks.length], [before[0] - 1, before[1] + 1]); trades.push([a, b]);
  };
  if (capital < 2) for (let i = capital; i < 2; i++) move('DEN', 'BOS');
  if (capital > 2 && capital < 60) for (let i = 2; i < capital; i++) move('BOS', 'DEN');
  if (capital === 60) for (const a of Object.keys(lg.teams).filter(a => a !== 'DEN')) { move(a, 'DEN'); move(a, 'DEN'); }
  assert.equal(lg.teams.DEN.picks.length, capital);
  lg.round = E.NBA_ROUNDS;
  lg.champions.push({ season: lg.season, team: 'BOS' });
  return { lg, move, trades };
}
const shape = (league, patch = {}) => ({ league, myTeam: 'DEN', phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, postseason: { series: [], champion: 'BOS', gradeLine: null }, ...patch });
let mounted;
const saved = () => JSON.parse(localStorage.getItem(KEY));
const buttons = () => [...document.querySelectorAll('button')];
const button = text => buttons().find(node => node.textContent.trim() === text);
const pick = () => document.querySelector('[data-nba-draft-choice]') || buttons().find(node => node.matches('.flex.items-center.justify-between.rounded-lg'));
const selectedName = () => pick()?.querySelector('span.block.text-sm')?.textContent;
async function unmount() { if (mounted) { await act(async () => mounted.unmount()); mounted = null; } document.getElementById('root').replaceChildren(); }
async function mount(s) {
  await unmount(); localStorage.clear(); localStorage.setItem(SENTINEL, 'exact unrelated payload');
  const raw = JSON.stringify(s); localStorage.setItem(KEY, raw);
  mounted = createRoot(document.getElementById('root'));
  await act(async () => mounted.render(React.createElement(E.Boundary, { resetKey: '/nba-front-office' }, React.createElement(E.Board))));
  return raw;
}
async function click(node, count = 1) { assert.ok(node, 'Actual usable control exists'); await act(async () => { for (let i = 0; i < count; i++) node.click(); }); }
async function open(capital = 2, seed = 702) {
  const f = fixture(capital), rng = random(seed); Math.random = rng;
  await mount(shape(f.lg)); const before = rng.calls(); await click(button('Go to the draft'));
  return { ...f, rng, before, initial: saved() };
}
function referenceBatch(lg, cls, rng, consume = false) {
  const order = E.nbaStandings(lg).map(t => t.abbr).reverse().filter(a => a !== 'DEN'), chosen = [];
  for (const a of order) {
    if (chosen.length === 5 || cls.length === 0) break;
    if (consume && lg.teams[a].picks.length === 0) continue;
    if (consume) lg.teams[a].picks.shift();
    const pr = cls.shift(); lg.teams[a].players.push(E.nbaProspectToPlayer(pr, rng, E.nbaDraftSigning(lg))); chosen.push(a);
  }
  return chosen;
}
function referenceHuman(lg, cls, name, rng, consume = false) {
  const i = cls.findIndex(p => p.name === name); assert.ok(i >= 0);
  const pr = cls.splice(i, 1)[0]; if (consume) lg.teams.DEN.picks.shift();
  lg.teams.DEN.players.push(E.nbaProspectToPlayer(pr, rng, E.nbaDraftSigning(lg)));
}
function sameLeague(a, b) { assert.equal(hash(a), hash(b), 'Complete actual league state matches independent replay except fresh entity IDs'); }
function sentinel() { assert.equal(localStorage.getItem(SENTINEL), 'exact unrelated payload'); }
async function writes(run) {
  const old = window.Storage.prototype.setItem, values = [];
  window.Storage.prototype.setItem = function(key, v) { if (key === KEY) values.push(v); return old.call(this, key, v); };
  try { await run(); } finally { window.Storage.prototype.setItem = old; }
  return values;
}
const cases = [
  ['holds raw legacy restore rosters ratings contracts and unrelated storage', async () => {
    const f = fixture(), cls = E.nbaDraftClass(random(770), 24, E.leagueNames(f.lg));
    const s = shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 1, postseason: null });
    const raw = await mount(s); assert.equal(localStorage.getItem(KEY), raw); assert.deepEqual(saved(), s); sentinel();
  }],
  ['holds opening initialization draws terms budgets and schedule independently', async () => {
    const a = random(716), b = random(716), old = E.initNbaLeague(a), now = E.initNbaLeague(b, E.NBA_OPENING_RATINGS);
    assert.equal(a.calls(), b.calls()); assert.deepEqual(old.schedule, now.schedule); assert.equal(old.taxScale, now.taxScale);
    for (const key of Object.keys(now.teams)) { assert.equal(E.nbaCapUsed(old.teams[key]), E.nbaCapUsed(now.teams[key])); assert.deepEqual(old.teams[key].players.map(p => [p.name, p.age, p.years]), now.teams[key].players.map(p => [p.name, p.age, p.years])); }
  }],
  ['holds ordinary two-pick complete league and exact original randomness', async () => {
    const f = await open(), reference = clone(f.lg), rng = random(702);
    for (let i = 0; i < f.before; i++) rng();
    const cls = E.nbaDraftClass(rng, 24, E.leagueNames(reference));
    assert.deepEqual(withoutIds(cls), withoutIds(f.initial.draftClass)); assert.equal(rng.calls(), f.rng.calls());
    for (let i = 0; i < 2; i++) { const name = selectedName(); await click(pick()); referenceHuman(reference, cls, name, rng); referenceBatch(reference, cls, rng); }
    E.nbaOffseason(reference, rng, 'DEN'); assert.equal(f.rng.calls(), rng.calls()); sameLeague(saved().league, reference);
    assert.equal(saved().league.season, f.lg.season + 1); assert.equal(saved().phase, 'hub'); await click(button('Continue to the hub')); sentinel();
  }],
  ['one actually traded remaining pick finishes two rival batches and one offseason', async () => {
    const f = await open(1, 703); assert.equal(f.trades.length, 1); assert.equal(saved().picksLeft, 1);
    const reference = clone(saved().league), cls = clone(saved().draftClass), rng = random(703); for (let i = 0; i < f.rng.calls(); i++) rng();
    const name = selectedName(); referenceHuman(reference, cls, name, rng, true); referenceBatch(reference, cls, rng, true); referenceBatch(reference, cls, rng, true); E.nbaOffseason(reference, rng, 'DEN');
    await click(pick()); sameLeague(saved().league, reference); assert.equal(f.rng.calls(), rng.calls()); assert.equal(saved().phase, 'hub');
    assert.equal(saved().league.teams.DEN.players.filter(p => p.rookieSeason === f.lg.season + 1).length, 1);
  }],
  ['zero actual traded picks offer no rookie and explicitly finish league draft', async () => {
    const f = await open(0, 704); assert.equal(f.trades.length, 2); assert.equal(saved().picksLeft, 0); assert.equal(Boolean(pick()), false);
    assert.ok(button('Finish draft and offseason')); assert.doesNotMatch(document.body.textContent, /The offseason has run/);
    const reference = clone(saved().league), cls = clone(saved().draftClass), rng = random(704); for (let i = 0; i < f.rng.calls(); i++) rng();
    referenceBatch(reference, cls, rng, true); referenceBatch(reference, cls, rng, true); E.nbaOffseason(reference, rng, 'DEN');
    await click(button('Finish draft and offseason')); sameLeague(saved().league, reference); assert.equal(f.rng.calls(), rng.calls());
    assert.equal(saved().league.teams.DEN.players.filter(p => p.rookieSeason === f.lg.season + 1).length, 0); assert.equal(saved().phase, 'hub'); assert.equal(Boolean(document.querySelector('[data-draft-night]')), false);
  }],
  ['acquired third pick survives zero rival budget refresh and produces three rookies', async () => {
    const f = await open(3, 705); assert.equal(f.trades.length, 1); assert.equal(saved().picksLeft, 3);
    const reference = clone(saved().league), cls = clone(saved().draftClass), rng = random(705); for (let i = 0; i < f.rng.calls(); i++) rng();
    for (let i = 0; i < 3; i++) {
      const name = selectedName(); referenceHuman(reference, cls, name, rng, true); if (i < 2) referenceBatch(reference, cls, rng, true);
      await click(pick()); if (i === 1) { assert.equal(saved().picksLeft, 1); assert.equal(saved().draftAiBatchesLeft, 0); const raw = localStorage.getItem(KEY); await mount(saved()); assert.equal(localStorage.getItem(KEY), raw); }
    }
    E.nbaOffseason(reference, rng, 'DEN'); sameLeague(saved().league, reference); assert.equal(f.rng.calls(), rng.calls());
    assert.equal(saved().league.teams.DEN.players.filter(p => p.rookieSeason === f.lg.season + 1).length, 3);
  }],
  ['first accepted acquired choice consumes its actual ordered round token', async () => {
    await open(3); assert.deepEqual(saved().league.teams.DEN.picks, [1, 2, 2]); await click(pick()); assert.deepEqual(saved().league.teams.DEN.picks, [2, 2]); assert.equal(saved().picksLeft, 2);
  }],
  ['rival with both rights actually traded away receives no rookie', async () => {
    const f = fixture(), order = E.nbaStandings(f.lg).map(t => t.abbr).reverse().filter(a => a !== 'DEN');
    const a = order[0], b = Object.keys(f.lg.teams).find(x => x !== a && x !== 'DEN'), ai = f.lg.teams[a].players[0].id, bi = f.lg.teams[b].players[0].id;
    f.move(a, b, ai, bi); f.move(a, b, bi, ai); assert.equal(f.lg.teams[a].picks.length, 0); assert.equal(E.nbaStandings(f.lg).map(t => t.abbr).reverse().filter(a => a !== 'DEN')[0], a);
    Math.random = random(707); await mount(shape(f.lg)); await click(button('Go to the draft')); await click(pick());
    assert.equal(saved().league.teams[a].players.length, f.lg.teams[a].players.length);
    assert.equal(Object.values(saved().league.teams).filter(t => t.abbr !== 'DEN').flatMap(t => t.players.filter(p => p.rookieSeason === f.lg.season + 1)).length, 5);
  }],
  ['each real rival choice consumes one token and cannot replay on refresh', async () => {
    const f = await open(), old = clone(saved()); await click(pick()); const now = saved();
    const drafted = Object.values(now.league.teams).filter(t => t.abbr !== 'DEN' && t.players.length > old.league.teams[t.abbr].players.length);
    assert.equal(drafted.length, 5); for (const t of drafted) assert.equal(t.picks.length, old.league.teams[t.abbr].picks.length - 1);
    assert.equal(now.draftAiBatchesLeft, 1); const raw = localStorage.getItem(KEY), draws = f.rng.calls(); await mount(now); assert.equal(localStorage.getItem(KEY), raw); assert.equal(f.rng.calls(), draws);
  }],
  ['same-frame duplicate first choice settles one write and six player draws', async () => {
    const f = fixture(), rng = random(708); Math.random = rng; await mount(shape(f.lg));
    const opening = await writes(() => click(button('Go to the draft'), 2)); assert.equal(opening.length, 1);
    const before = rng.calls(); const w = await writes(() => click(pick(), 2)); assert.equal(w.length, 1); assert.equal(rng.calls() - before, 6); assert.equal(saved().picksLeft, 1); assert.equal(saved().draftClass.length, 18);
  }],
  ['same-frame duplicate final choice advances one offseason and one write', async () => {
    const f = await open(); await click(pick());
    const w = await writes(() => click(pick(), 2)); assert.equal(w.length, 1); assert.equal(saved().league.season, f.lg.season + 1);
  }],
  ['same-frame zero-right completion advances one offseason and one write', async () => {
    const f = await open(0); const w = await writes(() => click(button('Finish draft and offseason'), 2)); assert.equal(w.length, 1); assert.equal(saved().league.season, f.lg.season + 1);
  }],
  ['legacy one-choice restore holds raw surplus until accepted final choice', async () => {
    const f = fixture(), cls = E.nbaDraftClass(random(713), 24, E.leagueNames(f.lg)); Math.random = random(714);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 1, postseason: null })); assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /You hold 1 pick/);
    const reference = clone(f.lg), rest = clone(cls), rr = random(714); for (let i = 0; i < Math.random.calls(); i++) rr();
    reference.teams.DEN.picks = reference.teams.DEN.picks.slice(-1); referenceHuman(reference, rest, selectedName(), rr, true); referenceBatch(reference, rest, rr, true); E.nbaOffseason(reference, rr, 'DEN');
    await click(pick()); sameLeague(saved().league, reference); assert.equal(Math.random.calls(), rr.calls());
  }],
  ['legacy two-choice one-token discrepancy finishes remaining rival budget', async () => {
    const f = fixture(1), cls = E.nbaDraftClass(random(715), 24, E.leagueNames(f.lg)); Math.random = random(716);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 2, postseason: null })); assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /You hold 1 pick/);
    const ref = clone(f.lg), rest = clone(cls), rr = random(716); for (let i = 0; i < Math.random.calls(); i++) rr();
    referenceHuman(ref, rest, selectedName(), rr, true); referenceBatch(ref, rest, rr, true); referenceBatch(ref, rest, rr, true); E.nbaOffseason(ref, rr, 'DEN');
    await click(pick()); sameLeague(saved().league, ref); assert.equal(saved().phase, 'hub'); assert.equal(Math.random.calls(), rr.calls());
  }],
  ['legacy zero-choice closed season performs actual offseason without AI replay', async () => {
    const f = fixture(0), cls = E.nbaDraftClass(random(717), 24, E.leagueNames(f.lg)); Math.random = random(718);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 0, postseason: null })); assert.equal(localStorage.getItem(KEY), raw); assert.doesNotMatch(document.body.textContent, /The offseason has run/);
    const ref = clone(f.lg), rr = random(718); for (let i = 0; i < Math.random.calls(); i++) rr(); E.nbaOffseason(ref, rr, 'DEN');
    await click(button('Finish draft and offseason')); sameLeague(saved().league, ref); assert.equal(Math.random.calls(), rr.calls()); assert.equal(saved().league.season, f.lg.season + 1);
  }],
  ['legacy completed zero-choice season exits without a second offseason or AI', async () => {
    const f = fixture(); E.nbaOffseason(f.lg, random(720), 'DEN'); const cls = E.nbaDraftClass(random(721), 24); Math.random = random(722);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 0, postseason: null })); assert.equal(localStorage.getItem(KEY), raw); const before = Math.random.calls();
    await click(button('Continue to the hub')); assert.equal(Math.random.calls(), before); sameLeague(saved().league, f.lg); assert.equal(saved().phase, 'hub');
  }],
  ['round-one zero-choice save without prior championship fails recoverably', async () => {
    const f = fixture(0); f.lg.round = 1; f.lg.champions = []; const cls = E.nbaDraftClass(random(723), 24);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 0, postseason: null })); assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(pick()), false); sentinel();
  }],
  ['negative huge fractional and string rival counters preserve raw recovery', async () => {
    for (const counter of [-1, 3, 1000000, 0.5, '2']) { const f = fixture(), cls = E.nbaDraftClass(random(724), 24); const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 2, draftAiBatchesLeft: counter })); assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(pick()), false); }
  }],
  ['valid acquired remaining choice with zero rival budget makes no extra rivals', async () => {
    const f = fixture(3), cls = E.nbaDraftClass(random(725), 24, E.leagueNames(f.lg)); Math.random = random(726);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 1, draftAiBatchesLeft: 0 })); assert.equal(localStorage.getItem(KEY), raw);
    const ref = clone(f.lg), rest = clone(cls), rr = random(726); for (let i = 0; i < Math.random.calls(); i++) rr();
    ref.teams.DEN.picks = ref.teams.DEN.picks.slice(-1); referenceHuman(ref, rest, selectedName(), rr, true); E.nbaOffseason(ref, rr, 'DEN'); await click(pick()); sameLeague(saved().league, ref); assert.equal(Math.random.calls(), rr.calls());
  }],
  ['unfinished explicit zero-budget zero-choice save rejects without mutation', async () => {
    const f = fixture(0), cls = E.nbaDraftClass(random(727), 24); const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 0, draftAiBatchesLeft: 0 })); assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(button('Finish draft and offseason')), false);
  }],
  ['exhausted old class has explicit replacement without replaying past rival batches', async () => {
    const f = fixture(), raw = await mount(shape(f.lg, { phase: 'draft', draftClass: [], picksLeft: 1, draftAiBatchesLeft: 0 })); assert.equal(localStorage.getItem(KEY), raw); assert.equal(Boolean(pick()), false);
    await click(button('Generate replacement class')); assert.ok(saved().draftClass.length >= 24); assert.equal(saved().picksLeft, 1); assert.equal(saved().draftAiBatchesLeft, 0); sameLeague(saved().league, f.lg); assert.ok(pick()); sentinel();
  }],
  ['legacy no-token positive counter shows no invented choice and completes once', async () => {
    const f = fixture(0), cls = E.nbaDraftClass(random(728), 24); Math.random = random(729);
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 2 })); assert.equal(localStorage.getItem(KEY), raw); assert.equal(Boolean(pick()), false); assert.match(document.body.textContent, /You hold 0 picks/);
    const ref = clone(f.lg), rest = clone(cls), rr = random(729); for (let i = 0; i < Math.random.calls(); i++) rr();
    referenceBatch(ref, rest, rr, true); referenceBatch(ref, rest, rr, true); E.nbaOffseason(ref, rr, 'DEN');
    await click(button('Finish draft and offseason')); sameLeague(saved().league, ref); assert.equal(Math.random.calls(), rr.calls()); assert.equal(saved().league.season, f.lg.season + 1); assert.equal(saved().phase, 'hub');
  }],
  ['all sixty actually acquired rights fit the class and complete without an empty grid', async () => {
    const f = await open(60); assert.equal(f.trades.length, 58); assert.equal(saved().picksLeft, 60); assert.equal(saved().draftClass.length, 60);
    for (let i = 0; i < 60; i++) { assert.ok(pick()); await click(pick()); if (i < 59) assert.equal(saved().picksLeft, 59 - i); }
    assert.equal(saved().league.season, f.lg.season + 1); assert.equal(saved().phase, 'hub'); assert.equal(saved().league.teams.DEN.players.filter(p => p.rookieSeason === f.lg.season + 1).length, 60); sentinel();
  }],
  ['pure capital consume rejects malformed dense and sparse rights without changing state', async () => {
    assert.equal(typeof E.nbaDraftCapital, 'function'); assert.equal(typeof E.nbaConsumeDraftPick, 'function');
    for (const value of [null, [], [3], [1, null, 2], [1, , 2], Array(61).fill(1)]) { const t = { picks: value }, before = structuredClone(t); const r = E.nbaConsumeDraftPick(t); assert.equal(r, false); assert.deepEqual(t, before); }
    const t = { picks: [1, 2, 2] }; assert.equal(E.nbaDraftCapital(t), 3); assert.equal(E.nbaConsumeDraftPick(t), true); assert.deepEqual(t.picks, [2, 2]);
  }],
  ['pure rival batch holds unselected class and chooses five distinct owned-token rivals', async () => {
    assert.equal(typeof E.nbaAiDraftPicks, 'function'); const f = fixture(), cls = E.nbaDraftClass(random(730), 24), held = clone(cls);
    const names = Object.keys(f.lg.teams).filter(a => a !== 'DEN'); f.lg.teams[names[0]].picks = []; f.lg.teams[names[1]].picks = [3];
    const before = clone(f.lg), rr = random(731); const result = E.nbaAiDraftPicks(f.lg, cls, ['missing', names[0], names[1], names[2], names[2], ...names.slice(3)], rr);
    assert.equal(result.picks.length, 5); assert.equal(new Set(result.picks.map(p => p.team)).size, 5); assert.equal(rr.calls(), 5); assert.deepEqual(cls, held); assert.equal(result.remaining.length, 19);
    for (const p of result.picks) { assert.equal(f.lg.teams[p.team].picks.length, before.teams[p.team].picks.length - 1); assert.equal(f.lg.teams[p.team].players.at(-1).rookieSeason, f.lg.season + 1); }
    assert.deepEqual(f.lg.teams[names[0]], before.teams[names[0]]); assert.deepEqual(f.lg.teams[names[1]], before.teams[names[1]]);
  }],
  ['active draft midway through a season and modern completed impostor preserve raw recovery', async () => {
    for (const round of [1, 2, E.NBA_ROUNDS - 1]) {
      const f = fixture(), cls = E.nbaDraftClass(random(732), 24); f.lg.round = round;
      const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 1, draftAiBatchesLeft: 1 }));
      assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(pick()), false); sentinel();
    }
    const f = fixture(); E.nbaOffseason(f.lg, random(733), 'DEN');
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: [], picksLeft: 0, draftAiBatchesLeft: 0 }));
    assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/);
  }],
  ['missing owned club in an active draft shows explicit raw-save recovery', async () => {
    const f = fixture(), cls = E.nbaDraftClass(random(734), 24);
    const raw = await mount(shape(f.lg, { phase: 'draft', myTeam: 'MISSING', draftClass: cls, picksLeft: 2, draftAiBatchesLeft: 2 }));
    assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(pick()), false); sentinel();
  }],
  ['null impossible-role and nonfinite saved prospects fail before game rendering', async () => {
    const f = fixture(), cls = E.nbaDraftClass(random(735), 24);
    for (const p of [null, { ...cls[0], pos: 'QB' }, { ...cls[0], age: null }, { ...cls[0], grade: -1 }, { ...cls[0], trueOvr: null }, { ...cls[0], name: '' }]) {
      const current = shape(f.lg, { phase: 'draft', draftClass: [p], picksLeft: 2, draftAiBatchesLeft: 2 });
      let renderFailed = false, raw; const originalError = console.error;
      try { console.error = () => {}; raw = await mount(current); }
      catch { renderFailed = true; }
      finally { console.error = originalError; }
      assert.equal(renderFailed, false, 'Malformed saved prospect must recover before the actual game renderer throws');
      assert.equal(localStorage.getItem(KEY), raw); assert.match(document.body.textContent, /Could not restore this draft/); assert.equal(Boolean(pick()), false); sentinel();
    }
  }],
  ['existing missing and overlapping entity IDs repair only in memory until accepted action', async () => {
    const f = fixture(), cls = E.nbaDraftClass(random(736), 24); cls[0].id = f.lg.teams.DEN.players[0].id; cls[1].id = ''; delete cls[2].id;
    const raw = await mount(shape(f.lg, { phase: 'draft', draftClass: cls, picksLeft: 2 })); assert.equal(localStorage.getItem(KEY), raw);
    const name = selectedName(); await click(pick()); assert.equal(saved().league.teams.DEN.players.filter(p => p.name === name).length, 1);
    const rosterIds = Object.values(saved().league.teams).flatMap(t => t.players.map(p => p.id)), prospectIds = saved().draftClass.map(p => p.id);
    assert.equal(new Set([...rosterIds, ...prospectIds]).size, rosterIds.length + prospectIds.length); assert.ok(prospectIds.every(id => typeof id === 'string' && id)); sentinel();
  }],
];
const originalRandom = Math.random, rows = [];
try {
  for (const [index, [title, run]] of cases.entries()) {
    fs.writeFileSync(process.env.NBA_DRAFT_REPORT + '.progress.json', JSON.stringify({ index, title, completed: rows.length }));
    try { await run(); rows.push({ title, status: 'passed' }); }
    catch (error) { rows.push({ title, status: 'failed', error: { name: error.name, message: error.message, stack: error.stack } }); }
    finally { await unmount(); }
  }
} finally { Math.random = originalRandom; dom.window.close(); }
fs.writeFileSync(process.env.NBA_DRAFT_REPORT, JSON.stringify({ total: rows.length, passed: rows.filter(r => r.status === 'passed').length, failed: rows.filter(r => r.status === 'failed').length, rows }, null, 2));
for (const [i, row] of rows.entries()) console.log(\`\${i} \${row.status}: \${row.title}\`);
process.exitCode = rows.some(row => row.status === 'failed') ? 1 : 0;
`;
  await writeFile(path.join(owned, 'runner.mjs'), runner);
  const reportPath = path.join(receipts, 'report.json'), transport = path.join(receipts, 'transport.txt');
  const run = spawnSync(process.execPath, ['--require', path.join(root, 'scripts/lib/offlineTransport.cjs'), path.join(owned, 'runner.mjs')], { cwd: root, timeout: 120000, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NODE_ENV: 'test', NBA_DRAFT_REPORT: reportPath, SIM_OFFLINE_RECEIPT: transport } });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); await writeFile(path.join(receipts, 'run.log'), output);
  assert.ok(!run.error && !run.signal); assert.doesNotMatch(output, /SIM_OFFLINE_BLOCK|Unhandled (?:Error|Rejection)|SyntaxError|TypeError|ReferenceError|Cannot find module|Transform failed|not wrapped in act|Maximum update depth/);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.total, 29); assert.equal(report.rows.length, 29); assert.ok(report.rows.every(r => r.status === 'passed' || r.status === 'failed'));
  assert.equal(report.rows[0].status, 'passed'); assert.equal(report.rows[1].status, 'passed');
  for (const r of report.rows.filter(r => r.status === 'failed')) assert.equal(r.error.name, 'AssertionError');
  const failed = report.rows.flatMap((row, index) => row.status === 'failed' ? [index] : []);
  const expected = mode === 'original' ? [3,4,5,6,7,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27]
    : mode ? controls[mode][3] : [];
  assert.deepEqual(failed, expected, 'Only exact intended actual outcome assertions reject');
  assert.equal(report.failed, expected.length); assert.equal(report.passed, 29 - expected.length);
  assert.equal(run.status, expected.length ? 1 : 0);
  assert.equal(report.rows[28].status, 'passed', 'Original missing and duplicate entity-ID repair remains held');
  try { assert.equal((await readFile(transport, 'utf8')).trim(), ''); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  const summary = { mode: mode || 'normal', passed: report.passed, failed: report.failed, failedIndices: failed, intendedFailureTitles: expected.map(index => report.rows[index].title), physicalOriginalCommit: mode === 'original' ? '08c18814' : null, sourceHashes: Object.fromEntries(held.map(([file, { bytes }]) => [file, createHash('sha256').update(bytes).digest('hex')])), limits: 'Actual Board and engine in jsdom, simulated post-season save fixtures created by real accepted cap-isolated trades. DOM dispatch is not native keyboard or mobile proof. Normal2 complete offseason and exact original RNG comparison; no full season, sixty-selection league, future asset lineage or financial cap claim.' };
  await writeFile(path.join(receipts, 'verified-summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, sourceHashes: undefined, limits: undefined, receipt: receipts }));
} finally {
  assert.equal(path.dirname(path.resolve(owned)), parent); assert.ok(path.basename(owned).startsWith('nba-draft939-')); await rm(owned, { recursive: true, force: true });
  for (const [file, { bytes }] of held) { const currentBytes = await readFile(path.join(root, file)); assert.deepEqual(currentBytes, bytes); }
}
console.log('NBA draft-capital actual29 outcomes, independent baselines, CRLF controls, source holds and owned cleanup completed.');
