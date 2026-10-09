// Reviewer's mutation table for Round 1146 (never committed). Usage: node rvmut.mjs <id>   (cwd = a copy of the tree)
// Each mutation is one exact text replacement whose anchor must occur exactly once, or the run refuses (exit 3).
import fs from 'node:fs';

const E = 'src/lib/clubManager.ts';
const M = {
  none: [],
  // ---- own goals ----
  m1: [{ f: E, from: 'if (assister && !own) {', to: 'if (assister) {' }],
  m2: [{ f: E, from: 'if (!own) goalCounts.set(line.id, (goalCounts.get(line.id) ?? 0) + 1);', to: 'goalCounts.set(line.id, (goalCounts.get(line.id) ?? 0) + 1);' }],
  m3: [{ f: E, from: 'const there = squadByIds(state, myOnPitchAt(live, g.minute)).filter(p => !gone.has(p.id));', to: 'const there = squadByIds(state, myOnPitchAt(live, g.minute));' }],
  m4: [{ f: E, from: 'text: g.og ? g.og.n : g.name', to: 'text: g.name' }],
  m5: [{ f: E, from: '!g.og && !g.penalty && !g.freeKick', to: '!g.og && !g.penalty' }],
  m6: [{ f: E, from: '...(sc.og ? { og: true } : {}), ...plusOf(sc),', to: '...plusOf(sc),' }],
  m7: [{ f: E, from: 'for (const sc of myScorers) if (!sc.og) tally.set(sc.name, (tally.get(sc.name) ?? 0) + 1);', to: 'for (const sc of myScorers) tally.set(sc.name, (tally.get(sc.name) ?? 0) + 1);' }],
  m8: [{ f: E, from: "const who = ownGoalMan(key, there.filter(p => groupOf(p.position) === 'DEF'), there.find(p => p.position === 'GK') ?? null);", to: "const who = ownGoalMan(key, there.filter(p => groupOf(p.position) !== 'GK'), null);" }],
  // ---- the shared rule ----
  s1: [{ f: 'src/lib/ownGoalRule.ts', from: 'export const OWN_GOAL_ONE_IN = 64;', to: 'export const OWN_GOAL_ONE_IN = 32;' }],
  s2: [{ f: 'src/lib/ownGoalRule.ts', from: 'return Math.floor(keyedRng(`${key}|role`)() * roles);', to: 'return Math.floor(keyedRng(`${key}|role`)() * (roles - 1));' }],
  s3: [{ f: 'src/lib/ownGoalRule.ts', from: 'keyedRng(`${key}|role`)()', to: 'keyedRng(`${key}|tag`)()' }],
  l10: [{ f: E, from: 'if (live.subsUsed >= MAX_SUBS - 1 || (live.minute ?? 0) > at || benchFor(state).length < 2) return;', to: 'if (live.subsUsed >= MAX_SUBS - 1 || benchFor(state).length < 2) return;' }],
  // ---- the marks on screen ----
  u1: [{ f: 'src/lib/clubManagerScorerLine.ts', from: "return g.og ? ' (O.G)' : g.penalty ? ' (P)' : '';", to: "return g.penalty ? ' (P)' : '';" }],
  u2: [{ f: 'src/components/club-manager/MatchTimeline.tsx', from: '{words}{row.name}{row.mark}', to: '{words}{row.name}' }],
  u3: [{ f: 'src/components/club-manager/LiveSimScreen.tsx', from: '...(mark ? [{ t: mark }] : [])];', to: '];' }],
  u4: [{ f: 'src/components/club-manager/LiveSimScreen.tsx', from: "const scorer: Seg = e.og && e.text ? named(side === 'me' ? 'opp' : 'me', e.text) : who;", to: 'const scorer: Seg = who;' }],
  u5: [{ f: 'src/components/club-manager/MatchReportCard.tsx', from: "style={{ animationDelay: revealDelay(i, 0.45, 0.14) }}>⚽ {scorerLine(sc)}</p>", to: "style={{ animationDelay: revealDelay(i, 0.45, 0.14) }}>⚽ {sc.name} {minuteLabel(sc)}</p>" }],
  u6: [{ f: 'src/lib/clubManagerMatchCentre.ts', from: "label: e.og ? 'Own goal' : e.penalty ? 'Goal, penalty' : e.freeKick ? 'Goal, free kick' : 'Goal',", to: "label: e.penalty ? 'Goal, penalty' : e.freeKick ? 'Goal, free kick' : 'Goal'," }],
  // ---- the quick sim coach ----
  l1: [{ f: E, from: '.sort((a, b) => Number(booked.has(b.p.id)) - Number(booked.has(a.p.id)) || a.p.fitness - b.p.fitness);', to: '.sort((a, b) => a.p.fitness - b.p.fitness);' }],
  l2: [{ f: E, from: '&& (p.fitness > out.p.fitness || (p.fitness === out.p.fitness && p.morale > out.p.morale)));', to: ');' }],
  l3: [{ f: E, from: 'const settled = scored(live.h1My) + scored(live.h2My) - scored(live.h1Opp) - scored(live.h2Opp) >= QUICK_LEGS_SETTLED;', to: 'const settled = Math.abs(scored(live.h1My) + scored(live.h2My) - scored(live.h1Opp) - scored(live.h2Opp)) >= QUICK_LEGS_SETTLED;' }],
  l4: [{ f: E, from: "&& x.p.position !== 'GK' && !cameOn.has(x.p.id))", to: "&& x.p.position !== 'GK')" }],
  l5: [{ f: E, from: "const options = benchFor(state, out.p.id).filter(p => (outFit(p) === 'natural' || outFit(p) === 'family')", to: 'const options = benchFor(state, out.p.id).filter(p => (true)' }],
  l6: [{ f: E, from: 'if (live.subsUsed >= MAX_SUBS - 1 || (live.minute ?? 0) > at || benchFor(state).length < 2) return;', to: 'if (live.subsUsed >= MAX_SUBS - 1 || (live.minute ?? 0) > at || benchFor(state).length < 1) return;' }],
  l7: [{ f: E, from: 'const noWeaker = (p: CMPlayer): boolean => (liveElevenStrength(state, at, { outId: out.p.id, inId: p.id }) ?? 0) >= now;', to: 'const noWeaker = (p: CMPlayer): boolean => (liveElevenStrength(state, at, { outId: out.p.id, inId: p.id }) ?? 0) >= now - 1;' }],
  l8: [{ f: E, from: ".filter(c => c.kind === 'yellow' && c.minute <= at).map(c => c.id));", to: ".filter(c => c.kind === 'red' && c.minute <= at).map(c => c.id));" }],
};

const id = process.argv[2];
if (id === 'check') {
  let bad = 0;
  for (const [k, list] of Object.entries(M)) for (const p of list) {
    const n = fs.readFileSync(p.f, 'utf8').split(p.from).length - 1;
    if (n !== 1) bad += 1;
    console.log(`${k} ${n === 1 ? 'ok' : `ANCHOR x${n}`} ${p.f}`);
  }
  process.exit(bad ? 3 : 0);
}
if (!Object.hasOwn(M, id)) { console.error(`rvmut: unknown mutation "${id}"`); process.exit(3); }
for (const p of M[id]) {
  const text = fs.readFileSync(p.f, 'utf8');
  const n = text.split(p.from).length - 1;
  if (n !== 1) { console.error(`rvmut ${id}: anchor occurs ${n} times, not once, in ${p.f}: ${p.from}`); process.exit(3); }
  fs.writeFileSync(p.f, text.replace(p.from, () => p.to));
  console.log(`rvmut ${id}: applied in ${p.f}`);
}
