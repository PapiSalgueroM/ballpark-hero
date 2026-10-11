// Reviewer probe (us-careers lens, Release AV): compares two dumps of uscProbe.mjs. Pure JSON, no tree code.
//   node uscCmp.mjs fleet <base.json> <head.json> [out.txt]
//   node uscCmp.mjs resume <baseResume.json> <headResume.json> [out.txt]
import fs from 'node:fs';
const [mode, fa, fb, outFile] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync(fa, 'utf8')), Bm = JSON.parse(fs.readFileSync(fb, 'utf8'));
const NL = String.fromCharCode(10);
const lines = [];
const say = s => { lines.push(s); };
const inc = (o, k, n = 1) => { o[k] = (o[k] ?? 0) + n; };
const top = (o, n = 12) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ') || 'none';
const J = v => JSON.stringify(v);
say(`uscCmp ${mode}: base made by ${A.madeBy} played by ${A.playedBy ?? A.madeBy} (Hall calibration ${A.hallCalibration}); head played by ${Bm.playedBy ?? Bm.madeBy} (Hall calibration ${Bm.hallCalibration})`);

function seasonCmp(slug, pairs, label) {
  const t = { careers: 0, careersSame: 0, seasonsA: 0, seasonsB: 0, rows: 0, rowsSame: 0, lenDiff: 0, keyHist: {}, aligned: 0, alignedSame: 0, drawMis: 0, statDiff: 0, lineDiff: 0, rivalDiff: 0, nonRival: [], years: {}, first: {}, cards: [0, 0] };
  for (const [a, b] of pairs) {
    t.careers += 1; t.seasonsA += a.seasons.length; t.seasonsB += b.seasons.length; t.cards[0] += a.cards ?? 0; t.cards[1] += b.cards ?? 0;
    if (a.seasons.length !== b.seasons.length) t.lenDiff += 1;
    let prevSame = true, allSame = a.seasons.length === b.seasons.length, firstSeen = false;
    const n = Math.min(a.seasons.length, b.seasons.length);
    for (let s = 0; s < n; s += 1) {
      const x = a.seasons[s], y = b.seasons[s];
      const keys = [...new Set([...Object.keys(x.keys), ...Object.keys(y.keys)])];
      const diff = keys.filter(k => x.keys[k] !== y.keys[k]);
      t.rows += 1;
      if (!diff.length) t.rowsSame += 1; else allSame = false;
      for (const k of diff) inc(t.keyHist, k);
      if (x.stat !== y.stat) t.statDiff += 1;
      if (x.line !== y.line) t.lineDiff += 1;
      if (J(x.rl) !== J(y.rl)) t.rivalDiff += 1;
      const other = diff.filter(k => k !== 'rival');
      if (other.length && t.nonRival.length < 6) t.nonRival.push(`${a.id} season ${s} (${y.y}): ${other.join(',')}`);
      const Y = (t.years[y.y] ??= { rows: 0, aligned: 0, same: 0, lineDiff: 0, drawMis: 0, slates: {}, fields: {}, unaligned: 0, unalignedLineSame: 0 });
      Y.rows += 1;
      let slate = 'eng'; let la = null, lb = null;
      try { la = JSON.parse(x.line); lb = JSON.parse(y.line); slate = lb.slate ?? 'eng'; } catch { /* keep */ }
      inc(Y.slates, String(slate));
      if (prevSame) {
        t.aligned += 1; Y.aligned += 1;
        if (!diff.length) { t.alignedSame += 1; Y.same += 1; }
        if (x.draws !== y.draws) { t.drawMis += 1; Y.drawMis += 1; }
        if (x.line !== y.line) {
          Y.lineDiff += 1;
          if (la && lb) for (const f of new Set([...Object.keys(la), ...Object.keys(lb)])) if (J(la[f]) !== J(lb[f])) inc(Y.fields, f);
        }
        if (diff.length && !firstSeen) { firstSeen = true; inc(t.first, `${y.y}/slate ${slate}/${x.line !== y.line ? 'line' : 'state only: ' + diff.slice(0, 4).join('+')}`); }
      } else { Y.unaligned += 1; if (x.line === y.line) Y.unalignedLineSame += 1; }
      prevSame = prevSame && diff.length === 0;
    }
    if (allSame) t.careersSame += 1;
  }
  say(`  ${label}: ${t.careers} careers, ${t.careersSame} byte equal at every season; ${t.rows} seasons compared (${t.seasonsA} base, ${t.seasonsB} head, ${t.lenDiff} careers of another length), ${t.rowsSame} seasons with every key of the save equal; lines that differ ${t.lineDiff}, printed stat lines that differ ${t.statDiff}, rival trails that differ ${t.rivalDiff}; rivalry cards answered ${t.cards[0]} base, ${t.cards[1]} head`);
  say(`    keys of the save that differ (seasons): ${top(t.keyHist, 30)}`);
  say(`    seasons that began from an equal save: ${t.aligned}, of them equal after ${t.alignedSame}, with another DRAW COUNT ${t.drawMis}`);
  say(`    first divergence of a career (year/slate/kind): ${top(t.first, 40)}`);
  if (t.nonRival.length) say(`    a key other than rival differs, first cases: ${t.nonRival.join(' ; ')}`);
  return t;
}
function yearTable(t) {
  say('    year | rows | began equal | still equal | line differs | draw count differs | head slate | fields of the line that differ (began equal) | began unequal (line equal anyway)');
  for (const y of Object.keys(t.years).map(Number).sort((p, q) => p - q)) {
    const Y = t.years[y];
    say(`    ${y} | ${Y.rows} | ${Y.aligned} | ${Y.same} | ${Y.lineDiff} | ${Y.drawMis} | ${top(Y.slates, 6)} | ${top(Y.fields, 14)} | ${Y.unaligned} (${Y.unalignedLineSame})`);
  }
}
function pairUp(slug) {
  const mapB = new Map(Bm.sports[slug].map(r => [r.id, r]));
  const out = { plain: [], cards: [] }; let threw = 0, missing = 0;
  for (const a of A.sports[slug]) {
    const b = mapB.get(a.id);
    if (!b) { missing += 1; continue; }
    if (a.threw || b.threw) { threw += 1; say(`  THREW ${a.id}: base ${a.threw ?? 'ok'} | head ${b.threw ?? 'ok'}`); continue; }
    if (a.retired !== undefined || !a.seasons) { (out.retired ??= []).push([a, b]); continue; }
    out[a.id.includes('/cards/') ? 'cards' : 'plain'].push([a, b]);
  }
  if (missing || threw) say(`  ${slug}: ${missing} ids missing on the head side, ${threw} threw`);
  return out;
}
let verdictBits = [];
for (const slug of Object.keys(A.sports)) {
  say(''); say(`== ${slug.toUpperCase()} ==`);
  const P = pairUp(slug);
  for (const variant of ['plain', 'cards']) {
    if (!P[variant].length) continue;
    const t = seasonCmp(slug, P[variant], `${variant} (${mode === 'resume' ? 'saves made by base, played on' : 'fresh careers'})`);
    if (slug === 'mlb' || slug === 'nhl') yearTable(t);
    verdictBits.push(`${slug}/${variant}: ${t.careersSame}/${t.careers} careers byte equal, non rival keys moved in ${Object.entries(t.keyHist).filter(([k]) => k !== 'rival').reduce((s, [, v]) => s + v, 0)} season-keys`);
    if (mode === 'resume') {
      const m = { loadSameA: 0, loadSameB: 0, keptA: 0, keptB: 0, n: 0, loadKeys: {} };
      for (const [a, b] of P[variant]) { m.n += 1; if (a.meta.loadSame) m.loadSameA += 1; if (b.meta.loadSame) m.loadSameB += 1; if (a.meta.oldRowsKept) m.keptA += 1; if (b.meta.oldRowsKept) m.keptB += 1; for (const k of b.meta.loadDiffKeys ?? []) inc(m.loadKeys, k); }
      const cb = {}; let liveSame = 0, hofA = 0, hofB = 0;
      for (const [a, b] of P[variant]) { inc(cb, `${a.fin.retired ? 'retired' : 'live'} cal ${a.fin.calBefore} to ${b.fin.retired ? 'retired' : 'live'} cal ${b.fin.calBefore}`); if (J(a.fin.legacyLive) === J(b.fin.legacyLive)) liveSame += 1; if (a.fin.legacyRetired.hof) hofA += 1; if (b.fin.legacyRetired.hof) hofB += 1; }
      say(`    HALL after playing on: calibration read base to head: ${top(cb)}; live legacy equal ${liveSame} of ${P[variant].length}; would retire into the Hall today: base ${hofA}, head ${hofB}`);
      say(`    LOAD: ${m.n} saves in progress; loading left the save byte equal on base ${m.loadSameA}, on head ${m.loadSameB} (keys the head's load changed: ${top(m.loadKeys)}); the rows it already held were kept byte for byte after playing on: base ${m.keptA}, head ${m.keptB}`);
    } else {
      const f = { n: 0, liveSame: 0, retSame: 0, hofFlipUp: 0, hofFlipDown: 0, stamps: {}, calBefore: {}, weighsSame: 0, scoreDelta: [] };
      for (const [a, b] of P[variant]) {
        f.n += 1;
        if (J(a.fin.legacyLive) === J(b.fin.legacyLive)) f.liveSame += 1;
        if (J(a.fin.legacyRetired) === J(b.fin.legacyRetired)) f.retSame += 1;
        if (!a.fin.legacyRetired.hof && b.fin.legacyRetired.hof) f.hofFlipUp += 1;
        if (a.fin.legacyRetired.hof && !b.fin.legacyRetired.hof) f.hofFlipDown += 1;
        inc(f.stamps, `${a.fin.stamp} to ${b.fin.stamp}`); inc(f.calBefore, `${a.fin.calBefore} to ${b.fin.calBefore}`);
        if (J(a.fin.weighs) === J(b.fin.weighs)) f.weighsSame += 1;
        f.scoreDelta.push((b.fin.legacyRetired.score ?? 0) - (a.fin.legacyRetired.score ?? 0));
      }
      const hofA = P[variant].filter(([a]) => a.fin.legacyRetired.hof).length, hofB = P[variant].filter(([, b]) => b.fin.legacyRetired.hof).length;
      const sd = f.scoreDelta.sort((p, q) => p - q);
      say(`    HALL at the end of ${f.n} careers: legacy (live read) equal ${f.liveSame}, legacy (stamped at retirement) equal ${f.retSame}; Hall of Fame base ${hofA}, head ${hofB} (in ${f.hofFlipUp}, out ${f.hofFlipDown}); stamp base to head: ${top(f.stamps)}; calibration before retiring: ${top(f.calBefore)}; the card's weigh line equal ${f.weighsSame}; legacy score head minus base p10 ${sd[Math.floor(sd.length * 0.1)]}, median ${sd[Math.floor(sd.length / 2)]}, p90 ${sd[Math.floor(sd.length * 0.9)]}`);
    }
  }
  if (P.retired?.length) {
    const r = { n: 0, legacySame: 0, calSame: 0, weighsSame: 0, statsSame: 0, loadSameB: 0, cal: {}, stampKept: 0, bad: [] };
    for (const [a, b] of P.retired) {
      r.n += 1;
      const ok = J(a.legacy) === J(b.legacy);
      if (ok) r.legacySame += 1; else if (r.bad.length < 5) r.bad.push(`${a.id}: stamp on disk ${a.stampOnDisk}, base reads cal ${a.cal} score ${a.legacy.score} hof ${a.legacy.hof}; head reads cal ${b.cal} score ${b.legacy.score} hof ${b.legacy.hof}`);
      if (a.cal === b.cal) r.calSame += 1;
      if (J(a.weighs) === J(b.weighs)) r.weighsSame += 1;
      if (J(a.stats) === J(b.stats)) r.statsSame += 1;
      if (b.loadSame) r.loadSameB += 1;
      if ((b.stampAfterLoad ?? null) === (a.stampOnDisk ?? null)) r.stampKept += 1;
      inc(r.cal, `disk ${a.stampOnDisk} base ${a.cal} head ${b.cal}`);
    }
    say(`  RETIRED SAVES made by base: ${r.n}; the head reads the same legacy (score, verdict, every field) on ${r.legacySame}, the same calibration on ${r.calSame}, the same weigh line on ${r.weighsSame}, the same printed line for every season it held on ${r.statsSame}; the stamp on disk survives the head's load on ${r.stampKept}; the head's load left the save byte equal on ${r.loadSameB}`);
    say(`    calibration read: ${top(r.cal)}`);
    for (const b of r.bad) say(`    MOVED ${b}`);
    verdictBits.push(`${slug}/retired: ${r.legacySame}/${r.n} legacies kept`);
  }
}
say(''); say('SUMMARY: ' + verdictBits.join(' | '));
const text = lines.join(NL);
if (outFile) fs.writeFileSync(outFile, text);
console.log(lines.filter(l => !l.startsWith('    2') && !l.startsWith('    1')).join(NL).slice(0, 14000));
