import { useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameNav } from '@/components/game/GameNav';
import { RulesGate } from '@/components/game/RulesGate';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import AussieRulesManagerBoard from '@/components/aussie-rules-manager/AussieRulesManagerBoard';
import AussieRulesLeagueBoard from '@/components/aussie-rules-manager/AussieRulesLeagueBoard';
import { chooseBoard, LEGACY_SAVE_KEY, SAVE_KEY } from '@/lib/aussieRulesLeague';

/** A saved full season opens the league, an unfinished ten round season opens the old board, otherwise the club menu. */
function firstBoard(): 'league' | 'legacy' | 'menu' {
  try { return chooseBoard(localStorage.getItem(SAVE_KEY), localStorage.getItem(LEGACY_SAVE_KEY)); }
  catch { return 'menu'; }
}

export default function AussieRulesManager() {
  const [board, setBoard] = useState(firstBoard);
  const [leaving, setLeaving] = useState(false);
  return <><PageSeo title="Aussie Rules Manager - A Full Fictional Footy Season | DoUKnowBall" description="Manage a fictional Australian rules club through 23 rounds, the wildcard week and the finals, the Grand Final and a national draft into next season." path="/aussie-rules-manager" />
    <div className="min-h-screen bg-background text-foreground"><GameNavbar /><main id="dukb-main" className="container max-w-2xl mx-auto px-4 py-6 pb-20">
      <header className="mb-4"><div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-display font-bold text-primary">Aussie Rules Manager</h1>
        <RulesGate title="How to Play Aussie Rules Manager" floatingTrigger={false} className="min-h-11 min-w-11">
          <div className="space-y-3"><p>Pick one of 18 fictional clubs and run it for as many seasons as you like. Every club and every player is made up. Play 23 rounds, make the top ten, survive the finals and win the Grand Final.</p>
            <ul className="list-disc pl-5 space-y-2"><li>Each week your list manager picks the best 18 starters and five interchange players from your 36 on current form (skill, less fatigue). Change any spot in Squad, then choose to train or rest.</li>
              <li>Pick a tactic and play a quarter at a time, or play the whole match in one tap. At the breaks you can make up to five same-role changes. Tactics, fatigue and selection follow this game's own simulation rules.</li>
              <li>A goal is six points and a behind is one. Scores show goals.behinds (total). A win is worth four ladder points and a draw two, then percentage: points for divided by points against, times 100.</li>
              <li>The finals follow the 2026 system: 7th v 10th and 8th v 9th in a wildcard week, then the final eight. The top four get a second chance if they lose in week one. A drawn final, the Grand Final included, plays two short extra time periods, and two more until somebody leads. In this game each period is a flat 3 minutes.</li>
              <li>After the Grand Final comes the summer: everyone ages a year, young players grow toward their ceilings, veterans slow down and some retire. Then the national draft fills every list back to 36.</li>
              <li>Playing the 23 games as 23 rounds with no byes, lists of 36 and the summer growth are this game's rules; the draft order follows the real 2026 one. Your career resumes on this browser when local storage is available.</li></ul>
            <p><strong>Example:</strong> 12 goals and 8 behinds make 80 points. An opponent with 11 goals and 10 behinds has 76, so your club wins and earns four ladder points.</p>
            <p><strong>Percentage example:</strong> 1850 points for and 1700 against gives 1850 / 1700 x 100 = 108.8.</p>
            <p><strong>Finals example:</strong> finish 3rd and you play 2nd in a qualifying final. Win and you rest a week before a preliminary final. Lose and you still get a semi final.</p>
            <p className="text-xs text-muted-foreground">Match rules: <a className="underline" href="https://resources.afl.com.au/afl/document/2026/02/13/8676d880-481a-4211-a479-305f138ce8b6/Laws-of-Australian-Football-Final-13-February-2026-.pdf" target="_blank" rel="noopener noreferrer">2026 Laws</a> and <a className="underline" href="https://resources.afl.com.au/afl/document/2026/02/13/54c158af-15e9-483b-a195-62a0f4e33b11/AFL-Regulations-Final-11-February-2026-.pdf" target="_blank" rel="noopener noreferrer">2026 Regulations</a>.</p>
          </div>
        </RulesGate></div><p className="mt-1 text-xs text-muted-foreground">18 fictional clubs. 23 rounds, the finals, then the draft.</p></header>
      {board === 'legacy' ? <>
        <div className="mb-3 rounded-2xl border border-border bg-card p-3 text-sm" data-arm-legacy>
          <p>This is the old ten round league. Finish it, or start the full season (replaces it).</p>
          {leaving ? <div className="mt-2 flex gap-2"><button className="min-h-11 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm font-semibold" onClick={() => setLeaving(false)}>Keep playing</button>
            <button className="min-h-11 flex-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground" data-arm-leave onClick={() => setBoard('menu')}>Choose a club</button></div>
            : <button className="mt-2 min-h-11 rounded-lg border border-border bg-secondary px-3 text-sm font-semibold" data-arm-fullseason onClick={() => setLeaving(true)}>Start the full season</button>}
        </div>
        <AussieRulesManagerBoard onReset={() => setBoard('menu')} />
      </> : <AussieRulesLeagueBoard />}
      <GameSeoContent pageHasOwnH1 title="Aussie Rules Manager: A Full Fictional Australian Rules Season" description="Choose one of 18 fictional clubs, pick your 23, play 23 rounds and the 2026 style finals, then age your list and draft into the next season." /><GameNav />
    </main></div></>;
}
