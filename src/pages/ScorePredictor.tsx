import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ScorePredictorBoard } from '@/components/score-predictor/ScorePredictorBoard';

export default function ScorePredictor() {
  return (
    <>
      <PageSeo
        title="Score Predictor - Guess Famous Match Scores | DoUKnowBall"
        description="Can you predict the final score of history's most famous matches? Guess soccer, NFL, and NBA scores for points."
        path="/score-predictor"
      />
      <ScorePredictorBoard />
      <GameSeoContent
        title="Score Predictor | DoUKnowBall"
        description="Test your sports memory by predicting the final score of legendary matches across soccer, NFL, and NBA history."
        howToPlay={[
          "You're shown a famous match with teams, competition, date, and a contextual hint.",
          "Enter your predicted score for both teams.",
          "Exact score = 1000 pts, correct winner within 1 goal = 700, within 2 = 400, correct winner = 200, wrong = 50.",
          "After submitting, the actual score is revealed along with a fun fact."
        ]}
        examples={[
          "Liverpool vs AC Milan (2005 UCL Final) → 3-3 (Liverpool won on pens)",
          "NY Giants vs New England (Super Bowl XLII) → 17-14",
          "Brazil vs Germany (2014 World Cup SF) → 1-7",
          "Cleveland vs Golden State (2016 Finals G7) → 93-89"
        ]}
      />
    </>
  );
}
