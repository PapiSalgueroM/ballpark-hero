import { Button } from '@/components/ui/button';
import { GameMode, Difficulty } from '@/types/guessNflTeam';
import { useState } from 'react';

interface Props {
  onStart: (mode: GameMode, difficulty: Difficulty, conference?: 'AFC' | 'NFC', division?: string) => void;
}

const DIVISIONS = ['North', 'South', 'East', 'West'];

export function NflTeamModeSelector({ onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showConferenceOptions, setShowConferenceOptions] = useState(false);
  const [selectedConference, setSelectedConference] = useState<'AFC' | 'NFC' | null>(null);

  const handleConferenceSelect = (conf: 'AFC' | 'NFC') => {
    setSelectedConference(conf);
  };

  const handleDivisionSelect = (division: string) => {
    onStart('conference', difficulty, selectedConference!, division);
  };

  const handleConferenceOnly = () => {
    onStart('conference', difficulty, selectedConference!);
  };

  if (showConferenceOptions && !selectedConference) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <h3 className="text-xl font-bold text-center text-primary">Select Conference</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleConferenceSelect('AFC')}
            className="h-20 text-lg"
            variant="outline"
          >
            AFC
          </Button>
          <Button
            onClick={() => handleConferenceSelect('NFC')}
            className="h-20 text-lg"
            variant="outline"
          >
            NFC
          </Button>
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowConferenceOptions(false)}
          className="w-full"
        >
          ← Back
        </Button>
      </div>
    );
  }

  if (showConferenceOptions && selectedConference) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <h3 className="text-xl font-bold text-center text-primary">{selectedConference} Division</h3>
        <div className="grid grid-cols-2 gap-3">
          {DIVISIONS.map(div => (
            <Button
              key={div}
              onClick={() => handleDivisionSelect(div)}
              variant="outline"
              className="h-16"
            >
              {selectedConference} {div}
            </Button>
          ))}
        </div>
        <Button
          onClick={handleConferenceOnly}
          className="w-full"
        >
          All {selectedConference} Teams
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSelectedConference(null)}
          className="w-full"
        >
          ← Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-md mx-auto">
      {/* Difficulty Toggle */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground text-center uppercase tracking-wide">
          Difficulty
        </h3>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => setDifficulty('easy')}
            variant={difficulty === 'easy' ? 'default' : 'outline'}
            className="flex-1"
          >
            Easy
            <span className="ml-2 text-xs opacity-70">32 Teams</span>
          </Button>
          <Button
            onClick={() => setDifficulty('hard')}
            variant={difficulty === 'hard' ? 'default' : 'outline'}
            className="flex-1"
          >
            Hard
            <span className="ml-2 text-xs opacity-70">+ Relocated</span>
          </Button>
        </div>
      </div>

      {/* Game Modes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground text-center uppercase tracking-wide">
          Game Mode
        </h3>
        <div className="space-y-3">
          <Button
            onClick={() => onStart('daily', difficulty)}
            className="w-full h-16 text-lg"
          >
            🗓️ Daily Challenge
            <span className="ml-2 text-xs opacity-70">Same for everyone</span>
          </Button>
          <Button
            onClick={() => onStart('unlimited', difficulty)}
            variant="outline"
            className="w-full h-16 text-lg"
          >
            🔄 Unlimited
            <span className="ml-2 text-xs opacity-70">Random teams</span>
          </Button>
          <Button
            onClick={() => setShowConferenceOptions(true)}
            variant="outline"
            className="w-full h-16 text-lg"
          >
            🏆 Conference Mode
            <span className="ml-2 text-xs opacity-70">AFC/NFC or division</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
