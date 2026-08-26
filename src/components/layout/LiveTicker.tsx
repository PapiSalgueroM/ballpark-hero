/**
 * Round 287: the ticker with its scores attached.
 *
 * TopTicker is kept pure (simTicker bundles it into node and runs its lines
 * against hostile saves), so the network lives here: this reads the scores
 * table through useLiveScores and hands the rows down as a prop. App.tsx
 * mounts this and not TopTicker directly.
 */
import { TopTicker } from '@/components/layout/TopTicker';
import { useLiveScores } from '@/hooks/useLiveScores';

export function LiveTicker() {
  const scores = useLiveScores();
  return <TopTicker scores={scores} />;
}

export default LiveTicker;
