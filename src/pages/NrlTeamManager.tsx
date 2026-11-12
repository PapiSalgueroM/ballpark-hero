import { useRef, useState } from 'react';
import { ArrowRight, BedDouble, BriefcaseBusiness, ClipboardList, Radio, Table2, Trophy, Zap } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { RulesGate } from '@/components/game/RulesGate';
import NrlCareerOffice from '@/components/nrl-manager/NrlCareerOffice';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { useArrivalTop } from '@/hooks/useArrivalTop';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import {
  nrlBench, nrlInjuries, nrlLadder, nrlNextRound, nrlStarterOptions, NRL_BENCH_SIZE, NRL_MAX_BENCH_USED, NRL_ROLES, NRL_SAVE_KEY,
  type NrlAction, type NrlLiveHalf, type NrlManagerState, type NrlMatchResult, type NrlTactic,
} from '@/lib/nrlManager';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerAction, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlScorePoints, nrlScoringLeaders, nrlTryLeaders } from '@/lib/nrlPlayerScoring';
import { saveFence } from '@/lib/saveFence';

const SLUG = 'nrl-team-manager';
const YEARS = [2026, 2027] as const;
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

function shortName(year: number, id: string) {
  return nrlSeasonPlan(year).clubs.find(club => club.id === id)?.shortName ?? id;
}

function initialSave() {
  saveFence.adopt(NRL_SAVE_KEY);
  try {
    const raw = localStorage.getItem(NRL_SAVE_KEY);
    const career = readNrlCareerSave(raw);
    return { career, invalid: raw !== null && career === null };
  } catch {
    return { career: null, invalid: false };
  }
}

function ClubChooser({ year, season, onYear, onStart, onReturn, disabled }: {
  year: NrlYear; season: NrlManagerState | null; onYear: (year: NrlYear) => void;
  onStart: (clubId: string) => void; onReturn: () => void; disabled: boolean;
}) {
  const competition = NRL_SEASONS[year];
  return (
    <section aria-labelledby="nrl-choose-club" className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-lg font-bold">Choose a season</h2>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Starting season">
          {YEARS.map(option => (
            <Button key={option} type="button" size="lg" variant={year === option ? 'default' : 'outline'}
              aria-pressed={year === option} onClick={() => onYear(option)} className="h-auto min-h-12 flex-col gap-0 whitespace-normal px-2 py-2">
              <span className="text-base font-bold">{option}</span>
              <span className="text-xs">{option === 2027 ? 'Perth Bears debut' : '17 clubs'}</span>
            </Button>
          ))}
        </div>
        {season && (
          <Button type="button" size="lg" variant="ghost" className="mt-3 whitespace-normal px-2 text-left" onClick={onReturn}>
            Back to {shortName(season.year, season.clubId)} {season.year}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <h2 id="nrl-choose-club" className="text-xl font-display font-bold">Choose your club</h2>
        <p className="text-sm text-muted-foreground">{competition.clubs.length} clubs · {competition.draw.length} rounds</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {competition.clubs.map(club => (
          <button key={club.id} type="button" disabled={disabled} data-nrl-club={club.id}
            aria-label={`Manage ${club.name}`} onClick={() => onStart(club.id)}
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

function LiveHalftime({ live, year, title, openingTactic, onAction, disabled }: {
  live: NrlLiveHalf; year: number; title: string; openingTactic: NrlTactic;
  onAction: (action: NrlAction) => void; disabled: boolean;
}) {
  const [tactic, setTactic] = useState(openingTactic);
  const { fixture, homeScoring, awayScoring } = live;
  const sides = [[fixture.homeId, homeScoring], [fixture.awayId, awayScoring]] as const;
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
        <p className="mt-2 text-sm text-muted-foreground">{tactics.find(option => option.id === tactic)?.description}</p>
      </div>
      <Button type="button" size="lg" className="w-full" disabled={disabled}
        onClick={() => onAction({ type: 'finishLive', year, round: fixture.round, tactic })}>
        Play second half <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

function MatchCentre({ season, onAction, onReview, disabled, showLiveResult }: {
  season: NrlManagerState; onAction: (action: NrlAction) => void; onReview: () => void; disabled: boolean; showLiveResult: boolean;
}) {
  const next = nrlNextRound(season);
  const { clubId, year, phase, championId } = season;
  if (season.live) {
    return <LiveHalftime live={season.live} year={year} title={next.title} openingTactic={season.tactic} onAction={onAction} disabled={disabled} />;
  }
  const club = shortName(year, clubId);
  const match = next.clubMatch;
  const canPlayLive = Boolean(match && season.kickerId && season.bench);
  const opponent = match ? shortName(year, match.homeId === clubId ? match.awayId : match.homeId) : null;
  const latestRound = season.results.at(-1)?.round;
  const latest = latestRound === undefined ? [] : season.results.filter(result => result.round === latestRound);
  const lastMatch = latest.find(result => result.homeId === clubId || result.awayId === clubId);
  const usedReserves = lastMatch?.benchUsed?.map(id => season.squad.find(player => player.id === id)?.name).filter(Boolean) ?? [];
  const latestScorers = lastMatch?.playerScoring?.lines ?? [];
  const latestInjury = lastMatch?.injury;
  const injuredName = latestInjury && season.squad.find(player => player.id === latestInjury.playerId)?.name;
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
      {usedReserves.length > 0 && <div className="mt-3 text-sm" data-nrl-interchange>
        <h4 className="font-semibold">Interchange used</h4>
        <p className="text-muted-foreground">{usedReserves.join(", ")}</p>
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
            <p className="mt-2 text-sm text-muted-foreground">{tactics.find(tactic => tactic.id === season.tactic)?.description}</p>
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

      {phase !== 'complete' && (
        <div className={canPlayLive ? 'grid grid-cols-2 gap-2' : undefined}>
          {canPlayLive && <Button type="button" size="lg" disabled={disabled} onClick={() => onAction({ type: 'startLive' })}>
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

      <details className="rounded-xl border border-border bg-card px-4">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold">Season fixtures</summary>
        <ol className="divide-y divide-border pb-2 text-sm">
          {nrlSeasonPlan(year).draw.map((round, index) => {
            const fixture = round.find(([home, away]) => home === clubId || away === clubId);
            const result = season.results.find(row => row.round === index + 1 && (row.homeId === clubId || row.awayId === clubId));
            return (
              <li key={index} className="flex flex-wrap justify-between gap-x-2 py-2">
                <span className="text-muted-foreground">Round {index + 1}</span>
                <span>{result ? scoreLine(result, year) : fixture ? `${shortName(year, fixture[0])} vs ${shortName(year, fixture[1])}` : 'Bye'}</span>
              </li>
            );
          })}
        </ol>
      </details>

      {!showLiveResult && report}
    </section>
  );
}

function Squad({ season, onAction, disabled }: {
  season: NrlManagerState; onAction: (action: NrlAction) => void; disabled: boolean;
}) {
  const bench = nrlBench(season);
  const injuries = nrlInjuries(season);
  const starters = new Set(Object.values(season.lineup));
  const leaders = nrlScoringLeaders(season);
  const tryLeaders = nrlTryLeaders(leaders);
  const unavailable = season.squad.filter(player => injuries.has(player.id));
  const reserves = season.squad.filter(player => !starters.has(player.id) && !injuries.has(player.id));
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-squad">
      <h2 id="nrl-squad" className="font-display text-lg font-bold">Starting 13</h2>
      <p className="mt-1 text-sm text-muted-foreground">Players and ratings are fictional. Choose a fit starter for each position.</p>
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
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {NRL_ROLES.map((role, index) => (
          <div key={role} className="min-w-0">
            <label htmlFor={`nrl-starter-${index}`} className="mb-1 block text-sm font-semibold">{role}</label>
            <select id={`nrl-starter-${index}`} value={season.lineup[role]} disabled={disabled || season.phase === 'complete'}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              onChange={event => onAction({ type: 'selectStarter', role, playerId: event.target.value })}>
              {nrlStarterOptions(season, role).map(player => (
                <option key={player.id} value={player.id}>{player.name} · {player.rating} OVR · {player.fitness}% fit{player.role !== role ? ' · Utility cover' : ''}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {season.kickerId ? (
        <div className="mt-5 border-t border-border pt-4">
          <label htmlFor="nrl-goal-kicker" className="block text-sm font-semibold">Goal kicker</label>
          <select id="nrl-goal-kicker" value={season.kickerId} disabled={disabled || season.phase === 'complete'}
            className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
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
                {reserves.map(player => <option key={player.id} value={player.id}>{player.name} · {player.role} · {player.fitness}% fit</option>)}
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

function Ladder({ season }: { season: NrlManagerState }) {
  const rows = nrlLadder(season);
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
    </section>
  );
}

export default function NrlTeamManager() {
  const [initial] = useState(initialSave);
  const [career, setCareer] = useState(initial.career);
  const season = career?.season ?? null;
  const current = useRef(career);
  const [year, setYear] = useState<NrlYear>(initial.career?.openingYear ?? 2026);
  const [choosing, setChoosing] = useState(!season);
  const arrival = useArrivalTop<HTMLHeadingElement>(choosing ? 'choose' : `club-${season?.year}`);
  const [confirm, setConfirm] = useState(false);
  const [panel, setPanel] = useState<Panel>('match');
  const [office, setOffice] = useState<OfficeScreen>('contracts');
  const [showLiveResult, setShowLiveResult] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const { moved, check } = useSaveFenceWatch(NRL_SAVE_KEY);
  const complete = season?.phase === 'complete';
  const live = Boolean(season?.live);
  useGameCompletion(SLUG, complete, undefined);

  function persist(next: NrlCareerState) {
    const outcome = saveFence.write(NRL_SAVE_KEY, () => {
      localStorage.setItem(NRL_SAVE_KEY, JSON.stringify(next));
      return true;
    });
    if (outcome === 'moved') {
      check();
      return false;
    }
    setSaveFailed(outcome === 'failed');
    current.current = next;
    setCareer(next);
    return true;
  }

  function start(clubId: string) {
    const next = createNrlCareer(clubId, Math.floor(Math.random() * 0x1_0000_0000), year);
    if (!persist(next)) return;
    setChoosing(false);
    setPanel('match');
    setShowLiveResult(false);
  }

  function dispatch(action: NrlCareerAction) {
    const before = current.current;
    if (!before) return false;
    const next = reduceNrlCareer(before, action);
    if (next === before || !persist(next)) return false;
    if (action.type === 'startLive') setConfirm(false);
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
            <p className="mt-1 text-sm text-muted-foreground">{season && !choosing ? `${shortName(season.year, season.clubId)} · ${season.year} season` : 'Take charge of a rugby league club across seasons.'}</p>
          </div>
          <RulesGate title="How to play NRL Team Manager" floatingTrigger={false} className="min-h-11 min-w-11">
            <ul className="list-disc space-y-2 pl-5">
              <li>Choose 2026 or 2027, then pick a club. The Perth Bears enter in 2027. Your players, ratings, draw and results are simulated.</li>
              <li>Name 13 starters and six reserves in Squad. Quick sim can use up to four of the reserves. Before a game, choose a tactic and train or recover.</li>
              <li>A match knock can put a player out for up to four rounds. Check Availability in Squad. The countdown includes byes, and an available player fills the vacant spot.</li>
              <li>Choose your goal kicker in Squad to credit conversions and penalty goals. Match centre shows your scorers.</li>
              <li>Play Live shows the first half and lets you change the tactic for the second. Quick Sim settles the whole round in one action.</li>
              <li>Advance a round to simulate every fixture. A win or bye earns two ladder points, a draw earns one and a loss earns zero.</li>
              <li>The top eight make finals. The top four get a second chance if they lose their qualifying final. The last club standing wins the premiership.</li>
              <li>Scout a position in the Academy. The report arrives after you advance a round, and a promotion reserves a place next season.</li>
              <li>Set a development focus in Season review. It applies to returning players when you start the next year.</li>
              <li>Review each season, manage contracts and recruit for the next year. The career saves on this browser. Starting over replaces the current save.</li>
            </ul>
          </RulesGate>
        </header>

        {moved && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This season changed in another tab. <button type="button" className="min-h-11 font-bold underline" onClick={() => window.location.reload()}>Reload your season</button>
        </div>}
        {!moved && saveFailed && <div className="rounded-xl border border-amber-500/50 bg-card p-3 text-sm" role="status">
          This browser could not save your progress. You can keep playing in this tab.{' '}
          <button type="button" className="min-h-11 font-bold underline" onClick={() => current.current && persist(current.current)}>Retry save</button>
        </div>}
        {initial.invalid && !season && <p role="status" className="rounded-xl border border-border p-3 text-sm">The previous save could not be opened. Starting a season replaces it.</p>}

        {choosing || !career || !season ? (
          <ClubChooser year={year} season={season} disabled={moved} onYear={setYear} onStart={start} onReturn={() => setChoosing(false)} />
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
            {panel === 'match' && <MatchCentre season={season} onAction={dispatch} disabled={moved} showLiveResult={showLiveResult}
              onReview={() => { setOffice('history'); setPanel('office'); }} />}
            {live && (panel === 'squad' || panel === 'office') && (
              <p className="rounded-xl border border-border bg-card p-3 text-sm">Finish the live match in Match centre to make changes.</p>
            )}
            {panel === 'squad' && <Squad season={season} onAction={dispatch} disabled={moved || live} />}
            {panel === 'ladder' && <Ladder season={season} />}
            {panel === 'office' && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="group" aria-label="Club office screens">
                  {OFFICE_SCREENS.map(({ id, label }) => (
                    <Button key={id} type="button" size="lg" className="px-2 text-sm last:col-span-2 sm:last:col-span-1" variant={office === id ? 'default' : 'outline'}
                      aria-pressed={office === id} onClick={() => setOffice(id)}>{label}</Button>
                  ))}
                </div>
                <NrlCareerOffice key={office} career={career} screen={office} disabled={moved || live} onAction={dispatch} />
              </>
            )}
            {!live && (confirm ? (
              <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
                <p>Starting a new career replaces this save.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="lg" variant="outline" className="px-3" onClick={() => setConfirm(false)}>Keep this season</Button>
                  <Button type="button" size="lg" className="px-3" onClick={() => { setConfirm(false); setYear(career.openingYear); setChoosing(true); }}>Choose a new career</Button>
                </div>
              </div>
            ) : <Button type="button" size="lg" variant="ghost" className="px-3" onClick={() => setConfirm(true)}>Start over</Button>)}
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
