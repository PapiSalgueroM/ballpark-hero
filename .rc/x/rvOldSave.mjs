// Reviewer probe (rBVG-cm-bv): an old Club Manager save made by the BASE engine (19911f815, Release BU, before Rounds
// 1603, 1593 and 1600) loads on the joined head and keeps its own men's numbers; a new career on the head shows the
// veterans' new levels (Messi 86, Ronaldo 86, Modric 80, What's New); the old save's market reads the new numbers
// (the round's stated design). Two clubs: AC Milan (Modric in MY squad) and Everton (a plain club), each saved
// mid season one and again at the start of season two. Exit 0 all held, 1 a finding, 2 could not run.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';

const ROOT = process.cwd();
const cannot = why => { console.log(`rvOldSave could not run: ${why}`); process.exit(2); };
const B = await engineOf(ROOT, 'base', { base: '19911f815' }, cannot);
const H = await engineOf(ROOT, 'head', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
let bad = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) bad += 1; };
const VETS = [['Lionel Messi', 86], ['Cristiano Ronaldo', 86], ['Luka Modri', 80]];
const findIn = (list, n) => list.find(p => (p.name ?? p.n ?? '').startsWith(n));

async function one(club, label, toSeasonTwo) {
  const MB = await B.fresh();
  let s = tape(0x1600 + club.length, () => MB.cm.startCareer(club)).value;
  const stop = toSeasonTwo ? 400 : 18;
  for (let i = 0; i < stop && s.week < s.calendar.length; i += 1) s = tape(0x16a0 + i, () => MB.cm.playNextEntry(s, opts)).value.state;
  if (toSeasonTwo) {
    const fin = tape(0x16b0, () => MB.cm.finishSeason(s)).value.state;
    s = tape(0x16b1, () => MB.cm.startNextSeason(fin)).value;
    for (let i = 0; i < 6; i += 1) s = tape(0x16c0 + i, () => MB.cm.playNextEntry(s, opts)).value.state;
  }
  MB.store.clear();
  if (!MB.cm.saveCareer(s)) cannot(`${label}: the base engine refused to save`);
  const entries = [...MB.store.entries()];
  const MH = await H.fresh();
  for (const [k, v] of entries) MH.store.set(k, v);
  const L = MH.cm.loadCareer();
  ok(!!L, `${label}: the base save opens on the head`);
  if (!L) return;
  const by = new Map(s.squad.map(p => [p.id, p]));
  const moved = L.squad.filter(p => { const o = by.get(p.id); return !o || o.rating !== p.rating || o.age !== p.age || o.value !== p.value || o.potential !== p.potential; });
  ok(L.squad.length === s.squad.length && moved.length === 0,
    `${label}: my ${s.squad.length} men keep their saved numbers on load (${moved.length} moved${moved.length ? ': ' + moved.slice(0, 4).map(p => `${p.name} ${by.get(p.id)?.rating}->${p.rating}`).join(', ') : ''})`);
  const mod = findIn(L.squad, 'Luka Modri');
  if (mod) console.log(`   ${label}: Modric in my squad, base save ${findIn(s.squad, 'Luka Modri')?.rating}, loaded on the head ${mod.rating}`);
  let p = L;
  let err = null;
  try { for (let i = 0; i < 6; i += 1) p = tape(0x16d0 + i, () => MH.cm.playNextEntry(p, opts)).value.state; } catch (e) { err = e; }
  ok(!err, `${label}: six more entries play on the head${err ? `: ${err.message}` : ''}`);
  const uel = p.worldComps?.uel;
  console.log(`   ${label}: season ${p.season} week ${p.week}; uel slice ${uel ? `me ${uel.me ?? 'none'} s ${uel.s}` : 'none'}; my uel entries ${(p.calendar ?? []).filter(e => e.type === 'uel').length}; tieRules ${p.tieRules ?? 'none'}`);
  const market = MH.cm.marketForScreen(p);
  for (const [n, want] of VETS) {
    const m = findIn(market, n);
    console.log(`   ${label}: market ${n}: ${m ? `${m.rating} at ${m.club}, ${m.age}y` : 'not on the market'}`);
  }
}

await one('AC Milan', 'AC Milan mid season one', false);
await one('Everton', 'Everton mid season one', false);
await one('AC Milan', 'AC Milan season two', true);

const MN = await H.fresh();
const fresh = tape(0x1601, () => MN.cm.startCareer('Everton')).value;
const market = MN.cm.marketForScreen(fresh);
for (const [n, want] of VETS) {
  const m = findIn(market, n);
  ok(m && m.rating === want, `new 2026-27 career: market ${n} ${m ? `${m.rating} at ${m.club}, ${m.age}y` : 'not on the market'}, What's New says ${want}`);
}
const milan = tape(0x1602, () => MN.cm.startCareer('AC Milan')).value;
const mm = findIn(milan.squad, 'Luka Modri');
ok(mm && mm.rating === 80, `new AC Milan career: Modric in my squad ${mm ? mm.rating : 'absent'}`);
console.log(`rvOldSave ${bad ? 'RED' : 'GREEN'}: ${bad} findings`);
process.exit(bad ? 1 : 0);
