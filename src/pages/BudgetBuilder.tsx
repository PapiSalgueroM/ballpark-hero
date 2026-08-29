import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { BudgetBuilderBoard } from '@/components/budget-builder/BudgetBuilderBoard';

export default function BudgetBuilder() {
  return (
    <>
      <PageSeo
        title="€1 Billion Budget Builder - Build the Best XI | DoUKnowBall"
        description="You have €1 billion and real market values. Pick a formation, sign eleven players, and see what rating your money actually bought."
        path="/budget-builder"
      />
      <GameNavbar />
      <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
      <BudgetBuilderBoard />
      <GameSeoContent
        title="€1 Billion Budget Builder | DoUKnowBall"
        description="One billion euros, real transfer market values, eleven slots. Choose any formation, filter by competition, and build the strongest XI your budget allows. Overspend and you cannot field the team, the whole game is deciding where the money goes."
        howToPlay={[
          'You start with €1,000M, one billion euros.',
          'Pick a formation, then tap any position on the pitch.',
          'Sign a player: their real market value comes straight off your budget.',
          'You will only be shown players you can actually afford for that slot.',
          'Release anyone to get their fee back and rethink.',
          'Fill all eleven to get your team rating, then share the XI.',
        ]}
        examples={[
          'Blow €430M on Haaland, Mbappé and Yamal, then field a €5M back four',
          'Spread it evenly and see if an all-85 XI beats a top-heavy one',
          'Restrict to one league and watch the budget stop stretching',
          'Try 5-3-2, defenders are cheaper than wingers, and it shows',
        ]}
      />
    </>
  );
}
