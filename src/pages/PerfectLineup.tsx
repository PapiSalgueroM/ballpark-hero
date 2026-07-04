import { useState } from 'react';
import { FastForward, Trophy, Dices, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { ResultScreen } from '@/components/game/ResultScreen';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import PerfectLineupBoard from '@/components/perfect-lineup/PerfectLineupBoard';
import { usePerfectLineup, GameView } from '@/hooks/usePerfectLineup';
import { describeConstraint } from '@/data/perfectLineup';
import { Player } from '@/types/game';
import { SEASON_MATCHES, unbeatenVerdict, unbeatenEmojiGrid } from '@/lib/unbeatenMode';

const LINES: { title: string; ids: number[] }[] = [
  { title: 'Forwards', ids: [10, 9, 8] },
  { title: 'Midfield', ids: [5, 6, 7] },
  { title: 'Defence', ids: [1, 2, 3, 4] },
  { title: 'Goalkeeper', ids: [0] },
];

/**
 * Go Unbeaten tab: build a lineup with the same eligibility rules as
 * Classic, then simulate a 38 match league season with that lineup's
 * rating driving win probability (perfectSeason.ts's winProbability curve
 * via src/lib/unbeatenMode.ts). A draw does not end the run, a loss does.
 *
 * Every hook this component needs lives in usePerfectLineup(), called once
 * at the top of PerfectLineup below, above any conditional return, per the
 * site's React error #310 rule.
 */
const UnbeatenTab = ({ game }: { game: ReturnType<typeof usePerfectLineup> }) => {
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const activeSlot = openSlot !== null ? game.slots.find((s) => s.id === openSlot) : null;
  const options =
    openSlot !== null
      ? game.eligibleFor(openSlot).filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
      : [];

  const choose = (slotId: number, player: Player) => {
    game.pickPlayer(slotId, player);
    setOpenSlot(null);
    setQuery('');
  };

  const run = game.unbeatenRun;
  const revealed = game.revealedMatches;
  const isRunning = game.unbeatenPhase === 'running';
  const isDone = game.unbeatenPhase === 'done';

  if (isDone && run) {
    const invincible = run.invincible;
    const emojiGrid = `⚽ ${unbeatenVerdict(run)}\n${unbeatenEmojiGrid(run)}`;
    return (
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <ResultScreen
          won={invincible ? true : undefined}
          outcomeEmoji={invincible ? '🏆' : run.wins >= 25 ? '😤' : run.wins >= 12 ? '🔥' : '📉'}
          headline={invincible ? 'INVINCIBLES!' : `Run ended at match ${run.endedAtMatch}`}
          statLine={
            invincible
              ? `${SEASON_MATCHES} matches, no losses.`
              : `${run.wins}W ${run.draws}D in ${run.played} matches before the loss.`
          }
          statRow={[
            { label: 'Played', value: run.played },
            { label: 'Points', value: run.points },
            { label: 'Wins', value: run.wins },
          ]}
          emojiGrid={emojiGrid}
          share={{
            gameName: 'Perfect Lineup: Go Unbeaten',
            gamePath: '/perfect-lineup',
            score: invincible
              ? `an invincible ${SEASON_MATCHES}-match season (${run.points} pts)`
              : `a run that ended at match ${run.endedAtMatch} (${run.points} pts)`,
          }}
          onPlayAgain={game.rerollUnbeatenLineup}
          playAgainLabel="Build a New Lineup"
        />
      </div>
    );
  }

  if (isRunning && run) {
    const winsSoFar = run.matches.slice(0, revealed).filter((m) => m.outcome === 'W').length;
    const drawsSoFar = run.matches.slice(0, revealed).filter((m) => m.outcome === 'D').length;
    const lossSoFar = run.matches.slice(0, revealed).some((m) => m.outcome === 'L');
    const pointsSoFar = run.matches.slice(0, revealed).reduce((s, m) => s + m.points, 0);
    const allRevealed = revealed >= run.played;

    return (
      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-surface-1 border border-border rounded-2xl p-5 text-center mb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Match {Math.min(revealed, run.played)} of {SEASON_MATCHES}
          </div>
          <div className="text-3xl font-bold font-display mb-1">
            <span className="text-correct">{winsSoFar}W</span>{' '}
            <span className="text-gold">{drawsSoFar}D</span>{' '}
            <span className={lossSoFar ? 'text-destructive' : 'text-muted-foreground'}>
              {lossSoFar ? '1L' : '0L'}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">{pointsSoFar} points so far</div>
          {!allRevealed && (
            <button
              onClick={game.skipUnbeatenReveal}
              className="mt-3 inline-flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-surface-2 text-foreground font-semibold hover:bg-surface-3"
            >
              <FastForward className="w-3.5 h-3.5" /> Skip to result
            </button>
          )}
          {allRevealed && (
            <button
              onClick={game.finishUnbeatenReveal}
              className="mt-3 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold hover:opacity-90 transition-opacity"
            >
              See final result
            </button>
          )}
        </div>

        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
          {Array.from({ length: SEASON_MATCHES }).map((_, i) => {
            const match = run.matches[i];
            const shown = i < revealed && Boolean(match);
            return (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded-sm transition-colors flex items-center justify-center text-[10px] font-bold',
                  !shown && 'bg-surface-2',
                  shown && match?.outcome === 'W' && 'bg-correct text-correct-foreground',
                  shown && match?.outcome === 'D' && 'bg-gold text-gold-foreground',
                  shown && match?.outcome === 'L' && 'bg-destructive text-destructive-foreground',
                )}
              >
                {shown ? match?.outcome : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Picking phase: build the lineup, same rules as Classic, then start the run.
  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      <p className="text-center text-sm text-muted-foreground mb-4">
        Build a lineup, then play a 38 match season. A draw keeps the run alive, a loss ends it.{' '}
        <span className="font-semibold text-foreground">{game.filledCount}/11</span> picked.
      </p>

      <div className="space-y-4">
        {LINES.map((line) => (
          <div key={line.title} className="flex flex-wrap justify-center gap-3">
            {line.ids.map((id) => {
              const slot = game.slots.find((s) => s.id === id)!;
              const picked = game.picks[id];
              return (
                <div
                  key={id}
                  className={cn(
                    'relative w-[150px] rounded-xl border p-3 text-center transition-colors',
                    picked ? 'bg-surface-1 border-primary/40' : 'bg-surface-1/60 border-border border-dashed',
                  )}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    <span>{slot.label}</span>
                  </div>
                  <div
                    className={cn(
                      'mt-1 text-[11px] font-medium',
                      slot.constraint.type === 'any' ? 'text-muted-foreground' : 'text-primary',
                    )}
                  >
                    {describeConstraint(slot.constraint)}
                  </div>

                  {picked ? (
                    <div className="mt-2">
                      <div className="text-sm font-semibold text-foreground leading-tight">{picked.name}</div>
                      <div className="text-[11px] text-muted-foreground">€{picked.marketValue}M</div>
                      <button
                        onClick={() => game.clearSlot(id)}
                        className="absolute top-1 right-1 text-muted-foreground hover:text-foreground text-xs"
                        aria-label="Clear slot"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenSlot(id);
                        setQuery('');
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
                    >
                      + Pick
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={game.startUnbeatenRun}
          disabled={!game.allFilled}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Trophy className="w-5 h-5" />
          Play the Season Unbeaten
        </button>
      </div>

      <Dialog open={openSlot !== null} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-base">
              Pick a {activeSlot?.label}
              {activeSlot && activeSlot.constraint.type !== 'any' && (
                <span className="text-primary"> · {describeConstraint(activeSlot.constraint)}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Search players…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No matching players.</p>
            )}
            {options.slice(0, 40).map((p) => (
              <button
                key={p.name}
                onClick={() => openSlot !== null && choose(openSlot, p)}
                className="w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left flex items-center justify-between gap-2"
              >
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {p.club} · €{p.marketValue}M
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PerfectLineup = () => {
  const unbeatenGame = usePerfectLineup();
  const view = unbeatenGame.view;

  const setView = (v: GameView) => {
    unbeatenGame.setGameView(v);
    if (v === 'unbeaten' && unbeatenGame.unbeatenPhase === 'done') {
      unbeatenGame.rerollUnbeatenLineup();
    }
  };

  return (
    <>
      <PageSeo
        title="Perfect Lineup: Build a Squad Under Random Constraints | DoUKnowBall"
        description="Fill a 4-3-3 where every slot demands a player from a random league or country, then simulate the match, or chase a 38 match unbeaten run, and share your result."
        path="/perfect-lineup"
      />
      <GameShell
        width="wide"
        emoji="⚽"
        title="PERFECT LINEUP"
        subtitle="Build the best XI you can, but every constrained slot only accepts a player from that league or country."
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Perfect Lineup">
              <section>
                <h3 className="font-bold text-foreground mb-2">⚽ The idea</h3>
                <p className="text-muted-foreground">
                  Fill a 4-3-3 formation. Most slots are open, but some only accept a player from one specific
                  league or one specific country. Pick a real player who fits both the position and the
                  constraint.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🎮 Classic mode</h3>
                <p className="text-muted-foreground">
                  Fill all 11 slots, then hit Simulate Match. Your squad's rating and chemistry decide the
                  scoreline and grade. Play the Daily lineup, everyone gets the same one, or roll a New Lineup
                  any time.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">🏆 Go Unbeaten mode</h3>
                <p className="text-muted-foreground">
                  Build a lineup the same way, then hit Play the Season Unbeaten. Your squad plays a 38 match
                  league season. A draw does not end the run, only a loss does. Go all 38 matches unbeaten and
                  you are crowned Invincibles. Lose, and the run ends there with your points total.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">📊 Scoring</h3>
                <p className="text-muted-foreground">
                  Each match pays out the same as a real league table: 3 points for a win, 1 for a draw, 0 for a
                  loss.
                </p>
              </section>
            </HowToPlayPopover>

            <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
              <button
                onClick={() => setView('classic')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                  view === 'classic'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Dices className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Classic
              </button>
              <button
                onClick={() => setView('unbeaten')}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-semibold transition-colors',
                  view === 'unbeaten'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Go Unbeaten
              </button>
            </div>
          </>
        }
      >
        {view === 'classic' ? <PerfectLineupBoard /> : <UnbeatenTab game={unbeatenGame} />}

        <GameSeoContent
          title="Perfect Lineup: Daily Soccer Squad Builder"
          description="Perfect Lineup is a daily soccer puzzle inspired by viral squad-builders. Each day you get a 4-3-3 where most slots are locked to a specific league or nationality. Pick a real, eligible player for every position, then run a simulation that scores your squad on star power and chemistry and turns it into a shareable scoreline. Or switch to Go Unbeaten and chase a 38 match season with no losses."
          howToPlay={[
            'Each slot shows a position and, often, a league or country constraint.',
            'Tap a slot and search for any real player who fits both the position and the constraint.',
            'Constrained slots reward knowing obscure players from leagues around the world.',
            'Classic mode: fill all 11 slots, then hit Simulate Match to score your squad.',
            'Go Unbeaten mode: fill the lineup, then play a 38 match season. Draws are fine, a loss ends the run.',
            'Share your scoreline or your unbeaten run with the result card.',
          ]}
          examples={[
            'A "Serie A" striker slot accepts any striker who plays in Italy.',
            'A "Brazil" winger slot accepts any Brazilian winger.',
            'Higher market values and shared leagues/nationalities boost your rating, chemistry, and your odds of staying unbeaten.',
          ]}
        />
      </GameShell>
    </>
  );
};

export default PerfectLineup;
