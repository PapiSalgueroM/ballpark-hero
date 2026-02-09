import { useState, useEffect } from 'react';
import type { TeamAssignment } from '@/types/lineupBuilder';

interface TeamSpinnerProps {
  teams: TeamAssignment[];
  targetIndex: number;
  isSpinning: boolean;
  onFinish: () => void;
}

const allDisplayTeams = [
  'Real Madrid', 'Barcelona', 'Man City', 'Liverpool', 'Bayern',
  'PSG', 'Chelsea', 'Arsenal', 'Man Utd', 'Juventus',
  'Argentina', 'France', 'Brazil', 'England', 'Spain',
  'Germany', 'Portugal', 'Netherlands', 'Italy', 'Belgium',
  'AC Milan', 'Inter', 'Dortmund', 'Napoli', 'Atlético',
  'Morocco', 'Uruguay', 'Croatia', 'Colombia', 'Senegal',
];

const TeamSpinner = ({ teams, targetIndex, isSpinning, onFinish }: TeamSpinnerProps) => {
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
    const totalDuration = 2000; // 2 seconds spin
    let frame: number;

    const tick = () => {
      elapsed += speed;

      if (elapsed >= totalDuration) {
        setSettled(true);
        onFinish();
        return;
      }

      setDisplayIndex((prev) => (prev + 1) % allDisplayTeams.length);

      // Slow down gradually
      const progress = elapsed / totalDuration;
      const newSpeed = 60 + progress * 300; // starts fast, slows down
      setSpeed(newSpeed);

      frame = window.setTimeout(tick, newSpeed);
    };

    frame = window.setTimeout(tick, speed);

    return () => clearTimeout(frame);
  }, [isSpinning]);

  const target = teams[targetIndex];
  const displayName = settled ? target?.name : allDisplayTeams[displayIndex];
  const displayIsNation = settled ? target?.isNation : displayIndex > 9;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
        {settled ? (displayIsNation ? '🏳️ Nation' : '🏟️ Club') : 'Spinning...'}
      </p>
      <div
        className={`text-3xl font-bold font-display transition-all duration-100 ${
          settled ? 'text-foreground' : 'text-primary blur-[1px]'
        }`}
      >
        {displayName || '...'}
      </div>
      {settled && target && (
        <p className="text-xs text-muted-foreground mt-2 animate-fade-in">
          Name a player who has played for {target.name}
        </p>
      )}
    </div>
  );
};

export default TeamSpinner;
