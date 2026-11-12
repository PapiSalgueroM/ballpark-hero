import { useState, type MouseEvent } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { RestoredResult, useFreshFinish } from '@/components/game/RestoredResult';
import { ResultScreen } from '@/components/game/ResultScreen';
import GameSeoContent from '@/components/seo/GameSeoContent';
import PageSeo from '@/components/seo/PageSeo';
import { SOCCER_PS_PATH, useSoccerPerfectSeason } from '@/hooks/useSoccerPerfectSeason';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { getTodayET } from '@/lib/dateUtils';
import { SOCCER_PS_GAMES, SOCCER_PS_SLOTS, type SoccerPSOutcome } from '@/lib/soccerPerfectSeason';
import { cn } from '@/lib/utils';

const TITLE = 'Soccer Perfect Season';
const DESCRIPTION = 'Draft a soccer XI from 11 random real clubs, use two rerolls and chase 38 wins in 38 games. Play the free Daily or start a fresh Unlimited season.';
const PITCH_ROWS = [['LW', 'ST', 'RW'], ['LCM', 'CM', 'RCM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']] as const;
const OUTCOME_LABELS: Record<SoccerPSOutcome, string> = { W: 'Win', D: 'Draw', L: 'Loss' };
const OUTCOME_EMOJI: Record<SoccerPSOutcome, string> = { W: '🟩', D: '🟨', L: '🟥' };
const OUTCOME_CLASSES: Record<SoccerPSOutcome, string> = {
  W: 'border-primary/40 bg-primary/15 text-primary',
  D: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  L: 'border-destructive/40 bg-destructive/10 text-destructive',
};
const primaryButton = 'min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90';
const secondaryButton = 'min-h-11 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/60 disabled:opacity-60';
const percent = (value: number) => {
  if (value === 0 || value === 1) return `${value * 100}%`;
  if (value < 0.001) return '<0.1%';
  if (value > 0.999) return '>99.9%';
  return `${(value * 100).toFixed(1)}%`;
};
type Game = ReturnType<typeof useSoccerPerfectSeason>;
type View = NonNullable<Game['view']>;
type ButtonAction = (event: MouseEvent<HTMLButtonElement>, action: () => boolean | void) => void;

function DraftPanel({ view, game, act }: { view: View; game: Game; act: ButtonAction }) {
  const [selected, setSelected] = useState<string | null>(null);
  const card = view.offers.find(offer => offer.playerId === selected);
  const pick = view.turn + 1;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">Pick {pick} of {SOCCER_PS_SLOTS.length}</p>
        <h2 className="font-display text-xl font-bold" data-soccer-ps-club>{view.currentClub}</h2>
      </div>
      <button type="button" data-soccer-ps-action="reroll" disabled={!view.rerollsLeft}
        className={cn(secondaryButton, 'flex items-center gap-2')} onClick={event => act(event, game.reroll)}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reroll ({view.rerollsLeft} left)
      </button>
    </div>
    <p className="text-xs text-muted-foreground">Choose one player, then assign an available slot.</p>
    {!card && <div className="grid grid-cols-2 gap-2">
      {view.offers.map(offer => <button key={offer.playerId} type="button" data-soccer-ps-offer={offer.playerId}
        onClick={event => act(event, () => setSelected(offer.playerId))}
        className="flex min-h-14 items-center justify-between gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-left hover:border-primary">
        <span className="min-w-0"><span className="block break-words text-sm font-semibold">{offer.name}</span>
          <span className="block text-xs text-muted-foreground">{offer.position}</span></span>
        <span className="shrink-0 font-display text-lg font-bold" aria-label={`Strength ${offer.rating}`}>{offer.rating}</span>
      </button>)}
    </div>}
    {card && <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
      <p className="text-sm font-semibold">Place {card.name} · {card.rating}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SOCCER_PS_SLOTS.filter(slot => card.eligible.includes(slot.key)).map(slot => <button key={slot.key} type="button"
          data-soccer-ps-slot={slot.key} className={primaryButton} onClick={event => act(event, () => game.choosePlayer(card.playerId, slot.key))}>
          {slot.label}
        </button>)}
        <button type="button" className={secondaryButton} onClick={event => act(event, () => setSelected(null))}>Change player</button>
      </div>
    </div>}
    {view.upcoming.length > 0 && <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">Upcoming clubs ({view.upcoming.length})</summary>
      <div className="space-y-1 px-3 pb-3">
        {view.upcoming.map((club, index) => <details key={club.id} className="rounded-lg border border-border">
          <summary className="cursor-pointer px-2 py-2.5 text-sm">{pick + index + 1}. {club.name}</summary>
          <ul className="space-y-1 px-2 pb-2 text-xs text-muted-foreground">
            {club.roster.map(player => <li key={player.playerId}>{player.name} · {player.position} · {player.rating}</li>)}
          </ul>
        </details>)}
      </div>
    </details>}
  </div>;
}

function ModeMenu({ game, act }: { game: Game; act: ButtonAction }) {
  const { savedDaily, savedUnlimited } = game;
  const daily = savedDaily.run;
  const unlimited = savedUnlimited.run;
  const dailyIsToday = daily?.date === getTodayET();
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <h2 className="font-display font-bold">Daily</h2>
      <p className="text-xs text-muted-foreground">One shared draw per Eastern date.</p>
      {savedDaily.invalid && <p className="text-xs text-yellow-400">The saved Daily could not be read. Starting fresh replaces it.</p>}
      {daily && <button type="button" data-soccer-ps-action="resume-daily" className={cn(secondaryButton, 'w-full')}
        onClick={event => act(event, game.resumeDaily)}>
        {daily.completionRecorded ? 'View Daily result' : 'Resume Daily'} <span className="text-xs">({daily.date})</span>
      </button>}
      {!dailyIsToday && <button type="button" data-soccer-ps-action="daily" className={cn(primaryButton, 'w-full')}
        onClick={event => act(event, game.startDaily)}>
        {savedDaily.invalid ? 'Start fresh Daily' : daily ? "Play today's Daily" : 'Play Daily'}
      </button>}
      {daily && !dailyIsToday && <p className="text-xs text-muted-foreground">Starting today's Daily replaces your previous Daily save.</p>}
    </div>
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <h2 className="font-display font-bold">Unlimited</h2>
      <p className="text-xs text-muted-foreground">Start a fresh draw whenever you like.</p>
      {savedUnlimited.invalid && <p className="text-xs text-yellow-400">The saved Unlimited season could not be read.</p>}
      {unlimited && <button type="button" data-soccer-ps-action="resume-unlimited" className={cn(secondaryButton, 'w-full')}
        onClick={event => act(event, game.resumeUnlimited)}>
        {unlimited.completionRecorded ? 'View Unlimited result' : 'Resume Unlimited'}
      </button>}
      <button type="button" data-soccer-ps-action="unlimited" className={cn(primaryButton, 'w-full')}
        onClick={event => act(event, game.startUnlimited)}>New Unlimited</button>
      {unlimited && <p className="text-xs text-muted-foreground">A new draw replaces your last Unlimited run.</p>}
    </div>
  </div>;
}

function StartingXI({ view }: { view: View }) {
  return <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/10 px-2 py-2">
    <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">Your XI · 4-3-3</p>
    <div role="list" aria-label="Your starting XI" className="space-y-1">
      {PITCH_ROWS.map((row, index) => <div key={index} role="presentation" className="flex justify-center gap-1">
        {row.map(key => {
          const slot = SOCCER_PS_SLOTS.find(item => item.key === key)!;
          const card = view.picks[key];
          return <div key={key} role="listitem" aria-label={`${slot.label}: ${card ? `${card.name}, strength ${card.rating}` : 'empty'}`}
            className={cn('min-w-0 max-w-24 flex-1 rounded-lg border px-1 py-1 text-center',
              card ? 'border-primary/40 bg-card' : 'border-border bg-background/60')}>
            <span className="block text-[10px] font-semibold text-muted-foreground">{key}{card && ` · ${card.rating}`}</span>
            {card && <span className="block truncate text-xs" title={card.name}>{card.name}</span>}
          </div>;
        })}
      </div>)}
    </div>
  </div>;
}

function SeasonPanel({ game, view, act, freshFinish }: { game: Game; view: View; act: ButtonAction; freshFinish: boolean }) {
  const { run } = game;
  const { odds, record, season, finished } = view;
  if (!run || !odds || !season) return null;
  const recordLine = `${record.wins}W · ${record.draws}D · ${record.losses}L · ${record.points} points`;
  const headline = record.perfect ? '38 wins. Perfect season.' : record.unbeaten ? 'Unbeaten. So close.' : 'Season complete.';
  return <div className="space-y-3" data-soccer-ps-record data-played={record.played}
    data-wins={record.wins} data-draws={record.draws} data-losses={record.losses} data-points={record.points} data-score={record.score}>
    {finished ? <RestoredResult restored={!freshFinish}>
      <ResultScreen
        outcome={record.perfect ? 'win' : 'close'}
        score={`${record.wins}/${SOCCER_PS_GAMES}`} scoreLabel="wins"
        outcomeEmoji={record.perfect ? '🏆' : '⚽'} headline={headline} statLine={recordLine}
        statRow={[{ label: 'Site score', value: `${record.score}/100` }]}
        emojiGrid={season.games.map(outcome => OUTCOME_EMOJI[outcome]).join('')}
        share={{ score: recordLine, gameName: TITLE, gamePath: SOCCER_PS_PATH }}
        onPlayAgain={run.mode === 'unlimited' ? game.startUnlimited : undefined}
        playAgainLabel="New Unlimited"
      />
    </RestoredResult> : <>
      <div className="rounded-2xl border border-border bg-card p-3" aria-live="polite">
        <h2 className="font-display text-lg font-bold">{run.revealed
          ? `Match ${run.revealed}: ${OUTCOME_LABELS[season.games[run.revealed - 1]]}` : 'Your season is ready.'}</h2>
        <p className="mt-1 font-semibold">{recordLine}</p>
        <p className="mt-1 text-xs text-muted-foreground">{record.losses ? 'Keep playing for points.' : record.draws ? 'Perfect run ended. Unbeaten is still on.' : 'The perfect run is still on.'}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-soccer-ps-action="next-match" className={primaryButton} onClick={event => act(event, game.revealNext)}>Next match</button>
        <button type="button" data-soccer-ps-action="finish-season" className={secondaryButton} onClick={event => act(event, game.finishSeason)}>Finish season</button>
      </div>
    </>}
    <ol aria-label="Match results" className="grid grid-cols-8 gap-1 sm:grid-cols-10">
      {season.games.map((outcome, index) => <li key={index}
        aria-label={`Match ${index + 1}: ${index < run.revealed ? OUTCOME_LABELS[outcome] : 'not played yet'}`}
        className={cn('rounded border py-1 text-center text-xs font-bold',
          index < run.revealed ? OUTCOME_CLASSES[outcome] : 'border-border text-muted-foreground')}>
        {index < run.revealed ? outcome : index + 1}
      </li>)}
    </ol>
    <div className="rounded-xl border border-border bg-card p-3 text-sm" data-soccer-ps-odds data-perfect={odds.perfect}>
      <p className="font-semibold">XI strength {view.overall.toFixed(1)} · Best available {view.bestOverall?.toFixed(1)}</p>
      <p className="mt-1 text-muted-foreground">Each match: win {percent(odds.win)}, draw {percent(odds.draw)}, loss {percent(odds.loss)}.</p>
      <p className="mt-1">38 wins: {percent(odds.perfect)}</p>
    </div>
  </div>;
}

export default function SoccerPerfectSeason() {
  const game = useSoccerPerfectSeason();
  const { run, view } = game;
  const runKey = run ? `${run.mode}:${run.seed}` : null;
  const phase = !view ? 'menu' : view.currentClub ? 'draft' : view.finished ? 'done' : 'season';
  const panelKey = `${runKey ?? 'menu'}:${run?.actions.length ?? 0}:${run?.revealed ?? 0}`;
  const revealRef = useRevealScroll(panelKey);
  const freshFinish = useFreshFinish(Boolean(view), view?.finished ?? false, runKey);
  const act: ButtonAction = (event, action) => {
    if (action() !== false && event.detail === 0) {
      requestAnimationFrame(() => {
        const panel = revealRef.current;
        const next = panel?.querySelector<HTMLButtonElement>('[data-soccer-ps-slot], [data-soccer-ps-offer]')
          ?? panel?.querySelector<HTMLButtonElement>('button:not(:disabled)');
        next?.focus({ preventScroll: true });
      });
    }
  };

  return <>
    <PageSeo title={`${TITLE} | DoUKnowBall`} description={DESCRIPTION} path={SOCCER_PS_PATH} />
    <GameShell width="narrow" help="none" className="py-4 md:py-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Draft from 11 real clubs. Win all 38 matches.</p>
        </div>
        <GameHelp inline firstVisit className="h-11 w-11 shrink-0" />
      </header>
      <div data-no-prerender>
        {game.storageNotice && <p role="status" className="mb-3 rounded-xl border border-border bg-card p-3 text-sm">
          Your season can continue here, but this browser could not save it.
        </p>}
        {view && <StartingXI view={view} />}
        <section key={panelKey} ref={revealRef} data-soccer-ps={phase} className="space-y-3">
          {!run || !view ? <ModeMenu game={game} act={act} /> : <>
            <p className="text-xs font-semibold text-muted-foreground">{run.mode === 'daily' ? `Daily · ${run.date}` : 'Unlimited'}</p>
            {view.currentClub ? <DraftPanel view={view} game={game} act={act} />
              : <SeasonPanel view={view} game={game} act={act} freshFinish={freshFinish} />}
            <button type="button" data-soccer-ps-action="back-menu"
              className={cn(secondaryButton, 'flex w-full items-center justify-center gap-2')}
              onClick={event => act(event, game.backToMenu)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to menu
            </button>
          </>}
        </section>
      </div>
      <GameNav currentPath={SOCCER_PS_PATH} sportCategory="soccer" />
      <GameSeoContent title={TITLE} description={DESCRIPTION} pageHasOwnH1 />
    </GameShell>
  </>;
}
