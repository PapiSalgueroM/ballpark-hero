/**
 * Round 287: the ticker with its scores attached.
 *
 * TopTicker is kept pure (simTicker bundles it into node and runs its lines
 * against hostile saves), so the network lives here: this reads the scores
 * table through useLiveScores and hands the rows down as a prop. App.tsx
 * mounts this and not TopTicker directly. Round 711 hands down how the read
 * went and the server's clock too, so the strip can say when it last heard
 * from the feed and whether that is too long ago.
 */
import { TopTicker } from '@/components/layout/TopTicker';
import { useLiveScores } from '@/hooks/useLiveScores';

export function LiveTicker() {
  const { rows, status, checkedAt } = useLiveScores();
  return <TopTicker scores={rows} status={status} checkedAt={checkedAt} />;
}

export default LiveTicker;
