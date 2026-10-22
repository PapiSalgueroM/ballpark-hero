/* Reviewer mutations and one probe (round 1321, step (d) rulings, 2026-10-21). Applies ONE change to a tracked file on
   the runner, asserting each target is there exactly once. The request line restores the tree with git checkout in
   the same line. Never run on the owner's PC. */
import fs from 'node:fs';

const H = 'scripts/simNbaEarnedDraft.mjs';
const M = {
  /* knob (ii) off by one: the cap from pick 14 instead of 13 */
  k1: [['src/lib/nbaEarnedDraft.ts', '      if (late && slot.overall >= late.from) man.pot = ', '      if (late && slot.overall > late.from) man.pot = ']],
  /* the resolution rule's arithmetic: an error under three margins instead of a third of one */
  j1: [[H, 'p.se < res / 3);', 'p.se < res * 3);']],
  /* a floor or a cap judged on the OLD arm's own values (a swapped argument) */
  j2: [[H, '    const d = OWN.has(line.kind) ? v : v.map((x, i) => x - o[i]);', '    const d = OWN.has(line.kind) ? o : v.map((x, i) => x - o[i]);']],
  /* the table's assertion loosened: anything not OUTSIDE passes (UNRESOLVED and RUNS DISAGREE included) */
  j3: [[H, "if (!FLEET_CONTROL && line.kind !== 'print') check(verdict === 'PASS',", "if (!FLEET_CONTROL && line.kind !== 'print') check(verdict !== 'OUTSIDE',"]],
  /* the earlier review's survivors (2026-10-12), rerun to see they are caught now */
  m1: [['src/lib/nbaEarnedDraft.ts', '    read: (p, club) => (club === ctx.me ? scout(p) : p.grade),', '    read: scout,']],
  m3: [['src/lib/nbaEarnedDraft.ts', '        nbaSignDraftee(man, slot.round);', '        nbaSignDraftee(man, 1);']],
  m4: [['src/lib/gmEarnedDraft.ts', '  if (next && next.holder === me) lines.push(', '  if (next) lines.push(']],
  m5: [['src/lib/nbaFrontOffice.ts', 'export const NBA_DRAFT_NEED_WEIGHT = 2;', 'export const NBA_DRAFT_NEED_WEIGHT = 20;']],
  /* PROBE, not a mutation: follow every man a draft night signs through the summer that runs right after it */
  probe: [
    [H, '    const d = ARM_DRAFT[arm](X, lg, club, rng, desk, out.series);',
      '    const __before = new Map(Object.values(lg.teams).map(t => [t.abbr, new Set(t.players.map(p => p.id))]));\n'
      + '    const d = ARM_DRAFT[arm](X, lg, club, rng, desk, out.series);\n'
      + '    globalThis.__trk = [];\n'
      + '    for (const t of Object.values(lg.teams)) for (const p of t.players) if (!__before.get(t.abbr).has(p.id)) globalThis.__trk.push({ arm, s, id: p.id, club: t.abbr, mine: t.abbr === club, years: p.years, salary: p.salary, min: X.E.nbaMinContract(X.E.nbaDraftSigning(lg).cap) });'],
    [H, '      if (!summer.ok) { rec.refused = s; break; }',
      '      if (!summer.ok) { rec.refused = s; break; }\n'
      + '      for (const m of globalThis.__trk || []) {\n'
      + '        const holder = Object.values(lg.teams).find(t => t.players.some(p => p.id === m.id));\n'
      + '        const now = holder ? holder.players.find(p => p.id === m.id) : null;\n'
      + '        const pooled = lg.freeAgents.some(p => p.id === m.id);\n'
      + '        const dec = (summer.applied || []).find(x => x.id === m.id);\n'
      + '        const fate = now ? (holder.abbr !== m.club ? \'moved\' : now.salary === m.salary ? \'kept his deal\' : \'re-signed at a new price\') : pooled ? \'in the pool\' : \'gone\';\n'
      + '        const kind = m.years === 1 ? \'one season deal\' : `${m.years} season deal`;\n'
      + '        const k = `${m.arm} ${m.mine ? \'HIS\' : \'CPU\'} ${kind}${m.years === 1 ? (m.salary === m.min ? \' at the minimum\' : \' NOT at the minimum\') : \'\'} -> ${fate}${now ? ` (years ${now.years}, salary ${now.salary === m.salary ? \'unchanged\' : \'changed\'})` : \'\'}${dec ? ` [desk: ${dec.kind}]` : \'\'}`;\n'
      + '        (globalThis.__agg ||= {})[k] = ((globalThis.__agg[k]) || 0) + 1;\n'
      + '      }\n'
      + '      globalThis.__trk = [];'],
    [H, "if (FLEET === 'full' || COMBINE) {",
      "process.on('exit', () => { for (const [k, n] of Object.entries(globalThis.__agg || {}).sort()) console.log(`PROBE2 ${String(n).padStart(4)}  ${k}`); });\n"
      + "if (FLEET === 'full' || COMBINE) {"],
  ],
};
const name = process.argv[2];
const list = M[name];
if (!list) { console.log(`MUTATION ${name} UNKNOWN`); process.exit(3); }
for (const [file, from, to] of list) {
  const src = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`MUTATION ${name} CANNOT RUN: ${file} holds its target ${n} times`); process.exit(3); }
  const next = src.replace(from, to);
  if (next === src) { console.log(`MUTATION ${name} CHANGED NOTHING`); process.exit(3); }
  fs.writeFileSync(file, next);
}
console.log(`MUTATION ${name} APPLIED (${list.length} edits)`);
