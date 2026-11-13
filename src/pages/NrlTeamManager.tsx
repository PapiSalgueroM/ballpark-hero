import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BedDouble, BriefcaseBusiness, ChevronDown, ClipboardList, Radio, Table2, Trophy, Zap } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { RulesGate } from '@/components/game/RulesGate';
import NrlBoardChallengeNotice from '@/components/nrl-manager/NrlBoardChallengeNotice';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import NrlCareerSlots from '@/components/nrl-manager/NrlCareerSlots';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { resolveContinueSave, type ContinueSave } from '@/data/continueSaves';
import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { useArrivalTop } from '@/hooks/useArrivalTop';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import { nrlBoardChallengeStatus } from '@/lib/nrlBoardTarget';
import {
  nrlBench, nrlFitLineup, nrlHalftimeInterchanges, nrlHoldableReserves, nrlInjuries, nrlLadder, nrlMatchdaySelection, nrlNextRound,
  nrlRegularRounds, nrlRetrainingRoles, nrlSavedLineupPreview, nrlStarterOptions, NRL_BENCH_SIZE, NRL_COACHING_BONUS,
  NRL_MAX_BENCH_USED, NRL_ROLES,
  type NrlAction, type NrlAttackPlan, type NrlCoachRole, type NrlLiveHalf, type NrlManagerState, type NrlMatchResult, type NrlNextRound, type NrlRole, type NrlTactic,
} from '@/lib/nrlManager';
import {
  createNrlCareer, isNrlOpeningMatchdayPlayer, loadNrlOpeningMatchdayCareer, nrlAttackPlanPreview, nrlOppositionReport, nrlPositionTraining, nrlPositionTrainingCandidates, nrlRivalSquad,
  NRL_POSITION_TRAINING_ROUNDS, reduceNrlCareer, type NrlCareerAction, type NrlCareerState,
} from '@/lib/nrlCareer';
import { nrlScorePoints, nrlScoringLeaders, nrlSquadSeasonStats, nrlTryLeaders, type NrlSquadStatsScope } from '@/lib/nrlPlayerScoring';
import { NRL_SAVE_ENTRY, nrlSeasonCanCredit, readNrlReplayCutoff, readNrlSaveSlot, writeNrlSaveSlot } from '@/lib/nrlSaveSlots';
import { saveFence } from '@/lib/saveFence';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import { holdPendingSave } from '@/lib/safeStorage';

const SLUG = 'nrl-team-manager';
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
const attackPlanChoices: readonly { id: NrlAttackPlan; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'middle', label: 'Through the middle' },
  { id: 'wide', label: 'Shift wide' },
];
const attackPlanLabel = (plan: NrlAttackPlan) => attackPlanChoices.find(choice => choice.id === plan)?.label ?? 'Standard';
const coachTacticNote = (role: NrlCoachRole | undefined, tactic: NrlTactic) => role === tactic
  ? ` Your assistant adds +${NRL_COACHING_BONUS} ${role === 'attack' ? 'attack' : 'defence'} rating.` : '';

function shortName(year: number, id: string) {
  return nrlSeasonPlan(year).clubs.find(club => club.id === id)?.shortName ?? id;
}

function ClubChooser({ year, onYear, onStart, disabled, loading, loadFailed }: {
  year: NrlYear; onYear: (year: NrlYear) => void;
  onStart: (clubId: string, boardChallenge: boolean, openingNames: boolean) => void;
  disabled: boolean; loading: boolean; loadFailed: boolean;
}) {
  const [boardChallenge, setBoardChallenge] = useState(false);
  const [openingNames, setOpeningNames] = useState(false);
  const [reloadUnavailable, setReloadUnavailable] = useState(false);
  const competition = NRL_SEASONS[year];
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
        {year === 2026 && (
          <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border bg-background p-2 text-sm">
            <input type="checkbox" checked={openingNames} disabled={disabled} onChange={event => setOpeningNames(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
            <span>
              <span className="block font-semibold">2026 opening matchday names</span>
              <span className="block text-muted-foreground">Start each club with 19 verified names and opening ages, plus 11 generated players. Ratings, wages and contracts are simulated.</span>
            </span>
          </label>
        )}
        <label className="mt-3 flex min-h-11 items-start gap-2 rounded-lg border border-border bg-background p-2 text-sm">
          <input type="checkbox" checked={boardChallenge} disabled={disabled} onChange={event => setBoardChallenge(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            <span className="block font-semibold">Board challenge</span>
            <span className="block text-muted-foreground">Miss two targets in a row at one club and you must move after finals. A premiership clears the warning.</span>
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 id="nrl-choose-club" className="text-xl font-display font-bold">Choose your club</h2>
        <p className="text-sm text-muted-foreground">{competition.clubs.length} clubs · {competition.draw.length} rounds</p>
      </div>
      {loading && <p role="status" className="text-sm">Loading the 2026 matchday names...</p>}
      {loadFailed && year === 2026 && openingNames && (
        <div role="alert" className="rounded-xl border border-border bg-card p-3 text-sm">
          Could not load the 2026 matchday names. Clear the option to start with a generated squad.
          <button type="button" className="ml-2 min-h-11 font-bold underline" disabled={disabled}
            onClick={() => { if (!reloadToRetryChunk()) setReloadUnavailable(true); }}>Reload to try names again</button>
          {reloadUnavailable && <p>Reconnect or finish saving in this tab, then try reloading again.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {competition.clubs.map(club => (
          <button key={club.id} type="button" disabled={disabled} data-nrl-club={club.id}
            aria-label={`Manage ${club.name}`} onClick={() => onStart(club.id, boardChallenge, year === 2026 && openingNames)}
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

function scoreLine(result: NrlMatchResult, year: number) {
  return `${shortName(year, result.homeId)} ${result.homeScore}–${result.awayScore} ${shortName(year, result.awayId)}`;
}

function LiveHalftime({ live, season, title, onAction, disabled, coachRole }: {
  live: NrlLiveHalf; season: NrlManagerState; title: string;
  onAction: (action: NrlAction) => void; disabled: boolean; coachRole?: NrlCoachRole;
}) {
  const { year, tactic: openingTactic, squad } = season;
  const [tactic, setTactic] = useState(openingTactic);
  const [reserveId, setReserveId] = useState('');
  const { fixture, homeScoring, awayScoring } = live;
  const sides = [[fixture.homeId, homeScoring], [fixture.awayId, awayScoring]] as const;
  const options = nrlHalftimeInterchanges(season);
  const chosen = options.find(option => option.reserveId === reserveId);
  const heldName = live.heldReserveId && squad.find(player => player.id === live.heldReserveId)?.name;
  const name = (id: string) => squad.find(player => player.id === id)?.name;
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
        <p className="mt-2 text-sm text-muted-foreground">{tactics.find(option => option.id === tactic)?.description}{coachTacticNote(coachRole, tactic)}</p>
        {season.attackPlan && <p className="mt-2 text-sm">Attack plan: {attackPlanLabel(season.attackPlan)}. Locked for this match.</p>}
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
              value={reserveId} disabled={disabled} onChange={event => setReserveId(event.target.value)}>
              <option value="">{heldName ? 'Leave held reserve unused' : 'Automatic rotation'}</option>
              {options.map(option => <option key={option.reserveId} value={option.reserveId}>{option.enteredAtHalf && 'Bring on '}{name(option.reserveId)} · {option.role}</option>)}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">{heldName
              ? `${heldName} sat out the first half. Bring them on now or keep a rotating reserve on.`
              : 'Choose a reserve already in the rotation to finish the match. Their starter stays off.'}</p>
            {chosen && <p className="mt-1 text-sm" data-nrl-halftime-choice>
              {name(chosen.reserveId)} {chosen.enteredAtHalf ? 'comes on for the second half.' : 'finishes the match.'} {name(chosen.starterId)} stays off.
            </p>}
          </div>
        </details>
      ) : (
        <p className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
          The only rotating reserve covers the goal kicker’s position. Automatic rotation keeps the kicker available for the finish.
        </p>
      )}
      <Button type="button" size="lg" className="w-full" disabled={disabled}
        onClick={() => onAction({ type: 'finishLive', year, round: fixture.round, tactic,
          interchange: chosen && { starterId: chosen.starterId, reserveId: chosen.reserveId } })}>
        Play second half <ArrowRight aria-hidden="true" />
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
  return (
    <details className="group mt-3 border-t border-border" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>Attack plan{attackPlan && `: ${attackPlanLabel(attackPlan)}`}</span>
        <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      {expanded && (preview ? (
        <>
          <p className="text-xs text-muted-foreground">Compare projected ratings for this match. The middle uses props, hooker and lock. Wide uses wings and centres. Either specialist plan leaves more room for the opposition.</p>
          <div className="mt-2 grid gap-2" role="group" aria-label="Match attack plan">
            {attackPlanChoices.map(({ id, label }) => {
              const adjustment = id === 'standard' ? null : preview[id];
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
  const [expanded, setExpanded] = useState(false);
  const report = expanded ? nrlOppositionReport(career) : null;
  const { year } = career.season;
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

function SeasonFixtures({ season, next }: { season: NrlManagerState; next: NrlNextRound }) {
  const { year, clubId, results } = season;
  const { draw, clubs } = nrlSeasonPlan(year);
  const [view, setView] = useState('');
  const round = Number(view);
  const regular = draw[round - 1];
  const settled = results.filter(match => match.round === round);
  const upcoming = regular?.map(([homeId, awayId]) => ({ homeId, awayId }))
    ?? (next.finalsRound !== null && next.round === round ? next.fixtures : []);
  const matches = settled.length
    ? settled.map(match => ({ homeId: match.homeId, label: scoreLine(match, year) }))
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
                {number === draw.length + 4 ? 'Grand final' : `Finals week ${number - draw.length}`}
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
          {byes.length > 0 && <p className="border-t border-border pt-2 text-muted-foreground">
            {byes.length === 1 ? 'Bye' : 'Byes'} · {byes.map(club => club.shortName).join(', ')}
          </p>}
        </div>
      ) : (
        <ol aria-label="Club season fixtures" className="divide-y divide-border pb-2 text-sm">
          {draw.map((round, index) => {
            const fixture = round.find(([home, away]) => home === clubId || away === clubId);
            const result = results.find(row => row.round === index + 1 && (row.homeId === clubId || row.awayId === clubId));
            return (
              <li key={index} className="flex flex-wrap justify-between gap-x-2 py-2">
                <span className="text-muted-foreground">Round {index + 1}</span>
                <span>{result ? scoreLine(result, year) : fixture ? `${shortName(year, fixture[0])} vs ${shortName(year, fixture[1])}` : 'Bye'}</span>
              </li>
            );
          })}
        </ol>
      )}
    </details>
  );
}

function MatchCentre({ career, onAction, onReview, disabled, showLiveResult }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => void; onReview: () => void; disabled: boolean; showLiveResult: boolean;
}) {
  const { season } = career;
  const next = nrlNextRound(season);
  const { clubId, year, phase, championId } = season;
  const coachRole = career.finance.coachHire?.role;
  const [hold, setHold] = useState<{ year: number; round: number; reserveId: string }>();
  if (season.live) {
    return <LiveHalftime live={season.live} season={season} title={next.title} onAction={onAction} disabled={disabled} coachRole={coachRole} />;
  }
  const club = shortName(year, clubId);
  const match = next.clubMatch;
  const canPlayLive = Boolean(match && season.kickerId && season.bench);
  const holdable = canPlayLive ? nrlHoldableReserves(season) : [];
  const selectedHold = hold?.year === year && hold.round === season.round && holdable.some(player => player.id === hold.reserveId) ? hold : undefined;
  const opponent = match ? shortName(year, match.homeId === clubId ? match.awayId : match.homeId) : null;
  const latestRound = season.results.at(-1)?.round;
  const latest = latestRound === undefined ? [] : season.results.filter(result => result.round === latestRound);
  const lastMatch = latest.find(result => result.homeId === clubId || result.awayId === clubId);
  const goldenPoint = lastMatch?.goldenPoint;
  const usedReserves = lastMatch?.benchUsed?.map(id => season.squad.find(player => player.id === id)?.name).filter(Boolean) ?? [];
  const latestScorers = lastMatch?.playerScoring?.lines ?? [];
  const latestInjury = lastMatch?.injury;
  const injuredName = latestInjury && season.squad.find(player => player.id === latestInjury.playerId)?.name;
  const interchange = lastMatch?.halftimeInterchange;
  const finishingReserve = interchange && season.squad.find(player => player.id === interchange.reserveId)?.name;
  const restedStarter = interchange && season.squad.find(player => player.id === interchange.starterId)?.name;
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
        {lastMatch ? `${scoreLine(lastMatch, year)}${lastMatch.extraTime ? ' after extra time' : ''}` : 'Your club did not play this round.'}
      </p>
      {goldenPoint && (
        <p className="mt-2 text-sm text-muted-foreground" data-nrl-golden-point>
          {goldenPoint === 'draw' ? 'Golden point ended scoreless after two five-minute periods.'
            : `${shortName(year, lastMatch.homeScore > lastMatch.awayScore ? lastMatch.homeId : lastMatch.awayId)} won with ${goldenPointMethods[goldenPoint.score]} in the ${goldenPoint.period === 1 ? 'first' : 'second'} five-minute period of golden point.`}
        </p>
      )}
      {usedReserves.length > 0 && <div className="mt-3 text-sm" data-nrl-interchange>
        <h4 className="font-semibold">Interchange used</h4>
        <p className="text-muted-foreground">{usedReserves.join(", ")}</p>
        {finishingReserve && restedStarter && <p className="mt-1 text-muted-foreground" data-nrl-halftime-interchange>
          {interchange?.enteredAtHalf
            ? `${finishingReserve} came on for ${restedStarter} at half time. Each played about 40 minutes in regulation.`
            : `${finishingReserve} finished the match. In regulation, they played about 53 minutes. ${restedStarter} stayed off after half time and played about 27 minutes.`}
        </p>}
      </div>}
      {latestScorers.length > 0 && (
        <div className="mt-3 text-sm" data-nrl-scorers>
          <h4 className="font-semibold">Your scorers</h4>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {latestScorers.map(line => {
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
      {latestInjury && injuredName && (
        <p className="mt-3 text-sm text-muted-foreground" data-nrl-match-injury>
          {injuredName} picked up a knock and will miss {latestInjury.rounds} {latestInjury.rounds === 1 ? 'round' : 'rounds'}.
        </p>
      )}
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
      <div className="overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-950 p-4 text-emerald-50 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">{next.title}</p>
        <h2 className="mt-2 break-words font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
        {phase !== 'complete' && (
          <p className="mt-2 text-sm text-emerald-100">
            {match ? match.tieId === 'GF' ? 'Neutral ground' : match.homeId === clubId ? 'Home match' : 'Away match'
              : next.clubStatus === 'eliminated' ? 'You can finish the finals and see who wins.' : phase === 'regular' ? 'Your club gets two ladder points this round.' : 'Your club has advanced and rests this week.'}
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
            <p className="mt-2 text-sm text-muted-foreground">{tactics.find(tactic => tactic.id === season.tactic)?.description}{coachTacticNote(coachRole, season.tactic)}</p>
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
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {season.preparation === 'train' ? 'Boost attack this round and spend some fitness.'
                : season.preparation === 'recover' ? 'Rest your starters and restore more fitness.'
                  : 'Train for extra attack or recover to protect fitness.'}
            </p>
          </div>
        </div>
      )}

      {holdable.length > 0 && (
        <details className="group rounded-xl border border-border bg-card px-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Hold one reserve for halftime</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
          </summary>
          <div className="pb-4">
            <label htmlFor="nrl-hold-reserve" className="text-sm font-semibold">Opening rotation</label>
            <select id="nrl-hold-reserve" value={selectedHold?.reserveId ?? ''} disabled={disabled}
              className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={event => setHold(event.target.value ? { year, round: season.round, reserveId: event.target.value } : undefined)}>
              <option value="">Automatic rotation</option>
              {holdable.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role}</option>)}
            </select>
            <p className="mt-2 text-sm text-muted-foreground">Play Live uses at most three reserves in the first half and keeps this position free for a halftime change. Quick Sim uses the usual rotation.</p>
          </div>
        </details>
      )}
      {phase !== 'complete' && (
        <div className={canPlayLive ? 'grid grid-cols-2 gap-2' : undefined}>
          {canPlayLive && <Button type="button" size="lg" disabled={disabled} onClick={() => onAction({ type: 'startLive', hold: selectedHold })}>
            Play Live <ArrowRight aria-hidden="true" />
          </Button>}
          <Button type="button" size="lg" className="w-full" variant={canPlayLive ? 'outline' : 'default'}
            disabled={disabled} onClick={() => onAction({ type: 'advance' })} data-nrl-advance>
            {match ? 'Quick Sim' : phase === 'regular' ? 'Simulate bye round' : `Simulate ${next.title.toLowerCase()}`}
            {!canPlayLive && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      )}

      {phase !== 'regular' && (
        <details className="rounded-xl border border-border bg-card px-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-bold">Finals bracket</summary>
          <ol className="divide-y divide-border pb-2 text-sm">
            {season.results.filter(result => result.finalsRound).map(result => (
              <li key={result.tieId} className="flex flex-wrap justify-between gap-x-2 py-2">
                <span className="text-muted-foreground">{result.tieId === 'GF' ? 'Grand Final' : `Week ${result.finalsRound}`}</span>
                <strong>{scoreLine(result, year)}</strong>
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
  const { season, savedLineup } = career;
  const selection = disabled || career.legacySeason ? null : nrlMatchdaySelection(season);
  if (!selection) return null;
  const preview = savedLineup ? nrlSavedLineupPreview(season, savedLineup) : null;
  const nameOf = (id: string) => season.squad.find(player => player.id === id)?.name;
  const save = () => {
    if (onAction({ type: 'saveLineup', year: season.year, clubId: season.clubId })) summary.current?.focus();
  };
  return (
    <details className="group mt-3 rounded-lg border border-border bg-background px-3">
      <summary ref={summary} className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Saved lineup<ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-3 pb-3 text-sm">
        <p className="text-muted-foreground">Keep one starting 13, bench order and goal kicker for this season.</p>
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
            if (onAction({ type: 'applySavedLineup', previewKey: preview.key })) summary.current?.focus();
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

function Squad({ career, onAction, disabled }: {
  career: NrlCareerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const { season } = career;
  const bench = nrlBench(season);
  const injuries = nrlInjuries(season);
  const starters = new Set(Object.values(season.lineup));
  const leaders = nrlScoringLeaders(season);
  const tryLeaders = nrlTryLeaders(leaders);
  const unavailable = season.squad.filter(player => injuries.has(player.id));
  const reserves = season.squad.filter(player => !starters.has(player.id) && !injuries.has(player.id));
  const proposal = disabled ? null : nrlFitLineup(season);
  const nameOf = (id: string) => season.squad.find(player => player.id === id)?.name;
  const squadName = (id: string, name: string) =>
    career.openingRoster && !isNrlOpeningMatchdayPlayer(id) ? name + ' (generated)' : name;
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-squad">
      <h2 id="nrl-squad" className="font-display text-lg font-bold">Starting 13</h2>
      <p className="mt-1 text-sm text-muted-foreground">{career.openingRoster
        ? 'Side assignments and prop slots are editable game assignments. Choose a fit starter for each position.'
        : 'Players and ratings are fictional. Choose a fit starter for each position.'}</p>
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
      {season.injuryTracking ? (
        <section className="mt-4 rounded-lg border border-border bg-background p-3" aria-labelledby="nrl-availability" data-nrl-availability>
          <h3 id="nrl-availability" className="text-sm font-semibold">Availability</h3>
          {unavailable.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Everyone is available.</p> : (
            <>
              <ul className="mt-1 divide-y divide-border text-sm">
                {unavailable.map(player => {
                  const remaining = injuries.get(player.id)!;
                  return <li key={player.id} className="flex flex-wrap justify-between gap-x-3 py-1">
                    <span>{player.name} · {player.role}</span>
                    <span className="text-muted-foreground">Out for {remaining} {remaining === 1 ? 'round' : 'rounds'}</span>
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
          <p className="mt-1 text-xs text-muted-foreground">Your kicker gets credit for conversions and penalty goals. If they leave the starting lineup, the halfback takes over.</p>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground">Player scoring starts next season for this save.</p>}
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

function Ladder({ career }: { career: NrlCareerState }) {
  const { season } = career;
  const [scoutOpen, setScoutOpen] = useState(false);
  const [scoutClubId, setScoutClubId] = useState('');
  const rows = nrlLadder(season);
  const clubs = nrlSeasonPlan(season.year).clubs;
  const rivals = clubs.filter(club => club.id !== season.clubId);
  const rival = scoutOpen ? rivals.find(club => club.id === scoutClubId) : undefined;
  const rank = rows.findIndex(row => row.clubId === rival?.id && row.played > 0) + 1;
  const rivalSquad = rival ? nrlRivalSquad(career, rival.id) : [];
  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4" aria-labelledby="nrl-ladder">
      <h2 id="nrl-ladder" className="font-display text-lg font-bold">{season.year} ladder</h2>
      <p className="mt-1 text-sm text-muted-foreground">The top eight make the finals. Diff is points scored minus points conceded.</p>
      <table className="mt-3 w-full table-fixed text-left text-xs sm:text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="w-7 py-2"><span className="sr-only">Rank</span>#</th>
            <th scope="col">Club</th>
            <th scope="col" className="w-7 text-right"><abbr title="Played">P</abbr></th>
            <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Wins">W</abbr></th>
            <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Draws">D</abbr></th>
            <th scope="col" className="hidden w-9 text-right sm:table-cell"><abbr title="Losses">L</abbr></th>
            <th scope="col" className="w-9 text-right"><abbr title="Ladder points">Pts</abbr></th>
            <th scope="col" className="w-10 text-right"><abbr title="Points differential">Diff</abbr></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.clubId} data-nrl-ladder={row.clubId}
              className={`border-t border-border tabular-nums ${row.clubId === season.clubId ? 'bg-primary/10 font-bold' : ''} ${index === 8 ? 'border-t-2 border-t-primary/60' : ''}`}>
              <td className="py-2">{index + 1}</td>
              <th scope="row" className="break-words pr-1 font-medium">{shortName(season.year, row.clubId)}</th>
              <td className="text-right">{row.played}</td>
              <td className="hidden text-right sm:table-cell">{row.wins}</td>
              <td className="hidden text-right sm:table-cell">{row.draws}</td>
              <td className="hidden text-right sm:table-cell">{row.losses}</td>
              <td className="text-right font-bold">{row.points}</td>
              <td className="text-right">{row.differential > 0 ? '+' : ''}{row.differential}</td>
            </tr>
          ))}
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
              {rivals.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
          {rival && (
            <div>
              <h3 className="break-words text-sm font-bold">{rival.name} squad{rank > 0 && ` · Ladder ${rank}`}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{career.openingRoster
                && rivalSquad.some(({ player }) => isNrlOpeningMatchdayPlayer(player.id))
                ? 'Includes players from the 2026 opening snapshot. Squad development is simulated.'
                : 'Generated squad for this career.'}</p>
              {career.legacySeason && <p className="mt-1 text-xs text-muted-foreground">This imported season uses its original opponent ratings for matches.</p>}
              <div tabIndex={0} role="region" aria-label={`${rival.name} squad`}
                className="mt-2 max-h-80 overflow-y-auto rounded-md border border-border px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ul className="divide-y divide-border text-sm">
                  {rivalSquad.map(({ player, contractEnd, marketYear }) => {
                    const future = player.futureContract;
                    const destination = future && clubs.find(club => club.id === future.clubId);
                    return (
                      <li key={player.id} className="break-words py-2">
                        <p className="font-semibold">{player.name}{career.openingRoster && !isNrlOpeningMatchdayPlayer(player.id) && ' (generated)'}</p>
                        <p className="text-muted-foreground">{player.role} · Age {player.age} · {player.rating} OVR</p>
                        <p className="text-xs text-muted-foreground">
                          Signed through {contractEnd}
                          {future && (future.clubId === rival.id ? ` · Extended through ${future.endYear}`
                            : ` · Joins ${destination?.shortName ?? 'another club'} in ${future.startYear}`)}
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
  const showSlots = new URLSearchParams(search).get('view') === 'saves';
  return <NrlManagerScreen key={showSlots ? 'slots' : entry.saveKey} entry={entry} showSlots={showSlots} />;
}

function NrlManagerScreen({ entry, showSlots }: { entry: ContinueSave; showSlots: boolean }) {
  const navigate = useNavigate();
  const [initial] = useState(() => {
    if (showSlots) return null;
    saveFence.adopt(entry.saveKey);
    return readNrlSaveSlot(entry.saveKey);
  });
  const [career, setCareer] = useState(initial?.career ?? null);
  const season = career?.season ?? null;
  const retired = career?.retired === true;
  const current = useRef(career);
  const committed = useRef(initial?.raw ?? null);
  const [year, setYear] = useState<NrlYear>(initial?.career?.openingYear ?? 2026);
  const invalid = initial?.raw != null && initial.career === null;
  const arrival = useArrivalTop<HTMLHeadingElement>(showSlots ? 'slots' : !season ? 'choose' : `club-${season?.year}`);
  const [panel, setPanel] = useState<Panel>(retired ? 'office' : 'match');
  const [office, setOffice] = useState<OfficeScreen>(retired ? 'history' : 'contracts');
  const [showLiveResult, setShowLiveResult] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
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

  async function start(clubId: string, boardChallenge: boolean, openingNames: boolean) {
    if (moved || startRequest.current || current.current || committed.current !== null) return;
    const seed = Math.floor(Math.random() * 0x1_0000_0000);
    if (openingNames && year === 2026) {
      const request = Symbol();
      startRequest.current = request;
      setLoadingNames(true);
      setNamesFailed(false);
      try {
        const next = await loadNrlOpeningMatchdayCareer(clubId, seed, boardChallenge);
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
    } else if (persist(createNrlCareer(clubId, seed, year, boardChallenge)) === 'moved') return;
    setPanel('match');
    setShowLiveResult(false);
  }

  function dispatch(action: NrlCareerAction) {
    const before = current.current;
    if (!before) return false;
    const next = reduceNrlCareer(before, action);
    if (next === before || persist(next) === 'moved') return false;
    if (action.type === 'finishLive') setShowLiveResult(true);
    if (action.type === 'advance' || action.type === 'startNextSeason') setShowLiveResult(false);
    if (action.type === 'startNextSeason') setPanel('match');
    return true;
  }

  return (
    <>
      <PageSeo title="NRL Team Manager: Rugby League Sim | DoUKnowBall"
        description="Start in 2026 or 2027, pick your starting 13 and manage contracts, recruitment and club finances across seasons. Manage Perth from its 2027 debut."
        path="/nrl-team-manager" />
      <GameNavbar />
      <main id="dukb-main" className="container mx-auto max-w-5xl space-y-5 px-3 pb-20 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 ref={arrival} className="font-display text-2xl font-black sm:text-3xl">NRL Team Manager</h1>
            <p className="mt-1 text-sm text-muted-foreground">{season ? `${shortName(season.year, season.clubId)} · ${season.year} season${retired ? ' · Retired' : ''}` : 'Take charge of a rugby league club across seasons.'}</p>
            {career?.openingRoster && <p className="mt-1 text-xs text-muted-foreground">2026 opening matchday snapshot. Ratings, contracts, wages and later squads are simulated.</p>}
            {!showSlots && <Button type="button" size="lg" variant="ghost" className="mt-1 px-2" onClick={openSlots}>Career saves</Button>}
          </div>
          <RulesGate title="How to play NRL Team Manager" floatingTrigger={false} className="min-h-11 min-w-11">
            <ul className="list-disc space-y-2 pl-5">
              <li>Choose 2026 or 2027, then pick a club. The Perth Bears enter in 2027. In 2026 you can choose opening matchday names. Ratings, contracts, fixtures and results are simulated.</li>
              <li>Name 13 starters and six reserves in Squad. Quick sim can use up to four of the reserves. Before a game, choose a tactic and train or recover.</li>
              <li>A match knock can put a player out for up to four rounds. Check Availability in Squad. The countdown includes byes, and an available player fills the vacant spot.</li>
              <li>Buy medical upgrades with club cash in Finances. Upgrades shorten recovery from new knocks.</li>
              <li>Sign one fictional assistant in Finances. Their rating bonus applies when you use their tactic.</li>
              <li>Choose your goal kicker in Squad to credit conversions and penalty goals. Match centre shows your scorers.</li>
              <li>Play Live shows the first half. At half time, change tactics, bring on a reserve you held back, or keep a rotating reserve on. Quick Sim settles the round in one action.</li>
              <li>Advance a round to simulate every fixture. A win or bye earns two ladder points, a draw earns one and a loss earns zero.</li>
              <li>The top eight make finals. The top four get a second chance if they lose their qualifying final. The last club standing wins the premiership.</li>
              <li>Scout a position in the Academy. The report arrives after you advance a round, and a promotion reserves a place next season.</li>
              <li>Set a development focus in Season review. It applies to returning players when you start the next year.</li>
              <li>Check your regular-season board target in Season review.</li>
              <li>Change clubs between seasons from Season review.</li>
              <li>Review each season, manage contracts and recruit for the next year. Career saves lets you keep up to three careers in this browser.</li>
            </ul>
          </RulesGate>
        </header>

        {!showSlots && moved && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This season changed in another tab. <button type="button" className="min-h-11 font-bold underline" onClick={() => window.location.reload()}>Reload your season</button>
        </div>}
        {!moved && saveFailed && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This browser could not save your progress. {retired ? 'Retry to save your retirement.' : 'You can keep playing in this tab.'}{' '}
          <button type="button" className="min-h-11 font-bold underline" onClick={() => current.current && persist(current.current)}>Retry save</button>
        </div>}
        {showSlots ? (
          <NrlCareerSlots onOpen={path => navigate(path, { replace: true })} onBack={() => navigate(entry.path, { replace: true })} />
        ) : invalid ? (
          <p role="status" className="rounded-xl border border-border p-3 text-sm">This career could not be opened. Use Career saves to choose another slot or delete this save.</p>
        ) : !career || !season ? (
          <ClubChooser year={year} disabled={moved || loadingNames} loading={loadingNames} loadFailed={namesFailed}
            onYear={setYear} onStart={start} />
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
            {panel === 'match' && <MatchCentre career={career} onAction={dispatch} disabled={moved || retired} showLiveResult={showLiveResult}
              onReview={() => { setOffice('history'); setPanel('office'); }} />}
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
                <NrlCareerOffice key={office} career={career} screen={office} disabled={rosterLocked} onAction={dispatch} />
              </>
            )}
          </>
        )}

        <GameSeoContent pageHasOwnH1 title="Build an NRL club across seasons"
          description="Choose a club, coach every round, and build your next squad with contracts and recruitment under the salary cap."
          reportGameContext={season ? { year: season.year, club: season.clubId, round: season.round } : { year }} />
        <GameNav />
      </main>
    </>
  );
}
