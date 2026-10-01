import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import { RulesGate } from '@/components/game/RulesGate';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import AussieRulesManagerBoard from '@/components/aussie-rules-manager/AussieRulesManagerBoard';

export default function AussieRulesManager() {
  return <><PageSeo title="Aussie Rules Manager - A Fictional Footy Season | DoUKnowBall" description="Manage a fictional Australian rules club through ten rounds. Select your matchday 23, prepare your squad, change tactics each quarter and follow the league ladder." path="/aussie-rules-manager" />
    <div className="min-h-screen bg-background text-foreground"><GameNavbar /><main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
      <header className="mb-4"><div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-display font-bold text-primary">Aussie Rules Manager</h1>
        <RulesGate title="How to Play Aussie Rules Manager" floatingTrigger={false} className="min-h-11 min-w-11">
          <div className="space-y-3"><p>Pick one of six fictional clubs and manage ten home-and-away rounds. Every player is generated. Finish top of the ladder to win this short league.</p>
            <ul className="list-disc pl-5 space-y-2"><li>Select 18 starters and five interchange players from your 36-player squad before preparation. This game's formation uses six defenders, five midfielders, one ruck and six forwards.</li>
              <li>Choose training or rest each week, then a tactic for each of four 20 active-minute quarters. Tactics and preparation use this game's simulation rules.</li>
              <li>At quarter breaks, swap a starter with a same-role interchange player. This game allows five swaps per break. Break changes are separate from counted in-quarter interchanges, which this game does not simulate.</li>
              <li>A goal is six points and a behind is one. Scores show goals.behinds (total points).</li><li>Wins earn four ladder points and draws earn two. Percentage compares points for with points against. This game's ladder uses points, then percentage, then original generated club order for an exact tie.</li>
              <li>Your season resumes on this browser when local storage is available. This fictional ten-round format has no finals and does not copy an actual season draw.</li></ul>
            <p><strong>Example:</strong> 12 goals and 8 behinds make 80 points. An opponent with 11 goals and 10 behinds has 76, so your club wins and earns four ladder points.</p>
            <p className="text-xs text-muted-foreground">Match rules: <a className="underline" href="https://resources.afl.com.au/afl/document/2026/02/13/8676d880-481a-4211-a479-305f138ce8b6/Laws-of-Australian-Football-Final-13-February-2026-.pdf" target="_blank" rel="noopener noreferrer">2026 Laws</a> and <a className="underline" href="https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf" target="_blank" rel="noopener noreferrer">2026 Regulations</a>.</p>
          </div>
        </RulesGate></div><p className="mt-1 text-xs text-muted-foreground">Six fictional clubs. Ten rounds. Your season.</p></header>
      <AussieRulesManagerBoard /><GameSeoContent pageHasOwnH1 title="Aussie Rules Manager: A Fictional Australian Rules Season" description="Choose a fictional club, select your 18 starters and five interchange players, manage each quarter and follow an exact goals-and-behinds ladder through ten rounds." /><GameNav />
    </main></div></>;
}
