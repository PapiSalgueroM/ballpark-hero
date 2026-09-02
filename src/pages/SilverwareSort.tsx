import { Link } from 'react-router-dom';
import { useSilverwareSort } from '@/hooks/useSilverwareSort';
import { BOARD_SIZE, ATTEMPTS } from '@/lib/silverwareSort';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Silverware Sort (Round 250): five teams, one competition, stack them
 * by title count. Counts are derived by counting rows in the audited
 * champion tables, and a board only ever holds five distinct counts, so
 * there is exactly one right order. simSilverwareSort.mjs is the fence.
 */
const SilverwareSort = () => {
  const {
    loadState, mode, switchMode, boards, boardIdx, board, slots, locked,
    attempt, revealed, place, unplace, canSubmit, submit, results, done,
    score, maxScore, playAgain,
  } = useSilverwareSort();

  const placedSet = new Set(slots.filter(v => v !== null));
  const perfects = results.filter(r => r.f).length;

  return (
    <>
      <PageSeo
        title="Silverware Sort - Rank Champions by Titles | DoUKnowBall"
        description="Five teams, one trophy cabinet question: who has more? Stack them in order by real title counts across the Super Bowl, NBA, MLB, NHL, college, English soccer and Aussie footy."
        path="/silverware-sort"
      />
      <GameShell help="none"
        width="narrow"
        title="🥇 SILVERWARE SORT"
        subtitle="Five teams. Stack them, most titles on top."
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
            {loadState === 'ready' && !done && board && (
              <div className="flex items-center justify-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">Board: <span className="font-semibold text-foreground">{Math.min(boardIdx + 1, boards.length)}</span>/{boards.length}</span>
                <span className="text-muted-foreground">Points: <span className="font-semibold text-gold">{score}</span></span>
                {!revealed && <span className="text-muted-foreground">Try <span className="font-semibold text-foreground">{attempt}</span>/{ATTEMPTS}</span>}
              </div>
            )}
          </>
        }
      >
        <RulesGate title="How to Play Silverware Sort">
          <div className="space-y-3">
            <p>Five teams from one competition, and one question: who owns the most titles? Tap the teams into the ladder, most at the top, then submit.</p>
            <p className="font-semibold text-foreground">The rules:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tap a team to drop it into the highest empty rung. Tap a placed team to take it back out.</li>
              <li>Two tries per board. Rungs you get right on the first try lock in green for the second.</li>
              <li>One point per correct rung, three boards a day, same boards for everyone.</li>
              <li>No two teams on a board are ever tied, so there is always exactly one right order.</li>
              <li>Counts follow our Record Books: a title belongs to the name the club wore at the time, so South Melbourne and Sydney count separately.</li>
            </ul>
            <p className="font-semibold text-foreground">Worked example:</p>
            <p>Handed the Yankees, the Cardinals, the Dodgers, the Cubs and the Marlins on a World Series board, the stack is Yankees 27 up top, then the Cardinals 11, the Dodgers, the Cubs, and the Marlins at the bottom with 2. The reveal always shows every count.</p>
          </div>
        </RulesGate>

        {loadState === 'loading' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {loadState === 'error' && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-3">Couldn't load the title counts right now.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold"
            >Try again</button>
          </div>
        )}

        {loadState === 'ready' && !done && board && (
          <div className="max-w-md mx-auto">
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-center font-semibold text-foreground mb-1">
                {board.emoji} Most {board.title}
              </p>
              <p className="text-center text-xs text-muted-foreground mb-4">
                {revealed ? 'The real order, counts and all:' : 'Most at the top, fewest at the bottom.'}
              </p>

              {/* the ladder */}
              <div className="space-y-2 mb-4">
                {Array.from({ length: BOARD_SIZE }, (_, i) => {
                  if (revealed) {
                    const right = revealed[i];
                    return (
                      <div
                        key={i}
                        className={cn('flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                          right ? 'border-correct bg-correct/10' : 'border-destructive bg-destructive/10')}
                      >
                        <span className="flex items-center gap-2 font-semibold text-foreground">
                          {right ? <Check className="w-4 h-4 text-correct shrink-0" /> : <X className="w-4 h-4 text-destructive shrink-0" />}
                          {board.teams[i].team}
                        </span>
                        <span className="text-muted-foreground shrink-0">{board.teams[i].count} {board.noun}</span>
                      </div>
                    );
                  }
                  const v = slots[i];
                  return (
                    <button
                      key={i}
                      onClick={() => unplace(i)}
                      disabled={v === null || locked[i]}
                      className={cn('w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left min-h-[42px]',
                        locked[i] ? 'border-correct bg-correct/10' : v !== null ? 'border-primary/40 bg-secondary' : 'border-dashed border-border bg-background')}
                    >
                      <span className="text-xs text-muted-foreground w-8 shrink-0">{i === 0 ? 'Most' : i === BOARD_SIZE - 1 ? 'Least' : `#${i + 1}`}</span>
                      {v !== null ? (
                        <span className={cn('font-semibold', locked[i] ? 'text-correct' : 'text-foreground')}>
                          {locked[i] && <Check className="w-3.5 h-3.5 inline mr-1" />}
                          {board.teams[v].team}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">Tap a team below</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* the tray */}
              {!revealed && (
                <>
                  <div className="flex flex-wrap justify-center gap-2 mb-4 min-h-[38px]">
                    {board.tray.filter(t => !placedSet.has(t)).map(t => (
                      <button
                        key={t}
                        onClick={() => place(t)}
                        className="px-3 py-1.5 rounded-full bg-secondary border border-border text-sm font-semibold text-foreground hover:border-primary/50 transition-colors"
                      >{board.teams[t].team}</button>
                    ))}
                  </div>
                  <button
                    onClick={submit}
                    disabled={!canSubmit}
                    className={cn('w-full px-4 py-3 rounded-xl font-bold transition-opacity',
                      canSubmit ? 'bg-primary text-primary-foreground hover:opacity-90' : 'bg-secondary text-muted-foreground cursor-not-allowed')}
                  >{attempt === 1 ? 'Lock it in' : 'Final answer'}</button>
                </>
              )}
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {boards.map((_, i) => (
                <span
                  key={i}
                  className={cn('w-2.5 h-2.5 rounded-full',
                    i < results.length ? (results[i].s === BOARD_SIZE ? 'bg-correct' : results[i].s >= 3 ? 'bg-gold' : 'bg-destructive') : 'bg-secondary'
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {loadState === 'ready' && done && (
          <div className="max-w-md mx-auto">
            <ResultScreen
              won={score >= 11}
              outcomeEmoji={score === maxScore ? '🥇' : score >= 11 ? '👏' : '😅'}
              headline={`${score}/${maxScore} Rungs Right!`}
              statLine={<>{perfects === results.length && perfects > 0 ? 'Every board first try. You know the cabinets cold.' : perfects > 0 ? `${perfects} board${perfects === 1 ? '' : 's'} nailed first try.` : 'The cabinets keep their secrets... for now.'}</>}
              emojiGrid={`🥇 Silverware Sort: ${score}/${maxScore}\n${results.map(r => r.g.map(x => (x ? '🟩' : '🟥')).join('') + (r.f ? ' ⭐' : '')).join('\n')}`}
              share={{
                score: `${score}/${maxScore} on ${mode === 'daily' ? "today's" : 'an unlimited run of'} Silverware Sort`,
                gameName: 'Silverware Sort',
                gamePath: '/silverware-sort',
              }}
              onPlayAgain={mode === 'unlimited' ? playAgain : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Three new boards tomorrow!</p>}
            />
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Arguing with a count? <Link to="/records" className="text-primary hover:underline">The Record Books</Link> list every title year by year.
        </p>

        <GameSeoContent
          pageHasOwnH1
          title="Silverware Sort | DoUKnowBall"
          description="A daily ordering puzzle over real trophy cabinets. Five teams from one competition, and you stack them by how many titles each has actually won, checked against the same audited record books the rest of the site runs on. Covers the Super Bowl, NBA, World Series, Stanley Cup, college football and hoops, the English title, the AFL and the NRL."
          howToPlay={[
            'Five teams from one competition appear as a shuffled pile',
            'Tap them into the ladder in order, most titles at the top',
            'Submit: rungs you placed right lock green, and you get one more try at the rest',
            'One point per correct rung, three boards a day, same for everyone',
            'The reveal shows every count, so you leave knowing the real cabinet',
          ]}
          examples={[
            'A World Series board: Yankees over Cardinals over Dodgers is the easy top half, the bottom two are where runs die',
            'An AFL board will never deal Essendon, Carlton and Collingwood together: all three sit on 16 flags, and tied teams never share a board',
            'Counts follow the name the club wore at the time, same as our Record Books: South Melbourne and Sydney count separately',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="silverware-sort" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default SilverwareSort;
