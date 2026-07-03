import { Button } from '@/components/ui/button';
import { GameMode, Difficulty } from '@/types/guessNflTeam';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  onStart: (mode: GameMode, difficulty: Difficulty, conference?: 'AFC' | 'NFC', division?: string) => void;
}

const DIVISIONS = ['North', 'South', 'East', 'West'];

/** Sentinel for "no division filter, just the whole conference" so a single selectedDivision value can drive the Start button's enabled state and label. */
const ALL_DIVISIONS = 'All';

export function NflTeamModeSelector({ onStart }: Props) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [showConferenceOptions, setShowConferenceOptions] = useState(false);
  const [selectedConference, setSelectedConference] = useState<'AFC' | 'NFC' | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);

  // Selecting a conference or division only highlights it; the round begins
  // only when Start is pressed. This replaces the old behavior where picking
  // a conference immediately advanced the screen with no way to confirm or
  // change the pick first (MASTER_PLAN #80: "click highlights but does not
  // auto-start").
  const handleConferenceSelect = (conf: 'AFC' | 'NFC') => {
    setSelectedConference(conf);
    setSelectedDivision(null);
  };

  const handleDivisionSelect = (division: string) => {
    setSelectedDivision(division);
  };

  const handleStartConferenceMode = () => {
    if (!selectedConference) return;
    const division = selectedDivision && selectedDivision !== ALL_DIVISIONS ? selectedDivision : undefined;
    onStart('conference', difficulty, selectedConference, division);
  };

  const handleBackToConference = () => {
    setSelectedConference(null);
    setSelectedDivision(null);
  };

  if (showConferenceOptions) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <h3 className="text-xl font-bold text-center text-primary">Select Conference</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleConferenceSelect('AFC')}
            className={cn('h-20 text-lg', selectedConference === 'AFC' && 'ring-2 ring-primary')}
            variant={selectedConference === 'AFC' ? 'default' : 'outline'}
            aria-pressed={selectedConference === 'AFC'}
          >
            AFC
          </Button>
          <Button
            onClick={() => handleConferenceSelect('NFC')}
            className={cn('h-20 text-lg', selectedConference === 'NFC' && 'ring-2 ring-primary')}
            variant={selectedConference === 'NFC' ? 'default' : 'outline'}
            aria-pressed={selectedConference === 'NFC'}
          >
            NFC
          </Button>
        </div>

        {selectedConference && (
          <div className="space-y-3 animate-fade-in">
            <h4 className="text-sm font-semibold text-muted-foreground text-center uppercase tracking-wide">
              {selectedConference} Division (optional)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {DIVISIONS.map(div => (
                <Button
                  key={div}
                  onClick={() => handleDivisionSelect(div)}
                  variant={selectedDivision === div ? 'default' : 'outline'}
                  className={cn('h-16', selectedDivision === div && 'ring-2 ring-primary')}
                  aria-pressed={selectedDivision === div}
                >
                  {selectedConference} {div}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => handleDivisionSelect(ALL_DIVISIONS)}
              variant={selectedDivision === ALL_DIVISIONS ? 'default' : 'outline'}
              className={cn('w-full', selectedDivision === ALL_DIVISIONS && 'ring-2 ring-primary')}
              aria-pressed={selectedDivision === ALL_DIVISIONS}
            >
              All {selectedConference} Teams
            </Button>
          </div>
        )}

        <Button
          onClick={handleStartConferenceMode}
          disabled={!selectedConference || !selectedDivision}
          className="w-full h-14 text-lg"
        >
          Start
        </Button>

        <Button
          variant="ghost"
          onClick={selectedConference ? handleBackToConference : () => setShowConferenceOptions(false)}
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
