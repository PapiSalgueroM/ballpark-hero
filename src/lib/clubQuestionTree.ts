import { SoccerClubPuzzle } from '@/types/guessSoccerClub';

// R6 Wave 15b: Guided question-tree mode for Guess The Club.
// The player picks from a fixed menu of question types (built from the same
// fields the classic clue-tier mode already reveals) instead of typing free
// text. Each answered question costs points; the final guess is scored on
// how many questions were used, fewer is better. No new data: every question
// below reads from fields already present on SoccerClubPuzzle.

export type ClubQuestionId =
  | 'country'
  | 'league'
  | 'leagueTitlesThreshold'
  | 'kitColors'
  | 'notablePlayers'
  | 'vibe';

export interface ClubQuestion {
  id: ClubQuestionId;
  label: string;
  cost: number;
  /** Returns the answer text computed from the secret puzzle row. */
  answer: (puzzle: SoccerClubPuzzle) => string;
}

export const QUESTION_TREE_START_SCORE = 1000;

// Cheaper/broader questions cost less; sharper, narrowing questions cost more.
export const CLUB_QUESTIONS: ClubQuestion[] = [
  {
    id: 'country',
    label: 'Which country is the club from?',
    cost: 100,
    answer: puzzle => puzzle.country,
  },
  {
    id: 'league',
    label: 'What league (and hint about it)?',
    cost: 120,
    answer: puzzle => `${puzzle.league}. ${puzzle.clues.leagueHint}`,
  },
  {
    id: 'leagueTitlesThreshold',
    label: 'Has it won more than 10 league titles?',
    cost: 140,
    answer: puzzle =>
      puzzle.clues.leagueTitles > 10
        ? `Yes, ${puzzle.clues.leagueTitles} league titles.`
        : `No, only ${puzzle.clues.leagueTitles} league title${puzzle.clues.leagueTitles === 1 ? '' : 's'}.`,
  },
  {
    id: 'kitColors',
    label: 'What are the kit colors?',
    cost: 130,
    answer: puzzle => puzzle.clues.kitColors,
  },
  {
    id: 'notablePlayers',
    label: 'Name a notable current player.',
    cost: 160,
    answer: puzzle =>
      puzzle.notablePlayers && puzzle.notablePlayers.length > 0
        ? puzzle.notablePlayers.join(', ')
        : 'No standout current player data for this club yet.',
  },
  {
    id: 'vibe',
    label: "What is the club's vibe in one word?",
    cost: 90,
    answer: puzzle => puzzle.clues.vibe,
  },
];

export function getClubQuestion(id: ClubQuestionId): ClubQuestion {
  const q = CLUB_QUESTIONS.find(q => q.id === id);
  if (!q) throw new Error(`Unknown club question id: ${id}`);
  return q;
}

/** Score for a finished round: start score minus the cost of every question
 *  asked, minus a flat penalty if the final guess was wrong, floored at 0. */
export function scoreQuestionTreeRound(askedIds: ClubQuestionId[], guessedCorrectly: boolean): number {
  const spent = askedIds.reduce((sum, id) => sum + getClubQuestion(id).cost, 0);
  const wrongGuessPenalty = guessedCorrectly ? 0 : QUESTION_TREE_START_SCORE;
  return Math.max(0, QUESTION_TREE_START_SCORE - spent - wrongGuessPenalty);
}
