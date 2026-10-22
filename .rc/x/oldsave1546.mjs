// Review probe for Round 1546 (never committed). Usage on the runner, from the repo root:
//   git worktree add /tmp/base e3deb2cb && node .rc/x/oldsave1546.mjs /tmp/base
// 1 Fight Career: careers played on MAIN to fight k and saved, then loaded on main and on the
//   branch and played on with the same choices: the loaded state must be byte identical, and the
//   rest of the career identical except the ids of men minted after the load.
// 2 Fight Gym and Fight Promoter: saves played on MAIN in one page load (no duplicate possible)
//   load on the branch byte for byte.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE = process.argv[2];
if (!BASE || !fs.existsSync(path.join(BASE, 'src/lib/fightCareer.ts'))) { console.log('ABORT no base checkout'); process.exit(2); }
const ESB = path.resolve('node_modules/.bin/esbuild');
const FILES = ['careerEngine', 'fightCareer', 'fightCareerLife', 'fightCareerLifeFlow', 'fightCareerInbox',
  'fightCareerRivalry', 'fightCareerMoney', 'careerInbox', 'careerRivalryEvents', 'careerRivalryChoices',
  'careerBadges', 'keyedRng', 'fightGym', 'fightPromoter'];
async function load(root, tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `old1546-${tag}-`));
  for (const n of FILES) {
    const p = path.join(root, 'src/lib', `${n}.ts`);
    if (!fs.existsSync(p)) { console.log(`ABORT ${tag} lacks ${n}.ts`); process.exit(2); }
    fs.writeFileSync(path.join(dir, `${n}.ts`), fs.readFileSync(p, 'utf8').replaceAll('@/lib/', './'));
  }
  fs.writeFileSync(path.join(dir, 'entry.ts'), ["export * as fc from './fightCareer';", "export * as fl from './fightCareerLife';",
    "export * as ff from './fightCareerLifeFlow';", "export * as fi from './fightCareerInbox';", "export * as fr from './fightCareerRivalry';",
    "export * as gym from './fightGym';", "export * as pro from './fightPromoter';", ''].join('\n'));
  const out = path.join(dir, 'bundle.mjs');
  execSync(`"${ESB}" "${path.join(dir, 'entry.ts')}" --bundle --format=esm --platform=node --outfile="${out}"`, { stdio: 'pipe' });
  return import(pathToFileURL(out).href);
}
const MAIN = await load(BASE, 'main');
const HEAD = await load(process.cwd(), 'head');

const STY = ['outboxer', 'swarmer', 'slugger', 'counter'];
const TAC = ['box', 'press', 'counter', 'brawl'];
const WTS = ['fly', 'light', 'welter', 'middle', 'heavy'];
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const line = (E, style, n) => { const o = []; let ex = style; for (let i = 0; i < n; i += 1) { const t = TAC.find(x => E.fc.tacticEdge(x, ex) > 0) || 'box'; o.push(t); ex = STY.find(s => E.fc.tacticEdge(t, s) < 0) || style; } return o; };
const pick = (offers, st) => (st.champion || st.fighter.rank <= 1 ? offers[1] : st.fightNo < 6 ? offers[0] : (st.fighter.rank === 99 ? 20 : st.fighter.rank) > 8 ? offers[1] : offers[2]);
function clearGap(E, st0) {
  let st = st0;
  for (let g = 0; g < 24; g += 1) {
    const step = E.ff.nextLifeStep(st);
    if (!step) break;
    if (step.kind === 'beat') st = E.fr.dismissFightRivalryEvent(st) ?? st;
    else if (step.kind === 'choice') st = E.fr.answerFightRivalryChoice(st, E.fr.neutralRivalryChoice(step.card.id))?.state ?? st;
    else st = E.fl.answerLifeCard(st, step.card.options.findIndex(o => o.neutral))?.state ?? st;
  }
  for (const m of st.life.phoneInbox.filter(x => x.answered === undefined)) st = E.ff.lifeAnswerInbox(st, m.id, E.fi.neutralInboxChoice(m)) ?? st;
  return st;
}
function fight(E, st) {
  st = clearGap(E, st);
  const o = pick(st.offers, st);
  if (!o) return null;
  const r = E.ff.lifeTakeFight(E.ff.lifeRunCamp(st, PLAN), o.id, line(E, o.opponent.style, o.rounds));
  return r ? r.state : null;
}
/* Every man's id dropped, so main's f-ids and the branch's drawn ids compare as the same man. */
const noIds = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) && 'attrs' in v ? { ...v, id: undefined } : v));

let careers = 0, loadDiff = 0, playDiff = 0, verdictDiff = 0, retiredOld = 0, fights = 0;
for (let i = 0; i < 160; i += 1) {
  const seed = 70000 + i * 53;
  const w = WTS[i % 5];
  let st = MAIN.ff.lifeNewCareer(`Old ${seed}`, w, STY[i % 4], 'allround', 'family', `old-${seed}`);
  const k = i % 30;
  for (let n = 0; n < k && !st.retired; n += 1) { const nx = fight(MAIN, st); if (!nx) break; st = nx; }
  const text = JSON.stringify({ st, phase: 'hub' });
  const a = MAIN.ff.lifeLoadState(JSON.parse(text).st);
  const b = HEAD.ff.lifeLoadState(JSON.parse(text).st);
  careers += 1;
  if (JSON.stringify(a) !== JSON.stringify(b)) loadDiff += 1;
  if (a.retired) retiredOld += 1;
  let x = a, y = b;
  for (let n = 0; n < 40 && !x.retired && !y.retired; n += 1) {
    const nx = fight(MAIN, x); const ny = fight(HEAD, y);
    if (!nx || !ny) break;
    x = nx; y = ny; fights += 1;
  }
  if (noIds(x) !== noIds(y)) playDiff += 1;
  const vx = MAIN.fc.legacyOf(x); const vy = HEAD.fc.legacyOf(y);
  if (JSON.stringify(vx) !== JSON.stringify(vy)) verdictDiff += 1;
}
console.log(`1 Fight Career: ${careers} main saves (${retiredOld} already retired), ${fights} fights played on after the load`);
console.log(`  loaded differently on the branch ${loadDiff}, played on differently beyond the ids ${playDiff}, verdict differs ${verdictDiff}`);

let gyms = 0, gymDiff = 0, promos = 0, promoDiff = 0;
for (let s = 0; s < 60; s += 1) {
  let g = MAIN.gym.newGym(`Old Clean Gym ${s}`);
  for (let w = 1; w <= 15 && !g.closed; w += 1) {
    g = { ...g, money: Math.max(g.money, 2) };
    if (g.roster.length < 6 && g.prospects.length) g = MAIN.gym.signProspect(g, g.prospects[w % g.prospects.length].id) ?? g;
    const f = g.roster[w % g.roster.length];
    if (f && f.damage < 60) { const of = MAIN.gym.offersForFighter(g, f.id); if (of.length) g = MAIN.gym.takeGymFight(g, f.id, of[0], TAC.slice(0, 3))?.state ?? g; }
    g = MAIN.gym.advanceWeek(g);
  }
  const t = JSON.stringify({ g });
  gyms += 1;
  if (JSON.stringify(HEAD.gym.sanitizeGym(JSON.parse(t).g)) !== JSON.stringify(MAIN.gym.sanitizeGym(JSON.parse(t).g))) gymDiff += 1;
  let p = MAIN.pro.newPromoter(`Old Clean Promotions ${s}`);
  for (let sh = 1; sh <= 8 && !p.closed; sh += 1) {
    p = { ...p, money: Math.max(p.money, 2) };
    const bookings = [];
    const used = new Set();
    for (let a = 0; a < p.pool.length && bookings.length < 3; a += 1) {
      if (used.has(a)) continue;
      for (let b = a + 1; b < p.pool.length; b += 1) if (!used.has(b) && MAIN.pro.legalMatch(p.pool[a], p.pool[b])) { used.add(a); used.add(b); bookings.push({ aId: p.pool[a].id, bId: p.pool[b].id, rounds: 6, title: false }); break; }
    }
    if (!bookings.length) break;
    p = MAIN.pro.runShow(p, { venueId: 'hall', ticketPrice: 0.00006, bookings }, TAC.slice(0, 3))?.state ?? p;
  }
  const tp = JSON.stringify({ st: p });
  promos += 1;
  if (JSON.stringify(HEAD.pro.sanitizePromoter(JSON.parse(tp).st)) !== JSON.stringify(MAIN.pro.sanitizePromoter(JSON.parse(tp).st))) promoDiff += 1;
}
console.log(`2 Fight Gym: ${gyms} main saves, loaded differently on the branch ${gymDiff}; Fight Promoter: ${promos} main saves, loaded differently ${promoDiff}`);
const bad = loadDiff + playDiff + verdictDiff + gymDiff + promoDiff;
if (fights < 1000) { console.log(`oldsave1546: ABORT too few fights (${fights})`); process.exit(2); }
console.log(bad ? `oldsave1546: ${bad} differences` : 'oldsave1546: old saves load and play on unchanged');
process.exit(bad ? 1 : 0);
