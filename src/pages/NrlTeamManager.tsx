import { useRef, useState } from 'react';
import { ArrowRight, BedDouble, ClipboardList, Radio, Table2, Trophy, Zap } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { RulesGate } from '@/components/game/RulesGate';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { useArrivalTop } from '@/hooks/useArrivalTop';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import {
  createNrlSeason, nrlLadder, nrlNextRound, NRL_ROLES, NRL_SAVE_KEY, readNrlSave, reduceNrlSeason,
  type NrlAction, type NrlManagerState, type NrlMatchResult, type NrlTactic,
} from '@/lib/nrlManager';
import { saveFence } from '@/lib/saveFence';

const SLUG = 'nrl-team-manager';
const YEARS = [2026, 2027] as const;
const PANELS = [
  { id: 'match', label: 'Match centre', Icon: Radio },
  { id: 'squad', label: 'Squad', Icon: ClipboardList },
  { id: 'ladder', label: 'Ladder', Icon: Table2 },
] as const;
type Panel = typeof PANELS[number]['id'];

const tactics: { id: NrlTactic; label: string; description: string }[] = [
  { id: 'balanced', label: 'Balanced', description: 'Keep your attack and defence even.' },
  { id: 'attack', label: 'Attack', description: 'Chase tries and risk leaving gaps.' },
  { id: 'defense', label: 'Defence', description: 'Protect your line and create fewer chances.' },
];

function shortName(year: NrlYear, id: string) {
  return NRL_SEASONS[year].clubs.find(club => club.id === id)?.shortName ?? id;
}

function initialSave() {
  saveFence.adopt(NRL_SAVE_KEY);
  try {
    const raw = localStorage.getItem(NRL_SAVE_KEY);
    const season = readNrlSave(raw);
    return { season, invalid: raw !== null && season === null };
  } catch {
    return { season: null, invalid: false };
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

function scoreLine(result: NrlMatchResult, year: NrlYear) {
  return `${shortName(year, result.homeId)} ${result.homeScore}–${result.awayScore} ${shortName(year, result.awayId)}`;
}

function MatchCentre({ season, onAction, disabled }: {
  season: NrlManagerState; onAction: (action: NrlAction) => void; disabled: boolean;
}) {
  const next = nrlNextRound(season);
  const { clubId, year, phase, championId } = season;
  const club = shortName(year, clubId);
  const match = next.clubMatch;
  const opponent = match ? shortName(year, match.homeId === clubId ? match.awayId : match.homeId) : null;
  const latestRound = season.results.at(-1)?.round;
  const latest = latestRound === undefined ? [] : season.results.filter(result => result.round === latestRound);
  const lastMatch = latest.find(result => result.homeId === clubId || result.awayId === clubId);
  const starterIds = new Set(Object.values(season.lineup));
  const fitness = Math.round(season.squad.reduce((sum, player) => sum + (starterIds.has(player.id) ? player.fitness : 0), 0) / NRL_ROLES.length);
  const title = phase === 'complete'
    ? championId === clubId ? 'You won the premiership!' : `${championId ? shortName(year, championId) : 'Season'} champions`
    : opponent ? `${club} vs ${opponent}` : next.clubStatus === 'eliminated' ? `${club} are out` : `${club} have a bye`;

  return (
    <section className="space-y-4" aria-label="Match centre">
      <div className="overflow-hidden rounded-2xl border border-emerald-500/35 bg-emerald-950 p-4 text-emerald-50 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">{next.title}</p>
        <h2 className="mt-2 break-words font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
        {phase !== 'complete' && (
          <p className="mt-2 text-sm text-emerald-100">
            {match ? match.tieId === 'GF' ? 'Neutral ground' : match.homeId === clubId ? 'Home match' : 'Away match'
              : next.clubStatus === 'eliminated' ? 'You can finish the finals and see who wins.' : phase === 'regular' ? 'Your club gets two ladder points this round.' : 'Your club has advanced and rests this week.'}
          </p>
        )}
        {phase === 'complete' && <Trophy className="mt-3 text-amber-300" aria-hidden="true" />}
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
        <Button type="button" size="lg" className="w-full" disabled={disabled} onClick={() => onAction({ type: 'advance' })} data-nrl-advance>
          {match ? 'Play match' : phase === 'regular' ? 'Simulate bye round' : `Simulate ${next.title.toLowerCase()}`}<ArrowRight aria-hidden="true" />
        </Button>
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
          {NRL_SEASONS[year].draw.map((round, index) => {
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

      {latest.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-results">
          <h3 id="nrl-results" className="font-bold">{latest[0].tieId === 'GF' ? 'Grand Final result' : latest[0].finalsRound ? 'Latest finals results' : `Round ${latestRound} results`}</h3>
          <p className="mt-1 text-sm text-muted-foreground" role="status" data-nrl-result>
            {lastMatch ? `${scoreLine(lastMatch, year)}${lastMatch.extraTime ? ' after extra time' : ''}` : 'Your club did not play this round.'}
          </p>
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
      )}
    </section>
  );
}

function Squad({ season, onAction, disabled }: {
  season: NrlManagerState; onAction: (action: NrlAction) => void; disabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="nrl-squad">
      <h2 id="nrl-squad" className="font-display text-lg font-bold">Starting 13</h2>
      <p className="mt-1 text-sm text-muted-foreground">Players and ratings are fictional. Swap a tired starter for a fresh player in the same position.</p>
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        {NRL_ROLES.map((role, index) => (
          <div key={role} className="min-w-0">
            <label htmlFor={`nrl-starter-${index}`} className="mb-1 block text-sm font-semibold">{role}</label>
            <select id={`nrl-starter-${index}`} value={season.lineup[role]} disabled={disabled || season.phase === 'complete'}
              className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              onChange={event => onAction({ type: 'selectStarter', role, playerId: event.target.value })}>
              {season.squad.filter(player => player.role === role).map(player => (
                <option key={player.id} value={player.id}>{player.name} · {player.rating} OVR · {player.fitness}% fit</option>
              ))}
            </select>
          </div>
        ))}
      </div>
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
  const [season, setSeason] = useState(initial.season);
  const current = useRef(season);
  const [year, setYear] = useState<NrlYear>(initial.season?.year ?? 2026);
  const [choosing, setChoosing] = useState(!season);
  const arrival = useArrivalTop<HTMLHeadingElement>(choosing ? 'choose' : 'club');
  const [confirm, setConfirm] = useState(false);
  const [panel, setPanel] = useState<Panel>('match');
  const [saveFailed, setSaveFailed] = useState(false);
  const { moved, check } = useSaveFenceWatch(NRL_SAVE_KEY);
  const complete = season?.phase === 'complete';
  useGameCompletion(SLUG, complete, undefined);

  function persist(next: NrlManagerState) {
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
    setSeason(next);
    return true;
  }

  function start(clubId: string) {
    const next = createNrlSeason(clubId, Math.floor(Math.random() * 0x1_0000_0000), year);
    if (!persist(next)) return;
    setChoosing(false);
    setPanel('match');
  }

  function dispatch(action: NrlAction) {
    const before = current.current;
    if (!before) return;
    const next = reduceNrlSeason(before, action);
    if (next !== before) persist(next);
  }

  return (
    <>
      <PageSeo title="NRL Team Manager: Rugby League Sim | DoUKnowBall"
        description="Choose a 2026 or 2027 NRL club, pick your starting 13 and manage tactics, training and recovery in a free rugby league sim. Includes Perth in 2027."
        path="/nrl-team-manager" />
      <GameNavbar />
      <main id="dukb-main" className="container mx-auto max-w-5xl space-y-5 px-3 pb-20 pt-5 sm:px-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 ref={arrival} className="font-display text-2xl font-black sm:text-3xl">NRL Team Manager</h1>
            <p className="mt-1 text-sm text-muted-foreground">{season && !choosing ? `${shortName(season.year, season.clubId)} · ${season.year} season` : 'Coach a club from Round 1 to the Grand Final.'}</p>
          </div>
          <RulesGate title="How to play NRL Team Manager" floatingTrigger={false} className="min-h-11 min-w-11">
            <ul className="list-disc space-y-2 pl-5">
              <li>Choose 2026 or 2027, then pick a club. The Perth Bears enter in 2027. Your players, ratings, draw and results are simulated.</li>
              <li>Pick 13 starters in Squad. Before a game, choose a tactic and train for extra attack or recover for better fitness.</li>
              <li>Advance a round to simulate every fixture. A win or bye earns two ladder points, a draw earns one and a loss earns zero.</li>
              <li>The top eight make finals. The top four get a second chance if they lose their qualifying final. The last club standing wins the premiership.</li>
              <li>The game saves this season on your browser. Starting another season replaces the current save.</li>
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

        {choosing || !season ? (
          <ClubChooser year={year} season={season} disabled={moved} onYear={setYear} onStart={start} onReturn={() => setChoosing(false)} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Manager screens">
              {PANELS.map(({ id, label, Icon }) => (
                <Button key={id} type="button" variant={panel === id ? 'default' : 'outline'} size="lg"
                  className="min-w-0 gap-1 whitespace-normal px-1 text-xs sm:gap-2 sm:text-sm"
                  aria-pressed={panel === id} onClick={() => setPanel(id)}>
                  <Icon aria-hidden="true" className="hidden min-[360px]:block" />{label}
                </Button>
              ))}
            </div>
            {panel === 'match' && <MatchCentre season={season} onAction={dispatch} disabled={moved} />}
            {panel === 'squad' && <Squad season={season} onAction={dispatch} disabled={moved} />}
            {panel === 'ladder' && <Ladder season={season} />}
            {confirm ? (
              <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
                <p>Choosing a club for a new season replaces this save.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="lg" variant="outline" className="px-3" onClick={() => setConfirm(false)}>Keep this season</Button>
                  <Button type="button" size="lg" className="px-3" onClick={() => { setConfirm(false); setYear(season.year); setChoosing(true); }}>Choose a new season</Button>
                </div>
              </div>
            ) : <Button type="button" size="lg" variant="ghost" className="px-3" onClick={() => setConfirm(true)}>Start over</Button>}
          </>
        )}

        <GameSeoContent pageHasOwnH1 title="Coach an NRL club through a full season"
          description="Pick a 2026 or 2027 club, set your starting 13 and play a simulated rugby league season through the Grand Final."
          reportGameContext={season ? { year: season.year, club: season.clubId, round: season.round } : { year }} />
        <GameNav />
      </main>
    </>
  );
}
