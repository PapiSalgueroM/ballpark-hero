import type { ReactNode } from "react";
import PageSeo from "@/components/seo/PageSeo";
import GameSeoContent from "@/components/seo/GameSeoContent";
import { GameNavbar } from "@/components/game/GameNavbar";
import { GameHelp } from "@/components/game/GameHelp";
import { REDUCED_ROLE_GAMES } from "@/lib/soccerCareerRole";
import { DERBY_HELP_RULES } from "@/lib/soccerCareerDerbyHelp";
import { SOCCER_DECK_HELP_RULES } from "@/lib/soccerDeckGate";

const STORY_ROLE_HELP_RULES = [
  'Phone and Training sit above your player on a phone. Career Story opens your saved chapters; Previous and Next move between them, and All seasons returns to the tile you opened.',
  `Accepting a smaller role from a new manager means ${REDUCED_ROLE_GAMES} fewer planned league games next season at that club. It lasts one recorded season; a move, loan or retirement clears it. Example: a selection of 30 becomes ${30 - REDUCED_ROLE_GAMES} before existing selection limits, injuries and bans.`,
  'Personal goal milestones count the goals of your recorded senior club seasons, excluding academy and international goals. Example: 99 senior club goals plus 2 this season takes you past 100, with a new total of 101. The summary shows that crossing.',
];

export function SoccerCareerFrame({ active = false, children, reportGameContext }: {
  active?: boolean;
  children: ReactNode;
  reportGameContext: Record<string, unknown>;
}) {
  return (
    <>
      <PageSeo
        title="Soccer Career: From Academy to Retirement | DoUKnowBall"
        description="Create a footballer, earn your first pro contract, choose transfers and play season by season in a free soccer career simulator."
        path="/soccer-career"
      />

      {/* Round 129: clearance under the last of the page content. The action bar
          rides the bottom of the screen for the whole page now and comes to rest
          on top of the footer, and at the very end of the document that means it
          is parked over the 85px directly above the footer's top edge. The
          footer already carries mt-12, so 48 of those 85 pixels are empty margin
          and only 37 were real content, but 37px of the last FAQ answer is still
          37px he cannot read. 88px of padding here, only while a career is
          loaded, puts the whole thing back in the clear. It is a static class,
          not something that changes as you scroll, so it cannot interact with
          the lift measurement. */}
      <div className={`min-h-screen bg-background text-foreground flex flex-col ${active ? 'pb-[88px]' : ''}`}>
        <GameNavbar />
        <div className={`relative z-10 mx-auto w-full max-w-4xl ${active ? "h-11 sm:h-0" : ""}`}>
          <GameHelp extraRules={[...DERBY_HELP_RULES,
            'Recent club form: last season at the same club needs 10 to 38 recorded league appearances. A rating of 7.6 or more adds two to next year\'s selection draw; 6.4 or less takes two away. Phone effects and frozen-out limits still apply. Example: a 24-game draw becomes 26 after a qualifying 7.8 season.',
            'Preseason plan: choose development (+1 position skill after growth, 3 percentage points more injury risk), recovery (-1 skill, 4 points less risk), or balanced. Example: 20% injury risk becomes 23% or 16%, within existing limits. A serious injury or no appearances interrupts development; a move cancels the plan.',
            'Academy mentoring: the Youth Mentor event starts one generated player. Ten senior appearances at your shared club adds one mentoring year. Example: 12 appearances moves 0/3 to 1/3; six appearances pauses it. Three qualifying years complete it, a move ends it, and its history stays in the mentor tile.',
            ...STORY_ROLE_HELP_RULES,
            ...SOCCER_DECK_HELP_RULES,
            'One tab at a time: the career plays in the newest tab you opened. An older tab asks you to reload. Example: open it in two tabs and play a season in the second; the first asks you to reload, and the reload shows that season.',
          ]} className={active ? "h-11 w-11 sm:h-auto sm:w-auto" : undefined} />
        </div>
        {children}
        <GameSeoContent
          pageHasOwnH1
          reportGameContext={reportGameContext}
          title="Soccer Career Simulator | DoUKnowBall"
          description="Live out your soccer dream in a season by season career simulator. Create a player, join a youth academy, develop skills, sign contracts, win trophies, and compete for the Ballon d'Or."
          howToPlay={[
            "Create your player: choose name, nationality, position, and starting era to begin your career.",
            "Each season, develop your skills through training, handle contract offers, and compete for trophies.",
            "Win the Ballon d'Or, lead your team to World Cup glory, and build a legendary career timeline."
          ]}
          examples={[
            "Start at La Masia (Barcelona academy) as a Spanish midfielder",
            "Transfer from Ajax to Premier League for a big contract",
            "Win the Champions League and earn a Ballon d'Or nomination",
            "Buy a Private Chef upgrade (+2 Physical, +2 Stamina)",
            "Pass your country's real all-time scoring record (not every nation has one on file yet)",
            "Earn Club Legend status with 300+ appearances at one club",
            "Retire after 20 seasons with a legendary career score"
          ]}
        />
      </div>
    </>
  );
}
