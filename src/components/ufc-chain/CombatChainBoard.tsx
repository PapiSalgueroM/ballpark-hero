import { useState, useEffect } from 'react';
import { useUfcChain } from '@/hooks/useUfcChain';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { UfcChainSearch } from './UfcChainSearch';
import { ChainTimeline } from './ChainTimeline';
import { ModeSelector } from './ModeSelector';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/game/ShareButtons';
import { getChainLengthMultiplier } from '@/types/ufcChain';
import { supabase } from '@/integrations/supabase/client';
import { GameNav } from '@/components/game/GameNav';

interface LeaderboardEntry {
  nickname: string;
  chain_length: number;
  score: number;
}

export function CombatChainBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, getAvailableFighters } = useUfcChain();
  const gameRef = useScrollToGame(gameState);
  const [nickname, setNickname] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('ufc_chain_scores')
      .select('nickname, chain_length, score')
      .order('chain_length', { ascending: false })
      .order('score', { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  };

  useEffect(() => {
    if (gameState?.gameStatus === 'ended') {
      setScoreSubmitted(false);
      setPlayerRank(null);
      setNickname('');
      fetchLeaderboard();
    }
  }, [gameState?.gameStatus]);

  const handleSaveScore = async () => {
    if (!gameState || !nickname.trim() || saving) return;
    setSaving(true);
    const chainLength = gameState.chain.length - 1;

    const { error } = await supabase.from('ufc_chain_scores').insert({
      nickname: nickname.trim(),
      score: gameState.score,
      chain_length: chainLength,
      mode: gameState.mode,
    });

    if (!error) {
      const { count } = await supabase
        .from('ufc_chain_scores')
        .select('*', { count: 'exact', head: true })
        .gt('chain_length', chainLength);
      setPlayerRank((count ?? 0) + 1);
      setScoreSubmitted(true);
      fetchLeaderboard();
    }
    setSaving(false);
  };

  const handleReset = () => {
    setScoreSubmitted(false);
    setPlayerRank(null);
    setNickname('');
    setLeaderboard([]);
    resetGame();
  };

  const handleFighterSelect = (fighter: { name: string }) => {
    makeGuess(fighter.name);
  };

  // Mode selection screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-red-500 mb-2">🥊 Combat Chain</h1>
            <p className="text-gray-300">Name a fighter who defeated the current fighter to extend your chain!</p>
          </div>
          <ModeSelector onSelectMode={startGame} />
        </div>
      </div>
    );
  }

  const chainLength = gameState.chain.length - 1;
  const multiplier = getChainLengthMultiplier(chainLength);
  const availableFighters = getAvailableFighters();

  const getModeLabel = () => {
    switch (gameState.mode) {
      case 'daily': return '🗓️ Daily Mode';
      case 'unlimited': return '🔄 Unlimited';
      case 'hall-of-fame': return '🏆 Hall of Fame';
      case 'weight-class': return `⚖️ ${gameState.selectedWeightClass}`;
      default: return '';
    }
  };

  return (
    <div ref={gameRef} className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-red-500 mb-2">🥊 Combat Chain</h1>
          <p className="text-sm text-gray-400">{getModeLabel()}</p>
        </div>

        {/* Score with multiplier indicator */}
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-red-400">Score: {gameState.score}</div>
          {multiplier > 1 && (
            <div className="text-sm text-green-400">
              x{multiplier} Chain Bonus Active!
            </div>
          )}
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
                  {gameState.currentFighter.isHallOfFamer && (
                    <span className="ml-2 text-yellow-400 text-sm">⭐ HOF</span>
                  )}
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
                fighters={availableFighters}
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
              
              {/* Badge Display */}
              {gameState.earnedBadge && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-900/50 to-yellow-900/50 rounded-lg border border-yellow-600">
                  <div className="text-3xl mb-2">{gameState.earnedBadge.emoji}</div>
                  <div className="text-xl font-bold text-yellow-400">
                    {gameState.earnedBadge.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    Chain of {chainLength}!
                  </div>
                </div>
              )}
              
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

              <div className="text-xl text-red-400 font-bold mb-2">
                Final Score: {gameState.score}
              </div>
              
              {multiplier > 1 && (
                <div className="text-sm text-green-400 mb-4">
                  Includes x{multiplier} chain bonus!
                </div>
              )}

              <div className="text-lg text-red-300 mb-6">
                Chain Length: {chainLength}
              </div>

              {/* Nickname & Save */}
              {!scoreSubmitted ? (
                <div className="mb-6">
                  <p className="text-gray-400 mb-2">Enter your nickname to save your score</p>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Nickname"
                      maxLength={30}
                      className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500"
                    />
                    <Button
                      onClick={handleSaveScore}
                      disabled={!nickname.trim() || saving}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {saving ? '...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                playerRank && (
                  <div className="mb-6 text-green-400 font-bold text-lg">
                    You ranked #{playerRank} today!
                  </div>
                )
              )}

              {/* Leaderboard */}
              {leaderboard.length > 0 && (
                <div className="mb-6 text-left">
                  <h3 className="text-lg font-bold text-red-400 mb-3 text-center">🏆 Today's Top 10</h3>
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-xs text-gray-400 font-semibold border-b border-gray-700">
                      <div>#</div>
                      <div>Nickname</div>
                      <div className="text-right">Chain</div>
                      <div className="text-right">Score</div>
                    </div>
                    {leaderboard.map((entry, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-sm border-b border-gray-700/50 last:border-0"
                      >
                        <div className="text-gray-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</div>
                        <div className="text-white truncate">{entry.nickname}</div>
                        <div className="text-right text-gray-300">{entry.chain_length}</div>
                        <div className="text-right text-red-400">{entry.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Button 
                  onClick={handleReset}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  Play Again
                </Button>
                
                <ShareButtons 
                  score={`${gameState.score} points • Chain of ${chainLength}${gameState.earnedBadge ? ` • ${gameState.earnedBadge.emoji} ${gameState.earnedBadge.name}` : ''}`}
                  gameName="Combat Chain"
                  gamePath="/ufc-chain"
                />
              </div>
            </div>
          </div>
        )}

        {/* Other Games Navigation */}
        <GameNav />
      </div>
    </div>
  );
}
