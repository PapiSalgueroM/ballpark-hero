import { Link } from 'react-router-dom';
import { useWhodTheyBeat } from '@/hooks/useWhodTheyBeat';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Who'd They Beat? (Round 242): the champion is given, you name the
 * beaten finalist. Every option is a real finals participant from the
 * audited tables completed in Rounds 239 to 242.
 */
const WhodTheyBeat = () => {
  const {
    loadState, mode, switchMode, questions, qIdx, current, showingResult,
    pickedIndex, answers, done, score, answer, playAgain,
  } = useWhodTheyBeat();

  const total = questions.length;

  return (
    <>
      <PageSeo
        title="Who'd They Beat? - Finals Runner-up Quiz | DoUKnowBall"
        description="Everyone remembers the champion. The 1994 Rockets, the 2016 Cavs, the 1942 Leafs: who did they actually beat? Ten finals a day across NFL, NBA, MLB, NHL and WNBA."
        path="/whod-they-beat"
      />
      <GameShell
        width="narrow"
        title="🥈 WHO'D THEY BEAT?"
        subtitle="Everyone remembers the champion. Do you remember the other guys?"
        headerExtra={
          <>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => switchMode('daily')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'daily' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Daily</button>
              <button
                onClick={() => switchMode('unlimited')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'unlimited' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Unlimited</button>
            </div>
            {loadState === 'ready' && !done && (
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">Final: <span className="font-semibold text-foreground">{Math.min(qIdx + 1, total)}</span>/{total}</span>
                <span className="text-muted-foreground">Right: <span className="font-semibold text-gold">{score}</span></span>
              </div>
            )}
          </>
        }
      >
        <RulesGate title="How to Play Who'd They Beat?">
          <div className="space-y-3">
            <p>History remembers champions. This game is about the team on the wrong end of the handshake line. We name the champion and the year, you pick who they beat in the finals.</p>
            <p className="font-semibold text-foreground">The rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Ten finals a day: two each from the Super Bowl, NBA, World Series, Stanley Cup and WNBA.</li>
              <li>Four options, all of them real beaten finalists from that same competition. One of them is from the right year.</li>
              <li>One point per correct pick, same ten for everyone, and the reveal shows the series result.</li>
            </ul>
            <p className="font-semibold text-foreground">Worked example:</p>
            <p>"The Houston Rockets won the 1994 NBA Finals. Who did they beat?" The Knicks took that one to seven games, so the answer is New York. If you picked Orlando, that was the year after, which is exactly the trap.</p>
          </div>
        </RulesGate>

        {loadState === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {loadState === 'error' && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-3">Couldn't load the finals history right now.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
            >Try again</button>
          </div>
        )}

        {loadState === 'ready' && !done && current && (
          <div className="max-w-md mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="text-3xl mb-3 text-center">{current.emoji}</div>
              <p className="text-lg font-semibold text-foreground leading-snug text-center min-h-[56px]">{current.question}</p>

              <div className="grid grid-cols-1 gap-2 mt-5">
                {current.options.map((opt, i) => {
                  const isCorrect = i === current.correctIndex;
                  const isPicked = i === pickedIndex;
                  return (
                    <button
                      key={`${opt}-${i}`}
                      onClick={() => answer(i)}
                      disabled={showingResult}
                      className={cn('px-4 py-3 rounded-xl font-semibold border text-sm transition-all',
                        !showingResult && 'bg-secondary text-foreground border-border hover:border-primary',
                        showingResult && isCorrect && 'bg-correct/15 text-correct border-correct',
                        showingResult && isPicked && !isCorrect && 'bg-destructive/15 text-destructive border-destructive',
                        showingResult && !isPicked && !isCorrect && 'bg-secondary text-muted-foreground border-border opacity-60'
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {showingResult && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {pickedIndex === current.correctIndex ? 'Right! ' : 'Nope. '}
                  The {current.winner} beat the {current.options[current.correctIndex]}.
                  {current.detail ? ` ${current.detail}.` : ''}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {questions.map((_, i) => (
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
              outcomeEmoji={score >= 9 ? '🏆' : score >= 7 ? '🥈' : '😅'}
              headline={`${score}/${total} Remembered!`}
              statLine={<>The handshake line never forgets{score >= 9 ? '.' : score >= 7 ? ', mostly.' : '... but you might.'}</>}
              emojiGrid={`🥈 Who'd They Beat?: ${score}/${total}\n${answers.map(a => (a ? '✅' : '❌')).join('')}`}
              share={{
                score: `${score}/${total} on ${mode === 'daily' ? "today's" : 'an unlimited run of'} Who'd They Beat?`,
                gameName: "Who'd They Beat?",
                gamePath: '/whod-they-beat',
              }}
              onPlayAgain={mode === 'unlimited' ? playAgain : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Ten new finals tomorrow!</p>}
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Every final in this game is in <Link to="/records" className="text-primary hover:underline">the Record Books</Link>, runner-up and all.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Who'd They Beat? | DoUKnowBall"
          description="A daily quiz about the other side of the trophy photo. We give you the champion and the year across the Super Bowl, NBA Finals, World Series, Stanley Cup and WNBA Finals; you name the beaten finalist. Every option is a real runner-up from the record books."
          howToPlay={[
            'Read the final: a champion and a year',
            'Pick which of the four teams they beat',
            'Every option really lost a final in that competition, one in that year',
            'Ten finals a day, one point each, same set for everyone',
            'Unlimited mode deals fresh finals all day',
          ]}
          examples={[
            '"The 1994 Rockets beat..." the Knicks, in seven. Orlando was the year after: the classic trap',
            '"The 2016 Cavaliers beat..." the Warriors, down from 3-1',
            '"The 1942 Maple Leafs beat..." Detroit, from 3-0 down, still the only finals comeback like it',
            'The reveal always shows the series result',
          ]}
        />

        <AdBanner slot="1234567905" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="whod-they-beat" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default WhodTheyBeat;
