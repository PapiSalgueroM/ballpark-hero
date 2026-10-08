/* Round 1101 REVIEW probe 2 (runner lens). Not committed: sent as .rc/x/rvProbe2.test.tsx and copied into src/test on the runner. */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCareer, playNextEntry, resumeMatch, startSecondHalf, liveFeed } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { ACTION_SPAN } from '@/components/pitch-motion/contract';
import { actionFrame } from '@/components/pitch-motion/motion';
import { pitchBeatAt, pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import { LiveSimScreen, stagePitchInput } from '@/components/club-manager/LiveSimScreen';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const boardAt = (career: CareerState, cap: number) => (cap === 45 ? career.live!.added?.h1 : career.live!.added?.h2) ?? 0;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const stacks: string[] = [];
let recording = false;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] });
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('RV probe 2', () => {
  it('P4: how often a goal gets no kick off, and how far the ball and the next shooter jump when it does not', () => {
    const tally = { halves: 0, chances: 0, cut: 0, goals: 0, goalsCut: 0, goalsNoKickoff: 0, goalsShortKickoff: 0, kickoffSpans: [] as number[], ballJumps: [] as number[], runs: [] as number[] };
    const examples: string[] = [];
    for (const [seed, club] of [[110101, 'Aston Villa'], [110102, 'Real Madrid'], [110103, 'Lyon']] as const) {
      const draw = seeded(seed);
      vi.spyOn(Math, 'random').mockImplementation(() => draw());
      let career = startCareer(club);
      let matches = 0;
      const half = (c: CareerState, stage: 'first' | 'second') => {
        const cap = stage === 'first' ? 45 : 90;
        const to = cap + boardAt(c, cap);
        const input = stagePitchInput(c, c.live!, null, stage, stage === 'first' ? 0 : 46, 0, to);
        const plan = pitchPlan(input);
        tally.halves++;
        plan.actions.forEach((a, i) => {
          const next = plan.actions[i + 1];
          const cut = !!next && next.at - a.at < ACTION_SPAN - 1e-9;
          tally.chances++;
          if (cut) tally.cut++;
          if (cut) {
            const before = actionFrame(pitchScene(plan, a.at), { event: a.event, key: 'a', at: a.at }, next.at - a.at - 0.01);
            const first = actionFrame(before, { event: next.event, key: 'b', at: next.at }, 0);
            const planted = actionFrame(before, { event: next.event, key: 'b', at: next.at }, 0.252);
            tally.ballJumps.push(Math.hypot(first.ball.x - before.ball.x, first.ball.y - before.ball.y));
            const all = (f: typeof first) => [...f.mine, ...f.theirs];
            const run = Math.max(...all(first).map(p => { const q = all(planted).find(o => o.key === p.key && o.keeper === p.keeper && o.name === p.name)!; return p.keeper ? 0 : Math.hypot(q.x - p.x, q.y - p.y); }));
            tally.runs.push(run);
          }
          if (a.event.kind !== 'goal') return;
          tally.goals++;
          if (cut) tally.goalsCut++;
          const after = a.at + ACTION_SPAN;
          if (after >= to - 1e-9) return;
          let span = 0;
          for (let t = after + 0.005; t < Math.min(to, after + 0.76); t += 0.01) if (pitchBeatAt(plan, t).state === 'kickoff') span += 0.01;
          tally.kickoffSpans.push(span);
          if (span < 0.02) { tally.goalsNoKickoff++; if (examples.length < 5) examples.push(`${club} ${stage} goal ${a.event.side} at ${a.at}, next chance ${next ? `${next.event.kind} ${next.event.side} at ${next.at}` : 'none'}`); }
          else if (span < 0.6) tally.goalsShortKickoff++;
        });
      };
      for (let guard = 0; guard < 300 && matches < 12; guard++) {
        const next = playNextEntry(career);
        career = next.state;
        if (next.kind === 'seasonOver' || career.sacked) break;
        if (next.kind !== 'halftime' || !career.live) continue;
        half(career, 'first');
        const second = startSecondHalf(career)!;
        half(second, 'second');
        career = resumeMatch(second).state;
        matches++;
      }
      vi.restoreAllMocks();
    }
    const over = (v: number[], n: number) => v.filter(x => x > n).length;
    console.log(`[RV P4] halves ${tally.halves}, chances staged ${tally.chances}, started before the one before had ended ${tally.cut}`);
    console.log(`[RV P4] goals staged ${tally.goals}; next chance starts inside the goal's own action ${tally.goalsCut}; goals (not the last kick) checked for a kick off ${tally.kickoffSpans.length}: NO kick off picture at all ${tally.goalsNoKickoff}, a kick off under 0.6 of the clock ${tally.goalsShortKickoff}, full ${tally.kickoffSpans.length - tally.goalsNoKickoff - tally.goalsShortKickoff}`);
    console.log(`[RV P4] at such a cut, one frame to the next: ball jump median ${median(tally.ballJumps).toFixed(1)} units (of 100), over 30 units ${over(tally.ballJumps, 30)} of ${tally.ballJumps.length}; the fastest outfield man's run inside the 0.25 plant: median ${median(tally.runs).toFixed(1)}, over 20 units ${over(tally.runs, 20)} of ${tally.runs.length}`);
    console.log(`[RV P4] first cases: ${examples.join(' | ')}`);
    expect(tally.goals).toBeGreaterThan(30);
  }, 300000);

  it('P5: through the real viewer, a goal with a chance in the very next minute, frame by frame', async () => {
    const draw = seeded(603);
    vi.spyOn(Math, 'random').mockImplementation(() => { if (recording) stacks.push(String(new Error('random').stack).split('\n').slice(2, 9).join(' <- ')); return draw(); });
    let career = startCareer('Aston Villa');
    let found: { career: CareerState; p: number; goal: string; next: string } | null = null;
    for (let guard = 0; guard < 400 && !found; guard++) {
      const next = playNextEntry(career);
      career = next.state;
      if (next.kind === 'seasonOver' || career.sacked) break;
      if (next.kind !== 'halftime' || !career.live) continue;
      const feed = liveFeed(career.live).filter(e => e.minute <= 45 && !e.plus);
      const chance = (e: { kind: string; side: string }) => (e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save') && e.side !== 'none';
      const at = (m: number) => feed.filter(e => e.minute === m && chance(e));
      const goal = feed.find(e => e.kind === 'goal' && e.side !== 'none' && e.minute >= 6 && e.minute <= 38 && at(e.minute).length === 1 && at(e.minute + 1).length === 1 && at(e.minute - 1).length === 0 && at(e.minute + 2).length === 0);
      if (goal) { const n = at(goal.minute + 1)[0]; found = { career: structuredClone(career), p: goal.minute, goal: `goal ${goal.side} ${goal.text}`, next: `${n.kind} ${n.side} ${n.text}` }; break; }
      career = resumeMatch(startSecondHalf(career)!).state;
    }
    expect(found, 'no first half with a goal and a chance a minute later was found').toBeTruthy();
    const f = found!;
    (f.career.live as unknown as { minute: number }).minute = f.p - 2;
    const callbacks = { onSub: vi.fn(), onShape: vi.fn(), onTalk: vi.fn(), onSecondHalf: vi.fn(), onExit: vi.fn(), onStartSecondHalf: vi.fn(), onStartExtraTime: vi.fn(), onChange: vi.fn(), onMark: vi.fn() };
    recording = true;
    const mounted = render(<LiveSimScreen career={f.career} live={f.career.live ?? null} report={null} clubColor="#86bced" {...callbacks} />);
    const root = mounted.container;
    type Row = { ms: number; minute: string | null; motion: string | null; phase: string | null; bx: number; by: number; card: boolean; score: string; dots: number[][] };
    const rows: Row[] = [];
    const read = (ms: number): Row => {
      const pitch = root.querySelector('[data-cm-live-pitch]')!;
      const ball = root.querySelector<HTMLElement>('[data-cm-ball]')!.style;
      const dots = [...root.querySelectorAll<HTMLElement>('[data-cm-dot],[data-cm-dot-opp]')].map(d => [parseFloat(d.style.left), parseFloat(d.style.top)]);
      return { ms, minute: root.querySelector('[data-cm-live-stage]')!.getAttribute('data-cm-live-minute'), motion: pitch.getAttribute('data-cm-motion'), phase: pitch.getAttribute('data-cm-motion-phase'), bx: parseFloat(ball.left), by: parseFloat(ball.top), card: !!root.querySelector('[data-cm-goal-card]'), score: (root.querySelector('[data-cm-live-score]')?.textContent ?? '').replace(/\s+/g, ''), dots };
    };
    for (let ms = 0; ms < 9000; ms += 16) { await act(async () => { vi.advanceTimersByTime(16); }); rows.push(read(ms + 16)); }
    recording = false;
    /* The runs of one motion/phase, with the clock minute, then every frame where the ball moved more than 15 units. */
    const runs: string[] = [];
    let start = 0;
    for (let i = 1; i <= rows.length; i++) if (i === rows.length || rows[i].motion !== rows[start].motion || rows[i].phase !== rows[start].phase || rows[i].card !== rows[start].card) {
      runs.push(`${rows[start].motion}/${rows[start].phase}${rows[start].card ? ' CARD' : ''} [${rows[start].score}] ${rows[start].ms}-${rows[i - 1].ms}ms min ${rows[start].minute}`);
      start = i;
    }
    console.log(`[RV P5] fixture: ${f.goal} at ${f.p}', then ${f.next} at ${f.p + 1}'. Mounted at ${f.p - 2}', default speed.`);
    console.log(`[RV P5] runs: ${runs.join(' | ')}`);
    const jumps: string[] = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const ball = Math.hypot(b.bx - a.bx, b.by - a.by);
      const man = a.dots.length === b.dots.length ? Math.max(...b.dots.map((d, k) => Math.hypot(d[0] - a.dots[k][0], d[1] - a.dots[k][1]))) : -1;
      if (ball > 15 || man > 6) jumps.push(`${b.ms}ms ${a.motion}/${a.phase} -> ${b.motion}/${b.phase}: ball (${a.bx.toFixed(1)},${a.by.toFixed(1)}) -> (${b.bx.toFixed(1)},${b.by.toFixed(1)}) = ${ball.toFixed(1)} units in one frame, fastest man ${man.toFixed(1)}`);
    }
    console.log(`[RV P5] single frame jumps (ball over 15 units or a man over 6): ${jumps.length}${jumps.length ? '\n  ' + jumps.slice(0, 12).join('\n  ') : ''}`);
    console.log(`[RV P5] Math.random calls from mount to the end of the walk: ${stacks.length}${stacks.length ? '\n  ' + stacks.slice(0, 3).join('\n  ') : ''}`);
    mounted.unmount();
    expect(rows.length).toBeGreaterThan(500);
  }, 300000);
});
