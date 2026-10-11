// Round 1304 reviewer probe (sent as an extra file, never committed). Runs from the repo root on a runner.
// BASE engine = this tree with src/lib/clubManager.ts read from git at PROBE_BASE (the only engine file the round changed).
// PART=fleet|scan|saves (default all). Output: lines on stdout and JSON into $RC_OUT.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd().replaceAll('\\', '/');
const BASE_SHA = process.env.PROBE_BASE || 'cbfa94fda6b5ffad32e927a6f89117da92f67f6c';
const OUT = process.env.RC_OUT || os.tmpdir();
const PARTS = (process.env.PART || 'fleet,scan,saves').split(',');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1304-'));
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const PINNED_NOW = 1790000000000;
Date.now = () => PINNED_NOW;
const REAL_RANDOM = Math.random;
const hash = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
const hashKey = s => { let h = 0x811c9dc5 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

let seq = 0;
async function bundleEngine(baseSha) {
  seq += 1;
  const entry = path.join(TMP, `entry${seq}.mjs`);
  const out = path.join(TMP, `engine${seq}.mjs`);
  fs.writeFileSync(entry, [
    `export * as cm from '${ROOT}/src/lib/clubManager.ts';`,
    `export * as eras from '${ROOT}/src/lib/clubManagerEras.ts';`,
    `export { CM_WORLD_ROSTERS } from '${ROOT}/src/data/clubManagerWorldRosters.ts';`,
  ].join('\n'));
  let swapped = 0;
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out,
    alias: { '@': `${ROOT}/src` }, logLevel: 'error',
    plugins: [{
      name: 'base-engine',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]clubManager\.ts$/ }, a => {
          if (!baseSha) return undefined;
          swapped += 1;
          const src = execFileSync('git', ['show', `${baseSha}:src/lib/clubManager.ts`], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
          return { contents: src, loader: 'ts', resolveDir: path.dirname(a.path) };
        });
      },
    }],
  });
  if (baseSha && swapped !== 1) { console.error(`the base engine was swapped in ${swapped} times, not once`); process.exit(2); }
  const mod = await import(pathToFileURL(out).href);
  await mod.eras.ensureAllEraRosters();
  return mod;
}

const HEAD = await bundleEngine(null);
const BASE = await bundleEngine(BASE_SHA);
const headHasHelper = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8').includes('function actingClubsByLeague(');
const baseSrc = execFileSync('git', ['show', `${BASE_SHA}:src/lib/clubManager.ts`], { maxBuffer: 256 * 1024 * 1024 }).toString('utf8');
console.log(`probe: head tree has actingClubsByLeague=${headHasHelper}; base ${BASE_SHA.slice(0, 8)} has it=${baseSrc.includes('function actingClubsByLeague(')}`);
if (!headHasHelper || baseSrc.includes('function actingClubsByLeague(')) { console.error('the two engines are not the two this probe expects'); process.exit(2); }

function playEntries(cm, state, n) {
  let s = state;
  for (let i = 0; i < n; i++) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') return { state: s, over: true, entries: i + 1 };
    if (s.sacked) return { state: s, sacked: true, entries: i + 1 };
  }
  return { state: s, entries: n };
}
/* A negotiation pushed until a rival enters (or it ends): low offers, at most 8 rounds. */
function haggle(cm, save, pickIndex = 0) {
  const targets = cm.buildMarket(save).filter(m => m.price >= 2 && m.price * 1.2 <= save.budget);
  const target = targets[pickIndex % Math.max(1, targets.length)];
  if (!target) return { talk: null, target: null };
  let talk = cm.startNegotiation(save, target);
  for (let r = 0; talk && talk.negotiation?.status === 'open' && talk.negotiation.phase === 'fee' && !talk.negotiation.rivalBidder && r < 8; r++) {
    talk = cm.makeOffer(talk, Math.round(talk.negotiation.theirAsk * 0.8 * 10) / 10);
  }
  return { talk, target };
}
/* With a rival in, keep offering under the rival until the talk ends (hijacked, collapsed or agreed). */
function dither(cm, talk) {
  let t = talk;
  for (let r = 0; t && t.negotiation?.status === 'open' && t.negotiation.phase === 'fee' && r < 12; r++) {
    const under = Math.max(0.1, Math.round((t.negotiation.rivalOffer ?? t.negotiation.theirAsk) * 0.9 * 10) / 10);
    t = cm.makeOffer(t, under);
  }
  return t;
}

/* ---------- PART fleet: a career that starts today is byte equal on the two engines ---------- */
function modernCareer(mod, club, seed, withTalk) {
  const { cm } = mod;
  store.clear();
  Math.random = seeded(seed);
  let s = cm.startCareer(club);
  delete s.realLeagueFixtures;
  const steps = { start: hash(s) };
  if (withTalk) {
    const h = haggle(cm, s, seed % 5);
    steps.talk = hash(h.talk?.negotiation ?? null);
    steps.rival = h.talk?.negotiation?.rivalBidder ?? null;
    const d = h.talk?.negotiation?.rivalBidder ? dither(cm, h.talk) : h.talk;
    steps.talkEnd = hash(d ?? null);
    steps.talkStatus = d?.negotiation?.status ?? null;
  }
  const one = playEntries(cm, s, 170);
  steps.season = hash(one.state);
  steps.heads = hash(one.state.aiHeadlines ?? null);
  if (one.over) {
    const fin = cm.finishSeason(one.state);
    const next = cm.startNextSeason(fin.state);
    steps.next = hash(next);
    const two = playEntries(cm, next, 8);
    steps.two = hash(two.state);
  }
  Math.random = REAL_RANDOM;
  return steps;
}

const report = {};
const ERA_IDS = mod => Object.keys(mod.cm.ERA_LEAGUES).filter(id => !process.env.PROBE_ERAS || process.env.PROBE_ERAS.split(',').includes(id));
const MAX_LEAGUES = Number(process.env.PROBE_LEAGUES || 99);
if (PARTS.includes('fleet')) {
  console.log('FLEET) a career that starts today, base engine against head engine, step by step');
  const leagues = HEAD.cm.REAL_LEAGUES;
  const PER = Number(process.env.FLEET_PER || 4);
  let careers = 0, equal = 0, rivals = 0, hijacks = 0;
  const diffs = [];
  for (let li = 0; li < leagues.length; li++) {
    const clubs = leagues[li].clubs;
    for (let k = 0; k < PER; k++) {
      const club = clubs[Math.floor((k * (clubs.length - 1)) / Math.max(1, PER - 1))];
      const seed = hashKey(`r1304-fleet|${leagues[li].id}|${club}|${k}`);
      const a = modernCareer(BASE, club, seed, true);
      const b = modernCareer(HEAD, club, seed, true);
      careers += 1;
      if (b.rival) rivals += 1;
      if (b.talkStatus === 'hijacked') hijacks += 1;
      const bad = Object.keys({ ...a, ...b }).filter(x => a[x] !== b[x]);
      if (bad.length) diffs.push(`${leagues[li].id} ${club} seed ${seed}: ${bad.join(',')}`); else equal += 1;
    }
  }
  console.log(`   ${careers} modern careers over ${leagues.length} leagues: ${equal} byte equal at every step, ${diffs.length} differ; ${rivals} negotiations drew a rival, ${hijacks} were hijacked`);
  for (const d of diffs.slice(0, 10)) console.log('   DIFF ' + d);
  report.fleet = { careers, equal, differ: diffs.length, rivals, hijacks, diffs: diffs.slice(0, 40) };
}

/* ---------- the reader: every string of a save, searched for a club of today that the era does not have ---------- */
const isWord = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
function eraNameSets(mod, eraId) {
  const { cm } = mod;
  const era = new Set((cm.ERA_LEAGUES[eraId] ?? []).flatMap(l => l.clubs));
  for (const f of cm.ERA_UCL_FIELDS?.[eraId] ?? []) era.add(f.name);
  const modern = new Set([...cm.REAL_LEAGUES.flatMap(l => l.clubs), ...Object.keys(mod.CM_WORLD_ROSTERS)]);
  const only = [...modern].filter(c => !era.has(c) && c.length >= 4);
  /* a modern name that is a piece of an era name (or the other way round) is read after the era names are taken out */
  const eraSorted = [...era].sort((a, b) => b.length - a.length);
  return { era, only, eraSorted, onlySet: new Set(only), cache: new Map() };
}
function scanState(state, sets, hits, tag) {
  const walk = (v, root, pathStr) => {
    if (typeof v === 'string') {
      if (v.length < 4) return;
      let m = sets.cache.get(v);
      if (m === undefined) {
        m = null;
        let text = v;
        for (const e of sets.eraSorted) if (text.includes(e)) text = text.split(e).join('#');
        outer: for (const cand of sets.only) {
          let at = text.indexOf(cand);
          while (at !== -1) {
            if (!isWord(text[at - 1]) && !isWord(text[at + cand.length])) { m = cand; break outer; }
            at = text.indexOf(cand, at + 1);
          }
        }
        sets.cache.set(v, m);
      }
      if (m) {
        const h = hits[root] ?? (hits[root] = { n: 0, exact: 0, samples: [], paths: {} });
        h.n += 1;
        if (v === m) h.exact += 1;
        const p = pathStr.replace(/\[\d+\]/g, '[]');
        h.paths[p] = (h.paths[p] ?? 0) + 1;
        if (h.samples.length < 6 && !h.samples.some(x => x.endsWith(v.slice(0, 110)))) h.samples.push(`${tag} ${p}: ${m} <= ${v.slice(0, 110)}`);
      }
      return;
    }
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, root, `${pathStr}[${i}]`)); return; }
    for (const k of Object.keys(v)) {
      /* a key can be a club name too (tables keyed by club) */
      if (sets.onlySet.has(k)) {
        const h = hits[root || k] ?? (hits[root || k] = { n: 0, exact: 0, samples: [], paths: {} });
        h.n += 1; h.exact += 1;
        const p = `${pathStr}{key}`;
        h.paths[p] = (h.paths[p] ?? 0) + 1;
        if (h.samples.length < 6) h.samples.push(`${tag} ${p}: key ${k}`);
      }
      walk(v[k], root || k, pathStr ? `${pathStr}.${k}` : k);
    }
  };
  walk(state, '', '');
}
function eraCareerScan(mod, eraId, club, seed, sets, hits) {
  const { cm } = mod;
  store.clear();
  Math.random = seeded(seed);
  let s = cm.startCareer(club, eraId);
  const tag = `${eraId}/${club}`;
  scanState(s, sets, hits, tag + '@start');
  for (let k = 0; k < 3; k++) {
    const h = haggle(cm, s, seed % 7 + k * 3);
    if (h.talk) scanState({ negotiation: h.talk.negotiation, transferLog: h.talk.transferLog }, sets, hits, tag + '@talk');
    if (h.talk?.negotiation?.rivalBidder) {
      const d = dither(cm, h.talk);
      if (d) scanState({ negotiation: d.negotiation, transferLog: d.transferLog }, sets, hits, tag + '@talkEnd');
    }
  }
  let over = false, entries = 0;
  for (let block = 0; block < 30 && !over; block++) {
    const r = playEntries(cm, s, 6);
    s = r.state; entries += r.entries;
    scanState(s, sets, hits, `${tag}@e${entries}`);
    if (r.sacked) return { entries, sacked: true };
    over = !!r.over;
  }
  if (!over) return { entries, stuck: true };
  const fin = cm.finishSeason(s);
  scanState({ summary: fin.summary }, sets, hits, tag + '@summary');
  const next = cm.startNextSeason(fin.state);
  scanState(next, sets, hits, tag + '@s2start');
  const two = playEntries(cm, next, 30);
  scanState(two.state, sets, hits, tag + '@s2e30');
  Math.random = REAL_RANDOM;
  return { entries, seasons: 1 };
}
if (PARTS.includes('scan')) {
  console.log('SCAN) every string of a past season save, searched for a club of today that the season does not have');
  report.scan = {};
  const PER = Number(process.env.SCAN_PER || 2);
  for (const [label, mod] of [['head', HEAD], ['base', BASE]]) {
    report.scan[label] = {};
    for (const eraId of ERA_IDS(mod)) {
      const sets = eraNameSets(mod, eraId);
      const hits = {};
      let careers = 0, stuck = 0, sacked = 0;
      const leagues = mod.cm.ERA_LEAGUES[eraId].slice(0, MAX_LEAGUES);
      for (let li = 0; li < leagues.length; li++) {
        for (let k = 0; k < PER; k++) {
          const clubs = leagues[li].clubs;
          const club = clubs[(k * 7 + li * 3) % clubs.length];
          const r = eraCareerScan(mod, eraId, club, hashKey(`r1304-scan|${eraId}|${club}|${k}`), sets, hits);
          careers += 1; if (r.stuck) stuck += 1; if (r.sacked) sacked += 1;
        }
      }
      Math.random = REAL_RANDOM;
      const roots = Object.keys(hits).sort((a, b) => hits[b].n - hits[a].n);
      console.log(`   ${label} ${eraId}: ${careers} careers (${stuck} stuck, ${sacked} sacked), ${sets.only.length} clubs of today not in the season; roots with a hit: ${roots.map(r => `${r}=${hits[r].n}`).join(' ') || 'NONE'}`);
      for (const r of roots.slice(0, 12)) for (const smp of hits[r].samples.slice(0, 3)) console.log(`      ${r}: ${smp}`);
      report.scan[label][eraId] = { careers, stuck, sacked, hits };
    }
  }
}
/* ---------- PART saves: a save written by the base engine, opened and played on the head engine ---------- */
const rootsLine = hits => Object.keys(hits).sort((a, b) => hits[b].n - hits[a].n).map(r => `${r}=${hits[r].n}`).join(' ') || 'none';
if (PARTS.includes('saves')) {
  console.log('SAVES) past season saves written by the base engine, loaded and played on the head engine');
  report.saves = { era: [], modern: [] };
  const PER = Number(process.env.SAVES_PER || 6);
  const DEPTHS = [0, 3, 9, 14, 20, 27];
  for (const eraId of ERA_IDS(HEAD)) {
    const sets = eraNameSets(HEAD, eraId);
    const leagues = BASE.cm.ERA_LEAGUES[eraId].slice(0, MAX_LEAGUES);
    for (let i = 0; i < PER; i++) {
      const lg = leagues[i % leagues.length];
      const club = lg.clubs[(i * 5) % lg.clubs.length];
      const seed = hashKey(`r1304-save|${eraId}|${club}|${i}`);
      const row = { eraId, club, depth: DEPTHS[i % DEPTHS.length] };
      try {
        store.clear();
        Math.random = seeded(seed);
        let s = BASE.cm.startCareer(club, eraId);
        s = playEntries(BASE.cm, s, row.depth).state;
        let withRival = null;
        for (let k = 0; k < 8 && !withRival; k++) {
          const h = haggle(BASE.cm, s, k * 2 + i);
          if (h.talk?.negotiation?.status === 'open' && h.talk.negotiation.rivalBidder) withRival = h.talk;
        }
        if (withRival) s = withRival;
        row.saved = BASE.cm.saveCareer(s);
        const raw = store.get(BASE.cm.SAVE_KEY);
        row.bytes = raw.length;
        const old = JSON.parse(raw);
        const before = {};
        scanState(old, sets, before, 'old');
        row.before = rootsLine(before);
        row.beforeHeads = (old.aiHeadlines ?? []).length;
        const loadedBase = BASE.cm.loadCareer();
        const loadedHead = HEAD.cm.loadCareer();
        row.loads = !!loadedHead;
        row.sameLoad = hash(loadedBase) === hash(loadedHead);
        row.squadKept = !!loadedHead && hash(loadedHead.squad.map(p => [p.id, p.name])) === hash(old.squad.map(p => [p.id, p.name]));
        row.logKept = !!loadedHead && hash(loadedHead.transferLog ?? null) === hash(old.transferLog ?? null);
        Math.random = seeded((seed ^ 0x9e3779b9) >>> 0);
        let t = loadedHead;
        if (t.negotiation?.status === 'open' && t.negotiation.rivalBidder) {
          row.rival = t.negotiation.rivalBidder;
          row.rivalOfToday = sets.onlySet.has(row.rival);
          const d = dither(HEAD.cm, t);
          row.rivalEnd = d?.negotiation?.status ?? null;
          if (d) t = d;
        }
        const r = playEntries(HEAD.cm, t, 175);
        t = r.state; row.over = !!r.over; row.sacked = !!r.sacked; row.entries = r.entries;
        const mid = {};
        scanState({ aiHeadlines: t.aiHeadlines }, sets, mid, 'seasonEnd');
        row.headsAtSeasonEnd = rootsLine(mid);
        if (r.over) {
          const fin = HEAD.cm.finishSeason(t);
          const next = HEAD.cm.startNextSeason(fin.state);
          const two = playEntries(HEAD.cm, next, 12);
          t = two.state; row.seasonTwo = two.entries;
        }
        const after = {};
        scanState(t, sets, after, 'after');
        row.after = rootsLine(after);
        row.afterSamples = Object.values(after).flatMap(h => h.samples.slice(0, 2)).slice(0, 4);
      } catch (e) { row.error = String(e?.stack ?? e).slice(0, 400); }
      Math.random = REAL_RANDOM;
      report.saves.era.push(row);
      console.log(`   ${eraId} ${club} depth ${row.depth}: saved=${row.saved} ${row.bytes}b loads=${row.loads} sameLoadAsBase=${row.sameLoad} squadKept=${row.squadKept} logKept=${row.logKept} rival=${row.rival ?? '-'}${row.rivalOfToday ? ' (OF TODAY)' : ''} end=${row.rivalEnd ?? '-'} over=${row.over} sacked=${row.sacked} entries=${row.entries} | old save roots: ${row.before} | headlines at season end: ${row.headsAtSeasonEnd} | after season two start: ${row.after}${row.error ? ' | ERROR ' + row.error : ''}`);
    }
  }
  /* a modern save written mid season by the base engine plays on to the same bytes on both engines */
  const leagues = HEAD.cm.REAL_LEAGUES;
  let same = 0, differ = 0;
  for (let li = 0; li < (process.env.SKIP_MODERN ? 0 : leagues.length); li += 2) {
    const club = leagues[li].clubs[li % leagues[li].clubs.length];
    const seed = hashKey(`r1304-msave|${club}`);
    store.clear();
    Math.random = seeded(seed);
    let s = BASE.cm.startCareer(club);
    delete s.realLeagueFixtures;
    s = playEntries(BASE.cm, s, 5 + (li % 20)).state;
    BASE.cm.saveCareer(s);
    const cont = mod => {
      Math.random = seeded((seed ^ 0x51ed270b) >>> 0);
      let t = mod.cm.loadCareer();
      const steps = { load: hash(t) };
      const h = haggle(mod.cm, t, li);
      steps.talk = hash(h.talk?.negotiation ?? null);
      const r = playEntries(mod.cm, t, 175);
      steps.season = hash(r.state);
      if (r.over) { const fin = mod.cm.finishSeason(r.state); const next = mod.cm.startNextSeason(fin.state); steps.next = hash(next); steps.two = hash(playEntries(mod.cm, next, 8).state); }
      return steps;
    };
    const a = cont(BASE), b = cont(HEAD);
    const bad = Object.keys({ ...a, ...b }).filter(x => a[x] !== b[x]);
    if (bad.length) { differ += 1; console.log(`   DIFF modern save ${club}: ${bad.join(',')}`); } else same += 1;
    report.saves.modern.push({ club, bad });
  }
  Math.random = REAL_RANDOM;
  console.log(`   modern saves written mid season by the base engine and played on: ${same} byte equal on both engines, ${differ} differ`);
}
/* ---------- PART mksave: one past season save written by the base engine, for the browser ---------- */
if (PARTS.includes('mksave')) {
  for (const [eraId, club, depth] of [['era2010', 'Arsenal', 0], ['era2005', 'Chelsea', 9]]) {
    const sets = eraNameSets(BASE, eraId);
    const seed = hashKey('r1304-save|' + eraId + '|' + club + '|0');
    store.clear();
    Math.random = seeded(seed);
    let s0 = BASE.cm.startCareer(club, eraId);
    s0 = playEntries(BASE.cm, s0, depth).state;
    let withRival = null;
    for (let k = 0; k < 8 && !withRival; k++) {
      const h = haggle(BASE.cm, s0, k * 2);
      if (h.talk?.negotiation?.status === 'open' && h.talk.negotiation.rivalBidder) withRival = h.talk;
    }
    if (withRival) s0 = withRival;
    BASE.cm.saveCareer(s0);
    Math.random = REAL_RANDOM;
    const raw = store.get(BASE.cm.SAVE_KEY);
    const hits = {};
    scanState(JSON.parse(raw), sets, hits, 'old');
    fs.writeFileSync(path.join(OUT, 'oldsave-' + eraId + '.json'), raw);
    console.log('   mksave ' + eraId + ' ' + club + ' depth ' + depth + ': ' + raw.length + ' bytes, rival ' + (s0.negotiation?.rivalBidder ?? 'none') + ', headlines ' + JSON.stringify(s0.aiHeadlines) + ', roots naming a club of today: ' + rootsLine(hits));
  }
}
fs.writeFileSync(path.join(OUT, `probe-report-${PARTS.join('-')}.json`), JSON.stringify(report, null, 1));
console.log('probe: done');
