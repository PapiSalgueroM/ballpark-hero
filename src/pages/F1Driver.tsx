import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { F1DriverBoard } from '@/components/f1-driver/F1DriverBoard';

export default function F1Driver() {
  return (
    <>
      <PageSeo
        title="Guess The F1 Driver — DoUKnowBall"
        description="Can you identify the mystery F1 driver from progressive clues? Test your motorsport knowledge with daily challenges."
        path="/f1-driver"
      />
      <F1DriverBoard />
      <GameSeoContent
        title="Guess The F1 Driver | DoUKnowBall"
        description="Identify the mystery Formula 1 driver from progressive clues about their career, nationality, teams, and race wins. Daily and unlimited modes available."
        howToPlay={[
          "Read each clue carefully — they reveal details about the driver's career era, nationality, and achievements.",
          "Submit your guess at any time. Fewer clues used means a higher score.",
          "Play the daily challenge for a shared puzzle, or switch to unlimited for endless practice."
        ]}
        examples={[
          "Lewis Hamilton — Mercedes/McLaren, British, 7× World Champion, 100+ wins",
          "Max Verstappen — Red Bull, Dutch, 4× World Champion",
          "Ayrton Senna — McLaren/Lotus, Brazilian, 3× World Champion, Imola 1994",
          "Michael Schumacher — Ferrari/Benetton, German, 7× World Champion, 91 wins",
          "Sebastian Vettel — Red Bull/Ferrari, German, 4× World Champion",
          "Niki Lauda — Ferrari/McLaren, Austrian, 3× Champion, 1976 crash survivor"
        ]}
      />
    </>
  );
}
