import { useUfcChain } from '@/hooks/useUfcChain';
import { UfcChainSearch } from './UfcChainSearch';
import { ChainTimeline } from './ChainTimeline';
import { UFC_FIGHTERS, getFightersWhoBeat } from '@/data/ufcChainData';
import { Button } from '@/components/ui/button';
import { ShareButtons } from '@/components/game/ShareButtons';

export function CombatChainBoard() {
  const { gameState, makeGuess, giveUp, resetGame } = useUfcChain();

  const handleFighterSelect = (fighter: any) => {
    makeGuess(fighter.name);
  };

  const shareText = `I built a chain of ${gameState.chain.length - 1} fighters on DoUKnowBall Combat Chain! Score: ${gameState.score} 🥊`;
  const shareUrl = 'douknowball.com/ufc-chain';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-2">🥊 Combat Chain</h1>
          <p className="text-gray-300">Name a fighter who defeated the current fighter to extend your chain!</p>
        </div>

        {/* Score */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-red-400">Score: {gameState.score}</div>
        </div>

        {/* Chain Timeline */}
        <ChainTimeline chain={gameState.chain} gameStatus={gameState.gameStatus} />

        {gameState.gameStatus === 'playing' ? (
          <>
            {/* Current Fighter Display */}
            <div className="text-center mb-8">
              <div className="bg-gray-900 rounded-xl p-6 border border-red-600 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-red-400 mb-2">Current Fighter</h2>
                <div className="text-2xl font-bold text-white mb-2">
                  {gameState.currentFighter.name}
                </div>
                <div className="text-gray-300">
                  {gameState.currentFighter.weightClass} • {gameState.currentFighter.record}
                </div>
                {gameState.currentFighter.losses === 0 && (
                  <div className="mt-2 text-red-400 font-semibold">
                    ⚠️ This fighter has never lost - pick someone else!
                  </div>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="mb-8">
              <UfcChainSearch
                fighters={UFC_FIGHTERS}
                usedFighters={gameState.usedFighters}
                onSelect={handleFighterSelect}
                disabled={gameState.currentFighter.losses === 0}
              />
            </div>

            {/* Give Up Button */}
            <div className="text-center">
              <Button 
                onClick={giveUp}
                variant="outline"
                className="bg-transparent border-red-600 text-red-400 hover:bg-red-900/30"
              >
                Give Up
              </Button>
            </div>
          </>
        ) : (
          /* Game Over Screen */
          <div className="text-center">
            <div className="bg-gray-900 rounded-xl p-8 border border-red-600 max-w-lg mx-auto mb-6">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Game Over!</h2>
              <p className="text-gray-300 mb-4">{gameState.gameOverReason}</p>
              
              {gameState.correctAnswer && (
                <div className="mb-4">
                  <p className="text-gray-400 mb-2">Correct answer was:</p>
                  <div className="text-white font-bold">
                    {gameState.correctAnswer.name}
                  </div>
                  <div className="text-gray-300 text-sm">
                    {gameState.correctAnswer.weightClass} • {gameState.correctAnswer.record}
                  </div>
                </div>
              )}

              <div className="text-xl text-red-400 font-bold mb-4">
                Final Score: {gameState.score}
              </div>

              <div className="text-lg text-red-300 mb-6">
                Chain Length: {gameState.chain.length - 1}
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={resetGame}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Play Again
                </Button>
                
                <ShareButtons 
                  score={gameState.score}
                  text={shareText}
                  url={shareUrl}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}