import { useState, useEffect } from 'react';
import { useNascarChain } from '@/hooks/useNascarChain';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { NascarChainSearch } from './NascarChainSearch';
import { NascarChainTimeline } from './NascarChainTimeline';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/game/ShareButtons';
import { getNascarChainMultiplier } from '@/types/nascarChain';
import { supabase } from '@/integrations/supabase/client';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { Loader2 } from 'lucide-react';

interface LeaderboardEntry {
  nickname: string;
  chain_length: number;
  score: number;
}

export function NascarChainBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, validating } = useNascarChain();
  const gameRef = useScrollToGame(gameState);
  const [nickname, setNickname] = useState('');
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('nascar_chain_scores')
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

    const { error } = await supabase.from('nascar_chain_scores').insert({
      nickname: nickname.trim(),
      score: gameState.score,
      chain_length: chainLength,
      mode: gameState.mode,
    });

    if (!error) {
      const { count } = await supabase
        .from('nascar_chain_scores')
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

  if (!gameState) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-neutral-300">🏁</span>{' '}
              <span className="text-red-500">NASCAR Chain</span>
            </h1>
            <p className="text-neutral-400 max-w-md mx-auto">
              Name a driver who beat the current champion to the Cup Series title to extend your chain!
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <button
              onClick={() => startGame('daily')}
              className="w-full p-6 rounded-xl border-2 border-red-600 bg-red-900/20 hover:bg-red-900/40 transition-all text-left"
            >
              <div className="text-lg font-bold text-red-400">🗓️ Daily Challenge</div>
              <p className="text-sm text-neutral-500 mt-1">Same starting driver for everyone today</p>
            </button>
            <button
              onClick={() => startGame('unlimited')}
              className="w-full p-6 rounded-xl border-2 border-neutral-600 bg-neutral-900/20 hover:bg-neutral-900/40 transition-all text-left"
            >
              <div className="text-lg font-bold text-neutral-300">🔄 Unlimited</div>
              <p className="text-sm text-neutral-500 mt-1">Random starting driver, play as many times as you like</p>
            </button>
          </div>

          <GameNav />
          <Footer />
        </div>
      </div>
    );
  }

  const chainLength = gameState.chain.length - 1;
  const multiplier = getNascarChainMultiplier(chainLength);

  const shareScore = `I built a NASCAR Chain of ${chainLength} champions!\nScore: ${gameState.score} 🏁`;

  return (
    <div ref={gameRef} className="min-h-screen bg-neutral-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-red-500 mb-2">🏁 NASCAR Chain</h1>
          <p className="text-sm text-neutral-500">
            {gameState.mode === 'daily' ? '🗓️ Daily Challenge' : '🔄 Unlimited'}
          </p>
        </div>

        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-red-400">Score: {gameState.score}</div>
          {multiplier > 1 && (
            <div className="text-sm text-red-300">x{multiplier} Chain Bonus Active!</div>
          )}
        </div>

        <NascarChainTimeline chain={gameState.chain} gameStatus={gameState.gameStatus} />

        {gameState.gameStatus === 'playing' ? (
          <>
            <div className="text-center mb-8">
              <div className="bg-neutral-900 rounded-xl p-6 border border-red-600 max-w-md mx-auto">
                <h2 className="text-xl font-bold text-red-400 mb-2">Current Champion</h2>
                <div className="text-2xl font-bold text-white mb-2">{gameState.currentDriver}</div>
                <p className="text-neutral-500 text-sm">Who beat this driver to the Cup Series title?</p>
              </div>
            </div>

            <div className="mb-8">
              {validating ? (
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </div>
              ) : (
                <NascarChainSearch
                  usedDrivers={gameState.usedDrivers}
                  onSelect={(name) => makeGuess(name)}
                  disabled={validating}
                />
              )}
            </div>

            <div className="text-center">
              <Button
                onClick={giveUp}
                variant="outline"
                className="bg-transparent border-neutral-600 text-neutral-400 hover:bg-neutral-900/30"
              >
                Give Up
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-neutral-900 rounded-xl p-8 border border-red-600 max-w-lg mx-auto mb-6">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Game Over!</h2>
              <p className="text-neutral-300 mb-4">{gameState.gameOverReason}</p>

              {gameState.earnedBadge && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-900/50 to-neutral-900/50 rounded-lg border border-red-600">
                  <div className="text-3xl mb-2">{gameState.earnedBadge.emoji}</div>
                  <div className="text-xl font-bold text-red-400">{gameState.earnedBadge.name}</div>
                  <div className="text-sm text-neutral-400">Chain of {chainLength}!</div>
                </div>
              )}

              <div className="text-xl text-red-400 font-bold mb-2">Final Score: {gameState.score}</div>
              {multiplier > 1 && (
                <div className="text-sm text-red-300 mb-4">Includes x{multiplier} chain bonus!</div>
              )}
              <div className="text-lg text-neutral-300 mb-6">Chain Length: {chainLength}</div>

              {!scoreSubmitted ? (
                <div className="mb-6">
                  <p className="text-neutral-500 mb-2">Enter your nickname to save your score</p>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Nickname"
                      maxLength={30}
                      className="flex-1 min-w-0 bg-neutral-800 border border-neutral-600 rounded-md px-3 py-2 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
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
                  <div className="mb-6 text-red-400 font-bold text-lg">You ranked #{playerRank} today!</div>
                )
              )}

              {leaderboard.length > 0 && (
                <div className="mb-6 text-left">
                  <h3 className="text-lg font-bold text-red-400 mb-3 text-center">🏆 Today's Top 10</h3>
                  <div className="bg-neutral-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-xs text-neutral-500 font-semibold border-b border-neutral-700">
                      <div>#</div><div>Nickname</div><div className="text-right">Chain</div><div className="text-right">Score</div>
                    </div>
                    {leaderboard.map((entry, i) => (
                      <div key={i} className="grid grid-cols-[40px_1fr_80px_80px] gap-1 p-2 text-sm border-b border-neutral-700/50 last:border-0">
                        <div className="text-neutral-400">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</div>
                        <div className="text-white truncate">{entry.nickname}</div>
                        <div className="text-right text-neutral-300">{entry.chain_length}</div>
                        <div className="text-right text-red-400">{entry.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Button onClick={handleReset} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Play Again
                </Button>
                <ShareButtons
                  score={shareScore}
                  gameName="NASCAR Chain"
                  gamePath="/nascar-chain"
                />
              </div>
            </div>
          </div>
        )}

        <GameNav />
        <Footer />
      </div>
    </div>
  );
}
