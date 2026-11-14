import { lazy, Suspense, useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import { nbaHallHelpRules } from '@/lib/nbaCareerHallRules';
import { nbaAwardHelpRules } from '@/lib/nbaCareerAwards';
import { US_BANK_HELP_RULE } from '@/lib/usCareerBank';
import { US_COACH_RETIRE_HELP_RULE } from '@/lib/usCoachRetirement';
import { US_DIRTY_MONEY_HELP_RULE } from '@/lib/careerDirtyMoney';
import { US_SHOP_HELP_RULE } from '@/lib/usCareerAnnualBenefits';
import { nbaIntlHelpRules } from '@/lib/nbaCareerIntlRules';
import UsCareerCreator, { emptyUsCareerDraft } from '@/components/us-career/UsCareerCreator';
import type { UsCareerStart } from '@/components/us-career/UsCareerBoard';
import { NBA_CAREER_CREATE, NBA_CAREER_SAVE_KEY } from '@/lib/nbaCareerCreation';
import { hallWallKey } from '@/lib/usCareerHallWallKey';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const loadBoard = () => import('@/components/nba-my-career/NbaMyCareerBoard');
const SavedBoard = lazy(loadBoard);

function NbaCareerEntry() {
  const [saved] = useState(() => {
    try { return !!(localStorage.getItem(NBA_CAREER_SAVE_KEY) || localStorage.getItem(hallWallKey('nba'))); }
    catch { return false; }
  });
  const [draft, setDraft] = useState(() => emptyUsCareerDraft(NBA_CAREER_CREATE));
  const [opened, setOpened] = useState<{ Board: Awaited<ReturnType<typeof loadBoard>>['default']; entry: UsCareerStart } | null>(null);
  const loading = useRef(false);
  const [status, setStatus] = useState<'loading' | 'error' | null>(null);

  if (saved) return <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Opening your career…</p>}><SavedBoard /></Suspense>;
  if (opened) return <opened.Board entry={opened.entry} />;

  const start = (mode: UsCareerStart['mode']) => {
    if (loading.current) return;
    loading.current = true;
    setStatus('loading');
    loadBoard().then(({ default: Board }) => {
      setOpened({ Board, entry: { draft, mode } });
    }).catch(() => {
      loading.current = false;
      setStatus('error');
    });
  };

  return <UsCareerCreator sport="nba" create={NBA_CAREER_CREATE} draft={draft} setDraft={setDraft}
    onBeginProspect={() => start('prospect')} onEnterDraft={() => start('draft')}
    pending={status === 'loading'}
    draftStatus={status === 'loading' ? 'Opening the draft…' : status === 'error' ? 'The draft could not load. Try again.' : undefined} />;
}

const NbaMyCareer = () => {
  return (
    <>
      <PageSeo
        title="NBA My Career: A Basketball Player Simulator | DoUKnowBall"
        description="Build a prospect in this free NBA career sim. Fight for a starting spot, weigh trades and contracts, and play from draft night to retirement."
        path="/nba-my-career"
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp firstVisit extraRules={[...nbaAwardHelpRules(), ...nbaHallHelpRules(), US_BANK_HELP_RULE, US_COACH_RETIRE_HELP_RULE, US_DIRTY_MONEY_HELP_RULE, US_SHOP_HELP_RULE, ...nbaIntlHelpRules(), 'New 2003-04 throwback careers get the real 2004 draft class after the 2003 season. A draft selection is not an NBA debut. Camp teams, comparisons and results are simulated.']} className="inline-flex min-h-11 min-w-11 items-center justify-center" /></div>
        <main id="dukb-main" tabIndex={-1} className="container max-w-2xl mx-auto px-4 py-6 pb-20">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">NBA My Career</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Draft night to jersey retirement. Every summer bends the career.
            </p>
          </div>
          <NbaCareerEntry />
          <GameSeoContent
          pageHasOwnH1
            title="NBA My Career: the Player Life Sim"
            description="Build a fictional prospect and live a full NBA career inside the real league. Your position and archetype drive realistic per-game lines, and every summer brings big decisions: hometown discount or the max somewhere new, surgery or load management, the podcast or the gym, even a call from the national team. Chase rings, MVPs, Finals MVPs and All-NBA nods, fight Father Time, and retire to a verdict that runs from ten-day contracts to the GOAT debate."
            howToPlay={[
              'Create your player: name, one of 5 positions (PG, SG, SF, PF, C) and archetype, from Point God to Paint Beast.',
              'Pick your league first: today\'s NBA, or the 2003-04 throwback with the SuperSonics in Seattle and no Charlotte yet.',
              'Play each season for a per-game stat line driven by your rating, role, health and team quality: points, rebounds and assists, with your minutes, steals and blocks on the season card.',
              'Your overall can rise or fall during the season. The sim rolls the full season in one go, then the result and Career Log show how your rating changed.',
              'Up to three cards land every summer, one at a time: contracts, trade demands, surgeries, brand building. A card you just saw rests for a while (press moments follow your season, so those can come right back). A big season in an Olympic or World Cup summer brings a call from the national team first.',
              'Open the Bank when you like: savings that pays 2.5% a season, a market of five moving prices, a statement, the card school on the team plane and the shop.',
              'The News box carries the paper, your SocialGram and your draft class rival\'s card. The Trophy Case holds 26 badges, lit off the facts of your career.',
              'Rings, MVPs, Finals MVPs and All-NBA years stack your legacy. All-Star nods and Rookie of the Year go on your record and light a badge in the Trophy Case.',
              'From 31, a falling rating brings the retirement talk: stop, one more year, or a farewell season. Then the verdict and the Hall of Fame wait. The GOAT debate tier is real and it is brutal to reach.',
            ]}
            examples={[
              'A Point God who wins back-to-back MVPs and never gets the ring',
              'A Paint Beast who dominates for six years and falls apart at 31',
              'Taking the discount to finally win one at 36',
              'Demanding out of a rebuild and becoming a villain everywhere',
            ]}
          />
          <GameNav />
        </main>
      </div>
    </>
  );
};

export default NbaMyCareer;
