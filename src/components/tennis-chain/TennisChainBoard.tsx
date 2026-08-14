import { useState, useEffect } from 'react';
import { useTennisChain } from '@/hooks/useTennisChain';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { TennisChainSearch } from './TennisChainSearch';
import { TennisChainTimeline } from './TennisChainTimeline';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/game/ShareButtons';
import { getTennisChainMultiplier } from '@/types/tennisChain';
import { supabase } from '@/integrations/supabase/client';
import { GameNav } from '@/components/game/GameNav';
import { Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  nickname: string;
  chain_length: number;
  score: number;
}

export function TennisChainBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, validating } = useTennisChain();
  const gameRef = useScrollToGame(gameState);
  const [nickname, setNickname] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('tennis_chain_scores')
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

    const { error } = await supabase.from('tennis_chain_scores').insert({
      nickname: nickname.trim(),
      score: gameState.score,
      chain_length: chainLength,
      mode: gameState.mode,
    });

    if (!error) {
      const { count } = await supabase
        .from('tennis_chain_scores')
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

  // Mode selection
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">🎾 Tennis Chain</h1>
            <p className="text-gray-300 max-w-md mx-auto">
              Name a player who beat the current player at a Grand Slam to extend your chain!
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <button
              onClick={() => startGame('daily')}
              className="w-full p-6 rounded-xl border-2 border-emerald-600 bg-emerald-900/20 hover:bg-emerald-900/40 transition-all text-left"
            >
              <div className="text-lg font-bold text-emerald-400">🗓️ Daily Challenge</div>
              <p className="text-sm text-gray-400 mt-1">Same starting player for everyone today</p>
            </button>
            <button
              onClick={() => startGame('unlimited')}
              className="w-full p-6 rounded-xl border-2 border-purple-600 bg-purple-900/20 hover:bg-purple-900/40 transition-all text-left"
            >
              <div className="text-lg font-bold text-purple-400">🔄 Unlimited</div>
              <p className="text-sm text-gray-400 mt-1">Random starting player, play as many times as you like</p>
            </button>
          </div>

          <GameNav />
        </div>
      </div>
    );
  }

  const chainLength = gameState.chain.length - 1;
  const multiplier = getTennisChainMultiplier(chainLength);

  return (
    <div ref={gameRef} className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-emerald-400 mb-2">🎾 Tennis Chain</h1>
          <p className="text-sm text-gray-400">
            {gameState.mode === 'daily' ? '🗓️ Daily Challenge' : '🔄 Unlimited'}
          </p>
        </div>

        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-emerald-400">Score: {gameState.score}</div>
          {multiplier > 1 && (
            <div className="text-sm text-purple-400">x{multiplier} Chain Bonus Active!</div>
          )}
        </div>

        <TennisChainTimeline chain={gameState.chain} gameStatus={gameState.gameStatus} />

        {gameState.gameStatus === 'playing' ? (
          <>
            <div className="text-center mb-8">
              <div className="bg-gray-900 rounded-xl p-6 border border-emerald-600 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-emerald-400 mb-2">Current Player</h2>
                <div className="text-2xl font-bold text-white mb-2">{gameState.currentPlayer}</div>
                <p className="text-gray-400 text-sm">Who beat this player at a Grand Slam?</p>
              </div>
            </div>

            <div className="mb-8">
              {validating ? (
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <TennisChainSearch
                  usedPlayers={gameState.usedPlayers}
                  onSelect={(name) => makeGuess(name)}
                  disabled={validating}
                />
              )}
            </div>

            <div className="text-center">
              <Button
                onClick={giveUp}
                variant="outline"
                className="bg-transparent border-purple-600 text-purple-400 hover:bg-purple-900/30"
              >
                Give Up
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-gray-900 rounded-xl p-8 border border-emerald-600 max-w-lg mx-auto mb-6">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">Game Over!</h2>
              <p className="text-gray-300 mb-4">{gameState.gameOverReason}</p>

              {gameState.earnedBadge && (
                <div className="mb-6 p-4 bg-gradient-to-r from-emerald-900/50 to-purple-900/50 rounded-lg border border-purple-600">
                  <div className="text-3xl mb-2">{gameState.earnedBadge.emoji}</div>
                  <div className="text-xl font-bold text-purple-400">{gameState.earnedBadge.name}</div>
                  <div className="text-sm text-gray-400">Chain of {chainLength}!</div>
                </div>
              )}

              <div className="text-xl text-emerald-400 font-bold mb-2">Final Score: {gameState.score}</div>
              {multiplier > 1 && (
                <div className="text-sm text-purple-400 mb-4">Includes x{multiplier} chain bonus!</div>
              )}
              <div className="text-lg text-emerald-300 mb-6">Chain Length: {chainLength}</div>

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
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    <Button
                      onClick={handleSaveScore}
                      disabled={!nickname.trim() || saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {saving ? '...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                playerRank && (
                  <div className="mb-6 text-purple-400 font-bold text-lg">You ranked #{playerRank} today!</div>
                )
              )}

              {leaderboard.length > 0 && (
                <div className="mb-6 text-left">
                  <h3 className="text-lg font-bold text-emerald-400 mb-3 text-center">🏆 Today's Top 10</h3>
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-xs text-gray-400 font-semibold border-b border-gray-700">
                      <div>#</div><div>Nickname</div><div className="text-right">Chain</div><div className="text-right">Score</div>
                    </div>
                    {leaderboard.map((entry, i) => (
                      <div key={i} className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-sm border-b border-gray-700/50 last:border-0">
                        <div className="text-gray-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</div>
                        <div className="text-white truncate">{entry.nickname}</div>
                        <div className="text-right text-gray-300">{entry.chain_length}</div>
                        <div className="text-right text-emerald-400">{entry.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Button onClick={handleReset} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  Play Again
                </Button>
                <ShareButtons
                  score={`${gameState.score} points • Chain of ${chainLength}${gameState.earnedBadge ? ` • ${gameState.earnedBadge.emoji} ${gameState.earnedBadge.name}` : ''}`}
                  gameName="Tennis Chain"
                  gamePath="/tennis-chain"
                />
              </div>
            </div>
          </div>
        )}

        <GameNav />
      </div>
    </div>
  );
}
