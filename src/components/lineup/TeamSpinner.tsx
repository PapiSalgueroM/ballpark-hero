import { useState, useEffect } from 'react';
import type { TeamAssignment } from '@/types/lineupBuilder';

interface TeamSpinnerProps {
  teams: TeamAssignment[];
  targetIndex: number;
  isSpinning: boolean;
  onFinish: () => void;
}

// Country code map for flag emojis (ISO 3166-1 alpha-2)
const nationCodes: Record<string, string> = {
  Argentina: 'AR', France: 'FR', Brazil: 'BR', England: 'GB-ENG', Belgium: 'BE',
  Croatia: 'HR', Netherlands: 'NL', Portugal: 'PT', Spain: 'ES', Italy: 'IT',
  Germany: 'DE', Uruguay: 'UY', Colombia: 'CO', USA: 'US', Mexico: 'MX',
  Senegal: 'SN', Japan: 'JP', 'South Korea': 'KR', Nigeria: 'NG', Denmark: 'DK',
  Switzerland: 'CH', Morocco: 'MA', Serbia: 'RS', Poland: 'PL', Cameroon: 'CM',
};

function getFlagUrl(nationName: string): string {
  const code = nationCodes[nationName];
  if (!code) return '';
  // Use flagcdn for regular codes, special handling for England
  if (code === 'GB-ENG') {
    return 'https://flagcdn.com/w80/gb-eng.png';
  }
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
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
    const totalDuration = 2000;
    let frame: number;

    const tick = () => {
      elapsed += speed;

      if (elapsed >= totalDuration) {
        setSettled(true);
        onFinish();
        return;
      }

      setDisplayIndex((prev) => (prev + 1) % allDisplayTeams.length);

      const progress = elapsed / totalDuration;
      const newSpeed = 60 + progress * 300;
      setSpeed(newSpeed);

      frame = window.setTimeout(tick, newSpeed);
    };

    frame = window.setTimeout(tick, speed);

    return () => clearTimeout(frame);
  }, [isSpinning]);

  const target = teams[targetIndex];
  const displayName = settled ? target?.name : allDisplayTeams[displayIndex];
  const displayIsNation = settled ? target?.isNation : displayIndex > 9;

  // Get the visual (flag only; club crests are not used to avoid trademarked logos)
  const logoUrl = settled && target && target.isNation
    ? getFlagUrl(target.name)
    : '';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-lg">
      <div className="flex items-center gap-4">
        {/* Logo / Flag area */}
        <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
          {settled && logoUrl ? (
            <img
              src={logoUrl}
              alt={displayName || ''}
              className="w-10 h-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="text-2xl">
              {settled ? (displayIsNation ? '🏳️' : '🏟️') : '⚽'}
            </span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
            {settled ? (displayIsNation ? '🏳️ Nation' : '🏟️ Club') : 'Spinning...'}
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
              Name a player who has played for {target.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamSpinner;
