import { useState, useEffect } from 'react';
import type { NbaTeam } from '@/data/nbaTeams';
import { NBA_TEAMS } from '@/data/nbaTeams';

interface NbaTeamSpinnerProps {
  teams: NbaTeam[];
  targetIndex: number;
  isSpinning: boolean;
  onFinish: () => void;
}

const displayTeams = NBA_TEAMS.map(t => t.name);

const NbaTeamSpinner = ({ teams, targetIndex, isSpinning, onFinish }: NbaTeamSpinnerProps) => {
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
    const totalDuration = 1000;
    let frame: number;

    const tick = () => {
      elapsed += speed;
      if (elapsed >= totalDuration) {
        setSettled(true);
        onFinish();
        return;
      }
      setDisplayIndex((prev) => (prev + 1) % displayTeams.length);
      const progress = elapsed / totalDuration;
      const newSpeed = 60 + progress * 300;
      setSpeed(newSpeed);
      frame = window.setTimeout(tick, newSpeed);
    };

    frame = window.setTimeout(tick, speed);
    return () => clearTimeout(frame);
  }, [isSpinning]);

  const target = teams[targetIndex];
  const displayName = settled ? target?.name : displayTeams[displayIndex];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          <span className="text-2xl">🏀</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
            {settled ? '🏀 NBA Team' : 'Spinning...'}
          </p>
          <div
            className={`text-2xl md:text-3xl font-bold font-display transition-all duration-100 truncate ${
              settled ? 'text-foreground' : 'text-primary blur-[1px]'
            }`}
          >
            {displayName || '...'}
          </div>
          {settled && target && (
            <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in">
              Pick a player who has played for the {target.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NbaTeamSpinner;
