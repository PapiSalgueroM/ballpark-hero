import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BedDouble, BriefcaseBusiness, ChevronDown, ClipboardList, Radio, Table2, Trophy, Zap } from 'lucide-react';
import { CookieConsent } from '@/components/CookieConsent';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { RulesGate } from '@/components/game/RulesGate';
import NrlBoardChallengeNotice from '@/components/nrl-manager/NrlBoardChallengeNotice';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import NrlOriginOffice from '@/components/nrl-manager/NrlOriginOffice';
import NrlJudiciaryReview from '@/components/nrl-manager/NrlJudiciaryReview';
import NrlCareerSlots from '@/components/nrl-manager/NrlCareerSlots';
import { NrlClubIdentity, NrlCustomBadge, useNrlClubName } from '@/components/nrl-manager/NrlClubIdentity';
import NrlCustomClubForm from '@/components/nrl-manager/NrlCustomClubForm';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { resolveContinueSave, type ContinueSave } from '@/data/continueSaves';
import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { useArrivalTop } from '@/hooks/useArrivalTop';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRulesGateState } from '@/hooks/useRulesGateState';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import { nrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import {
  nrlBench, nrlBenchRotation, nrlFitLineup, nrlHalftimeInterchanges, nrlHoldableReserves, nrlIndividualRecoveryOptions, nrlIndividualRecoveryPreview, nrlInjuries,
  nrlFinalsRace, nrlLadder, nrlLeagueForm, nrlMatchdaySelection, nrlMinute60FieldGoalAvailable, nrlMinute60Interchange, nrlNextRound,
  nrlRegularRounds, nrlReserveGradeRemaining, nrlRetrainingRoles, nrlSavedLineupPreview, nrlStarterOptions, nrlUnavailable,
  NRL_BENCH_SIZE, NRL_CAPTAIN_DEFENCE, NRL_HALFTIME_TALKS, NRL_MAX_BENCH_USED, NRL_RESERVE_GRADE_ROUNDS, NRL_ROLES,
  type NrlAction, type NrlAttackPlan, type NrlCoachRole, type NrlHalftimeTalk, type NrlLiveHalf, type NrlManagerState, type NrlMatchResult, type NrlNextRound, type NrlRole, type NrlTactic,
} from '@/lib/nrlManager';
import {
  createNrlCareer, createNrlCustomCareer, isNrlNamedPlayer, loadNrlOpeningMatchdayCareer, loadNrlPerthSigningsCareer,
  nrlAttackPlanPreview, nrlCounterPlanPreview, nrlDevelopmentAssistantProgress, nrlOppositionReport, nrlPositionTraining,
  nrlBoardPathwaysQuote, nrlCoachTactics, nrlContractApproach, nrlPositionTrainingCandidates, nrlReserveGradeCandidates, nrlRivalSquad,
  nrlSelectionPromise, nrlSponsorRefusal, nrlTicketPricingRefusal, nrlWorldCupAppointmentAvailable,
  NRL_DEVELOPMENT_ASSISTANT, NRL_FAST_FORWARD_ROUNDS, NRL_POSITION_TRAINING_ROUNDS, NRL_SAVE_MAX_CHARS, NRL_SELECTION_PROMISE, reduceNrlCareer, runNrlFastForward,
  type NrlCareerAction, type NrlCareerState, type NrlFastForwardRequest, type NrlFastForwardStop,
} from '@/lib/nrlCareer';
import { judiciaryNeedsResponse, nrlJudiciaryBans, nrlJudiciaryCase } from '@/lib/nrlJudiciary';
import { nrlScorePoints, nrlScoringLeaders, nrlSquadSeasonStats, nrlTryLeaders, type NrlSquadStatsScope } from '@/lib/nrlPlayerScoring';
import { NRL_SAVE_ENTRY, nrlSeasonCanCredit, readNrlReplayCutoff, readNrlSaveSlot, writeNrlSaveSlot } from '@/lib/nrlSaveSlots';
import { saveFence } from '@/lib/saveFence';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import { holdPendingSave } from '@/lib/safeStorage';
import { NRL_WORLD_CUP_STAGES } from '@/lib/nrlWorldCupSave';
import { nrlClubName, type NrlCustomClub } from '@/lib/nrlClubIdentity';

const SLUG = 'nrl-team-manager';
const loadWorldCup = () => import('@/components/nrl-manager/NrlWorldCup');
const YEARS = [2026, 2027] as const;
const goldenPointMethods = { tries: 'a try', penalties: 'a penalty goal', longFieldGoals: 'a two-point field goal', fieldGoals: 'a field goal' };
const PANELS = [
  { id: 'match', label: 'Match centre', Icon: Radio },
  { id: 'squad', label: 'Squad', Icon: ClipboardList },
  { id: 'ladder', label: 'Ladder', Icon: Table2 },
  { id: 'office', label: 'Club office', Icon: BriefcaseBusiness },
] as const;
type Panel = typeof PANELS[number]['id'];
const OFFICE_SCREENS = [
  { id: 'contracts', label: 'Contracts' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'academy', label: 'Academy' },
  { id: 'finances', label: 'Finances' },
  { id: 'history', label: 'Season review' },
] as const;
type OfficeScreen = typeof OFFICE_SCREENS[number]['id'];

const tactics: { id: NrlTactic; label: string; description: string }[] = [
  { id: 'balanced', label: 'Balanced', description: 'Keep your attack and defence even.' },
  { id: 'attack', label: 'Attack', description: 'Chase tries and risk leaving gaps.' },
  { id: 'defense', label: 'Defence', description: 'Protect your line and create fewer chances.' },
];
const halftimeTalkLabels: Record<NrlHalftimeTalk, string> = {
  reinforceBasics: 'Reinforce the basics',
  liftTempo: 'Lift the tempo',
};
const halftimeTalkChoices = ['reinforceBasics', 'liftTempo'] as const;
const attackPlanChoices: readonly { id: NrlAttackPlan; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'middle', label: 'Through the middle' },
  { id: 'wide', label: 'Shift wide' },
  { id: 'counter', label: 'Counter opponent' },
];
const attackPlanLabel = (plan: NrlAttackPlan) => attackPlanChoices.find(choice => choice.id === plan)?.label ?? 'Standard';
const opponentStyleLabel = { middle: 'Pressures the middle', edges: 'Plays to the edges' };
const counterPlanLabel = { middle: 'Shift wide to avoid middle pressure.', edges: 'Protect the edges and commit less to attack.' };
const counterPlanResult = { middle: 'Shifted wide against middle pressure.', edges: 'Protected the edges against wide play.' };
const coachTacticNote = (role: NrlCoachRole | undefined, bonus: number, tactic: NrlTactic) => role === tactic
  ? ` Your assistant adds +${bonus} ${role === 'attack' ? 'attack' : 'defence'} rating.` : '';

function ClubChooser({ year, onYear, onStart, disabled, loading, loadFailed }: {
  year: NrlYear; onYear: (year: NrlYear) => void;
  onStart: (clubId: string, boardChallenge: boolean, openingNames: boolean, judiciary: boolean, custom?: NrlCustomClub) => void;
  disabled: boolean; loading: boolean; loadFailed: boolean;
}) {
  const [boardChallenge, setBoardChallenge] = useState(false);
  const [openingNames, setOpeningNames] = useState(false);
  const [judiciary, setJudiciary] = useState(false);
  const [reloadUnavailable, setReloadUnavailable] = useState(false);
  const competition = NRL_SEASONS[year];
  const rosterLabel = year === 2026 ? '2026 matchday names' : 'Perth Bears signings';
  return (
    <section aria-labelledby="nrl-choose-club" className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-bold">Choose a season</h2>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Starting season">
          {YEARS.map(option => (
            <Button key={option} type="button" size="lg" variant={year === option ? 'default' : 'outline'}
              aria-pressed={year === option} disabled={disabled}
              onClick={() => { if (year !== option) setOpeningNames(false); onYear(option); }} className="h-auto min-h-12 flex-col gap-0 whitespace-normal px-2 py-2">
              <span className="text-base font-bold">{option}</span>
              <span className="text-xs">{option === 2027 ? 'Perth Bears debut' : '17 clubs'}</span>
            </Button>
          ))}
        </div>
        <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border bg-background p-2 text-sm">
          <input type="checkbox" checked={openingNames} disabled={disabled} onChange={event => {
            setOpeningNames(event.target.checked);
            if (event.target.checked) setJudiciary(false);
          }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            <span className="block font-semibold">{year === 2026 ? '2026 opening matchday names' : 'Perth Bears confirmed signings'}</span>
            <span className="block text-muted-foreground">{year === 2026
              ? 'Start each club with 19 verified names and opening ages, plus 11 generated players. Ratings, wages and contracts are simulated.'
              : 'Start as Perth with 27 confirmed signings and three generated players. Ages, ratings, contracts and the draw are simulated. Other clubs use generated squads.'}</span>
          </span>
        </label>
        <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border bg-background p-2 text-sm">
          <input type="checkbox" checked={judiciary} disabled={disabled || openingNames} onChange={event => setJudiciary(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            <span className="block font-semibold">Judiciary challenge</span>
            <span className="block text-muted-foreground">Generated squads only. Choose an early plea or hearing if a fictional club player is charged after a match.</span>
          </span>
        </label>
        <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border bg-background p-2 text-sm">
          <input type="checkbox" checked={boardChallenge} disabled={disabled} onChange={event => setBoardChallenge(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            <span className="block font-semibold">Board challenge</span>
            <span className="block text-muted-foreground">Miss two targets in a row at one club and you must move after finals. A premiership clears the warning.</span>
          </span>
        </label>
      </div>
      <NrlCustomClubForm year={year} disabled={disabled}
        onStart={club => onStart(club.slotId, boardChallenge, false, judiciary, club)} />
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 id="nrl-choose-club" className="text-xl font-display font-bold">Choose your club</h2>
        <p className="text-sm text-muted-foreground">{competition.clubs.length} clubs · {competition.draw.length} rounds</p>
      </div>
      {loading && <p role="status" className="text-sm">Loading the {rosterLabel}...</p>}
      {loadFailed && openingNames && (
        <div role="alert" className="rounded-xl border border-border bg-card p-3 text-sm">
          Could not load the {rosterLabel}. Clear the option to start with a generated squad.
          <button type="button" className="ml-2 min-h-11 font-bold underline" disabled={disabled}
            onClick={() => { if (!reloadToRetryChunk()) setReloadUnavailable(true); }}>Reload to try names again</button>
          {reloadUnavailable && <p>Reconnect or finish saving in this tab, then try reloading again.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {competition.clubs.map(club => (
          <button key={club.id} type="button" disabled={disabled} data-nrl-club={club.id}
            aria-label={`Manage ${club.name}`} onClick={() => onStart(club.id, boardChallenge, openingNames && (year === 2026 || club.id === 'bears'), judiciary)}
            className="group flex min-h-24 min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
            <span className="text-sm font-bold leading-snug sm:text-base">{club.name}</span>
            <span className="mt-2 flex w-full items-center justify-between gap-1 text-xs text-muted-foreground">
              Rating {club.strength}<ArrowRight size={15} aria-hidden="true" className="shrink-0 text-primary" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function scoreLine(result: NrlMatchResult, year: number, shortName: ReturnType<typeof useNrlClubName>) {
  return `${shortName(year, result.homeId)} ${result.homeScore}–${result.awayScore} ${shortName(year, result.awayId)}`;
}

function LiveHalftime({ live, season, title, onAction, disabled, coachRole, coachBonus }: {
  live: NrlLiveHalf; season: NrlManagerState; title: string;
  onAction: (action: NrlAction) => void; disabled: boolean; coachRole?: NrlCoachRole; coachBonus: number;
}) {
  const shortName = useNrlClubName();
  const { year, tactic: openingTactic, squad } = season;
  const [tactic, setTactic] = useState(openingTactic);
  const [reserveId, setReserveId] = useState('');
  const [secondReserveId, setSecondReserveId] = useState('');
  const [talk, setTalk] = useState<NrlHalftimeTalk>();
  const talkEffect = talk && NRL_HALFTIME_TALKS[talk];
  const { fixture, homeScoring, awayScoring } = live;
  const sides = [[fixture.homeId, homeScoring], [fixture.awayId, awayScoring]] as const;
  const options = nrlHalftimeInterchanges(season);
  const chosen = options.find(option => option.reserveId === reserveId);
  const secondOptions = chosen ? options.filter(option => option.starterId !== chosen.starterId) : [];
  const second = secondOptions.find(option => option.reserveId === secondReserveId);
  const heldName = live.heldReserveId && squad.find(player => player.id === live.heldReserveId)?.name;
  const name = (id: string) => squad.find(player => player.id === id)?.name;
  const halfChoices = {
    year, round: fixture.round, tactic, talk,
    interchange: chosen && { starterId: chosen.starterId, reserveId: chosen.reserveId },
    secondInterchange: second && { starterId: second.starterId, reserveId: second.reserveId },
  };
  return (
    <section className="space-y-4" aria-labelledby="nrl-halftime">
      <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950 p-4 text-emerald-50 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">{title}</p>
        <h2 id="nrl-halftime" className="mt-2 font-display text-2xl font-black">Half time</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3" aria-label="First-half score" data-nrl-halftime>
          {sides.map(([id, scoring]) => (
            <li key={id} className="min-w-0 rounded-xl bg-black/20 p-3">
              <p className="break-words text-sm font-semibold">{shortName(year, id)}</p>
              <strong className="block font-display text-3xl tabular-nums">{nrlScorePoints(scoring)}</strong>
              <p className="mt-1 text-xs text-emerald-100">
                {scoring.tries} {scoring.tries === 1 ? 'try' : 'tries'} · {scoring.conversions} {scoring.conversions === 1 ? 'conversion' : 'conversions'}
                {scoring.penalties > 0 && ' · 1 penalty goal'}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-bold">Second-half tactic</h3>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Second-half tactic">
          {tactics.map(option => (
            <Button key={option.id} type="button" size="lg" className="px-3"
              variant={tactic === option.id ? 'default' : 'outline'} disabled={disabled}
              aria-pressed={tactic === option.id} onClick={() => setTactic(option.id)}>
              {option.id === openingTactic ? `Keep ${option.label.toLowerCase()}` : option.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{tactics.find(option => option.id === tactic)?.description}{coachTacticNote(coachRole, coachBonus, tactic)}</p>
        {season.attackPlan && <p className="mt-2 text-sm">Attack plan: {attackPlanLabel(season.attackPlan)}. Locked for this match.</p>}
        {season.preparation === 'defensiveDrills' && <p className="mt-2 text-sm">Defensive drills apply through the second half.</p>}
      </div>
      {options.length > 0 ? (
        <details className="group rounded-xl border border-border bg-card px-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>{chosen ? `${name(chosen.reserveId)} ${chosen.enteredAtHalf ? 'comes on' : 'stays on'}` : heldName ? 'Halftime interchange' : 'Keep a reserve on'}</span>
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="pb-4">
            <label htmlFor="nrl-half-reserve" className="sr-only">Reserve to finish the match</label>
            <select id="nrl-half-reserve" className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={reserveId} disabled={disabled} onChange={event => {
                const id = event.target.value;
                setReserveId(id);
                if (!id || id === secondReserveId) setSecondReserveId('');
              }}>
              <option value="">{heldName ? 'Keep held reserve on the bench' : 'Automatic rotation'}</option>
              {options.map(option => <option key={option.reserveId} value={option.reserveId}>{option.enteredAtHalf && 'Bring on '}{name(option.reserveId)} · {option.role}</option>)}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">{heldName
              ? `${heldName} sat out the first half. Bring them on now or keep them for the 60-minute pause. You can also keep a rotating reserve on at another position.`
              : 'Choose up to two reserves already in the rotation to finish. Their starters stay off.'}</p>
            {secondOptions.length > 0 && (
              <label className="mt-3 block text-sm font-semibold" htmlFor="nrl-half-second-reserve">
                Second reserve to finish the match
                <select id="nrl-half-second-reserve" className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={secondReserveId} disabled={disabled} onChange={event => setSecondReserveId(event.target.value)}>
                  <option value="">No second change</option>
                  {secondOptions.map(option => <option key={option.reserveId} value={option.reserveId}>{option.enteredAtHalf && 'Bring on '}{name(option.reserveId)} · {option.role}</option>)}
                </select>
              </label>
            )}
            {[chosen, second].map(change => change && <p key={change.reserveId} className="mt-1 text-sm" data-nrl-halftime-choice>
              {name(change.reserveId)} {change.enteredAtHalf ? 'comes on for the second half.' : 'finishes the match.'} {name(change.starterId)} stays off.
            </p>)}
          </div>
        </details>
      ) : (
        <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          The only rotating reserve covers the goal kicker’s position. Automatic rotation keeps the kicker available for the finish.
        </p>
      )}
      <fieldset className="min-w-0 rounded-xl border border-border bg-card px-4 pb-4" aria-describedby="nrl-halftime-talk-effect">
        <legend className="px-1 font-bold">Half-time team talk</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="lg" variant={talk === undefined ? 'default' : 'outline'} disabled={disabled}
            aria-pressed={talk === undefined} onClick={() => setTalk(undefined)}>No team talk</Button>
          {halftimeTalkChoices.map(choice => (
            <Button key={choice} type="button" size="lg" variant={talk === choice ? 'default' : 'outline'} disabled={disabled}
              aria-pressed={talk === choice} onClick={() => setTalk(choice)}>{halftimeTalkLabels[choice]}</Button>
          ))}
        </div>
        <p id="nrl-halftime-talk-effect" className="mt-2 text-sm text-muted-foreground" aria-live="polite">
          {talkEffect ? `Second-half regulation: ${talkEffect.attack > 0 ? '+' : ''}${talkEffect.attack} attack, ${talkEffect.defense > 0 ? '+' : ''}${talkEffect.defense} defence.`
            : 'Keep your current ratings or choose a small second-half trade-off.'}
        </p>
      </fieldset>
      <Button type="button" size="lg" className="w-full" disabled={disabled}
        onClick={() => onAction({ type: 'finishLive', ...halfChoices })}>
        Play second half <ArrowRight aria-hidden="true" />
      </Button>
      <Button type="button" size="lg" variant="outline" className="w-full" disabled={disabled}
        onClick={() => onAction({ type: 'reachMinute60', ...halfChoices })}>
        Play to 60 minutes
      </Button>
    </section>
  );
}

function LiveMinute60({ live, season, onAction, disabled }: {
  live: NrlLiveHalf; season: NrlManagerState; onAction: (action: NrlAction) => void; disabled: boolean;
}) {
  const shortName = useNrlClubName();
  const stage = live.minute60!;
  const [tactic, setTactic] = useState(stage.tactic);
  const [bringOn, setBringOn] = useState(false);
  const [fieldGoal, setFieldGoal] = useState(false);
  const { year, squad } = season;
  const canSetUpKick = nrlMinute60FieldGoalAvailable(season);
  const late = nrlMinute60Interchange(season);
  const reserve = late && squad.find(player => player.id === late.reserveId);
  const starter = late && squad.find(player => player.id === late.starterId);
  const { fixture } = live;
  const sides = [[fixture.homeId, stage.homeScoring], [fixture.awayId, stage.awayScoring]] as const;
  return (
    <section className="space-y-4" aria-labelledby="nrl-minute60">
      <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950 p-4 text-emerald-50 sm:p-6">
        <h2 id="nrl-minute60" className="font-display text-2xl font-black">60 minutes</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3" aria-label="Score after 60 minutes">
          {sides.map(([clubId, scoring]) => (
            <li key={clubId} className="min-w-0 rounded-xl bg-black/20 p-3">
              <p className="break-words text-sm font-semibold">{shortName(year, clubId)}</p>
              <strong className="block font-display text-3xl tabular-nums">{nrlScorePoints(scoring)}</strong>
            </li>
          ))}
        </ul>
      </div>
      <fieldset className="min-w-0 rounded-xl border border-border bg-card px-4 pb-4">
        <legend className="px-1 font-bold">Closing tactic</legend>
        <p className="mt-2 text-sm text-muted-foreground">Keep your plan or change it for the final 20 minutes and any extra time.</p>
        {season.attackPlan === 'counter' && <p className="mt-2 text-sm">Attack plan: Counter opponent. Locked for this match.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {tactics.map(option => (
            <Button key={option.id} type="button" size="lg" className="px-3" disabled={disabled}
              variant={tactic === option.id ? 'default' : 'outline'} aria-pressed={tactic === option.id}
              onClick={() => setTactic(option.id)}>{option.label}</Button>
          ))}
        </div>
      </fieldset>
      {reserve && starter && (
        <fieldset className="min-w-0 rounded-xl border border-border bg-card px-4 pb-3">
          <legend className="px-1 font-bold">Late interchange</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={bringOn} disabled={disabled} onChange={event => setBringOn(event.target.checked)} />
            Bring on {reserve.name}
          </label>
          <p className="text-sm text-muted-foreground">{reserve.name} can replace {starter.name} at {late.role} for the rest of the match.</p>
        </fieldset>
      )}
      {canSetUpKick && (
        <fieldset className="min-w-0 rounded-xl border border-border bg-card px-4 pb-3" data-nrl-late-field-goal>
          <legend className="px-1 font-bold">Late scoring plan</legend>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={fieldGoal} disabled={disabled} onChange={event => setFieldGoal(event.target.checked)} />
            Set up a field goal
          </label>
          <p className="text-sm text-muted-foreground">Trade a little late try threat for a better chance at a field goal if the score stays close in regulation.</p>
        </fieldset>
      )}
      <Button type="button" size="lg" className="w-full" disabled={disabled}
        onClick={() => onAction({ type: 'finishMinute60', year, round: fixture.round, tactic, reserveId: bringOn ? reserve?.id : undefined,
          ...(canSetUpKick && fieldGoal && { fieldGoalPlan: true }) })}>
        Play final 20 minutes <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

const edgeNumber = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const formLabels = { W: 'Win', D: 'Draw', L: 'Loss' };

function AttackPlan({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => void; disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { season, legacySeason } = career;
  const { year, clubId, round, attackPlan } = season;
  const preview = expanded ? nrlAttackPlanPreview(career) : null;
  const counter = expanded ? nrlCounterPlanPreview(career) : null;
  return (
    <details className="group mt-3 border-t border-border" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>Attack plan{attackPlan && `: ${attackPlanLabel(attackPlan)}`}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      {expanded && (preview || counter ? (
        <>
          {preview && <p className="text-xs text-muted-foreground">Compare projected ratings for this match. The middle uses props, hooker and lock. Wide uses wings and centres. Either specialist plan leaves more room for the opposition.</p>}
          {counter && <p className="mt-2 text-xs text-muted-foreground">Simulated opponent style: {opponentStyleLabel[counter.style]}. {counterPlanLabel[counter.style]}</p>}
          <div className="mt-2 grid gap-2" role="group" aria-label="Match attack plan">
            {attackPlanChoices.map(({ id, label }) => {
              const adjustment = id === 'standard' ? null : id === 'counter' ? counter : preview?.[id];
              if (id !== 'standard' && !adjustment) return null;
              return (
                <Button key={id} type="button" size="lg" variant={(attackPlan ?? 'standard') === id ? 'default' : 'outline'}
                  className="h-auto min-h-11 flex-wrap justify-start gap-x-2 gap-y-0.5 whitespace-normal px-3 py-2 text-left"
                  aria-pressed={(attackPlan ?? 'standard') === id} disabled={disabled}
                  onClick={() => onAction({ type: 'setAttackPlan', attackPlan: id, year, clubId, round })}>
                  <span>{label}</span>
                  {adjustment && <span className="flex flex-wrap gap-x-2 text-xs tabular-nums">
                    <span>Attack {edgeNumber.format(adjustment.attack)}</span>
                    <span>Defence {edgeNumber.format(adjustment.defense)}</span>
                  </span>}
                </Button>
              );
            })}
          </div>
        </>
      ) : <p className="text-xs text-muted-foreground">{legacySeason
        ? 'Attack plans unlock after the imported season.'
        : 'Attack plans need saved opponent ratings for all starting positions.'}</p>)}
    </details>
  );
}

function OppositionReport({ career }: { career: NrlCareerState }) {
  const shortName = useNrlClubName();
  const [expanded, setExpanded] = useState(false);
  const report = expanded ? nrlOppositionReport(career) : null;
  const { year, attackPlan } = career.season;
  return (
    <details className="group rounded-xl border border-border bg-card px-4" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Opposition report <ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />
      </summary>
      {report && (
        <div className="pb-4">
          <p className="text-sm font-semibold">
            {shortName(year, report.opponentId)}{report.ladderRank === null ? '' : ` · Ladder place ${report.ladderRank}`}
          </p>
          {report.style && <p className="mt-1 text-xs text-muted-foreground">Simulated opponent style: {opponentStyleLabel[report.style]}.</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border p-2">
              <dt className="text-xs text-muted-foreground">Your attack edge</dt>
              <dd className="mt-1 font-bold tabular-nums" data-nrl-attack-edge>{edgeNumber.format(report.attackEdge)}</dd>
            </div>
            <div className="rounded-lg border border-border p-2">
              <dt className="text-xs text-muted-foreground">Your defence edge</dt>
              <dd className="mt-1 font-bold tabular-nums" data-nrl-defense-edge>{edgeNumber.format(report.defenseEdge)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">Positive edges favour your club. The model uses your lineup, preparation, tactic and venue.</p>
          {report.attackPlans && (
            <>
              <table className="mt-3 w-full text-left text-xs sm:text-sm" data-nrl-opposition-attack-plans>
                <caption className="pb-1 text-left font-semibold">Attack plan comparison</caption>
                <thead className="text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 pr-2 font-medium">Plan</th>
                    <th scope="col" className="px-1 text-right font-medium">Attack</th>
                    <th scope="col" className="px-1 text-right font-medium">Defence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.attackPlans.map(({ plan, attackEdge, defenseEdge }) => (
                    <tr key={plan}>
                      <th scope="row" className="py-1 pr-2 font-medium">
                        {attackPlanLabel(plan)}
                        {(attackPlan ?? 'standard') === plan && <span className="block text-xs text-muted-foreground">Current</span>}
                      </th>
                      <td className="px-1 text-right tabular-nums">{edgeNumber.format(attackEdge)}</td>
                      <td className="px-1 text-right tabular-nums">{edgeNumber.format(defenseEdge)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-xs text-muted-foreground">Uses automatic rotation. Choose your plan in Attack plan.</p>
            </>
          )}
          {report.meetings.length > 0 && (
            <div className="mt-4" data-nrl-opposition-meetings>
              <h3 className="text-sm font-semibold">Head-to-head this season</h3>
              <ol aria-label="Results against this opponent" className="mt-1 divide-y divide-border text-sm">
                {report.meetings.map(match => (
                  <li key={match.round} className="flex flex-wrap justify-between gap-x-2 py-2">
                    <span className="text-muted-foreground">{roundLabel(match.round, nrlRegularRounds(year))}</span>
                    <strong className="tabular-nums">{shortName(year, career.season.clubId)} {match.scored} to {match.conceded} {shortName(year, report.opponentId)}</strong>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <h3 className="mt-4 text-sm font-semibold">Recent form</h3>
          {report.recent.length ? (
            <ol className="mt-1 divide-y divide-border text-sm" data-nrl-opposition-form>
              {report.recent.map(result => (
                <li key={result.round} className="grid grid-cols-[3rem_auto_1fr] items-center gap-2 py-2">
                  <span>{formLabels[result.outcome]}</span>
                  <strong className="tabular-nums">{result.scored}–{result.conceded}</strong>
                  <span className="min-w-0 break-words text-right text-muted-foreground">{shortName(year, result.rivalId)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-1 text-sm text-muted-foreground">No matches played this season yet.</p>}
        </div>
      )}
    </details>
  );
}

function NrlMatchdayTeamSheet({ match, squad }: { match: NrlMatchResult; squad: NrlManagerState['squad'] }) {
  const [expanded, setExpanded] = useState(false);
  const scoring = match.playerScoring;
  if (!scoring) return null;
  const players = new Map(squad.map(player => [player.id, player.name]));
  const points = new Map(scoring.lines.map(line => [line.playerId, nrlScorePoints(line)]));
  const groups = [
    { label: 'Starting 13', rows: scoring.starters.map((id, index) => ({ id, role: NRL_ROLES[index] })) },
    { label: 'Reserves used', rows: (match.benchUsed ?? []).map(id => ({ id, role: undefined })) },
  ];
  return (
    <details className="group mt-3 rounded-lg border border-border bg-background px-3" data-nrl-matchday-team-sheet
      onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Matchday team sheet <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      {expanded && <div className="grid gap-3 border-t border-border py-2 text-sm sm:grid-cols-2">
        {groups.map(({ label, rows }) => (
          <div key={label} className="min-w-0">
            <p className="font-semibold">{label}</p>
            {rows.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">No reserves played.</p> : (
              <ol role="list" aria-label={label} className="mt-1 divide-y divide-border">
                {rows.map(({ id, role }) => (
                  <li key={id} data-nrl-team-sheet-player={id} className="flex items-start justify-between gap-2 py-1.5">
                    <div className="min-w-0 break-words">
                      <span className="block font-medium">{players.get(id)}</span>
                      {role && <span className="block text-xs text-muted-foreground">
                        {role}{id === scoring.kickerId && <> · <span>Goal kicker</span></>}
                      </span>}
                    </div>
                    <span className="shrink-0 tabular-nums">{points.get(id) ?? 0} pts</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>}
    </details>
  );
}

function NrlMatchDetails({ match, season }: { match: NrlMatchResult; season: NrlManagerState }) {
  const shortName = useNrlClubName();
  const { year } = season;
  const goldenPoint = match.goldenPoint;
  const periods = match.scorePeriods;
  const usedReserves = match.benchUsed?.map(id => season.squad.find(player => player.id === id)?.name).filter(Boolean) ?? [];
  const scorers = match.playerScoring?.lines ?? [];
  const kickerId = match.playerScoring?.kickerId;
  const kickerName = kickerId && season.squad.find(player => player.id === kickerId)?.name;
  const injury = match.injury;
  const injuredName = injury && season.squad.find(player => player.id === injury.playerId)?.name;
  const recoveredName = match.individualRecoveryId && season.squad.find(player => player.id === match.individualRecoveryId)?.name;
  const captainName = match.captainId && season.squad.find(player => player.id === match.captainId)?.name;
  const interchanges = [match.halftimeInterchange, match.secondHalftimeInterchange];
  const late = match.minute60Interchange;
  const lateReserve = late && season.squad.find(player => player.id === late.reserveId);
  const lateStarter = late && season.squad.find(player => player.id === late.starterId);
  return (
    <>
      {periods && (
        <table className="mt-3 w-full text-left text-sm" data-nrl-score-periods>
          <caption className="pb-1 text-left font-semibold">Score by period</caption>
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 pr-2 font-medium">Period</th>
              <th scope="col" className="px-1 text-center font-medium">{shortName(year, match.homeId)}</th>
              <th scope="col" className="px-1 text-center font-medium">{shortName(year, match.awayId)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(periods.at60 ? [
              { label: 'First half', start: [0, 0], end: periods.halfTime },
              { label: '40 to 60 min', start: periods.halfTime, end: periods.at60 },
              { label: '60 to 80 min', start: periods.at60, end: periods.regulation },
            ] : [
              { label: 'First half', start: [0, 0], end: periods.halfTime },
              { label: 'Second half', start: periods.halfTime, end: periods.regulation },
            ]).concat(match.extraTime ? [{
              label: 'Extra time', start: periods.regulation, end: [match.homeScore, match.awayScore],
            }] : []).map(({ label, start, end }) => (
              <tr key={label}>
                <th scope="row" className="py-1 pr-2 font-medium">{label}</th>
                <td className="px-1 text-center tabular-nums">{end[0] - start[0]}</td>
                <td className="px-1 text-center tabular-nums">{end[1] - start[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {match.halftimeTalk && <p className="mt-2 text-sm text-muted-foreground" data-nrl-halftime-talk>
        Half-time talk: {halftimeTalkLabels[match.halftimeTalk]}.
      </p>}
      {match.minute60Tactic && <p className="mt-2 text-sm text-muted-foreground" data-nrl-minute60-tactic>
        60-minute tactic change: {tactics.find(option => option.id === match.minute60Tactic)?.label}.
      </p>}
      {match.minute60FieldGoal !== undefined && <p className="mt-2 text-sm text-muted-foreground" data-nrl-minute60-field-goal>
        {match.minute60FieldGoal === 0 ? 'No field goal in regulation after the setup.'
          : `Field-goal setup produced a ${match.minute60FieldGoal === 1 ? 'one-point' : 'two-point'} kick in regulation.`}
      </p>}
      {match.counterStyle && <p className="mt-2 text-sm text-muted-foreground" data-nrl-counter-plan>
        Counter plan: {counterPlanResult[match.counterStyle]}
      </p>}
      {kickerName && <p className="mt-2 text-sm text-muted-foreground" data-nrl-match-kicker>Match goal kicker: {kickerName}.</p>}
      {recoveredName && <p className="mt-2 text-sm text-muted-foreground" data-nrl-individual-recovery-result>
        {recoveredName} took individual recovery before this match.
      </p>}
      {captainName && <p className="mt-2 text-sm text-muted-foreground" data-nrl-match-captain>Club captain: {captainName}.</p>}
      {goldenPoint && (
        <p className="mt-2 text-sm text-muted-foreground" data-nrl-golden-point>
          {goldenPoint === 'draw' ? 'Golden point ended scoreless after two five-minute periods.'
            : `${shortName(year, match.homeScore > match.awayScore ? match.homeId : match.awayId)} won with ${goldenPointMethods[goldenPoint.score]} in the ${goldenPoint.period === 1 ? 'first' : 'second'} five-minute period of golden point.`}
        </p>
      )}
      {usedReserves.length > 0 && <div className="mt-3 text-sm" data-nrl-interchange>
        <h4 className="font-semibold">Interchange used</h4>
        <p className="text-muted-foreground">{usedReserves.join(", ")}</p>
        {interchanges.map(change => {
          if (!change) return null;
          const reserve = season.squad.find(player => player.id === change.reserveId)?.name;
          const starter = season.squad.find(player => player.id === change.starterId)?.name;
          return reserve && starter && <p key={change.reserveId} className="mt-1 text-muted-foreground" data-nrl-halftime-interchange>
            {change.enteredAtHalf
              ? `${reserve} came on for ${starter} at half time. Each played about 40 minutes in regulation.`
              : `${reserve} finished the match. In regulation, they played about 53 minutes. ${starter} stayed off after half time and played about 27 minutes.`}
          </p>;
        })}
        {lateReserve && lateStarter && <p className="mt-1 text-muted-foreground" data-nrl-minute60-interchange>
          {lateReserve.name} came on for {lateStarter.name} after 60 minutes.
        </p>}
      </div>}
      {scorers.length > 0 && (
        <div className="mt-3 text-sm" data-nrl-scorers>
          <h4 className="font-semibold">Your scorers</h4>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {scorers.map(line => {
              const goals = line.conversions + line.penalties;
              const fieldGoals = line.fieldGoals + line.longFieldGoals;
              const detail = [
                `${nrlScorePoints(line)} pts`,
                line.tries > 0 && `${line.tries} ${line.tries === 1 ? 'try' : 'tries'}`,
                goals > 0 && `${goals} ${goals === 1 ? 'goal' : 'goals'}`,
                fieldGoals > 0 && `${fieldGoals} ${fieldGoals === 1 ? 'field goal' : 'field goals'}`,
              ].filter(Boolean).join(' · ');
              return (
                <li key={line.playerId} className="flex flex-wrap justify-between gap-x-3">
                  <span>{season.squad.find(player => player.id === line.playerId)?.name}</span>
                  <span>{detail}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <NrlMatchdayTeamSheet key={`${year}:${match.round}`} match={match} squad={season.squad} />
      {injury && injuredName && (
        <p className="mt-3 text-sm text-muted-foreground" data-nrl-match-injury>
          {injuredName} picked up a knock and will miss {injury.rounds} {injury.rounds === 1 ? 'round' : 'rounds'}.
        </p>
      )}
    </>
  );
}

function SavedMatchReport({ label, match, season }: { label: string; match: NrlMatchResult; season: NrlManagerState }) {
  const shortName = useNrlClubName();
  const [expanded, setExpanded] = useState(false);
  return (
    <details className="mt-1 rounded-lg border border-border bg-background px-3"
      onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {label} match report
      </summary>
      {expanded && <div className="border-t border-border pb-3 pt-2">
        <p className="text-sm font-semibold">{scoreLine(match, season.year, shortName)}{match.extraTime ? ' after extra time' : ''}</p>
        <NrlMatchDetails match={match} season={season} />
      </div>}
    </details>
  );
}

function roundLabel(round: number, regularRounds: number) {
  return round <= regularRounds ? 'Round ' + round
    : round === regularRounds + 4 ? 'Grand final' : 'Finals week ' + (round - regularRounds);
}

function SeasonFixtures({ season, next }: { season: NrlManagerState; next: NrlNextRound }) {
  const shortName = useNrlClubName();
  const { year, clubId, results } = season;
  const { draw, clubs } = nrlSeasonPlan(year);
  const [view, setView] = useState('');
  const round = Number(view);
  const regular = draw[round - 1];
  const settled = results.filter(match => match.round === round);
  const managedResult = settled.find(match => match.homeId === clubId || match.awayId === clubId);
  const upcoming = regular?.map(([homeId, awayId]) => ({ homeId, awayId }))
    ?? (next.finalsRound !== null && next.round === round ? next.fixtures : []);
  const matches = settled.length
    ? settled.map(match => ({ homeId: match.homeId, label: scoreLine(match, year, shortName) }))
    : upcoming.map(match => ({ homeId: match.homeId, label: `${shortName(year, match.homeId)} vs ${shortName(year, match.awayId)}` }));
  const byes = regular ? clubs.filter(club => !regular.some(pair => pair.includes(club.id))) : [];
  const finals = new Set(results.filter(match => match.finalsRound !== undefined).map(match => match.round));
  if (next.finalsRound !== null && next.fixtures.length) finals.add(next.round);

  return (
    <details className="rounded-xl border border-border bg-card px-4">
      <summary className="flex min-h-11 cursor-pointer items-center font-bold">Season fixtures</summary>
      <label className="mb-2 block max-w-xs space-y-1 text-sm font-semibold">
        <span>Fixtures to show</span>
        <select value={view} onChange={event => setView(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option value="">My club</option>
          <optgroup label="League rounds">
            {draw.map((_, index) => <option key={index + 1} value={index + 1}>Round {index + 1}</option>)}
          </optgroup>
          {finals.size > 0 && (
            <optgroup label="Finals">
              {[...finals].map(number => <option key={number} value={number}>
                {roundLabel(number, draw.length)}
              </option>)}
            </optgroup>
          )}
        </select>
      </label>
      {view ? (
        <div className="pb-2 text-sm">
          <p className="text-xs text-muted-foreground">{settled.length ? 'Results from this career' : 'Upcoming in this career'}</p>
          <ol aria-label="League round matches" className="divide-y divide-border">
            {matches.map(match => <li key={match.homeId} className="break-words py-2">
              {match.label}
            </li>)}
          </ol>
          {managedResult && <SavedMatchReport key={round} label={roundLabel(round, draw.length)} match={managedResult} season={season} />}
          {byes.length > 0 && <p className="border-t border-border pt-2 text-muted-foreground">
            {byes.length === 1 ? 'Bye' : 'Byes'} · {byes.map(club => shortName(year, club.id)).join(', ')}
          </p>}
        </div>
      ) : (
        <ol aria-label="Club season fixtures" className="divide-y divide-border pb-2 text-sm">
          {draw.map((round, index) => {
            const fixture = round.find(([home, away]) => home === clubId || away === clubId);
            const result = results.find(row => row.round === index + 1 && (row.homeId === clubId || row.awayId === clubId));
            return (
              <li key={index} className="py-2">
                <div className="flex flex-wrap justify-between gap-x-2">
                  <span className="text-muted-foreground">Round {index + 1}</span>
                  <span>{result ? scoreLine(result, year, shortName) : fixture ? `${shortName(year, fixture[0])} vs ${shortName(year, fixture[1])}` : 'Bye'}</span>
                </div>
                {result && <SavedMatchReport label={roundLabel(index + 1, draw.length)} match={result} season={season} />}
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}

const fastForwardStops: Record<NrlFastForwardStop, string> = {
  injury: 'A player picked up a new injury. Check your squad.',
  lineup: 'Check your matchday lineup before playing.',
  academy: 'An academy report is ready in the Club office.',
  development: 'A training or development plan finished.',
  applications: 'Check summer job applications in Season review before advancing.',
  finals: 'The regular season is complete. Play the finals one round at a time.',
  judiciary: 'A Judiciary review needs a response in Match centre.',
  'contract-approach': 'A rival contract offer is ready in Contracts.',
};
type FastForwardResult = { rounds: number; stop: NrlFastForwardStop | null };

function FastForward({ career, onRun, disabled }: {
  career: NrlCareerState; onRun: (request: NrlFastForwardRequest) => FastForwardResult | null; disabled: boolean;
}) {
  const shortName = useNrlClubName();
  const { year, round, clubId, phase } = career.season;
  const [expanded, setExpanded] = useState(false);
  const [target, setTarget] = useState<{ round: number; through: number }>();
  const [receipt, setReceipt] = useState<(FastForwardResult & { round: number }) | null>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const fixtures = phase === 'regular' ? nrlSeasonPlan(year).draw.slice(round - 1, round - 1 + NRL_FAST_FORWARD_ROUNDS) : [];
  const through = target?.round === round ? target.through : round + 1;
  const latest = receipt?.round === round ? receipt : null;
  useEffect(() => { if (latest) status.current?.focus(); }, [latest]);
  if (fixtures.length < 2 && !latest) return null;
  const closingChoices = expanded ? [
    ...(!nrlSponsorRefusal(career) ? ['season sponsor'] : []),
    ...(!nrlBoardPathwaysQuote(career).reason ? ['board pathways objective'] : []),
    ...(!nrlTicketPricingRefusal(career) && fixtures.slice(0, through - round + 1).some(roundFixtures =>
      roundFixtures.some(([home]) => home === clubId)) ? ['ticket prices'] : []),
  ] : [];
  return (
    <details className="rounded-xl border border-border bg-card px-4" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center font-bold">Fast-forward rounds</summary>
      <div className="space-y-2 pb-3 text-sm">
        {latest && <p ref={status} tabIndex={-1} role="status" className="rounded-lg border border-border p-2">
          {latest.rounds ? `Simulated ${latest.rounds} ${latest.rounds === 1 ? 'round' : 'rounds'}. ` : 'No rounds simulated. '}
          {latest.stop && fastForwardStops[latest.stop]}
        </p>}
        {fixtures.length >= 2 && <>
          <p className="text-muted-foreground">Simulate up to four regular rounds with your current tactic. The run can stop early for a club decision.</p>
          <ol className="space-y-1" aria-label="Upcoming club fixtures">
            {fixtures.map((fixturesInRound, offset) => {
              const match = fixturesInRound.find(pair => pair.includes(clubId));
              return <li key={round + offset}>Round {round + offset} · {match ? `${shortName(year, match[0])} vs ${shortName(year, match[1])}` : 'Bye'}</li>;
            })}
          </ol>
          <label className="block space-y-1 font-semibold">
            <span>Simulate through</span>
            <select value={through} disabled={disabled} onChange={event => setTarget({ round, through: Number(event.target.value) })}
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 sm:max-w-xs">
              {fixtures.slice(1).map((_, offset) => <option key={round + offset + 1} value={round + offset + 1}>Round {round + offset + 1}</option>)}
            </select>
          </label>
          {closingChoices.length > 0 && <p className="text-muted-foreground">Set these in the Club office first if you want to use them this season: {closingChoices.join(', ')}.</p>}
          <Button type="button" size="lg" disabled={disabled} className="w-full sm:w-auto" onClick={() => {
            const result = onRun({ year, clubId, round, through });
            if (result) setReceipt({ ...result, round: round + result.rounds });
          }}>Simulate through Round {through}</Button>
        </>}
      </div>
    </details>
  );
}

function ReserveRotationList({ label, season, heldReserveId }: {
  label: string; season: NrlManagerState; heldReserveId?: string;
}) {
  const rotation = nrlBenchRotation(season, heldReserveId);
  return (
    <div className="min-w-0">
      <p className="mb-1 font-semibold">{label}</p>
      {rotation.size > 0 ? (
        <ul aria-label={label} className="divide-y divide-border">
          {[...rotation].map(([starterId, reserve]) => (
            <li key={reserve.id} data-nrl-rotation-reserve={reserve.id} className="break-words py-1">
              <span className="font-medium">{reserve.name}</span>
              <span className="block text-xs text-muted-foreground">
                {reserve.role} · covers {season.squad.find(player => player.id === starterId)?.name}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-muted-foreground">No automatic changes.</p>}
    </div>
  );
}

function DevelopmentAppearances({ career, heldReserveId }: { career: NrlCareerState; heldReserveId?: string }) {
  const { season, developmentFocus, ratingReview } = career;
  const { appearances: target, players: limit } = NRL_DEVELOPMENT_ASSISTANT;
  if (season.phase !== 'regular' || career.finance.coachHire?.role !== 'development'
    || developmentFocus === 'youth' || (ratingReview?.assistant?.length ?? 0) >= limit) return null;
  const candidates = nrlDevelopmentAssistantProgress(career).filter(player => player.apps === target - 1
    && !ratingReview?.focus?.includes(player.id));
  if (candidates.length === 0) return null;
  const starters = new Set(Object.values(season.lineup));
  const reserves = new Set([...nrlBenchRotation(season).values()].map(player => player.id));
  const liveReserves = heldReserveId ? new Set([...nrlBenchRotation(season, heldReserveId).values()].map(player => player.id)) : reserves;
  const selection = (id: string, rotation: ReadonlySet<string>) =>
    starters.has(id) ? 'Starting' : rotation.has(id) ? 'In rotation' : 'Not in rotation';
  return (
    <section className="mt-3 border-t border-border pt-3 text-sm" aria-labelledby="nrl-development-appearances" data-nrl-development-appearances>
      <h3 id="nrl-development-appearances" className="font-semibold">Development appearances</h3>
      <ul className="mt-1 divide-y divide-border">
        {candidates.map(player => (
          <li key={player.id} className="break-words py-1" data-nrl-development-player={player.id}>
            <p className="font-medium">{player.name}</p>
            <p className="text-xs text-muted-foreground">{player.apps} of {target} appearances</p>
            <p className="text-xs text-muted-foreground">Quick Sim: {selection(player.id, reserves)}{heldReserveId && (
              <> · Live: {player.id === heldReserveId ? 'Held for later' : selection(player.id, liveReserves)}</>
            )}</p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">Starts and used reserves count. The opening Live plan can change during the match.</p>
    </section>
  );
}

function KickoffSelectionPromise({ career, heldReserveId }: { career: NrlCareerState; heldReserveId?: string }) {
  if (!career.selectionPromise) return null;
  const progress = nrlSelectionPromise(career);
  const { appearances: target, matches } = NRL_SELECTION_PROMISE;
  if (!progress || progress.status !== 'pending' || (progress.appearances < target - 1 && progress.eligible < matches - 2)) return null;
  const { season } = career;
  const player = career.players.find(row => row.id === progress.playerId);
  if (!player || player.futureContract) return null;
  const unavailable = nrlUnavailable(season).has(player.id);
  const starting = Object.values(season.lineup).includes(player.id);
  const placement = (held?: string) => {
    if (starting) return 'Starting';
    if (player.id === held) return 'Held for later';
    return [...nrlBenchRotation(season, held).values()].some(reserve => reserve.id === player.id)
      ? 'In rotation' : 'Outside rotation';
  };
  return (
    <section className="mt-3 border-t border-border pt-3 text-sm" aria-labelledby="nrl-kickoff-selection-promise" data-nrl-kickoff-selection-promise>
      <h3 id="nrl-kickoff-selection-promise" className="font-semibold">Selection promise</h3>
      <p className="mt-1 break-words font-medium">{player.name}</p>
      <p className="text-xs text-muted-foreground">{progress.appearances} of {target} appearances in {progress.eligible} of {matches} eligible matches</p>
      {unavailable ? (
        <p className="text-xs text-muted-foreground">Unavailable for this match. It will not count toward the promise window.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            <span>Quick Sim: {placement()}</span>
            {heldReserveId && <>{' · '}<span>Live: {placement(heldReserveId)}</span></>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">An eligible match still counts toward the promise window if the player stays off.</p>
        </>
      )}
    </section>
  );
}

function MatchCentre({ career, onAction, onRun, onReview, onContracts, disabled, showLiveResult }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; onRun: (request: NrlFastForwardRequest) => FastForwardResult | null;
  onReview: () => void; onContracts: () => void; disabled: boolean; showLiveResult: boolean;
}) {
  const shortName = useNrlClubName();
  const { season } = career;
  const next = nrlNextRound(season);
  const { clubId, year, phase, championId } = season;
  const { coachRole, coachBonus } = nrlCoachTactics(career.finance);
  const [hold, setHold] = useState<{ year: number; round: number; reserveId: string }>();
  if (season.live) {
    return season.live.minute60
      ? <LiveMinute60 live={season.live} season={season} onAction={onAction} disabled={disabled} />
      : <LiveHalftime live={season.live} season={season} title={next.title} onAction={onAction} disabled={disabled} coachRole={coachRole} coachBonus={coachBonus} />;
  }
  const club = shortName(year, clubId);
  const match = next.clubMatch;
  const needsJudiciary = judiciaryNeedsResponse(season);
  const approach = nrlContractApproach(career);
  const canPlayLive = Boolean(match && season.kickerId && season.bench);
  const goalKicker = match && season.backupKickerId && season.squad.find(player => player.id === season.kickerId)?.name;
  const holdable = canPlayLive ? nrlHoldableReserves(season) : [];
  const namedReserves = canPlayLive ? nrlBench(season) : [];
  const heldReserve = hold?.year === year && hold.round === season.round ? holdable.find(player => player.id === hold.reserveId) : undefined;
  const selectedHold = heldReserve ? hold : undefined;
  const opponent = match ? shortName(year, match.homeId === clubId ? match.awayId : match.homeId) : null;
  const latestRound = season.results.at(-1)?.round;
  const latest = latestRound === undefined ? [] : season.results.filter(result => result.round === latestRound);
  const lastMatch = latest.find(result => result.homeId === clubId || result.awayId === clubId);
  const starterIds = new Set(Object.values(season.lineup));
  const fitness = Math.round(season.squad.reduce((sum, player) => sum + (starterIds.has(player.id) ? player.fitness : 0), 0) / NRL_ROLES.length);
  const title = phase === 'complete'
    ? championId === clubId ? 'You won the premiership!' : `${championId ? shortName(year, championId) : 'Season'} champions`
    : opponent ? `${club} vs ${opponent}` : next.clubStatus === 'eliminated' ? `${club} are out` : `${club} have a bye`;

  const ReportHeading = showLiveResult ? 'h2' : 'h3';
  const report = latest.length > 0 && (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-results">
      <ReportHeading id="nrl-results" className="font-bold">{showLiveResult ? 'Full time' : latest[0].tieId === 'GF' ? 'Grand Final result' : latest[0].finalsRound ? 'Latest finals results' : `Round ${latestRound} results`}</ReportHeading>
      <p className="mt-1 text-sm text-muted-foreground" role="status" data-nrl-result>
        {lastMatch ? `${scoreLine(lastMatch, year, shortName)}${lastMatch.extraTime ? ' after extra time' : ''}` : 'Your club did not play this round.'}
      </p>
      {lastMatch && <NrlMatchDetails match={lastMatch} season={season} />}
      <ul className="mt-2 divide-y divide-border text-sm">
        {latest.map(result => (
          <li key={`${result.homeId}-${result.awayId}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
            <span className="min-w-0 break-words">{shortName(year, result.homeId)}</span>
            <strong className="tabular-nums">{result.homeScore}–{result.awayScore}</strong>
            <span className="min-w-0 break-words text-right">{shortName(year, result.awayId)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <section className="space-y-4" aria-label="Match centre">
      {!career.retired && <NrlBoardChallengeNotice season={season} status={nrlBoardChallengeStatus(career)} />}
      {showLiveResult && report}
      <NrlJudiciaryReview season={season} onAction={onAction} disabled={disabled} />
      {approach?.status === 'offered' && <div className="rounded-xl border border-border bg-card p-3 text-sm">
        <p>A rival wants to take over {approach.player?.name}’s contract. Reply by the end of Round {approach.deadline}.</p>
        <Button type="button" size="lg" variant="outline" className="mt-2" onClick={onContracts}>Review rival offer</Button>
      </div>}
      <div className="overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-950 p-4 text-emerald-50 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">{next.title}</p>
        <h2 className="mt-2 break-words font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
        {phase !== 'complete' && (
          <p className="mt-2 text-sm text-emerald-100">
            {match ? match.tieId === 'GF' ? 'Neutral ground'
              : career.customClub?.slotId === match.homeId ? `${match.homeId === clubId ? 'Home' : 'Away'} match · ${career.customClub.ground}`
              : match.homeId === clubId ? 'Home match' : 'Away match'
              : next.clubStatus === 'eliminated' ? 'You can finish the finals and see who wins.' : phase === 'regular' ? 'Your club gets two ladder points this round.' : 'Your club has advanced and rests this week.'}
          </p>
        )}
        {goalKicker && (
          <p className="mt-2 break-words text-sm text-emerald-100" data-nrl-goal-kicker>
            Goal kicker: {goalKicker}{season.kickerId === season.backupKickerId && ' · Backup on duty'}
          </p>
        )}
        {phase === 'complete' && (
          <Button type="button" size="lg" className="mt-3 px-4" onClick={onReview}><Trophy aria-hidden="true" /> Review this season</Button>
        )}
      </div>

      {match && <OppositionReport key={`${year}:${match.round}`} career={career} />}

      {match && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-bold">Match tactic</h3>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Match tactic">
              {tactics.map(tactic => (
                <Button key={tactic.id} type="button" size="lg" className="px-3"
                  variant={season.tactic === tactic.id ? 'default' : 'outline'} disabled={disabled}
                  aria-pressed={season.tactic === tactic.id} onClick={() => onAction({ type: 'setTactic', tactic: tactic.id })}>{tactic.label}</Button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{tactics.find(tactic => tactic.id === season.tactic)?.description}{coachTacticNote(coachRole, coachBonus, season.tactic)}</p>
            <AttackPlan key={`${year}:${next.round}`} career={career} onAction={onAction} disabled={disabled} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-bold">Preparation <span className="ml-1 font-normal text-muted-foreground">· {fitness}% starter fitness</span></h3>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Round preparation">
              <Button type="button" size="lg" className="px-3" variant={season.preparation === 'train' ? 'default' : 'outline'}
                aria-pressed={season.preparation === 'train'} disabled={disabled} onClick={() => onAction({ type: 'prepare', choice: 'train' })}>
                <Zap aria-hidden="true" /> Train
              </Button>
              <Button type="button" size="lg" className="px-3" variant={season.preparation === 'recover' ? 'default' : 'outline'}
                aria-pressed={season.preparation === 'recover'} disabled={disabled} onClick={() => onAction({ type: 'prepare', choice: 'recover' })}>
                <BedDouble aria-hidden="true" /> Recover
              </Button>
              {!career.legacySeason && season.kickerId && (
                <Button type="button" size="lg" className="px-3" variant={season.preparation === 'defensiveDrills' ? 'default' : 'outline'}
                  aria-pressed={season.preparation === 'defensiveDrills'} disabled={disabled}
                  onClick={() => onAction({ type: 'prepare', choice: 'defensiveDrills', year, clubId, round: season.round })}>
                  Defensive drills
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {season.preparation === 'train' ? 'Boost attack this round and spend some fitness.'
                : season.preparation === 'recover' ? 'Rest your starters and restore more fitness.'
                  : season.preparation === 'defensiveDrills' ? 'Boost defence this round with the same fitness cost and injury risk as Train.'
                    : career.legacySeason || !season.kickerId ? 'Train for extra attack or recover to protect fitness.'
                      : 'Train for extra attack, drill your defence or recover to protect fitness.'}
            </p>
            {!career.legacySeason && season.kickerId && season.preparation !== null && (
              <Button type="button" size="lg" variant="ghost" className="mt-2 px-3" disabled={disabled}
                onClick={() => onAction({ type: 'prepare', choice: null, year, clubId, round: season.round })}>
                Clear preparation
              </Button>
            )}
            {!career.legacySeason && season.kickerId && <IndividualRecovery season={season} onAction={onAction} disabled={disabled} />}
          </div>
        </div>
      )}

      {canPlayLive && (
        <details className="group rounded-xl border border-border bg-card px-4" data-nrl-rotation-preview>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>{holdable.length > 0 ? 'Hold one reserve for later' : 'Reserve rotation'}</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="pb-4">
            {holdable.length > 0 && (
              <>
                <label htmlFor="nrl-hold-reserve" className="text-sm font-semibold">Opening rotation</label>
                <select id="nrl-hold-reserve" value={selectedHold?.reserveId ?? ''} disabled={disabled}
                  className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={event => setHold(event.target.value ? { year, round: season.round, reserveId: event.target.value } : undefined)}>
                  <option value="">Automatic rotation</option>
                  {holdable.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role}</option>)}
                </select>
              </>
            )}
            {namedReserves.length > 1 && (
              <>
                <label htmlFor="nrl-first-reserve" className="mt-3 block text-sm font-semibold">First reserve</label>
                <select id="nrl-first-reserve" value={namedReserves[0]} aria-describedby="nrl-first-reserve-help" disabled={disabled}
                  className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={event => onAction({ type: 'selectBench', slot: 0, playerId: event.target.value })}>
                  {namedReserves.map(id => {
                    const player = season.squad.find(reserve => reserve.id === id)!;
                    return <option key={id} value={id}>{player.name} · {player.role}</option>;
                  })}
                </select>
                <p id="nrl-first-reserve-help" className="mt-1 text-xs text-muted-foreground">This swaps the selected reserve with the first one on your bench.</p>
              </>
            )}
            <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">
              {heldReserve
                ? <><span className="font-semibold">Held for later: {heldReserve.name}</span>. Bring them on at half time or after 60 minutes in Live.</>
                : 'Quick Sim and Play Live use the same opening rotation.'}
            </p>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <ReserveRotationList label="Quick Sim rotation" season={season} />
              {heldReserve && <ReserveRotationList label="Live opening rotation" season={season} heldReserveId={heldReserve.id} />}
            </div>
            <DevelopmentAppearances career={career} heldReserveId={heldReserve?.id} />
            <KickoffSelectionPromise career={career} heldReserveId={heldReserve?.id} />
          </div>
        </details>
      )}
      {phase !== 'complete' && (
        <div className={canPlayLive ? 'grid grid-cols-2 gap-2' : undefined}>
          {canPlayLive && <Button type="button" size="lg" disabled={disabled || needsJudiciary} onClick={() => onAction({ type: 'startLive', hold: selectedHold })}>
            Play Live <ArrowRight aria-hidden="true" />
          </Button>}
          <Button type="button" size="lg" className="w-full" variant={canPlayLive ? 'outline' : 'default'}
            disabled={disabled || (needsJudiciary && Boolean(match))} onClick={() => onAction({ type: 'advance' })} data-nrl-advance>
            {match ? 'Quick Sim' : phase === 'regular' ? 'Simulate bye round' : `Simulate ${next.title.toLowerCase()}`}
            {!canPlayLive && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      )}

      <FastForward key={`fast-forward-${year}`} career={career} onRun={onRun} disabled={disabled} />

      {phase !== 'regular' && (
        <details className="rounded-xl border border-border bg-card px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">Finals bracket</summary>
          <ol className="divide-y divide-border pb-2 text-sm">
            {season.results.filter(result => result.finalsRound).map(result => (
              <li key={result.tieId} className="flex flex-wrap justify-between gap-x-2 py-2">
                <span className="text-muted-foreground">{result.tieId === 'GF' ? 'Grand Final' : `Week ${result.finalsRound}`}</span>
                <strong>{scoreLine(result, year, shortName)}</strong>
              </li>
            ))}
            {next.fixtures.map(fixture => (
              <li key={fixture.tieId} className="flex flex-wrap justify-between gap-x-2 py-2">
                <span className="text-muted-foreground">Up next</span>
                <span>{shortName(year, fixture.homeId)} vs {shortName(year, fixture.awayId)}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <SeasonFixtures key={year} season={season} next={next} />

      {!showLiveResult && report}
    </section>
  );
}

function IndividualRecovery({ season, onAction, disabled }: {
  season: NrlManagerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const { year, clubId, round, preparation, individualRecoveryId } = season;
  const players = nrlIndividualRecoveryOptions(season);
  const selected = players.find(player => player.id === individualRecoveryId);
  const preview = selected && nrlIndividualRecoveryPreview(selected, preparation);
  const usualPreparation = preparation === 'train' ? 'team training' : preparation === 'defensiveDrills' ? 'defensive drills' : 'normal preparation';
  return (
    <details className="group mt-2 border-t border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="min-w-0 truncate">Individual recovery{selected && ` · ${selected.name}`}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      {preparation === 'recover' ? <p className="text-sm text-muted-foreground">The whole squad is already recovering.</p> : (
        <div className="space-y-2 pb-1">
          <p className="text-sm text-muted-foreground">Give one available player lighter training before this match. The rest of the squad keeps its plan.</p>
          <label htmlFor="nrl-recovery-player" className="block text-sm font-semibold">Player on lighter training</label>
          <select id="nrl-recovery-player" value={individualRecoveryId ?? ''} disabled={disabled}
            className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={event => onAction({ type: 'setIndividualRecovery', year, clubId, round, playerId: event.target.value || null })}>
            <option value="">Follow team preparation</option>
            {players.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role} · {player.fitness}% fit</option>)}
          </select>
          {preview && <p className="text-sm text-muted-foreground" role="status">
            Kickoff fitness is {preview.normal}% with {usualPreparation}, {preview.recovery}% with individual recovery.
          </p>}
        </div>
      )}
    </details>
  );
}

function SquadSeasonStats({ season }: { season: NrlManagerState }) {
  const [scope, setScope] = useState<NrlSquadStatsScope>('all');
  const hasFinals = season.results.some(match => match.finalsRound && match.playerScoring);
  const { rows, tracked, played } = nrlSquadSeasonStats(season, hasFinals ? scope : 'all');
  return (
    <details className="group mt-5 rounded-lg border border-border bg-background px-3">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Season player stats<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="pb-3">
        {hasFinals && (
          <label className="mb-2 block text-sm font-semibold">
            Match scope
            <select value={scope} onChange={event => setScope(event.target.value as NrlSquadStatsScope)}
              className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs">
              <option value="all">All matches</option>
              <option value="regular">Regular season</option>
              <option value="finals">Finals</option>
            </select>
          </label>
        )}
        {tracked === 0 ? (
          <p className="text-sm text-muted-foreground">{season.kickerId
            ? 'Player stats appear after your first match.'
            : 'Player match records are unavailable for this saved season. Tracking starts next season.'}</p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Player records cover {tracked} of {played} matches. Apps include starts and games played off the bench.
            </p>
            <table className="w-full text-left text-xs">
              <caption className="sr-only">{season.year} squad stats</caption>
              <thead>
                <tr>
                  <th scope="col" className="py-1">Player</th>
                  <th scope="col" aria-label="Appearances" className="px-1 text-right">Apps</th>
                  <th scope="col" className="px-1 text-right">Starts</th>
                  <th scope="col" aria-label="Bench appearances" className="px-1 text-right">Bench</th>
                  <th scope="col" className="px-1 text-right">Tries</th>
                  <th scope="col" aria-label="Points" className="text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(player => (
                  <tr key={player.id} className="border-t border-border tabular-nums">
                    <th scope="row" className="break-words py-1.5 pr-1 font-medium">{player.name}</th>
                    <td className="px-1 text-right">{player.apps}</td>
                    <td className="px-1 text-right">{player.starts}</td>
                    <td className="px-1 text-right">{player.bench}</td>
                    <td className="px-1 text-right">{player.tries}</td>
                    <td className="text-right">{player.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </details>
  );
}

function SavedLineup({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const summary = useRef<HTMLElement>(null);
  const [active, setActive] = useState<'first' | 'rotation'>('first');
  const { season } = career;
  const savedLineup = active === 'first' ? career.savedLineup : career.savedRotationLineup;
  const slot = active === 'rotation' ? 'rotation' : undefined;
  const selection = disabled || career.legacySeason ? null : nrlMatchdaySelection(season);
  if (!selection) return null;
  const preview = savedLineup ? nrlSavedLineupPreview(season, savedLineup) : null;
  const nameOf = (id: string) => season.squad.find(player => player.id === id)?.name;
  const save = () => {
    if (onAction({ type: 'saveLineup', year: season.year, clubId: season.clubId, slot })) summary.current?.focus();
  };
  return (
    <details className="group mt-3 rounded-lg border border-border bg-background px-3">
      <summary ref={summary} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Saved lineup<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-3 text-sm">
        <p className="text-muted-foreground">Save a first-choice team and a rotation team for this season. Each keeps its starting 13, bench order and goal kicker.</p>
        <div role="group" aria-label="Saved lineup slot" className="grid grid-cols-2 gap-2">
          <Button type="button" size="lg" variant={active === 'first' ? 'secondary' : 'outline'} className="px-2" aria-pressed={active === 'first'} onClick={() => setActive('first')}>First choice</Button>
          <Button type="button" size="lg" variant={active === 'rotation' ? 'secondary' : 'outline'} className="px-2" aria-pressed={active === 'rotation'} onClick={() => setActive('rotation')}>Rotation</Button>
        </div>
        {preview && (
          <div className="space-y-2 text-muted-foreground" role="status">
            {preview.replacements > 0 && <p>Saved picks adjusted for this round: {preview.replacements}.</p>}
            {preview.changes.length > 0 && (
              <ul className="divide-y divide-border">
                {preview.changes.map(({ role, toId }) => <li key={role} className="py-1">
                  <span className="font-semibold text-foreground">{role}</span> · {nameOf(toId)}
                </li>)}
              </ul>
            )}
            {preview.benchChanged && <p>Bench order changes to {preview.next.bench!.map(nameOf).join(', ')}.</p>}
            {preview.kickerChanged && <p>Goal kicker changes to {nameOf(preview.next.kickerId!)}.</p>}
            {!preview.changed && <p>Your current lineup matches the preview.</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" variant="outline" className="px-3"
            disabled={JSON.stringify(selection) === JSON.stringify(savedLineup)} onClick={save}>
            {savedLineup ? 'Replace saved lineup' : 'Save this lineup'}
          </Button>
          {preview && <Button type="button" size="lg" className="px-3" disabled={!preview.changed} onClick={() => {
            if (onAction({ type: 'applySavedLineup', previewKey: preview.key, slot })) summary.current?.focus();
          }}>Apply saved lineup</Button>}
        </div>
      </div>
    </details>
  );
}

function PositionTraining({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const summary = useRef<HTMLElement>(null);
  const [playerId, setPlayerId] = useState('');
  const [role, setRole] = useState<NrlRole | ''>('');
  const { season, legacySeason } = career;
  if (legacySeason) return null;
  const course = nrlPositionTraining(career);
  const candidates = nrlPositionTrainingCandidates(career);
  const player = candidates.find(candidate => candidate.id === playerId);
  const roles = player ? nrlRetrainingRoles(player.role) : [];
  const trained = season.squad.filter(player => player.secondaryRole);
  return (
    <details className="group mt-3 rounded-lg border border-border bg-background px-3">
      <summary ref={summary} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Position training<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-3 text-sm">
        <p className="text-muted-foreground">Train one player at a time. In this game a course takes {NRL_POSITION_TRAINING_ROUNDS} rounds, including byes, and adds one position you can select in the starting 13.</p>
        {course ? (
          <div className="space-y-2">
            <p role="status" className="font-semibold">{course.player.name} is learning {course.role}. {course.remaining} {course.remaining === 1 ? 'round' : 'rounds'} left.</p>
            <Button type="button" size="lg" variant="outline" className="px-3" disabled={disabled} onClick={() => {
              if (onAction({ type: 'cancelPositionTraining', year: season.year, clubId: season.clubId, playerId: course.playerId, role: course.role, startedRound: course.startedRound })) summary.current?.focus();
            }}>Cancel training</Button>
          </div>
        ) : candidates.length ? (
          <div className="space-y-2">
            <label className="block font-semibold">
              Player to train
              <select className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2" disabled={disabled}
                value={player?.id ?? ''} onChange={event => { setPlayerId(event.target.value); setRole(''); }}>
                <option value="">Choose a player</option>
                {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.role}</option>)}
              </select>
            </label>
            {player && <label className="block font-semibold">
              Position to learn
              <select className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2" disabled={disabled}
                value={role} onChange={event => setRole(event.target.value as NrlRole | '')}>
                <option value="">Choose a position</option>
                {roles.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>}
            <Button type="button" size="lg" className="px-3" disabled={disabled || !player || !role} onClick={() => {
              if (role && onAction({ type: 'startPositionTraining', year: season.year, clubId: season.clubId, round: season.round, playerId, role })) {
                setPlayerId('');
                setRole('');
                summary.current?.focus();
              }
            }}>Start position training</Button>
          </div>
        ) : <p className="text-muted-foreground">{career.retired ? 'Your learned positions are available to review.'
          : season.live ? 'Finish the live match before starting training.'
          : season.phase !== 'regular' || season.round + NRL_POSITION_TRAINING_ROUNDS - 1 > nrlRegularRounds(season.year)
            ? 'New courses need four regular-season rounds remaining.' : 'No fit player is eligible for a new course.'}</p>}
        {trained.length > 0 && (
          <>
            <h3 className="font-semibold">Learned positions</h3>
            <ul className="space-y-1 text-muted-foreground">
              {trained.map(player => <li key={player.id}>{player.name} · {player.secondaryRole}</li>)}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}

function ReserveGradeDevelopment({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const summary = useRef<HTMLElement>(null);
  const [playerId, setPlayerId] = useState('');
  const { season } = career;
  const { year, clubId, round, reserveGrade } = season;
  if (career.legacySeason || career.retired || season.phase !== 'regular') return null;
  const candidates = nrlReserveGradeCandidates(career);
  const selected = candidates.find(player => player.id === playerId);
  const assigned = reserveGrade && season.squad.find(player => player.id === reserveGrade.playerId);
  const remaining = nrlReserveGradeRemaining(season);
  if (!assigned && !candidates.length) return null;
  return (
    <details className="group mt-3 rounded-lg border border-border bg-background px-3">
      <summary ref={summary} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Reserve-grade development<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-3 text-sm">
        <p className="text-muted-foreground">Send one eligible young player each season for {NRL_RESERVE_GRADE_ROUNDS} regular rounds, including byes. He stays contracted and counts against your cap. He returns with one rating point if he completes the spell.</p>
        {assigned ? <>
          <p role="status" className="font-semibold">{remaining
            ? `${assigned.name} is in reserve grade. ${remaining} ${remaining === 1 ? 'round' : 'rounds'} left.`
            : reserveGrade?.recalledRound !== undefined ? `${assigned.name} was recalled early. No rating gain.`
              : `${assigned.name} completed the spell and gained one rating point.`}</p>
          {remaining > 0 && <Button type="button" size="lg" variant="outline" className="px-3" disabled={disabled} onClick={() => {
            if (onAction({ type: 'recallReserveGrade', year, clubId, round, playerId: assigned.id })) summary.current?.focus();
          }}>Recall player</Button>}
        </> : <>
          <label className="block font-semibold">
            Player for reserve grade
            <select className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2" disabled={disabled}
              value={selected?.id ?? ''} onChange={event => setPlayerId(event.target.value)}>
              <option value="">Choose a player</option>
              {candidates.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role}</option>)}
            </select>
          </label>
          {selected && <p className="text-muted-foreground">Unavailable for your first-grade lineup and bench during the spell. Recall early to bring him back without a rating gain.</p>}
          <Button type="button" size="lg" className="px-3" disabled={disabled || !selected} onClick={() => {
            if (selected && onAction({ type: 'startReserveGrade', year, clubId, round, playerId: selected.id })) {
              setPlayerId('');
              summary.current?.focus();
            }
          }}>Start reserve-grade spell</Button>
        </>}
      </div>
    </details>
  );
}

function Squad({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const shortName = useNrlClubName();
  const { season } = career;
  const bench = nrlBench(season);
  const starters = new Set(Object.values(season.lineup));
  const availability = nrlUnavailable(season);
  const injuries = nrlInjuries(season);
  const bans = season.judiciary && nrlJudiciaryBans(season);
  const pendingCase = judiciaryNeedsResponse(season) ? nrlJudiciaryCase(season)?.playerId : undefined;
  const reserveGradeId = nrlReserveGradeRemaining(season) ? season.reserveGrade?.playerId : undefined;
  const leaders = nrlScoringLeaders(season);
  const tryLeaders = nrlTryLeaders(leaders);
  const unavailable = season.squad.filter(player => availability.has(player.id));
  const reserves = season.squad.filter(player => !starters.has(player.id) && !availability.has(player.id));
  const proposal = disabled ? null : nrlFitLineup(season);
  const nameOf = (id: string) => season.squad.find(player => player.id === id)?.name;
  const captainOutsideStartingSide = season.captainId && !starters.has(season.captainId);
  const backupOutsideStartingSide = season.backupKickerId && !starters.has(season.backupKickerId);
  const squadName = (id: string, name: string) =>
    career.openingRoster && !isNrlNamedPlayer(id) ? name + ' (generated)' : name;
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-squad">
      <h2 id="nrl-squad" className="font-display text-lg font-bold">Starting 13</h2>
      <p className="mt-1 text-sm text-muted-foreground">{career.openingRoster
        ? 'Side assignments and prop slots are editable game assignments. Choose a fit starter for each position.'
        : 'Players and ratings are fictional. Choose a fit starter for each position.'}</p>
      {!career.legacySeason && <details className="group mt-3 rounded-lg border border-border bg-background px-3">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Rating changes<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
        </summary>
        <div className="pb-3 text-sm">
          <p className="text-muted-foreground">Player ratings can rise or fall by 1 OVR at a time during the regular season. New seasons begin with the ratings players finished on.</p>
          {career.ratingReview && <p className="mt-2 font-semibold">Round {career.ratingReview.round} review</p>}
          {career.ratingReview?.changes.length ? (
            <ul aria-label="Recent rating changes" className="mt-1 divide-y divide-border">
              {career.ratingReview.changes.map(([id, delta]) => <li key={id} className="flex flex-wrap justify-between gap-x-3 py-1">
                <span>{nameOf(id)}</span><span className="font-semibold tabular-nums">{delta > 0 ? '+' : ''}{delta} OVR</span>
              </li>)}
            </ul>
          ) : <p className="mt-1 text-muted-foreground">No rating changes to show for your club.</p>}
        </div>
      </details>}
      {proposal && (
        <details className="group mt-3 rounded-lg border border-border bg-background px-3" data-nrl-fit-lineup>
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Suggest a fit lineup<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="pb-3 text-sm">
            {proposal.changes.length > 0 ? (
              <>
                <p className="text-muted-foreground">Picks use each player’s position, rating and match fitness.</p>
                <ul className="mt-2 divide-y divide-border">
                  {proposal.changes.map(({ role, fromId, toId }) => (
                    <li key={role} className="py-1">
                      <p className="font-semibold">{role}</p>
                      <p className="text-muted-foreground">{nameOf(fromId)} → {nameOf(toId)}</p>
                    </li>
                  ))}
                </ul>
                {proposal.next.kickerId && proposal.next.kickerId !== season.kickerId && (
                  <p className="mt-2 text-muted-foreground">Goal kicker changes to {nameOf(proposal.next.kickerId)}.</p>
                )}
                <Button type="button" size="lg" variant="outline" className="mt-2 w-full px-3"
                  onClick={() => onAction({ type: 'applyFitLineup', previewKey: proposal.key })}>
                  Apply fit lineup
                </Button>
              </>
            ) : <p className="text-muted-foreground">Your current starters already match the suggestion.</p>}
          </div>
        </details>
      )}
      <SavedLineup career={career} onAction={onAction} disabled={disabled} />
      <PositionTraining career={career} onAction={onAction} disabled={disabled} />
      <ReserveGradeDevelopment career={career} onAction={onAction} disabled={disabled} />
      {season.injuryTracking ? (
        <section className="mt-4 rounded-lg border border-border bg-background p-3" aria-labelledby="nrl-availability" data-nrl-availability>
          <h3 id="nrl-availability" className="text-sm font-semibold">Availability</h3>
          {unavailable.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Everyone is available.</p> : (
            <>
              <ul className="mt-1 divide-y divide-border text-sm">
                {unavailable.map(player => {
                  const remaining = availability.get(player.id)!;
                  const ban = bans?.get(player.id);
                  const injuryRounds = injuries.get(player.id);
                  let forecast: string | undefined;
                  if (season.phase === 'regular' && injuryRounds && !ban && player.id !== pendingCase && player.id !== reserveGradeId) {
                    const { year, clubId, round } = season;
                    const { draw } = nrlSeasonPlan(year);
                    const first = draw.findIndex((fixtures, index) => index + 1 >= round + injuryRounds
                      && fixtures.some(pair => pair.includes(clubId)));
                    const opponent = draw[first]?.find(pair => pair.includes(clubId))?.find(team => team !== clubId);
                    forecast = opponent
                      ? `Can return: Round ${first + 1} vs ${shortName(year, opponent)}`
                      : 'No regular-season fixture left after recovery.';
                  }
                  return <li key={player.id} className="py-1">
                    <div className="flex flex-wrap justify-between gap-x-3">
                      <span>{player.name} · {player.role}</span>
                      <span className="text-muted-foreground">{player.id === reserveGradeId ? 'On reserve-grade development'
                        : ban ? `Suspended for ${ban} club ${ban === 1 ? 'match' : 'matches'}`
                        : `Out for ${remaining} ${remaining === 1 ? 'round' : 'rounds'}`}</span>
                    </div>
                    {forecast && <p className="mt-0.5 text-xs text-muted-foreground" data-nrl-injury-return={player.id}>{forecast}</p>}
                  </li>;
                })}
              </ul>
              <p className="mt-1 text-xs text-muted-foreground">Byes count toward recovery. Utility cover plays below their usual rating.</p>
            </>
          )}
        </section>
      ) : <p className="mt-2 text-sm text-muted-foreground">Availability tracking starts next season for this save.</p>}
      <SquadSeasonStats season={season} />
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {NRL_ROLES.map((role, index) => (
          <div key={role} className="min-w-0">
            <label htmlFor={`nrl-starter-${index}`} className="mb-1 block text-sm font-semibold">{role}</label>
            <select id={`nrl-starter-${index}`} value={season.lineup[role]} disabled={disabled || season.phase === 'complete'}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              onChange={event => onAction({ type: 'selectStarter', role, playerId: event.target.value })}>
              {nrlStarterOptions(season, role).map(player => (
                <option key={player.id} value={player.id}>{squadName(player.id, player.name)} · {player.rating} OVR · {player.fitness}% fit{player.secondaryRole === role ? ' · Trained cover' : player.role !== role ? ' · Utility cover' : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {season.kickerId ? (
        <div className="mt-5 border-t border-border pt-4">
          <label htmlFor="nrl-goal-kicker" className="block text-sm font-semibold">Goal kicker</label>
          <select id="nrl-goal-kicker" value={season.kickerId} disabled={disabled || season.phase === 'complete'}
            className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-xs"
            onChange={event => onAction({ type: 'setKicker', playerId: event.target.value })}>
            {season.squad.filter(player => starters.has(player.id)).map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">Your kicker gets credit for conversions and penalty goals.</p>
          <label htmlFor="nrl-backup-goal-kicker" className="mt-3 block text-sm font-semibold">Backup goal kicker</label>
          <select id="nrl-backup-goal-kicker" value={season.backupKickerId ?? ''} aria-describedby="nrl-backup-goal-kicker-help"
            disabled={disabled || season.phase === 'complete'}
            className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-xs"
            onChange={event => onAction({ type: 'setBackupKicker', playerId: event.target.value || null, year: season.year, clubId: season.clubId, round: season.round })}>
            <option value="">No backup selected</option>
            {backupOutsideStartingSide && <option value={season.backupKickerId}>{nameOf(season.backupKickerId!)} · Outside starting 13</option>}
            {season.squad.filter(player => starters.has(player.id) && (player.id !== season.kickerId || player.id === season.backupKickerId)).map(player => (
              <option key={player.id} value={player.id}>{player.name}{player.id === season.kickerId && ' · On duty'}</option>
            ))}
          </select>
          <p id="nrl-backup-goal-kicker-help" className="mt-1 text-xs text-muted-foreground">If your kicker leaves the starting 13, your backup takes over if they still start. Otherwise the halfback takes over.</p>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">Player scoring starts next season for this save.</p>}
      {season.kickerId && (
        <div className="mt-5 border-t border-border pt-4">
          <label htmlFor="nrl-club-captain" className="block text-sm font-semibold">Club captain</label>
          <select id="nrl-club-captain" value={season.captainId ?? ''} aria-describedby="nrl-club-captain-help"
            disabled={disabled || season.phase === 'complete'}
            className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:max-w-xs"
            onChange={event => onAction({ type: 'setCaptain', playerId: event.target.value || null, year: season.year, clubId: season.clubId, round: season.round })}>
            <option value="">No captain selected</option>
            {captainOutsideStartingSide && <option value={season.captainId}>{nameOf(season.captainId!)} · Outside starting 13</option>}
            {season.squad.filter(player => starters.has(player.id)).map(player => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
          <p id="nrl-club-captain-help" className="mt-1 text-xs text-muted-foreground">
            Choose a starter. Your captain adds {NRL_CAPTAIN_DEFENCE} defence when they lead the starting 13 at kickoff or after half time.
          </p>
        </div>
      )}
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-display text-lg font-bold">Interchange bench</h3>
        <p className="mt-1 text-sm text-muted-foreground">Name six reserves. Quick sim uses up to {NRL_MAX_BENCH_USED} in order to cover different positions. Players who come on use fitness.</p>
        <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {Array.from({ length: NRL_BENCH_SIZE }, (_, slot) => (
            <div key={slot} className="min-w-0">
              <label htmlFor={`nrl-reserve-${slot}`} className="mb-1 block text-sm font-semibold">Reserve {slot + 14}</label>
              <select id={`nrl-reserve-${slot}`} value={bench[slot] ?? ""} disabled={disabled || season.phase === "complete"}
                className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                onChange={event => onAction({ type: "selectBench", slot, playerId: event.target.value })}>
                {reserves.map(player => <option key={player.id} value={player.id}>{squadName(player.id, player.name)} · {player.role} · {player.fitness}% fit</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
      {season.kickerId && leaders.length > 0 && (
        <section className="mt-5 border-t border-border pt-4" aria-labelledby="nrl-scoring-leaders" data-nrl-scoring-leaders>
          <h3 id="nrl-scoring-leaders" className="font-display text-lg font-bold">Scoring leaders</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">Tries</h4>
              <ol className="mt-1 space-y-1 text-sm text-muted-foreground">
                {tryLeaders.slice(0, 3).map(player => <li key={player.playerId}>{player.name} · {player.tries}</li>)}
                {tryLeaders.length === 0 && <li>No tries yet.</li>}
              </ol>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Points</h4>
              <ol className="mt-1 space-y-1 text-sm text-muted-foreground">
                {leaders.slice(0, 3).map(player => <li key={player.playerId}>{player.name} · {player.points}</li>)}
              </ol>
            </div>
          </div>
        </section>
      )}
    </section>
  );
}

const finalsRaceLabels = { secured: 'Secured', open: 'Still open', out: 'Out of reach' } as const;

function Ladder({ career }: { career: NrlCareerState }) {
  const shortName = useNrlClubName();
  const fullName = useNrlClubName('full');
  const { season } = career;
  const [showForm, setShowForm] = useState(false);
  const [scoutOpen, setScoutOpen] = useState(false);
  const [scoutClubId, setScoutClubId] = useState('');
  const rows = nrlLadder(season);
  const race = nrlFinalsRace(season, rows);
  const form = showForm ? nrlLeagueForm(season) : null;
  const clubs = nrlSeasonPlan(season.year).clubs;
  const rivals = clubs.filter(club => club.id !== season.clubId);
  const rival = scoutOpen ? rivals.find(club => club.id === scoutClubId) : undefined;
  const rivalName = rival && fullName(season.year, rival.id);
  const rank = rows.findIndex(row => row.clubId === rival?.id && row.played > 0) + 1;
  const rivalSquad = rival ? nrlRivalSquad(career, rival.id) : [];
  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4" aria-labelledby="nrl-ladder">
      <h2 id="nrl-ladder" className="font-display text-lg font-bold">{season.year} ladder</h2>
      {race && (
        <details className="mt-2 rounded-lg border border-border bg-background px-3" data-nrl-finals-race>
          <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Finals race
          </summary>
          <div className="space-y-2 pb-3 text-sm">
            <dl className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-muted-foreground">Top eight</dt>
                <dd className="font-semibold">{finalsRaceLabels[race.topEight]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Top four</dt>
                <dd className="font-semibold">{finalsRaceLabels[race.topFour]}</dd>
              </div>
            </dl>
            <p>Final ladder points: <strong className="tabular-nums">{race.minimum === race.maximum
              ? race.minimum : `${race.minimum} to ${race.maximum}`}</strong></p>
            <p className="text-xs text-muted-foreground">The range includes two points per remaining bye. Ties on points can leave the race open.</p>
            <ul aria-label="Remaining club rounds" className="divide-y divide-border">
              {race.remaining.map(({ round, opponentId, home, nearCut }) => (
                <li key={round} className="flex flex-wrap justify-between gap-x-2 py-1" data-nrl-finals-race-round={round}>
                  <span className="text-muted-foreground">Round {round}</span>
                  <strong className="break-words">{opponentId
                    ? `${home ? 'Home vs' : 'Away at'} ${shortName(season.year, opponentId)}` : 'Bye · 2 points'}
                    {nearCut && <span className="block text-xs font-normal text-muted-foreground sm:inline"> · Near the top-eight cut</span>}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
      <button type="button" aria-pressed={showForm} onClick={() => setShowForm(value => !value)}
        className="mt-2 min-h-11 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-primary/10">
        Form and venue records
      </button>
      <p id="nrl-ladder-guide" className="mt-2 text-sm text-muted-foreground">
        {showForm ? 'Regular season only. Last five matches, oldest first. W is a win, D a draw, L a loss.'
          : 'The top eight make the finals. Diff is points scored minus points conceded.'}
      </p>
      <table aria-describedby="nrl-ladder-guide" className="mt-3 w-full table-fixed text-left text-xs sm:text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="w-7 py-2"><span className="sr-only">Rank</span>#</th>
            <th scope="col">Club</th>
            {showForm ? <>
              <th scope="col" className="w-24 text-right">Last 5</th>
              <th scope="col" className="w-14 text-right sm:w-20">Home</th>
              <th scope="col" className="w-14 text-right sm:w-20">Away</th>
            </> : <>
              <th scope="col" className="w-7 text-right"><abbr title="Played">P</abbr></th>
              <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Wins">W</abbr></th>
              <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Draws">D</abbr></th>
              <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Losses">L</abbr></th>
              <th scope="col" className="w-9 text-right"><abbr title="Ladder points">Pts</abbr></th>
              <th scope="col" className="w-10 text-right"><abbr title="Points differential">Diff</abbr></th>
            </>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const record = form?.get(row.clubId);
            return (
              <tr key={row.clubId} data-nrl-ladder={row.clubId}
                className={`border-t border-border tabular-nums ${row.clubId === season.clubId ? 'bg-primary/10 font-bold' : ''} ${index === 8 ? 'border-t-2 border-t-primary/60' : ''}`}>
                <td className="py-2">{index + 1}</td>
                <th scope="row" className="break-words pr-1 font-medium">{shortName(season.year, row.clubId)}</th>
                {record ? <>
                  <td className="text-right">{record.recent.join(' ') || 'None'}</td>
                  {[record.home, record.away].map(({ W, D, L }, venue) => (
                    <td key={venue} className="whitespace-nowrap text-right">
                      <span aria-hidden="true">{W}-{D}-{L}</span>
                      <span className="sr-only">{W} wins, {D} draws, {L} losses</span>
                    </td>
                  ))}
                </> : <>
                  <td className="text-right">{row.played}</td>
                  <td className="hidden text-right sm:table-cell">{row.wins}</td>
                  <td className="hidden text-right sm:table-cell">{row.draws}</td>
                  <td className="hidden text-right sm:table-cell">{row.losses}</td>
                  <td className="text-right font-bold">{row.points}</td>
                  <td className="text-right">{row.differential > 0 ? '+' : ''}{row.differential}</td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
      <details className="mt-3 rounded-lg border border-border bg-background px-3"
        onToggle={event => setScoutOpen(event.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Scout a club
        </summary>
        <div className="space-y-3 pb-3">
          <label className="block max-w-xs space-y-1 text-sm font-semibold">
            <span>Club to scout</span>
            <select value={scoutClubId} onChange={event => setScoutClubId(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Choose a rival club</option>
              {rivals.map(club => <option key={club.id} value={club.id}>{fullName(season.year, club.id)}</option>)}
            </select>
          </label>
          {rival && (
            <div>
              <h3 className="break-words text-sm font-bold">{rivalName} squad{rank > 0 && ` · Ladder ${rank}`}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{career.openingRoster
                && rivalSquad.some(({ player }) => isNrlNamedPlayer(player.id))
                ? `Includes players from the ${career.openingRoster === 'matchday-2026' ? '2026 opening' : '2027 Perth signings'} snapshot. Squad development is simulated.`
                : 'Generated squad for this career.'}</p>
              {career.legacySeason && <p className="mt-1 text-xs text-muted-foreground">This imported season uses its original opponent ratings for matches.</p>}
              <div tabIndex={0} role="region" aria-label={`${rivalName} squad`}
                className="mt-2 max-h-80 overflow-y-auto rounded-md border border-border px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ul className="divide-y divide-border text-sm">
                  {rivalSquad.map(({ player, contractEnd, marketYear }) => {
                    const future = player.futureContract;
                    const destination = future && clubs.find(club => club.id === future.clubId);
                    return (
                      <li key={player.id} className="break-words py-2">
                        <p className="font-semibold">{player.name}{career.openingRoster && !isNrlNamedPlayer(player.id) && ' (generated)'}</p>
                        <p className="text-muted-foreground">{player.role} · Age {player.age} · {player.rating} OVR</p>
                        <p className="text-xs text-muted-foreground">
                          Signed through {contractEnd}
                          {future && (future.clubId === rival.id ? ` · Extended through ${future.endYear}`
                            : ` · Joins ${destination ? shortName(season.year, destination.id) : 'another club'} in ${future.startYear}`)}
                          {marketYear !== null && ` · On the ${marketYear} market`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}

export default function NrlTeamManager() {
  const { search } = useLocation();
  const entry = resolveContinueSave(NRL_SAVE_ENTRY, search);
  if (!entry) return <Navigate to={NRL_SAVE_ENTRY.path} replace />;
  return <NrlManagerRoute entry={entry} search={search} />;
}

function NrlManagerRoute({ entry, search }: { entry: ContinueSave; search: string }) {
  const rules = useRulesGateState({ immediate: true });
  const showSlots = new URLSearchParams(search).get('view') === 'saves';
  return <>
    <CookieConsent inline waitForRulesHost={rules.open} />
    <NrlManagerScreen key={showSlots ? 'slots' : entry.saveKey} entry={entry} showSlots={showSlots} rules={rules} />
  </>;
}

function NrlManagerScreen({ entry, showSlots, rules }: {
  entry: ContinueSave; showSlots: boolean; rules: ReturnType<typeof useRulesGateState>;
}) {
  const navigate = useNavigate();
  const [initial] = useState(() => {
    if (showSlots) return null;
    saveFence.adopt(entry.saveKey);
    return readNrlSaveSlot(entry.saveKey);
  });
  const [career, setCareer] = useState(initial?.career ?? null);
  const season = career?.season ?? null;
  const custom = career?.customClub;
  const customManaged = custom && custom.slotId === season?.clubId ? custom : undefined;
  const retired = career?.retired === true;
  const outOfWork = career?.outOfWork === true;
  const current = useRef(career);
  const committed = useRef(initial?.raw ?? null);
  const [year, setYear] = useState<NrlYear>(initial?.career?.openingYear ?? 2026);
  const invalid = initial?.raw != null && initial.career === null;
  const arrival = useArrivalTop<HTMLHeadingElement>(showSlots ? 'slots' : !season ? 'choose' : outOfWork ? 'job-market' : `club-${season.year}`);
  const [panel, setPanel] = useState<Panel>(retired ? 'office' : 'match');
  const [office, setOffice] = useState<OfficeScreen>(retired ? 'history' : 'contracts');
  const [WorldCup, setWorldCup] = useState<Awaited<ReturnType<typeof loadWorldCup>>['default'] | null>(null);
  const [cupMode, setCupMode] = useState<'standalone' | 'appointment' | null>(null);
  const cupOpen = cupMode !== null;
  const [cupLoading, setCupLoading] = useState(false);
  const [cupLoadFailed, setCupLoadFailed] = useState(false);
  const cupLaunch = useRef<HTMLButtonElement>(null);
  const appointmentLaunch = useRef<HTMLButtonElement>(null);
  const returnFromCup = useRef<'standalone' | 'appointment' | null>(null);
  useEffect(() => {
    if (cupOpen || !returnFromCup.current) return;
    (returnFromCup.current === 'appointment' ? appointmentLaunch : cupLaunch).current?.focus();
    returnFromCup.current = null;
  }, [cupOpen]);
  const [showLiveResult, setShowLiveResult] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saveTooLarge, setSaveTooLarge] = useState(false);
  const [changed, setChanged] = useState(false);
  const [loadingNames, setLoadingNames] = useState(false);
  const [namesFailed, setNamesFailed] = useState(false);
  const startRequest = useRef<symbol | null>(null);
  useEffect(() => () => { startRequest.current = null; }, []);
  const { moved: fenceMoved } = useSaveFenceWatch(entry.saveKey);
  const moved = changed || fenceMoved;
  const complete = season?.phase === 'complete';
  const live = Boolean(season?.live);
  const rosterLocked = moved || live || retired;
  const [replayed] = useState(() => showSlots ? null : readNrlReplayCutoff(entry.saveKey));
  useGameCompletion(SLUG, Boolean(complete && career && nrlSeasonCanCredit(career, replayed)), undefined);

  const persist = useCallback((next: NrlCareerState) => {
    const raw = JSON.stringify(next);
    const outcome = writeNrlSaveSlot(entry.saveKey, committed.current, raw);
    if (outcome === 'moved') {
      setChanged(true);
      return outcome;
    }
    if (outcome === 'failed' && raw.length > NRL_SAVE_MAX_CHARS) {
      setSaveTooLarge(true);
      return 'too-large';
    }
    setSaveTooLarge(false);
    if (outcome === 'written') committed.current = raw;
    setSaveFailed(outcome === 'failed');
    current.current = next;
    setCareer(next);
    return outcome;
  }, [entry.saveKey]);

  useEffect(() => {
    if (saveFailed) return holdPendingSave(() => current.current !== null && persist(current.current) === 'written');
  }, [persist, saveFailed]);

  function openSlots() {
    if (saveFailed && current.current && persist(current.current) !== 'written') return;
    startRequest.current = null;
    navigate(entry.path + (entry.path.includes('?') ? '&' : '?') + 'view=saves', { replace: true });
  }

  async function openWorldCup(mode: 'standalone' | 'appointment') {
    if (WorldCup) {
      setCupMode(mode);
      return;
    }
    setCupLoading(true);
    setCupLoadFailed(false);
    try {
      const { default: loaded } = await loadWorldCup();
      setWorldCup(() => loaded);
      setCupMode(mode);
    } catch {
      setCupLoadFailed(true);
    } finally {
      setCupLoading(false);
    }
  }

  function closeWorldCup() {
    if (cupMode === 'appointment' && saveFailed && !moved && current.current && persist(current.current) !== 'written') return;
    returnFromCup.current = cupMode;
    setCupMode(null);
  }

  async function start(clubId: string, boardChallenge: boolean, openingNames: boolean, judiciary: boolean, customClub?: NrlCustomClub) {
    if (moved || startRequest.current || current.current || committed.current !== null) return;
    const seed = Math.floor(Math.random() * 0x1_0000_0000);
    if (openingNames) {
      const request = Symbol();
      startRequest.current = request;
      setLoadingNames(true);
      setNamesFailed(false);
      try {
        const next = year === 2026 ? await loadNrlOpeningMatchdayCareer(clubId, seed, boardChallenge)
          : await loadNrlPerthSigningsCareer(seed, boardChallenge);
        if (startRequest.current !== request || current.current || committed.current !== null) return;
        if (persist(next) === 'moved') return;
      } catch {
        if (startRequest.current === request) setNamesFailed(true);
        return;
      } finally {
        if (startRequest.current === request) {
          startRequest.current = null;
          setLoadingNames(false);
        }
      }
    } else {
      const next = customClub ? createNrlCustomCareer(clubId, seed, year, customClub, boardChallenge, judiciary)
        : createNrlCareer(clubId, seed, year, boardChallenge, judiciary);
      if (!next || persist(next) === 'moved') return;
    }
    setPanel('match');
    setShowLiveResult(false);
  }

  function dispatch(action: NrlCareerAction) {
    const before = current.current;
    if (!before) return false;
    const next = reduceNrlCareer(before, action);
    if (next === before) return false;
    const result = persist(next);
    if (result === 'moved' || result === 'too-large') return false;
    if (action.type === 'finishLive' || action.type === 'finishMinute60') setShowLiveResult(true);
    const newSeason = next.season.year !== before.season.year;
    if (action.type === 'advance' || newSeason) setShowLiveResult(false);
    if (newSeason) setPanel('match');
    return true;
  }

  function fastForward(request: NrlFastForwardRequest): FastForwardResult | null {
    const before = current.current;
    if (!before || moved) return null;
    const { state, stop } = runNrlFastForward(before, request);
    if (state !== before) {
      const result = persist(state);
      if (result === 'moved' || result === 'too-large') return null;
      setShowLiveResult(false);
    }
    return stop || state !== before ? { stop, rounds: state.season.round - before.season.round } : null;
  }

  return (
    <NrlClubIdentity.Provider value={custom}>
      <PageSeo title="NRL Team Manager: Rugby League Sim | DoUKnowBall"
        description="Free rugby league manager. Start in 2026 or 2027, pick your starting 13 and manage contracts and club finances. Manage Perth from its 2027 debut."
        path="/nrl-team-manager" />
      <GameNavbar />
      <main id="dukb-main" className="container mx-auto max-w-5xl space-y-5 px-3 pb-20 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 ref={arrival} className="font-display text-2xl font-black sm:text-3xl">NRL Team Manager</h1>
            {outOfWork && season ? (
              <p className="mt-1 text-sm text-muted-foreground">{retired ? 'Retired' : 'Between clubs'} · {season.year + Number(career?.satOutSeason === true)} season complete</p>
            ) : customManaged && season ? (
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <NrlCustomBadge {...customManaged} />
                <p className="min-w-0 break-words">{customManaged.name} · {season.year} season{retired ? ' · Retired' : ''}
                  <span className="block text-xs">Fictional club · {customManaged.ground}</span>
                </p>
              </div>
            ) : <p className="mt-1 text-sm text-muted-foreground">{season ? `${nrlClubName(season.year, season.clubId)} · ${season.year} season${retired ? ' · Retired' : ''}` : 'Take charge of a rugby league club across seasons.'}</p>}
            {career?.openingRoster === 'matchday-2026' && <p className="mt-1 text-xs text-muted-foreground">2026 opening matchday snapshot. Ratings, contracts, wages and later squads are simulated.</p>}
            {career?.openingRoster === 'perth-signings-2027' && <p className="mt-1 text-xs text-muted-foreground">2027 Perth Bears signings snapshot. The lineup, ages, ratings, contracts and later squads are simulated.</p>}
            {!showSlots && !cupOpen && <div className="mt-1 flex flex-wrap gap-x-2">
              <Button type="button" size="lg" variant="ghost" className="px-2" onClick={openSlots}>Career saves</Button>
              <Button ref={cupLaunch} type="button" size="lg" variant="ghost" className="max-w-full whitespace-normal px-2" onClick={() => openWorldCup('standalone')}
                disabled={cupLoading || loadingNames}>{cupLoading ? 'Loading World Cup…' : 'Rugby League World Cup'}</Button>
            </div>}
          </div>
          <RulesGate title="How to play NRL Team Manager" floatingTrigger={false} className="min-h-11 min-w-11" state={rules}>
            <ul className="list-disc space-y-2 pl-5">
              <li>Choose 2026 or 2027, then pick a club. You can use opening matchday names in 2026 or confirmed Perth Bears signings when starting with Perth in 2027. Ratings, contracts, fixtures and results are simulated.</li>
              <li>Name 13 starters and six reserves in Squad. Quick sim can use up to four of the reserves. Before a game, choose a tactic and train or recover.</li>
              <li>A match knock can put a player out for up to four rounds. Availability in Squad shows the first regular-season match an injured player can return for. The recovery countdown includes byes, and an available player fills the vacant spot.</li>
              <li>Buy medical upgrades with club cash in Finances. Upgrades shorten recovery from new knocks.</li>
              <li>Sign one fictional assistant in Finances. Tactical assistants help when you use their tactic. A development assistant can give an eligible young player 1 OVR after eight regular-season appearances from the hire onward.</li>
              <li>Choose a goal kicker and a backup in Squad. The backup takes over if your kicker leaves the starting 13. The halfback covers when neither is available. In Match centre, open Season fixtures to see your club’s match reports from this season.</li>
              <li>Before kick-off, open Hold one reserve for later to see the Quick Sim rotation and compare it with the Live rotation when you hold someone.</li>
              <li>Use First reserve in the rotation preview to change who gets first priority. It swaps two places on your named bench.</li>
              <li>Open Opposition report to compare the attack and defence edges of each available attack plan with automatic rotation.</li>
              <li>With a development assistant hired, check Development appearances in the rotation preview for players one match away from eight appearances.</li>
              <li>Check a late Selection promise in the rotation preview before kick-off. An eligible match counts toward the promise window if the player stays off.</li>
              <li>Play Live shows the first half. At half time, change tactics, bring on a held reserve, or keep a rotating reserve on. Choose Play to 60 minutes to bring on a held reserve who is still on the bench. Quick Sim settles the round in one action.</li>
              <li>If you are level or two points down at 60 minutes, you can set up a field goal. This trades some late try threat for a better field-goal chance in regulation.</li>
              <li>New match reports show points by period. A Live match you paused at 60 minutes splits the second half there. If the match went to extra time, its points have their own row.</li>
              <li>Open Matchday team sheet in a report with a player record to see the starting 13, the reserves who played and how many points each player scored.</li>
              <li>Advance a round to simulate every fixture. A win or bye earns two ladder points, a draw earns one and a loss earns zero.</li>
              <li>The top eight make finals. The top four get a second chance if they lose their qualifying final. The last club standing wins the premiership.</li>
              <li>Open Finals race in Ladder during the last four regular rounds to check your remaining opponents, possible ladder points and whether your club has secured a place.</li>
              <li>Scout a position in the Academy. The report arrives after you advance a round, and a promotion reserves a place next season.</li>
              <li>Regular-season club matches can raise or lower ratings by 1 OVR at a time. Check Rating changes in Squad. Existing ratings carry into the next season.</li>
              <li>Set a development focus in Season review for eligible players who are signed to return. It applies during the regular season.</li>
              <li>Check your regular-season board target in Season review.</li>
              <li>If you accepted Board pathways, check Pathways run-in in Season review with four regular-season club matches left. It shows who can still reach four appearances.</li>
              <li>Change clubs between seasons from Season review.</li>
              <li>Open State of Origin in the Club office to coach New South Wales or Queensland through three games alongside your club career.</li>
              <li>Choose Rugby League World Cup beside Career saves to coach a national team through a separate 2026 tournament.</li>
              <li>After finishing a 2026 club season, take a national appointment from the Club office before starting 2027. It saves inside your career.</li>
              <li>Review each season, manage contracts and recruit for the next year. An offer or counteroffer shows the change in cap room and open squad places for each year of the deal.</li>
              <li>Career saves lets you keep up to three careers in this browser.</li>
            </ul>
          </RulesGate>
        </header>

        {cupLoadFailed && <p role="status" className="rounded-xl border border-border bg-card p-3 text-sm">
          The World Cup could not load. <button type="button" className="min-h-11 font-bold underline" onClick={() => reloadToRetryChunk()}>Refresh to try again</button>
        </p>}
        {cupOpen && WorldCup && <WorldCup onBack={closeWorldCup} appointment={cupMode === 'appointment' && career ? {
          run: career.worldCup ?? null, stale: moved, locked: live || retired, saveFailed, saveTooLarge,
          onStart: nation => dispatch({ type: 'startWorldCupAppointment', nation }),
          onPlay: (previous, next) => dispatch({ type: 'playWorldCupAppointment', previous, next }),
          onRetry: () => { if (current.current) persist(current.current); },
        } : undefined} />}
        <div hidden={cupOpen} className="space-y-5">
        {!showSlots && moved && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This season changed in another tab. <button type="button" className="min-h-11 font-bold underline" onClick={() => window.location.reload()}>Reload your season</button>
        </div>}
        {!moved && saveTooLarge && <p className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This career reached the save size limit. Your last saved progress is still in this slot.
        </p>}
        {!moved && saveFailed && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This browser could not save your progress. {retired ? 'Retry to save your retirement.' : career?.satOutSeason ? 'Retry to save your season out.' : outOfWork ? 'Retry to save your departure.' : 'You can keep playing in this tab.'}{' '}
          <button type="button" className="min-h-11 font-bold underline" onClick={() => current.current && persist(current.current)}>Retry save</button>
        </div>}
        {showSlots ? (
          <NrlCareerSlots onOpen={path => navigate(path, { replace: true })} onBack={() => navigate(entry.path, { replace: true })} />
        ) : invalid ? (
          <p role="status" className="rounded-xl border border-border p-3 text-sm">This career could not be opened. Use Career saves to choose another slot or delete this save.</p>
        ) : !career || !season ? (
          <ClubChooser year={year} disabled={moved || loadingNames} loading={loadingNames} loadFailed={namesFailed}
            onYear={setYear} onStart={start} />
        ) : outOfWork ? (
          <NrlCareerOffice career={career} screen="history" disabled={moved || saveFailed} onAction={dispatch} />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2" role="group" aria-label="Manager screens">
              {PANELS.map(({ id, label, Icon }) => (
                <Button key={id} type="button" variant={panel === id ? 'default' : 'outline'} size="lg"
                  className="min-w-0 gap-1 whitespace-normal px-1 text-xs sm:gap-2 sm:text-sm"
                  aria-pressed={panel === id} onClick={() => setPanel(id)}>
                  <Icon aria-hidden="true" className="hidden sm:block" />{label}
                </Button>
              ))}
            </div>
            {panel === 'match' && <MatchCentre career={career} onAction={dispatch} onRun={fastForward} disabled={moved || retired} showLiveResult={showLiveResult}
              onReview={() => { setOffice('history'); setPanel('office'); }} onContracts={() => { setOffice('contracts'); setPanel('office'); }} />}
            {live && (panel === 'squad' || panel === 'office') && (
              <p className="rounded-xl border border-border bg-card p-3 text-sm">Finish the live match in Match centre to make changes.</p>
            )}
            {panel === 'squad' && <Squad career={career} onAction={dispatch} disabled={rosterLocked} />}
            {panel === 'ladder' && <Ladder career={career} />}
            {panel === 'office' && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Club office screens">
                  {OFFICE_SCREENS.map(({ id, label }) => (
                    <Button key={id} type="button" size="lg" className="px-2 text-sm last:col-span-2 sm:last:col-span-1" variant={office === id ? 'default' : 'outline'}
                      aria-pressed={office === id} onClick={() => setOffice(id)}>{label}</Button>
                  ))}
                </div>
                <NrlOriginOffice career={career} disabled={rosterLocked} onAction={dispatch} />
                {(career.worldCup || nrlWorldCupAppointmentAvailable(career)) && <div className="space-y-2 rounded-xl border border-border bg-card p-3">
                  <h2 className="font-display text-lg font-bold">National appointment</h2>
                  <p className="text-sm text-muted-foreground">{career.worldCup
                    ? `${career.worldCup.tactics.length} of ${NRL_WORLD_CUP_STAGES} World Cup stages played.`
                    : 'Coach a nation in the 2026 World Cup. Accept before starting 2027 or retiring.'}</p>
                  <Button ref={appointmentLaunch} type="button" size="lg" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal px-3 py-2"
                    disabled={moved || cupLoading} onClick={() => openWorldCup('appointment')}>
                    {career.worldCup?.tactics.length === NRL_WORLD_CUP_STAGES ? 'View 2026 World Cup results'
                      : career.worldCup ? 'Resume 2026 World Cup appointment' : 'Take 2026 World Cup appointment'}
                  </Button>
                </div>}
                <NrlCareerOffice key={office} career={career} screen={office} disabled={rosterLocked} onAction={dispatch} />
              </>
            )}
          </>
        )}
        </div>

        <GameSeoContent pageHasOwnH1 title="Build an NRL club across seasons"
          description="Choose a club, coach every round, and build your next squad with contracts and recruitment under the salary cap."
          reportGameContext={season ? { year: season.year, club: season.clubId, round: season.round } : { year }} />
        <GameNav />
      </main>
    </NrlClubIdentity.Provider>
  );
}
