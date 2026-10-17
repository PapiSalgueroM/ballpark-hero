/* Reviewer's probe for Round 1501 (runs on a runner from the repo root as .rc/x/oldsave.mjs, with the base tree
   checked out at /tmp/base by the request line). Nothing here is committed.
   A) Old saves: a save the BASE engine wrote (mid season, some mid match) opens on HEAD exactly as on BASE, for
      the raw save and three damaged variants, and then PLAYS ON identically (rest of the season, the summer,
      ten entries of the next) with the same draws. Exit 1 on any difference.
   B) Normal identity on the two job paths the harness's section 2 fleet leaves out: joinClubNow and a
      wilderness job (acceptWildernessJob), HEAD against BASE, then ten entries on.
   C) Hard on new jobs (HEAD only, same draws as Normal): joinClubNow, a wilderness job and a takeover, the
      cheque and the wage room by the dial, the opening never cut. Printed and asserted.
   D) A Hard save with a broken block keeps its level on HEAD. */
import '../../scripts/lib/seedRandom.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_ROOT = process.env.BASE_ROOT || '/tmp/base';
let failures = 0;
const fail = m => { failures += 1; console.log('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const MODS = { cm: 'clubManager', st: 'clubManagerStart', dif: 'clubManagerDifficulty', cal: 'clubManagerCalendar' };
async function bundleOf(root, name) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `rv-${name}-`));
  const entry = path.join(work, 'entry.ts');
  const lines = Object.entries(MODS).filter(([, f]) => fs.existsSync(path.join(root, `src/lib/${f}.ts`)))
    .map(([k, f]) => `export * as ${k} from ${JSON.stringify(path.join(root, `src/lib/${f}.ts`))};`);
  fs.writeFileSync(entry, lines.join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
function fresh(b) { delete req.cache[req.resolve(b)]; store.clear(); return req(b); }
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => { f.n += 1; a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.n = 0; return f;
}
function withStream(seed, fn) {
  const saved = Math.random; const r = seeded(seed); Math.random = r;
  try { return fn(); } finally { Math.random = saved; withStream.draws = r.n; }
}
const firstDiff = (a, b) => {
  const x = JSON.parse(a), y = JSON.parse(b);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) return k;
  return '(key order)';
};
/** Play on from s: the rest of the season, the summer, then `after` entries of the next. */
function playOn(m, s, after) {
  for (let g = 0; g < 200; g += 1) { const r = m.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; }
  if (s.sacked) return s;
  s = m.cm.finishSeason(s).state;
  s = m.cm.startNextSeason(s);
  for (let g = 0; g < after; g += 1) { const r = m.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (s.sacked) break; }
  return s;
}

const HEAD = await bundleOf(ROOT, 'head');
const BASE = await bundleOf(BASE_ROOT, 'base');
const probe = fresh(HEAD);
const leagues = ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1'];
const CLUBS = [];
for (const lg of leagues) {
  let list = [];
  try { list = probe.cm.playableClubs(lg); } catch { list = []; }
  if (list.length) CLUBS.push(list[1].name, list[Math.floor(list.length / 2)].name, list.at(-2).name);
}
const NCLUBS = Number(process.env.NCLUBS || 12), SEEDS = Number(process.env.SEEDS || 2);
const clubs = CLUBS.slice(0, NCLUBS);
console.log(`oldsave probe: ${clubs.length} clubs (${clubs.join(', ')}), ${SEEDS} seeds, head ${ROOT}, base ${BASE_ROOT}`);

/* ---------- A) old saves written by the base open and play on identically ---------- */
const variants = {
  raw: o => o,
  noBlock: o => { delete o.startOptions; return o; },
  broken: o => { o.startOptions = { v: 9, currency: 42 }; return o; },
  garbageLevel: o => { o.startOptions = { ...(o.startOptions ?? { v: 1 }), difficulty: 'easy' }; return o; },
};
let opened = 0, played = 0, liveSaves = 0;
for (const club of clubs) for (let seed = 0; seed < SEEDS; seed += 1) {
  const sd = 31000 + seed * 101 + clubs.indexOf(club);
  const mb = fresh(BASE);
  const n = 3 + ((seed * 13 + clubs.indexOf(club) * 7) % 30);
  const s = withStream(sd, () => {
    let x = mb.cm.startCareer(club);
    for (let g = 0; g < n; g += 1) { const r = mb.cm.playNextEntry(x, { skipHalftime: true }); x = r.state; if (r.kind === 'seasonOver' || x.sacked) break; }
    if ((seed + clubs.indexOf(club)) % 2 === 0) { const r = mb.cm.playNextEntry(x); x = r.state; }
    return x;
  });
  if (s.liveMatch || s.live) liveSaves += 1;
  mb.cm.saveCareer(s);
  const raw0 = store.get(mb.cm.SAVE_KEY);
  if (!raw0) { fail(`A ${club} seed ${seed}: the base wrote nothing`); continue; }
  for (const [vn, vf] of Object.entries(variants)) {
    const raw = JSON.stringify(vf(JSON.parse(raw0)));
    const openOn = b => {
      const m = fresh(b);
      store.set(m.cm.SAVE_KEY, raw);
      const x = m.cm.loadCareer();
      const lv = m.st.levelFrom ? m.st.levelFrom(x) : 'normal';
      const loaded = JSON.stringify(x);
      const end = x ? withStream(sd + 7, () => JSON.stringify(playOn(m, x, 10))) : 'null';
      return { loaded, end, draws: withStream.draws, lv };
    };
    const h = openOn(HEAD), b = openOn(BASE);
    const tag = `A ${club} seed ${seed} after ${n} entries, ${vn}`;
    if (h.loaded !== b.loaded) { fail(`${tag}: opens differently, first at ${h.loaded === 'null' || b.loaded === 'null' ? 'null' : firstDiff(h.loaded, b.loaded)}`); continue; }
    opened += 1;
    if (h.lv !== 'normal') fail(`${tag}: reads as ${h.lv} on head`);
    if (h.end !== b.end || h.draws !== b.draws) { fail(`${tag}: plays on differently (draws ${h.draws} vs ${b.draws}${h.end !== b.end ? `, first at ${firstDiff(h.end, b.end)}` : ''})`); continue; }
    played += 1;
  }
}
const totalA = clubs.length * SEEDS * Object.keys(variants).length;
console.log(`A) ${opened} of ${totalA} base saves open identically, ${played} play on identically (a season end, the summer, ten entries); ${liveSaves} saved with a match live`);
if (played === totalA) ok('A: every old save opens and plays on as on the base');

/* ---------- B) and C): the job paths section 2 leaves out, on Normal against the base, and on Hard ---------- */
const keyed = (s, level) => (level === 'normal' ? s : { ...s, startOptions: { ...(s.startOptions ?? { v: 1 }), difficulty: level } });
function toJoin(m, club, sd, level) {
  return withStream(sd, () => {
    let s = m.cm.startCareer(club);
    for (let g = 0; g < 6; g += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state;
    const league = m.cm.playableClubs('premier');
    const to = league.find(c => c.name !== s.clubName && c.expectation > 8 && c.expectation < 14)?.name ?? league[5].name;
    s = keyed(s, level);
    s.jobHunt = { open: { club: to, league: 'Premier League', tier: 2, season: s.season, week: s.week, matchesLeft: 0, roll: 0, status: 'accepted', decidedWeek: s.week }, cooldowns: [], sentSeason: s.season, sent: 1, summerMove: null };
    const before = { budget: s.budget, wageCap: s.wageCap, conf: s.boardConfidence };
    const j = m.cal.joinClubNow(s);
    if (!j) return { j: null };
    let x = j;
    for (let g = 0; g < 10; g += 1) { x = m.cm.playNextEntry(x, { skipHalftime: true }).state; if (x.sacked) break; }
    return { j, x, before };
  });
}
function toWild(m, club, sd, level) {
  return withStream(sd, () => {
    let s = m.cm.startCareer(club);
    for (let g = 0; g < 6; g += 1) s = m.cm.playNextEntry(s, { skipHalftime: true }).state;
    s = keyed({ ...s, sacked: true, boardConfidence: 0 }, level);
    let w = m.cm.enterWilderness(s);
    for (let g = 0; g < 40 && !(w.wilderness?.offers?.length); g += 1) w = m.cm.wildernessWeek(w);
    const offer = w.wilderness?.offers?.[0];
    if (!offer) return { j: null };
    const j = m.cm.acceptWildernessJob(w, offer.club);
    if (!j) return { j: null };
    let x = j;
    for (let g = 0; g < 10; g += 1) { x = m.cm.playNextEntry(x, { skipHalftime: true }).state; if (x.sacked) break; }
    return { j, x, club: offer.club };
  });
}
let bSame = 0, bN = 0;
const cRows = [];
for (const club of clubs.slice(0, 8)) for (const [pn, path_] of [['joinClubNow', toJoin], ['wilderness', toWild]]) {
  const sd = 41000 + clubs.indexOf(club) * 17 + (pn === 'wilderness' ? 5 : 0);
  const h = path_(fresh(HEAD), club, sd, 'normal'); const hd = withStream.draws;
  const b = path_(fresh(BASE), club, sd, 'normal'); const bd = withStream.draws;
  if (!h.j || !b.j) { console.log(`   B ${pn} ${club}: no job (${!!h.j}, ${!!b.j})`); if (!!h.j !== !!b.j) fail(`B ${pn} ${club}: a job on one tree only`); continue; }
  bN += 1;
  const jh = JSON.stringify(h.j), jb = JSON.stringify(b.j), xh = JSON.stringify(h.x), xb = JSON.stringify(b.x);
  if (jh !== jb) fail(`B ${pn} ${club}: the new job differs on Normal from the base, first at ${firstDiff(jh, jb)}`);
  else if (xh !== xb || hd !== bd) fail(`B ${pn} ${club}: ten entries on differ (draws ${hd} vs ${bd})${xh !== xb ? `, first at ${firstDiff(xh, xb)}` : ''}`);
  else bSame += 1;
  for (const level of ['hard', 'legend']) {
    const mh = fresh(HEAD);
    const D = mh.dif.CM_DIFFICULTY_DIALS[level];
    const n = path_(fresh(HEAD), club, sd, 'normal');
    const k = path_(mh, club, sd, level);
    if (!n.j || !k.j) { console.log(`   C ${pn} ${club} ${level}: no job`); continue; }
    const wantBudget = Math.round(n.j.budget * D.cheque * 10) / 10;
    const wantCap = Math.max(60, Math.round((n.j.wageCap - (n.j.founderWageRoom ?? 0)) * D.wageRoom)) + (n.j.founderWageRoom ?? 0);
    const row = `${pn} ${club} to ${k.j.clubName} ${level}: budget ${n.j.budget} -> ${k.j.budget} (dial ${wantBudget}), wage cap ${n.j.wageCap} -> ${k.j.wageCap} (dial ${wantCap}), board ${n.j.boardConfidence} -> ${k.j.boardConfidence}`;
    cRows.push(row);
    if (k.j.clubName !== n.j.clubName) fail(`C ${row}: a different club`);
    /* A wilderness job rolls through startNextSeason, where the add-ons come off after the cheque: there the
       budget only has to be lower; joinClubNow's is the dial exactly. */
    if (pn === 'joinClubNow' ? Math.abs(k.j.budget - wantBudget) > 0.11 : !(k.j.budget < n.j.budget)) fail(`C ${row}: the cheque is off the dial`);
    if (k.j.wageCap !== wantCap) fail(`C ${row}: the wage room is off the dial`);
    if (k.j.boardConfidence !== n.j.boardConfidence) fail(`C ${row}: the new job's opening moved`);
    if (mh.st.levelFrom(k.j) !== level) fail(`C ${row}: the new job lost its level`);
  }
}
console.log(`B) ${bSame} of ${bN} Normal new jobs (joinClubNow and wilderness) equal the base's, then ten entries on`);
if (bN >= 8 && bSame === bN) ok('B: Normal joinClubNow and wilderness jobs are the base, to the byte');
else if (bN < 8) fail(`B: only ${bN} jobs were reached`);
for (const r of cRows) console.log('   C ' + r);

/* ---------- C2) a takeover on Hard, the way the hook sets it up (setUpCareer on startMidSeason) ---------- */
for (const club of clubs.slice(0, 4)) for (const entry of ['autumn', 'newYear', 'runIn']) {
  const m = fresh(HEAD);
  const n = withStream(51000, () => m.cal.startMidSeason(m.cm.startCareer(club), entry));
  const m2 = fresh(HEAD);
  const k = withStream(51000, () => m2.dif.setUpCareer(m2.cal.startMidSeason(m2.cm.startCareer(club), entry), { level: 'legend' }));
  const D = m2.dif.CM_DIFFICULTY_DIALS.legend;
  const wantBudget = Math.round(n.budget * D.cheque * 10) / 10;
  const wantCap = Math.max(60, Math.round(n.wageCap * D.wageRoom));
  const row = `takeover ${club} ${entry} legend: budget ${n.budget} -> ${k.budget} (dial ${wantBudget}), cap ${n.wageCap} -> ${k.wageCap} (dial ${wantCap}), board ${n.boardConfidence} -> ${k.boardConfidence}, asks same ${JSON.stringify(n.boardObjectives) === JSON.stringify(k.boardObjectives)}`;
  console.log('   C2 ' + row);
  if (Math.abs(k.budget - wantBudget) > 0.11 || k.wageCap !== wantCap || k.boardConfidence !== n.boardConfidence) fail('C2 ' + row);
}

/* ---------- D) a Hard save whose block is damaged keeps its level on head ---------- */
{
  const m = fresh(HEAD);
  const s = withStream(61000, () => m.dif.setUpCareer(m.cm.startCareer(clubs[0]), { level: 'hard' }));
  const o = JSON.parse(JSON.stringify(s));
  o.startOptions = { ...o.startOptions, v: 7, currency: 99 };
  const m2 = fresh(HEAD);
  store.set(m2.cm.SAVE_KEY, JSON.stringify(o));
  const x = m2.cm.loadCareer();
  const lv = x ? m2.st.levelFrom(x) : null;
  if (lv !== 'hard') fail(`D: a Hard save with a broken block opens as ${lv}`);
  else ok(`D: a Hard save with a broken block opens as Hard (block ${JSON.stringify(x.startOptions)})`);
  /* and the base (an older tab) on the same save */
  const mb = fresh(BASE);
  store.set(mb.cm.SAVE_KEY, JSON.stringify(s));
  const y = mb.cm.loadCareer();
  console.log(`   D: the base opens a Hard save with startOptions ${JSON.stringify(y?.startOptions)}`);
}

console.log(failures ? `oldsave probe: ${failures} FAILURES` : 'oldsave probe: all green');
process.exit(failures ? 1 : 0);
