import { effectiveXIWithSlots, entryInvolvesMe, fixtureFor, instructionsOf, poisson, secondHalfLambdas, worldYear, type CareerState, type MyFixture, type XiSlot } from '@/lib/clubManager';
import { opponentStyle } from '@/lib/clubManagerTactics';
import { readInstructions, type AiStyleId, type TeamInstructions } from '@/lib/clubManagerTacticsCore';
import { keyedRng } from '@/lib/keyedRng';

export const REHEARSAL_KEY = 'dukb-cm-touchline-rehearsal-v1';
export const matchCalls = {
  counter: { label: 'Drop and counter', read: 'Stand off, defend deep and play direct when you win it.', settings: { press: -1, tempo: 1, width: 0, line: -1 } },
  wide: { label: 'Build out wide', read: 'Build patiently and stretch the pitch. A high press can catch your buildup.', settings: { press: 0, tempo: -1, width: 1, line: 0 } },
  squeeze: { label: 'Squeeze the middle', read: 'Press high with a narrow shape. Tired legs and direct balls can expose the line.', settings: { press: 1, tempo: 0, width: -1, line: 1 } },
} as const;
export type MatchCall = keyof typeof matchCalls | 'standing';
export type Brief = 'protect' | 'chase';
export interface RehearsalRun { fixture: string; seed: number; brief: Brief; standing: TeamInstructions; calls: MatchCall[] }
export interface RehearsalFixture { id: string; fx: MyFixture; xi: XiSlot[]; style: AiStyleId }

export function rehearsalFixture(career: CareerState): RehearsalFixture | null {
  if (career.live || career.sacked || career.wilderness) return null;
  for (let w = career.week; w < career.calendar.length; w++) {
    const entry = career.calendar[w];
    if (entry.type === 'window') return null;
    if (!entryInvolvesMe(career, entry)) continue;
    const fx = fixtureFor(career, entry);
    if (!fx) continue;
    const xi = effectiveXIWithSlots(career);
    if (xi.length !== 11) return null;
    const style = opponentStyle(career, fx.opponent);
    const id = JSON.stringify([worldYear(career), career.clubName, career.week, w, fx.competition, fx.opponent, fx.home, style, career.mentality, career.formationIndex, career.customShape,
      xi.map(({ p, duty }) => [p.id, p.rating, p.fitness, p.morale, duty])]);
    return { id, fx, xi, style };
  }
  return null;
}

export function startRehearsal(career: CareerState, fixture: RehearsalFixture, brief: Brief, seed: number): RehearsalRun {
  return { fixture: fixture.id, brief, seed, standing: instructionsOf(career), calls: [] };
}

export function readRehearsal(raw: string | null, fixtureId: string): RehearsalRun | null {
  try {
    const r = raw && JSON.parse(raw);
    if (!r || r.fixture !== fixtureId || !Number.isSafeInteger(r.seed) || r.seed < 0 || r.seed > 0xffffffff
      || (r.brief !== 'protect' && r.brief !== 'chase') || !readInstructions(r.standing)
      || !Array.isArray(r.calls) || r.calls.length > 2 || !r.calls.every((call: unknown) => typeof call === 'string' && (call === 'standing' || Object.keys(matchCalls).includes(call)))) return null;
    return { fixture: r.fixture, seed: r.seed, brief: r.brief, standing: readInstructions(r.standing)!, calls: r.calls };
  } catch { return null; }
}

export function settingsFor(run: RehearsalRun, call: MatchCall): TeamInstructions {
  return call === 'standing' ? run.standing : matchCalls[call].settings;
}

export function rehearseSpell(career: CareerState, fixture: RehearsalFixture, run: RehearsalRun, call: MatchCall, spell: number, mine: number, theirs: number) {
  const instructions = settingsFor(run, call);
  const { lamMine, lamOpp } = secondHalfLambdas(career, fixture.fx, {
    mentality: career.mentality, oppStyle: fixture.style, myGoals: Number(run.brief === 'protect'), oppGoals: Number(run.brief === 'chase'),
    formationIndex: career.formationIndex, positionRules: 1, customShape: career.customShape, instrLog: [{ minute: 60 + 15 * spell, instructions }],
  }, fixture.xi, mine, theirs);
  const ownXg = lamMine / 3;
  const oppXg = lamOpp / 3;
  const tape = 'cm-rehearsal/' + run.seed + '/' + spell;
  return { ownXg, oppXg, mine: mine + poisson(ownXg, keyedRng(tape + '/for')), theirs: theirs + poisson(oppXg, keyedRng(tape + '/against')) };
}

export function rehearsalScore(career: CareerState, fixture: RehearsalFixture, run: RehearsalRun, calls = run.calls) {
  let mine = Number(run.brief === 'protect');
  let theirs = Number(run.brief === 'chase');
  let ownXg = 0, oppXg = 0;
  for (const [spell, call] of calls.entries()) {
    const result = rehearseSpell(career, fixture, run, call, spell, mine, theirs);
    mine = result.mine; theirs = result.theirs;
    ownXg += result.ownXg; oppXg += result.oppXg;
  }
  return { mine, theirs, ownXg, oppXg, achieved: run.brief === 'protect' ? mine > theirs : mine >= theirs };
}
