import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PostGameStatsProps {
  gameSlug: string;
  userScore: number;
  isVisible: boolean;
}

const BUCKETS = [
  { label: '900–1000', min: 900, max: 1000 },
  { label: '700–899', min: 700, max: 899 },
  { label: '500–699', min: 500, max: 699 },
  { label: '300–499', min: 300, max: 499 },
  { label: '0–299', min: 0, max: 299 },
];

const PostGameStats = ({ gameSlug, userScore, isVisible }: PostGameStatsProps) => {
  const [bucketCounts, setBucketCounts] = useState<number[]>([0, 0, 0, 0, 0]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const today = new Date().toISOString().split('T')[0];

    const fetchScores = async () => {
      const { data } = await supabase
        .from('user_game_scores')
        .select('score')
        .eq('game_type', gameSlug)
        .eq('puzzle_date', today);

      if (!data?.length) return;
      const counts = BUCKETS.map(b => data.filter(r => r.score >= b.min && r.score <= b.max).length);
      setBucketCounts(counts);
      setTotalPlayers(data.length);
      requestAnimationFrame(() => setAnimate(true));
    };
    fetchScores();
  }, [isVisible, gameSlug]);

  if (!isVisible || totalPlayers === 0) return null;

  const maxCount = Math.max(...bucketCounts, 1);
  const belowUser = bucketCounts.reduce((sum, c, i) => (BUCKETS[i].max < userScore ? sum + c : sum), 0);
  const percentile = Math.round((belowUser / totalPlayers) * 100);
  const userBucketIdx = BUCKETS.findIndex(b => userScore >= b.min && userScore <= b.max);

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-4 w-full max-w-md mx-auto">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">
        📊 Score Distribution · {totalPlayers} players today
      </p>
      <div className="space-y-1.5">
        {BUCKETS.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className={`text-[11px] w-16 text-right font-mono ${i === userBucketIdx ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {b.label}
            </span>
            <div className="flex-1 h-5 bg-secondary/50 rounded overflow-hidden relative">
              <div
                className={`h-full rounded transition-all duration-[800ms] ease-out ${i === userBucketIdx ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                style={{ width: animate ? `${(bucketCounts[i] / maxCount) * 100}%` : '0%' }}
              />
              {bucketCounts[i] > 0 && (
                <span className="absolute right-1.5 top-0 h-full flex items-center text-[10px] text-muted-foreground">
                  {bucketCounts[i]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        You scored better than <span className="text-primary font-semibold">{percentile}%</span> of players today
      </p>
    </div>
  );
};

export default PostGameStats;
