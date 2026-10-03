import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { RugbyLeagueChallenge } from '@/components/champ-or-not/RugbyLeagueChallenge';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Champ or Not (Round 235): ten true-or-false champion claims a day, one
 * quick session. Statements are built from the audited champion tables
 * (Rounds 232 to 234) and never invented: a false claim pairs a real year
 * with a real winner of the same competition who did not win that year.
 */
const ChampOrNot = () => {
  const {
    loadState, mode, switchMode, rounds, roundIdx, current, showingResult,
    lastPick, answers, done, score, answer, advanceReveal, playAgain,
    hard, hardActive, toggleHard,
  } = useChampOrNot();
  const [showRugby, setShowRugby] = useState(false);
  const [openedRugby, setOpenedRugby] = useState(false);
  const rugbyButton = useRef<HTMLButtonElement>(null);
  const leaveRugby = () => {
    setShowRugby(false);
    rugbyButton.current?.focus({ preventScroll: true });
  };

  const total = rounds.length;
  const lastCorrect = showingResult && current ? lastPick === current.isTrue : null;
  const shownScore = score + (lastCorrect ? 1 : 0);
  const advanceButton = useRef<HTMLButtonElement>(null);
  const revealFocus = useRef<{ round: typeof current; pick: boolean; opener: HTMLButtonElement } | null>(null);
  useLayoutEffect(() => {
    const request = revealFocus.current;
    if (!request) return;
    revealFocus.current = null;
    if (!showingResult || current !== request.round || lastPick !== request.pick) return;
    const active = document.activeElement;
    if (active === request.opener || active === document.body || !active?.isConnected) advanceButton.current?.focus({ preventScroll: true });
  }, [showingResult, current, lastPick]);
  const pickAnswer = (pick: boolean, opener: HTMLButtonElement) => {
    if (!current || showingResult || revealFocus.current) return;
    revealFocus.current = { round: current, pick, opener };
    answer(pick);
  };

  return (
    <>
      <PageSeo
        title="Champ or Not - True or False Champions Quiz | DoUKnowBall"
        description="Ten champion claims, true or false. Did the Nuggets really win that Finals? Pick your answer and read the real result across NFL, NBA, MLB, NHL, WNBA, college, soccer and footy."
        path="/champ-or-not"
      />
      <GameShell help="none"
        width="narrow"
        title={showRugby ? 'RUGBY LEAGUE' : '🏆 CHAMP OR NOT'}
        subtitle={showRugby ? 'Premiers and Dally M. Records through 2025.' : 'Ten title claims. Which ones really happened?'}
        className={showRugby ? '[&>header]:mb-3 [&>header>h1]:text-2xl [&>header>h1]:tracking-wide' : undefined}
        headerExtra={
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                onClick={() => { setShowRugby(false); switchMode('daily'); }}
                className={cn('rounded-lg font-semibold border transition-all', showRugby ? 'min-h-[44px] px-2 py-1.5 text-xs' : 'px-4 py-1.5 text-sm',
                  !showRugby && mode === 'daily' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Daily</button>
              <button
                onClick={() => { setShowRugby(false); switchMode('unlimited'); }}
                className={cn('rounded-lg font-semibold border transition-all', showRugby ? 'min-h-[44px] px-2 py-1.5 text-xs' : 'px-4 py-1.5 text-sm',
                  !showRugby && mode === 'unlimited' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Unlimited</button>
              <button
                hidden={showRugby}
                onClick={toggleHard}
                title="Hard mode: the fake winner really won a nearby year (unlimited only)"
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  hard ? 'bg-destructive/15 text-destructive border-destructive/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >😈 Hard</button>
            <button
              ref={rugbyButton}
              onClick={() => { setOpenedRugby(true); setShowRugby(true); }}
              aria-label="Rugby League"
              aria-pressed={showRugby}
              className={showRugby
                ? 'min-h-[44px] rounded-lg border border-primary bg-primary/10 px-2 py-1.5 text-xs font-semibold text-foreground'
                : 'mt-1 mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 text-left min-h-[64px] hover:border-primary/60'}
            >
              {showRugby ? 'Rugby League' : <><span aria-hidden="true" className="text-2xl">🏉</span>
              <span className="min-w-0"><span className="block font-semibold text-foreground">Rugby League</span><span className="block text-xs text-muted-foreground">Ten claims. Premiers + Dally M. Records through 2025.</span></span></>}
            </button>
            </div>
            {!showRugby && hard && mode === 'daily' && (
              <p className="text-xs text-muted-foreground mt-2">Hard kicks in on Unlimited. The daily stays the same ten for everyone.</p>
            )}
            {!showRugby && loadState === 'ready' && !done && (
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">Claim: <span className="font-semibold text-foreground">{Math.min(roundIdx + 1, total)}</span>/{total}</span>
                <span className="text-muted-foreground">Right: <span className="font-semibold text-gold">{shownScore}</span></span>
                {hardActive && <span className="text-destructive font-semibold">😈 Hard</span>}
              </div>
            )}
          </>
        }
      >
        {openedRugby && <div hidden={!showRugby}><RugbyLeagueChallenge active={showRugby} onExit={leaveRugby} /></div>}
        <div hidden={showRugby}>
        <RulesGate title="How to Play Champ or Not">
          <div className="space-y-3">
            <p>Ten claims about champions, one at a time. Some really happened, some are made from a real winner dropped into the wrong year. You call it: Champ or Not.</p>
            <p className="font-semibold text-foreground">The rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Every team named is a real champion of that competition. The lie is only ever the year.</li>
              <li>Tap CHAMP if the claim is true, NOT if it is false.</li>
              <li>One point per correct call, ten claims a day, same claims for everyone.</li>
              <li>The reveal always shows who really won that year, and for the finals leagues, who they beat and by what.</li>
              <li>Take your time with the answer. Tap Next claim when ready, or View results after the last claim.</li>
              <li>Hard mode (Unlimited only): the fake winner really did win, just a season or three away from the year on the card.</li>
            </ul>
            <p className="font-semibold text-foreground">Worked example:</p>
            <p>"The Chicago Bulls won the 1994 NBA Finals." Sounds close, but that is the year Jordan was playing baseball: the Rockets won it, so the call is NOT. If the claim had said 1993, the call would be CHAMP.</p>
          </div>
        </RulesGate>

        {loadState === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {loadState === 'error' && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-3">Couldn't load the champions lists right now.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
            >Try again</button>
          </div>
        )}

        {loadState === 'ready' && !done && current && (
          <div className="max-w-md mx-auto">
            <div className={cn(
              'bg-card border rounded-2xl p-6 text-center transition-colors',
              showingResult && lastCorrect === true && 'border-correct ring-1 ring-correct',
              showingResult && lastCorrect === false && 'border-destructive ring-1 ring-destructive',
              !showingResult && 'border-border'
            )}>
              <div className="text-3xl mb-3">{current.emoji}</div>
              <p className="text-lg font-semibold text-foreground leading-snug min-h-[56px]">{current.statement}</p>

              {!showingResult && (
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button
                    onClick={event => pickAnswer(true, event.currentTarget)}
                    className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                  >🏆 CHAMP</button>
                  <button
                    onClick={event => pickAnswer(false, event.currentTarget)}
                    className="px-4 py-3 rounded-xl bg-secondary text-foreground font-bold border border-border hover:bg-secondary/70 transition-colors"
                  >🚫 NOT</button>
                </div>
              )}

              {showingResult && (
                <div className="mt-5 text-sm">
                  <div className={cn('inline-flex items-center gap-1.5 font-bold text-base mb-2',
                    lastCorrect ? 'text-correct' : 'text-destructive')}>
                    {lastCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {lastCorrect ? 'Right!' : 'Wrong!'}
                  </div>
                  <p role="status" className="text-muted-foreground">
                    {current.isTrue
                      ? 'That one really happened.'
                      : `Nope. ${current.year} went to ${current.realTeams.join(' and ')}.`}
                    {current.beatLine ? ` They beat ${current.beatLine}.` : ''}
                  </p>
                  <button
                    ref={advanceButton}
                    onClick={advanceReveal}
                    className="w-full min-h-[44px] mt-3 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
                  >{roundIdx + 1 === total ? 'View results' : 'Next claim'}</button>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {rounds.map((_, i) => (
                <span
                  key={i}
                  className={cn('w-2.5 h-2.5 rounded-full',
                    i < answers.length ? (answers[i] ? 'bg-correct' : 'bg-destructive') : 'bg-secondary'
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {loadState === 'ready' && done && (
          <div className="max-w-md mx-auto">
            <ResultScreen
              won={score >= 7}
              outcomeEmoji={score >= 9 ? '🏆' : score >= 7 ? '👏' : '😅'}
              headline={`${score}/${total} Called Right!`}
              statLine={<>You can smell a fake title from a mile away{score >= 9 ? '.' : score >= 7 ? ', mostly.' : '... eventually.'}</>}
              emojiGrid={`🏆 Champ or Not${hardActive ? ' 😈' : ''}: ${score}/${total}\n${answers.map(a => (a ? '✅' : '❌')).join('')}`}
              share={{
                score: `${score}/${total} on ${mode === 'daily' ? "today's" : 'an unlimited run of'} Champ or Not${hardActive ? ' in hard mode' : ''}`,
                gameName: 'Champ or Not',
                gamePath: '/champ-or-not',
              }}
              onPlayAgain={mode === 'unlimited' ? playAgain : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Ten new claims tomorrow!</p>}
            />
          </div>
        )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Want the source material? <Link to="/records" className="text-primary hover:underline">Browse the Record Books</Link>, champions by year for every competition we keep.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Champ or Not | DoUKnowBall"
          description="A daily true or false gauntlet over real title history. Every claim names a genuine champion; the catch is whether they won THAT year. Covers the Super Bowl, NBA, World Series, Stanley Cup, WNBA, college football and hoops, English soccer, the AFL and the NRL."
          howToPlay={[
            'Read the claim: a team, a title, a year',
            'Tap CHAMP if it really happened, NOT if it did not',
            'The reveal shows who actually won that year, and in the finals leagues who they beat',
            'Ten claims a day, one point each, same set for everyone',
            'Unlimited mode deals fresh claims all day',
          ]}
          examples={[
            '"The Chicago Bulls won the 1994 NBA Finals": NOT, that is the baseball year, Houston won it',
            '"The New York Islanders won the Stanley Cup in 1982": CHAMP, mid dynasty',
            '"Leicester City were champions of England in 2016": CHAMP, the 5000 to 1 season',
            'Every false claim names a real winner of that competition, just in the wrong year',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="champ-or-not" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default ChampOrNot;
