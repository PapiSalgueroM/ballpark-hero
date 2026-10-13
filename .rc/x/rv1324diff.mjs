// Reviewer's differential fuzz for Round 1324 (runs on the GitHub runner from the repo root).
// The base engine (8fea14e2's src/lib/gmInbox.ts, written to a temp src file, bundled, then deleted) and the head
// engine are driven in lockstep from equal states with equal rng streams, over packs built ONLY from base fields
// (perWeek, chance, cooldown, oneShot, per event chance and cooldown, event subsets) and hostile drives (falling,
// repeated and jumping clocks, unknown beats, missing and mistyped facts, out of range answers, JSON reloads with
// repairGmInbox). Group A: base fields only, every week byte equal (state JSON, the fresh list, rng calls, answer
// lines). Group B: the head pack also carries INERT new fields (every card weight W, clock 'week', subjectRest 0,
// role subjects): byte equal. Group C: head pack with texts: equal except the text, same rng calls.
// Group D: an old save (base state at a random week) continued on the head equals continuing on the base.
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const BASE = process.env.RV_BASE || '8fea14e2';
const DESKS = Number(process.env.RV_DESKS || 120);
const WEEKS = Number(process.env.RV_WEEKS || 260);
execFileSync('git', ['diff', '--quiet', BASE, 'HEAD', '--', 'src/lib/careerInbox.ts', 'src/lib/keyedRng.ts', 'src/data/gmInbox']);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rvdiff-'));
const baseSrc = path.join(ROOT, 'src/lib/__rvBaseGmInbox.ts');
fs.writeFileSync(baseSrc, execFileSync('git', ['show', `${BASE}:src/lib/gmInbox.ts`], { encoding: 'utf8' }));
const bundle = async (entry, name) => {
  const out = path.join(tmp, `${name}.mjs`);
  await build({ entryPoints: [path.join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  return import(pathToFileURL(out).href);
};
let H, Bs, P;
try {
  Bs = await bundle('src/lib/__rvBaseGmInbox.ts', 'base');
  H = await bundle('src/lib/gmInbox.ts', 'head');
  P = (await bundle('src/data/gmInbox/index.ts', 'packs')).GM_INBOX_PACKS;
} finally { fs.rmSync(baseSrc); }
const mul = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (r, a) => a[Math.floor(r() * a.length)];
const BIND = {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; }, addPopularity: (s, d) => { s.fans = Math.max(0, Math.min(100, s.fans + d)); },
  addCash: (s, a) => { s.cash = Math.round((s.cash + a) * 1000) / 1000; }, yearOf: s => s.year,
  setOut: (s, w, n) => { s.out[w] = (s.out[w] ?? 0) + n; }, addRating: (s, w, d) => { s.rating[w] = (s.rating[w] ?? 0) + d; }, addRecruit: (s, d) => { s.recruit += d; },
};
const basePack = (p, r) => {
  const evs = p.events.filter(() => r() < 0.85).map(e => {
    const x = { ...e };
    if (r() < 0.2) x.oneShot = true;
    if (r() < 0.25) x.cooldown = pick(r, [0, 1, 2, 5]);
    if (r() < 0.2) x.chance = pick(r, [0.2, 0.7, 1]);
    return x;
  });
  if (r() < 0.5) evs.reverse();
  return { ...p, perWeek: pick(r, [p.perWeek, 1, 2, 3, 4]), chance: pick(r, [p.chance, 0.3, 0.9, 1]), cooldown: pick(r, [p.cooldown, 0, 1, 3]), events: evs.length ? evs : p.events };
};
const inert = (p, r) => {
  const W = pick(r, [1, 2.5, 7]);
  const tk = Object.keys(p.targets);
  return { ...p, clock: 'week', subjectRest: 0, events: p.events.map(e => ({ ...e, weight: W, ...(tk.length && r() < 0.5 ? { subject: pick(r, tk) } : {}) })) };
};
const withTexts = p => ({ ...p, events: p.events.map(e => ({ ...e, texts: ['Another way to say it.', 'A third way.'] })) });
const factsFor = (p, r) => {
  const f = {};
  for (const [k, sp] of Object.entries(p.facts)) {
    const x = r();
    if (x < 0.05) continue;
    if (x < 0.08) { f[k] = pick(r, ['7', true, -3, 'yes']); continue; }
    f[k] = sp.kind === 'bool' ? r() < sp.p : Math.round((sp.min + r() * (sp.max - sp.min)) * 100) / 100;
  }
  return f;
};
const newDesk = () => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} });
let weeks = 0; let diffs = 0; let deals = 0; let fell = 0; let reloads = 0; let answers = 0; const first = [];
const note = m => { diffs++; if (first.length < 12) first.push(m); };
const strip = s => JSON.stringify({ ...s, phoneInbox: (s.phoneInbox ?? []).map(m => ({ ...m, text: '' })) });
const corrupt = (o, r) => {
  const k = Math.floor(r() * 4);
  if (k === 0) o.gmInboxLast = 'junk';
  else if (k === 1) o.phoneUsedIds = [1];
  else if (k === 2 && o.phoneInbox && o.phoneInbox.length) delete o.phoneInbox[0].from;
  else o.gmInboxLast = { ...(o.gmInboxLast ?? {}), bent: 'x' };
  return o;
};
const byGroup = {};
function lockstep(tag, group, pb, ph, seed, switchAt) {
  const g = (byGroup[group] ??= { desks: 0, weeks: 0, deals: 0, diffs: 0 });
  g.desks++;
  const r = mul(seed);
  const rb = mul(seed ^ 0x5bd1e995); const rh = mul(seed ^ 0x5bd1e995);
  let cb = 0; let ch = 0;
  const db = () => { cb++; return rb(); }; const dh = () => { ch++; return rh(); };
  const sb = Bs.bindGmInbox(pb, BIND);
  const sh = H.bindGmInbox(ph, { ...BIND, keyOf: () => `key${seed}` });
  const sbh = Bs.bindGmInbox(pb, BIND);
  const wk = H.gmSeasonWeeks(ph);
  let a = newDesk(); let b = newDesk();
  let clock = 0;
  for (let i = 0; i < WEEKS; i++) {
    const x = r();
    if (x < 0.06) { clock = Math.floor(r() * clock); fell++; } else if (x < 0.1) { /* the same clock again */ } else if (x < 0.12) clock += 1 + Math.floor(r() * 30); else clock++;
    if (r() < 0.04) { a.year++; b.year++; }
    const beat = r() < 0.05 ? 'nope' : wk[i % wk.length];
    const f = factsFor(ph, r);
    const onHead = group !== 'D' || i >= switchAt;
    const ga = Bs.gmInboxWeek(a, sb, beat, f, clock, db);
    const gb = onHead ? H.gmInboxWeek(b, sh, beat, f, clock, dh) : Bs.gmInboxWeek(b, sbh, beat, f, clock, dh);
    weeks++; g.weeks++; deals += ga.length; g.deals += ga.length;
    const eq = group === 'C' ? strip(a) === strip(b) : JSON.stringify(a) === JSON.stringify(b);
    const fq = group === 'C' ? JSON.stringify(ga.map(m => ({ ...m, text: '' }))) === JSON.stringify(gb.map(m => ({ ...m, text: '' }))) : JSON.stringify(ga) === JSON.stringify(gb);
    if (!eq || !fq || cb !== ch) { g.diffs++; note(`${tag} group ${group} desk seed ${seed} week ${i} clock ${clock}: state ${eq ? 'equal' : 'DIFFERS'}, fresh ${fq ? 'equal' : 'DIFFERS'}, draws ${cb}/${ch}`); return; }
    for (const m of (a.phoneInbox ?? []).filter(m => m.answered === undefined)) {
      if (r() < 0.4) continue;
      const idx = Math.floor(r() * (m.choices.length + 2)) - 1;
      const la = Bs.answerGmInbox(a, m.id, idx, sb);
      const lb = onHead ? H.answerGmInbox(b, m.id, idx, sh) : Bs.answerGmInbox(b, m.id, idx, sbh);
      answers++;
      if (la !== lb) { g.diffs++; note(`${tag} group ${group} seed ${seed} week ${i}: answer line ${la} vs ${lb}`); return; }
    }
    if (r() < 0.05) {
      reloads++;
      const ja = JSON.parse(JSON.stringify(a)); const jb = JSON.parse(JSON.stringify(b));
      if (r() < 0.2) { const cr = mul(seed + i); corrupt(ja, cr); corrupt(jb, mul(seed + i)); }
      a = Bs.repairGmInbox(ja); b = onHead ? H.repairGmInbox(jb) : Bs.repairGmInbox(jb);
      const eq2 = group === 'C' ? strip(a) === strip(b) : JSON.stringify(a) === JSON.stringify(b);
      if (!eq2) { g.diffs++; note(`${tag} group ${group} seed ${seed} week ${i}: repair differs`); return; }
    }
  }
}
const T0 = Date.now();
for (const [k, p] of Object.entries(P)) {
  for (let d = 0; d < DESKS; d++) {
    const seed = (d * 2654435761 + k.length * 97 + k.charCodeAt(0) * 7919) >>> 0;
    const r0 = mul(seed + 1);
    const pb = basePack(p, r0);
    const group = 'ABCD'[d % 4];
    const ph = group === 'B' ? inert(pb, r0) : group === 'C' ? withTexts(pb) : pb;
    lockstep(k, group, pb, ph, seed, Math.floor(r0() * WEEKS));
  }
}
for (const m of first) console.log(`   ${m}`);
for (const [g, v] of Object.entries(byGroup)) console.log(`group ${g}: ${v.desks} desks, ${v.weeks} weeks, ${v.deals} deals, ${v.diffs} desks that differed`);
console.log(`rv1324diff: ${weeks} weeks, ${deals} deals, ${fell} falling clocks, ${answers} answers tried, ${reloads} reloads, ${((Date.now() - T0) / 1000).toFixed(1)} s`);
const vacuous = deals < 10000 || fell < 100 || reloads < 100 || answers < 1000;
if (vacuous) console.log('rv1324diff: VACUOUS, the drive did not exercise the engine');
console.log(diffs || vacuous ? `rv1324diff: RED, ${diffs} desks differed between the base and the head` : 'rv1324diff: green, the head is byte equal to the base on every drive');
process.exit(diffs || vacuous ? 1 : 0);
