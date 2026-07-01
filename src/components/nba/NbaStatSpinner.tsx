import { useState, useEffect } from 'react';
import type { StatChallenge } from '@/types/nba';
import { STAT_DISPLAY_NAMES } from '@/data/nbaStats';

interface NbaStatSpinnerProps {
  challenge: StatChallenge | null;
  isSpinning: boolean;
  onFinish: () => void;
}

const NbaStatSpinner = ({ challenge, isSpinning, onFinish }: NbaStatSpinnerProps) => {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [speed, setSpeed] = useState(60);
  const [settled, setSettled] = useState(!isSpinning);

  useEffect(() => {
    if (!isSpinning) {
      setSettled(true);
      return;
    }

    setSettled(false);
    setSpeed(60);

    let elapsed = 0;
    const totalDuration = 1200;
    let frame: number;

    const tick = () => {
      elapsed += speed;
      if (elapsed >= totalDuration) {
        setSettled(true);
        onFinish();
        return;
      }
      setDisplayIndex((prev) => (prev + 1) % STAT_DISPLAY_NAMES.length);
      const progress = elapsed / totalDuration;
      const newSpeed = 60 + progress * 300;
      setSpeed(newSpeed);
      frame = window.setTimeout(tick, newSpeed);
    };

    frame = window.setTimeout(tick, speed);
    return () => clearTimeout(frame);
  }, [isSpinning]);

  const directionLabel = challenge?.direction === 'highest' ? '⬆️ HIGHEST' : '⬇️ LOWEST';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-lg text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        {settled ? 'Your Challenge' : 'Spinning your challenge...'}
      </p>

      <div
        className={`text-2xl md:text-3xl font-bold font-display transition-all duration-100 ${
          settled ? 'text-foreground' : 'text-primary blur-[1px]'
        }`}
      >
        {settled && challenge
          ? `${challenge.emoji} ${challenge.stat}`
          : STAT_DISPLAY_NAMES[displayIndex]}
      </div>

      {settled && challenge && (
        <div className="mt-3 animate-fade-in space-y-2">
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
            challenge.direction === 'highest'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            Find the {directionLabel}
          </span>
          <p className="text-sm text-muted-foreground">
            Build a Starting 5 optimizing for the {challenge.direction} {challenge.stat.toLowerCase()} ({challenge.unit})
          </p>
        </div>
      )}
    </div>
  );
};

export default NbaStatSpinner;
