/* Reviewer's old saves check for Round 1227 (runner only).
   RV_BASE=<commit> node .rc/x/oldsaves.mjs
   Saves are BUILT BY THE CODE OF RV_BASE (every src file that differs read at that commit) and then loaded and
   played on the tree on disk. Three parts:
     1  every save the base code leaves sitting on a rivalry card or a rival choice is answered on both trees:
        the state after the tap and the lines logged must be byte equal (an old card does what it did).
     2  mid career saves of the base code are played on from the same streams on both trees with no card
        answered: the player's season lines and counters must be byte equal, and on this tree every judged
        season leaves the rival a line of his position's own shape, the right year, a tally one longer, and a
        verdict the two printed lines agree with.
     3  the same saves played on through the board's own loop on this tree with every card answered: nothing
        throws, and every All-Pro card pays what its chip says. */
import { bundleHead, bundleAt, seeded, clone, POS, ONE_PLACE, shapeOf, printedScore } from './rvlib.mjs';

const BASE = process.env.RV_BASE;
if (!BASE) { console.error('set RV_BASE'); process.exit(2); }
const DIFF = process.env.RV_DIFF !== '0';
const N1 = Number(process.env.RV_N1 || 480); const N2 = Number(process.env.RV_N2 || 640);
const H = await bundleHead(); const B = await bundleAt(BASE);
const SH = H.NFL_CAREER_SPORT; const SB = B.mod.NFL_CAREER_SPORT;
console.log(`oldsaves: base ${BASE}, ${B.changed.length} src files differ, ${B.served.length} read at the base: ${B.served.join(', ')}`);
let checks = 0; let failed = 0;
const check = (ok, msg) => { checks += 1; if (!ok) failed += 1; console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const eraOf = i => (Math.floor(i / 8) % 2 ? 'y2005' : undefined);
const cap = v => Math.max(0, Math.min(100, v));

/* ---- part 1: pending cards and choices dealt by the base code ---- */
const sitting = []; const choosing = [];
const catching = { ...SB,
  dismissRivalryEvent: c => { sitting.push(clone(c)); return SB.dismissRivalryEvent(c); },
  resolveRivalryChoice: (c, k, rng) => { choosing.push({ c: clone(c), k }); return SB.resolveRivalryChoice(c, k, rng); } };
for (let i = 0; i < N1; i += 1) B.mod.drive.driveCareer(catching, { key: `rv1-${i}`, pos: POS[i % 8], arch: i, eraId: eraOf(i), seasons: 40 });
const byBeat = {}; const diffs = [];
for (const save of sitting) {
  const e = save.pendingRivalryEvent; const key = `${e.id} "${e.consequence}"`;
  const a = seeded(5, () => SH.dismissRivalryEvent(clone(save))); const b = seeded(5, () => SB.dismissRivalryEvent(clone(save)));
  const same = JSON.stringify(a) === JSON.stringify(b);
  const t = (byBeat[key] ??= { n: 0, same: 0 }); t.n += 1; if (same) t.same += 1;
  if (!same && diffs.length < 5) diffs.push(`${save.pos} beat ${key} "${e.title}": head logged ${JSON.stringify(a.lines)} morale ${a.state.morale} fanbase ${a.state.fanbase}; base logged ${JSON.stringify(b.lines)} morale ${b.state.morale} fanbase ${b.state.fanbase}`);
}
const total = Object.values(byBeat).reduce((x, t) => ({ n: x.n + t.n, same: x.same + t.same }), { n: 0, same: 0 });
console.log(`1) ${sitting.length} saves sitting on a rivalry card the base code dealt (${Object.keys(byBeat).length} kinds), ${choosing.length} on a rival choice`);
for (const id of [206, 221]) console.log(`     beat ${id}: ${Object.entries(byBeat).filter(([k]) => k.startsWith(`${id} `)).map(([k, t]) => `${k} ${t.same} of ${t.n} equal`).join('; ') || 'never dealt by the base in this fleet'}`);
console.log(`     by kind, not equal on the two trees: ${Object.entries(byBeat).filter(([, t]) => t.same !== t.n).map(([k, t]) => `${k} ${t.n - t.same} of ${t.n}`).join('; ') || 'none'}`);
if (DIFF) check(total.n > 500 && total.same === total.n, `a card the base code dealt is answered the same on both trees, state and feed (${total.same} of ${total.n} byte equal)${diffs.length ? `: ${diffs.join(' | ')}` : ''}`);
if (DIFF) check(Object.keys(byBeat).some(k => k === '206 "Morale +5"') && Object.keys(byBeat).some(k => k === '206 "Morale -5"') && Object.keys(byBeat).some(k => k.startsWith('221 ')), 'the base fleet did sit on both own roster cards and on the old 221');
let chSame = 0; const chDiff = [];
for (const { c, k } of choosing) {
  const a = seeded(9, r => SH.resolveRivalryChoice(clone(c), k, r)); const b = seeded(9, r => SB.resolveRivalryChoice(clone(c), k, r));
  if (JSON.stringify(a) === JSON.stringify(b)) chSame += 1; else if (chDiff.length < 3) chDiff.push(`${c.pos} choice ${c.pendingRivalryChoice?.id}`);
}
if (DIFF) check(choosing.length > 100 && chSame === choosing.length, `a rival choice the base code dealt is resolved the same on both trees (${chSame} of ${choosing.length})${chDiff.length ? `: ${chDiff.join(' | ')}` : ''}`);

/* ---- part 2: mid career saves of the base code, played on with no card answered ---- */
const mids = [];
for (let i = 0; i < N2; i += 1) {
  const k = 1 + ((i * 7) % 13);
  const c = JSON.parse(B.mod.drive.driveCareer(SB, { key: `rv2-${i}`, pos: POS[i % 8], arch: i, eraId: eraOf(i), seasons: k }).json);
  if (!c.retired && c.seasons.length > 0) mids.push({ i, c });
}
const playOn = (S, c0, seed, onSeason) => seeded(seed, rnd => {
  const c = clone(c0); let tq = 78; const lines = [];
  for (let g = 0; g < 25; g += 1) {
    S.campBattle(c, tq, rnd);
    const before = c.rival ? clone(c.rival) : null;
    const played = S.simSeason(c, tq, rnd);
    lines.push(JSON.stringify(played.line));
    if (onSeason) onSeason(c, before, played);
    S.progress(c, rnd);
    if (S.shouldRetire(c)) break;
    tq = S.rollTeamQuality(tq, rnd);
  }
  const counters = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'number').sort(([a], [b]) => (a < b ? -1 : 1)));
  return { lines, counters: JSON.stringify(counters), c };
});
const st = { saves: 0, oldShapeAtLoad: 0, retiredAtLoad: 0, retiredOldShape: 0, judged: 0, offShape: 0, badYear: 0, badTally: 0, disagree: 0, noteMiss: 0, onePlaceBoth: 0, linesDiffer: 0, countersDiffer: 0, firstJudgedOff: 0, noHonour: 0 };
const ex = [];
for (const { i, c } of mids) {
  const pos = c.pos; st.saves += 1;
  const r0 = c.rival;
  if (r0 && !shapeOf(pos).test(r0.lastLine)) st.oldShapeAtLoad += 1;
  if (r0?.retired) { st.retiredAtLoad += 1; if (!shapeOf(pos).test(r0.lastLine)) st.retiredOldShape += 1; }
  const head = playOn(SH, c, 4000 + i, (cc, before, played) => {
    if (!before || before.retired) return;
    const r = cc.rival; st.judged += 1;
    const mine = r.myYears > before.myYears;
    if (!shapeOf(pos).test(r.lastLine)) { st.offShape += 1; if (ex.length < 4) ex.push(`${pos}: his line "${r.lastLine}"`); }
    if (r.lastYear !== played.line.year) st.badYear += 1;
    if (typeof r.lastAllStar !== 'boolean') st.noHonour += 1;
    if (r.myYears + r.hisYears !== before.myYears + before.hisYears + 1 || r.myYears < before.myYears || r.hisYears < before.hisYears) st.badTally += 1;
    const my = printedScore(pos, SH.statLine(played.line, pos)); const his = printedScore(pos, r.lastLine);
    if (my === null || his === null || (my > his) !== mine) { st.disagree += 1; if (ex.length < 4) ex.push(`${pos} ${played.line.year}: mine "${SH.statLine(played.line, pos)}" his "${r.lastLine}" given to ${mine ? 'me' : 'him'}`); }
    if (!played.notes.some(n => n.includes(`${r.name} went ${r.lastLine}`))) st.noteMiss += 1;
    if (ONE_PLACE.includes(pos) && played.line.awards.includes('All-Pro') && r.lastAllStar === true) st.onePlaceBoth += 1;
  });
  const base = playOn(SB, c, 4000 + i, null);
  if (head.lines.join('|') !== base.lines.join('|')) { st.linesDiffer += 1; if (ex.length < 6) { const at = head.lines.findIndex((l, n) => l !== base.lines[n]); ex.push(`${pos} save ${i}: season ${at} differs: head ${head.lines[at]} base ${base.lines[at]}`); } }
  if (head.counters !== base.counters) st.countersDiffer += 1;
}
console.log(`2) ${st.saves} mid career saves built by the base code (1 to 13 seasons in), played on for up to 25 seasons on both trees`);
console.log(`     at load: ${st.oldShapeAtLoad} carry a rival line that is not his position's shape; ${st.retiredAtLoad} have a rival already retired, ${st.retiredOldShape} of them with an old shape line that will never be replaced`);
if (!DIFF) console.log(`     (not judged against this base) saves with a differing player line ${st.linesDiffer}, with differing counters ${st.countersDiffer}, of ${st.saves}`);
if (DIFF) check(st.saves > 300 && st.linesDiffer === 0 && st.countersDiffer === 0, `the player's own season lines and counters are byte equal on both trees from an old save (${st.linesDiffer} saves with a differing line, ${st.countersDiffer} with differing counters, of ${st.saves})`);
check(st.judged > 2000 && st.offShape === 0 && st.badYear === 0 && st.noHonour === 0 && st.badTally === 0, `every judged season on this tree leaves his line in his position's shape, the season's year, a roster fact and a tally one longer (${st.judged} judged; off shape ${st.offShape}, wrong year ${st.badYear}, no roster fact ${st.noHonour}, bad tally ${st.badTally})`);
check(st.disagree === 0 && st.noteMiss === 0, `the verdict on the save agrees with the two printed lines and the note carries his line (${st.disagree} disagree, ${st.noteMiss} notes without his line)`);
check(st.onePlaceBoth === 0, `no season at a one place position has both men on the first team (${st.onePlaceBoth})`);
if (ex.length) console.log(`     examples: ${ex.join(' | ')}`);

/* ---- part 3: the same saves through the board's own loop on this tree, every card answered ---- */
const PROMISE = { 'Fanbase +3': s => ({ fanbase: 3, morale: 0 }), 'Morale +5': s => ({ fanbase: 0, morale: 5 }), 'Morale -5': s => ({ fanbase: 0, morale: -5 }) };
const p3 = { saves: 0, threw: 0, seasons: 0, cards: 0, roster: 0, rosterBad: 0, kinds: {}, ownDealt: 0 };
const p3ex = [];
function boardOn(M, c0, key) {
  const S = M.NFL_CAREER_SPORT; const pick = M.drive.keyedStream(`rv3-pick:${key}`);
  return seeded(7000 + key, () => {
    let c = clone(c0); let tq = 78;
    for (let n = 0; n < 25 && !c.retired; n += 1) {
      if ((c.suspendedSeasons ?? 0) > 0) { c.suspendedSeasons -= 1; c.seasons.push(S.suspendedLine(c)); S.progress(c, Math.random); continue; }
      if (c.contractYears <= 0) {
        const fa = S.buildFaWindow(c, tq, Math.random); const open = fa.offers.filter(x => !x.gone);
        if (open.length) { const offer = open[Math.floor(pick() * open.length)]; M.applyFaSigning(c, offer); S.campBattle(c, offer.quality, Math.random); tq = offer.quality; }
      }
      S.campBattle(c, tq, Math.random); S.simSeason(c, tq, Math.random); p3.seasons += 1;
      S.progress(c, Math.random);
      if (S.shouldRetire(c)) { c.retired = true; break; }
      let ev = M.startSummer(c, S, Math.random, null);
      while (ev) ev = M.answerSummerCard(c, S, ev, Math.floor(pick() * ev.options.length), Math.random, null).next;
      tq = S.rollTeamQuality(tq, Math.random);
      const unread = (c.phoneInbox ?? []).find(m => m.answered === undefined);
      if (unread) S.answerInbox(c, unread.id, Math.floor(pick() * unread.choices.length));
      if (c.pendingRivalryEvent) {
        const e = c.pendingRivalryEvent; const was = { morale: c.morale, fanbase: c.fanbase }; p3.cards += 1;
        const last = c.seasons[c.seasons.length - 1]; const mine = (last.awards ?? []).includes('All-Pro'); const his = c.rival?.lastAllStar === true;
        const out = S.dismissRivalryEvent(c); c = out.state;
        if (e.id === 206) {
          p3.roster += 1; p3.kinds[e.consequence] = (p3.kinds[e.consequence] ?? 0) + 1;
          const want = PROMISE[e.consequence]?.();
          const own = /one more line in the argument/.test(e.description);
          if (own) p3.ownDealt += 1;
          const truth = e.consequence === 'Fanbase +3' ? mine && his : e.consequence === 'Morale +5' ? mine && !his : !mine && his;
          const paid = !!want && c.morale === cap(was.morale + want.morale) && c.fanbase === cap(was.fanbase + want.fanbase);
          if (!paid || !truth || (e.consequence === 'Fanbase +3' && ONE_PLACE.includes(c.pos)) || c.rival?.lastYear !== last.year) {
            p3.rosterBad += 1; if (p3ex.length < 4) p3ex.push(`${c.pos} ${last.year}: "${e.description}" promising "${e.consequence}", mine ${mine}, his ${his}, morale ${was.morale} to ${c.morale}, fanbase ${was.fanbase} to ${c.fanbase}`);
          }
        }
      }
      if (c.pendingRivalryChoice) { const res = S.resolveRivalryChoice(c, Math.floor(pick() * c.pendingRivalryChoice.choices.length), Math.random); if (res) c = res.state; }
    }
    return c;
  });
}
for (const { i, c } of mids) {
  p3.saves += 1;
  try { const end = boardOn(H, c, i); JSON.parse(JSON.stringify(end)); } catch (e) { p3.threw += 1; if (p3ex.length < 4) p3ex.push(`save ${i} (${c.pos}) threw: ${String(e).slice(0, 160)}`); }
}
console.log(`3) ${p3.saves} old saves played on through the board's loop on this tree: ${p3.seasons} seasons, ${p3.cards} rivalry cards answered, ${p3.roster} of them All-Pro cards (${Object.entries(p3.kinds).map(([k, n]) => `${k}: ${n}`).join(', ') || 'none'})`);
check(p3.threw === 0, `no old save throws when it is played on (${p3.threw} threw)`);
check(p3.roster > 0 && p3.rosterBad === 0 && p3.ownDealt === 0, `every All-Pro card dealt to an old save says what the two seasons support and pays its chip, and none is an own card of Round 1149 (${p3.rosterBad} wrong, ${p3.ownDealt} own cards, of ${p3.roster})${p3ex.length ? `: ${p3ex.join(' | ')}` : ''}`);
console.log(`oldsaves: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
