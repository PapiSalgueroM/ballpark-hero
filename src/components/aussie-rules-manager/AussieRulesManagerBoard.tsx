import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAussieRulesManager } from '@/hooks/useAussieRulesManager';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { clubById, createWorld, ladderFor, opponentTactic, playerById, PREPARATIONS, ROLE_LABELS, TACTICS, type ManagerAction, type Player, type Score } from '@/lib/aussieRulesManager';
import styles from './AussieRulesManagerBoard.module.css';

type Panel = 'match' | 'squad' | 'ladder';
type Picker = { bench: boolean; index: number };
const newSeed = () => Math.floor(Math.random() * 4294967295) + 1;
const score = (value: Score) => `${value.goals}.${value.behinds} (${value.total})`;

export default function AussieRulesManagerBoard({ onReset }: { onReset?: () => void } = {}) {
  const game = useAussieRulesManager();
  const state = game.state;
  const [seed, setSeed] = useState(newSeed);
  const [panel, setPanel] = useState<Panel>('match');
  const [picker, setPicker] = useState<Picker | null>(null);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [cue, setCue] = useState<{ id: number; text: string } | null>(null);
  const intent = useRef<{ previous: typeof state; action: ManagerAction } | null>(null);
  const cueId = useRef(0);
  const flowFocus = useRef(false);
  const status = useRef<HTMLHeadingElement>(null);
  const pickerBack = useRef<HTMLButtonElement>(null);
  const slotFocus = useRef<string | null>(null);
  const resetOpener = useRef<HTMLButtonElement>(null);
  const reveal = useRevealScroll<HTMLDivElement>(`${state?.round}:${state?.phase}:${state?.match?.quarter}`);
  const club = state ? clubById(state, state.clubId)! : null;
  const players = club?.players ?? [];
  const ladder = state ? ladderFor(state) : [];
  const match = state?.match;
  const selectedOut = state?.starters.includes(outId) ? outId : state?.starters[0] ?? '';
  const outgoing = state ? playerById(state, selectedOut) : undefined;
  const eligibleBench = state ? state.bench.map(id => playerById(state, id)!).filter(player => player.role === outgoing?.role) : [];
  const selectedIn = eligibleBench.some(player => player.id === inId) ? inId : eligibleBench[0]?.id ?? '';

  useLayoutEffect(() => {
    if (flowFocus.current) {
      flowFocus.current = false;
      (state ? status.current : document.querySelector<HTMLElement>('[data-arm-club]'))?.focus({ preventScroll: true });
    }
    const request = intent.current;
    intent.current = null;
    if (!request || !state || state === request.previous) return;
    const action = request.action;
    const text = action.type === 'play' ? `Quarter ${state.match!.quarter} complete: ${score(state.match!.homeScore)} to ${score(state.match!.awayScore)}.`
      : action.type === 'prepare' ? `${PREPARATIONS.find(value => value.id === action.choice)!.label} completed.`
      : action.type === 'swap' ? `${playerById(state, action.inId)!.name} on for ${playerById(state, action.outId)!.name}.`
      : action.type === 'lineup' ? 'Matchday selection updated.'
      : state.phase === 'complete' ? 'All ten rounds completed.' : 'Ready for the next step.';
    setCue({ id: ++cueId.current, text });
    if (!document.activeElement?.isConnected || document.activeElement === document.body) status.current?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), 450);
    return () => window.clearTimeout(timer);
  }, [cue]);
  useLayoutEffect(() => {
    if (picker) pickerBack.current?.focus({ preventScroll: true });
    else if (slotFocus.current) {
      document.querySelector<HTMLElement>(`[data-arm-slot="${slotFocus.current}"]`)?.focus({ preventScroll: true });
      slotFocus.current = null;
    }
  }, [picker]);

  const act = (action: ManagerAction) => {
    const previous = state;
    if (!game.dispatch(action)) return false;
    intent.current = { previous, action };
    return true;
  };
  const leavePicker = () => {
    if (picker) slotFocus.current = `${picker.bench ? 'bench' : 'starter'}-${picker.index}`;
    setPicker(null);
  };
  const pick = (player: Player) => {
    if (!state || !picker) return;
    const starters = [...state.starters], bench = [...state.bench];
    if (picker.bench) bench[picker.index] = player.id;
    else {
      const outgoingId = starters[picker.index], benchIndex = bench.indexOf(player.id);
      starters[picker.index] = player.id;
      if (benchIndex >= 0) bench[benchIndex] = outgoingId;
    }
    if (act({ type: 'lineup', starters, bench })) leavePicker();
  };
  const playerLabel = (player: Player) => <><strong>{player.name}</strong><span>{ROLE_LABELS[player.role]} · Skill {player.skill} · Stamina {player.stamina} · Fatigue {Math.round(player.fatigue)}</span></>;

  if (!state) return <section className={styles.board} data-arm-phase="menu">
    <h2>Choose your club</h2><p className={styles.muted}>Six fictional clubs and generated players. A ten-round home-and-away league, with no finals.</p>
    <p>Choose 18 starters and five interchange players, train or rest each week, then pick a tactic for each quarter. Make same-role changes at the breaks.</p>
    <p className={styles.muted}>Example: 12 goals and 8 behinds make 80 points. That beats 11 goals and 10 behinds (76). A win earns four ladder points, a draw two. Finish top after ten rounds.</p>
    <div className={styles.clubs}>{createWorld(seed).map(team => <button key={team.id} className={styles.tile} data-arm-club={team.id} onClick={() => { if (game.start(seed, team.id)) { flowFocus.current = true; setPanel('match'); setCue(null); } }}>
      <strong>{team.name}</strong><span>{TACTICS.find(value => value.id === team.style)!.label} style · 36 players</span>
    </button>)}</div>
    {game.storageNotice && <p role="status" className={styles.muted}>{game.storageNotice}</p>}
  </section>;

  const title = state.phase === 'complete' ? 'Season complete' : state.phase === 'prepare' ? `Round ${state.round + 1}: preparation`
    : state.phase === 'quarter' ? `Quarter ${(match?.quarter ?? 0) + 1} of 4` : state.phase === 'break' ? `Quarter ${match!.quarter} break` : 'Full time';
  const slotPlayers = picker ? (picker.bench ? state.bench : state.starters) : [];
  const currentPlayer = picker ? playerById(state, slotPlayers[picker.index])! : null;
  const candidates = picker ? players.filter(player => player.id !== currentPlayer!.id && !state.starters.includes(player.id)
    && (picker.bench ? !state.bench.includes(player.id) : player.role === currentPlayer!.role)) : [];

  return <section className={styles.board} data-arm-phase={state.phase} data-arm-round={state.round}>
    <header className={styles.heading}><div><p className={styles.muted}>{club!.name} · Fictional league · Round {state.round + 1}/10</p><h2 ref={status} tabIndex={-1}>{title}</h2></div>
      <button ref={resetOpener} className={styles.secondary} onClick={() => setConfirmReset(true)}>New season</button></header>
    {confirmReset ? <div className={styles.card}>
      <h3>Start fresh?</h3><p>Your current local season will be replaced.</p><div className={styles.actions}>
        <button className={styles.secondary} onClick={() => { setConfirmReset(false); resetOpener.current?.focus({ preventScroll: true }); }}>Keep this season</button>
        <button className={styles.action} onClick={() => { flowFocus.current = true; game.reset(); setSeed(newSeed()); setConfirmReset(false); setPicker(null); setCue(null); onReset?.(); }}>Start a new season</button>
      </div></div> : <>
      <nav className={styles.tabs} aria-label="Season panels">{(['match', 'squad', 'ladder'] as const).map(value => <button key={value} aria-pressed={panel === value} className={panel === value ? styles.action : styles.secondary} onClick={() => { setPanel(value); setPicker(null); }}>{value === 'match' ? 'Match' : value === 'squad' ? 'Squad' : 'Ladder'}</button>)}</nav>
      <div className={styles.feedback} role="status" aria-live="polite">{cue && <span key={cue.id} className={styles.committed} data-arm-feedback>{cue.text}</span>}</div>
      <div ref={reveal}>
      {panel === 'match' && <div className={styles.card}>
        {match && <div className={styles.score} data-arm-score><div><strong>{clubById(state, match.homeId)!.name}</strong><span>{score(match.homeScore)}</span></div><div><strong>{clubById(state, match.awayId)!.name}</strong><span>{score(match.awayScore)}</span></div></div>}
        {state.phase === 'prepare' && <><h3>Prepare your matchday 23</h3><p className={styles.muted}>Your squad has 18 starters and five interchange players. Change your selection in Squad, then choose this week's preparation.</p><div className={styles.choices}>{PREPARATIONS.map(choice => <button key={choice.id} className={styles.tile} data-arm-prepare={choice.id} onClick={() => act({ type: 'prepare', choice: choice.id })}><strong>{choice.label}</strong><span>{choice.description}</span></button>)}</div></>}
        {state.phase === 'quarter' && <><p className={styles.muted}>Opponent read: {TACTICS.find(value => value.id === opponentTactic(state))!.label}. Choose how to play the next 20 active minutes.</p><div className={styles.choices}>{TACTICS.map(tactic => <button key={tactic.id} className={styles.tile} data-arm-tactic={tactic.id} onClick={() => act({ type: 'play', tactic: tactic.id })}><strong>{tactic.label}</strong><span>{tactic.description}</span></button>)}</div></>}
        {state.phase === 'break' && <><p className={styles.muted}>Make a same-role change or keep your team. This game allows up to five swaps at each break.</p><div className={styles.swap}>
          <label>Off the field<select aria-label="Off the field" value={selectedOut} onChange={event => setOutId(event.target.value)}>{state.starters.map(id => { const player = playerById(state, id)!; return <option key={id} value={id}>{player.name} ({ROLE_LABELS[player.role]}, fatigue {Math.round(player.fatigue)})</option>; })}</select></label>
          <label>On the field<select aria-label="On the field" value={selectedIn} disabled={!eligibleBench.length} onChange={event => setInId(event.target.value)}>{eligibleBench.map(player => <option key={player.id} value={player.id}>{player.name} ({ROLE_LABELS[player.role]}, fatigue {Math.round(player.fatigue)})</option>)}</select></label>
        </div><div className={styles.actions}><button className={styles.secondary} data-arm-swap disabled={!selectedIn || state.swapsThisBreak >= 5} onClick={() => act({ type: 'swap', outId: selectedOut, inId: selectedIn })}>Make change ({state.swapsThisBreak}/5)</button><button className={styles.action} data-arm-next onClick={() => act({ type: 'next' })}>Next quarter</button></div></>}
        {state.phase === 'report' && <><h3>Round {state.round + 1} complete</h3><p className={styles.muted}>The ladder includes this round's three games.</p><button className={styles.action} data-arm-next onClick={() => act({ type: 'next' })}>{state.round === 9 ? 'Finish the season' : 'Next round'}</button></>}
        {state.phase === 'complete' && <><h3 data-arm-winner>{clubById(state, ladder[0].clubId)!.name} win the league</h3><p>Ten rounds played. View the final Ladder or start another fictional season.</p><p className={styles.muted}>There are no finals in this short game format.</p></>}
        {match && match.events.length > 0 && <details className={styles.events}><summary>Scoring events ({match.events.length})</summary><ol>{match.events.map(event => <li key={event.id}>Q{event.quarter}, {event.minute} min: {playerById(state, event.playerId)!.name}, {clubById(state, event.clubId)!.name}, {event.kind} ({event.points} {event.points === 1 ? 'point' : 'points'}).</li>)}</ol></details>}
      </div>}
      {panel === 'squad' && <div className={styles.card}>
        {picker ? <><button ref={pickerBack} className={styles.secondary} onClick={leavePicker}>Back to squad</button><h3>Replace {currentPlayer!.name}</h3><p className={styles.muted}>{picker.bench ? 'Choose an unused squad player for interchange.' : 'Choose a player in the same role. Selecting someone on the bench swaps these two players.'}</p><div className={styles.players}>{candidates.map(player => <button className={styles.player} key={player.id} data-arm-candidate={player.id} onClick={() => pick(player)}>{playerLabel(player)}</button>)}</div></>
          : <><h3>Starting 18 and interchange five</h3><p className={styles.muted}>{state.phase === 'prepare' ? 'Select a row to change that spot before preparation.' : 'The matchday squad is set. Use the Match panel for changes at quarter breaks.'}</p><div className={styles.players}>{[...state.starters, ...state.bench].map((id, index) => { const player = playerById(state, id)!, bench = index >= 18, slot = bench ? index - 18 : index; return <button key={id} className={styles.player} disabled={state.phase !== 'prepare'} data-arm-slot={`${bench ? 'bench' : 'starter'}-${slot}`} onClick={() => setPicker({ bench, index: slot })}><span>{bench ? 'Interchange' : 'Starter'} {slot + 1}</span>{playerLabel(player)}</button>; })}</div></>}
      </div>}
      {panel === 'ladder' && <div className={styles.card}><h3>League ladder</h3><p className={styles.muted}>Win: four points. Draw: two. Percentage is points for divided by points against, times 100.</p><div className={styles.table}><table><thead><tr><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">Pts</th><th scope="col">%</th></tr></thead><tbody>{ladder.map(row => <tr key={row.clubId} data-arm-ladder={row.clubId}><th scope="row">{clubById(state, row.clubId)!.name}</th><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.points}</td><td>{row.percentage.toFixed(1)}</td></tr>)}</tbody></table></div></div>}
      </div>
    </>}
    {game.storageNotice && <p role="status" className={styles.muted}>{game.storageNotice}</p>}
  </section>;
}
