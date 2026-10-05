import { useState } from 'react';
import { useAussieRulesLeague } from '@/hooks/useAussieRulesLeague';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { HubPanelHeader, HubTiles } from '@/components/hub/HubTiles';
import VictoryMoment from '@/components/game/VictoryMoment';
import { DraftNightCard } from '@/components/front-office-shared/DraftNightCard';
import { buildDraftNight } from '@/lib/draftNight';
import { PREPARATIONS, ROLE_LABELS, ROLES, TACTICS, type Score, type Tactic } from '@/lib/aussieRulesManager';
import { EXIT_LABELS } from '@/lib/aussieRulesFormat';
import {
  CLUBS, clubLabel, clubOf, draftPool, hubTiles, lastWeek, leagueLadder, leaguePlayer, myFinalsTie, ordinal, pickRefusal, picksLeft, placeOf, retirees,
  ROUNDS, scoutedPotential, tieName, type LeagueAction, type LeagueState,
} from '@/lib/aussieRulesLeague';
import styles from './AussieRulesManagerBoard.module.css';
import own from './AussieRulesLeagueBoard.module.css';

type Panel = 'match' | 'ladder' | 'squad' | 'finals' | 'club' | 'draft';
const score = (value: Score) => `${value.goals}.${value.behinds} (${value.total})`;
const TIER_NAMES: Record<number, string> = { 1: 'Contenders', 2: 'Finals hopefuls', 3: 'Middle of the pack', 4: 'Rebuilding', 5: 'Battlers' };
/** The seed is drawn when you pick a club, never at render, so the menu itself is the same on every visit. */
const newSeed = () => Math.floor(Math.random() * 4294967295) + 1;

function Menu({ onPick, notice }: { onPick: (clubId: string) => void; notice: string | null }) {
  return <section className={styles.board} data-arl-phase="menu">
    <h2>Choose your club</h2>
    <p className={styles.muted}>Eighteen fictional clubs and generated players. 23 rounds, then the finals: a wildcard week for 7th to 10th, then the final eight, a Grand Final, and a draft into next season.</p>
    {[1, 2, 3, 4, 5].map(tier => <div key={tier} className={own.tierGroup}>
      <h3>{TIER_NAMES[tier]}</h3>
      <div className={styles.clubs}>{CLUBS.filter(club => club.tier === tier).map(club => <button key={club.id} className={styles.tile} data-arl-club={club.id} onClick={() => onPick(club.id)}>
        <strong>{club.place} {club.nickname}</strong><span>{TACTICS.find(value => value.id === club.style)!.label} style · 36 players</span>
      </button>)}</div>
    </div>)}
    {notice && <p role="status" className={styles.muted}>{notice}</p>}
  </section>;
}

function Results({ state }: { state: LeagueState }) {
  if (state.stage === 'finals') {
    const ties = state.finals?.ties.filter(tie => tie.week === state.week) ?? [];
    return <ul className={own.list}>{ties.map(tie => <li key={tie.id} data-arl-tie={tie.id}>
      <strong>{tieName(tie.id)}</strong>: {placeOf(tie.homeId)} {tie.result ? score(tie.result.home) : ''} v {placeOf(tie.awayId)} {tie.result ? score(tie.result.away) : ''}{tie.result?.extraTime ? ' (after extra time)' : ''}
    </li>)}</ul>;
  }
  const games = state.results.slice(state.round * 9, state.round * 9 + 9);
  return <ul className={own.list}>{games.map(game => <li key={`${game.homeId}-${game.awayId}`}>{placeOf(game.homeId)} {score(game.homeScore)} v {placeOf(game.awayId)} {score(game.awayScore)}</li>)}</ul>;
}

function MatchPanel({ state, act }: { state: LeagueState; act: (action: LeagueAction) => void }) {
  const [tactic, setTactic] = useState<Tactic>('control');
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const match = state.match;
  const other = match ? (match.homeId === state.myClub ? match.awayId : match.homeId) : '';
  const read = other ? TACTICS.find(value => value.id === clubOf(state, other)!.style)!.label : '';
  const selectedOut = state.starters.includes(outId) ? outId : state.starters[0] ?? '';
  const outgoing = leaguePlayer(state, selectedOut);
  const eligible = state.bench.map(id => leaguePlayer(state, id)!).filter(player => player.role === outgoing?.role);
  const selectedIn = eligible.some(player => player.id === inId) ? inId : eligible[0]?.id ?? '';
  const nextLabel = state.stage === 'homeAway' ? (state.round === ROUNDS - 1 ? 'On to the finals' : 'Next round') : state.week === lastWeek(state.format) ? 'Wrap up the season' : 'Next finals week';
  return <div className={styles.card} data-arl-match>
    {match && <div className={styles.score} data-arl-score><div><strong>{clubLabel(match.homeId)}</strong><span>{score(match.homeScore)}</span></div><div><strong>{clubLabel(match.awayId)}</strong><span>{score(match.awayScore)}</span></div></div>}
    {!match && state.phase === 'prepare' && <><h3>You are not playing this week</h3><p className={styles.muted}>Here is the week's draw. Play it out to see who goes through.</p><Results state={state} />
      <button className={styles.action} data-arl-simweek onClick={() => act({ type: 'simWeek' })}>Play the week</button></>}
    {match && state.phase === 'prepare' && <><h3>Prepare your matchday 23</h3><p className={styles.muted}>Your list manager picked the best 23 on current form: skill, less fatigue. Change it in Squad, then choose this week's preparation.</p>
      <div className={styles.choices}>{PREPARATIONS.map(choice => <button key={choice.id} className={styles.tile} data-arl-prepare={choice.id} onClick={() => act({ type: 'prepare', choice: choice.id })}><strong>{choice.label}</strong><span>{choice.description}</span></button>)}</div></>}
    {(state.phase === 'quarter' || state.phase === 'break') && match && <>
      <p className={styles.muted}>Opponent read: {read}. {state.phase === 'quarter' ? `Quarter ${match.quarter + 1} of 4 is next.` : `Quarter ${match.quarter} break.`}</p>
      <div className={styles.tabs} role="group" aria-label="Tactic">{TACTICS.map(value => <button key={value.id} aria-pressed={tactic === value.id} className={tactic === value.id ? styles.action : styles.secondary} data-arl-tactic={value.id} onClick={() => setTactic(value.id)}>{value.label}</button>)}</div>
      <p className={styles.muted}>{TACTICS.find(value => value.id === tactic)!.description}</p>
      {state.phase === 'break' && <><div className={styles.swap}>
        <label>Off the field<select aria-label="Off the field" value={selectedOut} onChange={event => setOutId(event.target.value)}>{state.starters.map(id => { const player = leaguePlayer(state, id)!; return <option key={id} value={id}>{player.name} ({ROLE_LABELS[player.role]}, fatigue {Math.round(player.fatigue)})</option>; })}</select></label>
        <label>On the field<select aria-label="On the field" value={selectedIn} disabled={!eligible.length} onChange={event => setInId(event.target.value)}>{eligible.map(player => <option key={player.id} value={player.id}>{player.name} ({ROLE_LABELS[player.role]}, fatigue {Math.round(player.fatigue)})</option>)}</select></label>
      </div><button className={styles.secondary} data-arl-swap disabled={!selectedIn || state.swapsThisBreak >= 5} onClick={() => act({ type: 'swap', outId: selectedOut, inId: selectedIn })}>Make change ({state.swapsThisBreak}/5)</button></>}
      <div className={styles.actions}>
        <button className={styles.secondary} data-arl-play onClick={() => act(state.phase === 'break' ? { type: 'next' } : { type: 'play', tactic })}>{state.phase === 'break' ? 'Start the next quarter' : 'Play this quarter'}</button>
        <button className={styles.action} data-arl-playmatch onClick={() => act({ type: 'playMatch', tactic })}>Play the whole match</button>
      </div></>}
    {state.phase === 'report' && <><h3>{match ? 'Full time' : 'The week is done'}</h3>
      {match && match.homeScore.total !== match.awayScore.total && <p data-arl-result>{(match.homeScore.total > match.awayScore.total) === (match.homeId === state.myClub) ? 'You won' : 'You lost'} by {Math.abs(match.homeScore.total - match.awayScore.total)}.</p>}
      {match && match.homeScore.total === match.awayScore.total && <p data-arl-result>A draw: two ladder points each.</p>}
      <Results state={state} />
      <button className={styles.action} data-arl-next onClick={() => act({ type: 'next' })}>{nextLabel}</button></>}
    {match && match.events.length > 0 && <details className={styles.events}><summary>Scoring events ({match.events.length})</summary><ol>{match.events.map(event => <li key={event.id}>{event.quarter > 4 ? 'Extra time' : `Q${event.quarter}`}, {event.minute} min: {leaguePlayer(state, event.playerId)?.name}, {placeOf(event.clubId)}, {event.kind} ({event.points} {event.points === 1 ? 'point' : 'points'}).</li>)}</ol></details>}
  </div>;
}

function SquadPanel({ state, act }: { state: LeagueState; act: (action: LeagueAction) => void }) {
  const [slot, setSlot] = useState<{ bench: boolean; index: number } | null>(null);
  const club = clubOf(state, state.myClub)!;
  const editable = state.phase === 'prepare' && !!state.match;
  const line = (id: string) => { const p = leaguePlayer(state, id)!; return <><strong>{p.name}</strong><span>{ROLE_LABELS[p.role]} · Skill {p.skill} · Ceiling {p.potential} · Age {p.age} · Fatigue {Math.round(p.fatigue)}</span></>; };
  if (slot && editable) {
    const current = leaguePlayer(state, (slot.bench ? state.bench : state.starters)[slot.index])!;
    const candidates = club.players.filter(p => p.id !== current.id && !state.starters.includes(p.id) && (slot.bench ? !state.bench.includes(p.id) : p.role === current.role));
    const choose = (id: string) => {
      const starters = [...state.starters], bench = [...state.bench];
      if (slot.bench) bench[slot.index] = id;
      else { const at = bench.indexOf(id); starters[slot.index] = id; if (at >= 0) bench[at] = current.id; }
      act({ type: 'lineup', starters, bench }); setSlot(null);
    };
    return <div className={styles.card}><button className={styles.secondary} onClick={() => setSlot(null)}>Back to squad</button><h3>Replace {current.name}</h3>
      <p className={styles.muted}>{slot.bench ? 'Pick an unused player for the interchange.' : 'Pick a player in the same role. Picking someone on the bench swaps the two.'}</p>
      <div className={styles.players}>{candidates.map(p => <button key={p.id} className={styles.player} data-arl-candidate={p.id} onClick={() => choose(p.id)}>{line(p.id)}</button>)}</div></div>;
  }
  const rest = club.players.filter(p => !state.starters.includes(p.id) && !state.bench.includes(p.id)).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || b.skill - a.skill);
  return <div className={styles.card}><h3>Starting 18, interchange five, and the rest of the list</h3>
    <p className={styles.muted}>{editable ? 'Tap a starter or an interchange player to change that spot before preparation.' : 'Selection opens again before the next match.'}</p>
    <div className={styles.players}>
      {[...state.starters, ...state.bench].map((id, index) => editable
        ? <button key={id} className={styles.player} data-arl-slot={index} onClick={() => setSlot({ bench: index >= 18, index: index >= 18 ? index - 18 : index })}>{line(id)}<span>{index >= 18 ? 'Interchange' : 'Starter'}</span></button>
        : <div key={id} className={styles.player}>{line(id)}<span>{index >= 18 ? 'Interchange' : 'Starter'}</span></div>)}
      {rest.map(p => <div key={p.id} className={styles.player}>{line(p.id)}<span>Not selected</span></div>)}
    </div></div>;
}

function LadderPanel({ state }: { state: LeagueState }) {
  const ladder = leagueLadder(state);
  return <div className={styles.card}><h3>Ladder</h3><p className={styles.muted}>Win: four points. Draw: two. Then percentage: points for divided by points against, times 100. The top ten play the finals.</p>
    <div className={styles.table}><table><thead><tr><th scope="col">Club</th><th scope="col">P</th><th scope="col">W</th><th scope="col">D</th><th scope="col">L</th><th scope="col">Pts</th><th scope="col">%</th></tr></thead>
      <tbody>{ladder.map((row, index) => <tr key={row.clubId} className={`${row.clubId === state.myClub ? own.mine : ''} ${index === 9 ? own.cut : ''}`} data-arl-ladder={row.clubId}>
        <th scope="row">{index + 1}. {placeOf(row.clubId)}</th><td>{row.played}</td><td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td><td>{row.points}</td><td>{row.percentage.toFixed(1)}</td></tr>)}</tbody></table></div></div>;
}

function FinalsPanel({ state }: { state: LeagueState }) {
  const weeks = Array.from({ length: lastWeek(state.format) + 1 }, (_, week) => week);
  return <div className={styles.card}><h3>Finals</h3><p className={styles.muted}>7th plays 10th and 8th plays 9th in the wildcard week. Then 1st v 4th and 2nd v 3rd, where the winners rest a week and the losers get a second chance, while 5th and 6th meet the wildcard winners and the losers go out.</p>
    {weeks.map(week => { const ties = state.finals?.ties.filter(tie => tie.week === week) ?? [];
      return <div key={week} className={own.week}><h3>Week {week + 1}</h3>{ties.length ? <ul className={own.list}>{ties.map(tie => <li key={tie.id} data-arl-final={tie.id} className={tie.homeId === state.myClub || tie.awayId === state.myClub ? own.mine : ''}>
        <strong>{tieName(tie.id)}</strong>: {placeOf(tie.homeId)} {tie.result ? score(tie.result.home) : ''} v {placeOf(tie.awayId)} {tie.result ? score(tie.result.away) : ''}{tie.result?.extraTime ? ' (after extra time)' : ''}</li>)}</ul>
        : <p className={styles.muted}>To be decided.</p>}</div>; })}
  </div>;
}

function ClubPanel({ state }: { state: LeagueState }) {
  const rows = [...state.history].reverse();
  return <div className={styles.card}><h3>Honour board</h3>
    {rows.length ? <ul className={own.list}>{rows.map(row => <li key={row.season} data-arl-history={row.season}>
      <strong>Season {row.season}</strong>: {ordinal(row.place)} on the ladder ({row.w}-{row.d}-{row.l}), {EXIT_LABELS[row.exit].toLowerCase()}. Premiers: {clubLabel(row.premier)}, beating {placeOf(row.runnerUp)} {score(row.gf.home === row.premier ? row.gf.homeScore : row.gf.awayScore)} to {score(row.gf.home === row.premier ? row.gf.awayScore : row.gf.homeScore)}. Most goals: {row.leadingGoalkicker.name} ({placeOf(row.leadingGoalkicker.club)}), {row.leadingGoalkicker.goals}.
    </li>)}</ul> : <p className={styles.muted}>Your first season is under way. Every season you finish goes up here.</p>}
  </div>;
}

function DraftPanel({ state, act }: { state: LeagueState; act: (action: LeagueAction) => boolean }) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const [nightFrom, setNightFrom] = useState<number | null>(null);
  if (state.phase === 'summer') return <div className={styles.card}><h3>Draft night is next</h3><p className={styles.muted}>Retirements leave the lists first, then every club drafts back up to 36.</p></div>;
  if (state.phase !== 'draft' || !state.draft) return <div className={styles.card}><h3>The national draft</h3><p className={styles.muted}>The draft runs in the summer, after the Grand Final.</p></div>;
  const draft = state.draft;
  const mineLeft = picksLeft(state, state.myClub);
  const myTurn = draft.at < draft.order.length && draft.order[draft.at] === state.myClub;
  const prospect = (id: string) => draft.pool.find(value => value.id === id)!;
  const raw = (index: number) => { const pick = draft.made[index], p = prospect(pick.prospectId); return { team: placeOf(pick.clubId), playerName: p.name, pos: ROLE_LABELS[p.role], grade: scoutedPotential(state, p).mid }; };
  const rivals: ReturnType<typeof raw>[] = [];
  if (nightFrom !== null) for (let i = nightFrom + 1; i < draft.made.length && draft.made[i].clubId !== state.myClub; i += 1) rivals.push(raw(i));
  const night = nightFrom !== null && draft.made[nightFrom] ? buildDraftNight(raw(nightFrom), rivals) : null;
  const pick = (id: string) => {
    const reason = pickRefusal(state, id);
    if (reason) { setRefusal(reason); return; }
    const at = draft.made.length;
    if (act({ type: 'pick', prospectId: id })) { setRefusal(null); setNightFrom(at); }
  };
  const pool = [...draftPool(state)].sort((a, b) => scoutedPotential(state, b).mid - scoutedPotential(state, a).mid || a.skill - b.skill);
  return <div className={styles.card} data-arl-draft>
    <h3>{draft.at >= draft.order.length ? 'The draft is done' : myTurn ? `Your pick: number ${draft.at + 1} of ${draft.order.length}` : 'The other clubs are picking'}</h3>
    <p className={styles.muted}>Picks go to clubs that missed the finals first, worst first, then finalists by the week they went out, the premier last. Ceilings are your scouts' read, a range, not a promise.</p>
    {night && <DraftNightCard night={night} onContinue={() => setNightFrom(null)} />}
    {refusal && <p role="alert" data-arl-refusal className={own.refusal}>{refusal}</p>}
    {myTurn && <><div className={styles.actions}><button className={styles.secondary} data-arl-draftauto onClick={() => act({ type: 'draftAuto' })}>Let the list manager make all {mineLeft} {mineLeft === 1 ? 'pick' : 'picks'}</button></div>
      <div className={styles.players}>{pool.map(p => { const read = scoutedPotential(state, p); return <button key={p.id} className={styles.player} data-arl-prospect={p.id} onClick={() => pick(p.id)}>
        <strong>{p.name}</strong><span>{ROLE_LABELS[p.role]} · Age {p.age} · Skill {p.skill} · Ceiling {read.low} to {read.high}</span></button>; })}</div></>}
    {draft.at >= draft.order.length && <button className={styles.action} data-arl-next onClick={() => act({ type: 'next' })}>Start season {state.season + 1}</button>}
  </div>;
}

function StatusCard({ state, act }: { state: LeagueState; act: (action: LeagueAction) => boolean }) {
  const last = state.history[state.history.length - 1];
  if (state.phase === 'seasonOver' && last) {
    const won = last.premier === state.myClub;
    const gf = `${score(last.gf.home === last.premier ? last.gf.homeScore : last.gf.awayScore)} to ${score(last.gf.home === last.premier ? last.gf.awayScore : last.gf.homeScore)}`;
    return <div className={styles.card} data-arl-seasonover>
      {won ? <VictoryMoment><p data-arl-premiers><strong>Premiers!</strong> {state.clubName} win the Grand Final, {gf}.</p></VictoryMoment>
        : <p data-arl-premier>{clubLabel(last.premier)} are the premiers, beating {placeOf(last.runnerUp)} {gf}.</p>}
      <p className={styles.muted}>You finished {ordinal(last.place)} ({last.w}-{last.d}-{last.l}). {EXIT_LABELS[last.exit]}. Most goals this season: {last.leadingGoalkicker.name}, {last.leadingGoalkicker.goals}.</p>
      <button className={styles.action} data-arl-next onClick={() => act({ type: 'next' })}>Into the summer</button></div>;
  }
  if (state.phase === 'summer') {
    const out = retirees(state);
    const mine = clubOf(state, state.myClub)!.players.filter(p => out.has(p.id));
    return <div className={styles.card} data-arl-summer><h3>Summer</h3><p>Everyone is a year older. Young players grew toward their ceilings and the veterans slowed down.</p>
      <p className={styles.muted}>{mine.length ? `Retiring from your list: ${mine.map(p => `${p.name} (${p.age})`).join(', ')}.` : 'Nobody on your list is retiring.'} {out.size} players retire across the league.</p>
      <button className={styles.action} data-arl-next onClick={() => act({ type: 'next' })}>Open the draft</button></div>;
  }
  if (state.phase === 'draft') return <div className={styles.card}><p>Draft night. Open the Draft box to make your picks.</p></div>;
  return null;
}

const PANEL_TITLES: Record<Panel, string> = { match: 'Match', ladder: 'Ladder', squad: 'Squad', finals: 'Finals', club: 'Club', draft: 'Draft' };
function headline(state: LeagueState): string {
  if (state.phase === 'seasonOver') return `Season ${state.season} is over`;
  if (state.phase === 'summer') return 'Summer';
  if (state.phase === 'draft') return 'Draft night';
  const tie = state.stage === 'finals' ? myFinalsTie(state) : undefined;
  const when = state.stage === 'homeAway' ? `Round ${state.round + 1} of ${ROUNDS}` : tie ? tieName(tie.id) : `Finals week ${state.week + 1}`;
  const quarter = state.match?.quarter ?? 0;
  const what = state.phase === 'prepare' ? (state.match ? 'preparation' : 'not playing') : state.phase === 'quarter' ? `quarter ${quarter + 1}` : state.phase === 'break' ? `quarter ${quarter} break` : 'full time';
  return `${when}: ${what}`;
}

export default function AussieRulesLeagueBoard({ onStarted }: { onStarted?: () => void } = {}) {
  const game = useAussieRulesLeague();
  const state = game.state;
  /* A panel belongs to its moment: when the season ends, or the next one starts after the draft, the board is back on the hub, where the result and the next step are. */
  const moment = state ? `${state.season}:${state.phase === 'seasonOver'}` : '';
  const [view, setView] = useState<{ panel: Panel | null; moment: string }>({ panel: null, moment: '' });
  const panel = view.moment === moment ? view.panel : null;
  const setPanel = (next: Panel | null) => setView({ panel: next, moment });
  const [confirmReset, setConfirmReset] = useState(false);
  const reveal = useRevealScroll<HTMLDivElement>(`${state?.season}:${state?.round}:${state?.week}:${state?.phase}:${panel}`);
  if (!state) return <Menu notice={game.storageNotice} onPick={clubId => { if (game.start(newSeed(), clubId)) { setPanel(null); onStarted?.(); } }} />;
  const act = (action: LeagueAction) => game.dispatch(action);
  return <section className={styles.board} data-arl-phase={state.phase} data-arl-stage={state.stage} data-arl-season={state.season}>
    <header className={styles.heading}><div><p className={styles.muted}>{state.clubName} · Season {state.season}</p><h2 tabIndex={-1}>{headline(state)}</h2></div>
      <button className={styles.secondary} data-arl-newcareer onClick={() => setConfirmReset(true)}>New career</button></header>
    {confirmReset ? <div className={styles.card}><h3>Start a new career?</h3><p>Your current career, every season of it, will be replaced.</p><div className={styles.actions}>
      <button className={styles.secondary} onClick={() => setConfirmReset(false)}>Keep this career</button>
      <button className={styles.action} data-arl-confirmreset onClick={() => { game.reset(); setConfirmReset(false); setPanel(null); }}>Start again</button></div></div>
    : <div ref={reveal} className={own.stack}>
      {panel === null ? <><StatusCard state={state} act={act} /><HubTiles tiles={hubTiles(state)} onOpen={key => setPanel(key as Panel)} /></>
        : <><HubPanelHeader title={PANEL_TITLES[panel]} onBack={() => setPanel(null)} />
          {panel === 'match' && (['seasonOver', 'summer', 'draft'].includes(state.phase) ? <div className={styles.card}><p className={styles.muted}>Season {state.season + 1} starts after the summer and the draft.</p></div> : <MatchPanel state={state} act={act} />)}
          {panel === 'ladder' && <LadderPanel state={state} />}
          {panel === 'squad' && <SquadPanel state={state} act={act} />}
          {panel === 'finals' && <FinalsPanel state={state} />}
          {panel === 'club' && <ClubPanel state={state} />}
          {panel === 'draft' && <DraftPanel state={state} act={act} />}</>}
    </div>}
    {game.storageNotice && <p role="status" className={styles.muted}>{game.storageNotice}</p>}
  </section>;
}
