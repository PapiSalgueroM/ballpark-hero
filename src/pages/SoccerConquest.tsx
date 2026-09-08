import { useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GameHelp } from '@/components/game/GameHelp';
import ImperialismBoardShared from '@/components/conquest/ImperialismBoardShared';
import SoccerAttackBoard from '@/components/conquest/SoccerAttackBoard';
import { GameNav } from '@/components/game/GameNav';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { SOCCER_CONQUEST_GAME, SOCCER_CONQUEST_MAP, SOCCER_IMPERIALISM, SOCCER_REGULAR_ROUNDS } from '@/data/soccerConquest';
import { makeSoccerAttackSetup } from '@/data/soccerAttack';
import { hasUnfinishedDaily } from '@/lib/conquestDaily';
import { loadAttackSave } from '@/lib/conquestAttackSave';

type SoccerConquestMode = 'season' | 'attack';

function initialMode(): SoccerConquestMode {
  if (hasUnfinishedDaily('soccer')) return 'season';
  const attack = loadAttackSave(makeSoccerAttackSetup(0).dataVersion);
  return attack.kind === 'saved' && attack.state.phase !== 'finished' ? 'attack' : 'season';
}

const SoccerConquest = () => {
  const [mode, setMode] = useState<SoccerConquestMode>(initialMode);
  return (
    <>
      <PageSeo
        title="Soccer Conquest - Top Five Leagues Imperialism Map Game | DoUKnowBall"
        description="The imperialism map format for football. 96 clubs from the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1 on one map of Europe: winners annex whole empires until one club rules the continent."
        path={SOCCER_CONQUEST_GAME.path}
      />
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        {mode === 'season' && <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>}
        <main id="dukb-main" className={`container mx-auto px-4 py-6 pb-20 ${mode === 'attack' ? 'max-w-6xl' : 'max-w-2xl'}`}>
          <div className="text-center mb-4">
            <h1 className="text-2xl font-display font-bold text-primary">Soccer Conquest</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === 'attack'
                ? 'Spin a club and a legal direction across the generated English map. Claim neutral land, play the club in your path, and keep going until one club rules England.'
                : 'The imperialism map across the top five leagues: winners take entire empires, the wiped-out fight back, and one club ends up ruling Europe.'}
            </p>
          </div>
          <div className="mb-5 flex items-center justify-center gap-2" aria-label="Soccer Conquest mode">
            <button
              type="button"
              aria-pressed={mode === 'season'}
              onClick={() => setMode('season')}
              className={`min-h-[38px] rounded-full border px-4 py-2 text-sm font-bold ${mode === 'season' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
            >
              Daily Season
            </button>
            <button
              type="button"
              aria-pressed={mode === 'attack'}
              onClick={() => setMode('attack')}
              className={`min-h-[38px] rounded-full border px-4 py-2 text-sm font-bold ${mode === 'attack' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground'}`}
            >
              Attack
            </button>
          </div>
          {mode === 'season' ? (
            <ImperialismBoardShared sport={SOCCER_IMPERIALISM} map={SOCCER_CONQUEST_MAP} game={SOCCER_CONQUEST_GAME} />
          ) : (
            <SoccerAttackBoard />
          )}
          <div className="mx-auto max-w-2xl">
            <GameSeoContent
              pageHasOwnH1
              title="Soccer Conquest: Top Five Leagues Imperialism Game"
              description="The classic imperialism map format for football. All 96 clubs of the 2026-27 Premier League, La Liga, Serie A, Bundesliga and Ligue 1 start with their home region on a map of Europe, winners annex the loser's entire empire, wiped-out clubs can storm back with one win, and a territory-seeded playoff crowns the ruler of the continent. Club strength comes from real squad market values."
              howToPlay={[
                `Pick your club from all 96, call its game each matchday, then watch all 48 results redraw the map. Winners take EVERYTHING the loser owned.`,
                'Wiped off the map? Keep playing. One win takes a whole empire back.',
                `After ${SOCCER_REGULAR_ROUNDS} matchdays the top 8 empires enter the playoffs: Quarter-finals, Semi-finals, then the Imperial Final.`,
                'Level games go to penalties. No draws, ever.',
              ]}
              examples={[
                'Real Madrid open with the biggest squad value in Europe and the strongest empire',
                'Le Mans, back in Ligue 1 after sixteen years, start as the longest shot on the map',
                'Six London clubs start shoulder to shoulder on the same six hexes',
                'Cagliari hold Sardinia, an island nobody can march to',
                'Strasbourg and Freiburg face each other across the Rhine',
              ]}
            />
            <GameNav />
          </div>
        </main>
      </div>
    </>
  );
};

export default SoccerConquest;
