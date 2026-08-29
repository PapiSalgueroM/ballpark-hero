/**
 * Round 289: Face Off, the screen. The rules are in src/lib/faceOff.ts and
 * the clock in src/hooks/useFaceOff.ts; this file draws the menu, the two
 * cards, the shot clock and the scoreboard.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useFaceOff } from '@/hooks/useFaceOff';
import {
  RIVALS, ROUNDS, SHOT_CLOCK, BASE_POINTS, PER_SECOND, MAX_RATIO, MAX_EXTRA, DAILY_DIFFICULTY,
  rivalFor, fmtValue, shareText, type Difficulty,
} from '@/lib/faceOff';
const FaceOff = () => {
  const g = useFaceOff();
  const [pickedRival, setPickedRival] = useState<Difficulty>('pro');
  const rival = rivalFor(g.difficulty);
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.index}`);
  const secondsLeft = Math.max(0, SHOT_CLOCK - g.elapsed);
  const extraRound = g.index >= ROUNDS;
  const versus = g.mode === 'versus';
  const chair = (n: 1 | 2) => (n === 1 ? 'Player 1' : 'Player 2');
  const otherName = versus ? 'Player 2' : rival.label;
  const otherEmoji = versus ? '🔵' : rival.emoji;

  return (
    <>
      <PageSeo
        title="Face Off: Beat the Rival in a Sports Stats Duel | DoUKnowBall"
        description="Two athletes, one stat, ten seconds. Pick who has more before the rival does. Ten rounds across ten sports against a Rookie, a Pro or a Legend, plus a daily duel that is the same for everyone. Free, no sign-up."
        path="/face-off"
      />
      <GameShell help="none"
        width="narrow"
        title="⚡ FACE OFF"
        subtitle="Two names, one stat, ten seconds. Beat the rival in the other chair."
        headerExtra={
          g.phase !== 'menu' && g.phase !== 'done' ? (
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <span className="font-bold text-foreground tabular-nums">{versus ? 'P1' : 'You'} {g.totals.you}</span>
              <span className="text-xs text-muted-foreground">{extraRound ? 'sudden death' : `round ${Math.min(g.index + 1, ROUNDS)} of ${ROUNDS}`}</span>
              <span className="font-bold text-foreground tabular-nums">{versus ? 'P2' : rival.emoji} {g.totals.rival}</span>
            </div>
          ) : null
        }
      >
        <RulesGate title="How to Play Face Off">
          <div className="space-y-3">
            <p>Two athletes and one stat. Tap the one with the bigger number before the shot clock runs out. A rival answers every round too, and the scoreboard decides it after ten.</p>
            <p className="font-semibold text-foreground">The rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{SHOT_CLOCK} seconds a round. A right answer is worth {BASE_POINTS} points plus {PER_SECOND} for every whole second you had left. Wrong or late is nothing.</li>
              <li>The rival scores the same way at its own speed. The Rookie is slow and guesses the close ones, the Legend is fast and rarely misses.</li>
              <li>Ten rounds across ten sports, never the same sport twice in a row. Level on points after ten and it goes to sudden death.</li>
              <li>The daily duel is the same ten pairs against The Pro for everyone, once a day. Unlimited deals fresh pairs against whichever rival you pick.</li>
              <li>Pass the phone is two people on one device: Player 1 answers, hands it over, Player 2 answers the same pair on their own clock, then both picks are revealed.</li>
              <li>Every number is a career total already on this site, from the Higher or Lower games. Nothing is made up for the duel.</li>
            </ul>
            <p className="font-semibold text-foreground">Worked example:</p>
            <p>"Who hit more career home runs?" Barry Bonds or Hank Aaron. You tap Bonds with 7 seconds left: right, {BASE_POINTS + PER_SECOND * 7} points. The Pro took 4 seconds and also got it: {BASE_POINTS + PER_SECOND * 6} points. You lead the round by ten.</p>
          </div>
        </RulesGate>

        {g.phase === 'menu' && (
          <div className="max-w-md mx-auto space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="played" value={g.save.played} />
              <Stat label="won" value={g.save.won} />
              <Stat label="streak" value={g.save.streak} />
              <Stat label="best" value={g.save.best} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-base font-bold text-foreground">🗓️ Daily duel</h2>
                <span className="text-[11px] text-muted-foreground">v {rivalFor(DAILY_DIFFICULTY).label}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Today's ten pairs, the same for everyone, once a day.</p>
              {g.dailyPlayed ? (
                <div className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                  <div className="font-bold text-foreground">
                    {g.dailyPlayed.outcome === 'win' ? '🏆 You won today' : g.dailyPlayed.outcome === 'loss' ? `${rivalFor(DAILY_DIFFICULTY).emoji} The Pro took today` : '🤝 A draw today'}
                  </div>
                  <div className="text-muted-foreground tabular-nums">you {g.dailyPlayed.you}, The Pro {g.dailyPlayed.rival}. Ten new pairs tomorrow.</div>
                </div>
              ) : (
                <button
                  onClick={() => g.start('daily', DAILY_DIFFICULTY)}
                  className="w-full rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  Play today's duel
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold text-foreground mb-1">♾️ Unlimited</h2>
              <p className="text-xs text-muted-foreground mb-3">Fresh pairs every time. Pick your rival.</p>
              <div className="grid grid-cols-3 gap-2 mb-3" role="group" aria-label="Pick a rival">
                {RIVALS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => setPickedRival(r.key)}
                    aria-pressed={pickedRival === r.key}
                    className={cn(
                      'rounded-xl border p-2.5 text-left transition-colors',
                      pickedRival === r.key ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary/50',
                    )}
                  >
                    <div className="text-xl leading-none mb-1" aria-hidden="true">{r.emoji}</div>
                    <div className="text-xs font-bold text-foreground">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{r.blurb}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => g.start('unlimited', pickedRival)}
                className="w-full rounded-xl py-3 min-h-[44px] bg-secondary text-foreground border border-border font-bold hover:bg-secondary/70 transition-colors"
              >
                Face {rivalFor(pickedRival).label}
              </button>
              {g.save.byRival[pickedRival].played > 0 && (
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  your record against {rivalFor(pickedRival).label}: {g.save.byRival[pickedRival].won} of {g.save.byRival[pickedRival].played}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <h2 className="text-base font-bold text-foreground mb-1">📱 Pass the phone</h2>
              <p className="text-xs text-muted-foreground mb-3">Two people, one device. Same ten pairs, your own clocks, no computer in the chair.</p>
              <button
                onClick={() => g.start('versus', 'pro')}
                className="w-full rounded-xl py-3 min-h-[44px] bg-secondary text-foreground border border-border font-bold hover:bg-secondary/70 transition-colors"
              >
                Start a two player duel
              </button>
            </div>
          </div>
        )}

        {(g.phase === 'playing' || g.phase === 'handoff' || g.phase === 'reveal') && g.current && (
          <div className="max-w-md mx-auto" ref={revealRef}>
            {/* the shot clock */}
            <div className="flex items-center gap-2 mb-2">
              <Clock className={cn('w-4 h-4 shrink-0', secondsLeft <= 3 && g.phase === 'playing' ? 'text-destructive' : 'text-muted-foreground')} aria-hidden="true" />
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden" role="timer" aria-label={`${Math.ceil(secondsLeft)} seconds left`}>
                <div
                  className={cn('h-full rounded-full', secondsLeft <= 3 ? 'bg-destructive' : 'bg-primary')}
                  style={{ width: `${(secondsLeft / SHOT_CLOCK) * 100}%`, transition: g.phase === 'playing' ? 'width 100ms linear' : 'none' }}
                />
              </div>
              <span className={cn('text-sm font-bold tabular-nums w-8 text-right', secondsLeft <= 3 && g.phase === 'playing' ? 'text-destructive' : 'text-foreground')}>
                {g.phase === 'playing' ? Math.ceil(secondsLeft) : ''}
              </span>
            </div>

            <div className="text-center mb-3">
              <div className="text-2xl" aria-hidden="true">{g.current.emoji}</div>
              <p className="text-base md:text-lg font-semibold text-foreground leading-snug">{g.current.question}</p>
              <div className="h-5 mt-1 text-[11px] font-bold uppercase tracking-wider">
                {g.phase === 'playing' && !versus && g.rivalLocked && <span className="text-gold">{rival.emoji} {rival.label} has locked in</span>}
                {g.phase === 'playing' && !versus && !g.rivalLocked && <span className="text-muted-foreground">{rival.emoji} {rival.label} is thinking</span>}
                {g.phase === 'playing' && versus && <span className="text-primary">{g.turn === 1 ? '🟢' : '🔵'} {chair(g.turn)}, your pick</span>}
                {g.phase === 'handoff' && <span className="text-gold">🟢 Player 1 locked in</span>}
              </div>
            </div>

            {g.phase === 'handoff' ? (
              <div className="rounded-2xl border border-gold/60 bg-gold/10 p-5 text-center">
                <div className="text-3xl mb-2" aria-hidden="true">📱</div>
                <p className="text-sm font-bold text-foreground">Pass the phone to Player 2</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">The pair stays hidden until they press ready, and their own ten seconds start then.</p>
                <button
                  onClick={g.ready}
                  className="w-full rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  🔵 Player 2, I am ready
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-3">
              {(['a', 'b'] as const).map(side => {
                const ath = g.current![side];
                const res = g.lastResult;
                const revealed = g.phase === 'reveal';
                const isHigher = g.current!.higher === side;
                const yours = revealed && res?.pick === side;
                const theirs = revealed && res?.rivalPick === side;
                return (
                  <button
                    key={side}
                    onClick={() => g.pick(side)}
                    disabled={revealed}
                    className={cn(
                      'rounded-2xl border p-3 min-h-[124px] text-center transition-colors flex flex-col items-center justify-center gap-1',
                      !revealed && 'border-border bg-card hover:border-primary active:bg-primary/10',
                      revealed && isHigher && 'border-correct ring-1 ring-correct bg-card',
                      revealed && !isHigher && 'border-border bg-card/60',
                    )}
                  >
                    <span className="text-sm md:text-base font-bold text-foreground leading-tight break-words">{ath.name}</span>
                    <span className="text-[11px] text-muted-foreground leading-snug break-words">{ath.sub}</span>
                    {revealed && (
                      <span className={cn('text-lg font-bold tabular-nums mt-1', isHigher ? 'text-correct' : 'text-muted-foreground')}>
                        {fmtValue(ath.value)} <span className="text-[10px] font-semibold">{g.current!.unit}</span>
                      </span>
                    )}
                    {revealed && (yours || theirs) && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {yours ? (versus ? '🟢 P1' : 'you') : ''}{yours && theirs ? ' + ' : ''}{theirs ? (versus ? '🔵 P2' : rival.emoji) : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            {g.phase === 'reveal' && g.lastResult && (
              <div className="mt-3 rounded-2xl border border-border bg-card p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('inline-flex items-center gap-1 font-bold', g.lastResult.youCorrect ? 'text-correct' : 'text-destructive')}>
                    {g.lastResult.youCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {versus ? '🟢 Player 1: ' : ''}{g.lastResult.pick === null ? 'Out of time' : g.lastResult.youCorrect ? `Right in ${g.lastResult.secondsUsed.toFixed(1)}s` : 'Wrong'}
                  </span>
                  <span className="font-bold tabular-nums text-foreground">+{g.lastResult.you}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1 text-muted-foreground">
                  <span>
                    {otherEmoji} {otherName}: {g.lastResult.rivalPick === null ? 'out of time' : `${g.lastResult.rivalCorrect ? 'right' : 'wrong'} in ${g.lastResult.rivalSeconds.toFixed(1)}s`}
                  </span>
                  <span className="font-bold tabular-nums">+{g.lastResult.rival}</span>
                </div>
                <button
                  onClick={g.next}
                  className="mt-3 w-full rounded-xl py-3 min-h-[44px] bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                >
                  {g.results.length < g.rounds.length ? 'Next round' : g.totals.you === g.totals.rival && g.results.length < ROUNDS + MAX_EXTRA ? 'Level. Sudden death' : 'See the result'}
                </button>
              </div>
            )}

            <div className="flex justify-center gap-1.5 mt-4" aria-label="Rounds so far">
              {g.rounds.map((_, i) => {
                const r = g.results[i];
                return (
                  <span
                    key={i}
                    className={cn('w-2.5 h-2.5 rounded-full', !r ? 'bg-secondary' : r.you > r.rival ? 'bg-correct' : r.rival > r.you ? 'bg-destructive' : 'bg-gold')}
                  />
                );
              })}
            </div>
          </div>
        )}

        {g.phase === 'done' && (
          <div className="max-w-md mx-auto">
            <ResultScreen
              won={g.outcome === 'draw' || versus ? undefined : g.outcome === 'win'}
              outcomeEmoji={g.outcome === 'win' ? (versus ? '🟢' : '🏆') : g.outcome === 'loss' ? otherEmoji : '🤝'}
              headline={versus
                ? (g.outcome === 'win' ? 'Player 1 wins it' : g.outcome === 'loss' ? 'Player 2 wins it' : 'All square')
                : (g.outcome === 'win' ? `You beat ${rival.label}` : g.outcome === 'loss' ? `${rival.label} wins it` : 'All square')}
              statLine={<span className="tabular-nums">{g.totals.you} to {g.totals.rival}, {g.totals.youRounds} rounds to {g.totals.rivalRounds}</span>}
              statRow={versus ? [
                { label: 'P1 right', value: `${g.results.filter(r => r.youCorrect).length}/${g.results.length}` },
                { label: 'P2 right', value: `${g.results.filter(r => r.rivalCorrect).length}/${g.results.length}` },
                { label: 'rounds', value: `${g.totals.youRounds} to ${g.totals.rivalRounds}` },
              ] : [
                { label: 'right', value: `${g.results.filter(r => r.youCorrect).length}/${g.results.length}` },
                { label: 'fastest', value: g.results.some(r => r.youCorrect) ? `${Math.min(...g.results.filter(r => r.youCorrect).map(r => r.secondsUsed)).toFixed(1)}s` : 'n/a' },
                { label: 'streak', value: g.save.streak },
              ]}
              emojiGrid={versus
                ? `⚡ Face Off, two players: ${g.totals.you} to ${g.totals.rival}\n🟢 ${g.results.map(r => (r.pick === null ? '⏱️' : r.youCorrect ? '✅' : '❌')).join('')}\n🔵 ${g.results.map(r => (r.rivalPick === null ? '⏱️' : r.rivalCorrect ? '✅' : '❌')).join('')}`
                : `⚡ Face Off v ${rival.label}: ${g.totals.you} to ${g.totals.rival}\n${g.results.map(r => (r.pick === null ? '⏱️' : r.youCorrect ? '✅' : '❌')).join('')}`}
              share={{
                score: versus ? `a two player Face Off, ${g.totals.you} to ${g.totals.rival}` : `${g.totals.you} to ${g.totals.rival} against ${rival.label} on Face Off`,
                gameName: 'Face Off',
                gamePath: '/face-off',
                customText: versus
                  ? `Face Off, two players on one phone: ${g.outcome === 'win' ? 'Player 1 beat Player 2' : g.outcome === 'loss' ? 'Player 2 beat Player 1' : 'Player 1 and Player 2 drew'} ${g.totals.you} to ${g.totals.rival} ⚡\ndouknowball.com/face-off`
                  : shareText(g.totals, g.difficulty, g.mode === 'daily' ? g.today : null),
              }}
              onPlayAgain={g.mode === 'unlimited' ? () => g.start('unlimited', g.difficulty) : versus ? () => g.start('versus', 'pro') : undefined}
              playAgainLabel={versus ? 'Same two, ten more' : `Face ${rival.label} again`}
              playNext={
                <div className="space-y-2">
                  {g.mode === 'daily' && <p className="text-sm text-muted-foreground">Ten new pairs tomorrow.</p>}
                  <button onClick={g.toMenu} className="text-sm text-primary hover:underline">Change rival or mode</button>
                </div>
              }
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Want the same stats without the clock? <Link to="/higher-lower" className="text-primary hover:underline">Higher or Lower</Link> has every pool on its own.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Face Off | DoUKnowBall"
          description="A head to head sports stats duel on a ten second shot clock. Two athletes, one career stat, pick who has more before the rival does, across soccer, the NBA, MLB, NFL, NHL, college football, F1, tennis, golf and the AFL. Three rivals to beat and a daily duel shared by everyone."
          howToPlay={[
            'Read the stat and the two names',
            `Tap the athlete with the bigger number before the ${SHOT_CLOCK} second clock runs out`,
            `A right answer scores ${BASE_POINTS} plus ${PER_SECOND} for every whole second left; wrong or late scores nothing`,
            'The rival answers every round too. After ten rounds the higher total wins, level goes to sudden death',
            'The daily duel is the same ten pairs against The Pro for everyone; Unlimited deals fresh pairs against the rival you pick',
          ]}
          examples={[
            `Right with 7 seconds left is ${BASE_POINTS + PER_SECOND * 7} points; right with half a second left is ${BASE_POINTS}`,
            `No pair is ever a tie, and the bigger number is never more than ${MAX_RATIO} times the smaller`,
            'The Rookie guesses the close ones and takes up to 8 seconds; the Legend answers inside 5 and rarely misses',
          ]}
        />

        <AdBanner slot="1234567917" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="face-off" gameContext={{ mode: g.mode, rival: g.difficulty, pair: g.current ? `${g.current.a.name} v ${g.current.b.name} (${g.current.category})` : null }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-2 py-1.5">
      <div className="text-base font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export default FaceOff;
