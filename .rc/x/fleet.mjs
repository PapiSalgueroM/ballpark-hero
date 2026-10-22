/* Review fleet for Round 1521 (runner only, never committed).
   1. The default path: the shared pitch part without `build` must plan and place exactly as the base 30b4b3ca did,
      over a fleet of synthetic feeds (every other binder of the part passes no `build`).
   2. With `build` (-1, 0, 1): no throw, no NaN, deterministic, a cue only ever on a foul line, on edge inputs too
      (a side short of men, a side with no names, an empty side, fouls in added time and at the whistle).
   Usage (repo root): git worktree add /tmp/base 30b4b3ca && node .rc/x/fleet.mjs /tmp/base */
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const HEAD = process.cwd();
const BASE = process.argv[2] || '/tmp/base';
const N = Number(process.env.FLEET_N || 1000);

async function load(root, tag) {
  const out = path.join(os.tmpdir(), `fleet-${tag}-${process.pid}.mjs`);
  const at = {
    name: 'at', setup(build) {
      build.onResolve({ filter: /^@\// }, args => build.resolve('./' + args.path.slice(2), { resolveDir: path.join(root, 'src'), kind: args.kind }));
    },
  };
  await esbuild.build({ entryPoints: [path.join(root, 'src/components/pitch-motion/scene.ts')], bundle: true, format: 'esm', platform: 'node', outfile: out, plugins: [at], logLevel: 'error' });
  return import(pathToFileURL(out).href);
}

function rng32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

function side(r, s, named) {
  const roll = r();
  if (roll < 0.03) return [];
  const d = 3 + Math.floor(r() * 3), m = 3 + Math.floor(r() * 3);
  let a = 10 - d - m; if (a < 1) a = 1;
  const out = [{ key: `${s}k`, line: 'keeper', slot: { x: 50, y: 91 } }];
  const row = (n, line, y) => { for (let i = 0; i < n; i++) out.push({ key: `${s}${line[0]}${i}`, line, slot: { x: Math.round((100 * (i + 1)) / (n + 1)), y } }); };
  row(d, 'defence', 74); row(m, 'midfield', 52); row(a, 'attack', 28);
  /* now and then a side short of men (a red card, an injury with no subs left) */
  if (r() < 0.15) out.splice(1 + Math.floor(r() * (out.length - 1)), 1);
  if (r() < 0.05) out.splice(1 + Math.floor(r() * (out.length - 1)), 1);
  if (named) out.forEach((f, i) => { f.name = `${s === 'me' ? 'Mine' : 'Their'} ${String.fromCharCode(65 + i)}${i}`; });
  return out;
}

function input(seed) {
  const r = rng32(seed * 7919 + 13);
  const mine = side(r, 'me', true);
  const theirs = side(r, 'opp', r() > 0.25);
  const second = r() < 0.5;
  const from = second ? 46 : 0;
  const board = Math.floor(r() * 6);
  const end = second ? 90 : 45;
  const to = end + board;
  const kinds = ['foul', 'foul', 'foul', 'foul', 'corner', 'corner', 'throwin', 'throwin', 'shot', 'shot', 'save', 'goal', 'yellow', 'red', 'injury', 'sub'];
  const feed = [];
  const n = Math.floor(r() * 45);
  for (let i = 0; i < n; i++) {
    const kind = pick(r, kinds);
    const s = r() < 0.5 ? 'me' : 'opp';
    const list = s === 'me' ? mine : theirs;
    const named = list.filter(f => f.name);
    let minute = from + Math.floor(r() * (end - from + 1));
    const e = { minute, side: s, kind, text: named.length && r() > 0.05 ? pick(r, named).name : '' };
    if (minute === end && board && r() < 0.6) e.plus = 1 + Math.floor(r() * board);
    if (kind === 'corner') e.flank = r() < 0.5 ? 'left' : 'right';
    if ((kind === 'goal' || kind === 'shot' || kind === 'save') && r() < 0.08) e.penalty = true;
    else if ((kind === 'goal' || kind === 'shot' || kind === 'save') && r() < 0.08) e.freeKick = true;
    feed.push(e);
    /* the binder books a man at his foul's own place */
    if (kind === 'foul' && r() < 0.15) feed.push({ ...e, kind: r() < 0.9 ? 'yellow' : 'red' });
  }
  feed.sort((a, b) => a.minute + (a.plus ?? 0) - (b.minute + (b.plus ?? 0)));
  return { mine, theirs, feed, span: { from, to: Math.max(from + 0.38, to) }, kickoffs: [{ at: from, side: r() < 0.5 ? 'me' : 'opp' }], possession: 0.3 + r() * 0.4, seed: Math.floor(r() * 2 ** 31) };
}

const hash = s => createHash('sha256').update(s).digest('hex');
function picture(mod, inp) {
  const plan = mod.pitchPlan(inp);
  const scenes = [];
  for (let c = inp.span.from - 0.3; c <= inp.span.to + 0.3; c += 0.07) scenes.push(mod.pitchScene(plan, Math.round(c * 1000) / 1000));
  return { plan, scenes, text: JSON.stringify(plan) + '|' + JSON.stringify(scenes) };
}

const base = await load(BASE, 'base');
const head = await load(HEAD, 'head');
let same = 0, differ = 0, baseThrows = 0, headThrows = 0, buildPlans = 0, buildThrows = 0, nan = 0, cueOff = 0, undeterministic = 0, cues = 0, flights = {}, liftInScene = 0;
const examples = [];
for (let i = 0; i < N; i++) {
  const inp = input(i);
  let b = null, h = null;
  try { b = picture(base, structuredClone(inp)); } catch (e) { baseThrows++; }
  try { h = picture(head, structuredClone(inp)); } catch (e) { headThrows++; if (examples.length < 5) examples.push(`head threw on ${i}: ${e.message}`); }
  if (b && h) { if (hash(b.text) === hash(h.text)) same++; else { differ++; if (examples.length < 5) examples.push(`default path differs on input ${i}`); } }
  for (const me of [-1, 0, 1]) {
    const bi = { ...structuredClone(inp), build: { me, opp: 0 } };
    let p1;
    try { p1 = picture(head, bi); } catch (e) { buildThrows++; if (examples.length < 8) examples.push(`build ${me} threw on ${i}: ${e.stack.split('\n').slice(0, 2).join(' ')}`); continue; }
    buildPlans++;
    if (/NaN|Infinity/.test(JSON.stringify(p1.plan, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'NaN' : v)))) { nan++; if (examples.length < 8) examples.push(`NaN in build plan ${i}`); }
    const again = picture(head, structuredClone(bi));
    if (again.text !== p1.text) undeterministic++;
    for (const sc of p1.scenes) {
      if (sc.lift !== undefined) liftInScene++;
      if (sc.flight) flights[sc.flight] = (flights[sc.flight] ?? 0) + 1;
      if (!sc.cue) continue;
      cues++;
      const line = bi.feed[sc.cue.order];
      if (!line || line.kind !== 'foul') { cueOff++; if (examples.length < 8) examples.push(`cue on line ${sc.cue.order} (${line?.kind}) in ${i}`); }
    }
  }
}
console.log(`fleet: ${N} inputs; default path same as base ${same}, different ${differ}, base threw ${baseThrows}, head threw ${headThrows}`);
console.log(`fleet: build plans ${buildPlans}, threw ${buildThrows}, NaN ${nan}, not deterministic ${undeterministic}, cue scenes ${cues}, cue on a non foul line ${cueOff}, lift set by pitchScene ${liftInScene}, flights ${JSON.stringify(flights)}`);
for (const e of examples) console.log('  ' + e);
const bad = differ + headThrows + buildThrows + nan + undeterministic + cueOff + liftInScene + (same < N * 0.9 ? 1 : 0);
console.log(bad ? `fleet: RED (${bad})` : `fleet: green, the default path is the base's on ${same} of ${N} inputs and build is safe on the fleet`);
process.exitCode = bad ? 1 : 0;
