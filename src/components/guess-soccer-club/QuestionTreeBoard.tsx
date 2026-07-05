import { Button } from '@/components/ui/button';
import { ClubSearch } from './ClubSearch';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { QuestionTreeState } from '@/types/guessSoccerClub';
import { CLUB_QUESTIONS, ClubQuestionId, QUESTION_TREE_START_SCORE, getClubQuestion } from '@/lib/clubQuestionTree';
import { Trophy, Users } from 'lucide-react';

interface Props {
  treeState: QuestionTreeState;
  askQuestion: (id: ClubQuestionId) => void;
  guessClubInTree: (input: string) => void;
  resetQuestionTree: () => void;
  allClubNames: string[];
  questionsRemainingCount: number;
}

export function QuestionTreeBoard({
  treeState,
  askQuestion,
  guessClubInTree,
  resetQuestionTree,
  allClubNames,
  questionsRemainingCount,
}: Props) {
  const isPlaying = treeState.status === 'playing';
  const isWon = treeState.status === 'won';
  const isLost = treeState.status === 'lost';

  const spentSoFar = treeState.askedIds.reduce(
    (sum, id) => sum + getClubQuestion(id).cost,
    0
  );
  const potentialScore = Math.max(0, QUESTION_TREE_START_SCORE - spentSoFar);

  const shareScore = isWon
    ? `I guessed the Football Club in ${treeState.askedIds.length} question${treeState.askedIds.length !== 1 ? 's' : ''}!\nScore: ${treeState.score} ⚽`
    : `I couldn't guess the Football Club. It was ${treeState.puzzle.fullName} ⚽`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary font-display mb-1">
            ❓ Guess The Club: 20 Questions
          </h1>
          <p className="text-sm text-muted-foreground">Ask questions, then guess the club</p>
        </div>

        {isPlaying && (
          <div className="flex justify-center gap-3 mb-6 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Potential</span>
              <span className="text-lg font-bold text-primary">{potentialScore} pts</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-muted/40 border border-border px-4 py-2 rounded-full">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Clubs left:</span>
              <span className="text-lg font-bold text-foreground">{questionsRemainingCount}</span>
            </div>
          </div>
        )}

        {/* Question menu */}
        {isPlaying && (
          <div className="space-y-2 mb-6">
            {CLUB_QUESTIONS.map(q => {
              const asked = treeState.askedIds.includes(q.id);
              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-lg border transition-all duration-300 ${
                    asked ? 'bg-card border-border' : 'bg-muted/20 border-border/40'
                  }`}
                >
                  {asked ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">{q.label}</p>
                      <p className="text-foreground leading-snug">{q.answer(treeState.puzzle)}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => askQuestion(q.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="text-foreground">{q.label}</span>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-3">
                        -{q.cost} pts
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Playing state: guess input */}
        {isPlaying && (
          <div className="space-y-4">
            <ClubSearch usedGuesses={treeState.guesses} onGuess={guessClubInTree} allClubNames={allClubNames} />
            <p className="text-center text-xs text-muted-foreground">
              One guess ends the round. Ask as many questions as you like first.
            </p>

            {treeState.guesses.length > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Wrong guesses:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {treeState.guesses.map((g, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-destructive/15 text-destructive rounded-full text-sm"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {(isWon || isLost) && (
          <div className="space-y-6 text-center">
            <div
              className={`p-6 rounded-xl border ${
                isWon
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <h2
                className={`text-2xl font-bold mb-1 ${
                  isWon ? 'text-primary' : 'text-destructive'
                }`}
              >
                {isWon ? '🎉 Correct!' : '😞 Game Over'}
              </h2>
              {isWon && (
                <p className="text-muted-foreground mb-1">
                  You scored{' '}
                  <span className="text-primary font-bold text-xl">{treeState.score}</span>{' '}
                  points using{' '}
                  <span className="font-semibold text-foreground">{treeState.askedIds.length}</span>{' '}
                  question{treeState.askedIds.length !== 1 ? 's' : ''}!
                </p>
              )}
              {isLost && (
                <p className="text-sm text-muted-foreground mt-1">
                  The club was <span className="font-semibold text-foreground">{treeState.puzzle.fullName}</span>.
                </p>
              )}
              <p className="text-sm text-muted-foreground italic mt-3">
                {treeState.puzzle.funFact}
              </p>
            </div>

            <ShareButtons
              score={shareScore}
              gameName="Guess The Football Club: 20 Questions"
              gamePath="/guess-soccer-club"
            />

            <Button onClick={resetQuestionTree} variant="outline" className="w-full max-w-xs mx-auto">
              Play Again
            </Button>
          </div>
        )}

        <GameNav />
      </div>
    </div>
  );
}
