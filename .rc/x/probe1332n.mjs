// Round 1332 review probe (run lens, never committed). Run from the repo root on a runner:
//   PART=default node .rc/x/probe1332.mjs   the GM packs' default path, base engine against head engine, week by week
//   PART=oldsave node .rc/x/probe1332.mjs   base made desks through the head codec (whole and compact) and repair
//   PART=drift   node .rc/x/probe1332.mjs   a tagged card answered weeks after its deal, roles changing hands
// The base engine is FENCE_BASE's src/lib/gmInbox.ts swapped in at bundle time; every file it imports is unchanged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const R = ROOT.replaceAll('\\', '/');
const PART = process.env.PART || 'default';
const BASE = process.env.FENCE_BASE || '082fc277';
const baseSrc = execFileSync('git', ['show', `${BASE}:src/lib/gmInbox.ts`], { encoding: 'utf8' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probe1332-'));
async function bundle(tag, src) {
  const entry = path.join(tmp, `entry-${tag}.mjs`);
  const out = path.join(tmp, `bundle-${tag}.mjs`);
  fs.writeFileSync(entry, [`export * as engine from '${R}/src/lib/gmInbox.ts';`, `export { keyedRng } from '${R}/src/lib/keyedRng.ts';`,
    `export { GM_INBOX_PACKS } from '${R}/src/data/gmInbox/index.ts';`].join('\n'));
  const swap = { name: 'swap', setup(b) { b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]gmInbox\.ts$/ }, () => (src === null ? undefined
    : { contents: src, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') })); } };
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, plugins: [swap], absWorkingDir: ROOT });
  return import(pathToFileURL(out).href);
}
const H = await bundle('head', null);
const Bs = await bundle('base', baseSrc);
const EH = H.engine;
const EB = Bs.engine;
const { keyedRng } = H;
const PACKS = H.GM_INBOX_PACKS;
if (!EB.gmInboxWeek || EB.gmDeskSave) { console.error('the base bundle is not the base engine, refusing'); process.exit(2); }
if (!EH.gmDeskSave) { console.error('the head bundle has no codec, refusing'); process.exit(2); }

const clamp100 = v => Math.max(0, Math.min(100, v));
const newDesk = () => ({ morale: 50, trust: 50, fans: 50, cash: 10, year: 2030, recruit: 50, out: {}, rating: {} });
const BINDING = {
  moodOf: s => s.trust, setMood: (s, v) => { s.trust = v; },
  addPopularity: (s, d) => { s.fans = clamp100(s.fans + d); },
  addCash: (s, a) => { s.cash = Math.round((s.cash + a) * 1000) / 1000; },
  yearOf: s => s.year,
  setOut: (s, who, w) => { s.out[who] = (s.out[who] ?? 0) + w; },
  addRating: (s, who, d) => { s.rating[who] = (s.rating[who] ?? 0) + d; },
  addRecruit: (s, d) => { s.recruit += d; },
};
const draw = (spec, rng) => (spec.kind === 'bool' ? rng() < spec.p : Math.round((spec.min + rng() * (spec.max - spec.min)) * 100) / 100);
const factsOf = (pack, per, base, rng) => {
  const out = { ...base };
  for (const [k, spec] of Object.entries(pack.facts)) if (spec.per === per) out[k] = draw(spec, rng);
  return out;
};
const openOf = s => (s.phoneInbox ?? []).filter(m => m.answered === undefined);
const J = x => JSON.stringify(x);
let bad = 0;
const fail = m => { bad++; if (bad <= 12) console.error(`   FAIL ${m}`); };

/* Drive one desk on one engine, return every week's state and returns. Policy: each open card answered
   with probability pAns on a random option; fallen desks hand in the week of the season. */
function drive(E, pack, seed, d, { fallen, pAns, keep }) {
  const seat = E.bindGmInbox(pack, BINDING);
  const weeks = E.gmSeasonWeeks(pack);
  const key = `probe1332|${pack.seat}|${seed}|${d}`;
  const fr = keyedRng(`${key}|facts`); const dr = keyedRng(`${key}|deck`); const ar = keyedRng(`${key}|answer`);
  const s = newDesk();
  const log = [];
  const states = [];
  let clock = 0;
  for (let season = 0; season < 10; season++) {
    s.year = 2030 + season;
    const sf = factsOf(pack, 'season', {}, fr);
    for (let w = 0; w < weeks.length; w++) {
      const facts = factsOf(pack, 'week', sf, fr);
      const settled = [];
      const got = E.gmInboxWeek(s, seat, weeks[w], facts, fallen ? w : clock, dr, settled);
      const lines = [];
      for (const m of openOf(s)) if (ar() < pAns) lines.push(E.answerGmInbox(s, m.id, Math.floor(ar() * m.choices.length), seat));
      log.push(J([got, settled, lines, s]));
      if (keep && clock % 7 === 0) states.push(JSON.parse(J(s)));
      clock++;
    }
  }
  return { log, states };
}

if (PART === 'default') {
  let weeks = 0, desks = 0, deals = 0;
  for (const [k, pack] of Object.entries(PACKS)) {
    for (const seed of [4, 5, 6]) for (let d = 0; d < 40; d++) {
      const opt = { fallen: d % 4 === 3, pAns: [0.15, 0.5, 0.9][d % 3] };
      const a = drive(EB, pack, seed, d, opt).log;
      const b = drive(EH, pack, seed, d, opt).log;
      desks++;
      for (let i = 0; i < a.length; i++) { weeks++; if (a[i] !== b[i]) { fail(`${k} seed ${seed} desk ${d} week ${i}: head differs from base`); break; } }
      deals += a.reduce((n, l) => n + JSON.parse(l)[0].length, 0);
    }
    for (const e of pack.events) for (const c of e.choices) {
      if (J(EB.choiceEffects(c, pack)) !== J(EH.choiceEffects(c, pack))) fail(`${k}/${e.id}: choiceEffects differs`);
      if (EB.gmChoiceLabel(c, pack) !== EH.gmChoiceLabel(c, pack)) fail(`${k}/${e.id}: gmChoiceLabel differs`);
    }
    if (J(EB.gmPackProblems(pack)) !== J(EH.gmPackProblems(pack))) fail(`${k}: gmPackProblems differs`);
    for (const e of pack.events) if (EB.gmNeutralIndex(e.choices) !== EH.gmNeutralIndex(e.choices)) fail(`${k}/${e.id}: gmNeutralIndex differs`);
  }
  console.log(`default path: 7 GM packs, ${desks} desks, ${weeks} weeks, ${deals} deals compared base engine against head engine`);
  console.log(bad ? `probe default: RED, ${bad} differences` : 'probe default: green, every week byte equal (state, deals, settled list, answer lines)');
  process.exit(bad ? 1 : 0);
}

const FIELDS = ['phoneInbox', 'phoneUsedIds', 'gmInboxLast', 'gmInboxRest'];
/* Twenty more weeks of one desk from a saved state, on one engine. */
function goOn(E, pack, s0, tag) {
  const s = JSON.parse(J(s0));
  const seat = E.bindGmInbox(pack, BINDING);
  const weeks = E.gmSeasonWeeks(pack);
  const fr = keyedRng(`${tag}|facts`); const dr = keyedRng(`${tag}|deck`); const ar = keyedRng(`${tag}|answer`);
  const out = [];
  for (let i = 0; i < 20; i++) {
    const facts = factsOf(pack, 'week', factsOf(pack, 'season', {}, fr), fr);
    const settled = [];
    const got = E.gmInboxWeek(s, seat, weeks[i % weeks.length], facts, 1000 + i, dr, settled);
    const lines = [];
    for (const m of openOf(s)) if (ar() < 0.5) lines.push(E.answerGmInbox(s, m.id, Math.floor(ar() * m.choices.length), seat));
    out.push(J([got, settled, lines, s]));
  }
  return out;
}
if (PART === 'oldsave') {
  let n = 0, cont = 0, compactDiff = 0, foreignLost = 0;
  for (const [k, pack] of Object.entries(PACKS)) {
    const cpack = { ...pack, store: 'compact' };
    for (let d = 0; d < 12; d++) {
      const { states } = drive(EB, pack, 7, d, { fallen: d % 4 === 3, pAns: 0.5, keep: true });
      for (const [i, st] of states.entries()) {
        n++;
        if (J(EB.repairGmInbox(JSON.parse(J(st)))) !== J(EH.repairGmInbox(JSON.parse(J(st))))) fail(`${k} desk ${d} state ${i}: repairGmInbox differs`);
        const w = EH.gmDeskLoad(JSON.parse(J(EH.gmDeskSave(st, pack))), pack);
        for (const f of FIELDS) if (J(w.host[f]) !== J(st[f])) fail(`${k} desk ${d} state ${i}: whole codec changes ${f}`);
        if (w.dropped) fail(`${k} desk ${d} state ${i}: whole codec dropped ${w.dropped}`);
        const c = EH.gmDeskLoad(JSON.parse(J(EH.gmDeskSave(st, cpack))), cpack);
        for (const f of FIELDS) if (J(c.host[f]) !== J(st[f])) { compactDiff++; if (compactDiff <= 3) console.log(`   note: compact codec on a base desk changes ${f} (${k} desk ${d} state ${i})`); }
        const withForeign = { ...st, phoneUsedIds: [...(st.phoneUsedIds ?? []), 'another_system_once'] };
        const cf = EH.gmDeskLoad(JSON.parse(J(EH.gmDeskSave(withForeign, cpack))), cpack);
        if (!(cf.host.phoneUsedIds ?? []).includes('another_system_once')) foreignLost++;
        if (i % 5 === 0) {
          cont++;
          const a = goOn(EB, pack, st, `probe1332|cont|${k}|${d}|${i}`);
          const b = goOn(EH, pack, st, `probe1332|cont|${k}|${d}|${i}`);
          if (a.some((x, j) => x !== b[j])) fail(`${k} desk ${d} state ${i}: a base save played on by the head deals differently`);
        }
      }
    }
  }
  console.log(`old saves: ${n} base made desk states, each repaired on both engines and through the head codec (whole and compact); ${cont} played on 20 weeks on both engines`);
  console.log(`   compact codec on base desks: ${compactDiff} field differences (a base message has no t, so it stays whole); a one shot id the pack does not know: lost on ${foreignLost} of ${n} compact loads`);
  console.log(bad ? `probe oldsave: RED, ${bad} failures` : 'probe oldsave: green');
  process.exit(bad ? 1 : 0);
}

if (PART === 'drift') {
  /* Two tagged cards about a role, each with an option that moves that role's man. The squad: twelve
     placeholder men, about half marked real; the three roles change hands every season, as in the kit's
     FX_CONDUCT fleet. The only difference from the kit: a card is answered DELAY weeks after it lands
     (0 to 7, drawn at the deal), the way a player leaves a card open, instead of the week it lands. */
  const ch = (label, extra = {}) => ({ label, reply: `${label}.`, karma: 0, ...extra });
  const DRIFT = {
    seat: 'drift', label: 'drift', calendar: [{ id: 'a', label: 'Season', emoji: 'x' }], span: { a: 20 },
    facts: { man: { kind: 'num', min: 1, max: 3, per: 'week' } },
    targets: { captain: 'Your captain', keeper: 'Your keeper', striker: 'Your striker' },
    meters: { trust: 'Board trust', fans: 'Fans', money: 'Budget', morale: 'Dressing room' }, money: { prefix: '$', suffix: 'M' },
    perWeek: 1, cooldown: 0, chance: 0.5,
    events: [
      { id: 'c_curfew', beat: 'a', from: 'Your assistant', emoji: 'x', tag: 'conduct', subject: 'striker', text: 'Your striker broke the team curfew on Tuesday night.',
        choices: [ch('Suspend him', { fx: { ban: { who: 'striker', v: 1 } } }), ch('Let it go')] },
      { id: 'p_home', beat: 'a', from: 'Your assistant', emoji: 'x', tag: 'private', subject: 'keeper', text: 'Your keeper has asked for a few days at home.',
        choices: [ch('Give him the days', { out: { who: 'keeper', weeks: 1 } }), ch('Not this week', { rating: { who: 'keeper', delta: -1 } }), ch('Leave it for now')] },
    ],
  };
  const roles = Object.keys(DRIFT.targets);
  const manOf = (s, role) => 1 + ((s.year * 3 + roles.indexOf(role) * 5 + s.desk) % 12);
  const person = (s, ref) => {
    const id = 'role' in ref ? (roles.includes(ref.role) ? manOf(s, ref.role) : NaN) : Number(ref.id);
    return Number.isInteger(id) && id >= 1 && id <= 12 ? { name: `Player ${id}`, real: s.real[id] } : null;
  };
  /* The registered key and the built ins record which MAN they landed on, as a binding would. */
  const fx = { ban: { label: 'suspended', fmt: 'weeks', who: true, apply: (s, v, who) => { s.hits.push(['ban', manOf(s, who)]); }, read: () => 0 } };
  const bind = { ...BINDING, fx, person,
    setOut: (s, who, w) => { s.hits.push(['out', manOf(s, who)]); }, addRating: (s, who, d) => { s.hits.push(['rating', manOf(s, who)]); } };
  for (const delayMax of [0, 7]) {
    const seat = EH.bindGmInbox(DRIFT, bind);
    let dealt = 0, applied = 0, onReal = 0;
    const examples = [];
    for (let d = 0; d < 100; d++) {
      const rng = keyedRng(`probe1332|drift|${d}|deck`); const ar = keyedRng(`probe1332|drift|${d}|answer`);
      const s = { ...newDesk(), desk: d, hits: [], real: Array.from({ length: 13 }, (_, i) => i > 0 && keyedRng(`probe1332|squad|${d}|${i}`)() < 0.5) };
      const due = new Map();
      for (let t = 0; t < 200; t++) {
        s.year = 2030 + Math.floor(t / 20);
        for (const m of EH.gmInboxWeek(s, seat, 'a', { man: 1 }, t, rng)) { dealt++; due.set(m.id, t + Math.floor(ar() * (delayMax + 1))); }
        for (const m of openOf(s)) {
          if ((due.get(m.id) ?? 0) > t) continue;
          const before = s.hits.length;
          if (EH.answerGmInbox(s, m.id, 0, seat) === null) continue;
          for (const [what, man] of s.hits.slice(before)) {
            applied++;
            if (s.real[man]) { onReal++; if (examples.length < 3) examples.push(`desk ${d}: ${m.id} (dealt ${m.id.split('-w')[1]}) answered week ${t}, ${what} landed on Player ${man}, marked real`); }
          }
        }
      }
    }
    console.log(`drift, answers 0 to ${delayMax} weeks after the deal: ${dealt} tagged cards dealt (every one held unless its man was generated at the deal), ${applied} effects applied, ${onReal} of them on a man marked real`);
    for (const x of examples) console.log(`   ${x}`);
    if (delayMax === 0 && onReal > 0) fail('the same week answers put an effect on a real man: the probe is wrong');
    if (delayMax === 7 && onReal > 0) fail(`a conduct or private card's effect reached a real man ${onReal} times once answers wait: gmCardSafe holds at the deal only, answerGmInbox never asks again`);
  }
  console.log(bad ? `probe drift: RED, ${bad} failures` : 'probe drift: green, no effect of a tagged card reached a real man');
  process.exit(bad ? 1 : 0);
}
console.error(`PART=${PART} is not a part of this probe`);
process.exit(2);
