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

// Club crest URLs via logo.clearbit.com or similar free CDN
const clubLogos: Record<string, string> = {
  'Real Madrid': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  'Barcelona': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  'Manchester City': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  'Liverpool': 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
  'Bayern Munich': 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
  'PSG': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  'Chelsea': 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg',
  'Arsenal': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  'Manchester United': 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
  'Juventus': 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Juventus_FC_-_pictogram.svg',
  'AC Milan': 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg',
  'Inter Milan': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
  'Borussia Dortmund': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg',
  'Atlético Madrid': 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
  'Tottenham': 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg',
  'Napoli': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg',
  'Benfica': 'https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg',
  'Porto': 'https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg',
  'Ajax': 'https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg',
  'Bayer Leverkusen': 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg',
  'Roma': 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg',
  'Sevilla': 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
  'Sporting CP': 'https://upload.wikimedia.org/wikipedia/en/e/e1/Sporting_Clube_de_Portugal_%28Logo%29.svg',
  'Newcastle': 'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg',
  'Aston Villa': 'https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg',
  'West Ham': 'https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg',
  'Marseille': 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_de_Marseille_logo.svg',
  'Lyon': 'https://upload.wikimedia.org/wikipedia/en/a/a5/Olympique_Lyonnais_%28logo%29.svg',
  'Celtic': 'https://upload.wikimedia.org/wikipedia/en/3/35/Celtic_FC.svg',
  'Galatasaray': 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Galatasaray_Sports_Club_Logo.svg',
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

  // Get the visual (logo or flag)
  const logoUrl = settled && target
    ? target.isNation
      ? getFlagUrl(target.name)
      : clubLogos[target.name] || ''
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
