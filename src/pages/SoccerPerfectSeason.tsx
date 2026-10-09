import type { MouseEvent } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { GameShell } from '@/components/game/GameShell';
import { GameHelp } from '@/components/game/GameHelp';
import { GameNav } from '@/components/game/GameNav';
import ShareButtons from '@/components/game/ShareButtons';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useSoccerPerfectSeason } from '@/hooks/useSoccerPerfectSeason';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { getTodayET } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { SOCCER_PS_BUDGET, SOCCER_PS_GAMES, SOCCER_PS_SLOTS, canDraftSoccerCard, type SoccerPSOutcome } from '@/lib/soccerPerfectSeason';

const TITLE = 'Soccer Perfect Season';
const DESCRIPTION = 'Draft a fictional soccer XI with 55 tokens and chase 38 wins. Play free Daily and Unlimited seasons, with saved progress and no account needed.';
const PITCH_ROWS = [['LW', 'ST', 'RW'], ['LCM', 'CM', 'RCM'], ['LB', 'LCB', 'RCB', 'RB'], ['GK']];
const OUTCOME_LABELS: Record<SoccerPSOutcome, string> = { W: 'Win', D: 'Draw', L: 'Loss' };
const OUTCOME_CLASSES: Record<SoccerPSOutcome, string> = {
  W: 'border-primary/40 bg-primary/15 text-primary',
  D: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  L: 'border-destructive/40 bg-destructive/10 text-destructive',
};
const primaryButton = 'min-h-[44px] rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const secondaryButton = 'min-h-[44px] rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const percent = (value: number) => value === 0 ? '0%' : value === 1 ? '100%' : value < 0.001 ? '<0.1%' : `${(value * 100).toFixed(1)}%`;

export default function SoccerPerfectSeason() {
  const game = useSoccerPerfectSeason();
  const { run, view, savedDaily, savedUnlimited } = game;
  const today = getTodayET();
  const phase = !run || !view ? 'menu' : run.choices.length < 11 ? 'draft' : view.finished ? 'done' : 'season';
  const panelKey = run ? `${run.mode}:${run.seed}:${run.choices.length}:${run.revealed}` : 'menu';
  const revealRef = useRevealScroll(panelKey);
  const dailyIsToday = savedDaily.run?.date === today;
  const act = (event: MouseEvent<HTMLButtonElement>, action: () => boolean | void) => {
    if (action() !== false && event.detail === 0) {
      requestAnimationFrame(() => revealRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true }));
    }
  };

  return <>
    <PageSeo title={`${TITLE} | DoUKnowBall`} description={DESCRIPTION} path="/soccer-perfect-season" />
    <GameShell width="narrow" help="none" className="py-4 md:py-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{TITLE}</h1>
          <p className="mt-1 text-sm text-muted-foreground">55 tokens. One XI. Chase 38 wins.</p>
        </div>
        <GameHelp inline firstVisit className="h-11 w-11 shrink-0" />
      </header>

      <div data-no-prerender>
        {game.storageNotice && <p role="status" className="mb-3 rounded-xl border border-border bg-card p-3 text-sm">{game.storageNotice}</p>}
        {run && view && <div data-soccer-ps-pitch className="relative mb-3 overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-primary/20" />
          <p className="relative mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fictional XI · 4-3-3</p>
          <div role="list" aria-label="Your fictional XI" className="relative space-y-1.5">
            {PITCH_ROWS.map((row, rowIndex) => <div key={rowIndex} role="presentation" className="flex justify-center gap-1.5">
              {row.map(key => {
                const slot = SOCCER_PS_SLOTS.find(item => item.key === key)!;
                const card = view.picks[key];
                const current = SOCCER_PS_SLOTS[run.choices.length]?.key === key;
                return <div key={`${key}:${card?.playerId ?? 'empty'}`} role="listitem" aria-label={`${slot.label}: ${card ? `${card.name}, strength ${card.rating}` : 'empty'}`}
                  className={cn('min-w-0 max-w-[82px] flex-1 rounded-lg border px-1 py-1 text-center', card ? 'border-primary/40 bg-card' : 'border-border/70 bg-background/60', current && 'ring-2 ring-primary')}>
                  <span className="block text-[10px] font-semibold text-muted-foreground">{key}</span>
                  <span className="block font-display text-base font-bold leading-tight">{card ? card.rating : '?'}</span>
                </div>;
              })}
            </div>)}
          </div>
        </div>}

        <section key={panelKey} ref={revealRef} data-soccer-ps={phase} className="space-y-3">
          {phase === 'menu' && <>
            <div className="rounded-2xl border border-border bg-card p-4 text-sm">
              <h2 className="mb-2 font-display text-lg font-bold">Spend for the whole team</h2>
              <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
                <li>Pick one fictional card for each of eleven positions.</li>
                <li>Cards cost 3, 5 or 7 tokens. Keep at least 3 for every slot still empty.</li>
                <li>Goalkeeper and striker strength count twice. The other roles count once.</li>
                <li>Play all 38 matches. A win earns 3 points, a draw earns 1.</li>
              </ol>
              <p className="mt-3">Every deal has an affordable XI that guarantees 38 wins. Your finished draft shows its actual win, draw and loss chances.</p>
              <p className="mt-2 text-muted-foreground">Example: 37 wins and 1 draw means 112 points and a site score of 98. Still unbeaten, but the perfect season is gone.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <h2 className="font-display font-bold">Daily</h2>
                <p className="text-xs text-muted-foreground">One shared deal per Eastern date. Finish it once in this browser.</p>
                {savedDaily.invalid && <p className="text-xs text-yellow-400">Your saved Daily could not be read. It is still there. Starting fresh replaces it.</p>}
                {savedDaily.run && <button type="button" data-soccer-ps-action="resume-daily" className={cn(secondaryButton, 'w-full')} onClick={event => act(event, game.resumeDaily)}>
                  <span>{savedDaily.run.revealed === SOCCER_PS_GAMES ? 'View daily result' : 'Resume Daily'}</span><span className="ml-1 text-xs">({savedDaily.run.date})</span>
                </button>}
                {!dailyIsToday && <button type="button" data-soccer-ps-action="daily" className={cn(primaryButton, 'w-full')} onClick={event => act(event, game.startDaily)}>
                  <span>{savedDaily.invalid ? 'Start fresh Daily' : savedDaily.run ? "Play today's Daily" : 'Play Daily'}</span>
                </button>}
                {savedDaily.run && !dailyIsToday && <p className="text-xs text-muted-foreground">Starting today's Daily replaces your older saved run. Resume keeps its original date.</p>}
                {dailyIsToday && savedDaily.run?.revealed === SOCCER_PS_GAMES && <p className="text-xs text-muted-foreground">Today's Daily is finished. Come back for a new deal tomorrow.</p>}
              </div>
              <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                <h2 className="font-display font-bold">Unlimited</h2>
                <p className="text-xs text-muted-foreground">Try a fresh deal whenever you like. Your Daily stays separate.</p>
                {savedUnlimited.invalid && <p className="text-xs text-yellow-400">Your saved Unlimited run could not be read. New Unlimited replaces it.</p>}
                {savedUnlimited.run && <button type="button" data-soccer-ps-action="resume-unlimited" className={cn(secondaryButton, 'w-full')} onClick={event => act(event, game.resumeUnlimited)}>
                  <span>{savedUnlimited.run.revealed === SOCCER_PS_GAMES ? 'View Unlimited result' : 'Resume Unlimited'}</span>
                </button>}
                <button type="button" data-soccer-ps-action="unlimited" className={cn(primaryButton, 'w-full')} onClick={event => act(event, game.startUnlimited)}>New Unlimited</button>
                {savedUnlimited.run && <p className="text-xs text-muted-foreground">A new deal replaces your last Unlimited run.</p>}
              </div>
            </div>
          </>}

          {run && view && <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="font-semibold"><span>{run.mode === 'daily' ? `Daily · ${run.date}` : 'Unlimited'}</span></p>
              <p><span data-soccer-ps-budget key={view.spent}>{view.spent}</span> / {SOCCER_PS_BUDGET} spent · <strong data-soccer-ps-remaining key={view.remaining}>{view.remaining}</strong> left</p>
            </div>
            {phase === 'draft' && <div>
              <h2 className="mb-2 font-display text-lg font-bold"><span>Pick {run.choices.length + 1} of 11: {SOCCER_PS_SLOTS[run.choices.length].label}</span></h2>
              <div className="space-y-2">
                {view.deal[run.choices.length].map((card, index) => {
                  const affordable = canDraftSoccerCard(view.deal, run.choices, index);
                  return <button key={card.playerId} type="button" data-soccer-ps-offer={index} disabled={!affordable}
                    onClick={event => act(event, () => game.chooseCard(index))} aria-label={`${card.name}, strength ${card.rating}, ${card.cost} tokens${affordable ? '' : ', cannot leave enough for the remaining slots'}`}
                    className={cn('flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', affordable ? 'border-border hover:border-primary' : 'border-border/60 opacity-60')}>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{card.name}</span>{!affordable && <span className="block text-xs text-muted-foreground">Keep 3 tokens for each remaining slot</span>}</span>
                    <span className="shrink-0 text-right"><span className="block font-display text-lg font-bold">{card.rating}</span><span className="block text-xs text-muted-foreground">{card.cost} tokens</span></span>
                  </button>;
                })}
              </div>
            </div>}
            {view.odds && <div data-soccer-ps-odds data-win={view.odds.win} data-draw={view.odds.draw} data-loss={view.odds.loss} data-perfect={view.odds.perfect} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="font-semibold">XI strength {view.overall.toFixed(1)} · Best affordable {view.best.overall.toFixed(1)}</p>
              <p className="mt-1 text-muted-foreground">Each match: win {percent(view.odds.win)}, draw {percent(view.odds.draw)}, loss {percent(view.odds.loss)}.</p>
              <p className="mt-1">38 wins: {percent(view.odds.perfect)}</p>
              {view.odds.win === 1 && <p className="mt-1 text-primary">You found a strongest affordable XI. All 38 wins are guaranteed.</p>}
            </div>}
            {view.season && <>
              <div data-soccer-ps-record data-played={view.record.played} data-wins={view.record.wins} data-draws={view.record.draws} data-losses={view.record.losses} data-points={view.record.points} data-score={view.record.score} className="rounded-2xl border border-border bg-card p-3" aria-live="polite">
                <h2 className="font-display text-lg font-bold">{view.finished ? view.record.perfect ? '38 wins. Perfect season.' : view.record.unbeaten ? 'Unbeaten. So close.' : 'Season complete.' : run.revealed === 0 ? 'Your season is ready.' : `Match ${run.revealed}: ${OUTCOME_LABELS[view.season.games[run.revealed - 1]]}`}</h2>
                <p className="mt-1 font-semibold">{view.record.wins}W · {view.record.draws}D · {view.record.losses}L · {view.record.points} points</p>
                {view.finished ? <p className="mt-1 text-primary"><Trophy className="mr-1 inline h-4 w-4" aria-hidden="true" />Site score: {view.record.score} / 100</p>
                  : <p className="mt-1 text-xs text-muted-foreground">{view.record.losses > 0 ? 'Perfect and unbeaten runs ended. Keep playing for points.' : view.record.draws > 0 ? 'Perfect run ended. Unbeaten is still on.' : 'The perfect run is still on.'}</p>}
              </div>
              {!view.finished && <div className="grid grid-cols-2 gap-2">
                <button type="button" data-soccer-ps-action="next-match" className={primaryButton} onClick={event => act(event, game.revealNext)}>Next match</button>
                <button type="button" data-soccer-ps-action="finish-season" className={secondaryButton} onClick={event => act(event, game.finishSeason)}>Finish season</button>
              </div>}
              <ol data-soccer-ps-results aria-label="All 38 match results" className="grid grid-cols-8 gap-1 sm:grid-cols-10">
                {view.season.games.map((outcome, index) => <li key={index} aria-label={`Match ${index + 1}: ${index < run.revealed ? OUTCOME_LABELS[outcome] : 'not played yet'}`}
                  className={cn('rounded border py-1 text-center text-xs font-bold', index < run.revealed ? OUTCOME_CLASSES[outcome] : 'border-border text-muted-foreground')}>
                  <span>{index < run.revealed ? outcome : index + 1}</span>
                </li>)}
              </ol>
              {view.finished && <div className="[&_button]:min-h-[44px]"><ShareButtons score={`${view.record.wins}W ${view.record.draws}D ${view.record.losses}L (${view.record.points} points)`} gameName={TITLE} gamePath="/soccer-perfect-season" /></div>}
            </>}
            <button type="button" data-soccer-ps-action="back-menu" className={cn(secondaryButton, 'flex w-full items-center justify-center gap-2')} onClick={event => act(event, game.backToMenu)}><ArrowLeft className="h-4 w-4" aria-hidden="true" /><span>Back to menu</span></button>
          </>}
        </section>
      </div>
      <GameNav currentPath="/soccer-perfect-season" sportCategory="soccer" />
      <GameSeoContent title={TITLE} description={DESCRIPTION} pageHasOwnH1 />
    </GameShell>
  </>;
}
