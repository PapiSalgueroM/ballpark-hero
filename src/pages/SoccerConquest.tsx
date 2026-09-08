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
        title="Soccer Conquest: Daily Season and England Attack | DoUKnowBall"
        description="Play two soccer map modes: a 96 club Daily Season across Europe's top five leagues, or unlimited England Attack with direction spins, captures and saved runs."
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
              title="Soccer Conquest: Daily Season and England Attack"
              description="Daily Season puts all 96 clubs from the 2026-27 Premier League, La Liga, Serie A, Bundesliga and Ligue 1 into a scored daily map season. England Attack is an unlimited, unranked last-club-standing run with a saved geographic map, direction spins, player captures and simulated rating upgrades."
              howToPlay={[
                `Daily Season: pick one of 96 clubs, call its game each matchday, then watch all 48 results redraw the map. Winners take everything the loser owned.`,
                `Daily Season: after ${SOCCER_REGULAR_ROUNDS} matchdays the top 8 empires enter the playoffs. Wiped-out clubs can still take an empire back.`,
                'England Attack: spin a living club and a legal direction. Claim neutral land or play the first club reached by the ray.',
                'England Attack: winners take the eliminated club\'s land and captured players. The run saves after every move, stays unlimited and awards no ranked points.',
              ]}
              examples={[
                'Daily Season example: call your club\'s result, watch the whole matchday resolve, then protect enough regions to reach the top 8',
                'England Attack example: fictional Amber Vale spins east, claims neutral land and gives its best player a simulated two-point upgrade',
                'England Attack example: hit another club, play the simulated match, then the winner takes the loser\'s regions and captured players',
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
