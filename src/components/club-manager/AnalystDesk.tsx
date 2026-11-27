import { useState } from 'react';
import { isReturnPress, minuteLabel, type CareerState, type LiveMatch } from '@/lib/clubManager';
import type { ClockPoint } from '@/lib/clubManagerClock';
import {
  analystCurrent, analystHistory, canUseAnalyst, isAnalystObservation, isAnalystWatch,
  type AnalystMode, type AnalystObservation, type AnalystPlayer, type AnalystTally,
} from '@/lib/clubManagerAnalyst';
import { MadeUpTag } from './SquadScreen';

const modeLabels = { quick: 'Watch their throw-ins', full: 'Watch throw-ins and shots' };

function PlayerName({ player }: { player: Pick<AnalystPlayer, 'name' | 'generated'> }) {
  return <>{player.name}{player.generated && <MadeUpTag className="ml-1" />}</>;
}

function SampleTally({ title, sample, throws = false }: { title: string; sample: AnalystTally; throws?: boolean }) {
  const named = sample.total - sample.unknown;
  return <div className="space-y-1">
    <h4 className="font-bold">{title}</h4>
    <p>{sample.total} {sample.total === 1 ? 'action' : 'actions'} observed, {named} attributed to a player{sample.unknown > 0 && `, ${sample.unknown} unknown`}.</p>
    {sample.players.length > 0 && <ul className="space-y-0.5">
      {sample.players.slice(0, 3).map(player => <li key={player.name}>
        <PlayerName player={player} /> <span className="text-muted-foreground">· {player.position} · {player.count} of {named}</span>
      </li>)}
    </ul>}
    {throws && sample.other > 0 && <p>{sample.other} from players outside the wide defender positions.</p>}
  </div>;
}

function Observation({ note }: { note: AnalystObservation }) {
  const from = note.from.minute === 0 ? 'Kickoff' : minuteLabel(note.from);
  return <div className="space-y-2 rounded-md bg-secondary/40 p-2">
    <p><strong>Recorded window</strong> · {from} to {minuteLabel(note.to)}</p>
    <SampleTally title="Opposing throw-ins" sample={note.throws} throws />
    {note.shots && <SampleTally title="Opposing shots" sample={note.shots} />}
    {note.starters ? <details>
      <summary className="min-h-11 cursor-pointer py-3 font-semibold">Observed starting eleven{note.formation && ` · ${note.formation}`}</summary>
      <ul className="grid grid-cols-2 gap-1">
        {note.starters.map((player, slot) => <li className="break-words" key={slot}><PlayerName player={player} /> <span className="text-muted-foreground">{player.position}</span></li>)}
      </ul>
    </details> : <p className="text-muted-foreground">The match had incomplete starting lineup coverage.</p>}
  </div>;
}

export function AnalystReport({ note }: { note: unknown }) {
  if (!isAnalystObservation(note)) return null;
  return <details className="mt-3 rounded-lg border border-border bg-card px-2">
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">Opponent observation filed</summary>
    <section aria-label="Filed opponent observation" className="space-y-2 pb-2 text-xs">
      <p>{note.club} watched {note.opponent}. Season {note.season}, week {note.week + 1}. {modeLabels[note.mode]}.</p>
      <Observation note={note} />
    </section>
  </details>;
}

export function AnalystDesk({ career, opponent, mode, onMode, live, clock, onPress }: {
  career: CareerState;
  opponent: string;
  mode?: AnalystMode;
  onMode: (mode: AnalystMode | null) => void;
  live?: LiveMatch;
  clock?: ClockPoint;
  onPress?: (target: string) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pastIndex, setPastIndex] = useState(0);
  const current = opened && live && clock ? analystCurrent(career, live, clock) : null;
  const notes = opened ? current?.history ?? analystHistory(career, opponent) : [];
  const past = notes[Math.min(pastIndex, notes.length - 1)];
  const watch = isAnalystWatch(live?.analystWatch) ? live.analystWatch : null;
  const active = watch?.mode ?? mode;
  const recommendation = current?.recommendation;
  const press = isReturnPress(live?.returnPress) ? live.returnPress : null;
  const available = canUseAnalyst(career) && (!live?.analystWatch || !!watch);
  const recurring = new Map<string, { player: AnalystPlayer; actions: number; meetings: number }>();
  for (const note of notes) for (const player of note.throws.players) {
    const key = JSON.stringify([player.name, player.generated === true]);
    const row = recurring.get(key) ?? { player, actions: 0, meetings: 0 };
    recurring.set(key, { player, actions: row.actions + player.count, meetings: row.meetings + 1 });
  }
  const recurringThrower = [...recurring.values()].filter(row => row.meetings >= 2)
    .sort((a, b) => b.meetings - a.meetings || b.actions - a.actions || a.player.name.localeCompare(b.player.name))[0];
  const priorNamedThrows = notes.reduce((sum, note) => sum + note.throws.total - note.throws.unknown, 0);
  return <details className="rounded-lg border border-border bg-card px-2" onToggle={e => setOpened(e.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">
      Opponent notebook{active && <span className="ml-2 font-normal text-primary">{live ? 'Watch running' : 'Watch at kickoff'}</span>}
    </summary>
    {opened && <section aria-label="Opponent notebook" className="space-y-2 pb-2 text-xs">
      <p><strong>{opponent}</strong> · {notes.length ? `${notes.length} observed ${notes.length === 1 ? 'meeting' : 'meetings'} for ${career.clubName}` : `No observed meetings for ${career.clubName} yet`}</p>
      {notes.length === 1 && <p className="text-muted-foreground">One meeting gives you a lead to check in this match.</p>}
      {recurringThrower && <p><PlayerName player={recurringThrower.player} /> took {recurringThrower.actions} of {priorNamedThrows} attributed throws across the sample, with throws recorded in {recurringThrower.meetings} meetings.</p>}
      {!live && notes.some(note => note.starters) && <p className="text-muted-foreground">The analyst compares the starting elevens at kickoff.</p>}
      <button type="button" className="min-h-11 rounded-md border border-border px-2 font-semibold"
        aria-expanded={helpOpen} onClick={() => setHelpOpen(!helpOpen)}>Notebook rules and example</button>
      {helpOpen && <p className="rounded-md bg-secondary/40 p-2">
        Choose what to watch. Starting at halftime records only what happens after your call. If a fullback took two past throws and takes another today, your analyst can flag him as a pressing target. You choose whether to send the presser.
      </p>}
      {available ? <label className="block font-semibold">Observation to file
        <select value={active ?? ''} onChange={e => onMode(e.target.value === 'quick' || e.target.value === 'full' ? e.target.value : null)}
          className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2">
          <option value="">No observation</option>
          <option value="quick">{modeLabels.quick}</option>
          <option value="full">{modeLabels.full}</option>
        </select>
      </label> : <p role="status">This save has a notebook this version cannot read.</p>}
      {live && active && <p className="text-muted-foreground">Changing the watch starts a fresh observation from this minute.</p>}
      {current?.lineup && <p>
        {current.lineup.overlap} of {current.lineup.compared} compared starters also started the observed match in season {current.lineup.previous.season}, week {current.lineup.previous.week + 1}.
        {current.lineup.changedRole > 0 && ` ${current.lineup.changedRole} returned in a different ${current.lineup.changedRole === 1 ? 'position' : 'set of positions'}.`}
      </p>}
      {recommendation && <div className="space-y-1 rounded-md border border-primary/50 p-2" aria-label="Pressing recommendation">
        <p><PlayerName player={recommendation.target} /> has taken {recommendation.todayThrows} watched {recommendation.todayThrows === 1 ? 'throw' : 'throws'} today{recommendation.pastThrows > 0 && ` and ${recommendation.pastThrows} across ${recommendation.pastMeetings} earlier observed ${recommendation.pastMeetings === 1 ? 'meeting' : 'meetings'}`}.</p>
        {press?.target === recommendation.target.name
          ? <p className="font-semibold">Return-pass press is active for this player.</p>
          : onPress && <button type="button" className="min-h-11 rounded-md border border-primary px-2 font-semibold text-primary"
            onClick={() => onPress(recommendation.target.name)}>Send <PlayerName player={recommendation.winger} /> to press the return</button>}
      </div>}
      {current && <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">What we have seen today</summary>
        <Observation note={current.observation} />
      </details>}
      {past && <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Earlier observations</summary>
        {notes.length > 1 ? <label className="mb-2 block font-semibold">Observed match
          <select value={Math.min(pastIndex, notes.length - 1)} onChange={e => setPastIndex(Number(e.target.value))}
            className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2">
            {notes.map((note, index) => <option key={note.season + ':' + note.week} value={index}>Season {note.season}, week {note.week + 1}</option>)}
          </select>
        </label> : <p className="mb-1">Season {past.season}, week {past.week + 1}</p>}
        <Observation note={past} />
      </details>}
    </section>}
  </details>;
}
